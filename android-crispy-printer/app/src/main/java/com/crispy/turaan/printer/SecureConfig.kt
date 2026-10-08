package com.crispy.turaan.printer

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureConfig(context: Context) {
    private val app = context.applicationContext
    private val publicPrefs: SharedPreferences =
        app.getSharedPreferences("crispy_printer_public", Context.MODE_PRIVATE)

    private val secretPrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(app)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            app,
            "crispy_printer_secret",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun printerIp(): String = publicPrefs.getString(KEY_IP, DEFAULT_IP) ?: DEFAULT_IP

    fun printerPort(): Int = publicPrefs.getInt(KEY_PORT, DEFAULT_PORT)

    fun apiUrl(): String = publicPrefs.getString(KEY_API, DEFAULT_API) ?: DEFAULT_API

    fun agentId(): String = publicPrefs.getString(KEY_AGENT, DEFAULT_AGENT) ?: DEFAULT_AGENT

    fun token(): String = secretPrefs.getString(KEY_TOKEN, "")?.trim().orEmpty()

    fun isActivated(): Boolean = publicPrefs.getBoolean(KEY_ACTIVATED, false)

    fun lastOrder(): String = publicPrefs.getString(KEY_LAST_ORDER, "—") ?: "—"

    fun lastPrint(): String = publicPrefs.getString(KEY_LAST_PRINT, "—") ?: "—"

    fun save(
        ip: String,
        port: Int,
        apiUrl: String,
        token: String,
        activate: Boolean
    ) {
        publicPrefs.edit()
            .putString(KEY_IP, ip.trim())
            .putInt(KEY_PORT, port)
            .putString(KEY_API, apiUrl.trim().trimEnd('/'))
            .putString(KEY_AGENT, DEFAULT_AGENT)
            .putBoolean(KEY_ACTIVATED, activate || isActivated())
            .apply()
        if (token.isNotBlank()) {
            secretPrefs.edit().putString(KEY_TOKEN, token.trim()).apply()
        }
    }

    fun markActivated() {
        publicPrefs.edit().putBoolean(KEY_ACTIVATED, true).apply()
    }

    fun rememberOrder(label: String) {
        publicPrefs.edit().putString(KEY_LAST_ORDER, label).apply()
    }

    fun rememberPrint(label: String) {
        publicPrefs.edit().putString(KEY_LAST_PRINT, label).apply()
    }

    companion object {
        const val DEFAULT_IP = "192.168.1.87"
        const val DEFAULT_PORT = 9100
        const val DEFAULT_API = "https://almostafachicken.com"
        const val DEFAULT_AGENT = "crispy-android-tablet"
        private const val KEY_IP = "printer_ip"
        private const val KEY_PORT = "printer_port"
        private const val KEY_API = "api_url"
        private const val KEY_AGENT = "agent_id"
        private const val KEY_TOKEN = "agent_token"
        private const val KEY_ACTIVATED = "activated"
        private const val KEY_LAST_ORDER = "last_order"
        private const val KEY_LAST_PRINT = "last_print"
    }
}
