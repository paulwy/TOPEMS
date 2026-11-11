# W7-B4 · F1 登录租户缺口：只读取证与修法评估（2026-11-11）

> 状态：**只读取证完成，未改任何代码、未新建迁移、未触碰生产。**
> 取证范围：生产 `topems_prod`（192.168.110.115，库内 `localhost:5432`）、本地开发库 `topems`、副本 `topems_w7_reh_prod_20261111`（本机）。
> 取证脚本与原始输出：`backups/f1_evidence_20261111/`（`prod_topems_prod.log`、`local_topems.log`、`copy_reh.log`、`prod_sysread_probe.log`、`copy_strict_dryrun.log`、`copy_strict_insert_dryrun.log`、`copy_surgical_dryrun.log`；临时副本 `/tmp/f1_evidence/`）。
> 相关工单：[TODO.md](../../TODO.md) §12.7；上一窗口实录：[w7-b4-manufacturing-window-apply-2026-11-11.md](./w7-b4-manufacturing-window-apply-2026-11-11.md) §11.7/§11.13。

---

## 0. 结论先行

| 结论 | 内容 |
|---|---|
| 生产缺口表 | **仅 `public.core_tenant_users` 一张**。登录链路其余表要么 RLS 关闭（`iam.users`、`core_user_roles`、`core_role_permissions`、`core_permissions`），要么策略已含 `app.rls_system` 分支（`core_roles`、`core_tenants`、`core_sessions`、`core_refresh_tokens`）。 |
| 实测复现 | 系统通道（`app.tenant_id='000…000'` + `app.rls_system='on'`）读 `public.core_tenant_users` = **0 行**；租户通道读默认租户 = **1 行**；不设任何 GUC = **1 行**（旧策略 fail-open）。 |
| 生产真实影响 | 唯一 membership 属于 `tenant_admin`，租户恰为默认租户 `…0001`，所以当前**恰好**不串租户；`admin`（超管）无 membership，靠回落默认租户登录。**只要出现第二个租户，非默认租户用户就会被错误签到默认租户。** |
| 修法范围 | 只动 `public.core_tenant_users` 一张表 + 五表守卫断言。**但严格 fail-closed 策略不能单独上线**：副本实测会打断 5 处 `&state.pool` 裸池访问（用户列表归零、在域判定 403、平台租户解析 400、创建用户 42501）。两种落地：**B 外科式 SELECT 策略（零代码、不停写，推荐本窗口）** / **A 严格策略 + 5 处代码修复 + 换二进制停写**。详见 §4.6/§4.7。 |
| 代码分支 | 「系统通道读 0 行 → 回落默认租户」**本轮不改语义**。理由见 §5：生产 `admin` 是唯一超管且无 membership，收紧会直接锁死唯一管理入口；先补 membership / 定超管口径，再另立工单做 fail-closed。可先加**只读观测**（WARN + 指标），不改返回。 |
| 生产停写 | **方案 B 不需要停写**（只 `CREATE POLICY`、无 DML、不换二进制）；**方案 A 需要 `bootout` 停写**（换二进制）。详见 §7。 |

---

## 1. ① 取证：策略原文

### 1.1 生产 `topems_prod`

**对象与 RLS 标志**（`pg_class`，app 角色 `topems_prod` 实测）：

```text
tbl|rls|force
iam.roles|t|t
iam.users|f|f
public.core_permissions|f|f
public.core_refresh_tokens|t|t
public.core_role_permissions|f|f
public.core_roles|t|t
public.core_sessions|t|t
public.core_tenant_users|t|t
public.core_tenants|t|t
public.core_user_roles|f|f
public.core_users|f|f
```

**登录链路 `pg_policies` 原文**（8 条）：

```text
tbl|policyname|permissive|cmd|roles|qual|with_check
iam.roles|iam_allow_all_roles|PERMISSIVE|ALL|{public}|true|true
public.core_refresh_tokens|rls_system_only|PERMISSIVE|ALL|{public}|(COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)|(COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
public.core_roles|rls_global_read|PERMISSIVE|SELECT|{public}|((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL))|(none)
public.core_roles|rls_tenant_isolation|PERMISSIVE|ALL|{public}|((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))|((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))
public.core_sessions|rls_system_only|PERMISSIVE|ALL|{public}|(COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)|(COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
public.core_tenant_users|tenant_isolation_core_tenant_users|PERMISSIVE|ALL|{public}|((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL)))|(none)
public.core_tenants|rls_global_read|PERMISSIVE|SELECT|{public}|((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id IS NULL))|(none)
public.core_tenants|rls_system_only|PERMISSIVE|ALL|{public}|(COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)|(COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
```

**缺口筛选**（策略既无 `app.rls_system` 也无 `with_check` 含该分支）：

```text
tbl|pols_without_rls_system
iam.roles|1
public.core_tenant_users|1
```

- `public.core_tenant_users`：**真缺口**（tenant-scoped 表，系统通道 0 行）。
- `iam.roles|iam_allow_all_roles (true)`：**不是缺口**。`iam.roles` 无 `tenant_id` 语义（全局角色字典，4 行），`true` 是有意放行；不在「租户隔离」范畴。

### 1.2 本地开发库 `topems`（环境漂移，与生产不同）

**RLS 标志**：`core_permissions`/`core_role_permissions`/`core_sessions`/`core_tenant_users`/`core_tenants`/`core_user_roles` 全部 `ENABLE+FORCE`；`core_roles`、`core_users` 为 `ENABLE` 未 `FORCE`；`iam.users` 关闭。

**登录链路 `pg_policies` 原文**（15 条）：

```text
tbl|policyname|permissive|cmd|roles|qual|with_check
iam.roles|tenant_isolation_roles|PERMISSIVE|ALL|{public}|(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_permissions|tenant_isolation_core_permissions|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_refresh_tokens|core_refresh_tokens_tenant_isolation|PERMISSIVE|ALL|{public}|(tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, '00000000-0000-0000-0000-000000000001'::uuid))|(none)
public.core_refresh_tokens|tenant_isolation_core_refresh_tokens|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_role_permissions|tenant_isolation_core_role_permissions|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_roles|core_roles_tenant_policy|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_roles|tenant_isolation_core_roles|PERMISSIVE|ALL|{public}|(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))|(none)
public.core_sessions|core_sessions_tenant_isolation|PERMISSIVE|ALL|{public}|(tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, '00000000-0000-0000-0000-000000000001'::uuid))|(none)
public.core_sessions|tenant_isolation_core_sessions|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_tenant_users|core_tenant_users_tenant_policy|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_tenant_users|tenant_isolation_core_tenant_users|PERMISSIVE|ALL|{public}|(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))|(none)
public.core_tenants|tenant_isolation_core_tenants|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_user_roles|tenant_isolation_core_user_roles|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_users|core_users_tenant_policy|PERMISSIVE|ALL|{public}|((tenant_id = (NULLIF(current_setting('app.tenant_id'::text), ''::text))::uuid) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))|(none)
public.core_users|tenant_isolation_core_users|PERMISSIVE|ALL|{public}|(((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL))|(none)
```

**本地缺口清单**（策略无 `rls_system`）：

```text
tbl|pols_without_rls_system
iam.roles|1
public.core_permissions|1
public.core_refresh_tokens|2
public.core_role_permissions|1
public.core_roles|2
public.core_sessions|2
public.core_tenant_users|2
public.core_tenants|1
public.core_user_roles|1
public.core_users|2
```

> 说明：本地是**旧式 fail-open 形状**（nil 租户分支 / 列侧 cast / `COALESCE(GUC,'000…0001')`），靠「nil 租户放行」维持可用；生产只把 `core_tenant_users` 留在了「无 nil 分支」的旧形状上，所以只有它坏。**两套环境的策略形状已经漂移，本轮只统一登录链路受影响的那张，不借机重写本地全部旧策略**（会改变本地 1204 条 NULL 租户权限码的可见性，属于另一件事）。

### 1.3 副本 `topems_w7_reh_prod_20261111`

与生产**逐字节同形**：RLS 标志、8 条策略、缺口清单、行数分布全部一致；账本 `max(version)=20261112095000`、`success=661`，与生产一致，可直接用于 ③ 预演。

### 1.4 数据形态与系统通道实测

**行数 / `tenant_id IS NULL` 分布**（生产）：

```text
tbl|cnt|null_tenant
iam.users|2|-
public.core_tenant_users|1|0
public.core_tenants|1|1
public.core_roles|16|16
public.core_permissions|1157|-    (无 tenant_id 列)
public.core_role_permissions|2917|- (无 tenant_id 列)
public.core_user_roles|2|-        (无 tenant_id 列)
public.core_sessions|0|0
public.core_refresh_tokens|0|0
```

**生产系统通道实测**（app 角色，事务内 `set_config(...,true)` 后 `ROLLBACK`）：

```text
==== sys-channel read: current prod policy ====
BEGIN
guc_tenant|guc_sys
00000000-0000-0000-0000-000000000000|on
probe|cnt
SYSREAD_core_tenant_users|0        ← 缺口实证
probe|cnt
SYSREAD_iam_users|2
ROLLBACK

==== tenant-scoped read (default tenant) ====
guc_tenant|guc_sys
00000000-0000-0000-0000-000000000001|off
probe|cnt
TENANT_READ_core_tenant_users|1
ROLLBACK

==== unset GUC (fail-open check) ====
probe|cnt
UNSET_READ_core_tenant_users|1     ← 旧策略对「未设 GUC」放行
ROLLBACK
```

**membership 归属**：

```text
user_id|username|tenant_id|status
0d000000-0000-4000-8000-000000000001|tenant_admin|00000000-0000-0000-0000-000000000001|active
```

**无 active membership 的用户**：`admin`（`56f4256f-…`，`is_superuser=t`）——生产唯一超管。

---

## 2. ① 登录链路代码映射（谁在读、谁在回落）

| 环节 | 位置 | 读取方式 | 取不到时的行为 |
|---|---|---|---|
| 用户查询 | [auth.rs L228-260](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L228-L260) | `scope_read_system()` 读 `iam.users`（生产 RLS off） | 401「用户名或密码错误」 |
| 登录租户解析 | [auth.rs L359-363](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L359-L363) | `resolve_membership_tenant()` | `map_or_else(→ DEFAULT_TENANT_ID)` |
| 成员解析本体 | [auth.rs L1880-1909](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L1880-L1909) | 系统通道 `SELECT tenant_id FROM public.core_tenant_users WHERE user_id=$1 AND status='active' LIMIT 1` | `Ok(None)` 与 `Err` **都返回 `None`** |
| 默认租户口径 | [auth.rs L17](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L17) | `DEFAULT_TENANT_ID = 00000000-0000-0000-0000-000000000001` | — |
| 登录授权解析 | [models.rs L123-165](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/models.rs#L123-L165) | 系统通道读 `public.core_user_roles → public.core_roles`、`…role_permissions → …permissions` | 失败返回空授权（不阻断登录） |
| 会话写入 | [auth.rs L424-459](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L424-L459) | 独立事务 `set_config('app.tenant_id', 解析出的租户)` + `app.rls_system='on'` 写 `core_sessions` / `core_refresh_tokens` | — |
| refresh | [auth.rs L801-840](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L801-L840) | 系统通道读 `core_refresh_tokens` + 授权子查询 | — |
| refresh 租户解析 | [auth.rs L904-909](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L904-L909) | 同 `resolve_membership_tenant` | 同 login |
| logout 租户解析 | [auth.rs L1215-1221](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L1215-L1221) | 同 `resolve_membership_tenant` | 同 login |
| 请求期权限解析 | [shared-auth/auth.rs L431-490](file:///Users/air/TOPEMS/lib/shared-auth/src/auth.rs#L431-L490) | 独立事务 nil + `rls_system='on'` 读 `public.core_user_roles/core_roles/core_role_permissions/core_permissions` | 解析失败 fail-closed 拒绝；缓存 TTL 60s |
| 系统通道定义 | [scope.rs L93-110](file:///Users/air/TOPEMS/lib/shared-db/src/scope.rs#L93-L110) | `SET TRANSACTION READ ONLY` + `app.tenant_id=nil` + `app.rls_system='on'` | — |

**回落责任链**：`resolve_membership_tenant()` 返回 `None` → 三处 `map_or_else(|| DEFAULT_TENANT_ID.to_string(), …)`（login / refresh / logout）→ 会话与 JWT 全部绑定 `…0001`。没有任何一处告警或指标区分「0 行」与「查询异常」。

---

## 3. ① 同类表排查结论（为什么不只修一张、也不多修）

按「登录链路是否经系统通道读」×「是否有租户维度」分类：

| 生产表 | RLS | 租户维度 | 登录链路用途 | 是否有 `rls_system` 分支 | 处置 |
|---|---|---|---|---|---|
| `public.core_tenant_users` | ON+FORCE | 有 | membership 解析 | **无（缺口）** | **本笔修** |
| `public.core_roles` | ON+FORCE | 有 | 授权解析 | 有（ALL 策略）+ 全局读（SELECT，含 NULL 行） | 不动 |
| `public.core_tenants` | ON+FORCE | 有 | 非登录路径（租户目录） | 有（`rls_system_only`）+ 全局读（SELECT） | 不动 |
| `public.core_sessions` | ON+FORCE | 有 | 会话写入 | 有（仅 `rls_system_only`） | 不动 |
| `public.core_refresh_tokens` | ON+FORCE | 有 | refresh 读取 | 有（仅 `rls_system_only`） | 不动 |
| `public.core_user_roles` | OFF | 无列 | 授权解析 | 不适用 | 不动 |
| `public.core_role_permissions` | OFF | 无列 | 授权解析 | 不适用 | 不动 |
| `public.core_permissions` | OFF | 无列 | 授权解析 | 不适用 | 不动 |
| `public.core_users` | OFF | 有 | 非登录路径 | 不适用 | 不动 |
| `iam.users` | OFF | 无列 | 用户查询 | 不适用 | 不动 |
| `iam.roles` | ON+FORCE | 无列 | 登录后用 roles 字段 | `true`（有意全局放行） | 不动 |

**附加发现（记录，不处理）**：

1. 生产同时存在 `iam.core_tenant_users / iam.core_user_roles / iam.core_roles / iam.core_role_permissions / iam.core_permissions / iam.core_tenants` 六张**空的影子表**（`relkind='r'`，0 行，RLS 大部分关闭）。登录代码全部显式 `public.` 限定（[auth.rs L1891](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs#L1891)、[models.rs L140-159](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/models.rs#L140-L159)、[shared-auth L458-474](file:///Users/air/TOPEMS/lib/shared-auth/src/auth.rs#L458-L474)），暂不构成故障；但任何一处漏写 schema 就会静默读 0 行。**建议另立清理工单，不在本窗口动。**
2. 本地 `topems` 的 `core_permissions`（1204 行）、`core_role_permissions`（3542 行）、`core_user_roles`（12/13 行）大量 `tenant_id IS NULL`，且策略靠 nil 分支放行；与生产形态不同。**本笔不统一本地旧策略**，否则会改变本地开发态的可见性。
3. `resolve_membership_tenant` 的查询是 `WHERE user_id=$1 AND status='active' LIMIT 1`：**无 `ORDER BY`、未过滤 `deleted_at`**。单租户用户无影响；多租户用户（本地存在 20 个用户挂在 `…0001`、部分用户多租户）登录租户不确定；软删但 `status` 仍为 `active` 的 membership 仍会被选中。生产当前 1 条 membership、无软删，暂不触发。**建议另立工单**（可与 §5 的 membership 审计合并），不在本窗口改。

---

## 4. ② 修法评估：迁移设计

### 4.1 版本与文件

| 项 | 值 |
|---|---|
| 新迁移 | 方案 B：`database/migrations/20261112100000_w7_b4_f1_core_tenant_users_sysread.sql`；方案 A：`…_login_path_rls_fail_closed.sql`（版本号一致，只差文件名） |
| 版本依据 | 生产账本 `max(version)=20261112095000`、`success=661`（实测），新版本必须更大 |
| 回滚脚本 | `database/rollback/20261112100000_w7_b4_f1_core_tenant_users_sysread.rollback.sql`（方案 B）；方案 A 同名后缀 `…_fail_closed.rollback.sql` |
| 为什么不放 `*.down.sql` 到 `migrations/` | `apply-forward.sh` 用 `ls "$MIG_DIR"/*.sql` 扫 pending，`*.down.sql` 会被当成待应用迁移（同版本号、字典序还排在 up 之前），有被误执行的风险；`database/rollback/` 不在任何门禁扫描目录内，安全。 |
| 已推送迁移 | **一个都不改**。 |

### 4.2 迁移内容（拟 · 严格形状）

> **重要：严格形状不可单独上线。** 副本实测证明它会打断 4 条「裸池（无 GUC）」访问路径，详见 §4.6；落地选项与推荐见 §4.7。

```sql
SET lock_timeout = '5s';

DO $w7b4_f1$
DECLARE
    pol record;
BEGIN
    IF to_regclass('public.core_tenant_users') IS NULL THEN
        RAISE EXCEPTION 'F1 失败：public.core_tenant_users 不存在';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='core_tenant_users'
                     AND column_name='tenant_id') THEN
        RAISE EXCEPTION 'F1 失败：public.core_tenant_users 缺 tenant_id 列';
    END IF;

    -- 先删该表全部历史策略（生产 1 条 / 本地 2 条），再建唯一 fail-closed 策略
    FOR pol IN SELECT policyname FROM pg_policies
               WHERE schemaname='public' AND tablename='core_tenant_users' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.core_tenant_users', pol.policyname);
    END LOOP;

    ALTER TABLE public.core_tenant_users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.core_tenant_users FORCE ROW LEVEL SECURITY;

    CREATE POLICY rls_tenant_isolation ON public.core_tenant_users FOR ALL TO PUBLIC
        USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
        WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
               OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);

    RAISE NOTICE 'F1：core_tenant_users 策略已统一为 fail-closed 形状';
END
$w7b4_f1$;

-- 守卫：登录链路 5 张 tenant-scoped 表，每张必须至少有 1 条策略含 app.rls_system
DO $w7b4_f1_guard$
DECLARE
    t text;
    v_ok int;
BEGIN
    FOREACH t IN ARRAY ARRAY['core_tenant_users','core_roles','core_tenants',
                             'core_sessions','core_refresh_tokens'] LOOP
        SELECT count(*) INTO v_ok FROM pg_policies
        WHERE schemaname='public' AND tablename=t
          AND (qual LIKE '%app.rls_system%' OR with_check LIKE '%app.rls_system%');
        IF v_ok = 0 THEN
            RAISE EXCEPTION 'F1 守卫失败：public.% 无任何含 app.rls_system 的策略', t;
        END IF;
    END LOOP;
    RAISE NOTICE 'F1 守卫通过：登录链路 5 张 tenant-scoped 表均含系统通道分支';
END
$w7b4_f1_guard$;
```

**为什么不改 `core_roles` / `core_tenants` 的全局读策略**：
- 二者已有 fail-closed 的 ALL 策略，登录链路经系统通道读取不受影响；
- `rls_global_read`（`tenant_id IS NULL` 分支）是租户目录/共享角色目录的**有意全局读**，生产 `core_tenants` 唯一一行、`core_roles` 16/16 行都是 NULL 租户，删掉会改变租户管理页可见性，超出 F1 范围。

**断言口径**：
- `core_tenant_users` 策略数 = 1，`cmd='ALL'`，`qual` 含 `app.rls_system` 与 `tenant_id`，且 **不含** `tenant_id IS NULL` / `(tenant_id)::text`；
- 五表守卫全绿；
- 不写 `BEGIN/COMMIT`（由执行器包事务）。

### 4.3 回滚设计（两种，明确推荐 R2）

- **R1 精确回滚**：还原生产原策略原文 `tenant_isolation_core_tenant_users`（含 fail-open 分支）。用于审计口径「回到变更前」，但**回滚后会重新出现系统通道 0 行**。
- **R2 兼容回滚（推荐急停用）**：`USING (COALESCE(rls_system,'off')='on' OR <原生产 qual>)`，即「旧可见性 ∪ 系统通道」。回滚后登录不退化、租户隔离不弱于变更前。回滚脚本里两段都写，默认执行 R2，R1 注释保留。

### 4.4 影响面核对（三层：中间件 / 裸池 / 脚本）

`tenant_middleware` 保证**所有非 public 请求都有明确 GUC**（[tenant.rs L295-471](file:///Users/air/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L295-L471)）：

| 请求身份 | `app.tenant_id` | `app.rls_system` | 变更前可见 | 严格策略后可见 |
|---|---|---|---|---|
| 普通租户用户（`state.db.scope_*`） | 自己租户 | `off` | 自己租户 + NULL 行 | 自己租户（生产 NULL 行=0，等价） |
| 超管 + `x-tenant-id`（`scope_*`） | 头指定租户 | `off` | 该租户 + NULL 行 | 该租户（等价） |
| service token（`scope_*`） | nil | `on` | **0 行**（旧策略无系统分支） | **全量**（修复） |
| 裸池 / 未设 GUC（`&state.pool`） | 未设 | 未设 | 全量（fail-open） | **0 行 / 写入被拒**（见 §4.6） |

**关键修正**：登录链路本身全部走 `scope_*`，但同一张表在 IAM 模块里还有 **5 处 `&state.pool` 裸池访问**（不经过任何 scope，事务内没有 GUC，分布在 4 条业务路径）。它们今天依赖旧策略的 `app.tenant_id IS NULL` 分支工作；严格策略上线后会立即失效。§4.6 是在副本上以 app 角色实测的原文。

### 4.6 阻断性发现：严格策略会打断 5 处裸池访问（副本实测）

**访问点清单**（均 `&state.pool`，无 `set_config`）：

| # | 位置 | SQL 形态 | 严格策略后后果 |
|---|---|---|---|
| 1 | [crud.rs L48-57](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/crud.rs#L48-L57) `list_users` 计数 | 裸池 `COUNT(*) … EXISTS (SELECT 1 FROM public.core_tenant_users …)` | 非超管用户总数变 **0** |
| 2 | [crud.rs L81-89](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/crud.rs#L81-L89) `list_users` 列表 | 同上 EXISTS 子查询 | 非超管用户列表变 **空** |
| 3 | [tenant_scope.rs L162-192](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/tenant_scope.rs#L162-L192) `check_user_target` | EXISTS 判定 `in_scope` | 用户角色/状态/改/删全部 **403**（`in_scope=false`） |
| 4 | [company_scope.rs L93](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/company_scope.rs#L93) `resolve_tenant`（平台模式） | 裸池 `SELECT … FROM core_tenant_users` | 平台用户解析租户失败 → **400「无法确定目标租户」** |
| 5 | [crud.rs L354-387](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/user/crud.rs#L354-L387) `create_user` | 裸池事务 `INSERT INTO core_tenant_users` | **42501 违反 RLS，创建用户 500** |

**副本实测（`topems_prod` 角色，事务内替换策略后 `ROLLBACK`）**：

```text
==== baseline (current prod policy) ====
BASELINE_noguc_read|1
BASELINE_list_users_exists|1

==== swap to fail-closed policy (rolled back) ====
AFTER_noguc_read|0                 ← 裸池读直接归零
AFTER_list_users_exists|0          ← 用户列表/在域判定归零
AFTER_sysread|1                    ← 系统通道修复（符合预期）
AFTER_tenant_read|1                ← 租户通道正常（符合预期）

==== raw-pool INSERT with no tenant context ====
ERROR:  new row violates row-level security policy for table "core_tenant_users"
```

原始输出：`/tmp/f1_evidence/copy_strict_dryrun.log`、`/tmp/f1_evidence/copy_strict_insert_dryrun.log`。

**结论**：严格形状必须与上述 5 处代码修复**同批上线**，否则 F1 修好登录的同时会把 IAM 用户管理打坏。

### 4.7 两种落地方案与推荐

#### 方案 A：严格 fail-closed + 代码修复（一把到位）

**代码改动（5 处，行为在旧策略下不变）**：

1. `list_users` 两处：改为 `let mut scope = state.db.scope_read().await?`，SQL 走 scope（请求 GUC 会落到事务）；
2. `check_user_target`：签名由 `&PgPool` 改为 `&Db`（或增加 `tenant: Option<Uuid>`），内部用 `scope_read_for_tenant`；
3. `company_scope::resolve_tenant` 平台模式：改为显式系统通道（nil + `rls_system='on'`）；
4. `create_user`：事务 `BEGIN` 后显式 `set_config('app.tenant_id', <目标租户>, true)` + `set_config('app.rls_system','off',true)`；
5. 迁移改用 §4.2 严格策略 + 五表守卫。

**代价**：需要**构建新二进制 + 窗口内 `bootout` 停写**；改动面从「1 条策略」扩大到 1 个服务模块的 5 个点。

**收益**：彻底 fail-closed；今后任何漏设 GUC 的路径会显式报错而不是静默跨租户。

#### 方案 B：外科式补系统读策略（零代码、零停写、本窗口可收口）

保留现有 `tenant_isolation_core_tenant_users`（ALL，含旧分支）不动，仅追加一条 **SELECT 通道**策略：

```sql
CREATE POLICY w7b4_f1_sysread ON public.core_tenant_users
    FOR SELECT TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
```

permissive 策略按命令 OR 叠加：

| 场景 | 结果（副本实测） |
|---|---|
| 系统通道 SELECT | **1 行**（修复 F1） |
| 裸池 SELECT（`app.tenant_id=NULL`） | 1 行（旧 ALL 策略继续放行，**零回归**） |
| 租户通道 SELECT | 1 行（不变） |
| 裸池 INSERT（无 GUC） | **成功**（旧 ALL 策略的 WITH CHECK 继续放行） |

原始输出：`/tmp/f1_evidence/copy_surgical_dryrun.log`。

**代价**：`app.tenant_id IS NULL` 的 fail-open 分支仍在（仅裸池/DBA 可达；生产 `tenant_id IS NULL` 行数为 0）；不满足「统一 fail-closed 形状」的目标。

#### 推荐

**本窗口走 B 收口 F1，A 另开一窗。** 理由：

1. F1 的业务后果是「非默认租户登录串租户」，B 已用最小变更消除；生产只有 1 个租户，B 的回归面几乎为零。
2. A 的 5 处代码修复虽然行为等价，但涉及用户创建/列表/在域判定/平台租户解析，属于「IAM 模块级」改动，需要独立构建、独立窗口、独立回归；塞进 F1 窗口会让一次策略变更变成一次服务变更，出问题无法归因。
3. A 的代码部分可以先行：在旧策略下 5 处修复行为不变，可单独验证通过后，下一窗口再上严格策略。这也符合「代码一个提交、迁移一个提交」。

若你要求「一次到位」，则按 A 执行，④ 的结论改为**需要 `bootout` 停写**。


### 4.8 门禁与 checksums

| 门禁 | 预期 |
|---|---|
| `node scripts/check-migration-names.mjs --strict` | 通过（14 位版本 + 合法命名） |
| `node scripts/check-migrations.mjs` | 通过（不修改历史文件；新文件唯一版本号） |
| `bash scripts/migration/validate.sh` | 0 error；`checksums.txt` 自举新增 1 条；`Missing down migrations` 为既有 warning（本笔回滚脚本在 `database/rollback/`，不进该统计） |
| `check-directed-migrations.mjs --changed-only` | 通过（无 `dbNN_test/5433/test_` 特征） |
| `check-destructive-sql.mjs` | 通过（`DROP POLICY` 不在破坏性清单；无 DML/TRUNCATE/DROP TABLE） |
| `check-baseline-integrity.mjs --changed-only` | 通过（`20261112100000 > 20261112095000`） |

> `database/rollback/*.sql` 不参与 checksums（不在扫描目录）；其 sha256 单独记录进窗口报告，避免「不在校验清单」变成无留痕。

---

## 5. ② 代码分支：「0 行 → 回落默认租户」是否收紧

### 5.1 现状

```rust
Ok(tid) => tid,                       // 有 membership → 用真实租户
Err(e)  => { warn!(...); None }       // 查询异常 → 也变成 None
```
三处调用统一 `map_or_else(|| DEFAULT_TENANT_ID.to_string(), ...)`。**「无 membership」与「查询异常」不可区分，且都不留业务可见痕迹。**

### 5.2 评估

| 方案 | 影响 | 结论 |
|---|---|---|
| A. 无 membership 直接 401 | 生产 `admin`（唯一超管、无 membership）立即无法登录；本次修复后 `tenant_admin` 可以，但超管入口没了 | **不可接受** |
| B. 仅非超管无 membership → 401 | 生产唯一非超管 `tenant_admin` 有 membership，可登录；但任何历史漏建 membership 的账号会被锁死，且无法自助恢复 | **本轮不做**，需先审计全量 membership |
| C. 区分 `Err` 与 `Ok(None)`：`Err` 直接 500/401，不回落 | 只在「策略再次坏/DB 异常」时 fail-closed；正常无 membership 行为不变 | **推荐，但作为独立代码提交** |
| D. 保持现状 + 观测 | 不改语义；回落时 `WARN`（user_id / 来源 login/refresh/logout）+ 计数器 | **本轮可做的最小项** |

### 5.3 建议

1. **本轮（数据修复）不改登录语义**：避免「修策略」和「改登录行为」两件事混在一个窗口，出问题无法归因。
2. 另立一个小提交（代码）：`resolve_membership_tenant` 改为返回 `Result<Option<Uuid>, sqlx::Error>`，调用处对 `Err` **不回落**（500 且告警），对 `Ok(None)` 保留默认租户并打 `WARN` + `auth_membership_fallback_total{path=login|refresh|logout}`。这属于「观测 + 异常 fail-closed」，不触碰产品语义。
3. 再另立工单：审计全量用户 membership（生产仅 2 用户，成本极低），明确「超管是否免 membership」口径后，再评估 B。

---

## 6. ③ 预演方案（副本 `topems_w7_reh_prod_20261111`）

副本已与生产同形（策略/账本/数据一致），直接使用。

1. **构造双租户**
   - 默认租户 `…0001`：保留现有 `tenant_admin`（已有 membership）。
   - 新租户 `T2 = 11111111-1111-4111-8111-111111111111`：插入 `core_tenants` 一行 + `iam.users` 两个用户（`t2_user`、`t1_user2`）+ 对应 `core_tenant_users` membership（T2 / `…0001`）。
2. **验证矩阵**（SQL 级，严格复刻代码的 GUC 时序）
   - `t2_user`：系统通道读 membership → `T2`；再以 `app.tenant_id=T2` 读 `core_tenant_users` → 只看到 T2 行；
   - `t1_user2`：系统通道读 membership → `…0001`；租户通道 → 只看到 `…0001` 行；
   - 交叉：以 `T2` 通道读 `…0001` 的 membership 行 → 0 行；反之 → 0 行。
3. **系统通道非 0 行**：`SELECT count(*) FROM public.core_tenant_users`（nil + `rls_system='on'`）→ 期望 3。
4. **完整登录（强证据，可选）**：以副本为 `DATABASE_URL` 另起一个 `unified-core` 实例（独立端口，如 18099），走真实 `POST /api/core/iam/auth/login`，断言返回 JWT 的 `tenant_id` 分别等于各自租户；再调一个租户维度端点验不串。若环境不适合起第二实例，则以 SQL 级矩阵为准并在报告中说明缺口。
5. **裸池零回归矩阵**（方案 B 必做）：以 app 角色复跑 §4.6 的 5 条裸池 SQL（`list_users` 计数/列表、`check_user_target`、`company_scope::resolve_tenant`、`create_user` INSERT）→ 期望与变更前逐条一致；方案 A 则在代码修复后复跑，期望一致。
6. **回滚演练**：在副本上执行回滚脚本 → 系统通道仍非 0 行、租户通道与裸池可见性回到变更前；再重放迁移 → 断言全绿。

---

## 7. ④ 生产侧方案与停写判断

**结论：取决于方案选择。**

| 方案 | 停写 | 理由 |
|---|---|---|
| **B（推荐，本窗口）** | **不需要** | 只 `CREATE POLICY`（SELECT 通道），不删旧策略、不改数据、不换二进制、不重启；`ACCESS EXCLUSIVE` 毫秒级，`lock_timeout=5s`；登录/裸池/租户读全部实测零回归（§4.7）。 |
| A（严格 + 代码） | **需要 `bootout` 停写** | 要换二进制（含 IAM 5 处代码修改），沿用既有窗口纪律：超户备份 → `bootout` → 换二进制 → `bootstrap` → `/health` → 迁移 → 冒烟。 |

下表为方案 B 的执行口径：

| 维度 | 判断 |
|---|---|
| 变更对象 | 1 张表、新增 1 条 SELECT 策略（不改旧策略、生产 1 行数据） |
| DDL 原子性 | 单事务 `CREATE POLICY`，外部会话看不到中间态 |
| 锁 | `ACCESS EXCLUSIVE`，`lock_timeout=5s`；登录路径只在解析 membership 时短暂读该表 |
| 数据变更 | 无 DML |
| 二进制/进程 | 不变、不重启 |
| 回滚 | 事务失败自动回滚；事后 `DROP POLICY w7b4_f1_sysread` 即回到变更前 |

**生产执行步骤（方案 B，拟）**：
1. 只读 PRE：`pg_policies` 原文 + 账本 `661/20261112095000` + `core_tenant_users` 行数 1 / NULL 0；
2. 现取一份 `core_tenant_users` 策略原文 + 全库 dump sha256（`backups/topems_prod_pre_f1_20261111.dump`）；
3. `apply-forward.sh --db topems_prod --prod --only 20261112100000`；逐笔 `tee` 到 `logs/<window>/mig_20261112100000.log`；
4. 立即冒烟：`tenant_admin` 登录 → JWT `tenant_id = …0001`；`admin` 登录 → 同；系统通道 `SELECT count(*) = 1`；
5. IAM 读写回归（B 的零回归证据）：`GET /iam/users`（tenant_admin）非空、`POST /iam/users` 创建成功、用户角色/状态接口非 403、平台员工域接口非 400；
6. 五端点抽一处（如 `/api/mes/orders`）带 `x-tenant-id` 200；
7. 终检：`pg_policies` 前后对照、账本 `662`。

**风险与缓解**：
- 方案 B 的残留风险：`app.tenant_id IS NULL` fail-open 分支仍在（§4.7），由方案 A 的后续窗口消除。
- 若未来有人删除 `tenant_isolation_core_tenant_users`（旧 ALL 策略），裸池路径会立刻失效；迁移守卫只保证「至少一条含 rls_system」，不保证旧 ALL 策略存在。**在迁移注释与 TODO 中显式登记这一依赖。**

---

## 8. ⑤ 门禁与留痕计划

- 迁移文件 + 回滚脚本 + `checksums.txt` 重算，`validate.sh` 0 error；
- 窗口日志按 §1.0：逐笔 `tee` 到 `logs/<window>/mig_<version>.log`，NOTICE 必须落盘；
- 报告新增一节（F1 窗口实录）：PRE/POST 策略原文、账本 661→662、耗时、登录冒烟 JWT 的 `tenant_id`、系统通道行数、回滚物 sha256；
- 代码（若批准 D 项或方案 A）单独提交，不混在迁移提交里。

---

## 9. 待你拍板

1. **落地方案**：选 **B**（外科式 SELECT 策略，本窗口收口、零代码、不停写）还是 **A**（严格 fail-closed + 5 处代码修复 + 换二进制停写）？我推荐 B 先收口、A 另开一窗。
2. **迁移范围**：只动 `public.core_tenant_users` + 五表守卫断言，是否接受？
3. **本地旧策略**：本轮不统一本地 `core_permissions/core_user_roles/...` 旧形状（避免改变开发态可见性），是否接受？
4. **代码分支**：本轮只做迁移、不动登录语义；观测（D）与异常 fail-closed（C）另立提交/工单，是否接受？
5. **预演强度**：SQL 级矩阵（快、可复现）＋ 可选真 HTTP 登录（强证据，需在副本上另起实例）。是否要求必须做 HTTP 真登录？

> **2026-11-11 已拍板：选 A**（严格 fail-closed + 代码 5 处改作用域 + `Err` 不回落 + membership 确定性）。
> 改动方案与副本预演（含真 HTTP 登录与五入口验收）见
> `docs/quality/w7-b4-f1-change-plan-and-rehearsal-2026-11-11.md`。
