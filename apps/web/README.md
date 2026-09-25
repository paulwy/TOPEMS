# TOPEMS 前端门户

统一的企业级数字化平台前端门户，基于 React + TypeScript + Vite + Module Federation，采用 pnpm workspace 多包管理。

## 快速开始

### 环境要求

- Node.js 20+（CI 使用 Node 22）
- pnpm 8+（workspace 根执行）

### 安装依赖

在仓库根目录执行（本包为 pnpm workspace 成员）：

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
pnpm build
```

### 类型检查

```bash
pnpm typecheck
```

### 组件文档（Storybook）

```bash
pnpm storybook          # 开发模式 → http://localhost:6006
pnpm build-storybook    # 构建静态站点（apps/web/storybook-static，已 gitignore）
```

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | ^19.2.7 | UI 框架 |
| TypeScript | ^6.0.3 | 类型安全 |
| Vite | ^8.1.5 | 构建工具 |
| MUI | ^9.4.0 | UI 组件库（material + icons） |
| React Router | ^7.18.3 | 路由 |
| Axios | ^1.6.8 | HTTP 客户端 |
| Zustand | ^5.0.14 | 状态管理 |
| i18next | ^26.3.1 | 国际化（react-i18next ^17.0.8） |
| Module Federation | @module-federation/vite ^1.16.8 | 微前端（Remote） |
| Storybook | 10.5.4 | 组件文档（autodocs） |
| Vitest | - | 单元/组件测试（5 shards） |
| Playwright | - | E2E 测试 |

## Storybook 组件文档

- **配置**：`apps/web/.storybook/main.ts`（framework=react-vite + addon-docs，addon-docs 须与主包同版本 10.5.4）
- **覆盖**：51 个组件文档页 + 160 个 stories（Charts/Common/Mobile/Templates/Design Tokens）
- **文档生成**：autodocs 自动从源码生成 Props 表格与示例，组件描述在 `*.stories.tsx` 的 `meta.component` 中维护
- **CI 发布**：`.github/workflows/storybook-docs.yml` 在 main 分支相关变更后自动构建并发布 GitHub Pages（`https://paulwy.github.io/TOPEMS/`）

## 项目结构

```
apps/
├── web/                       # 前端门户（Host + Module Federation Remote）
│   └── src/
│       ├── api/               # API 客户端（基于 @topems/api-client）
│       ├── components/        # 通用组件（Charts/Common/Mobile/Templates）
│       ├── hooks/             # React Hooks
│       ├── pages/             # 页面组件
│       ├── store/             # Zustand Store
│       ├── utils/             # 工具函数
│       └── .storybook/        # Storybook 配置
├── mobile/                    # 移动端
└── desktop/                   # 桌面端（Tauri）

packages/
├── api-client/                # API 客户端包（@topems/api-client）
├── app-shell/                 # 应用外壳
├── business-tools-sdk/        # 业务工具 SDK
├── shared-components/         # 共享 React 组件库
├── shared-hooks/              # 共享 Hooks（useIntersectionObserver 等）
├── shared-types/              # 共享类型定义
├── shared-utils/              # 共享工具函数
└── tokens/                    # 设计令牌
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
