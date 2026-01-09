/**
 * useProducts Hook
 * 
 * ARCHITECTURE: React hook that connects ProductsScreen to product data.
 * 
 * Features:
 * - Fetches products for current company
 * - Client-side filtering by status, view type, search
 * - Pull-to-refresh
 * - Product updates (status, stock, etc.)
 * - Fallback to mock data if API fails
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UIProduct, 
  UIProductStatus, 
  ProductViewType,
  UpdateUIProductData,
} from '@/shared/types/product';
import { getProducts, updateProduct, updateProductStatus, updateProductStock, toggleProductDisplayable, toggleProductListed } from '../products.service';
import { ApiError } from '@/shared/services/api';
import { useProfileStore } from '@/shared/store/profileStore';
import mockProducts, { Product as MockProduct } from '@/shared/data/mockProducts';

// ============================================================================
// Brand Processing (from ProductsScreen)
// ============================================================================

export interface DisplayBrand {
  name: string;
  logo?: string;
  productCount: number;
  products: UIProduct[];
  originalProducts?: UIProduct[];
}

const processProductsToBrands = (products: UIProduct[], currentView: ProductViewType): DisplayBrand[] => {
  const brandsMap = new Map<string, { logo?: string; products: UIProduct[]; originalProducts: UIProduct[] }>();
  
  products.forEach(product => {
    if (!brandsMap.has(product.brand)) {
      brandsMap.set(product.brand, { logo: product.brandLogo, products: [], originalProducts: [] });
    }
    const brandEntry = brandsMap.get(product.brand)!;
    brandEntry.originalProducts.push(product);

    // Apply view-specific filtering 
    if (currentView === 'All Products') {
      brandEntry.products.push(product);
    } else if (currentView === 'My Products') {
      if (product.isCreatedByUser) {
        brandEntry.products.push(product);
      }
    } else if (currentView === 'Imported') {
      if (product.isImported) {
        brandEntry.products.push(product);
      }
    } else if (currentView === 'Display') {
      if (product.isDisplayable) {
        brandEntry.products.push(product);
      }
    }
  });

  return Array.from(brandsMap.entries())
    .map(([name, data]) => ({
      name,
      logo: data.logo,
      productCount: data.products.length,
      products: data.products,
      originalProducts: data.originalProducts,
    }))
    .filter(brand => brand.productCount > 0);
};

// ============================================================================
// Hook
// ============================================================================

interface UseProductsOptions {
  autoFetch?: boolean;
  locationId?: string;
}

interface UseProductsResult {
  /** All products from API */
  products: UIProduct[];
  /** Products grouped by brand (for accordion view) */
  brands: DisplayBrand[];
  /** Filtered brands based on current filters */
  filteredBrands: DisplayBrand[];
  /** Loading state */
  loading: boolean;
  /** Refreshing state (pull-to-refresh) */
  refreshing: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data came from mock (fallback) */
  isMockData: boolean;
  /** Current status filter */
  statusFilter: UIProductStatus | 'All';
  /** Current view type */
  viewType: ProductViewType;
  /** Current search query */
  search: string;
  /** Currently expanded brand name */
  expandedBrand: string | null;
  /** Set the status filter */
  setStatusFilter: (status: UIProductStatus | 'All') => void;
  /** Set the view type */
  setViewType: (type: ProductViewType) => void;
  /** Set the search query */
  setSearch: (search: string) => void;
  /** Set the expanded brand */
  setExpandedBrand: (brand: string | null) => void;
  /** Toggle a brand expansion */
  toggleBrand: (brandName: string) => void;
  /** Refresh products */
  refresh: () => Promise<void>;
  /** Update a product locally */
  updateProductLocal: (productId: string, updates: Partial<UIProduct>) => void;
  /** Update a product on server */
  updateProductServer: (productId: string, data: UpdateUIProductData) => Promise<void>;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const { autoFetch = true, locationId: initialLocationId } = options;
  
  // Use canonical source: useProfileStore.activeBusiness
  const activeBusiness = useProfileStore((state) => state.activeBusiness);
  const companyId = activeBusiness?.id || 'comp-1';
  
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<UIProductStatus | 'All'>('All');
  const [viewType, setViewType] = useState<ProductViewType>('All Products');
  const [search, setSearch] = useState('');
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  
  // Fetch products
  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const result = await getProducts({ companyId });
      setProducts(result);
      setIsMockData(false);
      
      if (__DEV__) {
        console.log(`[useProducts] Loaded ${result.length} products from API`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load products';
      setError(message);
      
      // Fallback to mock data
      if (__DEV__) {
        console.warn('[useProducts] API failed, using mock data:', message);
      }
      
      // Convert mock products to UIProduct format
      const mockData = mockProducts.map(p => ({
        ...p,
        companyId: 'comp-1',
      })) as UIProduct[];
      setProducts(mockData);
      setIsMockData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);
  
  // All brands (processed from products)
  const brands = useMemo(() => {
    return processProductsToBrands(products, viewType);
  }, [products, viewType]);
  
  // Filtered brands based on status and search
  const filteredBrands = useMemo(() => {
    return brands.filter(brand => {
      // Search match on brand name
      const searchMatch = brand.name.toLowerCase().includes(search.toLowerCase());
      
      // Status filter - check if any product matches
      if (statusFilter !== 'All') {
        const hasMatchingProduct = brand.products.some(
          p => p.status.toLowerCase() === statusFilter.toLowerCase()
        );
        if (!hasMatchingProduct) return false;
      }
      
      return searchMatch;
    });
  }, [brands, search, statusFilter]);
  
  // Toggle brand expansion
  const toggleBrand = useCallback((brandName: string) => {
    setExpandedBrand(prev => (prev === brandName ? null : brandName));
  }, []);
  
  // Update product locally (for optimistic updates)
  const updateProductLocal = useCallback((productId: string, updates: Partial<UIProduct>) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, ...updates } : p
    ));
  }, []);
  
  // Update product on server
  const updateProductServer = useCallback(async (productId: string, data: UpdateUIProductData) => {
    if (isMockData) {
      // Just update locally for mock data
      updateProductLocal(productId, data);
      return;
    }
    
    try {
      const updated = await updateProduct(companyId, productId, data);
      updateProductLocal(productId, updated);
    } catch (err) {
      if (__DEV__) {
        console.error('[useProducts] Failed to update product:', err);
      }
      throw err;
    }
  }, [companyId, isMockData, updateProductLocal]);
  
  // Refresh function
  const refresh = useCallback(() => fetchProducts(true), [fetchProducts]);
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchProducts();
    }
  }, [autoFetch, fetchProducts]);
  
  return {
    products,
    brands,
    filteredBrands,
    loading,
    refreshing,
    error,
    isMockData,
    statusFilter,
    viewType,
    search,
    expandedBrand,
    setStatusFilter,
    setViewType,
    setSearch,
    setExpandedBrand,
    toggleBrand,
    refresh,
    updateProductLocal,
    updateProductServer,
  };
}

export default useProducts;




