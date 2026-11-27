import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_SUPPLY_CATEGORIES,
  initialData,
} from './constants';
import type { StoreData } from './types';

export function normalizeStoreData(savedData: Partial<StoreData>): StoreData {
  const products = savedData.products ?? [];
  const supplies = savedData.supplies ?? [];
  return {
    ...initialData,
    ...savedData,
    products,
    supplies,
    productCategories: [...new Set([
      ...DEFAULT_PRODUCT_CATEGORIES,
      ...(savedData.productCategories ?? []),
      ...products.map((product) => product.category),
    ])],
    supplyCategories: [...new Set([
      ...DEFAULT_SUPPLY_CATEGORIES,
      ...(savedData.supplyCategories ?? []),
      ...supplies.flatMap((supply) => supply.category ? [supply.category] : []),
    ])],
  };
}
