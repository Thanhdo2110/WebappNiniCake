# Nini Cakes — Storefront + Admin + REST API

Tiệm bánh Á–Âu phong cách “kem ngà”: một API dùng chung, một storefront cho khách và một dashboard cho quản trị viên.
Monorepo npm workspaces: `server` (Express + Prisma + MySQL 8), `customer-web` và `admin-web` (React + Vite), `shared` (types, Zod-adjacent constants, tiền tệ, trạng thái đơn).

```
customer-web (React, :5173) ─┐
                             ├─► server (Express, :4000) ─► MySQL 8 (:3308)
admin-web    (React, :5174) ─┘            └─► /uploads (ảnh) · /api-docs (Swagger) · /sitemap.xml
```

---

## 1. Chạy nhanh nhất (Docker)

```bash
cp .env.example .env          # đổi JWT_ACCESS_SECRET / JWT_REFRESH_SECRET trước khi deploy thật
docker compose up -d --build  # mysql + server + customer-web + admin-web
```

| Dịch vụ | URL |
| --- | --- |
| Storefront | http://localhost:8080 |
| Admin | http://localhost:8081 |
| API | http://localhost:4000/api/v1 |
| Swagger UI | http://localhost:4000/api-docs |
| OpenAPI JSON | http://localhost:4000/openapi.json |
| MySQL | `localhost:3308` (user `nini`, db `ninicakes`) |

Container `server` tự chạy `prisma migrate deploy` rồi `prisma seed` (bỏ qua nếu dữ liệu đã tồn tại).

## 2. Chạy local cho phát triển

Điều kiện: Node.js ≥ 20, Docker (chỉ để chạy MySQL).

```bash
npm install                    # cài cho cả 4 workspace
npm run db:up                  # docker compose up -d mysql
cp .env.example server/.env    # server đọc server/.env (DATABASE_URL trỏ localhost:3308)
npm run db:migrate             # prisma migrate deploy
npm run db:seed                # 24 sản phẩm + 46 biến thể + đơn hàng + đánh giá + ảnh minh họa
npm run dev                    # server :4000 + customer :5173 + admin :5174
```

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | chạy cả 3 tiến trình (concurrently) |
| `npm run dev:server` / `dev:customer` / `dev:admin` | chạy lẻ từng phần |
| `npm run build` | build production cả 3 workspace |
| `npm run typecheck` | `tsc --noEmit` cho server + 2 web |
| `npm run lint` | ESLint flat config (`eslint.config.mjs`) |
| `npm test` | 21 unit test (vitest): đơn giá, giỏ, coupon, trạng thái đơn |
| `npm -w server run check:api` | 50 kiểm tra HTTP end-to-end + quét toàn bộ route GET và route ghi tìm lỗi 500 |
| `node scripts/shot.mjs` | chụp 32 trang thật bằng Chrome headless (CDP), báo lỗi console/network → `scripts/shots/*.png` |
| `node scripts/erd.mjs` | tái sinh `docs/ERD.md` từ `schema.prisma` |

`ONLY=home,products node scripts/shot.mjs` chụp vài trang; `NO_ADMIN=1` bỏ phần dashboard.

## 3. Tài khoản mẫu (sau khi seed)

| Vai trò | Đăng nhập | Mật khẩu | Dùng ở |
| --- | --- | --- | --- |
| Quản trị | `admin@ninicakes.vn` | `Admin@123` | admin-web (đầy đủ quyền, bao gồm xóa cứng & nhân viên) |
| Nhân viên | `staff@ninicakes.vn` | `Staff@123` | admin-web (không có trang Admin/Settings-Xóa) |
| Khách | `vy.nguyen@example.com` | `Customer@123` | customer-web (có lịch sử đơn, địa chỉ, đánh giá) |

Khách demo còn lại: `khoi.le@`, `ny.tran@`, `huy.pham@`, `linh.do@example.com` — cùng mật khẩu `Customer@123`.
Mã giảm giá đang mở: `WELCOME10` (−10%, tối đa 100.000đ, đơn từ 200.000đ), `NINI150K` (−150.000đ, đơn từ 500.000đ), `SAKURA25` (−25% bánh theo mùa, tối đa 250.000đ).

## 4. API

* Base path `/api/v1`, trả envelope thống nhất:

```json
{ "success": true, "message": "…", "data": …, "meta": { "page": 1, "perPage": 12, "total": 24, "totalPages": 2 } }
```

* Lỗi: `400/401/403/404/409/422/429/500` với `{ success:false, message, errors? }`. Zod fail → `422` kèm message tiếng Việt từng trường.
* Phân trang/lọc danh sách bánh: `page, perPage(≤50), q, category, minPrice, maxPrice, ingredientIds, excludeAllergenIds, featured, seasonal, sort=newest|price_asc|price_desc|popular|rating`.
* Auth: access token (JWT, `Authorization: Bearer`) + refresh token hết hạn 7 ngày, **lưu dạng hash** trong `refresh_tokens`, xoay vòng mỗi lần refresh, thu hồi khi logout. Cookie `NC_RT` (httpOnly, `path=/api/v1/auth`, SameSite=Lax).
* Quyền: `requireAuth` → `optionalAuth` → `requireStaff` (ADMIN|STAFF) → `requireAdmin`. Mọi route `/admin/*` đều kiểm tra quyền ở server, không dựa vào ẩn menu.
* Giỏ hàng khách vãng lai: cookie `NC_VID` (token giỏ, httpOnly, 1 năm), tự gộp vào giỏ tài khoản khi đăng nhập.
* Ảnh: `POST /uploads` (khách, attach ảnh tham khảo) và `POST /admin/uploads` (staff) — Multer memory storage, chỉ `image/*`, giới hạn `MAX_UPLOAD_MB`, ghi ra `UPLOAD_DIR` hoặc Cloudinary khi `UPLOAD_DRIVER=cloudinary`.
* Bảo mật: Helmet, CORS allow-list từ `CLIENT_ORIGINS`, rate limit 400 request/phút cho `/api/*` và 40 request/10 phút cho các route auth (login/register/forgot/reset), kiểm tra tồn kho & giá **ở server trong transaction** khi checkout, số tiền không nhận từ client.
* SEO: `GET /sitemap.xml` (sinh động theo sản phẩm đang bán + bài viết đã xuất bản), `robots.txt`, meta/OG từng trang qua `useSeo`, URL thân thiện `/san-pham/<slug>`.
* SEO: `GET /sitemap.xml` (sinh động theo sản phẩm đang bán + bài viết đã xuất bản), `robots.txt`, meta/OG từng trang qua `useSeo`, URL thân thiện `/san-pham/<slug>`.

## 5. Cơ sở dữ liệu

27 bảng MySQL (snake_case qua `@@map`), 28 quan hệ, index phụ cho cột lọc, `deletedAt` cho 9 bảng (soft delete).
Sơ đồ đầy đủ + ghi chú thiết kế: **[docs/ERD.md](docs/ERD.md)** (sinh tự động bằng `node scripts/erd.mjs`).

Seed: 7 user · 5 danh mục · 24 sản phẩm · 46 biến thể · 72 ảnh minh họa SVG (3 góc/bánh) · 22 nguyên liệu · 6 nhóm dị ứng · 9 bài viết (câu chuyện, chính sách, hỏi đáp) · 2 banner · 10 đơn hàng ở nhiều trạng thái · 8 đánh giá · 3 mã giảm giá · 3 tin nhắn liên hệ · 5 email đăng ký nhận tin.

## 6. Đã hoàn thành

**Khách** — trang chủ (banner, danh mục, nổi bật, theo mùa, bán chạy, câu chuyện, đánh giá, đăng ký tin), danh sách bánh (lọc vị/dị ứng giá/sort/tìm kiếm/phân trang), chi tiết (thư viện 3 góc, biến thể, nguyên liệu & dị ứng, đánh giá có phân trang, bánh liên quan), tùy chỉnh bánh (kích cỡ, vị, lời chúc ≤60 ký tự, ghi chú, **ảnh tham khảo**), giỏ hàng khách vãng lai, checkout (giao hàng/tự lấy, ngày + khung giờ, địa chỉ, coupon, COD/chuyển khoản QR), tài khoản (đăng nhập/đăng ký/quên–đặt lại mật khẩu, hồ sơ, đổi mật khẩu, địa chỉ, đơn hàng + theo dõi + hủy, yêu thích, đánh giá của tôi), trang tĩnh Về/Liên hệ (map)/Chính sách/Hỏi đáp, 404.

**Admin** — dashboard (KPI, biểu đồ 14 ngày, cảnh báo tồn kho ≤6, đơn chờ), sản phẩm (CRUD + nhiều ảnh + đặt ảnh chính + biến thể + nguyên liệu/dị ứng + soft delete), danh mục, nguyên liệu & dị ứng, đơn hàng (lọc theo trạng thái, đổi trạng thái theo luồng hợp lệ, đổi thanh toán, in phiếu giao bếp, hủy), khách hàng (xem lịch sử, chặn/mở khóa), coupon (validate + giới hạn sử dụng), kiểm duyệt & phản hồi đánh giá, nội dung (banner, bài viết, cài đặt tiệm, tin nhắn/đăng ký), báo cáo (doanh thu, top sản phẩm, khách hàng, đơn hàng + 5 file CSV gồm cả danh sách email đăng ký), nhân viên (đổi role), phân quyền ADMIN/STAFF.

**Kiểm chứng đã chạy trên máy này**: `npm run build` + `typecheck` + `lint` sạch; 21/21 unit test; 50/50 smoke HTTP; 0 lỗi 500 trên mọi route GET và route ghi; 32 trang render không lỗi console/network.

## 7. Thiết kế

Bảng màu kem ngà: `#FAF6F0` nền, `#EFE6DA` lớp phụ, `#4A3426`/`#5B4636` chữ, `#C9A96E` champagne, `#E9CFC9` đào nhạt, `#A9B8A0` sage — token trong `customer-web/src/styles/tokens.css` và `admin-web/src/styles`.
Heading serif (Playfair Display / Cormorant fallback Georgia), body Inter/Be Vietnam Pro; bo góc 12–20px, hairline champagne, motif seigaiha + hoa anh đào vẽ SVG, animation fade/rise 240–320ms `ease-out`, tôn trọng `prefers-reduced-motion`. Mobile-first, focus-visible, label/aria cho form, alt tiếng Việt cho ảnh.

## 8. Giả định đã dùng

1. **Tiền là số nguyên VNĐ** (`INT`) ở mọi cột giá — không dùng DECIMAL/float để tránh sai số; `formatVND` định dạng `1.500.000 ₫`.
2. **Ảnh sản phẩm là SVG minh họa sinh lúc seed** (72 file, 3 góc/bánh) vì không có ảnh thật kèm theo đề bài; admin có thể upload ảnh thật, ảnh upload ghi vào `server/uploads` (hoặc Cloudinary).
3. **Không có dịch vụ email thật**: mã OTP đặt lại mật khẩu in ra console server (và `resetPassword` chấp nhận mã đó); webhook ngân hàng chưa tích hợp — chuyển khoản được ghi nhận qua `paymentStatus` do admin cập nhật (COD mặc định).
4. **Biến thể là nguồn tồn kho duy nhất**; `product.price` là giá thấp nhất trong các biến thể đang bán, dùng cho lọc/sort.
5. **Trạng thái đơn theo luồng**: `PENDING → CONFIRMED → PREPARING → SHIPPED/READY → COMPLETED`, có thể `CANCELLED` từ `PENDING/CONFIRMED/PREPARING`; chiều ngược lại bị chặn ở tầng service.
6. **Hủy đơn**: khách chỉ tự hủy khi đơn chưa sang `SHIPPED/READY/COMPLETED`; admin hủy kèm lý do, hoàn tồn kho trong cùng transaction.
7. **Vai trò**: đúng 3 nhóm ADMIN/STAFF/CUSTOMER (bảng `roles` + `permissions` trong `shared`), chưa có ma trận quyền tùy biến theo từng nhân viên.
8. **Giờ mở cửa 08:00–21:30**, 6 khung giao hàng cố định, đặt trước tối đa 45 ngày, tối đa 20 phần/mỗi biến thể trong giỏ.
9. **Phí ship**: 30.000đ, miễn phí từ 1.500.000đ — admin sửa trong *Cài đặt tiệm*.
10. **Danh mục/URL tiếng Việt không dấu** (`/banh`, `/san-pham/banh-kem-socola-den-valrhona`) để slug ổn định; tiêu đề và mô tả tiếng Việt có dấu.
11. **Docker Compose dùng cho môi trường dev/staging**; production thật nên thêm CDN cho `/uploads`, backup MySQL, và secrets manager thay vì `.env`.
12. **Không dùng dữ liệu giả dạng “lorem”**: mọi nội dung, địa chỉ, số điện thoại, bài viết đều là nội dung tiếng Việt hợp lý do dự án tự biên soạn.

## 9. Cấu trúc thư mục

```
.
├─ shared/src            types.ts · constants.ts · money.ts · order-status.ts
├─ server
│  ├─ prisma             schema.prisma · migrations · seed.ts · seed-data.ts · product-art.ts
│  ├─ src
│  │  ├─ routes          index.ts (100 route, chia nhóm khách/nhân viên/admin)
│  │  ├─ controllers     auth · cart · commerce · content · me · product · report · upload · order
│  │  ├─ services        logic nghiệp vụ (giá, coupon, tồn kho, trạng thái, SEO, upload)
│  │  ├─ repositories    Prisma queries
│  │  ├─ middlewares     auth · cart · validate · error · (helmet/cors/rate-limit ở app.ts)
│  │  ├─ validators      Zod schemas
│  │  ├─ docs            openapi.ts
│  │  └─ utils           http (envelope + bindController) · dto · totals · pagination · mail
│  ├─ scripts            smoke.http.mjs · sweep-get.ts · sweep-write.ts
│  └─ tests              totals · coupon-rules · order-flow (vitest)
├─ customer-web/src      pages · components · hooks · lib · styles
├─ admin-web/src         pages (19) · components · hooks · lib · styles
├─ scripts               shot.mjs (CDP screenshot) · erd.mjs (sinh docs/ERD.md)
├─ docs/ERD.md           sơ đồ quan hệ + cột + index + soft delete
└─ docker-compose.yml    mysql · server · customer-web · admin-web
```

## 10. Gợi ý mở rộng

Thanh toán online thật (VNPay/MoMo webhook + xác thực callback), gửi email/SMS qua provider, tìm kiếm full-text (MySQL ngram hoặc MeiliSearch), ảnh Cloudinary có biến thể `w_600,q_70`, WebSocket báo đơn mới cho admin, và i18n nếu cần thêm ngôn ngữ.
