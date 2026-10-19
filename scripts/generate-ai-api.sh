#!/bin/bash
# TOPEMS AI 模块 OpenAPI 代码生成脚本
#
# 用法: ./scripts/generate-ai-api.sh [options]
#
# 功能:
#   - 从 OpenAPI 规范生成前端 TypeScript 类型
#   - 生成 API 客户端代码
#   - 验证 OpenAPI 规范
#   - 生成 API 文档（HTML）
#
# 选项:
#   --types        仅生成 TypeScript 类型
#   --client       仅生成 API 客户端代码
#   --docs         生成 API 文档（HTML）
#   --validate     验证 OpenAPI 规范
#   --all          生成所有内容（默认）
#   --help         显示帮助信息

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 配置
OPENAPI_SPEC="docs/api/ai-business-intelligence-openapi.yaml"
OUTPUT_DIR="apps/web/src/api/ai/generated"
TYPES_OUTPUT="${OUTPUT_DIR}/types.ts"
CLIENT_OUTPUT="${OUTPUT_DIR}/client.ts"
DOCS_OUTPUT="docs/api/ai-business-intelligence-docs.html"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 显示帮助
show_help() {
    cat << EOF
TOPEMS AI 模块 OpenAPI 代码生成脚本

用法: ./scripts/generate-ai-api.sh [options]

选项:
  --types        仅生成 TypeScript 类型
  --client       仅生成 API 客户端代码
  --docs         生成 API 文档（HTML）
  --validate     验证 OpenAPI 规范
  --all          生成所有内容（默认）
  --help         显示帮助信息

示例:
  ./scripts/generate-ai-api.sh --all
  ./scripts/generate-ai-api.sh --types
  ./scripts/generate-ai-api.sh --validate
EOF
}

# 检查 OpenAPI 规范文件
check_spec() {
    if [ ! -f "$OPENAPI_SPEC" ]; then
        log_error "OpenAPI 规范文件不存在: $OPENAPI_SPEC"
        exit 1
    fi
    log_success "OpenAPI 规范文件存在: $OPENAPI_SPEC"
}

# 验证 OpenAPI 规范
validate_spec() {
    log_info "验证 OpenAPI 规范..."

    # 检查是否安装了 openapi-cli 或 swagger-cli
    if command -v openapi &> /dev/null; then
        openapi validate "$OPENAPI_SPEC"
        log_success "OpenAPI 规范验证通过（openapi-cli）"
    elif command -v swagger-cli &> /dev/null; then
        swagger-cli validate "$OPENAPI_SPEC"
        log_success "OpenAPI 规范验证通过（swagger-cli）"
    else
        log_warning "未找到 openapi-cli 或 swagger-cli，使用基本验证"

        # 基本验证：检查 YAML 语法和必要字段
        if command -v python3 &> /dev/null; then
            python3 -c "
import yaml
import sys

try:
    with open('$OPENAPI_SPEC', 'r') as f:
        spec = yaml.safe_load(f)

    # 检查必要字段
    required_fields = ['openapi', 'info', 'paths', 'components']
    for field in required_fields:
        if field not in spec:
            print(f'错误: 缺少必要字段: {field}')
            sys.exit(1)

    # 检查 info 字段
    info_fields = ['title', 'version', 'description']
    for field in info_fields:
        if field not in spec['info']:
            print(f'警告: info 缺少字段: {field}')

    # 统计
    path_count = len(spec.get('paths', {}))
    schema_count = len(spec.get('components', {}).get('schemas', {}))
    print(f'路径数量: {path_count}')
    print(f'Schema 数量: {schema_count}')
    print('基本验证通过')

except yaml.YAMLError as e:
    print(f'YAML 语法错误: {e}')
    sys.exit(1)
except Exception as e:
    print(f'验证失败: {e}')
    sys.exit(1)
"
            log_success "OpenAPI 规范基本验证通过"
        else
            log_warning "未找到 python3，跳过验证"
        fi
    fi
}

# 生成 TypeScript 类型
generate_types() {
    log_info "生成 TypeScript 类型..."

    # 创建输出目录
    mkdir -p "$OUTPUT_DIR"

    # 检查是否安装了 openapi-typescript
    if command -v openapi-typescript &> /dev/null; then
        openapi-typescript "$OPENAPI_SPEC" --output "$TYPES_OUTPUT"
        log_success "TypeScript 类型生成成功: $TYPES_OUTPUT"
    else
        log_warning "未找到 openapi-typescript，使用基本类型生成"

        # 基本类型生成：从 OpenAPI 规范提取 schemas
        if command -v python3 &> /dev/null; then
            python3 << 'PYTHON_SCRIPT'
import yaml
import os

spec_path = "docs/api/ai-business-intelligence-openapi.yaml"
output_path = "apps/web/src/api/ai/generated/types.ts"

with open(spec_path, 'r') as f:
    spec = yaml.safe_load(f)

schemas = spec.get('components', {}).get('schemas', {})

lines = [
    "/**",
    " * AI 业务智能模块 - 自动生成的 TypeScript 类型",
    " *",
    " * 此文件由 scripts/generate-ai-api.sh 自动生成",
    " * 请勿手动修改",
    " */",
    "",
]

# 生成枚举类型
for name, schema in schemas.items():
    if schema.get('type') == 'string' and 'enum' in schema:
        enum_values = schema['enum']
        # 多行格式与 openapi-typescript 输出一致（仓内 generated/types.ts 即此风格），
        # 保证生成结果可复现、不产生格式噪音 diff
        lines.append(f"/** {schema.get('description', name)} */")
        lines.append(f"export type {name} =")
        lines.append("\n  | ".join(f"'{v}'" for v in enum_values) + ";")
        lines.append("")

# 生成接口类型
for name, schema in schemas.items():
    if schema.get('type') == 'object' or 'properties' in schema:
        lines.append(f"/** {schema.get('description', name)} */")
        lines.append(f"export interface {name} {{")

        properties = schema.get('properties', {})
        required = schema.get('required', [])

        for prop_name, prop_schema in properties.items():
            is_required = prop_name in required
            optional = '' if is_required else '?'

            # 确定类型
            prop_type = 'unknown'
            if '$ref' in prop_schema:
                ref_name = prop_schema['$ref'].split('/')[-1]
                prop_type = ref_name
            elif prop_schema.get('type') == 'string':
                if 'enum' in prop_schema:
                    prop_type = ' | '.join(f"'{v}'" for v in prop_schema['enum'])
                elif prop_schema.get('format') == 'date-time':
                    prop_type = 'string'
                elif prop_schema.get('format') == 'uuid':
                    prop_type = 'string'
                else:
                    prop_type = 'string'
            elif prop_schema.get('type') == 'integer':
                prop_type = 'number'
            elif prop_schema.get('type') == 'number':
                prop_type = 'number'
            elif prop_schema.get('type') == 'boolean':
                prop_type = 'boolean'
            elif prop_schema.get('type') == 'array':
                # 递归解析 items（支持多维数组，如 by_user_top10: string[][]）
                def resolve_item_type(item_schema):
                    if '$ref' in item_schema:
                        return item_schema['$ref'].split('/')[-1]
                    if item_schema.get('type') == 'array':
                        return resolve_item_type(item_schema.get('items', {})) + '[]'
                    if item_schema.get('type') == 'string' and 'enum' in item_schema:
                        return ' | '.join(f"'{v}'" for v in item_schema['enum'])
                    return item_schema.get('type', 'unknown')
                item_type = resolve_item_type(prop_schema.get('items', {}))
                prop_type = f"{item_type}[]"
            elif prop_schema.get('type') == 'object':
                if prop_schema.get('additionalProperties'):
                    prop_type = 'Record<string, unknown>'
                else:
                    prop_type = 'Record<string, unknown>'

            # 添加描述
            if 'description' in prop_schema:
                lines.append(f"  /** {prop_schema['description']} */")

            lines.append(f"  {prop_name}{optional}: {prop_type};")

        lines.append("}")
        lines.append("")

# 写入文件
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w') as f:
    f.write('\n'.join(lines))

print(f"生成了 {len(schemas)} 个类型定义")
PYTHON_SCRIPT
            log_success "TypeScript 类型基本生成成功: $TYPES_OUTPUT"
        else
            log_error "未找到 python3，无法生成类型"
            exit 1
        fi
    fi

    # 生成后统一 prettier 格式化（仓内 generated/*.ts 为 prettier 折行风格，
    # 不加格式化每次生成都会产生全文件格式噪音 diff；优先用仓库内置 prettier，
    # 不依赖全局安装）
    if [ -x "$PROJECT_ROOT/apps/web/node_modules/.bin/prettier" ]; then
        "$PROJECT_ROOT/apps/web/node_modules/.bin/prettier" --write "$TYPES_OUTPUT" >/dev/null 2>&1 \
            && log_info "prettier 格式化: $TYPES_OUTPUT"
    fi
}

# 生成 API 客户端代码
generate_client() {
    log_info "生成 API 客户端代码..."

    # 创建输出目录
    mkdir -p "$OUTPUT_DIR"

    # 检查是否安装了 openapi-typescript-codegen
    if command -v openapi-typescript-codegen &> /dev/null; then
        openapi-typescript-codegen --input "$OPENAPI_SPEC" --output "$OUTPUT_DIR" --client axios
        log_success "API 客户端生成成功: $OUTPUT_DIR"
    else
        log_warning "未找到 openapi-typescript-codegen，使用基本客户端生成"

        # 基本客户端生成
        cat > "$CLIENT_OUTPUT" << 'EOF'
/**
 * AI 业务智能模块 - API 客户端
 *
 * 此文件由 scripts/generate-ai-api.sh 自动生成
 * 请勿手动修改
 */

import { apiClient } from '../../client';
import type { ApiResponse } from '../../client';
import type * as Types from './types';

// ============================================================================
// 业务 Copilot API
// ============================================================================

const copilotApi = {
  /** 创建会话 */
  createSession: (data: Types.CreateSessionRequest): Promise<ApiResponse<Types.CopilotSession>> =>
    apiClient.ai.post('/dsh/copilot/sessions', data),

  /** 发送消息 */
  sendMessage: (
    sessionId: string,
    data: Types.CopilotRequest
  ): Promise<ApiResponse<Types.CopilotResponse>> =>
    apiClient.ai.post(`/dsh/copilot/sessions/${sessionId}/messages`, data),

  /** 识别意图 */
  recognizeIntent: (data: {
    text: string;
    module?: Types.BusinessModuleType;
  }): Promise<ApiResponse<Types.IntentRecognitionResult>> =>
    apiClient.ai.post('/dsh/copilot/intent/recognize', data),

  /** 获取所有业务模块配置 */
  getAllModuleConfigs: (): Promise<ApiResponse<Types.BusinessModuleConfig[]>> =>
    apiClient.ai.get('/dsh/copilot/modules'),

  /** 获取业务模块配置 */
  getModuleConfig: (
    module: Types.BusinessModuleType
  ): Promise<ApiResponse<Types.BusinessModuleConfig>> =>
    apiClient.ai.get(`/dsh/copilot/modules/${module}`),
};

// ============================================================================
// 智能表单 API
// ============================================================================

const formsApi = {
  /** 获取所有表单模板 */
  getAllForms: (category?: string): Promise<ApiResponse<Types.FormDefinition[]>> =>
    apiClient.ai.get('/dsh/smart-forms/templates', {
      params: category ? { category } : undefined,
    }),

  /** 验证表单数据 */
  validateForm: (
    _formId: string,
    values: Record<string, unknown>
  ): Promise<ApiResponse<Types.FormValidationResult>> =>
    apiClient.ai.post('/dsh/smart-forms/validate', { values }),

  /** 自动填充表单 */
  autoFillForm: (
    _formId: string,
    context: Record<string, unknown>
  ): Promise<ApiResponse<Types.FormData>> =>
    apiClient.ai.post('/dsh/smart-forms/ai-fill', { context }),
};

// ============================================================================
// 文档智能 API
// ============================================================================

const documentsApi = {
  /** 获取文档列表 */
  listDocuments: (params?: {
    page?: number;
    page_size?: number;
    document_type?: Types.DocumentType;
    status?: Types.DocumentProcessingStatus;
  }): Promise<
    ApiResponse<{ items: Types.DocumentInfo[]; total: number; page: number; page_size: number }>
  > => apiClient.ai.get('/documents', { params }),

  /** 上传文档 */
  uploadDocument: (
    file: File,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<Types.DocumentInfo>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) formData.append('metadata', JSON.stringify(metadata));
    return apiClient.ai.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** 获取文档信息 */
  getDocument: (documentId: string): Promise<ApiResponse<Types.DocumentInfo>> =>
    apiClient.ai.get(`/documents/${documentId}`),

  /** 删除文档 */
  deleteDocument: (documentId: string): Promise<ApiResponse<void>> =>
    apiClient.ai.delete(`/documents/${documentId}`),

  /** 生成文档摘要 */
  generateDocumentSummary: (
    documentId: string,
    summaryType?: Types.SummaryType
  ): Promise<ApiResponse<Types.DocumentSummary>> =>
    apiClient.ai.post(`/documents/${documentId}/summarize`, { summary_type: summaryType }),

  /** 下载文档 */
  downloadDocument: (documentId: string): Promise<Blob> =>
    apiClient.ai
      .get(`/documents/${documentId}/download`, { responseType: 'blob' })
      .then((r) => r.data as Blob),
};

// ============================================================================
// 治理仪表盘 API
// ============================================================================

export const governanceApi = {
  /** 获取治理仪表盘数据 */
  getDashboard: (
    timeRange?: Types.TimeRange
  ): Promise<ApiResponse<Types.GovernanceDashboardData>> =>
    apiClient.ai.get('/dsh/governance/dashboard', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取治理评分 */
  getScore: (
    timeRange?: Types.TimeRange
  ): Promise<
    ApiResponse<{
      overall_score: number;
      governance_level: Types.GovernanceLevel;
      breakdown: {
        security: number;
        compliance: number;
        cost: number;
        performance: number;
        reliability: number;
      };
    }>
  > =>
    apiClient.ai.get('/dsh/governance/score', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取风险评估 */
  getRiskAssessment: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.RiskAssessment>> =>
    apiClient.ai.get('/dsh/governance/risk', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取合规状态 */
  getComplianceStatus: (framework?: string): Promise<ApiResponse<Types.ComplianceStatus>> =>
    apiClient.ai.get('/dsh/governance/compliance', {
      params: framework ? { framework } : undefined,
    }),

  /** 获取成本分析 */
  getCostAnalysis: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.CostAnalysis>> =>
    apiClient.ai.get('/dsh/governance/cost', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取性能指标 */
  getPerformanceMetrics: (
    timeRange?: Types.TimeRange
  ): Promise<ApiResponse<Types.PerformanceMetrics>> =>
    apiClient.ai.get('/dsh/governance/performance', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取安全事件 */
  getSecurityEvents: (params?: {
    severity?: Types.RiskLevel;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ items: Types.SecurityEventSummary[]; total: number }>> =>
    apiClient.ai.get('/dsh/governance/security-events', { params }),

  /** 获取审计日志摘要 */
  getAuditSummary: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.AuditSummary>> =>
    apiClient.ai.get('/dsh/governance/audit', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取趋势数据 */
  getTrends: (
    timeRange?: Types.TimeRange,
    metrics?: string
  ): Promise<ApiResponse<Types.TrendDataPoint[]>> =>
    apiClient.ai.get('/dsh/governance/metrics', { params: { time_range: timeRange, metrics } }),

  /** 获取建议和改进项 */
  getRecommendations: (
    priority?: Types.RecommendationPriority
  ): Promise<ApiResponse<Types.Recommendation[]>> =>
    apiClient.ai.get('/dsh/governance/recommendations', {
      params: priority ? { priority } : undefined,
    }),

  /** 刷新仪表盘缓存 */
  refreshCache: (): Promise<ApiResponse<void>> => apiClient.ai.delete('/dsh/governance/cache'),

  /** 导出治理报告 */
  exportReport: (format: 'pdf' | 'excel' | 'json', timeRange?: Types.TimeRange): Promise<Blob> =>
    apiClient.ai
      .get('/dsh/governance/export', {
        params: { format, time_range: timeRange },
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),
};

// ============================================================================
// 统一导出
// ============================================================================

const aiBusinessApi = {
  ...copilotApi,
  ...formsApi,
  ...documentsApi,
  ...governanceApi,
};

export default aiBusinessApi;

EOF
        log_success "API 客户端基本生成成功: $CLIENT_OUTPUT"
    fi

    # 与 types.ts 相同：prettier 格式化保证可复现（见 generate_types 注释）
    if [ -x "$PROJECT_ROOT/apps/web/node_modules/.bin/prettier" ]; then
        "$PROJECT_ROOT/apps/web/node_modules/.bin/prettier" --write "$CLIENT_OUTPUT" >/dev/null 2>&1 \
            && log_info "prettier 格式化: $CLIENT_OUTPUT"
    fi
}

# 生成 API 文档（HTML）
generate_docs() {
    log_info "生成 API 文档（HTML）..."

    # 检查是否安装了 redoc-cli 或 swagger-ui
    if command -v redoc-cli &> /dev/null; then
        redoc-cli build "$OPENAPI_SPEC" --output "$DOCS_OUTPUT"
        log_success "API 文档生成成功: $DOCS_OUTPUT"
    elif command -v swagger-ui &> /dev/null; then
        swagger-ui generate "$OPENAPI_SPEC" --output "$DOCS_OUTPUT"
        log_success "API 文档生成成功: $DOCS_OUTPUT"
    else
        log_warning "未找到 redoc-cli 或 swagger-ui，跳过文档生成"
        log_info "安装命令: npm install -g redoc-cli"
    fi
}

# 主函数
main() {
    local command="${1:---all}"

    case $command in
        --types)
            check_spec
            generate_types
            ;;
        --client)
            check_spec
            generate_client
            ;;
        --docs)
            check_spec
            generate_docs
            ;;
        --validate)
            check_spec
            validate_spec
            ;;
        --all)
            check_spec
            validate_spec
            generate_types
            generate_client
            generate_docs
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "未知选项: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac

    log_success "操作完成！"
}

main "$@"
