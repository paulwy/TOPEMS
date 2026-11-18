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

## 6. 状态更新（2026-11-17 决策 3 续推：Batch C）

按生产只读扫描重新精确筛「真宽松表」（`qual='true'` allow_all / 含 `tenant_id IS NULL` 放行 / RLS 未启用），排除已处理批次、`erp.audit_logs`（保持不动）、`core_login_logs`（等回填）后，本批选 **gis 4 表**：

- `gis.geodata`、`gis.geofeatures`、`gis.map_layers`、`gis.spatial_analysis`：`tenant_id` 已由 `20261115141400_b_class_gis_tenant_id_4tables` 补齐且 NOT NULL，两库均 0 行，`svc/gis` 读写全部显式绑定租户、无跨租户读路径，allow_all 可直接收为严格 B。
- 迁移 `20261118112000_gis_map_layers_allow_all_strict.sql` + 同名 rollback，`status: to_apply`；克隆库六档演练（夹具 8 行）与回滚往返通过，详见收口文档 Batch C 章节。

其余 allow_all 表（`iam.roles`、`bi.audit_logs` 等）**没有 `tenant_id`**，属全局元数据，不能套严格 B，本波次不动；含 `tenant_id IS NULL` 放行或 RLS 未启用且有真实数据的表仍被跨租户读路径/回填前置挡住，继续留在顺延矩阵。

### 下一批候选与阻塞原因（Batch C 后重扫）

| 候选表 | 现状 | 阻塞点 |
|---|---|---|
| `pdm.pdm_master_data_refs` | `tenant_id` NOT NULL、0 行；读 allow_all(SELECT) + 写 system-only | **代码已修**（`b8560b889`，INSERT 经 `TenantScope::tenant()` 显式绑租户、缺失即拒绝）；策略收严仍待排 |
| `portal.portal_quick_actions` | `tenant_id` NOT NULL、0 行；ALL allow_all | **已处理**：定性为平台语料，Batch D 迁移 `20261118113000` 收严 + 平台读（见收口文档 Batch D） |
| `erp.dict_items` / `erp.dict_types` | 0 行，`tenant_id` 可空 | **已处理**：Batch E 迁移 `20261118120000` 收严 + 同批代码消除潜在 NULL 写点 |
| `rs.formulas` | 0 行，`tenant_id` 可空；严格 + allow_all 两条 permissive | **已处理**：Batch E 迁移 `20261118120000` 仅保留严格策略 |
| `core.core_plugins` | 0 行，`tenant_id` 可空、默认 `…0001` | **已处理**：Batch F 迁移 `20261118123000` 平台语料化（哨兵行 + 平台读，发布/下架/计数系统通道 + owner 校验） |
| `iam.core_tenant_plugins` | 0 行，`tenant_id` NOT NULL；**RLS 关闭、0 策略**（fail-open） | **已处理**：Batch G 迁移 `20261118124000` 收为严格 B（仅本租户行），代码已显式绑租户 |
| `bi.audit_logs` | 0 行，`tenant_id` 可空、无默认 | **登记 DROP 候选**：全仓无读者、无写者，本波次不建策略、不删表 |
| `iam.roles`（1 行）等 allow_all 无 `tenant_id` | 全局元数据 | 不适用严格 B；如需隔离只能另定「全局只读 + 系统写」 |

`pdm` 策略收严、`iam.roles` 等全局表仍未在本波次改动，继续留待逐表定性；`core.core_tenant_plugins`（2 列遗留空壳，0 行，allow_all）与 `gis.track_positions`（RLS 关闭但有 allow_all，无 tenant_id）登记为下一轮候选/待补列。

## 7. 状态更新（2026-11-17 决策 3 续推：Batch D + pdm 写入缺陷）

- **`pdm.pdm_master_data_refs` 写入缺陷**：核实 INSERT 早已绑定 `tenant_id`（`89422132a`/`a75ef4dc1`），真正问题是过期注释误导台账。已按缺陷口径收口（`b8560b889`）：改为经 `TenantScope::tenant(event.tenant_id)` 严格解析后取 `tenant_id()`，nil/缺失在构造期拒绝、无兜底零；`cargo check` / `clippy -D warnings` 通过，`tenant_rejects_nil` 单测通过；生产只读复核列仍为 NOT NULL、无默认、0 行。**与表定性解耦**：无论该表最终定性如何，写入都必须显式绑租户。
- **`portal.portal_quick_actions`**：定性为**平台语料**（读路径系统通道 + 无租户谓词 + 全仓无写代码 + 块 D 声明），Batch D 迁移 `20261118113000` + 回滚，`status: to_apply`；克隆库六档 0/0/1/2/2/3 与写校验通过，净减少声明见收口文档 Batch D。
- 剩余 NULL 语义不明的表进入逐表证据链核查（erp 字典 / bi / rs / core），证据不足者列「待定」。

## 8. 任务 3：NULL 语义逐表证据链（2026-11-17，生产只读核查）

生产 `topems_prod` 只读读数：5 张表均 **0 行**、`tenant_id` 均**可空**、RLS/FORCE 均已开；策略均为 `*_allow_all_*`（`rs.formulas` 另有严格策略但被 allow_all 的 permissive OR 覆盖）。**0 行意味着没有任何观测到的 NULL 行**，以下判断只基于代码与 schema。

| 表 | 是否有代码写 NULL | 写入点（全仓） | NULL 代表什么 |
|---|---|---|---|
| `erp.dict_types` | **否（正常路径）；表达式为潜在 NULL 写点** | `svc/erp/src/modules/dict.rs:391-392`：`INSERT ... tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID`，执行于请求事务（`:370` `RlsTxnCell` → `:403` `&mut **txn`）；另 `:568-570` 的 UPDATE 只做 `WHERE tenant_id = NULLIF(...)`，不写列 | **待定**。代码无任何「NULL＝平台/全局」分支；请求中间件对普通租户与服务身份都必设 GUC（真实租户或全零），故 HTTP 路径不会产生 NULL。若出现 NULL 只可能来自绕过 `tenant_middleware` 的直连/后台写入。缺证据：无历史 NULL 行、无种子/迁移写入、无产品语义说明 |
| `erp.dict_items` | **否（正常路径）；同上为潜在 NULL 写点** | `svc/erp/src/modules/dict.rs:878-879`（单条创建）、`:1220-1221`（批量创建）同一 GUC 表达式；`:680`/`:1128` 软删、`:1036-1038` UPDATE 均不写 `tenant_id` | **待定**。同上；另注意批量创建与单条创建都依赖请求事务 GUC，若被复用到非请求作用域会静默写 NULL。缺证据同上 |
| `bi.audit_logs` | **否（全仓无写入者）** | 全仓无 `INSERT/UPDATE/DELETE bi.audit_logs`；共享审计服务的 schema 白名单仅 `plugin_crm/plugin_mes/hrm/rs/erp/wms`（`lib/shared-db/src/audit.rs:539-552`）；统一审计写 `public.audit_logs`（`lib/shared-auth/src/security/audit_logger.rs:465`）；analytics 只读 `public.audit_logs`（`svc/analytics/src/routes.rs:942,1064`） | **待定**。既无写入代码也无种子，无法从代码推断 NULL 语义（是「未归属审计」还是「平台审计」）。缺证据：上游写入方来源（是否外部 ETL/BI 工具）、产品对 BI 审计归属的定义；需产品/数据血缘确认 |
| `rs.formulas` | **否** | 唯一写点 `svc/rd/src/modules/formula.rs:227-240`，`.bind(tenant_id)` 为**具体 Uuid**：`:196-205` 取 claims 租户，超管回落 `00000000-…-0001`（非 NULL）；`:414`/`:692`/`:787` UPDATE 与 `:500` 软删均不改 `tenant_id`；全仓无 `INTO formulas` 其它写点 | **待定**。代码明确用「租户1」兜底超管数据而不是 NULL，说明 NULL 不是设计中的语义；但为何列可空、历史上是否有 NULL 行无记录。缺证据：历史数据来源与列可空的设计意图 |
| `core.core_plugins` | **否（正常路径）；表达式为潜在 NULL 写点** | `svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:1074-1082`：`scope_with(txn)` + `tenant_id = NULLIF(GUC,'')::UUID`；`runtime.rs:112-126`：`scope_system()` + 同一表达式（系统通道 GUC 为**全零 UUID**，写入平台行而非 NULL）；各 UPDATE（`tenant_plugins.rs:1276/1338/1400`、`versioning.rs:322`、`upgrade_workflow.rs:224`）均不改 `tenant_id` | **待定（但语义线索明确）**。`marketplace.rs:46-53` 声明该表是「全租户共享插件目录」，`tenant_id` 表示**发布方而非查看方**，读走 `scope_read_system`；按此 NULL 更像「无发布方」，但代码从不写 NULL，且列默认值是 `…0001`（发布方会被误记为租户1）。缺证据：产品对「平台自有插件」归属的定义，以及默认值 `…0001` 是否应改为全零 |

**结论口径**：本批 5 张表**没有一张能给出「NULL＝X」的代码级证据**，因此全部 NULL 语义列 **待定**，不做猜测、不排序为平台语料或私有行；这也意味着它们**不进入**本轮收严批次。下一步若要推进，需先补齐上表「缺证据」列（产品语义或上游写入方），再决定「NULL 归一 + 平台读」还是「收严为净减少」。

## 9. 决策落地（2026-11-17：不再挂起等证据）

1. **潜在 NULL 写点已消（代码）**：`erp/dict.rs` 三处与 `tenant_plugins.rs` 一处改为 `TenantScope::from_claims(...).create_tenant_id()` 显式绑定；真实租户 / 服务身份显式哨兵 / 缺租户 400，SQL 中 `NULLIF(GUC)` 全部移除。`cargo check` 通过。
2. **严格 B 已落 3 张表**：`erp.dict_types`、`erp.dict_items`、`rs.formulas` → Batch E 迁移 `20261118120000`（唯一 `rls_tenant_isolation`，无平台读，补 tenant_id 索引），回滚与克隆库六档 0/0/1/1/1/3、写校验、往返均通过。
3. **`core.core_plugins` 已按平台语料化落地（Batch F）**：五点拍板后出迁移 `20261118123000` + 回滚 + 克隆库六档演练（含「A 能看到 B 发布、看不到 B 草稿」断言）+ 代码同批；读取策略 = 哨兵行 OR 本租户行，发布/下架/计数走系统通道 + owner 校验。设计见 [core-plugins-platform-catalog-design-2026-11-18.md](core-plugins-platform-catalog-design-2026-11-18.md)。
4. **`bi.audit_logs` 登记 DROP 候选**：全仓无读者、无写者；本波次不建策略、不删表。**删表属破坏性 DDL，进窗口时单独确认**。
5. NULL 语义本身仍维持「待定」，但**不再阻塞写路径与隔离收严**：四张 0 行表均已按「显式绑定 + 严格 B（core 另加平台读）」落地。
