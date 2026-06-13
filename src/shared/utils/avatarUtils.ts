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
  if (!name) return ['#F4F0EB', '#57534E']; // Default warm greige
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Warm-biased, muted avatar palette (harmonized with the theme's warm avatar tones).
  // Each pair: [lightWarmTintBackground, deepWarmText]
  const colorPairs: [string, string][] = [
    ['#FBE7E3', '#C24A3C'], // Coral
    ['#FAE9DF', '#C45E37'], // Terracotta
    ['#FAF0DC', '#A9741C'], // Amber
    ['#F4EFD7', '#8A6E15'], // Gold
    ['#EBF0DD', '#5C7330'], // Olive
    ['#E0EFE8', '#3C7D62'], // Sage Teal
    ['#E1EEF2', '#3A7387'], // Muted Blue
    ['#E5EBF8', '#3E5AA6'], // Indigo
    ['#EBE4F7', '#5F46A6'], // Violet
    ['#F2E4F2', '#88458E'], // Orchid
    ['#F5E5ED', '#9C4F78'], // Rose
    ['#F0E8E1', '#795B45'], // Clay
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
  if (!name) return ['#A8A29E', '#57534E']; // Default warm greige gradient
  
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Warm-biased, muted gradient pairs (harmonized with the theme's warm avatar tones)
  const gradients: [string, string][] = [
    ['#F0705F', '#D14E3D'], // Coral gradient
    ['#ED9568', '#D9663A'], // Terracotta gradient
    ['#EFB45A', '#CF8C28'], // Amber gradient
    ['#D6B23E', '#AE8E1C'], // Gold gradient
    ['#9DB35E', '#748E38'], // Olive gradient
    ['#6FB89C', '#478B70'], // Sage Teal gradient
    ['#62A6BC', '#407C92'], // Muted Blue gradient
    ['#6E8DDC', '#4A69BE'], // Indigo gradient
    ['#9B82DE', '#7457BE'], // Violet gradient
    ['#BE7EC2', '#98599E'], // Orchid gradient
    ['#D38BAE', '#AE6288'], // Rose gradient
    ['#B89379', '#937053'], // Clay gradient
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