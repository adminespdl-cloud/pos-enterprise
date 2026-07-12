package com.pos.enterprise.core.data.local

import android.content.Context
import androidx.room.*
import com.pos.enterprise.core.data.local.dao.*
import com.pos.enterprise.core.data.local.entity.*
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SupportFactory

@Database(
    entities = [
        ProductEntity::class,
        ProductVariantEntity::class,
        CategoryEntity::class,
        InventoryStockEntity::class,
        MemberEntity::class,
        ShiftEntity::class,
        TransactionEntity::class,
        TransactionItemEntity::class,
        PaymentEntity::class,
        SyncQueueEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class PosDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun productVariantDao(): ProductVariantDao
    abstract fun categoryDao(): CategoryDao
    abstract fun inventoryStockDao(): InventoryStockDao
    abstract fun memberDao(): MemberDao
    abstract fun shiftDao(): ShiftDao
    abstract fun transactionDao(): TransactionDao
    abstract fun syncQueueDao(): SyncQueueDao

    companion object {
        const val DB_NAME = "pos_enterprise.db"

        /**
         * Membuat instance Room database dengan SQLCipher encryption.
         * Passphrase diambil dari EncryptedSharedPreferences / Android Keystore.
         */
        fun create(context: Context, passphrase: ByteArray): PosDatabase {
            val factory = SupportFactory(passphrase)

            return Room.databaseBuilder(
                context.applicationContext,
                PosDatabase::class.java,
                DB_NAME
            )
                .openHelperFactory(factory)
                .fallbackToDestructiveMigration() // dev only — ganti dengan Migrations di production
                .build()
        }
    }
}
