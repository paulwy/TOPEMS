# TOPEMS 部署适配任务书（xingzhai AI 执行版）

> 本文档由 airdeair 侧 AI 起草（2026-10-26），**供 xingzhai 侧 AI 助手按步骤执行**。
> 目标：把 TOPEMS 以生产形态部署到 xingzhai（macOS 宿主机）。
> 配套参考：`docs/deploy/macos-deployment.md`（人类阅读版指南）、`docs/deploy/windows-deployment.md`（同型先例）。
> 执行原则：**先检查后动手；每步验证；失败即停并记录报错全文，禁止猜测跳过；不改仓库代码；不破坏本机既有数据。**

---

## 0. 任务上下文（先完整读一遍再动手）

- **TOPEMS**：模块化单体 ERP/EMS 系统。对外唯一入口 = `topems-server` BFF（**端口 8099**），约 30 个服务适配器内嵌于单体，全仓部署以该单体为核心。
- **生产治理模型**：systemd（Linux 专用：`deploy/systemd/` 31 单元 + topems.target + `scripts/deploy/install.sh`）。**macOS 无 systemd** → 本任务书主线 = **原生 macOS + launchd 适配**；若本机具备 Linux 虚拟机（UTM/lima/OrbStack），优先切换 §7 方案 A（与原生产零差异）。
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
  --password "$(cat ~/topems/secret/pg.txt)" --create-db --init-schema

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
    <key>DATABASE_URL</key><string>postgres://topems:<实际PG密码>@localhost:5432/topems</string>
  </dict>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>/Users/<USER>/topems/logs/server.out</string>
  <key>StandardErrorPath</key><string>/Users/<USER>/topems/logs/server.err</string>
</dict></plist>
PLIST
launchctl load ~/Library/LaunchAgents/com.topems.server.plist
sleep 3 && curl -s -m 5 http://localhost:8099/health && echo " <- BFF OK"
```

> 若配置管理用 `config/env/` 模板：模板内 `DATABASE_URL` 同样替换为本机连接串（密码来自 secret 文件）。
> 其余服务（erp/finance/hrm…）**不单独启动**——单体已内嵌；确需独立服务时按 `deploy/systemd/*.service` 的 ExecStart 逐条对照写 plist。

## 6. nginx（drill 适配版）

```bash
bash scripts/gen-nginx-drill-conf.sh /opt/topems-nginx
# 生成物为 macOS 可加载 conf：已剥离 epoll/brotli/www-data，pid 用本机前缀，
# 证书为自签，upstream 统一 localhost:8099（生产口径）

nginx -t -c /opt/topems-nginx/topems-drill.conf && nginx -c /opt/topems-nginx/topems-drill.conf
curl -sk -m 5 https://localhost/health && echo " <- NGINX OK"
```

## 7. 方案切换决策（Linux 虚拟机优先）

- **若本机已装 UTM / lima / OrbStack 且资源充足（≥8GB 可分配 VM）** → 改用**方案 A**（与 Linux 生产零差异）：
  - 建 Ubuntu 22.04 VM（systemd 完整），宿主端口转发 22/80/443/5432 → VM。
  - VM 内：`install.sh` + systemd 单元 + `deploy/nginx/topems.conf` **原样**（epoll/www-data/brotli 满足）。
  - 细节见 `docs/deploy/macos-deployment.md §2`。
- **否则**按本任务书 §2-§6 原生路径执行（B 方案，差异对照见 macos-deployment.md §3/§5）。

## 8. 验收清单（全部 ✅ 才算完成）

- [ ] `curl http://localhost:8099/health` == 200（BFF 直连）
- [ ] `curl -sk https://localhost/health` == 200（nginx → 8099 链路）
- [ ] 迁移：`scripts/migration/validate.sh` 0 errors / 0 checksum errors
- [ ] 契约 smoke：`python3 scripts/web_contract_smoke.py` 0 FAIL
- [ ] smoke-prod：`bash scripts/deploy/smoke-prod.sh --base localhost:8098` 全 PASS（按实际可达域收窄 services 参数）
- [ ] 端口冲突、密码、偏离项已在 `~/topems/deploy-notes.md` 记录

## 9. 安全红线（违反即中止并向 airdeair 侧回报）

1. **禁止**删除/覆盖本机既有任何数据库、数据文件或他人配置。
2. 密码/密钥只进 `~/topems/secret/`（chmod 600），**禁止**提交仓库、写入公开日志。
3. 任何一步失败：停止，记录报错全文与环境差异，**不猜测、不跳过、不换法重试超过 2 次**。
4. **只部署，不改代码**。发现仓库 bug 或需适配改动 → 回报 airdeair 侧，由仓库侧决定。
5. 未通过 §8 验收前，不得对外宣称部署完成。
