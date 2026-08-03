import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  const create = jest.fn();
  const wallets = { findByName: jest.fn() };
  const categories = { findByName: jest.fn() };
  const service = new TransactionsService(
    { transaction: { create } } as any,
    wallets as any,
    categories as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates an expense with a wallet and matching category type', async () => {
    wallets.findByName.mockResolvedValue({ id: 'wallet-1' });
    categories.findByName.mockResolvedValue({ id: 'category-1' });
    create.mockResolvedValue({ id: 'transaction-1' });

    await service.create('user-1', {
      type: 'expense',
      walletName: 'Cash',
      categoryName: 'Makan',
      amount: 25000,
      description: 'Makan siang',
    });

    expect(categories.findByName).toHaveBeenCalledWith(
      'user-1',
      'expense',
      'Makan',
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          walletId: 'wallet-1',
          categoryId: 'category-1',
          type: 'expense',
          amount: 25000,
        }),
      }),
    );
  });

  it('rejects a transfer to the same wallet', async () => {
    wallets.findByName.mockResolvedValue({ id: 'wallet-1' });

    await expect(
      service.transfer('user-1', {
        fromWalletName: 'Cash',
        toWalletName: 'Cash',
        amount: 1000,
        description: 'Invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      service.create('user-1', {
        type: 'income',
        walletName: 'Cash',
        categoryName: 'Gaji',
        amount: 0,
        description: 'Invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
