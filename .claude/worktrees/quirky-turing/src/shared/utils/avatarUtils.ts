/**
 * Generate initials for avatar based on name
 * Rules:
 * - 1-2 words: Take first letter of each word (max 2 letters)
 * - 3+ words: Take only first letter of first word (1 letter)
 * 
 * Examples:
 * - "John" → "J"
 * - "John Doe" → "JD"
 * - "John Michael Doe" → "J"
 * - "Apple Inc Corporation" → "A"
 * - "The Burning Distributor" → "T"
 * - "" → "?"
 * - "   " → "?"
 */
export const generateInitials = (name: string): string => {
  if (!name || name.trim() === '') {
    return '?';
  }

  const words = name.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '?';
  }
  
  if (words.length >= 3) {
    // 3+ words: Take only first letter of first word
    return words[0][0].toUpperCase();
  } else {
    // 1-2 words: Take first letter of each word (max 2 letters)
    return words
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join('');
  }
};

/**
 * Generate avatar colors (background and text) based on the name
 * This creates a consistent color scheme for each name, similar to the button styles
 * Returns [backgroundColor, textColor] pair
 */
export const generateAvatarColors = (name: string): [string, string] => {
  if (!name) return ['#F3F4F6', '#6B7280']; // Default gray
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate color pairs inspired by the button styling pattern
  // Each pair: [lightBackground, darkText]
  const colorPairs: [string, string][] = [
    ['#FEE2E2', '#DC2626'], // Red (like logout button)
    ['#FED7AA', '#EA580C'], // Orange
    ['#FEF3C7', '#D97706'], // Amber
    ['#D1FAE5', '#059669'], // Emerald
    ['#CFFAFE', '#0891B2'], // Cyan
    ['#DBEAFE', '#2563EB'], // Blue
    ['#EDE9FE', '#7C3AED'], // Violet
    ['#FCE7F3', '#DB2777'], // Pink
    ['#EEF2FF', '#4F46E5'], // Indigo (like help button)
    ['#ECFDF5', '#65A30D'], // Lime
    ['#FDF2F8', '#EC4899'], // Pink-Rose
    ['#F3E8FF', '#8B5CF6'], // Purple
    ['#DCFCE7', '#16A34A'], // Green
    ['#EFF6FF', '#3B82F6'], // Light Blue
    ['#FFFBEB', '#F59E0B'], // Yellow
  ];
  
  const index = Math.abs(hash) % colorPairs.length;
  return colorPairs[index];
};

/**
 * Generate gradient colors for the avatar background based on the name
 * This creates a consistent gradient for each name, similar to the button styles
 * @deprecated Use generateAvatarColors instead for button-style colors
 */
export const generateAvatarGradient = (name: string): [string, string] => {
  if (!name) return ['#6B7280', '#4B5563']; // Default gray gradient
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate gradient color pairs inspired by modern UI design
  const gradients: [string, string][] = [
    ['#EF4444', '#DC2626'], // Red gradient
    ['#F97316', '#EA580C'], // Orange gradient
    ['#F59E0B', '#D97706'], // Amber gradient
    ['#10B981', '#059669'], // Emerald gradient
    ['#06B6D4', '#0891B2'], // Cyan gradient
    ['#3B82F6', '#2563EB'], // Blue gradient
    ['#8B5CF6', '#7C3AED'], // Violet gradient
    ['#EC4899', '#DB2777'], // Pink gradient
    ['#6366F1', '#4F46E5'], // Indigo gradient
    ['#84CC16', '#65A30D'], // Lime gradient
    ['#F472B6', '#EC4899'], // Pink-Rose gradient
    ['#A78BFA', '#8B5CF6'], // Purple gradient
    ['#34D399', '#10B981'], // Green gradient
    ['#60A5FA', '#3B82F6'], // Light Blue gradient
    ['#FBBF24', '#F59E0B'], // Yellow gradient
  ];
  
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

/**
 * Generate a single color for the avatar background based on the name
 * This creates a consistent color for each name (legacy function)
 * @deprecated Use generateAvatarColors instead for button-style colors
 */
export const generateAvatarColor = (name: string): string => {
  const [backgroundColor] = generateAvatarColors(name);
  return backgroundColor;
};

/**
 * Check if a string is a valid image URI
 */
export const isValidImageUri = (uri: string | undefined | null): boolean => {
  if (!uri || uri.trim() === '') return false;
  
  // Check for common image URI patterns
  return (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('data:image/') ||
    uri.startsWith('content://') ||
    uri.startsWith('asset://')
  );
}; 