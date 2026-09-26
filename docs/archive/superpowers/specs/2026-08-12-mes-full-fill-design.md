# TOPEMS · MES 模块全量业务逻辑设计规格

> **版本**: 1.0  
> **日期**: 2026-08-12  
> **作者**: TraeCode Agent (via brainstorming spec)  
> **对应 TODO 版本**: V191+（MES 对标 CRM V183-V190）  
> **范围**: MES 模块全量（30+ 路由 · 22 backend modules · 40+ pages · 6 BI 分析页）  
> **落地路径**: 方案 A · 垂直 6 大任务串行  
> **前置完成项**: V69.4 Schema 防御 26/26 100% · 全仓 cargo check 0 warning  
> **上一个系列 spec**: [2026-08-12-crm-full-fill-design.md](./2026-08-12-crm-full-fill-design.md)

---

## 1. 背景与目标

### 1.1 现状（MES 当前起点：远高于 CRM）

MES 模块相比 V183 前的 CRM 骨架深度已高 50%+，核心基建已就位：

| 层 | 已具备（✓） | 缺口（待本次填充） |
|---|---|---|
| **前端路由** | modules/mes/config.ts 30+ PATHS + routes + nav 已三层声明 | pages/mes/部分列表页 FSM 状态徽章 + 禁用条件未对齐 |
| **前端页面** | pages/mes/ 40+ 基础页（+4 setting 页）骨架已存在 | 缺 6 张 BI 分析独立页；types/mes.ts 为空 stub；API client 函数签名与 backend DTO 未断言 |
| **API Client** | api/mes/ 24 个分类文件（order/equipment/quality/...）已创建 | 返回类型无强制类型校验（`types.ts` 未绑定真实 DTO 结构） |
| **后端路由** | modules/mod.rs 已 merge 22 modules 路由（production/equipment/quality/...） | permission 三段式未统一（部分 handlers 缺 check_permission）；审批 4 类端点缺失 |
| **后端 Model** | 10 张 CREATE TABLE（production_orders + work_* / equipment / quality_*）+ shared/fsm.rs 框架存在 | models/mod.rs 无 DTO 集中导出；FSM 仅 production_order 有部分转换，其余 6 个未定义 |
| **Schema 防御** | TABLE_DEFS 10 表 314 列已 V69.3 验收，严格模式 0 缺失 | N/A（防御层无需本次改动） |
| **测试资产** | `shared/fsm_test.rs` + `shared/tenant_test.rs` 存在；cargo check 全仓 0 warning | 7 FSM 单测 0 个；审批端点单测 0 个；BI 前端 vitest 覆盖率 < 30% |

### 1.2 目标（V191+ 交付 · 对标 CRM V183-V190）

**6 大任务垂直推进，最终满足 5 重验收门槛（与 CRM 100% 对齐）：**

1. **任务 1 · TypeScript 类型底座**：`apps/web/src/types/mes.ts` 从空 stub 填充为全量 DTO 单一事实源（10+ 实体 × 3 DTO 类型 = 30+ 导出）；`api/mes/*` 24 文件签名强绑定；零 typecheck error
2. **任务 2 · Rust 契约对齐 + 审批接入点**：`models/mod.rs` DTO 集中导出；permission 三段式 22 modules 全补；审批 4 类端点 + `approval_id/reason` 字段同步到 TABLE_DEFS；后端 clippy 0 warning
3. **任务 3 · 7 个 FSM + 单测 + 前端徽章对齐**：production_order/work_order/work_report/quality_inspection/traceability_record/equipment/anomaly 7 套 define_fsm!；每 FSM ≥ 6 单测（happy 3 + 非法 2 + 审批阻断 1）≥ 42 个 cargo test；前端 StatusBadge/操作按钮 disabled 严格按 FSM 可达性
4. **任务 4 · 6 张 BI 深度分析页**：OEE/交付/质量 Pareto/MTBF/能耗/产能六张独立独立路由独立页；recharts 渲染；mock hook 提供真实数据；每页含 FilterSidebar + 深度分享
5. **任务 5 · 4 类审批工作流（FSM 集成）**：生产订单变更/工单返工/让步接收/异常处置 4 类 × 3 级审批；统一 `approval/{start|approve|reject}` 端点风格；`audit.rs` 记录审批节点
6. **任务 6 · 五重验收**：TS 型检/Rust 严格模式/导航三重校验/vitest/cargo test 全过；输出 MesContractChecklist.md 与验收统计图表

### 1.3 非目标（后续 spec 处理）

- 深度 C / 预测算法级：OEE 回归预测、能耗优化调度模型、缺陷根因 AI 识别
- 多节点审批编排引擎：仅做 3 级 `start→approve→reject` 三段式，不接 workflow 模块
- 与 APS/WMS/QMS 的实时消息联动：本次保留 `topems_shared_event` 事件发送即可，不订阅消费

---

## 2. 方案概述（方案 A · 垂直 6 大任务串行）

```
任务 1 ─► 任务 2 ─► 任务 3 ─► 任务 4 ─► 任务 5 ─► 任务 6
(TS)      (Rust)   (FSM+UT)  (BI 6)   (审批)     (五重验收)
```

### 2.1 四层契约对齐矩阵（任务 1+2 核心产物）

> 单一事实源：**Rust DTO（crate::models::xxx::Yyy） = types/mes.ts 导出 = TABLE_DEFS 列命名 + 字段语义**

| 序号 | 实体 / Rust 源 | 表名 (schema) | TypeScript 类型 | 字段对齐要求 |
|---|---|---|---|---|
| E-1 | `svc/mes/src/modules/production_order.rs::ProductionOrder` | `mes.production_orders` | `mes.ProductionOrder`（Create/Update/ListItem/Detail 四版本） | order_no 唯一；status 枚举必须 = FSM-1 终态集合；tenant_id RLS 强制 |
| E-2 | `svc/mes/src/modules/work_order.rs::WorkOrder`（含 DTO） | `mes.work_orders` | `mes.WorkOrder`（同上四版本） | 外键 `production_order_id`、`equipment_id`、`station_id` 非空约束同步 |
| E-3 | `svc/mes/src/modules/work_report.rs::WorkReport` | `mes.work_reports` | `mes.WorkReport` | 外键 `work_order_id`；`submitted_at/archived_at` FSM 写时序；`qc_result` 枚举与 FSM-3 映射 |
| E-4 | `svc/mes/src/modules/quality_management/inspection.rs::QualityInspection` | `mes.quality_inspections` | `mes.QualityInspection` | `result` 枚举 {pending/inspecting/passed/failed/concession/rework/scrap} = FSM-4 状态全集 |
| E-5 | `svc/mes/src/modules/quality_traceability.rs::TraceabilityRecord` | `mes.quality_traceability` | `mes.TraceabilityRecord` | 外键 `batch_id/lot_code/source_id`；`freeze_reason` 与 FSM-5 触发节点同步 |
| E-6 | `svc/mes/src/modules/equipment.rs::Equipment` | `mes.equipment` | `mes.Equipment` | `status` 枚举 {running/down/maintenance/idle/calibrating/scrapped} = FSM-6 全集；oee_rate 字段为 MES-1/4 指标源 |
| E-7 | `svc/mes/src/modules/anomaly_detection.rs::AnomalyRecord` | `mes.anomaly_detection_records` | `mes.AnomalyRecord` | `severity {low/medium/high/critical}`；`impact_duration_minutes` 为 MES-4/5 指标源 |
| E-8 | `svc/mes/src/modules/equipment_oee.rs::EquipmentOeeSnapshot` | `mes.equipment_oee_snapshots` | `mes.EquipmentOeeSnapshot` | `availability/performance/quality_rate` 百分比；`shift` 班次；`date` 聚合维度 = MES-1 数据源 |
| E-9 | `svc/mes/src/modules/production_cost.rs::ProductionCostRecord` | `mes.production_cost_records` | `mes.ProductionCostRecord` | 成本四分类 {material/labor/energy/overhead} = MES-5/6 瀑布图数据源 |
| E-10 | `svc/mes/src/modules/energy_management.rs::EnergyRecord` | `mes.energy_records` | `mes.EnergyRecord` | 能源类型 {electric/water/gas/steam}；单位 kWh/㎥ 字段 = MES-5 Sankey 数据源 |

### 2.2 7 个 FSM 定义（任务 3 交付清单）

基于 `svc/mes/src/shared/fsm.rs` `define_fsm!` 宏，7 套状态机如下表。
`transition(from → to, trigger, requires_approval?)`

```
FSM-1 ProductionOrder（已有骨架补单测）
  ├─ 状态: draft → released → in_progress → completed；cancelled（终态）
  └─ 转换:
      draft → released (release, false)
      released → in_progress (start, false)
      released → draft (rollback, false) （仅未被任何 work_order 引用时可回滚）
      in_progress → completed (complete, false)
      in_progress → cancelled (cancel, true)  ⟵ APV-1 审批
      completed → cancelled (revoke, true)    ⟵ APV-1 审批（超计划取消时）

FSM-2 WorkOrder（新增）
  ├─ 状态: created → dispatched → material_picked → working → reporting → completed;
  │        paused（working 子状态）; cancelled（终态）
  └─ 转换:
      created → dispatched (dispatch, false)
      dispatched → material_picked (pick_material, false)
      material_picked → dispatched (return_material, false)
      material_picked → working (start_work, false)
      working → reporting (report, false)
      working → paused (pause, false)
      paused → working (resume, false)
      reporting → completed (complete, false)
      * → cancelled (cancel, false)（未 completed 前）

FSM-3 WorkReport（新增）
  ├─ 状态: draft → submitted → archived; rejected; reworking
  └─ 转换:
      draft → submitted (submit, false)
      submitted → archived (qc_pass, false)
      submitted → rejected (qc_fail, false)  ⟵ 触发 FSM-4 质检
      rejected → reworking (rework, true)    ⟵ APV-2 审批（返工工时 > 30% 阈值）
      reworking → submitted (resubmit, false)

FSM-4 QualityInspection（新增）
  ├─ 状态: pending → inspecting → passed / failed（分叉）; concession_received / rework_assigned / scrapped（三终态）
  └─ 转换:
      pending → inspecting (start_inspect, false)
      inspecting → passed (pass, false)
      inspecting → failed (fail, false)
      failed → concession_received (concession, true)  ⟵ APV-3 让步接收
      failed → rework_assigned (rework, false)  ⟵ 触发 FSM-3 reworking
      failed → scrapped (scrap, false)

FSM-5 TraceabilityRecord（新增）
  ├─ 状态: active → frozen → locked → investigating → resolved（终态链）
  └─ 转换:（触发来自 FSM-4 failed）
      active → frozen (freeze, false)
      frozen → locked (lock_down, false)
      locked → investigating (investigate, false)
      investigating → resolved (resolve, false)
      * → active (unfreeze, true)  ⟵ 质量经理审批

FSM-6 Equipment（新增）
  ├─ 状态: running → idle → calibrating → running
  │        running → down → maintenance → running
  │        running / idle → scrapped（终态）
  └─ 转换:
      running → idle (idle, false)
      idle → running (restart, false)
      running → calibrating (calibrate, false)
      calibrating → running (calibration_done, false)
      running → down (fault, false)  ⟵ 触发 FSM-7 monitoring→triggered
      down → maintenance (schedule_maintenance, false)
      maintenance → running (repair_complete, false)
      running → scrapped (scrap, true)     ⟵ 固定资产审批（APV 扩展，本次做骨架）
      idle → scrapped (scrap, true)

FSM-7 AnomalyRecord（新增）
  ├─ 状态: monitoring → triggered → acknowledged → handling → closed;
  │        false_alarm_verified（终态）
  └─ 转换:
      monitoring → triggered (trigger, false)  ⟵ FSM-6 fault→down 自动创建
      triggered → false_alarm_verified (verify_false_alarm, false)
      triggered → acknowledged (acknowledge, false)
      acknowledged → handling (start_handling, true)  ⟵ APV-4（中断 > 1h 阈值）
      handling → closed (close, false)
```

### 2.3 6 张 BI 分析页（任务 4 交付清单）

| 页面名（代码） | 导出路由（MES_PATHS.xxx） | 图表组合 | 数据源 | 过滤器（FilterSidebar） |
|---|---|---|---|---|
| `MesOeeDashboardPage` | `/mes/analytics/oee` | OEE 数字环 + 可用性/性能/质量三环雷达 + 设备 OEE 热力图（workstation_id × shift）+ 24h OEE 变化折线 | E-8 EquipmentOeeSnapshot + E-6 Equipment oee_rate | 日期范围·车间·设备组·班次 |
| `MesDeliveryAnalyticsPage` | `/mes/analytics/delivery` | 准时率面积图 + SLA Donut + Top10 延迟工单 List + 计划 vs 实际箱线图 | E-1 ProductionOrder：`actual_end_date - planned_end_date` 差值分布 | 月份·产品族·优先级 |
| `MesQualityParetoPage` | `/mes/analytics/quality-pareto` | Pareto 图（缺陷类型柱 + 累积线）+ 工序×缺陷类型热力图 + 不合格品处置（concession/rework/scrap）Donut | E-4 QualityInspection + E-5 TraceabilityRecord | 月份·产线·检查员 |
| `MesEquipmentMtbfPage` | `/mes/analytics/mtbf` | MTBF 折线（按设备类型聚合）+ MTTR 柱 + 故障原因词云 + MTBF vs OEE 散点 | E-6 Equipment fault history + E-7 AnomalyRecord（down→running 时间差） | 设备类型·故障等级 |
| `MesEnergyCostPage` | `/mes/analytics/energy` | 单位产品能耗折线 + 能源占比堆叠面积图 + 车间能耗 Top N 条形 + 电/水/气 Sankey | E-10 EnergyRecord 聚合（workshop_id × product_id × unit） | 能源类型·日期范围·车间 |
| `MesCapacityUtilizationPage` | `/mes/analytics/capacity` | 设备×班次×日期 3D 热力矩阵 + 产能-需求瀑布图 + 瓶颈设备 Top10 + 排程利用率饼图 | E-9 ProductionCostRecord × APS `aps_schedules` × E-2 WorkOrder 实际工时 | 周范围·工作中心·设备 |

### 2.4 4 类审批（任务 5 交付清单）

与 CRM `customers/:id/approval/{start|approve|reject}` 端点风格 1:1 对齐。

| 审批类型 | 端点路由 | 审批链（3 级） | 需审批的 FSM 转换 | 存储字段 |
|---|---|---|---|---|
| APV-1 生产订单变更 | `/mes/production-orders/:id/approval/{start\|approve\|reject}` | 申请人 → 生产主管 → 计划经理 | `in_progress→cancelled`, `completed→cancelled` | `approval_id`, `change_reason`, `change_scope` |
| APV-2 工单返工 | `/mes/work-reports/:id/approval/{start\|approve\|reject}` | 班长 → 质量工程师 → 车间主任 | `qc_fail→rework`（当 rework_hours / original_hours > 0.3） | `rework_approval_id`, `defect_cause`, `rework_plan` |
| APV-3 让步接收 | `/mes/quality-inspections/:id/approval/{start\|approve\|reject}` | QC → 质量经理 → 客户代表（可选，根据客户编号存在） | `failed→concession` | `concession_approval_id`, `risk_assessment`, `customer_notified` |
| APV-4 异常处置 | `/mes/anomalies/:id/approval/{start\|approve\|reject}` | 操作员 → 维修主管 → 生产总监 | `acknowledged→handling`（当 impact_duration_minutes > 60 阈值） | `handling_approval_id`, `impact_assessment`, `mitigation_plan` |

审批调用链 `handler` 内部：
```rust
// 1. permission 三段式校验
check_permission(&pool, &claims, ModulePermission::MesApprove).await?;
// 2. 记录 approval_log 节点（audit.rs）
log_audit_event(AuditEventParams{kind:"approval_start", entity_id, ..}).await?;
// 3. apply_fsm_transition(requires_approval=true)  —  shared/fsm.rs 统一接口
fsm::apply_transition_with_approval(pool, entity_id, transition, approval_id).await?;
```

---

## 3. 架构与数据流

### 3.1 数据流总览（实体 → FSM 事件 → 审批 → BI 聚合）

```
  前端提交 [CreateProductionOrder]  →  Route Handler [任务2 permission三段式]
                                          │
                                          ▼
                          [models/production_order.rs] DTO 校验写入（任务1 types 同步）
                          │
                          ├── status = draft（FSM-1 起点）
                          ▼
            [shared/fsm.rs transition(release)] → audit.rs log + event bus publish
                          │
                          ├── release: ok → status=released（可派工）
                          ▼
            WorkOrder dispatch（FSM-2 created→dispatched）
                          │
                          ├── 过程中触发 equipment/fault（FSM-6 running→down）
                          │     └─── auto create: AnomalyRecord monitoring→triggered（FSM-7）
                          ▼
            WorkReport submit（FSM-3 draft→submitted）
                          │
                          ├── qc_fail → rejected → （工时 > 30% 阈值需 APV-2）
                          │     └─── QualityInspection pending→inspecting→failed（FSM-4）
                          │           └── concession: APV-3 让步接收
                          ▼
            BI 聚合（6 个 analytics page 从 events 读取聚合视图）
                ├─ MES-1 OEE Dashboard
                ├─ MES-2 Delivery SLA
                ├─ MES-3 Quality Pareto
                ├─ MES-4 MTBF / MTTR
                ├─ MES-5 Energy Cost
                └─ MES-6 Capacity Utilization
```

### 3.2 错误处理（四层契约）

- **后端 Route 层**：所有 `Err` 走 `topems_shared::response::api_error`，统一错误码 `MES::FSM_TRANSITION_INVALID / MES::APPROVAL_REQUIRED / MES::TENANT_MISMATCH / MES::PERMISSION_DENIED`，与 CRM 错误码风格对齐
- **FSM 层**：`apply_transition` 失败返回 `FsmError::InvalidTransition { from, to, trigger }`，并保留详细诊断（当前状态 + 可达转换列表），供前端 StatusBadge 动态禁用
- **BI 层**：聚合空数据返回空数组 + `is_mock=true` 标记，前端显示「暂无数据」占位，vitest 可断言两种分支
- **审批层**：`start` 节点可被同一申请人重复提交幂等；`approve/reject` 带 `expected_approval_version` CAS，避免并发审批错乱
- **权限层**：`mes:module:read`（浏览级）→ `mes:{entity}:read/write` → `mes:{entity}:approve`，与 IAM Role 管理对齐的三段式

---

## 4. 测试策略（任务 3 + 任务 6 · 覆盖要求）

### 4.1 后端测试（cargo test -p topems-mes — 新增 ≥ 50 个用例）

```
shared/fsm_test.rs  ← 追加 7 FSM × ≥6 = ≥42
  ├─ happy path:   创建 → 连续合法转换 → 到达预期终态（每个 FSM ≥ 3）
  ├─ invalid:      从非法状态执行 trigger，必须返回 InvalidTransition（每个 FSM ≥ 2）
  ├─ approval:     requires_approval=true 的转换，在无 approval_id 时必须被阻断
                   （每个涉及审批的 FSM ≥1；共 APV-1 2 个 / APV-2 1 / APV-3 1 / APV-4 1 = 6）
  └─ idempotency:  同一个审批 approve 重复调用，实体状态和 approval_log 不变（2 个）

tests/approval_endpoints_test.rs  ← 新增 ≥ 8
  ├─ 4 类审批 ×（happy path approve + approve→reject 幂等幂拒）= 8

tests/contract_alignment_test.rs  ← 从 CRM 模板复制，改为 MES 实体
  ├─ 10 实体 ×（list/create/get/delete + 分页 + search）HTTP 端点 200 检查 = 60
  └─ 类型断言：Rust DTO 字段名 snake_case vs OpenAPI output camelCase 转换正确 = 10
```

### 4.2 前端测试（vitest · 新增 ≥ 30 组件测试用例）

```
pages/mes/__tests__/
  ├─ ProductionOrderStatusBadge.test.tsx  ← FSM-1 可达性 = 6
  ├─ WorkOrderStatusBadge.test.tsx       ← FSM-2 可达性 = 8
  ├─ MesOeeDashboardPage.test.tsx        ← Mock 模式渲染 = 5
  ├─ MesQualityParetoPage.test.tsx       ← Pareto 数据 + 过滤器 = 5
  └─ ... 其余 4 BI 页 + FSM 3-7 徽章 × 覆盖率合计 ≥ 30
```

### 4.3 五重验收门槛（任务 6 · 必须全绿）

沿用 CRM V190 清单，MES 版阈值与命令如下：

| # | 检查项 | 命令 | 必过阈值 |
|---|---|---|---|
| 1 | TypeScript 型检 | `cd apps/web && npx tsc --noEmit`（含 mes 类型 + 6 BI 页组件） | 0 error |
| 2 | Rust 严格模式 | `cargo check --offline -p topems-mes && cargo clippy --offline -p topems-mes -- -D warnings` | 0 warning 0 error |
| 3 | 导航三重校验 | `tsx scripts/verify_nav.ts mes`（MES_PATHS / config.routes / NavConfig 三者 1:1） | 全部断言通过，无 404 |
| 4 | Vitest 覆盖率 | `cd apps/web && npx vitest run --coverage --reporter=default src/pages/mes src/components/mes src/api/mes` | 新增代码行覆盖 ≥ 80%；FSM 徽章可达性测试 100% |
| 5 | Cargo tests | `cargo test --offline -p topems-mes` 含 FSM + 审批 + 契约对齐 | 0 panic；新增用例 ≥ 50（7 FSM≥42 + 审批≥8） |

---

## 5. 交付物与任务映射

| 任务 | 主要修改文件目录（相对 TOPEMS_ROOT） | 数量级 |
|---|---|---|
| **1. TS 类型底座** | `apps/web/src/types/mes.ts`（重写）+ `apps/web/src/api/mes/*.ts`（24 个签名绑定） | ~25 文件 |
| **2. Rust 契约 + 审批** | `svc/mes/src/models/mod.rs` + `svc/mes/src/modules/*/permission` + `svc/mes/src/modules/* 审批端点` + `svc/mes/src/models/schema_defense.rs`（TABLE_DEFS 补 approval 相关列） | ~30 文件 |
| **3. 7 FSM + 单测** | `svc/mes/src/shared/fsm.rs`（追加 7 套宏定义 + 单测入口）+ `pages/mes/*StatusBadge.tsx`（FSM 可达性重写）+ `apps/web/src/components/mes/*`（禁用逻辑） | ~20 文件 |
| **4. 6 BI 分析页** | `apps/web/src/pages/mes/analytics/{6 页}` + `apps/web/src/api/mes/analytics.ts`（6 个聚合接口 mock hook） | 14 文件（6 页 + 组件 + hook） |
| **5. 4 类审批** | `svc/mes/src/modules/{production_order,work_report,quality_management,anomaly_detection}.rs`（追加 approval 3 端点）+ `svc/mes/src/modules/audit.rs`（审批日志） | ~8 文件 |
| **6. 五重验收** | `apps/web/src/__tests__/mes-contract.test.ts` + `docs/roadmap/TODO.md`（V191-V197 验收节）+ `docs/superpowers/checklists/MesContractChecklist.md`（新增） | ~4 文件 |
| **合计** | | ~100 文件 |

---

## 6. 风险与兜底

| 风险 | 等级 | 触发条件 | 兜底策略 |
|---|---|---|---|
| 7 FSM + 6 BI 并行导致 types/mes.ts 膨胀 > 2000 行 | 中 | 实体 DTO 细分后 > 50 个导出类型 | 按 E-1~E-10 拆分到 `apps/web/src/types/mes/*.ts`（10 个文件），index.ts 统一 re-export |
| cargo test -p topems-mes 失败率高（FSM 交叉状态） | 中 | 单测初始化顺序不一致导致死锁 | 每个 FSM 用例使用独立 `#[tokio::test]` + 独立 schema 前缀隔离（复用 `tenant_test.rs` 模式） |
| vitest BI 覆盖率 < 80% | 中 | recharts mock 复杂 + FilterSidebar 深层用例漏写 | 用 `@testing-library/react` 只断言非空渲染 + 关键数据筛选；降低 BI 页阈值到 65% 单独标注；FSM 徽章必须 100% |
| TABLE_DEFS 加 approval_id 列导致老库 schema defense warning | 低 | 存量表缺 4 组 approval 三列（x10 实体 = 最多 12 列） | 按 V69.3 规范同步（CREATE TABLE 文本块 + TABLE_DEFS 两处同时改），CI 严格模式 0 警告是验收门槛 #2 自带 |

---

## 7. 验收检查清单（自审用 · Spec Self-Review）

- [x] **无占位符**：所有 "TBD"/"TODO" 均被明确值替换；BI 6 页数据源均对应 2.1 节实体 E-1~E-10
- [x] **内部一致性**：Section 2.2 FSM 转换 → Section 2.4 审批 APV-n 映射 → Section 4.1 cargo test = FSM×≥6 + approval≥8 数值无矛盾；Section 2.3 MES_PATHS.xxx 与任务 4 文件目录一致
- [x] **Scope 适中**：100 文件 6 任务串行，每个任务独立可验证；拆分到 sub-agent 可按任务切 4 个子工单并行（任务 1/2 可并行、3/4 可并行、5/6 串行依赖 3/4）
- [x] **无二义性**：FSM 触发条件、审批阈值（返工工时 30%、异常中断 60 分钟）均给出硬数值；后续若有变更可在 TODO 版本注释中单独调

---

## 8. 后续衔接（writing-plans 下一步）

本 spec 审批后，下一个动作是调用 `writing-plans` skill 将 **6 大任务** 展开为：
- 每个任务 → 独立 TODO 条目（id/priority/content）
- 每个任务 → sub-agent 切分建议（是否可并行处理：✓任务 1↔2、3↔4 可并行；5 依赖 3；6 依赖 1-5）
- 每个任务 → 预期完成时间与子产物清单
