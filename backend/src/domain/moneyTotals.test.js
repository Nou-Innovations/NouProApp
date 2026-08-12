'use strict';

/**
 * Money-total derivation (audit INJ-5 / INJ-6).
 *
 * These functions decide what a customer is billed — an invoice's stored `totalAmount` is
 * exactly what `POST /payments/invoice-checkout` charges — so the arithmetic is pinned
 * here rather than reviewed by eye.
 *
 * Two of these tests cover LIVE BUGS found while implementing the fix, not just the
 * original finding:
 *   - shipping was silently erased whenever a price list applied
 *   - a genuinely zero-value purchase order was stored as `null`
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  computeInvoiceTotals,
  computeProcurementTotal,
  resolveProcurementTotal,
} = require('./moneyTotals');

const silent = { warn() {}, info() {}, error() {} };

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

test('invoice: subtotal is derived from the line items, not the client', () => {
  const items = [
    { quantity: 2, unitPrice: 100 },
    { quantity: 3, unitPrice: 10 },
  ];
  // The client claims 5. It gets ignored.
  const t = computeInvoiceTotals({ totalAmount: 5 }, items);
  assert.equal(t.subtotal, 230);
  assert.equal(t.totalAmount, 230);
});

test('invoice: tax is applied to the subtotal', () => {
  const t = computeInvoiceTotals({ taxRate: 15 }, [{ quantity: 1, unitPrice: 200 }]);
  assert.equal(t.subtotal, 200);
  assert.equal(t.taxAmount, 30);
  assert.equal(t.totalAmount, 230);
});

test('invoice: SHIPPING IS NOT ERASED — the bug the old reprice formula had', () => {
  // The previous formula was `subtotal + tax - discount`, with no shipping term, so any
  // shipping the client added vanished the moment a price list applied.
  const t = computeInvoiceTotals(
    { taxRate: 0, shipping: 50 },
    [{ quantity: 1, unitPrice: 100 }],
  );
  assert.equal(t.totalAmount, 150, 'shipping must be added to the total');
});

test('invoice: discount is subtracted, under either field name', () => {
  const viaCreate = computeInvoiceTotals({ discountAmount: 25 }, [{ quantity: 1, unitPrice: 100 }]);
  const viaPatch = computeInvoiceTotals({ discount: 25 }, [{ quantity: 1, unitPrice: 100 }]);
  assert.equal(viaCreate.totalAmount, 75);
  assert.equal(viaPatch.totalAmount, 75, 'PATCH uses `discount`, create uses `discountAmount`');
});

test('invoice: a discount larger than the invoice cannot make the total negative', () => {
  const t = computeInvoiceTotals({ discountAmount: 10_000 }, [{ quantity: 1, unitPrice: 100 }]);
  assert.equal(t.totalAmount, 0);
});

test('invoice: nonsense tax rates are clamped, not propagated', () => {
  assert.equal(computeInvoiceTotals({ taxRate: -50 }, [{ quantity: 1, unitPrice: 100 }]).taxAmount, 0);
  assert.equal(computeInvoiceTotals({ taxRate: 999 }, [{ quantity: 1, unitPrice: 100 }]).taxAmount, 100);
});

test('invoice: NaN and junk never reach the total', () => {
  for (const body of [{ taxRate: 'abc' }, { discountAmount: NaN }, { shipping: undefined }]) {
    const t = computeInvoiceTotals(body, [{ quantity: 1, unitPrice: 100 }]);
    assert.ok(Number.isFinite(t.totalAmount), `total should be finite for ${JSON.stringify(body)}`);
    assert.equal(t.totalAmount, 100);
  }
});

test('invoice: malformed lines are skipped rather than poisoning the sum', () => {
  // PATCH does not validate item shapes the way create does, so junk must not yield NaN.
  const t = computeInvoiceTotals({}, [
    { quantity: 2, unitPrice: 50 },
    { quantity: 'x', unitPrice: 'y' },
    null,
  ]);
  assert.equal(t.totalAmount, 100);
});

test('invoice: no items means zero, not NaN', () => {
  assert.equal(computeInvoiceTotals({}, []).totalAmount, 0);
  assert.equal(computeInvoiceTotals({}, undefined).totalAmount, 0);
});

test('invoice: money is rounded to cents', () => {
  const t = computeInvoiceTotals({ taxRate: 15 }, [{ quantity: 3, unitPrice: 33.33 }]);
  assert.equal(t.subtotal, 99.99);
  assert.equal(t.taxAmount, 15);
  assert.equal(t.totalAmount, 114.99);
});

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------

test('procurement: accepts BOTH item field-name shapes', () => {
  // PO→delivery conversion reads unitPrice/quantity; delivery totals read
  // price/quantityOrdered. A reducer that picks one returns 0 for half the flow.
  assert.equal(computeProcurementTotal([{ quantity: 2, unitPrice: 50 }]), 100);
  assert.equal(computeProcurementTotal([{ quantityOrdered: 2, price: 50 }]), 100);
  assert.equal(
    computeProcurementTotal([{ quantity: 1, unitPrice: 10 }, { quantityOrdered: 2, price: 5 }]),
    20,
    'a mixed-shape document must sum correctly',
  );
});

test('procurement: A ZERO TOTAL IS ZERO, not null — the falsiness bug', () => {
  // `totalAmount ? parseFloat(totalAmount) : null` stored null for a legitimate 0.
  assert.equal(computeProcurementTotal([{ quantity: 5, unitPrice: 0 }]), 0);
  assert.equal(resolveProcurementTotal('t', 0, [{ quantity: 5, unitPrice: 0 }], silent), 0);
});

test('procurement: null means "cannot be derived", distinct from zero', () => {
  assert.equal(computeProcurementTotal([]), null);
  assert.equal(computeProcurementTotal(undefined), null);
  assert.equal(computeProcurementTotal([{ quantity: 2 }]), null, 'no price on any line');
});

test('procurement: the derived figure wins over the client', () => {
  const total = resolveProcurementTotal('t', 999999, [{ quantity: 2, unitPrice: 10 }], silent);
  assert.equal(total, 20);
});

test('procurement: a mismatch is logged, not thrown', () => {
  const lines = [];
  const total = resolveProcurementTotal(
    'po-1', 999, [{ quantity: 1, unitPrice: 10 }],
    { warn: (m) => lines.push(m) },
  );
  assert.equal(total, 10, 'server figure is used');
  assert.equal(lines.length, 1, 'and the divergence is reported');
  assert.match(lines[0], /client claimed 999/);
});

test('procurement: falls back to the client value only when nothing is derivable', () => {
  assert.equal(resolveProcurementTotal('t', 250, [], silent), 250);
  assert.equal(resolveProcurementTotal('t', 'abc', [], silent), null, 'never persist NaN');
  assert.equal(resolveProcurementTotal('t', undefined, [], silent), null);
});
