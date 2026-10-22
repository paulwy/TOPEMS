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
| P-7 | Windows 部署实跑（WSL2+systemd） | WSL2 环境待建 | `docs/deploy/windows-deployment.md` + 本 checklist W0-W8 | 同左 |
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

## P-4.5 · RLS 租户隔离验证（生产部署后必做）

> 依据：`docs/onboarding/system-onboarding-and-gap-tracker.md` v1.39（17 real_module 批量补挂 RLS 请求层中间件）+ `database/scripts/verify_rls_coverage_production.sql` + `scripts/audit/audit-force-rls-no-policy.sql`。
> **前置**：已用 `topems`（owner）或 `topems_app`（受限业务用户）连接生产库。
> **连接串示例**：`psql "postgres://topems:password@prod-host:5432/topems"`

### R0 · 连接与角色确认

```bash
# 用 owner 连接（执行 DDL/审计）
psql "postgres://topems:topems_secret@prod-host:5432/topems"

# 或用受限业务用户连接（验证 RLS 过滤）
psql "postgres://topems_app:topems_app_secret@prod-host:5432/topems"
```

```sql
-- 确认当前角色与数据库
SELECT current_user, current_database(), version();

-- 确认 topems_app 角色存在且属性正确（RLS 对 superuser 不生效）
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles WHERE rolname IN ('topems', 'topems_app');
-- 预期：topems_app rolsuper=false
```

### R1 · RLS 覆盖率静态审计（只读）

```bash
psql "postgres://topems:topems_secret@prod-host:5432/topems" \
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
psql "postgres://topems:topems_secret@prod-host:5432/topems" \
  -v ON_ERROR_STOP=1 \
  -f scripts/audit/audit-force-rls-no-policy.sql
# 关注结果 3 汇总：with_tenant_id 数量即为需补策略的目标表数

# 2.2 统一补建/重建策略（幂等，可重复执行）
psql "postgres://topems:topems_secret@prod-host:5432/topems" \
  -v ON_ERROR_STOP=1 \
  -f scripts/db/rls-policy-unify.sql
# 输出 rebuilt <schema>.<table> policy <name> (<cmd>) 明细

# 2.3 补建后复跑 R1 验证（应全部归零）
psql "postgres://topems:topems_secret@prod-host:5432/topems" \
  -v ON_ERROR_STOP=1 \
  -f database/scripts/verify_rls_coverage_production.sql
```

### R3 · 租户隔离动态验证（核心）

```bash
# 用受限业务用户连接
psql "postgres://topems_app:topems_app_secret@prod-host:5432/topems"
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

**现状**：待业务/外部立项。

**说明**：部署稳定后，对 8099 网关 access log 做 ≥30 天观测，确认 none 级（长期 0 请求）端点/服务，作为后续下线或冻结决策依据。此项不阻塞部署，可并行推进。

**交付物**：观测方案 + 30 天日志留存 + 汇总报告（建议归档至 `artifacts/audit/`）。

**观测方案要点**：
- **日志来源**：nginx access log（`$request` 含 path + status + upstream）
- **采样频率**：每日汇总一次，保留 30 天原始日志
- **分析维度**：按 path 分组统计请求数，标记 30 天 0 请求的端点
- **输出格式**：`artifacts/audit/traffic-observation-30d.md`（含 none 级清单 + 建议处置：下线/冻结/保留）

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
