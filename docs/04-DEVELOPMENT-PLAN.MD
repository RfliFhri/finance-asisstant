# Development Plan

Project : Personal Finance Assistant

Version : 1.0.0

Status : Final Draft

Last Update : 25 July 2026

---

# Overview

Dokumen ini menjadi panduan implementasi project dari awal hingga deployment.

Seluruh pengembangan wajib mengikuti urutan pada dokumen ini.

Tidak diperbolehkan mengubah Database Design maupun System Design setelah memasuki tahap Development.

---

# Development Flow

Planning

↓

PRD

↓

System Design

↓

Database Design

↓

Development

↓

Testing

↓

Deployment

↓

Maintenance

---

# Milestone

Phase 1

Project Initialization

↓

Phase 2

Database

↓

Phase 3

Telegram Bot

↓

Phase 4

Authentication

↓

Phase 5

Transaction Flow

↓

Phase 6

OCR Integration

↓

Phase 7

Attachment

↓

Phase 8

Report

↓

Phase 9

Testing

↓

Phase 10

Deployment

---

# Phase 1 — Project Initialization

## Objective

Mempersiapkan fondasi project.

## Tasks

- Create Git Repository
- Initialize NestJS
- Install Prisma
- Configure PostgreSQL
- Configure Supabase
- Configure Environment Variable
- Configure ESLint
- Configure Prettier
- Configure Husky
- Setup GitHub

## Deliverables

- Project dapat dijalankan
- Database berhasil terkoneksi
- Environment siap

---

# Phase 2 — Database

## Objective

Membangun seluruh struktur database.

## Tasks

- Create Prisma Schema
- Generate Migration
- Run Migration
- Seed Default Categories
- Seed Default Wallet
- Verify Relations

## Deliverables

- Seluruh tabel tersedia
- Relasi berjalan
- Migration berhasil

---

# Phase 3 — Telegram Bot

## Objective

Bot dapat menerima pesan dari Telegram.

## Tasks

- Create Telegram Bot
- Configure Bot Token
- Configure Webhook
- Receive Update
- Handle /start
- Register User Otomatis
- Main Menu

## Deliverables

User berhasil masuk ke sistem melalui Telegram.

---

# Phase 4 — Authentication

## Objective

Mengidentifikasi pengguna berdasarkan Telegram.

## Tasks

- Create User
- Find Existing User
- Validate Telegram ID
- User Context
- Middleware

## Deliverables

Seluruh request memiliki User yang valid.

---

# Phase 5 — Transaction Flow

## Objective

User dapat mencatat transaksi secara manual.

## Tasks

### Expense

- Pilih Wallet
- Input Nominal
- Pilih Category
- Input Deskripsi
- Konfirmasi
- Simpan

---

### Income

- Pilih Wallet
- Input Nominal
- Pilih Category
- Input Deskripsi
- Konfirmasi
- Simpan

---

### Transfer

- Pilih Wallet Asal
- Pilih Wallet Tujuan
- Input Nominal
- Deskripsi
- Konfirmasi
- Simpan

---

### History

- List Transaction
- Detail Transaction
- Edit Transaction
- Delete Transaction

## Deliverables

Seluruh transaksi manual berjalan.

---

# Phase 6 — OCR Integration

## Objective

Mempercepat input transaksi menggunakan foto.

## Flow

Upload Foto

↓

Telegram

↓

Backend

↓

OCR Service

↓

Extract Text

↓

Parser

↓

Preview

↓

User Konfirmasi

↓

Create Transaction

---

## Tasks

### Receive Attachment

- Image
- PDF

---

### OCR Service

- Kirim file ke OCR Engine
- Terima hasil OCR

---

### Parser

Ekstrak:

- Merchant
- Nominal
- Tanggal
- Jam
- Nomor Referensi (jika ada)

---

### Preview

Bot mengirim hasil:

Merchant

Nominal

Tanggal

Deskripsi

---

### Confirmation

Button

- Simpan
- Edit
- Batal

---

### Save Transaction

Jika user memilih Simpan

↓

Data masuk Database

## Deliverables

User dapat membuat transaksi hanya dengan mengirim foto.

---

# Phase 7 — Attachment

## Objective

Menghubungkan transaksi dengan lampiran.

## Tasks

- Simpan telegram_file_id
- Simpan metadata file
- Hubungkan dengan Transaction
- Lihat Lampiran

## Deliverables

Lampiran berhasil tersimpan.

---

# Phase 8 — Report

## Objective

Menampilkan laporan keuangan.

## Tasks

### Daily Report

### Weekly Report

### Monthly Report

### Yearly Report

### Wallet Summary

### Category Summary

Semua laporan dihitung secara realtime.

## Deliverables

Report tersedia melalui Telegram.

---

# Phase 9 — Testing

## Objective

Memastikan seluruh fitur berjalan.

## Unit Test

- Transaction
- OCR Parser
- Report

---

## Integration Test

- Telegram
- OCR
- Database

---

## Manual Test

- Expense
- Income
- Transfer
- OCR
- Report

---

## Bug Fix

Critical

↓

Major

↓

Minor

## Deliverables

Tidak ada bug kritis.

---

# Phase 10 — Deployment

## Objective

Mempublikasikan aplikasi.

## Backend

- Deploy ke Vercel

---

## Database

- Supabase Production

---

## Telegram

- Update Webhook

---

## Environment

- Production Variable

---

## Final Testing

- Telegram
- OCR
- Database
- Report

## Deliverables

Bot siap digunakan.

---

# MVP Checklist

- User Login melalui Telegram
- Wallet Management
- Category Management
- Manual Transaction
- OCR Transaction
- Attachment
- Report
- Deployment

Semua item harus selesai sebelum versi 1.0 dirilis.

---

# Version 1.1

- Dashboard Web
- Export Excel
- Export PDF

---

# Version 2.0

- AI Categorization
- AI Chat
- AI Financial Insight
- Reminder
- Budget Planning

---

# Definition of Done

Project dinyatakan selesai apabila:

✓ Seluruh fitur pada PRD selesai

✓ Database sesuai Design

✓ System Design tidak berubah

✓ Telegram Bot berjalan

✓ OCR berjalan

✓ Report berjalan

✓ Deployment berhasil

✓ Dokumentasi diperbarui