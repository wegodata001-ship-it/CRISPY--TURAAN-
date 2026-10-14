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
import android.text.TextUtils
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ReceiptRaster {
    const val WIDTH = 576
    private const val PAD = 20
    private const val STRIP = 256
    private const val QTY_SIZE = 52f
    private const val NAME_SIZE = 40f
    private const val HEADER_SIZE = 28f
    private const val EXTRA_SIZE = 28f
    private const val SHORT_RULE = 10
    private const val ITEM_RULE = 10

    private data class Line(
        val text: String,
        val size: Float,
        val bold: Boolean,
        val center: Boolean,
        val rtl: Boolean,
        val rule: Boolean = false,
        val items: List<ReceiptItem>? = null,
        val locale: String = "ar"
    )

    /** Pixel columns on a 576-dot, 80mm ticket. Quantity stays on the right. */
    private data class TableCols(
        val detailsLeft: Int,
        val detailsWidth: Int,
        val qtyLeft: Int,
        val qtyWidth: Int
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
            lines.add(
                Line(
                    text = "",
                    size = 0f,
                    bold = false,
                    center = false,
                    rtl = rtl,
                    items = receipt.items,
                    locale = receipt.locale
                )
            )
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

    private fun qtyHeader(locale: String): String = when (locale) {
        "he" -> "כמות"
        "en" -> "Qty"
        else -> "كمية"
    }

    private fun detailsHeader(locale: String): String = when (locale) {
        "he" -> "פרטים"
        "en" -> "Details"
        else -> "تفاصيل"
    }

    private fun notePrefix(locale: String): String = when (locale) {
        "he" -> "הערה"
        "en" -> "Note"
        else -> "ملاحظة"
    }

    private fun tableCols(items: List<ReceiptItem>, locale: String): TableCols {
        val contentLeft = PAD
        val contentRight = WIDTH - PAD
        val contentWidth = contentRight - contentLeft
        val gutter = 16
        val minDetails = 320
        val digitPaint = textPaint(QTY_SIZE, bold = true)
        val headerPaint = textPaint(HEADER_SIZE, bold = true)
        val widestQty = maxOf(
            items.maxOf { digitPaint.measureText(it.quantity.toString()) },
            headerPaint.measureText(qtyHeader(locale))
        )
        val qtyWidth = (widestQty + 20f).toInt().coerceIn(96, contentWidth - gutter - minDetails)
        val detailsWidth = contentWidth - gutter - qtyWidth
        val qtyLeft = contentRight - qtyWidth
        val detailsLeft = contentLeft
        check(detailsLeft + detailsWidth + gutter <= qtyLeft) { "receipt columns overlap" }
        check(qtyLeft + qtyWidth <= contentRight) { "quantity column exceeds paper" }
        return TableCols(detailsLeft, detailsWidth, qtyLeft, qtyWidth)
    }

    private fun fitWidth(paint: TextPaint, value: String, maxWidth: Float) {
        while (paint.measureText(value) > maxWidth && paint.textSize > 18f) {
            paint.textSize -= 1f
        }
    }

    private fun textPaint(size: Float, bold: Boolean): TextPaint {
        return TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = size
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }
    }

    private fun layoutText(
        value: String,
        size: Float,
        bold: Boolean,
        width: Int,
        rtl: Boolean,
        center: Boolean = false,
        maxLines: Int = Int.MAX_VALUE
    ): StaticLayout {
        val builder = StaticLayout.Builder.obtain(value, 0, value.length, textPaint(size, bold), width)
            .setAlignment(if (center) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL)
            .setTextDirection(if (rtl) TextDirectionHeuristics.RTL else TextDirectionHeuristics.LTR)
            .setIncludePad(false)
        if (maxLines < Int.MAX_VALUE) {
            builder.setMaxLines(maxLines).setEllipsize(TextUtils.TruncateAt.END)
        }
        return builder.build()
    }

    private fun itemDetails(item: ReceiptItem, locale: String): List<String> {
        val lines = mutableListOf<String>()
        item.modifiers.forEach { mod -> if (mod.label.isNotBlank()) lines.add(mod.label) }
        val note = item.notes?.trim().orEmpty()
        if (note.isNotEmpty()) lines.add("${notePrefix(locale)}: $note")
        return lines
    }

    private fun tableHeight(items: List<ReceiptItem>, locale: String, rtl: Boolean, cols: TableCols): Int {
        var height = headerBand(locale, rtl, cols)
        items.forEachIndexed { index, item ->
            height += rowHeight(item, locale, rtl, cols)
            if (index < items.lastIndex) height += ITEM_RULE
        }
        return height
    }

    private fun headerBand(locale: String, rtl: Boolean, cols: TableCols): Int {
        val details = layoutText(detailsHeader(locale), HEADER_SIZE, true, cols.detailsWidth, rtl, maxLines = 1)
        val qty = textPaint(HEADER_SIZE, bold = true).fontSpacing.toInt()
        return maxOf(qty, details.height) + 6 + SHORT_RULE
    }

    private fun rowHeight(item: ReceiptItem, locale: String, rtl: Boolean, cols: TableCols): Int {
        val name = layoutText(item.name, NAME_SIZE, true, cols.detailsWidth, rtl, maxLines = 2)
        val extras = itemDetails(item, locale).sumOf { extra ->
            4 + layoutText(extra, EXTRA_SIZE, false, cols.detailsWidth, rtl).height
        }
        val qtyHeight = textPaint(QTY_SIZE, bold = true).fontSpacing.toInt()
        return maxOf(name.height + extras, qtyHeight) + 8
    }

    private fun drawTable(canvas: Canvas, top: Float, items: List<ReceiptItem>, locale: String, rtl: Boolean): Float {
        val cols = tableCols(items, locale)
        var y = top
        val detailsHead = layoutText(detailsHeader(locale), HEADER_SIZE, true, cols.detailsWidth, rtl, maxLines = 1)
        val qtyHeadPaint = textPaint(HEADER_SIZE, bold = true)
        val qtyHead = qtyHeader(locale)
        fitWidth(qtyHeadPaint, qtyHead, cols.qtyWidth.toFloat())
        val qtyHeadWidth = qtyHeadPaint.measureText(qtyHead)
        drawLayout(canvas, detailsHead, cols.detailsLeft.toFloat(), y)
        canvas.drawText(
            qtyHead,
            cols.qtyLeft + (cols.qtyWidth - qtyHeadWidth) / 2f,
            y - qtyHeadPaint.ascent(),
            qtyHeadPaint
        )
        y += maxOf(qtyHeadPaint.fontSpacing.toInt(), detailsHead.height) + 6
        shortRule(canvas, y, widthPx = 260f, stroke = 2f)
        y += SHORT_RULE
        items.forEachIndexed { index, item ->
            val name = layoutText(item.name, NAME_SIZE, true, cols.detailsWidth, rtl, maxLines = 2)
            val extras = itemDetails(item, locale).map { extra ->
                layoutText(extra, EXTRA_SIZE, false, cols.detailsWidth, rtl)
            }
            val blockHeight = name.height + extras.sumOf { it.height + 4 }
            val qty = item.quantity.toString()
            val qtyPaint = textPaint(QTY_SIZE, bold = true)
            fitWidth(qtyPaint, qty, cols.qtyWidth.toFloat())
            val qtyWidth = qtyPaint.measureText(qty)
            val qtyHeight = qtyPaint.fontSpacing
            val rowHeight = maxOf(blockHeight, qtyHeight.toInt())
            val qtyX = cols.qtyLeft + (cols.qtyWidth - qtyWidth) / 2f
            val qtyY = y - qtyPaint.ascent()
            canvas.drawText(qty, qtyX, qtyY, qtyPaint)
            drawLayout(canvas, name, cols.detailsLeft.toFloat(), y)
            var extraY = y + name.height + 4
            extras.forEach { extra ->
                drawLayout(canvas, extra, cols.detailsLeft.toFloat(), extraY)
                extraY += extra.height + 4
            }
            y += rowHeight + 8
            if (index < items.lastIndex) {
                shortRule(canvas, y, widthPx = 220f, stroke = 1.5f)
                y += ITEM_RULE
            }
        }
        return y - top
    }

    private fun drawLayout(canvas: Canvas, layout: StaticLayout, x: Float, y: Float) {
        canvas.save()
        canvas.translate(x, y)
        layout.draw(canvas)
        canvas.restore()
    }

    private fun shortRule(canvas: Canvas, y: Float, widthPx: Float, stroke: Float) {
        val paint = Paint().apply {
            color = Color.BLACK
            strokeWidth = stroke
        }
        val right = (WIDTH - PAD).toFloat()
        canvas.drawLine(right - widthPx, y, right, y, paint)
    }

    private fun draw(lines: List<Line>): Bitmap {
        val contentWidth = WIDTH - PAD * 2
        val layouts = lines.map { line ->
            if (line.rule || line.items != null) return@map null
            layoutText(line.text, line.size, line.bold, contentWidth, line.rtl, center = line.center)
        }
        var height = 24
        lines.forEachIndexed { index, line ->
            height += when {
                line.items != null -> tableHeight(line.items, line.locale, line.rtl, tableCols(line.items, line.locale)) + 8
                line.rule -> 18
                else -> (layouts[index]?.height ?: 0) + 10
            }
        }
        height += 24
        val bitmap = Bitmap.createBitmap(WIDTH, height.coerceAtLeast(64), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        var y = 24f
        lines.forEachIndexed { index, line ->
            val items = line.items
            when {
                items != null -> {
                    y += drawTable(canvas, y, items, line.locale, line.rtl) + 8f
                }
                line.rule -> {
                    val paint = Paint().apply { color = Color.BLACK; strokeWidth = 3f }
                    canvas.drawLine(PAD.toFloat(), y + 6f, (WIDTH - PAD).toFloat(), y + 6f, paint)
                    y += 18f
                }
                layouts[index] != null -> {
                    drawLayout(canvas, layouts[index]!!, PAD.toFloat(), y)
                    y += layouts[index]!!.height + 10
                }
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
