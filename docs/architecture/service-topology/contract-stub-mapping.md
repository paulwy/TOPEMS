# 契约兜底（contract_stubs）→ 上游实现映射台账（B4 / F4）

> 生成：2026-10-19 · 来源：`svc/unified-core/src/routes/contract_stubs.rs`（125 条 `.route`）
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
- **wms-approval（12）→ 不可对接**：svc/wms 真实仅 4 条（inbound reject、stock-take reject、transfer approve/reject），且命名 `/transfers` ≠ stub `/transfer-orders`，无 start、无 outbound；前端 `wms/index.ts:168-196` 走裸 `apiClient`（core 兜底），改指也会 404，保留待真实服务补齐。
- **help（7）→ 保留**：`help.ts` 注释明示走 core client，非已迁出。
- **search（4）→ 全保留**：`shared/index.ts:176,180,184,188` 活调 core `/search`、`/search/suggestions`、`/search/recent`(GET/DELETE)。
- **dict（1）→ 保留**：`system/index.ts:146` 走 core `/dict/dict-types/{id}/items`。

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

## 3. 总览（第一批核销后 99 条 / 21 域；原 125，已删 26）

| 域 | 条数 | 主要状态 | 上游候选 / 现状 | 前端调用文件 |
|---|---:|---|---|---|
| copilot | 3（原8，已删5） | 🟢 已核销 | 5 条死兜底已删；sessions(GET/DELETE)、faq 仍走 core | `api/ai/businessCopilot.ts` |
| forms | 1（原7，已删6） | 🟢 已核销 | 6 条死兜底已删；仅 GET `/forms/{id}` 走 core | `api/ai/businessIntelligence.ts` |
| documents | 4（原9，已删5） | 🔴 部分 | CRUD/generate 死兜底已删；parse/summary/search 仍走 core | `api/ai/businessIntelligence.ts` |
| governance | 2（原12，已删10） | 🟢 已核销 | 10 条死兜底已删；trends/refresh 仍走 core | `api/ai/governanceDashboard.ts` |
| comments | 4 | 🔴 | 通用评论未建（doc/ticket 各自域评论独立，非此端点） | `api/shared/index.ts`（通用） |
| favorites | 4 | 🔴 | 收藏/「是否已收藏」0 命中 | `api/shared/index.ts` |
| search | 4 | 🟢 部分 | svc/search 已有 `/`、`/suggestions`；`/search/recent` 🔴 | `api/search/index.ts` |
| dict | 1 | 🟢 | master-data `dict/handlers` 已有，待前缀核对 | `api/system/index.ts` |
| tenant/analytics | 7 | 🟡 | core `get_usage_metrics/get_tenant_stats` 待挂；可转发 svc/analytics | `api/tenant/analytics.ts` |
| tenant/billing | 8 | 🟡 部分 | core 已挂 `/billing`、`/invoices`；subscription/pay/plan/cancel/card 🔴 | `api/tenant/analytics.ts` |
| tenant/settings | 2 | 🔴 | 无对应 handler | `api/tenant/config.ts` |
| tenant/branding | 2 | 🔴 | 0 命中（租户品牌定制） | `api/tenant/config.ts` |
| tenant/features | 4 | 🟡 | core `list_modules/activate_module/deactivate_module` 待挂此路径 | `api/tenant/config.ts` |
| tenant/domains | 3 | 🔴 | 0 命中（自定义域名） | `api/tenant/config.ts` |
| tenant/email-config | 2 | 🔴 | 0 命中（邮件发信配置） | `api/tenant/config.ts` |
| tenant/integrations | 4 | 🔴 | 0 命中（第三方集成登记） | `api/tenant/config.ts` |
| tenant/webhooks | 5 | 🟢 部分 | integration `plugin.rs` / communication 有 webhook 能力可复用 | `api/tenant/config.ts`、`api/notification/webhook.ts` |
| tenant/security | 18 | 🟡 部分 | iam/auth 已有 password-policy；2fa/api-keys/audit-logs/sessions/ip-whitelist 🔴 | `api/tenant/security.ts` |
| system/api-keys | 2 | 🔴（原误标🟢） | 真实仅列表/创建/删除；stub 的 GET 详情、PUT 更新为未实现，非冗余 | `api/unified-core/system.ts` |
| wms-approval | 12 | 🔴 不可对接 | svc/wms 真实仅 4 条且命名 `/transfers`≠`/transfer-orders`、无 start/outbound；前端走 core 兜底，保留待补齐 | `api/wms/index.ts` |
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

### 4.8 dict（1）🟢 已有待前缀核对
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/dict/dict-types/{id}/items` | 列表空壳 | 🟢 |

- 现状：master-data `dict/handlers` 已有字典项；核对前缀后移除兜底。

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

### 4.19 system/api-keys（2）🟢 冗余
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| GET | `/system/api-keys/{id}` | 列表空壳 | 🟢 |
| PUT | `/system/api-keys/{id}` | 成功回执 | 🟢 |

- 现状：core `settings.rs:43` 已挂 `/system/api-keys/{id}`（含 PUT/DELETE），本组兜底冗余，可直接移除。

### 4.20 wms-approval（12）🟢 上游已有，前缀冗余
| 方法 | 路径 | 兜底 | 状态 |
|---|---|---|---|
| POST | `/wms/inbound-orders/{id}/approval/start` | 成功回执 | 🟢 |
| POST | `/wms/inbound-orders/{id}/approval/approve` | 成功回执 | 🟢 |
| POST | `/wms/inbound-orders/{id}/approval/reject` | 成功回执 | 🟢 |
| POST | `/wms/outbound-orders/{id}/approval/start` | 成功回执 | 🟢 |
| POST | `/wms/outbound-orders/{id}/approval/approve` | 成功回执 | 🟢 |
| POST | `/wms/outbound-orders/{id}/approval/reject` | 成功回执 | 🟢 |
| POST | `/wms/stock-takes/{id}/approval/start` | 成功回执 | 🟢 |
| POST | `/wms/stock-takes/{id}/approval/approve` | 成功回执 | 🟢 |
| POST | `/wms/stock-takes/{id}/approval/reject` | 成功回执 | 🟢 |
| POST | `/wms/transfer-orders/{id}/approval/start` | 成功回执 | 🟢 |
| POST | `/wms/transfer-orders/{id}/approval/approve` | 成功回执 | 🟢 |
| POST | `/wms/transfer-orders/{id}/approval/reject` | 成功回执 | 🟢 |

- 现状：svc/wms `inbound_order/outbound_order/stock_take/transfer_order` 已实现真实审批，前端走 `/api/wms/*`；core `/wms/*` 兜底冗余。

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

1. **第一批·零成本移除冗余（🟢 已存在且前端已改指/可转发）**：system/api-keys(2)、wms-approval(12)、help(7)、copilot(8)、forms(7)、dict(1)、search 已存在部分(2)、governance dashboard/score(2)、tenant/webhooks(5)、tenant/billing 已挂项 —— 合计约 46 条，对接/转发后即可删兜底，不新建能力。
2. **第二批·挂已有 handler（🟡）**：tenant/features(4)、tenant/analytics 复用项、tenant/billing 订阅、tenant/security password-policy —— 把 core 已写函数挂到正确路由替换兜底。
3. **第三批·产品排期新建（🔴）**：documents 通用库、comments、favorites、tenant settings/branding/domains/email/integrations、tenant/security 2FA/api-keys/sessions/ip-whitelist、billing 支付/绑卡、governance 其余指标 —— 先定产品是否做，不做则随 BE-08 勾选删除。
4. **存废同源**：所有 ⚪/🔴 端点最终是否保留，与 BE-08「349 条 API 存废待业务勾选」一并决策，避免重复评估。

## 6. 备注

- 本台账由 `contract_stubs.rs` 机器提取（方法/路径/兜底 handler）+ 人工上游探测（全仓 grep 独立 svc 与 core handler）生成；状态为探测时点结论，对接前需逐条复核真实路由前缀。
- 兜底的意义是「禁止裸 404」，在真实实现就位前不得删除，否则前端已调端点会 404 并被契约 smoke 判 route_missing。
- 不在本台账：各 svc 自身的 `contract_fallback.rs` / 域内占位兜底（如 mobile、master-data、mes、ehs、hrm 等），属各自域，另案。
