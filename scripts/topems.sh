#!/bin/bash

# =============================================
# TOPEMS 统一入口脚本
# =============================================
# 主脚本，整合所有服务管理功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLI_DIR="$PROJECT_ROOT/cli"

# 防御：PROJECT_ROOT 必须解析为合法的仓库根（防 rm -rf 相对路径事故）
if [ -z "$PROJECT_ROOT" ] || [ ! -f "$PROJECT_ROOT/Cargo.toml" ]; then
    echo "FATAL: PROJECT_ROOT 解析异常（'${PROJECT_ROOT:-空}'，缺少 Cargo.toml）——拒绝执行" >&2
    exit 1
fi

# 颜色定义

MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-3}
BACKOFF_FACTOR=${BACKOFF_FACTOR:-2}
# 单次启动等待端口就绪的最长时间（秒）；unified-core 冷启动含 30 张表 schema 自检，实测 ~18s
READY_TIMEOUT=${READY_TIMEOUT:-60}


# 拆分库加载（2026-11-02）
for _lib in common build service db run maintain; do
  # shellcheck disable=SC1090
  source "$SCRIPT_DIR/lib/$_lib.sh"
done
unset _lib

# ── 精简辅助（2026-11-02 P3）──
_require_service() {
  [ -z "$1" ] && { error "请指定服务名"; show_help; exit 1; }
}
_unknown_subcmd() {  # 用法: _unknown_subcmd <子命令> <顶层命令> <可用列表>
  error "未知 $2 命令: $1"
  echo "可用命令: $3"
  exit 1
}
_parse_force_flag() {  # 用法: _parse_force_flag "${3:-}"（输出到 _topems_force_flag）
  _topems_force_flag=false
  [ "$1" = "--force" ] && _topems_force_flag=true
}

show_help() {
    cat << EOF
TOPEMS 服务管理工具

用法: topems <命令> [选项]   （未识别的命令将透传给 core CLI: cli/bin/topems）

服务管理（场景: 单服务生命周期——启动/停止/重启/日志/状态/单服务编译）:
  status [服务]           查看服务状态
  start <服务> [--force]  启动服务（自动注册到 unified-core；二进制缺失时自动编译）
  stop <服务>             停止服务（不带服务名 = stop-all 停止全部）
  restart <服务> [--force]  重启服务（可选 --force 强制重启）
  mes-guard [选项]       运行 mes 编译守卫（遮蔽检查 + 在线编译断言 0 error）
                            --clean          清理 public 遮蔽对象（幂等）
                            --sync-snapshot  同步 fixtures/mes_compile_schema.sql
                            --prepare        生成/更新 sqlx 缓存并合并根 .sqlx（迁移后必跑）
                            --skip-compile   只做遮蔽检查（快排）
  check                   检查服务状态并自动重启异常服务
  logs <服务> [行数]      查看服务日志
  build <服务> [--online|--offline|--dev|--skip-sqlx-check]  编译单个服务（场景: 改单个服务快速验证；默认离线优先 + 缓存新鲜度门禁）
  build-all [选项]        全量编译所有服务（后端+前端）
                            --prepare         先刷新 sqlx 缓存（需要 DATABASE_URL）
                            --only-core       只编核心服务（iam=unified-core）
                            --online          强制在线编译（无缓存也可）
                            --offline         强制离线编译（失败立即停止，不回退在线）
                            --skip-sqlx-check 跳过 SQLx 离线缓存新鲜度门禁（build/start 默认先跑 --check）
                            --dev|--debug     编 debug 版（默认 release）
                            --skip=<svc>      跳过某个包，可重复
                            --backend-only    只编后端，跳过前端（等价独立命令 build-backend）
                            --force           强制获取构建锁（避免并发冲突）
                            --skip-mem-check  跳过内存检查（CI / Docker 场景）
                            --serial          强制单线程串行构建，避免并行锁竞争
                            --cooldown=N      构建间冷却秒数（默认 2，serial 模式下生效）
                            --skip-lint      跳过前端 lint（若存在 build:nolint 则用，否则忽略）
                            --skip-preflight 跳过启动前预检（CI / 已清理过场景）
  build-backend [选项]    编译所有后端服务（等价 build-all --backend-only）
  build-frontend          编译前端 (tsc && vite build)
                            --dev        若存在 build:dev 脚本则用，否则回退默认 build
                            --skip-lint  若存在 build:nolint 脚本则用，否则忽略（默认 build 不跑 lint）
  register-all           批量注册所有运行中的服务到 unified-core（含重试）
  start-all [选项]        启动所有服务（含前端，自动注册）
                            --only-core       只启动核心服务（iam=unified-core）
                            --no-frontend     不启动前端
                            --no-register     不自动注册插件
                            --skip=<svc>      跳过某个服务
                            --skip-sqlx-check 跳过 SQLx 离线缓存新鲜度门禁
                            --skip-preflight 跳过启动前预检（CI / 已清理过场景）
  stop-all [--with-db]    停止所有服务（含前端；--with-db 同时停止 PostgreSQL/Redis，= run-stop）
  restart-all [选项]      重启所有服务（透传 start-all 选项）

一键运行（场景: 完整环境一键——run 启动 DB+全部服务；run-stop 停止+可选停 DB）:
  run [选项]             一键启动数据库+所有服务（透传 start-all 选项）
                          --auto-build      先全量编译再启动（等价 build-all + run，避免未构建时逐服务慢编译）
                          --only-core       只启动核心服务
                          --no-frontend     不启动前端
                          --skip=<svc>      跳过某个服务
                          --skip-sqlx-check 跳过 SQLx 离线缓存新鲜度门禁
  run-stop                一键停止所有服务+数据库（stop-all --with-db 的别名）

前端（场景: 只启/停前端，不碰后端）:
  start web               启动前端服务（仅前端）
  stop web                停止前端服务

测试（场景: 全量/后端/前端测试，参数与 pre-push 门禁一致）:
  test-all                运行所有测试（后端+前端）
  test-backend            运行后端测试（SQLX_OFFLINE=true 离线模式，与 pre-push/CI 一致）
  test-frontend [模式] [--no-typecheck]
                          运行前端测试（默认前置 tsc 类型检查）
                            模式: all(默认) | unit | component | smoke | coverage
                                  shard:1 .. shard:8  (component 分片，省内存)
                            --no-typecheck: 跳过类型检查（纯跑 vitest）

SQLx 离线缓存（场景: 迁移/改 SQL 后维护离线缓存; V64+; V3xx 门禁）:
  sqlx prepare [-p X]  生成离线缓存
  sqlx prepare --check            校验离线缓存
  sqlx prepare --merge            合并分包缓存到根 .sqlx
  sqlx check-offline              离线模式校验缓存（= prepare --check + SQLX_OFFLINE=true）

SQLx 离线缓存新鲜度门禁 (V3xx):
  build / build-all / build-backend / start / restart / start-all / run / dev 默认先执行
  scripts/dev/sqlx-prepare.sh --check；缓存缺失或与代码不一致即停止并给出修复指引。
  跳过: 命令加 --skip-sqlx-check，或设置环境变量 SQLX_CHECK_SKIP=1，或使用 --online。

数据库（场景: PostgreSQL/Redis 生命周期 + 迁移/备份/恢复）:
  db start                启动 PostgreSQL
  db stop                 停止 PostgreSQL
  db status               查看数据库状态（PostgreSQL+Redis）
  db migrate              运行数据库迁移
  db backup               备份数据库
  db restore <文件>       从备份文件恢复
  db reset                重置数据库（删除所有数据）
  redis start             启动 Redis
  redis stop              停止 Redis

清理（场景: 磁盘治理——日常增量 clean_target.sh → 显式定向 clean → 危险 --system-cache）:
  clean-all             全量清理，等价 clean --all（Rust target + 前端 + 项目缓存 + 日志；不含 .sqlx / system-cache / ollama）
                         执行前打印删除计划并交互确认；非 TTY 环境必须显式加 --yes
                         可追加参数：--dry-run 预览 / --deep / --system-cache / --include-worktrees / --yes 等
  clean [选项]            清理编译产物、缓存、日志（默认增量：只清 debug 增量缓存，保留产物与依赖）
                            --rust         全量清理 Rust 编译产物 (target/ 含 release, 嵌套 target 残留) + 终止后台 cargo/rustc 进程
                            --sqlx         清理 SQLx 离线编译缓存 (.sqlx，已入库 git，默认不删；清理后需 sqlx prepare 重新生成)
                            --debug        只清 Rust 增量缓存 + 嵌套 target 残留（保留 debug/release 产物，日常推荐，恢复最快）
                            --debug-full   清 debug 增量+依赖+构建脚本产物（保留 release；依赖需重编，配合 sccache 可接受）
                            --sccache      停止 sccache 守护进程并清空编译缓存（下次构建冷启动）
                            --frontend     清理前端产物 (dist/, coverage/, .vite 缓存)
                            --deep         深度清理所有 node_modules + pnpm store prune（解决 dual versions / lockfile 漂移）
                            --cache        清理项目级缓存 (apps/web/.lighthouseci, cli/.venv, cli/.pytest_cache, node_modules/.cache)
                            --system-cache 清理系统级缓存 (pnpm/cargo/IDE，危险操作需确认)
                            --ollama       清理 Ollama 模型（保留项目使用的模型）
                            --logs         清理日志文件 (logs/ 与根目录 *.log / *.out)
                            --tmp-logs     清理 /private/tmp/topems*.log（默认不删）
                            --include-worktrees 扫描独立 worktree（git worktree list + /private/tmp/topems-* + ~/topems-wt-*）
                                           默认只删各 worktree 的 target/debug/incremental；删整个 target 需同时加 --yes
                            --yes, -y      跳过 --all 交互确认（非 TTY 必需）；配合 --include-worktrees 时删整个 worktree target
                            --all          全量清理（Rust target + 前端 + 项目缓存 + 日志；不含 .sqlx / system-cache / ollama）
                            --analyze      磁盘占用分析（只读排行，含 worktree / docker / ollama 汇总，不删除任何文件）
                            --dry-run      预演模式，仅显示将删除的内容
                          环境变量: DISK_BLOCK_GB（阻断阈值，默认5）/ DISK_WARN_GB（警告阈值，默认10）
                          清理提醒: 磁盘守卫在可用空间 < 阈值时自动拦截/提示（topems clean 释放）

开发环境（场景: 环境自检/自举 + 最小开发环境）:
  dev                     启动最小开发环境 (macOS)（DB+Redis+iam+前端热更新；完整环境用 run）
  install-deps            安装依赖
  doctor                  环境自检/自举（多机门禁一致性：装 lefthook、注册钩子、核对工具链）
  sync_base               新机器环境同步（独立脚本 bash scripts/sync_base.sh——doctor 后必跑，多机一致）
  push [--skip-check]     推送入口：先自检门禁钩子再 git push（--skip-check 跳过自检）

扩展功能（场景: AI 模型 / WebSocket / 部署 / 密码管理）:
  ai start                启动 Ollama 服务
  ai stop                 停止 Ollama 服务
  ai status               查看 Ollama 状态
  ai pull <模型>          下载AI模型

  ws check                检查 WebSocket 连接状态

  deploy                  生产部署（systemd 范式，需 .env.production；docker 部署见 scripts/deploy/docker/topems-docker.sh）
  reset-password [用户] [密码]  重置用户密码（密码必填，无默认弱口令；update-password 为别名）

自动预检（主流程入口自动执行，磁盘 <5GiB 会阻断）:
  预检内容: 杀后台 cargo 进程 + 清 llvm-cov-target 残留 + 磁盘空间检查
  应用命令: run / dev / start-all / restart-all / build-all / test-backend
  跳过预检: 在以上命令后加 --skip-preflight（CI 场景或已清理过）
            例: topems build-all --skip-preflight --only-core

环境变量:
  MAX_RETRIES             最大重试次数（默认: 3）
  RETRY_DELAY             初始重试间隔（默认: 3秒）
  BACKOFF_FACTOR          退避系数（默认: 2，指数退避）
  FORCE_ONLINE_BUILD      设为 1 时 build/build-all 默认在线编译
  SQLX_CHECK_SKIP         设为 1 时跳过 SQLx 离线缓存新鲜度门禁（等同 --skip-sqlx-check）
  DISK_BLOCK_GB            清理阻断阈值 GiB（默认 5，可用空间低于时 clean 拒绝执行）
  DISK_WARN_GB             清理警告阈值 GiB（默认 10，低于时 clean 提示）

示例:
  topems status               查看所有服务状态
  topems start iam            启动 IAM 服务
  topems start-all --only-core     仅启动核心服务
  topems start-all --no-frontend   只启动后端服务
  topems logs hrm 100         查看 HRM 最近 100 行日志
  topems build-all            全量编译（离线优先，失败自动切在线）
  topems build-all --serial   全量串行构建（单线程，避免并行锁竞争）
  topems build-all --serial --cooldown=3  串行构建+3秒冷却间隔
  topems build-all --prepare  先刷新 sqlx 缓存再编译（刷新后自动校验缓存可用）
  topems build-all --only-core --dev  仅 debug 编译核心服务
  topems sqlx prepare   生成全量 SQLx 离线缓存
  topems test-all             运行所有测试
  topems run                  一键运行（数据库+所有服务）
  topems run --auto-build    先全量编译再一键运行（避免未构建时逐服务慢编译）

# 日常开发循环（磁盘紧张时）
  ./scripts/clean_target.sh  增量清缓存（保留产物，秒级）
  topems build-all           全量编译
  topems run                 一键启动（DB+全部服务）
  topems status              检查状态
  topems db status            查看数据库状态
  topems db backup            备份数据库
  topems db defense-check <svc>   单服务 Schema 防御自检（build+启动10s+grep自检日志）
                                        染色输出 ✓/⚠/✗；exit 0/1/2
  topems db defense-check-all       全量 Schema 防御自检（4 批共 25 服务）
                                        第1批 核心4: gis ehs portal finance
                                        第2批 业务11: erp hrm crm pm scm wms srm pdm mes qms lims
                                        第3批 业务5: ai rd ticket plugin-registry mobile
                                        第4批 平台5: unified-core integration master-data communication analytics
  topems dev                  启动开发环境
  topems reset-password admin <新密码>   重置 admin 密码（必须显式提供）
  topems reset-password <用户> <新密码>  重置指定用户密码

完整功能请使用 Python CLI（场景: 批量运维——多服务/模块批量操作 + JSON 输出；日常单服务生命周期用上方 shell 命令）:
  cd cli && python3 -m topems_cli --help
EOF
}

# 主命令处理

case "${1:-help}" in
    status)
        [ -z "$2" ] && show_all_status || status_service "$2"
        ;;
    start)
        case "${2:-}" in
            web|frontend)
                start_frontend
                ;;
            "")
                _require_service "$2"
                ;;
            *)
                # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check 可跳过）；--force 归一化
                _check_sqlx_cache_freshness "${@:3}" || exit 1
                if [ "${3:-}" = "--force" ]; then
                    start_service "$2" true
                else
                    start_service "$2" "${3:-false}"
                fi
                ;;
        esac
        ;;
    stop)
        case "${2:-}" in
            web|frontend)
                stop_frontend
                ;;
            "")
                stop_all_services
                ;;
            *)
                stop_service "$2"
                ;;
        esac
        ;;
    restart)
        case "${2:-}" in
            web|frontend)
                stop_frontend && start_frontend
                ;;
            mes)
                # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check 可跳过）
                _check_sqlx_cache_freshness "${@:3}" || exit 1
                # mes 重启前编译守卫：防启动坏/旧版本（MES_GUARD_SKIP=1 跳过）
                # V3xx：DB 连接串从 .env 派生（原硬编码 topems:topems_secret 与 .env 不一致）
                if [ "${MES_GUARD_SKIP:-0}" != "1" ]; then
                    bash "$PROJECT_ROOT/scripts/mes_guard.sh" --db-url "$(_mes_db_url)" || {
                        error "mes 编译守卫失败，已中止重启（MES_GUARD_SKIP=1 可跳过）"
                        exit 1
                    }
                fi
                _parse_force_flag "${3:-}"
                stop_service mes && sleep 1 && start_service mes "$_topems_force_flag"
                ;;
            "")
                _require_service "$2"
                ;;
            *)
                _check_sqlx_cache_freshness "${@:3}" || exit 1
                _parse_force_flag "${3:-}"
                stop_service "$2" && sleep 1 && start_service "$2" "$_topems_force_flag"
                ;;
        esac
        ;;
    logs)
        _require_service "$2"
        logs_service "$2" "${3:-50}"
        ;;
    build)
        _require_service "$2"
        # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check 可跳过）
        _check_sqlx_cache_freshness "${@:3}" || exit 1
        build_service "$2" "${@:3}"
        ;;
    mes-guard)
        # mes 编译守卫：遮蔽检查 + 在线编译断言 0 error（--clean/--sync-snapshot/--prepare/--skip-compile 透传）
        # V3xx：DB 连接串从 .env 派生（原硬编码 topems:topems_secret 与 .env 不一致）
        bash "$PROJECT_ROOT/scripts/mes_guard.sh" --db-url "$(_mes_db_url)" "${@:2}"
        ;;
    build-all)
        build_all "${@:2}"
        ;;
    build-backend)
        build_all_backend "${@:2}"
        ;;
    build-frontend)
        build_frontend "${@:2}"
        ;;
    register-all)
        register_all_plugins
        ;;
    test-all)
        test_all
        ;;
    test-backend)
        test_backend
        ;;
    test-frontend)
        test_frontend "${@:2}"
        ;;
    start-all)
        start_all_services "${@:2}"
        show_all_status
        ;;
    stop-all)
        if [ "${2:-}" = "--with-db" ]; then
            stop_everything
        else
            stop_all_services
        fi
        ;;
    restart-all)
        restart_all "${@:2}"
        ;;
    check)
        check_and_restart_services
        ;;
    sqlx)
        case "${2:-prepare}" in
            prepare)
                shift 2 || true
                "$SCRIPT_DIR/dev/sqlx-prepare.sh" "$@"
                ;;
            check|check-offline)
                export SQLX_OFFLINE=true
                "$SCRIPT_DIR/dev/sqlx-prepare.sh" --check
                ;;
            merge)
                "$SCRIPT_DIR/dev/sqlx-prepare.sh" --merge
                ;;
            *)
                _unknown_subcmd "$2" sqlx "prepare, check-offline, merge"
                ;;
        esac
        ;;
    run)
        run_all "${@:2}"
        ;;
    run-stop)
        stop_everything   # = stop-all --with-db 的别名
        ;;
    db)
        case "$2" in
            start)
                db_start
                ;;
            stop)
                db_stop
                ;;
            status)
                db_status
                ;;
            migrate)
                db_migrate
                ;;
            backup)
                db_backup
                ;;
            restore)
                db_restore "$3"
                ;;
            reset)
                db_reset
                ;;
            defense-check)
                db_defense_check "$3"
                ;;
            defense-check-all)
                db_defense_check_all
                ;;
            boundary-check)
                # 静态跨 schema SQL 引用门禁（无需 DB，与 defense-check 运行时检查互补）
                python3 "$SCRIPT_DIR/check_schema_boundary.py"
                ;;
            *)
                _unknown_subcmd "$2" db "start, stop, status, migrate, backup, restore, reset, defense-check, defense-check-all, boundary-check"
                ;;
        esac
        ;;
    redis)
        case "$2" in
            start)
                redis_start
                ;;
            stop)
                redis_stop
                ;;
            *)
                _unknown_subcmd "$2" redis "start, stop"
                ;;
        esac
        ;;
    dev)
        start_dev_macos
        ;;
    install-deps)
        info "调用依赖安装脚本..."
        "$SCRIPT_DIR/dev/install-deps.sh" all
        ;;
    ai)
        case "$2" in
            start|stop|status|pull)
                "$SCRIPT_DIR/dev/ai-models.sh" "$2" "${3:-}"
                ;;
            *)
                "$SCRIPT_DIR/dev/ai-models.sh"
                ;;
        esac
        ;;
    ws)
        case "$2" in
            check)
                ws_check
                ;;
            *)
                _unknown_subcmd "$2" ws "check"
                ;;
        esac
        ;;
    deploy)
        info "调用生产部署脚本（systemd 范式）..."
        # 2026-10-03: 部署范式已收敛为 A（systemd + /opt/topems），弃用 deploy.sh（docker run 离线范式 C）。
        # production-deploy.sh 默认读取 .env.production；本地 docker 部署请改用 scripts/deploy/docker/topems-docker.sh。
        "$SCRIPT_DIR/deploy/production-deploy.sh"
        ;;
    update-password|reset-password)
        # 2026-10-15: 密码必填（update-admin-password.sh 已移除 admin123 默认弱口令）
        if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
            error "用法: topems.sh update-password <用户名> <新密码>（密码必填，不再提供默认弱口令）"
            exit 1
        fi
        info "调用密码重置脚本..."
        "$SCRIPT_DIR/dev/update-admin-password.sh" -y "$2" "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    clean-all)
        # 活跃构建检测：持构建锁/有构建进程时拒绝清理，避免与 cargo 并发写 target
        _acquire_build_lock || exit 1
        clean_project --all "${@:2}"
        ;;
    clean)
        clean_project "${@:2}"
        ;;
    doctor)
        doctor_env
        ;;
    push)
        push_guard "${@:2}"
        ;;
    *)
        # 未识别命令：提示后透传给 core CLI（防敲错命令名被静默吞掉）
        if [ -f "$CLI_DIR/bin/topems" ]; then
            echo "提示: '$1' 不是 topems 内置命令，已透传给 core CLI (cli/bin/topems)" >&2
        fi
        run_cli "$@"
        ;;
esac