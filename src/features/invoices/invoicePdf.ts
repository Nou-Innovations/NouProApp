/**
 * Invoice PDF generation (client-side).
 *
 * Builds a self-contained HTML document from invoice data and renders it to a
 * PDF file on-device via expo-print. The caller decides what to do with the
 * returned file URI (share it, copy it to a friendly name, etc.).
 */

import * as Print from 'expo-print';

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unitPrice: string; // pre-formatted (currency)
  total: string;     // pre-formatted (currency)
}

export interface InvoicePdfData {
  documentTitle: string; // 'Invoice' | 'Estimate'
  documentNumber: string;
  status?: string;
  issueDate?: string;
  dueDate?: string;

  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;

  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;

  items: InvoicePdfLine[];

  subtotal?: string;
  discount?: string;
  tax?: string;
  shipping?: string;
  grandTotal: string;

  notes?: string;
  terms?: string;

  /** FREE plan → show "Powered by NouPro" footer. */
  showBranding: boolean;
}

// Minimal HTML-escape so user-entered values can't break the markup.
function esc(value?: string | number): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInvoiceHtml(data: InvoicePdfData): string {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td class="desc">${esc(item.description)}</td>
          <td class="num">${esc(item.quantity)}</td>
          <td class="num">${esc(item.unitPrice)}</td>
          <td class="num">${esc(item.total)}</td>
        </tr>`,
    )
    .join('');

  const totalsRow = (label: string, value?: string, strong = false) =>
    value
      ? `<tr class="${strong ? 'grand' : ''}"><td class="t-label">${esc(label)}</td><td class="t-value">${esc(value)}</td></tr>`
      : '';

  const contactLine = (label: string, value?: string) =>
    value ? `<div class="line"><span class="muted">${esc(label)}:</span> ${esc(value)}</div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1C1917; margin: 0; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1C1917; padding-bottom: 16px; }
  .title { font-size: 28px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .doc-meta { text-align: right; font-size: 12px; color: #57534E; }
  .doc-meta .num { font-size: 16px; font-weight: 700; color: #1C1917; }
  .status { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 999px; background: #F4F0EB; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .parties { display: flex; justify-content: space-between; margin-top: 24px; gap: 24px; }
  .party { flex: 1; }
  .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #57534E; margin: 0 0 6px; }
  .party .name { font-size: 15px; font-weight: 600; }
  .line { margin-top: 2px; font-size: 12px; }
  .muted { color: #A8A29E; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 28px; }
  table.items th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #57534E; border-bottom: 1px solid #ECE6DF; padding: 8px 6px; }
  table.items td { padding: 10px 6px; border-bottom: 1px solid #ECE6DF; }
  table.items td.num, table.items th.num { text-align: right; }
  .totals { width: 280px; margin-left: auto; margin-top: 18px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals td { padding: 5px 6px; }
  .totals .t-label { color: #57534E; }
  .totals .t-value { text-align: right; }
  .totals tr.grand td { border-top: 2px solid #1C1917; font-weight: 700; font-size: 15px; padding-top: 10px; }
  .section { margin-top: 28px; }
  .section h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #57534E; margin: 0 0 4px; }
  .section p { margin: 0; white-space: pre-wrap; font-size: 12px; }
  .footer { margin-top: 48px; text-align: center; color: #A8A29E; font-size: 11px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${esc(data.documentTitle)}</div>
      ${data.businessName ? `<div class="name" style="margin-top:8px;font-weight:600;">${esc(data.businessName)}</div>` : ''}
      ${contactLine('Address', data.businessAddress)}
      ${contactLine('Phone', data.businessPhone)}
      ${contactLine('Email', data.businessEmail)}
    </div>
    <div class="doc-meta">
      <div class="num">${esc(data.documentNumber)}</div>
      ${data.issueDate ? `<div>Issued: ${esc(data.issueDate)}</div>` : ''}
      ${data.dueDate ? `<div>Due: ${esc(data.dueDate)}</div>` : ''}
      ${data.status ? `<div><span class="status">${esc(data.status)}</span></div>` : ''}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Billed To</h3>
      <div class="name">${esc(data.clientName || '—')}</div>
      ${contactLine('Address', data.clientAddress)}
      ${contactLine('Phone', data.clientPhone)}
      ${contactLine('Email', data.clientEmail)}
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" class="muted">No line items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <table>
      ${totalsRow('Subtotal', data.subtotal)}
      ${totalsRow('Discount', data.discount)}
      ${totalsRow('Tax', data.tax)}
      ${totalsRow('Shipping', data.shipping)}
      ${totalsRow('Total', data.grandTotal, true)}
    </table>
  </div>

  ${data.notes ? `<div class="section"><h4>Notes</h4><p>${esc(data.notes)}</p></div>` : ''}
  ${data.terms ? `<div class="section"><h4>Terms</h4><p>${esc(data.terms)}</p></div>` : ''}

  ${data.showBranding ? '<div class="footer">Powered by NouPro</div>' : ''}
</body>
</html>`;
}

/**
 * Render invoice data to a PDF file. Returns the generated file URI (in the
 * app cache directory). Callers typically copy it to a friendly filename
 * and/or share it.
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<string> {
  const html = buildInvoiceHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}
