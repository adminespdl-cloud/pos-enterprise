# POS Enterprise

> **Sistem Point-of-Sale Enterprise** multi-outlet, offline-first, dengan Android POS + Web Admin + Laravel 12 Backend.

## 🏗️ Struktur Proyek

```
pos-enterprise/
├── pos-enterprise-backend/      Laravel 12 + PostgreSQL + Redis
├── pos-enterprise-android/      Kotlin + Jetpack Compose + Room + Hilt
├── pos-enterprise-webadmin/     React 18 + TypeScript + Vite + Recharts
├── .github/workflows/           CI/CD GitHub Actions (3 pipeline)
└── DEPLOYMENT.md                Panduan deploy lengkap
```

## ⚡ Quick Start

### Backend API
```bash
cd pos-enterprise-backend
docker-compose up -d
php artisan migrate --seed
# API: http://localhost:8000/api/v1
```

### Web Admin
```bash
cd pos-enterprise-webadmin
npm install && npm run dev
# Dashboard: http://localhost:3000
# Demo login: superadmin@demo.pos / Demo@123
```

### Android
```
Buka pos-enterprise-android/ di Android Studio
Sync Gradle → Run di emulator tablet landscape (min. 1280×800)
```

## 🧪 Tests

```bash
# Backend (PHPUnit)
cd pos-enterprise-backend && php artisan test --coverage

# Android (JUnit)
cd pos-enterprise-android && ./gradlew test

# Web Admin (Vitest)
cd pos-enterprise-webadmin && npm run test:coverage
```

## 🚀 Deployment

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan lengkap deploy ke:
- **VPS Ubuntu** (production grade + SSL otomatis)
- **Railway** (gratis tier, cocok untuk staging/demo)
- **Render**

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Backend API | Laravel 12, PHP 8.3, PostgreSQL 16, Redis 7, Sanctum |
| Android POS | Kotlin, Jetpack Compose, Hilt, Room, SQLCipher, WorkManager |
| Web Admin | React 18, TypeScript, Vite, Zustand, Recharts, TanStack Table |
| Infrastructure | Docker, Nginx, GitHub Actions, Let's Encrypt |

## 📱 Fitur Utama

- ✅ **Offline-First** — transaksi tetap jalan tanpa internet
- ✅ **Delta Sync** — hanya data berubah yang disinkronkan
- ✅ **Multi-Outlet** — satu backend untuk banyak cabang
- ✅ **Manajemen Member** — tier Bronze/Silver/Gold/Platinum + poin
- ✅ **5 Metode Bayar** — Tunai, QRIS, Transfer, Voucher, Poin
- ✅ **Manajemen Shift** — buka/tutup kasir dengan cash reconciliation
- ✅ **Laporan Analitik** — tren pendapatan, produk terlaris, breakdown pembayaran
- ✅ **Keamanan** — SQLCipher, FLAG_SECURE, JWT, PIN lockout, rate limiting

## 📄 Dokumentasi

| Dokumen | Deskripsi |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Panduan deploy lengkap |
| [pos-enterprise-android/RELEASE.md](./pos-enterprise-android/RELEASE.md) | Release Android ke Play Store |

---
*Built with ❤️ — POS Enterprise v1.0.0*
