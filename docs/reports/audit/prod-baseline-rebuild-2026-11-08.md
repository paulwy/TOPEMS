# 生产库基线重建报告（topems_prod）

- 执行时间：2026-11-08 08:06–08:14（Asia/Shanghai）
- 目标库：`topems_prod` @ `xingzhai@192.168.110.115`（PostgreSQL 18 / Homebrew）
- 连接方式：SSH + `/opt/homebrew/bin/psql`（表属主 `xingzhai`，绕过 RLS 做盘点与校验）
- 边界遵守：**无 DDL、无代码改动、无部署、无推送、未重启服务**；仅 `DELETE` / `INSERT` / `UPDATE` 三类 DML，全部在显式事务内配合 `DO` 断言。

---

## 一、阶段 1：备份与盘点（只报告，未删除）

### 1.1 全库备份

| 项目 | 值 |
|---|---|
| 文件 | `~/topems/backups/pre_baseline_20261108_080628.dump` |
| 大小 | 4,440,062 B |
| 格式 | `pg_dump -Fc`（自定义格式，可 `pg_restore` 按表/按数据恢复） |
| sha256 | `d2548a45dd8e929cad4e734e125f9b50ef26289eab1d7f0706e80e3f9e7388eb` |
| 可恢复性校验 | `pg_restore -l` 解析成功，列出 **1345 个 TABLE DATA 段**（与表数一致）；`shasum -a 256 -c` 返回 OK |
| 权限 | `600` |

### 1.2 关键表可读副本

目录 `~/topems/backups/pre_baseline_20261108_080628_keytables/`（目录 700 / 文件 600，含 `SHA256SUMS`，逐文件校验全部 OK）：

| 副本文件 | 行数 |
|---|---|
| `iam_users.csv` | 1 |
| `iam_roles.csv` | 3 |
| `iam_user_roles.csv` | 0 |
| `public_core_permissions.csv` | 1109 |
| `public_core_role_permissions.csv` | 854 |
| `public_core_roles.csv` | 15 |
| `public_core_user_roles.csv` | 0 |
| `public_core_menus.csv` | 449 |
| `public_core_menu_groups.csv` | 130 |
| `public_core_dict_types.csv` | 77 |
| `public_core_dict_items.csv` | 397 |
| `public_core_tenants.csv` | 1 |
| `public_core_tenant_settings.csv` | 4 |
| `public__sqlx_migrations.csv` | 595 |

### 1.3 全表盘点（清空前）

- 规模：**43 个 schema / 1345 张表 / 10,538 行**（逐表 `count(*)` 精确计数；`pg_stat_user_tables` 统计滞后，未采用）
- 非空表：105 张

| 分类 | 非空表 | 行数 |
|---|---|---|
| 系统必需（权限码、角色、菜单、字典、租户、迁移账本、配置类种子） | 41 | 3,723 |
| 业务数据 | 42 | 1,757 |
| 测试与示例（`hrm.departments`、`hrm.positions`、`_sqlx_test.databases`） | 3 | 46 |
| 日志与历史（审计、登录日志、会话、令牌、同步/CQRS 进度等） | 19 | 5,012 |

关键系统表：`core_permissions` 1109、`core_role_permissions` 854、`_sqlx_migrations` 595、`core_menus` 449、`core_dict_items` 397、`core_menu_groups` 130、`core_dict_types` 77、`core_tenants` 1（默认租户 `00000000-0000-0000-0000-000000000001`）、`core_tenant_settings` 4、`iam.roles` 3（超级管理员/部门经理/普通员工）、`iam.users` 1（admin）。

---

## 二、阶段 2：清空与 admin 重建

### 2.1 清空（单事务，逐表断言）

- 事务内对 **64 张待清表**逐表 `SELECT count(*)` 与盘点预期比对，不一致即 `RAISE EXCEPTION` 回滚；按子表→父表拓扑序删除。
- 结果：**64 张表 / 6,815 行删除**，全部断言行数命中预期，`COMMIT` 成功。
- 先做过一次 `ROLLBACK` 结尾的 dry-run，删除行数与断言结果一致后才正式提交。
- 日志表保留结构、清空数据；审计表 `public.audit_logs` 中已有 375 行为测试期数据，已按“只清测试期行”口径随表清空（此前明文口令已单独脱敏处理，备份在 `audit_logs_20261108_074416.*`）。

### 2.2 admin 重建（两条腿）

| 项目 | 值 |
|---|---|
| `iam.users.username` | `admin` |
| `is_superuser` | `true` |
| `status` / `is_active` | `active` / `true` |
| `iam.users.role_id` | `33333333-3333-3333-3333-333333333001` → `iam.roles`「超级管理员」（`permissions = ["*"]`） |
| `roles` / `permissions`（反范式列） | `{admin}` / `{*}` |
| `must_change_password` | `false` |
| 规范化绑定 `public.core_user_roles` | 1 行（admin → core 角色 `admin`，id `2ad18844-4410-455b-b26d-f8dcdb10db09`） |
| 租户归属 | `public.core_tenant_users` 无记录 → 登录回退默认租户 `00000000-0000-0000-0000-000000000001` |

### 2.3 补齐超管角色权限缺口（补充口径落实）

- 核对结论：`iam:read`、`iam:write`、`iam:user:read`、`iam:role:read`、`iam:permission:read`、`iam:structure:read`、`iam:tenant:read`、`iam:dashboard:read`、`system:*`、`admin:iam:write/delete` 等 **21 个关键码均存在于 `public.core_permissions`**，无需新建权限码，因此不触发“需改代码才能补齐”的停止条件。
- 但 admin 角色原只映射 **214 / 1109** 条，上述 21 个关键码全部未映射——这正是“只绑角色会 403”的根因。
- 处理：单事务内断言 `现有映射=214`、`有效权限码=1109`、`关键码齐全`、`admin 用户三要素（is_superuser / role_id / core_user_roles 绑定）在位` 后，按“仅映射已有码、不造码”的方式补齐：
  - 新增映射 **895** 行，admin 角色映射 **214 → 1109**，`core_role_permissions` 总行数 854 → 1749；
  - 断言新增行数=895、补齐后=1109、重复映射=0、关键码未映射=0 后提交；
  - 事务前已备份 admin 角色原有 214 条映射：`~/topems/backups/core_role_permissions_admin_20261108_081121.csv`（22,260 B，sha256 `06191bde09008f2f0a8b4e9fd258ae1cbf36d4e6a2b4f3b2b4af32028d097e95`，权限 600）。
- 决策口径（**默认口径**，本会话未收到目标基线规范）：把超管角色补成“全量权限码覆盖”，与 `is_superuser=true` 语义一致，避免后续任意模块 403；新增码上线后仍需同步补映射。

### 2.4 口令策略

- 未改口令（无需改）：现有口令长度 20，含大写/小写/数字，满足 API 侧 `≥8 位且含字母+数字` 的校验（`svc/unified-core/src/modules/iam/auth.rs` 第 626–634 行）。
- 口令存储于 `~/topems/secret/admin.txt`（600），未使用 6 位旧 provision 口径。

### 2.5 清库后自检（全部通过）

| 自检项 | 结果 |
|---|---|
| 运行角色连库（`DATABASE_URL` → `topems_prod`） | 通过：`connect_ok=topems_prod, db=topems_prod`，可读 `iam.users`，可见 admin 角色 1109 条映射 |
| `/health` | 8099 → **200**；8000 → 200 |
| admin 登录 `POST /api/core/iam/auth/login` | **200**，`is_superuser=true`，`roles=["admin"]`，`permissions=["*"]` |
| `GET /api/core/iam/users` | **200**（items=1） |
| `GET /api/core/iam/roles` | **200**（items=15） |
| `GET /api/core/iam/permissions` | **200**（items=1109） |
| `GET /api/core/menus` | **200**（items=449，与 `core_menus` 行数一致） |
| 孤儿外键 | 全库 `NOT convalidated` 外键 **0**；`core_role_permissions` / `core_user_roles` 孤儿引用均为 **0** |
| 权限码重复 | **0** |

> 说明：8000 直连登录返回 401、8080 返回 404，属端口/网关路由差异，实际生产入口 8099 正常，非数据问题。

---

## 三、阶段 3：最终状态

### 3.1 总量与四类统计

| 分类 | 非空表 | 行数 |
|---|---|---|
| 系统必需 | 42 | 4,619 |
| 业务数据 | 0 | 0 |
| 测试与示例 | 0 | 0 |
| 日志与历史 | 5 | 21 |
| **合计** | **47** | **4,640** |

清空前后：10,538 → 4,640 行（净减 5,898）。对账：删除 6,815 − 新增 895（权限映射）− 新增 1（admin 角色绑定）− 新增 21（运行期自检写入）= 5,898。

### 3.2 各 schema 行数（前 → 后）

| schema | 前 | 后 | schema | 前 | 后 |
|---|---:|---:|---|---:|---:|
| public | 6,896 | 4,574 | wms | 1,067 | 1 |
| crm | 1,012 | 1 | mes | 24 | 1 |
| erp | 351 | 1 | ai | 8 | 8 |
| hrm | 307 | 1 | core | 36 | 15 |
| scm | 181 | 1 | master_data | 35 | 1 |
| qms | 178 | 1 | pm | 31 | 2 |
| finance | 163 | 19 | mobile | 12 | 2 |
| ehs | 130 | 0 | _sqlx_test | 3 | 0 |
| srm | 51 | 1 | rd | 42 | 0 |
| 其他 schema（analytics/communication/doc/doc_service/integration/lims/mail/notification/pdm/plugin_*/portal/report/shared/storage/unified_core 等） | 0 | 0 | 单行 schema（bi/flow/gis/rs/ticket/tms） | 各 1–2 | 各 1–2 |

### 3.3 保留内容（系统必需，逐项）

- 权限码：`core_permissions` 1109；角色权限映射 `core_role_permissions` 1749（admin 1109 + 其余 14 个域管理员 640）
- 角色：`core_roles` 15（admin + 14 个域管理员）；`iam.roles` 3（超级管理员/部门经理/普通员工）
- 账号：`iam.users` 1（仅 admin）；`core_user_roles` 1（admin 绑定）
- 菜单：`core_menus` 449、`core_menu_groups` 130
- 字典：`core_dict_types` 77、`core_dict_items` 397
- 租户：`core_tenants` 1、`core_tenant_settings` 4、`core_tenant_users` 0（回退默认租户）
- 迁移账本：`_sqlx_migrations` 595
- 配置/种子内容（**默认口径**保留）：`finance.core_finance_currencies` 16、`core.ai_faqs` 15、`public.core_faqs` 12、`public.core_guides` 12、`ai.ai_models` 4、`ai.ai_prompt_templates` 3、`bi.reports` 1、`mobile.push_config` 1、`mobile.sync_policies` 1、`pm.project_type_configs` 1、各 schema `schema_defense_ledger` 共 22 行
- 运行态自动重建（**非删除失败**）：`finance.cqrs_projection_progress` 2 行，由运行中的 CQRS projection 服务在清空后自动回填

### 3.4 清空内容（逐类）

- 业务数据：完整业务库表 42 张全部清空（crm/wms/erp/hrm/scm/qms/finance/ehs/srm 等），残留非空业务表 **0**
- 测试与示例：`e2e/测试账号` 已于上一批次删除；`hrm.departments`、`hrm.positions`、`_sqlx_test.databases` 清空
- 日志与历史：`public.audit_logs` 375、登录/会话/令牌、各域 `*_logs`、`sync_records`、`cqrs_projection_progress` 等历史数据全部清空
- 当前仅存的 21 行“日志与历史”类数据全部为本轮自检产生：`audit_logs` 9、`core_login_logs` 4、`core_sessions` 3、`core_refresh_tokens` 3，另加运行态 `cqrs_projection_progress` 2 行。若要求基线“零日志”，可在无人在线时清掉这 19 行登录/会话/审计记录（会使其会话失效），本报告未擅自执行。

---

## 四、备份位置与回滚方式

| 用途 | 路径 | 校验 |
|---|---|---|
| 全库回滚基线 | `~/topems/backups/pre_baseline_20261108_080628.dump` | sha256 `d2548a45…88eb`，1345 段 TABLE DATA，权限 600 |
| 关键表可读副本 | `~/topems/backups/pre_baseline_20261108_080628_keytables/` | `SHA256SUMS` 全 OK，权限 700/600 |
| admin 角色原 214 条映射 | `~/topems/backups/core_role_permissions_admin_20261108_081121.csv` | sha256 `06191bde…7e95`，权限 600 |
| 上一批次审计表脱敏前备份 | `~/topems/backups/audit_logs_20261108_074416.{dump,csv}` | 见对应 `.sha256` |
| 上一批次测试账号删除前备份 | `~/topems/backups/cleanup_testusers_20261108_075736.dump` + 4 个 CSV | 见对应 `.sha256` |

回滚方式：

1. **整库回滚（应急，需停机窗口并属 DDL 级操作，不在本次边界内）**
   `pg_restore --clean --if-exists --no-owner -d topems_prod pre_baseline_20261108_080628.dump`
   或恢复到新库后切换连接串。注意 `--clean` 会 drop 对象，属破坏性 DDL，需另行授权。
2. **仅回滚权限映射（本次唯一的结构化数据变更，可精确回退）**
   按备份 CSV 中的 214 个 `permission_id` 删除新增映射：
   ```sql
   BEGIN;
   DELETE FROM public.core_role_permissions rp
   WHERE rp.role_id = '2ad18844-4410-455b-b26d-f8dcdb10db09'
     AND rp.permission_id NOT IN (
       SELECT permission_id FROM public.core_role_permissions_backup_214  -- 先按 CSV 建临时表
     );
   COMMIT;
   ```
3. **仅回滚 admin 账号属性**：`iam_users.csv` 中有清空前完整行，可按 `id=56f4256f-369a-427b-9094-bff0c2a684f9` 还原 `is_superuser/role_id/roles/permissions`。

---

## 五、遗留说明与默认口径

1. **未收到目标基线规范**，以下为本轮默认口径，需规范工作流复核：
   - admin 采用“`is_superuser=true` + 超管角色全量 1109 权限码”双轨；
   - FAQ/指南/AI 模型/提示词/币种/报表定义/项目类型/推送与同步策略/schema_defense_ledger 视为配置与种子内容保留；
   - `hrm.departments`、`hrm.positions` 视为示例组织清空（如需标准组织数据，应在规范中给出种子）。
2. **仍需关注（未在本次范围内修改）**：`create/auth` 审计写入仍会把请求体中的明文口令落 `request_details`，建议后续在代码层脱敏。
3. 本次未做任何 DDL、未改代码、未重启服务；所有校验均通过现有运行中的 8099/8000 服务完成。
