package com.bookmygadi.user.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onBackToLogin: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) onRegisterSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9FAFB))
    ) {
        Box(
            modifier = Modifier
                .offset(x = (-80).dp, y = (-30).dp)
                .size(220.dp)
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
                .offset(x = 90.dp, y = 70.dp)
                .size(250.dp)
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
            Spacer(modifier = Modifier.height(28.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                IconButton(onClick = onBackToLogin) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color(0xFF111827))
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Create Account",
                fontWeight = FontWeight.Black,
                fontSize = 30.sp,
                color = Color(0xFF111827)
            )
            Text(
                text = "Join BookMyGadi for a premium experience.",
                color = Color(0xFF6B7280),
                fontSize = 14.sp
            )

            Surface(
                shape = RoundedCornerShape(28.dp),
                color = Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    RegisterField(
                        value = name,
                        onValueChange = { name = it },
                        label = "Full Name",
                        icon = Icons.Default.Person
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    RegisterField(
                        value = email,
                        onValueChange = { email = it },
                        label = "Email Address",
                        icon = Icons.Default.Email,
                        keyboardType = KeyboardType.Email
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    RegisterField(
                        value = phone,
                        onValueChange = { if (it.length <= 10) phone = it else phone = it.take(10) },
                        label = "Mobile Number",
                        icon = Icons.Default.Phone,
                        keyboardType = KeyboardType.Phone
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
                        onClick = { viewModel.register(name, email, phone, password) },
                        enabled = !isLoading && name.length >= 2 && email.contains("@") && phone.length == 10 && password.length >= 4,
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
                            Text("Sign Up", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
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

            TextButton(onClick = onBackToLogin) {
                Text(
                    "Already have an account? Sign in",
                    color = Color(0xFF059669),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun RegisterField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null, tint = Color(0xFF6B7280)) },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
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
}
