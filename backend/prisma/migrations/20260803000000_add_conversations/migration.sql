CREATE TYPE "ConversationAction" AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE "ConversationStep" AS ENUM ('transaction_details', 'transfer_source_wallet', 'transfer_destination_wallet', 'transfer_details');

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" "ConversationAction" NOT NULL,
  "step" "ConversationStep" NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_userId_key" ON "conversations"("userId");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
