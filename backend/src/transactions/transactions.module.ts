import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { WalletsModule } from '../wallets/wallets.module';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [WalletsModule, CategoriesModule],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
