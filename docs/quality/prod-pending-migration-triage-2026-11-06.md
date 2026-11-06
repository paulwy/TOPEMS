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
