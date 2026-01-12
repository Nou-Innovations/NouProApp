/**
 * Business Mode Configuration
 * 
 * Defines the tabs, access rules, and navigation structure for Business mode.
 * Business mode is for business owners/staff managing their business operations:
 * inbox, deliveries, products, invoices, and business profile.
 */

export const businessModeConfig = {
  name: 'business',
  tabs: [
    { name: 'BusinessInbox', icon: 'mail', label: 'Inbox' },
    { name: 'Deliveries', icon: 'car' },
    { name: 'Products', icon: 'cube' },
    { name: 'Invoices', icon: 'document-text' },
    { name: 'BusinessProfile', icon: 'business', label: 'Business' },
  ],
  // Screens accessible in business mode (stack screens)
  stackScreens: [
    'Chat',
    'CreateInvoice',
    'InvoiceDetails',
    'CreateBrand',
    'CreateProduct',
    'ProductDetail',
    'BrandSelection',
    'DeliveryDetail',
    'CreateDelivery',
    'OrderDetail',
    'TeamManagement',
    'InviteStaff',
    'CompanySettings',
    'EditBusiness',
    'Notifications',
    'Locations',
    'Transports',
  ],
} as const;

export type BusinessModeTab = typeof businessModeConfig.tabs[number]['name'];

