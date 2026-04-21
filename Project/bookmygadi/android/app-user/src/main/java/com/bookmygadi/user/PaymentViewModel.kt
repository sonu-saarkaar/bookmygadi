package com.bookmygadi.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.core.network.CreateOrderRequest
import com.bookmygadi.core.network.CreateOrderResponse
import com.bookmygadi.core.network.VerifyPaymentRequest
import com.bookmygadi.core.domain.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class PaymentState {
    object Idle : PaymentState()
    object Loading : PaymentState()
    data class OrderCreated(val order: CreateOrderResponse) : PaymentState()
    object Success : PaymentState()
    data class Error(val message: String) : PaymentState()
}

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val api: BookMyGadiApi,
    private val auth: AuthRepository
) : ViewModel() {

    private val _paymentState = MutableStateFlow<PaymentState>(PaymentState.Idle)
    val paymentState = _paymentState.asStateFlow()

    fun initiatePayment(rideId: String) {
        viewModelScope.launch {
            _paymentState.value = PaymentState.Loading
            try {
                val token = auth.getToken() ?: throw Exception("Not logged in")
                val response = api.createPaymentOrder("Bearer $token", CreateOrderRequest(rideId))
                _paymentState.value = PaymentState.OrderCreated(response)
            } catch (e: Exception) {
                _paymentState.value = PaymentState.Error(e.message ?: "Failed to create order")
            }
        }
    }

    fun verifyPayment(rideId: String, orderId: String, paymentId: String, signature: String) {
        viewModelScope.launch {
            _paymentState.value = PaymentState.Loading
            try {
                val token = auth.getToken() ?: throw Exception("Not logged in")
                val response = api.verifyPayment(
                    "Bearer $token",
                    VerifyPaymentRequest(rideId, orderId, paymentId, signature)
                )
                if (response.success) {
                    _paymentState.value = PaymentState.Success
                } else {
                    _paymentState.value = PaymentState.Error(response.message)
                }
            } catch (e: Exception) {
                _paymentState.value = PaymentState.Error(e.message ?: "Verification failed")
            }
        }
    }

    fun resetState() {
        _paymentState.value = PaymentState.Idle
    }
}
