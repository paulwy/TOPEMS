#!/usr/bin/env bash
# shellcheck disable=SC2034
# =============================================================================
# TOPEMS 集成测试运行脚本
# =============================================================================
# 功能：
#   - 支持可选启动服务（--start-services 标志）
#   - 等待服务就绪（轮询 /health 端点，最多等 60s）
#   - 运行各服务的 --ignored 集成测试
#   - 汇总结果，输出测试通过/失败统计
#   - 支持 --service <name> 指定单个服务
#   - 支持 --no-build 跳过编译
#   - 失败时返回非零退出码
#
# 用法：
#   ./scripts/test/run-integration-tests.sh                    # 运行所有服务集成测试
#   ./scripts/test/run-integration-tests.sh --start-services   # 先启动服务再运行测试
#   ./scripts/test/run-integration-tests.sh --service finance  # 只运行 finance 服务测试
#   ./scripts/test/run-integration-tests.sh --no-build         # 跳过编译
#   ./scripts/test/run-integration-tests.sh -h                 # 显示帮助
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TOPEMS_SCRIPT="$PROJECT_ROOT/scripts/topems.sh"
SERVICES_CONF="$PROJECT_ROOT/scripts/services.conf"

# 建议 7：共享 test 输出解析（extract_test_counts / print_test_summary）
# shellcheck source=lib/topems_extract.sh
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/topems_extract.sh"

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

# 默认配置
START_SERVICES=false
NO_BUILD=false
TARGET_SERVICE=""
MAX_WAIT=60
WAIT_INTERVAL=2

# 测试结果统计
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

# 要测试的服务列表（按依赖顺序，unified-core 必须先）
DEFAULT_SERVICES="unified-core finance master-data portal mobile crm wms mes hrm"

# 获取服务的 cargo 包名
get_package_name() {
    local service="$1"
    case "$service" in
        unified-core)   echo "topems-unified-core" ;;
        finance)        echo "topems-finance" ;;
        master-data)    echo "topems-master-data" ;;
        portal)         echo "topems-portal" ;;
        mobile)         echo "topems-mobile" ;;
        crm)            echo "topems-crm" ;;
        wms)            echo "topems-wms" ;;
        mes)            echo "topems-mes" ;;
        hrm)            echo "topems-hrm" ;;
        ai)             echo "topems-ai" ;;
        pm)             echo "topems-pm" ;;
        erp)            echo "topems-erp" ;;
        scm)            echo "topems-scm" ;;
        srm)            echo "topems-srm" ;;
        qms)            echo "topems-qms" ;;
        lims)           echo "topems-lims" ;;
        ehs)            echo "topems-ehs" ;;
        rd)             echo "topems-rd" ;;
        bi)             echo "topems-analytics" ;;
        pdm)            echo "topems-pdm" ;;
        gis)            echo "topems-gis" ;;
        integration)    echo "topems-integration" ;;
        *)              echo "" ;;
    esac
}

# 获取服务的目录路径
get_service_path() {
    local service="$1"
    case "$service" in
        unified-core)   echo "svc/unified-core" ;;
        finance)        echo "svc/finance" ;;
        master-data)    echo "svc/master-data" ;;
        portal)         echo "svc/portal" ;;
        mobile)         echo "svc/mobile" ;;
        crm)            echo "svc/crm" ;;
        wms)            echo "svc/wms" ;;
        mes)            echo "svc/mes" ;;
        hrm)            echo "svc/hrm" ;;
        ai)             echo "svc/ai" ;;
        pm)             echo "svc/pm" ;;
        erp)            echo "svc/erp" ;;
        scm)            echo "svc/scm" ;;
        srm)            echo "svc/srm" ;;
        qms)            echo "svc/qms" ;;
        lims)           echo "svc/lims" ;;
        ehs)            echo "svc/ehs" ;;
        rd)             echo "svc/rd" ;;
        bi)             echo "svc/analytics" ;;
        pdm)            echo "svc/pdm" ;;
        gis)            echo "svc/gis" ;;
        integration)    echo "svc/integration" ;;
        *)              echo "" ;;
    esac
}

# 获取服务的端口
get_service_port() {
    local service="$1"
    case "$service" in
        unified-core)   echo "8000" ;;
        finance)        echo "8011" ;;
        master-data)    echo "8090" ;;
        portal)         echo "8063" ;;
        mobile)         echo "8070" ;;
        crm)            echo "8029" ;;
        wms)            echo "8041" ;;
        mes)            echo "8030" ;;
        hrm)            echo "8020" ;;
        ai)             echo "8013" ;;
        pm)             echo "8023" ;;
        erp)            echo "8010" ;;
        scm)            echo "8040" ;;
        srm)            echo "8042" ;;
        qms)            echo "8050" ;;
        lims)           echo "8051" ;;
        ehs)            echo "8052" ;;
        rd)             echo "8053" ;;
        bi)             echo "8060" ;;
        pdm)            echo "8031" ;;
        gis)            echo "8071" ;;
        integration)    echo "8072" ;;
        *)              echo "" ;;
    esac
}

# 检查服务名是否有效
is_valid_service() {
    local service="$1"
    local pkg
    pkg=$(get_package_name "$service")
    [ -n "$pkg" ]
}

# 显示帮助
show_help() {
    cat << EOF
TOPEMS 集成测试运行脚本

用法: $(basename "$0") [选项]

选项:
  --start-services      在运行测试前启动服务
  --service <name>      只运行指定服务的集成测试
  --no-build            跳过编译步骤
  --max-wait <seconds>  服务就绪最大等待时间（默认: 60秒）
  -h, --help            显示此帮助信息

服务列表:
  unified-core    核心服务 (端口 8000)
  finance         财务服务 (端口 8011)
  master-data     主数据服务 (端口 8090)
  portal          门户服务 (端口 8063)
  mobile          移动服务 (端口 8070)
  crm             客户关系服务 (端口 8029)
  wms             仓储管理服务 (端口 8041)
  mes             生产制造服务 (端口 8030)
  hrm             人力资源服务 (端口 8020)

示例:
  # 运行所有服务的集成测试（假设服务已启动）
  $(basename "$0")

  # 先启动服务，再运行集成测试
  $(basename "$0") --start-services

  # 只运行 finance 服务的集成测试
  $(basename "$0") --service finance

  # 启动服务并运行指定服务的测试
  $(basename "$0") --start-services --service portal

  # 跳过编译，直接运行测试
  $(basename "$0") --no-build
EOF
}

# 解析参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --start-services)
                START_SERVICES=true
                shift
                ;;
            --service)
                TARGET_SERVICE="$2"
                shift 2
                ;;
            --no-build)
                NO_BUILD=true
                shift
                ;;
            --max-wait)
                MAX_WAIT="$2"
                shift 2
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
}

# 检查服务是否就绪（通过 /health 端点）
wait_for_service() {
    local service_name="$1"
    local port
    port=$(get_service_port "$service_name")
    local elapsed=0

    info "等待 $service_name 服务就绪（端口: $port，最多等待 ${MAX_WAIT}s）..."

    while [ $elapsed -lt $MAX_WAIT ]; do
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            success "$service_name 服务就绪"
            return 0
        fi
        sleep $WAIT_INTERVAL
        elapsed=$((elapsed + WAIT_INTERVAL))
    done

    warning "$service_name 服务未在 ${MAX_WAIT} 秒内就绪，测试将被跳过"
    return 1
}

# 启动服务
start_service() {
    local service_name="$1"

    info "启动 $service_name 服务..."

    if [ "$service_name" = "unified-core" ]; then
        # unified-core 在 topems.sh 中叫 iam
        if ! bash "$TOPEMS_SCRIPT" start iam 2>&1; then
            error "启动 $service_name 服务失败"
            return 1
        fi
    else
        if ! bash "$TOPEMS_SCRIPT" start "$service_name" 2>&1; then
            error "启动 $service_name 服务失败"
            return 1
        fi
    fi

    return 0
}

# 检查服务是否有集成测试
has_integration_tests() {
    local service_name="$1"
    local service_path
    service_path=$(get_service_path "$service_name")
    local full_path="$PROJECT_ROOT/$service_path/tests"

    if [ ! -d "$full_path" ]; then
        return 1
    fi

    # 检查是否有测试文件
    local test_files
    test_files=$(find "$full_path" -name "*.rs" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$test_files" -eq 0 ]; then
        return 1
    fi

    return 0
}

# 运行单个服务的集成测试
run_service_tests() {
    local service_name="$1"
    local package_name
    package_name=$(get_package_name "$service_name")
    local service_path
    service_path=$(get_service_path "$service_name")
    local port
    port=$(get_service_port "$service_name")

    echo ""
    info "================================================"
    info "  运行 $service_name 集成测试"
    info "================================================"

    # 检查服务目录是否存在
    if [ ! -d "$PROJECT_ROOT/$service_path" ]; then
        warning "$service_name 服务目录不存在，跳过"
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
        return 0
    fi

    # 检查是否有集成测试
    if ! has_integration_tests "$service_name"; then
        warning "$service_name 没有集成测试文件，跳过"
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
        return 0
    fi

    # 检查服务是否就绪：--start-services 模式下未就绪 = 失败（服务本应由脚本启动）
    if ! curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
        if [ "$START_SERVICES" = true ]; then
            error "$service_name 服务未运行（端口 $port）——--start-services 模式下未就绪视为失败"
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
            return 1
        fi
        warning "$service_name 服务未运行（端口 $port），跳过集成测试"
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
        return 0
    fi

    # 编译测试（如果需要）
    if [ "$NO_BUILD" = false ]; then
        info "编译 $service_name 集成测试..."
        cd "$PROJECT_ROOT"
        if ! cargo test --package "$package_name" --no-run -- --ignored 2>&1; then
            error "$service_name 测试编译失败"
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
            return 1
        fi
    fi

    # 运行集成测试
    info "运行 $service_name 集成测试（--ignored）..."
    cd "$PROJECT_ROOT"

    local test_output
    local test_exit_code=0

    set +e
    test_output=$(cargo test --package "$package_name" -- --ignored 2>&1)
    test_exit_code=$?
    set -e

    # 统计测试结果（共享提取：scripts/test/lib/topems_extract.sh）
    local passed=0
    local failed=0
    local ignored=0
    extract_test_counts "$test_output" passed failed ignored

    # 输出测试结果摘要
    echo ""
    if [ $test_exit_code -eq 0 ]; then
        success "$service_name 集成测试通过"
        detail "  通过: $passed"
        detail "  失败: $failed"
        detail "  忽略: $ignored"
        TOTAL_PASSED=$((TOTAL_PASSED + passed))
    else
        error "$service_name 集成测试失败"
        detail "  通过: $passed"
        detail "  失败: $failed"
        detail "  忽略: $ignored"
        TOTAL_FAILED=$((TOTAL_FAILED + failed))

        # 显示失败的测试
        echo ""
        warning "失败的测试详情："
        echo "$test_output" | grep -E "(FAILED|failures:)" | head -20
    fi

    # 显示完整测试日志的最后部分
    if [ $test_exit_code -ne 0 ]; then
        echo ""
        detail "测试日志末尾："
        echo "$test_output" | tail -30
    fi

    return $test_exit_code
}

# 主函数
main() {
    parse_args "$@"

    echo ""
    info "================================================"
    info "  TOPEMS 集成测试"
    info "================================================"
    echo ""

    # 检查必要文件
    if [ ! -f "$TOPEMS_SCRIPT" ]; then
        error "服务启动脚本不存在: $TOPEMS_SCRIPT"
        exit 1
    fi

    # 检查 cargo
    if ! command -v cargo &> /dev/null; then
        error "cargo 未安装，请先安装 Rust"
        exit 1
    fi

    # 确定要测试的服务列表
    local services_to_test=""
    if [ -n "$TARGET_SERVICE" ]; then
        # 验证服务是否有效
        if ! is_valid_service "$TARGET_SERVICE"; then
            error "未知服务: $TARGET_SERVICE"
            echo "可用服务: $DEFAULT_SERVICES"
            exit 1
        fi
        services_to_test="$TARGET_SERVICE"
    else
        services_to_test="$DEFAULT_SERVICES"
    fi

    # 启动服务（如果需要）
    if [ "$START_SERVICES" = true ]; then
        info "启动服务模式: 将先启动服务再运行测试"
        echo ""

        for service in $services_to_test; do
            if ! start_service "$service"; then
                warning "启动 $service 服务失败，相关测试将被跳过"
            fi
        done

        echo ""
        info "等待所有服务就绪..."
        echo ""

        # 等待所有服务就绪
        for service in $services_to_test; do
            wait_for_service "$service" || true
        done
    fi

    echo ""
    info "开始运行集成测试..."
    echo ""

    # 运行每个服务的集成测试
    local overall_exit_code=0
    for service in $services_to_test; do
        if ! run_service_tests "$service"; then
            overall_exit_code=1
        fi
    done

    # 输出汇总结果
    echo ""
    info "================================================"
    info "  测试结果汇总"
    info "================================================"
    echo ""
    echo -e "  通过的测试数: ${GREEN}$TOTAL_PASSED${NC}"
    echo -e "  失败的测试数: ${RED}$TOTAL_FAILED${NC}"
    echo -e "  跳过的服务数: ${YELLOW}$TOTAL_SKIPPED${NC}"
    echo ""

    if [ $overall_exit_code -eq 0 ]; then
        if [ $TOTAL_PASSED -gt 0 ]; then
            success "所有集成测试通过！"
        else
            error "没有运行任何测试（服务未启动/无测试文件）——零测试视为失败，防 CI 假绿"
            exit 1
        fi
    else
        error "部分集成测试失败，请查看上方日志"
    fi

    echo ""
    exit $overall_exit_code
}

main "$@"
