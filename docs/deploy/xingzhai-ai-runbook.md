# TOPEMS 部署适配任务书（xingzhai AI 执行版）

> 本文档由 airdeair 侧 AI 起草（2026-10-26），**供 xingzhai 侧 AI 助手按步骤执行**。
> 目标：把 TOPEMS 以生产形态部署到 xingzhai（macOS 宿主机）。
> 配套参考：`docs/deploy/macos-deployment.md`（人类阅读版指南）、`docs/deploy/windows-deployment.md`（同型先例）。
> 执行原则：**先检查后动手；每步验证；失败即停并记录报错全文，禁止猜测跳过；不改仓库代码；不破坏本机既有数据。**

---

## 0. 任务上下文（先完整读一遍再动手）

- **TOPEMS**：模块化单体 ERP/EMS 系统。对外唯一入口 = `topems-server` BFF（**端口 8099**），约 30 个服务适配器内嵌于单体，全仓部署以该单体为核心。
- **生产治理模型（通用模板）**：systemd（Linux 专用：`deploy/systemd/` 31 单元 + topems.target + `scripts/deploy/install.sh`）。
- **本机现状（2026-11-13 实测）**：xingzhai 生产已按 **方案 B（原生 macOS + launchd）** 落地——LaunchAgent `gui/501/com.topems.server`（KeepAlive+RunAtLoad，二进制 `/Users/xingzhai/topems/bin/topems-server`，监听 `:8099`）+ `com.topems.nginx`（brew nginx，80/443 直接 `proxy_pass http://127.0.0.1:8099`，无 upstream 块）；生产库 `topems_prod`。
- **方案 A（Linux VM + systemd）未采用**，仅保留为迁移备选；下文 §7 的方案 A 迁移步骤按备选理解。
- **仓库**：`git clone git@github.com:paulwy/TOPEMS.git`（需 SSH key 或 HTTPS PAT）。
- **约定**：下文 `<VARS>` 需要你按本机实际填写；改动端口/路径时必须全局一致并在 §8 验收清单注明。

---

## 1. 前置检查（全部通过才继续）

```bash
sw_vers                                # 要求 macOS ≥ 13
sysctl -n hw.memsize                   # 要求 ≥ 16GB
df -h /                                # 要求空闲 ≥ 100GB
which brew git cargo nginx psql        # 已装工具；缺的用 brew install 补
```

端口占用检查（记录占用者；冲突时改端口并全局替换，验收注明）：
```bash
for p in 5432 8099 80 443; do lsof -nP -iTCP:$p -sTCP:LISTEN | tail -n +2 && echo "占用 $p" || echo "空闲 $p"; done
```

PostgreSQL 版本确认（TOPEMS 兼容 16/17）：
```bash
brew list --versions | grep -i postgres || echo "需安装: brew install postgresql@16"
```

## 2. 数据库

```bash
# 若未安装
brew install postgresql@16
brew services start postgresql@16      # 常驻

# 建角色/库（密码自生成 32 位随机，记录到部署日志；勿写死在仓库）
PGPASSWORD=$(openssl rand -hex 16)
psql -h localhost -p 5432 -U $(whoami) -d postgres -c \
  "CREATE ROLE topems LOGIN PASSWORD '$PGPASSWORD';" -c "CREATE DATABASE topems OWNER topems;"
echo "$PGPASSWORD" > ~/topems/secret/pg.txt && chmod 600 ~/topems/secret/pg.txt

# pgvector（TOPEMS 迁移依赖 vector 扩展）
# 无 formula 时按仓库 docs/database/ 指引编译，或使用带扩展的 PG
```

## 3. 克隆与构建

```bash
git clone git@github.com:paulwy/TOPEMS.git ~/TOPEMS && cd ~/TOPEMS
cargo build --release -p topems-server --bin topems-server
# 首构 5-10 分钟；失败 → 读报错 → 缺系统库用 brew install（如 pkg-config/libssl 对应包）
ls -la target/release/topems-server   # 确认二进制存在
```

## 4. 初始化 schema 与迁移

```bash
# 建表/角色（已建则跳过 --create-user/--create-db）
bash scripts/deploy/setup-db.sh --host localhost --port 5432 --user topems \
  --password "$(cat ~/topems/secret/pg.txt)" --create-db

# schema 供给（基线 + 前向迁移；--init-schema 已停用，历史链不可从零重放）
bash scripts/db/provision-env.sh --env staging --db topems --skip-prod-fingerprint

# 迁移校验：必须 0 errors / 0 checksum errors
bash scripts/migration/validate.sh

# 应用迁移（按 docs/database/postgres-native-migration-20261008.md 标准流程）
# 空态核验（能执行即可，值可为 0）：
PGPASSWORD=$(cat ~/topems/secret/pg.txt) psql -h localhost -U topems -d topems -Atc "SELECT count(*) FROM core_permissions;"
```

## 5. 服务运行（launchd 适配）

以 BFF 单体为最小生产面（内嵌全部服务适配器，**不必逐服务注册**）：

```bash
mkdir -p ~/topems/logs
PGPWD=$(cat ~/topems/secret/pg.txt)   # 先算出实际值，再填入下方 plist（plist 内不执行 shell 替换）
cat > ~/Library/LaunchAgents/com.topems.server.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.topems.server</string>
  <key>ProgramArguments</key><array>
    <string>/Users/<USER>/TOPEMS/target/release/topems-server</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>DATABASE_URL</key><string>postgres://topems_prod:<实际PG密码>@localhost:5432/topems_prod</string>
  </dict>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>/Users/<USER>/topems/logs/server.out</string>
  <key>StandardErrorPath</key><string>/Users/<USER>/topems/logs/server.err</string>
</dict></plist>
PLIST
launchctl load ~/Library/LaunchAgents/com.topems.server.plist
sleep 3 && curl -s -m 5 http://127.0.0.1:8099/health && echo " <- BFF OK"
```

> 若配置管理用 `config/env/` 模板：模板内 `DATABASE_URL` 同样替换为本机连接串（密码来自 secret 文件）。
> **不要在该 plist 里设置 `BIND_ADDR`**：不设即默认监听 `127.0.0.1:8099`（进程只听回环，对外统一走 nginx）；
> 显式设 `BIND_ADDR=0.0.0.0` 会让局域网绕过 nginx 直连明文端口，务必避免。
> 其余服务（erp/finance/hrm…）**不单独启动**——单体已内嵌；确需独立服务时按 `deploy/systemd/*.service` 的 ExecStart 逐条对照写 plist。

## 6. nginx（drill 适配版）

```bash
bash scripts/gen-nginx-drill-conf.sh /opt/topems-nginx
# 生成物为 macOS 可加载 conf：已剥离 epoll/brotli/www-data，pid 用本机前缀，
# 证书为自签，80/443 直接 proxy_pass http://127.0.0.1:8099（无 upstream 块）

/opt/homebrew/bin/nginx -t -c /opt/topems-nginx/topems-drill.conf && /opt/homebrew/bin/nginx -c /opt/topems-nginx/topems-drill.conf
curl -sk -m 5 https://localhost/health && echo " <- NGINX OK"
```

## 7. 方案切换决策（方案 B 已落地；方案 A 为备选）

- **当前生产已按方案 B 运行**（launchd + brew nginx，见 §0）。如需与 Linux 生产零差异，可迁移到方案 A：
  - 建 Ubuntu 22.04 VM（systemd 完整），宿主端口转发 22/80/443/5432 → VM。
  - VM 内：`install.sh` + systemd 单元 + `deploy/nginx/topems.conf` **原样**（epoll/www-data/brotli 满足）。
  - 细节见 `docs/deploy/macos-deployment.md §2`。
- 不迁移则继续按本任务书 §2-§6 原生路径维护（B 方案）。

## 8. 验收清单（全部 ✅ 才算完成）

- [ ] `curl http://localhost:8099/health` == 200（BFF 直连）
- [ ] `curl -sk https://localhost/health` == 200（nginx → 8099 链路）
- [ ] 迁移：`scripts/migration/validate.sh` 0 errors / 0 checksum errors
- [ ] 契约 smoke：`python3 scripts/web_contract_smoke.py` 0 FAIL
- [ ] smoke-prod：`SMOKE_ADMIN=<用户> SMOKE_PASS=<密码> bash scripts/deploy/smoke-prod.sh --base http://localhost:80` 全 PASS（nginx 门户 80；BFF 直连改 `--base http://localhost:8099`；**脚本无默认口令，凭据必填**）
- [ ] 端口冲突、密码、偏离项已在 `~/topems/deploy-notes.md` 记录

## 9. 安全红线（违反即中止并向 airdeair 侧回报）

1. **禁止**删除/覆盖本机既有任何数据库、数据文件或他人配置。
2. 密码/密钥只进 `~/topems/secret/`（chmod 600），**禁止**提交仓库、写入公开日志。
3. 任何一步失败：停止，记录报错全文与环境差异，**不猜测、不跳过、不换法重试超过 2 次**。
4. **只部署，不改代码**。发现仓库 bug 或需适配改动 → 回报 airdeair 侧，由仓库侧决定。
5. 未通过 §8 验收前，不得对外宣称部署完成。

---

## 10. 部署后回报模板（写给 airdeair 侧）

> 部署执行完毕后，按下面结构输出一份回报（Markdown 代码块内为填写模板，**占位符全部替换为实测值**；密码/密钥绝不写入回报）。

```markdown
# xingzhai 部署回报（YYYY-MM-DD HH:MM）

## 1. 结论
- [ ] 部署成功（§8 验收全过）｜ [ ] 部分成功（见 §6）｜ [ ] 失败（见 §6）
- 当前形态：原生 macOS（launchd）｜ Linux VM（UTM/lima/OrbStack）｜ 其他：____

## 2. 环境事实
- macOS：`<sw_vers 输出>`；内存 `<N>GB`；磁盘空闲 `<N>GB`
- 端口占用/分配：5432 `<>`、8099 `<>`、80/443 `<>`（如有改端口，写明新值）
- PostgreSQL：`<版本>`（brew / VM 内）；pgvector：`<已装/未装/编译>`

## 3. 构建与部署
- 仓库 HEAD：`<git rev-parse HEAD>`
- 二进制：`target/release/topems-server` `<存在/大小>`
- 数据库：库 `topems_prod`、角色 `topems_prod`、迁移 validate.sh `0 errors / 0 checksum errors`（附输出行）；旧库 `topems`（65 表）不是生产
- 服务：launchd label `<com.topems.server 等>` 运行中 `是/否`；日志尾 5 行摘要
- nginx：conf `<路径>`，`/opt/homebrew/bin/nginx -t` 输出，证书 `<自签/LE/其他>`

## 4. 验证证据（§8 逐项）
- BFF health：`curl http://localhost:8099/health` → `<状态码/body>`
- nginx health：`curl -sk https://localhost/health` → `<状态码/body>`
- 契约 smoke：`<总用例数> FAIL=0`（附失败用例 ID，如有）
- smoke-prod：`<--base 参数>/<PASS 数>/<FAIL 数>`（附失败项）

## 5. 偏离清单（与任务书不一致处）
| 步骤 | 任务书要求 | 实际执行 | 原因 |
|---|---|---|---|
| §2 | 端口 5432 | `5433` | 5432 被占用（`<占用进程>`） |
| … | … | … | … |

## 6. 问题 / 风险 / 待决策
- P1（阻断验收）：____
- P2（影响使用）：____
- 待 airdeair 决策：证书签发方式、域名指向、是否切 Linux VM、DB 备份策略

## 7. 建议下一步
- ____（如：等待 airdeair 核对后开启对外访问 / 补备份定时任务 / 切 VM 方案重部署）
```

**回报出口**：文件 `~/topems/deploy-notes.md`（本机留档）+ 将上述内容发给 airdeair 侧（人工或 AI 均可）。airdeair 侧收到后核对 §4 证据、决策 §6 待决项，并把结论回填 `docs/project/go-live-checklist.md §0.3`。

---

## 11. 部署后运维：流量观测 + 版本升级（2026-10-26 追加）

> 首次部署验收（§8）通过后进入运维循环。以下任务书可直接执行；完整参考见 `docs/deploy/macos-production-ops.md` 与 `docs/deploy/release-pipeline.md`。

### 11.1 30 天流量观测（BE-08 下线候选双证之一，**部署后当天启用**）

1. 仓库同步：`cd ~/topems/repo && git fetch origin && git reset --hard origin/main`（仅拉取脚本与清单）
2. 首次观测：`bash ~/topems/repo/scripts/ops/observe-api-traffic.sh`（默认读 `~/topems/nginx/logs/access.log`，输出 `~/topems/backups/be08-observe-<日期>.md`）
3. 每 7 天复跑一次（或加入 cron/launchd），**30 天观测期后**回传最终报告给 airdeair 侧：
   - 零命中清单（可下线坐实，配合业务勾选）
   - 有命中清单（保留，复核使用场景）
4. 说明：候选清单 `scripts/ops/be08-candidates-148.txt`（148 条 = none 49 + weak 99 前端零定义面）；脚本自动逐前缀统计命中/零命中。

### 11.2 版本升级（代码更新入生产）

1. airdeair 侧用 `scripts/release/build-release.sh` 构建交付包（`topems-server-<commit>-<ts>.tar.gz` + SHA256）。
2. xingzhai 侧按 `docs/deploy/release-pipeline.md` §3 安装：校验 → 备份当前二进制为 `.prev` → 替换 → `launchctl kickstart -k gui/$(id -u)/com.topems.server` → health 探针。
3. 含新迁移时：**生产禁 sqlx migrate run**，按 §4 迁移面逐条执行 + validate.sh 校验后再启动。
4. 升级后按 §6 回报模板回传 airdeair 侧。

### 11.3 高频提醒（今日可落）

- **备份**：按 `macos-production-ops.md` §2 落地每日 03:00 pg_dump + 保留 7 份 + 每周异地（脚本/plist 模板已给）。
- **换密**：首次登录后立即执行 `~/topems/change-admin-password.sh`，完成后回报。
- **证书/外网**：随上线节奏决策（维持自签 → 对外前换受信）。

