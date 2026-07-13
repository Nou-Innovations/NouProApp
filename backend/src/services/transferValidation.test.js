/**
 * Unit tests for the pure transfer-create shape validator.
 * No database — this module has no Prisma dependency.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateTransferShape } = require('./transferValidation');

const valid = () => ({
  fromLocationId: 'loc-a',
  toLocationId: 'loc-b',
  items: [{ productId: 'prod-1', name: 'Widget', quantity: 3 }],
});

test('valid payload passes and keeps numeric quantity', () => {
  const r = validateTransferShape(valid());
  assert.equal(r.ok, true);
  assert.equal(r.from, 'loc-a');
  assert.equal(r.to, 'loc-b');
  assert.deepEqual(r.items[0], { productId: 'prod-1', name: 'Widget', quantity: 3 });
});

test('string quantity is normalized to a number', () => {
  const body = valid();
  body.items[0].quantity = '4';
  const r = validateTransferShape(body);
  assert.equal(r.ok, true);
  assert.equal(r.items[0].quantity, 4);
});

test('legacy quantityOrdered is accepted and normalized to quantity', () => {
  const body = valid();
  delete body.items[0].quantity;
  body.items[0].quantityOrdered = 7;
  const r = validateTransferShape(body);
  assert.equal(r.ok, true);
  assert.equal(r.items[0].quantity, 7);
});

test('missing from/to locations is rejected', () => {
  for (const patch of [{ fromLocationId: undefined }, { toLocationId: '' }, { fromLocationId: 42 }]) {
    const r = validateTransferShape({ ...valid(), ...patch });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TRANSFER_LOCATIONS_REQUIRED');
  }
});

test('same source and destination is rejected', () => {
  const r = validateTransferShape({ ...valid(), toLocationId: 'loc-a' });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'TRANSFER_SAME_LOCATION');
});

test('missing/empty/non-array items are rejected', () => {
  for (const items of [undefined, [], {}, 'nope']) {
    const r = validateTransferShape({ ...valid(), items });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TRANSFER_ITEMS_REQUIRED');
  }
});

test('item without a string productId is rejected', () => {
  for (const bad of [{ quantity: 1 }, { productId: '', quantity: 1 }, { productId: 9, quantity: 1 }, null]) {
    const r = validateTransferShape({ ...valid(), items: [bad] });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TRANSFER_ITEM_INVALID');
  }
});

test('non-positive or non-finite quantities are rejected', () => {
  for (const quantity of [0, -1, NaN, Infinity, undefined, 'abc']) {
    const r = validateTransferShape({ ...valid(), items: [{ productId: 'prod-1', quantity }] });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'TRANSFER_ITEM_INVALID');
  }
});

test('one bad item among good ones is still rejected (index in message)', () => {
  const body = valid();
  body.items.push({ productId: 'prod-2', quantity: 0 });
  const r = validateTransferShape(body);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'TRANSFER_ITEM_INVALID');
  assert.match(r.message, /Item 2/);
});
