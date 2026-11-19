# RLS「空串 GUC 放行」可达性实证（2026-11-19）

> 性质：**只读实证**。未写生产、未改代码、未动迁移。
> 背景文档：[生产 vs 仓库 RLS 差分普查（2026-11-18）](rls-prod-vs-repo-census-2026-11-18.md)。

## 0. 结论先行

1. **76 张是普查重放口径的历史态，不是当前终态。** 本地终态库 `topems_web_smoke`
   （`_sqlx_migrations` 720 条已应用，`max(version)=20261118160000`，`failed=0`）中，
   这 76 张表 **没有任何一条策略仍含 `current_setting('app.tenant_id', true) = ''` 分支**
   （逐表计数为 0）；全库带策略的 958 张表中，含 `= ''` 分支的同样为 0
   （其余形态如 allow_all 不在本文范围）。
2. **代码侧不存在显式把租户 GUC 设成空串的路径。** 所有设置点绑定的都是
   `Uuid` 的字符串形式；唯一的空串来源（superuser 的 `rls_tenant_value`）被转换成
   `RESET app.tenant_id`，不是 `SET ''`。
3. **但「池化连接 + 遗留宽松策略」组合下，该分支可达。** PostgreSQL 18 实测：
   自定义 GUC 经 `SET` / `SET LOCAL`（含 COMMIT、ROLLBACK）/ `RESET` 之后，
   `current_setting(..., true)` 返回**空串 `''` 而非 NULL**。因此只要某条池化连接
   执行过任一 `Db::scope*` 事务（事务级 `set_config`）或走过 `tenant_rls_middleware`，
   之后未设会话租户时读到就是 `''`。这不是「代码塞空串」，而是「GUC 生命周期」。
4. **三档结论**：可被正常路径走到 **0 张（当前终态）**；只在异常/特定工具下可达 **0 张**；
   实际不可达 **76 张**（就当前终态而言，分支已不存在），其中 8 张另无任何代码读写。
5. **风险定位**：风险在**策略侧**，不在 GUC 写入侧。不能以「代码不会写空串」为理由
   保留 `= ''` 分支。

## 1. 方法与口径

### 1.1 生产侧（只读）

- 计划：在生产只读连接上先 `SHOW transaction_read_only` 确认 `on`，再从 `pg_policies`
  取 76 张表的完整表达式。
- 实际：本轮生产只读 SSH 通道不可达（`xingzhai@192.168.3.129`、`192.168.110.115`
  均连接超时），**未当场复测**。
- 替代口径：沿用 [普查文档](rls-prod-vs-repo-census-2026-11-18.md) 2026-11-18 的生产只读导出；
  该文档附录 A 中这 76 张表的「生产开放特征」列全部为 `—`，即**生产当前没有该分支**。

### 1.2 仓库终态（只读）

- 数据库：本地 `topems_web_smoke`，`psql "postgresql:///topems_web_smoke"`，全程 SELECT。
- 迁移进度：`SELECT count(*), max(version) FROM _sqlx_migrations WHERE success`
  → `720` / `20261118160000`；仓库迁移文件共 781 个（61 个尚未应用，均为 11-19 新增）。
- 逐表判定 SQL（关键点：用 `chr(61)||chr(32)||chr(39)||chr(39)` 精确匹配 `= ''`，
  **不能**写成 `LIKE '%''%'`——那会把严格形态 `NULLIF(current_setting(...), '')`
  误判为放行分支）：

```sql
WITH t(sch,tb) AS (VALUES ('public','approvals'), /* ... 76 行 ... */),
p AS (SELECT t.sch||'.'||t.tb AS tbl, count(*) AS n,
        count(*) FILTER (WHERE strpos(pol.qual, '= '||chr(39)||chr(39)) > 0) AS eq_empty,
        count(*) FILTER (WHERE pol.qual LIKE '%tenant_id IS NULL%')          AS null_row,
        count(*) FILTER (WHERE pol.qual LIKE '%00000000-0000-0000-0000-000000000000%') AS zero
        FROM t JOIN pg_policies pol ON pol.schemaname=t.sch AND pol.tablename=t.tb
       GROUP BY 1)
SELECT * FROM p ORDER BY tbl;
```

- 全库读数：`1051` 条策略 / `958` 张表；含 `= ''` 分支的表数为 **0**。

### 1.3 宽松度判定

沿用普查定义：`EMPTY_GUC` = 策略里存在 `current_setting('app.tenant_id', ...) = ''`
直接放行分支；`NULL_ROW` = `tenant_id IS NULL`；`ZERO_TENANT` = 全零 UUID 通道。
本次额外强调：**`NULLIF(..., '')` 是防御写法，不是放行分支**，两者不可混淆。

## 2. 76 张名单与形态分组

按普查附录 A 的「仓库开放特征」列分组：

| 形态 | 数量 | 含义 |
|---|---:|---|
| `EMPTY_GUC,NULL_ROW,ZERO_TENANT` | 73 | 空串、NULL 租户、全零租户三条放行分支同时存在 |
| `EMPTY_GUC,NULL_ROW` | 3 | 空串 + NULL 租户两条分支 |

**`EMPTY_GUC,NULL_ROW`（3 张）**

```
communication.core_notification_deliveries
communication.core_notification_preferences
communication.core_notification_subscriptions
```

**`EMPTY_GUC,NULL_ROW,ZERO_TENANT`（73 张）**

```
communication.notification_channels
core.ai_faqs
crm.customer_finance
crm.sales_orders
erp.announcements
erp.documents
erp.voucher_items
erp.vouchers
hrm.employees
hrm.hrm_cache_invalidation_logs
hrm.module_settings
iam.crm_dashboard_snapshots
iam.ehs_dashboard_snapshots
iam.hrm_dashboard_snapshots
iam.lims_dashboard_snapshots
iam.pdm_dashboard_snapshots
iam.permission_audit_logs
iam.wms_dashboard_snapshots
master_data.materials
master_data.mdm_ai_models
master_data.mdm_ai_suggestions
master_data.mdm_api_exposures
master_data.mdm_api_products
master_data.mdm_bc_tests
master_data.mdm_change_events
master_data.mdm_classification_models
master_data.mdm_classification_results
master_data.mdm_classifier_rules
master_data.mdm_continuity_plans
master_data.mdm_critical_functions
master_data.mdm_data_contracts
master_data.mdm_data_products
master_data.mdm_dimension_scores
master_data.mdm_failover_records
master_data.mdm_graph_communities
master_data.mdm_graph_edges
master_data.mdm_graph_nodes
master_data.mdm_impact_analyses
master_data.mdm_impact_simulations
master_data.mdm_improvement_plans
master_data.mdm_lineage_edges
master_data.mdm_lineage_graphs
master_data.mdm_lineage_nodes
master_data.mdm_match_results
master_data.mdm_match_rules
master_data.mdm_maturity_assessments
master_data.mdm_maturity_history
master_data.mdm_propagation_logs
master_data.mdm_propagation_rules
master_data.mdm_recovery_plans
master_data.mdm_recovery_points
master_data.mdm_region_configs
master_data.mdm_replication_configs
master_data.mdm_search_history
master_data.mdm_semantic_search_indexes
master_data.mdm_subscriptions
master_data.mdm_tag_rules
master_data.mdm_tagged_entities
master_data.mdm_tags
master_data.mdm_version_snapshots
master_data.mdm_workflow_history
master_data.mdm_workflow_templates
master_data.mdm_workflows
master_data.samples
master_data.uoms
public._archive_core_workflow_versions
public.approval_records
public.approvals
public.core_email_queue
public.permission_audit_logs
public.tenant_permissions
rs.module_settings
ticket.ticket_attachments
```

### 2.1 代表表达式（历史宽松态）

来自普查文档 §3.2（行 170/172/173）的仓库侧重放结果：

```sql
-- 3 张 communication 表（EMPTY_GUC,NULL_ROW 族）
(tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
OR (current_setting('app.tenant_id', true) = '')

-- erp.announcements / iam.crm_dashboard_snapshots / master_data.materials 等（三通道族）
(current_setting('app.tenant_id', true) IS NULL)
OR (current_setting('app.tenant_id', true) = '')
OR (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000')
OR (tenant_id IS NULL)
OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
```

### 2.2 终态实测

上述 76 张表在当前 `topems_web_smoke` 中的策略已全部变为严格 B 范式，例如：

```sql
-- erp.announcements（rls_tenant_isolation / tenant_isolation_announcements 两条）
(COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
```

抽样核对 `master_data.materials`、`public.tenant_permissions`、
`communication.core_notification_subscriptions`、`iam.crm_dashboard_snapshots`，结果一致。

### 2.3 76 与终态 0 的差异来源

- 普查侧是「按 version 顺序重放迁移中的策略 DDL」得到的**历史/中间态**；
  其附录自身（行 170–174）展示的就是宽松多分支。
- 仓库随后新增了一批 fail-closed 收紧迁移，例如
  `20261114120000_w7_b4_six_schema_rls_fail_closed_forward.sql`、
  `20261114202000_erp_crm_portal_rls_fail_closed_8.sql`（`erp.announcements` 已无 `= ''`）、
  `20261115120000_k8_crm_erp_rls_fail_closed_2.sql`、`20261118150000_batch0_active_residual_rls_strict.sql`
  等，会按 `qual LIKE '%IS NULL%'` / 全零 UUID 识别并把策略重建为严格范式
  （见 `20261114120000_...sql:395-396`、`20261115120000_...sql:118`）。
- 结论：**76 应标注为「收紧前/重放中间态」，不能作为当前风险基线**。

## 3. 三档可达性

### 3.1 可被正常路径走到 —— 当前 0 张

- 依据：§1.2 逐表计数 `eq_empty=0`；全库含 `= ''` 的表数为 0。
- 说明：分支当前**不存在**，因此不存在「走到」的问题。
- 条件性重述：若某环境回退到 §2.1 的宽松策略，则通过 §4.2 的池化隐式 `''`，
  该分支可在正常请求路径命中。这是历史/回退态的风险，不是当前态。

### 3.2 只在异常或特定工具下可达 —— 0 张

- 全仓无 `SET app.tenant_id = ''` / `set_config('app.tenant_id', '', ...)` 的运行时调用。
- 迁移文件中的 `= ''` 只出现在历史策略 DDL 文本里，迁移期不会把它作为 GUC 值写入业务会话。
- 测试、演练、工具脚本未发现显式设空串（`scripts/db/rls-app-exemption.sql` 为策略豁免脚本，
  不设置 `app.tenant_id` 为空串）。

### 3.3 实际不可达 —— 76 张（当前终态）

- 就当前终态策略而言，76 张全部不可达：放行分支已被删除。
- 其中 **8 张连代码路径都没有**（全仓检索无 SQL 引用、无字面引用）：

```
iam.crm_dashboard_snapshots
iam.ehs_dashboard_snapshots
iam.hrm_dashboard_snapshots
iam.lims_dashboard_snapshots
iam.pdm_dashboard_snapshots
iam.wms_dashboard_snapshots
master_data.mdm_critical_functions
public._archive_core_workflow_versions
```

- 另有 1 张仅在 i18n 文案中出现（无 SQL）：

```
erp.voucher_items   （命中文件：apps/web/src/i18n/locales/en/erp.json）
```

> 注：「不可达」仅指**应用代码读写路径**。任何持有数据库凭据的客户端（psql、BI、
  第三方系统）都不受此约束——这正是策略侧不能留放行分支的原因。

## 4. 代码侧取证

### 4.1 所有设置 `app.tenant_id` 的位置

| 位置 | 写入值 | 空串可能 |
|---|---|---|
| [lib/shared-auth/src/middleware/tenant.rs:657](../../lib/shared-auth/src/middleware/tenant.rs#L657-L668) | 事务级 `set_config(..., true)`，bind `tenant_id.to_string()`（`Uuid`） | 否 |
| [lib/shared-db/src/scope.rs:440](../../lib/shared-db/src/scope.rs#L440-L450) | 事务级 `set_config(..., true)`，参数为 `Uuid`；nil 在 [:226](../../lib/shared-db/src/scope.rs#L220-L256) / [:252](../../lib/shared-db/src/scope.rs#L245-L256) 被拒绝 | 否 |
| [lib/shared-db/src/scope.rs:428](../../lib/shared-db/src/scope.rs#L428-L437) | 请求无租户上下文 → `Protocol("RLS context missing...")`，fail-closed | 否 |
| [lib/shared-db/src/database/mod.rs:102](../../lib/shared-db/src/database/mod.rs#L99-L110) | `DEFAULT_TENANT_ID` 先 `parse::<Uuid>()`，失败即 `None`（不设置） | 否 |
| [lib/shared-db/src/database/mod.rs:133](../../lib/shared-db/src/database/mod.rs#L130-L142) | `after_connect` 会话级 `set_config(..., false)`，仅当 `Some(tenant)` | 否 |
| [lib/shared-db/src/tenant.rs:34](../../lib/shared-db/src/tenant.rs#L34-L72) | `Uuid` / `Uuid::nil()`，bind `to_string()` | 否 |
| [svc/unified-core/src/middleware/tenant_rls.rs:196](../../svc/unified-core/src/middleware/tenant_rls.rs#L196-L201) | `rls_tenant_value`：superuser 返回 `String::new()` | 值层面是空串 |
| [svc/unified-core/src/middleware/tenant_rls.rs:217](../../svc/unified-core/src/middleware/tenant_rls.rs#L212-L235) | 空串 → 执行 `RESET app.tenant_id`，**不 SET ''** | 否（转 RESET） |
| [svc/unified-core/src/middleware/tenant_rls.rs:319](../../svc/unified-core/src/middleware/tenant_rls.rs#L314-L324) | 响应后同连接 `RESET app.tenant_id` 再归还池 | 否（转 RESET） |

结论：**显式空串写入不存在**；`rls_tenant_value` 的空串在落库前被 `RESET` 拦截。

### 4.2 PostgreSQL 18 的 GUC 生命周期（本地实测）

在本地 PG18.4 上按会话逐步验证 `current_setting('app.tenant_id', true)`：

| 场景 | 返回值 |
|---|---|
| 全新连接，从未触碰该 GUC | `NULL` |
| `SET app.tenant_id = '<uuid>'` → `RESET` | `''`（空串） |
| `SET LOCAL app.tenant_id = '<uuid>'` → `COMMIT` | `''` |
| `SET LOCAL app.tenant_id = '<uuid>'` → `ROLLBACK` | `''` |
| 从未 SET 过，直接 `RESET` | `''` |

推论：

- 「未设置」只在**全新连接**上是 `NULL`；一旦该连接执行过 `SET`/`SET LOCAL`/`RESET`，
  之后就始终是 `''`（空串占位）。
- 业务侧 `Db::scope*` 每个作用域都会执行事务级 `set_config('app.tenant_id', ..., true)`，
  事务结束（COMMIT/ROLLBACK）后连接上的会话值即变为 `''`。
- `tenant_rls_middleware` 在归还连接前也执行 `RESET`（[:319](../../svc/unified-core/src/middleware/tenant_rls.rs#L314-L324)），
  同样落在 `''`。
- 因此**池化复用后，绝大多数连接读到的是 `''` 而不是 `NULL`**。
  若策略保留 `= ''` 分支，正常请求即可整表放行。

### 4.3 为什么不能靠「GUC 不设」来防御

- 不设 GUC → `current_setting(..., true)` 为 `NULL` → `NULL = ''` 为 UNKNOWN → 分支不成立（安全）。
- 但连接池意味着「不设」只对**从未被使用过的新连接**成立；被复用过的连接会因 §4.2
  变成 `''`。以「pool 里都是新连接」为前提的推理不成立。

## 5. 「策略松」与「代码塞空串」是两件事

- **策略松**：策略里写了 `OR current_setting(...) = ''`，等于把空串当作全量通道。
  这是本次 76 张名单描述的问题。
- **代码塞空串**：应用显式把 GUC 设成 `''`。本次全仓取证结论是**不存在**。
- 两者不能互相抵消：
  - 即使代码从不写空串，§4.2 的隐式 `''` 仍能命中宽松策略；
  - 即使策略严格，显式 `SET ''` 也会让 `tenant_id` 永远匹配不到（fail-closed），
    属于可用性风险而非隔离风险。
- 因此正确方向是**收策略**，而不是只改 GUC 写入侧。

## 6. 代码触达统计（76 张）

方法：在 `svc/ lib/ apps/web/src/ cli/ scripts/` 内（排除 `docs/ database/ fixtures/ target/ node_modules/`），
按 `schema.table` 与 SQL 关键字（`FROM/JOIN/INTO/UPDATE/DELETE FROM/TABLE`）检索。

| 档 | 含义 | 数量 |
|---|---|---:|
| A | 至少一处 SQL 语句引用 | 67 |
| B | 仅非 SQL 字面（i18n/文档字符串/表清单） | 1（`erp.voucher_items`） |
| C | 无任何引用 | 8（见 §3.3） |

注意：A 档只代表「代码里有 SQL 字面引用」，其中包含测试与迁移生成器脚本，
不等同于线上有流量；本次不据此推断可达性，可达性以策略是否含分支为准。

## 7. 生产口径

- 普查文档附录 A 中，这 76 张表的「生产开放特征」列均为 `—`，即生产**当前无该分支**。
- 本轮生产只读 SSH 不可达，未当场复测；该结论的时效性以 2026-11-18 普查快照为准。
- 若后续需要生产级确认，最小验证为：只读连接上执行 §1.2 的逐表 SQL，期望 `eq_empty=0`。

## 8. 修法建议（先不动手）

按优先级：

1. **策略侧（首选）**：把这 76 张（以及全库其余）策略统一为严格 B 范式，
   删除 `= ''`、`tenant_id IS NULL`、全零 UUID 三条放行分支：
   ```sql
   (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
   OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
   ```
   系统通道只保留显式 `app.rls_system='on'` 一条，语义清晰、可审计。
2. **门禁侧**：把「策略 qual 含 `= ''` 或 `tenant_id IS NULL` 放行分支」纳入 CI 形态检查
   （仓库已有 `scripts/ci/check-rls-policy-shape.sh` 的设计意图，见
   [lib/shared-db/src/rls.rs](../../lib/shared-db/src/rls.rs) 的注释）与 P4 生产只读复核。
3. **GUC 侧（补充，不可替代）**：设置入口拒绝空串、连接归还前强制 `RESET`
   （现有实现已满足）；它能降低显式空串概率，但**覆盖不了** §4.2 的隐式 `''`、
   第三方客户端与迁移会话，因此不能作为唯一防线。
4. **不建议**只做第 3 条而保留 `= ''` 分支。

## 9. 复现

```bash
# 1) 终态逐表计数（应为 eq_empty=0）
psql -X -q -A -t "postgresql:///topems_web_smoke" -f /tmp/q2.sql

# 2) 全库含 = '' 分支的表数（应为 0）
psql -X -q -A -t "postgresql:///topems_web_smoke" -c \
  "SELECT count(DISTINCT schemaname||'.'||tablename) FROM pg_policies
    WHERE strpos(qual, chr(61)||chr(32)||chr(39)||chr(39)) > 0;"

# 3) 代码侧设置点
rg -n "set_config\('app\.tenant_id'|RESET app\.tenant_id" svc lib
```

## 10. 风险等级

| 口径 | 等级 | 理由 |
|---|---|---|
| 当前仓库终态 | **低** | 76/76 已收紧为严格范式，全库 `= ''` 表数为 0 |
| 生产（普查快照） | **低** | 附录 A 生产列为 `—`，未出现该分支 |
| 历史/回退态（若重新引入宽松策略） | **高** | §4.2 池化隐式 `''` 可让整表跨租户可见 |
| 无代码路径的 8 张表 | **低** | 即使策略回退，应用侧也无读写入口（但 DB 客户端仍可访问） |

**登记建议**：以「低（当前）/ 高（回退态）」双档登记；观测项为
`pg_policies` 中 `qual` 含 `= ''` 的表数，期望恒为 0。

## 11. 「318 张」复核（2026-11-19 追加，只读）

### 11.1 差异根因

普查 §1.2 的方法是「生产 schema 快照 + 清空策略 + 按 version 升序重放策略 DDL」，
但其仓库侧读数（**1181 条策略 / 1031 张表**）与仓库终态（**1051 条 / 958 张**）不一致，
说明重放**截止早于 `20261118160000`**，且与 `20261115142500` 前后的仓库态一致
（未包含此后的收紧迁移）：

- `20261115142500 → 20261118160000` 之间共 **23 个迁移文件，其中 21 个含策略 DDL**；
- 本文 318 张中的 317 张正是在这批迁移里被改成严格范式；
- 因此 318 是「重放截止版本」造成的中间态，不是生产与仓库的真实差异。

可复现对照（同一生产基线、同一特征口径，仅换仓库侧数据库）：

| 仓库侧数据源 | 迁移数 / max | 比生产更宽松的表数 |
|---|---|---:|
| `m2_dryrun_20261116`（11-16 中间态） | 698 / `20261115142500` | **290** |
| `topems_web_smoke`（终态） | 720 / `20261118160000` | **0** |

中间态的 290 张组合分布与普查 318 同族（236 张
`EMPTY_GUC+NULL_ROW+ZERO`、7 张 `EMPTY_GUC+NULL_ROW`、17 张 `NULL_ROW+ZERO`、
16 张 `EMPTY_GUC+ZERO`、8 张 `ALLOW_TRUE` 等），可判定二者是同一现象的不同截止点。

### 11.2 终态重算结果

- 生产基线：`topems_prod`（1050 条 / 957 表；普查的生产侧来源，本地镜像，
  已应用到 `20261118150000`）。
- 仓库终态：`topems_web_smoke`（1051 条 / 958 表）。
- 两侧共有 957 张表：**仓库开放特征 ⊃ 生产：0 张；生产 ⊃ 仓库：0 张；特征相同：957 张**。
- 仅仓库新增 1 张表：`iam.core_tenant_plugins`（无宽松特征）。
- 与 318 的差集：**交集 0，318 张全部移出「仓库更宽松」集合**。其中
  **317 张终态已完全严格**；唯一例外 `bi.audit_logs` 在两侧**同为**
  `bi_allow_all_audit_logs USING (true)`，属于生产风险，但不属于「仓库更松」。

### 11.3 生产侧复测

- 本轮再次尝试只读 SSH：`192.168.3.129:22` 与 `192.168.110.115:22` 均
  `Operation timed out`，`ping` 100% 丢包——**网络层不可达，非认证问题**。
- 说明：普查的「生产」侧本来就取自本地镜像 `topems_prod`（见 `TODO.md` §3.1
  「只读口径：本地 `topems_prod`，无远程生产凭据」），并非本次才失去连接；
  本轮**未对远程生产复测**，生产读数仍以该镜像 / 普查快照为准。

### 11.4 修正后的数字

> **「按仓库迁移重建一套库，会有多少张表比线上生产更宽松？」**
> **终态答案：0 张。**
> 318 是 `20261115142500` 前后重放快照的历史读数；76 张空串放行是该快照的子集，
> 终态同样为 0。普查文档已在文首与 §3.1/§3.2 就地标注更正（2026-11-19）。
