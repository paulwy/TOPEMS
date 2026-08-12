#!/usr/bin/env bash
# =============================================================================
# TOPEMS 覆盖率基线测量脚本 (Rust + TypeScript 双栈)
# =============================================================================
# 功能：
#   - Rust: cargo test -Z instrument-coverage → llvm-profdata → llvm-cov export
#   - TypeScript: pnpm vitest run --coverage
#   - 最终调用 scripts/ci/coverage-report.py 汇总
#
# 常用命令：
#   ./scripts/ci/coverage-baseline.sh --fast                # 默认快速模式 (推荐)
#   ./scripts/ci/coverage-baseline.sh --full                # 全 workspace + TS
#   ./scripts/ci/coverage-baseline.sh --ts --skip-clean     # 只跑 TS，保留中间文件
#   ./scripts/ci/coverage-baseline.sh -p topems-shared-core # 只跑某 crate
#
# 退出码：
#   0：成功（阈值都通过，或无阈值）
#   1：阈值未通过 (--fail-under 触发)
#   2：工具链缺失/自检失败
#   3：Python 汇总器缺失，生成报告失败
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# ---------- 颜色 ----------
RED='\033[0;31m';    GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m';   CYAN='\033[0;36m';  NC='\033[0m' # No Color
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; }
detail()  { echo -e "${CYAN}[>>]${NC}   $1"; }

# ---------- CLI 默认值 ----------
ONLY_RUST=false; ONLY_TS=false
MODE="fast"                         # fast | full
EXTRA_PKGS=()                       # -p 追加的包（可重复）
SKIP_CLEAN=false; NO_HTML=false
OUTPUT_DIR="$PROJECT_ROOT/target/coverage"
FAIL_UNDER=""; FAIL_RUST_UNDER=""; FAIL_TS_UNDER=""
VERBOSE=false

usage() {
  cat <<'USG'
Usage: ./scripts/ci/coverage-baseline.sh [FLAGS]

Coverage baseline runner for TOPEMS (Rust workspace + TypeScript apps/web).

Modes (mutually exclusive, --fast is default):
      --fast           Fast mode: 8 shared-* + 5 core services + apps/web (default)
      --full           Full mode: cargo test --workspace + apps/web

Scope filters:
      --rust           Run ONLY Rust coverage (skip TypeScript)
      --ts             Run ONLY TypeScript coverage (skip Rust)
  -p, --package <PKG>  Add a Rust crate to the target list (repeatable). If
                       combined with --fast/--full, targets are merged.

Output control:
      --skip-clean     Keep profraw/profdata intermediate files (default: rm)
      --no-html        Skip HTML report generation (saves 15-30% time)
      --output-dir <D> Output dir (default: target/coverage)

Threshold CI gates (floating point, e.g. 15.5):
      --fail-under <PCT>        Overall line coverage < PCT -> exit 1
      --fail-rust-under <PCT>   Rust line coverage < PCT -> exit 1
      --fail-ts-under <PCT>     TypeScript line coverage < PCT -> exit 1

Other:
  -v, --verbose        Print cargo/vitest raw stdout/stderr
  -h, --help           Show this help

Examples:
  ./scripts/ci/coverage-baseline.sh
  ./scripts/ci/coverage-baseline.sh --full --no-html --fail-under 15
  ./scripts/ci/coverage-baseline.sh --ts --output-dir /tmp/topems-cov
USG
}

# ---------- 参数解析 ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)         usage; exit 0 ;;
    --rust)            ONLY_RUST=true; shift ;;
    --ts)              ONLY_TS=true;  shift ;;
    --fast)            MODE=fast;     shift ;;
    --full)            MODE=full;     shift ;;
    -p|--package)
        [[ $# -ge 2 ]] || { error "-p requires a package name"; exit 2; }
        EXTRA_PKGS+=("$2"); shift 2 ;;
    --skip-clean)      SKIP_CLEAN=true; shift ;;
    --no-html)         NO_HTML=true;   shift ;;
    --output-dir)
        [[ $# -ge 2 ]] || { error "--output-dir requires a path"; exit 2; }
        OUTPUT_DIR="$2"; shift 2 ;;
    --fail-under)
        [[ $# -ge 2 ]] || { error "--fail-under needs PCT"; exit 2; }
        FAIL_UNDER="$2"; shift 2 ;;
    --fail-rust-under)
        [[ $# -ge 2 ]] || { error "--fail-rust-under needs PCT"; exit 2; }
        FAIL_RUST_UNDER="$2"; shift 2 ;;
    --fail-ts-under)
        [[ $# -ge 2 ]] || { error "--fail-ts-under needs PCT"; exit 2; }
        FAIL_TS_UNDER="$2"; shift 2 ;;
    -v|--verbose)      VERBOSE=true; shift ;;
    *) error "Unknown flag: $1"; usage; exit 2 ;;
  esac
done

# ---------- 工具链自检 ----------
RUSTC_NIGHTLY_FLAG=""   # "", "+nightly", 或 "RUSTC_BOOTSTRAP=1" 前缀
HAS_JQ=false

toolchain_selfcheck() {
  [[ -f "$PROJECT_ROOT/Cargo.toml" ]] || { error "Cargo.toml not at project root"; exit 2; }
  head -n 1 "$PROJECT_ROOT/Cargo.toml" | grep -q '^\[workspace\]' || {
    error "Cargo.toml first line must be [workspace]"; exit 2
  }
  command -v cargo   >/dev/null 2>&1 || { error "cargo not found, install Rust"; exit 2; }
  command -v rustc   >/dev/null 2>&1 || { error "rustc not found, install Rust"; exit 2; }
  command -v python3 >/dev/null 2>&1 || { error "python3 not found"; exit 2; }
  python3 -c "import sys; sys.exit(0 if sys.version_info>=(3,10) else 1)" 2>/dev/null ||
    { error "python3 >= 3.10 required"; exit 2; }

  # llvm-tools-preview: llvm-profdata + llvm-cov
  local llp="" llc=""
  if rustup which llvm-profdata >/dev/null 2>&1; then
    llp="$(rustup which llvm-profdata)"; llc="$(rustup which llvm-cov)"
  elif command -v llvm-profdata >/dev/null 2>&1; then
    llp="$(command -v llvm-profdata)"; llc="$(command -v llvm-cov)"
  fi
  if [[ -z "$llp" || -z "$llc" ]]; then
    error "llvm-profdata / llvm-cov not found."
    info  "Try: rustup component add llvm-tools-preview"
    exit 2
  fi
  export LLVM_PROFDATA="$llp" LLVM_COV="$llc"

  # instrument-coverage 支持
  if rustc --version 2>/dev/null | grep -q "nightly"; then
    RUSTC_NIGHTLY_FLAG=""
  elif cargo +nightly rustc --version >/dev/null 2>&1; then
    RUSTC_NIGHTLY_FLAG="+nightly"
  else
    if RUSTC_BOOTSTRAP=1 rustc -Zhelp 2>/dev/null | grep -q instrument-coverage; then
      RUSTC_NIGHTLY_FLAG="RUSTC_BOOTSTRAP=1"
    else
      error "Rust toolchain has no -Z instrument-coverage support."
      info  "Try: rustup install nightly; or rustup default nightly"
      exit 2
    fi
  fi
  command -v jq >/dev/null 2>&1 && HAS_JQ=true || true
  # pnpm 只有跑 TS 时需要
  if ! $ONLY_RUST; then
    command -v pnpm >/dev/null 2>&1 || {
      warn "pnpm not found — TypeScript coverage WILL BE SKIPPED"
      ONLY_RUST=true; ONLY_TS=false
    }
  fi
}

# ---------- Rust: 构建 crate 列表 ----------
FAST_SHARED=(
  topems-shared-core topems-shared-db topems-shared-auth
  topems-shared-service-client topems-shared-event topems-shared-observability
  topems-shared-ai topems-shared-bootstrap
)
FAST_CORE_SVCS=( topems-unified-core topems-ai topems-erp topems-wms topems-crm )

build_rust_targets() {
  local targets=()
  if [[ ${#EXTRA_PKGS[@]} -gt 0 && $MODE != "fast" && $MODE != "full" ]]; then
    warn "Given -p packages WITHOUT --fast/--full. Running ONLY the -p targets."
  else
    if [[ $MODE == "fast" ]]; then
      targets+=( "${FAST_SHARED[@]}" "${FAST_CORE_SVCS[@]}" )
    elif [[ $MODE == "full" ]]; then
      local ws_pkgs
      ws_pkgs=$(cargo metadata --format-version 1 --no-deps 2>/dev/null | \
        python3 -c "import sys,json; [print(p['name']) for p in json.load(sys.stdin)['packages']]" 2>/dev/null) || true
      if [[ -z "$ws_pkgs" ]]; then
        warn "cargo metadata failed; falling back to fast mode crate list"
        targets+=( "${FAST_SHARED[@]}" "${FAST_CORE_SVCS[@]}" )
      else
        while IFS= read -r pkg; do
          [[ "$pkg" == "migration-sdk" || "$pkg" == "topems-tools-migration-sdk" ]] && continue
          targets+=( "$pkg" )
        done <<< "$ws_pkgs"
      fi
    fi
  fi
  targets+=( "${EXTRA_PKGS[@]}" )
  printf "%s\n" "${targets[@]}" | awk '!seen[$0]++' | grep -v '^$'
}

# ---------- Rust: 跑单个 crate ----------
run_rust_crate() {
  local crate="$1"
  local profraw_dir="$OUTPUT_DIR/profraw/$crate"
  local profdata_path="$OUTPUT_DIR/profdata/$crate.profdata"
  local json_path="$OUTPUT_DIR/per-crate/$crate.json"
  local html_dir="$OUTPUT_DIR/html/$crate"
  mkdir -p "$profraw_dir" "$OUTPUT_DIR/profdata" "$OUTPUT_DIR/per-crate"
  $NO_HTML || mkdir -p "$html_dir"

  info "[$crate] cargo test (instrument-coverage)..."
  local env_prefix=""
  if [[ "$RUSTC_NIGHTLY_FLAG" == "RUSTC_BOOTSTRAP=1" ]]; then
    env_prefix="RUSTC_BOOTSTRAP=1"
  fi
  local cargo_toolchain=""
  if [[ "$RUSTC_NIGHTLY_FLAG" == "+nightly" ]]; then
    cargo_toolchain="+nightly"
  fi
  local rc=0
  set +e
  if $VERBOSE; then
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="-Z instrument-coverage" \
    LLVM_PROFILE_FILE="$profraw_dir/$crate-%p-%m.profraw" \
    bash -c "$env_prefix cargo $cargo_toolchain test -p '$crate' --lib --bins --tests"
    rc=$?
  else
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="-Z instrument-coverage" \
    LLVM_PROFILE_FILE="$profraw_dir/$crate-%p-%m.profraw" \
    bash -c "$env_prefix cargo $cargo_toolchain test -p '$crate' --lib --bins --tests" \
      >/tmp/cov-cargo.log 2>&1
    rc=$?
  fi
  set -e
  if [[ $rc -ne 0 ]]; then
    warn "[$crate] cargo test FAILED (exit $rc). Recording as skipped."
    cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"cargo_test_exit_$rc"}
EOF
    return 0
  fi

  # 合并 profraw
  if ! ls "$profraw_dir"/*.profraw >/dev/null 2>&1; then
    warn "[$crate] no .profraw files (no tests run?)"
    cat > "$json_path" <<EOF
{"crate":"$crate","status":"no_tests"}
EOF
    return 0
  fi
  "$LLVM_PROFDATA" merge -sparse "$profraw_dir"/*.profraw -o "$profdata_path" \
    2>/tmp/cov-profdata.log || {
      warn "[$crate] llvm-profdata merge failed"
      cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"profdata_merge_failed"}
EOF
      return 0
    }
  # 找测试二进制文件：target/debug/deps/<crate>-<hash>* (executable)
  local -a bins=()
  local crate_dash_to_underscore
  crate_dash_to_underscore="$(echo "$crate" | tr '-' '_')"
  while IFS= read -r f; do bins+=("$f"); done < <(
    find "$PROJECT_ROOT/target/debug/deps" -maxdepth 1 -type f -executable \
      -name "${crate_dash_to_underscore}-*" 2>/dev/null || true
  )
  if [[ ${#bins[@]} -eq 0 ]]; then
    while IFS= read -r f; do bins+=("$f"); done < <(
      find "$PROJECT_ROOT/target/debug" -maxdepth 1 -type f -executable \
        -name "${crate_dash_to_underscore}*" 2>/dev/null || true
    )
  fi
  if [[ ${#bins[@]} -eq 0 ]]; then
    warn "[$crate] no coverage binary found under target/debug"
    cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"no_coverage_binary"}
EOF
    return 0
  fi
  local raw_export="/tmp/cov-export-$crate.json"
  local bin_args=()
  local b; for b in "${bins[@]}"; do bin_args+=(-object "$b"); done
  "$LLVM_COV" export -format=text -instr-profile="$profdata_path" "${bin_args[@]}" > "$raw_export" \
    2>/tmp/cov-llvm-cov.log || {
      warn "[$crate] llvm-cov export failed (see /tmp/cov-llvm-cov.log)"
      cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"llvm_cov_export_failed"}
EOF
      return 0
    }
  local ts; ts=$(date +%s)
  if $HAS_JQ; then
    # 裁剪：保留 totals + files_count + crate + timestamp
    local files_count
    files_count=$(jq '[.data[0].files[]?] | length' "$raw_export")
    jq -n --arg crate "$crate" \
          --argjson ts "$ts" \
          --slurpfile raw "$raw_export" \
          --argjson fcount "$files_count" \
      '{crate:$crate,status:"ok",timestamp:$ts,files_count:$fcount,
        totals:{
          lines:     $raw[0].data[0].totals.lines,
          functions: $raw[0].data[0].totals.functions,
          branches:  $raw[0].data[0].totals.branches,
          regions:   $raw[0].data[0].totals.regions}}' > "$json_path"
  else
    python3 - "$raw_export" "$json_path" "$crate" "$ts" <<'PY'
import json, sys
src, dst, crate, ts = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
with open(src) as f:
    raw = json.load(f)
data0 = raw.get("data", [{}])[0]
tot = data0.get("totals", {})
out = {"crate": crate, "status": "ok", "timestamp": ts,
       "files_count": len(data0.get("files", [])),
       "totals": {k: tot.get(k, {"count":0,"covered":0,"percent":0.0})
                  for k in ("lines","functions","branches","regions")}}
with open(dst,"w") as f: json.dump(out, f, ensure_ascii=False)
PY
  fi
  # HTML (可选)
  if ! $NO_HTML; then
    "$LLVM_COV" show -format=html -instr-profile="$profdata_path" "${bin_args[@]}" \
      -output-dir="$html_dir" >/dev/null 2>/tmp/cov-html.log || true
  fi
  rm -f "$raw_export"
  success "[$crate] coverage captured"
}

# ---------- TS: apps/web vitest ----------
run_ts_coverage() {
  local ts_report_dir="$PROJECT_ROOT/apps/web/coverage"
  info "[TS] pnpm vitest run --coverage (apps/web)"
  local rc=0
  set +e
  if $VERBOSE; then
    (cd "$PROJECT_ROOT/apps/web" && pnpm vitest run --coverage)
    rc=$?
  else
    (cd "$PROJECT_ROOT/apps/web" && pnpm vitest run --coverage) >/tmp/cov-vitest.log 2>&1
    rc=$?
  fi
  set -e
  if [[ $rc -ne 0 ]]; then
    warn "[TS] vitest exit $rc. Summary may be missing or partial."
    return 0
  fi
  if [[ -f "$ts_report_dir/coverage-summary.json" ]]; then
    success "[TS] coverage summary produced"
  else
    warn "[TS] coverage-summary.json missing"
  fi
}

# ---------- main ----------
main() {
  toolchain_selfcheck
  mkdir -p "$OUTPUT_DIR"

  info "Mode=$MODE  Rust?=$($ONLY_TS && echo no || echo yes)  TS?=$($ONLY_RUST && echo no || echo yes)"
  info "Output directory: $OUTPUT_DIR"

  local rust_targets=()
  if ! $ONLY_TS; then
    mapfile -t rust_targets < <(build_rust_targets)
    info "Rust targets (${#rust_targets[@]}): ${rust_targets[*]:-<none>}"
    local crate
    for crate in "${rust_targets[@]}"; do
      [[ -z "$crate" ]] && continue
      run_rust_crate "$crate"
    done
    # 清理
    if ! $SKIP_CLEAN; then
      info "Cleaning intermediate profraw/profdata..."
      rm -rf "$OUTPUT_DIR/profraw" "$OUTPUT_DIR/profdata"
    fi
  fi

  if ! $ONLY_RUST; then
    run_ts_coverage
  fi

  # 汇总
  info "Invoking scripts/ci/coverage-report.py..."
  local report_args=(
    --mode "$MODE"
    --output-dir "$OUTPUT_DIR"
    --project-root "$PROJECT_ROOT"
  )
  [[ -n "$FAIL_UNDER"      ]] && report_args+=(--fail-under      "$FAIL_UNDER")
  [[ -n "$FAIL_RUST_UNDER" ]] && report_args+=(--fail-rust-under "$FAIL_RUST_UNDER")
  [[ -n "$FAIL_TS_UNDER"   ]] && report_args+=(--fail-ts-under   "$FAIL_TS_UNDER")
  local rc=0
  python3 "$SCRIPT_DIR/coverage-report.py" "${report_args[@]}" || rc=$?
  if [[ $rc -eq 99 ]]; then
    error "coverage-report.py internal error (exit 99)"
    exit 3
  fi
  if [[ $rc -ne 0 ]]; then
    error "Thresholds NOT satisfied (exit $rc from Python)"
    exit 1
  fi
  success "Done. Reports at:"
  detail "  $OUTPUT_DIR/report.md"
  detail "  $OUTPUT_DIR/report.json"
}

main "$@"
