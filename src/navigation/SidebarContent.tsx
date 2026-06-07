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
 * - Profile header (avatar + name + email) → opens own profile
 * - Mode switcher (Personal ⇄ Business) → switchToPersonal / switchToBusiness
 * - Navigation: grouped Business Workspace sections (business mode) or a simple menu (personal)
 * - Logout footer
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/utils/icons';
import { Avatar } from '@/shared/components/ui/Avatar';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { useProfileStore } from '@/shared/store/profileStore';
import { authAPI } from '@/shared/services/api';

// Enable LayoutAnimation on Android (no-op on the new architecture / iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LEADING_SLOT = 36; // fixed leading column so all row labels align

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
  const userBusinesses = useProfileStore((state) => state.userBusinesses);
  const switchToPersonal = useProfileStore((state) => state.switchToPersonal);
  const switchToBusiness = useProfileStore((state) => state.switchToBusiness);

  // Collapsible business sections (all collapsed by default) + top search field.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) {
    return null;
  }

  const closeDrawer = () => props.navigation.closeDrawer();

  // Navigate to a parent RootStack route, closing the drawer first.
  const go = (routeName: string, params?: object) => {
    closeDrawer();
    nav.navigate(routeName, params);
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
      go('ViewUserProfile', { userId: currentUser.id });
    }
  };

  const handleSwitchPersonal = () => {
    if (activeMode !== 'personal') {
      switchToPersonal();
    }
    closeDrawer();
  };

  const handleSwitchBusiness = async (businessId: string) => {
    if (businessId !== activeBusinessId || activeMode !== 'business') {
      await switchToBusiness(businessId);
    }
    closeDrawer();
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => authAPI.logout() },
    ]);
  };

  // Only businesses the user can actually open in business mode (staff are personal-only).
  const switchableBusinesses = userBusinesses.filter((ub) => ub.role !== 'staff');

  const shortcuts: ShortcutItem[] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: activeMode === 'business' ? 'business-outline' : 'person-outline',
      onPress: handleOpenProfile,
    },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', onPress: () => go('Settings') },
    { key: 'subscription', label: 'Subscription', icon: 'card-outline', onPress: () => go('Subscription') },
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
            title: 'Deliveries',
            items: [
              { label: 'All deliveries', icon: 'truck-outline', onPress: () => go('Deliveries') },
              { label: 'Orders', icon: 'cart-outline', onPress: () => go('Orders') },
              { label: 'Transfers', icon: 'swap-horizontal-outline', onPress: () => go('Transfers') },
            ],
          },
          {
            title: 'Products',
            items: [
              { label: 'Products', icon: 'cube-outline', onPress: () => go('Products') },
              { label: 'Categories', icon: 'grid-outline', onPress: () => go('Categories') },
              { label: 'Brands', icon: 'bookmark-outline', onPress: () => go('Brands') },
              { label: 'Stock', icon: 'archive-outline', onPress: () => go('Stock') },
              { label: 'Price lists', icon: 'cash-outline', onPress: () => comingSoon('Price lists') },
              { label: 'Visibility', icon: 'eye-outline', onPress: () => go('ProductVisibility') },
              { label: 'Collections', icon: 'folder-outline', onPress: () => comingSoon('Collections') },
              { label: 'Recipes', icon: 'restaurant-outline', onPress: () => comingSoon('Recipes') },
              { label: 'Discounts', icon: 'pricetag-outline', onPress: () => comingSoon('Discounts') },
            ],
          },
          {
            title: 'Accounting',
            items: [
              { label: 'Invoices', icon: 'receipt-text-outline', onPress: () => go('Invoices') },
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
              { label: 'Subscription', icon: 'card-outline', onPress: () => go('Subscription') },
              { label: 'Settings', icon: 'settings-outline', onPress: () => go('CompanySettings') },
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
      {/* Profile header */}
      <Pressable
        onPress={handleOpenProfile}
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
          {currentUser.email ? (
            <Text style={[styles.profileEmail, { color: C.textMuted }]} numberOfLines={1}>
              {currentUser.email}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={20} color={C.iconMuted} strokeWidth={2} />
      </Pressable>

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

      {/* Mode switcher */}
      <SectionLabel text="SWITCH MODE" />
      <Row
        onPress={handleSwitchPersonal}
        active={activeMode === 'personal'}
        label="Personal"
        leading={
          <Icon
            name="person-outline"
            size={22}
            color={activeMode === 'personal' ? C.text : C.icon}
            strokeWidth={2}
          />
        }
        trailing={
          activeMode === 'personal' ? (
            <Icon name="checkmark" size={20} color={C.accent} strokeWidth={2.5} />
          ) : null
        }
      />
      {switchableBusinesses.map((ub) => {
        const isActive = activeMode === 'business' && activeBusinessId === ub.business.id;
        return (
          <Row
            key={ub.business.id}
            onPress={() => handleSwitchBusiness(ub.business.id)}
            active={isActive}
            label={ub.business.name}
            leading={
              <Avatar
                userId={ub.business.id}
                userName={ub.business.name}
                imageUri={ub.business.logo_url ?? null}
                size={30}
                borderRadius={8}
              />
            }
            trailing={
              isActive ? <Icon name="checkmark" size={20} color={C.accent} strokeWidth={2.5} /> : null
            }
          />
        );
      })}

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
                  {section.items.map((item) => (
                    <Row
                      key={item.label}
                      onPress={item.onPress}
                      label={item.label}
                      leading={<Icon name={item.icon} size={22} color={C.icon} strokeWidth={2} />}
                      trailing={<Icon name="chevron-forward" size={18} color={C.iconMuted} strokeWidth={2} />}
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
  spacer: {
    flex: 1,
    minHeight: 24,
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
