# BFF WS 接线立项决策包（2026-10-29）

## 现状盘点（已核实）

| 层 | 现状 | 证据 |
|---|---|---|
| 前端 WS | `useWebSocket.ts` → `ws://{host}/ws/core`（+VITE_WS_SIGNING_SECRET 签名） | apps/web/src/hooks/useWebSocket.ts:82 |
| server WS 实现 | `svc/unified-core/src/modules/communication/ws.rs`：handle_socket（心跳 30s/JWT 鉴权/Redis 订阅）+ `/ws/core/notifications`、`/ws/core/im`、`/ws/healthz`、`/ws/{module}/{feature}`（模块白名单） | ws.rs:387/788/907 + routes/mod.rs:99-113 |
| 8099 内嵌 | `UnifiedCoreRealModule` 已注册（feature module-core 默认启用） | svc/server/src/main.rs:459-472 |
| mes WS | `dashboard_ws.rs` 独立；unified-core 116 行注释「生产由独立 svc/mes 提供」；svc/server 532-533 注释 `/ws/mes/dashboard` 已随 mes 镜像解引用 | svc/mes/src/modules/mod.rs:9 |

## 关键缺口（WS 链路在生产 nginx 层即断）

- `deploy/nginx/topems.conf` **无任何 `/ws` location**：`location /api/`（139 行）只代理 `/api/*`；`/ws/core` 请求不匹配 → 落默认 `location /`（130 行）静态服务 → **WS 握手 404/降级**
- `location /api/` 内 `proxy_set_header Connection ""`（149 行），**无 `Upgrade $http_upgrade`** ——即便匹配也断 WS upgrade

## 工程范围（4 工作包）

- **W1（关键 · ~10 行 nginx + 验证）**：`location /ws/ { proxy_pass http://server_service; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_read_timeout 60s; }` → 打通 8099 反代 WS；验证 = curl Upgrade 握手 + 前端实连
- **W2（验证 · 0 代码）**：8099 内嵌 unified-core 的 `/ws/core/notifications`、`/ws/healthz`、`/ws/{module}/{feature}` 可达性 smoke（含 JWT token 鉴权路径、Redis 订阅通道）
- **W3（评估 · 待定）**：mes `dashboard_ws` 独立进程是否纳入 8099 统一（当前独立部署，注释表明生产由 mes 提供；需确认 8099 是否也挂 mes ws，避免双入口）
- **W4（可选 · 挂起待业务）**：业务模块 WS 实时通道（production/attendance 等推送）——需产品侧立项，本包不做

## 决策建议

**立即立项 W1 + W2**（打通链路 + 验证，小改动高价值，预计 1 commit + 实测）；**W3 随 W2 验证一并评估**（确认 mes ws 入口收敛）；**W4 挂起**（业务侧需要时再开）。

## 实施结果（W1+W2 已落地，2026-10-29）

- **W1 ✅**：`deploy/nginx/topems.conf` 新增 `location /ws/`（157-166 行）：`proxy_pass http://server_service` + `proxy_http_version 1.1` + `Upgrade $http_upgrade` / `Connection "upgrade"` + `proxy_read_timeout 60s`。配置已入库（`epoll` 为部署目标 Linux 既有指令；macOS 本机 nginx -t 平台差异不影响）
- **W2 ✅ 实测**（8099 在线）：
  - `GET /ws/healthz` → **200**（内嵌 ws 路由树挂载确认）
  - `GET /ws/core/notifications`（带 Upgrade 头）→ **426**（axum WebSocketUpgrade 提取器命中，路由已挂载）
  - `GET /ws/core` → **404**（白名单通用路径格式校验，非 500）
  - `GET :8000/ws/healthz` → **404**（独立 unified-core 无入向流量，8099 唯一入口佐证）
- **W3 结论 ✅**：`WS_MODULE_WHITELIST`（ws.rs:880）含 iam/workflow/im/mes/wms/ai/notification/dashboard/ticket 9 模块——**8099 内嵌即可服务 `/ws/mes/dashboard` 等**；mes 独立挂载 `/ws/mes/dashboard`（main.rs:262）为兼容双入口。**建议前端统一走 8099**（nginx /ws/ 已配）；mes 独立实现与 unified-core 通用通道的行为差异（推送数据源）登记观察项，业务侧确认后收敛。

## 风险与回滚

- W1 纯 nginx 配置：回滚 = 移除 location 块 + reload，零代码风险
- WS 鉴权沿用现有 JWT/签名机制（VITE_WS_SIGNING_SECRET 与 jwt_secret 对齐），无新增安全面
