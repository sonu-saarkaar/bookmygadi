package com.bookmygadi.user.ui.booking

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class VehicleOption(
    val type: String,
    val emoji: String,
    val tagline: String,
    val priceMultiplier: Double,
    val seatsLabel: String
)

val vehicleOptions = listOf(
    VehicleOption("Auto Rickshaw", "🛺", "Affordable & Quick", 1.0, "3 seats"),
    VehicleOption("Car", "🚗", "Comfortable Ride", 1.8, "4 seats"),
    VehicleOption("Bike", "🏍️", "Beat the Traffic", 0.6, "1 seat"),
    VehicleOption("Mini Truck", "🚐", "Cargo & Luggage", 2.5, "Heavy load")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookRideScreen(
    onBack: () -> Unit,
    onConfirmBooking: (pickup: String, destination: String, vehicleType: String, fare: Double) -> Unit
) {
    var pickup by remember { mutableStateOf("") }
    var destination by remember { mutableStateOf("") }
    var selectedVehicle by remember { mutableStateOf(vehicleOptions[0]) }
    var offerFare by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current
    val destFocus = remember { FocusRequester() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FA))
    ) {
        // Top Bar
        Surface(shadowElevation = 4.dp, color = Color.White) {
            Column(modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.Black)
                    }
                    Spacer(Modifier.width(8.dp))
                    Text("Book a Ride", fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color.Black)
                }
                Spacer(Modifier.height(16.dp))

                // Pickup
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFF3F4F6),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = pickup,
                        onValueChange = { pickup = it },
                        placeholder = { Text("📍 Pickup Location", color = Color.Gray) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { destFocus.requestFocus() }),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF10B981),
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(Modifier.height(8.dp))

                // Destination
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFF3F4F6),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = destination,
                        onValueChange = { destination = it },
                        placeholder = { Text("🏁 Destination", color = Color.Gray) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF10B981),
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black
                        ),
                        modifier = Modifier.fillMaxWidth().focusRequester(destFocus)
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text("Choose Vehicle", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.Black)
            Spacer(Modifier.height(12.dp))

            // Vehicle Selector Cards
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(vehicleOptions) { vehicle ->
                    val isSelected = vehicle == selectedVehicle
                    Surface(
                        onClick = { selectedVehicle = vehicle },
                        shape = RoundedCornerShape(18.dp),
                        border = if (isSelected) BorderStroke(2.dp, Color(0xFF10B981)) else BorderStroke(1.dp, Color(0xFFE5E7EB)),
                        color = if (isSelected) Color(0xFFEAFBF4) else Color.White,
                        shadowElevation = if (isSelected) 4.dp else 1.dp,
                        modifier = Modifier.width(130.dp).animateContentSize()
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text(vehicle.emoji, fontSize = 36.sp)
                            Spacer(Modifier.height(8.dp))
                            Text(vehicle.type, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = if (isSelected) Color(0xFF047857) else Color.Black)
                            Text(vehicle.seatsLabel, color = Color.Gray, fontSize = 11.sp)
                            Spacer(Modifier.height(6.dp))
                            Text(vehicle.tagline, color = Color(0xFF6B7280), fontSize = 10.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Fare Negotiation
            Text("Your Offer Fare", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.Black)
            Spacer(Modifier.height(4.dp))
            Text("Drivers will counter or accept your offer", color = Color.Gray, fontSize = 12.sp)
            Spacer(Modifier.height(12.dp))

            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color.White,
                shadowElevation = 2.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("₹", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color(0xFF10B981))
                    Spacer(Modifier.width(8.dp))
                    OutlinedTextField(
                        value = offerFare,
                        onValueChange = { offerFare = it.filter { c -> c.isDigit() } },
                        placeholder = { Text("Enter your offer...", color = Color.Gray) },
                        keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black
                        ),
                        textStyle = LocalTextStyle.current.copy(fontWeight = FontWeight.Bold, fontSize = 22.sp),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Suggested fares
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(50, 100, 150, 200).forEach { suggested ->
                    FilterChip(
                        selected = offerFare == suggested.toString(),
                        onClick = { offerFare = suggested.toString() },
                        label = { Text("₹$suggested", fontWeight = FontWeight.Bold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF111827),
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(Modifier.height(80.dp))
        }

        // Book Button
        Surface(shadowElevation = 8.dp, color = Color.White) {
            Box(modifier = Modifier.navigationBarsPadding().padding(16.dp)) {
                Button(
                    onClick = {
                        if (pickup.isNotBlank() && destination.isNotBlank()) {
                            onConfirmBooking(
                                pickup,
                                destination,
                                selectedVehicle.type,
                                offerFare.toDoubleOrNull() ?: 100.0
                            )
                        }
                    },
                    enabled = pickup.isNotBlank() && destination.isNotBlank() && offerFare.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(58.dp),
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF111827))
                ) {
                    Text("Find Drivers →", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
                }
            }
        }
    }
}
