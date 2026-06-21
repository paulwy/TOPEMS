# TOPEMS API 接口文档汇总

**版本**: v2  
**更新日期**: 2026-06-20  
**服务总数**: 15

---

> **API 路径格式变更 (v2)**
> 
> 新格式: `/api/{service}/{resource}`  
> 例如: `/api/iam/auth/login`, `/api/hrm/employees`, `/api/pm/projects`
> 
> 各服务路径前缀:
> - IAM: `/api/iam/` | HRM: `/api/hrm/` | CRM: `/api/crm/` | ERP: `/api/erp/`
> - PM: `/api/pm/` | SCM: `/api/scm/` | SRM: `/api/srm/` | WMS: `/api/wms/`
> - RS: `/api/rs/` | AI: `/api/ai/` | EHS: `/api/ehs/` | QMS: `/api/qms/`
> - LIMS: `/api/lims/` | MES: `/api/mes/` | BI: `/api/bi/` | Report: `/api/report/`
> - Mail: `/api/mail/` | Notification: `/api/notification/` | Integration: `/api/integration/`
> - GIS: `/api/gis/` | PDM: `/api/pdm/` | Mobile: `/api/mobile/` | Master: `/api/master/`

---

## 目录

1. [平台服务](#1-平台服务)
   - [IAM 认证服务](#11-iam-认证服务-topems-iam)
   - [文档服务](#12-文档服务-topems-doc)
   - [AI服务](#13-ai服务-topems-ai)
   - [工作流服务](#14-工作流服务-topems-flow)

2. [业务服务](#2-业务服务)
   - [人力资源服务](#21-人力资源服务-topems-hrm)
   - [研发管理服务](#22-研发管理服务-topems-rs)
   - [实验室管理服务](#23-实验室管理服务-topems-lims)
   - [质量管理服务](#24-质量管理服务-topems-qms)
   - [安全环保服务](#25-安全环保服务-topems-ehs)
   - [供应商管理服务](#26-供应商管理服务-topems-srm)
   - [产品数据管理服务](#27-产品数据管理服务-topems-pdm)
   - [移动工作台服务](#28-移动工作台服务-topems-mobile)

3. [公共服务](#3-公共服务)
   - [报表服务](#31-报表服务-topems-report)
   - [通知服务](#32-通知服务)

4. [统一规范](#4-统一规范)
   - [认证方式](#41-认证方式)
   - [响应格式](#42-响应格式)
   - [错误码](#43-错误码)
   - [分页规范](#44-分页规范)

---

## 1. 平台服务

### 1.1 IAM 认证服务 (topems-iam)

**服务地址**: `http://localhost:8020`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/auth/login` | POST | 用户登录 |
| `/api/v1/auth/logout` | POST | 用户登出 |
| `/api/v1/auth/refresh` | POST | 刷新Token |
| `/api/v1/users` | GET | 获取用户列表 |
| `/api/v1/users/{id}` | GET | 获取用户详情 |
| `/api/v1/users` | POST | 创建用户 |
| `/api/v1/users/{id}` | PUT | 更新用户 |
| `/api/v1/users/{id}` | DELETE | 删除用户 |
| `/api/v1/roles` | GET | 获取角色列表 |
| `/api/v1/roles` | POST | 创建角色 |
| `/api/v1/permissions` | GET | 获取权限列表 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- User（用户）
- Role（角色）
- Permission（权限）
- ApiKey（API密钥）

### 1.2 文档服务 (topems-doc)

**服务地址**: `http://localhost:8001`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/files` | GET | 获取文件列表 |
| `/api/v1/files/{id}` | GET | 获取文件详情 |
| `/api/v1/files` | POST | 上传文件 |
| `/api/v1/files/{id}` | PUT | 更新文件 |
| `/api/v1/files/{id}` | DELETE | 删除文件 |
| `/api/v1/folders` | GET | 获取文件夹列表 |
| `/api/v1/folders` | POST | 创建文件夹 |
| `/api/v1/folders/{id}` | DELETE | 删除文件夹 |
| `/api/v1/files/{id}/download` | GET | 下载文件 |
| `/api/v1/files/{id}/versions` | GET | 获取文件版本 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- File（文件）
- Folder（文件夹）
- FileVersion（文件版本）

### 1.3 AI服务 (topems-ai)

**服务地址**: `http://localhost:8062`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/ai/chat` | POST | AI对话 |
| `/api/v1/ai/summary` | POST | 文档摘要 |
| `/api/v1/ai/search` | GET | 智能搜索 |
| `/api/v1/ai/knowledge` | GET | 获取知识库列表 |
| `/api/v1/ai/knowledge` | POST | 添加知识库 |
| `/api/v1/ai/knowledge/{id}` | DELETE | 删除知识库 |
| `/api/v1/ai/embeddings` | POST | 生成向量 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- ChatMessage（对话消息）
- KnowledgeBase（知识库）
- EmbeddingRecord（向量记录）

### 1.4 工作流服务 (topems-flow)

**服务地址**: `http://localhost:8000`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/workflows` | GET | 获取流程模板列表 |
| `/api/v1/workflows/{id}` | GET | 获取流程模板详情 |
| `/api/v1/workflows` | POST | 创建流程模板 |
| `/api/v1/workflows/{id}` | PUT | 更新流程模板 |
| `/api/v1/workflows/{id}` | DELETE | 删除流程模板 |
| `/api/v1/instances` | GET | 获取流程实例列表 |
| `/api/v1/instances` | POST | 启动流程实例 |
| `/api/v1/instances/{id}` | GET | 获取流程实例详情 |
| `/api/v1/tasks` | GET | 获取审批任务列表 |
| `/api/v1/tasks/{id}` | POST | 处理审批任务 |
| `/api/v1/notifications` | GET | 获取通知列表 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Workflow（流程模板）
- Instance（流程实例）
- Task（审批任务）
- Notification（通知）

---

## 2. 业务服务

### 2.1 人力资源服务 (topems-hrm)

**服务地址**: `http://localhost:8011`

**详细 API 文档**: [API_HRM.md](./API_HRM.md)

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/hrm/setup/progress` | GET | 获取初始化进度 |
| `/api/v1/hrm/setup/company` | POST | 更新公司信息 |
| `/api/v1/hrm/setup/departments` | POST | 批量创建部门 |
| `/api/v1/hrm/setup/positions` | POST | 批量创建职位 |
| `/api/v1/hrm/setup/admin` | POST | 创建管理员 |
| `/api/v1/hrm/setup/complete` | POST | 完成初始化 |
| `/api/v1/hrm/companies` | GET | 获取公司列表 |
| `/api/v1/hrm/companies/{id}` | GET | 获取公司详情 |
| `/api/v1/hrm/companies` | POST | 创建公司 |
| `/api/v1/hrm/departments` | GET | 获取部门列表 |
| `/api/v1/hrm/departments/{id}` | GET | 获取部门详情 |
| `/api/v1/hrm/departments` | POST | 创建部门 |
| `/api/v1/hrm/positions` | GET | 获取职位列表 |
| `/api/v1/hrm/positions/{id}` | GET | 获取职位详情 |
| `/api/v1/hrm/positions` | POST | 创建职位 |
| `/api/v1/hrm/employees` | GET | 获取员工列表 |
| `/api/v1/hrm/employees/{id}` | GET | 获取员工详情 |
| `/api/v1/hrm/employees` | POST | 创建员工 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Company（公司）
- Department（部门）
- Position（职位）
- Employee（员工）

### 2.2 研发管理服务 (topems-rs)

**服务地址**: `http://localhost:8020`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/projects` | GET | 获取项目列表 |
| `/api/v1/projects/{id}` | GET | 获取项目详情 |
| `/api/v1/projects` | POST | 创建项目 |
| `/api/v1/projects/{id}` | PUT | 更新项目 |
| `/api/v1/projects/{id}` | DELETE | 删除项目 |
| `/api/v1/projects/batch` | POST | 批量创建项目 |
| `/api/v1/projects/batch` | DELETE | 批量删除项目 |
| `/api/v1/experiments` | GET | 获取试验列表 |
| `/api/v1/experiments/{id}` | GET | 获取试验详情 |
| `/api/v1/experiments` | POST | 创建试验 |
| `/api/v1/experiments/{id}` | PUT | 更新试验 |
| `/api/v1/experiments/{id}` | DELETE | 删除试验 |
| `/api/v1/experiments/project/{projectId}` | GET | 获取项目试验列表 |
| `/api/v1/formulas` | GET | 获取配方列表 |
| `/api/v1/formulas/{id}` | GET | 获取配方详情 |
| `/api/v1/formulas` | POST | 创建配方 |
| `/api/v1/formulas/{id}` | PUT | 更新配方 |
| `/api/v1/materials` | GET | 获取物料列表 |
| `/api/v1/materials/{id}` | GET | 获取物料详情 |
| `/api/v1/patents` | GET | 获取专利列表 |
| `/api/v1/patents/{id}` | GET | 获取专利详情 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Project（项目）
- Experiment（试验记录）
- Formula（配方）
- Material（物料）
- Patent（专利）
- AuditLog（审计日志）

### 2.3 实验室管理服务 (topems-lims)

**服务地址**: `http://localhost:8032`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/samples` | GET | 获取样品列表 |
| `/api/v1/samples/{id}` | GET | 获取样品详情 |
| `/api/v1/samples` | POST | 创建样品 |
| `/api/v1/samples/{id}` | PUT | 更新样品 |
| `/api/v1/samples/{id}` | DELETE | 删除样品 |
| `/api/v1/processes` | GET | 获取检验流程列表 |
| `/api/v1/processes/{id}` | GET | 获取检验流程详情 |
| `/api/v1/processes` | POST | 创建检验流程 |
| `/api/v1/tasks` | GET | 获取检验任务列表 |
| `/api/v1/tasks/{id}` | GET | 获取检验任务详情 |
| `/api/v1/tasks` | POST | 创建检验任务 |
| `/api/v1/tasks/{id}` | PUT | 更新检验任务 |
| `/api/v1/tasks/{id}/complete_step` | POST | 完成检验步骤 |
| `/api/v1/records` | GET | 获取检验记录列表 |
| `/api/v1/records` | POST | 创建检验记录 |
| `/api/v1/records/task/{taskId}` | GET | 获取任务检验记录 |
| `/api/v1/instruments` | GET | 获取仪器列表 |
| `/api/v1/instruments/{id}` | GET | 获取仪器详情 |
| `/api/v1/reagents` | GET | 获取试剂列表 |
| `/api/v1/reagents/{id}` | GET | 获取试剂详情 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Sample（样品）
- InspectionProcess（检验流程）
- InspectionTask（检验任务）
- InspectionRecord（检验记录）
- Instrument（仪器）
- Reagent（试剂）

### 2.4 质量管理服务 (topems-qms)

**服务地址**: `http://localhost:8032`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/standards` | GET | 获取质量标准列表 |
| `/api/v1/standards/{id}` | GET | 获取质量标准详情 |
| `/api/v1/standards` | POST | 创建质量标准 |
| `/api/v1/standards/{id}` | PUT | 更新质量标准 |
| `/api/v1/standards/{id}` | DELETE | 删除质量标准 |
| `/api/v1/inspections` | GET | 获取检验记录列表 |
| `/api/v1/inspections/{id}` | GET | 获取检验记录详情 |
| `/api/v1/inspections` | POST | 创建检验记录 |
| `/api/v1/issues` | GET | 获取不合格品列表 |
| `/api/v1/issues/{id}` | GET | 获取不合格品详情 |
| `/api/v1/issues` | POST | 创建不合格品记录 |
| `/api/v1/issues/{id}` | PUT | 更新不合格品处理 |
| `/api/v1/actions` | GET | 获取纠正措施列表 |
| `/api/v1/actions/{id}` | GET | 获取纠正措施详情 |
| `/api/v1/actions` | POST | 创建纠正措施 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- QualityStandard（质量标准）
- Inspection（检验记录）
- NonConformity（不合格品）
- CorrectiveAction（纠正措施）

### 2.5 安全环保服务 (topems-ehs)

**服务地址**: `http://localhost:8032`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/safety/inspections` | GET | 获取安全检查列表 |
| `/api/v1/safety/inspections/{id}` | GET | 获取安全检查详情 |
| `/api/v1/safety/inspections` | POST | 创建安全检查 |
| `/api/v1/environmental/data` | GET | 获取环保数据列表 |
| `/api/v1/environmental/data/{id}` | GET | 获取环保数据详情 |
| `/api/v1/environmental/data` | POST | 添加环保数据 |
| `/api/v1/incidents` | GET | 获取事故记录列表 |
| `/api/v1/incidents/{id}` | GET | 获取事故记录详情 |
| `/api/v1/incidents` | POST | 创建事故记录 |
| `/api/v1/incidents/{id}` | PUT | 更新事故处理 |
| `/api/v1/trainings` | GET | 获取培训记录列表 |
| `/api/v1/trainings/{id}` | GET | 获取培训记录详情 |
| `/api/v1/trainings` | POST | 创建培训记录 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- SafetyInspection（安全检查）
- EnvironmentalData（环保数据）
- Incident（事故记录）
- Training（培训记录）

### 2.6 供应商管理服务 (topems-srm)

**服务地址**: `http://localhost:8041`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/suppliers` | GET | 获取供应商列表 |
| `/api/v1/suppliers/{id}` | GET | 获取供应商详情 |
| `/api/v1/suppliers` | POST | 创建供应商 |
| `/api/v1/suppliers/{id}` | PUT | 更新供应商 |
| `/api/v1/suppliers/{id}` | DELETE | 删除供应商 |
| `/api/v1/suppliers/{id}/evaluations` | GET | 获取供应商评估列表 |
| `/api/v1/suppliers/{id}/evaluations` | POST | 创建供应商评估 |
| `/api/v1/purchase/orders` | GET | 获取采购订单列表 |
| `/api/v1/purchase/orders/{id}` | GET | 获取采购订单详情 |
| `/api/v1/purchase/orders` | POST | 创建采购订单 |
| `/api/v1/purchase/orders/{id}` | PUT | 更新采购订单 |
| `/api/v1/purchase/items` | GET | 获取采购项目列表 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Supplier（供应商）
- SupplierEvaluation（供应商评估）
- PurchaseOrder（采购订单）
- PurchaseItem（采购项目）

### 2.7 产品数据管理服务 (topems-pdm)

**服务地址**: `http://localhost:8023`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/products` | GET | 获取产品列表 |
| `/api/v1/products/{id}` | GET | 获取产品详情 |
| `/api/v1/products` | POST | 创建产品 |
| `/api/v1/products/{id}` | PUT | 更新产品 |
| `/api/v1/products/{id}` | DELETE | 删除产品 |
| `/api/v1/products/{id}/versions` | GET | 获取产品版本列表 |
| `/api/v1/products/{id}/versions` | POST | 创建产品版本 |
| `/api/v1/boms` | GET | 获取BOM列表 |
| `/api/v1/boms/{id}` | GET | 获取BOM详情 |
| `/api/v1/boms` | POST | 创建BOM |
| `/api/v1/documents` | GET | 获取技术文档列表 |
| `/api/v1/documents/{id}` | GET | 获取技术文档详情 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Product（产品）
- ProductVersion（产品版本）
- BOM（物料清单）
- Document（技术文档）

### 2.8 移动工作台服务 (topems-mobile)

**服务地址**: `http://localhost:8070`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/dashboard/stats` | GET | 获取仪表盘统计数据 |
| `/api/v1/tasks` | GET | 获取任务列表 |
| `/api/v1/tasks/{id}` | GET | 获取任务详情 |
| `/api/v1/tasks/{id}/complete` | POST | 完成任务 |
| `/api/v1/inspections` | GET | 获取巡检列表 |
| `/api/v1/inspections/{id}` | GET | 获取巡检详情 |
| `/api/v1/inspections` | POST | 创建巡检记录 |
| `/api/v1/scans` | POST | 扫码操作 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- DashboardStats（仪表盘统计）
- Task（任务）
- Inspection（巡检记录）
- ScanRecord（扫码记录）

---

## 3. 公共服务

### 3.1 报表服务 (topems-report)

**服务地址**: `http://localhost:8060`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/reports` | GET | 获取报表列表 |
| `/api/v1/reports/{id}` | GET | 获取报表详情 |
| `/api/v1/reports/{id}/execute` | POST | 执行报表 |
| `/api/v1/reports/{id}/export` | GET | 导出报表 |
| `/api/v1/reports/templates` | GET | 获取报表模板列表 |
| `/api/v1/dashboards` | GET | 获取仪表盘列表 |
| `/api/v1/health` | GET | 健康检查 |

**数据模型**:
- Report（报表）
- ReportTemplate（报表模板）
- Dashboard（仪表盘）

### 3.2 通知服务

**服务地址**: `http://localhost:8000`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/notifications` | GET | 获取通知列表 |
| `/api/v1/notifications` | POST | 创建通知 |
| `/api/v1/notifications/unread` | GET | 获取未读通知列表 |
| `/api/v1/notifications/unread-count` | GET | 获取未读通知数量 |
| `/api/v1/notifications/{id}/read` | PUT | 标记通知为已读 |
| `/api/v1/notifications/read-all` | PUT | 批量标记所有通知为已读 |
| `/api/v1/notifications/{id}` | DELETE | 删除通知 |
| `/ws/notifications` | WebSocket | WebSocket通知订阅 |
| `/health` | GET | 健康检查 |

**数据模型**:
- Notification（通知）

### 3.3 邮件服务 (topems-mail)

**服务地址**: `http://localhost:8000`

| API端点 | HTTP方法 | 功能描述 |
|---------|---------|---------|
| `/api/v1/mail/emails` | GET | 获取邮件列表 |
| `/api/v1/mail/emails` | POST | 发送邮件 |
| `/api/v1/mail/emails/{id}` | GET | 获取邮件详情 |
| `/api/v1/mail/emails/{id}` | DELETE | 删除邮件 |
| `/api/v1/mail/emails/send-with-template` | POST | 使用模板发送邮件 |
| `/api/v1/mail/emails/resend` | POST | 批量重发邮件 |
| `/api/v1/mail/emails/stats` | GET | 获取邮件统计 |
| `/api/v1/mail/templates` | GET | 获取邮件模板列表 |
| `/api/v1/mail/templates/{id}` | GET | 获取邮件模板详情 |
| `/api/v1/mail/templates` | POST | 创建邮件模板 |
| `/api/v1/mail/templates/{id}` | PUT | 更新邮件模板 |
| `/api/v1/mail/templates/{id}` | DELETE | 删除邮件模板 |
| `/api/v1/mail/attachments` | GET | 获取附件列表 |
| `/api/v1/mail/attachments` | POST | 上传附件 |
| `/api/v1/mail/attachments/{id}` | GET | 获取附件详情 |
| `/api/v1/mail/attachments/{id}` | DELETE | 删除附件 |
| `/api/v1/mail/attachments/{id}/download` | GET | 下载附件 |
| `/api/v1/mail/attachments/email/{email_id}` | GET | 获取邮件的所有附件 |
| `/health` | GET | 健康检查 |
| `/api/v1/health/detailed` | GET | 详细健康检查 |
| `/api/v1/metrics` | GET | 服务指标 |

**权限说明**:
- `email_read`: 读取邮件和模板
- `email_write`: 发送和管理邮件
- `template_read`: 读取模板
- `template_write`: 创建/更新/删除模板
- `attachment_read`: 读取附件
- `attachment_write`: 上传/删除附件

**请求示例 - 发送邮件**:
```bash
curl -X POST http://localhost:8000/api/v1/mail/emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "to_addresses": ["recipient@example.com"],
    "cc_addresses": ["cc@example.com"],
    "subject": "邮件主题",
    "body": "邮件正文",
    "priority": "normal"
  }'
```

**请求示例 - 使用模板发送**:
```bash
curl -X POST http://localhost:8000/api/v1/mail/emails/send-with-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "to_addresses": ["recipient@example.com"],
    "template_code": "workflow_approval",
    "template_data": {
      "user_name": "张三",
      "process_name": "请假申请",
      "approval_status": "已通过"
    },
    "priority": "high"
  }'
```

**数据模型**:
- Email（邮件）
- EmailTemplate（邮件模板）

---

## 4. 统一规范

### 4.1 认证方式

所有 API 接口（除健康检查外）均需要认证。

**JWT Token 认证**:
```bash
curl -X GET "http://localhost:8020/api/v1/projects" \
  -H "Authorization: Bearer <your-token>"
```

### 4.2 响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

**错误响应**:
```json
{
  "code": 401,
  "message": "未认证",
  "data": null,
  "timestamp": 1717056000
}
```

### 4.3 错误码

| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| 200 | 成功 | 200 |
| 400 | 请求参数错误 | 400 |
| 401 | 未认证 | 401 |
| 403 | 无权限 | 403 |
| 404 | 资源不存在 | 404 |
| 500 | 服务器错误 | 500 |
| 1001 | 数据库错误 | 500 |
| 1002 | 认证失败 | 401 |
| 1003 | 参数验证失败 | 400 |

### 4.4 分页规范

**请求参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| page_size | integer | 20 | 每页数量 |

**分页响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  },
  "timestamp": 1717056000
}
```

---

## 附录：服务端口汇总

| 服务类别 | 服务名称 | 端口 | 状态 | 说明 |
|---------|---------|------|------|------|
| **核心平台** | unified-core | 8000 | ✅ | 包含 IAM, Doc, Flow, File, Communication, Notification |
| | topems-pm | 8001 | ✅ | 项目管理 |
| | topems-integration | 8005 | ✅ | 集成服务 |
| **业务服务** | topems-erp | 8010 | ✅ | 企业资源计划 |
| | topems-hrm | 8011 | ✅ | 人力资源管理 |
| | topems-crm | 8012 | ✅ | 客户关系管理 |
| **研发创新** | topems-rs | 8020 | ✅ | 研发管理 |
| | manufacturing | 8023 | ✅ | 制造服务 (PDM + MES) |
| **制造质量** | quality-assurance | 8032 | ✅ | 质量保证 (QMS + LIMS + EHS) |
| **供应链** | topems-scm | 8040 | ✅ | 供应链管理 |
| | topems-srm | 8041 | ✅ | 供应商管理 |
| | topems-wms | 8042 | ✅ | 仓储管理 |
| **基础设施** | topems-gis | 8053 | ✅ | 地理信息服务 |
| **数据分析** | topems-ai | 8062 | ✅ | AI 服务 |
| **扩展服务** | topems-mobile | 8070 | ✅ | 移动服务 |

**状态说明**: ✅ 已实现 | 🔄 开发中 | 📋 规划中

---

**文档版本**: v1.0  
**最后更新**: 2026-05-30  
**文档位置**: `docs/API_OVERVIEW.md`
