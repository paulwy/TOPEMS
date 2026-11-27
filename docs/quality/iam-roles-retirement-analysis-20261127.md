# `iam.roles` 退役决策深化分析（2026-11-27，只读核查）

> 只读分析：未改库、未改代码、未投放迁移。目标是为旧空壳表 `iam.roles` 的「保留 / 退役」提供当前态影响面依据与分阶段路径，供拍板。
> 数据来源：prod `topems_prod` 与本机 `topems` 直连只读（information_schema / pg_constraint / pg_depend / pg_policy / pg_index），全仓源码与 SQL 静态扫描。基线提交 `228ae01e3`。

## 1. 结论摘要

**推荐：退役（DROP），但排在 `20261127210000` 投放之后，作为独立破坏性批次；当前不立即 DROP。**

- 旧表在运行期鉴权链路中**零消费**：授权聚合只走 `core_user_roles → core_role_permissions → core_permissions`，从不 join `iam.roles`；后端 Rust / 前端 / shared-auth / `.sqlx` 对旧表零 SQL 读写；DB 视图 / 函数 / 过程 / 触发器依赖为 0。
- 11/19 早期「依赖不封闭、保留」的两条 FK 理由已基本解除：`users_role_id_fkey` 已随 `20261126170000` 在 prod 删除；仅剩 `position_roles_role_id_fkey`，随 `20261127210000` DROP `position_roles` 一并解除。**210000 落地后，旧表将零 FK 依附。**
- 当前不能直接 DROP：prod 上 `position_roles_role_id_fkey` 仍指向 `iam.roles(id)`，无 CASCADE 的 DROP 会被外键约束阻断；必须先投放 210000 清掉引用方。
- 退役收益有限但方向正确：消除双轨角色字典与已过时种子（种子仍写已被删除的 `users.role_id` 列），收敛 schema 认知负担；风险可控，前置备份 + 配套 rollback 即可闭环。

## 2. 现状快照（prod `topems_prod` 实测，2026-11-27 晚）

### 2.1 表与数据

| 项 | 值 |
|---|---|
| 行数 | **4**（均 `is_system=t`、`status=active`） |
| 列 | `id` uuid PK、`code` varchar、`name` varchar、`description` text、`permissions` jsonb、`is_system` boolean、`created_by` uuid、`updated_by` uuid、`status` varchar、`created_at`/`updated_at` timestamptz、`deleted_at` timestamptz |
| 依附 FK | 仅 `iam.position_roles / position_roles_role_id_fkey`（→ `iam.roles(id)`，ON DELETE CASCADE） |
| RLS 策略 | `rls_global_read`（SELECT true）、`rls_system_write`（ALL，仅系统通道） |
| 索引 | `roles_pkey`、`roles_code_key`(unique)、`idx_roles_status` |
| 触发器 | 无 |
| 视图/物化视图/函数/过程/触发器依赖 | **0**（pg_depend 复核为空） |

### 2.2 四行内容

| id（3333…） | code | 名称 | `permissions` jsonb 条数 | 是否在现行 `core_roles` 目录 |
|---|---|---|---:|:--:|
| …001 | `super_admin` | 超级管理员 | 1（`["*"]`） | 否 |
| …002 | `dept_manager` | 部门经理 | 8 | 否 |
| …003 | `employee` | 普通员工 | 6 | 否 |
| …004 | `tenant_admin` | 租户管理员 | 1050 | **是**（唯一重叠） |

现行权威目录 `core_roles`（prod 16 活角色）：`admin`、`tenant_admin`、`crm/ehs/erp/finance/hrm/lims/mes/pdm/pm/qms/report/scm/srm/wms_manager`。旧表 4 码仅 `tenant_admin` 与现行目录重叠，其余 3 个为旧体系角色名，现行目录无对应。旧表不承载现行授权目录信息。

### 2.3 本机对照

本机 `topems`：0 行；仍遗留两条依附 FK（`users_role_id_fkey`、`position_roles_role_id_fkey`），因本机账本滞后（max `20261124150000`），未跑 `170000`/`210000`。退役迁移需 `to_regclass` / `IF EXISTS` 幂等守卫，兼容「有/无依附 FK」两种形态。

## 3. 依赖面核查（全仓静态扫描，基线 `228ae01e3`）

### 3.1 运行期代码

| 层 | 结论 |
|---|---|
| 后端 Rust（`svc/`、`lib/`） | 无业务 SQL 读写 `iam.roles`。`/iam/roles` HTTP 路由（`unified-core/iam/role.rs`）全部读写 `public.core_roles` / `core_role_permissions` / `core_user_roles`。唯一字面量命中 `lib/tests/rls.rs:305` 是 RLS 拼接测试的假定表名数组（`iam_roles` 下划线写法，不连库），非运行期引用。 |
| 前端（`apps/web/src`） | 角色目录来自后端签发 claims 与回显接口；无直连旧表的 SQL/常量。`api/unified-core/iam.ts`、`SystemManagementPage.tsx` 调 `/iam/roles` 路由，绑 `core_roles`。 |
| shared-auth / `.sqlx` | 零引用旧表。 |
| DB 函数/视图/触发器 | 零依赖（pg_depend 复核为空）。 |

### 3.2 现存写入点：种子 `database/seeds/default_roles.sql`

唯一现存写入链路，经 `scripts/deploy-prod.sh` RESET 流程（258–270）与 `SEED_ROLES=true` 单独分支（290–295）灌入：

- 3 个 `INSERT ... ON CONFLICT (code) DO UPDATE`（`super_admin`/`dept_manager`/`employee`）。
- **已过时片段**：第 75–78 行 `UPDATE iam.users SET role_id = … WHERE username='admin'`，写的是已被 `170000` 删除的旧 `role_id` 列；在已清理库上重跑该种子会因列不存在报错（无守卫）。
- 82–109 行 DO 块读旧表 `permissions` jsonb 做权限码存在性校验；112–119 行验证 SELECT 读旧表。
- prod 第 4 行 `tenant_admin`（…004）**不在本种子内**，属更早历史快照导入残留；种子与现行库已部分漂移。

### 3.3 不可变回放链（不改动）

历史已记账迁移对旧表的操作属账本回放链，退役时不修改：

- `20261108091000`：`UPDATE iam.roles` 修 employee 权限码（含 `to_regclass` 守卫）。
- `20261119161000`：旧表 RLS 策略守卫/加固（`rls_global_read`/`rls_system_write`）。
- `20261015000081`：策略改名 `tenant_isolation_roles`。
- `20260716000000` / `20260716000001`：初建表与 `role_id` FK。
- `20261127210000` 配套 rollback：回滚重建 `position_roles` 时对误指 `iam.roles` 的 FK 加存在性守卫。

### 3.4 init DDL

`database/init/06_iam_schema.sql` 仍含旧表全段：建表（1355）、`users_role_id_fkey` FK（2728）、`idx_roles_status`、策略、RLS ENABLE。新库由 init 重建，退役时需同步删除该全段。

## 4. 与 11/19 早期定性的变化

`docs/database/zero-path-tables-disposition-2026-11-19.md` 当时结论为「依赖不封闭，移出删除候选、保留」，依据是两条入向外键：

| 依附链 | 11/19 状态 | 当前态（2026-11-27 晚） |
|---|---|---|
| `iam.users.role_id → iam.roles(id)` | 存在 | **已解除**：`170000` 已在 prod 删除 `users.role_id` 列与 `users_role_id_fkey`（prod 三列复核为空） |
| `iam.position_roles.role_id → iam.roles(id)` | 存在 | **待解除**：随 `210000` DROP `position_roles` 一并删除；prod 两表当前仍在 |

即早期保留理由在 210000 落地后将不复存在；旧表届时为零 FK 依附的孤立遗留表。

## 5. 现行授权链路对照（为何旧表不被消费）

- **超管**：`is_superuser` 布尔独立兜底全量放行，不依赖任何角色表。
- **普通用户**：`core_user_roles → core_role_permissions → core_permissions.code` 关联表实时聚合；令牌 `permissions` 集由此写入 Claims。
- 旧表 `permissions` jsonb 是早期扁平码快照，`tenant_admin` 行 1050 码未进入任何用户令牌集；后端守卫比对令牌权限集，从不回查旧表。
- 旧表 4 行 `code/name` 也不作为角色目录展示来源（前端角色标签由 `useRole` 基于 `is_superuser`/`roles` 数组本地化产出）。

### 5.1 初始化依赖核查（#74，2026-11-27）

**问题**：摘除 `default_roles.sql` 后，新库初始化是否还需要这 3 个旧体系角色占位（`super_admin`/`dept_manager`/`employee`）？

- **现行目录落库链路**：`core_roles` 角色由迁移链 replay 自洽落库——`20261024000014` 兜底 `admin`、`20261023000002` 落 `*_manager` 系列、`20260724000004` 模块权限种子；不经过 `default_roles.sql`。摘除旧表种子不影响新库角色目录初始化。
- **旧 3 code 的源码引用**：生产鉴权代码无按这 3 个 code 比对的 `has_role` 分支；Rust/前端命中的 `"employee"` 均为实体→模块归属映射（HRM 员工、凭证辅助核算类型、federation 实体映射），与角色码无关。`super_admin` 仅出现在：① 各服务测试 Claims 夹具（内存字符串标签，不查库）；② `svc/ai/src/dsh/mcp/security.rs:132` 一处 `has_role("super_admin")` 字符串比对——现行登录签发改从 core 链路解析角色名（`admin`/`tenant_admin`/`*_manager`），不会产出 `super_admin`，该分支恒不命中，属待甄别死分支，归 L7/L8 批次处置，与旧表退役解耦。
- **结论**：旧 3 行占位无功能承载，可随退役一并移除；新库角色目录由迁移链独立承担。种子文件在退役批次可整文件摘除，无需另补 core_roles 种子。

## 6. 退役收益 vs 风险成本

### 6.1 收益

- 消除双轨角色字典（旧 jsonb 扁平码 vs 现行关联表范式），避免后续误读、误挂旧表。
- 摘除已过时的种子片段（写已删 `role_id` 列）与 init/06 旧段，收敛新库结构。
- 去掉 2 条 RLS 策略、3 个索引与 1 张空壳表的维护面；schema 目录不再列无消费对象。

### 6.2 风险与成本

- **破坏性 DROP TABLE**：需独立 replay 窗口 + 票据 + 配套 rollback；门禁要求无 CASCADE、每条 DROP 独立 destructive 标记、`rows-at-review=4`。
- **前置硬依赖**：必须先投放 `210000` 解除 `position_roles_role_id_fkey`，否则 DROP 被外键阻断。
- **种子/部署链路改造**：退役 `default_roles.sql` 对旧表的 INSERT/UPDATE/校验，或整文件从 RESET/SEED_ROLES 分支摘除；#74 已核实现行 `core_roles` 角色目录由迁移链自洽落库（见 §5.1 初始化依赖核查），摘除该种子不影响新库角色初始化。
- **离线读取复核（#73 静态面已闭环）**：全仓后端 Rust / 前端 / 导出报表 / BI / 脚本扫描，对旧表 `permissions` jsonb 零业务读取；唯一 jsonb 展开点是不可变历史迁移 `20261108091000` 与种子校验 DO 块。残留命中均为 CI/运维 RLS 治理断言（`check-rls-permissions.cjs`、`verify-rls.sh`、两则 ops RLS SQL），不导出业务数据。**仍需人工确认的边界**：仓库之外的外部 BI/报表库、定时导出、人工 ad-hoc 查询、第三方直连 DSN——静态扫描看不到，DROP 前应由运维在 DB 侧用 `pg_stat_statements` / 连接日志 / 外部 DSN 清单复核。
- **历史快照价值**：4 行 jsonb 权限码为旧体系残留，现行目录已独立承载授权；退役前仍应全量快照备份（含 jsonb），仅作回溯留档，不重新灌回。

### 6.3 保留方案的成本（对照）

若保留：旧表继续作为 4 行无消费占位存在；过时种子在 RESET 时仍尝试写已删列（漂移风险）；init/06 继续在新库建一张无人使用的表；schema 认知负担与双轨歧义长期留存。保留不产生功能收益，仅推迟破坏性操作。

## 7. 前置条件与退役批次清单（拍板后执行）

1. **前置依赖**：确认 `20261127210000` 已在 prod replay 投放，`iam.position_roles` / `iam.position_permissions` 已 DROP，旧表零 FK 依附。
2. **备份**：导出旧表 4 行全量快照（含 `permissions` jsonb）至 `backups/`（gitignore，不入库）；记录 code/id/权限码清单。
3. **迁移**：新增前向迁移 DROP `iam.roles`——无 CASCADE、`to_regclass('iam.roles')` 守卫 + `IF EXISTS`、末尾断言表不存在；destructive 标记 `kind=DROP TABLE`、`owner=iam`、票据、`expires`、`rows-at-review=4`、backup 指向快照。
4. **配套 rollback**：按 pg_dump 原样重建空骨架（列/唯一约束/索引/RLS/策略/条件授权），重灌备份 4 行；依附 FK 在 210000 后已无引用，rollback 不再重建指向旧表的业务 FK。
5. **种子退役**：改造或摘除 `default_roles.sql` 对旧表的 INSERT/UPDATE/DO 校验；同步 `deploy-prod.sh` RESET/SEED_ROLES 分支引用；核对无其他脚本/文档链路残留。
6. **init DDL**：删 `init/06_iam_schema.sql` 旧表全段（建表/约束/索引/FK/策略/RLS）。
7. **复核**：仓库内前端/后端/脚本 grep 零残留（#73 静态已闭环）；外部 BI/报表/定时导出/第三方直连由运维在 DB 侧复核；manifest `pending_forward_patches` 登记 `to_apply`、checksums 入账；destructive / schema-defense / directed / ledger-ddrift / validate 门禁全绿。
8. **投放**：走唯一入口 `apply-forward.sh --prod --allow-destructive=<version>`，票据匹配；不使用 `sqlx migrate run`。

## 8. 关键未决（退役前需确认）

- **外部消费者（唯一残留人工项）**：仓库内源码/视图/脚本已核零业务读取（#73）；DROP 前仍需运维/业务侧在 DB 侧复核仓库之外是否有外部 BI/报表库、定时导出、人工 ad-hoc 查询或第三方直连 DSN 读取 `iam.roles`（`pg_stat_statements` / 连接日志 / 外部 DSN 清单）。静态扫描无法覆盖这部分。
- **旧角色占位（#74 已闭环）**：现行 `core_roles` 目录由迁移链自洽落库，旧 3 code 无生产鉴权分支引用；摘除 `default_roles.sql` 不影响新库初始化，种子可整文件退役。
- 退役批次与 210000 的窗口关系：建议分两次 replay，不合并为一个破坏性迁移，便于回滚定位。

## 9. 附：相关既有记录

- L6 岗位模板表深挖：`docs/quality/l6-position-role-fk-analysis-20261127.md`
- 零路径表早期处置：`docs/database/zero-path-tables-disposition-2026-11-19.md`
- 台账：`docs/database/role-ownership.md`（#65 旧表普查、#69 退役建议、#71 账本基线）
