plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.bookmygadi.user"
    compileSdk = 34

    val props = com.android.build.gradle.internal.cxx.configure.gradleLocalProperties(rootDir, providers)
    val serverIp = props.getProperty("SERVER_IP", "10.0.2.2")
    val backendPort = props.getProperty("BACKEND_PORT", "8000")
    val frontendPort = props.getProperty("FRONTEND_PORT", "5173")
    val prodApiOrigin = props.getProperty("PROD_API_ORIGIN", "https://api.bookmygadi.app")
    val prodWebOrigin = props.getProperty("PROD_WEB_ORIGIN", "https://bookmygadi.app")
    val devApiOrigin = props.getProperty("DEV_API_ORIGIN", prodApiOrigin)
    val devWsOrigin = props.getProperty(
        "DEV_WS_ORIGIN",
        prodApiOrigin.replace("https://", "wss://").replace("http://", "ws://"),
    )
    val devWebOrigin = props.getProperty("DEV_WEB_ORIGIN", prodWebOrigin)

    defaultConfig {
        applicationId = "com.bookmygadi.user"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "SERVER_IP", "\"$serverIp\"")
    }
    
    buildTypes {
        getByName("debug") {
            buildConfigField("String", "BASE_URL", "\"$devApiOrigin\"")
            buildConfigField("String", "API_BASE_URL", "\"$devApiOrigin/api/v1\"")
            buildConfigField("String", "WS_BASE_URL", "\"$devWsOrigin\"")
            buildConfigField("String", "WEB_BASE_URL", "\"$devWebOrigin\"")
        }
        getByName("release") {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "BASE_URL", "\"$prodApiOrigin\"")
            buildConfigField("String", "API_BASE_URL", "\"$prodApiOrigin/api/v1\"")
            buildConfigField("String", "WS_BASE_URL", "\"${prodApiOrigin.replace("https://", "wss://").replace("http://", "ws://")}\"")
            buildConfigField("String", "WEB_BASE_URL", "\"$prodWebOrigin\"")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.activity:activity-ktx:1.8.0")
    implementation("androidx.activity:activity-compose:1.8.0")

    // Compose
    implementation(platform("androidx.compose:compose-bom:2023.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.4")

    // Hilt DI
    implementation("com.google.dagger:hilt-android:2.57.1")
    kapt("com.google.dagger:hilt-android-compiler:2.57.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")

    // Maps and Google Play Services
    implementation("com.google.android.gms:play-services-maps:18.2.0")
    implementation("com.google.android.gms:play-services-location:21.2.0")
    implementation("com.google.maps.android:maps-compose:4.3.3")
    implementation("com.google.maps.android:maps-compose-utils:4.3.3")
    implementation("com.google.maps.android:maps-compose-widgets:4.3.3")

    // Firebase Messaging (required by BMGFirebaseMessagingService)
    implementation("com.google.firebase:firebase-messaging:23.4.0")

    implementation(project(":core-network"))
    implementation(project(":core-domain"))
    implementation(project(":core-ui"))

    // Razorpay
    implementation("com.razorpay:checkout:1.6.38")
    
    // Coil for image loading
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Icons
    implementation("androidx.compose.material:material-icons-extended")
    
    // Explicitly update Material 3 for Modern Divider components (HorizontalDivider/VerticalDivider)
    implementation("androidx.compose.material3:material3:1.2.0")
}

kapt {
    correctErrorTypes = true
}
