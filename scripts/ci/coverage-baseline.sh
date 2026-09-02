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
set -eo pipefail
# 说明：不使用 set -u（nounset）是为了兼容 macOS 自带 Bash 3.2：
#   - bash 3.2 中 `"${EMPTY_ARRAY[@]}"` 空数组展开在 set -u 下会报 unbound variable，
#     而 mac 不支持 `arr[@]+"${arr[@]}"` 的可靠降级写法 + set -u 组合。
#   本脚本所有变量（ONLY_RUST/ONLY_TS/EXTRA_PKGS 等）在使用前均显式初始化，
#   去掉 nounset 不影响健壮性。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Allow environment override (useful for running copies of the script from outside the
# workspace, e.g. during custom testing).
[[ -n "$TOPEMS_PROJECT_ROOT" && -d "$TOPEMS_PROJECT_ROOT" ]] && PROJECT_ROOT="$TOPEMS_PROJECT_ROOT"
cd "$PROJECT_ROOT"

# 确保 rustup shim（~/.cargo/bin）优先于 Homebrew/系统 rustc/cargo，
# 这样 +nightly/+stable toolchain 语法才能生效。
if [[ -d "$HOME/.cargo/bin" ]]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

# ---------- 颜色 ----------
RED='\033[0;31m';    GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m';   CYAN='\033[0;36m';  NC='\033[0m' # No Color
# 注意：所有日志函数输出到 stderr（>&2），避免干扰 stdout 的结构化输出（例如 build_rust_targets）。
info()    { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
success() { echo -e "${GREEN}[OK]${NC}   $1" >&2; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
error()   { echo -e "${RED}[ERR]${NC}  $1" >&2; }
detail()  { echo -e "${CYAN}[>>]${NC}   $1" >&2; }

# ---------- CLI 默认值 ----------
ONLY_RUST=false; ONLY_TS=false
MODE="fast"                         # fast | full
EXTRA_PKGS=()                       # -p 追加的包（可重复）
SKIP_CLEAN=false; NO_HTML=false
SKIP_BUILD_CLEAN=false              # false = 每个 crate 测试前先 cargo clean -p，
                                    #         确保 instrumented binary 真正被重新链接
OUTPUT_DIR="$PROJECT_ROOT/target/coverage"
FAIL_UNDER=""; FAIL_RUST_UNDER=""; FAIL_TS_UNDER=""
VERBOSE=false
PREFER_MANUAL=false                 # false = 若 cargo llvm-cov 可用，优先使用它（更可靠）
USE_CARGO_LLVM_COV=false            # 自检后设置；true 表示启用 cargo llvm-cov 后端

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
      --skip-build-clean
                       Skip `cargo clean -p <crate>` before testing. DANGER:
                       cached binaries from non-instrumented builds may cause
                       llvm-cov to report 0% covered even when tests pass.
                       Only use this if you just ran the script on a clean
                       builddir and want to re-measure without recompilation.
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
    --skip-build-clean) SKIP_BUILD_CLEAN=true; shift ;;
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
    --prefer-manual)   PREFER_MANUAL=true; shift ;;
    *) error "Unknown flag: $1"; usage; exit 2 ;;
  esac
done

# ---------- 工具链自检 ----------
RUSTC_NIGHTLY_FLAG=""   # "", "+nightly", 或 "RUSTC_BOOTSTRAP=1" 前缀
HAS_JQ=false
COVERAGE_FLAG=""          # 自检后填入：-C instrument-coverage 或 -Z instrument-coverage

toolchain_selfcheck() {
  # Python 是双栈都需要的（汇总器）
  command -v python3 >/dev/null 2>&1 || { error "python3 not found"; exit 2; }
  python3 -c "import sys; sys.exit(0 if sys.version_info>=(3,10) else 1)" 2>/dev/null ||
    { error "python3 >= 3.10 required"; exit 2; }

  # 跑 Rust 端才需要 Cargo workspace、instrument-coverage、llvm-tools
  if ! $ONLY_TS; then
    [[ -f "$PROJECT_ROOT/Cargo.toml" ]] || { error "Cargo.toml not at project root"; exit 2; }
    head -n 1 "$PROJECT_ROOT/Cargo.toml" | grep -q '^\[workspace\]' || {
      error "Cargo.toml first line must be [workspace]"; exit 2
    }
    command -v cargo >/dev/null 2>&1 || { error "cargo not found, install Rust"; exit 2; }
    command -v rustc >/dev/null 2>&1 || { error "rustc not found, install Rust"; exit 2; }

    # llvm-tools-preview: llvm-profdata + llvm-cov
    # 查找顺序（结合 rustup + rust-toolchain.toml override 场景）：
    #   1) 先看活跃 rustc (PATH 上的) 的 sysroot，通常是 rust-toolchain.toml 指定的具体 nightly
    #      在其 lib/rustlib/<triple>/bin/ 下找二进制
    #   2) 若存在 nightly toolchain，从 nightly sysroot 找 (兼容无 rust-toolchain.toml 时)
    #   3) rustup which llvm-profdata
    #   4) 系统 PATH 里的 llvm-profdata/llvm-cov
    local llp="" llc=""
    local active_sys
    active_sys="$(rustc --print sysroot 2>/dev/null || true)"
    if [[ -n "$active_sys" && -d "$active_sys/lib/rustlib" ]]; then
      llp="$(find "$active_sys/lib/rustlib" -maxdepth 3 -type f -name llvm-profdata 2>/dev/null | head -1)"
      llc="$(find "$active_sys/lib/rustlib" -maxdepth 3 -type f -name llvm-cov      2>/dev/null | head -1)"
    fi
    if [[ -z "$llp" || -z "$llc" ]]; then
      if cargo +nightly rustc --version >/dev/null 2>&1; then
        local night_sys
        night_sys="$(rustup run nightly rustc --print sysroot 2>/dev/null || true)"
        if [[ -n "$night_sys" && -d "$night_sys/lib/rustlib" ]]; then
          llp="$(find "$night_sys/lib/rustlib" -maxdepth 3 -type f -name llvm-profdata 2>/dev/null | head -1)"
          llc="$(find "$night_sys/lib/rustlib" -maxdepth 3 -type f -name llvm-cov      2>/dev/null | head -1)"
        fi
      fi
    fi
    if [[ -z "$llp" || -z "$llc" ]]; then
      if rustup which llvm-profdata >/dev/null 2>&1; then
        llp="$(rustup which llvm-profdata)"; llc="$(rustup which llvm-cov)"
      elif command -v llvm-profdata >/dev/null 2>&1; then
        llp="$(command -v llvm-profdata)"; llc="$(command -v llvm-cov)"
      fi
    fi
    if [[ -z "$llp" || -z "$llc" ]]; then
      error "llvm-profdata / llvm-cov not found."
      info  "Try: rustup component add llvm-tools-preview"
      info  "     (if you have a rust-toolchain.toml pinning a specific nightly,"
      info  "      use: rustup component add llvm-tools-preview --toolchain \$(rustup show active-toolchain))"
      info  "     Or, for TS-only: re-run with --ts"
      exit 2
    fi
    export LLVM_PROFDATA="$llp" LLVM_COV="$llc"

    # coverage flag 名称选择：
    #   -Z instrument-coverage (unstable) : nightly 原生插桩，兼容性最好，实测某些 nightly
    #                                      下 -C 版本会"编译通过但覆盖率全 0"（stub）。
    #   -C instrument-coverage (codegen)  : 新版稳定版/nightly 通用 codegen 选项。
    #   RUSTC_BOOTSTRAP=1 + -Z            : stable rustc fallback。
    #
    # macOS Bash 3 pitfall：`cmd | grep -q` 会 SIGPIPE，cmd 的 rc=141。
    #   结合 -o pipefail 会让 pipeline rc != 0，即使 grep 已匹配。
    #   以下每条判断都临时 set +o pipefail 规避。
    if ( set +o pipefail; rustc -Z help 2>/dev/null | grep -q 'instrument-coverage' ); then
      # Nightly：优先使用 unstable -Z 路径（避免部分 nightly 的 -C 是 stub 输出 0% 覆盖率）。
      COVERAGE_FLAG="-Z instrument-coverage"
    elif ( set +o pipefail; rustc -C help 2>/dev/null | grep -q 'instrument-coverage=' ); then
      COVERAGE_FLAG="-C instrument-coverage"
    else
      # 尝试用 RUSTC_BOOTSTRAP=1 stable 路径
      if ( set +o pipefail; RUSTC_BOOTSTRAP=1 rustc -Z help 2>/dev/null | grep -q instrument-coverage ); then
        COVERAGE_FLAG="-Z instrument-coverage"
        RUSTC_NIGHTLY_FLAG="RUSTC_BOOTSTRAP=1"
      else
        error "No Rust coverage flag available (-C/-Z instrument-coverage) in current toolchain."
        info  "rustc = $(rustc --version 2>/dev/null)"
        info  "Try: rustup install nightly && rustup component add llvm-tools-preview"
        exit 2
      fi
    fi
    # 何时需要显式加 `+nightly` 或 `RUSTC_BOOTSTRAP=1`：
    #   - 如果 PATH rustc 已是 nightly（即 rust-toolchain.toml 生效），无需加任何前缀
    #   - 否则若 cargo +nightly 可用，用 +nightly 前缀
    #   - 否则依赖 RUSTC_BOOTSTRAP=1（在上面已设）
    if [[ "$RUSTC_NIGHTLY_FLAG" != "RUSTC_BOOTSTRAP=1" ]]; then
      if rustc --version 2>/dev/null | grep -q "nightly"; then
        RUSTC_NIGHTLY_FLAG=""
      elif cargo +nightly rustc --version >/dev/null 2>&1; then
        RUSTC_NIGHTLY_FLAG="+nightly"
      fi
    fi
    command -v jq >/dev/null 2>&1 && HAS_JQ=true || true

    # ------- cargo llvm-cov backend check -------
    # cargo llvm-cov 处理 coverage flags / profraw 收集 / binary 选择等细节，
    # 实测比手动 RUSTFLAGS + LLVM_PROFILE_FILE 可靠得多（某些 nightly 下手工会得到 0%）。
    if ! $PREFER_MANUAL; then
      if command -v cargo >/dev/null 2>&1 && \
         cargo llvm-cov --version >/dev/null 2>&1; then
        # 同时确保 LLVM_COV 和 LLVM_PROFDATA 对 cargo llvm-cov 子进程可见
        # （cargo llvm-cov 对 rustup 非 rustc 的场景找不到 llvm-tools，
        #  需要显式 env 传递，见 cargo-llvm-cov 文档 env vars）。
        USE_CARGO_LLVM_COV=true
        info "cargo llvm-cov detected; using as Rust coverage backend (pass --prefer-manual to override)"
      else
        info "cargo llvm-cov not available; falling back to manual Rust coverage backend"
      fi
    else
      info "--prefer-manual set; using manual Rust coverage backend"
    fi
  fi

  # 跑 TS 端才需要 pnpm
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
FAST_CORE_SVCS=(
  topems-unified-core topems-ai topems-erp topems-wms topems-crm
  topems-ehs topems-srm topems-pdm topems-monitor topems-mobile topems-communication
  topems-master-data topems-ticket topems-search
  topems-feedback topems-plugin-registry topems-pm
# [V2026.08 已移除] topems-lowcode
)

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

# ---------- helpers: trim raw llvm-cov JSON to per-crate JSON ----------
# $1 raw_export_path  $2 crate  $3 json_path
trim_raw_export() {
  local raw_export="$1" crate="$2" json_path="$3"
  local ts; ts=$(date +%s)
  if $HAS_JQ; then
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
}

# ---------- Rust: 跑单个 crate (dispatcher) ----------
run_rust_crate() {
  if $USE_CARGO_LLVM_COV; then
    run_rust_crate_cargo_llvm_cov "$1"
  else
    run_rust_crate_manual "$1"
  fi
}

# ---------- Rust: 跑单个 crate (cargo llvm-cov backend) ----------
# cargo llvm-cov 官方 subcommand：自动处理 -C instrument-coverage、build/test、
# profraw 合并、多 binary 选择等细节，覆盖率命中可靠性最高。
run_rust_crate_cargo_llvm_cov() {
  local crate="$1"
  local json_path="$OUTPUT_DIR/per-crate/$crate.json"
  local html_dir="$OUTPUT_DIR/html/$crate"
  local raw_export="/tmp/cov-cargo-llvm-cov-$crate.json"

  info "[$crate] cargo llvm-cov export --json"
  rm -f "$raw_export"

  # 给 cargo llvm-cov 子进程传递 LLVM tools 路径（rustup 非默认 shim 场景需要）
  local rc=0
  set +e
  if $VERBOSE; then
    LLVM_COV="$LLVM_COV" LLVM_PROFDATA="$LLVM_PROFDATA" \
      cargo llvm-cov -p "$crate" --json --output-path "$raw_export"
    rc=$?
  else
    LLVM_COV="$LLVM_COV" LLVM_PROFDATA="$LLVM_PROFDATA" \
      cargo llvm-cov -p "$crate" --json --output-path "$raw_export" \
        >/tmp/cov-cargo-llvm-cov.log 2>&1
    rc=$?
  fi
  set -e
  if [[ $rc -ne 0 ]]; then
    warn "[$crate] cargo llvm-cov exit=$rc (see /tmp/cov-cargo-llvm-cov.log); recording as skipped"
    cat > "$json_path" <<EOF
{"crate":"$crate","status":"skipped","reason":"cargo_llvm_cov_failed_rc_$rc"}
EOF
    return 0
  fi
  if [[ ! -s "$raw_export" ]]; then
    warn "[$crate] cargo llvm-cov produced empty JSON"
    cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"cargo_llvm_cov_empty_output"}
EOF
    return 0
  fi
  trim_raw_export "$raw_export" "$crate" "$json_path"

  # HTML (可选): 用 cargo llvm-cov --html；会重新 build+test（无法和 JSON 复用一次结果）。
  # 为节省时间：如之前已成功 export，可直接 llvm-cov show 用 cargo llvm-cov 的 target dir binaries？
  # 但是 cargo llvm-cov 的 target 目录是 target/llvm-cov-target/，和手动路径不一致，
  # 直接 llvm-cov show 可能找不到正确的 profdata → 简单可靠做法：
  #   直接跑 cargo llvm-cov --html 并容忍重跑（如果 NO_HTML=false）。
  if ! $NO_HTML; then
    mkdir -p "$html_dir"
    info "[$crate] cargo llvm-cov --html (second pass for HTML report)"
    set +e
    LLVM_COV="$LLVM_COV" LLVM_PROFDATA="$LLVM_PROFDATA" \
      cargo llvm-cov -p "$crate" --html --output-dir "$html_dir" \
        >/tmp/cov-cargo-html.log 2>&1
    rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
      warn "[$crate] cargo llvm-cov html failed (see /tmp/cov-cargo-html.log)"
    fi
  fi
  rm -f "$raw_export"
  success "[$crate] coverage captured (cargo llvm-cov)"
}

# ---------- Rust: 跑单个 crate (manual backend) ----------
run_rust_crate_manual() {
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
  # 先清理 crate 目标产物，确保 binary 一定用 coverage flags 重新链接。
  # （避免 sccache / 旧 target/debug/deps 残留非插桩 binary 导致 llvm-cov 报 no coverage data）
  if ! $SKIP_BUILD_CLEAN; then
    detail "[$crate] cargo clean -p $crate (use --skip-build-clean to skip)"
    ( RUSTC_WRAPPER="" SCCACHE_DISABLE=1 \
      bash -c "$env_prefix cargo $cargo_toolchain clean -p '$crate'" \
      >/tmp/cov-clean.log 2>&1 ) || true
  fi
  # 覆盖率构建禁用 sccache。
  #   sccache 以 rustc cmdline 作为 cache key，但如果不同 build 环境
  #   （例如早期未 instrument 的 build 和本脚本带 RUSTFLAGS="-C instrument-coverage"）
  #   共享同一 cache，则可能命中非插桩 binary，导致 llvm-cov export 报
  #   "no coverage data found" 但 cargo test 本身正常。
  local rc=0
  set +e
  if $VERBOSE; then
    RUSTC_WRAPPER="" \
    SCCACHE_DISABLE=1 \
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="$COVERAGE_FLAG" \
    LLVM_PROFILE_FILE="$profraw_dir/$crate-%p-%m.profraw" \
    bash -c "$env_prefix cargo $cargo_toolchain test -p '$crate' --lib --bins --tests"
    rc=$?
  else
    RUSTC_WRAPPER="" \
    SCCACHE_DISABLE=1 \
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="$COVERAGE_FLAG" \
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
  # 注意：
  #   - BSD find (macOS) 没有 GNU 的 -executable primary → 改用 [[ -x $f ]] 判断。
  #   - Bash 3.2 (macOS /bin/bash) 不支持 read -d '' → 用 -print0 | tr '\0' '\n' 降级。
  local -a bins=()
  local crate_dash_to_underscore
  crate_dash_to_underscore="$(echo "$crate" | tr '-' '_')"
  while IFS= read -r f; do
    [[ -n "$f" && -x "$f" ]] && bins+=("$f")
  done < <(
    find "$PROJECT_ROOT/target/debug/deps" -maxdepth 1 -type f \
      -name "${crate_dash_to_underscore}-*" -print0 2>/dev/null | tr '\0' '\n' || true
  )
  if [[ ${#bins[@]} -eq 0 ]]; then
    while IFS= read -r f; do
      [[ -n "$f" && -x "$f" ]] && bins+=("$f")
    done < <(
      find "$PROJECT_ROOT/target/debug" -maxdepth 1 -type f \
        -name "${crate_dash_to_underscore}*" -print0 2>/dev/null | tr '\0' '\n' || true
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
  # 用 positional binary 形式，比 -object 更稳：
  #   llvm-cov export/show/report 支持 llvm-cov ... binary1 binary2 ...
  #   老版本的 llvm-cov 要求 -object=<path>（等号，不能空格），为兼容性统一走 positional。
  "$LLVM_COV" export -format=text -instr-profile="$profdata_path" "${bins[@]}" > "$raw_export" \
    2>/tmp/cov-llvm-cov.log || {
      warn "[$crate] llvm-cov export failed (see /tmp/cov-llvm-cov.log)"
      cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"llvm_cov_export_failed"}
EOF
      return 0
    }
  trim_raw_export "$raw_export" "$crate" "$json_path"
  # HTML (可选)
  if ! $NO_HTML; then
    "$LLVM_COV" show -format=html -instr-profile="$profdata_path" "${bins[@]}" \
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
  mkdir -p "$OUTPUT_DIR/per-crate" "$OUTPUT_DIR/profraw" "$OUTPUT_DIR/profdata" "$OUTPUT_DIR/html"

  info "Mode=$MODE  Rust?=$($ONLY_TS && echo no || echo yes)  TS?=$($ONLY_RUST && echo no || echo yes)"
  info "Output directory: $OUTPUT_DIR"

  local rust_targets=()
  if ! $ONLY_TS; then
    # bash 3.2 (macOS 自带) 无 mapfile，改用 while IFS= read 循环
    while IFS= read -r _pkg; do
      rust_targets+=("$_pkg")
    done < <(build_rust_targets)
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
      # cargo-llvm-cov 独立 target 目录（cargo clean 不会碰它，会持续吃磁盘）
      if [ -d "$PROJECT_ROOT/target/llvm-cov-target" ]; then
        local cov_size
        cov_size=$(du -sh "$PROJECT_ROOT/target/llvm-cov-target" 2>/dev/null | awk '{print $1}')
        info "Cleaning llvm-cov-target ($cov_size)..."
        rm -rf "$PROJECT_ROOT/target/llvm-cov-target"
      fi
      # 兜底 kill 可能遗留的后台 cargo-llvm-cov 进程
      pkill -9 -f "cargo-llvm-cov" 2>/dev/null || true
      pkill -9 -f "cargo test.*llvm-cov" 2>/dev/null || true
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
  # 优先用 $PROJECT_ROOT 下的脚本（支持 TOPEMS_PROJECT_ROOT override 或脚本被复制到临时目录运行的场景）
  local report_py="$PROJECT_ROOT/scripts/ci/coverage-report.py"
  [[ -f "$report_py" ]] || report_py="$SCRIPT_DIR/coverage-report.py"
  local rc=0
  python3 "$report_py" "${report_args[@]}" || rc=$?
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
