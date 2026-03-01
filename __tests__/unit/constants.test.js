const constants = require('../../src/constants');
const { ORDER_STATUS: SERVICE_ORDER_STATUS } = require('../../src/services/orderStatus');

describe('ORDER_STATUS', () => {
  it('contains all 8 expected values', () => {
    const expected = ['NEW', 'ACCEPTED', 'ONGOING', 'PENDING', 'IN_REVIEW', 'DONE', 'CANCELED', 'REJECTED'];
    for (const status of expected) {
      expect(constants.ORDER_STATUS[status]).toBe(status);
    }
  });

  it('matches ORDER_STATUS in orderStatus service', () => {
    expect(constants.ORDER_STATUS).toEqual(SERVICE_ORDER_STATUS);
  });
});

describe('MEMBER_ROLES', () => {
  it('contains super_admin, admin, staff', () => {
    expect(constants.MEMBER_ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(constants.MEMBER_ROLES.ADMIN).toBe('admin');
    expect(constants.MEMBER_ROLES.STAFF).toBe('staff');
  });
});

describe('MEMBER_STATUS', () => {
  it('contains invited, accepted, suspended', () => {
    expect(constants.MEMBER_STATUS.INVITED).toBe('invited');
    expect(constants.MEMBER_STATUS.ACCEPTED).toBe('accepted');
    expect(constants.MEMBER_STATUS.SUSPENDED).toBe('suspended');
  });
});

describe('SUBSCRIPTION_TIERS', () => {
  it('contains FREE, PRO, BUSINESS, ENTERPRISE', () => {
    expect(Object.values(constants.SUBSCRIPTION_TIERS)).toEqual(
      expect.arrayContaining(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']),
    );
  });
});

describe('LOCATION_MODES', () => {
  it('contains DEPENDENT and INDEPENDENT', () => {
    expect(constants.LOCATION_MODES.DEPENDENT).toBe('DEPENDENT');
    expect(constants.LOCATION_MODES.INDEPENDENT).toBe('INDEPENDENT');
  });
});
