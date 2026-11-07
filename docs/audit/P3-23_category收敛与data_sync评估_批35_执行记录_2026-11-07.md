# 批 35 · category 自由文本收敛与 data_sync 路径评估 · 执行记录

> 日期：2026-11-07
> 范围：`master_data.mdm_suppliers.category` 自由文本列收敛；`svc/scm/src/modules/data_sync.rs` 与 mdm `supplier_sync.rs` 重叠评估
> 边界：不改 `scm.suppliers` / `srm.suppliers` 的 `category` 列；不硬删 `data_sync.rs`

---

## 任务一：`mdm_suppliers.category` 自由文本与 `category_code` 并存的收敛

### 取证证据

#### 1. 数据分布（psql 实测，`deleted_at IS NULL`）

| 维度 | 行数 |
|---|---|
| total | 287 |
| category_code IS NOT NULL AND category IS NOT NULL | 287 |
| category_code IS NULL AND category IS NOT NULL | 0 |
| category_code IS NOT NULL AND category IS NULL | 0 |
| both NULL | 0 |

进一步按 `(category, category_code)` 分组：

| category（自由文本） | category_code | 行数 | 来源推断 |
|---|---|---|---|
| `raw_material` | `raw_material` | 195 | scm 反向同步（scm.category 存标准码） |
| `原材料` | `raw_material` | 92 | srm 反向同步（srm.category 存中文） |

**结论**：`category` 自由文本是反向同步镜像，不是独立分类信息；同一 `category_code` 对应两种自由文本值。

#### 2. 数据库侧依赖

- **索引**：`mdm_suppliers_category_code_idx`（基于 category_code），无基于 category 自由文本的索引。
- **触发器**：0 个。
- **视图**：无视图引用 mdm_suppliers。
- **RLS policy**：`tenant_isolation_mdm_suppliers`，只依赖 `tenant_id`，不依赖 category。

#### 3. 前端消费面

| 文件:行号 | 消费方式 | 说明 |
|---|---|---|
| `apps/web/src/pages/srm/SrmSupplierDetailPage.tsx:162-164` | 展示 fallback | `category_code ? getNameZh(code, fallback=category) : category`；因所有行 category_code 非 NULL，fallback 永不触发 |
| `apps/web/src/schemas/srm/supplier.ts:72-78` | 列表 renderCell fallback | 同上 |
| `apps/web/src/schemas/erp/supplier.ts:72` | 列表 renderCell fallback | 同上 |
| `apps/web/src/schemas/srm/supplier.ts:232-246` | filter id='category' | value 是英文码 raw_material/packaging 等，传后端 `WHERE category = $2`——**漏数据**（92 行 category='原材料' 不会命中） |
| `apps/web/src/schemas/erp/supplier.ts:203-226` | filter id='category' | value 是中文（`shared.supplier.k2` 等） |
| `apps/web/src/api/master-data/suppliers.ts:44-53` | 写入路径 | `fillCategoryFromCode`：create/update 时若只传 category_code 没传 category，自动从字典补 name_zh 填到 category（为 srm NOT NULL 兼容） |

#### 4. 后端消费面

| 文件:行号 | 消费方式 | 说明 |
|---|---|---|
| `svc/master-data/src/modules/supplier_master.rs:94` | list filter | `WHERE ($2::text IS NULL OR category = $2)`——按自由文本过滤（漏数据 bug） |
| `svc/master-data/src/modules/supplier_master.rs:86` | list SELECT | SELECT category（展示 fallback 用） |
| `svc/master-data/src/modules/supplier_master.rs:376-393` | create 写入 | INSERT 写 category 和 category_code |
| `svc/master-data/src/modules/supplier_master.rs:479-507` | update 写入 | UPDATE 写 category 和 category_code |
| `svc/master-data/src/modules/supplier_sync.rs:106-117` | 同步翻译 fallback | `translate_to_scm`：字典 > mdm.category 自由文本 > NULL |
| `svc/master-data/src/modules/supplier_sync.rs:119-130` | 同步翻译 fallback | `translate_to_srm`：字典 > mdm.category 自由文本 > ''（srm NOT NULL 兜底） |
| `svc/scm/src/modules/supplier.rs:219` | 反向同步写入 | `category = EXCLUDED.category`（无条件覆盖 mdm.category，无 source_system='mdm' 保护） |
| `svc/srm/src/modules/supplier.rs:219` | 反向同步写入 | 同上 |

### 处置结论：走向 B（仍有消费 → 统一走 category_code）

**选择理由**：
- 走向 C（数据回填）不成立：`only_category_text = 0`，无需回填。
- 走向 A（已无消费）不成立：list filter 仍按自由文本过滤（且有 bug）。
- 走向 B 成立：仍有消费，但消费方式有问题（filter 漏数据），需统一走 category_code。

**落地改动**：

| 文件 | 改动 |
|---|---|
| `svc/master-data/src/modules/supplier_master.rs:94` | `SUPPLIER_FILTER`：`category = $2` → `category_code = $2`（修复漏数据 bug） |
| `svc/master-data/src/modules/supplier_master.rs:75` | `SupplierQuery.category` 加 `DEPRECATED` 注释 |
| `svc/master-data/src/modules/supplier_master.rs:86` | `SUPPLIER_COLUMNS` 加注释说明 category 自由文本已废弃 |
| `svc/master-data/src/modules/supplier_master.rs:1-30` | 模块头加批 35 取证与处置说明 |
| `apps/web/src/schemas/srm/supplier.ts:232` | filter id='category' 加注释说明实际按 code 过滤 |
| `apps/web/src/schemas/srm/supplier.ts:72` | renderCell fallback 加注释明确边界 |
| `apps/web/src/pages/srm/SrmSupplierDetailPage.tsx:161` | 展示 fallback 加注释明确边界 |
| `database/migrations/20261107000035_mark_mdm_suppliers_category_deprecated.sql` | `COMMENT ON COLUMN` 标废弃 |

**保持现状的部分**：
- create/update 仍写 category：为 srm.suppliers.category NOT NULL 兼容保留（前端 `fillCategoryFromCode` 会从字典补 name_zh）。
- `supplier_sync.rs` 翻译 fallback 仍用 category：srm.category NOT NULL 需要兜底。
- `scm/srm` 反向同步仍写 category：这是"镜像"语义，不是 bug。

---

## 任务二：`scm↔srm` 既有 `data_sync.rs` 的处置

### 取证证据

#### 1. 两套同步路径对比

| 维度 | `svc/scm/src/modules/data_sync.rs` | `svc/master-data/src/modules/supplier_sync.rs`（批 34） |
|---|---|---|
| 数据源 | `scm.srm_supplier_snapshots`（快照表） | `master_data.mdm_suppliers`（权威主表） |
| 写入目标 | `scm.suppliers`（仅单行） | `scm.suppliers` + `srm.suppliers`（双向） |
| 触发时机 | HTTP API（POST /sync/supplier-from-srm）+ 事件驱动（SupplierDataSyncRequested） | mdm 主写入后 `tokio::spawn` 后台异步 |
| 幂等键 | 按 `scm.suppliers.id` 匹配 | 按 `supplier_no` 唯一键 ON CONFLICT |
| 防环 | 无显式防环（写 scm.suppliers 会触发 scm→mdm 反向同步） | 直连写库，不调用 HTTP API，不触发下游写端点 |
| 字段覆盖 | name/legal_name/contact/phone/email/address/tax_id/status | 全字段（supplier_no/category/credit_rating/risk_level/bank 等） |
| sync_from_* 标记 | 写 `sync_from_srm = TRUE` | 写 `sync_from_srm = FALSE`（来自 mdm，不是 srm） |
| 全量批量 | 有 `sync_all_suppliers_from_srm`（:845） | 无（只有单行触发） |

#### 2. 事件流

- `svc/srm/src/modules/data_sync.rs:607-625`：srm 侧发布 `SupplierDataSyncRequested` 事件（direction='srm_to_scm'）。
- `svc/scm/src/modules/supplier.rs:95-114`：scm 侧也发布 `SupplierDataSyncRequested` 事件（direction='scm_to_srm'）。
- `svc/scm/src/event_handlers/mod.rs:293`：scm 订阅，只处理 `srm_to_scm` 方向，写 scm.suppliers + scm.srm_supplier_snapshots。
- `svc/srm/src/event_handlers/mod.rs:244`：srm 也订阅。

#### 3. 前端调用

- `apps/web/src/api/scm/writeOps.ts:10-13`：封装了 `syncSupplierFromSrm` API。
- 但 grep 确认：**无任何 UI 组件调用它**（只有 API 定义本身）。
- `apps/web/src/modules/scm/config.ts:564`：注释说"srm.suppliers 主数据源，scm 经 /sync/suppliers-from-srm 同步副本"。

#### 4. 实测（psql）

| 查询 | 结果 |
|---|---|
| `SELECT count(*) FROM scm.suppliers WHERE sync_from_srm = true` | 0 |
| `SELECT count(*) FROM srm.suppliers WHERE sync_from_scm = true` | 0 |
| `SELECT count(*) FROM scm.suppliers WHERE deleted_at IS NULL` | 195 |
| `SELECT count(*) FROM srm.suppliers WHERE deleted_at IS NULL` | 92 |
| `SELECT count(*) FROM master_data.mdm_suppliers WHERE deleted_at IS NULL` | 287 |
| `SELECT count(*) FROM master_data.mdm_sync_dead_letter` | 0 |

### 处置结论：保留为独立通道，标记停用

**选择理由**：
- mdm 同步已完全覆盖单行同步能力（且字段更全）。
- 但 `data_sync.rs` 的 `sync_all_suppliers_from_srm` 全量批量能力 mdm 侧没有——保留为独立通道。
- 前端 `writeOps.ts` 封装虽无 UI 调用，但 API 路由仍注册在 `create_routes()`——不硬删。

**落地改动**：

| 文件 | 改动 |
|---|---|
| `svc/scm/src/modules/data_sync.rs:1-30` | 模块头加批 35 状态评估：与 mdm 同步的对比、实测数据、启用前必须重新评估的三项（环/幂等键冲突/标记列语义） |

**保持现状的部分**：
- 不删除 `data_sync.rs` 代码。
- 不取消路由注册。
- 不停止事件订阅。

---

## DB 基线确认（2026-11-07）

| 表 | 行数 | 预期 |
|---|---|---|
| `master_data.mdm_suppliers`（deleted_at IS NULL） | 287 | 287 ✓ |
| `scm.suppliers`（deleted_at IS NULL） | 195 | 195 ✓ |
| `srm.suppliers`（deleted_at IS NULL） | 92 | 92 ✓ |
| `master_data.mdm_sync_dead_letter` | 0 | 0 ✓ |
| `scm.suppliers WHERE sync_from_srm = true` | 0 | 0 ✓ |
| `srm.suppliers WHERE sync_from_scm = true` | 0 | 0 ✓ |

---

## 开放问题（待用户拍板）

1. **是否在下一批彻底删除 `mdm_suppliers.category` 列？**
   - 前提：需先确认零读零写（当前仍有 list SELECT 展示 fallback 和 sync 翻译 fallback）。
   - 风险：删列需独立迁移 0036+，且要把 srm.suppliers.category NOT NULL 兜底改由同步管道内部生成（不再依赖 mdm.category 自由文本）。
   - 建议：再观察 1-2 个批次，确认前端展示 fallback 永不触发后再删。

2. **`scm/srm` 反向同步对 `mdm.category` 的无条件覆盖是否需要加 `source_system='mdm'` 保护？**
   - 现状：`svc/scm/src/modules/supplier.rs:219` `category = EXCLUDED.category`（无条件覆盖），但 `category_code` 有保护。
   - 影响：如果 mdm 自建供应商（source_system='mdm'），scm/srm 反向同步会覆盖其 category 自由文本——但这是"镜像"语义，不是 bug。
   - 建议：保持现状，category 已标废弃，不再是权威源。

3. **`data_sync.rs` 的事件订阅（`SupplierDataSyncRequested`）是否需要停止？**
   - 现状：srm 侧仍在发布事件，scm 侧订阅处理。
   - 影响：如果事件真的触发，会写 scm.suppliers 并触发 scm→mdm 反向同步，可能与 mdm 同步形成双重写。
   - 建议：保持现状（实测 sync_from_srm=true=0，说明事件未被触发），但在文档中明确"启用前必须重新评估环"。
