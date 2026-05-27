# TOPEMS 环境健康安全系统 API

**服务**: topems-ehs
**端口**: 待定
**版本**: v1

---

## 1. 概述

环境健康安全系统 API（EHS - Environment, Health and Safety）提供安全管理功能，包括安全隐患管理、安全检查、应急预案和演练记录等。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 安全隐患列表 | /api/v1/hazards | GET |
| 安全隐患详情 | /api/v1/hazards/{id} | GET |
| 创建安全隐患 | /api/v1/hazards | POST |
| 更新安全隐患 | /api/v1/hazards/{id} | PUT |
| 删除安全隐患 | /api/v1/hazards/{id} | DELETE |
| 安全检查列表 | /api/v1/checks | GET |
| 安全检查详情 | /api/v1/checks/{id} | GET |
| 创建安全检查 | /api/v1/checks | POST |
| 更新安全检查 | /api/v1/checks/{id} | PUT |
| 删除安全检查 | /api/v1/checks/{id} | DELETE |
| 应急预案列表 | /api/v1/plans | GET |
| 应急预案详情 | /api/v1/plans/{id} | GET |
| 创建应急预案 | /api/v1/plans | POST |
| 更新应急预案 | /api/v1/plans/{id} | PUT |
| 删除应急预案 | /api/v1/plans/{id} | DELETE |
| 演练记录列表 | /api/v1/drills | GET |
| 演练记录详情 | /api/v1/drills/{id} | GET |
| 创建演练记录 | /api/v1/drills | POST |
| 更新演练记录 | /api/v1/drills/{id} | PUT |
| 删除演练记录 | /api/v1/drills/{id} | DELETE |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### SafetyHazard（安全隐患）

```json
{
  "id": "hazard-001",
  "hazard_no": "EHS-HZ-2026-001",
  "name": "2号仓库化学品堆放不规范",
  "category": "化学品管理",
  "level": "重大风险",
  "description": "2号仓库内部分化学品未按规定分区存放，存在混放风险",
  "location": "2号仓库",
  "control_measures": ["立即整改", "加强培训", "完善标识"],
  "status": "open",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### SafetyCheck（安全检查）

```json
{
  "id": "check-001",
  "check_no": "EHS-SC-2026-0522-001",
  "check_type": "日常巡检",
  "inspector": "安全员-张三",
  "check_date": "2026-05-22",
  "location": "生产车间A区",
  "result": "发现2处隐患",
  "issues": ["EHS-HZ-2026-001", "EHS-HZ-2026-002"],
  "status": "completed",
  "created_at": "2026-05-22T09:00:00Z",
  "updated_at": "2026-05-22T17:00:00Z"
}
```

#### EmergencyPlan（应急预案）

```json
{
  "id": "plan-001",
  "plan_no": "EHS-EP-001",
  "name": "化学品泄漏应急处置预案",
  "plan_type": "专项预案",
  "scope": "全厂区",
  "trigger_conditions": "当发生化学品泄漏，且泄漏量超过10升或可能影响周边环境时启动",
  "response_procedures": "1. 立即启动应急响应... 2. 组织人员疏散... 3. 采取控制措施...",
  "responsible_persons": ["安全总监", "车间主任", "环保主管"],
  "contact_info": "应急电话：12345",
  "status": "active",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### DrillRecord（演练记录）

```json
{
  "id": "drill-001",
  "drill_no": "EHS-DR-2026-001",
  "plan_id": "plan-001",
  "drill_name": "化学品泄漏应急演练",
  "drill_date": "2026-05-15",
  "participants": ["安全员", "车间员工", "环保人员"],
  "duration_hours": 2,
  "location": "2号车间",
  "summary": "演练顺利完成，各参演人员按照预案要求执行相应动作",
  "issues_found": "部分人员对防护设备使用不够熟练",
  "improvements": "加强个人防护装备培训",
  "created_at": "2026-05-15T17:00:00Z"
}
```

---

## 2. 安全隐患管理接口

### 2.1 获取安全隐患列表

**端点**: `GET /api/v1/hazards`

**描述**: 获取所有安全隐患

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 状态（open, in_progress, resolved, closed） |
| level | string | 否 | 风险等级 |
| category | string | 否 | 类别 |

**请求示例**:

```bash
curl -X GET "http://localhost:8008/api/v1/hazards?status=open&level=重大风险" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "hazard-001",
      "hazard_no": "EHS-HZ-2026-001",
      "name": "2号仓库化学品堆放不规范",
      "category": "化学品管理",
      "level": "重大风险",
      "description": "2号仓库内部分化学品未按规定分区存放，存在混放风险",
      "location": "2号仓库",
      "control_measures": ["立即整改", "加强培训", "完善标识"],
      "status": "open",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取安全隐患详情

**端点**: `GET /api/v1/hazards/{id}`

**描述**: 获取指定安全隐患的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 隐患 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8008/api/v1/hazards/hazard-001 \
  -H "Authorization: Bearer {token}"
```

---

### 2.3 创建安全隐患

**端点**: `POST /api/v1/hazards`

**描述**: 创建新的安全隐患记录

**认证**: 需要

**权限**: ehs:hazard:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "hazard_no": "EHS-HZ-2026-001",
  "name": "2号仓库化学品堆放不规范",
  "category": "化学品管理",
  "level": "重大风险",
  "description": "2号仓库内部分化学品未按规定分区存放，存在混放风险",
  "location": "2号仓库",
  "control_measures": ["立即整改", "加强培训", "完善标识"],
  "status": "open"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| hazard_no | string | 是 | 隐患编号（唯一） |
| name | string | 是 | 隐患名称 |
| category | string | 是 | 隐患类别 |
| level | string | 是 | 风险等级 |
| description | string | 是 | 隐患描述 |
| location | string | 是 | 隐患位置 |
| control_measures | array | 是 | 控制措施 |
| status | string | 是 | 状态（open, in_progress, resolved, closed） |

**请求示例**:

```bash
curl -X POST http://localhost:8008/api/v1/hazards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "hazard_no": "EHS-HZ-2026-001",
    "name": "2号仓库化学品堆放不规范",
    "category": "化学品管理",
    "level": "重大风险",
    "description": "2号仓库内部分化学品未按规定分区存放，存在混放风险",
    "location": "2号仓库",
    "control_measures": ["立即整改", "加强培训", "完善标识"],
    "status": "open"
  }'
```

---

### 2.4 更新安全隐患

**端点**: `PUT /api/v1/hazards/{id}`

**描述**: 更新指定安全隐患

**认证**: 需要

**权限**: ehs:hazard:write

**请求体**:

```json
{
  "name": "2号仓库化学品堆放不规范",
  "category": "化学品管理",
  "level": "重大风险",
  "description": "2号仓库内部分化学品未按规定分区存放，存在混放风险",
  "location": "2号仓库",
  "control_measures": ["已完成整改", "已完成培训", "已完善标识"],
  "status": "resolved"
}
```

---

### 2.5 删除安全隐患

**端点**: `DELETE /api/v1/hazards/{id}`

**描述**: 删除指定安全隐患

**认证**: 需要

**权限**: ehs:hazard:delete

**请求示例**:

```bash
curl -X DELETE http://localhost:8008/api/v1/hazards/hazard-001 \
  -H "Authorization: Bearer {token}"
```

---

## 3. 安全检查管理接口

### 3.1 获取安全检查列表

**端点**: `GET /api/v1/checks`

**描述**: 获取所有安全检查记录

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态（planned, in_progress, completed, cancelled） |
| check_type | string | 否 | 检查类型 |
| check_date | string | 否 | 检查日期 |

---

### 3.2 获取安全检查详情

**端点**: `GET /api/v1/checks/{id}`

**描述**: 获取指定安全检查的详细信息

**认证**: 需要

---

### 3.3 创建安全检查

**端点**: `POST /api/v1/checks`

**描述**: 创建新的安全检查记录

**认证**: 需要

**权限**: ehs:check:write

**请求体**:

```json
{
  "check_no": "EHS-SC-2026-0522-001",
  "check_type": "日常巡检",
  "inspector": "安全员-张三",
  "location": "生产车间A区",
  "result": "待填写",
  "issues": [],
  "status": "planned"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| check_no | string | 是 | 检查编号（唯一） |
| check_type | string | 是 | 检查类型（日常巡检、定期检查、专项检查） |
| inspector | string | 是 | 检查人 |
| location | string | 是 | 检查地点 |
| result | string | 否 | 检查结果 |
| issues | array | 否 | 发现的问题 |
| status | string | 是 | 状态 |

---

### 3.4 更新安全检查

**端点**: `PUT /api/v1/checks/{id}`

**描述**: 更新指定安全检查

**认证**: 需要

**权限**: ehs:check:write

**请求体**:

```json
{
  "check_no": "EHS-SC-2026-0522-001",
  "check_type": "日常巡检",
  "inspector": "安全员-张三",
  "check_date": "2026-05-22",
  "location": "生产车间A区",
  "result": "发现2处隐患",
  "issues": ["EHS-HZ-2026-001", "EHS-HZ-2026-002"],
  "status": "completed"
}
```

---

### 3.5 删除安全检查

**端点**: `DELETE /api/v1/checks/{id}`

**描述**: 删除指定安全检查

**认证**: 需要

**权限**: ehs:check:delete

---

## 4. 应急预案管理接口

### 4.1 获取应急预案列表

**端点**: `GET /api/v1/plans`

**描述**: 获取所有应急预案

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态（draft, active, inactive） |
| plan_type | string | 否 | 预案类型 |

---

### 4.2 获取应急预案详情

**端点**: `GET /api/v1/plans/{id}`

**描述**: 获取指定应急预案的详细信息

**认证**: 需要

---

### 4.3 创建应急预案

**端点**: `POST /api/v1/plans`

**描述**: 创建新的应急预案

**认证**: 需要

**权限**: ehs:plan:write

**请求体**:

```json
{
  "plan_no": "EHS-EP-001",
  "name": "化学品泄漏应急处置预案",
  "plan_type": "专项预案",
  "scope": "全厂区",
  "trigger_conditions": "当发生化学品泄漏，且泄漏量超过10升或可能影响周边环境时启动",
  "response_procedures": "1. 立即启动应急响应... 2. 组织人员疏散... 3. 采取控制措施...",
  "responsible_persons": ["安全总监", "车间主任", "环保主管"],
  "contact_info": "应急电话：12345",
  "status": "active"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| plan_no | string | 是 | 预案编号（唯一） |
| name | string | 是 | 预案名称 |
| plan_type | string | 是 | 预案类型（综合预案、专项预案、现场处置方案） |
| scope | string | 是 | 适用范围 |
| trigger_conditions | string | 是 | 触发条件 |
| response_procedures | string | 是 | 响应程序 |
| responsible_persons | array | 是 | 责任人 |
| contact_info | string | 是 | 联系方式 |
| status | string | 是 | 状态（draft, active, inactive） |

---

### 4.4 更新应急预案

**端点**: `PUT /api/v1/plans/{id}`

**描述**: 更新指定应急预案

**认证**: 需要

**权限**: ehs:plan:write

---

### 4.5 删除应急预案

**端点**: `DELETE /api/v1/plans/{id}`

**描述**: 删除指定应急预案

**认证**: 需要

**权限**: ehs:plan:delete

---

## 5. 演练记录管理接口

### 5.1 获取演练记录列表

**端点**: `GET /api/v1/drills`

**描述**: 获取所有演练记录

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| plan_id | string | 否 | 关联的预案 ID |
| drill_date | string | 否 | 演练日期 |

---

### 5.2 获取演练记录详情

**端点**: `GET /api/v1/drills/{id}`

**描述**: 获取指定演练记录的详细信息

**认证**: 需要

---

### 5.3 创建演练记录

**端点**: `POST /api/v1/drills`

**描述**: 创建新的演练记录

**认证**: 需要

**权限**: ehs:drill:write

**请求体**:

```json
{
  "drill_no": "EHS-DR-2026-001",
  "plan_id": "plan-001",
  "drill_name": "化学品泄漏应急演练",
  "participants": ["安全员", "车间员工", "环保人员"],
  "duration_hours": 2,
  "location": "2号车间",
  "summary": "演练顺利完成，各参演人员按照预案要求执行相应动作",
  "issues_found": "部分人员对防护设备使用不够熟练",
  "improvements": "加强个人防护装备培训"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| drill_no | string | 是 | 演练编号（唯一） |
| plan_id | string | 否 | 关联的预案 ID |
| drill_name | string | 是 | 演练名称 |
| participants | array | 是 | 参与人员 |
| duration_hours | number | 是 | 演练时长（小时） |
| location | string | 是 | 演练地点 |
| summary | string | 是 | 演练总结 |
| issues_found | string | 否 | 发现的问题 |
| improvements | string | 否 | 改进措施 |

---

### 5.4 更新演练记录

**端点**: `PUT /api/v1/drills/{id}`

**描述**: 更新指定演练记录

**认证**: 需要

**权限**: ehs:drill:write

---

### 5.5 删除演练记录

**端点**: `DELETE /api/v1/drills/{id}`

**描述**: 删除指定演练记录

**认证**: 需要

**权限**: ehs:drill:delete

---

## 6. 健康检查

### 6.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查环境健康安全系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8008/health
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
| HAZARD_NOT_FOUND | 404 | 安全隐患不存在 |
| CHECK_NOT_FOUND | 404 | 安全检查不存在 |
| PLAN_NOT_FOUND | 404 | 应急预案不存在 |
| DRILL_NOT_FOUND | 404 | 演练记录不存在 |
| DUPLICATE_NO | 409 | 编号已存在 |
| INVALID_STATUS | 400 | 无效的状态 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 8. 风险等级说明

| 等级 | 说明 |
|------|------|
| 重大风险 | 可能造成重大人员伤亡或财产损失 |
| 较大风险 | 可能造成人员伤害或一定财产损失 |
| 一般风险 | 可能造成人员轻伤或轻微财产损失 |
| 低风险 | 后果可忽略 |

---

## 9. 隐患类别说明

| 类别 | 说明 |
|------|------|
| 化学品管理 | 化学品存储、使用、运输相关 |
| 设备安全 | 生产设备安全性能 |
| 电气安全 | 电气设备、线路安全 |
| 消防安全 | 消防设施、通道管理 |
| 作业环境 | 作业场所环境条件 |
| 人员行为 | 人员操作规范 |
| 应急管理 | 应急预案、演练 |
| 其他 | 其他安全隐患 |

---

## 10. 检查类型说明

| 类型 | 说明 |
|------|------|
| 日常巡检 | 每日例行检查 |
| 定期检查 | 周期性全面检查 |
| 专项检查 | 针对特定领域的检查 |
| 季节性检查 | 季节性安全检查 |
| 节前检查 | 重大节假日前检查 |

---

## 11. 预案类型说明

| 类型 | 说明 |
|------|------|
| 综合预案 | 企业总体应急预案 |
| 专项预案 | 针对特定事故类型的预案 |
| 现场处置方案 | 针对具体装置、场所的预案 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 初始版本 |
