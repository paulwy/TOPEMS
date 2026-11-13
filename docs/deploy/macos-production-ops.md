# TOPEMS 生产机部署后运维与决策建议（xingzhai 侧）

> 本文档为 **airdeair 侧起草的决策材料 + 运维参考**，对应 `go-live-checklist §0.3` 待决策 4 项
> （① 证书 ② DB 备份 ③ 外网开放 ④ 首次登录换密），并补充日常运维/升级/回滚流程。
> 受众：xingzhai 机执行 AI + 两侧用户。所有命令在 **xingzhai 机** 上执行（本机为 airdeair 开发机，不直接操作生产机）。
> 生效前提：已按 `xingzhai-ai-runbook.md` 完成方案 B 部署（launchd `com.topems.server` + `com.topems.nginx` 托管的 brew nginx，2026-10-26 验收 6/6）。

---

## 0. 待决策总览（含推荐默认值）

| # | 项 | 推荐默认 | 影响 | 决策人 |
|---|---|---|---|---|
| ① | 证书 | 短期保持自签 + 客户端 `-k`/`--insecure`；上线对外前换受信 | 浏览器/客户端信任面 | 用户 |
| ② | DB 备份 | 每日 03:00 pg_dump 全库 + 保留 7 份 + 每周异地拷贝 1 份 | 数据安全 | 用户 |
| ③ | 外网开放 | 先内网/仅本机，不直接暴露公网；确需再按 §4 最小开放 | 攻击面 | 用户 |
| ④ | 首次登录换密 | 立即执行 `~/topems/change-admin-password.sh` | 凭证安全 | xingzhai 侧 |

> 决策原则：①③ 是"上线对外"才急，②④ 是**今日**就应做。推荐先落 ②④，①③ 随上线节奏拍板。

---

## 1. 证书决策（待决策 ①）

### 现状
- nginx 使用自签证书（drill conf 生成），HTTP 80 已 301 → HTTPS 443。
- 内部/本机使用无碍（curl 加 `-k`；smoke 已验证 `--insecure`）。

### 选项对比

| 选项 | 做法 | 优点 | 代价/风险 | 适用 |
|---|---|---|---|---|
| A 保持自签 | 现状 + 客户端信任管理（导入 CA 或加 -k） | 零成本、立即可用 | 外部浏览器告警；客户端密钥管理 | 内网/演示期 |
| B 内部 CA | 私有 CA 签发，把 CA 根证书分发到客户端 | 无外部依赖、可控 | 每台客户端要装根证书；CA 私钥保管 | 多客户端内网 |
| C 受信证书（Let's Encrypt DNS-01） | `certbot` / acme.sh + DNS-01（无需 80 端口），通配/单域 | 浏览器零告警、自动续期 | 需域名 + DNS API；公网可达性要求低 | 正式对外 |
| D 商业证书 | 阿里云/腾讯云等签发 | 品牌信任 | 付费、DV 级与 C 等价 | 企业合规要求时 |

### 推荐
- **演示/内网期**：维持 A（自签），配合客户端信任导入；不必现在动。
- **正式对外前**：切 C（Let's Encrypt DNS-01）。单域名即可（`topems.xxx`），acme.sh 定时续期 + nginx reload。
- 无论哪种，**私钥权限**：`~/topems/nginx/` 下 key 文件 `chmod 600`，进程属主 topems。

---

## 2. 数据库备份方案（待决策 ②，建议今日落地）

### 推荐：每日逻辑备份 + 保留 + 每周异地

**备份脚本** `~/topems/backup-topems.sh`（xingzhai 侧创建）：

```bash
#!/bin/bash
set -euo pipefail
# 备份 topems_prod 到 ~/topems/backups，保留 7 份，每周日额外打异地副本
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/topems/backups"
PGPASSWORD='<生产库口令>' pg_dump -h 127.0.0.1 -U topems_app -d topems_prod \
  --format=custom --file="$BACKUP_DIR/topems_prod-$TS.dump"
# 保留最近 7 份
ls -t "$BACKUP_DIR"/topems_prod-*.dump | tail -n +8 | xargs -r rm -f
# 每周日（cron 约定）追加异地副本到另一磁盘/网络盘
if [ "$(date +%u)" = "7" ]; then
  cp "$BACKUP_DIR/topems_prod-$TS.dump" "$HOME/topems/backups-weekly/topems_prod-weekly-latest.dump"
fi
# 校验：pg_restore 可读性
pg_restore --list "$BACKUP_DIR/topems_prod-$TS.dump" >/dev/null 2>&1 && echo "OK $TS" >> "$BACKUP_DIR/backup.log"
```

**定时（launchd，替代 cron 更贴合 macOS）** `~/Library/LaunchAgents/com.topems.backup.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.topems.backup</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>/Users/<用户名>/topems/backup-topems.sh</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>/Users/<用户名>/topems/backups/backup.out.log</string>
  <key>StandardErrorPath</key><string>/Users/<用户名>/topems/backups/backup.err.log</string>
</dict>
</plist>
```

加载：`launchctl load ~/Library/LaunchAgents/com.topems.backup.plist`（新 macOS：`launchctl bootstrap gui/$(id -u) ...`）。

### 恢复演练（每月一次，5 分钟）
```bash
createdb -h 127.0.0.1 -U topems_app topems_restore_test
pg_restore -h 127.0.0.1 -U topems_app -d topems_restore_test --no-owner 最新.dump
# 抽查：SELECT count(*) FROM ehs.training_records; 等
dropdb topems_restore_test
```
> 注：生产库**禁止 sqlx migrate run**（迁移治理定案）；备份/恢复不影响迁移链。

---

## 3. 外网开放（待决策 ③）

### 默认建议
- **不直接暴露公网**：先保持内网/本机（topems-server 监听 `*:8099`，lsof 实测为 IPv4 全部接口，并非仅回环；对外暴露面由 macOS 防火墙 + nginx 80/443 控制）。
- 对外前必须：受信证书（§1 选项 C）+ 只开 443 + 关 80（或 80→443）+ 弱口令清除 + 密钥轮换。

### 最小开放矩阵（确需对外时）
| 端口 | 协议 | 用途 | 要求 |
|---|---|---|---|
| 443 | HTTPS | nginx 入口 | 受信证书；仅业务端口 |
| 22 | SSH | 运维 | 仅白名单 IP / 密钥登录，禁口令 |
| 5432 / 8099 | —— | 数据库/BFF | **绝不对外**（nginx 单上游 8099 内网可达即可） |

### 对策（都做，成本 < 1 小时）
1. macOS 防火墙开启 + 仅放行 443/22（白名单）。
2. SSH 改密钥登录（禁 PasswordAuthentication）。
3. 生产机与应用共用强口令；应用侧立即执行换密（§4）。
4. JWT/DB 口令轮换方案已记录（见回报 §6），随上线执行。
5. 定期 `pg_dump` 异地副本（§2）作为勒索/误删兜底。

---

## 4. 首次登录换密（待决策 ④，立即执行）

- xingzhai 侧：**首次登录后立即**执行 `~/topems/change-admin-password.sh`（部署回报 §6 已就绪），完成后向 airdeair 侧回报（换密时间、账号、确认弱口令清除）。
- airdeair 侧：go-live-checklist §0.3 该项由"待执行"转"✅"（收到回报后）。

---

## 5. 日常运维速查（xingzhai 机）

| 操作 | 命令 |
|---|---|
| 查看服务状态 | `launchctl list | grep topems` / `ps aux | grep topems-server` |
| 查看日志 | `tail -f ~/topems/logs/server.out`（标准输出）/ `~/topems/logs/server.err`（错误），由 plist 的 `StandardOutPath`/`StandardErrorPath` 指定 |
| 重启服务 | `launchctl kickstart -k gui/$(id -u)/com.topems.server` |
| nginx 语法检查 | `/opt/homebrew/bin/nginx -t`（当前生效配置 `/opt/homebrew/etc/nginx/nginx.conf`，include `servers/topems.conf`、`servers/topems-ssl.conf`；非登录 SSH 的 PATH 不含 `/opt/homebrew/bin`，裸 `nginx` 会 command not found） |
| nginx reload | `/opt/homebrew/bin/nginx -s reload`（平滑）；或 `launchctl kickstart -k gui/$(id -u)/com.topems.nginx`（整进程重启） |
| nginx 访问日志 | `/Users/xingzhai/topems/nginx/logs/access.log`（`~/topems/logs/nginx.out`、`nginx.err` 为 launchd 捕获的进程输出） |
| health 探针 | `curl -k https://localhost/health` 与 `curl http://localhost:8099/health` |

### 升级流程（新 main 拉取后）
```bash
cd ~/topems/repo && git fetch origin && git reset --hard origin/main   # 仅限确认无误的 tag/commit
cargo build --release -p topems-server                                  # 或拉取预编译产物
cp target/release/topems-server ~/topems/bin/                           # 替换二进制
launchctl kickstart -k gui/$(id -u)/com.topems.server                   # 重启生效
# 若含迁移：生产禁止 sqlx migrate run → 按 DDL 运维流程逐条执行（database-half-migration-ops.md）
```
### 回滚
- 保留旧二进制（`cp ~/topems/bin/topems-server ~/topems/bin/topems-server.prev`），回滚 = 换回 `.prev` + 重启。
- DB 变更不可逆时，回滚前先 `pg_dump`（§2）。

---

## 6. 决策清单（决策人勾选后回传 airdeair 侧）

- [ ] ① 证书：维持自签 / 换受信（____方式）——决定时间：____
- [ ] ② DB 备份：每日 03:00 + 保留 7 份 + 每周异地（脚本/plist 已给）——落地时间：____
- [ ] ③ 外网开放：不开放 / 最小开放（443+22 白名单）——决定时间：____
- [ ] ④ 首次登录换密：已执行（回报时间：____）

> 任一勾选结果回传后，airdeair 侧更新 `go-live-checklist §0.3` 对应项状态。
