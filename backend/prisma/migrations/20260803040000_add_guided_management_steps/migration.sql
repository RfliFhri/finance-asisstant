ALTER TYPE "ConversationAction" ADD VALUE IF NOT EXISTS 'wallet';
ALTER TYPE "ConversationAction" ADD VALUE IF NOT EXISTS 'category_income';
ALTER TYPE "ConversationAction" ADD VALUE IF NOT EXISTS 'category_expense';
ALTER TYPE "ConversationAction" ADD VALUE IF NOT EXISTS 'attachment';

ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'wallet_name';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'wallet_select_rename';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'wallet_new_name';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'wallet_select_delete';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'wallet_delete_confirm';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'category_name';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'attachment_transaction';
ALTER TYPE "ConversationStep" ADD VALUE IF NOT EXISTS 'attachment_upload';
