# TOPEMS 报表系统 API

**服务**: report-service
**端口**: 待定
**版本**: v1

---

## 1. 概述

报表系统 API 提供报表生成、导出和管理功能，支持多种报表类型和导出格式。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 报表列表 | /api/v1/reports | GET |
| 报表详情 | /api/v1/reports/{id} | GET |
| 创建报表 | /api/v1/reports | POST |
| 删除报表 | /api/v1/reports/{id} | DELETE |
| 导出报表 | /api/v1/reports/{id}/export | POST |
| 报表模板列表 | /api/v1/templates | GET |
| 创建报表模板 | /api/v1/templates | POST |
| 报表类型列表 | /api/v1/report-types | GET |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### ReportConfig（报表配置）

```json
{
  "report_type": "rs_project_progress",
  "format": "excel",
  "title": "研发项目进度报表",
  "description": "展示所有研发项目的当前进度",
  "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
  "date_range": {
    "start_date": "2026-01-01",
    "end_date": "2026-05-31"
  },
  "filters": {
    "status": "active"
  }
}
```

#### ReportTemplate（报表模板）

```json
{
  "id": "template-001",
  "name": "研发项目进度报表模板",
  "report_type": "rs_project_progress",
  "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
  "description": "研发项目进度的标准报表模板",
  "created_at": "2026-05-20T10:00:00Z"
}
```

#### ReportData（报表数据）

```json
{
  "id": "report-001",
  "config": {
    "report_type": "rs_project_progress",
    "format": "excel",
    "title": "研发项目进度报表",
    "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"]
  },
  "template": {
    "id": "template-001",
    "name": "研发项目进度报表模板"
  },
  "data": [
    {
      "项目名称": "新型催化剂研发",
      "负责人": "张工程师",
      "开始日期": "2026-01-01",
      "结束日期": "2026-12-31",
      "进度": "45%",
      "状态": "进行中"
    }
  ],
  "row_count": 15,
  "created_at": "2026-05-22T10:00:00Z"
}
```

#### ExportResult（导出结果）

```json
{
  "filename": "report_2026-05-22.xlsx",
  "format": "excel",
  "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "row_count": 15,
  "report_type": "rs_project_progress",
  "download_url": "/api/v1/reports/report-001/download/report_2026-05-22.xlsx"
}
```

---

## 2. 报表类型

### 2.1 支持的报表类型

| 类型代码 | 名称 | 模块 |
|----------|------|------|
| rs_project_progress | 研发项目进度报表 | 研发系统 |
| rs_experiment_record | 试验记录报表 | 研发系统 |
| lims_inspection_stats | 实验室检验统计 | 实验室系统 |
| lims_sample_summary | 样品汇总报表 | 实验室系统 |
| qms_quality_analysis | 质量分析报表 | 质量系统 |
| qms_defect_stats | 缺陷统计报表 | 质量系统 |
| ehs_safety_check | 安全检查报表 | 安全系统 |
| ehs_risk_assessment | 风险评估报表 | 安全系统 |
| srm_supplier_eval | 供应商评估报表 | 供应商系统 |
| srm_purchase_stats | 采购统计报表 | 供应商系统 |
| pdm_production_stats | 生产统计报表 | 生产系统 |
| pdm_process_summary | 工艺汇总报表 | 生产系统 |

### 2.2 支持的导出格式

| 格式代码 | 说明 | MIME 类型 |
|----------|------|-----------|
| excel | Excel 表格 | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| pdf | PDF 文档 | application/pdf |
| csv | CSV 文件 | text/csv |

---

## 3. 报表管理接口

### 3.1 获取报表列表

**端点**: `GET /api/v1/reports`

**描述**: 获取所有已生成的报表

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| report_type | string | 否 | 报表类型 |

**请求示例**:

```bash
curl -X GET "http://localhost:8011/api/v1/reports?page=1&page_size=20&report_type=rs_project_progress" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "report-001",
      "config": {
        "report_type": "rs_project_progress",
        "format": "excel",
        "title": "研发项目进度报表",
        "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"]
      },
      "row_count": 15,
      "created_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "report-002",
      "config": {
        "report_type": "lims_inspection_stats",
        "format": "pdf",
        "title": "实验室检验统计报表",
        "columns": ["样品名称", "检验日期", "检验项目", "结论"]
      },
      "row_count": 50,
      "created_at": "2026-05-22T09:00:00Z"
    }
  ],
  "error": null
}
```

---

### 3.2 获取报表详情

**端点**: `GET /api/v1/reports/{id}`

**描述**: 获取指定报表的详细信息，包括数据内容

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 报表 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8011/api/v1/reports/report-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "report-001",
    "config": {
      "report_type": "rs_project_progress",
      "format": "excel",
      "title": "研发项目进度报表",
      "description": "展示所有研发项目的当前进度",
      "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
      "date_range": {
        "start_date": "2026-01-01",
        "end_date": "2026-05-31"
      },
      "filters": {
        "status": "active"
      }
    },
    "template": {
      "id": "template-001",
      "name": "研发项目进度报表模板"
    },
    "data": [
      {
        "项目名称": "新型催化剂研发",
        "负责人": "张工程师",
        "开始日期": "2026-01-01",
        "结束日期": "2026-12-31",
        "进度": "45%",
        "状态": "进行中"
      },
      {
        "项目名称": "高分子材料改性研究",
        "负责人": "李工程师",
        "开始日期": "2026-03-01",
        "结束日期": "2026-09-30",
        "进度": "30%",
        "状态": "进行中"
      }
    ],
    "row_count": 2,
    "created_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 3.3 创建报表

**端点**: `POST /api/v1/reports`

**描述**: 创建新的报表

**认证**: 需要

**权限**: report:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "config": {
    "report_type": "rs_project_progress",
    "format": "excel",
    "title": "研发项目进度报表",
    "description": "展示所有研发项目的当前进度",
    "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
    "date_range": {
      "start_date": "2026-01-01",
      "end_date": "2026-05-31"
    },
    "filters": {
      "status": "active"
    }
  },
  "use_template": "template-001"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| config | object | 是 | 报表配置 |
| config.report_type | string | 是 | 报表类型 |
| config.format | string | 是 | 导出格式（excel, pdf, csv） |
| config.title | string | 是 | 报表标题 |
| config.description | string | 否 | 报表描述 |
| config.columns | array | 是 | 显示列 |
| config.date_range | object | 否 | 日期范围 |
| config.filters | object | 否 | 筛选条件 |
| use_template | string | 否 | 使用模板 ID |

**请求示例**:

```bash
curl -X POST http://localhost:8011/api/v1/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "config": {
      "report_type": "rs_project_progress",
      "format": "excel",
      "title": "研发项目进度报表",
      "description": "展示所有研发项目的当前进度",
      "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
      "date_range": {
        "start_date": "2026-01-01",
        "end_date": "2026-05-31"
      },
      "filters": {
        "status": "active"
      }
    }
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "report-001",
    "config": {
      "report_type": "rs_project_progress",
      "format": "excel",
      "title": "研发项目进度报表",
      "description": "展示所有研发项目的当前进度",
      "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"]
    },
    "data": [
      {
        "项目名称": "新型催化剂研发",
        "负责人": "张工程师",
        "开始日期": "2026-01-01",
        "结束日期": "2026-12-31",
        "进度": "45%",
        "状态": "进行中"
      }
    ],
    "row_count": 1,
    "created_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 3.4 删除报表

**端点**: `DELETE /api/v1/reports/{id}`

**描述**: 删除指定报表

**认证**: 需要

**权限**: report:delete

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 报表 ID |

**请求示例**:

```bash
curl -X DELETE http://localhost:8011/api/v1/reports/report-001 \
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

## 4. 报表导出接口

### 4.1 导出报表

**端点**: `POST /api/v1/reports/{id}/export`

**描述**: 导出报表为指定格式

**认证**: 需要

**权限**: report:export

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 报表 ID |

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "format": "excel",
  "custom_filename": "项目进度_2026年5月"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| format | string | 是 | 导出格式（excel, pdf, csv） |
| custom_filename | string | 否 | 自定义文件名 |

**请求示例**:

```bash
curl -X POST http://localhost:8011/api/v1/reports/report-001/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "format": "excel",
    "custom_filename": "项目进度_2026年5月"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "filename": "项目进度_2026年5月.xlsx",
    "format": "excel",
    "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "row_count": 15,
    "report_type": "rs_project_progress",
    "download_url": "/api/v1/reports/report-001/download/项目进度_2026年5月.xlsx"
  },
  "error": null
}
```

---

## 5. 报表模板管理接口

### 5.1 获取报表模板列表

**端点**: `GET /api/v1/templates`

**描述**: 获取所有报表模板

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| report_type | string | 否 | 报表类型 |

---

### 5.2 创建报表模板

**端点**: `POST /api/v1/templates`

**描述**: 创建新的报表模板

**认证**: 需要

**权限**: report:template:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "name": "研发项目进度报表模板",
  "report_type": "rs_project_progress",
  "columns": ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
  "description": "研发项目进度的标准报表模板"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 模板名称 |
| report_type | string | 是 | 报表类型 |
| columns | array | 是 | 列配置 |
| description | string | 否 | 模板描述 |

---

## 6. 报表类型接口

### 6.1 获取报表类型列表

**端点**: `GET /api/v1/report-types`

**描述**: 获取所有可用的报表类型

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8011/api/v1/report-types \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "type": "rs_project_progress",
      "name": "研发项目进度报表",
      "module": "rs"
    },
    {
      "type": "rs_experiment_record",
      "name": "试验记录报表",
      "module": "rs"
    },
    {
      "type": "lims_inspection_stats",
      "name": "实验室检验统计",
      "module": "lims"
    },
    {
      "type": "lims_sample_summary",
      "name": "样品汇总报表",
      "module": "lims"
    },
    {
      "type": "qms_quality_analysis",
      "name": "质量分析报表",
      "module": "qms"
    },
    {
      "type": "qms_defect_stats",
      "name": "缺陷统计报表",
      "module": "qms"
    },
    {
      "type": "ehs_safety_check",
      "name": "安全检查报表",
      "module": "ehs"
    },
    {
      "type": "ehs_risk_assessment",
      "name": "风险评估报表",
      "module": "ehs"
    },
    {
      "type": "srm_supplier_eval",
      "name": "供应商评估报表",
      "module": "srm"
    },
    {
      "type": "srm_purchase_stats",
      "name": "采购统计报表",
      "module": "srm"
    },
    {
      "type": "pdm_production_stats",
      "name": "生产统计报表",
      "module": "pdm"
    },
    {
      "type": "pdm_process_summary",
      "name": "工艺汇总报表",
      "module": "pdm"
    }
  ],
  "error": null
}
```

---

## 7. 健康检查

### 7.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查报表系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8011/health
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
| REPORT_NOT_FOUND | 404 | 报表不存在 |
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 |
| REPORT_TYPE_NOT_FOUND | 404 | 报表类型不存在 |
| EXPORT_FORMAT_NOT_SUPPORTED | 400 | 不支持的导出格式 |
| NO_DATA_AVAILABLE | 400 | 没有可用数据 |
| EXPORT_FAILED | 500 | 导出失败 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 9. 权限说明

| 权限代码 | 说明 |
|----------|------|
| report:read | 查看报表 |
| report:write | 创建报表 |
| report:delete | 删除报表 |
| report:export | 导出报表 |
| report:template:write | 管理模板 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 初始版本 |
