package com.bookmygadi.core.network

import com.bookmygadi.core.domain.RideState
import com.bookmygadi.core.domain.RideStatus
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

interface LocalRideCache {
    suspend fun saveRideState(state: RideState)
    suspend fun getSavedRideState(): RideState?
    suspend fun clearRideState()
    
    suspend fun enqueueFailedAction(action: String, payload: JSONObject)
    suspend fun getRetryQueue(): List<Pair<String, JSONObject>>
    suspend fun clearRetryQueue()
}

// In a real app, this would be a Room Database or DataStore implementation
@Singleton
class SharedPrefsRideCache @Inject constructor() : LocalRideCache {
    private var cachedState: RideState? = null
    
    override suspend fun saveRideState(state: RideState) {
        // Only cache critical states to avoid corruption
        if (!state.isTerminal && state.status != RideStatus.IDLE) {
            cachedState = state
        }
    }

    override suspend fun getSavedRideState(): RideState? {
        return cachedState
    }

    override suspend fun clearRideState() {
        cachedState = null
    }

    override suspend fun enqueueFailedAction(action: String, payload: JSONObject) {}
    override suspend fun getRetryQueue(): List<Pair<String, JSONObject>> = emptyList()
    override suspend fun clearRetryQueue() {}
}
