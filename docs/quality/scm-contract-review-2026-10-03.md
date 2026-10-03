# SCM 前后端契约对比报告（2026-10-03）

> 范围：`apps/web/src/api/scm/`（20 业务文件 + 76 调用路径）↔ `svc/scm/src/**`（22 模块 + 100 路由路径）
> 方法：脚本提取前端 `apiClient.scm.<method>('/path')` 与后端 `.route("/path", get/post/...)`，括号平衡解析链式方法，参数名归一化 `{param}`（`${id}`/`{id}`/`{inspectionId}` 视为同一位置参数），排除 `factory.ts` 泛型 CRUD 工厂。
> 基线：c976f0358（origin/main）

---

## 一、总体结论

| 维度 | 结果 |
|---|---|
| 前端调用路径 vs 后端路由 | **76/76 全部命中**（路径级 0 缺失） |
| 方法级缺口（前端调、后端无该 HTTP 方法） | **3 处**（调用即 404） |
| 路由冗余（scm 服务内重复定义） | 1 组（inquiries 系列，与 srm 服务重复） |
| 后端能力未前端接线 | ~20 处（sync 系列为主） |

**契约完整性总体健康**：路径级全覆盖；问题集中在**方法级缺口**（3 处）与**冗余/未接线**（后端治理项）。

---

## 二、方法级缺口（高风险：前端调用即 404）

| # | 路径 | 前端方法 | 后端方法 | 缺口 | 位置 |
|---|---|---|---|---|---|
| 1 | `/comparisons/{id}` | DELETE, GET, PUT | GET | **前端 DELETE/PUT 无后端** | `svc/scm/src/modules/price_comparison.rs:351` |
| 2 | `/incoming-inspections/{id}` | DELETE, GET, PUT | GET, PUT | **前端 DELETE 无后端** | `svc/scm/src/modules/incoming_inspection.rs:180-182` |
| 3 | `/mrp/suggestions/{id}` | DELETE, GET, PUT | GET, POST | **前端 DELETE/PUT 无后端**（且后端 POST 前端未用） | `svc/scm/src/modules/mrp.rs:146-149` |

**影响**：前端 API 层已导出 `deleteXxx/updateXxx` 函数，页面一旦触发即 404/405。

**处置（2026-10-03 已执行，方案①后端补 handler）**：

| # | 处置 | 提交 |
|---|---|---|
| 1 | **补 `update_comparison` + `delete_comparison`**（部分更新 COALESCE 模式，删除先删 items 再删主表，权限 PriceComparisonWrite），路由 `.put().delete()` | 本波 |
| 2 | **前端移除 `deleteInspection` 定义 + 测试块**（无任何页面引用——Dashboard 仅用 list/update；incoming-inspections 无 CrudPage 模板） | 本波 |
| 3 | **补 `update_suggestion` + `delete_suggestion`**（部分更新 COALESCE 模式，权限 PurchaseOrderWrite，与现有 get_suggestion 的 PurchaseOrderRead 一致），路由 `.put().delete()` | 本波 |

前端 comparisons/mrpPlan 的 `update/delete` **保留**（CrudPage 模板 + schema actions `['create','edit','detail','delete']` 真实渲染编辑/删除按钮，属运行时必需）。验证：`cargo check -p topems-scm` 0 error、`cargo test -p topems-scm` 通过、前端 typecheck 0 error、scm 测试 116 通过。


---

## 三、路由冗余（scm 服务内）

| 路径 | scm 服务 | srm 服务 | 说明 |
|---|---|---|---|
| `/inquiries` | `price_comparison.rs:341`（GET/POST） | `inquiry.rs:62`（GET/POST） | **完全重复** |
| `/inquiries/{id}` | `price_comparison.rs:342`（GET/DELETE） | `inquiry.rs:64`（GET/PUT/DELETE） | scm 缺 PUT，且整体**重复** |
| `/inquiries/{id}/publish` | `price_comparison.rs:343`（POST） | `inquiry.rs:67`（POST） | **完全重复** |

**核实**：前端全仓 23 处 inquiries 引用全部走 `apiClient.srm`（`/api/srm/inquiries`）；**scm 服务的 inquiries 系列无任何前端调用方**。
**结论**：scm 服务内的 inquiries 路由组为**冗余**（业务属 srm 域，疑似历史迁移残留）。
**建议**：确认无其他调用方（移动端/内部服务）后移除，或标注 deprecated。

---

## 四、后端能力未前端接线（~20 处）

### A. sync 系列（9 个，全部 0 前端引用）
`/sync/consistency-check` `/sync/purchase-batch` `/sync/purchase-order/{id}/to-inbound` `/sync/purchase-to-inbound` `/sync/retry-failed` `/sync/statistics` `/sync/supplier-from-srm` `/sync/suppliers-from-srm` `/sync/sync-logs` + `/sync/wms/{sync_type}` `/sync/srm/{sync_type}`（后端存在对应路由）

**判断**：数据同步为**后端内部能力**（跨系统拉取），前端无 UI 入口属正常——**不判定缺陷**；若未来需要同步管理页可接线。

### B. 业务路由（前端无调用，疑似缺 UI 入口或死 API）
| 路径 | 方法 | 判断 |
|---|---|---|
| `/dashboard/real-time-status` | GET | scm 仪表盘实时状态——**前端缺仪表盘页接线**（业务价值高） |
| `/mrp/material-summary` | GET | 物料需求汇总——**前端缺接线**（业务价值高） |
| `/incoming-notices` `/incoming-notices/{id}` | GET/POST, GET/PUT | 到货通知——**前端缺接线** |
| `/incoming-inspections/{id}/fail` | POST | 到货检验失败动作——**前端缺接线** |
| `/comparisons/{id}/approve` | POST | 比价审批——**前端缺接线** |
| `/purchase-orders/{id}/reject` | POST | 采购单驳回——**前端缺接线** |
| `/quotes` `/quotes/{id}` `/quotes/{id}/submit` | GET/POST, GET/PUT, POST | 报价——**前端 0 调用**（仅测试注释误匹配 1 处）——**疑似死 API** |
| `/inquiries` 组 | — | 见第三节（srm 域，scm 冗余） |

### C. 非缺口说明
- `/purchase-items/{id}`：前端 [GET,PUT] vs 后端 [GET,PUT,DELETE]——**后端多 DELETE**（前端未用删除能力——非 404 风险，能力待接线）。

---

## 五、方法归一化口径

- 前端 `apiClient.scm.get(\`/purchase-orders/${id}\`)` → 路径 `/purchase-orders/{param}`
- 后端 `.route("/purchase-orders/{id}", ...)` → 路径 `/purchase-orders/{param}`
- 前端 `${resource}`（factory.ts 泛型 CRUD）**排除**（动态资源名，非具体路径，不参与对比）
- 前缀 `/api/scm` 两端一致（vite.config.ts:125 `apiPrefix: '/api/scm'` ↔ `main.rs api_prefix: "/api/scm"`），对比时忽略

---

## 六、建议处置优先级

| 优先级 | 项 | 动作 |
|---|---|---|
| P0 | 3 处方法级缺口 | 与产品确认删除/更新语义 → 补后端 handler 或删前端定义（需实质性代码修改，不擅改） |
| P1 | scm inquiries 冗余 | 确认无其他调用方后移除（代码修改） |
| P2 | 高价值未接线（dashboard/material-summary） | 前端功能开发接线 |
| P3 | 死 API（quotes 等） | 标注或移除（确认后） |

**本报告仅审计不修改**：所有发现均已标注位置与建议；代码修改待用户确认对应项后逐项执行。
