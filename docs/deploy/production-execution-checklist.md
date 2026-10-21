# 生产任务执行清单（部署收尾）

> 来源：`TODO.md` 未勾选的生产环境任务（2026-10-22 整理）。所有任务均阻塞于**生产机/外部环境**，本机工具与演练已就绪，到环境后逐项执行并勾选回写。
> 依据文档：`docs/deploy/nginx-prod-first-deploy-runbook.md`、`docs/deploy/windows-deployment.md`、`scripts/deploy/*`、`scripts/verify-nginx-prod.sh`。

## 总览

| 编号 | 任务 | 阻塞点 | 关键工具 | 参考文档 |
|---|---|---|---|---|
| P-1 | 生产机 install.sh / update.sh / rollback.sh 实跑 | systemd 环境未就绪 | `scripts/deploy/install.sh` `update.sh` `rollback.sh` | `docs/deploy/windows-deployment.md` |
| P-2 | systemd 服务启用后各服务 /health 绿 | 本机无 systemd | `scripts/verify-nginx-prod.sh`（生产路径） | `nginx-prod-first-deploy-runbook.md` |
| P-3 | 生产服务 /health 全绿 | 生产机 | `scripts/verify-nginx-prod.sh --probe /health` | 同上 |
| P-4 | 生产机 smoke-prod.sh 全项 PASS | 生产数据/事件编排 | `scripts/deploy/smoke-prod.sh` | 脚本头注释（TODO 2.3） |
| P-5 | nginx 生产验证（nginx -t + 6 域冒烟） | 需生产 Linux | `scripts/verify-nginx-prod.sh` | `nginx-prod-first-deploy-runbook.md` |
| P-6 | 生产 nginx reload | 需目标机执行 | `nginx -t && nginx -s reload` | 同上 |
| P-7 | Windows 部署实跑 | WSL2 环境待建 | `docs/deploy/windows-deployment.md` 步骤 | 同左 |
| P-8 | none 级流量观测立项 | 需业务/外部决策 | 8099 网关 access log | — |

---

## P-1 · 生产机安装/更新/回滚三脚本实跑

**现状**：容器内已验 EXIT=0（systemd ubuntu 22.04），生产机最终确认未做。

**前置条件**：Linux 生产机（systemd），部署用户可用 sudo；二进制产物就绪（或生产机可构建）。

**执行步骤**：

```bash
# ① 安装（首次部署）
./scripts/deploy/install.sh --prefix /opt/topems --user topems
#    --skip-build 可跳过本地构建（用已有二进制）
#    建议先 --dry-run 预演（--dry-run --skip-build）

# ② 更新（后续版本）
./scripts/deploy/update.sh --version <tag> --restart
#    --services erp,bi  仅更新指定服务

# ③ 回滚
./scripts/deploy/rollback.sh /opt/topems/backups/<backup_dir>
#    先 --dry-run 核对回滚计划，再实际执行
```

**验收标准**：
- install 后 `systemctl status topems.target` 为 active，服务全部 running（数量以实际生成单元为准；TODO.md 容器实跑口径为 29 个 systemd 服务）
- update 后新版本生效、服务无重启失败
- rollback 恢复指定备份且数据校验通过

---

## P-2 · systemd 服务启用后各服务 /health 绿

**现状**：本机无 systemd，无法验证；`scripts/dev/health-check.sh` 已就绪。

> ⚠️ **重要口径**：`scripts/dev/health-check.sh` 头部自述为 **LEGACY-DEV 非生产脚本**（直连旧端口 8000/8020/8010），并明确"生产唯一入口为 nginx upstream → :8099，**生产验收请使用 scripts/verify-nginx-prod.sh，勿用本脚本判定生产健康**"。生产 /health 验收以 P-3 为准。

**执行步骤**：

```bash
# 生产机执行（经 nginx 反代链路，覆盖全部已启用服务）
bash scripts/verify-nginx-prod.sh \
  --conf /etc/nginx/conf.d/topems.conf \
  --repo-conf ./deploy/nginx/topems.conf \
  --base http://<nginx-host> \
  --services "erp bi hrm portal core wms" \
  --probe "/health"
```

**验收标准**：冒烟端点全部 HTTP 200；无 5xx / 真 404。

---

## P-3 · 生产服务 /health 全绿

**现状**：`health-check.sh` 就绪（但按 P-2 口径，生产路径走 verify-nginx-prod.sh）。

**执行步骤**：同 P-2 命令（`--probe /health` 已覆盖各域健康检查）。如需逐服务核对，可对照 `docs/deploy/nginx-prod-first-deploy-runbook.md` §3.4 冒烟端点清单。

**验收标准**：全部服务 /health 200，`FAIL=0`。

---

## P-4 · 生产机 smoke-prod.sh 全项 PASS

**现状**：本机/容器演练已 20/20 通过（exit=0）；生产机层1 自动断言 + 层2 专项未复核。

**执行步骤**：

```bash
# 层1 自动断言（生产机，需显式凭据）
./scripts/deploy/smoke-prod.sh \
  --base http://<portal-url> \
  --user <admin> --password <pass> \
  [--insecure]   # 自签证书演练环境才需要

# 或环境变量方式
SMOKE_ADMIN=<u> SMOKE_PASS=<p> ./scripts/deploy/smoke-prod.sh --base http://<portal-url>
```

**层2 专项（人工按脚本指引复验）**：
- E. 财务凭证借贷平衡（后端已验 10000=10000）
- F. 工单下达事件化（uuid=text 修复后重验）
- G. 质量链 qms↔lims↔ehs 事件联动
- H. WS MES 看板推送（unified-core 投影）

**验收标准**：层1 全项 PASS（exit=0）；层2 四项专项逐项复验并记录。

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

## P-7 · Windows 部署实跑

**现状**：WSL2 环境待建；按 `docs/deploy/windows-deployment.md` 执行。

**执行步骤**（摘要，详见文档）：
1. 安装 WSL2 + Ubuntu（PowerShell 管理员：`wsl --install -d Ubuntu`），配置 `/etc/wsl.conf`
2. WSL 内搭建环境（基础依赖、Rust 工具链、pgvector、Redis）
3. 数据迁移：本机备份拷入 WSL（/mnt/c）→ 建用户/库 → 恢复（`ON_ERROR_STOP` + 空态核验）
4. 部署执行：仓库内 `./scripts/deploy/install.sh`（systemd 服务注册）
5. 开机自启：任务计划程序 `wsl.exe -d Ubuntu -u root -- systemctl start topems.target`
6. 对外暴露：WSL2 NAT → portproxy 配置

**验收标准**：install 成功、服务 running、数据恢复后业务冒烟通过、开机自启生效、外部可访问。

---

## P-8 · none 级流量观测立项

**现状**：待业务/外部立项。

**说明**：部署稳定后，对 8099 网关 access log 做 ≥30 天观测，确认 none 级（长期 0 请求）端点/服务，作为后续下线或冻结决策依据。此项不阻塞部署，可并行推进。

**交付物**：观测方案 + 30 天日志留存 + 汇总报告（建议归档至 `artifacts/audit/`）。

---

## 执行顺序建议

1. **P-5 → P-6**（nginx 验证 + reload，最先确认入口链路）
2. **P-1**（三脚本实跑，建立 systemd 服务）
3. **P-2 → P-3**（服务健康验收）
4. **P-4**（功能链路冒烟，层2 专项逐项复验）
5. **P-7**（Windows 环境，独立并行）
6. **P-8**（观测立项，不阻塞，可随时启动）

> 每完成一项：回到 `TODO.md` 对应行勾选并注明日期/提交/结果，回写本文档"执行记录"。
