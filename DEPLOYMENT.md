# POS Enterprise — Deployment Guide

> Panduan lengkap deploy ke **VPS Ubuntu 22.04** (juga berlaku untuk Railway/Render).

---

## Prasyarat

| Item | Versi Min | Keterangan |
|---|---|---|
| VPS RAM | 2 GB | Minimal 4 GB direkomendasikan |
| OS | Ubuntu 22.04 LTS | Atau Debian 12 |
| Docker | 26.x | `curl -fsSL https://get.docker.com \| sh` |
| Docker Compose | 2.x | Sudah termasuk di Docker Desktop |
| Domain | — | Arahkan A-record ke IP VPS |

---

## 1. Persiapan VPS

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi
docker --version        # Docker version 26.x
docker compose version  # Docker Compose version 2.x

# Buat direktori proyek
sudo mkdir -p /opt/pos-enterprise
sudo chown $USER:$USER /opt/pos-enterprise
```

---

## 2. Clone & Konfigurasi

```bash
cd /opt/pos-enterprise

# Clone repository (atau upload manual)
git clone https://github.com/USERNAME/pos-enterprise.git .

# Masuk ke direktori backend
cd pos-enterprise-backend

# Salin template .env production
cp .env.production.example .env.production

# Edit dengan nilai asli (WAJIB diisi semua)
nano .env.production
```

**Nilai yang WAJIB diubah di `.env.production`:**

| Key | Contoh Nilai |
|---|---|
| `APP_KEY` | Hasil `php artisan key:generate --show` |
| `APP_URL` | `https://api.pos.bisnisku.id` |
| `DB_PASSWORD` | String acak 20+ karakter |
| `REDIS_PASSWORD` | String acak 20+ karakter |
| `DB_DATABASE` | `pos_enterprise` |
| Domain di nginx | Ganti semua `YOUR_DOMAIN` |

---

## 3. Konfigurasi Nginx Domain

```bash
# Edit server block nginx
nano docker/nginx/default.conf

# Ganti semua 'YOUR_DOMAIN' dengan domain asli:
# Contoh: pos.bisnisku.id dan api.pos.bisnisku.id
sed -i 's/YOUR_DOMAIN/pos.bisnisku.id/g' docker/nginx/default.conf
```

---

## 4. SSL Certificate (Let's Encrypt)

```bash
# Jalankan dulu hanya nginx + certbot (HTTP only)
docker compose -f docker-compose.prod.yml up -d nginx certbot

# Request sertifikat
docker compose -f docker-compose.prod.yml exec certbot \
  certbot certonly --webroot \
  -w /var/www/certbot \
  -d pos.bisnisku.id \
  -d api.pos.bisnisku.id \
  --email admin@bisnisku.id \
  --agree-tos \
  --non-interactive

# Verifikasi sertifikat berhasil dibuat
docker compose -f docker-compose.prod.yml exec certbot \
  certbot certificates
```

---

## 5. Build & Deploy

```bash
# Build image backend
docker compose -f docker-compose.prod.yml build backend

# Jalankan seluruh stack
docker compose -f docker-compose.prod.yml up -d

# Cek status semua service
docker compose -f docker-compose.prod.yml ps

# Lihat logs
docker compose -f docker-compose.prod.yml logs -f backend
```

Output yang diharapkan:
```
NAME              STATUS          PORTS
pos_nginx         healthy         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
pos_backend       healthy
pos_queue         running
pos_scheduler     running
pos_postgres      healthy
pos_redis         healthy
pos_certbot       running
```

---

## 6. Inisialisasi Database

```bash
# Jalankan migration + seeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan migrate --seed --force

# Buat akun Super Admin pertama
docker compose -f docker-compose.prod.yml exec backend \
  php artisan tinker --execute="
    \App\Models\Company::create([
      'name'     => 'Nama Bisnis Anda',
      'email'    => 'admin@bisnisku.id',
      'timezone' => 'Asia/Jakarta',
      'currency' => 'IDR',
      'settings' => [],
      'is_active'=> true,
    ]);
    \App\Models\User::create([
      'company_id'    => \App\Models\Company::first()->id,
      'name'          => 'Super Admin',
      'email'         => 'superadmin@bisnisku.id',
      'password_hash' => bcrypt('Password@Kuat123'),
      'role'          => \App\Enums\UserRole::SuperAdmin,
      'is_active'     => true,
    ]);
    echo 'Berhasil!';
  "
```

---

## 7. Deploy Web Admin

```bash
# Di mesin developer atau CI/CD
cd pos-enterprise-webadmin

# Build production
VITE_API_URL=https://api.pos.bisnisku.id npm run build

# Upload dist/ ke VPS
rsync -avz --delete dist/ user@VPS_IP:/opt/pos-enterprise/pos-enterprise-backend/docker/webadmin/

# Atau jika menggunakan volume Docker:
scp -r dist/ user@VPS_IP:/tmp/webadmin-dist/
docker compose -f docker-compose.prod.yml exec nginx \
  cp -r /tmp/webadmin-dist/* /var/www/webadmin/
```

---

## 8. Verifikasi Health Check

```bash
# API health
curl https://api.pos.bisnisku.id/api/health
# Expected: {"status":"ok","timestamp":"...","db":"connected","redis":"connected"}

# SSL grade
# Kunjungi: https://www.ssllabs.com/ssltest/analyze.html?d=api.pos.bisnisku.id
```

---

## 9. Update / Rollback

```bash
# === UPDATE ===
cd /opt/pos-enterprise
git pull origin main

cd pos-enterprise-backend
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d --no-deps backend queue scheduler
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# === ROLLBACK ===
# Lihat image yang tersedia
docker images pos-backend

# Rollback ke image sebelumnya
docker compose -f docker-compose.prod.yml stop backend queue scheduler
docker tag pos-backend:SHA_LAMA pos-backend:latest
docker compose -f docker-compose.prod.yml up -d --no-deps backend queue scheduler
```

---

## 10. Backup Strategy

```bash
# Backup PostgreSQL harian (tambahkan ke crontab)
0 2 * * * docker exec pos_postgres pg_dump \
  -U pos_user pos_enterprise | gzip \
  > /backups/pos-db-$(date +\%Y\%m\%d).sql.gz

# Hapus backup lebih dari 30 hari
0 3 * * * find /backups -name "pos-db-*.sql.gz" -mtime +30 -delete

# Restore dari backup
gunzip -c /backups/pos-db-20260712.sql.gz | \
  docker exec -i pos_postgres psql -U pos_user pos_enterprise
```

---

## 11. Monitoring

```bash
# Resource usage real-time
docker stats

# Logs service tertentu
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend
docker compose -f docker-compose.prod.yml logs -f --tail=100 queue

# Queue status
docker compose -f docker-compose.prod.yml exec backend \
  php artisan queue:monitor redis:default

# DB connections
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U pos_user -d pos_enterprise \
  -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"
```

---

## Deployment di Railway / Render (Alternatif)

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login dan deploy
railway login
railway init
railway up
```

**Environment variables Railway** → Settings → Variables:
Salin semua isi `.env.production` ke Railway dashboard.

### Render
1. Buat "Web Service" baru di https://render.com
2. Pilih repo GitHub
3. Build Command: `composer install && php artisan migrate --force`
4. Start Command: `php artisan serve --host=0.0.0.0 --port=$PORT`
5. Environment: Tambahkan semua variabel dari `.env.production.example`

> **Catatan:** Railway/Render gratis tier cocok untuk **staging/demo**.
> Untuk production dengan banyak user, gunakan VPS dedicated.

---

## GitHub Secrets yang Diperlukan

| Secret | Keterangan |
|---|---|
| `STAGING_HOST` | IP atau hostname VPS |
| `STAGING_USER` | SSH username (misal: `ubuntu`) |
| `STAGING_SSH_KEY` | Private key SSH (base64 atau plain) |
| `WEB_DEPLOY_PATH` | Path di VPS untuk Web Admin dist |
| `VITE_API_URL` | URL backend API production |
| `KEYSTORE_BASE64` | Android keystore (base64 encoded) |
| `KEY_ALIAS` | Android key alias |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_PASSWORD` | Key password |
