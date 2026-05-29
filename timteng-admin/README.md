# Admin Dashboard — Pendidikan Timur Tengah

Dashboard admin untuk memantau data pendaftar yang masuk melalui Google Form.

## Arsitektur

```
[Calon Mahasiswa] → [Landing Page index.html] → [Google Form]
                                                      ↓ (otomatis)
                                               [Google Sheets]
                                                      ↓ (Sheets API)
                                        [Next.js Admin / Vercel]
                                                      ↓
                                          [Dashboard Admin (kamu)]
```

---

## Bagian 1 — Setup Google Sheets API

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru (misal: `timteng-admin`)
3. Di menu kiri → **APIs & Services** → **Enable APIs and Services**
4. Cari dan aktifkan **Google Sheets API**
5. Buka **APIs & Services** → **Credentials** → **Create Credentials** → **Service Account**
6. Isi nama service account, klik **Done**
7. Klik service account yang baru dibuat → tab **Keys** → **Add Key** → **JSON**
8. Download file JSON → simpan aman
9. Dari file JSON, copy:
   - `client_email` → paste ke `GOOGLE_SERVICE_ACCOUNT_EMAIL` di `.env.local`
   - `private_key` → paste ke `GOOGLE_PRIVATE_KEY` di `.env.local` (pastikan dalam tanda kutip ganda)
10. Buka Google Sheets hasil Google Form
11. Klik **Share** → tambahkan email service account sebagai **Viewer**
12. Copy ID Sheets dari URL:
    ```
    https://docs.google.com/spreadsheets/d/[ID_INI_YANG_DICOPY]/edit
    ```
    Paste ke `GOOGLE_SHEETS_ID` di `.env.local`

---

## Bagian 2 — Jalankan Lokal

```bash
# Install dependencies
npm install

# Copy template env
cp .env.local.example .env.local

# Edit .env.local dengan text editor dan isi semua nilai:
# - GOOGLE_SHEETS_ID
# - GOOGLE_SERVICE_ACCOUNT_EMAIL
# - GOOGLE_PRIVATE_KEY
# - ADMIN_USERNAME
# - ADMIN_PASSWORD
# - SESSION_SECRET (buat string random panjang, minimal 32 karakter)

# Jalankan dev server
npm run dev

# Buka browser: http://localhost:3000/admin/login
```

---

## Bagian 3 — Deploy ke Vercel

### Cara A — Via CLI

```bash
npm install -g vercel
vercel

# Ikuti wizard setup
# Setelah deploy pertama, tambahkan env vars:
vercel env add GOOGLE_SHEETS_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add ADMIN_USERNAME
vercel env add ADMIN_PASSWORD
vercel env add SESSION_SECRET
vercel env add NEXT_PUBLIC_APP_URL

# Redeploy agar env vars aktif
vercel --prod
```

### Cara B — Via GitHub (Direkomendasikan)

1. Push project ke repository GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/timteng-admin.git
   git push -u origin main
   ```
2. Buka [vercel.com](https://vercel.com) → **Add New Project**
3. Import repository GitHub tadi
4. Di bagian **Environment Variables**, tambahkan semua variabel dari `.env.local`
5. Klik **Deploy**

Vercel akan otomatis deploy setiap kali ada push ke branch `main`.

---

## Bagian 4 — Integrasi dengan `index.html`

Landing page `index.html` **tidak perlu diubah**. Google Form tetap menerima pendaftaran seperti biasa. Dashboard ini hanya **membaca** data yang masuk ke Google Sheets — tidak menggantikan form.

Jika ingin, kamu bisa deploy `index.html` di Vercel juga (sebagai static site terpisah).

---

## Fitur Dashboard

- **Login aman** — JWT httpOnly cookie, session 8 jam
- **Tabel pendaftar** — semua data dari Google Sheets
- **Search real-time** — cari di semua kolom
- **Filter negara tujuan** — dropdown otomatis dari data
- **Sorting kolom** — klik header untuk sort asc/desc
- **Paginasi** — 20 baris per halaman
- **Export CSV** — download data yang sedang tampil (dengan BOM UTF-8)
- **Refresh data** — ambil ulang dari Google Sheets tanpa reload halaman
- **Statistik** — total, hari ini, minggu ini, bulan ini
- **Responsive** — sidebar collapse di mobile
- **Route protection** — middleware redirect ke login jika belum auth

---

## Struktur File

```
timteng-admin/
├── app/
│   ├── layout.tsx                  ← root layout + Google Fonts
│   ├── page.tsx                    ← redirect ke /admin/login
│   ├── admin/
│   │   ├── login/page.tsx          ← halaman login admin
│   │   └── dashboard/page.tsx      ← dashboard utama (protected)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      ← POST login, set cookie
│       │   └── logout/route.ts     ← POST logout, hapus cookie
│       └── pendaftar/route.ts      ← GET data dari Google Sheets
├── lib/
│   ├── sheets.ts                   ← helper Google Sheets API
│   └── auth.ts                     ← JWT session helper
├── middleware.ts                   ← proteksi route /admin/dashboard
├── .env.local.example              ← template env vars
├── vercel.json                     ← konfigurasi Vercel
└── README.md                       ← ini
```

---

## Troubleshooting

**Error: "The caller does not have permission"**
→ Pastikan email service account sudah di-share ke Google Sheets sebagai Viewer.

**Error: "invalid_grant"**
→ Pastikan `GOOGLE_PRIVATE_KEY` di `.env.local` dibungkus tanda kutip ganda dan `\n` di dalam kunci tidak ter-escape dua kali.

**Dashboard redirect ke login terus**
→ Pastikan `SESSION_SECRET` di-set dan tidak kosong.

**Data tidak muncul**
→ Pastikan nama sheet di Google Sheets adalah `Sheet1`. Jika berbeda, ubah `range` di `lib/sheets.ts`.
