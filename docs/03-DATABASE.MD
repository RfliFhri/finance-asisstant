# Database Design Document

**Project** : Personal Finance Assistant

**Version** : 1.0.0

**Status** : Draft

**Database** : PostgreSQL

**ORM** : Prisma ORM

**Last Updated** : 2026-07-25

---

# 1. Purpose

Dokumen ini menjelaskan seluruh desain database yang digunakan pada aplikasi.

Database dirancang berdasarkan prinsip:

- Single Source of Truth
- Normalize First
- Future Ready
- Easy to Maintain

Seluruh implementasi backend wajib mengikuti struktur database ini.

---

# 2. Database Principles

## Single Source of Truth

Saldo tidak disimpan.

Saldo selalu dihitung dari transaksi.

---

## No Duplicate Data

Tidak boleh ada data yang dapat dihitung tetapi tetap disimpan.

Contoh:

❌ wallet.balance

❌ monthly_report.total

Karena semuanya dapat dihitung dari tabel transaksi.

---

## UUID

Seluruh Primary Key menggunakan UUID.

---

## Timestamp

Seluruh tabel memiliki:

created_at

updated_at

---

## Soft Delete

Tidak digunakan pada MVP.

---

# 3. Entity Relationship Diagram

```
Users
 │
 ├────────────┐
 │            │
 ▼            ▼
Wallets    Categories
 │            │
 └──────┐     │
        ▼     ▼
      Transactions
            │
            ▼
      Attachments
```

Report tidak memiliki tabel.

Report dihasilkan dari query.

---

# 4. Tables

Database terdiri dari:

```
users

wallets

categories

transactions

attachments
```

---

# 5. users

## Purpose

Menyimpan informasi pengguna Telegram.

---

Columns

| Column | Type | Nullable |
|---------|------|----------|
| id | UUID | No |
| telegram_id | BIGINT | No |
| telegram_username | VARCHAR(100) | Yes |
| first_name | VARCHAR(100) | Yes |
| last_name | VARCHAR(100) | Yes |
| language_code | VARCHAR(10) | Yes |
| is_active | BOOLEAN | No |
| created_at | TIMESTAMP | No |
| updated_at | TIMESTAMP | No |

---

Rules

telegram_id

UNIQUE

---

Relationship

User

↓

Wallet

1 : N

---

User

↓

Category

1 : N

---

User

↓

Transaction

1 : N

---

# 6. wallets

Purpose

Menyimpan sumber dana pengguna.

Contoh

Cash

BCA

Mandiri

GoPay

OVO

---

Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| name | VARCHAR(100) |
| icon | VARCHAR(50) |
| color | VARCHAR(20) |
| currency | CHAR(3) |
| is_default | BOOLEAN |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

Rules

Satu user boleh memiliki banyak wallet.

Nama wallet harus unik untuk satu user.

Tidak memiliki balance.

---

# 7. categories

Purpose

Kategori transaksi.

---

Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| type | ENUM |
| name | VARCHAR(100) |
| icon | VARCHAR(50) |
| color | VARCHAR(20) |
| is_default | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

Enum

```
INCOME

EXPENSE
```

---

Rules

Kategori default tidak boleh dihapus.

---

# 8. transactions

Purpose

Menjadi Source of Truth seluruh sistem.

---

Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| wallet_id | UUID |
| category_id | UUID |
| transaction_type | ENUM |
| amount | DECIMAL(18,2) |
| description | TEXT |
| transaction_date | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

Enum

```
INCOME

EXPENSE

TRANSFER
```

---

Rules

Nominal

> 0

---

# 9. attachment

Purpose

Menyimpan metadata lampiran.

---

Columns

| Column | Type |
|---------|------|
| id | UUID |
| transaction_id | UUID |
| telegram_file_id | TEXT |
| telegram_unique_file_id | TEXT |
| file_name | VARCHAR(255) |
| mime_type | VARCHAR(100) |
| file_size | BIGINT |
| created_at | TIMESTAMP |

---

Rules

Server tidak menyimpan file.

Telegram menjadi storage.

---

# 10. Relationships

User

1

↓

N

Wallet

---

User

1

↓

N

Category

---

User

1

↓

N

Transaction

---

Wallet

1

↓

N

Transaction

---

Category

1

↓

N

Transaction

---

Transaction

1

↓

N

Attachment

---

# 11. Index

Users

telegram_id

UNIQUE

---

Wallet

user_id

---

Category

user_id

---

Transaction

user_id

wallet_id

category_id

transaction_date

transaction_type

---

Attachment

transaction_id

---

# 12. Constraints

Wallet Name

Unique per User

---

Category Name

Unique per User + Type

---

Amount

Must Greater Than Zero

---

Wallet

Cannot Delete if Transaction Exists

---

Category

Cannot Delete if Transaction Exists

---

# 13. Balance Formula

Current Balance

=

Income

-

Expense

+

Transfer In

-

Transfer Out

Balance tidak disimpan pada tabel wallet.

---

# 14. Report Formula

Daily

↓

Transaction

↓

Aggregate

↓

Response

---

Monthly

↓

Transaction

↓

Aggregate

↓

Response

Tidak ada tabel report.

---

# 15. Design Freeze

Setelah dokumen ini selesai

Tidak diperbolehkan:

- Menambah tabel inti
- Mengubah relasi
- Mengubah Primary Key
- Mengubah Foreign Key
- Menambah kolom balance

Seluruh perubahan dilakukan melalui migration versi baru.