package com.pos.enterprise.core.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.pos.enterprise.core.data.local.dao.SyncQueueDao
import com.pos.enterprise.core.data.remote.api.SyncApiService
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.util.concurrent.TimeUnit
import kotlin.math.min
import kotlin.math.pow

/**
 * SyncWorker — WorkManager Worker untuk offline sync.
 *
 * Dijalankan saat:
 *  1. Koneksi internet tersedia kembali
 *  2. Setiap 15 menit (periodic)
 *  3. Setelah transaksi dibuat (immediate one-time)
 *
 * State machine:
 *  pending → in_progress → synced (sukses)
 *                        → pending (retry, belum max_retries)
 *                        → failed (sudah max_retries)
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncQueueDao: SyncQueueDao,
    private val syncApiService: SyncApiService,
    private val json: Json,
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val WORK_NAME_PERIODIC = "pos_sync_periodic"
        const val WORK_NAME_IMMEDIATE = "pos_sync_immediate"
        const val BATCH_SIZE = 50

        // Exponential backoff delays (menit): 1, 2, 4, 8, 16
        fun backoffDelay(retryCount: Int): Long {
            val baseMinutes = 1L
            return baseMinutes * (2.0.pow(retryCount.toDouble())).toLong().let { min(it, 60L) }
        }

        /**
         * Daftarkan periodic sync (setiap 15 menit)
         */
        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val work = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME_PERIODIC,
                ExistingPeriodicWorkPolicy.KEEP,  // Tidak replace jika sudah ada
                work
            )
        }

        /**
         * Trigger immediate sync (setelah transaksi offline dibuat)
         */
        fun triggerImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val work = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME_IMMEDIATE,
                ExistingWorkPolicy.KEEP,  // Tidak duplikat jika sudah antri
                work
            )
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val pendingItems = syncQueueDao.getPendingBatch(
                now = System.currentTimeMillis(),
                batchSize = BATCH_SIZE,
            )

            if (pendingItems.isEmpty()) return@withContext Result.success()

            // Tandai sebagai in_progress
            syncQueueDao.markInProgress(pendingItems.map { it.uuid })

            // Format payload untuk API
            val pushItems = pendingItems.map { item ->
                mapOf(
                    "uuid"              to item.uuid,
                    "entity"            to item.entityType,
                    "payload"           to json.parseToJsonElement(item.payload),
                    "client_created_at" to item.clientCreatedAt,
                )
            }

            // Kirim ke server
            val response = syncApiService.push(mapOf("items" to pushItems))

            if (response.isSuccessful) {
                val body = response.body() ?: return@withContext Result.retry()
                val results = body["data"]?.let {
                    @Suppress("UNCHECKED_CAST")
                    it as? List<Map<String, Any>>
                } ?: emptyList()

                // Proses hasil per item
                for (result in results) {
                    val uuid   = result["uuid"] as? String ?: continue
                    val status = result["status"] as? String ?: "failed"

                    if (status == "success") {
                        syncQueueDao.markSynced(uuid)
                    } else {
                        val retryCount = pendingItems.find { it.uuid == uuid }?.retryCount ?: 0
                        val nextRetry = System.currentTimeMillis() +
                                TimeUnit.MINUTES.toMillis(backoffDelay(retryCount))
                        syncQueueDao.markFailed(
                            uuid      = uuid,
                            error     = result["message"] as? String ?: "Unknown error",
                            nextRetry = nextRetry,
                        )
                    }
                }

                // Bersihkan item lama yang sudah synced (> 7 hari)
                syncQueueDao.cleanSynced(
                    cutoff = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(7)
                )

                Result.success()
            } else {
                // HTTP error — retry semua item
                val retryCount = pendingItems.firstOrNull()?.retryCount ?: 0
                val nextRetry  = System.currentTimeMillis() +
                        TimeUnit.MINUTES.toMillis(backoffDelay(retryCount))

                for (item in pendingItems) {
                    syncQueueDao.markFailed(
                        uuid      = item.uuid,
                        error     = "HTTP ${response.code()}: ${response.message()}",
                        nextRetry = nextRetry,
                    )
                }
                Result.retry()
            }

        } catch (e: Exception) {
            // Network error — WorkManager akan retry dengan backoff
            e.printStackTrace()
            Result.retry()
        }
    }
}
