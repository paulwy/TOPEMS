# Windows 部署指南（WSL2 + systemd）

> 2026-10-08 定案：Windows 部署采用 **WSL2（Ubuntu）+ systemd + 现有部署脚本**——
> 复用已验证的 install/update/rollback 体系（容器内实跑 EXIT=0，19 服务 running），
> 避免重写部署逻辑。本指南供实际部署时逐步照做。
> ⚠️ **状态**：方案已定，WSL2 实跑未执行——本指南为计划文档，执行时按实况校正。

## 1. 方案概述

| 项 | 值 |
|---|---|
| 部署环境 | WSL2（Ubuntu LTS）内 systemd |
| 数据库 | WSL 内 PostgreSQL 18 + pgvector + Redis（与脚本/迁移账本同环境） |
| 服务 | 现有 `scripts/deploy/install.sh` / `update.sh` / `rollback.sh`（systemd 模型） |
| 连接端口 | PG `5432`（WSL 内）；对外暴露按 §7 转发 |
| 数据来源 | 本机备份 `backups/*.sql`（已验证可恢复） |

**为什么 WSL2 而非原生 Windows 服务**：部署脚本体系（systemd 模型）已验证；WSL2 完整支持 systemd，
脚本几乎原样复用。原生方案（NSSM + PowerShell 重写）工作量高一个量级，仅当 WSL2 被环境拒绝时选用（见 §9 备选）。

## 2. 前置条件

- Windows 11 22H2+ 或 Windows Server 2022+（systemd 完整支持；Win10 需手动启用 systemd，见 §8.3）
- 管理员权限（WSL 安装、端口转发）
- 仓库 clone（`git clone git@github.com:paulwy/TOPEMS.git`）

## 3. WSL2 + Ubuntu 安装

```powershell
# Windows PowerShell（管理员）
wsl --install -d Ubuntu
# 重启后完成初始化（设置 Linux 用户名/密码）
```

启用 systemd（WSL 内）：
```bash
# /etc/wsl.conf 追加
[boot]
systemd=true
```
```powershell
# Windows 侧重启 WSL
wsl --shutdown
```

验证：`systemctl is-system-running` 应返回 `running`/`degraded`（systemd 可用）。

## 4. WSL 内环境搭建（Ubuntu）

```bash
# 基础依赖
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev \
  postgresql-16 postgresql-contrib curl git

# Rust 工具链（若需 WSL 内编译；也可 Windows 交叉编译后拷贝二进制）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# pgvector（PG16 版；若装 PG18 则用对应分支编译）
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector && make && sudo make install
```

> ⚠️ **版本注意**：生产基线 PG18 + pgvector 0.8.7。Ubuntu 默认 apt 是 PG16——
> 若需与生产完全一致，用 PGDG 源装 PG18（`apt.postgresql.org`），并编译对应 pgvector。

### Redis
```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

## 5. 数据迁移（备份恢复）

```bash
# 1) 将本机备份拷入 WSL（Windows 盘挂载在 /mnt/c）
cp /mnt/c/Users/<用户名>/topems_backup.sql /tmp/  # 或用现有 backups/*.sql

# 2) 建用户/库
sudo -u postgres psql -c "CREATE USER topems WITH PASSWORD 'topems' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE topems OWNER topems;"

# 3) 恢复（标准流程：ON_ERROR_STOP + 空态核验——见 docs/database/postgres-native-migration-20261008.md §标准恢复流程）
PGPASSWORD=<TOPEMS_PG_PASSWORD> psql -h localhost -p 5432 -U topems -d topems -v ON_ERROR_STOP=1 -f /tmp/topems_backup.sql

# 4) 验证
PGPASSWORD=<TOPEMS_PG_PASSWORD> psql -h localhost -p 5432 -U topems -d topems -At -c "SELECT count(*) FROM core_permissions;"
```

## 6. 部署执行（现有脚本）

```bash
# 进入仓库
cd ~/TOPEMS

# 安装（systemd 服务注册；如遇 ROOT 检查，部署用户用 sudo 或按脚本 SKIP_ROOT_CHECK 处理）
sudo bash scripts/deploy/install.sh

# 服务状态
systemctl list-units 'topems*' --no-pager
# 更新 / 回滚
sudo bash scripts/deploy/update.sh
sudo bash scripts/deploy/rollback.sh   # PGPORT 默认 5432，直连 WSL 内 PG
```

> 脚本引用 `config/env/` 模板（install.sh:250 已修复）；部署前按环境填写数据库连接（localhost:5432）。

## 7. Windows 开机自启 + 对外暴露

### 7.1 开机自启（WSL 不随 Windows 自动启动 → 任务计划程序）

```powershell
# 任务计划程序 → 创建任务：
# 触发器：开机时；操作：启动程序
# 程序: wsl.exe  参数: -d Ubuntu -u root -- systemctl daemon-reload && systemctl start topems.target
# 勾选"使用最高权限运行"
```

> 若用 `wsl --shutdown` 后需手动起：`wsl -d Ubuntu` 即拉起。

### 7.2 对外暴露（WSL2 NAT → portproxy）

```powershell
# 查询 WSL IP
wsl -d Ubuntu -- hostname -I   # 例 172.23.x.x

# Windows 侧端口转发（示例取本地单体入口 8099；按实际服务端口调整，8080 仅 docker/saas 网关）
netsh interface portproxy add v4tov4 listenport=8099 listenaddress=0.0.0.0 connectport=8099 connectaddress=<WSL_IP>
netsh interface portproxy show all
```

> **Win11 23H2+ 可选**：WSL `mirrored` 网络模式（`.wslconfig` 设 `networkingMode=mirrored`）——
> WSL 与 Windows 共享 IP，外部直连 Windows IP:端口即可，免 portproxy。
> ⚠️ 防火墙需放行对应端口。

## 8. 兼容性注意（与 macOS/Linux 的差异）

| 项 | 说明 |
|---|---|
| 脚本路径 | 脚本设计 Linux/macOS 双平台（`/opt/homebrew` 为注释示例）——WSL 内走 Linux 路径，无硬编码冲突 |
| systemctl | WSL2 完整支持（`/etc/wsl.conf` 启用）——install/update/rollback 原样可用 |
| 数据库 | 装 WSL 内 PG（非 Windows 原生）——脚本 psql/pg_dump 直连一致 |
| 网络 | NAT + portproxy（或 mirrored）；`localhost` 在 Windows 侧可直连 WSL 服务 |
| 文件系统 | WSL 内 Linux 文件系统性能佳；跨 /mnt/c 操作（备份）慢——大文件用 Linux 侧暂存 |
| Win10 | systemd 需手动启用（WSL 老版本 + `/etc/wsl.conf`；若不可用则走 §9 备选） |

## 9. 备选方案（WSL2 不可用时）

**原生 Windows 服务（NSSM）**：仅当 WSL2 被环境拒绝时选用。
- Rust 二进制 Windows 编译（`cargo build --release --target x86_64-pc-windows-msvc`）
- 服务注册：`nssm install topems-server C:\path\topems-server.exe`（或 `sc create`）
- 数据库：Windows 原生 PostgreSQL 安装包 + pgvector Windows 版（编译或用 EDB 安装器）
- **代价**：update/rollback 需 PowerShell 重写；部署脚本体系不复用

## 10. 备份与回滚（Windows 侧）

```bash
# WSL 内备份到 Windows 盘
sudo -u postgres pg_dump -Fc topems > /mnt/c/topems_backup/$(date +%Y%m%d_%H%M%S).sql

# 回滚：现有 rollback.sh（PSQL 直连 WSL 内 PG）
sudo bash scripts/deploy/rollback.sh
```

## 11. 相关文档

- `docs/deploy/container-strategy.md` — 容器策略（Windows 部署同样适用"生产禁容器"）
- `docs/database/postgres-native-migration-20261008.md` — 数据迁移/备份/标准恢复流程
- `docs/database/database-primary-instance.md` — 数据库口径（§7 生产/开发双库）
- `docs/developer/backend/environment-setup.md` — 环境搭建（Linux 分支）
