# `core_tenants` 收紧草案与 12 处平台路由缺口（2026-11-18）

> 本轮范围：①出 `core_tenants` 收紧迁移草案 + 回滚并本地演练；②单列 12 处普通 `scope_with` 的平台路由缺口；③回答「系统通道是否误改依赖请求租户的路径」；④30 处 handler 改动**未提交**，等确认。
> 约束：只出草案，不申请上生产；未 push、生产零写入、未改历史迁移与 `migration_manifest.yaml`。

---

## 0. 摘要

| 项 | 结果 |
|---|---|
| 收紧草案 | [20261118140000_core_tenants_self_only.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118140000_core_tenants_self_only.sql) + 同名 rollback，已本地演练 |
| 六档 | T0=0、T1=0、T2=0、T3=1、T4=0、T5=1 |
| 写断言 | 本租户改 1 行；改他租户 0 行；插 NULL 行/他租户行均 `42501`；系统通道可写 |
| 回滚 | 恢复 `rls_global_read` + `rls_system_only`、`tenant_id` 回 NULL；再次 apply 通过 |
| 12 处缺口 | 已单列，本轮不修 |
| 风险问题 | 未发现把「依赖请求租户」的路径误改成全量的情况，排除方法见 §4 |

---

## 1. 收紧迁移草案

### 1.1 内容

1. 前置断言：表/列存在；已有非空 `tenant_id` 必须等于 `id`（否则拒绝，避免覆盖人工数据）。
2. 回填：`UPDATE public.core_tenants SET tenant_id = id WHERE tenant_id IS NULL`。
3. 删除 `rls_global_read` / `rls_system_only`，重建单条：

```sql
CREATE POLICY rls_tenant_isolation ON public.core_tenants
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (同上);
```

4. 后置断言：无 NULL 行、无 `tenant_id <> id`；仅 1 条策略；谓词含 `app.rls_system` / `app.tenant_id` / `NULLIF`，且**不得**含 `tenant_id IS NULL`；RLS/force=true。

GUC 兜底说明：`tenant_id = NULLIF(GUC,'')::uuid` 在 GUC 未设或空串时右侧为 NULL，比较结果不为真 → 读 0 行；全零 GUC 也不匹配任何自指行。未设 ≠ 平台。

### 1.2 配套代码前置（上线前必须同窗口）

迁移后 `tenant_id` 仍可空，且 `create_tenant` / `onboard_tenant` 的 INSERT 目前**不写 `tenant_id`**：

- [handlers.rs:269-282](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L269-L282)（create_tenant）
- [handlers.rs:597](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L597)（onboard_tenant）

若不改，新建租户 `tenant_id` 为 NULL，本租户自读为 0 行。草案头部已写明；备选是独立迁移加 `BEFORE INSERT` 触发器，本草案不选。

### 1.3 演练读数

环境：`topems_rls_scratch_20261118_r5`（1 行租户 `…0001`），DDL 由本地超级用户执行，读/写用 `SET ROLE topems_prod`。

| 档位 | T0 未设 | T1 空串 | T2 全零 | T3 租户A | T4 租户B | T5 系统 |
|---|---|---|---|---|---|---|
| 可见行数 | 0 | 0 | 0 | 1 | 0 | 1 |

写断言（T3=租户A）：

| 断言 | 结果 |
|---|---|
| 查自己 | 1 行 |
| 改自己 | 1 行 |
| 改租户B | 0 行 |
| 插 `tenant_id NULL` 行 | `ERROR: new row violates row-level security policy` |
| 插租户B行 | 同上 |
| T5 系统通道查看/清理 | 2 行 / 成功 |

回滚：执行 rollback 后策略恢复 `rls_global_read,rls_system_only`、`tenant_id` 全 NULL、1 行；六档恢复 fail-open 基线（T0–T4 均 1）。随后重新 apply 一次，后置断言通过，证明可重复演练；最终已回滚到基线。

---

## 2. 12 处普通 `scope_with` 的平台路由缺口（本轮不修）

这些 handler 操作的是**租户业务表**，策略已是「系统通道 OR 本租户」。超管 JWT 在中间件里是 nil + `system=off`，因此今天这些平台页面读 0 行 / 写 0 行或 `42501`。与 D 无关，是既有缺口。

| # | Handler（行） | 路由 | 操作表 | 超管今天 | 正确改法 |
|---|---|---|---|---|---|
| 1 | `list_tenant_modules` :933 | `GET /tenant/tenants/{id}/modules` | core_tenant_modules | 0 行 | `scope_with_system` + 保留 `$1` 租户过滤 |
| 2 | `activate_module` :970 | `POST /tenant/tenants/{tid}/modules/{code}/activate` | core_tenant_modules | INSERT `42501` | 同上 |
| 3 | `deactivate_module` :1026 | `POST …/deactivate` | core_tenant_modules | UPDATE 0 行 | 同上 |
| 4 | `get_tenant_users` :1108 | `GET /tenant/{id}/users` | core_tenant_users | 0 行 | 同上 |
| 5 | `invite_member` :1275 | `POST /tenant/{id}/users/invite` | core_tenant_users | INSERT `42501` | 同上（写入必须显式带 path 租户） |
| 6 | `remove_member` :1333 | `DELETE /tenant/{id}/users/{user_id}` | core_tenant_users | UPDATE 0 行 | 同上 |
| 7 | `update_member_role` :1376 | `PUT /tenant/{id}/users/{user_id}/role` | core_tenant_users | UPDATE 0 行 | 同上 |
| 8 | `get_current_tenant_context` :1656 | `GET /tenant/context` | core_tenant_users | 无 tenant claim 时 0 行 → “No tenant membership found” | **不能一律改系统通道**：租户用户仍用 `scope_with`；仅超管无 claim 分支改系统通道并保留 `user_id` 过滤 |
| 9 | `tenant_setting_get` :1919（helper） | `GET /tenant/{id}/settings`、`/branding` | core_tenant_settings | `{}`（空配置） | `scope_with_system` + `$1` 过滤 |
| 10 | `tenant_setting_put` :1961（helper） | `PUT /tenant/{id}/settings`、`/branding`、`/security`、`/security/password-policy`、`/email-config`、`/billing/subscription` | core_tenant_settings | upsert `42501` | 同上 |
| 11 | `tenant_setting_array` :2259（helper） | `GET /tenant/{id}/domains`、`/email-config`、`/integrations`、`/webhooks`、`/security/api-keys`、`/security/audit-logs`、`/security/sessions` | core_tenant_settings | `[]` | 同上 |
| 12 | `tenant_coll_write` :2464（helper） | 上述配置的增删改（domains/webhooks/integrations/api-keys/sessions/ip-whitelist/billing card） | core_tenant_settings | `42501` | 同上 |

要点：

- 4 个 helper 只在 [handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs) 内被平台 handler 调用，无租户侧复用（grep 全仓确认）。
- 改动属独立一项，建议与 §1 的 `create_tenant` INSERT 补 `tenant_id` 同批，避免平台页面继续空。

---

## 3. 30 处 handler 改动状态

改动保留在工作树，**未提交**，等确认：

- [scope.rs](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/scope.rs#L311-L341)：2 个新方法；
- [handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs)：29 处 `scope_with_system` + 1 处 `scope_savepoint_system`，及 263 行注释修正；
- 未新增/修改其他文件。

---

## 4. 风险回答：系统通道是否误改「依赖请求租户」的路径

**结论：没有。** 30 处中没有任何一处原本靠 `scope_with` 继承请求租户来限定范围，改成系统通道后才有全量风险；排除依据三条：

1. **路由层**：这 30 处所在路由全部挂在 `require_permission("iam:tenant:read")` 或 `admin:iam:tenant:write`（[master.rs:167](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/master.rs#L167)、[:365](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/master.rs#L365)），是平台管理面；租户侧无入口（上轮已全仓核实）。
2. **SQL 层**：每处都显式带过滤，不依赖 RLS 兜底——
   - 目录/统计：`WHERE id = $path_id`；
   - `get_my_tenants` / `switch_tenant`：`user_id = claims.sub`，`switch_tenant` 还先验成员关系；
   - 内部 helper：`ensure_tenant_exists` / `tenant_billing_default` / `tenant_features_*` 均以显式 `tenant_id` 参数过滤，且调用点只在本文件的平台 handler（grep 无外部调用）。
3. **保留项**：真正依赖请求租户的 12 处（§2）全部保持 `scope_with` 未动；`get_current_tenant_context` 的租户用户分支也保持原样。

因此系统通道只扩大了「平台管理员在明确 `id`/`user_id` 过滤下可见的行」，没有出现「原本按请求租户限定、改后变成无过滤全量」的路径。

---

## 5. 未做与下一步

- 未申请上生产；`20261118140000` 未写入 `migration_manifest.yaml`。
- 待确认后再做：①30 处 handler 是否提交；②`create_tenant` / `onboard_tenant` 补 `tenant_id`；③§2 的 12 处是否按表改；④`global_row_metrics` 的 `tenant_id IS NULL` 口径。
