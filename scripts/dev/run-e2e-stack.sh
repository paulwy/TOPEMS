#!/usr/bin/env bash
# =============================================================
# 批 C-1：full-route-smoke 一键后端栈 + 真 token 化
# -------------------------------------------------------------
# 目标：起 8099 模块化单体（含全部嵌入服务）+ 校验真账号登录，
#       使 e2e smoke 走真 JWT，杜绝 mock token → 401 假失败。
#
# 用法：
#   ./scripts/dev/run-e2e-stack.sh up        # 起栈 + 健康校验
#   ./scripts/dev/run-e2e-stack.sh smoke     # 起栈后跑 full-route-smoke
#   ./scripts/dev/run-e2e-stack.sh login     # 仅校验真登录（admin/admin123）
#   ./scripts/dev/run-e2e-stack.sh stop      # 停 8099
#
# 复用：scripts/run_monolith.sh（8099 单体）、start-local.sh 默认账号。
# =============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

PORT="${PORT:-8099}"
API_URL="${API_URL:-http://localhost:$PORT}"
E2E_USER="${E2E_USER:-admin}"
E2E_PASS="${E2E_PASS:-admin123}"
LOG="${LOG:-/tmp/topems_monolith_e2e.log}"

info() { echo -e "\033[0;36m[e2e-stack]\033[0m $*"; }
ok()   { echo -e "\033[0;32m[✓]\033[0m $*"; }
warn() { echo -e "\033[0;33m[!]\033[0m $*"; }
die()  { echo -e "\033[0;31m[✗]\033[0m $*" >&2; exit 1; }

[ -f .env ] && { set -a; . ./.env; set +a; }

check_port() { lsof -Pi ":$1" -sTCP:LISTEN -t >/dev/null 2>&1; }

# 从 DATABASE_URL 提取连接（供 psql 种子用）
db_dsn() {
  local pw; pw="$(echo "${DATABASE_URL:-}" | sed -E 's#.*:([^:@]+)@.*#\1#')"
  local host; host="$(echo "${DATABASE_URL:-}" | sed -E 's#.*@([^:/]+).*#\1#')"
  local db; db="$(echo "${DATABASE_URL:-}" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
  echo "${pw}|${host}|${db}"
}

# 种子 e2e 账号 test_admin（复制 admin 凭据哈希，幂等）。
# full-route-smoke.spec.ts:96 硬编码 test_admin/admin123；默认库仅 admin。
seed_e2e_account() {
  IFS='|' read -r pw host db <<<"$(db_dsn)"
  if [ -z "${pw:-}" ]; then warn "未取到 DATABASE_URL，跳过 test_admin 种子"; return 0; fi
  info "种子 e2e 账号 test_admin（复制 admin 凭据哈希）..."
  PGPASSWORD="$pw" psql -h "${host:-127.0.0.1}" -U topems_app -d "${db:-topems}" -q -c \
    "INSERT INTO iam.users (username,email,password_hash,full_name,role_id,status,email_verified,is_superuser)
     SELECT 'test_admin','test_admin@test.local',password_hash,'E2E 管理员',role_id,'active',true,true
     FROM iam.users WHERE username='admin'
     ON CONFLICT (username) DO UPDATE SET password_hash=(SELECT password_hash FROM iam.users WHERE username='admin'), status='active', is_superuser=true;" \
    >/dev/null 2>&1 && ok "test_admin 就绪" || warn "test_admin 种子失败（可能表不存在）——smoke 将走 admin"
}

wait_health() {
  local tries="${1:-60}"
  info "等待 $API_URL/health ..."
  for ((i=1; i<=tries; i++)); do
    if curl -sf "$API_URL/health" >/dev/null 2>&1; then
      ok "$API_URL 健康（${i}/${tries}）"
      return 0
    fi
    sleep 2
  done
  die "$API_URL 未在 $((tries*2))s 内就绪，日志：$LOG"
}

up() {
  if check_port "$PORT"; then
    ok "8099 已在运行，跳过启动"
  else
    # debug 二进制缺失检测：run_monolith.sh 依赖 target/debug/topems-server
    if [ ! -x "$PROJECT_ROOT/target/debug/topems-server" ]; then
      warn "未找到 target/debug/topems-server，自动 cargo build（首次约 10+ 分钟）..."
      SQLX_OFFLINE=true cargo build -p topems-server
    fi
    info "启动模块化单体（后台，日志 ${LOG}）..."
    nohup ./scripts/run_monolith.sh --daemon >"${LOG}" 2>&1 &
  fi
  wait_health 120
}

login() {
  up
  seed_e2e_account
  info "校验真登录 ${E2E_USER}@$API_URL ..."
  local body
  body=$(curl -sf -X POST "$API_URL/api/core/iam/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$E2E_USER\",\"password\":\"$E2E_PASS\"}" || true)
  local token
  token=$(echo "$body" | python3 -c "import sys,json;
try:
 d=json.load(sys.stdin); print((d.get('data') or {}).get('access_token') or (d.get('data') or {}).get('token') or '')
except Exception: print('')" 2>/dev/null || true)
  [ -n "$token" ] || die "真登录失败——IAM 不可用或账号未种子化。响应：${body:-<空>}。请先跑 DB 迁移 + 种子账号（admin/admin123）。"
  ok "真登录成功（token 长度 ${#token}）——不会触发 mock fallback"
}

smoke() {
  login
  info "运行 full-route-smoke（API_URL=$API_URL）..."
  ( cd apps/web && API_URL="$API_URL" pnpm exec playwright test e2e/ui/full-route-smoke.spec.ts --project=chromium --workers=1 --retries=0 )
}

stop() {
  if check_port "$PORT"; then
    local pid; pid=$(lsof -Pi ":$PORT" -sTCP:LISTEN -t | head -1)
    info "停止 8099 PID=$pid"; kill "$pid" 2>/dev/null || true
  else
    info "8099 未运行"
  fi
}

case "${1:-up}" in
  up) up;;
  login) login;;
  smoke) smoke;;
  stop) stop;;
  *) die "未知命令: $1（up|login|smoke|stop）";;
esac
