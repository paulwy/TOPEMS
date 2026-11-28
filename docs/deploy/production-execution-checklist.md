# 生产任务执行清单（部署收尾）

> **适用范围（2026-11-13 更正）**：本文是 **Linux + systemd 目标机**的执行清单，**不适用于当前本机生产**。本机生产实际为 **macOS launchd**：`com.topems.server`（`/Users/xingzhai/topems/bin/topems-server`，`:8099`）+ `com.topems.nginx`（80/443 直接 `proxy_pass http://127.0.0.1:8099`，无 upstream 块），生产库 `topems_prod`。macOS 生产部署/验收见 `docs/deploy/release-pipeline.md` 与 `docs/deploy/macos-production-ops.md`；下文保留作为 Linux 迁移目标清单。

> 来源：`TODO.md` 未勾选的生产环境任务（2026-10-22 整理）。所有任务均阻塞于**生产机/外部环境**，本机工具与演练已就绪，到环境后逐项执行并勾选回写。
> 依据文档：`docs/deploy/nginx-prod-first-deploy-runbook.md`、`docs/deploy/windows-deployment.md`、`scripts/deploy/*`、`scripts/verify-nginx-prod.sh`。

## 总览

| 编号 | 任务 | 阻塞点 | 关键工具 | 参考文档 |
|---|---|---|---|---|
| P-1 | Linux 目标机 install.sh / update.sh / rollback.sh 实跑 | systemd 环境未就绪 | `scripts/deploy/install.sh` `update.sh` `rollback.sh` | `docs/deploy/windows-deployment.md` |
| P-2 | Linux 目标机 systemd 服务启用后各服务 /health 绿 | macOS 生产无 systemd（本机为 launchd） | `scripts/verify-nginx-prod.sh`（生产路径） | `nginx-prod-first-deploy-runbook.md` |
| P-3 | 生产服务 /health 全绿 | 生产机 | `scripts/verify-nginx-prod.sh --probe /health` | 同上 |
| P-4 | 生产机 smoke-prod.sh 全项 PASS | 生产数据/事件编排 | `scripts/deploy/smoke-prod.sh` | 脚本头注释（TODO 2.3） |
| P-5 | nginx 生产验证（nginx -t + 6 域冒烟） | 需生产 Linux | `scripts/verify-nginx-prod.sh` | `nginx-prod-first-deploy-runbook.md` |
| P-6 | 生产 nginx reload | 需目标机执行 | `nginx -t && nginx -s reload` | 同上 |
| P-7 | Windows 部署实跑（WSL2+systemd） | WSL2 环境待建 | `docs/deploy/windows-deployment.md` + 本 checklist W0-W8 | 同左 |
| P-8 | none 级流量观测立项 | 需业务/外部决策 | 8099 网关 access log | — |

---

## P-1 · 生产机安装/更新/回滚三脚本实跑

**现状**：容器内已验 EXIT=0（systemd ubuntu 22.04），生产机最终确认未做。

**前置条件**：Linux 生产机（systemd），部署用户可用 sudo；二进制产物就绪（或生产机可构建）。

### P-1.0 · 前置检查（部署前 1 天）

> 依据：`scripts/deploy/install.sh` 内建检查 + 生产环境基线要求。

| # | 检查项 | 命令/操作 | 预期结果 | 执行记录 |
|---|---|---|---|---|
| 1.0.1 | **OS 与 systemd** | `cat /etc/os-release` + `systemctl is-system-running` | Ubuntu 22.04+ 或等价；`running` 或 `degraded`（非 failed） | ☐ |
| 1.0.2 | **sudo 权限** | `sudo -n true` 或 `sudo -v` | 无密码或已缓存；exit 0 | ☐ |
| 1.0.3 | **磁盘空间** | `df -h /opt` | 可用 > 20G（含构建缓存与备份） | ☐ |
| 1.0.4 | **内存** | `free -h` | 可用 > 4G（Rust 构建需内存） | ☐ |
| 1.0.5 | **Rust/Cargo** | `cargo --version` | ≥ 1.75（workspace 基线） | ☐ |
| 1.0.6 | **Node.js** | `node --version` | ≥ 18（前端构建） | ☐ |
| 1.0.7 | **pnpm** | `pnpm --version` | ≥ 8（monorepo 包管理） | ☐ |
| 1.0.8 | **PostgreSQL 客户端** | `psql --version` | ≥ 14（与服务端匹配） | ☐ |
| 1.0.9 | **PostgreSQL 服务端可达** | `pg_isready -h <db-host> -p 5432` | `accepting connections` | ☐ |
| 1.0.10 | **Redis（可选）** | `redis-cli ping` | `PONG`（未装则 install.sh 仅警告） | ☐ |
| 1.0.11 | **网络出口** | `curl -sI https://static.crates.io` | 200（Rust 依赖拉取） | ☐ |
| 1.0.12 | **DNS 解析** | `nslookup <db-host>` | 正常解析 | ☐ |
| 1.0.13 | **防火墙/端口** | `ss -tlnp \| grep 8099` 或 `nc -zv <db-host> 5432` | 8099 未占用；5432 可达 | ☐ |
| 1.0.14 | **时间同步** | `timedatectl status` | NTP 同步正常（JWT/日志时间戳） | ☐ |
| 1.0.15 | **备份目录可写** | `mkdir -p /opt/topems/backups && touch /opt/topems/backups/.test` | 可创建/写入 | ☐ |
| 1.0.16 | **代码包就绪** | `ls target/release/topems-*` 或确认生产机可构建 | 二进制存在或构建环境完整 | ☐ |
| 1.0.17 | **环境变量模板** | `ls config/env/.env.production.template` | 模板存在 | ☐ |
| 1.0.18 | **关键环境变量已配置** | 检查 `.env.production` 或部署机环境变量 | `ADMIN_INITIAL_PASSWORD` 已覆盖、`REGISTER_ENABLED=false`、`DEVELOPMENT_MODE=false` | ☐ |
| 1.0.19 | **数据库备份** | `pg_dump -h <db-host> -U topems -d topems -F c -f /opt/topems/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).dump` | 备份文件生成，大小 > 0 | ☐ |
| 1.0.20 | **备份校验** | `pg_restore --list /opt/topems/backups/pre-deploy-*.dump \| head -20` | 能列出表结构，无损坏 | ☐ |

### P-1.1 · 安装（首次部署）

```bash
# ① 预演（强烈推荐先 dry-run 核对完整计划）
./scripts/deploy/install.sh --prefix /opt/topems --user topems --dry-run --skip-build

# ② 实际安装（跳过构建，用已有二进制）
sudo ./scripts/deploy/install.sh --prefix /opt/topems --user topems --skip-build

# 或生产机本地构建（需 Rust/Node 环境完整）
sudo ./scripts/deploy/install.sh --prefix /opt/topems --user topems
```

**install.sh 内部流程**（供理解）：
1. 检查 Rust/Cargo、PostgreSQL 客户端、Node.js（缺失即 exit 1）
2. 创建目录结构 `${PREFIX}/{bin,svc,config,logs,data,lib}`
3. 创建服务用户 `topems`（不存在则 `useradd -r -s /bin/false`）
4. 构建/复制 29 个服务二进制到 `${PREFIX}/bin/`
5. 构建 shared packages（shared-types/shared-utils）
6. 构建前端 Host Shell（apps/web → `${PREFIX}/web/`）
7. 复制 systemd 服务文件（`deploy/systemd/*.service` → `/etc/systemd/system/`）
8. 创建 per-service 工作目录 `${PREFIX}/svc/<svc>` 与环境文件 `${PREFIX}/config/<svc>.env`
9. `systemctl daemon-reload` + `systemctl enable topems.target`

### P-1.2 · 更新（后续版本）

```bash
# ① 预演
./scripts/deploy/update.sh --version v1.2.3 --restart --dry-run

# ② 实际更新（全量服务）
sudo ./scripts/deploy/update.sh --version v1.2.3 --restart

# 或仅更新指定服务
sudo ./scripts/deploy/update.sh --version v1.2.3 --services erp,bi --restart
```

### P-1.3 · 回滚

```bash
# ① 预演（核对完整回滚计划）
./scripts/deploy/rollback.sh --dry-run /opt/topems/backups/<backup_dir>

# ② 实际回滚（需 PGPASSWORD 环境变量）
PGPASSWORD='<db-password>' sudo ./scripts/deploy/rollback.sh /opt/topems/backups/<backup_dir>

# 非 root 回滚（仅数据库段，服务段自动跳过）
SKIP_ROOT_CHECK=1 PGPASSWORD='<db-password>' ./scripts/deploy/rollback.sh /opt/topems/backups/<backup_dir>
```

**rollback.sh 内部流程**：
1. 停止服务（`systemctl stop topems.target`）
2. 备份当前数据库（`pg_dump` → `pre_rollback_*/database_pre_rollback.sql`）
3. 恢复环境变量（`.env.backup` → `/opt/topems/.env`）
4. 恢复数据库（`dropdb` → `createdb` → `psql < database.sql`）
5. 恢复上传文件（`uploads.tar.gz` → `/opt/topems/`）
6. 启动服务（`systemctl start topems.target`）
7. 验证：服务状态、权限数据行数（≥10）、管理员登录冒烟（如设 `ROLLBACK_ADMIN_PASS`）

**验收标准**：
- install 后 `systemctl status topems.target` 为 active，服务全部 running（数量以实际生成单元为准；TODO.md 容器实跑口径为 29 个 systemd 服务）
- update 后新版本生效、服务无重启失败
- rollback 恢复指定备份且数据校验通过（权限数 ≥10、登录冒烟成功）

---

## P-2 · systemd 服务启用后各服务 /health 绿

**现状**：本机无 systemd，无法验证；`scripts/dev/health-check.sh` 已就绪。

> ⚠️ **重要口径**：`scripts/dev/health-check.sh` 头部自述为 **LEGACY-DEV 非生产脚本**（直连旧端口 8000/8020/8010），并明确"生产唯一入口为 nginx upstream → :8099，**生产验收请使用 scripts/verify-nginx-prod.sh，勿用本脚本判定生产健康**"。生产 /health 验收以 P-3 为准。（注：本机 macOS 生产为 80/443 直连 `proxy_pass http://127.0.0.1:8099`，**无 upstream 块**；上述 upstream 表述属 Linux 模板口径。）

### P-2.0 · 前置检查（服务启动前）

| # | 检查项 | 命令/操作 | 预期结果 | 执行记录 |
|---|---|---|---|---|
| 2.0.1 | systemd 服务文件已加载 | `systemctl list-unit-files 'topems-*' --no-pager` | 29 个服务单元 listed（enabled/disabled 状态正确） | ☐ |
| 2.0.2 | topems.target 已启用 | `systemctl is-enabled topems.target` | enabled | ☐ |
| 2.0.3 | 服务二进制存在 | `ls /opt/topems/bin/*-service` | 29 个二进制文件 | ☐ |
| 2.0.4 | per-service 工作目录 | `ls /opt/topems/svc/` | 29 个服务目录 | ☐ |
| 2.0.5 | per-service 环境文件 | `ls /opt/topems/config/*.env` | 29 个 .env 文件（非空或模板） | ☐ |
| 2.0.6 | 数据库连接（每服务） | `grep DATABASE_URL /opt/topems/config/*.env` | 各服务 DATABASE_URL 指向生产库（本机 macOS 生产为 `topems_prod`） | ☐ |
| 2.0.7 | 端口冲突检查 | `ss -tlnp \| grep -E ':(8000\|8010\|8020\|8099)'` | 8099 未被占用（旧端口 8000/8010/8020 不应监听） | ☐ |
| 2.0.8 | 日志目录可写 | `ls -ld /opt/topems/logs/` | drwxr-xr-x topems:topems | ☐ |

### P-2.1 · 服务启动与状态确认

```bash
# 1. 启动所有服务
sudo systemctl start topems.target

# 2. 确认 target 状态
systemctl status topems.target --no-pager
# 预期：Active: active (exited) 或 active (running)

# 3. 确认各服务状态（29 个）
systemctl list-units 'topems-*' --no-pager --state=running
# 预期：29 个服务 active/running，无 failed

# 4. 如有失败服务，查看日志
journalctl -u topems-<svc-name> --no-pager -n 50
# 常见失败原因：数据库连接失败、端口冲突、环境变量缺失、二进制不存在

# 5. 确认 BFF 端口监听
ss -tlnp | grep 8099
# 预期：topems-server 监听 8099（模块化单体 BFF）
```

### P-2.2 · 生产路径健康验证（经 nginx → :8099）

```bash
# 生产机执行（经 nginx 反代链路，覆盖全部已启用服务）
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf \
  --base http://<nginx-host> \
  --services "erp bi hrm portal core wms" \
  --probe "/health"
```

**verify-nginx-prod.sh 三步判定**：
1. **nginx -t**：语法校验（Linux 必须过；macOS 跳过并 WARN）
2. **UPSTREAM_OK**：`upstream server_service` 指向 `localhost:8099`，无 `LEGACY_MAP_PRESENT`
3. **SMOKE n/n 200**：各域 `/api/<svc>/health` 经反代返回 200

**判读**：
- `200` = 反代到 BFF 且该域适配器可服务
- `404` 且 BFF 直连 200 = 路径/适配器错位
- `502` = upstream(8099) 不可达（BFF 未启动或端口未监听）
- `504` = 网关超时（BFF 响应慢或内部服务未就绪）

**验收标准**：冒烟端点全部 HTTP 200；无 5xx / 真 404。

---

## P-3 · 生产服务 /health 全绿（逐服务核对）

**现状**：`health-check.sh` 就绪（但按 P-2 口径，生产路径走 verify-nginx-prod.sh）。

> P-2 的 `--services` 参数默认仅覆盖 6 域（erp bi hrm portal core wms）。P-3 需扩展至全部 29 个已启用服务，逐服务确认 /health 200。

### P-3.0 · 服务清单确认（29 个）

> 依据 `scripts/deploy/install.sh` SERVICES 数组（L164-198）与 `deploy/systemd/*.service`。

| 类别 | 服务名 | systemd 单元 | 备注 |
|---|---|---|---|
| **核心** | unified-core | topems-unified-core.service | IAM + Doc + Flow + File + Communication + Tenant + Billing + AI + Monitor |
| **业务域** | ai | topems-ai.service | |
| | analytics | topems-analytics.service | bi 别名 |
| | communication | topems-communication.service | |
| | crm | topems-crm.service | |
| | ehs | topems-ehs.service | |
| | erp | topems-erp.service | |
| | finance | topems-finance.service | |
| | gis | topems-gis.service | |
| | hrm | topems-hrm.service | |
| | integration | topems-integration.service | |
| | lims | topems-lims.service | |
| | master-data | topems-master-data.service | |
| | mes | topems-mes.service | |
| | mobile | topems-mobile.service | |
| | monitor | topems-monitor.service | |
| | pdm | topems-pdm.service | |
| | plugin-registry | topems-plugin-registry.service | |
| | pm | topems-pm.service | |
| | portal | topems-portal.service | |
| | qms | topems-qms.service | |
| | rd | topems-rd.service | |
| | scm | topems-scm.service | |
| | search | topems-search.service | |
| | server | topems-server.service | BFF 入口（:8099） |
| | srm | topems-srm.service | |
| | ticket | topems-ticket.service | |
| | tms | topems-tms.service | |
| | wms | topems-wms.service | |

### P-3.1 · 逐服务健康验证（经 nginx 反代）

```bash
# 扩展 --services 覆盖全部 29 个服务
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf \
  --base http://<nginx-host> \
  --services "unified-core ai analytics communication crm ehs erp finance gis hrm integration lims master-data mes mobile monitor pdm plugin-registry pm portal qms rd scm search server srm ticket tms wms" \
  --probe "/health"
```

**注意**：`unified-core` 与 `server` 的 /health 路径可能为 `/health`（无 `/api/<svc>/` 前缀），需按实际路由调整：
- `unified-core` → `http://<nginx-host>/health`（BFF 直接暴露）
- `server` → `http://<nginx-host>/health`（同上）
- 其他服务 → `http://<nginx-host>/api/<svc>/health`

如脚本不支持差异化 probe，可分批执行：
```bash
# 批次 1：BFF 直连（/health）
curl -s http://<nginx-host>/health | jq -r '.status'

# 批次 2：各域服务（/api/<svc>/health）
for svc in ai analytics communication crm ehs erp finance gis hrm integration lims master-data mes mobile monitor pdm plugin-registry pm portal qms rd scm search srm ticket tms wms; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://<nginx-host>/api/$svc/health")
  echo "$svc: $code"
done
```

### P-3.2 · BFF 直连健康验证（不经 nginx，排查用）

```bash
# BFF 直连（:8099）
curl -s http://localhost:8099/health | jq -r '.status'
# 预期："ok" 或 "healthy"

# 各域服务经 BFF 内嵌适配器（:8099）
for svc in ai analytics communication crm ehs erp finance gis hrm integration lims master-data mes mobile monitor pdm plugin-registry pm portal qms rd scm search srm ticket tms wms; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8099/api/$svc/health")
  echo "$svc: $code"
done
```

**验收标准**：全部服务 /health 200（经 nginx 反代与 BFF 直连均 200），`FAIL=0`。

---

## P-4 · 生产机 smoke-prod.sh 全项 PASS

**现状**：本机/容器演练已 20/20 通过（exit=0）；生产机层1 自动断言 + 层2 专项未复核。

### P-4.0 · 前置检查

| # | 检查项 | 命令/操作 | 预期结果 | 执行记录 |
|---|---|---|---|---|
| 4.0.1 | 冒烟脚本可执行 | `ls -l scripts/deploy/smoke-prod.sh` | -rwxr-xr-x | ☐ |
| 4.0.2 | 依赖工具就绪 | `which curl jq` | 均存在 | ☐ |
| 4.0.3 | 管理员凭据已准备 | `echo $SMOKE_ADMIN` / `echo $SMOKE_PASS` | 非空（不硬编码） | ☐ |
| 4.0.4 | BFF 8099 健康 | `curl -s http://localhost:8099/health \| jq -r '.status'` | ok/healthy | ☐ |
| 4.0.5 | nginx 反代可达 | `curl -s http://<nginx-host>/health \| jq -r '.status'` | ok/healthy | ☐ |

### P-4.1 · 层1 自动断言（20 项）

```bash
# 生产机执行（需显式凭据）
./scripts/deploy/smoke-prod.sh \
  --base http://<portal-url> \
  --user <admin> --password <pass> \
  [--insecure]   # 自签证书演练环境才需要

# 或环境变量方式
SMOKE_ADMIN=<u> SMOKE_PASS=<p> ./scripts/deploy/smoke-prod.sh --base http://<portal-url>
```

**层1 覆盖项**（依据 `smoke-prod.sh` L72-135）：
- **A. IAM 登录 → JWT → 受保护 API**：`POST /api/core/iam/auth/login` → token → `GET /api/core/iam/users/me`（200）
- **B. 各域服务健康**（16 域）：core erp hrm finance mes qms lims ehs bi pm portal wms scm srm rd（`/api/<域>/health` 或 `/health`）
- **C. BI 真实 SQL**：`POST /api/bi/datasets/test-sql`（200/400/422 路由可达）+ `POST /api/bi/datasets/query`（200/400/422）
- **D. 插件注册/运行时**：`GET /api/plugins/health`（200，带 token）

**判定**：全部 PASS → exit 0；任一 FAIL → exit 1 并打印 `❌` 项。

### P-4.2 · 层2 专项（人工复验）

> 依赖生产数据与事件编排，按 `smoke-prod.sh` L137-157 指引逐项执行并记录。

| 专项 | 验证路径 | 期望结果 | 执行记录 |
|---|---|---|---|
| **E. 财务凭证借贷平衡** | `svc/finance` 凭证创建/查询 API（`/api/finance/v1/...`） | 创建借贷平衡凭证 → 查询汇总借贷恒等（decimal 精度无漂移） | ☐ |
| **F. 工单下达事件化** | `svc/mes` 工单下达 API（`/api/mes/v1/...`） | 下达 → 事件发布 → 订阅方投影落库（uuid=text 修复后无类型错配） | ☐ |
| **G. 质量链 qms↔lims↔ehs 事件联动** | `svc/qms`、`svc/lims`、`svc/ehs` 事件订阅链路 | qms 检验事件 → lims 采样联动 → ehs 风险联动（internal 前缀路由正常） | ☐ |
| **H. WS MES 看板推送** | unified-core WS 端点（mes_real_module 投影提供） | 建立 WS 连接 → 订阅 MES 看板频道 → 工单状态变更实时推送 | ☐ |

**层2 验证命令参考**（需按实际 API 调整）：

```bash
# E. 财务凭证借贷平衡
# 1. 创建借贷平衡凭证
TOKEN=$(curl -s -X POST http://<portal-url>/api/core/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<admin>","password":"<pass>"}' | jq -r '.data.access_token')

curl -s -X POST http://<portal-url>/api/finance/v1/vouchers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"voucher_date":"2026-10-22","entries":[{"account_code":"1001","debit":10000,"credit":0},{"account_code":"2202","debit":0,"credit":10000}]}' | jq '.success'

# 2. 查询汇总验证借贷恒等
curl -s "http://<portal-url>/api/finance/v1/vouchers/summary?date=2026-10-22" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {total_debit, total_credit, balanced: (.total_debit == .total_credit)}'

# F. 工单下达事件化
# 1. 创建工单
curl -s -X POST http://<portal-url>/api/mes/v1/work-orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"product_id":"<pid>","quantity":100}' | jq '.data.id'

# 2. 下达工单（触发事件）
curl -s -X POST "http://<portal-url>/api/mes/v1/work-orders/<wo-id>/release" \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

# 3. 查询事件投影（uuid=text 修复后无类型错配）
curl -s "http://<portal-url>/api/mes/v1/work-orders/<wo-id>/events" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# G. 质量链事件联动
# 1. qms 创建检验单
curl -s -X POST http://<portal-url>/api/qms/v1/inspections \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"item_code":"<item>","type":"incoming"}' | jq '.data.id'

# 2. 查询 lims 采样联动（internal 前缀路由）
curl -s "http://<portal-url>/api/lims/v1/samples?inspection_id=<insp-id>" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# 3. 查询 ehs 风险联动
curl -s "http://<portal-url>/api/ehs/v1/risks?source_type=inspection&source_id=<insp-id>" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# H. WS MES 看板推送
# 1. 建立 WS 连接（wscat 或自定义客户端）
wscat -c "ws://<portal-url>/api/core/iam/ws?token=$TOKEN"

# 2. 订阅 MES 看板频道
> {"action":"subscribe","channel":"mes.dashboard"}

# 3. 触发工单状态变更（另一终端）
curl -s -X POST "http://<portal-url>/api/mes/v1/work-orders/<wo-id>/start" \
  -H "Authorization: Bearer $TOKEN"

# 4. 观察 WS 推送（实时消息）
< {"channel":"mes.dashboard","event":"work_order_started","data":{...}}
```

**验收标准**：层1 全项 PASS（exit=0）；层2 四项专项逐项复验并记录（成功/失败/原因）。

---

## P-4.5 · RLS 租户隔离验证（生产部署后必做）

> 依据：`docs/onboarding/system-onboarding-and-gap-tracker.md` v1.39（17 real_module 批量补挂 RLS 请求层中间件）+ `database/scripts/verify_rls_coverage_production.sql` + `scripts/audit/audit-force-rls-no-policy.sql`。
> **前置**：已用 `topems_prod`（owner）或 `topems_app`（受限业务用户）连接生产库。
> **连接串示例**：`psql "postgres://topems_prod:password@prod-host:5432/topems_prod"`（Linux 模板主机名；本机 macOS 生产为 xingzhai 机 `topems_prod`）

### R0 · 连接与角色确认

```bash
# 用 owner 连接（执行 DDL/审计）
psql "postgres://topems_prod:topems_secret@prod-host:5432/topems_prod"

# 或用受限业务用户连接（验证 RLS 过滤）
psql "postgres://topems_app:topems_app_secret@prod-host:5432/topems_prod"
```

```sql
-- 确认当前角色与数据库
SELECT current_user, current_database(), version();

-- 确认 topems_app 角色存在且属性正确（RLS 对 superuser 不生效）
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles WHERE rolname IN ('topems_prod', 'topems_app');
-- 预期：topems_app rolsuper=false
```

### R1 · RLS 覆盖率静态审计（只读）

```bash
psql "postgres://topems_prod:topems_secret@prod-host:5432/topems_prod" \
  -v ON_ERROR_STOP=1 \
  -f database/scripts/verify_rls_coverage_production.sql
```

**预期判定**：
- 查询 1（覆盖率）：返回 **0 行**（所有含 tenant_id 的表已启用 RLS）
- 查询 3（无 policy 的 RLS 表）：返回 **0 行**
- 查询 6（迁移状态）：`failed` = 0

### R2 · RLS 策略补建（如 R1 有缺口）

```bash
# 2.1 审计「RLS=ON 但无 policy」的表
psql "postgres://topems_prod:topems_secret@prod-host:5432/topems_prod" \
  -v ON_ERROR_STOP=1 \
  -f scripts/audit/audit-force-rls-no-policy.sql
# 关注结果 3 汇总：with_tenant_id 数量即为需补策略的目标表数

# 2.2 统一补建/重建策略（幂等，可重复执行）
psql "postgres://topems_prod:topems_secret@prod-host:5432/topems_prod" \
  -v ON_ERROR_STOP=1 \
  -f scripts/db/rls-policy-unify.sql
# 输出 rebuilt <schema>.<table> policy <name> (<cmd>) 明细

# 2.3 补建后复跑 R1 验证（应全部归零）
psql "postgres://topems_prod:topems_secret@prod-host:5432/topems_prod" \
  -v ON_ERROR_STOP=1 \
  -f database/scripts/verify_rls_coverage_production.sql
```

### R3 · 租户隔离动态验证（核心）

```bash
# 用受限业务用户连接
psql "postgres://topems_app:topems_app_secret@prod-host:5432/topems_prod"
```

```sql
-- 3.1 确认非 superuser
SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_super;
-- 预期：is_super = false

-- 3.2 无 GUC（service token 场景，策略含 nil 豁免）
SELECT 'no_guc' AS scenario, COUNT(*) FROM hrm.employees;
-- 预期：返回全部行数

-- 3.3 设置租户 A GUC
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
SELECT 'tenant_a' AS scenario, COUNT(*) FROM hrm.employees;
-- 预期：返回租户 0001 数据行数

-- 3.4 设置租户 B GUC
SET app.tenant_id = '00000000-0000-0000-0000-000000000002';
SELECT 'tenant_b' AS scenario, COUNT(*) FROM hrm.employees;
-- 预期：返回 0 或租户 0002 数据行数

-- 3.5 跨租户写入拒绝（应报错 42501）
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO hrm.employees (id, tenant_id, name, employee_no, created_at, updated_at)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '跨租户测试', 'TEST001', now(), now());
-- 预期：ERROR 42501: new row violates row-level security policy

-- 3.6 同租户写入允许（随后清理）
SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO hrm.employees (id, tenant_id, name, employee_no, created_at, updated_at)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '同租户测试', 'TEST002', now(), now());
DELETE FROM hrm.employees WHERE employee_no = 'TEST002';

-- 3.7 超管全见（需有 SET ROLE 权限）
SET ROLE topems;
SELECT 'superuser' AS scenario, COUNT(*) FROM hrm.employees;
-- 预期：返回全部行数
RESET ROLE;
```

### R4 · 关键业务表抽样验证

```sql
-- 定义验证函数（可重复调用）
CREATE OR REPLACE FUNCTION verify_tenant_isolation(
  p_schema text, p_table text, p_tenant_a uuid, p_tenant_b uuid
) RETURNS TABLE(scenario text, row_count bigint) AS $$
BEGIN
  EXECUTE format('SET LOCAL app.tenant_id = %L', '');
  RETURN QUERY EXECUTE format('SELECT %L, COUNT(*) FROM %I.%I', 'no_guc', p_schema, p_table);
  EXECUTE format('SET LOCAL app.tenant_id = %L', p_tenant_a);
  RETURN QUERY EXECUTE format('SELECT %L, COUNT(*) FROM %I.%I', 'tenant_a', p_schema, p_table);
  EXECUTE format('SET LOCAL app.tenant_id = %L', p_tenant_b);
  RETURN QUERY EXECUTE format('SELECT %L, COUNT(*) FROM %I.%I', 'tenant_b', p_schema, p_table);
END;
$$ LANGUAGE plpgsql;

-- 抽样验证 17 个 real_module 核心表
SELECT * FROM verify_tenant_isolation('hrm', 'employees', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT * FROM verify_tenant_isolation('erp', 'customers', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT * FROM verify_tenant_isolation('crm', 'customers', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT * FROM verify_tenant_isolation('finance', 'core_finance_accounts', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT * FROM verify_tenant_isolation('wms', 'warehouses', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT * FROM verify_tenant_isolation('mes', 'equipment', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT * FROM verify_tenant_isolation('qms', 'quality_standards', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

DROP FUNCTION verify_tenant_isolation;
```

### R5 · BFF 端到端验证（经 API 层）

```bash
# 5.1 获取租户 A token
TOKEN_A=$(curl -s -X POST http://prod-host:8099/api/core/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_tenant_a","password":"***"}' | jq -r '.data.access_token')

# 5.2 租户 A 访问员工列表
curl -s http://prod-host:8099/api/hrm/employees \
  -H "Authorization: Bearer $TOKEN_A" | jq '.data | length'

# 5.3 获取租户 B token 并访问（结果应与 5.2 不同）
TOKEN_B=$(curl -s -X POST http://prod-host:8099/api/core/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_tenant_b","password":"***"}' | jq -r '.data.access_token')
curl -s http://prod-host:8099/api/hrm/employees \
  -H "Authorization: Bearer $TOKEN_B" | jq '.data | length'
```

### R6 · 结果记录

```bash
cat >> /opt/topems/logs/deploy-rls-verify-$(date +%Y%m%d).log << 'EOF'
=== RLS 验证结果 ===
时间: $(date)
执行人: <操作人>
R1 覆盖率: <0 行 ✅ / N 行 ❌>
R3 租户隔离: <通过 ✅ / 失败 ❌>
R5 BFF 端到端: <通过 ✅ / 失败 ❌>
遗留: <如有>
EOF
```

**验收标准**：R1 查询 1/3 返回 0 行；R3 租户 A/B 数据隔离正确、跨租户写入 42501、超管全见；R5 API 层按 token 返回对应租户数据。

---

## P-5 · nginx 生产验证

**现状**：`verify-nginx-prod.sh` 本机 MAP_OK（upstream 校验通过、无遗留 map 路由表）；`nginx -t` 与 6 域冒烟需生产 Linux（macOS 跳过）。

**执行步骤**：

```bash
# 生产 Linux 执行（三条校验：nginx -t / upstream 8099 / 冒烟探测）
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf \
  --base http://nginx-host \
  --services "erp bi hrm portal core wms" \
  --probe "/health"
```

**验收标准**：三步全过——① `nginx -t` syntax ok；② `UPSTREAM_OK`（server_service → 8099，无 LEGACY_MAP）；③ 6 域冒烟全 200。

---

## P-6 · 生产 nginx reload

**现状**：配置已就绪且本机校验通过，reload 动作需在目标机执行。

**执行步骤**（目标机）：

```bash
nginx -t && nginx -s reload
# 或 systemctl reload nginx（systemd 管理时）
```

**验收标准**：`nginx -t` 通过后 reload 无报错；reload 后冒烟（P-5 命令）仍全 200，无连接中断。

---

## P-7 · Windows 部署实跑（WSL2 + systemd）

> 依据：`docs/deploy/windows-deployment.md`（2026-10-08 定案）。方案：WSL2（Ubuntu）+ systemd + 复用现有 install/update/rollback 脚本，避免重写部署逻辑。
> **前置**：Windows 11 22H2+ 或 Windows Server 2022+（systemd 完整支持）；管理员权限。

### W0 · 前置检查（Windows 侧）

```powershell
# 0.1 确认 Windows 版本（需 22H2+）
winver
# 或 PowerShell
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber

# 0.2 确认 WSL 已安装
wsl --status
# 未安装则执行：wsl --install -d Ubuntu

# 0.3 确认虚拟化已启用（BIOS/任务管理器）
Get-ComputerInfo -Property HyperVRequirementVirtualizationFirmwareEnabled
# 预期：True（若为 False 需进 BIOS 开启 VT-x/AMD-V）
```

### W1 · WSL2 + Ubuntu 安装与 systemd 启用

```powershell
# 1.1 安装 Ubuntu（管理员 PowerShell）
wsl --install -d Ubuntu
# 重启后完成初始化（设置 Linux 用户名/密码）

# 1.2 验证 WSL 版本（需 WSL2）
wsl -l -v
# 预期：Ubuntu  VERSION 2
```

```bash
# 1.3 WSL 内启用 systemd（/etc/wsl.conf）
sudo tee /etc/wsl.conf << 'EOF'
[boot]
systemd=true
EOF
```

```powershell
# 1.4 Windows 侧重启 WSL 使配置生效
wsl --shutdown
wsl -d Ubuntu
```

```bash
# 1.5 验证 systemd 可用
systemctl is-system-running
# 预期：running 或 degraded（非 degraded 需排查）
```

### W2 · WSL 内环境搭建（Ubuntu）

```bash
# 2.1 基础依赖
sudo apt update && sudo apt install -y \
  build-essential pkg-config libssl-dev \
  postgresql-16 postgresql-contrib \
  curl git redis-server

# 2.2 启用 Redis
sudo systemctl enable --now redis-server

# 2.3 Rust 工具链（若需 WSL 内编译）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 2.4 pgvector（PG16 版；生产基线 PG18 需对应编译）
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector && make && sudo make install && cd ~
```

> ⚠️ **版本对齐**：生产基线 PG18 + pgvector 0.8.7。Ubuntu apt 默认 PG16——若需与生产完全一致，用 PGDG 源装 PG18（`apt.postgresql.org`），并编译对应 pgvector。

### W3 · 数据迁移（备份恢复）

```bash
# 3.1 备份文件拷入 WSL（Windows 盘挂载在 /mnt/c）
cp /mnt/c/Users/<用户名>/topems_backup.sql /tmp/
# 或用现有 backups/*.sql

# 3.2 建用户/库
sudo -u postgres psql -c "CREATE USER topems WITH PASSWORD 'topems_secret' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE topems OWNER topems;"

# 3.3 恢复（ON_ERROR_STOP + 空态核验）
PGPASSWORD=topems_secret psql -h localhost -p 5432 -U topems -d topems \
  -v ON_ERROR_STOP=1 -f /tmp/topems_backup.sql

# 3.4 验证恢复
PGPASSWORD=topems_secret psql -h localhost -p 5432 -U topems -d topems \
  -At -c "SELECT count(*) FROM core_permissions;"
# 预期：返回权限行数（>0）
```

### W4 · 部署执行（复用现有脚本）

```bash
# 4.1 进入仓库
cd ~/TOPEMS

# 4.2 配置环境（按实际修改数据库连接等）
cp config/env/_template.env.example config/env/.env
# 编辑 .env：DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# 4.3 安装（systemd 服务注册）
sudo bash scripts/deploy/install.sh --prefix /opt/topems --user topems

# 4.4 服务状态确认
systemctl list-units 'topems*' --no-pager
# 预期：29 个服务单元 active/running

# 4.5 端口监听确认
ss -tlnp | grep 8099
# 预期：BFF 监听 8099
```

### W5 · 服务健康验证（同 Linux 生产）

```bash
# 5.1 BFF 直连健康
curl http://localhost:8099/health

# 5.2 经 nginx 反代冒烟（如已配置 nginx）
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf \
  --base http://localhost \
  --services "erp bi hrm portal core wms" \
  --probe "/health"

# 5.3 层1 自动断言
./scripts/deploy/smoke-prod.sh \
  --base http://localhost:8099 \
  --user admin --password <ADMIN_INITIAL_PASSWORD>
```

### W6 · 开机自启（任务计划程序）

```powershell
# 6.1 创建任务计划（PowerShell 管理员）
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d Ubuntu -u root -- systemctl daemon-reload && systemctl start topems.target"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "TOPEMS-WSL-AutoStart" -Action $action -Trigger $trigger -Principal $principal

# 6.2 验证任务
Get-ScheduledTask -TaskName "TOPEMS-WSL-AutoStart"
```

### W7 · 对外暴露（NAT portproxy）

```powershell
# 7.1 查询 WSL IP
wsl -d Ubuntu -- hostname -I
# 例：172.23.x.x

# 7.2 Windows 侧端口转发（8099 BFF）
netsh interface portproxy add v4tov4 listenport=8099 listenaddress=0.0.0.0 connectport=8099 connectaddress=<WSL_IP>

# 7.3 验证转发
netsh interface portproxy show all
curl http://<Windows_IP>:8099/health
```

> **Win11 23H2+ 可选**：WSL `mirrored` 网络模式（`.wslconfig` 设 `networkingMode=mirrored`）——WSL 与 Windows 共享 IP，免 portproxy。防火墙需放行端口。

### W8 · 回滚与备份

```bash
# 8.1 WSL 内备份到 Windows 盘
sudo -u postgres pg_dump -Fc topems > /mnt/c/topems_backup/$(date +%Y%m%d_%H%M%S).sql

# 8.2 回滚（现有 rollback.sh）
sudo bash scripts/deploy/rollback.sh /opt/topems/backups/<backup_dir>
```

**验收标准**：
- W0-W1：WSL2 + systemd 可用（`systemctl is-system-running` 非 failed）
- W2-W3：PG + pgvector + Redis 就绪，数据恢复后 `core_permissions` 行数 >0
- W4-W5：install 成功、29 服务 running、BFF 8099 健康、冒烟 PASS
- W6-W7：开机自启生效、外部可访问 `http://<Windows_IP>:8099`
- W8：备份/回滚脚本可执行

---

## P-8 · none 级流量观测立项

**现状**：已立项（2026-10-24）。观测脚本 `scripts/audit/traffic-observe.sh` 已落地并本地验证（引号切分解析 nginx combined / 台账 TSV 幂等 / 30 天窗口 none 级判定含全史归零端点 / 报告增量生成）；观测期自生产机首次运行起算 ≥30 天。待办：部署机 crontab 注册每日运行（参考 `scripts/dev/collect-usage-daily.sh` 的 01:00 幂等范式）+ 30 天后人工核对路由注册/前端引用后定处置。

**说明**：部署稳定后，对 8099 网关 access log 做 ≥30 天观测，确认 none 级（长期 0 请求）端点/服务，作为后续下线或冻结决策依据。此项不阻塞部署，可并行推进。

**交付物**：观测方案 + 30 天日志留存 + 汇总报告（建议归档至 `artifacts/audit/`）。

**观测方案要点**：
- **日志来源**：nginx access log（`$request` 含 path + status + upstream）
- **采样频率**：每日汇总一次，保留 30 天原始日志
- **分析维度**：按 path 分组统计请求数，标记 30 天 0 请求的端点
- **输出格式**：`artifacts/audit/traffic-observation-30d.md`（含 none 级清单 + 建议处置：下线/冻结/保留）

**部署机 crontab 注册（照抄即可，幂等范式同 collect-usage-daily.sh 01:00）**：
```bash
# 目录准备
sudo mkdir -p /var/lib/topems/audit /var/log/topems
# crontab -e 追加（部署机脚本绝对路径按实际调整）
TRAFFIC_LEDGER=/var/lib/topems/audit/traffic_daily.tsv
0 1 * * * TRAFFIC_LEDGER=/var/lib/topems/audit/traffic_daily.tsv /opt/topems/scripts/audit/traffic-observe.sh --daily --log /var/log/nginx/access.log >> /var/log/topems/traffic-observe.log 2>&1
```
**≥30 天后取结果**：`TRAFFIC_LEDGER=/var/lib/topems/audit/traffic_daily.tsv scripts/audit/traffic-observe.sh --report --days 30` → 读 `artifacts/audit/traffic-observation-30d.md` 的 none 级清单（长期 0 请求端点），人工核对路由注册/前端引用后定处置（下线/冻结/保留），并将决策回写 TODO P-8 登记。

---

## 执行顺序建议

1. **P-5 → P-6**（nginx 验证 + reload，最先确认入口链路）
2. **P-1**（三脚本实跑，建立 systemd 服务）
3. **P-2 → P-3**（服务健康验收）
4. **P-4**（功能链路冒烟，层2 专项逐项复验）
5. **P-4.5**（RLS 租户隔离验证，生产数据安全底线）
6. **P-7**（Windows 环境，独立并行）
7. **P-8**（观测立项，不阻塞，可随时启动）

> 每完成一项：回到 `TODO.md` 对应行勾选并注明日期/提交/结果，回写本文档"执行记录"。
