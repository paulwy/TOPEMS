# TopEMS nginx 生产首部署复核 Runbook（P0-3 单上游口径）

> **2026-11-13 实测边界**：当前本机生产 nginx 是 macOS Homebrew 版，配置 `/opt/homebrew/etc/nginx/nginx.conf`（include `servers/topems.conf`、`servers/topems-ssl.conf`），80/443 **直接** `proxy_pass http://127.0.0.1:8099`，**没有 upstream 块**；排障用绝对路径 `/opt/homebrew/bin/nginx -t|-T`（非登录 SSH 的 PATH 不含 brew，裸 `nginx` 会 command not found）。本文 §1-§5 的 `upstream server_service` / `/etc/nginx/conf.d` 路径是 **Linux 模板**口径，不适用于当前 macOS 生产；Linux 目标机仍按本文执行。

> 状态：**流程固化 ✅（2026-10-07）｜生产加载验证 ⏳ 待生产/容器 Linux 环境**
> 拓扑（P0-3 双轨合一后）：**唯一对外入口 = `upstream server_service → localhost:8099`**
> （topems-server 模块化单体 BFF）。`/api/*` 由 `location /api/` 直代 `server_service`，
> **不再有** `$request_uri → $api_upstream` 前缀 map 路由表；`/health`、`/metrics` 亦由该 BFF 直接暴露。
> 2026-10-19 修订：旧版（A1）的 map 逐字比对与 map 快照随 P0-3 作废，改为 upstream 8099 校验。

## 0. 本机演练路径（macOS）

> 生产 conf 含平台专属指令无法直接在 macOS 加载——根因（实测定位）与解决：
> `user www-data`（无此用户→删）、`use epoll`（macOS kqueue→删）、`pid /run`（→本机前缀）、
> `include /etc/nginx/mime.types`（→brew 路径）、certs（→自签）、upstream 端口（统一 8099）、
> `brotli`（brew 无此模块→删）。

```bash
# 1. 生成演练 conf（自签证书 + 等价 conf，upstream 统一指向 localhost:8099）
bash scripts/gen-nginx-drill-conf.sh /tmp/topems-nginx-dev
# 2. 语法校验 + 启动（监听 80/443；80→301、443 SSL）
nginx -t -c /tmp/topems-nginx-dev/topems-drill.conf && nginx -c /tmp/topems-nginx-dev/topems-drill.conf
# 3. 校验（upstream 8099 校验 + 冒烟；按本机实际可达域传 --services）
bash scripts/verify-nginx-prod.sh --conf /tmp/topems-nginx-dev/topems-drill.conf \
  --repo-conf ./deploy/nginx/topems.conf --base https://localhost \
  --services "erp bi hrm monitor" --probe "/health" --insecure
# 期望：UPSTREAM_OK + SMOKE n/n 200 + PASS（未起 BFF 时第 3 步按实际可达域收窄）
# 4. 停止：kill $(cat /tmp/topems-nginx-dev/nginx.pid)
```

> 本机演练仅验证 nginx 加载、SSL 链路与 upstream 指向；生产原文（含 epoll/brotli/www-data——
> 生产编译 nginx 特性）加载验证仍需 Linux 环境。

## 1. 背景与目标

- 生产流量入口 = `deploy/nginx/topems.conf`（事实源）。P0-3 双轨合一后，原 per-service upstream
  与 `$request_uri → $api_upstream` 前缀 map 已关闭；全部 `/api/*` 由模块化单体 BFF（:8099）内嵌
  约 30 个服务适配器统一路由，未知路由由 BFF catch-all 返回 404。
- macOS 本机无法加载 `use epoll` 配置，**语法/加载验证只能在生产/容器 Linux 环境执行**——
  本 Runbook 把所有可提前固化的复核动作与回滚预案沉淀下来，到环境后按步骤执行即可完成验收。
- 首部署失败典型形态：upstream 未指向 8099（或残留旧多上游/map）→ 502/404 黑洞；
  证书路径错误 → 443 起不来；`try_files` 与 `location /` 顺序错误 → SPA 刷新 404。

## 2. 前置检查（部署前）

| 检查项 | 命令/标准 |
|---|---|
| nginx 版本 | `nginx -v` ≥ 1.20（支持 http2） |
| conf 完整性 | `ls /etc/nginx/conf.d/topems.conf /etc/nginx/certs/{fullchain,privkey,chain}.pem` 全存在 |
| BFF 上游可达 | `curl -sf http://localhost:8099/health && echo OK`（BFF 与 nginx 同机；跨机时替换为实际 BFF 主机:8099） |
| 备份现状 | `cp topems.conf topems.conf.bak-$(date +%F)` + `sha256sum topems.conf > conf.sha256` |
| 端口占用 | `ss -ltn | grep -E ':(80|443)'` 无异常占用；确认 8099 已被 BFF 监听 |

## 3. 复核步骤

### 3.1 conf 语法校验

```bash
nginx -t -c /etc/nginx/nginx.conf
# 期望：syntax is ok / test is successful（0 退出码）
```

### 3.2 upstream server_service → 8099 校验

生产 conf 的 `upstream server_service` 必须指向 `localhost:8099`，且**不应**残留旧前缀 map。
直接用固化脚本一次完成（比对生产 conf 与仓库事实源 `deploy/nginx/topems.conf`）：

```bash
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf
# 期望：UPSTREAM_OK（server_service -> localhost:8099，与仓库事实源一致；无 LEGACY_MAP_PRESENT）
```

> 注意：**拓扑变更必须先进仓库再进生产**（防漂移）；脚本同时会拦截残留 `map $request_uri $api_upstream`。

### 3.3 加载与重载

```bash
nginx -s reload            # 或 systemctl reload nginx
sleep 2
nginx -s reload && echo RELOAD_OK
```

### 3.4 冒烟端点（经 BFF 反代链路）

`scripts/verify-nginx-prod.sh` 第 3 步对各域探活（需 `--base` 真栈）：

```bash
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf \
  --base http://<nginx-host> \
  --services erp bi hrm portal core wms
# 期望：可达域全部 HTTP 200（每域以该服务真实可达端点为准，见脚本 --probe 参数）
```

> 判读：200 = 反代到 BFF 且该域适配器可服务；404 且 BFF 直连 200 = 路径/适配器错位；
> 502 = upstream(8099) 不可达；504 = 网关超时。

## 4. 回滚预案

| 触发条件 | 动作 |
|---|---|
| `nginx -t` 失败 | 不 reload；修复语法；回退步骤 2 备份 |
| reload 后可达域多数非 200 | 立即回滚：`cp topems.conf.bak-<date> topems.conf && nginx -s reload` |
| 443 起不来（证书问题） | 检查 certs 路径/权限；回滚到 certs 修复前状态 |
| upstream 校验有差异但已部署 | 以仓库事实源为准修正并**重新走 3.1→3.4**，禁止直接上线差异版本 |

回滚后必须复跑 3.4 冒烟确认恢复；全部失败无法恢复时保留 502 页面（比错误路由安全）并升级处理。

## 5. 验收清单（到环境后勾选）

- [ ] `nginx -t` 加载 conf 成功（0 退出码）
- [ ] upstream server_service → 8099 校验 UPSTREAM_OK（与仓库 `deploy/nginx/topems.conf` 一致，无残留 map）
- [ ] 可达域冒烟全 200
- [ ] 回滚预案演练（备份恢复 + reload 成功）
