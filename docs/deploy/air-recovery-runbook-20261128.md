# air（MacBook Air）恢复为开发/构建机配合指引

> 编制：2026-11-28 ｜ 目标主机：`air的MacBook Air`，LAN `192.168.110.96`（mDNS `airdeair.lan`，MAC `c0:c7:db:d1:2:50`）
> 对接主机：`星斋的Mac mini`（xingzhai 开发机，LAN `.61` / `.147`）
> 定位：把这台 air 从「仅 macOS 基础在线」恢复为 **第二台开发 / release 构建机**，沿用历史 airdeair 角色（构建 arm64 交付包，不在其上跑生产）。

## 0. 现状（2026-11-28 从 xingzhai 本机只读实测）

| 项 | 实测结果 |
| --- | --- |
| 二层可达 | ping 通（TTL 64，macOS/Linux 系）；ARP 有 MAC，mDNS 名 `airdeair.lan` |
| 开放端口 | 仅 `5000`（AirTunes `AirTunes/960.13.1`，403）、`7000`（AirPlay）——苹果基础服务，**非 TOPEMS** |
| 未暴露服务 | `22` SSH、`5432` PostgreSQL、`8099` 应用、`6379` Redis 全部关闭 |
| 本机凭据 | xingzhai 侧无 `.96` 的 known_hosts / SSH 别名 / 历史连接记录，暂不能远程拉起 |
| 定性 | 机器在线、硬件未坏；**远程登录未开启、TOPEMS 运行栈未启动**，需在 air 本机先行打开通道 |

> 结论：先在 air 本机打通 SSH（阶段 1），xingzhai 接入盘点后，再按基线拉起开发/构建栈（阶段 2、3）。

## 1. 基线对齐口径（以 xingzhai 本机实测为准）

| 组件 | xingzhai 基线 | 说明 |
| --- | --- | --- |
| PostgreSQL | 18.4（Homebrew） | 扩展：`btree_gin`、`pg_trgm`、`pgcrypto`、`plpgsql`、`postgis`、`vector`(pgvector 0.8.7) |
| Homebrew | 7.0.11 | 包管理 |
| Rust | cargo 1.98.0-nightly；工具链 `nightly-2026-07-01`（components: rustfmt, clippy） | 见仓库 `rust-toolchain.toml`，rustup 自动对齐 |
| Node | v22.23.2（engines `^22`）；pnpm `>=9` | 前端 `apps/web` |
| Redis | 8.6.3 | 会话/缓存，本机 `localhost:6379` |
| Git | 远端 `git@github.com:paulwy/TOPEMS.git`，分支 `main`；身份 `topmap163` / `topmap@163.com` |

## 2. 阶段 1：在 air 本机打开远程登录并采集基线

> 以下命令**在 air 的 MacBook Air 上打开「终端」执行**。把回传项贴回给 xingzhai 侧。

### 2.1 采集身份与现有栈（只读，整段粘贴）

```bash
whoami
hostname
ipconfig getifaddr en0
sw_vers
which brew psql cargo node git redis-server pnpm
brew services list 2>/dev/null
ls -d ~/TOPEMS /Users/air/TOPEMS 2>/dev/null
```

**回传项**：登录账号（`whoami`）、主机名、IP、macOS 版本、各工具是否已安装及版本、仓库目录是否存在。

### 2.2 开启远程登录（二选一）

- 图形界面：`系统设置 → 通用 → 共享 → 远程登录`，打开开关；
- 或终端执行（需输入本机密码）：

```bash
sudo systemsetup -setremotelogin on
sudo systemsetup -getremotelogin
```

第二条应回显 `Remote Login: On`。

### 2.3 确认防火墙未拦截 22

```bash
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

- 若 `Firewall is enabled`，远程登录通常被自动放行；
- 若阶段 2 复测 22 仍不通，再临时关闭防火墙复测，或在防火墙规则中放行「远程登录 / sshd」。

### 2.4 阶段 1 完成判据

- [ ] `whoami` / IP / 系统版本已回传
- [ ] `Remote Login: On`
- [ ] 防火墙状态已回传

## 3. 阶段 2：xingzhai 侧接入并盘点（SSH 打通后）

> 以下在 **xingzhai 本机**执行；`$AIR_USER` 用 2.1 回传的账号替换，`$AIR_IP` 默认 `192.168.110.96`。

### 3.1 复测 22 连通性

```bash
ping -c 3 "$AIR_IP"
nc -z -G 4 "$AIR_IP" 22
ssh -o ConnectTimeout=5 "$AIR_USER@$AIR_IP" hostname
```

### 3.2 配置免密（推送 xingzhai 本机公钥）

xingzhai 本机公钥（`~/.ssh/id_ed25519.pub`）：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMgEknAUTy1JtOwXem8DhXlGKD6m7TCqcMDIO7PnuM9/ paulwy@users.noreply.github.com
```

首次经密码登录后写入 authorized_keys（在 xingzhai 侧执行）：

```bash
ssh "$AIR_USER@$AIR_IP" 'mkdir -p ~/.ssh && chmod 700 ~/.ssh'
cat ~/.ssh/id_ed25519.pub | ssh "$AIR_USER@$AIR_IP" 'cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
ssh "$AIR_USER@$AIR_IP" 'hostname && whoami'   # 不再要求密码即成功
```

### 3.3 远端栈盘点（只读）

```bash
ssh "$AIR_USER@$AIR_IP" 'echo "--- arch ---"; uname -m; echo "--- brew ---"; brew --version 2>/dev/null; echo "--- pg ---"; psql --version 2>/dev/null; echo "--- rust ---"; cargo --version 2>/dev/null; rustc --version 2>/dev/null; echo "--- node ---"; node --version 2>/dev/null; pnpm --version 2>/dev/null; echo "--- redis ---"; redis-server --version 2>/dev/null; echo "--- services ---"; brew services list 2>/dev/null'
```

## 4. 阶段 3：拉起开发 / 构建栈（按盘点补缺）

> 在 air 本机执行；缺失组件才装，已装则对齐版本。

### 4.1 基础工具链

```bash
# Homebrew（若无）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# PostgreSQL 18 + 扩展 + Redis
brew install postgresql@18 redis
brew services start postgresql@18
brew services start redis

# pgvector（vector 扩展，PG18 对应 0.8.7；postgis 走 brew）
brew install postgis
# pgvector 若 brew 未提供对应版本，按 docs/deploy/production-execution-checklist.md §2.4 编译安装

# Rust（rustup，工具链由仓库 rust-toolchain.toml 自动对齐 nightly-2026-07-01）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Node 22 + pnpm 9（推荐 nvm / brew）
brew install node@22 pnpm
```

### 4.2 拉取仓库

```bash
mkdir -p ~/TOPEMS && cd ~/TOPEMS
git clone git@github.com:paulwy/TOPEMS.git .
git config user.name "topmap163"
git config user.email "topmap@163.com"
git fetch origin && git checkout main && git pull --ff-only origin main
```

> Git 首次走 SSH 需把 air 的公钥登记到 GitHub 账号；或先用 HTTPS 克隆再切换。

### 4.3 供给开发库（dev 环境）

```bash
# 基线供给：建库 + 迁移重放 + L1 目录基线（角色/字典/部门/岗位/系统设置）
bash scripts/db/provision-env.sh --env dev
# 如需初始管理员，显式加 --with-admin（dev 环境按需）
```

### 4.4 起开发服务并验证

```bash
# 后端（按仓库既有本地启动链路）
bash scripts/start-local.sh        # 或 scripts/deploy.sh 本地全量启停

# 前端（apps/web）
cd apps/web && pnpm install && pnpm dev
```

验证判据：后端健康探针 200、`/users/me` 回显 roles/permissions 正确；前端页面可登录、菜单/权限与目录基线一致。

### 4.5 构建机职责（release 交付包）

air 作为构建机产出 arm64 release 包，供生产机安装（生产机不构建）：

```bash
cd ~/TOPEMS
./scripts/release/build-release.sh   # 产物 topems-server-<version>-<ts>.tar.gz + .sha256 + VERSION
```

流程与口径见 `docs/deploy/release-pipeline.md`。

## 5. 禁区与注意事项

- **air 是开发/构建机，不是生产机**：不在其上承载真实业务数据；生产库 `topems_prod` 口径以 xingzhai / 远端 .115 为准。
- 凭据（DSN、口令、令牌、SSH 私钥）**不写明文进仓库 / 脚本 / 日志**；远端凭据走 SSH 密钥或本机钥匙串。
- 不在 air 上执行 `sqlx migrate run` 直推生产 DDL；迁移走仓库既有双轨治理与门禁。
- 演示 / 演练 / 测试夹具种子（`seed_demo_*`、`seed_w13_*`、`database/test/iam_test_data.sql`）**禁止在任何类生产环境播入**。
- 阶段 3 安装/起服过程中若出现版本冲突（PG 扩展、Rust nightly、Node 大版本），先停手回报，不强行覆盖。

## 6. 待 air 回传清单

- [ ] 登录账号（`whoami`）、主机名、当前 IP
- [ ] macOS 版本（`sw_vers`）
- [ ] 已有工具链版本：brew / psql / cargo / rustc / node / pnpm / redis-server
- [ ] `~/TOPEMS`（或 `/Users/air/TOPEMS`）仓库是否已存在、所在路径
- [ ] 远程登录已开启（`Remote Login: On`）
- [ ] 防火墙状态

## 7. 附：未决/待确认项

- air 当前登录账号名是否仍为 `air`（历史目录 `/Users/air`）；若不同，阶段 2/3 路径按实际账号调整。
- air 是否需要保留历史库 / 旧快照（`/Users/air/topems-db-snapshots/`）；恢复前先盘点是否有需导出的历史数据，再决定是否清空重建。
- 远端生产机 `.115`（`xingzhai@192.168.110.115`）当前二层不可达，与本机恢复无关，待其网络/主机恢复后另走部署通道。
