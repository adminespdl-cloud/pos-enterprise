package com.pos.enterprise.core.di

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.pos.enterprise.BuildConfig
import com.pos.enterprise.core.data.local.PosDatabase
import com.pos.enterprise.core.data.local.dao.*
import com.pos.enterprise.core.data.remote.api.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    // ── Database ──────────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PosDatabase {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        val prefs = EncryptedSharedPreferences.create(
            context,
            "pos_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )

        // Buat atau load passphrase untuk SQLCipher
        val passphraseKey = BuildConfig.DB_PASSPHRASE_ALIAS
        val passphrase = prefs.getString(passphraseKey, null)
            ?: generatePassphrase().also { prefs.edit().putString(passphraseKey, it).apply() }

        return PosDatabase.create(context, passphrase.toByteArray())
    }

    private fun generatePassphrase(): String {
        val chars = ('A'..'Z') + ('a'..'z') + ('0'..'9')
        return (1..32).map { chars.random() }.joinToString("")
    }

    // ── DAOs ──────────────────────────────────────────────────────
    @Provides fun provideProductDao(db: PosDatabase) = db.productDao()
    @Provides fun provideProductVariantDao(db: PosDatabase) = db.productVariantDao()
    @Provides fun provideCategoryDao(db: PosDatabase) = db.categoryDao()
    @Provides fun provideInventoryStockDao(db: PosDatabase) = db.inventoryStockDao()
    @Provides fun provideMemberDao(db: PosDatabase) = db.memberDao()
    @Provides fun provideShiftDao(db: PosDatabase) = db.shiftDao()
    @Provides fun provideTransactionDao(db: PosDatabase) = db.transactionDao()
    @Provides fun provideSyncQueueDao(db: PosDatabase) = db.syncQueueDao()

    // ── Network ───────────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, json: Json): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

    // ── API Services ──────────────────────────────────────────────
    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApiService =
        retrofit.create(AuthApiService::class.java)

    @Provides
    @Singleton
    fun provideTransactionApi(retrofit: Retrofit): TransactionApiService =
        retrofit.create(TransactionApiService::class.java)

    @Provides
    @Singleton
    fun provideShiftApi(retrofit: Retrofit): ShiftApiService =
        retrofit.create(ShiftApiService::class.java)

    @Provides
    @Singleton
    fun provideSyncApi(retrofit: Retrofit): SyncApiService =
        retrofit.create(SyncApiService::class.java)

    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApiService =
        retrofit.create(ProductApiService::class.java)

    @Provides
    @Singleton
    fun provideMemberApi(retrofit: Retrofit): MemberApiService =
        retrofit.create(MemberApiService::class.java)
}
