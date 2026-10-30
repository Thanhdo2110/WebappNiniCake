/** Query + mutation API giỏ hàng (khách & đã đăng nhập đều dùng cùng endpoint) */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemInput, CartSummaryDTO } from '@shared/types';
import { get, post as postApi, del as delApi } from '../lib/api';

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => get<CartSummaryDTO>('/cart'),
    staleTime: 10_000,
  });
}

/** Sự kiện báo để header nảy "+1" khi khách thêm giỏ từ danh sách. */
export const CART_ADDED_EVENT = 'nc:cart-added';

export function announceCartAdded(name: string) {
  window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT, { detail: { name } }));
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCartItemInput & { quantity: number }) => postApi<CartSummaryDTO>('/cart/items', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: number; quantity: number }) =>
      import('../lib/api').then(({ patch }) => patch<CartSummaryDTO>(`/cart/items/${p.id}`, { quantity: p.quantity })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => delApi<CartSummaryDTO>(`/cart/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => delApi<CartSummaryDTO>('/cart'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}
