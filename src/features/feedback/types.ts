/**
 * Feedback Feature Types
 */

export interface FeedbackCategory {
  id: string;
  title: string;
  icon: string;
}

export interface Suggestion {
  id: string;
  categoryId: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  votes: number;
  hasVoted: boolean;
  createdAt: string; // ISO timestamp from the API
}

export type SuggestionSort = 'top' | 'new';

export interface CreateSuggestionDTO {
  categoryId: string;
  text: string;
}

export interface VoteResult {
  hasVoted: boolean;
  votes: number;
}

// Real categories a suggestion can belong to (must match backend FEEDBACK_CATEGORY_IDS).
export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  { id: 'interface', title: 'Interface', icon: 'phone-portrait-outline' },
  { id: 'add', title: 'Something to add', icon: 'add-circle-outline' },
  { id: 'modify', title: 'Something to modify', icon: 'create-outline' },
  { id: 'ideas', title: 'Random ideas', icon: 'bulb-outline' },
  { id: 'other', title: 'Something else', icon: 'chatbubble-ellipses-outline' },
];

// Default category used when none is picked (replaces the old bogus 'general').
export const DEFAULT_CATEGORY_ID = 'other';

// UI-only pseudo-category for the "All" filter chip — never sent to the server.
export const ALL_CATEGORY_ID = 'all';
