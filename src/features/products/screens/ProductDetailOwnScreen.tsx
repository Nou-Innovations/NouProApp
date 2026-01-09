import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { Icon } from '@/shared/utils/icons';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock product data - in real app this would come from API
const mockProduct = {
  id: 'PRD-001',
  name: 'Premium Wireless Headphones',
  brand: 'AudioPro',
  category: 'Electronics',
  units: '1 piece',
  currentPrice: 299.99,
  originalPrice: 399.99,
  onSale: true,
  description: 'Experience premium sound quality with these state-of-the-art wireless headphones. Featuring advanced noise cancellation technology, 30-hour battery life, and comfortable over-ear design. Perfect for music lovers, professionals, and anyone who demands the best audio experience.',
  images: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=600&fit=crop',
  ],
  sku: 'WH-PRE-001',
  barcode: '1234567890123',
  stock: 25,
  minThreshold: 5,
  taxRate: 18,
  supplier: 'TechCorp Industries',
};

const mockSameBrandProducts = [
  {
    id: 'BRAND-001',
    name: 'AudioPro Earbuds Pro',
    brand: 'AudioPro',
    currentPrice: 149.99,
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop'],
  },
  {
    id: 'BRAND-002',
    name: 'AudioPro Speaker Max',
    brand: 'AudioPro',
    currentPrice: 199.99,
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200&h=200&fit=crop'],
  },
  {
    id: 'BRAND-003',
    name: 'AudioPro Gaming Headset',
    brand: 'AudioPro',
    currentPrice: 179.99,
    images: ['https://images.unsplash.com/photo-1599669454699-248893623440?w=200&h=200&fit=crop'],
  },
  {
    id: 'BRAND-004',
    name: 'AudioPro Soundbar',
    brand: 'AudioPro',
    currentPrice: 329.99,
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop'],
  },
];

const mockRelatedProducts = [
  {
    id: 'REL-001',
    name: 'Wireless Charger',
    currentPrice: 49.99,
    images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=200&h=200&fit=crop'],
  },
  {
    id: 'REL-002',
    name: 'Phone Case',
    currentPrice: 29.99,
    images: ['https://images.unsplash.com/photo-1601593346740-925612772716?w=200&h=200&fit=crop'],
  },
  {
    id: 'REL-003',
    name: 'Screen Protector',
    currentPrice: 19.99,
    images: ['https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200&h=200&fit=crop'],
  },
  {
    id: 'REL-004',
    name: 'Bluetooth Adapter',
    currentPrice: 39.99,
    images: ['https://images.unsplash.com/photo-1625842268584-8f3296236761?w=200&h=200&fit=crop'],
  },
  {
    id: 'REL-005',
    name: 'Cable Organizer',
    currentPrice: 15.99,
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop'],
  },
  {
    id: 'REL-006',
    name: 'USB Hub',
    currentPrice: 24.99,
    images: ['https://images.unsplash.com/photo-1625842268584-8f3296236761?w=200&h=200&fit=crop'],
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetailOwn'>;

const ProductDetailOwnScreen: React.FC<Props> = ({ route, navigation }) => {
  const { productId } = route.params;
  const { theme: appTheme } = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const carouselHeight = Dimensions.get('window').height * 0.66;

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentImageIndex(pageNum);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const shareProduct = async () => {
    try {
      await Share.share({
        message: `Check out this ${mockProduct.name} - Rs ${mockProduct.currentPrice}`,
        url: `https://noupro.com/products/${productId}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const adjustQuantity = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= mockProduct.stock) {
      setQuantity(newQuantity);
    }
  };

  const addToCart = () => {
    if (mockProduct.stock === 0) return;
    Alert.alert('Added to Cart', `${quantity} x ${mockProduct.name} added to cart`);
  };

  return (
    <View style={styles.container}>
      {/* Sticky Back & Actions Controls */}
      <SafeAreaView style={styles.stickyControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.rightControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
              onPress={toggleFavorite}
            >
              <Icon 
                name={isFavorite ? 'heart' : 'heart-outline'} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
              onPress={shareProduct}
            >
              <Icon name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Scrollable Content with Image Carousel */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Edge-to-Edge Image Carousel */}
        <View style={[styles.carouselContainer, { height: carouselHeight }]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {mockProduct.images.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={[styles.carouselImage, { width: screenWidth }]}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          
          {/* Dot Indicators */}
          <View style={styles.dotContainer}>
            {mockProduct.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentImageIndex 
                      ? appTheme.colors.primary 
                      : 'rgba(255,255,255,0.5)'
                  }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info Block */}
        <View style={styles.productInfoBlock}>
          <Text style={[styles.productName, { color: appTheme.colors.primary }]}>
            {mockProduct.name}
          </Text>
          <Text style={[styles.categoryUnits, { color: appTheme.colors.secondary }]}>
            {mockProduct.category} • {mockProduct.units}
          </Text>
          
          <View style={styles.priceContainer}>
            {mockProduct.onSale && (
              <Text style={[styles.originalPrice, { color: appTheme.colors.darkGrey }]}>
                Rs {mockProduct.originalPrice}
              </Text>
            )}
            <Text style={[
              styles.currentPrice, 
              { color: appTheme.colors.primary }
            ]}>
              Rs {mockProduct.currentPrice}
            </Text>
          </View>
        </View>

        {/* Expandable Description */}
        <TouchableWithoutFeedback onPress={toggleDescription}>
          <View style={styles.descriptionContainer}>
            <Text
              style={[styles.descriptionText, { color: appTheme.colors.secondary }]}
              numberOfLines={isDescriptionExpanded ? undefined : 2}
            >
              {mockProduct.description}
            </Text>
            <Text style={[styles.seeMoreText, { color: appTheme.colors.primary }]}>
              {isDescriptionExpanded ? 'See less' : 'See more'}
            </Text>
          </View>
        </TouchableWithoutFeedback>

        {/* Additional Product Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: appTheme.colors.secondary }]}>SKU:</Text>
            <Text style={[styles.detailValue, { color: appTheme.colors.primary }]}>
              {mockProduct.sku}
            </Text>
          </View>

          {mockProduct.barcode && (
            <View style={styles.detailRow}>
              <Icon 
                name="barcode-outline" 
                size={16} 
                color={appTheme.colors.secondary} 
                style={styles.barcodeIcon}
              />
              <Text style={[styles.detailValue, { color: appTheme.colors.primary }]}>
                {mockProduct.barcode}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: appTheme.colors.secondary }]}>Stock:</Text>
            <Text style={[styles.detailValue, { color: appTheme.colors.primary }]}>
              {mockProduct.stock} units
            </Text>
            {mockProduct.stock <= mockProduct.minThreshold && (
              <View style={[styles.lowStockBadge, { backgroundColor: appTheme.colors.warning }]}>
                <Text style={[styles.lowStockText, { color: appTheme.colors.background }]}>
                  Low stock
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: appTheme.colors.secondary }]}>Tax:</Text>
            <Text style={[styles.detailValue, { color: appTheme.colors.primary }]}>
              {mockProduct.taxRate}%
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: appTheme.colors.secondary }]}>Supplier:</Text>
            <Text style={[styles.detailValue, { color: appTheme.colors.primary }]}>
              {mockProduct.supplier}
            </Text>
          </View>
        </View>

        {/* Same Brand Products */}
        <View style={styles.relatedContainer}>
          <Text style={[styles.relatedTitle, { color: appTheme.colors.primary }]}>
            More from {mockProduct.brand}
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedScrollContent}
          >
            {mockSameBrandProducts.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.relatedCard, 
                  index === 0 && styles.firstRelatedCard
                ]}
              >
                <Image source={{ uri: item.images[0] }} style={styles.relatedImage} />
                <Text style={[styles.relatedName, { color: appTheme.colors.primary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.relatedPrice, { color: appTheme.colors.secondary }]}>
                  Rs {item.currentPrice}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Related Products */}
        <View style={styles.lastRelatedContainer}>
          <Text style={[styles.relatedTitle, { color: appTheme.colors.primary }]}>
            Related Products
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedScrollContent}
          >
            {mockRelatedProducts.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.relatedCard, 
                  index === 0 && styles.firstRelatedCard
                ]}
              >
                <Image source={{ uri: item.images[0] }} style={styles.relatedImage} />
                <Text style={[styles.relatedName, { color: appTheme.colors.primary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.relatedPrice, { color: appTheme.colors.secondary }]}>
                  Rs {item.currentPrice}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImage: {
    height: '100%',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  stickyControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    gap: 16,
  },
  scrollContent: {
    flex: 1,
  },
  productInfoBlock: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  productName: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoryUnits: {
    fontSize: 16,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 20,
    textDecorationLine: 'line-through',
    textDecorationColor: '#EF4444',
    marginRight: 8,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '600',
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 0,
  },
  detailLabel: {
    fontSize: 14,
    minWidth: 60,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  barcodeIcon: {
    marginRight: 43,
  },
  lowStockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  relatedContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingBottom: 16,
  },
  lastRelatedContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginBottom: 40,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  relatedScrollContent: {
    paddingRight: 16,
  },
  relatedCard: {
    backgroundColor: 'transparent',
    padding: 8,
    marginRight: 0,
  },
  firstRelatedCard: {
    marginLeft: 16,
  },
  relatedImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 14,
  },
});

export default ProductDetailOwnScreen; 