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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/theme/ThemeProvider';
import theme from '@/shared/theme';
import { useNotifications } from '@/shared/context/NotificationContext';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import { EmptyState, ExploreChips, SectionTitle } from '@/shared/components/ui';
import AppSearchBar from '@/shared/components/ui/AppSearchBar';
import BusinessListCard from '@/features/profile/components/BusinessListCard';
import { useExploreDiscovery } from '@/features/explore';
import type { ExploreBusiness } from '@/features/explore';
import { useOpportunities, OpportunityCard } from '@/features/opportunities';
import { useUpcomingEvents, EventCard } from '@/features/events';
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

export default function BusinessExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme: appTheme } = useTheme();
  const { unreadCount } = useNotifications();
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
  const openOpportunity = (id: string) => navigation.navigate('OpportunityDetail', { opportunityId: id });
  const { items: events } = useUpcomingEvents({ limit: 10 });
  const openEvent = (id: string) => navigation.navigate('EventDetail', { eventId: id });

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
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.seeAll, { color: appTheme.colors.primary }]}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderBusiness = (b: ExploreBusiness) => (
    <BusinessListCard
      key={b.id}
      id={b.id}
      name={b.name}
      logo={b.logoUrl || undefined}
      industry={b.industry || b.category || undefined}
      description={b.description || b.address || undefined}
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
      <Image
        source={{ uri: item.productPicture || 'https://via.placeholder.com/140' }}
        style={[styles.productImg, { backgroundColor: appTheme.colors.imagePlaceholder }]}
      />
      <Text numberOfLines={1} style={[styles.productName, { color: appTheme.colors.text }]}>{item.name}</Text>
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
      <Image source={{ uri: item.productPicture || 'https://via.placeholder.com/56' }} style={styles.productRowImg} />
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
        const buyers = opportunities.filter((o) => o.type === 'buying');
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
            {opportunities.length ? (
              opportunities.map((o) => (
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
            {events.length ? (
              events.map((ev) => (
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
            {directory.length ? directory.slice(0, 6).map(renderBusiness) : (
              <ComingSoon icon="business-outline" title="No businesses found" subtitle="Discoverable businesses will appear here." />
            )}
            <SectionHeader title="Opportunities" onSeeAll={() => navigation.navigate('Opportunities')} />
            {opportunities.length ? (
              opportunities.slice(0, 3).map((o) => (
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
            {events.length ? (
              events.slice(0, 3).map((ev) => (
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
      <SecondaryHeader
        title="Explore"
        leftAction={
          navigation.canGoBack()
            ? { icon: 'chevron-left', onPress: () => navigation.goBack() }
            : { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }
        }
        rightActions={[
          {
            icon: 'notifications-outline',
            onPress: () => navigation.navigate('Notifications'),
            badge: unreadCount,
            accessibilityLabel: 'Notifications',
          },
        ]}
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
    marginTop: 18,
    marginBottom: 6,
  },
  seeAll: { fontSize: 14, fontWeight: '600' },
  hList: { paddingHorizontal: 12, gap: 12, paddingVertical: 4 },
  productCard: {
    width: 150,
  },
  productImg: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12, marginBottom: 8 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productRowImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#FAF8F5' },
  productName: { fontFamily: theme.fonts.primary.semiBold, fontSize: 14 },
  productMeta: { fontFamily: theme.fonts.primary.regular, fontSize: 12, marginTop: 2 },
  productPrice: { fontFamily: theme.fonts.primary.semiBold, fontSize: 14, marginTop: 4 },
  comingSoon: { paddingVertical: 8 },
});
