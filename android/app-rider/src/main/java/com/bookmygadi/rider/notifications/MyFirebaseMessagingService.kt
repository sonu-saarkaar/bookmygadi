package com.bookmygadi.rider.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.core.network.FcmTokenRequest
import com.bookmygadi.rider.MainActivity
import com.bookmygadi.rider.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MyFirebaseMessagingService : FirebaseMessagingService() {
    @Inject lateinit var api: BookMyGadiApi
    @Inject lateinit var authRepository: AuthRepository

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        serviceScope.launch {
            val authToken = authRepository.getToken() ?: return@launch
            runCatching { api.updateFcmToken(authToken, FcmTokenRequest(token)) }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        RiderFcmRegistrar.syncCurrentToken(authRepository, api, serviceScope)
        val data = remoteMessage.data
        if (data.isEmpty()) return

        when (data["type"] ?: data["event"]) {
            "NEW_RIDE", "NEW_RIDE_REQUEST", "RIDE_REQUEST" -> showFullScreenRideAlert(data)
            "RIDE_CANCELLED" -> showStatusNotification("Ride Cancelled", data["body"] ?: "The customer cancelled the ride.")
            "RIDE_ACCEPTED", "DRIVER_ARRIVING", "RIDE_STARTED", "RIDE_COMPLETED" ->
                showStatusNotification(data["title"] ?: "Ride Update", data["body"] ?: "Ride status updated.")
        }
    }

    private fun showFullScreenRideAlert(data: Map<String, String>) {
        val rideId = data["ride_id"] ?: return
        val pickup = data["pickup"] ?: "Pickup unavailable"
        val drop = data["drop"] ?: data["destination"] ?: "Drop unavailable"
        val price = data["price"] ?: data["fare"] ?: "Negotiable"
        val notificationId = rideId.hashCode()

        val fullScreenIntent = Intent(this, IncomingRideActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(RiderNotificationConstants.EXTRA_RIDE_ID, rideId)
            putExtra(RiderNotificationConstants.EXTRA_PICKUP, pickup)
            putExtra(RiderNotificationConstants.EXTRA_DROP, drop)
            putExtra(RiderNotificationConstants.EXTRA_PRICE, price)
            putExtra(RiderNotificationConstants.EXTRA_NOTIFICATION_ID, notificationId)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val acceptIntent = PendingIntent.getService(
            this,
            notificationId + 1,
            Intent(this, RideNotificationActionService::class.java).apply {
                action = RiderNotificationConstants.ACTION_ACCEPT_RIDE
                putExtra(RiderNotificationConstants.EXTRA_RIDE_ID, rideId)
                putExtra(RiderNotificationConstants.EXTRA_NOTIFICATION_ID, notificationId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val rejectIntent = PendingIntent.getService(
            this,
            notificationId + 2,
            Intent(this, RideNotificationActionService::class.java).apply {
                action = RiderNotificationConstants.ACTION_REJECT_RIDE
                putExtra(RiderNotificationConstants.EXTRA_RIDE_ID, rideId)
                putExtra(RiderNotificationConstants.EXTRA_NOTIFICATION_ID, notificationId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        ContextCompat.startForegroundService(
            this,
            Intent(this, RideAlertSoundService::class.java),
        )

        val notification = NotificationCompat.Builder(this, RiderNotificationConstants.CHANNEL_RIDE_ALERT)
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle("New Ride Request")
            .setContentText("$pickup -> $drop")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Pickup: $pickup\nDrop: $drop\nFare: $price"),
            )
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .addAction(0, "Reject", rejectIntent)
            .addAction(0, "Accept", acceptIntent)
            .build()

        notifySafely(notificationId, notification)
        startActivity(fullScreenIntent)
    }

    private fun showStatusNotification(title: String, message: String) {
        val openAppIntent = PendingIntent.getActivity(
            this,
            title.hashCode(),
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, RiderNotificationConstants.CHANNEL_RIDE_STATUS)
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(openAppIntent)
            .build()
        notifySafely(System.currentTimeMillis().toInt(), notification)
    }

    private fun notifySafely(notificationId: Int, notification: android.app.Notification) {
        if (
            android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        NotificationManagerCompat.from(this).notify(notificationId, notification)
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }
}
