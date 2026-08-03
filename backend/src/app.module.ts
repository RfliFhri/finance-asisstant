import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      expandVariables: true,
      validate: validateEnvironment,
    }),

    PrismaModule,
    TelegramModule,
    HealthModule,
    UsersModule,
    WalletsModule,
    CategoriesModule,
    TransactionsModule,
    AttachmentsModule,
    ReportsModule,
  ],
})
export class AppModule {}
