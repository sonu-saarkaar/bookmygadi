package com.bookmygadi.core.domain

enum class RideStatus {
    IDLE,
    SEARCHING_DRIVER,
    DRIVER_ASSIGNED,
    DRIVER_EN_ROUTE,
    ARRIVED,
    OTP_PENDING,
    RIDE_STARTED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
    FAILED
}

data class RideState(
    val status: RideStatus = RideStatus.IDLE,
    val currentRideId: String? = null,
    val pickupLocation: String? = null,
    val destinationLocation: String? = null,
    val driverId: String? = null,
    val customerId: String? = null,
    val fare: Double? = null,
    val error: String? = null,
    val isRecovering: Boolean = false
) {
    // Utility states
    val isTerminal: Boolean 
        get() = status == RideStatus.COMPLETED || status == RideStatus.CANCELLED || status == RideStatus.FAILED
    
    val isActive: Boolean 
        get() = !isTerminal && status != RideStatus.IDLE
}
