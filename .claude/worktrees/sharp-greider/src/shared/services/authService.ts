/**
 * Auth Utilities
 * 
 * Pure utility functions for authentication-related validation.
 * All actual API calls go through api.ts (authAPI).
 */

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with errors if any
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
