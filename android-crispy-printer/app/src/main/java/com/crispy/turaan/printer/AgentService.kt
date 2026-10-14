package com.crispy.turaan.printer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
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
    private var updateJob: Job? = null
    private var lastHeartbeatAt = 0L
    private var lastHeartbeatOk = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        if (intent?.action == ACTION_TEST) testRequested.set(true)
        if (intent?.action == ACTION_RECONNECT) lastHeartbeatAt = 0L
        watchNetwork()
        if (intent?.action == ACTION_CHECK_UPDATE) {
            scope.launch {
                runCatching { AppUpdater.refresh(applicationContext, manual = true) }
            }
        }
        ensureUpdateChecks()
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
        updateJob?.cancel()
        networkCallback?.let { callback ->
            runCatching { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(callback) }
        }
        networkCallback = null
        AgentStatus.update { it.copy(serviceActive = false) }
        super.onDestroy()
    }

    private fun watchNetwork() {
        if (networkCallback != null) return
        val manager = getSystemService(ConnectivityManager::class.java) ?: return
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                lastHeartbeatAt = 0L
            }
        }
        runCatching { manager.registerDefaultNetworkCallback(callback) }
            .onSuccess { networkCallback = callback }
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
        val lan = LanNetwork.snapshot()
        val connected = printer.probe(ip, port, 2000)
        val printerNote = when {
            connected -> ""
            !lan.onRestaurantLan -> "الجهاز ليس على شبكة المطعم 192.168.1. اتصل بتلك الشبكة، ثم تعود الطباعة تلقائيًا."
            else -> "الطابعة 192.168.1.80:9100 غير متاحة على الشبكة الحالية."
        }
        AgentStatus.update {
            it.copy(
                ip = ip,
                port = port,
                tabletIp = lan.address ?: "—",
                printer = if (connected) "متصلة" else "غير متصلة",
                lastOrder = config.lastOrder(),
                lastPrint = config.lastPrint(),
                serviceActive = true,
                note = printerNote
            )
        }
        if (testRequested.getAndSet(false)) {
            printLocalTest(config, ip, port)
        }
        val token = runCatching { config.token() }.getOrElse {
            val note = "تعذر قراءة الرمز المحفوظ. أدخل Agent Token واضغط حفظ."
            AgentStatus.update { it.copy(server = "غير متصل", note = note) }
            history(note)
            return
        }
        if (token.isBlank()) {
            val note = "الرمز غير محفوظ. أدخل Agent Token واضغط حفظ. لن يُرسل Heartbeat قبل ذلك."
            AgentStatus.update { it.copy(server = "غير متصل", note = note) }
            history(note)
            return
        }
        val api = AgentApi(config.apiUrl(), token)
        val now = System.currentTimeMillis()
        if (now - lastHeartbeatAt >= HEARTBEAT_MS) {
            val beat = api.heartbeat(
                agentId = config.agentId(),
                versionName = BuildConfig.VERSION_NAME,
                versionCode = BuildConfig.VERSION_CODE,
                hostname = "${Build.MANUFACTURER} ${Build.MODEL}",
                printerConnected = connected,
                printerIp = ip,
                printerPort = port,
                tabletIp = lan.address,
                onRestaurantLan = lan.onRestaurantLan
            )
            lastHeartbeatOk = beat.ok
            lastHeartbeatAt = if (beat.ok || beat.code == 401) now else now - HEARTBEAT_MS + 5_000L
            val note = serverNote(beat, printerNote)
            AgentStatus.update {
                it.copy(server = if (beat.ok) "متصل" else "غير متصل", note = note)
            }
            if (!beat.ok) {
                history(note)
                return
            }
        }
        if (!lastHeartbeatOk || !connected) {
            history(skipReason(lastHeartbeatOk, connected, lan))
            return
        }
        val job = runCatching { api.claim(config.agentId()) }.getOrElse { error ->
            val note = claimNote(error, printerNote)
            AgentStatus.update { state -> state.copy(server = "غير متصل", note = note) }
            history(note)
            return
        }
        if (job == null) {
            history("الخادم متصل والطابعة متصلة. لا توجد مهام جديدة.")
            return
        }
        val label = job.receipt.orderNumber.ifBlank { job.orderId ?: job.type }
        config.rememberOrder(label)
        AgentStatus.update { it.copy(lastOrder = label, server = "متصل") }
        history("وصل من الخادم: $label (${job.type})")
        if (config.wasFlushed(job.id)) {
            reportFlushed(api, config, job.id, ip, port, "وصل $label مرة أخرى. أُرسل سابقًا ولن يُطبع مرة أخرى.")
            return
        }
        try {
            sendReceipt(ip, port, job.receipt)
        } catch (error: PrinterConnectException) {
            runCatching { api.markFailed(job.id, "printer_connect: ${error.message}") }
            val note = "وصل $label. الطابعة غير متصلة. بقيت المهمة في الطابور."
            AgentStatus.update { it.copy(printer = "غير متصلة", note = note) }
            history(note)
            return
        } catch (error: PrinterPartialException) {
            config.rememberFlushed(job.id)
            runCatching { api.markFailed(job.id, "printer_partial: ${error.message}") }
            val note = "وصل $label. انقطع الإرسال ولن يُعاد تلقائيًا."
            AgentStatus.update { it.copy(note = note) }
            history(note)
            return
        }
        config.rememberFlushed(job.id)
        reportFlushed(
            api,
            config,
            job.id,
            ip,
            port,
            "أُرسل $label إلى الطابعة 192.168.1.80. خروج الورق يحتاج تأكيدًا بصريًا."
        )
    }

    private fun history(message: String) {
        PrintHistory.record(this, message)
    }

    private fun skipReason(serverOk: Boolean, printerConnected: Boolean, lan: LanSnapshot): String {
        return when {
            !serverOk -> "لم يُسحب الطابور. الخادم غير متصل."
            !lan.onRestaurantLan ->
                "لم يُسحب أي طلب. الجهاز على ${lan.address ?: "شبكة أخرى"} وليس على شبكة المطعم 192.168.1."
            !printerConnected -> "لم يُسحب أي طلب. الطابعة 192.168.1.80:9100 غير متصلة من هذا الجهاز."
            else -> "لم يُسحب الطابور."
        }
    }

    private fun reportFlushed(
        api: AgentApi,
        config: SecureConfig,
        jobId: String,
        ip: String,
        port: Int,
        note: String
    ) {
        val reported = runCatching { api.markPrinted(jobId, ip, port, null) }
        val shown = if (reported.isFailure) {
            runCatching { api.markFailed(jobId, "printer_partial: status update failed after flush") }
            "$note الخادم لم يسجّل حالة الإرسال."
        } else {
            note
        }
        val stamp = stamp()
        config.rememberPrint(stamp)
        AgentStatus.update { it.copy(lastPrint = stamp, note = shown) }
        history(shown)
    }

    private fun serverNote(beat: AgentResult, printerNote: String): String {
        return when {
            beat.ok -> printerNote
            beat.code == 401 -> "الرمز غير صالح. أدخل الرمز الصحيح واضغط حفظ."
            beat.kind == "timeout" -> "انتهت مهلة الاتصال بالخادم. ستتم إعادة المحاولة تلقائيًا."
            beat.kind == "network" -> "انقطع الاتصال بالخادم. ستتم إعادة المحاولة عند عودة الشبكة."
            else -> "الخادم رفض الاتصال (${beat.code}). ستتم إعادة المحاولة تلقائيًا."
        }
    }

    private fun claimNote(error: Throwable, printerNote: String): String {
        val failure = error as? AgentFailure
        return when (failure?.kind) {
            "unauthorized" -> "الرمز غير صالح. أدخل الرمز الصحيح واضغط حفظ."
            "timeout" -> "انتهت مهلة سحب الطابور. ستتم إعادة المحاولة تلقائيًا."
            "network" -> "انقطع الاتصال أثناء سحب الطابور. ستتم إعادة المحاولة تلقائيًا."
            "printer_not_allowed" -> "الخادم رفض الطابعة. المسموح فقط 192.168.1.80:9100."
            "agent_not_allowed" -> "هذا الجهاز غير مخوّل بسحب أعمال الطباعة."
            else -> printerNote.ifBlank { "تعذر سحب عمل الطباعة. ستتم إعادة المحاولة تلقائيًا." }
        }
    }

    private fun printLocalTest(config: SecureConfig, ip: String, port: Int) {
        try {
            sendReceipt(ip, port, ReceiptRaster.localTestReceipt())
            val stamp = stamp()
            val note = "اختبار: أُرسل إلى الطابعة. تأكد من خروج الورق."
            config.rememberPrint(stamp)
            AgentStatus.update { it.copy(lastPrint = stamp, printer = "متصلة", note = note) }
            history(note)
        } catch (_: PrinterConnectException) {
            val note = "اختبار: تعذر الاتصال بالطابعة 192.168.1.80:9100"
            AgentStatus.update { it.copy(printer = "غير متصلة", note = note) }
            history(note)
        } catch (_: PrinterPartialException) {
            val note = "اختبار: انقطع الإرسال. لا تضغط الاختبار مرة أخرى قبل فحص الطابعة."
            AgentStatus.update { it.copy(note = note) }
            history(note)
        }
    }

    private fun sendReceipt(ip: String, port: Int, receipt: Receipt) {
        val payload = ByteArrayOutputStream()
        payload.write(ReceiptRaster.receiptBytes(receipt))
        payload.write(ReceiptRaster.cutBytes())
        printer.send(ip, port, payload.toByteArray())
    }

    private fun stamp(): String = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date())

    /** Update checks never share the print loop and never change printer/server status. */
    private fun ensureUpdateChecks() {
        if (updateJob?.isActive == true) return
        updateJob = scope.launch {
            delay(UPDATE_FIRST_DELAY_MS)
            while (running.get()) {
                runCatching { AppUpdater.refresh(applicationContext, manual = false) }
                delay(UPDATE_INTERVAL_MS)
            }
        }
    }

    companion object {
        const val ACTION_TEST = "com.crispy.turaan.printer.TEST"
        const val ACTION_RECONNECT = "com.crispy.turaan.printer.RECONNECT"
        const val ACTION_CHECK_UPDATE = "com.crispy.turaan.printer.CHECK_UPDATE"
        private const val CHANNEL = "crispy_printer"
        private const val NOTIFICATION_ID = 87
        private const val POLL_MS = 5_000L
        private const val HEARTBEAT_MS = 30_000L
        private const val UPDATE_FIRST_DELAY_MS = 30_000L
        private const val UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000L
    }
}
