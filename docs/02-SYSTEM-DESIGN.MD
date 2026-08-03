# System Design Document

**Project** : Personal Finance Assistant

**Version** : 1.0.0

**Status** : Draft

**Last Updated** : 2026-07-25

---

# 1. Purpose

Dokumen ini mendefinisikan desain teknis sistem yang akan digunakan selama proses pengembangan.

Seluruh implementasi backend, database, dan Telegram Bot wajib mengikuti dokumen ini.

Dokumen ini menjadi acuan utama sebelum memasuki tahap implementasi.

---

# 2. Design Principles

Project ini dibangun berdasarkan prinsip berikut.

- Clean Architecture
- Modular Monolith
- Domain Driven Design (Lightweight)
- SOLID Principle
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- YAGNI (You Aren't Gonna Need It)

---

# 3. Technology Stack

## Backend

- NestJS
- TypeScript

---

## ORM

- Prisma ORM

---

## Database

- PostgreSQL
- Supabase

---

## Bot Platform

- Telegram Bot API

---

## Storage

- Telegram File Storage (`telegram_file_id`)

Server **tidak menyimpan file fisik**.

---

## Deployment (MVP)

Backend

- Vercel

Database

- Supabase

---

## Deployment (Future)

- Railway
- VPS
- Docker

Deployment dapat berubah tanpa mengubah source code karena tidak memengaruhi domain maupun database.

---

# 4. High Level Architecture

```
                    Telegram User
                           │
                           ▼
                  Telegram Bot API
                           │
                           ▼
                     Telegram Webhook
                           │
                           ▼
                     NestJS Application
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      User Module     Wallet Module   Transaction Module
                                              │
                                              ▼
                                       Category Module
                                              │
                                              ▼
                                       Attachment Module
                                              │
                                              ▼
                                          Prisma ORM
                                              │
                                              ▼
                                          PostgreSQL
```

---

# 5. Architecture Style

Project menggunakan **Modular Monolith**.

Setiap domain dipisahkan menjadi module sendiri namun tetap berjalan dalam satu aplikasi.

Alasan:

- Mudah dikembangkan.
- Mudah dipelajari.
- Cocok untuk 1 developer.
- Tidak memiliki kompleksitas Microservice.
- Mudah dipecah menjadi Microservice apabila diperlukan.

---

# 6. Layer Architecture

```
Presentation Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer
```

---

## Presentation Layer

Bertanggung jawab menerima request.

Berisi:

- Telegram Controller

Tidak diperbolehkan memiliki Business Logic.

---

## Application Layer

Berisi:

- Service
- Use Case
- Validation

Seluruh Business Logic berada pada layer ini.

---

## Domain Layer

Berisi:

- Entity
- Interface
- Business Rules

Layer ini tidak bergantung pada NestJS.

---

## Infrastructure Layer

Berisi:

- Prisma
- Telegram SDK
- Environment
- External Service

---

# 7. Module List

```
User

Wallet

Category

Transaction

Attachment

Report

Telegram

Settings
```

Setiap module berdiri sendiri.

---

# 8. Folder Structure

```
backend/
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   │
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── config/
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   │
│   ├── common/
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── enums/
│   │   ├── exceptions/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── interfaces/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── telegram/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── telegram.module.ts
│   │
│   ├── users/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── users.module.ts
│   │
│   ├── categories/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── categories.module.ts
│   │
│   ├── transactions/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── parser/
│   │   └── transactions.module.ts
│   │
│   ├── attachments/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── attachments.module.ts
│   │
│   ├── ocr/
│   │   ├── services/
│   │   └── ocr.module.ts
│   │
│   ├── ai/
│   │   ├── prompts/
│   │   ├── services/
│   │   └── ai.module.ts
│   │
│   ├── dashboard/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── dashboard.module.ts
│   │
│   └── health/
│       ├── health.controller.ts
│       └── health.module.ts
│
├── test/
│
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

Seluruh module mengikuti struktur yang sama.

---

# 9. Dependency Rules

Dependency hanya boleh mengalir ke bawah.

```
Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database
```

Tidak diperbolehkan:

- Controller memanggil Prisma.
- Controller memanggil Database.
- Repository memanggil Controller.
- Service memanggil Controller.

---

# 10. Request Flow

```
Telegram User

↓

Telegram Bot

↓

Webhook

↓

Telegram Controller

↓

Validation

↓

Service

↓

Repository

↓

Prisma

↓

Database

↓

Response
```

---

# 11. Transaction Flow

## Expense

```
User

↓

Expense

↓

Validation

↓

Create Transaction

↓

Save Database

↓

Return Success
```

---

## Income

```
User

↓

Income

↓

Validation

↓

Create Transaction

↓

Save Database

↓

Return Success
```

---

## Transfer

```
User

↓

Transfer

↓

Validation

↓

Create Transfer Transaction

↓

Save Database

↓

Return Success
```

Transfer tidak dihitung sebagai Income maupun Expense.

---

# 12. Wallet Balance Strategy

Wallet **tidak memiliki kolom balance**.

Saldo dihitung secara realtime berdasarkan histori transaksi.

```
Current Balance

=

Total Income

-

Total Expense

+

Transfer In

-

Transfer Out
```

## Alasan

- Menghindari data tidak sinkron.
- Tidak ada duplikasi data.
- Edit transaksi langsung memengaruhi saldo.
- Delete transaksi langsung memengaruhi saldo.

Transactions menjadi **Source of Truth**.

---

# 13. Attachment Strategy

File fisik tidak disimpan.

Yang disimpan hanya metadata.

```
telegram_file_id

telegram_unique_file_id

file_name

mime_type

file_size
```

Telegram bertindak sebagai media penyimpanan lampiran.

---

# 14. Report Strategy

Report tidak memiliki tabel sendiri.

Semua laporan dihitung dari:

- Transactions
- Wallet
- Category

Dengan demikian tidak ada data yang diduplikasi.

---

# 15. Authentication

Authentication menggunakan Telegram.

Identitas utama:

```
telegram_user_id
```

Tidak menggunakan:

- Username
- Password
- JWT
- Session

---

# 16. Authorization

Versi MVP hanya memiliki satu role.

```
USER
```

Admin belum tersedia.

---

# 17. Validation

Semua request divalidasi menggunakan:

- Validation Pipe
- class-validator

Validasi dilakukan sebelum Business Logic dijalankan.

---

# 18. Error Handling

Format Error

```json
{
  "success": false,
  "message": "Validation Error",
  "error": "INVALID_AMOUNT",
  "data": null
}
```

---

# 19. Success Response

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Semua endpoint menggunakan format yang sama.

---

# 20. Environment

```
development

testing

production
```

Konfigurasi dipisahkan menggunakan Environment Variable.

Tidak diperbolehkan melakukan hardcode.

---

# 21. Logging

MVP menggunakan Logger bawaan NestJS.

Belum menggunakan:

- ELK
- Grafana
- Loki

---

# 22. Security

Seluruh query database menggunakan Prisma.

Tidak diperbolehkan menggunakan Raw SQL kecuali memiliki alasan teknis yang jelas.

Semua input wajib divalidasi.

---

# 23. Scalability

Arsitektur dirancang agar mendukung penambahan:

- OCR
- Dashboard Web
- AI Assistant
- Reminder
- Notification

tanpa mengubah struktur domain utama.

---

# 24. Design Freeze

Setelah dokumen ini disetujui:

Tidak diperbolehkan mengubah:

- Architecture
- Module
- Folder Structure
- Layer
- Dependency
- Technology Stack
- Deployment Strategy
- Wallet Balance Strategy

Perubahan hanya dapat dilakukan melalui versi baru.