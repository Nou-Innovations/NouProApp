import { useAppStore } from '../store';
import { Product, ProductVariant } from '@/shared/types/store';
import { get, post, patch, del } from '@/shared/services/api';

class ProductService {
  private store = useAppStore;

  async fetchProducts(locationId: string) {
    try {
      const products = await get<Product[]>('/products', { locationId });
      this.store.getState().setProducts(products);
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async createProduct(product: Omit<Product, 'id'>) {
    try {
      const newProduct = await post<Product>('/products', product);
      
      const store = this.store.getState();
      store.setProducts([...store.products, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>) {
    try {
      const updatedProduct = await patch<Product>(`/products/${productId}`, updates);
      
      this.store.getState().updateProduct(productId, updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string) {
    try {
      await del(`/products/${productId}`);
      
      const store = this.store.getState();
      store.setProducts(store.products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async updateStock(productId: string, variantId: string, quantity: number) {
    try {
      const updatedProduct = await patch<Product>(`/products/${productId}/stock`, {
        variantId,
        quantity,
      });
      
      this.store.getState().updateProduct(productId, updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  getLowStockProducts() {
    const store = this.store.getState();
    return store.products.filter(
      product => product.stockQuantity <= product.minStockAlert
    );
  }

  getProductsByCategory(category: string) {
    const store = this.store.getState();
    return store.products.filter(product => product.category === category);
  }
}

export const productService = new ProductService(); 