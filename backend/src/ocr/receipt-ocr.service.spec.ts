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
});
