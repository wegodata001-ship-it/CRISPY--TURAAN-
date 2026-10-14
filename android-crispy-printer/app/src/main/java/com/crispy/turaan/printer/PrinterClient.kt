package com.crispy.turaan.printer

import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket

/** TCP connect failed before any ticket byte was written. Safe to retry. */
class PrinterConnectException(message: String) : IOException(message)

/** The socket dropped after at least one write started. Do not send the ticket again. */
class PrinterPartialException(message: String) : IOException(message)

class PrinterClient {
    private fun assertAllowed(host: String, port: Int) {
        if (host != SecureConfig.ALLOWED_IP || port != SecureConfig.ALLOWED_PORT || host == SecureConfig.BLOCKED_IP) {
            throw PrinterConnectException("blocked printer destination")
        }
    }

    fun probe(host: String, port: Int, timeoutMs: Int = 4000): Boolean {
        return try {
            assertAllowed(host, port)
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host, port), timeoutMs)
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * One session: write the whole ticket, flush, then keep the socket open briefly
     * so the printer can pull the buffer before FIN. A successful return means the
     * bytes were flushed, not that paper physically left the printer.
     */
    fun send(host: String, port: Int, data: ByteArray, timeoutMs: Int = 8000) {
        assertAllowed(host, port)
        val socket = Socket()
        var started = false
        try {
            socket.tcpNoDelay = true
            socket.soTimeout = timeoutMs
            socket.connect(InetSocketAddress(host, port), timeoutMs)
            val out = socket.getOutputStream()
            started = true
            out.write(data)
            out.flush()
            runCatching { socket.shutdownOutput() }
            Thread.sleep(DRAIN_MS)
        } catch (error: PrinterConnectException) {
            throw error
        } catch (error: Exception) {
            val detail = error.message ?: error.javaClass.simpleName
            if (started) throw PrinterPartialException("printer_partial: $detail")
            throw PrinterConnectException("printer_connect: $detail")
        } finally {
            runCatching { socket.close() }
        }
    }

    companion object {
        private const val DRAIN_MS = 800L
    }
}
