# Integration 跨域联动治理蓝图（直写 → API 编排）

> 2026-08-31 · 为物理库拆分前置条件 #1（integration 跨域事务直写）铺路
> 关联：`docs/architecture/database-split-plan.md` §3 阶段 2 拆分前置条件

## 1. 现状审计（2026-08-31 代码核查）

**关键事实**：integration 的跨 schema 直写**全部集中在 `svc/integration/src/qms_lims_ehs.rs`**，且该模块**从未接线**（`process_event` 无任何调用点，事件总线未触发）。integration 的活跃跨域联动在 `event_handlers/`（仅 `record_sync_log` 记录同步日志，**无直写**，合规）。

| # | handler（qms_lims_ehs.rs） | 直写目标 | 引用有效性 | 门禁 allow |
|---|---|---|---|---|
| 1 | handle_qms_inspection_completed | `INSERT lims.qa_lab_samples` | ✅ 表有效 | lims |
| 2 | 同上 | `INSERT lims.qa_lab_tasks` | ✅ 表有效 | lims |
| 3 | handle_ehs_hazard_reported | `INSERT qms.qa_corrective_actions` | ✅ 表有效 | qms |
| 4 | handle_ehs_accident_reported | `INSERT lims.qa_lab_samples` | ✅ 表有效 | lims |
| 5 | 同上 | `INSERT lims.qa_lab_tasks` | ✅ 表有效 | lims |
| 6 | handle_lims_record_completed | `UPDATE qms.qa_quality_inspections SET test_result/test_data/conclusion` | ❌ **字段错误**——qms 表无 test_result/test_data/conclusion 列（仅有 result 列） | qms |

**结论**：
- 6 处直写是**设计意图但未生效**的跨域联动（QMS 完成→LIMS 建样/任务、EHS→QMS 纠正措施、LIMS 完成→QMS 结果回写）。
- 其中 1 处（#6）SQL 引用不存在的列，**运行必失败**——佐证模块从未执行。
- 现有 qms/lims 服务 API **语义不匹配**直写：API 自动生成 sample_no/action_no（integration 需指定幂等键）、lims create_task 需 sample_id（integration 只有 sample_no）、qms 无"检验结果回写"端点。

## 2. 目标形态（为拆分铺路）

integration 跨域联动**全部改为服务 API 编排**（reqwest，复用现有 `QMS_SERVICE_URL`/`LIMS_SERVICE_URL` env 约定 + mes_erp_sync 模式），消除 `integration.allow=['qms','lims']`。拆分后各域独立库，integration 不依赖跨库事务。

## 3. 分步实施（每步可独立验证）

### 步骤 A：服务侧集成端点完备（qms/lims）
| 服务 | 需补端点 | 承接语义 |
|---|---|---|
| lims | `POST /api/lims/samples/integration`（支持外部 sample_no 幂等） | 直写 #1/#4 |
| lims | `POST /api/lims/tasks/integration`（支持按 sample_no 关联，不强制 sample_id） | 直写 #2/#5 |
| qms | `POST /api/qms/actions/integration`（支持外部 action_no 幂等） | 直写 #3 |
| qms | `POST /api/qms/inspections/{inspection_no}/result`（回写 result 字段，替代不存在的 test_result） | 直写 #6（同时修正字段错误） |

> 幂等设计：集成端点接受外部业务单号（sample_no/action_no/inspection_no），`ON CONFLICT ... DO UPDATE` 保持与现直写语义一致。

### 步骤 B：qms_lims_ehs.rs 重写（直写 → reqwest）
- 6 处 `only_own_schema_query!` 跨 schema 直写 → `reqwest::Client` 调步骤 A 端点（复用 `QMS_SERVICE_URL`/`LIMS_SERVICE_URL` env）。
- #6 字段修正：`test_result/test_data/conclusion` → qms `result` 列语义（经新端点）。
- handler 签名保持（`pool, tenant_id, payload`），URL 从 env 读取（与 mes_erp_sync 一致）。

### 步骤 C：接线（跨域联动真实化）
- 将 `process_event` 接入 integration 事件订阅（`event_handlers` 的 `start_event_subscribers` 或共享事件订阅器），订阅 `QmsInspectionCompleted`/`QmsQualityIssueCreated`/`EhsHazardReported`/`EhsAccidentReported`/`LimsInspectionAbnormalDetected`/`LimsRecordCompleted`/`LimsReagentAlert`。
- 失败语义：handler 返回 Err → 事件重试/进 DLQ（已有 Redis Stream + DLQ 基础）。

> **已实施（2026-08-31）**：`event_handlers/mod.rs` 的 `build_subscriber` 追加 7 个领域事件订阅 → `handle_cross_domain_event` → `qms_lims_ehs::process_event` 统一调度（tenant_id 从 payload 取，缺失 nil 占位——步骤B后 handler 已不依赖）。
> **发布端现状**：全部 7 事件发布端已补齐（2026-08-31）——
> - QmsQualityIssueCreated（qms quality_issue.rs）、QmsInspectionCompleted（qms approve 分支）
> - EhsHazardReported（ehs hazard.rs）、EhsAccidentReported（ehs report_accident）
> - LimsInspectionAbnormalDetected（lims submit_result 结论非合格）、LimsRecordCompleted（lims submit_result 同点，related_inspection_no=None——qa_lab_tasks 无关联）、LimsReagentAlert（lims create_reagent 过期检测）
> **备注**：handler 6（LimsRecordCompleted→QMS 回写）已加空值保护——无关联 QMS 检验单时跳过（qa_lab_tasks 目前无 related_inspection_no 关联）。
> **端到端验证**：XADD 至 `topems:stream:events:QmsQualityIssueCreated`（字段 `payload`=Event JSON，publisher 用 payload 字段名）→ integration 订阅消费 → process_event → handler → reqwest 调 ehs `/api/internal/ehs/hazards/integration` → ehs.qa_ehs_hazards 落库 `HAZ-QMS-*` ✅。测试数据已清理。

### 步骤 D：门禁收紧
- 步骤 B 完成后移除 `integration.allow=['qms','lims']`（`schema_boundary.json`），门禁 integration PASS 且跨 schema 直写清零。
- 白名单从 2 项 → 1 项（仅 unified-core→portal 设计性只读）。

## 4. 风险与回退

- **事务语义**：现直写无事务包装（单条 INSERT/UPDATE），改 API 后语义等价（单请求）；失败由事件重试承担，无原子性损失。
- **回退**：步骤 A/B/C 各自独立提交，任一回归可回滚单步；步骤 C 前跨域联动保持"未接线"（当前行为不变）。
- **测试**：步骤 A 端点用 `cargo test -p topems-lims/topems-qms` 验证；步骤 B 用 integration 编译 + 门禁验证；步骤 C 依赖事件总线冒烟（已有 event_bus_smoke.rs 基础设施）。

## 5. 状态

- [x] 步骤 A：服务侧集成端点（lims×2 + qms×2）
- [x] 步骤 B：qms_lims_ehs 直写 → reqwest（含 ehs×2 端点 + 撤销 integration allow，白名单 2→1）
- [x] 步骤 C：process_event 接线（7 事件订阅 + 端到端验证通过；**7 事件发布端全部补齐**）
- [x] 步骤 D：撤销 integration allow（白名单 2→1）
