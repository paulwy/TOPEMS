# 后端数据多语言扩展指南

本指南说明 TOPEMS 后端如何为新模块/新字段接入**运行时按语言切换**的双语数据。
试点模块：ERP 公告（`erp.announcements` 的 title/content）、PM 项目名（`pm.projects` 的 name）。

## 设计思路

采用**字段级双语列 + SQL `CASE WHEN` 切换**，而非通用翻译表：

- 每个需要双语的字段，在原中文字段旁加一个 `*_en` 英文备用列。
- 查询时用 SQL 表达式按请求语言选择列，未提供英文时 `COALESCE` 回退中文原列，天然向后兼容。
- Rust 数据模型（`FromRow` struct）**不新增字段**——英文列只在 SQL 层参与 `CASE`，不进入结构体。
- 语言来自请求头：优先 `X-Lang`，其次 `Accept-Language`；缺失/未知一律回退中文（`zh`），与历史行为一致。

## 接入新模块的四步

### 1. 迁移加 `*_en` 列

在 `database/migrations/` 新增幂等迁移（命名 `YYYYMMDDNNNNNN_slug.sql`）：

```sql
ALTER TABLE your_schema.your_table ADD COLUMN IF NOT EXISTS name_en VARCHAR(500);
```

### 2. Handler 解析语言

在查询 handler 签名加 `headers: HeaderMap`，解析成 SQL 绑定值：

```rust
use topems_shared_core::locale::Locale;

let locale = Locale::from_headers(&headers).as_sql(); // "zh" / "en"
```

`Locale` 已在 `lib/shared-core/src/locale.rs`，crate 名 `topems-shared-core`，无需新增依赖。

### 3. SELECT 用 CASE 切换，且必须显式列清单

```sql
SELECT id,
       CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
       code, status, created_at
FROM your_schema.your_table
```

并把 `.bind(locale)` 作为绑定参数。`RETURNING` 同理用同一个 `CASE` 表达式返回本地化后的值。

### 4. 写接口接受可选 `*_en` 字段

请求 DTO 加 `pub name_en: Option<String>`：

- INSERT：列清单加 `name_en`，绑定 `req.name_en`。
- UPDATE：`name_en = COALESCE($n, name_en)`（不传则保留原值）。

## 注意事项

- **不要 `SELECT *`**：新增 `*_en` 列后，`SELECT *` 会把英文列也查出来；虽然 `FromRow` 默认忽略多余列，但显式列清单更安全、且能在 `name` 上套 `CASE`。本试点已把 list/get/create/update 改为显式列清单。
- **合并/回退读取要用原始列**：update handler 里用于“未传字段则沿用旧值”的 `SELECT ...` 应读原始 `name` 列，而不是 `CASE` 后的本地化值，否则会把英文版误写回中文列。
- **默认中文**：无 `Accept-Language` / 未知语言一律 `zh`，老前端、老调用方零改动。
- **BFF 要透传**：Portal/各 BFF 代理默认不转发请求头。读接口需把入站 `accept-language` 透传给下游（参见 `svc/portal/src/modules/announcements.rs` 的 `forward_accept_language`）。前端在 `apps/web/src/api/client.ts` 的 axios 拦截器里注入 `Accept-Language`。
- **幂等迁移**：统一用 `ADD COLUMN IF NOT EXISTS`，双库（5432/5433）可重放。
