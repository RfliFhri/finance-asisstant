import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthly(userId: string, date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return this.forPeriod(userId, start, end);
  }

  async daily(userId: string, date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.forPeriod(userId, start, end);
  }

  async weekly(userId: string, date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return this.forPeriod(userId, start, end);
  }

  async yearly(userId: string, date = new Date()) {
    return this.forPeriod(
      userId,
      new Date(date.getFullYear(), 0, 1),
      new Date(date.getFullYear() + 1, 0, 1),
    );
  }

  private async forPeriod(userId: string, start: Date, end: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: start, lt: end } },
      include: { category: true },
    });
    const total = (type: TransactionType) =>
      transactions
        .filter((transaction) => transaction.type === type)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const byCategory = transactions
      .filter((transaction) => transaction.type !== TransactionType.transfer)
      .reduce<Record<string, number>>((result, transaction) => {
        const name = transaction.category?.name ?? 'Tanpa kategori';
        result[name] = (result[name] ?? 0) + Number(transaction.amount);
        return result;
      }, {});
    return {
      period: { start, end },
      income: total(TransactionType.income),
      expense: total(TransactionType.expense),
      transfer: total(TransactionType.transfer),
      net: total(TransactionType.income) - total(TransactionType.expense),
      byCategory,
    };
  }
}
