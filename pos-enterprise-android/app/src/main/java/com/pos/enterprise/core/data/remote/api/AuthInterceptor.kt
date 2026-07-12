package com.pos.enterprise.core.data.remote.api

import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore by preferencesDataStore(name = "pos_auth")
val TOKEN_KEY = stringPreferencesKey("access_token")
val OUTLET_ID_KEY = stringPreferencesKey("current_outlet_id")
val DEVICE_ID_KEY = stringPreferencesKey("device_id")

/**
 * OkHttp Interceptor — menyuntikkan header auth ke setiap request:
 *  Authorization: Bearer {token}
 *  X-Outlet-ID: {outlet_id}
 *  X-Device-ID: {device_id}
 */
@Singleton
class AuthInterceptor @Inject constructor(
    @ApplicationContext private val context: Context,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token    = runBlocking { context.dataStore.data.map { it[TOKEN_KEY] }.first() }
        val outletId = runBlocking { context.dataStore.data.map { it[OUTLET_ID_KEY] }.first() }
        val deviceId = runBlocking { context.dataStore.data.map { it[DEVICE_ID_KEY] }.first() }
            ?: android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )

        val request = chain.request().newBuilder()
            .apply {
                if (!token.isNullOrBlank()) {
                    addHeader("Authorization", "Bearer $token")
                }
                if (!outletId.isNullOrBlank()) {
                    addHeader("X-Outlet-ID", outletId)
                }
                addHeader("X-Device-ID", deviceId)
                addHeader("Accept", "application/json")
                addHeader("Content-Type", "application/json")
            }
            .build()

        return chain.proceed(request)
    }
}
