/**
 * SidebarContent - Custom drawer content for the main app sidebar.
 *
 * Rendered as the `drawerContent` of the main Drawer navigator (see App.tsx).
 * Opened by the hamburger icon on the home headers or by swiping from the left edge.
 *
 * Colors are theme-aware (derived from the app theme `surface`/`text`/... tokens) so
 * the sidebar matches the rest of the app in both light and dark mode.
 *
 * Sections:
 * - Profile header → collapsing account switcher (tap to expand the list of accounts)
 * - Account list (when expanded): Personal + every connected business (switch / request
 *   access for staff-only memberships) + "Add account"
 * - Navigation: grouped Business Workspace sections (business mode) or a simple menu (personal)
 * - Logout footer
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { Avatar } from '@/shared/components/ui/Avatar';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore, getRoleDisplayName } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import { authAPI } from '@/shared/services/api';
import { getCapabilities } from '@/shared/auth/capabilities';
import roleRequestService from '@/features/team/roleRequest.service';
import { RoleRequest } from '@/shared/types/roleRequest';
import { UserBusiness } from '@/shared/types/business';

// Enable LayoutAnimation on Android (no-op on the new architecture / iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LEADING_SLOT = 36; // fixed leading column so all row labels align

// High-contrast selection palette for the account switcher: the active business with branches
// renders as a white "paper" section, and the selected branch/account renders as a black "ink"
// row. These are intentionally literal (same in light + dark mode) per the requested design.
const INK = '#1C1917'; // black section background
const INK_TEXT = '#FFFFFF'; // text/icons on the black section
const PAPER = '#FFFFFF'; // white section background (business that has branches)
const PAPER_TEXT = '#1C1917'; // text on the white section
const PAPER_MUTED = '#57534E'; // muted text/icons on the white section

type ShortcutItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

export default function SidebarContent(props: DrawerContentComponentProps) {
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = props.navigation as any;

  // Theme-aware palette — matches the rest of the app (light surface + dark text in light mode, etc.)
  const C = {
    bg: appTheme.colors.surface,
    text: appTheme.colors.text,
    textMuted: appTheme.colors.textMuted,
    divider: appTheme.colors.borderColor,
    icon: appTheme.colors.iconColor,
    iconMuted: appTheme.colors.iconMuted,
    highlight: appTheme.colors.highlightedRow,
    activeHighlight: appTheme.colors.highlightedRow,
    accent: appTheme.colors.accent,
    danger: appTheme.colors.error,
  };

  const currentUser = useProfileStore((state) => state.currentUser);
  const activeMode = useProfileStore((state) => state.activeMode);
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUserRole = useProfileStore((state) => state.currentUserRole);
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);

  // Branches (locations) belong to the active business. businessStore keeps them in sync with
  // profileStore.activeBusiness (see CompanyStoreInitializer in App.tsx), so `locations` always
  // describes the currently-active business. null currentLocationId = "All locations".
  const locations = useBusinessStore((state) => state.locations);
  const currentLocationId = useBusinessStore((state) => state.currentLocationId);
  const setLocation = useBusinessStore((state) => state.setLocation);

  // Unread counts surfaced as badges on the workspace rows (Deliveries/Invoices moved here from tabs)
  const { deliveriesUnreadCount, invoicesUnreadCount } = useNotifications();

  // Collapsible business sections (all collapsed by default) + top search field.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Profile header doubles as a collapsing account switcher (collapsed by default).
  const [accountsOpen, setAccountsOpen] = useState(false);
  // Pending/decided admin-access requests for staff-only memberships, keyed by business id.
  const [roleRequests, setRoleRequests] = useState<Map<string, RoleRequest>>(new Map());

  // When the account list opens, load access-request statuses for any staff-only memberships
  // so the rows can show "Request pending / declined / tap to request access".
  useEffect(() => {
    if (!accountsOpen) return;
    const staffBusinesses = userBusinesses.filter((ub) => ub.role === 'staff');
    if (staffBusinesses.length === 0) return;

    let cancelled = false;
    (async () => {
      const requests = new Map<string, RoleRequest>();
      for (const ub of staffBusinesses) {
        try {
          const request = await roleRequestService.getMyRoleRequest(ub.business.id);
          if (request) requests.set(ub.business.id, request);
        } catch {
          // No request exists for this business — that's fine.
        }
      }
      if (!cancelled) setRoleRequests(requests);
    })();

    return () => {
      cancelled = true;
    };
  }, [accountsOpen, userBusinesses]);

  if (!currentUser) {
    return null;
  }

  const closeDrawer = () => props.navigation.closeDrawer();

  // Routes that now live as hidden tabs inside BusinessTabNavigator. Navigating to one
  // must target the tab navigator (nested under the drawer's "Tabs" screen) so the page
  // keeps the bottom nav bar and shows the hamburger (not a back button) at its root.
  const TAB_ROUTES = new Set([
    'LogisticsOverview', 'Deliveries', 'Transfers', 'Orders', 'MyDeliveries', 'Routes',
    'Issues', 'Returns', 'DeliveriesAnalytics', 'Products', 'Categories', 'Brands', 'Stock',
    'ProductVisibility', 'PriceLists', 'Invoices', 'TeamManagement', 'Locations', 'CompanySettings', 'SubscriptionHub',
    'BottomSheetGallery', 'MessageGallery', 'ButtonGallery',
  ]);

  // Navigate from the sidebar, closing the drawer first. Workspace pages route into the
  // business tab navigator (in-shell, hamburger); everything else is a plain RootStack push.
  const go = (routeName: string, params?: object) => {
    closeDrawer();
    if (TAB_ROUTES.has(routeName)) {
      nav.navigate('Tabs', { screen: routeName, params });
    } else {
      nav.navigate(routeName, params);
    }
  };

  // Open the reusable "Coming soon" placeholder for not-yet-built features.
  const comingSoon = (title: string) => go('ComingSoon', { title });

  // Expand/collapse a business section with a smooth height animation.
  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Run a company search from the sidebar's top search field.
  const submitSearch = () => go('CompanySearch', { query: searchQuery.trim() });

  const handleOpenProfile = () => {
    if (activeMode === 'business' && activeBusiness) {
      go('ViewBusinessProfile', { businessId: activeBusiness.id });
    } else {
      // Own personal profile — open the dedicated screen, not the other-user viewer.
      go('MyProfile');
    }
  };

  // Expand/collapse the account switcher embedded in the profile header.
  const handleToggleAccounts = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAccountsOpen((open) => !open);
  };

  const handleSelectPersonal = () => {
    if (activeMode !== 'personal') {
      switchToPersonal();
    }
    closeDrawer();
  };

  const handleSelectBusiness = async (ub: UserBusiness) => {
    // Staff can't enter Business mode — offer to request admin access instead of switching.
    if (getCapabilities(ub.role).isStaff) {
      const request = roleRequests.get(ub.business.id);
      if (request?.status === 'PENDING') {
        Alert.alert(
          'Request pending',
          `Your admin-access request for ${ub.business.name} is still awaiting review.`
        );
        return;
      }
      Alert.alert(
        'Access restricted',
        `You're a Staff member in ${ub.business.name}. Only Admins can open Business mode.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Request Admin Access', onPress: () => handleRequestAccess(ub) },
        ]
      );
      return;
    }

    if (ub.business.id !== activeBusinessId || activeMode !== 'business') {
      await switchToBusiness(ub.business.id);
    }
    closeDrawer();
  };

  // Send (or re-send) an admin-access request for a staff-only membership.
  const handleRequestAccess = async (ub: UserBusiness) => {
    try {
      await roleRequestService.createRoleRequest(ub.business.id, {
        requestedRole: 'admin',
        message: 'Requesting admin access to help manage business operations',
      });
      Alert.alert(
        'Request sent',
        `Your admin-access request for ${ub.business.name} has been sent to the owner. You'll be notified when it's reviewed.`
      );
      // Reflect the new pending state on the row.
      const request = await roleRequestService.getMyRoleRequest(ub.business.id);
      if (request) {
        setRoleRequests((prev) => new Map(prev).set(ub.business.id, request));
      }
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('already exists') || msg.includes('pending')) {
        Alert.alert('Request already sent', 'You already have a pending admin-access request for this business.');
      } else if (msg.includes('cooldown') || msg.includes('recently rejected')) {
        Alert.alert('Request cooldown', 'Your previous request was recently reviewed. Please wait before requesting again.');
      } else {
        Alert.alert('Request failed', 'Failed to send the admin-access request. Please try again.');
      }
    }
  };

  // Add a business: let the user choose between creating a new one or joining an existing one.
  const handleAddAccount = () => {
    Alert.alert('Add account', 'Create a new business or join an existing one.', [
      { text: 'Create new business', onPress: () => go('BusinessBasicInfo', { fromProfileSwitcher: true }) },
      { text: 'Join existing business', onPress: () => go('SelectCompany') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // "Help the community" card (footer) → feedback hub. Lives here so it's reachable from
  // both Personal and Business mode (it used to be duplicated in the two Settings screens).
  const handleHelpCommunity = () => go('FeedbackCategories');

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => authAPI.logout() },
    ]);
  };

  // Active identity shown in the (collapsed) profile header — business when in business mode, else personal.
  const activeIdentity =
    activeMode === 'business' && activeBusiness
      ? {
          name: activeBusiness.name,
          subtitle: getRoleDisplayName(currentUserRole),
          avatarId: activeBusiness.id,
          avatarUri: activeBusiness.logo_url ?? null,
          borderRadius: 13,
        }
      : {
          name: currentUser.name,
          subtitle: currentUser.email ?? 'Personal',
          avatarId: currentUser.id,
          avatarUri: currentUser.avatar_url,
          borderRadius: 26,
        };

  const shortcuts: ShortcutItem[] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: activeMode === 'business' ? 'business-outline' : 'person-outline',
      onPress: handleOpenProfile,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: 'settings-outline',
      onPress: () => go(activeMode === 'business' ? 'ProfileSettings' : 'PersonalProfileSettings'),
    },
    {
      key: 'subscription',
      label: 'Subscription',
      icon: 'card-outline',
      // Business: in-shell SubscriptionHub tab. Personal: plain RootStack SubscriptionPlans (back button).
      onPress: () => go(activeMode === 'business' ? 'SubscriptionHub' : 'SubscriptionPlans'),
    },
  ];

  if (activeMode === 'business' && activeBusiness) {
    shortcuts.push({
      key: 'team',
      label: 'Team',
      icon: 'people-outline',
      onPress: () => go('TeamManagement', { businessId: activeBusiness.id }),
    });
  }

  shortcuts.push({ key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', onPress: () => go('Tasks') });

  // Business Workspace grouped navigation (Business mode only). Built items navigate;
  // not-yet-built items open the "Coming soon" placeholder.
  const businessSections =
    activeMode === 'business' && activeBusiness
      ? [
          {
            title: 'Logistics',
            items: [
              { label: 'Overview', icon: 'grid-outline', onPress: () => go('LogisticsOverview') },
              { label: 'All deliveries', icon: 'truck-outline', onPress: () => go('Deliveries'), badge: deliveriesUnreadCount },
              { label: 'Transfers', icon: 'swap-horizontal-outline', onPress: () => go('Transfers') },
              { label: 'Orders', icon: 'cart-outline', onPress: () => go('Orders') },
              { label: 'My deliveries', icon: 'person-outline', onPress: () => go('MyDeliveries') },
              { label: 'Routes', icon: 'map-outline', onPress: () => go('Routes') },
              { label: 'Issues', icon: 'alert-circle-outline', onPress: () => go('Issues') },
              { label: 'Returns', icon: 'arrow-undo-outline', onPress: () => go('Returns') },
              { label: 'Analytics', icon: 'bar-chart-outline', onPress: () => go('DeliveriesAnalytics') },
            ],
          },
          {
            title: 'Products',
            items: [
              { label: 'Products', icon: 'cube-outline', onPress: () => go('Products') },
              { label: 'Categories', icon: 'grid-outline', onPress: () => go('Categories') },
              { label: 'Brands', icon: 'bookmark-outline', onPress: () => go('Brands') },
              { label: 'Stock', icon: 'archive-outline', onPress: () => go('Stock') },
              { label: 'Price lists', icon: 'cash-outline', onPress: () => go('PriceLists') },
              { label: 'Visibility', icon: 'eye-outline', onPress: () => go('ProductVisibility') },
              { label: 'Collections', icon: 'folder-outline', onPress: () => comingSoon('Collections') },
              { label: 'Recipes', icon: 'restaurant-outline', onPress: () => comingSoon('Recipes') },
              { label: 'Discounts', icon: 'pricetag-outline', onPress: () => comingSoon('Discounts') },
            ],
          },
          {
            title: 'Accounting',
            items: [
              { label: 'Invoices', icon: 'receipt-text-outline', onPress: () => go('Invoices'), badge: invoicesUnreadCount },
              { label: 'Estimates', icon: 'document-text-outline', onPress: () => go('Invoices', { initialTab: 'estimates' }) },
              { label: 'Scan invoice', icon: 'scan-outline', onPress: () => comingSoon('Scan invoice') },
            ],
          },
          {
            title: 'Business',
            items: [
              { label: 'Public profile', icon: 'business-outline', onPress: () => go('ViewBusinessProfile', { businessId: activeBusiness.id }) },
              { label: 'Customers', icon: 'people-outline', onPress: () => comingSoon('Customers') },
              { label: 'Team', icon: 'person-add-outline', onPress: () => go('TeamManagement', { businessId: activeBusiness.id }) },
              { label: 'Locations', icon: 'location-outline', onPress: () => go('Locations') },
              { label: 'Analytics', icon: 'bar-chart-outline', onPress: () => comingSoon('Analytics') },
              { label: 'Variance', icon: 'pie-chart-outline', onPress: () => comingSoon('Variance') },
              { label: 'Subscription', icon: 'card-outline', onPress: () => go('SubscriptionHub') },
              { label: 'Settings', icon: 'settings-outline', onPress: () => go('CompanySettings') },
            ],
          },
          {
            title: 'Design System',
            items: [
              { label: 'Bottom Sheet Gallery', icon: 'apps-outline', onPress: () => go('BottomSheetGallery') },
              { label: 'Message Gallery', icon: 'chatbubbles-outline', onPress: () => go('MessageGallery') },
              { label: 'Button Gallery', icon: 'radio-button-on-outline', onPress: () => go('ButtonGallery') },
            ],
          },
        ]
      : null;

  const SectionLabel = ({ text }: { text: string }) => (
    <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{text}</Text>
  );

  const Row = ({
    onPress,
    leading,
    label,
    active,
    trailing,
  }: {
    onPress: () => void;
    leading: React.ReactNode;
    label: string;
    active?: boolean;
    trailing?: React.ReactNode;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        active && { backgroundColor: C.activeHighlight },
        pressed && !active && { backgroundColor: C.highlight },
      ]}
    >
      <View style={styles.leading}>{leading}</View>
      <Text
        style={[styles.rowLabel, { color: C.text, fontWeight: active ? '700' : '500' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );

  // Richer row used by the account switcher: avatar + name + optional role badge and
  // status pill (staff). The selected account renders as a high-contrast black row.
  const AccountRow = ({
    avatar,
    name,
    badgeText,
    selected,
    pill,
    onPress,
  }: {
    avatar: React.ReactNode;
    name: string;
    badgeText?: string | null;
    selected?: boolean;
    pill?: { icon: string; text: string } | null;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountRow,
        selected && { backgroundColor: INK },
        pressed && !selected && { backgroundColor: C.highlight },
      ]}
    >
      <View style={styles.leading}>{avatar}</View>
      <View style={styles.accountInfo}>
        <View style={styles.accountNameRow}>
          <Text
            style={[styles.accountName, { color: selected ? INK_TEXT : C.text, fontWeight: selected ? '700' : '600' }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {badgeText ? (
            <View style={[styles.roleBadge, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : C.highlight }]}>
              <Text style={[styles.roleBadgeText, { color: selected ? INK_TEXT : C.textMuted }]}>{badgeText}</Text>
            </View>
          ) : null}
        </View>
        {pill ? (
          <View style={[styles.statusPill, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : C.highlight }]}>
            <Icon name={pill.icon} size={13} color={selected ? INK_TEXT : C.textMuted} strokeWidth={2} />
            <Text style={[styles.statusText, { color: selected ? INK_TEXT : C.textMuted }]}>{pill.text}</Text>
          </View>
        ) : null}
      </View>
      {selected ? <Icon name="checkmark" size={20} color={INK_TEXT} strokeWidth={2.5} /> : null}
    </Pressable>
  );

  // A branch (location) row shown inside the white business section. The selected branch is black.
  const BranchRow = ({
    icon,
    label,
    selected,
    onPress,
  }: {
    icon: string;
    label: string;
    selected?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.branchRow,
        selected && { backgroundColor: INK },
        pressed && !selected && { backgroundColor: '#F4F0EB' },
      ]}
    >
      <Icon name={icon} size={18} color={selected ? INK_TEXT : PAPER_MUTED} strokeWidth={2} />
      <Text
        style={[styles.branchLabel, { color: selected ? INK_TEXT : PAPER_TEXT, fontWeight: selected ? '700' : '500' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? <Icon name="checkmark" size={18} color={INK_TEXT} strokeWidth={2.5} /> : null}
    </Pressable>
  );

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: C.bg,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 16,
          paddingStart: 16, // override DrawerContentScrollView's default paddingStart: insets.left
          paddingEnd: 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header — tap to expand the account switcher */}
      <Pressable
        onPress={handleToggleAccounts}
        style={({ pressed }) => [styles.profileCard, pressed && { backgroundColor: C.highlight }]}
      >
        <Avatar
          userId={activeIdentity.avatarId}
          userName={activeIdentity.name}
          imageUri={activeIdentity.avatarUri}
          size={52}
          borderRadius={activeIdentity.borderRadius}
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>
            {activeIdentity.name}
          </Text>
          {activeIdentity.subtitle ? (
            <Text style={[styles.profileEmail, { color: C.textMuted }]} numberOfLines={1}>
              {activeIdentity.subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name={accountsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.iconMuted} strokeWidth={2} />
      </Pressable>

      {/* Account switcher (expanded): Personal + every connected business + add account */}
      {accountsOpen ? (
        <View style={styles.accountList}>
          <View style={styles.accountListHeader}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, marginBottom: 0 }]}>ACCOUNTS</Text>
            <Pressable
              onPress={handleAddAccount}
              hitSlop={8}
              style={({ pressed }) => [
                styles.addAccountBtn,
                pressed && { backgroundColor: C.highlight },
              ]}
            >
              <Icon name="add" size={20} color={C.icon} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Personal account */}
          <AccountRow
            avatar={
              <Avatar
                userId={currentUser.id}
                userName={currentUser.name}
                imageUri={currentUser.avatar_url}
                size={36}
                borderRadius={18}
              />
            }
            name={currentUser.name}
            selected={activeMode === 'personal'}
            onPress={handleSelectPersonal}
          />

          {/* Business accounts */}
          {userBusinesses.map((ub) => {
            const isStaff = getCapabilities(ub.role).isStaff;
            const isActiveBiz = activeMode === 'business' && activeBusinessId === ub.business.id;
            const badgeText = ub.role === 'super_admin' ? 'OWNER' : ub.role.toUpperCase();

            // Active business with 2+ branches → white section listing its branches, with the
            // selected branch (or "All locations") shown as a black row. Only the active business
            // has its locations loaded, so only it can expand into branches.
            if (isActiveBiz && locations.length > 1) {
              // The company's main (primary) branch is its default account — selected when no
              // specific branch has been chosen yet. Falls back to the first location if none is flagged.
              const mainLocationId = (locations.find((l) => l.is_primary) ?? locations[0])?.id;
              return (
                <View key={ub.business.id} style={styles.branchContainer}>
                  <View style={styles.branchHeader}>
                    <Avatar
                      userId={ub.business.id}
                      userName={ub.business.name}
                      imageUri={ub.business.logo_url ?? null}
                      size={30}
                      borderRadius={8}
                    />
                    <Text style={styles.branchHeaderName} numberOfLines={1}>
                      {ub.business.name}
                    </Text>
                    <View style={styles.branchHeaderBadge}>
                      <Text style={styles.branchHeaderBadgeText}>{badgeText}</Text>
                    </View>
                  </View>
                  {locations.map((loc) => (
                    <BranchRow
                      key={loc.id}
                      icon="location"
                      label={loc.name}
                      selected={currentLocationId === loc.id || (currentLocationId === null && loc.id === mainLocationId)}
                      onPress={() => setLocation(loc)}
                    />
                  ))}
                </View>
              );
            }

            // Otherwise a single switch row. Staff-only memberships show a request-access pill.
            let pill: { icon: string; text: string } | null = null;
            if (isStaff) {
              const request = roleRequests.get(ub.business.id);
              if (request?.status === 'PENDING') {
                pill = { icon: 'time-outline', text: 'Request pending' };
              } else if (request?.status === 'REJECTED') {
                pill = { icon: 'close-circle-outline', text: 'Request declined' };
              } else {
                pill = { icon: 'lock-closed-outline', text: 'Tap to request access' };
              }
            }
            return (
              <AccountRow
                key={ub.business.id}
                avatar={
                  <Avatar
                    userId={ub.business.id}
                    userName={ub.business.name}
                    imageUri={ub.business.logo_url ?? null}
                    size={36}
                    borderRadius={9}
                  />
                }
                name={ub.business.name}
                badgeText={badgeText}
                selected={isActiveBiz}
                pill={pill}
                onPress={() => handleSelectBusiness(ub)}
              />
            );
          })}

          {/* Add account */}
          <Pressable
            onPress={handleAddAccount}
            style={({ pressed }) => [styles.accountRow, pressed && { backgroundColor: C.highlight }]}
          >
            <View style={styles.leading}>
              <Icon name="add" size={20} color={C.icon} strokeWidth={2.5} />
            </View>
            <Text style={[styles.accountName, { color: C.text, fontWeight: '600' }]}>Add account</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Search (business mode) */}
      {businessSections ? (
        <AppSearchBar
          containerStyle={styles.searchContainer}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={submitSearch}
          onClear={() => setSearchQuery('')}
          returnKeyType="search"
        />
      ) : null}

      <View style={[styles.divider, { backgroundColor: C.divider }]} />

      {/* Navigation: collapsible Business Workspace sections (business mode) or simple menu (personal) */}
      {businessSections ? (
        businessSections.map((section) => {
          const open = !!openSections[section.title];
          return (
            <View key={section.title} style={styles.section}>
              <Pressable
                onPress={() => toggleSection(section.title)}
                style={({ pressed }) => [styles.sectionHeader, pressed && { backgroundColor: C.highlight }]}
              >
                <Text style={[styles.sectionHeaderText, { color: C.text }]}>{section.title}</Text>
                <Icon
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={C.iconMuted}
                  strokeWidth={2}
                />
              </Pressable>
              {open ? (
                <View style={styles.sectionItems}>
                  {section.items.map((item: { label: string; icon: string; onPress: () => void; badge?: number }) => (
                    <Row
                      key={item.label}
                      onPress={item.onPress}
                      label={item.label}
                      leading={<Icon name={item.icon} size={22} color={C.icon} strokeWidth={2} />}
                      trailing={
                        <View style={styles.trailingGroup}>
                          {item.badge && item.badge > 0 ? (
                            <View style={[styles.badge, { backgroundColor: C.accent }]}>
                              <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                            </View>
                          ) : null}
                          <Icon name="chevron-forward" size={18} color={C.iconMuted} strokeWidth={2} />
                        </View>
                      }
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <>
          <SectionLabel text="MENU" />
          {shortcuts.map((item) => (
            <Row
              key={item.key}
              onPress={item.onPress}
              label={item.label}
              leading={<Icon name={item.icon} size={22} color={C.icon} strokeWidth={2} />}
              trailing={<Icon name="chevron-forward" size={18} color={C.iconMuted} strokeWidth={2} />}
            />
          ))}
        </>
      )}

      <View style={styles.spacer} />

      {/* Help the community */}
      <Pressable
        onPress={handleHelpCommunity}
        style={({ pressed }) => [styles.communityButton, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.communityIcon}>
          <Icon name="heart-outline" size={24} color={appTheme.colors.info} strokeWidth={2} />
        </View>
        <View style={styles.communityText}>
          <Text style={[styles.communityTitle, { color: appTheme.colors.info }]} numberOfLines={1}>
            Help the Community grow
          </Text>
          <Text style={[styles.communitySubtitle, { color: appTheme.colors.secondary }]} numberOfLines={2}>
            Propose features, report bugs, and share your feedback
          </Text>
        </View>
      </Pressable>

      {/* Logout */}
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { borderColor: C.divider },
          pressed && { backgroundColor: C.highlight },
        ]}
      >
        <Icon name="log-out" size={20} color={C.danger} strokeWidth={2} />
        <Text style={[styles.logoutText, { color: C.danger }]}>Log Out</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  searchContainer: {
    marginHorizontal: 0,
    marginTop: 4,
    marginBottom: 4,
  },
  section: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionItems: {
    paddingLeft: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  leading: {
    width: LEADING_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
  accountList: {
    marginTop: 4,
    marginBottom: 4,
  },
  accountListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    minHeight: 32,
    marginBottom: 2,
  },
  addAccountBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  accountInfo: {
    flex: 1,
    marginLeft: 10,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 16,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  branchContainer: {
    backgroundColor: PAPER,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginVertical: 2,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  branchHeaderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: PAPER_TEXT,
  },
  branchHeaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FAF8F5',
  },
  branchHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: PAPER_MUTED,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  branchLabel: {
    flex: 1,
    fontSize: 15,
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
  },
  communityIcon: {
    width: LEADING_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  communityText: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  communitySubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
