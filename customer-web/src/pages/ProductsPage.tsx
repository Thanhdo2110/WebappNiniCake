/** Danh sách bánh: lọc danh mục / giá / nguyên liệu / dị ứng + sắp xếp + phân trang */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { AllergenDTO, IngredientDTO, Paginated, ProductListDTO } from '@shared/types';
import { SORT_OPTIONS } from '@shared';
import { errMessage, get } from '../lib/api';
import { CardSkeleton, EmptyState, PageIntro, Reveal, Stagger } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { Pagination } from '../components/Pagination';
import { useCategories } from '../hooks/catalog';
import { useBodyScrollLock, useFocusTrap } from '../hooks/a11y';
import { useSeo } from '../lib/seo';

const sortLabels: Record<string, string> = {
  newest: 'Mới nhất',
  price_asc: 'Giá tăng dần',
  price_desc: 'Giá giảm dần',
  popular: 'Bán chạy',
  rating: 'Đánh giá cao',
};

const priceBands = [
  { key: '_', label: 'Tất cả mức giá', min: '', max: '' },
  { key: '_300000', label: 'Dưới 300.000', min: '', max: '300000' },
  { key: '300000_600000', label: '300.000 – 600.000', min: '300000', max: '600000' },
  { key: '600000_1000000', label: '600.000 – 1.000.000', min: '600000', max: '1000000' },
  { key: '1000000_', label: 'Trên 1.000.000', min: '1000000', max: '' },
];

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const ingredientIds = params.get('ingredientIds') || '';
  const excludeAllergenIds = params.get('excludeAllergenIds') || '';
  const featured = params.get('featured') === 'true';
  const seasonal = params.get('seasonal') === 'true';

  useSeo({
    title: q ? `Tìm “${q}”` : 'Thực đơn bánh',
    description: 'Khám phá thực đơn bánh kem, bánh ngọt phong cách Á-Âu của Nini Cakes. Lọc theo khẩu vị, thành phần và dị ứng.',
  });

  /* Ô tìm kiếm trong bộ lọc: đồng bộ hai chiều với ?q trên URL */
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);

  /* Drawer bộ lọc trên mobile: khóa cuộn + bẫy tiêu điểm */
  useBodyScrollLock(filterOpen);
  const filterRef = useFocusTrap<HTMLElement>(filterOpen, () => setFilterOpen(false));

  const { data: categories } = useCategories();
  const ingredientsQ = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => get<IngredientDTO[]>('/ingredients'),
    staleTime: 300_000,
  });
  const allergensQ = useQuery({
    queryKey: ['allergens'],
    queryFn: () => get<AllergenDTO[]>('/allergens'),
    staleTime: 300_000,
  });

  const query = useQuery({
    queryKey: ['products', { page, q, category, sort, minPrice, maxPrice, ingredientIds, excludeAllergenIds, featured, seasonal }],
    queryFn: () => {
      const search: Record<string, unknown> = { page, perPage: 12, sort };
      if (q) search.q = q;
      if (category) search.category = category;
      const min = Number(minPrice); if (minPrice && min > 0) search.minPrice = min;
      const max = Number(maxPrice); if (maxPrice && max > 0) search.maxPrice = max;
      if (ingredientIds) search.ingredientIds = ingredientIds;
      if (excludeAllergenIds) search.excludeAllergenIds = excludeAllergenIds;
      if (featured) search.featured = 'true';
      if (seasonal) search.seasonal = 'true';
      return get<Paginated<ProductListDTO>>('/products', search);
    },
    placeholderData: (prev) => prev,
  });

  const update = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === undefined) next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const idsOf = (csv: string): number[] => (csv ? csv.split(',').map(Number).filter(Boolean) : []);
  const ingredientSelection = idsOf(ingredientIds);
  const allergenSelection = idsOf(excludeAllergenIds);

  const toggleIngredient = (id: number) => {
    const next = (ingredientSelection.includes(id)
      ? ingredientSelection.filter((x) => x !== id)
      : [...ingredientSelection, id]).join(',');
    update({ ingredientIds: next || null });
  };

  const toggleAllergen = (id: number) => {
    const next = (allergenSelection.includes(id)
      ? allergenSelection.filter((x) => x !== id)
      : [...allergenSelection, id]).join(',');
    update({ excludeAllergenIds: next || null });
  };

  const items = query.data?.items || [];
  const total = query.data?.meta?.totalItems ?? 0;
  const priceBand = `${minPrice}_${maxPrice}`;
  const activeCategory = categories?.find((c) => c.slug === category);

  const chips: Array<{ label: string; clear: Record<string, string | null> }> = [];
  if (q) chips.push({ label: `Từ khóa “${q}”`, clear: { q: null } });
  if (activeCategory) chips.push({ label: activeCategory.name, clear: { category: null } });
  if (minPrice || maxPrice) {
    const band = priceBands.find((b) => b.key === priceBand);
    chips.push({ label: band ? band.label : 'Khoảng giá', clear: { minPrice: null, maxPrice: null } });
  }
  if (featured) chips.push({ label: 'Bánh nổi bật', clear: { featured: null } });
  if (seasonal) chips.push({ label: 'Bánh theo mùa', clear: { seasonal: null } });
  if (ingredientSelection.length) chips.push({ label: `${ingredientSelection.length} thành phần`, clear: { ingredientIds: null } });
  if (allergenSelection.length) chips.push({ label: `Tránh ${allergenSelection.length} dị ứng`, clear: { excludeAllergenIds: null } });

  const sortSelect = (
    <select className="select select--sm" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sắp xếp theo">
      {SORT_OPTIONS.map((s) => (
        <option key={s} value={s}>{sortLabels[s]}</option>
      ))}
    </select>
  );

  return (
    <>
      <PageIntro
        eyebrow="Thực đơn"
        title="Tất cả bánh của Nini"
        subtitle="Lọc theo khẩu vị, thành phần và dị ứng — chọn chiếc vừa ý nhất cho dịp của bạn."
        crumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Thực đơn' }]}
      />

      <div className="container section section--tight">
        <div className={`catalog-layout${filterOpen ? ' is-open' : ''}`}>
          {filterOpen && <div className="filter-scrim" onClick={() => setFilterOpen(false)} aria-hidden />}
          <aside className="card filter-box" ref={filterRef} aria-label="Bộ lọc sản phẩm">
            <div className="filter-box__head">
              <span className="eyebrow no-rule">Bộ lọc</span>
              <button type="button" className="filter-box__close" onClick={() => setFilterOpen(false)} aria-label="Đóng bộ lọc">
                <X size={16} />
              </button>
            </div>

            <div className="filter-group">
              <div className="filter-title">Tìm kiếm</div>
              <form
                className="input-with-x"
                onSubmit={(e) => { e.preventDefault(); update({ q: searchInput.trim() || null }); }}
                role="search"
              >
                <input
                  className="input"
                  placeholder="Tên bánh / mô tả"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Tìm trong thực đơn"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="input-x"
                    onClick={() => { setSearchInput(''); update({ q: null }); }}
                    aria-label="Xóa từ khóa"
                  >
                    <X size={13} />
                  </button>
                )}
              </form>
            </div>

            <div className="filter-group">
              <div className="filter-title">Sắp xếp</div>
              <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sắp xếp theo">
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{sortLabels[s]}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <div className="filter-title">Khoảng giá (₫)</div>
              <select
                className="select"
                value={priceBand}
                aria-label="Khoảng giá"
                onChange={(e) => {
                  const [mn, mx] = e.target.value.split('_');
                  update({ minPrice: mn || null, maxPrice: mx || null });
                }}
              >
                {priceBands.map((b) => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <div className="filter-title">Danh mục</div>
              <div className="filter-list">
                <label className="check-row">
                  <input type="radio" name="category" checked={!category} onChange={() => update({ category: null })} />
                  Tất cả
                </label>
                {(categories || []).map((c) => (
                  <label key={c.id} className="check-row">
                    <input type="radio" name="category" checked={category === c.slug} onChange={() => update({ category: c.slug })} />
                    {c.name} <span className="muted small">({c.productCount})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-title">Thành phần muốn thêm</div>
              <div className="filter-list filter-list--scroll">
                {(ingredientsQ.data || []).map((ing) => (
                  <label key={ing.id} className="check-row">
                    <input type="checkbox" checked={ingredientSelection.includes(ing.id)}
                      onChange={() => toggleIngredient(ing.id)} />
                    {ing.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-title">Bỏ qua dị ứng</div>
              <div className="filter-list">
                {(allergensQ.data || []).map((a) => (
                  <label key={a.id} className="check-row">
                    <input type="checkbox" checked={allergenSelection.includes(a.id)}
                      onChange={() => toggleAllergen(a.id)} />
                    {a.icon ? `${a.icon} ` : ''}{a.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-title">Dịp đặc biệt</div>
              <label className="check-row">
                <input type="checkbox" checked={featured} onChange={(e) => update({ featured: e.target.checked ? 'true' : null })} />
                Chỉ bánh nổi bật
              </label>
              <label className="check-row">
                <input type="checkbox" checked={seasonal} onChange={(e) => update({ seasonal: e.target.checked ? 'true' : null })} />
                Chỉ bánh theo mùa
              </label>
            </div>

            <button className="btn btn-soft btn-block btn-sm" style={{ marginTop: 18 }}
              onClick={() => setParams(new URLSearchParams())}>
              <RotateCcw size={13} /> Đặt lại bộ lọc
            </button>
            <button className="btn btn-gold btn-block filter-apply" onClick={() => setFilterOpen(false)}>
              Xem {total} bánh phù hợp
            </button>
          </aside>

          <section className="catalog-results">
            <div className="results-bar">
              <div className="small muted" role="status" aria-live="polite">
                {query.isFetching ? (
                  <span className="results-bar__live">Đang cập nhật kệ bánh…</span>
                ) : (
                  <>
                    <b>{total}</b> bánh phù hợp
                  </>
                )}
              </div>
              <div className="results-bar__side">
                {chips.map((c) => (
                  <button key={c.label} type="button" className="chip-x" onClick={() => update(c.clear)} aria-label={`Bỏ lọc: ${c.label}`}>
                    {c.label} <X size={12} />
                  </button>
                ))}
                <span className="results-sort">{sortSelect}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm filter-toggle"
                  onClick={() => setFilterOpen(true)}
                  aria-expanded={filterOpen}
                >
                  <SlidersHorizontal size={14} /> Bộ lọc
                  {chips.length > 0 && <span className="filter-count">{chips.length}</span>}
                </button>
              </div>
            </div>

            {query.isLoading && <CardSkeleton count={6} />}

            {query.isError && (
              <EmptyState icon="🫖" title="Chưa mở được kệ bánh">
                <p className="small muted">{errMessage(query.error, 'Kết nối đến tiệm bị gián đoạn.')}</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => query.refetch()}>
                  <RotateCcw size={14} /> Thử lại
                </button>
              </EmptyState>
            )}

            {!query.isLoading && !query.isError && items.length === 0 && (
              <EmptyState icon="🔎" title="Không tìm thấy bánh nào phù hợp">
                <p className="small">
                  {q ? <>Không có kết quả cho “{q}”. </> : null}
                  Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm xem sao!
                </p>
                <button className="btn btn-ghost btn-sm" onClick={() => setParams(new URLSearchParams())}>Đặt lại bộ lọc</button>
              </EmptyState>
            )}

            {items.length > 0 && (
              <Stagger className={`grid-products${query.isFetching ? ' is-refreshing' : ''}`}>
                {items.map((p) => <ProductCard key={p.id} p={p} />)}
              </Stagger>
            )}

            {query.data && !query.isError && (
              <Pagination meta={query.data.meta} page={page} onPage={(np) => update({ page: String(np) }, false)} />
            )}

            {items.length > 0 && (
              <Reveal className="catalog-foot note-box">
                <Sparkles size={15} /> Không có chiếc vừa ý?{' '}
                <Link to="/lien-he">Gửi yêu cầu đặt riêng</Link> — Nini làm theo size, vị và màu bạn muốn.
              </Reveal>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
