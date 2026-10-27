/* Kiểm tra các route ghi (POST/PUT/PATCH/DELETE) của admin + khách, phát hiện 500 */
const API = 'http://localhost:4000/api/v1';
const login = async (email: string, password: string) =>
  (await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })).json()).data.accessToken;

const AT = await login('admin@ninicakes.vn', 'Admin@123');
const ST = await login('staff@ninicakes.vn', 'Staff@123');
const CT = await login('vy.nguyen@example.com', 'Customer@123');

const bad: string[] = [];
const unexpected: string[] = [];
type Opt = { token?: string; body?: unknown; method?: string };
const probe = async (path: string, opt: Opt = {}, ok: number[] = [200, 201]) => {
  const method = opt.method ?? 'POST';
  const headers: Record<string, string> = {};
  if (opt.token) headers.Authorization = `Bearer ${opt.token}`;
  if (opt.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: opt.body === undefined ? undefined : JSON.stringify(opt.body) });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text); } catch { unexpected.push(`${res.status} ${method} ${path} :: không phải JSON`); }
  const msg = (json?.message ?? '') as string;
  const line = `${res.status} ${method} ${path} :: ${msg}`.slice(0, 150);
  if (res.status >= 500) bad.push(line + ' || ' + text.slice(0, 250));
  else if (!ok.includes(res.status)) unexpected.push(line);
  else console.info(line);
  return json;
};

const idOf = (j: Record<string, unknown> | null) => (j?.data as { id?: number } | undefined)?.id;

/* DANH MỤC */
const cat = await probe('/admin/categories', { token: AT, body: { name: 'Danh mục thử nghiệm ' + Date.now(), description: 'test', sortOrder: 90, isActive: true } });
if (idOf(cat)) {
  await probe('/admin/categories/' + idOf(cat), { token: AT, method: 'PUT', body: { name: 'Danh mục đã sửa', description: 'test 2', sortOrder: 91, isActive: false } });
  await probe('/admin/categories/' + idOf(cat), { token: AT, method: 'DELETE' });
}

/* NGUYÊN LIỆU + DỊ ỨNG */
const ing = await probe('/admin/ingredients', { token: AT, body: { name: 'Matcha thử nghiệm', note: 'test', allergenIds: [] } });
if (idOf(ing)) await probe('/admin/ingredients/' + idOf(ing), { token: AT, method: 'PUT', body: { name: 'Matcha đã sửa', note: 'test 2', allergenIds: [1] } });
if (idOf(ing)) await probe('/admin/ingredients/' + idOf(ing), { token: AT, method: 'DELETE' });
const alg = await probe('/admin/allergens', { token: AT, body: { name: 'Dị ứng thử nghiệm', icon: '🧪' } });
if (idOf(alg)) await probe('/admin/allergens/' + idOf(alg), { token: AT, method: 'PUT', body: { name: 'Dị ứng sửa', icon: '🧪' } });
if (idOf(alg)) await probe('/admin/allergens/' + idOf(alg), { token: AT, method: 'DELETE' });

/* SẢN PHẨM: tạo full (biến thể + ảnh) → đọc chi tiết → sửa → soft delete */
const prod = await probe('/admin/products', {
  token: AT,
  body: {
    name: 'Bánh Thử Nghiệm Matcha ' + Date.now(),
    shortDescription: 'Bánh dùng cho kiểm thử tự động.',
    description: 'Mô tả dài cho sản phẩm kiểm thử, hiển thị ở trang chi tiết.',
    categoryId: 1,
    isFeatured: false,
    isSeasonal: false,
    isActive: true,
    ingredientIds: [1, 2],
    allergenIds: [1],
    images: [{ url: '/uploads/images/test.png', alt: 'Bánh test', isPrimary: true }],
    variants: [
      { name: '16cm / 6 phần', flavor: 'Matcha', price: 350000, stock: 12, isActive: true },
      { name: '22cm / 12 phần', flavor: 'Matcha', price: 550000, stock: 8, isActive: true },
    ],
  },
});
const pid = idOf(prod);
if (pid) {
  await probe(`/admin/products/${pid}`, { token: AT, method: 'GET' });
  const slug = (prod?.data as { slug?: string } | undefined)?.slug;
  if (slug) await probe(`/products/${slug}`, { method: 'GET' });
  await probe('/admin/products/' + pid, {
    token: AT, method: 'PUT',
    body: {
      name: 'Bánh Thử Nghiệm Đã Sửa', shortDescription: 'đã sửa', description: 'đã sửa mô tả',
      categoryId: 1, isFeatured: true, isSeasonal: false, isActive: true,
      ingredientIds: [1], allergenIds: [],
      images: [{ url: '/uploads/images/test.png', alt: 'Bánh test', isPrimary: true }],
      variants: [{ id: pid, name: '18cm / 8 phần', flavor: 'Matcha', price: 400000, stock: 20, isActive: true }],
    },
  });
  await probe('/admin/products/' + pid, { token: AT, method: 'DELETE' });
}
/* sản phẩm thiếu biến thể phải bị chặn */
await probe('/admin/products', { token: AT, body: { name: 'Không biến thể', categoryId: 1, variants: [] } }, [422, 400]);

/* ĐƠN HÀNG */
await probe('/cart', { token: CT, method: 'DELETE' });
await probe('/cart/items', { token: CT, body: { variantId: 2, quantity: 1, options: { messageOnCake: 'Kiểm thử tự động' } } });
const o = await probe('/orders', {
  token: CT,
  body: { deliveryType: 'DELIVERY', deliveryDate: '2026-12-01', timeSlot: '10:00 - 12:00', addressId: 1, paymentMethod: 'COD' },
});
const oid = idOf(o);
for (const s of ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED']) {
  if (oid) await probe(`/admin/orders/${oid}/status`, { token: ST, method: 'PATCH', body: { status: s } });
}
if (oid) await probe(`/admin/orders/${oid}/payment`, { token: ST, method: 'PATCH', body: { paymentStatus: 'PAID', reference: 'AUTO' } });
if (oid) await probe(`/admin/orders/${oid}`, { token: ST, method: 'GET' });

/* KHUYẾN MÃI */
const cp = await probe('/admin/coupons', {
  token: AT,
  body: {
    code: 'AUTOTEST' + Date.now(), type: 'PERCENT', value: 15, minSubtotal: 300000, maxDiscount: 150000,
    maxUses: 10, startsAt: new Date('2026-10-01').toISOString(), endsAt: new Date('2026-12-31').toISOString(),
    isActive: true, description: 'Mã kiểm thử',
  },
});
if (idOf(cp)) await probe('/admin/coupons/' + idOf(cp), { token: AT, method: 'PUT', body: { value: 20, isActive: false } });
if (idOf(cp)) await probe('/admin/coupons/' + idOf(cp), { token: AT, method: 'DELETE' });

/* ĐÁNH GIÁ */
const mineList = await probe('/reviews/mine', { token: CT, method: 'GET' });
for (const r of (mineList?.data as { id: number }[] | undefined) ?? []) await probe(`/reviews/${r.id}`, { token: CT, method: 'DELETE' });
const rv = await probe('/reviews', { token: CT, body: { productId: 2, rating: 4, comment: 'Bánh ổn, kem mát vừa phải.' } });
const rvid = idOf(rv);
if (rvid) await probe(`/admin/reviews/${rvid}/approve`, { token: ST, method: 'PATCH', body: { approve: true } });
if (rvid) await probe(`/admin/reviews/${rvid}/hide`, { token: ST, method: 'PATCH', body: { hide: true } });
if (rvid) await probe(`/admin/reviews/${rvid}/reply`, { token: ST, method: 'PATCH', body: { reply: 'Xin cảm ơn quý khách đã góp ý.' } });
if (rvid) await probe(`/admin/reviews/${rvid}`, { token: AT, method: 'DELETE' });

/* NỘI DUNG */
const bn = await probe('/admin/banners', { token: AT, body: { title: 'Banner kiểm thử', subtitle: 'auto', imageUrl: '/uploads/images/x.png', linkUrl: '/products', sortOrder: 1, isActive: true } });
if (idOf(bn)) await probe('/admin/banners/' + idOf(bn), { token: AT, method: 'PUT', body: { title: 'Banner đã sửa', isActive: false } });
if (idOf(bn)) await probe('/admin/banners/' + idOf(bn), { token: AT, method: 'DELETE' });

const po = await probe('/admin/posts', { token: AT, body: { title: 'Bài viết kiểm thử ' + Date.now(), excerpt: 'tóm tắt', content: '<p>Nội dung bài viết kiểm thử tự động.</p>', coverImageUrl: null, type: 'STORY', isPublished: true } });
if (idOf(po)) await probe('/admin/posts/' + idOf(po), { token: AT, method: 'PUT', body: { title: 'Bài viết đã sửa', excerpt: 'tóm tắt 2', content: '<p>sửa nội dung</p>', type: 'STORY', isPublished: false } });
if (idOf(po)) await probe('/admin/posts/' + idOf(po), { token: AT, method: 'DELETE' });

const settings = await probe('/admin/settings', { token: AT, method: 'GET' });
if (settings?.data) {
  const s = settings.data as Record<string, unknown>;
  await probe('/admin/settings', {
    token: AT, method: 'PUT',
    body: {
      name: s.name, slogan: s.slogan, address: s.address, phone: s.phone, email: s.email,
      openingHours: s.openingHours, facebook: s.facebook, instagram: s.instagram, zalo: s.zalo,
      bankName: s.bankName, bankAccountName: s.bankAccountName, bankAccountNumber: s.bankAccountNumber,
      shippingFeeVnd: s.shippingFeeVnd, freeShippingMinVnd: s.freeShippingMinVnd,
    },
  });
}
await probe('/admin/messages/1/read', { token: ST, method: 'PATCH' });

/* KHÁCH HÀNG / NHÂN VIÊN */
await probe('/admin/users/customer', { token: AT, method: 'GET' });
await probe('/admin/users/CUSTOMER', { token: AT, method: 'GET' });
await probe('/admin/users/STAFF', { token: AT, method: 'GET' });
await probe('/admin/users/ADMIN', { token: AT, method: 'GET' });
await probe('/admin/users/RAC', { token: AT, method: 'GET' }, [422]);
const staff = await probe('/admin/staff', { token: AT, body: { fullName: 'Nhân Viên Kiểm Thử', email: 'qa.' + Date.now() + '@ninicakes.vn', password: 'Staff@123', role: 'STAFF' } });
if (idOf(staff)) await probe('/admin/users/' + idOf(staff) + '/block', { token: AT, method: 'PATCH', body: { blocked: true } });
if (idOf(staff)) await probe('/admin/users/' + idOf(staff) + '/block', { token: AT, method: 'PATCH', body: { blocked: false } });
if (idOf(staff)) await probe('/admin/users/detail/' + idOf(staff), { token: AT, method: 'GET' });

/* TÀI KHOẢN KHÁCH */
await probe('/auth/me', { token: CT, method: 'PATCH', body: { fullName: 'Nguyễn Thảo Vy', phone: '0901332201' } });
await probe('/auth/me/password', { token: CT, method: 'PATCH', body: { currentPassword: 'Customer@123', newPassword: 'Customer@123' } });
const addr = await probe('/addresses', { token: CT, body: { fullName: 'Nguyễn Thảo Vy', phone: '0901332201', addressLine: '12 Đào Duy Từ', ward: 'P.6', district: 'Quận 3', city: 'TP. Hồ Chí Minh', isDefault: false } });
if (idOf(addr)) await probe('/addresses/' + idOf(addr), { token: CT, method: 'PATCH', body: { fullName: 'Nguyễn Thảo Vy', phone: '0901332201', addressLine: '14 Đào Duy Từ', ward: 'P.6', district: 'Quận 3', city: 'TP. Hồ Chí Minh', isDefault: false } });
if (idOf(addr)) await probe('/addresses/' + idOf(addr), { token: CT, method: 'DELETE' });
await probe('/wishlist/3', { token: CT, method: 'DELETE' }, [200, 201, 204, 404]);
await probe('/wishlist/3', { token: CT });
await probe('/newsletter', { body: { email: 'qa.' + Date.now() + '@example.com' } });
await probe('/auth/forgot-password', { body: { email: 'vy.nguyen@example.com' } });
await probe('/orders', { token: CT, body: { deliveryType: 'DELIVERY', deliveryDate: '2026-12-01', timeSlot: '10:00 - 12:00', paymentMethod: 'COD' } }, [422]);

const alive = await fetch(API + '/');
console.info(`\nserver cuối: ${alive.status}`);
console.info(bad.length ? `=== 500 CÒN SÓT (${bad.length}) ===\n` + bad.join('\n') : '=== KHÔNG CÓ 500 Ở ROUTE GHI ===');
if (unexpected.length) console.info('=== BẤT NGỜ (ngoài mã mong đợi / không JSON) ===\n' + unexpected.join('\n'));
