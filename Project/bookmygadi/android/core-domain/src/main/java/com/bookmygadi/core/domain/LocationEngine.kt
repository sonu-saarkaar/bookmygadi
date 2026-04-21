package com.bookmygadi.core.domain

import kotlinx.coroutines.flow.Flow

data class LocationCoordinate(
    val latitude: Double,
    val longitude: Double,
    val heading: Float? = null,
    val accuracy: Float? = null,
    val timestamp: Long = System.currentTimeMillis()
)

interface LocationEngine {
    // Raw location stream from the device
    val deviceLocation: Flow<LocationCoordinate>
    
    // Remote coordinate streams synced from backend
    fun observeDriverLocation(rideId: String): Flow<LocationCoordinate>
    fun observeCustomerLocation(rideId: String): Flow<LocationCoordinate>
    
    // Push the current device location to backend
    fun startPublishingLocation(rideId: String, isDriver: Boolean)
    fun stopPublishingLocation()
}
