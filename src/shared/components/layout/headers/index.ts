/**
 * Header Components (consolidated)
 *
 * Only 4 header components are allowed:
 * - PrimaryHeader: For primary "navigating" tab screens (inbox, notifications, analytics, explore, home)
 * - SecondaryHeader: For secondary screens (details, create, settings)
 * - ChatHeader: For chat/conversation screens only
 * - HeroHeader: For screens with a full-bleed hero/cover image (product detail, business profiles)
 */

// Canonical headers (use these)
export { default as PrimaryHeader } from './PrimaryHeader';
export { default as SecondaryHeader } from './SecondaryHeader';
export { default as ChatHeader } from './ChatHeader';
export { default as HeroHeader } from './HeroHeader';

// Re-export types
export type { PrimaryHeaderProps, HeaderAction } from './PrimaryHeader';
export type { SecondaryHeaderProps, SecondaryHeaderVariant } from './SecondaryHeader';
export type { ChatHeaderProps } from './ChatHeader';
export type { HeroHeaderProps } from './HeroHeader';
