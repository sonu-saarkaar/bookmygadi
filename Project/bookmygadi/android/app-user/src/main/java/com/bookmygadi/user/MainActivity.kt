package com.bookmygadi.user

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import dagger.hilt.android.AndroidEntryPoint
import com.bookmygadi.core.ui.BookMyGadiTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_BookMyGadi)
        super.onCreate(savedInstanceState)
        
        val USER_APP_URL = BuildConfig.WEB_BASE_URL

        setContent {
            BookMyGadiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WebAppScreen(url = USER_APP_URL)
                }
            }
        }
    }
}
