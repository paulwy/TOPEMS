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
| health 探针 | `curl -k https://localhost/health` 与 `curl http://127.0.0.1:8099/health` |
| 监听地址核验 | `lsof -nP -iTCP:8099 -sTCP:LISTEN` —— 期望仅 `127.0.0.1:8099`，**不得出现 `*:8099`**。监听地址由 `BIND_ADDR` 决定、默认回环（生产 plist 不设该变量）；对外统一走 nginx |

### 升级流程（新 main 拉取后）
```bash
cd ~/topems/repo && git fetch origin && git reset --hard origin/main   # 仅限确认无误的 tag/commit
cargo build --release -p topems-server                                  # 或拉取预编译产物
cp target/release/topems-server ~/topems/bin/                           # 替换二进制
launchctl kickstart -k gui/$(id -u)/com.topems.server                   # 重启生效
lsof -nP -iTCP:8099 -sTCP:LISTEN                                        # 期望 127.0.0.1:8099（不是 *:8099）
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

---

## 6. 离线备份仓（MacBook Pro，2026-11-18 落地）

**定位**：仅作 Offsite 归档接收端，不承担任何计算/服务角色（该机 8 GB 内存，低于生产准入 ≥16 GB，且 SSH/屏幕共享未开启）。

| 项目 | 内容 |
|---|---|
| 归档脚本 | `~/topems/backup-offsite.sh`（默认 copy；`--check` 前置检查；`--verify` 全量校验） |
| 凭证 | `~/topems/.secrets/smb-mbp.env`（chmod 600，含 `SMB_URL`、可选 `REMOTE_SUBDIR`） |
| 周归档 | launchd `com.topems.backup-offsite`，每周日 03:30 |
| 月校验 | launchd `com.topems.backup-offsite-verify`，每月 1 日 04:00 |
| 日志/索引 | `~/topems/backups-offsite/backup-offsite.log`、`offsite-index.csv` |
| 远端布局 | `<共享目录>/topems-archive/topems_prod-YYYYMMDD-HHMMSS.dump` |

**策略**：远端滚动保留最近 26 份（该机磁盘仅剩约 2 Gi，避免撑爆；本机 7 份日滚动由 `backup-topems.sh` 负责）；落盘用 `.part` + `mv` 原子写；归档前本机 `pg_restore --list` 验证、归档后比对 sha256 并再次验证远端副本可读。

**手工操作**：
```bash
~/topems/backup-offsite.sh --check     # 凭证/挂载/容量
~/topems/backup-offsite.sh             # 立即归档最新一份
~/topems/backup-offsite.sh --verify    # 校验远端全部归档
launchctl kickstart -k gui/$(id -u)/com.topems.backup-offsite
```

**季度恢复演练**（不动生产库）：
```bash
createdb -h 127.0.0.1 -U xingzhai topems_drill_restore
pg_restore -h 127.0.0.1 -U xingzhai -d topems_drill_restore --no-owner 远端最新dump
psql -h 127.0.0.1 -U xingzhai -d topems_drill_restore -c "select count(*) from iam.users;"
dropdb -h 127.0.0.1 -U xingzhai topems_drill_restore
```

**实测记录**：2026-11-18 首次归档成功 — `topems_prod-20261118-030004.dump`（10 MB，sha256 `4d6810cf…2593`），远端 `share/topems-archive/` 已落地，`--verify` 回读可读；归档后自动卸载，无残留挂载。目标机剩余空间 1.9 Gi，按 26 份保留上限约占用 280 MB。

---

## 7. 整机备份方案（Time Machine，2026-11-18 勘察 + 待决策）

### 7.1 现状勘察

| 项目 | 实测 |
|---|---|
| Time Machine 目标 | 勘察时未配置（`tmutil destinationinfo` → No destinations）；2026-11-18 曾配置 MBP 的 `TOPEMS-TM`（§7.6）；**2026-11-19 已取消该目的地并删除其备份数据（§7.8），当前回到 No destinations** |
| 本地 APFS 快照 | **无**（`tmutil listlocalsnapshots /` 为空） |
| 外置盘 | **无**（`/Volumes` 仅 Macintosh HD、Recovery；无 USB/雷雳存储） |
| 生产机数据量 | 107 GiB / 228 GiB，可用 98 GiB |
| MBP（`share` 共享） | 47 GiB 总，**可用 1.9 GiB** |

结论：整机级恢复能力当前是**零**——只有数据库 dump + 配置快照，系统、brew 环境、nginx 证书、密钥、二进制一旦丢，只能手工重建。

### 7.2 方案对比

| 方案 | 介质 | 容量门槛 | 优点 | 代价/风险 | 结论 |
|---|---|---|---|---|---|
| **A. 外置 SSD（推荐）** | USB-C 1 TB，APFS（GUID） | ≥ 200 GiB | 快（USB 3.2 约 400–600 MB/s）、独立、可离线/异地携带、恢复可直接挂载 | 采购约 600–900 元 | **首选主力** |
| B. TM 到 MBP（SMB） | 现有 `share` 共享 | ≥ 150 GiB 空闲（建议 2× 数据量） | 零硬件 | 需先清出 45 GiB+；笔记本睡眠/合盖断连；Wi-Fi 抖动下稀疏包易损；首次全量极慢 | 仅作第二副本，不作主力 |
| C. 云备份（B2/Backblaze 等） | 公网 | 上行带宽 | 天然异地，防火/防盗/防勒索 | 首次上传 107 GiB 需数天；按月计费 | 长期补充 |
| D. 配置快照（已落地） | MBP 共享 | 几 MB | 覆盖最痛的证书/密钥/plist/nginx/配置 | 不含数据文件 | **已执行**（§7.4） |

### 7.3 必须守住的三条原则

1. **TM 不能替代 `pg_dump`**：PostgreSQL 运行中数据文件持续写入，TM 的文件级快照对数据库是不一致的。数据库一致性继续由每日 dump + 季度恢复演练负责。
2. **排除清单**（避免把 4.1 GiB 仓库里可重建的部分反复搬运）：
   ```bash
   tmutil addexclusion ~/topems/target
   tmutil addexclusion ~/topems/dist
   tmutil addexclusion ~/topems/node_modules
   tmutil addexclusion ~/topems/apps/web/node_modules
   tmutil addexclusion ~/topems/backups        # 已有离站副本
   tmutil addexclusion ~/topems/backups-offsite
   tmutil addexclusion ~/.cargo
   tmutil addexclusion /opt/homebrew/var/postgresql@17   # 由 pg_dump 覆盖
   ```
3. **恢复顺序**：装系统 → `brew bundle` 还原依赖 → `pg_restore` 恢复 `topems_prod` → 从 TM/配置快照取回 `nginx.conf`、`servers/*.conf`、`com.topems.*.plist`、`.secrets/*` → 起 launchd → `smoke-prod` 验收。

### 7.4 已落地部分（无需硬件）

| 组件 | 说明 |
|---|---|
| `~/topems/backup-config.sh` | 打包 launchd plist、nginx 配置、`.secrets`/`secret`、config yaml、`_sqlx_migrations` 版本清单、系统/brew 环境信息 → `< 32 KB` tar.gz（600） |
| `com.topems.backup-config` | 每周日 03:20 生成，保留最近 8 份 |
| `backup-offsite.sh`（已扩展） | 周任务顺带把最新配置快照推到 `TOPEMS-TM/topems-archive/config/`，保留 8 份 |

实测：2026-11-18 09:38 生成 `config-snapshot-20261118-093845.tar.gz`（28 KB），09:39 已落到 MBP。

### 7.5 方案 A 执行清单（待采购后执行）

```bash
# 1) 磁盘工具格式化：APFS / GUID 分区，命名 TOPEMS-TM
# 2) 设定目标（插上即用）
sudo tmutil setdestination -ap /Volumes/TOPEMS-TM
# 3) 排除项（见 §7.3）
# 4) 首次全量 + 校验
sudo tmutil startbackup --block
tmutil latestbackup && tmutil listbackups | tail -3
# 5) 验证可恢复性：随机挑一份快照，浏览确认 /opt/homebrew/etc/nginx 与 ~/topems/bin 在列
```

**容量建议**：1 TB（107 GiB 数据 + 增量 + 历史，留 3–5 倍余量最稳）。

### 7.6 方案 B 已落地后被取消（MBP 作第二副本，2026-11-18 配置 → 2026-11-19 取消）

> **2026-11-19 状态：已取消。** 该目的地连同 64 GiB 稀疏包一并删除，当前 `tmutil destinationinfo` 为 No destinations、`AutoBackup = 0`、无本地 APFS 快照、无 `.timemachine` 挂载残留。历史配置过程保留在下方，仅作复盘。
>
> 保留项：SMB 共享 `TOPEMS-TM` 未删除，其中 `topems-archive/`（每日 `pg_dump` 归档 + 配置快照，实测 1 GiB）继续作为离机备份使用，`backup-offsite.sh` 链路不受影响。

MBP 已在主卷新建可写共享 `TOPEMS-TM`（419 GiB 总 / **185 GiB 可用**，与只读的 `xingzhai` 主目录共享、47 GiB 的 `share` 卷分开）。实测配置：

```bash
# 目标（已设定，ID 2AB457B0-B7B3-47EF-8BA5-B96550A7B64E）
tmutil destinationinfo
sudo tmutil setdestination -ap "smb://xingzhai@192.168.110.213/TOPEMS-TM"
# 注意：setdestination 需 root；本机自动化进程无「完全磁盘访问权限」会被 TCC 拦截（错误 80），必须在交互式终端执行
```

| 实测项 | 结果 |
|---|---|
| 稀疏包 | `TOPEMS-TM/星斋的Mac mini.sparsebundle` |
| 首次全量规模 | `totalBytes` 147 GiB / `totalFiles` 188.5 万（排除清单之外仍有约 40 GiB 可再排） |
| 链路吞吐 | Mac mini 有线（en0 千兆）+ MBP 5 GHz：SMB 裸写入 19.2 MB/s；Wi-Fi 2.4 GHz 时仅 3.6 MB/s |
| 排除清单 | 8 项已 `addexclusion` 并逐项 `isexcluded` 核对为 `[Excluded]` |

必须接受：MBP 合盖/睡眠即中断、Wi-Fi 抖动下稀疏包可能损坏需整份重建、首次全量在 10 Mbps 级链路下需数小时。因此它是**第二副本**，不能替代 §7.5 的外置盘，更不能替代每日 `pg_dump`。

> 2026-11-18 实测补充：当本机在跑 `cargo-nextest --workspace`（14 个 rustc 并行、load ≈ 33）时，首次全量速率骤降到 0.2 MB/s，TM 自估剩余 30 小时。结论：**整机备份期间不要在宿主机上跑全量编译**，或先把备份暂停（`tmutil stopbackup`），待编译结束再 `tmutil startbackup --auto`。

### 7.7 待决策

| # | 决策 | 影响 | 建议 |
|---|---|---|---|
| 1 | 是否采购 1 TB 外置 SSD | 决定有无整机恢复能力 | **建议买**，这是唯一能真正补上整机缺口的路 |
| 2 | 是否清 MBP 空间（≥150 GiB） | 决定能否做第二副本 | 非必需，优先级低于 1 |
| 3 | 是否上云备份 | 异地容灾 | 有外置盘后可再评估 |

### 7.8 2026-11-19 取消 TM 到 MBP 的记录

用户决定不再用 MBP 承载整机 Time Machine，执行结果：

| 项目 | 处理 |
|---|---|
| 目的地 `TOPEMS-TM`（ID `2AB457B0-B7B3-47EF-8BA5-B96550A7B64E`） | 已移除；`tmutil destinationinfo` → `No destinations configured` |
| 自动备份 | `AutoBackup = 0`，备份频率改为「手动」 |
| 备份数据 `星斋的Mac mini.sparsebundle` | 已删除（64 GiB），共享根目录仅剩 `topems-archive/` |
| 本地快照 / 挂载 | `tmutil listlocalsnapshots /` 为空；`.timemachine` 挂载 0 条 |
| SMB 共享 `TOPEMS-TM` | **保留**，`topems-archive/`（每日 dump + 配置快照，1 GiB）继续供 `backup-offsite.sh` 使用 |

执行路径注意：`tmutil removedestination` / `tmutil disable` 在 macOS 15 上要求调用进程具备**完全磁盘访问权限**，root 权限不足，会返回错误 80（本机此前多次尝试均因此失败）。配置文件 `/Library/Preferences/com.apple.TimeMachine.plist` 带 `com.apple.macl` 扩展属性，同样拒绝非授权进程读写，`defaults write` 会报 “Could not write domain”。最终通过「系统设置 → 通用 → 时间机器」界面移除，该进程具备相应授权。

结论：整机级恢复能力回到**未覆盖**状态，`§7.3` 第 1 条原则（TM 不能替代 `pg_dump`）依然成立，数据库一致性仍由每日 dump 负责；整机缺口只能靠 §7.5 的外置 SSD 补上。

### 7.9 本地 dump 链路修复（2026-11-19）

TM 取消后，每日 `pg_dump` 成为唯一的数据保护手段，因此顺带修掉了它长期存在的隐性故障。

**现象**：`com.topems.backup`（每日 03:00）长期以退出码 1 结束，2026-11-19 03:00 产出的 `topems_prod-20261119-030005.dump` 是 **0 字节**；`backup.err.log` 记录 `pg_dump: command not found` 与 `fe_sendauth: no password supplied`。

**根因**：脚本用 `pg_dump -h localhost -U xingzhai`（TCP → `scram-sha-256`），而 launchd 环境既无口令也无 `~/.pgpass`；`set -e` 下 `pg_dump` 先创建目标文件再失败，于是留下空文件。

**修复**：

| 改动 | 说明 |
|---|---|
| 连接方式 | 改为 `pg_dump -d topems_prod`（Unix socket + peer），与 `pg_hba` 的 `local all all peer` 对齐，不依赖口令 |
| 原子写入 | 先写 `<name>.partial`，`pg_restore --list` 可读 + 体积 ≥ 1 MiB 双校验通过后 `mv` 为正式文件；失败由 `trap` 清理，`backups/` 不会再出现 0 字节文件 |
| 归档守卫 | `backup-offsite.sh` 取“最新 dump”时先校验体积 ≥ 1 MiB，再验可读性，坏文件一律拒绝归档 |
| 挂载判断 | `is_mounted` 改用 inode 比对：本机 `~/topems` 与 `~/TOPEMS` 指向同一目录，`mount` 表记录哪种写法取决于挂载时传入路径，字符串比对会误判并触发 `mount error: File exists` |
| 版本库 | `backup-topems.sh` 原先被 `.git/info/exclude` 排除（历史原因：含本地口令）；现已无口令，移出排除并入库存档 |

**验证**：手工执行与 `launchctl kickstart -k gui/$(id -u)/com.topems.backup` 均成功，最新 dump `10,841,560 bytes`、`pg_restore --list` 通过、单元 `last exit code = 0`；当日 dump 已归档到 `TOPEMS-TM/topems-archive/`（10 MB）。保留策略 7 份正常轮转。

---

## 8. 局域网地址与 DHCP 静态绑定（2026-11-18）

背景：生产机此前 Wi-Fi 与以太网同时在线，地址随 DHCP 漂移（无线 `192.168.110.147` → 有线 `192.168.110.61`），文档与运维命令里的地址随之失真。定案：两台设备都在路由器上做静态绑定，此后地址长期固定。

| 设备 | 接口 | MAC | 固定地址 | 用途 |
|---|---|---|---|---|
| Mac mini（生产机） | en0 有线 | `d0:11:e5:cc:86:b7` | `192.168.110.61` | **生产主地址**（有线优先，长期固定） |
| Mac mini | en1 Wi-Fi | `9e:32:b2:e3:21:24` | `192.168.110.147` | 备用链路（有线异常时可达，不与主地址冲突） |
| MBP（离线备份仓） | Wi-Fi 5G | `f4:5c:89:8f:e2:87` | `192.168.110.213` | SMB `topems-archive`（每日 dump + 配置快照；TM 已于 2026-11-19 取消，见 §7.8） |

> 已在锐捷 EG210G-E（`192.168.110.1`，eWeb 后台 → 在线终端 → 终端行「未绑定/已绑定」→ 绑定为静态 IP）完成上述三条绑定，后台回显「配置成功」，三行状态均为**已绑定**（2026-11-18）。绑定的是各接口**当前地址**，因此 .147 现在归属无线口，有线主地址为 .61；文档与脚本一律以 **.61** 作为生产机局域网地址。

**约束**

- 生产服务全部绑定 `127.0.0.1`（8099 / 5432 / 6379 / 80 / 443），局域网地址变化**不影响**服务可用性，只影响外部访问与文档里的 ssh 命令。
- `~/topems/.secrets/smb-mbp.env` 的 `SMB_HOST` 固定 `192.168.110.213`；主机名 `xingzhaimbp.lan` **不可解析**，勿用。
- 历史文档中的 `192.168.110.115`、`192.168.3.129` 均为已停用地址，只作历史记录，不要按其执行。

---

## 附：bin 历史二进制清理（2026-11-18）

- 清理前：`~/topems/bin` 84 个条目、15 GiB（72 份 199 MB 历史二进制 + 1 个 172 MB 遗留目录）
- 策略：保留当前生产版本 `topems-server` + 最近 2 个回滚点 + `ai-docs` + `topems-server.sha256`，其余删除
- 保留：`topems-server.bak-20261116-215033`、`topems-server-86dcd78-pre-restart-20261116.bak`
- 释放：**14.7 GiB**；仓库 19 G → 4.1 G；数据盘可用 83 Gi → 98 Gi
- 清单存档：`~/topems/backups-offsite/bin-cleanup-20261118.csv`（文件名含 git commit 短哈希，需要时可从 Git 重新构建）
- 清理后校验：`/health` = healthy，PID 未变（49113），运行中的二进制路径未改
- 遗留提示：`bin/topems-server.sha256` 内记录的是 2026-11-06 旧版本哈希（`c73c0dae…`），与当前 `6acb3c4d…` 不一致，无脚本引用，需要时手工刷新

**已知环境限制（2026-11-18 实测）**：launchd 子进程在 SMB 挂载点上做目录遍历（`ls` 通配 / `find`）会被拒绝或返回空，但按精确文件名访问（`test -f`、`cp`、`pg_restore`）正常。因此：

- 归档/校验的**份数与清单一律以本机索引** `~/topems/backups-offsite/offsite-index.csv` 为准，不依赖远端目录列举；
- `--verify` 按索引逐份确认（名字精确 + 可读性），避免“遍历不到 → 误报 0 份全部可读”的假绿；
- 清理过期归档用 `ls -t` 并兜底 `|| true`，列举不可用时跳过清理、只记日志，不判失败；
- 脚本在 `set -euo pipefail` 下所有统计命令都带 `|| 默认值`，避免“空结果”被当成脚本失败。
