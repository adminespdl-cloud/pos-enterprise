"""
Download foto dari semua halaman detail tiang & gardu
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import re
import time

EXCEL_PATH = "output_final/DATA_KSKT_JABAR_COMPLETE.xlsx"
FOTO_DIR = "output_final/foto_tiang"
FOTO_GARDU_DIR = "output_final/foto_gardu"
os.makedirs(FOTO_DIR, exist_ok=True)
os.makedirs(FOTO_GARDU_DIR, exist_ok=True)

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
session.post('https://ksktgojabar.xyz/home/index',
             data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'},
             allow_redirects=True)
print("[+] Login OK")

# ── Ambil ID dari halaman detail yang sudah disimpan ──────────
# Kita perlu crawl halaman datatiang untuk dapat semua ID view
# Dari HTML yang tersimpan, ada link view: /koordinator/datatiang/view/ID

def get_all_view_ids(list_url, base_path):
    """Ambil semua ID view dari halaman list"""
    ids = []
    resp = session.get(list_url, timeout=20)
    soup = BeautifulSoup(resp.text, 'html.parser')
    for a in soup.find_all('a', href=True):
        href = a['href']
        match = re.search(rf'{base_path}/(\d+)', href)
        if match:
            ids.append(match.group(1))
    return list(set(ids))

print("\n[1] Mencari semua ID tiang dari halaman list...")
tiang_ids = get_all_view_ids(
    'https://ksktgojabar.xyz/koordinator/datatiang/index',
    '/koordinator/datatiang/view'
)
print(f"  Ditemukan {len(tiang_ids)} ID tiang")

print("\n[2] Mencari semua ID gardu dari halaman list...")
gardu_ids = get_all_view_ids(
    'https://ksktgojabar.xyz/koordinator/datagardu/index',
    '/koordinator/datagardu/view'
)
print(f"  Ditemukan {len(gardu_ids)} ID gardu")

def download_image(img_url, save_path):
    """Download satu gambar"""
    try:
        r = session.get(img_url, timeout=20, stream=True)
        if r.status_code == 200 and 'image' in r.headers.get('Content-Type', ''):
            with open(save_path, 'wb') as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"    [!] Error download {img_url}: {e}")
    return False

def scrape_detail_photos(view_id, base_url, save_dir, label):
    """Buka halaman detail, ambil foto, download"""
    url = f"{base_url}/{view_id}"
    try:
        resp = session.get(url, timeout=20)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        photos_saved = 0
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if not src:
                continue
            # Filter hanya foto konten (bukan logo/icon)
            if '/image/' in src or '/foto/' in src or '/upload/' in src:
                # Buat nama file dari URL
                ext = src.split('.')[-1].lower()
                if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                    ext = 'jpg'
                filename = f"{label}_{view_id}_{photos_saved+1}.{ext}"
                save_path = os.path.join(save_dir, filename)
                
                if not os.path.exists(save_path):
                    ok = download_image(src, save_path)
                    if ok:
                        size_kb = os.path.getsize(save_path) / 1024
                        print(f"  [OK] {filename} ({size_kb:.0f} KB)")
                        photos_saved += 1
                else:
                    photos_saved += 1  # sudah ada
        
        return photos_saved
    except Exception as e:
        print(f"  [!] Error ID {view_id}: {e}")
        return 0

# ── Download foto tiang ────────────────────────────────────────
print(f"\n[3] Download foto TIANG ({len(tiang_ids)} halaman)...")
total_tiang_photos = 0
for i, vid in enumerate(tiang_ids, 1):
    count = scrape_detail_photos(
        vid,
        'https://ksktgojabar.xyz/koordinator/datatiang/view',
        FOTO_DIR,
        'tiang'
    )
    total_tiang_photos += count
    if i % 10 == 0:
        print(f"  Progress: {i}/{len(tiang_ids)} tiang, {total_tiang_photos} foto")
    time.sleep(0.3)

print(f"\n  Total foto tiang: {total_tiang_photos}")

# ── Download foto gardu ────────────────────────────────────────
print(f"\n[4] Download foto GARDU ({len(gardu_ids)} halaman)...")
total_gardu_photos = 0
for i, vid in enumerate(gardu_ids, 1):
    count = scrape_detail_photos(
        vid,
        'https://ksktgojabar.xyz/koordinator/datagardu/view',
        FOTO_GARDU_DIR,
        'gardu'
    )
    total_gardu_photos += count
    if i % 10 == 0:
        print(f"  Progress: {i}/{len(gardu_ids)} gardu, {total_gardu_photos} foto")
    time.sleep(0.3)

print(f"\n  Total foto gardu: {total_gardu_photos}")

# ── Ringkasan ──────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"SELESAI!")
print(f"  Foto tiang : {total_tiang_photos} file -> {FOTO_DIR}")
print(f"  Foto gardu : {total_gardu_photos} file -> {FOTO_GARDU_DIR}")
total_size = sum(
    os.path.getsize(os.path.join(d, f))
    for d in [FOTO_DIR, FOTO_GARDU_DIR]
    for f in os.listdir(d)
) / (1024*1024)
print(f"  Total size : {total_size:.1f} MB")
print(f"{'='*50}")
