package com.bookmygadi.user

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.ComponentActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import dagger.hilt.android.AndroidEntryPoint
import com.bookmygadi.core.ui.BookMyGadiTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_BookMyGadi)
        super.onCreate(savedInstanceState)
        
        val USER_APP_URL = "${BuildConfig.WEB_BASE_URL}/app/home"

        setContent {
            BookMyGadiTheme {
                var loadError by remember { mutableStateOf<String?>(null) }
                var reloadNonce by remember { mutableStateOf(0) }
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        WebAppScreen(
                            url = USER_APP_URL,
                            onMainFrameLoadError = { error -> loadError = error ?: "Unable to load app" },
                            reloadKey = reloadNonce,
                        )

                        if (loadError != null) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.White)
                                    .padding(24.dp),
                                verticalArrangement = Arrangement.Center,
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(
                                    text = "User app failed to load",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = Color.Black,
                                )
                                Text(
                                    text = loadError ?: "",
                                    modifier = Modifier.padding(top = 8.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.Gray,
                                )
                                Text(
                                    text = USER_APP_URL,
                                    modifier = Modifier.padding(top = 8.dp),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray,
                                )
                                Text(
                                    text = "Tap to retry",
                                    modifier = Modifier
                                        .padding(top = 20.dp)
                                        .clickable {
                                            loadError = null
                                            reloadNonce += 1
                                        },
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
