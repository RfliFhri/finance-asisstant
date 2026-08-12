import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBot } from 'node-telegram-bot-api';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);

  private bot!: TelegramBot;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken');

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is missing.');
    }

    this.bot = new TelegramBot(token, {
      polling: false,
    });
    const webhookUrl = this.configService.get<string>('telegram.webhookUrl');
    const webhookSecret = this.configService.get<string>(
      'telegram.webhookSecret',
    );

    // Jangan membuat seluruh serverless function gagal hanya karena API Telegram
    // sedang tidak dapat diakses ketika cold start.
    void this.bot
      .getMe()
      .then((me) => this.logger.log(`Connected as @${me.username}`))
      .catch((error: unknown) =>
        this.logger.warn(
          `Telegram belum dapat dihubungi saat startup: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );

    if (webhookUrl) {
      try {
        await this.bot.setWebHook(webhookUrl, {
          allowed_updates: ['message'],
          ...(webhookSecret ? { secret_token: webhookSecret } : {}),
        });
        this.logger.log(`Webhook Telegram aktif: ${webhookUrl}`);
      } catch (error: unknown) {
        this.logger.error(
          `Webhook Telegram gagal didaftarkan: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options: Record<string, unknown> = {},
  ) {
    return this.bot.sendMessage(chatId, text, options as never);
  }

  async sendTyping(chatId: number | string) {
    return this.bot.sendChatAction(chatId, 'typing');
  }

  async sendPhoto(chatId: number | string, photo: string, caption?: string) {
    return this.bot.sendPhoto(chatId, photo, {
      caption,
    });
  }

  async sendDocument(
    chatId: number | string,
    document: string,
    caption?: string,
  ) {
    return this.bot.sendDocument(chatId, document, {
      caption,
    });
  }

  async getMe() {
    return this.bot.getMe();
  }

  async getFileLink(fileId: string) {
    return this.bot.getFileLink(fileId);
  }

  async setWebhook(url: string, secretToken?: string) {
    return this.bot.setWebHook(url, {
      ...(secretToken ? { secret_token: secretToken } : {}),
      allowed_updates: ['message'],
    });
  }

  async deleteWebhook() {
    return this.bot.deleteWebHook();
  }

  async getWebhookInfo() {
    return this.bot.getWebHookInfo();
  }
}
