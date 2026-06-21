# TOPEMS 权限测试用例清单

> 版本: v1.1
> 更新日期: 2026-06-21
> 覆盖模块: 36个核心资源
> 权限级别: 五级权限模型
> 自动化测试: IAM 模块已完成

---

## 快速开始

### 运行 IAM 模块自动化测试

```bash
# 初始化测试数据
psql -U topems -d topems -f database/test/iam_test_data.sql

# 运行所有测试
./scripts/run-iam-tests.sh

# 仅运行后端测试
./scripts/run-iam-tests.sh --backend

# 仅运行前端测试
./scripts/run-iam-tests.sh --frontend

# 生成测试报告
./scripts/run-iam-tests.sh --report
```

### 测试文件位置

| 类型 | 文件路径 |
|------|----------|
| 后端测试 | `svc/unified-core/tests/iam_permission_tests.rs` |
| 前端测试 | `apps/web/e2e/iam-permission.spec.ts` |
| 测试数据 | `database/test/iam_test_data.sql` |
| 运行脚本 | `scripts/run-iam-tests.sh` |

---

## 一、测试概述

### 1.1 测试目标

验证 TOPEMS 系统中 36 个核心模块的权限控制是否正确实施，确保五级权限模型（租户级、系统级、公司级、项目级、数据级）的完整性和安全性。

### 1.2 测试范围

| 类别 | 模块数量 | 模块列表 |
|------|----------|----------|
| 核心模块 | 7 | iam, workflow, doc, file, notification, im, integration |
| 业务模块 | 12 | hrm, pm, erp, crm, scm, rs, ai, gis, qms, ehs, mes, wms |
| 系统模块 | 4 | system, audit, dictionaries, plugins |
| 功能模块 | 13 | attendance, company, department, documents, employee, leave, payroll, performance, permissions, projects, roles, users, workflows |

### 1.3 权限级别定义

| 级别 | 说明 | 验证要点 |
|------|------|----------|
| **租户级** | 多租户隔离，租户间数据不可见 | 跨租户访问被拒绝 |
| **系统级** | 系统设置、监控、日志等全局配置 | 仅 superadmin/admin 可访问 |
| **公司级** | 公司范围内的数据和配置 | 公司成员可访问，非成员不可见 |
| **项目级** | 项目范围内的数据和操作 | 项目成员可访问，非成员受限 |
| **数据级** | 单条数据的增删改查 | 根据权限配置精确控制 |

### 1.4 操作类型

| 操作 | 权限码格式 | 说明 |
|------|------------|------|
| read | `{module}:read` | 只读访问 |
| write | `{module}:write` | 创建/更新操作 |
| delete | `{module}:delete` | 删除操作 |
| admin | `{module}:admin` | 管理操作（包含所有权限） |
| 特殊操作 | `{module}:{action}` | 如 `workflow:approve`, `system:settings` |

---

## 二、核心模块测试用例

### 2.1 IAM 模块 (iam)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| IAM-001 | 超级管理员查看用户列表 | 系统级 | read | 成功返回所有用户 | 1. 以 superadmin 登录<br>2. GET /api/iam/users<br>3. 验证返回用户列表 |
| IAM-002 | 普通用户查看用户列表 | 系统级 | read | 仅返回同公司用户 | 1. 以 employee 登录<br>2. GET /api/iam/users<br>3. 验证返回受限用户列表 |
| IAM-003 | 管理员创建用户 | 系统级 | write | 成功创建用户 | 1. 以 admin 登录<br>2. POST /api/iam/users<br>3. 验证用户创建成功 |
| IAM-004 | 无权限用户创建用户 | 系统级 | write | 返回 403 | 1. 以 employee 登录<br>2. POST /api/iam/users<br>3. 验证返回权限不足 |
| IAM-005 | 管理员删除用户 | 系统级 | delete | 成功删除用户 | 1. 以 admin 登录<br>2. DELETE /api/iam/users/{id}<br>3. 验证用户已删除 |
| IAM-006 | 超级管理员分配角色 | 系统级 | admin | 成功分配角色 | 1. 以 superadmin 登录<br>2. PUT /api/iam/users/{id}/roles<br>3. 验证角色分配成功 |
| IAM-007 | 跨租户用户访问 | 租户级 | read | 返回空或 403 | 1. 以租户A用户登录<br>2. 尝试访问租户B用户<br>3. 验证访问被拒绝 |
| IAM-008 | 用户修改自己密码 | 数据级 | write | 成功修改 | 1. 以任意用户登录<br>2. PUT /api/iam/users/me/password<br>3. 验证密码修改成功 |
| IAM-009 | 用户修改他人密码 | 数据级 | write | 返回 403 | 1. 以普通用户登录<br>2. 尝试修改他人密码<br>3. 验证返回权限不足 |

### 2.2 工作流模块 (workflow)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| WF-001 | 查看工作流列表 | 系统级 | read | 成功返回列表 | 1. 登录系统<br>2. GET /api/flow/workflows<br>3. 验证返回工作流列表 |
| WF-002 | 创建工作流 | 系统级 | write | 成功创建 | 1. 以 admin 登录<br>2. POST /api/flow/workflows<br>3. 验证工作流创建成功 |
| WF-003 | 删除工作流 | 系统级 | delete | 成功删除 | 1. 以 admin 登录<br>2. DELETE /api/flow/workflows/{id}<br>3. 验证工作流已删除 |
| WF-004 | 发布工作流 | 系统级 | admin | 成功发布 | 1. 以 admin 登录<br>2. POST /api/flow/workflows/{id}/publish<br>3. 验证工作流状态变更 |
| WF-005 | 发起审批流程 | 项目级 | write | 成功发起 | 1. 登录系统<br>2. POST /api/flow/instances<br>3. 验证审批流程创建成功 |
| WF-006 | 审批人批准流程 | 数据级 | approve | 成功批准 | 1. 以审批人身份登录<br>2. POST /api/flow/approvals/{id}/approve<br>3. 验证审批通过 |
| WF-007 | 非审批人批准流程 | 数据级 | approve | 返回 403 | 1. 以非审批人登录<br>2. 尝试批准流程<br>3. 验证返回权限不足 |
| WF-008 | 查看待审批列表 | 数据级 | read | 返回待审批项 | 1. 以审批人身份登录<br>2. GET /api/flow/approvals/pending<br>3. 验证返回待审批列表 |

### 2.3 文档模块 (doc)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| DOC-001 | 查看文档列表 | 公司级 | read | 返回可访问文档 | 1. 登录系统<br>2. GET /api/core/doc/documents<br>3. 验证返回文档列表 |
| DOC-002 | 创建文档 | 公司级 | write | 成功创建 | 1. 以有权限用户登录<br>2. POST /api/core/doc/documents<br>3. 验证文档创建成功 |
| DOC-003 | 编辑他人文档 | 数据级 | write | 根据权限判断 | 1. 登录系统<br>2. PUT /api/core/doc/documents/{id}<br>3. 验证权限控制正确 |
| DOC-004 | 删除文档 | 数据级 | delete | 成功删除 | 1. 以有权限用户登录<br>2. DELETE /api/core/doc/documents/{id}<br>3. 验证文档已删除 |
| DOC-005 | 发布文档 | 数据级 | admin | 成功发布 | 1. 以文档管理员登录<br>2. POST /api/core/doc/documents/{id}/publish<br>3. 验证文档状态变更 |
| DOC-006 | 归档文档 | 数据级 | admin | 成功归档 | 1. 以文档管理员登录<br>2. POST /api/core/doc/documents/{id}/archive<br>3. 验证文档已归档 |
| DOC-007 | 使用模板生成文档 | 公司级 | write | 成功生成 | 1. 登录系统<br>2. POST /api/core/doc/templates/{id}/generate<br>3. 验证文档生成成功 |
| DOC-008 | 跨公司访问文档 | 公司级 | read | 返回 403 | 1. 以A公司用户登录<br>2. 尝试访问B公司文档<br>3. 验证访问被拒绝 |

### 2.4 文件模块 (file)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| FILE-001 | 上传文件 | 公司级 | write | 成功上传 | 1. 登录系统<br>2. POST /api/core/file/upload<br>3. 验证文件上传成功 |
| FILE-002 | 批量上传文件 | 公司级 | write | 成功上传 | 1. 登录系统<br>2. POST /api/core/file/upload/multiple<br>3. 验证批量上传成功 |
| FILE-003 | 下载文件 | 数据级 | read | 成功下载 | 1. 登录系统<br>2. GET /api/core/file/download/{id}<br>3. 验证文件下载成功 |
| FILE-004 | 下载他人私有文件 | 数据级 | read | 返回 403 | 1. 登录系统<br>2. 尝试下载他人私有文件<br>3. 验证访问被拒绝 |
| FILE-005 | 删除文件 | 数据级 | delete | 成功删除 | 1. 以有权限用户登录<br>2. DELETE /api/core/file/files/{id}<br>3. 验证文件已删除 |
| FILE-006 | 移动文件 | 数据级 | write | 成功移动 | 1. 以有权限用户登录<br>2. POST /api/core/file/files/{id}/move<br>3. 验证文件移动成功 |
| FILE-007 | 创建文件夹 | 公司级 | write | 成功创建 | 1. 登录系统<br>2. POST /api/core/file/folders<br>3. 验证文件夹创建成功 |
| FILE-008 | 删除文件夹 | 数据级 | delete | 成功删除 | 1. 以有权限用户登录<br>2. DELETE /api/core/file/folders/{id}<br>3. 验证文件夹已删除 |

### 2.5 通知模块 (notification)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| NOTIF-001 | 查看通知列表 | 数据级 | read | 返回个人通知 | 1. 登录系统<br>2. GET /api/v1/notifications<br>3. 验证返回个人通知列表 |
| NOTIF-002 | 查看未读通知 | 数据级 | read | 返回未读通知 | 1. 登录系统<br>2. GET /api/v1/notifications/unread<br>3. 验证返回未读通知 |
| NOTIF-003 | 标记通知已读 | 数据级 | write | 成功标记 | 1. 登录系统<br>2. PUT /api/v1/notifications/{id}<br>3. 验证通知状态变更 |
| NOTIF-004 | 全部标记已读 | 数据级 | write | 成功标记 | 1. 登录系统<br>2. PUT /api/v1/notifications/read-all<br>3. 验证所有通知已读 |
| NOTIF-005 | 发送通知 | 系统级 | write | 成功发送 | 1. 以 admin 登录<br>2. POST /api/core/comm/notify/send<br>3. 验证通知发送成功 |
| NOTIF-006 | 广播通知 | 系统级 | admin | 成功广播 | 1. 以 admin 登录<br>2. POST /api/core/comm/notify/broadcast<br>3. 验证广播发送成功 |
| NOTIF-007 | 访问他人通知 | 数据级 | read | 返回 403 | 1. 登录系统<br>2. 尝试访问他人通知<br>3. 验证访问被拒绝 |

### 2.6 即时通讯模块 (im)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| IM-001 | 查看聊天室列表 | 公司级 | read | 返回可访问聊天室 | 1. 登录系统<br>2. GET /api/core/comm/im/rooms<br>3. 验证返回聊天室列表 |
| IM-002 | 创建聊天室 | 公司级 | write | 成功创建 | 1. 登录系统<br>2. POST /api/core/comm/im/rooms<br>3. 验证聊天室创建成功 |
| IM-003 | 发送消息 | 数据级 | write | 成功发送 | 1. 登录系统<br>2. POST /api/core/comm/im/rooms/{id}/messages<br>3. 验证消息发送成功 |
| IM-004 | 查看聊天记录 | 数据级 | read | 返回聊天记录 | 1. 以聊天室成员登录<br>2. GET /api/core/comm/im/rooms/{id}/messages<br>3. 验证返回聊天记录 |
| IM-005 | 非成员查看聊天记录 | 数据级 | read | 返回 403 | 1. 以非成员登录<br>2. 尝试查看聊天记录<br>3. 验证访问被拒绝 |
| IM-006 | 添加联系人 | 公司级 | write | 成功添加 | 1. 登录系统<br>2. POST /api/core/comm/im/contacts<br>3. 验证联系人添加成功 |
| IM-007 | 查看在线状态 | 公司级 | read | 返回在线状态 | 1. 登录系统<br>2. GET /api/core/comm/im/online-status/{user_id}<br>3. 验证返回在线状态 |

### 2.7 集成模块 (integration)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| INT-001 | 查看集成列表 | 系统级 | read | 返回集成列表 | 1. 以 admin 登录<br>2. GET /api/integrations<br>3. 验证返回集成列表 |
| INT-002 | 创建集成配置 | 系统级 | write | 成功创建 | 1. 以 admin 登录<br>2. POST /api/integrations<br>3. 验证集成创建成功 |
| INT-003 | 更新集成配置 | 系统级 | write | 成功更新 | 1. 以 admin 登录<br>2. PUT /api/integrations/{id}<br>3. 验证集成更新成功 |
| INT-004 | 删除集成 | 系统级 | delete | 成功删除 | 1. 以 admin 登录<br>2. DELETE /api/integrations/{id}<br>3. 验证集成已删除 |
| INT-005 | 测试集成连接 | 系统级 | admin | 成功测试 | 1. 以 admin 登录<br>2. POST /api/integrations/{id}/test<br>3. 验证连接测试成功 |
| INT-006 | 普通用户访问集成 | 系统级 | read | 返回 403 | 1. 以 employee 登录<br>2. 尝试访问集成配置<br>3. 验证返回权限不足 |

---

## 三、业务模块测试用例

### 3.1 人力资源模块 (hrm)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| HRM-001 | 查看员工列表 | 公司级 | read | 返回公司员工 | 1. 登录系统<br>2. GET /api/hrm/employees<br>3. 验证返回员工列表 |
| HRM-002 | 创建员工 | 公司级 | write | 成功创建 | 1. 以 HR 登录<br>2. POST /api/hrm/employees<br>3. 验证员工创建成功 |
| HRM-003 | 更新员工信息 | 数据级 | write | 成功更新 | 1. 以 HR 登录<br>2. PUT /api/hrm/employees/{id}<br>3. 验证员工信息更新 |
| HRM-004 | 删除员工 | 公司级 | delete | 成功删除 | 1. 以 HR 管理员登录<br>2. DELETE /api/hrm/employees/{id}<br>3. 验证员工已删除 |
| HRM-005 | 查看部门列表 | 公司级 | read | 返回部门列表 | 1. 登录系统<br>2. GET /api/hrm/departments<br>3. 验证返回部门列表 |
| HRM-006 | 创建部门 | 公司级 | write | 成功创建 | 1. 以 HR 管理员登录<br>2. POST /api/hrm/departments<br>3. 验证部门创建成功 |
| HRM-007 | 查看考勤记录 | 公司级 | read | 返回考勤记录 | 1. 登录系统<br>2. GET /api/hrm/attendance<br>3. 验证返回考勤记录 |
| HRM-008 | 打卡 | 数据级 | write | 成功打卡 | 1. 登录系统<br>2. POST /api/hrm/attendance/check-in<br>3. 验证打卡成功 |
| HRM-009 | 查看薪资 | 数据级 | read | 仅返回个人薪资 | 1. 登录系统<br>2. GET /api/hrm/payroll/me<br>3. 验证返回个人薪资 |
| HRM-010 | 查看他人薪资 | 数据级 | read | 返回 403 | 1. 以普通员工登录<br>2. 尝试查看他人薪资<br>3. 验证访问被拒绝 |
| HRM-011 | 请假申请 | 数据级 | write | 成功提交 | 1. 登录系统<br>2. POST /api/hrm/leave<br>3. 验证请假申请提交成功 |
| HRM-012 | 审批请假 | 数据级 | write | 成功审批 | 1. 以审批人登录<br>2. POST /api/hrm/leave/{id}/approve<br>3. 验证审批成功 |
| HRM-013 | 绩效评估 | 公司级 | write | 成功评估 | 1. 以 HR 登录<br>2. POST /api/hrm/performance<br>3. 验证绩效评估成功 |
| HRM-014 | 跨公司访问员工 | 公司级 | read | 返回 403 | 1. 以A公司用户登录<br>2. 尝试访问B公司员工<br>3. 验证访问被拒绝 |

### 3.2 项目管理模块 (pm)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| PM-001 | 查看项目列表 | 公司级 | read | 返回可访问项目 | 1. 登录系统<br>2. GET /api/pm/projects<br>3. 验证返回项目列表 |
| PM-002 | 创建项目 | 公司级 | write | 成功创建 | 1. 以项目经理登录<br>2. POST /api/pm/projects<br>3. 验证项目创建成功 |
| PM-003 | 更新项目 | 项目级 | write | 成功更新 | 1. 以项目成员登录<br>2. PUT /api/pm/projects/{id}<br>3. 验证项目更新成功 |
| PM-004 | 删除项目 | 公司级 | delete | 成功删除 | 1. 以项目经理登录<br>2. DELETE /api/pm/projects/{id}<br>3. 验证项目已删除 |
| PM-005 | 查看项目详情 | 项目级 | read | 返回项目详情 | 1. 以项目成员登录<br>2. GET /api/pm/projects/{id}<br>3. 验证返回项目详情 |
| PM-006 | 非成员访问项目 | 项目级 | read | 返回 403 | 1. 以非项目成员登录<br>2. 尝试访问项目详情<br>3. 验证访问被拒绝 |
| PM-007 | 添加项目成员 | 项目级 | admin | 成功添加 | 1. 以项目管理员登录<br>2. POST /api/pm/projects/{id}/members<br>3. 验证成员添加成功 |
| PM-008 | 移除项目成员 | 项目级 | admin | 成功移除 | 1. 以项目管理员登录<br>2. DELETE /api/pm/projects/{id}/members/{userId}<br>3. 验证成员已移除 |
| PM-009 | 创建任务 | 项目级 | write | 成功创建 | 1. 以项目成员登录<br>2. POST /api/pm/tasks<br>3. 验证任务创建成功 |
| PM-010 | 分配任务 | 项目级 | write | 成功分配 | 1. 以项目管理员登录<br>2. PUT /api/pm/tasks/{id}/assign<br>3. 验证任务分配成功 |
| PM-011 | 更新任务状态 | 数据级 | write | 成功更新 | 1. 以任务负责人登录<br>2. PUT /api/pm/tasks/{id}/status<br>3. 验证状态更新成功 |
| PM-012 | 删除任务 | 项目级 | delete | 成功删除 | 1. 以项目管理员登录<br>2. DELETE /api/pm/tasks/{id}<br>3. 验证任务已删除 |

### 3.3 企业资源计划模块 (erp)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| ERP-001 | 查看ERP仪表盘 | 公司级 | read | 返回仪表盘数据 | 1. 以有权限用户登录<br>2. GET /api/erp/dashboard<br>3. 验证返回仪表盘数据 |
| ERP-002 | 查看库存 | 公司级 | read | 返回库存数据 | 1. 以有权限用户登录<br>2. GET /api/erp/inventory<br>3. 验证返回库存列表 |
| ERP-003 | 创建采购订单 | 公司级 | write | 成功创建 | 1. 以有权限用户登录<br>2. POST /api/erp/purchase-orders<br>3. 验证订单创建成功 |
| ERP-004 | 审批采购订单 | 公司级 | admin | 成功审批 | 1. 以管理员登录<br>2. POST /api/erp/purchase-orders/{id}/approve<br>3. 验证审批成功 |
| ERP-005 | 查看财务报表 | 公司级 | read | 返回报表数据 | 1. 以财务人员登录<br>2. GET /api/erp/finance/reports<br>3. 验证返回报表数据 |
| ERP-006 | 导出财务数据 | 公司级 | admin | 成功导出 | 1. 以管理员登录<br>2. GET /api/erp/finance/export<br>3. 验证导出成功 |

### 3.4 客户关系管理模块 (crm)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| CRM-001 | 查看客户列表 | 公司级 | read | 返回客户列表 | 1. 登录系统<br>2. GET /api/crm/customers<br>3. 验证返回客户列表 |
| CRM-002 | 创建客户 | 公司级 | write | 成功创建 | 1. 以销售登录<br>2. POST /api/crm/customers<br>3. 验证客户创建成功 |
| CRM-003 | 更新客户信息 | 数据级 | write | 成功更新 | 1. 以销售登录<br>2. PUT /api/crm/customers/{id}<br>3. 验证客户信息更新 |
| CRM-004 | 删除客户 | 公司级 | delete | 成功删除 | 1. 以管理员登录<br>2. DELETE /api/crm/customers/{id}<br>3. 验证客户已删除 |
| CRM-005 | 查看销售机会 | 公司级 | read | 返回机会列表 | 1. 登录系统<br>2. GET /api/crm/opportunities<br>3. 验证返回机会列表 |
| CRM-006 | 创建销售机会 | 公司级 | write | 成功创建 | 1. 以销售登录<br>2. POST /api/crm/opportunities<br>3. 验证机会创建成功 |

### 3.5 供应链管理模块 (scm)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| SCM-001 | 查看供应商列表 | 公司级 | read | 返回供应商列表 | 1. 登录系统<br>2. GET /api/scm/suppliers<br>3. 验证返回供应商列表 |
| SCM-002 | 创建供应商 | 公司级 | write | 成功创建 | 1. 以采购登录<br>2. POST /api/scm/suppliers<br>3. 验证供应商创建成功 |
| SCM-003 | 查看采购订单 | 公司级 | read | 返回订单列表 | 1. 登录系统<br>2. GET /api/scm/purchase-orders<br>3. 验证返回订单列表 |
| SCM-004 | 审批采购订单 | 公司级 | admin | 成功审批 | 1. 以管理员登录<br>2. POST /api/scm/purchase-orders/{id}/approve<br>3. 验证审批成功 |

### 3.6 销售管理模块 (rs)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| RS-001 | 查看销售订单 | 公司级 | read | 返回订单列表 | 1. 登录系统<br>2. GET /api/rs/orders<br>3. 验证返回订单列表 |
| RS-002 | 创建销售订单 | 公司级 | write | 成功创建 | 1. 以销售登录<br>2. POST /api/rs/orders<br>3. 验证订单创建成功 |
| RS-003 | 审批销售订单 | 公司级 | admin | 成功审批 | 1. 以管理员登录<br>2. POST /api/rs/orders/{id}/approve<br>3. 验证审批成功 |
| RS-004 | 查看销售报表 | 公司级 | read | 返回报表数据 | 1. 登录系统<br>2. GET /api/rs/reports<br>3. 验证返回报表数据 |

### 3.7 人工智能模块 (ai)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| AI-001 | 使用AI助手 | 公司级 | read | 成功调用 | 1. 登录系统<br>2. POST /api/ai/chat<br>3. 验证AI响应成功 |
| AI-002 | 查看AI模型列表 | 系统级 | read | 返回模型列表 | 1. 以管理员登录<br>2. GET /api/ai/models<br>3. 验证返回模型列表 |
| AI-003 | 配置AI模型 | 系统级 | admin | 成功配置 | 1. 以管理员登录<br>2. PUT /api/ai/models/{id}/config<br>3. 验证配置成功 |
| AI-004 | 删除AI模型 | 系统级 | delete | 成功删除 | 1. 以管理员登录<br>2. DELETE /api/ai/models/{id}<br>3. 验证模型已删除 |

### 3.8 地理信息系统模块 (gis)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| GIS-001 | 查看地图数据 | 公司级 | read | 返回地图数据 | 1. 登录系统<br>2. GET /api/gis/maps<br>3. 验证返回地图数据 |
| GIS-002 | 创建地图标记 | 公司级 | write | 成功创建 | 1. 登录系统<br>2. POST /api/gis/markers<br>3. 验证标记创建成功 |
| GIS-003 | 更新地图标记 | 数据级 | write | 成功更新 | 1. 登录系统<br>2. PUT /api/gis/markers/{id}<br>3. 验证标记更新成功 |
| GIS-004 | 删除地图标记 | 数据级 | delete | 成功删除 | 1. 以有权限用户登录<br>2. DELETE /api/gis/markers/{id}<br>3. 验证标记已删除 |

### 3.9 质量管理模块 (qms)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| QMS-001 | 查看质量检查列表 | 公司级 | read | 返回检查列表 | 1. 登录系统<br>2. GET /api/qms/inspections<br>3. 验证返回检查列表 |
| QMS-002 | 创建质量检查 | 公司级 | write | 成功创建 | 1. 以质检员登录<br>2. POST /api/qms/inspections<br>3. 验证检查创建成功 |
| QMS-003 | 审核质量检查 | 公司级 | admin | 成功审核 | 1. 以管理员登录<br>2. POST /api/qms/inspections/{id}/review<br>3. 验证审核成功 |
| QMS-004 | 删除质量检查 | 公司级 | delete | 成功删除 | 1. 以管理员登录<br>2. DELETE /api/qms/inspections/{id}<br>3. 验证检查已删除 |

### 3.10 环境健康安全模块 (ehs)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| EHS-001 | 查看安全检查列表 | 公司级 | read | 返回检查列表 | 1. 登录系统<br>2. GET /api/ehs/safety-checks<br>3. 验证返回检查列表 |
| EHS-002 | 创建安全检查 | 公司级 | write | 成功创建 | 1. 以安全员登录<br>2. POST /api/ehs/safety-checks<br>3. 验证检查创建成功 |
| EHS-003 | 查看事故报告 | 公司级 | read | 返回报告列表 | 1. 登录系统<br>2. GET /api/ehs/incidents<br>3. 验证返回报告列表 |
| EHS-004 | 提交事故报告 | 公司级 | write | 成功提交 | 1. 登录系统<br>2. POST /api/ehs/incidents<br>3. 验证报告提交成功 |

### 3.11 制造执行系统模块 (mes)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| MES-001 | 查看生产计划 | 公司级 | read | 返回计划列表 | 1. 登录系统<br>2. GET /api/mes/production-plans<br>3. 验证返回计划列表 |
| MES-002 | 创建生产计划 | 公司级 | write | 成功创建 | 1. 以计划员登录<br>2. POST /api/mes/production-plans<br>3. 验证计划创建成功 |
| MES-003 | 查看生产工单 | 项目级 | read | 返回工单列表 | 1. 登录系统<br>2. GET /api/mes/work-orders<br>3. 验证返回工单列表 |
| MES-004 | 更新工单状态 | 数据级 | write | 成功更新 | 1. 以操作员登录<br>2. PUT /api/mes/work-orders/{id}/status<br>3. 验证状态更新成功 |

### 3.12 仓储管理模块 (wms)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| WMS-001 | 查看库存列表 | 公司级 | read | 返回库存列表 | 1. 登录系统<br>2. GET /api/wms/inventory<br>3. 验证返回库存列表 |
| WMS-002 | 入库操作 | 公司级 | write | 成功入库 | 1. 以仓库员登录<br>2. POST /api/wms/inbound<br>3. 验证入库成功 |
| WMS-003 | 出库操作 | 公司级 | write | 成功出库 | 1. 以仓库员登录<br>2. POST /api/wms/outbound<br>3. 验证出库成功 |
| WMS-004 | 库存盘点 | 公司级 | admin | 成功盘点 | 1. 以管理员登录<br>2. POST /api/wms/inventory/count<br>3. 验证盘点成功 |

---

## 四、系统模块测试用例

### 4.1 系统设置模块 (system)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| SYS-001 | 查看系统设置 | 系统级 | read | 返回系统设置 | 1. 以管理员登录<br>2. GET /api/system/settings<br>3. 验证返回系统设置 |
| SYS-002 | 更新系统设置 | 系统级 | settings | 成功更新 | 1. 以 superadmin 登录<br>2. PUT /api/system/settings<br>3. 验证设置更新成功 |
| SYS-003 | 查看系统日志 | 系统级 | logs | 返回日志列表 | 1. 以管理员登录<br>2. GET /api/system/logs<br>3. 验证返回日志列表 |
| SYS-004 | 查看系统监控 | 系统级 | monitor | 返回监控数据 | 1. 以管理员登录<br>2. GET /api/system/monitor<br>3. 验证返回监控数据 |
| SYS-005 | 导出系统数据 | 系统级 | export | 成功导出 | 1. 以管理员登录<br>2. GET /api/system/export<br>3. 验证导出成功 |
| SYS-006 | 数据迁移 | 系统级 | migration | 成功迁移 | 1. 以 superadmin 登录<br>2. POST /api/system/migration<br>3. 验证迁移成功 |
| SYS-007 | 普通用户访问系统设置 | 系统级 | read | 返回 403 | 1. 以普通用户登录<br>2. 尝试访问系统设置<br>3. 验证返回权限不足 |
| SYS-008 | 租户管理员访问系统设置 | 租户级 | settings | 部分可访问 | 1. 以租户管理员登录<br>2. 访问租户级设置<br>3. 验证可访问租户设置 |

### 4.2 审计模块 (audit)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| AUDIT-001 | 查看审计日志 | 系统级 | read | 返回审计日志 | 1. 以管理员登录<br>2. GET /api/audit/logs<br>3. 验证返回审计日志 |
| AUDIT-002 | 导出审计日志 | 系统级 | read | 成功导出 | 1. 以管理员登录<br>2. GET /api/audit/logs/export<br>3. 验证导出成功 |
| AUDIT-003 | 查看操作记录 | 公司级 | read | 返回操作记录 | 1. 登录系统<br>2. GET /api/audit/operations<br>3. 验证返回操作记录 |
| AUDIT-004 | 普通用户访问审计日志 | 系统级 | read | 返回 403 | 1. 以普通用户登录<br>2. 尝试访问审计日志<br>3. 验证返回权限不足 |

### 4.3 数据字典模块 (dictionaries)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| DICT-001 | 查看数据字典 | 系统级 | read | 返回字典列表 | 1. 登录系统<br>2. GET /api/dictionaries<br>3. 验证返回字典列表 |
| DICT-002 | 更新数据字典 | 系统级 | update | 成功更新 | 1. 以管理员登录<br>2. PUT /api/dictionaries/{id}<br>3. 验证字典更新成功 |
| DICT-003 | 创建字典项 | 系统级 | update | 成功创建 | 1. 以管理员登录<br>2. POST /api/dictionaries<br>3. 验证字典项创建成功 |
| DICT-004 | 普通用户更新字典 | 系统级 | update | 返回 403 | 1. 以普通用户登录<br>2. 尝试更新字典<br>3. 验证返回权限不足 |

### 4.4 插件模块 (plugins)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| PLG-001 | 查看插件市场 | 系统级 | read | 返回插件列表 | 1. 登录系统<br>2. GET /api/core/plugins<br>3. 验证返回插件列表 |
| PLG-002 | 安装插件 | 系统级 | update | 成功安装 | 1. 以管理员登录<br>2. POST /api/core/plugins/{code}/install<br>3. 验证插件安装成功 |
| PLG-003 | 启用插件 | 系统级 | update | 成功启用 | 1. 以管理员登录<br>2. POST /api/core/plugins/{code}/enable<br>3. 验证插件启用成功 |
| PLG-004 | 卸载插件 | 系统级 | update | 成功卸载 | 1. 以管理员登录<br>2. POST /api/core/plugins/{code}/uninstall<br>3. 验证插件卸载成功 |
| PLG-005 | 普通用户安装插件 | 系统级 | update | 返回 403 | 1. 以普通用户登录<br>2. 尝试安装插件<br>3. 验证返回权限不足 |

---

## 五、功能模块测试用例

### 5.1 考勤模块 (attendance)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| ATT-001 | 查看个人考勤 | 数据级 | read | 返回个人考勤 | 1. 登录系统<br>2. GET /api/hrm/attendance/me<br>3. 验证返回个人考勤 |
| ATT-002 | 查看团队考勤 | 公司级 | read | 返回团队考勤 | 1. 以管理员登录<br>2. GET /api/hrm/attendance/team<br>3. 验证返回团队考勤 |
| ATT-003 | 打卡 | 数据级 | write | 成功打卡 | 1. 登录系统<br>2. POST /api/hrm/attendance/check-in<br>3. 验证打卡成功 |
| ATT-004 | 补卡申请 | 数据级 | write | 成功提交 | 1. 登录系统<br>2. POST /api/hrm/attendance/correction<br>3. 验证补卡申请成功 |

### 5.2 公司管理模块 (company)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| COMP-001 | 查看公司列表 | 租户级 | read | 返回公司列表 | 1. 以租户管理员登录<br>2. GET /api/companies<br>3. 验证返回公司列表 |
| COMP-002 | 创建公司 | 租户级 | write | 成功创建 | 1. 以租户管理员登录<br>2. POST /api/companies<br>3. 验证公司创建成功 |
| COMP-003 | 更新公司信息 | 公司级 | write | 成功更新 | 1. 以公司管理员登录<br>2. PUT /api/companies/{id}<br>3. 验证公司信息更新 |
| COMP-004 | 跨公司访问 | 租户级 | read | 返回 403 | 1. 以A公司用户登录<br>2. 尝试访问B公司数据<br>3. 验证访问被拒绝 |

### 5.3 部门管理模块 (department)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| DEPT-001 | 查看部门列表 | 公司级 | read | 返回部门列表 | 1. 登录系统<br>2. GET /api/hrm/departments<br>3. 验证返回部门列表 |
| DEPT-002 | 创建部门 | 公司级 | write | 成功创建 | 1. 以HR管理员登录<br>2. POST /api/hrm/departments<br>3. 验证部门创建成功 |
| DEPT-003 | 更新部门 | 公司级 | write | 成功更新 | 1. 以HR管理员登录<br>2. PUT /api/hrm/departments/{id}<br>3. 验证部门更新成功 |

### 5.4 文档管理模块 (documents)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| DOC-001 | 查看文档 | 公司级 | read | 返回文档列表 | 1. 登录系统<br>2. GET /api/documents<br>3. 验证返回文档列表 |
| DOC-002 | 创建文档 | 公司级 | create | 成功创建 | 1. 登录系统<br>2. POST /api/documents<br>3. 验证文档创建成功 |
| DOC-003 | 更新文档 | 数据级 | update | 成功更新 | 1. 以文档作者登录<br>2. PUT /api/documents/{id}<br>3. 验证文档更新成功 |
| DOC-004 | 删除文档 | 数据级 | delete | 成功删除 | 1. 以有权限用户登录<br>2. DELETE /api/documents/{id}<br>3. 验证文档已删除 |

### 5.5 员工管理模块 (employee)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| EMP-001 | 查看员工列表 | 公司级 | read | 返回员工列表 | 1. 登录系统<br>2. GET /api/hrm/employees<br>3. 验证返回员工列表 |
| EMP-002 | 查看员工详情 | 公司级 | read | 返回员工详情 | 1. 登录系统<br>2. GET /api/hrm/employees/{id}<br>3. 验证返回员工详情 |
| EMP-003 | 更新员工信息 | 数据级 | write | 成功更新 | 1. 以HR登录<br>2. PUT /api/hrm/employees/{id}<br>3. 验证员工信息更新 |

### 5.6 请假管理模块 (leave)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| LEAVE-001 | 查看个人请假记录 | 数据级 | read | 返回个人请假 | 1. 登录系统<br>2. GET /api/hrm/leave/me<br>3. 验证返回请假记录 |
| LEAVE-002 | 提交请假申请 | 数据级 | write | 成功提交 | 1. 登录系统<br>2. POST /api/hrm/leave<br>3. 验证请假申请成功 |
| LEAVE-003 | 审批请假 | 数据级 | write | 成功审批 | 1. 以审批人登录<br>2. POST /api/hrm/leave/{id}/approve<br>3. 验证审批成功 |

### 5.7 薪资管理模块 (payroll)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| PAY-001 | 查看个人薪资 | 数据级 | read | 返回个人薪资 | 1. 登录系统<br>2. GET /api/hrm/payroll/me<br>3. 验证返回个人薪资 |
| PAY-002 | 查看团队薪资 | 公司级 | read | 返回团队薪资 | 1. 以HR登录<br>2. GET /api/hrm/payroll<br>3. 验证返回薪资列表 |
| PAY-003 | 更新薪资 | 公司级 | write | 成功更新 | 1. 以HR登录<br>2. PUT /api/hrm/payroll/{id}<br>3. 验证薪资更新成功 |

### 5.8 绩效管理模块 (performance)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| PERF-001 | 查看个人绩效 | 数据级 | read | 返回个人绩效 | 1. 登录系统<br>2. GET /api/hrm/performance/me<br>3. 验证返回个人绩效 |
| PERF-002 | 查看团队绩效 | 公司级 | read | 返回团队绩效 | 1. 以管理员登录<br>2. GET /api/hrm/performance<br>3. 验证返回绩效列表 |
| PERF-003 | 创建绩效评估 | 公司级 | write | 成功创建 | 1. 以HR登录<br>2. POST /api/hrm/performance<br>3. 验证评估创建成功 |

### 5.9 权限管理模块 (permissions)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| PERM-001 | 查看权限列表 | 系统级 | read | 返回权限列表 | 1. 以管理员登录<br>2. GET /api/iam/permissions<br>3. 验证返回权限列表 |
| PERM-002 | 更新角色权限 | 系统级 | update | 成功更新 | 1. 以管理员登录<br>2. PUT /api/iam/roles/{id}/permissions<br>3. 验证权限更新成功 |
| PERM-003 | 普通用户查看权限 | 系统级 | read | 返回 403 | 1. 以普通用户登录<br>2. 尝试查看权限列表<br>3. 验证返回权限不足 |

### 5.10 项目模块 (projects)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| PROJ-001 | 查看项目列表 | 公司级 | read | 返回项目列表 | 1. 登录系统<br>2. GET /api/pm/projects<br>3. 验证返回项目列表 |
| PROJ-002 | 创建项目 | 公司级 | create | 成功创建 | 1. 以项目经理登录<br>2. POST /api/pm/projects<br>3. 验证项目创建成功 |
| PROJ-003 | 更新项目 | 项目级 | update | 成功更新 | 1. 以项目成员登录<br>2. PUT /api/pm/projects/{id}<br>3. 验证项目更新成功 |
| PROJ-004 | 删除项目 | 公司级 | delete | 成功删除 | 1. 以项目经理登录<br>2. DELETE /api/pm/projects/{id}<br>3. 验证项目已删除 |

### 5.11 角色管理模块 (roles)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| ROLE-001 | 查看角色列表 | 系统级 | read | 返回角色列表 | 1. 以管理员登录<br>2. GET /api/iam/roles<br>3. 验证返回角色列表 |
| ROLE-002 | 创建角色 | 系统级 | create | 成功创建 | 1. 以管理员登录<br>2. POST /api/iam/roles<br>3. 验证角色创建成功 |
| ROLE-003 | 更新角色 | 系统级 | update | 成功更新 | 1. 以管理员登录<br>2. PUT /api/iam/roles/{id}<br>3. 验证角色更新成功 |
| ROLE-004 | 删除角色 | 系统级 | delete | 成功删除 | 1. 以管理员登录<br>2. DELETE /api/iam/roles/{id}<br>3. 验证角色已删除 |

### 5.12 用户管理模块 (users)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| USER-001 | 查看用户列表 | 系统级 | read | 返回用户列表 | 1. 以管理员登录<br>2. GET /api/iam/users<br>3. 验证返回用户列表 |
| USER-002 | 创建用户 | 系统级 | create | 成功创建 | 1. 以管理员登录<br>2. POST /api/iam/users<br>3. 验证用户创建成功 |
| USER-003 | 更新用户 | 系统级 | update | 成功更新 | 1. 以管理员登录<br>2. PUT /api/iam/users/{id}<br>3. 验证用户更新成功 |
| USER-004 | 删除用户 | 系统级 | delete | 成功删除 | 1. 以管理员登录<br>2. DELETE /api/iam/users/{id}<br>3. 验证用户已删除 |

### 5.13 工作流管理模块 (workflows)

| 用例ID | 测试场景 | 权限级别 | 操作 | 预期结果 | 测试步骤 |
|--------|----------|----------|------|----------|----------|
| WF-001 | 查看工作流列表 | 系统级 | read | 返回工作流列表 | 1. 登录系统<br>2. GET /api/flow/workflows<br>3. 验证返回工作流列表 |
| WF-002 | 创建工作流 | 系统级 | create | 成功创建 | 1. 以管理员登录<br>2. POST /api/flow/workflows<br>3. 验证工作流创建成功 |
| WF-003 | 更新工作流 | 系统级 | update | 成功更新 | 1. 以管理员登录<br>2. PUT /api/flow/workflows/{id}<br>3. 验证工作流更新成功 |
| WF-004 | 删除工作流 | 系统级 | delete | 成功删除 | 1. 以管理员登录<br>2. DELETE /api/flow/workflows/{id}<br>3. 验证工作流已删除 |

---

## 六、跨模块集成测试用例

### 6.1 权限继承测试

| 用例ID | 测试场景 | 涉及模块 | 预期结果 | 测试步骤 |
|--------|----------|----------|----------|----------|
| INT-001 | admin权限继承delete/write/read | 所有模块 | admin拥有所有权限 | 1. 以admin角色登录<br>2. 验证可执行delete/write/read操作 |
| INT-002 | delete权限继承write/read | 所有模块 | delete拥有write和read权限 | 1. 以delete权限用户登录<br>2. 验证可执行write和read操作 |
| INT-003 | write权限继承read | 所有模块 | write拥有read权限 | 1. 以write权限用户登录<br>2. 验证可执行read操作 |

### 6.2 跨租户隔离测试

| 用例ID | 测试场景 | 涉及模块 | 预期结果 | 测试步骤 |
|--------|----------|----------|----------|----------|
| TENANT-001 | 租户A用户访问租户B数据 | IAM, HRM, PM | 返回403或空数据 | 1. 以租户A用户登录<br>2. 尝试访问租户B数据<br>3. 验证访问被拒绝 |
| TENANT-002 | 租户管理员跨租户操作 | 所有模块 | 返回403 | 1. 以租户A管理员登录<br>2. 尝试操作租户B数据<br>3. 验证操作被拒绝 |

### 6.3 公司级隔离测试

| 用例ID | 测试场景 | 涉及模块 | 预期结果 | 测试步骤 |
|--------|----------|----------|----------|----------|
| COMP-001 | 公司A用户访问公司B数据 | HRM, PM, CRM | 返回403或空数据 | 1. 以公司A用户登录<br>2. 尝试访问公司B数据<br>3. 验证访问被拒绝 |
| COMP-002 | 公司管理员跨公司操作 | 所有模块 | 返回403 | 1. 以公司A管理员登录<br>2. 尝试操作公司B数据<br>3. 验证操作被拒绝 |

### 6.4 项目级隔离测试

| 用例ID | 测试场景 | 涉及模块 | 预期结果 | 测试步骤 |
|--------|----------|----------|----------|----------|
| PROJ-001 | 项目成员访问项目数据 | PM, MES | 成功访问 | 1. 以项目成员登录<br>2. 访问项目数据<br>3. 验证访问成功 |
| PROJ-002 | 非项目成员访问项目数据 | PM, MES | 返回403 | 1. 以非项目成员登录<br>2. 尝试访问项目数据<br>3. 验证访问被拒绝 |

---

## 七、测试执行指南

### 7.1 测试环境准备

```bash
# 1. 启动服务
./scripts/deploy-local.sh

# 2. 验证服务状态
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8011/health

# 3. 获取测试令牌
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 7.2 测试账号

| 角色 | 用户名 | 密码 | 用途 |
|------|--------|------|------|
| superadmin | admin | admin123 | 超级管理员测试 |
| admin | admin_admin | admin123 | 管理员测试 |
| hr_admin | hr_admin | admin123 | HR管理员测试 |
| project_manager | pm_user | admin123 | 项目经理测试 |
| employee | employee | admin123 | 普通员工测试 |

### 7.3 测试结果记录模板

| 用例ID | 执行日期 | 执行人 | 结果 | 备注 |
|--------|----------|--------|------|------|
| IAM-001 | | | PASS/FAIL | |
| IAM-002 | | | PASS/FAIL | |

### 7.4 缺陷报告模板

```
缺陷ID: BUG-XXX
用例ID: XXX-XXX
发现时间:
发现人:
严重程度: 致命/严重/一般/轻微
优先级: P0/P1/P2/P3
描述:
重现步骤:
1.
2.
3.
预期结果:
实际结果:
截图/日志:
```

---

## 八、附录

### 8.1 权限码完整列表

```
# 核心模块
iam:read, iam:write, iam:delete, iam:admin
workflow:read, workflow:write, workflow:delete, workflow:admin, workflow:approve
doc:read, doc:write, doc:delete, doc:admin
file:read, file:write, file:delete, file:admin
notification:read, notification:write, notification:delete, notification:admin
im:read, im:write, im:delete, im:admin
integration:read, integration:write, integration:delete, integration:admin

# 业务模块
hrm:read, hrm:write, hrm:delete, hrm:admin
pm:read, pm:write, pm:delete, pm:admin
erp:read, erp:write, erp:delete, erp:admin
crm:read, crm:write, crm:delete, crm:admin
scm:read, scm:write, scm:delete, scm:admin
rs:read, rs:write, rs:delete, rs:admin
ai:read, ai:write, ai:delete, ai:admin
gis:read, gis:write, gis:delete, gis:admin
qms:read, qms:write, qms:delete, qms:admin
ehs:read, ehs:write, ehs:delete, ehs:admin
mes:read, mes:write, mes:delete, mes:admin
wms:read, wms:write, wms:delete, wms:admin

# 系统模块
system:read, system:update, system:settings, system:logs, system:monitor, system:export, system:audit, system:dictionary, system:migration, system:plugin
audit:read
dictionaries:read, dictionaries:update
plugins:read, plugins:update
```

### 8.2 API端点权限映射

详见各模块测试用例中的API端点。

### 8.3 测试覆盖率统计

| 类别 | 用例数 | 覆盖模块 |
|------|--------|----------|
| 核心模块 | 63 | 7 |
| 业务模块 | 56 | 12 |
| 系统模块 | 21 | 4 |
| 功能模块 | 52 | 13 |
| 集成测试 | 8 | 跨模块 |
| **总计** | **200** | **36** |

---

> 文档版本: v1.0
> 最后更新: 2026-06-21
> 维护团队: TOPEMS 开发团队
