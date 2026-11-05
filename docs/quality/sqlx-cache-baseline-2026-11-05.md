# sqlx 宏查询缓存基线校准（2026-11-05）

> 目标：定位阻塞 `cargo sqlx prepare` 的 schema drift，给 `.sqlx` 一份可复现、与线上一致的基线。
> 约束：prod 只读；不删无法验证的缓存条目；scratch 仅本地/测试实例。

## 0. 结论

| 项 | 结论 |
|---|---|
| 直接根因 | `sqlx prepare` 只用**单连接**、单 `search_path`；monorepo 各服务运行时 `SEARCH_PATH` 不同。本地库角色默认 `mes, public` 把 analytics 的未限定表名解析到 `public` 下的**影子表**（时间戳 nullable），而运行/缓存契约是 `analytics,shared,public`（NOT NULL）→ 75 处 `Option<DateTime<Utc>>` 类型错误。 |
| 路径选择 | **B 不可行**：迁移链无法在空库干净重放（3 处硬错误，见 §2.2）。改走 **A 的可复现变体**：按 package 注入运行时 `search_path`，以 **prod 只读**作为权威基线 prepare；不修整库、不删缓存。 |
| prepare 结果 | **最终 39/39 package 全绿**（544 个子目录缓存合并，根 `.sqlx` 296 条）。首轮 36/39 失败的 `topems-mes`(93 错)、`topems-unified-core`(6 错)、`topems-server`(13 错) 已按 prod schema 修代码/补 search_path 收敛（见 §6）。 |
| `.sqlx` 变化 | 首轮 **107 变更 / 0 新增 / 0 删除**（101 条仅新增 `origin`，**6 条真实类型变化**：9 列 `Float8→Numeric`、2 列 `Varchar→Text`）；三包修复后 **122 变更 / 1 新增**（净迁移 `Numeric−52→Float8+52`、`Timestamptz+1/Date−1`、`Varchar+4`）；本条记录最终稳定态 296 条、无待提交 diff。 |
| 门禁 | `./scripts/dev/sqlx-prepare.sh --check` 通过；`SQLX_OFFLINE=true cargo check --workspace` exit 0。 |
| prod | **零变更**（仅 SSH 隧道读 + PREPARE 语句，无 DDL/DML）。 |

## 1. 复现命令与完整错误

```bash
set -a; source .env; set +a
SQLX_OFFLINE=false cargo sqlx prepare --check --workspace --database-url "$DATABASE_URL"
# => EXIT=101，75 个 E0308，全部位于 svc/analytics
#    expected `DateTime<Utc>`, found `Option<DateTime<Utc>>`  (created_at / updated_at)
```

用运行时 `search_path` 对 analytics 单独校验：

```bash
DATABASE_URL="${DATABASE_URL}?options=-c%20search_path%3Danalytics%2Cshared%2Cpublic" \
SQLX_OFFLINE=false cargo check -p topems-analytics   # exit 0
```

## 2. drift 清单

### 2.1 连接 / search_path 漂移（阻塞项，已修）

| 表列 | 本地 `public` | `analytics`/`bi` | prod | 证据 |
|---|---|---|---|---|
| `analytics_datasources.created_at / updated_at` 等 13 张 `analytics_*` | **存在，nullable，0 行** | `analytics`：NOT NULL；`bi`：NOT NULL | **无 public 影子表** | 本地 `public` 13 张（`relname like 'analytics_%'`），`20260901000000_drop_public_shadow_tables.sql` 明文应删；`20260903000001_rehome_5433_remaining_public.sql:1177` 归位到 `bi` |

- 本地角色默认 `search_path = mes, public`（`SELECT rolconfig FROM pg_roles WHERE rolname='topems_app'`），未限定名 `analytics_datasources` 命中 `public` 影子表。
- 运行时代码在连接建立后按 `SEARCH_PATH` 设置（`config/env/_template.env.example`：analytics → `analytics,shared,public`）。
- 因此 `cargo sqlx prepare`（单 URL、默认 search_path）**必然**生成/校验到错误表。修复：按下表逐 package 注入 `options=-c search_path=...`。

### 2.2 迁移链不可重放（Path B 否决证据）

在本地 scratch `topems_sqlx_scratch` 按 version 升序执行全部迁移：

| # | 迁移 | 错误 | 根因 |
|---|---|---|---|
| 1 | `20260831190850` | `type "public.vector" does not exist` | `CREATE EXTENSION vector` 需超级用户；本地以 `air` 预装 pgvector 后可继续 |
| 2 | `20260827000002` | `column "organization_id" does not exist` | `plugin_finance.accounting_subjects` 由更早迁移创建时无该列，`CREATE TABLE IF NOT EXISTS` 跳过，随后 `INSERT ... organization_id` 解析失败 |
| 3 | `20260831190000` | `relation "core_finance_account_opening_balances" already exists in schema "finance"` | 历史 `ALTER ... RENAME TO` 与既有同名关系冲突 |

第 3 处之后未再执行；故 scratch 无法作为完整基线，且**不通过补 shim 谎称重建完成**。

### 2.3 代码 ↔ prod 契约差异（prepare 仍失败的 3 个 package）

以 prod 只读做 `SQLX_OFFLINE=false cargo check`（逐 package，注入运行时 search_path）得到：

| package | 错误数 | 代表列 / 现象 | 影响 |
|---|---:|---|---|
| `topems-mes` | 93 | `mes.equipment_oee.*` prod `double precision` vs 代码 `BigDecimal`；`production_orders` 日期列 prod `timestamptz` vs 代码 `NaiveDate`；多处 `String` vs `Option<String>` | 宏查询无法在 prod 上校验；离线缓存仍是旧基线（numeric/date），**运行到 prod 会在解码/绑定处报错** |
| `topems-unified-core` | 6 | `iam.tool_permissions` / `tenant_permissions.tenant_id` prod `varchar` vs 代码传 `Uuid` | 同上 |
| `topems-server` | 13 | 单体聚合 crate 继承上述错误 | 同上 |

处理：按约束**保留**这三个 package 的既有缓存条目（不删、不静默覆盖），标记为“未校准”；需要单独的代码契约修复任务。

## 3. 路径决策

| | A：修 test/local 库 drift | B：scratch 空库重放 |
|---|---|---|
| 可重复性 | 依赖手工库状态，不可重复 | 可重复（本应最优） |
| 成本/风险 | 本地/test 库与 prod 差异过百列，逐列收敛成本高 | 迁移链有 3 处硬错误，无法干净重放 |
| 是否掩盖 drift | 会（改库让旧缓存“看起来”正确） | 不会 |
| 结论 | **采用（变体）** | **否决** |

采用变体：**不修改任何库**，仅让 prepare 的连接 `search_path` 与运行时一致，并以 prod 只读为权威基线。这样既不掩盖真实 drift（mes/unified-core 的错误被真实暴露），又可重复。

## 4. 已固化脚本

- `scripts/db/sqlx-search-path.map`：package → 运行时 search_path（新增服务须同步）。
- `scripts/dev/sqlx-prepare.sh`：
  - 新增 `SQLX_PREPARE_DB_URL`（覆盖 `.env` 的 `DATABASE_URL`）；
  - prepare 时按 map 为每个 package 追加 `?options=-c search_path=...`；
  - 失败 package 的半成品 `svc/*/.sqlx` 自动清理（否则离线编译会优先读子目录、绕过根缓存）。

复现（本地经 SSH 隧道；prod 只读）：

```bash
ssh -f -N -L 15432:127.0.0.1:5432 xingzhai@192.168.110.115
SQLX_PREPARE_DB_URL="postgres://xingzhai@127.0.0.1:15432/topems_prod" \
  ./scripts/dev/sqlx-prepare.sh
./scripts/dev/sqlx-prepare.sh --check        # 离线门禁
SQLX_OFFLINE=true cargo check --workspace    # 全仓离线编译
```

## 5. `.sqlx` diff（295 → 295）

- 新增 **0**、删除 **0**、变更 **107**。
- 101 条仅列对象新增 `origin` 元数据（`{"Table":{"table":...}}`），类型/可空不变。
- 6 条真实类型变化（旧基线 → prod）：

| query 主题 | 列 | 旧 | 新(prod) |
|---|---|---|---|
| wms 智能补货汇总 | `total_suggested_quantity` | Float8 | Numeric |
| wms 盘点明细 ×2 | `system_quantity` / `counted_quantity` / `discrepancy_quantity` | Float8 | Numeric |
| wms 批次汇总 | `total_quantity` / `total_value` | Float8 | Numeric |
| ai 设置查询/写入 ×2 | `default_model` | Varchar | Text |

> 这些列在 prod 为 `numeric`/`text`；旧缓存为 `float8`/`varchar`（来自漂移库）。离线编译已通过，但 `svc/wms/src/modules/stock_take.rs:47` 等 `try_get::<f64>` 仍属上一轮动态解码审计类风险，**建议单独复核**（本轮不改代码）。

## 6. 未完成 / 未实证

- ~~`topems-mes` / `topems-unified-core` / `topems-server` 未生成新缓存~~ **已闭环（2026-11-05 同日）**：以 prod schema 为权威修代码——mes 93→0、unified-core 6→0、server 零代码错误（map 新增 `topems-server` 宽 search_path 条目）。修复依据（prod `information_schema` 实测）：
  - `mes.equipment_oee`：`record_date`/`created_at`/`updated_at` = `timestamptz NOT NULL`；`planned_production_time`/`actual_run_time`/`ideal_cycle_time`/`actual_output`/`good_output` = `double precision NOT NULL`；`downtime`/`defective_output`/`availability`/`performance`/`quality_rate`/`oee` = `double precision NULL`。
  - `mes.production_orders`：四个 `*_date` 列均 `date NULL`（绑定改 `date_naive()`；读取路径 SQL 已显式 `::timestamptz`，保留 `DateTime<Utc>`）。
  - `mes.teams.leader_id` = `varchar NULL`（绑定/读取均按 `String`）。
  - `iam.tenant_permissions.tenant_id` = `varchar NOT NULL`（unified-core 改绑 `&str`）。
  - **收紧原则**：NOT NULL 列一律直接 `try_get::<f64 / DateTime<Utc>>`，不保留 `Option` 兜底；仅 prod 可空列保持 `Option` + `unwrap_or`。
- **最终覆盖率**：全量 `./scripts/dev/sqlx-prepare.sh` = **39/39 成功**，544 子目录缓存合并，根 `.sqlx` **296 条**；全量 `--check` 通过、`SQLX_OFFLINE cargo check --workspace` exit 0（0 error / 0 warning）。
- scratch 库 `topems_sqlx_scratch` 停在 `20260831190000`，后续迁移未执行；保留供复现，可随时删除。
- prod 基线依赖本机 SSH 隧道与只读角色；CI 无 DB，门禁仍为纯离线 `--check`。
- 本地 `public` 13 张影子表**未删除**（保留给本地单体 dev），因此不带 `search_path` 的裸 `cargo sqlx prepare` 仍会复现 analytics 错误——必须走脚本。
