# P0 地基：RLS 收紧 fail-closed 方案（待确认，未执行）

- 日期：2026-11-06
- 状态：**方案待确认，未对线上库做任何变更**
- 前置：B1–B4 已完成（pool 上以 GUC 作租户谓词的 SQL 调用点已全部改为 Claims 显式绑定；全仓仅剩 3 处机制性/测试性残留，见 §1.2）
- 配套清单：[p0-rls-fail-closed-inventory-20261106.md](p0-rls-fail-closed-inventory-20261106.md)（867 张表的逐表导出）
- 本轮仍挂账、不处理：`portal.portal_todos` 缺列与 `allow_all`、pm settlement 按 id 读、integration mapping 更新、超管硬编码 0001、rd `batch_create` 写 nil、`core_dict_types` schema 限定

---

## 0. 结论摘要

1. 线上 `topems_prod` 实测：**867 张表启用 RLS，其中 858 张 FORCE RLS，9 张仅 ENABLE 未 FORCE**；所有表 owner 均为应用角色 `topems_prod`（`rolbypassrls=false`、`rolsuper=false`）。**未 FORCE 的 9 张表对应用连接来说 RLS 完全不生效**。
2. **1066 条策略全部是 PERMISSIVE（0 条 RESTRICTIVE）**，且 `polroles = {PUBLIC}`。因此"收紧某一条租户策略"并不能单独生效——同表上任何 `allow_all` 策略仍会把访问放行（permissive 之间是 OR）。
3. 策略表达式实测分布：含 `current_setting` 的 816 条，其中 **806 条含"GUC 未设即豁免"（`... IS NULL`）**、816 条含空串豁免（`= ''`）、643 条含 nil UUID 超管分支、**31 条把租户 0001 硬编码进策略**。另有 **250 条 `USING (true)` / `WITH CHECK (true)` 的 allow_all 策略**。
4. 按"是否有租户列 × 是否 allow_all × 是否引用 GUC"分四类：**A 类 618 张（813 条策略，直接可收紧）**；**B 类 3 张（6 条策略，需先删 allow_all）**；**C 类 184 张（184 条 allow_all，有 `tenant_id` 但完全未隔离）**；**E 类 62 张（62 条 allow_all，无租户列的系统/全局表）**。
5. 目标形态（单条策略即可，不依赖多条 OR）：
   ```sql
   USING (
     NULLIF(current_setting('app.tenant_id', true), '')::uuid
       = '00000000-0000-0000-0000-000000000000'::uuid   -- 超管/服务身份：全量
     OR tenant_col = NULLIF(current_setting('app.tenant_id', true), '')::uuid
   )
   ```
   GUC 未设 / 被 RESET 成空串时 → `NULL` → 全部行被过滤（fail-closed）；普通租户只命中本租户；超管与服务令牌（现有 middleware 固定写 nil）仍全量。**注意必须用 `NULLIF(...,'')`，不能依赖 `IS NULL`**：unified-core 的 `RESET app.tenant_id` 实测回落为空串而非 NULL。
6. **最大风险不是策略写法，而是"大量无人设 GUC 的连接会从跨租户读变成静默 0 行"**：登录/刷新（`public.core_sessions`、`core_refresh_tokens`）、后台任务、psql 诊断脚本。方案对这两张 auth 表给出显式 allow_all + FORCE 例外。建议 **C 类 184 张表拆成独立第二阶段**，不要与 A/B 同窗切换。

---

## 1. 现状核实（线上实测，2026-11-06）

### 1.1 表级

```
$ psql $DATABASE_URL -c "select n.nspname, count(*) ... from pg_class c join pg_namespace n ..."
```

| 指标 | 实测值 |
|---|---|
| 启用 RLS 的表 | **867** |
| 其中 FORCE RLS | **858** |
| ENABLE 但未 FORCE | **9** |
| 表 owner | 全部 `topems_prod`（`rolbypassrls=f`、`rolsuper=f`） |
| 有 `tenant_id` 列的表（在 RLS 表内） | 795 |
| 有 `tenant_uid` 列的表（master_data 专用） | 14 |
| 两者都没有的 RLS 表 | 62 |
| `tenant_id` 可为 NULL 的表 | 489 |
| 全库 `tenant_id IS NULL` 行总数 | **47**（`public.audit_logs` 26、`wms.warehouses` 6、ai 7、mobile 3、scm 2、`public.core_tenants` 1、`mobile.mobile_users` 1、`mobile.sync_policies` 1） |

**9 张未 FORCE 的表（当前 RLS 对应用连接形同虚设）**：

| 表 | 当前策略形态 |
|---|---|
| `ehs.qa_ehs_compliance_evaluations` | fail-open |
| `ehs.qa_ehs_discharge_permits` | fail-open |
| `ehs.qa_ehs_env_monitor_records` | fail-open |
| `ehs.qa_ehs_environment_incidents` | fail-open |
| `ehs.qa_ehs_environmental_regulations` | fail-open |
| `lims.qa_lims_analytes` | fail-open ×2（重复策略） |
| `mes.work_orders` | fail-open |
| `public.core_refresh_tokens` | 严格型 `tenant_id = COALESCE(NULLIF(cs,'')::uuid, 0001)` |
| `public.core_sessions` | 严格型 `tenant_id = COALESCE(NULLIF(cs,'')::uuid, 0001)` |

> `core_sessions` / `core_refresh_tokens` 当前 1374 行全部 `tenant_id=0001`；登录、刷新、登出均按 `token_hash` 直查、不带租户谓词。**这两张一旦 FORCE + 收紧，refresh/登出会立即 0 行**。

### 1.2 策略级

| 指标 | 实测值 |
|---|---|
| 策略总数 | **1066**（其中 1 条挂在未启用 RLS 的表上，见下） |
| PERMISSIVE / RESTRICTIVE | **1066 / 0** |
| `polroles` | 全部 `{0}`（PUBLIC） |
| 引用 `current_setting` | 816 |
| 含 `current_setting(...) IS NULL` 豁免 | **806** |
| 含 `= ''` 空串豁免 | **816** |
| 含 nil UUID 分支 | 643 |
| 含硬编码租户 `...0001` | **31**（29 张 master_data 表 + auth 两张） |
| `USING(true)` + `WITH CHECK(true)` 的 allow_all | **250** |

典型三类实测原文：

```
-- 宽松（跨租户可读写）
rls_tenant_isolation | ((COALESCE(current_setting('app.tenant_id', true), '') = '000...000')
  OR (current_setting('app.tenant_id', true) IS NULL)
  OR (current_setting('app.tenant_id', true) = '')
  OR (tenant_id IS NULL)
  OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')))

-- 严格（GUC 空退化为 0001，不是 fail-closed）
core_sessions_tenant_isolation | (tenant_id = COALESCE((NULLIF(current_setting(...), ''))::uuid, '000...001'))

-- 全放行
pm_allow_all_settlements | true
```

**悬空策略**：`gis.track_positions` 上有一条 `gis_allow_all_track_positions`（`USING (true)`），但该表 `relrowsecurity=false` —— 策略不生效，属残留。建议迁移中单独 `DROP POLICY`（不影响行为），并在清单中标注。

**注意**：`public.core_menus` / `public.core_menu_groups` 各同时存在 `rls_menu_global_visible`（`tenant_id = nil OR tenant_id = cs`）与一条 fail-open 租户策略；两条皆 permissive → 收紧后者后，前者仍会向未设 GUC 的连接暴露 `tenant_id=nil` 的全局菜单行。必须两处一起处理。

**与 B1–B4 的衔接**：pool 上以 GUC 取租户的业务 SQL 已清零（master-data 80/11→0、mobile 7/5→0；全仓剩 3 处为两个 RLS 单测 + `lib/shared-db/src/rls.rs` 的策略生成 DDL）。因此收紧 RLS 后，业务查询仍由 SQL 里显式 `$N` 谓词工作，**不依赖 GUC**。

---

## 2. 逐表影响清单

### 2.1 分类汇总（867 张）

| 类 | 判定 | 表数 | 策略数 | 建议动作 |
|---|---|---|---|---|
| **A** | 有租户列 + 引用 GUC，无 allow_all | **618** | 813（含重复策略） | 删除全部旧策略，重建单条 fail-closed 策略；FORCE 已有 |
| **B** | 有租户列 + 引用 GUC + allow_all | **3** | 6 | 先删 allow_all，再重建 fail-closed 策略 |
| **C** | 有租户列，但只有 allow_all | **184** | 184 | **第二阶段**：逐表确认全局/租户语义后替换；本阶段保持不动 |
| **E** | 无租户列，只有 allow_all | **62** | 62 | 保留，登记为"全局/系统表"，显式命名 + COMMENT |
| **合计** | | **867** | 1065 | 另有 1 条策略挂在未启用 RLS 的 `gis.track_positions` |

B 类 3 张：`mes.process_flow_steps`、`pm.documents`、`rs.formulas`。

### 2.2 无 `tenant_id`/`tenant_uid` 的 62 张表（E 类，收紧后仍全局可见）

这批表**结构上无法做租户谓词**，收紧策略不会误伤，因为它们的 allow_all 保持不动；但它们是"任何持 DB 连接的应用代码都可跨租户读"的既有暴露面，需要显式登记：

`core.core_tenant_plugins`、`crm.core_crm_customers`、`doc.{documents,folders,templates,document_versions}`、`doc_service.{archives,files,folders,templates}`、`erp.{core_erp_materials,core_erp_suppliers,expenses,holidays,meeting_bookings,meeting_rooms,payables,receivables,vehicle_requests,vehicles}`、`flow.{audit_logs,notifications,workflows}`、`gis.{audit_log,audit_logs,geodata,geofeatures,geofence_alerts,map_layers,spatial_analysis}`、`iam.{audit_logs,permissions,roles}`、`mail.{emails,templates}`、`master_data.{core_dict_items,core_dict_types}`、`mes.{material_categories,material_requirement_items}`、`mobile.oa_announcement_reads`、`notification.notifications`、`pdm.pdm_master_data_refs`、`pm.service_integrations`、`portal.{portal_announcements,portal_quick_actions,user_preferences}`、`public.{alert_rules,alerts,navigation_menu,pinned_apps,todos,user_settings}`、`qms.{audit_logs,corrective_actions,dashboard_metrics,inspection_items,quality_inspections,quality_issues,quality_standards}`、`report.reports`、`storage.files`、`wms.wms_master_data_refs`。

> 其中 `master_data.core_dict_types` 即已知挂账的"schema 限定缺失"表；本方案不改其 `allow_all`，也不改 schema 解析。

### 2.3 C 类 184 张表（有 tenant_id 但完全未隔离，第二阶段处理）

按 schema：pm 29、finance 18、mobile 18、ehs 17、erp 17、wms 15、lims 12、gis 10、integration 9、mes 8、srm 7、ticket 7、scm 5、ai 4、hrm 2、public 2、bi 1、crm 1、core 1、portal 1。

高风险代表（改后会从"全量可见"变成"本租户可见"）：`pm.settlements`、`pm.contracts`、`pm.settlement_items`、`erp.dict_types`、`erp.dict_items`、`finance.expenses`、`finance.receivables`、`mobile.offline_sync_records`、`mes.quality_inspections`、`wms.inbound_order_items`、`gis.locations`、`integration.crm_erp_sync`。

> 完整 867 行（含每张表的租户列、是否可空、FORCE 状态、策略名与形态、建议动作）见配套清单文档。

### 2.4 特例表（必须在迁移里单独写）

| 表 | 现状 | 收紧后风险 | 方案 |
|---|---|---|---|
| `public.core_sessions` | 非 FORCE；1374 行全是租户 0001；按 token_hash 直查 | refresh/登出全断 | **显式 allow_all + FORCE + COMMENT**，行为等价于当前 owner 绕过，但不再"隐式" |
| `public.core_refresh_tokens` | 同上 | 同上 | 同上 |
| `public.core_menus` / `core_menu_groups` | 双策略，含 `tenant_id=nil` 全局菜单 | 普通租户看不到全局菜单 | 专用谓词：`cs=nil` 全量；否则 `tenant_id = nil OR tenant_id = cs`（且 `cs IS NOT NULL`） |
| `public.core_tenants` | 1 行 `tenant_id=NULL`（默认租户） | 普通租户查不到默认租户元数据 | 单独 allow：`cs=nil OR tenant_id = cs OR (tenant_id IS NULL AND cs IS NOT NULL)`，或把该行回填为 0001 |
| 7 张业务表（ehs 5 / lims 1 / mes 1） | 非 FORCE | 今天无隔离 | 本阶段一并 `FORCE ROW LEVEL SECURITY` |
| 31 条含硬编码 0001 的策略 | master_data 29 + auth 2 | 任何租户都能读 0001 行 | 迁移中一律去掉 0001 分支（auth 两张除外，它们走 allow_all） |

---

## 3. 迁移设计

### 3.1 目标策略表达式

统一命名为 `rls_tenant_isolation`（每表一条，`FOR ALL`，`TO PUBLIC`）：

```sql
-- 普通业务表（tenant_id 或 tenant_uid）
USING (
  NULLIF(current_setting('app.tenant_id', true), '')::uuid
    = '00000000-0000-0000-0000-000000000000'::uuid
  OR <tenant_col> = NULLIF(current_setting('app.tenant_id', true), '')::uuid
)
WITH CHECK (同上)
```

- GUC 未设或为 `''` → 两侧均为 NULL → 不命中（fail-closed）。
- GUC = nil → 第一支 TRUE → 全量（保留决策点 5 的超管/服务身份语义）。
- 不再保留 `tenant_id IS NULL` 分支：全库仅 47 行 NULL 租户，且超管（nil）仍可见；如产品要求普通租户也可见，应回填租户而不是放回豁免分支。
- 不再保留 `''` 分支与 `IS NULL` 分支。

### 3.2 迁移文件与内容要点

**新增、不改既有**。当前 prod `_sqlx_migrations` 最大版本 `20261105235700`；仓库已存在但**尚未应用** `20261106000000_tz_unify_timestamp_without_tz.sql`（74 行，属另一项变更）。新文件编号取：

1. `database/migrations/20261106120000_p0_rls_fail_closed.sql`（本阶段）
   - 事务内 `DO $$ ... $$`：
     - 遍历 `pg_class`：`relrowsecurity` 且存在 `tenant_id`/`tenant_uid` 列，且**存在引用 `current_setting` 的策略**，且表不在排除清单（`public.core_menus`、`public.core_menu_groups`、`public.core_sessions`、`public.core_refresh_tokens`、`public.core_tenants`）→ `DROP POLICY` 全部旧策略 → `CREATE POLICY rls_tenant_isolation ... FOR ALL USING/WITH CHECK(<canonical>)`。
     - 检测租户列名（`tenant_id` 优先，否则 `tenant_uid`）；两列都没有的表跳过（E 类保持 allow_all）。
     - 对 `mes.process_flow_steps` / `pm.documents` / `rs.formulas` 额外 DROP 其 `*_allow_all_*`。
   - 特例：
     - `public.core_menus` / `core_menu_groups`：`DROP POLICY` 全部 → 重建 `rls_tenant_isolation` = `cs=nil OR (cs IS NOT NULL AND (tenant_id = nil OR tenant_id = cs))`。
     - `public.core_tenants`：`DROP POLICY rls_tenant_isolation; CREATE POLICY core_tenants_visible USING (cs=nil OR tenant_id = cs OR (tenant_id IS NULL AND cs IS NOT NULL))`。
     - `public.core_sessions` / `core_refresh_tokens`：`DROP POLICY` 全部 → `CREATE POLICY auth_bootstrap_allow_all FOR ALL USING (true) WITH CHECK (true)`；随后 `ALTER TABLE ... FORCE ROW LEVEL SECURITY`。
   - FORCE：对 `ehs.qa_ehs_*`(5)、`lims.qa_lims_analytes`、`mes.work_orders` 执行 `ALTER TABLE ... FORCE ROW LEVEL SECURITY`。
   - `COMMENT ON POLICY` 标注生成版本，便于与生成器口径对账。
   - 迁移末尾 `DO` 断言：仍存在含 `IS NULL`/`''`/`0001` 分支的策略数必须为 0（除 E 类与 auth 显式 allow_all），否则 `RAISE EXCEPTION` 回滚整个迁移。

2. `database/migrations/20261106120100_p0_rls_class_c_tenant_scope.sql`（**第二阶段，先不提交**）
   - 仅处理 184 张 C 类表：DROP allow_all → 建 canonical 策略。
   - 逐表评审清单随迁移提交（或先只覆盖白名单 schema，再分批）。建议按模块分 3 小批：pm/finance/erp → ehs/wms/lims/mes → mobile/gis/integration/srm/ticket/scm/ai/hrm 等。

**幂等性**：全部使用 `DROP POLICY IF EXISTS` + 重建；`DO` 块只按目录条件命中，重复执行结果一致。整个迁移在 sqlx 事务内，失败自动回滚。

**不改动已有迁移**；不安装 `sqlx` 以外的扩展；不使用 `SECURITY DEFINER`。

### 3.3 `lib/shared-db/src/rls.rs` 生成器对齐

当前生成器（[rls.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/rls.rs#L101-L126)）产出的是旧形态：

```
tenant_id = NULLIF(cs,'')::uuid OR tenant_id IS NULL OR NULLIF(cs,'') = nil
```

即"NULL 行全放行 + 只 ENABLE 不 FORCE"。**它当前无调用方**（`RlsMiddleware::new` 仅在自身文件出现），但仍需改，否则未来一旦被调用会把线上策略改回 fail-open：

1. 谓词改为 §3.1 canonical（去掉 `tenant_id IS NULL`）。
2. 补 `ALTER TABLE ... FORCE ROW LEVEL SECURITY`（现在只 `ENABLE`）。
3. 对无租户列的表不再静默跳过，改为记录日志并列入"全局表登记"（或由独立清单维护）。
4. 函数上方注释写死"策略形态唯一真相源 = `20261106120000_p0_rls_fail_closed.sql`；本函数仅用于测试库/空库初始化，不得在 prod 启动时运行"。
5. 新增 CI 门禁（建议）：`scripts/ci/check-rls-policy-shape.sh` 连 `MIGRATE_URL`，断言 `pg_policy` 中不存在 `current_setting(...) IS NULL` / `= ''` / 硬编码 `0001` 分支（E 类与 auth 例外走白名单），在 `rls-permissions` hook 里追加一步。现有 `check-rls-permissions.cjs` 只校验角色与授权，不校验策略形态。

> 另：`svc/unified-core/src/middleware/tenant_rls.rs` 用会话级 `set_config` + `RESET`，`RESET` 后 `current_setting(..., true)` 为空串。canonical 已用 `NULLIF(...,'')` 兼容，无需改该中间件；但需在迁移测试里覆盖"RESET 后仍 0 行"这一断言。

---

## 4. 回滚预案

### 4.1 备份（执行迁移前，一次完成）

1. **整库自定义格式备份**：`pg_dump -h localhost -p 5432 -U xingzhai -Fc topems_prod -f backups/topems_prod_before_p0_rls_20261106.dump`（现库仅 72 MB，成本可忽略）。
2. **策略快照（回滚主依据）**：用 `pg_get_expr` 导出全部 867 张表的策略定义到 `backups/rls_policies_before_p0_20261106.sql`，格式为可直接执行的：

```sql
-- 生成逻辑（只读）
SELECT format(
  'DROP POLICY IF EXISTS %I ON %I.%I; CREATE POLICY %I ON %I.%I AS %s FOR %s TO PUBLIC USING (%s) WITH CHECK (%s);',
  p.polname, n.nspname, c.relname, p.polname, n.nspname, c.relname,
  CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
  CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
               WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' END,
  coalesce(pg_get_expr(p.polqual, p.polrelid), 'true'),
  coalesce(pg_get_expr(p.polwithcheck, p.polrelid), 'true'))
FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY 1;
```

3. 同时导出 FORCE 状态：`select nspname||'.'||relname, relforcerowsecurity ...`，回滚时据此 `NO FORCE`。

### 4.2 完整回滚脚本

`scripts/db/rollback_p0_rls_20261106.sh`：

1. `psql -v ON_ERROR_STOP=1 -f backups/rls_policies_before_p0_20261106.sql`（恢复全部策略原文）。
2. 按快照中的 FORCE 清单，对本次新 FORCE 的 7 张表执行 `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY`。
3. 删除 `_sqlx_migrations` 中 `20261106120000` 记录（或保留记录 + 手工回滚，二者择一，见 §7-D）。

> 因为迁移是 DDL 且幂等，回滚只需重放快照；不需要恢复整库，整库备份仅作最后兜底。

### 4.3 触发回滚的判定条件（任一命中即回滚）

- 登录成功率 5 分钟内下降 > 1%，或 `/api/core/iam/auth/login` 5xx 连续出现。
- refresh / logout 出现 401/404 比例 > 基线。
- 任一核心列表接口（mes orders、crm dashboard、pm projects、master-data disaster/quality、mobile offline sync）从"有数据"变为 0 行且 SQL 显式谓词无异常。
- 审计写入（`public.audit_logs`、各模块 audit）出现失败或行数断崖。
- 数据库出现 `lock timeout` / `deadlock detected` / 连接池超时（日志 `pool timed out`）。
- 5xx 比例 > 基线 ×3 且持续 5 分钟。

---

## 5. 执行顺序与验证

### 5.1 阶段划分

| 阶段 | 内容 | 环境 |
|---|---|---|
| P0-1 预检 | 确认 `20261106000000` 是否先应用；在 test 库演练 | `topems_test` |
| P0-2 回滚物 | 整库 dump + 策略快照 + FORCE 状态快照 | prod（只读） |
| P0-3 切换 | 仅应用 `20261106120000`（A/B + 7 张 FORCE + 特例） | prod |
| P0-4 观察 | 15 分钟指标 + 三身份业务验证 | prod |
| P0-5 第二阶段 | C 类 184 张表，另行评审、另行窗口 | prod |

### 5.2 test 库验证（先跑通再上 prod）

`topems_test` 与 prod 策略数一致（1066 条 / 867 张 RLS 表），可直接演练：

1. `cargo sqlx migrate run --database-url $TEST_URL`（含 `20261106000000` 的顺序问题先在 test 验证）。
2. SQL 三身份断言：
   - `BEGIN; SET LOCAL app.tenant_id='000...001'; SELECT count(*) FROM mes.production_orders; ROLLBACK;` → 只 0001 行。
   - 换成 `...002` → 只 0002 行。
   - **不设 GUC** → 全表 0 行（fail-closed 证明）。
   - `SET LOCAL app.tenant_id='000...000'` → 全量（超管分支）。
   - 对 `core_menus`：普通租户仍见 `tenant_id=nil` 的全局菜单行。
   - 对 `core_sessions`：不设 GUC 仍可查到（auth 例外生效）。
3. 跑现有测试：`cargo test -p topems-shared-auth --test rls_middleware_e2e`、`cargo test -p topems-crm rls`、关键模块 e2e（`tests/e2e/tests/production-order.spec.ts`）。
4. 在 test 库起一个 8098 实例（`DATABASE_URL` 指向 test、`SERVER_PORT=8098`），跑登录 + 三身份关键页面，作为 prod 前的功能门禁。

### 5.3 上 prod 前后验证点

**前**：`/health=200`；记录基线（登录成功率、5xx、`pg_stat_activity` 连接数、各核心列表行数）。

**后（10 分钟内逐项）**：

1. 登录 / refresh / logout（租户1、租户2、超管）。
2. 三身份列表对照：mes orders、crm dashboard、pm projects、analytics reports-center、master-data disaster 恢复点 + quality 建议、mobile offline sync。
3. 写路径：master-data disaster 创建（验证 INSERT 落库租户）、quality 建议 approve（验证跨租户 404）、mobile offline sync。
4. 系统表：审计写入（登录产生 login-log）、`public.core_menus` 菜单加载、`iam.roles/permissions` 读取、`master_data.core_dict_types` 列表（已知创建 500，仅验证读取不回归）。
5. SQL 直查：不设 GUC 连 prod → 对 A 类表必须 0 行；nil → 全量。
6. 日志：`logs/server.err` 无 `数据库操作失败` 峰值；`pg_stat_activity` 无长时间 waited 会话。

### 5.4 不可用窗口

- 策略变更纯 DDL，**不需要重启服务**。72 MB 库、621 张表 × (DROP/CREATE/FORCE)，预计 **10–60 秒**内完成；期间相关表持有短暂的 `ACCESS EXCLUSIVE` 锁，可能出现秒级接口排队。
- 若遇长事务持锁，等待可能拉长；因此选择低峰窗口，并在迁移前 `select pid, state, query from pg_stat_activity where state<>'idle'` 确认无长事务。
- C 类第二阶段另算一个窗口（184 张表，预计同为分钟级）。

---

## 6. 风险点

### 6.1 已改完但仍可能失败的路径

1. **auth 引导路径**：`core_sessions` / `core_refresh_tokens` 非 FORCE、无 GUC。已在迁移中保留显式 allow_all + FORCE，行为不变；但"allow_all"本身是登记在案的例外。
2. **无 GUC 的后台/脚本连接**：任何不经过 `tenant_middleware` / `tenant_rls_middleware` 的 DB 访问，收紧后对 A/B/C 表从"全量"变"0 行"。已确认 `svc/server` 内只有 1 处 `tokio::spawn`（ai_real_module 的占位任务），风险较低；但 `scripts/*.sh`、`psql` 诊断、`pg_dump`（以 `xingzhai` 超级用户运行，不受影响）需在运维手册里明确"查业务数据前先 `SET app.tenant_id`"。
3. **pool 直查未带租户谓词的漏网点**：B1–B4 只保证了"原本用 GUC 的语句"已改造；从未带任何租户谓词的 pool 读（例如按 id/编码直查）在 fail-closed 下会静默 0 行。**这类点无法静态穷举**，只能靠 §5.3 的三身份回归 + 日志发现。建议在 P0-4 观察期临时把 "查询返回 0 行但请求 200" 的关键接口加入日志采样。
4. **`tenant_id IS NULL` 的 47 行**：普通租户将看不到（超管可见）。其中 `public.core_tenants` 的 1 行是默认租户注册行，已单独放行；其余 46 行建议后续回填。
5. **`public.core_menus` / `core_menu_groups` 双策略**：若只改一条会留下全局行暴露，迁移必须同时处理（§3.2 已列）。
6. **E 类 62 张无租户列表**：fail-closed 无法覆盖，属结构性暴露（含 `iam.roles`、`iam.permissions`、各 `audit_logs`、`doc.*`、`storage.files`、`master_data.core_dict_types`）。本轮只登记，不改结构；若要真正隔离需后续加 `tenant_id` 列并回填。
7. **C 类 184 张表在 P0-3 后仍是 allow_all**：即"fail-closed"只覆盖 A/B。必须在对外表述上说清楚，避免误认为全库已收紧。

### 6.2 连接压力（`DB_MAX_CONNECTIONS=8`）

- 实测 `pg_stat_activity`：`topems_prod` 连接 **8 idle + 1 active**，`max_connections=100` → 连接池长期打满到上限。
- `tenant_middleware` 每个请求 `pool.begin()` 独占 1 条连接并持有到响应结束；`state.pool` 上的直查再借第 2 条。8 条池上限意味着 **约 4–8 个并发请求即可排队**。
- 结论：**P0 本身不新增连接，但会放大"等连接"造成的尾延迟**（收紧后 0 行/重试会更慢）。
- 建议（独立配置变更，不混入本迁移）：`DB_MAX_CONNECTIONS 8 → 16`，依据：max_connections=100、实测池已饱和、每请求最多 2 条连接。若不想动配置，则必须在 P0-4 监控 `pool timed out` 与 `pg_stat_activity` 等待事件；超过 5% 再调。

### 6.3 顺序依赖

- 仓库有**未应用**迁移 `20261106000000_tz_unify_timestamp_without_tz.sql`。若用 `sqlx migrate run` 上 P0，会连带应用它（不属于本方案范围）。两个选项见 §7-D。

---

## 7. 待确认决策（请拍板后我再执行）

| # | 决策 | 建议 |
|---|---|---|
| A | P0-3 范围 | **只做 A/B + 7 张 FORCE + 特例**；C 类 184 张表拆第二阶段（否则一次改动面过大、无法归因） |
| B | auth 两表 | **保留显式 allow_all + FORCE**（不改登录链路代码）；接受其为登记例外 |
| C | `public.core_tenants` NULL 行 | 迁移里放行（`cs IS NOT NULL AND tenant_id IS NULL`）+ 后续回填，或现在就回填 0001 |
| D | 未应用的 `20261106000000` | 建议**先在 test 验证并单独应用**，再上 P0；两件事不混在同一窗口 |
| E | `DB_MAX_CONNECTIONS` | 建议同步调到 16（另行提交配置），或先保持 8 并监控 |
| F | E 类 62 张全局表 | 本轮**只登记不改结构**；是否为它们补 `tenant_id` 列另立项 |

> 确认前不会对 `topems_prod` 执行任何 DDL；本文件与配套清单只是只读盘点产物。

---

## 8. test 库演练结果（2026-11-06，`topems_p0_rehearsal`）

演练库由 `pg_dump -Fc`（4.1 MB）+ `pg_restore --no-owner --no-privileges` 从 prod 克隆，基线为 prod 实测值。

### 8.1 计数对账

| 指标 | P0 前 | P0 后 |
|---|---|---|
| 策略数 | 1066 | **867** |
| 启用 RLS 的表 | 867 | 867 |
| FORCE RLS 的表 | 858 | **867** |
| 含"未设即豁免 / 硬编码 0001"的策略 | 808 | **0** |

改写表数：`NOTICE: P0 fail-closed: 617 tenant tables rewritten`（617 = A 类 618 中的 1 张无 GUC 策略表 + B 类 3 张 + 特例，逐表口径见清单）。

### 8.2 NULL 租户行清理

实际 **55 行 / 10 张表**（方案 §1 早前写的 47 行为统计口径错误，已更正）：

- `finance.core_finance_currencies` 8 行与租户 0001 同名 `code` 完全重复 → 先 `DELETE 8`；
- 其余 47 行（`public.audit_logs` 26、`wms.warehouses` 6、`ai.ai_models` 4、`mobile.offline_sync_records` 3、`ai.ai_prompt_templates` 3、`scm.suppliers` 2、`mobile.sync_policies` 1、`mobile.mobile_users` 1、`public.core_tenants` 1）→ 回填 `00000000-0000-0000-0000-000000000001`；
- 清理后全库 `tenant_id IS NULL` 计数为 **0**。

### 8.3 三身份 SQL 验证（`SET ROLE topems_prod`）

| 场景 | `mes.production_orders` | `core_menus` | `core_sessions` |
|---|---|---|---|
| GUC = 0001 | 22 | 423 | 1374 |
| GUC = 0002 | 0 | **423**（allow_all 例外生效） | 1374 |
| RESET（未设 GUC） | **0**（fail-closed 成立） | 423 | 1374 |
| GUC = nil | 22 | 423 | 1374 |

补充：未设 GUC 且 SQL 显式 `WHERE tenant_id='…0001'` 仍为 **0 行** —— RLS 在谓词之前过滤，SQL 层显式绑定无法绕过。

### 8.4 回滚资产

- 快照：`scripts/db/p0_rls_snapshot.sh` → `backups/p0_rls/20261106-111628/`（`dump.dump` 4.1 MB、`policies_before.sql`、`table_state.tsv`、`summary.txt`）。
- 回滚：`scripts/db/rollback_p0_rls_20261106.sh <快照目录> <库名>`。
- **重放已实测**：在演练库重放 `policies_before.sql` → 策略 1066 / RLS 867 / FORCE 858，与快照完全一致。

### 8.5 HTTP 级演练（8098 实例，`DATABASE_URL` 指向演练库）

已验证可用：登录（superuser 与非超管 e2e 账号均 200）、`refresh` 200、`logout`（带 refresh_token）200、审计读 `/api/erp/audit-logs` 286 行、菜单/字典读正常。

**已确认的回归（阻塞项）**：

| 接口 | P0 后 | 回滚 fail-open 后 |
|---|---|---|
| `/api/mes/kanban/order-progress` | **0** | 22 |
| `/api/mes/kanban/workstation-status` | **0** | 1 |

根因：这些 handler 直接 `&state.pool` 查询，pool 连接上**没有 `app.tenant_id`**（prod plist 未配 `DEFAULT_TENANT_ID`），fail-closed 谓词判为 NULL → 全拒。静态扫描：`svc/` 中 `&state.pool` / `&self.pool` 直接执行点 **2398 处 / 237 个文件**（其中直接 `fetch_*` 读 248 处）。§6.1-3 中"只有 1 处 tokio::spawn、风险较低"的判断**不成立**，以本节为准。

非回归的既有问题：`record_login_event` 走 pool 写 `public.core_login_logs`，在 fail-open 下同样是 0 增长（88 → 88），属 P0 之前就存在的静默失败，不计入本次回归。

**结论：prod 暂不执行。** 需要先决定 pool 连接租户上下文方案，再重演。候选：

- A. plist 增加 `DEFAULT_TENANT_ID=0001`（`after_connect` 给全部 pool 连接固定 0001）；请求级事务仍可覆盖为真实租户。风险：多租户下 pool 直查会被压到 0001，需评估数据暴露面。
- B. 把 2398 处 pool 直查/直写改到请求事务或显式租户连接（工作量大，可分模块推进）。
- C. 本轮只保留迁移与回滚资产，不收紧策略，待 A/B 完成后再上。

