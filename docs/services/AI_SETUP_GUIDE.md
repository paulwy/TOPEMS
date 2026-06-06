## TOPEMS-AI 配置指南

**版本**: 1.2.0  
**最后更新**: 2026-06-06

## 功能介绍

TOPEMS-AI 现在支持真实 AI 服务！包括：

- **Ollama 本地 AI 服务（推荐！免费！）** - 使用 qwen2.5:7b-instruct 等模型
- OpenAI (GPT-3.5, GPT-4)
- 阿里云通义千问
- 任何兼容 OpenAI API 格式的服务
- 内置模拟模式（无需 API Key）

### 新增功能 (v1.2.0)

- **AI 智能表单校验** - 自动检查数据完整性、格式和逻辑
- **AI 数据智能补全** - 根据已有信息推测并补全相关字段
- **AI 文本优化增强** - 支持关键词输入、多种优化风格、历史版本管理
- **自动重试机制** - 网络波动时自动重试，提高稳定性

## 配置步骤

### 0. 推荐：使用 Ollama 本地 AI（免费，无需 API Key）

这是最简单且免费的方式！

1. 安装 Ollama（如未安装）：

```bash
   # macOS
   brew install ollama
   
   # 或访问 https://ollama.com 下载
   ```

1. 拉取模型（我们已经安装了 qwen2.5:7b-instruct）：

   ```bash
   ollama pull qwen2.5:7b-instruct
   ```

2. 启动 Ollama 服务（如果没有运行）：

   ```bash
   ollama serve
   # 或直接在后台运行（大多数情况下默认已启动）
   ```

3. 配置 TOPEMS-AI：

   ```bash
   cd /Users/xingzhai/TOPEMS/services/topems-ai/backend
   # .env 文件已自动配置好
   ```

4. 启动服务：

   ```bash
   cargo run
   ```

5. 你会看到：

```text
   ✅ 使用 Ollama 本地 AI 服务 (模型: qwen2.5:7b-instruct)
   ```

### 1. 快速开始（模拟模式）

无需任何配置，直接启动后端即可使用模拟 AI：

```bash
cd /Users/xingzhai/TOPEMS/services/topems-ai/backend
cargo run
```

你会看到：

```text
⚠️  AI API 未配置，将使用模拟响应（设置 OPENAI_API_KEY 启用真实 AI）
```

### 2. 配置真实 AI 服务

#### 方式一：OpenAI

1. 访问 [OpenAI Platform](https://platform.openai.com/) 注册并获取 API Key
2. 编辑配置文件：

```bash
cd /Users/xingzhai/TOPEMS/services/topems-ai/backend
```

1. 在 `.env` 文件中添加：

```env
OPENAI_API_KEY=sk-你的API密钥
```

#### 方式二：阿里云通义千问（推荐国内用户）

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/) 注册
2. 获取 API Key
3. 编辑 `.env` 文件：

```env
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_API_KEY=sk-你的API密钥
OPENAI_MODEL=qwen-turbo
```

#### 方式三：其他兼容服务

只要是兼容 OpenAI API 格式的服务都可以：

```env
OPENAI_BASE_URL=https://你的服务商API地址
OPENAI_API_KEY=sk-你的API密钥
OPENAI_MODEL=模型名称
```

### 3. 启动服务

重启后端服务：

```bash
cd /Users/xingzhai/TOPEMS/services/topems-ai/backend
cargo run
```

看到这条日志表示配置成功：

```text
✅ AI API 已配置，使用真实 AI 服务
```

### 4. 启动前端

```bash
cd /Users/xingzhai/TOPEMS/services/topems-ai/frontend
npm install
npm run dev
```

访问 http://localhost:5175

## 知识库

TOPEMS-AI 会自动从知识库中提取内容作为上下文。当前包含：

1. TOPEMS 系统架构文档
2. TOPEMS 快速启动指南
3. 化工新材料研发流程

你可以修改代码中的 `documents` 数组来添加自己的知识库内容。

## 界面功能

全新的聊天界面：

- 📚 左侧：知识库文档列表
- 💬 中间：聊天区域
- ⌨️ 底部：问题输入
- ⏳ 实时打字动画
- 📋 快速问题示例

## 测试示例

试试这些问题：

- "TOPEMS 是什么？"
- "化工新材料研发流程是怎样的？"
- "如何启动 TOPEMS 系统？"

## API 端点

TOPEMS-AI 提供以下 API 端点：

### 1. 内容生成 `/api/v1/ai/generate`

```bash
curl -X POST http://localhost:8013/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "prompt": "写一段关于项目管理的介绍"
    },
    "output_format": "text"
  }'
```

### 2. 智能表单校验 `/api/v1/ai/validate`

```bash
curl -X POST http://localhost:8013/api/v1/ai/validate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "研发部",
      "manager": "张三",
      "employee_count": 50
    },
    "context": {
      "module": "HRM",
      "entityType": "department"
    }
  }'
```

### 3. 数据智能补全 `/api/v1/ai/complete`

```bash
curl -X POST http://localhost:8013/api/v1/ai/complete \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "李四",
      "department": "研发部"
    },
    "fields_to_complete": ["position", "email"],
    "context": {
      "module": "HRM",
      "entityType": "employee"
    }
  }'
```

### 4. 智能摘要 `/api/v1/ai/summarize`

```bash
curl -X POST http://localhost:8013/api/v1/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "content": "会议讨论了项目进度和问题...",
    "max_length": 200
  }'
```

## 常见问题

### Q: AI 校验和补全功能返回空结果？

A: 确保 Ollama 服务正在运行，或配置了有效的 API Key。检查后端日志查看详细错误信息。

### Q: 如何调整 AI 重试次数？

A: 在前端代码中配置 `useAIHelper` hook 的 `maxRetries` 参数：

```typescript
const { generate } = useAIHelper({
  featureType: 'validate',
  maxRetries: 3,  // 默认2次
  retryDelay: 2000  // 默认1000ms
});
```

### Q: 如何查看 AI 操作的详细日志？

A: 打开浏览器开发者工具的 Console 面板，或查看后端服务的日志输出。
