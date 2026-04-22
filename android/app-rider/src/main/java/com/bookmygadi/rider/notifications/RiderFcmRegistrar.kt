package com.bookmygadi.rider.notifications

import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.core.network.FcmTokenRequest
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object RiderFcmRegistrar {
    fun syncCurrentToken(
        authRepository: AuthRepository,
        api: BookMyGadiApi,
        scope: CoroutineScope,
    ) {
        val authToken = authRepository.getToken() ?: return
        runCatching {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    if (token.isNullOrBlank()) return@addOnSuccessListener
                    scope.launch(Dispatchers.IO) {
                        runCatching {
                            api.updateFcmToken(authToken, FcmTokenRequest(token))
                        }
                    }
                }
        }
    }
}
