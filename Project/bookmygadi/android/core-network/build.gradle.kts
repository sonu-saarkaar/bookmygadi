plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.bookmygadi.core.network"
    compileSdk = 34
    defaultConfig {
        minSdk = 24

        val props         = com.android.build.gradle.internal.cxx.configure.gradleLocalProperties(rootDir, providers)
        val serverIp      = props.getProperty("SERVER_IP",      "10.0.2.2")
        
        buildConfigField("String", "SERVER_IP",    "\"$serverIp\"")
    }
    
    buildTypes {
        getByName("debug") {
            buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:8000\"")
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8000/api/v1/\"")
            buildConfigField("String", "WS_BASE_URL", "\"ws://10.0.2.2:8000\"")
        }
        getByName("release") {
            buildConfigField("String", "BASE_URL", "\"https://api.bookmygadi.app\"")
            buildConfigField("String", "API_BASE_URL", "\"https://api.bookmygadi.app/api/v1/\"")
            buildConfigField("String", "WS_BASE_URL", "\"wss://api.bookmygadi.app\"")
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
