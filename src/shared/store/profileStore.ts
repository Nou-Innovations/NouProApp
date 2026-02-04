/**
 * Profile Store
 * Manages the dual-mode identity system: Personal Profile and Business Profile
 * 
 * Based on app-logic.json identitySystem:
 * - Personal Profile = individual user (REQUIRED for everyone)
 * - Business Profile = professional entity
 * - Users can switch between profiles (identity change, not logout)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/shared/types/user';
import { Business, BusinessStaff, StaffRole, StaffRoleType, UserBusiness } from '@/shared/types/business';
import { ProfileMode } from '@/shared/types/roles';
import { SubscriptionPlan, PLAN_FEATURES } from '@/shared/types/subscription';

/**
 * Profile Store State
 */
interface ProfileState {
  // ========== Authentication ==========
  // Auth tokens (persisted to AsyncStorage)
  accessToken: string | null;
  refreshToken: string | null;
  
  // Stay signed in preference (OFF by default = require sign in every time)
  staySignedIn: boolean;
  
  // Security settings (Personal mode only)
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  
  // Current user (Personal Profile) - REQUIRED
  currentUser: User | null;
  
  // Active mode: 'personal' or 'business'
  activeMode: ProfileMode;
  
  // When in business mode, which business is active
  activeBusinessId: string | null;
  activeBusiness: Business | null;
  
  // User's role in the active business
  currentUserRole: StaffRole | null;
  currentStaffEntry: BusinessStaff | null;
  currentStaffRoleType: StaffRoleType | null; // Added for delivery/inventory staff
  
  // All businesses the user has access to (owns or is staff)
  userBusinesses: UserBusiness[];
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // New user flag - true when user just registered, false after first home screen view
  isNewUser: boolean;
}

/**
 * Profile Store Actions
 */
interface ProfileActions {
  // ========== Authentication ==========
  // Set auth tokens (called after login)
  setTokens: (accessToken: string, refreshToken?: string) => void;
  // Clear tokens (called on logout)
  clearTokens: () => void;
  // Check if user is authenticated
  isAuthenticated: () => boolean;
  // Get current access token (for API interceptors)
  getAccessToken: () => string | null;
  
  // Initialization
  initialize: (user: User) => void;
  
  // Full login - sets user, tokens, and businesses in one call
  login: (user: User, accessToken: string, refreshToken?: string, businesses?: UserBusiness[], isNewUser?: boolean) => void;
  // Full logout - clears everything
  logout: () => void;
  // Clear new user flag (after showing welcome message)
  clearNewUserFlag: () => void;
  
  // Profile switching
  switchToPersonal: () => void;
  switchToBusiness: (businessId: string) => Promise<boolean>;
  
  // User management
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  
  // Business management
  setUserBusinesses: (businesses: UserBusiness[]) => void;
  addUserBusiness: (business: UserBusiness) => void;
  removeUserBusiness: (businessId: string) => void;
  updateUserBusiness: (businessId: string, updates: Partial<Business>) => void;
  
  // Role management
  setCurrentUserRole: (role: StaffRole | null, staffEntry: BusinessStaff | null) => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
  
  // Stay signed in preference
  setStaySignedIn: (value: boolean) => void;
  
  // Security settings (Personal mode only)
  setTwoFactorEnabled: (value: boolean) => void;
  setBiometricEnabled: (value: boolean) => void;
  
  // Computed getters (as functions since Zustand doesn't support true getters)
  isPersonalMode: () => boolean;
  isBusinessMode: () => boolean;
  getActiveBusinessPlan: () => SubscriptionPlan | null;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  canManageStaff: () => boolean;
  canPublish: () => boolean;
}

type ProfileStore = ProfileState & ProfileActions;

/**
 * Initial state
 */
const initialState: ProfileState = {
  // Auth
  accessToken: null,
  refreshToken: null,
  staySignedIn: false, // OFF by default = require sign in every time
  // Security settings
  twoFactorEnabled: false,
  biometricEnabled: false,
  // User
  currentUser: null,
  activeMode: 'personal',
  activeBusinessId: null,
  activeBusiness: null,
  currentUserRole: null,
  currentStaffEntry: null,
  currentStaffRoleType: null,
  userBusinesses: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  isNewUser: false,
};

/**
 * Profile Store
 * Persists activeMode, activeBusinessId to maintain context across sessions
 */
export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== Authentication Actions ==========
      
      /**
       * Set auth tokens after successful login
       */
      setTokens: (accessToken: string, refreshToken?: string) => {
        set({
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
        });
      },

      /**
       * Clear auth tokens (on logout or token expiry)
       */
      clearTokens: () => {
        set({
          accessToken: null,
          refreshToken: null,
        });
      },

      /**
       * Check if user is authenticated (has valid token)
       */
      isAuthenticated: () => {
        const state = get();
        return !!state.accessToken && !!state.currentUser;
      },

      /**
       * Get current access token (for API interceptors)
       */
      getAccessToken: () => get().accessToken,

      /**
       * Full login - sets user, tokens, and optionally businesses
       * isNewUser flag is true for newly registered users to show welcome message
       */
      login: (user: User, accessToken: string, refreshToken?: string, businesses?: UserBusiness[], isNewUser?: boolean) => {
        set({
          currentUser: user,
          accessToken,
          refreshToken: refreshToken ?? null,
          userBusinesses: businesses ?? [],
          isInitialized: true,
          error: null,
          isNewUser: isNewUser ?? false,
        });
      },

      /**
       * Full logout - clears all auth state
       */
      logout: () => {
        set({
          ...initialState,
          isInitialized: true, // Keep initialized to prevent dev seed re-run
        });
      },

      /**
       * Clear new user flag (after showing welcome message)
       */
      clearNewUserFlag: () => {
        set({ isNewUser: false });
      },

      /**
       * Initialize the store with the current user
       * Preserves the activeMode from persisted storage (last used profile)
       */
      initialize: (user: User) => {
        const currentState = get();
        // Keep the persisted activeMode (from last session) instead of resetting to 'personal'
        set({
          currentUser: user,
          isInitialized: true,
          // Only set to 'personal' if there's no persisted activeMode
          // The persisted state is automatically restored by zustand-persist before this runs
        });
      },

      /**
       * Switch to Personal Profile mode
       */
      switchToPersonal: () => {
        set({
          activeMode: 'personal',
          activeBusinessId: null,
          activeBusiness: null,
          currentUserRole: null,
          currentStaffEntry: null,
          currentStaffRoleType: null,
        });
      },

      /**
       * Switch to Business Profile mode
       * @param businessId - The business ID to switch to
       * @returns Promise<boolean> - Success status
       */
      switchToBusiness: async (businessId: string) => {
        const state = get();
        
        // Find the business in user's businesses
        const userBusiness = state.userBusinesses.find(
          (ub) => ub.business.id === businessId
        );

        if (!userBusiness) {
          set({ error: 'Business not found or no access' });
          return false;
        }

        // Check if staff status is accepted
        if (userBusiness.staff_entry.status !== 'accepted') {
          set({ error: 'Your access to this business is invited or suspended' });
          return false;
        }

        // Staff cannot access business mode
        if (userBusiness.role === 'staff') {
          set({
            activeMode: 'personal',
            activeBusinessId: null,
            activeBusiness: null,
            currentUserRole: null,
            currentStaffEntry: null,
            currentStaffRoleType: null,
            error: 'Staff members can only use Personal mode',
          });
          return false;
        }

        set({
          activeMode: 'business',
          activeBusinessId: businessId,
          activeBusiness: userBusiness.business,
          currentUserRole: userBusiness.role,
          currentStaffEntry: userBusiness.staff_entry,
          currentStaffRoleType: userBusiness.staff_entry.role_type ?? null,
          error: null,
        });

        return true;
      },

      /**
       * Set the current user
       */
      setCurrentUser: (user: User | null) => {
        if (!user) {
          // If user is null, reset to initial state
          set(initialState);
        } else {
          set({ currentUser: user, isInitialized: true });
        }
      },

      /**
       * Update current user fields
       */
      updateCurrentUser: (updates: Partial<User>) => {
        const state = get();
        if (state.currentUser) {
          set({
            currentUser: { ...state.currentUser, ...updates },
          });
        }
      },

      /**
       * Set all user businesses
       */
      setUserBusinesses: (businesses: UserBusiness[]) => {
        set({ userBusinesses: businesses });
        
        // If currently in business mode, update active business data
        const state = get();
        if (state.activeMode === 'business' && state.activeBusinessId) {
          const activeBusiness = businesses.find(
            (ub) => ub.business.id === state.activeBusinessId
          );
          if (activeBusiness) {
            set({
              activeBusiness: activeBusiness.business,
              currentUserRole: activeBusiness.role,
              currentStaffEntry: activeBusiness.staff_entry,
              currentStaffRoleType: activeBusiness.staff_entry.role_type ?? null,
            });
          } else {
            // Business no longer accessible, switch to personal
            get().switchToPersonal();
          }
        }
      },

      /**
       * Add a new business to user's businesses
       */
      addUserBusiness: (business: UserBusiness) => {
        const state = get();
        set({
          userBusinesses: [...state.userBusinesses, business],
        });
      },

      /**
       * Remove a business from user's businesses
       */
      removeUserBusiness: (businessId: string) => {
        const state = get();
        set({
          userBusinesses: state.userBusinesses.filter(
            (ub) => ub.business.id !== businessId
          ),
        });

        // If this was the active business, switch to personal
        if (state.activeBusinessId === businessId) {
          get().switchToPersonal();
        }
      },

      /**
       * Update a specific business
       */
      updateUserBusiness: (businessId: string, updates: Partial<Business>) => {
        const state = get();
        set({
          userBusinesses: state.userBusinesses.map((ub) =>
            ub.business.id === businessId
              ? { ...ub, business: { ...ub.business, ...updates } }
              : ub
          ),
        });

        // Update active business if it's the one being updated
        if (state.activeBusinessId === businessId && state.activeBusiness) {
          set({
            activeBusiness: { ...state.activeBusiness, ...updates },
          });
        }
      },

      /**
       * Set current user's role in active business
       */
      setCurrentUserRole: (role: StaffRole | null, staffEntry: BusinessStaff | null) => {
        set({
          currentUserRole: role,
          currentStaffEntry: staffEntry,
        });
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),

      /**
       * Reset store to initial state
       */
      reset: () => set(initialState),

      /**
       * Set stay signed in preference
       */
      setStaySignedIn: (value: boolean) => set({ staySignedIn: value }),

      /**
       * Set two-factor authentication enabled
       */
      setTwoFactorEnabled: (value: boolean) => set({ twoFactorEnabled: value }),

      /**
       * Set biometric login enabled
       */
      setBiometricEnabled: (value: boolean) => set({ biometricEnabled: value }),

      // ========== Computed Getters ==========

      /**
       * Check if currently in personal mode
       */
      isPersonalMode: () => get().activeMode === 'personal',

      /**
       * Check if currently in business mode
       */
      isBusinessMode: () => get().activeMode === 'business',

      /**
       * Get the active business's subscription plan
       */
      getActiveBusinessPlan: () => {
        const state = get();
        return state.activeBusiness?.plan ?? null;
      },

      /**
       * Check if current user is super admin of active business
       */
      isSuperAdmin: () => get().currentUserRole === 'super_admin',

      /**
       * Check if current user is admin of active business
       */
      isAdmin: () => {
        const role = get().currentUserRole;
        return role === 'admin' || role === 'super_admin';
      },

      /**
       * Check if current user is staff of active business
       */
      isStaff: () => get().currentUserRole === 'staff',

      /**
       * Check if current user can manage staff
       */
      canManageStaff: () => get().currentUserRole === 'super_admin',

      /**
       * Check if current user can publish (business page or products)
       * Requires paid plan AND admin/super_admin role
       */
      canPublish: () => {
        const state = get();
        const plan = state.activeBusiness?.plan;
        const role = state.currentUserRole;
        
        // Must have plan with publish_business_page capability
        const canPublishPage = plan ? PLAN_FEATURES[plan].publish_business_page : false;
        
        // Must be admin or super_admin
        const hasRole = role === 'admin' || role === 'super_admin';
        
        return canPublishPage && hasRole;
      },
    }),
    {
      name: 'noupro-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist auth tokens, user data, and mode preferences
      // Note: currentUser and userBusinesses are persisted for "Stay Signed In" feature
      partialize: (state: ProfileStore) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        staySignedIn: state.staySignedIn,
        twoFactorEnabled: state.twoFactorEnabled,
        biometricEnabled: state.biometricEnabled,
        activeMode: state.activeMode,
        activeBusinessId: state.activeBusinessId,
        // Persist user data for "Stay Signed In" feature
        currentUser: state.currentUser,
        userBusinesses: state.userBusinesses,
        activeBusiness: state.activeBusiness,
        currentUserRole: state.currentUserRole,
        currentStaffEntry: state.currentStaffEntry,
        currentStaffRoleType: state.currentStaffRoleType,
      } as ProfileStore),
      // On rehydration, clear auth if "Stay Signed In" is disabled
      onRehydrateStorage: () => (state) => {
        if (state && !state.staySignedIn) {
          // Clear auth data if user didn't want to stay signed in
          state.accessToken = null;
          state.refreshToken = null;
          state.currentUser = null;
          state.userBusinesses = [];
          state.activeBusiness = null;
          state.activeBusinessId = null;
          state.currentUserRole = null;
          state.currentStaffEntry = null;
          state.currentStaffRoleType = null;
          state.activeMode = 'personal';
        }
      },
    }
  )
);

// ========== Selector Hooks ==========

/**
 * Get access token
 */
export const useAccessToken = () => useProfileStore((state) => state.accessToken);

/**
 * Check if authenticated
 */
export const useIsAuthenticated = () => useProfileStore((state) => !!state.accessToken && !!state.currentUser);

/**
 * Get current user
 */
export const useCurrentUser = () => useProfileStore((state) => state.currentUser);

/**
 * Get active mode
 */
export const useActiveMode = () => useProfileStore((state) => state.activeMode);

/**
 * Get active business
 */
export const useActiveBusiness = () => useProfileStore((state) => state.activeBusiness);

/**
 * Get current user role
 */
export const useCurrentUserRole = () => useProfileStore((state) => state.currentUserRole);

/**
 * Get user businesses
 */
export const useUserBusinesses = () => useProfileStore((state) => state.userBusinesses);

/**
 * Check if in business mode
 */
export const useIsBusinessMode = () => useProfileStore((state) => state.activeMode === 'business');

/**
 * Check if in personal mode
 */
export const useIsPersonalMode = () => useProfileStore((state) => state.activeMode === 'personal');

// ========== Helper Functions ==========

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: StaffRole | null): string => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff';
    default:
      return 'Unknown';
  }
};


