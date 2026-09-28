#!/bin/bash
# TOPEMS 运行环境升级脚本：停服 → 应用治理迁移 → 起服 → 验证
# 由 MainAgent 在 docker compose build 完成后执行
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
# 口令从环境变量注入（禁止明文硬编码）；未设置时拒绝执行
export PGPASSWORD="${TOPEMS_DB_PASSWORD:-}"
if [ -z "$PGPASSWORD" ]; then
  echo "错误: 请设置 TOPEMS_DB_PASSWORD 环境变量（5433 容器库 topems 用户口令）" >&2
  echo "例如: TOPEMS_DB_PASSWORD='<口令>' bash scripts/upgrade-runtime.sh" >&2
  exit 2
fi
DB="psql -h localhost -p 5433 -U topems -d topems"
DOCKER_DIR="$REPO_ROOT/deploy/docker"

echo "════════════════════════════════════════════"
echo " 步骤 1/4：停止 docker 业务服务"
echo "════════════════════════════════════════════"
cd "$DOCKER_DIR"
docker compose stop unified-core erp hrm pm crm mes pdm scm wms srm qms lims ehs rd bi portal finance ai mobile gis integration 2>&1 | tail -3

echo
echo "════════════════════════════════════════════"
echo " 步骤 2/4：应用治理迁移（5433 运行库）"
echo "════════════════════════════════════════════"
echo "→ 2a. 归位 qa_ehs_*/qa_* → ehs/qms（69 张）"
$DB -v ON_ERROR_STOP=1 -f "$REPO_ROOT/database/migrations/20260902000001_rehome_ehs_qms.sql" && echo "  归位 ✅"
echo "→ 2b. DROP 剩余 public 影子表（59 张）"
$DB -v ON_ERROR_STOP=1 -f "$REPO_ROOT/database/migrations/20260902000002_drop_public_remaining_shadows.sql" && echo "  DROP ✅"
echo "→ 2c. auth FK → core_users（refresh_tokens/sessions）"
$DB -v ON_ERROR_STOP=1 -f "$REPO_ROOT/database/migrations/20260902000003_auth_fk_5433.sql" && echo "  auth ✅"

echo
echo "════════════════════════════════════════════"
echo " 步骤 3/4：启动新镜像服务"
echo "════════════════════════════════════════════"
docker compose up -d unified-core erp hrm pm crm mes pdm scm wms srm qms lims ehs rd bi portal finance ai mobile gis integration 2>&1 | tail -5

echo
echo "════════════════════════════════════════════"
echo " 步骤 4/4：等待健康并验证"
echo "════════════════════════════════════════════"
echo "→ 等待 60s 服务启动..."
sleep 60
echo "→ consul 健康检查："
curl -s http://localhost:8500/v1/health/state/critical 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('  critical:', len(d))"
curl -s http://localhost:8500/v1/health/state/passing 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('  passing:', len(set(c['ServiceName'] for c in d if c['ServiceName'])))"

echo "→ public 表数（应 ~56）："
$DB -tA -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public';"
echo "→ ehs/qms schema 表数："
$DB -tA -c "SELECT n.nspname||'='||count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('ehs','qms') GROUP BY 1 ORDER BY 1;"
echo
echo "════════════════════════════════════════════"
echo " 升级完成"
echo "════════════════════════════════════════════"
