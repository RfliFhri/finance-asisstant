import { ReceiptOcrService } from './receipt-ocr.service';

describe('ReceiptOcrService', () => {
  const service = new ReceiptOcrService();

  it('extracts the total from an Indonesian receipt', () => {
    expect(
      service.findTotal('Kopi Susu\nSub Total Rp18.000\nTOTAL BAYAR Rp20.000'),
    ).toBe(20000);
  });

  it('returns null when there is no nominal on the receipt', () => {
    expect(service.findTotal('Terima kasih sudah berbelanja')).toBeNull();
  });

  it.each([
    ['Nominal Transfer: Rp 150.000\nTransfer Berhasil', 150000],
    ['Transfer Successfully\nJumlah Transfer\nRp250.000', 250000],
    ['Status: BERHASIL\nTotal Transfer Rp 1.250.000', 1250000],
  ])('extracts the amount from a transfer receipt', (text, expected) => {
    expect(service.findTotal(text)).toBe(expected);
  });
});
