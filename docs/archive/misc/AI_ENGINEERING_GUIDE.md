# TOPEMS DSH AI 模块 - 工程化指南

## 概述

本文档描述 TOPEMS DSH AI 模块的工程化实践，包括开发规范、测试指南、代码质量、构建部署和监控运维。

## 目录

1. [项目结构](#1-项目结构)
2. [开发规范](#2-开发规范)
3. [测试指南](#3-测试指南)
4. [代码质量](#4-代码质量)
5. [构建与部署](#5-构建与部署)
6. [监控与运维](#6-监控与运维)
7. [常用命令](#7-常用命令)

---

## 1. 项目结构

### 1.1 后端结构（Rust）

```
crates/topems-unified-core/src/
├── ai/                          # AI 模块根目录
│   ├── agent/                   # Agent 编排
│   │   ├── orchestrator.rs      # Agent 编排器
│   │   ├── planner.rs           # 计划器
│   │   ├── executor.rs          # 执行器
│   │   └── memory.rs            # 记忆管理
│   ├── mcp/                     # MCP 协议
│   │   ├── server.rs            # MCP 服务器
│   │   ├── client.rs            # MCP 客户端
│   │   ├── security.rs          # 安全防护
│   │   └── transport.rs         # 传输层
│   ├── llm/                     # LLM 集成
│   │   ├── provider.rs          # Provider 抽象
│   │   ├── openai.rs            # OpenAI 实现
│   │   ├── anthropic.rs         # Anthropic 实现
│   │   └── streaming.rs         # 流式处理
│   ├── rag/                     # RAG 检索增强
│   │   ├── retriever.rs         # 检索器
│   │   ├── vector_store.rs      # 向量存储
│   │   └── reranker.rs          # 重排序
│   ├── knowledge_graph/         # 知识图谱
│   │   ├── graph.rs             # 图谱结构
│   │   ├── traversal.rs         # 图遍历
│   │   └── inference.rs         # 推理引擎
│   ├── governance/              # AI 治理
│   │   ├── security.rs          # 安全护栏
│   │   ├── compliance.rs        # 合规检查
│   │   ├── cost.rs              # 成本计量
│   │   ├── audit.rs             # 审计日志
│   │   └── dashboard.rs         # 治理仪表盘
│   ├── business/                # 业务赋能
│   │   ├── copilot.rs           # 业务 Copilot
│   │   ├── smart_form.rs        # 智能表单
│   │   ├── document_intel.rs    # 文档智能
│   │   └── modules/             # 业务模块
│   │       ├── erp.rs
│   │       ├── finance.rs
│   │       ├── crm.rs
│   │       └── wms.rs
│   └── mod.rs                   # 模块导出
└── ...
```

### 1.2 前端结构（React + TypeScript）

```
apps/web/src/
├── api/ai/                      # AI API 封装
│   ├── business-copilot.ts      # 业务 Copilot API
│   ├── business-intelligence.ts # 智能表单+文档智能 API
│   ├── governance-dashboard.ts  # 治理仪表盘 API
│   └── index.ts                 # 统一导出
├── components/ai/               # AI 组件
│   ├── business/                # 业务组件
│   │   ├── BusinessModuleSelector.tsx
│   │   ├── SmartFormRenderer.tsx
│   │   ├── GovernanceDashboard.tsx
│   │   ├── DocumentIntelligence.tsx
│   │   └── index.ts
│   └── DshAgentChatPanel.tsx
├── hooks/features/ai/           # AI Hooks
│   ├── useBusinessCopilot.ts
│   ├── useGovernanceDashboard.ts
│   ├── useDshAgent.ts
│   └── index.ts
├── pages/ai/                    # AI 页面
│   ├── BusinessCopilotPage.tsx
│   ├── GovernanceDashboardPage.tsx
│   ├── DshAgentPage.tsx
│   └── ...
└── modules/ai/config.ts         # AI 路由配置
```

---

## 2. 开发规范

### 2.1 后端开发规范（Rust）

#### 命名规范

- **模块/文件**: `snake_case`（如 `orchestrator.rs`）
- **结构体/枚举**: `PascalCase`（如 `AgentOrchestrator`）
- **函数/方法**: `snake_case`（如 `execute_agent`）
- **常量**: `SCREAMING_SNAKE_CASE`（如 `MAX_ITERATIONS`）
- **类型参数**: 简短的 `PascalCase`（如 `T`, `E`）

#### 代码组织

```rust
// 1. 模块文档注释
//! 模块说明

// 2. 外部依赖导入
use std::collections::HashMap;

// 3. 内部模块导入
use crate::ai::agent::Agent;

// 4. 类型定义
pub struct AgentOrchestrator {
    // ...
}

// 5. 实现块
impl AgentOrchestrator {
    // ...
}

// 6. 测试模块
#[cfg(test)]
mod tests {
    // ...
}
```

#### 错误处理

- 使用 `thiserror` 定义自定义错误类型
- 函数返回 `Result<T, Error>`
- 使用 `?` 操作符传播错误
- 避免 `unwrap()` 和 `expect()`，除非确定不会失败

```rust
#[derive(Debug, thiserror::Error)]
pub enum OrchestratorError {
    #[error("Agent execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Tool not found: {0}")]
    ToolNotFound(String),

    #[error("Max iterations exceeded")]
    MaxIterationsExceeded,
}
```

#### 异步编程

- 使用 `tokio` 运行时
- 异步函数使用 `async fn`
- 避免在异步代码中使用阻塞操作
- 使用 `tokio::spawn` 并发执行任务

### 2.2 前端开发规范（TypeScript + React）

#### 命名规范

- **组件文件**: `PascalCase.tsx`（如 `BusinessCopilotPage.tsx`）
- **工具/Hook 文件**: `camelCase.ts`（如 `useBusinessCopilot.ts`）
- **组件**: `PascalCase`（如 `BusinessModuleSelector`）
- **函数/变量**: `camelCase`（如 `handleSubmit`）
- **常量**: `SCREAMING_SNAKE_CASE`（如 `MAX_RETRIES`）
- **类型/接口**: `PascalCase`（如 `FormDefinition`）

#### 组件开发规范

```tsx
// 1. 导入
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

// 2. 类型定义
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

// 3. 组件实现
const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 副作用
  }, []);

  return (
    <Box>
      <Typography>{title}</Typography>
    </Box>
  );
};

// 4. 默认导出
export default MyComponent;
```

#### Hooks 开发规范

```ts
// 1. 导入
import { useState, useCallback } from 'react';

// 2. 状态类型
interface UseMyHookState {
  data: Data | null;
  isLoading: boolean;
  error: string | null;
}

// 3. 返回值类型
interface UseMyHookReturn extends UseMyHookState {
  fetch: () => Promise<void>;
  reset: () => void;
}

// 4. Hook 实现
export function useMyHook(): UseMyHookReturn {
  const [state, setState] = useState<UseMyHookState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    // ...
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, fetch, reset };
}
```

#### API 封装规范

```ts
// 1. 导入
import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// 2. 类型定义
export interface MyRequest {
  // ...
}

export interface MyResponse {
  // ...
}

// 3. API 函数
export async function fetchData(
  params: MyRequest
): Promise<ApiResponse<MyResponse>> {
  return apiClient.get('/path', { params });
}

// 4. 统一导出
export const myApi = {
  fetchData,
};
```

---

## 3. 测试指南

### 3.1 后端测试（Rust）

#### 测试组织

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // 单元测试
    #[test]
    fn test_orchestrator_creation() {
        // ...
    }

    // 异步测试
    #[tokio::test]
    async fn test_agent_execution() {
        // ...
    }

    // 参数化测试
    #[test]
    fn test_intent_recognition() {
        let cases = vec![
            ("查询数据", Intent::Query),
            ("创建记录", Intent::Create),
        ];

        for (input, expected) in cases {
            // ...
        }
    }
}
```

#### 测试命名

- 测试函数：`test_<功能>_<场景>_<预期结果>`
- 示例：`test_agent_execution_success`、`test_tool_call_timeout_retry`

#### 测试覆盖率

- 目标覆盖率：≥ 80%
- 核心模块覆盖率：≥ 90%
- 使用 `cargo tarpaulin` 生成覆盖率报告

#### 运行测试

```bash
# 运行所有测试
cargo test

# 运行特定包的测试
cargo test -p topems-unified-core

# 运行特定测试
cargo test test_agent_execution

# 显示测试输出
cargo test -- --nocapture

# 异步测试（需要 tokio）
cargo test --features tokio
```

### 3.2 前端测试（Vitest + React Testing Library）

#### 组件测试

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BusinessModuleSelector from './BusinessModuleSelector';

describe('BusinessModuleSelector', () => {
  it('renders all business modules', () => {
    render(<BusinessModuleSelector selectedModule="erp" onSelect={() => {}} />);
    expect(screen.getByText('ERP')).toBeInTheDocument();
  });

  it('calls onSelect when module is clicked', () => {
    const onSelect = vi.fn();
    render(<BusinessModuleSelector selectedModule="erp" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Finance'));
    expect(onSelect).toHaveBeenCalledWith('finance');
  });
});
```

#### Hooks 测试

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useBusinessCopilot } from './useBusinessCopilot';

describe('useBusinessCopilot', () => {
  it('initializes with default module', () => {
    const { result } = renderHook(() => useBusinessCopilot('erp'));
    expect(result.current.currentModule).toBe('erp');
  });

  it('sends message successfully', async () => {
    const { result } = renderHook(() => useBusinessCopilot('erp'));
    await act(async () => {
      await result.current.send('test message');
    });
    expect(result.current.messages).toHaveLength(2);
  });
});
```

#### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test BusinessModuleSelector

# 监听模式
pnpm test --watch

# 生成覆盖率报告
pnpm test --coverage
```

---

## 4. 代码质量

### 4.1 后端代码质量

#### Clippy 检查

```bash
# 运行 Clippy
cargo clippy

# 修复可自动修复的问题
cargo clippy --fix

# 严格模式
cargo clippy -- -D warnings
```

#### 格式化

```bash
# 检查格式
cargo fmt --check

# 自动格式化
cargo fmt
```

#### 依赖审计

```bash
# 检查依赖漏洞
cargo audit

# 检查依赖许可证
cargo deny check licenses
```

### 4.2 前端代码质量

#### ESLint 检查

```bash
# 运行 ESLint
pnpm lint

# 自动修复
pnpm lint --fix

# 检查特定文件
pnpm lint src/pages/ai/BusinessCopilotPage.tsx
```

#### Prettier 格式化

```bash
# 检查格式
pnpm format:check

# 自动格式化
pnpm format
```

#### TypeScript 类型检查

```bash
# 类型检查
pnpm typecheck

# 生成类型声明
pnpm build:types
```

### 4.3 Git Hooks

项目使用 `lefthook` 管理 Git Hooks：

- **pre-commit**: 运行格式化和 lint 检查
- **pre-push**: 运行测试和类型检查
- **commit-msg**: 验证提交信息格式

```bash
# 安装 hooks
lefthook install

# 手动运行 pre-commit
lefthook run pre-commit
```

---

## 5. 构建与部署

### 5.1 后端构建

```bash
# 开发构建
cargo build

# 生产构建
cargo build --release

# 构建特定包
cargo build -p topems-unified-core

# 检查编译（不生成二进制）
cargo check
```

### 5.2 前端构建

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build

# 预览构建结果
pnpm preview

# 类型检查 + 构建
pnpm build:types && pnpm build
```

### 5.3 Docker 构建

```bash
# 构建后端镜像
docker build -f docker/backend.Dockerfile -t topems-backend:latest .

# 构建前端镜像
docker build -f docker/frontend.Dockerfile -t topems-frontend:latest .

# 使用 docker-compose 启动
docker-compose up -d
```

### 5.4 环境变量

后端环境变量（`.env`）：

```env
# 服务配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/topems

# Redis 配置
REDIS_URL=redis://localhost:6379

# LLM 配置
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# AI 治理配置
AI_GOVERNANCE_ENABLED=true
AI_COST_BUDGET=50000
AI_RATE_LIMIT=100

# 日志配置
RUST_LOG=info
LOG_LEVEL=info
```

前端环境变量（`.env.local`）：

```env
# API 配置
VITE_API_BASE_URL=http://localhost:8080/api

# AI 配置
VITE_AI_ENABLED=true
VITE_AI_CHAT_ENABLED=true

# 功能开关
VITE_FEATURE_BUSINESS_COPILOT=true
VITE_FEATURE_GOVERNANCE_DASHBOARD=true
```

---

## 6. 监控与运维

### 6.1 日志

- 后端使用 `tracing` 框架
- 日志级别：`error` > `warn` > `info` > `debug` > `trace`
- 结构化日志，包含请求 ID、用户 ID、租户 ID

```rust
use tracing::{info, error, warn};

info!(session_id = %session.id, "Agent execution started");
error!(error = %e, "Agent execution failed");
```

### 6.2 指标

- 使用 `metrics` crate 收集指标
- Prometheus 格式输出
- 关键指标：请求数、响应时间、错误率、Token 使用量、成本

### 6.3 健康检查

```bash
# 健康检查
curl http://localhost:8080/health

# 就绪检查
curl http://localhost:8080/ready

# AI 模块健康检查
curl http://localhost:8080/api/ai/health
```

### 6.4 告警

- 基于性能监控数据自动触发告警
- 告警级别：`info` > `warning` > `critical`
- 告警渠道：邮件、Webhook、企业微信

---

## 7. 常用命令

### 7.1 开发命令

```bash
# 后端开发
cargo watch -x run

# 前端开发
cd apps/web && pnpm dev

# 同时启动前后端
pnpm dev:all
```

### 7.2 测试命令

```bash
# 后端测试
cargo test

# 后端测试覆盖率
cargo tarpaulin --out Html

# 前端测试
cd apps/web && pnpm test

# 前端测试覆盖率
cd apps/web && pnpm test --coverage
```

### 7.3 代码质量命令

```bash
# 后端
cargo fmt
cargo clippy -- -D warnings

# 前端
cd apps/web && pnpm lint
cd apps/web && pnpm format
cd apps/web && pnpm typecheck
```

### 7.4 构建命令

```bash
# 后端
cargo build --release

# 前端
cd apps/web && pnpm build

# 全部构建
pnpm build:all
```

### 7.5 Docker 命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 附录

### A. 相关文档

- [API 文档](./DSH_BUSINESS_INTELLIGENCE_API.md)
- [架构设计文档](./DSH_AI_ARCHITECTURE.md)
- [使用指南](./DSH_AI_USAGE_GUIDE.md)

### B. 联系方式

- 技术支持：tech-support@topems.com
- 问题反馈：GitHub Issues

---

**文档版本**: 1.0.0
**最后更新**: 2024-01-01
**维护者**: TOPEMS AI Team
