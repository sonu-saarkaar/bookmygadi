package com.bookmygadi.rider

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookmygadi.core.domain.RideEngine
import com.bookmygadi.core.domain.RideState
import com.bookmygadi.core.domain.RideStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RiderActiveRideViewModel @Inject constructor(
    private val rideEngine: RideEngine
) : ViewModel() {

    val uiState: StateFlow<RideState> = rideEngine.rideState

    init {
        viewModelScope.launch {
            rideEngine.restoreSession()
        }
    }

    fun acceptIncomingRide(rideId: String) {
        viewModelScope.launch {
            rideEngine.acceptRide(rideId)
        }
    }

    fun markArrived() {
        viewModelScope.launch {
            rideEngine.arriveAtPickup()
        }
    }

    fun startTrip(otp: String) {
        viewModelScope.launch {
            rideEngine.startRide(otp)
        }
    }

    fun completeTrip() {
        viewModelScope.launch {
            rideEngine.completeRide()
        }
    }

    fun confirmPayment() {
        viewModelScope.launch {
            rideEngine.receivePayment()
        }
    }
    
    fun cancelTrip() {
        viewModelScope.launch {
            rideEngine.cancelRide("Driver offline / emergency")
        }
    }

    override fun onCleared() {
        super.onCleared()
        if (uiState.value.isTerminal) {
            rideEngine.stopSyncing()
        }
    }
}
