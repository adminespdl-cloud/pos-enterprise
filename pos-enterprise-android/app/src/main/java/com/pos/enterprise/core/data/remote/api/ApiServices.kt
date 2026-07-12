package com.pos.enterprise.core.data.remote.api

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.*

// ── Shared Models ──────────────────────────────────────────────────
@Serializable
data class ApiResponse<T>(
    val status: String,
    val message: String,
    val data: T? = null
)

// ── Auth API ───────────────────────────────────────────────────────
@Serializable data class LoginRequest(val email: String, val password: String, val device_id: String)
@Serializable data class LoginResponseData(val token: String, val user: UserDto, val outlet: OutletDto)
@Serializable data class UserDto(val id: String, val name: String, val role: String)
@Serializable data class OutletDto(val id: String, val name: String, val company_id: String)

interface AuthApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginResponseData>>

    @POST("auth/logout")
    suspend fun logout(): Response<ApiResponse<Unit>>
}

// ── Sync API ───────────────────────────────────────────────────────
interface SyncApiService {
    @POST("sync/push")
    suspend fun push(@Body payload: Map<String, @JvmSuppressWildcards Any?>): Response<Map<String, @JvmSuppressWildcards Any?>>

    @GET("sync/pull")
    suspend fun pull(@Query("last_sync_at") lastSyncAt: Long): Response<Map<String, @JvmSuppressWildcards Any?>>
}

// ── Transaction API ────────────────────────────────────────────────
interface TransactionApiService {
    @GET("transactions")
    suspend fun getTransactions(): Response<ApiResponse<List<Map<String, @JvmSuppressWildcards Any?>>>>
}

// ── Shift API ──────────────────────────────────────────────────────
interface ShiftApiService {
    @POST("shifts/open")
    suspend fun openShift(@Body payload: Map<String, @JvmSuppressWildcards Any?>): Response<ApiResponse<Map<String, @JvmSuppressWildcards Any?>>>

    @POST("shifts/close")
    suspend fun closeShift(@Body payload: Map<String, @JvmSuppressWildcards Any?>): Response<ApiResponse<Map<String, @JvmSuppressWildcards Any?>>>
}

// ── Product API ────────────────────────────────────────────────────
interface ProductApiService {
    @GET("products")
    suspend fun getProducts(): Response<ApiResponse<List<Map<String, @JvmSuppressWildcards Any?>>>>
}

// ── Member API ─────────────────────────────────────────────────────
interface MemberApiService {
    @GET("members")
    suspend fun getMembers(): Response<ApiResponse<List<Map<String, @JvmSuppressWildcards Any?>>>>
}
