# TOPEMS DSH AI 中间层 - API 文档

## 概述

TOPEMS DSH（Data-Driven Service Hub）AI 中间层提供统一的 AI 能力接口，包括 Agent 编排、工具调用、LLM 集成、性能监控和告警管理。

## 基础信息

- **Base URL**: `http://localhost:8080/api/ai`
- **认证方式**: Bearer Token / API Key
- **响应格式**: JSON

---

## 1. Agent 编排 API

### 1.1 同步执行 Agent

执行 Agent 请求，等待完整响应。

**请求**
```
POST /dsh/agent/execute
Content-Type: application/json
```

**请求体**
```json
{
  "query": "搜索客户信息",
  "session_id": "optional-session-id",
  "available_tools": ["crm_search", "erp_query"],
  "max_iterations": 5,
  "stream": false,
  "context_variables": {
    "user_id": "123",
    "tenant_id": "456"
  }
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 用户查询 |
| session_id | string | 否 | 会话 ID，用于多轮对话 |
| available_tools | string[] | 否 | 可用工具列表，为空则使用所有工具 |
| max_iterations | number | 否 | 最大迭代次数，默认 10 |
| stream | boolean | 否 | 是否流式响应，默认 false |
| context_variables | object | 否 | 上下文变量 |

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session_id": "session-uuid",
    "answer": "找到以下客户信息...",
    "steps": [
      {
        "iteration": 1,
        "step_type": "think",
        "description": "需要搜索客户信息",
        "tool_name": "crm_search",
        "tool_arguments": {"query": "客户"},
        "success": true,
        "tool_result": {"results": []},
        "error": null
      }
    ],
    "tools_used": ["crm_search"],
    "total_iterations": 2,
    "total_duration_ms": 1234,
    "confidence": 0.85,
    "success": true,
    "error": null
  }
}
```

### 1.2 流式执行 Agent

使用 SSE（Server-Sent Events）流式返回 Agent 执行过程。

**请求**
```
POST /dsh/agent/stream
Content-Type: application/json
Accept: text/event-stream
```

**请求体**: 同同步执行

**响应事件类型**

| 事件类型 | 说明 | 数据字段 |
|---------|------|---------|
| session_start | 会话开始 | session_id |
| think_start | 思考开始 | iteration |
| think_complete | 思考完成 | iteration, thought, tool_name, tool_arguments |
| tool_call_start | 工具调用开始 | iteration, tool_name |
| tool_call_complete | 工具调用完成 | iteration, tool_name, success, result, error |
| content_delta | 内容增量 | delta |
| content_complete | 内容完成 | content |
| session_end | 会话结束 | session_id, success, duration_ms, total_iterations |
| error | 错误 | error |

**示例响应**
```
event: session_start
data: {"session_id": "session-uuid"}

event: think_start
data: {"iteration": 1}

event: tool_call_start
data: {"iteration": 1, "tool_name": "crm_search"}

event: tool_call_complete
data: {"iteration": 1, "tool_name": "crm_search", "success": true}

event: content_delta
data: {"delta": "找到"}

event: content_delta
data: {"delta": "以下客户..."}

event: session_end
data: {"session_id": "session-uuid", "success": true, "duration_ms": 1234}
```

### 1.3 获取会话信息

获取指定会话的上下文信息。

**请求**
```
GET /dsh/agent/session/{session_id}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session_id": "session-uuid",
    "message_count": 5,
    "created_at": "2024-01-01T00:00:00Z",
    "last_updated": "2024-01-01T00:05:00Z",
    "variables": {"user_id": "123"}
  }
}
```

### 1.4 清除会话

清除指定会话的上下文。

**请求**
```
DELETE /dsh/agent/session/{session_id}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 1.5 获取工具列表

获取所有可用的 MCP 工具列表。

**请求**
```
GET /dsh/agent/tools
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "name": "crm_search",
      "description": "搜索 CRM 客户信息",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {"type": "string", "description": "搜索关键词"}
        },
        "required": ["query"]
      }
    }
  ]
}
```

### 1.6 获取活跃会话数

获取当前活跃的会话数量。

**请求**
```
GET /dsh/agent/active-sessions
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "active_sessions": 42
  }
}
```

---

## 2. 性能监控 API

### 2.1 获取性能指标

获取 Agent 执行性能指标。

**请求**
```
GET /dsh/agent/performance/metrics
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "execution": {
      "total_executions": 1000,
      "successful_executions": 950,
      "failed_executions": 50,
      "total_duration_ms": 1234567,
      "avg_duration_ms": 1234.5,
      "min_duration_ms": 100,
      "max_duration_ms": 15000,
      "p50_duration_ms": 800.0,
      "p95_duration_ms": 3000.0,
      "p99_duration_ms": 8000.0,
      "total_tool_calls": 2500,
      "avg_tool_calls": 2.5,
      "avg_iterations": 3.2,
      "success_rate": 0.95
    },
    "tools": [
      {
        "tool_name": "crm_search",
        "call_count": 500,
        "success_count": 480,
        "failure_count": 20,
        "total_duration_ms": 50000,
        "avg_duration_ms": 100.0,
        "success_rate": 0.96
      }
    ],
    "history_size": 10000
  }
}
```

### 2.2 导出 Prometheus 指标

导出 Prometheus 格式的性能指标。

**请求**
```
GET /dsh/agent/performance/prometheus
```

**响应**
```
# HELP topems_agent_executions_total Total agent executions
# TYPE topems_agent_executions_total counter
topems_agent_executions_total 1000

# HELP topems_agent_execution_duration_ms Agent execution duration
# TYPE topems_agent_execution_duration_ms summary
topems_agent_execution_duration_ms{quantile="0.5"} 800
topems_agent_execution_duration_ms{quantile="0.95"} 3000
topems_agent_execution_duration_ms{quantile="0.99"} 8000
topems_agent_execution_duration_ms_sum 1234567
topems_agent_execution_duration_ms_count 1000
```

### 2.3 重置性能指标

重置所有性能指标。

**请求**
```
POST /dsh/agent/performance/reset
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 2.4 获取工具性能指标

获取指定工具的性能指标。

**请求**
```
GET /dsh/agent/performance/tools/{tool_name}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tool_name": "crm_search",
    "call_count": 500,
    "success_count": 480,
    "failure_count": 20,
    "total_duration_ms": 50000,
    "avg_duration_ms": 100.0,
    "success_rate": 0.96
  }
}
```

---

## 3. 错误码

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 4. 速率限制

- **默认限制**: 100 请求/分钟
- **流式请求**: 10 请求/分钟
- 超出限制返回 `429 Too Many Requests`

---

## 5. 示例

### cURL 示例

```bash
# 同步执行
curl -X POST http://localhost:8080/api/ai/dsh/agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "搜索客户信息"}'

# 流式执行
curl -X POST http://localhost:8080/api/ai/dsh/agent/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"query": "搜索客户信息"}'

# 获取性能指标
curl http://localhost:8080/api/ai/dsh/agent/performance/metrics

# 导出 Prometheus 指标
curl http://localhost:8080/api/ai/dsh/agent/performance/prometheus
```

### Python 示例

```python
import requests

# 同步执行
response = requests.post(
    "http://localhost:8080/api/ai/dsh/agent/execute",
    json={"query": "搜索客户信息", "session_id": "my-session"},
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)
result = response.json()
print(result["data"]["answer"])

# 流式执行
import json
response = requests.post(
    "http://localhost:8080/api/ai/dsh/agent/stream",
    json={"query": "搜索客户信息"},
    stream=True
)
for line in response.iter_lines():
    if line.startswith("data: "):
        event = json.loads(line[6:])
        print(event)
```
