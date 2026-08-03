import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('aggregates income, expense, transfer, net, and categories', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { type: 'income', amount: '100000', category: { name: 'Gaji' } },
      { type: 'expense', amount: '25000', category: { name: 'Makan' } },
      { type: 'expense', amount: '5000', category: { name: 'Makan' } },
      { type: 'transfer', amount: '10000', category: null },
    ]);
    const service = new ReportsService({ transaction: { findMany } } as any);

    const report = await service.monthly('user-1', new Date(2026, 6, 15));

    expect(report).toMatchObject({
      income: 100000,
      expense: 30000,
      transfer: 10000,
      net: 70000,
      byCategory: { Gaji: 100000, Makan: 30000 },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          transactionDate: {
            gte: new Date(2026, 6, 1),
            lt: new Date(2026, 7, 1),
          },
        },
      }),
    );
  });
});
