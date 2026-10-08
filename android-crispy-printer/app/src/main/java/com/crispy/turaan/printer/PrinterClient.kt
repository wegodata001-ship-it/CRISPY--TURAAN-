package com.crispy.turaan.printer

import java.net.InetSocketAddress
import java.net.Socket

class PrinterClient {
    private fun assertAllowed(host: String, port: Int) {
        if (host != SecureConfig.ALLOWED_IP || port != SecureConfig.ALLOWED_PORT || host == SecureConfig.BLOCKED_IP) {
            throw IllegalStateException("blocked printer destination")
        }
    }

    fun probe(host: String, port: Int, timeoutMs: Int = 4000): Boolean {
        assertAllowed(host, port)
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host, port), timeoutMs)
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    fun send(host: String, port: Int, data: ByteArray, timeoutMs: Int = 8000) {
        assertAllowed(host, port)
        Socket().use { socket ->
            socket.tcpNoDelay = true
            socket.soTimeout = timeoutMs
            socket.connect(InetSocketAddress(host, port), timeoutMs)
            val out = socket.getOutputStream()
            out.write(data)
            out.flush()
        }
    }
}
