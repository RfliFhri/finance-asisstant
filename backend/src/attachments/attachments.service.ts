import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(
    userId: string,
    transactionId: string,
    input: {
      telegramFileId: string;
      telegramFileUniqueId: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan.');
    return this.prisma.attachment.create({
      data: { transactionId, ...input, fileSize: input.fileSize },
    });
  }
}
