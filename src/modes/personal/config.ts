/**
 * Personal Mode Configuration
 * 
 * Defines the tabs, access rules, and navigation structure for Personal mode.
 * Personal mode is for individual users browsing businesses, managing orders,
 * and accessing their personal profile.
 */

export const personalModeConfig = {
  name: 'personal',
  tabs: [
    { name: 'Home', icon: 'home' },
    { name: 'Explore', icon: 'search' },
    { name: 'PersonalInbox', icon: 'mail', label: 'Inbox' },
    { name: 'Activities', icon: 'list' },
    { name: 'PersonalProfile', icon: 'person', label: 'Profile' },
  ],
  // Screens accessible in personal mode (stack screens)
  stackScreens: [
    'EditPersonalProfile',
    'PersonalSettings',
    'PersonalDeliveryDetail',
    'ViewBusinessProfile',
    'ViewUserProfile',
    'Chat',
    'Notifications',
    'Connections',
  ],
} as const;

export type PersonalModeTab = typeof personalModeConfig.tabs[number]['name'];

