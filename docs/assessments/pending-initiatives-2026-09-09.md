# 预埋项立项建议清单（待产品拍板 · 2026-09-09）

> 目的：把 P1-P3 审计中判定"预埋/待立项"且需产品决策的能力项，收敛为可直接拍板的立项卡。
> 判定口径：页面零消费 + 后端（或前端）实现存在但不承接；与"真实消费缺口"（P0/P1 已闭环）严格区分。
> 配套：版本化生命周期登记表 `docs/assessments/version-lifecycle-registry-2026-09-09.md`；主报告 `frontend-backend-mapping-assessment-2026-09-08.html`。

## 拍板问题（TL;DR）

| # | 立项卡 | 现状 | 建议动作 | 依赖 | 优先级 |
|---|---|---|---|---|---|
| 1 | IM 白板 / 呼叫 | 前端 imApi 基础 95 方法在役；白板/呼叫前端无封装、communication 后端无模块（im.rs/im_location.rs 仅基础消息） | 产品立项：明确场景（协同白板 / 音视频呼叫 / 会议）后，前端 + communication 同步新立模块 | 实时通信基建（WebRTC/长连接）、会议纪要可复用 ai 服务 | P2 |
| 2 | master V61+ 数据治理产品族 | master 前端 21 个 V61-V79 文件 + 后端 10 版本化模块真实挂载（~240 路由），页面零消费 | 试点立项：从数据目录/数据质量/数据血缘中选 1-2 个高价值能力接页面，其余继续预埋观察 | 数据产品负责人在役场景、指标口径（与 ai 统计域衔接） | P3 |
| 3 | WMS 拣货 6 模块 | 前端 kitting/labor/manifest/picking/putaway/slotting 完整封装（调 `/picking/*` 等路径），后端无对应模块（wave_pick.rs 为已实现的波次拣货，路径 `/wave-picks/*` 与前端不匹配） | 产品拍板：a) 前端改指 wave_pick 复用现有波次能力；b) 按拣货作业流程补后端模块；c) 维持预埋 | 仓储作业流程定义、波次与拣货作业单的数据模型合并/拆分决策 | P2 |

## 立项卡明细

### 卡 1 · IM 白板 / 呼叫（P2）

- **现状**：`apps/web/src/api/im/index.ts`（311 行，基础 95 方法，消息/会话/联系人）在役；im 扩展 32/33 对象已归档（commit c26d00dba，零消费+后端无扩展路由）。`svc/communication` 提供 im.rs（基础消息）、im_location.rs、mail.rs/notification.rs。白板、呼叫能力前后端均无实现。
- **缺口**：无（非断裂）；属"能力未建设"。
- **立项范围建议**：场景先定——协同白板（多人实时编辑） vs 音视频呼叫（1v1/群组） vs 会议（预约+纪要）。前端建议独立 `api/im/whiteboard.ts`/`call.ts`（不并入 index.ts），后端 communication 新增模块，会议纪要可挂 ai 服务 summarization。
- **拍板问题**：① 目标场景（白板/呼叫/会议）与优先级；② 实时通道选型（WebRTC SFU / 自建信令 / 第三方）；③ 与飞书/企微等既有 IM 的边界。
- **依赖**：实时通信基建；若会议纪要，依赖 ai 服务（已具备 usage 采集，可计费）。

### 卡 2 · master V61+ 数据治理产品族（P3）

- **现状**：前端 V61-V79 21 文件（dataContractV61 … dataPolicyConfigurationV79）+ aiGovernanceV59 + governanceV2，对应后端 master-data 版本化模块 10 个（versioning_v54/commercial_v55/disaster_v56/semantic_v57/governance_v58/ai_governance_v59/metadata_v60 + schema_registry/master_plugin/dict），~240 路由真实挂载；页面零消费（qualityApi 是唯一真实消费，mes/mobile 复用）。
- **缺口**：无（前后端双活、无 UI 承接，commit c26d00dba 判定预埋）。
- **立项范围建议**：从数据资产目录（dataAssetCatalogV66）、数据质量（dataQualityEnhancedV65）、数据血缘（dataLineageEnhancedV77）中选 1-2 个，按真实在役场景接页面（可挂 master 域菜单或数据治理看板）。其余 V6x 文件继续预埋观察，满 2 个主版本周期无承接按登记表 §4 归档。
- **拍板问题**：① 数据治理产品的目标用户（数据管理员/分析师/合规）；② 首个试点能力选择；③ 与 bi/analytics 服务的边界（指标口径避免重复建设）。
- **依赖**：数据产品负责人在役场景；指标口径与 ai 统计域（usage_logs）衔接。

### 卡 3 · WMS 拣货 6 模块（P2）

- **现状**：前端 `api/wms/` 下 kitting.ts / labor.ts / manifest.ts / picking.ts / putaway.ts / slotting.ts 完整封装（picking 调 `/picking/tasks` 等）；后端 svc/wms/src/modules/ **无对应模块**（136 路由中无 `/picking/*`）；wave_pick.rs 为已实现的波次拣货（`/wave-picks/*`），与前端 picking 路径不匹配——即前端 6 模块为预埋悬空代码（报告 144 行确认）。其余 wms 模块（inbound/inventory/cycle_count/audit 等）在役。
- **缺口**：无（预埋）；但 wave_pick 与 picking 的路径/模型分叉是**潜在陷阱**（新消费方可能误指）。
- **立项范围建议**：三选一——
  - a) **改指复用**（推荐，成本最低）：前端 picking.ts 方法改指 `/wave-picks/*`，复用现有波次拣货能力（模型字段核对：wave_pick 有 picked_items/picked_quantity 等，与 picking 任务模型需对齐）；
  - b) **补后端模块**：按拣货作业单流程（任务生成→分配→开始→完成→取消）实现 `/picking/*` 后端，与 wave_pick 做数据模型合并/拆分决策；
  - c) **维持预埋**：登记表标注，零消费满周期归档。
- **拍板问题**：① 拣货作业是否已有波次流程支撑（wave_pick 是否即拣货的线上形态）；② 若立项，选 a/b；③ kitting/labor/manifest/putaway/slotting 是否同批立项。
- **依赖**：仓储作业流程定义；wave_pick 与 picking 数据模型归并决策。

## 不在本清单（已闭环/被动）

- **RD material 数据源**：已复核修正为误报闭环（前端 material.ts 调 apiClient.erp，erp 后端 /materials 完整支撑，无需立项）——报告 ⑦。
- **master 扩展整体**：预埋观察（P3），非立项必要项。
- **im 扩展 32/33**：已归档（c26d00dba），不在立项范围。
- **⑨/⑩**：已闭环（usage 采集 620bc6831、receivablePayable 归并 05e0a2c7c）。

## 拍板后动作指引

- 立项批准项：按登记表 §3 迁移状态（待评审 → 启用中/预埋），新增前端封装必须登记版本化生命周期登记表。
- 改指复用项（卡 3a）：前端路径对齐 + 模型字段核对 + 门禁重跑（check-api-boundary）。
- 维持预埋项：无需动作，登记表持续观察。
