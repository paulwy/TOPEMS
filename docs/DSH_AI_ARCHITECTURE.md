# TOPEMS DSH AI 中间层 - 架构设计文档

## 1. 概述

TOPEMS DSH（Data-Driven Service Hub）AI 中间层是一个统一的 AI 能力平台，提供 Agent 编排、工具调用、LLM 集成、性能监控、缓存和告警管理等核心能力。

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
│  Web UI / Mobile / API Clients / Third-party Integrations   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 网关层                               │
│  Authentication / Rate Limiting / CORS / Request Routing    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   DSH AI 中间层 (svc/ai)                    │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │  Agent 编排  │  │  工具注册中心 │  │  LLM Provider 层  │  │
│  │  Orchestrator│  │ ToolRegistry │  │  ProviderFactory  │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬──────────┘  │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │  上下文管理  │  │  MCP 协议适配 │  │  DeepSeek / Ollama│  │
│  │ ContextMgr  │  │  McpServer   │  │  / Mock / Custom  │  │
│  └─────────────┘  └─────────────┘  └───────────────────┘  │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │  性能监控    │  │   缓存管理   │  │   告警管理        │  │
│  │ Performance │  │ CacheManager │  │  AlertManager     │  │
│  └─────────────┘  └─────────────┘  └───────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              AI 治理层 (Governance)                       │ │
│  │  安全护栏 / 内容审核 / 成本计量 / 配额管理 / 审计日志    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      业务系统层                                │
│  CRM / ERP / MES / HRM / Finance / EHS / APS / ...         │
│  (通过 MCP 工具接口集成)                                      │
└─────────────────────────────────────────────────────────────┘
```

## 3. 核心模块设计

### 3.1 Agent 编排器 (AgentOrchestrator)

**位置**: `svc/ai/src/dsh/agent/orchestrator.rs`

**职责**:
- 接收用户查询，编排 Agent 执行流程
- 基于 ReAct（Reasoning + Acting）模式
- 思考 -> 工具调用 -> 观察 -> 最终答案
- 支持多轮对话和上下文管理
- 支持流式响应（SSE）
- 错误恢复和重试机制

**核心数据结构**:
```rust
pub struct AgentOrchestrator {
    config: AgentOrchestratorConfig,
    tool_registry: ToolRegistry,
    context_manager: ContextManager,
    llm_provider: Option<Arc<dyn LlmProvider>>,
    streaming_sessions: Arc<RwLock<HashMap<String, Sender>>>,
    performance_monitor: Option<AgentPerformanceMonitor>,
    alert_manager: Option<AlertManager>,
    cache_manager: Option<CacheManager>,
}
```

**执行流程**:
1. 获取或创建会话上下文
2. 添加用户消息到上下文
3. 主循环（最多 max_iterations 次）:
   - 思考步骤：决定下一步行动
   - 如果需要工具调用：
     - 检查缓存
     - 执行工具调用
     - 缓存结果
     - 记录性能指标
   - 如果不需要工具调用：生成最终答案
4. 添加助手消息到上下文
5. 记录性能指标和告警
6. 返回响应

### 3.2 工具注册中心 (ToolRegistry)

**位置**: `svc/ai/src/dsh/mcp/tools/mod.rs`

**职责**:
- 注册和管理 MCP 工具
- 工具发现和查询
- 工具执行调度
- 工具参数验证

**支持的工具类别**:
- CRM 工具（客户搜索、订单查询等）
- ERP 工具（库存查询、采购管理等）
- MES 工具（生产进度、设备状态等）
- HRM 工具（员工信息、考勤等）
- Finance 工具（财务数据、报表等）
- 系统工具（健康检查、配置查询等）

### 3.3 LLM Provider 层

**位置**: `svc/ai/src/dsh/provider/`

**职责**:
- 统一 LLM 调用接口
- 支持多种 LLM 后端
- Provider 工厂模式
- 流式响应支持

**支持的 Provider**:
- DeepSeek API
- Ollama（本地部署）
- Mock（测试用）
- 自定义 Provider（实现 `LlmProvider` trait）

**核心接口**:
```rust
#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError>;
    async fn ask_stream(&self, request: LlmRequest) -> Result<StreamingResponse, LlmProviderError>;
    fn provider_name(&self) -> &str;
}
```

### 3.4 上下文管理器 (ContextManager)

**位置**: `svc/ai/src/dsh/agent/context.rs`

**职责**:
- 管理多轮对话上下文
- 上下文窗口截断（基于 token 数）
- 上下文变量存储
- 会话持久化

**核心功能**:
- `get_or_create_context(session_id)` - 获取或创建上下文
- `add_message(message)` - 添加消息
- `truncate_context(max_tokens)` - 截断上下文
- `set_variable(key, value)` - 设置变量
- `get_variable(key)` - 获取变量

### 3.5 性能监控器 (AgentPerformanceMonitor)

**位置**: `svc/ai/src/dsh/agent/performance.rs`

**职责**:
- 收集 Agent 执行指标
- 延迟统计（P50/P95/P99）
- 工具调用指标
- 慢查询检测
- 高错误率检测
- Prometheus 指标导出

**核心指标**:
- 总执行次数、成功/失败次数
- 平均/最小/最大耗时
- P50/P95/P99 延迟
- 工具调用次数、成功率、平均耗时
- 平均迭代次数
- 成功率

### 3.6 缓存管理器 (CacheManager)

**位置**: `svc/ai/src/dsh/cache/mod.rs`

**职责**:
- 多层缓存管理
- LRU 淘汰策略
- TTL 过期机制
- 缓存统计

**缓存层级**:
1. **工具调用缓存** - 缓存相同参数的工具调用结果（TTL: 60s）
2. **LLM 响应缓存** - 缓存相同提示词的 LLM 响应（TTL: 300s）
3. **会话上下文缓存** - 缓存会话上下文（TTL: 1800s）

### 3.7 告警管理器 (AlertManager)

**位置**: `svc/ai/src/dsh/alerting/mod.rs`

**职责**:
- 告警规则管理
- 告警评估和触发
- 告警通知
- 告警历史记录
- 告警确认和解决

**默认告警规则**:
| 规则 | 类型 | 级别 | 阈值 |
|------|------|------|------|
| 慢查询 | SlowQuery | WARNING | >5000ms |
| 高错误率 | HighErrorRate | CRITICAL | >10% |
| 配额超限 | QuotaExceeded | CRITICAL | >90% |
| 缓存命中率低 | LowCacheHitRate | INFO | <30% |

### 3.8 AI 治理层 (Governance)

**位置**: `svc/ai/src/dsh/governance/`

**职责**:
- 安全护栏（输入/输出审核）
- 内容审核（敏感词过滤）
- 成本计量（token 统计、成本估算）
- 配额管理（用户/租户配额）
- 审计日志（操作记录）

## 4. 数据流设计

### 4.1 同步执行数据流

```
用户请求
    │
    ▼
API Handler (execute_agent)
    │
    ▼
AgentOrchestrator.execute()
    │
    ├─► ContextManager.get_or_create_context()
    │
    ├─► 主循环 (max_iterations)
    │   │
    │   ├─► think_step()
    │   │   ├─► LLM Provider (如果配置)
    │   │   └─► 规则匹配 (后备方案)
    │   │
    │   ├─► CacheManager.get_cached_tool_call()
    │   │   ├─► 缓存命中 → 直接返回
    │   │   └─► 缓存未命中 → 继续执行
    │   │
    │   ├─► ToolRegistry.execute()
    │   │   ├─► 工具执行
    │   │   └─► 结果返回
    │   │
    │   ├─► CacheManager.cache_tool_call()
    │   │
    │   └─► PerformanceMonitor.record_tool_call()
    │
    ├─► generate_final_answer()
    │
    ├─► ContextManager.update_context()
    │
    ├─► PerformanceMonitor.record_execution()
    │
    └─► AlertManager.evaluate_slow_query()
    │
    ▼
API 响应
```

### 4.2 流式执行数据流

```
用户请求
    │
    ▼
API Handler (stream_agent)
    │
    ▼
AgentOrchestrator.execute_streaming()
    │
    ├─► 创建 StreamingResponse (mpsc channel)
    │
    ├─► 发送 session_start 事件
    │
    ├─► 主循环
    │   │
    │   ├─► 发送 think_start 事件
    │   ├─► 思考
    │   ├─► 发送 think_complete 事件
    │   │
    │   ├─► 发送 tool_call_start 事件
    │   ├─► 执行工具
    │   └─► 发送 tool_call_complete 事件
    │
    ├─► 发送 content_delta 事件 (流式输出)
    ├─► 发送 content_complete 事件
    │
    └─► 发送 session_end 事件
    │
    ▼
SSE 流式响应
```

## 5. 关键设计决策

### 5.1 ReAct 模式选择

**决策**: 采用 ReAct（Reasoning + Acting）模式作为 Agent 编排的核心模式。

**理由**:
- 业界主流的 Agent 编排模式
- 可解释性强（思考过程可见）
- 易于调试和监控
- 支持工具调用的灵活组合

### 5.2 LLM Provider 抽象

**决策**: 使用 trait 抽象 LLM Provider，支持多种后端。

**理由**:
- 避免厂商锁定
- 支持本地部署（Ollama）和云端 API（DeepSeek）
- 易于测试（Mock Provider）
- 符合开闭原则

### 5.3 多层缓存策略

**决策**: 实现工具调用、LLM 响应、会话上下文三层缓存。

**理由**:
- 减少重复的工具调用和 LLM 调用
- 降低延迟和成本
- 提高系统吞吐量
- 每层缓存有不同的 TTL 和用途

### 5.4 告警冷却机制

**决策**: 实现告警冷却机制，避免重复告警。

**理由**:
- 防止告警风暴
- 减少通知噪音
- 提高告警的有效性
- 可配置冷却时间

## 6. 性能设计

### 6.1 性能目标

| 指标 | 目标值 |
|------|--------|
| P50 延迟 | < 1000ms |
| P95 延迟 | < 5000ms |
| P99 延迟 | < 10000ms |
| 吞吐量 | > 100 QPS |
| 可用性 | > 99.9% |

### 6.2 性能优化策略

1. **缓存优化**: 多层缓存减少重复计算
2. **并发处理**: 支持并发的工具调用
3. **流式响应**: 减少首字节时间
4. **连接池**: 数据库和外部 API 连接池
5. **异步处理**: 全异步 I/O
6. **批量处理**: 支持批量工具调用

## 7. 可观测性设计

### 7.1 监控指标

- **业务指标**: 执行次数、成功率、平均延迟
- **性能指标**: P50/P95/P99 延迟、吞吐量
- **资源指标**: CPU、内存、磁盘、网络
- **缓存指标**: 命中率、驱逐次数、过期次数
- **告警指标**: 告警次数、告警级别分布

### 7.2 日志设计

- **结构化日志**: JSON 格式，便于检索
- **日志级别**: DEBUG / INFO / WARN / ERROR
- **请求追踪**: 每个请求有唯一 trace_id
- **审计日志**: 关键操作记录审计日志

### 7.3 告警设计

- **多级告警**: INFO / WARNING / CRITICAL
- **告警通道**: 日志、Webhook、邮件、飞书
- **告警冷却**: 避免重复告警
- **告警确认**: 支持人工确认和解决

## 8. 安全设计

### 8.1 认证授权

- **API Key**: 服务间调用
- **Bearer Token**: 用户认证
- **租户隔离**: 多租户数据隔离
- **权限控制**: 基于角色的访问控制

### 8.2 数据安全

- **输入验证**: 严格的参数验证
- **输出过滤**: 敏感信息过滤
- **数据加密**: 传输加密（TLS）、存储加密
- **隐私保护**: 个人信息脱敏

### 8.3 AI 安全

- **提示词注入防护**: 检测和阻止提示词注入攻击
- **内容审核**: 输入/输出内容审核
- **使用配额**: 防止滥用
- **审计追踪**: 所有 AI 调用可追溯

## 9. 扩展性设计

### 9.1 水平扩展

- **无状态设计**: Agent 编排器无状态，可水平扩展
- **会话存储**: 会话上下文存储在共享存储中
- **负载均衡**: 支持多实例负载均衡

### 9.2 插件化扩展

- **工具插件**: 新工具只需实现工具接口并注册
- **Provider 插件**: 新 LLM 只需实现 Provider trait
- **告警规则插件**: 支持自定义告警规则
- **中间件插件**: 支持自定义中间件

## 10. 部署架构

```
┌─────────────────────────────────────────┐
│              负载均衡器                   │
│         (Nginx / ALB / SLB)             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌──────┐   ┌──────┐   ┌──────┐
│ AI   │   │ AI   │   │ AI   │
│ 实例1 │   │ 实例2 │   │ 实例3 │
└──┬───┘   └──┬───┘   └──┬───┘
   │          │          │
   └──────────┼──────────┘
              ▼
    ┌───────────────────┐
    │   共享存储层        │
    │  Redis / PostgreSQL│
    └───────────────────┘
              │
              ▼
    ┌───────────────────┐
    │   业务系统层        │
    │ CRM/ERP/MES/...   │
    └───────────────────┘
```

## 11. 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | Rust (stable) |
| Web 框架 | Axum |
| 异步运行时 | Tokio |
| 序列化 | Serde / Serde JSON |
| 数据库 | PostgreSQL (SQLx) |
| 缓存 | Redis (可选) |
| 日志 | Tracing |
| 监控 | Prometheus |
| 容器化 | Docker / Kubernetes |
| API 文档 | OpenAPI / Swagger |

## 12. 目录结构

```
svc/ai/
├── src/
│   ├── main.rs                 # 入口
│   ├── routes.rs               # 路由定义
│   ├── handlers/               # API 处理器
│   │   ├── dsh_agent_handlers.rs
│   │   ├── dsh_performance_handlers.rs
│   │   └── ...
│   ├── dsh/                    # DSH AI 中间层核心
│   │   ├── mod.rs
│   │   ├── agent/              # Agent 编排
│   │   │   ├── mod.rs
│   │   │   ├── orchestrator.rs
│   │   │   ├── context.rs
│   │   │   ├── streaming.rs
│   │   │   └── performance.rs
│   │   ├── mcp/                # MCP 协议适配
│   │   │   ├── mod.rs
│   │   │   ├── server.rs
│   │   │   └── tools/
│   │   ├── provider/           # LLM Provider
│   │   │   ├── mod.rs
│   │   │   ├── trait.rs
│   │   │   ├── deepseek.rs
│   │   │   ├── ollama.rs
│   │   │   ├── mock.rs
│   │   │   └── factory.rs
│   │   ├── governance/         # AI 治理
│   │   │   ├── mod.rs
│   │   │   ├── guard.rs
│   │   │   ├── cost_metering.rs
│   │   │   └── mcp_security.rs
│   │   ├── cache/              # 缓存管理
│   │   │   └── mod.rs
│   │   └── alerting/           # 告警管理
│   │       └── mod.rs
│   ├── services/               # 业务服务
│   ├── shared/                 # 共享模块
│   └── ...
├── tests/                      # 集成测试
│   ├── dsh_agent_e2e_test.rs
│   ├── dsh_agent_performance_integration_test.rs
│   └── ...
└── Cargo.toml
```
