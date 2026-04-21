package com.bookmygadi.rider

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.core.network.LocationUpdateRequest
import com.bookmygadi.core.network.WebSocketManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "BMGLocationSvc"
private const val NOTIF_CHANNEL_ID = "bmg_location_service"
private const val NOTIF_ID = 9001

/**
 * ForegroundLocationService — Driver's background GPS tracker.
 *
 * Start this service when a ride is accepted.
 * Stop it when the ride is completed or cancelled.
 *
 * How to start from Activity / ViewModel:
 * ```kotlin
 * val intent = Intent(context, ForegroundLocationService::class.java).apply {
 *     putExtra(ForegroundLocationService.EXTRA_RIDE_ID, rideId)
 *     putExtra(ForegroundLocationService.EXTRA_TOKEN, jwtToken)
 *     putExtra(ForegroundLocationService.EXTRA_BASE_URL, "ws://192.168.31.126:8000")
 * }
 * ContextCompat.startForegroundService(context, intent)
 * ```
 *
 * How to stop:
 * ```kotlin
 * context.stopService(Intent(context, ForegroundLocationService::class.java))
 * ```
 *
 * Required permissions (AndroidManifest.xml):
 *   ACCESS_FINE_LOCATION
 *   ACCESS_BACKGROUND_LOCATION   (API 29+)
 *   FOREGROUND_SERVICE
 *   FOREGROUND_SERVICE_LOCATION  (API 34+)
 */
@AndroidEntryPoint
class ForegroundLocationService : Service() {

    companion object {
        const val EXTRA_RIDE_ID  = "ride_id"
        const val EXTRA_TOKEN    = "token"
        const val EXTRA_BASE_URL = "base_url"

    }

    @Inject lateinit var webSocketManager: WebSocketManager
    @Inject lateinit var api: BookMyGadiApi

    private lateinit var fusedClient: FusedLocationProviderClient
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var rideId: String = ""
    private var token: String = ""
    private var baseUrl: String = ""

    // Whether we managed to open a WebSocket (true = real-time, false = REST fallback)
    private var useWebSocket = false

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val loc = result.lastLocation ?: return
            val lat = loc.latitude
            val lng = loc.longitude
            Log.d(TAG, "Location: $lat, $lng  ws=$useWebSocket")

            if (useWebSocket && webSocketManager.isConnected) {
                // Fast path — send over WebSocket (zero REST overhead)
                webSocketManager.sendLocation(rideId, lat, lng)
            } else {
                // Fallback — REST POST to /rider/active/{rideId}/driver-location
                serviceScope.launch {
                    try {
                        api.updateRiderLocation(
                            rideId = rideId,
                            token = "Bearer $token",
                            request = LocationUpdateRequest(lat, lng)
                        )
                    } catch (e: Exception) {
                        Log.w(TAG, "REST location push failed: ${e.message}")
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Service lifecycle
    // ------------------------------------------------------------------

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    @SuppressLint("MissingPermission")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        rideId  = intent?.getStringExtra(EXTRA_RIDE_ID)  ?: return START_NOT_STICKY
        token   = intent.getStringExtra(EXTRA_TOKEN)     ?: return START_NOT_STICKY
        baseUrl = intent.getStringExtra(EXTRA_BASE_URL)  ?: BuildConfig.WS_BASE_URL

        // Show persistent foreground notification immediately (required by Android)
        startForeground(NOTIF_ID, buildNotification())

        // Try WebSocket first
        try {
            webSocketManager.connect(rideId, token, baseUrl)
            useWebSocket = true
            Log.d(TAG, "WebSocket connected for ride $rideId")
        } catch (e: Exception) {
            Log.w(TAG, "WebSocket failed, falling back to REST: ${e.message}")
            useWebSocket = false
        }

        // Start high-accuracy GPS updates (every 2 s, min 1 s)
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            2_000L
        )
            .setMinUpdateIntervalMillis(1_000L)
            .setMaxUpdateDelayMillis(4_000L)
            .build()

        fusedClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        Log.d(TAG, "Location service started for ride $rideId")
        return START_STICKY  // Restart if killed by system
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedClient.removeLocationUpdates(locationCallback)
        webSocketManager.disconnect(rideId)
        serviceScope.cancel()
        Log.d(TAG, "Location service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ------------------------------------------------------------------
    // Notification
    // ------------------------------------------------------------------

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID,
                "Ride Tracking",
                NotificationManager.IMPORTANCE_LOW   // silent — no sound
            ).apply {
                description = "BookMyGaadi is tracking your location for the active ride"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, NOTIF_CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("BookMyGaadi — Ride Active")
            .setContentText("Tracking your location for the current ride...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)           // cannot be swiped away
            .setContentIntent(pendingIntent)
            .build()
    }
}
