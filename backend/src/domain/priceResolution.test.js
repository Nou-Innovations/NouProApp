/**
 * Unit tests for the price-list resolver's pure pricing logic (applyPriceList).
 *
 * No database is touched. The factory requires ./capabilities (pure) only; we
 * pass empty repos/prisma. Set harmless datasource env vars for parity with the
 * other smoke suites in case of transitive Prisma construction.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/noupro_test';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { applyPriceList } = require('./priceResolution')({}, {});

const product = { id: 'p1', price: 100, pricePerCarton: 1000, unitsPerCarton: 10 };

test('no list → base unit price', () => {
  assert.deepEqual(applyPriceList(null, product, 1), { unitPrice: 100, source: 'base' });
});

test('list-wide discount applies to base', () => {
  const list = { id: 'l', discountPercent: 10, items: [] };
  assert.deepEqual(applyPriceList(list, product, 1), { unitPrice: 90, source: 'list_discount' });
});

test('per-product fixed override wins over list discount', () => {
  const list = { id: 'l', discountPercent: 10, items: [{ productId: 'p1', fixedPrice: 80 }] };
  assert.deepEqual(applyPriceList(list, product, 1), { unitPrice: 80, source: 'item_fixed' });
});

test('override for a different product is ignored → list discount used', () => {
  const list = { id: 'l', discountPercent: 10, items: [{ productId: 'pX', fixedPrice: 5 }] };
  assert.deepEqual(applyPriceList(list, product, 1), { unitPrice: 90, source: 'list_discount' });
});

test('carton line uses pricePerCarton for the discount', () => {
  const list = { id: 'l', discountPercent: 10, items: [] };
  assert.deepEqual(applyPriceList(list, product, 1, { unit: 'carton' }), { unitPrice: 900, source: 'list_discount' });
});

test('carton fixed override uses fixedPricePerCarton', () => {
  const list = { id: 'l', discountPercent: 10, items: [{ productId: 'p1', fixedPricePerCarton: 850 }] };
  assert.deepEqual(applyPriceList(list, product, 1, { unit: 'carton' }), { unitPrice: 850, source: 'item_fixed' });
});

test('carton line ignores a unit-only fixedPrice and falls to carton discount', () => {
  // item has a unit fixedPrice but NO carton override → for a carton line we must
  // not mix units; fall through to the list discount on pricePerCarton.
  const list = { id: 'l', discountPercent: 10, items: [{ productId: 'p1', fixedPrice: 80 }] };
  assert.deepEqual(applyPriceList(list, product, 1, { unit: 'carton' }), { unitPrice: 900, source: 'list_discount' });
});

test('null base price → 0, never fabricated', () => {
  const list = { id: 'l', discountPercent: 50, items: [] };
  assert.deepEqual(applyPriceList(list, { id: 'p1' }, 1), { unitPrice: 0, source: 'base' });
});

test('zero / missing discount → base', () => {
  assert.equal(applyPriceList({ id: 'l', discountPercent: 0, items: [] }, product, 1).source, 'base');
  assert.equal(applyPriceList({ id: 'l', items: [] }, product, 1).source, 'base');
});

test('discount is rounded to 2 decimals', () => {
  const list = { id: 'l', discountPercent: 33.33, items: [] };
  assert.equal(applyPriceList(list, product, 1).unitPrice, 66.67);
});

test('discount is clamped to [0,100]', () => {
  assert.equal(applyPriceList({ id: 'l', discountPercent: 150, items: [] }, product, 1).unitPrice, 0);
});

test('currency-scoped list does not apply across currencies', () => {
  const list = { id: 'l', currency: 'USD', discountPercent: 10, items: [] };
  const eurProduct = { id: 'p1', price: 100, currency: 'EUR' };
  assert.deepEqual(applyPriceList(list, eurProduct, 1), { unitPrice: 100, source: 'base' });
});
