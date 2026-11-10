# W7 · RLS fail-closed 重做：只读取证与设计方案（2026-11-09）

> 范围：只读取证 + 设计结论。本文**不含**代码改动、不含迁移、未在生产执行任何 DDL/DML。
> 取证环境：生产库（库 `topems_prod`，应用角色 `topems_prod`，超级用户 `xingzhai` 仅用于绕过 RLS 做真实行数对照），
> 全部为 `SELECT`/系统目录查询；本地库仅用于交叉核对。
> 相关前序文档：[rls-rework-after-rebase-2026-11-08.md](file:///Users/air/TOPEMS/docs/quality/rls-rework-after-rebase-2026-11-08.md)（W7 池化收敛立项）、
> [rls-tenant-isolation-next-batch-2026-11-06.md](file:///Users/air/TOPEMS/docs/quality/rls-tenant-isolation-next-batch-2026-11-06.md)（P0 方案）。

---

## 0. 结论摘要

1. **生产 RLS 现在不是 fail-closed**：800 条策略仍带"未设即豁免"，638 条带 nil UUID 全量分支，31 条硬编码租户 `...0001`，248 条是 `USING(true)`。`RlsMiddleware::new` 全仓 0 处调用，[rls.rs](file:///Users/air/TOPEMS/lib/shared-db/src/rls.rs#L107-L118) 里的"fail-closed 生成器"是死代码，从未在生产跑过。
2. **必须去掉 nil UUID 分支**。系统上下文唯一入口改为 `app.rls_system='on'`，且只在 4 类服务端代码位置设置（超管/服务身份请求、`Db::scope_system*`、异步审计写入、启动期 seed/自愈）；普通租户请求显式置 `'off'`。该开关不做请求头映射、不进任何公开 API。
3. **无租户上下文时：数据库返回空（不报错），应用层报错**。RLS 谓词求值为 false，`SELECT` 得 0 行、`INSERT` 报 42501；但 `UPDATE`/`DELETE` 会"静默影响 0 行"，所以真正的可用性护栏必须放在 `Db::scope*`——无租户上下文直接返回错误，禁止悄悄跑一条注定 0 行的 SQL。
4. **公司级隔离不下沉到 RLS**，继续由应用层 `core_user_company_scopes` + fail-closed 校验承担。理由与代价见 §8。
5. **最大阻塞不是策略写法，而是 2890 处裸池查询**（`&state.pool`/`&self.pool`），以及 `Db::scope()` 在无请求上下文时不设 GUC。分批开启必须按"模块裸池清零"闸门推进，而不是按表名单硬推。

分批结论：**7 批（B1–B6 + B7 iam），按"模块裸池清零 + 有数据优先验证"排序**，每批给出确定表集、验证方法、失败判定与回退动作（§6.2 验证、§7 回退、§10 批次清单、§11 门禁）。§12 的 6 条裁决已于 2026-11-09 拍定，本版按裁决定稿；**本轮仍只做只读准备，不含迁移、不含代码改动、不提交**。

---

## 1. 生产现状取证（原始数字）

### 1.1 总量

| 指标 | 数值 |
|---|---|
| 用户 schema 基表总数 | 1351 |
| 启用 RLS（`relrowsecurity`） | 871 |
| 强制 RLS（`relforcerowsecurity`） | 861 |
| 启用但**未 FORCE** | 10 |
| 策略总数 | 1067（全部 permissive，restrictive = 0） |
| `USING (true)` 策略 | 248 |
| 引用 `current_setting('app.tenant_id')` 的策略 | 819 |
| 引用 `app.rls_system` 的策略 | 9 |
| 含 nil UUID 分支的策略 | 638 |
| 含 `IS NULL`（未设即豁免）的策略 | 800 |
| 硬编码租户 `...0001` 的策略 | 31 |
| 一表多策略（permissive 叠加 = OR） | 194 张表 |
| `(tenant_id)::text = ...` 非 sargable 谓词 | 307 条（302 张表） |
| 租户链表 | 936（`tenant_id` 925 + `tenant_uid` 14，部分两者都有） |
| 无租户列的表 | 415（其中 60 张已 RLS + `USING(true)`） |
| 有数据（>0 行）的租户链表 | **34 张**，其余 902 张为空；34 张合计 **1,546 行**（复核值） |

> 结论：生产业务数据几乎是空的（基线重建后），**当前性能风险极低，风险全部集中在"查询/写入路径是否带租户上下文"**。

### 1.2 分类（按表，不是按策略）

| 类 | 定义 | 数量 | 代表 |
|---|---|---|---|
| A | 有租户列 + 已有 GUC 策略 + 无 `allow_all` | 615 | `finance.core_finance_accounts`、`master_data.*` |
| A2 | A 且策略已带 `app.rls_system` 分支 | 9 | `public.audit_logs`、`public.core_dict_items/types`、crm/ehs 各若干 |
| B | 有租户列 + GUC 策略 **且** `allow_all`（永久放行） | 3 | `mes.process_flow_steps`、`pm.documents`、`rs.formulas` |
| C | 有租户列 + 只有 `allow_all` | **184** | `pm` 29、`finance` 18、`mobile` 18、`ehs` 17、`erp` 17、`wms` 15、`lims` 12、`gis` 10、`integration` 9、`mes` 8、`srm` 7、`ticket` 7… |
| D | 有租户列 + **完全没有策略/未启用 RLS** | 125 | `iam` 44、`ehs` 31、`flow` 20、`public` 15、`bi` 8、`qms` 3、`finance` 2… |
| E | 无租户列 | 415 | 权限码 `public.core_permissions`、`core_role_permissions`、`core_user_roles`、文档/通知/存储类 |

分类按 schema 的完整分布（prod）：

```
public       A96  C2   D15  E6+90
finance      A84  C18  D2   E0+14
portal       A2   C1        E3+112
master_data  A85             E0+10
iam          A15  D44       E3+16
ehs          A22  C17  D31
erp          A13  C17
mes          A22+B1 C8
lims         A33  C12
qms          A27        D3  E7
pm           A8   C29  B1
wms          A21  C15  D1
scm          A26  C5
flow                       D20 E3+14
hrm          A29  C2
mobile       A9   C18
gis          A5   C10  E7
rs           A14  B1
crm          A19  C1
...
```

### 1.3 未 FORCE 的 10 张表（owner 绕过口）

```
public.core_sessions
public.core_refresh_tokens
public.core_user_company_scopes
ehs.qa_ehs_compliance_evaluations
ehs.qa_ehs_discharge_permits
ehs.qa_ehs_env_monitor_records
ehs.qa_ehs_environment_incidents
ehs.qa_ehs_environmental_regulations
lims.qa_lims_analytes
mes.work_orders
```

生产 **1351 张表全部 owner = `topems_prod`**，而应用连接角色也是 `topems_prod`。PG 语义：**owner 默认绕过 RLS**。所以上表当前的策略等于不存在，`core_user_company_scopes`（P2a 的公司范围表）目前对应用完全开放。`topems_prod` 的 `rolsuper=false`、`rolbypassrls=false`，说明 FORCE 缺失是唯一绕过原因。

### 1.4 有数据的 34 张表（决定成败的清单，2026-11-09 复核）

| 表 | 行数 | 现有策略数 | 租户分布 | tenant 前导索引 |
|---|---|---|---|---|
| public.core_menus | 452 | 2 | 全部 `...0001` | 有 |
| public.core_menu_groups | 130 | 3 | 全部 `...0001` | 有 |
| public.core_login_logs | 63 | 2 | 全部 nil | 有 |
| public.core_refresh_tokens | 50 | 1 | 全部 `...0001`（`COALESCE(...,'...0001')`） | **无** |
| public.core_sessions | 50 | 1 | 全部 `...0001`（同上） | **无** |
| finance.core_finance_report_line_map | 48 | 1 | **全部 NULL（全局模板）** | **无** |
| finance.core_finance_accounts | 28 | 2 | 全部 `...0001` | 有 |
| public.core_roles | 16 | 1 | 15 × nil（系统角色）+ 1 × `...0001` | 有 |
| finance.core_finance_currencies | 16 | **0（未启用 RLS）** | 8 × NULL（全局币种）+ 8 × `...0001` | 有 |
| core.ai_faqs | 15 | 1 | 全部 nil（系统内容） | 有 |
| public.core_guides | 12 | 1 | 全部 nil | **无** |
| public.core_faqs | 12 | 1 | 全部 nil | **无** |
| master_data.mdm_sync_dead_letter | 4 | 1 | `...0001` | 有 |
| public.core_tenant_settings | 4 | 1 | `...0001` | 有 |
| ai.ai_models | 4 | 1 | 4 × NULL（全局模型目录） | 有 |
| ai.ai_prompt_templates | 3 | 1 | **全部 NULL（全局模板）** | 有 |
| finance.cqrs_projection_progress | 2 | 1 | 全部 nil（内部簿记） | 有 |
| finance.core_finance_voucher_lines | 2 | 1 | `...0001` | 有 |
| finance.core_finance_ledger | 2 | 2 | `...0001` | 有 |
| mobile.push_config | 1 | 1 | `...0001` | 有 |
| public.core_tenant_users | 1 | 1 | `...0001` | 有 |
| pm.project_type_configs | 1 | 1 | **1 × nil（系统配置）** | 有 |
| finance.core_finance_periods | 1 | 2 | `...0001` | 有 |
| finance.core_finance_vouchers | 1 | 2 | `...0001` | 有 |
| bi.reports | 1 | 1 | `...0001` | **无** |
| master_data.mdm_suppliers | 1 | 1 | `...0001` | 有 |
| mobile.sync_policies | 1 | 1 | **1 × NULL（全局默认策略）** | **无** |
| public.core_tenants | 1 | 1 | **1 × NULL**（租户登记表） | **无** |
| hrm.companies | 1 | 2 | `...0001` | 有 |
| public.core_user_company_scopes | 1 | 1 | `...0001` | 有 |
| hrm.departments | 1 | 2 | `...0001` | **无** |
| public.core_dict_items | 397 | 1 | 全部 `...0001` | **无** |
| public.audit_logs | 147 | 1 | 66 × nil + 81 × `...0001` | 有 |
| public.core_dict_types | 77 | 1 | 全部 `...0001` | **无** |

> 复核说明（2026-11-09）：相对初版 31 张 / 925 行，生产新增了 `core_dict_items` 397 行、`audit_logs` 147 行、`core_dict_types` 77 行，故为 34 张 / 1,546 行。B1 的 12 张表合计 **1,388 行**，占全部租户数据的 **90%**——B1 仍是"一开就影响面最大"的一批。

**非 `...0001` 且有数据的表会因 fail-closed 直接改变可见性**：`core_menus`（全局菜单树）、`core_roles`（15 个系统角色为 nil）、`core_ai_faqs/guides/faqs`（系统内容为 nil）、`finance.core_finance_currencies` 与 `ai.ai_models`（全局目录为 NULL）、`finance.core_finance_report_line_map`（48 行报表行映射全局模板）、`ai.ai_prompt_templates`（3 行全局模板）、`mobile.sync_policies`（1 行全局默认策略）、`public.core_tenants`（1 行 NULL 的租户登记）、`pm.project_type_configs`（1 行 nil 系统配置）、`core_login_logs` 与 `finance.cqrs_projection_progress`（系统簿记为 nil）。这些必须在 §6.3 的全局登记表里被显式处理，否则上线即"数据变空"——其中 `core_finance_report_line_map` 直接决定 P3 资产负债表/利润表能否生成。

### 1.5 现有策略形态抽样（原文）

```sql
-- 目标形态（prod 已存在，public.audit_logs）
(COALESCE(current_setting('app.rls_system', true), '') = 'on')
OR (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)

-- 未设即豁免（public.core_roles）
(current_setting('app.tenant_id', true) IS NULL)
OR (current_setting('app.tenant_id', true) = '')
OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), ''))
OR (tenant_id IS NULL)

-- 硬编码默认租户（public.core_sessions / core_refresh_tokens）
tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
                     '00000000-0000-0000-0000-000000000001'::uuid)

-- 公司范围表（public.core_user_company_scopes）
(tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
OR (tenant_id IS NULL)
OR (COALESCE(current_setting('app.tenant_id', true), '') = '00000000-...-000000000000')
```

`core_menus` 上同时存在两条 permissive 策略（`rls_menu_global_visible` 与 `tenant_isolation_core_menus`），permissive 是 OR 关系，等于"最宽的那条说了算"。**一表多策略必须收敛为一条**，否则任何收紧都会被另一条放宽。

---

## 2. 代码侧取证：GUC 设置点、默认值、调用面

### 2.1 `app.tenant_id` / `app.rls_system` 设置点

| 位置 | 作用域 | 设置值 | 现状 |
|---|---|---|---|
| [database/mod.rs#L99-L145](file:///Users/air/TOPEMS/lib/shared-db/src/database/mod.rs#L99-L145) | 会话级（`after_connect`） | `DEFAULT_TENANT_ID` | 仅当 `MULTI_TENANT_ENABLED != true` 且配置了 `DEFAULT_TENANT_ID` 才设；**生产 plist 两个变量都没有 → 不设** |
| [shared-bootstrap/lib.rs#L430-L470](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs#L430-L470) | 会话级（`after_connect`） | 同上 | 同逻辑的第二套建池入口 |
| [scope.rs#L212-L230](file:///Users/air/TOPEMS/lib/shared-db/src/scope.rs#L212-L230) | 事务级（`SET LOCAL`） | 请求 task-local 的租户 + `rls_system` on/off | 无请求上下文时**什么都不设**（关键缺陷，见 §7） |
| [scope.rs#L93-L122](file:///Users/air/TOPEMS/lib/shared-db/src/scope.rs#L93-L122) | 事务级 | nil + `rls_system='on'` | 系统通道，仅 2 + 8 处调用 |
| [middleware/tenant.rs#L223-L266](file:///Users/air/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L223-L266) | 事务级 | 超管/service：nil + `'on'` | 已实现，但**没有对应策略消费它** |
| [middleware/tenant.rs#L299-L327](file:///Users/air/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L299-L327) | 事务级 | 普通租户：真实租户 + `'off'` | 已实现 |
| [auth.rs#L440-L447](file:///Users/air/TOPEMS/lib/shared-auth/src/auth.rs#L440-L447) | 事务级 | `SYSTEM_TENANT_ID`（nil），**未设 `rls_system`** | 权限解析依赖"nil 行 = 系统角色"，见 §6.4 |
| [audit_logger.rs#L455-L463](file:///Users/air/TOPEMS/lib/shared-auth/src/security/audit_logger.rs#L455-L463) | 事务级 | 行租户 + `rls_system='on'` | 正确范式 |
| [rls.rs#L143-L160](file:///Users/air/TOPEMS/lib/shared-db/src/rls.rs#L143-L160) | 会话级 | 租户 | 注释标注"已废弃"，`RlsMiddleware::new` **0 调用** |
| [tenant.rs#L45-L80](file:///Users/air/TOPEMS/lib/shared-db/src/tenant.rs#L45-L80) | 会话级 | 租户 | 无外部调用方（死代码） |
| [unified-core/tenant_rls.rs#L212-L235](file:///Users/air/TOPEMS/svc/unified-core/src/middleware/tenant_rls.rs#L212-L235) | 会话级，占用一条连接贯穿请求 | 超管置空串，普通用户设租户 | **不生效**：handler 用池取别的连接；且超管依赖"空串/空分支"放行，属于要拆掉的机制 |
| [unified-core/iam/auth.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/auth.rs) | 事务级 | 8 处租户 + 1 处硬编码 nil | 多为"按用户查授权"的系统读，后续需补 `rls_system` |
| `lims/sample.rs`、`unified-core/doc/*`、`crm/customer_profile.rs` | 事务级 | 租户 | 局部自设，W7 统一收口 |

**默认值结论**：
- 生产**没有**默认租户：plist 未配置 `MULTI_TENANT_ENABLED`/`DEFAULT_TENANT_ID`，`after_connect` 不设 GUC。
- 自定义 GUC 从未设置时 `current_setting('app.tenant_id', true)` 返回 **NULL**；`SET` 过再 `RESET` 在 PG18 实测回落为**空串**（仓库内 [tenant_rls.rs#L218-L223](file:///Users/air/TOPEMS/svc/unified-core/src/middleware/tenant_rls.rs#L218-L223) 有实测注释）。所以谓词必须 `NULLIF(current_setting(..., true), '')`，`missing_ok` 必须为 `true`。
- 绝不使用 `missing_ok=false`：自定义参数未定义时会直接抛 `unrecognized configuration parameter`，让所有未设上下文的连接在第一条 SQL 就报错。

### 2.2 调用面

| 项 | 数量 | 说明 |
|---|---|---|
| `begin_tenant_txn` | **0** | 函数已随批 43 撤销，全仓不存在；不要再造第二套事务工厂 |
| 裸池引用（`&state.pool`/`&self.pool` 等，grep 粗口径） | **2890** | unified-core 684、finance 603、mes 567、qms 300、ehs 221、lims 210、analytics 190、pm 24、integration 14、mobile 12、server 8、gis 3、erp 2、ai 2 |
| `Db::scope*` 调用（粗口径） | 约 1048 | `scope_with` 475、`scope_read` 296、`scope_system` 8、`scope_read_system` 2，其余 `.scope()` |
| 内联 GUC 消费（`current_setting('app.tenant_id')` 写在业务 SQL 里） | **284** | erp 20、pm 18、hrm 11、wms 9…（这些是"第二道防线"，不能当第一道） |
| `tenant_middleware()` 装配 | pm/lims/monitor/wms/portal/integration/crm/tms/server 各真实模块 | unified-core **不装配**，用自己的无效实现 |

**已注入 `Db` 的模块**：pm(23 文件)、mobile(1)、ai(2)、gis(3)、integration(2)、mes(1)；
**未注入 `Db`**：erp、finance、analytics、lims、qms、ehs、unified-core。

> 另一路会话正在改 `svc/finance`、`svc/erp`，上述两个模块的数字在实施时需重新取。

### 2.3 关键语义缺陷

1. **`RlsMiddleware::new` 从未被调用**：[rls.rs#L52](file:///Users/air/TOPEMS/lib/shared-db/src/rls.rs#L52) 的 `enable_rls_on_tables` 不会在启动时执行。策略的真实来源只有迁移。
2. **`Db::scope()` / `scope_read()` 在无请求上下文时不设 GUC**（[scope.rs#L212-L217](file:///Users/air/TOPEMS/lib/shared-db/src/scope.rs#L212-L217)）：后台任务、定时任务、启动自愈一旦走这两个入口，fail-closed 后就是静默 0 行。
3. **裸池查询永远没有 GUC**：2890 处既不经过 `tenant_middleware`，也不经过 `Db`，是 fail-closed 后会"大面积空数据"的真正来源。
4. **unified-core 的 RLS 中间件设置了不生效的会话 GUC**，且超管依赖"空串/空分支"放行 —— W7 必须一并修掉，否则它是新的隐式逃生门。
5. **权限解析只设 nil 租户、不设 `rls_system`**：在当前 nil 分支下没事；去掉 nil 分支后，`core_roles` 里 15 个 nil 行仍能匹配（`tenant_id = nil`），但 `...0001` 的那个角色名会解析不到。必须在同一批把权限解析改为显式系统通道。

---

## 3. `migrations_deferred/` 两份 RLS 迁移的取证

| 文件 | 内容 | 状态 |
|---|---|---|
| [20261106120100_p0_rls_fail_closed.sql](file:///Users/air/TOPEMS/database/migrations_deferred/20261106120100_p0_rls_fail_closed.sql) | 重写 A/B 类策略为 `nil OR tenant match`；菜单两表、auth 两会话表改为显式 `allow_all`；断言不得再含 `IS NULL`/硬编码 0001 | **未应用**。文件头写明：演练库验证通过（策略 1066→867、FORCE 858→867、残留豁免 0），但被 2398 处裸池阻塞 |
| [20261106120200_p0_rls_class_c_tenant_scope.sql](file:///Users/air/TOPEMS/database/migrations_deferred/20261106120200_p0_rls_class_c_tenant_scope.sql) | 对 184 张 C 类表补租户策略，谓词与上同 | **未应用**，前置条件写明"应用侧裸池改造完成 + 历史数据无跨租户共用行" |

### 3.1 为什么被压

文件头原话："`svc/` 中有 2398 处 `&state.pool`/`&self.pool` 直查直写运行在没有 `app.tenant_id` 的 pool 连接上；fail-closed 后这些路径会静默返回 0 行（已实测 MES kanban 22→0）。必须先完成 B 阶段（pool 租户上下文收敛），再按已验证模块的表子集分期应用。"

本次复核：裸池已从 2398 增至 **2890**（代码在长），阻塞条件仍然成立，且**更严重**。

### 3.2 与当前表结构的兼容性

| 维度 | 迁移假设 | 当前生产 | 结论 |
|---|---|---|---|
| 租户列类型 | 一律 `uuid` | 925 张 `tenant_id` 为 uuid，**1 张 `iam.tenant_permissions` 为 varchar**，另 14 张用 `tenant_uid` | 需在 SQL 里按列类型生成谓词，不能无脑 `::uuid` |
| 目标表数 | 期望 ≥600 | 当前 A+A2+B = 627 | 断言仍可通过 |
| `core_user_company_scopes` | 迁移写于 P2a 之前 | 该表已存在且有 GUC 策略，会被纳入并 FORCE | **兼容**，且正好补上它缺的 FORCE |
| 菜单行数 | 423/122 | 452/130 | 兼容（断言不依赖行数） |
| C 类 | 184 张 | 184 张 | 一致，但不在第一份里 |
| 新增对象 | 未涉及 | D 类 125 张（iam 44 等）仍无策略 | 两份迁移都覆盖不到 |
| `app.rls_system` | 未引入 | 已有 9 条策略与 3 个代码通道使用 | **迁移必须改写为 rls_system 形态**，否则与代码注释"新策略只认这一开关"矛盾 |
| nil 分支 | **保留** nil = 全量 | 与 W7 目标冲突 | **必须删掉** |
| 策略命名 | 先 DROP 全部再建一条 | 194 张表多策略 | 方向正确，需保留 |

**结论**：两份迁移的"逐表枚举 + 先删后建 + FORCE + 断言"骨架可以直接复用；谓词、例外清单、表集必须重写。

---

## 4. 目标策略形态（唯一真相源）

### 4.1 普通租户表（A/A2/B/C/D 类的绝大多数）

每表**恰好一条**策略，FOR ALL，命名统一 `rls_tenant_isolation`：

```sql
CREATE POLICY rls_tenant_isolation ON <schema>.<table>
  FOR ALL TO PUBLIC
  USING (
    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
    OR <tenant_col> = (NULLIF(current_setting('app.tenant_id', true), ''))::<tenant_col_type>
  )
  WITH CHECK (
    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
    OR <tenant_col> = (NULLIF(current_setting('app.tenant_id', true), ''))::<tenant_col_type>
  );
```

外加：`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`、`ALTER TABLE ... FORCE ROW LEVEL SECURITY`。

要点：
- **没有 nil 分支**。`app.tenant_id = nil` 只是"租户值恰好是 nil"，仅在列值也为 nil 时匹配；不再是"全量"。
- `app.rls_system` 用 `COALESCE(..., 'off') = 'on'`：未设 = 未设即 **off**，`RESET` 后空串也 ≠ `'on'`。
- `<tenant_col_type>` 按列真实类型取 `uuid`/`varchar`；**不做列侧 cast**（`(tenant_id)::text` 会让索引失效，见 §9）。
- 单条策略，删掉该表其余全部策略，避免 permissive OR 互相抵消。

### 4.2 全局表（无租户语义）

`USING (true)`，但**必须登记**在仓库内的全局表清单里（见 §6.3），并由 CI 断言"库里的 allow_all 表集合 == 清单"，新增必须改清单、走评审。当前 `USING(true)` 有 248 条、对应 247 张表，其中 184 张是 C 类业务表，**收紧后全局表应收缩到 15 张以内**。

### 4.3 只读全局行（有租户列，但存在共享行）

对 `tenant_id IS NULL`（共享参考数据）或 `tenant_id = nil`（系统内容），拆成两条策略：

```sql
-- 读：本租户 + 系统通道 + 全局共享行
CREATE POLICY rls_tenant_isolation ON s.t FOR SELECT TO PUBLIC
  USING (
    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    OR tenant_id IS NULL            -- 仅登记过的"共享参考数据"表
  );

-- 写：只有本租户或系统通道
CREATE POLICY rls_tenant_write ON s.t FOR ALL TO PUBLIC
  USING (same_as_above_without_null)
  WITH CHECK (same_as_above_without_null);
```

permissive 策略按命令求并集：`SELECT` 走第一条，`INSERT/UPDATE/DELETE` 只受第二条约束。**`tenant_id IS NULL` 只允许出现在登记过的共享表，且只允许出现在 SELECT 策略里**——这正是现有 CI 禁止的 `OR tenant IS NULL` 形态，因此门禁需要升级为"按表白名单 + 仅 SELECT"。

> **已拍定（2026-11-09 裁决 2）**：nil/NULL 全局行允许全租户**只读**、禁止写；必须用上面的**独立 SELECT 策略**表达，**不得**把 `IS NULL` / nil 分支散回各表通用谓词。
>
> B1 中需要这条策略的 6 张：`core_roles`（15 行 nil 系统角色）、`core_tenants`（1 行 NULL）、`core_menus`（452）、`core_menu_groups`（130）、`core_dict_types`（77）、`core_dict_items`（397）。后四张现存行全是 `...0001` 而非 NULL，**B1 必须先把这些系统内容行的 `tenant_id` 迁到 NULL**，才能被"全局行"只读策略覆盖；否则多租户下菜单/字典全空。这一步是数据迁移，本阶段不写、不执行。

### 4.4 为什么必须移除 nil 分支

- nil 分支的真实语义是"任何能把 `app.tenant_id` 设成 nil 的路径都能读全库"。生产里 `auth.rs` 的权限解析、unified-core 的超管分支、部分 LIMS/CRM/doc 代码都在设 nil，等于 **5 个以上隐式全量入口**，且没有任何运行时审计能区分"合法系统读"与"越权读"。
- 改成 `app.rls_system='on'` 后，全仓 grep 即可枚举入口（当前 3 个文件、4 处 setter），CI 可把这些文件加白名单，新增即告警。

### 4.5 谁能进系统通道（完整清单）

| 入口 | 条件 | 代码位置 |
|---|---|---|
| 超管请求 | `claims.is_superuser == true` | [tenant.rs#L228](file:///Users/air/TOPEMS/lib/shared-auth/src/middleware/tenant.rs#L228) |
| 服务身份 | `is_service_claims(claims)`，仅 service token | 同上 |
| 后台/脚本系统作用域 | 显式调用 `scope_system()` / `scope_read_system()` | [scope.rs#L93-L122](file:///Users/air/TOPEMS/lib/shared-db/src/scope.rs#L93-L122) |
| 异步审计写入 | 响应后中间件，无 task-local | [audit_logger.rs#L455](file:///Users/air/TOPEMS/lib/shared-auth/src/security/audit_logger.rs#L455) |
| 启动期 seed / 自愈 / 迁移 | 运维进程，需在脚本内显式 `SET LOCAL` | 新增，需逐个审计 |

补充要求：
- `app.rls_system` **只允许 `SET LOCAL`（`set_config(..., true)`）**，禁止会话级设置；请求结束随事务消失，不留残余。
- 普通租户请求必须显式 `set_config('app.rls_system','off',true)`（已有实现），防止连接上残留。
- 禁止从 HTTP 头、查询参数、请求体读取任何值写入该 GUC。
- `ops` 手工 SQL 必须显式 `BEGIN; SET LOCAL app.rls_system='on'; ...; COMMIT;`，写进运维手册。

---

## 5. 无租户上下文时的行为（结论）

### 5.1 数据库层：返回空，不报错

**结论：`SELECT` 返回 0 行；`INSERT`/`UPDATE ... WITH CHECK` 违反时报 SQLSTATE 42501；`UPDATE`/`DELETE` 命中不可见行时静默影响 0 行。**

理由：
- RLS 的 `USING` 为 false 在语义上就是"行不存在"，没有错误通道；
- 若用 `missing_ok=false` 或自定义函数 `RAISE`，会让所有无上下文的连接（健康检查、迁移、pg_dump、监控采集）在第一条 SQL 就炸，且错误无法按表区分；
- PostgreSQL 本身对 SELECT 不做"被过滤"报错，强行制造错误只能靠在策略里调用会抛异常的函数，属于反模式。

### 5.2 应用层：必须报错（这是可用性护栏）

**已拍定（2026-11-09 裁决 3）：`Db::scope()` / `Db::scope_read()` / `Db::scope_with()` 在没有租户上下文时必须返回错误，不得静默执行。**

实现方式：

```rust
// scope.rs：apply_request_tenant 改为返回 Result，无上下文即 fail
let Some(ctx) = current_request_tenant() else {
    return Err(sqlx::Error::Protocol(
        "RLS context missing: 无租户上下文，禁止执行租户数据查询；后台任务请用 scope_*_system()".into()));
};
```

- 请求内（经过 `auth_middleware`）一定有 task-local；没有就说明该路径是 public 或装配错误，**500 比 0 行正确**。
- 后台任务必须显式改用 `scope_read_system()` / `scope_system()`。当前系统作用域只有 10 处调用，需要逐个确认；其余后台入口在改造前就被编译/启动期暴露，而不是上线后静默空。
- 裸池路径（2890 处）无法被这层保护，只能通过"模块裸池清零"闸门保证；清零前**不允许**对该模块的表开启 fail-closed（§10）。

### 5.3 `current_setting` 写法

```sql
-- 正确
NULLIF(current_setting('app.tenant_id', true), '')
COALESCE(current_setting('app.rls_system', true), 'off') = 'on'

-- 禁止
current_setting('app.tenant_id')            -- missing_ok=false，未设直接报错
current_setting('app.tenant_id', true) = '' -- 把空串当"全量"
... = '00000000-0000-0000-0000-000000000000' -- nil 全量分支
```

---

## 6. 分批开启路径（可执行）

### 6.0 前置闸门（不开启任何策略，必须先完成）

| 编号 | 事项 | 完成判据 |
|---|---|---|
| G0 | 升级门禁 [check-rls-policy-shape.sh](file:///Users/air/TOPEMS/scripts/ci/check-rls-policy-shape.sh) | 新增拒绝：nil 全量分支、策略里的 `= '...0000'`、`(tenant)::text` 列侧 cast、一表多策略、未 FORCE；新增要求：`rls_system` 形态与全局表清单一致 |
| G1 | 权限解析补系统通道 | [auth.rs#L444](file:///Users/air/TOPEMS/lib/shared-auth/src/auth.rs#L444) 同一事务加 `set_config('app.rls_system','on',true)`；权限码/角色数量与基线一致 |
| G2 | unified-core 中间件修正 | 超管走 `rls_system='on'`；或直接改用 shared `tenant_middleware`；删除"空串放行"依赖 |
| G3 | 登录/刷新/登出显式系统通道 | 触及 `core_sessions`/`core_refresh_tokens` 的事务内 `SET LOCAL app.rls_system='on'` |
| G4 | `scope*` 无上下文报错 | 见 §5.2；编译通过 + 后台任务清单确认 |
| G5 | 全量基线快照 | 每张有数据表按租户的真实行数、关键端点响应快照、`pg_policies` 全量导出，落盘到窗口记录 |

### 6.1 批次划分与表集

| 批次 | 表集（确定） | 依据 | 前置 |
|---|---|---|---|
| **B1 系统/认证边界** | `public.core_sessions`、`core_refresh_tokens`（系统通道专用）；`core_menus`、`core_menu_groups`（全局只读，B1 内把 `...0001` 行迁到 NULL）；`core_tenants`（全局读 + 系统写）；`core_roles`（系统通道 + 本租户 + nil 行只读）；`core_dict_types`、`core_dict_items`（同菜单，迁 NULL 后全局只读）；`audit_logs`、`core_login_logs`、`core_tenant_settings`、`core_user_company_scopes`（含补 FORCE） | 认证/权限/菜单是所有请求的地基，必须先稳；这批表现有 **1,388 行，占全部租户数据 90%**（2026-11-09 复核） | G0–G5 |
| **B2 零裸池模块** | `pm`(8A+29C+1B) = 38、`mobile`(9A+18C) = 27、`ai`(6A+4C) = 10、`gis`(5A+10C) = 15、`integration`(9A+9C) = 18，共 **108 张** | 这些模块已注入 `Db`，裸池 24/12/2/3/14，改造量最小；有数据仅 10 行 | G4；各模块裸池清零 |
| **B3 空表但结构复杂** | `ehs`(22A+17C+31D) = 70、`lims`(33A+12C) = 45、`qms`(27A+3D) = 30，共 **145 张** | 全部 0 行；D 类（ehs 31 张）在这批补 ENABLE+策略；风险在裸池（221/210/300） | 三模块裸池清零 |
| **B4 制造/仓储** | `mes`(22A+1B+8C) = 31、`wms`(21A+15C+1D) = 37、`scm`(26A+5C) = 31、`srm`(13A+7C) = 20、`crm`(19A+1C) = 20、`pdm`(20A) = 20，共 **159 张** | 全部 0 行；mes 裸池 567 是最大改造项 | 各模块裸池清零 |
| **B5 财务** | `finance`(84A+18C+2D) = 104 张，重点 8 张有数据表（line_map 48 全局 / accounts 28 / currencies 16 / ledger / vouchers / voucher_lines / periods / cqrs） | 唯一有真实业务数据的业务域；含全局 NULL 行（currencies 8、line_map 48） | finance 裸池清零；**必须等另一路会话的 finance 改动落地并重新取证** |
| **B6 核心与残余** | 其余 A/C/D 类 = 936 − 528 − 44 = **364 张**：`public` 剩余 101、`master_data` 85、`iam` 15（44 张 D 类已拆到 B7）、`hrm` 31、`erp` 30、`flow` 20、`rs` 15、`bi` 15、`analytics` 11、`core` 8、`ticket` 8、`tms` 7、`plugin_finance` 6、`communication` 5、`portal` 3、`unified_core` 1、`plugin_mes` 1 等 | 裸池：unified-core 684（与 B1 共用）、analytics 190（含 10 处后台）；`erp` 单独留到最后是因为另一路会话正在改 | 各模块裸池清零；独立窗口 |
| **B7 iam 独立批** | `iam` D 类 **44 张**（裁决 4：不入 B1–B6） | 认证域改动面最大、与 iam 服务重构耦合；单独窗口、排最后 | B1–B6 全部完成 |

不在任何批次：E 类 415 张（无租户列）——**不加 `tenant_id`、不加策略**，登记为无租户表；若确有业务需要，走单独的表结构设计。

### 6.2 每批验证方法（四层，全部通过才算过）

1. **结构断言（SQL）**
   - 目标表策略数 = 1（全局表 = 1，SELECT/写拆分的 = 2）；
   - `relrowsecurity && relforcerowsecurity` 全为 true；
   - `pg_get_expr` 不含 `= '00000000-0000-0000-0000-000000000000'`、不含 `IS NULL` 的 GUC 分支、不含 `(tenant_id)::text`；
   - 全局表集合 == 清单。
2. **真实行数对照（隔离正确性）**
   对每张有数据表，用超级用户（绕过 RLS）与 `topems_prod + tenant=...0001 + rls_system=off` 两种身份各查一次：
   - 租户行应可见，且行数与 `WHERE tenant_id='...0001'` 的超级用户结果一致；
   - 其它租户行不可见；
   - 全局行按 §4.3 规则可见/不可见符合预期。
3. **端点冒烟（双身份）**
   - 普通租户用户（非超管）与超管各跑一遍该模块主要读写端点；
   - 列表类端点返回条数不得比基线少（除预期中的跨租户行消失）；
   - 写路径：创建 → 读回 → 改 → 删，全链路无 42501。
4. **性能**
   - 对有数据表 `EXPLAIN (ANALYZE, BUFFERS)`：必须出现 `Index Scan`/`Bitmap Index Scan`（表 <1 万行允许 Seq Scan）；
   - p95 不高于基线 2 倍。

### 6.3 全局表登记清单（初版，B1 冻结）

| 表 | 形态 | 理由 |
|---|---|---|
| `public.core_permissions` | 无 RLS（无 tenant_id） | 权限码字典，全租户共用 |
| `public.core_role_permissions` | 无 RLS | 角色-权限映射，按 role_id 关联 |
| `public.core_user_roles` | 无 RLS | 用户-角色映射，按 user_id 关联 |
| `public.core_menus` | SELECT：本租户 + `tenant_id IS NULL`（独立只读策略）；写：系统通道 | 全租户同一棵菜单树，452 行现为 `...0001`，B1 迁 NULL |
| `public.core_menu_groups` | 同 `core_menus` | 130 行现为 `...0001` |
| `public.core_tenants` | SELECT：`tenant_id IS NULL` + 系统通道；写：系统通道 | 1 行 NULL 的租户登记表，登录期按 code/domain 查 |
| `public.core_roles` | SELECT：本租户 + `tenant_id = nil`；写：系统通道 | 15 行 nil 系统角色 + 1 行租户角色 |
| `public.core_sessions` | 仅系统通道（无 allow_all） | token 引导，登录事务内显式 `rls_system='on'` |
| `public.core_refresh_tokens` | 仅系统通道 | 同上 |
| `public.core_login_logs` | 写：系统通道；读：系统通道 + 本租户 | 登录日志现有 63 行全为 nil |
| `public.core_dict_types` / `core_dict_items` | SELECT：本租户 + `tenant_id IS NULL` + 系统通道；写：系统通道 | 字典是系统内容；77/397 行现为 `...0001`，B1 迁 NULL（现策略不含 NULL 分支） |
| `public.core_faqs` / `core_guides` / `core.ai_faqs` | SELECT：本租户 + nil 行；写：系统通道 | 系统帮助内容，现有 39 行全为 nil |
| `finance.core_finance_currencies` | SELECT：本租户 + `tenant_id IS NULL`；写：本租户/系统 | 8 行全局币种 + 8 行租户币种；当前**未启用 RLS** |
| `finance.core_finance_report_line_map` | SELECT：本租户 + `tenant_id IS NULL`；写：本租户/系统 | 48 行全部为 NULL 的**全局报表行映射模板**；漏登记会导致资产负债表/利润表无行可出 |
| `ai.ai_models` | SELECT：本租户 + `tenant_id IS NULL`；写：本租户/系统 | 4 行全局模型目录 |
| `ai.ai_prompt_templates` | SELECT：本租户 + `tenant_id IS NULL`；写：本租户/系统 | 3 行全局提示词模板 |
| `mobile.sync_policies` | SELECT：本租户 + `tenant_id IS NULL`；写：本租户/系统 | 1 行全局默认同步策略 |
| `pm.project_type_configs` | SELECT：本租户 + `tenant_id = nil`；写：系统通道 | 1 行 nil 的系统项目类型配置 |

### 6.4 权限解析的专门处理（B1 内）

`auth.rs` 的权限解析是"按 user_id 查授权"的系统读，必须显式走系统通道：

```rust
// 现在：只设 nil 租户
SELECT set_config('app.tenant_id', SYSTEM_TENANT_ID, true)
// 改为：
SELECT set_config('app.tenant_id', SYSTEM_TENANT_ID, true),
       set_config('app.rls_system', 'on', true)
```

否则 `core_roles` 里那 1 个 `tenant_id='...0001'` 的角色名在权限解析时不可见（15 个 nil 行仍可见），表现为"角色少一个"。

### 6.5 批次失败判定（任一命中即停批，回退）

| 现象 | 判定 |
|---|---|
| 端点 5xx，且 SQLSTATE = `42501`（RLS 拒绝） | 失败，立即停批 |
| 列表端点 200 但条数为 0，而超级用户按同租户过滤 >0 | 隔离误拦，失败 |
| 写入返回 200，但读回不可见（WITH CHECK 与 USING 不一致） | 失败 |
| 审计日志量比基线下降 >50% | 异步审计被拦，失败 |
| 有数据表出现 Seq Scan 且行数 >1 万 | 性能不达标，补索引后重测 |
| p95 > 基线 2 倍持续 10 分钟 | 暂停该批 |

### 6.6 裸池 2890 处分组与"必须先改造才能开 RLS"的模块清单

**口径**（2026-11-09 复核，另一路会话改完 `finance`/`erp` 后必须重取）：

- 统计：`&state.pool` / `&self.pool` / `&app_state.pool` / `state.pool` / `self.pool`，覆盖 `svc/` 与 `lib/` → **2,890 处 / 228 个文件**。
- 链路：路径含 `job|scheduler|worker|cron|main.rs|bootstrap|seed|selfheal|snapshot|monitor` 记为**后台**（89 处），其余 **2,801 处**为请求/领域代码。
- 上下文：文件内出现 `Claims`/`AuthUser`/`TenantContext`/`tenant_id`/`TENANT` 视为"可能拿到租户上下文"的**静态线索**，不代表该查询真的设置了 GUC。
- 难度：**S** = 请求链路 + 有上下文线索 + 文件内 refs ≤ 10（机械替换为 `Db::scope*`）；**M** = 请求链路但需补租户提取，或 refs > 10；**L** = 后台/启动路径，无请求上下文（必须先决定走 `scope_*_system()` 还是按租户遍历）。

**服务级分布**

| 服务 | refs | 文件 | 后台 | 无上下文线索 | S / M / L | 批次 |
|---|---|---|---|---|---|---|
| unified-core | 684 | 53 | 66 | 59 | 122 / 496 / 66 | B1 + B6（+B7 iam） |
| finance | 603 | 28 | 2 | 1 | 30 / 571 / 2 | B5 |
| mes | 567 | 35 | 0 | 1 | 33 / 534 / 0 | B4 |
| qms | 300 | 19 | 1 | 13 | 32 / 267 / 1 | B3 |
| ehs | 221 | 18 | 2 | 3 | 40 / 179 / 2 | B3 |
| lims | 210 | 25 | 1 | 27 | 73 / 136 / 1 | B3 |
| analytics | 190 | 27 | 10 | 57 | 90 / 90 / 10 | B6 |
| shared | 50 | 8 | 0 | 13 | 16 / 34 / 0 | B1 前置 |
| pm | 24 | 4 | 0 | 1 | 12 / 12 / 0 | B2 |
| integration | 14 | 2 | 4 | 0 | 10 / 0 / 4 | B2 |
| mobile | 12 | 3 | 1 | 1 | 10 / 1 / 1 | B2 |
| server | 8 | 2 | 0 | 4 | 4 / 4 / 0 | B1 前置 |
| gis | 3 | 2 | 2 | 2 | 1 / 0 / 2 | B2 |
| ai | 2 | 1 | 0 | 2 | 0 / 2 / 0 | B2 |
| erp | 2 | 1 | 0 | 0 | 2 / 0 / 0 | B6（另一路会话在改） |

**必须先改造才能开 RLS 的模块清单（按批次）**

| 批次 | 必须先改造的模块（refs / 文件数） | 链路与上下文 | 难度 | 清零判据 |
|---|---|---|---|---|
| **B1 前置** | `lib/shared-db`(35/5)、`lib/shared-event`(13/1)、`server`(8/2)、`unified-core/iam`(186/17，**仅**登录/刷新/登出/权限解析子路径)、`unified-core/tenant`(69/1)、`unified-core/menu`(13/1)、`unified-core/settings`(10/2)、`unified-core/audit`(35/4) | 请求链路为主；`tenant`/`iam` 是超管与权限解析，必须改走系统通道；`shared-*`/`server` 是建池与引导，`SET LOCAL` 只能出现在事务内 | M（refs 集中、逻辑关键） | 8 个模块裸池 `grep` = 0；登录→刷新→登出→权限解析→菜单 5 条链路只经 `Db::scope*` / `scope_system` |
| **B2** | `pm`(24/4)、`integration`(14/2)、`mobile`(12/3)、`gis`(3/2)、`ai`(2/1) | 请求为主；`integration/sync_scheduler`、`gis/main.rs`、`mobile/main.rs` 为后台（共 7 处 L） | S–L 混合 | 5 个模块裸池 = 0；后台入口改用 `scope_*_system` |
| **B3** | `ehs`(221/18)、`lims`(210/25)、`qms`(300/19) | 请求链路；`ehs/main.rs`、`lims/main.rs`、`qms/main.rs` 共 4 处后台；`lims` 27 处、`qms` 13 处无上下文线索 | M（S 仅 145 处） | 三模块裸池 = 0；`main.rs` 后台入口清零 |
| **B4** | `mes`(567/35)；热点模块：`quality_management`49、`basics`44、`material_bom`39、`equipment`32、`process_flow`27、`wip`26、`aps_scheduling`25、`process_route`25 | 全部请求链路，`S=33 / M=534`，无后台 | M（量大、模式统一） | `mes` 裸池 = 0；kanban 22 行回归用例通过 |
| **B5** | `finance`(603/28)；热点：`modules/mod.rs`175、`financial_reports`48、`(src)`39、`sales_invoice`28、`decision_v60`25、`operational`24、`risk_v59`23 | 请求链路；`finance/bootstrap.rs` 2 处后台；另有 302 张表 `(tenant_id)::text` 需同批去 cast | M（面最大） | `finance` 裸池 = 0；报表金额与基线一致 |
| **B6** | `unified-core` 剩余（`flow`200/10、`automation`43、`master`27、`doc`26、`file`18、`(src)`38/5、`migration`6 等）、`analytics`(190/27)、`erp`(2/1) | `flow/monitor.rs` 66 处是最大后台单点；`analytics` 有调度器与 57 处无上下文线索 | L（后台集中） | 各模块裸池 = 0；`flow/monitor` 与 `analytics` 调度器全部走系统通道 |
| **B7** | `unified-core/iam` 剩余（186 处中除 B1 认证子路径外的 iam 全域） | 与 B1 共用模块：B1 先收口认证，B7 收口 iam 44 张表 | M | iam 裸池 = 0；iam 管理端点双身份通过 |

**后台入口清单（L 类，必须显式系统通道或按租户遍历）**

```
66  svc/unified-core/src/modules/flow/monitor.rs
 6  svc/analytics/src/main.rs
 4  svc/integration/src/sync_scheduler.rs
 4  svc/analytics/src/modules/report/scheduler.rs   (无上下文线索)
 2  svc/ehs/src/main.rs                             (无上下文线索)
 2  svc/finance/src/modules/bootstrap.rs
 2  svc/gis/src/main.rs                             (无上下文线索)
 1  svc/lims/src/main.rs
 1  svc/mobile/src/main.rs
 1  svc/qms/src/main.rs
```

**无上下文线索最集中的模块**（需人工确认是否有其它租户来源）：`analytics/bi` 45、`unified-core/flow` 32、`unified-core/(src)` 20、`lims/statistics` 15、`shared-event` 13、`qms/dashboard` 12、`analytics/report` 12、`unified-core/migration` 6。

> 清零判据不是"grep = 0"：还必须确认该模块没有 `pool.acquire()` 后自行 `set_config` 的旁路，所有事务入口都在 `Db::scope*` 内。改造顺序严格按 B1→B7，前一批未清零不得开下一批。

---

## 7. 回退与"快速区分被拦 vs 真没数据"

### 7.1 回退（无运行时 GUC 开关，全部是可审计 DDL）

不引入 `app.rls_disable` 之类的逃生开关——那是另一种隐式全量放行。回退分为"窗口前物化 → 急停 → 单表/整批回滚 → 复盘"四段，每一步都写清判定、动作、责任人与记录位置；责任人用角色表示，窗口启动前填实姓名。

#### 7.1.0 窗口前物化（T−30 分钟，DBA 执行，发布负责人验收）

| 物化项 | 命令 / 内容 | 存放位置 | 验收判据 |
|---|---|---|---|
| 结构快照 | `pg_dump -d topems_prod --schema-only -f w7_before_<batch>_<yyyymmdd>.sql` | 窗口记录目录（不入库、不提交仓库） | 文件非空，含全部目标表 `CREATE POLICY` |
| 策略快照 | `\copy (SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies ORDER BY 1,2,3) TO 'w7_policies_before_<batch>.csv' CSV HEADER` | 同上 | 行数 = 当前 `pg_policy` 总数（1067） |
| 行数基线 | §附录 A4 的 `query_to_xml` 逐表计数，输出 `schema.table, count` | 同上 | 覆盖 34 张非空表 |
| 端点基线 | 每批主端点双身份响应快照（状态码 + 条数 + 关键金额） | 同上 | B1：登录/刷新/登出/权限解析/菜单 5 条；B5：三张报表金额 |
| 反向迁移 | 按 7.1.3 模板预生成、评审，**放在窗口目录，不提交仓库** | 同上 | 与正向迁移逐表一一对应 |

#### 7.1.1 急停：`NO FORCE`（T+0，秒级）

判定（任一命中，值班/发布负责人下令，无需再讨论）：

| 触发现象 | 阈值 |
|---|---|
| 登录 / 刷新 / 登出 5xx | 1 分钟内 > 5% 请求 |
| 菜单、字典、报表返回 0 行而快照基线 > 0 | 任一确认 |
| 写路径 SQLSTATE 42501 | 任一端点 |
| 看到其它租户行（越权） | 任一确认，同时按安全事件上报 |

动作（DBA 执行，单表优先，必要时整批）：

```sql
-- 单表急停
ALTER TABLE public.core_sessions NO FORCE ROW LEVEL SECURITY;

-- 整批急停（按批次表清单循环，仍只动 FORCE，不改策略）
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.core_sessions','public.core_refresh_tokens'] LOOP
    EXECUTE format('ALTER TABLE %s NO FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
```

- 时限：下令后 **5 分钟内**完成并回告；应用角色即表 owner，NO FORCE 立即恢复 owner 绕过，无需重启服务。
- 记录位置：窗口记录表登记"时间 / 表 / 执行人 / 触发指标 / 影响端点"。
- 后续：**30 分钟内**由后端负责人给出结论——"修代码后重开"或"转正式回滚（7.1.2/7.1.3）"；超时默认走正式回滚。

#### 7.1.2 单表策略回滚（T+30 分钟内）

判定：仅单表谓词写错（例如漏了全局只读策略、列侧 cast 未去），其它表验证通过。

动作（DBA 执行，后端负责人复核策略原文）：

```sql
BEGIN;
-- 从 w7_policies_before_<batch>.csv 取该表原策略原文，逐条重放；多策略表逐条 DROP，不要只删一条
DROP POLICY IF EXISTS <policyname> ON <schema>.<table>;
CREATE POLICY <policyname> ON <schema>.<table> FOR <cmd> TO <roles>
  USING (<qual>) WITH CHECK (<with_check>);
-- 该表原本未 FORCE 的，同步恢复
ALTER TABLE <schema>.<table> NO FORCE ROW LEVEL SECURITY;
-- 断言：策略数与 qual 文本与快照一致
SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname='<schema>' AND tablename='<table>';
COMMIT;
```

- 记录位置：同 7.1.1，附"回滚前后策略 diff"。
- 判定通过：该表端点恢复基线条数，且其它表不受影响。

#### 7.1.3 整批反向迁移（T+30 分钟内，任一"整批"条件触发）

判定：同批 ≥2 张表失败、或根因在共享代码路径（`Db::scope*`、中间件、系统通道），单表回滚无法收敛。

动作（DBA 执行，后端负责人逐步复核）：

1. 停批：不再执行该批剩余 DDL。
2. 按**与正向相反的顺序**执行预生成反向迁移（同一事务、同样断言）：
   ```sql
   BEGIN;
   -- 1) 逐表恢复原策略（来自快照）
   -- 2) 恢复原 FORCE/NO FORCE 状态
   -- 3) 断言：目标表白名单内策略数、qual 文本、relforcerowsecurity 与快照全等
   --    任一不等 → ROLLBACK 并升级为人工处置
   COMMIT;
   ```
3. 判定通过：`pg_policies` 与快照逐行相等、端点基线恢复、审计量恢复。
4. 判定失败（反向迁移自身出错）：**不做第二遍 DDL**，直接保留 NO FORCE 急停状态，按事故流程处理——此时策略仍在但 owner 绕过，业务可用，安全面回退到批前水平。

- 记录位置：窗口记录 + 事故单；写明"哪张表哪条断言失败"。

#### 7.1.4 复盘（T+1 天，后端负责人 + 质量负责人）

- 把触发指标、根因、回滚路径追加到本文档 §7 末尾的"窗口记录"（每批一节），并在下一批前置闸门中增加对应回归用例。
- 反向迁移与快照归档 30 天，禁止直接丢弃。

### 7.2 区分"被隔离拦了"与"本来没数据"（5 个手段，按成本排序）

1. **超级用户对照（最快，1 条 SQL）**
   ```sql
   -- 真实行数（xingzhai 是超级用户，绕过 RLS）
   SELECT count(*) FROM finance.core_finance_ledger;
   -- 应用视角（topems_prod + 租户上下文）
   BEGIN;
   SELECT set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true),
          set_config('app.rls_system','off',true);
   SELECT count(*) FROM finance.core_finance_ledger;
   ROLLBACK;
   ```
   两者之差 = 被策略拦掉的行数。差 = 0 且真实行数 = 0 → 本来没数据。

2. **看 RLS 过滤计数**
   ```sql
   EXPLAIN (ANALYZE, VERBOSE) SELECT * FROM <table> WHERE ...;
   -- 关注 "Rows Removed by Filter" 与实际 rows；策略谓词会出现在 Filter 中
   ```

3. **看上下文是否真的设上了**
   ```sql
   SELECT current_setting('app.tenant_id', true) AS tenant,
          current_setting('app.rls_system', true) AS sys;
   SELECT current_user, session_user;
   ```
   在应用连接里看不到值时，说明该路径是裸池或 public 路径。

4. **应用日志 + 计数**
   `scope*` 无上下文返回错误时打 `WARN rls_context_missing route=...`，并加 metric `rls_context_missing_total`。上线后该计数非 0 就是"路径没带上下文"，不是"数据没了"。

5. **逐表对账脚本**
   用 `pg_stat_user_tables` + `query_to_xml` 对 34 张有数据表生成"超级用户行数 / 租户行数 / 期望行数"三列，差异表直接定位。

### 7.3 判断口径

- 真实行数 > 0 且租户行数 = 0 → **被隔离拦了**（先查上下文是否设置，再查策略谓词）。
- 真实行数 = 0 → **本来没数据**。
- 真实行数 > 0、租户行数 > 0 但比业务预期少 → 该行属于其它租户或全局行，查 §6.3 登记规则。

---

## 8. 公司级隔离：不下沉到 RLS

**结论：W7 不把 `company_id` 写进 RLS，继续由应用层负责。**

理由（按权重）：
1. **覆盖不全**：只有 `finance.*` 与 `erp.consolidation_*` 有 `company_id`；其它 900+ 张租户表没有公司维度。下沉会造成"有的表按公司、有的表只按租户"的半吊子语义。
2. **P2a 已有 fail-closed 应用校验**：`ensure_company_scope` 在 ERP 合并相关写路径逐端点校验（[company_relations.rs#L184](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/company_relations.rs#L184) 等 5 处），无 scope 记录直接 403。
3. **普通 RLS 策略无法高效表达"用户可见公司集合"**：需要每行 `EXISTS (SELECT 1 FROM public.core_user_company_scopes ...)`，既放大扫描成本，又让策略依赖第二张表的 RLS 状态；一旦给 `core_user_company_scopes` 也开 RLS，容易递归。
4. **多公司用户是常态**：公司范围是"集合"，RLS 只能做行级布尔，表达集合需要额外的 GUC（如 `app.company_ids`），复杂度和绕过面都翻倍。

W7 只做一件事：把 `core_user_company_scopes` 补上 FORCE（现在未 FORCE，应用角色可完全绕过）。公司维度隔离的 RLS 化留到"全部业务表都有 `company_id` 且应用层校验被证明稳定"之后单独立项。

---

## 9. 性能影响

### 9.1 谓词与索引

- `current_setting(..., true)` 是 **STABLE** 函数，PostgreSQL 在执行器启动时求值一次，可以像参数一样参与索引条件。因此 `tenant_id = (NULLIF(current_setting(...), ''))::uuid` **可以使用 `tenant_id` 上的 B-tree 索引**。
- 但 **302 张表的现有策略写成 `(tenant_id)::text = ...`**，列侧被 cast，索引完全失效。B1–B7 的迁移必须统一改成列侧裸比较（裁决 6）；这是本次改造顺带修掉的主要性能债。
- `OR app.rls_system='on'` 分支可能让规划器放弃索引（OR 条件 + 非常量）。当前生产最大表 452 行，可接受。**已拍定（裁决 5）：不建 `BYPASSRLS` 角色**，系统通道继续用 `app.rls_system` GUC + 仅 `SET LOCAL`；短期以"每表 `(tenant_id, ...)` 前导索引 + 当前数据量"兜底，数据量增长后按 §9.2 补索引，不通过放宽谓词解决。

### 9.2 索引缺口（2026-11-09 生产复核）

- 936 张租户链表中，**299 张有 tenant 前导索引，637 张没有**；**631 张连"tenant 列出现在任意位置"的索引都没有**。
- **"62 张有数据且缺 tenant 前导索引"无法复现**。实测：非空租户表 34 张，其中缺 tenant 前导索引的是 **11 张**（且 11 张全部已启用 RLS）；换成"缺任何 tenant 列索引"口径，仍是这 11 张。若 62 来自其他口径（例如把 302 张 `(tenant_id)::text` 失效表也算入），需要提供取数 SQL 再对齐——按现有三种口径都得不到 62。
- 有数据且缺索引的 11 张（行数为复核值；全部 `CREATE INDEX CONCURRENTLY`，不得放事务里）：

| 表 | 行数 | 建议索引定义 | 说明 |
|---|---|---|---|
| `public.core_dict_items` | 397 | `CREATE INDEX CONCURRENTLY idx_core_dict_items_tenant_type ON public.core_dict_items (tenant_id, dict_type_id, sort_order);` | 迁 NULL 后全局行读；按字典类型取项是热路径 |
| `public.core_dict_types` | 77 | `CREATE INDEX CONCURRENTLY idx_core_dict_types_tenant_code ON public.core_dict_types (tenant_id, code);` | 同上 |
| `public.core_sessions` | 50 | `CREATE INDEX CONCURRENTLY idx_core_sessions_tenant_token ON public.core_sessions (tenant_id, token_hash);` + `CREATE INDEX CONCURRENTLY idx_core_sessions_expires ON public.core_sessions (expires_at);` | 裁决 1 后只走系统通道，热路径是 token 查与过期清理；tenant 前导索引服务于租户审计/列表 |
| `public.core_refresh_tokens` | 50 | `CREATE INDEX CONCURRENTLY idx_core_refresh_tokens_tenant_token ON public.core_refresh_tokens (tenant_id, token_hash);` + `..._expires ON public.core_refresh_tokens (expires_at);` | 同上 |
| `finance.core_finance_report_line_map` | 48 | `CREATE INDEX CONCURRENTLY idx_fin_report_line_map_tenant_type ON finance.core_finance_report_line_map (tenant_id, report_type, sort_no);` | 48 行全 NULL；P3 三张报表按报表类型取行 |
| `public.core_faqs` | 12 | `CREATE INDEX CONCURRENTLY idx_core_faqs_tenant_cat ON public.core_faqs (tenant_id, category, sort_order);` | 全局 nil 行 |
| `public.core_guides` | 12 | `CREATE INDEX CONCURRENTLY idx_core_guides_tenant_cat ON public.core_guides (tenant_id, category, sort_order);` | 全局 nil 行 |
| `hrm.departments` | 1 | `CREATE INDEX CONCURRENTLY idx_hrm_departments_tenant_parent ON hrm.departments (tenant_id, parent_id);` | 组织树递归 |
| `mobile.sync_policies` | 1 | `CREATE INDEX CONCURRENTLY idx_mobile_sync_policies_tenant_user ON mobile.sync_policies (tenant_id, user_id);` | 1 行 NULL 全局默认策略 |
| `bi.reports` | 1 | `CREATE INDEX CONCURRENTLY idx_bi_reports_tenant_status ON bi.reports (tenant_id, status, created_at DESC);` | 列表按状态 + 时间 |
| `public.core_tenants` | 1 | `CREATE INDEX CONCURRENTLY idx_core_tenants_tenant ON public.core_tenants (tenant_id);` | 行数 1，索引主要为零成本一致性；实际按 `code` 查已有唯一索引 |

- 其余 **626 张空表不预建索引**，避免无意义写放大；B1 的菜单/字典在数据迁 NULL 后仍靠上面两个 `(tenant_id, ...)` 索引支撑，不加部分索引。
- **302 张表的 `(tenant_id)::text` 必须随批次去掉**（B1 起）；这部分不是"补索引"而是"让现有索引重新可用"，与上面 11 张是两个独立缺口。

### 9.3 FORCE 的代价

- FORCE 只影响 owner（`topems_prod`）；代价是每条语句多一次策略谓词求值（微秒级）和规划期多一个 qual。
- 真正的代价在"策略无索引可用时退化为 Seq Scan"：902 张空表无影响；34 张有数据表在补索引后无影响。
- 反过来，**不 FORCE 的代价是策略完全失效**（owner 绕过），这不是性能问题是安全问题。

---

## 10. 分批开启清单（按可执行顺序展开）

### B1 系统/认证边界（12 张，1,388 行）

| 表 | 行数 | RLS/FORCE | 策略数 | 当前策略形态 | 需要全局只读 | B1 动作 |
|---|---|---|---|---|---|---|
| `public.core_sessions` | 50 | t / **f** | 1 | `tenant_id = COALESCE(GUC,'...0001')` | 否 | 只走系统通道（裁决 1）+ 补 FORCE |
| `public.core_refresh_tokens` | 50 | t / **f** | 1 | 同上 | 否 | 同上 |
| `public.core_menus` | 452 | t / t | 2 | `rls_menu_global_visible`（nil OR 租户）+ `tenant_isolation_core_menus`（列侧 cast） | **是** | 452 行 `...0001` 迁 NULL → 独立 SELECT 只读策略；写走系统通道；删 cast 旧策略 |
| `public.core_menu_groups` | 130 | t / t | 3 | `rls_menu_global_visible` + `rls_tenant_isolation`（nil 全量）+ 列侧 cast 策略 | **是** | 同菜单；两条旧 permissive 必须 DROP，不能只改一条 |
| `public.core_tenants` | 1 | t / t | 1 | nil 全量 + `tenant_id IS NULL` | **是** | 1 行 NULL 全局读；写走系统通道 |
| `public.core_roles` | 16 | t / t | 1 | `IS NULL` / `=''` / 列侧 cast / `tenant_id IS NULL` | **是** | 15 行 nil 系统角色全局读；写走系统通道 |
| `public.core_dict_types` | 77 | t / t | 1 | 已是 `rls_system OR 租户`，但**不含 NULL 分支** | **是** | 77 行 `...0001` 迁 NULL + 加独立只读策略 |
| `public.core_dict_items` | 397 | t / t | 1 | 同上 | **是** | 397 行 `...0001` 迁 NULL + 加独立只读策略 |
| `public.audit_logs` | 147 | t / t | 1 | 已是 `rls_system OR 租户`（66 nil + 81 `...0001`） | 否 | 保持单策略；写入只允许本租户或系统通道 |
| `public.core_login_logs` | 63 | t / t | 2 | nil 全量 + 租户策略（列侧 cast，**无 WITH CHECK**） | 否 | 登录写入走系统通道；读仅本租户；删旧策略 |
| `public.core_tenant_settings` | 4 | t / t | 1 | nil 全量 + `tenant_id IS NULL` | 否 | 收紧为本租户（无全局行） |
| `public.core_user_company_scopes` | 1 | t / **f** | 1 | 租户匹配 + `tenant_id IS NULL` + GUC=nil | 否 | 补 FORCE + 收紧为本租户 |

- **需要全局只读策略的 6 张**：`core_roles`、`core_tenants`、`core_menus`、`core_menu_groups`、`core_dict_types`、`core_dict_items`；其中后 4 张现存行是 `...0001`，必须先迁 NULL（数据迁移，本阶段不执行）。
- **需要补 FORCE 的 3 张**：`core_sessions`、`core_refresh_tokens`、`core_user_company_scopes`（当前 owner 可完全绕过）。
- **一表多策略的 2 张**（`core_menus` 2 条、`core_menu_groups` 3 条）必须收敛为"一条通用策略 + 可选一条只读策略"，permissive 是 OR 关系，留着旧条目等于没收紧。
- 验证：登录 → 刷新 → 登出 → 权限解析（16 个角色齐全，15 个 nil 系统角色可见）→ 菜单树（452 条）→ 字典（77 + 397）→ 审计写入（147 基线不回退）；普通用户与超管各一遍。
- 失败判定：登录失败、菜单/字典少行、系统角色不可见、审计量下降、写路径 42501。

### B2 零裸池模块（108 张：pm 38 / mobile 27 / integration 18 / gis 15 / ai 10）

- 动作：A 类去豁免改 fail-closed；C 类从 allow_all 改为租户策略；D 类（无）补策略。
- 验证：每模块 2 个读端点 + 1 个写端点，双身份；`ai.ai_models` 与 `ai` 全局行按 §6.3 校验。
- 失败判定：写 42501；`ai_models` 全局 4 行不可见。

### B3 空表复杂域（145 张：ehs 70 / lims 45 / qms 30）

- 动作：同 B2；ehs 的 31 张 D 类表首次启用 RLS（ENABLE + FORCE + 策略），5 张 NO FORCE 表同步补 FORCE；`lims.qa_lims_analytes` 补 FORCE。
- 验证：全部空表结构断言 + 每模块冒烟；`mes.work_orders` 不在本批。
- 失败判定：任何 5xx（空表也应有正常空响应，不应报错）。

### B4 制造/仓储/供应链（159 张：wms 37 / mes 31 / scm 31 / srm 20 / crm 20 / pdm 20）

- 动作：同 B2；`mes.process_flow_steps`、`rs.formulas` 的 `allow_all` 与 GUC 并存 → 收敛为单条（B 类三张表全部消灭）；`mes.work_orders` 补 FORCE。
- 验证：mes 裸池 567 的清零证据 + 关键读写端点；wms/scm/srm/crm/pdm 冒烟。
- 失败判定：mes 任一端点 0 行（曾实测 kanban 22→0，作为回归用例保留）。

### B5 财务（104 张）

- 动作：同 B2；`finance.core_finance_currencies` 首次启用 RLS（8 行 NULL 全局只读）；`core_finance_report_line_map`、`accounts`、`ledger`、`vouchers`、`periods` 按租户收紧；C 类 18 张（含 `voucher_lines` 的 allow_all）收敛。
- 验证：科目余额表 / 资产负债表 / 利润表生成（金额与基线完全一致）、凭证创建→过账→查询、409 不平校验保持。
- 失败判定：报表金额变化（除跨租户行消失）、币种目录缺 8 行、凭证写 42501。
- **前置：必须等另一路会话的 finance 改动落地后重新取证，表数与裸池数可能变化。**

### B6 核心与残余（364 张：public 剩余 101 / master_data 85 / iam 15 / hrm 31 / erp 30 / flow 20 等；iam 44 张已拆到 B7）

- 动作：同 B2；`iam` 仅 15 张 A 类随本批收紧（44 张 D 类留 B7），`iam.users`（无 tenant_id）不处理；`master_data` 85 张 A 类统一收紧；`portal` 2 A + 1 C。
- 验证：IAM 全部管理端点、master-data 主数据 CRUD、portal 聚合读（service token 走系统通道）。
- 失败判定：service-to-service 调用被拦（说明系统通道没生效）。

### B7 iam 独立批（44 张，排最后）

- 表集：`iam` D 类 44 张（有租户列但完全没有策略/未启用 RLS）。按裁决 4 不并入 B1–B6。
- 动作：先确认每张表是否真属租户数据；确属的补 ENABLE + FORCE + 租户策略，无租户语义的（如 `iam.users`）登记进 E 类白名单，不强行加 `tenant_id`。
- 验证：iam 管理端点双身份（平台管理员 / 租户管理员）、跨租户不可见、service token 走系统通道。
- 失败判定：任一管理端点出现跨租户可见，或 service 调用 42501。

每批之间**独立提交、独立窗口、独立回滚快照**；不做跨批灰度。

---

## 11. 门禁改造（必须与 B1 同批生效）

[check-rls-policy-shape.sh](file:///Users/air/TOPEMS/scripts/ci/check-rls-policy-shape.sh) 当前只拦 `IS NULL`、`current_setting = ''`、硬编码 0001、缺 FORCE。需新增：

1. 禁止策略谓词出现 `= '00000000-0000-0000-0000-000000000000'`（nil 全量分支）；
2. 禁止列侧 cast：`\(tenant_id\)::text` / `(tenant_uid)::text`；
3. 要求每条租户策略同时含 `app.rls_system` 与 `app.tenant_id`；
4. 一表只允许一条 FOR ALL 策略（或 SELECT + ALL 两条的显式登记形态）；
5. 全局表清单双向校验（库 ↔ 仓库清单，双向差集必须为空）；
6. 活库断言增加：未 FORCE 的租户链表数必须为 0；`USING(true)` 表数必须等于清单长度。

---

## 12. 已拍定的裁决（2026-11-09，6 条）

> 本节原为"待拍板分歧点"，已全部拍定。以下为最终口径，不再保留备选项；后续如需改动按新裁决追加。

| # | 裁决 | 落地要点 | 前置 / 影响 |
|---|---|---|---|
| 1 | **会话表只走系统通道** | `core_sessions`、`core_refresh_tokens` 仅允许 `Db::scope_system*` + `SET LOCAL app.rls_system='on'`，且每次进入通道写审计；策略不再 `USING(true)`，不再 `COALESCE(...,'...0001')` | unified-core 登录/刷新/登出 3 个端点在 B1 前改完；漏设通道会 401/500（响亮失败），符合目标 |
| 2 | **nil/NULL 全局行：全租户只读、禁止写** | 用独立 `FOR SELECT` 策略表达，不散回各表通用谓词（§4.3）；登记表见 §6.3；写仍限本租户或系统通道 | `finance.core_finance_report_line_map` 48 行全 NULL 是硬约束——不登记则 P3 资产负债表/利润表全空；B1 需把 `core_menus`(452)、`core_menu_groups`(130)、`core_dict_*`(77+397) 的 `...0001` 行迁 NULL |
| 3 | **`Db::scope*` 无上下文直接报错** | 返回 500 + 明确错误信息，**不返回空结果**；禁止静默执行注定 0 行的 SQL | 后台任务必须同批改用 `scope_*_system()` 或按租户遍历；实现口径见 §5.2 |
| 4 | **iam 44 张不入本批** | 单列 **B7**，排在 B1–B6 全部之后；`iam` 其余 15 张 A 类仍随 B6 | B6 表数由 408 调整为 **364**；iam 服务重构与本批解耦 |
| 5 | **系统通道用 GUC + 仅 `SET LOCAL`，不建 `BYPASSRLS` 角色** | 所有 setter 只允许事务级 `set_config(..., true)`；会话级 setter（`rls.rs`、`tenant.rs`、`unified-core/tenant_rls.rs`）在 B1 移除；不新增连接/池 | OR 分支的索引代价用 §9.2 索引 + 当前数据量兜底；安全边界等价于"已有数据库写权限"，用审计补偿 |
| 6 | **去 `(tenant_id)::text`，并补 tenant 前导索引** | 302 张表的列侧 cast 随批次去掉；先补**有数据的 11 张**（§9.2 已给 DDL）；626 张空表不预建，避免写放大 | 去 cast 与补索引是两个独立缺口，不能只做其一；`CREATE INDEX CONCURRENTLY` 不进事务 |

---

## 13. 明确不做的事

- 不改任何 `database/migrations/` 历史文件，不动 `checksums.txt`。
- 不新增 `tenant_id` 到 E 类 415 张表。
- 不把公司维度写进 RLS。
- 不引入运行时 RLS 总开关（如 `app.rls_disable`）。
- 不使用 `DEFAULT_TENANT_ID` 作为生产过渡手段（生产未配置；一旦配置就把所有裸池查询钉死在 0001，等于用隐式默认值掩盖问题）。
- 不依赖 `resolve_create_tenant` 落 NULL 行后再靠"全局 NULL 可读"兜底，写入侧需要单独复核。

---

## 13.1 谓词判据：区分「函数参数 cast」与「列侧 cast」（2026-11-10 固化）

`pg_policies.qual` / `pg_get_expr(polqual, polrelid)` 是**反解析文本**，里面的 `::text` 有两种来源，判据必须分开，否则每批验证都会误报：

| 形态 | 例子 | 结论 |
|---|---|---|
| 函数参数 cast | `current_setting('app.tenant_id'::text, true)` | **合法，且必须存在**。`current_setting` 首参是 `text`，解析器补的 cast |
| 列侧 cast | `(tenant_id)::text = …` 或 `tenant_id::text` | **fail-open 隐患**，禁止。列转文本比较会绕过索引与 NULL 语义 |

因此：
- 静态门禁与验证脚本的判据是 `LIKE '%(tenant_id)::text%'`（带括号的列引用），**不是** `LIKE '%::text%'`；
- 同时**反向断言**「函数参数 cast 存在」（`LIKE '%current_setting(''app.tenant_id''::text%'`），防止有人为了过门禁把谓词改成非标准写法；
- B4 预演首轮就是这么误报的：把 `::text` 一律当 fail-open，21 条合法新策略全被标红。`scripts/ops/w7_b4_verify.sql` 的 A2 段已按上表实现，`scripts/ops/w7_b5_verify.sql` 的 `(tenant_id)::text` 判据同为正确形态。

---

## 附录 A：取证 SQL（只读，可复跑）

```sql
-- A1 总量
SELECT count(*) FILTER (WHERE c.relrowsecurity) AS rls,
       count(*) FILTER (WHERE c.relforcerowsecurity) AS forced
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema');

-- A2 策略形态
SELECT count(*) total,
       count(*) FILTER (WHERE polpermissive=false) restrictive,
       count(*) FILTER (WHERE pg_get_expr(polqual,polrelid)='true') using_true,
       count(*) FILTER (WHERE pg_get_expr(polqual,polrelid) LIKE '%current_setting%') guc,
       count(*) FILTER (WHERE pg_get_expr(polqual,polrelid) LIKE '%rls_system%') sys,
       count(*) FILTER (WHERE pg_get_expr(polqual,polrelid) LIKE '%00000000-0000-0000-0000-000000000000%') nil,
       count(*) FILTER (WHERE pg_get_expr(polqual,polrelid) LIKE '%IS NULL%') isnull,
       count(*) FILTER (WHERE pg_get_expr(polqual,polrelid) LIKE '%00000000-0000-0000-0000-000000000001%') t1
FROM pg_policy;

-- A3 未 FORCE
SELECT n.nspname||'.'||c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND c.relrowsecurity AND NOT c.relforcerowsecurity
  AND n.nspname NOT IN ('pg_catalog','information_schema');

-- A4 有数据且缺 tenant 前导索引（返回 §9.2 的 11 张；把 cnt>0 去掉即 637 张全量缺口）
WITH t AS (
  SELECT n.nspname sch, c.relname tbl, c.oid,
         (xpath('/row/c/text()', query_to_xml(
           format('SELECT count(*) c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint cnt
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema')
), x AS (
  SELECT t.*,
    EXISTS (SELECT 1 FROM pg_index i JOIN pg_attribute a
            ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
            WHERE i.indrelid=t.oid AND a.attname IN ('tenant_id','tenant_uid')) lead
  FROM t
  WHERE EXISTS (SELECT 1 FROM information_schema.columns col
                WHERE col.table_schema=t.sch AND col.table_name=t.tbl
                  AND col.column_name IN ('tenant_id','tenant_uid'))
)
SELECT sch||'.'||tbl AS table, cnt FROM x WHERE cnt>0 AND NOT lead ORDER BY cnt DESC;

-- A5 隔离对照
BEGIN;
SELECT set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true),
       set_config('app.rls_system','off',true);
SELECT count(*) FROM finance.core_finance_accounts;   -- 应用视角
ROLLBACK;
SELECT count(*) FROM finance.core_finance_accounts;   -- 超级用户视角
```

## 附录 B：本批取证的边界声明

- 生产库全程只读：仅 `SELECT`、系统目录、`query_to_xml` 行数统计；无 DDL、无 DML、无 `SET` 持久化、无服务重启。
- **2026-11-09 第二轮复核**：只读连接生产 `topems_prod` 重取基线（1351 表 / 871 RLS / 861 FORCE / 1067 策略 / 936 租户链表）、B1 12 张策略原文与行数分布、索引缺口（637 张缺前导索引 / 11 张有数据）。结论与初版一致，仅行数从 31 张 / 925 行更新为 34 张 / 1,546 行。
- 未修改任何仓库文件，仅更新本设计文档；**未生成迁移、未改代码、未提交、未部署**。
- `svc/finance`、`svc/erp` 正由另一路会话修改；本文涉及的这两个模块的裸池数、`Db` 注入状态在实施前必须重新取证（当前 finance 603 / erp 2 可能已变化）。

---

## 附录 C：B1 12 张表当前策略原文（生产 `topems_prod`，2026-11-09）

> 格式：`表 | 策略名 | FORCE | 命令 | USING / WITH CHECK`。`t/f` 为 `relrowsecurity/relforcerowsecurity`。16 条策略全部 permissive。

```text
public.audit_logs | rls_tenant_isolation | t | ALL
  USING: (COALESCE(current_setting('app.rls_system',true),'')='on') OR tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
  CHECK: 同 USING

public.core_dict_items | rls_tenant_isolation | t | ALL
  USING: (COALESCE(current_setting('app.rls_system',true),'')='on') OR tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
  CHECK: 同 USING

public.core_dict_types | rls_tenant_isolation | t | ALL
  USING: 同 core_dict_items
  CHECK: 同 USING

public.core_login_logs | rls_tenant_isolation | t | ALL
  USING: current_setting('app.tenant_id',true) IS NULL
      OR current_setting('app.tenant_id',true)=''
      OR current_setting('app.tenant_id',true)='00000000-0000-0000-0000-000000000000'
      OR tenant_id IS NULL
      OR tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
  CHECK: 同 USING

public.core_login_logs | tenant_isolation_core_login_logs | t | ALL
  USING: current_setting('app.tenant_id',true) IS NULL
      OR current_setting('app.tenant_id',true)=''
      OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id',true),''))
      OR tenant_id IS NULL
  CHECK: 无（仅 USING）

public.core_menu_groups | rls_menu_global_visible | t | ALL
  USING: tenant_id='00000000-0000-0000-0000-000000000000'::uuid
      OR tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
  CHECK: 同 USING

public.core_menu_groups | rls_tenant_isolation | t | ALL
  USING: 同 core_login_logs.rls_tenant_isolation（含 nil 全量 + IS NULL）
  CHECK: 同 USING

public.core_menu_groups | tenant_isolation_core_menu_groups | t | ALL
  USING: IS NULL / ='' / (tenant_id)::text 比较 / tenant_id IS NULL
  CHECK: 无

public.core_menus | rls_menu_global_visible | t | ALL
  USING: tenant_id='…000000'::uuid OR tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
  CHECK: 同 USING

public.core_menus | tenant_isolation_core_menus | t | ALL
  USING: IS NULL / ='' / (tenant_id)::text 比较 / tenant_id IS NULL
  CHECK: 无

public.core_refresh_tokens | core_refresh_tokens_tenant_isolation | f | ALL
  USING: tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id',true),''))::uuid,
                              '00000000-0000-0000-0000-000000000001'::uuid)
  CHECK: 无

public.core_roles | tenant_isolation_core_roles | t | ALL
  USING: IS NULL / ='' / (tenant_id)::text 比较 / tenant_id IS NULL
  CHECK: 无

public.core_sessions | core_sessions_tenant_isolation | f | ALL
  USING: tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id',true),''))::uuid,
                              '00000000-0000-0000-0000-000000000001'::uuid)
  CHECK: 无

public.core_tenant_settings | tenant_isolation_core_tenant_settings | t | ALL
  USING: IS NULL / ='' / tenant_id=(…)::uuid / tenant_id IS NULL
      OR NULLIF(current_setting('app.tenant_id',true),'')='00000000-0000-0000-0000-000000000000'
  CHECK: 无

public.core_tenants | rls_tenant_isolation | t | ALL
  USING: IS NULL / ='' / ='00000000-0000-0000-0000-000000000000' / tenant_id IS NULL
      OR tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
  CHECK: 同 USING

public.core_user_company_scopes | core_user_company_scopes_tenant_policy | f | ALL
  USING: tenant_id=(NULLIF(current_setting('app.tenant_id',true),''))::uuid
      OR tenant_id IS NULL
      OR COALESCE(current_setting('app.tenant_id',true),'')='00000000-0000-0000-0000-000000000000'
  CHECK: 无
```

**读法**：① 只有 `audit_logs`、`core_dict_items/types` 是目标形态（`rls_system` OR 租户），但它们不含 NULL 行分支；② `core_refresh_tokens`/`core_sessions` 未 FORCE 且默认值钉死 `...0001`，必须按裁决 1 改系统通道；③ `core_menus`/`core_menu_groups`/`core_roles`/`core_login_logs`/`core_tenants`/`core_tenant_settings`/`core_user_company_scopes` 仍带"未设即豁免 / nil 全量 / 列侧 cast"三类 fail-open 形态，其中 `core_menus`(2 条)、`core_menu_groups`(3 条)、`core_login_logs`(2 条) 是多策略，permissive 取 OR 后比单条更宽；④ 完全没有 `WITH CHECK` 的 5 张：`core_roles`、`core_tenant_settings`、`core_sessions`、`core_refresh_tokens`、`core_user_company_scopes`，写侧目前只靠 USING 兜底。
