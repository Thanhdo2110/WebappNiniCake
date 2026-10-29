/** Danh sách sản phẩm (admin): tra cứu + lọc + bật/tắt hiển thị + vào sửa */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminProductRow, CategoryAdminDTO, Paginated } from '@shared/types';
import { get, patch, errMessage } from '../lib/api';
import { formatVND } from '../lib/format';
import { imageUrl } from '../lib/placeholder';
import { Loading, PageTitle, Empty, Pager } from '../components/ui';
import { useToast } from '../hooks/toast';

export default function ProductsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  const catsQ = useQuery({ queryKey: ['admin-categories'], queryFn: () => get<CategoryAdminDTO[]>('/admin/categories') });

  const query = useQuery({
    queryKey: ['admin-products', { q, categoryId, isActive, page }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, perPage: 12 };
      if (q.trim()) params.q = q.trim();
      if (categoryId) params.categoryId = categoryId;
      if (isActive !== '') params.isActive = isActive;
      return get<Paginated<AdminProductRow>>('/admin/products', params);
    },
  });

  const toggleM = useMutation({
    mutationFn: async (row: AdminProductRow) => {
      // Lấy bản đầy đủ rồi gửi update hợp lệ (variants bắt buộc >= 1)
      const full = await get<import('@shared/types').ProductDetailDTO>(`/admin/products/${row.id}`);
      return patch(`/admin/products/${row.id}`, {
        categoryId: full.categoryId,
        name: full.name,
        shortDescription: full.shortDescription || '',
        description: full.description || '',
        compareAtPrice: full.compareAtPrice,
        isFeatured: full.isFeatured,
        isSeasonal: full.isSeasonal,
        isActive: !full.isActive,
        variants: full.variants.map((v) => ({ id: v.id, name: v.name, flavor: v.flavor || '', price: v.price, isActive: v.isActive })),
        images: full.images.map((m) => ({ url: m.url || '', alt: m.alt || '', isPrimary: m.isPrimary })),
        ingredientIds: full.ingredients,
        allergenIds: full.allergens,
      });
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const items = query.data?.items || [];

  return (
    <>
      <PageTitle title="Sản phẩm / danh sách bánh" action={
        <Link className="btn btn-gold btn-sm" to="/products/new">+ Thêm bánh</Link>
      } />

      <div className="filter-bar card pad">
        <input className="input" placeholder="Tìm theo tên bánh" value={q} style={{ minWidth: 220 }}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="select" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">Tất cả danh mục</option>
          {(catsQ.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(1); }}>
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang bán</option>
          <option value="false">Đã ẩn</option>
        </select>
      </div>

      {query.isLoading ? <Loading text="Đang lấy bảng bánh..." /> : items.length === 0 ? (
        <Empty title="Chưa có bánh nào khớp bộ lọc" />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr><th>Bánh</th><th>Danh mục</th><th>Giá thấp nhất</th><th>Đánh giá</th><th>Trạng thái</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ minWidth: 220 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <img src={imageUrl(p.imageUrl, p.name)} alt="" style={{ width: 46, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        <div>
                          <Link to={`/products/${p.id}`} style={{ fontWeight: 700, color: 'var(--cocoa)' }}>{p.name}</Link>
                          <div className="small muted">{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="small">{p.categoryName || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatVND(p.price)}</td>
                    <td className="small">{p.ratingCount > 0 ? `★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : '—'}</td>
                    <td><span className={`tag ${p.isActive ? 'tag-green' : 'tag-gray'}`}>{p.isActive ? 'Đang bán' : 'Đã ẩn'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link className="btn btn-outline btn-sm" to={`/products/${p.id}`}>Sửa</Link>
                        <button className="btn btn-danger btn-sm" disabled={toggleM.isPending}
                          onClick={() => {
                            toggleM.mutateAsync(p).then(() => {
                              toast(`Đã ${p.isActive ? 'ẩn' : 'hiện lại'} ${p.name}.`, 'ok');
                              qc.invalidateQueries({ queryKey: ['admin-products'] });
                            });
                          }}>
                          {p.isActive ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data && <Pager meta={query.data.meta} page={page} onPage={setPage} />}
        </>
      )}
    </>
  );
}
