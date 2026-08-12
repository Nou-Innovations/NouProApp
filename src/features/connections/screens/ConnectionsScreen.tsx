/**
 * ConnectionsScreen
 * Shows list of users and companies connected with the profile owner
 * Includes filter to show All, Users, or Companies
 * Following design.json specifications - connectionsScreen section
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import Avatar from '@/shared/components/ui/Avatar';
import { EmptyState, AppButton, ButtonRow } from '@/shared/components/ui';
import { RootStackParamList } from '@/shared/types/navigation';
import { get } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import { AppAlert } from '@/shared/services/appAlert';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { unblockUser } from '@/features/profile/profile.service';
import {
  getUserConnections,
  getPendingConnectionRequests,
  acceptConnection,
  rejectConnection,
  removeConnection,
  getBlockedUsers,
  getBusinessConnections,
  getPendingBusinessConnections,
  removeBusinessConnection,
  acceptBusinessConnectionRequest,
  declineBusinessConnectionRequest,
  type PendingConnection,
  type PendingBusinessConnection,
  type BlockedUser,
} from '../connections.service';

type ConnectionsScreenRouteProp = RouteProp<RootStackParamList, 'Connections'>;

// Filter options
type FilterType = 'all' | 'users' | 'companies' | 'requests' | 'blocked';

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'users', label: 'Users' },
  { id: 'companies', label: 'Companies' },
  { id: 'requests', label: 'Requests' },
  { id: 'blocked', label: 'Blocked' },
];

// Connection type
type ConnectionType = 'user' | 'company';

interface BaseConnection {
  id: string;
  name: string;
  avatar_url: string;
  type: ConnectionType;
}

interface UserConnection extends BaseConnection {
  type: 'user';
  job_title?: string;
  company?: string;
}

interface CompanyConnection extends BaseConnection {
  type: 'company';
  industry?: string;
  description?: string;
  /** The BusinessConnection id — needed to disconnect. */
  connectionId?: string;
}

type Connection = UserConnection | CompanyConnection;

export default function ConnectionsScreen() {
  const navigation = useNavigation();
  const route = useRoute<ConnectionsScreenRouteProp>();
  const { theme: appTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [allConnections, setAllConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingConnection[]>([]);
  const [pendingBizRequests, setPendingBizRequests] = useState<PendingBusinessConnection[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const currentUserId = useProfileStore((state) => state.currentUser?.id);

  /**
   * Whose connections are we looking at? `route.params` was declared and never read, so
   * every entry point — including tapping someone else's count — showed YOUR list (C-6).
   * `mode` disambiguates the two business entry points, which pass a BUSINESS id through
   * a param historically named `userId`.
   */
  const paramId = route.params?.userId;
  const paramMode = (route.params as { mode?: 'user' | 'business' } | undefined)?.mode ?? 'user';
  const isViewingOther = Boolean(paramId && paramMode === 'user' && paramId !== currentUserId);
  const ownerId = isViewingOther ? paramId! : currentUserId;

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // CO-14: business connections now come from the canonical Group-A route, which
      // returns accepted-only and the OTHER company already resolved + stripped
      // ({ connectionId, business }) — the old /companies/:id/connections call returned
      // raw rows that never populated industry/description.
      const [userList, bizList] = await Promise.all([
        isViewingOther
          // Their connections. The API 404s unless you're one of them, so an empty list
          // is the honest outcome rather than an error.
          ? getUserConnections(ownerId!).catch(() => [])
          : get<{ connectionId: string; user: any; connectedAt: string }[]>('/connections'),
        // Business connections are always the VIEWER's own company — browsing another
        // company's partners would need its own gate and isn't part of this change.
        !isViewingOther && activeBusiness?.id
          ? getBusinessConnections(activeBusiness.id).catch(() => [])
          : Promise.resolve([]),
      ]);

      // Backend returns Prisma User fields: { id, name, avatar, jobTitle }
      const userConns: UserConnection[] = (userList || []).map((c: any) => ({
        id: c.user?.id || c.connectionId,
        name: c.user?.name || '',
        job_title: c.user?.jobTitle || undefined,
        company: c.user?.company || undefined,
        avatar_url: c.user?.avatar || '',
        type: 'user' as const,
      }));

      const bizConns: CompanyConnection[] = (bizList || []).map((c) => ({
        id: c.business?.id || c.connectionId,
        name: c.business?.name || 'Unknown Business',
        industry: c.business?.industry || undefined,
        description: c.business?.description || undefined,
        avatar_url: c.business?.logoUrl || '',
        connectionId: c.connectionId,
        type: 'company' as const,
      }));

      setAllConnections([...userConns, ...bizConns]);

      // Requests and blocks are self-only concepts — skip them entirely when looking at
      // someone else, rather than fetching data whose tabs are hidden anyway.
      if (isViewingOther) {
        setPendingRequests([]);
        setPendingBizRequests([]);
        setBlockedUsers([]);
      } else {
        // Best-effort: a failure here must not blank the main connections list.
        const [pending, bizPending, blocked] = await Promise.all([
          getPendingConnectionRequests().catch(() => [] as PendingConnection[]),
          activeBusiness?.id
            ? getPendingBusinessConnections(activeBusiness.id).catch(() => [] as PendingBusinessConnection[])
            : Promise.resolve([] as PendingBusinessConnection[]),
          getBlockedUsers().catch(() => [] as BlockedUser[]),
        ]);
        setPendingRequests(pending || []);
        setPendingBizRequests(bizPending || []);
        setBlockedUsers(blocked || []);
      }
    } catch {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, isViewingOther, ownerId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Name for the header, so the screen says whose list this is.
  useEffect(() => {
    if (!isViewingOther || !ownerId) return;
    let cancelled = false;
    get<{ name?: string }>(`/users/${ownerId}`)
      .then((u) => { if (!cancelled) setOwnerName(u?.name || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isViewingOther, ownerId]);

  const filteredConnections = useMemo(() => {
    let connections: Connection[] = [];

    switch (activeFilter) {
      case 'users':
        connections = allConnections.filter(c => c.type === 'user');
        break;
      case 'companies':
        connections = allConnections.filter(c => c.type === 'company');
        break;
      default:
        connections = allConnections;
    }

    if (!searchQuery.trim()) return connections;

    const query = searchQuery.toLowerCase();
    return connections.filter((connection) => {
      if (connection.type === 'user') {
        return (
          connection.name.toLowerCase().includes(query) ||
          (connection as UserConnection).job_title?.toLowerCase().includes(query) ||
          (connection as UserConnection).company?.toLowerCase().includes(query)
        );
      } else {
        return (
          connection.name.toLowerCase().includes(query) ||
          (connection as CompanyConnection).industry?.toLowerCase().includes(query) ||
          (connection as CompanyConnection).description?.toLowerCase().includes(query)
        );
      }
    });
  }, [searchQuery, activeFilter, allConnections]);

  const handleAcceptRequest = async (connectionId: string) => {
    setActioningId(connectionId);
    try {
      await acceptConnection(connectionId);
      await fetchConnections();
    } catch (err) {
      AppAlert.alert('Error', getApiErrorMessage(err, 'Could not accept the request.'));
    } finally {
      setActioningId(null);
    }
  };

  const handleDeclineRequest = async (connectionId: string) => {
    setActioningId(connectionId);
    try {
      await rejectConnection(connectionId);
      await fetchConnections();
    } catch (err) {
      AppAlert.alert('Error', getApiErrorMessage(err, 'Could not decline the request.'));
    } finally {
      setActioningId(null);
    }
  };

  const handleUnblock = (userId: string, name: string) => {
    AppAlert.alert('Unblock', `Unblock ${name || 'this person'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setActioningId(userId);
          try {
            await unblockUser(userId);
            await fetchConnections();
          } catch (err) {
            AppAlert.alert('Error', getApiErrorMessage(err, 'Could not unblock this person.'));
          } finally {
            setActioningId(null);
          }
        },
      },
    ]);
  };

  const handleDisconnect = (connectionId: string, name: string) => {
    AppAlert.alert('Remove connection', `Disconnect from ${name || 'this connection'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setActioningId(connectionId);
          try {
            await removeConnection(connectionId);
            await fetchConnections();
          } catch (err) {
            AppAlert.alert('Error', getApiErrorMessage(err, 'Could not remove the connection.'));
          } finally {
            setActioningId(null);
          }
        },
      },
    ]);
  };

  // CO-20: disconnect a partner company (the Group-B path had no working UI at all).
  const handleDisconnectCompany = (connectionId: string | undefined, name: string) => {
    if (!connectionId) return;
    AppAlert.alert('Remove connection', `Disconnect from ${name || 'this company'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setActioningId(connectionId);
          try {
            await removeBusinessConnection(connectionId);
            await fetchConnections();
          } catch (err) {
            AppAlert.alert('Error', getApiErrorMessage(err, 'Could not remove the connection.'));
          } finally {
            setActioningId(null);
          }
        },
      },
    ]);
  };

  // CO-20: accept/decline an incoming partner-company request.
  const handleAcceptBizRequest = async (connectionId: string) => {
    setActioningId(connectionId);
    try {
      await acceptBusinessConnectionRequest(connectionId);
      await fetchConnections();
    } catch (err) {
      AppAlert.alert('Error', getApiErrorMessage(err, 'Could not accept the request.'));
    } finally {
      setActioningId(null);
    }
  };

  const handleDeclineBizRequest = async (connectionId: string) => {
    setActioningId(connectionId);
    try {
      await declineBusinessConnectionRequest(connectionId);
      await fetchConnections();
    } catch (err) {
      AppAlert.alert('Error', getApiErrorMessage(err, 'Could not decline the request.'));
    } finally {
      setActioningId(null);
    }
  };

  const handleConnectionPress = (connection: Connection) => {
    if (connection.type === 'user') {
      // @ts-ignore
      navigation.navigate('ViewUserProfile', { userId: connection.id });
    } else {
      // @ts-ignore
      navigation.navigate('ViewBusinessProfile', { businessId: connection.id });
    }
  };

  // Header - design.json: headers.secondaryHeader (height: 56, title: 24px medium)
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: appTheme.colors.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Icon name="chevron-back" size={32} color={appTheme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: appTheme.colors.text }]} numberOfLines={1}>
        {isViewingOther ? `${ownerName || 'Their'} connections` : 'Connections'}
      </Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  // Search bar - design.json: connectionsScreen.searchBar + components.inputs.searchInput
  const renderSearchBar = () => (
    <View 
      style={[
        styles.searchContainer, 
        { 
          backgroundColor: appTheme.colors.cardBackground,
          borderColor: isSearchFocused || searchQuery ? appTheme.colors.primary : appTheme.colors.borderColor,
        }
      ]}
    >
      <Icon 
        name="search" 
        size={20} 
        color={isSearchFocused || searchQuery ? appTheme.colors.primary : appTheme.colors.textMuted} 
      />
      <TextInput
        style={[
          styles.searchInput, 
          { 
            color: appTheme.colors.text,
            fontFamily: searchQuery ? theme.fonts.primary.semiBold : theme.fonts.primary.medium,
          }
        ]}
        placeholder="Search connections"
        placeholderTextColor={appTheme.colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
          <Icon name="close-circle" size={20} color={appTheme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Filter bar - design.json: components.filterBar (full-width indicator)
  const renderFilterBar = () => (
    <View style={[styles.filterBar, { borderBottomColor: appTheme.colors.borderColor }]}>
      {/* Requests and Blocked are self-only concepts — hide them when viewing
          someone else's connections. */}
      {FILTERS.filter((f) => !isViewingOther || (f.id !== 'requests' && f.id !== 'blocked')).map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            style={styles.filterTab}
            onPress={() => setActiveFilter(filter.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                { 
                  color: isActive ? appTheme.colors.text : appTheme.colors.textMuted,
                  fontFamily: isActive ? theme.fonts.primary.bold : theme.fonts.primary.medium,
                },
              ]}
            >
              {filter.label}
            </Text>
            {isActive && (
              <View style={[styles.filterIndicator, { backgroundColor: appTheme.colors.text }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // User connection item - design.json: connectionsScreen.listItem (avatarRadius: 24 for users)
  const renderUserItem = (item: UserConnection) => (
    <TouchableOpacity
      style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => handleConnectionPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        userId={item.id}
        userName={item.name}
        imageUri={item.avatar_url}
        size={48}
        style={styles.userAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.name}
        </Text>
        {item.job_title && (
          <Text style={[styles.connectionSubtitle, { color: appTheme.colors.secondary }]}>
            {item.job_title}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
    </TouchableOpacity>
  );

  // Company connection item - design.json: connectionsScreen.listItem (avatarRadius: 8 for companies)
  const renderCompanyItem = (item: CompanyConnection) => (
    <TouchableOpacity
      style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => handleConnectionPress(item)}
      onLongPress={isViewingOther ? undefined : () => handleDisconnectCompany(item.connectionId, item.name)}
      activeOpacity={0.7}
    >
      <Avatar
        userId={item.id}
        userName={item.name}
        imageUri={item.avatar_url}
        size={48}
        style={styles.companyAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.name}
        </Text>
        {item.industry && (
          <Text style={[styles.connectionSubtitle, { color: appTheme.colors.secondary }]}>
            {item.industry}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color={appTheme.colors.iconMuted} />
    </TouchableOpacity>
  );

  const renderConnectionItem = ({ item }: { item: Connection }) => {
    if (item.type === 'user') {
      return renderUserItem(item);
    }
    return renderCompanyItem(item);
  };

  // Empty state - design.json: connectionsScreen.emptyState
  // Incoming request row: Accept / Decline inline.
  const renderRequestItem = ({ item }: { item: PendingConnection }) => (
    <View style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}>
      <Avatar
        userId={item.sender?.id || item.connectionId}
        userName={item.sender?.name || 'User'}
        imageUri={item.sender?.avatar || ''}
        size={48}
        style={styles.userAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.sender?.name || 'User'}
        </Text>
        {!!item.sender?.jobTitle && (
          <Text style={[styles.connectionSubtitle, { color: appTheme.colors.secondary }]}>
            {item.sender.jobTitle}
          </Text>
        )}
      </View>
      <ButtonRow>
        <AppButton
          title="Accept"
          size="small"
          variant="confirm"
          disabled={actioningId === item.connectionId}
          onPress={() => handleAcceptRequest(item.connectionId)}
        />
        <AppButton
          title="Decline"
          size="small"
          variant="secondary"
          disabled={actioningId === item.connectionId}
          onPress={() => handleDeclineRequest(item.connectionId)}
        />
      </ButtonRow>
    </View>
  );

  // CO-20: incoming partner-company request row (Accept / Decline inline). Before this the
  // only surface for these was the notification feed.
  const renderBizRequestItem = (item: PendingBusinessConnection) => (
    <View style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}>
      <Avatar
        userId={item.requesterBusiness?.id || item.connectionId}
        userName={item.requesterBusiness?.name || 'Company'}
        imageUri={item.requesterBusiness?.logoUrl || ''}
        size={48}
        style={styles.companyAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.requesterBusiness?.name || 'Company'}
        </Text>
        <Text style={[styles.connectionSubtitle, { color: appTheme.colors.secondary }]}>
          {item.requesterBusiness?.industry || 'Wants to connect'}
        </Text>
      </View>
      <ButtonRow>
        <AppButton
          title="Accept"
          size="small"
          variant="confirm"
          disabled={actioningId === item.connectionId}
          onPress={() => handleAcceptBizRequest(item.connectionId)}
        />
        <AppButton
          title="Decline"
          size="small"
          variant="secondary"
          disabled={actioningId === item.connectionId}
          onPress={() => handleDeclineBizRequest(item.connectionId)}
        />
      </ButtonRow>
    </View>
  );

  // Requests tab renders both user and company incoming requests.
  const renderAnyRequestItem = ({ item }: { item: any }) =>
    item.__kind === 'company'
      ? renderBizRequestItem(item as PendingBusinessConnection)
      : renderRequestItem({ item: item as PendingConnection });

  const combinedRequests = useMemo(
    () => [
      ...pendingRequests.map((r) => ({ ...r, __kind: 'user' as const })),
      ...pendingBizRequests.map((r) => ({ ...r, __kind: 'company' as const })),
    ],
    [pendingRequests, pendingBizRequests],
  );

  // Blocked row: the only place an unblock is possible — before this, blocking
  // someone was permanent by accident.
  const renderBlockedItem = ({ item }: { item: BlockedUser }) => (
    <View style={[styles.connectionItem, { borderBottomColor: appTheme.colors.borderColor }]}>
      <Avatar
        userId={item.user?.id}
        userName={item.user?.name || 'User'}
        imageUri={item.user?.avatar || ''}
        size={48}
        style={styles.userAvatar}
      />
      <View style={styles.connectionInfo}>
        <Text style={[styles.connectionName, { color: appTheme.colors.text }]}>
          {item.user?.name || 'User'}
        </Text>
      </View>
      <AppButton
        title="Unblock"
        size="small"
        variant="secondary"
        disabled={actioningId === item.user?.id}
        onPress={() => handleUnblock(item.user?.id, item.user?.name || '')}
      />
    </View>
  );

  const renderEmptyState = () => {
    let emptyTitle = 'No connections yet';
    let emptyMessage = 'Build your professional network by connecting with others.';
    let emptyIcon = 'person-add-outline';
    let ctaLabel: string | undefined = 'Find people';
    let ctaAction: (() => void) | undefined = () => navigation.navigate('ExploreOverlay' as never);
    
    if (searchQuery) {
      emptyTitle = 'No results found';
      emptyMessage = `No connections matching "${searchQuery}"`;
      emptyIcon = 'search-outline';
      ctaLabel = undefined;
      ctaAction = undefined;
    } else if (activeFilter === 'users') {
      emptyTitle = 'No user connections';
      emptyMessage = 'Connect with other users to grow your network';
      emptyIcon = 'person-outline';
    } else if (activeFilter === 'companies') {
      emptyTitle = 'No business connections';
      emptyMessage = 'Connect with suppliers, retailers, and partners.';
      emptyIcon = 'business-outline';
      ctaLabel = 'Find businesses';
    }

    return (
      <EmptyState
        iconName={emptyIcon}
        title={emptyTitle}
        subtitle={emptyMessage}
        ctaLabel={ctaLabel}
        onCtaPress={ctaAction}
        testID="empty-connections"
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: appTheme.colors.background }]}
      edges={['top']}
    >
      {renderHeader()}
      {renderSearchBar()}
      {renderFilterBar()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={
            activeFilter === 'requests'
              ? (combinedRequests as any[])
              : activeFilter === 'blocked'
                ? (blockedUsers as any[])
                : (filteredConnections as any[])
          }
          keyExtractor={(item: any) =>
            activeFilter === 'blocked'
              ? item.user?.id
              : activeFilter === 'requests'
                ? `${item.__kind}-${item.connectionId}`
                : item.id
          }
          renderItem={
            activeFilter === 'requests'
              ? (renderAnyRequestItem as any)
              : activeFilter === 'blocked'
                ? (renderBlockedItem as any)
                : (renderConnectionItem as any)
          }
          contentContainerStyle={filteredConnections.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchConnections}
          refreshing={loading}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header - design.json: headers.secondaryHeader (height: 56)
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  backButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    textAlign: 'center',
    flex: 1,
  },
  headerRightSpacer: {
    width: 56,
  },
  // Search bar - design.json: connectionsScreen.searchBar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  // Filter bar - design.json: components.filterBar (height: 40, full-width indicator)
  filterBar: {
    height: 40,
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterTabText: {
    fontSize: 14,
  },
  // Full-width indicator per design.json filterBar.selected.indicatorPosition
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  // List items - design.json: connectionsScreen.listItem
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  // All avatars use 8px border radius - no difference between user and company
  userAvatar: {
    borderRadius: 8,
  },
  companyAvatar: {
    borderRadius: 8,
  },
  connectionInfo: {
    flex: 1,
  },
  // design.json: connectionsScreen.listItem.nameTypography
  connectionName: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
  },
  // design.json: connectionsScreen.listItem.subtitleTypography
  connectionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    marginTop: 2,
  },
  // Empty state - design.json: connectionsScreen.emptyState
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary.medium,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary.regular,
    textAlign: 'center',
    marginTop: 8,
  },
});
