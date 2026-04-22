package com.bookmygadi.rider

import com.bookmygadi.rider.R

import android.annotation.SuppressLint
import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.net.Uri
import android.provider.Settings
import android.content.SharedPreferences
import android.webkit.JavascriptInterface
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.network.BookMyGadiApi
import com.bookmygadi.rider.notifications.RiderAvailabilityService
import com.bookmygadi.rider.notifications.RiderFcmRegistrar
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var api: BookMyGadiApi
    @Inject lateinit var authRepository: AuthRepository

    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 2001
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 2002
        private const val BACKGROUND_LOCATION_REQUEST_CODE = 2003
        private const val TAG = "BmgRiderWebView"
        private const val WEBVIEW_RESIZE_JS =
            "window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('orientationchange'));"
    }

    private lateinit var webView: WebView
    private lateinit var loadingLayout: FrameLayout
    private lateinit var errorLayout: FrameLayout
    private lateinit var authPrefs: SharedPreferences
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val nativeActionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent != null && ::webView.isInitialized) {
                if (intent.action == "com.bookmygadi.ACTION_NATIVE_SOS") {
                    // Post message to web layer to trigger handleSOS securely
                    webView.evaluateJavascript("window.postMessage({type: 'NATIVE_SOS_TRIGGER'}, '*');", null)
                } else if (intent.action == "com.bookmygadi.ACTION_NATIVE_COMPLETE_RIDE") {
                    // Trigger ride complete action in the web layer
                    webView.evaluateJavascript("window.postMessage({type: 'NATIVE_COMPLETE_RIDE'}, '*');", null)
                } else if (intent.action == "com.bookmygadi.ACTION_NATIVE_ISSUE") {
                    webView.evaluateJavascript("window.postMessage({type: 'NATIVE_ISSUE'}, '*');", null)
                } else if (intent.action == "com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE") {
                    // Trigger ride cancel action in the web layer
                    webView.evaluateJavascript("window.postMessage({type: 'NATIVE_CANCEL_RIDE'}, '*');", null)
                }
            }
        }
    }

    // URL is injected from local.properties via BuildConfig — no more hardcoded IPs!
    private val RIDER_APP_URL = "${BuildConfig.WEB_BASE_URL}/rider/home"
    
    private var latestLocation: Location? = null

    private fun triggerMapReflow(webView: WebView?) {
        if (webView == null) return
        val delays = longArrayOf(120L, 350L, 900L)
        for (delay in delays) {
            webView.postDelayed(
                {
                    webView.evaluateJavascript(WEBVIEW_RESIZE_JS, null)
                },
                delay
            )
        }
    }

    // Javascript interface to bridge native location into the web app 
    inner class WebAppInterface {
        @JavascriptInterface
        fun getNativeLocation(): String {
            return if (latestLocation != null) {
                "{\"lat\": ${latestLocation!!.latitude}, \"lng\": ${latestLocation!!.longitude}}"
            } else {
                "null"
            }
        }

        @JavascriptInterface
        fun openLocationSettings() {
            val intent = android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = android.net.Uri.parse("package:" + packageName)
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }

        @JavascriptInterface
        fun showFloatingButton() {
            runOnUiThread {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this@MainActivity)) {
                    val intent = android.content.Intent(
                        android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:" + packageName)
                    )
                    startActivity(intent)
                } else {
                    val floatIntent = android.content.Intent(this@MainActivity, FloatingWidgetService::class.java)
                    startService(floatIntent)
                }
            }
        }

        @JavascriptInterface
        fun hideFloatingButton() {
            runOnUiThread {
                val floatIntent = android.content.Intent(this@MainActivity, FloatingWidgetService::class.java)
                stopService(floatIntent)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_BookMyGadi)
        super.onCreate(savedInstanceState)

        val filter = IntentFilter("com.bookmygadi.ACTION_NATIVE_SOS").apply {
            addAction("com.bookmygadi.ACTION_NATIVE_COMPLETE_RIDE")
            addAction("com.bookmygadi.ACTION_NATIVE_CANCEL_RIDE")
            addAction("com.bookmygadi.ACTION_NATIVE_ISSUE")
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(nativeActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(nativeActionReceiver, filter)
        }

        ensureRequiredPermissions()
        authPrefs = getSharedPreferences("bookmygadi_auth", Context.MODE_PRIVATE)
        syncRiderPushRegistration()
        ensureAvailabilityService()

        val root = FrameLayout(this)
        root.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        startLocationUpdates()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                loadWithOverviewMode = true
                useWideViewPort = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                userAgentString = "BookMyGadiRiderApp/1.1 Android WebView"
                allowContentAccess = true
                allowFileAccess = true
                mediaPlaybackRequiresUserGesture = false
                setGeolocationEnabled(true)
            }
            setBackgroundColor(android.graphics.Color.WHITE)

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    loadingLayout.visibility = View.VISIBLE
                    errorLayout.visibility = View.GONE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    loadingLayout.visibility = View.GONE
                    syncNativeTokenFromWebView()
                    triggerMapReflow(view)
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        loadingLayout.visibility = View.GONE
                        errorLayout.visibility = View.VISIBLE
                    }
                }

                override fun onRenderProcessGone(
                    view: WebView?,
                    detail: android.webkit.RenderProcessGoneDetail?
                ): Boolean {
                    Log.e(TAG, "WebView renderer gone. didCrash=${detail?.didCrash()}")
                    loadingLayout.visibility = View.GONE
                    errorLayout.visibility = View.VISIBLE
                    webView.postDelayed({
                        try {
                            webView.loadUrl(RIDER_APP_URL)
                        } catch (_: Exception) {
                        }
                    }, 500)
                    return true
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: android.webkit.GeolocationPermissions.Callback?
                ) {
                    // grant permission and RETAIN it (third parameter = true) so it stops asking repeatedly
                    callback?.invoke(origin, true, true)
                }
            }
            addJavascriptInterface(WebAppInterface(), "AndroidInterface")
            loadUrl(RIDER_APP_URL)
        }

        // Loading Overlay
        loadingLayout = FrameLayout(this).apply {
            setBackgroundColor(android.graphics.Color.WHITE)
            val pb = ProgressBar(this@MainActivity)
            val params = FrameLayout.LayoutParams(120, 120)
            params.gravity = android.view.Gravity.CENTER
            addView(pb, params)
            
            val tv = TextView(this@MainActivity).apply {
                text = "Connecting to Rider Dashboard..."
                setTextColor(android.graphics.Color.GRAY)
                gravity = android.view.Gravity.CENTER
            }
            val textParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            textParams.gravity = android.view.Gravity.CENTER
            textParams.topMargin = 160
            addView(tv, textParams)
        }

        // Error Overlay
        errorLayout = FrameLayout(this).apply {
            visibility = View.GONE
            setBackgroundColor(android.graphics.Color.WHITE)
            val tv = TextView(this@MainActivity).apply {
                text = "Webpage Not Available\nCheck your Wi-Fi connection\n${BuildConfig.WEB_BASE_URL}"
                textAlignment = View.TEXT_ALIGNMENT_CENTER
                setTextColor(android.graphics.Color.BLACK)
            }
            val params = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            params.gravity = android.view.Gravity.CENTER
            addView(tv, params)

            setOnClickListener {
                webView.reload()
            }
        }

        root.addView(webView)
        root.addView(loadingLayout)
        root.addView(errorLayout)
        setContentView(root)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        syncRiderPushRegistration()
        ensureAvailabilityService()
    }

    override fun onPause() { super.onPause(); webView.onPause() }
    override fun onDestroy() {
        try {
            unregisterReceiver(nativeActionReceiver)
        } catch (e: Exception) {}
        appScope.cancel()
        webView.destroy()
        super.onDestroy()
    }

    private fun syncRiderPushRegistration() {
        RiderFcmRegistrar.syncCurrentToken(authRepository, api, appScope)
    }

    private fun syncNativeTokenFromWebView() {
        if (!::webView.isInitialized || !::authPrefs.isInitialized) return
        webView.evaluateJavascript(
            "(function(){try{return window.localStorage.getItem('bmg_access_token') || '';}catch(e){return '';}})();",
        ) { rawValue ->
            val token = rawValue
                ?.removePrefix("\"")
                ?.removeSuffix("\"")
                ?.replace("\\u003C", "<")
                ?.replace("\\n", "")
                ?.replace("\\\"", "\"")
                ?.trim()
                .orEmpty()

            if (token.isBlank()) return@evaluateJavascript
            val bearerToken = if (token.startsWith("Bearer ")) token else "Bearer $token"
            if (authPrefs.getString("auth_token", null) != bearerToken) {
                authPrefs.edit().putString("auth_token", bearerToken).apply()
            }
            syncRiderPushRegistration()
            ensureAvailabilityService()
        }
    }

    private fun ensureAvailabilityService() {
        if (authRepository.getToken().isNullOrBlank()) return
        ContextCompat.startForegroundService(
            this,
            Intent(this, RiderAvailabilityService::class.java),
        )
    }

    private fun openAppSettings() {
        startActivity(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            }
        )
    }

    private fun showMandatoryPermissionDialog(title: String, message: String) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("Open Settings") { _, _ -> openAppSettings() }
            .show()
    }

    private fun ensureRequiredPermissions() {
        val fineGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val notificationGranted =
            android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted && !coarseGranted) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                LOCATION_PERMISSION_REQUEST_CODE
            )
            return
        }

        if (!notificationGranted && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                NOTIFICATION_PERMISSION_REQUEST_CODE
            )
            return
        }

        if (
            android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                BACKGROUND_LOCATION_REQUEST_CODE
            )
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startLocationUpdates()
                ensureRequiredPermissions()
            } else {
                showMandatoryPermissionDialog(
                    "Location Required",
                    "BookMyGadi Rider needs precise location access for live ride alerts and tracking.",
                )
            }
        } else if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isEmpty() || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                showMandatoryPermissionDialog(
                    "Notifications Required",
                    "Enable notifications so incoming rides can appear instantly, even when the app is closed.",
                )
            } else {
                ensureRequiredPermissions()
            }
        } else if (requestCode == BACKGROUND_LOCATION_REQUEST_CODE) {
            if (grantResults.isEmpty() || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                showMandatoryPermissionDialog(
                    "Background Location Required",
                    "Allow background location so ride tracking keeps working while the rider app is minimized.",
                )
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        try {
            val locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val locationListener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    latestLocation = location
                }
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                latestLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                    
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    2000L,
                    1f,
                    locationListener
                )
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    2000L,
                    1f,
                    locationListener
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
