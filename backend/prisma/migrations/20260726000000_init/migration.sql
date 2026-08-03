DROP TABLE IF EXISTS "Attachment", "Transaction", "Category", "User" CASCADE;
DROP TABLE IF EXISTS "attachments", "transactions", "categories", "wallets", "users" CASCADE;
DROP TYPE IF EXISTS "TransactionSource";
DROP TYPE IF EXISTS "TransactionType";
DROP TYPE IF EXISTS "CategoryType";

CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE "CategoryType" AS ENUM ('income', 'expense');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "telegramId" BIGINT NOT NULL,
  "telegramUsername" VARCHAR(100),
  "firstName" VARCHAR(100),
  "lastName" VARCHAR(100),
  "languageCode" VARCHAR(10),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "icon" VARCHAR(50),
  "color" VARCHAR(20),
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "CategoryType" NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "icon" VARCHAR(50),
  "color" VARCHAR(20),
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "transferWalletId" TEXT,
  "categoryId" TEXT,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "description" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachments" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "telegramFileId" TEXT NOT NULL,
  "telegramFileUniqueId" TEXT NOT NULL,
  "fileName" VARCHAR(255),
  "mimeType" VARCHAR(100),
  "fileSize" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");
CREATE UNIQUE INDEX "wallets_userId_name_key" ON "wallets"("userId", "name");
CREATE INDEX "categories_userId_idx" ON "categories"("userId");
CREATE UNIQUE INDEX "categories_userId_type_name_key" ON "categories"("userId", "type", "name");
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");
CREATE INDEX "transactions_transferWalletId_idx" ON "transactions"("transferWalletId");
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");
CREATE INDEX "transactions_transactionDate_idx" ON "transactions"("transactionDate");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");
CREATE INDEX "attachments_transactionId_idx" ON "attachments"("transactionId");

ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferWalletId_fkey" FOREIGN KEY ("transferWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
