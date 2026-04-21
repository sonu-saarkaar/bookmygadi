package com.bookmygadi.user.ui.tracking

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookmygadi.core.domain.RideStatus
import com.bookmygadi.user.UserRideMapScreen
import com.bookmygadi.user.UserRideViewModel
import androidx.compose.ui.graphics.graphicsLayer
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.location.LocationServices

/**
 * Booking-Confirmed / Live-Tracking screen.
 *
 * Layout:
 *  ┌────────────────────────────────┐
 *  │      UserRideMapScreen         │  (full screen map behind)
 *  │  (markers + polyline + camera) │
 *  └────────────────────────────────┘
 *  ╔════════════════════════════════╗  ← bottom sheet overlay
 *  ║  ride status + ETA + distance  ║
 *  ║  fare + cancel button          ║
 *  ╚════════════════════════════════╝
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverTrackingScreen(
    onCancelRide: () -> Unit,
    onRideCompleted: () -> Unit,
    viewModel: UserRideViewModel = hiltViewModel()
) {
    val rideState       by viewModel.uiState.collectAsState()
    val riderLocation   by viewModel.riderLocation.collectAsState()
    val prevRiderLoc    by viewModel.previousRiderLocation.collectAsState()
    val routePoints     by viewModel.routePoints.collectAsState()
    val etaText         by viewModel.etaText.collectAsState()
    val distanceText    by viewModel.distanceText.collectAsState()
    val trackingError   by viewModel.trackingError.collectAsState()
    val locUnavailable  by viewModel.locationUnavailable.collectAsState()

    val context = LocalContext.current

    // ------------------------------------------------------------------
    // Current user location (for route + camera)
    // ------------------------------------------------------------------
    var userCurrentPos by remember { mutableStateOf<LatLng?>(null) }

    // Permission launcher
    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        val granted = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                perms[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            fusedClient.lastLocation.addOnSuccessListener { loc ->
                if (loc != null) {
                    userCurrentPos = LatLng(loc.latitude, loc.longitude)
                    viewModel.setLocationUnavailable(false)
                } else {
                    viewModel.setLocationUnavailable(true)
                }
            }.addOnFailureListener {
                viewModel.setLocationUnavailable(true)
            }
        } else {
            viewModel.setLocationUnavailable(true)
        }
    }

    LaunchedEffect(Unit) {
        val hasFine = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasFine) {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            fusedClient.lastLocation.addOnSuccessListener { loc ->
                if (loc != null) {
                    userCurrentPos = LatLng(loc.latitude, loc.longitude)
                } else {
                    viewModel.setLocationUnavailable(true)
                }
            }
        } else {
            permLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    // ------------------------------------------------------------------
    // Start live tracking once we have a user position
    // ------------------------------------------------------------------
    LaunchedEffect(rideState.status, userCurrentPos) {
        if (rideState.status == RideStatus.COMPLETED) {
            onRideCompleted()
            return@LaunchedEffect
        }

        val pos = userCurrentPos ?: return@LaunchedEffect  // wait until GPS ready
        val shouldTrack = rideState.status in setOf(
            RideStatus.DRIVER_ASSIGNED,
            RideStatus.DRIVER_EN_ROUTE,
            RideStatus.ARRIVED,
            RideStatus.IN_PROGRESS
        )
        if (shouldTrack) {
            // Read Maps API key from strings resource (defined in app/res/values/google_maps.xml)
            val resId = context.resources.getIdentifier(
                "google_maps_key", "string", context.packageName
            )
            val apiKey = if (resId != 0) context.getString(resId) else ""
            viewModel.startLiveTracking(pos.latitude, pos.longitude, apiKey)
        }
    }

    // Stop tracking when screen leaves composition
    DisposableEffect(Unit) {
        onDispose { viewModel.stopLiveTracking() }
    }

    // ------------------------------------------------------------------
    // Pulse animation for "searching" icon
    // ------------------------------------------------------------------
    val pulseAlpha by rememberInfiniteTransition(label = "pulse").animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "pulseAlpha"
    )

    // ------------------------------------------------------------------
    // Derive pickup LatLng from current user position
    // Fallback: central India so map never crashes
    // ------------------------------------------------------------------
    val pickupLatLng = userCurrentPos ?: LatLng(21.1458, 79.0882)

    // ------------------------------------------------------------------
    // UI
    // ------------------------------------------------------------------
    Box(modifier = Modifier.fillMaxSize()) {

        // ── Full-screen map ────────────────────────────────────────────
        UserRideMapScreen(
            driverLocation = riderLocation,
            previousDriverLocation = prevRiderLoc,
            pickupLocation = pickupLatLng,
            destinationLocation = null,       // extend when IN_PROGRESS + geocoding ready
            routePoints = routePoints,
            isInProgress = rideState.status == RideStatus.IN_PROGRESS
        )

        // ── Transient tracking error banner ────────────────────────────
        if (trackingError != null) {
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFF6B6B),
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = trackingError ?: "",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // ── GPS unavailable notice ─────────────────────────────────────
        if (locUnavailable) {
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFF59E0B),
                shadowElevation = 4.dp
            ) {
                Text(
                    text = "GPS unavailable — using last known location",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }

        // ── Bottom sheet overlay ───────────────────────────────────────
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            shadowElevation = 24.dp,
            color = Color.White
        ) {
            Column(
                modifier = Modifier
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 20.dp)
            ) {
                // Drag handle
                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Color(0xFFE5E7EB))
                        .align(Alignment.CenterHorizontally)
                )

                Spacer(Modifier.height(18.dp))

                // ── Status row ─────────────────────────────────────────
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Status icon chip
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(statusChipColor(rideState.status)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = statusEmoji(rideState.status),
                            fontSize = 24.sp,
                            modifier = if (rideState.status == RideStatus.SEARCHING_DRIVER)
                                Modifier.graphicsLayer { alpha = pulseAlpha }
                            else Modifier
                        )
                    }

                    Spacer(Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = statusTitle(rideState.status),
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            color = Color(0xFF111827)
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = statusSubtitle(
                                status = rideState.status,
                                etaText = etaText,
                                distanceText = distanceText,
                                pickup = rideState.pickupLocation,
                                destination = rideState.destinationLocation
                            ),
                            color = Color(0xFF6B7280),
                            fontSize = 12.sp,
                            lineHeight = 16.sp
                        )
                    }

                    // ETA badge (only when tracking)
                    if (etaText != null && rideState.status in setOf(
                            RideStatus.DRIVER_ASSIGNED,
                            RideStatus.DRIVER_EN_ROUTE,
                            RideStatus.ARRIVED
                        )
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFEEF2FF)
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = etaText ?: "",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    color = Color(0xFF4F46E5)
                                )
                                Text(
                                    text = distanceText ?: "",
                                    fontSize = 10.sp,
                                    color = Color(0xFF6B7280)
                                )
                            }
                        }
                    }
                }

                // ── Fare row ───────────────────────────────────────────
                rideState.fare?.let { fare ->
                    Spacer(Modifier.height(16.dp))
                    HorizontalDivider(color = Color(0xFFF3F4F6))
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "Agreed Fare",
                                color = Color(0xFF9CA3AF),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                "₹${String.format("%.0f", fare)}",
                                fontWeight = FontWeight.Black,
                                fontSize = 26.sp,
                                color = Color(0xFF4F46E5)
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFF0F0FF)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    tint = Color(0xFF4F46E5),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("4.8", fontWeight = FontWeight.Bold, color = Color(0xFF4F46E5))
                            }
                        }
                    }
                }

                // ── Cancel button ──────────────────────────────────────
                if (rideState.status in setOf(
                        RideStatus.SEARCHING_DRIVER,
                        RideStatus.DRIVER_ASSIGNED
                    )
                ) {
                    Spacer(Modifier.height(20.dp))
                    OutlinedButton(
                        onClick = {
                            viewModel.cancelRide()
                            onCancelRide()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.5.dp, Color(0xFFFF6B6B)
                        ),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color(0xFFFF6B6B)
                        )
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("Cancel Ride", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }

                Spacer(Modifier.height(4.dp))
            }
        }

        // ── Ride engine error banner ───────────────────────────────────
        rideState.error?.let { error ->
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 52.dp)   // below tracking error
                    .fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = Color(0xFFFF6B6B)
            ) {
                Text(
                    text = error,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(12.dp),
                    fontSize = 13.sp
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Helper pure functions — keep UI lambdas clean
// ---------------------------------------------------------------------------

private fun statusChipColor(status: RideStatus) = when (status) {
    RideStatus.SEARCHING_DRIVER             -> Color(0xFFFFF3E0)
    RideStatus.DRIVER_ASSIGNED,
    RideStatus.DRIVER_EN_ROUTE              -> Color(0xFFEEF2FF)
    RideStatus.ARRIVED                      -> Color(0xFFE8F5E9)
    RideStatus.IN_PROGRESS, RideStatus.RIDE_STARTED -> Color(0xFFE3F2FD)
    RideStatus.COMPLETED                    -> Color(0xFFE8F5E9)
    else                                    -> Color(0xFFF3F4F6)
}

private fun statusEmoji(status: RideStatus) = when (status) {
    RideStatus.SEARCHING_DRIVER             -> "🔍"
    RideStatus.DRIVER_ASSIGNED,
    RideStatus.DRIVER_EN_ROUTE              -> "🚗"
    RideStatus.ARRIVED                      -> "📍"
    RideStatus.IN_PROGRESS, RideStatus.RIDE_STARTED -> "🏎️"
    RideStatus.COMPLETED                    -> "✅"
    else                                    -> "⏳"
}

private fun statusTitle(status: RideStatus) = when (status) {
    RideStatus.SEARCHING_DRIVER             -> "Finding your driver..."
    RideStatus.DRIVER_ASSIGNED              -> "Driver Assigned!"
    RideStatus.DRIVER_EN_ROUTE              -> "Driver on the way"
    RideStatus.ARRIVED                      -> "Driver arrived!"
    RideStatus.IN_PROGRESS, RideStatus.RIDE_STARTED -> "Ride in progress"
    RideStatus.COMPLETED                    -> "Ride completed!"
    else                                    -> "Connecting..."
}

private fun statusSubtitle(
    status: RideStatus,
    etaText: String?,
    distanceText: String?,
    pickup: String?,
    destination: String?
) = when (status) {
    RideStatus.SEARCHING_DRIVER ->
        "Sit back while we match you with a nearby driver"

    RideStatus.DRIVER_ASSIGNED,
    RideStatus.DRIVER_EN_ROUTE -> {
        val eta = etaText ?: "~5 min"
        val dist = distanceText ?: "..."
        "Arriving in $eta • $dist away"
    }

    RideStatus.ARRIVED ->
        "Your driver is waiting at the pickup point"

    RideStatus.IN_PROGRESS, RideStatus.RIDE_STARTED ->
        "${pickup ?: "Pickup"} → ${destination ?: "Destination"}"

    RideStatus.COMPLETED ->
        "Thanks for riding with BookMyGaadi 🎉"

    else -> ""
}
