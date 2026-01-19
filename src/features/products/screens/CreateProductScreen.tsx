import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';
import { SecondaryHeader } from '@/shared/components/layout/headers';
import AppButton from '@/shared/components/ui/AppButton';
import AppTextField from '@/shared/components/ui/AppTextField';
import { ProductStatus } from '@/shared/data/mockProducts';
import ImagePlaceholder from '@/shared/components/ui/ImagePlaceholder';
import { useTheme } from '@/shared/theme/ThemeProvider';
import AppBottomSheet from '@/shared/components/ui/AppBottomSheet';
import ListItemCard from '@/shared/components/ui/ListItemCard';
import theme from '@/shared/theme';

const availableStatuses: ProductStatus[] = ['Available', 'Out of Stock', 'In Production', 'Inactive', 'Discontinued'];

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProduct'>;

const CreateProductScreen: React.FC<Props> = ({ navigation, route }) => {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState(route.params?.selectedBrand || '');
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
  const { theme: appTheme } = useTheme();

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
  }, [route.params?.selectedBrand]);

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

  const handleSave = () => {
    const productData = {
      name: productName,
      brand,
      price: parseFloat(price) || 0,
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      description: description.trim() || undefined,
      category,
      status,
      unit,
      stockQuantity: parseInt(stock) || 0,
      // Additional owner detail fields
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      taxRate: taxRate.trim() ? parseFloat(taxRate) : undefined,
      supplier: supplier.trim() || undefined,
      is_listed: isListed,
      images: productImages,
    };
    console.log(isEditMode ? 'Updating Product:' : 'Creating Product:', productData);
    navigation.goBack();
  };

  const handleAddImage = (imageUri: string) => {
    setProductImages(prev => [...prev, imageUri]);
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
            value={category}
            onChangeText={setCategory}
            placeholder="e.g., Electronics, Apparel"
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
                label="Price"
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
              {isListed ? 'Public' : 'Private'}
            </Text>
            <Switch
              trackColor={{ false: '#E9E9EA', true: '#2ACF01' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E9E9EA"
              onValueChange={setIsListed}
              value={isListed}
              style={styles.switchControl}
            />
          </View>
        </View>

        <AppButton 
          title={isEditMode ? "Update Product" : "Save Product"}
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={!isFormValid}
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
