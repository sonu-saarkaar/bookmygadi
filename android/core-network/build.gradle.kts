plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.bookmygadi.core.network"
    compileSdk = 34

    val props = com.android.build.gradle.internal.cxx.configure.gradleLocalProperties(rootDir, providers)
    val serverIp = props.getProperty("SERVER_IP", "10.0.2.2")
    val backendPort = props.getProperty("BACKEND_PORT", "8000")
    val devApiOrigin = props.getProperty("DEV_API_ORIGIN", "http://$serverIp:$backendPort")
    val devWsOrigin = props.getProperty("DEV_WS_ORIGIN", "ws://$serverIp:$backendPort")
    val prodApiOrigin = props.getProperty("PROD_API_ORIGIN", "https://api.bookmygadi.app")
    val prodWsOrigin = prodApiOrigin.replace("https://", "wss://").replace("http://", "ws://")

    defaultConfig {
        minSdk = 24
        buildConfigField("String", "SERVER_IP", "\"$serverIp\"")
    }
    
    buildTypes {
        getByName("debug") {
            buildConfigField("String", "BASE_URL", "\"$devApiOrigin\"")
            buildConfigField("String", "API_BASE_URL", "\"$devApiOrigin/api/v1/\"")
            buildConfigField("String", "WS_BASE_URL", "\"$devWsOrigin\"")
        }
        getByName("release") {
            buildConfigField("String", "BASE_URL", "\"$prodApiOrigin\"")
            buildConfigField("String", "API_BASE_URL", "\"$prodApiOrigin/api/v1/\"")
            buildConfigField("String", "WS_BASE_URL", "\"$prodWsOrigin\"")
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
    implementation("com.google.dagger:hilt-android:2.57.1")
    kapt("com.google.dagger:hilt-android-compiler:2.57.1")
    
    // Retrofit & Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")

    // Domain module
    implementation(project(":core-domain"))
}
