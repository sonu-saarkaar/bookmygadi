package com.bookmygadi.user

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView

private const val TAG = "BmgUserWebView"
private const val WEBVIEW_RESIZE_JS =
    "window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('orientationchange'));"

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

class WebAppInterface(
    private val context: Context,
    private val getLatestLocation: () -> Location?
) {
    @JavascriptInterface
    fun getNativeLocation(): String {
        val loc = getLatestLocation()
        return if (loc != null) {
            "{\"lat\": ${loc.latitude}, \"lng\": ${loc.longitude}}"
        } else {
            "null"
        }
    }

    @JavascriptInterface
    fun openLocationSettings() {
        val intent = android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        intent.data = android.net.Uri.parse("package:" + context.packageName)
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun logout() {
        // Handle logout triggered from web
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun openNavigation(startLat: Double, startLng: Double, endLat: Double, endLng: Double) {
        val googleNavIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("google.navigation:q=$endLat,$endLng&mode=d")
        ).apply {
            setPackage("com.google.android.apps.maps")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        val fallbackIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("geo:$endLat,$endLng?q=$endLat,$endLng")
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        try {
            if (googleNavIntent.resolveActivity(context.packageManager) != null) {
                context.startActivity(googleNavIntent)
            } else {
                context.startActivity(fallbackIntent)
            }
        } catch (_: Exception) {
            val webUrl = "https://www.google.com/maps/dir/?api=1&origin=$startLat,$startLng&destination=$endLat,$endLng&travelmode=driving"
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(webIntent)
        }
    }
}

@SuppressLint("MissingPermission")
@Composable
fun WebAppScreen(
    url: String,
    onMainFrameLoadError: ((String?) -> Unit)? = null,
) {
    val context = LocalContext.current

    val locationManager = remember { context.getSystemService(Context.LOCATION_SERVICE) as LocationManager }
    val latestLocation = remember { mutableStateOf<Location?>(null) }

    DisposableEffect(context) {
        val locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                latestLocation.value = location
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            val gpsLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            latestLocation.value = gpsLoc ?: netLoc

            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 1f, locationListener)
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000L, 5f, locationListener)
        } catch (_: SecurityException) {
            // Permissions not yet granted.
        } catch (_: Exception) {
            // Providers not available.
        }

        onDispose {
            try {
                locationManager.removeUpdates(locationListener)
            } catch (_: Exception) {
                // Ignore cleanup failures.
            }
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView.setWebContentsDebuggingEnabled(true)
            WebView(ctx).apply {
                // Bridge to determine if running inside Android App
                settings.userAgentString = "${settings.userAgentString} BookMyGadiAndroidApp"

                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                    setGeolocationEnabled(true)
                    cacheMode = WebSettings.LOAD_DEFAULT
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    javaScriptCanOpenWindowsAutomatically = true
                    setSupportMultipleWindows(false)
                    // userAgentString = "$userAgentString BookMyGadiUserApp/1.2"
                    allowContentAccess = true
                    allowFileAccess = true
                    mediaPlaybackRequiresUserGesture = false
                }
                setBackgroundColor(android.graphics.Color.WHITE)

                webChromeClient = object : WebChromeClient() {
                    override fun onGeolocationPermissionsShowPrompt(
                        origin: String,
                        callback: GeolocationPermissions.Callback
                    ) {
                        // Grant permission and retain it (third parameter = true) to stop constant prompts
                        callback.invoke(origin, true, true)
                    }

                    override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                        consoleMessage?.let {
                            Log.d(TAG, "console: ${it.message()} @${it.sourceId()}:${it.lineNumber()}")
                        }
                        return super.onConsoleMessage(consoleMessage)
                    }
                }

                addJavascriptInterface(
                    WebAppInterface(context = ctx, getLatestLocation = { latestLocation.value }),
                    "AndroidInterface"
                )

                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        request: android.webkit.WebResourceRequest?
                    ): Boolean {
                        val urlStr = request?.url?.toString() ?: ""
                        // Handle internal navigation for your web app
                        if (urlStr.contains("/app/")) {
                            return false // Let WebView handle it
                        }
                        // Handle external links (WhatsApp, Maps, etc.)
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(urlStr))
                            context.startActivity(intent)
                            return true
                        } catch (_: Exception) {
                            return false
                        }
                    }

                    override fun onPageFinished(view: WebView?, loadedUrl: String?) {
                        super.onPageFinished(view, loadedUrl)
                        triggerMapReflow(view)
                    }

                    override fun onReceivedError(
                        view: WebView?,
                        request: android.webkit.WebResourceRequest?,
                        error: android.webkit.WebResourceError?
                    ) {
                        super.onReceivedError(view, request, error)
                        Log.e(TAG, "WebError: ${error?.description} (${error?.errorCode})")
                        // Only report fatal errors that aren't just "not found" or similar transient ones
                        if (request?.isForMainFrame == true && error?.errorCode == WebViewClient.ERROR_CONNECT) {
                            onMainFrameLoadError?.invoke(error.description?.toString())
                        }
                    }

                    override fun onReceivedHttpError(
                        view: WebView?,
                        request: android.webkit.WebResourceRequest?,
                        errorResponse: WebResourceResponse?
                    ) {
                        super.onReceivedHttpError(view, request, errorResponse)
                        if (request?.isForMainFrame == true && errorResponse?.statusCode == 404) {
                            Log.e(TAG, "HTTP error on main frame: ${errorResponse.statusCode}")
                            onMainFrameLoadError?.invoke("HTTP ${errorResponse.statusCode}")
                        }
                    }

                    override fun onRenderProcessGone(
                        view: WebView?,
                        detail: android.webkit.RenderProcessGoneDetail?
                    ): Boolean {
                        Log.e(TAG, "WebView renderer gone. didCrash=${detail?.didCrash()}")
                        // Try to reload current URL instead of base URL
                        view?.reload()
                        return true
                    }
                }

                loadUrl(url)
            }
        },
        update = { webView ->
            // Removed the aggressive loadUrl check that was causing reloads on every GPS update.
            // The initial load is handled in the factory block.
            triggerMapReflow(webView)
        }
    )
}
