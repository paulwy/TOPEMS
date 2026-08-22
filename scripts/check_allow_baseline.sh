#!/usr/bin/env bash
# =============================================================================
# TOPEMS #[allow(...)] 基线回归检查脚本
# =============================================================================
# 功能：
#   - 统计 svc/ 和 lib/ 目录下 Rust 源码 (.rs) 中的 #[allow(...)] 属性数量
#   - 排除 target/ 构建产物目录
#   - 与基线文件 scripts/check_allow_baseline.txt（纯数字）比较
#   - 当前数量 <= 基线：exit 0（通过）
#   - 当前数量 >  基线：exit 1（回归，CI 失败，防止 #[allow] 滥用）
#   - 支持 --update-baseline：用当前数量覆盖基线文件
#
# 调用方：.github/workflows/ci.yml → code-quality job
#     - name: Check allow(dead_code) baseline (prevent warning regression)
#       run: bash scripts/check_allow_baseline.sh
#
# 用法：
#   bash scripts/check_allow_baseline.sh                    # 基线检查（CI 用）
#   bash scripts/check_allow_baseline.sh --update-baseline  # 更新基线为当前数量
#   bash scripts/check_allow_baseline.sh -h | --help        # 显示帮助
#
# 退出码：
#   0：当前数量 <= 基线（或基线更新成功）
#   1：当前数量 >  基线（回归）
#   2：参数错误 / 基线文件缺失或非法
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE_FILE="$SCRIPT_DIR/check_allow_baseline.txt"

# ---------- 颜色 ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
error() { echo -e "${RED}[ERR]${NC}  $1" >&2; }

usage() {
  cat <<'USG'
Usage: bash scripts/check_allow_baseline.sh [FLAGS]

Check #[allow(...)] attribute count in Rust source (svc/ + lib/) against a
baseline. Prevents silent regression where new #[allow] suppressions are added.

Flags:
  --update-baseline   Overwrite scripts/check_allow_baseline.txt with the
                      current #[allow] count and exit 0 (do NOT fail).
  -h, --help          Show this help.

Exit codes:
  0  count <= baseline (or baseline updated)
  1  count >  baseline (regression)
  2  misuse / missing or invalid baseline file
USG
}

# ---------- 参数解析 ----------
UPDATE_BASELINE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --update-baseline) UPDATE_BASELINE=true; shift ;;
    -h|--help)         usage; exit 0 ;;
    *) error "Unknown flag: $1"; usage; exit 2 ;;
  esac
done

# 切到项目根目录，统一以相对路径扫描（与 CI 基线测量方式一致）
cd "$PROJECT_ROOT"

# ---------- 待扫描目录 ----------
# 仅扫描 svc/ 和 lib/ 下的 Rust 源码，排除 target/ 构建产物。
# 注意：bash 3.2 (macOS 自带) 在 set -u 下展开空数组 "${arr[@]}" 会报错，
#       因此先判断长度再展开，避免该兼容性问题。
SCAN_DIRS=()
[[ -d svc ]] && SCAN_DIRS+=(svc)
[[ -d lib ]] && SCAN_DIRS+=(lib)

# ---------- 统计 #[allow(...)] 数量 ----------
# grep -rn "#\[allow(" 既能匹配外层属性 #[allow(...)]，也能匹配内层属性 #![allow(...)]
# （因为 #[allow( 是 #![allow( 的子串）。
# 用 grep -v "/target/" 排除构建产物，兼容 BSD grep (macOS 无 --exclude-dir)。
count_allows() {
  if [[ ${#SCAN_DIRS[@]} -eq 0 ]]; then
    echo "0"
    return
  fi
  # 临时关闭 pipefail：grep 在无匹配时返回 1，否则会导致 pipeline 失败。
  set +o pipefail
  local count
  count=$(grep -rn "#\[allow(" --include="*.rs" "${SCAN_DIRS[@]}" 2>/dev/null \
            | grep -v "/target/" \
            | wc -l | tr -d ' ')
  set -o pipefail
  echo "${count:-0}"
}

# ---------- 列出当前所有 #[allow] 位置（超基线时辅助定位新增点）----------
list_allows() {
  if [[ ${#SCAN_DIRS[@]} -eq 0 ]]; then
    return
  fi
  set +o pipefail
  grep -rn "#\[allow(" --include="*.rs" "${SCAN_DIRS[@]}" 2>/dev/null \
    | grep -v "/target/" \
    | head -n 50
  set -o pipefail
}

# ---------- main ----------
CURRENT=$(count_allows)

# 更新基线模式：直接写入当前数量并退出 0
if $UPDATE_BASELINE; then
  printf '%s\n' "$CURRENT" > "$BASELINE_FILE"
  info "Baseline updated to $CURRENT at $BASELINE_FILE"
  exit 0
fi

# 读取基线
if [[ ! -f "$BASELINE_FILE" ]]; then
  error "Baseline file not found: $BASELINE_FILE"
  info  "Run: bash scripts/check_allow_baseline.sh --update-baseline"
  exit 2
fi
# 仅保留数字，容忍尾部空白/换行
BASELINE=$(tr -dc '0-9' < "$BASELINE_FILE")
if [[ -z "$BASELINE" ]]; then
  error "Baseline file is empty or non-numeric: $BASELINE_FILE"
  exit 2
fi

# 比较
info "#[allow(...)] count: current=$CURRENT baseline=$BASELINE"
if [[ "$CURRENT" -le "$BASELINE" ]]; then
  echo -e "${GREEN}✅ #[allow] count: $CURRENT (baseline: $BASELINE)${NC}"
  exit 0
else
  echo -e "${RED}❌ #[allow] count: $CURRENT exceeds baseline: $BASELINE${NC}" >&2
  echo -e "${CYAN}[>>]${NC}   Current #[allow] locations (first 50):" >&2
  list_allows >&2
  echo -e "${YELLOW}[WARN]${NC} If the increase is intentional, update the baseline:" >&2
  echo -e "${YELLOW}[WARN]${NC}   bash scripts/check_allow_baseline.sh --update-baseline" >&2
  exit 1
fi
