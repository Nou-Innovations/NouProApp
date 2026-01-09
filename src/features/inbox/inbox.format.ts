/**
 * Inbox Formatting Utilities
 * 
 * Pure functions for formatting timestamps, dates, and message content.
 * Extracted from ChatScreen.tsx for reusability and testability.
 */

/**
 * Format timestamp for message bubbles (HH:MM only)
 * No date shown in message bubbles - date separators handle that.
 */
export function formatMessageTimestamp(timestamp: string): string {
  // If timestamp is just time (HH:MM), return as-is
  if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
    return timestamp;
  }
  
  // Try to parse as a date
  const messageDate = new Date(timestamp);
  if (isNaN(messageDate.getTime())) {
    return timestamp; // Return as-is if not a valid date
  }
  
  // Return only the time (HH:MM format)
  return messageDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
}

/**
 * Format date for date separators (WhatsApp style)
 * Shows: Today, Yesterday, Day name (within week), or "Mon, 23 Jan 2025" (older)
 */
export function formatDateSeparator(timestamp: string): string {
  // If timestamp is just time (HH:MM), assume today
  if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
    return 'Today';
  }
  
  const messageDate = new Date(timestamp);
  if (isNaN(messageDate.getTime())) {
    return '';
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const msgDateOnly = new Date(
    messageDate.getFullYear(), 
    messageDate.getMonth(), 
    messageDate.getDate()
  );
  
  if (msgDateOnly.getTime() === today.getTime()) {
    return 'Today';
  } else if (msgDateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (msgDateOnly > oneWeekAgo) {
    // Under 1 week: show day name only
    return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    // Over 1 week: show day + full date (e.g., "Mon, 23 Jan 2025")
    const dayName = messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    const day = messageDate.getDate();
    const month = messageDate.toLocaleDateString('en-US', { month: 'short' });
    const year = messageDate.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
  }
}

/**
 * Get date key for comparison (YYYY-MM-DD format)
 * Used to determine if date separator should be shown.
 */
export function getDateKey(timestamp: string): string {
  if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
    // Just time, assume today
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = '$'): string {
  return `${currency}${amount.toFixed(2)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  return text.match(urlRegex) || [];
}

/**
 * Check if text contains URLs
 */
export function containsUrl(text: string): boolean {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  return urlRegex.test(text);
}

/**
 * Format relative time (e.g., "2 min ago", "1 hour ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDateSeparator(timestamp);
}

