# P3-28　contract_fallback 全量清理与"A类降级/B类双向删"（批 37 执行记录）

- 批次：审计整改第三十七批（延续批 36「写操作绝不假成功」原则，本批扩展为「假成功端点一步到位清干净」）
- 日期：2026-11-07
- 提交：见文末
- 原则：**一步到位，清理一步到位**

---

## 一、本批背景：批 36 遗留的最大面

批 36 只修了 `/customers` 系的假成功，`contract_fallback.rs` 其余 **161 个占位端点**仍在：

- `mutate_ok` 返回 `200 + "操作成功（轻量兜底，待上游支持）"`，**数据一条不落库**；
- 75 个写端点属于此类。用户点「审批通过」「发起工作流」「保存看板」看到成功提示，实际什么都没发生，**不会重试**——比报错危害更大。

批 36 把这批登记为遗留，理由是"影响面不可控"。本批用**四路取证**把这个面量清楚了，证明影响面其实极小。

---

## 二、机器化盘点（先量清楚，再动手）

对 `contract_fallback.rs` 做 AST 级解析（配对括号解析 `.route(...)` 内嵌 `get/post/put/delete`）：

```
总方法端点 161
├── mutate_ok（假成功写）        75
├── list_empty（读空列表）       51
├── detail_missing（读内层404）  32
└── mutate_unavailable（批36已修） 3
```

按业务前缀分组：workflow 9 / approvals 8 / ai 8 / inventory 5 / suppliers 4 / routes 4 / inspection 4 / geofences 4 / shortcuts 3 / reports 3 / documents 3 / data 3 / dashboards 3 / quality 2 / projects 2 / production 2 / leads 2 / 其余各 1。

---

## 三、四路取证方法与关键陷阱

**不能只 grep 端点路径**——批 35 已踩过 barrel 间接引用的坑。取证链必须三步：

1. 在 `apps/web/src/api/mobile/*.ts` 找端点路径字符串 → 定位所属 **API 函数名**；
2. 用 **API 函数名**在 `apps/web/src/`（排除 `src/api/` 自身与 `__tests__/`）全量 grep；
3. 核查 barrel `index.ts` 的平铺别名是否被别处 import。

**本批暴露的关键事实**：mobile 页面**根本不走 `@/api/mobile/*` 这条通道**，而是各自走独立模块——

| 页面域 | 实际走的 API 通道 |
|---|---|
| AI 助手 | `@/api/ai/chat`、`@/api/ai/businessCopilot` |
| 审批 | `@/api/workflow/approval` |
| 报表/BI | `@/api/report` |
| GIS 围栏 | `@/api/gis` |
| 文档 | `@/api/pdm` |
| 供应链 | `@/api/srm`、`@/api/erp` |
| 质检/巡检 | `@/api/qms/inspection` |
| MES | `@/api/mes` |

所以 `@/api/mobile` 下这些封装**自诞生起就没有消费方**——"声明了但从不调用"。

---

## 四、分类结果（三组并行取证）

| 组 | 业务域 | 端点数 | A 类 | B 类 | C 类 |
|---|---|---|---|---|---|
| g1 | AI / 工作流 / 审批 / 报表 / 看板 / 数据 / 快捷方式 | 71 | **0** | 71 | 0 |
| g2 | 供应链 / 库存 / 生产 / 质量 / 巡检 | 35 | **1** | 34 | 0 |
| g3 | 空间 / 组织 / 文档 / 项目 / 员工 / 客户子端点 / 线索 | 55 | **0** | 55 | 0 |
| **合计** | — | **161** | **1** | **160** | **0** |

- **A 类 1 个**：`POST /production/orders/{p1}/pause`（`useMobileProduction.ts:196` → `productionApi.pauseOrder`），前端"暂停生产订单"真实在用。
- **B 类 160 个**：前端有封装、全仓零引用。
- **C 类 0 个**：每个端点在 `@/api/mobile` 都有对应封装（C 类定义是"连封装都没有"，本批不成立）。

---

## 五、三类处置

### A 类（1 个）→ 改 503

`contract_fallback.rs` 只保留：

```rust
Router::new().route("/production/orders/{p1}/pause", post(mutate_unavailable))
```

实测：
```
POST /api/mobile/production/orders/x/pause
→ HTTP 503, code=503, message="上游服务未接入：MES，暂停生产订单未执行"
```

### B 类（160 个）→ 双向删

**前端删**（含整文件删除 4 个）：

| 文件 | 删除内容 |
|---|---|
| `api/mobile/aiAssistant.ts` | **整文件**（15 方法） |
| `api/mobile/workflow.ts` | **整文件**（7 方法） |
| `api/mobile/bpm.ts` | **整文件**（15 方法） |
| `api/mobile/report.ts` | **整文件**（17 方法） |
| `analytics.ts` | 5 个（保留 `getUsageStats`，被 `MobileHomePage.tsx:122` 真实调用） |
| `approvalEnhanced.ts` | 11 个 |
| `shortcut.ts` | 3 个（保留 `listShortcuts`/`createShortcut`，打真实 handler） |
| `project.ts` | 9 个（含 `updateTaskStatus`） |
| `inspection.ts` | 8 个（全删） |
| `inventory.ts` | 7 个 |
| `production.ts` | 4 个（保留 `pauseOrder` = A 类） |
| `quality.ts` | 4 个 |
| `supplier.ts` | 11 个（全删，`supplierApi = {}`） |
| `gis.ts` | 19 个（全删，`gisApi = {}`，类型保留） |
| `device.ts` | 3 个（保留 `registerDevice`/`updatePushToken`） |
| `document.ts` | 7 个 |
| `employee.ts` | 8 个 |
| `attendance.ts` | 1 个（`cancelLeave`） |
| `customer.ts` | 8 个（5 个 customers 子端点 + 3 个 leads） |
| `index.ts` | barrel 对应的 import / 平铺别名 / 命名导出 / 类型 re-export 全部同步移除 |

**后端删**：`contract_fallback.rs` 从 **245 行 / 161 端点 → 约 70 行 / 1 端点**。

### 死端点（用户点名第 4 项）单独处置

| 端点 | 前端声明 | 判定 | 处置 |
|---|---|---|---|
| `POST /production/orders` | **无** | C 类 | 删 handler `create_production_order` + 路由 `.post(...)` |
| `PUT /production/orders/{id}` | **无** | C 类 | 删 handler `update_production_order` + 路由 `.put(...)` |
| `DELETE /production/orders/{id}` | **无** | C 类 | 删 handler `delete_production_order` + 路由 `.delete(...)` |
| `GET /production/equipment/{id}` | 有封装但**零调用** | B 类（前端）/ 后端**真实未挂** | **不是重复占位**：`production.rs:get_equipment` 早已实现但 `shared/mod.rs` 没 import 也没路由。**已挂上真实路由**，删 fallback 占位 |

`production.ts` 的 12 个方法逐一核对，确认无 `createOrder`/`updateOrder`/`deleteOrder`；barrel 也无。故三者为真死代码。

实测挂载结果：
```
GET /api/mobile/production/equipment/1 → HTTP 200, code=200, data=null
（真实 handler 接管，MES 未接入时降级 null，不再由 fallback 的 detail_missing 应答）
```

---

## 六、过程中发现的一个漏项（g3 漏删导致 smoke 红）

首轮 smoke 出现 **5 FAIL**，全部是 customers 子端点（`route_missing` 404）：

```
FAIL POST /api/mobile/customers/{id}/assign      -> 404  mobile/customer.ts:147
FAIL GET  /api/mobile/customers/{id}/contacts    -> 404  mobile/customer.ts:155
FAIL POST /api/mobile/customers/{id}/contacts    -> 404  mobile/customer.ts:162
FAIL GET  /api/mobile/customers/{id}/follow-ups  -> 404  mobile/customer.ts:168
FAIL POST /api/mobile/customers/{id}/follow-ups  -> 404  mobile/customer.ts:175
```

**原因**：g3 组把这 5 个标注为"批 36 已改 503，本批仅标注未动"，**没有删前端封装**；而我把后端占位路由删了 → 前端有声明、后端无路由 → 404。

**处置**：取证已证明这 5 个同样零真实调用（`listContacts` 的唯一命中是 `@/api/communication/readOps2.ts` 的同名方法，非 mobile 通道），按 B 类规则一并双向删（前端 `customer.ts` + barrel 5 条 + 后端已删）。

复跑 smoke 全绿。

---

## 七、smoke 端点总数变化（与删除量精确对账）

smoke 的端点由 `scripts/web_contract_smoke.py:477 extract_endpoints()` **扫前端源码**提取，不是从后端路由来。所以删前端封装 → 端点数下降。

| | 端点总数 | FAIL | [mobile] | 豁免数 |
|---|---|---|---|---|
| 批 36 末（基线） | **4661** | 0 | 295/295 | 0 |
| 批 37 首轮（含漏删） | 4506 | **5** | 135/140 | 0 |
| **批 37 终态** | **4501** | **0** | **135/135** | **0** |

- **4661 → 4501，正好降 160**，与删除的 160 个 B 类端点**精确对上**。
- 未新增任何豁免，`（已知非后端缺口豁免 0）`。

---

## 八、门禁与验证结果

| 项 | 结果 |
|---|---|
| `cargo check -p topems-mobile` | exit 0，零新增 warning |
| `cargo check -p topems-server` | exit 0（17.35s） |
| `cargo build -p topems-server` | 28.96s 成功 |
| `cargo fmt --check` | **0 Diff** |
| `pnpm typecheck` | **0 errors**（多轮独立复核） |
| `eslint src/api/mobile/` | **0 problems**（删方法后清理了 4 个未使用 import：`gis.ts` 的 apiClient/ApiResponse/PaginatedResponse、`project.ts` 的 PaginatedResponse） |
| 全量 vitest | 见提交记录 |
| 迁移四件套 | 本批**无新迁移**（630 个 sql 文件，`git status database/` 无变化） |

---

## 九、留存与边界说明

- **`gis.ts` / `supplier.ts` 保留为 `{}` 空对象而非整文件删除**：它们同时导出**类型定义**（`RouteStatus` 等被其它模块引用），API 对象清空是合理的局部收敛。若将来也无人用类型，再整文件删。
- **`detail_missing` / `list_empty` / `mutate_ok` 三个 handler 函数已随端点一并删除**：清空后仅 `mutate_unavailable` 保留并被 pause 使用，避免 `dead_code` 警告。
- `contract_fallback.rs` 的模块文档已重写，把四路取证方法、161→1 的结论、以及"为什么不走 501"写进代码注释，供后续接手者判断。
- **本批未做的事**：`/data/export` 这类"导出接口返回空列表"的语义错误端点已随 B 类删除，若将来要真实实现导出，应返回文件流/URL，而不是列表。

---

## 十、改动清单

后端：
- `svc/mobile/src/modules/contract_fallback.rs` — 161 → 1 端点，重写模块文档
- `svc/mobile/src/modules/production.rs` — 删 3 个 C 类死 handler
- `svc/mobile/src/shared/mod.rs` — 删 3 条写路由注册、挂 `get_equipment` 到 `/production/equipment/{id}`、调整 import

前端（19 个文件）：
- 整文件删除：`api/mobile/aiAssistant.ts`、`workflow.ts`、`bpm.ts`、`report.ts`
- 方法级删除 + barrel 同步：`inspection.ts`、`inventory.ts`、`production.ts`、`quality.ts`、`supplier.ts`、`gis.ts`、`device.ts`、`document.ts`、`employee.ts`、`attendance.ts`、`customer.ts`、`analytics.ts`、`approvalEnhanced.ts`、`shortcut.ts`、`project.ts`、`index.ts`

文档：`TODO.md`、`docs/audit/TOPEMS审计整改计划_2026-11-01.md`、本文件。
