# RLS 5 项决策执行：证据核实与 #3/#4 演练（2026-11-18）

> 本轮范围：①核实 #1 跨租户列举、#4 holidays 口径矛盾；②出 #3、#4 迁移草案与回滚脚本，并在本地隔离库演练；③补 #2、#5 证据清单（不动手）。
> 约束遵守：未连生产库、未改历史迁移、未写 `migration_manifest.yaml`、未动工作树中他人改动；新迁移使用今日版本号。
> 演练库：`topems_rls_scratch_20261118_r5`（由 `topems_snap_20261118` 克隆，行数与用户提供的生产快照基线一致）。
> 关联：[五项方案](./rls-five-decision-options-2026-11-18.md)、[盘点](./loose-rls-prod-inventory-2026-11-18.md)。

---

## 0. 结论摘要

| # | 本轮动作 | 结论 |
|---|---|---|
| 1 | 跨租户列举核实 | **租户侧无跨租户列举**；唯一租户下拉仅超管渲染。但**平台侧目录读/写路径全部依赖 `tenant_id IS NULL` fail-open**，落 D 前必须改显式系统通道（约 10 个 handler + 1 个指标口径） |
| 2 | 证据清单 | 已补，未动手（需产品确认「平台菜单全租户可见」+ flow 空副本依赖） |
| 3 | 迁移 + 演练 | 直接使用已出 `20261118110000`（未改）；六档 0/0/48/48/48/48，写断言通过，回滚可恢复基线 |
| 4 | 证据 + 迁移 + 演练 | 矛盾已消解：**表无 `tenant_id` 列、全仓无写路径**；草案补可空 `tenant_id` + 平台读策略；六档 0/0/1/2/1/2，回滚可用 |
| 5 | 证据清单 | 已补，未动手（RENAME→观察→DROP 的前置证据） |

---

## 1. #1 `public.core_tenants`：跨租户列举核实

### 1.1 检索范围

- 全仓 `*.rs` / `*.sql` / `*.ts(x)` 检索 `core_tenants`（17 个 Rust 文件、40 个 SQL/脚本文件）。
- 逐个确认运行时 SQL（排除 `REFERENCES core_tenants(id)` 外键声明与测试代码）。
- 前端确认租户下拉/切换器与 API 调用点。

### 1.2 结论一：租户侧没有跨租户列举

| 检查项 | 事实 | 判定 |
|---|---|---|
| 前端唯一「租户下拉」 | [TenantSwitcher.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/components/TenantSwitcher/TenantSwitcher.tsx) 首行 `!is_superuser → return null`，仅超管渲染，调用 `/tenant/list` | 非租户侧 |
| 目录类路由权限 | `/tenant/list`、`/tenant/{id}`、`/tenant/by-code/{code}`、`/tenant/slug/{slug}`、`/tenant/my`、`/tenant/context` 全部挂在 `require_permission("iam:tenant:read")` 层（[master.rs:26-35](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/master.rs#L26-L35)、[:160-168](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/routes/master.rs#L160-L168)） | `iam:tenant:read` 仅平台 admin 角色持有 |
| `get_my_tenants` | SQL 自带 `($2::uuid IS NULL OR t.tenant_id = $2)`；非超管 `$2 = 当前租户`（[handlers.rs:1696](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L1696)、[:1729](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L1729)） | 只列当前租户，非跨租户 |
| 前端 `getMyTenants` | 仅定义，无页面消费（全仓 grep 无调用方） | 无租户侧入口 |
| 其他服务 | finance 的 `core_tenants` 命中均为 `REFERENCES core_tenants(id)`（[risk_v54.rs:417](file:///Users/xingzhai/TOPEMS/svc/finance/src/modules/risk_v54.rs#L417) 等）或 `#[cfg(test)]`/`#[ignore]` 测试（[event_handlers/mod.rs:1402](file:///Users/xingzhai/TOPEMS/svc/finance/src/event_handlers/mod.rs#L1402)） | 无运行时读取 |

**结论：租户侧代码不存在跨租户列举 `core_tenants` 的路径，无需为租户侧单独改系统通道。**

### 1.3 结论二：平台侧路径依赖 fail-open，D 之前必须改系统通道

共享中间件对「非 service token」的超管请求给的是 **nil 租户 + `system=off`**：

- [shared-auth/middleware/tenant.rs:56-71](file:///Users/xingzhai/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L56-L71)：只有 service claims 才 `system=true`；
- [:641-668](file:///Users/xingzhai/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L641-L668)：事务级设置 `app.tenant_id=nil, app.rls_system=off`。

当前平台目录能读全量，靠的是 `rls_global_read` 里的 `tenant_id IS NULL` 分支；D 策略改成 `tenant_id = GUC` 后，这些路径会**全部返回 0 行**（含列表为空、按 code/slug 找不到租户、统计为 0）。

| 路径 | Handler | 当前依赖 | 落 D 后 | 改法 |
|---|---|---|---|---|
| `GET /tenant/list`（含 count） | `list_tenants` [:19](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L19) | `tenant_id IS NULL` | 0 行 | 系统通道 |
| `GET /tenant/{id}` | `get_tenant` [:172](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L172) | 同上 | 0 行 | 系统通道 |
| `GET /tenant/by-code/{code}` | [:206](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L206) | 同上 | 0 行 | 系统通道 |
| `GET /tenant/slug/{slug}` | [:1866](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L1866) | 同上 | 0 行 | 系统通道 |
| `GET /tenant/my` | [:1696](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L1696) | 超管 `$2=NULL` 时全量 | 0 行 | 系统通道（超管分支） |
| `GET /tenant/{id}/analytics/user-stats` | [:3732](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L3732) | 跨租户聚合 | 0 行 | 系统通道 |
| `POST/PUT/DELETE /tenant*`（创建/更新/启停/模块开关/特性开关） | [:263](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L263) 起 | `rls_system_only` | 拒绝/0 行 | 系统通道 |

说明：`GET /tenant/context`（[:1625](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L1625)）只读 `core_tenant_users`，不读 `core_tenants`，不受影响。

### 1.4 附带发现：写路径注释与中间件实际行为不一致

[handlers.rs:263-265](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/tenant/handlers.rs#L263-L265) 注释称「仅超管请求上下文会打开 `app.rls_system='on'`」，但共享中间件实际只对 service token 打开系统通道（见 1.3）。这意味着 `POST /tenant` 在超管 JWT 下也可能被 `rls_system_only` 拒绝。**这不是本轮新引入的问题**，但 D 上线前必须一起核实，不能沿用该注释做判断。

### 1.5 监控口径影响

`global_row_metrics` 已走系统通道（[global_row_metrics.rs:72](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/global_row_metrics.rs#L72)），不受 RLS 影响；但它的查询是 `count(*) ... WHERE tenant_id IS NULL`（[:26](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/iam/global_row_metrics.rs#L26)）。D 回填 `tenant_id = 自身 id` 后该指标恒为 0，需同步改为「按 id 自指」口径或下线该面板。

### 1.6 落 D 的前置清单（代码改造，不在本轮）

1. 上述 10 余个 handler 中仅平台可用的路径，改为 `scope_read_system()` / `scope_system()`（显式系统通道）；
2. 核实并修正 `create_tenant` 等写路径的通道假设（1.4）；
3. 调整 `global_row_metrics` 的 core_tenants 口径；
4. 数据迁移：`UPDATE core_tenants SET tenant_id = id WHERE tenant_id IS NULL`；
5. 策略：`rls_system='on' OR tenant_id = GUC`，删除 `rls_global_read`；
6. 六档断言：T0/T1 → 0；T2/T3（自身）→ 1；T4 → 0；T5 → 1。

---

## 2. #4 `erp.holidays`：口径矛盾核实

### 2.1 矛盾消解

盘点 §4.2 同时出现「非租户 allow_all」与「代码 `tenant_id: Option`」。核实结果：

| 事实 | 证据 |
|---|---|
| **生产/本地实际只有 3 列：`id` / `deleted_at` / `date`** | `\d+ erp.holidays`；`date` 由 [20261115141200](file:///Users/xingzhai/TOPEMS/database/migrations/20261115141200_b_class_erp_holidays_date.sql) 补齐 |
| **没有 `tenant_id` / `year` / `kind` / `name`** | 同上；`20260725000000_business_base_tables.sql:3083` 建表即只有 `id` |
| 现有策略只有 `erp_allow_all_holidays`（ALL，true/true），0 行 | `pg_policies` 只读查询 |
| **全仓没有任何 `INSERT/UPDATE/DELETE erp.holidays`** | grep 无命中（含 svc/scripts/database） |
| 唯一读路径是裸池读取，两个分支都引用 `tenant_id/year/kind` | [holidays.rs:84-148](file:///Users/xingzhai/TOPEMS/svc/erp/src/modules/holidays.rs#L84-L148) |
| 代码注释声明的是 `tenant_id UUID NOT NULL` + PK `(tenant_id, year, date, kind)` | [holidays.rs:90-98](file:///Users/xingzhai/TOPEMS/svc/erp/src/modules/holidays.rs#L90-L98)（注释契约，无迁移落地） |

**结论：`tenant_id: Option` 是「调用方传入的查询参数」，不是库里的租户数据；表里根本没有 `tenant_id`，也不存在按租户写的自定义节假日。当前 L1 查询稳定报 42703，全部回退 L2 静态日历。**

### 2.2 对拍板的影响

拍板策略 `tenant_id IS NULL OR tenant_id = 当前租户` 需要 `tenant_id` 列存在。因此 #4 的迁移必须先补一列（可空），策略才能落地；`year/kind/name` 仍缺，属既有 B 类残余，代码仍会走 L2，本迁移不改变该行为，也不建唯一键（`tenant_id` 可空与注释里的 PK 形态冲突，留待补列批次设计）。

---

## 3. #3 `finance.core_finance_report_line_map`：迁移与演练

### 3.1 迁移与回滚

- 决策：按已出 [20261118110000_platform_corpus_rls_strict.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118110000_platform_corpus_rls_strict.sql) 执行，**未新增、未改写**。
- 回滚：[20261118110000_platform_corpus_rls_strict.rollback.sql](file:///Users/xingzhai/TOPEMS/database/rollback/20261118110000_platform_corpus_rls_strict.rollback.sql)。
- 本表相关语句：48 行 `tenant_id` NULL→全零；删除 `rls_global_read`；新增 `rls_platform_read`；保留 `rls_tenant_isolation`。

### 3.2 演练环境与方法

- 库：`topems_rls_scratch_20261118_r5`（克隆自 `topems_snap_20261118`，非生产）。
- 身份：DDL 由本地超级用户执行；读/写断言统一 `SET ROLE topems_prod`（表属主 + FORCE RLS），避免超级用户绕过 RLS。
- 前置基线：currencies 8 / line_map 48 / roles 16 / project_type_configs 1 / sync_policies 1，与迁移内断言一致。
- 六档：T0 未设置、T1 空串、T2 全零、T3 租户A、T4 租户B、T5 系统通道。

### 3.3 六档结果（迁移后）

| 档位 | T0 | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|---|
| line_map 可见行数 | 0 | 0 | 48 | 48 | 48 | 48 |

符合平台语料预期：未设/空串 fail-closed；任一非空租户上下文可见平台行。

### 3.4 写断言

| 断言 | 结果 |
|---|---|
| T3 插入平台行（`tenant_id NULL`） | 被 RLS 拒绝 |
| T3 更新平台行（`tenant_id = 全零`） | 0 行 |
| T5 系统通道插入/删除平台行 | 成功，清理后仍 48 行 |

### 3.5 回滚演练

执行 rollback 后：`rls_global_read` 恢复、`rls_platform_read` 消失、48 行回到 NULL；六档恢复 fail-open 基线（T0–T4 均为 48）。回滚可用。

---

## 4. #4 `erp.holidays`：迁移草案与演练

### 4.1 文件

- 迁移草案：[20261118130000_erp_holidays_platform_corpus.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118130000_erp_holidays_platform_corpus.sql)
- 回滚：[20261118130000_erp_holidays_platform_corpus.rollback.sql](file:///Users/xingzhai/TOPEMS/database/rollback/20261118130000_erp_holidays_platform_corpus.rollback.sql)

### 4.2 迁移内容

1. 前置断言：表存在、**0 行**、`tenant_id` 不存在或可空（NOT NULL 则拒绝执行）；
2. `ADD COLUMN IF NOT EXISTS tenant_id uuid`（可空）；平台行 = NULL，租户行 = 租户 id；不加 NOT NULL、不建唯一键、不回填；
3. 删除全部既有策略，重建：
   - `rls_tenant_isolation`（ALL）：`system OR tenant_id = GUC`；
   - `rls_platform_read`（SELECT）：`system OR (tenant_id IS NULL AND GUC 非空) OR tenant_id = GUC`；
4. 保持 ENABLE/FORCE RLS；后置断言校验列可空、策略数量/谓词、RLS 开关。

**落地方差（请确认）**：拍板谓词是 `tenant_id IS NULL OR tenant_id = 当前租户`；草案对平台行分支加了「GUC 非空」判定，与 `20261118110000` 的 `rls_platform_read` 一致，避免把刚清掉的 `tenant_id IS NULL` fail-open 重新引入。若坚持字面谓词，T0/T1 会重新看到平台行。

### 4.3 六档结果（迁移后，注入 1 条平台行 + 1 条租户A行）

| 档位 | T0 | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|---|
| holidays 可见行数 | 0 | 0 | 1 | 2 | 1 | 2 |

### 4.4 写断言

| 断言 | 结果 |
|---|---|
| T3 插入平台行（`tenant_id NULL`） | 被 RLS 拒绝 |
| T3 更新平台行 | 0 行 |
| T3 插入本租户行 | 成功 |
| T5 系统通道清理 | 成功 |

### 4.5 回滚演练

执行 rollback 后：`erp_allow_all_holidays` 恢复、`tenant_id` 因「0 行且全 NULL」被删除；再次执行迁移草案成功（可重复演练）。

### 4.6 残余与风险

- `year/kind/name` 仍缺，代码 L1 仍 42703 → L2，行为与本轮前一致；
- `holidays.rs` 的 `tenant_id UUID NOT NULL` 注释与拍板冲突，需在代码改造时同步修正；
- 代码是**裸池读取**（非请求事务），可能携带连接上的残留 GUC；真正改「平台读」时应显式 `scope`/系统通道，而不是依赖会话状态；
- `tenant_id` 可空后，注释中的 PK `(tenant_id, year, date, kind)` 无法直接成立，唯一键形态留待补列批次。

---

## 5. #2 `core_menus` / `core_menu_groups` 证据清单（未动手）

| # | 证据 | 方式 | 判定标准 |
|---|---|---|---|
| 1 | 产品确认「平台菜单全租户可见」 | 产品/业务拍板 | 是 → A 成立；否 → 需按租户复制设计 |
| 2 | 租户分支是否显式 `tenant_id = $1` | 走读 [menu/handlers.rs:39,92](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/menu/handlers.rs#L39)、[cache.rs:143](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/menu/cache.rs#L143) | 决定回填后是否还要改谓词 |
| 3 | 菜单缓存失效机制 | 走读 `menu/cache.rs` + 发布流程 | 策略切换窗口内不返回空菜单 |
| 4 | `core_menus` 是否引用 `flow.*` 空副本 | `grep -rn "flow\.core_menu\|flow\.menu" --include=*.rs --include=*.sql`；`schema_boundary.json` | 必须为 0 引用，才排 #2 |
| 5 | 前端菜单为空时是否有降级 | 走读菜单加载与 fallback | 无降级则需带功能断言上线 |
| 6 | 迁移版本号 | 本批未出 | 不得复用/改写 110000–124000 |

上线前断言：T0/T1=0；T2/T3/T4=452/130；T3 菜单接口非空且树完整；租户插入全零行 42501。

---

## 6. #5 `flow` 18 张影子表证据清单（未动手）

| # | 证据 | 方式 | 判定标准 |
|---|---|---|---|
| 1 | 18 张表清单与 0 行确认 | `pg_class`/`pg_stat_user_tables` 只读查询 | 与盘点 §5.5 一致 |
| 2 | 无服务使用 `flow` | `scripts/schema_boundary.json` | `flow` 出现次数 = 0 |
| 3 | 无部署/连接串 `search_path=flow` | 部署清单、compose/systemd、角色级 `ALTER ROLE ... SET search_path` | 全部无命中 |
| 4 | 无代码/工具引用 | `grep -rn "flow\." --include=*.rs --include=*.sql`（排除 Rust `flow` 模块） | 无表级引用 |
| 5 | 探针基线 | `check_schema_boundary.py`、`check-schema-defense-drift.py`、`schema-drift-scan.sh` + 服务启动 smoke | 全部通过且无 alarm |
| 6 | RENAME 影响面 | `RENAME TO _deprecated_<原名>` 会改 `relname`，需同步 schema defense 基线/白名单 | 基线条目可同步 |
| 7 | 观察两周指标 | schema_defense alarm、慢查询、启动失败、菜单/流程接口 | 两周内 0 异常才 DROP |
| 8 | 与 #2 的顺序 | 先清 `core_menus` 的 `flow.*` 空副本依赖，再回填菜单 | 顺序不可颠倒 |

---

## 7. 本轮文件与工作树

新增（仅这 3 个）：

1. [20261118130000_erp_holidays_platform_corpus.sql](file:///Users/xingzhai/TOPEMS/database/migrations/20261118130000_erp_holidays_platform_corpus.sql)
2. [20261118130000_erp_holidays_platform_corpus.rollback.sql](file:///Users/xingzhai/TOPEMS/database/rollback/20261118130000_erp_holidays_platform_corpus.rollback.sql)
3. 本文

未修改任何历史迁移、`migration_manifest.yaml`、`checksums.txt` 或他人改动；未对生产库执行任何写操作；演练库可随时 `dropdb`。

---

## 8. 待你确认

1. #4 的平台读是否接受「GUC 非空」兜底（推荐，防 fail-open）；若要字面谓词，我改回去。
2. #4 是否允许在策略迁移里补可空 `tenant_id`（`year/kind/name` 仍缺，代码继续 L2）——若不接受，请指定补列批次。
3. #1 的系统通道改造清单（10 余个 handler + 指标口径）是否按本文 §1.3/§1.6 排入下一轮代码任务。
