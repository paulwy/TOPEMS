# 干净初始化基线规范（权威口径）

> 适用范围：任何新建环境（dev / test / staging / 验收 scratch）的首次初始化。
> 生产侧存量数据迁移由另一条工作流负责，本规范只定义「空库 → 可交付基线」。
> 当前实际入口：`scripts/db/provision-env.sh`（基线供给 + 前向迁移 + `--with-admin`）。
> 文中标注「规划」的公司/根部门/双账号与组织清理项尚未接入脚本，不得据此声称已实现。

## 0. 总体标准形态

1. **租户**：仅 1 个默认租户（企业自身），不预置示例租户。
2. **公司**：1 个法人主体，与默认租户 1:1，名称为占位「企业全称（请修改）」，不允许为空。
3. **部门**：仅 1 个根节点（公司节点），组织树非空；不预置任何下属部门。
4. **岗位**：0 行，不预置示例岗位。
5. **权限三层**：
   - 平台超管 `admin`：`is_superuser=true` + 权限 `["*"]`，仅运维使用。
   - 租户管理员 `tenant_admin`：本租户全部业务权限，0 个平台级权限。
   - 普通用户：按角色最小权限，基线提供 `employee` 只读/自助角色。
6. **首个用户**：`admin`（平台超管）由 `--with-admin` 创建；`tenant_admin`（首个业务用户）为规划项，尚未接入脚本，创建时口令必须单独生成、单独保存，禁止复用。

## 1. 数据分层口径

| 层 | 归属 | 表 / 数据 |
|---|---|---|
| 平台层 | `tenant_id = 00000000-0000-0000-0000-000000000000` 或 `NULL` | 权限码、菜单组/菜单、字典类型/字典项、平台角色 `admin`、系统迁移账本 |
| 租户层 | 默认租户 `00000000-0000-0000-0000-000000000001` | 租户、租户配置、公司、部门树、`tenant_admin`/`employee`/业务管理角色、用户与角色绑定、租户成员关系 |
| 业务层 | 默认租户 | 所有业务单据、流程、日志；全新环境必须为 0 行 |

## 2. 保留 / 清空 / 重建清单

### 2.1 保留（系统运行必需）

| 数据类 | 表 | 基线条数 | 来源 |
|---|---|---|---|
| 默认租户 | `public.core_tenants` | 1 | 参考数据基线 |
| 租户配置 | `public.core_tenant_settings` | 4 | 参考数据基线（租户级安全/上传默认值） |
| 平台角色 | `public.core_roles`（`admin`，tenant=0000） | 1 | 参考数据基线 |
| 权限码 | `public.core_permissions` | 986 + 前向迁移新增（实测 1109） | 参考数据基线 + 前向权限种子 |
| 角色权限映射 | `public.core_role_permissions` | 653 + admin 全量 + tenant_admin/employee 映射 | 参考数据基线 + 前向迁移 + 本规范种子 |
| 菜单组 | `public.core_menu_groups` | 122 + 前向新增 | 参考数据基线 + 前向菜单种子 |
| 菜单 | `public.core_menus` | 423 + 前向新增 | 参考数据基线 + 前向菜单种子 |
| 字典类型 | `public.core_dict_types` | 6 + 前向新增 | 参考数据基线（含 4 个 legacy 类型，必须保留） |
| 字典项 | `public.core_dict_items` | 24 + 前向新增 | 参考数据基线 |
| 财务币种 | `public.core_finance_currencies` | 前向迁移生成 | 前向迁移（系统参考数据） |
| 资产分类 | `erp.asset_categories` | 前向迁移生成 | 前向迁移（系统参考数据） |
| 迁移账本 | `public._sqlx_migrations` | 全量 | 迁移执行器 |
| 公司 | `hrm.companies` | **1** | 本规范种子（新建） |
| 根部门 | `hrm.departments` | **1**（`parent_id IS NULL`，`code='ROOT'`） | 本规范种子（新建） |
| 业务角色 | `public.core_roles`（`tenant_admin`/`employee` + 现有模块管理角色） | 15 + 2 | 参考数据基线 + 本规范种子（全部 tenant=0001） |

### 2.2 清空（不得进入干净基线）

| 数据类 | 范围 | 处置 |
|---|---|---|
| 示例部门 | `hrm.departments` 的 23 行标准部门树 | 仅保留 1 个根节点，其余删除 |
| 示例岗位 | `hrm.positions` 的 20 行 | 全部删除，保留 0 行 |
| 示例/测试账号 | `public.core_users` 历史演示账号（`admin_admin`/`hr_admin`/`core_admin` 等） | 基线为 0 行 |
| 测试超管 | `iam.users.test_admin`（迁移 `20261007140000` 写入的 `password_hash='x'`） | 新基线不重放该迁移；存量环境需前向清理 |
| 示例业务数据 | `scm/srm/crm/mes/wms/finance/...` 业务表 | 基线为 0 行（由自检断言） |
| 演示组织/联系人 | `database/seeds/seed_demo_business_data.sql` | 不执行；该文件仅作本地演示 |
| 会话/登录/审计日志 | `core_sessions`/`core_refresh_tokens`/`core_login_logs`/`iam.audit_logs` | 基线为 0 行；生产日志按合规保留，不在本规范清理 |
| 旧版角色表 | `iam.roles`/`iam.user_roles` | 运行时授权不读取；保持 0 行并标注 deprecated，禁止双写 |

### 2.3 重建（清空后必须补齐）

| 顺序 | 数据 | 生成方式 |
|---|---|---|
| 1 | 默认租户 | 参考数据基线（缺失时按固定 UUID 补建） |
| 2 | 公司（1 行） | 本规范种子（规划，未接入脚本），名称取占位「企业全称（请修改）」 |
| 3 | 根部门（1 行） | 同上，名称与公司一致、`code='ROOT'`、`parent_id=NULL`、`manager_id=tenant_admin` |
| 4 | 平台角色 `admin` 全量权限 | 本规范种子（规划）：按 `core_permissions` 全量同步（幂等删增） |
| 5 | 租户角色 `tenant_admin`、`employee` 及映射 | 本规范种子（规划）：按核心权限子集同步 |
| 6 | 业务角色归属租户 | 本规范种子（规划）：现有 15 个角色中除 `admin` 外全部 `tenant_id=0001` |
| 7 | `admin` 账号 | provisioning（`is_superuser=true` + `admin` 角色绑定 + 租户成员关系） |
| 8 | `tenant_admin` 账号 | 本规范种子（规划，未接入脚本）：`is_superuser=false` + `tenant_admin` 角色绑定 + 租户成员关系 |
| 9 | 自检 | provisioning 末尾，失败即中止 |

## 3. 权限与角色模型（定稿）

### 3.1 唯一权威来源

- 运行时授权以 `public.core_user_roles → public.core_roles → public.core_role_permissions → public.core_permissions` 为准。
- `iam.roles` / `iam.user_roles` **不被任何 Rust 代码读取**，已弃用；prod 存量行（super_admin/dept_manager/employee/tenant_admin）按废弃数据保留，禁止双写、不参与授权。`iam.user_roles` 为空，权限来源以 `core_user_roles` 为准。
- `iam.users.roles`（文本数组）仅保留给超管签发 token 时的历史展示字段，不作为权限依据。

### 3.2 角色定义

| 角色 | 层 | 租户 | is_superuser | 权限集合 |
|---|---|---|---|---|
| `admin` | 平台 | 0000（平台） | true | 全部权限码（`core_role_permissions` 全量同步）+ token `["*"]` |
| `tenant_admin` | 租户 | 0001 | false | 全部业务权限码（排除平台排除集），实测 1050 |
| `employee` | 租户 | 0001 | false | 最小自助/只读：`hrm:read`、`hrm:dashboard:read`、`hrm:employee:read`、`hrm:attendance:read`、`hrm:leave:read`、`hrm:payroll:read` |
| 现有 14 个模块管理角色 | 租户 | 0001 | false | 保留原有映射，作为普通用户细粒度角色模板 |

**平台排除集**（tenant_admin 不得持有）：
前缀 `admin:` / `system:` / `migration:` / `plugin:` / `subscription:` / `monitor:` / `tenant:`，
外加 `iam:admin`、`iam:tenant:read`。

### 3.3 为什么 admin 采用「超管标志 + 全量角色绑定」双写

- `is_superuser=true` 是 break-glass：权限表被误删/迁移失败时仍可登录修复，且不依赖 RLS 解析。
- 同时把 `admin` 绑定到 `admin` 角色并同步全量权限码：消除「有账号无角色」，让角色模型、审计、后续降权有据可查。
- `tenant_admin` 不设 `is_superuser`，只通过角色获得本租户业务权限；平台级端点必然 403。

### 3.4 空窗期消除（规划项）

- 账号创建与角色绑定在同一 provisioning 步骤完成；任一失败回滚该账号。
- `admin` 已由 `--with-admin` 实现；下列断言仍为规划，尚未接入脚本：
  - 两个账号各有且仅有 1 条 `core_user_roles` 绑定、1 条 `core_tenant_users` 成员关系。
  - `tenant_admin` 的平台排除集权限数 = 0；`admin` 的角色权限覆盖 = 全量权限数。

## 4. JWT claims 契约

### 4.1 本轮（可交付）

- token 只承载：`sub`、`username`、`role`、`roles`（角色码）、`is_superuser`、`tenant_id`、组织/岗位、`must_change_password`、`exp/iat`。
- 权限码**不再逐码写入**：按模块压缩为 `module:*`（仅当该角色拥有该模块全部权限码时才压缩），未全覆盖的模块保留精确码；超管仍为 `["*"]`。
- 服务端与前端权限判定统一支持 `module:*` 通配，语义等价，不放大权限。
- 权限变更生效方式：本轮为「重新登录/刷新 token 后生效」；JWT 默认有效期到期即失效。

### 4.2 后续（未在本轮实施）

- 引入 `permission_version` + 服务端权限解析缓存（按 user_id + version，TTL 60s，角色/权限变更主动递增版本），token 完全移除权限码。
- 未实施原因：权限判定调用点 295 处、`AuthState` 无数据库/缓存句柄，一次性改造风险高；本轮先解决 nginx 8k 头限制并保持语义等价。

## 5. 当前实现与自检

实际入口只覆盖结构基线、参考数据、前向迁移与初始管理员；公司、根部门、`tenant_admin`
与组织清理仍为规划项，尚未接入脚本。

```bash
# 当前可用命令（基线供给 + 初始 admin）
bash scripts/db/provision-env.sh \
  --env test --db topems_clean \
  --with-admin --admin-username admin \
  --admin-password-file "$HOME/.topems-secrets/admin.txt" \
  --health-url http://127.0.0.1:8099/health \
  [--reset-admin-password]
```

流程：建库/连库 → 结构基线 + 账本 → 参考数据 → 前向迁移（> anchor）
→ 账本/表数/锚点/参考数据行数/核心表指纹校验 →（可选）`admin` 创建与登录自检。

已实现自检：
1. 账本版本、锚点、表数、参考数据行数、核心表指纹校验通过。
2. `--with-admin` 时：账号可创建/重置，密码哈希经同一 `verify_password` 正反校验，登录接口可返回 200。
3. 任一探测或校验失败即非零退出，不回落 `sqlx migrate run`。

规划自检（未实现，待接入脚本）：
1. 租户=1、公司=1 且名称非空、根部门=1 且 `parent_id IS NULL`、岗位=0。
2. `admin` 角色权限覆盖=`core_permissions` 全量；`tenant_admin` 平台权限=0。
3. `admin` 与 `tenant_admin` 两账号角色绑定=1、租户成员=1。
4. `tenant_admin` 与 `admin` 的权限差集仅平台排除集。
5. 业务表代表清单均为 0 行；`core_users`/`mobile` 演示账号=0。

失败回滚：
- 参考数据/种子阶段使用单事务；任一 SQL 失败即整体回滚。
- 若本次运行创建/重建了目标库，脚本自动 `DROP DATABASE ... WITH (FORCE)` 并给出提示；
- 目标库为既有空库时只中止，不删除，输出人工回滚命令。

## 6. 默认角色缺失权限码处置（已落地口径）

| 旧码（`iam.roles`） | 结论 | 实际修正 |
|---|---|---|
| `self:read` / `self:write` | 自助端点为 auth-only，无对应权限码 | 删除，不再造码 |
| `attendance:read` | 命名未加模块前缀 | `hrm:attendance:read` |
| `attendance:approve` | 无独立考勤审批码；普通员工不授予 | `employee` 删除；`dept_manager` 审批以 `hrm:leave:update` 表达 |
| `attendance:apply` | 自助打卡为 auth-only；`hrm:attendance:create` 已在批 25 删除 | `employee` 删除，保留 `hrm:attendance:read` 查看 |
| `leave:apply` | 自助请假为 auth-only；`hrm:leave:create` 属管理侧代录 | `employee` 删除并保留 `hrm:leave:read`；`dept_manager` 以 `hrm:leave:update` 审批 |
| `payroll:read` | 命名未加模块前缀 | `hrm:payroll:read` |
| `recruitment:read` | 命名未加模块前缀；普通员工不授予 | `hrm:recruitment:read`（仅 `dept_manager`） |
| `recruitment:write` | 无 write 伞码；普通员工不授予 | `hrm:recruitment:create` + `hrm:recruitment:update`（仅 `dept_manager`） |

落地结果：
- `employee` 收敛为 6 个已定义只读码：`hrm:read`、`hrm:dashboard:read`、`hrm:employee:read`、`hrm:attendance:read`、`hrm:leave:read`、`hrm:payroll:read`。
- `dept_manager` 收敛为 8 个已定义码：`hrm:read`、`hrm:write`、`hrm:attendance:read`、`hrm:leave:read`、`hrm:leave:update`、`hrm:recruitment:read`、`hrm:recruitment:create`、`hrm:recruitment:update`。
- 迁移 `20261108091000` 仅处理 `employee`；`dept_manager` 由种子 UPSERT 或生产窗口定向 UPDATE 修正。
