import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import os
import time
from urllib.parse import urljoin, urlparse

BASE_URL = "https://ksktgojabar.xyz"
LOGIN_URL = "https://ksktgojabar.xyz/home/index"
DASHBOARD_URL = "https://ksktgojabar.xyz/koordinator/home"

USERNAME = "KOOR.53585"
PASSWORD = "123456789"

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Referer": BASE_URL,
})

def login():
    print("[*] Mencoba login...")
    payload = {
        "a": USERNAME,
        "b": PASSWORD,
        "submit": "Sign In"
    }
    resp = session.post(LOGIN_URL, data=payload, allow_redirects=True, timeout=15)
    print(f"[*] Status: {resp.status_code} | URL akhir: {resp.url}")
    
    # Cek apakah login berhasil (tidak kembali ke halaman login)
    if "login" in resp.url.lower() or "Log In" in resp.text:
        print("[!] Login GAGAL - masih di halaman login")
        return False, resp
    
    print("[+] Login BERHASIL!")
    return True, resp

def get_all_links(soup, current_url):
    """Ambil semua link internal dari halaman"""
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        full_url = urljoin(current_url, href)
        parsed = urlparse(full_url)
        # Hanya ambil link internal
        if parsed.netloc == "ksktgojabar.xyz" and "#" not in full_url:
            links.add(full_url)
    return links

def extract_tables(soup, page_url):
    """Ekstrak semua tabel dari halaman"""
    tables_data = []
    tables = soup.find_all("table")
    for i, table in enumerate(tables):
        try:
            df = pd.read_html(str(table))[0]
            tables_data.append({
                "url": page_url,
                "table_index": i,
                "dataframe": df
            })
            print(f"  [+] Tabel {i+1} ditemukan: {df.shape[0]} baris x {df.shape[1]} kolom")
        except Exception as e:
            print(f"  [!] Gagal parse tabel {i}: {e}")
    return tables_data

def extract_page_info(soup, url):
    """Ekstrak informasi umum dari halaman"""
    info = {
        "url": url,
        "title": soup.title.string if soup.title else "",
        "headings": [],
        "stats": [],
        "lists": [],
    }
    
    # Ambil semua heading
    for tag in ["h1","h2","h3","h4"]:
        for h in soup.find_all(tag):
            text = h.get_text(strip=True)
            if text:
                info["headings"].append({"tag": tag, "text": text})
    
    # Ambil angka statistik (biasanya di info-box atau small-box AdminLTE)
    for box in soup.find_all(class_=lambda c: c and any(x in str(c) for x in ["info-box", "small-box", "stat", "count"])):
        text = box.get_text(strip=True)
        if text:
            info["stats"].append(text[:200])
    
    # Ambil list item
    for ul in soup.find_all("ul", class_=True):
        items = [li.get_text(strip=True) for li in ul.find_all("li") if li.get_text(strip=True)]
        if items:
            info["lists"].extend(items)
    
    return info

def scrape_all():
    # Step 1: Login
    success, resp = login()
    if not success:
        print("\n[!] Tidak bisa melanjutkan scraping karena login gagal.")
        print(f"[!] Cek credentials atau coba lagi.")
        # Simpan response untuk debug
        with open(os.path.join(OUTPUT_DIR, "login_response.html"), "w", encoding="utf-8") as f:
            f.write(resp.text)
        print(f"[!] Response disimpan di: {OUTPUT_DIR}/login_response.html")
        return
    
    # Step 2: Crawl semua halaman
    visited = set()
    to_visit = {DASHBOARD_URL}
    all_tables = []
    all_pages_info = []
    
    print(f"\n[*] Mulai crawling semua halaman...")
    
    while to_visit:
        url = to_visit.pop()
        if url in visited:
            continue
        
        visited.add(url)
        print(f"\n[*] Mengakses: {url}")
        
        try:
            resp = session.get(url, timeout=15)
            
            # Cek apakah di-redirect ke login
            if "Log In" in resp.text and "login-box" in resp.text:
                print(f"  [!] Halaman ini butuh login ulang atau tidak ada akses")
                continue
            
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Simpan HTML mentah
            safe_name = url.replace("https://ksktgojabar.xyz/", "").replace("/", "_").replace("?", "_")
            if not safe_name:
                safe_name = "dashboard"
            with open(os.path.join(OUTPUT_DIR, f"{safe_name}.html"), "w", encoding="utf-8") as f:
                f.write(resp.text)
            
            # Ekstrak info halaman
            page_info = extract_page_info(soup, url)
            all_pages_info.append(page_info)
            
            # Ekstrak tabel
            tables = extract_tables(soup, url)
            all_tables.extend(tables)
            
            # Cari link baru
            new_links = get_all_links(soup, url)
            for link in new_links:
                if link not in visited:
                    to_visit.add(link)
            
            print(f"  [+] Links baru ditemukan: {len(new_links)}")
            time.sleep(0.5)  # jangan terlalu agresif
            
        except Exception as e:
            print(f"  [!] Error: {e}")
    
    # Step 3: Simpan hasil
    print(f"\n[*] Total halaman dikunjungi: {len(visited)}")
    print(f"[*] Total tabel ditemukan: {len(all_tables)}")
    
    # Simpan semua tabel ke Excel
    if all_tables:
        excel_path = os.path.join(OUTPUT_DIR, "data_kskt.xlsx")
        with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
            for i, t in enumerate(all_tables):
                sheet_name = f"Tabel_{i+1}"[:31]
                t["dataframe"].to_excel(writer, sheet_name=sheet_name, index=False)
        print(f"[+] Data tabel disimpan ke: {excel_path}")
    
    # Simpan info halaman ke JSON
    json_path = os.path.join(OUTPUT_DIR, "pages_info.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_pages_info, f, ensure_ascii=False, indent=2)
    print(f"[+] Info halaman disimpan ke: {json_path}")
    
    print("\n[OK] Scraping selesai!")
    return all_pages_info, all_tables

if __name__ == "__main__":
    scrape_all()
