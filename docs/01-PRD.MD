# Product Requirements Document (PRD)

**Project Name** : Personal Finance Assistant

**Version** : 1.0.0

**Status** : Draft

**Author** : Rafli Fachriansyah

**Last Updated** : 2026-07-25

---

# 1. Executive Summary

## 1.1 Overview

Personal Finance Assistant adalah aplikasi pencatatan keuangan pribadi berbasis Telegram Bot yang memungkinkan pengguna mencatat pemasukan, pengeluaran, transfer antar wallet, serta melihat laporan keuangan tanpa perlu menggunakan aplikasi keuangan yang kompleks.

Aplikasi dirancang dengan prinsip **"Chat First Experience"**, yaitu seluruh aktivitas keuangan dapat dilakukan melalui percakapan dengan Telegram Bot.

Versi pertama (MVP) berfokus pada kemudahan pencatatan transaksi dan menjaga biaya operasional serendah mungkin.

---

## 1.2 Vision

Menjadi aplikasi pencatatan keuangan pribadi yang sederhana, cepat, dan mudah digunakan, sekaligus memiliki fondasi arsitektur yang siap dikembangkan menjadi AI Personal Finance Assistant di masa depan.

---

## 1.3 Objectives

Tujuan utama aplikasi:

- Mempermudah pencatatan transaksi.
- Mengurangi waktu input transaksi.
- Menyediakan laporan keuangan sederhana.
- Mendukung banyak wallet.
- Menyediakan arsitektur yang scalable.

---

# 2. Background

Banyak aplikasi pencatatan keuangan memiliki proses input yang panjang sehingga pengguna sering menunda atau bahkan tidak mencatat transaksi.

Contoh proses umum:

1. Membuka aplikasi.
2. Login.
3. Menekan tombol tambah.
4. Memilih jenis transaksi.
5. Memilih wallet.
6. Memilih kategori.
7. Mengisi nominal.
8. Menulis deskripsi.
9. Menyimpan transaksi.

Semakin panjang proses tersebut, semakin kecil kemungkinan pengguna mencatat seluruh transaksi.

Karena Telegram merupakan aplikasi yang sering dibuka setiap hari, pencatatan melalui Telegram diharapkan menjadi lebih cepat dan praktis.

---

# 3. Problem Statement

Masalah yang ingin diselesaikan:

- Pengguna malas mencatat transaksi.
- Proses pencatatan terlalu lama.
- Sulit mengetahui saldo setiap wallet.
- Bukti transaksi tercecer.
- Sulit melihat histori transaksi.

---

# 4. Goals

Versi MVP memiliki tujuan berikut:

- Mencatat Income
- Mencatat Expense
- Transfer antar Wallet
- Mengelola Wallet
- Mengelola Category
- Menyimpan Attachment menggunakan Telegram File ID
- Menampilkan Report

---

# 5. Non Goals

Versi pertama tidak mencakup:

- OCR
- AI Assistant
- Dashboard Web
- Export Excel
- Export PDF
- Multi Currency
- Multi Language
- Budget Planning
- Reminder
- Notification
- Sinkronisasi Bank
- Integrasi E-Wallet
- Voice Command
- Machine Learning

---

# 6. Target User

## Primary User

Pengguna individu.

Karakteristik:

- Menggunakan Telegram setiap hari.
- Memiliki lebih dari satu rekening.
- Ingin mencatat transaksi dengan cepat.

Estimasi pengguna:

1–20 pengguna.

---

# 7. Scope

## In Scope

### User

- Registrasi otomatis melalui Telegram.
- Profil pengguna.

### Wallet

- Tambah wallet.
- Edit wallet.
- Hapus wallet.
- Default wallet.

### Category

- Income Category.
- Expense Category.

### Transaction

- Income.
- Expense.
- Transfer.

### Attachment

- Upload gambar.
- Upload PDF.
- Simpan Telegram File ID.

### Report

- Daily.
- Weekly.
- Monthly.
- Yearly.

---

## Out of Scope

Semua fitur selain yang berada pada bagian In Scope akan menjadi roadmap versi berikutnya.

---

# 8. Functional Requirements

## FR-001

Sistem harus dapat membuat akun otomatis saat user pertama kali menggunakan Telegram Bot.

---

## FR-002

Sistem harus mendukung banyak wallet.

---

## FR-003

User dapat membuat transaksi Income.

---

## FR-004

User dapat membuat transaksi Expense.

---

## FR-005

User dapat melakukan transfer antar wallet.

---

## FR-006

User dapat membuat kategori baru.

---

## FR-007

User dapat mengunggah lampiran transaksi.

---

## FR-008

Lampiran disimpan menggunakan Telegram File ID.

---

## FR-009

User dapat melihat histori transaksi.

---

## FR-010

User dapat melihat laporan harian.

---

## FR-011

User dapat melihat laporan mingguan.

---

## FR-012

User dapat melihat laporan bulanan.

---

## FR-013

User dapat melihat laporan tahunan.

---

# 9. Non Functional Requirements

## Performance

Respon Telegram maksimal 2 detik.

---

## Reliability

Data transaksi tidak boleh hilang.

---

## Availability

Target uptime:

99%

---

## Security

Semua input wajib divalidasi.

---

## Scalability

Sistem harus dapat dikembangkan menjadi:

- OCR
- Dashboard Web
- AI Assistant

tanpa mengubah struktur database utama.

---

## Cost

Target biaya operasional:

Sedekat mungkin dengan Rp0/bulan menggunakan layanan free tier.

---

# 10. User Stories

## Wallet

Sebagai pengguna,

Saya ingin memiliki banyak wallet,

Sehingga saya dapat memisahkan uang berdasarkan rekening atau dompet digital.

---

## Expense

Sebagai pengguna,

Saya ingin mencatat pengeluaran,

Sehingga saya mengetahui ke mana uang saya digunakan.

---

## Income

Sebagai pengguna,

Saya ingin mencatat pemasukan,

Sehingga saya mengetahui sumber pendapatan saya.

---

## Transfer

Sebagai pengguna,

Saya ingin memindahkan saldo antar wallet,

Sehingga saldo masing-masing wallet tetap akurat.

---

## Report

Sebagai pengguna,

Saya ingin melihat laporan,

Sehingga saya mengetahui kondisi keuangan saya.

---

# 11. Business Rules

- Satu User dapat memiliki banyak Wallet.
- Satu Wallet hanya dimiliki oleh satu User.
- Wallet wajib memiliki nama unik.
- Nominal transaksi harus lebih besar dari nol.
- Transfer bukan Income.
- Transfer bukan Expense.
- Wallet asal dan tujuan transfer tidak boleh sama.
- Attachment bersifat opsional.
- File fisik tidak disimpan oleh aplikasi.
- Lampiran direferensikan menggunakan Telegram File ID.

---

# 12. Acceptance Criteria

Project dianggap selesai apabila:

- User dapat menggunakan Telegram Bot.
- User dapat membuat Wallet.
- User dapat membuat Category.
- User dapat mencatat Income.
- User dapat mencatat Expense.
- User dapat melakukan Transfer.
- User dapat mengunggah Attachment.
- User dapat melihat Report.
- Seluruh data tersimpan di PostgreSQL.
- Tidak ada perubahan struktur setelah Design Freeze.

---

# 13. Constraints

- Platform utama adalah Telegram.
- Database menggunakan PostgreSQL.
- ORM menggunakan Prisma.
- Backend menggunakan NestJS.
- Storage menggunakan Telegram File ID.
- Mengutamakan layanan free tier.

---

# 14. Risks

| Risiko | Mitigasi |
|---------|----------|
| Telegram API berubah | Gunakan abstraction layer pada Telegram Service |
| Free tier habis | Siapkan migrasi ke VPS |
| Pengguna lupa mencatat transaksi | Roadmap Reminder pada versi berikutnya |
| OCR tidak akurat | Tidak menjadi bagian MVP |

---

# 15. Success Metrics

## Functional

- Semua fitur MVP berjalan.

## Performance

- Response rata-rata < 2 detik.

## Reliability

- Tidak ada kehilangan data transaksi.

## User Satisfaction

- Pengguna dapat mencatat transaksi tanpa memerlukan panduan tambahan.

---

# 16. Future Roadmap

## Version 1.1

- OCR
- Dashboard Web

---

## Version 2.0

- AI Chat
- AI Categorization
- AI Insight
- Budget Planning

---

# 17. Design Freeze

Setelah dokumen ini disetujui:

- Tidak boleh mengubah requirement.
- Tidak boleh menambah fitur MVP.
- Tidak boleh mengubah struktur utama tanpa membuat versi baru.

Seluruh proses pengembangan berikutnya harus mengikuti PRD ini.