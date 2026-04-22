plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.bookmygadi.rider"
    compileSdk = 34

    val props = com.android.build.gradle.internal.cxx.configure.gradleLocalProperties(rootDir, providers)
    val serverIp = props.getProperty("SERVER_IP", "10.0.2.2")
    val backendPort = props.getProperty("BACKEND_PORT", "8000")
    val frontendPort = props.getProperty("FRONTEND_PORT", "5173")
    val devApiOrigin = props.getProperty("DEV_API_ORIGIN", "http://$serverIp:$backendPort")
    val devWsOrigin = props.getProperty("DEV_WS_ORIGIN", "ws://$serverIp:$backendPort")
    val devWebOrigin = props.getProperty("DEV_WEB_ORIGIN", "http://$serverIp:$frontendPort")
    val prodApiOrigin = props.getProperty("PROD_API_ORIGIN", "https://api.bookmygadi.app")
    val prodWebOrigin = props.getProperty("PROD_WEB_ORIGIN", "https://bookmygadi.app")

    defaultConfig {
        applicationId = "com.bookmygadi.rider"
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

    // Hilt DI
    implementation("com.google.dagger:hilt-android:2.57.1")
    kapt("com.google.dagger:hilt-android-compiler:2.57.1")

    // Project Modules
    implementation(project(":core-network"))
    implementation(project(":core-domain"))

    // Location Services
    implementation("com.google.android.gms:play-services-location:21.2.0")

    // Push notifications
    implementation("com.google.firebase:firebase-messaging:23.4.0")
}

kapt {
    correctErrorTypes = true
}
