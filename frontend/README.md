# TOPEMS 前端门户

统一的企业数字化平台前端门户，基于 React + TypeScript + Vite + Tailwind CSS。

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── api/           # API 客户端
│   │   ├── client.ts  # API 基础客户端
│   │   ├── iam.ts     # IAM 服务 API
│   │   ├── doc.ts     # 文档服务 API
│   │   ├── ai.ts      # AI 服务 API
│   │   └── flow.ts    # 工作流服务 API
│   ├── pages/         # 页面组件
│   │   ├── LoginPage.tsx      # 登录页面
│   │   └── DashboardPage.tsx  # 仪表板页面
│   ├── App.tsx        # 主应用组件
│   ├── main.tsx       # 入口文件
│   └── index.css      # 全局样式
├── package.json       # 项目配置
├── vite.config.ts     # Vite 配置
├── tsconfig.json      # TypeScript 配置
└── index.html         # HTML 模板
```

## 🎯 主要功能

### 1. 用户认证
- 用户注册
- 用户登录
- JWT Token 管理
- 权限控制

### 2. 统一门户
- 简洁的仪表板
- 服务状态监控
- 快速导航

### 3. 服务集成
- IAM（身份认证服务）
- DOC（文档管理服务）
- AI（AI 知识库服务）
- FLOW（工作流服务）

## 🔧 技术栈

- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **路由**: React Router 6
- **HTTP 客户端**: Axios
- **图标**: Lucide React

## 📡 API 集成

前端通过统一的 API 客户端连接后端服务：

```typescript
import apiClient from './api/client';
import { authApi } from './api/iam';

// 设置认证 Token
apiClient.setAuthToken('your-jwt-token');

// 调用 API
const response = await authApi.login({
  username: 'testuser',
  password: 'password123',
});
```

## 🚦 后端服务

前端需要以下后端服务运行：

| 服务 | 端口 | 说明 |
|------|------|------|
| IAM | 8002 | 身份认证服务 |
| DOC | 8001 | 文档管理服务 |
| AI | 8003 | AI 知识库服务 |
| FLOW | 8004 | 工作流服务 |

查看 [启动脚本](../start.sh) 了解如何启动所有服务。

## 🎨 开发指南

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/App.tsx` 中添加路由

```tsx
<Route path="/new-page" element={<NewPage />} />
```

### 添加新 API

在 `src/api/` 目录创建新的 API 模块：

```typescript
// src/api/newService.ts
import apiClient from './client';

export const newServiceApi = {
  getData: async () => {
    return apiClient.get('/api/v1/data');
  },
};
```

## 📝 演示账号

- 用户名: testuser
- 密码: Test123456

## 🔒 安全注意事项

- JWT Token 存储在 localStorage 中
- 生产环境建议使用 HttpOnly Cookie
- 所有 API 请求都需要认证

## 📚 更多文档

- [后端 API 文档](../docs/api-specification.md)
- [系统架构](../docs/architecture/overview.md)
- [快速开始](../QUICKSTART.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
