# 发给生产机（xingzhai Mac mini）的对齐通知 —— 2026-11-24

> ❌ **本文已作废（2026-11-24 晚）**：生产机回执证明 `.env.production` 在生产机上不存在且不会被加载；
> 真实配置源是 launchd plist 的 `EnvironmentVariables` + Keychain 注入。本文中关于改 `.env.production`、
> `DATABASE_MAX_CONNECTIONS`、`STORAGE_PATH`、`PLUGIN_STORAGE_PATH`、`CORE_PORT` 的要求**均不成立**，
> 请勿据此操作。纠正记录见 `docs/ops/prod-config-truth-source-2026-11-24.md`。


> 主控机（air）已完成生产配置收口（提交 `6221cc78e`），并在 Cloudflare 侧完成了 DNS/入口收口。
> 本轮生产机**只需要核对并同步 `.env.production` + 重启 + 回传验收结果**，DNS 不用你动。
> 通知不含任何口令；所有口令沿用生产机现有值，不要新建、不要回传明文。

---

## 一、背景（一句话）

已确认生产形态是 **native**：launchd `com.topems.server` → 127.0.0.1:8099，nginx 80/443，cloudflared 隧道 `topems`，库 `topems_prod`。而仓库里那份 `.env.production` 原先是从 Linux 模板抄来的（owner 直连 5432、`/opt/topems` 路径、CORS 占位域名、连接池 100）。主控机已按 native 形态修正，需要你在生产机核对并同步。

## 二、要做的事（按顺序）

### 1. 先取证（不改任何文件）

```bash
cd /Users/xingzhai/topems
git log --oneline -1
git status --short | head
shasum -a 256 .env.production
ls -l .env.production
grep -E '^(ENVIRONMENT|DATABASE_URL|MIGRATE_URL|DATABASE_MAX_CONNECTIONS|SERVER_PORT|CORE_PORT|CORS_ALLOWED_ORIGINS|STORAGE_PATH|PLUGIN_STORAGE_PATH)=' .env.production | sed -E 's#(://)[^@/]*@#\1***@#'
```

回传上面 5 条输出即可（`DATABASE_URL` 已做过脱敏处理，不要贴明文口令）。

### 2. 同步 `.env.production`（仅当与下表不一致时改）

| 键 | 目标值 |
|---|---|
| `DATABASE_URL` | `postgresql:///topems_prod?user=xingzhai`（unix socket + peer） |
| `MIGRATE_URL` | 同上；没有就新增一行 |
| `DATABASE_MAX_CONNECTIONS` | `30` |
| `SERVER_PORT` / `CORE_PORT` | `8099` |
| `CORS_ALLOWED_ORIGINS` | `https://www.topmap.net,https://app.topmap.net` |
| `STORAGE_PATH` / `PLUGIN_STORAGE_PATH` | `/Users/xingzhai/topems/data/files` / `/Users/xingzhai/topems/data/plugins` |

改之前先备份：

```bash
cp -p .env.production .env.production.bak-$(date +%F)
chmod 600 .env.production.bak-$(date +%F)
```

改完必须：

```bash
chmod 600 .env.production
shasum -a 256 .env.production
```

**不要动** `JWT_SECRET` / `JWT_REFRESH_SECRET` / `SESSION_SECRET` / `REDIS_URL` / `PLUGIN_REGISTRATION_TOKEN` 的任何值——改了会让现有登录态和客户端全部失效。

### 3. 重启并验证

```bash
launchctl kickstart -k gui/$(id -u)/com.topems.server
sleep 5
launchctl print gui/$(id -u)/com.topems.server | grep -E 'state|pid|last exit'
curl -s -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:8099/health
curl -s -o /dev/null -w 'www=%{http_code}\n' https://www.topmap.net
curl -sI https://www.topmap.net | grep -iE 'server'
```

CORS 验收（合法 Origin 有回显头、非法 Origin 无）：

```bash
curl -sI -H 'Origin: https://www.topmap.net' http://127.0.0.1:8099/api/core/health | grep -i access-control
curl -sI -H 'Origin: https://evil.example'      http://127.0.0.1:8099/api/core/health | grep -i access-control
```

### 4. 顺手确认（只读，不用改）

```bash
cloudflared tunnel list
cloudflared tunnel info topems
```

DNS 侧主控机已核对并收口：`www` / `app` 都是指向隧道 `d677df4c-…cfargotunnel.com` 的 CNAME，**不要执行 `cloudflared tunnel route dns`**（重复执行可能覆盖现有记录），也**不要在 Cloudflare 控制台改 DNS**。

### 5. 回传清单（贴回来即可）

1. `git log --oneline -1` 与 `git status --short | head`
2. `.env.production` 的 sha256 与权限位
3. 第 2 步改动的 diff：
   ```bash
   diff -u .env.production.bak-* .env.production | sed -E 's#(://)[^@/]*@#\1***@#'
   ```
4. `launchctl print` 的 `state` / `pid` / `last exit code`
5. 三条 curl 的状态码 + 两条 CORS 检查结果
6. `cloudflared tunnel info topems` 输出（去掉 token 字段）

## 三、明确不要做的事

- 不要 `git push`、`git reset --hard`、切分支：生产机工作区可能有窗口期产物（`window-2026-11-15-windowC/D` 等）。
- 不要动数据库：本轮只改配置，不涉及迁移；`topems_prod` 的 `_sqlx_migrations` 保持现状。
- 不要把 `.env.production` 或 `deploy/docker/pgbouncer/userlist.txt` 之类带口令的文件提交或外发。
- 不要改 DNS、不要重跑 `cloudflared tunnel route dns`。
- 不要在没备份的情况下改 `JWT_*` / `SESSION_SECRET` / Redis 口令。

## 四、验收标准（全绿才算完成）

- [ ] `.env.production` 权限 600，6 个键与上表一致，且 `JWT_*` / `SESSION_SECRET` / Redis 口令**未变**
- [ ] `launchctl print` 显示 `state = running`，pid 有值，`last exit code` 正常
- [ ] `http://127.0.0.1:8099/health` 返回 2xx
- [ ] `https://www.topmap.net` 返回 200
- [ ] CORS：`https://www.topmap.net` 有 `access-control-allow-origin`；`https://evil.example` 无
- [ ] 回传项齐全（第 5 节 6 条）

## 五、如果出问题

1. 回滚配置：
   ```bash
   cp -p .env.production.bak-$(date +%F) .env.production
   chmod 600 .env.production
   launchctl kickstart -k gui/$(id -u)/com.topems.server
   ```
2. 服务起不来：先看 `launchctl print` 的 `last exit code` 与 plist 中 `StandardErrorPath` 指向的日志（默认 `/tmp/topems-logs/`），把最后 50 行贴回来，不要先改代码。
3. 网站 502/522：先 `launchctl print` 看进程是否在跑，再 `curl http://127.0.0.1:8099/health`；若本机正常而外部 5xx，说明是隧道/边缘问题，先回传 `cloudflared tunnel info topems`，不要动 DNS。
