# TOPEMS WSL Ubuntu 生产部署文档

> 部署时间：2026-10-27（14:00–14:40 CST）
> 部署目标：Windows 本机 WSL Ubuntu（26.04.1 LTS / resolute），systemd 生产部署
> 部署结果：**完成并验证通过**（29 服务运行、nginx 3000、BFF 8099、admin/admin123 首登成功）

---

## 一、部署结果总览（最终验证）

| 项目 | 状态 | 说明 |
|---|---|---|
| 服务数量 | 29 个 `topems-*.service` | 全部 loaded，28 running + 1 启动完成（topems-ai），**failed=0** |
| systemd target | `topems.target` | 已 enable，随 multi-user 启动 |
| BFF | `topems-server` :8099 | `/api/server/health` 返回 30 模块 healthy |
| nginx | :3000 → 静态前端 + `/api/*` 反代 8099 | 页面 200 / API 200 / health 200 |
| 数据库 | PG 18.6 / topems 库 | 19 schemas / 568 张表，pgvector + uuid-ossp 扩展 |
| 前端 | `/opt/topems/web`（apps/web dist） | http://localhost:3000 正常渲染 |
| 管理员首登 | admin / admin123 | 浏览器登录成功，进入工作台首页（系统管理员） |
| Windows 访问 | http://localhost:3000 | WSL2 localhost 转发可用，Windows 浏览器可打开 |
| WSL 保活 | keeper 会话（sleep 86400） | 防止 WSL2 在最后一个会话退出后自动关闭发行版 |

---

## 二、环境与版本（WSL 内）

| 组件 | 版本 | 说明 |
|---|---|---|
| Ubuntu | 26.04.1 LTS（resolute） | apt 直装生产基线 |
| PostgreSQL | 18.6（cluster 18/main，5432） | `max_connections=600`（postgresql.conf） |
| pgvector | `postgresql-18-pgvector` | 扩展 vector / uuid-ossp |
| Redis | 8.0.5 | :6379 |
| Node / npm | v22.22.1 / 9.2.0 | |
| pnpm | 9.15.9 | **不要升级 pnpm 10**（lockfile 重复键问题） |
| Rust | stable + nightly-2026-07-01（1.98.0） | 仓库 rust-toolchain 要求；`/root/.cargo/config.toml` 配 rsproxy-sparse 镜像 |
| nginx | 1.28.3 | 自写 conf（无 brotli 模块） |
| protoc | 3.21.12 | etcd-client 构建依赖 |

数据库连接（全部 29 个 svc.env 已替换）：
`postgresql://topems:topems_secret@localhost:5432/topems`（用户 topems / SUPERUSER）

---

## 三、目录与端口规范

- 仓库（WSL）：`/root/topems`，HEAD=`3f7b6dbdc`（== origin/main，"fix(finance): 发票唯一约束冲突返回 409"）
- 部署产物：`/opt/topems/`
  - `bin/`：29 个 `<svc>-service` 二进制（unified-core 以 `unified-core-service` 命名）
  - `web/`：前端 dist
  - `config/`：29 个 `<svc>.env`（LF 行尾；JWT/SESSION/SECRET 由 `openssl rand -hex 32` 生成；CORS=http://localhost:3000,http://localhost:8000）
  - `svc/<svc>/`、`logs/`
- systemd：`/etc/systemd/system/topems-*.service` × 29 + `topems.target`（WantedBy=multi-user）
- nginx：`/etc/nginx/conf.d/topems-local.conf`（listen 3000；upstream `127.0.0.1:8099`）

关键端口（env 模板权威值 + 本次修复）：
8000 unified-core｜8010 ERP｜8011 finance｜8013 AI｜8020 HRM｜8023 PM｜8029 CRM｜8030 MES｜8031 PDM｜8040 SCM｜8041 WMS｜8042 SRM｜8050 QMS｜8051 LIMS｜8052 EHS｜8053 RD｜8060 BI｜8063 portal｜8070 mobile｜8071 GIS｜8072 integration｜8090 master-data｜**8095 monitor（本次从 8000 改）**｜**8099 topems-server（BFF）**｜3000 nginx

---

## 四、部署执行摘要（步骤）

1. apt 安装：PG18 + pgvector、Redis、Node、nginx（apt 直供基线）
2. 仓库同步：WSL 内 git 直连 GitHub 失败（TLS）→ 从 Windows 侧 `tar` 拷贝（含 .git，排除 target/node_modules），`chown -R root:root`
3. Rust：rsproxy.cn 镜像装 nightly-2026-07-01；补 `protobuf-compiler`
4. `cargo build --release`：18m37s 全绿（日志 `/root/build.log`）
5. 前端：pnpm 9.15.9（npmmirror），`--frozen-lockfile` 构建成功
6. 数据库：建用户/库/扩展后，**统一执行 `bash scripts/migrate.sh run`（499 个迁移）** 建出权威表结构（19 schemas / 568 表）；**禁止以 `unified-core-service --init-db` 或服务启动自建（try_init / schema_defense）作为权威表结构来源**（自建 DDL 为过时/不完整版本，会缺列，见 §五 问题 8 与 §八 整改）
7. `install.sh` 部署 + systemd 注册 + `topems.target` enable
8. 启动验证 + 浏览器首登

---

## 五、部署中修复的问题记录（重要，供回归参考）

| # | 现象 | 根因 | 修复 |
|---|---|---|---|
| 1 | pnpm10 `ERR_PNPM_BROKEN_LOCKFILE` / pnpm9 补丁不匹配 | `pnpm-lock.yaml` 第 11/55 行 `body-parser: 1.20.9` 重复键 | `sed -i '55d'` 删除重复行，pnpm 9.15.9 `--frozen-lockfile` |
| 2 | PG `too many clients`（BFF finance 模块池超时） | 29 服务 × 20 池 + BFF 内嵌模块池逼近 100 上限 | `postgresql.conf` max_connections 100→600（重启生效） |
| 3 | GIS 服务 exit 226/NAMESPACE | unit ReadWritePaths 引用 `/opt/topems/offline_tiles` 不存在 | mkdir + chown topems |
| 4 | unified-core 203/EXEC 循环 + topems.target 连带停启 | unit ExecStart 写死 `topems-unified-core`（实际二进制 `unified-core-service`） | sed 修正 ExecStart |
| 5 | monitor 抢占 8000 | monitor.env `MONITOR_PORT=8000` 覆盖代码默认 8095，与 unified-core 抢端口 | sed 改 `MONITOR_PORT=8095` |
| 6 | `topems-ticket` fail-fast 循环：`schema "ticket" does not exist` | 全新库未建 ticket schema（init-db 不覆盖） | `CREATE SCHEMA ticket;` 后重启，服务自动建表 |
| 7 | nginx `/api/*` 502 | ①上游 localhost 解析 IPv6（改 127.0.0.1）；②WSL 会话退出导致 VM 关闭、服务冷启动未就绪 | upstream 改 127.0.0.1 + WSL keeper 保活 |
| 8 | 登录 500「内部服务器错误」（admin 无法登录） | **全新库自举下 unified-core 的 `iam.users` 建表缺列**，auth 查询引用不存在的列 → 查询失败 500：`must_change_password`、`roles`、`permissions`、`full_name_en` 四列缺失（另 iam schema 缺失） | `CREATE SCHEMA iam;` + 四条 `ALTER TABLE iam.users ADD COLUMN ...` + 重启 unified-core（自动完成 admin seed） |
| 9 | unified-core / topems-server 应用日志静默（journal 只有 systemd 消息） | 待排查（tracing 输出未进入 journal；topems-ai 等日志正常） | 已记录，见「遗留问题」 |

> 注：问题 8 为**源码缺陷**（`svc/unified-core/src/modules/iam/mod.rs` init_database 建表 SQL 与 `auth.rs` 查询列不一致；且注释称 iam.users 为历史兼容副本但 auth 仍查询），建议主开发者在代码层修复（建表 SQL 补全 4 列），生产库已用 ALTER 对齐。
>
> **补充（2026-10-28，B 类清单更正，供主开发）**：问题 8 与 B 类 8 处缺列页面（wms/srm/pm/crm）**同根因**——初始化路径自建 DDL 过时缺列（schema_defense TABLE_DEFS / try_init / --init-db 产出），服务 handler/模型代码与权威迁移 DDL 一致、**并非代码缺陷**。2026-10-28 已在 WSL 模拟生产机验证：停服 → 备份 → 建全新空库 → `scripts/migrate.sh run`（499 个迁移）→ 数据回灌 → 启动服务，原 B 类 8 处页面全部正常（含 srm 供应商 20 条列表展示）。**结论：表结构以 `database/migrations` 迁移为唯一权威；不再按原 B 类清单修改 handler/模型代码。** 详见《TOPEMS-20261028-B类清单更正说明-供主开发.md》。

---

## 六、验证记录（2026-10-27 14:39）

```
service units: 29 | running 28(+ai) | failed 0
ports: 3000/8000/8010/8020/8040/8071/8095/8099 all OK
GET http://localhost:3000/                      → 200（前端页）
GET http://localhost:3000/api/server/health     → {"status":"ok","modules":30,...}
GET http://localhost:3000/health                → 200
POST /api/core/iam/auth/login (admin/admin123) → {"success":true,"access_token":...}
浏览器首登：http://localhost:3000 → 主界面工作台（系统管理员 · 技术部）
schemas=19  tables=568  keeper=1
```

---

## 七、运维指南

### 启动 / 停止 / 状态
```bash
# 进入 WSL（以 root）
wsl -d Ubuntu -u root
# 全量状态
systemctl list-units 'topems-*' --no-legend --no-pager
systemctl status topems.target
# 重启全部
systemctl restart topems.target
# 单服务
systemctl restart topems-server        # BFF :8099
systemctl restart topems-unified-core  # 核心 :8000（含 IAM/Flow/File）
systemctl status topems-ticket
# 日志
journalctl -u topems-server -n 50 -f
journalctl -u topems-ai -n 50
```

### 保持 WSL 不自动关闭（关键）
WSL2 在「最后一个 wsl.exe 会话退出」后会自动关闭整个发行版，systemd 服务随之停止。当前已用保活会话（`sleep 86400`）保持：
```powershell
# Windows 侧：手动启动保活（隐藏窗口，后台保持）
Start-Process wsl.exe -ArgumentList "-d","Ubuntu","-u","root","--","sleep","86400" -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\wslk.out" -RedirectStandardError "$env:TEMP\wslk.err"
```
日常使用：**打开任意 WSL 终端窗口（wsl -d Ubuntu）并保持开启**即可；WSL 重启/Windows 重启后需重新执行上面保活命令或打开 WSL 终端。服务由 systemd 自动拉起（全部 enable），BFF 冷启动约 2 分钟（模块加载），期间 /api 短暂 502 属正常。

### 管理员口令
- 当前：admin / admin123（弱默认，代码回退值；环境未设 `ADMIN_INITIAL_PASSWORD`）
- 新 admin 已标记 `must_change_password=true`，**首登后应立即改密**
- 生产建议：在 `/opt/topems/config/unified-core.env` 显式设置 `ADMIN_INITIAL_PASSWORD=<强口令>` 后再建新库

---

## 八、遗留问题与建议（主开发者）

1. **初始化路径整改（优先级高，防复发）**：`svc/unified-core/src/modules/iam/mod.rs` 的 `init_database` 建表 SQL 曾缺 `roles / permissions / full_name_en / must_change_password` 列（当前源码已加 ALTER 兜底补齐；auth.rs 查询列一致）。该现象与 B 类 8 处缺列页面同根因：**schema_defense TABLE_DEFS / try_init / --init-db 自建 DDL 为过时/不完整版本**（wms inbound_orders 缺 order_date/approved_by/approved_at、srm suppliers 与 pm projects 缺 name_en、pm projects 缺 cost_center_id、crm customers 缺 organization_id 等，均已从源码实锤）。整改：① 各服务 schema_defense TABLE_DEFS 与 `database/migrations` 权威 DDL 做差异对齐校验（或校验失败 fail-fast）；② 部署统一 `scripts/migrate.sh run`，不再以自建路径为权威；③ try_init / default_init_db 对建表失败目前仅 warn 吞错，建议提升为严格模式（SCHEMA_DEFENSE_STRICT=1）或在关键表校验失败时 fail-fast。
2. **日志静默**：`topems-unified-core`、`topems-server` 应用日志未进入 journal（`topems-ai` 等正常），影响线上诊断，需排查其日志初始化（LOG_LEVEL=info 已设但无输出）。
3. **锁文件**：pnpm-lock.yaml 曾含重复键（已删行修复），需在源码侧清理，避免 pnpm10 无法安装。
4. **topems.target 周期停启**：日志可见 target 反复 Stopped/Started（服务均 running，未发现实际影响），疑为某服务 auto-restart 联动，建议观察。
5. **Ollama**：AI 服务依赖本机 Ollama（qwen2.5:7b / nomic-embed-text，http://localhost:11434）——当前 WSL 内未安装 Ollama，AI 推理接口将不可用（服务本身运行正常）。
6. **对外暴露**：nginx 当前仅监听 3000 供本机访问；如需对外/域名，参考仓库 `deploy/nginx/topems.conf`（443/80 + brotli）适配。
