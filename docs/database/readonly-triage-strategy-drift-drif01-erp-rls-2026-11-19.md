# 只读定性三件：策略名漂移 / DRIFT-01 / erp 八张报表表（2026-11-19）

- 范围：只读定性，不写迁移、不应用 DDL、不开窗、不碰生产写入
- 生产记录权威副本：本机 `topems_prod`（账本 721，max `20261119000002`）
- 生产查询一律 `PGOPTIONS='-cdefault_transaction_read_only=on'`

## 0. 结论摘要

| 编号 | 事项 | 结论 | 待决 |
|---|---|---|---|
| 1 | 策略名漂移归一 | **「同表同义仅改名」配对 = 0**（生产 1050 vs 契约 1032，同名不同义 393）；真问题是 80 张表严格+遗留并存、216 张只有遗留名、37 条 `USING(true)`。归一=每表收敛到一条 `rls_tenant_isolation`，删除遗留名而不是改名 | 见 §2.5 |
| 2 | DRIFT-01 `mes.production_records.completed_quantity` | **生产与仓库契约一致（`numeric(12,2)`），漂移发生在本机 dev 库 `topems`，属误报**；不改契约、不改生产 | 见 §1.5 |
| 3 | erp 八张合并报表表 RLS | **不需要改生产策略**：仓库 `group_tenant_of` 对合法租户与生产等值判定完全等价，唯一实质差异是生产多一条 `app.rls_system` 系统通道；合并域无后台任务、只有 ERP HTTP handler | 见 §3.4 |

---

## 1. DRIFT-01：`mes.production_records.completed_quantity`

### 1.1 结论

`DRIFT-01` 的前提「生产实际是 `numeric`（无 typmod）」与实测不符：

- 生产（`topems_prod`）：`numeric_precision=12`、`numeric_scale=2`，即 **`numeric(12,2)`**；
- 仓库契约：`numeric(12,2)`（迁移 + 门禁基线 + schema 夹具三处一致）；
- 唯一漂移的是本机 dev 库 `topems`：`format_type` 返回裸 `numeric`（`atttypmod=-1`），且其账本停在 `20261103000005`，没有应用修复迁移 `20261105160000`。

因此：**契约侧与生产侧都正确，不需要改任何一侧；需要修的是本地 dev 库。** `DRIFT-01` 应从「待定性」改为「本地环境漂移，非契约/生产缺陷」。

### 1.2 证据

生产列定义（`information_schema.columns`）：

| schema.table | column | data_type | numeric_precision | numeric_scale |
|---|---|---|---:|---:|
| `mes.production_records` | `completed_quantity` | `numeric` | 12 | 2 |

同库对照 `mes.production_orders.completed_quantity`：`bigint`（precision 64 / scale 0），与 `20261107000017` 的目标一致，说明生产已按最新契约落地。

仓库侧三处契约：

1. 迁移 `database/migrations/20260928120000_mes_schema_type_align.sql`：`production_records.completed_quantity → numeric(12,2)`（`USING completed_quantity::numeric`，注释声明 integer→numeric 无损）。
2. 迁移 `database/migrations/20261105160000_p7_prod_type_align_4cols.sql`：把 prod 侧 `integer → numeric(12,2)`，幂等（已是目标类型则 NOOP）。
3. 基线证据：`scripts/ci/data/prod_cols.psv:9003` 为 `mes|production_records|completed_quantity|numeric(12,2)|t|r`；`fixtures/full_schema_contract.sql:17144` 为 `completed_quantity numeric(12,2) DEFAULT 0 NOT NULL`。

本地 dev 库（`topems`）异常：

| 检查 | 结果 |
|---|---|
| `format_type(atttypid, atttypmod)` | `numeric`（无 typmod） |
| 账本 max(version) | `20261103000005`（早于 `20261105160000`） |
| `20260926120000` / `20260928120000` / `20261029200000` | 均已成功应用 |
| 列默认值 | 空（`column_default` 为 NULL） |

按账本推演，`20261029200000` 会把该列改为 `INTEGER`，而 `topems` 实际是裸 `numeric`——**账本无法解释当前状态，属账本之外的手工/恢复路径**（未取证到具体操作者，也不应为此改生产或契约）。

### 1.3 迁移时间线（谁把它写成了什么）

| 迁移 | 动作 | 与契约关系 |
|---|---|---|
| `20260918000014_align_business_tables` | `ADD COLUMN ... INTEGER NOT NULL DEFAULT 0` | 初始 |
| `20260918000037_public_rs_mes_legacy_cols` | `ADD COLUMN ... double precision`（legacy 表路径） | 旁支 |
| `20260926120000_app_schema_tables` | 建表时 `completed_quantity numeric(12,2)` | 契约首次出现 |
| `20260928120000_mes_schema_type_align` | `ALTER ... TYPE numeric(12,2)` | 与契约一致 |
| `20261007000015_align_missing_constraints_selfheal4` | 只补 `SET NOT NULL` | 与契约一致 |
| **`20261029200000_schema_defense_type_align`** | **`ALTER ... TYPE INTEGER USING ROUND(...)`** | **仓库内的一次收窄，与契约冲突** |
| `20261105160000_p7_prod_type_align_4cols` | 回补 `numeric(12,2)`（幂等） | 与契约一致，覆盖上一条 |

即：仓库最终态是 `numeric(12,2)`，`20261029200000` 的收窄已被后续迁移纠正；`topems` 只欠 `20261105160000` 及其后迁移。

### 1.4 写入方与读取方

写入（本仓 Rust）：

| 位置 | 方式 | 类型契约 |
|---|---|---|
| `svc/mes/src/modules/production_record.rs:363` | `INSERT INTO mes.production_records (... completed_quantity ...)`，`sqlx::query!` | 绑定 `Option<f64>`（`CreateRecordRequest.quantity_produced`），列侧 `numeric(12,2)` |
| `svc/mes/src/modules/production_record.rs:554`、`:729` | `UPDATE ... completed_quantity = COALESCE($6, ...)` | 同上，`Option<f64>` |
| `svc/mes/src/modules/production_record.rs:653` | 软删，不写数量 | — |

读取/解码：

- `ProductionRecordRow.quantity_produced: BigDecimal`（同文件 `:112`），查询里 `completed_quantity AS quantity_produced`——**按 Numeric 解码**，与 `numeric(12,2)` 匹配；若列退化为 `integer`，这条路径会解码失败（`20261105160000` 的修复动机）。
- 跨服务：`svc/integration/src/mes_erp_sync.rs:79` 以 `Option<f64>` 承接 MES 进度，`:324` 透传；ERP 侧 `svc/erp/src/models/production_order.rs:14` 读 `f64`，落 `erp.erp_production_orders.completed_quantity numeric(15,2)`（`prod_cols.psv:2745`）。

依赖标度：

- 生产库中引用 `production_records.completed_quantity` 的视图 / 物化视图：**0 个**（`pg_views`、`pg_matviews` 全库扫描）。
- 仓库内 `*.sql` 报表/初始化脚本引用：仅 `database/init/05_mobile_init.sql`（移动端 legacy 表，`INTEGER`）与 `fixtures/*`、`backups/*` 快照，均非生产读取路径。
- 无索引、无生成列依赖该列（`20261105160000` 注释已核，复核生产目录无相关索引）。

### 1.5 待决点

1. **本地 dev 库如何修**：重放 `20261105160000` 及其后迁移，或直接从生产快照重建 `topems`。这一步涉及本地写库，本轮不做。
2. **两位小数是否够用**（业务口径）：当前 API 用 `f64`、解码用 `BigDecimal`、生产契约为 2 位小数；如果业务需要 3 位以上（如按克/毫升计量的工序），才需要同时改契约与生产，属业务决策，本文不选边。
3. **`20261029200000` 的收窄是否需要在文档里标记为历史**：它当前被后续迁移覆盖，不建议修改已应用迁移；是否在迁移目录加只读注释另行决定。

---

## 2. 策略名漂移归一（生产 1050 条 vs 仓库契约）

### 2.1 结论

**结论一：「同表同语义、仅名字不同」的配对数是 0。**

以本机权威副本 `topems_prod`（1050 条）与仓库契约 [full_schema_contract.sql](file:///Users/xingzhai/topems/fixtures/full_schema_contract.sql)（1032 条）做全量对照：

| 指标 | 数值 |
|---|---:|
| 两侧同名策略 | 996 |
| 同名且 `USING/WITH CHECK` 完全相同 | 603 |
| **同名但表达式不同** | **393** |
| 生产独有（名字） | 54 |
| 契约独有（名字） | 36 |
| **同表同义、仅名字不同** | **0** |

逐表逐表达式比对后，没有任何一对满足「同一张表、名字不同、`USING`/`WITH CHECK` 等价」。**名字差异全部伴随语义差异**，所以「改名迁移」不能作为归一手段。

**结论二：真正的病灶是同一张表上多套命名体系并存，且 permissive 策略是 OR。**

生产实测：

| 指标 | 数值 |
|---|---:|
| 开启 RLS 的表 | 956 |
| 策略总数 | 1050 |
| 表上 ≥2 条策略 | 91 |
| 「`rls_tenant_isolation` + 遗留名」并存 | 80 |
| 只有 `rls_tenant_isolation` | 661 |
| 只有遗留名（无 canonical） | 216 |
| `USING (true)` 的 fail-open 策略 | 37 |

只要同一张表同时存在严格策略和宽松策略，PG 会取 OR，**隔离强度等于最松的那条**。这 80 张表的严格策略目前不起作用。

**结论三：归一口径应是「每表收敛到一条 canonical 策略」，不是改名。**

- canonical 名：`rls_tenant_isolation`（ALL，`USING` = `WITH CHECK` = `COALESCE(app.rls_system,'off')='on' OR tenant_id = NULLIF(app.tenant_id,'')::uuid`）。
- 平台只读语料：`rls_platform_read`（语义是「全零租户行对所有租户可见」，与 `rls_global_read` 不同，见 §2.3）。
- 其余名字（`tenant_isolation_<t>`、`<t>_tenant_policy`、`tenant_isolation`、`*_allow_all_*`、`rls_global_read`）一律视为待清理，不作为目标态。

### 2.2 证据

#### 2.2.1 命名体系盘点（生产 1050 条，脚注：`pg_policy` 实测）

| 命名模式 | 条数 | 其中 `USING(true)` | 说明 |
|---|---:|---:|---|
| `rls_tenant_isolation` | 741 | 0 | 严格 B 范式（系统通道 OR 本租户行） |
| `tenant_isolation_<table>` | 230 | 0 | 遗留名；多数为宽松分支（`tenant_id IS NULL`/空串/零 UUID） |
| `*_allow_all_*` | 35 | 35 | **全部 fail-open** |
| `<table>_tenant_policy` | 18 | 0 | MDM 遗留名 |
| `rls_<其他>` | 8 | 1 | 分命令/特例 |
| `rls_platform_read` | 7 | 0 | 平台语料（全零租户行） |
| 其他 | 6 | 1 | `rls_alert_rules_*`、`rls_system_only` 等 |
| `tenant_isolation`（无后缀） | 3 | 0 | ERP 特例 |
| `rls_global_read` | 2 | 0 | 系统通道 + 本租户 + `tenant_id IS NULL` |

#### 2.2.2 393 条同名不同义（生产 vs 契约）

差异全部是同一个方向：**生产是严格 B（含 `app.rls_system` 系统通道），契约是没有系统通道的宽松/旧式表达式**。

| 同名策略族 | 条数 | 生产 `USING` 特征 | 契约 `USING` 特征 |
|---|---:|---|---|
| `tenant_isolation_<t>` | 146 | 系统通道 OR 等值 | 其他旧式（含 `IS NULL` 等） |
| `rls_tenant_isolation` | 115 | 系统通道 OR 等值 | 空串/零 UUID 分支 |
| `tenant_isolation_<t>` | 71 | 系统通道 OR 等值 | 空串/零 UUID 分支 |
| `<t>_tenant_policy` | 18 | 同上 | 同上 |
| `rls_<其他>` | 17 | 同上 | 其他 |
| 其余 | 26 | — | — |

含义：**仓库契约夹具停留在收紧前的时代**；生产已经换成了严格 B，但契约没跟上。任何「以契约为准去改名生产」的做法都会把隔离改松。

#### 2.2.3 生产独有 54 条

| 族 | 条数 | 明细 |
|---|---:|---|
| `rls_tenant_isolation` | 43 | analytics/bi/core/erp/gis/hrm/public/qms 等表；契约里这些表只有遗留名或 `allow_all` |
| `rls_platform_read` | 7 | `core.core_plugins`、`erp.holidays`、`finance.core_finance_currencies`、`finance.core_finance_report_line_map`、`pm.project_type_configs`、`public.core_roles`、`portal.portal_quick_actions` |
| `rls_alert_rules_*` | 4 | `public.alert_rules` 的 read/insert/update/delete；其中 `read` 的 `USING` 是 `true`（见 §2.3 例外） |

#### 2.2.4 契约独有 36 条

| 族 | 条数 | 明细/含义 |
|---|---:|---|
| `*_allow_all_*` | 20 | 契约仍声明 fail-open（`core_plugins`、`dict_items/types`、`holidays`、gis 4 张、`hrm.initialization_logs`、`portal_quick_actions`、`public.alerts`、`core_operation_logs`、`navigation_menu`、`pinned_apps`、`subscriptions`、`todos`、`qms.quality_inspections/standards`、`rs.formulas`、`alert_rules`） |
| `rls_global_read` | 10 | ai 2、finance 2、mobile 1、pm 1、public 4；与生产 `rls_platform_read` 语义不同 |
| `rls_tenant_isolation` | 2 | `crm.core_crm_customers`、`erp.core_erp_suppliers`（旧表名） |
| 遗留名 | 3 | `bi.analytics_datasets`、`public.core_files`、`master_data.mdm_metadata_objects` |
| `rls_system_only` | 1 | `public.core_tenants` |

#### 2.2.5 与 11-18 普查「103 / 234」的关系

- 那组数字的口径是「生产 vs 干净重放（replay 到 `20261118150000`）」；本轮口径是「生产 vs 契约夹具」。
- 两者不能直接相减：重放会把迁移里追加的遗留策略算进去，夹具是旧快照，且当前副本与 11-18 现场并不完全一致（见 §3.2.2）。
- **但两个口径给出同一个结论：不存在纯改名对。** 11-18 普查自己也在 §3.3 写明 103 条是「生产收紧时把名字从 `tenant_isolation_<t>` 改成 `rls_tenant_isolation`，仓库未同步」——这描述的是**两次不同强度的策略**，不是改名。

#### 2.2.6 复现方法（只读）

```sql
-- 生产侧：按命名族统计 + 找出同表多策略
SELECT n.nspname, c.relname, count(*) AS n,
       count(*) FILTER (WHERE p.polname='rls_tenant_isolation') AS canonical,
       count(*) FILTER (WHERE p.polname<>'rls_tenant_isolation') AS legacy
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
GROUP BY 1,2 HAVING count(*) > 1 ORDER BY 3 DESC;
```

契约侧用 `fixtures/full_schema_contract.sql` 里的 `CREATE POLICY <name> ON <schema>.<table> ... USING (...)` 解析；生产侧用 `pg_policies`。两侧按 `(schema, table, name)` 对齐，再对 `USING/WITH CHECK` 去空白比对。

### 2.3 语义不同的单独清单（不能改名，必须重写或保留为显式例外）

| # | 表/范围 | 生产策略 | 语义 | 处置 |
|---|---|---|---|---|
| 1 | 37 条 `USING (true)` | `*_allow_all_*`、`rls_alert_rules_read`、`rls_<其他>` 1 条 | 完全放开（读或读写） | 逐表业务定性：非语料改 strict，是语料改 `rls_platform_read` |
| 2 | 8 张 `erp.consolidation_*` | `tenant_isolation_<t>` | 含 `app.rls_system` 系统通道 | 见 §3，保持现状 |
| 3 | `erp.event_idempotency` | `tenant_isolation` | 等值，**无系统通道**（生产更严） | 保留；若统一需确认写路径不需要 service 读 |
| 4 | `rls_platform_read` 7 条 | `tenant_id = 全零 AND GUC 非空` | 平台语料对任意租户可见，且**不匹配本租户行** | 与 `rls_global_read`（含 `tenant_id IS NULL`）不是同义，不能互 rename |
| 5 | `public.alert_rules` | 4 条分命令 | `read` = `true`，`insert` 无 USING、WITH CHECK = 系统通道 | 读全放开是缺口；需业务确认告警是否跨租户 |
| 6 | `public._archive_core_workflow_instances` | `tenant_isolation_core_workflow_instances` | 归档表，仓库无同名表 | 随归档表生命周期处理 |
| 7 | `iam.core_tenant_plugins` | 无（RLS 关闭） | 生产 0 策略；仓库有 `rls_tenant_isolation` | 迁移 `20261118124000` 未落生产（见 §2.5 第 5 条） |

### 2.4 归一规则（可执行草案，本轮不落地）

**目标态**：每张业务表恰好 1 条策略，名为 `rls_tenant_isolation`，`cmd=ALL`、`USING = WITH CHECK =` 严格 B；平台语料表用 `rls_platform_read` 且进入显式白名单；`relrowsecurity=t`、`relforcerowsecurity=t`。

分三种情况：

1. **canonical + 遗留并存（80 张）**
   - 动作：`DROP POLICY IF EXISTS <legacy> ON <schema>.<table>;`，**不 rename**（canonical 已存在，同表策略名唯一，rename 会撞名）。
   - 同一事务内先断言 canonical 存在且 qual 含 `rls_system`，再 DROP。
2. **只有遗留名（216 张）**
   - 动作：单事务内 `ALTER POLICY <legacy> ON <schema>.<table> RENAME TO rls_tenant_isolation;` 然后 `ALTER POLICY rls_tenant_isolation ON ... USING (<strict>) WITH CHECK (<strict>);`
   - 或等价地 `DROP POLICY IF EXISTS <legacy>; CREATE POLICY rls_tenant_isolation ...;`
   - **rename 优于 drop+create**：rename 不产生第二条策略对象，锁持有时间更短；但必须同时改表达式，否则只是「换名字的宽松策略」。
3. **fail-open（37 条）**
   - 不能批量处理：先逐表定性（平台语料 / 租户数据），语料表改用 `rls_platform_read`，其余用 strict；`public.alert_rules.read=true` 单独决策。

**窗口期与并存**：

- 所有 DDL 放在**同一个事务**里（`apply-forward.sh` 已提供事务）。PG 的 permissive 策略是 OR，跨事务「先建后删」必然出现一段更松的窗口；事务内 DDL 对外原子（`DROP/ALTER POLICY` 持 ACCESS EXCLUSIVE 表锁），其他会话看不到中间态。
- 0 行表毫秒级；有流量的表按 §2.5 挑窗口，不要和报表高峰重叠。
- 不要保留旧名做「别名」：两条 permissive = 放宽隔离，且让后续审计无法判断哪个生效。

**验收（不看账本）**：

```sql
SELECT c.relname, count(*) AS n,
       bool_and(p.polname = 'rls_tenant_isolation') AS canonical_only,
       bool_and(pg_get_expr(p.polqual, p.polrelid) NOT LIKE '%IS NULL%') AS no_null_branch,
       bool_and(c.relforcerowsecurity) AS forced
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = :'schema' AND c.relname = ANY(:'tables')
GROUP BY 1;
```

**与账本的关系**：`20261114180000` 已证明「账本 success + checksum 匹配」不等于策略已落地（§3.2.2），所以归一迁移的验收一律以 `pg_policies` 实测为准。

### 2.5 待决点

1. **37 条 fail-open 的逐表归属**：哪些是平台语料（字典、节假日、GIS 图层、菜单/角色），哪些是租户数据（`bi.audit_logs`、`qms.*`、`doc.*`）。这是业务口径，本文不选边。
2. **`rls_platform_read` vs `rls_global_read` 哪个是目标语义**：前者只看全零租户行，后者看系统通道 + 本租户 + `tenant_id IS NULL`。二者不能互换，需先定「平台语料」的定义。
3. **216 张 legacy-only 表里是否有热点表**：`hrm.*`、`crm.*`、`public.*` 占多数，需要按 QPS 排序决定是否开窗。
4. **是否保留遗留名做兼容**：不建议（见 §2.4），但如果外部工具按名字做审计，需要单独确认。
5. **`20261118124000` 未落生产**：manifest 标 `applied`（依据「version ≤ 20261118150000 视为已承接」），但生产账本无此行、`iam.core_tenant_plugins` 当前 RLS 关闭且 0 策略。这是本轮发现的**唯一一条真实缺失的 RLS 迁移**，应改为 `to_apply` 并在下次窗口补；同时说明 manifest 的 `applied` 不能作为策略已落地的证据。
6. **生产副本与 11-18 普查现场不一致的溯源**：同 §3.2.2，建议把「策略实测 vs 期望」做成巡检，而不是继续依赖账本或历史文档的数字。

---

## 3. erp 八张合并报表表：生产策略 vs 仓库 `group_tenant_of`

范围：`erp.company_relations`、`internal_transactions`、`consolidation_scopes`、`consolidation_scope_companies`、`consolidation_reports`、`consolidation_report_lines`、`elimination_rules`、`elimination_candidates`。

### 3.1 结论

**结论一：仓库写法不是「更严格的隔离」，对合法租户它与生产完全等价。**

`erp.group_tenant_of(uuid)` 当前实现是恒等函数，只把 `NULL` / `00000000-0000-0000-0000-000000000000` 映射为 `NULL`（其余原样返回）。因此：

| 场景 | 生产策略（`tenant_id = NULLIF(GUC,'')::uuid`） | 仓库策略（`tenant_id = group_tenant_of(...)`） |
|---|---|---|
| `app.tenant_id` = 合法租户 T | 只看 `tenant_id = T` | 只看 `tenant_id = T`（同） |
| GUC 未设置 / 空串 | `NULLIF` → NULL，谓词为 NULL → 拒绝 | `group_tenant_of(NULL)` → NULL → 拒绝（同） |
| GUC = nil 零 UUID | `tenant_id = 0000…`（只匹配零 UUID 行，实际几乎等于拒绝） | `group_tenant_of(nil)` → NULL → 拒绝（**更严格一点点**） |
| `app.rls_system='on'` | **放行全量** | **不放行**（无系统分支） |

即：**两侧唯一的实质差异是「系统通道」**——生产多一条 `app.rls_system='on'` 旁路，仓库没有。所谓「集团租户」在当前数据模型下没有落地（函数注释也写明 tenant 即集团边界，见 [20261114180000…sql](file:///Users/xingzhai/topems/database/migrations/20261114180000_erp_consolidation_group_tenant_rls.sql#L12-L23)）。

**结论二：按当前代码，不需要改生产策略。**

- 合并域全部是 ERP 的 HTTP handler，没有后台任务/事件订阅写这 8 张表（全仓检索 `erp.consolidation_*` / `elimination_*` 只命中 `svc/erp/src/modules/consolidation/*` 与测试）。
- 普通请求与超管请求都落「真实租户 + `app.rls_system='off'`」；只有 **service token** 才落「nil 租户 + `app.rls_system='on'`」（[tenant.rs](file:///Users/xingzhai/topems/lib/shared-auth/src/middleware/tenant.rs#L555-L584)、[scope.rs](file:///Users/xingzhai/topems/lib/shared-db/src/scope.rs#L163-L213)）。
- 也就是说：只要没有 service token 调 `/erp/consolidation/*`，生产与仓库口径的行为完全相同；反之，若强行套用仓库口径，service 调用会从「可读全量」静默变成「0 行」（表现为空列表/404，而不是 403）。

**结论三：即使要统一，也只动策略、不动数据，且不能两条策略并存。** 8 张表生产实测 0 行（逐表 `count(*)`），改动无数据面影响。

### 3.2 证据

#### 3.2.1 生产实测（`topems_prod`，只读）

8 张表策略形状完全一致，每表仅 1 条：

| 表 | 策略名 | cmd | qual（= with_check） | RLS | FORCE | 行数 |
|---|---|---|---|---|---|---|
| `company_relations` | `tenant_isolation_company_relations` | ALL | `COALESCE(app.rls_system,'off')='on' OR tenant_id = NULLIF(app.tenant_id,'')::uuid` | t | t | 0 |
| `internal_transactions` | `tenant_isolation_internal_transactions` | ALL | 同上 | t | t | 0 |
| `consolidation_scopes` | `tenant_isolation_consolidation_scopes` | ALL | 同上 | t | t | 0 |
| `consolidation_scope_companies` | `tenant_isolation_consolidation_scope_companies` | ALL | 同上 | t | t | 0 |
| `consolidation_reports` | `tenant_isolation_consolidation_reports` | ALL | 同上 | t | t | 0 |
| `consolidation_report_lines` | `tenant_isolation_consolidation_report_lines` | ALL | 同上 | t | t | 0 |
| `elimination_rules` | `tenant_isolation_elimination_rules` | ALL | 同上 | t | t | 0 |
| `elimination_candidates` | `tenant_isolation_elimination_candidates` | ALL | 同上 | t | t | 0 |

`erp.group_tenant_of(uuid)` 在生产**存在**，定义与仓库文件逐字一致。

#### 3.2.2 账本与实际不一致（本条独立成立，需单独记账）

| 检查 | 结果 |
|---|---|
| `_sqlx_migrations` `20261114180000` | `success=t`，`installed_on=2026-11-15 01:12:01+08` |
| 该行 `checksum` vs 当前文件 `sha384` | **完全一致**（`35eae118…b132`） |
| 迁移第 3 段应产生的策略 | `USING/WITH CHECK (tenant_id = erp.group_tenant_of(...))` |
| 生产 `pg_policies` 实际 | 旧形状（含 `app.rls_system` 旁路），**不含 `group_tenant_of`** |
| `20261114180000` 之后改写这 8 张表策略的迁移 | **不存在**（migrations 全目录检索） |

注入时间也不合常理：`20261114190000`（01:09）先于 `20261114180000`（01:12）安装，`20261114200000/201000/202000` 也在 00:16–00:32 先行。**结论：该副本上「账本 success + checksum 匹配」不能证明策略已按该迁移落地。** 可能来源是副本/恢复保留了旧策略、或账本行被后补；本机无法进一步取证操作者。实践含义：这 8 张表（乃至所有策略类迁移）的验收必须读 `pg_policies`，不能只查账本。

#### 3.2.3 仓库定义

- 函数与策略：[20261114180000…sql](file:///Users/xingzhai/topems/database/migrations/20261114180000_erp_consolidation_group_tenant_rls.sql#L49-L63)（函数）、[L105-L133](file:///Users/xingzhai/topems/database/migrations/20261114180000_erp_consolidation_group_tenant_rls.sql#L105-L133)（先删全部既有策略，再 `CREATE POLICY tenant_isolation_<table> … FOR ALL` + `ENABLE/FORCE`）、[L138-L188](file:///Users/xingzhai/topems/database/migrations/20261114180000_erp_consolidation_group_tenant_rls.sql#L138-L188)（自检 1 条策略、qual 含 `group_tenant_of`、FORCE）。
- 既有普查：[rls-prod-vs-repo-census-2026-11-18.md](file:///Users/xingzhai/topems/docs/database/rls-prod-vs-repo-census-2026-11-18.md) 已把这 8 张单列为「需业务判断的 8 张（不计入 318）」，并记录同一 qual 对照；[rls-policy-inventory-b4.md](file:///Users/xingzhai/topems/docs/database/rls-policy-inventory-b4.md#L489-L492) 标注期望落 `batch08`。

#### 3.2.4 写入方

| 位置 | 语句 | tenant_id 来源 |
|---|---|---|
| [scopes.rs:142](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/scopes.rs#L142) | `INSERT INTO erp.consolidation_scopes` | `erp.group_tenant_of(NULLIF(GUC,'')::UUID)` |
| [internal_transactions.rs:257](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/internal_transactions.rs#L257) | `INSERT INTO erp.internal_transactions` | 同上 |
| [elimination_rules.rs:153](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/elimination_rules.rs#L153) | `INSERT INTO erp.elimination_rules` | 同上 |
| [elimination_flow.rs:421](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/elimination_flow.rs#L421) | `INSERT INTO erp.elimination_candidates` | 同上 |
| [company_relations.rs:192](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/company_relations.rs#L192)、[scope_companies.rs](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/scope_companies.rs) | `INSERT` 关系/成员 | 请求事务的 `app.tenant_id`（写入值来自中间件租户） |

UPDATE/DELETE 统一带 `tenant_id = NULLIF(GUC,'')::uuid` 显式谓词（如 [reports.rs:440](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/reports.rs#L440)、[scopes.rs:265](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/scopes.rs#L265)），即**应用层已按严格等值自证**，不依赖策略旁路。

#### 3.2.5 查询路径与影响面

- 全部读写集中在 [svc/erp/src/modules/consolidation/](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/)：`company_relations`、`internal_transactions`、`scopes`、`scope_companies`、`elimination_rules`、`elimination_flow`、`reports`，均以 `Extension(RlsTxnCell)` 复用中间件事务（例：[company_relations.rs:33-74](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/company_relations.rs#L33-L74)、[reports.rs:26-60](file:///Users/xingzhai/topems/svc/erp/src/modules/consolidation/reports.rs#L26-L60)）。
- `svc/finance` **不直查**这 8 张表：[financial_reports.rs:631](file:///Users/xingzhai/topems/svc/finance/src/modules/financial_reports.rs#L631)、`:697`、`:800` 只是注释声明「合并实体/抵消分录真值在 erp 表，当前 0 行」。
- 受影响报表（若改策略）：合并报表列表/详情/生成/审批/发布/删除、报表行、抵消规则与候选、内部交易台账与核对汇总、合并范围及成员、公司关系。finance 侧报表不受影响。

### 3.3 归一规则（草案，不落地）

若要统一到仓库口径：

1. **前置**：确认没有任何 service token 调 `/erp/consolidation/*`（网关路由 + 调用方清单）。这是唯一会改变行为的点。
2. **只改策略**：`DROP POLICY` + `CREATE POLICY` 放在同一事务（`apply-forward.sh` 已提供事务），不要「先建第二条再删旧条」——PG 的 permissive 策略是 OR 关系，并存期间会**放宽**隔离。
3. **不重命名**：两侧策略名已经一致（`tenant_isolation_<table>`），本条不涉及 §2 的改名问题。
4. **验收**：以 `pg_policies` 实测 qual 含 `group_tenant_of` + 每表 1 条为准（账本 success 不可作为证据，见 §3.2.2）。

### 3.4 待决点

1. **service token 是否访问合并域**：无调用方向 → 可安全对齐；存在 → 对齐会让 service 静默读空。需网关/调用方清单定论，本文不选边。
2. **是否保留系统通道**：超管当前也必须显式 `x-tenant-id`（[tenant.rs:555-574](file:///Users/xingzhai/topems/lib/shared-auth/src/middleware/tenant.rs#L555-L574)），系统通道实际上只服务 service 身份。保留=维持现状；取消=与仓库一致。
3. **账本与实际不一致是否要建巡检**：建议把「8 张表策略实测 vs 期望」纳入与 §2 同一套巡检，而不是依赖账本。
4. **未来集团-成员租户层级**：`group_tenant_of` 是唯一扩展点；当前恒等，所以现在对齐**没有功能收益**，只有口径统一收益。


