package com.bookmygadi.user.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.bookmygadi.user.AuthState
import com.bookmygadi.user.AuthViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onRegisterClick: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) onLoginSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9FAFB))
    ) {
        Box(
            modifier = Modifier
                .offset(x = (-80).dp, y = (-40).dp)
                .size(240.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0x4D6EE7B7), Color.Transparent)
                    ),
                    shape = RoundedCornerShape(999.dp)
                )
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .offset(x = 100.dp, y = 80.dp)
                .size(260.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0x4D93C5FD), Color.Transparent)
                    ),
                    shape = RoundedCornerShape(999.dp)
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(56.dp))

            Box(
                modifier = Modifier
                    .size(68.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.linearGradient(listOf(Color(0xFF34D399), Color(0xFF10B981)))),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.DirectionsCar,
                    contentDescription = "BookMyGadi",
                    tint = Color.White,
                    modifier = Modifier.size(34.dp)
                )
            }
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = "Welcome Back",
                fontWeight = FontWeight.Black,
                fontSize = 30.sp,
                color = Color(0xFF111827)
            )
            Text(
                text = "Log in to continue your ride",
                color = Color(0xFF6B7280),
                fontSize = 14.sp
            )

            Spacer(modifier = Modifier.height(36.dp))

            Surface(
                shape = RoundedCornerShape(28.dp),
                color = Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email") },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF6B7280)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFFF9FAFB),
                            unfocusedContainerColor = Color(0xFFF9FAFB),
                            focusedBorderColor = Color(0xFF34D399),
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color(0xFF111827),
                            unfocusedTextColor = Color(0xFF111827),
                            cursorColor = Color(0xFF10B981)
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            TextButton(onClick = { passwordVisible = !passwordVisible }) {
                                Text(
                                    if (passwordVisible) "HIDE" else "SHOW",
                                    color = Color(0xFF059669),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFFF9FAFB),
                            unfocusedContainerColor = Color(0xFFF9FAFB),
                            focusedBorderColor = Color(0xFF34D399),
                            unfocusedBorderColor = Color.Transparent,
                            focusedTextColor = Color(0xFF111827),
                            unfocusedTextColor = Color(0xFF111827),
                            cursorColor = Color(0xFF10B981)
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    val isLoading = authState is AuthState.Loading
                    Button(
                        onClick = { viewModel.login(email.trim(), password) },
                        enabled = !isLoading && email.isNotBlank() && password.isNotBlank(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF111827),
                            disabledContainerColor = Color(0x99111827)
                        )
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = Color.White,
                                strokeWidth = 2.5.dp
                            )
                        } else {
                            Text("Sign In", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        }
                    }
                }
            }

            if (authState is AuthState.Error) {
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = (authState as? AuthState.Error)?.message ?: "",
                    color = Color(0xFFFF6B6B),
                    fontSize = 13.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Don't have an account? ",
                    color = Color(0xFF6B7280),
                    fontSize = 14.sp
                )
                TextButton(onClick = onRegisterClick) {
                    Text(
                        "Create account",
                        color = Color(0xFF059669),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Text(
                "By continuing, you agree to our Terms & Privacy Policy",
                color = Color(0xFF9CA3AF),
                fontSize = 11.sp,
                modifier = Modifier.padding(bottom = 24.dp)
            )
        }
    }
}
