package com.crispy.turaan.printer

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AgentApi(
    private val baseUrl: String,
    private val token: String
) {
    private val http = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    fun heartbeat(
        agentId: String,
        versionName: String,
        versionCode: Int,
        hostname: String,
        printerConnected: Boolean,
        printerIp: String,
        printerPort: Int
    ): Boolean {
        val body = JSONObject()
            .put("agentId", agentId)
            .put("hostname", hostname)
            .put("version", versionName)
            .put("appVersionName", versionName)
            .put("appVersionCode", versionCode)
            .put("platform", "ANDROID")
            .put("printerConnectionStatus", if (printerConnected) "connected" else "disconnected")
            .put("printerIp", printerIp)
            .put("printerPort", printerPort)
            .put("tcp9100", if (printerConnected) "PASS" else "FAIL")
        val response = post("/api/print-agent/heartbeat", body)
        return response.isSuccessful
    }

    fun claim(agentId: String): ClaimedJob? {
        val response = post("/api/print-agent/jobs/claim", JSONObject().put("agentId", agentId))
        if (!response.isSuccessful) {
            throw IllegalStateException("claim HTTP ${response.code}")
        }
        val json = JSONObject(response.body?.string().orEmpty())
        if (!json.optBoolean("ok", false)) return null
        val job = json.optJSONObject("job") ?: return null
        val receipt = json.optJSONObject("receipt") ?: return null
        return ClaimedJob(
            id = job.getString("id"),
            type = job.optString("type", "NEW_ORDER"),
            orderId = job.optString("orderId").ifBlank { null },
            receipt = parseReceipt(receipt)
        )
    }

    fun markPrinted(jobId: String, printerIp: String, printerPort: Int, cutterError: String?) {
        val body = JSONObject()
            .put("printerIp", printerIp)
            .put("printerPort", printerPort)
        if (!cutterError.isNullOrBlank()) body.put("cutterError", cutterError)
        val response = post("/api/print-agent/jobs/$jobId/printed", body)
        if (!response.isSuccessful) throw IllegalStateException("printed HTTP ${response.code}")
    }

    fun markFailed(jobId: String, error: String) {
        val response = post(
            "/api/print-agent/jobs/$jobId/failed",
            JSONObject().put("error", error.take(300))
        )
        if (!response.isSuccessful) throw IllegalStateException("failed HTTP ${response.code}")
    }

    private fun post(path: String, body: JSONObject) = http.newCall(
        Request.Builder()
            .url(baseUrl.trimEnd('/') + path)
            .header("Authorization", "Bearer $token")
            .header("Content-Type", "application/json")
            .post(body.toString().toRequestBody(jsonType))
            .build()
    ).execute()

    private fun parseReceipt(json: JSONObject): Receipt {
        val itemsJson = json.optJSONArray("items") ?: JSONArray()
        val items = buildList {
            for (i in 0 until itemsJson.length()) {
                val item = itemsJson.optJSONObject(i) ?: continue
                val modsJson = item.optJSONArray("modifiers") ?: JSONArray()
                val mods = buildList {
                    for (m in 0 until modsJson.length()) {
                        val mod = modsJson.optJSONObject(m) ?: continue
                        val label = mod.optString("label")
                        if (label.isNotBlank()) add(ReceiptModifier(label))
                    }
                }
                add(
                    ReceiptItem(
                        quantity = item.optInt("quantity", 1),
                        name = item.optString("name"),
                        lineTotal = item.optDoubleOrNull("lineTotal"),
                        unitPrice = item.optDoubleOrNull("unitPrice"),
                        modifiers = mods,
                        notes = item.optString("notes").ifBlank { null }
                    )
                )
            }
        }
        return Receipt(
            locale = json.optString("locale", "ar"),
            brand = json.optString("brand", "CRISPY"),
            headline = json.optString("headline"),
            orderNumber = json.optString("orderNumber"),
            date = json.optString("date"),
            time = json.optString("time"),
            customerName = json.optString("customerName"),
            customerPhone = json.optString("customerPhone").ifBlank { null },
            address = json.optString("address").ifBlank { null },
            fulfillmentLabel = json.optString("fulfillmentLabel").ifBlank { json.optString("pickupLabel") }.ifBlank { null },
            items = items,
            notes = json.optString("notes").ifBlank { null },
            subtotal = json.optDoubleOrNull("subtotal"),
            discount = json.optDoubleOrNull("discount"),
            deliveryFee = json.optDoubleOrNull("deliveryFee"),
            total = json.optDouble("total", 0.0),
            paymentLabel = json.optString("paymentLabel"),
            isTest = json.optBoolean("isTest", false),
            isReprint = json.optBoolean("isReprint", false)
        )
    }
}

private fun JSONObject.optDoubleOrNull(name: String): Double? {
    if (!has(name) || isNull(name)) return null
    return optDouble(name)
}
