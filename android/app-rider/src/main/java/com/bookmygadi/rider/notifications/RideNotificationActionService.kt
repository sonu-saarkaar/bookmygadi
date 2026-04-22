package com.bookmygadi.rider.notifications

import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationManagerCompat
import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.core.network.RiderActionRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class RideNotificationActionService : Service() {
    @Inject lateinit var api: BookMyGadiApi
    @Inject lateinit var authRepository: AuthRepository

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY
        val rideId = intent.getStringExtra(RiderNotificationConstants.EXTRA_RIDE_ID).orEmpty()
        val notificationId = intent.getIntExtra(
            RiderNotificationConstants.EXTRA_NOTIFICATION_ID,
            RiderNotificationConstants.ALERT_NOTIFICATION_ID,
        )

        NotificationManagerCompat.from(this).cancel(notificationId)
        stopService(Intent(this, RideAlertSoundService::class.java).apply {
            this.action = RiderNotificationConstants.ACTION_STOP_ALARM
        })

        if (rideId.isBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }

        scope.launch {
            val token = authRepository.getToken()
            if (token != null) {
                runCatching {
                    when (action) {
                        RiderNotificationConstants.ACTION_ACCEPT_RIDE ->
                            api.acceptRiderRequest(
                                rideId = rideId,
                                token = token,
                                request = RiderActionRequest(),
                            )
                        RiderNotificationConstants.ACTION_REJECT_RIDE ->
                            api.rejectRiderRequest(
                                rideId = rideId,
                                token = token,
                            )
                    }
                }
            }

            val launchIntent = Intent(this@RideNotificationActionService, IncomingRideActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra(RiderNotificationConstants.EXTRA_RIDE_ID, rideId)
                putExtra(RiderNotificationConstants.EXTRA_NOTIFICATION_ID, notificationId)
                putExtra("action_result", action)
            }
            startActivity(launchIntent)
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
