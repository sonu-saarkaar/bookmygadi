package com.bookmygadi.user

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onLoginSuccess()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(text = "BookMyGadi", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Phone Number") },
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = otp,
            onValueChange = { otp = it },
            label = { Text("OTP (Password)") },
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = { viewModel.login(phone, otp) },
            modifier = Modifier.fillMaxWidth(),
            enabled = authState !is AuthState.Loading && phone.isNotBlank() && otp.isNotBlank()
        ) {
            if (authState is AuthState.Loading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Verify & Login")
            }
        }
        
        if (authState is AuthState.Error) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(text = (authState as AuthState.Error).message, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
fun HomeScreen(
    onBookRideClick: () -> Unit,
    onProfileClick: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(text = "Home Dashboard", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(onClick = onBookRideClick, modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp)) {
            Text("Book a Ride")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedButton(onClick = onProfileClick, modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp)) {
            Text("My Profile")
        }
    }
}
