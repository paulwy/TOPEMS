# TOPEMS 支撑模块完整指南

## 📋 概述

本文档记录了 TOPEMS 系统支撑模块的完整实现，包括模板管理、帮助中心、文档管理、以及数据导入导出等核心功能。

## 📁 目录结构

```
TOPEMS/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── template.ts          # 模板管理 API
│   │   │   ├── ai.ts                # AI 助手 API
│   │   │   ├── erp.ts               # ERP 模块 API（已更新）
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── TemplateManagementPage.tsx  # 模板管理页面
│   │   │   ├── HelpCenterPage.tsx          # 帮助中心页面
│   │   │   ├── DocumentCenterPage.tsx      # 文档中心页面
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── useNotification.ts    # 通知系统 Hook
│   │   ├── components/
│   │   │   └── NotificationContainer.tsx  # 通知组件
│   │   └── ...
│   ├── docs/
│   │   └── SUPPORT_MODULES.md        # 支撑模块架构文档
│   └── ...
├── platform/
│   └── topems-doc/
│       └── backend/
│           └── src/
│               ├── db/
│               │   └── migrations/
│               │       ├── 20260527000001_create_templates_and_help_center_schema.sql  # 数据库结构
│               │       └── 20260527000002_seed_templates_and_help_center.sql             # 初始化数据
│               └── models/
└── ...
```

## ✅ 已完成的工作

### 1. 数据库设计与初始化数据

#### 数据库结构（`doc_service` schema）

| 表名 | 用途 |
|------|------|
| `template_categories` | 模板分类管理 |
| `templates` | 模板内容和配置 |
| `help_categories` | 帮助文档分类 |
| `help_articles` | 帮助文档文章 |
| `video_tutorials` | 视频教程 |
| `faqs` | 常见问题 |

#### 预置数据统计

- **模板分类**: 6个
- **模板**: 11个（覆盖HRM、ERP、CRM、通用模块）
- **帮助分类**: 7个
- **帮助文章**: 5篇（精选热门主题）
- **常见问题**: 5个（最常被问到的问题）

### 2. 模板管理模块

#### 预置模板清单

##### HRM 模块（4个）
1. **劳动合同模板** - 标准劳动合同模板
   - 变量数: 15个
   - 包含: 公司信息、员工信息、合同期限、薪资等

2. **请假申请单** - 请假审批表单
   - 变量数: 12个
   - 包含: 申请人、请假类型、时间、交接人等

3. **员工入职登记表** - 新员工入职信息填写
   - 变量数: 21个
   - 包含: 基本信息、联系方式、教育背景、工作经历等

4. **员工辞职申请** - 离职申请表单
   - 变量数: 10个
   - 包含: 离职原因、交接、日期等

##### ERP 模块（3个）
5. **采购申请单** - 采购审批表单
   - 变量数: 18个
   - 包含: 申请信息、物品明细、金额等

6. **采购合同** - 标准采购合同
   - 变量数: 34个
   - 包含: 双方信息、产品、交付、付款等

7. **月度采购计划表** - 采购计划
   - 变量数: 26个
   - 包含: 月度计划、物品明细、金额汇总等

##### CRM 模块（3个）
8. **客户开发信** - 商务沟通邮件模板
   - 变量数: 9个
   - 包含: 客户信息、产品介绍、联系方式等

9. **报价单** - 产品/服务报价
   - 变量数: 21个
   - 包含: 客户信息、报价明细、条款等

10. **销售合同** - 销售合同
    - 变量数: 33个
    - 包含: 产品、交付、付款、违约责任等

##### 通用模块（1个）
11. **会议通知** - 会议通知
    - 变量数: 11个
    - 包含: 会议信息、参会人员、议程等

12. **会议纪要** - 会议记录
    - 变量数: 12个
    - 包含: 会议内容、决议、待办事项等

13. **周报模板** - 工作周报
    - 变量数: 9个
    - 包含: 本周工作、下周计划、问题等

### 3. 帮助中心内容

#### 帮助文章

1. **系统登录与首次使用** - 新用户入门
   - 主题: 登录、密码、首页
   - 模块: 快速入门

2. **员工入职流程** - HR 业务流程
   - 主题: 入职、档案、培训、试用期
   - 模块: HRM

3. **采购申请与审批流程** - ERP 业务流程
   - 主题: 采购、审批、验收、付款
   - 模块: ERP

4. **客户跟进与管理** - CRM 业务流程
   - 主题: 客户、商机、跟进、分析
   - 模块: CRM

5. **报表设计与创建** - 报表功能使用
   - 主题: 报表、设计、图表、导出
   - 模块: 报表

#### 常见问题 (FAQ)

1. **如何修改登录密码？** - 账户相关
2. **如何找回忘记的密码？** - 账户相关
3. **Excel导出失败怎么办？** - 操作相关
4. **如何创建自定义报表？** - 报表相关
5. **系统支持哪些浏览器？** - 系统相关

### 4. 前端页面与组件

#### 新增页面

1. **TemplateManagementPage** (`/templates`)
   - 功能: 模板列表、分类筛选、预览、编辑、删除、复制
   - 特性: 网格/列表视图切换、搜索、分类筛选

2. **HelpCenterPage** (`/help`)
   - 功能: 帮助文章、视频教程、常见问题、全文搜索
   - 特性: 分类导航、标签筛选、热门推荐

3. **DocumentCenterPage** (`/documents`)
   - 功能: 文档管理、文件夹导航、上传下载、搜索
   - 特性: 文件预览、收藏、共享、版本管理

#### 新增组件

1. **NotificationContainer** - 统一通知组件
   - 支持: 成功、错误、警告、信息
   - 特性: 自动消失、可关闭

#### 新增 Hooks

1. **useNotification** - 通知管理 Hook
   - 功能: 显示通知、隐藏通知
   - 方法: `success()`, `error()`, `warning()`, `info()`

### 5. API 层改进

#### 更新的 API

- **erp.ts** - 完善 API 路径（`/api/v1`）
- **ai.ts** - 扩展 AI 助手功能

#### 新增的 API

- **template.ts** - 完整的模板管理 API

### 6. 配置统一化

- **环境变量** - 统一配置各服务 URL
- **运行时配置** - `config/runtime.ts` 管理所有服务地址
- **API 路径** - 所有 API 统一使用 `/api/v1` 前缀

## 🎨 功能特性说明

### 模板变量系统

模板支持多种变量类型：
- **string** - 文本输入
- **number** - 数字输入
- **date** - 日期选择
- **select** - 下拉选择

变量配置：
```typescript
{
  key: "employee_name",
  label: "员工姓名",
  type: "string",
  required: true,
  options: ["男", "女"], // select类型需要
  default_value: ""
}
```

### 通知系统

统一通知样式：
```typescript
{
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️"
}
```

## 📊 使用统计

预计模板使用频率排序：
1. HRM - 请假申请单（高频）
2. ERP - 采购申请单（高频）
3. 通用 - 会议通知/纪要（高频）
4. CRM - 报价单（中频）
5. 其他模板（低频）

## 🔄 下一步建议

### 短期 (1-2周)

- [ ] 实现后端 API 端点
- [ ] 添加模板渲染引擎
- [ ] 完善 AI 助手对话界面
- [ ] 添加数据导入导出页面
- [ ] 补充测试用例

### 中期 (1月)

- [ ] 模板版本管理
- [ ] 用户自定义模板
- [ ] 模板使用统计与分析
- [ ] 帮助文档贡献功能
- [ ] 文档 OCR 识别

### 长期 (3月+)

- [ ] 智能推荐模板
- [ ] AI 自动生成模板
- [ ] 多语言支持
- [ ] 文档智能分类
- [ ] 知识库问答

## 📝 附录

### 文件清单

- **数据库迁移**
  - `platform/topems-doc/backend/src/db/migrations/20260527000001_create_templates_and_help_center_schema.sql`
  - `platform/topems-doc/backend/src/db/migrations/20260527000002_seed_templates_and_help_center.sql`

- **前端文件**
  - `frontend/src/api/template.ts`
  - `frontend/src/pages/TemplateManagementPage.tsx`
  - `frontend/src/pages/HelpCenterPage.tsx`
  - `frontend/src/pages/DocumentCenterPage.tsx`
  - `frontend/src/components/NotificationContainer.tsx`
  - `frontend/src/hooks/useNotification.ts`
  - `frontend/docs/SUPPORT_MODULES.md`

- **项目文档**
  - `SUPPORT_MODULES_GUIDE.md` (本文档)

### 更新历史

#### v1.1.0 (2026-05-27)
- 完整模板和帮助中心数据
- 统一的前端页面和组件
- 文档完善与配置统一化
