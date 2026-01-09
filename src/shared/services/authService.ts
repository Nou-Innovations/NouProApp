// Authentication Service for handling password changes and user authentication

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  userId?: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface User {
  id: string;
  email: string;
  passwordHash: string; // In real app, this would be hashed
  profilePicture?: string; // Add profile picture field
}

// Mock user database - In real app, this would be your backend database
const mockUsers: User[] = [
  {
    id: '1',
    email: 'user@example.com',
    passwordHash: 'currentPassword123', // In real app, this would be properly hashed
    profilePicture: 'https://placehold.co/100x100/blue/white?text=👤', // Default avatar
  },
];

// Simulate password hashing (in real app, use bcrypt or similar)
const hashPassword = (password: string): string => {
  // This is just for simulation - use proper hashing in production
  return `hashed_${password}`;
};

// Simulate password verification
const verifyPassword = (password: string, hash: string): boolean => {
  // In real app, use bcrypt.compare or similar
  return password === hash;
};

// Simulate API delay
const simulateNetworkDelay = (ms: number = 1500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const authService = {
  /**
   * Change user password
   * @param request - Contains current password, new password, and optional user ID
   * @returns Promise with success/error response
   */
  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      // Simulate network delay
      await simulateNetworkDelay();

      const { currentPassword, newPassword, userId = '1' } = request;

      // Find user (in real app, this would be a database query)
      const user = mockUsers.find(u => u.id === userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        };
      }

      // Verify current password
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return {
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`,
          error: 'WEAK_PASSWORD'
        };
      }

      // Check if new password is different from current
      if (verifyPassword(newPassword, user.passwordHash)) {
        return {
          success: false,
          message: 'New password must be different from current password',
          error: 'SAME_PASSWORD'
        };
      }

      // Update password (in real app, this would be a database update)
      user.passwordHash = hashPassword(newPassword);

      // Log password change (in real app, add to audit log)
      console.log(`Password changed for user ${userId} at ${new Date().toISOString()}`);

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
        error: 'INTERNAL_ERROR'
      };
    }
  },

  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Validation result with errors if any
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
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
      errors
    };
  },

  /**
   * Get current user (mock implementation)
   * @param userId - User ID
   * @returns User information (without password)
   */
  async getCurrentUser(userId: string = '1'): Promise<Omit<User, 'passwordHash'> | null> {
    await simulateNetworkDelay(500);
    
    const user = mockUsers.find(u => u.id === userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      profilePicture: user.profilePicture
    };
  },

  /**
   * Update user profile picture
   * @param userId - User ID
   * @param profilePictureUrl - New profile picture URL
   * @returns Success status
   */
  async updateProfilePicture(userId: string, profilePictureUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      await simulateNetworkDelay(800);
      
      const user = mockUsers.find(u => u.id === userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Update profile picture
      user.profilePicture = profilePictureUrl;

      // Log profile picture update (in real app, add to audit log)
      console.log(`Profile picture updated for user ${userId} at ${new Date().toISOString()}`);

      return {
        success: true,
        message: 'Profile picture updated successfully'
      };

    } catch (error) {
      console.error('Profile picture update error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }
};

export type { ChangePasswordRequest, ChangePasswordResponse }; 