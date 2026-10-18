package com.crispy.turaan.printer

data class ReceiptModifier(val label: String)

data class ReceiptItem(
    val quantity: Int,
    val name: String,
    val lineTotal: Double?,
    val unitPrice: Double?,
    val modifiers: List<ReceiptModifier>,
    val notes: String?
)

data class Receipt(
    val locale: String,
    val brand: String,
    val headline: String,
    val orderNumber: String,
    val date: String,
    val time: String,
    val customerName: String,
    val customerPhone: String?,
    val address: String?,
    val fulfillmentLabel: String?,
    val items: List<ReceiptItem>,
    val notes: String?,
    val subtotal: Double?,
    val discount: Double?,
    val couponLine: String?,
    val deliveryFee: Double?,
    val total: Double,
    val paymentLabel: String,
    val isTest: Boolean,
    val isReprint: Boolean
)

data class ClaimedJob(
    val id: String,
    val type: String,
    val orderId: String?,
    val receipt: Receipt
)
