package com.bookmygadi.rider

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
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
                "RIDE_ALERT_CHANNEL",
                "Ride Requests",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent full-screen alerts for new ride requests"
                enableVibration(true)
                setSound(null, null) 
            }

            val statusChannel = NotificationChannel(
                "RIDE_STATUS_CHANNEL",
                "Ride Status",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Updates on active rides"
            }

            val persistentChannel = NotificationChannel(
                "PERSISTENT_RIDE_CHANNEL",
                "Active Ride Tracker",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing notification while on a trip"
            }

            notificationManager.createNotificationChannels(
                listOf(alertChannel, statusChannel, persistentChannel)
            )
        }
    }
}
