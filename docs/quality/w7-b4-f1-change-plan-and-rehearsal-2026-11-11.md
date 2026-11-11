# W7-B4-F1 改动方案与副本预演（2026-11-11）

> 范围：`public.core_tenant_users` 登录链路 RLS fail-closed（方案 A）+ 代码侧 5 处裸池改作用域 + `Err` 不回落 + membership 选择确定性。
> 副本：`topems_w7_reh_prod_20261111`（本机 `/tmp` socket，角色 `topems_prod`，非超户、非 `bypassrls`、库/表 owner）。
> 结论：**副本预演全绿，可进入生产窗口评审**。开窗前需确认 §4 的 4 个判断。

---

## 0. 结论摘要

| 项 | 结果 | 证据 |
|---|---|---|
| 严格策略上线（副本） | ✅ 3 条 NOTICE 全过（重建 / 守卫 / 无 `IS NULL` 断言） | `02_apply_migration.log`、`14_reapply_forward.log` |
| 默认租户登录得默认 | ✅ `tenant_id=…0001` | `10_http_rehearsal_final.log` §1/§5 |
| 非默认租户登录得自己 | ✅ `f1_t2 → 1111…1111` | 同上 §1 |
| 软删 membership 不参与 | ✅ `f1_softdel → …0001`；T2 列表不再出现仅软删成员 | 同上 §3/§12 |
| 多次登录稳定同租户 | ✅ `f1_multi` 连续 5 次均为 `…0001`；单测覆盖乱序稳定性 | 同上 §2；`cargo test membership_tests` 3 passed |
| 系统通道读 `core_tenant_users` 非 0 | ✅ `SYSREAD=12` | `04_sql_matrix.log`、`15_matrix_after_reapply.log` |
| 裸池无 GUC 读 0 行 | ✅ `NOGUC_read=0` | 同上 |
| 裸池 INSERT 被拒 | ✅ `new row violates row-level security policy` | `05_bare_insert_rejected.log` |
| 五入口（非超户） | ✅ list_users 200 / create_user 201 / 授权 200 / 改密 200 / 删除 200 | `10_http_rehearsal_final.log` §6–§10 |
| 回滚脚本可用 | ✅ R2 回滚后裸池读到 12 行（恢复旧可见性），再正向应用矩阵一致 | `13_rollback_drill.log`、`15_…log` |
| 迁移门禁 | ✅ `Errors: 0`；names `PASS (strict)`；destructive `PASS`；checksums 已重算 | `16_validate.log` |

---

## 1. 改动方案（已落地，未提交）

### 1.1 代码

| 文件 | 位置 | 改动 | 语义 |
|---|---|---|---|
| [auth.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs) | `resolve_membership_tenant` | 返回 `Result<Option<Uuid>, sqlx::Error>`；SQL 固定 `ORDER BY created_at ASC NULLS LAST, id ASC`，Rust 侧 `pick_membership_tenant` 过滤 `status='active' AND deleted_at IS NULL` | 确定性：同一用户任意多次登录取同一租户 |
| 同上 | `resolve_login_tenant`（新增） | `Ok(Some)` → 成员租户；`Ok(None)` → WARN + `auth_membership_fallback_total` + 默认租户；`Err` → ERROR + `auth_membership_lookup_error_total` + 上抛 | `Err` 不再回落默认租户 |
| 同上 | `login` / `refresh` / `logout` | 三处 `map_or_else` 改为 `match`，`Err` 返回 500（登录/刷新“内部服务器错误”，登出“登出失败”） | fail-closed |
| 同上 | `membership_tests`（新增） | 3 条单测：乱序多 membership 稳定、软删/非 active 忽略、无 membership → None | ③ 必修 |
| [crud.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/crud.rs) | `list_users` | `&state.pool` → `scope_read()` 事务（3 处查询）；两处 `EXISTS` 增加 `tu.status='active' AND tu.deleted_at IS NULL` | ① + 列表与登录口径一致 |
| 同上 | `create_user` | `IamScope::Tenant(t) → scope_for_tenant(t)`，`Platform → scope_system()` | ① INSERT 不再依赖裸池 |
| [tenant_scope.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/tenant_scope.rs) | `check_user_target` | `&PgPool` → `&Db`；`Platform → scope_read_system()`，`Tenant(t) → scope_read_for_tenant(t)` | ① |
| 同上 | `check_role_target` / `role_permission_codes` | `&PgPool` → `&Db` + 作用域事务 | 严格策略下租户域角色可见（否则“授权”恒 404） |
| [company_scope.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/company_scope.rs) | `resolve_tenant` / `check_user` | `&PgPool` → `&Db`，Platform 反查走 `scope_read_system()` | ① |
| [roles.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/roles.rs) / [status.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/status.rs) / [role.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/role.rs) | 调用点 | `&state.pool` → `&state.db` | 跟随签名 |
| [role.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/role.rs) | `create_role` | 角色名查重 / INSERT / 权限关联统一进作用域事务：`Tenant(t) → scope_for_tenant(t)`，`Platform → scope_system()` | 严格策略下租户管理员可建角色（裸池 INSERT 会 42501） |
| 同上 | `list_roles` / `get_role` | 租户读通道 `scope_read_for_tenant(t)`，超管 `scope_read_system()` | 建完即可见；跨租户不可见 |
| [global_row_metrics.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/global_row_metrics.rs)（新增） | 全局行监控 | 60s 采样 `iam_global_rows{entity}` 与正向增量 `iam_global_rows_added_total{entity}`；增量 >0 打 WARN | 全局行异常增长可告警 |
| [tenant/handlers.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs) | `create_tenant` / `onboard` | 两处 `core_tenants` 全局行写入加 `// tenant-system:` 登记 | NULL 行只经系统通道写入（非超管被 WITH CHECK 拒绝） |

新增指标（均带 `path` 标签，`login`/`refresh`/`logout`）：

- `auth_membership_lookup_error_total`：membership 查询失败（应伴随 5xx）。
- `auth_membership_fallback_total`：无 active membership 回落默认租户。

副本实测 `auth_membership_fallback_total{path="login"} 2`（`f1_onlysd` 两轮登录），WARN 原文：

```text
用户无 active membership，回落默认租户 user_id=a1a1a1a1-0000-4000-8000-000000000005 path="login" default_tenant="00000000-0000-0000-0000-000000000001"
```

**为什么保留 `Ok(None) → 默认租户`**：生产唯一超管 `admin` 无 `core_tenant_users` 行（F1 取证已确认），若改成 5xx 会让超管无法登录。因此只在“查得到但没有 active 成员行”时回落，并强制 WARN + 计数；查询**失败**（`Err`）一律 5xx。

### 1.2 迁移与回滚

- 迁移：[20261112100000_w7_b4_f1_login_path_rls_fail_closed.sql](file:///Users/air/TOPEMS/database/migrations/20261112100000_w7_b4_f1_login_path_rls_fail_closed.sql)
  - `lock_timeout='5s'`；校验表/列存在 → 动态 `DROP POLICY` 全部历史策略 → `ENABLE/FORCE RLS` → 重建单一策略：

    ```sql
    CREATE POLICY rls_tenant_isolation ON public.core_tenant_users
        FOR ALL TO PUBLIC
        USING (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        )
        WITH CHECK ( 同上 );
    ```

  - 守卫：5 张登录链路表（`core_tenant_users/core_roles/core_tenants/core_sessions/core_refresh_tokens`）至少一条策略含 `app.rls_system`；
  - 断言：重建后的策略不得含 `IS NULL` 放行分支。
- 回滚：[20261112100000_w7_b4_f1_login_path_rls_fail_closed.rollback.sql](file:///Users/air/TOPEMS/database/rollback/20261112100000_w7_b4_f1_login_path_rls_fail_closed.rollback.sql)
  - 默认 R2（旧可见性 ∪ 系统通道，保证急停后登录不退化）；注释保留 R1 精确回滚口径（逐字恢复变更前策略，会重新引入系统通道 0 行缺陷）。
  - 放在 `database/rollback/`，不被 `apply-forward.sh` / `validate.sh` 扫描。
- `database/checksums.txt` 已由 `validate.sh` 重算，新增第 427 行：

  ```text
  9665a13e06968cbc04c063e4433ff4688c8c4cd310ff2e323972ac7aa65ac067  database/migrations/20261112100000_w7_b4_f1_login_path_rls_fail_closed.sql
  ```

- 门禁：`validate.sh` → `Errors: 0`；`check-migrations.mjs` → PASS；`check-migration-names.mjs --strict` → PASS；`ci/check-destructive-sql.mjs` → PASS。

副本迁移 NOTICE（原文）：

```text
F1: core_tenant_users 策略已重建为 fail-closed（含 app.rls_system 分支）
F1 守卫通过：5 张登录链路 tenant-scoped 表均含系统通道分支
F1 断言通过：策略无 IS NULL 放行分支
```

### 1.3 策略前后对照（副本）

| 表 | BEFORE | AFTER | `IS NULL` 放行 |
|---|---|---|---|
| `core_tenant_users` | `tenant_isolation_core_tenant_users`（无 `rls_system`） | `rls_tenant_isolation`（strict） | 无 |
| `core_roles` | `rls_global_read` + `rls_tenant_isolation` | 不变 | **有**：仅 `tenant_id IS NULL` 的全局角色可读（见 §4 第 1 条） |
| `core_tenants` | `rls_global_read` + `rls_system_only` | 不变 | **有**：`tenant_id IS NULL` 的全局租户目录可读（见 §4 第 1 条） |
| `core_sessions` | `rls_system_only` | 不变 | 无 |
| `core_refresh_tokens` | `rls_system_only` | 不变 | 无 |

原始输出：`01_pre_snapshot.log`、`09_post_policies.log`。

### 1.4 本次不动（登记 TODO）

1. `create_role` 已随本次修复（租户通道 / 平台系统通道）；剩余 `update_role` / `delete_role`
   仍用裸池对上不可见的租户域角色执行 UPDATE（0 行更新但返回成功，静默撒谎），登记 TODO。
2. `get_user_permissions` 的角色/权限列表仍走裸池；严格策略下**少报**租户域角色（fail-closed，不放大权限）。
3. `core_tenants.rls_global_read`（`tenant_id IS NULL`）与 `core_roles.rls_global_read`（`tenant_id IS NULL`）保留；理由与影响见 §4 第 1 条。
4. `iam.core_*` 空影子表：`iam.core_tenant_users / core_users / core_roles / core_user_roles / core_permissions / core_role_permissions` 均 0 行（`iam.core_tenants` 也 0 行），本次不动，已在 [TODO.md](file:///Users/air/TOPEMS/TODO.md) §12.7 登记。

---

## 2. 副本预演

### 2.1 环境

- 副本 `topems_w7_reh_prod_20261111`；连接角色 `topems_prod`（`rolsuper=f`、`rolbypassrls=f`、库/5 表 owner），DSN 走本地 socket。
- 二进制：`target/debug/topems-unified-core`，**构建于工作树（尚未提交）**，sha256 `e0a849e17fd96c031ff2b8f28f4a0041e0352c3c0af4723bc1ff26e8ac8b8023`（`00_binary_sha256.txt`）。
- 启动：`CORE_PORT=18099`、临时 `JWT_SECRET`、`DATABASE_URL=postgres://topems_prod@%2Ftmp/topems_w7_reh_prod_20261111`。
- `HEAD=b4f6b9e6794128c5485df0168dc8e1ea6a2b24bd`；**提交后必须重建二进制并重新记录三件套（HEAD / sha256 / 构建时间）**，窗口以提交后构建物为准。

### 2.2 场景数据（系统通道写入）

| 用户 | membership | 期望 |
|---|---|---|
| `f1_admin` | T1（active，2026-01-01）；`core_user_roles → tenant_admin` | 登录 T1，可执行五入口 |
| `f1_t2` | T2（active）；`core_user_roles → tenant_admin` | 登录 T2 |
| `f1_multi` | T1（active，01-01）+ T2（active，06-01） | 稳定取 T1（最早 active） |
| `f1_softdel` | T1（active，03-01）+ T2（**软删** 2025-01-01） | 取 T1；软删不参与 |
| `f1_onlysd` | 仅 T2（**软删**） | `Ok(None)` → 默认 T1 + WARN/计数 |

另建租户 `11111111-1111-4111-8111-111111111111`（`reh_t2`）与租户域角色 `f1_tenant_viewer`（T1，权限 `tenant:iam:user:read`）。

### 2.3 SQL 矩阵（严格策略后）

| 检查 | 结果 |
|---|---|
| 系统通道（nil + `rls_system=on`）读 `core_tenant_users` | **12 行**（非 0） |
| T1 通道可见行 / 看到 T2 行 | **8 / 0** |
| T2 通道可见行 / 看到 T1 行 | **4 / 0** |
| 裸池不设 GUC 读 | **0 行** |
| 裸池 INSERT | **42501**：`new row violates row-level security policy` |
| 成员选择（`ORDER BY created_at, id LIMIT 1`） | `f1_admin/f1_multi/f1_softdel → …0001`；`f1_t2 → 1111…`；`f1_onlysd → <none>` |

### 2.4 HTTP 结果（改造后二进制）

| 步骤 | 结果 |
|---|---|
| `f1_t2` 登录 | `code=0`，JWT `tenant=1111…1111` |
| `f1_multi` × 5 | 5/5 `tenant=…0001`（稳定） |
| `f1_softdel` 登录 | `tenant=…0001`（软删的 T2 membership 不参与） |
| `f1_onlysd` 登录 | `tenant=…0001` + WARN + `auth_membership_fallback_total` |
| ① `GET /iam/users`（非超户） | 200，`total=4`，仅 T1 active 成员 |
| ② `POST /iam/users` | 201，`data.id` 返回 |
| ③ `POST /iam/users/{id}/roles/{role}` | 200“分配角色成功”，`core_user_roles` 落库已核对 |
| ④ `POST /iam/users/me/password` | 200；新口令可登录 |
| ⑤ `DELETE /iam/users/{id}` | 200；列表不再出现 |
| 跨租户列表 | T2 用户看到 `[f1_t2, f1_multi]`；仅软删成员的用户不出现 |

### 2.5 回滚演练

1. 执行 R2 回滚：`NOTICE: F1 回滚完成：core_tenant_users 已恢复为兼容策略（R2）`；裸池读到 **12 行**（旧可见性恢复）。
2. 重新正向应用：3 条 NOTICE 全过；矩阵复跑与 §2.3 完全一致（`SYSREAD=12 / NOGUC=0 / T1 8·0 / T2 4·0`）。

### 2.6 证据文件

目录：[backups/f1_rehearsal_20261111](file:///Users/air/TOPEMS/backups/f1_rehearsal_20261111)

```text
00_binary_sha256.txt        二进制 sha256 + HEAD
01_pre_snapshot.log         迁移前 RLS/策略
02_apply_migration.log      正向迁移 NOTICE
03_seed.log                 场景数据
04_sql_matrix.log           A/B/C/D 可见性矩阵
05_bare_insert_rejected.log 裸池 INSERT 42501
06_server.log               首轮实例（旧二进制，探路）
06_server_final.log         改造后实例启动
09_post_policies.log        迁移后策略
10_http_rehearsal_final.log 登录 5 场景 + 五入口
11_db_check.log             创建/删除落库
12_assign_and_metrics_v2.log 授权落库 + 审计表
13_rollback_drill.log       R2 回滚演练
14_reapply_forward.log      再正向应用
15_matrix_after_reapply.log 复跑矩阵
16_validate.log             迁移门禁
```

---

## 3. 生产窗口步骤（待确认后执行）

1. **PRE**：超户全库备份；`pg_policies` / `relrowsecurity` 快照落盘（同 `01_pre_snapshot.log` 口径）。
2. **停写**：`launchctl bootout` 停 `topems-unified-core`，贴 `launchctl print` / `lsof -i :<port>` 原文。
3. **迁移**：用改造后二进制对应的提交跑 forward（逐笔、`psql -v ON_ERROR_STOP=1`、stdout/stderr `tee`）；核对 3 条 NOTICE 与 `pg_policies` 前后对照。
4. **换二进制**：写入提交后构建物，校验 sha256 / 构建时间 / HEAD 三件套；`bootstrap` + `/health`。
5. **冒烟**：默认租户**非超户**登录 → `tenant_id=…0001`；再逐项走 `list_users / create_user / 授权 / 改密 / 删除`；观察 `auth_membership_*` 指标与 ERROR 日志。
6. **异常回滚**：任一入口 5xx / 跨租户可见 → 执行 `database/rollback/…rollback.sql`（R2），恢复旧可见性后再排查。

---

## 4. 裁决结论（2026-11-11）

1. **`core_tenants` / `core_roles` 的 `tenant_id IS NULL` 全局行保留**：这是**产品语义**——全局租户目录与全局角色必须对租户读路径可见，不是策略遗漏。约束三条：
   - 全局行只允许系统通道写入：`create_role` 平台分支显式 `scope_system()`；租户/onboard 写入点带 `// tenant-system:` 登记，非超管请求会被 `WITH CHECK` 拒绝；
   - 本文档 §1.3 与 §4 明确“租户读路径可见全局行”；
   - `iam_global_rows` / `iam_global_rows_added_total` 监控行数与异常增量（60s 采样，增量 >0 WARN）。
   若要收紧 `core_tenants` 为 `id = GUC`，需单独设计并回归租户模块。
2. **`create_role` 本次已修**：与 5 处裸池同构（作用域事务），副本补验非超户建角色。
3. **排序语义**：`created_at ASC → id ASC` 是**确定性排序**，不是“默认租户”；若需默认语义应新增 `is_default` 列（TODO §12.7-5）。
4. 副本中的 `f1_*` 预演数据只存在于副本，生产不带入。
