# TOPEMS · CRM 模块全量填充设计规格

> **版本**: 1.0  
> **日期**: 2026-08-12  
> **作者**: TraeCode Agent (via brainstorming spec)  
> **对应 TODO 版本**: V183+  
> **范围**: CRM 模块全量（18 路由）  
> **填充深度**: B — 四层契约打通 + 状态机 + 审批骨架 + 分析页 Mock 渲染  
> **下一个 spec**: MES 模块（独立）· 深度 B  

---

## 1. 背景与目标

### 1.1 现状

CRM 模块前端骨架已就位（19 个页面 + 10 schema 文件 + 14 API 客户端模块），后端 14 modules + 12 models + customer 样板路由完整。但从骨架到"可运行的业务系统"存在四大缺口：
1. **字段契约断层**：前端 schema → 后端 model 字段命名/类型可能不一致（snake_case vs camelCase）
2. **路由契约断层**：前端 API client path/method ↔ 后端 route 注册无自动化断言
3. **行为契约缺失**：opportunity/return 状态机无越权校验、customer/contact 审批无接口
4. **分析页无数据**：dashboard/funnel/scoring/forecast/segmentation/recommendation 6 分析 + 1 推荐页虽有骨架路由但只渲染空卡

### 1.2 目标（V183-V190 交付）

1. 6 主数据实体（customer/contact/opportunity/interaction/return/billing）100% 打通四层契约：
   - list/create/get/update/delete + batch + 分页 + 搜索 能跑通
   - opportunity 6 阶段状态机 + return 4 阶段状态机能触发
   - customer/contact 审批流 3 接口（start/approve/reject）存在
2. 分析页 7（6 + 推荐）：使用统一 `useCrmMock()` 前端 hook 提供稳定 mock 做真实渲染
3. 后端为分析页保留契约路由（不 404），返回 mock 启用标记 + 空结构
4. 验收三联（typecheck + cargo check + verify_nav）100% 通过，推荐二联（vitest + cargo test）≥70%/70%

### 1.3 非目标（下一个 spec 处理）

- MES 模块（30+ 路由）—— spec 独立撰写（`2026-08-??-mes-full-fill-design.md`）
- 深度 C：RFM 真实模型、客户分群聚类算法、销售预测时间序列、多节点审批流编排引擎
- 支付网关对接（billing 列表只读不做付款动作）

---

## 2. 方案概述（方案 I · 样板实体扩散）

### 2.1 实施路径

```
Phase 1 · customer 样板（35% 工作量）
  ├── L1: schemas/crm/customer.ts zod 完备 + index.ts re-export
  ├── L2: api/crm/customer.ts 5 方法 + 3 审批接口类型契约对齐
  ├── L3: svc/crm/modules/customer.rs 8 routes + utoipa + 审计/租户/权限/缓存
  ├── L4: svc/crm/models/customer.rs Customer + CreateCustomerRequest + UpdateCustomerRequest
  ├── 验收：customer CRUD 端到端（手工冒烟 #1 子流程）+ 输出 📋 4 层契约 Checklist 20 条
  └── 输出：contract_alignment 测试脚本（后复用给其他 5 实体 + MES）

Phase 2 · contact + opportunity 两个高价值实体 + opportunity FSM
  ├── contact: 按 Checklist + 审批骨架三接口
  └── opportunity: 按 Checklist + 6 阶段状态机（lead→qfd→proposal→nego→won/lost/closed）

Phase 3 · interaction + return + billing 收尾
  ├── interaction: 只读列表，快速通过
  ├── return: 4 阶段 3 分支 3 终态 FSM（换货/退款/维修 → resolving → done/returned/rejected）
  └── billing: 只读列表 + 分析视图（与 CRMBillingPage 分析页区分）

Phase 4 · 分析层 7（6+推荐）统一 Mock 层 + Dashboard 总览
  ├── useCrmMock(seed, period): 稳定返回 120cust/40opp/60contact/80int/18return
  ├── 6 分析页: Dashboard/Funnel/Scoring/Forecast/Segmentation/BillingView
  ├── 1 推荐页: CRMRecommendationPage（cross-sell/upsell/followup 三列）
  └── 后端为 7 页保留契约路由（空数据 + mock_enabled 标记响应）

Phase 5 · 状态机/审批骨架 · 行为契约全量收口
  ├── opportunity FSM advance/rollback 越权/乱序断言集成测试覆盖邻接对
  ├── return FSM accept/process/resolve/confirm handler + can_transition 函数
  └── customer/contact 审批三接口（start/approve/reject），深度 B 不做多节点编排

Phase 6 · 验收三联 + 推荐二联 + 手工冒烟五步
  ├── 必过: pnpm typecheck / cargo check -p topems-crm / verify_navigation.mjs --strict
  ├── 推荐: pnpm vitest run --project crm / cargo test -p topems-crm
  └── 手工冒烟五步（见 §8.3）
```

---

## 3. 架构：四层契约模型 + 文件路径真相源

### 3.1 四层契约图（垂直栈）

```
L1 Schema 字段契约        apps/web/src/schemas/crm/*.ts  +  schemas/crm/index.ts re-export
    ↓ CrudPage 自动消费字段元信息
L2 API 前端契约          apps/web/src/api/crm/*.ts      +  api/crm/index.ts 聚合
    ↓ HTTP: { method, path, toOpenApiParams snake_case, AdaptedQuery 类型 }
L3 Route + Handler       svc/crm/src/modules/*.rs create_routes()
    ↓ axum Router + utoipa 注解 + 横切：审计/租户/权限/缓存/事件
L4 Model 实体            svc/crm/src/models/*.rs       +  tenant_id 强制 RLS
```

### 3.2 文件路径清单（唯一真相源）

| 层 | customer | contact | opportunity | interaction | return | billing（只读）|
|----|----------|---------|-------------|-------------|--------|----------------|
| L1 Schema | `schemas/crm/customer.ts` | `schemas/crm/contact.ts` | `schemas/crm/opportunity.ts` | `schemas/crm/interaction.ts` | `schemas/crm/return.ts` | —（复用 crmApi.billing 类型）|
| L2 API | `api/crm/customer.ts` + `types.ts` | `api/crm/contact.ts` | `api/crm/opportunity.ts` | `api/crm/interaction.ts` | `api/crm/returns.ts` | `api/crm/billing.ts` |
| L3 Route | `modules/customer.rs` + utoipa | `modules/contact.rs` | `modules/opportunity.rs` + FSM | `modules/interaction.rs` | `modules/aftersales.rs` + FSM | `modules/billing.rs` |
| L4 Model | `models/customer.rs` + DTO | `models/contact.rs` | `models/opportunity.rs` + win_rate | `models/interaction.rs` | `models/aftersales.rs` | `models/billing.rs` |

### 3.3 Checklist 20 条（样板实体 customer 跑通后输出，套用到其他 5 实体）

**L1（5 条）**
1. 字段命名 camelCase；必填/可选明确；枚举用 `z.enum`
2. `schemas/crm/index.ts` `export * from './customer'`
3. `zod schema` 导出并含 `type Customer = z.infer<typeof customerSchema>`
4. 与后端字段集合做 to_snake 后对称（契约对齐测试用）
5. CrudPage 能正确渲染列配置（列名/类型/可搜索/可排序标记）

**L2（5 条）**
6. list/create/get/update/delete 五基础方法；customer 追加 batchDelete + 3 审批接口
7. 方法签名使用 `AdaptedQuery<'list_xxx'>` 与 `AdaptedRequestBody<'create_xxx'>`
8. `toOpenApiParams` 做 page/page_size/search/status 等 snake_case 转换
9. `apiClient.crm.get`/`.post`/`.put`/`.delete` path 与后端 create_routes 路径完全一致（无前缀重复）
10. 返回类型使用 `TypedPaginatedResponse<T>` / `TypedApiResponse<T>`（前端类型安全）

**L3（6 条）**
11. `create_routes()` 内所有路由注册 method+path 与 L2 映射对完全吻合
12. 每个 handler 有 `#[utoipa::path]` 标注；responses 写真实结构体（非 Value）
13. PaginationParams 有 `#[serde(default)]` 合理默认 + 上限钳制（page_size 最大 200）
14. 5 横切：audit log_event / tenant get_tenant_id + 双写 WHERE / permission check_module / customer_cache_key CACHE_GET_SET / MdmEventService publish
15. 错误返回统一使用 topems_shared `api_error` 并带 CRM::* 前缀错误码
16. handler query 注入变量全用参数绑定（SQL 注入零容忍）

**L4（4 条）**
17. `struct Customer` 全部字段 `#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]` + `Default` impl（保证 unwrap_or_default 可运行）
18. `CreateCustomerRequest / UpdateCustomerRequest` 与 L2 schema 字段集合（snake_case 转换后）完全一致
19. 每表强制 `tenant_id: Uuid` 字段；RLS 通过 middleware + handler 条件双重保证
20. 提供 `#[derive(ToSchema)]` 或手动 utoipa 注册以供 OpenAPI 聚合正确生成

---

## 4. 6 实体核心字段映射表（L1 camelCase ↔ L4 snake_case 对齐）

> 非空标记 `*` 代表两端都 require；枚举为强类型；owner_id 一律指 FK → iam users.id

| 角色 | customer | contact | opportunity | interaction | return | billing（只读）|
|------|----------|---------|-------------|-------------|--------|----------------|
| PK+RLS | `id` UUID, `tenant_id` RLS | `id`, `tenant_id`, `customer_id` FK | `id`, `tenant_id`, `customer_id` FK, `owner_id` FK | `id`, `tenant_id`, `customer_id` FK, `contact_id` FK, `opportunity_id` null | `id`, `tenant_id`, `customer_id` FK, `order_id` | `id`, `tenant_id`, `customer_id` FK, `invoice_no` UK |
| 核心字段 | `name*`, `customerType*(enterprise/individual)`, `industry`, `rating(A/B/C/D)`, `region` | `fullName*`, `position`, `email*UK`, `phone`, `isPrimary` bool | `title*`, `amount(decimal>0)`, `currency(CNY/USD/EUR)`, `winRate(0.0~1.0)`, `stage*枚举`, `closeDate` | `channel*枚举(email/phone/meeting/wechat/other)`, `direction(inbound/outbound)`, `summary*≤1000`, `happenedAt` | `returnType*(exchange/refund/repair)`, `reason*`, `productSku`, `orderNo*` | `billingPeriod(YYYY-MM)`, `totalAmount(12,2)`, `taxAmount`, `status(draft/issued/paid/overdue)`, `dueDate` |
| 标签/关系 | `tags[]` many→many via taggings, `owner_id` FK | — | `tags[]`, `competitorCount(int≥0)` | `attachments[](URL[])` | `pics[](URL[])`, `handledBy` FK→users | `items[]` JSON 聚合行项目 |
| 时间戳 | `createdAt` auto, `updatedAt` auto, `deletedAt` soft | `createdAt/updatedAt` | `stageChangedAt`, `nextActionAt`, `createdAt/updatedAt` | `createdAt/updatedAt` | `resolvedAt` (done 时设置), `createdAt/updatedAt` | `issuedAt`, `paidAt`, `createdAt` |
| 审批骨架 | `approvalStatus`(none/pending/approved/rejected) + 三接口 | `approvalStatus` 同上 + 三接口 | —（推进用 FSM 不用审批）| — | — | — |

---

## 5. 双状态机设计

### 5.1 Opportunity 6 阶段 3 终态（紫色 FSM）

```
新建（草稿）
  ↓ submit
① 线索识别 · lead   强制：source, primary_contact 必填
  ↓ advance
② 需求确认 · qualified   强制：amount, close_date
  ↓ advance
③ 方案报价 · proposal   强制：win_rate ≥ 0.4 （建议）
  ↓ advance
④ 商务谈判 · negotiation   强制：competitor_count
  │              ↑ rollback(虚线，需 note)
  ├─▶ ✅ 赢单 · won      终态
  ├─▶ ❌ 输单 · lost     终态
  └─▶ ⏸ 搁置 · closed    终态（搁置）
```

**接口契约：**
```
POST /crm/opportunities/:id/advance
  body: { target_stage: qualified | proposal | negotiation | won | lost | closed, note: string? }
  权限: owner_id = 当前用户 OR opportunity_admin
  事件: opportunity.advance / opportunity.won / opportunity.lost

POST /crm/opportunities/:id/rollback
  body: { note: string }   ← 必填
  权限: owner OR opportunity_admin
  事件: opportunity.rollback
```

**can_transition 规则（handler 级断言）：**
- draft → lead 不需要前置
- lead ↔ qualified / qualified ↔ proposal / proposal ↔ negotiation：允许 advance 和 rollback
- negotiation → won/lost/closed 允许，但 won/lost/closed → * 一律拒绝（终态保护）
- 非 owner 且无 opportunity_admin：返回 403 CRM::NOT_OWNER（即使前端按钮 disabled 也要后端校验）

### 5.2 Return 4 阶段 3 分支 3 终态（蓝色 FSM）

```
提交申请
  ↓ 自动登记
① 待受理 · pending   24h 分派
  ↓ accept(分派处理人)
② 已受理 · accepted
  ↓ process(type) 启动处理
③ 处理中 · processing
  ├──▶ 换货执行 (新SKU出库单号)  ─┐
  ├──▶ 退款执行 (金额+交易流水) ──┤合流
  └──▶ 维修执行 (修复/更换部件) ─┘↓
④ 待客户确认 · resolving
  ├─▶ ✅ 完成 done (客户确认完成)
  ├─▶ ↩ 退回回退 returned (回到处理中，可再分派)
  └─▶ ❌ 拒绝 rejected (客户拒绝结果，rejected 终态记录审计)
```

**接口契约：**
```
POST /crm/returns/:id/accept     { handled_by_id: UUID }                event: return.accept
POST /crm/returns/:id/process    { type, pics, note }                   event: return.process.{type}
POST /crm/returns/:id/resolve    { result: string }                     event: return.resolve
POST /crm/returns/:id/confirm    { decision: done|returned|rejected, customer_comment? }
```

---

## 6. 审批骨架（customer/contact 三接口共用）

深度 B：接口存在 + CrudPage 有三个按钮；多节点/并行/串行编排后续独立 spec 做（深度 C）。

```
POST  /{entities}/:id/approval/start    body: { approver_ids: [UUID], note?: string }
      └ 响应: { approval_status: pending, approver_ids, created_at, initiated_by }

POST  /{entities}/:id/approval/approve  body: { note?: string }    (审批人调用)
      └ 响应: { approval_status: approved, approved_by, updated_at }

POST  /{entities}/:id/approval/reject   body: { reason: string! }   (审批人调用，reason 必填)
      └ 响应: { approval_status: rejected, rejected_by, reason, updated_at }
```

**审计日志**：三接口统一记录到 `audit_log`，action = `crm.{entity}.approval.{start|approve|reject}`，携带审批前后 `approval_status` 快照。

---

## 7. 分析层：7 页面统一 Mock Generator + Dashboard 布局（深度 B 标准）

### 7.1 统一入口

```ts
// apps/web/src/api/crm/_mock.ts
export function useCrmMock<T = unknown>(config: {
  seed?: number;      // 稳定 seed = 42（默认）
  period?: 'MTD' | 'QTD' | 'YTD' | 'ROLLING_12M';
  locale?: 'zh-CN' | 'en-US';
}): { data: T; mockEnabled: boolean; refresh: () => void }
```

**启用条件（任一 true 即启用）：**
1. `import.meta.env.VITE_ENABLE_CRM_MOCK === 'true'`
2. API 请求失败 401/404 且参数 `?fallback=mock` 命中
3. 演示模式 `window.__TOPEMS_DEMO__ === true`

**禁用（优先级最高）：** `VITE_CRM_DISABLE_MOCK === 'true'`（生产构建）

### 7.2 七页面数据契约 + 后端保留路由

| # | 页面 | Mock 数据结构 | 后端保留契约路由 |
|---|------|---------------|----------------|
| 1 | DashboardPage | `{ kpis, funnel:StageAmount[], forecastPoints: ForecastPoint[]×3 线, ratingBuckets }` | `GET /crm/dashboard/overview?period=MTD\|QTD\|YTD\|ROLLING_12M` |
| 2 | CRMSalesFunnelPage | `{ byCount: StageStat[], byWeightedAmount: StageStat[], toggleView }` | `GET /crm/analytics/funnel?granularity=monthly&quarter=2026Q3` |
| 3 | CRMCustomerScoringPage | `{ distribution: number[][], buckets:{A,B,C,D}[]counts&percents, top10, rfmBreakdown }` | `GET /crm/analytics/scoring?model=rfm_simplified` |
| 4 | CRMSalesForecastPage | `{ series:{actual, weightedPipeline, target}[]×12 monthly, summary:{3M,6M,12M gaps} }` | `GET /crm/analytics/forecast?horizon=12M&confidence=0.8` |
| 5 | CRMCustomerSegmentationPage | `{ scatter:{x:value_score,y:activity,id,label}[50], quadrants: VIP/高潜/沉睡/观望, quadrantRules }` | `GET /crm/analytics/segmentation?matrix=value_x_activity` |
| 6 | CRMBillingPage（分析视图） | `{ top10ByAmount: {customer_id,name,amount}[], statusPie, agingBuckets }` | `GET /crm/analytics/billing?period=QTD` |
| 7 | CRMRecommendationPage | `{ cross_sell[5], upsell[5], follow_up[5] }(每条含 confidence+优先级)` | `GET /crm/analytics/recommendation?ruleset=default_v1&limit=5` |

### 7.3 Dashboard 栅格（参考 §3 blueprint 可视化）

**Row 1（KPI 条 ×6 col-2 each）：** 客户总数 / 商机总数（open）/ 赢率 % / 本月新签额 / 活跃联系人 / 待处理售后

**Row 2（Charts）：** 销售漏斗（5 阶段条形，col-5）+ 销售预测三线折线（col-4）+ 客户评分 A/B/C/D 桶条形（col-3）

### 7.4 后端实现策略（深度 B 不做算法）

所有 7 条路由存在并注册到 Router；handler 返回：
```rust
Json(ApiResponse {
  success: true,
  data: vec![].into(),   // 空结构（schema 定义为空数组→前端 fallback mock）
  meta: json!({
    "mock_enabled": true,
    "use_frontend_fallback": true,
    "note": "聚合算法待 Vx 深度 C 交付"
  })
})
```

前端 API 客户端读 meta.mock_enabled == true 时用 `useCrmMock()` 填充，保证视觉效果在任何网络条件下都可演示。

---

## 8. 错误处理 + 测试策略 + 验收三联

### 8.1 错误码前缀（CRM::* 统一命名，避免散）

| 错误码 | HTTP | 含义 |
|--------|------|------|
| `CRM::TENANT_MISMATCH` | 403 | 跨租户访问，RLS 中间件 + handler 双重拦截 |
| `CRM::INVALID_TRANSITION` | 422 | FSM 非法推进/回退（won 回退、乱序）|
| `CRM::NOT_OWNER` | 403 | 非 owner/审批人 操作 opportunity/return |
| `CRM::VALIDATION_ERROR` | 422 | DTO 字段校验失败（email 重复、amount≤0 等，附字段 path）|
| `CRM::NOT_FOUND` | 404 | `{entity} {id} not found`，区分实体类型 |
| `CRM::APPROVAL_DUPLICATE` | 409 | 同一实体在 pending 状态下重复发起 approval.start |
| `CRM::INTERNAL` | 500 | 兜底（附 request_id，message 不暴露 trace）|

### 8.2 测试策略（三层覆盖）

**L1 前端单元（vitest，目标 ≥75% line）：**
- `schemas/crm/__tests__/`: 每个 schema zod parse → parse success 正例 + parse fail 反例（必填/枚举/范围）
- `api/crm/__tests__/contract.test.ts`：① 方法名 path.method 对表（防止未来改 path 漏改路由）② toOpenApiParams 转换一致性（camel→snake）
- `pages/crm/__tests__/CrudPage-{entity}-render.test.tsx`：CrudPage + mockApiAdapter 渲染快照（空数据/10条数据/错误态 三种快照）

**L2 后端单元（cargo test，目标 ≥70% line）：**
- `opportunity_fsm_test.rs`：can_transition 对 6×3 邻接对全跑；rollback note 必填；非 owner 403
- `return_fsm_test.rs`：can_transition；accept 缺 handled_by_id；process 三分支参数；confirm 三种终态
- `pagination_test.rs`：page_size=99999 钳制到 200；page=0 钳制到 1；search 长度限制
- `rls_isolation_test.rs`：跨租户查询 0 条；写入不同 tenant_id 后再查另一 tenant 0 条（RLS + handler WHERE 双保险）

**L3 契约一致性（前后端双边对单，一票否决）：**
- `scripts/dev/check-crm-contract.mjs`（Node）：读 utoipa-generated OpenAPI JSON → 生成 {path+method} 集合 + 字段（snake_case）集合；与前端 api/crm 方法表 + zod 字段（snake 转换）做集合差；非空输出详细 diff 并 exit 1
- Phase 1 结束时提交此脚本并接入 pre-commit hook

### 8.3 验收标准：3 必过 + 2 推荐 + 5 手工冒烟

#### 必过三联（不通过不能进入下一 Phase）

```
1. pnpm typecheck                                 (tsc --noEmit: exit 0)
2. RUSTFLAGS="-D warnings" cargo check -p topems-crm    (exit 0, 0 warning)
3. node scripts/verify_navigation.mjs --strict       (exit 0, CRM 18 routes 三联全绿)
```

#### 推荐二联（加分项，交付前完成，覆盖率阈值如上）

```
4. pnpm vitest run --project crm --coverage       (≥75% lines)
5. cargo test -p topems-crm                       (≥70% lines)
```

#### 手工冒烟五步（QA Checklist Phase 6 结束执行）

| # | 场景 | 操作 | 期望结果 |
|---|------|------|---------|
| 1 | **Customer CRUD** | 创建（合法+非法 email 两例）→ 列表搜索 → 编辑 3 字段 → 3 条 batch delete | 非法 email 422 内联红字；编辑保存 toast；删除后列表数正确 |
| 2 | **Opportunity FSM win** | 选 1 opportunity → advance×4 (lead→nego) → advance won → 尝试再 advance | status 徽章实时刷新；won 后 advance 按钮 disabled；Dashboard Funnel won 柱 +1 |
| 3 | **Return done 全流程** | 创建申请 → accept 分派 → process refund → resolve 执行 → confirm done | timeline 每步都有；终态 done 绿色徽章 ；操作按钮置灰 |
| 4 | **Dashboard 周期切换** | 顶部 period 选择器：MTD → QTD → YTD → ROLLING_12M | 6 KPI 数值/图有变化；无 console.error；折线 loading skeleton 过渡流畅 |
| 5 | **越权 403 友好** | 普通用户账号 → URL 打开他人 opportunity → 点击 advance | 不白屏；NoPermissionCard 显 owner + "你无权操作此商机"；返回上页按钮仍可操作 |

---

## 9. 交付物清单（writing-plans 拆任务时以此为 Checklist）

- [ ] **Phase 1** customer 样板四层打通 + Checklist 20 条文档化 + contract 对齐脚本提交 + pre-commit 接入
- [ ] **Phase 2** contact + opportunity 按 Checklist 对齐 + opportunity FSM handler + 单元测试覆盖邻接对
- [ ] **Phase 3** interaction + return（含 FSM）+ billing 按 Checklist 对齐；billing 只读列表不要做修改动作
- [ ] **Phase 4** `useCrmMock()` 统一 Mock Generator 提交 + 7 分析页消费 + 7 后端保留路由注册（返回 mock 标记）
- [ ] **Phase 5** customer/contact 审批三接口实现（事件审计落表）+ opportunity/return can_transition 函数集成测试
- [ ] **Phase 6** 验收三联通过 + 推荐二联达标 + 手工冒烟五步录像/截图证据

---

## 10. 风险与后续

### 10.1 风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 深度 B 的 mock 在演示环境之外仍依赖，用户想直接联真实算法 | 高 | 需求变更大 | Phase 4 后端路由保留 + meta.mock_enabled 标记清晰，切换只需替换 handler 为真实聚合 SQL，前端零改动 |
| 前端 CrudPage 抽象对 opportunity 多动作按钮（advance/rollback）支持度不足 | 中 | 要手写 1-2 个自定义行操作列 | 提前在 Phase 2 检查 CrudPage 的 `rowActions` prop；若不足，先补组件能力（影响所有实体）|
| RLS 中间件 + handler WHERE 双保险反而造成性能下降（2× WHERE）| 低 | 查询慢 10% | 数据库层面开启 tenant_id 索引；Phase 5 后可以 benchmark 决定是否去掉一个冗余查询条件（保留 middleware 注入 + 显式 WHERE，安全优先）|

### 10.2 后续 spec（不在本 spec 范围）

1. **MES 模块全量填充 spec**（30+ 路由 + 24 backend modules）→ `docs/superpowers/specs/2026-08-??-mes-full-fill-design.md`
2. **深度 C 升级 spec**（RFM 真实模型、分群聚类、预测时间序列、审批编排引擎）→ 需再走一次 brainstorming → spec 流程
3. **深度 B → C 切换计划**（聚合 SQL 优化 + 大盘索引 + 定时任务预聚合）

---

**_End of CRM full-fill spec v1.0_**
