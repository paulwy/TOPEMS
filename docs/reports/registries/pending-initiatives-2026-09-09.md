# 预埋项立项建议清单（DECIDED · 2026-09-10 拍板）

> 目的：把 P1-P3 审计中判定"预埋/待立项"且需产品决策的能力项，收敛为**可直接评审拍板**的立项卡。
> 状态：**DECIDED（2026-09-10 产品分析拍板）**——3 张卡全部拍板，卡 2/3 已执行上线，卡 1 维持预埋观察。
> 判定口径：页面零消费 + 后端（或前端）实现存在但不承接；与"真实消费缺口"（P0/P1 已闭环）严格区分。
> 配套：版本化生命周期登记表 `docs/reports/registries/version-lifecycle-registry-2026-09-09.md`；主报告 `frontend-backend-mapping-assessment-2026-09-08.html`。

## 拍板结果（TL;DR · 2026-09-10）

| # | 立项卡 | 现状 | **拍板决策** | 执行状态 | 优先级 |
|---|---|---|---|---|---|
| 1 | IM 白板 / 呼叫 | 前端 imApi 基础 95 方法在役；白板/呼叫前后端均无实现 | **暂缓立项，维持预埋**：重基建能力零场景零回报，需求驱动触发 | 维持预埋，登记表观察 | P2 |
| 2 | master V61+ 数据治理产品族 | 前端 21 文件 + 后端 10 模块 ~240 路由真实挂载，页面零消费 | **试点 dataAssetCatalogV66（数据资产目录）**：治理入口、成本最低、与 ai usage 衔接 | ✅ 已上线（承接页 + API 改指 V60，commit `41a23563d`） | P3 |
| 3 | WMS 拣货 6 模块 | 前端 6 模块完整封装，后端无对应模块；wave_pick 已实现路径不匹配 | **a) 改指复用 wave_pick**：8 个方法改指 `/wave-picks/*`，9 个无对应路由方法保留预埋 | ✅ 已执行（picking.ts 改指 + 门禁 PASS） | P2 |

## 立项卡明细

### 卡 1 · IM 白板 / 呼叫（P2）

- **现状**：`apps/web/src/api/im/index.ts`（311 行，基础 95 方法，消息/会话/联系人）在役；im 扩展 32/33 对象已归档（commit c26d00dba，零消费+后端无扩展路由）。`svc/communication` 提供 im.rs（基础消息）、im_location.rs、mail.rs/notification.rs。白板、呼叫能力前后端均无实现。
- **缺口**：无（非断裂）；属"能力未建设"。
- **立项范围建议**：场景先定——协同白板（多人实时编辑） vs 音视频呼叫（1v1/群组） vs 会议（预约+纪要）。前端建议独立 `api/im/whiteboard.ts`/`call.ts`（不并入 index.ts），后端 communication 新增模块，会议纪要可挂 ai 服务 summarization。
- **拍板问题**：① 目标场景（白板/呼叫/会议）与优先级；② 实时通道选型（WebRTC SFU / 自建信令 / 第三方）；③ 与飞书/企微等既有 IM 的边界。
- **依赖**：实时通信基建；若会议纪要，依赖 ai 服务（已具备 usage 采集，可计费）。
- **推荐决策依据（暂缓立项）**：白板/呼叫是重基建能力（WebRTC/长连接），当前零用户场景、零后端模块，投资回报不可验证；飞书/企微等外部 IM 已覆盖同类场景，自建需先证明差异化价值。**触发立项条件**：出现 ≥1 个真实在役场景（如内部协作诉求、客诉要求）或管理层明确预算方向，再由产品出场景定义。

### 卡 2 · master V61+ 数据治理产品族（P3）

- **现状**：前端 V61-V79 21 文件（dataContractV61 … dataPolicyConfigurationV79）+ aiGovernanceV59 + governanceV2，对应后端 master-data 版本化模块 10 个（versioning_v54/commercial_v55/disaster_v56/semantic_v57/governance_v58/ai_governance_v59/metadata_v60 + schema_registry/master_plugin/dict），~240 路由真实挂载；页面零消费（qualityApi 是唯一真实消费，mes/mobile 复用）。
- **缺口**：无（前后端双活、无 UI 承接，commit c26d00dba 判定预埋）。
- **立项范围建议**：从数据资产目录（dataAssetCatalogV66）、数据质量（dataQualityEnhancedV65）、数据血缘（dataLineageEnhancedV77）中选 1-2 个，按真实在役场景接页面（可挂 master 域菜单或数据治理看板）。其余 V6x 文件继续预埋观察，满 2 个主版本周期无承接按登记表 §4 归档。
- **拍板问题**：① 数据治理产品的目标用户（数据管理员/分析师/合规）；② 首个试点能力选择；③ 与 bi/analytics 服务的边界（指标口径避免重复建设）。
- **依赖**：数据产品负责人在役场景；指标口径与 ai 统计域（usage_logs）衔接。
- **推荐决策依据（试点 dataAssetCatalogV66）**：① 目录是治理入口，价值可直接感知（"有哪些数据、归谁管"），比血缘/质量更易做出第一版；② 后端 metadata_v60/schema_registry 已真实挂载，试点仅需前端承接页 + 少量对齐，成本最低；③ 与 ai usage_logs 统计域天然衔接（目录可登记埋点/上报链路）。**其余 V6x 不立项**：满 2 个主版本周期无承接，按登记表 §4 归档。
- **【2026-09-10 执行记录】**：拍板试点 dataAssetCatalogV66。后端复用 master-data V60 metadata 模块（`/mdm-v60/metadata` + `/mdm-v60/lineage`），无需新建后端。前端 `dataAssetCatalogV66.ts` 核心 10 个方法改指 V60 路由（listAssets/getAsset/createAsset/updateAsset/deleteAsset/searchAssets/quickSearch/getDashboard/getLineageUpstream/getLineageDownstream），高级方法（bulk/import/export/columns/tags/categories/maps/search-suggestions/dashboard-recent/orphans）保留预埋。新增前端承接页 `DataAssetCatalogPage.tsx`（MUI，统计卡片+搜索+资产列表+详情对话框），新增 master 模块配置（路由+菜单导航），注册到 routes/v2 moduleImports，菜单路径 `/master/data-asset-catalog`。验证：TypeScript 编译 0 错误；门禁 check-api-boundary PASS（0 violations）；原 V66 API 预埋悬空，改指零影响。Commit `41a23563d`。

### 卡 3 · WMS 拣货 6 模块（P2）

- **现状**：前端 `api/wms/` 下 kitting.ts / labor.ts / manifest.ts / picking.ts / putaway.ts / slotting.ts 完整封装（picking 调 `/picking/tasks` 等）；后端 svc/wms/src/modules/ **无对应模块**（136 路由中无 `/picking/*`）；wave_pick.rs 为已实现的波次拣货（`/wave-picks/*`），与前端 picking 路径不匹配——即前端 6 模块为预埋悬空代码（报告 144 行确认）。其余 wms 模块（inbound/inventory/cycle_count/audit 等）在役。
- **缺口**：无（预埋）；但 wave_pick 与 picking 的路径/模型分叉是**潜在陷阱**（新消费方可能误指）。
- **立项范围建议**：三选一——
  - a) **改指复用**（推荐，成本最低）：前端 picking.ts 方法改指 `/wave-picks/*`，复用现有波次拣货能力（模型字段核对：wave_pick 有 picked_items/picked_quantity 等，与 picking 任务模型需对齐）；
  - b) **补后端模块**：按拣货作业单流程（任务生成→分配→开始→完成→取消）实现 `/picking/*` 后端，与 wave_pick 做数据模型合并/拆分决策；
  - c) **维持预埋**：登记表标注，零消费满周期归档。
- **拍板问题**：① 拣货作业是否已有波次流程支撑（wave_pick 是否即拣货的线上形态）；② 若立项，选 a/b；③ kitting/labor/manifest/putaway/slotting 是否同批立项。
- **依赖**：仓储作业流程定义；wave_pick 与 picking 数据模型归并决策。
- **推荐决策依据（a 改指复用）**：wave_pick 已实现完整波次拣货（`/wave-picks/*` + picked_items/picked_quantity 模型），前端 picking.ts 改指即可获得真实能力，改动集中在路径对齐 + 字段核对，半天量级；b 需新增后端模块 + 与 wave_pick 做模型归并，成本数倍且可能重复建设；c 维持预埋则 `/picking/*` 悬空路径持续成为新消费方陷阱。**改指后**：门禁重跑（check-api-boundary）+ picking.ts 字段核对（picked_items ↔ 任务模型）。

- **【2026-09-10 执行记录】**：拍板 a) 改指复用 wave_pick。picking.ts 17 个方法中 8 个有对应 wave-pick 路由已改指（listTasks/getTask/createTask/startTask/completeTask/cancelTask/assignTask/listTaskLines），9 个无对应路由方法保留预埋（pickLine/shortPickLine/listLists/createList/getList/createStrategy/listStrategies/getStatistics）。页面零消费（0 处调用），改指不影响现有功能。门禁 check-api-boundary PASS（0 violations，2682 matched + 282 allowlisted）。kitting/labor/manifest/putaway/slotting 维持预埋观察。

## 不在本清单（已闭环/被动）

- **RD material 数据源**：已复核修正为误报闭环（前端 material.ts 调 apiClient.erp，erp 后端 /materials 完整支撑，无需立项）——报告 ⑦。
- **master 扩展整体**：预埋观察（P3），非立项必要项。
- **im 扩展 32/33**：已归档（c26d00dba），不在立项范围。
- **⑨/⑩**：已闭环（usage 采集 620bc6831、receivablePayable 归并 05e0a2c7c）。

## 决策表（产品 5 分钟拍板版）

| 卡 | 选项 | 拍板动作 | 不拍板时的默认动作 |
|---|---|---|---|
| 1 IM 白板/呼叫 | 暂缓 / 立项 | 有真实场景 → 立项（出场景定义）；无 → 确认暂缓 | 自动暂缓：维持预埋，登记表观察，需求驱动激活 |
| 2 master V61+ | 试点 catalog / 全部预埋 | 试点 → 前端承接 dataAssetCatalogV66 页（1 迭代）；无 → 确认预埋 | 自动预埋：量化观察（满 2 主版本周期无承接 → 归档评估） |
| 3 WMS 拣货 | a 改指 / b 补后端 / c 预埋 | 推荐 a → 前端改指 wave_pick + 门禁重跑；选 b/c 需给依据 | 自动挂起：维持现状，登记表持续观察，风险已标注 |

**期限约定**：卡 2/3 建议 1 个迭代周期（2 周）内拍板；到期未拍板按"默认动作"自动生效，不阻塞其他 P1 主线，登记表按 §4 继续推进。

## 拍板后动作指引

- 立项批准项：按登记表 §3 迁移状态（待评审 → 启用中/预埋），新增前端封装必须登记版本化生命周期登记表。
- 改指复用项（卡 3a）：前端路径对齐 + 模型字段核对 + 门禁重跑（check-api-boundary）。
- 维持预埋项：无需动作，登记表按量化条件持续观察。
