package com.crispy.turaan.printer

import java.net.Inet4Address
import java.net.NetworkInterface

data class LanSnapshot(
    val address: String?,
    val onRestaurantLan: Boolean
)

object LanNetwork {
    fun snapshot(): LanSnapshot {
        val addresses = mutableListOf<String>()
        runCatching {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return@runCatching
            while (interfaces.hasMoreElements()) {
                val network = interfaces.nextElement()
                if (!network.isUp || network.isLoopback) continue
                val addrs = network.inetAddresses
                while (addrs.hasMoreElements()) {
                    val address = addrs.nextElement()
                    if (address is Inet4Address && !address.isLoopbackAddress) {
                        addresses.add(address.hostAddress ?: continue)
                    }
                }
            }
        }
        val restaurant = addresses.firstOrNull { it.startsWith("192.168.1.") }
        return LanSnapshot(
            address = restaurant ?: addresses.firstOrNull(),
            onRestaurantLan = restaurant != null
        )
    }
}
