package com.bookmygadi.user.ui.home

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookmygadi.user.UserRideViewModel
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserHomeScreen(
    viewModel: UserRideViewModel = hiltViewModel(),
    onNavigateToSearch: () -> Unit
) {
    val context = LocalContext.current
    val nearbyDrivers by viewModel.nearbyDrivers.collectAsState()
    
    var userLocation by remember { mutableStateOf<LatLng?>(null) }
    var locationPermissionGranted by remember { 
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) 
    }

    val cameraPositionState = rememberCameraPositionState()

    // Fetch initial location using native Android LocationManager (no extra dep required)
    LaunchedEffect(locationPermissionGranted) {
        if (locationPermissionGranted) {
            try {
                val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                @Suppress("MissingPermission")
                val lastKnown = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                lastKnown?.let {
                    val latLng = LatLng(it.latitude, it.longitude)
                    userLocation = latLng
                    cameraPositionState.position = CameraPosition.fromLatLngZoom(latLng, 15f)
                    viewModel.startRadarPolling(it.latitude, it.longitude, 10.0)
                }
            } catch (e: SecurityException) {
                // Permission revoked at runtime
            }
        }
    }
    
    DisposableEffect(Unit) {
        onDispose { viewModel.stopRadarPolling() }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0,0,0,0)
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize()) {
            
            // Map Layer
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = false,
                    myLocationButtonEnabled = false,
                    compassEnabled = true
                ),
                properties = MapProperties(
                    isMyLocationEnabled = locationPermissionGranted,
                    mapType = MapType.NORMAL
                )
            ) {
                userLocation?.let { loc ->
                    // Draw 10KM Radius Circle
                    Circle(
                        center = loc,
                        radius = 10000.0, // 10 KM
                        fillColor = Color(0x1A10B981), // Much softer transparency
                        strokeColor = Color(0x6610B981),
                        strokeWidth = 3f
                    )
                }

                nearbyDrivers.forEach { driver ->
                    Marker(
                        state = MarkerState(position = LatLng(driver.lat, driver.lng)),
                        title = "${driver.vehicle_type} nearby",
                        icon = BitmapDescriptorFactory.defaultMarker(
                            when(driver.vehicle_type.lowercase()) {
                                "auto" -> BitmapDescriptorFactory.HUE_GREEN
                                "bike" -> BitmapDescriptorFactory.HUE_ORANGE
                                else -> BitmapDescriptorFactory.HUE_YELLOW
                            }
                        ),
                        rotation = driver.heading?.toFloat() ?: 0f
                    )
                }
            }

            // Top Menu Overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 40.dp, start = 16.dp, end = 16.dp)
            ) {
                IconButton(
                    onClick = { /* Open Drawer */ },
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.White)
                ) {
                    Icon(imageVector = Icons.Default.Menu, contentDescription = "Menu", tint = Color.Black)
                }
            }

            // Bottom Search Card Overlay
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(24.dp),
                shadowElevation = 12.dp,
                color = Color.White
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Good Evening!", 
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onNavigateToSearch,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF3F4F6)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(
                            "Where to?", 
                            color = Color.Black, 
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }
            }
        }
    }
}
