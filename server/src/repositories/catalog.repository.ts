import { prisma } from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const catalogRepository = {
  /* ============ Categories ============ */
  async listCategories(options: { includeInactive?: boolean } = {}) {
    return prisma.category.findMany({
      where: options.includeInactive ? {} : { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { products: { where: { deletedAt: null, isActive: true } } } } },
    });
  },
  async getCategoryBySlug(slug: string) {
    return prisma.category.findFirst({ where: { slug, deletedAt: null } });
  },
  async getCategory(id: number) {
    return prisma.category.findFirst({ where: { id, deletedAt: null } });
  },
  async slugExists(slug: string, excludeId?: number) {
    const count = await prisma.category.count({ where: { slug, deletedAt: null, ...(excludeId ? { id: { not: excludeId } }: {}) } });
    return count > 0;
  },
  async createCategory(data: { name: string; slug: string; description?: string | null; sortOrder: number; isActive: boolean }) {
    return prisma.category.create({ data });
  },
  async updateCategory(id: number, data: { name?: string; slug?: string; description?: string | null; sortOrder?: number; isActive?: boolean }) {
    return prisma.category.update({ where: { id }, data });
  },
  async softDeleteCategory(id: number) {
    return prisma.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  },

  /* ============ Ingredients ============ */
  listIngredients: () =>
    prisma.ingredient.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { allergens: { include: { allergen: true } } },
    }),
  async getIngredient(id: number) {
    return prisma.ingredient.findFirst({ where: { id, deletedAt: null } });
  },
  /** Tên có unique index nên phải tìm cả bản ghi đã xóa mềm */
  getIngredientByName: (name: string) =>
    prisma.ingredient.findUnique({ where: { name } }),
  restoreIngredient: (id: number) =>
    prisma.ingredient.update({ where: { id }, data: { deletedAt: null } }),
  createIngredient: (data: { name: string; note?: string | null; allergenIds?: number[] }) =>
    prisma.ingredient.create({
      data: {
        name: data.name,
        note: data.note ?? null,
        allergens: { create: (data.allergenIds || []).map((allergenId) => ({ allergenId })) },
      },
    }),
  updateIngredient: (id: number, data: { name?: string; note?: string | null }) =>
    prisma.ingredient.update({ where: { id }, data }),
  setIngredientAllergens: (id: number, allergenIds: number[]) =>
    prisma.$transaction([
      prisma.ingredientAllergen.deleteMany({ where: { ingredientId: id } }),
      prisma.ingredientAllergen.createMany({
        data: allergenIds.map((allergenId) => ({ ingredientId: id, allergenId })),
        skipDuplicates: true,
      }),
      prisma.ingredient.findUnique({ where: { id } }),
    ]),
  softDeleteIngredient: (id: number) =>
    prisma.ingredient.update({ where: { id }, data: { deletedAt: new Date() } }),

  /* ============ Allergens ============ */
  listAllergens: () => prisma.allergen.findMany({ orderBy: { id: 'asc' } }),
  getIngredientAllergens: (ingredientIds: number[]) =>
    prisma.ingredientAllergen.findMany({
      where: { ingredientId: { in: ingredientIds } },
      select: { ingredientId: true, allergenId: true },
    }),
  createAllergen: (data: { name: string; icon?: string | null }) => prisma.allergen.create({ data }),
  allergenByName: (name: string) => prisma.allergen.findUnique({ where: { name } }),
  updateAllergen: (id: number, data: { name?: string; icon?: string | null }) =>
    prisma.allergen.update({ where: { id }, data }),
  async deleteAllergen(id: number) {
    return prisma.allergen.delete({ where: { id } });
  },
  allergenById: (id: number) => prisma.allergen.findUnique({ where: { id } }),
};

export type CatalogCategoryWhere = Prisma.CategoryWhereInput;
