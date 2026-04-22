package com.bookmygadi.rider.notifications

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.rider.MainActivity
import com.bookmygadi.rider.R
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import javax.inject.Inject

@AndroidEntryPoint
class RiderAvailabilityService : Service() {
    @Inject lateinit var api: BookMyGadiApi
    @Inject lateinit var authRepository: AuthRepository

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val handler = Handler(Looper.getMainLooper())
    private val refreshRunnable = object : Runnable {
        override fun run() {
            RiderFcmRegistrar.syncCurrentToken(authRepository, api, scope)
            handler.postDelayed(this, 15 * 60 * 1000L)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_SERVICE) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (authRepository.getToken().isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(
            RiderNotificationConstants.AVAILABILITY_SERVICE_NOTIFICATION_ID,
            buildNotification(),
        )
        handler.removeCallbacks(refreshRunnable)
        handler.post(refreshRunnable)
        return START_STICKY
    }

    private fun buildNotification(): Notification {
        val openAppIntent = PendingIntent.getActivity(
            this,
            91,
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, RiderNotificationConstants.CHANNEL_SYSTEM)
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle("BookMyGadi Rider online")
            .setContentText("Waiting for new ride requests in background")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(openAppIntent)
            .build()
    }

    override fun onDestroy() {
        handler.removeCallbacks(refreshRunnable)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_STOP_SERVICE = "com.bookmygadi.rider.ACTION_STOP_AVAILABILITY_SERVICE"
    }
}
