import { User, Business } from '@/shared/types/store';

export const mockUser: User = {
  id: 'usr-001',
  name: 'Arnaud Labonne',
  email: 'admin@noupro.com',
  role: 'super_admin',
  avatar: 'https://picsum.photos/seed/arnaud/200/200',
};

export const mockUserCompany: Business = {
  id: 'biz-001',
  name: 'NouPro Distribution Inc.',
  logo: 'https://picsum.photos/seed/biz001/100/100',
  locations: [
    {
      id: 'loc-001',
      name: 'Warehouse A - Port Louis',
      address: '123 Royal Road, Port Louis, Mauritius',
      phone: '+230-5123-4567',
      email: 'warehouse-a@noupro.mu',
    },
  ],
  settings: {
    taxRate: 15,
    currency: 'MUR',
    invoicePrefix: 'INV',
  },
};

export const mockUserProfileDetails = {
  phone: '+230 5123 4567',
  position: 'Founder & CEO',
  about:
    'Founder & CEO of NouPro Distribution. Passionate about streamlining supply chain operations and building innovative distribution solutions.',
  address: 'Rose Hill, Mauritius',
  joined: '2024-01-01',
}; 