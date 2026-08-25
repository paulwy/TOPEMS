# OpenAPI 生成与类型同步 SOP

> 标准化流程：后端新增/修改 API → OpenAPI spec 提取 → 聚合 → 前端 TS 类型生成 → 验证。
> 适用场景：新增 utoipa::path / ToSchema、修改 handler 签名、新增 service 端点。

## 触发条件

以下任一情况发生时，必须走完整 SOP：

- 后端新增 `#[utoipa::path]` 注解或 `ToSchema` derive
- 修改 handler 的请求/响应类型（新增/删除/重命名字段）
- 新增 service 或迁移端点到不同 service
- 前端 `openapi.d.ts` 中出现 `SafeSchema<'Xxx'>`（表示 schema 未注册，需后端补 ToSchema）

## 标准流程（4 步）

### Step 1: 后端补 ToSchema / utoipa::path

确保所有新增的请求/响应 DTO 都 derive 了 `ToSchema`，所有 handler 都有 `#[utoipa::path]` 注解。

```rust
// 示例：DTO 补 ToSchema
#[derive(Serialize, Deserialize, ToSchema)]
pub struct AccountOpeningBalance {
    pub id: Uuid,
    pub period: String,
    // ...
}

// 示例：handler 补 utoipa::path
#[utoipa::path(
    get,
    path = "/api/finance/settlement/accounts",
    responses((status = 200, body = Vec<AccountOpeningBalance>)),
)]
pub async fn list_accounts(/* ... */) -> impl IntoResponse { /* ... */ }
```

在 `svc/<service>/src/openapi.rs` 的 `paths![]` 和 `schemas![]` 中注册新增的路径和 schema。

### Step 2: 提取各服务 OpenAPI spec

```bash
# 方式 A：通过 cargo test 提取（推荐，无需启动服务）
./scripts/openapi/generate.sh --extract

# 方式 B：从运行中的服务抓取
./scripts/openapi/generate.sh

# 单服务提取
./scripts/openapi/generate.sh --extract --service finance
```

输出：`docs/api/openapi-aggregated.json`（聚合后的统一文档）

### Step 3: 生成前端 TypeScript 类型

```bash
# 聚合 + 生成 TS 类型（一步到位）
./scripts/openapi/generate.sh --extract --with-types

# 或仅生成类型（已有聚合 JSON 时）
node scripts/openapi/gen-types.mjs
```

输出：`packages/shared-types/src/generated/openapi.d.ts`

### Step 4: 验证

```bash
# 1. 前端类型检查 0 errors
cd apps/web && npx tsc --noEmit

# 2. shared-types 类型检查
cd packages/shared-types && npx tsc --noEmit

# 3. 确认无 SafeSchema 占位（表示 schema 未注册）
grep -n "SafeSchema" packages/shared-types/src/generated/openapi.d.ts | head -10
# 期望：0 命中（或仅有已知的、计划后续补的条目）

# 4. schema 数量增长确认（可选）
grep -c '"[A-Z][a-zA-Z]*":' packages/shared-types/src/generated/openapi.d.ts
```

## 常见陷阱

| 陷阱 | 现象 | 解决 |
|------|------|------|
| DTO 未 derive ToSchema | 前端出现 `SafeSchema<'Xxx'>` | 后端补 `#[derive(ToSchema)]` + schemas![] 注册 |
| handler 缺 utoipa::path | openapi.json 中缺该端点 | 后端补 `#[utoipa::path]` + paths![] 注册 |
| 字段类型变更未 regen | 前端 tsc 报属性不存在/类型不匹配 | 重新走 Step 2-4 |
| 嵌套类型未注册 | 外层 schema 有，但内层字段是 SafeSchema | 内层 DTO 也需 ToSchema + schemas![] 注册 |
| 枚举未注册 | 前端类型是 string 而非联合类型 | 枚举 derive ToSchema + schemas![] 注册 |

## 文件清单

| 文件 | 作用 |
|------|------|
| `scripts/openapi/generate.sh` | 统一生成入口（提取/聚合/类型） |
| `scripts/openapi/aggregate.py` | 多服务 spec 聚合（纯 python3） |
| `scripts/openapi/gen-types.mjs` | OpenAPI JSON → TypeScript 类型生成 |
| `docs/api/openapi-aggregated.json` | 聚合后的 OpenAPI 文档（主输出） |
| `packages/shared-types/src/generated/openapi.d.ts` | 前端 TS 类型（前端引用源） |

## 历史验证

- V286 B 轨：后端补 settlement_center ToSchema → cargo extract → gen-types → tsc 0
- V287 B 轨：前端 openapi.d.ts regen 两步走验证
- V289 D 轨：settlement_center 19 个 utoipa::path + 3 migration，schema 注册增量
