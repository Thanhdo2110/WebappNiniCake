/** Các query dùng chung ở nhiều trang (cài đặt, danh mục, dữ liệu trang chủ) */
import { useQuery } from '@tanstack/react-query';
import type { BannerDTO, CategoryDTO, ProductListDTO, ReviewDTO, StoreSettingsDTO } from '@shared/types';
import { get } from '../lib/api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => get<StoreSettingsDTO>('/settings'),
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => get<CategoryDTO[]>('/categories'),
    staleTime: 60_000,
  });
}

export interface HomeBundle {
  banners: BannerDTO[];
  categories: CategoryDTO[];
  seasonal: ProductListDTO[];
  featured: ProductListDTO[];
  bestsellers: ProductListDTO[];
  topReviews: Array<ReviewDTO & { product: { id: number; name: string; slug: string } }>;
  settings: StoreSettingsDTO;
}

/** Server không có endpoint /home riêng → gộp nhiều cuộc gọi công khai */
export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async (): Promise<HomeBundle> => {
      const [banners, categories, seasonal, featured, bestsellers, topReviews, settings] = await Promise.all([
        get<BannerDTO[]>('/banners'),
        get<CategoryDTO[]>('/categories'),
        get<{ items: ProductListDTO[] }>('/products', { seasonal: 'true', perPage: 4, sort: 'newest', page: 1 }),
        get<{ items: ProductListDTO[] }>('/products', { featured: 'true', perPage: 8, sort: 'newest', page: 1 }),
        get<{ items: ProductListDTO[] }>('/products', { sort: 'popular', perPage: 8, page: 1 }),
        get<Array<ReviewDTO & { product: { id: number; name: string; slug: string } }>>('/reviews/top'),
        get<StoreSettingsDTO>('/settings'),
      ]);
      return { banners, categories, seasonal: seasonal.items, featured: featured.items, bestsellers: bestsellers.items, topReviews, settings };
    },
    staleTime: 30_000,
  });
}
