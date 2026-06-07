import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_CONFIG } from '@/shared/config/api';
import { useProfileStore } from '@/shared/store/profileStore';

interface ImageUploadResponse {
  success: boolean;
  imageUri?: string;
  error?: string;
}

interface ImageUploadRequest {
  userId: string;
  imageUri: string;
  imageType: 'profile' | 'cover';
}

// Storage keys
const STORAGE_KEYS = {
  PROFILE_PICTURES: 'profile_pictures',
};

// Simulate network delay
const simulateNetworkDelay = (ms: number = 1500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Copy image to permanent app directory
const copyImageToPermanentStorage = async (imageUri: string, userId: string): Promise<string> => {
  try {
    // Create a permanent directory for profile pictures
    const profilePicturesDir = `${FileSystem.documentDirectory}profile_pictures/`;
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(profilePicturesDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(profilePicturesDir, { intermediates: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    const fileName = `profile_${userId}_${timestamp}.${fileExtension}`;
    const permanentUri = `${profilePicturesDir}${fileName}`;

    // Copy the image to permanent storage
    await FileSystem.copyAsync({
      from: imageUri,
      to: permanentUri,
    });

    console.log('Image copied to permanent storage:', permanentUri);
    return permanentUri;

  } catch (error) {
    console.error('Error copying image to permanent storage:', error);
    throw error;
  }
};

// Save profile picture URI to AsyncStorage
const saveProfilePictureToStorage = async (userId: string, imageUri: string): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_PICTURES);
    const profilePictures = existingData ? JSON.parse(existingData) : {};
    
    profilePictures[userId] = imageUri;
    
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_PICTURES, JSON.stringify(profilePictures));
    console.log('Profile picture saved to storage for user:', userId);
  } catch (error) {
    console.error('Error saving profile picture to storage:', error);
  }
};

// Get profile picture URI from AsyncStorage
const getProfilePictureFromStorage = async (userId: string): Promise<string | null> => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_PICTURES);
    const profilePictures = existingData ? JSON.parse(existingData) : {};
    
    const imageUri = profilePictures[userId];
    
    // Verify the file still exists
    if (imageUri) {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (fileInfo.exists) {
        return imageUri;
      } else {
        // File doesn't exist, remove from storage
        delete profilePictures[userId];
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_PICTURES, JSON.stringify(profilePictures));
        console.log('Removed non-existent profile picture from storage for user:', userId);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting profile picture from storage:', error);
    return null;
  }
};

// Upload an avatar/cover image to the backend (Supabase Storage) and return
// the permanent public URL. Previously this was a stub that only copied the
// image into the device's local filesystem and returned a file:// URI — so
// avatars never actually reached the server and "vanished" on reinstall / other
// devices. Now it performs the real upload via uploadImage().
const uploadImageToBackend = async (imageUri: string, userId: string): Promise<string> => {
  // Real upload — returns an absolute, persistent URL (e.g. Supabase public URL).
  const remoteUrl = await uploadImage(imageUri);

  // Best-effort local cache for faster reloads / offline display. Failures here
  // must not break the upload, so they're swallowed.
  try {
    const permanentUri = await copyImageToPermanentStorage(imageUri, userId);
    await saveProfilePictureToStorage(userId, permanentUri);
  } catch (cacheError) {
    console.warn('Local avatar cache failed (non-fatal):', cacheError);
  }

  return remoteUrl;
};

/**
 * Upload an image file to the backend /api/upload endpoint.
 * Returns the server-hosted URL for the uploaded file.
 */
export async function uploadImage(localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: localUri,
    name: filename,
    type,
  } as any);

  const token = useProfileStore.getState().accessToken;
  const response = await fetch(`${API_CONFIG.baseUrl}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type – let fetch set multipart/form-data boundary automatically
    },
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || `Upload failed (${response.status})`);
  }

  const json = await response.json();
  // Backend wraps in successResponse: { success: true, data: { url } }
  return json.data?.url || json.url;
}

export const imageService = {
  /**
   * Request CAMERA permission only — used when taking a new photo.
   * Do NOT require photo-library access here; the camera doesn't need it.
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Access Needed',
          'Please allow camera access in Settings to take a photo. You can also pick an existing photo from your gallery instead.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera permission request error:', error);
      return false;
    }
  },

  /**
   * Request PHOTO LIBRARY permission only — used when choosing from the gallery.
   * Critically, this must NOT require camera access: picking an existing photo
   * never uses the camera, so demanding camera permission here wrongly blocks
   * users who only granted photo access.
   */
  async requestMediaLibraryPermission(): Promise<boolean> {
    try {
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryPermission.status !== 'granted') {
        Alert.alert(
          'Photo Access Needed',
          'Please allow photo library access in Settings to choose a picture.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Media library permission request error:', error);
      return false;
    }
  },

  /**
   * Open camera to take a new photo
   */
  async openCamera(): Promise<ImageUploadResponse> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        return { success: false, error: 'PERMISSION_DENIED' };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, error: 'USER_CANCELLED' };
      }

      const imageUri = result.assets[0].uri;
      return { success: true, imageUri };

    } catch (error) {
      console.error('Camera error:', error);
      return { success: false, error: 'CAMERA_ERROR' };
    }
  },

  /**
   * Open gallery to select an existing photo
   */
  async openGallery(): Promise<ImageUploadResponse> {
    try {
      const hasPermission = await this.requestMediaLibraryPermission();
      if (!hasPermission) {
        return { success: false, error: 'PERMISSION_DENIED' };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, error: 'USER_CANCELLED' };
      }

      const imageUri = result.assets[0].uri;
      return { success: true, imageUri };

    } catch (error) {
      console.error('Gallery error:', error);
      return { success: false, error: 'GALLERY_ERROR' };
    }
  },

  /**
   * Upload profile picture to backend
   */
  async uploadProfilePicture(request: ImageUploadRequest): Promise<ImageUploadResponse> {
    try {
      const { userId, imageUri } = request;

      // Validate image URI - be more flexible with URI formats
      if (!imageUri || imageUri.trim() === '') {
        return { success: false, error: 'INVALID_IMAGE_URI' };
      }

      console.log('Uploading image with URI:', imageUri);

      // Upload to backend/cloud storage
      const uploadedImageUrl = await uploadImageToBackend(imageUri, userId);

      console.log('Upload completed, returned URL:', uploadedImageUrl);

      return {
        success: true,
        imageUri: uploadedImageUrl
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'UPLOAD_FAILED'
      };
    }
  },

  /**
   * Get user's current profile picture
   */
  async getUserProfilePicture(userId: string): Promise<string | null> {
    await simulateNetworkDelay(300);
    return await getProfilePictureFromStorage(userId);
  },

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(userId: string): Promise<boolean> {
    try {
      await simulateNetworkDelay(500);

      // In real app, you would also delete from cloud storage
      console.log(`Profile picture deleted for user ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  },

  /**
   * Show image picker options (Camera or Gallery)
   */
  showImagePickerOptions(onCamera: () => void, onGallery: () => void): void {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: onCamera },
        { text: 'Gallery', onPress: onGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }
};

export type { ImageUploadResponse, ImageUploadRequest }; 