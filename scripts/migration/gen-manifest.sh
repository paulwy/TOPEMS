#!/usr/bin/env bash
# =============================================================================
# 迁移清单（manifest）生成器
#
# 扫描 database/migrations/*.sql（14 位版本号），生成与
# database/migration_manifest.yaml 同构的机械字段投影：
#   version / file / checksum（SHA-256，口径与 database/checksums.txt 一致）
#   + 既有段落的既有状态键：entries.disposition / pending_forward_patches.status
#
# 状态来源（不臆造业务语义）：
#   1) 已在现有 manifest 中登记 → 原样沿用其 disposition / status；
#   2) 未登记且 version <= 现有 manifest 声明的账本锚点
#      （ledger_evidence.current_prod.anchor）→ disposition: applied；
#   3) 未登记且 version > 锚点 → pending_forward_patches.status: to_apply。
#   规则 2/3 只是「相对锚点」的机械推断，不查询数据库；锚点刷新需另行改 manifest。
#
# 确定性：不写时间戳；按版本号数值升序、同版本按文件名排序；
# checksum 取文件字节 SHA-256，与 scripts/migration/validate.sh 的 sha256_file 同口径。
#
# 投影只含机械字段（version/file/checksum + disposition|status），不含
# ledger_evidence / notes / 逐条处置说明等人工内容；因此对现有 manifest 直接
# --write 会拒绝（见下），需人工裁决后再 --force。
#
# 模式：
#   默认        打印「生成投影 vs 现有 manifest」的差异报告（不落盘，退出码 0）
#   --check     CI 用：同上，但有漂移时退出码 1
#   --stdout    打印生成的清单全文
#   --write     落盘到 manifest 路径
#               目标已存在且含人工维护字段（why_deferred / evidence / effect 等）时
#               拒绝覆盖，需显式 --force，避免把逐条处置说明洗成机械清单
#
# 漂移判据（--check）：
#   missing_on_disk       manifest 登记的版本在磁盘上找不到文件
#   file_mismatch         同一版本在 manifest 与磁盘上的文件名不一致
#   checksum_mismatch     已登记文件的 SHA-256 与 database/checksums.txt 不一致
#   checksum_missing      已登记文件在 database/checksums.txt 中无记录
#   duplicate             同一版本在 manifest 中被登记多次
#   unregistered_pending  磁盘上 version > 锚点、但未在 manifest 任何段落登记
#   （version <= 锚点且未登记视为「隐式已应用」，只计数不判失败——manifest 是
#     异常登记台账，不是全量清单）
#
# 退出码：0 无漂移 / 1 有漂移或拒绝覆盖 / 2 参数错误
# =============================================================================
# shellcheck disable=SC2034
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG_DIR="$ROOT/database/migrations"
MANIFEST="$ROOT/database/migration_manifest.yaml"
CHECKSUMS="$ROOT/database/checksums.txt"

MODE="diff"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) MODE="check"; shift ;;
    --write) MODE="write"; shift ;;
    --stdout) MODE="stdout"; shift ;;
    --force) FORCE=1; shift ;;
    --manifest) MANIFEST="$2"; shift 2 ;;
    --migrations-dir) MIG_DIR="$2"; shift 2 ;;
    --checksums) CHECKSUMS="$2"; shift 2 ;;
    -h|--help) sed -n '2,44p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ -d "$MIG_DIR" ]] || { echo "迁移目录不存在: $MIG_DIR" >&2; exit 2; }

if [[ -t 1 ]]; then
  RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
else
  RED=''; YELLOW=''; GREEN=''; BLUE=''; NC=''
fi
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
log_drift(){ echo -e "${RED}[DRIFT]${NC} $*"; }

# 与 validate.sh 的 sha256_file 完全一致：sha256sum 优先，回退 shasum -a 256
sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/topems_manifest.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
DISK_TSV="$TMP_DIR/disk.tsv"
REG_TSV="$TMP_DIR/reg.tsv"
SUM_TSV="$TMP_DIR/sums.tsv"

# --- 1) 磁盘扫描：14 位版本号 + .sql（排除备份 / down 文件） -------------------
while IFS= read -r -d '' f; do
  b="$(basename "$f")"
  [[ "$b" =~ ^([0-9]{14})_ ]] || continue
  printf '%s\t%s\t%s\n' "${BASH_REMATCH[1]}" "$b" "$(sha256_file "$f")"
done < <(find "$MIG_DIR" -maxdepth 1 -type f -name '*.sql' \
           ! -name '*.backup' ! -name '*.sql.backup' ! -name '*.down.sql' -print0 \
         | LC_ALL=C sort -z) \
  | LC_ALL=C sort -t$'\t' -k1,1n -k2,2 > "$DISK_TSV"

# --- 2) 现有 manifest 登记事实（只读解析，不做 YAML 语义推断） ----------------
if [[ -f "$MANIFEST" ]]; then
  awk '
    function flush() { if (v != "") print v "\t" f "\t" sect "\t" st; v = ""; f = ""; st = "" }
    /^entries:[[:space:]]*$/            { flush(); sect = "entries"; next }
    /^pending_forward_patches:[[:space:]]*$/ { flush(); sect = "pending"; next }
    /^[A-Za-z_]/                        { flush(); sect = ""; next }
    /^  - version: /                    { flush(); s = $0; sub(/^  - version: "?/, "", s); sub(/".*$/, "", s); v = s; next }
    /^    file: /                       { if (sect != "") { s = $0; sub(/^    file: "?/, "", s); sub(/".*$/, "", s); f = s } next }
    /^    disposition: /                { if (sect != "") { s = $0; sub(/^    disposition: /, "", s); sub(/[[:space:]]+$/, "", s); st = s } next }
    /^    status: /                     { if (sect != "") { s = $0; sub(/^    status: /, "", s); sub(/[[:space:]]+$/, "", s); st = s } next }
    END { flush() }
  ' "$MANIFEST" | LC_ALL=C sort -t$'\t' -k1,1n -k2,2 > "$REG_TSV"
else
  : > "$REG_TSV"
fi

# 锚点：ledger_evidence.current_prod.anchor
ANCHOR="$(awk '
  /^ledger_evidence:[[:space:]]*$/ { in_ledger = 1; next }
  in_ledger && /^[A-Za-z_]/ { in_ledger = 0 }
  in_ledger && /anchor:[[:space:]]*"[0-9]{14}"/ {
    s = $0; sub(/.*anchor:[[:space:]]*"/, "", s); sub(/".*/, "", s); print s; exit
  }
' "$MANIFEST" 2>/dev/null || true)"
ANCHOR="${ANCHOR:-0}"

# --- 3) checksums.txt（<sha256>  <repo 相对路径>） -----------------------------
: > "$SUM_TSV"
if [[ -f "$CHECKSUMS" ]]; then
  while read -r hash rel; do
    [[ -z "${hash:-}" || "$hash" =~ ^# || -z "${rel:-}" ]] && continue
    printf '%s\t%s\n' "$rel" "$hash" >> "$SUM_TSV"
  done < "$CHECKSUMS"
fi

# --- 4) 生成投影（确定性：无时间戳，按版本号排序） ----------------------------
emit_manifest() {
  local v f h st
  echo "# 由 scripts/migration/gen-manifest.sh 生成（机械投影）；人工处置说明请写在原 manifest，勿手工编辑本段"
  echo "schema_version: 1"
  echo "entries:"
  # entries 段：只收 version <= 锚点的登记（沿用已登记 disposition，未登记视为 applied）
  while IFS=$'\t' read -r v f h; do
    (( 10#$v > 10#${ANCHOR:-0} )) && continue
    st=""
    if [[ -s "$REG_TSV" ]]; then
      st="$(awk -F'\t' -v ver="$v" '$1 == ver && $3 == "entries" { print $4; exit }' "$REG_TSV")"
    fi
    [[ -z "$st" ]] && st="applied"
    printf '  - version: "%s"\n    file: "%s"\n    checksum: "%s"\n    disposition: %s\n' \
      "$v" "database/migrations/$f" "$h" "$st"
  done < "$DISK_TSV"

  echo ""
  echo "# ===== version > 账本锚点 ${ANCHOR} 的待应用/已应用前向补丁 ====="
  echo "pending_forward_patches:"
  while IFS=$'\t' read -r v f h; do
    (( 10#$v > 10#${ANCHOR:-0} )) || continue
    st=""
    if [[ -s "$REG_TSV" ]]; then
      st="$(awk -F'\t' -v ver="$v" '$1 == ver && $3 == "pending" { print $4; exit }' "$REG_TSV")"
    fi
    [[ -z "$st" ]] && st="to_apply"
    printf '  - version: "%s"\n    file: "%s"\n    checksum: "%s"\n    status: %s\n' \
      "$v" "database/migrations/$f" "$h" "$st"
  done < "$DISK_TSV"
}

if [[ "$MODE" == "stdout" ]]; then
  emit_manifest
  exit 0
fi

if [[ "$MODE" == "write" ]]; then
  if [[ -f "$MANIFEST" ]] && (( FORCE == 0 )); then
    if grep -qE '^    (class|why_deferred|declared_objects|prod_presence|basis|evidence|precondition|effect|destructive_scan|replaces|supersedes|excludes|note):' "$MANIFEST"; then
      echo "拒绝覆盖：$MANIFEST 含人工维护字段（逐条处置说明），机械生成会丢失这些内容。" >&2
      echo "  确需覆盖请显式加 --force；否则用 --check 只做漂移检测。" >&2
      exit 1
    fi
  fi
  emit_manifest > "$MANIFEST"
  log_ok "已写入 $MANIFEST"
  exit 0
fi

# --- 5) 漂移检测（默认 / --check） --------------------------------------------
# 输入顺序固定：reg.tsv, sums.tsv, disk.tsv
awk -F'\t' -v anchor="$ANCHOR" '
  FILENAME == ARGV[1] {
    v = $1
    if (!(v in rfile)) { rorder[++rn] = v }
    rfile[v] = $2; rsec[v] = $3; rst[v] = $4; rcount[v]++
    next
  }
  FILENAME == ARGV[2] {
    if (!($1 in chk)) sorder[++sn] = $1
    chk[$1] = $2; chkcount[$1]++
    next
  }
  {
    dv[++dn] = $1; dfile[$1] = $2; dhash[$1] = $3
  }
  END {
    missing = 0; mism = 0; sumbad = 0; summiss = 0; dups = 0; sumdup = 0
    unp = 0; unapplied = 0
    # checksums.txt 同一路径出现多行 = 被外部重复追加；生成器本身为截断重写，不会产生
    for (i = 1; i <= sn; i++) {
      r = sorder[i]
      if (chkcount[r] > 1) { printf "checksum_duplicate\t%s\t%d 行\n", r, chkcount[r]; sumdup++ }
    }
    for (i = 1; i <= rn; i++) {
      v = rorder[i]
      if (rcount[v] > 1) { printf "duplicate\t%s\t%s\n", v, rfile[v]; dups++ }
      if (!(v in dfile)) { printf "missing_on_disk\t%s\t%s\n", v, rfile[v]; missing++ ; continue }
      if (rfile[v] != "database/migrations/" dfile[v]) {
        printf "file_mismatch\t%s\tmanifest=%s disk=%s\n", v, rfile[v], dfile[v]; mism++
      }
      if (!(rfile[v] in chk)) { printf "checksum_missing\t%s\t%s\n", v, rfile[v]; summiss++ }
      else if (chk[rfile[v]] != dhash[v]) {
        printf "checksum_mismatch\t%s\t%s\n", v, rfile[v]; sumbad++
      }
    }
    for (i = 1; i <= dn; i++) {
      v = dv[i]
      if (v in rfile) continue
      if ((v + 0) > (anchor + 0)) { printf "unregistered_pending\t%s\tdatabase/migrations/%s\n", v, dfile[v]; unp++ }
      else { unapplied++ }
    }
    printf "#SUMMARY\tregistered=%d\tdisk=%d\tanchor=%s\tmissing_on_disk=%d\tfile_mismatch=%d\tchecksum_mismatch=%d\tchecksum_missing=%d\tchecksum_duplicate=%d\tduplicate=%d\tunregistered_pending=%d\timplicit_applied=%d\n", \
      rn, dn, anchor, missing, mism, sumbad, summiss, sumdup, dups, unp, unapplied
  }
' "$REG_TSV" "$SUM_TSV" "$DISK_TSV" > "$TMP_DIR/drift.tsv"

DRIFT_ITEMS="$(grep -v '^#SUMMARY' "$TMP_DIR/drift.tsv" | grep -c . || true)"
SUMMARY="$(grep '^#SUMMARY' "$TMP_DIR/drift.tsv" | sed 's/^#SUMMARY\t//')"

log_info "manifest: $MANIFEST"
log_info "迁移目录: ${MIG_DIR}（14 位版本号 .sql）"
echo "统计: $SUMMARY"
echo ""

if (( DRIFT_ITEMS == 0 )); then
  log_ok "无漂移：manifest 登记、磁盘文件、checksums.txt 三者一致"
  exit 0
fi

log_drift "发现 $DRIFT_ITEMS 条漂移："
for kind in missing_on_disk file_mismatch checksum_mismatch checksum_missing checksum_duplicate duplicate unregistered_pending; do
  rows="$(awk -F'\t' -v k="$kind" '$1 == k { printf "  %s  %s\n", $2, $3 }' "$TMP_DIR/drift.tsv")"
  [[ -z "$rows" ]] && continue
  echo ""
  echo "[$kind] $(printf '%s\n' "$rows" | grep -c .) 条"
  printf '%s\n' "$rows"
done

if [[ "$MODE" == "check" ]]; then
  exit 1
fi
exit 0
