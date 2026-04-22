package com.bookmygadi.rider.notifications

object RiderNotificationConstants {
    const val CHANNEL_RIDE_ALERT = "RIDE_ALERT"
    const val CHANNEL_RIDE_STATUS = "RIDE_STATUS"
    const val CHANNEL_SYSTEM = "SYSTEM"

    const val ACTION_ACCEPT_RIDE = "com.bookmygadi.rider.ACTION_ACCEPT_RIDE"
    const val ACTION_REJECT_RIDE = "com.bookmygadi.rider.ACTION_REJECT_RIDE"
    const val ACTION_STOP_ALARM = "com.bookmygadi.rider.ACTION_STOP_ALARM"

    const val EXTRA_RIDE_ID = "extra_ride_id"
    const val EXTRA_PICKUP = "extra_pickup"
    const val EXTRA_DROP = "extra_drop"
    const val EXTRA_PRICE = "extra_price"
    const val EXTRA_NOTIFICATION_ID = "extra_notification_id"

    const val ALERT_TIMEOUT_MS = 20_000L
    const val ALERT_NOTIFICATION_ID = 44001
    const val ALERT_SERVICE_NOTIFICATION_ID = 44002
}
