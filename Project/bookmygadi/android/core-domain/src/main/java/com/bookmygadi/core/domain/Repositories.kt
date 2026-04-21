package com.bookmygadi.core.domain

interface AuthRepository {
    suspend fun login(email: String, pass: String): String
    suspend fun register(name: String, email: String, phone: String, pass: String): String
    suspend fun fetchProfile(): User
    fun getToken(): String?
    fun logout()
}

interface RideRepository {
    suspend fun getActiveRides(): List<Ride>
    suspend fun updateStatus(rideId: String, status: String, otp: String? = null): Ride
}
