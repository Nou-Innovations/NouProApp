/**
 * Development Seed Data
 * 
 * Mock data for development and testing purposes only.
 * These are loaded when __DEV__ is true.
 * 
 * DO NOT import this file in production code!
 */

import { User } from '@/shared/types/user';
import { UserBusiness, Business, BusinessStaff } from '@/shared/types/business';

/**
 * Default mock user for development
 */
export const mockUser: User = {
  id: 'user-001',
  name: 'John Doe',
  email: 'john@noupro.com',
  phone: '+230 5123 4567',
  address: 'Rose Hill, Mauritius',
  language: 'EN',
  notifications_on: true,
  job_title: 'Distribution Manager',
  description: 'Experienced distribution professional with a passion for logistics and supply chain management. Specializing in FMCG distribution across Mauritius.',
  connections_count: 128,
  avatar_url: 'https://picsum.photos/seed/johndoe/200/200',
  created_at: new Date().toISOString(),
};

/**
 * Mock businesses for development
 */
export const mockBusinesses: UserBusiness[] = [
  {
    business: {
      id: 'comp-1',  // Matches backend server.js
      owner_id: 'user-001',
      name: 'NouPro Distribution Inc.',
      industry: 'food_beverage',
      description: 'Leading distribution company serving multiple locations',
      logo_url: 'https://picsum.photos/seed/comp1/100/100',
      plan: 'pro',
      is_published: true,
      subscription_status: 'active',
      created_at: new Date().toISOString(),
    } as Business,
    staff_entry: {
      id: 'staff-001',
      business_id: 'comp-1',
      user_id: 'user-001',
      role: 'super_admin',
      status: 'accepted',
      created_at: new Date().toISOString(),
    } as BusinessStaff,
    role: 'super_admin',
    start_date: '2023-01-15',
  },
  {
    business: {
      id: 'comp-2',  // Matches backend server.js
      owner_id: 'user-002',
      name: 'Global Supply Co.',
      industry: 'general_retail',
      description: 'Global supply chain management specialists',
      logo_url: 'https://picsum.photos/seed/comp2/100/100',
      plan: 'business',
      is_published: true,
      subscription_status: 'active',
      created_at: new Date().toISOString(),
    } as Business,
    staff_entry: {
      id: 'staff-002',
      business_id: 'comp-2',
      user_id: 'user-001',
      role: 'admin',
      status: 'accepted',
      created_at: new Date().toISOString(),
    } as BusinessStaff,
    role: 'admin',
    start_date: '2021-06-01',
    end_date: '2022-12-31',
  },
];

/**
 * Initialize development data into stores
 * Only call this in development mode!
 */
export const initializeDevData = (
  setCurrentUser: (user: User) => void,
  setUserBusinesses: (businesses: UserBusiness[]) => void
) => {
  if (!__DEV__) {
    console.warn('initializeDevData called in production - skipping');
    return;
  }
  
  setCurrentUser(mockUser);
  setUserBusinesses(mockBusinesses);
};

