package com.crispy.turaan.printer

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList

/** On-device log of what reached the tablet and what was sent to the printer. No tokens. */
object PrintHistory {
    private const val PREF = "crispy_printer_history"
    private const val KEY = "lines"
    private const val MAX = 40

    private val listeners = CopyOnWriteArrayList<(List<String>) -> Unit>()

    fun record(context: Context, message: String) {
        val clean = message.replace("\n", " ").trim()
        if (clean.isEmpty()) return
        val prefs = context.applicationContext.getSharedPreferences(PREF, Context.MODE_PRIVATE)
        val stamp = SimpleDateFormat("HH:mm", Locale.US).format(Date())
        val stored = prefs.getString(KEY, "").orEmpty().lineSequence().filter { it.isNotBlank() }.toMutableList()
        val previous = stored.firstOrNull()
        if (previous != null && previous.substringAfter("  ", "") == clean) {
            stored[0] = "$stamp  $clean"
        } else {
            stored.add(0, "$stamp  $clean")
        }
        val next = stored.take(MAX)
        prefs.edit().putString(KEY, next.joinToString("\n")).apply()
        val snapshot = next.toList()
        listeners.forEach { listener -> runCatching { listener(snapshot) } }
    }

    fun lines(context: Context): List<String> {
        val prefs = context.applicationContext.getSharedPreferences(PREF, Context.MODE_PRIVATE)
        return prefs.getString(KEY, "").orEmpty().lineSequence().filter { it.isNotBlank() }.toList()
    }

    fun clear(context: Context) {
        context.applicationContext.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit().remove(KEY).apply()
        listeners.forEach { listener -> runCatching { listener(emptyList()) } }
    }

    fun listen(context: Context, listener: (List<String>) -> Unit): () -> Unit {
        listeners.add(listener)
        listener(lines(context))
        return { listeners.remove(listener) }
    }
}
