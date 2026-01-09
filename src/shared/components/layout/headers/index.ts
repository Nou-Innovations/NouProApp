/**
 * Header Components (consolidated)
 * 
 * Only 3 header components are allowed:
 * - PrimaryHeader: For primary "navigating" screens (lists, home, explore)
 * - SecondaryHeader: For secondary screens (details, create, settings)
 * - ChatHeader: For chat/conversation screens only
 * 
 * SimpleHeader is a layout utility for scroll-hiding behavior, not a header itself.
 */

// Canonical headers (use these)
export { default as PrimaryHeader } from './PrimaryHeader';
export { default as SecondaryHeader } from './SecondaryHeader';
export { default as ChatHeader } from './ChatHeader';

// Layout utility for scroll-aware screens
export { default as SimpleHeader, AnimatedFlatList, HEADER_HEIGHT } from './SimpleHeader';

// Re-export types
export type { PrimaryHeaderProps, HeaderAction } from './PrimaryHeader';
export type { SecondaryHeaderProps, SecondaryHeaderVariant } from './SecondaryHeader';
export type { ChatHeaderProps } from './ChatHeader';
