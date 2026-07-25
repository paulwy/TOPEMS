# TOPEMS Windows 部署脚本配置
# PowerShell 版本
# 端口与 config/ports.env、config/services.yaml 保持严格一致

# ================================================
# 核心服务 (8000-8009)
# unified-core 整合了 iam/doc/flow/file/mail/im/notification/monitor 模块
# ================================================
$script:UNIFIED_CORE_PORT = 8000
$script:GATEWAY_PORT = 8080

# ================================================
# 经营管理服务 (8010-8019)
# ================================================
$script:ERP_PORT = 8010
$script:FINANCE_PORT = 8011
$script:AI_PORT = 8013

# ================================================
# 协同办公服务 (8020-8029)
# ================================================
$script:HRM_PORT = 8020
$script:PM_PORT = 8023
$script:CRM_PORT = 8029

# ================================================
# 生产制造服务 (8030-8039)
# ================================================
$script:MES_PORT = 8030
$script:PDM_PORT = 8031

# ================================================
# 供应链服务 (8040-8049)
# ================================================
$script:SCM_PORT = 8040
$script:WMS_PORT = 8041
$script:SRM_PORT = 8042

# ================================================
# 质量/研发服务 (8050-8059)
# ================================================
$script:QMS_PORT = 8050
$script:LIMS_PORT = 8051
$script:EHS_PORT = 8052
$script:RD_PORT = 8053

# ================================================
# 数据分析/门户服务 (8060-8069)
# ================================================
$script:ANALYTICS_PORT = 8060
$script:PORTAL_PORT = 8063

# ================================================
# 基础设施服务 (8070-8079)
# ================================================
$script:MOBILE_PORT = 8070
$script:GIS_PORT = 8071
$script:INTEGRATION_PORT = 8072

# ================================================
# 主数据服务 (8090)
# ================================================
$script:MASTER_DATA_PORT = 8090

# ================================================
# 数据库端口（内部使用）
# ================================================
$script:POSTGRES_PORT = 5432
$script:REDIS_PORT = 6379
$script:OLLAMA_PORT = 11434

# ================================================
# 前端端口
# ================================================
$script:WEB_PORT = 3000

# ================================================
# 环境变量配置
# ================================================
$env:DATABASE_URL = "postgres://topems:topems_secret@localhost:5432/topems"
$env:REDIS_URL = "redis://:topems_redis_secret@localhost:6379"
$env:JWT_SECRET = "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256"
$env:REFRESH_SECRET = "topems-refresh-secret-key-must-be-at-least-32-characters-long"
$env:CORS_ORIGINS = "http://localhost:3000,http://localhost:8000"
$env:OLLAMA_BASE_URL = "http://localhost:11434/v1"
$env:OLLAMA_URL = "http://localhost:11434"
$env:OLLAMA_MODEL = "qwen2.5:7b-instruct"
$env:EMBEDDING_MODEL = "nomic-embed-text"
$env:RUST_LOG = "info"
