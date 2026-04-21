import os

base_dir = r"C:\Users\mdasi\Project\bookmygadi\bookmygadi-main\android\app-rider\src\main"
res_draw = os.path.join(base_dir, "res", "drawable")
res_lay = os.path.join(base_dir, "res", "layout")
src_kt = os.path.join(base_dir, "java", "com", "bookmygadi", "rider", "FloatingWidgetService.kt")

os.makedirs(res_draw, exist_ok=True)
os.makedirs(res_lay, exist_ok=True)

drawables = {
    "bg_float_timer.xml": '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">\n    <solid android:color="#1c1c1e" />\n    <stroke android:width="2dp" android:color="#10B981" />\n</shape>',
    "bg_float_expanded.xml": '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">\n    <solid android:color="#F43F5E" />\n    <stroke android:width="2dp" android:color="#FFFFFF" />\n</shape>',
    "bg_float_menu_item.xml": '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">\n    <solid android:color="#FFFFFF" />\n</shape>',
    "ic_sos_red.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M12,2L1,21H23L12,2Z" android:strokeWidth="2" android:strokeColor="#F43F5E" android:fillColor="#00000000"/>\n  <path android:pathData="M12,10V14M12,17V17.01" android:strokeWidth="2" android:strokeColor="#F43F5E" android:strokeLineCap="round"/>\n</vector>',
    "ic_112_blue.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M12,22S3,16 3,9V5L12,2L21,5V9C21,16 12,22 12,22Z" android:strokeWidth="2" android:strokeColor="#3B82F6" android:fillColor="#00000000"/>\n  <path android:pathData="M12,8V12M12,16V16.01" android:strokeWidth="2" android:strokeColor="#3B82F6" android:strokeLineCap="round"/>\n</vector>',
    "ic_cancel_red.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M18,6L6,18M6,6L18,18" android:strokeWidth="2" android:strokeColor="#F43F5E" android:strokeLineCap="round"/>\n</vector>',
    "ic_complaint_blue.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M21,11.5A8.38,8.38 0,0 1,11.5 20A8.38,8.38 0,0 1,3 11.5A8.38,8.38 0,0 1,11.5 3A8.38,8.38 0,0 1,21 11.5Z" android:strokeWidth="2" android:strokeColor="#3B82F6" android:fillColor="#00000000"/>\n  <path android:pathData="M3,21L6,18" android:strokeWidth="2" android:strokeColor="#3B82F6" android:strokeLineCap="round"/>\n</vector>',
    "ic_float_close_white.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M18,6L6,18M6,6L18,18" android:strokeWidth="2" android:strokeColor="#FFFFFF" android:strokeLineCap="round"/>\n</vector>'
}

for name, content in drawables.items():
    with open(os.path.join(res_draw, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

layout_xml = """<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:padding="24dp"
    android:clipChildren="false"
    android:clipToPadding="false">

    <!-- Center Anchor -->
    <View android:id="@+id/center_anchor"
        android:layout_width="74dp"
        android:layout_height="74dp"
        android:layout_centerInParent="true" />

    <!-- SOS: Top Left -->
    <LinearLayout android:id="@+id/menu_sos"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_above="@id/center_anchor" android:layout_toLeftOf="@id/center_anchor"
        android:layout_marginRight="4dp" android:layout_marginBottom="4dp"
        android:visibility="gone">
        <ImageView android:layout_width="54dp" android:layout_height="54dp"
            android:background="@drawable/bg_float_menu_item" android:src="@drawable/ic_sos_red"
            android:padding="12dp" android:elevation="6dp"/>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="SOS" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="6dp"/>
    </LinearLayout>

    <!-- 112: Top Right -->
    <LinearLayout android:id="@+id/menu_112"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_above="@id/center_anchor" android:layout_toRightOf="@id/center_anchor"
        android:layout_marginLeft="4dp" android:layout_marginBottom="4dp"
        android:visibility="gone">
        <ImageView android:layout_width="54dp" android:layout_height="54dp"
            android:background="@drawable/bg_float_menu_item" android:src="@drawable/ic_112_blue"
            android:padding="12dp" android:elevation="6dp"/>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="112" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="6dp"/>
    </LinearLayout>

    <!-- Cancel: Bottom Right -->
    <LinearLayout android:id="@+id/menu_cancel"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_below="@id/center_anchor" android:layout_toRightOf="@id/center_anchor"
        android:layout_marginLeft="4dp" android:layout_marginTop="4dp"
        android:visibility="gone">
        <ImageView android:layout_width="54dp" android:layout_height="54dp"
            android:background="@drawable/bg_float_menu_item" android:src="@drawable/ic_cancel_red"
            android:padding="12dp" android:elevation="6dp"/>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="CANCEL" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="6dp"/>
    </LinearLayout>

    <!-- Complaint: Bottom Left -->
    <LinearLayout android:id="@+id/menu_complaint"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_below="@id/center_anchor" android:layout_toLeftOf="@id/center_anchor"
        android:layout_marginRight="4dp" android:layout_marginTop="4dp"
        android:visibility="gone">
        <ImageView android:layout_width="54dp" android:layout_height="54dp"
            android:background="@drawable/bg_float_menu_item" android:src="@drawable/ic_complaint_blue"
            android:padding="12dp" android:elevation="6dp"/>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="COMPLAINT" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="6dp"/>
    </LinearLayout>

    <!-- Main Button (Timer or X) -->
    <FrameLayout android:id="@+id/main_head"
        android:layout_width="74dp"
        android:layout_height="74dp"
        android:layout_centerInParent="true"
        android:background="@drawable/bg_float_timer"
        android:elevation="8dp">

        <TextView android:id="@+id/tv_timer"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:text="00:00" android:textColor="#FFFFFF" android:textStyle="bold" android:textSize="18sp" />

        <ImageView android:id="@+id/img_close"
            android:layout_width="36dp" android:layout_height="36dp"
            android:layout_gravity="center"
            android:src="@drawable/ic_float_close_white"
            android:visibility="gone" />
    </FrameLayout>
</RelativeLayout>
"""
with open(os.path.join(res_lay, "layout_floating_widget.xml"), "w", encoding="utf-8", newline="\n") as f:
    f.write(layout_xml)

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
import android.widget.ImageView
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
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.CENTER
        windowManager.addView(floatingView, params)

        val mainHead = floatingView.findViewById<FrameLayout>(R.id.main_head)
        tvTimer = floatingView.findViewById<TextView>(R.id.tv_timer)
        val imgClose = floatingView.findViewById<ImageView>(R.id.img_close)

        val menuSos = floatingView.findViewById<View>(R.id.menu_sos)
        val menu112 = floatingView.findViewById<View>(R.id.menu_112)
        val menuCancel = floatingView.findViewById<View>(R.id.menu_cancel)
        val menuComplaint = floatingView.findViewById<View>(R.id.menu_complaint)

        handler.post(timeRunnable)

        fun toggleMenu() {
            isExpanded = !isExpanded
            if (isExpanded) {
                mainHead.setBackgroundResource(R.drawable.bg_float_expanded)
                tvTimer.visibility = View.GONE
                imgClose.visibility = View.VISIBLE
                
                menuSos.visibility = View.VISIBLE
                menu112.visibility = View.VISIBLE
                menuCancel.visibility = View.VISIBLE
                menuComplaint.visibility = View.VISIBLE
            } else {
                mainHead.setBackgroundResource(R.drawable.bg_float_timer)
                tvTimer.visibility = View.VISIBLE
                imgClose.visibility = View.GONE
                
                menuSos.visibility = View.GONE
                menu112.visibility = View.GONE
                menuCancel.visibility = View.GONE
                menuComplaint.visibility = View.GONE
            }
        }

        fun closeAndOpenApp() {
            val intent = Intent(this@FloatingWidgetService, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            startActivity(intent)
        }

        menuSos.setOnClickListener {
            toggleMenu()
            sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_SOS"))
            closeAndOpenApp()
        }
        
        menu112.setOnClickListener {
            toggleMenu()
            val callIntent = Intent(Intent.ACTION_DIAL).apply {
                data = android.net.Uri.parse("tel:112")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(callIntent)
        }

        menuCancel.setOnClickListener {
            toggleMenu()
            sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE"))
            closeAndOpenApp()
        }

        menuComplaint.setOnClickListener {
            toggleMenu()
            closeAndOpenApp()
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
with open(src_kt, "w", encoding="utf-8", newline="\n") as f:
    f.write(kotlin_code)

print("Kotlin source created!")
