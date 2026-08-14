import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TelegramIdentity {
  id: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateTelegramUser(identity: TelegramIdentity) {
    const telegramId = BigInt(identity.id);
    return this.prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        telegramUsername: identity.username,
        firstName: identity.firstName,
        lastName: identity.lastName,
        languageCode: identity.languageCode,
      },
      update: {
        telegramUsername: identity.username,
        firstName: identity.firstName,
        lastName: identity.lastName,
        languageCode: identity.languageCode,
        isActive: true,
      },
    });
  }

  async setCurrency(userId: string, currency: 'IDR' | 'JPY') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { currency },
    });
  }

  async findById(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }
}
