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
  userAvatar?: string;
  votes: number;
  hasVoted: boolean;
  createdAt: Date;
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  { id: 'interface', title: 'Application interface', icon: 'phone-portrait-outline' },
  { id: 'add', title: 'Something to add / Quelque chose à ajouter', icon: 'add-circle-outline' },
  { id: 'modify', title: 'Something to modify / Quelque chose à modifier', icon: 'create-outline' },
  { id: 'ideas', title: 'Random ideas / Idées aléatoires', icon: 'bulb-outline' },
  { id: 'other', title: 'Propose something else / Proposer quelque chose d\'autre', icon: 'chatbubble-ellipses-outline' },
];
