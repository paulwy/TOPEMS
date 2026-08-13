# 覆盖率基线测量脚本 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 TOPEMS 全仓（Rust workspace + TypeScript apps/web）建立可复现的覆盖率基线测量入口，输出人读 Markdown + 机读 JSON，支持 CI 阈值门禁。

**Architecture:** bash 主调度脚本调用 cargo test -Z instrument-coverage（Rust）+ vitest --coverage（TS），生成 per-crate JSON 与 vitest summary；然后 Python 汇总脚本读这些工件，加权汇总，分 crate/分 tier 产出报告与阈值判断。

**Tech Stack:** Bash (≥5, set -euo pipefail), Python (≥3.10, 仅标准库 json/os/subprocess/datetime/argutils 等价 sys+argparse), Rust llvm-tools-preview (llvm-cov/llvm-profdata), Vitest (v8 coverage provider, 已配), jq (可选, 用于 JSON 裁剪，Python 侧兼容无 jq 情况)

---

## File Structure

| 文件 | 动作 | 角色 | 代码规模 |
|:-----|:-----|:-----|:--------:|
| `scripts/ci/coverage-baseline.sh` | 新建 | 调度：自检、CLI、构建目标列表、调 Rust/TS 测试、落 per-crate JSON、最终调 Python 汇总 | ~250 行 |
| `scripts/ci/coverage-report.py` | 新建 | 汇总：读工件 → 加权 → 分级 → 阈值 → 写 report.md/report.json + 控制台表 | ~220 行 |
| `Makefile` | 修改 | 追加两个目标 `coverage-baseline` 与 `coverage-baseline-full`，放 "质量门禁" 分组下 | +8 行 |

---

## Task 1: 编写 bash 主调度脚本

**Files:**
- Create: `scripts/ci/coverage-baseline.sh`

- [ ] **Step 1: 写文件头 + shebang + 彩色日志函数 + cd 到项目根**

```bash
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
```

- [ ] **Step 2: 写 usage() 函数 + 默认变量初始化**

```bash
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
```

- [ ] **Step 3: 写参数解析（getopt 风格 while-case）**

```bash
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
```

- [ ] **Step 4: 写工具链自检函数 `toolchain_selfcheck`（最复杂的部分）**

```bash
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
  # 优先 rustup 安装的，其次 CommandLineTools 系统级
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
    # 已是 nightly toolchain
    RUSTC_NIGHTLY_FLAG=""
  elif cargo +nightly rustc --version >/dev/null 2>&1; then
    RUSTC_NIGHTLY_FLAG="+nightly"
  else
    # 尝试 RUSTC_BOOTSTRAP
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
```

- [ ] **Step 5: 写 Rust 目标 crate 列表构建 + 测试调度函数**

```bash
# ---------- Rust: 构建 crate 列表 ----------
FAST_SHARED=(
  topems-shared-core topems-shared-db topems-shared-auth
  topems-shared-service-client topems-shared-event topems-shared-observability
  topems-shared-ai topems-shared-bootstrap
)
FAST_CORE_SVCS=( topems-unified-core topems-ai topems-erp topems-wms topems-crm )

build_rust_targets() {
  local targets=()
  if [[ ${#EXTRA_PKGS[@]} -gt 0 && $MODE == "fast" && ! (ONLY_TS) ]]; then
    warn "Only -p packages were given (no --fast/--full with -p...). Using EXTRA_PKGS only."
  fi
  if [[ $MODE == "fast" ]]; then
    targets+=( "${FAST_SHARED[@]}" "${FAST_CORE_SVCS[@]}" )
  elif [[ $MODE == "full" ]]; then
    local ws_pkgs
    ws_pkgs=$(cargo metadata --format-version 1 --no-deps 2>/dev/null | \
      python3 -c "import sys,json; [print(p['name']) for p in json.load(sys.stdin)['packages']]" 2>/dev/null)
    [[ -n "$ws_pkgs" ]] || { error "cargo metadata failed"; exit 2; }
    while IFS= read -r pkg; do
      [[ "$pkg" == "migration-sdk" || "$pkg" == "topems-tools-migration-sdk" ]] && continue
      targets+=( "$pkg" )
    done <<< "$ws_pkgs"
  fi
  targets+=( "${EXTRA_PKGS[@]}" )
  # deduplicate
  printf "%s\n" "${targets[@]}" | awk '!seen[$0]++' | grep -v '^$'
}
```

```bash
# ---------- Rust: 跑单个 crate ----------
# env 需要：CARGO_INCREMENTAL=0, RUSTFLAGS=-Zinstrument-coverage, LLVM_PROFILE_FILE=<profraw_dir>/<crate>-%p-%m.profraw
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
    RUSTFLAGS="-Z instrument-coverage --coverage-target-only" \
    LLVM_PROFILE_FILE="$profraw_dir/$crate-%p-%m.profraw" \
    bash -c "$env_prefix cargo $cargo_toolchain test -p '$crate' --lib --bins --tests"
    rc=$?
  else
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="-Z instrument-coverage --coverage-target-only" \
    LLVM_PROFILE_FILE="$profraw_dir/$crate-%p-%m.profraw" \
    bash -c "$env_prefix cargo $cargo_toolchain test -p '$crate' --lib --bins --tests" \
      >/tmp/cov-cargo.log 2>&1
    rc=$?
  fi
  set -e
  if [[ $rc -ne 0 ]]; then
    warn "[$crate] cargo test FAILED (exit $rc). Recording as skipped."
    # 写入失败的 json (汇总脚本兼容)
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
  # 找测试二进制文件：从 target/debug/deps/<crate>-<hash>* (筛选可执行文件)
  local -a bins
  mapfile -t bins < <(find "$PROJECT_ROOT/target/debug/deps" -maxdepth 1 -type f -executable \
                       -name "$(echo "$crate" | tr '-' '_')-*" 2>/dev/null || true)
  if [[ ${#bins[@]} -eq 0 ]]; then
    # 回退：target/debug/<crate>
    mapfile -t bins < <(find "$PROJECT_ROOT/target/debug" -maxdepth 1 -type f -executable \
                         -name "$(echo "$crate" | tr '-' '_')*" 2>/dev/null || true)
  fi
  if [[ ${#bins[@]} -eq 0 ]]; then
    warn "[$crate] no coverage binary found under target/debug"
    cat > "$json_path" <<EOF
{"crate":"$crate","status":"failed","reason":"no_coverage_binary"}
EOF
    return 0
  fi
  # per crate json
  local raw_export="/tmp/cov-export-$crate.json"
  local bin_args=(); for b in "${bins[@]}"; do bin_args+=(-object "$b"); done
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
    # 原样落盘，Python 侧兼容
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
```

- [ ] **Step 6: 写 TS 调度函数 `run_ts_coverage`**

```bash
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
```

- [ ] **Step 7: 写 main 函数（调度全流程 + 调 Python）**

```bash
# ---------- main ----------
main() {
  toolchain_selfcheck
  mkdir -p "$OUTPUT_DIR"

  info "Mode=$MODE  Rust?=$($ONLY_RUST && echo no || echo yes)  TS?=$($ONLY_TS && echo no || echo yes)"
  info "Output directory: $OUTPUT_DIR"

  local rust_targets=()
  if ! $ONLY_TS; then
    mapfile -t rust_targets < <(build_rust_targets)
    info "Rust targets (${#rust_targets[@]}): ${rust_targets[*]}"
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
    error "coverage-report.py not found or internal error"
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
```

- [ ] **Step 8: chmod +x 并 bash -n 语法验证**

Run:
```
chmod +x scripts/ci/coverage-baseline.sh
bash -n scripts/ci/coverage-baseline.sh
echo "exit=$?"
```
Expected: `exit=0`（无语法错误）

- [ ] **Step 9: 冒烟 --help 检查**

Run:
```
./scripts/ci/coverage-baseline.sh -h | head -20
echo "---"
./scripts/ci/coverage-baseline.sh -h | grep -c "fail-under"
```
Expected: 帮助文本出现，`grep -c fail-under` ≥ 3

- [ ] **Step 10: 提交 Task 1**

```bash
git add scripts/ci/coverage-baseline.sh
git commit -m "test(ci): add coverage-baseline.sh dispatcher (Rust + TS)"
```

---

## Task 2: 编写 Python 汇总器

**Files:**
- Create: `scripts/ci/coverage-report.py`

- [ ] **Step 1: 写文件头、argparse、工具链版本函数、项目根定位**

```python
#!/usr/bin/env python3
"""TOPEMS coverage report aggregator.

Reads:
  - <OUTPUT_DIR>/per-crate/*.json (per-Rust-crate llvm-cov summaries)
  - <PROJECT_ROOT>/apps/web/coverage/coverage-summary.json (vitest)

Produces:
  - <OUTPUT_DIR>/report.md  (human-readable Markdown)
  - <OUTPUT_DIR>/report.json (machine-readable, threshold-annotated)
  - Console ASCII summary table

Exit codes:
   0 OK (all thresholds passed or no thresholds given)
   1 Threshold(s) NOT satisfied
  99 Internal error (should not happen)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


GREEN_TIER = 40.0
YELLOW_TIER = 15.0


def tier(pct: float) -> str:
    if pct >= GREEN_TIER:
        return "green"
    if pct >= YELLOW_TIER:
        return "yellow"
    return "red"


def tier_md(t: str) -> str:
    return {"green": "🟢", "yellow": "🟡", "red": "🔴"}.get(t, "⚪")


# ---------------- 工具链/元数据 ----------------
def git_commit_short(prj: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(prj), capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip()
    except Exception:
        return "unknown"


def git_branch(prj: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(prj), capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip()
    except Exception:
        return "unknown"


def toolchain_versions() -> dict:
    def run(cmd: list[str]) -> str:
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return r.stdout.strip().splitlines()[0] if r.stdout.strip() else "n/a"
        except Exception:
            return "n/a"

    return {
        "rust": run(["rustc", "--version"]),
        "llvm_cov": run(["bash", "-lc", "llvm-cov --version 2>/dev/null | head -1 || true"]),
        "node": run(["node", "--version"]),
        "pnpm": run(["pnpm", "--version"]),
        "vitest": run(["bash", "-lc", "cd apps/web && pnpm vitest --version 2>/dev/null | head -1 || true"]),
    }
```

- [ ] **Step 2: Rust crate 读取 + 归一化**

```python
# ---------------- Rust: 读取 per-crate JSON ----------------
def read_rust_per_crate(output_dir: Path) -> list[dict]:
    per_dir = output_dir / "per-crate"
    if not per_dir.is_dir():
        return []
    rows: list[dict] = []
    for p in sorted(per_dir.glob("*.json")):
        try:
            with p.open() as fh:
                d = json.load(fh)
        except Exception as e:
            rows.append({"crate": p.stem, "status": "failed",
                         "reason": f"json_parse_error: {e}"})
            continue
        status = d.get("status", "ok")
        if status != "ok" or "totals" not in d:
            rows.append(d)
            continue
        t = d["totals"]
        lines = t.get("lines", {})
        funs  = t.get("functions", {})
        brs   = t.get("branches", {})
        def _cov(section: dict) -> tuple[float, int, int]:
            cnt = int(section.get("count", 0) or 0)
            cvd = int(section.get("covered", 0) or 0)
            # percent 字段可能不存在
            pct_raw = section.get("percent") if isinstance(section.get("percent"), (int,float)) else None
            pct = round(float(pct_raw if pct_raw is not None else ((100.0 * cvd / cnt) if cnt else 0.0)), 2)
            return pct, cvd, cnt
        lp, lc, ln = _cov(lines)
        fp, fc, fn = _cov(funs)
        bp, bc, bn = _cov(brs)
        # category: lib / svc / other
        name = d["crate"]
        cat = "lib" if name.startswith("topems-shared") or name == "topems" or name.startswith("shared") else \
              ( "svc" if name.startswith("topems-") and not name.endswith("tools") else "other")
        rows.append({
            "crate": name,
            "status": "ok",
            "category": cat,
            "lines_pct": lp, "lines_covered": lc, "lines_count": ln,
            "functions_pct": fp, "functions_covered": fc, "functions_count": fn,
            "branches_pct": bp,  "branches_covered":  bc, "branches_count":  bn,
            "files_count": int(d.get("files_count", 0) or 0),
            "tier": tier(lp),
        })
    # 排序：status=ok 按 lines_pct 降序；status!=ok 放最后保持插入序
    ok = [r for r in rows if r.get("status") == "ok"]
    ok.sort(key=lambda r: r["lines_pct"], reverse=True)
    rest = [r for r in rows if r.get("status") != "ok"]
    return ok + rest
```

- [ ] **Step 3: TS summary 读取 + 归一化**

```python
# ---------------- TS: 读取 vitest coverage-summary.json ----------------
def read_ts_summary(prj: Path) -> dict | None:
    path = prj / "apps/web/coverage/coverage-summary.json"
    if not path.is_file():
        return None
    try:
        with path.open() as fh:
            d = json.load(fh)
    except Exception:
        return None
    total = d.get("total", {}) or {}
    out: dict = {}
    for key in ("lines", "functions", "statements", "branches"):
        s = total.get(key, {}) or {}
        tot = int(s.get("total", 0) or 0)
        cvd = int(s.get("covered", 0) or 0)
        pct_in = s.get("pct")
        if not isinstance(pct_in, (int, float)):
            pct_in = None
        pct = round(float(pct_in if pct_in is not None else ((100.0 * cvd / tot) if tot else 0.0)), 2)
        out[key] = {"pct": pct, "covered": cvd, "total": tot}
    return out
```

- [ ] **Step 4: 加权汇总 summary 构建 + 阈值判断**

```python
# ---------------- 汇总 ----------------
def build_summary(rust_rows: list[dict], ts: dict | None) -> dict:
    rust = {"crates_count": 0}
    ok = [r for r in rust_rows if r.get("status") == "ok"]
    if ok:
        rust["crates_count"] = len(ok)
        def _sum(field_covered: str, field_count: str) -> tuple[int, int]:
            c = sum(r[field_covered] for r in ok)
            n = sum(r[field_count]   for r in ok)
            return c, n
        lc, ln = _sum("lines_covered", "lines_count")
        fc, fn = _sum("functions_covered", "functions_count")
        bc, bn = _sum("branches_covered", "branches_count")
        rust.update({
            "lines_pct":       round(100.0 * lc / ln, 2) if ln else 0.0,
            "lines_covered":   lc, "lines_count": ln,
            "functions_pct":   round(100.0 * fc / fn, 2) if fn else 0.0,
            "functions_covered": fc, "functions_count": fn,
            "branches_pct":    round(100.0 * bc / bn, 2) if bn else 0.0,
            "branches_covered": bc, "branches_count": bn,
        })
    else:
        rust.update({"lines_pct": 0.0, "functions_pct": 0.0, "branches_pct": 0.0,
                     "lines_covered":0,"lines_count":0,
                     "functions_covered":0,"functions_count":0,
                     "branches_covered":0,"branches_count":0})

    ts_out: dict | None = None
    if ts:
        ts_out = {
            "lines_pct":      ts["lines"]["pct"],
            "functions_pct":  ts["functions"]["pct"],
            "branches_pct":   ts["branches"]["pct"],
            "statements_pct": ts["statements"]["pct"],
            "statements_covered": ts["statements"]["covered"],
            "statements_total":   ts["statements"]["total"],
            "lines_covered": ts["lines"]["covered"],
            "lines_total":   ts["lines"]["total"],
        }

    overall_pct = None
    if ln or (ts and ts["statements"]["total"]):
        cov = rust["lines_covered"] + (ts["statements"]["covered"] if ts else 0)
        tot = rust["lines_count"]   + (ts["statements"]["total"]   if ts else 0)
        overall_pct = round(100.0 * cov / tot, 2) if tot else 0.0

    overall = {"lines_pct": overall_pct, "crate_weighted": True}
    return {"rust": rust, "ts": ts_out, "overall": overall}
```

```python
def eval_threshold(summary: dict, args: argparse.Namespace) -> dict:
    failures: list[str] = []

    def _check(label: str, actual: float | None, threshold: str | None) -> None:
        if threshold is None or actual is None:
            return
        th = float(threshold)
        if actual < th:
            failures.append(f"{label}: actual {actual}% < threshold {th}%")

    r = summary.get("rust", {})
    t = summary.get("ts") or {}
    _check("overall",         summary.get("overall", {}).get("lines_pct"), args.fail_under)
    _check("rust",            r.get("lines_pct"),                            args.fail_rust_under)
    _check("ts",              t.get("lines_pct"),                            args.fail_ts_under)
    enabled = bool(args.fail_under or args.fail_rust_under or args.fail_ts_under)
    return {
        "enabled": enabled,
        "fail_under_lines":       float(args.fail_under)      if args.fail_under      else None,
        "fail_rust_under_lines":  float(args.fail_rust_under) if args.fail_rust_under else None,
        "fail_ts_under_lines":    float(args.fail_ts_under)   if args.fail_ts_under   else None,
        "actual_overall_lines_pct": summary.get("overall", {}).get("lines_pct"),
        "reasons": failures,
        "passed": enabled and len(failures) == 0 if enabled else True,
    }
```

- [ ] **Step 5: Markdown 报告生成器 + 控制台 ASCII 表**

```python
# ---------------- Markdown ----------------
def _md_row(crate_row: dict, rank: int | str) -> str:
    t = tier_md(crate_row.get("tier", "red"))
    cat = {"lib": "lib", "svc": "svc", "other": "oth"}.get(crate_row.get("category", "other"), "oth")
    return (f"| {rank} | `{crate_row['crate']}` | {cat} | {crate_row['lines_pct']}% | "
            f"{crate_row['lines_covered']}/{crate_row['lines_count']} | "
            f"{crate_row['functions_pct']}% | {crate_row['branches_pct']}% | {t} |")


def build_markdown(meta: dict, summary: dict, rust_rows: list[dict], threshold: dict) -> str:
    r = summary["rust"]; t = summary.get("ts"); o = summary["overall"]
    def tier_t(pct: float | None) -> str:
        return tier_md(tier(pct)) if isinstance(pct, (int,float)) else "—"
    ts_lines_pct_md = f"{t['lines_pct']}%" if t else "—"
    ts_func_pct_md  = f"{t['functions_pct']}%" if t else "—"
    ts_br_pct_md    = f"{t['branches_pct']}%"  if t else "—"
    ts_row_md = "—"
    if t:
        ts_row_md = (f"| **TS（apps/web，vitest）** | {t['lines_pct']}% | "
                     f"{t['functions_pct']}% | {t['branches_pct']}% | "
                     f"{tier_t(t['lines_pct'])} |")

    lines = []
    lines.append("# TOPEMS 测试覆盖率基线报告")
    lines.append("")
    now = meta["generated_at"]
    lines.append(f"> **生成时间**：{now}  ")
    lines.append(f"> **Git**：{meta['git_branch']} @ `{meta['git_commit']}`  ")
    lines.append(f"> **模式**：{meta['mode']}（{r['crates_count']} crates + apps/web）  ")
    tc = meta.get("toolchain", {})
    lines.append(f"> **工具链**：{tc.get('rust','?')} / {tc.get('vitest','?')}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 总览")
    lines.append("")
    lines.append("| 维度 | 行覆盖 | 函数覆盖 | 分支覆盖 | Tier |")
    lines.append("|:----:|:------:|:--------:|:--------:|:----:|")
    lines.append(f"| **Rust（加权，{r['crates_count']} crate）** | {r['lines_pct']}% | "
                 f"{r['functions_pct']}% | {r['branches_pct']}% | {tier_t(r['lines_pct'])} |")
    lines.append(ts_row_md)
    lines.append(f"| **整体合并** | **{o['lines_pct'] if o['lines_pct'] is not None else '—'}%** | "
                 f"— | — | {tier_t(o['lines_pct'])} |")
    lines.append("")
    if threshold["enabled"]:
        pf = "✅ PASS" if threshold["passed"] else "❌ FAIL"
        reasons = ("<br>".join(threshold["reasons"])) if threshold["reasons"] else "所有阈值通过"
        lines.append(f"> **阈值判断**：`--fail-under {threshold['fail_under_lines']}` → {pf}  ")
        lines.append(f"> 细节：{reasons}")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Rust 分 Crate 明细（按行覆盖降序）")
    lines.append("")
    lines.append("| # | Crate | 分类 | 行覆盖 | 行已测/总数 | 函数覆盖 | 分支覆盖 | Tier |")
    lines.append("|--:|:------|:----:|:------:|:------:|:------:|:------:|:----:|")
    rank = 1
    for row in rust_rows:
        if row.get("status") != "ok":
            continue
        lines.append(_md_row(row, str(rank)))
        rank += 1
    skipped = [r for r in rust_rows if r.get("status") != "ok"]
    if skipped:
        lines.append("")
        lines.append("### 跳过 / 失败的 Crates（不参与汇总）")
        lines.append("")
        lines.append("| Crate | status | 原因 |")
        lines.append("|:------|:------:|:-----|")
        for r in skipped:
            lines.append(f"| `{r.get('crate','?')}` | {r.get('status','?')} | {r.get('reason','-')} |")
    lines.append("")
    lines.append("**每 Crate HTML 详情**：`target/coverage/html/<crate>/index.html`（`--no-html` 不生成）")
    lines.append("")
    if t:
        lines.append("---")
        lines.append("")
        lines.append("## TypeScript（apps/web）")
        lines.append("")
        lines.append("| 维度 | 语句 | 行 | 函数 | 分支 |")
        lines.append("|:-----|:----:|:--:|:----:|:----:|")
        lines.append(f"| 总计 | {t['statements_pct']}% | {t['lines_pct']}% | "
                     f"{t['functions_pct']}% | {t['branches_pct']}% |")
        lines.append("")
        lines.append("**HTML 详情**：`apps/web/coverage/index.html`")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 数据来源")
    lines.append("")
    lines.append("- 机器可读 JSON：`report.json`（和本文件同目录）")
    lines.append("- 复现命令：`./scripts/ci/coverage-baseline.sh --fast`")
    lines.append("")
    return "\n".join(lines) + "\n"
```

```python
# ---------------- 控制台 ASCII 摘要 ----------------
def console_summary(summary: dict, threshold: dict) -> str:
    r = summary["rust"]; t = summary.get("ts"); o = summary["overall"]
    out: list[str] = []
    out.append("")
    out.append("================ TOPEMS COVERAGE SUMMARY ================")
    out.append(f"  Rust (n={r['crates_count']})   lines {r['lines_pct']:5.1f}%  "
               f"func {r['functions_pct']:5.1f}%  br {r['branches_pct']:5.1f}%  "
               f"[{tier(r['lines_pct'])}]")
    if t:
        out.append(f"  TS (apps/web)              lines {t['lines_pct']:5.1f}%  "
                   f"func {t['functions_pct']:5.1f}%  br {t['branches_pct']:5.1f}%  "
                   f"[{tier(t['lines_pct'])}]")
    if o["lines_pct"] is not None:
        out.append(f"  OVERALL                   lines {o['lines_pct']:5.1f}%  "
                   f"[{tier(o['lines_pct'])}]")
    if threshold["enabled"]:
        pf = "PASS" if threshold["passed"] else "FAIL"
        out.append(f"  THRESHOLD                 {pf}  (reasons: {len(threshold['reasons'])})")
        for reason in threshold["reasons"]:
            out.append(f"    - {reason}")
    out.append("==========================================================")
    return "\n".join(out)
```

- [ ] **Step 6: main() + argparse 接线**

```python
def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(prog="coverage-report.py",
                                 description="Aggregate TOPEMS coverage artifacts into MD+JSON.")
    ap.add_argument("--mode", default="fast", choices=["fast", "full", "custom"])
    ap.add_argument("--output-dir", required=True, type=Path)
    ap.add_argument("--project-root", required=True, type=Path)
    ap.add_argument("--fail-under",         default=None, type=str)
    ap.add_argument("--fail-rust-under",    default=None, type=str)
    ap.add_argument("--fail-ts-under",      default=None, type=str)
    return ap.parse_args()


def main() -> int:
    try:
        args = parse_args()
        output_dir: Path = args.output_dir.expanduser().resolve()
        project_root: Path = args.project_root.expanduser().resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

        rust_rows = read_rust_per_crate(output_dir)
        ts_summary = read_ts_summary(project_root)
        summary = build_summary(rust_rows, ts_summary)
        threshold = eval_threshold(summary, args)

        meta = {
            "generated_at": now,
            "mode": args.mode,
            "version": "1",
            "git_commit": git_commit_short(project_root),
            "git_branch": git_branch(project_root),
            "toolchain": toolchain_versions(),
        }

        report = {"meta": meta, "summary": summary,
                  "rust_per_crate": rust_rows, "threshold": threshold}

        report_json_path = output_dir / "report.json"
        with report_json_path.open("w") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        md = build_markdown(meta, summary, rust_rows, threshold)
        report_md_path = output_dir / "report.md"
        with report_md_path.open("w") as f:
            f.write(md)

        print(console_summary(summary, threshold))
        print(f"MD   → {report_md_path}")
        print(f"JSON → {report_json_path}")

        if not threshold["passed"]:
            return 1
        return 0
    except Exception as e:  # pragma: no cover - top-level guard
        print(f"[FATAL] {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 99


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 7: chmod +x 并 py_compile + 运行 --help**

Run:
```
chmod +x scripts/ci/coverage-report.py
python3 -m py_compile scripts/ci/coverage-report.py && echo "COMPILE OK"
python3 scripts/ci/coverage-report.py -h
```
Expected: `COMPILE OK` 输出；help 文本列出 `--mode/--output-dir/--project-root/--fail-under` 等参数。

- [ ] **Step 8: 最小数据烟雾测试（mock 两个 JSON 走一整轮汇总）**

Run:
```
mkdir -p /tmp/topems-cov-mock/per-crate
cat > /tmp/topems-cov-mock/per-crate/topems-shared-core.json <<'J'
{"crate":"topems-shared-core","status":"ok","timestamp":1755072000,"files_count":50,
 "totals":{
   "lines":     {"count":1000,"covered":425,"percent":42.50},
   "functions": {"count":200, "covered":76, "percent":38.00},
   "branches":  {"count":600, "covered":132,"percent":22.00},
   "regions":   {"count":700, "covered":210,"percent":30.00}}}
J
cat > /tmp/topems-cov-mock/per-crate/topems-crm.json <<'J'
{"crate":"topems-crm","status":"ok","timestamp":1755072000,"files_count":80,
 "totals":{
   "lines":     {"count":2000,"covered":80, "percent":4.00},
   "functions": {"count":400, "covered":12, "percent":3.00},
   "branches":  {"count":1000,"covered":15, "percent":1.50},
   "regions":   {"count":1200,"covered":60, "percent":5.00}}}
J
python3 scripts/ci/coverage-report.py --mode custom --output-dir /tmp/topems-cov-mock --project-root "$PWD"
echo "exit=$?"
ls /tmp/topems-cov-mock/report.*
python3 - <<'PY'
import json
r=json.load(open("/tmp/topems-cov-mock/report.json"))
print("overall lines_pct =", r["summary"]["overall"]["lines_pct"])
print("rust crates_count =", r["summary"]["rust"]["crates_count"])
print("shared-core tier  =", next(x["tier"] for x in r["rust_per_crate"] if x["crate"]=="topems-shared-core"))
print("crm tier          =", next(x["tier"] for x in r["rust_per_crate"] if x["crate"]=="topems-crm"))
PY
```
Expected: `exit=0`，两个 report 文件列出；overall 约 (425+80)/(1000+2000) = 16.83%，shared-core=green / crm=red。

- [ ] **Step 9: 阈值门禁测试（--fail-under 100 → 1 / --fail-under 0 → 0）**

Run:
```
python3 scripts/ci/coverage-report.py --mode custom --output-dir /tmp/topems-cov-mock --project-root "$PWD" --fail-under 100
echo "high-threshold exit=$?"
python3 scripts/ci/coverage-report.py --mode custom --output-dir /tmp/topems-cov-mock --project-root "$PWD" --fail-under 0
echo "zero-threshold exit=$?"
```
Expected: first `exit=1`, second `exit=0`.

- [ ] **Step 10: 提交 Task 2**

```bash
git add scripts/ci/coverage-report.py
git commit -m "test(ci): add coverage-report.py aggregator (MD+JSON+thresholds)"
```

---

## Task 3: Makefile 追加 2 个 coverage 目标

**Files:**
- Modify: `Makefile` (after `check-offline` block, before `# ---------- 常用快捷命令 ----------`)

- [ ] **Step 1: 确认 Makefile 第 36-40 行"质量门禁"结构并插入 2 行**

先 Read 第 35-45 行附近（已知结构）。确认后插入：

```makefile
# ---------- 质量门禁（本地对齐 CI）----------
check-online: ## 在线 cargo check（需要 DATABASE_URL，可捕获 sqlx 宏类型错误）
	cargo check --workspace

check-offline: ## 离线 cargo check（SQLX_OFFLINE=true，模拟 CI GitHub Actions 环境）
	DATABASE_URL= SQLX_OFFLINE=true cargo check --workspace

coverage-baseline: ## 快速模式覆盖率基线（13 crates + apps/web vitest）
	./scripts/ci/coverage-baseline.sh --fast

coverage-baseline-full: ## 全 workspace + apps/web 覆盖率基线
	./scripts/ci/coverage-baseline.sh --full
```

- [ ] **Step 2: 验证 make help 列出新目标**

Run:
```
make help | grep -i coverage
```
Expected: 至少列出 `coverage-baseline` 和 `coverage-baseline-full` 两行。

- [ ] **Step 3: 提交 Task 3**

```bash
git add Makefile
git commit -m "chore(make): add coverage-baseline / coverage-baseline-full targets"
```

---

## Task 4: 端到端验收（A1-A8）与最终提交

- [ ] **Step 1: A1/A2 语法验证**

```
bash -n scripts/ci/coverage-baseline.sh && echo "A1 bash syntax OK"
python3 -m py_compile scripts/ci/coverage-report.py && echo "A2 python compile OK"
```

- [ ] **Step 2: A3 --help 列出所有关键 flags**

```
./scripts/ci/coverage-baseline.sh -h > /tmp/help.txt
for f in --rust --ts --fast --full --package --skip-clean --no-html \
         --output-dir --fail-under --fail-rust-under --fail-ts-under --verbose; do
  if ! grep -q "$f" /tmp/help.txt; then echo "MISSING FLAG: $f"; exit 1; fi
done
echo "A3 help flags OK"
```

- [ ] **Step 3: A4 + A5（烟雾跑 TS-only 或一个单 crate，确认数值区间）**

TS-only 模式无需 Rust 工具链，最快。但此仓 vitest AD_HOC 问题可能会失败 → 走 per-crate mock 路径（Task 2 已跑，算 A4）。若本地有 Rust 工具链，尝试跑 shared-bootstrap 单 crate：

```
# 仅尝试（失败不计失败：确认工具链就绪与否 + SKIPPED 记录）
./scripts/ci/coverage-baseline.sh --rust --skip-clean --no-html \
    -p topems-shared-bootstrap --output-dir /tmp/topems-cov-real \
  2>&1 | tail -20 || true
ls /tmp/topems-cov-real/per-crate/ 2>/dev/null
```
Expected: shared-bootstrap crate 成功（coverage > 30%）或若 nightly/instrument-coverage 不就绪则状态里明确说明，不影响其他验收。

- [ ] **Step 4: A6 阈值门禁（用 mock 数据）**

```
python3 scripts/ci/coverage-report.py --mode custom --output-dir /tmp/topems-cov-mock --project-root "$PWD" --fail-under 100
[[ $? -eq 1 ]] || { echo "A6 HIGH fail-under 应该 exit=1"; exit 1; }
python3 scripts/ci/coverage-report.py --mode custom --output-dir /tmp/topems-cov-mock --project-root "$PWD" --fail-under 0
[[ $? -eq 0 ]] || { echo "A6 ZERO fail-under 应该 exit=0"; exit 1; }
echo "A6 thresholds OK"
```

- [ ] **Step 5: A7 不存在 crate -p topems-xxx → 报告中 SKIPPED**

```
mkdir -p /tmp/topems-cov-a7/per-crate
echo '{"crate":"topems-nonexistent","status":"failed","reason":"crate_not_found"}' \
  > /tmp/topems-cov-a7/per-crate/topems-nonexistent.json
python3 scripts/ci/coverage-report.py --mode custom --output-dir /tmp/topems-cov-a7 --project-root "$PWD"
grep -q "topems-nonexistent" /tmp/topems-cov-a7/report.md && echo "A7 skipped crate present in MD OK"
python3 -c "import json; r=json.load(open('/tmp/topems-cov-a7/report.json')); print('A7 json list=', [x['crate'] for x in r['rust_per_crate']])"
```

- [ ] **Step 6: A8 Make 入口真实调用 help 路径**

```
make -n coverage-baseline | grep -q "scripts/ci/coverage-baseline.sh --fast" && echo "A8 make target OK"
```

- [ ] **Step 7: 最终汇总提交（如果 Task 1/2/3 已经分批提交，不需要再 commit；这一步做一个 README / scripts/README.md 追加一行的轻量提交或跳过）**

可选：在 `scripts/README.md` 的 `ci/` 段落追加一行：
- `coverage-baseline.sh` — 覆盖率基线测量入口（Rust instrument-coverage + Vitest）
- `coverage-report.py` — 覆盖率报告汇总器（聚合为 report.md / report.json + 阈值门禁）

---

## Plan Self-Review

**1. Spec coverage 映射：**

| Spec 章节 | Plan 任务 |
|----------|----------|
| 1.1 目标（Rust+TS 双栈报告 + 阈值） | Task 1 main() 调两边 + Task 2 build_summary + eval_threshold |
| 3. 架构 (bash + python 双文件) | Task 1 / Task 2 |
| 4. 工件目录 | Task 1 变量 `OUTPUT_DIR` 子结构：profraw/profdata/per-crate/html |
| 5. CLI flags 全列表（15+ flags） | Task 1 Step 2 usage() + Step 3 argparse while/case |
| 5. 默认 crate 列表 | Task 1 Step 5 FAST_SHARED/FAST_CORE_SVCS |
| 6.1 per-crate JSON 裁剪 jq + fallback 非 jq | Task 1 Step 5 末尾 jq + inline Python |
| 6.2 TS coverage-summary.json | Task 2 Step 3 read_ts_summary |
| 6.3 report.json | Task 2 Step 6 `report` dict 写 JSON |
| 6.4 tier 阈值 | Task 2 头部 GREEN/YELLOW_TIER 40/15 |
| 7. 加权汇总公式 | Task 2 Step 4 build_summary `100*lc/ln` |
| 8. 自检 + 降级 | Task 1 Step 4 toolchain_selfcheck（含 nightly/bootstrap 检测、jq/pnpm 降级） |
| 8. 中段容错 | Task 1 run_rust_crate 各失败分支写 status:failed/skipped JSON |
| 9.1 Makefile 目标 | Task 3 |
| 10. A1-A8 验收 | Task 4 Step 1-6 逐一跑命令 |

✅ 无缺口。

**2. Placeholder 扫描：** 全文 search "TODO/TBD/implement later/fill" — 0 命中。所有代码块为完整 bash/python/make。✅

**3. Type 一致性：**
- bash 输出 `status:ok/failed/no_tests` → Python 读 `r.get("status")=="ok"` 一致 ✅
- bash JSON `totals.lines.count/covered/percent` 三个字段命名与 Python `_cov(section)` 取值一致 ✅
- Tier 值字符串 "green/yellow/red" 与 `tier_md()` mapping 一致 ✅
- `coverage-baseline.sh` 调 Python 的路径 `$SCRIPT_DIR/coverage-report.py` 与两文件都在 `scripts/ci/` 下一致 ✅

