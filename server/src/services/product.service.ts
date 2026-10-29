import { productRepository as repo } from '../repositories/product.repository.js';
import { catalogRepository } from '../repositories/catalog.repository.js';
import { catalogService } from './catalog.service.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { prisma } from '../config/prisma.js';
import { fail } from '../utils/http.js';
import { buildMeta, parseIdList } from '../utils/pagination.js';
import { productToDetailDTO, productToListDTO, reviewToDTO } from '../utils/dto.js';
import { ensureUniqueSlug } from '../utils/slug.js';
import type { Prisma } from '@prisma/client';
import type { ProductBody, ProductListQuery } from '../validators/product.schema.js';

export const productService = {
  /* ============ Public ============ */
  async list(query: ProductListQuery) {
    const ingredientIds = parseIdList(query.ingredientIds);
    const excludeAllergenIds = parseIdList(query.excludeAllergenIds);
    const categorySlugs = (query.category || '').split(',').map((s) => s.trim()).filter(Boolean);

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q } },
              { shortDescription: { contains: query.q } },
            ],
          }
        : {}),
      ...(categorySlugs.length
        ? { category: { slug: { in: categorySlugs }, deletedAt: null } }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? { price: { gte: query.minPrice ?? 0, lte: query.maxPrice ?? undefined } }
        : {}),
      ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
      ...(query.seasonal !== undefined ? { isSeasonal: query.seasonal } : {}),
      ...(ingredientIds.length ? { ingredients: { some: { ingredientId: { in: ingredientIds } } } } : {}),
      ...(excludeAllergenIds.length
        ? { allergens: { none: { allergenId: { in: excludeAllergenIds } } } }
        : {}),
    };

    const { items, total } = await repo.listProducts({
      where,
      page: query.page,
      perPage: query.perPage,
      sort: query.sort,
    });

    const dtos = items.map((p) => productToListDTO(p as never));

    return { items: dtos, meta: buildMeta(total, query.page, query.perPage) };
  },

  async detail(slug: string) {
    const p = await repo.getBySlug(slug, { onlyActive: true });
    if (!p) throw fail('Không tìm thấy bánh phù hợp.', 404);
    const detail = productToDetailDTO(p as never);
    const related = (await repo.relatedProducts(p.id, p.categoryId)).map((rp) => productToListDTO(rp as never));
    const reviews = await reviewRepository.listByProduct(p.id, 1, 5);
    return {
      product: detail,
      related,
      reviews: {
        items: reviews.items.map(reviewToDTO),
        meta: buildMeta(reviews.total, 1, 5),
        avgRating: p.ratingAvg,
        totalCount: p.ratingCount,
      },
    };
  },

  async reviewsPage(slug: string, page: number, perPage: number) {
    const p = await repo.getBySlug(slug, { onlyActive: true });
    if (!p) throw fail('Không tìm thấy bánh phù hợp.', 404);
    const { items, total } = await reviewRepository.listByProduct(p.id, page, perPage);
    return {
      items: items.map(reviewToDTO),
      meta: buildMeta(total, page, perPage),
      avgRating: p.ratingAvg,
      totalCount: p.ratingCount,
    };
  },

  /* ============ Admin CRUD ============ */
  async adminList(query: {
    page: number; perPage: number; q?: string; categoryId?: number; isActive?: boolean; featured?: boolean; seasonal?: boolean; sort?: string;
  }) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.q ? { name: { contains: query.q } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
      ...(query.seasonal !== undefined ? { isSeasonal: query.seasonal } : {}),
    };
    const { items, total } = await repo.listProducts({
      where,
      page: query.page,
      perPage: query.perPage,
      sort: query.sort || 'newest',
      includeInactive: true,
    });
    const rows = items.map((p) => productToListDTO(p as never));
    return { items: rows, meta: buildMeta(total, query.page, query.perPage) };
  },

  async adminGet(id: number) {
    const p = await repo.getById(id);
    if (!p) throw fail('Không tìm thấy sản phẩm.', 404);
    return productToDetailDTO(p as never);
  },

  async create(body: ProductBody) {
    const category = await catalogRepository.getCategory(body.categoryId);
    if (!category) throw fail('Danh mục không tồn tại.', 404);
    const slug = await ensureUniqueSlug(body.name, (s) => repo.slugExists(s));
    const price = Math.min(...body.variants.map((v) => v.price));
    const product = await repo.createProduct({
      categoryId: body.categoryId,
      name: body.name,
      slug,
      shortDescription: body.shortDescription || null,
      description: body.description || null,
      price,
      compareAtPrice: body.compareAtPrice ?? null,
      isFeatured: body.isFeatured,
      isSeasonal: body.isSeasonal,
      isActive: body.isActive,
    });
    await this.applyRelations(product.id, body);
    const created = await repo.getById(product.id);
    return productToDetailDTO(created as never);
  },

  async update(id: number, body: ProductBody) {
    const existing = await repo.getById(id);
    if (!existing) throw fail('Không tìm thấy sản phẩm.', 404);
    const data: Record<string, unknown> = {};
    if (body.categoryId !== existing.categoryId) {
      const category = await catalogRepository.getCategory(body.categoryId);
      if (!category) throw fail('Danh mục không tồn tại.', 404);
      data.categoryId = body.categoryId;
    }
    if (body.name !== existing.name) {
      const slug = await ensureUniqueSlug(body.name, (s) => repo.slugExists(s, id));
      Object.assign(data, { name: body.name, slug });
    }
    data.shortDescription = body.shortDescription || null;
    data.description = body.description || null;
    data.compareAtPrice = body.compareAtPrice ?? null;
    data.isFeatured = body.isFeatured;
    data.isSeasonal = body.isSeasonal;
    data.isActive = body.isActive;
    data.price = Math.min(...body.variants.map((v) => v.price));
    await repo.updateProduct(id, data);
    await this.applyRelations(id, body);
    const updated = await repo.getById(id);
    return productToDetailDTO(updated as never);
  },

  async applyRelations(productId: number, body: ProductBody) {
    await repo.syncImages(
      productId,
      body.images.map((img) => ({ url: img.url || null, alt: img.alt || null, isPrimary: !!img.isPrimary }))
    );
    await repo.syncVariants(
      productId,
      body.variants.map((v) => ({
        id: v.id,
        name: v.name,
        flavor: v.flavor || null,
        price: v.price,
        isActive: v.isActive,
      }))
    );
    await repo.syncProductIngredients(productId, body.ingredientIds);
    const allergenAuto = await catalogService.allergensFromIngredients(body.ingredientIds);
    const merged = [...new Set([...allergenAuto, ...body.allergenIds])];
    await repo.syncProductAllergens(productId, merged);
  },

  async adminDelete(id: number, hard = false) {
    const existing = await repo.getById(id);
    if (!existing) throw fail('Không tìm thấy sản phẩm.', 404);
    if (hard) {
      await prisma.product.delete({ where: { id } });
      return { id, hard: true };
    }
    await repo.softDeleteProduct(id);
    return { id, hard: false };
  },

  async toggleActive(id: number, isActive: boolean) {
    const existing = await repo.getById(id);
    if (!existing) throw fail('Không tìm thấy sản phẩm.', 404);
    await repo.updateProduct(id, { isActive });
    return { id, isActive };
  },
};
