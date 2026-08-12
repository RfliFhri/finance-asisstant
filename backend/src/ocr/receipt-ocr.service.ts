import { BadRequestException, Injectable } from '@nestjs/common';
import { recognize } from 'tesseract.js';

@Injectable()
export class ReceiptOcrService {
  /** Reads a receipt image locally with Tesseract.js and returns its detected total. */
  async extractTotal(
    imageUrl: string,
  ): Promise<{ amount: number; text: string }> {
    const { data } = await recognize(imageUrl, 'ind+eng');
    const text = data.text;
    const amount = this.findTotal(text);
    if (!amount) {
      throw new BadRequestException(
        'Total pada struk belum dapat dibaca. Pastikan foto jelas lalu kirim ulang.',
      );
    }
    return { amount, text };
  }

  findTotal(text: string): number | null {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const totalLine = [...lines]
      .reverse()
      .find((line) =>
        /(?:grand\s*)?total|jumlah\s*(?:akhir|bayar)?|total\s*bayar|dibayar/i.test(
          line,
        ),
      );
    const source = totalLine ?? lines.at(-1) ?? '';
    const values = [
      ...source.matchAll(
        /(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|(?:rp\.?\s*)?\d{3,}/gi,
      ),
    ]
      .map((match) => this.parseAmount(match[0]))
      .filter((amount): amount is number => amount !== null);
    return values.length ? Math.max(...values) : null;
  }

  /** Selects the closest existing category; OCR is still only used to read the receipt. */
  detectCategory(
    text: string,
    categoryNames: string[],
    type: 'income' | 'expense',
  ): string | null {
    if (!categoryNames.length) return null;
    const normalizedText = text.toLocaleLowerCase('id-ID');
    const fallback = categoryNames.find(
      (name) => name.toLocaleLowerCase('id-ID') === 'lainnya',
    );
    if (type === 'income') return fallback ?? categoryNames[0];

    const keywordsByCategory: Record<string, string[]> = {
      makan: [
        'resto',
        'restaurant',
        'rumah makan',
        'cafe',
        'kopi',
        'coffee',
        'bakery',
        'food',
        'grabfood',
        'gofood',
      ],
      transportasi: [
        'grab',
        'gojek',
        'gocar',
        'taksi',
        'taxi',
        'parkir',
        'pertamina',
        'shell',
        'spbu',
      ],
    };
    const matched = categoryNames.find((name) => {
      const normalizedName = name.toLocaleLowerCase('id-ID');
      const keywords = keywordsByCategory[normalizedName] ?? [normalizedName];
      return keywords.some((keyword) => normalizedText.includes(keyword));
    });
    return matched ?? fallback ?? categoryNames[0];
  }

  private parseAmount(value: string): number | null {
    const digits = value.replace(/[^0-9]/g, '');
    const amount = Number(digits);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
  }
}
