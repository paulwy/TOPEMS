#!/usr/bin/env sh
# 生成 pgbouncer 的 userlist.txt（部署时执行，不要提交真实口令）。
# auth_type=scram-sha-256 需要 userlist 里是明文口令（pgbouncer 自行做 SCRAM 校验）。
#
# 用法：
#   POSTGRES_PASSWORD=xxx PGBOUNCER_APP_PASSWORD=yyy ./render-userlist.sh [输出路径]
#
# 环境变量：
#   POSTGRES_PASSWORD         owner 角色口令（必填）
#   PGBOUNCER_APP_PASSWORD    topems_app 口令（缺省与 owner 相同，仅限单口令部署）
#   PGBOUNCER_OWNER_USER      缺省 topems
#   PGBOUNCER_APP_USER        缺省 topems_app
set -eu

OUT="${1:-$(dirname "$0")/userlist.txt}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD 必须提供}"
OWNER_USER="${PGBOUNCER_OWNER_USER:-topems}"
APP_USER="${PGBOUNCER_APP_USER:-topems_app}"
APP_PASSWORD="${PGBOUNCER_APP_PASSWORD:-$POSTGRES_PASSWORD}"

umask 077
{
  printf '"%s" "%s"\n' "$OWNER_USER" "$POSTGRES_PASSWORD"
  printf '"%s" "%s"\n' "$APP_USER" "$APP_PASSWORD"
} > "$OUT"
chmod 600 "$OUT"
printf 'wrote %s (mode 600, users: %s, %s)\n' "$OUT" "$OWNER_USER" "$APP_USER"
