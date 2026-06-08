'use strict';

/**
 * Guards against schema/code enum drift.
 *
 * The staff invite/suspend production bug happened because the JS constant
 * MEMBER_STATUS used the values 'invited' and 'suspended', but the Prisma
 * `MemberStatus` enum (and therefore the Postgres enum) never had them — so the
 * writes threw PrismaClientValidationError at runtime in production. CI does not
 * run `tsc`, so nothing caught the mismatch. This pure test (no DB needed) is the
 * safety net: every value in our JS enum-constants must exist in the matching
 * Prisma enum, or CI goes red.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const constants = require('../constants');

// Parse every `enum Name { ... }` block from the Prisma schema into value sets.
function parsePrismaEnums(schemaPath) {
  const src = fs.readFileSync(schemaPath, 'utf8');
  const enums = {};
  const re = /enum\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const values = m[2]
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, '').trim())
      .filter((line) => /^[A-Za-z0-9_]+$/.test(line));
    enums[m[1]] = new Set(values);
  }
  return enums;
}

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'prisma', 'schema.prisma');
const enums = parsePrismaEnums(SCHEMA_PATH);

// JS constant export name -> the Prisma enum it must stay in sync with.
const CONSTANT_TO_ENUM = {
  SUBSCRIPTION_TIERS: 'SubscriptionTier',
  LOCATION_MODES: 'LocationMode',
  ORDER_STATUS: 'OrderStatus',
  ORDER_SCOPE: 'OrderScope',
  INVOICE_SCOPE: 'InvoiceScope',
  MEMBER_ROLES: 'MemberRole',
  MEMBER_STATUS: 'MemberStatus',
};

for (const [constName, enumName] of Object.entries(CONSTANT_TO_ENUM)) {
  test(`${constName} values all exist in Prisma enum ${enumName}`, () => {
    const enumValues = enums[enumName];
    assert.ok(enumValues, `Prisma enum ${enumName} not found in schema.prisma`);
    const constObj = constants[constName];
    assert.ok(constObj, `constants.${constName} is not exported`);
    for (const value of Object.values(constObj)) {
      assert.ok(
        enumValues.has(value),
        `constants.${constName} has value '${value}' which is NOT in Prisma enum ` +
          `${enumName} { ${[...enumValues].join(', ')} } — schema/code drift.`
      );
    }
  });
}

// Explicit guard for the two values behind the production incident.
test('MemberStatus enum includes invited and suspended', () => {
  const ms = enums.MemberStatus;
  assert.ok(ms, 'MemberStatus enum not found in schema.prisma');
  assert.ok(ms.has('invited'), "MemberStatus must include 'invited' (invite-staff endpoint)");
  assert.ok(ms.has('suspended'), "MemberStatus must include 'suspended' (suspend-member endpoint)");
});
