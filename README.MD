# Personal Finance Assistant

![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![Status](https://img.shields.io/badge/status-Planning-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

# Overview

Personal Finance Assistant adalah aplikasi pencatatan keuangan pribadi berbasis Telegram Bot yang dirancang untuk membantu pengguna mencatat pemasukan, pengeluaran, transfer antar wallet, dan melihat laporan keuangan dengan cepat tanpa harus membuka aplikasi keuangan yang kompleks.

Filosofi utama aplikasi ini adalah:

> **"Catat keuangan semudah mengirim chat."**

Pengguna cukup membuka Telegram, mengirim perintah atau menekan tombol yang tersedia, kemudian transaksi langsung tersimpan.

Project ini dibuat menggunakan pendekatan **Documentation First Development**, yaitu seluruh desain sistem diselesaikan terlebih dahulu sebelum proses implementasi dimulai.

---

# Vision

Membangun aplikasi pencatatan keuangan yang:

- Mudah digunakan
- Cepat
- Ringan
- Gratis
- Dapat dikembangkan menjadi AI Finance Assistant

---

# Goals

Versi pertama (MVP) memiliki tujuan utama:

- Mencatat pemasukan
- Mencatat pengeluaran
- Mengelola banyak wallet
- Melakukan transfer antar wallet
- Menyimpan referensi bukti transaksi menggunakan Telegram File ID
- Menampilkan laporan sederhana

---

# Non Goals (MVP)

Fitur berikut **tidak** termasuk dalam versi pertama.

- OCR
- AI Chat
- AI Financial Advisor
- Dashboard Web
- Multi User Organization
- Export PDF
- Export Excel
- Sinkronisasi Bank
- Integrasi E-Wallet
- Budget Planning
- Reminder
- Notification
- Voice Command
- Machine Learning
- Multi Currency

Semua fitur tersebut akan dikembangkan pada versi berikutnya.

---

# Target User

Project ini ditujukan untuk:

- Personal
- Keluarga
- Teman dekat

Estimasi pengguna aktif:

```
1–20 User
```

---

# Technology Stack

## Backend

- NestJS
- TypeScript
- Prisma ORM

---

## Database

- PostgreSQL
- Supabase

---

## Bot

- Telegram Bot API

---

## Storage

Telegram File Storage

Aplikasi **tidak menyimpan file fisik**.

Yang disimpan hanya:

```
telegram_file_id
```

Dengan pendekatan ini biaya penyimpanan menjadi sangat kecil.

---

## Hosting

Backend

- Railway
- Render
- VPS (Opsional)

Database

- Supabase

---

# Project Architecture

```
Telegram User
      │
      ▼
Telegram Bot
      │
      ▼
Webhook
      │
      ▼
NestJS API
      │
      ▼
Business Service
      │
      ▼
Prisma ORM
      │
      ▼
PostgreSQL
```

---

# Project Structure

```
finance-assistant/

├── backend/
│
├── frontend/
│
├── database/
│
├── docs/
│   ├── 01-PRD.md
│   ├── 02-System-Design.md
│   ├── 03-Database.md
│   └── 04-Development-Plan.md
│
├── .env.example
├── .gitignore
├── LICENSE
├── CHANGELOG.md
└── README.md
```

---

# Development Methodology

Project menggunakan pendekatan:

```
Planning

↓

Requirement

↓

Design

↓

Design Freeze

↓

Development

↓

Testing

↓

Deployment
```

Tidak diperbolehkan melakukan perubahan struktur setelah memasuki tahap **Design Freeze**.

---

# Core Modules

## User

Mengelola data pengguna Telegram.

---

## Wallet

Mengelola sumber dana pengguna.

Contoh:

- Cash
- BCA
- Mandiri
- GoPay
- OVO

---

## Category

Mengelola kategori transaksi.

Income

Expense

---

## Transaction

Mengelola:

- Income
- Expense
- Transfer

---

## Attachment

Menyimpan referensi lampiran transaksi menggunakan Telegram File ID.

---

## Report

Menghasilkan laporan:

- Harian
- Mingguan
- Bulanan
- Tahunan

---

# Development Principles

Project mengikuti prinsip berikut.

## Documentation First

Dokumentasi dibuat terlebih dahulu.

---

## Clean Architecture

Business Logic dipisahkan dari Framework.

---

## Modular

Setiap fitur memiliki module masing-masing.

---

## SOLID Principle

Seluruh kode mengikuti SOLID Principle.

---

## DRY

Don't Repeat Yourself.

---

## KISS

Keep It Simple.

---

## YAGNI

You Aren't Gonna Need It.

---

# Design Rules

Selama proses development berlaku aturan berikut.

✅ Database tidak boleh berubah setelah Design Freeze.

✅ API Contract tidak boleh berubah setelah Design Freeze.

✅ Folder Structure tidak boleh berubah setelah Design Freeze.

✅ Naming Convention harus konsisten.

✅ Business Logic tidak boleh berada di Controller.

✅ Seluruh Query Database menggunakan Prisma ORM.

---

# Version Roadmap

## v1.0

- Telegram Bot
- Wallet
- Transaction
- Report
- Attachment

---

## v1.1

- OCR
- Dashboard Web

---

## v2.0

- AI Chat
- AI Categorization
- AI Financial Insight

---

## Documentation Roadmap

```
README

↓

01-PRD.md

↓

02-System-Design.md

↓

03-Database.md

↓

04-Development-Plan.md

↓

Design Freeze

↓

Coding
```

---

# Current Status

| Document | Status |
|----------|--------|
| README | ✅ Completed |
| PRD | ⏳ Pending |
| System Design | ⏳ Pending |
| Database Design | ⏳ Pending |
| Development Plan | ⏳ Pending |

---

# License

MIT License

---

# Author

Rafli Fachriansyah

---

# Notes

Repository ini dibangun sebagai project jangka panjang.

Seluruh keputusan arsitektur harus mengikuti dokumentasi.

Apabila terdapat kebutuhan fitur baru, maka fitur tersebut harus masuk ke roadmap versi berikutnya dan tidak mengubah struktur inti sistem yang telah ditetapkan.