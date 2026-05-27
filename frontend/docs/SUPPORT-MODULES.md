# TOPEMS 支撑模块架构文档

## 目录

1. [模块概述](#模块概述)
2. [导入导出模块](#导入导出模块)
3. [模板管理模块](#模板管理模块)
4. [AI 辅助模块](#ai-辅助模块)
5. [帮助中心模块](#帮助中心模块)
6. [文档中心模块](#文档中心模块)
7. [API 规范](#api-规范)

---

## 模块概述

TOPEMS 系统包含以下支撑模块，用于提升用户体验和系统功能：

| 模块名称 | 功能描述 | 主要技术 |
|---------|---------|---------|
| 导入导出 | 批量数据导入导出 | Excel/CSV/JSON |
| 模板管理 | 文档模板配置管理 | React Hooks |
| AI 辅助 | 智能问答和文档生成 | Ollama API |
| 帮助中心 | 用户文档和教程 | Markdown |
| 文档中心 | 统一文档管理 | 文件系统 |

---

## 导入导出模块

### 功能特性

- **批量数据导入**：支持 Excel (.xlsx, .xls) 和 CSV 格式
- **多种导入模式**：仅创建、仅更新、创建或更新
- **错误处理**：详细的行级错误提示
- **进度显示**：实时导入进度
- **数据预览**：导入前预览数据

### 组件结构

```
src/components/import-export/
├── ImportButton.tsx      # 导入按钮
├── ImportModal.tsx       # 导入弹窗
├── ImportPreview.tsx     # 导入预览
├── ImportProgress.tsx    # 导入进度
├── ExportDropdown.tsx    # 导出下拉菜单
├── ExportOptions.tsx     # 导出选项
└── ExportPreview.tsx     # 导出预览
```

### 使用示例

```tsx
import { ImportModal, ExportDropdown } from './components/import-export';

function DataManagement() {
  const [showImport, setShowImport] = useState(false);
  
  return (
    <>
      <ImportButton onClick={() => setShowImport(true)} />
      
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        entityTypes={[
          { value: 'employee', label: '员工' },
          { value: 'department', label: '部门' },
        ]}
        title="导入数据"
      />
    </>
  );
}
```

### API 接口

```typescript
// 导入请求
interface ImportRequest {
  entity_type: string;
  file_data: string;      // Base64 编码的文件内容
  file_format: string;     // xlsx | csv
  import_mode: string;     // create | update | create_update
  skip_errors: boolean;
}

// 导入结果
interface ImportResult {
  total_rows: number;
  success_rows: number;
  failed_rows: ImportRowError[];
}

// 导出请求
interface ExportRequest {
  entity_type: string;
  filters?: Record<string, string>;
  columns: string[];
  file_format: string;     // excel | pdf | csv
}
```

---

## 模板管理模块

### 功能特性

- **模板分类**：支持多级分类
- **变量定义**：灵活的变量配置
- **模板预览**：实时预览渲染效果
- **模板复制**：快速复制现有模板
- **状态管理**：启用/禁用模板

### API 接口

```typescript
// 模板接口
interface Template {
  id: string;
  name: string;              // 模板名称
  code: string;             // 模板编码
  category: string;         // 分类
  module: string;           // 所属模块
  description?: string;     // 描述
  content: string;          // 模板内容
  variables: TemplateVariable[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 模板变量
interface TemplateVariable {
  key: string;              // 变量键
  label: string;            // 显示标签
  type: 'string' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];       // 选择类型选项
  default_value?: string;
}

// API 方法
export const templateApi = {
  list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Template>>>
  get(id: string): Promise<ApiResponse<Template>>
  create(data: CreateTemplateRequest): Promise<ApiResponse<Template>>
  update(id: string, data: Partial<CreateTemplateRequest>): Promise<ApiResponse<Template>>
  delete(id: string): Promise<ApiResponse<string>>
  listCategories(): Promise<ApiResponse<TemplateCategory[]>>
  render(id: string, variables: Record<string, any>): Promise<ApiResponse<string>>
  duplicate(id: string): Promise<ApiResponse<Template>>
  toggleStatus(id: string): Promise<ApiResponse<Template>>
};
```

### 使用示例

```tsx
import { templateApi, type Template } from '../api/template';

function TemplateComponent() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const res = await templateApi.list({ search: '合同', category: 'HR' });
    if (res.success) {
      setTemplates(res.data.items);
    }
  };

  const handleRender = async (templateId: string) => {
    const res = await templateApi.render(templateId, {
      employee_name: '张三',
      department: '技术部',
      start_date: '2024-01-01',
    });
    if (res.success) {
      console.log('渲染结果:', res.data);
    }
  };
}
```

---

## AI 辅助模块

### 功能特性

- **智能问答**：基于知识库的 AI 问答
- **文档检索**：快速检索相关文档
- **会话管理**：支持多会话切换
- **上下文理解**：保持对话上下文
- **文档生成**：AI 辅助生成文档

### API 接口

```typescript
// 聊天请求
interface ChatRequest {
  query: string;           // 用户问题
  conversation_id?: string; // 会话 ID
  context?: Record<string, any>;
}

// 聊天响应
interface ChatResponse {
  answer: string;          // AI 回答
  conversation_id: string; // 会话 ID
  sources?: DocumentSource[]; // 参考文档
}

// 文档源
interface DocumentSource {
  document_id: string;
  title: string;
  snippet: string;
  relevance_score: number;
}

// API 方法
export const aiApi = {
  listDocuments(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Document>>>
  chat(data: ChatRequest): Promise<ApiResponse<ChatResponse>>
  search(data: SearchRequest): Promise<ApiResponse<SearchResult>>
  generate(data: AIGenerateRequest): Promise<ApiResponse<AIGenerateResponse>>
  listConversations(): Promise<ApiResponse<Conversation[]>>
  createConversation(title?: string): Promise<ApiResponse<Conversation>>
};
```

### 使用示例

```tsx
import { aiApi } from '../api/ai';

function AIAssistant() {
  const handleSend = async (message: string) => {
    try {
      const res = await aiApi.chat({
        query: message,
        conversation_id: currentConversationId,
      });
      
      if (res.success) {
        console.log('AI 回答:', res.data.answer);
        console.log('参考文档:', res.data.sources);
      }
    } catch (error) {
      console.error('AI 服务错误:', error);
    }
  };
}
```

---

## 帮助中心模块

### 功能特性

- **文章分类**：按模块和分类浏览
- **全文搜索**：快速查找帮助内容
- **视频教程**：配套学习视频
- **常见问题**：FAQ 快速解答
- **内容预览**：文章详情预览

### 文章结构

```typescript
interface HelpArticle {
  id: string;
  title: string;
  category: string;
  module: string;
  content: string;          // Markdown 内容
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  article_count: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  module: string;
  url: string;
}
```

---

## 文档中心模块

### 功能特性

- **文件夹管理**：树形目录结构
- **文件上传**：拖拽上传
- **分类标签**：多维度组织
- **收藏功能**：快速访问常用文件
- **在线预览**：常用格式预览
- **全文搜索**：快速定位文件

### API 接口

```typescript
interface Document {
  id: string;
  name: string;             // 文件名
  type: string;            // 文件类型
  size: number;            // 文件大小
  category: string;        // 分类
  tags: string[];          // 标签
  is_favorite: boolean;    // 是否收藏
  created_at: string;
  updated_at: string;
  created_by: string;      // 创建人
  path: string;            // 文件路径
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  type: 'folder';
  document_count: number;
  created_at: string;
}
```

---

## API 规范

### 统一响应格式

所有 API 响应遵循统一的 `ApiResponse` 格式：

```typescript
interface ApiResponse<T> {
  code: number;           // HTTP 状态码
  success: boolean;       // 是否成功
  data: T;               // 响应数据
  message: string;        // 提示消息
  timestamp: string;      // 时间戳
}
```

### 分页查询

```typescript
interface PaginationParams {
  page?: number;         // 页码，从 1 开始
  page_size?: number;    // 每页数量，默认 20
  search?: string;       // 搜索关键词
  category?: string;     // 分类筛选
}

interface PaginatedResult<T> {
  items: T[];            // 数据列表
  total: number;         // 总数
  page: number;          // 当前页
  page_size: number;     // 每页大小
}
```

### 错误处理

```typescript
try {
  const res = await apiCall();
  if (res.success) {
    // 处理成功
  } else {
    // 处理业务错误
    console.error(res.message);
  }
} catch (error) {
  // 处理网络错误
  console.error('网络错误:', error);
}
```

---

## 开发指南

### 添加新支撑模块

1. 在 `src/api/` 目录创建 API 文件
2. 在 `src/pages/` 目录创建页面组件
3. 添加路由配置
4. 更新本文档

### 代码规范

- 使用 TypeScript 类型定义
- 遵循 React Hooks 规范
- 统一的错误处理
- 响应式设计
- 国际化支持

---

## 更新日志

### v1.1.0 (2024-05-27)

- ✅ 完善导入导出组件
- ✅ 新增模板管理 API 和页面
- ✅ 增强 AI 辅助功能
- ✅ 完善帮助中心页面
- ✅ 新增文档中心页面
- ✅ 撰写支撑模块架构文档
