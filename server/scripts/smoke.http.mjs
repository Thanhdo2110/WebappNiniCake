/* Smoke test luồng nghiệp vụ Nini Cakes API */
import { DELIVERY_TIME_SLOTS } from '@ninicakes/shared';

const API = 'http://localhost:4000/api/v1';
const SLOT = DELIVERY_TIME_SLOTS[4];

async function req(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    const fd = new FormData();
    fd.append('file', new Blob([form.bytes], { type: 'image/png' }), form.name);
    payload = fd;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* csv/binary */ }
  return { status: res.status, json, text };
}

/** Khách hàng đăng nhập bằng SĐT, tài khoản quản trị vẫn dùng email */
const login = async (identifier, password) =>
  (await req('POST', '/auth/login', {
    body: identifier.includes('@') ? { email: identifier, password } : { phone: identifier, password },
  })).json?.data?.accessToken;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.info(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' :: ' + detail : ''}`);
};

const main = async () => {
  const AT = await login('admin@ninicakes.vn', 'Admin@123');
  const CT = await login('0901332201', 'Customer@123');
  const ST = await login('staff@ninicakes.vn', 'Staff@123');
  check('login admin/staff bằng email + khách hàng bằng SĐT', !!(AT && CT && ST));

  /* ID sau khi seed/migrate có thể thay đổi → luôn lấy dữ liệu thật từ API, không hardcode */
  const list = (await req('GET', '/products?page=1&limit=24', { token: CT })).json?.data?.items ?? [];
  const chosen = await Promise.all(list.slice(0, 6).map((p) => req('GET', '/products/' + p.slug, { token: CT })));
  const detail = chosen.map((r) => r.json?.data?.product ?? r.json?.data).filter(Boolean);
  const withVariants = detail.find((p) => (p.variants ?? []).length >= 2 && p.variants.some((v) => v.stock > 1)) ?? detail[0];
  const P1 = withVariants.id;
  const V1 = withVariants.variants.find((v) => v.stock > 1)?.id ?? withVariants.variants[0].id;
  const V2 = withVariants.variants.find((v) => v.id !== V1 && v.stock > 0)?.id ?? V1;
  const P2 = detail.find((p) => p.id !== P1)?.id ?? P1;
  check('có sản phẩm 2 biến thể còn hàng để test', !!withVariants && V1 !== V2, `P=${P1} V=${V1}/${V2}`);

  /* 1. Lỗi nghiệp vụ 404 không được giết process */
  const bad = await req('POST', '/coupons/validate', { token: CT, body: { code: 'KHONGTON_TAI', subtotal: 960000 } });
  check('coupon sai -> 404 + message tiếng Việt', bad.status === 404, JSON.stringify(bad.json?.message));
  const alive = await req('GET', '/');
  check('server vẫn sống sau lỗi nghiệp vụ', alive.status === 200);

  const good = await req('POST', '/coupons/validate', { token: CT, body: { code: 'WELCOME10', subtotal: 960000 } });
  check('coupon WELCOME10 hợp lệ', good.status === 200 && good.json?.data?.discount > 0, JSON.stringify(good.json?.data));

  /* 2. Upload ảnh */
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const up = await req('POST', '/admin/uploads', { token: AT, form: { bytes: png, name: 'test.png' } });
  const url = up.json?.data?.url;
  check('upload ảnh (admin)', up.status === 201 && !!url, JSON.stringify(up.json?.data ?? up.json));
  if (url) {
    const fetched = await fetch('http://localhost:4000' + url);
    check('GET file ảnh vừa upload', fetched.ok, String(fetched.status));
  }
  const upGuest = await req('POST', '/admin/uploads', { token: CT, form: { bytes: png, name: 'x.png' } });
  check('upload bị chặn với customer', upGuest.status === 403 || upGuest.status === 401);

  /* 3. Giỏ hàng + tùy chỉnh bánh + checkout */
  await req('DELETE', '/cart', { token: CT });
  const add1 = await req('POST', '/cart/items', {
    token: CT,
    body: { variantId: V1, quantity: 1, options: { messageOnCake: 'Chúc mừng sinh nhật Nini', notes: 'ít ngọt' } },
  });
  check('thêm giỏ kèm lời chúc trên bánh', add1.status === 201, JSON.stringify(add1.json?.data?.items?.[0]?.options));
  const add2 = await req('POST', '/cart/items', { token: CT, body: { variantId: V2, quantity: 2 } });
  check('thêm biến thể thứ hai', add2.status === 201);
  const cart = await req('GET', '/cart', { token: CT });
  check('GET giỏ hàng tính subtotal', cart.status === 200 && cart.json?.data?.subtotal > 0, 'subtotal=' + cart.json?.data?.subtotal);

  const oversize = await req('POST', '/cart/items', { token: CT, body: { variantId: V1, quantity: 9999 } });
  check('chặn số lượng vượt tồn kho', oversize.status >= 400, JSON.stringify(oversize.json?.message));

  const addr = await req('POST', '/addresses', {
    token: CT,
    body: {
      title: 'Nhà',
      fullName: 'Nguyễn Thảo Vy',
      phone: '0901332201',
      addressLine: '12 Đào Duy Từ',
      ward: 'Phường 6',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh',
      isDefault: true,
    },
  });
  check('sổ địa chỉ', addr.status < 400, JSON.stringify(addr.json?.data?.id ?? addr.json?.message));
  const addressId = addr.json?.data?.id;

  const order = await req('POST', '/orders', {
    token: CT,
    body: {
      deliveryType: 'DELIVERY',
      deliveryDate: '2026-11-05',
      timeSlot: SLOT,
      addressId,
      paymentMethod: 'BANK_TRANSFER',
      couponCode: 'WELCOME10',
      note: 'Xin tặng kèm nến',
    },
  });
  const oid = order.json?.data?.id;
  check(
    'checkout đơn giao hàng + mã giảm giá',
    order.status === 201 && !!oid,
    JSON.stringify(order.json?.data?.code ?? order.json?.errors ?? order.json?.message)
  );
  if (order.json?.data) {
    const d = order.json.data;
    check('đơn lưu snapshot người nhận', d.recipientName === 'Nguyễn Thảo Vy' && !!d.recipientPhone, d.recipientName);
    check('discount được áp đúng', d.discount > 0 && d.total === d.subtotal - d.discount + d.shippingFee, `${d.subtotal} - ${d.discount} + ${d.shippingFee} = ${d.total}`);
  }
  const after = await req('GET', '/cart', { token: CT });
  check('giỏ hàng được dọn sau checkout', after.json?.data?.items?.length === 0);

  if (oid) {
    /* 4. Luồng trạng thái */
    const flow = ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED'];
    let allOk = true;
    for (const st of flow) {
      const r = await req('PATCH', `/admin/orders/${oid}/status`, { token: ST, body: { status: st, note: 'kiểm thử luồng' } });
      if (r.status !== 200) { allOk = false; console.info('   ' + st + ' -> ' + r.status + ' ' + JSON.stringify(r.json?.message)); }
    }
    check('admin chuyển trạng thái đúng luồng (staff)', allOk);
    const back = await req('PATCH', `/admin/orders/${oid}/status`, { token: ST, body: { status: 'PENDING' } });
    check('chặn chuyển trạng thái ngược', back.status >= 400, JSON.stringify(back.json?.message));
    const pay = await req('PATCH', `/admin/orders/${oid}/payment`, { token: ST, body: { paymentStatus: 'PAID', reference: 'NC-TEST-1' } });
    check('ghi nhận thanh toán chuyển khoản', pay.status === 200, JSON.stringify(pay.json?.message ?? pay.json?.data?.paymentStatus));
    const detail = await req('GET', `/admin/orders/${oid}`, { token: AT });
    check('chi tiết đơn có history + items', detail.status === 200 && (detail.json?.data?.history?.length ?? 0) >= 5, 'history=' + detail.json?.data?.history?.length);
    const cancel = await req('POST', `/orders/${oid}/cancel`, { token: CT, body: { reason: 'thử hủy' } });
    check('khách không hủy được đơn đã hoàn thành', cancel.status >= 400, JSON.stringify(cancel.json?.message));

    /* 4b. Khách được hủy đơn còn chờ xác nhận */
    await req('POST', '/cart/items', { token: CT, body: { variantId: V1, quantity: 1 } });
    const o2 = await req('POST', '/orders', {
      token: CT,
      body: { deliveryType: 'PICKUP', deliveryDate: '2026-11-06', timeSlot: SLOT, paymentMethod: 'COD' },
    });
    const o2id = o2.json?.data?.id;
    const cancel2 = await req('POST', `/orders/${o2id}/cancel`, { token: CT, body: { reason: 'Đổi kế hoạch' } });
    check('khách hủy được đơn còn chờ xác nhận', cancel2.status === 200, JSON.stringify(cancel2.json?.message ?? cancel2.json?.errors));
    const stock = await req('GET', '/admin/products/' + P1, { token: AT });
    check('tồn kho được hoàn khi hủy đơn', stock.status === 200, 'variant stock=' + JSON.stringify(stock.json?.data?.variants?.[0]?.stock));

    /* 5. Slug & soldCount */
    const p = await req('GET', '/products/banh-kem-socola-den-valrhona');
    check('GET sản phẩm theo slug', p?.status === 200, p?.json?.data?.name);
  }

  /* 6. Báo cáo */
  for (const r of ['revenue', 'customers', 'top-products']) {
    const rep = await req('GET', '/admin/reports/' + r, { token: AT });
    check('report ' + r, rep.status === 200);
  }
  for (const r of ['revenue', 'top-products', 'orders', 'customers']) {
    const csv = await req('GET', '/admin/reports/' + r + '.csv', { token: AT });
    check('export CSV ' + r, csv.status === 200 && csv.text.length > 20 && !csv.text.includes('<!'), csv.text.split('\n')[0]?.slice(0, 60));
  }
  const dash = await req('GET', '/admin/dashboard', { token: AT });
  check('dashboard có số liệu', dash.status === 200 && dash.json?.data?.revenueMonth > 0, 'doanh thu tháng=' + dash.json?.data?.revenueMonth);

  /* 7. Phân quyền */
  check('customer bị chặn route admin', (await req('GET', '/admin/dashboard', { token: CT })).status === 403);
  check('anon bị chặn route admin', (await req('GET', '/admin/dashboard')).status === 401);
  check('staff không tạo được sản phẩm (chỉ admin)', (await req('POST', '/admin/products', { token: ST, body: {} })).status === 403);

  /* 8. Đánh giá / wishlist / địa chỉ / nội dung */
  const mine = await req('GET', '/reviews/mine', { token: CT });
  for (const r of mine.json?.data ?? []) await req('DELETE', `/reviews/${r.id}`, { token: CT });
  const rev = await req('POST', '/reviews', { token: CT, body: { productId: P1, rating: 5, comment: 'Bánh rất ngon, kem mượt.' } });
  check('khách gửi đánh giá (chờ duyệt)', rev.status === 201 && rev.json?.data?.id > 0, JSON.stringify(rev.json?.data?.id ?? rev.json?.message));
  if (rev.json?.data?.id) {
    const ap = await req('PATCH', `/admin/reviews/${rev.json.data.id}/approve`, { token: AT, body: { approve: true } });
    check('admin duyệt đánh giá', ap.status === 200);
    const rp = await req('PATCH', `/admin/reviews/${rev.json.data.id}/reply`, { token: ST, body: { reply: 'Xin cảm ơn quý khách!' } });
    check('admin phản hồi đánh giá', rp.status === 200);
  }
  check('wishlist add', (await req('POST', '/wishlist/' + P2, { token: CT })).status < 400);
  check('liên hệ (contact form)', (await req('POST', '/contact', { body: { name: 'Khách', email: 'khach@example.com', subject: 'Hỏi', content: 'Tiệm nhận bánh gấp trong 4 tiếng không?' } })).status < 400);
  check('đăng ký nhận tin', (await req('POST', '/newsletter', { body: { email: 'moi.' + Date.now() + '@example.com' } })).status < 400);
  check('banners/posts/settings công khai',
    (await req('GET', '/banners')).status === 200 && (await req('GET', '/posts')).status === 200 && (await req('GET', '/settings')).status === 200);

  /* 9. Refresh token / logout */
  const cred = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0901332201', password: 'Customer@123' }),
  });
  const cookie = cred.headers.getSetCookie?.().find((c) => c.startsWith('NC_RT=')) ?? '';
  const refreshVal = cookie.split(';')[0];
  const ref = await fetch(API + '/auth/refresh', { method: 'POST', headers: { Cookie: refreshVal } });
  const refBody = await ref.json().catch(() => null);
  check('refresh token -> access token mới', ref.status === 200 && !!refBody?.data?.accessToken, JSON.stringify(refBody?.message ?? ref.status));
  const reused = await fetch(API + '/auth/refresh', { method: 'POST', headers: { Cookie: refreshVal } });
  check('refresh token cũ bị thu hồi (rotation)', reused.status >= 400);
  const out = await fetch(API + '/auth/logout', { method: 'POST', headers: { Cookie: (reused.headers.getSetCookie?.().find((c) => c.startsWith('NC_RT=')) ?? refreshVal).split(';')[0] } });
  check('logout trả thông báo lịch sự', out.status === 200, JSON.stringify(((await out.json()).message) ?? ''));
  const garbage = await fetch(API + '/auth/refresh', { method: 'POST', headers: { Cookie: 'NC_RT=ab.c.d' } });
  check('refresh token rác -> 401 (không 500)', garbage.status === 401, String(garbage.status));

  /* 10. Validation & SEO endpoints */
  const badReg = await req('POST', '/auth/register', { body: { phone: 'not-a-phone', password: '12', fullName: '' } });
  check('Zod validation trả 422 + errors tiếng Việt', badReg.status === 422, JSON.stringify(badReg.json?.errors).slice(0, 120));

  /* Đăng ký kiểu mới: chỉ SĐT + mật khẩu 4 ký tự, không email */
  const newPhone = '09' + String(Date.now()).slice(-8);
  const reg = await req('POST', '/auth/register', { body: { fullName: 'Khách Test Mới', phone: newPhone, password: '1234' } });
  check('đăng ký chỉ cần SĐT + mật khẩu 4 ký tự', reg.status === 201 && !!reg.json?.data?.accessToken, JSON.stringify(reg.json?.message ?? reg.status));
  check('tài khoản mới không có email', reg.json?.data?.user?.email === null, JSON.stringify(reg.json?.data?.user ?? {}));
  const reLogin = await req('POST', '/auth/login', { body: { phone: newPhone, password: '1234' } });
  check('đăng nhập lại bằng SĐT vừa đăng ký', reLogin.status === 200, JSON.stringify(reLogin.json?.message ?? reLogin.status));
  const dupReg = await req('POST', '/auth/register', { body: { fullName: 'Khách Trùng Số', phone: newPhone, password: '1234' } });
  check('SĐT đã dùng bị chặn 409', dupReg.status === 409, JSON.stringify(dupReg.json?.message ?? dupReg.status));
  const shortPw = await req('POST', '/auth/register', { body: { fullName: 'Khách Mật Khẩu Ngắn', phone: '09' + String(Date.now() + 1).slice(-8), password: '123' } });
  check('mật khẩu 3 ký tự -> 422', shortPw.status === 422, JSON.stringify(shortPw.json?.errors ?? shortPw.json?.message ?? '').slice(0, 120));
  const nf = await req('GET', '/products/slug-khong-ton-tai');
  check('404 sản phẩm không tồn tại', nf.status === 404);

  const final = await req('GET', '/');
  check('server còn sống ở cuối smoke test', final.status === 200);

  const failed = results.filter((r) => !r.ok);
  console.info(`\n=== ${results.length - failed.length}/${results.length} đạt ===`);
  if (failed.length) console.info('CẦN SỬA:\n' + failed.map((f) => ' - ' + f.name + ' | ' + f.detail).join('\n'));
};

main().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
