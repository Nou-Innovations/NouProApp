/**
 * User Types - Personal Profile
 * Based on app-logic.json dataModels.user
 * 
 * User Profile represents an individual user. REQUIRED for everyone to use the app.
 * Every user MUST have exactly ONE User Profile to access the app.
 */

export type Language = 'EN' | 'FR';

/**
 * Privacy settings for user profile
 * Controls what information is visible to non-connected users
 */
export interface UserPrivacySettings {
  show_email_publicly: boolean;
  show_phone_publicly: boolean;
  show_address_publicly: boolean;
}

/**
 * User - Personal Profile entity
 * This is the personal identity layer, distinct from Business Profile
 */
export interface User {
  id: string; // UUID
  name: string;
  email?: string; // Optional if phone-based login
  phone?: string; // Optional if email-based login
  password_hash?: string; // Secured credentials (not exposed to frontend typically)
  avatar_url?: string;
  job_title?: string;
  description?: string;
  address?: string;
  language: Language;
  notifications_on: boolean;
  privacy_settings?: UserPrivacySettings;
  connections_count?: number;
  created_at: string; // ISO timestamp
  updated_at?: string;
}

/**
 * User creation payload (for registration)
 */
export interface CreateUserPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  language?: Language;
}

/**
 * User update payload
 */
export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  job_title?: string;
  description?: string;
  language?: Language;
  notifications_on?: boolean;
}

/**
 * User Profile as viewed by others
 * Limited information for public viewing
 * Contact info (email, phone, address) only visible if:
 * 1. Viewer is connected with the user, OR
 * 2. User has enabled public visibility in privacy settings
 */
export interface PublicUserProfile {
  id: string;
  name: string;
  avatar_url?: string;
  job_title?: string;
  description?: string;
  connections_count?: number;
  // Contact info - only included if viewer is connected or privacy settings allow
  email?: string;
  phone?: string;
  address?: string;
  // Flag to indicate if viewer is connected (determines contact info visibility)
  is_connected?: boolean;
  company_affiliation?: {
    business_id: string;
    business_name: string;
    business_logo?: string;
    role: string;
    start_date?: string;
    end_date?: string; // null/undefined = Present
  };
  // Array for multiple company affiliations (experiences)
  experiences?: Array<{
    business_id: string;
    business_name: string;
    business_logo?: string;
    role: string;
    start_date?: string;
    end_date?: string;
  }>;
}

/**
 * Connection between two users
 */
export interface UserConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
}







