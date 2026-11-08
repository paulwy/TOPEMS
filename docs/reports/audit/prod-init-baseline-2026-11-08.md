# 生产库系统初始化基线落地报告（topems_prod）

- 执行时间：2026-11-08 08:25–08:33（Asia/Shanghai）
- 目标库：`topems_prod` @ `xingzhai@192.168.110.115`（PostgreSQL 18 / Homebrew）
- 依据：用户拍板的初始化口径（租户/公司/部门/岗位/权限三分层/第一个用户）
- 边界遵守：**无 DDL、无代码改动、无部署、无推送、未重启服务**；仅 `INSERT` / `UPDATE`（本次未删除任何数据）

---

## 一、动手前查清的表结构

| 实体 | 实际落表 | 说明 |
|---|---|---|
| 租户 | `public.core_tenants` | 已有 1 个默认租户，未新增 |
| 公司（法人主体） | `hrm.companies` | 独立表，非租户字段；`tenant_id`、`organization_id` 均落在 `00000000-0000-0000-0000-000000000001` |
| 部门/组织树 | `hrm.departments` | `parent_id` 自引用构成树；`company_id` 指向公司；无外键约束（仅 `positions.department_id` 有 FK） |
| 岗位 | `hrm.positions` | 保持空（本次不写入） |
| 角色（业务侧展示/外键） | `iam.roles` | `role_id` 被 `iam.users.role_id` 外键引用，`permissions` 为 jsonb 展示副本 |
| 角色（授权真源） | `public.core_roles` + `public.core_role_permissions` + `public.core_permissions` | 非超管登录/刷新由 `resolve_user_grants` 从这三张表实时解析 |
| 用户 | `iam.users` | `is_superuser`、`roles`、`permissions` 反范式列 |
| 租户成员 | `public.core_tenant_users` | 受 FORCE RLS 保护；登录解析只认 `status='active'` |

> 权限判定链路（[models.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/models.rs#L123-L161)）：`core_user_roles → core_role_permissions → core_permissions`；`is_superuser=true` 时短路为 `permissions=["*"]`。

---

## 二、落地的目标基线（含 id 与关键字段）

### 2.1 租户（未改动）

| 字段 | 值 |
|---|---|
| id | `00000000-0000-0000-0000-000000000001` |
| name / code | 默认租户 / `default` |
| status | `active` |
| 数量 | 1（未预置示例租户） |

### 2.2 公司（新增，与租户 1:1）

| 字段 | 值 |
|---|---|
| id | `0a000000-0000-4000-8000-000000000001` |
| name | `企业全称（请修改）`（可改占位，非空） |
| short_name / status | 本企业 / `active` |
| tenant_id | `00000000-0000-0000-0000-000000000001` |
| organization_id | `00000000-0000-0000-0000-000000000001` |
| created_by | `56f4256f-369a-427b-9094-bff0c2a684f9`（admin） |

### 2.3 根部门（新增，唯一组织树根）

| 字段 | 值 |
|---|---|
| id | `0b000000-0000-4000-8000-000000000001` |
| name / code | `企业全称（请修改）` / `ROOT` |
| parent_id | `NULL`（根节点） |
| company_id | `0a000000-0000-4000-8000-000000000001` |
| manager_id | `0d000000-0000-4000-8000-000000000001`（tenant_admin，默认口径） |
| tenant_id / status | 默认租户 / `active` |
| 下属部门 | 未预置 |

### 2.4 岗位

`hrm.positions` 保持 **0 行**（断言校验通过）。

### 2.5 权限三分层

| 层级 | 载体 | 实际权限 |
|---|---|---|
| 平台超管 | `admin`：`is_superuser=true`，`iam 角色 super_admin ["*"]`，核心角色 `admin` 映射 1109 | 全部 1109 个有效权限码 |
| 租户管理员 | `tenant_admin`：`is_superuser=false`，`iam 角色 tenant_admin`，核心角色 `tenant_admin` 映射 1050 | 1050 个业务权限码，**平台级 0 个** |
| 普通用户 | `iam.roles.employee`（普通员工，最小权限 jsonb） | 见“五、遗留项 1” |

平台级排除口径（默认口径，共 59 个码）：前缀 `admin` / `system` / `migration` / `plugin` / `subscription` / `monitor` / `tenant`，外加 `iam:admin`、`iam:tenant:read`。

### 2.6 角色

| 载体 | id | 关键字段 |
|---|---|---|
| `iam.roles` | `33333333-3333-3333-3333-333333333004` | code=`tenant_admin`，name=租户管理员，is_system=true，permissions=1050 个码的 jsonb |
| `public.core_roles` | `0c000000-0000-4000-8000-000000000001` | name=`tenant_admin`，tenant_id=默认租户（租户级可见），`/roles` 列表对 tenant_admin 可见 1 条 |
| 映射 | `public.core_role_permissions` | tenant_admin 角色 1050 行；全表 1749（admin 1109 + 域管理员 640） |

### 2.7 第一个用户 `tenant_admin`

| 字段 | 值 |
|---|---|
| id | `0d000000-0000-4000-8000-000000000001` |
| username / email | `tenant_admin` / `tenant_admin@topems.local` |
| full_name / position | 租户管理员 / 租户管理员 |
| is_superuser / is_active / status | `false` / `true` / `active` |
| role_id（iam） | `33333333-3333-3333-3333-333333333004` |
| roles（反范式） | `{tenant_admin}`；`permissions` 列为 NULL，登录时从核心表实时解析 |
| department_id | `0b000000-0000-4000-8000-000000000001`（根部门） |
| 核心角色绑定 | `core_user_roles` 1 行 → `0c000000-0000-4000-8000-000000000001` |
| 租户成员关系 | `core_tenant_users` 1 行，id `0e000000-0000-4000-8000-000000000001`，tenant=默认租户，role=`admin` |
| must_change_password | `false` |

口令：20 位、含大写/小写/数字，bcrypt `$2b$12$` 存储；明文落在 `~/topems/secret/tenant_admin.txt`（权限 `600`），**不在本报告回显**。admin 账号与口令均未改动。

### 2.8 `admin` 保持平台运维账号

| 字段 | 值 |
|---|---|
| id | `56f4256f-369a-427b-9094-bff0c2a684f9` |
| is_superuser / roles | `true` / `{admin}` |
| iam 角色 | `super_admin`（`["*"]`） |
| 核心角色 | `admin`（1109） |
| 租户成员 | 无（`core_tenant_users` 无 admin 记录，登录走默认租户兜底） |

---

## 三、自检结果（全部通过，除 nginx 入口项，见四）

| 检查项 | 结果 |
|---|---|
| `/health`（8099） | **200** |
| `admin` 登录 | **200**，`is_superuser=true`，`roles=["admin"]`，`permissions=["*"]` |
| `tenant_admin` 登录 | **200**，`is_superuser=false`，`roles=["tenant_admin"]`，permissions=1050 |
| admin `/api/core/iam/users` | **200**（2 条） |
| admin `/api/core/iam/roles` | **200**（16 条） |
| admin `/api/core/iam/permissions` | **200**（1109） |
| admin `/api/core/menus` | **200**（449） |
| tenant_admin `/api/core/iam/users` | **200**（1 条，租户内可见性） |
| tenant_admin `/api/core/iam/roles` | **200**（1 条，仅租户级角色） |
| tenant_admin `/api/core/iam/permissions` | **200**（1109，只读目录） |
| tenant_admin `/api/core/menus` | **200**（419，按权限过滤） |
| 孤儿引用（core_user_roles / 部门父子 / 部门-公司 / 部门-manager） | 全部 **0** |
| 未验证外键 | **0** |

### 权限差异对比

| 指标 | 值 |
|---|---|
| admin 有效码（超管语义） | 1109 |
| tenant_admin 有效码 | 1050 |
| 仅 admin 持有 | **59**（即平台级排除集） |
| 仅 tenant_admin 持有 | **0** |
| tenant_admin 平台级越权 | **0** |
| tenant_admin 是否具备 `iam:read` / `iam:write` / `iam:user:read` / `iam:role:read` / `iam:permission:read` / `iam:structure:read` | 全部 **是** |
| tenant_admin 是否具备 `system:read` / `admin:iam:write` / `admin:iam:delete` | 全部 **否**（符合分层） |

---

## 四、发现的问题（需决策，未擅自处理）

### 4.1 【重要】tenant_admin 的 JWT 经 nginx 入口被拒（400）

- 现象：`tenant_admin` 登录成功，但 access_token 长度 **32,176 字符**（1050 个权限码全量写进 claims）。
- 实测：直连 8099 `/api/core/iam/users` → **200**；经 nginx（80 端口）同一请求 → **400**（请求头超限，nginx 默认 `client_header_buffer_size 1k / large_client_header_buffers 4 8k`）。
- `admin` 的 token 仅 561 字符（`["*"]` 短路），不受影响。
- 影响：租户管理员若经 nginx/前端入口日常使用，会被 400 拒绝，**当前不能算“可直接交付使用”**。
- 可选处置（均超出本次边界，需你拍板）：
  1. 调大 nginx 请求头缓冲（配置变更 + reload，属运维变更）；
  2. 代码层压缩权限（角色通配/模块级通配/令牌内不放全量码，改为按服务端查询），属改代码；
  3. 降低 tenant_admin 权限粒度（与“本租户全部业务权限”口径冲突，不建议）。
- 按“需要改代码/配置才能解决时先停下来报告”的约束，本次**未做任何改动**。

### 4.2 普通用户层缺核心授权映射（种子缺口）

- `iam.roles.employee` 的 jsonb 权限码中，`self:read`、`self:write`、`attendance:apply`、`leave:apply`、`payroll:read`、`attendance:read`、`attendance:approve`、`recruitment:read`、`recruitment:write` 在 `public.core_permissions` 中**均不存在**（仅 `hrm:read` 存在）。
- 因此无法在不新建权限码的前提下建立“普通用户”核心角色映射；按“不裸 SQL 硬塞/造码”的口径，本次未建 employee 核心角色，也未新建任何权限码。
- 建议由规范工作流决定：要么补种子权限码后建 `employee`/`user` 核心角色，要么把 `iam.roles.employee` 收敛到已存在的 `hrm:read` 一类码。

---

## 五、备份与回滚

### 5.1 备份

| 项目 | 路径 / 值 |
|---|---|
| 目录 | `~/topems/backups/pre_seed_20261108_082509/`（700 / 文件 600） |
| 全库 dump | `pre_seed_20261108_082509.dump`（4,064,624 B，1345 个 TABLE DATA 段） |
| dump sha256 | `beda40ae95fa838166527fe64ebdb103b622fae4436f4ccf1be403faa6687d6a` |
| 表副本 | `core_tenants`、`core_roles`、`core_role_permissions`、`core_user_roles`、`core_tenant_users`、`iam.users`、`iam.roles`、`hrm.companies`、`hrm.departments`、`hrm.positions` 共 10 个 CSV + `SHA256SUMS`（全部校验 OK） |

> 该备份发生在正式提交前，表副本中 `hrm.companies/departments/positions` 均为 0 行、`iam.users` 仅 admin、`core_user_roles` 仅 admin 绑定。

### 5.2 回滚（仅撤销本次初始化，精确可逆）

```sql
BEGIN;
DELETE FROM public.core_role_permissions
 WHERE role_id = '0c000000-0000-4000-8000-000000000001';
DELETE FROM public.core_user_roles
 WHERE user_id = '0d000000-0000-4000-8000-000000000001';
DELETE FROM public.core_tenant_users
 WHERE id = '0e000000-0000-4000-8000-000000000001';
DELETE FROM public.core_roles
 WHERE id = '0c000000-0000-4000-8000-000000000001';
DELETE FROM iam.users
 WHERE id = '0d000000-0000-4000-8000-000000000001';
DELETE FROM iam.roles
 WHERE id = '33333333-3333-3333-3333-333333333004';
DELETE FROM hrm.departments
 WHERE id = '0b000000-0000-4000-8000-000000000001';
DELETE FROM hrm.companies
 WHERE id = '0a000000-0000-4000-8000-000000000001';
COMMIT;
```
并删除 `~/topems/secret/tenant_admin.txt`。

整库回退（应急、需停机窗口、属 DDL 级）：`pg_restore --clean --if-exists --no-owner -d topems_prod pre_seed_20261108_082509.dump`。

---

## 六、默认口径清单（本次自行判定，待规范工作流复核）

1. 平台级权限排除集 = 前缀 `admin/system/migration/plugin/subscription/monitor/tenant` + `iam:admin` + `iam:tenant:read`（共 59 码）。
2. 公司名称占位 `企业全称（请修改）`；根部门复用同名、code=`ROOT`。
3. 根部门 `manager_id` 设为 `tenant_admin`。
4. `tenant_admin` 的 `core_roles` 放在**租户级**（tenant_id=默认租户），因此 `/roles` 对租户管理员只显示本租户角色。
5. 显式写入 `core_tenant_users` 成员关系（登录解析在 RLS 下仍回退默认租户，结果一致）。
6. `must_change_password=false`（首登不强制改密，避免阻断自检）。
