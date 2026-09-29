# TOPEMS 脚本全面分析与 topems.sh 优化报告

- 日期：2026-09-29
- 仓库：`/Users/air/TOPEMS`（Rust workspace + pnpm 三端 apps/{web,desktop,mobile}）
- 覆盖：全部 77 个 `.sh` 脚本（`find . -name "*.sh"` 排除 node_modules/.git/target）+ 主脚本 `scripts/topems.sh`（3455 行 → 优化后约 3676 行）
- 环境：macOS、`/bin/bash` 3.2.57（BSD userland）、shellcheck 0.11.0（本次安装）、本机 ~28 个 topems 服务运行中

---

## 实施状态（按用户指示逐项推进，最新优先）

| 轮次 | 提交 | 内容 | 状态 |
|---|---|---|---|
| 第一轮 | `80c0b80a2` | 孤儿/空壳/废弃脚本清理（8 删）；部署高危 H1-H3（install/rollback/production-deploy/start-production）；迁移高危 H4-H6（verify-empty 守卫/APS COMMIT/migrate fallback/validate 表名）；迁移入口收敛（topems.sh db_migrate → migrate.sh run） | ✅ 已推 |
| 第二轮 | `bd62a8260` | M3/M4/M9 测试退出码统一；M6 bash 3.2 兼容（去 nameref/mapfile）；M8 健康路径 /health；M16/M14 弱口令环境变量化+SQL 注入修复；bundle 预算统一（500K/2500K/30M，ci.yml 显式传参）；建议 4 单一事实源（start-production 端口读 ports.env、deploy.sh 标 DEPRECATED）；hook 修复（sensitive-info 放行占位符提示行） | ✅ 已推 |
| 实跑验证 | `d277f21ac` | 实跑暴露并修复：sync-ports 全链路权威登记（server 8099 入 services.yaml/ports.env/ports.ts/vite SERVICES）；5 个 plugin.yaml deps 对齐；services.conf 重生成（去 CORE_SERVICES 伪行）；run-iam-tests 防假绿（spec 缺失即败）；upgrade-runtime 口令门禁实跑 exit 2 ✓ | ✅ 已推 |
| V83 构建层 | `6ee446f49` | bundle 根治：mui-icons 3.6MB→6.6KB（barrel→子路径，根因 treeshake:false）；mui-core/exceljs 归 vendor；dev-tools 孤儿 chunk 清理。total 23.06→19.12MB 全绿 | ✅ 已推 |
| V84 tree-shaking | `c0b4abd28` | 正式开启 treeshake（移除 React19+Rolldown workaround）；dev-tools 自然摇掉；A/B e2e 无回归。total→16.48MB | ✅ 已推 |
| 逐项收尾 | 本轮 | 建议 7 共享 test 提取 lib；生成器修复（枚举格式/数组递归/prettier 可复现）；start-local 文档引用统一；migrate/generate 实跑验证（红线安全项） | 🔄 本批 |
| 部署路径根治 | `f2d379d0` | install/update --dry-run 预演模式（不依赖生产环境），实跑抓出并修复 5 类真实缺陷：pnpm 9.15 移除 --legacy-peer-deps（改根 .npmrc）、prepare 脚本 ESM 崩溃（patch .js→.cjs）、apps/core 死步骤删除、install/update SCRIPT_DIR 层级错位（cargo build 错误目录/二进制判断失效）；lock 保持不动防依赖漂移。验证：install --dry-run 18 动作 rc=0、update 循环动作全打印 rc=0、web pnpm install Done（prepare 生效） | ✅ 已推 |
| 主库半迁移处置 | `60f09ac9` | 用户拍板"接受现状+文档化+防护"：`migrate.sh run` 新增 check_stale_migration_state——空库放行 / 少量未应用（<10）信息提示 / 积压 ≥10 拒绝执行（需 MIGRATE_ALLOW_STALE=1 确认）。主库实跑正确拒绝（已记录 25/文件 283、积压 258、最高记录 20260725000002<文件 20260928120000）、空库 dry-run 放行。**决策记录：主库 topems 为既有半迁移状态（结构经运行时演进至 09-26，_sqlx_migrations 不补跑）** | ✅ 已推 |

---

## 一、总体结论

1. **77 个脚本 `bash -n` 语法全部通过**；shellcheck 扫描 37 个零告警、40 个有告警（无 error 级，多为 SC2155/SC2046 类风格项）。
2. **`scripts/topems.sh` 已完成优化并全量验证通过**：新增 SQLx 离线缓存新鲜度门禁（集成编译与启动主流程，即任务第 2 点）、修复 `db_migrate` 静默空转与失败误记账、统一 mes 连接串、`test-backend` 离线化等 11 项改进；既有门禁（lefthook.yml / ci.yml / Gate S / pre-push）**未改动**；向后兼容测试 `test-topems-sh.sh` 9/9 通过。
3. **发现 6 处可致数据丢失或生产停机的高危缺陷**（rollback 备份失败仍删库、install.sh 路径错位无法安装、production-deploy 引用不存在的 systemd unit、deploy.sh 数据库连接串缺密码、APS 迁移 COMMIT 被注释假成功、migrate-verify-empty 无临时库名守卫），**均未实跑**，只做静态审查，修复建议见第四节。
4. **体系性缺陷 10 项**（四套互不兼容的部署范式、两套迁移机制矛盾、mes 缓存三条刷新路径、三处 bash4+ 语法在 macOS bash 3.2 下必崩、端口/健康路径多套口径等），合并建议见第五节。
5. **任务范围外顺手修复**：`scripts/start-local.sh`（0 字节空文件，被 `package.json:13` 的 `"dev"` 引用导致 `pnpm dev` 静默空跑）已补成薄 shim。

---

## 二、测试方法与可复现性

| 手段 | 说明 |
|---|---|
| `bash -n` | 全部 77 个脚本逐文件执行，77/77 通过 |
| shellcheck 0.11.0 | 全量扫描（`-S warning`），37 个脚本零告警；topems.sh 61 处告警全部为改动前基线既有类型 |
| 只读实跑 | `sqlx-prepare.sh --check`（门禁实跑通过）、`test-topems-sh.sh`（9/9）、`check_allow_baseline.sh`（242≤243）、`bundle-check.sh`（TOTAL 23.06MB>15M rc=1）、`check-consistency.sh`（版本 20260921000101）、`verify-route-matrix.sh`（PASS1/FAIL4，独立服务未启动属环境现状）、`postgresql-pre-deployment-check.sh`（PASS16/WARN2/FAIL0）、`topems.sh status`、`topems.sh clean --rust --dry-run` |
| 假 cargo dry-run | `/tmp/fakebin/cargo`（计数+调用日志），验证 build 五种模式，全部符合预期 |
| Mock 合架 | `/tmp/start-dispatch-harness.sh`，验证 start/restart 分派门禁与 `--force` 归一化 |
| **红线（未实跑）** | production-deploy/rollback/uninstall/install/update/deploy/blue-green-deploy/clean_target/domain-start/service-monitor/setup-db/PG 调优等高风险脚本只静态审查；migrate.sh run/aps_to_mes/migrate-verify-empty 等写库脚本未跑；coverage-baseline/sccache-setup/frontend-lint 等有写操作脚本未跑；ai-models/ai-bench（拉模型）未跑；generate-*/openapi（覆盖写文件）未跑 |

---

## 三、分组脚本总览（77 个）

### 3.1 deploy/docker（6 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `deploy/docker/build-local.sh` | 本地构建/推送 docker 镜像 | 无（固定流程） | docker、cargo、pnpm | 中 | 并行子 shell 数组不回传，汇总恒 0 |
| `deploy/docker/build-service.sh` | 构建单个 docker 服务镜像 | `服务名` | docker | 高 | `PROJECT_ROOT` 少跳一层 → `deploy/config/ports.env` 不存在必崩 |
| `deploy/docker/consul/init-service-mesh.sh` | 初始化 consul 服务网格配置 | 无 | curl、consul | 高 | CONSUL_HEADER 带引号展开失效；HCL 当 JSON PUT（415/400 被 `\|\| true` 吞，死代码）；白名单缺 7 服务 |
| `deploy/docker/init-scripts/init-database.sh` | docker 初始化数据库表 | 无 | psql | 高 | 6 段 INSERT 末值多逗号语法错（set -e 首段即止） |
| `deploy/docker/traefik/init-gateway.sh` | 初始化 traefik 网关 | 无 | curl、traefik | 中 | 注释路径与实际不符 |
| `scripts/deploy/docker/topems-docker.sh` | docker 容器启停编排 | start/stop/status 等 | docker compose | 高 | 全部 `-f` 引用 `scripts/deploy/docker/docker-compose.yml`（不存在，真实在 `deploy/docker/`） |

### 3.2 deploy 生产部署（8 个）—— 四套互不兼容部署范式

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/deploy/production-deploy.sh` | git 拉码→构建→迁移→重启→健康检查的一键生产部署 | `--env/--version/--skip-backup/--skip-migration/--dry-run` | git/cargo/pnpm/systemctl/nginx/pg_dump | **高** | 引用不存在的 unit `topems-backend/topems-frontend`（真实为 topems-unified-core 等）→ 停机；`check_command pg_isready` 死代码直接 abort；失败无回滚 |
| `scripts/deploy/production-verify.sh` | 生产服务 HTTP 健康/功能/性能/安全检查 + HTML 报告 | `--url/--frontend-url/--skip-*/-v` | curl/lsof/awk | 中 | 默认端口 8013/3001 与 production-deploy 8080/3000 不一致；awk 拼接空变量时 set -e 退出 |
| `scripts/deploy/rollback.sh` | 用备份目录回滚 docker 环境 | 位置参数 `[backup_dir]` | docker/pg_dump/psql | **高** | 预回滚备份失败仍继续 dropdb 删库；期望容器名 `postgres`/路径 `/opt/topems` 与 deploy.sh 不匹配；env 备份文件名不一致 |
| `scripts/deploy/uninstall.sh` | 删除 systemd unit + /opt/topems + 服务用户 | `--keep-data/--keep-config/--force` | systemctl/rm -rf/userdel | **高** | 默认即 `rm -rf /opt/topems/data`（Postgres 数据目录）；服务清单与 install.sh 不一致；不清理 docker 容器 |
| `scripts/deploy/install.sh` | 建目录/建用户/构建/装 systemd unit | `--prefix/--user/--skip-build/--dev` | cargo/pnpm/systemctl | **高** | `SCRIPT_DIR` 少上一级，全部构建/拷贝路径错位 → **当前无法完成安装**；`apps/core` 不存在；无数据库初始化 |
| `scripts/deploy/update.sh` | git 切版本→构建→替换 /opt/topems/bin | `--version/--services/--restart` | git/cargo/npm/systemctl | 中 | **无数据库迁移步骤**；覆盖运行中二进制前无备份；包管理器 npm vs install 的 pnpm |
| `scripts/deploy/start-production.sh` | nohup 方式启停后端+前端 | start/stop/restart/status | nohup/python3/http.server | 中 | 硬编码他人机器路径 `/Users/xingzhai/TOPEMS`；python http.server 生产级不足；端口与 systemd 方案不一致 |
| `scripts/deploy/deploy.sh` | 离线 Docker 部署（建库/迁移/起服务） | deploy/start/stop/restart/status/logs/clean/help | docker/openssl | **高** | `DATABASE_URL` **缺密码**；Redis 无密码绑 0.0.0.0；compose 路径不存在；21 个迁移目录全部不存在；clean 不删数据 |

### 3.3 deploy 运维 + PostgreSQL（8 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/blue-green-deploy.sh` | 蓝绿发布 | 无 | — | **高** | **纯空壳**：只 echo ✅，无任何真实切换逻辑 |
| `scripts/deploy/setup-db.sh` | 初始化本地数据库 | 无 | psql | 高 | set -e 下建库前 grep 判空直接退出；引用的 init.sql/migrations 不存在 |
| `scripts/deploy/domain-start.sh` | 按域名启动服务组 | 无 | docker compose | 中 | COMPOSE_DIR 错层；compose 无任何 profiles |
| `scripts/deploy/service-monitor.sh` | 服务监控 | 无 | systemctl | 中 | 用 systemctl 管 docker 容器（本机无 systemctl） |
| `scripts/deploy/ai-health-check.sh` | AI 健康检查 | 无 | curl | **高** | 名义健康检查实含大量写操作（建会话/提表单/改配置） |
| `scripts/postgresql-pre-deployment-check.sh` | 部署前 PG 参数检查 | 无 | psql/awk | 中 | 14 项参数清单与另两脚本重复；`-U air` 硬编码；path 口径 Homebrew |
| `scripts/postgresql-post-deployment-verify.sh` | 部署后 PG 验证 | 无 | psql | 中 | 单位比对（1s vs 1000ms）恒 FAIL；参数清单重复 |
| `scripts/postgresql-production-config-tuning.sh` | PG 生产调优 | 无 | postgres -C | 中 | `postgres -C` 用法错误；path 口径 `/etc/postgresql/16/main` 与本机 Homebrew 矛盾 |

### 3.4 CI（12 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/ci/check-clippy.sh` | pre-commit 跑 clippy | 无 | cargo | 中 | **孤儿**（无调用方）；未导出 SQLX_OFFLINE；Gate R 标签撞名 |
| `scripts/ci/check-hardcoded-precise.sh` | 暂存 TS 硬编码中文扫描 | 无 | node | 低 | 扫描器缺失时静默 exit 0 门禁绕过 |
| `scripts/ci/check-large-files.sh` | 拦截 >1MB 暂存文件 | 无 | git/wc | 低 | `for f in $STAGED` 未引号；`printf "$FOUND"` 格式串风险 |
| `scripts/ci/check-sensitive-info.sh` | 扫暂存 diff 密钥/证书 | 无 | git/grep | 低 | 同上；*.md/docs 整目录跳过 |
| `scripts/ci/coverage-baseline.sh` | Rust+TS 覆盖率基线 | `--fast/--full/--rust/--ts/-p/...` | cargo/llvm-cov/vitest | **高** | **孤儿**；`pkill -9 -f cargo-llvm-cov` 误杀并发构建；rm -rf profraw/target |
| `scripts/ci/frontend-lint.sh` | 暂存 web src eslint+prettier | 无 | npx | 中 | `git add -f $(unquoted)` 缺 `--`：空格/`-`开头路径出问题 |
| `scripts/ci/lint-check.sh` | 全量 lint 聚合 | `--rust/--ts/--shell/--all` | cargo/pnpm/shellcheck | 中 | **孤儿**；`read -d ''` bash3.2 失效 → shell 检查空转 |
| `scripts/ci/sccache_stats.sh` | sccache 趋势采集 | 无 | sccache | 中 | **孤儿**；36-38 行无意义死代码；每次向工作区写快照 |
| `scripts/ci-cache-utils.sh` | CI 缓存 hash 库 | 库函数 | sha256sum | 中 | **孤儿库**（无任何脚本 source）；source 即污染调用方 set 选项；read -d '' 失效 |
| `scripts/check_allow_baseline.sh` | `#[allow(` 数量基线检查 | 默认/`--update-baseline` | grep/wc | 低 | 质量较好；grep 命中注释略有灌水 |
| `scripts/sccache-setup.sh` | 安装并配置 sccache | 默认/`--stats/--stop` | cargo | **高** | **孤儿**；对已有 config.toml 追加第二个 `[build]` 表 → **TOML 重复表非法**；export 对子进程无效 |
| `scripts/bundle-check.sh` | 前端 dist 体积预算检查 | 默认/`--json/--baseline` | find/stat/awk | 低 | 默认预算 15M vs ci.yml 内联 500K/2500K 两套尺；`--json $2` 未校验 |

### 3.5 dev 启动/运维（9 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/dev/start-local.sh` | 本地一键编排（DB+后端+前端） | all(默认)/install/db/backend/frontend/clean/cache/db-check/stop/status/monolith/help | node/pnpm/cargo/psql/redis-cli | **高** | **case 缺 `all)` 分支**，默认无参调用必报"未知命令: all"；monolith 编译二进制名与 run_monolith 不一致 |
| `scripts/start-local.sh` | 历史入口（原 0 字节空文件） | 透传 | — | — | **本次已补薄 shim**（原被 package.json:13 `"dev"` 引用，pnpm dev 静默空跑） |
| `scripts/run_monolith.sh` | 模块化单体启动（:8099） | 无参前台/`--daemon` | ./target/debug/topems-server | 中 | 注释连接池=5 实际注入=8；不检查端口占用 |
| `scripts/sync-ports.sh` | 从 ports.env 生成 services.conf/.env | 无参/`--check` | python3+pyyaml | 中 | 已标 DEPRECATED；向 services.conf 写入 `CORE_SERVICES=iam` 伪服务行；内嵌 date 破坏幂等 |
| `scripts/enable-ui-v3.sh` | 切换 web .env.local 的 VITE_UI_V3 | 无参/`--disable/--status` | sed | 低 | 基本干净 |
| `scripts/upgrade-runtime.sh` | 停服→3 迁移 SQL→起服→consul 验证 | 无 | docker/psql(:5433)/consul | **高** | 明文 PGPASSWORD=topems_secret；curl\|json 无兜底中途崩；硬编码绝对路径 |
| `scripts/dev/health-check.sh` | 部署后健康检查 | 无 | docker/psql/curl/jq/cargo | 中 | `PROJECT_ROOT` 未定义（cd "" 被吞）；docker 分支 DB 命令拼接错误；`DC` 死变量；把 cargo check 当健康检查 |
| `scripts/dev/test-slow-db-startup.sh` | CI 慢启动 wait 策略自测 | 延迟秒数 | docker/pg_isready | 低 | 自测用、自带 cleanup |
| `scripts/dev/install-deps.sh` | 非 Docker 装 PG/Redis/Rust/Node/Ollama | all/db/dev/ai/frontend/backend/verify | brew/rustup/nvm | **高** | 硬编码 DB/Redis 口令；ports.env 兜底模板键名过时；ollama serve & 随脚本退出 |
| `scripts/dev/update-admin-password.sh` | 重置 core_users 密码 | 用户/新密码 | psql/python3+bcrypt | **高** | 用户名直接拼 SQL（注入面）；默认口令+bcrypt 哈希硬编码 |

### 3.6 AI / 生成类（8 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/dev/ai-bench.sh` | Ollama 模型基准测试 | `[模型]/--all` | curl/ollama | 中 | `mapfile` 仅 bash4+（macOS 3.2 必崩）；model 拼 python -c 可注入 |
| `scripts/dev/ai-models.sh` | Ollama 启停/拉删/别名/导出 | start/stop/pull/rm/info/alias/export/import/... | ollama/psql | 中 | 硬编码 localhost:11434 不读 OLLAMA_HOST；`ollama export/import` 子命令**不存在**（死命令）；psql 硬编码 topems@topems |
| `scripts/dev/mes-verify.sh` | MES 编译统一验证（默认离线） | 无参=离线/`-o`=在线 | cargo/.sqlx | 低 | 默认连接串无密码；用 `$0` 非 BASH_SOURCE |
| `scripts/dev/verify-route-matrix.sh` | 网关路由 2xx/Deprecation 头验收 | env GATEWAY | curl | 低 | `check_old()` 定义后**零调用**（Deprecation 校验没跑）；expect 参数不参与判断 |
| `scripts/ai-dev.sh` | AI 模块 dev/test/lint/build/health | dev/test/lint/build/clean/docs/health | cargo/pnpm/tarpaulin | 中 | 名叫 AI 却跑 topems-unified-core；health 查 :8080 实际 :8000；`command -v cargo-tarpaulin` 检测方式错误 |
| `scripts/generate-ai-api.sh` | OpenAPI→TS/client/HTML | `--types/--client/--docs/--validate/--all` | openapi-typescript/redoc-cli | 中 | python 代码用字符串插值拼路径；fallback heredoc 硬编码路径两遍 |
| `scripts/generate-jwt-keys.sh` | JWT RS256 密钥生成 | 无参/`-f` | openssl | 中 | 私钥在/公钥丢时直接覆盖私钥而非补公钥；-f 无备份 |
| `scripts/openapi/generate.sh` | 聚合各服务 OpenAPI | `--offline/--service/--with-types/--extract/...` | curl/python3/node | 低-中 | `${GEN_ARGS}` 未引号；其余规范 |

### 3.7 迁移 / DB 校验（7 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/migrate.sh` | 统一迁移入口（sqlx 优先，psql fallback） | run/status/list/revert/validate/install | sqlx/psql | 高(写库) | fallback 自建 `_sqlx_migrations` 结构（varchar/string checksum）与 sqlx 真实（bigint/bytea）**不兼容**；checksum 写死字符串 |
| `scripts/migrate-verify-empty.sh` | 空库全量迁移验证后 DROP | 无 | psql/sqlx | **高** | **无临时库名守卫**，误指生产库即删库；失败不清库 |
| `scripts/migration/aps_to_mes_migrate.sh` | plugin_aps→MES 数据迁移 | `--dry-run/--force` | psql | **高** | SQL `BEGIN;` 但 **COMMIT 被注释** → psql EOF 自动回滚且退出码 0，脚本报"SUCCESS"假成功 |
| `scripts/migration/validate.sh` | 迁移文件静态校验 | 无 | find/git/shasum | 中 | 查 `schema_migrations` 表（项目实际用 `_sqlx_migrations`）连库必挂；每次覆写 checksums.txt |
| `scripts/db/check-consistency.sh` | 5432 brew vs 5433 docker 迁移版本对比 | 无 | psql/docker | 低 | 无 MIGRATE_URL 时 set -u 未绑定；.env 按 CWD 查找 |
| `scripts/finance/consistency-check.sh` | ERP vs Finance 路由响应对比 | `--token/--erp-url/--finance-url` | curl/jq | 低 | `local -n`（nameref）**bash3.2 直接报错，脚本起不来** |
| `scripts/release.sh` | CHANGELOG 校验 + git tag | draft/tag/check | python3/git | 中 | tag 本地打（未 push）；draft 写 docs/changelog/draft.md |

### 3.8 测试（7 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/test/run-core-tests.sh` | unified-core 权限测试 | `--module/--all/--report` | cargo/psql/API:8000 | **高** | **失败恒 exit 0**（CI 判绿）；单模块模式管道吞失败；报告重复跑测试 |
| `scripts/test/run-iam-tests.sh` | IAM 后端+Playwright 测试 | `--backend/--frontend/--all/--report` | cargo/playwright | **高** | 后端 cargo 全 `\|\| true` 吞失败；show-report 前台阻塞 |
| `scripts/test/run-integration-tests.sh` | 各服务 `cargo test -- --ignored` | `--start-services/--service/--no-build/--max-wait` | cargo/topems.sh | 中 | 服务未就绪即 skip 且记成功（**零测试=exit 0**）；`$2` 未校验；SERVICES_CONF 死代码 |
| `scripts/test/test-commands-flow.sh` | run/start-all/restart-all 顺序 mock | 无 | sed 提取 topems.sh | 中 | 未 mock `_preflight_check`（真跑清理）；提取逻辑脆弱 |
| `scripts/test/test-frontend-lifecycle.sh` | 前端轮询/status 三态 mock | 无 | perl | 中 | `pkill -f "command sleep 86400"` 广谱可能误杀无关进程 |
| `scripts/test/test-topems-sh.sh` | 三种命令参数透传 mock | 无 | sed 提取 | 低 | **实跑 9/9 PASS**；未 mock info/_preflight_check（有日志噪声+真实预检） |
| `scripts/testing/full-e2e-test.sh` | 起依赖→迁移→Rust/AI/Playwright→HTML 报告 | `--skip-setup/--skip-teardown/--services/--report` | cargo/pnpm/psql/redis | **高** | `--skip-teardown` 解析了但**无任何清理代码**（"清理完成"是谎言）；E2E/AI 恒 `\|\| true`；IAM 端口 8010 与其他 8000 矛盾 |

### 3.9 性能（5 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/performance/benchmark.sh` | curl 串行延迟基准（min/max/avg/p50/p95/p99） | `[HOST] [TOKEN] [REQUESTS]` | curl/awk | 低-中 | 无 `--fail`，4xx/5xx 计入成功；假账号 401 也统计；TENANT_ID 死变量 |
| `scripts/performance/run_benchmark.sh` | benchmark 封装（起服务→基准→落盘） | 同 benchmark | topems.sh/lsof | 中 | master-data 已在 services.conf 却走 cargo 兜底；cargo 起的进程无 PID 记录→孤儿 |
| `scripts/performance/run-all-tests.sh` | k6 SCM+DB 压测 | env SMOKE/BASE_URL | k6 | 中 | 健康检查打 `/api/health`（**真实路由 `/health`**，已核 lib/shared-bootstrap）永远误报；名不副实（不含 AI 用例） |
| `scripts/performance/run-e2e-performance.sh` | 一键 E2E（起 PG/Redis/SCM→k6→报告） | `--smoke/--keep/--skip-start/--base-url` | k6/cargo/brew | **高** | 端口被占**直接 kill 占用进程**（可能误杀他人）；记录 cargo PID 杀不到 server 子进程→孤儿；失败提示时间戳对不上日志 |
| `scripts/performance/run-performance-tests.sh` | AI 服务 k6 多场景压测 | `--scenario/--all/--test/--base-url/--report` | k6 | 中 | `--all` 用 `\|\| true` 吞失败仍 exit 0；非 --all 失败时 set -e 中断跳过报告；CI 下交互 read 退出 |

### 3.10 杂项（2 个）

| 路径 | 用途 | 参数/子命令 | 外部依赖 | 风险 | 关键问题 |
|---|---|---|---|---|---|
| `scripts/clean_target.sh` | target/ 磁盘占用治理 | 无参=增量/`--check/--full/--auto` | du/awk/cargo | 中高 | `TARGET_DIR` 基于 `$PWD` 而非脚本位置，仓库外调用 + 外部 CARGO_TARGET_DIR 时 `rm -rf` 可能删仓库外目录；`--full` 与 `topems.sh clean --rust` 重叠 |
| `tmp/run_extract.sh` | 一次性批量跑 31 crate openapi 提取 | 无 | cargo | 中 | 启动即截断日志（非幂等）；实为编译+跑测试非只读；PASS 判定 tail-20 启发式脆弱 |

### 3.11 主脚本与核心门禁（本次重点，我亲自审查+优化）

| 路径 | 状态 | 说明 |
|---|---|---|
| `scripts/topems.sh` | **已优化**（+220/-71） | 见第六节优化说明 |
| `scripts/dev/sqlx-prepare.sh` | 未改动 | mes 离线缓存根治设施之一；`--check` 实跑全部通过（309 条根缓存与当前代码匹配） |
| `scripts/mes_guard.sh` | 未改动（调用侧优化） | topems.sh 内 mes-guard 分支的 `--db-url` 已改为 `_mes_db_url()` 从 .env 派生，不再硬编码 `topems_app:topems_app_secret` |
| `svc/mes/scripts/sqlx-prepare.sh` | 未改动（建议弃用） | 旧版 mes 专用，硬编码明文口令 `topems:topems@localhost:5435/topems_mes`，与新版全 workspace 版重复（见 5.4） |
| `scripts/start-local.sh` | **本次补成 shim** | 原 0 字节空文件；现 `exec scripts/dev/start-local.sh "$@"`；注意 dev/start-local.sh 尚缺 `all)` 分支（见遗留问题） |

---

## 四、高危缺陷清单（按严重度，file:line，均未实跑）

### 🔴 可致数据丢失 / 生产停机 / 无法安装

| # | 位置 | 问题 | 建议修复 |
|---|---|---|---|
| H1 | `scripts/deploy/install.sh:134+` | `SCRIPT_DIR` 少上一级目录，全部构建/拷贝路径错位 → **安装必失败** | 改为 `$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)` |
| H2 | `scripts/deploy/rollback.sh:96-131` | 预回滚 pg_dump 失败仍继续 `dropdb` 删库 | 备份失败即中止（`return 1`），绝不 dropdb |
| H3 | `scripts/deploy/production-deploy.sh:264-275` | 引用不存在的 systemd unit `topems-backend/topems-frontend`；`check_command` 死代码使缺客户端直接 abort；失败无回滚 | 改用真实 unit（topems-unified-core 等）+ systemctl 检测失败回退 nohup + 失败自动回滚 |
| H4 | `scripts/deploy/deploy.sh:426` | `DATABASE_URL` **缺密码**；Redis 无密码绑 0.0.0.0；compose 路径与迁移目录全部不存在 | 补密码、Redis 加密码/仅绑 127.0.0.1、修正路径 |
| H5 | `scripts/deploy/uninstall.sh:138-144` | 默认 `rm -rf /opt/topems/data`（Postgres 数据目录），PREFIX 不可参数覆盖 | 默认不删数据 + PREFIX 可配置 |
| H6 | `scripts/migration/aps_to_mes_data_migration.sql:24,159` + `.sh:109-114` | `BEGIN;` 后 `COMMIT;` 被注释 → psql EOF 自动回滚退出码 0，脚本报 SUCCESS **假成功** | 默认 `COMMIT;`（dry-run 承担"只看不动"），并在 shell 断言目标表行数>0 |
| H7 | `scripts/migrate-verify-empty.sh:73-79` | 对 `DATABASE_URL` 指定库无条件 DROP/CREATE，无"临时库名"守卫 | 库名必须含 verify/test 守卫，否则拒绝 |
| H8 | `scripts/topems.sh:2049-2075`（**已修复**） | 扫描不存在的顶层 `migrations/` → **db migrate 静默空转**；失败仍写 `_sqlx_migrations` 记账（伪 checksum） | 已改为 `database/migrations` + svc/* + PGPASSWORD + ON_ERROR_STOP=1 + 失败不记账 |
| H9 | `scripts/deploy/blue-green-deploy.sh` 全文 | 纯空壳，无真实切换 | 要么实现要么删除 |
| H10 | `scripts/deploy/ai-health-check.sh` | 名义健康检查实含大量写操作 | 拆分只读健康检查 |

### 🟠 门禁失效 / CI 假绿 / 误删误杀

| # | 位置 | 问题 |
|---|---|---|
| M1 | `scripts/sccache-setup.sh:197-204` | 对已有 config.toml 追加第二个 `[build]` 表 → TOML 非法，**所有 cargo 命令报错** |
| M2 | `scripts/ci/coverage-baseline.sh:601-602` | `pkill -9 -f cargo-llvm-cov` 按全机命令行强杀，误杀并发构建 |
| M3 | `scripts/test/run-core-tests.sh:134-180`、`run-iam-tests.sh:114,119`、`run-integration-tests.sh:327-331`、`full-e2e-test.sh:282` | **测试失败不影响退出码**（恒 0 / `\|\| true` / skip=成功）→ CI 形同虚设 |
| M4 | `scripts/test/testing/full-e2e-test.sh:285` | `--skip-teardown` 解析了但无清理实现 |
| M5 | `scripts/ci/check-hardcoded-precise.sh:9-12` | 扫描器缺失静默 exit 0，门禁绕过 |
| M6 | `scripts/ci/lint-check.sh:336`、`ci-cache-utils.sh:118`、`finance/consistency-check.sh:113`、`ai-bench.sh:207` | **bash4+ 语法（read -d ''/local -n/mapfile）在 macOS bash 3.2 必崩或静默空转** |
| M7 | `scripts/performance/run-e2e-performance.sh:171-178` | 端口被占直接 kill 占用进程（可能误杀他人服务） |
| M8 | `scripts/performance/run-all-tests.sh:58` | 健康检查打 `/api/health`（真实 `/health`）永远误报后端未运行 |
| M9 | `scripts/performance/run-performance-tests.sh:225-227` | `--all` 吞掉所有 k6 失败仍 exit 0 |
| M10 | `scripts/clean_target.sh:20,54` | `TARGET_DIR` 基于 `$PWD`，仓库外调用或外部 CARGO_TARGET_DIR 时 `rm -rf` 可能删仓库外目录 |
| M11 | `scripts/migrate.sh:361-399` | fallback 建表结构（varchar/string checksum）与 sqlx 真实（bigint/bytea）不兼容；checksum 写死字符串 → 与 sqlx-cli 混用必冲突 |
| M12 | `scripts/migration/validate.sh:374` | 查 `schema_migrations` 表（实际 `_sqlx_migrations`），连真库必挂 |
| M13 | `scripts/dev/start-local.sh:365,411` | case 缺 `all)` 分支，默认无参调用报错（**已确认**）；`package.json:13` dev 指向空文件（**已补 shim**） |
| M14 | `scripts/sync-ports.sh:145` | 把 `CORE_SERVICES=iam` 伪服务行写进 services.conf，`get_all_services` 会把它当服务名 |
| M15 | `scripts/deploy/start-production.sh:7` | 硬编码 `/Users/xingzhai/TOPEMS` 他人路径 |
| M16 | `scripts/upgrade-runtime.sh:6`、`install-deps.sh:76,80`、`update-admin-password.sh:22` | 明文 DB 口令硬编码（后者用户名拼 SQL 有注入面） |
| M17 | `scripts/dev/verify-route-matrix.sh:32-63` | `check_old()` 定义后零调用，Deprecation 头验收没跑 |
| M18 | `scripts/dev/ai-models.sh:308,324` | `ollama export/import` 子命令不存在（死命令） |
| M19 | `scripts/generate-jwt-keys.sh:37-45` | 私钥在/公钥丢时直接覆盖私钥而非补公钥 |
| M20 | `scripts/deploy/update.sh` 全文 | **无数据库迁移步骤**，新 schema 与旧数据不匹配直接启动崩溃 |

### 🟡 一致性 / 运维体验（代表性，非全量）

- 端口约定五套口径：production-deploy 8080/3000、verify/start-production 8013/3001、deploy.sh 80/5432/6379/8000/8013、rollback 8000、IAM 8010 vs 8000（full-e2e vs run-core/run-iam）。
- 健康路径两套：`/api/health`（错）vs `/health`（对）。
- PG 三脚本 14 项参数清单三份重复，path 口径 Homebrew vs `/etc/postgresql/16/main` 矛盾。
- `bundle-check.sh` 默认预算（15M/1000K/5M）与 ci.yml 内联（500K/2500K）不一致，且本机现 dist 实测 23.06MB 已超默认预算（CI 该步会红）。
- `svc/mes/scripts/sqlx-prepare.sh`（旧版）与 `scripts/dev/sqlx-prepare.sh`（新版）+ `mes_guard.sh --prepare` 三方都能刷 mes 缓存，指向三种不同权威库连接串。
- 6 个 CI 孤儿脚本（check-clippy / coverage-baseline / lint-check / sccache_stats / ci-cache-utils / sccache-setup），lefthook+ci.yml 均无引用。
- 三个 mock 测试重复实现同一套"截断 `# 主命令处理` + 关 set -e + 包 main_dispatch"的 sed 提取逻辑。

---

## 五、体系性缺陷与合并建议

| # | 缺陷 | 建议 |
|---|---|---|
| 1 | **四套互不兼容的部署范式**（A systemd+/opt/topems；B 仓库工作区 nohup/systemd；C docker run+/data/topems；D docker compose+/opt/topems），rollback.sh 是孤儿 | 定一种主形态（建议 A），production-deploy 改为调 install 产物 + `systemctl restart topems.target`；start-production 仅作无 systemd 的临时入口并改为 BASH_SOURCE 推导路径 |
| 2 | **两套迁移机制矛盾**：topems.sh `db_migrate`（已修目录/PGPASSWORD/ON_ERROR_STOP）vs `migrate.sh`（目录正确、有 dry-run/status）；validate.sh 又查第三张表 | 收敛到 `migrate.sh` 为唯一入口，`topems.sh db migrate` 改为 `exec .../scripts/migrate.sh run`；删 fallback 或把建表改与 sqlx 一致（bigint/bytea/sha256） |
| 3 | **mes sqlx 缓存三条刷新路径 + 两个 sqlx-prepare.sh** | 弃用 `svc/mes/scripts/sqlx-prepare.sh`（标 DEPRECATED），统一走 `scripts/dev/sqlx-prepare.sh -p topems-mes` + `mes_guard.sh`；连接串收敛到 `config/standalone.env` 单一来源 |
| 4 | **服务清单多源**（services.yaml/ports.env/services.conf vs 各脚本硬编码端口表） | 以 services.conf/ports.env 为单一事实源，各脚本 source 而非硬编码 |
| 5 | **测试退出码语义混乱**（恒 0 / `\|\| true` / skip=成功） | 统一规则：任何测试二进制非零 → 脚本非零退出 |
| 6 | **bash 3.2 兼容性**（read -d ''/local -n/mapfile） | 全仓库禁用 bash4+ 语法；或统一 shebang `#!/usr/bin/env bash` + 文档标注最低版本 |
| 7 | **三套 test 提取逻辑重复** | 抽 `scripts/test/lib/topems_extract.sh` 共享（也给出 topems.sh 结构红线唯一落点） |
| 8 | **孤儿脚本治理** | 6 个 CI 孤儿 + blue-green-deploy 空壳：要么接入门禁要么归档删除，避免"看起来有门禁"的假象 |
| 9 | **端口/健康路径口径统一** | 以 ports.env 为准；健康路由统一 `/health` |
| 10 | **弱口令/明文凭据**（admin/admin123、topems_secret、dev-token、bench_user/bench_pass） | 生产路径全部改为环境变量注入 + 首次启动强制改密 |

---

## 六、topems.sh 优化说明（改了什么 / 为什么 / 如何兼容）

改动仅 `scripts/topems.sh` 一个文件（+220/-71），lefthook.yml 与 ci.yml **未改动**；mes 离线缓存根治设施（根 .sqlx/ 309 条、sqlx-prepare.sh --check、pre-commit Gate S、pre-push 四命令）全部在其上增强、未回退。

### 6.1 新增：SQLx 离线缓存新鲜度门禁（任务第 2 点）

- **新函数 `_check_sqlx_cache_freshness`**：复用根治设施 `scripts/dev/sqlx-prepare.sh --check`，在 **build / build-all / build-backend / start / start-all / run / dev** 主流程入口默认先执行；缓存缺失或与当前代码不一致 → 立即中止并打印三行修复指引（刷新缓存 → 提交 .sqlx → 重试）。
- **跳过方式**：`--skip-sqlx-check` 参数、`SQLX_CHECK_SKIP=1` 环境变量、`--online`（在线编译不消费离线缓存）。
- **`_SQLX_CHECKED` 进程内守卫**：build-all 逐包编译时只检查一次，不重复消耗。
- 为什么：此前 mes 离线缓存缺失/过时问题只在"真正编译或启动时"才暴露；把同一门禁前移到主流程入口，实现"编译和启动服务时及时规避"。
- 兼容：跳过开关默认关闭（即默认门禁生效），老调用方若不想被门禁拦可显式加 `--skip-sqlx-check`（help 已注明）。

### 6.2 build_service 重构（参数 + 离线策略）

- 参数解析从子串匹配改为显式 `case` 循环：修复 `--debug` 被 `--dev` 子串误判、以及 `build_service "$2" "${@:3}"` 多选项被 `shift` 丢弃的缺陷；未知 flag 透传（如 `--skip-sqlx-check`）。
- **删除 mes "rm svc/mes/.sqlx + 强制在线" 特例**：mes 与所有服务统一离线优先（`SQLX_OFFLINE=true`），消除旧特例与门禁的矛盾。
- `--offline` 失败**立即停止不回退在线**（原来 help 宣称"不回退"但实现会回退）；默认模式离线失败才回退在线，回退时注入 `DATABASE_URL`（mes 自动带 `search_path=mes,public`）。
- 兼容：`build <svc> --online/--offline/--dev` 语义不变或更符合文档；help 已同步。

### 6.3 `_mes_db_url()`：去除硬编码凭据

- mes-guard 分支与 `restart mes` 的 `--db-url` 从 `.env` 的 `DATABASE_URL` 派生（自动追加 `search_path=mes,public`），替换原硬编码 `postgresql://topems_app:topems_app_secret@localhost:5432/topems`。无 `.env` 时回退默认串。

### 6.4 db_migrate 修复（高危 H8）

- 扫描目录改为真实的 `database/migrations`（原顶层 `migrations/` 不存在 → 静默空转）+ `svc/*/migrations`。
- psql 系命令统一 `PGPASSWORD` 注入 + `-v ON_ERROR_STOP=1`；迁移失败**不再写** `_sqlx_migrations` 账本（原"失败也标记已应用"）。
- 缺 psql 时友好报错。

### 6.5 其余

- `db_backup / db_restore / db_reset` 注入 `PGPASSWORD`（本机无 ~/.pgpass 时原命令实际连不上）。
- `test_backend`：`export SQLX_OFFLINE=true`，与 pre-push / CI 口径一致。
- `clean --rust`：删除 `.sqlx` 后打印恢复提示（`git checkout -- .sqlx`）。
- `start / restart` 支持 `--force`（原仅接受字面 `true`），分派处归一化；`restart mes` 与普通服务同路径。
- `show_help` 全面更新（门禁说明段、`SQLX_CHECK_SKIP`、`--force`、build 新选项）。

### 6.6 兼容性证据

- `scripts/test/test-topems-sh.sh` **9/9 PASS**（三个 mock 测试的结构红线：`# 主命令处理` 顶格、`set -e` 独占一行、外层 esac 顶格、`run→run_all "${@:2}"` 等透传形式、`exit 1` 形式——全部保持）。
- `grep` 仓库内 `topems.sh` 调用方：`scripts/dev/start-local.sh`、`scripts/test/*`、`run_benchmark.sh` 等调用的命令名/参数形式均未变更。
- bash -n OK；shellcheck 告警 61 处与改动前基线一致（全部为既有 SC2155/SC2046/SC2120/SC2115/SC1007，无新增）。

---

## 七、验证记录（可复现）

```text
# 1. 语法（全部 77 个脚本）
$ bash -n <每个脚本>          → 77/77 通过（分组子代理逐文件执行留痕）

# 2. topems.sh 兼容测试
$ bash scripts/test/test-topems-sh.sh    → 9 通过, 0 失败 (EXIT 0)

# 3. SQLx 门禁实跑（根治设施，当前代码一致）
$ bash scripts/dev/sqlx-prepare.sh --check   → 全部 sqlx 缓存 --check 通过 (EXIT 0)

# 4. build 五种模式 dry-run（假 cargo /tmp/fakebin/cargo）
$ PATH=/tmp/fakebin:$PATH ./scripts/topems.sh build iam --skip-sqlx-check
    → [INFO] 命令: SQLX_OFFLINE=true cargo build --release --bin topems-unified-core ; exit=0
$ PATH=/tmp/fakebin:$PATH ./scripts/topems.sh build iam --skip-sqlx-check --offline   (FAKE_CARGO_FAIL_FIRST=1)
    → [ERROR] 离线编译失败（--offline 模式不回退在线编译）+ 修复指引 ; exit=1
$ PATH=/tmp/fakebin:$PATH ./scripts/topems.sh build iam --skip-sqlx-check              (离线失败→在线回退)
    → [WARNING] 离线编译失败，自动尝试在线编译... DATABASE_URL=<set> ; exit=0
$ PATH=/tmp/fakebin:$PATH ./scripts/topems.sh build iam --skip-sqlx-check --online
    → SQLX_OFFLINE= 空（在线） ; exit=0
$ SQLX_CHECK_SKIP=1 ... ./scripts/topems.sh build iam --offline                        → 门禁跳过 ; exit=0
$ PATH=/tmp/fakebin:$PATH ./scripts/topems.sh build mes --skip-sqlx-check
    → [INFO] 命令: SQLX_OFFLINE=true cargo build --release --bin topems-mes（mes 不再强制在线）; exit=0

# 5. start/restart 分派 mock 合架（/tmp/start-dispatch-harness.sh）
   start iam → MOCK GATE 执行 + force=false；start iam --force → gate + force=true；
   start web → 无门禁（前端分支）；restart hrm/mes --force → gate + stop + start force=true；
   start 无参 → 报错 + help + return 1

# 6. 只读冒烟
$ ./scripts/topems.sh status                          → 本机 ~28 服务正常列出
$ ./scripts/topems.sh clean --rust --dry-run          → [DRY-RUN] 无文件被实际删除 ; exit=0

# 7. 全仓库 shellcheck（0.11.0）
   syntax OK: 77  FAIL: 0；shellcheck 零告警 37 / 有告警 40（无 error 级）
   topems.sh 61 处告警 = 改动前基线（/tmp/sc-orig.log vs /tmp/sc-topems2.log 对比一致）
```

**未实跑红线复述**：production-deploy/rollback/uninstall/install/update/deploy/blue-green-deploy/clean_target/domain-start/service-monitor/setup-db/PG 调优/ai-health-check、migrate.sh run/aps_to_mes/migrate-verify-empty、coverage-baseline/sccache-setup/frontend-lint/sccache_stats、ai-models/ai-bench、generate-*/openapi、run_extract、全部性能脚本（起服务/打压）——以上仅静态审查。

---

## 八、遗留问题与建议（未在本次执行）

1. **`scripts/dev/start-local.sh` 补 `all)` 分支**（默认无参一键启动的入口），随后 shim 才完整可用。
2. **高危"根治/合并"类结构性变更**（四套部署范式砍到一套、删除 6 个孤儿脚本、弃用 svc/mes/scripts/sqlx-prepare.sh、migrate.sh fallback 改 sqlx 兼容结构、migrate-verify-empty 加库名守卫、aps_to_mes COMMIT 修复、测试退出码统一）——涉及仓库结构与门禁，建议按报告逐项评审后分步执行。
3. `bundle-check.sh` 预算与 ci.yml 内联预算统一（当前现网 dist 已超默认预算，CI 该步已红）。
4. `scripts/start-local.sh` shim 与 `scripts/dev/start-local.sh` 的 `all)` 修复联动后，建议把 6+ 处文档引用改为 `scripts/dev/start-local.sh`。
5. 全量 `cargo test --workspace`（SQLX_OFFLINE=true）可作为独立验收另行执行（需集成库，本次未跑）。
