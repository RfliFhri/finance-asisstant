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

    const me = await this.bot.getMe();

    this.logger.log(`Connected as @${me.username}`);
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

  async setWebhook(url: string) {
    return this.bot.setWebHook(url);
  }

  async deleteWebhook() {
    return this.bot.deleteWebHook();
  }

  async getWebhookInfo() {
    return this.bot.getWebHookInfo();
  }
}
