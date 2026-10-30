# Nginx WS 反代部署包（2026-10-30）

> 目标：生产 nginx reload 一键生效 BFF WS 链路（`/ws/` 反代 + v1 清理）。配置已入库（`deploy/nginx/topems.conf`），本包仅含部署执行说明。

## 变更清单（已入库）

| 变更 | 位置 | commit |
|---|---|---|
| 新增 `location /ws/`（Upgrade/Connection upgrade + proxy_read_timeout 60s） | topems.conf:157-166 | `317cb2c458` |
| 删除旧 v1 正则块（9 个 location：/api/{core/,}{svc}/v1 + /api/v1/*） | topems.conf（原 170-200 行） | `65a23eeb74` |
| 补齐 443 location 级安全头（HSTS/CSP/X-Frame/nosniff/Referrer-Policy；修复 add_header 继承屏蔽，前端页面/资源缺失安全头） | topems.conf location /、/assets/、静态正则 | `e42c33206` |

## reload 步骤（生产）

```bash
# 1. 语法校验（部署目标 Linux nginx，非 macOS 本机）
nginx -t -c /etc/nginx/nginx.conf          # 或 nginx -t（默认配置）

# 2. 若配置片段被 include，确认 topems.conf 已被主配置引入且路径正确

# 3. reload（平滑，不中断连接）
nginx -s reload

# 4. 验证 WS 链路（穿透反代，与直连状态码一致）
#   直连 8099：
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/ws/healthz          # 期望 200
#   穿透反代（经 nginx 80 端口）：
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/ws/healthz               # 期望 200
#   WS 握手（Upgrade 头，期望 426=路由已挂载，非 404）：
curl -s -i -m 5 -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  http://localhost/ws/core/notifications 2>&1 | head -1                            # 期望 HTTP/1.1 426

# 5. 前端 E2E：通知铃铛实连（useNotificationWebSocket → /ws/core），浏览器 Network 看 101 Switching Protocols
```

## WS_ALLOWED_ORIGINS（可选，v1.117 Origin 白名单）

- 后端 `svc/unified-core/src/modules/communication/ws.rs` 读取 env `WS_ALLOWED_ORIGINS`（逗号分隔）
- **配置后严格校验**：Origin 不匹配/缺失 → 403；**未配置放行**（开发默认）
- 生产建议配置（按实际域名）：
```bash
# 示例（在 topems-server 部署 env）：
WS_ALLOWED_ORIGINS=https://topems.example.com,https://admin.topems.example.com
```

## 回滚

- 移除 `location /ws/` 块 + `nginx -s reload`（零代码风险）
- v1 清理不可逆风险极低（全仓前端零 v1 活调用核实，见 `mobile-bff-topology.md`）；如遇异常可 `git checkout deploy/nginx/topems.conf` 恢复后 reload

## 生效后预期

- 前端 `ws://{host}/ws/core` 链路（通知/dashboard/IM）生产可达（此前 nginx 无 /ws location 落静态 404）
- WS 鉴权沿用 JWT/签名机制（VITE_WS_SIGNING_SECRET 与 jwt_secret 对齐），无新增安全面
