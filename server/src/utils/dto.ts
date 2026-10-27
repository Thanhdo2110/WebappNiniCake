import type {
  Cart as CartModel,
  Order as OrderModel,
  Review,
  Prisma,
  RoleName,
  UserStatus,
} from '@prisma/client';
import type {
  CartItemDTO,
  CartSummaryDTO,
  OrderDTO,
  OrderItemDTO,
  OrderStatusHistoryDTO,
  ProductDetailDTO,
  ProductListDTO,
  PublicUserDTO,
  StoreSettingsDTO,
} from '@ninicakes/shared';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: { select: { name: true; slug: true } };
    images: { select: { url: true; alt: true; isPrimary: true; sortOrder: true } };
    variants: { select: { id: true; name: true; flavor: true; price: true; isActive: true; stock: true; sku: true; productId: true } };
    ingredients: { include: { ingredient: { include: { allergens: { include: { allergen: true } } } } } };
    allergens: { include: { allergen: true } };
  };
}>;

/** Ưu tiên ảnh: isPrimary, url có giá trị */
export function primaryImage(i: { url: string | null; isPrimary?: boolean; sortOrder?: number }[]): string | null {
  const usable = (i || []).filter((x) => x.url);
  if (!usable.length) return null;
  usable.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || (a.sortOrder || 0) - (b.sortOrder || 0));
  return usable[0].url ?? null;
}

type UserLike = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  role?: { name: RoleName } | null;
};

export function userToDTO(u: UserLike): PublicUserDTO {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role?.name || 'CUSTOMER',
    status: u.status as PublicUserDTO['status'],
  };
}

export function productToListDTO(p: ProductWithRelations): ProductListDTO {
  const category = 'category' in p ? (p.category as { name: string; slug: string } | null) : null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    categoryId: p.categoryId,
    categoryName: category?.name,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    isFeatured: p.isFeatured,
    isSeasonal: p.isSeasonal,
    isActive: p.isActive,
    soldCount: p.soldCount,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    imageUrl: primaryImage(p.images as { url: string | null; isPrimary: boolean; sortOrder: number }[]),
    createdAt: p.createdAt.toISOString(),
  };
}

export function productToDetailDTO(p: ProductWithRelations): ProductDetailDTO {
  const ingredientRows = ('ingredients' in p ? p.ingredients : []) as unknown as {
    quantity: string | null;
    ingredient: {
      id: number;
      note: string | null;
      name: string;
      allergens: { allergen: { id: number; name: string } }[];
    };
  }[];
  const ingredients = ingredientRows;
  const ingredientsOut = ingredients.map((pi) => pi.ingredient.id);
  const allergenMap = new Map<number, string>();
  for (const pi of ingredients) {
    for (const ia of pi.ingredient.allergens) allergenMap.set(ia.allergen.id, ia.allergen.name);
  }
  for (const pa of (p.allergens || []) as { allergen: { id: number; name: string } }[]) {
    allergenMap.set(pa.allergen.id, pa.allergen.name);
  }
  const list = productToListDTO(p);
  return {
    ...list,
    description: p.description,
    images: (p.images || []) as ProductDetailDTO['images'],
    variants: (p.variants || []).map((v) => ({
      id: v.id,
      productId: v.productId,
      name: v.name,
      flavor: v.flavor,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
      isActive: v.isActive,
    })),
    ingredients: ingredientsOut,
    allergens: [...allergenMap.keys()],
  };
}

function itemToDTO(i: {
  id: number; productId: number | null; variantId: number | null; name: string; variantName: string | null;
  imageUrl: string | null; unitPrice: number; quantity: number; lineTotal: number; options: Prisma.JsonValue;
  product?: { images: Array<{ url: string | null }> } | null;
}): OrderItemDTO {
  return {
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    name: i.name,
    variantName: i.variantName,
    imageUrl: i.imageUrl ?? i.product?.images[0]?.url ?? null,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    lineTotal: i.lineTotal,
    options: (i.options as Record<string, unknown>) ?? null,
  };
}

type OrderItemLike = {
  id: number; productId: number | null; variantId: number | null; name: string; variantName: string | null;
  imageUrl: string | null; unitPrice: number; quantity: number; lineTotal: number; options: Prisma.JsonValue;
  product?: { images: Array<{ url: string | null }> } | null;
};

export function orderToDTO(o: OrderModel & {
  items?: OrderItemLike[];
  history?: (Prisma.OrderStatusHistoryGetPayload<{ include: { changedBy: { select: { id: true; fullName: true } } } }>)[];
  user?: { id: number; email: string; fullName: string; phone: string | null } | null;
}): OrderDTO {
  const items = (o.items || []).map(itemToDTO);
  const history = (o.history || []).map<OrderStatusHistoryDTO>((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    note: h.note,
    createdAt: h.createdAt.toISOString(),
    changedBy: h.changedBy ? { id: h.changedBy.id, fullName: h.changedBy.fullName } : null,
  }));
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    deliveryType: o.deliveryType,
    deliveryDate: o.deliveryDate.toISOString(),
    timeSlot: o.timeSlot,
    recipientName: o.recipientName,
    recipientPhone: o.recipientPhone,
    addressLine: o.addressLine,
    ward: o.ward,
    district: o.district,
    city: o.city,
    lat: o.lat ?? null,
    lng: o.lng ?? null,
    mapsUrl: o.mapsUrl ?? null,
    note: o.note,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    total: o.total,
    couponCode: o.couponCode,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    cancelReason: o.cancelReason,
    items,
    history,
    user: o.user
      ? { id: o.user.id, email: o.user.email, fullName: o.user.fullName, phone: o.user.phone, avatarUrl: null, role: 'CUSTOMER', status: 'ACTIVE' }
      : undefined,
    createdAt: o.createdAt.toISOString(),
  };
}

export type CartItemRow = Prisma.CartItemGetPayload<{
  include: {
    variant: {
      include: {
        product: {
          select: { id: true; name: true; isActive: true; deletedAt: true };
        };
      };
    };
  };
}>;

export function cartToSummary(cart: CartModel & { items: CartItemRow[] }): CartSummaryDTO {
  const items: CartItemDTO[] = cart.items
    .filter((ci) => ci.variant && ci.variant.product && ci.variant.product.isActive && !ci.variant.product.deletedAt)
    .map((ci) => ({
      id: ci.id,
      variantId: ci.variant.id,
      productId: ci.variant.product.id,
      productName: ci.variant.product.name,
      variantName: ci.variant.name,
      imageUrl: null,
      unitPrice: ci.unitPrice,
      quantity: ci.quantity,
      lineTotal: ci.unitPrice * ci.quantity,
      stock: ci.variant.stock,
      options: (ci.options as CartItemDTO['options']) ?? null,
    }));
  return { items, subtotal: items.reduce((s, i) => s + i.lineTotal, 0) };
}

export function reviewToDTO(r: Review & { user?: { id: number; fullName: string } | null }) {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment || '',
    imageUrl: r.imageUrl,
    reply: r.reply,
    repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    user: r.user ? { id: r.user.id, fullName: r.user.fullName } : { id: 0, fullName: 'Khách hàng' },
  };
}

export function settingsToDTO(s: {
  name: string; slogan: string | null; address: string; phone: string; email: string; openingHours: string;
  facebook: string | null; instagram: string | null; zalo: string | null;
  bankName: string; bankAccountName: string; bankAccountNumber: string;
  shippingFeeVnd: number; freeShippingMinVnd: number;
}): StoreSettingsDTO {
  return {
    name: s.name,
    slogan: s.slogan,
    address: s.address,
    phone: s.phone,
    email: s.email,
    openingHours: s.openingHours,
    facebook: s.facebook,
    instagram: s.instagram,
    zalo: s.zalo,
    bankName: s.bankName,
    bankAccountName: s.bankAccountName,
    bankAccountNumber: s.bankAccountNumber,
    shippingFeeVnd: s.shippingFeeVnd,
    freeShippingMinVnd: s.freeShippingMinVnd,
  };
}
