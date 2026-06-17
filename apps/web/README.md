# TOPEMS 前端门户

统一的企业数字化平台前端门户，基于 React + TypeScript + Vite + Module Federation。

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
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

## 技术栈

- **框架**: React 18/19
- **语言**: TypeScript 6
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4 + MUI 6
- **路由**: React Router 7
- **HTTP 客户端**: Axios
- **状态管理**: Zustand
- **国际化**: i18next
- **微前端**: Module Federation

## 项目结构

```
TOPEMS/
├── apps/
│   ├── web/                    # 主应用（Host）
│   │   └── src/
│   │       ├── api/            # API 客户端
│   │       ├── components/      # 通用组件
│   │       ├── hooks/          # React Hooks
│   │       ├── pages/          # 页面组件
│   │       ├── store/          # Zustand Store
│   │       └── utils/          # 工具函数
│   └── core/                   # 核心模块（Remote）
│       └── src/
│           ├── api/            # Core API
│           ├── components/      # Core UI 组件
│           ├── hooks/          # Core Hooks
│           ├── pages/          # Core 页面
│           └── store/          # Core Store
│
└── packages/                   # 共享包
    ├── shared-utils/           # 工具函数
    │   └── src/
    │       ├── date.ts         # 日期处理
    │       ├── string.ts       # 字符串处理
    │       ├── number.ts       # 数字/货币/文件大小
    │       ├── function.ts     # debounce/throttle
    │       ├── clone.ts        # deepClone
    │       ├── id.ts           # generateId
    │       ├── validate.ts     # 验证函数
    │       ├── storage.ts      # localStorage 封装
    │       ├── i18n.ts         # 国际化工具
    │       └── request.ts      # Axios 封装
    │
    ├── shared-types/           # 类型定义
    │   └── src/
    │       ├── api.ts          # ApiResponse
    │       ├── auth.ts         # User/Role/Permission
    │       ├── org.ts          # Department/Position
    │       ├── workflow.ts      # 工作流类型
    │       ├── ui.ts           # MenuItem
    │       ├── notification.ts # Notification
    │       ├── file.ts         # FileRecord
    │       └── dict.ts         # DictType/DictData
    │
    └── shared-components/      # 共享组件
        └── src/
            ├── OrgTree.tsx     # 组织架构树
            └── UserSelect.tsx  # 用户选择器
```

## 共享包说明

### shared-utils

通用工具函数库，支持浏览器和 Node.js 环境：

```typescript
import { formatDate, debounce, deepClone, validatePassword } from '@topems/shared-utils';
```

### shared-types

TypeScript 类型定义，支持 snake_case 和 camelCase 自动转换：

```typescript
import type { User } from '@topems/shared-types';
import { mapApiUserToUser } from '@topems/shared-types';
```

### shared-components

通用 React 组件库：

```typescript
import { OrgTree, UserSelect } from '@topems/shared-components';
```

## 后端服务

前端需要 unified-core 后端服务运行：

| 服务 | 端口 | 说明 |
|------|------|------|
| unified-core | 8000 | 统一核心服务（IAM/DOC/FLOW 等聚合） |

查看 [统一核心服务文档](../svc/unified-core/) 了解服务详情。

## 演示账号

- 用户名: testuser
- 密码: Test123456

## 更多文档

- [后端 API 文档](../docs/api/README.md)
- [系统架构](../docs/OVERALL_ARCHITECTURE_DESIGN.md)
- [架构优化方案](../docs/ARCHITECTURE_OPTIMIZATION_PLAN.md)
- [主项目文档](../README.md)

## 许可证

MIT License
