package com.bookmygadi.rider

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import com.bookmygadi.rider.notifications.RiderNotificationConstants
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class BookMyGadiRiderApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val alertChannel = NotificationChannel(
                RiderNotificationConstants.CHANNEL_RIDE_ALERT,
                "Ride Alert",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent full-screen alerts for incoming ride requests"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 800, 400, 800)
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setSound(soundUri, attrs)
            }

            val statusChannel = NotificationChannel(
                RiderNotificationConstants.CHANNEL_RIDE_STATUS,
                "Ride Status",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Updates on active rides"
                enableVibration(true)
            }

            val systemChannel = NotificationChannel(
                RiderNotificationConstants.CHANNEL_SYSTEM,
                "System",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing rider services and background helpers"
                setSound(null, null)
            }

            notificationManager.createNotificationChannels(
                listOf(alertChannel, statusChannel, systemChannel)
            )
        }
    }
}
