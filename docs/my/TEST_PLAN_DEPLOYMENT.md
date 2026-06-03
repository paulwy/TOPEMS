# TOPEMS 部署全面测试计划

**版本**: v1.0  
**日期**: 2026-06-03  
**状态**: 草稿  

---

## 目录

1. [概述](#1-概述)
2. [测试环境要求](#2-测试环境要求)
3. [部署前验证](#3-部署前验证)
4. [服务健康检查](#4-服务健康检查)
5. [基础设施测试](#5-基础设施测试)
6. [核心服务测试](#6-核心服务测试)
7. [企业服务测试](#7-企业服务测试)
8. [生态服务测试](#8-生态服务测试)
9. [前端测试](#9-前端测试)
10. [服务间通信测试](#10-服务间通信测试)
11. [安全测试](#11-安全测试)
12. [性能测试](#12-性能测试)
13. [E2E测试](#13-e2e测试)
14. [验收标准](#14-验收标准)
15. [问题跟踪](#15-问题跟踪)

---

## 1. 概述

### 1.1 目的

本测试计划旨在为 TOPEMS 系统部署提供全面的测试策略，确保所有 17 个微服务和前端应用在生产环境中稳定运行。

### 1.2 测试范围

| 类别 | 数量 | 说明 |
|------|------|------|
| 核心服务 | 7 | IAM, DOC, AI, FLOW, RS, LIMS, HRM |
| 企业服务 | 4 | QMS, EHS, ERP, BI |
| 生态服务 | 6 | SCM, SRM, MAIL, NOTIFICATION, PORTAL, MES, CRM, WMS |
| 基础设施 | 2 | PostgreSQL, Redis |
| 前端 | 1 | React 应用 |

### 1.3 测试策略

```
┌─────────────────────────────────────────────────────────────┐
│                    部署测试流程                              │
├─────────────────────────────────────────────────────────────┤
│  1. 部署前验证 (环境检查)                                    │
│         ↓                                                   │
│  2. 基础设施测试 (DB, Redis)                               │
│         ↓                                                   │
│  3. 服务健康检查 (17 服务 × /health)                        │
│         ↓                                                   │
│  4. 核心服务测试 (认证、文档、AI、工作流)                      │
│         ↓                                                   │
│  5. 企业服务测试 (QMS, EHS, ERP, BI)                        │
│         ↓                                                   │
│  6. 生态服务测试 (SCM, SRM, 等)                             │
│         ↓                                                   │
│  7. 服务间通信测试 (Token 共享、API 调用)                    │
│         ↓                                                   │
│  8. 前端集成测试                                            │
│         ↓                                                   │
│  9. 安全测试                                                │
│         ↓                                                   │
│  10. 性能测试                                               │
│         ↓                                                   │
│  11. E2E 测试                                               │
│         ↓                                                   │
│  12. 验收确认                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 测试环境要求

### 2.1 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 8 核 | 16 核+ |
| 内存 | 16 GB | 32 GB+ |
| 磁盘 | 100 GB SSD | 500 GB SSD+ |
| 操作系统 | macOS / Linux | macOS / Linux |

### 2.2 软件要求

```bash
# 必需软件版本
Node.js: 20.x+
Rust: 1.70+
Docker: 24.x+
Docker Compose: 2.x+
PostgreSQL: 14+
Redis: 7+
```

### 2.3 网络端口要求

| 端口范围 | 用途 | 状态 |
|----------|------|------|
| 3000-3001 | 前端 | 必须开放 |
| 8001-8026 | 后端服务 | 必须开放 |
| 5432 | PostgreSQL | 必须开放 |
| 6379 | Redis | 必须开放 |

---

## 3. 部署前验证

### 3.1 环境检查脚本

```bash
#!/bin/bash
echo "=========================================="
echo "TOPEMS 部署前环境检查"
echo "=========================================="

# 1. 检查 Docker
echo "[1/10] 检查 Docker..."
docker --version || { echo "❌ Docker 未安装"; exit 1; }
echo "✅ Docker 已安装"

# 2. 检查 Docker Compose
echo "[2/10] 检查 Docker Compose..."
docker-compose --version || { echo "❌ Docker Compose 未安装"; exit 1; }
echo "✅ Docker Compose 已安装"

# 3. 检查 Node.js
echo "[3/10] 检查 Node.js..."
node --version || { echo "❌ Node.js 未安装"; exit 1; }
echo "✅ Node.js 已安装"

# 4. 检查 Rust
echo "[4/10] 检查 Rust..."
cargo --version || { echo "❌ Rust 未安装"; exit 1; }
echo "✅ Rust 已安装"

# 5. 检查端口占用
echo "[5/10] 检查端口占用..."
for port in 3000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8016 8018 8020 8022 8023 8026 5432 6379; do
  if lsof -i :$port > /dev/null 2>&1; then
    echo "⚠️  端口 $port 已被占用"
  else
    echo "✅ 端口 $port 可用"
  fi
done

# 6. 检查磁盘空间
echo "[6/10] 检查磁盘空间..."
df -h / | awk 'NR==2 {if ($4 ~ /G/) print "✅ 可用空间: "$4; else print "❌ 空间不足"}'

# 7. 检查内存
echo "[7/10] 检查内存..."
free -h | awk 'NR==2 {print "✅ 可用内存: "$7}'

# 8. 检查数据库连接
echo "[8/10] 检查 PostgreSQL..."
pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL 可用" || echo "⚠️  PostgreSQL 未运行"

# 9. 检查 Redis 连接
echo "[9/10] 检查 Redis..."
redis-cli ping > /dev/null 2>&1 && echo "✅ Redis 可用" || echo "⚠️  Redis 未运行"

# 10. 检查项目结构
echo "[10/10] 检查项目结构..."
[ -d "services/topems-iam" ] && echo "✅ 项目结构完整" || echo "❌ 项目结构不完整"

echo ""
echo "=========================================="
echo "环境检查完成"
echo "=========================================="
```

### 3.2 验证检查清单

| 检查项 | 预期结果 | 实际结果 | 状态 |
|--------|----------|----------|------|
| Docker 安装 | version 24.x+ | | |
| Docker Compose 安装 | version 2.x+ | | |
| Node.js 安装 | version 20.x+ | | |
| Rust 安装 | version 1.70+ | | |
| 所有端口可用 | 无冲突 | | |
| 磁盘空间 > 50GB | 充足 | | |
| 内存 > 8GB | 充足 | | |
| PostgreSQL 连接 | 正常 | | |
| Redis 连接 | 正常 | | |
| 项目结构完整 | 完整 | | |

---

## 4. 服务健康检查

### 4.1 一键健康检查脚本

```bash
#!/bin/bash
echo "=========================================="
echo "TOPEMS 服务健康检查"
echo "=========================================="

SERVICES=(
  "8001:DOC:文档管理"
  "8002:IAM:身份认证"
  "8003:AI:AI服务"
  "8004:FLOW:工作流"
  "8005:RS:研发管理"
  "8006:LIMS:实验室管理"
  "8007:QMS:质量管理"
  "8008:EHS:安全环保"
  "8009:ERP:企业资源"
  "8010:HRM:人力资源"
  "8013:CRM:客户关系"
  "8014:MES:制造执行"
  "8016:SCM:供应链"
  "8018:SRM:供应商"
  "8020:WMS:仓库管理"
  "8022:BI:商业智能"
  "8023:NOTIFICATION:通知服务"
  "8026:MAIL:邮件服务"
  "9021:PORTAL:统一门户"
)

HEALTH_COUNT=0
TOTAL_COUNT=${#SERVICES[@]}

for service in "${SERVICES[@]}"; do
  IFS=':' read -r port name desc <<< "$service"
  echo -n "[$name] 端口 $port ... "
  
  if curl -sf -m 5 "http://localhost:$port/health" > /dev/null 2>&1; then
    echo "✅ 健康"
    ((HEALTH_COUNT++))
  else
    echo "❌ 不可用"
  fi
done

echo ""
echo "=========================================="
echo "健康检查结果: $HEALTH_COUNT/$TOTAL_COUNT 服务正常"
echo "=========================================="

if [ $HEALTH_COUNT -eq $TOTAL_COUNT ]; then
  echo "✅ 所有服务运行正常"
  exit 0
else
  echo "⚠️  有 $((TOTAL_COUNT - HEALTH_COUNT)) 个服务不可用"
  exit 1
fi
```

### 4.2 健康检查结果记录

| 序号 | 服务 | 端口 | 健康检查 URL | 预期状态 | 实际状态 | 响应时间 | 状态 |
|------|------|------|--------------|----------|----------|----------|------|
| 1 | DOC | 8001 | /health | 200 | | <1s | |
| 2 | IAM | 8002 | /health | 200 | | <1s | |
| 3 | AI | 8003 | /health | 200 | | <1s | |
| 4 | FLOW | 8004 | /health | 200 | | <1s | |
| 5 | RS | 8005 | /health | 200 | | <1s | |
| 6 | LIMS | 8006 | /health | 200 | | <1s | |
| 7 | HRM | 8010 | /health | 200 | | <1s | |
| 8 | QMS | 8007 | /health | 200 | | <1s | |
| 9 | EHS | 8008 | /health | 200 | | <1s | |
| 10 | ERP | 8009 | /health | 200 | | <1s | |
| 11 | BI | 8022 | /health | 200 | | <1s | |
| 12 | SCM | 8016 | /health | 200 | | <1s | |
| 13 | SRM | 8018 | /health | 200 | | <1s | |
| 14 | MAIL | 8026 | /health | 200 | | <1s | |
| 15 | NOTIFICATION | 8023 | /health | 200 | | <1s | |
| 16 | PORTAL | 9021 | /health | 200 | | <1s | |
| 17 | MES | 8014 | /health | 200 | | <1s | |
| 18 | CRM | 8013 | /health | 200 | | <1s | |
| 19 | WMS | 8020 | /health | 200 | | <1s | |

---

## 5. 基础设施测试

### 5.1 PostgreSQL 测试

```bash
# 测试数据库连接
echo "[PostgreSQL] 测试连接..."
pg_isready -h localhost -p 5432 -U topems && echo "✅ 连接成功" || echo "❌ 连接失败"

# 测试数据库列表
echo "[PostgreSQL] 检查数据库..."
psql -h localhost -p 5432 -U topems -l 2>/dev/null | grep topems && echo "✅ 数据库存在" || echo "❌ 数据库不存在"

# 测试表结构
echo "[PostgreSQL] 检查表结构..."
psql -h localhost -p 5432 -U topems -d topems -c "\dt" | head -20

# 测试查询性能
echo "[PostgreSQL] 测试查询性能..."
time psql -h localhost -p 5432 -U topems -d topems -c "SELECT 1;" > /dev/null 2>&1
```

### 5.2 Redis 测试

```bash
# 测试 Redis 连接
echo "[Redis] 测试连接..."
redis-cli ping && echo "✅ 连接成功" || echo "❌ 连接失败"

# 测试读写
echo "[Redis] 测试读写..."
redis-cli set test_key "TOPEMS_TEST" && \
redis-cli get test_key | grep "TOPEMS_TEST" && \
echo "✅ 读写正常" || echo "❌ 读写失败"

# 清理测试数据
redis-cli del test_key

# 测试内存使用
echo "[Redis] 内存使用..."
redis-cli info memory | grep used_memory_human
```

### 5.3 基础设施测试结果

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|----------|----------|------|
| PostgreSQL 连接 | 成功 | | |
| PostgreSQL 查询 | <100ms | | |
| Redis 连接 | PONG | | |
| Redis 读写 | 正常 | | |
| Redis 内存 | <1GB | | |

---

## 6. 核心服务测试

### 6.1 IAM 服务测试 (端口 8002)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| IAM-001 | 用户登录 | POST /api/v1/auth/login | 返回 JWT token | P0 |
| IAM-002 | Token 验证 | POST /api/v1/auth/verify | 验证成功 | P0 |
| IAM-003 | Token 刷新 | POST /api/v1/auth/refresh | 返回新 token | P0 |
| IAM-004 | 获取用户列表 | GET /api/v1/users | 返回用户列表 | P1 |
| IAM-005 | 获取当前用户 | GET /api/v1/users/me | 返回当前用户信息 | P1 |
| IAM-006 | 创建用户 | POST /api/v1/users | 创建成功 | P1 |
| IAM-007 | 更新用户 | PUT /api/v1/users/:id | 更新成功 | P1 |
| IAM-008 | 删除用户 | DELETE /api/v1/users/:id | 删除成功 | P2 |
| IAM-009 | 权限验证 | 访问无权限接口 | 403 Forbidden | P1 |
| IAM-010 | 未授权访问 | 无 Token 访问 | 401 Unauthorized | P0 |

### 6.2 DOC 服务测试 (端口 8001)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| DOC-001 | 获取文件列表 | GET /api/v1/files | 返回文件列表 | P1 |
| DOC-002 | 上传文件 | POST /api/v1/files | 上传成功 | P1 |
| DOC-003 | 下载文件 | GET /api/v1/files/:id/download | 下载成功 | P1 |
| DOC-004 | 删除文件 | DELETE /api/v1/files/:id | 删除成功 | P2 |
| DOC-005 | 文件搜索 | GET /api/v1/files/search | 返回搜索结果 | P2 |

### 6.3 AI 服务测试 (端口 8003)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| AI-001 | 智能问答 | POST /api/v1/chat | 返回回答 | P1 |
| AI-002 | 文档摘要 | POST /api/v1/summarize | 返回摘要 | P2 |
| AI-003 | 健康检查 | GET /health | 200 OK | P0 |

### 6.4 FLOW 服务测试 (端口 8004)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| FLOW-001 | 获取工作流列表 | GET /api/v1/workflows | 返回工作流列表 | P1 |
| FLOW-002 | 创建工作流 | POST /api/v1/workflows | 创建成功 | P1 |
| FLOW-003 | 提交流程 | POST /api/v1/instances | 流程启动 | P1 |
| FLOW-004 | 审批流程 | POST /api/v1/tasks/:id/approve | 审批成功 | P1 |

### 6.5 RS 服务测试 (端口 8005)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| RS-001 | 获取项目列表 | GET /api/v1/projects | 返回项目列表 | P1 |
| RS-002 | 创建项目 | POST /api/v1/projects | 创建成功 | P1 |
| RS-003 | 获取项目详情 | GET /api/v1/projects/:id | 返回详情 | P1 |
| RS-004 | 更新项目 | PUT /api/v1/projects/:id | 更新成功 | P1 |

### 6.6 LIMS 服务测试 (端口 8006)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| LIMS-001 | 获取样品列表 | GET /api/v1/samples | 返回样品列表 | P1 |
| LIMS-002 | 创建样品 | POST /api/v1/samples | 创建成功 | P1 |
| LIMS-003 | 获取实验记录 | GET /api/v1/experiments | 返回记录 | P2 |

### 6.7 HRM 服务测试 (端口 8010)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| HRM-001 | 获取员工列表 | GET /api/v1/employees | 返回员工列表 | P1 |
| HRM-002 | 创建员工 | POST /api/v1/employees | 创建成功 | P1 |
| HRM-003 | 考勤打卡 | POST /api/v1/attendance/check-in | 打卡成功 | P1 |
| HRM-004 | 请假申请 | POST /api/v1/leave/apply | 申请成功 | P1 |
| HRM-005 | 请假审批 | POST /api/v1/leave/:id/approve | 审批成功 | P1 |

---

## 7. 企业服务测试

### 7.1 QMS 服务测试 (端口 8007)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| QMS-001 | 质量检验 | GET /api/v1/inspections | 返回检验列表 | P1 |
| QMS-002 | 创建检验 | POST /api/v1/inspections | 创建成功 | P1 |
| QMS-003 | 问题追踪 | GET /api/v1/issues | 返回问题列表 | P2 |

### 7.2 EHS 服务测试 (端口 8008)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| EHS-001 | 环境监测 | GET /api/v1/monitoring | 返回监测数据 | P1 |
| EHS-002 | 安全检查 | GET /api/v1/safety/checks | 返回检查列表 | P1 |
| EHS-003 | 事故管理 | GET /api/v1/incidents | 返回事故列表 | P2 |

### 7.3 ERP 服务测试 (端口 8009)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| ERP-001 | 资源规划 | GET /api/v1/resources | 返回资源列表 | P1 |
| ERP-002 | 资产管理 | GET /api/v1/assets | 返回资产列表 | P1 |

### 7.4 BI 服务测试 (端口 8022)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| BI-001 | 数据分析 | GET /api/v1/analytics | 返回分析数据 | P1 |
| BI-002 | 报表生成 | GET /api/v1/reports | 返回报表列表 | P2 |

---

## 8. 生态服务测试

### 8.1 SCM 服务测试 (端口 8016)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| SCM-001 | 采购管理 | GET /api/v1/purchases | 返回采购列表 | P1 |
| SCM-002 | 库存监控 | GET /api/v1/inventory | 返回库存数据 | P1 |

### 8.2 SRM 服务测试 (端口 8018)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| SRM-001 | 供应商列表 | GET /api/v1/suppliers | 返回供应商列表 | P1 |
| SRM-002 | 资质管理 | GET /api/v1/qualifications | 返回资质列表 | P2 |

### 8.3 MAIL 服务测试 (端口 8026)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| MAIL-001 | 发送邮件 | POST /api/v1/send | 发送成功 | P1 |
| MAIL-002 | 邮件模板 | GET /api/v1/templates | 返回模板列表 | P2 |

### 8.4 NOTIFICATION 服务测试 (端口 8023)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| NOTIFICATION-001 | 发送通知 | POST /api/v1/send | 发送成功 | P1 |
| NOTIFICATION-002 | 通知订阅 | POST /api/v1/subscribe | 订阅成功 | P2 |

### 8.5 PORTAL 服务测试 (端口 9021)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| PORTAL-001 | 单点登录 | GET /api/v1/sso/login | 跳转登录 | P1 |
| PORTAL-002 | 服务导航 | GET /api/v1/navigation | 返回导航 | P1 |

### 8.6 MES 服务测试 (端口 8014)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| MES-001 | 生产计划 | GET /api/v1/plans | 返回计划列表 | P1 |
| MES-002 | 车间管理 | GET /api/v1/workshops | 返回车间列表 | P1 |

### 8.7 CRM 服务测试 (端口 8013)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| CRM-001 | 客户列表 | GET /api/v1/customers | 返回客户列表 | P1 |
| CRM-002 | 销售追踪 | GET /api/v1/sales | 返回销售记录 | P2 |

### 8.8 WMS 服务测试 (端口 8020)

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| WMS-001 | 仓储列表 | GET /api/v1/warehouses | 返回仓库列表 | P1 |
| WMS-002 | 库存盘点 | GET /api/v1/inventory | 返回库存数据 | P1 |

---

## 9. 前端测试

### 9.1 前端构建测试

```bash
# 1. 安装依赖
echo "[前端] 安装依赖..."
cd frontend && npm install 2>&1 | tail -5

# 2. 类型检查
echo "[前端] 类型检查..."
npm run typecheck 2>&1 | tail -10

# 3. Lint 检查
echo "[前端] Lint 检查..."
npm run lint 2>&1 | tail -10

# 4. 构建测试
echo "[前端] 构建..."
npm run build 2>&1 | tail -10

# 5. 构建产物检查
echo "[前端] 检查构建产物..."
ls -la dist/ | head -10
```

### 9.2 前端功能测试

| 测试用例 ID | 测试项 | 测试步骤 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| FE-001 | 首页加载 | 访问 http://localhost:3000 | 页面正常显示 | P0 |
| FE-002 | 用户登录 | 输入账密登录 | 登录成功跳转 | P0 |
| FE-003 | Dashboard | 查看服务状态 | 显示所有服务状态 | P0 |
| FE-004 | 导航菜单 | 点击各模块 | 正确跳转 | P1 |
| FE-005 | 响应式布局 | 切换设备尺寸 | 布局自适应 | P2 |
| FE-006 | 错误处理 | 网络异常 | 显示错误提示 | P1 |

---

## 10. 服务间通信测试

### 10.1 认证流程测试

```bash
#!/bin/bash
echo "=========================================="
echo "服务间通信测试 - 认证流程"
echo "=========================================="

# 1. IAM 登录获取 Token
echo "[1/5] IAM 登录获取 Token..."
LOGIN_RESP=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 获取 Token 失败"
  exit 1
else
  echo "✅ Token 获取成功: ${TOKEN:0:20}..."
fi

# 2. 使用 Token 访问 DOC 服务
echo "[2/5] Token 访问 DOC 服务..."
DOC_RESP=$(curl -s -X GET http://localhost:8001/api/v1/files \
  -H "Authorization: Bearer $TOKEN")

if echo "$DOC_RESP" | grep -q "success\|data"; then
  echo "✅ DOC 服务响应正常"
else
  echo "❌ DOC 服务响应异常"
fi

# 3. 使用 Token 访问 FLOW 服务
echo "[3/5] Token 访问 FLOW 服务..."
FLOW_RESP=$(curl -s -X GET http://localhost:8004/api/v1/workflows \
  -H "Authorization: Bearer $TOKEN")

if echo "$FLOW_RESP" | grep -q "success\|data"; then
  echo "✅ FLOW 服务响应正常"
else
  echo "❌ FLOW 服务响应异常"
fi

# 4. 使用 Token 访问 RS 服务
echo "[4/5] Token 访问 RS 服务..."
RS_RESP=$(curl -s -X GET http://localhost:8005/api/v1/projects \
  -H "Authorization: Bearer $TOKEN")

if echo "$RS_RESP" | grep -q "success\|data"; then
  echo "✅ RS 服务响应正常"
else
  echo "❌ RS 服务响应异常"
fi

# 5. 使用 Token 访问 HRM 服务
echo "[5/5] Token 访问 HRM 服务..."
HRM_RESP=$(curl -s -X GET http://localhost:8010/api/v1/employees \
  -H "Authorization: Bearer $TOKEN")

if echo "$HRM_RESP" | grep -q "success\|data"; then
  echo "✅ HRM 服务响应正常"
else
  echo "❌ HRM 服务响应异常"
fi

echo ""
echo "=========================================="
echo "服务间通信测试完成"
echo "=========================================="
```

### 10.2 服务间通信测试结果

| 测试项 | IAM Token | DOC | FLOW | RS | LIMS | HRM | 状态 |
|--------|-----------|-----|------|-----|------|-----|------|
| IAM 登录 | ✅ | | | | | | |
| Token 访问 DOC | | ✅ | | | | | |
| Token 访问 FLOW | | | ✅ | | | | |
| Token 访问 RS | | | | ✅ | | | |
| Token 访问 LIMS | | | | | ✅ | | |
| Token 访问 HRM | | | | | | ✅ | |

---

## 11. 安全测试

### 11.1 安全测试用例

| 测试用例 ID | 测试项 | 测试方法 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| SEC-001 | 未授权访问 | 无 Token 访问受保护 API | 401 Unauthorized | P0 |
| SEC-002 | 过期 Token | 使用过期 Token | 401 Unauthorized | P0 |
| SEC-003 | 无效 Token | 使用伪造 Token | 401 Unauthorized | P0 |
| SEC-004 | 权限不足 | 低权限用户访问高权限 API | 403 Forbidden | P1 |
| SEC-005 | SQL 注入 | 在参数中输入 SQL | 返回错误，不执行 | P0 |
| SEC-006 | XSS 攻击 | 在输入框中输入脚本 | 转义处理 | P1 |
| SEC-007 | CORS 配置 | 跨域请求测试 | 正确配置 | P1 |
| SEC-008 | 敏感数据暴露 | 检查日志和响应 | 无敏感信息 | P0 |

### 11.2 安全测试脚本

```bash
#!/bin/bash
echo "=========================================="
echo "TOPEMS 安全测试"
echo "=========================================="

echo "[SEC-001] 测试未授权访问..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8001/api/v1/files)
[ "$RESP" = "401" ] && echo "✅ 未授权访问被拒绝 (401)" || echo "❌ 未授权访问未被拒绝 ($RESP)"

echo "[SEC-002] 测试过期 Token..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null -H "Authorization: Bearer expired_token" http://localhost:8001/api/v1/files)
[ "$RESP" = "401" ] && echo "✅ 过期 Token 被拒绝 (401)" || echo "❌ 过期 Token 未被拒绝 ($RESP)"

echo "[SEC-003] 测试无效 Token..."
RESP=$(curl -s -w "%{http_code}" -o /dev/null -H "Authorization: Bearer invalid_token_123" http://localhost:8001/api/v1/files)
[ "$RESP" = "401" ] && echo "✅ 无效 Token 被拒绝 (401)" || echo "❌ 无效 Token 未被拒绝 ($RESP)"

echo "[SEC-004] 测试 SQL 注入..."
RESP=$(curl -s "http://localhost:8001/api/v1/files?search=' OR 1=1 --")
echo "$RESP" | grep -q "error\|sql" && echo "⚠️  可能存在 SQL 注入风险" || echo "✅ SQL 注入防护正常"

echo "=========================================="
```

---

## 12. 性能测试

### 12.1 性能测试指标

| 指标 | 目标值 | 可接受 | 不可接受 |
|------|--------|--------|----------|
| API 响应时间 (p95) | <200ms | <500ms | >500ms |
| API 响应时间 (p99) | <500ms | <1000ms | >1000ms |
| 错误率 | <0.1% | <1% | >1% |
| 并发用户数 | >100 | >50 | <50 |
| 吞吐量 (RPS) | >500 | >100 | <100 |
| 内存使用 | <70% | <85% | >85% |
| CPU 使用 | <60% | <80% | >80% |

### 12.2 性能测试脚本 (使用 Apache Bench)

```bash
#!/bin/bash
echo "=========================================="
echo "TOPEMS 性能测试 (Apache Bench)"
echo "=========================================="

# 健康检查性能测试
echo "[测试 1] IAM 健康检查 (1000 请求, 10 并发)..."
ab -n 1000 -c 10 -q http://localhost:8002/health

echo ""
echo "[测试 2] DOC 文件列表 (500 请求, 5 并发)..."
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

ab -n 500 -c 5 -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/files

echo ""
echo "[测试 3] RS 项目列表 (500 请求, 5 并发)..."
ab -n 500 -c 5 -H "Authorization: Bearer $TOKEN" http://localhost:8005/api/v1/projects

echo ""
echo "=========================================="
echo "性能测试完成"
echo "=========================================="
```

### 12.3 性能测试结果记录

| 服务 | 指标 | 目标 | 实际 | p95 | p99 | 错误率 | 状态 |
|------|------|------|------|-----|-----|--------|------|
| IAM | 响应时间 | <200ms | | | | <1% | |
| DOC | 响应时间 | <200ms | | | | <1% | |
| FLOW | 响应时间 | <200ms | | | | <1% | |
| RS | 响应时间 | <200ms | | | | <1% | |
| LIMS | 响应时间 | <200ms | | | | <1% | |
| HRM | 响应时间 | <200ms | | | | <1% | |
| 前端 | 加载时间 | <2s | | | | - | |

---

## 13. E2E 测试

### 13.1 E2E 测试用例

| 测试用例 ID | 测试项 | 测试步骤 | 预期结果 | 优先级 |
|-------------|--------|----------|----------|--------|
| E2E-001 | 用户登录流程 | 1. 访问登录页<br>2. 输入账密<br>3. 点击登录 | 成功进入 Dashboard | P0 |
| E2E-002 | 创建项目流程 | 1. 进入 RS 模块<br>2. 点击新建项目<br>3. 填写信息<br>4. 保存 | 项目创建成功 | P1 |
| E2E-003 | 工作流审批 | 1. 提交申请<br>2. 管理员审批<br>3. 查看结果 | 流程完成 | P1 |
| E2E-004 | 考勤打卡 | 1. 进入 HRM<br>2. 点击上班打卡<br>3. 点击下班打卡 | 打卡成功 | P1 |
| E2E-005 | 文档上传下载 | 1. 进入 DOC<br>2. 上传文件<br>3. 下载文件 | 成功 | P2 |

### 13.2 Playwright E2E 测试

```bash
# 安装 Playwright
cd frontend
npx playwright install chromium

# 运行 E2E 测试
npm run test:e2e

# 可视化模式
npm run test:e2e:ui
```

---

## 14. 验收标准

### 14.1 测试通过标准

| 类别 | 通过标准 | 严重程度 |
|------|----------|----------|
| 健康检查 | 17/17 服务正常 | P0 |
| 单元测试 | 覆盖率 >= 70% | P1 |
| 集成测试 | 所有用例通过 | P0 |
| E2E 测试 | 核心流程通过 | P0 |
| 安全测试 | 无高危漏洞 | P0 |
| 性能测试 | 达到目标指标 | P1 |

### 14.2 发布检查清单

```
部署前检查:
[ ] 所有服务健康检查通过
[ ] 数据库连接正常
[ ] Redis 连接正常
[ ] 前端构建成功
[ ] 服务间通信正常
[ ] 安全测试通过
[ ] 性能测试达标

部署后检查:
[ ] 所有服务健康检查通过
[ ] 用户可以正常登录
[ ] 核心功能可用
[ ] 无错误日志
[ ] 性能指标正常
```

---

## 15. 问题跟踪

### 15.1 问题记录表

| 问题编号 | 测试用例 | 描述 | 严重程度 | 状态 | 解决方案 | 解决日期 |
|----------|----------|------|----------|------|----------|----------|
| | | | | | | |

### 15.2 严重程度定义

| 级别 | 定义 | 响应时间 | 解决时间 |
|------|------|----------|----------|
| 严重 (S0) | 系统崩溃、服务不可用 | 立即 | 4 小时内 |
| 高 (S1) | 核心功能不可用 | 1 小时内 | 24 小时内 |
| 中 (S2) | 次要功能问题 | 4 小时内 | 1 周内 |
| 低 (S3) | UI/UX 问题 | 1 天内 | 2 周内 |

---

## 附录

### A. 测试脚本汇总

```bash
# 一键运行所有测试
cd /Users/air/TOPEMS

# 1. 环境检查
bash scripts/test-environment.sh

# 2. 服务健康检查
bash scripts/test-services-health.sh

# 3. 集成测试
bash scripts/test-integration.sh

# 4. 安全测试
bash scripts/test-security.sh

# 5. 性能测试
bash scripts/test-performance.sh
```

### B. 测试报告模板

```markdown
## TOPEMS 部署测试报告

### 基本信息
- 测试日期: YYYY-MM-DD
- 测试版本: v2.0.0
- 测试环境: 生产/预发布
- 测试人员:

### 测试结果汇总
| 类别 | 总用例 | 通过 | 失败 | 通过率 |
|------|--------|------|------|--------|
| 健康检查 | 19 | | | |
| 集成测试 | | | | |
| 安全测试 | | | | |
| 性能测试 | | | | |
| E2E 测试 | | | | |

### 发现的问题
1. [问题描述]

### 结论
- [ ] 可以发布
- [ ] 需要修复后发布

### 签名
测试人员: __________
日期: __________
```

---

**文档版本**: v1.0  
**制定日期**: 2026-06-03  
**最后更新**: 2026-06-03  
**维护者**: TOPEMS 开发团队
