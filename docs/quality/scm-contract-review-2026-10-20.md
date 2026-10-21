# SCM 前后端契约对比报告（2026-10-20，相对 2026-10-03 基线增量复核）

> 范围：`apps/web/src/api/scm/`（排除 `factory.ts`/`types.ts`/`index.ts`/`__tests__` 后 19 个业务文件，114 条调用 / 76 路径）↔ `svc/scm/src/modules/`（22 模块，98 条 `.route()` / 98 路径；另 `scm_plugin.rs` 2 条 `/api/plugins/*` 为 core-facing 内部端点，单列）
> 方法：脚本 `contract_audit.py fe/be/cmp scm` 提取前端 `apiClient.scm.<method>('/path')` 与后端 `.route("/path", get/post/...)`，括号平衡解析链式方法，参数归一化 `{param}`（`${id}`/`{id}`/`{inspectionId}` 视为同一位置参数），query string 丢弃，服务前缀 `/api/scm` 两端一致故忽略。
> 基线：c976f0358（2026-10-03 报告 `docs/archive/reports-2026-10/scm-contract-review-2026-10-03.md`）
> 当前 HEAD：c78b67de1（origin/main，BEHIND=0）
> 本次为**只读复核**：未修改任何代码、未 commit、未 push。

---

## 一、总体结论

| 维度 | 2026-10-03 基线 | 2026-10-20 当前 | 变化 |
|---|---|---|---|
| 前端调用路径 vs 后端路由 | 76/76 全命中 | **76/76 全命中（路径级缺失 0）** | 持平 |
| 方法级缺口（前端调、后端无该 HTTP 方法） | 3 处 | **0 处** | ✅ 3 处全部闭环 |
| 路由冗余（scm 服务内重复定义） | 1 组（inquiries） | **0 组** | ✅ 已移除 |
| 后端能力未前端接线 | ~20 处（口径含误判） | **26 条 method-path**（A 基础设施/插件内部 3 + B sync 内部 9 = 12 条非缺陷；C/D/E/F 业务项 14 条，其中 C2/C7 为别名重复） | 口径澄清，无新增业务缺口 |
| 参数数不一致 | 0 | **0** | 持平 |

**契约完整性总体健康且较基线改善**：基线 3 处方法级缺口（调用即 404）全部闭环，inquiries 冗余组已删除；本次复核**未发现新的路径级缺失、方法级缺口、路由冗余或参数不一致**。现存问题全部为后端能力未接线（治理/排期项），不构成运行时 404/405 风险。

脚本复跑结果（与预验证数字一致）：

```
前端调用 114 条 / 路径 76 个；后端路由 98 条 / 路径 98 个
[路径级缺失] 0
[方法级缺口] 0
[后端未接线] 26
[路由冗余] 0
[参数数不一致] 0
```

---

## 二、方法级缺口（高风险：前端调用即 404）

**当前 0 处。** 基线 3 处已全部闭环，逐项代码验证如下。

| # | 基线缺口 | 闭环方式 | 后端验证（路由 + handler） | 前端验证 | 闭环提交 |
|---|---|---|---|---|---|
| 1 | `/comparisons/{id}` 前端 DELETE/PUT 无后端 | 后端补 `update_comparison` + `delete_comparison`（COALESCE 部分更新；先删 items 再删主表；权限 PriceComparisonWrite） | 路由 `svc/scm/src/modules/price_comparison.rs:338-342`（`get(get_comparison).put(update_comparison).delete(delete_comparison)`）；handler `update_comparison` `price_comparison.rs:1058`（COALESCE 见 :1080-1087，权限 :1069）、`delete_comparison` `price_comparison.rs:1130`（先删 items :1149 再删主表，权限 :1140） | PUT `apps/web/src/api/scm/priceComparison.ts:32`、DELETE `priceComparison.ts:36`，均有后端命中 | `1ff050e8b`（2026-10-03） |
| 2 | `/mrp/suggestions/{id}` 前端 DELETE/PUT 无后端 | 后端补 `update_suggestion` + `delete_suggestion`（COALESCE 部分更新；权限 PurchaseOrderWrite）；同时移除基线备注的未用 `POST /mrp/suggestions/{id}` | 路由 `svc/scm/src/modules/mrp.rs:151-156`（`get(get_suggestion).put(update_suggestion).delete(delete_suggestion)`）；handler `update_suggestion` `mrp.rs:403`（权限 :414）、`delete_suggestion` `mrp.rs:471` | PUT `apps/web/src/api/scm/mrpPlan.ts:25`、DELETE `mrpPlan.ts:29`，均有后端命中 | `1ff050e8b`（2026-10-03） |
| 3 | `/incoming-inspections/{id}` 前端 DELETE 无后端 | 前端移除未用 `deleteInspection`（无页面引用），后端保持 GET/PUT 不动 | 路由 `svc/scm/src/modules/incoming_inspection.rs:180-183`（`get(get_inspection).put(update_inspection)`，无 DELETE） | `apps/web/src/api/scm/incomingInspection.ts` 现仅 list(:15)/create(:21)/get(:25)/update(:32)/pass(:36)/reject(:43)，全仓 `api/scm` 内无 `deleteInspection` 定义或调用（`rg deleteInspection apps/web/src/api/scm` 0 命中；残留命中均属 mes/ehs 域） | `1ff050e8b`（2026-10-03） |

**参数提取抽查（5 处，均 `Path<Uuid>`，与前端单段路径参数一致，脚本参数不一致=0 复核通过）**：
`price_comparison.rs:519`（get_quote）、`:590`（update_quote）、`:1061`（update_comparison）、`:1133`（delete_comparison）；`mrp.rs:406`（update_suggestion）、`:474`（delete_suggestion）；`purchase_order.rs:731`（reject_order）。

---

## 三、路由冗余（scm 服务内）

**当前 0 组（脚本 redundancy=0）。** 基线的 inquiries 冗余组已完整移除，验证如下：

| 基线冗余项 | 现状 | 证据 |
|---|---|---|
| `GET/POST /inquiries`（基线 `price_comparison.rs:341`） | 已删 | `svc/scm/src/` 内 `rg inquiries` 仅剩 SQL JOIN（`price_comparison.rs:749,770,941` 的 `scm.purchase_inquiries` 表关联）与 schema 防御登记（`schema_defense.rs:140`），**无任何 `/inquiries` 路由** |
| `GET/DELETE /inquiries/{id}`（基线 :342） | 已删 | 同上，无路由、无 handler |
| `POST /inquiries/{id}/publish`（基线 :343） | 已删 | 同上 |
| 前端 scm.inquiries 调用 | 0 | `rg "scm\.inquiries" apps/web/src` 0 命中；全部询价引用走 srm 域 |

移除提交：`43ae66c54`（2026-10-04，"移除 scm inquiries 冗余组（路由+5 handler+models，-479 行，srm 全量覆盖）"，`price_comparison.rs` -365 行、`models/price_comparison.rs` -109 行、`openapi.rs` -3 行）。

**附注（非冗余、非缺口）**：mrp 存在两套并行路径且均已接线——`/mrp/suggestions*`（`mrp.rs:150-157`，前端 `mrpPlan.ts:13-33`）与 `/mrp-suggestions*`（`mrp.rs:159-164`，前端 `mrpSuggestion.ts:14-24`），其中 `material_requirement_summary` 同时挂在 `/mrp/material-summary`（`mrp.rs:158`，未接线）与 `/mrp-suggestions/summary`（`mrp.rs:161-164`，已接线 `mrpSuggestion.ts:24`）。路径不同故脚本不计冗余，属后端别名双挂，建议未来收敛为一组。

---

## 四、后端能力未前端接线（26 条 method-path）

> 口径：`be_pm - fe_pm`（后端有、前端 api 层无该方法调用）。已用 `rg` 全仓 `apps/web/src`（含 pages）复核调用方；api 层之外无旁路直连 `apiClient.scm` 的页面调用。

### A. 基础设施 / core-facing 内部端点（3 条，非缺陷）

| # | 方法 路径 | 位置 | 判断 |
|---|---|---|---|
| A1 | `GET /api/plugins/info` | `scm_plugin.rs:144`（handler `get_plugin_info` :40）；挂载于 `main.rs:247` `public_routes` | 插件注册到统一核心的内部端点，不在 `/api/scm` 业务前缀下，前端无需调用，**非缺陷** |
| A2 | `GET /api/plugins/health` | `scm_plugin.rs:145`（handler `plugin_health_check` :132）；挂载于 `main.rs:248` | 同上，core 健康探针，**非缺陷** |
| A3 | `GET /health` | `sync_records.rs:81`（handler `scm_health` :95，`SELECT 1` 探活） | **基线后新增**（`42a798c3b` 2026-10-06）。前端仅有 api 层 wrapper `index.ts:66-68`（`scmApi.health()`），且仅测试调用（`__tests__/scm-api.test.ts:911`），无运行时页面调用；与 `main.rs:250` `create_standard_health_routes` 的公共标准健康路由功能重叠。属基础设施探测，**非业务缺口**，建议评估去留或并入公共健康路由 |

### B. sync 系列（9 条，后端内部能力，非缺陷）

全部位于 `svc/scm/src/modules/data_sync.rs:77-91`，前端 api 层与页面均 0 调用（`rg purchase-to-inbound|purchase-batch|consistency-check|retry-failed|sync/statistics|sync-logs|supplier-from-srm|suppliers-from-srm` 在 `apps/web/src/api/scm` 0 命中）。判断同基线：跨系统数据同步为后端内部能力，前端无 UI 入口属正常，**不判定缺陷**。

| # | 方法 路径 | 路由:handler |
|---|---|---|
| B1 | `POST /sync/purchase-to-inbound` | `data_sync.rs:77` → `purchase_to_inbound` |
| B2 | `POST /sync/purchase-order/{id}/to-inbound` | `data_sync.rs:78-80` → `create_inbound_from_purchase` |
| B3 | `POST /sync/supplier-from-srm` | `data_sync.rs:82` → `sync_supplier_from_srm` |
| B4 | `POST /sync/suppliers-from-srm` | `data_sync.rs:83-86` → `sync_all_suppliers_from_srm` |
| B5 | `POST /sync/retry-failed` | `data_sync.rs:87` → `retry_failed_syncs` |
| B6 | `POST /sync/statistics` | `data_sync.rs:88` → `get_sync_statistics` |
| B7 | `POST /sync/sync-logs` | `data_sync.rs:89` → `get_sync_logs` |
| B8 | `POST /sync/purchase-batch` | `data_sync.rs:90` → `batch_sync_purchase_to_wms` |
| B9 | `POST /sync/consistency-check` | `data_sync.rs:91` → `check_consistency` |

### C. 缺 UI 接线的业务能力（8 条，待排期；其中 2 条为别名重复）

| # | 方法 路径 | 后端位置（路由 / handler） | 判断 |
|---|---|---|---|
| C1 | `GET /dashboard/real-time-status` | `supply_chain_dashboard.rs:27` / `real_time_status` :590（权限 PurchaseOrderRead :600） | **高价值，前端缺仪表盘实时状态接线**；`supplyChainDashboard.ts` 仅接 overview(:12)/purchase-inbound-outbound(:16)/supplier-performance(:22)，`DashboardPage.tsx` 用 analytics，未调本端点 |
| C2 | `GET /mrp/material-summary` | `mrp.rs:158` / `material_requirement_summary` :899 | **别名重复**：同 handler 已由 `/mrp-suggestions/summary`（`mrp.rs:161-164`）接线（`mrpSuggestion.ts:24`）；本路径前端未接，建议收敛而非新做 UI |
| C3 | `GET /incoming-notices` | `incoming_inspection.rs:174` / `list_notices` :259 | 到货通知列表，**前端缺接线**（无 notice api 文件、无页面） |
| C4 | `POST /incoming-notices` | `incoming_inspection.rs:174` / `create_notice` :357 | 到货通知新建，**前端缺接线** |
| C5 | `GET /incoming-notices/{id}` | `incoming_inspection.rs:175` / `get_notice` :471 | 到货通知详情，**前端缺接线** |
| C6 | `PUT /incoming-notices/{id}` | `incoming_inspection.rs:175` / `update_notice` :525 | 到货通知更新，**前端缺接线** |
| C7 | `POST /incoming-inspections/{id}/fail` | `incoming_inspection.rs:185` / `inspection_fail` :1222 | **别名重复**：`/incoming-inspections/{id}/reject`（`incoming_inspection.rs:186`）指向同一 `inspection_fail`，且已由前端 `incomingInspection.ts:43` 接线；`/fail` 为冗余别名，建议二选一 |
| C8 | `GET /inventory-turnover/days` | `inventory_turnover.rs:216` / `turnover_days` :437（权限 PurchaseOrderRead :447） | 库存周转天数，**前端缺接线**（`inventoryTurnover.ts` 仅 list/get/abc-analysis/trend :16-30）；基线已存在但基线清单漏列，维持原状 |

### D. 业务动作缺 UI 接线（2 条，审批/驳回流）

| # | 方法 路径 | 后端位置（路由 / handler） | 判断 |
|---|---|---|---|
| D1 | `POST /comparisons/{id}/approve` | `price_comparison.rs:343` / `approve_comparison` :1003（权限 PriceComparisonWrite :1013） | 比价审批动作未接线；`priceComparison.ts` 无 approve wrapper；比价页 schema actions 仅 `['create','edit','detail','delete']`（`schemas/scm/priceComparison.ts:179`），无审批按钮 |
| D2 | `POST /purchase-orders/{id}/reject` | `purchase_order.rs:32` / `reject_order` :729（权限 PurchaseOrderApprove :741） | 采购单驳回未接线；`purchaseOrder.ts:35-36` 仅有 approve；订单 schema actions 无 reject（`schemas/scm/purchaseOrder.ts:179`） |

### E. 报价子集未接线 + 根层级 wrapper 无页面消费（3 条，待评估死 API）

| # | 方法 路径 | 后端位置（路由 / handler） | 判断 |
|---|---|---|---|
| E1 | `GET /quotes/{id}` | `price_comparison.rs:331` / `get_quote` :516 | 报价详情未接线（无 wrapper） |
| E2 | `PUT /quotes/{id}` | `price_comparison.rs:331` / `update_quote` :587 | 报价更新未接线（无 wrapper） |
| E3 | `POST /quotes/{id}/submit` | `price_comparison.rs:332` / `submit_quote` :656（权限 PriceComparisonWrite :666，置 status='submitted' :674） | 报价提交未接线（无 wrapper） |

附注：根层级 `GET/POST /quotes`（`price_comparison.rs:330`）在 api 层已有 wrapper（`priceComparison.ts:44` quotes、`:48` createQuote），但**无任何页面调用**（`rg createQuote|priceComparisonApi.quotes apps/web/src/pages` 0 命中），属 api 层休眠能力；srm 域 `/quotations/*`（`svc/srm/src/modules/quotation.rs:31,38,39`）是另一实体（报价单 award/reject），不覆盖 scm 的 supplier_quotes 子集。

### F. 后端多能力（非 404 风险，同基线 C 节说明）

| # | 方法 路径 | 后端位置 | 判断 |
|---|---|---|---|
| F1 | `DELETE /purchase-items/{id}` | `purchase_item.rs:33-36` / `delete_item` :396 | 前端 `purchaseItem.ts` 仅 list(:14)/create(:18)/get(:22)/update(:29)，未用删除；后端多 DELETE，**非缺口**，能力待接线 |

---

## 五、与 2026-10-03 基线对比（增量）

### 5.1 已闭环（基线 P0，3 处方法级缺口）

| 基线项 | 现状 | 证据 |
|---|---|---|
| `PUT/DELETE /comparisons/{id}` 缺后端 | ✅ 闭环 | 路由 `price_comparison.rs:338-342`；handler :1058/:1130；前端 `priceComparison.ts:32,36` 命中；提交 `1ff050e8b` |
| `PUT/DELETE /mrp/suggestions/{id}` 缺后端 | ✅ 闭环 | 路由 `mrp.rs:151-156`；handler :403/:471；前端 `mrpPlan.ts:25,29` 命中；未用的 `POST /mrp/suggestions/{id}` 一并移除；提交 `1ff050e8b` |
| `DELETE /incoming-inspections/{id}` 前端多调 | ✅ 闭环 | 前端删除 `deleteInspection`（`incomingInspection.ts` 现无该方法）；后端保持 GET/PUT `incoming_inspection.rs:180-183`；提交 `1ff050e8b` |

### 5.2 已删除（基线 P1，冗余）

| 基线项 | 现状 | 证据 |
|---|---|---|
| scm inquiries 冗余组（`/inquiries` GET/POST、`/inquiries/{id}` GET/DELETE、`/inquiries/{id}/publish` POST） | ✅ 全删 | 后端无路由（仅剩 SQL JOIN）、前端 0 引用；提交 `43ae66c54`（2026-10-04，-479 行） |

### 5.3 基线后新增（后端）

| 新增项 | 性质 | 证据 |
|---|---|---|
| `GET /health`（`sync_records.rs:81`） | 基础设施探活，非业务缺口 | 提交 `42a798c3b`（2026-10-06 "add /health endpoint..."）；`git log -S 'route("/health"'` 唯一引入；wrapper `index.ts:66-68` 仅测试调用 |

基线后前端调用集合**零新增、零业务删除**（正式扫描对比：前端 method-path 唯一差异为已闭环的 `DELETE /incoming-inspections/{id}` 移除）。基线后提交以 RLS 事务修复（`df0afc8e9`）、错误形态 TopemsError 化（`9a8cfdd8c`/`4fb300591`）、fmt/clippy、事件 Decimal 适配（`1f1112268`）为主，**未引入新的契约破坏**。

### 5.4 维持原状（基线未接线 → 当前仍未接线）

`/dashboard/real-time-status`、`/mrp/material-summary`、`/incoming-notices`×4、`/incoming-inspections/{id}/fail`、`/comparisons/{id}/approve`、`/purchase-orders/{id}/reject`、`/quotes/{id}` GET/PUT、`/quotes/{id}/submit`、`DELETE /purchase-items/{id}`、sync 系列 9 条——均经基线快照（`git show c976f0358:<file>`）核对路由在基线时已存在，本次无变化。

### 5.5 基线口径修正（本次复核澄清，非新问题）

| 基线表述 | 复核结论 | 证据 |
|---|---|---|
| A 节将 `/sync/wms/{sync_type}`、`/sync/srm/{sync_type}` 列为未接线 | **实为已接线**：基线快照 `syncRecord.ts:31,35` 已调用，后端 `sync_records.rs:89-90` 命中 | 当前 `syncRecord.ts:30-36`（syncWithWms/syncWithSrm）；基线快照同位置已存在 |
| B 节称 `/quotes` GET/POST 前端 0 调用（"仅测试注释误匹配"） | **实为 api 层已接线**（基线快照 `priceComparison.ts:44,48` 已存在 quotes/createQuote），基线为提取漏采；但两者均无页面消费 | `git show c976f0358:apps/web/src/api/scm/priceComparison.ts:43-48`；当前同 |
| `/inventory-turnover/days` 未列入基线 ~20 处清单 | 基线已存在（基线快照 `inventory_turnover.rs:215`），属基线漏列，维持原状 | 基线快照路由块 213-217 行 |

### 5.6 新缺口

**无。** 路径级缺失 0、方法级缺口 0、路由冗余 0、参数数不一致 0；无基线后前端删除导致的新未接线。

---

## 六、方法归一化口径

- 前端 `apiClient.scm.get(\`/purchase-orders/${id}\`)` → 路径 `/purchase-orders/{param}`
- 后端 `.route("/purchase-orders/{id}", ...)` → 路径 `/purchase-orders/{param}`
- 前端 `${resource}`（`factory.ts` 泛型 CRUD）**排除**（动态资源名，不参与对比）；`types.ts`/`index.ts`/`__tests__` 排除（注：`index.ts:67` 有 1 处 `/health` 直接调用，已在本报告 A3 单独人工核对）
- 前缀 `/api/scm` 两端一致（vite 代理 ↔ `main.rs api_prefix`），对比时忽略；`/api/plugins/*` 走 `public_routes`（`main.rs:246-250`），不计入业务契约
- query string 丢弃；`${x}`/`{x}`/`:x` → `{param}`

---

## 七、建议处置优先级

| 优先级 | 项 | 动作 |
|---|---|---|
| — | 基线 P0 三处方法级缺口 | ✅ 已闭环（`1ff050e8b`），无需动作 |
| — | 基线 P1 inquiries 冗余 | ✅ 已移除（`43ae66c54`），无需动作 |
| P2 | C1 `/dashboard/real-time-status` 接线 | 前端仪表盘页补实时状态查询（业务价值高） |
| P2 | D1 `/comparisons/{id}/approve`、D2 `/purchase-orders/{id}/reject` | 补 api wrapper + 审批/驳回按钮（审批流闭环） |
| P3 | C3-C6 `/incoming-notices` CRUD | 评估是否新建到货通知页；不做则标注 |
| P3 | C2 `/mrp/material-summary`、C7 `/fail` 别名 | 收敛到已接线别名（`/mrp-suggestions/summary`、`/reject`），删冗余路由 |
| P3 | E1-E3 `/quotes/{id}` GET/PUT/submit、根 `/quotes` wrapper 无页面消费 | 确认报价子集产品去留：接线或标注/移除 |
| P4 | A3 `/health`、F1 `DELETE /purchase-items/{id}`、C8 `/inventory-turnover/days` | 评估/排期，非紧急 |
| 非缺陷 | A1-A2 插件内部端点、B 组 sync 9 条 | 维持后端内部能力，不接 UI |

**本报告仅审计不修改**：所有发现均标注 `file:line` 可复核；未改动任何代码、未 commit、未 push。
