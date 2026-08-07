#!/usr/bin/env bash
# =============================================================================
# TOPEMS Traefik 网关初始化脚本
#
# 功能：
#   1. 从 /Users/air/TOPEMS/config/services.yaml 读取服务列表（如存在）
#   2. 基于服务列表生成 Traefik 动态路由配置
#   3. 输出到 /Users/air/TOPEMS/docker/traefik/dynamic.yml
#
# 用法：
#   bash init-gateway.sh                # 默认输出到 dynamic.yml
#   bash init-gateway.sh -o custom.yml  # 指定输出文件
#   bash init-gateway.sh -c /path/to/services.yaml  # 指定输入
#
# 依赖：
#   - yq (可选，若不存在则使用内置默认服务列表)
# =============================================================================

set -euo pipefail

# --------------------------------------------
# 路径与默认值
# --------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICES_FILE="${PROJECT_ROOT}/config/services.yaml"
OUTPUT_FILE="${SCRIPT_DIR}/dynamic.yml"
JWT_VERIFY_URL="${JWT_VERIFY_URL:-http://unified-core:8000/api/core/iam/auth/verify}"
RATE_LIMIT_AVERAGE="${RATE_LIMIT_AVERAGE:-100}"
RATE_LIMIT_BURST="${RATE_LIMIT_BURST:-200}"
RETRY_ATTEMPTS="${RETRY_ATTEMPTS:-3}"

# --------------------------------------------
# 颜色输出
# --------------------------------------------
if [[ -t 1 ]]; then
    COLOR_BLUE='\033[0;34m'
    COLOR_GREEN='\033[0;32m'
    COLOR_YELLOW='\033[0;33m'
    COLOR_RED='\033[0;31m'
    COLOR_RESET='\033[0m'
else
    COLOR_BLUE=''; COLOR_GREEN=''; COLOR_YELLOW=''; COLOR_RED=''; COLOR_RESET=''
fi

log_info()  { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET}  $*"; }
log_ok()    { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET}    $*"; }
log_warn()  { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET}  $*"; }
log_error() { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $*"; }

# --------------------------------------------
# 参数解析
# --------------------------------------------
while getopts "c:o:h" opt; do
    case "${opt}" in
        c) SERVICES_FILE="${OPTARG}" ;;
        o) OUTPUT_FILE="${OPTARG}" ;;
        h)
            sed -n '2,20p' "$0"
            exit 0
            ;;
        *)
            log_error "未知参数: ${OPTARG}"
            exit 1
            ;;
    esac
done

# --------------------------------------------
# 内置默认服务列表（与 nginx.conf 保持一致）
# 格式: <route_name>|<path_prefix>|<service_name>|<host>:<port>
# --------------------------------------------
DEFAULT_SERVICES=(
    "core|/api/core|svc-core|unified-core:8000"
    "erp|/api/erp|svc-erp|erp:8010"
    "finance|/api/finance|svc-finance|finance:8011"
    "hrm|/api/hrm|svc-hrm|hrm:8020"
    "pm|/api/pm|svc-pm|pm:8023"
    "crm|/api/crm|svc-crm|crm:8029"
    "mes|/api/mes|svc-mes|mes:8030"
    "pdm|/api/pdm|svc-pdm|pdm:8031"
    "scm|/api/scm|svc-scm|scm:8040"
    "wms|/api/wms|svc-wms|wms:8041"
    "srm|/api/srm|svc-srm|srm:8042"
    "qms|/api/qms|svc-qms|qms:8050"
    "lims|/api/lims|svc-lims|lims:8051"
    "ehs|/api/ehs|svc-ehs|ehs:8052"
    "rd|/api/rd|svc-rd|rd:8053"
    "bi|/api/bi|svc-bi|bi:8060"
    "analytics|/api/bi|svc-analytics|bi:8060"
    "report|/api/report|svc-report|bi:8060"
    "portal|/api/portal|svc-portal|portal:8063"
    "ai|/api/ai|svc-ai|ai:8013"
    "mobile|/api/mobile|svc-mobile|mobile:8070"
    "gis|/api/gis|svc-gis|gis:8071"
    "integration|/api/integration|svc-integration|integration:8072"
)

# --------------------------------------------
# 工具检测
# --------------------------------------------
HAS_YQ=false
if command -v yq >/dev/null 2>&1; then
    HAS_YQ=true
    log_ok "检测到 yq: $(yq --version 2>&1 | head -n1)"
else
    log_warn "未检测到 yq，将使用内置默认服务列表"
fi

# --------------------------------------------
# 加载服务列表
# --------------------------------------------
declare -a SERVICES=()

load_services_from_yaml() {
    local file="$1"
    if [[ ! -f "${file}" ]]; then
        log_warn "服务配置文件不存在: ${file}"
        return 1
    fi

    if [[ "${HAS_YQ}" != "true" ]]; then
        log_warn "无 yq 工具，无法解析 ${file}，回退到默认列表"
        return 1
    fi

    local count
    count=$(yq '.services | length' "${file}" 2>/dev/null || echo 0)
    if [[ "${count}" -eq 0 ]]; then
        log_warn "服务配置为空或解析失败: ${file}"
        return 1
    fi

    log_info "从 ${file} 加载 ${count} 个服务..."

    local i=0
    while [[ ${i} -lt ${count} ]]; do
        local name prefix svc host port
        name=$(yq ".services[${i}].name" "${file}")
        prefix=$(yq ".services[${i}].prefix" "${file}")
        svc=$(yq ".services[${i}].service" "${file}")
        host=$(yq ".services[${i}].host" "${file}")
        port=$(yq ".services[${i}].port" "${file}")

        if [[ -z "${name}" || -z "${prefix}" || -z "${svc}" || -z "${host}" || -z "${port}" ]]; then
            log_warn "服务 #${i} 字段不完整，跳过"
            i=$((i + 1))
            continue
        fi

        SERVICES+=("${name}|${prefix}|${svc}|${host}:${port}")
        log_ok "  + ${name} (${prefix} -> ${svc}|${host}:${port})"
        i=$((i + 1))
    done

    return 0
}

log_info "================ TOPEMS 网关初始化 ================"
log_info "项目根目录: ${PROJECT_ROOT}"
log_info "服务配置文件: ${SERVICES_FILE}"
log_info "输出文件: ${OUTPUT_FILE}"
log_info "JWT 验证 URL: ${JWT_VERIFY_URL}"
log_info "限流: ${RATE_LIMIT_AVERAGE} req/s, burst ${RATE_LIMIT_BURST}"
log_info "重试次数: ${RETRY_ATTEMPTS}"
log_info "==================================================="

if ! load_services_from_yaml "${SERVICES_FILE}"; then
    log_info "使用内置默认服务列表 (${#DEFAULT_SERVICES[@]} 个服务)"
    SERVICES=("${DEFAULT_SERVICES[@]}")
fi

if [[ ${#SERVICES[@]} -eq 0 ]]; then
    log_error "服务列表为空，无法生成配置"
    exit 1
fi

log_ok "共加载 ${#SERVICES[@]} 个服务"

# --------------------------------------------
# 生成动态配置
# --------------------------------------------
log_info "开始生成动态配置..."

TMP_FILE=$(mktemp)
trap 'rm -f "${TMP_FILE}"' EXIT

cat > "${TMP_FILE}" <<EOF
# TOPEMS Traefik 动态配置
# 由 init-gateway.sh 自动生成
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 服务总数: ${#SERVICES[@]}
# 统一中间件链: request-id → cors → rate-limit → jwt-auth → retry

http:
  # ================================================
  # 路由规则
  # ================================================
  routers:
EOF

# 输出每个服务的路由
for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name prefix svc backend <<< "${entry}"
    cat >> "${TMP_FILE}" <<EOF
    router-${name}:
      rule: "PathPrefix(\`${prefix}\`)"
      entryPoints:
        - web
      service: ${svc}
      middlewares:
        - strip-prefix-${name}
        - default-chain
      priority: 100

EOF
done

# 健康检查路由
cat >> "${TMP_FILE}" <<EOF
    # ===== 健康检查路由（无需认证）=====
    router-health:
      rule: "Path(\`/health\`)"
      entryPoints:
        - web
      service: svc-core
      middlewares:
        - cors-headers
      priority: 200

EOF

# 中间件定义
cat >> "${TMP_FILE}" <<EOF
  # ================================================
  # 中间件定义
  # ================================================
  middlewares:
    # ----- 默认中间件链 -----
    default-chain:
      chain:
        middlewares:
          - request-id
          - cors-headers
          - rate-limit
          - jwt-auth
          - retry

    # ----- JWT 认证 -----
    jwt-auth:
      forwardAuth:
        address: "${JWT_VERIFY_URL}"
        authResponseHeaders:
          - X-Auth-User-Id
          - X-Auth-Username
          - X-Auth-Roles
          - X-Auth-Tenant
          - X-Auth-Permissions
          - X-Auth-Token-Exp
        trustForwardHeader: true
        http:
          timeout: "5s"
          followRedirects: false

    # ----- 全局限流 -----
    rate-limit:
      rateLimit:
        average: ${RATE_LIMIT_AVERAGE}
        burst: ${RATE_LIMIT_BURST}
        period: "1s"

    # ----- CORS 头处理 -----
    cors-headers:
      headers:
        accessControlAllowOriginList:
          - "*"
        accessControlAllowMethods:
          - "GET"
          - "POST"
          - "PUT"
          - "DELETE"
          - "PATCH"
          - "OPTIONS"
        accessControlAllowHeaders:
          - "*"
        accessControlExposeHeaders:
          - "*"
        accessControlMaxAge: 100
        addVaryHeader: true
        accessControlAllowCredentials: true

    # ----- Gzip 压缩 -----
    gzip-compress:
      compress:
        minWidth: 1024
        minResponseLength: 1024

    # ----- 重试 -----
    retry:
      retry:
        attempts: ${RETRY_ATTEMPTS}
        initialInterval: "100ms"

    # ----- 请求 ID 注入 -----
    request-id:
      plugin:
        requestid:
          headerName: "X-Request-Id"
          overwrite: true

    # ----- 租户头部转发 -----
    tenant-header:
      headers:
        customRequestHeaders:
          X-Tenant-Id: "default"
        customResponseHeaders:
          X-Tenant-Resolved: "true"

    # ----- 各服务路径前缀剥离 -----
EOF

for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name prefix svc backend <<< "${entry}"
    # 对齐名称到 25 字符宽
    printf '    strip-prefix-%-23s { stripPrefix: { prefixes: ["%s"], forceSlash: false } }\n' \
        "${name}:" "${prefix}" >> "${TMP_FILE}"
done

# 服务定义
cat >> "${TMP_FILE}" <<EOF

  # ================================================
  # 后端服务定义（含健康检查）
  # ================================================
  services:
EOF

for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name prefix svc backend <<< "${entry}"
    cat >> "${TMP_FILE}" <<EOF
    ${svc}:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://${backend}"
        healthCheck:
          path: "/health"
          interval: "10s"
          timeout: "3s"

EOF
done

# --------------------------------------------
# 写入输出文件
# --------------------------------------------
mkdir -p "$(dirname "${OUTPUT_FILE}")"
cp "${TMP_FILE}" "${OUTPUT_FILE}"

log_ok "动态配置已生成: ${OUTPUT_FILE}"
log_info "  - 路由数: ${#SERVICES[@]}"
log_info "  - 中间件: 7 个全局 + ${#SERVICES[@]} 个 strip-prefix"
log_info "  - 服务定义: ${#SERVICES[@]} 个"

# --------------------------------------------
# YAML 语法校验（如有 yq）
# --------------------------------------------
if [[ "${HAS_YQ}" == "true" ]]; then
    log_info "校验 YAML 语法..."
    if yq '.' "${OUTPUT_FILE}" >/dev/null 2>&1; then
        log_ok "YAML 语法校验通过"
    else
        log_error "YAML 语法校验失败！"
        yq '.' "${OUTPUT_FILE}" 2>&1 | head -n 20
        exit 1
    fi
fi

log_ok "================ 初始化完成 ================"
log_info "提示：可通过 docker compose restart traefik 重载配置"
log_info "      或访问 http://localhost:8080 查看 Dashboard"
