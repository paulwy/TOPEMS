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
5. 43 条「历史中间缺口」迁移尚未分级（版本 ≤ 20261115141100 但未记账），其中至少 1 条依赖已搬迁的表。

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
