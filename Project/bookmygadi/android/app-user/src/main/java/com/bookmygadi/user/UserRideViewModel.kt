package com.bookmygadi.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.domain.PolylineUtils
import com.bookmygadi.core.domain.RideEngine
import com.bookmygadi.core.domain.RideState
import com.bookmygadi.core.domain.RideStatus
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.core.network.NearbyRiderDto
import com.bookmygadi.core.network.WebSocketManager
import com.bookmygadi.core.network.WsEventType
import com.google.android.gms.maps.model.LatLng
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.abs
import kotlin.math.sqrt

// ---------------------------------------------------------------------------
// Haversine distance threshold: only re-fetch Directions if driver moved
// more than MIN_MOVE_METERS since last Directions call.
// ---------------------------------------------------------------------------
private const val MIN_MOVE_METERS = 25.0

private fun haversineMeters(a: LatLng, b: LatLng): Double {
    val R = 6_371_000.0
    val dLat = Math.toRadians(b.latitude - a.latitude)
    val dLon = Math.toRadians(b.longitude - a.longitude)
    val sinDLat = Math.sin(dLat / 2)
    val sinDLon = Math.sin(dLon / 2)
    val chord = sinDLat * sinDLat +
            Math.cos(Math.toRadians(a.latitude)) *
            Math.cos(Math.toRadians(b.latitude)) *
            sinDLon * sinDLon
    return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
}

@HiltViewModel
class UserRideViewModel @Inject constructor(
    private val rideEngine: RideEngine,
    private val api: BookMyGadiApi,
    private val auth: AuthRepository,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    // ------------------------------------------------------------------
    // Ride engine state (status, pickup, destination, fare, error)
    // ------------------------------------------------------------------
    val uiState: StateFlow<RideState> = rideEngine.rideState

    // ------------------------------------------------------------------
    // Nearby drivers (Home screen radar)
    // ------------------------------------------------------------------
    private val _nearbyDrivers = MutableStateFlow<List<NearbyRiderDto>>(emptyList())
    val nearbyDrivers: StateFlow<List<NearbyRiderDto>> = _nearbyDrivers.asStateFlow()

    // ------------------------------------------------------------------
    // Live tracking states  (Tracking/Booking-Confirmation screen)
    // ------------------------------------------------------------------

    /** Latest driver LatLng fetched from backend */
    private val _riderLocation = MutableStateFlow<LatLng?>(null)
    val riderLocation = _riderLocation.asStateFlow()

    /** Previous driver LatLng — used for smooth marker animation */
    private val _previousRiderLocation = MutableStateFlow<LatLng?>(null)
    val previousRiderLocation = _previousRiderLocation.asStateFlow()

    /** Decoded polyline points from Google Directions */
    private val _routePoints = MutableStateFlow<List<LatLng>>(emptyList())
    val routePoints = _routePoints.asStateFlow()

    /** ETA string from Directions API, e.g. "5 mins" */
    private val _etaText = MutableStateFlow<String?>(null)
    val etaText = _etaText.asStateFlow()

    /** Distance string from Directions API, e.g. "2.3 km" */
    private val _distanceText = MutableStateFlow<String?>(null)
    val distanceText = _distanceText.asStateFlow()

    /** True when a network error occurred during tracking */
    private val _trackingError = MutableStateFlow<String?>(null)
    val trackingError = _trackingError.asStateFlow()

    /** Expose GPS unavailability to UI */
    private val _locationUnavailable = MutableStateFlow(false)
    val locationUnavailable = _locationUnavailable.asStateFlow()

    // ------------------------------------------------------------------
    // Jobs
    // ------------------------------------------------------------------
    private var radarJob: Job? = null
    private var trackingJob: Job? = null
    private var wsListenerJob: Job? = null

    /** Last position used for a Directions API call — throttle guard */
    private var lastDirectionsCallPos: LatLng? = null

    // ------------------------------------------------------------------
    init {
        viewModelScope.launch { rideEngine.restoreSession() }
    }

    // ------------------------------------------------------------------
    // Nearby-driver radar (Home screen)
    // ------------------------------------------------------------------

    fun startRadarPolling(lat: Double, lng: Double, radiusKm: Double = 10.0) {
        radarJob?.cancel()
        radarJob = viewModelScope.launch {
            while (isActive) {
                try {
                    val token = auth.getToken()
                    if (token != null) {
                        val drivers = api.getNearbyRiders(lat, lng, radiusKm, token)
                        _nearbyDrivers.update { drivers }
                    }
                } catch (_: Exception) { /* ignore radar failures */ }
                delay(4000)
            }
        }
    }

    fun stopRadarPolling() {
        radarJob?.cancel()
        radarJob = null
    }

    // ------------------------------------------------------------------
    // Live Tracking (Tracking screen)
    // ------------------------------------------------------------------

    /**
     * Start the live-tracking loop.
     *
     * @param userLat        Passenger's current latitude
     * @param userLng        Passenger's current longitude
     * @param googleMapsKey  Google Maps/Directions API key
     *
     * The loop:
     *  1. Fetches driver location every 3 s
     *  2. Only calls Directions API when driver moved > MIN_MOVE_METERS
     *  3. Updates _riderLocation, _previousRiderLocation, _routePoints,
     *     _etaText, _distanceText
     */
    fun startLiveTracking(userLat: Double, userLng: Double, googleMapsKey: String) {
        if (wsListenerJob?.isActive == true) return  // already running
        _trackingError.value = null

        val rideId = uiState.value.currentRideId
        if (rideId.isNullOrEmpty()) return

        wsListenerJob = viewModelScope.launch {
            try {
                val token = auth.getToken() ?: return@launch

                // —— 1. Initial State Fetch (One-time REST hit) ——————————————
                try {
                    val tracking = api.getRiderTracking(rideId, token)
                    val driverLat = tracking.driver_live_lat ?: tracking.pickup_lat
                    val driverLng = tracking.driver_live_lng ?: tracking.pickup_lng

                    if (driverLat != null && driverLng != null) {
                        _riderLocation.value = LatLng(driverLat, driverLng)
                        fetchDirectionsIfNeeded(tracking.driver_live_lat, tracking.driver_live_lng, tracking.pickup_lat, tracking.pickup_lng, tracking.destination_lat, tracking.destination_lng, userLat, userLng, googleMapsKey)
                    }
                } catch (e: Exception) {
                    _trackingError.value = "Initial location fetch failed"
                    e.printStackTrace()
                }

                // —— 2. WebSocket listener for INSTANT updates ——————————————
                webSocketManager.connect(rideId, token, BuildConfig.WS_BASE_URL)

                webSocketManager.incomingEvents.collect { event ->
                    val type = event.type
                    if (type == WsEventType.LOCATION_UPDATE || type == "location_update" || type == WsEventType.DRIVER_LOCATION) {
                        val lat = event.payload.optDouble("lat", Double.NaN)
                        val lng = event.payload.optDouble("lng", Double.NaN)
                        if (!lat.isNaN() && !lng.isNaN()) {
                            val newPos = LatLng(lat, lng)
                            _previousRiderLocation.value = _riderLocation.value
                            _riderLocation.value = newPos
                            fetchDirectionsIfNeeded(lat, lng, null, null, null, null, userLat, userLng, googleMapsKey)
                        }
                    } else if (type == WsEventType.RIDE_STATUS_UPDATED || type == "ride_status_updated") {
                        refreshState()
                    }
                }
            } catch (e: Exception) {
                // Background coroutine failed
            }
        }
    }

    private suspend fun fetchDirectionsIfNeeded(
        driverLat: Double?, driverLng: Double?,
        pickupLat: Double?, pickupLng: Double?,
        destLat: Double?, destLng: Double?,
        userLat: Double, userLng: Double,
        googleMapsKey: String
    ) {
        if (driverLat == null || driverLng == null) return
        val newPos = LatLng(driverLat, driverLng)
        val lastPos = lastDirectionsCallPos
        val movedEnough = lastPos == null || haversineMeters(lastPos, newPos) >= MIN_MOVE_METERS

        if (!movedEnough || googleMapsKey.isEmpty()) return

        lastDirectionsCallPos = newPos
        val status = uiState.value.status

        try {
            val dest = if (status == RideStatus.IN_PROGRESS) {
                if (destLat != null && destLng != null) "$destLat,$destLng"
                else uiState.value.destinationLocation ?: "$userLat,$userLng"
            } else {
                val pLat = pickupLat ?: userLat
                val pLng = pickupLng ?: userLng
                "$pLat,$pLng"
            }

            val origin = "$driverLat,$driverLng"
            val directions = api.getDirections(origin, dest, googleMapsKey)

            directions.routes.firstOrNull()?.let { route ->
                val decoded = PolylineUtils.decodePoly(route.overview_polyline.points)
                _routePoints.value = decoded.map { LatLng(it.latitude, it.longitude) }
                route.legs.firstOrNull()?.let { leg ->
                    _etaText.value = leg.duration.text
                    _distanceText.value = leg.distance.text
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Ignore temporary directions API failures
        }
    }

    fun stopLiveTracking() {
        trackingJob?.cancel()
        wsListenerJob?.cancel()
        val rideId = uiState.value.currentRideId
        if (!rideId.isNullOrEmpty()) webSocketManager.disconnect(rideId)
        trackingJob = null
        wsListenerJob = null
        lastDirectionsCallPos = null
    }

    /** Notify ViewModel that the device GPS is unavailable */
    fun setLocationUnavailable(unavailable: Boolean) {
        _locationUnavailable.value = unavailable
    }

    // ------------------------------------------------------------------
    // Ride actions
    // ------------------------------------------------------------------

    fun requestRide(pickup: String, destination: String, vehicleType: String, fare: Double) {
        viewModelScope.launch {
            rideEngine.requestRide(pickup, destination, vehicleType, fare)
        }
    }

    fun cancelRide() {
        viewModelScope.launch { rideEngine.cancelRide("User requested cancellation") }
    }

    fun submitFeedback(rating: Int, comment: String) {
        viewModelScope.launch { rideEngine.submitFeedback(rating, comment) }
    }

    fun refreshState() { rideEngine.startSyncing() }

    // ------------------------------------------------------------------
    override fun onCleared() {
        super.onCleared()
        stopLiveTracking()
        stopRadarPolling()
        if (uiState.value.isTerminal || uiState.value.status == RideStatus.IDLE) {
            rideEngine.stopSyncing()
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private fun isTrackableStatus(status: RideStatus) = status in setOf(
        RideStatus.DRIVER_ASSIGNED,
        RideStatus.DRIVER_EN_ROUTE,
        RideStatus.ARRIVED,
        RideStatus.IN_PROGRESS
    )
}
