ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'transaction_category';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'transaction_amount';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'transaction_description';
