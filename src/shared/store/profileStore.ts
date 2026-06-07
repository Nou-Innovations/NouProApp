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
import { chatService } from '@/shared/services/chat';
// Graceful fallback: use SecureStore when native module is available, otherwise AsyncStorage
let SecureStoreAvailable = false;
let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
  // Test if the native module is actually available (not just the JS package)
  SecureStoreAvailable = !!SecureStore?.getItemAsync;
} catch {
  SecureStoreAvailable = false;
}

const secureGet = async (key: string): Promise<string | null> => {
  if (SecureStoreAvailable && SecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
};

const secureSet = async (key: string, value: string): Promise<void> => {
  if (SecureStoreAvailable && SecureStore) {
    return SecureStore.setItemAsync(key, value);
  }
  return AsyncStorage.setItem(key, value);
};

const secureDelete = async (key: string): Promise<void> => {
  if (SecureStoreAvailable && SecureStore) {
    return SecureStore.deleteItemAsync(key);
  }
  return AsyncStorage.removeItem(key);
};

/**
 * Profile Store State
 */
interface ProfileState {
  // ========== Authentication ==========
  // Auth tokens (persisted to AsyncStorage)
  accessToken: string | null;
  refreshToken: string | null;
  
  // Stay signed in preference (ON by default = users stay logged in across app restarts)
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

  // True once SecureStore tokens have been loaded (prevents API calls before auth is ready)
  isRehydrated: boolean;
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
  removeUserBusiness: (businessId: string) => Promise<void>;
  updateUserBusiness: (businessId: string, updates: Partial<Business>) => void;
  refreshBusinesses: () => Promise<void>;
  
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
 * Normalize a user object from the backend to match the frontend User type.
 * The backend returns camelCase fields but the frontend User type expects snake_case.
 */
export function normalizeUser(raw: any): User {
  return {
    ...raw,
    avatar_url: raw.avatar_url || raw.avatar || raw.profilePicture || null,
    job_title: raw.job_title || raw.jobTitle || null,
    description: raw.description || null,
    address: raw.address || null,
    language: raw.language || 'EN',
    notifications_on: raw.notifications_on ?? true,
    privacy_settings: raw.privacy_settings || raw.privacySettings || null,
    connections_count: raw.connections_count ?? raw.connectionsCount ?? 0,
    created_at: raw.created_at || raw.createdAt,
    updated_at: raw.updated_at || raw.updatedAt,
  };
}

/**
 * Normalize a business object from the backend to match the frontend Business type.
 * The backend returns camelCase fields but the frontend Business type expects snake_case.
 */
export function normalizeBusiness(raw: any): Business {
  return {
    ...raw,
    logo_url: raw.logo_url || raw.logoUrl || null,
    banner_url: raw.banner_url || raw.bannerUrl || null,
    industry: raw.industry || null,
    category: raw.category || null,
    description: raw.description || null,
    phone: raw.phone || null,
    email: raw.email || null,
    address: raw.address || null,
    website: raw.website || null,
    owner_id: raw.owner_id || raw.ownerId || null,
    is_published: raw.is_published ?? raw.isPublished ?? false,
    plan: raw.plan || (raw.subscriptionTier || 'FREE').toLowerCase(),
    subscription_status: raw.subscription_status || 'active',
    connections_count: raw.connections_count ?? raw.connectionsCount ?? 0,
    settings: raw.settings || null,
    created_at: raw.created_at || raw.createdAt,
    updated_at: raw.updated_at || raw.updatedAt,
  };
}

/**
 * Initial state
 */
const initialState: ProfileState = {
  // Auth
  accessToken: null,
  refreshToken: null,
  staySignedIn: true, // ON by default = users stay logged in across app restarts
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
  isRehydrated: false,
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
        // Persist to SecureStore
        secureSet('noupro_access_token', accessToken).catch(() => {});
        if (refreshToken) {
          secureSet('noupro_refresh_token', refreshToken).catch(() => {});
        }
        // Update socket with fresh token
        const userId = get().currentUser?.id;
        if (userId) {
          chatService.updateAuth({ userId, token: accessToken });
        }
      },

      /**
       * Clear auth tokens (on logout or token expiry)
       */
      clearTokens: () => {
        set({
          accessToken: null,
          refreshToken: null,
        });
        secureDelete('noupro_access_token').catch(() => {});
        secureDelete('noupro_refresh_token').catch(() => {});
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
        const normalizedUser = normalizeUser(user);
        // Normalize business objects in each UserBusiness entry
        const normalizedBusinesses = (businesses ?? []).map(ub => ({
          ...ub,
          business: normalizeBusiness(ub.business),
        }));
        set({
          currentUser: normalizedUser,
          accessToken,
          refreshToken: refreshToken ?? null,
          userBusinesses: normalizedBusinesses,
          isInitialized: true,
          error: null,
          isNewUser: isNewUser ?? false,
          twoFactorEnabled: !!(user as any).twoFactorEnabled,
        });

        // Persist tokens to SecureStore
        secureSet('noupro_access_token', accessToken).catch(() => {});
        if (refreshToken) {
          secureSet('noupro_refresh_token', refreshToken).catch(() => {});
        }

        // Connect to Socket.IO for real-time messaging
        chatService.connect({ userId: normalizedUser.id, token: accessToken });
      },

      /**
       * Full logout - clears all auth state and resets all feature stores
       */
      logout: () => {
        // Disconnect Socket.IO
        chatService.disconnect();

        // Clear tokens and biometric key from SecureStore
        secureDelete('noupro_access_token').catch(() => {});
        secureDelete('noupro_refresh_token').catch(() => {});
        secureDelete('noupro_biometric_user_id').catch(() => {});

        // Clear offline message queue from AsyncStorage
        AsyncStorage.removeItem('@offline_message_queue').catch(() => {});

        // Reset other stores (lazy require to avoid circular dependencies at module load time)
        try { require('@/shared/store/businessStore').useBusinessStore.getState().reset(); } catch {}
        try { require('@/shared/store/orderStore').useOrderStore.getState().reset(); } catch {}
        try { require('@/shared/store/index').useAppStore.getState().reset(); } catch {}
        try { require('@/features/inbox/inbox.store').useInboxStore.getState().resetInbox(); } catch {}
        try { require('@/features/deliveries/deliveries.store').useDeliveriesStore.getState().resetDeliveries(); } catch {}
        try { require('@/features/procurement/store/procurement.store').useProcurementStore.getState().resetProcurement(); } catch {}

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
          activeBusiness: normalizeBusiness(userBusiness.business),
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
          userBusinesses: [...state.userBusinesses, {
            ...business,
            business: normalizeBusiness(business.business),
          }],
        });
      },

      /**
       * Refresh the user's business list from the server.
       * Call this after a join request is approved to pick up the new membership.
       */
      refreshBusinesses: async () => {
        try {
          const { get: apiGet } = require('@/shared/services/api') as typeof import('@/shared/services/api');
          const response = await apiGet<{ user: any; businesses: UserBusiness[] }>('/auth/me');
          const businesses = response?.businesses ?? [];
          const normalized = businesses.map((ub: UserBusiness) => ({
            ...ub,
            business: normalizeBusiness(ub.business),
          }));
          get().setUserBusinesses(normalized);
        } catch {
          // Silently ignore refresh errors — user can try again later
        }
      },

      /**
       * Remove a business from user's businesses (calls API, then updates local state)
       */
      removeUserBusiness: async (businessId: string) => {
        // Call API to leave company (lazy require to avoid circular deps)
        const { leaveCompany } = require('@/features/team/team.service');
        await leaveCompany(businessId);

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
      // Persist non-sensitive data to AsyncStorage
      // Tokens are stored separately in SecureStore
      partialize: (state: ProfileStore) => ({
        staySignedIn: state.staySignedIn,
        twoFactorEnabled: state.twoFactorEnabled,
        biometricEnabled: state.biometricEnabled,
        activeMode: state.activeMode,
        activeBusinessId: state.activeBusinessId,
        currentUser: state.currentUser,
        userBusinesses: state.userBusinesses,
        activeBusiness: state.activeBusiness,
        currentUserRole: state.currentUserRole,
        currentStaffEntry: state.currentStaffEntry,
        currentStaffRoleType: state.currentStaffRoleType,
      } as ProfileStore),
      // On rehydration, load tokens from SecureStore and handle staySignedIn
      onRehydrateStorage: () => async (state) => {
        if (!state) return;

        try {
          const accessToken = await secureGet('noupro_access_token');
          const refreshToken = await secureGet('noupro_refresh_token');

          if (!state.staySignedIn) {
            // Clear auth data if user didn't want to stay signed in
            await secureDelete('noupro_access_token');
            await secureDelete('noupro_refresh_token');
            // Also clear biometric credentials since session is not persisted
            await secureDelete('noupro_biometric_user_id');
            useProfileStore.setState({
              accessToken: null,
              refreshToken: null,
              currentUser: null,
              userBusinesses: [],
              activeBusiness: null,
              activeBusinessId: null,
              currentUserRole: null,
              currentStaffEntry: null,
              currentStaffRoleType: null,
              activeMode: 'personal',
              biometricEnabled: false,
            });
          } else if (accessToken) {
            // Refresh token if expired before restoring session
            let freshAccessToken = accessToken;
            if (refreshToken) {
              try {
                const { authAPI } = require('@/shared/services/api');
                const result = await authAPI.refreshTokenIfNeeded(accessToken, refreshToken);
                freshAccessToken = result.token;
                // Persist refreshed tokens
                if (result.token !== accessToken) {
                  secureSet('noupro_access_token', result.token).catch(() => {});
                }
                if (result.refreshToken !== refreshToken) {
                  secureSet('noupro_refresh_token', result.refreshToken).catch(() => {});
                }
              } catch {
                // If refresh fails, continue with existing token
              }
            }
            // Restore tokens from SecureStore
            useProfileStore.setState({ accessToken: freshAccessToken, refreshToken });
            // Reconnect socket for persisted sessions
            if (state.currentUser?.id) {
              chatService.connect({ userId: state.currentUser.id, token: freshAccessToken });
            }
          }
        } catch (err) {
          console.warn('[ProfileStore] Failed to load tokens from SecureStore:', err);
        } finally {
          useProfileStore.setState({ isRehydrated: true });
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

/**
 * True once SecureStore tokens have been loaded on startup
 */
export const useIsRehydrated = () => useProfileStore((state) => state.isRehydrated);

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


