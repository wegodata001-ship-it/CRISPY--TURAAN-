package com.crispy.turaan.printer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

data class UpdateOffer(
    val versionCode: Int,
    val versionName: String,
    val required: Boolean,
    val apkUrl: String,
    val sha256: String,
    val releaseNotes: String
)

data class UpdateSnapshot(
    val checking: Boolean = false,
    val currentName: String = BuildConfig.VERSION_NAME,
    val currentCode: Int = BuildConfig.VERSION_CODE,
    val offer: UpdateOffer? = null,
    val message: String = "",
    val progress: Int? = null
)

object AppUpdater {
    const val UPDATE_ORIGIN = "https://almostafachicken.com"
    const val APK_PATH = "/downloads/crispy-printer/CRISPY-Printer.apk"

    @Volatile
    var current: UpdateSnapshot = UpdateSnapshot()
        private set

    private val listeners = CopyOnWriteArrayList<(UpdateSnapshot) -> Unit>()
    private val downloading = AtomicBoolean(false)
    private val http = OkHttpClient.Builder()
        .callTimeout(120, TimeUnit.SECONDS)
        .build()

    fun listen(listener: (UpdateSnapshot) -> Unit): () -> Unit {
        listeners.add(listener)
        listener(current)
        return { listeners.remove(listener) }
    }

    fun refresh(context: Context, manual: Boolean) {
        publish(current.copy(checking = true, message = if (manual) "جاري التحقق من التحديث..." else current.message, progress = null))
        try {
            val offer = fetchOffer()
            val installed = BuildConfig.VERSION_CODE
            val newer = offer != null && offer.versionCode > installed
            publish(
                current.copy(
                    checking = false,
                    currentName = BuildConfig.VERSION_NAME,
                    currentCode = installed,
                    offer = if (newer) offer else null,
                    message = when {
                        newer && offer?.required == true -> "هذا التحديث مطلوب. لن يُحذف التطبيق تلقائيًا. اضغط تحديث التطبيق ثم وافق على تثبيت أندرويد."
                        newer -> ""
                        manual -> "التطبيق محدّث"
                        else -> ""
                    },
                    progress = null
                )
            )
        } catch (_: Exception) {
            publish(
                current.copy(
                    checking = false,
                    offer = current.offer,
                    message = if (manual) "تعذر التحقق من التحديث. الطباعة مستمرة." else "",
                    progress = null
                )
            )
        }
    }

    fun download(context: Context): File {
        val offer = current.offer ?: error("no update")
        if (!isTrustedApkUrl(offer.apkUrl)) error("untrusted apk url")
        if (!downloading.compareAndSet(false, true)) error("download already running")
        try {
            publish(current.copy(message = "جاري تنزيل التحديث...", progress = 0))
            val dir = File(context.cacheDir, "updates").apply { mkdirs() }
            val dest = File(dir, "CRISPY-Printer.apk")
            if (dest.exists()) dest.delete()
            val request = Request.Builder().url(offer.apkUrl).get().build()
            http.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("download HTTP ${response.code}")
                val body = response.body ?: error("empty download")
                val total = body.contentLength()
                body.byteStream().use { input ->
                    FileOutputStream(dest).use { output ->
                        val buffer = ByteArray(8192)
                        var readTotal = 0L
                        while (true) {
                            val n = input.read(buffer)
                            if (n < 0) break
                            output.write(buffer, 0, n)
                            readTotal += n
                            if (total > 0) {
                                val percent = ((readTotal * 100) / total).toInt().coerceIn(0, 100)
                                publish(current.copy(message = "جاري تنزيل التحديث...", progress = percent))
                            }
                        }
                    }
                }
            }
            val actual = sha256(dest)
            if (!actual.equals(offer.sha256, ignoreCase = true)) {
                dest.delete()
                publish(current.copy(message = "فشل التحقق من ملف التحديث. لم يتم التثبيت.", progress = null))
                error("sha256 mismatch")
            }
            publish(current.copy(message = "اكتمل التنزيل. وافق على تثبيت أندرويد.", progress = null))
            return dest
        } catch (error: Exception) {
            publish(current.copy(message = "فشل تنزيل التحديث. الطباعة مستمرة.", progress = null))
            throw error
        } finally {
            downloading.set(false)
        }
    }

    fun installIntent(context: Context, apk: File): Intent {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
        return Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    fun needsUnknownSourcesPermission(context: Context): Boolean {
        return Build.VERSION.SDK_INT >= 26 && !context.packageManager.canRequestPackageInstalls()
    }

    fun unknownSourcesSettings(context: Context): Intent {
        return Intent(
            android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}")
        )
    }

    fun isTrustedApkUrl(raw: String): Boolean {
        return try {
            val parsed = Uri.parse(raw)
            parsed.scheme == "https" &&
                parsed.host.equals(Uri.parse(UPDATE_ORIGIN).host, ignoreCase = true) &&
                parsed.path == APK_PATH &&
                parsed.query.isNullOrEmpty()
        } catch (_: Exception) {
            false
        }
    }

    private fun fetchOffer(): UpdateOffer? {
        val request = Request.Builder()
            .url("$UPDATE_ORIGIN/api/android-app/latest")
            .get()
            .build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val json = JSONObject(response.body?.string().orEmpty())
            if (json.optBoolean("available", true).not() && !json.has("apkUrl")) return null
            val versionCode = json.optInt("versionCode", 0)
            val versionName = json.optString("versionName")
            val apkUrl = json.optString("apkUrl")
            val sha256 = json.optString("sha256")
            if (versionCode <= 0 || versionName.isBlank() || apkUrl.isBlank() || sha256.length != 64) return null
            if (!isTrustedApkUrl(apkUrl)) return null
            if (json.has("available") && !json.optBoolean("available", false)) return null
            return UpdateOffer(
                versionCode = versionCode,
                versionName = versionName,
                required = json.optBoolean("required", false),
                apkUrl = apkUrl,
                sha256 = sha256.lowercase(),
                releaseNotes = json.optString("releaseNotes")
            )
        }
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            while (true) {
                val n = input.read(buffer)
                if (n < 0) break
                digest.update(buffer, 0, n)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun publish(next: UpdateSnapshot) {
        current = next
        listeners.forEach { listener -> runCatching { listener(next) } }
    }
}
