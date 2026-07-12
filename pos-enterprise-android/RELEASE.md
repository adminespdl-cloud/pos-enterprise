# Android Release Guide — POS Enterprise

Panduan lengkap untuk membuat signed APK dan submit ke Google Play Store.

---

## 1. Generate Keystore (Sekali Saja)

> ⚠️ **Simpan keystore dengan aman!** Jika hilang, kamu tidak bisa update app di Play Store.

```bash
# Generate keystore baru
keytool -genkey -v \
  -keystore pos-enterprise.jks \
  -alias pos-enterprise-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Isi pertanyaan:
# First/Last name    : Nama Perusahaan
# Org Unit           : IT Department
# Organization       : PT Nama Bisnis
# City               : Jakarta
# State              : DKI Jakarta
# Country code       : ID

# Encode ke Base64 untuk GitHub Secret
base64 -i pos-enterprise.jks | pbcopy  # macOS
base64 pos-enterprise.jks              # Linux → salin output
```

---

## 2. Konfigurasi Signing di Gradle

Tambahkan di [`app/build.gradle.kts`](file:///C:/Users/Fathia/.gemini/antigravity/scratch/pos-enterprise-android/app/build.gradle.kts):

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile     = file(System.getenv("KEYSTORE_PATH") ?: "pos-enterprise.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias      = System.getenv("KEY_ALIAS")         ?: "pos-enterprise-key"
            keyPassword   = System.getenv("KEY_PASSWORD")      ?: ""
        }
    }
    buildTypes {
        release {
            signingConfig   = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
```

---

## 3. ProGuard Rules

Tambahkan ke [`app/proguard-rules.pro`](file:///C:/Users/Fathia/.gemini/antigravity/scratch/pos-enterprise-android/app/proguard-rules.pro):

```proguard
# ── Hilt ─────────────────────────────────────────────
-keep class dagger.hilt.** { *; }
-keep @dagger.hilt.android.HiltAndroidApp class * { *; }

# ── Room ──────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }

# ── Retrofit / OkHttp ─────────────────────────────────
-keep class retrofit2.** { *; }
-keepattributes Signature, Exceptions
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**

# ── SQLCipher ─────────────────────────────────────────
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }

# ── Kotlin Serialization ──────────────────────────────
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

# ── WorkManager ───────────────────────────────────────
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.CoroutineWorker { *; }

# ── App Models (jangan obfuscate nama field untuk JSON) ─
-keep class com.pos.enterprise.core.data.** { *; }
-keep class com.pos.enterprise.core.domain.model.** { *; }
```

---

## 4. Build Release APK Secara Lokal

```bash
cd pos-enterprise-android

# Set environment variables
export KEYSTORE_PATH=/path/to/pos-enterprise.jks
export KEYSTORE_PASSWORD=password_keystore_kamu
export KEY_ALIAS=pos-enterprise-key
export KEY_PASSWORD=password_key_kamu

# Build signed APK
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk

# Build App Bundle (untuk Play Store)
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

---

## 5. Verifikasi APK

```bash
# Cek signature
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk

# Cek konten APK
aapt dump badging app/build/outputs/apk/release/app-release.apk | head -20

# Expected output:
# package: name='com.pos.enterprise' versionCode='1' versionName='1.0.0'
# uses-permission: name='android.permission.INTERNET'
```

---

## 6. Google Play Store Submission Checklist

### Sebelum Submit
- [ ] `versionCode` dinaikkan di `build.gradle.kts`
- [ ] `versionName` diupdate (format: `MAJOR.MINOR.PATCH`)
- [ ] APK/AAB sudah di-sign dengan release keystore
- [ ] App diuji di minimal 2 device fisik tablet landscape
- [ ] Semua crash dari Firebase/Play Console sudah diperbaiki
- [ ] Screenshot tablet landscape sudah disiapkan (min. 1280×800)
- [ ] Deskripsi app (ID + EN) sudah disiapkan

### Play Console Settings
- **App category**: Business / Productivity
- **Content rating**: Everyone (tidak ada konten dewasa)
- **Target SDK**: 34 (Android 14)
- **Minimum SDK**: 26 (Android 8.0) — SQLCipher requirement
- **Distribution**: Tab "Releases" → Internal Testing dulu

### Release Track (direkomendasikan bertahap)
```
Internal Testing (5-10 tester internal)
    ↓ 1-2 minggu
Closed Testing (50-100 pengguna beta)
    ↓ 1-2 minggu
Production (rollout 10% → 50% → 100%)
```

---

## 7. Update App

```bash
# Naikkan versionCode DAN versionName di build.gradle.kts
# versionCode harus SELALU bertambah (tidak bisa turun)
versionCode = 2          # Was 1
versionName = "1.1.0"   # Was "1.0.0"

# Build ulang
./gradlew bundleRelease

# Upload .aab baru ke Play Console
# Play Console → Release → Production → Create New Release
```

---

## 8. Distribusi Internal (Tanpa Play Store)

Untuk distribusi internal (B2B client), gunakan APK langsung:

```bash
# Build APK signed
./gradlew assembleRelease

# Distribusikan via:
# - Email attachment (< 25MB)
# - Firebase App Distribution (lebih mudah, ada versi history)
# - Internal file server / S3

# Client install dengan:
# Settings → Security → Install unknown apps → Allow
```
