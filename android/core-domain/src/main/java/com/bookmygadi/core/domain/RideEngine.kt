package com.bookmygadi.core.domain

import kotlinx.coroutines.flow.StateFlow

interface RideEngine {
    val rideState: StateFlow<RideState>
    
    // Commands for User
    suspend fun requestRide(pickup: String, destination: String, vehicleType: String, offerFare: Double)
    suspend fun cancelRide(reason: String)
    suspend fun submitFeedback(rating: Int, comment: String?)

    // Commands for Rider
    suspend fun acceptRide(rideId: String)
    suspend fun arriveAtPickup()
    suspend fun startRide(otp: String)
    suspend fun completeRide()
    suspend fun receivePayment()

    // Sync Management
    fun startSyncing()
    fun stopSyncing()
    suspend fun restoreSession()
}
