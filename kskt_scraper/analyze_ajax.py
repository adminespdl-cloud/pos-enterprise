import requests
from bs4 import BeautifulSoup
import re
import json

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'})
session.post('https://ksktgojabar.xyz/home/index', 
             data={'a': 'KOOR.53585', 'b': '123456789', 'submit': 'Sign In'}, 
             allow_redirects=True)

# Test beberapa halaman kunci
test_urls = [
    ('lapassesment_peralatan', 'https://ksktgojabar.xyz/koordinator/lapassesment/peralatan'),
    ('gangguan', 'https://ksktgojabar.xyz/koordinator/gangguan/'),
    ('data_tiang', 'https://ksktgojabar.xyz/koordinator/datatiang/index'),
    ('realisasi_row', 'https://ksktgojabar.xyz/koordinator/realisasi/row'),
    ('listjadwal_thermovision_gd', 'https://ksktgojabar.xyz/koordinator/listjadwal/thermovisiongd'),
]

findings = {}

for name, url in test_urls:
    print(f"\n{'='*50}")
    print(f"PAGE: {name}")
    print(f"URL: {url}")
    resp = session.get(url, timeout=15)
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    ajax_urls = set()
    datatables_configs = []
    
    # Cari semua script
    for s in soup.find_all('script'):
        text = s.get_text()
        if not text.strip():
            continue
        
        # Cari pattern URL ajax
        found = re.findall(r'["\']([^"\']*koordinator[^"\']*)["\']', text)
        for f in found:
            if f not in ['', '/koordinator/home']:
                ajax_urls.add(f)
        
        # Cari DataTables ajax url
        dt = re.findall(r'ajax\s*[:\{]\s*["\']([^"\']+)["\']', text)
        datatables_configs.extend(dt)
        
        # Cari $.ajax calls
        ajax_calls = re.findall(r'url\s*:\s*["\']([^"\']+)["\']', text)
        for a in ajax_calls:
            ajax_urls.add(a)
        
        # Cari $.get / $.post
        get_calls = re.findall(r'\$\.(?:get|post)\s*\(\s*["\']([^"\']+)["\']', text)
        for g in get_calls:
            ajax_urls.add(g)
        
        # Cari fetch()
        fetch_calls = re.findall(r'fetch\s*\(\s*["\']([^"\']+)["\']', text)
        for f in fetch_calls:
            ajax_urls.add(f)
    
    print(f"\n  AJAX URLs ditemukan ({len(ajax_urls)}):")
    for u in sorted(ajax_urls):
        print(f"    - {u}")
    
    print(f"\n  DataTables configs ({len(datatables_configs)}):")
    for d in datatables_configs:
        print(f"    - {d}")
    
    # Cek apakah ada iframe atau embed
    iframes = soup.find_all('iframe')
    print(f"\n  iFrames: {len(iframes)}")
    for ifr in iframes:
        print(f"    src: {ifr.get('src','')}")
    
    # Cek div dengan id konten
    content_divs = soup.find_all('div', id=lambda x: x and any(k in x.lower() for k in ['content','data','table','list','result']))
    print(f"\n  Content divs: {[d.get('id') for d in content_divs]}")
    
    # Simpan HTML untuk diperiksa
    with open(f'output_v2/inspect_{name}.html', 'w', encoding='utf-8') as f:
        f.write(resp.text)
    
    findings[name] = {
        'ajax_urls': list(ajax_urls),
        'datatables': datatables_configs,
    }

# Simpan temuan
with open('output_v2/ajax_findings.json', 'w', encoding='utf-8') as f:
    json.dump(findings, f, ensure_ascii=False, indent=2)

print("\n\nSelesai! Cek output_v2/ajax_findings.json")
