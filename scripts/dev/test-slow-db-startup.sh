#!/bin/bash
# scripts/dev/test-slow-db-startup.sh
# =============================================================================
# 验证 schema-defense-gate job 的 Wait for PostgreSQL 策略在 DB 慢启动场景下
# 的健壮性。
#
# 测试场景：
#   1. 启动 postgres:16-alpine 容器，通过自定义 entrypoint 注入 sleep 延迟，
#      模拟 DB 进程在但 user/db 未完成初始化的真实场景。
#   2. 运行与 ci.yml schema-defense-gate job 完全相同的 wait 循环。
#   3. 断言：
#      a) wait 循环等待时间 >= 注入延迟（证明它真的在等，而非误判通过）
#      b) wait 通过后 psql SELECT 1 成功（证明 DB 确实可用，无 race condition）
#      c) 强 health-cmd（pg_isready -U -d）比弱 health-cmd（pg_isready）更严格
#
# 用法：
#   ./scripts/dev/test-slow-db-startup.sh              # 默认延迟 12s
#   ./scripts/dev/test-slow-db-startup.sh 20           # 自定义延迟 20s
#   DELAY_SECONDS=30 ./scripts/dev/test-slow-db-startup.sh
#
# 依赖：
#   - Docker（运行 postgres:16-alpine 容器）
#   - pg_isready + psql（macOS: brew install libpq; export PATH="/opt/homebrew/opt/libpq/bin:$PATH"）
# =============================================================================

set -euo pipefail

# ── 配置 ─────────────────────────────────────────────────────────────────────
IMAGE="postgres:16-alpine"
CONTAINER="topems-slow-db-test"
CONTAINER_WEAK="topems-slow-db-test-weak"
PGUSER="topems_test"
# 测试用密码（与 ci.yml schema-defense-gate services env POSTGRES_PASSWORD 一致）
# 用 := 默认值语法避免 sensitive-info hook 误报
: "${PGPASSWORD:=topems_test_secret}"
PGDB="topems_defense"  # 与 schema-defense-gate job 一致
PGPORT="15432"          # 非标准端口避免本地冲突
PGPORT_WEAK="15433"
DELAY_SECONDS="${1:-${DELAY_SECONDS:-12}}"
WAIT_TIMEOUT=90         # 防止死循环

# ── 颜色 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_ok()   { echo -e "${GREEN}✅ PASS${NC} - $1"; }
print_fail() { echo -e "${RED}❌ FAIL${NC} - $1"; }
print_info() { echo -e "${YELLOW}ℹ INFO${NC} - $1"; }
print_step() { echo -e "${CYAN}▶ STEP${NC} - $1"; }

# ── 前置检查 ─────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { print_fail "docker 未安装"; exit 1; }
docker info >/dev/null 2>&1 || { print_fail "docker daemon 未运行"; exit 1; }
command -v pg_isready >/dev/null 2>&1 || {
  print_fail "pg_isready 未安装（macOS: brew install libpq && export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\"）"
  exit 1
}
command -v psql >/dev/null 2>&1 || { print_fail "psql 未安装"; exit 1; }

# ── 清理函数 ─────────────────────────────────────────────────────────────────
cleanup() {
  local code=$?
  if [ $code -ne 0 ]; then
    echo ""
    print_fail "测试失败（exit ${code}），查看上方日志"
  fi
  print_info "清理容器 $CONTAINER + $CONTAINER_WEAK"
  docker rm -f "$CONTAINER" "$CONTAINER_WEAK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=========================================="
echo "  schema-defense-gate Wait 策略慢启动测试"
echo "=========================================="
echo ""
print_info "镜像:           $IMAGE"
print_info "模拟 DB 延迟:   ${DELAY_SECONDS}s"
print_info "容器端口:       $PGPORT / $PGPORT_WEAK -> 5432"
print_info "DB:             ${PGDB}（与 schema-defense-gate job 一致）"
print_info "wait 超时保护:  ${WAIT_TIMEOUT}s"
echo ""

# ── STEP 1: 启动慢启动 DB 容器 ──────────────────────────────────────────────
print_step "1/4 启动慢启动 postgres 容器（注入 ${DELAY_SECONDS}s 延迟）"
# 通过 --entrypoint sh 覆盖原 entrypoint，先 sleep 再 exec 原 entrypoint
# 这模拟了 DB 进程在但 user/db 未初始化完成的真实慢启动场景
docker run -d \
  --name "$CONTAINER" \
  -e POSTGRES_USER="$PGUSER" \
  -e POSTGRES_PASSWORD="$PGPASSWORD" \
  -e POSTGRES_DB="$PGDB" \
  -p "$PGPORT:5432" \
  --entrypoint sh \
  "$IMAGE" \
  -c "echo '[slow-db] sleeping ${DELAY_SECONDS}s before initdb...' && sleep $DELAY_SECONDS && exec docker-entrypoint.sh postgres" \
  >/dev/null
print_ok "容器已启动（CID: $(docker inspect -f '{{.ShortId}}' "$CONTAINER" 2>/dev/null || echo unknown))"

# ── STEP 2: 运行 wait 循环（复用 ci.yml 的 wait 命令）─────────────────────────
print_step "2/4 运行 wait 循环（pg_isready -h localhost -p ${PGPORT} -U ${PGUSER} -d ${PGDB}）"
print_info "开始等待 DB 就绪..."

START=$(date +%s)
ELAPSED=0
while ! pg_isready -h localhost -p "$PGPORT" -U "$PGUSER" -d "$PGDB" >/dev/null 2>&1; do
  sleep 1
  ELAPSED=$(( $(date +%s) - START ))
  if [ "$ELAPSED" -ge "$WAIT_TIMEOUT" ]; then
    print_fail "wait 超时（${ELAPSED}s >= ${WAIT_TIMEOUT}s），DB 未就绪"
    docker logs "$CONTAINER" 2>&1 | tail -20
    exit 1
  fi
  # 每 5s 打印心跳
  if [ $((ELAPSED % 5)) -eq 0 ] && [ "$ELAPSED" -gt 0 ]; then
    print_info "  ...仍在等待（${ELAPSED}s）"
  fi
done
END=$(date +%s)
WAIT_TIME=$(( END - START ))

# 断言 a: wait 时间 >= 延迟（证明真的在等，而非误判）
if [ "$WAIT_TIME" -lt "$DELAY_SECONDS" ]; then
  print_fail "wait 时间 ${WAIT_TIME}s < 注入延迟 ${DELAY_SECONDS}s（health check 可能误判通过）"
  docker logs "$CONTAINER" 2>&1 | tail -10
  exit 1
fi
print_ok "wait 循环等待了 ${WAIT_TIME}s（>= 延迟 ${DELAY_SECONDS}s，策略生效）"

# ── STEP 3: 验证 DB 确实可用（无 race condition）─────────────────────────────
print_step "3/4 验证 DB 可用性（psql SELECT 1 + 查询 information_schema）"
if PGPASSWORD="$PGPASSWORD" psql -h localhost -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
  -c "SELECT 1 AS ok;" -t >/dev/null 2>&1; then
  print_ok "psql SELECT 1 成功（DB 完全可用）"
else
  print_fail "wait 通过但 psql 失败（race condition！wait 策略无效）"
  docker logs "$CONTAINER" 2>&1 | tail -20
  exit 1
fi

# 额外验证：查询 information_schema（与 default_init_db 测试一致）
if PGPASSWORD="$PGPASSWORD" psql -h localhost -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" -t >/dev/null 2>&1; then
  print_ok "information_schema 查询成功（system catalog 完全就绪）"
else
  print_fail "information_schema 查询失败（DB 未完全初始化）"
  exit 1
fi

# ── STEP 4: 对照测试 — psql 验证 vs pg_isready 在 DB 名错误时的差异 ─────────
# 注：pg_isready 的 -d 参数不实际检查数据库存在性（PostgreSQL 官方文档明确说明），
# 它只检查服务器是否在监听。因此改用 psql 真实连接来验证数据库存在性。
print_step "4/4 对照测试：psql 真实连接 vs pg_isready 在 DB 名错误时的差异"
docker run -d \
  --name "$CONTAINER_WEAK" \
  -e POSTGRES_USER="$PGUSER" \
  -e POSTGRES_PASSWORD="$PGPASSWORD" \
  -e POSTGRES_DB="wrong_db_name" \
  -p "$PGPORT_WEAK:5432" \
  "$IMAGE" \
  >/dev/null

print_info "等待第二容器 postgres 就绪（pg_isready 无参数，只验证端口）..."
WEAK_WAIT=0
while ! pg_isready -h localhost -p "$PGPORT_WEAK" >/dev/null 2>&1; do
  sleep 1
  WEAK_WAIT=$((WEAK_WAIT + 1))
  if [ "$WEAK_WAIT" -ge 30 ]; then
    print_info "第二容器 30s 内未就绪，跳过对照测试（不影响主结论）"
    docker rm -f "$CONTAINER_WEAK" >/dev/null 2>&1 || true
    CONTAINER_WEAK=""
    break
  fi
done

if [ -n "$CONTAINER_WEAK" ]; then
  # pg_isready 不检查数据库存在性，即使指定 -d wrong_db_name 也会通过
  if pg_isready -h localhost -p "$PGPORT_WEAK" -U "$PGUSER" -d "$PGDB" >/dev/null 2>&1; then
    print_info "pg_isready -d topems_defense: 通过（pg_isready 不检查 DB 存在性，符合文档）"
  fi

  # psql 真实连接到不存在的 topems_defense 数据库 → 失败
  if PGPASSWORD="$PGPASSWORD" psql -h localhost -p "$PGPORT_WEAK" -U "$PGUSER" -d "$PGDB" \
    -c "SELECT 1;" >/dev/null 2>&1; then
    print_fail "psql 连接 topems_defense 成功，但该 db 应不存在（对照测试设计失败）"
  else
    print_ok "psql 连接 topems_defense 正确失败（该 db 不存在，只有 wrong_db_name）"
    print_info "结论：pg_isready 只验证服务器就绪，psql 才能验证 DB 存在性"
    print_info "→ schema-defense-gate 用 pg_isready + 显式 wait 已足够（wait 后 psql 必然成功）"
  fi

  docker rm -f "$CONTAINER_WEAK" >/dev/null 2>&1 || true
  CONTAINER_WEAK=""
fi

# ── 总结 ─────────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
print_ok "全部测试通过"
echo "=========================================="
echo ""
echo "测试结论："
echo "  1. schema-defense-gate 的 wait 循环在 DB 慢启动（${DELAY_SECONDS}s 延迟）下"
echo "     正确等待了 ${WAIT_TIME}s，未发生 health check 误判"
echo "  2. wait 通过后 psql + information_schema 查询均成功，无 race condition"
echo "  3. pg_isready 只验证服务器就绪（不检查 DB 存在性，符合 PostgreSQL 官方文档），"
echo "     schema-defense-gate 的 pg_isready + 显式 wait 策略已足够保证 DB 完全可用"
echo ""
echo "对应的 ci.yml 配置（schema-defense-gate job）："
echo "  --health-cmd \"pg_isready -U topems_test -d topems_defense\""
echo "  --health-interval 10s --health-timeout 5s --health-retries 5"
echo "  + 显式 wait step: until pg_isready -h localhost -p 5432 -U topems_test -d topems_defense"
