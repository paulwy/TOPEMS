# 调用环消除策略决策（D2 架构优化实施）

> 状态：✅ 决策已出（2026-10-02）· 归属：TODO.md「🚧 架构优化实施（2026-10-02）」阶段 0 · 关联：[D1 unified-core 目标形态决策](./decision-d1-unified-core-architecture.md)、[事件驱动架构](./event-driven.md)、[unified-core 继续瘦身决策](./unified-core-slimming-decision.md)
> 依据：架构分析报告 `TOPEMS-架构分析报告-2026-10-02.md`（F-03/F-04）+ `docs/audit/arch-analysis/ENTRY.md` §5b/5c。本文档所有路径与行号为 2026-10-02 实测。

## 1. 背景与决策问题

**环的定义**：两个服务之间存在双向 HTTP 依赖（A→B 与 B→A 并存），任一服务抖动/重启/变慢都会通过反向调用放大回自身，形成级联故障与数据不一致风险。重试叠加还会放大压力（A 重试→B 更慢→A 更慢）。

**实测存在三条请求内/异步 HTTP 双向依赖**：

| # | 环 | 证据（实测） | 报告编号 |
|---|---|---|---|
| 环 1 | erp ↔ hrm | erp→hrm：`svc/erp/src/modules/addressbook.rs:200`；hrm→erp：`svc/hrm/src/modules/payroll.rs:990` | F-03 / ENTRY-01 |
| 环 2 | erp ↔ mes | erp→mes：`svc/erp/src/modules/production_order.rs:536`；mes→erp：`svc/mes/src/modules/work_report.rs:644` | F-04 / ENTRY-02 |
| 环 3 | portal ↔ unified-core（低频） | unified-core→portal：`svc/unified-core/src/modules/iam/user/profile.rs:17,80,195`（回调 portal 偏好）；portal→unified-core：portal 持 IamApi/WorkflowApi 客户端（ENTRY §5b:181,185） | 报告未单列（本次实测新增） |

**决策问题**：两条高优环（erp↔hrm、erp↔mes）各自采用何种消除策略——事件化 / 模块合并 / 单向 API + 异步补偿 / 维持同步但解耦？第 3 条低频环（portal↔unified-core）一并处置。该决策直接决定 TODO.md 阶段 2 U2（调用环消除）的拆解方式，并影响 D3（integration 直写/同步中枢）的边界判定。

## 2. 现状盘点（2026-10-02 实测）

### 2.1 环 1 erp ↔ hrm

**调用方向与数据流**：

| 方向 | 代码 | 调用内容 | 性质 |
|---|---|---|---|
| erp→hrm | `addressbook.rs:200-216`（fetch_entries_by_type） | 通讯录按类型拉取 hrm 员工/部门列表（`state.hrm_client.list_employees()/list_departments()`），映射为 AddressbookEntry | **请求内同步只读查询**（handler 直接 await，非 spawn）；失败仅 `tracing::warn` 降级为空列表 |
| hrm→erp | `payroll.rs:962-1000`（payroll run 过账后） | 构造工资凭证 payload（科目/借贷金额/部门），签发 `erp:admin` 服务令牌，POST `{erp_url}/api/erp/vouchers` 创建总账凭证 | **异步 fire-and-forget 写**（`tokio::spawn` 内调用，见 payroll.rs 上下文）；失败仅日志，无重试无补偿 |

**Source of truth**：员工/部门主数据在 **hrm**（hrm 拥有 hrm.* schema，erp 只读）；总账凭证在 **erp 侧**（POST /api/erp/vouchers 由 erp 服务创建，归属 erp/finance 域）。

**环的本质**：不是"同一请求内递归"，而是**两个服务互相持有对方客户端、各自请求内/异步发起反向调用**的拓扑环。erp 通讯录 API 的延迟直接依赖 hrm 的可用性（请求内同步读）；hrm 工资过账又回调 erp。hrm 慢 → erp 通讯录慢；erp 慢 → hrm 工资流程慢。

### 2.2 环 2 erp ↔ mes

| 方向 | 代码 | 调用内容 | 性质 |
|---|---|---|---|
| erp→mes | `production_order.rs:518,536`（生产订单状态更新后） | `tokio::spawn` 内 `mes_client.create_from_erp(&payload)` 下达生产工单（含产品/数量/交期/工位） | **异步 fire-and-forget 写**；失败日志"异步降级，不影响 ERP 订单" |
| mes→erp | `work_report.rs:618,644`（报工后） | `tokio::spawn` 内查询 `production_orders.source_order_id` 后 `erp_client.sync_mes_progress(&payload)` 回传完成数量/进度 | **异步 fire-and-forget 写**；失败日志"异步降级，不影响报工" |

**Source of truth**：生产订单主数据在 **erp**（erp 下达、mes 侧 `production_orders` 表存 `source_order_id` 引用）；实际执行进度在 **mes**（报工是 MES 侧事实，回传 ERP 更新）。

**环的本质**：双向写、双 spawn fire-and-forget。比环 1 温和（不阻塞请求），但**无确认机制**：下达/回传丢失即静默数据不一致（ERP 显示订单已下达而 MES 无工单；MES 已报工而 ERP 进度不更新），且拓扑上仍是双向 HTTP 依赖。

### 2.3 环 3 portal ↔ unified-core（低频）

| 方向 | 代码 | 调用内容 | 性质 |
|---|---|---|---|
| unified-core→portal | `profile.rs:17,80,195-225`（get/update_preferences） | 用户偏好 GET/PUT 请求内 `call_portal_preferences()` 回调 `{PORTAL_SERVICE_URL}/api/portal/preferences` | **请求内同步读/写**（async await，非 spawn）；令牌 `portal:admin` |
| portal→unified-core | ENTRY §5b:181,185 | BFF 聚合调用 IamApi/WorkflowApi（认证/流程） | 请求内同步（BFF 常规聚合） |

**环的本质**：低频触发面（仅 `/users/me/preferences` 接口），但 unified-core 的 IAM 模块依赖 portal 可用性，与 portal 依赖 unified-core 的 IAM 互为反向。任意一侧故障，偏好读写与 BFF 认证互为放大。

### 2.4 超时 / 重试 / 熔断现状（实测）

| 调用 | 超时 | 重试 | 熔断 |
|---|---|---|---|
| TypedServiceClient（erp→hrm、erp→mes 等） | **有**：`lib/shared-service-client/src/service_client/base_client.rs:42-43` 总超时 30s + 连接超时 5s | 无（spawn 内单次） | 无 |
| hrm→erp 裸 reqwest（`payroll.rs:962` `reqwest::Client::new()`） | **无整体超时**（仅 reqwest 默认连接超时约 10s） | 无 | 无 |
| unified-core→portal（`profile.rs` reqwest::Client::new()） | 无整体超时 | 无 | 无 |

结论：环上调用**只有 TypedServiceClient 一侧有 30s 兜底**，裸 reqwest 两侧无整体超时；全链路无重试/退避/熔断，失败即静默。

### 2.5 事件总线承载能力（实测）

- 机制层已落地：Redis Stream（XADD/XREADGROUP/XACK + 消费组 + DLQ + 事件版本 + Schema Registry，**默认开启**），Pub/Sub 旧机制已 deprecated（`lib/shared-event/src/messaging.rs:3,69`）。
- **两条环涉及的三服务均已接入事件总线**（非从零建设）：
  - erp 已发布：SalesOrderCreated/PurchaseOrderApproved 等（ERP 分片 §5.1 事件边）；订阅 finance 付款完成、crm 客户事件、scm 采购事件（ENTRY §5b:206-210）。
  - hrm 已发布：HrmEmployeeCreated/Updated 员工/部门变更事件（ENTRY §5b:211 hrm→integration 员工/部门变更同步；WMS 分片 ehs 订阅 HrmEmployeeCreated/Updated）。
  - mes 已发布：ProductionOrderCreated（WMS 分片 §5.1 事件发布清单）。
- **缺口**：当前事件边中**没有** erp→hrm、hrm→erp、erp→mes、mes→erp 方向——两条环确实仍是纯 HTTP，事件化需要新增 4 条事件边（2 发布 + 2 订阅侧，若双向事件化）。

### 2.6 全仓同步环复核结论（2026-10-02 全量 grep）

对 ENTRY §5b 的 54 条依赖边（40 HTTP + 13 事件 + 1 DB）做双向组合排查，**确认无第 4 条及以上 HTTP 环**：

- **已排除的双向组合**：erp↔finance（erp→finance 是 HTTP；finance→erp 是**事件**非 HTTP，不构成 HTTP 环）；erp↔wms/erp↔scm（同为事件边，非 HTTP）；crm↔erp（crm→erp HTTP；erp→crm 是 DB 直读 `core_crm_customers`（ERP-05），非 HTTP 调用）；ai→crm/erp/finance（MCP 出向，无反向）；integration→erp/mes/lims/qms/scm/wms（纯出向同步中枢，无反向）；mobile→hrm/mes/qms/wms/communication（无反向）；rd→ai（无反向）；unified-core→communication 与 portal→unified-core（communication 无出向到 unified-core，不构成环）。
- **qms/lims/ehs 互读 URL 判定为非环**：仅前端配置暴露（`ehs/src/modules/data_sync.rs:523-526` 等返回 config），实际跨域同步走 Redis Stream 事件（ENTRY-10）。
- **结论**：除本次决策覆盖的 3 条环外，全仓无其他 HTTP 同步环；无 3 环以上长环。

### 2.7 与 D1 联动（实测）

- 环涉及模块归属：erp 通讯录/生产订单模块 = `svc/erp` 自有模块；hrm 工资凭证 = `svc/hrm` 自有模块；mes 报工 = `svc/mes` 自有模块——**均非 unified-core 镜像模块**。D1 灰度下架 unified-core 业务投影（只读层）不改变这三组模块的归属，D2 与 D1 正交、可并行实施。
- 唯一交叉点：D1 下架后 unified-core 不再直读 erp.* 等业务 schema，环事件化新增的订阅侧（erp/mes 消费事件）均为本服务自有库操作，不受影响。
- 实施顺序建议：D1 与 D2 决策独立，阶段 2 的 U1（瘦身）与 U2（环消除）可并行开工；U2 无需等待 U1 完成。

## 3. 关键前置事实核对结论（写入决策依据）

| 核对项 | 结论（实测） |
|---|---|
| 环 1 数据流与 source of truth | erp→hrm 传"查询意图"（只读，hrm 是员工/部门主数据源）；hrm→erp 传"凭证数据"（写，erp 是总账凭证归属方）。**两个方向的权威方都明确，无归属争议** |
| 环 2 数据流与 source of truth | erp→mes 传"订单下达指令"（erp 是订单主数据源）；mes→erp 传"执行进度"（mes 是报工事实源）。**双向都是单向事实流，可各自事件化** |
| 同步阻塞性 | 环 1 erp→hrm 为**请求内同步 await**（会阻塞 erp 通讯录 API）；其余三边（hrm→erp、erp→mes、mes→erp）为 **spawn 异步 fire-and-forget**（不阻塞主请求，但无确认/重试） |
| 超时/重试/熔断 | 仅 TypedServiceClient 有 30s 总超时 + 5s 连接超时；裸 reqwest 无整体超时；全链路无重试、无熔断 |
| 事件总线能否承载 | 能。Redis Stream 可靠性机制齐备（消费组/XACK/DLQ/事件版本/Schema Registry）；erp/hrm/mes 均已接入总线；仅缺 4 条目标事件边 |
| 其他环 | 全仓复核无第 4 条环；qms/lims/ehs 已排除 |
| D1 联动 | 正交；模块归属不变；可并行 |

## 4. 决策选项分析（逐环评估，不强行统一）

### 环 1 erp ↔ hrm

- **选项 A 事件化（仅适用 hrm→erp 方向）**：hrm 工资过账后发布 `HrmPayrollPosted` 领域事件（含凭证数据：期间/科目/借贷金额/部门），erp 订阅生成总账凭证。设计要点：事件结构带 `payroll_run_id` 幂等键 + 事件版本；erp 侧按幂等键去重（重复发放不重复建证）；失败进 DLQ，重试/补偿由 erp 订阅器负责；凭证生成失败需人工对账通道。
- **选项 B 模块合并**：hrm 并入 erp（或 erp 工资域迁 hrm）——工作量高（服务边界、schema、路由、运维全部变动），与模块化单体/独立服务并存现状冲突，**不适用**。
- **选项 C 单向 API + 异步补偿**：保留 erp→hrm 只读查询（**单向依赖不构成环**），hrm→erp 凭证生成改事件（= 选项 A 应用于写方向）。即"读保持查询、写异步化"，环即破。
- **选项 D 维持同步但解耦**：给 hrm→erp 加超时/重试/熔断（不破环，仅缓解）——可作为事件化过渡期的防御补丁，非终态。
- **推荐**：**选项 C（读保查询 + 写事件化）**。理由：erp→hrm 是只读查询，事件化不适用（查询不能事件化），且单向依赖在环破除后完全可接受；hrm→erp 是"工资发放的副作用"，异步生成凭证天然可接受（工资凭证批量/延迟无业务紧迫性），且 hrm 已具备事件发布能力（HrmEmployeeCreated 先例）。

### 环 2 erp ↔ mes

- **选项 A 双向事件化**：erp 发布 `ErpProductionOrderDispatched`（订单下达/状态变更）→ mes 订阅创建/更新工单；mes 发布 `MesWorkReportSubmitted`（报工/进度）→ erp 订阅更新生产订单进度。设计要点：双向幂等键（`erp_order_id` / `work_report_id`）+ 事件版本；下达与回传各自单向事实流，无方向冲突；mes 侧 `source_order_id` 映射保留；失败进 DLQ。
- **选项 B 模块合并**：mes 并入 erp——mes 是本组最大服务（36,772 行/27 模块，WMS-06），合并代价最高，**不适用**。
- **选项 C 单向 API + 异步补偿**：只能单向化一半（如保留 erp→mes 下达、mes→erp 改事件），另一半仍是 HTTP 写——环未完全破除（残留单向写无确认），且两侧都是写，语义对称，**不如 A 干净**。
- **选项 D 维持同步但解耦**：两侧已是非阻塞 spawn，加超时/熔断仅缓解不可靠（无确认），**不适用**。
- **推荐**：**选项 A 双向事件化**。理由：两侧都是"指令/事实单向流"，事件化语义完美匹配（下达、报工本就是可异步的领域事件）；mes 已发布 ProductionOrderCreated、erp 已订阅多个业务事件，双侧基础设施就绪；事件化同时解决"静默丢失"（DLQ 兜底）与"重复同步"（幂等键）两个现存风险。

### 环 3 portal ↔ unified-core（低频）

- **选项 A 事件化**：偏好读写低频且需即时回读（读偏好是交互式接口），事件化**不适用**（查询侧）。
- **选项 B 模块合并**：portal 与 unified-core 已在 svc/server 单体内共存（模块化单体），偏好归属争议小——但独立部署模式下仍是两个进程，合并无实际意义，**不适用**。
- **选项 C 单向 API + 异步补偿**：偏好**主数据本地化**——unified-core 的 IAM 域直接管理偏好表（core_user_preferences），`get_preferences/update_preferences` 读本地库，**移除对 portal 的回调**（`profile.rs:17,80` 改本地查询；portal 侧偏好接口改为代理 unified-core 或废弃）。偏好属于用户域数据，本就应归 IAM 所有，**单向化最自然**。
- **选项 D 维持同步但解耦**：仅加超时/熔断不破环，**不适用**。
- **推荐**：**选项 C（偏好本地化，移除回调）**。理由：偏好是 IAM 域数据，本地化消除反向依赖且提升偏好接口可用性（不再依赖 portal）；portal 侧保留只读代理即可满足 BFF 契约；数据迁移量小（偏好表结构简单），一次迁移完成。

## 5. 推荐与理由（逐环明确）

| 环 | 推荐 | 一句话理由 |
|---|---|---|
| 环 1 erp↔hrm | **C：保留 erp→hrm 只读查询 + hrm→erp 凭证生成事件化** | 查询不能事件化且单向无环；凭证是"发放副作用"，异步生成天然可接受，hrm 事件能力已有先例 |
| 环 2 erp↔mes | **A：双向事件化**（erp 发布订单下达事件 → mes 订阅；mes 发布报工事件 → erp 订阅） | 双向都是单向事实流，事件化语义完美匹配，同时解决静默丢失（DLQ）与重复同步（幂等键） |
| 环 3 portal↔unified-core | **C：偏好主数据本地化，移除 unified-core 对 portal 的回调** | 偏好属 IAM 域，本地化即破环且提升接口可用性，迁移量小 |

不选择项：模块合并（B）对三环均不适用（边界成本高、mes 过大）；维持同步（D）仅缓解不破环，仅作过渡期防御补丁（为 hrm→erp 与 unified-core→portal 两处裸 reqwest 补 30s 总超时，属 U2 附带项）。

**与既有优点的一致性**：ERP 分片确认"erp/scm/srm/pm/pdm 组内零同步耦合、纯事件驱动"是本项目最大优点（scm→erp、srm→scm、pm→erp 均已事件化）。本决策把 erp↔hrm、erp↔mes 纳入同一模式，是把已验证的模式复制到缺口方向，而非引入新机制。

## 6. 实施路径与验收标准（对应 TODO.md 阶段 2 U2）

### U2 调用环消除（依赖 D2）

| 步骤 | 内容 | 入口 |
|---|---|---|
| U2.1 | 环 1 事件化：hrm `payroll.rs` 过账后发布 `HrmPayrollPosted`（含 `payroll_run_id` 幂等键 + 事件版本）；erp 订阅生成凭证（按幂等键去重，失败进 DLQ） | `svc/hrm/src/modules/payroll.rs:990`；erp 事件订阅器（参照 `svc/erp/src/event_handlers/`） |
| U2.2 | 环 2 事件化：erp `production_order.rs` 下达改为发布 `ErpProductionOrderDispatched`；mes 订阅创建工单（保留 `source_order_id` 映射）。mes `work_report.rs` 报工发布 `MesWorkReportSubmitted`；erp 订阅更新进度 | `svc/erp/src/modules/production_order.rs:518,536`；`svc/mes/src/modules/work_report.rs:618,644` |
| U2.3 | 环 3 本地化：unified-core 建 `core_user_preferences` 表（迁移），`profile.rs:17,80` 改本地读写并**删除 `call_portal_preferences` 回调**；portal 偏好接口改代理 unified-core（保留 BFF 契约）；旧偏好数据一次性迁移 | `svc/unified-core/src/modules/iam/user/profile.rs:17,80,195` |
| U2.4 | 过渡期防御（可选）：为两处裸 reqwest（hrm→erp、unified-core→portal 若过渡期仍存在）补 30s 总超时；如 U2.1-U2.3 已完成可跳过 | `svc/hrm/src/modules/payroll.rs:962` |
| U2.5 | 事件治理：新增事件注册进 Schema Registry 与事件版本；更新 `event-driven.md` 事件清单（含事件名前缀规范，参照 ERP-04 修正） | `lib/shared-event/`；`docs/architecture/event-driven.md` |

**验收标准（可测量）**：

1. **环内同步 HTTP 调用数 = 0**：grep 四条调用点（`addressbook.rs:200`、`payroll.rs:990`、`production_order.rs:536`、`work_report.rs:644`）无 HTTP 调用残留（addressbook 保留只读查询属设计内，列入"白名单查询"注释）；`grep -rn "create_from_erp\|sync_mes_progress\|/api/erp/vouchers" svc/{erp,hrm,mes}/src` = 0（除注释）。
2. **事件链路 e2e 通过**：工资发放 → `HrmPayrollPosted` → erp 凭证生成（幂等：同 `payroll_run_id` 重放不重复建证）；erp 订单状态变更 → `ErpProductionOrderDispatched` → mes 工单创建（含 `source_order_id`）；mes 报工 → `MesWorkReportSubmitted` → erp 进度更新。
3. **DLQ 兜底验证**：人为停用消费方，事件入 DLQ 可重投，恢复后按幂等键收敛。
4. **环 3 回归**：`/users/me/preferences` GET/PUT 走本地表；停掉 portal 不影响偏好接口；portal 偏好代理读 unified-core 成功。
5. **全量回归**：erp↔hrm（通讯录、工资→凭证）、erp↔mes（订单下达、报工进度）六链路 e2e 绿；`cargo check --workspace` 0 错误；既有事件订阅方（ehs 订阅 HrmEmployeeCreated 等）不受影响。
6. **文档对齐**：`event-driven.md` 事件清单含新增 4 类事件（域前缀 + 版本）；ENTRY/报告环条目标注"已消除"。

## 7. 风险与回退

| 风险 | 缓解 |
|---|---|
| 事件丢失/重复导致数据不一致 | Redis Stream 消费组 + XACK + DLQ + 事件版本 + 幂等键（复用既有机制）；U2.1/U2.2 单测覆盖幂等重放 |
| 凭证/工单/进度事件化后出现时序问题（如凭证晚于报表） | 工资凭证与报表解耦（报表在凭证生成后由事件驱动）；必要时按 `payroll_run_id` 做事件重放补齐 |
| 环 3 迁移遗漏（portal 侧仍写旧偏好表） | 迁移后对旧表只读冻结 + grep 旧表名零写入；双写过渡 1 个版本后切换 |
| 事件命名漂移（ERP-04 无 Erp 前缀先例） | U2.5 统一按"域前缀 + 动作"命名（ErpProductionOrderDispatched / MesWorkReportSubmitted / HrmPayrollPosted），并同步修正既有事件命名 |
| 过渡期裸 reqwest 无超时放大故障 | U2.4 补 30s 总超时（防御补丁，随 U2.1-U2.3 完成可移除） |

**回退路径**：事件化按方向独立提交——任一方向可单独 revert 回 HTTP 调用（spawn 代码保留在 git 历史）；环 3 本地化可在迁移前双写（本地表 + portal 同步），验证后切流量，回退仅需切回代理；全程无数据迁移风险（事件化不搬表，环 3 偏好表迁移量小且可反向）。

---

## 8. 实施状态（2026-10-03）

> 本节为 R3「文档与实现对齐闭环」追加，记录 D2 三环消除落地的最终 commit、R2 实测结果与偏差；不改动上文决策内容。

- **方案要点**：逐环定策——环1 erp↔hrm = C（hrm→erp 凭证改 `HrmPayrollPosted` 事件，erp→hrm 通讯录只读 HTTP 保留）；环2 erp↔mes = A（双向事件化）；环3 portal↔unified-core = C（偏好本地化 `core.user_preferences`，portal 只读代理）。
- **实施 commit**（阶段 2 U2，四提交）：
  - `a1c4e8a01` 地基：新增 4 类事件类型 + `event-driven.md §3.11` 登记；
  - `173622037` 环1：hrm 工资凭证改发 `HrmPayrollPosted`，erp 幂等守卫；
  - `18077bf45` 环2：`ErpProductionOrderDispatched`→mes 建单、`MesWorkReportSubmitted`→erp 更新进度；
  - `269d37d44` 环3：偏好本地化 core.user_preferences，portal 只读代理。
- **验证结果**：
  - 代码侧：4 类事件在 `lib/shared-event/src/event/event_types.rs:191-203` 落地（含 Payload 结构与 roundtrip 测试）；环边 HTTP 残留 = 0（`hrm/payroll.rs:959`、`erp/production_order.rs:515`、`mes/work_report.rs:612` 现仅注释）；shared-event 360 passed + 3 ignored（R1）；门禁 PASS。
  - R2 真 PG 实测（`38232be15`）：链① 工资→凭证 **PASS**（事件到达 + NUMERIC 借贷平衡 10000.0000 + 同 run_id 幂等跳过）；链③ 报工→进度 **PASS**（进度 0→50.00 + 幂等账本恒 1 行）。
- **偏差/残留**：
  - **链② 订单→工单 FAIL（R2 回归 bug）**：`svc/mes/src/event_handlers.rs:62,112` 把 `erp_order_id` 以 text 绑定 uuid 列，`ErpProductionOrderDispatched` 全失败——R2 在真 PG 上首次暴露（TODO 原注「DB 级幂等仅代码论证」）。建议 bind 改 `Uuid`。登记入总览残留待办。
  - `IamUserPreferencesUpdated` 仅定义未实发（AppState 无 event_publisher），环3 订阅接线待补。
  - **DLQ 兜底 R2 未触发**：两起真实 handler Err（链②/链④）均被 ACK，`topems:dlq:*` 为空——D2 DLQ 设计 vs 实测行为不一致，待编排核查。
  - erp→hrm 通讯录只读 HTTP 边按决策 C 保留（单向、非环）；运行时拓扑矩阵 CSV 仍列旧双向环边，待 R4 在线 `--collect` 重生成。
