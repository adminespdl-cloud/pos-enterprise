import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import os
import time

BASE_URL = "https://ksktgojabar.xyz"
LOGIN_URL = "https://ksktgojabar.xyz/home/index"
USERNAME = "KOOR.53585"
PASSWORD = "123456789"
OUTPUT_DIR = "output_v2"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Semua halaman data yang diketahui dari menu
TARGET_PAGES = {
    # DASHBOARD
    "dashboard": "https://ksktgojabar.xyz/koordinator/home",

    # PERENCANAAN
    "ren_peralatan": "https://ksktgojabar.xyz/koordinator/perencanaan/peralatan",
    "ren_gardu": "https://ksktgojabar.xyz/koordinator/perencanaan/gardu",
    "ren_thermovision_tm": "https://ksktgojabar.xyz/koordinator/perencanaantm/thermovision",
    "ren_ultrasound": "https://ksktgojabar.xyz/koordinator/perencanaantm/ultrasound",
    "ren_thermovision_gd": "https://ksktgojabar.xyz/koordinator/perencanaan/thermovisiongd",

    # ASSESSMENT
    "ass_peralatan": "https://ksktgojabar.xyz/koordinator/assesment/peralatan",
    "ass_gardu": "https://ksktgojabar.xyz/koordinator/assesment/gardu",
    "ass_kondisi_peralatan": "https://ksktgojabar.xyz/koordinator/assesment/kondisiperalatan",
    "ass_kondisi_gardu": "https://ksktgojabar.xyz/koordinator/assesment/kondisigardu",
    "ass_kondisi_thermo": "https://ksktgojabar.xyz/koordinator/assesment/kondisithermo",
    "ass_kondisi_ultra": "https://ksktgojabar.xyz/koordinator/assesment/kondisiultra",
    "ass_row": "https://ksktgojabar.xyz/koordinator/assesment/row",
    "ass_mandorline": "https://ksktgojabar.xyz/koordinator/assesment/mandorline",

    # GARDU
    "gardu_ukur": "https://ksktgojabar.xyz/koordinator/gardu/ukur",
    "gardu_visual": "https://ksktgojabar.xyz/koordinator/gardu/visual",
    "gardu_thermovision": "https://ksktgojabar.xyz/koordinator/gardu/thermovision",

    # TM
    "tm_tegangan": "https://ksktgojabar.xyz/koordinator/tm/tegangan",
    "tm_thermovision": "https://ksktgojabar.xyz/koordinator/tm/thermovision",
    "tm_ultrasound": "https://ksktgojabar.xyz/koordinator/tm/ultrasound",

    # JADWAL
    "jadwal_row": "https://ksktgojabar.xyz/koordinator/jadwal/row",
    "jadwal_peralatan": "https://ksktgojabar.xyz/koordinator/jadwal/peralatan",
    "jadwal_thermovision": "https://ksktgojabar.xyz/koordinator/jadwal/thermovision",
    "jadwal_ultrasound": "https://ksktgojabar.xyz/koordinator/jadwal/ultrasound",
    "jadwal_gardu": "https://ksktgojabar.xyz/koordinator/jadwal/gardu",
    "jadwal_thermovision_gd": "https://ksktgojabar.xyz/koordinator/jadwal/thermovisiongd",

    # LIST JADWAL
    "listjadwal_row": "https://ksktgojabar.xyz/koordinator/listjadwal/row",
    "listjadwal_peralatan": "https://ksktgojabar.xyz/koordinator/listjadwal/peralatan",
    "listjadwal_gardu": "https://ksktgojabar.xyz/koordinator/listjadwal/gardu",
    "listjadwal_thermovision_gd": "https://ksktgojabar.xyz/koordinator/listjadwal/thermovisiongd",
    "listjadwal_tm_thermovision": "https://ksktgojabar.xyz/koordinator/listjadwaltm/thermovision",
    "listjadwal_tm_ultrasound": "https://ksktgojabar.xyz/koordinator/listjadwaltm/ultrasound",

    # PEKERJAAN
    "pekerjaan_row": "https://ksktgojabar.xyz/koordinator/pekerjaan/row",
    "pekerjaan_peralatan": "https://ksktgojabar.xyz/koordinator/pekerjaan/peralatan",
    "pekerjaan_gardu": "https://ksktgojabar.xyz/koordinator/pekerjaan/gardu",

    # EKSEKUSI
    "eksekusi_row": "https://ksktgojabar.xyz/koordinator/eksekusi/row",
    "eksekusi_peralatan": "https://ksktgojabar.xyz/koordinator/eksekusi/peralatan",
    "eksekusi_gardu": "https://ksktgojabar.xyz/koordinator/eksekusi/gardu",
    "eksekusi_thermovision_gd": "https://ksktgojabar.xyz/koordinator/eksekusi/thermovisiongd",
    "eksekusi_mandorline": "https://ksktgojabar.xyz/koordinator/eksekusi/mandorline",
    "eksekusitm_thermovision": "https://ksktgojabar.xyz/koordinator/eksekusitm/thermovision",
    "eksekusitm_ultrasound": "https://ksktgojabar.xyz/koordinator/eksekusitm/ultrasound",

    # REALISASI
    "realisasi_row": "https://ksktgojabar.xyz/koordinator/realisasi/row",
    "realisasi_peralatan": "https://ksktgojabar.xyz/koordinator/realisasi/peralatan",
    "realisasi_gardu": "https://ksktgojabar.xyz/koordinator/realisasi/gardu",
    "realisasi_thermovision": "https://ksktgojabar.xyz/koordinator/realisasi/thermovision",
    "realisasi_ultrasound": "https://ksktgojabar.xyz/koordinator/realisasi/ultrasound",
    "realisasi_thermovision_gd": "https://ksktgojabar.xyz/koordinator/realisasi/thermovisiongd",
    "realisasi_mandorline": "https://ksktgojabar.xyz/koordinator/realisasi/mandorline",

    # LAPORAN HARJAR/HARDU
    "bulanan_harjar": "https://ksktgojabar.xyz/koordinator/bulanan/harjar",
    "tahunan_harjar": "https://ksktgojabar.xyz/koordinator/tahunan/harjar",
    "bulanan_hardu": "https://ksktgojabar.xyz/koordinator/bulanan/hardu",
    "tahunan_hardu": "https://ksktgojabar.xyz/koordinator/tahunan/hardu",
    "bulanan_row": "https://ksktgojabar.xyz/koordinator/bulanan/row",
    "bulanan_mandorline": "https://ksktgojabar.xyz/koordinator/bulanan/mandorline",
    "tahunan_row": "https://ksktgojabar.xyz/koordinator/tahunan/row",
    "tahunan_mandorline": "https://ksktgojabar.xyz/koordinator/tahunan/mandorline",

    # LAPORAN MATERIAL
    "lapmat_renperalatan": "https://ksktgojabar.xyz/koordinator/lapmat/renperalatan",
    "lapmat_rengardu": "https://ksktgojabar.xyz/koordinator/lapmat/rengardu",
    "lapmat_peralatan": "https://ksktgojabar.xyz/koordinator/lapmat/peralatan",
    "lapmat_gardu": "https://ksktgojabar.xyz/koordinator/lapmat/gardu",
    "lapmat_rekap": "https://ksktgojabar.xyz/koordinator/lapmat/rekap",

    # LAPORAN ASSESSMENT
    "lapassesment": "https://ksktgojabar.xyz/koordinator/lapassesment",
    "lapassesment_periode": "https://ksktgojabar.xyz/koordinator/lapassesment/periode",
    "lapassesment_row": "https://ksktgojabar.xyz/koordinator/lapassesment/row",
    "lapassesment_mandorline": "https://ksktgojabar.xyz/koordinator/lapassesment/mandorline",
    "lapassesment_peralatan": "https://ksktgojabar.xyz/koordinator/lapassesment/peralatan",
    "lapassesment_tegangan": "https://ksktgojabar.xyz/koordinator/lapassesment/tegangan",
    "lapassesment_thermotm": "https://ksktgojabar.xyz/koordinator/lapassesment/thermotm",
    "lapassesment_ultrasound": "https://ksktgojabar.xyz/koordinator/lapassesment/ultrasound",
    "lapassesment_gardu": "https://ksktgojabar.xyz/koordinator/lapassesment/gardu",
    "lapassesment_ukur": "https://ksktgojabar.xyz/koordinator/lapassesment/ukur",
    "lapassesment_visual": "https://ksktgojabar.xyz/koordinator/lapassesment/visual",
    "lapassesment_thermogd": "https://ksktgojabar.xyz/koordinator/lapassesment/thermogd",

    # GANGGUAN
    "gangguan": "https://ksktgojabar.xyz/koordinator/gangguan/",
    "gangguan_grafik": "https://ksktgojabar.xyz/koordinator/gangguan/grafik",
    "gangguan_top": "https://ksktgojabar.xyz/koordinator/gangguan/top",
    "gangguan_zona": "https://ksktgojabar.xyz/koordinator/gangguan/zona",
    "gangguan_penyebab": "https://ksktgojabar.xyz/koordinator/gangguan/penyebab",
    "gangguan_durasi": "https://ksktgojabar.xyz/koordinator/gangguan/durasi",
    "gangguan_indikasi": "https://ksktgojabar.xyz/koordinator/gangguan/indikasi",

    # DATA ASET
    "data_tiang": "https://ksktgojabar.xyz/koordinator/datatiang/index",
    "data_gardu": "https://ksktgojabar.xyz/koordinator/datagardu/index",
    "data_pohon": "https://ksktgojabar.xyz/koordinator/datapohon/index",

    # SETTING
    "setting_pekerjaan": "https://ksktgojabar.xyz/koordinator/setting/pekerjaan",
    "setting_material": "https://ksktgojabar.xyz/koordinator/setting/material",
}

def create_session():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    })
    resp = session.post(LOGIN_URL, data={"a": USERNAME, "b": PASSWORD, "submit": "Sign In"}, allow_redirects=True, timeout=15)
    if "koordinator" not in resp.url:
        print("[!] Login gagal!")
        return None
    print(f"[+] Login berhasil -> {resp.url}")
    print(f"[+] Session cookie: {dict(session.cookies)}")
    return session

def scrape_page(session, name, url):
    try:
        resp = session.get(url, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        title = soup.title.string.strip() if soup.title else url

        # Cek apakah kena redirect ke login
        if "login-box" in resp.text or "Log In" in resp.text[:500]:
            print(f"  [!] Sesi habis atau akses ditolak: {url}")
            return None

        # Simpan HTML
        html_path = os.path.join(OUTPUT_DIR, f"{name}.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(resp.text)

        # Ekstrak tabel
        tables = soup.find_all("table")
        table_dfs = []
        for i, tbl in enumerate(tables):
            try:
                df = pd.read_html(str(tbl))[0]
                table_dfs.append(df)
            except Exception:
                pass

        # Ekstrak teks konten utama
        content_text = []
        for el in soup.find_all(["h1","h2","h3","h4","p","li","td","th","span"]):
            t = el.get_text(strip=True)
            if t and len(t) > 2:
                content_text.append(t)

        result = {
            "name": name,
            "url": url,
            "title": title,
            "has_tables": len(table_dfs) > 0,
            "table_count": len(table_dfs),
            "tables": table_dfs,
            "content_preview": content_text[:50],
        }

        status = f"[+] OK | Tabel: {len(table_dfs)} | Title: {title[:60]}"
        print(f"  {status}")
        return result

    except Exception as e:
        print(f"  [!] Error: {e}")
        return None

def main():
    print("=" * 60)
    print("KSKT GO JABAR - Scraper v2")
    print("=" * 60)

    session = create_session()
    if not session:
        return

    all_results = {}
    all_tables_for_excel = {}
    summary = []

    total = len(TARGET_PAGES)
    for i, (name, url) in enumerate(TARGET_PAGES.items(), 1):
        print(f"\n[{i}/{total}] Scraping: {name}")
        result = scrape_page(session, name, url)
        if result:
            all_results[name] = result
            summary.append({
                "Halaman": name,
                "URL": url,
                "Judul": result["title"],
                "Jumlah Tabel": result["table_count"],
                "Ada Data": "Ya" if result["has_tables"] else "Tidak",
                "Preview": " | ".join(result["content_preview"][:5])
            })
            if result["tables"]:
                for j, df in enumerate(result["tables"]):
                    sheet_key = f"{name}_tabel{j+1}"
                    all_tables_for_excel[sheet_key] = df
        time.sleep(0.3)

    # Simpan ringkasan JSON
    json_out = {}
    for k, v in all_results.items():
        json_out[k] = {
            "url": v["url"],
            "title": v["title"],
            "table_count": v["table_count"],
            "content_preview": v["content_preview"],
        }
    with open(os.path.join(OUTPUT_DIR, "semua_data.json"), "w", encoding="utf-8") as f:
        json.dump(json_out, f, ensure_ascii=False, indent=2)

    # Simpan ke Excel
    excel_path = os.path.join(OUTPUT_DIR, "data_kskt_lengkap.xlsx")
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        # Sheet ringkasan
        df_summary = pd.DataFrame(summary)
        df_summary.to_excel(writer, sheet_name="RINGKASAN", index=False)
        # Sheet per tabel
        for sheet_name, df in all_tables_for_excel.items():
            sn = sheet_name[:31]
            df.to_excel(writer, sheet_name=sn, index=False)

    print("\n" + "=" * 60)
    print(f"SELESAI!")
    print(f"  Halaman diproses : {len(all_results)} dari {total}")
    print(f"  Tabel ditemukan  : {len(all_tables_for_excel)}")
    print(f"  Excel            : {excel_path}")
    print(f"  JSON             : output_v2/semua_data.json")
    print("=" * 60)

if __name__ == "__main__":
    main()
