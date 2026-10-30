/**
 * Đặc tả OpenAPI tóm tắt các endpoint chính của API Nini Cakes.
 * Truy vấn gui đầy đủ tại /api-docs hoặc /openapi.json.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Nini Cakes API',
    version: '1.0.0',
    description:
      'API thương mại điện tử Nini Cakes (tiệm bánh cao cấp Á-Âu). Phản hồi chuẩn: { success, data, message, errors }. Xác thực: Bearer access token + refresh token qua cookie NC_RT.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Auth' },
    { name: 'Profile' },
    { name: 'Catalog' },
    { name: 'Cart & Orders' },
    { name: 'Reviews' },
    { name: 'Content' },
    { name: 'Admin' },
    { name: 'Reports' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Paged: {
        type: 'object',
        properties: {
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              perPage: { type: 'integer' },
              totalItems: { type: 'integer' },
              totalPages: { type: 'integer' },
              hasNext: { type: 'boolean' },
              hasPrev: { type: 'boolean' },
            },
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          slug: { type: 'string' },
          price: { type: 'integer' },
          compareAtPrice: { type: 'integer', nullable: true },
          isFeatured: { type: 'boolean' },
          isSeasonal: { type: 'boolean' },
          isActive: { type: 'boolean' },
          ratingAvg: { type: 'number' },
          ratingCount: { type: 'integer' },
          imageUrl: { type: 'string', nullable: true },
        },
      },
      Variant: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          flavor: { type: 'string', nullable: true },
          price: { type: 'integer' },
          sku: { type: 'string' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'] },
          deliveryType: { type: 'string', enum: ['DELIVERY', 'PICKUP'] },
          deliveryDate: { type: 'string', format: 'date' },
          timeSlot: { type: 'string' },
          paymentMethod: { type: 'string', enum: ['COD', 'BANK_TRANSFER'] },
          paymentStatus: { type: 'string', enum: ['UNPAID', 'PAID', 'REFUNDED'] },
          subtotal: { type: 'integer' },
          discount: { type: 'integer' },
          shippingFee: { type: 'integer' },
          total: { type: 'integer' },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          variantName: { type: 'string', nullable: true },
          unitPrice: { type: 'integer' },
          quantity: { type: 'integer' },
          lineTotal: { type: 'integer' },
          options: { type: 'object', nullable: true },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                variantId: { type: 'integer' },
                productName: { type: 'string' },
                variantName: { type: 'string' },
                unitPrice: { type: 'integer' },
                quantity: { type: 'integer' },
                options: { type: 'object', nullable: true },
              },
            },
          },
          subtotal: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng ký tài khoản khách hàng',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'phone', 'password'],
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string', description: 'Số điện thoại dùng để đăng nhập, dạng 0xxxxxxxxx' },
                  password: { type: 'string', format: 'password', minLength: 4 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Đăng ký thành công + accessToken' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập (khách hàng dùng SĐT, quản trị dùng email)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { phone: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'accessToken + user (khung giờ cookie refresh là NC_RT)' } },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Làm mới Access Token (dùng cookie NC_RT)', responses: { '200': { description: 'accessToken mới' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Đăng xuất, thu hồi refresh token', responses: { '200': { description: 'OK' } } },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Thông tin hồ sơ + thống kê mua hàng',
        responses: { '200': { description: 'user & stats' } },
      },
      patch: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Cập nhật hồ sơ (fullName, phone, avatarUrl)',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/addresses': {
      get: { tags: ['Profile'], security: [{ bearerAuth: [] }], summary: 'Sổ địa chỉ', responses: { '200': { description: 'Danh sách địa chỉ' } } },
      post: { tags: ['Profile'], security: [{ bearerAuth: [] }], summary: 'Thêm địa chỉ', responses: { '201': { description: 'Địa chỉ mới' } } },
    },
    '/wishlist': { get: { tags: ['Profile'], security: [{ bearerAuth: [] }], summary: 'Danh sách yêu thích', responses: { '200': { description: 'Dựa trên wishlists' } } } },
    '/wishlist/{productId}': {
      post: { tags: ['Profile'], security: [{ bearerAuth: [] }], summary: 'Thêm yêu thích', parameters: [{ name: 'productId', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Profile'], security: [{ bearerAuth: [] }], summary: 'Bỏ yêu thích', parameters: [{ name: 'productId', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
    },
    '/categories': {
      get: { tags: ['Catalog'], summary: 'Danh sách danh mục (+số sản phẩm)', responses: { '200': { description: 'OK' } } },
    },
    '/ingredients': { get: { tags: ['Catalog'], summary: 'Nguyên liệu (kèm thông tin dị ứng)', responses: { '200': { description: 'OK' } } } },
    '/allergens': { get: { tags: ['Catalog'], summary: 'Danh sách thông tin dị ứng', responses: { '200': { description: 'OK' } } } },
    '/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Lọc/trang sản phẩm',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'perPage', in: 'query', schema: { type: 'integer' } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Tìm kiếm theo tên' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'slug, hỗ trợ nhiều giá trị cách nhau bằng dấu phẩy' },
          { name: 'minPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'ingredientIds', in: 'query', schema: { type: 'string' } },
          { name: 'excludeAllergenIds', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'popular', 'rating'] } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, meta: { $ref: '#/components/schemas/Paged' } } } },
                },
              },
            },
          },
        },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Chi tiết sản phẩm + variants + reviews tóm tắt + liên quan',
        parameters: [{ name: 'slug', in: 'path', schema: { type: 'string' }, required: true }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/products/{slug}/reviews': {
      get: {
        tags: ['Reviews'],
        summary: 'Tiến trang danh sách đánh giá của sản phẩm',
        parameters: [{ name: 'slug', in: 'path', schema: { type: 'string' }, required: true }, { name: 'page', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/reviews': {
      post: {
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        summary: 'Tạo đánh giá (chờ duyệt)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId', 'rating'],
                properties: {
                  productId: { type: 'integer' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comment: { type: 'string' },
                  imageUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Đã tạo (isApproved=false)' } },
      },
    },
    '/reviews/top': { get: { tags: ['Reviews'], summary: 'Review tiêu biểu (trang chủ)', responses: { '200': { description: 'OK' } } } },
    '/cart': {
      get: { tags: ['Cart & Orders'], summary: 'Giỏ hàng theo user/cookie', responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Cart' } } } } } } } },
      delete: { tags: ['Cart & Orders'], summary: 'Xóa hết giỏ', responses: { '200': { description: 'OK' } } },
    },
    '/cart/items': {
      post: {
        tags: ['Cart & Orders'],
        summary: 'Thêm biến thể + tùy chỉnh vào giỏ',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['variantId', 'quantity'],
                properties: {
                  variantId: { type: 'integer' },
                  quantity: { type: 'integer', minimum: 1, maximum: 20 },
                  options: {
                    type: 'object',
                    properties: {
                      messageOnCake: { type: 'string' },
                      notes: { type: 'string' },
                      referenceImageUrl: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'OK' } },
      },
    },
    '/cart/items/{id}': {
      patch: { tags: ['Cart & Orders'], summary: 'Cập nhật số lượng', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Cart & Orders'], summary: 'Xóa một món', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
    },
    '/coupons/validate': {
      post: {
        tags: ['Cart & Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Kiểm tra mã giảm giá',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { code: { type: 'string' }, subtotal: { type: 'integer' } } }
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/orders': {
      post: {
        tags: ['Cart & Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Đặt hàng từ giỏ (server tính lại giá/tồn kho/mã giảm giá trong transaction)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deliveryType', 'deliveryDate', 'timeSlot', 'paymentMethod'],
                properties: {
                  couponCode: { type: 'string' },
                  deliveryType: { type: 'string', enum: ['DELIVERY', 'PICKUP'] },
                  deliveryDate: { type: 'string', format: 'date' },
                  timeSlot: { type: 'string' },
                  paymentMethod: { type: 'string', enum: ['COD', 'BANK_TRANSFER'] },
                  addressId: { type: 'integer' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Đơn đã tạo với mã NC...' } },
      },
      get: {
        tags: ['Cart & Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Đơn của tôi',
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/orders/{id}/cancel': {
      post: {
        tags: ['Cart & Orders'],
        security: [{ bearerAuth: [] }],
        summary: 'Hủy đơn khi còn ở giai đoạn xác nhận',
        parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/banners': { get: { tags: ['Content'], summary: 'Banner đang bật', responses: { '200': { description: 'OK' } } } },
    '/settings': { get: { tags: ['Content'], summary: 'Thông tin cửa hàng (giờ, địa chỉ, tài khoản ngân hàng, phí ship…)', responses: { '200': { description: 'OK' } } } },
    '/posts': { get: { tags: ['Content'], summary: 'Bài viết (type=STORY|POLICY|FAQ)', parameters: [{ name: 'type', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } },
    '/posts/{slug}': { get: { tags: ['Content'], summary: 'Bài viết theo slug', parameters: [{ name: 'slug', in: 'path', schema: { type: 'string' }, required: true }], responses: { '200': { description: 'OK' } } } },
    '/contact': { post: { tags: ['Content'], summary: 'Gửi tin nhắn liên hệ', responses: { '201': { description: 'OK' } } } },
    '/newsletter': { post: { tags: ['Content'], summary: 'Đăng ký nhận tin', responses: { '201': { description: 'OK' } } } },

    /* ---- Admin ---- */
    '/admin/products': {
      get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Danh sách sản phẩm (staff+)', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      post: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Thêm sản phẩm với images/variants/ingredients/allergens (admin)', responses: { '201': { description: 'OK' } } },
    },
    '/admin/products/{id}': {
      get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Chi tiết sản phẩm', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
      put: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Cập nhật sản phẩm (staff+)', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Xóa mềm (admin)', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } },
    },
    '/admin/orders': {
      get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Danh sách đơn (lọc status/từ/đến/ngày giao/số ĐT…)', parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { '200': { description: 'OK' } } },
    },
    '/admin/orders/{id}/status': {
      patch: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Cập nhật trạng thái (theo đúng luồng state machine + lịch sử)',
        parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'] },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/orders/{id}/payment': { patch: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Xác nhận thanh toán (mã chuyển khoản)', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } } },
    '/admin/users/{role}': { get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Danh sách khách hàng hoặc nhân viên', parameters: [{ name: 'role', in: 'path', schema: { type: 'string', enum: ['CUSTOMER', 'STAFF'] }, required: true }], responses: { '200': { description: 'OK' } } } },
    '/admin/users/{id}/block': { patch: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Khóa / mở khóa', parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' }, required: true }], responses: { '200': { description: 'OK' } } } },
    '/admin/staff': { post: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Tạo nhân viên (admin)', responses: { '201': { description: 'OK' } } } },
    '/admin/coupons': { get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Danh sách mã giảm giá', responses: { '200': { description: 'OK' } } }, post: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Tạo mã', responses: { '201': { description: 'OK' } } } },
    '/admin/reviews': { get: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Duyệt/ẩn/phản hồi đánh giá', responses: { '200': { description: 'OK' } } } },
    '/uploads': { post: { tags: ['Cart & Orders'], security: [{ bearerAuth: [] }], summary: 'Khách tải ảnh tham khảo cho bánh (multipart/form-data, field=file)', responses: { '200': { description: 'url ảnh' } } } },
    '/uploads/attach': { post: { tags: ['Content'], summary: 'Khách vãng lai đính kèm ảnh bánh vào tin nhắn liên hệ (multipart/form-data, field=file; giới hạn 8 ảnh / 15 phút / IP)', responses: { '200': { description: 'url ảnh' }, '429': { description: 'Vượt giới hạn tải lên' } } } },
    '/admin/uploads': { post: { tags: ['Admin'], security: [{ bearerAuth: [] }], summary: 'Tải ảnh lên (multipart/form-data, field=file)', responses: { '200': { description: 'url ảnh' } } } },
    '/admin/dashboard': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Số liệu + biểu đồ dashboard 14 ngày', responses: { '200': { description: 'OK' } } } },
    '/admin/reports/revenue': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Doanh thu theo ngày/tuần/tháng', parameters: [{ name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month'] } }], responses: { '200': { description: 'OK' } } } },
    '/admin/reports/top-products': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Top sản phẩm bán chạy', responses: { '200': { description: 'OK' } } } },
    '/admin/reports/revenue.csv': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Xuất CSV doanh thu', responses: { '200': { description: 'text/csv' } } } },
    '/admin/reports/orders.csv': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Xuất CSV đơn hàng', responses: { '200': { description: 'text/csv' } } } },
    '/admin/reports/customers.csv': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Xuất CSV khách hàng', responses: { '200': { description: 'text/csv' } } } },
    '/admin/reports/top-products.csv': { get: { tags: ['Reports'], security: [{ bearerAuth: [] }], summary: 'Xuất CSV top sản phẩm', responses: { '200': { description: 'text/csv' } } } },
  },
} as const;
