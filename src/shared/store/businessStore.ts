/**
 * Business Store
 * Manages business entities and their data
 * Refactored from companyStore to align with app-logic.json naming
 * 
 * This store manages:
 * - Business entities (not to be confused with profile mode - see profileStore)
 * - Business locations
 * - Business CRUD operations
 * 
 * Persistence:
 * - currentLocationId is persisted to remember last selected location
 * - null = "All Locations" view
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get as apiGet, put as apiPut, post as apiPost, del as apiDel } from '@/shared/services/api';
import { Business, BusinessLocation, UpdateBusinessPayload } from '@/shared/types/business';

/**
 * Legacy Company interface for backward compatibility
 * Maps to Business type
 */
interface LegacyCompany {
  id: string;
  name: string;
  logoUrl?: string;
  logo_url?: string;
  description?: string;
  phone?: string;
  email?: string;
  locations: LegacyLocation[];
  settings: {
    taxRate: number;
    currency: string;
    invoicePrefix: string;
  };
}

/**
 * Legacy Location interface for backward compatibility
 */
interface LegacyLocation {
  id: string;
  companyId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Business Store State
 */
interface BusinessStoreState {
  // Business entities
  businesses: LegacyCompany[];
  currentBusiness: LegacyCompany | null;
  
  // Locations
  locations: LegacyLocation[];
  currentLocation: LegacyLocation | null;
  currentLocationId: string | null; // Persisted: null = "All Locations"
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBusiness: (business: LegacyCompany) => void;
  setLocation: (location: LegacyLocation | null) => void;
  fetchBusinesses: () => Promise<void>;
  fetchLocations: (businessId: string) => Promise<void>;
  updateBusiness: (businessId: string, data: Partial<LegacyCompany>) => Promise<boolean>;
  createLocation: (businessId: string, data: Omit<LegacyLocation, 'id' | 'companyId'>) => Promise<LegacyLocation | null>;
  updateLocation: (businessId: string, locationId: string, data: Partial<LegacyLocation>) => Promise<boolean>;
  deleteLocation: (businessId: string, locationId: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
  
  // Aliases for backward compatibility with companyStore
  companies: LegacyCompany[];
  currentCompany: LegacyCompany | null;
  setCompany: (company: LegacyCompany) => void;
  fetchCompanies: () => Promise<void>;
  updateCompany: (companyId: string, data: Partial<LegacyCompany>) => Promise<boolean>;
}

/**
 * Business Store
 * Persists currentLocationId to remember last selected location across sessions
 */
export const useBusinessStore = create<BusinessStoreState>()(
  persist(
    (set, get) => ({
  businesses: [],
  currentBusiness: null,
  locations: [],
  currentLocation: null,
  currentLocationId: null, // null = "All Locations"
  isLoading: false,
  error: null,
  
  // Aliases for backward compatibility (kept in sync with primary state)
  companies: [],
  currentCompany: null,

  setBusiness: (business) => {
    set({ 
      currentBusiness: business,
      currentCompany: business, // Keep alias in sync
      currentLocation: null,
      locations: []
    });
    get().fetchLocations(business.id);
  },

  // Alias for backward compatibility
  setCompany: (company) => {
    get().setBusiness(company);
  },

  setLocation: (location) => set({ 
    currentLocation: location,
    currentLocationId: location?.id || null, // null = "All Locations"
  }),

  fetchBusinesses: async () => {
    set({ isLoading: true, error: null });
    try {
      const businesses = await apiGet<LegacyCompany[]>('/companies');
      set({ businesses, companies: businesses, isLoading: false });
      
      const state = get();
      if (businesses.length > 0 && !state.currentBusiness) {
        state.setBusiness(businesses[0]);
      }
    } catch (error) {
      // Expected when backend is not running - silently fall back to mock data
      if (__DEV__) console.log('Using mock business data (API unavailable)');
      
      const mockBusinesses: LegacyCompany[] = [
        {
          id: 'comp-1',
          name: 'NouPro Distribution Inc.',
          logoUrl: 'https://picsum.photos/seed/comp1/100/100',
          description: 'Leading distribution company serving multiple locations',
          phone: '+230-555-1234',
          email: 'info@noupro.com',
          locations: [],
          settings: {
            taxRate: 0.15,
            currency: 'MUR',
            invoicePrefix: 'INV',
          },
        },
        {
          id: 'comp-2', 
          name: 'Global Supply Co.',
          logoUrl: 'https://picsum.photos/seed/comp2/100/100',
          description: 'Global supply chain management specialists',
          phone: '+230-555-5678',
          email: 'contact@globalsupply.com',
          locations: [],
          settings: {
            taxRate: 0.15,
            currency: 'MUR',
            invoicePrefix: 'GSC',
          },
        }
      ];
      
      set({ businesses: mockBusinesses, companies: mockBusinesses, isLoading: false, error: null });
      
      const state = get();
      if (mockBusinesses.length > 0 && !state.currentBusiness) {
        state.setBusiness(mockBusinesses[0]);
      }
    }
  },

  // Alias for backward compatibility
  fetchCompanies: async () => {
    return get().fetchBusinesses();
  },

  fetchLocations: async (businessId: string) => {
    set({ isLoading: true, error: null });
    try {
      const locations = await apiGet<LegacyLocation[]>(`/companies/${businessId}/locations`);
      set({ locations, isLoading: false });
      
      const state = get();
      if (state.currentBusiness && state.currentBusiness.id === businessId) {
        const updatedBusiness = {
          ...state.currentBusiness,
          locations
        };
        set({
          currentBusiness: updatedBusiness,
          currentCompany: updatedBusiness
        });
      }
      
      // Restore currentLocation from persisted currentLocationId
      const persistedLocationId = get().currentLocationId;
      if (persistedLocationId !== null) {
        // User had a specific location selected - restore it
        const restoredLocation = locations.find(loc => loc.id === persistedLocationId);
        if (restoredLocation) {
          set({ currentLocation: restoredLocation });
        }
      }
      // If persistedLocationId is null, user had "All Locations" - don't auto-select
    } catch (error) {
      // Expected when backend is not running - silently fall back to mock data
      if (__DEV__) console.log('Using mock location data (API unavailable)');
      
      const mockLocations: LegacyLocation[] = [
        {
          id: 'loc-1',
          companyId: businessId,
          name: 'Main Warehouse',
          address: '123 Industrial Ave, Port Louis, Mauritius',
          phone: '+230 123 4567',
          email: 'warehouse@business.com',
          latitude: -20.162,
          longitude: 57.502,
        },
        {
          id: 'loc-2',
          companyId: businessId,
          name: 'City Center Shop',
          address: '45 Main Street, Curepipe, Mauritius',
          phone: '+230 234 5678',
          email: 'curepipe@business.com',
          latitude: -20.318,
          longitude: 57.528,
        },
        {
          id: 'loc-3',
          companyId: businessId,
          name: 'Beach Resort Outlet',
          address: 'Grand Baie Coastal Road, Grand Baie, Mauritius',
          phone: '+230 345 6789',
          latitude: -20.0,
          longitude: 57.58,
        },
        {
          id: 'loc-4',
          companyId: businessId,
          name: 'South Distribution Center',
          address: 'Zone Industrielle, Mahebourg, Mauritius',
          phone: '+230 456 7890',
          email: 'south@business.com',
          latitude: -20.408,
          longitude: 57.700,
        },
      ];
      
      set({ locations: mockLocations, isLoading: false, error: null });
      
      const state = get();
      if (state.currentBusiness && state.currentBusiness.id === businessId) {
        const updatedBusiness = {
          ...state.currentBusiness,
          locations: mockLocations
        };
        set({
          currentBusiness: updatedBusiness,
          currentCompany: updatedBusiness
        });
      }
      
      // Restore currentLocation from persisted currentLocationId
      const persistedLocationId = get().currentLocationId;
      if (persistedLocationId !== null) {
        // User had a specific location selected - restore it
        const restoredLocation = mockLocations.find(loc => loc.id === persistedLocationId);
        if (restoredLocation) {
          set({ currentLocation: restoredLocation });
        }
      }
      // If persistedLocationId is null, user had "All Locations" - don't auto-select
    }
  },

  updateBusiness: async (businessId: string, data: Partial<LegacyCompany>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBusiness = await apiPut<LegacyCompany>(`/companies/${businessId}`, data);

      const state = get();
      const updatedBusinesses = state.businesses.map(b => 
        b.id === businessId ? updatedBusiness : b
      );
      
      const updatedCurrentBusiness = state.currentBusiness?.id === businessId 
        ? updatedBusiness 
        : state.currentBusiness;

      set({ 
        businesses: updatedBusinesses,
        companies: updatedBusinesses,
        currentBusiness: updatedCurrentBusiness,
        currentCompany: updatedCurrentBusiness,
        isLoading: false 
      });

      return true;
    } catch (error) {
      console.error('Error updating business:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update business', 
        isLoading: false 
      });
      return false;
    }
  },

  // Alias for backward compatibility
  updateCompany: async (companyId: string, data: Partial<LegacyCompany>) => {
    return get().updateBusiness(companyId, data);
  },

  createLocation: async (businessId: string, data: Omit<LegacyLocation, 'id' | 'companyId'>) => {
    set({ isLoading: true, error: null });
    try {
      const newLocation = await apiPost<LegacyLocation>(`/companies/${businessId}/locations`, data);

      const state = get();
      const updatedLocations = [...state.locations, newLocation];
      
      let updatedCurrentBusiness = state.currentBusiness;
      if (updatedCurrentBusiness && updatedCurrentBusiness.id === businessId) {
        updatedCurrentBusiness = {
          ...updatedCurrentBusiness,
          locations: updatedLocations
        };
      }

      set({ 
        locations: updatedLocations,
        currentBusiness: updatedCurrentBusiness,
        currentCompany: updatedCurrentBusiness,
        isLoading: false 
      });

      return newLocation;
    } catch (error) {
      console.error('Error creating location:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create location', 
        isLoading: false 
      });
      return null;
    }
  },

  updateLocation: async (businessId: string, locationId: string, data: Partial<LegacyLocation>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLocation = await apiPut<LegacyLocation>(`/companies/${businessId}/locations/${locationId}`, data);

      const state = get();
      const updatedLocations = state.locations.map(location => 
        location.id === locationId ? updatedLocation : location
      );
      
      let updatedCurrentBusiness = state.currentBusiness;
      if (updatedCurrentBusiness && updatedCurrentBusiness.id === businessId) {
        updatedCurrentBusiness = {
          ...updatedCurrentBusiness,
          locations: updatedLocations
        };
      }

      const updatedCurrentLocation = state.currentLocation?.id === locationId 
        ? updatedLocation 
        : state.currentLocation;

      set({ 
        locations: updatedLocations,
        currentBusiness: updatedCurrentBusiness,
        currentCompany: updatedCurrentBusiness,
        currentLocation: updatedCurrentLocation,
        isLoading: false 
      });

      return true;
    } catch (error) {
      console.error('Error updating location:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update location', 
        isLoading: false 
      });
      return false;
    }
  },

  deleteLocation: async (businessId: string, locationId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDel(`/companies/${businessId}/locations/${locationId}`);

      const state = get();
      const updatedLocations = state.locations.filter(location => location.id !== locationId);
      
      let updatedCurrentBusiness = state.currentBusiness;
      if (updatedCurrentBusiness && updatedCurrentBusiness.id === businessId) {
        updatedCurrentBusiness = {
          ...updatedCurrentBusiness,
          locations: updatedLocations
        };
      }

      const updatedCurrentLocation = state.currentLocation?.id === locationId 
        ? (updatedLocations.length > 0 ? updatedLocations[0] : null)
        : state.currentLocation;

      set({ 
        locations: updatedLocations,
        currentBusiness: updatedCurrentBusiness,
        currentCompany: updatedCurrentBusiness,
        currentLocation: updatedCurrentLocation,
        isLoading: false 
      });

      return true;
    } catch (error) {
      console.error('Error deleting location:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete location', 
        isLoading: false 
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    businesses: [],
    companies: [],
    currentBusiness: null,
    currentCompany: null,
    locations: [],
    currentLocation: null,
    currentLocationId: null,
    isLoading: false,
    error: null,
  }),
    }),
    {
      name: 'noupro-business-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the location selection preference
      partialize: (state) => ({
        currentLocationId: state.currentLocationId,
      }),
    }
  )
);

// Helper functions
export const businessStoreHelpers = {
  getBusinessById: (businesses: LegacyCompany[], id: string) => {
    return businesses.find(b => b.id === id);
  },

  getLocationById: (locations: LegacyLocation[], id: string) => {
    return locations.find(l => l.id === id);
  },

  hasBusinessAccess: (userBusinessId: string, targetBusinessId: string) => {
    return userBusinessId === targetBusinessId;
  },

  hasLocationAccess: (userLocationIds: string[], targetLocationId: string) => {
    return userLocationIds.includes(targetLocationId);
  },

  getBusinessLocations: (locations: LegacyLocation[], businessId: string) => {
    return locations.filter(l => l.companyId === businessId);
  },
};
