# prod 剩余迁移分类甄别（2026-11-06，只读）

- 状态：**只读完成；prod 零 DDL / 零 DML / 零重启**
- 现场：`_sqlx_migrations` **581 行、failed 0、max version `20261107000018`**
- 范围：`20261107` 批次 **14 条** pending + 同域补充 **2 条**（`20261105235800`、`20261106000001`）
- 结论：类别 1 共 2 条、类别 2 共 2 条、类别 3 共 10 条；补充 2 条均为类别 3，其中 `20261105235800` 属**安全类、不得应用**

---

## 0. 口径与 pending 集合

`apply-forward.sh` 只扫描 `version > anchor`，anchor 取 prod 账本最大版本 `20261107000018`。本轮用「本地 `database/migrations/*.sql` 版本 − prod 账本版本」得到 21 条差集：

| 分组 | 数量 | 版本 |
| --- | --- | --- |
| 本批 14 条主表 | 14 | `20261107000001/02/03/04/05/06/07/09/10/11/12/14/15/16` |
| 同域补充 | 2 | `20261105235800`、`20261106000001` |
| DB-2x 定向/补迁移（不纳入） | 5 | `20261105110000`、`20261105120000`、`20261105145000`、`20261105150000`、`20261105180000` |

5 条不纳入项的实际性质：

| 版本 | 文件 | 性质 |
| --- | --- | --- |
| `20261105110000` | `db20_test_timestamptz_align_prod_169cols.sql` | test 库时间类型对齐 |
| `20261105120000` | `db21_test_varchar_numeric_widen_16cols.sql` | test 库类型加宽 |
| `20261105145000` | `finance_currency_master_fix.sql` | DB-22：test 手工建表补迁移；prod 该表已存在（16 行），不需应用 |
| `20261105150000` | `db23_test_type_align_4cols.sql` | test 库类型对齐 |
| `20261105180000` | `db24_test_rfm_numeric_2cols.sql` | test 库数值列对齐 |

> 说明：用户口径的「14 条」对应 `20261107` 批次；严格差集另有 `20261105235800` 与 `20261106000001` 两条同样 pending，已在第 3 节单独列出，避免漏判。

---

## 1. 14 条分类总表

类别定义：

- **类别 1**：prod 实测已满足 → 可清账本（纯对账）；
- **类别 2**：prod 未满足，且属于安全或正确性收紧 → 应尽快开窗实际执行；
- **类别 3**：prod 未满足，但涉及数据判断/口径/取代关系 → 单独评估。

| # | 版本 | 迁移 | 类别 | prod 实测 | 一句话依据 | 处置建议 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `20261107000001` | public 权限码补齐（BI/MES/WMS） | 3 | public 共 986 码；目标 4 码中 3 码缺失 | 权限**新增/放权**，不是收紧；用于修正 `20261106000001` 按 search_path 落入 `mes` 的缺口 | 与 `000001` 合并到权限批次；先于 `20261106000001` |
| 2 | `20261107000002` | 给 public + iam 补 `tier` | 3 | public 有 `tier`；`iam.core_tenant_modules` 存在、0 行、无 `tier` | 已被 `20261107000014` 取代；应用只会给未使用的 iam 副本加列 | **不应用**，登记 superseded |
| 3 | `20261107000003` | DROP communication 通知影子表 | **2** | 3 张副本均 0 行；`public.core_email_templates` 不存在 | 0 行副本且 `core_notifications/core_emails` RLS 关闭、无 `tenant_id`；但 email_templates 会被守卫跳过 | 批次 1 |
| 4 | `20261107000004` | DROP 4 张高危影子表 | **2** | 4 张副本均 0 行；public 权威表：字典 77/397、模板 0、围栏 0 | 消除 RLS 关闭/无 `tenant_id` 的副本与 `search_path` 裸名歧义 | 批次 1（优先） |
| 5 | `20261107000005` | 批 16 资源写码 135 条 | 3 | `[batch16]` 描述 0 行 | 权限**新增/放权**；且与 `20261107000012` 有 3 码交集 | 先裁决 hrm 冲突，再应用 |
| 6 | `20261107000006` | 批 17 权限码 30 条 | 3 | `[batch17]` 0 行 | 权限新增，非收紧 | 批次 3 |
| 7 | `20261107000007` | 批 18 权限码 27 条 | 3 | `[batch18]` 0 行 | 权限新增，非收紧 | 批次 3 |
| 8 | `20261107000009` | tenant 成员 update/delete 2 码 | 3 | 2 码均缺失 | 写路径真实引用（后端 `handlers.rs:1030/1057`、前端 `TenantMembersTab.tsx:25/31`），属功能修复 | 批次 3 |
| 9 | `20261107000010` | erp_manager 授 `finance:voucher:read` | 3 | 授予行 0；`finance:voucher:read` 存在；`core_roles.erp_manager` 存在 | 跨域**只读授权**，产品决策，非收紧 | 批次 3 |
| 10 | `20261107000011` | 批 24 资源 CRUD 码 21 条 | 3 | 21 码均不存在 | 新增码，但 **VALUES 列序错位**（`name/resource/action` 互换） | **修复列序前不得应用** |
| 11 | `20261107000012` | 批 25 删除 92 条未消费码 | 3 | 92 条中 89 条存在；缺失 3 条恰为 hrm 写码；文件记录影响 276 行授权 | 权限最小化，但属数据判断；与 `000005` 冲突 | 裁决后应用；建议先于 `000005` |
| 12 | `20261107000014` | public-only 补 `tier` | **1** | `public.core_tenant_modules.tier` 已存在（`varchar(32)`、可空、默认 `basic`）；表 0 行 | 主效果已满足；`ADD COLUMN IF NOT EXISTS` 对已存在列空转 | 可对账清账；**NOT NULL 未达成**，如需严格另补迁移 |
| 13 | `20261107000015` | 认证表 RLS 全 0 分支 | 3（安全敏感） | 策略仅租户分支；owner `topems_prod`、`relforcerowsecurity=f`；应用 5 条连接均为 `topems_prod` | 当前 owner 绕过 RLS，补丁无运行收益，却扩大**非 owner** 角色的可见面 | **暂缓**，角色模型变更时重评 |
| 14 | `20261107000016` | DROP 特权函数 | **1**（安全） | `pg_proc` 中 `iam_refresh_token_*` **0 个**；二进制 0 处引用 | prod 已是安全状态，DROP 空转 | 可对账清账 |

**汇总：类别 1 = 2 条（14/16）；类别 2 = 2 条（3/4）；类别 3 = 10 条。**

---

## 2. 补充 2 条（同域 pending，不在 14 条主表）

| 版本 | 迁移 | 类别 | prod 实测 | 一句话依据 | 处置 |
| --- | --- | --- | --- | --- | --- |
| `20261105235800` | `iam_refresh_token_privileged_lookup` | 3（**安全类·不得应用**） | 两个函数均不存在；代码/二进制 0 引用 | 它**创建** `SECURITY DEFINER` 特权函数，是方案 C 的加权限迁移；已被 `000015/000016` 回退 | **永不应用**，登记 superseded |
| `20261106000001` | 权限码 BI/MES/WMS 统一 | 3 | 旧拼写 0 行；新 5 码中 3 码缺失 | SQL 使用未限定名 `core_permissions`，历史上按 search_path 落入 `mes`；`000001` 已在 public 侧补齐 | **不应用**，由 `000001` 取代 |

---

## 3. 安全类专项（逐条核实 prod 现状）

### 3.1 `20261105235800`：特权函数迁移，不得应用

prod 只读实测：

```text
FUNC_COUNT|0
```

`pg_proc` 中不存在 `public.iam_refresh_token_lookup(text)` / `public.iam_refresh_token_revoke(text)`；因此也没有 `prosecdef`、`proacl`、可调用角色可查。

该迁移若被应用，会创建：

```text
public.iam_refresh_token_lookup(p_token_hash text)
  RETURNS TABLE(id, tenant_id, user_id, token_hash, expires_at, revoked_at,
                username, email, is_active, is_superuser,
                must_change_password, roles text[], permissions text[])
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public

public.iam_refresh_token_revoke(p_token_hash text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
```

并且：

- `ALTER FUNCTION ... OWNER TO topems`（prod `topems` 为 superuser）；
- `REVOKE ALL ... FROM PUBLIC`；
- `GRANT EXECUTE ... TO topems_app`（prod `topems_app` 存在但 `rolcanlogin=f`）。

**不修会留下什么**：prod 当前没有这两个函数，也没有任何 EXECUTE 授权；不应用它不留下残留风险。相反，应用它才是新增攻击面：函数以 superuser owner + `SECURITY DEFINER` 绕过 `core_refresh_tokens` 的 RLS，能按 `token_hash` 读取任意租户的 refresh 令牌并吊销任意令牌。当前代码与运行二进制均 0 引用（`grep` 0 命中、`strings` 0 命中），`topems_app` 不可登录，所以实际可调用集合为空；但一旦应用连接角色改为 `topems_app`，任何持有该凭据的进程都能跨租户读/吊销令牌。

**结论：不应用；`000016` 已把 prod 保持在「函数不存在」的安全状态。**

### 3.2 `20261107000016`：DROP 特权函数，prod 已满足

- `FUNC_COUNT|0`：函数本就不存在；
- `strings topems-server | grep -c iam_refresh_token` = **0**；
- 当前 `auth.rs` 已回退为直接查表（`SELECT set_config('app.tenant_id', $1, true)` + `public.core_refresh_tokens` 查询/更新）。

**不修会留下什么**：没有。函数不存在就是目标状态；应用 `000016` 为空转，只新增账本行。归为类别 1。

### 3.3 `20261107000015`：认证表 RLS 全 0 分支，暂缓

prod 当前策略：

```text
POLICY|core_refresh_tokens|core_refresh_tokens_tenant_isolation|PERMISSIVE|{public}|ALL|
(tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
 '00000000-0000-0000-0000-000000000001'::uuid))|
POLICY|core_sessions|core_sessions_tenant_isolation|PERMISSIVE|{public}|ALL|
(tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
 '00000000-0000-0000-0000-000000000001'::uuid))|
RLS|public|core_refresh_tokens|t|f|topems_prod
RLS|public|core_sessions|t|f|topems_prod
ROLE|topems|t|f|t
ROLE|topems_app|f|f|f
ROLE|topems_prod|f|f|t
APP_CONN|topems_prod|5
```

关键事实：

- 两张表 **RLS 已开启但未 FORCE**，owner 为 `topems_prod`；
- prod 应用连接（5 条）全部是 `topems_prod`，即**表 owner**，RLS 直接绕过；
- `topems_prod` 不是 `topems_app` 的成员，代码中也没有 `SET ROLE`；
- 因此 `000015` 的「全 0 分支」在 prod 当前**不改变任何运行行为**；
- 当前代码只有 `auth.rs:765` 与 `auth.rs:1131` 绑定全零（refresh/logout 两条路径），没有其它业务路径使用全零上下文。

**不修会留下什么**：保持「仅租户分支」的严格策略；owner 继续绕过 RLS，refresh/logout 的可见性不受策略影响。没有安全缺口。

**应用风险**：`000015` 会把两张令牌/会话表对**任何非 owner 角色**的全 0 上下文开放为「全部租户可见」。prod 现在没有可登录的非 owner 角色（`topems_app` 不可登录），但未来若切换为最小权限连接角色，这会成为跨租户令牌枚举面。建议暂缓；若未来切换角色，改为「仅认证专用角色」或重新评估 `SECURITY DEFINER` 方案，不要直接把 OR 分支放进通用策略。

### 3.4 `20261107000003/000004`：影子表，安全/正确性收紧

prod 只读实测（存在性 / RLS / tenant_id / 行数）：

| 表 | 存在 | RLS | FORCE | 有 `tenant_id` | 行数 | 权威表 |
| --- | --- | --- | --- | --- | --- | --- |
| `communication.core_notifications` | 是 | off | off | 否 | 0 | `public` 6 行 |
| `communication.core_emails` | 是 | off | off | 否 | 0 | `public` 0 行 |
| `communication.core_email_templates` | 是 | on | on | 是 | 0 | **`public` 不存在** |
| `communication.core_notification_templates` | 是 | off | off | 是 | 0 | `public` 0 行 |
| `communication.core_geofences` | 是 | off | off | 否 | 0 | `public` 0 行 |
| `master_data.core_dict_types` | 是 | on | on | 否 | 0 | `public` 77 行 |
| `master_data.core_dict_items` | 是 | on | on | 否 | 0 | `public` 397 行 |

**不修会留下什么**：7 张副本保留；其中 **4 张 RLS 关闭**（`core_notifications`、`core_emails`、`core_notification_templates`、`core_geofences`），**5 张缺少 `tenant_id`**（`core_notifications`、`core_emails`、`core_geofences`、`master_data.core_dict_types`、`master_data.core_dict_items`）。`communication` / `master_data` 的 `search_path` 会把裸名 SQL 优先解析到副本，未来任何未限定的写入可能落到错误实体（租户隔离失效或读到空副本）。这不只是“干净度”，是隔离正确性问题。

**应用风险**：

- 代码侧已全部 `public.*` 限定：`notification.rs`、`im_location.rs`、`core_notification_templates`、`master-data/dict/handlers.rs`；`schema_defense.rs` 的 `TABLE_DEFS` 已移除对应条目；
- `mail.rs` 仍使用裸名 `core_email_templates`，而 `public.core_email_templates` 不存在；`000003` 的守卫会跳过该副本，因此**不会打断邮件模板路径**；不要手工删除它；
- prod 运行二进制构建于 17:17，包含 16:11 的 auth 回退提交；影子表清理提交为 10:03/10:59，早于该构建，且 `strings` 未出现 schema 限定的影子表建表名，重启复活风险低；应用前仍建议用 `strings` 复核一次；
- `000003` 实际只删 `core_notifications` / `core_emails` 两张，`core_email_templates` 会被 NOTICE 跳过；`000004` 删 4 张。

**结论**：归为类别 2，建议批次 1 执行；不需要重启服务（纯 DROP 未被代码引用的 0 行副本）。

---

## 4. 权限与 tier 项的关键证据

### 4.1 prod 权限码现状

```text
COUNTS|batch16=0|batch17=0|batch18=0|batch19=0|batch24=0|total=986
OLDSPELL|0
NEWCODE|bi:data_source:read / mes:work_order:read / wms:stocktake:read（3 条）
ERPGRANT|0（erp_manager 对 finance:voucher:read 的授予行）
```

- `000001` 目标 4 码中缺 3 码（`bi:data_source:write`、`mes:work_order:write`、`wms:stocktake:write`）；
- `20261106000001` 目标 5 码中同样缺 3 码，且旧拼写 0 行；其 SQL 使用未限定 `core_permissions`（`20261106000001:13-44`），历史上按 search_path 落入 `mes`，因此**不应用**，由 `000001` 的 public 补齐取代；
- `000010` 的目标权限存在、`core_roles.erp_manager` 存在（1 条），授予行 0，应用后只新增 1 条跨域只读授权。

### 4.2 批 25 删除集与批 16 冲突

```text
000012 删除集 = 92 条；prod 存在 89 条；缺失 3 条：
  hrm:training_plan:create
  hrm:training_plan:delete
  hrm:training_plan:update
000005（批 16）新增集 = 135 条；与 000012 删除集交集 = 3 条（同上）
```

- `000012` 文件头声明「94/94 三端零引用」「EntitySchema 752 码交集 0」「影响 276 行授权」；
- 但 `000005` 明确新增 `hrm:training_plan:create/update/delete`（`20261107000005:33`）；
- 两条迁移都 pending，应用顺序决定最终状态：先 `000012` 后 `000005` → 3 码最终存在；先 `000005` 后 `000012` → 3 码最终被删；
- 这不是纯顺序问题，而是**口径冲突**：批 16 认为 CRUD 页需要这 3 码，批 25 认为三端零消费。应用前必须裁决，不能两条都照原样按默认顺序跑。

### 4.3 批 24 列序错位

`20261107000011:26-50`：

```sql
INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT v.code, v.name, v.resource, v.action, v.level
FROM (VALUES
  ('aps:material_plan:create','aps:material_plan','create','material_plancreate',1),
  ...
) AS v(code, name, resource, action, level)
```

VALUES 实际顺序是 `(code, resource, action, name, level)`，与列清单 `(code, name, resource, action, level)` 不一致。应用后 `name` 会得到资源名、`resource` 会得到动作名、`action` 会得到 `material_plancreate` 这类拼接串。虽然 `code` 正确、多数鉴权按 code，但权限元数据会被污染，且影响 `resource/action` 统计与后续审计。

**结论：`000011` 修复列序前不得应用。**

### 4.4 `tier` 的精确现状

```text
TIER_EXACT|tier|character varying|32|YES|'basic'::character varying
MODULES|public.core_tenant_modules 0 行
IAM_MODULES|iam.core_tenant_modules 0 行，无 tier 列
```

- `000014` 的 `ADD COLUMN IF NOT EXISTS` 对已存在列**不会**把 `YES` 改成 `NOT NULL`，也不会改变现有默认值；迁移会打印「已就绪（NOT NULL）」，但实际仍是可空；
- 当前表 0 行，且 `activate_module` 的 INSERT 未显式写 tier，会走默认值 `basic`，所以运行期不会出现 NULL；
- 若要求结构与声明严格一致，需要另开一条 `ALTER TABLE ... ALTER COLUMN tier SET NOT NULL`（0 行，安全），不要修改已应用的 `000014` 字节。

---

## 5. 代码侧引用点与调用条件

| 对象 | 引用点 | 结论 |
| --- | --- | --- |
| `iam_refresh_token_lookup/revoke` | 全仓 `grep` 0；prod 二进制 `strings` 0 | 无调用方；`235800` 不得应用 |
| 认证全零上下文 | `svc/unified-core/src/modules/iam/auth.rs:765`、`:1131`（`set_config`）；查询 `:790`、`:1144`；logout 更新 `:1256` | 仅 refresh/logout 两条路径；owner 连接使 RLS 不生效 |
| `core_refresh_tokens` 直查 | `auth.rs:790`、`:971`、`:1256` 等 | 当前走直接查表，不依赖特权函数 |
| 通知/围栏/模板 | `notification.rs` 全部 `public.core_notifications`；`im_location.rs` 全部 `public.core_geofences`；`notification.rs:2310+` `public.core_notification_templates` | `000003/000004` 删除副本不打断 |
| 字典 | `master-data/.../dict/handlers.rs`、`seed.rs` 全部 `public.core_dict_*` | `000004` 删除副本不打断 |
| 邮件模板 | `mail.rs:870/992/1098/1200/1309/1401/2161` 裸名 `core_email_templates` | `000003` 守卫跳过，保留 communication 副本；不可手工删 |
| `000012` 删除码 | 抽样 `crm:opportunity:create`、`report:builder:read`、`mes:kanban:update`、`wms:supplier:delete` 在 `apps/web` 0 命中 | 与文件头审计一致；应用前需在当前 HEAD 重跑 grep |
| `000009` | 后端 `handlers.rs:1030/1057`、前端 `TenantMembersTab.tsx:25/31` | 真实写路径引用，应用后修复 403 |
| `000010` | `svc/finance/src/modules/mod.rs:290`、`cqrs_routes.rs:130` | 权限码真实使用；授予 erp_manager 属产品决策 |
| `000011` | 迁移自身 `:26-50` 列序错位 | 修复前不得应用 |

---

## 6. 建议窗口批次

### 批次 1：安全/正确性收紧 + 两条纯对账（建议优先）

一起应用：`20261107000004`、`20261107000003`、`20261107000014`、`20261107000016`。

前置：

1. prod 账本 anchor 仍为 `20261107000018`；`--only` 这 4 条，其余 12 条主表 + 2 条补充显式 `--defer`，fail-closed；
2. 应用前用 `strings` 复核运行二进制不再包含 `communication.core_notifications` 等 schema 限定建表名（避免重启复活）；
3. 四张副本均 0 行，不需要数据备份；记录 `to_regclass` 与行数现场；
4. `000014/000016` 为空转，仅新增账本行；`000003/000004` 为 DROP 0 行副本。

后置核对：

- 账本只新增 4 条且 `success=t`；
- `to_regclass`：`communication.core_notifications`、`communication.core_emails`、`master_data.core_dict_types`、`master_data.core_dict_items`、`communication.core_notification_templates`、`communication.core_geofences` 均为 NULL；
- `communication.core_email_templates` **仍存在**（守卫跳过）；
- `public.core_dict_types/items` 仍为 77/397，`public.core_notifications` 仍为 6；
- `/health`、`/api/server/ready` 与既有冒烟 200；不重启服务。

### 批次 2：认证安全决策（暂缓）

- `20261107000015`：**不应用**，直到连接角色从 owner 切到最小权限角色并重新设计策略；
- `20261105235800`：**永不应用**，登记 superseded；
- `20261107000016` 已在批次 1 清账，无需重复。

### 批次 3：权限数据（需先裁决/修复）

前置裁决：

1. `hrm:training_plan:create/update/delete`：保留还是删除？二选一：
   - 若采纳批 25「三端零消费」→ 从 `000005` 的 VALUES 中移除这 3 码，再应用；
   - 若采纳批 16「CRUD 页需要」→ 从 `000012` 删除集中移除这 3 码，再应用。
2. `20261107000011` 修正 VALUES 列序（`code, name, resource, action, level` 对应正确值），修正后再应用；不要修改已应用迁移字节，本迁移仍 pending，可直接改。
3. 应用顺序建议：`000012`（先清理 89 条存量） → `000001`（public 补齐） → `000005/000006/000007/000009/000010`（按域） → `000011`（修复后）；`20261106000001` 不应用。
4. 前置备份 `public.core_permissions` / `public.core_role_permissions`；应用前在当前 HEAD 重跑三端 grep 与 752 码交集校验；后置核对权限码/授权行数、`finance:voucher:read` 对 erp_manager 的授予、tenant 成员写接口。

### 不应用/登记 superseded（不伪造账本成功）

- `20261107000002`：由 `000014` 取代；
- `20261106000001`：由 `000001` 取代；
- `20261105235800`：安全类，永不应用；
- `20261107000015`：暂缓，等角色模型决策。

> 这些版本保持 pending，并在文档/TODO 标注“已裁决不应用”，不要手工插入 `success=t` 伪造执行；类别 1 的 `000014/000016` 通过实际执行空转迁移来清账。

---

## 7. 遗留与决策点

1. **prod 连接角色是 owner**：应用 5 条连接均为 `topems_prod`，RLS 不生效；`topems_app` 不可登录。任何“RLS 收紧/放开”的迁移在 prod 当前都不改变运行行为。要真正落地租户隔离，需要先改连接角色（单独立项）。
2. **`000015` 的安全权衡**：全 0 分支只应存在于认证专用角色/专用函数；不要复制到业务表。
3. **hrm 3 码冲突**：`000005` 与 `000012` 口径冲突，必须人工裁决。
4. **`000011` 列序 bug**：修复前不得应用。
5. **`000014` 的 NOT NULL 未达成**：`ADD COLUMN IF NOT EXISTS` 不改既有列；如需严格结构，另开 `SET NOT NULL` 迁移。
6. **`000003` 跳过 `core_email_templates`**：`public.core_email_templates` 不存在，`mail.rs` 仍依赖 communication 副本；本轮不处理，后续要么建 public 权威表，要么明确保留 communication 表。
7. **账本约定**：superseded 项不伪造成功；类别 1 通过空转执行清账；Gate DRIFT 目前只覆盖 8 条关键断言，不含 tier/影子表/权限码。

---

## 8. 只读证据命令（本轮已执行）

```sql
-- 账本
SELECT count(*), count(*) FILTER (WHERE NOT success), max(version) FROM _sqlx_migrations;

-- 特权函数
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
       p.prosecdef, p.proowner::regrole, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE 'iam_refresh_token_%';

-- 策略 / RLS / owner
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE tablename IN ('core_refresh_tokens','core_sessions');

-- 角色与连接
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles
WHERE rolname IN ('topems','topems_prod','topems_app');
SELECT usename, count(*) FROM pg_stat_activity
WHERE datname = 'topems_prod' GROUP BY usename;

-- 影子表存在性 / RLS / tenant_id / 行数
SELECT ... FROM pg_class / information_schema.columns / count(*);

-- 权限码
SELECT count(*) FILTER (WHERE description LIKE '[batch16]%') ... FROM public.core_permissions;
SELECT code FROM public.core_permissions WHERE code IN (...);
```

本轮 prod 只执行上述 `SELECT`，**无 DDL、无 DML、无重启**。

---

## 9. 补充裁决：`hrm:training_plan:create/update/delete`（2026-11-06 只读复核）

**结论：删除（不保留）。`000012` 的删除清单保持原样，无需排除这 3 条；`000005` 不改字节，但必须保证先于 `000012` 应用。**

### 9.1 代码侧消费点（全仓 grep `hrm:training_plan`，19 处）

| 位置 | 内容 | 是否消费 |
|---|---|---|
| [hrm/config.ts#L903-L917](file:///Users/air/TOPEMS/apps/web/src/modules/hrm/config.ts#L903-L917) | 路由 `hrm-training-plan`，`requiredPermissions: ['hrm:training_plan:read']` | 只消费 **read** |
| [hrm/config.ts#L1161-L1166](file:///Users/air/TOPEMS/apps/web/src/modules/hrm/config.ts#L1161-L1166) | 菜单项 `permission: 'hrm:training_plan:read'` | 只消费 **read** |
| [permissions.ts#L605](file:///Users/air/TOPEMS/apps/web/src/config/permissions.ts#L605) | 前端权限清单登记 `hrm:training_plan:read` | 仅登记 |
| [schemas/hrm/training.ts#L14-L15](file:///Users/air/TOPEMS/apps/web/src/schemas/hrm/training.ts#L14-L15) | CrudPage 的 `permissionResource: 'hrm:training'`（注释「批 23…三码齐全」） | 写按钮实际拼的是 **`hrm:training:*`** |
| [CrudPage.tsx#L326-L339](file:///Users/air/TOPEMS/apps/web/src/components/templates/CrudPage.tsx#L326-L339) | `permissionResource` 自动展开 | 展开规则见下 |
| [crudPermissions.ts#L29-L35](file:///Users/air/TOPEMS/apps/web/src/components/templates/crudPermissions.ts#L29-L35) | `${prefix}:create` / `:update` / `:delete` | 前缀是 `hrm:training`，**不是** `hrm:training_plan` |
| [training.rs#L20-L47](file:///Users/air/TOPEMS/svc/hrm/src/modules/training.rs#L20-L47) | 后端 `/training-plans` 等路由存在 | 路由活着 |
| [training.rs#L130-L146](file:///Users/air/TOPEMS/svc/hrm/src/modules/training.rs#L130-L146) | `create_plan`：只用 `Claims` 取 `tenant_id`，**无权限码校验** | 不消费 |
| [hrm/main.rs#L106-L112](file:///Users/air/TOPEMS/svc/hrm/src/main.rs#L106-L112) | 整个 hrm 业务路由统一挂 `require_permission("hrm:admin")` | 只校验 `hrm:admin`，与这 3 码无关 |
| [000005:33](file:///Users/air/TOPEMS/database/migrations/20261107000005_resource_write_codes.sql#L33) | 批 16 按「有 read 码的资源补三码」机械新增这 3 条 | 仅登记 + 授权 |
| [000012:68-70 / 165-167](file:///Users/air/TOPEMS/database/migrations/20261107000012_drop_unused_permission_codes_batch25.sql#L68-L70) | 批 25 删除这 3 条 | 仅登记 |

- 全仓 **没有任何一处**以 `hrm:training_plan:create/update/delete` 做鉴权、按钮过滤或菜单过滤；
  `training.rs` 里 create/update/delete 三个 handler 完全没有 `check_permission` 调用（对比同 crate 的
  `employee.rs`/`position.rs`/`department.rs` 都显式调用）。
- 前端真正生效的写码是 `hrm:training:create/update/delete`（由 `permissionResource` 展开），
  与这 3 条不是同一组码。

### 9.2 prod 数据面（现场只读）

```text
PERM|hrm:training_plan:read    row=ce453dba-…  level=1  desc=Auto-registered from frontend usage: hrm/config
（create/update/delete 3 条：0 行）
GRANT|hrm:training_plan:read   <no-role>|1      → 实际授予 0 个角色
GRANT|hrm:training:create/update/delete/read   hrm_manager 各 1 行（这组才有人持有）
TRAIN|hrm.training_plans|courses|records|participants  rows = 0 / 0 / 0 / 0
TRAIN|plans_ts  max(created_at)=<null>  max(updated_at)=<null>
AUDIT|entity_type 命中 train/hrm = 0 行
```

- 与 §4.2 一致：`000012` 删除集 92 条里，prod 只缺这 3 条（其余 89 条存在）；
  **这 3 条在 prod 不是「待删除的存量」，而是「根本不存在」**，`000012` 对它们是 0 行空转。
- 本地库（`topems`）同样没有这 3 条写码：`000005` 账本 `success=t`，但当前表内无这 3 行，
  **账本与数据存在漂移**，权限批次前需一并复核；已演练环境的净效果同样是「不存在」。

### 9.3 功能是否活

- 路由：`/training-plans`、`/training-plans/{id}`、`activate/deactivate` 等均存在（`training.rs:20-47`）；
- 页面：`apps/web/src/pages/hrm/setting/TrainingPlanPage.tsx` 存在；
- 入口：路由 `hrm-training-plan`（`config.ts:903`）+ 菜单项（`config.ts:1161`）都在，仅需 `hrm:training_plan:read`；
- **使用痕迹：prod 4 张培训表全 0 行、无创建/更新时间、审计日志 0 条** → 功能「可达但未使用」。
- 因此删除这 3 个码 **不改变任何可达性**：页面/菜单/路由仍凭 `hrm:training_plan:read` 进入，
  写按钮仍凭 `hrm:training:create/update/delete` 显示。

### 9.4 删除后失去什么 / 是否需要下线页面

- 失去的只是 3 条**无人校验、无人持有**的权限登记行；prod 本来就是 0 行，**无能力损失**。
- **不需要**下线页面、路由或菜单；也不需要对 `hrm:training_plan:read` 做任何处理。
- 唯一注意点：若未来要把后端培训写接口做成细粒度鉴权，应统一使用 `hrm:training:create/update/delete`
  （与 FE `permissionResource` 对齐），不要再复活 `hrm:training_plan:*` 这套命名。

### 9.5 `000012` / `000005` 怎么调

1. **`000012` 不改**：删除清单保留这 3 条（`000012:68-70/165-167`）。prod 上它们是 0 行，
   `DELETE` 空转；在有存量的环境里则正常清掉。
2. **`000005` 不改字节**（本地/test 已 `success=t`，改字节会破坏 checksum）。它给
   `hrm_manager` 授这 3 条同样无消费，`000012` 会连同授权行一起删。
3. **顺序约束（必须写进批次单）**：`000005` 先于 `000012`。若某环境先跑 `000012` 再跑 `000005`，
   这 3 条会被重新插入（复活）。prod 当前两条都 pending，按版本顺序执行即最终为「不存在」。
4. 若坚持「批 16 语义」要保留写码，正确做法是把 `000005` 里的 3 条改成
   `hrm:training:*`（与 FE 一致），并从 `000012` 删除集排除——但这会新增 3 条码并牵动授权，
   属另一批变更，**本裁决不采纳**。

### 9.6 复核命令（本轮只读）

```sql
-- prod
SELECT code, id, level, description FROM public.core_permissions WHERE code LIKE 'hrm:training%';
SELECT p.code, r.name, count(*) FROM public.core_permissions p
  LEFT JOIN public.core_role_permissions rp ON rp.permission_id=p.id
  LEFT JOIN public.core_roles r ON r.id=rp.role_id
 WHERE p.code LIKE 'hrm:training%' GROUP BY 1,2 ORDER BY 1;
SELECT count(*) FROM hrm.training_plans;  -- courses / records / participants 同
SELECT count(*) FROM public.audit_logs WHERE entity_type ILIKE '%train%';
```

本轮 **无代码改动、prod 无 DDL/DML/重启**。

---

## 10. `000001` 补应用与邮件模板链路拆解（2026-11-06 只读，待拍板）

本轮**只读**：未改代码、prod 无 DDL/DML/重启。

### 10.1 `20261107000001` 到底做什么

文件：`database/migrations/20261107000001_iam_core_public_authority_sync.sql`。
目标表：`public.core_permissions`。语义：`INSERT ... WHERE NOT EXISTS(code)`，**无 UPDATE、无 DELETE、无授权 SQL**。
`id`/`created_at` 走表默认（`gen_random_uuid()` / `now()`）；`level` 显式不写 → **NULL**（prod 现有 653 行同样为 NULL，口径一致）。

| # | code | name | resource | action | level | prod 现状 |
|---|---|---|---|---|---|---|
| 1 | `bi:data_source:write` | BI 数据源写入 | `bi` | write | NULL | **不存在** |
| 2 | `mes:work_order:write` | MES 工单写入 | `mes` | write | NULL | **不存在** |
| 3 | `wms:stocktake:read` | WMS 盘点读取 | `wms` | read | NULL | **已存在**（name 为码本身、resource=`wms:stocktake`、level=1、0 授权） |
| 4 | `wms:stocktake:write` | WMS 盘点写入 | `wms` | write | NULL | **不存在** |

- **预计影响行数**：`INSERT` **3** 行（第 3 条被 `NOT EXISTS` 跳过，且**不会**覆盖既有行的 name/resource）。
- 该迁移**不授予任何角色**，所以 `core_role_permissions` 变化为 **0**。

### 10.2 与 `000012` 的关系

`000012` 的 92 码删除集合 vs 上述 4 码：**交集 0**。
**结论：补应用不会复活任何已删码**；两者码空间完全不相交（`000012` 删的是 ehs/finance/crm/pm/lims/pdm/report 域，`000001` 补的是 bi/mes/wms 的 `:write`/`:read`）。

### 10.3 prod 现状核对

| 维度 | 结果 |
|---|---|
| 码是否存在 | 4 条中 1 条存在（`wms:stocktake:read`），3 条缺失 |
| 是否已授权 | 4 条**全部 0 授权**（`admin` 也没授） |
| 前端引用 | `wms:stocktake:read`：路由 `requiredPermissions` 2 处 + `permissions.ts` 注册；`wms:stocktake:write`：`StockTakePage.tsx` 写按钮；`mes:work_order:write`：仅测试夹具（无生产 UI）；`bi:data_source:write`：**0 处**（页面走 `permissionResource: 'bi:data_source'` 派生 create/update/delete） |
| 后端强制点 | `mes:work_order:write` 8 个工单写接口、`wms:stocktake:read/write` 4+1 个接口、`bi:data_source:write` 分析插件 1 处 |
| 结论 | 码缺失时这些接口对非超管**403**；补码后仍**无人被授权** → 功能面仍不可用，需另拍授权 |

### 10.4 补应用后的确切结果（预期值 vs 不符怎么判）

前置：账本 **592**、权限码 **1109**、授权 **854**、`admin` **214**（批次 3 后实测）。

| 项 | 预期 | 不符时怎么判 |
|---|---|---|
| 账本 | 592 → **593**（+1） | +0 → 迁移未记账，停止；+2 → 扫到清单外版本，停止 |
| 权限码 | 1109 → **1112**（+3） | 1113 → `wms:stocktake:read` 被意外删除，停止；1111 → 只插 2 条，停止 |
| 角色授权 | **854 不变** | 有任何增减 → 迁移行为超出声明，停止 |
| `admin` 授权 | **214 不变** | 变化 → 同上，停止 |
| 结构/字典/通知/审计 | 不变 | 任何变化 → 停止 |

### 10.5 与 `000002` 的关系

- `000002`（`tenant_modules_tier_column.sql`）是 `core_tenant_modules.tier` 的 DDL，属于 **tenant/tier 域**，与 `000001`（权限数据）**无交集、无冲突**。
- 它被 `000014`（public-only 修正版）**取代**：原写法同时 `ALTER public` 与 `iam`，一旦 `iam.core_tenant_modules` 不存在即整事务回滚。
  现场实测：prod 两张表都存在，`public.tier` 已存在但 **nullable、无 default**；`iam.tier` 不存在。
  `000014` 的 `ADD COLUMN IF NOT EXISTS` 对已存在的 public 列是 no-op → 这正是批次 1「`tier` 的 `NOT NULL` 未达成，需补迁移」的来源。
- **结论：`000002` 应永久不应用**（由 `000014` 取代；应用它只会给 iam 加一列，仍修不好 public 的 NOT NULL）。它与 `000001` 不冲突。

### 10.6 前置与窗口

- **锚点**：必须低于 `000001`，用 **`20261107000000`**（`version > anchor` 恰好只扫到 000001 起的版本，避开 `20261106000001`）。
- **defer**：`20261107000002`、`20261107000015`；其余 pending 已全部记账，脚本自动跳过。
- **备份**：建议 `pg_dump -t public.core_permissions`（986→1112，表小），非强制（仅 INSERT、可 rollback）。
- **零交集校验**：已做，`000012` 删除集合交集 **0**；前端引用**有**（wms 路由/按钮），这是「补回在用码」，不是「删除在用码」，红线不适用。
- **预计时长**：投递+执行 < 10 s，核对+冒烟约 2–3 min。

---

### 10.7 邮件模板链路：到底要做什么

#### A. 是否在用（证据）

| 证据 | 结果 |
|---|---|
| 模板 CRUD/发送函数 | `svc/communication/src/mail.rs`：`list_templates`(820) / `create_template`(925) / `get_template`(1033) / `update_template`(1139) / `delete_template`(1251) / `send_with_template`(1339) / `send_with_template_by_code`(2085) |
| 裸名 SQL | 7 处 `core_email_templates`：870/992/1098/1200/1309/1401/2161；`only_own_schema_query!` **不改写 SQL**，按模块 search_path（`communication, public`）解析 → 命中 `communication.core_email_templates` |
| 路由（独立服务 8084） | `svc/communication/src/main.rs` 246–259：templates CRUD + `/{id}/send` + `emails/send-with-template` |
| 路由（prod 实跑 8099） | `svc/server/src/modules/communication_real_module.rs` 512–526：**无** `emails/send-with-template`；模板相关只有 `/templates*`，另有 stub `/templates/render`、`/templates/{id}/status` |
| 前端 | `apps/web/src/modules/im/config.ts` 挂 `/im/mail`（要求 `im:mail:read`）；`apps/web/src/api/mail/index.ts` 调 send-with-template；`SendEmailDialog` 用 `t.code` |
| prod 实测（超管 token） | `GET /api/communication/mail/templates` **200 空数组**；`/mail/emails` **200 空**；`/mail/emails/stats` **200 全 0** |
| 数据 | `communication.core_email_templates` **0 行**；`public.core_email_templates` **不存在**；`public.core_emails` **0 行**；`communication.core_notification_deliveries` **0 行**；`public.core_notification_templates` **0 行**；`communication.notification_channels` **0 行** |
| SMTP | prod `.env` 有键：`SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM_ADDRESS`（只核键名，未读值） |
| 通知邮件 | 仅在 `notification.rs:241` 且请求 `send_email=true` 时触发；FE **无任何** `send_email: true` 调用点 → 从未触发 |
| 密码重置邮件 | `unified-core/.../auth.rs:63` 投递到 `/api/communication/mail/send`，但**该路由不存在**（后端只有 `/mail/emails`）→ 静默 404 |
| 使用痕迹 | 审计 `action/entity_type` 含 mail/email **0 行**；nginx access 日志 `/mail/` **0 命中**；`logs/topems.log` 为空文件 |

**判定**：模板子链路**从未被使用**，且在 prod 上是**断的**（FE 期望 `code`，DB/API 均无 `code`；FE 调 `send-with-template`，8099 无该路由；密码重置路由不存在）。通知与密码重置**不依赖模板表**。

#### B. 路径 A（下线模板子链路，保留直发邮件）

要删/改：

1. 后端：`mail.rs` 7 个模板函数（820/925/1033/1139/1251/1339/2085）及 7 处裸名 SQL；
2. 路由：`svc/communication/src/main.rs` 246–259 模板路由；`svc/server/src/modules/communication_real_module.rs` 519–526 模板路由 + 184–185 stub；
3. 前端：`api/mail/index.ts` 模板方法（约 L128–165）、`SendEmailDialog` 模板下拉、`EmailTemplate` 类型；保留直发 `emails` 与 `/im/mail` 菜单；
4. 迁移：`DROP TABLE IF EXISTS communication.core_email_templates`（先确认 0 行；带 `to_regclass` 守卫）；
5. 权限：`im:mail:read` 保留（直发页面仍用）。

影响：**不破坏通知**（通知邮件走独立 `queue_email`，且从未触发）；**不破坏直发邮件**（`/emails` 保留，SMTP 键齐全）。
代价：需一次应用重启（先发代码删路由，再跑 DROP；否则窗口内调用模板路由会 500）。工作量：后端 2 文件、前端 3 文件、迁移 1 条，风险低。

#### C. 路径 B（补建权威表 `public.core_email_templates`）

参考来源：`communication.core_email_templates` 现有 10 列（全部 `NOT NULL` 除外）：

```sql
CREATE TABLE IF NOT EXISTS public.core_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  subject_template varchar NOT NULL,
  body_template text NOT NULL,
  description text,
  tenant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  name_en varchar
);
```

但只建表 **等于白做**，原因：

1. 服务 search_path 是 `communication, public`，裸名优先命中 `communication` 副本 → 新表被**遮蔽**；必须同时把 `mail.rs` 7 处改成 `public.` 限定，并决定是否删/保留副本；
2. 数据迁移：副本 **0 行**，`INSERT ... SELECT` 搬过去是 0 行 → 建完仍是空表；
3. FE/API 仍缺 `code` 字段、`send-with-template` 路由仍不存在、密码重置仍打错路径 → **零行为变化**；
4. 迁移顺序：建 public 表 → 改 7 处限定 → 部署 →（可选）删 communication 副本；顺序错会出现双表并存/写错表。

工作量：后端 1 文件 7 处 + 迁移 1–2 条 + 一次部署；风险中（改限定名可能影响其它裸名查询）。

#### D. 推荐

**选路径 A（下线模板子链路）**。理由：模板链路 0 数据、0 使用痕迹、prod 上本身就是断的；通知与密码重置不依赖它；A 的改动面比 B 小，且能顺带删掉 7 处裸名 SQL 这一类运行时隐患。

若选 B：会保留一张永远 0 行、且被 search_path 遮蔽的 public 表，7 处裸名、FE 的 `code` 契约、`send-with-template` 路由、密码重置错误路径**全部仍在**——等于只做了一次「结构对齐」，功能面仍是断的。

---

## 11. 邮件模板链路下线（路径 A）与密码重置最小闭环（2026-11-06 本地执行）

本轮按「先代码、后迁移」推进：**代码已改完并在本地验证；迁移文件已新增、仅本地应用；未部署 prod、未应用 prod 迁移**。
范围收口：不新建模板体系、不恢复 `send-with-template`、不重建邮件子系统。

### 11.1 删除的代码位置（文件#行，行号为改动前）

| 文件 | 删除内容 | 行号/规模 |
|---|---|---|
| `svc/communication/src/mail.rs` | 7 个模板 handler：`list_templates` / `create_template` / `get_template` / `update_template` / `delete_template` / `send_with_template` / `send_with_template_by_code` | 原 820 / 925 / 1033 / 1139 / 1251 / 1339 / 2085；整文件 **-971 行** |
| 同上 | 7 处裸名 SQL `core_email_templates` | 原 870 / 992 / 1098 / 1200 / 1309 / 1401 / 2161 |
| `svc/communication/src/models.rs` | `EmailTemplate`、`CreateEmailTemplateRequest`、`SendWithTemplateRequest`、`UpdateEmailTemplateRequest` 及 7 个测试 | **-112 行** |
| `svc/communication/src/main.rs` | 模板路由 6 条（`/templates` GET/POST、`/templates/{id}` GET/PUT/DELETE、`/templates/{id}/send`）+ `emails/send-with-template` | 原 246–259；现仅 emails 路由（现 L242–251） |
| `svc/server/src/modules/communication_real_module.rs` | 同 6 条模板路由 + `MAIL_STUB_POST`（`/templates/render`）+ `MAIL_STUB_PUT`（`/templates/{id}/status`）及其循环 | **-16 行**（`MAIL_STUB_GET` 仅剩 `/health`） |
| `svc/communication/src/openapi.rs` | `list_templates` / `create_template` / `send_with_template_by_code` 三处 `paths(...)` | **-3 行** |
| `svc/communication/src/schema_defense.rs` | 表定义注释更新为「已下线，不再创建」；否定断言保留 | L117 `assert!(!names.contains("core_email_templates"))` |
| 前端 `apps/web/src/api/mail/index.ts` | `templateApi`、`emailApi.sendWithTemplate`、`EmailTemplate`、`SendEmailWithTemplateRequest`、`TEMPLATE_CATEGORIES`、`Email.template_id`、`SendEmailRequest.template_id/template_data`、`PaginationParams.category` | **-86 行** |
| 前端 `apps/web/src/api/notification/mail.ts` | 模板类型与 5 个模板方法（该文件本身为死代码） | **-57 行** |
| 前端 `apps/web/src/components/im/MailPageHooks.tsx` | 模板 query/mutation、`activeTab`、模板表单/预览/删除状态与 handler | **-370 行** |
| 前端 `apps/web/src/pages/im/MailPage/index.tsx` | 模板页签、5 个模板组件渲染、模板新增按钮 | **-166 行** |
| 前端 5 个文件 | `TemplateList.tsx`(-480)、`TemplateList.module.css`(-5)、`CreateTemplateDialog.tsx`(-281)、`EditTemplateDialog.tsx`(-238)、`TemplatePreviewDialog.tsx`(-102) | 已删除 |
| 前端 5 个文件 | `SendEmailDialog.tsx`(-97)、`ConfirmDialogs.tsx`(-20)、`types.ts`(-41)、`constants.ts`(-23)、`MailPage.test.tsx`（改为断言「标题/发送按钮」） | 已修改 |
| `scripts/ci/schema-prefix-baseline.json` | 移除陈旧的 `mail.rs / core_email_templates` 裸名基线条目 | -4 行 |

合计：**25 个文件，+210 / -3071 行**（不含新增迁移与本文档）。

### 11.2 保留路径清单（未受影响的直发/通知/IM）

- 直发：`GET/POST /api/communication/mail/emails`、`GET /mail/emails/stats`、`GET/DELETE /mail/emails/{id}`、`POST /mail/emails/{id}/read`、`POST /mail/emails/resend`。
- IM：`/api/communication/im/*` 全量保留。
- 通知：`POST /api/communication/notify/send`、`/notification/*`；`queue_email` 保留。
- 前端：`/im/mail` 菜单与 `im:mail:read` 权限保留；MailPage 仅保留邮件列表/直发/删除/重发/统计。

### 11.3 全仓零引用检索（原始结论）

```text
# 运行时源码
$ grep -rn "core_email_templates" apps/web/src svc/communication svc/server svc/unified-core
svc/communication/src/schema_defense.rs:7://!   core_email_templates 已随邮件模板功能下线，不再创建）
svc/communication/src/schema_defense.rs:117:        assert!(!names.contains(&"core_email_templates"));

# mail.rs 裸名 SQL
$ grep -n "email_templates" svc/communication/src/mail.rs
（无输出）

# 模板调用（源码）
$ grep -rn "send-with-template\|send_with_template" svc apps/web/src
（无输出）

# 两套路由
$ grep -n "templates" svc/communication/src/main.rs svc/server/src/modules/communication_real_module.rs
（仅 notification-templates，无 mail templates）
```

`communication.core_email_templates` 仅剩三类非运行时命中，均为预期：

1. `database/migrations/20260921000107_backend_i18n_batch8_bilingual_columns.sql`——历史迁移，按「迁移不可改写」原则保留；
2. `database/migrations/20261107000019_drop_communication_email_templates.sql`——本轮删除迁移；
3. `fixtures/full_schema_contract.sql`——CI 导库用的全 schema 快照基线（非运行时引用；导入后由 000019 删除）。

补充：`database/init/06_iam_schema.sql` 中的 `iam.core_email_templates` 是**另一个 schema 的历史 init 表**，不在 `communication.` 范围，本轮未动。`apps/web/storybook-static/` 的 `send-with-template` 命中为**未跟踪的本地构建产物**（`.gitignore` 已忽略），不在仓库内。

### 11.4 编译 / 测试 / lint / 前端

| 检查 | 结果 |
|---|---|
| `cargo fmt --all --check` | 通过 |
| `cargo check --workspace --all-targets` | 通过（22.99s） |
| `cargo clippy --workspace --all-targets -- -D warnings` | 通过（13.17s） |
| `cargo test -p topems-communication` | 1 passed / 0 failed（doc-tests 0） |
| `cargo test -p topems-server --lib` | 1 passed / 0 failed |
| `cargo test -p topems-unified-core --lib` | **542 passed / 0 failed**（0.52s） |
| `pnpm typecheck` | 通过 |
| `pnpm exec eslint <10 个改动文件>` | 通过（无输出） |
| `pnpm build` | 成功（brotli 压缩 331 文件） |
| `pnpm exec vitest run src/pages/im/__tests__/MailPage.test.tsx` | 2 passed |

### 11.5 本地冒烟（communication:8084 / unified-core:8000，superadmin JWT）

| 请求 | HTTP | 响应关键字段 |
|---|---|---|
| `GET /api/communication/mail/emails` | **200** | `{"success":true,"data":[],"message":"list_emails success"}` |
| `GET /api/communication/mail/templates` | **404** | 空 body |
| `GET /api/communication/mail/templates/tid` | **404** | 空 body |
| `POST /api/communication/mail/emails/send-with-template` | **405** | 空 body |
| `POST /api/communication/mail/emails`（直发，`{to,subject,body}`） | **200** | `{"code":0,"data":{"email_id":"6638a253-…","subject":"smoke-direct","to":"smoke@example.invalid"},"message":"邮件发送成功","success":true}` |
| `POST /api/communication/notify/send` | **200** | 返回 `data.id`，落库 1 行 |
| `POST /api/core/iam/auth/forgot-password`（已存在邮箱） | **200** | `{"code":0,"message":"如果该邮箱已注册，重置申请已提交给系统管理员","success":true}`；落库 2 条管理员通知 |
| 同上（不存在邮箱） | **200** | 同一文案、同一 code，**0 落库** |
| 同上（`email=""`） | **200** | body `{"code":400,"message":"邮箱不能为空"}` |

**关于 405 而非 404（如实记录）**：模板路由删除后，`POST /mail/emails/send-with-template` 的路径仍被 `/mail/emails/{id}` 段匹配，但该路径未注册 POST → axum 返回 **405**；`/mail/templates*` 无任何匹配 → **404**。二者均说明模板 handler 已不存在；未额外添加 tombstone 路由（超出「删除」的最小改动）。
冒烟数据已清理：`core_notifications` 7→4（删除 3 条：1 条 smoke + 2 条密码重置通知）、`core_emails` 1→0、`password_resets` 1→0。

### 11.6 迁移与守卫

文件：`database/migrations/20261107000019_drop_communication_email_templates.sql`（前向迁移，单条 `DO $$ … $$`）。

守卫逻辑（任一不满足即失败回滚，不静默跳过）：

1. `to_regclass('communication.core_email_templates') IS NULL` → `RAISE NOTICE` 并成功返回（幂等）；
2. `relkind <> 'r'`（视图/外表等）→ `RAISE EXCEPTION`；
3. 行数 `<> 0` → `RAISE EXCEPTION`（要求副本 0 行）；
4. 存在指向该表的入向外键（`pg_constraint.contype='f' AND confrelid=…`）→ `RAISE EXCEPTION`；
5. 通过后 `DROP TABLE communication.core_email_templates RESTRICT`。

本地执行证据：
- 0 行场景：`apply-forward.sh --db topems --anchor 20261107000018 --only 20261107000019` 成功；`_sqlx_migrations` 账本 `max=20261107000019`（description=`drop communication email templates`），`to_regclass` 返回 `NULL`。
- 1 行负例：先插 1 行再执行 → 守卫 `RAISE EXCEPTION`，psql 退出码 3，表仍在（fail-closed 生效）。
- `schema_defense`：已无该表建表语句，否定断言 `assert!(!names.contains("core_email_templates"))` 保留（L117）。

### 11.7 上线顺序与检查点（必须遵守）

迁移**只能在新代码上线后应用**，否则旧二进制仍会访问已删表。

1. **发布新二进制**：`topems-communication`（8084）与 `topems-server`（8099，含 `communication_real_module`）全部换成不含模板路由/裸名 SQL 的版本。
2. **检查点 A**：新版本健康；`GET /api/communication/mail/templates` 为 404；服务日志中不再出现 `core_email_templates` 查询或模板 handler 调用。
3. **观察窗口**：建议 ≥1 个发布周期（至少 24h），确认无 `relation "core_email_templates" does not exist` 报错、无模板接口调用。
4. **备份**：副本 0 行，`pg_dump --schema-only -t communication.core_email_templates` 可选；不做数据备份。
5. **应用迁移**：`apply-forward.sh --only 20261107000019`。
6. **检查点 B**：账本 +1（到 `20261107000019`）；`to_regclass('communication.core_email_templates')` 为 `NULL`；应用日志无新增错误；直发 `/mail/emails` 与通知创建仍正常。
7. **回滚**：按迁移文件顶部 `down` 重建空表 DDL；但**功能不会自动恢复**（见 11.10）。

反向顺序的后果：先删表、后发新码 → 旧二进制调用模板接口报 `relation "core_email_templates" does not exist`（500），直发/通知不受影响。

### 11.8 密码重置现状与「顺手修」

**断点（改动前）**：

- 前端：[ForgotPasswordPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/shared/ForgotPasswordPage.tsx) L80 → `authApi.requestPasswordReset` → [auth.ts](file:///Users/air/TOPEMS/apps/web/src/api/iam/auth.ts) L70-71 `POST /api/core/iam/auth/forgot-password`。
- 后端：[auth.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs) `forgot_password`（现 L1264）查 `iam.users`、写 `unified_core.password_resets`，随后调用 `send_email_async`（原 L63–102）投递到 `POST {COMMUNICATION_SERVICE_URL}/api/communication/mail/send`。
- **真实路由不存在**：communication 只有 `/api/communication/mail/emails`，且受 `communication:admin` 鉴权；该内部调用既无 Authorization，也打错路径 → **静默 404**，用户仍看到「邮件已发送」。
- prod 影响：用户点「忘记密码」→ HTTP 200 + 「邮件已发送」，但实际**没有任何邮件或其它投递**，属于**静默失败**（不是 404 暴露给用户）。
- 替代通道：`public.core_notifications` 可用（prod 6 行、admin 收件人 1 个），站内通知页面已存在；也可由管理员手工重置。
- SMTP 判定：prod `.env` 键名齐全（`SMTP_HOST/PORT/USERNAME/PASSWORD/FROM_ADDRESS`），但从 prod 主机 TCP 连接 `SMTP_HOST:SMTP_PORT` **超时** → 直发链路不可用，因此**不选改投 `/mail/emails`**。

**修复（方案 B：通知中心，最小闭环）**：

| 位置 | 改动 |
|---|---|
| `auth.rs` L64 | 新增统一应答常量 `PASSWORD_RESET_ACK`（存在/不存在账号同一文案，防枚举） |
| `auth.rs` 原 L63–102 | 删除 `send_email_async`（不再依赖 SMTP/内部 HTTP） |
| `auth.rs` L1281–1310 | 管理员预检：`SELECT COUNT(*) FROM iam.users WHERE status='active' AND deleted_at IS NULL AND (is_superuser OR 'admin' = ANY(roles))`；查询失败→`error_value(500)`；0 人→`error_value(503,"系统未配置密码重置受理人，请联系系统管理员")` |
| `auth.rs` L1374 | 向所有 active admin 批量插入 `public.core_notifications`（`notification_type='system'`，`data` 含 `source=password_reset`、`requested_email`、`requested_user_id`；正文含 1 小时有效的重置令牌与处置说明） |
| `auth.rs` L1332 / L1406 | 用户不存在与成功均返回 HTTP 200 + `{code:0,"message":PASSWORD_RESET_ACK}` |
| i18n `zh/en pages.json` | 4 组文案：k5/k6/k19/k22/k25 改为「申请已提交 / 已通知管理员处理」，不再承诺「重置邮件已发送」 |

选择理由：prod 直发依赖的 SMTP 出站不可达；内部 HTTP 投递需先解决鉴权与路径；通知中心已有表、页面与收件人，**零新增依赖**，改动仅限 `forgot_password` 一个函数。

**改动前后对比（本地实测）**：

| 场景 | 改前 | 改后 |
|---|---|---|
| 已注册邮箱 | 200「邮件已发送」；内部 404 静默，无投递 | 200 `code:0` ACK；写入 2 条管理员通知 |
| 未注册邮箱 | 同样 200「邮件已发送」 | 200 同一 ACK；0 落库（不可枚举） |
| `email` 为空 | — | 200 外壳 + `code:400`「邮箱不能为空」 |
| 无管理员 | 无提示 | 200 外壳 + `code:503`「系统未配置密码重置受理人」 |
| 通知写入失败 | — | 200 外壳 + `code:500`「内部服务器错误」 |

### 11.9 SMTP 实际不可用时的产品行为（把选择权交回用户）

若 prod SMTP 始终无法投递，密码重置的最终形态是：

1. 用户提交邮箱 → 立即看到「如果该邮箱已注册，重置申请已提交给系统管理员」；
2. 管理员在通知中心收到一条「密码重置申请」，按正文中的一次性令牌（1 小时有效）人工处置；
3. 用户**不会**收到自助重置邮件，需要联系管理员完成重置。

这是**「人工受理」而非「自助重置」**的产品行为。对当前 0 邮件出站、用户量小的 prod 可以接受；若要求用户自助完成，需要单独立项恢复 SMTP 出站或提供站内自助重置页（本轮不做）。

### 11.10 影响面与恢复成本

- **恢复邮件模板功能不是回滚迁移就能完成**，需要：① 重建表（`communication.core_email_templates` 或改 `public.` 权威表并同步改限定名）+ ② 新 API 契约（补 `code` 字段与 `send-with-template` 路由，接入鉴权）+ ③ 前端模板页签/下拉/CRUD 改造 + ④ 全链路测试。
- 既有契约不一致（**本轮未修，留待后续**）：前端直发发送 `to_addresses/cc_addresses/bcc_addresses`，后端 `SendEmailRequest` 为 `to/cc/bcc`；本轮仅验证后端契约下直发可用，前端直发页的字段映射仍是既有问题（同样影响 `im` 页的重发逻辑）。
- 通知中心链路与 `/im/mail` 菜单不受影响；`im:mail:read` 权限保留。

### 11.11 「顺手修」边界

**改了**：

- `svc/unified-core/src/modules/iam/auth.rs`：`forgot_password` 投递方式（邮件 → 站内通知管理员）、统一应答、管理员预检；
- `apps/web/src/i18n/locales/{zh,en}/pages.json`：4 组密码重置文案。

**没改**：

- 未新建模板体系、未恢复 `send-with-template`、未改 `/mail/emails` 路由；
- 未改直发契约（`to` vs `to_addresses` 不一致仍存在，见 11.10）；
- 未改 SMTP 配置或 prod 出站网络；
- 未改 `unified_core.password_resets` 表结构与令牌消费逻辑（自助重置确认页仍在，但邮件不再投递链接）；
- 未改通知中心前端（管理员处置走现有通知页面）；
- **未部署 prod、未应用 prod 迁移**。

### 11.12 本轮证据汇总

- 删除位置与保留清单：11.1 / 11.2
- 零引用检索：11.3
- 编译/测试/lint/前端：11.4
- 本地冒烟状态码：11.5（200 / 404 / 405 / 200 / 200）
- 迁移守卫定义与本地执行：11.6
- 上线顺序与检查点：11.7
- 密码重置断点、改动前后对比、错误路径：11.8
- SMTP 不可用时的产品行为：11.9
- 影响面与未修项：11.10 / 11.11

