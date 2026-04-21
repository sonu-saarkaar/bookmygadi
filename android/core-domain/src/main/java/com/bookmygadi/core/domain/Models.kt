package com.bookmygadi.core.domain

data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String
)

data class Ride(
    val id: String,
    val status: String,
    val pickupLocation: String,
    val destination: String,
    val fare: Double
)
