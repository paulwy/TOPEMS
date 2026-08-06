#!/usr/bin/env bash
# ============================================================================
# TOPEMS 端口变量不一致修复脚本
# 修复 config/ports.env 与各服务 src/main.rs 之间的端口命名/默认值/fallback 不一致。
#
# 修复范围（共 11 项，全部幂等）：
#   [A-1] ports.env     增补 LOWCODE_PORT=8088
#   [A-2] ports.env     增补 ANALYTICS_PORT=8060（BI 别名）
#   [B]   svc/analytics 优先读 BI_PORT（与 ports.env 权威命名对齐），补齐
#                       SERVER_PORT -> PORT fallback
#   [C]   svc/search    默认值 8083 -> 8082（与 SEARCH_PORT=8082 对齐）
#   [D-1..7] 7 个手写 main.rs 补齐 SERVER_PORT / PORT fallback
#           顺序与 shared-bootstrap::resolve_port 完全一致
#
# 用法:
#   bash scripts/fix-port-mismatch.sh --dry-run     # 只报告，不修改
#   bash scripts/fix-port-mismatch.sh               # 实际修改（自动备份）
#   bash scripts/fix-port-mismatch.sh --no-fallbacks  # 只修 A/B/C，不修 D
#   bash scripts/fix-port-mismatch.sh --help        # 帮助
#
# 备份: 每个被修改的文件会生成 *.portfix.bak.<timestamp>
# 一键回滚:
#   find . -name '*.portfix.bak.*' -exec bash -c 'mv "$0" "${0%%.portfix.bak.*}"' {} \;
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORTS_ENV="$PROJECT_ROOT/config/ports.env"

# ---------- 命令行参数 ----------
DRY_RUN=false
WITH_FALLBACKS=true
for arg in "$@"; do
  case "$arg" in
    --dry-run)      DRY_RUN=true ;;
    --no-fallbacks) WITH_FALLBACKS=false ;;
    -h|--help)
      sed -n '2,/^$/p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
  esac
done

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_SUFFIX=".portfix.bak.${TIMESTAMP}"

# ---------- 工具函数 ----------
backup_file() {
  local f="$1"
  if $DRY_RUN; then return 0; fi
  if [ -f "$f" ]; then cp "$f" "${f}${BACKUP_SUFFIX}"; fi
}

# 对单文件做一次精确替换（old 字面量完整匹配）
run_edit() {
  local file="$1" old="$2" new="$3" label="$4"
  if grep -Fq -- "$old" "$file"; then
    if $DRY_RUN; then
      echo "[DRY] $label: will modify $file"
    else
      backup_file "$file"
      # perl -0777 跨平台 sed -i 替代
      perl -0777 -i -pe "s/\Q$old\E/$new/g" "$file"
      echo "[ OK ] $label: applied to $file"
    fi
  elif grep -Fq -- "$new" "$file"; then
    echo "[SKIP] $label: already applied"
  else
    echo "[WARN] $label: fragment NOT matched in $file; manual review required"
  fi
}

report_env_var() {
  local key="$1" expected="$2"
  local cur
  if grep -Eq "^${key}=" "$PORTS_ENV"; then
    cur="$(grep -E "^${key}=" "$PORTS_ENV" | tail -n1 | cut -d= -f2)"
    if [ "$cur" = "$expected" ]; then
      echo "[ OK ] ports.env: $key=$expected"
    else
      echo "[WARN] ports.env: $key=$cur (expected $expected; script will NOT overwrite)"
    fi
  else
    echo "[MISS] ports.env: $key missing (will set $key=$expected)"
  fi
}

# ============================================================================
# Step 1: 现状快照
# ============================================================================
echo "==================== 1. ports.env Status ===================="
report_env_var "LOWCODE_PORT"      "8088"
report_env_var "ANALYTICS_PORT"    "8060"
report_env_var "BI_PORT"           "8060"
report_env_var "SEARCH_PORT"       "8082"
report_env_var "MASTER_DATA_PORT"  "8090"
echo ""

# ============================================================================
# [A] ports.env 增补缺失变量
# ============================================================================
echo "==================== 2. ports.env: add missing vars ===================="

# A-1: 在主数据服务段前面插入 lowcode
if ! grep -Eq '^LOWCODE_PORT=' "$PORTS_ENV"; then
  A1_OLD='# ================================================
# 主数据服务 (8090)
# ================================================
MASTER_DATA_PORT=8090'
  A1_NEW='# ================================================
# 低代码平台服务 (8088)
# ================================================
LOWCODE_PORT=8088

# ================================================
# 主数据服务 (8090)
# ================================================
MASTER_DATA_PORT=8090'
  run_edit "$PORTS_ENV" "$A1_OLD" "$A1_NEW" \
    "[A-1] insert LOWCODE_PORT=8088 before master-data section"
else
  echo "[SKIP] [A-1] LOWCODE_PORT already present"
fi

# A-2: BI_PORT 下一行追加 ANALYTICS_PORT alias
if ! grep -Eq '^ANALYTICS_PORT=' "$PORTS_ENV"; then
  run_edit "$PORTS_ENV" "BI_PORT=8060" "BI_PORT=8060
ANALYTICS_PORT=8060" \
    "[A-2] append ANALYTICS_PORT=8060 after BI_PORT=8060"
else
  echo "[SKIP] [A-2] ANALYTICS_PORT already present"
fi
echo ""

# ============================================================================
# [B] analytics/main.rs 端口读取顺序
# ============================================================================
echo "==================== 3. analytics/main.rs: port resolution ===================="
B_OLD='    let port = std::env::var("ANALYTICS_PORT")
        .unwrap_or_else(|_| "8060".to_string())
        .parse()
        .unwrap_or(8060);'
B_NEW='    let port = std::env::var("BI_PORT")
        .or_else(|_| std::env::var("ANALYTICS_PORT"))
        .or_else(|_| std::env::var("SERVER_PORT"))
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "8060".to_string())
        .parse()
        .unwrap_or(8060);'
run_edit "$PROJECT_ROOT/svc/analytics/src/main.rs" "$B_OLD" "$B_NEW" \
  "[B] BI_PORT -> ANALYTICS_PORT -> SERVER_PORT -> PORT -> default 8060"
echo ""

# ============================================================================
# [C] search/main.rs 默认值修正
# ============================================================================
echo "==================== 4. search/main.rs: default value 8083 -> 8082 ===================="
C_OLD='        .unwrap_or_else(|_| "8083".to_string())
        .parse()
        .unwrap_or(8083);'
C_NEW='        .unwrap_or_else(|_| "8082".to_string())
        .parse()
        .unwrap_or(8082);'
run_edit "$PROJECT_ROOT/svc/search/src/main.rs" "$C_OLD" "$C_NEW" \
  "[C] align unwrap_or default with SEARCH_PORT=8082 in ports.env"
echo ""

# ============================================================================
# [D] 其他 7 个手写 main.rs: 补齐 SERVER_PORT / PORT fallback
# ============================================================================
if $WITH_FALLBACKS; then
  echo "==================== 5. handwritten main.rs: SERVER_PORT/PORT fallback ===================="
  echo "         (same order as shared-bootstrap::resolve_port)"
  echo ""

  TARGETS=(
    "svc/pdm/src/main.rs|PDM_PORT|8031"
    "svc/feedback/src/main.rs|FEEDBACK_PORT|8087"
    "svc/communication/src/main.rs|COMMUNICATION_PORT|8084"
    "svc/ticket/src/main.rs|TICKET_PORT|8086"
    "svc/qms/src/main.rs|QMS_PORT|8050"
    "svc/billing/src/main.rs|BILLING_PORT|8085"
    "svc/master-data/src/main.rs|MASTER_DATA_PORT|8090"
  )

  for entry in "${TARGETS[@]}"; do
    file="${entry%%|*}"
    rest="${entry#*|}"
    var="${rest%%|*}"
    default="${rest#*|}"
    D_OLD="    let port = std::env::var(\"${var}\")
        .unwrap_or_else(|_| \"${default}\".to_string())
        .parse()
        .unwrap_or(${default});"
    D_NEW="    let port = std::env::var(\"${var}\")
        .or_else(|_| std::env::var(\"SERVER_PORT\"))
        .or_else(|_| std::env::var(\"PORT\"))
        .unwrap_or_else(|_| \"${default}\".to_string())
        .parse()
        .unwrap_or(${default});"
    svcname="$(basename "$file" .rs)"
    run_edit "$PROJECT_ROOT/$file" "$D_OLD" "$D_NEW" \
      "[D] ${svcname}: insert SERVER_PORT -> PORT fallback (var=${var})"
  done
  echo ""
else
  echo "==================== 5. [skipped] --no-fallbacks set ===================="
  echo ""
fi

# ============================================================================
# 结束
# ============================================================================
echo "==================== Done ===================="
if $DRY_RUN; then
  echo "DRY-RUN only. Re-run without --dry-run to apply changes."
else
  echo "Backup suffix: ${BACKUP_SUFFIX}"
  echo "Rollback command:"
  echo "  find $PROJECT_ROOT -name '*${BACKUP_SUFFIX}' -exec bash -c 'mv \"\$0\" \"\${0%%${BACKUP_SUFFIX}}\"' {} \;"
fi
