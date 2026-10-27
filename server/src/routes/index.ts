import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate.middleware.js';
import {
  requireAuth,
  optionalAuth,
  requireStaff,
  requireAdmin,
} from '../middlewares/auth.middleware.js';
import { attachCart } from '../middlewares/cart.middleware.js';
import { productController } from '../controllers/product.controller.js';
import { cartController } from '../controllers/cart.controller.js';
import { cartCheckoutCtl } from '../controllers/order.controller.js';
import { commerceController } from '../controllers/commerce.controller.js';
import { contentController } from '../controllers/content.controller.js';
import { reportController } from '../controllers/report.controller.js';
import { meController } from '../controllers/me.controller.js';
import { authController } from '../controllers/auth.controller.js';
import { multerSingle, uploadController } from '../controllers/upload.controller.js';

import { productListQuery, categoryBodySchema, ingredientBodySchema, allergenBodySchema, productBodySchema } from '../validators/product.schema.js';
import { cartAddSchema, cartUpdateSchema } from '../validators/cart.schema.js';
import { checkoutSchema, orderListQuery, adminStatusSchema, paymentStatusSchema } from '../validators/order.schema.js';
import { couponBodySchema, couponValidateSchema } from '../validators/coupon.schema.js';
import { reviewCreateSchema, reviewReplySchema } from '../validators/review.schema.js';
import { bannerBodySchema, postBodySchema, settingsBodySchema, contactSchema, subscribeSchema } from '../validators/content.schema.js';
import { idParam, productIdParam, slugParam, roleParam } from '../validators/common.schema.js';
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  changePasswordSchema,
  profileSchema,
  addressSchema,
  staffCreateSchema,
} from '../validators/auth.schema.js';

const router = Router();

const validateId = validate(idParam, 'params');
const validateProductId = validate(productIdParam, 'params');
const validateSlug = validate(slugParam, 'params');

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Quý khách thao tác nhiều trong thời gian ngắn. Vui lòng đợi một lát rồi thử lại.' },
});

/* ===================== XÁC THỰC & HỒ SƠ ===================== */
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.post('/auth/forgot-password', authLimiter, validate(forgotSchema), authController.forgot);
router.post('/auth/reset-password', authLimiter, validate(resetSchema), authController.reset);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', requireAuth, meController.profile);
router.patch('/auth/me', requireAuth, validate(profileSchema), meController.updateProfile);
router.patch('/auth/me/password', requireAuth, validate(changePasswordSchema), meController.changePassword);

/* ===================== SỔ ĐỊA CHỈ ===================== */
router.get('/addresses', requireAuth, meController.addresses);
router.post('/addresses', requireAuth, validate(addressSchema), meController.createAddress);
router.patch('/addresses/:id', requireAuth, validateId, validate(addressSchema), meController.updateAddress);
router.delete('/addresses/:id', requireAuth, validateId, meController.deleteAddress);

/* ===================== YÊU THÍCH ===================== */
router.get('/wishlist', requireAuth, meController.wishlist);
router.post('/wishlist/:productId', requireAuth, validateProductId, meController.addWishlist);
router.delete('/wishlist/:productId', requireAuth, validateProductId, meController.removeWishlist);

/* ===================== CÔNG KHAI: DANH MỤC / SẢN PHẨM / ĐÁNH GIÁ / NỘI DUNG ===================== */
router.get('/categories', productController.categories);
router.get('/ingredients', productController.ingredients);
router.get('/allergens', productController.allergens);
router.get('/products', validate(productListQuery, 'query'), productController.list);
router.get('/products/:slug', validateSlug, productController.detail);
router.get('/products/:slug/reviews', validateSlug, productController.detailReviews);
router.get('/reviews/top', commerceController.topReviews);
router.get('/banners', contentController.banners);
router.get('/settings', contentController.settings);
router.get('/posts', contentController.posts);
router.get('/posts/:slug', contentController.post);
router.post('/contact', validate(contactSchema), contentController.contact);
router.post('/newsletter', validate(subscribeSchema), contentController.subscribe);

/* ===================== GIỎ HÀNG (đăng nhập thì lưu giỏ theo user; khách thì theo cookie) ===================== */
router.get('/cart', optionalAuth, attachCart, cartController.getCart);
router.post('/cart/items', optionalAuth, attachCart, validate(cartAddSchema), cartController.addItem);
router.patch('/cart/items/:id', optionalAuth, attachCart, validate(idParam, 'params'), validate(cartUpdateSchema), cartController.updateItem);
router.delete('/cart/items/:id', optionalAuth, attachCart, validateId, cartController.removeItem);
router.delete('/cart', optionalAuth, attachCart, cartController.clear);

/* ===================== ĐƠN HÀNG: KHÁCH ===================== */
router.post('/orders', requireAuth, validate(checkoutSchema), cartCheckoutCtl.checkout);
router.get('/orders', requireAuth, cartCheckoutCtl.myOrders);
router.get('/orders/:id', requireAuth, validateId, cartCheckoutCtl.myOrder);
router.post('/orders/:id/cancel', requireAuth, validateId, cartCheckoutCtl.cancelMine);

/* ===================== ĐÁNH GIÁ: KHÁCH ===================== */
router.post('/reviews', requireAuth, validate(reviewCreateSchema), commerceController.createReview);
router.get('/reviews/mine', requireAuth, commerceController.myReviews);
router.delete('/reviews/:id', requireAuth, validateId, commerceController.deleteMyReview);

/* ===================== MÃ GIẢM GIÁ: ĐIỂM CHI TIẾT ===================== */
router.post('/coupons/validate', requireAuth, validate(couponValidateSchema), commerceController.validateCoupon);

/* ===================== QUẢN TRỊ: SẢN PHẨM / DANH MỤC / NGUYÊN LIỆU / DỊ ỨNG ===================== */
router.get('/admin/products', requireStaff, productController.adminList);
router.get('/admin/products/:id', requireStaff, validateId, productController.adminGet);
router.post('/admin/products', requireAdmin, validate(productBodySchema), productController.adminCreate);
router.put('/admin/products/:id', requireStaff, validateId, validate(productBodySchema), productController.adminUpdate);
router.delete('/admin/products/:id', requireAdmin, validateId, productController.adminDelete);

router.get('/admin/categories', requireStaff, productController.categories);
router.post('/admin/categories', requireAdmin, validate(categoryBodySchema), productController.createCategory);
router.put('/admin/categories/:id', requireAdmin, validateId, validate(categoryBodySchema), productController.updateCategory);
router.delete('/admin/categories/:id', requireAdmin, validateId, productController.deleteCategory);

router.get('/admin/ingredients', requireStaff, productController.ingredients);
router.post('/admin/ingredients', requireAdmin, validate(ingredientBodySchema), productController.createIngredient);
router.put('/admin/ingredients/:id', requireAdmin, validateId, validate(ingredientBodySchema), productController.updateIngredient);
router.delete('/admin/ingredients/:id', requireAdmin, validateId, productController.deleteIngredient);

router.get('/admin/allergens', requireStaff, productController.allergens);
router.post('/admin/allergens', requireAdmin, validate(allergenBodySchema), productController.createAllergen);
router.put('/admin/allergens/:id', requireAdmin, validateId, validate(allergenBodySchema), productController.updateAllergen);
router.delete('/admin/allergens/:id', requireAdmin, validateId, productController.deleteAllergen);

/* ===================== QUẢN TRỊ: ĐƠN HÀNG ===================== */
router.get('/admin/orders', requireStaff, validate(orderListQuery, 'query'), cartCheckoutCtl.adminList);
router.get('/admin/orders/:id', requireStaff, validateId, cartCheckoutCtl.adminOrder);
router.patch('/admin/orders/:id/status', requireStaff, validateId, validate(adminStatusSchema), cartCheckoutCtl.adminUpdateStatus);
router.patch('/admin/orders/:id/payment', requireStaff, validateId, validate(paymentStatusSchema), cartCheckoutCtl.adminSetPayment);
router.post('/admin/orders/:id/cancel', requireStaff, validateId, cartCheckoutCtl.adminCancel);

/* ===================== QUẢN TRỊ: KHUYẾN MÃI ===================== */
router.get('/admin/coupons', requireStaff, commerceController.adminList);
router.post('/admin/coupons', requireAdmin, validate(couponBodySchema), commerceController.adminCreate);
router.put('/admin/coupons/:id', requireAdmin, validateId, validate(couponBodySchema.partial()), commerceController.adminUpdate);
router.delete('/admin/coupons/:id', requireAdmin, validateId, commerceController.adminDelete);

/* ===================== QUẢN TRỊ: ĐÁNH GIÁ ===================== */
router.get('/admin/reviews', requireStaff, commerceController.adminReviews);
router.patch('/admin/reviews/:id/approve', requireStaff, validateId, commerceController.approveReview);
router.patch('/admin/reviews/:id/hide', requireStaff, validateId, commerceController.hideReview);
router.patch('/admin/reviews/:id/reply', requireStaff, validateId, validate(reviewReplySchema), commerceController.replyReview);
router.delete('/admin/reviews/:id', requireAdmin, validateId, commerceController.adminDeleteReview);

/* ===================== QUẢN TRỊ: NỘI DUNG ===================== */
router.get('/admin/banners', requireStaff, contentController.adminBanners);
router.post('/admin/banners', requireAdmin, validate(bannerBodySchema), contentController.createBanner);
router.put('/admin/banners/:id', requireAdmin, validateId, validate(bannerBodySchema.partial()), contentController.updateBanner);
router.delete('/admin/banners/:id', requireAdmin, validateId, contentController.deleteBanner);

router.get('/admin/posts', requireStaff, contentController.adminPosts);
router.post('/admin/posts', requireAdmin, validate(postBodySchema), contentController.createPost);
router.put('/admin/posts/:id', requireAdmin, validateId, validate(postBodySchema.partial()), contentController.updatePost);
router.delete('/admin/posts/:id', requireAdmin, validateId, contentController.deletePost);

router.get('/admin/settings', requireStaff, contentController.adminSettings);
router.put('/admin/settings', requireAdmin, validate(settingsBodySchema), contentController.updateSettings);

router.get('/admin/messages', requireStaff, contentController.messages);
router.patch('/admin/messages/:id/read', requireStaff, validateId, contentController.markMessageRead);
router.get('/admin/newsletter.csv', requireStaff, contentController.exportSubscribers);

/* ===================== QUẢN TRỊ: KHÁCH HÀNG / NHÂN VIÊN ===================== */
router.get('/admin/users/:role', requireStaff, validate(roleParam, 'params'), meController.adminListUsers);
router.get('/admin/users/detail/:id', requireStaff, validateId, meController.adminUserDetail);
router.patch('/admin/users/:id/block', requireAdmin, validateId, meController.blockUser);
router.post('/admin/staff', requireAdmin, validate(staffCreateSchema), meController.createStaff);

/* ===================== QUẢN TRỊ: BÁO CÁO ===================== */
router.get('/admin/dashboard', requireStaff, reportController.dashboard);
router.get('/admin/reports/revenue', requireStaff, reportController.revenue);
router.get('/admin/reports/customers', requireStaff, reportController.customers);
router.get('/admin/reports/top-products', requireStaff, reportController.topProducts);
router.get('/admin/reports/revenue.csv', requireStaff, reportController.revenueCsv);
router.get('/admin/reports/top-products.csv', requireStaff, reportController.topProductsCsv);
router.get('/admin/reports/orders.csv', requireStaff, reportController.ordersCsv);
router.get('/admin/reports/customers.csv', requireStaff, reportController.customersCsv);

/* ===================== UPLOAD ẢNH ===================== */
router.post('/admin/uploads', requireStaff, multerSingle(), uploadController.single);
/* Khách gửi ảnh tham khảo cho bánh đặt theo yêu cầu — chỉ ảnh, tối đa MAX_UPLOAD_MB */
router.post('/uploads', requireAuth, multerSingle(), uploadController.single);

/* ===================== TRANG CHỦ API ===================== */
router.get('/', (_req, res) => {
  res.json({ success: true, message: 'Nini Cakes API v1 — Kính mời quý khách xem tài liệu tại /api-docs' });
});

export default router;
