/* Quét tất cả route GET công khai + admin, phát hiện 500 */
const API = 'http://localhost:4000/api/v1';
const login = async (email: string, password: string) =>
  (await (await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })).json()).data.accessToken;

const AT = await login('admin@ninicakes.vn', 'Admin@123');

const publicGet = [
  '/', '/categories', '/ingredients', '/allergens',
  '/products', '/products?sort=price_asc&page=1&limit=5', '/products?minPrice=300000&maxPrice=700000&sort=rating',
  '/products?search=socola', '/products?category=banh-kem',
  '/reviews/top', '/banners', '/settings', '/posts',
];

const adminGet = [
  '/admin/products', '/admin/products?isActive=false', '/admin/products?page=1&perPage=5&sort=stock_asc',
  '/admin/categories', '/admin/ingredients', '/admin/allergens',
  '/admin/orders', '/admin/orders?status=PENDING', '/admin/orders?deliveryType=PICKUP&from=2026-09-01&to=2026-12-31',
  '/admin/coupons', '/admin/reviews', '/admin/reviews?approved=true', '/admin/reviews?approved=false',
  '/admin/banners', '/admin/posts', '/admin/settings', '/admin/messages', '/admin/newsletter.csv',
  '/admin/users/customer', '/admin/users/admin', '/admin/users/staff',
  '/admin/dashboard',
  '/admin/reports/revenue?groupBy=day', '/admin/reports/revenue?groupBy=week', '/admin/reports/revenue?groupBy=month',
  '/admin/reports/customers?groupBy=month', '/admin/reports/top-products?limit=8',
  '/admin/reports/revenue.csv', '/admin/reports/top-products.csv', '/admin/reports/orders.csv', '/admin/reports/customers.csv',
];

const bad: string[] = [];
const probe = async (path: string, token?: string) => {
  const res = await fetch(API + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  let msg = '';
  try { msg = JSON.parse(text)?.message ?? ''; } catch { msg = 'OK(csv/html)'; }
  const line = `${res.status} ${path} :: ${msg}`.slice(0, 130);
  if (res.status >= 500) bad.push(line);
  else console.info(line);
};

for (const p of publicGet) await probe(p);
for (const p of adminGet) await probe(p, AT);

/* chi tiết từng sản phẩm / đơn / người dùng / bài viết */
const products = (await (await fetch(`${API}/products?limit=30`)).json()).data.items as { slug: string }[];
for (const p of products) await probe(`/products/${p.slug}`);
const orders = (await (await fetch(`${API}/admin/orders?perPage=50`, { headers: { Authorization: `Bearer ${AT}` } })).json()).data.items as { id: number }[];
for (const o of orders) await probe(`/admin/orders/${o.id}`, AT);
const users = (await (await fetch(`${API}/admin/users/customer`, { headers: { Authorization: `Bearer ${AT}` } })).json()).data.items as { id: number }[];
for (const u of users) await probe(`/admin/users/detail/${u.id}`, AT);
const posts = (await (await fetch(`${API}/posts`)).json()).data as { slug: string }[];
for (const t of posts) await probe(`/posts/${t.slug}`);
const prods = (await (await fetch(`${API}/products?limit=10`)).json()).data.items as { id: number }[];
for (const p of prods) await probe(`/admin/products/${p.id}`, AT);

console.info(bad.length ? `\n=== 500 CÒN SÓT (${bad.length}) ===\n` + bad.join('\n') : '\n=== KHÔNG CÓ 500 NÀO ===');
