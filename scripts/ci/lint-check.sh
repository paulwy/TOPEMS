#!/usr/bin/env bash
# =============================================================================
# CI Lint Check - 防止 Rust 警告和 TS 类型错误回归
# =============================================================================
# 检查项：
#   1. Rust 编译警告（必须为 0）
#   2. TypeScript 类型错误（必须为 0）
#   3. clippy 警告（必须为 0）
#
# 使用方式：
#   ./scripts/ci/lint-check.sh           # 全量检查
#   ./scripts/ci/lint-check.sh --rust    # 仅检查 Rust
#   ./scripts/ci/lint-check.sh --ts      # 仅检查 TypeScript
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 结果统计
RUST_WARNINGS=0
TS_ERRORS=0
CLIPPY_WARNINGS=0

# -----------------------------------------------------------------------------
# Rust 编译警告检查
# -----------------------------------------------------------------------------
check_rust() {
    echo -e "${YELLOW}🔍 检查 Rust 编译警告...${NC}"
    
    local output
    output=$(cargo check --workspace 2>&1 || true)
    
    local warnings
    warnings=$(echo "$output" | grep -c "^warning:" || true)
    
    if [ "$warnings" -eq 0 ]; then
        echo -e "${GREEN}✅ Rust 编译警告: 0${NC}"
    else
        echo -e "${RED}❌ Rust 编译警告: $warnings${NC}"
        echo "$output" | grep "^warning:" | head -20
        RUST_WARNINGS=$warnings
    fi
}

# -----------------------------------------------------------------------------
# Clippy 检查
# -----------------------------------------------------------------------------
check_clippy() {
    echo -e "${YELLOW}🔍 检查 Clippy 警告...${NC}"
    
    local output
    output=$(cargo clippy --workspace -- -D warnings 2>&1 || true)
    
    local warnings
    warnings=$(echo "$output" | grep -c "^warning:" || true)
    
    if [ "$warnings" -eq 0 ]; then
        echo -e "${GREEN}✅ Clippy 警告: 0${NC}"
    else
        echo -e "${RED}❌ Clippy 警告: $warnings${NC}"
        echo "$output" | grep "^warning:" | head -20
        CLIPPY_WARNINGS=$warnings
    fi
}

# -----------------------------------------------------------------------------
# TypeScript 类型检查
# -----------------------------------------------------------------------------
check_ts() {
    echo -e "${YELLOW}🔍 检查 TypeScript 类型错误...${NC}"
    
    cd "$PROJECT_ROOT/apps/web"
    
    local output
    output=$(npx tsc --noEmit 2>&1 || true)
    
    local errors
    errors=$(echo "$output" | grep -c "error TS" || true)
    
    if [ "$errors" -eq 0 ]; then
        echo -e "${GREEN}✅ TypeScript 类型错误: 0${NC}"
    else
        echo -e "${RED}❌ TypeScript 类型错误: $errors${NC}"
        echo "$output" | grep "error TS" | head -20
        TS_ERRORS=$errors
    fi
}

# -----------------------------------------------------------------------------
# 主逻辑
# -----------------------------------------------------------------------------
main() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  TOPEMS CI Lint Check${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    
    local mode="${1:---all}"
    
    case "$mode" in
        --rust)
            check_rust
            check_clippy
            ;;
        --ts)
            check_ts
            ;;
        --all|*)
            check_rust
            check_clippy
            check_ts
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  检查结果汇总${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "Rust 编译警告:   $RUST_WARNINGS"
    echo -e "Clippy 警告:     $CLIPPY_WARNINGS"
    echo -e "TS 类型错误:     $TS_ERRORS"
    
    local total=$((RUST_WARNINGS + TS_ERRORS + CLIPPY_WARNINGS))
    
    if [ "$total" -eq 0 ]; then
        echo -e "${GREEN}✅ 全部通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 存在 $total 个问题需要修复${NC}"
        exit 1
    fi
}

main "$@"
