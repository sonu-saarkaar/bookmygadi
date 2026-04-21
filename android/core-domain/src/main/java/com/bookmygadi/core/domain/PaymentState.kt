package com.bookmygadi.core.domain

enum class PaymentStatus {
    PENDING,
    VERIFIED,
    SUCCESS,
    FAILED,
    PARTIAL
}

data class PaymentState(
    val rideId: String,
    val totalAmount: Double,
    val amountPaid: Double = 0.0,
    val status: PaymentStatus = PaymentStatus.PENDING,
    val method: String? = null,
    val transactionId: String? = null
)

interface PaymentEngine {
    // Both user and rider observe the true payment state via WebSocket/Polling
    suspend fun initializePayment(rideId: String, amount: Double)
    suspend fun verifyPayment(rideId: String, transactionId: String): PaymentState
    suspend fun markPaymentCash(rideId: String, amount: Double)
    suspend fun failPayment(rideId: String, reason: String)
}
