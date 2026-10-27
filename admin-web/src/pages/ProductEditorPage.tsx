/** Soạn bánh: thông tin chung, ảnh (upload), biến thể, nguyên liệu & dị ứng */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AllergenDTO, CategoryAdminDTO, IngredientDTO, ProductDetailDTO } from '@shared/types';
import { LOW_STOCK_THRESHOLD } from '@shared';
import { get, post, put, uploadFile, errMessage } from '../lib/api';
import { parseAmount, formatNumber } from '../lib/format';
import { Loading, PageTitle, ZoomImage } from '../components/ui';
import { useToast } from '../hooks/toast';

interface VariantForm { id?: number; name: string; flavor: string; price: string; stock: string; isActive: boolean }
interface ImageForm { url: string; alt: string; isPrimary: boolean }

const blank = { categoryId: '', name: '', shortDescription: '', description: '', compareAtPrice: '', isFeatured: false, isSeasonal: false, isActive: true };

export default function ProductEditorPage() {
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const catsQ = useQuery({ queryKey: ['admin-categories'], queryFn: () => get<CategoryAdminDTO[]>('/admin/categories') });
  const ingQ = useQuery({ queryKey: ['admin-ingredients'], queryFn: () => get<IngredientDTO[]>('/admin/ingredients') });
  const algQ = useQuery({ queryKey: ['admin-allergens'], queryFn: () => get<AllergenDTO[]>('/admin/allergens') });

  const detailQ = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => get<ProductDetailDTO>(`/admin/products/${id}`),
    enabled: isEdit,
  });

  const [form, setForm] = useState(blank);
  const [variants, setVariants] = useState<VariantForm[]>([{ name: '', flavor: '', price: '', stock: '20', isActive: true }]);
  const [images, setImages] = useState<ImageForm[]>([]);
  const [ingredientIds, setIngredientIds] = useState<number[]>([]);
  const [allergenIds, setAllergenIds] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busyUpload, setBusyUpload] = useState(false);

  useEffect(() => {
    if (isEdit && detailQ.data && !hydrated) {
      const p = detailQ.data;
      setForm({
        categoryId: String(p.categoryId), name: p.name,
        shortDescription: p.shortDescription || '', description: p.description || '',
        compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
        isFeatured: p.isFeatured, isSeasonal: p.isSeasonal, isActive: p.isActive,
      });
      setVariants(p.variants.map((v) => ({ id: v.id, name: v.name, flavor: v.flavor || '', price: String(v.price), stock: String(v.stock), isActive: v.isActive })));
      setImages(p.images.map((m) => ({ url: m.url || '', alt: m.alt || '', isPrimary: m.isPrimary })));
      setIngredientIds(p.ingredients);
      setAllergenIds(p.allergens);
      setHydrated(true);
    }
    if (!isEdit && !hydrated) setHydrated(true);
  }, [detailQ.data, hydrated, isEdit]);

  const saveM = useMutation({
    mutationFn: () => {
      const body = {
        categoryId: Number(form.categoryId),
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        compareAtPrice: form.compareAtPrice ? parseAmount(form.compareAtPrice) : undefined,
        isFeatured: form.isFeatured,
        isSeasonal: form.isSeasonal,
        isActive: form.isActive,
        variants: variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name.trim(),
          flavor: v.flavor.trim(),
          price: parseAmount(v.price),
          stock: Math.max(0, Number(v.stock) || 0),
          isActive: v.isActive,
        })),
        images: images.filter((m) => m.url.trim()).map((m, i) => ({ url: m.url.trim(), alt: m.alt.trim() || null, isPrimary: m.isPrimary || (i === 0 && !images.some((x, j) => j !== i && x.isPrimary && x.url.trim())) })),
        ingredientIds,
        allergenIds,
      };
      return isEdit
        ? put(`/admin/products/${id}`, body)
        : post(`/admin/products`, body);
    },
    onSuccess: (r) => {
      toast(r.message || 'Đã lưu sản phẩm.', 'ok');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product'] });
      navigate('/products');
    },
    onError: (e) => toast(errMessage(e), 'err'),
  });

  const addVariant = () => setVariants([...variants, { name: '', flavor: '', price: '', stock: '20', isActive: true }]);
  const rmVariant = (i: number) => setVariants(variants.filter((_, x) => x !== i));

  /** Tải nhiều ảnh từ máy và thêm thẳng vào danh sách (tối đa 8) */
  const addUploadedFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusyUpload(true);
    let added = 0;
    try {
      for (const file of Array.from(files)) {
        if (added >= 8) break;
        const r = await uploadFile(file);
        setImages((imgs) => {
          if (imgs.length >= 8) return imgs;
          added += 1;
          return [...imgs, { url: r.url, alt: file.name.replace(/\.[^.]+$/, ''), isPrimary: imgs.length === 0 }];
        });
      }
      toast(added ? `Đã tải ${added} ảnh lên — bấm Lưu để gắn vào bánh.` : 'Đã đủ 8 ảnh, không thêm được nữa.', added ? 'ok' : 'err');
    } catch (e) {
      toast(errMessage(e, 'Tải ảnh lỗi.'), 'err');
    } finally {
      setBusyUpload(false);
    }
  };

  const loadImage = async (file: File | undefined, idx: number) => {
    if (!file) return;
    setBusyUpload(true);
    try {
      const r = await uploadFile(file);
      setImages((imgs) => imgs.map((m, i) => (i === idx ? { ...m, url: r.url } : m)));
      toast('Đã tải ảnh lên.', 'ok');
    } catch (e) {
      toast(errMessage(e, 'Tải ảnh lỗi.'), 'err');
    } finally {
      setBusyUpload(false);
    }
  };

  if (isEdit && detailQ.isLoading) return <Loading text="Đang lấy công thức bánh..." />;
  if (isEdit && detailQ.isError) return <div className="error-box">Không tìm thấy bánh. <Link to="/products">Về danh sách</Link></div>;

  const valid = form.name.trim().length >= 2 && form.categoryId && variants.length > 0
    && variants.every((v) => v.name.trim() && parseAmount(v.price) > 0);

  return (
    <div style={{ maxWidth: 1080 }}>
      <PageTitle
        title={isEdit ? `Sửa: ${form.name || `(id ${id})`}` : 'Thêm bánh mới'}
        action={<Link to="/products" className="btn btn-outline btn-sm">← Danh sách</Link>}
      />

      <form onSubmit={(e) => { e.preventDefault(); if (valid) saveM.mutate(); }}>
        {/* Thông tin */}
        <div className="card pad mb-16">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Thông tin cơ bản</h3>
          <div className="grid-form">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Tên bánh (*)</label>
              <input className="input" required minLength={2} maxLength={120} value={form.name}
                placeholder="VD: Tiramisu lát dâu câm" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Danh mục (*)</label>
              <select className="select" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— chọn —</option>
                {(catsQ.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Giá thị trường (so sánh, không bắt buộc)</label>
              <input className="input" inputMode="numeric" value={form.compareAtPrice}
                placeholder="VD: 380000"
                onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
              {form.compareAtPrice && <span className="small muted">= {formatNumber(parseAmount(form.compareAtPrice))} đ</span>}
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Mô tả ngắn (hiển thị trên thẻ bánh)</label>
              <input className="input" maxLength={200} value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Viết chi tiết (câu chuyện bánh, khẩu phần...)</label>
              <textarea className="textarea" rows={4} maxLength={5000} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <label className="check-row"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Nổi bật trang chủ</label>
            <label className="check-row"><input type="checkbox" checked={form.isSeasonal} onChange={(e) => setForm({ ...form, isSeasonal: e.target.checked })} /> Vị theo mùa</label>
            <label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang bán (hiển thị storefront)</label>
          </div>
        </div>

        {/* Biến thể */}
        <div className="card pad mb-16">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 15 }}>Kích cỡ / vị bán (tối thiểu 1)</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addVariant}>+ Thêm biến thể</button>
          </div>
          {variants.map((v, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr .9fr .7fr .6fr auto', gap: 10, alignItems: 'end', marginBottom: 10 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Tên (VD: 16 lát (1kg))</label>
                <input className="input" value={v.name} maxLength={80} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Vị chính</label>
                <input className="input" value={v.flavor} maxLength={80} placeholder="VD: latte" onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, flavor: e.target.value } : x)))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Giá (₫)</label>
                <input className="input" inputMode="numeric" value={v.price} placeholder="320000"
                  onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Tồn</label>
                <input className="input" type="number" min={0} max={10000} value={v.stock}
                  onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} />
              </div>
              <label className="check-row" style={{ transform: 'translateY(8px)' }}>
                <input type="checkbox" checked={v.isActive}
                  onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} /> bán
              </label>
              <button type="button" className="btn btn-danger btn-sm" style={{ transform: 'translateY(6px)' }} onClick={() => rmVariant(i)}
                disabled={variants.length <= 1}>✕</button>
            </div>
          ))}
          {variants.some((v) => !Number(v.stock)) && (
            <p className="small" style={{ color: 'var(--err)', fontWeight: 600 }}>
              ⛔ Có biến thể tồn kho = 0: khách sẽ thấy “tạm hết” và <b>không thêm vào giỏ / đặt hàng được</b>. Nhập số phần khả dụng nếu bạn muốn bán.
            </p>
          )}
          {variants.some((v) => Number(v.stock) <= LOW_STOCK_THRESHOLD) && (
            <p className="small" style={{ color: 'var(--warn)' }}>⚠️ Có biến thể tồn dưới {LOW_STOCK_THRESHOLD} phần — sẽ xuất hiện cảnh báo trên dashboard.</p>
          )}
        </div>

        {/* Ảnh */}
        <div className="card pad mb-16">
          <div className="img-card__head">
            <h3 style={{ fontSize: 15 }}>Ảnh bánh (tối đa 8)</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className={`btn btn-primary btn-sm${busyUpload ? ' is-busy' : ''}`}>
                {busyUpload ? 'Đang tải…' : '⬆ Tải ảnh từ máy'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={busyUpload || images.length >= 8}
                  style={{ display: 'none' }}
                  onChange={(e) => { void addUploadedFiles(e.target.files); e.target.value = ''; }}
                />
              </label>
              <button type="button" className="btn btn-outline btn-sm" disabled={images.length >= 8} onClick={() => setImages([...images, { url: '', alt: '', isPrimary: false }])}>+ Thêm ô ảnh</button>
            </div>
          </div>
          {images.length === 0 && <p className="small muted">Chưa có ảnh nào — bấm “Tải ảnh từ máy” để thêm ảnh thật, hoặc “Thêm ô ảnh” rồi dán URL. Storefront tự vẽ placeholder khi trống.</p>}
          {images.map((m, i) => (
            <div key={i} className="img-row">
              {m.url.trim()
                ? <ZoomImage src={m.url.trim()} alt={m.alt || `Ảnh ${i + 1} của bánh`} caption={`Ảnh ${i + 1}${m.isPrimary ? ' — ảnh chính' : ''}`} className="img-row__thumb" />
                : <span className="img-row__thumb img-row__thumb--empty">chưa<br />có ảnh</span>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                <input className="input" placeholder="URL ảnh (tải lên sẽ tự điền)" value={m.url} onChange={(e) => setImages(images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <label className="btn btn-outline btn-sm" title="Tải lại ảnh cho ô này">
                  {busyUpload ? '...' : 'Đổi'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => loadImage(e.target.files?.[0], i)} />
                </label>
              </div>
              <input className="input" placeholder="Chú thích ảnh" value={m.alt} onChange={(e) => setImages(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
              <label className="check-row">
                <input type="radio" name="primary" checked={m.isPrimary} onChange={() => setImages(images.map((x, j) => ({ ...x, isPrimary: j === i })))} /> chính
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setImages(images.filter((_, j) => j !== i))}>✕</button>
              </label>
            </div>
          ))}
        </div>

        {/* Nguyên liệu & dị ứng */}
        <div className="card pad mb-16">
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Nguyên liệu (gợi ý dị ứng tự động)</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {(ingQ.data || []).map((ing) => (
              <button key={ing.id} type="button" className={`variant-pill ${ingredientIds.includes(ing.id) ? 'selected' : ''}`}
                onClick={() => setIngredientIds(ingredientIds.includes(ing.id) ? ingredientIds.filter((x) => x !== ing.id) : [...ingredientIds, ing.id])}>
                {ing.name}
              </button>
            ))}
          </div>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Dị ứng bổ sung (tập hợp sau khi gộp nguyên liệu)</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(algQ.data || []).map((a) => (
              <button key={a.id} type="button" className={`variant-pill ${allergenIds.includes(a.id) ? 'selected' : ''}`}
                onClick={() => setAllergenIds(allergenIds.includes(a.id) ? allergenIds.filter((x) => x !== a.id) : [...allergenIds, a.id])}>
                {a.icon ? `${a.icon} ` : ''}{a.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Link to="/products" className="btn btn-outline">Hủy</Link>
          <button className="btn btn-gold" disabled={!valid || saveM.isPending}>
            {saveM.isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo bánh mới'}
          </button>
        </div>
      </form>
    </div>
  );
}
