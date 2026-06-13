# TOPEMS 模板管理系统技术规格文档

**文档版本**: 1.0.0  
**创建日期**: 2026-06-13  
**状态**: **已实现**

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

**实际实现文件**: [20260613000001_extend_templates.sql](file:///Users/air/TOPEMS/svc/doc/src/db/migrations/20260613000001_extend_templates.sql)

```sql
CREATE TABLE doc_service.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50),                    -- workflow, document, form, report, notification
    category_id UUID REFERENCES doc_service.template_categories(id),
    module VARCHAR(100),                 -- ERP, HRM, CRM, QMS, LIMS, etc.
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    ai_enabled BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

CREATE INDEX idx_templates_type ON doc_service.templates(type);
CREATE INDEX idx_templates_category ON doc_service.templates(category_id);
CREATE INDEX idx_templates_module ON doc_service.templates(module);
```

### 3.2 模板分类表 (template_categories)

```sql
CREATE TABLE doc_service.template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50),                   -- 关联的模板类型
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.3 模板变量表 (template_variables)

```sql
CREATE TABLE doc_service.template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES doc_service.templates(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'string',
    required BOOLEAN DEFAULT false,
    default_value JSONB,
    options JSONB,
    data_source VARCHAR(255),
    validation_rules JSONB,
    placeholder VARCHAR(255),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.4 模板实例表 (template_instances)

```sql
CREATE TABLE doc_service.template_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES doc_service.templates(id),
    instance_type VARCHAR(50) NOT NULL,
    instance_id VARCHAR(100) NOT NULL,
    variables_values JSONB,
    rendered_content TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.5 模板版本表 (template_versions)

```sql
CREATE TABLE doc_service.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES doc_service.templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    change_summary TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.6 审计日志表 (template_audit_log)

```sql
CREATE TABLE doc_service.template_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID,
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
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
| `today` | 当前日期 | 渲染时自动注入 | 自动填充日期 |
| `context` | 上下文数据 | 根据使用场景注入 | 业务关联数据 |

### 4.2 变量语法

#### Mustache 语法扩展

```handlebars
{{!-- 基础变量 --}}
{{variable_name}}

{{!-- 默认值语法 --}}
{{variable_name || '默认值'}}

{{!-- 条件判断 --}}
{{#if condition}}
  显示内容
{{/if}}

{{#ifnot condition}}
  显示内容
{{/ifnot}}

{{!-- 动态变量 --}}
{{today}}
{{now}}
```

---

## 5. API 设计

### 5.1 模板管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/templates` | 获取模板列表 |
| GET | `/api/v1/templates/{id}` | 获取单个模板 |
| POST | `/api/v1/templates` | 创建模板 |
| PUT | `/api/v1/templates/{id}` | 更新模板 |
| DELETE | `/api/v1/templates/{id}` | 删除模板 |
| POST | `/api/v1/templates/{id}/duplicate` | 复制模板 |
| PUT | `/api/v1/templates/{id}/toggle-status` | 切换状态 |
| POST | `/api/v1/templates/{id}/render` | 渲染模板 |

### 5.2 AI 辅助接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/templates/ai/generate` | AI生成模板 |
| POST | `/api/v1/templates/ai/suggest-variables` | AI建议变量 |
| POST | `/api/v1/templates/ai/optimize` | AI优化内容 |

---

## 6. 后端实现

### 6.1 项目结构

```
svc/doc/src/
├── models/
│   └── mod.rs                        # 数据模型定义
├── db/
│   ├── migrations/                   # 数据库迁移脚本
│   └── repository.rs                 # 数据访问层
├── api/
│   └── handlers/
│       └── template.rs               # 模板API处理器
├── services/
│   ├── template_render_service.rs    # 模板渲染服务
│   └── template_ai_service.rs       # AI辅助服务
└── main.rs                           # 服务入口
```

### 6.2 核心服务

**模板渲染服务** ([template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs))
- 变量替换、条件判断处理
- 动态变量自动注入
- 模板验证和变量提取

**AI辅助服务** ([template_ai_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_ai_service.rs))
- 模板生成、变量建议
- 内容优化、变量分析

---

## 7. 前端实现

### 7.1 项目结构

```
apps/web/src/components/templates/
├── TemplateEditor.tsx                # 模板编辑器组件
├── TemplateSelector.tsx              # 模板选择器组件
├── TemplateAIHelper.tsx              # AI助手组件
├── TemplateDemoPage.tsx              # 演示页面
└── index.ts                          # 组件导出
```

### 7.2 核心组件

**模板编辑器** ([TemplateEditor.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateEditor.tsx))
- 支持模板基本信息编辑
- 可视化变量管理
- 实时预览模式
- 变量一键插入

**模板选择器** ([TemplateSelector.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateSelector.tsx))
- 支持按类型筛选
- 分类筛选和搜索
- 卡片展示模板信息
- 变量配置表单

**AI助手** ([TemplateAIHelper.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateAIHelper.tsx))
- 智能模板生成
- 变量自动检测与建议
- 内容优化
- 变量使用分析

**演示页面** ([TemplateDemoPage.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateDemoPage.tsx))
- 完整的模板管理演示流程
- 模板选择、配置、渲染全流程展示

---

## 8. 测试用例

### 8.1 测试覆盖范围

**后端测试** ([template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs))
- 基础变量替换测试
- 默认值处理测试
- 条件判断测试
- 数字和金额变量测试
- 数组类型变量测试
- 用户选择变量测试
- 日期时间变量测试
- 变量提取功能测试
- 变量验证测试
- 特殊字符处理测试
- 完整工作流场景测试

### 8.2 测试执行

```bash
cd /Users/air/TOPEMS/svc/doc
cargo test template_render_service -- --nocapture
```

---

## 9. 实施状态

| 阶段 | 状态 | 完成时间 |
|------|------|----------|
| 数据库迁移 | ✅ 完成 | 2026-06-13 |
| 模型定义 | ✅ 完成 | 2026-06-13 |
| Repository层 | ✅ 完成 | 2026-06-13 |
| API Handlers | ✅ 完成 | 2026-06-13 |
| 模板渲染服务 | ✅ 完成 | 2026-06-13 |
| AI辅助服务 | ✅ 完成 | 2026-06-13 |
| 前端类型定义 | ✅ 完成 | 2026-06-13 |
| 模板编辑器 | ✅ 完成 | 2026-06-13 |
| 模板选择器 | ✅ 完成 | 2026-06-13 |
| AI助手组件 | ✅ 完成 | 2026-06-13 |
| 演示页面 | ✅ 完成 | 2026-06-13 |
| 测试用例 | ✅ 完成 | 2026-06-13 |

---

## 10. 附录

### 10.1 模板类型配置

```typescript
export const TEMPLATE_TYPE_CONFIG = {
  workflow: { label: '工作流模板', color: '#3b82f6' },
  document: { label: '文档模板', color: '#10b981' },
  form: { label: '表单模板', color: '#f59e0b' },
  report: { label: '报表模板', color: '#ef4444' },
  notification: { label: '通知模板', color: '#8b5cf6' },
};
```

### 10.2 变量类型配置

```typescript
export const VARIABLE_TYPE_CONFIG = {
  string: { label: '单行文本', component: 'Input' },
  number: { label: '数字', component: 'InputNumber' },
  date: { label: '日期', component: 'DatePicker' },
  datetime: { label: '日期时间', component: 'DatePicker' },
  boolean: { label: '开关', component: 'Switch' },
  select: { label: '下拉选择', component: 'Select' },
  multiselect: { label: '多选', component: 'Select' },
  user: { label: '当前用户', component: 'UserPicker', dynamic: true },
  now: { label: '当前时间', component: 'DatePicker', dynamic: true },
};
```

---

## 11. 日志与调试功能

### 11.1 前端日志输出

**实现文件**: [TemplateDemoPage.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateDemoPage.tsx#L242-L374)

前端模板渲染服务提供详细的日志输出，帮助开发者排查变量替换问题。

#### 日志内容

1. **渲染开始信息**
   - 模板名称、ID
   - 原始内容长度和内容
   - 变量配置（JSON格式）
   - 变量定义（JSON格式）

2. **步骤1 - 变量替换**
   - 每个变量的值和类型
   - 匹配次数和替换次数
   - 正则表达式模式
   - 警告：如果模板中未找到变量
   - 错误：如果替换后变量仍存在

3. **步骤2 - 条件判断处理**
   - 找到的条件块数量
   - 每个条件块的详细信息：
     - 条件变量名
     - 变量值和类型
     - 布尔转换结果
     - 内容长度
     - 处理结果（保留或删除）

4. **步骤3 - 默认值处理**
   - 找到的默认值块数量
   - 每个默认值块的详细信息：
     - 变量名
     - 变量值
     - 默认值
     - 最终值
     - 是否使用默认值

5. **步骤4 - 动态变量替换**
   - `{{today}}` 和 `{{now}}` 的值
   - 匹配次数

6. **步骤5 - 未处理变量检查**
   - 检查是否有未处理的变量
   - 如果发现未处理变量，输出警告和建议

7. **渲染完成信息**
   - 最终内容长度
   - 最终渲染内容
   - 渲染耗时

#### 使用方法

```javascript
// 1. 打开浏览器开发者工具（F12）
// 2. 切换到 Console 标签
// 3. 在模板演示页面选择模板并配置变量
// 4. 点击"渲染模板"按钮
// 5. 查看控制台输出的详细日志
```

### 11.2 后端日志输出

**实现文件**: [template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs)

后端模板渲染服务提供完整的日志输出，与前端保持一致。

#### 新增方法

1. **`render_with_logging` 方法**
   - 带完整日志的渲染入口
   - 输出渲染开始/结束信息
   - 输出原始内容和最终结果

2. **`process_conditionals_with_logging` 方法**
   - 带日志的条件判断处理
   - 输出每个条件块的处理结果

3. **`process_dynamic_variables_with_logging` 方法**
   - 带日志的动态变量处理
   - 输出动态变量的值和匹配次数

4. **`check_remaining_variables` 方法**
   - 检查未处理变量并输出警告
   - 提供排查建议

5. **`value_type_name` 方法**
   - 获取变量类型名称
   - 用于日志输出

#### 使用方法

```bash
# 启动服务时设置日志级别
RUST_LOG=debug cargo run --bin topems-doc

# 日志会输出到控制台
# 每个步骤的处理结果都会详细记录
```

### 11.3 排查指南

**文档文件**: [template-troubleshooting-guide.md](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md)

完整的排查指南文档，包含：

1. **常见警告类型及排查方法**
   - ⚠️ "模板中未找到变量 {{xxx}}"
   - ⚠️ "发现未处理的变量"
   - ❌ "变量 {{xxx}} 替换后仍存在"

2. **条件判断问题排查**
   - 变量类型错误（字符串 vs 布尔值）
   - 布尔转换逻辑检查

3. **默认值问题排查**
   - 空字符串被视为有效值
   - 使用 null 或不传递变量

4. **动态变量问题排查**
   - 支持的动态变量列表
   - 变量名拼写错误检查

5. **完整排查流程**
   - 7步排查清单
   - 从日志开始到最终结果

6. **常见问题速查表**
   - 快速定位问题和解决方案

7. **调试技巧**
   - 浏览器控制台使用
   - 后端日志查看
   - 单元测试验证

8. **最佳实践**
   - 变量命名规范
   - 变量定义规范
   - 模板编写规范
   - 测试验证

---

## 12. 实施记录

### 12.1 2026-06-13 实施内容

#### 数据库迁移
- ✅ 执行迁移脚本 [20260613000001_extend_templates.sql](file:///Users/air/TOPEMS/svc/doc/src/db/migrations/20260613000001_extend_templates.sql)
- ✅ 添加新字段：`templates.type`, `templates.is_public`, `templates.ai_enabled`, `templates.version`
- ✅ 创建新表：`template_variables`, `template_instances`, `template_versions`, `template_audit_log`

#### 后端实现
- ✅ 扩展模型定义 [mod.rs](file:///Users/air/TOPEMS/svc/doc/src/models/mod.rs)
- ✅ 更新 Repository 层 [repository.rs](file:///Users/air/TOPEMS/svc/doc/src/db/repository.rs)
- ✅ 实现模板渲染服务 [template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs)
- ✅ 实现模板 API Handlers [template.rs](file:///Users/air/TOPEMS/svc/doc/src/api/handlers/template.rs)
- ✅ 添加详细日志输出功能

#### 前端实现
- ✅ 创建模板编辑器 [TemplateEditor.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateEditor.tsx)
- ✅ 创建模板选择器 [TemplateSelector.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateSelector.tsx)
- ✅ 创建 AI 助手 [TemplateAIHelper.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateAIHelper.tsx)
- ✅ 创建演示页面 [TemplateDemoPage.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateDemoPage.tsx)
- ✅ 添加详细日志输出功能

#### 测试与文档
- ✅ 编写测试用例 [template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs#L267-L418)
- ✅ 创建排查指南 [template-troubleshooting-guide.md](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md)
- ✅ 更新技术规格文档

#### 服务状态
- ✅ 前端服务：http://localhost:5173/template-demo 正常运行
- ✅ 后端服务：http://localhost:8024 正常运行
- ✅ 模板 API 正常返回数据

### 12.2 待实施内容

#### AI 集成
- ⏳ 接入 OpenAI API
- ⏳ 实现智能模板生成
- ⏳ 实现变量智能建议
- ⏳ 实现内容优化建议

#### 高级功能
- ⏳ 模板版本管理
- ⏳ 模板权限控制
- ⏳ 模板审计日志查询
- ⏳ 模板统计分析

#### 性能优化
- ⏳ 模板缓存机制
- ⏳ 大模板渲染优化
- ⏳ 批量渲染支持

---

**文档结束**