#!/bin/bash
# =============================================================================
# TOPEMS 共享服务定义
# =============================================================================
# 此文件包含所有服务的定义，供其他脚本 source 使用
#
# 格式: "service_name:schema_name:service_path"
# - service_name: 服务显示名称
# - schema_name: 数据库 schema 名称
# - service_path: 服务代码路径
#
# 使用 Rust 原生迁移的服务不包含在此列表中: notification, doc, flow, pdm, mobile

# 所有使用 SQL 迁移的服务
declare -a ALL_SERVICES=(
  "iam:iam:svc/iam"
  "pm:pm:svc/pm"
  "portal:portal:svc/portal"
  "integration:integration:svc/integration"
  "erp:erp:svc/erp"
  "hrm:hrm:svc/hrm"
  "crm:crm:svc/crm"
  "rs:rs:svc/rs"
  "lims:lims:svc/lims"
  "mes:mes:svc/mes"
  "qms:qms:svc/qms"
  "ehs:ehs:svc/ehs"
  "scm:scm:svc/scm"
  "srm:srm:svc/srm"
  "wms:wms:svc/wms"
  "file:storage:svc/file"
  "mail:mail:svc/mail"
  "im:im:svc/im"
  "gis:gis:svc/gis"
  "bi:bi:svc/bi"
  "report:report:svc/report"
  "ai:ai:svc/ai"
)

# 所有模块（包括使用 Rust 原生迁移的服务）
declare -a ALL_MODULES=(
  "iam:IAM"
  "pm:PM"
  "notification:通知"
  "portal:门户"
  "flow:Flow"
  "integration:集成"
  "erp:ERP"
  "hrm:HRM"
  "crm:CRM"
  "rs:研发"
  "lims:LIMS"
  "pdm:PDM"
  "doc:文档"
  "mes:MES"
  "qms:QMS"
  "ehs:EHS"
  "scm:SCM"
  "srm:SRM"
  "wms:WMS"
  "storage:文件"
  "mail:邮件"
  "im:IM"
  "gis:GIS"
  "bi:BI"
  "report:报表"
  "ai:AI"
  "mobile:移动"
)

# 服务端口映射
declare -A SERVICE_PORTS=(
  ["iam"]="8000"
  ["pm"]="8001"
  ["notification"]="8002"
  ["portal"]="8003"
  ["flow"]="8004"
  ["integration"]="8005"
  ["erp"]="8010"
  ["hrm"]="8011"
  ["crm"]="8012"
  ["ai"]="8013"
  ["rs"]="8020"
  ["lims"]="8022"
  ["pdm"]="8023"
  ["mes"]="8030"
  ["qms"]="8031"
  ["ehs"]="8032"
  ["scm"]="8040"
  ["srm"]="8041"
  ["wms"]="8042"
  ["gis"]="8050"
  ["file"]="8060"
  ["mail"]="8070"
  ["im"]="8080"
  ["bi"]="8090"
  ["report"]="8100"
  ["doc"]="8110"
  ["mobile"]="8120"
)

# 导出函数：获取服务端口
get_service_port() {
  local service_name="$1"
  echo "${SERVICE_PORTS[$service_name]:-8000}"
}

# 导出函数：检查迁移状态
check_migration_status() {
  local schema_name="$1"
  local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_schema) = LOWER('$schema_name');" 2>/dev/null | tr -d ' ')
  if [ -n "$table_count" ] && [ "$table_count" -gt 0 ]; then
    return 0
  else
    return 1
  fi
}
