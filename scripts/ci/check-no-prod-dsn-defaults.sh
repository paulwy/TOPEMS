#!/usr/bin/env bash
# ==============================================================================
# 禁止生产 DSN 作为 DATABASE_URL 默认值
#
# 背景（2026-11-18）：`.env` 的 DATABASE_URL 默认指向 topems_prod，未显式设变量的
# 落点测试直接连生产库建/删 schema。本门禁扫描「可提交的环境模板/部署配置」与
# 「Rust 内置默认值」，防止生产连接串再次被写成默认值。
#
# 只检查可提交文件；本机 .env 不参与（它不应入库）。
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# 生产库/生产角色/生产环境的命名特征
PROD_RE='(topems_prod|_prod([/?":@]|$)|[/@:]prod([/?":]|$)|production)'
violations=0

scan_env_template() {
  local f="$1"
  [ -f "$f" ] || return 0
  # 只看生效赋值行（env 用 =，YAML 用 :），忽略注释行
  local hits
  hits="$(grep -nE "^[[:space:]]*(DATABASE_URL|TEST_DATABASE_URL|MIGRATE_URL)[[:space:]]*[:=][[:space:]]*[\"']?[^\"'#]*${PROD_RE}" "$f" || true)"
  if [ -n "$hits" ]; then
    echo "❌ $f 中的数据库 DSN 默认值命中生产特征：" >&2
    printf '%s\n' "$hits" | sed 's/^/    /' >&2
    violations=1
  fi
}

for f in \
  .env.example \
  .env.production.example \
  config/env/_template.env.example \
  config/env/.env.production.template \
  scripts/tools/migration-generator/.env.example \
  deploy/k8s/base/configmap.yaml \
  deploy/docker/docker-compose.yml
do
  scan_env_template "$f"
done

# Rust 内置默认值（default_database_url / DATABASE_URL 常量）不得含生产特征
rust_hits="$(grep -rnE -A6 'fn default_(test_)?database_url|DATABASE_URL[[:space:]]*:[[:space:]]*&?str[[:space:]]*=[[:space:]]*"' lib svc --include='*.rs' 2>/dev/null \
  | grep -E 'postgres(ql)?://' \
  | grep -E "${PROD_RE}" || true)"
if [ -n "$rust_hits" ]; then
  echo "❌ Rust 代码内置的 DATABASE_URL 默认值命中生产特征：" >&2
  printf '%s\n' "$rust_hits" | sed 's/^/    /' >&2
  violations=1
fi

# --- 回退式默认值：shell `:-` 与 Rust unwrap_or* -----------------------------------
# 上一版只扫 7 个模板文件，漏掉「脚本内联默认串」与「测试里的兜底字面量」两类；
# 这里补上，命中生产特征即阻断。

# 1) shell：${VAR:-"postgres://..."} 形式的默认连接串
shell_fallback="$(grep -rnE '"[^"]*\$\{[A-Za-z0-9_]*(DATABASE_URL|MIGRATE_URL|_DSN)[^}]*:-[^"]*postgres(ql)?://' \
  scripts --include='*.sh' 2>/dev/null | grep -E "${PROD_RE}" || true)"
if [ -n "$shell_fallback" ]; then
  echo "❌ shell 脚本的 DSN 回退默认值命中生产特征：" >&2
  printf '%s\n' "$shell_fallback" | sed 's/^/    /' >&2
  violations=1
fi

# 2) Rust：unwrap_or / unwrap_or_else 里带的兜底连接串
rust_fallback="$(grep -rnE -A3 'unwrap_or(_else)?\(' lib svc --include='*.rs' 2>/dev/null \
  | grep -E 'postgres(ql)?://' \
  | grep -E "${PROD_RE}" || true)"
if [ -n "$rust_fallback" ]; then
  echo "❌ Rust 代码 unwrap_or* 的兜底 DSN 命中生产特征：" >&2
  printf '%s\n' "$rust_fallback" | sed 's/^/    /' >&2
  violations=1
fi

# 3) 默认值内嵌明文口令：本机开发也不允许（改用 socket 认证或环境变量注入）
pw_hits="$(grep -rnE '\$\{[A-Za-z0-9_]*(DATABASE_URL|MIGRATE_URL|_DSN)[^}]*:-[^}]*://[^}"@]*:[^}"@]*@' \
  scripts --include='*.sh' 2>/dev/null || true)"
if [ -f .env.example ]; then
  env_pw="$(grep -nE "^[[:space:]]*(DATABASE_URL|TEST_DATABASE_URL|MIGRATE_URL)[[:space:]]*=.*://[^:\"'@]*:[^:\"'@]*@" .env.example || true)"
  [ -n "$env_pw" ] && pw_hits="${pw_hits}
${env_pw}"
fi
if [ -n "$pw_hits" ]; then
  echo "❌ DSN 默认值内嵌明文口令（应改用 socket 认证或运行前注入）：" >&2
  printf '%s\n' "$pw_hits" | sed 's/^/    /' >&2
  violations=1
fi

if [ "$violations" -ne 0 ]; then
  echo "" >&2
  echo "生产 DSN 不得作为默认值：请留空或注释，改为运行前显式注入；本地模板见 .env.example。" >&2
  echo "缺失 DATABASE_URL 时必须 fail-fast，禁止静默回退到生产库。" >&2
  exit 1
fi

echo "✅ 未发现生产 DSN 默认值"
