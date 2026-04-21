package com.bookmygadi.core.network

import com.bookmygadi.core.domain.AuthRepository
import com.bookmygadi.core.domain.RideRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    abstract fun bindRideRepository(impl: RideRepositoryImpl): RideRepository
}
