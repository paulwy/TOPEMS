#!/usr/bin/env bash
# =============================================================================
# TOPEMS 台账(_sqlx_migrations) checksum 重锚 / 孤儿行清理
# =============================================================================
#
# 用途：
#   当某个【已应用】迁移文件内容被改动（checksum 漂移），或磁盘上删除了某个
#   已记账迁移文件时，sqlx migrate run 会以台账摘要与磁盘文件比对并阻断。本脚本
#   在不重放 DDL 的前提下把台账重锚到当前磁盘状态：
#     1. 台账 description 为 .sql 文件名的行：按【精确文件名】在磁盘定位，
#        重算 SHA-384（sqlx-cli 0.9 台账摘要算法），不一致则 UPDATE checksum；
#        磁盘已无该文件 → 记为孤儿行（默认仅提示，--purge-orphans 才 DELETE）。
#     2. description 为自由文本的旧引导行（version 0-7 等）：按版本号仅做
#        存在性提示，不重锚、不删除。
#
# 为什么按文件名而不是只按版本号：
#   历史上出现过两个文件共用同一版本号（M1 的两个 20261018000002）。只按版本
#   号重锚会把台账错配到另一个同版本文件的摘要，导致后者被误判已应用而跳过 DDL。
#   因此以台账记录的文件名（description）为准。
#
# 安全：
#   - 默认 dry-run，只打印将执行的 SQL，不落库；加 --apply 才真正执行。
#   - 只处理 public._sqlx_migrations（权威台账）。
#   - 幂等：已一致的版本不产生任何语句；自由文本旧引导行永不删除。
#
# 用法：
#   export DATABASE_URL="postgres://user:pass@host:5432/db"
#   # 1) 先干跑，核对将重锚/清理哪些版本
#   bash scripts/migration/rebaseline-ledger.sh --source database/migrations
#   # 2) 确认后执行（含孤儿清理）
#   bash scripts/migration/rebaseline-ledger.sh --source database/migrations \
#       --purge-orphans --apply
#
# 选项：
#   --source <dir>          磁盘迁移目录（默认 database/migrations）
#   --purge-orphans        删除磁盘已不存在的 .sql 台账行（默认仅提示）
#   --apply                真正执行 SQL（默认 dry-run 只打印）
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$REPO_ROOT/database/migrations"
APPLY=false
PURGE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_DIR="$2"
      shift 2
      ;;
    --purge-orphans)
      PURGE=true
      shift
      ;;
    --apply)
      APPLY=true
      shift
      ;;
    --help|-h)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      exit 2
      ;;
  esac
done

: "${DATABASE_URL:?请先设置 DATABASE_URL}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "迁移目录不存在: $SOURCE_DIR" >&2
  exit 1
fi

# sqlx-cli 0.9 台账摘要 = SHA-384(文件字节)，48 字节
sha384_file() {
  if command -v sha384sum >/dev/null 2>&1; then
    sha384sum "$1" | awk '{print $1}'
  else
    shasum -a 384 "$1" | awk '{print $1}'
  fi
}

# 磁盘文件名 → 绝对路径（精确名索引）
FILE_INDEX="$(mktemp)"
# 版本号 → 绝对路径（自由文本引导行仅用于存在性提示）
VERSION_INDEX="$(mktemp)"
LEDGER="$(mktemp)"
trap 'rm -f "$FILE_INDEX" "$VERSION_INDEX" "$LEDGER"' EXIT

while IFS= read -r -d '' file; do
  base="$(basename "$file")"
  printf '%s\t%s\n' "$base" "$file" >> "$FILE_INDEX"
  if [[ "$base" =~ ^([0-9]{14})[_-] ]]; then
    printf '%s\t%s\n' "${BASH_REMATCH[1]}" "$file" >> "$VERSION_INDEX"
  fi
done < <(find "$SOURCE_DIR" -maxdepth 1 -type f -name '*.sql' \
  ! -name '*.backup' ! -name '*.sql.backup' ! -name '*.down.sql' -print0)

# 台账全量：version <TAB> checksum(hex) <TAB> description
psql "$DATABASE_URL" -t -A -F $'\t' -c \
  "SELECT version, encode(checksum,'hex'), COALESCE(description,'') FROM public._sqlx_migrations ORDER BY version" \
  > "$LEDGER"

REBASED=0
ORPHANED=0
SKIPPED=0

while IFS=$'\t' read -r ver old_hex desc; do
  [[ -z "$ver" ]] && continue

  # 1) description 是 .sql 文件名 → 精确文件名核对
  if [[ "$desc" == *.sql ]]; then
    disk_file="$(awk -F'\t' -v f="$desc" '$1==f{print $2; exit}' "$FILE_INDEX")"
    if [[ -n "$disk_file" ]]; then
      new_hex="$(sha384_file "$disk_file")"
      if [[ "$new_hex" != "$old_hex" ]]; then
        echo "REBASELINE $ver  $desc"
        sql="UPDATE public._sqlx_migrations SET checksum=decode('$new_hex','hex') WHERE version=$ver;"
        echo "  $sql"
        if $APPLY; then
          psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
        fi
        REBASED=$((REBASED + 1))
      fi
    else
      echo "ORPHAN    $ver  $desc  (磁盘已无该文件)"
      if $PURGE; then
        sql="DELETE FROM public._sqlx_migrations WHERE version=$ver AND description = '$desc';"
        echo "  $sql"
        if $APPLY; then
          psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
        fi
      else
        echo "  (加 --purge-orphans 删除该台账行)"
      fi
      ORPHANED=$((ORPHANED + 1))
    fi
    continue
  fi

  # 2) 自由文本描述行：按版本号定位磁盘文件；存在则比对摘要漂移并重锚，
  #    无磁盘文件（早期引导 schema）则保留不动。
  disk_file="$(awk -F'\t' -v v="$ver" '$1==v{print $2; exit}' "$VERSION_INDEX")"
  if [[ -n "$disk_file" ]]; then
    new_hex="$(sha384_file "$disk_file")"
    if [[ "$new_hex" != "$old_hex" ]]; then
      echo "REBASELINE $ver  $desc"
      sql="UPDATE public._sqlx_migrations SET checksum=decode('$new_hex','hex') WHERE version=$ver;"
      echo "  $sql"
      if $APPLY; then
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
      fi
      REBASED=$((REBASED + 1))
    fi
  else
    echo "KEEP      $ver  $desc  (无磁盘对应文件，保留不动)"
    SKIPPED=$((SKIPPED + 1))
  fi
done < "$LEDGER"

echo ""
if $APPLY; then
  echo "完成：重锚 $REBASED 个，孤儿 $ORPHANED 个，保留引导行 $SKIPPED 个"
else
  echo "dry-run：将重锚 $REBASED 个，孤儿 $ORPHANED 个，保留引导行 $SKIPPED 个（未执行，加 --apply 落库）"
fi
