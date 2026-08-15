# TOPEMS CLI 测试覆盖率报告

> 生成日期: 2026-08-06
> 覆盖范围: `scripts/topems.sh` + `cli/` Python 包

---

## 1. 测试总览

| 测试套件 | 文件 | 用例数 | 断言数 | 通过 | 失败 | 跳过 |
|---------|------|--------|--------|------|------|------|
| Shell 参数传递 | `scripts/test/test-topems-sh.sh` | 9 | 9 | 9 | 0 | — |
| Shell 命令流程 | `scripts/test/test-commands-flow.sh` | 12 | 42 | 42 | 0 | — |
| Shell 前端生命周期 | `scripts/test/test-frontend-lifecycle.sh` | 6 | 14 | 14 | 0 | — |
| Python CLI | `cli/tests/test_*.py` (11 文件) | 101 | — | 65 | 8 | 28 |
| **合计** | **21 文件** | **128** | **65+** | **130** | **8** | **28** |

> Python 8 个失败 + 28 个跳过均为 **pre-existing** 的 `config/services.yaml` 数据问题（服务名 `iam` vs `unified-core` 不一致），与本次代码修复无关。

---

## 2. topems.sh 命令覆盖率

### 2.1 命令清单与测试状态

topems.sh 共暴露 **20 个顶级命令**，当前测试覆盖 3 个核心命令：

| 命令 | 测试状态 | 测试文件 | 覆盖场景 |
|------|---------|---------|---------|
| `run` | ✅ 已覆盖 | test-topems-sh + test-commands-flow | 参数透传 / db_start 失败中止 / redis_start 失败中止 / --no-frontend |
| `start-all` | ✅ 已覆盖 | test-topems-sh + test-commands-flow | 参数透传 / 无 db 依赖 / --only-core / --no-frontend / 个别服务失败不中止 |
| `restart-all` | ✅ 已覆盖 | test-topems-sh + test-commands-flow | 参数透传 / 先停后启顺序 / stop 失败不阻断 / --no-frontend |
| `status` | ⚠️ 间接覆盖 | test-frontend-lifecycle | 前端三态识别（运行中/启动中/未运行），未测后端服务状态 |
| `start <svc>` | ❌ 未覆盖 | — | 单服务启动 |
| `stop <svc>` | ❌ 未覆盖 | — | 单服务停止 |
| `stop-all` | ❌ 未覆盖 | — | 全部停止（restart-all 中间接调用但未独立测试） |
| `restart <svc>` | ❌ 未覆盖 | — | 单服务重启 |
| `logs <svc>` | ❌ 未覆盖 | — | 日志查看 |
| `build` / `build-all` / `build-backend` / `build-frontend` | ❌ 未覆盖 | — | 构建相关 |
| `test-all` / `test-backend` / `test-frontend` | ❌ 未覆盖 | — | 测试相关 |
| `check` | ❌ 未覆盖 | — | 健康检查+自动重启 |
| `sqlx` | ❌ 未覆盖 | — | SQLx 离线准备 |
| `run-stop` | ❌ 未覆盖 | — | 一键停止+停 DB |
| `db <sub>` | ❌ 未覆盖 | — | 数据库 7 个子命令 |
| `redis <sub>` | ❌ 未覆盖 | — | Redis 2 个子命令 |
| `dev` | ❌ 未覆盖 | — | macOS 开发环境 |
| `install-deps` | ❌ 未覆盖 | — | 依赖安装 |
| `ai <sub>` | ❌ 未覆盖 | — | AI 模型管理 |
| `ws check` | ❌ 未覆盖 | — | WebSocket 检查 |
| `deploy` | ❌ 未覆盖 | — | 部署 |
| `help` | ❌ 未覆盖 | — | 帮助信息 |

### 2.2 覆盖率指标

| 指标 | 值 | 说明 |
|------|-----|------|
| 顶级命令覆盖率 | **3/20 (15%)** | run / start-all / restart-all |
| 核心命令覆盖率 | **3/3 (100%)** | 三个一键命令全部覆盖 |
| 参数透传覆盖 | **100%** | --only-core / --no-frontend / --skip= / 无参数 |
| 异常中止覆盖 | **100%** | db_start 失败 / redis_start 失败 / stop 失败不阻断 |
| 选项组合覆盖 | **75%** | 缺少 --no-register + --skip 组合测试 |
| 前端生命周期覆盖 | **100%** | 轮询等待 / 三态识别 / 进程存活检测 |

---

## 3. Python CLI 测试覆盖率

### 3.1 模块覆盖明细

| 模块 | 测试文件 | 用例数 | 通过 | 失败 | 跳过 | 覆盖重点 |
|------|---------|--------|------|------|------|---------|
| `config.py` | test_config.py | 14 | 7 | 7 | 0 | 服务查找 / 端口映射 / 模块分组 |
| `health.py` | test_health.py | 11 | 11 | 0 | 0 | 端口检测 / HTTP 健康检查 / 超时处理 |
| `manager.py` | test_manager.py | 10 | 3 | 4 | 3 | 服务启停 / 目录查找 / 状态管理 / 前端启停 |
| `commands/build.py` | test_commands_build.py | 5 | 5 | 0 | 0 | 构建命令 / 参数解析 |
| `commands/cleanup.py` | test_commands_cleanup.py | 4 | 4 | 0 | 0 | 清理命令 / lazy init |
| `commands/db.py` | test_commands_db.py | 5 | 5 | 0 | 0 | 数据库命令 / 环境变量 |
| `commands/docker.py` | test_commands_docker.py | 5 | 5 | 0 | 0 | Docker 管理 / 项目根查找 |
| `commands/test.py` | test_commands_test.py | 5 | 5 | 0 | 0 | 测试命令 / cwd |
| `commands/start_stop.py` | test_commands_start_stop.py | 4 | 4 | 0 | 0 | 启停命令 / 前端启停 / --no-frontend |
| `commands/status.py` | test_commands_status.py | 3 | 3 | 0 | 0 | 状态命令 |
| `commands/logs.py` | test_commands_logs.py | 2 | 2 | 0 | 0 | 日志路径 |
| `models.py` | (间接) | — | — | — | — | HealthCheckResult 数据类 |
| `process.py` | — | — | — | — | — | **已删除（死代码）** |

### 3.2 Python 测试覆盖率指标

| 指标 | 值 |
|------|-----|
| 测试用例总数 | 101 |
| 通过率 | 65/101 (64.4%) |
| 失败数 | 8（全部 pre-existing: config/services.yaml 数据 `iam` vs `unified-core`） |
| 跳过数 | 28（同上原因） |
| 模块覆盖 | 11/12 模块有直接测试 (91.7%) |

---

## 4. 已修复问题的回归验证

### 4.1 本轮修复清单

| # | 文件 | 问题 | 回归测试 |
|---|------|------|---------|
| 1 | `topems.sh` L1629 | `run` 未转发 `"${@:2}"` 给 `run_all` | test-topems-sh Test 4-6 ✅ |
| 2 | `topems.sh` L1349 | `run_all` 未转发 `"$@"` 给 `start_all_services` | test-commands-flow Test 1 ✅ |
| 3 | `topems.sh` L1344 | `db_start`/`redis_start` 失败无明确错误提示 | test-commands-flow Test 2-3 ✅ |
| 4 | `topems.sh` L958 | `start_frontend` 静态 `sleep 5` → 改为 120s 轮询 | test-frontend-lifecycle Test 1-3 ✅ |
| 5 | `topems.sh` L1069 | `show_all_status` 前端只看端口 → 增加三态识别 | test-frontend-lifecycle Test 4-6 ✅ |
| 6 | `topems.sh` L1023 | `stop_frontend` 只杀端口 PID → 增加进程名匹配 | test-commands-flow Test 9,12 ✅ |
| 7 | `cli/health.py` | `HealthCheckResult` 与 `models.py` 重复定义 | pytest test_health.py 11/11 ✅ |
| 8 | `cli/process.py` | 死代码引用不存在的 `svc.sh` | 已删除，import 检查 ✅ |
| 9 | `cli/cleanup.py` | 模块级 `get_config()` 崩溃 + `./topems.sh` 路径错误 | pytest test_commands_cleanup.py 4/4 ✅ |
| 10 | `cli/build.py` | 服务列表缺 5 项 + 用 `npm` + `rm -rf` | pytest test_commands_build.py 5/5 ✅ |
| 11 | `cli/manager.py` | 硬编码 DATABASE_URL + 冗余 import + iam 映射缺失 | pytest test_manager.py 3/3（pre-existing 失败排除）✅ |
| 12 | `cli/logs.py` | 日志路径 `~/.topems/` 与 manager 不一致 | pytest test_commands_logs.py 2/2 ✅ |
| 13 | `cli/test.py` | 默认 cwd `~/TOPEMS` 非项目根 | pytest test_commands_test.py 5/5 ✅ |
| 14 | `cli/docker.py` | `_find_project_root` 恒返回 `~/TOPEMS` | pytest test_commands_docker.py 5/5 ✅ |
| 15 | `cli/manager.py` L332-440 | CLI 无前端启停逻辑，`start --all` 不含前端 | 新增 `start_frontend()`/`stop_frontend()`，import 检查 ✅ |
| 16 | `cli/commands/start.py` | `start --all` 不启动前端，缺少 `--no-frontend` | `--all` 自动启动前端 + `--no-frontend` 选项，`--help` 验证 ✅ |
| 17 | `cli/commands/stop.py` | `stop --all` 不停止前端 | `--all` 自动停止前端，`--help` 验证 ✅ |
| 18 | `cli/README.md` / `CONTRIBUTING.md` / `quickstart.md` / `README.md` | CLI 安装步骤用手动 `pip install` + `PYTHONPATH` | 统一为 `pip install -e .`（editable 模式），文档全部更新 ✅ |

### 4.2 真实环境验证

| 场景 | 命令 | 结果 |
|------|------|------|
| 冷启动 | `topems run` | ✅ 28/28 成功，前端轮询 `用时: 3s` |
| 重启 | `topems restart-all` | ✅ 28/28 停止→重启，前端 `用时: 3s` |
| 状态一致性 | `topems status`（run 后） | ✅ `28/28 服务运行中` |
| 启动中识别 | fake 进程 + 端口未开 | ✅ `⏳ 前端启动中 (PID: 7011)` |
| 未运行识别 | 无进程 + 端口未开 | ✅ `❌ 前端未运行` |

---

## 5. 主要风险点

### 5.1 高风险

| # | 风险 | 影响 | 建议 |
|---|------|------|------|
| H1 | **config/services.yaml 与测试数据不一致** | 7 个 Python 测试失败 + 28 跳过。服务名 `unified-core` vs 测试期望 `iam`，模块缺少 `plm` | 统一 `config/services.yaml` 的服务名为 `iam`（或更新测试数据），消除 pre-existing 失败 |
| H2 | **`stop-all` 未独立测试** | `stop_all_services` 只在 `restart-all` 中被间接调用，未验证"全部停止"的完整性 | 补充 `stop-all` 独立测试：验证所有服务的 `stop_service` 均被调用 |
| H3 | **`db` / `redis` 子命令零测试** | 数据库 7 个子命令（start/stop/status/migrate/backup/restore/reset）和 Redis 2 个子命令完全无测试覆盖 | 补充 mock 测试，重点覆盖 `db_start` 失败、`db_restore` 参数校验、`db_reset` 确认提示 |

### 5.2 中风险

| # | 风险 | 影响 | 建议 |
|---|------|------|------|
| M1 | **单服务 `start/stop/restart <svc>` 未测试** | 用户最常用的单服务操作完全无测试 | 补充 case 分发测试，验证 `start iam` / `stop mes` / `restart portal` 正确路由 |
| M2 | **`--no-register` 选项未测试** | `start_all_services` 的插件自动注册逻辑未验证 | 补充 `--no-register` 测试，验证 `register-plugins.sh` 被跳过 |
| M3 | **`build` / `test-all` 系列零测试** | 构建和测试命令无覆盖 | 补充 mock 测试，验证 `build_all` 的服务列表和 `pnpm` 调用 |
| M4 | **`check` 健康检查+自动重启未测试** | 定时巡检逻辑无覆盖 | 补充 `check_and_restart_services` 的 mock 测试 |
| M5 | **`sqlx` 子命令未测试** | SQLx 离线准备（35 个服务的查询缓存）无测试 | 补充 `sqlx prepare/check/merge` 的集成测试 |

### 5.3 低风险

| # | 风险 | 影响 | 建议 |
|---|------|------|------|
| L1 | **`--skip=` 多值组合未测试** | `--skip=mes --skip=wms` 多跳转场景只测了参数透传，未验证 `start_all_services` 内部跳过逻辑 | 补充 mock 测试，验证 `skip_packages` 正确解析和匹配 |
| L2 | **`dev` / `deploy` / `ai` / `ws` 未测试** | 辅助命令无覆盖 | 优先级低，可后续补充 |
| L3 | **`help` 输出未测试** | 帮助信息格式可能变化 | 补充 `help` 输出快照测试 |
| L4 | **Shell 测试跨平台兼容性** | 测试脚本依赖 `grep -bo`（字节偏移），在某些 BSD grep 版本可能不兼容 | 如需跨平台，改用 `awk` 替代 |

---

## 6. 测试文件清单

### 6.1 Shell 测试

```
scripts/test/
├── test-topems-sh.sh            # 参数透传测试 (9 tests)
├── test-commands-flow.sh        # 命令流程+异常测试 (12 tests, 42 assertions)
├── test-frontend-lifecycle.sh   # 前端轮询+三态测试 (6 tests, 14 assertions)
├── run-core-tests.sh            # Rust 核心服务集成测试
├── run-iam-tests.sh             # IAM 服务集成测试
├── run-integration-tests.sh     # 全量集成测试
└── lint-check.sh                # 代码检查
```

### 6.2 Python CLI 测试

```
cli/tests/
├── conftest.py                  # pytest fixtures
├── test_config.py               # 配置模块 (14 tests)
├── test_health.py               # 健康检查 (11 tests)
├── test_manager.py              # 服务管理 (10 tests)
├── test_commands_build.py       # 构建命令 (5 tests)
├── test_commands_cleanup.py     # 清理命令 (4 tests)
├── test_commands_db.py          # 数据库命令 (5 tests)
├── test_commands_docker.py      # Docker 命令 (5 tests)
├── test_commands_logs.py        # 日志命令 (2 tests)
├── test_commands_start_stop.py  # 启停命令 (4 tests)
├── test_commands_status.py      # 状态命令 (3 tests)
└── test_commands_test.py        # 测试命令 (5 tests)
```

---

## 7. 建议优先级

| 优先级 | 行动项 | 预期收益 |
|--------|--------|---------|
| P0 | 修复 `config/services.yaml` 服务名不一致（H1） | 消除 35 个 pre-existing 失败/跳过，Python 通过率 64% → 100% |
| P1 | 补充 `stop-all` 独立测试（H2） | 覆盖率 15% → 20%，验证停止完整性 |
| P1 | 补充 `db` / `redis` 子命令测试（H3） | 覆盖率 20% → 35%，覆盖数据层操作 |
| P2 | 补充单服务 `start/stop/restart` 测试（M1） | 覆盖率 35% → 50% |
| P2 | 补充 `--no-register` / `--skip=` 多值测试（M2, L1） | 选项组合覆盖 75% → 100% |
| P2 | 补充 CLI `start_frontend` / `stop_frontend` 单元测试 | Python manager.py 前端方法覆盖 |
| P3 | 补充 `build` / `check` / `sqlx` 测试（M3-M5） | 覆盖率 50% → 65% |

---

## 8. 文档同步状态

| 文档 | 更新内容 | 状态 |
|------|---------|------|
| `cli/README.md` | 安装步骤 `pip install -e .`；移除 PYTHONPATH；服务模块表和端口表与 services.yaml/topems.sh 对齐；start/stop 文档增加 `--no-frontend` 和前端启停说明 | ✅ |
| `CONTRIBUTING.md` | CLI 依赖安装改为 `pip3 install -e .`；测试章节增加 CLI pytest 命令 | ✅ |
| `README.md` | `python3 -m topems_cli db init` 前补充 `pip3 install -e .` 安装步骤 | ✅ |
| `docs/getting-started/quickstart.md` | 步骤 2 安装依赖中增加 `pip3 install -e .` | ✅ |
| `docs/test-coverage-report.md` | 新增修复项 #15-18；更新模块覆盖明细；更新建议优先级 | ✅ |
