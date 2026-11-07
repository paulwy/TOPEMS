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

## 生成门禁与分批策略（W6-C，2026-11-07）

### 门禁

`lefthook.yml` 的 `openapi-gate` 与 CI 的 `openapi-gate` job 在 `svc/**/*.rs`、`lib/**/*.rs`、
`docs/api/openapi*`、`scripts/openapi/**` 变更时触发，跑两道检查：

| 检查 | 脚本 | 基线 | 语义 |
|---|---|---|---|
| 权威产物覆盖 | `scripts/ci/check-openapi-coverage.cjs` | `docs/api/openapi-baseline-gaps.json` | live 路由 ↔ `docs/api/openapi.json`，基线只降不升 |
| 聚合产物棘轮 | `scripts/ci/check-openapi-aggregated.cjs` | `scripts/ci/openapi-aggregated-baseline.json` | live 路由 ↔ `docs/api/openapi-aggregated.json`，missing/extra 计数只降不升 |

重生成后收紧基线：

```bash
./scripts/openapi/generate.sh --extract
node scripts/ci/check-openapi-coverage.cjs --gen-baseline
node scripts/ci/check-openapi-aggregated.cjs --update-baseline
```

### 当前漂移规模（2026-11-07 实测）

| 指标 | 值 |
|---|---|
| live 路由（方法×路径，静态抽取） | 3,926 |
| `docs/api/openapi.json` 覆盖 | 3,140 方法项（missing 1,861 / extra 1,075，已入基线） |
| `docs/api/openapi-aggregated.json` 覆盖 | 873 方法项（missing 3,788 / extra 735，已入棘轮基线） |
| 聚合产物最后更新 | 2026-09-06（YAML 2026-08-23） |
| 用本地已有 spec 预演重生成 | paths 716 → 1,446（+730），schema 527 → 410（-117，旧产物含过期 schema），单文件约 1.2MB |

结论：一次性全量重生成是**单文件大 diff**（约 +730 paths / 数量级数千行），不是上千个文件；
按「产物单独提交、可逐字复核生成时间与命令」的方式推进，不混入业务代码提交。

### 分批推进建议

| 批次 | 服务组 | 说明 |
|---|---|---|
| B1 | unified-core、monitor、plugin-registry、search、communication、integration、mobile | 平台/治理面，schema 变更最频繁 |
| B2 | erp、finance、hrm、pm、crm、mes、pdm | 业务主域，path 增量最大 |
| B3 | scm、wms、srm、qms、lims、ehs、rd | 供应链/质量域 |
| B4 | bi/analytics、portal、gis、ticket、feedback、master-data、tms | 分析与入口域 |

每批完成后：`generate.sh --extract`（可先用 `--extract-services` 预演单批）→ 单独提交
`docs/api/openapi-aggregated.{json,yaml}` → 收紧两份基线 → 记录本批 missing/extra 变化。
注意：`aggregate.py` 以输入目录全量重建聚合产物，分批推进时每批仍需提供全量 spec，
或在后续为 `aggregate.py` 增加「合并既有产物」开关（本批未实现，避免与生成物一起变更）。

## 历史验证

- V286 B 轨：后端补 settlement_center ToSchema → cargo extract → gen-types → tsc 0
- V287 B 轨：前端 openapi.d.ts regen 两步走验证
- V289 D 轨：settlement_center 19 个 utoipa::path + 3 migration，schema 注册增量
