import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import { UIProductStatus as ProductStatus } from '@/shared/types/product';
import ImagePlaceholder from '@/shared/components/ui/ImagePlaceholder';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import PaywallModal from '@/features/subscription/components/PaywallModal';
import { checkPaywall, getLimitTriggerId, PaywallCheck } from '@/shared/utils/permissions';
import { useProfileStore } from '@/shared/store/profileStore';
import { createProduct, updateProduct, getProducts } from '../products.service';
import { uploadImage } from '@/shared/services/imageService';
import theme from '@/shared/theme';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/shared/constants/categories';

const availableStatuses: ProductStatus[] = ['Available', 'Out of Stock', 'In Production', 'Inactive', 'Discontinued'];

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProduct'>;

const CreateProductScreen: React.FC<Props> = ({ navigation, route }) => {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState(route.params?.selectedBrand || '');
  const [brandId, setBrandId] = useState<string | undefined>(route.params?.selectedBrandId);
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductStatus>('Available');
  const [unit, setUnit] = useState('');
  const [stock, setStock] = useState('');
  // Additional owner detail fields
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [isListed, setIsListed] = useState(true);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  // Carton pricing
  const [hasCarton, setHasCarton] = useState(false);
  const [unitsPerCarton, setUnitsPerCarton] = useState('');
  const [pricePerCarton, setPricePerCarton] = useState('');
  // Retail price limit
  const [hasRetailPriceLimit, setHasRetailPriceLimit] = useState(false);
  const [retailPriceLimit, setRetailPriceLimit] = useState('');
  const { theme: appTheme } = useTheme();

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallCheckResult, setPaywallCheckResult] = useState<PaywallCheck | null>(null);

  // Get current plan and listed product count for limit checking
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const [currentListedCount, setCurrentListedCount] = useState(0);

  // Fetch listed product count for limit checking
  useEffect(() => {
    if (!activeBusiness?.id) return;
    getProducts({ companyId: activeBusiness.id })
      .then(products => {
        const listed = (products || []).filter(p => p.isListed || p.is_listed || p.isDisplayable).length;
        setCurrentListedCount(listed);
      })
      .catch(() => setCurrentListedCount(0));
  }, [activeBusiness?.id]);

  // Status color helper
  const getStatusColor = (statusValue: ProductStatus) => {
    switch (statusValue.toLowerCase()) {
      case 'available': return theme.colors.success;
      case 'out of stock': return theme.colors.error;
      case 'in production': return theme.colors.info;
      case 'inactive': return theme.colors.neutral;
      case 'discontinued': return theme.colors.warning;
      default: return theme.colors.neutral;
    }
  };

  // Check if we're editing an existing product
  const editingProduct = (route.params as any)?.product;
  const isEditMode = !!editingProduct;

  useEffect(() => {
    if (route.params?.selectedBrand) {
      setBrand(route.params.selectedBrand);
    }
    if (route.params?.selectedBrandId) {
      setBrandId(route.params.selectedBrandId);
    }
  }, [route.params?.selectedBrand, route.params?.selectedBrandId]);

  // Prefill form when editing an existing product
  useEffect(() => {
    if (!editingProduct) return;

    const p = editingProduct;
    setProductName(p.name ?? p.title ?? '');
    setBrand(p.brand ?? brand);
    setPrice(String(p.price ?? p.basePrice ?? ''));
    setSalePrice(p.sale_price != null ? String(p.sale_price) : (p.salePrice != null ? String(p.salePrice) : ''));
    setDescription(p.description ?? '');
    setCategory(p.category ?? category);
    setStatus(p.status ?? status);
    setUnit(p.unit ?? '');
    setStock(String(p.stock_quantity ?? p.stockQuantity ?? p.stock ?? ''));
    setSku(p.sku ?? '');
    setBarcode(p.barcode ?? '');
    setTaxRate(p.tax_rate != null ? String(p.tax_rate) : (p.taxRate != null ? String(p.taxRate) : ''));
    setSupplier(p.supplier ?? '');
    // Handle multiple images
    const existingImages = p.images || (p.image_url ? [p.image_url] : (p.productImage ? [p.productImage] : []));
    setProductImages(existingImages);
    setIsListed(Boolean(p.is_listed ?? p.isListed ?? true));
    if (p.brandId) setBrandId(p.brandId);
    // Carton pricing
    setHasCarton(Boolean(p.hasCarton));
    setUnitsPerCarton(p.unitsPerCarton ? String(p.unitsPerCarton) : '');
    setPricePerCarton(p.pricePerCarton ? String(p.pricePerCarton) : '');
    // Retail price limit
    setHasRetailPriceLimit(Boolean(p.hasRetailPriceLimit));
    setRetailPriceLimit(p.retailPriceLimit ? String(p.retailPriceLimit) : '');
  }, [editingProduct]);

  const isFormValid = useMemo(() => {
    return (
      productName.trim() !== '' &&
      brand.trim() !== '' &&
      price.trim() !== '' &&
      category.trim() !== '' &&
      unit.trim() !== '' &&
      stock.trim() !== '' &&
      parseFloat(price) > 0 &&
      parseInt(stock) >= 0
    );
  }, [productName, brand, price, category, unit, stock]);

  const [isSaving, setIsSaving] = useState(false);

  // Handle listed toggle with limit check
  const handleListedToggle = (newValue: boolean) => {
    if (newValue) {
      const triggerId = getLimitTriggerId('products', activeBusiness?.plan || null);
      const check = checkPaywall(triggerId, activeBusiness?.plan || null, { currentCount: currentListedCount });
      if (!check.allowed) {
        setPaywallCheckResult(check);
        setShowPaywall(true);
        return;
      }
    }
    setIsListed(newValue);
  };

  const handleSave = async () => {
    const companyId = activeBusiness?.id;
    if (!companyId) {
      Alert.alert('Error', 'No active business found. Please select a business first.');
      return;
    }
    
    const productData = {
      name: productName,
      brand,
      brandId: brandId || undefined,
      price: parseFloat(price) || 0,
      salePrice: salePrice.trim() ? parseFloat(salePrice) : undefined,
      category,
      unit,
      stockQuantity: parseInt(stock) || 0,
      // Product picture: first uploaded image URL
      productPicture: productImages.length > 0 ? productImages[0] : undefined,
      // Additional fields
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      taxRate: taxRate.trim() ? parseFloat(taxRate) : undefined,
      supplier: supplier.trim() || undefined,
      is_listed: isListed,
      // Carton pricing
      hasCarton,
      unitsPerCarton: hasCarton && unitsPerCarton.trim() ? parseInt(unitsPerCarton) : undefined,
      pricePerCarton: hasCarton && pricePerCarton.trim() ? parseFloat(pricePerCarton) : undefined,
      // Retail price limit
      hasRetailPriceLimit,
      retailPriceLimit: hasRetailPriceLimit && retailPriceLimit.trim() ? parseFloat(retailPriceLimit) : undefined,
    };

    setIsSaving(true);
    try {
      if (isEditMode) {
        await updateProduct(companyId, editingProduct.id, {
          ...productData,
          status: status as ProductStatus,
        });
      } else {
        await createProduct(companyId, productData);
      }
      navigation.goBack();
    } catch (err: any) {
      const message = err?.message || (isEditMode ? 'Failed to update product' : 'Failed to create product');
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddImage = async (localUri: string) => {
    try {
      const serverUrl = await uploadImage(localUri);
      setProductImages(prev => [...prev, serverUrl]);
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Failed to upload image');
    }
  };

  const handleSelectStatus = (newStatus: ProductStatus) => {
    setStatus(newStatus);
    setShowStatusModal(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]} edges={['top']}>
      <SecondaryHeader
        title={isEditMode ? "Edit Product" : "Create New Product"}
        leftAction={{ icon: 'chevron-left', onPress: () => navigation.goBack() }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: appTheme.colors.text }]}>Product Pictures</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesScrollContainer}
          >
            {productImages.map((uri, index) => (
              <ImagePlaceholder 
                key={`image-${index}`}
                text=""
                onPress={() => {}} 
                imageUri={uri}
                style={styles.productImageItem}
                iconName="camera-outline"
              />
            ))}
            <ImagePlaceholder 
              text="Add picture"
              onPress={handleAddImage}
              imageUri={null}
              style={styles.productImageItem}
              iconName="camera-outline"
            />
          </ScrollView>
        </View>

        <View style={{ marginTop: 16 }}>
          <AppTextField
            label="Product Name"
            value={productName}
            onChangeText={setProductName}
            placeholder="Enter product name"
            containerStyle={styles.textField}
            error={!productName.trim() && productName !== ''}
          />

          <AppTextField
            label="Brand"
            value={brand}
            onChangeText={() => {}}
            placeholder="Select brand"
            isDropdown
            onPress={() => navigation.navigate('BrandSelection', { selectedBrand: brand || undefined })}
            containerStyle={styles.textField}
          />
          
          <AppTextField
            label="Category"
            value={category ? getCategoryLabel(category) : ''}
            onChangeText={() => {}}
            placeholder="Select category"
            isDropdown
            onPress={() => setShowCategoryModal(true)}
            containerStyle={styles.textField}
          />

          <AppTextField
            label="Unit"
            value={unit}
            onChangeText={setUnit}
            placeholder="e.g., 1 pcs, 5 kg bag, 500ml bottle"
            containerStyle={styles.textField}
          />

          <View style={[styles.row, styles.fieldGroup]}>
            <View style={styles.column_first}>
              <AppTextField
                label="Price per Unit"
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                error={price !== '' && parseFloat(price) <= 0}
              />
            </View>
            <View style={styles.column_second}>
              <AppTextField
                label="Sale Price (Optional)"
                value={salePrice}
                onChangeText={setSalePrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Carton Pricing */}
          <View style={[styles.publishSection, styles.fieldGroup]}>
            <Text style={[
              styles.publishLabel,
              { color: hasCarton ? appTheme.colors.success : appTheme.colors.textMuted }
            ]}>
              Sold in cartons
            </Text>
            <Switch
              trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E9E9EA"
              onValueChange={setHasCarton}
              value={hasCarton}
              style={styles.switchControl}
            />
          </View>

          {hasCarton && (
            <View style={[styles.row, styles.fieldGroup]}>
              <View style={styles.column_first}>
                <AppTextField
                  label="Units per Carton"
                  value={unitsPerCarton}
                  onChangeText={setUnitsPerCarton}
                  placeholder="e.g., 12"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column_second}>
                <AppTextField
                  label="Price per Carton"
                  value={pricePerCarton}
                  onChangeText={setPricePerCarton}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}

          {/* Retail Price Limit */}
          <View style={[styles.publishSection, styles.fieldGroup]}>
            <Text style={[
              styles.publishLabel,
              { color: hasRetailPriceLimit ? appTheme.colors.success : appTheme.colors.textMuted }
            ]}>
              Retail price limit
            </Text>
            <Switch
              trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E9E9EA"
              onValueChange={setHasRetailPriceLimit}
              value={hasRetailPriceLimit}
              style={styles.switchControl}
            />
          </View>

          {hasRetailPriceLimit && (
            <AppTextField
              label="Maximum Retail Price"
              value={retailPriceLimit}
              onChangeText={setRetailPriceLimit}
              placeholder="0.00"
              keyboardType="decimal-pad"
              containerStyle={styles.textField}
            />
          )}

          <AppTextField
            label="Stock Quantity"
            value={stock}
            onChangeText={setStock}
            placeholder="0"
            keyboardType="numeric"
            containerStyle={styles.textField}
            error={stock !== '' && parseInt(stock) < 0}
          />

          <AppTextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter product description"
            containerStyle={styles.textField}
            multiline
            numberOfLines={3}
          />

          {/* Additional Product Details Section */}
          <Text style={[styles.sectionTitle, { color: appTheme.colors.text }]}>Additional Details (Optional)</Text>

          <AppTextField
            label="SKU"
            value={sku}
            onChangeText={setSku}
            placeholder="e.g., SKU-12345"
            containerStyle={styles.textField}
          />

          <AppTextField
            label="Barcode"
            value={barcode}
            onChangeText={setBarcode}
            placeholder="e.g., 0123456789012"
            keyboardType="number-pad"
            containerStyle={styles.textField}
          />

          <AppTextField
            label="Tax Rate (%)"
            value={taxRate}
            onChangeText={setTaxRate}
            placeholder="e.g., 15"
            keyboardType="decimal-pad"
            containerStyle={styles.textField}
          />

          <AppTextField
            label="Supplier"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="Enter supplier name"
            containerStyle={styles.textField}
          />
          
          <AppTextField
            label="Status"
            value={status}
            onChangeText={() => {}}
            placeholder="Select status"
            isDropdown
            onPress={() => setShowStatusModal(true)}
            containerStyle={styles.textField}
          />

          <View style={[styles.publishSection, styles.fieldGroup]}>
            <Text style={[
              styles.publishLabel,
              { color: isListed ? appTheme.colors.success : appTheme.colors.textMuted }
            ]}>
              {isListed ? 'Listed' : 'Unlisted'}
            </Text>
            <Switch
              trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E9E9EA"
              onValueChange={handleListedToggle}
              value={isListed}
              style={styles.switchControl}
            />
          </View>
        </View>

        <AppButton 
          title={isSaving ? 'Saving...' : (isEditMode ? "Update Product" : "Save Product")}
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={!isFormValid || isSaving}
        />
      </ScrollView>

      {/* Status Selection Modal */}
      <AppBottomSheet
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Select Status"
      >
        {availableStatuses.map((statusOption, index) => {
          const isSelected = status === statusOption;
          return (
            <ListItemCard
              key={statusOption}
              avatar={{
                type: 'icon',
                icon: '',
                backgroundColor: getStatusColor(statusOption),
              }}
              title={statusOption}
              onPress={() => handleSelectStatus(statusOption)}
              selected={isSelected}
              showCheckmark
              showDivider={index < availableStatuses.length - 1}
            />
          );
        })}
      </AppBottomSheet>

      {/* Category Selection Modal */}
      <AppBottomSheet
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Select Category"
      >
        {BUSINESS_CATEGORIES.map((cat, index) => {
          const isSelected = category === cat.id;
          return (
            <ListItemCard
              key={cat.id}
              avatar={{
                type: 'icon',
                icon: cat.icon,
                iconColor: isSelected ? appTheme.colors.primary : appTheme.colors.text,
                backgroundColor: appTheme.colors.surface,
              }}
              title={cat.label}
              onPress={() => {
                setCategory(cat.id);
                setShowCategoryModal(false);
              }}
              selected={isSelected}
              showCheckmark
              showDivider={index < BUSINESS_CATEGORIES.length - 1}
            />
          );
        })}
      </AppBottomSheet>

      {/* Paywall Modal for Product Limit */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={() => {
          setShowPaywall(false);
          navigation.navigate('SubscriptionPlans' as never);
        }}
        requiredPlan={paywallCheckResult?.requiredPlan || 'pro'}
        modalType={paywallCheckResult?.modalType}
        title={paywallCheckResult?.title}
        description={paywallCheckResult?.description}
        currentLimit={paywallCheckResult?.currentLimit}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  textField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  column_first: {
    flex: 1,
    marginRight: 4,
  },
  column_second: {
    flex: 1,
    marginLeft: 4,
  },
  publishSection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  publishLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: theme.fonts.primary.medium,
  },
  switchControl: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }]
  },
  imagesScrollContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  productImageItem: {
    width: 100,
    height: 100,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default CreateProductScreen;
