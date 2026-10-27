import { catalogRepository as repo } from '../repositories/catalog.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { fail } from '../utils/http.js';
import { vnSlug, ensureUniqueSlug } from '../utils/slug.js';

export const catalogService = {
  /* ============ Danh mục ============ */
  async listCategories() {
    const rows = await repo.listCategories();
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count.products,
    }));
  },
  async createCategory(input: { name: string; description?: string; sortOrder: number; isActive: boolean }) {
    const slug = await ensureUniqueSlug(input.name, (s) => repo.slugExists(s));
    return repo.createCategory({
      name: input.name,
      slug,
      description: input.description || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
  },
  async updateCategory(id: number, input: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const { existing } = await this.mustCategory(id);
    const data: Record<string, unknown> = {};
    if (input.name && input.name !== existing.name) {
      const slug = await ensureUniqueSlug(input.name, (s) => repo.slugExists(s, id));
      Object.assign(data, { name: input.name, slug });
    }
    if (input.description !== undefined) data.description = input.description || null;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    return repo.updateCategory(id, data);
  },
  async deleteCategory(id: number) {
    const activeCount = await productRepository.listProducts({ where: { categoryId: id, deletedAt: null }, page: 1, perPage: 1, sort: 'newest' });
    if (activeCount.items.length > 0) {
      throw fail('Danh mục vẫn còn sản phẩm. Vui lòng xóa/di chuyển sản phẩm trước.', 409);
    }
    return repo.softDeleteCategory(id);
  },
  async mustCategory(id: number) {
    const existing = await repo.getCategory(id);
    if (!existing) throw fail('Danh mục không tồn tại.', 404);
    return { existing };
  },

  /* ============ Nguyên liệu ============ */
  listIngredients() {
    return repo.listIngredients().then((rows) =>
      rows.map((i) => ({
        id: i.id,
        name: i.name,
        note: i.note,
        allergenIds: i.allergens.map((a) => a.allergenId),
      }))
    );
  },
  async createIngredient(input: { name: string; note?: string; allergenIds?: number[] }) {
    const dup = await repo.getIngredientByName(input.name);
    if (dup) throw fail('Nguyên liệu này đã có trong danh sách.', 409);
    return repo.createIngredient({
      name: input.name,
      note: input.note || null,
      allergenIds: input.allergenIds || [],
    });
  },
  async updateIngredient(id: number, input: { name?: string; note?: string; allergenIds?: number[] }) {
    const existing = await repo.getIngredient(id);
    if (!existing) throw fail('Nguyên liệu không tồn tại.', 404);
    if (input.allergenIds) {
      await repo.setIngredientAllergens(id, input.allergenIds);
    }
    return repo.updateIngredient(id, {
      name: input.name ?? undefined,
      note: input.note !== undefined ? input.note || null : undefined,
    });
  },
  async deleteIngredient(id: number) {
    const existing = await repo.getIngredient(id);
    if (!existing) throw fail('Nguyên liệu không tồn tại.', 404);
    return repo.softDeleteIngredient(id);
  },

  /* ============ Dị ứng ============ */
  listAllergens: () => repo.listAllergens(),
  async createAllergen(input: { name: string; icon?: string }) {
    const dup = await repo.allergenByName(input.name);
    if (dup) throw fail('Thông tin dị ứng đã tồn tại.', 409);
    return repo.createAllergen({ name: input.name, icon: input.icon || null });
  },
  async updateAllergen(id: number, input: { name?: string; icon?: string }) {
    const existing = await repo.allergenById(id);
    if (!existing) throw fail('Thông tin dị ứng không tồn tại.', 404);
    return repo.updateAllergen(id, { name: input.name ?? undefined, icon: input.icon !== undefined ? input.icon || null : undefined });
  },
  async deleteAllergen(id: number) {
    const existing = await repo.allergenById(id);
    if (!existing) throw fail('Thông tin dị ứng không tồn tại.', 404);
    return repo.deleteAllergen(id);
  },

  /** Cập nhật danh sách dị ứng của 1 sản phẩm theo nguyên liệu đã chọn */
  async allergensFromIngredients(ingredientIds: number[]): Promise<number[]> {
    if (!ingredientIds.length) return [];
    const links = await repo.getIngredientAllergens(ingredientIds);
    return [...new Set(links.map((l) => l.allergenId))];
  },

  dust() {
    void vnSlug;
  },
};
