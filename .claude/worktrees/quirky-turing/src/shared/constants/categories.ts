/**
 * Predefined business/product categories for the NouPro platform.
 * Shared across company profiles and products.
 */

export interface BusinessCategory {
  id: string;
  label: string;
  icon: string; // Ionicons icon name
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: 'food_beverage', label: 'Food & Beverage', icon: 'fast-food-outline' },
  { id: 'health_beauty', label: 'Health & Beauty', icon: 'heart-outline' },
  { id: 'electronics', label: 'Electronics', icon: 'phone-portrait-outline' },
  { id: 'fashion_apparel', label: 'Fashion & Apparel', icon: 'shirt-outline' },
  { id: 'home_garden', label: 'Home & Garden', icon: 'home-outline' },
  { id: 'office_supplies', label: 'Office Supplies', icon: 'briefcase-outline' },
  { id: 'cleaning_hygiene', label: 'Cleaning & Hygiene', icon: 'water-outline' },
  { id: 'construction_hardware', label: 'Construction & Hardware', icon: 'construct-outline' },
  { id: 'automotive', label: 'Automotive', icon: 'car-outline' },
  { id: 'agriculture', label: 'Agriculture', icon: 'leaf-outline' },
  { id: 'packaging', label: 'Packaging', icon: 'cube-outline' },
  { id: 'sports_leisure', label: 'Sports & Leisure', icon: 'football-outline' },
  { id: 'baby_kids', label: 'Baby & Kids', icon: 'happy-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

/** Get the display label for a category ID */
export const getCategoryLabel = (id: string): string => {
  return BUSINESS_CATEGORIES.find(c => c.id === id)?.label || id;
};

/** Get the full category object by ID */
export const getCategoryById = (id: string): BusinessCategory | undefined => {
  return BUSINESS_CATEGORIES.find(c => c.id === id);
};
