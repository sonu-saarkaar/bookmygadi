package com.bookmygadi.user

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.bookmygadi.user.ui.auth.LoginScreen
import com.bookmygadi.user.ui.booking.BookRideScreen
import com.bookmygadi.user.ui.home.UserHomeScreen
import com.bookmygadi.user.ui.profile.ProfileScreen
import com.bookmygadi.user.ui.tracking.DriverTrackingScreen

sealed class Route(val path: String) {
    object Login : Route("login")
    object Home : Route("home")
    object BookRide : Route("book_ride")
    object PriceNegotiation : Route("price_negotiation")
    object Tracking : Route("tracking")
    object Profile : Route("profile")
}

@Composable
fun UserNavGraph(
    startDestination: String = Route.Home.path,
    deeplinkScreen: String? = null,
    deeplinkRideId: String? = null,
) {
    val navController = rememberNavController()

    // Auto-login: if already authenticated, jump to home
    val authViewModel: AuthViewModel = hiltViewModel()
    val rideViewModel: UserRideViewModel = hiltViewModel()
    val rideState by rideViewModel.uiState.collectAsState()

    // Handle initial navigation based on login status
    LaunchedEffect(Unit) {
        if (!authViewModel.isLoggedIn()) {
            navController.navigate(Route.Login.path) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    LaunchedEffect(rideState.isActive) {
        if (rideState.isActive && navController.currentDestination?.route != Route.Tracking.path) {
            navController.navigate(Route.Tracking.path) {
                launchSingleTop = true
            }
        }
    }

    LaunchedEffect(deeplinkScreen, deeplinkRideId) {
        val target = when ((deeplinkScreen ?: "").lowercase()) {
            "tracking", "ride_details" -> Route.Tracking.path
            "price_negotiation", "negotiation" -> Route.PriceNegotiation.path
            "home" -> Route.Home.path
            else -> null
        }
        if (target != null) {
            navController.navigate(target) {
                launchSingleTop = true
            }
        }
    }

    NavHost(navController = navController, startDestination = startDestination) {
        
        composable(Route.Login.path) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Route.Home.path) {
                        popUpTo(Route.Login.path) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Home.path) {
            WebAppScreen(
                url = "${com.bookmygadi.user.BuildConfig.WEB_BASE_URL}/app/home"
            )
        }

        composable(Route.PriceNegotiation.path) {
            WebAppScreen(
                url = "${com.bookmygadi.user.BuildConfig.WEB_BASE_URL}/app/price_negotiation"
            )
        }

        composable(Route.BookRide.path) {
            val rideViewModel: UserRideViewModel = hiltViewModel()
            BookRideScreen(
                onBack = { navController.popBackStack() },
                onConfirmBooking = { pickup, destination, vehicleType, fare ->
                    rideViewModel.requestRide(pickup, destination, vehicleType, fare)
                    navController.navigate(Route.Tracking.path)
                }
            )
        }

        composable(Route.Tracking.path) {
            DriverTrackingScreen(
                onCancelRide = {
                    navController.navigate(Route.Home.path) {
                        popUpTo(Route.Home.path) { inclusive = false }
                    }
                },
                onRideCompleted = {
                    navController.navigate(Route.Home.path) {
                        popUpTo(Route.Home.path) { inclusive = false }
                    }
                }
            )
        }

        composable(Route.Profile.path) {
            ProfileScreen(
                onLogout = {
                    navController.navigate(Route.Login.path) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
