/* Seed chính của Nini Cakes — chạy: `npm -w server run seed` */
import { PrismaClient, Prisma, OrderStatus, DeliveryType, PaymentMethodType, PaymentStatusType, CouponType, PostType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  CATEGORY_SEEDS,
  ALLERGEN_SEEDS,
  INGREDIENT_SEEDS,
  PRODUCT_SEEDS,
  COUPON_SEEDS,
  BANNER_SEEDS,
  POST_SEEDS,
  FAQ_SEEDS,
  REVIEW_SEEDS,
} from './seed-data.js';
import { vnSlug } from '../src/utils/slug.js';
import { writeProductArtwork, writeBannerArtwork } from './product-art.js';

export const prisma = new PrismaClient();
const CUSTOMER_PASSWORD = 'Customer@123';

const CUSTOMERS = [
  { fullName: 'Nguyễn Thảo Vy', email: 'vy.nguyen@example.com', phone: '0901332201' },
  { fullName: 'Lê Minh Khoi', email: 'khoi.le@example.com', phone: '0902541188' },
  { fullName: 'Trần Bích Ny', email: 'ny.tran@example.com', phone: '0387745099' },
  { fullName: 'Phạm Gia Huy', email: 'huy.pham@example.com', phone: '0764522130' },
  { fullName: 'Đỗ Khánh Linh', email: 'linh.do@example.com', phone: '0961832774' },
];

const SLOTS = ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 21:30'];

interface OrderPlan {
  daysAgo: number;
  who: number;
  status: OrderStatus;
  method: PaymentMethodType;
  coupon?: string;
  pickup?: boolean;
}

const ORDER_PLAN: OrderPlan[] = [
  { daysAgo: 25, who: 0, status: 'COMPLETED', method: 'BANK_TRANSFER' },
  { daysAgo: 21, who: 1, status: 'COMPLETED', method: 'COD' },
  { daysAgo: 17, who: 2, status: 'COMPLETED', method: 'COD', coupon: 'WELCOME10' },
  { daysAgo: 12, who: 3, status: 'COMPLETED', method: 'BANK_TRANSFER' },
  { daysAgo: 9, who: 4, status: 'COMPLETED', method: 'COD', coupon: 'NINI150K' },
  { daysAgo: 6, who: 0, status: 'COMPLETED', method: 'BANK_TRANSFER' },
  { daysAgo: 3, who: 1, status: 'READY', method: 'COD' },
  { daysAgo: 2, who: 2, status: 'SHIPPED', method: 'COD' },
  { daysAgo: 0, who: 3, status: 'PENDING', method: 'BANK_TRANSFER', coupon: 'SAKURA25', pickup: true },
  { daysAgo: 1, who: 4, status: 'CANCELLED', method: 'COD' },
];

const ORDER_FLOWS: Record<OrderStatus, string[]> = {
  PENDING: ['PENDING'],
  CONFIRMED: ['PENDING', 'CONFIRMED'],
  PREPARING: ['PENDING', 'CONFIRMED', 'PREPARING'],
  READY: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
  SHIPPED: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED'],
  COMPLETED: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED'],
  CANCELLED: ['PENDING', 'CANCELLED'],
};

const days = (n: number): Date => new Date(Date.now() + n * 24 * 3600 * 1000);

function createdAtAgo(daysBack: number, shift: number): Date {
  const d = new Date(Date.now() - daysBack * 24 * 3600 * 1000);
  d.setHours(9 + (shift % 9), 15, 0, 0);
  return d;
}

async function wipeAll() {
  await prisma.$transaction([
    prisma.orderStatusHistory.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlist.deleteMany(),
    prisma.review.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.address.deleteMany(),
    prisma.message.deleteMany(),
    prisma.subscriber.deleteMany(),
    prisma.post.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.productAllergen.deleteMany(),
    prisma.productIngredient.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.ingredientAllergen.deleteMany(),
    prisma.ingredient.deleteMany(),
    prisma.allergen.deleteMany(),
    prisma.category.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.storeSetting.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
  ]);
}

interface VariantInfo {
  id: number;
  price: number;
  productId: number;
  productName: string;
  name: string;
}

async function seedDemoOrders(
  adminId: number,
  customerIds: number[],
  addresses: { fullName: string; phone: string }[],
  variants: VariantInfo[],
  coupons: Map<string, { id: number; type: 'PERCENT' | 'AMOUNT'; value: number; minSubtotal: number; maxDiscount: number | null }>
) {
  for (let i = 0; i < ORDER_PLAN.length; i++) {
    const p = ORDER_PLAN[i];
    const created = createdAtAgo(p.daysAgo, i);
    const total = variants.length;
    const first = variants[(i * 3) % total];
    const second = variants[(i * 7 + 5) % total];
    const lines = first.id !== second.id ? [first, second] : [first];
    const items = lines.map((line, idx) => ({ line, quantity: 1 + ((i + idx) % 2) }));
    const subtotal = items.reduce((s, it) => s + it.line.price * it.quantity, 0);

    let couponId: number | null = null;
    let couponCode: string | null = null;
    let discount = 0;
    if (p.coupon && coupons.has(p.coupon)) {
      const c = coupons.get(p.coupon)!;
      if (subtotal >= c.minSubtotal) {
        couponId = c.id;
        couponCode = p.coupon;
        const raw = c.type === 'PERCENT' ? (subtotal * c.value) / 100 : c.value;
        discount = Math.min(Math.round(raw), c.maxDiscount ?? raw);
      }
    }
    const deliveryType: DeliveryType = p.pickup ? 'PICKUP' : 'DELIVERY';
    const shippingFee = deliveryType === 'PICKUP' || subtotal >= 1500000 ? 0 : 30000;
    const finalTotal = subtotal - discount + shippingFee;
    const paymentStatus: PaymentStatusType =
      p.status === 'COMPLETED' || (p.status !== 'PENDING' && p.method === 'BANK_TRANSFER') ? 'PAID' : 'UNPAID';

    const order = await prisma.order.create({
      data: {
        code: `NC${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, '0')}${String(created.getDate()).padStart(2, '0')}${String(101 + i).padStart(3, '0')}`,
        userId: customerIds[p.who],
        status: p.status,
        deliveryType,
        deliveryDate: days(-Math.max(0, p.daysAgo - 1)),
        timeSlot: SLOTS[i % SLOTS.length],
        recipientName: addresses[p.who].fullName,
        recipientPhone: addresses[p.who].phone,
        addressLine: deliveryType === 'DELIVERY' ? `Số ${70 + i} Đường Lê Lợi` : null,
        ward: deliveryType === 'DELIVERY' ? 'Phường Bến Nghé' : null,
        district: deliveryType === 'DELIVERY' ? 'Quận 1' : null,
        city: deliveryType === 'DELIVERY' ? 'TP. Hồ Chí Minh' : null,
        note: i % 2 === 0 ? 'Viết lời chúc mừng sinh nhật lên bánh.' : null,
        subtotal,
        discount,
        shippingFee,
        total: finalTotal,
        couponId,
        couponCode,
        paymentMethod: p.method,
        paymentStatus,
        createdAt: created,
        updatedAt: created,
      },
    });

    for (const it of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: it.line.productId,
          variantId: it.line.id,
          name: it.line.productName,
          variantName: it.line.name,
          unitPrice: it.line.price,
          quantity: it.quantity,
          lineTotal: it.line.price * it.quantity,
        },
      });
      await prisma.product.update({ where: { id: it.line.productId }, data: { soldCount: { increment: it.quantity } } });
      await prisma.productVariant.update({ where: { id: it.line.id }, data: { soldCount: { increment: it.quantity } } });
    }

    const flow = ORDER_FLOWS[p.status];
    for (let h = 0; h < flow.length; h++) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: h === 0 ? null : flow[h - 1],
          toStatus: flow[h],
          note: h === 0 ? 'Khách đặt bánh từ website demo.' : null,
          changedById: adminId,
          createdAt: new Date(created.getTime() + h * 3600 * 1000),
        },
      });
    }

    if (p.status === 'COMPLETED') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: p.method,
          status: 'PAID',
          amount: finalTotal,
          reference: couponCode ? `NCTV-${order.code}` : null,
          paidAt: new Date(created.getTime() + 6 * 3600 * 1000),
          createdAt: created,
          updatedAt: created,
        },
      });
    }
    if (order.couponId) {
      await prisma.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    }
  }
}

async function main() {
  console.info('[seed] Dọn dữ liệu cũ ...');
  await wipeAll();

  /* 1. Vai trò + tài khoản */
  const adminRole = await prisma.role.create({ data: { name: 'ADMIN', description: 'Quản trị toàn bộ hệ thống' } });
  const staffRole = await prisma.role.create({ data: { name: 'STAFF', description: 'Nhân viên cửa hàng, xử lý đơn hàng' } });
  const customerRole = await prisma.role.create({ data: { name: 'CUSTOMER', description: 'Khách hàng của tiệm' } });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ninicakes.vn',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      fullName: 'An Hương (Admin)',
      phone: '02838228888',
      roleId: adminRole.id,
    },
  });
  await prisma.user.create({
    data: {
      email: 'staff@ninicakes.vn',
      passwordHash: await bcrypt.hash('Staff@123', 10),
      fullName: 'Văn Hậu (Nhân viên)',
      phone: '02838228877',
      roleId: staffRole.id,
    },
  });

  const customerIds: number[] = [];
  const customerBrief: { fullName: string; phone: string }[] = [];
  const demoAddress: Omit<Prisma.AddressUncheckedCreateInput, 'userId'> = {
    fullName: '',
    phone: '',
    addressLine: 'Số 72 Phan Kế Bính',
    ward: 'Phường Cai Kông',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    isDefault: true,
  };
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    const u = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: await bcrypt.hash(CUSTOMER_PASSWORD, 10),
        fullName: c.fullName,
        phone: c.phone,
        roleId: customerRole.id,
      },
    });
    customerIds.push(u.id);
    customerBrief.push({ fullName: c.fullName, phone: c.phone });
    await prisma.address.create({
      data: { ...demoAddress, fullName: c.fullName, phone: c.phone, addressLine: `Số ${110 + i * 12} Đường Nguyễn Huệ`, userId: u.id },
    });
  }

  /* 2. Cài đặt cửa hàng */
  await prisma.storeSetting.create({
    data: {
      id: 1,
      name: 'Nini Cakes',
      slogan: 'Hương Á - Âu trong từng chiếc bánh',
      address: '72 Phan Kế Bính, Phường Cai Kông, Quận 1, TP. Hồ Chí Minh',
      phone: '028 3822 8888',
      email: 'hello@ninicakes.vn',
      openingHours: '08:00 - 21:30 mỗi ngày',
      facebook: 'https://facebook.com/ninicakes.vn',
      instagram: 'https://instagram.com/ninicakes.vn',
      zalo: '02838228888',
      bankName: 'Vietcombank - Chi nhánh Sài Gòn',
      bankAccountName: 'CONG TY TNHH NINI CAKES',
      bankAccountNumber: '0071000987654',
      shippingFeeVnd: 30000,
      freeShippingMinVnd: 1500000,
    },
  });

  /* 3. Danh mục */
  const categoryIdBySlug = new Map<string, number>();
  for (let i = 0; i < CATEGORY_SEEDS.length; i++) {
    const c = CATEGORY_SEEDS[i];
    const row = await prisma.category.create({
      data: { name: c.name, slug: c.slug, description: c.description, sortOrder: i + 1 },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }

  /* 4. Dị ứng + thành phần */
  const allergenIdByName = new Map<string, number>();
  for (const a of ALLERGEN_SEEDS) {
    const row = await prisma.allergen.create({ data: { name: a.name, icon: a.icon } });
    allergenIdByName.set(a.name, row.id);
  }
  const ingredientIdByName = new Map<string, number>();
  for (const ing of INGREDIENT_SEEDS) {
    const row = await prisma.ingredient.create({
      data: {
        name: ing.name,
        note: ing.note ?? null,
        allergens: { create: ing.allergenNames.map((n) => ({ allergenId: allergenIdByName.get(n)! })) },
      },
    });
    ingredientIdByName.set(ing.name, row.id);
  }

  /* 5. Sản phẩm + biến thể + thành phần/dị ứng */
  const productIdBySlug = new Map<string, number>();
  for (const p of PRODUCT_SEEDS) {
    const slug = vnSlug(p.name);
    const price = Math.min(...p.variants.map((v) => v.price));
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        shortDescription: p.shortDescription,
        description: p.description,
        categoryId: categoryIdBySlug.get(p.category)!,
        price,
        compareAtPrice: p.compareAtPrice ?? null,
        isFeatured: !!p.isFeatured,
        isSeasonal: !!p.isSeasonal,
      },
    });
    productIdBySlug.set(slug, product.id);

    const artwork = writeProductArtwork(slug, p.name, p.variants[0]?.flavor ?? '', p.category);
    await prisma.productImage.createMany({
      data: artwork.map((a, i) => ({ productId: product.id, url: a.url, alt: a.alt, isPrimary: i === 0, sortOrder: i })),
    });

    for (let i = 0; i < p.variants.length; i++) {
      const v = p.variants[i];
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          flavor: v.flavor ?? null,
          price: v.price,
          stock: v.stock,
          sku: `NC-P${product.id}-${i + 1}`,
        },
      });
    }

    const ingredientIds = p.ingredients.map((n) => ingredientIdByName.get(n)).filter((x): x is number => typeof x === 'number');
    if (ingredientIds.length) {
      await prisma.productIngredient.createMany({
        data: ingredientIds.map((ingredientId) => ({ productId: product.id, ingredientId })),
      });
    }
    const allergenIds = new Set<number>();
    for (const ing of INGREDIENT_SEEDS) {
      if (!p.ingredients.includes(ing.name)) continue;
      ing.allergenNames.forEach((n) => allergenIds.add(allergenIdByName.get(n)!));
    }
    (p.extraAllergens || []).forEach((n) => {
      const id = allergenIdByName.get(n);
      if (id) allergenIds.add(id);
    });
    if (allergenIds.size) {
      await prisma.productAllergen.createMany({
        data: [...allergenIds].map((allergenId) => ({ productId: product.id, allergenId })),
      });
    }
  }

  /* 6. Mã giảm giá */
  const couponsMap = new Map<
    string,
    { id: number; type: 'PERCENT' | 'AMOUNT'; value: number; minSubtotal: number; maxDiscount: number | null }
  >();
  for (const c of COUPON_SEEDS) {
    const row = await prisma.coupon.create({
      data: {
        code: c.code,
        description: c.description,
        type: c.type as CouponType,
        value: c.value,
        minSubtotal: c.minSubtotal,
        maxDiscount: c.maxDiscount,
        maxUses: c.maxUses,
        startsAt: days(-30),
        endsAt: days(180),
      },
    });
    couponsMap.set(c.code, { id: row.id, type: c.type as 'PERCENT' | 'AMOUNT', value: c.value, minSubtotal: c.minSubtotal, maxDiscount: c.maxDiscount });
  }

  /* 7. Banner + bài viết + FAQ */
  const bannerArt = ['hero-sakura', 'hero-cacao'];
  for (let i = 0; i < BANNER_SEEDS.length; i++) {
    const b = BANNER_SEEDS[i];
    const art = b.imageUrl ?? writeBannerArtwork(bannerArt[i] ?? `hero-${i}`, i % 2 === 0 ? 'sakura' : 'cacao');
    await prisma.banner.create({
      data: { title: b.title, subtitle: b.subtitle, imageUrl: art, linkUrl: b.linkUrl, sortOrder: b.sortOrder },
    });
  }
  for (const post of POST_SEEDS) {
    await prisma.post.create({
      data: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        type: post.type as PostType,
        isPublished: post.isPublished,
        publishedAt: new Date(),
        authorId: admin.id,
      },
    });
  }
  for (const faq of FAQ_SEEDS) {
    await prisma.post.create({
      data: {
        slug: faq.slug,
        title: faq.title,
        content: faq.content,
        type: 'FAQ',
        isPublished: true,
        publishedAt: new Date(),
        authorId: admin.id,
      },
    });
  }

  /* 8. Đánh giá công khai + tính lại điểm cho các bánh */
  for (const r of REVIEW_SEEDS) {
    const productId = productIdBySlug.get(r.productSlug);
    if (!productId) continue;
    await prisma.review.create({
      data: {
        productId,
        userId: customerIds[r.userIndex],
        rating: r.rating,
        comment: r.comment,
        isApproved: true,
      },
    });
  }
  const ratingGroups = await prisma.review.groupBy({
    by: ['productId'],
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const g of ratingGroups) {
    await prisma.product.update({
      where: { id: g.productId },
      data: { ratingAvg: Math.round((g._avg.rating || 0) * 10) / 10, ratingCount: g._count._all },
    });
  }

  /* 9. Đơn hàng demo cho dashboard */
  const variants: VariantInfo[] = (
    await prisma.productVariant.findMany({
      select: { id: true, price: true, productId: true, name: true, product: { select: { name: true } } },
      orderBy: { id: 'asc' },
    })
  ).map((v) => ({ id: v.id, price: v.price, productId: v.productId, productName: v.product.name, name: v.name }));
  await seedDemoOrders(admin.id, customerIds, customerBrief, variants, couponsMap);

  /* 10. Wishlist + tin nhắn + subscriber demo */
  const allProductIds = [...productIdBySlug.values()];
  for (let i = 0; i < 3; i++) {
    const uid = customerIds[i % customerIds.length];
    const picks = [allProductIds[(i * 5) % allProductIds.length], allProductIds[(i * 11 + 3) % allProductIds.length]];
    for (const productId of new Set(picks)) {
      await prisma.wishlist.create({ data: { userId: uid, productId } });
    }
  }
  await prisma.message.createMany({
    data: [
      {
        name: 'Hoàng Anh Tuấn',
        email: 'tuan.ha@example.com',
        phone: '0909556688',
        subject: 'Đặt bánh sinh nhật số lượng lớn',
        content: 'Tiệm ơi, công ty em muốn đặt 50 phần bánh kem cho event tháng sau. Tiệm báo giá giúp em nhé!',
      },
      { name: 'Lý Thị Mận', email: 'man.ly@example.com', subject: 'Cảm ơn tiệm', content: 'Bánh ngon và trang trí rất tinh tế, gia đình ai cũng khen. Cảm ơn tiệm!', isRead: true },
      {
        name: 'Khoa Doanh',
        email: 'khoa.doanh@example.com',
        phone: '0912789455',
        subject: 'Hợp tác tặng bánh cho khách',
        content: 'Chúng em muốn hợp tác tặng bánh cho chiến dịch quảng cáo tháng 3. Nhờ tiệm gửi báo giá sớm ạ.',
      },
    ],
  });
  await prisma.subscriber.createMany({
    data: [
      { email: 'vy.nguyen@example.com' },
      { email: 'khoi.le@example.com' },
      { email: 'ny.tran@example.com' },
      { email: 'kim.ngan@example.com' },
      { email: 'tuanphat.k22@example.com' },
    ],
  });

  /* Tổng kết */
  const [users, products, variantsCount, orders, reviews, subs ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.order.count(),
    prisma.review.count(),
    prisma.subscriber.count(),
  ]);
  console.info(`[seed] Xong! users=${users}, products=${products}, variants=${variantsCount}, orders=${orders}, reviews=${reviews}, subscribers=${subs}`);
  console.info('[seed] Admin: admin@ninicakes.vn / Admin@123');
  console.info('[seed] Nhân viên: staff@ninicakes.vn / Staff@123');
  console.info(`[seed] Khách demo: vy.nguyen@example.com / ${CUSTOMER_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[seed] Lỗi:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
