import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ConversationAction =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'wallet'
  | 'category_income'
  | 'category_expense'
  | 'attachment';
export type ConversationStep =
  | 'transaction_wallet'
  | 'transaction_category'
  | 'transaction_amount'
  | 'transaction_description'
  | 'transaction_details'
  | 'transfer_source_wallet'
  | 'transfer_destination_wallet'
  | 'transfer_details'
  | 'transfer_description'
  | 'wallet_name'
  | 'wallet_select_rename'
  | 'wallet_new_name'
  | 'wallet_select_delete'
  | 'wallet_delete_confirm'
  | 'category_name'
  | 'attachment_transaction'
  | 'attachment_upload'
  | 'receipt_upload';

export interface ActiveConversation {
  action: ConversationAction;
  step: ConversationStep;
  data: Record<string, string>;
}

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<ActiveConversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { userId },
    });
    if (!conversation) return null;
    const data = conversation.data;
    return {
      action: conversation.action,
      step: conversation.step,
      data:
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, string>)
          : {},
    };
  }

  async save(
    userId: string,
    action: ConversationAction,
    step: ConversationStep,
    data: Record<string, string> = {},
  ) {
    return this.prisma.conversation.upsert({
      where: { userId },
      create: {
        userId,
        action,
        step,
        data: data as Prisma.InputJsonValue,
      },
      update: { action, step, data: data as Prisma.InputJsonValue },
    });
  }

  async clear(userId: string) {
    await this.prisma.conversation.deleteMany({ where: { userId } });
  }
}
