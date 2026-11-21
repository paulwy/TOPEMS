# W7-P0 仓库外依赖确认清单（前端 / 移动端对接人）

- 日期：2026-11-22
- 适用对象：Web 前端、移动端、管理控制台对接人
- 用途：W7-P0 租户隔离收敛前后，有三处行为可能影响仓库外的实时连接客户端。本文只列**当前代码的实际契约**与**需要你确认的问题**，不替任何一方下结论。
- 回复方式：在每节的「确认问题」下勾选 A/B/C 即可；选 B 时请补充字段或场景清单。若三项都不影响你，请回复「三项均无依赖」。
- 重要更正：`docs/quality/w7-p0-ws-tenant-partition-design-2026-11-10.md` 中「`alert.data` 全量返回」「`healthz.channels` 输出频道明细」属于设计期描述，**与当前代码不一致**。本文以当前代码为准（证据见文末索引）。

---

## 1. `GET /ws/healthz` 的 `channels` 字段

### 1.1 当前实测契约

- 端点：`GET /ws/healthz`，**无鉴权**，不是 WebSocket Upgrade 端点。
- 产出位置：`svc/unified-core/src/modules/communication/ws.rs:1092-1107`。
- 响应示例：

```json
{
  "ok": true,
  "version": "0.1.0",
  "clients": 3,
  "tenants": 2,
  "channels": 5
}
```

- 字段语义：
  - `clients`：当前 WebSocket 连接总数（同一用户多连接分别计数）。
  - `tenants`：当前有在线连接的租户数（去重后的数量）。
  - `channels`：**频道槽位数量**，即服务端内部 `{tenant}:{channel}` 订阅键的数量。
  - `channels` **不是**频道名列表，**不是**对象，**不包含**频道名或租户 UUID。代码注释明确：该端点无鉴权，频道键带租户前缀会泄漏租户标识（`ws.rs:341-344, 1094`）。

### 1.2 本仓内可见的调用方

- 路由挂载：`svc/unified-core/src/routes/mod.rs:108`、`svc/server/src/modules/unified_core_real_module.rs:66`。
- 部署冒烟：`docs/deploy/nginx-ws-2026-10.md:26-28`，只用 `curl` 判断 HTTP 200，不解析响应体。
- OpenAPI 缺口登记：`docs/api/openapi-baseline-gaps.json:500`（说明该端点尚未进入正式 OpenAPI 描述）。
- `apps/web`、`apps/desktop`、`apps/mobile` 源码中检索 `healthz`：**零命中**。
- 仓库外：前端/移动端是否解析该端点，本仓无法看到。

### 1.3 若收紧会断的场景

- 删除 `channels` 字段或改名：仅按数字读 `channels` 的客户端会在读取处得到 `undefined`。
- 把 `channels` 从数字改成对象/数组：按数字比较或展示的客户端会出现类型错误。
- 保持数字但改变计数口径（例如从「频道槽位」改为「去重频道名」）：依赖该数字做容量/健康判断的客户端会出现数值跳变，但不会报错。

### 1.4 请确认的问题

**Q1：你的客户端是否读取 `/ws/healthz` 响应中的 `channels` 字段？**

- A. 不读取 `/ws/healthz`（或只用于人工排障）。
- B. 读取，但只当作一个数字使用（展示/阈值判断）。
- C. 需要频道级明细（频道名、每频道人数或租户维度）；当前契约不提供。

### 1.5 默认处理与不确认的影响

- **默认按 A/B 处理**：保持现状——只返回数字，不新增频道名或租户 UUID；不因 W7-P0 删除该字段。
- 不确认的影响：若你实际是 C，当前响应无法满足，需要另做带鉴权的管理接口；若你是 B 但期望对象结构，当前类型不匹配。默认处理不会主动改变字段类型，因此不会静默破坏 A/B，但 C 的需求不会被满足。

---

## 2. `alert.data`

> 说明：当前代码中 `alert.data` **不是全量返回**。共两条链路，字段集不同，请分别确认。

### 2.1 链路 A：WebSocket `alerts` 频道告警帧

- 产出位置：`svc/unified-core/src/modules/communication/ws_event_bridge.rs:324-336`。
- 帧结构：

```json
{
  "type": "alert",
  "payload": {
    "id": "<hazard_id 或 accident_id>",
    "title": "安全告警",
    "message": "<事件 description>",
    "type": "warning",
    "timestamp": 1760000000,
    "severity": "medium",
    "data": {
      "hazard_id": "...",
      "hazard_no": "...",
      "accident_id": "...",
      "accident_no": "...",
      "category": "...",
      "level": "...",
      "severity": "...",
      "location": "...",
      "status": "..."
    }
  }
}
```

- `payload.data` 是显式白名单，固定 9 个键：`hazard_id、hazard_no、accident_id、accident_no、category、level、severity、location、status`（`ws_event_bridge.rs:85-95`）。新增字段必须显式加入白名单，禁止整包透传。
- 事件来源：EHS 的 `EhsAccidentReported`、`EhsHazardReported`、`EhsHazardRectified`、`EhsHazardVerified`、`EhsAccidentInvestigated`。
- 频道订阅：客户端需显式 `subscribe` 到 `alerts` 频道（频道白名单见 `ws.rs:24-26`）。

### 2.2 链路 B：EHS 内部 HTTP `POST /api/internal/ehs/alerts/integration`

- 产出位置：`svc/ehs/src/modules/integration.rs:186-264`。
- 成功响应中的 `data` 只有 5 个字段：

```json
{
  "id": "<uuid>",
  "alert_no": "...",
  "title": "...",
  "status": "...",
  "tenant_id": "<uuid>"
}
```

- 该端点面向内部系统集成，本仓调用方为 `svc/integration/src/qms_lims_ehs.rs:409-423`；调用方只判断 HTTP 是否成功，**不读取**响应 `data` 的字段。

### 2.3 本仓内可见的消费方

- `apps/web`：只订阅 `notifications` 频道（`apps/web/src/hooks/useNotificationWebSocket.ts:68`）；全仓检索未发现 `subscribeChannel('alerts')`，也未发现按 `type === 'alert'` 读取 `payload.data` 的代码。
- `apps/mobile`：源码中未发现 WebSocket 客户端代码。
- `apps/desktop`：源码中未发现 WebSocket 引用。
- 仓库外：是否有客户端订阅 `alerts` 频道或读取上述两条链路的 `data`，本仓无法看到。

### 2.4 若收紧会断的场景

- 客户端读取 `payload.data` 中白名单之外的字段（例如 `tenant_id`、`reported_by`、`description`、`reported_at`）：这些字段**当前就不会下发**，读取结果为 `undefined`。
- 若后续进一步收紧白名单（减少现有 9 键中的任意一个）：读取该键的客户端会静默拿到 `undefined`，不报错、不提示。
- 链路 B 若客户端依赖 `data` 里的完整告警记录：当前只有 5 个字段，其余字段同样缺失。

### 2.5 请确认的问题

**Q2：你的客户端从 `alert` 帧的 `payload.data`（或 EHS 内部告警接口的 `data`）读取哪些字段？**

- A. 只使用当前已下发的字段（WS 9 键；HTTP 5 字段），无需新增。
- B. 还需要白名单之外的字段（请列出字段名与用途，例如 `tenant_id`、`reported_by`、`description`）。
- C. 依赖整条告警记录（等同「全量返回」），字段集不固定。

### 2.6 默认处理与不确认的影响

- **默认按 A 处理**：保持 WS `data` 的 9 键白名单、HTTP `data` 的 5 字段，不整包透传，不下发 `tenant_id`。
- 不确认的影响：若你是 B 或 C，相关字段会静默缺失（前端显示为空/`undefined`），且不会有错误提示；需要在 W7-P0 之外单独立项评估字段暴露与租户隔离。

---

## 3. 超管 WebSocket 连接行为

### 3.1 当前实测契约

- 产出位置：`svc/unified-core/src/modules/communication/ws.rs:52-88`（`resolve_ws_identity`）。
- 连接地址形态：`/ws/core/notifications?token=<JWT>[&tenant_id=<uuid>]`，或 `/ws/{module}/{feature}?token=<JWT>[&tenant_id=<uuid>]`（模块需在白名单内，否则 426）。
- 身份解析规则：
  - **service token**：拒绝，`reason=service_not_allowed`。
  - **超管（`is_superuser=true`）**：必须显式携带 `?tenant_id=<uuid>`，且可解析、非全零；否则 `reason=tenant_required`。**不存在「一条连接看全部租户」的模式。**
  - **普通用户**：租户只取 JWT `claims.tenant_id`；若同时携带 `?tenant_id=` 且与 claim 不一致，`reason=tenant_mismatch`。
- 失败表现（两个 Upgrade 入口一致）：
  - HTTP 403，响应体：`{"code":4403,"reason":"tenant_required|tenant_mismatch|service_not_allowed","message":"tenant required for websocket connection"}`（`ws.rs:956-966`，另一入口在 `ws.rs:1146` 附近）。
  - 客户端看到的是「握手被拒」，不是「连上后收不到消息」。
- 连接数限制：每个 token 最多 6 条并发连接，超限返回 HTTP 429（`MAX_CONNECTIONS_PER_USER=6`，`ws.rs:167`）。
- 租户在连接生命周期内不可变：中途切换租户需要断开重连。

### 3.2 本仓内可见的调用方

- `apps/web/src/hooks/useWebSocket.ts:99-128, 161-169`：
  - 超管：从 `localStorage.current_tenant_id` 取当前租户，拼 `?tenant_id=`；
  - 普通用户：只带 token，不带 `tenant_id`；
  - 代码注释已写明「超管 token 不含租户，连接必须显式指定当前租户，否则服务端拒绝握手（403）」。
- 若超管尚未选择租户（`current_tenant_id` 为空），当前实现不会拼 `tenant_id`，服务端会 403，前端进入重连退避。
- `apps/mobile`、`apps/desktop`：未发现 WebSocket 客户端代码。
- 仓库外：管理控制台/移动端是否按「全租户连接」设计，本仓无法看到。

### 3.3 若收紧会断的场景

- 超管连接不带 `tenant_id`：403（`tenant_required`），无法建立连接。
- 普通用户连接时携带与 JWT 不一致的 `tenant_id`：403（`tenant_mismatch`）。
- 期望「一条连接接收全部租户告警」：当前不提供，需要按租户分别连接。
- 同一 token 打开第 7 条连接：429。
- 超管在页面内切换租户但不重连：连接仍锚定旧租户，切换后的租户收不到实时消息。

### 3.4 请确认的问题

**Q3：你的管理端/移动端如何建立 WebSocket 连接？**

- A. 始终携带当前选中租户的 `tenant_id`（超管），普通用户只带 token。
- B. 不携带 `tenant_id`，期望默认连接到一个租户或全部租户。
- C. 需要一条连接同时接收多个/全部租户的实时消息。

### 3.5 默认处理与不确认的影响

- **默认按 A 处理**：超管必须显式 `tenant_id`，普通用户租户以 JWT 为准，不提供全租户连接，保留每 token 6 连接上限。
- 不确认的影响：若你是 B，握手会稳定 403 并不断重连（`tenant_required`）；若你是 C，当前架构无法满足，需要另设计跨租户实时流（涉及授权与数据隔离评审），不能在现有连接上放开。

---

## 4. 本文不覆盖

- 仓库外的 Web 前端、移动端、第三方管理控制台的源码与调用链（本仓只能看到 `apps/web`、`apps/desktop`、`apps/mobile` 的当前实现）。
- 生产环境实际部署版本与本文所引用的当前分支代码是否一致。
- 鉴权、授权、租户切换的产品规则（本文只描述连接层的技术行为）。
- `alert` 业务字段本身的完整性与准确性（本文只描述下发字段集）。

## 5. 证据索引

| 主题 | 文件与行号 |
| --- | --- |
| `/ws/healthz` 响应与字段 | `svc/unified-core/src/modules/communication/ws.rs:1092-1107` |
| `channels` 计数口径 | `svc/unified-core/src/modules/communication/ws.rs:341-344` |
| 告警帧与 `data` 白名单 | `svc/unified-core/src/modules/communication/ws_event_bridge.rs:85-95, 324-336` |
| EHS 内部告警响应 `data` | `svc/ehs/src/modules/integration.rs:186-264` |
| EHS 内部告警本仓调用方 | `svc/integration/src/qms_lims_ehs.rs:409-423` |
| 超管/普通用户 WS 身份解析 | `svc/unified-core/src/modules/communication/ws.rs:52-88` |
| WS 握手 403 错误体 | `svc/unified-core/src/modules/communication/ws.rs:956-966` |
| 每 token 连接上限 | `svc/unified-core/src/modules/communication/ws.rs:167` |
| Web 端 WS 建连实现 | `apps/web/src/hooks/useWebSocket.ts:99-128, 161-169` |
| Web 端仅订阅 notifications | `apps/web/src/hooks/useNotificationWebSocket.ts:68` |
