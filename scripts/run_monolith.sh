#!/usr/bin/env bash
# ============================================================================
# TopEMS 模块化单体统一入口启动脚本（:8099）
#
# 模块化单体模式下，全部 29 个业务服务以 real_module 方式嵌入 topems-server
# 统一入口。本脚本固化以下运行环境治理要点：
#   1. DB_MAX_CONNECTIONS=5：24+ 模块 × 多连接池，默认连接上限会耗尽 PG
#      max_connections（已 ALTER SYSTEM 100→300）
#   2. SEARCH_PATH：嵌入模式连接池 search_path 决定无前缀表引用解析；
#      mobile 等依赖 search_path 的模块必须包含其 schema
#   3. <SVC>_SERVICE_URL 全量注入 :8099：TypedServiceClient 服务间调用默认
#      打独立服务端口（8000/8020/8041…），嵌入模式下这些端口无服务；
#      统一指向 :8099 后服务间调用走 server 内嵌路由（service token 认证）
#
# 用法：
#   ./scripts/run_monolith.sh            # 前台运行（Ctrl+C 停止）
#   ./scripts/run_monolith.sh --daemon   # 后台运行（日志 /tmp/topems_server_5433.log）
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

BIN="${BIN:-./target/debug/topems-server}"
LOG="${LOG:-/tmp/topems_server_5433.log}"
MODE="${1:-}"

# 服务间调用统一指向模块化单体入口（服务名 → <SVC>_SERVICE_URL）
SERVICES=(CRM ERP FEEDBACK FILE FINANCE HRM IAM AI BI COMMUNICATION EHS GIS
          INTEGRATION LIMS MASTER_DATA MOBILE PDM PM PORTAL RD SCM SRM DOC
          MONITOR NOTIFICATION QMS SEARCH TICKET WMS WORKFLOW)

build_env() {
  echo "DB_MAX_CONNECTIONS=5"
  echo "SEARCH_PATH=mobile, rs, erp, public, iam, shared"
  # dashboard 聚合探活开关：portal probe_service_health 读该 env 统一探测 :8099/health
  # （缺失时走硬编码独立端口 → 嵌入模式下全部 healthy=false）
  echo "MONOLITH_SERVICE_URL=http://localhost:8099"
  for s in "${SERVICES[@]}"; do
    echo "${s}_SERVICE_URL=http://localhost:8099"
  done
}

# 用 env 显式传参（避免 eval 注入），可被调用方同名环境变量覆盖
ENV_ARGS=()
while IFS= read -r kv; do
  ENV_ARGS+=("$kv")
done < <(build_env)

if [ ! -x "$BIN" ]; then
  echo "错误：未找到 $BIN，请先执行 cargo build -p topems-server" >&2
  exit 1
fi

echo "启动 topems-server（模块化单体 :8099）…"
echo "  连接池: DB_MAX_CONNECTIONS=5  SEARCH_PATH 含 mobile/rs/erp/public/iam/shared"
echo "  服务间调用: ${#SERVICES[@]} 个 SERVICE_URL 统一指向 :8099"

if [ "$MODE" = "--daemon" ]; then
  env "${ENV_ARGS[@]}" nohup "$BIN" > "$LOG" 2>&1 &
  echo "后台运行 PID $!，日志 $LOG（启动约需 3 分钟，24 模块顺序建池）"
else
  env "${ENV_ARGS[@]}" "$BIN"
fi
