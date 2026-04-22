package com.bookmygadi.rider.notifications

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.bookmygadi.rider.MainActivity
import com.bookmygadi.rider.R

class IncomingRideActivity : AppCompatActivity() {
    private val timeoutHandler = Handler(Looper.getMainLooper())
    private val timeoutRunnable = Runnable {
        stopAlert()
        finish()
    }

    private var rideId: String = ""
    private var notificationId: Int = RiderNotificationConstants.ALERT_NOTIFICATION_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        wakeScreen()
        setContentView(R.layout.activity_incoming_ride)

        rideId = intent.getStringExtra(RiderNotificationConstants.EXTRA_RIDE_ID).orEmpty()
        val pickup = intent.getStringExtra(RiderNotificationConstants.EXTRA_PICKUP).orEmpty()
        val drop = intent.getStringExtra(RiderNotificationConstants.EXTRA_DROP).orEmpty()
        val price = intent.getStringExtra(RiderNotificationConstants.EXTRA_PRICE).orEmpty()
        notificationId = intent.getIntExtra(
            RiderNotificationConstants.EXTRA_NOTIFICATION_ID,
            if (rideId.isBlank()) RiderNotificationConstants.ALERT_NOTIFICATION_ID else rideId.hashCode(),
        )

        NotificationManagerCompat.from(this).cancel(notificationId)

        findViewById<TextView>(R.id.pickupText).text = if (pickup.isBlank()) "Pickup unavailable" else pickup
        findViewById<TextView>(R.id.dropText).text = if (drop.isBlank()) "Drop: Not provided" else "Drop: $drop"
        findViewById<TextView>(R.id.priceText).text = if (price.isBlank()) "Fare: Negotiable" else "Fare: $price"

        findViewById<Button>(R.id.acceptButton).setOnClickListener {
            findViewById<TextView>(R.id.statusText).text = "Accepting ride..."
            triggerAction(RiderNotificationConstants.ACTION_ACCEPT_RIDE)
        }
        findViewById<Button>(R.id.rejectButton).setOnClickListener {
            findViewById<TextView>(R.id.statusText).text = "Rejecting ride..."
            triggerAction(RiderNotificationConstants.ACTION_REJECT_RIDE)
        }

        val resultAction = intent.getStringExtra("action_result")
        if (!resultAction.isNullOrBlank()) {
            val statusText = if (resultAction == RiderNotificationConstants.ACTION_ACCEPT_RIDE) {
                "Ride accepted. Opening rider app..."
            } else {
                "Ride rejected."
            }
            findViewById<TextView>(R.id.statusText).text = statusText
            timeoutHandler.postDelayed({
                openRiderApp()
                finish()
            }, 900)
            return
        }

        ContextCompat.startForegroundService(
            this,
            Intent(this, RideAlertSoundService::class.java),
        )
        timeoutHandler.postDelayed(timeoutRunnable, RiderNotificationConstants.ALERT_TIMEOUT_MS)
    }

    private fun triggerAction(action: String) {
        stopAlert()
        ContextCompat.startForegroundService(
            this,
            Intent(this, RideNotificationActionService::class.java).apply {
                this.action = action
                putExtra(RiderNotificationConstants.EXTRA_RIDE_ID, rideId)
                putExtra(RiderNotificationConstants.EXTRA_NOTIFICATION_ID, notificationId)
            },
        )
    }

    private fun stopAlert() {
        timeoutHandler.removeCallbacks(timeoutRunnable)
        stopService(Intent(this, RideAlertSoundService::class.java).apply {
            action = RiderNotificationConstants.ACTION_STOP_ALARM
        })
        NotificationManagerCompat.from(this).cancel(notificationId)
    }

    private fun openRiderApp() {
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("deeplink_rideId", rideId)
                putExtra("deeplink_screen", "requests")
            },
        )
    }

    private fun wakeScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onDestroy() {
        timeoutHandler.removeCallbacks(timeoutRunnable)
        super.onDestroy()
    }
}
