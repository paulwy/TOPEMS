# TOPEMS 质量管理系统 API

**服务**: topems-qms (集成在 quality-assurance)
**端口**: 8032
**版本**: v2

---

> **API 路径**: `/api/qms/` (例如 `/api/qms/standards`)
> **实际访问地址**: `http://localhost:8032/api/qms/`

## 1. 概述

质量管理系统 API（QMS - Quality Management System）提供质量标准管理、质量检查、质量问题跟踪和改进建议管理等功能。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 质量标准列表 | /api/qms/standards | GET |
| 质量标准详情 | /api/qms/standards/{id} | GET |
| 创建质量标准 | /api/qms/standards | POST |
| 更新质量标准 | /api/qms/standards/{id} | PUT |
| 删除质量标准 | /api/qms/standards/{id} | DELETE |
| 质量检查列表 | /api/qms/checks | GET |
| 质量检查详情 | /api/qms/checks/{id} | GET |
| 创建质量检查 | /api/qms/checks | POST |
| 更新质量检查 | /api/qms/checks/{id} | PUT |
| 删除质量检查 | /api/qms/checks/{id} | DELETE |
| 质量问题列表 | /api/qms/issues | GET |
| 质量问题详情 | /api/qms/issues/{id} | GET |
| 创建质量问题 | /api/qms/issues | POST |
| 更新质量问题 | /api/qms/issues/{id} | PUT |
| 删除质量问题 | /api/qms/issues/{id} | DELETE |
| 质量改进列表 | /api/qms/improvements | GET |
| 质量改进详情 | /api/qms/improvements/{id} | GET |
| 创建质量改进 | /api/qms/improvements | POST |
| 更新质量改进 | /api/qms/improvements/{id} | PUT |
| 删除质量改进 | /api/qms/improvements/{id} | DELETE |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### QualityStandard（质量标准）

```json
{
  "id": "std-001",
  "name": "催化剂产品标准",
  "code": "QMS-STD-001",
  "category": "产品标准",
  "version": "2.0",
  "description": "催化剂产品的质量标准规范",
  "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...",
  "status": "active",
  "effective_date": "2026-01-01",
  "expiry_date": "2027-12-31",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### QualityCheck（质量检查）

```json
{
  "id": "check-001",
  "check_no": "QC-2026-0522-001",
  "check_type": "巡检",
  "inspector": "王质检员",
  "check_date": "2026-05-22",
  "location": "A区生产车间",
  "result": "发现1处一般问题",
  "conclusion": "需要整改",
  "status": "completed",
  "created_at": "2026-05-22T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### QualityIssue（质量问题）

```json
{
  "id": "issue-001",
  "issue_no": "QI-2026-001",
  "title": "反应釜温度控制偏差",
  "description": "2号反应釜在实际运行中温度偏差超过±2°C的标准范围",
  "severity": "major",
  "category": "设备问题",
  "status": "open",
  "assignee": "设备部-张工",
  "due_date": "2026-05-30",
  "resolution": "更换温控传感器，调整PID参数",
  "closed_at": null,
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### QualityImprovement（质量改进）

```json
{
  "id": "imp-001",
  "improvement_no": "QI-2026-IMP-001",
  "title": "优化催化剂生产配料流程",
  "description": "通过引入自动化配料系统，减少人工误差，提升产品质量稳定性",
  "category": "流程改进",
  "status": "in_progress",
  "proposer": "生产部-李经理",
  "assignee": "技术部-王工",
  "improvement_effect": "待评估",
  "created_at": "2026-05-15T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

---

## 2. 质量标准管理接口

### 2.1 获取质量标准列表

**端点**: `GET /api/qms/standards`

**描述**: 获取所有质量标准

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 标准状态（draft, active, expired） |
| category | string | 否 | 标准类别 |

**请求示例**:

```bash
curl -X GET "http://localhost:8032/api/qms/standards?page=1&page_size=20&status=active" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "std-001",
      "name": "催化剂产品标准",
      "code": "QMS-STD-001",
      "category": "产品标准",
      "version": "2.0",
      "status": "active",
      "effective_date": "2026-01-01",
      "expiry_date": "2027-12-31",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "std-002",
      "name": "原材料检验标准",
      "code": "QMS-STD-002",
      "category": "检验标准",
      "version": "1.0",
      "status": "active",
      "effective_date": "2026-01-01",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取质量标准详情

**端点**: `GET /api/qms/standards/{id}`

**描述**: 获取指定质量标准的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 标准 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8032/api/qms/standards/std-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "std-001",
    "name": "催化剂产品标准",
    "code": "QMS-STD-001",
    "category": "产品标准",
    "version": "2.0",
    "description": "催化剂产品的质量标准规范",
    "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...",
    "status": "active",
    "effective_date": "2026-01-01",
    "expiry_date": "2027-12-31",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 2.3 创建质量标准

**端点**: `POST /api/qms/standards`

**描述**: 创建新的质量标准

**认证**: 需要

**权限**: qms:standard:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "name": "催化剂产品标准",
  "code": "QMS-STD-001",
  "category": "产品标准",
  "version": "2.0",
  "description": "催化剂产品的质量标准规范",
  "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...",
  "status": "active"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 标准名称 |
| code | string | 是 | 标准编号（唯一） |
| category | string | 是 | 标准类别 |
| version | string | 是 | 版本号 |
| description | string | 否 | 标准描述 |
| content | string | 是 | 标准内容 |
| status | string | 是 | 标准状态（draft, active, expired） |

**请求示例**:

```bash
curl -X POST http://localhost:8032/api/qms/standards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "催化剂产品标准",
    "code": "QMS-STD-001",
    "category": "产品标准",
    "version": "2.0",
    "description": "催化剂产品的质量标准规范",
    "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...",
    "status": "active"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "std-001",
    "name": "催化剂产品标准",
    "code": "QMS-STD-001",
    "category": "产品标准",
    "version": "2.0",
    "description": "催化剂产品的质量标准规范",
    "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...",
    "status": "active",
    "effective_date": "2026-05-22",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 2.4 更新质量标准

**端点**: `PUT /api/qms/standards/{id}`

**描述**: 更新指定质量标准

**认证**: 需要

**权限**: qms:standard:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 标准 ID |

**请求体**:

```json
{
  "name": "催化剂产品标准（修订版）",
  "code": "QMS-STD-001",
  "category": "产品标准",
  "version": "2.1",
  "description": "催化剂产品的质量标准规范（修订版）",
  "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...（增加新的检验项目）",
  "status": "active"
}
```

**请求示例**:

```bash
curl -X PUT http://localhost:8032/api/qms/standards/std-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "催化剂产品标准（修订版）",
    "version": "2.1",
    "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...（增加新的检验项目）"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "std-001",
    "name": "催化剂产品标准（修订版）",
    "code": "QMS-STD-001",
    "category": "产品标准",
    "version": "2.1",
    "description": "催化剂产品的质量标准规范（修订版）",
    "content": "本标准规定了催化剂产品的技术要求、试验方法、检验规则...（增加新的检验项目）",
    "status": "active",
    "effective_date": "2026-01-01",
    "expiry_date": "2027-12-31",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T11:00:00Z"
  },
  "error": null
}
```

---

### 2.5 删除质量标准

**端点**: `DELETE /api/qms/standards/{id}`

**描述**: 删除指定质量标准

**认证**: 需要

**权限**: qms:standard:delete

**请求示例**:

```bash
curl -X DELETE http://localhost:8032/api/qms/standards/std-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": true,
  "error": null
}
```

---

## 3. 质量检查管理接口

### 3.1 获取质量检查列表

**端点**: `GET /api/qms/checks`

**描述**: 获取所有质量检查记录

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 检查状态（planned, in_progress, completed, cancelled） |
| check_type | string | 否 | 检查类型 |

**请求示例**:

```bash
curl -X GET "http://localhost:8032/api/qms/checks?page=1&page_size=20&status=completed" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "check-001",
      "check_no": "QC-2026-0522-001",
      "check_type": "巡检",
      "inspector": "王质检员",
      "check_date": "2026-05-22",
      "location": "A区生产车间",
      "result": "发现1处一般问题",
      "conclusion": "需要整改",
      "status": "completed",
      "created_at": "2026-05-22T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 3.2 获取质量检查详情

**端点**: `GET /api/qms/checks/{id}`

**描述**: 获取指定质量检查的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 检查 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8032/api/qms/checks/check-001 \
  -H "Authorization: Bearer {token}"
```

---

### 3.3 创建质量检查

**端点**: `POST /api/qms/checks`

**描述**: 创建新的质量检查记录

**认证**: 需要

**权限**: qms:check:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "check_no": "QC-2026-0522-001",
  "check_type": "巡检",
  "inspector": "王质检员",
  "check_date": "2026-05-22",
  "location": "A区生产车间",
  "result": "待填写",
  "conclusion": "待填写",
  "status": "planned"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| check_no | string | 是 | 检查单号（唯一） |
| check_type | string | 是 | 检查类型（巡检、定期检查、专项检查） |
| inspector | string | 是 | 检查员 |
| check_date | string | 是 | 检查日期 |
| location | string | 是 | 检查地点 |
| result | string | 否 | 检查结果 |
| conclusion | string | 否 | 结论 |
| status | string | 是 | 状态（planned, in_progress, completed, cancelled） |

**请求示例**:

```bash
curl -X POST http://localhost:8032/api/qms/checks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "check_no": "QC-2026-0522-001",
    "check_type": "巡检",
    "inspector": "王质检员",
    "check_date": "2026-05-22",
    "location": "A区生产车间",
    "result": "待填写",
    "conclusion": "待填写",
    "status": "planned"
  }'
```

---

### 3.4 更新质量检查

**端点**: `PUT /api/qms/checks/{id}`

**描述**: 更新指定质量检查

**认证**: 需要

**权限**: qms:check:write

**请求体**:

```json
{
  "check_no": "QC-2026-0522-001",
  "check_type": "巡检",
  "inspector": "王质检员",
  "check_date": "2026-05-22",
  "location": "A区生产车间",
  "result": "发现1处一般问题：2号反应釜温度传感器显示偏差",
  "conclusion": "需要整改",
  "status": "completed"
}
```

---

### 3.5 删除质量检查

**端点**: `DELETE /api/qms/checks/{id}`

**描述**: 删除指定质量检查

**认证**: 需要

**权限**: qms:check:delete

**请求示例**:

```bash
curl -X DELETE http://localhost:8032/api/qms/checks/check-001 \
  -H "Authorization: Bearer {token}"
```

---

## 4. 质量问题管理接口

### 4.1 获取质量问题列表

**端点**: `GET /api/qms/issues`

**描述**: 获取所有质量问题

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 问题状态（open, in_progress, resolved, closed） |
| severity | string | 否 | 严重程度（critical, major, minor） |

**请求示例**:

```bash
curl -X GET "http://localhost:8032/api/qms/issues?status=open" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "issue-001",
      "issue_no": "QI-2026-001",
      "title": "反应釜温度控制偏差",
      "description": "2号反应釜在实际运行中温度偏差超过±2°C的标准范围",
      "severity": "major",
      "category": "设备问题",
      "status": "open",
      "assignee": "设备部-张工",
      "due_date": "2026-05-30",
      "resolution": null,
      "closed_at": null,
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 4.2 获取质量问题详情

**端点**: `GET /api/qms/issues/{id}`

**描述**: 获取指定质量问题的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 问题 ID |

---

### 4.3 创建质量问题

**端点**: `POST /api/qms/issues`

**描述**: 创建新的质量问题

**认证**: 需要

**权限**: qms:issue:write

**请求体**:

```json
{
  "issue_no": "QI-2026-001",
  "title": "反应釜温度控制偏差",
  "description": "2号反应釜在实际运行中温度偏差超过±2°C的标准范围",
  "severity": "major",
  "category": "设备问题",
  "status": "open",
  "assignee": "设备部-张工",
  "due_date": "2026-05-30"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| issue_no | string | 是 | 问题编号（唯一） |
| title | string | 是 | 问题标题 |
| description | string | 是 | 问题描述 |
| severity | string | 是 | 严重程度（critical, major, minor） |
| category | string | 是 | 问题类别 |
| status | string | 是 | 状态（open, in_progress, resolved, closed） |
| assignee | string | 是 | 负责人 |
| due_date | string | 否 | 截止日期 |

---

### 4.4 更新质量问题

**端点**: `PUT /api/qms/issues/{id}`

**描述**: 更新指定质量问题

**认证**: 需要

**权限**: qms:issue:write

**请求体**:

```json
{
  "title": "反应釜温度控制偏差",
  "description": "2号反应釜在实际运行中温度偏差超过±2°C的标准范围",
  "severity": "major",
  "category": "设备问题",
  "status": "resolved",
  "assignee": "设备部-张工",
  "due_date": "2026-05-30",
  "resolution": "更换温控传感器，调整PID参数"
}
```

---

### 4.5 删除质量问题

**端点**: `DELETE /api/qms/issues/{id}`

**描述**: 删除指定质量问题

**认证**: 需要

**权限**: qms:issue:delete

---

## 5. 质量改进管理接口

### 5.1 获取质量改进列表

**端点**: `GET /api/qms/improvements`

**描述**: 获取所有质量改进建议

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态（proposed, approved, in_progress, completed, rejected） |

---

### 5.2 获取质量改进详情

**端点**: `GET /api/qms/improvements/{id}`

**描述**: 获取指定质量改进的详细信息

**认证**: 需要

---

### 5.3 创建质量改进

**端点**: `POST /api/qms/improvements`

**描述**: 创建新的质量改进建议

**认证**: 需要

**权限**: qms:improvement:write

**请求体**:

```json
{
  "improvement_no": "QI-2026-IMP-001",
  "title": "优化催化剂生产配料流程",
  "description": "通过引入自动化配料系统，减少人工误差，提升产品质量稳定性",
  "category": "流程改进",
  "status": "proposed",
  "proposer": "生产部-李经理",
  "assignee": "技术部-王工"
}
```

---

### 5.4 更新质量改进

**端点**: `PUT /api/qms/improvements/{id}`

**描述**: 更新指定质量改进

**认证**: 需要

**权限**: qms:improvement:write

---

### 5.5 删除质量改进

**端点**: `DELETE /api/qms/improvements/{id}`

**描述**: 删除指定质量改进

**认证**: 需要

**权限**: qms:improvement:delete

---

## 6. 健康检查

### 6.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查质量管理系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8032/health
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "OK"
}
```

---

## 7. 错误代码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| STANDARD_NOT_FOUND | 404 | 质量标准不存在 |
| CHECK_NOT_FOUND | 404 | 质量检查不存在 |
| ISSUE_NOT_FOUND | 404 | 质量问题不存在 |
| IMPROVEMENT_NOT_FOUND | 404 | 质量改进不存在 |
| DUPLICATE_CODE | 409 | 编号已存在 |
| INVALID_STATUS | 400 | 无效的状态 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 8. 标准状态说明

| 状态代码 | 说明 |
|----------|------|
| draft | 草稿 |
| active | 有效 |
| expired | 已过期 |

---

## 9. 检查类型说明

| 类型代码 | 说明 |
|----------|------|
| 巡检 | 日常巡检 |
| 定期检查 | 周期性检查 |
| 专项检查 | 专项检查 |
| 来料检查 | 原材料检查 |
| 出货检查 | 产品出货检查 |

---

## 10. 问题严重程度说明

| 严重程度 | 说明 |
|----------|------|
| critical | 严重 |
| major | 一般 |
| minor | 轻微 |

---

## 11. 问题状态说明

| 状态代码 | 说明 |
|----------|------|
| open | 待处理 |
| in_progress | 处理中 |
| resolved | 已解决 |
| closed | 已关闭 |

---

## 12. 改进状态说明

| 状态代码 | 说明 |
|----------|------|
| proposed | 已提议 |
| approved | 已批准 |
| in_progress | 进行中 |
| completed | 已完成 |
| rejected | 已拒绝 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 初始版本 |
