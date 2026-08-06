#!/usr/bin/env bash
# =============================================================================
# TOPEMS Lint 检查脚本
# =============================================================================
# 功能：
#   - Rust: cargo clippy --all-targets --all-features -- -D warnings
#   - TypeScript: pnpm lint 或 tsc --noEmit（检查 apps/web 和其他 TypeScript 项目）
#   - Shell: shellcheck（如果可用）或 bash -n
#   - 有 -h/--help
#   - 失败返回非零
#
# 用法：
#   ./scripts/ci/lint-check.sh              # 全量检查
#   ./scripts/ci/lint-check.sh --rust       # 仅检查 Rust
#   ./scripts/ci/lint-check.sh --ts         # 仅检查 TypeScript
#   ./scripts/ci/lint-check.sh --shell      # 仅检查 Shell 脚本
#   ./scripts/ci/lint-check.sh -h           # 显示帮助
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
detail() { echo -e "${CYAN}[DETAIL]${NC} $1"; }

# 检查模式
CHECK_RUST=false
CHECK_TS=false
CHECK_SHELL=false
CHECK_ALL=false

# 结果统计
RUST_CLIPPY_ERRORS=0
TS_ERRORS=0
SHELL_ERRORS=0

# 显示帮助
show_help() {
    cat << EOF
TOPEMS Lint 检查脚本

用法: $(basename "$0") [选项]

选项:
  --rust          仅检查 Rust 代码 (clippy)
  --ts            仅检查 TypeScript 代码 (lint + type check)
  --shell         仅检查 Shell 脚本 (shellcheck 或 bash -n)
  --all           运行所有检查（默认）
  -h, --help      显示此帮助信息

检查项说明:
  Rust:
    - cargo clippy --all-targets --all-features -- -D warnings
    - 将警告视为错误

  TypeScript:
    - 检查 apps/web 等 TypeScript 项目
    - 运行 pnpm lint（如果配置了）
    - 运行 tsc --noEmit 类型检查

  Shell:
    - 检查 scripts/ 目录下的所有 .sh 文件
    - 优先使用 shellcheck
    - 回退到 bash -n 语法检查

示例:
  # 运行所有检查
  $(basename "$0")

  # 只检查 Rust
  $(basename "$0") --rust

  # 只检查 TypeScript
  $(basename "$0") --ts

  # 只检查 Shell 脚本
  $(basename "$0") --shell
EOF
}

# 解析参数
parse_args() {
    if [[ $# -eq 0 ]]; then
        CHECK_ALL=true
        return
    fi

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --rust)
                CHECK_RUST=true
                shift
                ;;
            --ts)
                CHECK_TS=true
                shift
                ;;
            --shell)
                CHECK_SHELL=true
                shift
                ;;
            --all)
                CHECK_ALL=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 如果没有指定任何检查，默认全量检查
    if [ "$CHECK_RUST" = false ] && [ "$CHECK_TS" = false ] && [ "$CHECK_SHELL" = false ] && [ "$CHECK_ALL" = false ]; then
        CHECK_ALL=true
    fi

    if [ "$CHECK_ALL" = true ]; then
        CHECK_RUST=true
        CHECK_TS=true
        CHECK_SHELL=true
    fi
}

# -----------------------------------------------------------------------------
# Rust 检查 (Clippy)
# -----------------------------------------------------------------------------
check_rust() {
    echo ""
    info "================================================"
    info "  Rust Clippy 检查"
    info "================================================"
    echo ""

    if ! command -v cargo &> /dev/null; then
        error "cargo 未安装，跳过 Rust 检查"
        RUST_CLIPPY_ERRORS=1
        return 1
    fi

    cd "$PROJECT_ROOT"

    info "运行 cargo clippy --all-targets --all-features -- -D warnings ..."
    echo ""

    local clippy_output
    local clippy_exit_code=0

    set +e
    clippy_output=$(cargo clippy --all-targets --all-features -- -D warnings 2>&1)
    clippy_exit_code=$?
    set -e

    # 统计错误/警告数量
    local error_count=0
    local warning_count=0

    error_count=$(echo "$clippy_output" | grep -c "^error" || true)
    warning_count=$(echo "$clippy_output" | grep -c "^warning" || true)

    echo ""
    if [ $clippy_exit_code -eq 0 ]; then
        success "Rust Clippy 检查通过"
        detail "  错误: $error_count"
        detail "  警告: $warning_count"
    else
        error "Rust Clippy 检查失败"
        detail "  错误: $error_count"
        detail "  警告: $warning_count"
        RUST_CLIPPY_ERRORS=$((error_count + warning_count))

        echo ""
        warning "错误/警告详情（前 30 行）："
        echo "$clippy_output" | grep -E "(^error|^warning|^  -->)" | head -30
    fi

    return $clippy_exit_code
}

# -----------------------------------------------------------------------------
# TypeScript 检查
# -----------------------------------------------------------------------------
check_typescript() {
    echo ""
    info "================================================"
    info "  TypeScript 检查"
    info "================================================"
    echo ""

    local total_ts_errors=0
    local has_any_ts_project=false

    # 检测包管理器
    local pkg_cmd=""
    if command -v pnpm &> /dev/null; then
        pkg_cmd="pnpm"
    elif command -v yarn &> /dev/null; then
        pkg_cmd="yarn"
    elif command -v npm &> /dev/null; then
        pkg_cmd="npm"
    else
        warning "未找到 pnpm/yarn/npm，跳过 TypeScript 检查"
        return 0
    fi

    # 要检查的 TypeScript 项目目录
    local ts_projects=(
        "apps/web"
        "apps/desktop"
        "apps/mobile"
        "apps/server"
        "tests/e2e"
    )

    for project in "${ts_projects[@]}"; do
        local project_dir="$PROJECT_ROOT/$project"

        # 检查项目是否存在且有 package.json
        if [ ! -f "$project_dir/package.json" ]; then
            continue
        fi

        has_any_ts_project=true
        info "检查 $project ..."

        cd "$project_dir"

        # 1. 先运行 lint（如果配置了）
        local lint_script=""
        lint_script=$(node -e "const p = require('./package.json'); console.log(p.scripts?.lint || '');" 2>/dev/null || true)

        if [ -n "$lint_script" ]; then
            info "  运行 lint ..."
            local lint_output
            local lint_exit_code=0

            set +e
            lint_output=$($pkg_cmd lint 2>&1)
            lint_exit_code=$?
            set -e

            if [ $lint_exit_code -ne 0 ]; then
                local lint_errors
                lint_errors=$(echo "$lint_output" | grep -cE "(error|Error)" || true)
                warning "  $project lint 失败 ($lint_errors 个错误)"
                total_ts_errors=$((total_ts_errors + lint_errors))

                echo "$lint_output" | head -20
            else
                detail "  $project lint 通过"
            fi
        else
            detail "  $project 未配置 lint 脚本，跳过"
        fi

        # 2. 运行 TypeScript 类型检查（如果有 tsconfig.json）
        if [ -f "$project_dir/tsconfig.json" ]; then
            info "  运行 tsc --noEmit ..."
            local tsc_output
            local tsc_exit_code=0

            set +e
            tsc_output=$(npx tsc --noEmit 2>&1)
            tsc_exit_code=$?
            set -e

            if [ $tsc_exit_code -ne 0 ]; then
                local tsc_errors
                tsc_errors=$(echo "$tsc_output" | grep -c "error TS" || true)
                warning "  $project TypeScript 类型检查失败 ($tsc_errors 个错误)"
                total_ts_errors=$((total_ts_errors + tsc_errors))

                echo "$tsc_output" | grep "error TS" | head -10
            else
                detail "  $project TypeScript 类型检查通过"
            fi
        fi

        echo ""
    done

    if [ "$has_any_ts_project" = false ]; then
        warning "未找到 TypeScript 项目"
    fi

    TS_ERRORS=$total_ts_errors

    if [ $total_ts_errors -eq 0 ] && [ "$has_any_ts_project" = true ]; then
        success "TypeScript 检查通过"
        return 0
    elif [ $total_ts_errors -eq 0 ]; then
        return 0
    else
        error "TypeScript 检查失败，共 $total_ts_errors 个错误"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Shell 脚本检查
# -----------------------------------------------------------------------------
check_shell() {
    echo ""
    info "================================================"
    info "  Shell 脚本检查"
    info "================================================"
    echo ""

    local use_shellcheck=false
    if command -v shellcheck &> /dev/null; then
        use_shellcheck=true
        info "使用 shellcheck 进行检查"
    else
        warning "shellcheck 未安装，使用 bash -n 进行语法检查"
    fi

    # 查找所有 shell 脚本
    local shell_scripts=()
    while IFS= read -r -d '' script; do
        shell_scripts+=("$script")
    done < <(find "$PROJECT_ROOT/scripts" -name "*.sh" -type f -print0 2>/dev/null)

    if [ ${#shell_scripts[@]} -eq 0 ]; then
        warning "未找到 Shell 脚本"
        return 0
    fi

    info "找到 ${#shell_scripts[@]} 个 Shell 脚本"
    echo ""

    local total_errors=0
    local checked_count=0

    for script in "${shell_scripts[@]}"; do
        local rel_path="${script#$PROJECT_ROOT/}"

        if [ "$use_shellcheck" = true ]; then
            # 使用 shellcheck
            local sc_output
            local sc_exit_code=0

            set +e
            sc_output=$(shellcheck "$script" 2>&1)
            sc_exit_code=$?
            set -e

            if [ $sc_exit_code -ne 0 ]; then
                local sc_errors
                sc_errors=$(echo "$sc_output" | grep -c "^.*\.sh:" || true)
                warning "  ✗ $rel_path ($sc_errors 个问题)"
                total_errors=$((total_errors + sc_errors))

                # 显示前几个问题
                echo "$sc_output" | head -10
                echo ""
            else
                detail "  ✓ $rel_path"
                checked_count=$((checked_count + 1))
            fi
        else
            # 使用 bash -n
            local bash_exit_code=0

            set +e
            bash -n "$script" 2>&1
            bash_exit_code=$?
            set -e

            if [ $bash_exit_code -ne 0 ]; then
                warning "  ✗ $rel_path (语法错误)"
                total_errors=$((total_errors + 1))

                # 重新运行以显示错误
                bash -n "$script" 2>&1 || true
                echo ""
            else
                detail "  ✓ $rel_path"
                checked_count=$((checked_count + 1))
            fi
        fi
    done

    echo ""
    SHELL_ERRORS=$total_errors

    if [ $total_errors -eq 0 ]; then
        success "Shell 脚本检查通过 ($checked_count/${#shell_scripts[@]} 个脚本)"
        return 0
    else
        error "Shell 脚本检查失败，共 $total_errors 个问题"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# 主函数
# -----------------------------------------------------------------------------
main() {
    parse_args "$@"

    echo ""
    info "================================================"
    info "  TOPEMS Lint 检查"
    info "================================================"

    local overall_exit_code=0

    # Rust 检查
    if [ "$CHECK_RUST" = true ]; then
        if ! check_rust; then
            overall_exit_code=1
        fi
    fi

    # TypeScript 检查
    if [ "$CHECK_TS" = true ]; then
        if ! check_typescript; then
            overall_exit_code=1
        fi
    fi

    # Shell 检查
    if [ "$CHECK_SHELL" = true ]; then
        if ! check_shell; then
            overall_exit_code=1
        fi
    fi

    # 汇总结果
    echo ""
    info "================================================"
    info "  检查结果汇总"
    info "================================================"
    echo ""

    if [ "$CHECK_RUST" = true ]; then
        if [ $RUST_CLIPPY_ERRORS -eq 0 ]; then
            echo -e "  Rust Clippy:   ${GREEN}通过${NC}"
        else
            echo -e "  Rust Clippy:   ${RED}失败 ($RUST_CLIPPY_ERRORS 个问题)${NC}"
        fi
    fi

    if [ "$CHECK_TS" = true ]; then
        if [ $TS_ERRORS -eq 0 ]; then
            echo -e "  TypeScript:    ${GREEN}通过${NC}"
        else
            echo -e "  TypeScript:    ${RED}失败 ($TS_ERRORS 个错误)${NC}"
        fi
    fi

    if [ "$CHECK_SHELL" = true ]; then
        if [ $SHELL_ERRORS -eq 0 ]; then
            echo -e "  Shell 脚本:    ${GREEN}通过${NC}"
        else
            echo -e "  Shell 脚本:    ${RED}失败 ($SHELL_ERRORS 个问题)${NC}"
        fi
    fi

    echo ""
    if [ $overall_exit_code -eq 0 ]; then
        success "所有检查通过！"
    else
        error "部分检查失败，请修复上述问题"
    fi
    echo ""

    exit $overall_exit_code
}

main "$@"
