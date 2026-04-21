package com.bookmygadi.core.network

import com.bookmygadi.core.domain.PaymentEngine
import com.bookmygadi.core.domain.PaymentState
import com.bookmygadi.core.domain.PaymentStatus
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentEngineImpl @Inject constructor(
    private val api: BookMyGadiApi
) : PaymentEngine {

    override suspend fun initializePayment(rideId: String, amount: Double) {
        // API Call to generate payment intent
    }

    override suspend fun verifyPayment(rideId: String, transactionId: String): PaymentState {
        // Simulate backend verification to prevent duplicate payments
        delay(1500)
        return PaymentState(rideId, 100.0, 100.0, PaymentStatus.SUCCESS, "UPI", transactionId)
    }

    override suspend fun markPaymentCash(rideId: String, amount: Double) {
        // Tell backend cash was collected
    }

    override suspend fun failPayment(rideId: String, reason: String) {
        // Send failure metrics
    }
}
