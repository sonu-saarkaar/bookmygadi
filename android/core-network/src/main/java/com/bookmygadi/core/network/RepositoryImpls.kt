package com.bookmygadi.core.network

import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.domain.Ride
import com.bookmygadi.core.domain.RideRepository
import com.bookmygadi.core.domain.User
import javax.inject.Inject
import javax.inject.Singleton
import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api: BookMyGadiApi,
    @ApplicationContext private val context: Context
) : AuthRepository {
    private val prefs: SharedPreferences = context.getSharedPreferences("bookmygadi_auth", Context.MODE_PRIVATE)

    override suspend fun login(email: String, pass: String): String {
        val res = api.login(mapOf("email" to email, "password" to pass))
        val token = "Bearer ${res.access_token}"
        prefs.edit().putString("auth_token", token).apply()
        return token
    }

    override suspend fun register(name: String, email: String, phone: String, pass: String): String {
        val res = api.register(mapOf(
            "name" to name,
            "email" to email,
            "phone" to phone,
            "password" to pass,
            "role" to "customer"
        ))
        val token = "Bearer ${res.access_token}"
        prefs.edit().putString("auth_token", token).apply()
        return token
    }

    override suspend fun fetchProfile(): User {
        val token = getToken() ?: throw Exception("Not logged in")
        val res = api.getProfile(token)
        return User(res.id, res.name, res.email, res.role)
    }

    override fun getToken(): String? {
        return prefs.getString("auth_token", null)
    }

    override fun logout() {
        prefs.edit().remove("auth_token").apply()
    }
}

@Singleton
class RideRepositoryImpl @Inject constructor(
    private val api: BookMyGadiApi,
    private val auth: AuthRepository
) : RideRepository {
    override suspend fun getActiveRides(): List<Ride> {
        val token = auth.getToken() ?: throw Exception("Not logged in")
        val dtos = api.getActiveRides(token)
        return dtos.map { 
            Ride(it.id, it.status, it.pickup_location, it.destination, it.agreed_fare ?: 0.0)
        }
    }

    override suspend fun updateStatus(rideId: String, status: String, otp: String?): Ride {
        val token = auth.getToken() ?: throw Exception("Not logged in")
        val params = UpdateStatusRequest(status, otp)
        val it = api.updateRideStatus(rideId, token, params)
        return Ride(it.id, it.status, it.pickup_location, it.destination, it.agreed_fare ?: 0.0)
    }
}
