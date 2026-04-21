package com.bookmygadi.rider

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.SystemClock
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView

class FloatingWidgetService : Service() {
    private lateinit var windowManager: WindowManager
    private lateinit var floatingView: View
    private var rideStartTime: Long = System.currentTimeMillis()
    private val handler = Handler()
    private lateinit var tvTimer: TextView
    private var isExpanded = false

    private val timeRunnable = object : Runnable {
        override fun run() {
            val elapsedSecs = (System.currentTimeMillis() - rideStartTime) / 1000
            val mins = elapsedSecs / 60
            val secs = elapsedSecs % 60
            tvTimer.text = String.format("%02d:%02d", mins, secs)
            handler.postDelayed(this, 1000)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_widget, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.CENTER
        windowManager.addView(floatingView, params)

        val mainHead = floatingView.findViewById<FrameLayout>(R.id.main_head)
        tvTimer = floatingView.findViewById<TextView>(R.id.tv_timer)
        val imgClose = floatingView.findViewById<TextView>(R.id.img_close)
        val pieMenu = floatingView.findViewById<PieMenuView>(R.id.pie_menu)

        handler.post(timeRunnable)

        fun toggleMenu() {
            isExpanded = !isExpanded
            if (isExpanded) {
                pieMenu.visibility = View.VISIBLE
                tvTimer.visibility = View.GONE
                imgClose.visibility = View.VISIBLE
            } else {
                pieMenu.visibility = View.GONE
                tvTimer.visibility = View.VISIBLE
                imgClose.visibility = View.GONE
            }
        }

        fun closeAndOpenApp() {
            val intent = Intent(this@FloatingWidgetService, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            startActivity(intent)
        }

        pieMenu.onSliceClickListener = { index ->
            toggleMenu()
            when (index) {
                0 -> { // SOS
                    sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_SOS"))
                    closeAndOpenApp()
                }
                1 -> { // 112
                    val callIntent = Intent(Intent.ACTION_DIAL).apply {
                        data = android.net.Uri.parse("tel:112")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(callIntent)
                }
                2 -> { // Arrive / Complete
                    sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_COMPLETE_RIDE"))
                    closeAndOpenApp()
                }
                3 -> { // Vehicle Issue
                    sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_ISSUE"))
                    closeAndOpenApp()
                }
            }
        }

        mainHead.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var lastClickTime = 0L

            override fun onTouch(view: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params.x = initialX + (event.rawX - initialTouchX).toInt()
                        params.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(floatingView, params)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val xDiff = Math.abs(event.rawX - initialTouchX)
                        val yDiff = Math.abs(event.rawY - initialTouchY)
                        if (xDiff < 10 && yDiff < 10) { 
                            val currentSystemTime = SystemClock.uptimeMillis()
                            if (currentSystemTime - lastClickTime < 400) {
                                lastClickTime = 0
                                closeAndOpenApp()
                            } else {
                                lastClickTime = currentSystemTime
                                toggleMenu()
                            }
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(timeRunnable)
        if (::floatingView.isInitialized) {
            windowManager.removeView(floatingView)
        }
    }
}
