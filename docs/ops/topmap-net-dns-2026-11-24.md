# topmap.net DNS 收口清单（2026-11-24）

## 实测现状（外部探测）

| 记录 | 解析结果 | 含义 |
|---|---|---|
| `www.topmap.net` | 本机解析器：`CNAME topems-website.pages.dev` + `172.66.47.178/44.78`；`@1.1.1.1`：`172.67.204.59/104.21.85.89`，无 CNAME | **两个解析器答案不一致**，pages.dev 绑定残留 |
| `app.topmap.net` | `172.67.204.59 / 104.21.85.89` | 与 www 同一边缘 IP |
| `topmap.net`（裸域） | `39.97.42.144` | 阿里云 ECS，http/https 均无响应 |
| NS | `sterling.ns.cloudflare.com` / `peaches.ns.cloudflare.com` | 已在 Cloudflare |

HTTP 侧：`https://www.topmap.net` 与 `https://app.topmap.net` 均 200，静态 404 页带 `nginx/1.31.1`，`/api/*` 返回后端统一 JSON 包装 → **两者最终都落到 Mac mini 上的 nginx**，Pages 并未真正提供服务，但 CNAME 残留仍是随时可能翻车的隐患。

## 要做的三件事

1. **清掉 www 的 pages.dev 残留**
   Cloudflare Dashboard → DNS → Records：删除 `www` 的 `CNAME topems-website.pages.dev`；随后在 Zero Trust → Networks → Tunnels → 隧道 `topems` → Public Hostname 里确认 `www.topmap.net → http://127.0.0.1:80`（或 443），保存后 Cloudflare 会自动建回 `CNAME <uuid>.cfargotunnel.com`。
   命令行等价（需在**生产机**上执行，那里才有 tunnel 凭据）：

   ```bash
   cloudflared tunnel route dns topems www.topmap.net
   ```

2. **裸域跳 www**（避免评审直接输 `topmap.net` 打不开）
   Cloudflare → Rules → Redirect Rules：`topmap.net/*` → `https://www.topmap.net/$1`，301，勾选“Preserve query string”。

3. **复验**

   ```bash
   dig +short @1.1.1.1 www.topmap.net          # 应为 Cloudflare 边缘 IP，且无 pages.dev CNAME
   dig +short @8.8.8.8 www.topmap.net          # 与上一条一致（排除缓存假象）
   curl -sI https://www.topmap.net | head -3   # 200 + server: cloudflare
   curl -s -o /dev/null -w '%{http_code}\n' https://www.topmap.net/nope.png   # 404 且页面含 nginx/1.x
   curl -sI https://topmap.net | head -5       # 301 → https://www.topmap.net/
   ```

> 本机无 Cloudflare 凭据（`~/.cloudflared` 不存在、环境无 `CLOUDFLARE_API_TOKEN`），生产机 SSH（`xingzhai@192.168.3.129:22`）当前超时，因此以上三步未能代执行。
