import { useStore } from '../store';
import { Product, ProductVariant } from '../types/store';

class ProductService {
  private store = useStore;

  async fetchProducts(locationId: string) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/products?locationId=${locationId}`);
      const products: Product[] = await response.json();
      this.store.getState().setProducts(products);
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async createProduct(product: Omit<Product, 'id'>) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      const newProduct: Product = await response.json();
      
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
      // TODO: Replace with actual API call
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const updatedProduct: Product = await response.json();
      
      this.store.getState().updateProduct(productId, updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string) {
    try {
      // TODO: Replace with actual API call
      await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      
      const store = this.store.getState();
      store.setProducts(store.products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async updateStock(productId: string, variantId: string, quantity: number) {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variantId, quantity }),
      });
      const updatedProduct: Product = await response.json();
      
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