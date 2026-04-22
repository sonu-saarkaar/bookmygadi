package com.bookmygadi.core.network

import retrofit2.http.*

interface BookMyGadiApi {

    @POST("auth/login")
    suspend fun login(@Body body: Map<String, String>): LoginResponse

    @POST("auth/register")
    suspend fun register(@Body body: Map<String, String>): LoginResponse

    @GET("auth/me")
    suspend fun getProfile(@Header("Authorization") token: String): ProfileResponse

    @POST("auth/fcm-token")
    suspend fun updateFcmToken(
        @Header("Authorization") token: String,
        @Body request: FcmTokenRequest
    ): GenericMessageResponse

    @GET("rides/active")
    suspend fun getActiveRides(@Header("Authorization") token: String): List<RideDto>

    @PATCH("rides/{id}/status")
    suspend fun updateRideStatus(
        @Path("id") rideId: String,
        @Header("Authorization") token: String,
        @Body statusRequest: UpdateStatusRequest
    ): RideDto

    @GET("radar/nearby")
    suspend fun getNearbyRiders(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius_km") radiusKm: Double = 10.0,
        @Header("Authorization") token: String
    ): List<NearbyRiderDto>

    @POST("pricing/quote")
    suspend fun getPriceQuote(
        @Body request: PriceQuoteRequest,
        @Header("Authorization") token: String
    ): PriceQuoteResponse

    // Location Tracking APIs
    // POST /api/v1/rider/active/{rideId}/driver-location  — driver pushes GPS
    @POST("rider/active/{rideId}/driver-location")
    suspend fun updateRiderLocation(
        @Path("rideId") rideId: String,
        @Header("Authorization") token: String,
        @Body request: LocationUpdateRequest
    )

    @POST("rider/requests/{rideId}/accept")
    suspend fun acceptRiderRequest(
        @Path("rideId") rideId: String,
        @Header("Authorization") token: String,
        @Body request: RiderActionRequest
    ): RiderRequestDto

    @POST("rider/requests/{rideId}/reject")
    suspend fun rejectRiderRequest(
        @Path("rideId") rideId: String,
        @Header("Authorization") token: String
    ): RiderRequestDto

    // GET /api/v1/rider/active/{rideId}/tracking  — user fetches live coords
    @GET("rider/active/{rideId}/tracking")
    suspend fun getRiderTracking(
        @Path("rideId") rideId: String,
        @Header("Authorization") token: String
    ): RiderTrackingDto

    // Google Directions API
    @GET("https://maps.googleapis.com/maps/api/directions/json")
    suspend fun getDirections(
        @Query("origin") origin: String,
        @Query("destination") destination: String,
        @Query("key") apiKey: String,
        @Query("mode") mode: String = "driving"
    ): DirectionsResponse

    // Payment Integration (Razorpay)
    @POST("payment/create-order")
    suspend fun createPaymentOrder(
        @Header("Authorization") token: String,
        @Body request: CreateOrderRequest
    ): CreateOrderResponse

    @POST("payment/verify")
    suspend fun verifyPayment(
        @Header("Authorization") token: String,
        @Body request: VerifyPaymentRequest
    ): VerifyPaymentResponse

    @GET("payment/status/{ride_id}")
    suspend fun getPaymentStatus(
        @Header("Authorization") token: String,
        @Path("ride_id") rideId: String
    ): PaymentStatusResponse
}

data class CreateOrderRequest(val ride_id: String)
data class CreateOrderResponse(
    val order_id: String,
    val amount: Int,
    val currency: String,
    val ride_id: String,
    val razorpay_key: String
)

data class VerifyPaymentRequest(
    val ride_id: String,
    val razorpay_order_id: String,
    val razorpay_payment_id: String,
    val razorpay_signature: String
)
data class VerifyPaymentResponse(
    val success: Boolean,
    val message: String,
    val ride_id: String,
    val payment_status: String
)

data class PaymentStatusResponse(
    val ride_id: String,
    val payment_status: String,
    val agreed_fare: Double?,
    val ride_status: String
)

data class LoginResponse(val access_token: String)
data class FcmTokenRequest(val fcm_token: String)
data class GenericMessageResponse(val message: String)
data class ProfileResponse(val id: String, val email: String, val role: String, val name: String)
data class RideDto(
    val id: String,
    val status: String,
    val pickup_location: String,
    val destination: String,
    val agreed_fare: Double?
)
data class UpdateStatusRequest(val status: String, val otp: String? = null)

data class NearbyRiderDto(
    val id: String,
    val lat: Double,
    val lng: Double,
    val heading: Double?,
    val vehicle_type: String
)

data class PriceQuoteRequest(
    val pickup_lat: Double,
    val pickup_lng: Double,
    val destination_area: String,
    val pickup_area: String,
    val vehicle_type: String
)

data class PriceQuoteResponse(
    val suggested_fare: Double,
    val min_fare: Double,
    val max_fare: Double,
    val estimated_distance_km: Double
)

data class LocationUpdateRequest(
    val lat: Double,
    val lng: Double,
    val accuracy: Float? = null,
    val heading: Float? = null,
    val ts: String? = null,
)

data class RiderActionRequest(
    val agreed_fare: Int? = null
)

data class RiderRequestDto(
    val id: String,
    val status: String,
    val pickup_location: String,
    val destination: String,
)

/**
 * Mirrors backend /api/v1/rider/active/{rideId}/tracking response.
 * Fields may be null when not yet broadcast.
 */
data class RiderTrackingDto(
    val ride_id: String? = null,
    val status: String? = null,
    val pickup_location: String? = null,
    val destination: String? = null,
    val driver_live_lat: Double? = null,
    val driver_live_lng: Double? = null,
    val driver_live_accuracy: Double? = null,
    val driver_live_heading: Double? = null,
    val driver_live_updated_at: String? = null,
    val customer_live_lat: Double? = null,
    val customer_live_lng: Double? = null,
    val customer_live_accuracy: Double? = null,
    val customer_live_heading: Double? = null,
    val customer_live_updated_at: String? = null,
    val pickup_lat: Double? = null,
    val pickup_lng: Double? = null,
    val destination_lat: Double? = null,
    val destination_lng: Double? = null
)

// Directions API Responses
data class DirectionsResponse(
    val routes: List<Route>
) {
    data class Route(
        val overview_polyline: Polyline,
        val legs: List<Leg>
    )

    data class Polyline(
        val points: String
    )

    data class Leg(
        val distance: TextValue,
        val duration: TextValue
    )

    data class TextValue(
        val text: String,
        val value: Int
    )
}
