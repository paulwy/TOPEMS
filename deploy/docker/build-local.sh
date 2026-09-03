#!/bin/bash
# TOPEMS 本地部署构建脚本（docker compose 全服务镜像）
#
# 设计要点（针对 09-02 构建反复卡死/失败的经验）：
#   1. 串行构建（--progress plain 逐服务）——避免 16GB 机器并行 21 个 Rust release 编译导致 OOM（portal 曾被 SIGKILL）
#   2. 容器内 cargo 走中科大 sparse 镜像 + HTTP/1.1（Dockerfile.service 已内置）——rsproxy 偶发 HTTP/2 流重置会卡死下载
#   3. 支持断点续跑（--from <svc>）——构建中途失败不必从头再来
#   4. 每次构建独立日志 /tmp/build-<svc>-<ts>.log，失败可查
#
# 用法:
#   bash deploy/docker/build-local.sh                 # 构建全部 21 个业务服务
#   bash deploy/docker/build-local.sh erp qms         # 构建指定服务
#   bash deploy/docker/build-local.sh --from portal   # 从 portal 开始续跑
#   bash deploy/docker/build-local.sh --parallel 2    # 并行 2 个（内存充足时加速，默认 1）
set -euo pipefail

cd "$(dirname "$0")/../.."   # 回到仓库根
COMPOSE_DIR=deploy/docker

# 默认 21 个业务服务（与 docker-compose.yml 一致）
DEFAULT_SERVICES="unified-core erp hrm pm crm mes pdm scm wms srm qms lims ehs rd bi portal finance ai mobile gis integration"

# 解析参数
SERVICES=()
PARALLEL=1
START_FROM=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) START_FROM="$2"; shift 2 ;;
    --parallel) PARALLEL="$2"; shift 2 ;;
    *) SERVICES+=("$1"); shift ;;
  esac
done
[[ ${#SERVICES[@]} -eq 0 ]] && SERVICES=($DEFAULT_SERVICES)

# 断点续跑：跳过 START_FROM 之前的
if [[ -n "$START_FROM" ]]; then
  SERVICES=($(printf '%s\n' "${SERVICES[*]:-}" | tr ' ' '\n' | awk -v s="$START_FROM" 'found||$0==s{found=1} found' | tr '\n' ' '))
  echo "→ 从 $START_FROM 续跑：${SERVICES[*]:-}"
fi

# 内存检查（16GB 机器默认 1 并行；--parallel 可显式覆盖）
TOTAL_MEM_GB=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", $1/1024/1024/1024}')
echo "→ 本机内存 ${TOTAL_MEM_GB}GB，并行度 ${PARALLEL}（16GB 以下建议 1）"
if [[ "${TOTAL_MEM_GB:-16}" -lt 16 && "$PARALLEL" -gt 1 ]]; then
  echo "⚠️  内存 <16GB 且并行 >1 可能 OOM，建议 --parallel 1"
fi

TS=$(date +%Y%m%d_%H%M%S)
OK_LIST=()
FAIL_LIST=()
cd "$COMPOSE_DIR"

build_one() {
  local svc=$1
  local log="/tmp/build-${svc}-${TS}.log"
  echo "────────────────────────────"
  echo "🚀 BUILD $svc  $(date '+%H:%M:%S')"
  if docker compose build --progress plain "$svc" >"$log" 2>&1; then
    echo "✅ OK   $svc"
    OK_LIST+=("$svc")
  else
    echo "❌ FAIL ${svc}（日志: ${log}）"
    tail -5 "$log"
    FAIL_LIST+=("$svc")
  fi
}

# 串行或按并行度分批（每批 PARALLEL 个后台构建，完成后下一批，避免 16GB 机器 OOM）
if [[ "$PARALLEL" -eq 1 ]]; then
  for svc in "${SERVICES[@]}"; do build_one "$svc"; done
else
  _batch=0
  for svc in "${SERVICES[@]}"; do
    build_one "$svc" &
    _batch=$((_batch + 1))
    if [[ $_batch -ge $PARALLEL ]]; then
      wait
      _batch=0
    fi
  done
  wait
fi

echo
echo "══════════════════════════════════════"
echo "  构建完成 $(date '+%H:%M:%S')"
echo "  成功 ${#OK_LIST[@]}: ${OK_LIST[*]:-无}"
echo "  失败 ${#FAIL_LIST[@]}: ${FAIL_LIST[*]:-无}"
echo "══════════════════════════════════════"
[[ ${#FAIL_LIST[@]} -gt 0 ]] && exit 1 || exit 0
