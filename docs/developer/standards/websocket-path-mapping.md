# TOPEMS WebSocket 路径规范与契约文档（P32-6）

> 生效版本：V65.0+ · 部署入口：Nginx `/ws/*` Upgrade · 默认端口复用 GATEWAY_PORT (8080)
> 对应技术选型：axum `tokio-tungstenite` + 前端 `useWebSocket`（`@/hooks/useWebSocket.ts`）

---

## 一、协议总览

所有 TOPEMS 实时通讯统一使用 **单一 TCP 连接 · 多频道 Multiplexing（JSON-RPC 2.0）**：

```
Client (browser/mobile)  ── WSS (TLS 1.3) ──►  Nginx (8080 → /ws/* upgrade)
                                                    │
                                                    ▼
                                          unified-core:8000 (hub)
                                         ┌───────────────────────────┐
                                         │ 订阅分发（Redis Pub/Sub）  │
                                         │ 频道: iam/审批/im/工单…    │
                                         └──────┬─────────┬─────────┘
                                                ▼         ▼
                                     具体业务进程（按需直连或通过 stream）
```

**关键原则（避免 WS 爆炸）**：
1. 所有业务进程不直接暴露 WS 端口；全部经 unified-core Hub + Redis 广播。
2. 每个客户端仅建立 **1 条 WS**（`max 6 per user`，同浏览器同 tab 不重复）。
3. 心跳 30s / 90s 超时；断线指数退避 + token 刷新后重连。

---

## 二、连接 URL 强制契约

```
wss://{host}[:8443]/ws/{module}/{feature}?token={jwt_access_token}&tenant_id={uuid}&trace_id={trace}
     ^^^^^^^          ^^^^^^^^ ^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     TLS 必选（生产）  |        |          query 参数全部可选，缺省回落到 HTTP-only Cookie / X-Tenant-ID Header
                      |        └─ feature 细粒度子主题（messages / orders / approvals）
                      └─ module = iam / workflow / im / mes / wms / ai / notification / dashboard

```

### 2.1 module 注册表（白名单，拒绝未注册模块 426 Upgrade Required）

| module    | 对应业务进程        | 典型 feature            | 场景说明 |
|-----------|--------------------|--------------------------|---------|
| `iam`     | unified-core       | `logins`, `lockouts`    | 同账号多点互踢、登录风险告警 |
| `workflow`| unified-core/flow  | `approvals`, `tasks`    | 待办审批推送 |
| `im`      | communication:8084 | `messages`, `typing`    | 即时通讯（一对一/群聊）|
| `mes`     | mes:8030           | `mo-states`, `qms-ao`   | 工单完工、不合格品处置单 |
| `wms`     | wms:8041           | `stock-alerts`, `sn`    | 库存预警 / 序列号扫描推送 |
| `ai`      | ai:8013            | `qa-stream`, `tasks`    | AI 长生成流式 SSE over WS |
| `notification` | unified-core | `broadcasts`, `alerts`  | 系统广播 / 运维告警飞书同推 |
| `dashboard` | bi:8060 + portal | `kpis`, `chart-liverefresh` | BI 看板实时（≤ 5s 精度）|
| `ticket`  | ticket:8086        | `updates`, `replies`    | 工单更新、客服回复 |

### 2.2 query 参数（兼容 Header 模式）

生产建议全部转 `Sec-WebSocket-Protocol` 传 token（避免 URL 日志泄漏）。下方 **任一方式命中** 即可：

| 方式 | 字段 | 说明 |
|------|------|------|
| URL Query | `token=` | 非 SSO 快速联调；不推荐生产（access.log 可能泄漏） |
| URL Query | `tenant_id=` | 可选；缺失从 JWT claim 中取 |
| HTTP Header（Upgrade 握手阶段携带）| `Authorization: Bearer xxx` | ✅ 生产推荐 |
| HTTP Header | `X-Tenant-ID` | 多租户隔离校验 |
| HTTP Header | `X-Trace-ID` | 全链路追踪 ID（OTel），缺失自动生成 |

**鉴权失败**（token 无效 / tenant_id 与 claim 冲突）：
- 返回 HTTP **401 / 403**，不 Upgrade（节省服务端连接资源）。

---

## 三、帧协议（JSON-RPC 2.0 Multiplexed）

所有消息使用 UTF-8 JSON：

```typescript
// 客户端 → 服务端：订阅
{
  "jsonrpc": "2.0",
  "id": 1234,
  "method": "subscribe",
  "params": {
    "channel": "workflow:approvals",
    "filter": { "assignee_id": "uuid-of-user" }
  }
}

// 服务端 → 客户端：OK
{ "jsonrpc": "2.0", "id": 1234, "result": { "status": "subscribed", "sub_id": "wf-apr-7xyz" } }

// 服务端 → 客户端：通知（无 id）
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": {
    "channel": "workflow:approvals",
    "event": "approval.new",
    "data": { "id": "...", "title": "采购单审批等待中" },
    "ts": 1785544400000,
    "trace_id": "..."
  }
}
```

### 3.1 系统保留 method 列表（禁止业务占用）

| method | 方向 | 说明 |
|--------|------|------|
| `ping` / `pong` | 双向 | 心跳；`client.ping(30s)` → server.pong，**90s 无交互 server 主动断** |
| `subscribe` / `unsubscribe` | C→S | 频道订阅生命周期 |
| `event` | S→C | 业务通知 |
| `authenticate` | C→S | token 过期后 JWT 刷新 · 无需重建连接 |

---

## 四、心跳 & 重连

### 4.1 心跳（P35-6 OTel 指标采集）
- 浏览器端：30s `ping`，未接 `pong` ≤ 5s 视为半断，关闭并触发重连。
- 服务端：90s 未收到任何帧 → 断；释放订阅表。
- Nginx：`proxy_read_timeout 120s`；`proxy_send_timeout 120s`（与服务端对齐）。

### 4.2 重连策略（`useWebSocket.ts` 默认）
```
指数退避 + 抖动：
  delay = min(30s, 1s * 2^n) + rand(0ms, 500ms)
  第 1 次失败: 1.0-1.5s
  第 2 次失败: 2.0-2.5s
  …
  第 6 次及之后: 30.0-30.5s（上限）
```
- `visibilitychange` → 重新可见立即重连（不等退避）。
- JWT 401 后重连：先 `/api/core/iam/v1/auth/refresh` 再走 `authenticate`。

---

## 五、Nginx 参考配置（与 P36-1 部署手册一致）

```nginx
location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # TLS 下务必透传
    proxy_ssl_server_name on;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    # 所有 /ws/ 均汇聚到 unified-core:8000 Hub
    proxy_pass http://unified-core:8000;
}
```

---

## 六、安全 & 配额（P31 纵深防御延伸）

| 项 | 值 | 说明 |
|----|----|------|
| 每 token 最大并发连接 | **6** | 多端：浏览器 2 tab + 桌面 + 移动 + API 调试 = 6 路封顶 |
| 每连接最多订阅频道 | 32 | 超出 → `{code: 4202, message: "too many channels"}` |
| 单消息体最大大小 | **64KB** | 超 64KB 请走 `HTTP/REST + 异步事件通知` |
| 广播扇出频控 | 每 1 秒 最多 10 条 global | 高频（>10/s）合并批处理推送 |
| Origin 检查 | ✅ 生产白名单 | `allow-origin: https://topems.example.com`（生产必设） |
| Cookie CSRF | 同上 P31-5 | WS 握手额外对比 Origin 与 CSRF token（双保险） |

---

## 七、验收 & 调试

- `/docs/admin/README.md §5 合规表 #7`：本规范文档与 Nginx 配置保持一致时打勾。
- 自测：打开 `/ws/healthz`（非 Upgrade HTTP GET）返回 JSON：
  ```json
  {"ok":true,"version":"v65.0","clients":1234,"channels":{"workflow:approvals":411}}
  ```
- 日志：统一 trace_id 贯穿 HTTP → WS 帧；loki 标签集：`job=websocket, module, svc_code`
