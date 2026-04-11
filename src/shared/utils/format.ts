import { timeAgo } from './timeAgo';

/**
 * Format a number as Mauritian Rupees.
 * Example: formatCurrency(1500) => "Rs 1,500"
 */
export const formatCurrency = (amount: number): string => {
  return `Rs ${amount.toLocaleString()}`;
};

/**
 * Format an ISO date string as a relative time string.
 * Delegates to the more robust timeAgo utility.
 */
export const formatRelativeTime = (dateString: string): string => {
  return timeAgo(dateString);
};
