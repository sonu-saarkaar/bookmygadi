package com.bookmygadi.core.network

import android.util.Log
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "BMGWebSocket"

// ---------------------------------------------------------------------------
// Event types broadcast over the ride WebSocket
// ---------------------------------------------------------------------------
object WsEventType {
    const val RIDE_STATUS_UPDATED  = "ride_status_updated"
    const val LOCATION_UPDATE      = "location_update"
    const val CHAT_MESSAGE         = "chat_message_created"
    const val DRIVER_LOCATION      = "driver_location"
    const val ERROR                = "ERROR"
    const val CONNECTED            = "CONNECTED"
    const val DISCONNECTED         = "DISCONNECTED"
}

/**
 * Per-ride WebSocket manager.
 *
 * Usage:
 *  1. Call [connect] with rideId + JWT token when the tracking screen opens.
 *  2. Collect [incomingEvents] in a coroutine to react to server pushes.
 *  3. Call [sendLocation] from the driver's foreground service to push GPS.
 *  4. Call [disconnect] (or use [disconnectAll]) when done.
 *
 * The socket auto-reconnects on failure with exponential back-off up to 32 s.
 */
@Singleton
class WebSocketManager @Inject constructor() {

    // A dedicated OkHttp client for WebSocket with longer timeouts
    private val wsClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .pingInterval(20, TimeUnit.SECONDS)   // keep-alive ping
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.SECONDS)      // no read timeout for persistent WS
            .build()
    }

    // One active socket per ride (supports multiple rides if needed)
    private val sockets = mutableMapOf<String, WebSocket>()

    // Published to all consumers (ViewModel, service, etc.)
    private val _incomingEvents = MutableSharedFlow<WebSocketEvent>(
        replay = 0,
        extraBufferCapacity = 32,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val incomingEvents: SharedFlow<WebSocketEvent> = _incomingEvents.asSharedFlow()

    /** True when at least one WebSocket is open */
    val isConnected: Boolean get() = sockets.isNotEmpty()

    // Reconnect back-off tracking
    private var reconnectDelayMs = 1_000L

    // ------------------------------------------------------------------
    // Connect
    // ------------------------------------------------------------------

    /**
     * Connect to the per-ride WebSocket.
     * Safe to call multiple times — no-ops if already connected for this ride.
     *
     * @param rideId  Ride UUID
     * @param token   JWT Bearer token
     * @param baseUrl e.g. "ws://192.168.31.126:8000"  (ws:// or wss://)
     */
    fun connect(rideId: String, token: String, baseUrl: String) {
        if (sockets.containsKey(rideId)) return   // already connected

        val url = "$baseUrl/ws/rides/$rideId"
        Log.d(TAG, "Connecting to $url")

        val request = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $token")
            .build()

        val socket = wsClient.newWebSocket(request, RideSocketListener(rideId, token, baseUrl))
        sockets[rideId] = socket
    }

    // ------------------------------------------------------------------
    // Send — driver location push
    // ------------------------------------------------------------------

    /**
     * Called by the driver's ForegroundLocationService every 2-3 s.
     * Sends a raw JSON frame to all connected sockets (normally just one ride).
     */
    fun sendLocation(rideId: String, lat: Double, lng: Double) {
        val socket = sockets[rideId] ?: return
        val json = JSONObject().apply {
            put("type", WsEventType.DRIVER_LOCATION)
            put("lat", lat)
            put("lng", lng)
        }
        socket.send(json.toString())
    }

    /**
     * Send any arbitrary JSON frame over the socket.
     */
    fun send(rideId: String, payload: JSONObject) {
        sockets[rideId]?.send(payload.toString())
    }

    // ------------------------------------------------------------------
    // Disconnect
    // ------------------------------------------------------------------

    fun disconnect(rideId: String) {
        sockets.remove(rideId)?.close(1000, "Ride ended")
        Log.d(TAG, "Disconnected ride $rideId")
    }

    fun disconnectAll() {
        sockets.keys.toList().forEach { disconnect(it) }
    }

    // ------------------------------------------------------------------
    // Listener
    // ------------------------------------------------------------------

    private inner class RideSocketListener(
        private val rideId: String,
        private val token: String,
        private val baseUrl: String,
    ) : WebSocketListener() {

        override fun onOpen(webSocket: WebSocket, response: Response) {
            Log.d(TAG, "[$rideId] Socket opened")
            reconnectDelayMs = 1_000L
            _incomingEvents.tryEmit(
                WebSocketEvent(WsEventType.CONNECTED, JSONObject().put("rideId", rideId))
            )
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            try {
                val json = JSONObject(text)
                val type = json.optString("event").ifEmpty {
                    json.optString("type", WsEventType.ERROR)
                }
                // Wrap the whole message as payload (backend sends flat objects)
                _incomingEvents.tryEmit(WebSocketEvent(type, json))
            } catch (e: Exception) {
                Log.w(TAG, "[$rideId] Malformed message: $text")
            }
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            webSocket.close(1000, null)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            Log.d(TAG, "[$rideId] Socket closed: $code $reason")
            sockets.remove(rideId)
            _incomingEvents.tryEmit(
                WebSocketEvent(WsEventType.DISCONNECTED, JSONObject().put("rideId", rideId))
            )
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            Log.e(TAG, "[$rideId] Socket failure: ${t.message}")
            sockets.remove(rideId)
            _incomingEvents.tryEmit(
                WebSocketEvent(WsEventType.ERROR, JSONObject().put("reason", t.message ?: "unknown"))
            )

            // Exponential back-off reconnect (max 32 s)
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                if (!sockets.containsKey(rideId)) {
                    Log.d(TAG, "[$rideId] Reconnecting after ${reconnectDelayMs}ms")
                    connect(rideId, token, baseUrl)
                }
            }, reconnectDelayMs)

            reconnectDelayMs = minOf(reconnectDelayMs * 2, 32_000L)
        }
    }
}

data class WebSocketEvent(val type: String, val payload: JSONObject)
