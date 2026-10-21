# 契约兜底（contract_stubs）→ 上游实现映射台账（B4 / F4）

> 生成：2026-10-19（2026-10-20 修订 §4.19/§5）· 来源：`svc/unified-core/src/routes/contract_stubs.rs`
> **计数口径（防对账歧义）**：旧基线 125 为原始 `.route(` 注册数；现存活 **78** 为 `.route(` 注册数口径；按「方法-端点对」计为 **82**（help 等链式 `get().post()` 同一 path 注册多方法，故方法对多于 route 注册数）。后续对账须注明用哪种口径。
> 挂载：`svc/unified-core/src/routes/mod.rs:187` `.merge(contract_stub_routes())`，位于 core 受保护路由轨，实际前缀 `/api/core/*`（双轨 `/api/v1/core/*`）。
> 口径：本文档为**纯文档台账，不改任何代码**；用于后续逐条对接/挂载/存废决策。端点最终存废与 BE-08（349 条 API 存废待业务勾选）同源，需业务确认后再动。

## 0. B4 第一批核销记录（2026-10-19，已落地代码）

**删除判据（三者同时满足才删，否则保留以免裸 404）**：① core 内无同前缀真实路由覆盖；② 活前端代码无 `apiClient.core` / 裸 client 打该路径（`api/ai/generated/client.ts` 为零消费废弃生成代码、`__tests__` 不计）；③ 能力已由独立 svc 承接。

**本批删除 26 条（125 → 99）**，`cargo check -p topems-unified-core` 与 openapi/smoke 测试绿：

| 域 | 删除 | 保留（仍被 core 兜底依赖） |
|---|---|---|
| governance（12→2） | dashboard / score / risk / compliance / cost / performance / security-events(GET+POST) / audit / recommendations | trends(GET)、refresh(POST)（`governanceDashboard.ts:351,384` 走 core） |
| forms（7→1） | GET `/forms` 列表、validate / auto-fill / generate / submit / draft | GET `/forms/{id}`（`businessIntelligence.ts:253` 走 core） |
| copilot（8→3） | POST `/copilot/sessions`、chat、intent、GET `/copilot/modules`、GET `/copilot/modules/{id}` | sessions(GET/DELETE)、modules/{id}/faq（`businessCopilot.ts:214,222,268` 走 core） |
| documents（9→4） | GET 列表、POST 创建、GET `{id}`、DELETE `{id}`、generate | parse、summary(GET+POST)、search（`businessIntelligence.ts:330,340,350,370` 走 core） |

**本批实测纠正（推翻原台账 🟢 判断，不可删）**：

- **system/api-keys（2）→ 改 🔴**：`settings.rs` 真实仅 GET 列表 / POST 创建 / DELETE `{id}`；stub 的 GET 详情、PUT 更新是**未实现**，非冗余。
- **wms-approval（12）→ ✅ 第二批已对接删除**：复核纠正第一批"仅 4 条/不可对接"的单行 grep 误判——svc/wms 实际已挂 inbound/outbound/stock-take 各 start/approve/reject + transfer start/approve/reject（11 条，transfer 命名 `/transfers`）。前端 `wmsApprovalApi` 由裸 `apiClient`（core 兜底）改指 `apiClient.wms`（去 `/wms` 前缀、transfer 改 `/transfers`），body 对齐后端 `{operator, comment}`；core 12 条兜底删除，集成测试 18 passed。
- **help（7）→ 保留**：`help.ts` 注释明示走 core client，非已迁出。
- **search（4）→ 全保留**：`shared/index.ts:176,180,184,188` 活调 core `/search`、`/search/suggestions`、`/search/recent`(GET/DELETE)。
- **dict（1）→ 保留（第一批）**：`system/index.ts:146` 走 core `/dict/dict-types/{id}/items`。**⑤已对接**：改指 master-data 真实路由并删 core 空壳（见 4.8）。

**第二批②③实测结论（无可静态闭环项，不擅自新建/删除）**：

- **② tenant 🟡「已写 handler 待挂载」经实测不成立**：`modules/tenant/handlers.rs` 全部已写函数（CRUD/stats/metrics/usage/billing/invoices/quota/modules/switch/invite 等）均已在 `master.rs` 挂载；stub 的 `analytics/*`、`billing/subscription|plan|cancel|card`、`features/*`、`settings/branding/domains/email-config/integrations/webhooks/security/*` 在 core **无对应已写 handler**（`tenant_analytics.rs`/`tenant_security.rs` 等文件不存在），属待新建而非待挂载；前端 `tenantConfigApi/tenantSecurityApi/tenantAnalyticsApi` 封装无页面直接消费。故本批不挂载、不新建，台账 🟡 纠正为 🔴。
- **③ comments/favorites 不可走存废删除**：`CommentsPage.tsx`、`FavoritesPage.tsx` 页面在用，core 无通用实现，属待新建活需求，删除会裸 404。→ 已由 ④ 落地真实后端，见下。

**第二批④ 真实落地（2026-10-19，87 → 79，删 8 条空壳）**：

- **comments（4）+ favorites（4）→ ✅ 新建通用后端替换**：新增 `modules/engagement`（`mod.rs` 幂等自举建表 `core_comments` / `core_favorites`，`handlers.rs` 7 个 handler，`models.rs` 对齐前端契约）。评论按 `entity_type+entity_id` 扁平列出、作者本人改/软删；收藏按当前用户隔离、唯一键幂等、`/favorites/check` 返回 boolean。路由挂 `master.rs`（登录即可用，靠全局 auth_middleware 注入 Claims，不绑细粒度权限点），`embedded.rs`/`main.rs` 注册 `init_database`。core 8 条空壳删除。`cargo check`/clippy/fmt 绿，engagement 3 个 serde 单测通过。注：评论首版扁平（`parent_id` 存锚点、不服务端组装 replies 树）；端到端造单需起栈验证。

## 1. 兜底类型（4 种 handler）

| Handler | 返回 | 用途 |
|---|---|---|
| `stub_list` | 200 + 分页空壳 `{items:[],total:0,page:1,page_size:20}`，message「待上游支持」 | 列表/查询类 |
| `stub_action` | 200 + `{success:true}` 成功回执 | POST/PUT/DELETE 写操作 |
| `stub_detail_404` | HTTP 200 + 内层 `code=404`（避免被契约 smoke 判为 route_missing） | 资源详情类 |
| `stub_string_array` | 200 + 空数组 | 分类/标签列表 |

## 2. 状态图例

| 状态 | 含义 | 处置方向 |
|---|---|---|
| 🟢 | **上游已有实现**（独立 svc 或 core 真实 handler 已存在） | 网关/前缀对接或前端改指，core 兜底随后移除 |
| 🟡 | **core 内已有 handler 待挂载**（函数已写、未进路由树） | 挂路由对齐前缀，替换兜底 |
| 🔴 | **待上游新建**（全仓 0 命中） | 排期新建，或产品判定不做 |
| ⚪ | **前端未确认调用** | 随 BE-08 业务勾选存废，可能直接删 |

## 3. 总览（截至第二批⑤：78 条 / 21 域；原 125，已删 47 = 第一批26 + WMS审批12 + comments/favorites8 + dict items1）

| 域 | 条数 | 主要状态 | 上游候选 / 现状 | 前端调用文件 |
|---|---:|---|---|---|
| copilot | 3（原8，已删5） | 🟢 已核销 | 5 条死兜底已删；sessions(GET/DELETE)、faq 仍走 core | `api/ai/businessCopilot.ts` |
| forms | 1（原7，已删6） | 🟢 已核销 | 6 条死兜底已删；仅 GET `/forms/{id}` 走 core | `api/ai/businessIntelligence.ts` |
| documents | 4（原9，已删5） | 🔴 部分 | CRUD/generate 死兜底已删；parse/summary/search 仍走 core | `api/ai/businessIntelligence.ts` |
| governance | 2（原12，已删10） | 🟢 已核销 | 10 条死兜底已删；trends/refresh 仍走 core | `api/ai/governanceDashboard.ts` |
| comments | 0（原4，④已建） | ✅ 已实现 | `modules/engagement` 真实 CRUD（core_comments 表），空壳删除 | `api/shared/index.ts` |
| favorites | 0（原4，④已建） | ✅ 已实现 | `modules/engagement` 真实 CRUD + 查重（core_favorites 表），空壳删除 | `api/shared/index.ts` |
| search | 4 | 🟢 部分 | svc/search 已有 `/`、`/suggestions`；`/search/recent` 🔴 | `api/search/index.ts` |
| dict | 0（原1，⑤已对接） | ✅ 已对接 | `dictItemApi.list` 改指 master-data `GET /dict/dict-types/{id}/items`（list_dict_items 走真 DB），core 空壳删除；其余 dict-type/item CRUD 本就走 master | `api/system/index.ts` |
| tenant/analytics | 7 | 🔴（原误标🟡） | ②实测：无已写 handler（tenant_analytics.rs 不存在），非待挂载；前端封装无页面直接消费，待新建/转发 svc/analytics | `api/tenant/analytics.ts` |
| tenant/billing | 8 | 🟡 部分 | core 已挂 `/billing`、`/invoices`；subscription/pay/plan/cancel/card 🔴 | `api/tenant/analytics.ts` |
| tenant/settings | 2 | 🔴 | 无对应 handler | `api/tenant/config.ts` |
| tenant/branding | 2 | 🔴 | 0 命中（租户品牌定制） | `api/tenant/config.ts` |
| tenant/features | 4 | 🔴（原误标🟡） | ②实测：模块开关已挂在 `/tenant/tenants/{id}/modules/{code}/activate|deactivate`，非 `/tenant/{id}/features/*`；无对应已写 handler，待新建 | `api/tenant/config.ts` |
| tenant/domains | 3 | 🔴 | 0 命中（自定义域名） | `api/tenant/config.ts` |
| tenant/email-config | 2 | 🔴 | 0 命中（邮件发信配置） | `api/tenant/config.ts` |
| tenant/integrations | 4 | 🔴 | 0 命中（第三方集成登记） | `api/tenant/config.ts` |
| tenant/webhooks | 5 | 🟢 部分 | integration `plugin.rs` / communication 有 webhook 能力可复用 | `api/tenant/config.ts`、`api/notification/webhook.ts` |
| tenant/security | 18 | 🟡 部分 | iam/auth 已有 password-policy；2fa/api-keys/audit-logs/sessions/ip-whitelist 🔴 | `api/tenant/security.ts` |
| system/api-keys | 2 | 🔴（原误标🟢） | 真实仅列表/创建/删除；stub 的 GET 详情、PUT 更新为未实现，非冗余 | `api/unified-core/system.ts` |
| wms-approval | 0（原12，第二批已删） | ✅ 已对接 | 前端改指 apiClient.wms（transfer=/transfers），core 兜底删除 | `api/wms/index.ts` |
| help | 7 | ⚠ 保留 | `help.ts` 仍走 core client（非已迁出），删除会裸 404 | `api/help.ts` |

## 4. 分组明细

### 4.1 copilot（8）🟢 上游已有，旧契约待切换
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| POST | `/copilot/sessions` | 成功回执 | 🟢 |
| GET | `/copilot/sessions/{id}` | 列表空壳 | 🟢 |
| DELETE | `/copilot/sessions/{id}` | 成功回执 | 🟢 |
| POST | `/copilot/chat` | 成功回执 | 🟢 |
| POST | `/copilot/intent` | 成功回执 | 🟢 |
| GET | `/copilot/modules` | 列表空壳 | 🟢 |
| GET | `/copilot/modules/{id}` | 列表空壳 | 🟢 |
| GET | `/copilot/modules/{id}/faq` | 列表空壳 | 🟢 |

- 现状：真实能力在 svc/ai DSH，前端 `businessCopilot.ts` 已走 `/dsh/copilot/*`；core 下 `/copilot/*` 为旧契约。
- 建议：前端确认无残留 `/copilot/*` 调用后，移除本组兜底。

### 4.2 forms（7）🟢 上游已有，待前缀对接
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/forms` | 列表空壳 | 🟢 |
| GET | `/forms/{id}` | 列表空壳 | 🟢 |
| POST | `/forms/{id}/validate` | 成功回执 | 🟢 |
| POST | `/forms/{id}/auto-fill` | 成功回执 | 🟢 |
| POST | `/forms/{id}/generate` | 成功回执 | 🟢 |
| POST | `/forms/{id}/submit` | 成功回执 | 🟢 |
| POST | `/forms/{id}/draft` | 成功回执 | 🟢 |

- 现状：svc/ai `ai_form` / `smart_forms_handlers` 已实现表单校验/生成/提交。
- 建议：网关把 `/api/core/forms/*` 转发至 ai，或前端改指 ai 前缀后删兜底。

### 4.3 documents（9）🔴 通用文档库待评估
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/documents` | 列表空壳 | 🔴 |
| POST | `/documents` | 成功回执 | 🔴 |
| GET | `/documents/{id}` | 列表空壳 | 🔴 |
| DELETE | `/documents/{id}` | 成功回执 | 🔴 |
| POST | `/documents/{id}/parse` | 成功回执 | 🔴 |
| GET | `/documents/{id}/summary` | 列表空壳 | 🔴 |
| POST | `/documents/{id}/summary` | 成功回执 | 🔴 |
| GET | `/documents/{id}/search` | 列表空壳 | 🔴 |
| POST | `/documents/generate` | 成功回执 | 🔴 |

- 现状：`documents/parse`、`documents/generate` 全仓 0 命中；ai knowledge 为知识库而非通用文档库。
- 建议：先明确「通用文档库」产品定位；若并入 ai knowledge，则改指，否则排期新建或判不做。

### 4.4 governance（12）🟡 部分已有
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/governance/dashboard` | 列表空壳 | 🟢 |
| GET | `/governance/score` | 列表空壳 | 🟢 |
| GET | `/governance/risk` | 列表空壳 | 🔴 |
| GET | `/governance/compliance` | 列表空壳 | 🔴 |
| GET | `/governance/cost` | 列表空壳 | 🔴 |
| GET | `/governance/performance` | 列表空壳 | 🔴 |
| GET | `/governance/security-events` | 列表空壳 | 🔴 |
| POST | `/governance/security-events` | 成功回执 | 🔴 |
| GET | `/governance/audit` | 列表空壳 | 🔴 |
| GET | `/governance/trends` | 列表空壳 | 🔴 |
| GET | `/governance/recommendations` | 列表空壳 | 🔴 |
| POST | `/governance/refresh` | 成功回执 | 🔴 |

- 现状：svc/ai `governance_dashboard_handlers` 已覆盖 dashboard/score。
- 建议：先对接 dashboard/score；risk/compliance/cost/performance/audit/trends/recommendations 待产品定指标口径后排期。

### 4.5 comments（4）🔴 通用评论未建
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/comments` | 列表空壳 | 🔴 |
| POST | `/comments` | 成功回执 | 🔴 |
| PUT | `/comments/{id}` | 成功回执 | 🔴 |
| DELETE | `/comments/{id}` | 成功回执 | 🔴 |

- 备注：doc/ticket 各自域有独立评论，非此全局 `/comments`。

### 4.6 favorites（4）🔴 收藏未建
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/favorites` | 列表空壳 | 🔴 |
| POST | `/favorites` | 成功回执 | 🔴 |
| DELETE | `/favorites/{id}` | 成功回执 | 🔴 |
| GET | `/favorites/check` | 列表空壳 | 🔴 |

### 4.7 search（4）🟢 部分已有
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/search` | 列表空壳 | 🟢 |
| GET | `/search/suggestions` | 列表空壳 | 🟢 |
| GET | `/search/recent` | 列表空壳 | 🔴 |
| DELETE | `/search/recent` | 成功回执 | 🔴 |

- 现状：svc/search 已有 `/`、`/suggestions`；搜索历史（recent）未实现。

### 4.8 dict（原1）✅ ⑤已对接并删除
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/dict/dict-types/{id}/items` | 列表空壳 | ✅ 已对接 |

- ⑤（2026-10-19）：`dictItemApi.list` 由 `apiClient.core` 改指 `apiClient.master` 的真实路由 `GET /dict/dict-types/{dict_type_id}/items`（`list_dict_items` 走 `core_dict_items` 真 DB，返回 items/total/page/page_size，与前端 `PaginatedResult<DictItem>` 对齐，消费方仅取 items/total）；core 空壳删除。dict-type CRUD 与 dict-item CRUD 本就走 master。

### 4.9 tenant/analytics（7）🟡 core handler 待挂
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/analytics/overview` | 列表空壳 | 🟡 |
| GET | `/tenant/{id}/analytics/usage` | 列表空壳 | 🟡 |
| GET | `/tenant/{id}/analytics/activity` | 列表空壳 | 🔴 |
| GET | `/tenant/{id}/analytics/api-usage` | 列表空壳 | 🟡 |
| GET | `/tenant/{id}/analytics/top-endpoints` | 列表空壳 | 🔴 |
| GET | `/tenant/{id}/analytics/user-stats` | 列表空壳 | 🟡 |
| GET | `/tenant/{id}/analytics/real-time` | 列表空壳 | 🔴 |

- 现状：core `get_usage_metrics`、`get_tenant_stats` 已写但未挂 analytics 子路径；也可整体转发 svc/analytics。

### 4.10 tenant/billing（8）🟡 部分已挂
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/billing/subscription` | 列表空壳 | 🟡 |
| GET | `/tenant/{id}/billing/invoices` | 列表空壳 | 🟡 |
| GET | `/tenant/{id}/billing/invoices/{sub}` | 列表空壳 | 🔴 |
| POST | `/tenant/{id}/billing/invoices/{sub}/pay` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/billing/plan` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/billing/subscription/cancel` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/billing/card` | 成功回执 | 🔴 |
| DELETE | `/tenant/{id}/billing/card` | 成功回执 | 🔴 |

- 现状：core 已挂 `/tenant/{id}/billing`、`/invoices`（`get_billing_info/get_invoices`）；订阅状态/支付/变更计划/取消/绑卡为 🔴，涉及真实计费，需财务口径。

### 4.11 tenant/settings（2）🔴
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/settings` | 列表空壳 | 🔴 |
| PUT | `/tenant/{id}/settings` | 成功回执 | 🔴 |

### 4.12 tenant/branding（2）🔴
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/branding` | 列表空壳 | 🔴 |
| PUT | `/tenant/{id}/branding` | 成功回执 | 🔴 |

### 4.13 tenant/features（4）🟡 handler 待挂
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/features` | 列表空壳 | 🟡 |
| PUT | `/tenant/{id}/features` | 成功回执 | 🟡 |
| POST | `/tenant/{id}/features/{sub}/enable` | 成功回执 | 🟡 |
| POST | `/tenant/{id}/features/{sub}/disable` | 成功回执 | 🟡 |

- 现状：core `list_modules/activate_module/deactivate_module` 已写，待挂 features 子路径。

### 4.14 tenant/domains（3）🔴
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/domains` | 列表空壳 | 🔴 |
| POST | `/tenant/{id}/domains` | 成功回执 | 🔴 |
| DELETE | `/tenant/{id}/domains/{sub}` | 成功回执 | 🔴 |

### 4.15 tenant/email-config（2）🔴
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/email-config` | 列表空壳 | 🔴 |
| PUT | `/tenant/{id}/email-config` | 成功回执 | 🔴 |

### 4.16 tenant/integrations（4）🔴
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/integrations` | 列表空壳 | 🔴 |
| POST | `/tenant/{id}/integrations` | 成功回执 | 🔴 |
| PUT | `/tenant/{id}/integrations/{sub}` | 成功回执 | 🔴 |
| DELETE | `/tenant/{id}/integrations/{sub}` | 成功回执 | 🔴 |

### 4.17 tenant/webhooks（5）🟢 部分可复用
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/webhooks` | 列表空壳 | 🟢 |
| POST | `/tenant/{id}/webhooks` | 成功回执 | 🟢 |
| PUT | `/tenant/{id}/webhooks/{sub}` | 成功回执 | 🟢 |
| DELETE | `/tenant/{id}/webhooks/{sub}` | 成功回执 | 🟢 |
| POST | `/tenant/{id}/webhooks/{sub}/test` | 成功回执 | 🟢 |

- 现状：integration `plugin.rs`、communication 模块已有 webhook 能力，可复用/对齐。

### 4.18 tenant/security（18）🟡 部分已有
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/tenant/{id}/security` | 列表空壳 | 🔴 |
| PUT | `/tenant/{id}/security` | 成功回执 | 🔴 |
| GET | `/tenant/{id}/security/password-policy` | 列表空壳 | 🟡 |
| PUT | `/tenant/{id}/security/password-policy` | 成功回执 | 🟡 |
| POST | `/tenant/{id}/security/enable-2fa` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/security/disable-2fa` | 成功回执 | 🔴 |
| GET | `/tenant/{id}/security/api-keys` | 列表空壳 | 🔴 |
| POST | `/tenant/{id}/security/generate-api-key` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/security/rotate-api-key/{sub}` | 成功回执 | 🔴 |
| DELETE | `/tenant/{id}/security/api-keys/{sub}` | 成功回执 | 🔴 |
| GET | `/tenant/{id}/security/audit-logs` | 列表空壳 | 🔴 |
| GET | `/tenant/{id}/security/audit-logs/{sub}` | 列表空壳 | 🔴 |
| POST | `/tenant/{id}/security/audit-logs/export` | 成功回执 | 🔴 |
| GET | `/tenant/{id}/security/sessions` | 列表空壳 | 🔴 |
| POST | `/tenant/{id}/security/sessions/{sub}/revoke` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/security/sessions/revoke-all` | 成功回执 | 🔴 |
| POST | `/tenant/{id}/security/ip-whitelist` | 成功回执 | 🔴 |
| DELETE | `/tenant/{id}/security/ip-whitelist/{sub}` | 成功回执 | 🔴 |

- 现状：iam/auth 已有 password-policy；2FA、租户级 api-keys、会话管理、IP 白名单 0 命中。

### 4.19 system/api-keys（2）🔴 待上游新建（非冗余，不可删）
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/system/api-keys/{id}` | 列表空壳（占位详情） | 🔴 |
| PUT | `/system/api-keys/{id}` | 成功回执 | 🔴 |

- 现状（2026-10-20 实测纠正原 🟢 判断）：core `routes/settings.rs:14-49` 真实仅挂 GET 列表 `/system/api-keys`（`list_api_keys`）、POST 创建 `/system/api-keys`（`create_api_key`）、DELETE `/system/api-keys/{id}`（`delete_api_key`）；`modules/settings/api_keys.rs` 也只实现这三个 handler，**无 GET 详情、无 PUT 更新**。本组两条 stub 是未实现占位而非冗余，删除会裸 404；待产品排期补 get/update 后替换，不可「直接移除」。

### 4.20 wms-approval（原 12）✅ 第二批已对接并删除

- 12 条 core 兜底（inbound/outbound/stock-take/transfer × start/approve/reject）已删除。
- 对接：`wmsApprovalApi` 改指 `apiClient.wms`（base=/api/wms，去 `/wms` 前缀；transfer 由 `/transfer-orders` 对齐真实 `/transfers`），body 由 `{entityId,entityType,approverId,rejectorId,reason}` 对齐后端 `ApprovalRequest{operator,comment}`。
- 真实路由：svc/wms inbound/outbound/stock-take 为 `/{entity}/{id}/approval/{start,approve,reject}`，transfer 为 `/transfers/{id}/approval/{start,approve,reject}`。
- 注：本封装无页面消费，仅集成测试；端到端 FSM（状态门/事务提交）需起栈造单验证，静态层已对齐契约。

### 4.21 help（7）🟢 上游已有（svc/portal）
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET,POST | `/help/faqs` | 列表空壳 | 🟢 |
| GET | `/help/faqs/categories` | 空数组 | 🟢 |
| GET,PUT,DELETE | `/help/faqs/{id}` | 成功回执 | 🟢 |
| GET,POST | `/help/guides` | 列表空壳 | 🟢 |
| GET | `/help/guides/categories` | 空数组 | 🟢 |
| GET | `/help/guides/{id}` | 详情404 | 🟢 |
| POST | `/help/guides/{id}/lessons` | 成功回执 | 🟢 |

- 现状：svc/portal `help/faq.rs` 已实现（mod.rs:177 注释载明 help 已迁 `/api/portal/help/*`）；待网关转发后移除 core 兜底。

## 5. 处置优先级建议

1. **第一批·零成本移除冗余（🟢 已存在且前端已改指/可转发）**：wms-approval(12，已删)、help(7)、copilot(8)、forms(7)、dict(1，已对接)、search 已存在部分(2)、governance dashboard/score(2)、tenant/webhooks(5)、tenant/billing 已挂项 —— 对接/转发后即可删兜底，不新建能力。（注：system/api-keys(2) 经 2026-10-20 实测为 🔴 待新建，已移出本批，见 §4.19。）
2. **第二批·挂已有 handler（🟡）**：tenant/features(4)、tenant/analytics 复用项、tenant/billing 订阅、tenant/security password-policy —— 把 core 已写函数挂到正确路由替换兜底。
3. **第三批·产品排期新建（🔴）**：documents 通用库、comments、favorites、tenant settings/branding/domains/email/integrations、tenant/security 2FA/api-keys/sessions/ip-whitelist、billing 支付/绑卡、governance 其余指标 —— 先定产品是否做，不做则随 BE-08 勾选删除。
4. **存废同源**：所有 ⚪/🔴 端点最终是否保留，与 BE-08「349 条 API 存废待业务勾选」一并决策，避免重复评估。

## 5.1 产品排期复核（2026-10-22，🔴67 决策材料）

> 口径：以「页面真实调用」为准（api-boundary-gate 教训：封装定义≠活需求）。BE-08 勾选批次不含 contract_stubs（183 条 stub 路由非孤儿候选，无 decision 覆盖）——存废决策以本复核为准。

| 组 | 条数 | 前端消费（实证） | 上游现状 | 排期建议 | 批次 |
|---|---:|---|---|---|---|
| **help** | 7 | ✅ 活调（HelpCenterPage:146,159 / GuidePage:65） | svc/portal help/faq.rs 已实现 | **转发/改指后删兜底**（0.5 人日，本机可闭环） | S1 |
| **search/recent** | 2 | ✅ 活调（FavoritesPage:77,130 getRecentSearches/clearRecentSearches） | svc/search 未实现 recent 存储 | **排期新建**（svc/search 或 core 简易 recent 表 + 租户隔离，0.5 人日） | S1 |
| favorites/comments | 8 | ✅ 活调（FavoritesPage:63,105 / CommentsPage） | ④ 已建 engagement 真后端（core_favorites/core_comments） | **已闭环，无排期** | ✅ |
| **tenant 系列**（analytics7/billing8/settings2/branding2/features4/domains3/email2/integrations4/webhooks5/security18） | 55 | ❌ 零页面调用（tenantConfigApi/tenantSecurityApi/tenantAnalyticsApi 封装无页面消费） | 部分已挂（billing/invoices、modules 开关、password-policy）；多数 0 命中 | **产品判定**：租户中心页面开发时按需新建；不做则前端封装+兜底同删（不单删兜底防裸 404） | P |
| **core copilot/forms/documents** | 8 | ⚠️ 页面零方法调用（BusinessCopilotPage 仅类型 import，走 dsh/smart-forms），但 api 封装方法仍指 core（businessCopilot.ts:214,222,268 / businessIntelligence.ts:253,320） | dsh/smart-forms 已承接（sessions POST、chat、intent、modules、forms validate/generate、documents DOC_BASE_PATH） | **前端死封装清理后同步删**（页面确认零消费 + 封装改指/删方法 + core 兜底删，同批执行防 gate 缺口） | S2 |
| **governance 剩余**（risk/compliance/cost/performance/audit/trends/recommendations + security-events） | 8 | ❌ 前端零消费 | ai governance_dashboard_handlers 已覆盖 dashboard/score | **产品定指标口径**后按需新建；零消费期间保留兜底 | P |
| **documents 通用库定位** | 4 | ⚠️ 封装引用（businessIntelligence.ts:320 GET /documents/{id}） | 全仓 0 命中（非 ai knowledge） | **产品定方向**：并入 ai knowledge（改指）或独立文档库（新建）；决定前保留兜底 | P |
| **system/api-keys** | 2 | ❌ 零页面调用 | 真实仅列表/创建/删除，缺 GET 详情/PUT 更新 | 与租户中心同批（做=补 handler，不做=下线） | P |

**执行批次总表**：
- **S1（本机可闭环，共 2 组 9 条）**：help 转发删兜底 + search/recent 新建。建议下批执行。
- **S2（前端联动，共 8 条）**：copilot/forms/documents 死封装清理 + core 兜底同步删（需前端批协同）。
- **P（产品决策，共 69 条）**：tenant 55 + governance 8 + documents 4 + api-keys 2 —— 待租户中心/指标口径/文档库定位产品排期。

## 6. 备注

- 本台账由 `contract_stubs.rs` 机器提取（方法/路径/兜底 handler）+ 人工上游探测（全仓 grep 独立 svc 与 core handler）生成；状态为探测时点结论，对接前需逐条复核真实路由前缀。
- 兜底的意义是「禁止裸 404」，在真实实现就位前不得删除，否则前端已调端点会 404 并被契约 smoke 判 route_missing。
- 不在本台账：各 svc 自身的 `contract_fallback.rs` / 域内占位兜底（mobile 134 条、master-data mdm-v66 43 处，以及 mes、ehs、hrm 等），属各自域，已另建分域互补册 [`contract-fallback-domains.md`](./contract-fallback-domains.md)，与本主台账不重复评估。
