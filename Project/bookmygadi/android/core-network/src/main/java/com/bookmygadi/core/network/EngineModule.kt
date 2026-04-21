package com.bookmygadi.core.network

import com.bookmygadi.core.domain.RideEngine
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class EngineModule {
    @Binds
    abstract fun bindRideEngine(impl: RideEngineImpl): RideEngine

    @Binds
    abstract fun bindLocalRideCache(impl: SharedPrefsRideCache): LocalRideCache
}
