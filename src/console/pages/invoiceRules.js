// Mirrors FlowPool's per-request minimum so the UI can explain it before submitting; the server stays authoritative.
export const MIN_INVOICE_AMOUNT = 300;

export function invoiceShortfall(amount) {
  const cents = Math.round(Number(amount || 0) * 100);
  return Math.max(0, MIN_INVOICE_AMOUNT * 100 - cents) / 100;
}
