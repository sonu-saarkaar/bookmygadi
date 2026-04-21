package com.bookmygadi.rider.notifications

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.bookmygadi.rider.MainActivity
import com.bookmygadi.rider.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: Send this token to your backend via API
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            when (data["type"]) {
                "NEW_RIDE_REQUEST", "RIDE_REQUEST" -> showFullScreenRideAlert(data)
                "DRIVER_ARRIVING" -> showStatusNotification("Driver Arriving", data["eta"] ?: "")
                "RIDE_STARTED" -> showPersistentRideNotification(data["ride_id"] ?: "")
                "RIDE_CANCELLED" -> showStatusNotification("Ride Cancelled", "The user cancelled the ride.")
            }
        }
    }

    private fun showFullScreenRideAlert(data: Map<String, String>) {
        val rideId = data["ride_id"] ?: "0"
        val pickup = data["pickup"] ?: "Unknown location"
        val notificationId = rideId.hashCode()

        val fullScreenIntent = Intent(this, IncomingRideActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("RIDE_ID", rideId)
            putExtra("PICKUP", pickup)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "RIDE_ALERT_CHANNEL")
            .setSmallIcon(R.drawable.app_icon) // Fallback to app_icon
            .setContentTitle("New Ride Request")
            .setContentText("Pickup at $pickup")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .build()

        try {
            val notificationManager = NotificationManagerCompat.from(this)
            notificationManager.notify(notificationId, notification)
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }

    private fun showStatusNotification(title: String, message: String) {
        val notification = NotificationCompat.Builder(this, "RIDE_STATUS_CHANNEL")
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }

    private fun showPersistentRideNotification(rideId: String) {
        val trackingIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            trackingIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "PERSISTENT_RIDE_CHANNEL")
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle("Ride in progress")
            .setContentText("Tap to open tracking map")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            NotificationManagerCompat.from(this).notify(1001, notification)
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }
}