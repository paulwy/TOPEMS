# TOPEMS 业务工具使用指南

> 版本：V438 | 最后更新：2026-08-27
> 适用范围：TOPEMS 统一核心服务（unified-core）

## 目录

1. [概述](#1-概述)
2. [架构说明](#2-架构说明)
3. [快速开始](#3-快速开始)
4. [API端点说明](#4-api端点说明)
5. [代码示例](#5-代码示例)
6. [业务工具列表](#6-业务工具列表)
7. [高级功能](#7-高级功能)
8. [最佳实践](#8-最佳实践)

---

## 1. 概述

TOPEMS 业务工具（Business Tools）是统一核心服务提供的一套标准化接口，用于连接和调用各个业务微服务（CRM、ERP、Finance、HR、MES、EHS、WMS、QMS、PM、LIMS、BI、APS、CS、SCM、IoT、OA）。

### 主要特性

- **统一接口**：所有业务服务通过统一的API端点访问
- **自动路由**：根据工具名称自动路由到对应的微服务
- **操作验证**：验证操作是否被工具支持
- **健康检查**：支持单个和批量健康检查
- **重试策略**：可配置的重试次数和间隔
- **熔断机制**：自动熔断保护，避免级联故障
- **多租户支持**：支持租户隔离和用户审计

### 支持的业务服务（16个）

| 服务代码 | 服务名称 | 服务描述 |
|---------|---------|---------|
| crm | Customer Relationship Management | 客户关系管理 |
| erp | Enterprise Resource Planning | 企业资源计划 |
| finance | Financial Management | 财务管理 |
| hr | Human Resources | 人力资源 |
| mes | Manufacturing Execution System | 制造执行系统 |
| ehs | Environment, Health & Safety | 环境健康安全 |
| wms | Warehouse Management System | 仓库管理系统 |
| qms | Quality Management System | 质量管理系统 |
| pm | Project Management | 项目管理 |
| lims | Laboratory Information Management System | 实验室信息管理 |
| bi | Business Intelligence | 商业智能 |
| aps | Advanced Planning & Scheduling | 高级计划与排程 |
| cs | Customer Service | 客户服务 |
| scm | Supply Chain Management | 供应链管理 |
| iot | Internet of Things | 物联网 |
| oa | Office Automation | 办公自动化 |

---

## 2. 架构说明

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端应用                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified-Core 统一核心服务                       │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  API 路由层   │───▶│ 业务工具层   │───▶│ 服务客户端层 │ │
│  │  /api/business│    │ BusinessTool │    │ ServiceClient│ │
│  │  -tools/*     │    │  Registry    │    │  + 重试/熔断 │ │
│  └──────────────┘    └──────────────┘    └──────┬───────┘ │
└─────────────────────────────────────────────────────┼───────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        │                             │                             │
                        ▼                             ▼                             ▼
                  ┌──────────┐                ┌──────────┐                ┌──────────┐
                  │  CRM     │                │  ERP     │                │ Finance  │
                  │ :8001    │                │ :8002    │                │ :8003    │
                  └──────────┘                └──────────┘                └──────────┘
                        ... 共16个微服务 ...
```

### 核心组件

1. **API路由层**（`routes/business_tools/`）
   - 提供RESTful API端点
   - 请求参数验证
   - 响应格式化

2. **业务工具层**（`modules/business_tools/`）
   - 业务工具注册表（BusinessToolRegistry）
   - 业务工具接口（BusinessTool trait）
   - 16个业务工具实现
   - 统一请求/响应格式

3. **服务客户端层**（`shared/service_client.rs`）
   - 服务配置管理
   - HTTP请求发送
   - 重试策略
   - 熔断机制
   - 健康检查

---

## 3. 快速开始

### 3.1 列出所有业务工具

**请求**：
```http
GET /api/business-tools HTTP/1.1
Host: localhost:8000
```

**响应**：
```json
{
  "total": 16,
  "tools": [
    {
      "name": "crm",
      "description": "Customer Relationship Management - 客户关系管理",
      "operations": ["create_customer", "get_customer", "list_customers", "..."],
      "operation_count": 11
    },
    {
      "name": "erp",
      "description": "Enterprise Resource Planning - 企业资源计划",
      "operations": ["create_order", "get_order", "list_orders", "..."],
      "operation_count": 13
    }
  ]
}
```

### 3.2 获取特定工具详情

**请求**：
```http
GET /api/business-tools/crm HTTP/1.1
Host: localhost:8000
```

**响应**：
```json
{
  "name": "crm",
  "description": "Customer Relationship Management - 客户关系管理",
  "operations": [
    "create_customer",
    "get_customer",
    "list_customers",
    "update_customer",
    "delete_customer",
    "create_lead",
    "get_lead",
    "list_leads",
    "create_opportunity",
    "get_opportunity",
    "list_opportunities"
  ],
  "operation_count": 11
}
```

### 3.3 执行业务工具操作

**请求**：
```http
POST /api/business-tools/crm/execute HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "operation": "create_customer",
  "data": {
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000"
  },
  "tenant_id": "tenant-001",
  "user_id": "user-001"
}
```

**响应**：
```json
{
  "success": true,
  "tool": "crm",
  "operation": "create_customer",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": {
    "id": "cust-001",
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "created_at": "2026-08-27T06:00:00Z"
  },
  "error": null,
  "error_code": null,
  "duration_ms": 45,
  "metadata": {}
}
```

### 3.4 检查工具健康状态

**请求**：
```http
GET /api/business-tools/crm/health HTTP/1.1
Host: localhost:8000
```

**响应**：
```json
{
  "tool": "crm",
  "healthy": true,
  "message": "Tool is healthy"
}
```

### 3.5 批量检查所有工具健康状态

**请求**：
```http
GET /api/business-tools/health/all HTTP/1.1
Host: localhost:8000
```

**响应**：
```json
{
  "total": 16,
  "healthy": 14,
  "unhealthy": 2,
  "tools": [
    {"tool": "crm", "healthy": true},
    {"tool": "erp", "healthy": true},
    {"tool": "finance", "healthy": false}
  ]
}
```

---

## 4. API端点说明

### 4.1 端点列表

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | /api/business-tools | 列出所有业务工具 | 否 |
| GET | /api/business-tools/{tool} | 获取特定工具详情 | 否 |
| POST | /api/business-tools/{tool}/execute | 执行工具操作 | 否 |
| GET | /api/business-tools/{tool}/health | 检查特定工具健康状态 | 否 |
| GET | /api/business-tools/health/all | 批量检查所有工具健康状态 | 否 |

### 4.2 请求格式

#### ExecuteToolRequest

```typescript
interface ExecuteToolRequest {
  operation: string;           // 操作名称（必填）
  params?: Record<string, any>; // 查询参数（可选）
  data?: any;                   // 请求体数据（可选）
  tenant_id?: string;           // 租户ID（可选）
  user_id?: string;             // 用户ID（可选）
}
```

### 4.3 响应格式

#### BusinessResponse

```typescript
interface BusinessResponse<T = any> {
  success: boolean;             // 是否成功
  tool: string;                 // 工具名称
  operation: string;            // 操作名称
  request_id: string;           // 请求ID（用于追踪）
  data?: T;                     // 响应数据（成功时）
  error?: string;               // 错误信息（失败时）
  error_code?: string;          // 错误代码（失败时）
  duration_ms: number;          // 响应时间（毫秒）
  metadata: Record<string, any>; // 元数据（分页等）
}
```

### 4.4 错误响应

#### 404 Tool Not Found

```json
{
  "error": "Tool not found",
  "tool": "unknown_service"
}
```

#### 400 Operation Not Supported

```json
{
  "error": "Operation not supported",
  "tool": "crm",
  "operation": "unknown_operation",
  "supported_operations": ["create_customer", "get_customer", "..."]
}
```

#### 500 Execution Failed

```json
{
  "error": "Execution failed",
  "tool": "crm",
  "operation": "create_customer",
  "message": "Service connection timeout"
}
```

---

## 5. 代码示例

### 5.1 使用 curl 调用

```bash
# 列出所有业务工具
curl -X GET http://localhost:8000/api/business-tools

# 获取CRM工具详情
curl -X GET http://localhost:8000/api/business-tools/crm

# 创建客户
curl -X POST http://localhost:8000/api/business-tools/crm/execute \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create_customer",
    "data": {
      "name": "张三",
      "email": "zhangsan@example.com"
    },
    "tenant_id": "tenant-001",
    "user_id": "user-001"
  }'

# 检查CRM健康状态
curl -X GET http://localhost:8000/api/business-tools/crm/health

# 批量检查所有工具健康状态
curl -X GET http://localhost:8000/api/business-tools/health/all
```

### 5.2 使用 JavaScript / TypeScript 调用

```javascript
// business-tools-client.js
class BusinessToolsClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async listTools() {
    const response = await fetch(`${this.baseUrl}/api/business-tools`);
    return response.json();
  }

  async getTool(tool) {
    const response = await fetch(`${this.baseUrl}/api/business-tools/${tool}`);
    return response.json();
  }

  async execute(tool, operation, data, options = {}) {
    const response = await fetch(
      `${this.baseUrl}/api/business-tools/${tool}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          data,
          tenant_id: options.tenantId,
          user_id: options.userId,
          params: options.params,
        }),
      }
    );
    return response.json();
  }

  async checkHealth(tool) {
    const response = await fetch(`${this.baseUrl}/api/business-tools/${tool}/health`);
    return response.json();
  }

  async checkAllHealth() {
    const response = await fetch(`${this.baseUrl}/api/business-tools/health/all`);
    return response.json();
  }
}

// 使用示例
async function main() {
  const client = new BusinessToolsClient();

  // 列出所有工具
  const tools = await client.listTools();
  console.log(`共 ${tools.total} 个业务工具`);

  // 创建客户
  const result = await client.execute('crm', 'create_customer', {
    name: '张三',
    email: 'zhangsan@example.com',
  }, {
    tenantId: 'tenant-001',
    userId: 'user-001',
  });

  if (result.success) {
    console.log('客户创建成功:', result.data);
  } else {
    console.error('客户创建失败:', result.error);
  }
}

main();
```

### 5.3 使用 Python 调用

```python
# business_tools_client.py
import requests
import json

class BusinessToolsClient:
    def __init__(self, base_url='http://localhost:8000'):
        self.base_url = base_url

    def list_tools(self):
        response = requests.get(f'{self.base_url}/api/business-tools')
        return response.json()

    def get_tool(self, tool):
        response = requests.get(f'{self.base_url}/api/business-tools/{tool}')
        return response.json()

    def execute(self, tool, operation, data=None, tenant_id=None, user_id=None, params=None):
        payload = {
            'operation': operation,
            'data': data,
            'tenant_id': tenant_id,
            'user_id': user_id,
            'params': params or {},
        }
        response = requests.post(
            f'{self.base_url}/api/business-tools/{tool}/execute',
            json=payload
        )
        return response.json()

    def check_health(self, tool):
        response = requests.get(f'{self.base_url}/api/business-tools/{tool}/health')
        return response.json()

    def check_all_health(self):
        response = requests.get(f'{self.base_url}/api/business-tools/health/all')
        return response.json()


# 使用示例
if __name__ == '__main__':
    client = BusinessToolsClient()

    # 列出所有工具
    tools = client.list_tools()
    print(f"共 {tools['total']} 个业务工具")

    # 创建客户
    result = client.execute(
        tool='crm',
        operation='create_customer',
        data={'name': '张三', 'email': 'zhangsan@example.com'},
        tenant_id='tenant-001',
        user_id='user-001'
    )

    if result['success']:
        print('客户创建成功:', result['data'])
    else:
        print('客户创建失败:', result['error'])
```

### 5.4 使用 Rust 直接调用（内部服务）

```rust
use topems_unified_core::modules::business_tools::{
    BusinessRequest, BusinessToolRegistry, create_default_registry,
};
use topems_unified_core::shared::service_client::ServiceRegistry;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 创建服务注册表
    let service_registry = Arc::new(ServiceRegistry::new());

    // 创建业务工具注册表（包含16个默认工具）
    let tool_registry = create_default_registry(service_registry)?;

    // 构建业务请求
    let request = BusinessRequest::new("crm", "create_customer")
        .with_data(serde_json::json!({
            "name": "张三",
            "email": "zhangsan@example.com"
        }))
        .with_tenant("tenant-001")
        .with_user("user-001");

    // 执行操作
    let response = tool_registry.execute(request).await?;

    if response.success {
        println!("客户创建成功: {:?}", response.data);
    } else {
        println!("客户创建失败: {:?}", response.error);
    }

    Ok(())
}
```

---

## 6. 业务工具列表

### 6.1 CRM - 客户关系管理（11个操作）

| 操作 | 描述 |
|------|------|
| create_customer | 创建客户 |
| get_customer | 获取客户详情 |
| list_customers | 列出客户列表 |
| update_customer | 更新客户信息 |
| delete_customer | 删除客户 |
| create_lead | 创建销售线索 |
| get_lead | 获取销售线索详情 |
| list_leads | 列出销售线索列表 |
| create_opportunity | 创建销售机会 |
| get_opportunity | 获取销售机会详情 |
| list_opportunities | 列出销售机会列表 |

### 6.2 ERP - 企业资源计划（13个操作）

| 操作 | 描述 |
|------|------|
| create_order | 创建订单 |
| get_order | 获取订单详情 |
| list_orders | 列出订单列表 |
| update_order | 更新订单 |
| delete_order | 删除订单 |
| create_product | 创建产品 |
| get_product | 获取产品详情 |
| list_products | 列出产品列表 |
| update_product | 更新产品 |
| delete_product | 删除产品 |
| create_inventory | 创建库存记录 |
| get_inventory | 获取库存详情 |
| list_inventory | 列出库存列表 |

### 6.3 其他服务

其他14个服务（Finance、HR、MES、EHS、WMS、QMS、PM、LIMS、BI、APS、CS、SCM、IoT、OA）的操作列表，请通过 `GET /api/business-tools/{tool}` API获取。

---

## 7. 高级功能

### 7.1 重试策略

业务工具底层的服务客户端支持可配置的重试策略。

**配置项**：
- `max_retries`：最大重试次数（默认0，不重试）
- `retry_delay_ms`：重试间隔（默认1000毫秒）

**Rust配置示例**：
```rust
use topems_unified_core::shared::service_client::ServiceConfig;

let config = ServiceConfig::new("crm", "http://localhost:8001")
    .with_max_retries(3)      // 最多重试3次
    .with_retry_delay(2000);  // 重试间隔2秒
```

**重试逻辑**：
1. 首次请求失败后，等待 `retry_delay_ms` 毫秒
2. 重试请求，最多重试 `max_retries` 次
3. 每次重试使用新的 `request_id`
4. 重试耗尽后，返回最后一次错误

### 7.2 熔断机制

熔断机制用于在服务不可用时快速失败，避免级联故障和资源浪费。

**配置项**：
- `circuit_breaker_enabled`：是否启用熔断（默认false）
- `failure_threshold`：失败阈值（默认5次连续失败后打开熔断）
- `reset_timeout_secs`：重置超时（默认30秒后进入半开状态）

**熔断状态**：
- **Closed（关闭）**：正常状态，允许所有请求
- **Open（打开）**：熔断状态，直接拒绝所有请求
- **HalfOpen（半开）**：测试状态，允许有限请求测试服务是否恢复

**状态转换**：
```
Closed ──连续失败达阈值──▶ Open
  ▲                            │
  │                            │ 经过reset_timeout_secs
  │                            ▼
  └────连续成功3次──── HalfOpen
```

**Rust配置示例**：
```rust
use topems_unified_core::shared::service_client::ServiceConfig;

let config = ServiceConfig::new("crm", "http://localhost:8001")
    .with_circuit_breaker_enabled(true)  // 启用熔断
    .with_failure_threshold(3)            // 3次失败后熔断
    .with_reset_timeout(60);              // 60秒后半开
```

**获取熔断状态**：
```rust
let status = client.get_circuit_breaker_status();
println!("熔断状态: {:?}", status.state);
println!("失败次数: {}", status.failure_count);
println!("成功次数: {}", status.success_count);
```

**重置熔断**：
```rust
client.reset_circuit_breaker();
```

### 7.3 健康检查

支持单个和批量健康检查。

**单个健康检查**：
```http
GET /api/business-tools/crm/health
```

**批量健康检查**：
```http
GET /api/business-tools/health/all
```

**Rust内部调用**：
```rust
// 单个健康检查
let health = tool.health_check().await?;
println!("CRM健康状态: {}", health);

// 批量健康检查
let all_health = tool_registry.health_check_all().await;
println!("健康服务数: {}", all_health.values().filter(|h| **h).count());
```

---

## 8. 最佳实践

### 8.1 请求设计

1. **使用正确的操作名称**：通过 `GET /api/business-tools/{tool}` 获取支持的操作列表
2. **传递租户ID**：多租户环境下始终传递 `tenant_id`
3. **传递用户ID**：用于审计和权限追踪
4. **使用request_id追踪**：响应中的 `request_id` 可用于问题排查

### 8.2 错误处理

1. **检查success字段**：始终检查响应中的 `success` 字段
2. **处理404错误**：工具不存在时返回404
3. **处理400错误**：操作不支持时返回400，包含支持的操作列表
4. **处理500错误**：执行失败时返回500，包含错误信息
5. **实现重试逻辑**：对于临时性错误，客户端可实现重试逻辑

### 8.3 性能优化

1. **启用熔断机制**：对于不稳定的服务，启用熔断机制避免级联故障
2. **配置合理的重试**：根据服务特性配置重试次数和间隔
3. **批量健康检查**：使用批量健康检查API监控所有服务状态
4. **使用连接池**：服务客户端内部使用连接池，无需额外配置

### 8.4 安全建议

1. **认证授权**：在生产环境中，应为API端点添加认证和授权
2. **输入验证**：对请求参数进行严格验证
3. **敏感数据**：避免在日志中记录敏感数据
4. **HTTPS**：生产环境使用HTTPS加密传输

### 8.5 监控建议

1. **监控响应时间**：关注 `duration_ms` 字段，设置告警阈值
2. **监控错误率**：统计失败请求比例
3. **监控熔断状态**：定期检查熔断状态，及时发现服务异常
4. **监控健康状态**：使用批量健康检查API定期检查所有服务

---

## 附录

### A. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| V438 | 2026-08-27 | 初始版本，包含16个业务工具、5个API端点、重试策略、熔断机制 |

### B. 相关文档

- [TOPEMS 架构改进计划](../TOPEMS_Architecture_Improvement_Plan.md)
- [TOPEMS MCP 架构修订计划](../TOPEMS_MCP_Architecture_Amendment_Plan.md)
- [统一核心服务代码](../../svc/unified-core/src/)

### C. 联系方式

如有问题或建议，请联系：
- 项目地址：https://github.com/paulwy/TOPEMS
- Issue跟踪：https://github.com/paulwy/TOPEMS/issues

---

**文档结束**
