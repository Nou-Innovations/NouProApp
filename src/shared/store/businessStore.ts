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
 * Location Selection:
 * - Always defaults to "All Locations" (null) on app startup
 * - Users can manually select a specific location during the session
 * - Location selection is NOT persisted across app restarts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get as apiGet, put as apiPut, patch as apiPatch, post as apiPost, del as apiDel } from '@/shared/services/api';
import { Business, BusinessLocation, UpdateBusinessPayload } from '@/shared/types/business';
import { useProfileStore, normalizeBusiness } from '@/shared/store/profileStore';

/**
 * Legacy Company interface for backward compatibility
 * Maps to Business type
 */
interface LegacyCompany {
  id: string;
  name: string;
  logoUrl?: string;
  logo_url?: string;
  bannerUrl?: string;
  banner_url?: string;
  description?: string;
  phone?: string;
  email?: string;
  category?: string;
  industry?: string;
  website?: string;
  address?: string;
  locations: LegacyLocation[];
  settings: {
    taxRate?: number;
    currency?: string;
    invoicePrefix?: string;
    allowPartialPayments?: boolean;
    autoGenerateInvoices?: boolean;
    businessHours?: {
      day: string;
      isOpen: boolean;
      timeSlots: { open: string; close: string }[];
    }[];
    timezone?: string;
    allowLocationPriceOverride?: boolean;
    allowLocationTaxOverride?: boolean;
    pricePrivacyEnabled?: boolean;
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
  location_type?: string;
  latitude?: number;
  longitude?: number;
  operating_mode?: 'DEPENDENT' | 'INDEPENDENT';
  is_public?: boolean;
  is_primary?: boolean;
  staff_count?: number;
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
  currentLocationId: string | null; // null = "All Locations" (default on app start)
  
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
 * Always defaults to "All Locations" on app startup
 */
export const useBusinessStore = create<BusinessStoreState>()(
  persist(
    (set, get) => ({
  businesses: [],
  currentBusiness: null,
  locations: [],
  currentLocation: null,
  currentLocationId: null, // null = "All Locations" (default)
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
      currentLocationId: null, // Reset to "All Locations"
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
      const rawBusinesses = await apiGet<LegacyCompany[]>('/companies');
      // Normalize each business so snake_case fields (logo_url, banner_url, etc.)
      // are correctly populated — the API returns camelCase from Prisma
      const businesses = rawBusinesses.map(b => normalizeBusiness(b) as unknown as LegacyCompany);
      set({ businesses, companies: businesses, isLoading: false });
      
      const state = get();
      if (businesses.length > 0 && !state.currentBusiness) {
        state.setBusiness(businesses[0]);
      }
    } catch (error) {
      set({ businesses: [], companies: [], isLoading: false, error: 'Failed to load businesses' });
    }
  },

  // Alias for backward compatibility
  fetchCompanies: async () => {
    return get().fetchBusinesses();
  },

  fetchLocations: async (businessId: string) => {
    set({ isLoading: true, error: null });
    try {
      const raw = await apiGet<Record<string, any>[]>(`/companies/${businessId}/locations`);
      // Map backend camelCase response to store's field names
      const locations: LegacyLocation[] = raw.map((loc) => ({
        id: loc.id,
        companyId: loc.businessId || loc.companyId || businessId,
        name: loc.name || '',
        address: loc.address || '',
        phone: loc.phone,
        email: loc.email,
        location_type: loc.locationType || loc.location_type,
        latitude: loc.latitude,
        longitude: loc.longitude,
        operating_mode: loc.operatingMode || loc.operating_mode,
        is_public: loc.isPublic ?? loc.is_public,
        is_primary: loc.is_primary,
        staff_count: loc.staffCount || loc.staff_count,
      }));
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

      // Default to "All Locations" on app startup
      // Users can manually select a specific location if needed
      set({ currentLocation: null, currentLocationId: null });
    } catch (error) {
      if (__DEV__) console.log('Failed to fetch locations:', error);
      set({ locations: [], isLoading: false, error: 'Failed to load locations' });
    }
  },

  updateBusiness: async (businessId: string, data: Partial<LegacyCompany>) => {
    set({ isLoading: true, error: null });
    try {
      const rawUpdated = await apiPatch<LegacyCompany>(`/companies/${businessId}`, data);
      const updatedBusiness = normalizeBusiness(rawUpdated) as unknown as LegacyCompany;

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

      // Sync the updated business into profileStore.userBusinesses so the
      // profile switcher and company header reflect the latest data immediately
      const profileState = useProfileStore.getState();
      const updatedUserBusinesses = profileState.userBusinesses.map(ub =>
        ub.business.id === businessId
          ? { ...ub, business: { ...ub.business, ...updatedBusiness } }
          : ub
      );
      // Use setUserBusinesses() instead of setState() directly so that
      // activeBusiness, currentUserRole, and currentStaffEntry are also
      // updated when the user is in business mode
      useProfileStore.getState().setUserBusinesses(updatedUserBusinesses);

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
      // Map snake_case frontend fields → camelCase backend fields
      const backendPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        if (key === 'operating_mode') backendPayload.operatingMode = value;
        else if (key === 'is_public') backendPayload.isPublic = value;
        else if (key === 'location_type') backendPayload.locationType = value;
        else if (key === 'is_primary') continue; // not a backend field
        else backendPayload[key] = value;
      }
      const result = await apiPatch<Record<string, any>>(`/locations/${locationId}`, backendPayload);
      // Map camelCase backend response → LegacyLocation shape
      const updatedLocation: LegacyLocation = {
        id: result.id,
        companyId: result.businessId || result.business_id,
        name: result.name,
        address: result.address || '',
        phone: result.phone,
        email: result.email,
        location_type: result.locationType || result.location_type,
        latitude: result.latitude,
        longitude: result.longitude,
        operating_mode: result.operatingMode || result.operating_mode,
        is_public: result.isPublic ?? result.is_public,
        is_primary: result.is_primary,
        staff_count: result.staffCount || result.staff_count,
      };

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
      // Don't persist location selection - always default to "All Locations" on app start
      partialize: (state) => ({
        // Empty object = nothing persisted
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
