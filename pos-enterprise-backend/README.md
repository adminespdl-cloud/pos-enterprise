# POS Enterprise — Backend API

Backend Laravel 12 untuk sistem Point of Sale (POS) Enterprise dengan dukungan **offline-first**, multi-outlet, dan RBAC.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Laravel 12 |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Auth | Laravel Sanctum |
| Container | Docker + Docker Compose |

## Fitur Utama

- ✅ **Offline-first Sync** — Push/Pull delta sync dengan idempotency UUID
- ✅ **RBAC** — Super Admin, Admin, Manager, Kasir
- ✅ **Outlet Scoping** — User hanya bisa akses data outlet miliknya
- ✅ **PIN Kasir** — Login cepat dengan PIN 6 digit + rate limiting
- ✅ **Void Transaksi** — Dengan verifikasi PIN Manajer
- ✅ **Poin & Member** — Tier otomatis (Bronze/Silver/Gold/Platinum)
- ✅ **Laporan** — Sales per periode, produk terlaris, dashboard KPI
- ✅ **Audit Log** — Semua aksi tercatat
- ✅ **Security Headers** — HSTS, X-Frame-Options, dll.

## Struktur Direktori

```
pos-enterprise-backend/
├── app/
│   ├── Enums/              # PHP 8.1+ Enums (UserRole, TransactionStatus, dll.)
│   ├── Http/
│   │   ├── Controllers/Api/V1/   # Controllers per domain
│   │   ├── Middleware/           # OutletScope, SecurityHeaders
│   │   └── Requests/             # Form Requests validasi
│   ├── Models/             # Eloquent Models (17 model)
│   └── Traits/             # HasUuid
├── database/
│   ├── migrations/         # 1 file migrasi berisi semua 19 tabel
│   └── seeders/            # DatabaseSeeder dengan data demo
├── routes/
│   └── api.php             # 30+ endpoint API v1
├── docker-compose.yml
└── .env.example
```

## Setup Lokal

### Prasyarat
- PHP 8.3+, Composer, PostgreSQL 16, Redis 7
- **Atau**: Docker Desktop

### Dengan Docker

```bash
# Clone & masuk direktori
cd pos-enterprise-backend

# Copy .env
copy .env.example .env

# Jalankan semua service
docker-compose up -d

# Install dependencies
docker exec pos_enterprise_backend composer install

# Generate key
docker exec pos_enterprise_backend php artisan key:generate

# Migrate + Seed
docker exec pos_enterprise_backend php artisan migrate --seed
```

### Tanpa Docker (PHP + PostgreSQL lokal)

```bash
# Install dependencies
composer install

# Copy & edit .env
copy .env.example .env
# Edit DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD

# Generate key
php artisan key:generate

# Migrate
php artisan migrate --seed

# Jalankan server
php artisan serve
```

## Endpoint Utama

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/v1/auth/login` | Login email (Admin/Manager) |
| POST | `/api/v1/auth/login-pin` | Login PIN (Kasir) |
| GET | `/api/v1/sync/pull` | Pull data master |
| POST | `/api/v1/sync/push` | Push transaksi offline |
| POST | `/api/v1/shifts/open` | Buka shift |
| POST | `/api/v1/shifts/{id}/close` | Tutup shift |
| POST | `/api/v1/transactions` | Buat transaksi |
| POST | `/api/v1/transactions/{id}/void` | Void transaksi |
| GET | `/api/v1/products` | List produk + stok |
| GET | `/api/v1/members/search` | Cari member by HP |
| GET | `/api/v1/reports/dashboard` | KPI dashboard |
| GET | `/api/v1/reports/sales` | Laporan penjualan |

## Header Wajib

```
Authorization: Bearer {token}
X-Outlet-ID: {outlet_uuid}
X-Device-ID: {device_identifier}    # Untuk kasir Android
Content-Type: application/json
Accept: application/json
```

## Akun Demo (setelah seeder)

| Role | Email | Password | PIN |
|---|---|---|---|
| Super Admin | superadmin@pos-enterprise.com | SuperAdmin@123 | - |
| Admin | admin@usahamaju.com | Admin@123 | - |
| Manager | manager@usahamaju.com | Manager@123 | 123456 |
| Kasir | Andi Prasetyo | - | 112233 |

---

*POS Enterprise Backend v1.0.0 · Laravel 12 · PostgreSQL 16*
