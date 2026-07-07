/**
 * SidebarContent - Custom drawer content for the main app sidebar.
 *
 * Rendered as the `drawerContent` of the main Drawer navigator (see App.tsx).
 * Opened by the hamburger icon on the home headers or by swiping from the left edge.
 *
 * Colors are theme-aware (derived from the app theme `surface`/`text`/... tokens) so
 * the sidebar matches the rest of the app in both light and dark mode.
 *
 * Layout (top → bottom):
 * - Profile header → the Personal account (tap returns to Personal mode). No dropdown.
 * - Search (business mode only)
 * - Workspace → retractable list of the companies you belong to. A company with multiple
 *   branches expands inline (a left-indent rule under its name) so you can pick a branch;
 *   a single-branch company is selected directly. The active company/branch is highlighted.
 * - Tools (business mode) → "Tools" title + collapsible groups; the tool for the current
 *   screen is highlighted, and its group auto-opens. Personal mode shows a simple menu.
 * - Help the community + Logout footer
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { AppAlert } from '@/shared/services/appAlert';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { Avatar } from '@/shared/components/ui/Avatar';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { CountBadge } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { useBusinessStore } from '@/shared/store/businessStore';
import { useNotifications } from '@/shared/context/NotificationContext';
import { authAPI, get as apiGet } from '@/shared/services/api';
import { getCapabilities } from '@/shared/auth/capabilities';
import roleRequestService from '@/features/team/roleRequest.service';
import { RoleRequest } from '@/shared/types/roleRequest';
import { UserBusiness } from '@/shared/types/business';

// Enable LayoutAnimation on Android (no-op on the new architecture / iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LEADING_SLOT = 36; // fixed leading column so all row labels align
const WORKSPACE_KEY = 'Workspace'; // openSections key for the Workspace section

// A trimmed branch shape used by the Workspace switcher (the store keeps the full object).
type SidebarBranch = { id: string; name: string; is_primary?: boolean };

// Walk a navigation state down to the deepest focused route name. Used to highlight the
// tool that matches the current screen (drawer → "Tabs" → focused tab route).
function deepestRouteName(state: any): string | undefined {
  if (!state || typeof state.index !== 'number' || !Array.isArray(state.routes)) return undefined;
  const route = state.routes[state.index];
  if (route?.state) return deepestRouteName(route.state) ?? route?.name;
  return route?.name;
}

type ToolItem = { label: string; icon: string; route?: string; onPress: () => void; badge?: number };

export default function SidebarContent(props: DrawerContentComponentProps) {
  const { theme: appTheme, isDarkMode } = useTheme();
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
    chip: appTheme.colors.buttonBackground,
    accent: appTheme.colors.accent,
    danger: appTheme.colors.error,
  };
  // Selected row fill — one subtle step darker than the sidebar surface (not the old harsh
  // black). The selected icon + tick are tinted with the accent on top of this.
  const selectedBg = isDarkMode ? '#1A1714' : '#EFE9E1';

  const currentUser = useProfileStore((state) => state.currentUser);
  const activeMode = useProfileStore((state) => state.activeMode);
  const activeBusinessId = useProfileStore((state) => state.activeBusinessId);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
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

  // Collapsible sections. Workspace is open by default; tool groups start collapsed (the group
  // holding the current screen auto-opens below).
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ [WORKSPACE_KEY]: true });
  const [searchQuery, setSearchQuery] = useState('');

  // Per-company expand state inside the Workspace section (companies with multiple branches).
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Pending branch selection applied after switching into a not-yet-active company, once its
  // branches have loaded (avoids the fetchLocations reset clobbering the choice). See effect below.
  const [pendingLocation, setPendingLocation] = useState<{ businessId: string; locationId: string } | null>(null);

  // Pre-loaded branch lists for companies that aren't the active one (the active one uses the
  // live `locations` from businessStore). Lets any multi-branch company expand inline.
  const [companyLocations, setCompanyLocations] = useState<Map<string, SidebarBranch[]>>(new Map());
  const loadedBranchIds = useRef<Set<string>>(new Set());
  // The active company we've already auto-expanded, so the user can collapse it afterwards
  // without it springing back open (it re-expands only when you switch into another company).
  const autoExpandedRef = useRef<string | null>(null);

  // Pending/decided admin-access requests for staff-only memberships, keyed by business id.
  const [roleRequests, setRoleRequests] = useState<Map<string, RoleRequest>>(new Map());

  const workspaceOpen = !!openSections[WORKSPACE_KEY];

  // When the Workspace opens, load access-request statuses for any staff-only memberships
  // so their rows can show "Request pending / declined / tap to request access".
  useEffect(() => {
    if (!workspaceOpen) return;
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
  }, [workspaceOpen, userBusinesses]);

  // When the Workspace opens, pre-load branch lists for the companies we can switch into
  // (non-staff, not currently active). The active company uses the live `locations` instead.
  useEffect(() => {
    if (!workspaceOpen) return;
    const targets = userBusinesses.filter(
      (ub) =>
        !getCapabilities(ub.role).isStaff &&
        ub.business.id !== activeBusinessId &&
        !loadedBranchIds.current.has(ub.business.id)
    );
    if (targets.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const ub of targets) {
        loadedBranchIds.current.add(ub.business.id);
        let branches: SidebarBranch[] = [];
        try {
          const raw = await apiGet<Record<string, any>[]>(`/companies/${ub.business.id}/locations`);
          branches = raw.map((loc) => ({ id: loc.id, name: loc.name || '', is_primary: loc.is_primary }));
        } catch {
          branches = [];
        }
        if (cancelled) return;
        setCompanyLocations((prev) => new Map(prev).set(ub.business.id, branches));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceOpen, userBusinesses, activeBusinessId]);

  // Apply a pending branch selection once we've switched into the company and its branches loaded.
  useEffect(() => {
    if (!pendingLocation) return;
    if (activeBusinessId !== pendingLocation.businessId) return;
    if (locations.length === 0) return; // wait for fetchLocations to populate
    const found = locations.find((l) => l.id === pendingLocation.locationId);
    if (found) setLocation(found);
    setPendingLocation(null);
  }, [pendingLocation, locations, activeBusinessId, setLocation]);

  // Default the active company to expanded the first time you switch into it. It stays
  // collapsible afterwards (the ref prevents it re-opening until you switch companies).
  useEffect(() => {
    if (activeMode === 'business' && activeBusinessId && autoExpandedRef.current !== activeBusinessId) {
      autoExpandedRef.current = activeBusinessId;
      setExpandedCompanies((prev) => (prev.has(activeBusinessId) ? prev : new Set(prev).add(activeBusinessId)));
    }
  }, [activeMode, activeBusinessId]);

  // The tool matching the current screen (so its row highlights as selected).
  const activeRoute = deepestRouteName(props.state);

  // Holds the latest tool groups so the auto-open effect can read them without re-subscribing.
  const sectionsRef = useRef<{ title: string; items: ToolItem[] }[] | null>(null);

  // Auto-open the tool group that contains the current screen (without closing others).
  useEffect(() => {
    if (!activeRoute) return;
    const groups = sectionsRef.current;
    if (!groups) return;
    const group = groups.find((s) => s.items.some((it) => it.route === activeRoute));
    if (group) {
      setOpenSections((prev) => (prev[group.title] ? prev : { ...prev, [group.title]: true }));
    }
  }, [activeRoute]);

  if (!currentUser) {
    return null;
  }

  const closeDrawer = () => props.navigation.closeDrawer();

  // Routes that now live as hidden tabs inside BusinessTabNavigator. Navigating to one
  // must target the tab navigator (nested under the drawer's "Tabs" screen) so the page
  // keeps the bottom nav bar and shows the hamburger (not a back button) at its root.
  const TAB_ROUTES = new Set([
    'LogisticsOverview', 'Deliveries', 'Transfers', 'Orders', 'MyDeliveries', 'Routes',
    'Issues', 'Returns', 'DeliveriesAnalytics', 'Products', 'Categories', 'Brands', 'Collections', 'Stock',
    'ProductVisibility', 'PriceLists', 'Invoices', 'TeamManagement', 'Locations', 'CompanySettings', 'SubscriptionHub',
    'BottomSheetGallery', 'MessageGallery', 'ButtonGallery', 'ProductGallery',
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

  // Expand/collapse a section (Workspace or a tool group) with a smooth height animation.
  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Expand/collapse a single company's branch list inside the Workspace.
  const toggleCompany = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // The pinned profile header is the Personal account: tapping it returns to Personal mode.
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
        AppAlert.alert(
          'Request pending',
          `Your admin-access request for ${ub.business.name} is still awaiting review.`
        );
        return;
      }
      AppAlert.alert(
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

  // Select a specific branch (or "All locations" when branchId is null) of a company. If the
  // company isn't active yet, switch into it first and apply the branch once it has loaded.
  const selectLocation = (ub: UserBusiness, branchId: string | null) => {
    const id = ub.business.id;
    if (activeMode === 'business' && activeBusinessId === id) {
      setLocation(branchId ? locations.find((l) => l.id === branchId) ?? null : null);
    } else {
      switchToBusiness(id);
      if (branchId) setPendingLocation({ businessId: id, locationId: branchId });
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
      AppAlert.alert(
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
        AppAlert.alert('Request already sent', 'You already have a pending admin-access request for this business.');
      } else if (msg.includes('cooldown') || msg.includes('recently rejected')) {
        AppAlert.alert('Request cooldown', 'Your previous request was recently reviewed. Please wait before requesting again.');
      } else {
        AppAlert.alert('Request failed', 'Failed to send the admin-access request. Please try again.');
      }
    }
  };

  // Add a business: let the user choose between creating a new one or joining an existing one.
  const handleAddAccount = () => {
    AppAlert.actionSheet({
      title: 'Add account',
      message: 'Create a new business or join an existing one.',
      options: [
        { label: 'Create new business', onPress: () => go('BusinessBasicInfo', { fromProfileSwitcher: true }) },
        { label: 'Join existing business', onPress: () => go('SelectCompany') },
        { label: 'Cancel', cancel: true },
      ],
    });
  };

  // "Help the community" card (footer) → feedback hub. Lives here so it's reachable from
  // both Personal and Business mode (it used to be duplicated in the two Settings screens).
  const handleHelpCommunity = () => go('FeedbackCategories');

  const handleLogout = () => {
    AppAlert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => authAPI.logout() },
    ]);
  };

  const isBusiness = activeMode === 'business' && !!activeBusiness;

  const shortcuts: ToolItem[] = [
    {
      label: 'Profile',
      icon: activeMode === 'business' ? 'business-outline' : 'person-outline',
      onPress: handleOpenProfile,
    },
    {
      label: 'Settings',
      icon: 'settings-outline',
      onPress: () => go(activeMode === 'business' ? 'ProfileSettings' : 'PersonalProfileSettings'),
    },
    {
      label: 'Subscription',
      icon: 'card-outline',
      // Business: in-shell SubscriptionHub tab. Personal: plain RootStack SubscriptionPlans (back button).
      onPress: () => go(activeMode === 'business' ? 'SubscriptionHub' : 'SubscriptionPlans'),
    },
    { label: 'Tasks', icon: 'checkbox-outline', onPress: () => go('Tasks') },
  ];

  // Business Workspace grouped navigation (Business mode only). Built items navigate;
  // not-yet-built items open the "Coming soon" placeholder. `route` matches the live screen.
  const businessSections: { title: string; items: ToolItem[] }[] | null = isBusiness
    ? [
        {
          title: 'Logistics',
          items: [
            { label: 'Overview', icon: 'grid-outline', route: 'LogisticsOverview', onPress: () => go('LogisticsOverview') },
            { label: 'All deliveries', icon: 'truck-outline', route: 'Deliveries', onPress: () => go('Deliveries'), badge: deliveriesUnreadCount },
            { label: 'Transfers', icon: 'swap-horizontal-outline', route: 'Transfers', onPress: () => go('Transfers') },
            { label: 'Orders', icon: 'cart-outline', route: 'Orders', onPress: () => go('Orders') },
            { label: 'My deliveries', icon: 'person-outline', route: 'MyDeliveries', onPress: () => go('MyDeliveries') },
            { label: 'Routes', icon: 'map-outline', route: 'Routes', onPress: () => go('Routes') },
            { label: 'Issues', icon: 'alert-circle-outline', route: 'Issues', onPress: () => go('Issues') },
            { label: 'Returns', icon: 'arrow-undo-outline', route: 'Returns', onPress: () => go('Returns') },
            { label: 'Analytics', icon: 'bar-chart-outline', route: 'DeliveriesAnalytics', onPress: () => go('DeliveriesAnalytics') },
          ],
        },
        {
          title: 'Products',
          items: [
            { label: 'Products', icon: 'cube-outline', route: 'Products', onPress: () => go('Products') },
            { label: 'Categories', icon: 'grid-outline', route: 'Categories', onPress: () => go('Categories') },
            { label: 'Brands', icon: 'bookmark-outline', route: 'Brands', onPress: () => go('Brands') },
            { label: 'Collections', icon: 'folder-outline', route: 'Collections', onPress: () => go('Collections') },
            { label: 'Stock', icon: 'archive-outline', route: 'Stock', onPress: () => go('Stock') },
            { label: 'Price lists', icon: 'cash-outline', route: 'PriceLists', onPress: () => go('PriceLists') },
            { label: 'Visibility', icon: 'eye-outline', route: 'ProductVisibility', onPress: () => go('ProductVisibility') },
            // COMING-SOON (hidden for v1 store submission — restore when built):
            // { label: 'Recipes', icon: 'restaurant-outline', onPress: () => comingSoon('Recipes') },
            // { label: 'Discounts', icon: 'pricetag-outline', onPress: () => comingSoon('Discounts') },
          ],
        },
        {
          title: 'Accounting',
          items: [
            { label: 'Invoices', icon: 'receipt-text-outline', route: 'Invoices', onPress: () => go('Invoices'), badge: invoicesUnreadCount },
            { label: 'Estimates', icon: 'document-text-outline', onPress: () => go('Invoices', { initialTab: 'estimates' }) },
            // COMING-SOON (hidden for v1 store submission — restore when built):
            // { label: 'Scan invoice', icon: 'scan-outline', onPress: () => comingSoon('Scan invoice') },
          ],
        },
        {
          title: 'Business',
          items: [
            { label: 'Public profile', icon: 'business-outline', onPress: () => go('ViewBusinessProfile', { businessId: activeBusiness!.id }) },
            // COMING-SOON (hidden for v1 store submission — restore when built):
            // { label: 'Customers', icon: 'people-outline', onPress: () => comingSoon('Customers') },
            { label: 'Team', icon: 'person-add-outline', route: 'TeamManagement', onPress: () => go('TeamManagement', { businessId: activeBusiness!.id }) },
            { label: 'Locations', icon: 'location-outline', route: 'Locations', onPress: () => go('Locations') },
            // COMING-SOON (hidden for v1 store submission — restore when built):
            // { label: 'Analytics', icon: 'bar-chart-outline', onPress: () => comingSoon('Analytics') },
            // { label: 'Variance', icon: 'pie-chart-outline', onPress: () => comingSoon('Variance') },
            { label: 'Subscription', icon: 'card-outline', route: 'SubscriptionHub', onPress: () => go('SubscriptionHub') },
            { label: 'Settings', icon: 'settings-outline', route: 'CompanySettings', onPress: () => go('CompanySettings') },
          ],
        },
        {
          title: 'Design System',
          items: [
            { label: 'Bottom Sheet Gallery', icon: 'apps-outline', route: 'BottomSheetGallery', onPress: () => go('BottomSheetGallery') },
            { label: 'Message Gallery', icon: 'chatbubbles-outline', route: 'MessageGallery', onPress: () => go('MessageGallery') },
            { label: 'Button Gallery', icon: 'radio-button-on-outline', route: 'ButtonGallery', onPress: () => go('ButtonGallery') },
            { label: 'Product Screens', icon: 'cube-outline', route: 'ProductGallery', onPress: () => go('ProductGallery') },
          ],
        },
      ]
    : null;

  // Feed the latest tool groups to the auto-open effect declared above the early return.
  sectionsRef.current = businessSections;

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
        active && { backgroundColor: selectedBg },
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

  // A branch (location) row inside an expanded company. Selected = subtle fill + accent icon/tick.
  const BranchItem = ({
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
        selected && { backgroundColor: selectedBg },
        pressed && !selected && { backgroundColor: C.highlight },
      ]}
    >
      <Icon name={icon} size={18} color={selected ? C.accent : C.iconMuted} strokeWidth={selected ? 2.75 : 2} />
      <Text
        style={[styles.branchLabel, { color: C.text, fontWeight: selected ? '700' : '500' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? <Icon name="checkmark" size={18} color={C.accent} strokeWidth={2.75} /> : null}
    </Pressable>
  );

  // One company in the Workspace list.
  const renderCompany = (ub: UserBusiness) => {
    const id = ub.business.id;
    const isStaff = getCapabilities(ub.role).isStaff;
    const isActiveBiz = isBusiness && activeBusinessId === id;
    const avatar = (
      <Avatar userId={id} userName={ub.business.name} imageUri={ub.business.logo_url ?? null} size={36} borderRadius={9} />
    );

    // Staff-only membership: can't enter business mode — show a request-access pill.
    if (isStaff) {
      const request = roleRequests.get(id);
      let pill: { icon: string; text: string };
      if (request?.status === 'PENDING') pill = { icon: 'time-outline', text: 'Request pending' };
      else if (request?.status === 'REJECTED') pill = { icon: 'close-circle-outline', text: 'Request declined' };
      else pill = { icon: 'lock-closed-outline', text: 'Tap to request access' };
      return (
        <Pressable
          key={id}
          onPress={() => handleSelectBusiness(ub)}
          style={({ pressed }) => [styles.companyRow, pressed && { backgroundColor: C.highlight }]}
        >
          <View style={styles.leading}>{avatar}</View>
          <View style={styles.companyInfo}>
            <View style={styles.companyNameRow}>
              <Text style={[styles.companyName, { color: C.text }]} numberOfLines={1}>
                {ub.business.name}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: C.chip }]}>
              <Icon name={pill.icon} size={13} color={C.textMuted} strokeWidth={2} />
              <Text style={[styles.statusText, { color: C.textMuted }]}>{pill.text}</Text>
            </View>
          </View>
        </Pressable>
      );
    }

    // Only show locations that actually belong to this company. businessStore.locations can
    // briefly hold the previously-active company's locations right after a switch (before
    // CompanyStoreInitializer refetches), which would leak another company's branches here.
    const branches: SidebarBranch[] = isActiveBiz
      ? locations.filter((l) => l.companyId === activeBusinessId)
      : companyLocations.get(id) ?? [];

    // Locations only matter in Business mode. In Personal mode the workspace list is just a way
    // to switch into a company, so every company is a plain row (no branches shown).
    // The selection always lives on a LOCATION, never on the company: the active company lists
    // its location(s) (even a single one) with the current/primary one highlighted; other
    // companies expand only when they actually have more than one branch.
    const showLocations = isBusiness && (isActiveBiz ? branches.length >= 1 : branches.length > 1);

    // Expandable company header + its location list. Defaults to open (see effect above) but is
    // still collapsible. A location is highlighted only when it's actually the selected one —
    // entering a company does not auto-pick a branch.
    if (showLocations) {
      const expanded = expandedCompanies.has(id);
      return (
        <View key={id}>
          <Pressable
            onPress={() => toggleCompany(id)}
            style={({ pressed }) => [styles.companyRow, pressed && { backgroundColor: C.highlight }]}
          >
            <View style={styles.leading}>{avatar}</View>
            <View style={styles.companyInfo}>
              <View style={styles.companyNameRow}>
                <Text style={[styles.companyName, { color: C.text }]} numberOfLines={1}>
                  {ub.business.name}
                </Text>
              </View>
            </View>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.iconMuted} strokeWidth={2} />
          </Pressable>
          {expanded ? (
            <>
              <View style={[styles.companyDivider, { backgroundColor: C.divider }]} />
              <View style={[styles.branchIndent, { borderLeftColor: C.divider }]}>
                {branches.map((b) => (
                  <BranchItem
                    key={b.id}
                    icon="location"
                    label={b.name}
                    selected={isActiveBiz && currentLocationId === b.id}
                    onPress={() => selectLocation(ub, b.id)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      );
    }

    // Non-active company with a single (or no) branch → a plain row; tapping switches into it
    // (its location then shows selected once it becomes the active company).
    return (
      <Pressable
        key={id}
        onPress={() => handleSelectBusiness(ub)}
        style={({ pressed }) => [styles.companyRow, pressed && { backgroundColor: C.highlight }]}
      >
        <View style={styles.leading}>{avatar}</View>
        <View style={styles.companyInfo}>
          <View style={styles.companyNameRow}>
            <Text style={[styles.companyName, { color: C.text, fontWeight: '600' }]} numberOfLines={1}>
              {ub.business.name}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

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
      {/* Profile header — the Personal account. Tap returns to Personal mode. */}
      <Pressable
        onPress={handleSelectPersonal}
        style={({ pressed }) => [styles.profileCard, pressed && { backgroundColor: C.highlight }]}
      >
        <Avatar
          userId={currentUser.id}
          userName={currentUser.name}
          imageUri={currentUser.avatar_url}
          size={52}
          borderRadius={26}
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>
            {currentUser.name}
          </Text>
          <Text style={[styles.profileEmail, { color: C.textMuted }]} numberOfLines={1}>
            {currentUser.email ?? 'Personal'}
          </Text>
        </View>
      </Pressable>

      {/* Search (business mode) */}
      {isBusiness ? (
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

      {/* Workspaces — the companies you belong to (retractable) */}
      <View style={styles.section}>
        <Pressable
          onPress={() => toggleSection(WORKSPACE_KEY)}
          style={({ pressed }) => [styles.sectionHeader, pressed && { backgroundColor: C.highlight }]}
        >
          <Text style={[styles.sectionLabel, { color: C.textMuted, marginBottom: 0, marginLeft: 0 }]}>WORKSPACES</Text>
          <Icon name={workspaceOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.iconMuted} strokeWidth={2} />
        </Pressable>
        {workspaceOpen ? (
          <View style={styles.workspaceBody}>
            {userBusinesses.map(renderCompany)}
            <Pressable
              onPress={handleAddAccount}
              style={({ pressed }) => [styles.companyRow, pressed && { backgroundColor: C.highlight }]}
            >
              <View style={styles.leading}>
                <Icon name="add" size={20} color={C.icon} strokeWidth={2.5} />
              </View>
              <Text style={[styles.companyName, { color: C.text, fontWeight: '600' }]}>Add a workspace</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: C.divider }]} />

      {/* Tools (business mode) or a simple menu (personal mode) */}
      {businessSections ? (
        <>
          <SectionLabel text="TOOLS" />
          {businessSections.map((section) => {
            const open = !!openSections[section.title];
            return (
              <View key={section.title} style={styles.section}>
                <Pressable
                  onPress={() => toggleSection(section.title)}
                  style={({ pressed }) => [styles.sectionHeader, pressed && { backgroundColor: C.highlight }]}
                >
                  <Text style={[styles.sectionHeaderText, { color: C.text }]}>{section.title}</Text>
                  <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.iconMuted} strokeWidth={2} />
                </Pressable>
                {open ? (
                  <View style={[styles.sectionItems, { borderLeftColor: C.divider }]}>
                    {section.items.map((item) => {
                      const active = !!item.route && item.route === activeRoute;
                      return (
                        <Row
                          key={item.label}
                          onPress={item.onPress}
                          label={item.label}
                          active={active}
                          leading={<Icon name={item.icon} size={22} color={active ? C.accent : C.icon} strokeWidth={active ? 2.75 : 2} />}
                          trailing={
                            <View style={styles.trailingGroup}>
                              <CountBadge count={item.badge ?? 0} color={C.accent} />
                              <Icon name="chevron-forward" size={18} color={active ? C.accent : C.iconMuted} strokeWidth={2} />
                            </View>
                          }
                        />
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      ) : (
        <>
          <SectionLabel text="MENU" />
          {shortcuts.map((item) => (
            <Row
              key={item.label}
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
  workspaceBody: {
    marginTop: 2,
  },
  sectionItems: {
    marginLeft: 20,
    paddingLeft: 12,
    marginTop: 2,
    borderLeftWidth: 1.5,
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
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  companyInfo: {
    flex: 1,
    marginLeft: 10,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
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
  companyDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
    marginRight: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  branchIndent: {
    marginLeft: 26,
    paddingLeft: 10,
    marginBottom: 2,
    borderLeftWidth: 1.5,
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
