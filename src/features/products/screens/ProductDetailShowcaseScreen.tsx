/**
 * ProductDetailShowcaseScreen — a static, pixel-faithful build of the new premium
 * product-detail UI from Figma (node 15205-55920, "The Obsidian Kettle").
 *
 * This is a DESIGN-SYSTEM REFERENCE only: content is hardcoded mock data and it is
 * NOT wired to real products (the design uses size/color variants + reviews the data
 * model doesn't have yet). Reached from Design System → Product Screens.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { Icon } from '@/shared/utils/icons';
import theme from '@/shared/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetailShowcase'>;

// Exact tokens from the Figma design (standalone showcase — not theme-driven).
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GREY = '#787878';
const CARD = '#F7F7F7';
const BORDER = '#E6E6E6';
const GREEN = '#22A45D';

// Placeholder hero — swap for the real product asset.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80';

const SIZES = ['1.0 Litre', '1.7 Litre', '2.5 Litre'];
const COLORS = [
  { name: 'Obsidian Black', hex: '#1C1C1C' },
  { name: 'Graphite', hex: '#9A9A9A' },
  { name: 'Pearl', hex: '#DADADA' },
];
const SPECS = [
  { icon: 'hardware-chip-outline', label: 'Material', value: 'Double-walled Stainless Steel' },
  { icon: 'cube-outline', label: 'Weight', value: '1.2 kg' },
  { icon: 'scan-outline', label: 'Dimensions', value: '292mm x 171mm x 203mm' },
];
const REVIEWS = [
  { name: 'Marcus T.', stars: 5, ago: '2 days ago', text: 'Absolutely stunning design. The temperature control is dead accurate and it looks amazing on my counter. Best purchase this year.' },
  { name: 'Elena R.', stars: 4, ago: '1 week ago', text: 'Great kettle, really fast boil time. The matte finish is beautiful though it does pick up fingerprints if your hands are oily.' },
];

type Tab = 'description' | 'specifications' | 'reviews';

const ProductDetailShowcaseScreen: React.FC<Props> = ({ navigation }) => {
  const [size, setSize] = useState(1);
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('description');

  const Stars = ({ count, size: s = 14 }: { count: number; size?: number }) => (
    <View style={styles.starsRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={s} color={i < count ? BLACK : BORDER} />
      ))}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-back" size={24} color={BLACK} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="heart-outline" size={24} color={BLACK} />
            </TouchableOpacity>
            <View>
              <Icon name="cart-outline" size={24} color={BLACK} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>2</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <Image source={{ uri: HERO_IMAGE }} style={styles.hero} resizeMode="cover" />

        <View style={styles.body}>
          {/* Brand + name */}
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>STÜDIO.01</Text>
            </View>
            <Text style={styles.signature}>Signature Series</Text>
          </View>
          <Text style={styles.name}>The Obsidian Kettle</Text>

          {/* Size */}
          <View style={styles.sizeHeader}>
            <Text style={styles.sectionLabelBold}>Select Size</Text>
            <Text style={styles.sizeGuide}>Size Guide</Text>
          </View>
          <View style={styles.chipsRow}>
            {SIZES.map((s, i) => {
              const selected = i === size;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
                  onPress={() => setSize(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: selected ? WHITE : BLACK, fontFamily: selected ? theme.fonts.primary.bold : theme.fonts.primary.regular }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color */}
          <Text style={styles.colorLabel}>
            <Text style={{ fontFamily: theme.fonts.primary.bold }}>Color: </Text>
            {COLORS[color].name}
          </Text>
          <View style={styles.swatchRow}>
            {COLORS.map((c, i) => (
              <TouchableOpacity
                key={c.name}
                style={[styles.swatchOuter, i === color && styles.swatchSelected]}
                onPress={() => setColor(i)}
                activeOpacity={0.8}
              >
                <View style={[styles.swatchInner, { backgroundColor: c.hex }]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>$189.00</Text>
            <Text style={styles.priceStruck}>$225.00</Text>
            <View style={styles.offBadge}>
              <Text style={styles.offBadgeText}>15% OFF</Text>
            </View>
          </View>

          {/* In stock */}
          <View style={styles.stockRow}>
            <View style={styles.stockDot} />
            <Text style={styles.stockText}>In Stock & Ready to Ship</Text>
          </View>

          {/* Quantity + Add to Bag */}
          <View style={styles.qtyRow}>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="remove" size={20} color={BLACK} />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity onPress={() => setQty((q) => q + 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="add" size={20} color={BLACK} />
              </TouchableOpacity>
            </View>
            <Text style={styles.stockLeft}>Only 4 items left in stock</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>Add to Bag • $189.00</Text>
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {(['description', 'specifications', 'reviews'] as Tab[]).map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} activeOpacity={0.7}>
                <Text
                  style={[
                    styles.tab,
                    { color: tab === t ? BLACK : GREY, fontFamily: tab === t ? theme.fonts.primary.bold : theme.fonts.primary.regular },
                  ]}
                >
                  {t === 'description' ? 'Description' : t === 'specifications' ? 'Specifications' : 'Reviews'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {tab === 'reviews' ? (
            <View style={styles.reviewsWrap}>
              {REVIEWS.map((r) => (
                <View key={r.name} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <View style={styles.reviewWho}>
                      <View style={styles.reviewAvatar} />
                      <View>
                        <Text style={styles.reviewName}>{r.name}</Text>
                        <Stars count={r.stars} size={10} />
                      </View>
                    </View>
                    <Text style={styles.reviewAgo}>{r.ago}</Text>
                  </View>
                  <Text style={styles.reviewText}>{r.text}</Text>
                </View>
              ))}
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAll}>See All 128 Reviews</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {tab === 'description' && (
                <Text style={styles.description}>
                  Engineered for precision and aesthetics. The Obsidian Kettle features variable temperature control, a
                  gooseneck spout for optimal pour-over control, and a minimalist design that complements any modern
                  kitchen. Hand-finished matte surface.
                </Text>
              )}
              <View style={styles.specs}>
                {SPECS.map((sp) => (
                  <View key={sp.label} style={styles.specItem}>
                    <View style={styles.specIcon}>
                      <Icon name={sp.icon} size={20} color={BLACK} />
                    </View>
                    <View style={styles.specTextWrap}>
                      <Text style={styles.specLabel}>{sp.label}</Text>
                      <Text style={styles.specValue}>{sp.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Shipping card */}
          <View style={styles.shipCard}>
            <Icon name="truck" size={24} color={BLACK} />
            <View style={styles.shipTextWrap}>
              <Text style={styles.shipTitle}>Free Express Shipping</Text>
              <Text style={styles.shipSub}>Arrives by Tuesday, Oct 24 • Free Returns</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  headerSafe: { backgroundColor: WHITE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: WHITE, fontSize: 10, fontFamily: theme.fonts.primary.bold },

  hero: { width: '100%', aspectRatio: 430 / 480, backgroundColor: '#ECEAE6' },

  body: { padding: 24, gap: 24 },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -16 },
  brandBadge: { backgroundColor: BLACK, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  brandBadgeText: { color: WHITE, fontSize: 10, fontFamily: theme.fonts.primary.bold, letterSpacing: 0.5 },
  signature: { color: BLACK, fontSize: 12, fontFamily: theme.fonts.primary.regular, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: BLACK, fontSize: 32, lineHeight: 35, fontFamily: theme.fonts.primary.bold, marginBottom: -8 },

  sizeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -12 },
  sectionLabelBold: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.bold },
  sizeGuide: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.regular, textDecorationLine: 'underline' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  chipSelected: { backgroundColor: BLACK },
  chipIdle: { borderWidth: 1, borderColor: BORDER },
  chipText: { fontSize: 14 },

  colorLabel: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.regular, marginBottom: -12 },
  swatchRow: { flexDirection: 'row', gap: 12 },
  swatchOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: BLACK },
  swatchInner: { width: 24, height: 24, borderRadius: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  price: { color: BLACK, fontSize: 24, fontFamily: theme.fonts.primary.bold },
  priceStruck: { color: GREY, fontSize: 18, fontFamily: theme.fonts.primary.regular, textDecorationLine: 'line-through' },
  offBadge: { backgroundColor: BLACK, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  offBadgeText: { color: WHITE, fontSize: 10, fontFamily: theme.fonts.primary.bold, letterSpacing: 0.5 },

  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  stockText: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.semiBold },

  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 140,
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  qtyNum: { color: BLACK, fontSize: 16, fontFamily: theme.fonts.primary.semiBold },
  stockLeft: { color: BLACK, fontSize: 12, fontFamily: theme.fonts.primary.regular },
  addBtn: { backgroundColor: BLACK, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: WHITE, fontSize: 16, fontFamily: theme.fonts.primary.bold },

  tabsRow: { flexDirection: 'row', gap: 32, marginBottom: -8 },
  tab: { fontSize: 14 },

  description: { color: BLACK, fontSize: 14, lineHeight: 22, fontFamily: theme.fonts.primary.regular },

  specs: { gap: 16 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  specIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  specTextWrap: { flex: 1, gap: 2 },
  specLabel: { color: BLACK, fontSize: 12, fontFamily: theme.fonts.primary.regular },
  specValue: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.semiBold },

  reviewsWrap: { gap: 12 },
  reviewCard: { backgroundColor: CARD, borderRadius: 12, padding: 20, gap: 12 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewWho: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#D9D9D9' },
  reviewName: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.semiBold },
  reviewAgo: { color: GREY, fontSize: 12, fontFamily: theme.fonts.primary.regular },
  reviewText: { color: BLACK, fontSize: 13, lineHeight: 20, fontFamily: theme.fonts.primary.regular },
  seeAll: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.semiBold, textAlign: 'center' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },

  shipCard: { backgroundColor: CARD, borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  shipTextWrap: { flex: 1, gap: 8 },
  shipTitle: { color: BLACK, fontSize: 14, fontFamily: theme.fonts.primary.semiBold },
  shipSub: { color: BLACK, fontSize: 12, fontFamily: theme.fonts.primary.regular },
});

export default ProductDetailShowcaseScreen;
