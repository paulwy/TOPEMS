# 初始设置实测记录（空库 → 第一个管理员可用）

> 目的：在完全隔离的 scratch 环境中，从空库真跑一遍迁移 + provision + 首个 admin 创建与登录，记录实际体验、数据结果、失败路径与摩擦点。
> 结论先行：**当前流程存在 P0 阻断，不能按文档“一条命令”完成首次设置；但底层设计方向正确，修复断言与几处体验问题后可达到可交付状态。**

---

## 0. 实测环境与隔离声明

| 项 | 值 |
|---|---|
| 时间 | 2026-11-08 07:57–08:05（Asia/Shanghai） |
| 仓库 | `/Users/air/TOPEMS`，HEAD `b4d3ecee4` |
| 数据库 | 本地 PostgreSQL 18.4，socket `/tmp` |
| scratch 库 | `topems_init_trial_20261108_075710` |
| 连接身份 | `psql -h /tmp -U air`（owner）；服务运行时用已有的 `topems_app` 角色 + TCP |
| 服务端口 | `CORE_PORT=18080`（临时，未占用生产端口） |

隔离措施：

- 使用独立 scratch 库名，**未复用** `topems` / `topems_test` / `topems_prod`。
- 全程 `PGHOST=/tmp`，**未连接公网 5432、未连接 prod**；provision 显式加 `--skip-prod-fingerprint`，避免任何 prod 指纹比对连接。
- **未修改仓库 `.env`**；启动服务时通过环境变量临时覆盖 `DATABASE_URL` / `MIGRATE_URL` / `CORE_PORT`。
- 仓库内 `scripts/db/grant-topems-app.sql` 硬编码 `GRANT CONNECT ON DATABASE topems`，**未直接执行**；改为对 scratch 库执行等价的动态授权（仅影响该 scratch 库内的 schema/表/序列）。
- 未推送、未部署、未改生产；演练结束后清理 scratch 库、临时日志与口令文件。

> 说明：本次为节省时间，admin 工具通过 `TOPEMS_ADMIN_PASS_BIN=target/debug/topems-admin-pass` 使用已构建二进制；脚本默认行为是 `cargo run` 构建，逻辑相同。

---

## 1. 阶段一：从空库执行迁移 + provision

### 1.1 实际命令

```bash
cd /Users/air/TOPEMS
PGHOST=/tmp PGUSER=air bash scripts/db/provision-env.sh \
  --env dev \
  --db topems_init_trial_20261108_075710 \
  --with-admin \
  --skip-prod-fingerprint
```

### 1.2 实际结果（耗时 16.05s，exit 1）

```text
[PROVISION] env=dev db=topems_init_trial_20261108_075710 host=/tmp anchor=20261105235700
✓ 结构基线校验通过：prod_schema_20261105235700.sql.gz / prod_ledger_20261105235700.sql（表 1349，账本 576）
✓ 参考数据校验通过：baseline_20261105235700_data.sql.gz（11 张表 / 2277 行）
[PROVISION] 目标库不存在，创建：topems_init_trial_20261108_075710
✓ 已创建 topems_init_trial_20261108_075710
[PROVISION] 恢复基线 schema（约 1349 张表）...
[PROVISION] 恢复基线账本（576 条）...
✓ 基线快照恢复完成
[PROVISION] 恢复参考数据（11 张表 / 2277 行）...
✓ 参考数据行数与元数据一致（11 张表 / 2277 行）
✓ 锚点校验通过：表 1349 / 账本 576 / max(version) 20261105235700
[PROVISION] 前向迁移：apply-forward.sh --anchor 20261105235700
== 待应用 46 条（anchor=20261105235700）
...
== OK：应用 46 条，失败 0
✗ 前向后表数少于基线：1343 < 1349
```

耗时拆解：`real 16.05s / user 2.06s / sys 1.95s`。

### 1.3 结论：P0 阻断

- 建库、1349 表结构基线、2277 行参考数据、46 条前向迁移全部成功；账本 576 → **622**，`max(version)=20261107000046`。
- 但脚本最后的终态断言写死 `表数 ≥ 基线 1349`，而 46 条前向迁移中包含合法的 `DROP TABLE`（影子表/死表清理、表重命名），实际表数为 **1343**，于是脚本 exit 1。
- 因为 admin 创建位于终态校验之后，**本次 `--with-admin` 没有执行**，库内 `iam.users = 0`。
- 也就是说：按文档唯一受支持的供给入口，**全新空库首次部署目前必然失败**。

表级差异（baseline → 当前，净 -6）：

| 删除（10） | 新增（4） |
|---|---|
| `communication.core_email_templates` | `master_data.mdm_data_asset_categories` |
| `communication.core_emails` | `master_data.mdm_supplier_categories` |
| `communication.core_geofences` | `master_data.mdm_suppliers` |
| `communication.core_notification_templates` | `master_data.mdm_sync_dead_letter` |
| `communication.core_notifications` | |
| `crm.core_crm_customers` | |
| `erp.core_erp_suppliers` | |
| `master_data.core_dict_items` | |
| `master_data.core_dict_types` | |
| `master_data.mdm_asset_categories` | |

这些都是前向迁移显式执行的删除/新建，不是恢复失败；问题只在**断言口径**。

### 1.4 失败后的恢复路径

脚本提示只给出 `--force-nonempty`（会 DROP + CREATE），但重跑会再次命中同一个断言，形成循环。实际可用的恢复入口是脚本自身支持的：

```bash
PGHOST=/tmp PGUSER=air bash scripts/db/provision-env.sh \
  --env dev --db topems_init_trial_20261108_075710 --admin-only
```

本次 admin 阶段就是用 `--admin-only` 继续验证的。

---

## 2. 阶段二：第一个 admin 创建与登录

### 2.1 创建命令（耗时 2.65s，exit 0）

```bash
PGHOST=/tmp PGUSER=air \
TOPEMS_ADMIN_PASS_BIN=/Users/air/TOPEMS/target/debug/topems-admin-pass \
bash scripts/db/provision-env.sh \
  --env dev --db topems_init_trial_20261108_075710 --admin-only
```

关键输出：

```text
✓ 关键数据完整：admin 角色权限 242 条；权限点 1128；菜单 449；字典类型 6
[PROVISION] 初始管理员：username=admin email=admin@topems.com
[PROVISION] 创建初始管理员...
OK 哈希已写入 0600 文件；verify_password 正/反向自校验通过

初始管理员密码（仅本次显示）：w7i6****************（20 位，已打码）
⚠️  请立即保存；本脚本不会再次显示，也不会写入仓库/日志。

✓ 用户行校验通过：status=active / deleted_at IS NULL
✓ 角色绑定校验通过：core_user_roles → core_roles(name=admin)
✓ 密码哈希正/反向校验通过（verify_password 同一实现）
✓ 初始管理员创建并校验通过：admin <admin@topems.com>
```

### 2.2 口令与落地方式

| 问题 | 实测答案 |
|---|---|
| 口令怎么来 | 默认**自动生成** 20 位，含大写/小写/数字；也可 `--admin-password-stdin` 人工给 |
| 是否只打印一次 | 是，仅 stderr 一次；重跑 `--admin-only` 不再打印 |
| 是否落盘明文 | 默认**不落盘**；临时目录 `mktemp` 0600，退出即清理；仓库、`.env`、应用日志均无明文 |
| 是否强制首登改密 | **否**：`must_change_password=false`，`password_changed_at=NULL` |
| 创建后能否立即登录 | **能**：HTTP 200，无需额外激活/审批 |

验证：`/tmp/topems-admin.*` 无残留；服务日志中口令命中 0 次；仓库无新增文件。

### 2.3 admin 数据行

```text
id                   | e60e7a16-d2ed-4f94-9cbe-d25de7451c0d
username             | admin
email                | admin@topems.com
status               | active
is_active            | t
is_superuser         | t
roles                | {admin}
must_change_password | f
password_changed_at  | (NULL)
created_at           | 2026-11-08 07:57:56+08
deleted_at           | (NULL)
core_user_roles      | 1 条（→ core_roles.name=admin）
```

### 2.4 真实 HTTP 登录

```bash
curl -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<初始密码>"}' \
  http://127.0.0.1:18080/api/core/iam/auth/login
```

结果 **HTTP 200**，解析后：

```json
{
  "roles": ["admin"],
  "permissions": ["*"],
  "is_superuser": true,
  "must_change_password": false,
  "tenant_id": "00000000-0000-0000-0000-000000000001"
}
```

### 2.5 口令重置路径（运维场景）

```bash
printf 'NewAdminPass2026!\n' | \
PGHOST=/tmp PGUSER=air TOPEMS_ADMIN_PASS_BIN=target/debug/topems-admin-pass \
bash scripts/db/provision-env.sh --env dev --db <scratch> --admin-only \
  --reset-admin-password --admin-password-stdin \
  --admin-password-file /tmp/topems_admin_pw_trial.txt
```

实测：`--admin-password-file` 生成 `0600` 文件（位于仓库外），旧口令登录 **401**，新口令登录 **200**，`password_changed_at` 被置位，哈希正/反向校验通过。

---

## 3. 阶段三：初始库数据清单

### 3.1 表规模

- 迁移后总表数：**1343**（public 207、portal 118、finance 116、master_data 95、iam 78、ehs 71、mes 51、erp 49、lims 45、pm 40、qms 40、wms 39、flow 37、scm 37、hrm 32 ……）。
- 非空表：**21 张**；其余 1322 张为空。
- 账本：`public._sqlx_migrations` **622** 条，`max(version)=20261107000046`。

### 3.2 种子数据逐类条数

| 类别 | 表 | 条数 | 判定 |
|---|---|---:|---|
| 权限点 | `public.core_permissions` | 1128 | 系统种子，保留 |
| 角色-权限 | `public.core_role_permissions` | 1126 | 系统种子，保留 |
| 角色 | `public.core_roles` | 25 | admin + 24 个 manager 角色，保留 |
| 菜单 | `public.core_menus` | 449 | 系统种子，保留 |
| 菜单组 | `public.core_menu_groups` | 141 | 系统种子，保留 |
| 字典类型 | `public.core_dict_types` | 6 | 系统基础字典，保留 |
| 字典项 | `public.core_dict_items` | 24 | 系统基础字典，保留 |
| 部门 | `hrm.departments` | 23 | 标准组织树，保留 |
| 岗位 | `hrm.positions` | 20 | 标准岗位，保留 |
| 租户 | `public.core_tenants` | 1 | 默认租户，保留 |
| 租户设置 | `public.core_tenant_settings` | 4 | 文件大小/密码策略/会话超时，保留 |
| 资产分类 | `erp.asset_categories` | 28 | GB/T 14885 标准分类，**非演示数据** |
| 供应商分类 | `master_data.mdm_supplier_categories` | 1 | 标准分类，非演示数据 |
| 租户-用户绑定 | `public.core_tenant_users` | 0 | 空；登录回落默认租户 |

**演示/示例数据：无。** 业务单据、客户、供应商、生产订单、实验室记录等业务表全部为 0；`core_faqs` / `core_guides` 也为 0。当前种子只有“系统运行必需的配置数据 + 标准主数据”，这一定位是合理的。

### 3.3 运行态数据（本次实测产生，非初始种子）

| 表 | 登录/操作后条数 | 说明 |
|---|---:|---|
| `public.audit_logs` | 17 | 本次 HTTP 操作产生 |
| `public.core_login_logs` | 11 | 登录记录 |
| `public.core_sessions` | 10 | 会话 |
| `public.core_refresh_tokens` | 10 | 刷新令牌 |
| `iam.users` | 2 | admin + 测试用户 norole1 |
| `public.core_user_roles` | 2 | admin；norole1 在失败路径测试中被绑定 |
| `public.schema_defense_ledger` | 1 | 服务启动自检写入 |

> 真正的“刚供给完、未登录”状态应为：`iam.users=1`、`core_user_roles=1`、审计/会话/令牌/登录日志均为 0；本次为了实测登录与失败路径，产生了上述运行态行。

### 3.4 角色权限分布

25 个角色均有权限绑定，admin 242 条、finance_manager 82、mes_manager 75、scm_manager 59 …… ticket_manager 5。  
但 **admin 的 242 条权限不包含路由门所需的 `iam:read`**（详见 §6.3），真正让 admin 全通的是 `is_superuser=true`。

---

## 4. 阶段四：无角色普通用户实测

通过 admin API 创建用户（未分配任何角色）：

```bash
POST /api/core/iam/users
{"username":"norole1","email":"norole1@example.com","password":"Passw0rd!","full_name":"No Role User"}
→ HTTP 201
```

登录结果（HTTP 200）：

```json
{
  "roles": ["user"],
  "permissions": [],
  "is_superuser": false,
  "must_change_password": false
}
```

注意：`core_user_roles` 实际 0 条；`roles:["user"]` 是登录侧对空角色数组的**兜底标签**，不是数据库里的真实角色。

接口可达性（HTTP 实测，使用 norole1 token）：

| 接口 | 状态码 | 说明 |
|---|---:|---|
| `GET /api/core/iam/users/me` | 200 | 自助读自己 |
| `GET /api/core/iam/permissions/my-permissions` | 200 | 空数组 |
| `GET /api/core/iam/users` | 403 | 需要 `iam:read` |
| `GET /api/core/iam/roles` | 403 | 需要 `iam:read` |
| `GET /api/core/iam/positions` | 403 | 需要 `iam:read` |
| `GET /api/core/tenant/list` | 403 | 需要 `iam:tenant:read` |
| `GET /api/core/flow/workflows` | 403 | 需要 `workflow:read` |
| `GET /health` | 200 | 公开健康检查 |

结论：无角色用户可以登录，但只能看“自己”；所有业务/管理接口 403。权限收口本身是有效的，问题是 JWT 里的 `user` 标签会造成“我是不是有普通用户角色”的误解。

---

## 5. 阶段五：幂等与重复执行

### 5.1 完整 provision 重跑

```bash
PGHOST=/tmp PGUSER=air bash scripts/db/provision-env.sh \
  --env dev --db topems_init_trial_20261108_075710 --with-admin --skip-prod-fingerprint
```

结果：**0.42s，exit 1**，在连接/写入前命中非空守卫：

```text
✗ 拒绝：目标库非空（restore 属覆盖写，需显式 --force-nonempty）
  已存在表数  : 1343
  账本        : 成功记录 622 条，最大版本 20261107000046
```

- 未覆盖 admin 口令、未产生重复数据、未改任何表。
- 提示的 `--force-nonempty` 是破坏性重建；对本 P0 而言，重跑仍会再次失败。

### 5.2 `--admin-only` 重跑

结果：**0.53s，exit 0**：

```text
用户已存在，跳过创建与密码修改（如需重置请显式 --reset-admin-password）
✓ 用户行校验通过：status=active / deleted_at IS NULL
✓ 角色绑定校验通过：core_user_roles → core_roles(name=admin)
✓ 已存在，跳过（未修改密码）
```

- 不再生成/打印口令；
- 用户数仍为 2（admin、norole1），未重复创建 admin；
- 原口令登录仍 **200**，确认未被覆盖；
- 只有显式 `--reset-admin-password` 才会改密码。

---

## 6. 阶段六：失败路径

| 用例 | 实际结果 | 是否留下半成品 |
|---|---|---|
| 弱口令 `123`（重置） | exit 1：`密码长度不足 6 位（产品代码校验规则）`；admin 哈希前后完全一致 | 否 |
| 6 位弱口令 `abcdef` | **被接受**，重置成功，登录 200；与 API 密码策略（最小 8 位 + 数字/大写/小写）不一致 | 否，但暴露策略不一致 |
| 邮箱冲突：`--admin-username admin2 --admin-email admin@topems.com` | exit 1：`邮箱 admin@topems.com 已被用户 admin 占用；拒绝将其提升为管理员` | 否，无新用户 |
| 已存在用户名：`--admin-username norole1 --admin-email norole1@example.com` | **exit 0**，静默把 `core_user_roles` 绑定到 admin，打印“已存在，跳过（未修改密码）” | 否，但**静默提权** |
| 非法用户名 `x` | exit 1：`--admin-username 仅允许字母/数字/点/下划线/连字符，长度 3-100：x` | 否 |
| `--admin-password-stdin` 但未给 `--with-admin` | exit 1：`--admin-password-stdin 需要同时指定 --with-admin` | 否 |
| `--dsn` 与 `--db` 同时给 | exit 1：`--dsn 与 --db 只能二选一` | 否 |
| 非法邮箱 `bad-email` | exit 1：`--admin-email 格式非法` | 否 |
| HTTP 创建重名用户 | 409：`用户名已存在`；用户总数不变 | 否 |
| HTTP 创建缺密码用户 | 400：`密码是必填字段`；用户总数不变 | 否 |

### 6.1 已存在用户名被静默提升为管理员（P1）

执行后：

```text
username | role
admin    | admin
norole1  | admin
```

norole1 再次登录返回 `roles=["admin"]`、`permissions` 242 条，但 `is_superuser=false`；随后访问 `/iam/users`、`/iam/roles`、`/iam/permissions` 仍全部 **403**。

这说明两件事：

1. 运维若把 `--admin-username` 误写成某个既有普通用户，系统不会报错，而是**用该用户原有口令静默授予 admin 角色**；
2. admin 角色本身不足以访问 IAM 管理接口，真正生效的是 `is_superuser`。

### 6.2 密码策略不一致（P1）

- 租户设置 `security.password_min_length=8`、`security.password_require_complexity=true`；
- `GET /api/core/iam/auth/password-policy` 返回 `min_length=8`、`require_digit/uppercase/lowercase=true`；
- 但 provision 校验口径是 **6–64 字节**，不校验复杂度；实测 `abcdef` 可被接受并成功登录。

### 6.3 admin 角色缺少路由门权限码（P1）

- 路由门要求：`iam:read`、`iam:tenant:read`、`workflow:read` 等；
- 权限表里存在 `iam:read`，但 **admin 角色的 242 条授权中 0 条包含 `iam:read`**；
- 因此 `is_superuser=false` 的“admin 角色用户”无法访问 `/iam/users` 等管理接口；
- 首个 admin 之所以可用，完全依赖 provision 写入的 `is_superuser=true`。

---

## 7. 摩擦点汇总（按实际操作顺序）

1. **P0：主流程必然失败**。`provision-env.sh` 终态断言 `表数 ≥ 1349` 未考虑前向迁移中的合法 DROP，实测 1343，直接 exit 1，`--with-admin` 根本没执行。
2. **P0：失败后无正确恢复提示**。脚本只提示 `--force-nonempty`，照做会再次失败；实际需要 `--admin-only`，但提示里没有。
3. **P0：失败留下“可用结构 + 无管理员”的半成品环境**。此时数据库看起来已供给完成（1343 表、622 账本、参考数据齐全），但没有 `iam.users`，运维不知道下一步该跑什么。
4. **P1：已存在用户名静默提权**。`--admin-username` 命中既有用户时不报错、不改密码、直接绑 admin 角色。
5. **P1：密码策略双口径**。DB/API 要求 8 位 + 复杂度，provision 接受 6 位任意字符；人工传弱口令不会被拦。
6. **P1：admin 角色与路由门不一致**。admin 角色缺 `iam:read`，只能靠 `is_superuser` 全通；“角色 admin”不等于“能管理 IAM”。
7. **P1：供给成功 ≠ 服务能启动**。provision 只验证 SQL 可执行，不验证运行角色权限与服务连通；本次 scratch 用 `air` 供给后，`topems_app` 需要手工动态 GRANT 才能启动服务。仓库 `grant-topems-app.sql` 又硬编码 `topems`，自定义库无法直接运行。
8. **P2：空角色被伪装成 `user`**。登录返回 `roles:["user"]`，但数据库无任何角色绑定，容易被误读。
9. **P2：无强制首登改密**。首个 admin 的 `must_change_password=false`、`password_changed_at=NULL`；随机 20 位口令本身强度够，但如果走 `--admin-password-stdin` 传弱口令，没有任何补偿。
10. **P2：口令只打印到 stderr**。在 CI/日志采集环境中，stderr 同样会落盘；脚本宣称“不写入日志”但无法控制调用方重定向。
11. **P2：默认 `--with-admin` 关闭**。忘记加参数会得到一个“成功但无人能登录”的环境；结尾只有一行“未创建”，不够醒目。
12. **P2：文档与实测数字不一致**。文档仍写“表 1349 / 账本 576 / 参考数据 2277”，前向后实际为 1343 / 622；验证记录未覆盖“前向含 DROP”的新情况。
13. **P2：没有 `--status` / `--doctor`**。运维无法一条命令确认：库是否供给完成、admin 是否存在、运行角色是否有权限、服务能否连上。
14. **P3：噪声较多**。`set_config` 输出、`schema_defense` 的 `must be owner of table` WARN、可选 Redis 的 `XREADGROUP timed out` 会掩盖真正的错误。

---

## 8. “初始数据应该保留什么 / 清空什么”的判断

### 8.1 应保留（本次实测已保留）

- `core_tenants`（默认租户 1 条）、`core_tenant_settings`（4 条）；
- `core_roles`（25）、`core_permissions`（1128）、`core_role_permissions`（1126）；
- `core_menus`（449）、`core_menu_groups`（141）；
- `core_dict_types`（6）、`core_dict_items`（24）；
- `hrm.departments`（23）、`hrm.positions`（20）；
- `erp.asset_categories`（28）、`master_data.mdm_supplier_categories`（1）等标准主数据；
- `schema_defense_ledger`（运行期自检账本，1 条）可保留，不属于业务数据。

### 8.2 应清空 / 不应进入初始包

- `audit_logs`、`core_sessions`、`core_refresh_tokens`、`core_login_logs`：运行态，交付前应为 0；
- 测试用户（如 `norole1`）及任何演示账号；
- 业务单据、客户/供应商主数据、生产/实验室/财务记录：本次实测均为 0，方向正确；
- `iam.users` 与密码哈希：**不应**进入基线（当前已正确排除，仅由 `--with-admin` 创建）。

### 8.3 可选

- `core_faqs` / `core_guides`（帮助内容）：当前 0 条，不影响登录与鉴权；若产品要求首屏有引导，可作为可选种子，但不应混入“系统必需数据”。

---

## 9. “设置第一个用户”的注意事项

1. **优先用随机口令 + 安全传递**：默认随机 20 位是安全的；若必须人工指定，用 `--admin-password-stdin` 或 `--admin-password-file`（仓库外 0600），不要写在命令行 argv。
2. **明确是否强制首登改密**：当前没有。建议对人工传入的口令强制 `must_change_password=true`，或在首次登录后要求改密。
3. **不要依赖“admin 角色”**：当前 admin 角色缺 `iam:read`，首个用户必须 `is_superuser=true`；如果未来要取消 superuser，需要先补齐角色权限码。
4. **既有用户必须先确认**：`--admin-username` 命中既有用户时应默认拒绝，必须显式 `--allow-existing-user` 才允许绑定，避免静默提权。
5. **显式绑定租户**：当前 `core_tenant_users=0`，登录回落默认租户；单租户可用，多租户场景建议创建时显式绑定。
6. **创建后立即做一次真实登录**：不要只看脚本的哈希校验；HTTP 登录能同时验证租户、状态、角色、权限装配。

---

## 10. 改进建议（按严重程度）

### P0（阻塞首次部署）

1. **修复终态表数断言**：不要用 `表数 ≥ 基线`；改为
   - 方案 A：前向迁移执行后，按 `database/baseline` 的表清单做差异，只允许“本次前向迁移显式删除/重命名”的差异，其余缺失 fail-closed；
   - 方案 B：在前向 DDL 后按文档 §4 前移锚点并重生成基线，让基线包含 1343 表；同时保留关键表存在性校验。
2. **让 `--with-admin` 不被终态校验“饿死”**：至少在校验失败时，明确打印“结构/数据已就绪，可执行 `--admin-only` 继续创建管理员”，而不是只提示 `--force-nonempty`。
3. **增加供给后自检**：用运行角色 DSN 连接一次、检查 `iam.users` 是否存在、检查服务端口 `/health` 是否 200；不通过则明确 fail-closed。
4. **文档更新**：把实测表数/账本数改为当前值，并补充“前向迁移含 DROP 时如何处理”的说明。

### P1（易错 / 安全）

5. **既有用户保护**：`--admin-username` 命中既有用户时默认 exit 1；仅 `--allow-existing-user` + 显式确认才允许绑定 admin，并打印“将提升既有用户”的强警告。
6. **统一密码策略**：provision 改为复用租户/API 的密码策略（最少 8 位、数字/大写/小写），或明确文档化“初始口令只校验长度”的例外；不要让 6 位弱口令通过。
7. **修正 admin 角色权限码**：把路由门实际使用的 `iam:read`、`iam:tenant:read` 等纳入 admin 角色；或在文档与代码中明确“admin 必须 `is_superuser=true`”，不要让“角色 admin”产生歧义。
8. **把运行角色授权纳入供给**：provision 末尾自动执行动态 GRANT（按目标库名，不硬编码 `topems`），并用运行角色做一次连接/查询自检。
9. **首个 admin 强制改密选项**：新增 `--require-first-login-password-change`，或默认对人工传入口令置 `must_change_password=true`。

### P2（体验）

10. 空角色不要返回伪造的 `user`：要么返回 `roles:[]`，要么返回明确的 `no_roles` 状态，避免前端误判。
11. 口令输出改为“仅写入显式指定的 0600 文件”或提供 `--quiet`，避免 CI stderr 落盘。
12. 未加 `--with-admin` 时，在结尾用醒目 WARN 提示“当前环境无人可登录”。
13. 增加 `provision-env.sh --status` / `--doctor`：输出表数、账本 max、参考数据、admin 是否存在、运行角色权限、服务连通性。
14. 降低噪声：恢复时的 `set_config` 输出、非 owner 的 `schema_defense` WARN、可选 Redis 超时，默认降级为 debug 或汇总一行。
15. `--force-nonempty` 的提示补一句“会重新执行同一批前向迁移；若前向包含合法 DROP，仍可能触发表数断言”。

---

## 11. 总体判断

**目前不合理（P0 阻断）**：按文档的单入口命令无法从空库完成首次设置，且失败后没有正确的恢复提示；运维会卡在“库看起来好了，但没有管理员”。

**底层设计方向合理**：

- “基线快照 + 只应用 > anchor 的前向迁移”解决了历史迁移链断点，16 秒完成全库供给，速度可接受；
- 参考数据范围控制得当，无 PII、无业务单据、无演示数据；
- 默认关闭 `--with-admin`、随机口令、仅打印一次、哈希正反向自校验、临时材料清理，这些安全设计是对的；
- `--admin-only` 幂等跳过、显式重置、非空守卫，都是正确的运维语义。

**修复 P0 的表数断言 + 失败恢复提示后，流程可达到“基本合理”；再修 P1 的既有用户保护、密码策略、admin 权限码与运行角色授权，可达到“可交付给运维照做”。**

---

## 12. 复现命令（隔离环境）

```bash
# 1) 空库供给（scratch；服务需先以该空库启动，健康检查才有目标）
PGHOST=/tmp PGUSER=air bash scripts/db/provision-env.sh \
  --env dev --db topems_init_trial_<timestamp> \
  --with-admin --admin-password-stdin \
  --runtime-role topems_app \
  --runtime-dsn 'postgresql://<runtime_user>:<pwd>@127.0.0.1:5432/topems_init_trial_<timestamp>' \
  --health-url http://127.0.0.1:18080/health \
  --skip-prod-fingerprint

# 2) 非空库重跑会 exit 1，并按账本状态打印可直接复制的 --admin-only / apply-forward
#    / --force-nonempty 命令，不会再把 --force-nonempty 当作唯一答案。

# 3) 启动服务（仓库 .env 不改，运行时覆盖 DSN）
env DATABASE_URL='postgresql://<runtime_user>:<pwd>@127.0.0.1:5432/topems_init_trial_<timestamp>' \
    MIGRATE_URL='postgresql://<runtime_user>:<pwd>@127.0.0.1:5432/topems_init_trial_<timestamp>' \
    CORE_PORT=18080 \
    ./target/debug/topems-unified-core

# 4) 登录
curl -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<初始密码>"}' \
  http://127.0.0.1:18080/api/core/iam/auth/login
```

> 若在真实新环境使用，不要加 `--skip-prod-fingerprint`；应提供 `--prod-ssh` / `--prod-dsn` 做只读指纹比对。

---

## 13. 清理记录

演练结束后已执行：

- 停止 `CORE_PORT=18080` 的服务进程；
- `DROP DATABASE topems_init_trial_20261108_075710 WITH (FORCE)`；
- 删除 `/tmp/topems_admin_pw_trial.txt`、`/tmp/topems_init_trial_server.log` 及本次临时查询结果文件；
- 未修改仓库 `.env`、未推送、未部署、未触碰生产库。

清理后如需复核，可按 §12 用新的时间戳重新创建 scratch 库。

---

## 14. 修复后复测（2026-11-08，基线规范已更新）

§1–§11 保留首轮演练的**原始问题记录**；本节是修复后的权威实测结果。修复项与复核如下。

### 14.1 空库 → 一条命令 → admin 可用

scratch 库 `topems_init_trial_fix2_20261108_083134`（空库），服务先以该库启动，随后执行：

```bash
PGHOST=/tmp PGUSER=air bash scripts/db/provision-env.sh \
  --env dev --db topems_init_trial_fix2_20261108_083134 \
  --with-admin --admin-password-stdin \
  --runtime-role topems_app \
  --runtime-dsn 'postgresql://topems_app:<pwd>@127.0.0.1:5432/topems_init_trial_fix2_20261108_083134' \
  --health-url http://127.0.0.1:18080/health \
  --skip-prod-fingerprint
```

实测 **exit 0，耗时 8s**，关键输出：

- 锚点：表 1349 / 账本 576 / `max(version)=20261105235700`；
- 前向：**47 条**，账本 **623**，表 **1349 → 1343（净变更 −6）**，`max(version)=20261108090000`；
- 必需表校验：**32 张**全部存在（不再断言总表数）；
- 参考数据前向增量：`core_roles 15→25`、`core_permissions 986→1128`、`core_role_permissions 653→2012`、`core_menu_groups 122→141`、`core_menus 423→449`；
- admin 权限：**1128 条**，含 `iam:read`；
- 运行角色：`topems_app` 已按当前库授权并通过连接自检；
- 健康检查：`/health → 200`。

登录与 IAM 实测：

| 验证 | 结果 |
| --- | --- |
| `POST /api/core/iam/auth/login`（admin） | **200** |
| `GET /api/core/iam/users`（Bearer admin） | **200**（修复前 403） |
| `GET /api/core/iam/roles`（Bearer admin） | **200**（修复前 403） |

### 14.2 非 superuser 的 admin 角色路径（不再依赖超管标志）

创建普通用户 `norole2`（`is_superuser=false`）并显式 `--escalate-existing` 绑定 admin 角色后：

- 登录 payload：`is_superuser=false`、`roles=["admin"]`、权限 **1128** 条（含 `iam:read`）；
- `GET /api/core/iam/users` → **200**；`GET /api/core/iam/roles` → **200**。
- 结论：**绑角色**与**超管标志**两条路径均无可见 403。

### 14.3 空角色展示

无任何 `core_user_roles` 的 `norole2` 登录后 `GET /users/me`：

- `roles = []`，`role = ""`（修复前伪造为 `["user"]` / `"user"`）。

### 14.4 失败路径复测

| 场景 | 实测 |
| --- | --- |
| 非空库重跑（未加 `--force-nonempty`） | **exit 1**；打印库名/表数/账本 max；已完整前向时给出完整可复制的 `--admin-only` 命令，并明确「不要用 --force-nonempty」；含口令的运行角色 DSN 不在输出中回显 |
| 原样执行提示中的 `--admin-only` 命令 | **exit 0**，自检通过 |
| `--admin-only --reset-admin-password` 传 6 位 `abc123` | **exit 1**：`密码长度不能少于 8 位`；旧密码登录仍 200（未落库） |
| `--admin-username` 指向既有非管理员 `norole2` | **exit 1**，默认拒绝提升 |
| 同上 + `--escalate-existing` | **exit 0**，输出 `⚠️ --escalate-existing：将把既有用户 norole2 提升为管理员（保留原密码）` |
| 完整供给未加 `--with-admin` | **exit 0**，但打印红色醒目 WARN：无初始管理员、任何人无法登录 |

### 14.5 旧数字更正

首轮报告的账本 `622 / max(version)=20261107000046` 是修复前那次跑出来的；当前基线规范 + 新增
`20261108090000_admin_role_grant_all_permissions.sql` 后，终态为 **账本 623 / max(version)=20261108090000**。
表数 **1343**（净变更 −6）保持不变。

### 14.6 清理

复测结束后已停止 `CORE_PORT=18080` 服务，并 DROP 以下 scratch 库：

- `topems_init_trial_fix_20261108_082543`（首轮修复验证用）
- `topems_init_trial_fix2_20261108_083134`（一条命令复测用）
- `topems_init_trial_fix3_20261108_083223`（`--with-admin` 未启用告警验证用）

未修改仓库 `.env`，未推送，未部署，未触碰生产库。
