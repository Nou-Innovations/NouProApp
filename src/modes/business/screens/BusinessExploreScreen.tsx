/**
 * BusinessExploreScreen - B2B discovery / marketplace.
 *
 * Answers "who can my business connect with, buy from, sell to, or work with?" — NOT a social feed.
 * Sectioned discovery driven by a chip strip: Recommended, Business directory, Product discovery,
 * Nearby, plus Opportunities & Events (backend arrives in later phases — shown as "coming soon" here).
 *
 * Dual-purpose: it is both the `BusinessExplore` tab AND the pushed `ExploreOverlay` (opened from
 * Personal Home / Connections). The header left action branches on `navigation.canGoBack()`.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { PrimaryHeader } from '@/shared/components/layout/headers';
import { EmptyState, ExploreChips, SectionTitle, TextButton, ImageOrPlaceholder } from '@/shared/components/ui';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import BusinessListCard from '@/features/profile/components/BusinessListCard';
import { useExploreDiscovery } from '@/features/explore';
import type { ExploreBusiness } from '@/features/explore';
import { useOpportunities, OpportunityCard, type Opportunity } from '@/features/opportunities';
import { useUpcomingEvents, EventCard, type BizEvent } from '@/features/events';
import type { UIProduct } from '@/shared/types/product';
import { RootStackParamList } from '@/shared/types/navigation';

const CHIPS = [
  'Overall',
  'Businesses',
  'Products',
  'Suppliers',
  'Buyers',
  'Opportunities',
  'Events',
  'Near Me',
];

// Preview-only placeholder data so Opportunities & Events render even before any
// real records exist. Falls back automatically once the backend returns data.
// Flip USE_MOCK_DISCOVERY to false to disable. IDs are prefixed `mock-` so taps no-op.
const USE_MOCK_DISCOVERY = true;

const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'mock-opp-1',
    businessId: 'mock-biz-1',
    title: 'Looking for a bulk basmati rice supplier',
    description: null,
    type: 'buying',
    category: null,
    budgetMin: 50000,
    budgetMax: 120000,
    currency: 'Rs',
    locationText: 'Port Louis',
    status: 'open',
    createdByUserId: 'mock-user',
    createdAt: '2026-06-15T08:00:00.000Z',
    updatedAt: '2026-06-15T08:00:00.000Z',
    business: { id: 'mock-biz-1', name: 'Spice Route Trading', logoUrl: null, industry: 'food_beverage' },
    responseCount: 4,
  },
  {
    id: 'mock-opp-2',
    businessId: 'mock-biz-2',
    title: 'Surplus stainless steel cookware — 30% off',
    description: null,
    type: 'selling',
    category: null,
    budgetMin: null,
    budgetMax: null,
    currency: 'Rs',
    locationText: 'Curepipe',
    status: 'open',
    createdByUserId: 'mock-user',
    createdAt: '2026-06-14T08:00:00.000Z',
    updatedAt: '2026-06-14T08:00:00.000Z',
    business: { id: 'mock-biz-2', name: 'MetroWares Ltd', logoUrl: null, industry: 'general_retail' },
    responseCount: 2,
  },
  {
    id: 'mock-opp-3',
    businessId: 'mock-biz-3',
    title: 'Seeking a co-distribution partner for the North',
    description: null,
    type: 'partnership',
    category: null,
    budgetMin: null,
    budgetMax: null,
    currency: 'Rs',
    locationText: 'Grand Baie',
    status: 'open',
    createdByUserId: 'mock-user',
    createdAt: '2026-06-12T08:00:00.000Z',
    updatedAt: '2026-06-12T08:00:00.000Z',
    business: { id: 'mock-biz-3', name: 'Island Logistics Co', logoUrl: null, industry: 'services' },
    responseCount: 6,
  },
];

const MOCK_EVENTS: BizEvent[] = [
  {
    id: 'mock-evt-1',
    businessId: 'mock-biz-1',
    title: 'Retail Merchandising Masterclass',
    description: null,
    type: 'workshop',
    startAt: '2026-07-10T09:30:00.000Z',
    endAt: null,
    locationText: 'Ebène',
    isOnline: false,
    onlineUrl: null,
    coverImageUrl: null,
    capacity: 40,
    status: 'scheduled',
    createdByUserId: 'mock-user',
    createdAt: '2026-06-15T08:00:00.000Z',
    updatedAt: '2026-06-15T08:00:00.000Z',
    business: { id: 'mock-biz-1', name: 'NouPro Academy', logoUrl: null },
    rsvpCount: 18,
  },
  {
    id: 'mock-evt-2',
    businessId: 'mock-biz-2',
    title: 'F&B Distributors Mixer',
    description: null,
    type: 'networking',
    startAt: '2026-07-18T14:00:00.000Z',
    endAt: null,
    locationText: 'Grand Baie',
    isOnline: false,
    onlineUrl: null,
    coverImageUrl: null,
    capacity: 80,
    status: 'scheduled',
    createdByUserId: 'mock-user',
    createdAt: '2026-06-13T08:00:00.000Z',
    updatedAt: '2026-06-13T08:00:00.000Z',
    business: { id: 'mock-biz-2', name: 'Mauritius Trade Hub', logoUrl: null },
    rsvpCount: 35,
  },
  {
    id: 'mock-evt-3',
    businessId: 'mock-biz-3',
    title: 'Digital Invoicing 101 (Webinar)',
    description: null,
    type: 'webinar',
    startAt: '2026-07-22T11:00:00.000Z',
    endAt: null,
    locationText: null,
    isOnline: true,
    onlineUrl: 'https://example.com/webinar',
    coverImageUrl: null,
    capacity: null,
    status: 'scheduled',
    createdByUserId: 'mock-user',
    createdAt: '2026-06-11T08:00:00.000Z',
    updatedAt: '2026-06-11T08:00:00.000Z',
    business: { id: 'mock-biz-3', name: 'FinTech MU', logoUrl: null },
    rsvpCount: 52,
  },
];

export default function BusinessExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const [selectedChip, setSelectedChip] = useState('Overall');
  const [query, setQuery] = useState('');

  const {
    directory,
    recommended,
    nearby,
    products,
    loading,
    refreshing,
    error,
    refresh,
    isConnected,
    toggleConnect,
    myCity,
  } = useExploreDiscovery();

  const { items: opportunities } = useOpportunities({ limit: 10 });
  const openOpportunity = (id: string) => {
    if (id.startsWith('mock-')) return; // preview placeholder — no real detail to open
    navigation.navigate('OpportunityDetail', { opportunityId: id });
  };
  const { items: events } = useUpcomingEvents({ limit: 10 });
  const openEvent = (id: string) => {
    if (id.startsWith('mock-')) return; // preview placeholder — no real detail to open
    navigation.navigate('EventDetail', { eventId: id });
  };

  // Show placeholder cards when there's no real data yet (preview aid, see USE_MOCK_DISCOVERY).
  const oppList = opportunities.length || !USE_MOCK_DISCOVERY ? opportunities : MOCK_OPPORTUNITIES;
  const evList = events.length || !USE_MOCK_DISCOVERY ? events : MOCK_EVENTS;
  // Business directory should only surface businesses the user is NOT already connected to.
  const directoryUnconnected = directory.filter((b) => !isConnected(b.id));

  // ---- navigation helpers ----
  const openDrawer = () => navigation.dispatch(DrawerActions.toggleDrawer());
  const goBusiness = (businessId: string) => navigation.navigate('ViewBusinessProfile', { businessId });
  const goProduct = (productId: string) => navigation.navigate('ProductDetail', { productId });
  const submitSearch = () => {
    if (query.trim()) navigation.navigate('CompanySearch', { query: query.trim() });
  };

  // ---- renderers ----
  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <SectionTitle>{title}</SectionTitle>
      {onSeeAll && <TextButton title="See all" onPress={onSeeAll} tone="primary" />}
    </View>
  );

  const renderBusiness = (b: ExploreBusiness) => (
    <BusinessListCard
      key={b.id}
      id={b.id}
      name={b.name}
      logo={b.logoUrl || undefined}
      industry={b.industry || b.category || undefined}
      isConnected={isConnected(b.id)}
      productsCount={b.productsCount}
      onPress={() => goBusiness(b.id)}
      onConnect={() => toggleConnect(b.id)}
    />
  );

  const renderProductCard = ({ item }: { item: UIProduct }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => goProduct(item.id)}
      activeOpacity={0.85}
    >
      <ImageOrPlaceholder uri={item.productPicture} style={styles.productImg} iconSize={32} />
      <Text numberOfLines={2} style={[styles.productName, { color: appTheme.colors.text }]}>{item.name}</Text>
      <Text numberOfLines={1} style={[styles.productMeta, { color: appTheme.colors.textMuted }]}>{item.brand || ''}</Text>
      <Text numberOfLines={1} style={[styles.productPrice, { color: appTheme.colors.primary }]}>
        {item.priceHidden ? 'Price on request' : `Rs ${item.price?.toFixed(2) ?? '0.00'}`}
      </Text>
    </TouchableOpacity>
  );

  const renderProductRow = (item: UIProduct) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.productRow, { borderBottomColor: appTheme.colors.borderColor }]}
      onPress={() => goProduct(item.id)}
      activeOpacity={0.7}
    >
      <ImageOrPlaceholder uri={item.productPicture} style={styles.productRowImg} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={[styles.productName, { color: appTheme.colors.text }]}>{item.name}</Text>
        <Text numberOfLines={1} style={[styles.productMeta, { color: appTheme.colors.textMuted }]}>{item.brand || ''}</Text>
      </View>
      <Text style={[styles.productPrice, { color: appTheme.colors.primary }]}>
        {item.priceHidden ? 'Price on request' : `Rs ${item.price?.toFixed(2) ?? '0.00'}`}
      </Text>
    </TouchableOpacity>
  );

  const ComingSoon = ({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) => (
    <View style={styles.comingSoon}>
      <EmptyState compact iconName={icon} title={title} subtitle={subtitle} />
    </View>
  );

  const ProductCarousel = ({ data }: { data: UIProduct[] }) => (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(p) => p.id}
      renderItem={renderProductCard}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hList}
    />
  );

  const renderSections = () => {
    switch (selectedChip) {
      case 'Businesses':
        return (
          <>
            {recommended.length > 0 && (
              <>
                <SectionHeader title="Recommended for you" />
                {recommended.slice(0, 5).map(renderBusiness)}
              </>
            )}
            <SectionHeader title="All businesses" />
            {directory.length ? directory.map(renderBusiness) : (
              <ComingSoon icon="business-outline" title="No businesses found" subtitle="Try a different search or check back soon." />
            )}
          </>
        );

      case 'Products':
        return (
          <>
            <SectionHeader title="Products from businesses" />
            {products.length ? products.map(renderProductRow) : (
              <ComingSoon icon="cube-outline" title="No products yet" subtitle="Public products from other businesses will show here." />
            )}
          </>
        );

      case 'Suppliers':
        return (
          <>
            <SectionHeader title="Suppliers & distributors" />
            {directory.length ? directory.map(renderBusiness) : (
              <ComingSoon icon="business-outline" title="No suppliers found" subtitle="Connect with distributors and wholesalers here." />
            )}
          </>
        );

      case 'Buyers': {
        const buyers = oppList.filter((o) => o.type === 'buying');
        return (
          <>
            <SectionHeader title="Businesses looking to buy" onSeeAll={() => navigation.navigate('Opportunities')} />
            {buyers.length ? (
              buyers.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} onPress={() => openOpportunity(o.id)} showRespond onRespond={() => openOpportunity(o.id)} />
              ))
            ) : (
              <ComingSoon icon="briefcase-outline" title="No buyer requests yet" subtitle="Businesses looking to buy will appear here." />
            )}
          </>
        );
      }

      case 'Opportunities':
        return (
          <>
            <SectionHeader title="Opportunities" onSeeAll={() => navigation.navigate('Opportunities')} />
            {oppList.length ? (
              oppList.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} onPress={() => openOpportunity(o.id)} showRespond onRespond={() => openOpportunity(o.id)} />
              ))
            ) : (
              <ComingSoon icon="briefcase-outline" title="No opportunities yet" subtitle="Post a request from the Opportunities screen." />
            )}
          </>
        );

      case 'Events':
        return (
          <>
            <SectionHeader title="Upcoming events" onSeeAll={() => navigation.navigate('Events')} />
            {evList.length ? (
              evList.map((ev) => (
                <EventCard key={ev.id} event={ev} onPress={() => openEvent(ev.id)} showRsvp onRsvp={() => openEvent(ev.id)} />
              ))
            ) : (
              <ComingSoon icon="calendar-outline" title="No upcoming events" subtitle="Host one from the Events screen." />
            )}
          </>
        );

      case 'Near Me':
        return (
          <>
            <SectionHeader title={myCity ? `Businesses near ${myCity}` : 'Nearby businesses'} />
            {nearby.length ? nearby.map(renderBusiness) : (
              <ComingSoon icon="location-outline" title="No nearby businesses" subtitle="Add your business address to find partners near you." />
            )}
          </>
        );

      case 'Overall':
      default:
        return (
          <>
            {recommended.length > 0 && (
              <>
                <SectionHeader title="Recommended for you" onSeeAll={() => setSelectedChip('Businesses')} />
                {recommended.slice(0, 5).map(renderBusiness)}
              </>
            )}
            {products.length > 0 && (
              <>
                <SectionHeader title="Popular products" onSeeAll={() => setSelectedChip('Products')} />
                <ProductCarousel data={products.slice(0, 10)} />
              </>
            )}
            <SectionHeader title="Business directory" onSeeAll={() => setSelectedChip('Businesses')} />
            {directoryUnconnected.length ? directoryUnconnected.slice(0, 6).map(renderBusiness) : (
              <ComingSoon icon="business-outline" title="No new businesses" subtitle="You're connected to everyone here — check back soon." />
            )}
            <SectionHeader title="Opportunities" onSeeAll={() => navigation.navigate('Opportunities')} />
            {oppList.length ? (
              oppList.slice(0, 3).map((o) => (
                <OpportunityCard key={o.id} opportunity={o} onPress={() => openOpportunity(o.id)} showRespond onRespond={() => openOpportunity(o.id)} />
              ))
            ) : (
              <ComingSoon icon="briefcase-outline" title="No opportunities yet" subtitle="Post a request to find partners, suppliers or buyers." />
            )}
            {nearby.length > 0 && (
              <>
                <SectionHeader title={myCity ? `Near ${myCity}` : 'Nearby'} onSeeAll={() => setSelectedChip('Near Me')} />
                {nearby.slice(0, 4).map(renderBusiness)}
              </>
            )}
            <SectionHeader title="Upcoming events" onSeeAll={() => navigation.navigate('Events')} />
            {evList.length ? (
              evList.slice(0, 3).map((ev) => (
                <EventCard key={ev.id} event={ev} onPress={() => openEvent(ev.id)} showRsvp onRsvp={() => openEvent(ev.id)} />
              ))
            ) : (
              <ComingSoon icon="calendar-outline" title="No upcoming events" subtitle="Host workshops, conferences and networking." />
            )}
          </>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <PrimaryHeader
        title="Explore"
        leftAction={
          navigation.canGoBack()
            ? { icon: 'chevron-left', onPress: () => navigation.goBack() }
            : { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }
        }
      />

      <View style={styles.searchRow}>
        <AppSearchBar
          placeholder="Search businesses, products, suppliers..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          onClear={() => setQuery('')}
          returnKeyType="search"
          containerStyle={styles.search}
        />
      </View>

      <ExploreChips chips={CHIPS} selected={selectedChip} onSelect={setSelectedChip} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <EmptyState
            iconName="alert-circle-outline"
            title="Couldn't load Explore"
            subtitle={error}
            ctaLabel="Retry"
            onCtaPress={refresh}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={appTheme.colors.primary} />
          }
        >
          {renderSections()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  searchRow: { paddingTop: 4 },
  search: { marginHorizontal: 12, marginTop: 4, marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 32,
    marginBottom: 6,
  },
  hList: { paddingHorizontal: 12, gap: 12, paddingVertical: 4 },
  productCard: {
    width: 180,
  },
  productImg: { width: 180, height: 200, borderRadius: 12, marginBottom: 8 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productRowImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#FAF8F5' },
  productName: { fontFamily: theme.fonts.primary.semiBold, fontSize: 16 },
  productMeta: { fontFamily: theme.fonts.primary.regular, fontSize: 14, marginTop: 2 },
  productPrice: { fontFamily: theme.fonts.primary.semiBold, fontSize: 16, marginTop: 4 },
  comingSoon: { paddingVertical: 8 },
});
