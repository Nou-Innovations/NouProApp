/**
 * Header Components (consolidated)
 * 
 * Only 3 header components are allowed:
 * - PrimaryHeader: For primary "navigating" screens (lists, home, explore)
 * - SecondaryHeader: For secondary screens (details, create, settings)
 * - ChatHeader: For chat/conversation screens only
 */

// Canonical headers (use these)
export { default as PrimaryHeader } from './PrimaryHeader';
export { default as SecondaryHeader } from './SecondaryHeader';
export { default as ChatHeader } from './ChatHeader';

// Re-export types
export type { PrimaryHeaderProps, HeaderAction } from './PrimaryHeader';
export type { SecondaryHeaderProps, SecondaryHeaderVariant } from './SecondaryHeader';
export type { ChatHeaderProps } from './ChatHeader';
