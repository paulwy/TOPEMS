# public 层 allow_all 残留收口：三类表定性与演练记录（2026-11-18）

## 1. 范围与口径

统一核心 RLS 收紧后，`public` 层仍剩 6 张 `public_allow_all_*` 表（RLS 开着但策略 `USING (true) WITH CHECK (true)` 全放行）。
本批不搞一刀切，按「是否有 tenant_id 列、是否有平台内置行、代码是否显式绑租户、是否存在行读取依赖」逐表定性，分三类处置：

| 分类 | 表 | 处置 | 迁移后形态 |
| --- | --- | --- | --- |
| A 可严格化 | `core_operation_logs`、`subscriptions` | 严格 B 范式 | `ENABLE` + `FORCE` + `USING`/`WITH CHECK` + `rls_tenant_isolation` |
| B 拒绝为默认 | `navigation_menu`、`pinned_apps`、`todos` | 删 `allow_all`，保持 RLS 开启 | `ENABLE` + `FORCE`，0 条策略（全拒绝） |
| C 保持现状 | `user_settings` | 本批不动，仅登记 | 仍为 1 条 `public_allow_all_user_settings` |

迁移：`database/migrations/20261118090000_allow_all_residuals_strict_and_deny.sql`
回滚：`database/rollback/20261118090000_allow_all_residuals_strict_and_deny.rollback.sql`
台账：`database/migration_manifest.yaml` 版本 `20261118090000`（status: to_apply）

## 2. 三类归因

### A. 可严格化（2 张）

- `public.core_operation_logs`：`tenant_id uuid NOT NULL`，生产与克隆库 0 行，无 NULL 租户；写入路径 `svc/unified-core/src/modules/audit/service.rs` 显式绑定租户。
- `public.subscriptions`：`tenant_id uuid NOT NULL`，0 行；写入路径 `svc/server/src/modules/subscription_module.rs` 显式绑定租户，并以 `ON CONFLICT (tenant_id)` 做幂等，严格策略不改变语义。

归因：有完整租户列、无平台内置行、无 NULL 租户 → 不需要全零归一/回填，直接套严格 B 范式。

### B. 拒绝为默认（3 张）

- `public.navigation_menu` / `public.pinned_apps` / `public.todos`：建表于 `20260725000000_business_base_tables.sql`，只有 `id`、`deleted_at` 两列（骨架表），0 行。
- 代码依赖核查（2026-11-18 全仓）：`(from|into|update|join)\s+(public\.)?(navigation_menu|pinned_apps|todos)` 在 `*.rs` 中 0 命中。
  - portal 的 todos 端点读写的是 `portal.portal_todos`（`svc/portal/src/modules/todos.rs`），与 `public.todos` 无关；
  - `pinned_apps` 读服务注册表 + 内存默认值，`reorder_pinned_apps` 为回显空操作（`svc/portal/src/modules/navigation.rs`）；
  - `navigation_menu` 无 SQL 访问。

归因：没有 tenant_id 就无法写租户策略；既然无读路径依赖，正确做法不是继续放行，而是删掉 `allow_all`、保持 RLS 开启，让「无策略 = 全拒绝」成为默认。将来表结构落地后再按那时的隔离维度（tenant_id / user_id）补策略。

### C. 保持现状（1 张）

- `public.user_settings`：无 `tenant_id`，按 `user_id` 做用户级隔离。

归因：这是用户维度而非租户维度，套 `tenant_id` 策略是错的。正确解是用户维度策略，但需要先定 `app.user_id` 之类的 GUC 约定（与 `app.tenant_id` / `app.rls_system` 对齐），不在本批范围。本迁移不改动它，后置断言校验其策略仍为 1 条，证明未被误伤。

## 3. 迁移实现要点

1. 前置断言：A 类必须 0 行且 `tenant_id` 为 `NOT NULL`；B 类必须 0 行。任一不符直接 `RAISE EXCEPTION` 中止（不做自动归属/自动清理）。
2. 迁移会话显式置 `app.rls_system='on'`、`app.tenant_id` 为全零，保证动态 DDL 不受策略影响。
3. 动态 `DROP POLICY` 清空 5 张目标表的既有策略。
4. A 类重建严格 `rls_tenant_isolation`（`FOR ALL TO public`，`USING` 与 `WITH CHECK` 同式）。
5. B 类仅重申 `ENABLE` + `FORCE`，不留策略。
6. 后置断言：A 类恰好 1 条策略且含 `app.rls_system` 分支、无 `tenant_id IS NULL` 放行、`rls/force` 均 true；B 类 0 条策略且 `rls/force` 均 true；`user_settings` 仍 1 条。
7. 文件内无 `BEGIN/COMMIT`，由 runner 单事务执行；含 `destructive-gate: allow` / `ticket: PLATFORM-CORPUS-20261117`。

## 4. 克隆库演练读数（m2_dryrun_20261116）

环境：本地克隆库，`topems_prod` 角色（非超户、无 BYPASSRLS）做六档读与写校验；夹具由超户注入/清理。

### 4.1 前置断言的反向验证

克隆库 `core_operation_logs` 残留 6 行（2026-11-17 12:31 engagement 探针审计流水，`user_name=probe-tenant`）。
带残留执行迁移 → 按预期中止：

```
NOTICE:  迁移前 public.core_operation_logs：总行 6，NULL 租户 0 行，tenant_id nullable=NO
ERROR:  中止：public.core_operation_logs 现有 6 行，超出本批「0 行免回填」前提，需重新定性
```

清理探针残留后 5 表 0 行，正式演练开始。

### 4.2 up

- 耗时 `real 0.03s`
- 后置断言：`A 类 2 张严格、B 类 3 张全拒绝、C 类 user_settings 未改动`
- 目录形态：`core_operation_logs`/`subscriptions` → `rls_tenant_isolation`；`navigation_menu`/`pinned_apps`/`todos` → 无策略；`user_settings` → `public_allow_all_user_settings`（未动）；6 表 `rls=t force=t`

### 4.3 六档读（列序：core_operation_logs / subscriptions / navigation_menu / pinned_apps / todos）

| 档位 | 读数 | 预期 |
| --- | --- | --- |
| 未设置（RESET 两者） | 0/0/0/0/0 | 0/0/0/0/0 |
| 空串 `app.tenant_id=''` | 0/0/0/0/0 | 0/0/0/0/0 |
| 全零租户 | 0/0/0/0/0 | 0/0/0/0/0（无平台内置行） |
| A `1111…` | 1/1/0/0/0 | 1/1/0/0/0 |
| B `2222…` | 1/1/0/0/0 | 1/1/0/0/0 |
| A + `app.rls_system='on'` | 2/2/0/0/0 | 2/2/0/0/0 |

B 类三表在 A 与系统通道下均为 0：夹具由超户写入 2 行后仍然不可见，证明是「策略拒绝」而不是「表为空」。

### 4.4 写校验（SQLSTATE）

| 场景 | 读数 |
| --- | --- |
| A 上下文写 B 租户 `core_operation_logs` | `42501` new row violates row-level security policy |
| A 上下文写 B 租户 `subscriptions` | `42501` |
| 正对照：A 上下文写 A 租户 `core_operation_logs` | `INSERT 0 1` 通过 |
| `navigation_menu` / `pinned_apps` / `todos` 在 A 或 system 上下文 INSERT | 均 `42501` |
| 同上 DELETE（有超户夹具 2 行） | `DELETE 0`（不可见即不可删） |

### 4.5 down

- 耗时 `real 0.03s`
- 5 张表逐表 `NOTICE: 回滚完成：… 已恢复 allow_all（rls=t force=t）`
- 六档回到全可见：未设置与 A 档均为 `3/2/2/2/2`（allow_all 生效）
- 以 `topems_prod` 删除夹具 3/2/2/2/2 行 → 5 表 0 行
- 再次 up，克隆库停在严格态（与 `20261117235500` 演练后的收尾口径一致）

## 5. 回滚语义

`20261118090000_allow_all_residuals_strict_and_deny.rollback.sql`：

1. 动态 DROP 5 张表的现有策略；
2. 逐表重建 `public_allow_all_<table> FOR ALL TO public USING (true) WITH CHECK (true)`；
3. 断言每表恰 1 条策略且 RLS 仍开启。

回滚把表重新置于「RLS 开启但全放行」的旧状态，仅用于回退验证；A 类已收紧的严格策略不在回滚目标内（回滚即完全回到迁移前形态）。

## 6. 部署与后续

- **生产 DDL 未执行**。演练通过后由业务方确定窗口，再按「迁移 + 回滚」包上线。
- A 类无部署耦合：写入端早已显式绑租户，只上迁移即生效。
- B 类只影响未使用的骨架表；若未来给三表落列并接入读写，必须先补策略，否则默认拒绝会让新代码读 0 行、写 42501。
- C 类 `user_settings` 的正确解（用户维度策略）依赖 `app.user_id` GUC 约定，单独立项，不与租户策略混用。
