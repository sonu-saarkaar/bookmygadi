package com.bookmygadi.rider

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookmygadi.core.domain.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class RiderAuthState {
    object Idle : RiderAuthState()
    object Loading : RiderAuthState()
    object Success : RiderAuthState()
    data class Error(val message: String) : RiderAuthState()
}

@HiltViewModel
class RiderAuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _authState = MutableStateFlow<RiderAuthState>(RiderAuthState.Idle)
    val authState: StateFlow<RiderAuthState> = _authState.asStateFlow()

    fun login(phone: String, otp: String) {
        viewModelScope.launch {
            _authState.value = RiderAuthState.Loading
            try {
                authRepository.login(phone, otp)
                _authState.value = RiderAuthState.Success
            } catch (e: Exception) {
                _authState.value = RiderAuthState.Error(e.message ?: "Login failed")
            }
        }
    }

    fun isLoggedIn(): Boolean {
        return authRepository.getToken() != null
    }

    fun logout() {
        authRepository.logout()
        _authState.value = RiderAuthState.Idle
    }
}
