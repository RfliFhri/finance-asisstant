# Finance Assistant Backend

Backend NestJS untuk Telegram Personal Finance Assistant. Database menggunakan PostgreSQL/Supabase melalui Prisma.

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, dan `TELEGRAM_WEBHOOK_SECRET`.
2. Pasang package dan buat Prisma Client:

   ```bash
   npm install
   npx prisma generate
   ```

3. Jalankan backend:

   ```bash
   npm run start:dev
   ```

4. Periksa health endpoint:

   ```bash
   curl http://localhost:3000/health
   ```

## Database

Migration awal berada di `prisma/migrations`. Untuk database baru yang dapat memakai direct connection:

```bash
npx prisma migrate deploy
```

Supabase direct connection memerlukan IPv6. Bila jaringan hanya IPv4, gunakan **Session Pooler** (port `5432`) untuk menjalankan migrasi dari mesin lokal. Untuk runtime Vercel gunakan **Transaction Pooler** (port `6543`) dan tambahkan `?pgbouncer=true` pada URL.

## Webhook Telegram

Backend menerima update pada `POST /telegram/webhook`. Saat `TELEGRAM_WEBHOOK_SECRET` terisi, request harus mempunyai header `X-Telegram-Bot-Api-Secret-Token` yang sama.

Set webhook sesudah backend memiliki URL HTTPS publik:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=https://<DOMAIN>/telegram/webhook" \
  --data-urlencode "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## Deploy ke Vercel

Atur Root Directory project Vercel ke `backend`, Framework Preset ke `Other`, Build Command ke `npm run build`, dan kosongkan Output Directory. Tambahkan environment variable dari `.env` pada Vercel Project Settings. Khusus `DATABASE_URL`, gunakan URL **Transaction Pooler** Supabase (port `6543`), bukan Session Pooler. Setelah deployment, gunakan domain Vercel pada URL webhook di atas. Entrypoint serverless tersedia di `api/index.ts` dan semua route, termasuk `/health` serta `/telegram/webhook`, diarahkan ke sana.

## Perintah bot

- Tekan `➕ Catat Pemasukan` atau `➖ Catat Pengeluaran`. Jika terdapat beberapa rekening, bot menampilkan tombol pilihan rekening, kategori, nominal, dan keterangan opsional secara bertahap.
- Tekan `↔️ Transfer`. Bot menampilkan pilihan wallet asal dan tujuan, kemudian meminta nominal serta keterangan opsional.
- Ketik `/cancel` kapan saja untuk membatalkan flow yang sedang berjalan.
- `/start` — registrasi dan seed wallet/kategori default.
- `/wallet`, `/wallet add Nama`, `/wallet rename Lama|Baru`, `/wallet delete Nama`.
- `/category income Nama`, `/category expense Nama`, `/category income delete Nama`.
- `/income Wallet Kategori Nominal Deskripsi`.
- `/expense Wallet Kategori Nominal Deskripsi`.
- `/transfer WalletAsal WalletTujuan Nominal Deskripsi`.
- `/history`, `/transaction edit ID Deskripsi`, `/transaction delete ID`.
- `/report daily|weekly|monthly|yearly`.
- Kirim foto/dokumen dengan caption `/attach ID_TRANSAKSI`.

## Verifikasi

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```
