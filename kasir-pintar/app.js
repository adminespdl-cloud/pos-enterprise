// ============================================================
// KASIR PINTAR — app.js  (QRIS · Bluetooth · PDF Reports)
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyA-6MMFxANJGhmKFlK3xgDy36aP_QTq2RY",
    authDomain: "kasir-umkm-pro.firebaseapp.com",
    projectId: "kasir-umkm-pro",
    storageBucket: "kasir-umkm-pro.firebasestorage.app",
    messagingSenderId: "510035007957",
    appId: "1:510035007957:web:7ab5466df05759e2d5855c"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (e) { console.error("Firebase:", e); }

// ── Global State ─────────────────────────────────────────────
let products       = [];
let cart           = [];
let storeSettings  = {};
let currentPayment = {};
let reportData     = [];
let currentPeriod  = 'all';
let btChar         = null;   // Bluetooth GATT characteristic

// ── Format helpers ────────────────────────────────────────────
const formatRp = n => new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
}).format(n);

function processImageFile(file, maxPx = 400) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxPx || h > maxPx) {
                    if (w >= h) { h = h * maxPx / w; w = maxPx; }
                    else        { w = w * maxPx / h; h = maxPx; }
                }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', 0.85));
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================
//  PRODUCT RENDERING
// ============================================================
function renderProducts(query = "") {
    const grid = document.getElementById("productGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!products.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><div>Belum ada produk.<br>Tambahkan di menu Pengaturan.</div></div>';
        return;
    }

    const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div>Produk tidak ditemukan.</div></div>';
        return;
    }

    filtered.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = () => addToCart(product);
        card.innerHTML = `
            ${product.image
                ? `<div class="product-img-bg" style="background-image:url('${product.image}')"></div>`
                : `<div class="emoji-bg">${product.emoji || "📦"}</div>`}
            <div class="product-name">${product.name}</div>
            <div class="product-price">${formatRp(product.price)}</div>`;
        grid.appendChild(card);
    });
}

// ============================================================
//  CART
// ============================================================
window.addToCart = product => {
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.qty++; else cart.push({ ...product, qty: 1 });
    renderCart();
};

window.updateQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (item) { item.qty += delta; if (item.qty <= 0) cart = cart.filter(i => i.id !== id); }
    renderCart();
};

function renderCart() {
    const cartEl  = document.getElementById("cartItems");
    const totalEl = document.getElementById("totalPrice");
    const badge   = document.getElementById("cartBadge");
    if (!cartEl) return;

    const count = cart.reduce((s, i) => s + i.qty, 0);
    if (badge) {
        badge.textContent = count + " item";
        badge.className = "cart-badge" + (count > 0 ? " has-items" : "");
    }

    if (!cart.length) {
        cartEl.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div>
            <p>Belum ada produk dipilih.<br>Tap produk untuk mulai.</p></div>`;
        if (totalEl) totalEl.textContent = formatRp(0);
        return;
    }

    cartEl.innerHTML = "";
    let total = 0;
    cart.forEach(item => {
        const sub = item.price * item.qty;
        total += sub;
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${formatRp(item.price)} × ${item.qty}</div>
                <div class="cart-item-subtotal">${formatRp(sub)}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQty('${item.id}',-1)">−</button>
                <span class="qty-number">${item.qty}</span>
                <button class="qty-btn" onclick="updateQty('${item.id}',1)">+</button>
            </div>`;
        cartEl.appendChild(div);
    });
    if (totalEl) totalEl.textContent = formatRp(total);
}

window.searchProduct = () => renderProducts(document.getElementById("searchInput").value);

// ============================================================
//  PAYMENT FLOW (multi-step modal)
// ============================================================
window.processPayment = () => {
    if (!cart.length) return Swal.fire('Perhatian', 'Keranjang masih kosong!', 'warning');
    if (!db)         return Swal.fire('Error', 'Database tidak terhubung.', 'error');

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    currentPayment = { total, items: [...cart] };

    document.getElementById("modalTotal").textContent = formatRp(total);
    showPayStep('1');
    document.getElementById("paymentModal").style.display = "flex";
};

function showPayStep(name) {
    ['1','2Cash','2QRIS','3'].forEach(n => {
        const el = document.getElementById("payStep" + n);
        if (el) el.style.display = "none";
    });
    const el = document.getElementById("payStep" + name);
    if (el) el.style.display = "block";
}

window.closePaymentModal = () => {
    document.getElementById("paymentModal").style.display = "none";
};

window.selectPaymentMethod = method => {
    currentPayment.method = method;
    if (method === 'cash') {
        document.getElementById("cashTotal").textContent = formatRp(currentPayment.total);
        const inp = document.getElementById("cashInput");
        inp.value = "";
        document.getElementById("changeDisplay").style.display = "none";
        showPayStep('2Cash');
        setTimeout(() => inp.focus(), 120);
    } else {
        document.getElementById("qrisTotal").textContent = formatRp(currentPayment.total);
        const img     = document.getElementById("qrisImage");
        const noImg   = document.getElementById("qrisNoImage");
        if (storeSettings.qrisImage) {
            img.src = storeSettings.qrisImage;
            img.style.display = "block";
            if (noImg) noImg.style.display = "none";
        } else {
            img.style.display = "none";
            if (noImg) noImg.style.display = "flex";
        }
        showPayStep('2QRIS');
    }
};

window.calcChange = () => {
    const cash    = parseInt(document.getElementById("cashInput").value) || 0;
    const dispEl  = document.getElementById("changeDisplay");
    const chngEl  = document.getElementById("changeAmount");
    if (cash >= currentPayment.total) {
        chngEl.textContent = formatRp(cash - currentPayment.total);
        dispEl.style.display = "flex";
    } else {
        dispEl.style.display = "none";
    }
};

window.goBackPayment = () => {
    document.getElementById("modalTotal").textContent = formatRp(currentPayment.total);
    showPayStep('1');
};

window.confirmCashPayment = async () => {
    const cash = parseInt(document.getElementById("cashInput").value) || 0;
    if (cash < currentPayment.total)
        return Swal.fire('Kurang!', 'Jumlah uang kurang dari total tagihan.', 'warning');
    currentPayment.cash   = cash;
    currentPayment.change = cash - currentPayment.total;
    await saveTransaction();
};

window.confirmQRISPayment = async () => {
    currentPayment.cash   = currentPayment.total;
    currentPayment.change = 0;
    await saveTransaction();
};

async function saveTransaction() {
    const btn = document.getElementById("qrisConfirmBtn");
    const btn2 = document.getElementById("cashConfirmBtn");
    if (btn)  btn.disabled  = true;
    if (btn2) btn2.disabled = true;

    try {
        const itemsDetail = currentPayment.items.map(i => ({
            name: i.name, qty: i.qty, price: i.price, subtotal: i.price * i.qty
        }));
        const itemNames = currentPayment.items.map(i => `${i.name} (x${i.qty})`).join(", ");

        await db.collection("transactions").add({
            items:         itemNames,
            itemsDetail:   itemsDetail,
            total:         currentPayment.total,
            paymentMethod: currentPayment.method,
            cashReceived:  currentPayment.cash   || 0,
            change:        currentPayment.change  || 0,
            timestamp:     firebase.firestore.FieldValue.serverTimestamp()
        });

        const chEl = document.getElementById("successChangeInfo");
        if (chEl) {
            chEl.innerHTML = currentPayment.method === 'cash' && currentPayment.change > 0
                ? `<div class="change-pill">Kembalian <strong>${formatRp(currentPayment.change)}</strong></div>`
                : '';
        }
        showPayStep('3');
        cart = [];
        renderCart();
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Gagal menyimpan transaksi. Coba lagi.', 'error');
    } finally {
        if (btn)  btn.disabled  = false;
        if (btn2) btn2.disabled = false;
    }
}

// ============================================================
//  BLUETOOTH PRINTER  (ESC/POS via Web Bluetooth)
// ============================================================
const BT_PROFILES = [
    { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', chr: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
    { svc: '000018f0-0000-1000-8000-00805f9b34fb', chr: '00002af1-0000-1000-8000-00805f9b34fb' },
    { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', chr: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
];

window.connectBluetoothPrinter = async () => {
    if (!navigator.bluetooth)
        return Swal.fire('Tidak Didukung', 'Gunakan Chrome/Edge di Android atau Desktop untuk fitur ini.', 'info');

    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: BT_PROFILES.map(p => p.svc)
        });
        const server = await device.gatt.connect();

        btChar = null;
        for (const p of BT_PROFILES) {
            try {
                const svc  = await server.getPrimaryService(p.svc);
                btChar     = await svc.getCharacteristic(p.chr);
                break;
            } catch { /* try next */ }
        }

        if (!btChar) {
            return Swal.fire('Error', 'Printer tidak cocok. Pastikan printer ESC/POS Bluetooth.', 'error');
        }

        updatePrinterUI(device.name || 'Printer', true);
        Swal.fire('Berhasil!', `Printer "${device.name || 'Bluetooth Printer'}" terhubung!`, 'success');

        device.addEventListener('gattserverdisconnected', () => {
            btChar = null;
            updatePrinterUI('Tidak Terhubung', false);
        });
    } catch (e) {
        if (e.name !== 'NotFoundError')
            Swal.fire('Gagal', e.message, 'error');
    }
};

function updatePrinterUI(name, connected) {
    const statusEl  = document.getElementById("printerStatus");
    const connectEl = document.getElementById("connectPrinterBtn");
    const testEl    = document.getElementById("testPrintBtn");
    if (statusEl) {
        statusEl.innerHTML = connected
            ? `<span class="badge-connected">● ${name}</span>`
            : `<span class="badge-disconnected">● ${name}</span>`;
    }
    if (connectEl) connectEl.textContent = connected ? '🔄 Ganti Printer' : '🖨️ Hubungkan Printer';
    if (testEl)    testEl.disabled = !connected;
}

async function writeToPrinter(data) {
    if (!btChar) throw new Error('Printer belum terhubung');
    for (let i = 0; i < data.length; i += 128) {
        await btChar.writeValue(data.slice(i, i + 128));
        await new Promise(r => setTimeout(r, 60));
    }
}

function buildReceipt() {
    const ESC = 0x1B, GS = 0x1D, LF = 0x0A;
    const enc = new TextEncoder();
    const buf = [];
    const push  = (...b) => buf.push(...b);
    const line  = (s)    => buf.push(...Array.from(enc.encode(s + '\n')));
    const sep   = ()     => line('--------------------------------');

    push(ESC, 0x40);                     // init
    push(ESC, 0x61, 0x01);              // center
    push(ESC, 0x21, 0x30);              // double-size bold
    line(storeSettings.name || 'Kasir Pintar');
    push(ESC, 0x21, 0x00);             // normal
    if (storeSettings.address) line(storeSettings.address);
    push(LF);
    push(ESC, 0x61, 0x00);             // left
    sep();

    const now = new Date().toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' });
    line(`Tanggal : ${now}`);
    line(`Bayar   : ${currentPayment.method === 'qris' ? 'QRIS' : 'Tunai'}`);
    sep();

    currentPayment.items.forEach(i => {
        line(i.name.substring(0, 32));
        const right = formatRp(i.price * i.qty);
        const left  = `  ${i.qty}x ${formatRp(i.price)}`;
        const pad   = 32 - left.length - right.length;
        line(left + ' '.repeat(Math.max(1, pad)) + right);
    });

    sep();
    push(ESC, 0x21, 0x08);
    line(`TOTAL`.padEnd(20) + formatRp(currentPayment.total));
    push(ESC, 0x21, 0x00);

    if (currentPayment.method === 'cash') {
        line(`Tunai`.padEnd(20) + formatRp(currentPayment.cash));
        line(`Kembali`.padEnd(20) + formatRp(currentPayment.change));
    }

    sep();
    push(ESC, 0x61, 0x01);
    line(storeSettings.receiptNote || 'Terima kasih sudah berbelanja!');
    push(LF, LF, LF);
    push(GS, 0x56, 0x41, 0x10);        // paper cut

    return new Uint8Array(buf);
}

window.printReceipt = async () => {
    if (!btChar) {
        const res = await Swal.fire({
            title: 'Printer Belum Terhubung',
            text: 'Hubungkan printer Bluetooth sekarang?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Hubungkan',
            cancelButtonText: 'Lewati'
        });
        if (res.isConfirmed) await connectBluetoothPrinter();
        return;
    }
    try {
        await writeToPrinter(buildReceipt());
        Swal.fire('Berhasil!', 'Struk berhasil dicetak!', 'success');
    } catch (e) {
        Swal.fire('Gagal Cetak', e.message, 'error');
    }
};

window.testPrint = async () => {
    if (!btChar) return Swal.fire('Belum Terhubung', 'Hubungkan printer dulu.', 'warning');
    const ESC = 0x1B, GS = 0x1D;
    const enc = new TextEncoder();
    const d = [
        ESC, 0x40,
        ESC, 0x61, 0x01,
        ESC, 0x21, 0x18,
        ...Array.from(enc.encode('TEST PRINT\n')),
        ESC, 0x21, 0x00,
        ...Array.from(enc.encode('Printer terhubung!\n\n\n')),
        GS, 0x56, 0x41, 0x10
    ];
    try {
        await writeToPrinter(new Uint8Array(d));
        Swal.fire('Berhasil!', 'Test print sukses!', 'success');
    } catch (e) {
        Swal.fire('Gagal', e.message, 'error');
    }
};

// ============================================================
//  LAPORAN / REPORTS
// ============================================================
window.changePeriod = period => {
    currentPeriod = period;
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-period="${period}"]`);
    if (btn) btn.classList.add('active');
    loadLaporan(period);
};

async function loadLaporan(period = 'all') {
    const tbody  = document.getElementById("laporanTableBody");
    const omset  = document.getElementById("omsetTotal");
    const count  = document.getElementById("txCount");
    const avg    = document.getElementById("avgTx");
    if (!tbody || !db) return;

    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">Memuat data...</td></tr>`;
    reportData = [];

    try {
        const now   = new Date();
        let qRef    = db.collection("transactions");

        if (period === 'daily') {
            const start = new Date(now); start.setHours(0, 0, 0, 0);
            qRef = qRef.where("timestamp", ">=", start);
        } else if (period === 'weekly') {
            const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
            qRef = qRef.where("timestamp", ">=", start);
        } else if (period === 'monthly') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            qRef = qRef.where("timestamp", ">=", start);
        }

        const snap = await qRef.orderBy("timestamp", "desc").get();

        tbody.innerHTML = "";
        let totalOmset = 0;

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Belum ada transaksi pada periode ini.</td></tr>';
            if (omset) omset.textContent = formatRp(0);
            if (count) count.textContent = "0";
            if (avg)   avg.textContent   = formatRp(0);
            return;
        }

        let no = 1;
        snap.forEach(doc => {
            const d = doc.data();
            totalOmset += d.total;

            let waktuStr = "-", waktuFull = "-";
            if (d.timestamp) {
                const dt = d.timestamp.toDate();
                waktuStr  = dt.toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
                waktuFull = dt.toLocaleString('id-ID');
            }

            const mBadge = d.paymentMethod === 'qris'
                ? '<span class="method-badge qris-badge">QRIS</span>'
                : '<span class="method-badge cash-badge">Tunai</span>';

            reportData.push({ no, waktu: waktuFull, items: d.items, total: d.total, method: d.paymentMethod || 'cash' });

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${no++}</td>
                <td><span class="time-chip">${waktuStr}</span></td>
                <td class="items-cell">${d.items}</td>
                <td>${mBadge}</td>
                <td><span class="amount-badge">${formatRp(d.total)}</span></td>`;
            tbody.appendChild(tr);
        });

        if (omset) omset.textContent = formatRp(totalOmset);
        if (count) count.textContent = snap.size;
        if (avg)   avg.textContent   = formatRp(snap.size > 0 ? totalOmset / snap.size : 0);

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row" style="color:var(--red)">Gagal memuat data.</td></tr>';
    }
}

// ── PDF Export ────────────────────────────────────────────────
window.exportPDF = () => {
    if (!window.jspdf) return Swal.fire('Error', 'Library PDF belum tersedia.', 'error');
    if (!reportData.length) return Swal.fire('Perhatian', 'Tidak ada data untuk diekspor.', 'warning');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const periodLabel = { all:'Semua Waktu', daily:'Hari Ini', weekly:'Minggu Ini', monthly:'Bulan Ini' }[currentPeriod];
    const now = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const storeName = storeSettings.name || 'Kasir Pintar';

    // Header bar
    doc.setFillColor(109, 74, 234);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(storeName, 14, 14);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Laporan Penjualan — ${periodLabel}`, 14, 22);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${now}`, 14, 29);
    if (storeSettings.address) doc.text(storeSettings.address, 14, 34);

    // Summary box
    const totalRev = reportData.reduce((s, r) => s + r.total, 0);
    const txCnt    = reportData.length;
    const avgTxVal = txCnt > 0 ? totalRev / txCnt : 0;

    doc.setFillColor(246, 244, 255);
    doc.roundedRect(14, 45, 182, 26, 4, 4, 'F');
    doc.setTextColor(30, 19, 64);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('RINGKASAN', 20, 54);
    doc.setFont(undefined, 'normal');
    doc.text(`Transaksi: ${txCnt}`, 20, 61);
    doc.text(`Total Pendapatan: ${formatRp(totalRev)}`, 75, 61);
    doc.text(`Rata-rata: ${formatRp(avgTxVal)}`, 150, 61);

    // Table
    doc.autoTable({
        startY: 77,
        head: [['No','Waktu','Produk','Metode','Total']],
        body: reportData.map(r => [r.no, r.waktu, r.items, r.method === 'qris' ? 'QRIS' : 'Tunai', formatRp(r.total)]),
        headStyles: { fillColor:[109,74,234], textColor:255, fontStyle:'bold', fontSize:9 },
        alternateRowStyles: { fillColor:[246,244,255] },
        styles: { fontSize:8, cellPadding:3, overflow:'linebreak' },
        columnStyles: { 0:{cellWidth:10}, 1:{cellWidth:32}, 2:{cellWidth:85}, 3:{cellWidth:22}, 4:{cellWidth:29} }
    });

    // Page footer
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        const ph = doc.internal.pageSize.height;
        doc.text(`Halaman ${i} / ${pages}`, 14, ph - 8);
        doc.text('Kasir Pintar', 196, ph - 8, { align:'right' });
    }

    const fn = `laporan-${currentPeriod}-${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.pdf`;
    doc.save(fn);
};

// ============================================================
//  SETTINGS & PRODUCTS  (Admin page)
// ============================================================
async function loadSettingsAndProducts() {
    if (!db) return;

    // Settings
    try {
        const snap = await db.collection("settings").doc("store").get();
        if (snap.exists) {
            storeSettings = snap.data();
            const display = storeSettings.logoText || storeSettings.name || 'Kasir Pintar';
            document.querySelectorAll(".logo-text").forEach(el => el.textContent = display);

            if (document.getElementById("storeNameInput")) {
                document.getElementById("storeNameInput").value    = storeSettings.name        || "";
                document.getElementById("storeLogoInput").value    = storeSettings.logoText    || "";
                document.getElementById("storeAddressInput").value = storeSettings.address     || "";
                document.getElementById("receiptNoteInput").value  = storeSettings.receiptNote || "";
            }
            if (storeSettings.qrisImage) {
                const prev = document.getElementById("qrisPreview");
                const wrap = document.getElementById("qrisPreviewWrap");
                if (prev) prev.src = storeSettings.qrisImage;
                if (wrap) wrap.style.display = "block";
            }
        }
    } catch (e) { console.error(e); }

    // Products
    try {
        const snap = await db.collection("products").orderBy("name").get();
        products = [];
        snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
        renderProducts();
        if (document.getElementById("adminProductTableBody")) renderAdminTable();
    } catch (e) { console.error(e); }
}

window.saveSettings = async () => {
    const name        = document.getElementById("storeNameInput").value.trim();
    const logo        = document.getElementById("storeLogoInput").value.trim();
    const address     = document.getElementById("storeAddressInput").value.trim();
    const receiptNote = document.getElementById("receiptNoteInput").value.trim();
    if (!name) return Swal.fire('Oops', 'Nama toko wajib diisi.', 'warning');
    try {
        await db.collection("settings").doc("store").set({ name, logoText:logo, address, receiptNote,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
        Object.assign(storeSettings, { name, logoText:logo, address, receiptNote });
        Swal.fire('Tersimpan', 'Pengaturan toko berhasil disimpan!', 'success');
    } catch (e) { Swal.fire('Error', 'Gagal menyimpan.', 'error'); }
};

window.saveQRIS = async () => {
    const file = document.getElementById("qrisImageInput")?.files[0];
    if (!file) return Swal.fire('Oops', 'Pilih gambar QRIS terlebih dahulu.', 'warning');
    Swal.fire({ title:'Mengupload...', allowOutsideClick:false, didOpen:()=>Swal.showLoading() });
    try {
        const img = await processImageFile(file, 600);
        await db.collection("settings").doc("store").set({ qrisImage:img }, { merge:true });
        storeSettings.qrisImage = img;
        const prev = document.getElementById("qrisPreview");
        const wrap = document.getElementById("qrisPreviewWrap");
        if (prev) prev.src = img;
        if (wrap) wrap.style.display = "block";
        Swal.fire('Berhasil!', 'Gambar QRIS berhasil disimpan.', 'success');
    } catch (e) { Swal.fire('Error', 'Gagal menyimpan QRIS.', 'error'); }
};

window.addProduct = async () => {
    const name  = document.getElementById("productName").value.trim();
    const price = parseInt(document.getElementById("productPrice").value);
    const file  = document.getElementById("productImage")?.files[0];
    if (!name || isNaN(price)) return Swal.fire('Oops', 'Nama dan Harga wajib diisi!', 'warning');
    try {
        const img = await processImageFile(file);
        const p   = { name, price, emoji:"📦" };
        if (img) p.image = img;
        await db.collection("products").add(p);
        Swal.fire('Sukses', 'Produk berhasil ditambahkan!', 'success');
        document.getElementById("productName").value  = "";
        document.getElementById("productPrice").value = "";
        const fi = document.getElementById("productImage");
        if (fi) fi.value = "";
        loadSettingsAndProducts();
    } catch (e) { Swal.fire('Error', 'Gagal menambahkan produk.', 'error'); }
};

window.deleteProduct = async id => {
    const res = await Swal.fire({
        title:'Hapus Produk?', text:"Produk akan dihapus permanen.", icon:'warning',
        showCancelButton:true, confirmButtonColor:'#EF4444', confirmButtonText:'Hapus', cancelButtonText:'Batal'
    });
    if (res.isConfirmed) {
        try {
            await db.collection("products").doc(id).delete();
            Swal.fire('Terhapus!', 'Produk berhasil dihapus.', 'success');
            loadSettingsAndProducts();
        } catch (e) { Swal.fire('Error', 'Gagal menghapus.', 'error'); }
    }
};

window.editProduct = async id => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const { value: vals } = await Swal.fire({
        title:'Edit Produk',
        html:`
            <div class="swal-label">Nama Produk</div>
            <input id="sw1" class="swal2-input" style="margin-top:4px" value="${p.name}">
            <div class="swal-label" style="margin-top:14px">Harga (Rp)</div>
            <input id="sw2" class="swal2-input" style="margin-top:4px" type="number" value="${p.price}">
            <div class="swal-label" style="margin-top:14px">Foto Baru (opsional)</div>
            <input id="sw3" class="swal2-file" type="file" accept="image/*" style="width:100%;margin-top:4px;box-sizing:border-box">`,
        focusConfirm:false, showCancelButton:true,
        confirmButtonText:'Simpan', cancelButtonText:'Batal', confirmButtonColor:'#6d4aea',
        preConfirm: async () => {
            const f  = document.getElementById('sw3').files[0] || null;
            const im = f ? await processImageFile(f) : null;
            return { name: document.getElementById('sw1').value, price: parseInt(document.getElementById('sw2').value), img: im };
        }
    });
    if (vals) {
        if (!vals.name || isNaN(vals.price)) return Swal.fire('Oops','Nama & Harga wajib diisi!','warning');
        try {
            const u = { name:vals.name, price:vals.price };
            if (vals.img) u.image = vals.img;
            await db.collection("products").doc(id).update(u);
            Swal.fire('Sukses','Produk berhasil diupdate!','success');
            loadSettingsAndProducts();
        } catch (e) { Swal.fire('Error','Gagal update.','error'); }
    }
};

window.duplicateProduct = async id => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    try {
        const np = { name:p.name+" (Copy)", price:p.price, emoji:p.emoji||"📦" };
        if (p.image) np.image = p.image;
        await db.collection("products").add(np);
        Swal.fire('Sukses','Produk diduplikat!','success');
        loadSettingsAndProducts();
    } catch (e) { Swal.fire('Error','Gagal duplikat.','error'); }
};

function renderAdminTable() {
    const tbody = document.getElementById("adminProductTableBody");
    if (!tbody) return;
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Belum ada produk terdaftar.</td></tr>';
        return;
    }
    tbody.innerHTML = "";
    products.forEach(p => {
        const imgHtml = p.image
            ? `<div class="admin-prod-img" style="background-image:url('${p.image}')"></div>`
            : `<div style="font-size:1.5rem;text-align:center">${p.emoji||"📦"}</div>`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align:center;vertical-align:middle">${imgHtml}</td>
            <td class="product-name-cell">${p.name}</td>
            <td class="price-cell">${formatRp(p.price)}</td>
            <td>
                <button class="btn-success" onclick="duplicateProduct('${p.id}')">Duplikat</button>
                <button class="btn-warning" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn-danger"  onclick="deleteProduct('${p.id}')">Hapus</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

// ============================================================
//  INIT
// ============================================================
window.onload = () => {
    loadSettingsAndProducts();
    if (document.getElementById("laporanTableBody")) loadLaporan('all');
};
