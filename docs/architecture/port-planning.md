# TOPEMS 服务端口统一规划方案 (v4.0)

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v4.0 |
| 创建日期 | 2026-06-12 |
| 最后更新 | 2026-06-12 |
| 状态 | 已批准 |
| 适用范围 | TOPEMS 全平台服务（本地/Docker/SaaS） |

---

## 1. 规划背景

### 1.1 多部署模式需求

TOPEMS 需要支持三种部署模式：

| 部署模式 | 场景 | 要求 |
|---------|------|------|
| 本地部署 | 开发环境、离线环境、资源受限 | 直接端口访问，资源可控 |
| Docker 部署 | 测试环境、生产环境 | 容器隔离，灵活扩展 |
| SaaS 部署 | 云端服务、多租户 | API网关统一入口，安全隔离 |

### 1.2 设计原则

1. **统一性**: 三种模式使用相同的内部端口编号
2. **连续性**: 同模块端口连续，便于记忆和管理
3. **安全性**: 敏感服务仅对内暴露（SaaS模式）
4. **扩展性**: 每个模块预留 50% 扩展空间
5. **兼容性**: 向后兼容现有配置

---

## 2. 端口规划方案

### 2.1 端口分组规则

| 端口范围 | 模块类型 | 服务数量 | 预留数量 | 本地 | Docker | SaaS |
|---------|---------|---------|---------|-----|--------|------|
| **8000-8009** | 核心服务 | 6 | 4 | ✅ | ✅ | ✅（内网） |
| **8010-8019** | ERP/财务 | 3 | 7 | ✅ | ✅ | ✅（内网） |
| **8020-8029** | PLM/研发 | 4 | 5 | ✅ | ✅ | ✅（内网） |
| **8030-8039** | MES/生产 | 3 | 7 | ✅ | ✅ | ✅（内网） |
| **8040-8049** | SCM/供应链 | 3 | 7 | ✅ | ✅ | ✅（内网） |
| **8050-8059** | 基础设施 | 4 | 6 | ✅ | ✅ | ✅（内网） |
| **8060-8069** | 数据分析 | 3 | 7 | ✅ | ✅ | ✅（内网） |
| **8070-8079** | 扩展服务 | 2 | 8 | ✅ | ✅ | ✅（内网） |
| **8080** | API网关 | 1 | - | ❌ | ✅ | ✅（公网） |
| **3000** | 前端 | 1 | - | ✅ | ✅ | ✅（公网） |

### 2.2 服务端口映射表

#### 2.2.1 核心服务 (8000-8009)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| iam | 8000 | `IAM_PORT` | 身份认证服务 | 已实现 |
| pm | 8001 | `PM_PORT` | 项目管理服务 | 已实现 |
| notification | 8002 | `NOTIFICATION_PORT` | 通知服务 | 已实现 |
| portal | 8003 | `PORTAL_PORT` | 统一门户 | 已实现 |
| flow | 8004 | `FLOW_PORT` | 工作流引擎 | 已实现 |
| integration | 8005 | `INTEGRATION_PORT` | 集成服务 | 已实现 |
| gateway | 8006 | `GATEWAY_PORT` | API网关（本地禁用） | 预留 |
| config | 8007 | `CONFIG_PORT` | 配置中心 | 预留 |
| discovery | 8008 | `DISCOVERY_PORT` | 服务发现 | 预留 |
| - | 8009 | - | 预留 | 预留 |

#### 2.2.2 ERP/财务服务 (8010-8019)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| erp | 8010 | `ERP_PORT` | 企业资源计划 | 已实现 |
| hrm | 8011 | `HRM_PORT` | 人力资源管理 | 已实现 |
| crm | 8012 | `CRM_PORT` | 客户关系管理 | 已实现 |
| finance | 8013 | `FINANCE_PORT` | 财务管理 | 预留 |
| payroll | 8014 | `PAYROLL_PORT` | 薪资管理 | 预留 |
| - | 8015 | - | 预留 | 预留 |
| - | 8016 | - | 预留 | 预留 |
| - | 8017 | - | 预留 | 预留 |
| - | 8018 | - | 预留 | 预留 |
| - | 8019 | - | 预留 | 预留 |

#### 2.2.3 PLM/研发服务 (8020-8029)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| rs | 8020 | `RS_PORT` | 研发管理 | 已实现 |
| - | 8021 | - | 避开（被占用） | 禁用 |
| lims | 8022 | `LIMS_PORT` | 实验室管理 | 已实现 |
| pdm | 8023 | `PDM_PORT` | 产品数据管理 | 已实现 |
| doc | 8024 | `DOC_PORT` | 文档管理 | 已实现 |
| - | 8025 | - | 预留 | 预留 |
| - | 8026 | - | 预留 | 预留 |
| - | 8027 | - | 预留 | 预留 |
| - | 8028 | - | 预留 | 预留 |
| - | 8029 | - | 预留 | 预留 |

#### 2.2.4 MES/生产服务 (8030-8039)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| mes | 8030 | `MES_PORT` | 制造执行系统 | 已实现 |
| qms | 8031 | `QMS_PORT` | 质量管理 | 已实现 |
| ehs | 8032 | `EHS_PORT` | 环境健康安全 | 已实现 |
| - | 8033 | - | 预留 | 预留 |
| - | 8034 | - | 预留 | 预留 |
| - | 8035 | - | 预留 | 预留 |
| - | 8036 | - | 预留 | 预留 |
| - | 8037 | - | 预留 | 预留 |
| - | 8038 | - | 预留 | 预留 |
| - | 8039 | - | 预留 | 预留 |

#### 2.2.5 SCM/供应链服务 (8040-8049)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| scm | 8040 | `SCM_PORT` | 供应链管理 | 已实现 |
| srm | 8041 | `SRM_PORT` | 供应商管理 | 已实现 |
| wms | 8042 | `WMS_PORT` | 仓储管理 | 已实现 |
| - | 8043 | - | 预留 | 预留 |
| - | 8044 | - | 预留 | 预留 |
| - | 8045 | - | 预留 | 预留 |
| - | 8046 | - | 预留 | 预留 |
| - | 8047 | - | 预留 | 预留 |
| - | 8048 | - | 预留 | 预留 |
| - | 8049 | - | 预留 | 预留 |

#### 2.2.6 基础设施服务 (8050-8059)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| file | 8050 | `FILE_PORT` | 文件存储服务 | 已实现 |
| mail | 8051 | `MAIL_PORT` | 邮件服务 | 已实现 |
| im | 8052 | `IM_PORT` | 即时通讯 | 已实现 |
| gis | 8053 | `GIS_PORT` | 地理信息服务 | 已实现 |
| - | 8054 | - | 预留 | 预留 |
| - | 8055 | - | 预留 | 预留 |
| - | 8056 | - | 预留 | 预留 |
| - | 8057 | - | 预留 | 预留 |
| - | 8058 | - | 预留 | 预留 |
| - | 8059 | - | 预留 | 预留 |

#### 2.2.7 数据分析服务 (8060-8069)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| bi | 8060 | `BI_PORT` | 商业智能 | 已实现 |
| report | 8061 | `REPORT_PORT` | 报表服务 | 已实现 |
| ai | 8062 | `AI_PORT` | 人工智能服务 | 已实现 |
| - | 8063 | - | 预留 | 预留 |
| - | 8064 | - | 预留 | 预留 |
| - | 8065 | - | 预留 | 预留 |
| - | 8066 | - | 预留 | 预留 |
| - | 8067 | - | 预留 | 预留 |
| - | 8068 | - | 预留 | 预留 |
| - | 8069 | - | 预留 | 预留 |

#### 2.2.8 扩展服务 (8070-8079)

| 服务名 | 端口 | 环境变量 | 说明 | 状态 |
|--------|------|---------|------|------|
| mobile | 8070 | `MOBILE_PORT` | 移动服务 | 已实现 |
| iot | 8071 | `IOT_PORT` | 物联网服务 | 预留 |
| workflow-auto | 8072 | - | 工作流自动化 | 预留 |
| ml | 8073 | - | 机器学习服务 | 预留 |
| - | 8074 | - | 预留 | 预留 |
| - | 8075 | - | 预留 | 预留 |
| - | 8076 | - | 预留 | 预留 |
| - | 8077 | - | 预留 | 预留 |
| - | 8078 | - | 预留 | 预留 |
| - | 8079 | - | 预留 | 预留 |

### 2.3 特殊端口

| 服务 | 端口 | 环境变量 | 说明 | 本地 | Docker | SaaS |
|------|------|---------|------|-----|--------|------|
| API网关 | 8080 | `GATEWAY_PORT` | 统一入口 | ❌ | ✅ | ✅（公网） |
| 前端 | 3000 | `WEB_PORT` | Web应用 | ✅ | ✅ | ✅（公网） |
| PostgreSQL | 5432 | `POSTGRES_PORT` | 数据库 | ✅ | ✅ | 内网 |
| Redis | 6379 | `REDIS_PORT` | 缓存 | ✅ | ✅ | 内网 |
| Ollama | 11434 | `OLLAMA_PORT` | AI模型 | ✅ | ✅ | 内网 |

### 2.4 API网关说明

API网关是系统的统一入口，负责接收所有外部请求并路由到对应的后端服务。

#### 2.4.1 网关职责

| 功能 | 说明 |
|------|------|
| 统一入口 | 所有外部请求通过网关进入 |
| 请求路由 | 根据URL路径转发到对应服务 |
| 认证校验 | 统一验证JWT token |
| 限流熔断 | 保护后端服务，防止过载 |
| 日志监控 | 统一记录请求日志 |
| 协议转换 | HTTP/HTTPS/WebSocket |

#### 2.4.2 部署模式差异

| 模式 | 网关状态 | 说明 |
|------|---------|------|
| 本地部署 | ❌ 禁用 | 开发环境直接访问服务端口 |
| Docker部署 | ✅ 启用 | 通过网关访问内部服务 |
| SaaS部署 | ✅ 启用 | 多租户环境的统一入口 |

#### 2.4.3 路由示例

```yaml
# API网关路由配置
routes:
  - path: /v1/iam/*
    target: http://iam:8000
    timeout: 30s
  
  - path: /v1/erp/*
    target: http://erp:8010
    timeout: 60s
  
  - path: /v1/plm/*
    target: http://rs:8020
    timeout: 60s
  
  - path: /v1/mes/*
    target: http://mes:8030
    timeout: 60s
  
  - path: /v1/ai/*
    target: http://ai:8062
    timeout: 120s
```

#### 2.4.4 安全优势

| 安全层 | 说明 |
|--------|------|
| HTTPS | 加密传输 |
| WAF | Web应用防火墙 |
| Rate Limit | 限流保护 |
| Auth | 统一认证 |

---

## 3. 各部署模式配置

### 3.1 本地部署

```bash
# config/ports.env - 本地模式
# 所有服务直接暴露，便于开发调试

# 核心服务
IAM_PORT=8000
PM_PORT=8001
NOTIFICATION_PORT=8002
PORTAL_PORT=8003
FLOW_PORT=8004
INTEGRATION_PORT=8005

# ERP服务
ERP_PORT=8010
HRM_PORT=8011
CRM_PORT=8012

# PLM服务（避开8021）
RS_PORT=8020
LIMS_PORT=8022
PDM_PORT=8023
DOC_PORT=8024

# MES服务
MES_PORT=8030
QMS_PORT=8031
EHS_PORT=8032

# SCM服务
SCM_PORT=8040
SRM_PORT=8041
WMS_PORT=8042

# 基础设施
FILE_PORT=8050
MAIL_PORT=8051
IM_PORT=8052
GIS_PORT=8053

# 数据分析
BI_PORT=8060
REPORT_PORT=8061
AI_PORT=8062

# 扩展服务
MOBILE_PORT=8070

# 前端
WEB_PORT=3000
```

**启动命令**：
```bash
# 开发核心功能 (~200 MB)
./scripts/topems.sh start-core

# 开发特定模块 (~150 MB)
./scripts/topems.sh start-module erp

# 完整测试 (~800 MB)
./scripts/topems.sh start-all
```

### 3.2 Docker 部署

```yaml
# docker-compose.yml - Docker模式
version: '3.8'

services:
  postgres:
    ports:
      - "5432:5432"
  
  redis:
    ports:
      - "6379:6379"
  
  # 核心服务
  iam:
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
  
  pm:
    ports:
      - "8001:8001"
    depends_on:
      - iam
  
  notification:
    ports:
      - "8002:8002"
    depends_on:
      - iam
  
  # API网关
  gateway:
    ports:
      - "8080:8080"
    depends_on:
      - iam
      - erp
      - plm
  
  # 前端
  web:
    ports:
      - "3000:3000"
    depends_on:
      - gateway
```

**启动命令**：
```bash
# 完整启动
./scripts/topems.sh start-docker

# 使用 profile 启动特定模块
docker-compose --profile erp up
```

### 3.3 SaaS 部署

```yaml
# Kubernetes - SaaS模式
# 内部服务使用 ClusterIP，不对外暴露
apiVersion: v1
kind: Service
metadata:
  name: topems-iam
spec:
  type: ClusterIP
  ports:
    - port: 8000
  selector:
    app: iam

---
# API网关使用 LoadBalancer，对外暴露
apiVersion: v1
kind: Service
metadata:
  name: topems-gateway
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8080
  selector:
    app: gateway

---
# 前端使用 LoadBalancer
apiVersion: v1
kind: Service
metadata:
  name: topems-web
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 3000
  selector:
    app: web
```

**访问方式**：
```
# SaaS 模式统一通过网关访问
https://api.topems.com/v1/iam
https://api.topems.com/v1/erp
https://api.topems.com/v1/plm

# 前端
https://app.topems.com
```

---

## 4. 资源优化策略

### 4.1 按需启动

| 启动命令 | 服务 | 内存 | 适用场景 |
|---------|------|-----|---------|
| `start-core` | iam, pm, notification, portal, flow | ~200 MB | 开发核心功能 |
| `start-erp` | erp, hrm, crm | ~150 MB | 开发ERP模块 |
| `start-plm` | rs, lims, pdm, doc | ~180 MB | 开发PLM模块 |
| `start-mes` | mes, qms, ehs | ~120 MB | 开发MES模块 |
| `start-analytics` | bi, report, ai | ~200 MB | 开发数据分析 |

### 4.2 AI 服务优化

TOPEMS 默认使用 Ollama 本地 AI 服务。

#### AI 服务默认配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| OLLAMA_BASE_URL | http://localhost:11434/v1 | Ollama 服务地址 |
| OLLAMA_MODEL | qwen2.5:7b-instruct | LLM 模型 |
| EMBEDDING_MODEL | nomic-embed-text | 嵌入模型 |
| AI_PORT | 8062 | AI 服务端口 |

#### 必需模型

```bash
# LLM 模型 - 用于生成回答
ollama pull qwen2.5:7b-instruct

# 嵌入模型 - 用于向量生成
ollama pull nomic-embed-text
```

#### 模型分工说明

| 特性 | `qwen2.5:7b-instruct` | `nomic-embed-text` |
|------|------------------------|---------------------|
| **用途** | LLM (大语言模型) | Embedding (嵌入模型) |
| **功能** | 生成式 AI 回答 | 文本向量化 |
| **维度** | N/A | 1536 维向量 |
| **API 端点** | `/chat/completions` | `/embeddings` |
| **应用场景** | 聊天、摘要、校验、补全 | 文档搜索、相似度匹配 |

#### 状态检查

```bash
./scripts/topems.sh status
```

会显示：

```
🤖 AI/LLM 配置:
   已安装模型:
   • nomic-embed-text:latest
   • qwen2.5:7b-instruct
   当前配置:
   • 提供商: 🖥️ Ollama 本地
   • LLM: qwen2.5:7b-instruct
   Ollama: ✅ 运行中
   pgvector: ✅ 已安装

📊 TOPEMS 服务统计:
   运行服务: 27 / 27
   服务内存: 399.2 MB
   前端内存: 155.9 MB
```

#### 资源优化

```bash
# 使用量化模型（节省50%内存）
export OLLAMA_MODEL=qwen2.5:7b-instruct-q4_0

# 按需启动AI服务
./scripts/topems.sh ai start
./scripts/topems.sh ai stop
```

---

## 5. 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| v1.0 | 2026-06-12 | 架构组 | 初始版本 |
| v2.0 | 2026-06-12 | 架构组 | 调整 pm/notification 端口 |
| v3.0 | 2026-06-12 | 架构组 | 避开8021端口 |
| v4.0 | 2026-06-12 | 架构组 | 支持三种部署模式的统一端口方案 |
| v4.1 | 2026-06-13 | 架构组 | 添加 AI 服务默认配置和资源监控说明 |

---

## 附录：端口映射速查表

| 端口 | 服务 | 模块 |
|------|------|------|
| 8000 | iam | 核心 |
| 8001 | pm | 核心 |
| 8002 | notification | 核心 |
| 8003 | portal | 核心 |
| 8004 | flow | 核心 |
| 8005 | integration | 核心 |
| 8010 | erp | ERP |
| 8011 | hrm | ERP |
| 8012 | crm | ERP |
| 8020 | rs | PLM |
| 8022 | lims | PLM |
| 8023 | pdm | PLM |
| 8024 | doc | PLM |
| 8030 | mes | MES |
| 8031 | qms | MES |
| 8032 | ehs | MES |
| 8040 | scm | SCM |
| 8041 | srm | SCM |
| 8042 | wms | SCM |
| 8050 | file | 基础设施 |
| 8051 | mail | 基础设施 |
| 8052 | im | 基础设施 |
| 8053 | gis | 基础设施 |
| 8060 | bi | 数据分析 |
| 8061 | report | 数据分析 |
| 8062 | ai | 数据分析 |
| 8070 | mobile | 扩展 |
| 8080 | gateway | 网关 |
| 3000 | web | 前端 |
