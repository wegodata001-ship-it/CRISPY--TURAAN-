package com.crispy.turaan.printer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class AgentService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val running = AtomicBoolean(false)
    private val testRequested = AtomicBoolean(false)
    private val printer = PrinterClient()
    private var loopJob: Job? = null
    private var lastHeartbeatAt = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        if (intent?.action == ACTION_TEST) testRequested.set(true)
        if (loopJob?.isActive != true) {
            running.set(true)
            loopJob = scope.launch {
                while (running.get()) {
                    runCatching { tick() }
                    delay(POLL_MS)
                }
            }
        }
        AgentStatus.update { it.copy(serviceActive = true) }
        return START_STICKY
    }

    override fun onDestroy() {
        running.set(false)
        loopJob?.cancel()
        AgentStatus.update { it.copy(serviceActive = false) }
        super.onDestroy()
    }

    private fun startInForeground() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL, getString(R.string.channel_name), NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.notification_text))
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun tick() {
        val config = SecureConfig(this)
        val ip = config.printerIp()
        val port = config.printerPort()
        val connected = printer.probe(ip, port)
        AgentStatus.update {
            it.copy(
                ip = ip,
                port = port,
                printer = if (connected) "متصلة" else "غير متصلة",
                lastOrder = config.lastOrder(),
                lastPrint = config.lastPrint(),
                serviceActive = true,
                note = if (connected) "" else "الطابعة غير متصلة"
            )
        }
        if (testRequested.getAndSet(false)) {
            printLocalTest(config, ip, port)
        }
        val token = config.token()
        if (token.isBlank()) {
            AgentStatus.update { it.copy(server = "غير متصل") }
            return
        }
        val api = AgentApi(config.apiUrl(), token)
        val now = System.currentTimeMillis()
        if (now - lastHeartbeatAt >= HEARTBEAT_MS) {
            val ok = runCatching {
                api.heartbeat(
                    agentId = config.agentId(),
                    version = VERSION,
                    hostname = "${Build.MANUFACTURER} ${Build.MODEL}",
                    printerConnected = connected,
                    printerIp = ip,
                    printerPort = port
                )
            }.getOrDefault(false)
            lastHeartbeatAt = now
            AgentStatus.update {
                it.copy(server = if (ok) "متصل" else "غير متصل", note = if (ok) it.note else "الخادم غير متصل")
            }
        }
        if (!connected) return
        val job = runCatching { api.claim(config.agentId()) }.getOrElse {
            AgentStatus.update { state -> state.copy(server = "غير متصل", note = "الخادم غير متصل") }
            return
        } ?: return
        val label = job.receipt.orderNumber.ifBlank { job.orderId ?: job.type }
        config.rememberOrder(label)
        AgentStatus.update { it.copy(lastOrder = label, server = "متصل") }
        try {
            val cutter = sendReceipt(ip, port, job.receipt)
            api.markPrinted(job.id, ip, port, cutter)
            val stamp = stamp()
            config.rememberPrint(stamp)
            AgentStatus.update { it.copy(lastPrint = stamp, note = "تم إرسال الإيصال. خروج الورق يحتاج تأكيدًا بصريًا.") }
        } catch (error: Exception) {
            runCatching { api.markFailed(job.id, error.message ?: "print failed") }
            AgentStatus.update { it.copy(note = "فشلت الطباعة") }
        }
    }

    private fun printLocalTest(config: SecureConfig, ip: String, port: Int) {
        try {
            val cutter = sendReceipt(ip, port, ReceiptRaster.localTestReceipt())
            val stamp = stamp()
            config.rememberPrint(stamp)
            val note = if (cutter == null) {
                "تم إرسال اختبار الطباعة. تأكد من خروج الورق."
            } else {
                "تم إرسال الاختبار. CUT_UNSUPPORTED"
            }
            AgentStatus.update { it.copy(lastPrint = stamp, note = note, printer = "متصلة") }
        } catch (_: Exception) {
            AgentStatus.update { it.copy(printer = "غير متصلة", note = "الطابعة غير متصلة") }
        }
    }

    private fun sendReceipt(ip: String, port: Int, receipt: Receipt): String? {
        printer.send(ip, port, ReceiptRaster.receiptBytes(receipt))
        return try {
            printer.send(ip, port, ReceiptRaster.cutBytes())
            null
        } catch (_: Exception) {
            "CUT_UNSUPPORTED"
        }
    }

    private fun stamp(): String = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date())

    companion object {
        const val ACTION_TEST = "com.crispy.turaan.printer.TEST"
        private const val CHANNEL = "crispy_printer"
        private const val NOTIFICATION_ID = 87
        private const val POLL_MS = 5_000L
        private const val HEARTBEAT_MS = 30_000L
        private const val VERSION = "1.2.0"
    }
}
