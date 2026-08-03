import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { CategoriesService } from '../../categories/categories.service';
import { AttachmentsService } from '../../attachments/attachments.service';
import { ReportsService } from '../../reports/reports.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { UsersService } from '../../users/users.service';
import { WalletsService } from '../../wallets/wallets.service';
import { TelegramService } from '../services/telegram.service';
import { ConfigService } from '@nestjs/config';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly users: UsersService,
    private readonly wallets: WalletsService,
    private readonly categories: CategoriesService,
    private readonly transactions: TransactionsService,
    private readonly reports: ReportsService,
    private readonly attachments: AttachmentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    const expectedSecret = this.config.get<string>('telegram.webhookSecret');
    if (expectedSecret && secret !== expectedSecret) {
      throw new UnauthorizedException('Webhook secret tidak valid.');
    }
    const message = update?.message;
    if (!message?.from || !message?.chat?.id) return { ok: true };
    const user = await this.users.findOrCreateTelegramUser({
      id: message.from.id,
      username: message.from.username,
      firstName: message.from.first_name,
      lastName: message.from.last_name,
      languageCode: message.from.language_code,
    });
    try {
      if (message.text) {
        await this.handleCommand(user.id, message.chat.id, message.text.trim());
      } else {
        await this.handleAttachment(user.id, message.chat.id, message);
      }
    } catch (error: any) {
      this.logger.error(error);
      await this.telegram.sendMessage(
        message.chat.id,
        `⚠️ ${error?.message ?? 'Terjadi kesalahan.'}`,
      );
    }
    return { ok: true };
  }

  private async handleAttachment(userId: string, chatId: number, message: any) {
    const match = message.caption?.trim().match(/^\/attach\s+([\w-]+)$/i);
    if (!match)
      return this.telegram.sendMessage(
        chatId,
        'Kirim foto atau dokumen dengan caption: /attach ID_TRANSAKSI',
      );
    const file = message.document ?? message.photo?.[message.photo.length - 1];
    if (!file)
      return this.telegram.sendMessage(chatId, 'Lampiran tidak ditemukan.');
    await this.attachments.createForUser(userId, match[1], {
      telegramFileId: file.file_id,
      telegramFileUniqueId: file.file_unique_id,
      fileName: message.document?.file_name,
      mimeType: message.document?.mime_type,
      fileSize: file.file_size,
    });
    return this.telegram.sendMessage(chatId, '✅ Lampiran tersimpan.');
  }

  private async handleCommand(userId: string, chatId: number, text: string) {
    const [command, ...args] = text.split(/\s+/);
    switch (command.toLowerCase()) {
      case '/start':
        await this.wallets.ensureDefault(userId);
        await this.categories.ensureDefaults(userId);
        return this.telegram.sendMessage(
          chatId,
          this.welcome(),
          this.mainMenu(),
        );
      case '/help':
        return this.telegram.sendMessage(chatId, this.help(), this.mainMenu());
      case '/wallet':
        return this.walletCommand(userId, chatId, args);
      case '/category':
        return this.categoryCommand(userId, chatId, args);
      case '/income':
        return this.transactionCommand(
          userId,
          chatId,
          TransactionType.income,
          args,
        );
      case '/expense':
        return this.transactionCommand(
          userId,
          chatId,
          TransactionType.expense,
          args,
        );
      case '/transfer':
        return this.transferCommand(userId, chatId, args);
      case '/report':
        return this.reportCommand(userId, chatId, args[0]);
      case '/history':
        return this.historyCommand(userId, chatId);
      case '/transaction':
        return this.transactionManagementCommand(userId, chatId, args);
      case '💼':
      case '💼 wallet saya':
        return this.walletCommand(userId, chatId, []);
      case '📊':
      case '📊 laporan bulanan':
        return this.reportCommand(userId, chatId);
      case '🧾':
      case '🧾 riwayat':
        return this.historyCommand(userId, chatId);
      case '➕':
      case '➕ catat pemasukan':
        return this.transactionHint(chatId, 'income');
      case '➖':
      case '➖ catat pengeluaran':
        return this.transactionHint(chatId, 'expense');
      case '↔️':
      case '↔️ transfer':
        return this.transferHint(chatId);
      case '❓':
      case '❓ bantuan':
        return this.telegram.sendMessage(chatId, this.help(), this.mainMenu());
      default:
        return this.telegram.sendMessage(
          chatId,
          `Perintah tidak dikenal.\n\n${this.help()}`,
        );
    }
  }

  private async walletCommand(userId: string, chatId: number, args: string[]) {
    if (args[0]?.toLowerCase() === 'add' && args[1]) {
      const wallet = await this.wallets.create(userId, {
        name: args.slice(1).join(' '),
      });
      return this.telegram.sendMessage(
        chatId,
        `✅ Wallet *${wallet.name}* dibuat.`,
      );
    }
    if (args[0]?.toLowerCase() === 'delete' && args[1]) {
      await this.wallets.delete(userId, args.slice(1).join(' '));
      return this.telegram.sendMessage(chatId, '✅ Wallet dihapus.');
    }
    if (args[0]?.toLowerCase() === 'rename' && args[1]) {
      const [currentName, nextName] = args
        .slice(1)
        .join(' ')
        .split('|')
        .map((value) => value.trim());
      if (!currentName || !nextName)
        return this.telegram.sendMessage(
          chatId,
          'Format: /wallet rename Nama Lama|Nama Baru',
        );
      await this.wallets.rename(userId, currentName, nextName);
      return this.telegram.sendMessage(chatId, '✅ Wallet diubah.');
    }
    const wallets = await this.wallets.listWithBalances(userId);
    const lines = wallets.length
      ? wallets.map(
          (wallet) =>
            `${wallet.isDefault ? '⭐ ' : ''}${wallet.name}: Rp${wallet.balance.toLocaleString('id-ID')}`,
        )
      : ['Belum ada wallet. Gunakan /wallet add Cash'];
    return this.telegram.sendMessage(
      chatId,
      `💼 *Wallet*\n${lines.join('\n')}`,
    );
  }

  private async categoryCommand(
    userId: string,
    chatId: number,
    args: string[],
  ) {
    const type = args[0]?.toLowerCase();
    if (
      (type === 'income' || type === 'expense') &&
      args[1] === 'delete' &&
      args[2]
    ) {
      await this.categories.delete(userId, type, args.slice(2).join(' '));
      return this.telegram.sendMessage(chatId, '✅ Kategori dihapus.');
    }
    if ((type === 'income' || type === 'expense') && args[1]) {
      const category = await this.categories.create(
        userId,
        type === 'income' ? 'income' : 'expense',
        args.slice(1).join(' '),
      );
      return this.telegram.sendMessage(
        chatId,
        `✅ Kategori *${category.name}* dibuat.`,
      );
    }
    return this.telegram.sendMessage(
      chatId,
      'Format: /category income Gaji\natau /category expense Makan',
    );
  }

  private async transactionManagementCommand(
    userId: string,
    chatId: number,
    args: string[],
  ) {
    const [action, id, ...rest] = args;
    if (action === 'delete' && id) {
      await this.transactions.delete(userId, id);
      return this.telegram.sendMessage(chatId, '✅ Transaksi dihapus.');
    }
    if (action === 'edit' && id && rest.length) {
      await this.transactions.updateDescription(userId, id, rest.join(' '));
      return this.telegram.sendMessage(
        chatId,
        '✅ Deskripsi transaksi diubah.',
      );
    }
    return this.telegram.sendMessage(
      chatId,
      'Format: /transaction edit ID Deskripsi\natau /transaction delete ID',
    );
  }

  private async transactionCommand(
    userId: string,
    chatId: number,
    type: 'income' | 'expense',
    args: string[],
  ) {
    const [walletName, categoryName, rawAmount, ...description] =
      this.parseFields(args);
    if (!walletName || !categoryName || !rawAmount)
      return this.telegram.sendMessage(
        chatId,
        `Format mudah:\n/${type} Wallet | Kategori | Nominal | Keterangan`,
      );
    const transaction = await this.transactions.create(userId, {
      type,
      walletName,
      categoryName,
      amount: this.amount(rawAmount),
      description: description.join(' ') || '-',
    });
    return this.telegram.sendMessage(
      chatId,
      `✅ ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} Rp${Number(transaction.amount).toLocaleString('id-ID')} tersimpan.`,
    );
  }

  private async transferCommand(
    userId: string,
    chatId: number,
    args: string[],
  ) {
    const [fromWalletName, toWalletName, rawAmount, ...description] =
      this.parseFields(args);
    if (!fromWalletName || !toWalletName || !rawAmount)
      return this.telegram.sendMessage(
        chatId,
        'Format mudah:\n/transfer Wallet Asal | Wallet Tujuan | Nominal | Keterangan',
      );
    const transaction = await this.transactions.transfer(userId, {
      fromWalletName,
      toWalletName,
      amount: this.amount(rawAmount),
      description: description.join(' ') || '-',
    });
    return this.telegram.sendMessage(
      chatId,
      `✅ Transfer Rp${Number(transaction.amount).toLocaleString('id-ID')} tersimpan.`,
    );
  }

  private async reportCommand(
    userId: string,
    chatId: number,
    period = 'monthly',
  ) {
    const reports = {
      daily: () => this.reports.daily(userId),
      weekly: () => this.reports.weekly(userId),
      monthly: () => this.reports.monthly(userId),
      yearly: () => this.reports.yearly(userId),
    };
    const selected = period.toLowerCase() as keyof typeof reports;
    if (!reports[selected]) {
      return this.telegram.sendMessage(
        chatId,
        'Format: /report daily|weekly|monthly|yearly',
      );
    }
    const report = await reports[selected]();
    return this.telegram.sendMessage(
      chatId,
      `📊 *Laporan ${selected}*\nPemasukan: Rp${report.income.toLocaleString('id-ID')}\nPengeluaran: Rp${report.expense.toLocaleString('id-ID')}\nNeto: Rp${report.net.toLocaleString('id-ID')}`,
    );
  }

  private async historyCommand(userId: string, chatId: number) {
    const items = await this.transactions.recent(userId, 10);
    const lines = items.length
      ? items.map(
          (item) =>
            `${item.type === 'income' ? '➕' : item.type === 'expense' ? '➖' : '↔️'} ${item.wallet.name} · Rp${Number(item.amount).toLocaleString('id-ID')} · ${item.description}\nID: ${item.id}`,
        )
      : ['Belum ada transaksi.'];
    return this.telegram.sendMessage(
      chatId,
      `🧾 *Transaksi terakhir*\n${lines.join('\n')}`,
    );
  }

  private amount(value: string) {
    return Number(
      value
        .replace(/[^0-9.,]/g, '')
        .replace(/\./g, '')
        .replace(',', '.'),
    );
  }

  private parseFields(args: string[]) {
    const input = args.join(' ').trim();
    return input.includes('|')
      ? input.split('|').map((value) => value.trim())
      : args;
  }

  private transactionHint(chatId: number, type: 'income' | 'expense') {
    const label = type === 'income' ? 'pemasukan' : 'pengeluaran';
    return this.telegram.sendMessage(
      chatId,
      `Kirim ${label} dengan format ini:\n/${type} Cash | ${type === 'income' ? 'Gaji' : 'Makan'} | 25000 | Keterangan\n\nTanda | membuat nama wallet, kategori, dan keterangan boleh mengandung spasi.`,
    );
  }

  private transferHint(chatId: number) {
    return this.telegram.sendMessage(
      chatId,
      'Kirim transfer dengan format ini:\n/transfer Cash | BCA | 50000 | Isi saldo',
    );
  }

  private mainMenu() {
    return {
      reply_markup: {
        keyboard: [
          ['➕ Catat Pemasukan', '➖ Catat Pengeluaran'],
          ['↔️ Transfer', '💼 Wallet Saya'],
          ['📊 Laporan Bulanan', '🧾 Riwayat'],
          ['❓ Bantuan'],
        ],
        resize_keyboard: true,
      },
    };
  }

  private welcome() {
    return '👋 Selamat datang di Finance Assistant!\n\nPilih menu di bawah untuk mulai. Saya sudah menyiapkan wallet Cash dan kategori dasar untuk Anda.';
  }

  private help() {
    return 'Panduan singkat\n\n• Pemasukan: /income Cash | Gaji | 5000000 | Gaji bulanan\n• Pengeluaran: /expense Cash | Makan | 25000 | Makan siang\n• Transfer: /transfer Cash | BCA | 100000 | Isi rekening\n\nPerintah lain\n/wallet add Nama\n/wallet rename Nama Lama|Nama Baru\n/wallet delete Nama\n/category income Nama\n/category expense Nama\n/report daily|weekly|monthly|yearly\n/history\n\nLampiran: kirim foto/dokumen dengan caption /attach ID_TRANSAKSI';
  }
}
