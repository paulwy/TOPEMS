# TOPEMS 生产管理系统 API

**服务**: topems-pdm (集成在 manufacturing)
**端口**: 8030 (已整合至制造服务)
**版本**: v2

---

> **API 路径**: `/api/pdm/` (例如 `/api/pdm/production-processes`)
> **实际访问地址**: `http://localhost:8030/api/pdm/`

## 1. 概述

生产管理系统 API（PDM - Production Data Management / Process Development Management）提供生产工艺管理、生产配方管理、生产批次管理和生产统计等功能。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 生产工艺列表 | /api/pdm/production-processes | GET |
| 生产工艺详情 | /api/pdm/production-processes/{id} | GET |
| 创建生产工艺 | /api/pdm/production-processes | POST |
| 更新生产工艺 | /api/pdm/production-processes/{id} | PUT |
| 删除生产工艺 | /api/pdm/production-processes/{id} | DELETE |
| 生产工序列表 | /api/pdm/production-steps | GET |
| 创建生产工序 | /api/pdm/production-steps | POST |
| 删除生产工序 | /api/pdm/production-steps/{id} | DELETE |
| 生产配方列表 | /api/pdm/production-formulas | GET |
| 生产配方详情 | /api/pdm/production-formulas/{id} | GET |
| 创建生产配方 | /api/pdm/production-formulas | POST |
| 更新生产配方 | /api/pdm/production-formulas/{id} | PUT |
| 删除生产配方 | /api/pdm/production-formulas/{id} | DELETE |
| 生产批次列表 | /api/pdm/production-batches | GET |
| 生产批次详情 | /api/pdm/production-batches/{id} | GET |
| 创建生产批次 | /api/pdm/production-batches | POST |
| 更新生产批次 | /api/pdm/production-batches/{id} | PUT |
| 删除生产批次 | /api/pdm/production-batches/{id} | DELETE |
| 生产统计列表 | /api/pdm/production-statistics | GET |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### ProductionProcess（生产工艺）

```json
{
  "id": "process-001",
  "process_no": "PDM-PRO-001",
  "name": "催化剂A标准生产工艺",
  "description": "适用于催化剂A大批量生产的标准工艺流程",
  "version": "2.0",
  "status": "active",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### ProductionStep（生产工序）

```json
{
  "id": "step-001",
  "process_id": "process-001",
  "step_no": "STEP-001",
  "name": "原料预处理",
  "description": "将原料按配方比例称量、混合、研磨",
  "duration_hours": 2,
  "equipment_required": "混合机、研磨机",
  "sort_order": 1,
  "created_at": "2026-05-20T10:00:00Z"
}
```

#### ProductionFormula（生产配方）

```json
{
  "id": "formula-001",
  "formula_no": "PDM-FML-001",
  "name": "催化剂A标准配方",
  "description": "催化剂A的标准生产配方",
  "version": "1.0",
  "process_id": "process-001",
  "status": "active",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### ProductionBatch（生产批次）

```json
{
  "id": "batch-001",
  "batch_no": "PDM-BATCH-2026-0522-001",
  "product_name": "催化剂A",
  "formula_id": "formula-001",
  "process_id": "process-001",
  "planned_quantity": 1000,
  "actual_quantity": 980,
  "unit": "kg",
  "start_date": "2026-05-22T08:00:00Z",
  "end_date": "2026-05-22T16:00:00Z",
  "status": "completed",
  "operator": "张操作员",
  "remarks": "生产顺利",
  "created_at": "2026-05-22T08:00:00Z",
  "updated_at": "2026-05-22T16:00:00Z"
}
```

#### ProductionStatistics（生产统计）

```json
{
  "id": "stat-001",
  "batch_id": "batch-001",
  "stat_date": "2026-05-22",
  "output_quantity": 980,
  "reject_quantity": 20,
  "pass_rate": 97.96,
  "cycle_time_hours": 8,
  "energy_consumption": 500,
  "remarks": "生产效率良好",
  "created_at": "2026-05-22T17:00:00Z"
}
```

---

## 2. 生产工艺管理接口

### 2.1 获取生产工艺列表

**端点**: `GET /api/pdm/production-processes`

**描述**: 获取所有生产工艺

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 状态（draft, active, inactive） |

**请求示例**:

```bash
curl -X GET "http://localhost:8030/api/pdm/production-processes?status=active" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "process-001",
      "process_no": "PDM-PRO-001",
      "name": "催化剂A标准生产工艺",
      "description": "适用于催化剂A大批量生产的标准工艺流程",
      "version": "2.0",
      "status": "active",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "process-002",
      "process_no": "PDM-PRO-002",
      "name": "催化剂B标准生产工艺",
      "description": "适用于催化剂B大批量生产的标准工艺流程",
      "version": "1.0",
      "status": "active",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取生产工艺详情

**端点**: `GET /api/pdm/production-processes/{id}`

**描述**: 获取指定生产工艺的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 工艺 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8030/api/pdm/production-processes/process-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "process-001",
    "process_no": "PDM-PRO-001",
    "name": "催化剂A标准生产工艺",
    "description": "适用于催化剂A大批量生产的标准工艺流程",
    "version": "2.0",
    "status": "active",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 2.3 创建生产工艺

**端点**: `POST /api/pdm/production-processes`

**描述**: 创建新的生产工艺

**认证**: 需要

**权限**: pdm:process:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "process_no": "PDM-PRO-001",
  "name": "催化剂A标准生产工艺",
  "description": "适用于催化剂A大批量生产的标准工艺流程",
  "version": "2.0",
  "status": "active"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| process_no | string | 是 | 工艺编号（唯一） |
| name | string | 是 | 工艺名称 |
| description | string | 否 | 工艺描述 |
| version | string | 是 | 版本号 |
| status | string | 是 | 状态（draft, active, inactive） |

**请求示例**:

```bash
curl -X POST http://localhost:8030/api/pdm/production-processes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "process_no": "PDM-PRO-001",
    "name": "催化剂A标准生产工艺",
    "description": "适用于催化剂A大批量生产的标准工艺流程",
    "version": "2.0",
    "status": "active"
  }'
```

---

### 2.4 更新生产工艺

**端点**: `PUT /api/pdm/production-processes/{id}`

**描述**: 更新指定生产工艺

**认证**: 需要

**权限**: pdm:process:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 工艺 ID |

**请求体**:

```json
{
  "process_no": "PDM-PRO-001",
  "name": "催化剂A标准生产工艺（修订版）",
  "description": "适用于催化剂A大批量生产的标准工艺流程（增加质量控制点）",
  "version": "2.1",
  "status": "active"
}
```

---

### 2.5 删除生产工艺

**端点**: `DELETE /api/pdm/production-processes/{id}`

**描述**: 删除指定生产工艺

**认证**: 需要

**权限**: pdm:process:delete

---

## 3. 生产工序管理接口

### 3.1 获取生产工序列表

**端点**: `GET /api/pdm/production-steps`

**描述**: 获取所有生产工序

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| process_id | string | 否 | 工艺 ID |

---

### 3.2 创建生产工序

**端点**: `POST /api/pdm/production-steps`

**描述**: 创建新的生产工序

**认证**: 需要

**权限**: pdm:step:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "process_id": "process-001",
  "step_no": "STEP-001",
  "name": "原料预处理",
  "description": "将原料按配方比例称量、混合、研磨",
  "duration_hours": 2,
  "equipment_required": "混合机、研磨机",
  "sort_order": 1
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| process_id | string | 是 | 关联的工艺 ID |
| step_no | string | 是 | 工序编号 |
| name | string | 是 | 工序名称 |
| description | string | 否 | 工序描述 |
| duration_hours | number | 否 | 预计时长（小时） |
| equipment_required | string | 否 | 所需设备 |
| sort_order | integer | 是 | 排序顺序 |

**请求示例**:

```bash
curl -X POST http://localhost:8030/api/pdm/production-steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "process_id": "process-001",
    "step_no": "STEP-001",
    "name": "原料预处理",
    "description": "将原料按配方比例称量、混合、研磨",
    "duration_hours": 2,
    "equipment_required": "混合机、研磨机",
    "sort_order": 1
  }'
```

---

### 3.3 删除生产工序

**端点**: `DELETE /api/pdm/production-steps/{id}`

**描述**: 删除指定生产工序

**认证**: 需要

**权限**: pdm:step:delete

---

## 4. 生产配方管理接口

### 4.1 获取生产配方列表

**端点**: `GET /api/pdm/production-formulas`

**描述**: 获取所有生产配方

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态 |
| process_id | string | 否 | 关联的工艺 ID |

---

### 4.2 获取生产配方详情

**端点**: `GET /api/pdm/production-formulas/{id}`

**描述**: 获取指定生产配方的详细信息

**认证**: 需要

---

### 4.3 创建生产配方

**端点**: `POST /api/pdm/production-formulas`

**描述**: 创建新的生产配方

**认证**: 需要

**权限**: pdm:formula:write

**请求体**:

```json
{
  "formula_no": "PDM-FML-001",
  "name": "催化剂A标准配方",
  "description": "催化剂A的标准生产配方",
  "version": "1.0",
  "process_id": "process-001",
  "status": "active"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| formula_no | string | 是 | 配方编号（唯一） |
| name | string | 是 | 配方名称 |
| description | string | 否 | 配方描述 |
| version | string | 是 | 版本号 |
| process_id | string | 否 | 关联的工艺 ID |
| status | string | 是 | 状态（draft, active, inactive） |

---

### 4.4 更新生产配方

**端点**: `PUT /api/pdm/production-formulas/{id}`

**描述**: 更新指定生产配方

**认证**: 需要

**权限**: pdm:formula:write

---

### 4.5 删除生产配方

**端点**: `DELETE /api/pdm/production-formulas/{id}`

**描述**: 删除指定生产配方

**认证**: 需要

**权限**: pdm:formula:delete

---

## 5. 生产批次管理接口

### 5.1 获取生产批次列表

**端点**: `GET /api/pdm/production-batches`

**描述**: 获取所有生产批次

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态（planned, in_progress, completed, cancelled） |
| product_name | string | 否 | 产品名称 |
| start_date | string | 否 | 开始日期 |
| end_date | string | 否 | 结束日期 |

---

### 5.2 获取生产批次详情

**端点**: `GET /api/pdm/production-batches/{id}`

**描述**: 获取指定生产批次的详细信息

**认证**: 需要

---

### 5.3 创建生产批次

**端点**: `POST /api/pdm/production-batches`

**描述**: 创建新的生产批次

**认证**: 需要

**权限**: pdm:batch:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "batch_no": "PDM-BATCH-2026-0522-001",
  "product_name": "催化剂A",
  "formula_id": "formula-001",
  "process_id": "process-001",
  "planned_quantity": 1000,
  "unit": "kg",
  "status": "planned",
  "operator": "张操作员",
  "remarks": "计划生产"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| batch_no | string | 是 | 批次编号（唯一） |
| product_name | string | 是 | 产品名称 |
| formula_id | string | 否 | 关联的配方 ID |
| process_id | string | 否 | 关联的工艺 ID |
| planned_quantity | number | 否 | 计划产量 |
| unit | string | 是 | 单位 |
| status | string | 是 | 状态（planned, in_progress, completed, cancelled） |
| operator | string | 否 | 操作员 |
| remarks | string | 否 | 备注 |

**请求示例**:

```bash
curl -X POST http://localhost:8030/api/pdm/production-batches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "batch_no": "PDM-BATCH-2026-0522-001",
    "product_name": "催化剂A",
    "formula_id": "formula-001",
    "process_id": "process-001",
    "planned_quantity": 1000,
    "unit": "kg",
    "status": "planned",
    "operator": "张操作员",
    "remarks": "计划生产"
  }'
```

---

### 5.4 更新生产批次

**端点**: `PUT /api/pdm/production-batches/{id}`

**描述**: 更新指定生产批次

**认证**: 需要

**权限**: pdm:batch:write

**请求体**:

```json
{
  "batch_no": "PDM-BATCH-2026-0522-001",
  "product_name": "催化剂A",
  "formula_id": "formula-001",
  "process_id": "process-001",
  "planned_quantity": 1000,
  "actual_quantity": 980,
  "unit": "kg",
  "start_date": "2026-05-22T08:00:00Z",
  "end_date": "2026-05-22T16:00:00Z",
  "status": "completed",
  "operator": "张操作员",
  "remarks": "生产顺利"
}
```

---

### 5.5 删除生产批次

**端点**: `DELETE /api/pdm/production-batches/{id}`

**描述**: 删除指定生产批次

**认证**: 需要

**权限**: pdm:batch:delete

---

## 6. 生产统计管理接口

### 6.1 获取生产统计列表

**端点**: `GET /api/pdm/production-statistics`

**描述**: 获取所有生产统计数据

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| batch_id | string | 否 | 批次 ID |
| stat_date | string | 否 | 统计日期 |
| start_date | string | 否 | 开始日期 |
| end_date | string | 否 | 结束日期 |

**请求示例**:

```bash
curl -X GET "http://localhost:8030/api/pdm/production-statistics?start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "stat-001",
      "batch_id": "batch-001",
      "stat_date": "2026-05-22",
      "output_quantity": 980,
      "reject_quantity": 20,
      "pass_rate": 97.96,
      "cycle_time_hours": 8,
      "energy_consumption": 500,
      "remarks": "生产效率良好",
      "created_at": "2026-05-22T17:00:00Z"
    }
  ],
  "error": null
}
```

---

## 7. 健康检查

### 7.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查生产管理系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8030/health
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "OK"
}
```

---

## 8. 错误代码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| PROCESS_NOT_FOUND | 404 | 生产工艺不存在 |
| STEP_NOT_FOUND | 404 | 生产工序不存在 |
| FORMULA_NOT_FOUND | 404 | 生产配方不存在 |
| BATCH_NOT_FOUND | 404 | 生产批次不存在 |
| DUPLICATE_NO | 409 | 编号已存在 |
| INVALID_STATUS | 400 | 无效的状态 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 9. 工艺状态说明

| 状态 | 说明 |
|------|------|
| draft | 草稿 |
| active | 有效 |
| inactive | 已停用 |

---

## 10. 批次状态说明

| 状态 | 说明 |
|------|------|
| planned | 计划中 |
| in_progress | 进行中 |
| completed | 已完成 |
| cancelled | 已取消 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 初始版本 |
