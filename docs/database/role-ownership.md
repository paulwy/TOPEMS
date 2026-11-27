# 数据库角色与对象属主治理（本机落地记录）

> 版本：2026-11-25 · 适用范围：本地 Homebrew PostgreSQL（`127.0.0.1:5432/topems`）

## 1. 结论

采用**方案 B**：DDL 归一个专用 owner 角色，应用角色只持有 DML。本机已落地并验证：非系统 schema 下 **对象属主 0 漂移**，应用查询/DML 正常。

`SET ROLE`（方案 A）只作为临时排障手段，不写进运行路径——它会把 DDL 权限长期挂在运行时连接上，且审计身份与业务身份混同。

## 2. 两个容易混淆的概念

| 概念 | 含义 | 本机对应 |
| --- | --- | --- |
| **数据库角色（role）** | 登录身份 + 权限集合（LOGIN/SUPERUSER/CREATEROLE 等） | `topems_app`（应用）、`topems_owner`（迁移/DDL）、`topems`（历史遗留，带 CREATEROLE）、`air`（本机超级用户） |
| **对象属主（owner）** | 表/序列/函数的 `relowner/proowner`，决定谁能 ALTER、谁被 `must be owner of table` 拦住 | 全部非系统对象统一为 `topems_owner` |

「以 topems_prod 身份跑」本质是**用别人的属主身份建对象**：谁执行 CREATE，新对象就归谁。这也是历史上 1335 个对象属于 `topems_app`、13 个属于 `topems_prod` 的成因（20261108131000 把 `svc_role` 在本机解析成了 `topems_prod`）。

属主收敛后，`topems_app` 已不再具备建表能力（owner 变更时 schema 上的 CREATE 随之失效），只有下文第 5 节的 5 个 schema 例外。

## 3. 角色与授权现状

- `topems_owner`：`LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`，仅用于迁移；密码在 `.env` 的 `MIGRATE_URL`（不入库、不进仓库）。
- `topems_app`：运行时角色，持有各 schema `USAGE` + 全表 `SELECT/INSERT/UPDATE/DELETE` + 序列 `USAGE/SELECT` + 函数 `EXECUTE`。
- `ALTER DEFAULT PRIVILEGES FOR ROLE topems_owner`：未来由 owner 创建的对象自动向 `topems_app` 授权，避免每次迁移后补授权。
- RLS：`FORCE RLS` 已开启（`relrowsecurity` 与 `relforcerowsecurity` 均为 true），应用即使换身份也不会绕过租户隔离。

## 4. 迁移账本现状（未收敛）

| 指标 | 数值 |
| --- | --- |
| 迁移文件 | 883 |
| `_sqlx_migrations` 已记账 | 699（max version `20261115141100`） |
| 待跑（pending） | 184 |

不能直接 `sqlx migrate run` 的原因（均已在库内验证）：

1. 108 条已记账版本的 checksum 与文件 sha384 不一致（多数为字符串 `manual`，说明历史上用 psql 手工记账）。已按「以文件为唯一权威」归一。
2. 存在「已记账版本号大于部分 pending 版本号」的无序状态，`sqlx` 会拒绝执行。
3. 部分 pending 迁移的守卫断言在**当前 schema**下必然失败，属于真实 schema 缺口，不是幂等问题。例如：
   - `20261103210000`：`mes.core_emails does not exist`（该表已被后续 family 迁移搬走）；
   - `20261117180000_unified_core_rls_strict`：`public.core_flow_rules 缺少 tenant_id 列`。

已手工用 owner 角色补齐的两条（此前阻塞登录页三连 500）：

- `20261122090000_core_user_company_scopes_is_default.sql`
- `20261121235930_w5c_hrm_init_status_drop_organization_id.sql`

**未做的事**：141 条「版本 > 20261115141100」的批量补跑，在遇到真实 schema 缺口后停止，账本仍为 699 行——没有把「守卫报已存在」的迁移批量 adopt，避免把未执行的迁移记为已执行。

## 5. 例外：运行期自愈建表的 schema 保留 CREATE

以下代码路径在请求链路里执行 `CREATE TABLE IF NOT EXISTS`，即使表已存在**也要求 schema 的 CREATE 权限**（实测 `permission denied for schema`）：

- `svc/erp/src/modules/{holidays,vehicles}.rs`、`svc/erp/src/modules/consolidation/*`
- `svc/finance/src/modules/forecast_v53.rs`
- `svc/master-data/src/modules/schema_registry.rs`
- `svc/unified-core/src/modules/tenant/handlers.rs`（`hrm.companies`）
- `lib/shared-db/src/{schema,audit}.rs`

因此对 `public, erp, finance, master_data, hrm` 保留 `GRANT CREATE ... TO topems_app`，其余 schema（`wms/mes/iam/core/shared/...`）收回。

代价：这 5 个 schema 里运行期新建的对象会归 `topems_app`，形成局部漂移——由 `scripts/db/owner-sweep.sh` 定期收敛回 `topems_owner`。要彻底消除，需要把这些自愈逻辑改成迁移或启动期由 owner 执行（未做，属于后续代码改造）。

## 6. 操作手册

```bash
# 0) 备份（custom 格式，--no-owner）
pg_dump -Fc --no-owner -d topems -f database/backup/topems_$(date +%Y%m%d_%H%M%S).dump

# 1) 属主收敛 + 授权 + 0 漂移断言（幂等，可重复跑）
./scripts/db/owner-sweep.sh

# 2) 迁移（使用 MIGRATE_URL = topems_owner）
./scripts/topems.sh db migrate
```

巡检（手工）：

```sql
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname !~ '^pg_' and n.nspname<>'information_schema'
   and c.relkind in ('r','p','v','m','S','f')
   and pg_get_userbyid(c.relowner)<>'topems_owner';
```

> 注意：过滤系统 schema 用 `nspname !~ '^pg_'`，`LIKE 'pg\_%'` 会连 `pg_temp_*` 一起排除，造成「漂移」误报。

## 7. 验收记录（2026-11-25）

- 属主：relations 漂移 0、functions 漂移 0（`information_schema._pg_*` 属系统视图，忽略）。
- 应用直连查询：`iam.users` 30 行、`core_tenant_users` 5 行、`hrm.companies` 5 行，均正常。
- 接口巡检（带 `X-Tenant-Id: 00000000-0000-0000-0000-000000000001`）：menus / unread-count / hrm setup progress / wms 仓库·入库·出库 / tms shipments / oa 会议·车辆 / hrm 员工 / crm 客户 / erp 车辆 → 200。
- 登录：`admin / Topems@2026` 通过；`admin123` 401。
- 备份：`database/backup/topems_pre_owner_20261125_123706.dump`（20MB，`pg_restore --list` 校验可读）。

## 8. 未决与风险

1. `checksum 归一` 等于承认「迁移文件是唯一权威」，可能掩盖历史文件被改过的语义差异——该口径需团队确认后再进 CI。
2. 108 条手工记账版本的 `execution_time` 为空/0，`sqlx` 统计会失真，但不影响执行。
3. `topems_owner` 目前保留 LOGIN；若改为 `NOLOGIN` + 由 `topems` `SET ROLE`，需同步改 `.env` 与 `scripts/migrate.sh`。
4. ~~`GET /api/finance/vouchers` 仍 500~~ **复测未复现（2026-11-26）**：前端带会话两次请求 `/api/finance/vouchers?page=1&page_size=10` 与 `?page_size=999` 均 200，凭证页正常渲染 1 条过账凭证；本机 `logs/server.err` 无 ERROR/panic。历史 `unnamed prepared statement does not exist`（疑连接池复用失效连接 / 预编译语句缓存）在 11-26 服务多次重启后未再触发。连接池/缓存配置未做根治性调整，列为观察项：若再现需抓服务端 ERROR 堆栈与连接池空闲超时/复用日志定位。
5. 历史中间缺口迁移分级（版本 ≤ 20261115141100 但未记账）：**已分级落表**。① 首批 43 条（2026-11-25 dry-run 定性）落 `database/migrations-archive.tsv`：11 `archived`（dep-moved / policy-conflict / rls-seed-conflict / data-precondition / enum-converged / fk-precondition / perm-revoked）、32 `replayable-not-applied`（legacy-hole，幂等通过未执行）。② 2026-11-26 复核补齐 12 条本机/prod 双未记候选（逐文件事务内 ROLLBACK dry-run）：3 条 PASS 归常规待办（留待缺列库执行，不进表）；8 条 family 数据搬迁因源散表/先序隔离表不存在，补入归档表 `archived/dep-moved`；1 条约束扩容（`20261114100000`）因本库约束已漂移被断言中止，补入判读表 `prod-directed`。现归档 51 行（archived 19 / replayable 32）、判读 30 行，结构门禁绿、与 prod 账本互斥合规。③ **判读表互斥口径已收口（2026-11-26）**：原门禁对判读行也做「已记账即互斥」校验，与判读表「记录本库拒绝原因、允许目标环境记账」的语义错位；已改为判读行只守结构（class 枚举 / 版本有文件 / 与归档表不重叠）。账本互斥仅约束 `archived` 行（永不重放）；`replayable-not-applied` 的账本虚记属重放评审范畴，不进归档互斥门禁。prod `--db` 校验绿，判读行在 prod 已记账（导入口径 `execution_time=0`）不再误报。④ **本机 archived 导入行已清理（2026-11-26）**：本机 dev 账本原有 25 条历史导入行（`success=t`、`execution_time=0`、installed_on 2026-11-20），其中 3 条 `archived`（`20261105145000` 币种表 / `20261105235800` refresh 特权函数 / `20261107000025` 菜单补种）与归档互斥判红。删前核实：币种表 16 行、两个 refresh 函数均已在库落地，菜单 213/61 为本机历史线既有状态；三条 SQL 均幂等（`IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `CREATE OR REPLACE`），服务启动不自动跑迁移，账本无下游外键。已事务内删除这 3 条账本虚记（本机账本 741 → 738，备份 `/tmp/ledger-backup-archived-3-202611261528.csv`），本机 `--db` 归档互斥转绿，对象未受影响；**prod 账本未动**（prod 这 25 条本就未记）。另 22 条 `replayable-not-applied` 导入虚记不属归档互斥门禁，留待重放评审时与定性一并处理。⑤ **A3 replayable 逐条 dry-run 复核（2026-11-26）**：对 32 条 `replayable-not-applied` 逐条事务内 ROLLBACK dry-run（本机超管 socket，不落库、不记账）：31 条可执行、1 条中止。prod 侧核查目标对象落地后，**3 条目标状态已达标转 `archived/data-precondition`**：`20261107000027`（3 张死表两库均已删，DROP IF EXISTS no-op）、`20261107000034`（改名 prod 已落地：新表名在、旧名无；本机旧表残留为历史线）、`20261107000036`（`rd.deploys.formula_id` 列 + FK 均在 prod/本库）；`20261104040000` 本机 `erp.vehicles` 空壳缺 `mileage` 列中止、prod 列存在（integer 待对齐 numeric），维持 replayable；其余 28 条种子/权限/数据待 prod 重放补全，维持 replayable。现归档 51 行（archived 22 / replayable 29）、判读 30 行。3 条新归档本机导入虚记已清（账本 738 → 735，备份 `/tmp/ledger-backup-a3-202611261549.csv`），prod 账本未动。
6. **IAM 反范式冗余列与旧方言码（专项进行中：IAM-1 读取点已切关联表，方言码改名与 DROP 列留后续批次）**。① `iam.users.roles` / `permissions` 两 `text[]` 列为反范式冗余：真实授权走 `role_id` + `core_user_roles / core_role_permissions`。**复核修正旧定性**：运行期读取点共三处（`unified-core auth.rs`）——登录查询回显、`forgot_password` 查询 UserRow、密码重置 admin 通知判定；其中 admin 判定原为 `'admin' = ANY(u.roles)`，**属鉴权/通知用途**（并非纯回显），主鉴权仍在 `user_permission.rs` 走关联表。实测冗余种子：本机 2 用户均 `{superadmin}/{*}`；prod 5 用户中 3 行 roles 非空、1 行 permissions 非空。② 旧下划线方言码 `iam:users_read`：prod/本机 `public.core_permissions` 目录表均无此码（已被冒号命名 `iam:users:read` 取代，v1.119 收敛迁移清掉扁平码）。但**运行期代码仍有嵌入**，非纯测试残留：`lib/shared-auth/src/auth.rs` `get_permissions()` 内存目录种子 id、`lib/shared-auth/src/permission.rs` `IamAction::ListUsers` 鉴权兜底别名（`iam:users_read || iam:read`）、`unified-core user/crud.rs` 非超管回显硬编码 `vec!["iam:users_read"]`；其余为单测 claims/注释、迁移注释、e2e state 与历史快照 JSON。③ 收口前置（IAM 目录统一专项，须与①反范式列同批评审，不能孤立字符串替换）：先统一 shared-auth 内存目录码命名与鉴权兜底到冒号新码、核对 claims 匹配与全套测试回归，再处理反范式列 DROP；测试播种与方言码目录同步改名。④ **IAM-1 已落地（2026-11-26，仅改运行时 Rust，未改库、未 DROP、未动 prod）**：上述三处读取点全部改为关联表范式——roles 走 `core_user_roles ur JOIN core_roles r ON r.id=ur.role_id` → `ARRAY_AGG(DISTINCT r.name)`，permissions 走 `core_user_roles ur JOIN core_role_permissions rp JOIN core_permissions p` → `ARRAY_AGG(DISTINCT p.code)`，admin 判定改 `EXISTS(... r.name='admin')`；复用 862 refresh token 查询既有范式。`cargo check -p topems-unified-core` 绿、lib iam 67 测试全绿。**遗留前置（DROP 列前必办）**：关联表绑定一致性核对——本机 `test_admin` 关联表空而冗余列存 `{superadmin}`（历史漂移），切权威后该用户鉴权/回显会掉权，需在 DROP 前补齐关联表绑定；历史迁移脚本 SQL 内读列属不可变账本保留；测试 fixture（`p1_company_scopes_migration_tests.rs` 等）写反范式列留待 DROP 批次清理。⑤ **IAM-2 第一批已落地（2026-11-26，仅改运行时 Rust，未改库）**：复核三处旧方言码嵌入点的真实性质——(a) `unified-core user/crud.rs` 列表/详情非超管回显硬编码 `vec!["iam:users_read"]` 是**占位假权限**（非真实授权），已改为关联表规范化授权查询：列表批量 `core_user_roles→core_role_permissions→core_permissions` 聚合 `p.code` 入 HashMap，详情单查 `DISTINCT p.code`，与 `profile.rs`/`profile_ext.rs` 既有 `resolve_user_grants` 范式对齐；超管仍返回内存目录全量（保持原行为）。(b) `lib/shared-auth/src/permission.rs` `check_iam_permission`/`IamAction`/`PermissionCheckResult` 经全仓核查为**业务零调用的未接线死代码**（仅本文件单测引用，运行期鉴权链路走 `user_permission.rs` 关联表；顶层 `lib.rs` 未导出）。**IAM-2b 已删除（2026-11-26）**：整组 struct/enum/纯函数及 10 个专属单测一并移除（shared-auth lib 241→231 测试）。**v1.140 续删（2026-11-26）**：复核 `compute_effective_permissions`/私有 `get_all_permission_codes` 同为未接线旧内存目录遗留——生产零调用、顶层未重导出、仅单测引用；真实授权由 `resolve_user_grants` 关联表 `DISTINCT` 聚合承担，superuser 全量回显另走 `get_permissions()` 目录；衍生 `iam:cross_tenant` 补码无生产比较/校验引用，跨租户隔离由 RLS/中间件承担。两者及 1 个专属单测一并移除（shared-auth lib 231→**230** 测试）；存活目录主体 `get_all_module_permissions`（`permission_center` 生产在用）保留。(c) `lib/shared-auth/src/auth.rs` `get_permissions()`/`get_roles()` 内存目录 35 码：仅超管回显全量目录占位，不参与签发 claims/鉴权；实测 35 码仅 `iam:dictionaries_read/update` 两码在 DB `core_permissions` 存在，其余 33 码 DB 无对应（DB 目录 355 码本身三种方言并存：域级 `read/write/delete/admin`、三级冒号 `resource:action`、下划线 `dictionaries_read`）。规范口径已立于 `middleware/permission.rs`：细粒度码 `module:resource:action`（末段 read/write/delete/approve/admin），遗留方言禁新增，已挂载历史码不改名。**遗留（IAM-2 剩余 / 另批）**：内存目录种子对齐 DB 规范码需先补 DB 种子基线（或超管回显改从 DB 目录取全量）；测试/注释内旧码随上述同步；未接线死代码分支清理已完成（IAM-2b + v1.140，见 b）。本轮 `cargo check`/clippy/fmt 绿，shared-auth lib **230**、unified-core lib 571 测试全绿。

⑦ **IAM-3 关联表绑定一致性普查（2026-11-26，只读核查，未改库/未 DROP）**。运行期授权链路已全部切关联表：超管由 `iam.users.is_superuser` 布尔独立兜底放行（`user_permission.rs:72-126`、`auth.rs:384`），普通用户走 `core_user_roles→core_role_permissions→core_permissions`（`resolve_user_grants`/`user_permission.rs:129-141`）；`UserRow.roles/permissions` 为关联表聚合别名，不读冗余裸列。**本机 `topems`（2 活跃，0 软删）**：`admin` 冗余 `{superadmin}/{*}` ↔ 关联表 `{superadmin}` 一致；`test_admin` 冗余 `{superadmin}/{*}` 但关联表绑定 **空**（漂移 A：超管布尔兜底不掉权，规范不一致，DROP 前需补绑定或明确超管不绑角色）。**prod `topems_prod`（9 用户：5 活跃 + 4 软删）**：活跃 `admin` 冗余 `{admin}/{*}` ↔ 关联 `{admin}` 一致；`tenant_admin` 冗余/关联均 `{tenant_admin}` 一致；`reviewer` 超管布尔=t、冗余 `{admin}`、关联表 **空**（漂移 A，同 test_admin）；`chi`/`wangy` 普通用户冗余与关联表两边一致地空（空权，是否应授权待业务确认，非冗余漂移）；软删 `f1_prod_1111210231` 关联 `{tenant_admin}` 而冗余空（反向滞后，已软删），其余软删空权。**完整性核查**：两侧关联表均无孤儿 `user_id`/`role_id` 悬空；冗余 `roles` 角色名均在 `core_roles` 目录（无孤儿名）。**旧 `role_id` 单列外键列**：本机全空；prod 3 行（admin/reviewer/tenant_admin）指向占位 UUID `3333…001/004`，在 `core_roles` 不存在（悬空，该列无 FK 约束未被拦）——与冗余列同属旧单角色路径，DROP 时一并评估。**数据债线索（另批）**：本机 `core_role_permissions` superadmin 角色每条绑 38 次重复（4689 行 / 去重 915）；prod 目录 1162 码 vs 本机 355 码，两侧目录漂移。**代码侧残留点**：唯一写冗余列的测试 fixture 为 `svc/unified-core/tests/p1_company_scopes_migration_tests.rs` `insert_user` helper（102 行 INSERT 带 roles/permissions）；历史迁移 `20261108130000_p1_company_master_and_scopes.sql:182/225` 双读 `u.roles/u.permissions` 兜底（不可变账本，不改）；无生产种子/SQL INSERT 写冗余列；前端不读 DB 冗余裸列（角色/权限来自后端签发 claims 与回显接口）。**DROP 前置清单**：(a) 漂移 A 补关联表绑定（test_admin、reviewer）或定稿超管仅靠 `is_superuser` 不绑角色；(b) 空权普通用户业务确认授权归属；(c) 定稿 `role_id` 旧外键列是否一并 DROP；(d) fixture helper 去裸列、改插 `core_user_roles` 或纯空权，评估历史迁移测试在 DROP 列后是否继续回放；(e) 全套认证/授权测试回归。

⑧ **IAM-3 拍板口径与 DROP 迁移落地（2026-11-26，代码/迁移已就绪，待 replay 窗口投放）**。决策（一步到位定稿）：**(1) 超管不绑角色**——`is_superuser` 布尔独立兜底全量放行，`core_user_roles` 绑定仅服务普通用户；漂移 A（本机 `test_admin`、prod `reviewer`）**不补关联表绑定**。**(2) `reviewer` 为例外身份**——prod 评审体验账号（reviewer@topems.local，full_name「评审体验账号」），保留 `is_superuser=t` 全量评审权限，不降级、不清理、不补角色，身份不依赖被删三列。**(3) `role_id` 旧单列外键列一并 DROP**——连带 `users_role_id_fkey` 外键约束与 `idx_users_role_id` 单列索引；`iam.roles` 旧表本身及 `iam.position_roles → iam.roles` 遗留引用不在本轮范围，另议。**(4) 空权普通用户**（`chi`/`wangy` 及软删账号）本轮不补权，授权归属业务另议。**迁移 `20261126170000_drop_iam_users_legacy_columns.sql`**：DROP `iam.users.roles/permissions/role_id` 三列；`to_regclass` 守卫 + `IF EXISTS` 幂等（新库/已清理库跳过）；destructive 标记 `kind=DROP COLUMN`、ticket `IAM-LEGACY-20261126`、`rows-at-review=0`、backup 指向 `backups/db-iam-users-legacy-columns/`。**依赖复核**：运行期 Rust/前端/`.sqlx` 对三列零裸列引用；DB 函数/触发器/视图零依赖；依附 `role_id` 的仅该 FK 与索引。**验证**：本机 `topems` 事务内 dry-run 通过（校验三列已删后 ROLLBACK，无持久化副作用）；destructive 门禁 `APPROVE`（票据匹配）；manifest `pending_forward_patches` 登记 `to_apply`；`cargo check`/clippy/fmt 绿，shared-auth lib 230、unified-core lib 571 测试全绿。**环境覆盖**：开发/部署/本机/prod 同一份 replayable 迁移；db-tests 全量认证/授权回归留待迁移 replay 窗口（本机账本滞后、5433 验证实例不可达，不在本轮强行跑）。**备份**：删除前两库三列快照 `backups/db-iam-users-legacy-columns/iam.users-{topems,topems_prod}-20261126.csv`（id/username/email/is_superuser/role_id/roles/permissions）。

⑨ **IAM 另批债只读普查（2026-11-26，未改库、未动 prod 账本）**。承接 ⑧ 遗留，对三项另批数据/目录债做现状量化定性，处置各立批次。

**(C) 本机 `core_role_permissions` 重复绑定（本机 dev 独有，prod 干净）**：本机 `superadmin` 3414 行 / 去重 343（冗余 3071，同对最大重复 **38** 次）、`admin` 1048 行 / 去重 345（冗余 703，38 次）；其余 11 个 `*_manager` 角色无重复。prod `topems_prod` 15 个角色 `dup_excess` 全 0，无此债。定性：本机种子重放残留（同一 `(role_id,permission_id)` 未 `ON CONFLICT` 重复插入 38 倍）；清理属本机数据债，可写幂等去重迁移（每组保留一条），供新库/夹具重放防复发；prod 无需处置。

**(D) 目录码两侧漂移（本机种子滞后 + 33 码待补基线）**：本机 `core_permissions` 355 码，prod 1162 码；本机 355 全为 prod 子集（仅本机有=0），prod 独有 807。以前端生成基线 `permissions.ts` 1033 码三向比对：807 中 **774 在仓库基线内**（本机账本水位 `20261124150000` 滞后，replay 种子补齐即可消）；**33 码不在基线**（19 个两级聚合码 `module:action`，如 `finance:read`/`system:read`/`rd:admin`/`master-data:write`；14 个三级码 `lims:test-method:read`、`master-data:*` 13 个）。33 orphan 多数在 Rust/前端有引用（`finance:read` 23 处、`master-data:write` 28、`rd:admin` 15、`system:read` 13 等），定性为**运行期真实使用但未进迁移种子基线**，方向是补 DB 种子迁移纳入基线，而非清理 prod 残留。**【2026-11-27 复核修正】** 专项四向比对（prod 1162 码 × 种子 INSERT VALUES × FE 手写基线 × BE 字面量）表明：这 33 码经后续模块种子/前端同步/网关补缺/MDM/batch4/伞码/方言收敛等批次补录后，**种子目录全部在册、缺口 0**，旧「未进基线」定性对当前已不成立；残余仅 2 个未挂角色方言码，详见 §173 与 `docs/quality/permission-orphan-l4-rebuild-20261127.md`。

**(E) 旧表 `iam.roles` / `iam.position_roles` 遗留引用**：运行期角色目录权威为 `public.core_roles`（`role.rs::list_roles` 等全部查 core_roles）；旧 `iam.roles` 为空壳（prod 4 行占位、本机 0 行），无 Rust/前端业务读它，无视图/函数依赖。依附 FK 两条：`users_role_id_fkey`（已纳入 ⑧ 迁移 `20261126170000` 待 replay）、`position_roles_role_id_fkey`（另议）。`position_roles` 并非死表：`position.rs` 岗位模块运行期 INSERT/SELECT/DELETE 该表，但其 `role_id` FK 误指旧 `iam.roles`，而前端岗位绑定传入的是 `core_roles` UUID（目录接口来源）；表两库均 0 行，功能未实际产数。处置另议：岗位角色绑定要么 FK 修正指向 `core_roles`、并入 `core_user_roles` 范式，要么岗位角色绑定功能下线；涉及岗位模块接口改造，不随本轮 DROP users 列。

⑩ **IAM-2c 超管回显目录源对齐 DB（2026-11-26，代码就绪，待 replay/部署窗口随常规发布）**。普查发现同一超管三处回显口径分裂：`roles.rs` 角色列表与 `batch.rs` 有效权限的超管分支已查 `public.core_permissions` DB 全量，而 `profile.rs`/`crud.rs`(列表+详情)/`profile_ext.rs`(三处) 共 **6 处**超管回显 permissions 仍取 `shared-auth` 内存目录 35 码（旧下划线方言占位，多数 DB 无对应）。**改动**：`models.rs` 新增 `superuser_permission_codes(db)`（系统通道 `scope_read_system` 查 `core_permissions` 全量 code，与 `resolve_user_grants` 同范式）；6 处超管分支统一改调该函数，非超管仍走 `resolve_user_grants` 关联表实时聚合。**效果**：运行期业务代码对内存目录 `get_permissions()` 的引用清零；超管/普通用户回显同源 DB 目录。**验证**：`cargo check`/clippy/fmt 绿；unified-core lib 571、shared-auth lib 230 测试全绿。**遗留（另批）**：① 内存目录函数 `get_permissions/get_roles/get_role_by_id/get_permission_by_id` 现运行期零调用，仅 shared-auth 单测与 `auth_test.rs` 引用，死代码清理（连带测试）另批；② 超管 roles 回显仍硬编码 `["admin","user"]`，未对齐 roles.rs 的 DB 全量角色口径，另议；③ 本批无 DDL、未改库、未动账本。

⑪ **IAM-2d 内存目录死代码甄别与清理（2026-11-26，仅删未接线代码，未改库/未动账本）**。承接 ⑩：超管回显切 DB 目录后，shared-auth 内存目录四函数与配套 struct 运行期业务零调用，仅单测引用。**甄别存活边界**：保留生产在用的 `PermissionResolver`/`PermissionCacheEntry`、`permission.rs` 的 `ModuleCode/PermissionAction`、`get_all_module_permissions`（permission_center 在用）；确认 `Role`/`Permission` 两 struct 无 crate 内外其他模块复用。**删除**：① `auth.rs` 内存目录块——`Role`/`Permission` struct 与 `get_permissions/get_roles/get_role_by_id/get_permission_by_id` 四函数（35 个旧下划线方言码占位）及 4 个专属内联单测；② 两处重导出移除：`lib/shared-auth/src/lib.rs`、`lib/src/lib.rs` 的四函数与两 struct；③ `lib/tests/auth_test.rs` 10 个目录专属测试连带移除。**验证**：`cargo check`/clippy/fmt 绿；shared-auth lib **230→226**；shared 集成测试全绿（`auth_test.rs` 17 通过）；unified-core lib **571** 全绿。**遗留（另批）**：超管 roles 回显仍硬编码 `["admin","user"]`，未对齐 DB 全量角色口径。

⑫ **IAM-2e 超管 roles 回显对齐 DB 全量角色目录（2026-11-26，代码就绪，待常规发布）**。承接 ⑪：基准 `roles.rs` 超管分支已查 `public.core_roles` 全量角色名，而 `profile.rs`、`profile_ext.rs`(三处)、`crud.rs`(列表+详情) 超管 roles 数组仍硬编码 `["admin","user"]`（crud 为 `real_roles` 空壳再 push `"admin"`），口径分裂。**改动**：`models.rs` 新增 `superuser_role_names(db)`（系统通道 `scope_read_system` 查 `SELECT name FROM public.core_roles WHERE deleted_at IS NULL ORDER BY name`，与 `superuser_permission_codes` 同范式，Err 时 warn 返回空 Vec、末尾 `commit`）；`profile.rs`/`profile_ext.rs` 三处与 `crud.rs` 列表（闭包外预取复用，同 `superuser_codes` 模式）+ 详情共 **6 处**超管 roles 数组统一改调，非超管仍走 `resolve_user_grants` 关联表实时聚合。**口径边界（本批不动，另议）**：单数 `role` 字段（主角色标签）超管仍占位 `"admin"`；`batch.rs` 不返回 roles（其中两处 `"user"` 是审计日志 action，非角色）。**验证**：check/clippy/fmt 绿；unified-core lib **571**、shared-auth lib **226**、shared 集成 `auth_test.rs` **17** 全绿；无 DDL、未改库、未动账本。

⑬ **超管单数 `role` 字段口径只读复核（2026-11-26，无代码改动、未改库/未动账本）**。承接 ⑫ 遗留项，甄别单数 `role` 是否承载鉴权语义、是否需对齐 DB 角色目录。**结构分两类**：① **JWT Claims.role**（`iam/auth.rs:426/971`，`tenant_scope.rs:422` 测试辅助）：令牌载荷二值 `admin`/`user`；② **UserResponse.role**（回显响应 6 处：`profile.rs:244`、`profile_ext.rs:101/334/686`、`crud.rs:178/672`、`roles.rs:265`）：超管 `"admin"`，非超管 `roles.first()`。**鉴权不依赖单数 role**：后端全仓无 `claims.role`/`UserResponse.role` 读取比较点，授权走 `is_superuser` 布尔 + `permissions` 码 + `roles` 数组；前端真实守卫 `useAuth.hasRole`（`useAuth.tsx:486`）= `is_superuser || roles.includes(role)` 走**数组**，`useRole.isAdmin/getRoleName/currentRole` 同样优先 `is_superuser`；旧 `session.hasRole`（`session.ts:106`）读单数 role 但业务零调用（仅单测引用）。**展示消费（纯兜底标签）**：`ProfileTabBar.tsx:112`、`MobileProfilePage.tsx:66` 直接取 `user.role` 展示；`useProfile.ts:159`/`ProfilePage.tsx:146` 映射进会话模型；前端角色标签文案主要由 `useRole.currentRole`（基于 `is_superuser`/数组）独立本地化产出，不读后端单数 role；前端其余 `role ===` 比较均为 AI 聊天 `msg.role`（user/assistant 对话角色），与 IAM 无关。**DB 目录核对**：`admin` 在本机/prod `core_roles` 均为合法角色名（本机另有 `superadmin`，prod 无），超管占位 `"admin"` 落在目录内、非目录外方言；但超管（`is_superuser`）与 admin 角色绑定是两回事，`"admin"` 本质是首要角色标签占位。**处置口径（待拍板）**：**A 维持现状（推荐）**——保留超管 `"admin"` 占位：不参与鉴权、`admin` 为目录合法名、展示文案由前端 `useRole` 本地化产出，后端 role 仅兜底；改目录首项语义错误（prod/本机首角色不同，超管不等于该角色）。**B 对齐目录首项**——超管 role 取 `superuser_role_names().first()`：超管未绑角色，首项为目录排序首角色，展示误导，不推荐。**C 语义化拆分**——响应去掉单数 `role` 冗余字段、前端展示统一改 `useRole.currentRole`，并评估移除 JWT 二值 `Claims.role`；属前后端契约改动，单列批次。**关联死代码候选**：旧 `session.hasRole` 业务零调用，可随 C 一并清理；`Claims.role` 移除前须先确认下游服务/旧令牌解析是否读取。

⑭ **IAM 目录统一专项（#36）收口梳理与遗留清单（2026-11-26，口径 A 定稿；无代码改动、未改库/未动账本）**。**定稿**：超管单数 `role` 字段按口径 A 维持 `"admin"` 占位（见 ⑬），不改代码、不拆契约。**本专项已闭环批次**：IAM-1 反范式列读取点切关联表聚合；IAM-2 方言码目录/兜底/回显改名；IAM-3 DROP 三列迁移定稿 + 绑定一致性普查；IAM-2b 未接线死代码鉴权分支删除；IAM-3a 迁移本机 replay 验证；IAM-3b 测试夹具改造；#43 另批债普查落档；IAM-2c 超管 permissions 切 DB 全量；IAM-2d 内存目录死代码清理；IAM-2e 超管 roles 切 DB 全量；单数 role 口径复核（本小节）。**开放遗留（按类别，2026-11-26 双库实测复核成立）**：

- **L1 待独立 replay 窗口投放（本轮不投放；唯一入口 `scripts/migration/apply-forward.sh --prod`，禁 `sqlx migrate run`）**：① `20261126160001_iam_tenant_permissions_rls_fail_closed.sql`（tenant_permissions fail-closed 加固；原号 160000 与已在 prod 记账的 erp 迁移撞号，本轮纯改号内容未变）；② `20261126170000_drop_iam_users_legacy_columns.sql`（DROP `iam.users.roles/permissions/role_id` 三列，ticket `IAM-LEGACY-20261126`，destructive-expires `2027-05-25`）。两迁移两库账本均未记账（本机 max `20261124150000`、prod max `20261126110000`）；投放后做 db-tests 全量认证/授权回归；本机账本滞后、5433 验证实例不可达不在本轮强跑。

- **L2 本机重复绑定去重（dev 独有，prod 干净）**：本机 `core_role_permissions` superadmin **3414 行/去重 343**（冗余 3071、同对最大 38 次）、admin **1048/345**（冗余 703、38 次）；prod 15 角色重复全 0。定性为本机种子重放残留（同一 `(role_id,permission_id)` 未 `ON CONFLICT` 重复插入）；可写幂等去重迁移（每组保留一条），供新库/夹具重放防复发；prod 无需处置。

- **L3 本机目录种子补基线（账本滞后）**：本机 `core_permissions` **355** 码、prod **1162** 码；本机 355 全为 prod 子集。prod 独有 807 中 774 在前端基线 `permissions.ts` 1033 码内，本机账本水位滞后 replay 种子补齐即可消。

- **L4 orphan 码（2026-11-27 四向复核：种子口径 0 缺口，旧 33 定性已消化）**：旧台账记 19 个两级聚合码（`module:action`，如 `finance:read`/`system:read`/`rd:admin`/`master-data:write`）+ 14 个三级码（`lims:test-method:read`、`master-data:*` 13 个），定性「运行期真实使用、未进迁移基线」。经专项四向比对（prod 1162 码 × 种子 INSERT × FE 手写基线 × BE 字面量）复核：**全部在册并挂角色，种子登记缺口 0**；旧「未进基线」定性对当前已不成立。残余仅 2 个未挂角色下划线方言码（`iam:dictionaries_read/update`，归口 IAM 目录统一专项）。逐条清单见 `docs/quality/permission-orphan-l4-rebuild-20261127.md`，详见 §173 复核记录。

- **L5 空权普通用户业务授权确认（待业务口径，本轮不补权）**：prod 活跃 `chi`/`wangy` 普通用户两边一致地空；授权归属待业务确认。prod 活跃现状实测：`admin`（超管，绑 admin）、`reviewer`（超管，空绑定——漂移 A，定稿不补）、`tenant_admin`（绑 tenant_admin）、`chi`/`wangy`（空权）。

- **L6 旧表/岗位角色绑定处置（另议，涉及岗位模块接口改造）**：旧 `iam.roles` 空壳（prod 4 行占位、本机 0 行），无 Rust/前端业务读、无视图/函数依赖；`position_roles` 非死表（`position.rs` 运行期 INSERT/SELECT/DELETE），但 `role_id` FK 误指旧 `iam.roles`，而前端岗位绑定传 `core_roles` UUID；表两库均 0 行、功能未实际产数。处置二选一：FK 修正指向 `core_roles` 并入 `core_user_roles` 范式，或岗位角色绑定功能下线。`users_role_id_fkey` 已纳入 L1 迁移 170000 待 DROP；`position_roles_role_id_fkey` 本项另议。

- **L7 口径 C 契约拆分（候选批次，未拍板启动）**：响应去掉冗余单数 `role` 字段、前端展示统一改 `useRole.currentRole`，并评估移除 JWT 二值 `Claims.role`；当前定稿口径 A 维持占位。**L8 旧 `session.hasRole` 死代码**：业务零调用（仅单测引用），可随 L7 一并清理；`Claims.role` 移除前须先确认下游服务/旧令牌解析是否读取。

**归属其他专项另案（不并入 #36）**：owner 漂移对象收敛收尾、v2 投影 3 行 `company_id` 全 NULL 回填后收紧 NOT NULL、旧角色 `topems_prod` 撤权/禁用、108 条手工记账 `execution_time` 空/0 回填、`www.topems.net` NXDOMAIN（注册商侧）；checksum 归一已决策「仅本机一次性修复、不进 CI」（§9），非开放项。

⑮ **L1 两迁移 replay 窗口准备复核（2026-11-26，本机事务内 dry-run ROLLBACK，未投放、未记账）**。承接 L1，投放前复核迁移文件/守卫/checksum/前置对象与回归清单。

**交付物核对**：
- `20261126160001_iam_tenant_permissions_rls_fail_closed.sql`：manifest `to_apply`；checksum `cb377945…3b563211` 与磁盘 SHA-256 一致；`to_regclass` 守卫表不存在跳过；ENABLE+FORCE RLS；幂等 `DROP POLICY IF EXISTS rls_tenant_isolation` 清理旧 fail-open 策略；策略存在 ALTER / 不存在 CREATE，表达式 `app.rls_system='on' OR tenant_id 精确匹配`；后置断言同时校验 ENABLE+FORCE、新策略不含空租户/未设置/零租户豁免分支、旧策略 `rls_tenant_isolation` 无残留。
- `20261126170000_drop_iam_users_legacy_columns.sql`：manifest `to_apply`；checksum `293c44e4…5ecb0f8d` 与磁盘一致；`to_regclass` 守卫；DROP CONSTRAINT `users_role_id_fkey` + `DROP INDEX IF EXISTS iam.idx_users_role_id`（显式 schema 限定）+ DROP COLUMN `roles/permissions/role_id`；destructive 标记齐全（kind DROP CONSTRAINT/COLUMN、ticket `IAM-LEGACY-20261126`、expires `2027-05-25`、rows-at-review=0、backup 路径）；收尾断言三列不存在。
- **backup 快照在位**：`backups/db-iam-users-legacy-columns/iam.users-topems-20261126.csv`（本机 2 行）、`…topems_prod-20261126.csv`（prod 9 行），列 `id/username/email/is_superuser/role_id/roles/permissions`。

**本机事务 dry-run（BEGIN→`\i`→校验→ROLLBACK，EXIT=0；补丁后复测）**：① 160000 后 RLS=true/FORCE=true，策略集合仅剩新策略 `tenant_isolation_tenant_permissions`（旧 `rls_tenant_isolation` 已 DROP），表达式为系统通道 OR 精确匹配、无豁免分支；② 170000 后三列残留=0、`idx_users_role_id` 残留=0、`users_role_id_fkey` 残留=0（D1 补丁后 DROP INDEX 显式命中 `iam.` 限定，不再 NOTICE 跳过；FK 与索引亦随 DROP COLUMN 级联兜底）。ROLLBACK 后本机三列/策略恢复原状，未落地。`validate.sh` 门禁 Errors=0、Checksum errors=0。

**两库前置对象实测**：本机 `topems` 三列在、FK 在、索引在；`iam.tenant_permissions` RLS=t/FORCE=f、1 条旧策略。prod `topems_prod` 三列在、FK `users_role_id_fkey` 在、索引 `idx_users_role_id` 在；`iam.tenant_permissions` **RLS=f/FORCE=f、无任何策略**。两账本均未记账（本机 max `20261124150000`、prod max `20261126110000`）。

**复核发现与处置（已在投放前补补丁，2026-11-26 拍板；checksum 已重算并同步 `checksums.txt`/manifest）**：
- **D1（170000 DROP INDEX 缺 schema 限定）— 已修**：原 `DROP INDEX IF EXISTS idx_users_role_id;` 为裸名，文件 `search_path = pg_catalog, public, pg_temp` 不含 `iam`，dry-run 报 NOTICE `index does not exist, skipping`（语句 no-op）。补丁改为 `DROP INDEX IF EXISTS iam.idx_users_role_id;` 显式限定；复测该语句命中、索引随 DROP COLUMN 级联兜底。新 checksum `293c44e4…5ecb0f8d`。
- **D2（160000 未清理并存旧 fail-open 策略 `rls_tenant_isolation`）— 已修**：本机 `iam.tenant_permissions` 另有旧策略 `rls_tenant_isolation`，表达式含 `tenant_id IS NULL`/空串/零租户豁免；PostgreSQL 多条策略 OR 合并，旧策略会旁路新 fail-closed 策略（**prod 该表无旧策略**，旧策略为本机 dev 历史线残留）。补丁在 FORCE RLS 后补幂等 `DROP POLICY IF EXISTS rls_tenant_isolation ON iam.tenant_permissions;`，并加后置断言排除该旧策略残留。新 checksum `cb377945…3b563211`。干净库/CI 演练库由迁移链重建，不会产生该旧策略。

**Replay 回归清单（投放窗口执行，唯一入口 `scripts/migration/apply-forward.sh`，禁 `sqlx migrate run`）**：
- **A 投放前预检（只读）**：① 复核两账本无 160000/170000 记账、checksum 与 `checksums.txt` 一致、backup CSV 在位；② prod 前置三列/FK/索引在、`tenant_permissions` 无旧 fail-open 策略；③ 基线测试绿：unified-core lib **571**、shared-auth lib **226**、shared 集成 `auth_test` **17**。
- **B 投放（prod）**：按版本序先 160000（非破坏性）后 170000（破坏性）；命令形态 `bash scripts/migration/apply-forward.sh --db topems_prod --prod --anchor <anchor> --only 20261126160000,20261126170000 --defer <其余 pending> --allow-destructive=20261126170000`，环境 `PROD_CHANGE_TICKET=IAM-LEGACY-20261126`；170000 破坏性预演 DROP 行数必须为 0；其余 pending 版本显式进 `--defer`。
- **C 投放后回归**：① RLS：`DB_DSN=… bash scripts/dev/verify-rls.sh`（策略表 RLS 启用、缺口 0）；复核 `tenant_permissions` FORCE=t、策略表达式 fail-closed、无旧豁免分支；② 授权冒烟：`verify-runtime-permissions.sh`（非超管读 200/写 403）、`verify_menu_authority.sh`、`verify-route-matrix.sh`；③ 测试：`cargo test -p topems-unified-core --lib`（571）、`-p topems-shared-auth --lib`（226）、`-p topems-shared --test auth_test`（17），及 `svc/unified-core/tests/iam_permission_tests.rs` 与各模块 `*_permission_tests.rs`；④ 端到端：`admin`/`reviewer`/`tenant_admin`/`chi`/`wangy` 登录 200；超管全量放行、普通用户按关联表角色/权限；用户列表/详情/`/users/me` 回显 roles/permissions 正确；⑤ 账本：两版本已记账、checksum 一致，`ledger-ddl-drift`/`manifest-drift` 门禁绿。
- **D 回滚/兜底**：170000 三列数据以 backup CSV 为重建依据（无自动回滚迁移，破坏性窗口）；投放前确认无长事务/锁等待；失败时按脚本输出「已应用清单 + 未应用清单 + 逆序回滚入口」处置，已落账前序版本保持不回滚。

⑯ **L2–L8 复核与 L2 迁移落地（2026-11-26，双库只读实测；除 L2 新迁移外未改库、未动账本）**。承接 ⑭ 遗留分类逐条复核：

- **L2 重复绑定去重 —— 迁移已落地 `20261126180000_dedupe_core_role_permissions.sql`**：本机实测 superadmin 3414 行/343 对（冗余 3071）、admin 1048 行/345 对（冗余 703），合计 4689 行/915 对/冗余 3774；prod 2923 行=2923 对、重复 0。迁移按 `(role_id, permission_id)` 分组保留最早 `created_at`/并列物理首行一行，窗口函数删除其余，distinct 授权一条不丢；`to_regclass` 守卫 + 收尾断言无重复对。**锚点口径修正（D3）**：实测 prod 与迁移链终态（canonical）该表为复合主键 `(role_id, permission_id)`、**无业务 `id` 列**；dev 库的 `id` 单列主键属本地漂移，不纳入迁移口径。初版误用业务 `id` 作去重锚点，在无 `id` 列的 prod/链终态会直接报 `column "id" does not exist`；已改为 PostgreSQL 系统列 `ctid` 定位重复行，兼容「有/无业务 id 列」两种形态。本机事务 ROLLBACK dry-run EXIT=0，收敛 915=915、ROLLBACK 后恢复 4689；prod 幂等空跑。checksum(SHA-256) `17391cf4…832271`，已同步 checksums.txt/manifest，`validate.sh` Errors=0、unregistered_pending=0。**根治另议**：表无 `(role_id, permission_id)` 业务唯一约束，种子 INSERT 缺幂等守卫是重复根因；本迁移只收敛存量，不改表结构。
- **基线重建库对齐链尾 + 状态目录重生成（解除提交阻断，环境债另案）**：pre-commit `status-catalog` 全量比对此前因夹具库 `topems_status_baseline_verify` 水位滞后（停在 `20261123142000`，缺 11-24 状态约束批次）报假差异。按 `environment-provisioning §12.3` 重建基线库：provision 结构基线 → 手动补跑 `bootstrap_schemas.sql`（见下条环境债）→ `apply-forward --drill-gate-guc-auto` 回放至链尾 `20261126180000`/836 条。基线库对齐后全量 `--check` 暴露目录陈旧：目录 35 条 CHECK 缺 11-24~11-26 一批 `ck_*_status_standard` 迁移约束；用重建库重生成目录为 **55 条 CHECK / 5 枚举 / 660 无约束列**，新增 20 条逐条溯源均有迁移文件、无 prod-only 候选误入，全量 PASS。
- **环境债 —— 已闭环（v1.154，provision 接入 bootstrap）**：原 `provision-env.sh` 从零重建隔离库时未接入 `database/scripts/bootstrap_schemas.sql`，结构基线快照不含 `archive`（及 `file`/`im` 等）schema，前向迁移 `20261119100000_drop_dead_tables_batch1` 依赖预置的 `archive` schema，从零重建在该版本断链（`schema "archive" does not exist`）。改造落地：① 建库后、灌基线快照前，以目标连接执行 `bootstrap_schemas.sql`（幂等 `CREATE SCHEMA IF NOT EXISTS … AUTHORIZATION topems_owner` + 扩展 + `public` 属主收敛；连接需超管/库 owner，`topems_owner` 角色须已由 setup-db 预建，失败 fail-closed 并提示身份前提）；② schema/data 基线导入前过滤裸 `CREATE SCHEMA `、`COMMENT ON EXTENSION `、`SET transaction_timeout` 行，避免与 bootstrap 已建 schema/扩展冲突（对齐 `bootstrap-check.sh` 口径）；③ 非 `prod-replica` 演练场景前向追加 `--drill-gate-guc-auto`（自动注入迁移声明的闸门 GUC 与系统通道；与 `--prod` 互斥，由 apply-forward 守卫拦截）。隔离库 `topems_provision_verify` `--force-nonempty` 实测：`archive/file/im` 就位、`pgcrypto/uuid-ossp/pg_trgm/btree_gin/vector/plpgsql` 扩展就位、`public` owner=`topems_owner`；`20261119100000` 不再因缺 schema 断链，gate 放行后前向一路推进至 L1 批次。**撞号处置（本轮已闭环）**：前向在 `20261126160000` 撞账本主键中止——磁盘上 `20261126160000_erp_public_rows_read_visibility.sql`（已在链、账本 success，不可改号）与原 `20261126160000_iam_tenant_permissions_rls_fail_closed.sql`（L1 待 replay、prod 未投放）版本号撞号。已将后者纯静态改号为 `20261126160001`（git mv，文件内容未变、SHA-256 `cb377945…3b563211` 不变，仍排在 `170000` 前保持原顺序），manifest/checksums/exemptions 同步；duplicate 门禁转绿。该迁移仍待独立 replay 窗口经 `apply-forward --prod` 投放，本轮不执行、不写账本。
- **L3 本机目录种子补基线（dev 账本滞后，本轮不强跑）**：本机账本 735 条 / max `20261124150000`，prod 803 条 / max `20261126110000`；prod 有本机无约 96 版本（含 20261120–20261124 schema canonical 与种子 batch），本机另有 22 条早期 batch 编号 prod 未记账（基线合并口径差异）。本机 `core_permissions` 355 码全为 prod 1162 码子集；缺口靠 dev 库 replay 迁移链对齐，不写新种子；5433 验证实例不可达不在本轮强跑。
- **L4 33 orphan 码（现状复核，种子迁移另批）**：抽查代表码 `finance:read`/`system:read`/`rd:admin`/`master-data:write`/`lims:test-method:read`/`mes:work_order:write` 均在 prod DB 且已挂角色授权（运行期真实使用）。「未进迁移种子基线」指基线迁移未正式 INSERT 登记、prod 数据为漂移/手工产生；逐条清单需以 prod DB 码集 × 迁移 INSERT VALUES 解析 × app-shell/permissions.ts 前端基线 × Rust/前端引用四向比对重建，本轮未仓促写种子迁移，留专项批次核实每码 name/resource/action 与角色映射。
  - **2026-11-26 四向静态复核（v1.153，只读、未写种子迁移）**：prod `core_permissions` 1162 码。静态扫描四向——迁移 SQL `core_permissions` INSERT 块、前端 `app-shell`+`web/src`、Rust `svc/lib` 字符串字面量。**抽查旧代表码已被后续补码批次消化**：`finance:read` 登记于 `20260724000004_seed_module_permissions`、`rd:admin` 登记于 `20261020000024_iam_seed_missing_gate_permissions`、`master-data:write` 登记于 `20261023000004_master_data_mdm_permissions`；三者 prod 存在且种子 INSERT 首列在册，旧 11-20 台账「未进基线」定性对这些码已不成立。另 248 个标准三级 `module:resource:action` 业务 CRUD 码（mes 54/scm 50/erp 26/finance 23…）未在前后端静态字符串出现，判为后端动态授权/前端 DB 拉取渲染，非 orphan 残留。**静态解析局限（专项待补工具）**：① SQL 块需元组首列级解析，当前正则会把 `resource` 列串一并纳入、且注释行需剔除；② 后端权限走枚举/常量而非字符串字面量，静态扫不全；③ 前端菜单/SDK/i18n 全资源未纳入扫描。故本轮不出正式 orphan 逐条清单；专项批次先补解析工具，再核每码 name/resource/action 与角色映射，方向仍是补 DB 种子纳入基线，非清理 prod 残留。
  - **2026-11-27 专项四向复核（#53，只读、未写种子迁移、未投放 prod）**：解析工具已落地 `artifacts/audit/orphan-review/l4_orphan_rebuild.py`，全量结果 `artifacts/audit/orphan-review/l4-orphan-codes.json`。口径：DB=prod `core_permissions`（`deleted_at IS NULL`，1162 码，角色绑定经 `core_role_permissions ⋈ core_roles`）；SQL 种子=init+migrations+seeds 的 `core_permissions` INSERT 块（兼容 `public.` 前缀、两种列序、VALUES/SELECT 变体，剔除注释与改写行）；FE=`app-shell`+`web/src`+`business-tools-sdk`（**排除** `config/permissions.ts` 派生全量表，该表由 DB/类型再导出，计入手写基线会使 not_in_fe 失真为 0）；BE=`svc`+`lib` `.rs` 字面量。**统计**：种子登记 1162、**不在种子 SQL=0**；FE 手写基线 788、不在 FE 720、不在 BE 869、FE/BE 零静态引用 581（**全部种子在册**，判为后端枚举/常量动态授权或前端 DB 拉取渲染，非 orphan 残留）；未挂角色 2；L4 双缺口（不在 FE ∧ 不在种子）0。**代表码逐条核实**：`finance:read`（admin/finance_manager/tenant_admin）、`system:read`（admin）、`rd:admin`（admin/tenant_admin）、`master-data:write`/`read`（admin/scm_manager/tenant_admin/wms_manager）、`crm:read`、`ehs:read`、`mes:work_order:write`、`lims:test-method:read`、`master-data:lineage:read` 均 seed=1 在册并挂角色；`master-data:*` 14 码全量在册（11 个三级 `:read` 由 batch4 补录，read/write/admin 伞码由 MDM 批次登记）。**残余关注（非种子缺口）**：① `iam:dictionaries_read`/`iam:dictionaries_update` 两下划线方言码种子在册、BE `svc/erp/src/modules/dict.rs` 引用，但 `role_cnt=0` 未绑任何业务角色，归口 IAM 目录统一专项收口；② 581 个 BE 静态零引用码是否混有真死码，静态扫描无法定论，需枚举/常量追踪或运行期取证专项。**局限**：SQL 元组首列级解析、BE 枚举/常量扫不全、FE 菜单/SDK/i18n 未穷尽；本结论基于 2026-11-27 prod 快照。
- **L5 空权普通用户（待业务口径，不补权）**：prod 活跃 5 用户实测——`admin`（超管，绑 1）、`reviewer`（超管，空绑定，漂移 A 定稿不补）、`tenant_admin`（非超管，绑 1）、`chi`/`wangy`（普通，roles=0）；chi/wangy 授权归属待业务确认。
- **L6 旧表/岗位角色 FK（另议，方向待拍板）**：`iam.roles` prod 4 行占位/本机 0 行；`iam.position_roles` 两库均 0 行；`position_roles_role_id_fkey` 仍误指 `iam.roles(id)`（ON DELETE CASCADE），前端岗位绑定传 `core_roles` UUID。处置二选一：FK 修正指向 `core_roles` 并入 `core_user_roles` 范式，或岗位角色绑定功能下线；涉及岗位模块接口改造，未立项。
- **L7 口径 C 契约拆分 / L8 旧 `hasRole` 死代码（未立项，维持口径 A）**：复核 `claims.role`（单数）仍在回显链路读取——`portal/user.rs` 回显、`unified-core/tenant/handlers.rs` 回显、`mes/dashboard_ws.rs` 日志、`unified-core has_role`；鉴权走 `claims.roles` 数组（`tenant_scope.rs`/`auth.rs`）。前端 `useAuth.hasRole`/`useRole.ts` 仍有调用引用，并非纯单测残留；L8 不能脱离 L7 单独删。移除单数 `role` 前须先确认下游服务/旧令牌解析读取点，候选批次未拍板启动。



## 9. 决策与执行记录（2026-11-25 追加）

| 议题 | 决策 | 落地 |
| --- | --- | --- |
| 108 条 checksum 归一 | 仅本机一次性修复，**不进 CI、不做成仓库策略**；CI 权威仍是 `checksums.txt`(SHA-256) + 基线锚点 | `docs/database/ledger-rebaseline-20261125.md`、`docs/database/ledger-checksum-map-20261125.json` |
| `topems_owner` 是否 NOLOGIN | 暂保留 LOGIN（无 SUPERUSER/CREATEDB/CREATEROLE，密码仅在 `.env`）；先处理更高危的 `topems` | 无变更 |
| `topems` 角色 | `NOCREATEROLE`；撤销对 `topems_app` 的 `ADMIN OPTION`，改用 `WITH SET TRUE, INHERIT FALSE, ADMIN FALSE` 保留 `SET ROLE` 能力（窗口脚本依赖） | 已执行并验证 `SET ROLE topems_app` 正常 |
| `topems` 的 `CREATEDB` | **保留**：`scripts/lib/db.sh` 在无 URL 时默认用 `topems` 建库，`scripts/deploy/setup-db.sh` 也走 `CREATE DATABASE` | 后续若要收，先改默认角色并确认部署 DSN |
| 运行期 CREATE | 不新增门禁：仓库已有 `scripts/ci/check-runtime-ddl.mjs`（基线 10 文件 / ddl=22，只减不增） | 改造顺序见 `docs/database/runtime-ddl-plan.md` |

## 10. 后续补充：`topems_owner` 的库级权限

- 2026-11-25：补 `GRANT CREATE ON DATABASE topems TO topems_owner`。原因是多条迁移以 `CREATE SCHEMA IF NOT EXISTS <schema>` 开头，而 PG 对 `IF NOT EXISTS` 同样校验 `CREATE` 权限，缺权限会让 `apply-pending.sh` 在该文件上直接失败（实测 `20261121220000_finance_opening_balances_move.sql`）。
- 影响面：owner 可在 `topems` 库新建 schema，但不能建库（`NOCREATEDB` 保持）。
- **2026-11-25 已收紧（本条已闭环）**：把「建 schema」从迁移里剥离后撤回了该权限。
  1. 新增 `database/scripts/bootstrap_schemas.sql`（62 个 schema，`CREATE SCHEMA IF NOT EXISTS x AUTHORIZATION topems_owner`，超管执行一次、幂等）作为 schema 的唯一创建入口；
  2. 32 个 pending 迁移里的 `CREATE SCHEMA IF NOT EXISTS` 语句改为注释（已应用的 42 个文件一字未动，避免动历史 checksum）；
  3. `scripts/db/apply-pending.sh` 拒绝任何仍自带 `CREATE SCHEMA` 的迁移文件（退出码 2，提示去补 bootstrap）；
  4. 撤权：`REVOKE CREATE ON DATABASE topems FROM topems_owner`，同时撤掉运行时角色 `topems_app` 的库级 `CREATE`（PUBLIC 本来就只有 `CONNECT/TEMP`）。
  现状：`has_database_privilege(...,'CREATE')` 对 owner / app 均为 `f`，库级 `CREATE` 只剩 `topems`（管理角色）与库属主；
  owner 仍可建表（它拥有各 schema，`pg_class` 属主不变），owner-sweep 仍 `relations=0 functions=0`。
  回滚：`GRANT CREATE ON DATABASE topems TO topems_owner;`（app 同理），再把 bootstrap 前的迁移语句恢复。
  验证：`apply-pending.sh dry-run` 在同一批迁移上依旧通过（`20261125012000`、`20261125011000`）。


## 11. 最终拍板（2026-11-26）

三条悬而未决的事项按「不留隐患、可回滚」定案：

**1. `topems_owner` 保持 `LOGIN`，不改 `NOLOGIN + SET ROLE`。**

- 理由：库级 `CREATE` 已撤，`topems_owner` 只对 62 个 schema 及其对象有 DDL 权；`MIGRATE_URL` 直连它，迁移链（`apply-pending.sh` / `apply-forward.sh` / `sqlx migrate`）语义最直白，不需要超级用户 DSN。
- 若改成 `NOLOGIN`，所有迁移脚本必须由一个 `CREATEROLE` 的超管连接先 `SET ROLE topems_owner`，等于把超管 DSN 塞进常规迁移路径，权限面反而更大。
- 收口动作：`ALTER ROLE topems_owner NOLOGIN` 随时可做，届时需同步改 `MIGRATE_URL` 的建立方式（`psql "$SUPER" -c "SET ROLE topems_owner"`），文档已记，不作为默认。

**2. `topems` 保留 `CREATEDB`（`NOCREATEROLE` 不变）。**

- 依据：真正依赖建库能力的是灾备与演练链——`scripts/deploy/rollback.sh`（`createdb` 恢复备份）、`scripts/rollback-prod-mac.sh`（dropdb→createdb→导入）、`scripts/db/window-rehearsal.sh` 与 `drop-shadow-tables-step2.sh`（`createdb -T topems` 克隆）。这些脚本用 `PGUSER`/`DB_PASS`，直接指向 `topems`。
- 撤掉 `CREATEDB` 会让「回滚」这条唯一救命路径先断，风险大于收益；且 `topems` 不在应用运行路径（运行期是 `topems_app`，库级 `CREATE` 已撤）。
- 收口动作：`ALTER ROLE topems NOCREATEDB`（演练/回滚时临时 `GRANT` 再撤）已写入操作手册备用。

**3. `iam.tenant_permissions` / `iam.tool_permissions` 建表并补 identity。** 迁移 `20261125160000_iam_permission_tables.sql`：

- `id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`（原文缺陷「INSERT 不给 id 会失败」由此关闭）；
- `tenant_id/user_id/role/max_permission/tool_name` 为 `TEXT`，`active BOOLEAN`，`allowed_operations/denied_operations` 为 `TEXT[]`（对齐 `Vec<String>`）；
- 唯一键 `(tenant_id,user_id)`、`(tenant_permission_id,tool_name)`，`ON DELETE CASCADE`；
- `GRANT SELECT/INSERT/UPDATE/DELETE` + 序列 `USAGE,SELECT` 给 `topems_app`，`tenant_permissions` 启 RLS（零租户/未设置时放行平台维护态）。
- **存量血缘的坑**：anchor/prod 的 pg_dump 基线里这两张表**本来就存在**，且 `id bigint NOT NULL` 无 identity/默认值——`CREATE TABLE IF NOT EXISTS` 对它是 no-op，光建表修不掉缺陷。迁移里因此加了 `DO` 块：只有在「既无 identity 也无默认值」时才 `ADD GENERATED BY DEFAULT AS IDENTITY`，随后 `setval` 推到 `max(id)+1`，已有行不会撞号；`allowed_operations/denied_operations` 只补默认 `'{}'`，不加 NOT NULL。
- 验收（三层）：① 代码 4 条语句逐条 `PREPARE` 打真库全通过；② `cargo check -p topems-unified-core --lib` 在真库上编译通过（sqlx 宏按新 schema 校验）；③ 空库 anchor+forward：应用 124 条 0 失败（比上轮 +1 就是本迁移），保留探针库实测——`attidentity=d` 已装上，用 `topems_app` 在 `app.tenant_id=<自身租户>` 下 `INSERT ... RETURNING id` 拿到 id=1、数组列 `{read,write}` 原样回读；换租户 GUC 查得 0 行（RLS 生效），不设 GUC 时 1 行（平台维护态放行）。探针库已删。
- 默认行为不变：仍是 Memory 存储；切 `DatabasePermissionStore` 只需改配置，多实例共享权限无需再动 schema。
