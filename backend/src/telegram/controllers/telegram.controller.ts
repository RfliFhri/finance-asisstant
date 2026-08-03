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
import {
  ActiveConversation,
  ConversationsService,
} from '../../conversations/conversations.service';

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
    private readonly conversations: ConversationsService,
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
    if (text.toLowerCase() === '/cancel') {
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        'Input dibatalkan. Pilih menu untuk mulai lagi.',
        this.mainMenu(),
      );
    }

    const [command, ...args] = text.split(/\s+/);
    if (['➕', '➕ catat pemasukan'].includes(text.toLowerCase())) {
      return this.startTransactionFlow(userId, chatId, 'income');
    }
    if (['➖', '➖ catat pengeluaran'].includes(text.toLowerCase())) {
      return this.startTransactionFlow(userId, chatId, 'expense');
    }
    if (['↔️', '↔️ transfer'].includes(text.toLowerCase())) {
      return this.startTransferFlow(userId, chatId);
    }

    if (!text.startsWith('/')) {
      const conversation = await this.conversations.get(userId);
      if (conversation) {
        return this.continueConversation(userId, chatId, text, conversation);
      }
    }

    switch (command.toLowerCase()) {
      case '/start':
        await this.conversations.clear(userId);
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
        if (!args.length) return this.startTransferFlow(userId, chatId);
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

  private async startTransactionFlow(
    userId: string,
    chatId: number,
    action: 'income' | 'expense',
  ) {
    const wallets = await this.wallets.listWithBalances(userId);
    if (!wallets.length) {
      return this.telegram.sendMessage(
        chatId,
        'Belum ada wallet. Buat dulu dengan /wallet add Nama.',
      );
    }
    if (wallets.length === 1) {
      return this.askTransactionDetails(
        userId,
        chatId,
        action,
        wallets[0].name,
      );
    }
    await this.conversations.save(userId, action, 'transaction_wallet');
    return this.telegram.sendMessage(
      chatId,
      'Pilih rekening/wallet untuk transaksi ini:',
      this.walletMenu(wallets.map((wallet) => wallet.name)),
    );
  }

  private async askTransactionDetails(
    userId: string,
    chatId: number,
    action: 'income' | 'expense',
    walletName: string,
  ) {
    await this.conversations.save(userId, action, 'transaction_details', {
      walletName,
    });
    const label = action === 'income' ? 'pemasukan' : 'pengeluaran';
    const category = action === 'income' ? 'Gaji' : 'Makan';
    return this.telegram.sendMessage(
      chatId,
      `Rekening terpilih: ${walletName}.\n\nKirim ${label} dengan format:\n${category} | 150000 | Keterangan opsional\n\nKirim /cancel untuk membatalkan.`,
    );
  }

  private async startTransferFlow(userId: string, chatId: number) {
    const wallets = await this.wallets.listWithBalances(userId);
    if (!wallets.length) {
      return this.telegram.sendMessage(
        chatId,
        'Belum ada wallet. Buat dulu dengan /wallet add Nama.',
      );
    }
    await this.conversations.save(userId, 'transfer', 'transfer_source_wallet');
    return this.telegram.sendMessage(
      chatId,
      'Transfer dari wallet mana?\nContoh: Cash\n\nKirim /cancel untuk membatalkan.',
      this.walletMenu(wallets.map((wallet) => wallet.name)),
    );
  }

  private async continueConversation(
    userId: string,
    chatId: number,
    text: string,
    conversation: ActiveConversation,
  ) {
    if (conversation.step === 'transaction_wallet') {
      const wallet = await this.wallets.findByName(userId, text);
      return this.askTransactionDetails(
        userId,
        chatId,
        conversation.action as 'income' | 'expense',
        wallet.name,
      );
    }

    if (conversation.step === 'transaction_details') {
      const [categoryName, rawAmount, ...description] =
        this.parseTextFields(text);
      if (!categoryName || !rawAmount) {
        return this.telegram.sendMessage(
          chatId,
          'Format belum lengkap. Kirim: Kategori | Nominal | Keterangan opsional',
        );
      }
      const transaction = await this.transactions.create(userId, {
        type: conversation.action as 'income' | 'expense',
        walletName: conversation.data.walletName,
        categoryName,
        amount: this.amount(rawAmount),
        description: description.join(' | ').trim() || '-',
      });
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        `✅ ${conversation.action === 'income' ? 'Pemasukan' : 'Pengeluaran'} Rp${Number(transaction.amount).toLocaleString('id-ID')} tersimpan di ${conversation.data.walletName}.`,
        this.mainMenu(),
      );
    }

    if (conversation.step === 'transfer_source_wallet') {
      const wallet = await this.wallets.findByName(userId, text);
      await this.conversations.save(
        userId,
        'transfer',
        'transfer_destination_wallet',
        {
          fromWalletName: wallet.name,
        },
      );
      const wallets = await this.wallets.listWithBalances(userId);
      return this.telegram.sendMessage(
        chatId,
        'Transfer ke wallet mana?',
        this.walletMenu(
          wallets
            .filter((item) => item.id !== wallet.id)
            .map((item) => item.name),
        ),
      );
    }

    if (conversation.step === 'transfer_destination_wallet') {
      const wallet = await this.wallets.findByName(userId, text);
      if (wallet.name === conversation.data.fromWalletName) {
        return this.telegram.sendMessage(
          chatId,
          'Wallet tujuan harus berbeda. Coba lagi.',
        );
      }
      await this.conversations.save(userId, 'transfer', 'transfer_details', {
        ...conversation.data,
        toWalletName: wallet.name,
      });
      return this.telegram.sendMessage(
        chatId,
        'Berapa nominal transfernya?\nFormat: Nominal | Keterangan opsional\nContoh: 50000 | Isi saldo',
      );
    }

    const [rawAmount, ...description] = this.parseTextFields(text);
    if (!rawAmount)
      return this.telegram.sendMessage(
        chatId,
        'Kirim nominal transfer. Contoh: 50000 | Isi saldo',
      );
    const transaction = await this.transactions.transfer(userId, {
      fromWalletName: conversation.data.fromWalletName,
      toWalletName: conversation.data.toWalletName,
      amount: this.amount(rawAmount),
      description: description.join(' | ').trim() || '-',
    });
    await this.conversations.clear(userId);
    return this.telegram.sendMessage(
      chatId,
      `✅ Transfer Rp${Number(transaction.amount).toLocaleString('id-ID')} tersimpan.`,
      this.mainMenu(),
    );
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
    return this.parseTextFields(args.join(' '));
  }

  private parseTextFields(input: string) {
    const normalized = input.trim();
    return normalized.includes('|')
      ? normalized.split('|').map((value) => value.trim())
      : normalized.split(/\s+/);
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

  private walletMenu(walletNames: string[]) {
    return {
      reply_markup: {
        keyboard: [...walletNames.map((name) => [name]), ['/cancel']],
        resize_keyboard: true,
        one_time_keyboard: true,
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
