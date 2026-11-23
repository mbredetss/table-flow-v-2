# TableFlow — 3 Frontend Architecture

Aplikasi frontend TableFlow dipisahkan menjadi 3 proyek Angular independen di dalam direktori `fe/` berdasarkan perannya masing-masing:

| Proyek | Port | Deskripsi | Peran / Scope Akses |
|---|---|---|---|
| **Customer** (`fe/customer`) | `http://localhost:4200` | Antarmuka Pelanggan Meja | Pemilihan Menu, Detail Item & Catatan, Keranjang, Scan Meja Kamera Asli, Pembayaran QRIS, Live Tracking Pesanan (SSE), Riwayat Pesanan |
| **Cashier** (`fe/cashier`) | `http://localhost:4201` | Antarmuka Kasir & Dapur | Papan Kanban Pesanan (4 kolom status), Notifikasi Lonceng Pesanan Baru, Stream Dapur Realtime (`/sse/dashboard`), Pembaruan Status Cepat |
| **Admin** (`fe/admin`) | `http://localhost:4202` | Antarmuka Manajemen Restoran | Manajemen Katalog Menu (Add/Edit dengan banner pesan kesalahan server, Hapus, Toggle Ketersediaan), Registrasi Meja & Unduh QR PNG |

---

## Cara Menjalankan

Semua proyek telah terkonfigurasi dengan proxy ke backend (`http://localhost:3000`).

### 1. Menjalankan Customer Portal (Port 4200)
```bash
cd fe/customer
npm start
# atau dari root fe: npm run start:customer
```
Akses di browser: [http://localhost:4200](http://localhost:4200)

### 2. Menjalankan Cashier Kitchen Board (Port 4201)
```bash
cd fe/cashier
npm start
# atau dari root fe: npm run start:cashier
```
Akses di browser: [http://localhost:4201](http://localhost:4201)

### 3. Menjalankan Admin Restaurant Management (Port 4202)
```bash
cd fe/admin
npm start
# atau dari root fe: npm run start:admin
```
Akses di browser: [http://localhost:4202](http://localhost:4202)
