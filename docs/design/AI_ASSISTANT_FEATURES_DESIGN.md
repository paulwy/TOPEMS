# TOPEMS AI辅助功能详细设计文档

**版本**: 1.0.0  
**创建日期**: 2026-06-06  
**最后更新**: 2026-06-06  
**状态**: 设计阶段

---

## 目录

- [1. 概述](#1-概述)
- [2. 系统现状分析](#2-系统现状分析)
- [3. AI辅助功能场景设计](#3-ai辅助功能场景设计)
- [4. 技术架构设计](#4-技术架构设计)
- [5. 核心组件设计](#5-核心组件设计)
- [6. API扩展设计](#6-api扩展设计)
- [7. 实施计划](#7-实施计划)
- [8. 成功指标](#8-成功指标)

---

## 1. 概述

### 1.1 设计背景

TOPEMS系统已具备基础AI能力（AI知识库对话页面），但AI能力尚未深度集成到各业务模块的日常操作中。本设计旨在将AI辅助能力融入表单填写、详情编辑、文档撰写等核心业务场景，提升用户工作效率和数据质量。

### 1.2 设计目标

1. **提升录入效率** - 通过AI自动生成、智能补全等功能减少用户手动输入工作量
2. **提高数据质量** - 通过AI校验、智能推荐等功能减少录入错误
3. **增强用户体验** - 提供自然、便捷的AI辅助交互方式
4. **保持扩展性** - 设计通用框架，支持后续功能快速迭代

### 1.3 设计原则

1. **渐进式增强** - AI作为辅助工具，不强制使用，用户可随时接管
2. **上下文感知** - AI建议需基于当前页面上下文和历史数据
3. **可配置** - 各功能可开关、可配置
4. **可审计** - 记录AI辅助操作日志

---

## 2. 系统现状分析

### 2.1 现有AI基础设施

| 组件 | 位置 | 状态 | 说明 |
|------|------|------|------|
| AI对话页面 | [AIPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/AIPage.tsx) | ✅ 已实现 | 支持4种角色：通用、数据分析、文档、编程 |
| AI设置页面 | [AISettingsModal.tsx](file:///Users/air/TOPEMS/frontend/src/components/AISettingsModal.tsx) | ✅ 已实现 | 模型配置、参数调优 |
| AI API | [ai.ts](file:///Users/air/TOPEMS/frontend/src/api/ai.ts) | ✅ 已实现 | chat、search、generate接口 |
| AI服务 | services/topems-ai | ⚠️ 基础实现 | 需扩展更多能力 |

### 2.2 核心业务模块分析

| 模块 | 页面数 | AI应用潜力 | 优先级 |
|------|--------|-----------|--------|
| HRM人力资源 | 10+ | ⭐⭐⭐⭐⭐ | 高 |
| PM项目管理 | 5+ | ⭐⭐⭐⭐⭐ | 高 |
| CRM客户关系 | 3+ | ⭐⭐⭐⭐ | 中高 |
| Finance财务 | 4+ | ⭐⭐⭐ | 中 |
| Flow流程 | 4+ | ⭐⭐⭐⭐ | 中高 |

### 2.3 技术栈现状

```
前端: React + TypeScript + Vite
UI组件: shadcn/ui + Tailwind CSS
状态管理: Zustand
后端: Rust + Axum
AI服务: 本地LLM (qwen2.5:7b) + 知识库
```

---

## 3. AI辅助功能场景设计

### 3.1 优先级定义

| 优先级 | 说明 | 预期收益 |
|--------|------|----------|
| P0 | 高优先级，快速见效 | 效率提升30%+ |
| P1 | 中优先级，增强体验 | 效率提升15-30% |
| P2 | 低优先级，长期规划 | 效率提升<15% |

---

### 3.2 P0 - 高优先级功能

#### 功能1: 智能编码生成

**场景描述**
在录入员工、部门、项目、合同等需要编码的场景时，AI根据上下文信息自动生成符合规则的编码。

**应用页面**
- [HrmDepartmentPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmDepartmentPage.tsx) - 部门编码
- [HrmEmployeePage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmEmployeePage.tsx) - 员工编码
- [PmContractListPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/PmContractListPage.tsx) - 合同编号
- CRMPage.tsx - 客户编码

**交互流程**
```
1. 用户输入名称/标题
2. 点击「AI生成」按钮
3. AI根据规则生成3个编码方案
4. 用户选择或修改后确认
5. 填充到编码输入框
```

**编码规则示例**
| 实体类型 | 规则示例 |
|----------|----------|
| 部门 | DEP-{序号} 或 {拼音首字母}-{序号} |
| 员工 | EMP-{年月}-{序号} |
| 项目 | PRJ-{类型}-{年月}-{序号} |
| 合同 | CON-{类型}-{年月}-{序号} |

**UI设计**
```
┌─────────────────────────────────┐
│ 部门名称: [研发部__________]    │
│ 部门编码: [_______] [AI生成]   │
└─────────────────────────────────┘
点击[AI生成]弹出：
┌─────────────────────────────┐
│  AI推荐编码方案             │
│  ┌───────────────────────┐ │
│  │ DEP-001  [选择]       │ │
│  ├───────────────────────┤ │
│  │ YFB-001   [选择]      │ │
│  ├───────────────────────┤ │
│  │ RD-2026-001 [选择]   │ │
│  └───────────────────────┘ │
│  [自定义编码]              │
└─────────────────────────────┘
```

---

#### 功能2: 详情智能优化

**场景描述**
在填写部门职责、员工简介、合同条款等长文本字段时，AI根据已有关键词或上下文信息生成详细、专业的描述。

**应用页面**
- [HrmDepartmentPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmDepartmentPage.tsx) - 部门职责
- [HrmEmployeeDetailPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmEmployeeDetailPage.tsx) - 个人简介、技能描述
- [PmContractDetailPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/PmContractDetailPage.tsx) - 合同说明

**交互流程**
```
1. 用户输入关键词或简短描述
2. 点击「AI优化」按钮
3. AI生成详细描述
4. 用户可编辑或再次优化
5. 确认后应用
```

**提示词模板**
```
你是TOPEMS系统的AI助手。请根据以下信息生成专业的{实体类型}描述：

实体名称: {name}
关键词: {keywords}
上下文信息: {context}

要求：
- 专业、正式的语言风格
- 300-500字
- 结构清晰，分点描述
- 符合企业管理规范
```

**UI设计**
```
┌─────────────────────────────────────────┐
│ 部门职责:                              │
│ ┌─────────────────────────────────────┐│
│ │ [负责产品研发和技术创新...________]││
│ └─────────────────────────────────────┘│
│ [AI优化] [重新生成]                   │
└─────────────────────────────────────────┘
```

---

#### 功能3: 文档底稿生成

**场景描述**
在创建会议纪要、合同草稿、培训计划、招聘公告等文档时，AI基于模板和关键信息自动生成初稿。

**应用场景**
- 会议纪要
- 合同草稿
- 培训计划
- 招聘公告
- 项目报告

**文档模板库**
| 模板类型 | 关键字段 |
|----------|----------|
| 会议纪要 | 时间、地点、参会人、议题、决议 |
| 合同草稿 | 甲乙双方、标的、金额、期限 |
| 培训计划 | 主题、对象、时间、内容、讲师 |
| 招聘公告 | 岗位、要求、职责、待遇 |

**交互流程**
```
1. 选择文档模板
2. 填写关键信息表单
3. 点击「AI生成」
4. 查看并编辑生成的文档
5. 保存或导出
```

---

#### 功能4: 智能表单校验

**场景描述**
表单提交前，AI自动检查数据完整性、格式合理性和逻辑一致性，提供修复建议。

**校验类型**
1. **完整性检查** - 必填项是否已填
2. **格式检查** - 邮箱、电话、日期格式是否正确
3. **逻辑检查** - 结束日期是否晚于开始日期
4. **合理性检查** - 金额是否在合理范围

**交互流程**
```
1. 用户点击「提交」或「校验」
2. AI进行全面检查
3. 展示问题清单和修复建议
4. 用户可一键修复或手动修改
5. 重新校验通过后提交
```

**UI设计**
```
┌─────────────────────────────────┐
│  AI表单校验结果                 │
│  ┌───────────────────────────┐ │
│  │ ✅ 格式检查通过           │ │
│  │ ⚠️ 部门负责人未选择       │ │
│  │ ❌ 结束日期早于开始日期    │ │
│  └───────────────────────────┘ │
│  [一键修复] [重新校验]        │
└─────────────────────────────────┘
```

---

#### 功能5: 数据智能补全

**场景描述**
根据已有信息，AI自动推测并补全相关字段。

**补全示例**
| 已知信息 | 可补全字段 |
|----------|-----------|
| 员工姓名 | 性别、年龄范围 |
| 身份证号 | 生日、年龄、籍贯 |
| 地址 | 省市区自动拆分 |
| 部门名称 | 部门类型建议 |

**交互流程**
```
1. 用户输入部分信息
2. 系统自动触发AI补全
3. 展示推荐补全值
4. 用户确认或修改
5. 自动填充
```

---

### 3.3 P1 - 中优先级功能

#### 功能6: 智能摘要与总结

**场景描述**
对长文档、合同、记录等进行智能摘要，提取关键信息。

**应用场景**
- 合同内容摘要
- 员工绩效总结
- 项目进度报告
- 会议记录提炼

#### 功能7: 同类数据推荐

**场景描述**
基于历史数据，推荐同类记录的最佳实践。

**应用场景**
- 新客户推荐跟进策略
- 新项目推荐经验教训
- 新合同推荐条款模板

#### 功能8: 多语言翻译

**场景描述**
合同、文档等内容的多语言互译。

**支持语言**
- 中文 ↔ 英文
- 中文 ↔ 日文（可选）

---

### 3.4 P2 - 低优先级功能

#### 功能9: 审批意见助手

**场景描述**
流程审批时，AI自动生成审批意见草稿。

#### 功能10: 智能搜索增强

**场景描述**
自然语言搜索，理解用户意图，跨模块检索。

#### 功能11: 数据洞察与预警

**场景描述**
分析数据趋势，发现异常，提供预警。

#### 功能12: 文档智能分析

**场景描述**
上传文档自动解析，提取关键信息并填充表单。

---

## 4. 技术架构设计

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端应用层                          │
├─────────────────────────────────────────────────────────┤
│  AI助手组件层                                           │
│  ├── AIHelperButton (通用AI按钮)                        │
│  ├── AIGenerateModal (生成弹窗)                         │
│  ├── AICodeGenerator (编码生成)                         │
│  ├── AITextOptimizer (文本优化)                         │
│  ├── AIDocumentGenerator (文档生成)                     │
│  ├── AIFormValidator (表单校验)                         │
│  └── AIDataCompleter (数据补全)                         │
├─────────────────────────────────────────────────────────┤
│  Hooks层                                                │
│  ├── useAIHelper.ts (核心AI Hook)                      │
│  └── useAIPrompt.ts (提示词管理)                       │
├─────────────────────────────────────────────────────────┤
│  API层 [ai.ts](file:///Users/air/TOPEMS/frontend/src/api/ai.ts)  │
│  ├── chat()                                             │
│  ├── generate()                                         │
│  ├── validate()  ← 新增                                │
│  ├── complete()  ← 新增                                │
│  └── summarize() ← 新增                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   AI服务层 (topems-ai)                  │
│  ├── 对话引擎                                           │
│  ├── 生成引擎                                           │
│  ├── 校验引擎 ← 新增                                    │
│  ├── 补全引擎 ← 新增                                    │
│  └── 知识库                                             │
└─────────────────────────────────────────────────────────┘
```

### 4.2 目录结构

```
frontend/src/
├── components/
│   └── ai/
│       ├── AIHelperButton.tsx       # 通用AI辅助按钮
│       ├── AIGenerateModal.tsx      # AI生成弹窗
│       ├── AICodeGenerator.tsx      # 编码生成组件
│       ├── AITextOptimizer.tsx      # 文本优化组件
│       ├── AIDocumentGenerator.tsx  # 文档生成组件
│       ├── AIFormValidator.tsx      # 表单校验组件
│       ├── AIDataCompleter.tsx      # 数据补全组件
│       └── AITemplateLibrary.tsx    # 模板库组件
├── hooks/
│   ├── useAIHelper.ts               # AI助手核心Hook
│   └── useAIPrompt.ts               # 提示词管理Hook
├── config/
│   └── ai-templates.ts              # AI模板配置
└── types/
    └── ai.ts                        # AI相关类型定义
```

---

## 5. 核心组件设计

### 5.1 useAIHelper - 核心Hook

**功能**
- 管理AI请求状态
- 统一错误处理
- 提供通用AI调用方法

**接口设计**
```typescript
interface UseAIHelperOptions {
  featureType: 'code' | 'text' | 'document' | 'validate' | 'complete'
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

interface UseAIHelperReturn {
  isLoading: boolean
  error: Error | null
  generate: (prompt: string, options?: any) => Promise<any>
  validate: (data: any, schema?: any) => Promise<ValidationResult>
  complete: (partialData: any, context?: any) => Promise<any>
}
```

### 5.2 AIHelperButton - 通用按钮组件

**Props**
```typescript
interface AIHelperButtonProps {
  type: 'generate' | 'optimize' | 'validate' | 'complete'
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}
```

### 5.3 AICodeGenerator - 编码生成组件

**Props**
```typescript
interface AICodeGeneratorProps {
  entityType: 'department' | 'employee' | 'project' | 'contract'
  context: {
    name?: string
    parentId?: string
    type?: string
  }
  onSelect: (code: string) => void
  onClose: () => void
}
```

### 5.4 AITextOptimizer - 文本优化组件

**Props**
```typescript
interface AITextOptimizerProps {
  textType: 'description' | 'duty' | 'profile' | 'clause'
  originalText: string
  context?: any
  onOptimized: (text: string) => void
  onClose: () => void
}
```

---

## 6. API扩展设计

### 6.1 新增API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/ai/generate` | POST | 内容生成（已有，需扩展） |
| `/api/v1/ai/validate` | POST | 表单校验 |
| `/api/v1/ai/complete` | POST | 数据补全 |
| `/api/v1/ai/summarize` | POST | 智能摘要 |
| `/api/v1/ai/templates` | GET | 获取模板列表 |

### 6.2 Validate API 设计

**请求**
```typescript
interface ValidateRequest {
  data: Record<string, any>
  schema?: string  // 可选：校验规则JSON Schema
  context?: {
    module: string
    entityType: string
  }
}
```

**响应**
```typescript
interface ValidateResponse {
  valid: boolean
  issues: ValidationIssue[]
  suggestions: Suggestion[]
}

interface ValidationIssue {
  field: string
  type: 'error' | 'warning' | 'info'
  message: string
  fix?: string  // 自动修复建议
}

interface Suggestion {
  field: string
  value: any
  reason: string
}
```

### 6.3 Complete API 设计

**请求**
```typescript
interface CompleteRequest {
  partialData: Record<string, any>
  fieldsToComplete?: string[]
  context?: {
    module: string
    entityType: string
  }
}
```

**响应**
```typescript
interface CompleteResponse {
  completions: Record<string, {
    value: any
    confidence: number  // 0-1
    source: string  // 'inference' | 'history' | 'knowledge'
  }>
}
```

---

## 7. 实施计划

### 7.1 里程碑规划

| 阶段 | 时间 | 目标 | 交付物 |
|------|------|------|--------|
| Phase 1 | 第1-2周 | 基础设施 + P0核心功能 | Hook、基础组件、2个功能落地 |
| Phase 2 | 第3-4周 | 完善P0功能 + P1部分功能 | 所有P0功能、2个P1功能 |
| Phase 3 | 第5-6周 | P1功能 + 优化迭代 | 所有P1功能、用户反馈优化 |
| Phase 4 | 第7-8周 | P2功能 + 文档 | 完整功能集、使用文档 |

---

### 7.2 Phase 1 - 基础设施与核心功能 (第1-2周)

**Week 1 - 基础设施**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 创建AI组件目录结构 | 前端 | `/src/components/ai/` |
| 实现 `useAIHelper` Hook | 前端 | `useAIHelper.ts` |
| 实现 `AIHelperButton` 组件 | 前端 | `AIHelperButton.tsx` |
| 实现 `AIGenerateModal` 组件 | 前端 | `AIGenerateModal.tsx` |
| 扩展 AI API 类型定义 | 前端 | `api/ai.ts` 扩展 |
| 后端 Validate API 初步实现 | 后端 | `/api/v1/ai/validate` |
| 后端 Complete API 初步实现 | 后端 | `/api/v1/ai/complete` |

**Week 2 - 第一个功能落地**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 实现 `AICodeGenerator` 组件 | 前端 | 编码生成组件 |
| 集成到部门管理页面 | 前端 | [HrmDepartmentPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmDepartmentPage.tsx) 改造 |
| 集成到员工管理页面 | 前端 | [HrmEmployeePage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmEmployeePage.tsx) 改造 |
| 实现 `AITextOptimizer` 组件 | 前端 | 文本优化组件 |
| 集成到部门详情编辑 | 前端 | 部门职责AI优化 |
| 单元测试 | 测试 | 核心组件测试覆盖 |
| 用户验收测试 | 产品 | 功能验证 |

---

### 7.3 Phase 2 - P0功能完善 (第3-4周)

**Week 3 - 文档生成与表单校验**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 实现 `AIDocumentGenerator` 组件 | 前端 | 文档生成组件 |
| 实现模板库配置 | 前端 | `ai-templates.ts` |
| 集成到合同创建流程 | 前端 | [PmContractListPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/PmContractListPage.tsx) 改造 |
| 实现 `AIFormValidator` 组件 | 前端 | 表单校验组件 |
| 集成到通用表单 | 前端 | 表单通用AI校验 |
| 后端增强 Validate API | 后端 | 更丰富的校验规则 |

**Week 4 - 数据补全与优化**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 实现 `AIDataCompleter` 组件 | 前端 | 数据补全组件 |
| 集成到员工信息录入 | 前端 | 员工信息智能补全 |
| 集成到客户信息录入 | 前端 | 客户信息智能补全 |
| 性能优化 | 前端 | 加载状态、错误处理优化 |
| 集成测试 | 测试 | 端到端测试 |
| 用户体验优化 | 产品/设计 | 交互优化 |

---

### 7.4 Phase 3 - P1功能 (第5-6周)

**Week 5 - 摘要与推荐**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 实现智能摘要功能 | 前后端 | Summarize API + 前端组件 |
| 集成到合同详情页 | 前端 | 合同内容摘要 |
| 实现同类数据推荐 | 前后端 | 推荐API + 前端组件 |
| 集成到项目创建 | 前端 | 历史项目经验推荐 |

**Week 6 - 多语言与优化**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 实现多语言翻译 | 前后端 | 翻译API + 前端组件 |
| 集成到合同编辑 | 前端 | 合同中英互译 |
| 用户反馈收集与优化 | 产品/前端 | 功能迭代 |
| 性能监控与调优 | 运维/后端 | 性能指标达标 |

---

### 7.5 Phase 4 - P2功能与文档 (第7-8周)

**Week 7 - 高级功能**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 审批意见助手 | 前后端 | Flow模块集成 |
| 智能搜索增强 | 前后端 | 自然语言搜索 |
| 数据洞察预警 | 后端 + BI | 预警功能 |

**Week 8 - 文档与收尾**

| 任务 | 负责人 | 交付物 |
|------|--------|--------|
| 用户使用文档 | 产品 | 用户手册 |
| 开发文档完善 | 技术 | API文档、架构文档 |
| 培训材料 | 产品 | 培训PPT、视频 |
| 最终验收 | 项目组 | 功能验收报告 |

---

## 8. 本地开发与部署流程

### 8.1 环境要求

| 组件 | 要求 | 说明 |
|------|------|------|
| 操作系统 | macOS 12+, Linux, Windows 10+ | 推荐 macOS 或 Linux |
| Node.js | 18+ | 前端开发环境 |
| Python | 3.9+ | 测试脚本运行（无需额外依赖） |
| Rust | 1.70+ | 后端开发 |
| Ollama | 最新版 | 本地LLM服务 |

### 8.2 Ollama 本地部署

#### 8.2.1 安装 Ollama

**macOS**:
```bash
# 使用 Homebrew 安装
brew install ollama

# 或从官网下载: https://ollama.com/download
```

**Linux**:
```bash
# 使用官方脚本安装
curl -fsSL https://ollama.com/install.sh | sh
```

#### 8.2.2 拉取模型

```bash
# 拉取 qwen2.5:7b-instruct 模型
ollama pull qwen2.5:7b-instruct

# 验证模型已安装
ollama list
```

#### 8.2.3 启动 Ollama 服务

```bash
# 方式1: 直接启动（推荐）
ollama serve

# 方式2: 后台启动（Linux/macOS）
nohup ollama serve > ollama.log 2>&1 &
```

**验证服务**:
- 访问 http://localhost:11434 应返回 OK
- 或运行测试脚本验证

---

### 8.3 TOPEMS AI 服务部署

#### 8.3.1 环境变量配置

在 `services/topems-ai/backend/.env` 中配置：
```env
# Ollama 配置
OLLAMA_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:7b-instruct

# 服务配置
SERVER_PORT=8013

# 可选：OpenAI 兼容配置
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4
```

#### 8.3.2 启动 AI 服务

```bash
# 进入 AI 服务目录
cd /Users/air/TOPEMS/services/topems-ai/backend

# 开发模式启动（自动重新加载）
cargo run

# 或编译后运行
cargo build --release
./target/release/topems-ai
```

**验证服务**:
- 访问 http://localhost:8013/health 应返回成功响应

---

### 8.4 前端开发启动

```bash
# 进入前端目录
cd /Users/air/TOPEMS/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可使用前端应用。

---

### 8.5 验证流程与测试

#### 8.5.1 使用测试脚本验证

我们提供了自动化测试脚本，用于验证完整的本地 AI 环境：

```bash
# 进入测试脚本目录
cd /Users/air/TOPEMS/services/topems-ai

# 运行测试脚本（无需安装任何额外依赖！）
python3 test_ai.py
```

**脚本测试内容**:
1. Ollama 本地接口检查
2. 模型验证
3. Ollama 直接生成测试
4. TOPEMS AI 服务健康检查
5. TOPEMS AI 生成接口调用测试

#### 8.5.2 手动验证清单

| 检查项 | 说明 | 验证方法 |
|------|------|---------|
| Ollama 服务运行 | http://localhost:11434 | 访问应返回 OK |
| 模型已安装 | qwen2.5:7b-instruct | `ollama list` |
| AI 后端运行 | http://localhost:8013 | /health 接口检查 |
| 前端应用 | http://localhost:3000 | 访问首页 |
| AI 编码生成 | 在部门/员工创建页面 | 点击 AI 生成按钮 |
| AI 文档生成 | 在 AI 页面 -> 文档生成 | 使用模板生成文档 |

---

### 8.6 故障排查指南

#### 问题1: Ollama 无法连接

**症状**: 连接 http://localhost:11434 失败

**解决方案**:
```bash
# 检查 Ollama 是否运行
ps aux | grep ollama

# 如果没运行，启动服务
ollama serve
```

#### 问题2: 模型未找到

**症状**: AI 服务提示模型不存在

**解决方案**:
```bash
# 确认模型已安装
ollama list

# 如果没有，拉取模型
ollama pull qwen2.5:7b-instruct
```

#### 问题3: AI 服务无法启动

**症状**: `cargo run` 失败

**解决方案**:
```bash
# 检查端口占用
lsof -ti:8013 | xargs kill -9

# 检查环境变量
cat services/topems-ai/backend/.env
```

#### 问题4: 前端调用 AI API 401

**症状**: 前端提示未授权

**解决方案**:
- 检查用户是否已登录
- 检查 Authorization 头是否正确设置
- 验证 Token 有效性

---

### 8.7 生产部署建议

1. **Ollama 服务**: 使用 Systemd 或 Docker 容器化部署
2. **TOPEMS AI 服务**: 同样容器化，与 Ollama 部署在同一网络
3. **负载均衡**: 考虑多实例部署和负载均衡
4. **监控**: 添加服务健康检查和性能监控
5. **日志**: 完善的日志收集与分析

---

## 9. 成功指标

### 9.1 功能指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| AI功能使用率 | >60%活跃用户 | 用户行为统计 |
| 表单填写时间 | 减少30% | A/B测试 |
| 数据录入错误率 | 减少40% | 数据质量审计 |
| 用户满意度 | >4.0/5.0 | 用户调研 |

### 9.2 技术指标

| 指标 | 目标值 |
|------|--------|
| API响应时间 | < 3s (AI生成) |
| API响应时间 | < 500ms (校验/补全) |
| 系统可用性 | 99.5%+ |
| 并发处理能力 | 100+ QPS |

### 9.3 业务指标

| 指标 | 目标值 |
|------|--------|
| HRM模块效率提升 | 25%+ |
| PM模块效率提升 | 20%+ |
| 用户培训时间 | 减少30% |

---

## 10. 风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| LLM响应慢 | 高 | 中 | 增加缓存、优化提示词、降级方案 |
| AI生成质量不稳定 | 高 | 中 | 用户可编辑、质量监控、反馈闭环 |
| 数据隐私问题 | 高 | 低 | 本地部署、数据脱敏、审计日志 |
| 用户接受度低 | 中 | 中 | 渐进式推广、培训、UI/UX优化 |

---

## 11. 后续规划

### 11.1 功能扩展方向

1. **更丰富的模板库** - 覆盖更多业务场景
2. **个性化AI** - 根据用户习惯调整AI行为
3. **团队协作** - AI建议可分享、可评论
4. **跨模块上下文** - 更全局的上下文理解

### 11.2 技术演进方向

1. **更好的LLM** - 升级模型或采用混合模型策略
2. **向量检索优化** - 提升知识库检索效果
3. **Fine-tuning** - 基于业务数据微调模型
4. **Agent架构** - 更复杂的多步AI任务处理

---

**文档版本**: 1.2.0  
**最后更新**: 2026-06-06  
**维护者**: TOPEMS产品团队
