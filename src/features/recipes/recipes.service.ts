/**
 * Recipes Service
 *
 * A Recipe is a bill-of-materials attached to a finished product: ingredient
 * products with quantities → ingredient cost & margin (computed server-side).
 * Company-scoped: /api/companies/:companyId/recipes. Free plan capped at 3
 * (enforced backend-side; previewed client-side via maxRecipesForPlan).
 */
import { get, post, patch, del } from '@/shared/services/api';

export interface RecipeIngredient {
  id: string;
  productId: string;
  name: string;
  unit?: string | null;
  quantity: number;
  costPrice?: number | null;
  lineCost: number;
  hasCost: boolean;
}

export interface RecipeCost {
  batchCost: number;
  batchSize: number;
  costPerUnit: number;
  sellPrice: number;
  marginPerUnit: number;
  marginPct: number | null;
  missingCost: boolean;
}

export interface RecipeProduct {
  id: string;
  name: string;
  price?: number | null;
  costPrice?: number | null;
  productPicture?: string | null;
  unit?: string | null;
}

export interface Recipe {
  id: string;
  businessId: string;
  productId: string;
  name: string;
  batchSize: number;
  yieldUnit?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: RecipeProduct | null;
  ingredients: RecipeIngredient[];
  cost: RecipeCost;
}

export interface CreateRecipeData {
  productId: string;
  name?: string;
  batchSize?: number;
  yieldUnit?: string;
  notes?: string;
}

export interface UpdateRecipeData {
  name?: string;
  batchSize?: number;
  yieldUnit?: string | null;
  notes?: string | null;
}

export interface NewIngredient { productId: string; quantity: number; unit?: string | null; }

export async function getRecipes(companyId: string): Promise<Recipe[]> {
  return get<Recipe[]>(`/companies/${companyId}/recipes`);
}

export async function getRecipe(companyId: string, recipeId: string): Promise<Recipe> {
  return get<Recipe>(`/companies/${companyId}/recipes/${recipeId}`);
}

export async function createRecipe(companyId: string, data: CreateRecipeData): Promise<Recipe> {
  return post<Recipe>(`/companies/${companyId}/recipes`, data);
}

export async function updateRecipe(companyId: string, recipeId: string, data: UpdateRecipeData): Promise<Recipe> {
  return patch<Recipe>(`/companies/${companyId}/recipes/${recipeId}`, data);
}

export async function deleteRecipe(companyId: string, recipeId: string): Promise<void> {
  return del(`/companies/${companyId}/recipes/${recipeId}`);
}

/** Add ingredients; returns the refreshed recipe (with recomputed cost). */
export async function addIngredients(companyId: string, recipeId: string, ingredients: NewIngredient[]): Promise<Recipe> {
  return post<Recipe>(`/companies/${companyId}/recipes/${recipeId}/ingredients`, { ingredients });
}

export async function updateIngredient(
  companyId: string,
  recipeId: string,
  ingredientId: string,
  data: { quantity?: number; unit?: string | null },
): Promise<Recipe> {
  return patch<Recipe>(`/companies/${companyId}/recipes/${recipeId}/ingredients/${ingredientId}`, data);
}

export async function removeIngredient(companyId: string, recipeId: string, productId: string): Promise<Recipe> {
  return del<Recipe>(`/companies/${companyId}/recipes/${recipeId}/ingredients/${productId}`);
}
