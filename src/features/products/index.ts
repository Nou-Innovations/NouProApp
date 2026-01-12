/**
 * Products Feature Module
 * 
 * Exports for screens, components, hooks, and services.
 */

// Screens
export * from './screens';

// Components
export * from './components';

// Hooks
export { useProducts, type DisplayBrand } from './hooks/useProducts';// Service
export { 
  default as productsService,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  updateProductStock,
  toggleProductDisplayable,
  toggleProductListed,
} from './products.service';

// Types are exported from @/shared/types/product
