plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.bookmygadi.rider"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.bookmygadi.rider"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        val props = com.android.build.gradle.internal.cxx.configure.gradleLocalProperties(rootDir, providers)
        val serverIp      = props.getProperty("SERVER_IP",      "10.0.2.2")

        buildConfigField("String", "SERVER_IP",  "\"$serverIp\"")
    }
    
    buildTypes {
        getByName("debug") {
            buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:8000\"")
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8000/api/v1\"")
            buildConfigField("String", "WS_BASE_URL", "\"ws://10.0.2.2:8000\"")
            buildConfigField("String", "WEB_BASE_URL", "\"http://10.0.2.2:5173\"")
        }
        getByName("release") {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "BASE_URL", "\"https://api.bookmygadi.app\"")
            buildConfigField("String", "API_BASE_URL", "\"https://api.bookmygadi.app/api/v1\"")
            buildConfigField("String", "WS_BASE_URL", "\"wss://api.bookmygadi.app\"")
            buildConfigField("String", "WEB_BASE_URL", "\"https://bookmygadi.app\"")
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
