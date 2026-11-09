# 生产实际结构 vs 迁移声明结构 — 全量偏差盘点

- 日期：2026-11-09
- 范围：`topems_prod`（192.168.110.115，PG 18.4）vs 仓库迁移链（`database/migrations/*.sql`，636 个 14 位版本文件 + 14 个 3 位历史文件）
- 模式：**全程只读**。生产侧只执行 `SELECT` 与 `pg_dump --schema-only`；未写入、未重启、未部署。基线库仅建在本地临时实例（`initdb` → `/tmp/topems_drift_pg`，端口 5499，socket 私有目录），盘点结束即销毁。
- 关联文档：[prod-pending-migration-triage-2026-11-06.md](file:///Users/air/TOPEMS/docs/quality/prod-pending-migration-triage-2026-11-06.md)、[initial-baseline-standard.md](file:///Users/air/TOPEMS/docs/quality/initial-baseline-standard.md)

---

## 0. 结论速览

| 类别 | 数量 | 说明 |
|---|---|---|
| **A 会导致运行时失败** | **6 个结构对象 + 18 个权限码** | 3 张/1 组表缺失、1 个列缺失、1 组列类型与代码不匹配、18 个被路由强制校验的权限码在库中不存在 |
| B 少约束/少索引/少数据 | 4 组 | `ck_formulas_approval_status`、`idx_rd_deploys_formula`+FK、10 个域管理员角色、资产分类种子 |
| C 纯元数据/账本 | 6 项 | 注释、已被后续迁移取代、对象已存在但账本未登记 |
| 生产多余对象 | 7 个 | 6 张 0 行遗留/影子表 + 1 个测试 schema 表 + 1 个脚本审计表 |
| 账本缺口 | **43 个版本** | 15 个定向（test/5433）迁移（设计上禁止应用到 prod）+ **28 个功能性迁移**从未入账且全部 ≤ 当前锚点 |

**根因（比缺失清单本身更重要）**：`apply-forward.sh` 的锚点取 `max(version) WHERE success`。本轮窗口为 `20261107000018 → 20261108141500` 之间挑选了部分版本应用，之后锚点直接跳到 `20261108141500`；所有被 `--defer` 或被 `--only` 排除、但仍排在其间的版本，**从此永久无法再被 apply-forward 应用**。`finance:admin` 两次事故同源。这不是"忘了跑一次"，是机制允许"延迟=永久丢弃"。

---

## 1. 方法与环境

### 1.1 两条基线

| 基线 | 构建方式 | 用途 | 结果 |
|---|---|---|---|
| **A：从零基线** | 临时集群 → `database/init/*.sql`（03→12）→ 全部 `database/migrations/*.sql` 逐条单事务 | 回答"哪些迁移在干净库上跑不过" | **init 11 个脚本只有 `12_search_recent.sql` 成功；迁移 19 条失败**；最终仅 1232 个 relation，比声明链少 118 个 |
| **B：锚点基线（声明链）** | 同一临时集群 → 还原 `database/baseline/prod_schema_20261105235700.sql.gz` + `prod_ledger_20261105235700.sql` → `apply-forward.sh` 应用 `> 20261105235700` 全部 58 条 | 结构化 diff 的声明侧 | 1350 个 relation；仅 `20261108091000`（纯 DML 守卫）失败，其余 57 条成功 |

临时集群另外补齐了生产同名的 4 个角色（`topems`/`topems_app`/`topems_prod`/`rls_test_user`），否则 `20261105235800` 会因 `role "topems" does not exist` 失败——这本身暴露**迁移链对执行环境角色有硬依赖**。

### 1.2 快照口径

两侧各执行同一份目录查询（`/tmp/topems_snapshot.sql`），输出单个 JSON，覆盖：

- schema：名称、owner、ACL
- 表/视图/序列：`relkind`、owner、`relacl`、`relrowsecurity`、`relforcerowsecurity`
- 列：`format_type`、`attnotnull`、默认表达式、identity/generated、collation、列级 ACL
- 约束：类型、`pg_get_constraintdef`、`convalidated`
- 索引：`pg_get_indexdef`、unique/primary/valid
- 函数：identity args、返回类型、语言、`SECURITY DEFINER`、`proconfig`、owner、ACL
- 触发器：`pg_get_triggerdef`
- RLS 策略：cmd、roles、qual、with_check、permissive
- 分区父子关系与分区界

结构化 diff 按"对象键"对齐（`schema.table` / `schema.table.column` / `schema.table.constraint`），对定义做空白归一，**不做文本 diff**。owner/ACL 单独归一（剥掉 grantor）并单独成节。

### 1.3 只读证明

- 生产侧全部为 `psql -c "SELECT ..."`、`psql -f <只读目录查询>`、`pg_dump --schema-only`。
- 未执行任何 `INSERT/UPDATE/DELETE/ALTER/CREATE/DROP`，未调用部署脚本，未重启服务。
- 基线库对象仅存在于 `/tmp/topems_drift_pg`，与本任务产物一并清理。

---

## 2. 账本侧盘点

### 2.1 数字

| 项 | 值 |
|---|---|
| 生产 `_sqlx_migrations` 成功记录 | 607（其中 14 位版本 593，3 位历史版本 14） |
| 仓库迁移文件（14 位版本） | 636 |
| **文件存在、账本没有** | **43**（全部 ≤ 锚点 `20261108141500`） |
| **账本有、文件不存在** | **0**（3 位版本 0–13 均可一一映射到 `000_create_schemas.sql` … `013_login_log.sql`） |
| 失败的账本记录 | 0 |
| 锚点 | `20261108141500` |

### 2.2 43 个"锚点前未应用"版本

- 15 个定向迁移（`dbNN_test` / `dbNN_5433` / `test_*` / `5433_*`），按 prod 门禁**本来就不允许应用**，其存在属于仓库卫生问题，不是生产缺陷。
- **28 个功能性迁移**从未入账，且因锚点已越过它们，`apply-forward.sh` 永远不会再应用。逐条核实见附录 A。

其中 `20261107000003/000004` 等早前 triage 中提到的版本，本轮已确认进入账本（说明后续窗口应用过）；真正被永久遗留的是上表 43 个。

### 2.3 机制缺陷（必须修）

1. `--defer` 与锚点前移的组合没有"防止永久孤儿"的守卫：应用一条更晚版本后，先前 defer 的版本自动变成死信。
2. `gen-baseline.sh` 的锚点对齐检查依赖静态 `known_not_applied_versions` 白名单（16 条）；当前实际是 43 条，说明白名单已漂移。生成新基线时若未同步，检查会误报或误放。
3. 建议在 `apply-forward.sh` 增加硬守卫：**待应用集合中若存在 version < 本次将写入的目标版本，且未被显式标记 `superseded`，拒绝执行**；并在 CI 增加"迁移文件版本 ≤ 生产锚点但不在账本"的告警（白名单需要逐条理由）。

---

## 3. 从零构建可复现性（基线 A）

### 3.1 `database/init` 已不可用于从零建库

| 脚本 | 结果 | 首要错误 |
|---|---|---|
| `03_init_permissions.sql` | FAIL | `syntax error at or near "ON"`（第 187 行 `ON CONFLICT`；前序语句结构已不成立） |
| `04_create_scm_wms_srm_tables.sql` | FAIL | `schema "unified_core" does not exist` |
| `05_mobile_init.sql` | FAIL | `schema "iam" does not exist` |
| `06_iam_schema.sql` | FAIL | `function public.uuid_generate_v4() does not exist`（扩展未创建） |
| `07_core_schema.sql` | FAIL | `type "public.vector" does not exist`（`vector` 扩展未创建） |
| `07_create_qms_tables.sql` | FAIL | `multiple primary keys for table "qa_standards" are not allowed`（自身定义重复） |
| `08_mdm_schema.sql` | FAIL | `schema "master_data" does not exist` |
| `09_erp_finance_wms_schema.sql` | FAIL | `schema "erp" does not exist` |
| `10_ehs_schema.sql` | FAIL | `relation "ehs.monitoring_points" does not exist`（脚本内顺序问题） |
| `11_bi_org_stats.sql` | FAIL | `relation "hrm.companies" does not exist` |
| `12_search_recent.sql` | OK | — |

共同点：init 脚本假定 schema 与扩展**已经存在**，而 schema/扩展的创建在迁移链 `000_create_schemas.sql` 与后续扩展迁移里。两者从来不是可拼接的顺序；README 的"03→05"历史流程也证明不了可重建（`04` 依赖的 `unified_core` 无任何 init 脚本创建）。

### 3.2 干净库上失败的迁移（19 条）

主要失败原因分三类：

- **依赖 init 产物**（缺 `mes`/`flow`/`iam` 基表或 schema）：`20261005000004`、`20261029185000`、`20261029200000`、`20261102220000`、`20261103200000`、`20261103210000`、`20261103230000`、`20261104000000`、`20261104030000`、`20261104040000`、`20261104050000`、`20261104070000`、`20261104130000`、`20261104140000`、`20261104150000`、`20261105100000`、`20261107000002`、`20261107000026`
- **环境角色缺失**：`20261105235800`（`role "topems" does not exist`）
- **语义守卫拒绝执行**：`20261105100000`（`P4 ABORT: mes.tenant_permissions inbound FK remains`）

结论：**仓库目前不存在可信的"从零重建"路径**。唯一可复现的声明链是"生产锚点 dump + 前向迁移"（基线 B）。这本身是 P3 之前必须解决的前置问题：灾难恢复若走 init+migrations，会得到一个比生产少 118 个 relation 的库。

---

## 4. 缺失对象清单（生产无、迁移声明有）

### 4.1 A 级：会导致运行时失败

#### A-1 结构类（6 项）

| # | 对象 | 声明来源（未应用） | 生产现状 | 代码证据 | 运行时后果 |
|---|---|---|---|---|---|
| A1 | `master_data.mdm_suppliers` | `20261107000029` | 表不存在 | `svc/master-data/src/modules/supplier_master.rs`（CRUD 直查该表）；`scm` 供应商同步/去重也引用 | `/master-data/suppliers*` 500；SCM 供应商写入/同步 500 |
| A2 | `master_data.mdm_supplier_categories` | `20261107000031` | 表不存在 | `svc/scm` 供应商分类去重逻辑引用 | 供应商保存/导入 500 |
| A3 | `master_data.mdm_sync_dead_letter` | `20261107000033` | 表不存在 | `svc/scm` 同步失败落库路径 | 同步失败时二次异常 500，且丢失失败记录 |
| A4 | `master_data.mdm_data_asset_categories` | `20261107000034`（生产仍是旧名 `mdm_asset_categories`，旧表 0 行） | 新名表不存在 | `svc/master-data/src/modules/knowledge_v53.rs` 查询新名 | 资产分类列表/详情 500 |
| A5 | `rd.deploys.formula_id` | `20261107000036` | 列不存在（`rd.deploys` 0 行） | `svc/rd/src/modules/rd_ci_cd.rs:599` `SELECT d.formula_id` | `GET /rd/deploys` **立即 500**（列不存在，即便 0 行也会在解析期报错） |
| A6 | `rs.formulas.created_by` / `rs.formula_versions.created_by` 类型 | `20261107000036` 将 `uuid → text`（"与 Rust 侧一致"） | 生产仍为 `uuid` | `svc/rd/src/models/formula.rs`：`created_by: String`；`formula.rs` 绑定 `&claims.sub`（String） | 公式新建/版本写入时 sqlx 参数类型不匹配 → 500；列表在非空后解码失败 |

> 说明：`20261107000002`（`core_tenant_modules.tier`）**不属于 A 级**。生产 `public.core_tenant_modules` 已有 `tier`（`varchar default 'basic'`，可空），代码使用未限定名的 `core_tenant_modules` 且连接 search_path 落在 `public`；缺失的只是 `iam` 影子副本（0 行、无引用），该迁移已被后续 `20261107000014` 取代。

#### A-2 权限码类（18 项，全部为 403 而非 500，属同一"补码未补"事故族）

| 声明来源 | 缺失码 | 代码侧强制点（示例） |
|---|---|---|
| `20261107000040` | `finance:budget:write` | `svc/finance/src/modules/operational.rs:655,1401`；`svc/unified-core/src/modules/iam/tenant_scope.rs:361` |
| `20261107000041` | `finance:currency:write`、`finance:currency:delete`、`finance:period:write`、`finance:reconcile_orders:read`、`finance:reconcile_orders:write`、`finance:sales_invoice:read`、`finance:sales_invoice:write` | `svc/finance/src/modules/sales_invoice.rs:556…1117` 等 |
| `20261107000043` | `finance:audit:read`、`finance:compliance:read`、`finance:event:read`、`finance:reconciliation:read`、`finance:risk:read`、`finance:treasury:read` | 财务小文件路由 |
| `20261107000021` | `finance:account:read` | `svc/finance/src/modules/mod.rs:5373` |
| `20261106000001`（`20261107000001` 重复声明） | `mes:work_order:write`、`bi:data_source:write`、`wms:stocktake:write` | `svc/mes/src/modules/work_order.rs:557…1148`（8 个写路由）；`svc/analytics/src/modules/bi/plugin.rs:82`；`svc/wms/src/modules/wms_plugin.rs:138` |

现状：生产已有 `finance:admin`、`mes:work_order:*`（read/create/update）等；上述 **`:write` 变体与财务子模块细码整体不存在**。非超管角色访问对应写路由一律 403，`tenant_admin` 的白名单也不会例外（它不持有这些码）。`finance:admin` 只覆盖网关级别的财务写闸门，不覆盖这些以细码声明的路由。

> 另有 12 个**父码**同缺：`finance:account`、`finance:budget`、`finance:currency`、`finance:period`、`finance:reconcile_orders`、`finance:sales_invoice`、`finance:audit`、`finance:compliance`、`finance:event`、`finance:reconciliation`、`finance:risk`、`finance:treasury`。父码不被路由直接校验，影响权限树/前端勾选展示，归 C 级，建议与子码在同一补码迁移中一并落库。

### 4.2 B 级：少约束/少索引/少数据

| # | 对象 | 声明来源 | 生产现状 | 风险 |
|---|---|---|---|---|
| B1 | `ck_formulas_approval_status`（`rs.formulas`） | `20261107000036` | 不存在 | 审批状态可写入非法枚举值，数据质量风险 |
| B2 | `idx_rd_deploys_formula` + `rd.deploys → rs.formulas(formula_id)` 外键 | `20261107000036` | 不存在 | 与 A5 同根；补列后必须一并补索引/外键 |
| B3 | 10 个域管理员角色：`rd_manager`、`integration_manager`、`workflow_manager`、`aps_manager`、`tms_manager`、`bi_manager`、`monitor_manager`、`notification_manager`、`doc_manager`、`ticket_manager` | `20261107000022` | 全部不存在（生产仅 16 个角色） | 无法给这些域分配管理员；`20261107000023` 的授权 INSERT 会命中 0 行而静默成功；`20261107000042` 的 `notification_manager` 授权同样空转 |
| B4 | `erp.asset_categories` 种子 | `20261107000026` | 表存在、**0 行** | 资产分类下拉为空，功能降级 |

### 4.3 C 级：纯元数据/账本

| # | 项 | 说明 |
|---|---|---|
| C1 | `20261107000035`（`mdm_suppliers.category` 弃用注释） | 仅 `COMMENT`，无 DDL，依赖 A1/A2 |
| C2 | `20261107000024`（`finance:admin` seed） | 已由 `20261108141500` 实际补齐（生产该码存在） |
| C3 | `20261105235800`（refresh token 特权函数） | 函数由 `20261107000016` 回退删除；生产当前无该函数，状态与声明链最终态一致 |
| C4 | `20261107000020`（payments/created_by、pm tags 对齐） | 生产列类型与声明链一致（diff 为空），仅账本缺失 |
| C5 | `20261105145000`（currency master fix） | 生产表已存在（16 行），仅账本缺失 |
| C6 | `20261107000019` / `20261107000027` 等 DROP 类 | 生产对象仍在但代码已不引用（见第 5 节） |

### 4.4 已核实"声明对象在生产已存在"的功能性迁移

`20261107000020`、`20261105145000`、`20261107000024`、`20261105235800`、`20261106000001`（**部分**：新旧拼写 canonical 码已在生产，仅 3 个 `:write` 码缺失）、`20261107000025`（抽查 `admin_analytics`/`ai_business`/`asset_master`/`erp_business` 四个菜单组均存在）。这些属于"账本缺口"，不应再生成 DDL，只需在机制层对账或标注 `superseded`。

---

## 5. 多余对象（生产有、迁移声明无）

| 对象 | 行数 | 来源判断 | 处置 |
|---|---|---|---|
| `communication.core_email_templates` | 0 | `20261107000019` 声明删除；当前代码已无引用（仅 `schema_defense.rs` 断言不存在） | 可安全清理 |
| `crm.core_crm_customers` | 0 | `20261107000027` 声明删除（早期 skeleton 表，仅 `id`/`deleted_at`） | 可安全清理 |
| `erp.core_erp_suppliers` | 0 | 同上（skeleton 表） | 可安全清理 |
| `master_data.mdm_asset_categories` | 0 | `20261107000034` 声明重命名为 `mdm_data_asset_categories` | 可安全重命名（与 A4 同一动作） |
| `public.pm_master_data_refs` | 0 | 声明的对象在 `pm` schema；`public` 副本为历史遗留 | 需确认无遗留引用后可清理 |
| `finance.schema_defense_ledger` | 1 | 非迁移产物，`schema-defense` 脚本/审计运行期自建 | **不可动**（先确认脚本依赖；纳入运行期 DDL 台账） |
| `_sqlx_test.database_ids` | 1 | sqlx 测试 schema 遗留 | 需确认测试依赖（可接受保留） |

另：生产 `iam.core_tenant_modules`（0 行）与 `iam.core_permissions` 属于历史影子副本，声明链（B）同样存在，**不计入本次两侧偏差**；但它们是 2026-11 权限事故的温床，建议单独纳入清理评审。

---

## 6. owner 与 ACL（专项）

### 6.1 事实

- 生产 1353 个 relation（1346 表 + 7 序列）**全部** owner = `topems_prod`；59 个 schema 中 58 个归 `topems_prod`（`public` 归 `pg_database_owner`，属 PG 默认行为）。
- 生产 `pg_default_acl` **为空**：没有任何默认权限规则。
- `topems_prod` 与 `topems_app` 无成员关系；生产 5 个服务连接身份为 `topems_prod`（非 owner 即无权）。
- 生产显式 `relacl` 仅 8 个 relation（授予 `topems_app=arwd`）。
- 声明链 B（锚点 dump + 前向迁移）中 1350 个 relation 里 **1349 个 owner = 建库执行账号 `air`**，只有 `public.core_user_company_scopes` 归 `topems_prod`——因为唯一一条带守卫的 owner 迁移 `20261108131000` 生效了。
- 迁移仓库中仅 4 个文件出现 `OWNER TO`，其中只有 `20261108131000` 指向生产服务角色，且这是事后修复（新表 owner 归错导致 500 的那次）。

### 6.2 为什么这是系统性风险

生产执行迁移的是 `xingzhai`（superuser，`topems_prod` 成员），服务运行的是 `topems_prod`。由于：

1. 没有 `ALTER DEFAULT PRIVILEGES`；
2. 迁移普遍不写 `OWNER TO`；
3. 新迁移的 `GRANT ... TO topems_app` 对生产服务角色无效（`topems_app` 在本机甚至不可登录）；

任何 `CREATE TABLE` 的新迁移在生产落地后，owner 都是 `xingzhai`，`topems_prod` 既非 owner 又无显式授权 → 首次访问即 500。`20261108131000` 只是补了一张表，机制并未修复：A1–A4 的 4 张 MDM 表即使补建，若照抄原迁移（只 `GRANT topems_app`），生产仍会 500。

### 6.3 建议（只写文档，不执行）

1. 所有新建表/序列/函数的迁移，尾部必须包含**守卫式 owner 归一**（探测服务角色存在后用 `ALTER ... OWNER TO`），复用 [20261108131000_p1_company_scope_table_owner.sql](file:///Users/air/TOPEMS/database/migrations/20261108131000_p1_company_scope_table_owner.sql) 的探测写法。
2. 在 CI 增加静态检查：迁移中出现 `CREATE TABLE` 时必须同时出现 `OWNER TO`（或显式 `-- owner: inherited` 注释 + 白名单）。
3. 基线 dump 目前是 `--no-owner --no-privileges`，**灾难恢复会丢掉全部 owner/ACL**（B 的 1349 个 `air` 就是证据）。建议基线产物增加"角色+owner/ACL 重建脚本"，或改为带 owner 的 dump + 独立 role 脚本。
4. 巡检项（可只读执行）：`owner <> 'topems_prod'` 的 relation 数、`relacl` 中缺少 `topems_prod` 的新对象、`pg_default_acl` 是否仍为空。把这三项纳入上线后核对。

---

## 7. 差异归类

| 归类 | 对象 |
|---|---|
| **可安全补齐** | A1–A5（MDM 4 表 + `rd.deploys.formula_id`+索引/FK）、A6 类型对齐、B1 `ck_formulas_approval_status`、C1 注释；第 5 节的 4 张 0 行遗留表清理 |
| **需人工确认** | A-2 权限码的 18 项（需产品确认角色矩阵后再授）、B3 10 个域管理员角色（是否启用该域）、B4 资产分类种子内容、`20261107000028` ERP 客户数据清理、`20261107000032` SCM 供应商软删口径、`public.pm_master_data_refs` 清理、`iam` 影子副本清理 |
| **不可动 / 不应用** | 15 个定向 test/5433 迁移；`20261107000015` RLS 系统上下文分支（已评审暂缓，当前由 owner 绕过 RLS 生效）；`20261105235800`（已被 000016 回退）；`finance.schema_defense_ledger`（脚本产物）；`_sqlx_test`（测试依赖待确认） |

---

## 8. 补齐迁移建议清单（按依赖排序；本批只出清单，不生成、不执行）

> 统一要求：全部为新版本（`> 20261108141500`）；守卫式幂等（`to_regclass` / `IF NOT EXISTS` / `DO $$ ... $$`）；单事务；不改已推送的历史文件；每个文件同步 `database/checksums.txt`；每条结尾做 owner 归一（见 §6.3）。

| 序 | 建议版本 | 内容 | 前置依赖 | 生产风险（不补的后果） |
|---|---|---|---|---|
| 0 | `20261109100000_p3_drift_owner_guard_helper.sql` | owner 归一守卫模板（若采用 helper 函数/统一写法，先落一条样板） | 无 | 后续每条补建都可能重演 owner 500 |
| 1 | `20261109100100_p3_drift_mdm_suppliers.sql` | 按 `20261107000029` 定义建表（含索引/约束/RLS/策略），owner→`topems_prod` | 0 | A1：供应商 CRUD 500 |
| 2 | `20261109100200_p3_drift_mdm_supplier_categories.sql` | 按 `20261107000031` 建分类表 + 给 `mdm_suppliers` 加 `category_code` | 1 | A2：供应商保存/同步 500 |
| 3 | `20261109100300_p3_drift_mdm_sync_dead_letter.sql` | 按 `20261107000033` 建死信表 | 1 | A3：同步失败记录丢失 + 二次异常 |
| 4 | `20261109100400_p3_drift_mdm_asset_categories_rename.sql` | `mdm_asset_categories` → `mdm_data_asset_categories`（新旧双存在/双缺失均需守卫分支） | 0 | A4：资产分类 500 |
| 5 | `20261109100500_p3_drift_mdm_seed_and_backfill.sql` | `20261107000030/31/26` 的种子与回填（纯 DML，幂等 `ON CONFLICT`/`NOT EXISTS`） | 1–4 | B4：分类下拉为空；供应商分类缺失 |
| 6 | `20261109100600_p3_drift_rd_deploy_formula.sql` | `rd.deploys.formula_id` + FK（`NOT VALID` 起步）+ 索引 + `ck_formulas_approval_status`（`NOT VALID`）+ `rs.*.created_by` 类型对齐（`USING` 显式转换，0 行） | 0 | A5/A6：`/rd/deploys` 500、公式写入 500；B1/B2 |
| 7 | `20261109100700_p3_drift_rbac_finance_codes.sql` | 18 个缺失权限子码（财务 15 + `mes:work_order:write`/`bi:data_source:write`/`wms:stocktake:write`）+ 12 个财务父码 + 授予 `tenant_admin`/对应域管理员（不授平台码） | 6 无关，可并行；但建议在 B3 角色落地后统一授权 | A-2：相关写路由全 403 |
| 8 | `20261109100800_p3_drift_rbac_domain_roles.sql` | 10 个域管理员角色 + `20261107000023/42` 的授权（守卫角色存在） | 7 | B3：域管理员无法配置 |
| 9 | `20261109100900_p3_drift_auth_rls_system_branch.sql` | 仅在两表策略上补 `OR tenant_id = 0000...` 分支（`CREATE OR REPLACE` 语义需用 `DROP POLICY IF EXISTS` + `CREATE POLICY` 守卫） | 无 | 当前由 owner 绕过 RLS；一旦 FORCE 或改非 owner 账号，refresh/logout 401 |
| 10 | `20261109101000_p3_drift_legacy_cleanup.sql` | 第 5 节 4 张 0 行遗留表（DROP 前 `to_regclass`+行数守卫）、`mdm_suppliers` 弃用注释 | 1–4、10 | 纯卫生，无运行时风险 |
| — | **不入迁移** | `public.pm_master_data_refs`、`iam` 影子副本、`finance.schema_defense_ledger`、`_sqlx_test` | — | 需人工确认后再议 |

排序理由：MDM 四表是 A1–A4 的共同依赖；`rd` 补列不依赖 MDM；权限码与角色应在结构补齐后一次性授权，避免二次授权漂移；RLS 与 owner 策略独立，最后做并单独回归。

---

## 9. 需要写生产才能验证的点（停下问，不自行写库）

1. 18 个权限码补齐后，现有用户 token 是否需要刷新（权限缓存 TTL 与登录会话持有的是旧快照）。
2. `mdm_suppliers` 回填/种子与现有 `scm.suppliers` 数据的匹配规则（是否会产生重复主数据）。
3. `20261107000028` 的 ERP 客户清理会删除哪些生产行（需先导出并人工确认）。
4. `20261107000032` 的 SCM 供应商软删口径（会把 `deleted_at` 置为 now，属破坏性数据动作）。
5. `20261107000034` 重命名后前端/网关是否仍缓存旧表名（需实际请求验证）。
6. `20261107000015` 的 RLS 分支是否要补——取决于是否维持"服务以 owner 身份连接并绕过 RLS"的既定架构。
7. `finance.schema_defense_ledger` 与 `_sqlx_test` 是否仍有脚本/测试依赖。

---

## 10. 复现命令（只读）

```bash
# 1) 临时集群（仅本地，端口 5499，用完销毁）
initdb -D /tmp/topems_drift_pg/data -U air --auth=trust --encoding=UTF8 --locale=C
pg_ctl -D /tmp/topems_drift_pg/data -l /tmp/topems_drift_pg/server.log \
  -o "-p 5499 -k /tmp/topems_drift_pg/sock -c listen_addresses=''" start

# 2) 声明链基线（锚点 dump + 账本 + 前向迁移）
gunzip -c database/baseline/prod_schema_20261105235700.sql.gz | psql "$DSN" -v ON_ERROR_STOP=1
psql "$DSN" -v ON_ERROR_STOP=1 -f database/baseline/prod_ledger_20261105235700.sql
bash scripts/migration/apply-forward.sh --dsn "$DSN" --anchor 20261105235700

# 3) 两侧结构快照
psql "$DSN" -tA -f /tmp/topems_snapshot.sql > /tmp/b_snapshot.json
ssh xingzhai@192.168.110.115 'PGHOST=/tmp /opt/homebrew/bin/psql -X -tA -U xingzhai -d topems_prod -f -' \
  < /tmp/topems_snapshot.sql > /tmp/prod_snapshot.json

# 4) 结构化 diff
python3 /tmp/topems_diff.py
```

> 临时集群销毁：`pg_ctl -D /tmp/topems_drift_pg/data stop -m fast && rm -rf /tmp/topems_drift_pg`。

---

## 附录 A：43 个未入账版本逐条核实

> 记号：`TEST` = 定向迁移（prod 禁止应用）；`FUNC` = 功能性。生产核实基于快照（对象存在性）与只读 `SELECT`（数据行）。

| 版本 | 文件 | 类型 | 生产核实结论 |
|---|---|---|---|
| 20261103210000 | db08_test_varchar_to_text_190cols | TEST | 定向，禁止 prod；不构成缺陷 |
| 20261103220000 | db09_test_iam_position_id_bigint_to_uuid | TEST | 同上 |
| 20261103230000 | db10_5433_varchar_text_to_uuid_19cols | TEST | 同上 |
| 20261104000000 | db11_5433_varchar_to_text_24cols | TEST | 同上 |
| 20261104010000 | db12_5433_date_timestamptz_21cols | TEST | 同上 |
| 20261104020000 | db13_5433_numeric_double_20cols | TEST | 同上 |
| 20261104030000 | db14_test_varchar_to_uuid_7cols_with_data | TEST | 同上 |
| 20261104040000 | db15_5433_integer_bigint_16cols | TEST | 同上 |
| 20261104050000 | db16_5433_tenant_id_rls_decouple_14cols | TEST | 同上 |
| 20261104060000 | db17_5433_misc_12cols | TEST | 同上 |
| 20261104070000 | db18_5433_special_types_8cols | TEST | 同上 |
| 20261105110000 | db20_test_timestamptz_align_prod_169cols | TEST | 同上 |
| 20261105120000 | db21_test_varchar_numeric_widen_16cols | TEST | 同上 |
| 20261105150000 | db23_test_type_align_4cols | TEST | 同上 |
| 20261105180000 | db24_test_rfm_numeric_2cols | TEST | 同上 |
| 20261105145000 | finance_currency_master_fix | FUNC | 表已存在（16 行）→ 仅账本缺失（C5） |
| 20261105235800 | iam_refresh_token_privileged_lookup | FUNC | 函数已被 000016 回退删除，最终态一致（C3） |
| 20261106000001 | permission_code_unify_bi_mes_wms | FUNC | canonical 读码已存在；3 个 `:write` 码缺失（A-2） |
| 20261107000001 | iam_core_public_authority_sync | FUNC | 同上，无新增结构差异 |
| 20261107000002 | tenant_modules_tier_column | FUNC | `public` 已有 tier；仅 `iam` 影子副本缺（C/不应用，000014 取代） |
| 20261107000015 | auth_rls_system_context_branch | FUNC | 两表策略缺"全 0 分支"；owner 绕过 RLS → 潜在（§8 第 9 条） |
| 20261107000019 | drop_communication_email_templates | FUNC | 表存在 0 行，代码无引用 → 可安全清理 |
| 20261107000020 | align_finance_payments_created_by_and_pm_tags | FUNC | 列类型已一致（diff 为空）→ 仅账本缺失 |
| 20261107000021 | route_permission_gaps_batch27 | FUNC | `finance:account:read` 缺失（A-2） |
| 20261107000022 | domain_manager_roles_batch28 | FUNC | 10 角色全缺（B3） |
| 20261107000023 | domain_admin_code_grants_batch28 | FUNC | 依赖角色缺失，授权行 0 → 需随 B3 补 |
| 20261107000024 | finance_admin_seed | FUNC | `finance:admin` 已存在（由 20261108141500 补齐，C2） |
| 20261107000025 | seed_menus_batch29 | FUNC | 抽查 4 个菜单组存在；需人工确认完整性 |
| 20261107000026 | seed_asset_categories_batch31 | FUNC | 目标表 0 行（B4） |
| 20261107000027 | drop_dead_tables_batch31 | FUNC | 3 张 0 行遗留表仍在（第 5 节）→ 可安全清理 |
| 20261107000028 | cleanup_erp_customers_batch32 | FUNC | 数据清理，需人工确认 |
| 20261107000029 | create_mdm_supplier_master_batch32 | FUNC | 表缺（A1） |
| 20261107000030 | seed_mdm_supplier_master_batch32 | FUNC | 依赖 A1；种子缺失（B4） |
| 20261107000031 | supplier_category_dict_and_backfill | FUNC | 表/列缺（A2） |
| 20261107000032 | scm_supplier_null_no_soft_delete | FUNC | 纯 DML；需人工确认口径 |
| 20261107000033 | mdm_sync_dead_letter | FUNC | 表缺（A3） |
| 20261107000034 | mdm_rename_asset_categories_to_data_asset_categories | FUNC | 新名表缺、旧名 0 行（A4） |
| 20261107000035 | mark_mdm_suppliers_category_deprecated | FUNC | 仅 COMMENT；依赖 A1（C1） |
| 20261107000036 | rd_deploy_formula_link_batch38 | FUNC | `rd.deploys.formula_id` 缺、`created_by` 类型不匹配、约束/索引缺（A5/A6/B1/B2） |
| 20261107000040 | finance_budget_perm_batch40 | FUNC | `finance:budget:write` 缺（A-2） |
| 20261107000041 | finance_submodule_perms_batch40 | FUNC | 7 个财务细码缺（A-2） |
| 20261107000042 | ai_comm_perm_grants_batch40 | FUNC | 码已存在；角色缺失导致授权空转（B3） |
| 20261107000043 | finance_smallfiles_perms_batch41 | FUNC | 6 个财务小文件码缺（A-2） |
