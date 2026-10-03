# integration 跨域数据直写归属与假同步处置决策（D3 架构优化实施）

> 状态：✅ 决策已出（2026-10-02）· 归属：TODO.md「🚧 架构优化实施（2026-10-02）」阶段 0 · 关联：[D1 unified-core 目标形态决策](./decision-d1-unified-core-architecture.md)、[D2 调用环消除策略决策](./decision-d2-call-cycle-elimination.md)、[跨域集成 API](./integration-cross-domain-api.md)、[事件驱动架构](./event-driven.md)
> 依据：架构分析报告 `TOPEMS-架构分析报告-2026-10-02.md`（F-09/F-10 等）+ `docs/audit/arch-analysis/WMS.md`（WMS-01/02/03）+ `CORE.md`（CORE-02）。本文档所有路径与行号为 2026-10-02 实测。

## 1. 背景与决策问题

`svc/integration` 被设计为**跨域同步中枢**（integration-cross-domain-api.md 声称已完成"步骤 B：直写→reqwest、步骤 D：撤销 allow"），但实测存在两类问题：

1. **9 处跨 schema 直写**：`svc/integration/src/qms_lims_ehs.rs` 内 7 个业务事件 handle 共 9 处 `INSERT/UPDATE qms.*`/`ehs.*` 直写（含 `only_own_schema_query!("integration", SQL, "qms")` 显式跨库宏），且**这 7 个 handle 均未在 `event_handlers/mod.rs` 接线**——直写代码从未实际运行（死代码），但一旦接线即绕过 qms/ehs 服务直接写他人 schema。
2. **data_sync 假同步**：`svc/lims`、`svc/ehs`、`svc/wms` 的 data_sync 模块"读取对方服务 URL → 打日志 → **从不发起 HTTP** → 编造成功响应 → 本地插入 status=completed 的 sync_records 记录"，用户点"同步"得到虚假成功反馈，真实数据从未传输。

**决策问题**：(a) integration 的 9 处直写归属如何处置——改走服务 API/事件、下沉共享库、还是维持白名单基线？(b) 假同步如何处置——真实现、移除、还是标记废弃？该决策决定 TODO.md 阶段 2 U3（integration/DB 归属改造）的拆解方式。

## 2. 现状盘点（2026-10-02 实测）

### 2.1 integration 9 处直写完整清单（逐条核验）

| # | 行号 | SQL 目标 | 所属 handle 函数 | 数据方向 |
|---|---|---|---|---|
| 1 | `qms_lims_ehs.rs:26` | `INSERT INTO qms.qa_lab_samples` | handle_qms_inspection_completed | LIMS 检验结果 → QMS 样品登记（写） |
| 2 | `qms_lims_ehs.rs:39` | `INSERT INTO qms.qa_lab_tasks` | handle_qms_inspection_completed | → QMS 检验任务（写） |
| 3 | `qms_lims_ehs.rs:80` | `INSERT INTO qms.qa_ehs_hazards` | handle_ehs_hazard_reported | EHS 隐患 → QMS 隐患（写） |
| 4 | `qms_lims_ehs.rs:136` | `INSERT INTO qms.qa_corrective_actions` | handle_ehs_accident_reported | EHS 事故 → QMS 纠正措施（写） |
| 5 | `qms_lims_ehs.rs:174` | `INSERT INTO qms.qa_lab_samples` | handle_lims_inspection_abnormal | LIMS 异常 → QMS 样品（写） |
| 6 | `qms_lims_ehs.rs:196` | `INSERT INTO qms.qa_lab_tasks` | handle_lims_inspection_abnormal | → QMS 检验任务（写） |
| 7 | `qms_lims_ehs.rs:244` | `INSERT INTO qms.qa_ehs_hazards` | handle_lims_record_completed | LIMS 记录 → QMS 隐患（写） |
| 8 | `qms_lims_ehs.rs:274` | `UPDATE qms.qa_quality_inspections` | handle_lims_record_completed | LIMS 记录 → QMS 检验状态（写） |
| 9 | `qms_lims_ehs.rs:315` | `INSERT INTO ehs.qa_ehs_alerts` | handle_lims_reagent_alert | LIMS 试剂告警 → EHS 告警（写） |

目标 schema：**qms（8 处，5 张表）+ ehs（1 处，1 张表）**。全部为**写**（无读）。全部在事件处理函数内（`qms_lims_ehs.rs:13,54,99,154,211,262,291` 七个 `pub async fn handle_*`）。

**接线实况（关键）**：`svc/integration/src/event_handlers/mod.rs:26,30,34` 只 `subscribe_handler` 了 **3 个 Triggered 事件**（QmsToLimsSyncTriggered / EhsToQmsTriggered / LimsToEhsTriggered），对应 3 个 trigger handler；**7 个业务事件 handle（含全部 9 处直写）未注册任何订阅**——直写代码是"已写未接线"的死代码，当前不会执行。且 3 个已接线的 trigger handler 实现（`event_handlers/mod.rs:99-135`）**也只写日志 + 本地 `record_sync_log`（status=triggered），不发起任何 HTTP、不做任何同步**。

### 2.2 data_sync 假同步完整机制（逐条核验）

| 服务 | 位置 | 机制（实测） |
|---|---|---|
| lims | `svc/lims/src/modules/data_sync.rs:255-268`（record_to_qms） | 读 `QMS_SERVICE_URL` → `tracing::info!("Syncing record {} to QMS at {}")` → **无任何 HTTP 调用** → 构造假响应 `{"target_service":"qms","target_inspection_id":<新UUID>,"synced_at":...}` → `INSERT INTO qa_lims_sync_records (..., status='completed', response=<假响应>)` |
| ehs | `svc/ehs/src/modules/data_sync.rs:254-265`（hazard→QMS） | 读 `QMS_SERVICE_URL` → debug 日志 → **无 HTTP 调用** → 假响应 `{"target_issue_id":<新UUID>,"rectification_created":true,...}` → status=completed 本地插 sync_records |
| wms | WMS 分片 WMS-03 同机制 | 读对方 URL → 无请求 → 本地"成功"记录 |

**影响**：① 用户触发"同步"得到虚假成功（无真实数据流）；② sync_records 成为**脏数据源**（completed 记录不可信，无法区分真假同步）；③ 与 integration-cross-domain-api.md 声称的"已改造为 reqwest 编排"严重不符。

### 2.3 关联发现：qa_lab_* 表物理归属混乱（实测，超出原报告范围）

- 迁移 `database/migrations/20260903000001_rehome_5433_remaining_public.sql:687-691`（2026-09-03）：`ALTER TABLE public."qa_lab_samples" SET SCHEMA lims`——rehome 迁移把表从 public 移到 **lims** schema。
- 迁移 `database/migrations/20260908000018_rls_force.sql:206,296`：RLS 策略同时引用 **`lims.qa_lab_samples` 与 `qms.qa_lab_samples`**——两个 schema 下都存在该表。
- lims 代码 `svc/lims/src/modules/inspection_task.rs:363`：`SELECT ... FROM public.qa_lab_samples`——lims 业务实际仍读 **public**。
- **结论**：`qa_lab_samples`（及同类 qa_lab_*）物理位置在 public / lims / qms **三处并存/引用混乱**。integration 直写 `qms.qa_lab_samples` 可能写入的是与 lims 业务实际使用的表（public）**不一致的另一张表**——直写不仅绕过 API，还存在**写错表/双表分叉**风险。

## 3. 关键前置事实核对结论（写入决策依据）

| 核对项 | 结论（实测） |
|---|---|
| 9 处直写的目标与方向 | 全写、无读；qms 5 表 + ehs 1 表；全部位于**未接线的业务事件 handle** 内（当前不执行） |
| 被直写 schema 归属 | qms/ehs schema 由 qms/ehs 服务拥有；但 qa_lab_* 表**逻辑业务维护在 lims**（lims 模块引用同名表），物理位置三处混乱（§2.3）——直写"写错表"风险成立 |
| 可替代 API 路由 | **qms 已提供 corrective actions API**：`svc/qms/src/modules/corrective_action.rs:394-401`（POST /actions 等 CRUD）；**qms 无 lab_samples/lab_tasks 业务模块**（qms/src/modules/ 下无 lab 相关模块，见模块清单 apqp/audit/corrective_action/dashboard/data_sync/eight_d/fmea/integration/quality_cost/quality_dashboard/qms_plugin）；**ehs 无 alerts/hazards 接收 API**（grep 无命中）——改造需**补充 API 或明确归属方** |
| 直写是否绕过权限/校验 | 是：绕过 qms/ehs 服务的行级校验/业务规则；绕过服务间认证（integration 直连 DB 凭据）；仅受 `only_own_schema_query!` 显式白名单放行（`qms_lims_ehs.rs:26,39,80,...` 的第三个参数 "qms"） |
| 假同步是否真实存在消费方 | **否**：qms/ehs 侧无接收 API、integration 业务事件 handle 未接线、Triggered handler 不真同步——数据从未到达目的地，消费方=0 |
| 事件总线承载 | 能。integration 本身是事件订阅方；Redis Stream 机制齐备（D2 §2.5 同源）；LIMS 相关业务事件（LimsRecordCompleted 等）已在总线上，可直接复用 |
| 与 D1 联动 | unified-core 瘦身不影响 integration（integration 是独立服务、非 unified-core 模块）；瘦身后 integration **仍是唯一跨域同步中枢**，其职责应限定为"编排方（走 API/事件）"而非"数据方（直写 DB）" |
| 与 D2 联动 | integration 纯出向（ENTRY §5b:193-198 integration→erp/lims/mes/qms/scm/wms，无入向 HTTP），**不构成调用环**；假同步与 D2 环事件化同属"跨域数据流改走事件/API"治理，机制同源可并行 |

## 4. 决策选项分析

### 4.1 直写改造（integration 9 处）

- **选项 A 改走服务 API/事件**：接线 7 个业务事件 handle 时**不执行直写**，改为调用 qms/ehs 的服务 API 或发布/订阅事件。qms corrective actions → `POST /api/qms/.../actions`（路由已存在，`corrective_action.rs:396`）；qa_lab_* → 先仲裁表归属（§2.3），由归属方（lims 或 qms）补充接收 API；ehs alerts → ehs 补 API 或改为订阅现有 LimsReagentAlert 事件（ehs 已订阅 LimsInspectionAbnormalDetected，WMS 分片确认）。
  - 工作量：中（补 2-3 个接收 API + 改造 7 个 handle 接线逻辑）
  - 风险：低-中（API 补充期间直写保持不接线即无运行风险；表归属仲裁是前置条件）
- **选项 B 数据访问下沉共享库**：把 qms/ehs 表访问封装进共享库供 integration 调用——**不适用**：共享库解决"共享读"，写仍需走服务（校验/业务规则），且不解决"写错表"与绕过校验问题。
- **选项 C 维持直写白名单基线**：把 9 处直写登记为已知 FAIL 基线（schema_boundary allow 保留），阶段 2 U3 后转绿——**仅作过渡**，不解决绕过校验、双表分叉、归属混乱，长期不可接受。
- **推荐：选项 A**（详见 §5）。

### 4.2 假同步处置（lims/ehs/wms data_sync）

- **选项 A 真实现**：补真实 HTTP/事件发送（lims→qms 等）。适用条件：目标方有接收 API 或事件订阅器、同步链路有真实业务价值。当前 qms/ehs 侧无接收 API、消费方=0（§3），真实现的**前置成本高且收益未验证**——若产品确认"手动同步"是必需交互，走"发布业务事件到总线 + 目标方订阅"（复用 D2 机制），而非补 HTTP。
- **选项 B 移除假同步代码**：删除 lims/ehs/wms data_sync 的"编造成功"路径（读 URL + 假响应 + completed 记录），同步按钮 UI 改为显式"同步通道未启用"提示或禁用。消费方=0 时最干净，清除脏 sync_records 数据源。
- **选项 C 标记废弃并文档化**：保留代码、标 `#[deprecated]` + 文档说明"未启用"，sync_records 记录标记为不可信。适合"有历史原因暂不可删"的中间态。
- **推荐：选项 B 为主、C 作过渡**（详见 §5）。

## 5. 推荐与理由（逐项明确）

### 5.1 直写改造：**选项 A（改走服务 API/事件）**

理由：
1. **9 处直写当前是死代码（未接线）**，改造窗口无运行风险——接线时直接按"API/事件"实现，不引入直写。
2. qms 已有 corrective actions API 可直接复用；qa_lab_* 的表归属混乱（§2.3）**必须仲裁后**由归属方补 API——这同时解决"写错表"风险，是本次改造的最高价值点。
3. 与 integration 定位一致：**编排方走 API/事件，不做数据方**；与 integration-cross-domain-api.md 声称的"直写→reqwest"方向吻合（文档描述的是目标，代码未完成——本次把它真正落地）。
4. 与 D2 同源：事件化是已验证模式（LIMS 业务事件已在总线），不引入新机制。

**前置条件**：qa_lab_* 表归属仲裁（public/lims/qms 三处收敛为一处；lims `inspection_task.rs:363` 的 public 引用修正）——作为 U3 子任务先行。

### 5.2 假同步处置：**选项 B（移除）为主，选项 C 作过渡**

理由：
1. **消费方=0（实测）**：qms/ehs 无接收 API、integration 业务事件未接线、Triggered handler 不真同步——假同步的"同步目标"根本不存在，真实现无对象可同步。
2. **假数据污染真实风险**：`status=completed` 的 sync_records 脏记录会误导运维与审计（无法区分真假同步），移除即清除污染源。
3. 若产品确认"手动同步"是必需交互：走"发布业务事件 + 目标方订阅"（选项 A 的变体，复用 D2 机制），**不补 HTTP**（目标方 API 尚不存在，事件化成本更低且与 D2 一致）。
4. 过渡期若暂不可删：标 `#[deprecated]` + 文档"未启用"，sync_records 增加 `is_fake` 标记（选项 C），但**终态为 B**。

## 6. 实施路径与验收标准（对应 TODO.md 阶段 2 U3）

### U3 integration/DB 归属改造（依赖 D3）

| 步骤 | 内容 | 入口 |
|---|---|---|
| U3.1 | **qa_lab_* 表归属仲裁**：盘点 public/lims/qms 三处同名表现状（rehome 迁移 + RLS 迁移 + lims 代码引用），确定唯一归属 schema（建议 lims，因逻辑业务在 lims）；迁移收敛 + 修正 lims `inspection_task.rs:363` 的 public 引用 | `database/migrations/20260903000001_rehome_5433_remaining_public.sql:687-691`、`20260908000018_rls_force.sql:206,296`、`svc/lims/src/modules/inspection_task.rs:363` |
| U3.2 | **补接收 API**：qms 补 lab_samples/lab_tasks 接收 API（或确认归属方后由 lims 提供）；ehs 补 alerts 接收 API（或改为事件订阅 LimsReagentAlert） | qms/ehs 模块路由（参照 `svc/qms/src/modules/corrective_action.rs:394-401` 模式） |
| U3.3 | **改造 7 个 handle 接线**：`qms_lims_ehs.rs` 的 7 个业务事件 handle 注册订阅，内部**删除 9 处直写**，改为调 §U3.2 的 API 或事件传递；失败进 DLQ | `svc/integration/src/qms_lims_ehs.rs:26,39,80,136,174,196,244,274,315`、`event_handlers/mod.rs` |
| U3.4 | **撤销 allow**：`scripts/schema_boundary.json` 移除 integration 对 qms/ehs 的 allow 登记 | `scripts/schema_boundary.json`（integration allow=['qms','ehs'] 段） |
| U3.5 | **假同步处置**：删除 lims/ehs/wms data_sync 的"编造成功"路径（读 URL + 假响应 + completed 记录）；同步按钮 UI 提示"通道未启用"或改事件发布；历史 sync_records 标记 `is_fake` 或清理 | `svc/lims/src/modules/data_sync.rs:255-268`、`svc/ehs/src/modules/data_sync.rs:254-265`、wms 同模块 |
| U3.6 | **文档回写**：integration-cross-domain-api.md 标注"步骤 B/D 已真正落地（2026-10）"；WMS/报告 F-09/F-10 条目标注已修复 | — |

**验收标准（可测量）**：

1. **integration 对 qms/ehs schema 直写数 = 0**：`grep -c "INSERT INTO qms\.\|INSERT INTO ehs\.\|UPDATE qms\." svc/integration/src/` = 0（除注释）；`only_own_schema_query!(...,"qms"/"ehs")` 调用 = 0。
2. **7 个业务事件 handle 接线且走 API/事件**：`event_handlers/mod.rs` 含 7 个 `subscribe_handler` 注册；e2e 验证：LIMS 检验完成事件 → qms/lims API → 检验任务创建成功（非直写）。
3. **schema_boundary 门禁转绿**：integration allow=['qms','ehs'] 移除后门禁零 FAIL。
4. **qa_lab_* 归属单一**：迁移后同名表仅存于唯一 schema（grep 三处引用归零）；lims `inspection_task.rs:363` 引用修正。
5. **假同步清除**：lims/ehs/wms data_sync 无"编造成功"路径（grep 假响应构造 = 0）；sync_records 无新增 completed 假记录；同步按钮 UI 行为明确（提示或事件化）。
6. **全量回归**：qms/ehs/lims 既有 API 与事件链路不受影响；`cargo check --workspace` 0 错误；integration 编排链路（integration→erp/mes 等既有 reqwest 边）不变。

## 7. 风险与回退

| 风险 | 缓解 |
|---|---|
| qa_lab_* 表归属仲裁误判（收敛错 schema） | U3.1 先行盘点（3 处引用 + 迁移历史），以"逻辑业务维护方"为准（lims）；收敛后全量回归 lab 链路 |
| 补 API 期间旧链路（若有）中断 | 直写当前未接线（死代码），补 API 与接线同批完成；接线前保持不订阅，无运行风险 |
| 假同步移除影响 UI 预期 | 移除前 UI 同步按钮改"通道未启用"提示；若产品要求保留交互，走事件发布（§5.2 变体） |
| 事件接线后直写残留（部分 handle 漏改） | 验收项 1/2 双重门禁（grep 零直写 + 接线清单核对） |

**回退路径**：U3.3 按 handle 分批接线（每批可独立 revert）；U3.1 表归属收敛可先建新表复制数据再切（保留原表至验证）；U3.5 假同步移除前 git 保留（恢复 = revert 单文件）；全程无破坏性数据操作。

---

## 8. 实施状态（2026-10-03）

> 本节为 R3「文档与实现对齐闭环」追加，记录 D3 直写改造、假同步处置与 qa_lab 归属仲裁的最终落地状态；不改动上文决策内容。

- **方案要点**：9 处直写 → qms/ehs/lims HTTP 编排 + 7 业务事件接线（选项 A）；假同步入口下线（选项 B 为主）；撤销 integration 对 qms/ehs 的 allow。
- **实施 commit**（阶段 2 U3 + U3b）：
  - `9b1f7c7d1` U3：9 处跨 schema 直写改 HTTP 编排 + 7 业务事件接线；
  - `292298e75` U3：qms/ehs/lims internal 集成端点挂路由 + qa_lab_tasks 显式 public；
  - `3bec2a840` U3：lims/ehs data_sync 假同步入口下线（`data_sync.rs:217-218,240` 注释声明不再写脏 completed 记录）；
  - `61fbf68ac` U3 收尾：撤销 integration 白名单（直写=0 后）；
  - U3b 步骤1 `4e2886840`：lims 18 处无前缀引用显式化 `public.qa_lab_*`；
  - U3b 步骤2 `9b2c3a7aa`：DROP `qms.qa_lab_*`/`lims.qa_lab_*` 骨架表 + 从 `schema_defense.rs` 移除条目。
- **验证结果**：integration 对 qms/ehs schema 直写 = 0（`grep` 仅余 `qms_lims_ehs.rs:4` 历史说明注释）；integration 白名单撤销后双门禁 exit 0。
- **关键偏差（qa_lab_* 归属）**：上文 §2.3/U3.1 原建议收敛到 **lims**（逻辑业务维护方）。**实测终态为 public 唯一事实标准**——09-21 cleanup 迁移已补建 public 14 列标准表、lims 全部读写 public、qms 零引用；用户拍板选 **方案 B**（迁移收敛），经 U3b 步骤1/2 落地：qms/lims 空骨架表已 DROP，lims `models/mod.rs` 等 18 处无前缀引用显式切到 public。即 D3 建议的「lims 归属」被后续迁移链事实推翻，以 public 为准。
- **偏差/残留（R2）**：
  - **链④ 质量链编排 FAIL**：integration 按 D3 契约调裸路径 `/api/internal/*`，但 lims/ehs/qms 把 internal 路由嵌在 service api_prefix（`/api/lims` 等）下，实测拼接路径 `/api/lims/api/internal/lims/samples/integration` 才 200——**路径契约回归**，需统一 D3 契约与各服务挂载方式。
  - 落库再被 `ck_qa_lab_samples_status_standard` 窄约束拦（status='registered'）——系统性 `ck_*_status_standard` 漂移，见总览残留待办。
  - 历史脏 sync_records 未清洗（需另出迁移）；HTTP 编排链路 e2e 待 R4 环境（nginx/portal 在线）复测。
