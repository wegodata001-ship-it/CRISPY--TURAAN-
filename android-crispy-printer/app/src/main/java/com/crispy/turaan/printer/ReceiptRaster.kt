package com.crispy.turaan.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ReceiptRaster {
    const val WIDTH = 576
    private const val PAD = 20
    private const val STRIP = 256

    private data class Line(
        val text: String,
        val size: Float,
        val bold: Boolean,
        val center: Boolean,
        val rtl: Boolean,
        val rule: Boolean = false
    )

    fun localTestReceipt(now: Date = Date()): Receipt {
        val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(now)
        val parts = stamp.split(" ")
        return Receipt(
            locale = "ar",
            brand = "CRISPY",
            headline = "ANDROID PRINTER TEST",
            orderNumber = parts.getOrElse(1) { stamp },
            date = parts.getOrElse(0) { stamp },
            time = parts.getOrElse(1) { "" },
            customerName = "اختبار الطباعة",
            customerPhone = null,
            address = null,
            fulfillmentLabel = null,
            items = emptyList(),
            notes = "اختبار الطباعة",
            subtotal = null,
            discount = null,
            deliveryFee = null,
            total = 0.0,
            paymentLabel = "",
            isTest = true,
            isReprint = false
        )
    }

    fun receiptBytes(receipt: Receipt): ByteArray {
        val bitmap = draw(linesFor(receipt))
        val mono = toMono(bitmap)
        val out = ByteArrayOutputStream()
        out.write(byteArrayOf(0x1B, 0x40))
        out.write(byteArrayOf(0x1B, 0x61, 0x01))
        out.write(rasterStrips(bitmap.width, bitmap.height, mono))
        out.write(byteArrayOf(0x1B, 0x64, 0x05))
        bitmap.recycle()
        return out.toByteArray()
    }

    fun cutBytes(): ByteArray = byteArrayOf(0x1D, 0x56, 0x00)

    private fun linesFor(receipt: Receipt): List<Line> {
        val rtl = receipt.locale != "en"
        val lines = mutableListOf<Line>()
        fun text(value: String, size: Float, bold: Boolean = false, center: Boolean = false, forceLtr: Boolean = false) {
            if (value.isBlank()) return
            lines.add(Line(value, size, bold, center, rtl && !forceLtr))
        }
        fun rule() = lines.add(Line("", 8f, false, true, false, rule = true))

        if (receipt.isTest) text("اختبار الطباعة", 36f, bold = true, center = true)
        if (receipt.isReprint) text("إعادة طباعة", 32f, bold = true, center = true)
        rule()
        text(receipt.brand.ifBlank { "CRISPY" }, 64f, bold = true, center = true, forceLtr = true)
        text(receipt.headline, 40f, bold = true, center = true)
        text(receipt.orderNumber, 58f, bold = true, center = true, forceLtr = true)
        rule()
        text(receipt.date, 28f, center = true, forceLtr = true)
        text(receipt.time, 28f, center = true, forceLtr = true)
        if (!receipt.fulfillmentLabel.isNullOrBlank()) {
            text(receipt.fulfillmentLabel, 40f, bold = true, center = true)
        }
        text(receipt.customerName, 36f, bold = true)
        if (!receipt.customerPhone.isNullOrBlank()) text(receipt.customerPhone, 32f, forceLtr = true)
        if (!receipt.address.isNullOrBlank()) text(receipt.address, 32f, bold = true)
        if (receipt.items.isNotEmpty()) {
            rule()
            receipt.items.forEachIndexed { index, item ->
                text("${item.quantity} × ${item.name}", 42f, bold = true)
                item.modifiers.forEach { mod -> text(mod.label, 30f) }
                if (!item.notes.isNullOrBlank()) text("ملاحظة: ${item.notes}", 32f, bold = true)
                if (item.unitPrice != null) text(money(item.unitPrice), 28f, forceLtr = true)
                if (item.lineTotal != null) text(money(item.lineTotal), 36f, bold = true, forceLtr = true)
                if (index < receipt.items.lastIndex) rule()
            }
        }
        if (!receipt.notes.isNullOrBlank()) {
            rule()
            text(receipt.notes, 34f, bold = true)
        }
        if (!receipt.isTest || receipt.paymentLabel.isNotBlank() || receipt.total > 0) {
            rule()
            if (receipt.subtotal != null) text(money(receipt.subtotal), 28f, forceLtr = true)
            if (receipt.discount != null) text(money(receipt.discount), 28f, forceLtr = true)
            if (receipt.deliveryFee != null) text(money(receipt.deliveryFee), 28f, forceLtr = true)
            if (receipt.total > 0) text(money(receipt.total), 52f, bold = true, center = true, forceLtr = true)
            if (receipt.paymentLabel.isNotBlank()) text(receipt.paymentLabel, 36f, bold = true, center = true)
        }
        rule()
        if (receipt.orderNumber.isNotBlank()) {
            text(receipt.orderNumber, 52f, bold = true, center = true, forceLtr = true)
        }
        return lines
    }

    private fun money(amount: Double): String = String.format(Locale.US, "%.2f ₪", amount)

    private fun draw(lines: List<Line>): Bitmap {
        val contentWidth = WIDTH - PAD * 2
        val layouts = lines.map { line ->
            if (line.rule) return@map null
            val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.BLACK
                textSize = line.size
                typeface = if (line.bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
            }
            StaticLayout.Builder.obtain(line.text, 0, line.text.length, paint, contentWidth)
                .setAlignment(if (line.center) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL)
                .setTextDirection(if (line.rtl) TextDirectionHeuristics.RTL else TextDirectionHeuristics.LTR)
                .setIncludePad(false)
                .build()
        }
        var height = 24
        layouts.forEachIndexed { index, layout ->
            height += if (lines[index].rule) 18 else (layout?.height ?: 0) + 10
        }
        height += 24
        val bitmap = Bitmap.createBitmap(WIDTH, height.coerceAtLeast(64), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        var y = 24f
        layouts.forEachIndexed { index, layout ->
            if (lines[index].rule) {
                val paint = Paint().apply { color = Color.BLACK; strokeWidth = 4f }
                canvas.drawLine(PAD.toFloat(), y + 6f, (WIDTH - PAD).toFloat(), y + 6f, paint)
                y += 18f
            } else if (layout != null) {
                canvas.save()
                canvas.translate(PAD.toFloat(), y)
                layout.draw(canvas)
                canvas.restore()
                y += layout.height + 10
            }
        }
        return bitmap
    }

    private fun toMono(bitmap: Bitmap): ByteArray {
        val widthBytes = (bitmap.width + 7) / 8
        val out = ByteArray(widthBytes * bitmap.height)
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        for (y in 0 until bitmap.height) {
            for (x in 0 until bitmap.width) {
                val color = pixels[y * bitmap.width + x]
                val lum = 0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)
                if (Color.alpha(color) > 20 && lum < 180) {
                    out[y * widthBytes + (x shr 3)] =
                        (out[y * widthBytes + (x shr 3)].toInt() or (0x80 shr (x and 7))).toByte()
                }
            }
        }
        return out
    }

    private fun rasterStrips(widthPx: Int, heightPx: Int, mono: ByteArray): ByteArray {
        val widthBytes = (widthPx + 7) / 8
        val out = ByteArrayOutputStream()
        var y = 0
        while (y < heightPx) {
            val rows = minOf(STRIP, heightPx - y)
            val xL = widthBytes and 0xFF
            val xH = (widthBytes shr 8) and 0xFF
            val yL = rows and 0xFF
            val yH = (rows shr 8) and 0xFF
            out.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00, xL.toByte(), xH.toByte(), yL.toByte(), yH.toByte()))
            val start = y * widthBytes
            out.write(mono, start, rows * widthBytes)
            y += rows
        }
        return out.toByteArray()
    }
}
