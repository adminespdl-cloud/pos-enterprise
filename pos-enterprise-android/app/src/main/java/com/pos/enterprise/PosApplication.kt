package com.pos.enterprise

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.*
import com.pos.enterprise.core.data.sync.SyncWorker
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class PosApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()

        // Jadwalkan periodic sync saat aplikasi start
        SyncWorker.schedulePeriodicSync(this)
    }
}
