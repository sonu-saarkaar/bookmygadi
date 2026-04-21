import os

base_dir = r"C:\Users\mdasi\Project\bookmygadi\bookmygadi-main\android\app-rider\src\main"
res_draw = os.path.join(base_dir, "res", "drawable")
res_lay = os.path.join(base_dir, "res", "layout")
src_kt = os.path.join(base_dir, "java", "com", "bookmygadi", "rider", "FloatingWidgetService.kt")

drawables = {
    "bg_floating_timer.xml": '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">\n    <solid android:color="#10B981" />\n    <stroke android:width="2dp" android:color="#059669" />\n</shape>',
    "bg_floating_close.xml": '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">\n    <solid android:color="#F43F5E" />\n    <stroke android:width="2dp" android:color="#FFFFFF" />\n</shape>',
    "bg_floating_item.xml": '<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">\n    <solid android:color="#FFFFFF" />\n</shape>',
    "ic_close_thick.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M18,6L6,18M6,6L18,18" android:strokeWidth="2.5" android:strokeColor="#FFFFFF" android:strokeLineCap="round"/>\n</vector>',
    "ic_warning_red.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M12,2L1,21H23L12,2Z" android:strokeWidth="1.5" android:strokeColor="#EF4444" android:fillColor="#00000000"/>\n  <path android:pathData="M12,10V14M12,17V17.01" android:strokeWidth="1.5" android:strokeColor="#EF4444" android:strokeLineCap="round"/>\n</vector>',
    "ic_shield_blue.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M12,22S3,16 3,9V5L12,2L21,5V9C21,16 12,22 12,22Z" android:strokeWidth="1.5" android:strokeColor="#3B82F6" android:fillColor="#00000000"/>\n  <path android:pathData="M12,8V12M12,16V16.01" android:strokeWidth="1.5" android:strokeColor="#3B82F6" android:strokeLineCap="round"/>\n</vector>',
    "ic_check_circle_green.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M22,11.08V12A10,10 0 1 1 15.91,2.84" android:strokeWidth="1.5" android:strokeColor="#10B981" android:fillColor="#00000000" android:strokeLineCap="round"/>\n  <path android:pathData="M22,4L12,14.01L9,11.01" android:strokeWidth="1.5" android:strokeColor="#10B981" android:strokeLineCap="round"/>\n</vector>',
    "ic_wrench_orange.xml": '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:pathData="M14.7,6.3A5,5 0 0 0 5,6.3V6.3A5,5 0 0 0 5,13.4L3.4,15a1.5,1.5 0 0 0 0,2.1 1.5,1.5 0 0 0 2.1,0l1.6,-1.6A5,5 0 0 0 14.7,6.3Z" android:strokeWidth="1.5" android:strokeColor="#F97316" android:fillColor="#00000000"/>\n  <path android:pathData="M14,10 L21,3" android:strokeWidth="1.5" android:strokeColor="#F97316" android:strokeLineCap="round"/>\n  <path android:pathData="M21,7 L17,3" android:strokeWidth="1.5" android:strokeColor="#F97316" android:strokeLineCap="round"/>\n</vector>'
}

for name, content in drawables.items():
    with open(os.path.join(res_draw, name), "w", encoding="utf-8") as f:
        f.write(content)

layout_xml = """<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:padding="20dp"
    android:clipChildren="false"
    android:clipToPadding="false">

    <!-- Center Anchor Button -->
    <FrameLayout android:id="@+id/main_head"
        android:layout_width="84dp"
        android:layout_height="84dp"
        android:layout_centerInParent="true"
        android:background="@drawable/bg_floating_timer"
        android:elevation="14dp">

        <TextView android:id="@+id/tv_timer"
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="00:00" android:textColor="#FFFFFF" android:textStyle="bold" 
            android:textSize="18sp" android:layout_gravity="center"
            android:shadowColor="#44000000" android:shadowDx="1" android:shadowDy="1" android:shadowRadius="2"/>

        <ImageView android:id="@+id/img_close"
            android:layout_width="40dp" android:layout_height="40dp"
            android:layout_gravity="center"
            android:src="@drawable/ic_close_thick"
            android:visibility="gone" />
    </FrameLayout>

    <!-- Top Left: SOS -->
    <LinearLayout android:id="@+id/menu_sos"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_above="@id/main_head" android:layout_toLeftOf="@id/main_head"
        android:layout_marginRight="6dp" android:layout_marginBottom="6dp"
        android:visibility="gone">
        <FrameLayout android:layout_width="64dp" android:layout_height="64dp"
            android:background="@drawable/bg_floating_item" android:elevation="8dp">
            <ImageView android:layout_width="28dp" android:layout_height="28dp"
                android:src="@drawable/ic_warning_red" android:layout_gravity="center"/>
        </FrameLayout>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="SOS" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="8dp"/>
    </LinearLayout>

    <!-- Top Right: 112 -->
    <LinearLayout android:id="@+id/menu_112"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_above="@id/main_head" android:layout_toRightOf="@id/main_head"
        android:layout_marginLeft="6dp" android:layout_marginBottom="6dp"
        android:visibility="gone">
        <FrameLayout android:layout_width="64dp" android:layout_height="64dp"
            android:background="@drawable/bg_floating_item" android:elevation="8dp">
            <ImageView android:layout_width="28dp" android:layout_height="28dp"
                android:src="@drawable/ic_shield_blue" android:layout_gravity="center"/>
        </FrameLayout>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="112" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="8dp"/>
    </LinearLayout>

    <!-- Bottom Right: COMPLETE RIDE -->
    <LinearLayout android:id="@+id/menu_complete"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_below="@id/main_head" android:layout_toRightOf="@id/main_head"
        android:layout_marginLeft="6dp" android:layout_marginTop="6dp"
        android:visibility="gone">
        <FrameLayout android:layout_width="64dp" android:layout_height="64dp"
            android:background="@drawable/bg_floating_item" android:elevation="8dp">
            <ImageView android:layout_width="28dp" android:layout_height="28dp"
                android:src="@drawable/ic_check_circle_green" android:layout_gravity="center"/>
        </FrameLayout>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="COMPLETE" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="8dp"/>
    </LinearLayout>

    <!-- Bottom Left: VEHICLE ISSUE -->
    <LinearLayout android:id="@+id/menu_issue"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:orientation="vertical" android:gravity="center"
        android:layout_below="@id/main_head" android:layout_toLeftOf="@id/main_head"
        android:layout_marginRight="6dp" android:layout_marginTop="6dp"
        android:visibility="gone">
        <FrameLayout android:layout_width="64dp" android:layout_height="64dp"
            android:background="@drawable/bg_floating_item" android:elevation="8dp">
            <ImageView android:layout_width="28dp" android:layout_height="28dp"
                android:src="@drawable/ic_wrench_orange" android:layout_gravity="center"/>
        </FrameLayout>
        <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:text="ISSUE" android:textSize="11sp" android:textColor="#1c1c1e" android:textStyle="bold"
            android:layout_marginTop="8dp"/>
    </LinearLayout>

</RelativeLayout>
"""
with open(os.path.join(res_lay, "layout_floating_widget.xml"), "w", encoding="utf-8") as f:
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
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
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
        val menuComplete = floatingView.findViewById<View>(R.id.menu_complete)
        val menuIssue = floatingView.findViewById<View>(R.id.menu_issue)

        handler.post(timeRunnable)

        fun toggleMenu() {
            isExpanded = !isExpanded
            if (isExpanded) {
                mainHead.setBackgroundResource(R.drawable.bg_floating_close)
                tvTimer.visibility = View.GONE
                imgClose.visibility = View.VISIBLE
                
                menuSos.visibility = View.VISIBLE
                menu112.visibility = View.VISIBLE
                menuComplete.visibility = View.VISIBLE
                menuIssue.visibility = View.VISIBLE
            } else {
                mainHead.setBackgroundResource(R.drawable.bg_floating_timer)
                tvTimer.visibility = View.VISIBLE
                imgClose.visibility = View.GONE
                
                menuSos.visibility = View.GONE
                menu112.visibility = View.GONE
                menuComplete.visibility = View.GONE
                menuIssue.visibility = View.GONE
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

        menuComplete.setOnClickListener {
            toggleMenu()
            sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_COMPLETE_RIDE"))
            closeAndOpenApp()
        }

        menuIssue.setOnClickListener {
            toggleMenu()
            sendBroadcast(Intent("com.bookmygadi.ACTION_NATIVE_ISSUE"))
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
with open(src_kt, "w", encoding="utf-8") as f:
    f.write(kotlin_code)


main_activity_path = r"C:\Users\mdasi\Project\bookmygadi\bookmygadi-main\android\app-rider\src\main\java\com\bookmygadi\rider\MainActivity.kt"
with open(main_activity_path, "r", encoding="utf8") as f:
    content = f.read()

if "ACTION_NATIVE_ISSUE" not in content:
    content = content.replace('addAction("com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE")', 'addAction("com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE")\n            addAction("com.bookmygadi.ACTION_NATIVE_ISSUE")')
    content = content.replace('} else if (intent.action == "com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE") {', '} else if (intent.action == "com.bookmygadi.ACTION_NATIVE_ISSUE") {\n                    webView.evaluateJavascript("window.postMessage({type: \'NATIVE_ISSUE\'}, \'*\');", null)\n                } else if (intent.action == "com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE") {')
    with open(main_activity_path, "w", encoding="utf8") as f:
        f.write(content)

react_path = r"C:\Users\mdasi\Project\bookmygadi\bookmygadi-main\frontend\src\rider_app\RiderRideDetailsPage.tsx"
with open(react_path, "r", encoding="utf8") as f:
    react_content = f.read()

if "NATIVE_ISSUE" not in react_content:
    target = '} else if (event.data?.type === "NATIVE_CANCEL_RIDE") {'
    replacement = '} else if (event.data?.type === "NATIVE_ISSUE") {\n            setNotice("Vehicle Issue reported! Contacting Support...");\n            // Support call mapping can go here\n         } else if (event.data?.type === "NATIVE_CANCEL_RIDE") {'
    react_content = react_content.replace(target, replacement)
    with open(react_path, "w", encoding="utf8") as f:
        f.write(react_content)

print("Widgets and connections updated!")
