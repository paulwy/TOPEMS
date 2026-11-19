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

# 单服务提取（--extract-services 支持逗号分隔多个服务）
./scripts/openapi/generate.sh --extract --extract-services finance

# 预演：输出到临时目录，不覆盖仓库产物
./scripts/openapi/generate.sh --extract --extract-services crm --output-dir /tmp/openapi-out
```

输出：`<output-dir>/openapi-aggregated.json`（默认 `docs/api/`，该路径已 `.gitignore`，**不再入库**；
建议显式指定 `--output-dir /tmp/openapi`，避免污染工作区）

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
| `scripts/openapi/gen-types.mjs` | OpenAPI JSON → TypeScript 类型生成（自动选源：本地聚合 → 权威 `openapi.json` → 手写 YAML） |
| `scripts/openapi/make-manifest.mjs` | 为聚合产物生成 manifest（commit / 计数 / sha256） |
| `docs/api/openapi-aggregated.json` | 聚合后的 OpenAPI 文档（**产物，不入库**；CI 发布 artifact / Release 附件） |
| `packages/shared-types/src/generated/openapi.d.ts` | 前端 TS 类型（前端引用源） |

## 生成门禁与分批策略（W6-C，2026-11-07）

### 门禁

`lefthook.yml` 的 `openapi-gate` 与 CI 的 `openapi-gate` job 在 `svc/**/*.rs`、`lib/**/*.rs`、
`docs/api/openapi*`、`scripts/openapi/**` 变更时触发，跑两道检查：

| 检查 | 脚本 | 基线 | 语义 |
|---|---|---|---|
| 权威产物覆盖 | `scripts/ci/check-openapi-coverage.cjs` | `docs/api/openapi-baseline-gaps.json` | live 路由 ↔ `docs/api/openapi.json`，基线只降不升 |
| 聚合产物棘轮 | `scripts/ci/check-openapi-aggregated.cjs` | `scripts/ci/openapi-aggregated-baseline.json` | live 路由 ↔ 聚合产物，missing/extra 计数只降不升 |

聚合产物自 2026-11-19 起不再入库：本地门禁以 `--allow-missing` 运行（产物不存在时跳过），
CI 由 `.github/workflows/openapi-aggregated.yml` 先生成再跑同一棘轮（不传 `--allow-missing`）。

重生成后收紧基线：

```bash
./scripts/openapi/generate.sh --extract
node scripts/ci/check-openapi-coverage.cjs --gen-baseline
node scripts/ci/check-openapi-aggregated.cjs --update-baseline
```

### 当前漂移读数

实时读数以门禁输出为准（基线文件：`docs/api/openapi-baseline-gaps.json`、
`scripts/ci/openapi-aggregated-baseline.json`）。2026-11-19 本地实测：

| 指标 | 值 |
|---|---|
| live 路由（方法×路径） | 3,968 |
| 权威 `docs/api/openapi.json` | 2,463 paths / 821 schemas（missing 1,908 / extra 992，已入基线） |
| 聚合产物 | 3,007 方法项（missing 3,088 / extra 2,127，已入棘轮基线） |

（2026-11-07 的历史读数已移除，避免与当前基线混淆。）

### 产物发布与获取（2026-11-19 起）

聚合产物不再入库，由 `.github/workflows/openapi-aggregated.yml` 在 **tag（`v*`）与手动触发** 时生成：

| 渠道 | 名称 | 保留期 |
|---|---|---|
| Actions artifact | `openapi-aggregated-<commit-sha>` | 90 天 |
| Release 附件 | `openapi-aggregated.json` + `openapi-aggregated.manifest.json` | 永久（随 tag） |

manifest 字段：`commit`、`generated_at`、`generator`、`paths`、`operations`、`schemas`、
`sha256`（以及 `files[]` 内各文件哈希）。获取与校验：

```bash
gh run download -n openapi-aggregated-<sha> -D /tmp/openapi
shasum -a 256 /tmp/openapi/openapi-aggregated.json   # 与 manifest.sha256 比对
node scripts/ci/check-openapi-aggregated.cjs --aggregated-path /tmp/openapi/openapi-aggregated.json
```

CI 不可用时（如 Actions 计费停摆）应急口径——本地生成后手工上传：

```bash
./scripts/openapi/generate.sh --extract --output-dir /tmp/openapi
node scripts/openapi/make-manifest.mjs --artifact /tmp/openapi/openapi-aggregated.json
gh release upload <tag> /tmp/openapi/openapi-aggregated.json /tmp/openapi/openapi-aggregated.manifest.json
```

## 历史验证

- V286 B 轨：后端补 settlement_center ToSchema → cargo extract → gen-types → tsc 0
- V287 B 轨：前端 openapi.d.ts regen 两步走验证
- V289 D 轨：settlement_center 19 个 utoipa::path + 3 migration，schema 注册增量
