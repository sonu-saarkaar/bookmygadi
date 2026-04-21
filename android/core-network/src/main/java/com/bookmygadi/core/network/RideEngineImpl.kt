package com.bookmygadi.core.network

import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.domain.RideEngine
import com.bookmygadi.core.domain.RideState
import com.bookmygadi.core.domain.RideStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RideEngineImpl @Inject constructor(
    private val api: BookMyGadiApi,
    private val auth: AuthRepository,
    private val webSocketManager: WebSocketManager,
    private val localCache: LocalRideCache
) : RideEngine {

    // Reads from local.properties → SERVER_IP + API_PORT. No more hardcoded IPs or emulator detection!
    private val wsBaseUrl: String get() = BuildConfig.WS_BASE_URL

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _rideState = MutableStateFlow(RideState())
    override val rideState: StateFlow<RideState> = _rideState.asStateFlow()

    private var syncJob: Job? = null
    private var webSocketJob: Job? = null

    init {
        // Automatically start listening to WebSockets
        webSocketJob = scope.launch {
            webSocketManager.incomingEvents.collect { event ->
                handleWebSocketEvent(event)
            }
        }
    }

    override suspend fun requestRide(pickup: String, destination: String, vehicleType: String, offerFare: Double) {
        if (_rideState.value.isActive || _rideState.value.status == RideStatus.SEARCHING_DRIVER) return
        
        _rideState.update { it.copy(status = RideStatus.SEARCHING_DRIVER, pickupLocation = pickup, destinationLocation = destination, fare = offerFare, error = null) }
        try {
            // Assume API negotiates with backend's radial matcher here
            val dummyId = "ride_${System.currentTimeMillis()}"
            _rideState.update { it.copy(currentRideId = dummyId) }
            localCache.saveRideState(_rideState.value)
            startSyncing()
        } catch (e: Exception) {
            _rideState.update { it.copy(status = RideStatus.FAILED, error = e.localizedMessage) }
        }
    }

    override suspend fun cancelRide(reason: String) {
        val currentId = _rideState.value.currentRideId ?: return
        try {
            _rideState.update { it.copy(status = RideStatus.CANCELLED) }
            val token = auth.getToken() ?: return
            api.updateRideStatus(currentId, token, UpdateStatusRequest("cancelled"))
            localCache.clearRideState()
            stopSyncing()
        } catch (e: Exception) {
            _rideState.update { it.copy(error = "Cancellation network failure") }
        }
    }

    override suspend fun submitFeedback(rating: Int, comment: String?) {
        _rideState.update { RideState() }
        localCache.clearRideState()
    }

    override suspend fun acceptRide(rideId: String) { updateStatusSafely(RideId = rideId, RideStatus.DRIVER_ASSIGNED, "accepted") }
    override suspend fun arriveAtPickup() { updateStatusSafely(null, RideStatus.ARRIVED, "arriving") }
    
    override suspend fun startRide(otp: String) {
        val currentId = _rideState.value.currentRideId ?: return
        try {
            val token = auth.getToken() ?: return
            api.updateRideStatus(currentId, token, UpdateStatusRequest("in_progress", otp))
            _rideState.update { it.copy(status = RideStatus.IN_PROGRESS, error = null) }
            localCache.saveRideState(_rideState.value)
        } catch (e: Exception) {
            _rideState.update { it.copy(error = "Invalid OTP or network issue") }
        }
    }

    override suspend fun completeRide() { updateStatusSafely(null, RideStatus.COMPLETED, "completed") }
    
    override suspend fun receivePayment() {
        stopSyncing()
        _rideState.update { RideState() }
        localCache.clearRideState()
    }

    private suspend fun updateStatusSafely(RideId: String?, targetDomainStatus: RideStatus, apiStatusString: String) {
        val currentId = RideId ?: _rideState.value.currentRideId ?: return
        try {
            val token = auth.getToken() ?: return
            val res = api.updateRideStatus(currentId, token, UpdateStatusRequest(apiStatusString))
            _rideState.update { 
                it.copy(
                    status = targetDomainStatus, 
                    currentRideId = res.id,
                    pickupLocation = res.pickup_location,
                    destinationLocation = res.destination,
                    error = null
                ) 
            }
            localCache.saveRideState(_rideState.value)
            startSyncing()
        } catch (e: Exception) {
            _rideState.update { it.copy(error = e.localizedMessage) }
        }
    }

    override fun startSyncing() {
        val token = auth.getToken() ?: return
        val rideId = _rideState.value.currentRideId ?: return
        if (!webSocketManager.isConnected) webSocketManager.connect(rideId, token, wsBaseUrl)

        if (syncJob?.isActive == true) return
        syncJob = scope.launch {
            while (true) {
                // Polling fallback when websocket drops
                if (!webSocketManager.isConnected && _rideState.value.currentRideId != null) {
                    try {
                        val rides = api.getActiveRides(token)
                        val match = rides.find { it.id == _rideState.value.currentRideId }
                        if (match != null) reconcileState(match)
                    } catch (e: Exception) {}
                }
                delay(4000)
            }
        }
    }

    override fun stopSyncing() {
        syncJob?.cancel()
        syncJob = null
        val rideId = _rideState.value.currentRideId
        if (rideId != null) {
            webSocketManager.disconnect(rideId)
        } else {
            webSocketManager.disconnectAll()
        }
    }

    override suspend fun restoreSession() {
        if (_rideState.value.isActive) return // Already have an active/ongoing state, don't overwrite it

        _rideState.update { it.copy(isRecovering = true) }
        try {
            // Check local cache first for instant UI response (Offline resilience)
            val cached = localCache.getSavedRideState()
            if (cached != null) _rideState.value = cached

            // Reconcile via HTTP with absolute truth from DB
            val token = auth.getToken() ?: return
            val active = api.getActiveRides(token).firstOrNull()
            
            if (active != null) {
                _rideState.update { it.copy(currentRideId = active.id) }
                reconcileState(active)
                startSyncing()
            } else {
                _rideState.update { RideState() }
                localCache.clearRideState()
            }
        } catch (e: Exception) {
             _rideState.update { it.copy(error = "Network offline - Operating on cache") }
        } finally {
             _rideState.update { it.copy(isRecovering = false) }
        }
    }

    private fun reconcileState(remote: RideDto) {
        val mappedStatus = when (remote.status) {
            "searching" -> RideStatus.SEARCHING_DRIVER
            "accepted" -> RideStatus.DRIVER_ASSIGNED
            "arriving" -> RideStatus.ARRIVED
            "in_progress" -> RideStatus.IN_PROGRESS
            "completed" -> RideStatus.COMPLETED
            "cancelled" -> RideStatus.CANCELLED
            else -> _rideState.value.status
        }
        
        if (mappedStatus.ordinal >= _rideState.value.status.ordinal || mappedStatus == RideStatus.CANCELLED) {
            _rideState.update {
                it.copy(
                    status = mappedStatus,
                    pickupLocation = remote.pickup_location,
                    destinationLocation = remote.destination,
                    fare = remote.agreed_fare
                )
            }
            scope.launch { localCache.saveRideState(_rideState.value) }
        }
    }

    private fun handleWebSocketEvent(event: WebSocketEvent) {
        if (!event.payload.has("rideId") || event.payload.getString("rideId") != _rideState.value.currentRideId) return
        
        when(event.type) {
            "RIDE_ACCEPTED" -> _rideState.update { it.copy(status = RideStatus.DRIVER_ASSIGNED) }
            "DRIVER_ARRIVED" -> _rideState.update { it.copy(status = RideStatus.ARRIVED) }
            "RIDE_STARTED" -> _rideState.update { it.copy(status = RideStatus.IN_PROGRESS) }
            "RIDE_COMPLETED" -> _rideState.update { it.copy(status = RideStatus.COMPLETED) }
            "RIDE_CANCELLED" -> {
                _rideState.update { it.copy(status = RideStatus.CANCELLED) }
                stopSyncing()
            }
        }
        scope.launch { localCache.saveRideState(_rideState.value) }
    }
}
