package com.crispy.turaan.printer

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.crispy.turaan.printer.databinding.ActivityMainBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var stopListening: (() -> Unit)? = null
    private var stopUpdateListening: (() -> Unit)? = null
    private val uiScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var downloadedApk: File? = null

    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val config = SecureConfig(this)
        binding.inputIp.setText(SecureConfig.ALLOWED_IP)
        binding.inputIp.isEnabled = false
        binding.inputPort.setText(SecureConfig.ALLOWED_PORT.toString())
        binding.inputPort.isEnabled = false
        binding.inputApi.setText(config.apiUrl())
        if (config.token().isNotEmpty()) binding.inputToken.setText(TOKEN_MASK)

        binding.statusVersion.text = "الإصدار: ${BuildConfig.VERSION_NAME}"
        binding.buttonSave.setOnClickListener { saveSettings() }
        binding.buttonTest.setOnClickListener { startAgent(AgentService.ACTION_TEST) }
        binding.buttonReconnect.setOnClickListener { startAgent(null) }
        binding.buttonUpdate.setOnClickListener { startUpdate() }
        binding.buttonCheckUpdate.setOnClickListener { startAgent(AgentService.ACTION_CHECK_UPDATE) }
        binding.buttonAdmin.setOnClickListener {
            startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("https://portal.almostafachicken.com/"))
            )
        }

        config.markActivated()
        if (Build.VERSION.SDK_INT >= 33) {
            notifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        explainBattery()
        startAgent(null)
    }

    override fun onStart() {
        super.onStart()
        stopListening = AgentStatus.listen { snapshot ->
            runOnUiThread { render(snapshot) }
        }
        stopUpdateListening = AppUpdater.listen { snapshot ->
            runOnUiThread { renderUpdate(snapshot) }
        }
    }

    override fun onStop() {
        stopListening?.invoke()
        stopListening = null
        stopUpdateListening?.invoke()
        stopUpdateListening = null
        super.onStop()
    }

    override fun onDestroy() {
        uiScope.cancel()
        super.onDestroy()
    }

    private fun render(snapshot: Snapshot) {
        binding.statusServer.text = "الخادم: ${snapshot.server}"
        binding.statusPrinter.text = "الطابعة: ${snapshot.printer}"
        binding.statusIp.text = "عنوان الطابعة: ${snapshot.ip}"
        binding.statusPort.text = "المنفذ: ${snapshot.port}"
        binding.statusLastOrder.text = "آخر طلب: ${snapshot.lastOrder}"
        binding.statusLastPrint.text = "آخر طباعة: ${snapshot.lastPrint}"
        binding.statusService.text = if (snapshot.serviceActive) {
            "الطباعة في الخلفية: تعمل"
        } else {
            "الطباعة في الخلفية: متوقفة"
        }
        if (snapshot.note.isNotBlank()) binding.statusNote.text = snapshot.note
    }

    private fun renderUpdate(snapshot: UpdateSnapshot) {
        val offer = snapshot.offer
        val visible = offer != null || snapshot.message.isNotBlank() || snapshot.progress != null
        binding.updateCard.visibility = if (visible) View.VISIBLE else View.GONE
        if (offer != null) {
            binding.updateTitle.text = "يتوفر تحديث جديد"
            binding.updateCurrent.text = "الإصدار الحالي:\n${snapshot.currentName}"
            binding.updateNew.text = "الإصدار الجديد:\n${offer.versionName}"
            binding.buttonUpdate.isEnabled = !snapshot.checking && snapshot.progress == null
        } else {
            binding.updateTitle.text = "تحديث التطبيق"
            binding.updateCurrent.text = "الإصدار الحالي:\n${BuildConfig.VERSION_NAME}"
            binding.updateNew.text = ""
            binding.buttonUpdate.isEnabled = false
        }
        val progress = snapshot.progress
        binding.updateProgress.text = when {
            progress != null -> "جاري تنزيل التحديث... $progress%"
            snapshot.message.isNotBlank() -> snapshot.message
            offer?.required == true -> "هذا التحديث مطلوب. لن يُحذف التطبيق تلقائيًا."
            else -> ""
        }
    }

    private fun startUpdate() {
        if (AppUpdater.needsUnknownSourcesPermission(this)) {
            AlertDialog.Builder(this)
                .setTitle("CRISPY")
                .setMessage("لتثبيت التحديث، اسمح لتطبيق CRISPY بتثبيت التطبيقات من هذا المصدر، ثم ارجع واضغط تحديث التطبيق. لن يتم التثبيت بصمت.")
                .setPositiveButton("فتح الإعدادات") { _, _ ->
                    runCatching { startActivity(AppUpdater.unknownSourcesSettings(this)) }
                }
                .setNegativeButton("لاحقًا", null)
                .show()
            return
        }
        uiScope.launch {
            val apk = withContext(Dispatchers.IO) {
                runCatching { AppUpdater.download(applicationContext) }.getOrNull()
            } ?: return@launch
            downloadedApk = apk
            runCatching { startActivity(AppUpdater.installIntent(this@MainActivity, apk)) }
        }
    }

    private fun saveSettings() {
        val typedToken = binding.inputToken.text.toString()
        val token = if (typedToken == TOKEN_MASK) "" else typedToken
        SecureConfig(this).save(
            ip = SecureConfig.ALLOWED_IP,
            port = SecureConfig.ALLOWED_PORT,
            apiUrl = binding.inputApi.text.toString().ifBlank { SecureConfig.DEFAULT_API },
            token = token,
            activate = true
        )
        if (SecureConfig(this).token().isNotEmpty()) binding.inputToken.setText(TOKEN_MASK)
        startAgent(null)
    }

    private fun startAgent(action: String?) {
        val intent = Intent(this, AgentService::class.java)
        if (action != null) intent.action = action
        ContextCompat.startForegroundService(this, intent)
    }

    private fun explainBattery() {
        val power = getSystemService(PowerManager::class.java)
        if (power.isIgnoringBatteryOptimizations(packageName)) return
        AlertDialog.Builder(this)
            .setTitle("CRISPY")
            .setMessage("اسمح للتطبيق بالعمل بدون تقييد البطارية حتى تستمر طباعة الطلبات والشاشة مغلقة.")
            .setPositiveButton("متابعة") { _, _ ->
                runCatching {
                    startActivity(
                        Intent(
                            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                            Uri.parse("package:$packageName")
                        )
                    )
                }
            }
            .setNegativeButton("لاحقًا", null)
            .show()
    }

    companion object {
        private const val TOKEN_MASK = "********"
    }
}
