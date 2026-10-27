/* Sinh docs/ERD.md (Mermaid erDiagram) từ server/prisma/schema.prisma
   Chạy: node scripts/erd.mjs  */
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve('server/prisma/schema.prisma'), 'utf8');
const blocks = [...src.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
const models = blocks.filter((b) => b[1] === 'model');
const enums = blocks.filter((b) => b[1] === 'enum');

const TYPE_MAP = {
  String: 'varchar', Int: 'int', BigInt: 'bigint', Decimal: 'decimal(12,2)',
  DateTime: 'datetime', Boolean: 'boolean', Json: 'json', Bytes: 'blob',
};

const MODEL_TABLE = new Map(
  models.map(([, , n, b]) => [n, /"([^"]+)"/.exec(b.split('\n').map((l) => l.trim()).find((l) => l?.startsWith('@@map')) ?? '')?.[1] ?? n]),
);

const entities = [];
const relations = [];
const indexNotes = [];
const softDeletes = [];

for (const [, , name, bodyRaw] of models) {
  const lines = bodyRaw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('///'));
  const tableName = /"([^"]+)"/.exec(lines.find((l) => l.startsWith('@@map')) ?? '')?.[1] ?? name;

  const fields = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('@') || line.startsWith('//')) continue;
    const m = /^(\w+)\s+([A-Za-z]\w*)(\[\])?(\?)?\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, fname, ftype, isList, , rest] = m;
    const mods = [rest];
    for (let j = i + 1; j < lines.length && lines[j].startsWith('@'); j++) mods.push(lines[j]);

    const rel = mods.find((l) => l.includes('@relation'));
    if (rel && rest.includes('@relation')) {
      const fk = /fields:\s*\[([^\]]+)\]/.exec(rel)?.[1] ?? '';
      const ref = /references:\s*\[([^\]]+)\]/.exec(rel)?.[1] ?? '';
      const to = MODEL_TABLE.get(ftype) ?? ftype;
      const one = mods.some((l) => l.includes('@unique'));
      if (fk) relations.push([to, tableName, `${fk} → ${ref}`, one ? '||--||' : '||--o{']);
      continue; // trường quan hệ không liệt kê như cột
    }
    if (isList || (MODEL_TABLE.has(ftype) && !rest.includes('@relation'))) continue;

    const flags = [];
    if (mods.some((l) => l.includes('@id'))) flags.push('PK');
    if (mods.some((l) => l.includes('@unique'))) flags.push('UQ');
    if (mods.some((l) => l.includes('@default'))) flags.push('def');
    const type = TYPE_MAP[ftype] ?? ftype.toLowerCase();
    fields.push(`${type} ${fname}${flags.length ? ' "' + flags.join(',') + '"' : ''}`);
  }

  const idx = lines.filter((l) => l.startsWith('@@index') || l.startsWith('@@unique'));
  if (idx.length) indexNotes.push(`- \`${tableName}\`: ${idx.map((l) => l.replace(/^@@(index|unique)\s*/, '').replace(/[()]/g, '')).join('; ')}`);
  if (lines.some((l) => /^deletedAt\s+DateTime/.test(l))) softDeletes.push(tableName);

  entities.push(`  ${tableName} {\n${fields.map((f) => '    ' + f).join('\n')}\n  }`);
}

const enumBlock = enums.map(([, , n, b]) => `${n}: ${b.split('\n').map((l) => l.trim()).filter(Boolean).join(' | ')}`).join('\n');

const md = `# ERD — Nini Cakes (MySQL 8 / Prisma)

> Sinh tự động từ \`server/prisma/schema.prisma\` bằng \`node scripts/erd.mjs\`. Tên bảng là \`@@map\` (snake_case), kiểu là kiểu vật lý MySQL tương ứng.
> Ký hiệu: \`"PK"\` khóa chính, \`"UQ"\` unique, \`"def"\` có giá trị mặc định.

## Sơ đồ quan hệ

\`\`\`mermaid
erDiagram
${relations.map(([a, b, label, card]) => `  ${a} ${card} ${b} : "${label}"`).join('\n')}
\`\`\`

## Bảng và cột

\`\`\`mermaid
erDiagram
${entities.join('\n')}
\`\`\`

## Enum (Prisma → MySQL)

${enumBlock.split('\n').map((l) => '- ' + l).join('\n')}

## Khóa và chỉ mục phụ

${indexNotes.join('\n')}

## Xóa mềm (soft delete)

Bảng có cột \`deletedAt\` (khác null = đã xóa, mọi truy vấn customer đều lọc \`deletedAt: null\`):
${softDeletes.map((t) => '- ' + t).join('\n')}

Các bảng còn lại dùng \`isActive\`/\`status\` để ẩn khỏi storefront (banner, category, product, user).

## Ghi chú thiết kế

- Tiền: **mọi cột tiền là \`INT\`** (số nguyên VNĐ, không dùng DECIMAL/float) — \`price\`, \`compareAtPrice\`, \`unitPrice\`, \`lineTotal\`, \`discountAmount\`, \`shippingFee\`, \`total\`, \`minSubtotal\`, \`maxDiscount\`. Cách này tránh lỗi làm tròn và khớp với cách hiển thị \`formatVND\`.
- \`order_items\` lưu **snapshot** \`name\`, \`unitPrice\`, \`imageUrl\`, \`options\` (JSON) để lịch sử không đổi khi sản phẩm bị sửa.
- \`orders\` lưu snapshot địa chỉ (\`receiverName\`, \`receiverPhone\`, \`addressLine\`, \`ward\`, \`district\`, \`city\`, \`note\`) + \`deliverySlot\`.
- \`order_status_histories\` ghi mọi lần đổi trạng thái (kèm \`changedById\`) — dùng cho trang theo dõi đơn và audit.
- \`refresh_tokens\` lưu **hash** token, gắn \`userId\` + \`expiresAt\` + \`revokedAt\` để xoay vòng (rotation) và thu hồi khi logout.
- \`carts\` liên kết theo \`token\` (khách vãng lai) hoặc \`userId\` (đã đăng nhập); khi đăng nhập thì gộp giỏ.
- \`ingredients\` ↔ \`allergens\` qua \`ingredient_allergens\`; \`products\` ↔ \`allergens\` qua \`product_allergens\` (đệ quy từ nguyên liệu khi lưu sản phẩm).
- Mối \`payments\` → \`orders\` và \`refresh_tokens\` → \`users\` là ON DELETE Cascade; \`order_items\` → \`products\` là SetNull nên lịch sử đơn còn nguyên sau khi ẩn sản phẩm.
`;

fs.mkdirSync(path.resolve('docs'), { recursive: true });
fs.writeFileSync(path.resolve('docs/ERD.md'), md, 'utf8');
console.info(`docs/ERD.md: ${models.length} bảng, ${relations.length} quan hệ, ${softDeletes.length} bảng soft delete`);
