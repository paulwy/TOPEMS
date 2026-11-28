# air（MacBook Air）开发/部署机接入与盘点指引（v2 实测修订）

> 编制：2026-11-28 ｜ 目标主机：`air的MacBook Air`，LAN `192.168.110.96`（mDNS `airdeAir.lan`，MAC `c0:c7:db:d1:2:50`，arm64，macOS 26.6.2）
> 对接主机：`星斋的Mac mini`（xingzhai 开发机，LAN `.61` / `.147`）
> 定位（2026-11-28 角色拍板）：**air = 开发 + 部署机**——第二台开发机 + release 交付包构建/交付。生产机与生产库宿主为 **xingzhai（Mac mini）**；air **不跑生产实例、不存生产库与生产数据、不挂生产常驻服务**。出包经 `release-pipeline.md` 交付 xingzhai 安装。
>
> **v2 修订依据**：air 本机回传报告 `air-recovery-report-20261128.md` + xingzhai 侧 SSH 实测复核（2026-11-28）。
> **前提纠正**：air 不是「仅 macOS 基础在线的空白机」，而是**正在运行中的完整开发机**——PG18 + Redis 已起、`topems-server` 在 `127.0.0.1:8099` 跑（health 200）、仓库完整且 GitHub SSH 已通。22 不通的根因是 **Remote Login 未开启 + 应用服务只绑 `127.0.0.1`**，**不是 TOPEMS 栈未启动**。

## 0. 现状（v2 实测口径）

| 项 | 实测结果 |
| --- | --- |
| 二层可达 | ping 通；ARP 有 MAC；mDNS `airdeAir.lan`（大小写不敏感） |
| SSH 22 | **已开通并端到端验证通过**；sshd 由 launchd 套接字激活（`lsof -iTCP:22` 无常驻进程属正常） |
| 应用服务 | `5432` PG、`6379` Redis、`8099` 后端均只绑 `127.0.0.1`，外部扫描不可见——**属预期，不要为了探测而开 `0.0.0.0`** |
| 后端运行态 | PID 15580，`./target/release/topems-server`，`127.0.0.1:8099` LISTEN，`/health` **200** |
| 仓库 | `/Users/air/TOPEMS` 完整；远端 `git@github.com:paulwy/TOPEMS.git`，GitHub SSH 认证 `Hi paulwy!` |
| 防火墙 | 关闭（`State = 0`），不拦 22 |

## 1. 工具链基线对照（air 实测 vs xingzhai 基线）

| 组件 | xingzhai 基线 | air 实测 | 判定 |
| --- | --- | --- | --- |
| Homebrew | 7.0.11 | 7.0.15 | ✅ 小版本更新，无冲突 |
| PostgreSQL | 18.4（Homebrew） | 18.4（Homebrew） | ✅ 一致 |
| PG 扩展 | btree_gin / pg_trgm / pgcrypto / plpgsql / postgis / vector 0.8.7 | 同左（含 pgvector 0.8.7） | ✅ 完全一致 |
| Redis | 8.6.3 | 8.8.0 | ✅ 小版本更新，无冲突 |
| Rust | cargo 1.98.0-nightly；`nightly-2026-07-01`（rustfmt/clippy） | cargo/rustc **1.95.0（Homebrew），未装 rustup** | ⚠️ 偏差，见 §4.1 |
| Node | v22.23.2（engines `^22`）；pnpm `>=9` | node **v20.20.2**（另装 node 26.0.0）；pnpm 10.34.5 | ⚠️ 偏差，见 §4.2 |
| Git | 2.50.1，身份 `topmap163` / `topmap@163.com` | 2.50.1，远端一致，SSH 认证通过 | ✅ |

> 非交互 SSH 的 `PATH` 不含 Homebrew，远程跑 `brew/psql/node/pnpm` 前先 `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"`。

## 2. 阶段 1：air 本机打开远程登录 —— ✅ 已完成

完成判据（身份/系统回传、远程登录开启、防火墙状态）三项均已满足；xingzhai 公钥已写入 `~/.ssh/authorized_keys`（目录 700、密钥 600）。

### 2.1 macOS 26 开启 SSH 的可用做法（`systemsetup` 走不通，勿反复试）

`sudo systemsetup -setremotelogin on` 在 macOS 26 受 TCC 限制，即使 sudo 密码正确也报：

```
setremotelogin: Turning Remote Login on or off requires Full Disk Access privileges. (1)
```

这是给调用方授予「完全磁盘访问权限」的问题，不是普通权限不足。无需 FDA 的可用做法（已在 air 本机执行成功）：

```bash
sudo launchctl enable system/com.openssh.sshd
sudo ssh-keygen -A                                   # 生成主机密钥
sudo launchctl bootstrap system /System/Library/LaunchDaemons/ssh.plist
```

验证：`nc -z 192.168.110.96 22` 通；`nc -w 2 127.0.0.1 22` 返回 `SSH-2.0-OpenSSH_10.3`。

## 3. 阶段 2：xingzhai 侧免密接入 —— ✅ 已完成

### 3.1 接入命令（本机执行）

```bash
ssh air@192.168.110.96 'hostname && whoami && uname -m && sw_vers -productVersion'
# 实测回显：airdeAir.lan / air / arm64 / 26.6.2（免密，无密码交互）
```

### 3.2 运行态复核（已通过）

```bash
ssh air@192.168.110.96 'export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"; \
  psql -d topems -tAc "select count(*) from information_schema.tables where table_schema='"'"'public'"'"'";'
# 回 188（public schema 表数）

curl -s -o /dev/null -w "%{http_code}\n" 127.0.0.1:8099/health   # 在 air 本机或隧道内，回 200
```

### 3.3 跨机访问 air 服务：走 SSH 隧道，不开对外端口

服务只绑 `127.0.0.1`，需要从 xingzhai 访问时建立本地隧道：

```bash
ssh -N -L 8099:127.0.0.1:8099 -L 5432:127.0.0.1:5432 air@192.168.110.96
```

## 4. 阶段 3：存量保留与三项偏差决策（**不重装、不重建、不切分支**）

> v2 纠正：air 组件全部在位，**阶段 3 不再是「拉起/安装栈」**。下列三项偏差先拍板再动；在决策前，air 维持现状运行。

### 4.1 Rust 工具链（偏差：stable 1.95 vs 仓库 nightly-2026-07-01）

- 现状：air 用 Homebrew stable 1.95 在构建；`target/` 占 **103 GiB** 产物；未装 rustup。
- 风险：一旦装 rustup，`rust-toolchain.toml` 会强制切 nightly，stable 产物大概率大面积失效并触发长时间全量重编。
- **决策口径**：暂不切。确遇 nightly-only 特性再切；切之前先备份/清 `target`，并确认可接受重编成本。可给 rustup 指定独立目录，避免抢占默认 cargo。

### 4.2 Node 大版本（偏差：node@20 vs engines `^22`）

- 现状：默认 `node` 指 node@20.20.2；依赖已装、release 包可产出，暂未暴露故障。
- **决策口径**：暂不全局改装。确需前端构建一致性校验时，`brew install node@22`，**只在项目内切版本，不改全局软链**。

### 4.3 仓库与现有库：禁止照抄「切分支 / 重建库」动作

air 仓库当前在 `fix/web-follow-light-contrast` 分支（跟踪同名远端），工作区 **668 条未提交改动**；相对 `origin/main`：**behind 302 / ahead 22**。

- **禁止** `git checkout main && git pull --ff-only`：工作区有大量未提交改动，切分支会直接破坏进行中的工作。切分支前必须先 `git status --porcelain` 确认为空，或先把在途改动落盘/暂存。
- **禁止** 在未确认现有数据保留需求前执行 `bash scripts/db/provision-env.sh --env dev`：该脚本属**重建**动作，会覆盖现有 `topems` 库（188 张表）。
- air 上无 `topems_prod` 库（符合开发机定位）；主库 `topems` 的去留/导出先盘点再定。

### 4.4 部署机职责：构建 release 交付包并交付 xingzhai（决策后再跑）

air 的部署职责是**出包 + 交付**，不在本机安装/运行生产实例：

```bash
cd ~/TOPEMS
./scripts/release/build-release.sh   # 产物 topems-server-<version>-<ts>.tar.gz + .sha256 + VERSION
```

包经 rsync/scp 交付 xingzhai，由 xingzhai 侧按 `release-pipeline.md` 校验、备份、替换与重启；air 不直接向生产库写数据、不触发生产迁移。流程口径见 `docs/deploy/release-pipeline.md`。

## 5. 禁区与注意事项

- **air 是开发/部署机，不是生产机**：不承载真实业务数据；生产库、生产实例、生产常驻服务只存在于 xingzhai。air 上禁止出现 `*_prod` 库、生产 launchd 单元或指向生产 DSN 的实例。
- 服务保持 `127.0.0.1` 绑定；跨机访问只走 §3.3 SSH 隧道，不把 PG/Redis/后端暴露到 LAN。
- 凭据（DSN、口令、令牌、SSH 私钥）不写明文进仓库 / 脚本 / 日志；远端凭据走 SSH 密钥或本机钥匙串。
- 不在 air 上 `sqlx migrate run` 直推生产 DDL；迁移走仓库既有双轨治理与门禁。
- 演示 / 演练 / 测试夹具种子（`seed_demo_*`、`seed_w13_*`、`database/test/iam_test_data.sql`）禁止在任何类生产环境播入。
- 版本冲突（PG 扩展、Rust nightly、Node 大版本）先停手回报，不强行覆盖。

## 6. 实测盘点留档（2026-11-28）

### 6.1 数据库（PG 超级用户 `air`，socket `/tmp`）

主库：

- `topems`：public schema **188** 张表，当前在役开发库。

历史残留库（48 个，均为验证 / 演练 / 临时 / 冒烟留档，**另案批次清理，本轮不动**）：

- `*_canonical_tmp`：`analytics / communication / crm / gis / integration / mes / mobile / pdm / pm / rd / srm / wms` 等模块临时库
- `*_verify` / `*_reh*` / `*_drill*`：B 批、W7、WMS RLS 演练与验证库
- `*_sqlx_scratch`、`*_conn_bench`、`*_prepare`、`*_init_check`、`topems_test*`、`topems_web_smoke`、`topems_prodlite` 等

### 6.2 历史快照目录

- `~/topems-db-snapshots/20261115-step2/`（约 956K，B1–B10 分批 DDL/数据留档）。体积小、保留无害；是否归档随历史库清理批次一并定。

### 6.3 仓库水位

- 分支 `fix/web-follow-light-contrast`；工作区未提交 **668** 条；`origin/main` behind **302** / ahead **22**；最新提交 `f9586af2e test(search): 冒烟脚本补供应商列表接口字段断言`。

## 7. 待决策 / 未决项

1. **Rust nightly 切换**：是否在 air 装 rustup 并对齐 `nightly-2026-07-01`；需先评估 103 GiB `target` 重编成本（§4.1）。
2. **Node 22 对齐**：是否项目内引入 node@22，不改全局软链（§4.2）。
3. **air 在途分支处置**：`fix/web-follow-light-contrast` 的 668 条改动如何落盘（提交 / 暂存 / 另开分支），由该线负责人确认后再决定是否回 main。
4. **历史库与快照清理**：48 个残留库 + `20261115-step2` 快照纳入专门清理批次（#125），走只读盘点 → 备份 → 断言 → 回收流程。
5. **角色边界确认**：复核 air 上无 `*_prod` 库、无生产常驻 launchd 单元、无生产 DSN 实例；后续出包/交付只走 `release-pipeline.md` 到 xingzhai。
6. 远端旧机 `.115`（`xingzhai@192.168.110.115`）已按角色定案**退役**，不再作为生产/部署/清理目标；其历史数据待物理确认后另作下线处置，与 air 恢复无关。
