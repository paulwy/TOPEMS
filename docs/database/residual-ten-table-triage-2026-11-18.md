# 顺延 10 表定性台账（2026-11-18）

> 状态：**定性完成，DDL 未动**。按 §6.3 三类规则归档，凡改变租户可见范围的先报清单，等确认后再出迁移。
> 数据基线：生产 `topems_prod`，superuser 复核，2026-11-17。

## 0. 规则与判定口径

- **平台语料**：无租户语义、所有租户共用 → `NULL` 归一为哨兵租户（全零）+ 严格策略，代码改走平台/系统通道读全局行。
- **显式系统通道**：登录前置 / 后台跨租户读 → 代码显式 `rls_system='on'`（+ nil 租户），策略收紧/定型为严格 B 范式。
- **保持不动**：真正无法归一、且属跨租户审计视图 → 不改，写明理由。
- 现有「宽松」来自两条策略叠加：`rls_tenant_isolation`（严格 B）+ `rls_global_read`（`FOR SELECT` 追加 `OR tenant_id IS NULL`）。去掉 `rls_global_read` 即严格化。

## 1. 汇总

| # | 表 | 行数（分布） | 现策略 | 定性 | 处置 | 可见范围变化 |
|---|---|---|---:|---|---|---|
| 1 | `erp.audit_logs` | 13（t1=8, t2=5） | 仅 `rls_system_only` | 保持不动 | 不改 | 不变（租户 0，平台系统通道全量） |
| 2 | `finance.core_finance_currencies` | 16（NULL=8, t1=8） | 严格 B + `rls_global_read` | 平台语料 | NULL→哨兵 + 去 global_read + 代码平台读 | **租户失去 8 条全局币种** ⚠ |
| 3 | `finance.core_finance_report_line_map` | 48（全 NULL） | 严格 B + `rls_global_read` | 平台语料 | 同上 | **租户失去 48 条全局映射** ⚠ |
| 4 | `public.core_roles` | 17（NULL=16, t1=1） | 严格 B + `rls_global_read` | 平台语料（角色模板） | 同上，auth 关键 | **租户失去 16 条模板** ⚠ |
| 5 | `public.core_sessions` | 106（t1=106） | 仅 `rls_system_only` | 显式系统通道 | 定型/加租户分支 | 保持 0；若加分支 **租户新增自有会话** ⚠ |
| 6 | `public.core_refresh_tokens` | 106（t1=106） | 仅 `rls_system_only` | 显式系统通道 | 同上 | 同上 ⚠ |
| 7 | `public.core_login_logs` | 137（全零） | `rls_system_only` + `rls_tenant_read` | 显式系统通道（读已严格 B） | 不新增 DDL，等回填 54 | 回填后 **租户1新增 54 条自有成功日志** ⚠ |
| 8 | `mobile.sync_policies` | 1（NULL=1） | 严格 B + `rls_global_read` | 平台语料（超管公共行） | NULL→哨兵 + 去 global_read | **普通租户不再看到该行**（消除越权），超管零 GUC 仍可见 ⚠ |
| 9 | `pm.project_type_configs` | 1（NULL=1） | 严格 B + `rls_global_read` | 平台语料（全局默认类型） | NULL→哨兵 + 代码平台读 | **租户失去 1 条默认类型** ⚠ |
| 10 | `public.core_operation_logs` | 0 | `public_allow_all` | 显式系统通道 | 已由 `20261118090000` 纳入严格 B | 0 行无实际变化；平台视图需改系统通道 ⚠ |

⚠ = 会改变租户可见范围，需确认后才动 DDL。

## 2. 逐表定性

### 2.1 `erp.audit_logs` — 保持不动
- 读写：写 `erp` 审计模块落真实租户；读 [audit.rs](file:///Users/xingzhai/topems/svc/erp/src/modules/audit.rs) 列表/详情显式 `set_system_channel`，是平台级跨租户审计视图。
- 依据：跨租户审计视图是产品语义，不是租户数据；收紧为严格 B 会让平台审计台在普通上下文看不到任何行。
- 动作：不改。理由已写进本台账与迁移 manifest。
- 可见范围：租户始终 0（现状），平台系统通道全量，不变。

### 2.2 `finance.core_finance_currencies` — 平台语料
- 读写：[currencies.rs](file:///Users/xingzhai/topems/svc/finance/src/modules/currencies.rs#L228-L232) 新建币种**显式写 `tenant_id = NULL`**（全局币种是设计语义）；列表/详情走 `scope_with(txn)`，不显式过滤租户，靠 `rls_global_read` 看到 NULL 行。
- 依据：8 条 NULL 是平台币种语料，8 条 t1 是租户覆盖。
- 动作：8 条 NULL → 全零哨兵；去 `rls_global_read`；代码读全局币种改平台/系统通道（或保留受控全局读）。
- 可见范围：**租户将看不到 8 条全局币种**，除非代码同批改平台读。

### 2.3 `finance.core_finance_report_line_map` — 平台语料
- 读写：报表模块 join 该表做行映射，未带租户谓词；48 行全 NULL。
- 依据：全局报表行映射，无租户语义。
- 动作：48 行 NULL → 哨兵；去 `rls_global_read`；报表 join 改平台通道。
- 可见范围：**租户将看不到 48 条映射**，需代码同批。

### 2.4 `public.core_roles` — 平台语料（角色模板）
- 读写：`role.rs` 列表条件显式含 `tenant_id IS NULL`（模板共享）；写路径绑租户。
- 依据：16 条 NULL 是平台角色模板，1 条 t1 是租户角色。
- 动作：16 行 NULL → 哨兵；去 `rls_global_read`；模板读取改平台通道。auth 关键，需回归权限解析。
- 可见范围：**租户将看不到 16 条模板**，需代码同批 + 权限回归。

### 2.5 `public.core_sessions` — 显式系统通道
- 读写：[auth.rs](file:///Users/xingzhai/topems/svc/unified-core/src/modules/iam/auth.rs#L478-L498) 登录/刷新/登出全部 `set_config('app.rls_system','on', true)` + nil 租户；会话管理列表在租户上下文读。
- 依据：登录前置无法确定租户，必须系统通道。
- 动作：两种选型 —— ①保持 `rls_system_only`（定型为系统通道，租户仍 0）；②加 `tenant_id=GUC` 分支成严格 B（租户可见自有会话）。
- 可见范围：①不变；②**租户新增自有会话可见**。

### 2.6 `public.core_refresh_tokens` — 显式系统通道
- 同 2.5：`auth.rs:498/1053/1075/1213/1325` 均系统通道；106 行均 t1。
- 可见范围：同 2.5。

### 2.7 `public.core_login_logs` — 显式系统通道（读已严格 B）
- 读写：写走登录处理器系统通道；读策略 = `rls_system_only`(ALL) + `rls_tenant_read`(SELECT)，合并即严格 B；`audit/handlers.rs` 查询带 `($2::uuid IS NULL OR tenant_id=$2)`。
- 依据：登录前置 + 后台审计视图。
- 动作：**不新增 DDL**；等回填 54 行（见 [回填预案](file:///Users/xingzhai/topems/docs/database/zero-tenant-backfill-plan-2026-11-18.md)）。
- 可见范围：回填后租户1新增 54 条自有成功日志；其余 83 行保持零租户（系统可见）。

### 2.8 `mobile.sync_policies` — 平台语料（超管公共行）
- 读写：[offline_sync.rs:699-711](file:///Users/xingzhai/topems/svc/mobile/src/modules/offline_sync.rs#L699-L711) 超管**故意绑 `None`（SQL NULL 公共行）**，靠 `tenant_id IS NULL` 分支放行；普通用户绑真实租户；`user_id` 有 UNIQUE。
- 依据：1 条 NULL 是超管共享行，不是租户数据；普通租户当前能读到它，属越权可见。
- 动作：1 行 NULL → 哨兵；去 `rls_global_read`；超管中间件已是零 uuid 上下文，哨兵行仍可见。
- 可见范围：**普通租户不再看到该行**（收紧越权），超管不变。

### 2.9 `pm.project_type_configs` — 平台语料（全局默认类型）
- 读写：写路径含 `tenant_id`；列表走 `scope_with(txn)` 不显式过滤租户，靠 `rls_global_read` 看 NULL 行。
- 依据：1 条 NULL 是全局默认项目类型。
- 动作：1 行 NULL → 哨兵；去 `rls_global_read`；列表读全局默认改平台通道。
- 可见范围：**租户将看不到 1 条默认类型**，需代码同批。

### 2.10 `public.core_operation_logs` — 显式系统通道
- 读写：中间件自动写；[handlers.rs](file:///Users/xingzhai/topems/svc/unified-core/src/modules/audit/handlers.rs#L243) 平台视图 `($1::uuid IS NULL OR tenant_id=$1)`。
- 依据：平台跨租户操作审计视图。
- 动作：策略已由 `20261118090000`（class A）纳入严格 B，**不重复出迁移**；需把 `$1 IS NULL` 的平台视图改为系统通道，否则 090000 上完后平台查询只剩自有租户行。
- 可见范围：0 行，当前无实际变化；平台视图是代码前置。

## 3. 批次建议（待确认后落地）

- **Batch A｜平台语料归一（1 迁移 + 1 回滚 + 1 演练）**
  `finance.core_finance_currencies`、`finance.core_finance_report_line_map`、
  `public.core_roles`、`pm.project_type_configs`、`mobile.sync_policies`。
  内容：NULL→全零哨兵（数据 UPDATE）+ 去 `rls_global_read` + 保留严格 `rls_tenant_isolation`；代码同批改平台通道读/超管零 GUC 语义。

- **Batch B｜系统通道定型（1 迁移 + 1 回滚 + 1 演练）**
  `public.core_sessions`、`public.core_refresh_tokens`（+ `core_operation_logs` 已在 090000）。
  内容：定型为系统通道或加租户分支（二选一，见 2.5）；`core_login_logs` 只等回填，不出 DDL。

- **保持不动**：`erp.audit_logs`。

- **只登记**：qms 5 张无 `tenant_id` 幻影表 → DROP 候选，本次不删。

## 4. 需你确认的可见范围变化

1. 平台语料 5 表：租户将不再直接看到 NULL 全局行（币种 8、报表映射 48、角色模板 16、默认类型 1、超管同步策略 1）——是否同意「平台通道读」方案，并接受同批代码改动？
2. 系统通道 2 表（sessions / refresh_tokens）：保持租户 0，还是加租户分支让租户看到自有会话？
3. `core_operation_logs` 平台视图改系统通道，是否随 Batch B 一起排？

确认后我再写迁移、回滚与克隆库演练；未确认前只保留本台账。生产零 DDL、零数据修复、零停服，已攒四条迁移维持 `to_apply`。

## 5. 状态更新（2026-11-18 已拍板，迁移已出）

三项确认结果：

1. Batch A 平台语料 5 表同意，读取谓词定为「平台行 OR 本租户行」；`mobile.sync_policies` 的公共行不再对普通租户可见，**本次唯一一处租户可见范围净减少**（已在收口文档写明）。
2. Batch B 的 `core_sessions`、`core_refresh_tokens` 保持租户 0 + 系统通道，**不加租户分支**；`core_login_logs` 不出 DDL，只等 54 行回填；`core_operation_logs` 平台视图改系统通道随本批排。
3. `erp.audit_logs` 保持不动；qms 5 张幻影表仅登记 DROP 候选。

已落地文件（均 `status: to_apply`，生产未执行）：

- `database/migrations/20261118110000_platform_corpus_rls_strict.sql` + 同名 rollback：74 行 NULL→哨兵、去 `rls_global_read`、4 表新增 `rls_platform_read`。
- `database/migrations/20261118111000_system_only_sessions_rls_finalize.sql` + 同名 rollback：两表 system-only 定型与断言。
- 同批代码：finance currencies/report、unified-core role/global_row_metrics/audit handlers、mobile offline_sync。

克隆库六档演练与逐表可见行数对照见
`docs/database/repo-wide-rls-pool-closure-2026-11-18.md` 的 Batch A / Batch B 章节。
