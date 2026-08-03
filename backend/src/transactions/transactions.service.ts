import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType, TransactionType } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';

export interface CreateTransactionInput {
  type: 'income' | 'expense';
  walletName: string;
  categoryName: string;
  amount: number;
  description: string;
  transactionDate?: Date;
}
export interface CreateTransferInput {
  fromWalletName: string;
  toWalletName: string;
  amount: number;
  description: string;
  transactionDate?: Date;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly categories: CategoriesService,
  ) {}

  async create(userId: string, input: CreateTransactionInput) {
    this.assertAmount(input.amount);
    const wallet = await this.wallets.findByName(userId, input.walletName);
    const category = await this.categories.findByName(
      userId,
      input.type === TransactionType.income
        ? CategoryType.income
        : CategoryType.expense,
      input.categoryName,
    );
    return this.prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: input.type,
        amount: input.amount,
        description: input.description.trim(),
        transactionDate: input.transactionDate ?? new Date(),
      },
      include: { wallet: true, category: true },
    });
  }

  async transfer(userId: string, input: CreateTransferInput) {
    this.assertAmount(input.amount);
    const [fromWallet, toWallet] = await Promise.all([
      this.wallets.findByName(userId, input.fromWalletName),
      this.wallets.findByName(userId, input.toWalletName),
    ]);
    if (fromWallet.id === toWallet.id)
      throw new BadRequestException('Wallet asal dan tujuan harus berbeda.');
    return this.prisma.transaction.create({
      data: {
        userId,
        walletId: fromWallet.id,
        transferWalletId: toWallet.id,
        type: TransactionType.transfer,
        amount: input.amount,
        description: input.description.trim(),
        transactionDate: input.transactionDate ?? new Date(),
      },
      include: { wallet: true, transferWallet: true },
    });
  }

  async recent(userId: string, take = 10) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      take,
      include: { wallet: true, transferWallet: true, category: true },
    });
  }

  async updateDescription(userId: string, id: string, description: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan.');
    return this.prisma.transaction.update({
      where: { id },
      data: { description: description.trim() },
    });
  }

  async delete(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!transaction) throw new NotFoundException('Transaksi tidak ditemukan.');
    await this.prisma.transaction.delete({ where: { id } });
  }

  private assertAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Nominal harus lebih besar dari nol.');
  }
}
