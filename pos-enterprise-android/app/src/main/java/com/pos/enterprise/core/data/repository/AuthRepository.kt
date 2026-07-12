package com.pos.enterprise.core.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import com.pos.enterprise.core.data.remote.api.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authApiService: AuthApiService,
) {
    suspend fun login(email: String, password: String): Result<LoginResponseData> {
        return try {
            val deviceId = context.dataStore.data.map { it[DEVICE_ID_KEY] }.first()
                ?: android.provider.Settings.Secure.getString(
                    context.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                )

            val request = LoginRequest(email, password, deviceId)
            val response = authApiService.login(request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.status == "success" && body.data != null) {
                    val data = body.data
                    // Save token and outlet ID
                    context.dataStore.edit { prefs ->
                        prefs[TOKEN_KEY] = data.token
                        prefs[OUTLET_ID_KEY] = data.outlet.id
                    }
                    Result.success(data)
                } else {
                    Result.failure(Exception(body?.message ?: "Login gagal"))
                }
            } else {
                Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            authApiService.logout()
            context.dataStore.edit { prefs ->
                prefs.remove(TOKEN_KEY)
                prefs.remove(OUTLET_ID_KEY)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun isLoggedIn(): Boolean {
        val token = context.dataStore.data.map { it[TOKEN_KEY] }.first()
        return !token.isNullOrBlank()
    }
}
