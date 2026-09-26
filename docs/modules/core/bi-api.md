# TOPEMS DSH 业务智能 - API 文档

## 概述

TOPEMS DSH 业务智能模块提供面向业务场景的 AI 能力接口，包括业务 Copilot、智能表单、文档智能和 AI 治理仪表盘。

## 基础信息

- **Base URL**: `http://localhost:8080/api/ai`
- **认证方式**: Bearer Token / API Key
- **响应格式**: JSON
- **统一响应结构**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {}
  }
  ```

---

## 1. 业务 Copilot API

业务 Copilot 提供面向特定业务模块的智能对话能力，支持 ERP、Finance、CRM、WMS、HR、OA 等业务模块。

### 1.1 创建会话

创建新的业务 Copilot 会话。

**请求**
```
POST /copilot/sessions
Content-Type: application/json
```

**请求体**
```json
{
  "module": "erp",
  "user_id": "user-123",
  "tenant_id": "tenant-456"
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| module | string | 是 | 业务模块类型：erp/finance/crm/wms/hr/oa/general |
| user_id | string | 否 | 用户 ID |
| tenant_id | string | 否 | 租户 ID |

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session_id": "session-uuid",
    "user_id": "user-123",
    "tenant_id": "tenant-456",
    "module": "erp",
    "conversation_history": [],
    "context_data": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 1.2 获取会话信息

获取指定会话的详细信息。

**请求**
```
GET /copilot/sessions/{session_id}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session_id": "session-uuid",
    "module": "erp",
    "conversation_history": [...],
    "context_data": {},
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 1.3 删除会话

删除指定会话。

**请求**
```
DELETE /copilot/sessions/{session_id}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 1.4 发送消息

向业务 Copilot 发送消息并获取响应。

**请求**
```
POST /copilot/chat
Content-Type: application/json
```

**请求体**
```json
{
  "session_id": "session-uuid",
  "user_input": "查询本月采购订单",
  "module": "erp",
  "current_page": "/erp/purchase-orders",
  "selected_records": [
    {
      "record_type": "purchase_order",
      "record_id": "PO-2024-001",
      "record_name": "采购订单 001"
    }
  ],
  "additional_context": {
    "department": "采购部"
  },
  "stream": false
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 否 | 会话 ID，不传则创建新会话 |
| user_input | string | 是 | 用户输入内容 |
| module | string | 是 | 业务模块类型 |
| current_page | string | 否 | 当前页面路径 |
| selected_records | array | 否 | 选中的业务记录 |
| additional_context | object | 否 | 额外上下文数据 |
| stream | boolean | 否 | 是否流式响应，默认 false |

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session_id": "session-uuid",
    "reply": "本月共有 15 个采购订单，总金额 125,000 元...",
    "intent": "query",
    "confidence": 0.92,
    "tool_calls": [
      {
        "call_id": "call-001",
        "tool_name": "erp_query_purchase_orders",
        "parameters": {"month": "2024-01"},
        "status": "success"
      }
    ],
    "suggested_actions": [
      {
        "action_id": "action-001",
        "action_type": "navigate",
        "label": "查看采购订单详情",
        "parameters": {"path": "/erp/purchase-orders"}
      }
    ],
    "referenced_data": [
      {
        "data_type": "purchase_order",
        "data_id": "PO-2024-001",
        "data_name": "采购订单 001"
      }
    ],
    "needs_confirmation": false,
    "processing_time_ms": 1234
  }
}
```

### 1.5 识别意图

识别用户输入的意图类型。

**请求**
```
POST /copilot/intent
Content-Type: application/json
```

**请求体**
```json
{
  "text": "创建一个新的采购订单",
  "module": "erp"
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "intent": "create",
    "confidence": 0.88
  }
}
```

**意图类型说明**

| 意图 | 说明 |
|------|------|
| query | 查询数据 |
| create | 创建记录 |
| update | 更新记录 |
| delete | 删除记录 |
| analyze | 数据分析 |
| report | 生成报告 |
| approve | 审批操作 |
| reminder | 提醒设置 |
| knowledge | 知识查询 |
| guidance | 操作指导 |
| other | 其他 |

### 1.6 获取业务模块配置

获取指定业务模块的配置信息。

**请求**
```
GET /copilot/modules/{module}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "module": "erp",
    "name": "ERP 企业资源计划",
    "description": "面向 ERP 模块的智能助手",
    "system_prompt": "你是一个专业的 ERP 助手...",
    "welcome_message": "您好，我是 ERP 智能助手，有什么可以帮您？",
    "supported_intents": ["query", "create", "update", "analyze", "report"],
    "available_tools": [...],
    "faqs": [...],
    "quick_actions": [...]
  }
}
```

### 1.7 获取所有业务模块配置

获取所有业务模块的配置列表。

**请求**
```
GET /copilot/modules
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {"module": "erp", "name": "ERP", "description": "..."},
    {"module": "finance", "name": "财务", "description": "..."},
    {"module": "crm", "name": "客户关系", "description": "..."},
    {"module": "wms", "name": "仓储管理", "description": "..."}
  ]
}
```

### 1.8 搜索 FAQ

搜索指定业务模块的常见问题。

**请求**
```
GET /copilot/modules/{module}/faq?q={query}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "question": "如何创建采购订单？",
      "answer": "进入采购管理页面，点击新建按钮...",
      "keywords": ["采购订单", "创建"],
      "category": "操作指南"
    }
  ]
}
```

---

## 2. 智能表单 API

智能表单提供表单定义管理、数据验证、自动填充和从自然语言生成表单的能力。

### 2.1 获取表单定义

获取指定表单的定义信息。

**请求**
```
GET /forms/{form_id}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "form_id": "purchase_request",
    "name": "采购申请单",
    "description": "用于申请采购物资或服务",
    "category": "erp",
    "version": "1.0",
    "enabled": true,
    "fields": [
      {
        "field_id": "title",
        "name": "title",
        "label": "申请标题",
        "field_type": "text",
        "placeholder": "请输入采购申请标题",
        "required": true,
        "group": "基本信息",
        "order": 1
      },
      {
        "field_id": "amount",
        "name": "amount",
        "label": "金额",
        "field_type": "decimal",
        "required": true,
        "validation": {
          "min_value": 0,
          "error_message": "金额不能为负数"
        },
        "group": "采购明细",
        "order": 2
      }
    ]
  }
}
```

### 2.2 获取所有表单定义

获取所有表单定义列表，可按分类筛选。

**请求**
```
GET /forms?category={category}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {"form_id": "purchase_request", "name": "采购申请单", "category": "erp"},
    {"form_id": "expense_report", "name": "费用报销单", "category": "finance"}
  ]
}
```

### 2.3 验证表单数据

验证表单数据是否符合定义的规则。

**请求**
```
POST /forms/{form_id}/validate
Content-Type: application/json
```

**请求体**
```json
{
  "values": {
    "title": "办公用品采购",
    "amount": -100
  }
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "is_valid": false,
    "field_errors": {
      "amount": [
        {
          "code": "min_value",
          "message": "金额不能为负数",
          "severity": "error"
        }
      ]
    },
    "form_errors": [],
    "warnings": [],
    "validated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2.4 自动填充表单

基于上下文数据自动填充表单字段。

**请求**
```
POST /forms/{form_id}/auto-fill
Content-Type: application/json
```

**请求体**
```json
{
  "context": {
    "user_id": "user-123",
    "department": "采购部",
    "selected_record": {"type": "supplier", "id": "SUP-001"}
  }
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "form_id": "purchase_request",
    "values": {
      "applicant": "张三",
      "department": "采购部",
      "request_date": "2024-01-01"
    },
    "status": "draft"
  }
}
```

### 2.5 从自然语言生成表单

从自然语言描述中提取表单数据。

**请求**
```
POST /forms/{form_id}/generate
Content-Type: application/json
```

**请求体**
```json
{
  "text": "我要申请采购 10 台笔记本电脑，预算 5 万元，用于研发部门"
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "form_id": "purchase_request",
    "values": {
      "title": "笔记本电脑采购",
      "item_name": "笔记本电脑",
      "quantity": 10,
      "estimated_amount": 50000,
      "reason": "用于研发部门"
    },
    "status": "draft"
  }
}
```

### 2.6 提交表单

提交表单数据进行审批或处理。

**请求**
```
POST /forms/{form_id}/submit
Content-Type: application/json
```

**请求体**
```json
{
  "values": {...},
  "record_id": "optional-existing-record-id"
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "form_id": "purchase_request",
    "record_id": "PR-2024-001",
    "status": "submitted",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2.7 保存表单草稿

保存表单数据为草稿。

**请求**
```
POST /forms/{form_id}/draft
Content-Type: application/json
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "form_id": "purchase_request",
    "record_id": "draft-001",
    "status": "draft"
  }
}
```

---

## 3. 文档智能 API

文档智能提供文档上传、解析、摘要生成、内容搜索和文档生成的能力。

### 3.1 上传文档

上传文档进行处理。

**请求**
```
POST /documents
Content-Type: multipart/form-data
```

**请求体**
- `file`: 文档文件（必填）
- `metadata`: JSON 字符串，包含额外元数据（可选）

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "document_id": "doc-uuid",
    "name": "report.pdf",
    "document_type": "pdf",
    "file_size": 2457600,
    "uploaded_at": "2024-01-01T00:00:00Z",
    "processing_status": "pending"
  }
}
```

### 3.2 获取文档信息

获取文档的基本信息和元数据。

**请求**
```
GET /documents/{document_id}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "document_id": "doc-uuid",
    "name": "report.pdf",
    "document_type": "pdf",
    "file_size": 2457600,
    "metadata": {
      "author": "财务部",
      "page_count": 45,
      "word_count": 12500,
      "language": "zh-CN",
      "title": "2024年度财务报告"
    },
    "uploaded_at": "2024-01-01T00:00:00Z",
    "processing_status": "completed"
  }
}
```

### 3.3 解析文档

解析文档内容，提取文本、表格、图片和结构信息。

**请求**
```
POST /documents/{document_id}/parse
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "document_id": "doc-uuid",
    "success": true,
    "text": "文档全文内容...",
    "tables": [
      {
        "table_id": "table-001",
        "title": "收入明细表",
        "headers": ["项目", "金额", "占比"],
        "rows": [["产品A", "100万", "40%"]],
        "page": 5
      }
    ],
    "structure": {
      "sections": [
        {
          "section_id": "sec-001",
          "title": "第一章 概述",
          "level": 1,
          "content": "本章概述了...",
          "page": 1
        }
      ],
      "table_of_contents": [
        {"title": "第一章 概述", "level": 1, "page": 1}
      ]
    },
    "parsed_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3.4 生成文档摘要

生成文档的摘要内容。

**请求**
```
POST /documents/{document_id}/summary
Content-Type: application/json
```

**请求体**
```json
{
  "summary_type": "standard"
}
```

**摘要类型说明**

| 类型 | 说明 |
|------|------|
| brief | 简短摘要（1-2 句） |
| standard | 标准摘要（一段） |
| detailed | 详细摘要（多段） |
| section | 分章节摘要 |

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "document_id": "doc-uuid",
    "summary_type": "standard",
    "content": "本报告总结了2024年度公司的财务状况...",
    "length": 120,
    "key_sentences": [
      "营业收入同比增长15%，达到12.5亿元",
      "净利润达到2.3亿元，同比增长12%"
    ],
    "keywords": [
      {"keyword": "营业收入", "weight": 0.95, "frequency": 15},
      {"keyword": "净利润", "weight": 0.88, "frequency": 12}
    ],
    "generated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3.5 获取文档摘要

获取已生成的文档摘要。

**请求**
```
GET /documents/{document_id}/summary?type={summary_type}
```

### 3.6 搜索文档内容

在文档内容中搜索关键词。

**请求**
```
GET /documents/{document_id}/search?q={query}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "line_number": 15,
      "content": "营业收入达到12.5亿元，同比增长15%",
      "match_count": 2
    }
  ]
}
```

### 3.7 生成文档

从结构化内容生成文档。

**请求**
```
POST /documents/generate
Content-Type: application/json
```

**请求体**
```json
{
  "document_type": "word",
  "title": "2024年度报告",
  "content": {
    "sections": [
      {
        "title": "第一章 概述",
        "level": 1,
        "paragraphs": ["本章概述了..."]
      }
    ]
  },
  "style": {
    "font_family": "宋体",
    "font_size": 12
  }
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "document_id": "doc-uuid",
    "name": "2024年度报告.docx",
    "document_type": "word",
    "file_size": 51200
  }
}
```

### 3.8 下载文档

下载文档文件。

**请求**
```
GET /documents/{document_id}/download
```

**响应**: 二进制文件流

### 3.9 删除文档

删除指定文档。

**请求**
```
DELETE /documents/{document_id}
```

### 3.10 获取文档列表

获取文档列表，支持分页和筛选。

**请求**
```
GET /documents?page=1&page_size=20&document_type=pdf&status=completed
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 4. AI 治理仪表盘 API

AI 治理仪表盘提供 AI 系统的治理监控能力，包括治理评分、风险评估、合规状态、成本分析和性能指标。

### 4.1 获取治理仪表盘数据

获取完整的治理仪表盘数据。

**请求**
```
GET /governance/dashboard?time_range=24h
```

**时间范围说明**

| 值 | 说明 |
|----|------|
| 1h | 最近 1 小时 |
| 24h | 最近 24 小时 |
| 7d | 最近 7 天 |
| 30d | 最近 30 天 |

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "generated_at": "2024-01-01T00:00:00Z",
    "time_range": "24h",
    "overall_score": 85,
    "governance_level": "good",
    "key_metrics": {
      "total_requests": 10000,
      "successful_requests": 9850,
      "failed_requests": 150,
      "success_rate": 98.5,
      "total_tokens": 5000000,
      "average_response_ms": 450,
      "p95_response_ms": 1200,
      "active_users": 250,
      "active_agents": 15,
      "total_tool_calls": 8000,
      "cache_hit_rate": 65.5
    },
    "risk_assessment": {
      "overall_risk_level": "low",
      "risk_score": 25,
      "security_risk": {"level": "low", "score": 20},
      "compliance_risk": {"level": "low", "score": 15},
      "cost_risk": {"level": "medium", "score": 45},
      "performance_risk": {"level": "low", "score": 30},
      "data_risk": {"level": "low", "score": 20},
      "high_risk_items": []
    },
    "compliance_status": {
      "overall_compliance_rate": 92.5,
      "total_checks": 200,
      "passed_checks": 185,
      "failed_checks": 10,
      "pending_checks": 5,
      "frameworks": [
        {"name": "GDPR", "compliance_rate": 95, "status": "compliant"},
        {"name": "等保2.0", "compliance_rate": 90, "status": "partially_compliant"}
      ],
      "non_compliant_items": []
    },
    "cost_analysis": {
      "total_cost": 12500.50,
      "currency": "CNY",
      "llm_cost": 8500.00,
      "tool_cost": 2000.00,
      "storage_cost": 1000.00,
      "network_cost": 500.00,
      "other_cost": 500.50,
      "average_cost_per_request": 1.25,
      "cost_trend_percent": 5.2,
      "budget_usage": {
        "total_budget": 50000,
        "used_amount": 12500.50,
        "usage_percent": 25.0,
        "budget_period": "2024-01",
        "is_over_budget": false,
        "projected_overage": 0
      },
      "top_cost_resources": []
    },
    "performance_metrics": {
      "average_response_ms": 450,
      "p50_response_ms": 350,
      "p90_response_ms": 900,
      "p95_response_ms": 1200,
      "p99_response_ms": 2500,
      "throughput": 120,
      "concurrency": 50,
      "error_rate": 1.5,
      "timeout_rate": 0.3,
      "retry_rate": 2.1,
      "performance_level": "good"
    },
    "security_events": [],
    "audit_summary": {
      "total_audit_logs": 50000,
      "by_operation": {},
      "by_user_top10": [],
      "by_resource_type": {},
      "anomalous_operations": 5,
      "unauthorized_attempts": 2
    },
    "trends": [],
    "recommendations": []
  }
}
```

### 4.2 获取治理评分

获取总体治理评分和各维度分解。

**请求**
```
GET /governance/score?time_range=24h
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "overall_score": 85,
    "governance_level": "good",
    "breakdown": {
      "security": 90,
      "compliance": 85,
      "cost": 75,
      "performance": 88,
      "reliability": 92
    }
  }
}
```

### 4.3 获取风险评估

获取详细的风险评估信息。

**请求**
```
GET /governance/risk?time_range=24h
```

### 4.4 获取合规状态

获取合规检查状态。

**请求**
```
GET /governance/compliance?framework=GDPR
```

### 4.5 获取成本分析

获取成本分析数据。

**请求**
```
GET /governance/cost?time_range=24h
```

### 4.6 获取性能指标

获取性能监控指标。

**请求**
```
GET /governance/performance?time_range=24h
```

### 4.7 获取关键指标

获取关键业务指标。

**请求**
```
GET /governance/metrics?time_range=24h
```

### 4.8 获取安全事件

获取安全事件列表。

**请求**
```
GET /governance/security-events?severity=high&limit=20&offset=0
```

### 4.9 记录安全事件

记录新的安全事件。

**请求**
```
POST /governance/security-events
Content-Type: application/json
```

**请求体**
```json
{
  "event_type": "unauthorized_access",
  "severity": "high",
  "description": "检测到未授权的 API 访问尝试",
  "affected_resource": "api/ai/copilot",
  "status": "open"
}
```

### 4.10 获取审计日志摘要

获取审计日志的统计摘要。

**请求**
```
GET /governance/audit?time_range=24h
```

### 4.11 获取趋势数据

获取时间序列趋势数据。

**请求**
```
GET /governance/trends?time_range=24h&metrics=requests,errors,cost
```

### 4.12 获取建议和改进项

获取系统生成的优化建议。

**请求**
```
GET /governance/recommendations?priority=high
```

### 4.13 刷新仪表盘缓存

清除并刷新仪表盘数据缓存。

**请求**
```
POST /governance/refresh
```

### 4.14 导出治理报告

导出治理报告为指定格式。

**请求**
```
GET /governance/export?format=pdf&time_range=24h
```

**支持格式**: pdf, excel, json

---

## 5. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | 服务暂不可用 |

---

## 6. 速率限制

- **默认限制**: 100 请求/分钟/用户
- **批量操作**: 10 请求/分钟/用户
- **文档上传**: 5 请求/分钟/用户
- 超出限制将返回 429 状态码

---

## 7. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-01-01 | 初始版本，包含业务 Copilot、智能表单、文档智能和治理仪表盘 API |
