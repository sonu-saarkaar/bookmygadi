package com.bookmygadi.user.ui.profile

import android.content.Context
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookmygadi.user.AuthViewModel

data class ProfileMenuItem(
    val icon: ImageVector,
    val title: String,
    val subtitle: String,
    val onClick: () -> Unit
)

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8F9FA))
            .verticalScroll(scrollState)
    ) {
        // Profile Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color(0xFF0F0C29), Color(0xFF302B63))))
                .statusBarsPadding()
                .padding(top = 20.dp, bottom = 40.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF4F46E5)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("👤", fontSize = 44.sp)
                }
                Spacer(Modifier.height(14.dp))
                Text("BookMyGadi User", fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color.White)
                Text("user@bookmygadi.com", color = Color(0xFFAAAAAA), fontSize = 13.sp)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    StatChip("12", "Rides")
                    StatChip("4.9★", "Rating")
                    StatChip("₹2.4K", "Spent")
                }
            }
        }

        // Offset up to overlap card
        Spacer(Modifier.height((-20).dp))

        // Stats card
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .offset(y = (-20).dp),
            shape = RoundedCornerShape(20.dp),
            shadowElevation = 8.dp,
            color = Color.White
        ) {
            Row(
                modifier = Modifier.padding(20.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem("🚗", "Rides", "12")
                VerticalDivider(Modifier.height(40.dp))
                StatItem("⭐", "Rating", "4.9")
                VerticalDivider(Modifier.height(40.dp))
                StatItem("💰", "Saved", "₹480")
            }
        }

        Spacer(Modifier.height(8.dp))

        // Menu Sections
        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            shape = RoundedCornerShape(20.dp),
            shadowElevation = 2.dp,
            color = Color.White
        ) {
            Column {
                ProfileMenuTile(Icons.Default.Person, "Edit Profile", "Update your name, phone & email")
                HorizontalDivider(color = Color(0xFFF3F4F6))
                ProfileMenuTile(Icons.Default.Favorite, "Saved Locations", "Home, Office & more")
                HorizontalDivider(color = Color(0xFFF3F4F6))
                ProfileMenuTile(Icons.Default.History, "Ride History", "View all past rides")
                HorizontalDivider(color = Color(0xFFF3F4F6))
                ProfileMenuTile(Icons.Default.Wallet, "Payment Methods", "Cards, UPI, Wallet")
            }
        }

        Spacer(Modifier.height(12.dp))

        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            shape = RoundedCornerShape(20.dp),
            shadowElevation = 2.dp,
            color = Color.White
        ) {
            Column {
                ProfileMenuTile(Icons.Default.Notifications, "Notifications", "Manage ride alerts")
                HorizontalDivider(color = Color(0xFFF3F4F6))
                ProfileMenuTile(Icons.Default.Security, "Privacy & Security", "Account safety settings")
                HorizontalDivider(color = Color(0xFFF3F4F6))
                ProfileMenuTile(Icons.Default.HelpCenter, "Help & Support", "Get assistance anytime")
            }
        }

        Spacer(Modifier.height(16.dp))

        // Logout Button
        Button(
            onClick = {
                viewModel.logout()
                onLogout()
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B6B))
        ) {
            Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White)
            Spacer(Modifier.width(8.dp))
            Text("Sign Out", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
        }

        Spacer(Modifier.height(40.dp))
    }
}

@Composable
private fun StatChip(value: String, label: String) {
    Surface(shape = RoundedCornerShape(12.dp), color = Color(0x22FFFFFF)) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text(value, fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
            Text(label, color = Color(0xFFAAAAAA), fontSize = 11.sp)
        }
    }
}

@Composable
private fun StatItem(emoji: String, label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(emoji, fontSize = 22.sp)
        Spacer(Modifier.height(4.dp))
        Text(value, fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.Black)
        Text(label, color = Color.Gray, fontSize = 11.sp)
    }
}

@Composable
private fun ProfileMenuTile(icon: ImageVector, title: String, subtitle: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFF0EDFF)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = Color(0xFF4F46E5), modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Black)
            Text(subtitle, color = Color.Gray, fontSize = 12.sp)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFFCCCCCC), modifier = Modifier.size(20.dp))
    }
}
