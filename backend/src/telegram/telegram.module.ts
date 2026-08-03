import { Module } from '@nestjs/common';

import { TelegramService } from './services/telegram.service';
import { TelegramController } from './controllers/telegram.controller';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ReportsModule } from '../reports/reports.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [
    UsersModule,
    WalletsModule,
    CategoriesModule,
    TransactionsModule,
    ReportsModule,
    AttachmentsModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
