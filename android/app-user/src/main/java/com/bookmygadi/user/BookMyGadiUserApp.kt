package com.bookmygadi.user

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class BookMyGadiUserApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannels(
                listOf(
                    NotificationChannel(
                        "USER_RIDE_STATUS",
                        "Ride Status",
                        NotificationManager.IMPORTANCE_HIGH,
                    ).apply {
                        description = "Important ride updates for passengers"
                        enableVibration(true)
                    },
                    NotificationChannel(
                        "USER_SYSTEM",
                        "System",
                        NotificationManager.IMPORTANCE_LOW,
                    ).apply {
                        description = "General BookMyGadi system notices"
                    },
                ),
            )
        }
    }
}
