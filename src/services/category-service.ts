import type { Category, Color } from "@/types/product";
import { categories } from "@/mocks/categories";
import { colors } from "@/mocks/colors";
import { delay } from "@/lib/delay";

export interface CategoryService {
  getCategories(): Promise<Category[]>;
  getColors(): Promise<Color[]>;
}

const NETWORK_DELAY_MS = 120;

export class MockCategoryService implements CategoryService {
  async getCategories(): Promise<Category[]> {
    await delay(NETWORK_DELAY_MS);
    return [...categories];
  }

  async getColors(): Promise<Color[]> {
    await delay(NETWORK_DELAY_MS);
    return [...colors];
  }
}

export const categoryService: CategoryService = new MockCategoryService();
