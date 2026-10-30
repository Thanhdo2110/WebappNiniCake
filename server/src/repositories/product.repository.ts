import { prisma } from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

/** Biến thể đang bật, rẻ nhất trước — đủ để DTO tính defaultVariantId và priceMax.
    ProductBody giới hạn tối đa 10 biến thể nên nạp hết cũng không nặng. */
const listVariantInclude = {
  variants: { where: { isActive: true }, orderBy: { price: 'asc' as const } },
};

export const productRepository = {
  /** Danh sách sản phẩm (khách + admin) */
  async listProducts(params: {
    where: Prisma.ProductWhereInput;
    page: number;
    perPage: number;
    sort: string;
    includeInactive?: boolean;
  }) {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      params.sort === 'price_asc'
        ? [{ price: 'asc' }]
        : params.sort === 'price_desc'
          ? [{ price: 'desc' }]
          : params.sort === 'popular'
            ? [{ soldCount: 'desc' }, { ratingAvg: 'desc' }]
            : params.sort === 'rating'
              ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }]
              : [{ createdAt: 'desc' }, { id: 'desc' }];

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: params.where,
        orderBy,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        include: {
          category: { select: { name: true, slug: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          ...listVariantInclude,
        },
      }),
      prisma.product.count({ where: params.where }),
    ]);
    return { items, total };
  },

  async getBySlug(slug: string, opts: { onlyActive?: boolean } = {}) {
    return prisma.product.findFirst({
      where: {
        slug,
        ...(opts.onlyActive ? { isActive: true, deletedAt: null } : { deletedAt: null }),
      },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: { orderBy: [{ isActive: 'desc' }, { price: 'asc' }] },
        ingredients: { include: { ingredient: { include: { allergens: { include: { allergen: true } } } } } },
        allergens: { include: { allergen: true } },
      },
    });
  },
  async getById(id: number) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: { orderBy: [{ isActive: 'desc' }, { price: 'asc' }] },
        ingredients: { include: { ingredient: { include: { allergens: { include: { allergen: true } } } } } },
        allergens: { include: { allergen: true } },
      },
    });
  },
  async relatedProducts(productId: number, categoryId: number, take = 4) {
    return prisma.product.findMany({
      where: { categoryId, isActive: true, deletedAt: null, id: { not: productId } },
      take,
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        category: { select: { name: true, slug: true } },
        ...listVariantInclude,
      },
    });
  },
  async featuredTake(take: number) {
    return prisma.product.findMany({
      where: { isActive: true, deletedAt: null, isFeatured: true },
      take,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        category: { select: { name: true, slug: true } },
        ...listVariantInclude,
      },
    });
  },
  async seasonalTake(take: number) {
    return prisma.product.findMany({
      where: { isActive: true, deletedAt: null, isSeasonal: true },
      take,
      orderBy: [{ soldCount: 'desc' }],
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        category: { select: { name: true, slug: true } },
        ...listVariantInclude,
      },
    });
  },
  async bestsellersTake(take: number) {
    return prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      take,
      orderBy: [{ soldCount: 'desc' }, { ratingAvg: 'desc' }],
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        category: { select: { name: true, slug: true } },
        ...listVariantInclude,
      },
    });
  },

  slugExists: async (slug: string, excludeId?: number) => {
    const count = await prisma.product.count({ where: { slug, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    return count > 0;
  },

  /* ============ Admin CRUD ============ */
  async createProduct(data: {
    categoryId: number; name: string; slug: string; shortDescription?: string | null; description?: string | null;
    price: number; compareAtPrice?: number | null; isFeatured: boolean; isSeasonal: boolean; isActive: boolean;
  }) {
    return prisma.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        slug: data.slug,
        shortDescription: data.shortDescription ?? null,
        description: data.description ?? null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        isFeatured: data.isFeatured,
        isSeasonal: data.isSeasonal,
        isActive: data.isActive,
      },
    });
  },
  async updateProduct(id: number, data: {
    categoryId?: number; name?: string; slug?: string; shortDescription?: string | null; description?: string | null;
    price?: number; compareAtPrice?: number | null; isFeatured?: boolean; isSeasonal?: boolean; isActive?: boolean;
  }) {
    return prisma.product.update({ where: { id }, data });
  },
  softDeleteProduct: (id: number) => prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }),
  restoreProduct: (id: number) => prisma.product.update({ where: { id }, data: { deletedAt: null } }),

  /* ============ Ảnh / biến thể / thành phần ============ */
  async syncImages(productId: number, images: { url?: string | null; alt?: string | null; isPrimary?: boolean }[]) {
    await prisma.productImage.deleteMany({ where: { productId } });
    if (!images.length) return;
    const hasPrimary = images.some((i) => i.isPrimary);
    await prisma.productImage.createMany({
      data: images.map((img, idx) => ({
        productId,
        url: img.url || null,
        alt: img.alt || null,
        isPrimary: hasPrimary ? !!img.isPrimary : idx === 0,
        sortOrder: idx,
      })),
    });
  },
  async syncVariants(
    productId: number,
    variants: { id?: number; name: string; flavor?: string | null; price: number; isActive: boolean }[]
  ) {
    const existing = await prisma.productVariant.findMany({ where: { productId }, select: { id: true, sku: true } });
    const keepIds = variants.map((v) => v.id).filter((x): x is number => typeof x === 'number');
    await prisma.productVariant.deleteMany({
      where: { productId, id: { notIn: keepIds } },
    });
    let counter = existing.length + 1;
    for (const v of variants) {
      const data = {
        name: v.name,
        flavor: v.flavor || null,
        price: v.price,
        isActive: v.isActive,
      };
      if (v.id) {
        await prisma.productVariant.update({ where: { id: v.id }, data });
      } else {
        await prisma.productVariant.create({
          data: { ...data, productId, sku: `NC-${productId}-${Date.now()}-${counter++}` },
        });
      }
    }
  },
  async syncProductIngredients(productId: number, ingredientIds: number[], quantities?: Map<number, string>) {
    await prisma.productIngredient.deleteMany({ where: { productId } });
    if (!ingredientIds.length) return;
    await prisma.productIngredient.createMany({
      data: ingredientIds.map((ingredientId) => ({
        productId,
        ingredientId,
        quantity: quantities?.get(ingredientId) || null,
      })),
      skipDuplicates: true,
    });
  },
  async syncProductAllergens(productId: number, allergenIds: number[]) {
    await prisma.productAllergen.deleteMany({ where: { productId } });
    if (!allergenIds.length) return;
    await prisma.productAllergen.createMany({
      data: allergenIds.map((allergenId) => ({ productId, allergenId })),
      skipDuplicates: true,
    });
  },
  getVariantById: (id: number) =>
    prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true, slug: true, isActive: true, deletedAt: true } } },
    }),

  async minPriceOf(productId: number) {
    const agg = await prisma.productVariant.aggregate({ where: { productId, isActive: true }, _min: { price: true } });
    return agg._min.price;
  },
  incrementSold(variantId: number, productId: number, qty: number) {
    return [
      prisma.productVariant.update({ where: { id: variantId }, data: { soldCount: { increment: qty } } }),
      prisma.product.update({ where: { id: productId }, data: { soldCount: { increment: qty } } }),
    ];
  },
};
