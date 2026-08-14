/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { ReceiptOcrService } from '../../ocr/receipt-ocr.service';
import { TelegramMenuService } from '../services/telegram-menu.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import TelegramBot = require('node-telegram-bot-api');

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
    private readonly receiptOcr: ReceiptOcrService,
    private readonly menus: TelegramMenuService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: TelegramBot.Update,
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
    void this.telegram.sendTyping(message.chat.id).catch(() => undefined);
    try {
      if (message.text) {
        await this.handleCommand(user.id, message.chat.id, message.text.trim());
      } else {
        await this.handleAttachment(user.id, message.chat.id, message);
      }
    } catch (error: unknown) {
      this.logger.error(error);
      await this.telegram.sendMessage(
        message.chat.id,
        `⚠️ ${this.errorMessage(error)}`,
      );
    }
    return { ok: true };
  }

  private async handleAttachment(
    userId: string,
    chatId: number,
    message: TelegramBot.Message,
  ) {
    const conversation = await this.conversations.get(userId);
    const file = message.document ?? message.photo?.[message.photo.length - 1];
    if (conversation?.step === 'receipt_upload') {
      if (!file)
        return this.telegram.sendMessage(chatId, 'Foto struk tidak ditemukan.');
      if (
        message.document &&
        !message.document.mime_type?.startsWith('image/')
      ) {
        return this.telegram.sendMessage(
          chatId,
          'Saat ini pembacaan otomatis mendukung foto struk (JPG/PNG), bukan PDF.',
        );
      }
      try {
        await this.telegram.sendMessage(
          chatId,
          '⏳ Membaca total pada struk...',
        );
        const fileLink = await this.telegram.getFileLink(file.file_id);
        const { amount, text } = await this.receiptOcr.extractTotal(
          fileLink,
          conversation.data.walletCurrency === 'JPY' ? 'JPY' : 'IDR',
        );
        const categories = await this.categories.list(
          userId,
          conversation.action as 'income' | 'expense',
        );
        const categoryName = this.receiptOcr.detectCategory(
          text,
          categories.map((category) => category.name),
          conversation.action as 'income' | 'expense',
        );
        if (!categoryName) {
          throw new Error(
            'Belum ada kategori untuk tipe transaksi ini. Buat kategori terlebih dahulu.',
          );
        }
        // OCR berjalan cukup lama. Pengguna dapat membatalkan dari pesan lain;
        // jangan simpan hasil OCR yang prosesnya sudah dibatalkan/diganti.
        if (
          !(await this.isReceiptFlowActive(userId, conversation.data.flowId))
        ) {
          return;
        }
        const transaction = await this.transactions.create(userId, {
          type: conversation.action as 'income' | 'expense',
          walletName: conversation.data.walletName,
          categoryName,
          amount,
          description: 'Dicatat otomatis dari struk',
        });
        await this.attachments.createForUser(userId, transaction.id, {
          telegramFileId: file.file_id,
          telegramFileUniqueId: file.file_unique_id,
          fileName: message.document?.file_name,
          mimeType: message.document?.mime_type,
          fileSize: file.file_size,
        });
        await this.conversations.clear(userId);
        return this.telegram.sendMessage(
          chatId,
          `✅ ${conversation.action === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${this.formatAmount(transaction.amount, transaction.wallet.currency)} berhasil dicatat dari struk.\nKategori otomatis: ${categoryName}\nWallet: ${conversation.data.walletName}.`,
          this.mainMenu(),
        );
      } catch (error: unknown) {
        await this.conversations.clear(userId);
        return this.telegram.sendMessage(
          chatId,
          `⚠️ ${this.errorMessage(error)}\n\nProses struk dihentikan. Silakan mulai lagi dari menu utama.`,
          this.mainMenu(),
        );
      }
    }
    if (
      conversation?.action === 'attachment' &&
      conversation.step === 'attachment_upload'
    ) {
      if (!file)
        return this.telegram.sendMessage(chatId, 'Lampiran tidak ditemukan.');
      await this.attachments.createForUser(
        userId,
        conversation.data.transactionId,
        {
          telegramFileId: file.file_id,
          telegramFileUniqueId: file.file_unique_id,
          fileName: message.document?.file_name,
          mimeType: message.document?.mime_type,
          fileSize: file.file_size,
        },
      );
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        '✅ Struk berhasil disimpan ke transaksi.',
        this.mainMenu(),
      );
    }
    const match = message.caption?.trim().match(/^\/attach\s+([\w-]+)$/i);
    if (!match)
      return this.telegram.sendMessage(
        chatId,
        'Kirim foto atau dokumen dengan caption: /attach ID_TRANSAKSI',
      );
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
    const normalizedText = text.trim().toLocaleLowerCase('id-ID');
    if (
      normalizedText === '/cancel' ||
      normalizedText === '/menu' ||
      /\b(batal|cancel|kembali)\b/u.test(normalizedText)
    ) {
      try {
        await this.conversations.clear(userId);
      } catch (error: unknown) {
        // Menu pemulihan harus tetap tampil walau database sedang bermasalah.
        this.logger.warn(
          `State percakapan tidak dapat dihapus: ${this.errorMessage(error)}`,
        );
      }
      return this.telegram.sendMessage(
        chatId,
        '✅ Proses dihentikan. Menu utama sudah dibuka kembali.',
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
    if (text === '💼 Kelola Wallet') return this.showWalletMenu(chatId);
    if (text === '➕ Tambah Rekening')
      return this.startWalletName(userId, chatId);
    if (text === '✏️ Ubah Nama Rekening')
      return this.startWalletRename(userId, chatId);
    if (text === '💱 Ubah Mata Uang Rekening')
      return this.startWalletCurrencyChange(userId, chatId);
    if (text === '🗑 Hapus Rekening')
      return this.startWalletDelete(userId, chatId);
    if (text === '🏷️ Kelola Kategori') return this.showCategoryMenu(chatId);
    if (text === '➕ Kategori Pemasukan')
      return this.startCategoryName(userId, chatId, 'income');
    if (text === '➖ Kategori Pengeluaran')
      return this.startCategoryName(userId, chatId, 'expense');
    if (text === '📊 Laporan') return this.showReportMenu(chatId);
    if (text === '📅 Hari ini')
      return this.reportCommand(userId, chatId, 'daily');
    if (text === '📅 Minggu ini')
      return this.reportCommand(userId, chatId, 'weekly');
    if (text === '📅 Bulan ini')
      return this.reportCommand(userId, chatId, 'monthly');
    if (text === '📅 Tahun ini')
      return this.reportCommand(userId, chatId, 'yearly');
    if (text === '📎 Upload Struk')
      return this.startReceiptFlow(userId, chatId);
    if (text === '⚙️ Pengaturan') return this.showSettingsMenu(chatId);
    if (text === '🇮🇩 Rupiah (IDR)')
      return this.setCurrency(userId, chatId, 'IDR');
    if (text === '🇯🇵 Yen Jepang (JPY)')
      return this.setCurrency(userId, chatId, 'JPY');

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
      case '/menu':
        await this.conversations.clear(userId);
        return this.telegram.sendMessage(
          chatId,
          'Menu utama dibuka kembali.',
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

  private showWalletMenu(chatId: number) {
    return this.telegram.sendMessage(
      chatId,
      'Kelola rekening Anda:',
      this.walletManagementMenu(),
    );
  }

  private async startWalletName(userId: string, chatId: number) {
    await this.conversations.save(userId, 'wallet', 'wallet_name');
    return this.telegram.sendMessage(
      chatId,
      'Tulis nama rekening atau wallet baru.\nContoh: BCA, Mandiri, GoPay, atau Cash.',
    );
  }

  private async startWalletCurrencyChange(userId: string, chatId: number) {
    const wallets = await this.wallets.listWithBalances(userId);
    if (!wallets.length) {
      return this.telegram.sendMessage(
        chatId,
        'Belum ada wallet untuk diubah.',
      );
    }
    await this.conversations.save(userId, 'wallet', 'wallet_select_currency');
    return this.telegram.sendMessage(
      chatId,
      'Pilih wallet yang mata uangnya ingin diubah:',
      this.walletMenu(wallets.map((wallet) => wallet.name)),
    );
  }

  private async startWalletRename(userId: string, chatId: number) {
    const wallets = await this.wallets.listWithBalances(userId);
    if (!wallets.length)
      return this.telegram.sendMessage(chatId, 'Belum ada wallet.');
    await this.conversations.save(userId, 'wallet', 'wallet_select_rename');
    return this.telegram.sendMessage(
      chatId,
      'Pilih rekening yang ingin diubah namanya:',
      this.walletMenu(wallets.map((wallet) => wallet.name)),
    );
  }

  private async startWalletDelete(userId: string, chatId: number) {
    const wallets = await this.wallets.listWithBalances(userId);
    if (!wallets.length)
      return this.telegram.sendMessage(chatId, 'Belum ada wallet.');
    await this.conversations.save(userId, 'wallet', 'wallet_select_delete');
    return this.telegram.sendMessage(
      chatId,
      'Pilih rekening yang ingin dihapus:',
      this.walletMenu(wallets.map((wallet) => wallet.name)),
    );
  }

  private showCategoryMenu(chatId: number) {
    return this.telegram.sendMessage(
      chatId,
      'Kelola kategori transaksi:',
      this.categoryManagementMenu(),
    );
  }

  private async startCategoryName(
    userId: string,
    chatId: number,
    type: 'income' | 'expense',
  ) {
    await this.conversations.save(
      userId,
      type === 'income' ? 'category_income' : 'category_expense',
      'category_name',
    );
    return this.telegram.sendMessage(
      chatId,
      `Tulis nama kategori ${type === 'income' ? 'pemasukan' : 'pengeluaran'} baru.`,
    );
  }

  private showReportMenu(chatId: number) {
    return this.telegram.sendMessage(
      chatId,
      'Pilih periode laporan:',
      this.reportMenu(),
    );
  }

  private showSettingsMenu(chatId: number) {
    return this.telegram.sendMessage(
      chatId,
      'Pilih mata uang default akun. Setiap wallet tetap dapat memakai mata uangnya sendiri.',
      this.currencyMenu(),
    );
  }

  private async setCurrency(
    userId: string,
    chatId: number,
    currency: 'IDR' | 'JPY',
  ) {
    await this.users.setCurrency(userId, currency);
    return this.telegram.sendMessage(
      chatId,
      `✅ Mata uang berhasil diubah ke ${currency === 'JPY' ? 'Yen Jepang (¥)' : 'Rupiah (Rp)'}.`,
      this.mainMenu(),
    );
  }

  private async startAttachmentFlow(userId: string, chatId: number) {
    const transactions = await this.transactions.recent(userId, 10);
    if (!transactions.length) {
      return this.telegram.sendMessage(
        chatId,
        'Belum ada transaksi untuk diberi struk.',
      );
    }
    const buttons: Record<string, string> = {};
    for (const [index, transaction] of transactions.entries()) {
      const label = `${index + 1}. ${transaction.type === 'income' ? 'Pemasukan' : transaction.type === 'expense' ? 'Pengeluaran' : 'Transfer'} · ${this.formatAmount(transaction.amount, transaction.wallet.currency)}`;
      buttons[label] = transaction.id;
    }
    await this.conversations.save(
      userId,
      'attachment',
      'attachment_transaction',
      buttons,
    );
    return this.telegram.sendMessage(
      chatId,
      'Pilih transaksi yang ingin diberi struk:',
      this.attachmentMenu(Object.keys(buttons)),
    );
  }

  private async startReceiptFlow(userId: string, chatId: number) {
    await this.conversations.save(userId, 'attachment', 'receipt_upload', {
      awaitingType: 'true',
    });
    return this.telegram.sendMessage(
      chatId,
      'Pilih tipe transaksi untuk struk ini:',
      this.receiptTypeMenu(),
    );
  }

  private async startReceiptTransaction(
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
      return this.startReceiptUpload(
        userId,
        chatId,
        action,
        wallets[0].name,
        wallets[0].currency,
      );
    }
    await this.conversations.save(userId, action, 'transaction_wallet', {
      receipt: 'true',
    });
    return this.telegram.sendMessage(
      chatId,
      'Pilih rekening/wallet untuk transaksi dari struk:',
      this.walletMenu(wallets.map((wallet) => wallet.name)),
    );
  }

  private async startReceiptUpload(
    userId: string,
    chatId: number,
    action: 'income' | 'expense',
    walletName: string,
    walletCurrency: string,
  ) {
    await this.conversations.save(userId, action, 'receipt_upload', {
      walletName,
      walletCurrency,
      flowId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    return this.telegram.sendMessage(
      chatId,
      `Rekening terpilih: ${walletName}.\n\nSekarang kirim foto struknya. Saya akan membaca total dan memilih kategori otomatis.`,
      this.backMenu(),
    );
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
      return this.askTransactionCategory(
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

  private async askTransactionCategory(
    userId: string,
    chatId: number,
    action: 'income' | 'expense',
    walletName: string,
  ) {
    const categories = await this.categories.list(userId, action);
    if (!categories.length) {
      return this.telegram.sendMessage(
        chatId,
        'Belum ada kategori. Buat dulu dengan /category income Nama atau /category expense Nama.',
      );
    }
    await this.conversations.save(userId, action, 'transaction_category', {
      walletName,
    });
    return this.telegram.sendMessage(
      chatId,
      `Rekening terpilih: ${walletName}.\n\nPilih kategori:`,
      this.categoryMenu(categories.map((category) => category.name)),
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
    if (
      conversation.step === 'receipt_upload' &&
      conversation.data.awaitingType === 'true'
    ) {
      if (text === '➕ Pemasukan')
        return this.startReceiptTransaction(userId, chatId, 'income');
      if (text === '➖ Pengeluaran')
        return this.startReceiptTransaction(userId, chatId, 'expense');
      return this.telegram.sendMessage(
        chatId,
        'Pilih tipe transaksi menggunakan tombol yang tersedia.',
        this.receiptTypeMenu(),
      );
    }
    if (conversation.step === 'wallet_name') {
      await this.conversations.save(userId, 'wallet', 'wallet_currency', {
        walletName: text,
      });
      return this.telegram.sendMessage(
        chatId,
        'Pilih mata uang untuk rekening baru:',
        this.walletCurrencyMenu(),
      );
    }

    if (conversation.step === 'wallet_currency') {
      const currency =
        text === '💴 Wallet Yen (JPY)'
          ? 'JPY'
          : text === '💴 Wallet Rupiah (IDR)'
            ? 'IDR'
            : null;
      if (!currency) {
        return this.telegram.sendMessage(
          chatId,
          'Pilih mata uang menggunakan tombol yang tersedia.',
          this.walletCurrencyMenu(),
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const wallet =
        conversation.data.changeCurrency === 'true'
          ? await this.wallets.updateCurrency(
              userId,
              conversation.data.walletName,
              currency,
            )
          : await this.wallets.create(userId, {
              name: conversation.data.walletName,
              currency,
            });
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        conversation.data.changeCurrency === 'true'
          ? `✅ Mata uang wallet ${wallet.name} diubah ke ${currency}.`
          : `✅ Rekening ${wallet.name} berhasil ditambahkan.`,
        this.mainMenu(),
      );
    }

    if (conversation.step === 'wallet_select_currency') {
      const wallet = await this.wallets.findByName(userId, text);
      await this.conversations.save(userId, 'wallet', 'wallet_currency', {
        walletName: wallet.name,
        changeCurrency: 'true',
      });
      return this.telegram.sendMessage(
        chatId,
        `Pilih mata uang baru untuk ${wallet.name}:`,
        this.walletCurrencyMenu(),
      );
    }

    if (conversation.step === 'wallet_select_rename') {
      const wallet = await this.wallets.findByName(userId, text);
      await this.conversations.save(userId, 'wallet', 'wallet_new_name', {
        walletName: wallet.name,
      });
      return this.telegram.sendMessage(
        chatId,
        'Tulis nama rekening yang baru.',
      );
    }

    if (conversation.step === 'wallet_new_name') {
      await this.wallets.rename(userId, conversation.data.walletName, text);
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        '✅ Nama rekening berhasil diubah.',
        this.mainMenu(),
      );
    }

    if (conversation.step === 'wallet_select_delete') {
      const wallet = await this.wallets.findByName(userId, text);
      await this.conversations.save(userId, 'wallet', 'wallet_delete_confirm', {
        walletName: wallet.name,
      });
      return this.telegram.sendMessage(
        chatId,
        `Hapus rekening ${wallet.name}? Tindakan ini tidak dapat dibatalkan.`,
        this.confirmDeleteMenu(),
      );
    }

    if (conversation.step === 'wallet_delete_confirm') {
      if (text !== '✅ Ya, hapus') {
        await this.conversations.clear(userId);
        return this.telegram.sendMessage(
          chatId,
          'Penghapusan dibatalkan.',
          this.mainMenu(),
        );
      }
      await this.wallets.delete(userId, conversation.data.walletName);
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        '✅ Rekening berhasil dihapus.',
        this.mainMenu(),
      );
    }

    if (conversation.step === 'category_name') {
      const type =
        conversation.action === 'category_income' ? 'income' : 'expense';
      const category = await this.categories.create(userId, type, text);
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        `✅ Kategori ${category.name} berhasil ditambahkan.`,
        this.mainMenu(),
      );
    }

    if (conversation.step === 'attachment_transaction') {
      const transactionId = conversation.data[text];
      if (!transactionId) {
        return this.telegram.sendMessage(
          chatId,
          'Pilih transaksi menggunakan tombol yang tersedia.',
        );
      }
      await this.conversations.save(userId, 'attachment', 'attachment_upload', {
        transactionId,
      });
      return this.telegram.sendMessage(
        chatId,
        'Sekarang kirim foto atau dokumen struknya. Tidak perlu menulis caption.',
      );
    }

    if (conversation.step === 'transaction_wallet') {
      const wallet = await this.wallets.findByName(userId, text);
      if (conversation.data.receipt === 'true') {
        return this.startReceiptUpload(
          userId,
          chatId,
          conversation.action as 'income' | 'expense',
          wallet.name,
          wallet.currency,
        );
      }
      return this.askTransactionCategory(
        userId,
        chatId,
        conversation.action as 'income' | 'expense',
        wallet.name,
      );
    }

    if (conversation.step === 'transaction_category') {
      const category = await this.categories.findByName(
        userId,
        conversation.action as 'income' | 'expense',
        text,
      );
      await this.conversations.save(
        userId,
        conversation.action,
        'transaction_amount',
        {
          ...conversation.data,
          categoryName: category.name,
        },
      );
      return this.telegram.sendMessage(
        chatId,
        `Kategori terpilih: ${category.name}.\n\nMasukkan nominalnya saja.\nContoh: 150000`,
        this.amountMenu(),
      );
    }

    if (conversation.step === 'transaction_amount') {
      const amount = this.amount(text);
      if (!Number.isFinite(amount) || amount <= 0) {
        return this.telegram.sendMessage(
          chatId,
          'Nominal belum valid. Kirim angka lebih dari nol, contoh: 150000',
          this.amountMenu(),
        );
      }
      await this.conversations.save(
        userId,
        conversation.action,
        'transaction_description',
        { ...conversation.data, amount: String(amount) },
      );
      return this.telegram.sendMessage(
        chatId,
        'Tambahkan keterangan bila perlu, atau tekan ⏭ Lewati keterangan.',
        this.descriptionMenu(),
      );
    }

    if (conversation.step === 'transaction_description') {
      const description = text === '⏭ Lewati keterangan' ? '-' : text;
      const transaction = await this.transactions.create(userId, {
        type: conversation.action as 'income' | 'expense',
        walletName: conversation.data.walletName,
        categoryName: conversation.data.categoryName,
        amount: Number(conversation.data.amount),
        description,
      });
      await this.conversations.clear(userId);
      return this.telegram.sendMessage(
        chatId,
        `✅ ${conversation.action === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${this.formatAmount(transaction.amount, transaction.wallet.currency)} tersimpan di ${conversation.data.walletName}.`,
        this.mainMenu(),
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
        `✅ ${conversation.action === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${this.formatAmount(transaction.amount, transaction.wallet.currency)} tersimpan di ${conversation.data.walletName}.`,
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
        'Berapa nominal transfernya?\nContoh: 50000',
        this.amountMenu(),
      );
    }

    if (conversation.step === 'transfer_details') {
      const amount = this.amount(text);
      if (!Number.isFinite(amount) || amount <= 0) {
        return this.telegram.sendMessage(
          chatId,
          'Nominal belum valid. Kirim angka lebih dari nol, contoh: 50000',
          this.amountMenu(),
        );
      }
      await this.conversations.save(
        userId,
        'transfer',
        'transfer_description',
        { ...conversation.data, amount: String(amount) },
      );
      return this.telegram.sendMessage(
        chatId,
        'Tambahkan keterangan bila perlu, atau tekan ⏭ Lewati keterangan.',
        this.descriptionMenu(),
      );
    }

    if (conversation.step !== 'transfer_description')
      return this.telegram.sendMessage(
        chatId,
        'Input tidak dikenali. Kirim /cancel untuk membatalkan.',
      );
    const description = text === '⏭ Lewati keterangan' ? '-' : text;
    const transaction = await this.transactions.transfer(userId, {
      fromWalletName: conversation.data.fromWalletName,
      toWalletName: conversation.data.toWalletName,
      amount: Number(conversation.data.amount),
      description,
    });
    await this.conversations.clear(userId);
    return this.telegram.sendMessage(
      chatId,
      `✅ Transfer ${this.formatAmount(transaction.amount, transaction.wallet.currency)} tersimpan.`,
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
            `${wallet.isDefault ? '⭐ ' : ''}${wallet.name}: ${this.formatAmount(wallet.balance, wallet.currency)}`,
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
      `✅ ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${this.formatAmount(transaction.amount, transaction.wallet.currency)} tersimpan.`,
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
      `✅ Transfer ${this.formatAmount(transaction.amount, transaction.wallet.currency)} tersimpan.`,
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
    const user = await this.users.findById(userId);
    return this.telegram.sendMessage(
      chatId,
      `📊 *Laporan ${selected}*\nPemasukan: ${this.formatAmount(report.income, user.currency)}\nPengeluaran: ${this.formatAmount(report.expense, user.currency)}\nNeto: ${this.formatAmount(report.net, user.currency)}`,
      this.mainMenu(),
    );
  }

  private async historyCommand(userId: string, chatId: number) {
    const items = await this.transactions.recent(userId, 10);
    const lines = items.length
      ? items.map(
          (item) =>
            `${item.type === 'income' ? '➕' : item.type === 'expense' ? '➖' : '↔️'} ${item.wallet.name} · ${this.formatAmount(item.amount, item.wallet.currency)} · ${item.description}\nID: ${item.id}`,
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

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Terjadi kesalahan.';
  }

  private formatAmount(
    amount: number | { toString(): string },
    currency: string,
  ) {
    const isYen = currency === 'JPY';
    return new Intl.NumberFormat(isYen ? 'ja-JP' : 'id-ID', {
      style: 'currency',
      currency: isYen ? 'JPY' : 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  }

  private async isReceiptFlowActive(userId: string, flowId?: string) {
    if (!flowId) return false;
    const active = await this.conversations.get(userId);
    return active?.step === 'receipt_upload' && active.data.flowId === flowId;
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
          ['↔️ Transfer', '💼 Kelola Wallet'],
          ['🏷️ Kelola Kategori', '📊 Laporan'],
          ['🧾 Riwayat', '📎 Upload Struk'],
          ['⚙️ Pengaturan', '❓ Bantuan'],
        ],
        resize_keyboard: true,
        is_persistent: true,
        input_field_placeholder: 'Pilih menu atau ketik perintah',
      },
    };
  }

  private walletMenu(walletNames: string[]) {
    return {
      reply_markup: {
        keyboard: [...walletNames.map((name) => [name]), ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private walletManagementMenu() {
    return {
      reply_markup: {
        keyboard: [
          ['💼 Wallet Saya', '➕ Tambah Rekening'],
          ['✏️ Ubah Nama Rekening', '💱 Ubah Mata Uang Rekening'],
          ['🗑 Hapus Rekening'],
          ['❓ Bantuan'],
          ['⬅️ Kembali'],
        ],
        resize_keyboard: true,
      },
    };
  }

  private categoryManagementMenu() {
    return {
      reply_markup: {
        keyboard: [
          ['➕ Kategori Pemasukan', '➖ Kategori Pengeluaran'],
          ['❓ Bantuan'],
          ['⬅️ Kembali'],
        ],
        resize_keyboard: true,
      },
    };
  }

  private reportMenu() {
    return {
      reply_markup: {
        keyboard: [
          ['📅 Hari ini', '📅 Minggu ini'],
          ['📅 Bulan ini', '📅 Tahun ini'],
          ['❓ Bantuan'],
          ['⬅️ Kembali'],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private attachmentMenu(labels: string[]) {
    return {
      reply_markup: {
        keyboard: [...labels.map((label) => [label]), ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private receiptTypeMenu() {
    return {
      reply_markup: {
        keyboard: [['➕ Pemasukan', '➖ Pengeluaran'], ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private confirmDeleteMenu() {
    return {
      reply_markup: {
        keyboard: [['✅ Ya, hapus', '❌ Tidak, batal'], ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private categoryMenu(categoryNames: string[]) {
    return {
      reply_markup: {
        keyboard: [...categoryNames.map((name) => [name]), ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private amountMenu() {
    return {
      reply_markup: {
        keyboard: [
          ['10000', '25000', '50000'],
          ['100000', '500000'],
          ['⬅️ Kembali'],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private descriptionMenu() {
    return {
      reply_markup: {
        keyboard: [['⏭ Lewati keterangan'], ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private backMenu() {
    return {
      reply_markup: {
        keyboard: [['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private currencyMenu() {
    return {
      reply_markup: {
        keyboard: [['🇮🇩 Rupiah (IDR)', '🇯🇵 Yen Jepang (JPY)'], ['⬅️ Kembali']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private walletCurrencyMenu() {
    return {
      reply_markup: {
        keyboard: [
          ['💴 Wallet Rupiah (IDR)', '💴 Wallet Yen (JPY)'],
          ['⬅️ Kembali'],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };
  }

  private welcome() {
    return '👋 Selamat datang di Raf Assistant!\n\nPilih menu di bawah untuk mulai. Saya sudah menyiapkan wallet Cash dan kategori dasar untuk Anda.';
  }

  private help() {
    return '❓ *Bantuan Menu*\n\n➕ *Catat Pemasukan*\nMencatat uang yang masuk, misalnya gaji atau hasil usaha.\n\n➖ *Catat Pengeluaran*\nMencatat uang yang keluar, misalnya makan, belanja, atau transportasi.\n\n↔️ *Transfer*\nMemindahkan saldo dari satu rekening ke rekening lain.\n\n💼 *Kelola Wallet*\nMelihat, menambah, mengganti nama, atau menghapus rekening/wallet.\n\n🏷️ *Kelola Kategori*\nMenambah kategori untuk pemasukan dan pengeluaran agar catatan lebih rapi.\n\n📊 *Laporan*\nMelihat ringkasan pemasukan, pengeluaran, dan saldo bersih berdasarkan periode.\n\n🧾 *Riwayat*\nMelihat daftar transaksi terakhir.\n\n📎 *Upload Struk*\nMengirim foto struk, lalu totalnya akan dibaca untuk dicatat sebagai pemasukan atau pengeluaran.\n\n⬅️ *Kembali*\nMembatalkan langkah yang sedang berjalan dan kembali ke menu utama.';
  }
}
