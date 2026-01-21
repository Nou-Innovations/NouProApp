export type ProductStatus = 'Available' | 'Out of Stock' | 'Discontinued' | 'In Production' | 'Inactive';

export interface Product {
  id: string;
  name: string;
  brand: string;
  brandLogo?: string;
  productPicture?: string;
  price: number;
  category: string;
  status: ProductStatus;
  variants?: string[];
  unit?: string;
  stockQuantity?: number;
  is_listed?: boolean;
  isCreatedByUser?: boolean;  // For "My Products" view - products created by the user's business
  isImported?: boolean;       // For "Imported" view - products ordered from other businesses
  isDisplayable?: boolean;    // For "Display" view - products visible to other businesses
}

const mockProducts: Product[] = [
  {
    id: 'prd-001', 
    name: 'Product A', 
    brand: 'Brand X', 
    brandLogo: 'https://picsum.photos/seed/BrandX/40/40',
    productPicture: 'https://picsum.photos/seed/prd-001/80/80',
    price: 99.99, 
    category: 'Electronics', 
    status: 'Available',
    variants: ['Black', 'White'],
    unit: '1 pcs',
    stockQuantity: 1500,
    is_listed: true,
    isCreatedByUser: true,
    isDisplayable: true
  },
  {
    id: 'prd-002', 
    name: 'Product B', 
    brand: 'Brand Y', 
    brandLogo: 'https://picsum.photos/seed/BrandY/40/40',
    productPicture: 'https://picsum.photos/seed/prd-002/80/80',
    price: 149.99, 
    category: 'Electronics', 
    status: 'Out of Stock',
    variants: ['Silver'],
    unit: '1 pcs',
    stockQuantity: 0,
    is_listed: true,
    isImported: true
  },
  {
    id: 'prd-003', 
    name: 'Product C', 
    brand: 'Brand Z', 
    brandLogo: 'https://picsum.photos/seed/BrandZ/40/40',
    productPicture: 'https://picsum.photos/seed/prd-003/80/80',
    price: 199.99, 
    category: 'Appliances',
    status: 'Available',
    variants: ['110V', '220V'],
    unit: '1 unit',
    stockQuantity: 550,
    is_listed: false,
    isCreatedByUser: true,
    isDisplayable: false
  },
  {
    id: 'prd-004', 
    name: 'Product D', 
    brand: 'Brand X', 
    brandLogo: 'https://picsum.photos/seed/BrandX/40/40',
    productPicture: 'https://picsum.photos/seed/prd-004/80/80',
    price: 79.99, 
    category: 'Consumables',
    status: 'Available',
    variants: ['1kg', '5kg'],
    unit: '5 kg bag',
    stockQuantity: 25000,
    isImported: true,
    isDisplayable: true
  },
  {
    id: 'prd-005', 
    name: 'Product E', 
    brand: 'Brand Y', 
    brandLogo: 'https://picsum.photos/seed/BrandY/40/40',
    productPicture: 'https://picsum.photos/seed/prd-005/80/80',
    price: 19.99, 
    category: 'Apparel',
    status: 'In Production',
    variants: ['S', 'M', 'L'],
    unit: '1 item',
    stockQuantity: 0,
    is_listed: false,
    isCreatedByUser: true,
  },
  {
    id: 'prd-006', 
    name: 'Gadget Alpha', 
    brand: 'Brand X', 
    brandLogo: 'https://picsum.photos/seed/BrandX/40/40',
    productPicture: 'https://picsum.photos/seed/prd-006/80/80',
    price: 249.50, 
    category: 'Electronics', 
    status: 'Available',
    variants: ['Red', 'Blue'],
    unit: '1 set',
    stockQuantity: 85,
    is_listed: true,
    isDisplayable: true,
  },
  {
    id: 'prd-007', 
    name: 'Widget Pro', 
    brand: 'Brand Omega',
    brandLogo: 'https://picsum.photos/seed/Omega/40/40',
    productPicture: 'https://picsum.photos/seed/prd-007/80/80',
    price: 399.00, 
    category: 'Tools', 
    status: 'Available',
    variants: ['Standard', 'Heavy Duty'],
    unit: '1 pcs',
    stockQuantity: 1200,
    is_listed: true,
    isImported: true,
    isDisplayable: true,
  },
  {
    id: 'prd-008', 
    name: 'Accessory Pack', 
    brand: 'Brand Omega',
    brandLogo: 'https://picsum.photos/seed/Omega/40/40',
    productPicture: 'https://picsum.photos/seed/prd-008/80/80',
    price: 49.95, 
    category: 'Accessories', 
    status: 'Inactive',
    unit: '1 pack',
    stockQuantity: 300,
    is_listed: false,
    isCreatedByUser: true,
  },
  {
    id: 'prd-009', 
    name: 'Component Z', 
    brand: 'Brand Z', 
    brandLogo: 'https://picsum.photos/seed/BrandZ/40/40',
    productPicture: 'https://picsum.photos/seed/prd-009/80/80',
    price: 15.75, 
    category: 'Components',
    status: 'Available',
    unit: '10 pcs box',
    stockQuantity: 10000,
    is_listed: true,
    isImported: true,
    isDisplayable: true,
  },
  {
    id: 'prd-010', name: 'Delta Drink', brand: 'Brand Delta', brandLogo: 'https://picsum.photos/seed/Delta/40/40', productPicture: 'https://picsum.photos/seed/prd-010/80/80', price: 2.99, category: 'Beverages', status: 'Available', unit: '500ml bottle', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-011', name: 'Delta Snack', brand: 'Brand Delta', brandLogo: 'https://picsum.photos/seed/Delta/40/40', productPicture: 'https://picsum.photos/seed/prd-011/80/80', price: 1.49, category: 'Snacks', status: 'Available', unit: '75g pack', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-012', name: 'Delta Cereal', brand: 'Brand Delta', brandLogo: 'https://picsum.photos/seed/Delta/40/40', productPicture: 'https://picsum.photos/seed/prd-012/80/80', price: 4.50, category: 'Breakfast', status: 'Out of Stock', unit: '400g box', stockQuantity: 0, is_listed: true,
  },
  {
    id: 'prd-013', name: 'Sigma Shirt', brand: 'Brand Sigma', brandLogo: 'https://picsum.photos/seed/Sigma/40/40', productPicture: 'https://picsum.photos/seed/prd-013/80/80', price: 29.99, category: 'Apparel', status: 'Available', variants: ['Red', 'Green', 'Blue'], unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-014', name: 'Sigma Trousers', brand: 'Brand Sigma', brandLogo: 'https://picsum.photos/seed/Sigma/40/40', productPicture: 'https://picsum.photos/seed/prd-014/80/80', price: 45.00, category: 'Apparel', status: 'Available', variants: ['30W', '32W', '34W', '36W'], unit: '1 pcs', stockQuantity: 350, is_listed: true,
  },
  {
    id: 'prd-015', name: 'Sigma Jacket', brand: 'Brand Sigma', brandLogo: 'https://picsum.photos/seed/Sigma/40/40', productPicture: 'https://picsum.photos/seed/prd-015/80/80', price: 89.95, category: 'Apparel', status: 'In Production', variants: ['M', 'L', 'XL'], unit: '1 pcs', stockQuantity: 0, is_listed: true,
  },
  {
    id: 'prd-016', name: 'Sigma Cap', brand: 'Brand Sigma', brandLogo: 'https://picsum.photos/seed/Sigma/40/40', productPicture: 'https://picsum.photos/seed/prd-016/80/80', price: 15.00, category: 'Accessories', status: 'Available', unit: '1 pcs', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-017', name: 'Sigma Belt', brand: 'Brand Sigma', brandLogo: 'https://picsum.photos/seed/Sigma/40/40', productPicture: 'https://picsum.photos/seed/prd-017/80/80', price: 22.50, category: 'Accessories', status: 'Available', unit: '1 pcs', stockQuantity: 600, is_listed: false,
  },
  {
    id: 'prd-018', name: 'Gamma Phone', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-018/80/80', price: 699.00, category: 'Electronics', status: 'Available', variants: ['64GB', '128GB'], unit: '1 pcs', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-019', name: 'Gamma Tablet', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-019/80/80', price: 450.00, category: 'Electronics', status: 'Available', variants: ['Wi-Fi', 'LTE'], unit: '1 pcs', stockQuantity: 150, is_listed: true,
  },
  {
    id: 'prd-020', name: 'Gamma Laptop', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-020/80/80', price: 1200.00, category: 'Electronics', status: 'Out of Stock', variants: ['i5', 'i7'], unit: '1 pcs', stockQuantity: 0, is_listed: true,
  },
  {
    id: 'prd-021', name: 'Gamma Charger', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-021/80/80', price: 35.00, category: 'Accessories', status: 'Available', unit: '1 pcs', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-022', name: 'Gamma Case', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-022/80/80', price: 25.00, category: 'Accessories', status: 'Available', variants: ['Clear', 'Black'], unit: '1 pcs', stockQuantity: 800, is_listed: true,
  },
  {
    id: 'prd-023', name: 'Gamma Headphones', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-023/80/80', price: 150.00, category: 'Accessories', status: 'Available', unit: '1 pcs', stockQuantity: 400, is_listed: false,
  },
  {
    id: 'prd-024', name: 'Gamma Speaker', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-024/80/80', price: 99.00, category: 'Electronics', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-025', name: 'Gamma Mouse', brand: 'Brand Gamma', brandLogo: 'https://picsum.photos/seed/Gamma/40/40', productPicture: 'https://picsum.photos/seed/prd-025/80/80', price: 40.00, category: 'Accessories', status: 'Inactive', unit: '1 pcs', stockQuantity: 50, is_listed: false,
  },
  {
    id: 'prd-026', name: 'Epsilon Light Bulb', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-026/80/80', price: 5.99, category: 'Home Goods', status: 'Available', unit: '1 pcs', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-027', name: 'Epsilon Smart Plug', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-027/80/80', price: 19.99, category: 'Electronics', status: 'Available', unit: '1 pcs', stockQuantity: 1500, is_listed: true,
  },
  {
    id: 'prd-028', name: 'Epsilon Air Freshener', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-028/80/80', price: 3.50, category: 'Home Goods', status: 'Available', unit: '250ml can', stockQuantity: 3000, is_listed: false,
  },
  {
    id: 'prd-029', name: 'Epsilon Batteries AA', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-029/80/80', price: 4.99, category: 'Electronics', status: 'Available', unit: '4-pack', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-030', name: 'Epsilon Extension Cord', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-030/80/80', price: 12.95, category: 'Home Goods', status: 'Available', unit: '3m cord', stockQuantity: 800, is_listed: true,
  },
  {
    id: 'prd-031', name: 'Epsilon Desk Lamp', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-031/80/80', price: 34.99, category: 'Home Goods', status: 'Out of Stock', unit: '1 pcs', stockQuantity: 0, is_listed: true,
  },
  {
    id: 'prd-032', name: 'Epsilon Wall Clock', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-032/80/80', price: 22.00, category: 'Home Goods', status: 'Available', unit: '1 pcs', stockQuantity: 450, is_listed: true,
  },
  {
    id: 'prd-033', name: 'Epsilon Coasters', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-033/80/80', price: 8.99, category: 'Home Goods', status: 'Available', unit: 'Set of 6', stockQuantity: 2000, is_listed: false,
  },
  {
    id: 'prd-034', name: 'Epsilon Soap Dispenser', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-034/80/80', price: 14.50, category: 'Bathroom', status: 'Available', unit: '1 pcs', stockQuantity: 600, is_listed: true,
  },
  {
    id: 'prd-035', name: 'Epsilon Bath Mat', brand: 'Brand Epsilon', brandLogo: 'https://picsum.photos/seed/Epsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-035/80/80', price: 18.75, category: 'Bathroom', status: 'Inactive', unit: '1 pcs', stockQuantity: 100, is_listed: false,
  },
  {
    id: 'prd-036', name: 'Kappa Coffee Beans', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-036/80/80', price: 12.99, category: 'Groceries', status: 'Available', unit: '250g bag', stockQuantity: 1500, is_listed: true,
  },
  {
    id: 'prd-037', name: 'Kappa Spice Rack', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-037/80/80', price: 28.50, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-038', name: 'Kappa Tea', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-038/80/80', price: 10.99, category: 'Beverages', status: 'Available', unit: '250g bag', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-039', name: 'Kappa Sugar', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-039/80/80', price: 4.99, category: 'Groceries', status: 'Available', unit: '1kg', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-040', name: 'Kappa Honey', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-040/80/80', price: 12.99, category: 'Groceries', status: 'Available', unit: '250g jar', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-041', name: 'Kappa Bread', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-041/80/80', price: 2.99, category: 'Bakery', status: 'Available', unit: '1 loaf', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-042', name: 'Kappa Cheese', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-042/80/80', price: 8.99, category: 'Dairy', status: 'Available', unit: '200g', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-043', name: 'Kappa Butter', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-043/80/80', price: 5.99, category: 'Dairy', status: 'Available', unit: '200g', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-044', name: 'Kappa Yogurt', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-044/80/80', price: 2.99, category: 'Dairy', status: 'Available', unit: '150g', stockQuantity: 1500, is_listed: true,
  },
  {
    id: 'prd-045', name: 'Kappa Jam', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-045/80/80', price: 6.99, category: 'Groceries', status: 'Available', unit: '250g jar', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-046', name: 'Kappa Apple', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-046/80/80', price: 0.99, category: 'Fruit', status: 'Available', unit: '1 piece', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-047', name: 'Kappa Banana', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-047/80/80', price: 0.49, category: 'Fruit', status: 'Available', unit: '1 piece', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-048', name: 'Kappa Orange', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-048/80/80', price: 0.79, category: 'Fruit', status: 'Available', unit: '1 piece', stockQuantity: 800, is_listed: true,
  },
  {
    id: 'prd-049', name: 'Kappa Mango', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-049/80/80', price: 1.99, category: 'Fruit', status: 'Available', unit: '1 piece', stockQuantity: 600, is_listed: true,
  },
  {
    id: 'prd-050', name: 'Kappa Spice Rack', brand: 'Brand Kappa', brandLogo: 'https://picsum.photos/seed/Kappa/40/40', productPicture: 'https://picsum.photos/seed/prd-050/80/80', price: 28.50, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-051', name: 'Lambda Protein Bar', brand: 'Brand Lambda', brandLogo: 'https://picsum.photos/seed/Lambda/40/40', productPicture: 'https://picsum.photos/seed/prd-051/80/80', price: 2.50, category: 'Health Foods', status: 'Available', unit: '50g bar', stockQuantity: 8000, is_listed: true,
  },
  {
    id: 'prd-052', name: 'Lambda Water Bottle', brand: 'Brand Lambda', brandLogo: 'https://picsum.photos/seed/Lambda/40/40', productPicture: 'https://picsum.photos/seed/prd-052/80/80', price: 18.00, category: 'Fitness Gear', status: 'Available', unit: '750ml', stockQuantity: 1200, is_listed: true,
  },
  {
    id: 'prd-053', name: 'Lambda Protein Powder', brand: 'Brand Lambda', brandLogo: 'https://picsum.photos/seed/Lambda/40/40', productPicture: 'https://picsum.photos/seed/prd-053/80/80', price: 12.99, category: 'Health Foods', status: 'Available', unit: '400g', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-054', name: 'Lambda Whey Protein', brand: 'Brand Lambda', brandLogo: 'https://picsum.photos/seed/Lambda/40/40', productPicture: 'https://picsum.photos/seed/prd-054/80/80', price: 19.99, category: 'Health Foods', status: 'Available', unit: '500g', stockQuantity: 3000, is_listed: true,
  },
  {
    id: 'prd-055', name: 'Lambda Protein Bar', brand: 'Brand Lambda', brandLogo: 'https://picsum.photos/seed/Lambda/40/40', productPicture: 'https://picsum.photos/seed/prd-055/80/80', price: 2.50, category: 'Health Foods', status: 'Available', unit: '50g bar', stockQuantity: 8000, is_listed: true,
  },
  {
    id: 'prd-056', name: 'Lambda Water Bottle', brand: 'Brand Lambda', brandLogo: 'https://picsum.photos/seed/Lambda/40/40', productPicture: 'https://picsum.photos/seed/prd-056/80/80', price: 18.00, category: 'Fitness Gear', status: 'Available', unit: '750ml', stockQuantity: 1200, is_listed: true,
  },
  {
    id: 'prd-057', name: 'Nu Notebook', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-057/80/80', price: 4.99, category: 'Stationery', status: 'Available', unit: 'A5 Lined', stockQuantity: 4000, is_listed: true,
  },
  {
    id: 'prd-058', name: 'Nu Pen', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-058/80/80', price: 1.99, category: 'Stationery', status: 'Available', unit: '1 pcs', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-059', name: 'Nu Highlighter', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-059/80/80', price: 2.99, category: 'Stationery', status: 'Available', unit: '1 pcs', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-060', name: 'Nu Sticky Notes', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-060/80/80', price: 3.99, category: 'Stationery', status: 'Available', unit: '100 sheets', stockQuantity: 20000, is_listed: true,
  },
  {
    id: 'prd-061', name: 'Nu Desk Organizer', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-061/80/80', price: 29.95, category: 'Office Supplies', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-062', name: 'Nu File Folder', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-062/80/80', price: 4.99, category: 'Office Supplies', status: 'Available', unit: '100 sheets', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-063', name: 'Nu Stapler', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-063/80/80', price: 7.99, category: 'Office Supplies', status: 'Available', unit: '1 pcs', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-064', name: 'Nu Paper Clip', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-064/80/80', price: 1.99, category: 'Office Supplies', status: 'Available', unit: '100 pieces', stockQuantity: 50000, is_listed: true,
  },
  {
    id: 'prd-065', name: 'Nu Pen', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-065/80/80', price: 1.99, category: 'Stationery', status: 'Available', unit: '1 pcs', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-066', name: 'Nu Highlighter', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-066/80/80', price: 2.99, category: 'Stationery', status: 'Available', unit: '1 pcs', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-067', name: 'Nu Sticky Notes', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-067/80/80', price: 3.99, category: 'Stationery', status: 'Available', unit: '100 sheets', stockQuantity: 20000, is_listed: true,
  },
  {
    id: 'prd-068', name: 'Nu Desk Organizer', brand: 'Brand Nu', brandLogo: 'https://picsum.photos/seed/Nu/40/40', productPicture: 'https://picsum.photos/seed/prd-068/80/80', price: 29.95, category: 'Office Supplies', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-069', name: 'Pi Baking Flour', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-069/80/80', price: 3.20, category: 'Baking Supplies', status: 'Available', unit: '1kg bag', stockQuantity: 6000, is_listed: true,
  },
  {
    id: 'prd-070', name: 'Pi Cake Mix', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-070/80/80', price: 4.99, category: 'Baking Supplies', status: 'Available', unit: '1kg', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-071', name: 'Pi Butter', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-071/80/80', price: 5.99, category: 'Dairy', status: 'Available', unit: '200g', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-072', name: 'Pi Sugar', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-072/80/80', price: 4.99, category: 'Groceries', status: 'Available', unit: '1kg', stockQuantity: 20000, is_listed: true,
  },
  {
    id: 'prd-073', name: 'Pi Chocolate', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-073/80/80', price: 7.99, category: 'Bakery', status: 'Available', unit: '100g', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-074', name: 'Pi Baking Powder', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-074/80/80', price: 3.99, category: 'Baking Supplies', status: 'Available', unit: '100g', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-075', name: 'Pi Cake Stand', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-075/80/80', price: 35.50, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 250, is_listed: false,
  },
  {
    id: 'prd-076', name: 'Pi Pie Pan', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-076/80/80', price: 19.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-077', name: 'Pi Muffin Pan', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-077/80/80', price: 14.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-078', name: 'Pi Pie Crust', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-078/80/80', price: 7.99, category: 'Baking Supplies', status: 'Available', unit: '1 pack', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-079', name: 'Pi Cake Topper', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-079/80/80', price: 9.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-080', name: 'Pi Cake Knife', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-080/80/80', price: 12.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-081', name: 'Pi Cake Server', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-081/80/80', price: 15.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 100, is_listed: true,
  },
  {
    id: 'prd-082', name: 'Pi Cake Tray', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-082/80/80', price: 12.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-083', name: 'Pi Cake Board', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-083/80/80', price: 14.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-084', name: 'Pi Cake Plate', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-084/80/80', price: 12.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 400, is_listed: true,
  },
  {
    id: 'prd-085', name: 'Pi Cake Form', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-085/80/80', price: 14.99, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-086', name: 'Pi Cake Stand', brand: 'Brand Pi', brandLogo: 'https://picsum.photos/seed/Pi/40/40', productPicture: 'https://picsum.photos/seed/prd-086/80/80', price: 35.50, category: 'Kitchenware', status: 'Available', unit: '1 pcs', stockQuantity: 250, is_listed: false,
  },
  {
    id: 'prd-087', name: 'Rho Running Shoes', brand: 'Brand Rho', brandLogo: 'https://picsum.photos/seed/Rho/40/40', productPicture: 'https://picsum.photos/seed/prd-087/80/80', price: 110.00, category: 'Footwear', status: 'Available', variants: ['US 8', 'US 9', 'US 10'], unit: '1 pair', stockQuantity: 400, is_listed: true,
  },
  {
    id: 'prd-088', name: 'Rho Sports Socks', brand: 'Brand Rho', brandLogo: 'https://picsum.photos/seed/Rho/40/40', productPicture: 'https://picsum.photos/seed/prd-088/80/80', price: 12.00, category: 'Apparel', status: 'Available', unit: '3-pack', stockQuantity: 1500, is_listed: true,
  },
  {
    id: 'prd-089', name: 'Rho Sports Bra', brand: 'Brand Rho', brandLogo: 'https://picsum.photos/seed/Rho/40/40', productPicture: 'https://picsum.photos/seed/prd-089/80/80', price: 24.99, category: 'Apparel', status: 'Available', unit: '1 pcs', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-090', name: 'Rho Shorts', brand: 'Brand Rho', brandLogo: 'https://picsum.photos/seed/Rho/40/40', productPicture: 'https://picsum.photos/seed/prd-090/80/80', price: 39.99, category: 'Apparel', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-091', name: 'Rho Sports Socks', brand: 'Brand Rho', brandLogo: 'https://picsum.photos/seed/Rho/40/40', productPicture: 'https://picsum.photos/seed/prd-091/80/80', price: 12.00, category: 'Apparel', status: 'Available', unit: '3-pack', stockQuantity: 1500, is_listed: true,
  },
  {
    id: 'prd-092', name: 'Tau Smartphone Case', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-092/80/80', price: 19.99, category: 'Accessories', status: 'Available', variants:['iPhone 14', 'Galaxy S23'], unit: '1 pcs', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-093', name: 'Tau Power Bank', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-093/80/80', price: 45.00, category: 'Electronics', status: 'Available', unit: '10000mAh', stockQuantity: 700, is_listed: true,
  },
  {
    id: 'prd-094', name: 'Tau Wireless Charger', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-094/80/80', price: 29.99, category: 'Electronics', status: 'Available', unit: '15W', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-095', name: 'Tau USB-C Cable', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-095/80/80', price: 9.99, category: 'Accessories', status: 'Available', unit: '1m', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-096', name: 'Tau Bluetooth Earbuds', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-096/80/80', price: 49.99, category: 'Electronics', status: 'Available', unit: '1 pcs', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-097', name: 'Tau Wireless Earbuds', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-097/80/80', price: 39.99, category: 'Electronics', status: 'Available', unit: '1 pcs', stockQuantity: 800, is_listed: true,
  },
  {
    id: 'prd-098', name: 'Tau Power Bank', brand: 'Brand Tau', brandLogo: 'https://picsum.photos/seed/Tau/40/40', productPicture: 'https://picsum.photos/seed/prd-098/80/80', price: 45.00, category: 'Electronics', status: 'Available', unit: '10000mAh', stockQuantity: 700, is_listed: true,
  },
  {
    id: 'prd-099', name: 'Upsilon Board Game', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-099/80/80', price: 39.99, category: 'Toys & Games', status: 'Available', unit: '1 box', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-100', name: 'Upsilon Puzzle Mat', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-100/80/80', price: 24.95, category: 'Toys & Games', status: 'Available', unit: '1 pcs', stockQuantity: 400, is_listed: true,
  },
  {
    id: 'prd-101', name: 'Upsilon Building Blocks', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-101/80/80', price: 19.99, category: 'Toys & Games', status: 'Available', unit: '1 set', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-102', name: 'Upsilon Puzzle', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-102/80/80', price: 14.99, category: 'Toys & Games', status: 'Available', unit: '1 pcs', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-103', name: 'Upsilon Action Figure', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-103/80/80', price: 12.99, category: 'Toys & Games', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-104', name: 'Upsilon Playset', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-104/80/80', price: 29.99, category: 'Toys & Games', status: 'Available', unit: '1 set', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-105', name: 'Upsilon Playset', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-105/80/80', price: 29.99, category: 'Toys & Games', status: 'Available', unit: '1 set', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-106', name: 'Upsilon Playset', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-106/80/80', price: 29.99, category: 'Toys & Games', status: 'Available', unit: '1 set', stockQuantity: 200, is_listed: true,
  },
  {
    id: 'prd-107', name: 'Upsilon Puzzle Mat', brand: 'Brand Upsilon', brandLogo: 'https://picsum.photos/seed/Upsilon/40/40', productPicture: 'https://picsum.photos/seed/prd-107/80/80', price: 24.95, category: 'Toys & Games', status: 'Available', unit: '1 pcs', stockQuantity: 400, is_listed: true,
  },
  {
    id: 'prd-108', name: 'Phi Hand Soap', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-108/80/80', price: 4.50, category: 'Toiletries', status: 'Available', unit: '300ml', stockQuantity: 3000, is_listed: true,
  },
  {
    id: 'prd-109', name: 'Phi Toothbrush', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-109/80/80', price: 7.99, category: 'Personal Care', status: 'Available', unit: '1 pcs', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-110', name: 'Phi Toothpaste', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-110/80/80', price: 3.99, category: 'Personal Care', status: 'Available', unit: '100g', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-111', name: 'Phi Shampoo', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-111/80/80', price: 12.99, category: 'Personal Care', status: 'Available', unit: '500ml', stockQuantity: 3000, is_listed: true,
  },
  {
    id: 'prd-112', name: 'Phi Conditioner', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-112/80/80', price: 12.99, category: 'Personal Care', status: 'Available', unit: '500ml', stockQuantity: 3000, is_listed: true,
  },
  {
    id: 'prd-113', name: 'Phi Body Wash', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-113/80/80', price: 8.99, category: 'Personal Care', status: 'Available', unit: '500ml', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-114', name: 'Phi Soap', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-114/80/80', price: 2.99, category: 'Personal Care', status: 'Available', unit: '200g', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-115', name: 'Phi Face Wash', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-115/80/80', price: 12.99, category: 'Personal Care', status: 'Available', unit: '200ml', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-116', name: 'Phi Face Cream', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-116/80/80', price: 14.99, category: 'Personal Care', status: 'Available', unit: '50ml', stockQuantity: 3000, is_listed: true,
  },
  {
    id: 'prd-117', name: 'Phi Eye Cream', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-117/80/80', price: 19.99, category: 'Personal Care', status: 'Available', unit: '15ml', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-118', name: 'Phi Lip Balm', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-118/80/80', price: 3.99, category: 'Personal Care', status: 'Available', unit: '15ml', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-119', name: 'Phi Travel Kit', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-119/80/80', price: 18.99, category: 'Travel', status: 'Available', unit: '1 kit', stockQuantity: 600, is_listed: true,
  },
  {
    id: 'prd-120', name: 'Phi First Aid Kit', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-120/80/80', price: 14.99, category: 'Travel', status: 'Available', unit: '1 kit', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-121', name: 'Phi Travel Kit', brand: 'Brand Phi', brandLogo: 'https://picsum.photos/seed/Phi/40/40', productPicture: 'https://picsum.photos/seed/prd-121/80/80', price: 18.99, category: 'Travel', status: 'Available', unit: '1 kit', stockQuantity: 600, is_listed: true,
  },
  {
    id: 'prd-122', name: 'Chi Dog Food', brand: 'Brand Chi', brandLogo: 'https://picsum.photos/seed/Chi/40/40', productPicture: 'https://picsum.photos/seed/prd-122/80/80', price: 25.00, category: 'Pet Supplies', status: 'Available', unit: '3kg bag', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-123', name: 'Chi Cat Food', brand: 'Brand Chi', brandLogo: 'https://picsum.photos/seed/Chi/40/40', productPicture: 'https://picsum.photos/seed/prd-123/80/80', price: 15.00, category: 'Pet Supplies', status: 'Available', unit: '1kg', stockQuantity: 5000, is_listed: true,
  },
  {
    id: 'prd-124', name: 'Chi Cat Litter', brand: 'Brand Chi', brandLogo: 'https://picsum.photos/seed/Chi/40/40', productPicture: 'https://picsum.photos/seed/prd-124/80/80', price: 5.99, category: 'Pet Supplies', status: 'Available', unit: '400g', stockQuantity: 10000, is_listed: true,
  },
  {
    id: 'prd-125', name: 'Chi Cat Tree', brand: 'Brand Chi', brandLogo: 'https://picsum.photos/seed/Chi/40/40', productPicture: 'https://picsum.photos/seed/prd-125/80/80', price: 75.00, category: 'Pet Supplies', status: 'Available', unit: '1 pcs', stockQuantity: 150, is_listed: true,
  },
  {
    id: 'prd-126', name: 'Psi Garden Hose', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-126/80/80', price: 32.00, category: 'Gardening', status: 'Available', unit: '15m', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-127', name: 'Psi Plant Pot Set', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-127/80/80', price: 28.50, category: 'Gardening', status: 'Available', unit: 'Set of 3', stockQuantity: 400, is_listed: true,
  },
  {
    id: 'prd-128', name: 'Psi Soil', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-128/80/80', price: 5.99, category: 'Gardening', status: 'Available', unit: '1kg', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-129', name: 'Psi Fertilizer', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-129/80/80', price: 7.99, category: 'Gardening', status: 'Available', unit: '1kg', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-130', name: 'Psi Pruning Shears', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-130/80/80', price: 19.99, category: 'Gardening', status: 'Available', unit: '1 pcs', stockQuantity: 500, is_listed: true,
  },
  {
    id: 'prd-131', name: 'Psi Watering Can', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-131/80/80', price: 14.99, category: 'Gardening', status: 'Available', unit: '1.5L', stockQuantity: 800, is_listed: true,
  },
  {
    id: 'prd-132', name: 'Psi Plant Stand', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-132/80/80', price: 24.99, category: 'Gardening', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-133', name: 'Psi Plant Pot', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-133/80/80', price: 4.99, category: 'Gardening', status: 'Available', unit: '1 pcs', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-134', name: 'Psi Plant Soil', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-134/80/80', price: 5.99, category: 'Gardening', status: 'Available', unit: '1kg', stockQuantity: 2000, is_listed: true,
  },
  {
    id: 'prd-135', name: 'Psi Plant Food', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-135/80/80', price: 6.99, category: 'Gardening', status: 'Available', unit: '1kg', stockQuantity: 1000, is_listed: true,
  },
  {
    id: 'prd-136', name: 'Psi Plant Pot Set', brand: 'Brand Psi', brandLogo: 'https://picsum.photos/seed/Psi/40/40', productPicture: 'https://picsum.photos/seed/prd-136/80/80', price: 28.50, category: 'Gardening', status: 'Available', unit: 'Set of 3', stockQuantity: 400, is_listed: true,
  },
  {
    id: 'prd-137', name: 'Zeta Blender', brand: 'Brand Z', brandLogo: 'https://picsum.photos/seed/BrandZ/40/40', productPicture: 'https://picsum.photos/seed/prd-137/80/80', price: 89.99, category: 'Appliances', status: 'Available', unit: '1 pcs', stockQuantity: 300, is_listed: true,
  },
  {
    id: 'prd-138', name: 'Zeta Toaster', brand: 'Brand Z', brandLogo: 'https://picsum.photos/seed/BrandZ/40/40', productPicture: 'https://picsum.photos/seed/prd-138/80/80', price: 45.00, category: 'Appliances', status: 'Available', unit: '1 pcs', stockQuantity: 450, is_listed: true,
  },
  {
    id: 'prd-139', name: 'Zeta Kettle', brand: 'Brand Z', brandLogo: 'https://picsum.photos/seed/BrandZ/40/40', productPicture: 'https://picsum.photos/seed/prd-139/80/80', price: 38.50, category: 'Appliances', status: 'Available', unit: '1.7L', stockQuantity: 600, is_listed: false,
  },
  {
    id: 'prd-140', name: 'Zeta Mixer', brand: 'Brand Z', brandLogo: 'https://picsum.photos/seed/BrandZ/40/40', productPicture: 'https://picsum.photos/seed/prd-140/80/80', price: 150.00, category: 'Appliances', status: 'Out of Stock', unit: '1 pcs', stockQuantity: 0, is_listed: true,
  },
];

export default mockProducts; 