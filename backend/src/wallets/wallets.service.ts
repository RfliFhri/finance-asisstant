import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateWalletInput {
  name: string;
  icon?: string;
  color?: string;
  currency?: string;
}

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateWalletInput) {
    const count = await this.prisma.wallet.count({ where: { userId } });
    try {
      return await this.prisma.wallet.create({
        data: {
          ...input,
          name: input.name.trim(),
          userId,
          isDefault: count === 0,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002')
        throw new BadRequestException('Nama wallet sudah digunakan.');
      throw error;
    }
  }

  async ensureDefault(userId: string) {
    const existing = await this.prisma.wallet.findFirst({
      where: { userId, isDefault: true },
    });
    return existing ?? this.create(userId, { name: 'Cash' });
  }

  async listWithBalances(userId: string) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      select: {
        walletId: true,
        transferWalletId: true,
        type: true,
        amount: true,
      },
    });
    return wallets.map((wallet) => {
      const balance = transactions.reduce((total, transaction) => {
        const amount = Number(transaction.amount);
        if (
          transaction.type === TransactionType.income &&
          transaction.walletId === wallet.id
        )
          return total + amount;
        if (
          transaction.type === TransactionType.expense &&
          transaction.walletId === wallet.id
        )
          return total - amount;
        if (
          transaction.type === TransactionType.transfer &&
          transaction.walletId === wallet.id
        )
          return total - amount;
        if (
          transaction.type === TransactionType.transfer &&
          transaction.transferWalletId === wallet.id
        )
          return total + amount;
        return total;
      }, 0);
      return { ...wallet, balance };
    });
  }

  async findByName(userId: string, name: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        name: { equals: name.trim(), mode: 'insensitive' },
        isActive: true,
      },
    });
    if (!wallet)
      throw new NotFoundException(`Wallet "${name}" tidak ditemukan.`);
    return wallet;
  }

  async rename(userId: string, currentName: string, nextName: string) {
    const wallet = await this.findByName(userId, currentName);
    try {
      return await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { name: nextName.trim() },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Nama wallet sudah digunakan.');
      }
      throw error;
    }
  }

  async delete(userId: string, name: string) {
    const wallet = await this.findByName(userId, name);
    try {
      await this.prisma.wallet.delete({ where: { id: wallet.id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Wallet yang memiliki transaksi tidak dapat dihapus.',
        );
      }
      throw error;
    }
  }
}
