import { identityRepository as identityRepo } from '../repositories/identity.repository.js';
import { contentRepository as repo } from '../repositories/content.repository.js';
import { fail } from '../utils/http.js';
import { userToDTO, settingsToDTO } from '../utils/dto.js';
import { buildMeta } from '../utils/pagination.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import type { ProfileSchemaT, AddressZod } from '../validators/auth-helpers.js';

export const userService = {
  async profile(userId: number) {
    const user = await identityRepo.findById(userId);
    if (!user) throw fail('Không tìm thấy tài khoản.', 404);
    const stats = await identityRepo.userStats(userId);
    return { user: userToDTO(user), stats };
  },
  async updateProfile(userId: number, input: ProfileSchemaT) {
    const data: Record<string, unknown> = { fullName: input.fullName };
    data.phone = input.phone || null;
    data.avatarUrl = input.avatarUrl || null;
    const user = await identityRepo.updateProfile(userId, data as never);
    return userToDTO(user);
  },

  /* ---- Sổ địa chỉ ---- */
  listAddresses: (userId: number) => identityRepo.listAddresses(userId),
  async createAddress(userId: number, input: AddressZod) {
    return identityRepo.createAddress(userId, {
      fullName: input.fullName,
      phone: input.phone,
      addressLine: input.addressLine,
      ward: input.ward || null,
      district: input.district || null,
      city: input.city,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      mapsUrl: input.mapsUrl ?? null,
      isDefault: !!input.isDefault,
    });
  },
  async updateAddress(userId: number, id: number, input: Partial<AddressZod>) {
    const existing = await identityRepo.getAddress(userId, id);
    if (!existing) throw fail('Địa chỉ không tồn tại.', 404);
    return identityRepo.updateAddress(userId, id, input as never);
  },
  async deleteAddress(userId: number, id: number) {
    const existing = await identityRepo.getAddress(userId, id);
    if (!existing) throw fail('Địa chỉ không tồn tại.', 404);
    await identityRepo.softDeleteAddress(userId, id);
    return { id };
  },

  /* ---- Yêu thích ---- */
  async wishlist(userId: number) {
    const rows = await identityRepo.listWishlist(userId);
    return rows.map((w) => ({
      id: w.product.id,
      name: w.product.name,
      slug: w.product.slug,
      price: w.product.price,
      compareAtPrice: w.product.compareAtPrice,
      shortDescription: w.product.shortDescription,
      isActive: w.product.isActive,
      ratingAvg: w.product.ratingAvg,
      ratingCount: w.product.ratingCount,
      imageUrl: w.product.images[0]?.url ?? null,
    }));
  },
  async addWishlist(userId: number, productId: number) {
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw fail('Sản phẩm không tồn tại.', 404);
    await identityRepo.addToWishlist(userId, productId);
    return { productId, wishlisted: true };
  },
  async removeWishlist(userId: number, productId: number) {
    await identityRepo.removeFromWishlist(userId, productId);
    return { productId, wishlisted: false };
  },

  /* ---- Quản trị khách hàng / nhân viên ---- */
  async adminListUsers(role: 'ADMIN' | 'STAFF' | 'CUSTOMER', q: string | undefined, page: number, perPage: number) {
    const roleNames = [role];
    const { items, total } = await identityRepo.listUsers({ roleNames, q, page, perPage });
    return {
      items: items.map((u) => ({
        ...userToDTO(u),
        orderCount: u._count.orders,
      })),
      meta: buildMeta(total, page, perPage),
    };
  },
  async blockUser(id: number, blocked: boolean) {
    const user = await identityRepo.findById(id);
    if (!user) throw fail('Không tìm thấy tài khoản.', 404);
    if (user.role?.name === 'ADMIN') throw fail('Không thể khóa tài khoản admin.', 409);
    await identityRepo.setUserStatus(id, blocked ? 'BLOCKED' : 'ACTIVE');
    if (blocked) await identityRepo.revokeAllUserTokens(id);
    return { id, blocked };
  },
  async adminToggle(id: number) {
    const user = await identityRepo.findById(id);
    if (!user) throw fail('Không tìm thấy tài khoản vùng này.', 404);
    if (user.role?.name === 'ADMIN') throw fail('Không thể xóa tài khoản admin.', 409);
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await identityRepo.revokeAllUserTokens(id);
    return { id };
  },
  async adminDetail(id: number) {
    const user = await identityRepo.findById(id);
    if (!user) throw fail('Không tìm thấy tài khoản.', 404);
    const stats = await identityRepo.userStats(id);
    const orders = await prisma.order.findMany({
      where: { userId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, code: true, status: true, total: true, createdAt: true },
    });
    return { user: userToDTO(user), stats, orders };
  },

  /* ---- Tạo nhân viên (admin) ---- */
  async createStaff(input: { fullName: string; email: string; password: string; role: 'STAFF' | 'ADMIN' }) {
    const exists = await identityRepo.findByEmail(input.email);
    if (exists) throw fail('Email đã được dùng.', 409);
    const role = await identityRepo.findRole(input.role);
    if (!role) throw fail('Vai trò chưa kết seed. Vui lòng chạy npm run seed.', 500);
    const hash = await bcrypt.hash(input.password, 10);
    return identityRepo.createUser({ roleId: role.id, email: input.email, passwordHash: hash, fullName: input.fullName });
  },

  settings: {
    public: async () => settingsToDTO(await repo.ensureSettings()),
    async update(input: Record<string, unknown>) {
      await repo.ensureSettings();
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) clean[k] = v === '' ? null : v;
      const updated = await repo.updateSettings(clean);
      return settingsToDTO(updated);
    },
    messages: {
      list: async (page: number, perPage: number) => {
        const [items, total] = await repo.listMessages(page, perPage);
        return {
          items: items.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
          meta: buildMeta(total, page, perPage),
        };
      },
      markRead: async (id: number) => {
        await repo.markMessageRead(id);
        return { id, isRead: true };
      },
    },
  },
};
