# macOS 生产机部署指南（xingzhai）

> 适用：另一台 Mac（xingzhai）作为 TOPEMS 生产环境宿主机。
> 编制：2026-10-26 ｜ 对齐：`docs/deploy/windows-deployment.md`（同型异构平台指南）、
> `docs/deploy/nginx-prod-first-deploy-runbook.md`（nginx 首部署复核）、
> `docs/project/go-live-checklist.md §0.3`（剩余外部阻塞 1 项：生产部署三件套实跑）。

## 0. 结论先行：Mac 可以当生产机

**可以，但必须选对路径**。项目生产治理定案为 **systemd 模型**（`scripts/deploy/install.sh` / `update.sh` / `rollback.sh`，`deploy/systemd/` 31 单元 + topems.target），`deploy/docker` 已于 2026-10-08 弃用（生产数据禁入容器）。

| 路径 | 是否推荐 | 说明 |
|---|---|---|
| **A. Linux 虚拟机 + systemd**（UTM/lima/OrbStack 跑 Ubuntu VM） | ✅ **推荐（生产）** | Linux 环境原样运行 install.sh + systemd 单元 + `deploy/nginx/topems.conf`（epoll/www-data/brotli 全部满足），与真实 Linux 生产机**零差异**；等效 Windows 版 WSL2 思路的 macOS 对应 |
| **B. 原生 macOS 适配**（brew + launchd + drill conf） | ⚠️ 备选/演练 | 无 systemd → launchd 替代；nginx conf 需剥离 epoll/brotli/www-data（`scripts/gen-nginx-drill-conf.sh` 已有 macOS 适配）；与 Linux 生产存在差异，不推荐作为正式生产形态 |
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

## 2. 方案 A：Linux 虚拟机 + systemd（推荐）

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

# 2) 建库（--create-user --create-db 按需；密码按 config/env 模板）
sudo bash scripts/deploy/setup-db.sh --create-user --create-db --init-schema \
  --password '<TOPEMS_PG_PASSWORD>'

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

# 拷入 VM → 恢复（标准流程：ON_ERROR_STOP + 空态核验）
PGPASSWORD=<TOPEMS_PG_PASSWORD> psql -h localhost -p 5432 -U topems -d topems \
  -v ON_ERROR_STOP=1 -f /tmp/topems_backup.sql

# 迁移链校验（应有 0 errors / 0 checksum errors）
bash scripts/migration/validate.sh
```

### 2.6 验证（对账 go-live-checklist §0.1 门禁 + 部署三件套）

```bash
# 1) smoke-prod 层1+2（登录/健康/业务域；层2 专项 E/F/G/H 在 VM 内实跑）
bash scripts/deploy/smoke-prod.sh --base localhost:8098

# 2) nginx verify（upstream 8099 + 冒烟）
bash scripts/verify-nginx-prod.sh --conf /etc/nginx/topems.conf --base https://<xingzhai-ip> \
  --services "erp bi hrm monitor" --probe "/health"

# 3) 契约 smoke（前端契约全量实跑，0 FAIL）
python3 scripts/web_contract_smoke.py
```

> 三项全 PASS = **生产部署三件套实跑闭环**，即 go-live-checklist §0.3 项 1 解除。

## 3. 方案 B：原生 macOS 适配（备选/演练）

> 仅当 xingzhai 不便跑 VM 时使用；**与 Linux 生产存在差异，正式上线仍建议方案 A**。

```bash
# 1) brew 依赖
brew install postgresql@16 nginx
# （pgvector：brew 无官方 formula，按仓库文档编译，或用 Homebrew PG 扩展）

# 2) 构建
cargo build --release -p topems-server --bin topems-server

# 3) 数据库
# 建用户/库后运行 setup-db.sh（同 2.3 步 2）

# 4) nginx 适配（gen-nginx-drill-conf.sh 已含 macOS 适配：去 epoll/brotli/www-data、
#    pid 前缀、自签证书、upstream 统一 8099）
bash scripts/gen-nginx-drill-conf.sh /opt/topems-nginx
nginx -t -c /opt/topems-nginx/topems-drill.conf && nginx -c /opt/topems-nginx/topems-drill.conf

# 5) 服务常驻：systemd → launchd（deploy/systemd/topems-server.service 的 ExecStart
#    对应 ~/Library/LaunchAgents/com.topems.server.plist；keep-alive + RunAtLoad）
# 6) 验证同 2.6
```

**B 与 Linux 生产差异对照**：systemd（target/依赖/restart）↔ launchd（KeepAlive/LimitLoadToSessionType）；`www-data` ↔ 本机用户；`use epoll` ↔ kqueue（drill 已剥离）；`/run/nginx.pid` ↔ 本机前缀；brotli ↔ 无（drill 已剥离）；证书 ↔ 自签/Let's Encrypt。

## 4. 运维要点

| 动作 | 命令 |
|---|---|
| 更新 | `sudo bash scripts/deploy/update.sh` |
| 回滚 | `sudo bash scripts/deploy/rollback.sh` |
| 备份 | `pg_dump` 定时（cron/launchd 均可），保留 ≥ 7 天 |
| 监控 | `deploy/systemd/{prometheus,grafana}.service` 单元 + 9090/3000 端口 |
| 日志 | `journalctl -u topems-server`（VM）；原生 macOS 用 launchd stdout 重定向 |
| 迁移 | 新迁移文件应用后跑 `scripts/migration/validate.sh`（0 errors 才可发布） |

## 5. 与 Linux 生产机差异总表（方案 A 为 0 差异）

| 维度 | 方案 A（Linux VM） | 方案 B（原生 macOS） |
|---|---|---|
| install.sh / update.sh / rollback.sh | ✅ 原样 | ⚠️ 需 launchd 适配 |
| systemd 单元 + target | ✅ 原样 | ❌ launchd plist |
| nginx topems.conf（epoll/www-data/brotli） | ✅ 原样 | ❌ drill 适配 |
| smoke-prod / verify-nginx / 契约 smoke | ✅ 原样 | ✅ 原样（8099 口径） |
| 生产数据 | PostgreSQL（VM 内） | Homebrew PostgreSQL |

---

*本文档由 TOPEMS 团队维护，编制：2026-10-26。部署完成后回填 xingzhai IP、实际命令输出与验收日期，并在 `docs/project/go-live-checklist.md §0.3` 勾销对应项。*
