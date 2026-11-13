# macOS 生产机部署指南（xingzhai）

> 适用：另一台 Mac（xingzhai）作为 TOPEMS 生产环境宿主机。
> 编制：2026-10-26 ｜ 对齐：`docs/deploy/windows-deployment.md`（同型异构平台指南）、
> `docs/deploy/nginx-prod-first-deploy-runbook.md`（nginx 首部署复核）、
> `docs/project/go-live-checklist.md §0.3`（剩余外部阻塞 1 项：生产部署三件套实跑）。

## 0. 结论先行：Mac 可以当生产机（当前已采用方案 B）

**当前生产实际走方案 B（原生 macOS + launchd）**：2026-10-26 起 xingzhai 机以 LaunchAgent `com.topems.server`（KeepAlive=true、RunAtLoad=true）运行 `/Users/xingzhai/topems/bin/topems-server`（监听 `:8099`），nginx 由 LaunchAgent `com.topems.nginx` 托管，80/443 直接 `proxy_pass http://127.0.0.1:8099`（无 upstream 块）；生产库 `topems_prod`。`deploy/docker` 已于 2026-10-08 弃用（生产数据禁入容器）。

项目通用治理模型仍是 systemd（`scripts/deploy/install.sh` / `update.sh` / `rollback.sh`，`deploy/systemd/` 31 单元 + topems.target），但**本机生产未使用 systemd**——方案 A 保留为备选/迁移目标。

| 路径 | 是否推荐 | 说明 |
|---|---|---|
| **A. Linux 虚拟机 + systemd**（UTM/lima/OrbStack 跑 Ubuntu VM） | 备选（非本机现用） | Linux 环境原样运行 install.sh + systemd 单元 + `deploy/nginx/topems.conf`（epoll/www-data/brotli 全部满足），与真实 Linux 生产机**零差异**；等效 Windows 版 WSL2 思路的 macOS 对应 |
| **B. 原生 macOS 适配**（brew + launchd + brew nginx） | ✅ **本机生产（现用，2026-10-26 起）** | LaunchAgent `com.topems.server` + `com.topems.nginx`；nginx conf 剥离 epoll/brotli/www-data，80/443 直接反代 `127.0.0.1:8099` |
| **C. Docker 容器** | ❌ 不推荐 | `deploy/docker` 已弃用（2026-10-08 定案：生产数据禁入容器、Docker daemon 本机僵死史）；仅限临时验证 |

**xingzhai 作为生产机的前提**（全部满足才能算数）：常开 + 电源策略（不休眠）+ 固定内网 IP（路由器 DHCP 保留或静态）+ 22/80/443 端口在宿主机可达 + 资源 ≥ 16GB 内存 / ≥ 100GB 空闲磁盘。

---

## 1. 前置条件（在 xingzhai 上）

```bash
# 0) 确认 SSH 可接入（从 airdeair 验证）
ssh user@<xingzhai-ip>

# 1) 系统信息
sw_vers && sysctl -n machdep.cpu.brand_string hw.memsize 2>/dev/null

# 2) 磁盘（需 ≥ 100GB 空闲）
df -h /
```

## 2. 方案 A：Linux 虚拟机 + systemd（备选/迁移目标）

### 2.1 选 VM 工具（三选一，任选）

| 工具 | 安装 | 特点 |
|---|---|---|
| UTM（推荐，GUI+CLI） | `brew install --cask utm` | 免费开源，支持 systemd Ubuntu 镜像，端口转发直观 |
| lima（CLI 轻量） | `brew install lima` | 类 Docker 体验，`limactl start` 即得 systemd 虚拟机 |
| OrbStack | `brew install --cask orbstack` | 快、轻，自带 Linux 虚拟机，可跑 systemd 镜像 |

> 要点（以 UTM 为例）：创建 **Ubuntu 22.04 Server**（选"EFI + systemd"能力完整镜像），分配 **8GB+ 内存 / 4+ 核 / 40GB+ 磁盘**；网络用**共享（NAT）+ 端口转发**：宿主 22→VM 22、80→80、443→443、5432→5432（生产对外只需 80/443）。

### 2.2 VM 内环境

```bash
# Ubuntu 22.04 VM 内
sudo apt update && sudo apt install -y build-essential curl git pkg-config libssl-dev
# Rust 工具链（按仓库 README 版本）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
# PostgreSQL + pgvector（按 docs/database/postgres-native-migration-20261008.md 的 Linux 部署口径）
# Redis / RabbitMQ 等中间件按 config/env/ 模板要求安装
```

### 2.3 部署执行（Linux 原样链路）

```bash
cd ~
git clone git@github.com:paulwy/TOPEMS.git && cd TOPEMS

# 1) 构建（release）
cargo build --release -p topems-server --bin topems-server

# 2) 建库（仅建用户/库；schema 供给见下）
sudo bash scripts/deploy/setup-db.sh --create-user --create-db \
  --password '<TOPEMS_PG_PASSWORD>'

# 新环境 schema：基线 + 前向迁移（--init-schema 已停用，历史链不可从零重放）
bash scripts/db/provision-env.sh --env staging --db topems --skip-prod-fingerprint

# 3) 安装（systemd 注册；本脚本即 Linux 生产主链路）
sudo bash scripts/deploy/install.sh

# 4) 服务状态
systemctl list-units 'topems*' --no-pager
systemctl status topems-server --no-pager
```

### 2.4 nginx（Linux conf 原样）

- `deploy/nginx/topems.conf` 在 VM 内**直接可用**（Linux 环境满足 `use epoll` / `user www-data` / brotli / `/run/nginx.pid`）。
- 证书：按 conf 内路径放置（Let's Encrypt certbot 或自签）；conf 已含 80→301→443。
- 加载验证：`sudo nginx -t -c /etc/nginx/topems.conf` → `sudo systemctl reload nginx`。
- **唯一上游 = `localhost:8099`**（`server_service` upstream，P0-3 单上游口径），勿改。

### 2.5 数据迁移（airdeair → xingzhai）

参照 `docs/deploy/windows-deployment.md §5` 与 `docs/database/postgres-native-migration-20261008.md §标准恢复流程`：

```bash
# airdeair 侧：备份
PGPASSWORD=<PWD> pg_dump -h 127.0.0.1 -U topems_app -d topems -F p -f topems_backup.sql

# 拷入 VM → 恢复（标准流程：ON_ERROR_STOP + 空态核验；目标库为生产库 topems_prod）
PGPASSWORD=<TOPEMS_PG_PASSWORD> psql -h localhost -p 5432 -U topems_prod -d topems_prod \
  -v ON_ERROR_STOP=1 -f /tmp/topems_backup.sql

# 迁移链校验（应有 0 errors / 0 checksum errors）
bash scripts/migration/validate.sh
```

### 2.6 验证（对账 go-live-checklist §0.1 门禁 + 部署三件套）

```bash
# 1) smoke-prod 层1+2（登录/健康/业务域；层2 专项 E/F/G/H 在 VM 内实跑）
#    凭据无默认，必须显式提供（SMOKE_ADMIN/SMOKE_PASS 或 --user/--password）；
#    nginx 门户起后走 http://localhost:80，BFF 直连用 http://localhost:8099（生产 monolith 入口）
SMOKE_ADMIN=admin SMOKE_PASS=<TOPEMS_PASS> bash scripts/deploy/smoke-prod.sh --base http://localhost:80

# 2) nginx verify（upstream 8099 + 冒烟）
bash scripts/verify-nginx-prod.sh --conf /etc/nginx/topems.conf --base https://<xingzhai-ip> \
  --services "erp bi hrm monitor" --probe "/health"

# 3) 契约 smoke（前端契约全量实跑，0 FAIL）
#    安全边界（2026-11-06 起）：默认只打本机/测试目标，prod 必须显式授权，缺一即 exit 4。
#    下列五项在 prod 主机上缺任一项都会被 fail-closed 拒绝（拒绝发生在任何网络请求之前）：
WEB_SMOKE_ENV=prod \
ALLOW_PROD_SMOKE=1 \
PROD_SMOKE_CONFIRM="smoke-prod:$(hostname):TOPEMS" \
PROD_SMOKE_REASON="<变更单号/授权原因>" \
WEB_BFF_URL=http://localhost:8099 \
JWT_SECRET="<值，显式提供>" \
python3 scripts/web_contract_smoke.py
```

> 三项全 PASS = **生产部署三件套实跑闭环**，即 go-live-checklist §0.3 项 1 解除。

#### 2.6.1 契约冒烟门禁（`web-contract-smoke` / `mobile-contract-smoke`）

**默认行为（无需任何变量）**

- `WEB_SMOKE_ENV` 缺省为 `local`；web 目标为 `http://127.0.0.1:8099`，mobile 目标为
  `http://127.0.0.1:8070/api/mobile`（均为本机/测试服务）；
- 目标主机必须是 loopback（`127.0.0.1` / `localhost` / `::1`）；非 loopback 需 `WEB_SMOKE_ALLOW_REMOTE=1`；
- pre-commit 钩子触发条件：web 侧为 `apps/web/src/api/`、`apps/web/src/utils/apiPath.ts`、`svc/server/src/`、
  `lib/shared-service-client/src/`；mobile 侧为 `apps/mobile/src/api/`、`svc/mobile/src/`、
  `lib/shared-service-client/src/`。目标不可达/缺密钥时**明确失败并阻断提交**，不再静默 SKIP
  （旧行为会掩盖对 prod 的写入，2026-11-06 已移除）。

**prod 拒绝层（识别机制 + 绕过条件，web / mobile 相同）**

| 层 | 识别 / 条件 | 未满足时 |
| --- | --- | --- |
| 1. 仓库位 | `TOPEMS_INSTANCE=prod`，或 `DATABASE_URL` / `.env` 的库名为 `topems_prod`、`*_prod` | exit 4，即使 `WEB_SMOKE_ENV=local` 也拒绝 |
| 1b. 目标位 | loopback 目标：只读 `lsof` 取监听 PID + `ps eww` 读取该进程 `DATABASE_URL` 库名，命中 `*_prod` 即视为 prod | exit 4（零请求；不打印 DSN） |
| 2. 显式开关 | `ALLOW_PROD_SMOKE=1` | exit 4（不跳过、不降级） |
| 3. 第二确认 | `PROD_SMOKE_CONFIRM=smoke-prod:<hostname>:<仓库目录名>` + 非空 `PROD_SMOKE_REASON` | exit 4 |
| 4. 显式目标/密钥 | web 用 `WEB_BFF_URL`，mobile 用 `MOBILE_BASE_URL`；两者都必须显式 `JWT_SECRET`（prod 下禁止回落 `.env` 取密） | exit 4 / exit 3 |

- 第 1b 层是 2026-11-06 实测补上的关键一层：prod 仓库 `.env` 指向 `topems_test`，而 8099 由 launchd 以
  `DATABASE_URL=…/topems_prod` 启动；只看仓库文件会漏判，因此以目标监听进程的实际库名为准。
- 第 3 层把确认值绑定 `主机名 + 仓库目录`，换机、换目录即失效；`PROD_SMOKE_REASON` 会打印在日志首部，便于审计追溯。
- 仓库位/目标位识别**只读本地配置与进程表**，不建立连接，因此拒绝路径**零请求外发**
  （实测 `audit_logs` 前后计数一致）。
- 绕过条件 = 上述四项全部满足；`--dry-run` 例外：prod 仓库位允许零网络静态检查（不读密钥、不发请求），
  但 `WEB_SMOKE_ENV=prod` 时仍要求完整授权，避免“干跑”成为绕行口子。
- **mobile 额外约束（写库收敛）**：`prepare_data()`（直写 `mobile.mobile_users` / `iam.users` / `hrm.employees`）
  与 `pre_create()`（POST 预创建）**只在测试环境执行**；prod 目标下一律跳过，并只执行 GET 端点，
  写方法（POST/PUT/PATCH/DELETE）全部排除，退出码与 web 相同（2/3/4）。

**为什么不会误伤本地开发与 CI**

- 本地开发机：无 `TOPEMS_INSTANCE`、`DATABASE_URL` 指向 `topems` 等非 `_prod` 库 → 判定为 dev；目标监听进程的库名
  非 prod 或读不到（`unknown`）时都不触发拒绝，web 默认本机 8099、mobile 默认本机 8070，行为与改造前一致；
- CI：不设置 `WEB_SMOKE_ENV=prod`，用 `--dry-run` 做静态契约提取（退出码 0、零网络）；无服务时 `lsof` 无结果
  （目标位 `unknown`），普通跑法会在 2 秒内以 exit 3 明确报“目标不可达”而非挂死；无密钥时 exit 3 明确报
  “缺少 JWT_SECRET”，并提示改用 `--dry-run`。

**误用后果**

- 在 prod 仓库直接提交（未加授权）→ 钩子 exit 4 阻断提交，不产生任何 prod 写入；
- 漏配 `ALLOW_PROD_SMOKE` / `PROD_SMOKE_CONFIRM` / `PROD_SMOKE_REASON` → 一律 fail-closed 并打印期望值；
- mobile 若误用测试环境变量打 prod，第 1b 层会在建立连接前拦截；授权后也只会跑 GET，不会写库；
- 强行 `--no-verify` 提交绕开本钩子属违规操作，需在变更单登记并复核；本门禁不承诺拦截 `--no-verify`。

## 3. 方案 B：原生 macOS 适配（当前生产）

> 2026-10-26 起 xingzhai 已按本方案落地并作为生产运行；方案 A 保留为迁移备选。B 与 Linux 模板的差异见 §5。

```bash
# 1) brew 依赖
brew install postgresql@16 nginx
# （pgvector：brew 无官方 formula，按仓库文档编译，或用 Homebrew PG 扩展）

# 2) 构建
cargo build --release -p topems-server --bin topems-server

# 当前生产实际：brew nginx 默认配置 /opt/homebrew/etc/nginx/nginx.conf
# （include servers/topems.conf、servers/topems-ssl.conf；80/443 直接 proxy_pass
#   http://127.0.0.1:8099，无 upstream 块）。以下 drill conf 为演练/备用口径。

# 3) 数据库
# 建用户/库后运行 setup-db.sh（同 2.3 步 2；生产库名 topems_prod）

# 4) nginx 适配（gen-nginx-drill-conf.sh 已含 macOS 适配：去 epoll/brotli/www-data、
#    pid 前缀、自签证书、直连 8099）
bash scripts/gen-nginx-drill-conf.sh /opt/topems-nginx
/opt/homebrew/bin/nginx -t -c /opt/topems-nginx/topems-drill.conf && /opt/homebrew/bin/nginx -c /opt/topems-nginx/topems-drill.conf

# 5) 服务常驻：systemd → launchd（deploy/systemd/topems-server.service 的 ExecStart
#    对应 ~/Library/LaunchAgents/com.topems.server.plist；keep-alive + RunAtLoad）
# 6) 验证同 2.6
```

**B 与 Linux 模板差异对照**：systemd（target/依赖/restart）↔ launchd（KeepAlive/LimitLoadToSessionType）；`www-data` ↔ 本机用户；`use epoll` ↔ kqueue（drill 已剥离）；`/run/nginx.pid` ↔ 本机前缀；brotli ↔ 无（drill 已剥离）；证书 ↔ 自签/Let's Encrypt。

## 4. 运维要点

| 动作 | 命令 |
|---|---|
| 更新 | `sudo bash scripts/deploy/update.sh` |
| 回滚 | `sudo bash scripts/deploy/rollback.sh` |
| 备份 | `pg_dump` 定时（cron/launchd 均可），保留 ≥ 7 天 |
| 监控 | `deploy/systemd/{prometheus,grafana}.service` 单元 + 9090/3000 端口 |
| 日志 | `journalctl -u topems-server`（VM）；原生 macOS 用 launchd stdout 重定向 |
| 迁移 | 新迁移文件应用后跑 `scripts/migration/validate.sh`（0 errors 才可发布） |

## 5. 与 Linux 模板差异总表（方案 A 为 0 差异；方案 B 为当前生产）

| 维度 | 方案 A（Linux VM） | 方案 B（原生 macOS） |
|---|---|---|
| install.sh / update.sh / rollback.sh | ✅ 原样 | ⚠️ 需 launchd 适配 |
| systemd 单元 + target | ✅ 原样 | ❌ launchd plist |
| nginx topems.conf（epoll/www-data/brotli） | ✅ 原样 | ❌ drill 适配 |
| smoke-prod / verify-nginx / 契约 smoke | ✅ 原样 | ✅ 原样（8099 口径） |
| 生产数据 | PostgreSQL（VM 内） | Homebrew PostgreSQL |

---

*本文档由 TOPEMS 团队维护，编制：2026-10-26。部署完成后回填 xingzhai IP、实际命令输出与验收日期，并在 `docs/project/go-live-checklist.md §0.3` 勾销对应项。*
