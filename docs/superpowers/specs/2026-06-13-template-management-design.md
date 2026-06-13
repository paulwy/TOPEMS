# TOPEMS 模板管理系统技术规格文档

**文档版本**: 1.0.0
**创建日期**: 2026-06-13
**状态**: 草稿

---

## 1. 系统概述

### 1.1 项目背景

TOPEMS 是一个综合性的企业管理平台，需要一个统一的模板管理系统来支持工作流、文档、表单、报表和通知等多种业务场景的标准化和自动化。模板系统将作为平台的基础能力，为用户提供便捷的模板创建、管理和应用功能。

### 1.2 设计目标

1. **统一性**: 建立统一的模板管理架构，支持多种模板类型
2. **灵活性**: 强大的变量系统，支持复杂的业务场景
3. **智能化**: 集成AI能力，辅助模板创建和优化
4. **安全性**: 完善的权限控制和审计机制
5. **可扩展性**: 模块化设计，便于功能扩展

### 1.3 模板类型

| 类型 | 标识 | 用途 | 内容格式 |
|------|------|------|----------|
| 工作流模板 | `workflow` | 工作流流程定义 | JSON |
| 文档模板 | `document` | 标准化文档格式 | HTML/Mustache |
| 表单模板 | `form` | 表单结构定义 | JSON Schema |
| 报表模板 | `report` | 数据报表布局 | HTML/ChartJS |
| 通知模板 | `notification` | 消息通知内容 | HTML/Text |

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端应用层                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │ 模板管理页面  │ │ 模板选择器   │ │ 模板编辑器   │ │ 模板预览器 │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬─────┘ │
└─────────┼────────────────┼────────────────┼─────────────────┼───────┘
          │                │                │                 │
          ▼                ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API 网关层                                   │
│                   /api/v1/templates                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                        服务层                                        │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │
│  │   模板服务        │  │   渲染服务        │  │   AI 助手服务    │ │
│  │ (TemplateService) │  │ (RenderService)   │  │ (AiService)     │ │
│  │ - CRUD管理        │  │ - 变量解析        │  │ - 智能生成      │ │
│  │ - 分类管理        │  │ - 内容渲染        │  │ - 变量建议      │ │
│  │ - 权限控制        │  │ - 格式转换        │  │ - 模板优化      │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                        数据层                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ templates    │ │ categories  │ │ variables    │ │ instances │  │
│  │ (模板表)     │ │ (分类表)     │ │ (变量表)     │ │ (实例表)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 组件职责

| 组件 | 职责 | 关键能力 |
|------|------|----------|
| **模板管理页面** | 管理模板生命周期 | 列表、搜索、创建、编辑、删除、状态管理 |
| **模板选择器** | 在业务场景中选择模板 | 分类筛选、快速搜索、预览卡片 |
| **模板编辑器** | 可视化编辑模板内容 | 富文本编辑、变量插入、实时预览 |
| **模板预览器** | 预览模板渲染效果 | 动态填充变量、多格式预览 |
| **模板服务** | 模板数据管理 | CRUD、版本控制、权限校验 |
| **渲染服务** | 模板内容渲染 | 变量解析、条件渲染、格式转换 |
| **AI助手服务** | 智能辅助 | 模板生成、变量建议、内容优化 |

---

## 3. 数据模型

### 3.1 模板表 (templates)

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,  -- workflow, document, form, report, notification
    category_id UUID REFERENCES template_categories(id),
    module VARCHAR(100),        -- ERP, HRM, CRM, QMS, LIMS, etc.
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    ai_enabled BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_templates_type ON templates(type);
CREATE INDEX idx_templates_category ON templates(category_id);
CREATE INDEX idx_templates_module ON templates(module);
CREATE INDEX idx_templates_is_active ON templates(is_active);
```

### 3.2 模板分类表 (template_categories)

```sql
CREATE TABLE template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,  -- 关联的模板类型
    icon VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_type ON template_categories(type);
```

### 3.3 模板变量表 (template_variables)

```sql
CREATE TABLE template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- string, number, date, boolean, select, multiselect, user, now, context, lookup
    required BOOLEAN DEFAULT false,
    default_value JSONB,
    options JSONB,               -- select/multiselect 的选项列表
    data_source VARCHAR(255),     -- lookup 类型的数据源
    validation_rules JSONB,       -- 校验规则
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_variables_template ON template_variables(template_id);
```

### 3.4 模板实例表 (template_instances)

记录模板的使用实例，便于统计和分析。

```sql
CREATE TABLE template_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id),
    instance_type VARCHAR(50) NOT NULL,  -- workflow, document, form, etc.
    instance_id VARCHAR(100) NOT NULL,   -- 关联的实例ID
    variables_values JSONB,               -- 变量填充值
    rendered_content TEXT,                -- 渲染后的内容
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instances_template ON template_instances(template_id);
CREATE INDEX idx_instances_type ON template_instances(instance_type);
```

### 3.5 模板版本表 (template_versions)

支持模板版本管理和回滚。

```sql
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    change_summary TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_versions_template ON template_versions(template_id);
```

---

## 4. 变量系统

### 4.1 变量类型定义

#### 基础类型

| 类型 | 说明 | 存储格式 | 示例 |
|------|------|----------|------|
| `string` | 单行文本 | 字符串 | `{{username}}` |
| `number` | 数字 | 数值 | `{{amount}}` |
| `date` | 日期 | ISO日期 | `{{create_date}}` |
| `datetime` | 日期时间 | ISO日期时间 | `{{submit_time}}` |
| `boolean` | 布尔值 | true/false | `{{is_approved}}` |
| `text` | 多行文本 | 字符串 | `{{description}}` |

#### 高级类型

| 类型 | 说明 | 配置项 | 示例 |
|------|------|--------|------|
| `select` | 下拉选择 | options | 状态选择 |
| `multiselect` | 多选 | options | 标签多选 |
| `lookup` | 关联查询 | data_source | 用户查询 |

#### 动态类型（自动填充）

| 类型 | 说明 | 触发时机 | 用途 |
|------|------|----------|------|
| `user` | 当前登录用户 | 渲染时自动注入 | 获取当前用户信息 |
| `now` | 当前时间 | 渲染时自动注入 | 自动填充时间戳 |
| `context` | 上下文数据 | 根据使用场景注入 | 业务关联数据 |
| `ai` | AI生成内容 | 调用AI服务 | 智能填充内容 |

### 4.2 变量定义结构

```typescript
interface TemplateVariable {
  key: string;                  // 变量标识（英文，驼峰命名）
  label: string;                // 变量显示名称（中文）
  type: VariableType;          // 变量类型
  required: boolean;            // 是否必填
  default_value?: any;          // 默认值
  placeholder?: string;         // 输入提示
  description?: string;         // 变量说明
  options?: SelectOption[];     // 下拉选项
  data_source?: DataSource;      // 动态数据源配置
  validation_rules?: ValidationRule[];  // 校验规则
  conditional_on?: string;      // 条件依赖（其他变量）
  conditional_value?: any;       // 条件值
}

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface DataSource {
  type: 'api' | 'static' | 'computed';
  endpoint?: string;           // API类型数据源
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
  value_field?: string;        // 选项值字段
  label_field?: string;        // 选项显示字段
  static_options?: SelectOption[];  // 静态选项
}
```

### 4.3 变量语法

#### Mustache 语法扩展

```handlebars
{{!-- 基础变量 --}}
{{variable_name}}

{{!-- 默认值语法 --}}
{{variable_name || '默认值'}}

{{!-- 条件判断 --}}
{{#if condition}}
  显示内容
{{else}}
  备用内容
{{/if}}

{{!-- 循环遍历 --}}
{{#each items}}
  {{this.name}} - {{this.value}}
{{/each}}

{{!-- 嵌套属性 --}}
{{user.profile.name}}

{{!-- 索引访问 --}}
{{items.[0].name}}

{{!-- 格式化过滤器 --}}
{{date_format created_at 'YYYY-MM-DD'}}
{{currency amount}}
{{uppercase name}}

{{!-- AI 生成变量 --}}
{{ai_generate purpose='生成摘要' context=content}}

{{!-- 关联查询变量 --}}
{{lookup 'user' user_id 'name'}}
```

### 4.4 动态变量自动注入

```typescript
// 动态变量处理器
const dynamicVariableHandlers = {
  user: (context) => getCurrentUser(),
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().split('T')[0],
  now_timestamp: () => Date.now(),
  random_id: () => generateUUID(),
};

// 渲染时自动注入
function processDynamicVariables(content: string, context: RenderContext): string {
  let result = content;
  for (const [key, handler] of Object.entries(dynamicVariableHandlers)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(pattern, handler(context));
  }
  return result;
}
```

---

## 5. API 设计

### 5.1 模板管理接口

#### 获取模板列表

```
GET /api/v1/templates
```

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| type | string | 否 | 模板类型筛选 |
| category | string | 否 | 分类ID筛选 |
| module | string | 否 | 模块筛选 |
| search | string | 否 | 关键字搜索 |
| is_active | boolean | 否 | 启用状态筛选 |
| is_public | boolean | 否 | 公开状态筛选 |

**Response:**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "模板名称",
        "code": "template_code",
        "type": "workflow",
        "category_id": "uuid",
        "category_name": "审批流程",
        "module": "ERP",
        "description": "描述",
        "variables": [],
        "is_active": true,
        "is_system": false,
        "is_public": true,
        "view_count": 100,
        "use_count": 50,
        "created_at": "2026-06-13T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  },
  "message": "获取模板列表成功"
}
```

#### 获取单个模板

```
GET /api/v1/templates/{id}
```

**Response:**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "uuid",
    "name": "模板名称",
    "code": "template_code",
    "type": "workflow",
    "category_id": "uuid",
    "category_name": "审批流程",
    "module": "ERP",
    "description": "描述",
    "content": "模板内容...",
    "variables": [
      {
        "key": "username",
        "label": "用户名",
        "type": "string",
        "required": true,
        "default_value": null,
        "options": null
      }
    ],
    "is_active": true,
    "is_system": false,
    "is_public": true,
    "ai_enabled": true,
    "version": 1,
    "view_count": 100,
    "use_count": 50,
    "created_at": "2026-06-13T00:00:00Z",
    "updated_at": "2026-06-13T00:00:00Z",
    "created_by": "admin"
  }
}
```

#### 创建模板

```
POST /api/v1/templates
```

**Request Body:**
```json
{
  "name": "模板名称",
  "code": "template_code",
  "type": "workflow",
  "category_id": "uuid",
  "module": "ERP",
  "description": "描述",
  "content": "模板内容...",
  "variables": [
    {
      "key": "username",
      "label": "用户名",
      "type": "string",
      "required": true,
      "default_value": null
    }
  ],
  "is_active": true,
  "is_public": true,
  "ai_enabled": false
}
```

#### 更新模板

```
PUT /api/v1/templates/{id}
```

**Request Body:**
```json
{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "content": "更新后的内容",
  "variables": [],
  "is_active": true
}
```

#### 删除模板

```
DELETE /api/v1/templates/{id}
```

#### 复制模板

```
POST /api/v1/templates/{id}/duplicate
```

**Response:**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "new_uuid",
    "name": "模板名称 (副本)",
    "code": "template_code_copy"
  }
}
```

#### 切换模板状态

```
PUT /api/v1/templates/{id}/toggle-status
```

### 5.2 模板分类接口

```
GET    /api/v1/template-categories
POST   /api/v1/template-categories
PUT    /api/v1/template-categories/{id}
DELETE /api/v1/template-categories/{id}
```

### 5.3 模板渲染接口

#### 渲染模板

```
POST /api/v1/templates/{id}/render
```

**Request Body:**
```json
{
  "variables": {
    "username": "张三",
    "amount": 1000,
    "approve_date": "2026-06-13"
  },
  "format": "html"  // html, text, json
}
```

**Response:**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "rendered_content": "渲染后的内容...",
    "used_variables": ["username", "amount", "approve_date"]
  }
}
```

### 5.4 AI 辅助接口

#### AI 生成模板

```
POST /api/v1/templates/ai/generate
```

**Request Body:**
```json
{
  "type": "workflow",
  "description": "创建一个采购审批流程",
  "suggest_variables": true
}
```

**Response:**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "content": "生成的模板内容...",
    "suggested_variables": [
      {
        "key": "applicant",
        "label": "申请人",
        "type": "user",
        "required": true
      }
    ]
  }
}
```

#### AI 建议变量

```
POST /api/v1/templates/ai/suggest-variables
```

**Request Body:**
```json
{
  "content": "模板内容..."
}
```

#### AI 优化模板

```
POST /api/v1/templates/ai/optimize
```

**Request Body:**
```json
{
  "content": "待优化的模板内容...",
  "purpose": "优化语言表达"
}
```

---

## 6. 前端实现

### 6.1 目录结构

```
src/
├── components/
│   ├── template/
│   │   ├── TemplateList.tsx           # 模板列表组件
│   │   ├── TemplateCard.tsx           # 模板卡片组件
│   │   ├── TemplateForm.tsx           # 模板表单组件
│   │   ├── TemplateEditor.tsx         # 模板编辑器
│   │   ├── TemplatePreview.tsx        # 模板预览组件
│   │   ├── VariablePanel.tsx          # 变量配置面板
│   │   ├── VariableForm.tsx           # 变量表单组件
│   │   ├── TemplateSelector.tsx       # 模板选择器
│   │   ├── TemplateCategoryFilter.tsx # 分类筛选组件
│   │   └── TemplateSearch.tsx         # 搜索组件
│   ├── ai/
│   │   ├── AiAssistant.tsx            # AI助手组件
│   │   ├── AiGenerateModal.tsx        # AI生成弹窗
│   │   └── AiSuggestPanel.tsx         # AI建议面板
│   └── common/
│       ├── RichTextEditor.tsx         # 富文本编辑器
│       ├── JsonEditor.tsx             # JSON编辑器
│       └── CodeEditor.tsx             # 代码编辑器
├── pages/
│   ├── TemplateManagementPage.tsx     # 模板管理页面
│   ├── TemplateDetailPage.tsx         # 模板详情页面
│   ├── TemplateCreatePage.tsx         # 创建模板页面
│   └── TemplateEditPage.tsx           # 编辑模板页面
├── api/
│   └── template.ts                    # 模板API封装
├── hooks/
│   ├── useTemplate.ts                 # 模板相关hooks
│   ├── useTemplateList.ts             # 模板列表hooks
│   ├── useTemplateRender.ts           # 模板渲染hooks
│   └── useAiAssist.ts                # AI辅助hooks
├── utils/
│   ├── templateRenderer.ts            # 客户端渲染工具
│   ├── variableParser.ts              # 变量解析工具
│   └── templateValidator.ts           # 模板校验工具
├── types/
│   └── template.ts                    # 类型定义
└── styles/
    └── template.css                   # 模板相关样式
```

### 6.2 核心组件设计

#### TemplateEditor 组件

```typescript
interface TemplateEditorProps {
  value: string;
  onChange: (content: string) => void;
  variables: TemplateVariable[];
  type: TemplateType;
  height?: number;
  readOnly?: boolean;
  showPreview?: boolean;
}

// 功能特性：
// 1. 富文本编辑（支持 Markdown/HTML/JSON）
// 2. 变量插入面板（点击插入变量）
// 3. 实时预览（根据当前变量值渲染）
// 4. AI辅助（智能补全、变量检测）
// 5. 语法高亮（变量语法高亮显示）
```

#### TemplateSelector 组件

```typescript
interface TemplateSelectorProps {
  type?: TemplateType;
  category?: string;
  module?: string;
  onSelect: (template: Template) => void;
  onCancel: () => void;
  showPreview?: boolean;
  multiSelect?: boolean;
}

// 功能特性：
// 1. 分类筛选标签
// 2. 关键字搜索
// 3. 模板预览卡片
// 4. 最近使用记录
// 5. 快捷键支持
```

#### VariableForm 组件

```typescript
interface VariableFormProps {
  variables: TemplateVariable[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onAiSuggest?: () => void;
  readOnly?: boolean;
}

// 功能特性：
// 1. 动态表单生成
// 2. 变量类型适配（input/select/date picker等）
// 3. 数据源动态加载
// 4. 表单校验
// 5. AI智能填充建议
```

### 6.3 客户端渲染

```typescript
// templateRenderer.ts

import Handlebars from 'handlebars';
import dayjs from 'dayjs';

// 注册自定义helpers
Handlebars.registerHelper('date_format', (date: string, format: string) => {
  return dayjs(date).format(format);
});

Handlebars.registerHelper('currency', (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount);
});

Handlebars.registerHelper('uppercase', (str: string) => {
  return str?.toUpperCase();
});

export function renderTemplate(
  template: Template,
  values: Record<string, any>
): string {
  // 合并默认值和用户输入值
  const mergedValues = {
    ...template.variables.reduce((acc, v) => {
      if (v.default_value !== undefined) {
        acc[v.key] = v.default_value;
      }
      return acc;
    }, {}),
    ...values,
    // 动态变量
    now: new Date().toISOString(),
    today: new Date().toISOString().split('T')[0],
  };

  const compiled = Handlebars.compile(template.content);
  return compiled(mergedValues);
}
```

---

## 7. AI 集成

### 7.1 AI 功能定义

| 功能 | 描述 | 输入 | 输出 |
|------|------|------|------|
| **模板生成** | 根据描述生成完整模板 | 业务描述 | 模板内容+变量 |
| **变量建议** | 分析内容识别可变量化项 | 模板内容 | 变量列表 |
| **内容优化** | 优化模板语言表达 | 原始内容 | 优化后内容 |
| **智能填充** | 根据上下文自动填充内容 | 变量定义 | 生成内容 |
| **格式检测** | 检测模板语法错误 | 模板内容 | 错误列表+修复建议 |

### 7.2 AI 服务调用

```typescript
// aiService.ts

export interface AiGenerateRequest {
  type: TemplateType;
  description: string;
  context?: Record<string, any>;
  suggest_variables?: boolean;
}

export interface AiSuggestVariablesRequest {
  content: string;
  type?: TemplateType;
}

export async function aiGenerateTemplate(
  request: AiGenerateRequest
): Promise<AiResponse<AiGenerateResponse>> {
  return apiClient.post('/api/v1/templates/ai/generate', request);
}

export async function aiSuggestVariables(
  request: AiSuggestVariablesRequest
): Promise<AiResponse<AiSuggestVariablesResponse>> {
  return apiClient.post('/api/v1/templates/ai/suggest-variables', request);
}
```

### 7.3 AI 提示词设计

```typescript
// 系统提示词
const SYSTEM_PROMPT = `你是一个专业的企业管理系统模板设计师。请根据用户的需求生成高质量的模板。

支持的模板类型：
- workflow: 工作流模板，定义业务流程步骤
- document: 文档模板，标准化文档格式
- form: 表单模板，数据收集表单
- report: 报表模板，数据可视化
- notification: 通知模板，消息通知

模板使用 Mustache 语法定义变量：
- {{variable_name}} 基本变量
- {{variable_name || 'default'}} 带默认值
- {{#if condition}}...{{/if}} 条件判断
- {{#each items}}...{{/each}} 循环遍历

请确保：
1. 变量命名清晰，使用驼峰式
2. 包含必要的校验和提示
3. 格式规范，易于维护`;

// 用户提示词模板
function buildGeneratePrompt(type: string, description: string): string {
  return `请为以下业务场景创建一个${type}类型的模板：

业务描述：${description}

请生成：
1. 模板名称和编码
2. 模板描述
3. 完整的模板内容（包含变量占位符）
4. 推荐的变量定义列表`;
}
```

---

## 8. 安全与权限

### 8.1 权限模型

| 角色 | 模板管理 | 模板使用 | 系统模板 | 个人模板 |
|------|----------|----------|----------|----------|
| 超级管理员 | 完全控制 | 使用 | 查看/修改 | 查看/修改 |
| 管理员 | 管理本模块 | 使用 | 查看 | 查看/修改 |
| 普通用户 | 创建个人 | 使用 | 查看 | 创建/修改/删除 |
| 访客 | 无 | 查看公开 | 查看公开 | 无 |

### 8.2 安全措施

#### 内容安全
```typescript
// XSS 过滤
import DOMPurify from 'dompurify';

export function sanitizeTemplateContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['class', 'style']
  });
}

// 变量值校验
export function validateVariableValue(
  value: any,
  rules: ValidationRule[]
): ValidationResult {
  // 实现校验逻辑
}
```

#### SQL 注入防护
```typescript
// 使用参数化查询
const result = await sqlx.query(
  'SELECT * FROM templates WHERE module = $1',
  [module]
);
```

#### 审计日志
```sql
CREATE TABLE template_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  action VARCHAR(50) NOT NULL,  -- create, update, delete, use, view
  old_value JSONB,
  new_value JSONB,
  performed_by VARCHAR(100),
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 9. 性能优化

### 9.1 缓存策略

```typescript
// 模板缓存
const templateCache = new Map<string, {
  template: Template;
  compiled: HandlebarsTemplateDelegate;
  expires: number;
}>();

// 分类缓存（5分钟）
const categoryCache = {
  data: null as TemplateCategory[] | null,
  expires: 0,
  async get(): Promise<TemplateCategory[]> {
    if (Date.now() > this.expires) {
      this.data = await templateApi.listCategories();
      this.expires = Date.now() + 5 * 60 * 1000;
    }
    return this.data!;
  }
};
```

### 9.2 懒加载

```typescript
// 代码分割
const TemplateEditor = lazy(() => import('./components/template/TemplateEditor'));
const AiAssistant = lazy(() => import('./components/ai/AiAssistant'));

// 组件懒加载
function TemplateManagementPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TemplateList />
      <TemplateEditor />
      <AiAssistant />
    </Suspense>
  );
}
```

---

## 10. 实施计划

### 阶段一：基础框架（1-2周）

1. 数据库表结构设计与实现
2. 基础API开发（CRUD）
3. 前端目录结构搭建
4. 基础组件开发（列表、表单）
5. 分类管理功能

### 阶段二：核心功能（2-3周）

1. 模板编辑器开发
2. 变量系统实现
3. 模板预览功能
4. 模板选择器
5. 渲染服务实现

### 阶段三：高级功能（2-3周）

1. AI服务集成
2. 模板版本管理
3. 权限控制系统
4. 审计日志
5. 统计分析

### 阶段四：优化与上线（1周）

1. 性能优化
2. 安全加固
3. 文档编写
4. 测试验证
5. 部署上线

---

## 11. 附录

### 11.1 模板类型配置

```typescript
export const TEMPLATE_TYPE_CONFIG = {
  workflow: {
    label: '工作流模板',
    icon: 'git-branch',
    color: '#3b82f6',
    contentType: 'application/json',
    editorMode: 'json',
  },
  document: {
    label: '文档模板',
    icon: 'file-text',
    color: '#10b981',
    contentType: 'text/html',
    editorMode: 'html',
  },
  form: {
    label: '表单模板',
    icon: 'layout',
    color: '#f59e0b',
    contentType: 'application/json',
    editorMode: 'json',
  },
  report: {
    label: '报表模板',
    icon: 'bar-chart',
    color: '#ef4444',
    contentType: 'text/html',
    editorMode: 'html',
  },
  notification: {
    label: '通知模板',
    icon: 'bell',
    color: '#8b5cf6',
    contentType: 'text/html',
    editorMode: 'html',
  },
};
```

### 11.2 变量类型配置

```typescript
export const VARIABLE_TYPE_CONFIG = {
  string: {
    label: '单行文本',
    component: 'Input',
    defaultOptions: null,
  },
  number: {
    label: '数字',
    component: 'InputNumber',
    defaultOptions: { precision: 2 },
  },
  date: {
    label: '日期',
    component: 'DatePicker',
    defaultOptions: { format: 'YYYY-MM-DD' },
  },
  datetime: {
    label: '日期时间',
    component: 'DatePicker',
    defaultOptions: { format: 'YYYY-MM-DD HH:mm:ss', showTime: true },
  },
  boolean: {
    label: '开关',
    component: 'Switch',
    defaultOptions: null,
  },
  text: {
    label: '多行文本',
    component: 'TextArea',
    defaultOptions: { rows: 4 },
  },
  select: {
    label: '下拉选择',
    component: 'Select',
    defaultOptions: { mode: null },
  },
  multiselect: {
    label: '多选',
    component: 'Select',
    defaultOptions: { mode: 'multiple' },
  },
  user: {
    label: '当前用户',
    component: 'UserPicker',
    dynamic: true,
  },
  now: {
    label: '当前时间',
    component: 'DatePicker',
    dynamic: true,
  },
  lookup: {
    label: '关联查询',
    component: 'Lookup',
    dynamic: true,
  },
};
```

---

**文档结束**
