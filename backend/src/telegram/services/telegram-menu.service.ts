import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramMenuService {
  main() { return this.keyboard([['➕ Catat Pemasukan', '➖ Catat Pengeluaran'], ['↔️ Transfer', '💼 Kelola Wallet'], ['🏷️ Kelola Kategori', '📊 Laporan'], ['🧾 Riwayat', '📎 Upload Struk'], ['⚙️ Pengaturan', '❓ Bantuan']], false, true); }
  wallets(names: string[]) { return this.keyboard([...names.map((name) => [name]), ['⬅️ Kembali']]); }
  walletManagement() { return this.keyboard([['💼 Wallet Saya', '➕ Tambah Rekening'], ['✏️ Ubah Nama Rekening', '💱 Ubah Mata Uang Rekening'], ['🗑 Hapus Rekening'], ['❓ Bantuan'], ['⬅️ Kembali']], false); }
  categoryManagement() { return this.keyboard([['➕ Kategori Pemasukan', '➖ Kategori Pengeluaran'], ['❓ Bantuan'], ['⬅️ Kembali']], false); }
  reports() { return this.keyboard([['📅 Hari ini', '📅 Minggu ini'], ['📅 Bulan ini', '📅 Tahun ini'], ['❓ Bantuan'], ['⬅️ Kembali']]); }
  attachment(labels: string[]) { return this.keyboard([...labels.map((label) => [label]), ['⬅️ Kembali']]); }
  receiptType() { return this.keyboard([['➕ Pemasukan', '➖ Pengeluaran'], ['⬅️ Kembali']]); }
  confirmDelete() { return this.keyboard([['✅ Ya, hapus', '❌ Tidak, batal'], ['⬅️ Kembali']]); }
  categories(names: string[]) { return this.keyboard([...names.map((name) => [name]), ['⬅️ Kembali']]); }
  amounts() { return this.keyboard([['10000', '25000', '50000'], ['100000', '500000'], ['⬅️ Kembali']]); }
  description() { return this.keyboard([['⏭ Lewati keterangan'], ['⬅️ Kembali']]); }
  back() { return this.keyboard([['⬅️ Kembali']]); }
  accountCurrency() { return this.keyboard([['🇮🇩 Rupiah (IDR)', '🇯🇵 Yen Jepang (JPY)'], ['⬅️ Kembali']]); }
  walletCurrency() { return this.keyboard([['💴 Wallet Rupiah (IDR)', '💴 Wallet Yen (JPY)'], ['⬅️ Kembali']]); }
  welcome() { return '👋 Selamat datang di Raf Assistant!\n\nPilih menu di bawah untuk mulai. Saya sudah menyiapkan wallet Cash dan kategori dasar untuk Anda.'; }
  help() { return '❓ *Bantuan Menu*\n\n➕ *Catat Pemasukan*\nMencatat uang yang masuk, misalnya gaji atau hasil usaha.\n\n➖ *Catat Pengeluaran*\nMencatat uang yang keluar, misalnya makan, belanja, atau transportasi.\n\n↔️ *Transfer*\nMemindahkan saldo dari satu rekening ke rekening lain.\n\n💼 *Kelola Wallet*\nMelihat, menambah, mengganti nama, mengatur mata uang, atau menghapus wallet.\n\n🏷️ *Kelola Kategori*\nMenambah kategori transaksi agar catatan lebih rapi.\n\n📊 *Laporan*\nMelihat ringkasan transaksi berdasarkan periode.\n\n🧾 *Riwayat*\nMelihat daftar transaksi terakhir.\n\n📎 *Upload Struk*\nMembaca total foto struk dan mencatat transaksi.\n\n⬅️ *Kembali*\nKembali ke menu utama.'; }

  private keyboard(keyboard: string[][], oneTime = true, persistent = false) {
    return { reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: oneTime, ...(persistent ? { is_persistent: true, input_field_placeholder: 'Pilih menu atau ketik perintah' } : {}) } };
  }
}
