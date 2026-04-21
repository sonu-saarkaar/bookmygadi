package com.bookmygadi.user

import android.Manifest
import android.animation.ValueAnimator
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.animation.AccelerateDecelerateInterpolator
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.launch

// ---------------------------------------------------------------------------
// Custom top-down car bitmap icon (no external assets needed)
// ---------------------------------------------------------------------------
private fun createCarBitmap(context: Context, color: Int): BitmapDescriptor {
    val size = (48 * context.resources.displayMetrics.density).toInt()
    val bm = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bm)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    val w = size.toFloat()
    val h = size.toFloat()

    // Body
    paint.color = color
    val bodyPath = Path().apply {
        moveTo(w * 0.25f, h * 0.12f)
        lineTo(w * 0.75f, h * 0.12f)
        quadTo(w * 0.9f, h * 0.15f, w * 0.88f, h * 0.38f)
        lineTo(w * 0.88f, h * 0.75f)
        quadTo(w * 0.88f, h * 0.9f, w * 0.5f, h * 0.93f)
        quadTo(w * 0.12f, h * 0.9f, w * 0.12f, h * 0.75f)
        lineTo(w * 0.12f, h * 0.38f)
        quadTo(w * 0.1f, h * 0.15f, w * 0.25f, h * 0.12f)
        close()
    }
    canvas.drawPath(bodyPath, paint)

    // Windshield
    paint.color = android.graphics.Color.argb(200, 200, 230, 255)
    canvas.drawRoundRect(RectF(w * 0.22f, h * 0.18f, w * 0.78f, h * 0.44f), w * 0.05f, h * 0.05f, paint)

    // Headlights
    paint.color = android.graphics.Color.WHITE
    canvas.drawOval(RectF(w * 0.16f, h * 0.12f, w * 0.32f, h * 0.22f), paint)
    canvas.drawOval(RectF(w * 0.68f, h * 0.12f, w * 0.84f, h * 0.22f), paint)

    // Tail-lights
    paint.color = android.graphics.Color.RED
    canvas.drawOval(RectF(w * 0.16f, h * 0.80f, w * 0.32f, h * 0.90f), paint)
    canvas.drawOval(RectF(w * 0.68f, h * 0.80f, w * 0.84f, h * 0.90f), paint)

    return BitmapDescriptorFactory.fromBitmap(bm)
}

/**
 * Full-screen Google Map composable used inside the Booking-Confirmed /
 * active-tracking screen.
 *
 * Responsibilities:
 *  - Show user pickup marker (blue dot)
 *  - Show driver/rider marker (car icon) that ANIMATES between positions
 *  - Draw Directions API polyline (indigo)
 *  - Auto-fit camera to both markers + route
 *  - Handle location permission request
 *  - Crash-safe when locations are null
 */
@Composable
fun UserRideMapScreen(
    driverLocation: LatLng?,
    previousDriverLocation: LatLng?,   // previous position for smooth animation
    pickupLocation: LatLng?,
    destinationLocation: LatLng?,
    routePoints: List<LatLng>,
    isInProgress: Boolean = false       // true → show destination, else show pickup
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // ------------------------------------------------------------------
    // Permission handling
    // ------------------------------------------------------------------
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        hasLocationPermission = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }
    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    // ------------------------------------------------------------------
    // Map defaults
    // ------------------------------------------------------------------
    val fallback = LatLng(21.1458, 79.0882)   // Central India fallback
    val initialCenter = driverLocation ?: pickupLocation ?: fallback

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(initialCenter, 15f)
    }

    // ------------------------------------------------------------------
    // Camera: fit both driver + pickup markers (and route points)
    // ------------------------------------------------------------------
    LaunchedEffect(driverLocation, pickupLocation, routePoints) {
        val points = buildList {
            driverLocation?.let { add(it) }
            pickupLocation?.let { add(it) }
            if (isInProgress) destinationLocation?.let { add(it) }
            if (routePoints.isNotEmpty()) addAll(routePoints)
        }
        if (points.size >= 2) {
            try {
                val boundsBuilder = LatLngBounds.Builder()
                points.forEach { boundsBuilder.include(it) }
                val bounds = boundsBuilder.build()
                // Add 150 dp padding so markers are not clipped by bottom sheet
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(bounds, 160),
                    durationMs = 900
                )
            } catch (_: Exception) {
                // Map layout may not be ready on first frame — ignore
            }
        } else if (driverLocation != null) {
            // Only driver known — follow driver smoothly
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngZoom(driverLocation, 16f),
                durationMs = 800
            )
        }
    }

    // ------------------------------------------------------------------
    // Animated driver marker state
    //   We maintain a single MarkerState and update its position via a
    //   ValueAnimator so the car glides smoothly instead of jumping.
    // ------------------------------------------------------------------
    val driverMarkerState = remember {
        MarkerState(position = driverLocation ?: fallback)
    }

    // Animate whenever driverLocation changes
    DisposableEffect(driverLocation) {
        if (driverLocation == null) return@DisposableEffect onDispose {}

        val from = previousDriverLocation ?: driverLocation
        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1800L
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener { anim ->
                val f = anim.animatedFraction
                val lat = from.latitude + (driverLocation.latitude - from.latitude) * f
                val lng = from.longitude + (driverLocation.longitude - from.longitude) * f
                driverMarkerState.position = LatLng(lat, lng)
            }
        }
        animator.start()

        onDispose { animator.cancel() }
    }

    // ------------------------------------------------------------------
    // Custom icons — created once
    // ------------------------------------------------------------------
    val carIcon = remember {
        createCarBitmap(context, android.graphics.Color.parseColor("#4F46E5"))   // Indigo
    }
    val pickupIcon = remember {
        createCarBitmap(context, android.graphics.Color.parseColor("#10B981"))   // Emerald
    }

    // ------------------------------------------------------------------
    // Map properties – minimal, clean look
    // ------------------------------------------------------------------
    val mapProperties = remember(hasLocationPermission) {
        MapProperties(
            isMyLocationEnabled = hasLocationPermission,
            mapStyleOptions = MapStyleOptions(
                """
                [
                  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                  { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
                ]
                """.trimIndent()
            )
        )
    }

    val mapUiSettings = remember {
        MapUiSettings(
            zoomControlsEnabled = false,
            compassEnabled = true,
            myLocationButtonEnabled = false,
            rotationGesturesEnabled = true,
            tiltGesturesEnabled = false
        )
    }

    // ------------------------------------------------------------------
    // Draw map
    // ------------------------------------------------------------------
    GoogleMap(
        modifier = Modifier.fillMaxSize(),
        cameraPositionState = cameraPositionState,
        properties = mapProperties,
        uiSettings = mapUiSettings
    ) {
        // —— Driver / Rider marker (animated) ————————————————————————————
        if (driverLocation != null) {
            Marker(
                state = driverMarkerState,
                title = "Your Driver",
                snippet = null,
                icon = carIcon,
                zIndex = 2f,
                flat = true  // rotates with the map
            )
        }

        // —— User pickup marker ————————————————————————————————————————————
        pickupLocation?.let { pickup ->
            Marker(
                state = MarkerState(position = pickup),
                title = "Pickup",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                zIndex = 1f
            )
        }

        // —— Destination marker (during trip) ————————————————————————————
        if (isInProgress) {
            destinationLocation?.let { dest ->
                Marker(
                    state = MarkerState(position = dest),
                    title = "Destination",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                    zIndex = 1f
                )
            }
        }

        // —— Route polyline (white border + indigo fill) —————————————————
        if (routePoints.isNotEmpty()) {
            // Shadow / border
            Polyline(
                points = routePoints,
                color = Color.White,
                width = 18f,
                zIndex = 0f,
                geodesic = true
            )
            // Actual route
            Polyline(
                points = routePoints,
                color = Color(0xFF4F46E5),
                width = 10f,
                zIndex = 1f,
                geodesic = true
            )
        }
    }
}
