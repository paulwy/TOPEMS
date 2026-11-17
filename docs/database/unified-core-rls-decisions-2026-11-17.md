# unified-core 租户隔离待决事项决策文档（2026-11-17）

> 状态：**部分已拍板**（2026-11-17，见 §6「待决项收口」）；§2 中 R1–R9 未列入 §6 的事项仍为待决。
> 本文只汇集事实、可选改法与验证判据；§6 为拍板结论，与前文"建议方向"冲突处以 §6 为准。
> 证据基线：分支 `main`（HEAD 含 `be9f36ad0` / `f3eb89196` / `85224ec12`）；数据库证据取自克隆库 `m2_dryrun_20261116`（与生产同源，2026-11-17 查询）。
> 相关文档：`docs/database/scope-with-plan-20261116.md`、`docs/database/zero-tenant-inventory-2026-11-16.md`、`docs/database/rls-live-coverage.md`。

## 0. 结论速览

| 编号 | 事项 | 建议方向 | 窗口约束 |
|---|---|---|---|
| R1 | flow 四张无 RLS 表（rules / variables / variable_history / delegates） | 加表级 RLS（B 范式）+ 代码改请求事务 | 与 R2、R5、R6 同窗口 |
| R2 | flow 三张策略在 GUC 空/NULL 时放行 | 收紧为严格 B 范式 | 必须与 R1/R5/R6 的代码迁移同窗口 |
| R3 | monitor_settings / search_logs / alerts / alert_rules 策略缺口 | 分表处理，`alert_rules` 需先定语义 | 可与 R1/R2 同批，也可独立 |
| R4 | 平台语料归一（迁移 `20261117120000`） | 按现有迁移 + 读取端同窗口推进 | 独立窗口（迁移与代码必须同窗口） |
| R5 | statistics 12 处全局 COUNT | 改为租户内统计（或显式系统通道） | 依赖 R2 的收紧批次 |
| R6 | `TenantScope` 系统通道语义 | 三选一（见 R6） | 决策后决定 R1/R2/R9 的改法 |
| R7 | D-01 批量任务写 | 真实 SQL 错误改为整体非 2xx | 独立 |
| R8 | D-02 / D-03 端点不可用 | 纯代码修复，优先级最高 | 独立，可立即做 |
| R9 | `list_instances` 4 处 | 随 R6 决策 | 与 R1/R2 同窗口 |

**已拍板收口（2026-11-17，详见 §6）**：analytics `list_datasets` 的 `is_public` 不恢复跨租户可见；`list_files` 超管保持 `TenantScope::from_claims`；跨租户读取只保留「平台语料（全零租户）」与「显式系统通道（需 GUC）」两个入口，业务可见性一律在查询层用显式谓词表达。

---

## 1. 事实基线

### 1.1 两种执行模型

- **请求事务**：`tenant_middleware` 注入 `RlsTxnCell`，handler 用 `scope_with(txn)` 取 `ScopedTxn`，事务内 `SET LOCAL app.tenant_id`；2xx 提交、非 2xx 回滚。RLS 在此上下文真正生效。
- **池直连**：`state.pool` 取池连接，无 `app.tenant_id`。对 `rls_tenant_isolation` 的宽松文本，GUC 为空即放行全部行，因此池直连等价于跨租户。

### 1.2 目录证据（克隆库实测）

| 表 | RLS / FORCE | 策略 | 租户列 | 行数 / NULL 租户 |
|---|---|---|---|---|
| `public.core_flow_rules` | f / f | 无 | uuid 可空 | 0 / 0 |
| `public.core_flow_variables` | f / f | 无 | uuid 可空 | 0 / 0 |
| `public.core_flow_variable_history` | f / f | 无 | uuid 可空 | 0 / 0 |
| `public.core_flow_delegates` | f / f | 无 | uuid 可空 | 0 / 0 |
| `public.core_workflows` | t / t | `rls_tenant_isolation(ALL)` | uuid 可空 | — |
| `public.core_workflow_versions` | t / t | `rls_tenant_isolation(ALL)` | uuid 可空 | — |
| `public.core_workflow_instances` | t / t | `rls_tenant_isolation(ALL)` | uuid 可空 | — |
| `public.monitor_settings` | t / t | `rls_tenant_isolation(ALL)`，同为宽松文本 | uuid 可空 | 0 / 0 |
| `public.search_logs` | f / f | 无 | uuid 可空 | 0 / 0 |
| `public.alerts` | t / t | `public_allow_all_alerts(ALL)`，`qual=true`、`with_check=true` | uuid NOT NULL | 0 / 0 |
| `public.alert_rules` | t / t | `public_allow_all_alert_rules(ALL)`，`qual=true`、`with_check=true` | **无 tenant_id 列** | 0 |

`rls_tenant_isolation` 现行文本（三张 flow 表与 `monitor_settings` 相同）：

```sql
current_setting('app.tenant_id', true) IS NULL
OR current_setting('app.tenant_id', true) = ''
OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
OR tenant_id IS NULL
OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
```

即四个放行分支：GUC 未设置、GUC 空串、GUC 为全零、行 `tenant_id IS NULL`。`core_workflows` 额外带同名 `with_check`，其余表只有 `USING`（PG 对 INSERT 复用 `USING` 作检查）。

### 1.3 代码侧池直连清单（flow 模块）

| 文件 | `state.pool` 处数 | handler 数 | 是否已有租户谓词 | 备注 |
|---|---|---|---|---|
| `rule.rs` | 10 | 12 | 否（全文无 `tenant_id`） | 无 RLS 表 |
| `variable.rs` | 11 | 11 | 否 | 无 RLS 表，含 variable_history 写 |
| `delegate.rs` | 11 | 13 | 否 | 无 RLS 表 |
| `statistics.rs` | 11 | 1 | 否 | 11 条查询、12 处统计口径、无 `Claims` 入参 |
| `instance.rs` | 6 | 13 | 是（`TenantScope::from_claims`，`list_instances` 4 处） | 见 R9 |
| `monitor.rs` | 66 | 12+ | 是（`sql_predicate` + `bind_tenant_scope`） | 见 R6 |
| `approval.rs` / `task.rs` / `workflow.rs` / `category.rs` | 0 | — | — | 已迁完 |

---

## 2. 分项

### R1 flow 四张无 RLS 表

**事实**

- `core_flow_rules`、`core_flow_variables`、`core_flow_variable_history`、`core_flow_delegates` 均 `relrowsecurity=false`、`relforcerowsecurity=false`、无任何 policy。
- 四个模块（`rule.rs` 10 处、`variable.rs` 11 处、`delegate.rs` 11 处）全部池直连且**没有任何租户谓词**，因此当前任何请求都能读写全部租户数据；`tenant_id` 列存在但从未被写入/过滤（代码 0 引用）。
- 克隆库四表均为 0 行，回填成本为零，但“历史 NULL 行如何归属”没有样本可参考。

**可选改法**

| 方案 | 内容 | 代价 | 风险 |
|---|---|---|---|
| A（推荐） | 一份迁移给四表加 `rls_tenant_isolation`（严格 B 范式，见 R2 的目标文本）+ 代码改请求事务，写入时显式落 `tenant_id` | 一个迁移 + 32 处代码改造 + 端点回归 | 中：跨租户可见变为 404/空列表，属预期收紧 |
| A1 | 在 A 基础上把 `tenant_id` 改 `NOT NULL`（先回填，0 行） | 迁移多一步 | 低；但若有外部写入方依赖 NULL 会失败 |
| B | 只加代码谓词、不加 RLS | 代码量相近 | 高：任何新 SQL 漏写谓词即泄漏，且策略/代码不一致 |
| C | 挂起 | 无 | 泄漏面持续存在 |

**影响面**

- 端点：`/flow/rules*`（12 个）、`/flow/variables*`（11 个）、`/flow/delegates*`（13 个）。
- 角色：普通租户由“可见全部”收紧为“仅本租户”；超管/服务令牌若依赖全量视图，需要按 R6 走系统通道或 400。
- 对外结果：列表条数、详情命中、批量更新命中数会变化（跨租户数据消失），属预期。

**验证判据**

1. 迁移后四表 `relrowsecurity=true`、`relforcerowsecurity=true`、各 1 条 `rls_tenant_isolation`。
2. 受限角色在 `app.tenant_id` 为空串时四表均 0 行；A/B 上下文互相 0 行。
3. 端点 A/B 前后：A 租户列表不再含 B 数据；自身增删改查 200 不变。
4. fixture 删净、临时 GRANT 已回收。

---

### R2 flow 三张策略在 GUC 空/NULL 时放行

**事实**

- 策略文本见 1.2，含四个放行分支。池直连（GUC 空）即全放行，这正是本轮 approval/workflow/task/category 改造前跨租户可见的根因。
- 即使代码全部改请求事务，`tenant_id IS NULL` 分支仍会放行历史 NULL 行；GUC=`00000000-…` 分支会让平台租户看到全部行。
- `core_workflows` 的 `with_check` 与 `USING` 同文本，写入同样放行。

**可选改法**

| 方案 | 内容 | 代价 |
|---|---|---|
| A（推荐） | 收紧为 `tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid`，移除 GUC 未设置 / 空串 / 全零 / `tenant_id IS NULL` 四个分支（NULL 行自然不再匹配）。系统通道改由独立函数/角色承载（见 R6） | 一份迁移；必须同时完成全部 flow 代码迁移（R1/R5/R9/R6） |
| B | 保留文本，靠代码谓词兜底 | 无迁移，但池直连仍可绕过，且无法防新代码 |
| C | 先只删“GUC 为空/空串”两个分支，保留全零与 NULL | 迁移更小，但平台租户/NULL 行仍泄漏，属于中间态 |

**影响面**

- 收紧后**任何仍走 `state.pool` 的 flow 查询都会返回 0 行**：涉及 `monitor.rs`（66 处）、`instance.rs`（6 处）、`statistics.rs`（11 处）、`rule/variable/delegate`（32 处）。这是硬耦合，见第 3 节。
- 超管跨租户列表视图消失；需要显式系统通道接口承载。
- 对外结果：空列表/404 明显增加，属预期收紧。

**验证判据**

1. `pg_policies.qual` 不再含 `IS NULL` / `= ''` / 全零分支。
2. `SET app.tenant_id = ''` 与 `SET app.tenant_id = 全零` 下三表均 0 行。
3. 普通租户 A/B 互不可见；写入 B 租户行被 `WITH CHECK` 拒绝。
4. 全量端点回归（flow 全部）无 500。

---

### R3 monitor / search / alerts 策略缺口

**事实**

- `public.monitor_settings`：RLS/FR 已开，策略文本与 R2 相同（宽松），`tenant_id` 可空，0 行；unified-core 当前无 SQL 引用。
- `public.search_logs`：**无 RLS、无策略**，`tenant_id` 可空，0 行；unified-core 无引用。
- `public.alerts`：RLS/FR 已开，`public_allow_all_alerts` 为 `ALL … true / true`，`tenant_id NOT NULL`，0 行；unified-core 无引用（仅 WS 频道名 `alerts`）。
- `public.alert_rules`：RLS/FR 已开，`public_allow_all_alert_rules` 为 `ALL … true / true`，**没有 `tenant_id` 列**，0 行。

**可选改法**

| 表 | 建议 | 代价 | 备注 |
|---|---|---|---|
| `monitor_settings` | 随 R2 一并换成严格 B 范式 | 迁移内一句 | 必须先确认无外部写入方依赖 NULL 租户 |
| `search_logs` | A：加 RLS + `rls_tenant_isolation`；B：明确为审计表，仅服务端写、按系统通道读 | 一份迁移 | 需产品确认该表是否仍需保留 |
| `alerts` | 直接把 `public_allow_all_alerts` 换成严格 B 范式（`tenant_id NOT NULL` 已满足） | 迁移内一句 | 若存在跨租户运维告警，需先加系统通道 |
| `alert_rules` | A：新增 `tenant_id uuid` 并租户化；B：定位为平台全局规则，策略收紧为“仅服务端可写、所有租户只读” | A 需 DDL + 语义确认；B 只改策略 | 无 `tenant_id` 时不能直接套 B 范式 |

**影响面**：以上四表当前无 unified-core 代码引用，端点影响为零；影响集中在运维/告警/搜索等其它服务或后续功能。`alert_rules` 的选择会改变“规则是否按租户隔离”的产品语义。

**验证判据**

1. 目录断言：四表策略不再为 `true`（或 `alert_rules` 按 B 方案保留全局只读并有明确注释）。
2. `alerts`：A 上下文看不到 B 行，写入 B 行被拒。
3. `alert_rules`：按 A 方案时 A/B 隔离；按 B 方案时普通租户只读、写请求被拒。
4. 其它服务回归（wms/qms 的 `inventory_alert_rules`、`qa_alert_rules` 不在本项范围，不受影响）。

---

### R4 平台语料归一（迁移 `20261117120000`）

**事实**

- 迁移文件 `database/migrations/20261117120000_platform_corpus_null_to_nil.sql` 与回滚脚本已就位，未执行。
- 涉及 4 表：`public.core_dict_types`（NULL 77 行）、`public.core_dict_items`（397）、`ai.ai_prompt_templates`（3）、`ai.ai_models`（4）；全零租户行均为 0。
- 四表均 RLS/FR 已开，同时存在 `rls_tenant_isolation`（B 范式）与 `rls_global_read`（B 范式 + `tenant_id IS NULL`）；迁移把 NULL → 全零平台租户并删除 `rls_global_read`。
- 读取端目标形态：本租户行走请求事务，平台行走 `scope_read_platform()`（系统只读通道）+ 显式 `tenant_id = PLATFORM_TENANT_ID`。迁移头注释明确“迁移与读取端代码必须同一停机窗口”。

**可选改法**

| 方案 | 内容 | 代价 | 风险 |
|---|---|---|---|
| A（推荐） | 按现迁移推进：迁移 + 读取端同窗口 | 一个窗口 + 读取端改造 | 只上迁移 → 字典/模板/模型列表变空；只上代码 → 读取为空 |
| B | 与 R1/R2 合并进一份统一 DDL 演练批次 | 演练次数少 | 窗口变大，回滚面变宽 |
| C | 维持 NULL 语义、不删 `rls_global_read` | 零成本 | 策略文本无法与“GUC 空即放行”区分，R2 的收紧无法自证 |

**影响面**：字典类型/字典项、AI 提示词模板、AI 模型列表的可见结果；所有租户的“平台内置语料”是否可见。不改变租户自有数据。

**验证判据**

1. 迁移后 4 表 NULL 租户行 = 0、全零租户行 = 迁移前 NULL 行数、总行数不变。
2. `rls_global_read` 策略数 = 0，`rls_tenant_isolation` 仍在，`rls/force` 仍 true。
3. 租户上下文下直接查平台行 = 0 行；`scope_read_platform()` 能读到全部平台行。
4. 字典列表、AI 模板/模型端点非空且与迁移前条目数一致。
5. 回滚脚本演练：全零 → NULL 后行数与策略恢复。

---

### R5 statistics 的 12 处全局 COUNT

**事实**

- `flow/statistics.rs` 仅 1 个 handler `get_statistics`，**没有 `Claims`/`Extension` 入参**，任何人凭 `workflow:read` 都能取数。
- 11 条查询、12 处统计口径：10 条 `COUNT(*)` 标量（工作流总数/启用数、实例总数/运行中/已完成/已驳回、任务总数/待办/已完成/已驳回）+ `workflow_stats` 聚合中的 `COUNT(i.id)` 与 `COUNT(*) FILTER`。
- 全部池直连、无租户谓词：今天返回的是**全平台**数字；R2 收紧后会全部变成 0。

**可选改法**

| 方案 | 内容 | 代价 | 影响 |
|---|---|---|---|
| A（推荐） | 改为租户内统计：请求事务 + RLS，语义明确为“仅本租户” | 11 处执行器替换，1 个 handler 加 `Extension` | 数字变小；与其它 flow 端点一致 |
| B | 保留全局统计，但显式系统通道（`TenantScope::system` + 审计计数），仅超管/服务令牌可用 | 需加 `Claims` 与 403 | 普通租户由“能看到全局数字”变为 403，属安全收紧 |
| C | 新增平台级预聚合表/物化视图，按租户+平台两套口径 | 新表 + 定时任务 | 成本最高，适合后续做运营看板 |

**影响面**：`GET /flow/statistics`；所有持 `workflow:read` 的租户管理员；对外可见数字从全局改为本租户（A）或直接 403（B）。

**验证判据**

1. A：克隆库造 A/B 两租户数据，A 的响应只反映 A；总数与逐条列表 count 一致。
2. B：普通租户 403，超管 200 且审计/计数有记录。
3. 收紧策略后无 0 值异常（即确认不再走池直连）。

---

### R6 `TenantScope` 的三种改法

**事实**

- 实现在 `lib/shared-auth/src/middleware/tenant_scope.rs`：
  - `Tenant(Uuid)`：`sql_predicate` 生成 `tenant_id = $n::uuid`，构造期拒绝 nil；
  - `System(SystemChannel)`：`sql_predicate` 生成 `TRUE` 且不绑定参数，构造时 `tracing::warn!` + Prometheus 计数（标签：来源、目标表）；
  - `from_claims`：可解析非 nil 租户 → Tenant；否则超管 → System(Superuser)；服务令牌 → System(ServiceToken)；其余 400。
- 使用点：`monitor.rs` 12 处（66 条 SQL）、`instance.rs` 4 处（`list_instances`）、`file/manage.rs` + `file/download.rs`。
- 关键矛盾：`System` 生成 `TRUE`，在 R2 收紧策略后依然是“SQL 里没有租户条件”，等于保留一条不受 RLS 约束的全量通道；但若把 `System` 也改成 `tenant_id = $n`，超管/服务令牌的跨租户能力和既有审计口径都会改变。

**可选改法**

| 方案 | 内容 | 代价 | 风险 |
|---|---|---|---|
| a | 保留现状：谓词不变，只把执行器从池换成请求事务（系统通道仍 `TRUE`） | 最小，改动局限于执行器 | 策略收紧后系统通道仍是显式全量；等于用代码约定替代 RLS，无法自证 |
| b（推荐评估） | 统一为真实租户谓词：`Tenant` 走 `tenant_id = $n`；`System` 改为独立 `scope_read_all()`（不拼 `TRUE`，而是走 `app.rls_system=on` 的受控 GUC/角色，并在 SQL 上仍显式标注系统来源），保留 warn + 计数 | 需要新增系统只读路径与角色/GUC 约定；改动 monitor/instance/file | 中：需确认连接角色与 FORCE RLS 下的系统分支写法 |
| c | 挂起，先只做 R1/R2 之外的独立项 | 无 | 系统通道语义继续悬空，R2 无法彻底收紧 |

**影响面**：monitor 的 12 个统计/监控端点、`list_instances`、文件列表/下载；超管与服务令牌的跨租户视图是否保留、审计计数维度是否变化。

**验证判据**

1. a：系统通道与租户通道端点行为与今日一致，仅执行器变化；收紧策略后系统通道仍可跨租户（需在文档中显式承认）。
2. b：系统通道请求在 `app.rls_system=on` 下可跨租户，普通请求不可；warn/计数维度包含来源与表名；超管行为与今日一致或有明确变更说明。
3. 任一方案：`TenantScope::tenant(nil)` 仍 400；普通用户缺租户仍 400。

---

### R7 D-01 批量任务写（已实现，行为待定）

**事实**

- 提交 `e1d98be7e`：`batch_approve` / `batch_complete` / `batch_delegate` 已改为请求事务。
- 循环内逐条 `UPDATE … execute`，`rows_affected()==0` 与真实 SQL 错误都计入 `failed_tasks`，响应固定 200 + 逐条汇总。
- 真实 SQL 错误会把整个请求事务置为 aborted，后续条目全部失败、中间件提交失败、先前成功条目一并回滚，但响应仍声称“部分成功”。

**可选改法**

- A（推荐）：真实 `Err` 立即返回非 2xx，整体回滚；`rows_affected()==0` 仍计入 `failed_tasks`。需调整对外错误契约。
- B：逐条 `SAVEPOINT` / `ROLLBACK TO SAVEPOINT`，保留“部分成功可提交”。实现与门控复杂度高。

**影响面**：三个批量端点的错误响应形态；调用方对“部分成功”的理解。

**验证判据**：构造第 2 条真实 SQL 错误，A 方案返回非 2xx 且第 1 条未落库；B 方案返回 200 且第 1 条已提交、第 2 条失败。

---

### R8 D-02 / D-03 端点不可用

**D-02 事实**

- `rollback_workflow.to_version: String` 绑定 `flow.core_workflow_versions.version`（integer），PG 不做 `text → integer` 隐式转换，端点基线即 500。
- `create_workflow_version.version: String` 绑定 integer，`created_by` 缺省 `"system"` 绑定 uuid，基线同样 500。
- 已用受限角色 + 请求事务 GUC 做语句级对比：旧/新隔离语义一致（A 上下文 pick 1 / apply 1 / switch 2，跨租户 0/0/0）。

**D-02 可选改法**

- A：SQL 内 `$n::int`（非数字仍 500，可再包 400）。
- B（推荐）：handler 内 `parse::<i32>()`，非法输入返回 400。
- C：请求体改 `i32`（API 契约变更，需前端同步）。

**D-03 事实**

- 六个任务动作（approve/reject/claim/unclaim/delegate/reassign）与 `create_approval` 在写语句后回读：
  - `WorkflowInstance` 缺 `current_node_id`、`variables` 列；
  - `Workflow` 缺 `code` 列；
  - 这两个结构体对应字段没有 `#[sqlx(default)]`，sqlx `FromRow` 缺列直接报错，两个 `Err(_)` 分支返回 500。
- 基线即 500，与 RLS 改造无关；E2/E3 因此只能做语句级与残留对比。

**D-03 可选改法**

- A（推荐）：两条 SELECT 补齐缺列，不改 API 契约。
- B：给结构体字段加 `#[sqlx(default)]`，缺列读作 `None`。

**影响面**：`rollback_workflow`、`create_workflow_version`、六个任务动作、`create_approval` 共 9 个端点；当前这些端点的成功路径实际不可用（或写入后 500）。

**验证判据**

1. 基线二进制与新二进制对同一请求：修复后 200，且库内状态一致。
2. 非法版本号/非法用户 ID 返回 400 而非 500。
3. 修复后 E2/E3 的“成功路径”前后对比可补做，隔离结论不变。

**建议**：D-02、D-03 是纯代码、无 DDL、无迁移，且直接阻塞后续所有写端点的成功路径验证，应在本轮最先落地。

---

### R9 `list_instances` 的 4 处

**事实**

- `flow/instance.rs` 的 `list_instances`（约 47–230 行）在 `TenantScope::from_claims` 之后执行 4 条池直连 SQL（约 86 / 110 / 148 / 191 行）：两条 `COUNT(*)` 与两条列表查询，均带显式 `tenant_id` 谓词（`sql_predicate`），池直连不会跨租户，但事务语义与其它 flow 端点不一致。
- 4 条查询内部都有 `EXISTS` 子查询命中 `public.core_workflow_tasks`、`public.approvals`、`public.approval_records`；后两者同样 `rls/force=true` 且为同名宽松策略，改请求事务后其可见性随 GUC 一起收紧。
- 系统通道（超管/服务令牌）下谓词为 `TRUE`，即全量。

**可选改法**

- 随 R6：
  - a：保留谓词，只换执行器（4 处 `&state.pool` → `scope`）。
  - b：按 R6-b 统一系统通道后一起改，`Tenant` 走 RLS、`System` 走受控系统只读。
  - c：挂起，等 R2 收紧窗口一并做。

**影响面**：`GET /flow/instances` 及其分页 total；超管视图取决于 R6。

**验证判据**：A/B 租户列表互不可见、total 与列表条数一致；自身数据 200 不变；系统通道行为按 R6 的结论断言。

---

## 3. 依赖顺序与窗口建议

### 3.1 依赖链（关键结论）

1. **R2（策略收紧）不能单独先上**：收紧后池直连全部返回 0 行，会同时打断 `monitor.rs`（66 处）、`instance.rs`（6 处）、`statistics.rs`（11 处）、`rule/variable/delegate`（32 处）。
2. **R1（四表加 RLS）同样不能先于代码**：加 RLS 但代码仍池直连、且不写 `tenant_id`，新数据将不可见/写入被拒。
3. **R5（statistics）必须在 R2 同窗口**：否则统计全为 0；且需先定“本租户统计”还是“系统通道全局统计”。
4. **R9 与 R6 绑定**：`list_instances` 的 4 处是否保留 `TRUE` 取决于 R6。
5. **R4（平台语料）与上述无代码耦合**，但迁移与读取端必须同窗口。
6. **R7 与 R8 完全独立**，纯代码，无迁移。

### 3.2 建议批次

| 批次 | 内容 | 是否同窗口 | 说明 |
|---|---|---|---|
| P0（可立即） | R8（D-02 + D-03） | 独立 | 纯代码，修复 9 个不可用端点，解锁成功路径验证 |
| P1（可立即） | R7（D-01） | 独立 | 三个批量端点的错误契约，单独提交 |
| P2（先拍板） | R6（a/b/c） | — | 决定 R1/R2/R9 的改法；建议至少选 b 的评估结论 |
| P3（代码） | R1 代码部分（rule/variable/delegate 32 处）、R9、R5、monitor 执行器（66 处） | 与 P4 同窗口 | 全部改为请求事务；R5/R6 按决策走租户内或系统通道 |
| P4（DDL） | R1 四表加 RLS、R2 三表策略收紧、R3 的 `monitor_settings` / `alerts` 收紧 | 必须与 P3 同窗口 | 一份统一迁移 + 回滚 + 克隆库演练 |
| P5（独立窗口） | R4 平台语料（迁移 `20261117120000` + 读取端） | 迁移与代码同窗口 | 与 flow 批次无依赖，可并行排期 |
| P6（待语义） | R3 的 `alert_rules`（无 `tenant_id`）与 `search_logs` | 独立 | 需产品先确认“全局规则 / 搜索日志”定位 |

### 3.3 若暂不拍板 R6

- 可先执行 P0、P1、P5，不受影响。
- P3/P4 必须整体等待 R6；不得只收紧 R2 或只加 R1。

---

## 4. 通用验证判据（各批次复用）

1. **编译**：`cargo fmt -p topems-unified-core --check` + `cargo check -p topems-unified-core` 零警告；分阶段（换执行器 / 删谓词重编号）各自可编译。
2. **门禁**：`python3 scripts/ci/check-txn-write-non2xx.py` 通过；`execute` 后 0 行 → 404 的合法分支登记到 `scripts/ci/txn-write-non2xx-allowlist.json` 并写 reason。
3. **克隆库**：`m2_dryrun_20261116`，受限角色 `topems_prod`，逐条 `PREPARE`/`EXECUTE`（写语句放 `BEGIN … ROLLBACK` 内）；GUC=A/B/空串/全零/未设置五种上下文；临时 `GRANT` 用完 `REVOKE` 并复查。
4. **端点对比**：同一端点、基线二进制 vs 改造后二进制、租户 A/B + 超管/服务令牌；记录 HTTP 码与库内状态（是否残留写入）。
5. **清理**：fixture 删净（按固定 UUID 前缀核对），克隆库行数回到基线。
6. **目录断言**：`pg_class.relrowsecurity/relforcerowsecurity`、`pg_policies.qual/with_check` 与目标文本一致。

---

## 5. 未纳入本文的挂起项

- `flow.core_comments` / `flow.core_favorites`（engagement 3 处池直连）：无表级 RLS，方案与 R1 同类，待与统一 DDL 批次一并处理。
- 生产库数据归一与平台语料迁移：生产库不动，等待窗口。
- 策略收紧后的历史 NULL 行归属：克隆库无样本，需在生产预检后补充规则。

---

## 6. 待决项收口（拍板日 2026-11-17）

> 本节为最终结论，不是备选方案。落地时不需再就本节列出的三项回问；若与前文 §2 的建议方向冲突，以本节为准。

### 6.1 D-1：analytics `list_datasets` 的 `is_public` —— 不恢复跨租户可见性

- **拍板日**：2026-11-17
- **结论**：不恢复跨租户可见性；**不出** `OR is_public` 分支的迁移，也不在代码里加该谓词。
- **目标形态**：`bi.analytics_datasets` 保持现有「严格 B 范式 RLS + 查询层显式 `tenant_id` 谓词」；`is_public` 仅作为**本租户内部**的展示/筛选字段保留，不承担可见性语义。
- **落地证据**：`svc/analytics/src/modules/bi/dataset.rs` 列表 SQL 无 `OR is_public`；读取走请求事务 + 租户谓词。
- **影响**：公开数据集不再对其他租户可见（原本也无跨租户通路，此为确认而非收紧）。若产品确需数据集共享，按 6.3 作为新需求单独立项，走平台语料路线。

### 6.2 D-2：`list_files` 的超管语义 —— 保持 `TenantScope::from_claims`

- **拍板日**：2026-11-17
- **结论**：保持 `TenantScope::from_claims`，**不恢复**隐式系统通道（即不因"超管"身份自动获得 `TenantScope::system` / `TRUE` 谓词）。
- **目标形态**（即当前形态，无需改动）：`svc/unified-core/src/modules/file/manage.rs` 的 `list_files` 先 `TenantScope::from_claims(&claims, "unified-core.file.list_files", "core_files")`，再 `state.db.scope_with(txn)` 取请求事务，SQL 带 `sql_predicate("tenant_id", "$1")`。
- **语义边界**：超管缺租户 → 按 `from_claims` 既有规则 400（不静默升级为跨租户）；服务令牌 → 走既有**显式**系统通道（GUC + warn + 计数）。
- **影响**：超管跨租户文件列表不再隐式可用；如需跨租户盘点，须走显式系统通道接口并在审计中留痕。

### 6.3 D-3：通用规则（固化）

**策略层只做租户隔离。跨租户读取只有两个入口：**

1. **平台语料**：全零租户（`00000000-0000-0000-0000-000000000000`）行，读取端用 `Db::scope_read_platform()`，并在 SQL 中**显式**写 `tenant_id = PLATFORM_TENANT_ID`（不依赖策略放行）。
2. **显式系统通道**：需 `app.rls_system = 'on'` 的受控 GUC/角色（`Db::scope_system()` / `Db::scope_read_system()` / `TenantScope::system(SystemChannel)`），构造时保持 `warn` + Prometheus 计数，不得隐式触发。

**其余所有业务可见性**（公开、共享、收藏、推荐、白名单等）**一律在查询层用显式谓词表达**：不得写进 RLS 策略，也不得以"策略放行 + 代码忘了过滤"的方式实现。

**衍生约束**：

- 新增跨租户能力时，只能新增上述两个入口之一，并同步补审计/计数；不得新增第三种"策略放行"。
- 若将来产品需要数据集共享，作为**新需求**按平台语料路线单独做（新迁移 + 读取端同窗口 + 回滚脚本），不写进策略，也不复用 `is_public` 开关。
- 无 `tenant_id` 的平台全局系统表（当前仅 `public.alert_rules`）属已登记的既有例外：读对所有身份开放、写仅系统通道（`app.rls_system='on'`）。不新增此类表；新增前必须先按本规则判定是否属平台语料。
- 门禁对应：`scripts/ci/check-pool-direct-system-scope.py` 禁止「池直连 + `TenantScope::system`」同函数共存，正是本规则第 2 入口"必须显式"的机器化约束。

### 6.4 收口后的待决项状态

| 编号 | 状态 |
|---|---|
| D-1 `is_public` | **已收口**（不恢复） |
| D-2 `list_files` 超管 | **已收口**（保持 `from_claims`） |
| D-3 通用规则 | **已固化**（写入本节，作为后续评审依据） |
| R1–R9 其余项 | 仍按 §3.2 批次推进，不在本次拍板范围 |

