package com.bookmygadi.rider.notifications

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import com.bookmygadi.rider.R

class RideAlertSoundService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            RiderNotificationConstants.ACTION_STOP_ALARM -> {
                stopSelf()
                return START_NOT_STICKY
            }
        }

        startForeground(
            RiderNotificationConstants.ALERT_SERVICE_NOTIFICATION_ID,
            buildForegroundNotification(),
        )
        startAlarmLoop()
        return START_NOT_STICKY
    }

    private fun buildForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, RiderNotificationConstants.CHANNEL_SYSTEM)
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle("Incoming ride alert")
            .setContentText("BookMyGaadi is ringing for a new ride request")
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun startAlarmLoop() {
        try {
            val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alarmSound)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (_: Exception) {
        }

        vibrator = getSystemService(VIBRATOR_SERVICE) as? Vibrator
        vibrator?.let { vib ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vib.vibrate(
                    VibrationEffect.createWaveform(longArrayOf(0, 800, 400, 800), 0),
                )
            } else {
                @Suppress("DEPRECATION")
                vib.vibrate(longArrayOf(0, 800, 400, 800), 0)
            }
        }
    }

    private fun stopAlarmLoop() {
        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {
        }
        mediaPlayer?.release()
        mediaPlayer = null
        vibrator?.cancel()
    }

    override fun onDestroy() {
        stopAlarmLoop()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
