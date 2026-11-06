# `audit_logs` RLS 收口方案（20261107）

> 状态：**用户已确认（D1–D4）**；Phase 0 代码改造完成，rehearsal（8098 + `topems_p0_rehearsal`）已通过（2026-11-07）。
> **prod 仍未执行任何 DDL**，待窗口建议与验收清单确认后另行执行。
> 关联：`pool-tenant-context-convergence-plan-20261106.md`（ScopedPool 退役 / `Db::scope*` 收敛）。

## 1. 现状与证据

### 1.1 泄漏面（rehearsal 与 prod 结构一致）

| # | 表 | 策略 | USING / WITH CHECK | tenant_id 列 | rehearsal 行数 | prod 行数（只读） |
|---|----|------|--------------------|--------------|----------------|------------------|
| 1 | `bi.audit_logs` | `bi_allow_all_audit_logs` | true / true | 有 | 0 | 0 |
| 2 | `crm.audit_logs` | `crm_allow_all_audit_logs` | true / true | 有 | 21（全 nil UUID） | 13 |
| 3 | `ehs.audit_logs` | `ehs_allow_all_audit_logs` | true / true | 有 | 0 | 0 |
| 4 | `erp.audit_logs` | `erp_allow_all_audit_logs` | true / true | 有 | **302（全 0001）** | 0 |
| 5 | `flow.audit_logs` | `flow_allow_all_audit_logs` | true / true | **无** | 0 | 0 |
| 6 | `gis.audit_logs` | `gis_allow_all_audit_logs` | true / true | **无** | 0 | 0 |
| 7 | `hrm.audit_logs` | `hrm_allow_all_audit_logs` | true / true | 有 | 223（全 nil UUID） | 0 |
| 8 | `iam.audit_logs` | `iam_allow_all_audit_logs` | true / true | **无** | 0 | 0 |
| 9 | `lims.audit_logs` | `lims_allow_all_audit_logs` | true / true | 有 | 0 | 0 |
| 10 | `qms.audit_logs` | `qms_allow_all_audit_logs` | true / true | **无** | 0 | 0 |
| 11 | `scm.audit_logs` | `scm_allow_all_audit_logs` | true / true | 有 | 99（全 nil UUID） | 0 |
| 12 | `srm.audit_logs` | `srm_allow_all_audit_logs` | true / true | 有 | 19（全 nil UUID） | 0 |
| 13 | `wms.audit_logs` | `wms_allow_all_audit_logs` | true / true | 有 | 565（全 nil UUID） | 0 |
| 14 | `shared.audit_logs` | **无策略（未启用 RLS）** | — | **无** | 0 | 0 |

已收口的 4 张（可作模板）：`public.audit_logs`、`mes.audit_logs`、`plugin_mes.audit_logs`、`rs.audit_logs`，
策略均为 `rls_tenant_isolation`：

```
USING / WITH CHECK:
  (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
  OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
```

四张表均为 `relrowsecurity=t`、`relforcerowsecurity=t`，owner=`topems_prod`（应用角色，非 super、无 BYPASSRLS）。

### 1.2 复现的泄漏

- rehearsal：租户 0002 用户读取 `erp.audit_logs` 得 **302 行**（全部属租户 0001）。
- 根因：13 张表 `USING(true)`，RLS 未提供任何租户边界；读端点走裸池，更是连 GUC 都不需要。

### 1.3 两个必须一并处理的结构性问题

1. **5 张表没有 `tenant_id` 列**（flow / gis / iam / qms / shared）。不能直接套租户谓词，需先补列 + 回填。
2. **写入路径全部走裸 `PgPool`**：
   - `AuditLogService::create_audit_log`（`lib/shared-db/src/audit.rs:144`）→ `public.audit_logs`，`fetch_one(&self.pool)`；
   - `SchemaAwareAuditLogService`（`audit.rs:380-470`）→ 各 schema 表，`fetch_one(&self.pool)`；
   - 工厂调用点 9 处：mes(2)、crm、erp、hrm、wms、rd、以及 `AuditLogService` 的 ai / srm / pm / gis / mobile / master / approval / erp-consolidation 等。
   - 裸池连接**没有 GUC**（`current_setting` 为 NULL）时，`WITH CHECK` 两侧均为 NULL → INSERT 被拒。多个调用点以 `if let Err(e) = ... { tracing::warn! }` 吞掉错误，直接后果是**静默丢审计**。
   - `svc/unified-core/src/middleware/audit_log.rs` 的请求审计中间件当前**未挂载**（仓库内无引用），不构成写入面，但实现同样绑定 nil 租户 + 裸池，迁移时可一并修正或删除。

结论：**不能先翻策略再改代码**，否则审计写入会在生产静默失败。顺序必须是「先写作路径可确定落 GUC，再翻策略」。

## 2. 目标谓词

### 2.1 Phase 1（推荐，与既有 4 张表完全一致）

```sql
-- 13 张有 tenant_id 的表
DROP POLICY <schema>_allow_all_audit_logs ON <schema>.audit_logs;
CREATE POLICY rls_tenant_isolation ON <schema>.audit_logs
  FOR ALL
  USING (
    (NULLIF(current_setting('app.tenant_id', true), '')::uuid = '00000000-0000-0000-0000-000000000000'::uuid)
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (同上);

ALTER TABLE <schema>.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE <schema>.audit_logs FORCE ROW LEVEL SECURITY;
```

语义：
- 普通用户（GUC=0002）：只见 `tenant_id=0002` 的行（当前 0 行）。
- 超管 / 系统身份（GUC=nil）：见全部行，等价现状，但只对显式 nil 作用域生效。
- 后台/无租户上下文写入：`tenant_id` 落 nil UUID，用显式 nil 作用域写入，之后对 nil 作用域可读。

### 2.2 Phase 1 的边界（需要确认的决策 D1）

在 2.1 谓词下，**租户管理员看不到系统级 nil 行**（`GUC=0001` 与 `tenant_id=nil` 不匹配）。
若业务要求「租户后台也能看到本租户的系统事件」，需在 `USING` 加 `OR tenant_id IS NULL`；
但这会把系统行暴露给所有租户，等于换一种泄漏。**默认建议不加**，系统行仅超管/系统身份可读。

### 2.3 Phase 2（可选硬化，非本方案执行范围）

- 引入 `app.rls_system` 语义：系统行 = `tenant_id IS NULL AND app.rls_system='on'`，
  超管不再依赖 nil 分支读全量，而是显式 system 作用域；租户行严格 `tenant_id=GUC`。
- 该阶段可消除「nil GUC = 全可见」这一宽口径，但需要改所有读端点，建议单独立项。

## 3. Phase 0：写入/读取路径迁移（翻策略前置条件）

### 3.1 `shared-db` 增加系统作用域

在 `Db` 上补两个小方法（与现有 `scope()/scope_read()` 同构，仅 GUC 取值不同）：

```rust
// 建议签名
pub async fn scope_system(&self) -> Result<ScopedTxn<'_>>      // 写，set app.tenant_id=<nil uuid>, app.rls_system='on'
pub async fn scope_read_system(&self) -> Result<ScopedTxn<'_>> // 读
```

- 行为：事务内 `set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', true)`：
  - `WITH CHECK` 的 nil 分支放行，`tenant_id` 列写 nil；
  - 读回时走同一分支，系统行始终可读。
- **不要**用「未设置 GUC」表示系统身份：PG 下 NULL 不匹配任何分支，是 fail-closed 的，历史数据里“空 GUC 也能写”只是偶然借到带残留设置的连接，不可依赖。

### 3.2 改写审计服务

- `AuditLogService::new(pool)` → `new(db: Db)`；`create_audit_log` 内部：
  - 请求上下文存在（task-local 有租户）→ `scope()`（租户行）；
  - 无上下文（后台/系统任务）→ `scope_system()`（nil 行）。
- `SchemaAwareAuditLogService`：
  - 同上；`ensure_table()` 属于 DDL 自愈路径，保持裸池（DDL 不受行策略约束）。
- 调用点改造清单（9 处工厂 + 公共 sink）：
  - `svc/mes/src/modules/audit.rs:261,303`
  - `svc/crm/src/modules/audit.rs:263`
  - `svc/erp/src/modules/audit.rs:251`、`svc/erp/src/modules/consolidation/common.rs:21,61`
  - `svc/hrm/src/modules/audit.rs:236`
  - `svc/wms/src/modules/audit.rs:260`
  - `svc/rd/src/modules/audit.rs:256`
  - `svc/ai/src/services/audit.rs:22`、`svc/srm/src/services/audit.rs:31`、`svc/pm/src/services/audit.rs:17`、`svc/gis/src/services/audit.rs:37`、`svc/mobile/src/services/audit.rs:23`、`svc/unified-core/src/modules/master/handlers.rs:113`、`lib/shared-db/src/approval.rs:181,229,257`
- 兼容策略：先保留 `new(pool)` 旧签名并标记 `#[deprecated]`（或直接全量改），同一提交内完成，避免半套。

### 3.3 读端点迁移

同一批迁移以下读路径到 `Db::scope_read()`，否则 GUC 不在同一连接上，收口后租户查询仍会误报空集：

- `svc/unified-core/src/modules/system_audit/mod.rs`（列表/详情/导出/统计）
- `svc/unified-core/src/modules/tenant/handlers.rs:2393,2411`、审计聚合 2818-3006
- `svc/<各服务>/src/modules/audit.rs` 的列表/统计端点
- `svc/unified-core/src/routes/business_tools/audit_api.rs`、`audit_export_api.rs`

注：`svc/unified-core/src/middleware/tenant_rls.rs` 仍以“独占连接 + 会话级 GUC”运行，
与该模块裸池查询并不共享连接；本次迁移不改中间件，但所有 RLS 表访问都必须走 `Db::scope*`，
否则会重现 MES 看板空集的问题。

### 3.4 无 `tenant_id` 列的 5 张表

| 表 | 处理 |
|----|------|
| `iam.audit_logs` | 新增 `tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid`（历史行自动回填 nil）+ `CREATE INDEX` |
| `flow.audit_logs` / `gis.audit_logs` / `qms.audit_logs` | 同上（均为 0 行的占位表，回填无风险） |
| `shared.audit_logs` | 新增 `tenant_id` + `ENABLE/FORCE RLS` + 同款策略（当前完全无防护） |

DDL 走正常迁移链，不手写 prod。迁移需配套 `sqlx migrate` 编号递增文件。

## 4. 误伤分析（收紧后会发生什么）

| 路径 | 收紧后行为 | 处置 |
|------|-----------|------|
| 请求内审计写入（有 JWT） | `scope()` 带真实租户 → `WITH CHECK` 通过 | Phase 0 改造 |
| 后台/定时任务审计（无租户） | `scope_system()` → 落 nil → 通过 | Phase 0 改造 |
| 未改造的裸池写入 | **INSERT 报错 → 多处 warn 吞掉 → 静默丢审计** | 必须先完成 3.2，再翻策略 |
| 超管读全量 | nil 作用域 → 仍见全部 | 读端点迁移后保持 |
| 租户管理员读 | 只见本租户；nil 系统行不可见（D1） | 需业务确认 |
| 审计导出 / 统计 | 同上，按作用域过滤 | 3.3 迁移 |
| approval 流程审计 | `lib/shared-db/src/approval.rs` 走公共 sink | 3.2 一并迁移 |

## 5. 执行顺序（每步独立可回滚）

1. **P0-a**：`Db::scope_system/scope_read_system` + 审计服务与写入调用点迁移（不动任何策略）。
2. **P0-b**：审计读端点迁 `scope_read()`；rehearsal 全量回归（登录/看板/列表/审计读）。
3. **P1**：rehearsal 克隆库执行 13 条策略替换 + 5 张表补列/回填/policy（单 schema 单事务）。
4. **P2**：rehearsal 演练（见 §7），通过后出 prod 窗口。
5. **P3**：prod 执行（§8），逐 schema 验收；任一失败即按 §6 回滚。

## 6. 回滚

- 每张表迁移文件成对提供：
  - up：`DROP POLICY <schema>_allow_all_audit_logs` → `CREATE POLICY rls_tenant_isolation ...` → `ENABLE/FORCE`；
  - down：`DROP POLICY rls_tenant_isolation` → 按**原始定义**重建 `<schema>_allow_all_audit_logs`（`FOR ALL USING(true) WITH CHECK(true)`）。
- 补列类 DDL 的 down：`DROP COLUMN tenant_id`（先确认无代码依赖该列）。
- 回滚粒度：按 schema；单 schema 失败只回该 schema，不整批回退。
- 前置快照（执行前一次性）：
  - `\d+ <schema>.audit_logs`、`pg_policies` 全量导出；
  - `pg_dump -Fc` prod 备份（或确认最近一次可用备份）。
- 触发条件：任一 schema 出现审计写入错误率 > 0、或审计读端点 5xx/空集回归不可解释。

## 7. rehearsal 演练计划（只动 `topems_p0_rehearsal`）

1. **写入基线**：以租户 0001 / 0002 / 超管各触发一次审计写入（审批、master 字典），记录行数与 tenant_id。
2. **后台归 nil**：模拟无上下文写入（直接调用改后的 `scope_system()`），确认行 `tenant_id` = nil UUID。
3. **翻转 13 条策略 + 5 张表补列**（按 schema 顺序：bi→crm→ehs→erp→flow→gis→hrm→iam→lims→qms→scm→srm→wms→shared）。
4. **读隔离验收**：
   - 0002 用户：每 schema 审计列表仅本租户（当前期望 0 行）；
   - 0001 用户：仅 0001 行（erp 302，public 26）；
   - 超管：全量可见；
   - 导出/统计与列表口径一致。
5. **写路径验收**：请求内写入（0001/0002）成功且 tenant_id 正确；后台写入成功且为 nil；禁止出现「warn 后静默丢失」。
6. **回归**：登录/refresh/logout 三身份、6 个核心列表基线、MES 两条 kanban（22/1）、`portal/todos` 三身份可见性。
7. **fail-closed 验证**：显式断 GUC（`RESET app.tenant_id`）后裸池 SELECT 必须 0 行、INSERT 必须报错。
8. 演练结果与行数快照写入本文件附录，随第 3 件报告提交。

## 8. prod 应用窗口与验收清单

**窗口**：低峰 30 分钟（应用约 10 分钟，其余为验收/观察）。本轮不执行。

前置检查（只读）：
- [ ] prod 各 `audit_logs` 行数与 §1.1 一致（crm 13，其余 0）；
- [ ] 确认 P0-a/P0-b 已发布到 prod（审计服务与读端点都走 `Db::scope*`）；
- [ ] 备份可用、`pg_policies` 快照已保存；
- [ ] 无长事务/大批导入任务在跑。

执行与验收（逐 schema）：
- [ ] `BEGIN; DROP POLICY ...; CREATE POLICY ...; ENABLE/FORCE; COMMIT;` 单 schema 单事务；
- [ ] 0002 用户读该 schema：0 行（无法看到 0001 行）；
- [ ] 0001 用户读该 schema：仅本租户；
- [ ] 超管读该 schema：与迁移前一致；
- [ ] 触发一次该服务的审计写入：成功、`tenant_id` 正确、列表可见；
- [ ] 后台任务审计：成功、`tenant_id` nil；
- [ ] 无 5xx、无 `[Audit] failed` / `Failed to insert audit` 日志。

回滚判定：上述任一 ❌ 且 5 分钟内无法定位 → 执行该 schema 的 down 迁移。

## 9. 已确认决策

- **D1**：租户管理员**不**可见系统级（`tenant_id = nil`）审计行，避免换一种形式的泄漏。
- **D2**：`shared.audit_logs` 一并收口，不废弃；prod 现有 306 行 nil 数据保留可读（仅系统通道）。
- **D3**：Phase 2 引入独立 `app.rls_system` 语义，已随 `000011` 落地：`WITH CHECK` 只认
  `app.tenant_id = nil AND app.rls_system = 'on'` 这一显式系统通道；由
  `Db::scope_system()/scope_read_system()` 负责设置，不再依赖“未设置 GUC”。
- **D4**：prod 窗口按 §8 建议、用户最终确认后执行；本轮 prod 零 DDL。

## 10. rehearsal 演练结果（2026-11-07）

环境：8098（debug 二进制）+ 克隆库 `topems_p0_rehearsal`，应用角色 `topems_prod`（非 super、无 BYPASSRLS）。

### 10.1 执行顺序与迁移

- 先完成 Phase 0 写入/读路径改造并编译、单测通过，**再**翻策略（未反向）。
- `000010` 补 5 表 `tenant_id`（NOT NULL DEFAULT nil）+ 索引；`000011` 18 张表 Phase 2 谓词。
- 翻转前导出 `pg_policies`（17 条，`/tmp/pg_policies_audit_logs_before_20261107.csv`）。
- 逐 schema 单事务翻转：bi→crm→ehs→erp→flow→gis→hrm→iam→lims→qms→scm→srm→wms→shared→public→mes→plugin_mes→rs，全部成功。

### 10.2 写入路径（翻转后）

| 身份 | `POST /api/core/iam/access-logs` | 落库 `tenant_id` |
|------|----------------------------------|------------------|
| A 超管 | 200 | nil（系统通道） |
| B 租户 0001 | 200 | 0001 |
| C 租户 0002 | 200 | 0002 |

- 请求审计中间件（`action=create`）落 nil + `user_id` 正确；修复 `user_id` 由 text 绑 uuid 的类型错误后，
  日志中 `请求审计写入失败 = 0`。
- SchemaAware 服务写入（CRM customer create）成功落 `crm.audit_logs`，无 `记录审计日志失败`。

### 10.3 隔离矩阵（`SET ROLE topems_prod`；表内为行数）

| 身份 | erp | public | crm | hrm | scm | srm | wms | shared | 其余 schema |
|------|-----|--------|-----|-----|-----|-----|-----|--------|-------------|
| 0001 | 302 | 38 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0002 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nil + `rls_system=on` | 302 | 366 | 23 | 223 | 99 | 19 | 565 | 0 | 0 |

HTTP 口径一致：B `/api/erp/audit-logs` = 302（全部 0001）；C = 0；A（超管）全量。

### 10.4 回归与 fail-closed

- C 登录 / refresh / logout 全部 200。
- 6 个核心列表 + `portal/todos` 全部 200；MES kanban A/B = 22 / 1，C = 0。
- 裸连接 `SET ROLE topems_prod` 无 GUC：erp/public/hrm/wms `SELECT` = 0；
  `INSERT public.audit_logs` 报 `new row violates row-level security policy`。

### 10.5 回滚演练（单 schema）

以 `srm` 为例：执行 down（重建 `srm_allow_all_audit_logs`）后，租户 0002 读到 19 行（原 nil 行）；
再执行 up（恢复 `rls_tenant_isolation`）后，租户 0002 回到 0、系统通道仍 19。
证明按 schema 回滚/重放有效，失败可只回单个 schema。

### 10.6 残留行为（需业务知悉）

- 服务层审计多数在 `tokio::spawn` 中写入，脱离请求 task-local，按设计走 `scope_system()` → `tenant_id = nil`
  （与改造前落 nil 一致）。D1 下租户管理员不可见这类行。
- 若业务要求“本租户业务审计对本租户管理员可见”，需在后续把请求租户显式传入各服务审计 sink（独立跟进项，不在本轮）。
- `shared.audit_logs` 在 rehearsal 为 0 行；prod 306 行 nil 数据在 Phase 2 下仅系统通道可读。
