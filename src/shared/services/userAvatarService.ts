import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAvatarColors, generateInitials } from '@/shared/utils/avatarUtils';

interface UserAvatarData {
  userId: string;
  backgroundColor: string;
  textColor: string;
  initials: string;
  lastUpdated: number;
}

class UserAvatarService {
  private static instance: UserAvatarService;
  private avatarCache: Map<string, UserAvatarData> = new Map();
  private readonly STORAGE_KEY = 'user_avatar_colors';

  static getInstance(): UserAvatarService {
    if (!UserAvatarService.instance) {
      UserAvatarService.instance = new UserAvatarService();
    }
    return UserAvatarService.instance;
  }

  /**
   * Initialize the service by loading saved avatar data
   */
  async initialize(): Promise<void> {
    try {
      const savedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const avatarData: UserAvatarData[] = JSON.parse(savedData);
        avatarData.forEach(data => {
          this.avatarCache.set(data.userId, data);
        });
        console.log(`Loaded ${avatarData.length} user avatar colors from storage`);
      }
    } catch (error) {
      console.error('Error loading user avatar colors:', error);
    }
  }

  /**
   * Get or generate avatar data for a user
   */
  async getUserAvatarData(userId: string, userName: string): Promise<UserAvatarData> {
    // Check cache first
    if (this.avatarCache.has(userId)) {
      const cached = this.avatarCache.get(userId)!;
      // Update initials if name changed
      const currentInitials = generateInitials(userName);
      if (cached.initials !== currentInitials) {
        cached.initials = currentInitials;
        cached.lastUpdated = Date.now();
        this.avatarCache.set(userId, cached);
        await this.saveToStorage();
      }
      return cached;
    }

    // Generate new avatar data
    const [backgroundColor, textColor] = generateAvatarColors(userId + userName);
    const initials = generateInitials(userName);
    
    const avatarData: UserAvatarData = {
      userId,
      backgroundColor,
      textColor,
      initials,
      lastUpdated: Date.now()
    };

    // Cache and save
    this.avatarCache.set(userId, avatarData);
    await this.saveToStorage();

    console.log(`Generated new avatar colors for user ${userId}:`, avatarData);
    return avatarData;
  }

  /**
   * Get avatar colors for a user (returns [backgroundColor, textColor])
   */
  async getUserAvatarColors(userId: string, userName: string): Promise<[string, string]> {
    const avatarData = await this.getUserAvatarData(userId, userName);
    return [avatarData.backgroundColor, avatarData.textColor];
  }

  /**
   * Get initials for a user
   */
  async getUserInitials(userId: string, userName: string): Promise<string> {
    const avatarData = await this.getUserAvatarData(userId, userName);
    return avatarData.initials;
  }

  /**
   * Update user name and regenerate initials if needed
   */
  async updateUserName(userId: string, newUserName: string): Promise<UserAvatarData> {
    const avatarData = await this.getUserAvatarData(userId, newUserName);
    return avatarData;
  }

  /**
   * Clear avatar data for a user (useful for testing or user deletion)
   */
  async clearUserAvatarData(userId: string): Promise<void> {
    this.avatarCache.delete(userId);
    await this.saveToStorage();
    console.log(`Cleared avatar data for user ${userId}`);
  }

  /**
   * Clear all avatar data (useful for testing)
   */
  async clearAllAvatarData(): Promise<void> {
    this.avatarCache.clear();
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    console.log('Cleared all avatar data');
  }

  /**
   * Save current cache to AsyncStorage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const avatarData = Array.from(this.avatarCache.values());
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(avatarData));
    } catch (error) {
      console.error('Error saving user avatar colors:', error);
    }
  }

  /**
   * Get all cached avatar data (useful for debugging)
   */
  getAllCachedData(): UserAvatarData[] {
    return Array.from(this.avatarCache.values());
  }
}

// Export singleton instance
export const userAvatarService = UserAvatarService.getInstance(); 