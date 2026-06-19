# TOPEMS 端口规划文档

## 1. 概述

本文档定义了 TOPEMS 系统的端口分配策略，确保各服务端口配置统一、无冲突。

## 2. 端口分配原则

- **核心服务**: 8000
- **业务服务**: 8010-8019
- **制造服务**: 8030
- **供应链服务**: 8040-8049
- **辅助服务**: 8050-8059
- **扩展服务**: 8060-8069
- **数据库**: 5432 (PostgreSQL), 6379 (Redis)
- **前端**: 3000

## 3. 服务端口映射表

### 3.1 核心服务

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| unified-core | 8000 | `IAM_PORT` | 统一核心服务（IAM, Doc, Flow, File, Communication, Tenant, Billing, Plugin） |

### 3.2 业务服务 (8010-8019)

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| erp | 8010 | `ERP_PORT` | 企业资源计划 |
| hrm | 8011 | `HRM_PORT` | 人力资源管理 |
| crm | 8012 | `CRM_PORT` | 客户关系管理 |

### 3.3 制造服务 (8030)

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| manufacturing | 8030 | `MANUFACTURING_PORT` | 制造服务（MES, PDM） |

### 3.4 供应链服务 (8040-8049)

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| scm | 8040 | `SCM_PORT` | 供应链管理 |
| wms | 8042 | `WMS_PORT` | 仓库管理 |
| pm | 8046 | `PM_PORT` | 项目管理 |

### 3.5 辅助服务 (8050-8059)

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| ai | 8050 | `AI_PORT` | AI 服务 |
| quality-assurance | 8052 | `QUALITY_ASSURANCE_PORT` | 质量管控服务（QMS, LIMS, EHS） |
| gis | 8054 | `GIS_PORT` | 地理信息系统 |
| mobile | 8056 | `MOBILE_PORT` | 移动端服务 |
| rs | 8058 | `RS_PORT` | 研发管理 |

### 3.6 扩展服务 (8060-8069)

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| srm | 8060 | `SRM_PORT` | 供应商关系管理 |
| monitor | 8064 | `MONITOR_PORT` | 监控服务 |
| portal | 8066 | `PORTAL_PORT` | 企业门户 |
| integration | 8068 | `INTEGRATION_PORT` | 集成服务 |

### 3.7 数据分析服务 (8044)

| 服务名 | 端口 | 环境变量 | 说明 |
|--------|------|---------|------|
| analytics | 8044 | `ANALYTICS_PORT` | 数据分析服务（BI, Report） |

## 4. 基础设施端口

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存服务 |
| Ollama | 11434 | AI 模型服务 |
| Nginx | 80/443 | 反向代理 |

## 5. 前端端口

| 应用 | 端口 | 说明 |
|------|------|------|
| Web | 3000 | 前端开发服务器 |

## 6. 端口配置文件

统一端口配置文件：`config/ports.env`

```bash
# 核心服务
IAM_PORT=8000

# 业务服务
ERP_PORT=8010
HRM_PORT=8011
CRM_PORT=8012

# 制造服务
MANUFACTURING_PORT=8030

# 供应链服务
SCM_PORT=8040
WMS_PORT=8042
PM_PORT=8046

# 辅助服务
AI_PORT=8050
QUALITY_ASSURANCE_PORT=8052
GIS_PORT=8054
MOBILE_PORT=8056
RS_PORT=8058

# 扩展服务
SRM_PORT=8060
MONITOR_PORT=8064
PORTAL_PORT=8066
INTEGRATION_PORT=8068

# 数据分析
ANALYTICS_PORT=8044

# 基础设施
POSTGRES_PORT=5432
REDIS_PORT=6379
OLLAMA_PORT=11434

# 前端
WEB_PORT=3000
```

## 7. 服务整合说明

以下服务已整合到统一服务：

| 原服务 | 原端口 | 整合后服务 | 整合后端口 |
|--------|--------|-----------|-----------|
| notification | 8002 | unified-core | 8000 |
| im | 8051 | unified-core | 8000 |
| mail | 8054 | unified-core | 8000 |
| mes | 8030 | manufacturing | 8030 |
| pdm | 8023 | manufacturing | 8030 |
| qms | 8031 | quality-assurance | 8052 |
| lims | 8022 | quality-assurance | 8052 |
| ehs | 8032 | quality-assurance | 8052 |
| bi | 8060 | analytics | 8044 |
| report | 8061 | analytics | 8044 |