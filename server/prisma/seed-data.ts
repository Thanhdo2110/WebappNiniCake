/* Dữ liệu seed Nini Cakes — tiếng Việt chuẩn UTF-8 */
export type VariantSeed = { name: string; flavor?: string; price: number; stock: number };

export interface ProductSeed {
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  isFeatured?: boolean;
  isSeasonal?: boolean;
  compareAtPrice?: number;
  ingredients: string[];
  extraAllergens?: string[];
  variants: VariantSeed[];
}

export const CATEGORY_SEEDS = [
  {
    name: 'Bánh kem',
    slug: 'banh-kem',
    description: 'Bánh kem sinh nhật và tiệc trà: kem tươi Pháp, ganache socola chuẩn patisserie, trang trí thủ công.',
  },
  {
    name: 'Bánh ngọt',
    slug: 'banh-ngot',
    description: 'Tart, mousse, cheesecake và tiramisu với bản vị Á nhẹ nhang, kích thước phù hợp dùng ngay.',
  },
  {
    name: 'Bánh mì',
    slug: 'banh-mi',
    description: 'Croissant bơ Pháp, shokupan mềm mịn, baguette tái làm từ poolish 3 ngày.',
  },
  {
    name: 'Bánh truyền thống Á',
    slug: 'banh-truyen-thong-a',
    description: 'Bánh da lợn lá dứa, bánh bò, xú xê, taiyaki — hương vị Việt và Nhật đúng bản vị.',
  },
  {
    name: 'Bánh theo mùa',
    slug: 'banh-theo-mua',
    description: 'Bánh đặc sắc theo mùa: hoa anh đào của mùa xuân và bánh nướng đậu xanh hái mai của Tết trung thu.',
  },
];

export const ALLERGEN_SEEDS = [
  { name: 'Gluten (lúa mì)', icon: '🍞' },
  { name: 'Sữa lactose', icon: '🥛' },
  { name: 'Trứng gà', icon: '🥚' },
  { name: 'Đậu phộng', icon: '🥜' },
  { name: 'Hạt hạnh nhân', icon: '🌰' },
  { name: 'Đậu nành', icon: '🫘' },
];

export const INGREDIENT_SEEDS: { name: string; note?: string; allergenNames: string[] }[] = [
  { name: 'Kem tươi Whiprim 35%', note: 'Kem tươi chuẩn vị thơm lá', allergenNames: ['Sữa lactose'] },
  { name: 'Bơ Thanh France', note: 'Butter Grand Cru 82% fat', allergenNames: ['Sữa lactose'] },
  { name: 'Sữa tươi Hokkaido 3.6', allergenNames: ['Sữa lactose'] },
  { name: 'Socola Valrhona 70% Guanaja', note: '70% cacao, Bỉ-Pháp', allergenNames: ['Sữa lactose'] },
  { name: 'Socola trắng Ivory', allergenNames: ['Sữa lactose'] },
  { name: 'Bột mì Hokkaido', allergenNames: ['Gluten (lúa mì)'] },
  { name: 'Bột gạo lứt và bột bắp', allergenNames: [] },
  { name: 'Trứng gà Giaia', note: 'Trứng gà nuôi thả tự do', allergenNames: ['Trứng gà'] },
  { name: 'Matcha Uji Kyoto', note: 'Ceremonial grade', allergenNames: [] },
  { name: 'Yuzu Nhật Shiramazu', allergenNames: [] },
  { name: 'Dâu Đà Lạt Bordeaux', allergenNames: [] },
  { name: 'Chanh dây Nam Trung', allergenNames: [] },
  { name: 'Sầu riêng Ri6', note: 'Sóc Trăng', allergenNames: [] },
  { name: 'Đậu xanh Cà Mau', allergenNames: [] },
  { name: 'Nếp nướng Kantola', allergenNames: [] },
  { name: 'Caramel muối Guérande', allergenNames: ['Sữa lactose'] },
  { name: 'Bột hạnh nhân macaron', allergenNames: ['Hạt hạnh nhân', 'Trứng gà'] },
  { name: 'Sữa đậu nành Tokai', allergenNames: ['Đậu nành'] },
  { name: 'Praline hạnh nhân', allergenNames: ['Hạt hạnh nhân'] },
  { name: 'Lá dứa Bình Định', allergenNames: [] },
  { name: 'Cream cheese Kaiyuvs', allergenNames: ['Sữa lactose'] },
  { name: 'Vanilla Bourbon', allergenNames: [] },
];

export const PRODUCT_SEEDS: ProductSeed[] = [
  {
    name: 'Bánh kem Socola Đen Valrhona',
    shortDescription: 'Ganache Valrhona 70% với bơ Hokkaido; vị cuối miệng đậm mà dịu.',
    description:
      'Hai lớp genoise cacao với kem tươi Whiprim; ganache Valrhona Guanaja 70%; giữa bánh là caramel muối Guérande. Kính mời quý khách thưởng thức như một bản nhạc socola đen.',
    category: 'banh-kem',
    isFeatured: true,
    compareAtPrice: 620000,
    ingredients: ['Socola Valrhona 70% Guanaja', 'Kem tươi Whiprim 35%', 'Trứng gà Giaia', 'Bột mì Hokkaido', 'Caramel muối Guérande', 'Bơ Thanh France'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Socola đen', price: 480000, stock: 20 },
      { name: '20cm / 14 phần', flavor: 'Socola đen', price: 650000, stock: 15 },
      { name: '24cm / 18 phần', flavor: 'Socola đen', price: 880000, stock: 8 },
    ],
  },
  {
    name: 'Bánh kem Yuzu Hoa Dao',
    shortDescription: 'Yuzu Nhật bên kem socola trắng; hồng sắc hoa đào của mùa xuân.',
    description:
      'Chiffon yuzu; mousse yuzu với kem socola trắng Ivory; jelly yuzu trong vắt và phần hồng nhạt hoa đào trang trí. Là bánh rất hợp cho mùa xuân rực rỡ.',
    category: 'banh-kem',
    isFeatured: true,
    isSeasonal: true,
    compareAtPrice: 580000,
    ingredients: ['Yuzu Nhật Shiramazu', 'Socola trắng Ivory', 'Kem tươi Whiprim 35%', 'Trứng gà Giaia', 'Bột mì Hokkaido'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Yuzu', price: 520000, stock: 12 },
      { name: '20cm / 14 phần', flavor: 'Yuzu', price: 690000, stock: 10 },
    ],
  },
  {
    name: 'Bánh kem Matcha Uji',
    shortDescription: 'Matcha Uji Kyoto cao cấp; mousse mềm; vị ngọt tinh khiết.',
    description:
      'Sponge matcha; mousse matcha với mascarpone; điểm socola trắng Ivory xong. Sự khác biệt là matcha ceremonial giúp bánh có sau vị trà nhẹ.',
    category: 'banh-kem',
    isFeatured: true,
    ingredients: ['Matcha Uji Kyoto', 'Kem tươi Whiprim 35%', 'Cream cheese Kaiyuvs', 'Trứng gà Giaia', 'Bột mì Hokkaido', 'Socola trắng Ivory'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Matcha', price: 500000, stock: 14 },
      { name: '20cm / 14 phần', flavor: 'Matcha', price: 660000, stock: 9 },
      { name: '24cm / 18 phần', flavor: 'Matcha', price: 850000, stock: 6 },
    ],
  },
  {
    name: 'Bánh kem Dâu Bordeaux',
    shortDescription: 'Dâu Đà Lạt sơ chế mỗi sáng; kem mascarpone chua nhẹ thanh mát.',
    description:
      'Chiffon bông, cốt dâu Đà Lạt Bordeaux tươi; kem mascarpone chua nhẹ; kèm framboise trên mặt bánh.',
    category: 'banh-kem',
    ingredients: ['Dâu Đà Lạt Bordeaux', 'Kem tươi Whiprim 35%', 'Cream cheese Kaiyuvs', 'Trứng gà Giaia', 'Bột mì Hokkaido'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Dâu', price: 520000, stock: 10 },
      { name: '20cm / 14 phần', flavor: 'Dâu', price: 700000, stock: 6 },
    ],
  },
  {
    name: 'Bánh kem Chanh Sả',
    shortDescription: 'Chanh dây Nam Trung tươi; kem mascarpone; caramel muối.',
    description:
      'Croustade chanh dây; siro sả thơm nhẹ; mousse mascarpone làm nền bánh; hoàn thành bằng jelly chanh dây trong. Thuần một bản Việt-Pháp fusion.',
    category: 'banh-kem',
    ingredients: ['Chanh dây Nam Trung', 'Cream cheese Kaiyuvs', 'Kem tươi Whiprim 35%', 'Trứng gà Giaia', 'Caramel muối Guérande'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Chanh dây', price: 460000, stock: 16 },
      { name: '20cm / 14 phần', flavor: 'Chanh dây', price: 620000, stock: 8 },
    ],
  },
  {
    name: 'Red Velvet Phấn Hồng',
    shortDescription: 'Red velvet chuẩn Mỹ; frosting cream cheese vị mềm; màu phấn hồng.',
    description:
      'Bột cacao và buttermilk cho vị chua nhẹ trong sáng; frosting cream cheese màu phấn hồng lấy từ bí đỏ tự nhiên.',
    category: 'banh-kem',
    ingredients: ['Cream cheese Kaiyuvs', 'Bơ Thanh France', 'Trứng gà Giaia', 'Bột mì Hokkaido', 'Caramel muối Guérande'],
    extraAllergens: ['Hạt hạnh nhân'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Red velvet', price: 480000, stock: 12 },
      { name: '20cm / 14 phần', flavor: 'Red velvet', price: 640000, stock: 6 },
    ],
  },
  {
    name: 'Tiramisu Cappuccino Maison',
    shortDescription: 'Tiramisu kiểu Ý với cappuccino sau cơn mưa; mascarpone non bắp.',
    description:
      'Savoyardi nhồi espresso; lớp mascarpone cream non bạt; rắc cacao Valrhona. Khách hàng thường mua thêm để dành ăn sáng.',
    category: 'banh-ngot',
    isFeatured: true,
    ingredients: ['Kem tươi Whiprim 35%', 'Cream cheese Kaiyuvs', 'Socola Valrhona 70% Guanaja', 'Trứng gà Giaia'],
    variants: [
      { name: 'Hộp 4 phần (300g)', price: 230000, stock: 30 },
      { name: 'Hộp 8 phần (580g)', price: 420000, stock: 20 },
    ],
  },
  {
    name: 'Cheesecake Matcha Chảy Lưu',
    shortDescription: 'Nhân matcha lava chảy từ Uji Kyoto; vỏ bánh kiểu Nhật.',
    description: 'Vỏ bánh kem mịn kiểu Nhật; nhân matcha lava chảy ở giữa; tuyệt nhất khi còn hơi ấm.',
    category: 'banh-ngot',
    ingredients: ['Matcha Uji Kyoto', 'Cream cheese Kaiyuvs', 'Trứng gà Giaia', 'Bột mì Hokkaido', 'Socola trắng Ivory'],
    variants: [
      { name: 'Chiếc 6 inch', flavor: 'Matcha', price: 320000, stock: 18 },
      { name: 'Chiếc 8 inch', flavor: 'Matcha', price: 450000, stock: 10 },
    ],
  },
  {
    name: 'Cheesecake Chanh Dây',
    shortDescription: 'Chanh dây Nam Trung; vỏ gạo lứt; cà muối cho vị muối sweet.',
    description: 'Đế biscuit bột gạo lứt; cream cheese béo nhẹ; jelly chanh dây trên mặt; chút muối hậu vị thú vị.',
    category: 'banh-ngot',
    ingredients: ['Chanh dây Nam Trung', 'Cream cheese Kaiyuvs', 'Bột gạo lứt và bột bắp', 'Trứng gà Giaia', 'Bơ Thanh France'],
    variants: [
      { name: 'Chiếc 6 inch', flavor: 'Chanh dây', price: 300000, stock: 16 },
      { name: 'Slice 1 phần', flavor: 'Chanh dây', price: 75000, stock: 40 },
    ],
  },
  {
    name: 'Hộp Macaron 6 Vị',
    shortDescription: 'Sakura, matcha, socola đậm, yuzu, caramel muối, praline hạnh nhân.',
    description: 'Sáu macaron vỏ mỏng với ganache fine; 6 vị được chọn giao thoa Á - Âu.',
    category: 'banh-ngot',
    isFeatured: true,
    ingredients: ['Bột hạnh nhân macaron', 'Socola Valrhona 70% Guanaja', 'Matcha Uji Kyoto', 'Yuzu Nhật Shiramazu', 'Caramel muối Guérande', 'Cream cheese Kaiyuvs', 'Socola trắng Ivory'],
    variants: [
      { name: 'Hộp 6 vị', price: 260000, stock: 24 },
      { name: 'Hộp 12 vị', price: 470000, stock: 12 },
    ],
  },
  {
    name: 'Mousse Hoa Đào Tsubaki',
    shortDescription: 'Mousse hoa đào tsubaki; jelly sakura trong; mùi thơm dịu.',
    description: 'Mousse tsubaki vị sakura; jelly hoa đào trong; socola trắng. Mùa xuân chỉ có tháng 03-04.',
    category: 'banh-ngot',
    isSeasonal: true,
    ingredients: ['Socola trắng Ivory', 'Kem tươi Whiprim 35%', 'Cream cheese Kaiyuvs', 'Trứng gà Giaia'],
    variants: [
      { name: 'Hộp 2 phần', flavor: 'Hoa đào', price: 190000, stock: 25 },
      { name: 'Hộp 4 phần', flavor: 'Hoa đào', price: 350000, stock: 15 },
    ],
  },
  {
    name: 'Opera Socola 70%',
    shortDescription: 'Opera Pháp 9 lớp: joconde, syrup cà phê, ganache Valrhona.',
    description: 'Opera cổ điển; joconde cacao; syrup cà phê; ganache Valrhona 70%. Mùi cà phê thật rõ trong từng lớp.',
    category: 'banh-ngot',
    ingredients: ['Socola Valrhona 70% Guanaja', 'Bơ Thanh France', 'Trứng gà Giaia', 'Bột mì Hokkaido'],
    variants: [
      { name: 'Slice 1 phần', price: 89000, stock: 45 },
      { name: 'Hộp 6 phần', price: 480000, stock: 12 },
    ],
  },
  {
    name: 'Croissant Bơ Pháp',
    shortDescription: '28 lớp bơ Beurre Grand Cru; vỏ giòn chuẩn Pháp.',
    description: 'Croissant beurre French B30; fermentation 24h cold proof; lớp đan lá 28 tầng mỏng như giấy.',
    category: 'banh-mi',
    isFeatured: true,
    ingredients: ['Bơ Thanh France', 'Sữa tươi Hokkaido 3.6', 'Trứng gà Giaia', 'Bột mì Hokkaido'],
    variants: [
      { name: 'Croissant 1 chiếc', price: 45000, stock: 60 },
      { name: 'Hộp 4 chiếc', price: 160000, stock: 20 },
    ],
  },
  {
    name: 'Pain au Chocolat Cacao Đen',
    shortDescription: 'Hai thanh socola Valrhona 70% ở giữa; vỏ vàng mật ong.',
    description: 'Pain au chocolat với 2 thanh socola đen Valrhona giữ vị đậm đà.',
    category: 'banh-mi',
    ingredients: ['Socola Valrhona 70% Guanaja', 'Bơ Thanh France', 'Bột mì Hokkaido', 'Sữa tươi Hokkaido 3.6'],
    variants: [
      { name: '1 chiếc', price: 55000, stock: 55 },
      { name: 'Hộp 4 chiếc', price: 195000, stock: 18 },
    ],
  },
  {
    name: 'Shokupan Sữa Tươi Hokkaido',
    shortDescription: 'Bánh mì sữa Nhật mềm lụa; tan ngay lúc lưỡi cảm nhận.',
    description: 'Làm theo phép tangzhong với sữa Hokkaido 3.6; vỏ mỏng; mềm tốt cho bữa sáng.',
    category: 'banh-mi',
    ingredients: ['Bột mì Hokkaido', 'Sữa tươi Hokkaido 3.6', 'Trứng gà Giaia', 'Bơ Thanh France'],
    variants: [
      { name: 'Loaf 720g', price: 120000, stock: 25 },
      { name: 'Nửa loaf 360g', price: 70000, stock: 30 },
    ],
  },
  {
    name: 'Baguette Truyền Thống',
    shortDescription: 'Baguette 3 ngày poolish; vỏ giòn chuẩn tại bếp.',
    description: 'Baguette cổ điển 3 ngày poolish; da vỏ giòn; nướng trên đá kiểu xoay.',
    category: 'banh-mi',
    ingredients: ['Bột mì Hokkaido', 'Trứng gà Giaia'],
    variants: [{ name: '1 chiếc', price: 32000, stock: 70 }],
  },
  {
    name: 'Bánh Bao Mochi Chiên',
    shortDescription: 'Bao mochi da nâu; cream matcha; tan ở vị trà.',
    description: 'Bánh mochi Nhật kiểu chiên với nhân matcha cream; ngon nhất là khi còn ấm.',
    category: 'banh-mi',
    ingredients: ['Bột mì Hokkaido', 'Sữa tươi Hokkaido 3.6', 'Matcha Uji Kyoto', 'Trứng gà Giaia'],
    variants: [{ name: '1 chiếc', flavor: 'Matcha', price: 48000, stock: 40 }],
  },
  {
    name: 'Bánh Da Lợn Lá Dứa',
    shortDescription: 'Da lợn 4 màu lá dứa Bình Định; hấp steamer.',
    description: 'Da lợn truyền thống dùng lá dứa Bình Định; 4 tầng màu mượt như cascade; ăn mát nguội đều ngon.',
    category: 'banh-truyen-thong-a',
    ingredients: ['Lá dứa Bình Định', 'Trứng gà Giaia', 'Bột gạo lứt và bột bắp', 'Sữa tươi Hokkaido 3.6'],
    variants: [{ name: 'Đĩa 500g', flavor: 'Lá dứa', price: 145000, stock: 22 }],
  },
  {
    name: 'Bánh Bò Dừa Bông',
    shortDescription: 'Bánh bò nếp nướng dừa; lỗ honeycomb đẹp; bữa nhẹ ấm.',
    description: 'Bánh bò nếp nướng; cốt nước cốt dừa tươi; honeycomb đều khi nướng nóng.',
    category: 'banh-truyen-thong-a',
    ingredients: ['Nếp nướng Kantola', 'Trứng gà Giaia', 'Sữa tươi Hokkaido 3.6'],
    variants: [{ name: 'Đĩa 400g', price: 130000, stock: 18 }],
  },
  {
    name: 'Bánh Xu Xê Phu Thê',
    shortDescription: 'Xú xê bánh phu thê; hộp hồng; truyền thống cưới hỏi.',
    description: 'Xú xê cũng với đậu xanh; nếp nướng; gói trong bài thơ hạnh phúc đôi lứa.',
    category: 'banh-truyen-thong-a',
    ingredients: ['Đậu xanh Cà Mau', 'Nếp nướng Kantola', 'Trứng gà Giaia'],
    variants: [
      { name: 'Hộp 4 chiếc', price: 160000, stock: 25 },
      { name: 'Hộp 8 chiếc', price: 300000, stock: 12 },
    ],
  },
  {
    name: 'Taiyaki Matcha Cánh Sen',
    shortDescription: 'Taiyaki cá bút chì Nhật; nhân matcha kết hợp đậu đỏ.',
    description: 'Taiyaki wagashi kiểu Tokyo; matcha Uji custard; đậu đỏ azuki.',
    category: 'banh-truyen-thong-a',
    ingredients: ['Matcha Uji Kyoto', 'Trứng gà Giaia', 'Bột mì Hokkaido', 'Sữa tươi Hokkaido 3.6'],
    variants: [{ name: '1 chiếc', flavor: 'Matcha', price: 42000, stock: 35 }],
  },
  {
    name: 'Bánh Nướng Đậu Xanh Hoa Mai',
    shortDescription: 'Bánh nướng trung thu; hoa mai vàng; nhân đậu xanh bùi.',
    description: 'Bánh nướng hoa mai; nhân đậu xanh Cà Mau; tùy chọn trứng muối; phù hợp làm quà mùa lễ.',
    category: 'banh-theo-mua',
    isSeasonal: true,
    isFeatured: true,
    ingredients: ['Đậu xanh Cà Mau', 'Trứng gà Giaia', 'Bột mì Hokkaido'],
    variants: [
      { name: '1 chiếc 150g', flavor: 'Đậu xanh', price: 78000, stock: 50 },
      { name: 'Hộp quà 4 chiếc', flavor: 'Đậu xanh', price: 330000, stock: 25 },
      { name: 'Hộp quà 8 chiếc', flavor: 'Đậu xanh', price: 650000, stock: 10 },
    ],
  },
  {
    name: 'Bánh Dẻo Sầu Riêng',
    shortDescription: 'Bánh dẻo đậu xanh với sầu riêng Ri6; giữ nguyên hương nhiệt đới.',
    description: 'Vỏ bánh dẻo; nhân Ri6 durian paste pha kem Sóc Trăng; mùi như một đóa hoa mùa hạ.',
    category: 'banh-theo-mua',
    isSeasonal: true,
    ingredients: ['Sầu riêng Ri6', 'Đậu xanh Cà Mau', 'Nếp nướng Kantola'],
    variants: [
      { name: '1 chiếc 180g', flavor: 'Sầu riêng', price: 95000, stock: 40 },
      { name: 'Hộp 2 chiếc', flavor: 'Sầu riêng', price: 210000, stock: 20 },
    ],
  },
  {
    name: 'Bánh Kem Socola Ngày Tết',
    shortDescription: 'Bánh kem tết; phủ mứt vàng + socola đậm.',
    description: 'Chocolat de fête; phủ ganache đậm; trang trí mứt Tết vàng ấm áp.',
    category: 'banh-theo-mua',
    isSeasonal: true,
    ingredients: ['Socola Valrhona 70% Guanaja', 'Kem tươi Whiprim 35%', 'Caramel muối Guérande', 'Cream cheese Kaiyuvs'],
    variants: [
      { name: '16cm / 10 phần', flavor: 'Socola', price: 560000, stock: 10 },
      { name: '20cm / 14 phần', flavor: 'Socola', price: 740000, stock: 6 },
    ],
  },
];

export const COUPON_SEEDS = [
  {
    code: 'WELCOME10',
    description: 'Giảm 10% cho đơn đầu tiên (tối đa 100.000đ).',
    type: 'PERCENT',
    value: 10,
    minSubtotal: 200000,
    maxDiscount: 100000,
    maxUses: 500,
  },
  {
    code: 'NINI150K',
    description: 'Giảm 150.000đ cho đơn từ 500.000đ.',
    type: 'AMOUNT',
    value: 150000,
    minSubtotal: 500000,
    maxDiscount: null,
    maxUses: 200,
  },
  {
    code: 'SAKURA25',
    description: 'Mùa hoa anh đào: giảm 25% cho bánh theo mùa (tối đa 250.000đ).',
    type: 'PERCENT',
    value: 25,
    minSubtotal: 500000,
    maxDiscount: 250000,
    maxUses: 150,
  },
];

export const BANNER_SEEDS = [
  {
    title: 'Mùa hoa anh đào 2026 — Bộ Sưu Tập Yuzu Sakura',
    subtitle: 'Vị xuân Nhật giao thoa patisserie Pháp; mỗi chiếc bánh cho riêng bạn.',
    imageUrl: null,
    linkUrl: '/products?category=banh-theo-mua',
    sortOrder: 1,
  },
  {
    title: 'Socola Valrhona 70% — Giao Trong Ngày TP.HCM',
    subtitle: 'Giao theo khung giờ trọn vẹn; bán kính 12km nội thành.',
    imageUrl: null,
    linkUrl: '/products?category=banh-kem',
    sortOrder: 2,
  },
];

export const POST_SEEDS = [
  {
    slug: 'cau-chuyen-nini-cakes',
    title: 'Câu chuyện Nini Cakes - khi Á gặp Âu',
    excerpt: 'Từ căn bếp nhỏ ở Sài Gòn, chúng tôi học một điều: chiếc bánh ngon phải có câu chuyện riêng của người nhận.',
    type: 'STORY',
    isPublished: true,
    content:
      'Nini Cakes bắt đầu từ mùa xuân năm 2021, khi hai mẹ con ở Sài Gòn muốn gửi một chiếc bánh kem kiểu Pháp cho người thân ở Tokyo. Chiếc bánh đầu tiên chỉ là một cheesecake nhân matcha đơn giản.\n\nBa năm tiếp theo, Nini Cakes trở thành lựa chọn cho hơn 5.000 ngày sinh nhật: bánh patisserie chuẩn Pháp mà vẫn giữ hương vị Việt - lá dứa, đậu xanh, sầu riêng.\n\nKính mời quý khách ghé tiệm để cảm nhận vị Á - Âu riêng của chúng tôi.',
  },
  {
    slug: 'chinh-sach-giao-hang',
    title: 'Chính sách giao hàng',
    excerpt: 'Thông tin về phí giao, khung giờ và quy trình xác nhận đơn.',
    type: 'POLICY',
    isPublished: true,
    content:
      'Phí giao hàng 30.000đ với bán kính 12km; miễn phí cho đơn từ 1.500.000đ trở lên.\n\nKhung giờ giao: 08:00 - 21:30 mỗi ngày. Quý khách đặt trước ít nhất 4 giờ cho đơn giao sát mốc khung giờ.\n\nTiệm sẽ gọi xác nhận trong vòng 30 phút kể từ khi nhận đơn.\n\nQuý khách có thể tự hủy khi đơn còn ở trạng thái Chờ xác nhận hoặc Đã xác nhận. Sau đó xin liên hệ hotline để được hỗ trợ.',
  },
  {
    slug: 'chinh-sach-doi-tra',
    title: 'Chính sách đổi trả và hoàn tiền',
    excerpt: 'Quy trình đổi trả sản phẩm lỗi và hoàn tiền 100% khi có sai sót từ tiệm.',
    type: 'POLICY',
    isPublished: true,
    content:
      'Quý khách vui lòng chụp ảnh sản phẩm ngay khi nhận. Nếu bánh bị lỗi từ tiệm, tiệm hoàn tiền 100% hoặc đổi lô bánh mới trong 24 giờ.\n\nCác trường hợp không đổi trả: nhận trễ quá 2 giờ mà không ghi chú; tự khách làm hỏng sản phẩm sau khi nhận; sản phẩm đã mở dùng hết.',
  },
];

export const FAQ_SEEDS = [
  { slug: 'faq-khung-gio-giao', title: 'Tiệm có giao hàng sát giờ được không?', content: 'Với khung giờ sát mốc, tiệm khuyến nghị đặt trước ít nhất 4 giờ. Quý khách có thể gọi hotline 028 3822 8888 để chắc chắn phần bếp còn chỗ.' },
  { slug: 'faq-tuy-chinh-vi', title: 'Bánh có thể chỉnh vị ngọt hoặc vị khác không?', content: 'Có. Quý khách ghi chú tùy chỉnh ở phần chọn biến thể: giảm ngọt, thêm matcha, socola, yuzu hay lời chúc trên bánh. Tiệm sẽ xác nhận trước khi vào bếp.' },
  { slug: 'faq-so-luong-lon', title: 'Đặt số lượng lớn cho công ty hoặc sự kiện?', content: 'Với đơn từ 20 phần trở lên, tiệm có chiết khấu riêng và hỗ trợ trang trí theo yêu cầu. Xin quý khách để lại tin nhắn qua trang Liên hệ.' },
  { slug: 'faq-chuyen-khoan', title: 'Chuyển khoản và QR như thế nào?', content: 'Khi chọn chuyển khoản, hệ thống hiển thị thông tin tài khoản và mã giao dịch dạng NCTV-madon. Quý khách lưu mã để tiệm đối soát nhanh.' },
  { slug: 'faq-bao-quan-banh', title: 'Bánh giữ được bao lâu?', content: 'Bánh kem tươi: 24 giờ ở nhiệt độ mát hoặc 3 ngày ngăn đá. Bánh mì: 2 ngày nhiệt độ phòng, 7 ngày ngăn đá. Bánh mousse: dùng trong 5 ngày với hộp kín.' },
  { slug: 'faq-thanh-toan-cod', title: 'Thanh toán khi nhận hàng (COD) là gì?', content: 'Quý khách thanh toán trực tiếp cho shipper lúc nhận bánh. Áp dụng bán kính đến 12km nội thành TP. Hồ Chí Minh.' },
];

export const REVIEW_SEEDS = [
  { productSlug: 'banh-kem-socola-den-valrhona', rating: 5, comment: 'Các lớp ganache chuẩn vị. Cả gia đình hẹn đặt thêm cho dịp lễ.', userIndex: 0 },
  { productSlug: 'banh-kem-yuzu-hoa-dao', rating: 5, comment: 'Trang trí tinh tế, vị yuzu rất sang. Tuyệt cho buổi trà chiều.', userIndex: 1 },
  { productSlug: 'banh-kem-matcha-uji', rating: 4, comment: 'Matcha đậm vừa đủ. Giao hơi chậm nhưng bánh vẫn nguyên vẹn.', userIndex: 2 },
  { productSlug: 'tiramisu-cappuccino-maison', rating: 5, comment: 'Tiramisu ngon chuẩn vị, kem mịn không gắt.', userIndex: 3 },
  { productSlug: 'hop-macaron-6-vi', rating: 4, comment: 'Vỏ mỏng giòn, nhân đầy. Vị yuzu là xuất sắc nhất.', userIndex: 4 },
  { productSlug: 'croissant-bo-phap', rating: 5, comment: 'Lớp vàng giòn gần bằng ở Paris. Sáng nào cũng ghé.', userIndex: 0 },
  { productSlug: 'shokupan-sua-tuoi-hokkaido', rating: 5, comment: 'Nhân mềm và thơm. Giữ lạnh vẫn ngon.', userIndex: 1 },
  { productSlug: 'banh-nuong-dau-xanh-hoa-mai', rating: 4, comment: 'Hộp quà đẹp, đậu xanh ngon. Sẽ đặt thêm.', userIndex: 3 },
];
