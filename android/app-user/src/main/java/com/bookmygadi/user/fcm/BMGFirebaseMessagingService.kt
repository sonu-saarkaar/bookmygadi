package com.bookmygadi.user.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.bookmygadi.user.MainActivity

/**
 * BookMyGaadi FCM Messaging Service (User / Passenger App)
 *
 * Handles:
 *  - Push display when app is in background
 *  - Deep-link into tracking screen via ride notification tap
 *  - FCM token refresh (stub — wire to backend in TODO below)
 *
 * Register in AndroidManifest.xml inside <application>:
 * ```xml
 * <service
 *     android:name=".fcm.BMGFirebaseMessagingService"
 *     android:exported="false">
 *     <intent-filter>
 *         <action android:name="com.google.firebase.MESSAGING_EVENT" />
 *     </intent-filter>
 * </service>
 * ```
 *
 * FCM message data payload (sent from backend):
 * {
 *   "event":  "RIDE_ACCEPTED" | "DRIVER_ARRIVING" | "RIDE_STARTED" | "RIDE_COMPLETED" | "RIDE_CANCELLED",
 *   "screen": "tracking" | "feedback" | "home"
 * }
 */
class BMGFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val CHANNEL_ID   = "bmg_ride_updates"
        private const val CHANNEL_NAME = "Ride Updates"
    }

    // ------------------------------------------------------------------
    // Token refresh — send to backend so it can push to this device
    // ------------------------------------------------------------------
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: POST token to /api/v1/auth/fcm-token when backend endpoint is ready
        //   val prefs = getSharedPreferences("bmg_prefs", Context.MODE_PRIVATE)
        //   prefs.edit().putString("fcm_token", token).apply()
        //   lifecycleScope.launch { api.registerFcmToken(token, jwtToken) }
        android.util.Log.d("FCM", "New token: $token")
    }

    // ------------------------------------------------------------------
    // Message received
    // ------------------------------------------------------------------
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        // Data payload takes priority over notification payload
        val event   = message.data["event"]   ?: ""
        val screen  = message.data["screen"]  ?: "tracking"
        val rideId  = message.data["ride_id"] ?: ""

        val title = message.notification?.title ?: eventToTitle(event)
        val body  = message.notification?.body  ?: eventToBody(event)

        showNotification(
            title   = title,
            body    = body,
            rideId  = rideId,
            screen  = screen,
            eventId = event.hashCode() and 0x7FFFFFFF,   // positive int for notification ID
        )
    }

    // ------------------------------------------------------------------
    // Build + display notification
    // ------------------------------------------------------------------
    private fun showNotification(
        title: String,
        body: String,
        rideId: String,
        screen: String,
        eventId: Int,
    ) {
        ensureChannel()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("deeplink_screen", screen)
            putExtra("deeplink_rideId", rideId)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, eventId, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_map)  // replace with R.drawable.ic_notification
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 250, 100, 250))
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(eventId, notification)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Live ride status updates from BookMyGaadi"
                enableVibration(true)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    // ------------------------------------------------------------------
    // Friendly text helpers
    // ------------------------------------------------------------------
    private fun eventToTitle(event: String): String = when (event) {
        "RIDE_ACCEPTED"    -> "Driver Assigned! 🚗"
        "DRIVER_ARRIVING"  -> "Driver Arriving 📍"
        "RIDE_STARTED"     -> "Ride Started 🏎️"
        "RIDE_COMPLETED"   -> "Ride Completed ✅"
        "RIDE_CANCELLED"   -> "Ride Cancelled ❌"
        "NEW_RIDE_REQUEST" -> "New Ride Request 🔔"
        else               -> "BookMyGaadi Update"
    }

    private fun eventToBody(event: String): String = when (event) {
        "RIDE_ACCEPTED"    -> "A driver has accepted your ride. Track live on the map."
        "DRIVER_ARRIVING"  -> "Your driver is almost at the pickup point!"
        "RIDE_STARTED"     -> "Your ride has started. Sit back and relax."
        "RIDE_COMPLETED"   -> "You've reached your destination. Please pay your driver."
        "RIDE_CANCELLED"   -> "Your ride was cancelled. Book a new one."
        "NEW_RIDE_REQUEST" -> "Tap to view the new ride request."
        else               -> "Open BookMyGaadi for details."
    }
}
