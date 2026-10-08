package com.crispy.turaan.printer

import java.util.concurrent.CopyOnWriteArrayList

data class Snapshot(
    val server: String = "غير متصل",
    val printer: String = "غير متصلة",
    val ip: String = SecureConfig.DEFAULT_IP,
    val port: Int = SecureConfig.DEFAULT_PORT,
    val lastOrder: String = "—",
    val lastPrint: String = "—",
    val serviceActive: Boolean = false,
    val note: String = ""
)

object AgentStatus {
    @Volatile
    var current: Snapshot = Snapshot()
        private set

    private val listeners = CopyOnWriteArrayList<(Snapshot) -> Unit>()

    fun update(block: (Snapshot) -> Snapshot) {
        val next = block(current)
        current = next
        listeners.forEach { listener ->
            runCatching { listener(next) }
        }
    }

    fun listen(listener: (Snapshot) -> Unit): () -> Unit {
        listeners.add(listener)
        listener(current)
        return { listeners.remove(listener) }
    }
}
