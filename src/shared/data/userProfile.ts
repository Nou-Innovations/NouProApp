import { User, Business } from '@/shared/types/store';

export const mockUser: User = {
  id: 'usr-001',
  name: 'Jane Doe',
  email: 'jane.doe@email.com',
  role: 'staff',
  avatar: '',
};

export const mockUserCompany: Business = {
  id: 'biz-001',
  name: 'The Burning Distributor',
  logo: 'https://picsum.photos/80/80',
  locations: [
    {
      id: 'loc-001',
      name: 'Main HQ',
      address: 'ShopName, XYZ Road, Beau Bassin, Mauritius',
      phone: '412 3456',
      email: 'info@burningdistributor.com',
    },
  ],
  settings: {
    taxRate: 15,
    currency: 'Rs',
    invoicePrefix: 'INV',
  },
};

export const mockUserProfileDetails = {
  phone: '+230 5123 4567',
  position: 'Sales Executive',
  about:
    'Passionate about connecting people with the best products. Always ready to help and support clients.',
  address: 'Rose Hill, Mauritius',
  joined: '2022-01-15',
}; 