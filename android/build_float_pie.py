import os

base_dir = r"C:\Users\mdasi\Project\bookmygadi\bookmygadi-main\android\app-rider\src\main"
pkg_dir = os.path.join(base_dir, "java", "com", "bookmygadi", "rider")
res_draw = os.path.join(base_dir, "res", "drawable")
res_lay = os.path.join(base_dir, "res", "layout")

# 1. Custom View
pie_view_kt = """package com.bookmygadi.rider

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class PieMenuView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val slices = listOf("SOS", "112", "Arrive/\\nComplete", "Vehicle\\nIssue")
    
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { 
        style = Paint.Style.FILL
        color = Color.parseColor("#1C1C1E") 
    }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { 
        style = Paint.Style.STROKE
        color = Color.parseColor("#4ADE80") 
        strokeWidth = 10f // Matches handdrawn thick outline
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#FDE047") 
        textSize = 42f
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true 
    }

    var onSliceClickListener: ((Int) -> Unit)? = null

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2f
        val cy = h / 2f
        val radius = Math.min(w, h) / 2f - 10f

        val rectF = RectF(cx - radius, cy - radius, cx + radius, cy + radius)

        val startAngle = -90f
        val sweepAngle = 45f

        for (i in slices.indices) {
            val angle = startAngle + i * sweepAngle
            canvas.drawArc(rectF, angle, sweepAngle, true, fillPaint)
            canvas.drawArc(rectF, angle, sweepAngle, true, strokePaint)

            val textAngle = Math.toRadians((angle + sweepAngle / 2).toDouble())
            val textRadius = radius * 0.65f
            val tx = cx + (textRadius * cos(textAngle)).toFloat()
            val ty = cy + (textRadius * sin(textAngle)).toFloat()

            val text = slices[i]
            val lines = text.split("\\n")
            for ((idx, line) in lines.withIndex()) {
                canvas.drawText(
                    line, 
                    tx, 
                    ty + (idx * textPaint.textSize) - (lines.size - 1) * textPaint.textSize / 2 + textPaint.textSize / 3, 
                    textPaint
                )
            }
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_UP) {
            val x = event.x
            val y = event.y
            val cx = width / 2f
            val cy = height / 2f

            val dx = x - cx
            val dy = y - cy
            val dist = sqrt((dx * dx + dy * dy).toDouble())
            val radius = Math.min(width, height) / 2f

            // Adjust inner radius to ignore clicks on the center floating orb button (approx 42dp inner radius)
            val innerRadius = 130f 
            if (dist > innerRadius && dist <= radius) {
                var angle = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
                if (angle < -90f) angle += 360f

                if (angle in -90f..90f) {
                    val index = ((angle + 90f) / 45f).toInt()
                    if (index in 0..3) {
                        if (event.action == MotionEvent.ACTION_UP) {
                            onSliceClickListener?.invoke(index)
                        }
                        return true
                    }
                }
            }
        }
        return false 
    }
}
"""
with open(os.path.join(pkg_dir, "PieMenuView.kt"), "w", encoding="utf-8") as f:
    f.write(pie_view_kt)


# 2. Main shape 
draw_bg = """<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#1C1C1E" />
    <stroke android:width="4dp" android:color="#4ADE80" />
</shape>
"""
with open(os.path.join(res_draw, "bg_float_circle_new.xml"), "w", encoding="utf-8") as f:
    f.write(draw_bg)


# 3. Layout xml
layout_xml = """<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:clipChildren="false"
    android:clipToPadding="false">

    <!-- The 4-piece wedge wheel -->
    <com.bookmygadi.rider.PieMenuView
        android:id="@+id/pie_menu"
        android:layout_width="290dp"
        android:layout_height="290dp"
        android:layout_gravity="center"
        android:visibility="gone" />

    <!-- Center Button -->
    <FrameLayout android:id="@+id/main_head"
        android:layout_width="84dp"
        android:layout_height="84dp"
        android:layout_gravity="center"
        android:background="@drawable/bg_float_circle_new"
        android:elevation="14dp">

        <TextView android:id="@+id/tv_timer"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="00:00" android:textColor="#4ADE80" android:textStyle="bold" 
            android:textSize="18sp" android:layout_gravity="center"
            android:shadowColor="#44000000" android:shadowDx="1" android:shadowDy="1" android:shadowRadius="2"/>

        <!-- The Red X -->
        <TextView android:id="@+id/img_close"
             android:layout_width="wrap_content" android:layout_height="wrap_content"
             android:text="x" android:textColor="#EF4444" android:textSize="40sp" android:textStyle="bold"
             android:layout_gravity="center" android:translationY="-3dp"
             android:visibility="gone" />
    </FrameLayout>
</FrameLayout>
"""
with open(os.path.join(res_lay, "layout_floating_widget.xml"), "w", encoding="utf-8") as f:
    f.write(layout_xml)


# 4. Service Update
src_kt = os.path.join(pkg_dir, "FloatingWidgetService.kt")
kotlin_code = """package com.bookmygadi.rider

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
"""
with open(src_kt, "w", encoding="utf-8") as f:
    f.write(kotlin_code)

print("Exact circular menu implemented!")
