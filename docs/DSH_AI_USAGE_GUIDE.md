# TOPEMS DSH AI 中间层 - 使用指南和最佳实践

## 1. 快速开始

### 1.1 环境要求

- Rust 1.75+
- PostgreSQL 14+（可选，用于持久化）
- Redis 7+（可选，用于分布式缓存）
- 至少 2GB 内存

### 1.2 安装和运行

```bash
# 克隆仓库
git clone https://github.com/your-org/topems.git
cd topems

# 构建
cargo build --release -p topems-ai

# 运行（使用默认配置）
./target/release/topems-ai

# 或使用 cargo run
cargo run -p topems-ai
```

### 1.3 环境变量配置

```bash
# 服务配置
export DSH_AI_HOST=0.0.0.0
export DSH_AI_PORT=8080
export DSH_AI_LOG_LEVEL=info

# 数据库配置（可选）
export DATABASE_URL=postgres://user:password@localhost:5432/topems_ai

# Redis 配置（可选）
export REDIS_URL=redis://localhost:6379

# LLM Provider 配置
export LLM_PROVIDER=deepseek  # deepseek / ollama / mock
export DEEPSEEK_API_KEY=your-api-key
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export OLLAMA_BASE_URL=http://localhost:11434

# 性能监控配置
export PERFORMANCE_MONITOR_ENABLED=true
export PERFORMANCE_MAX_HISTORY=10000
export SLOW_QUERY_THRESHOLD_MS=5000

# 缓存配置
export CACHE_ENABLED=true
export CACHE_MAX_ENTRIES=10000
export TOOL_CALL_CACHE_TTL=60
export LLM_RESPONSE_CACHE_TTL=300

# 告警配置
export ALERT_ENABLED=true
export ALERT_WEBHOOK_URL=https://your-webhook.com/alert
```

### 1.4 验证安装

```bash
# 健康检查
curl http://localhost:8080/api/ai/health

# 获取工具列表
curl http://localhost:8080/api/ai/dsh/agent/tools

# 测试 Agent 执行
curl -X POST http://localhost:8080/api/ai/dsh/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "你好"}'
```

---

## 2. 核心概念

### 2.1 Agent 会话

Agent 会话是多轮对话的基本单位。每个会话有唯一的 `session_id`，用于维护对话上下文。

```rust
// 第一次请求（自动创建会话）
let response = client.execute(AgentExecuteRequest {
    query: "我叫张三".to_string(),
    session_id: None,  // 自动生成
    ..Default::default()
}).await?;

let session_id = response.session_id;

// 后续请求（使用相同的 session_id）
let response2 = client.execute(AgentExecuteRequest {
    query: "我叫什么名字？".to_string(),
    session_id: Some(session_id),  // 复用会话
    ..Default::default()
}).await?;
```

**最佳实践**:
- 长对话使用相同的 `session_id`
- 不同用户使用不同的 `session_id`
- 会话不再需要时调用清除接口
- 敏感对话结束后立即清除会话

### 2.2 工具调用

Agent 可以调用注册的 MCP 工具来完成任务。工具调用是 Agent 能力的核心扩展点。

**可用工具类别**:
- CRM 工具：客户搜索、订单查询、联系人管理
- ERP 工具：库存查询、采购管理、供应商信息
- MES 工具：生产进度、设备状态、工单管理
- HRM 工具：员工信息、考勤、组织架构
- Finance 工具：财务数据、报表、预算
- 系统工具：健康检查、配置查询

**指定可用工具**:
```json
{
  "query": "搜索客户信息",
  "available_tools": ["crm_search", "crm_get_customer"]
}
```

**最佳实践**:
- 只提供任务需要的工具，减少 Agent 决策复杂度
- 工具有清晰的名称和描述
- 工具参数有完整的 schema 和说明
- 监控工具调用的成功率和耗时

### 2.3 上下文变量

上下文变量是会话级别的键值对，可用于传递用户信息、租户信息等。

```json
{
  "query": "查看我的订单",
  "context_variables": {
    "user_id": "12345",
    "tenant_id": "tenant-abc",
    "role": "admin"
  }
}
```

**最佳实践**:
- 不要在上下文变量中存储敏感信息（密码、token 等）
- 上下文变量大小控制在 1KB 以内
- 使用有意义的键名
- 定期清理不需要的变量

---

## 3. API 使用最佳实践

### 3.1 同步 vs 流式

**同步执行** (`/dsh/agent/execute`):
- 优点：简单，一次请求获取完整响应
- 缺点：等待时间长，用户体验差
- 适用场景：后台任务、批量处理、简单查询

**流式执行** (`/dsh/agent/stream`):
- 优点：实时反馈，用户体验好
- 缺点：实现稍复杂
- 适用场景：聊天界面、复杂查询、需要展示思考过程

**最佳实践**:
- 用户-facing 的功能优先使用流式
- 后台处理使用同步
- 流式请求设置合理的超时时间
- 处理连接中断和重连

### 3.2 错误处理

```rust
match client.execute(request).await {
    Ok(response) => {
        if response.success {
            // 处理成功响应
            println!("Answer: {}", response.answer);
        } else {
            // 处理业务错误
            eprintln!("Agent error: {:?}", response.error);
        }
    }
    Err(e) => {
        // 处理网络/系统错误
        eprintln!("Request failed: {}", e);
        // 实现重试逻辑
    }
}
```

**错误码说明**:
| 错误码 | 说明 | 处理建议 |
|-------|------|---------|
| 0 | 成功 | 正常处理 |
| 400 | 参数错误 | 检查请求参数 |
| 401 | 未授权 | 检查认证信息 |
| 429 | 速率限制 | 降低请求频率，实现退避 |
| 500 | 服务器错误 | 重试或联系管理员 |

**最佳实践**:
- 实现指数退避重试（最多 3 次）
- 区分可重试错误和不可重试错误
- 记录错误日志，包含 trace_id
- 设置合理的超时时间

### 3.3 速率限制

**默认限制**:
- 普通请求：100 请求/分钟
- 流式请求：10 请求/分钟

**最佳实践**:
- 实现客户端限流
- 使用令牌桶或漏桶算法
- 收到 429 时实现退避
- 批量请求合并
- 缓存频繁查询的结果

### 3.4 并发控制

```rust
use std::sync::Semaphore;
use std::sync::Arc;

// 限制并发数为 10
let semaphore = Arc::new(Semaphore::new(10));

let mut handles = vec![];
for query in queries {
    let permit = semaphore.clone().acquire_owned().await.unwrap();
    let client = client.clone();
    handles.push(tokio::spawn(async move {
        let _permit = permit;
        client.execute(query).await
    }));
}
```

**最佳实践**:
- 控制并发请求数（建议 10-20）
- 使用连接池
- 避免并发请求使用相同的 session_id
- 监控并发延迟

---

## 4. 性能优化最佳实践

### 4.1 缓存使用

**工具调用缓存**:
- 相同参数的工具调用会被缓存
- 默认 TTL：60 秒
- 适用于查询类工具（搜索、查询）
- 不适用于写入类工具（创建、更新、删除）

**LLM 响应缓存**:
- 相同提示词的 LLM 响应会被缓存
- 默认 TTL：300 秒
- 适用于确定性查询
- 不适用于需要实时数据的查询

**最佳实践**:
- 对查询类工具启用缓存
- 对写入类工具禁用缓存
- 设置合理的 TTL
- 监控缓存命中率
- 缓存命中率低时分析原因

### 4.2 工具选择优化

**指定可用工具**:
```json
{
  "query": "搜索客户信息",
  "available_tools": ["crm_search"]
}
```

**最佳实践**:
- 只提供任务需要的工具
- 工具数量控制在 5-10 个
- 工具有清晰的名称和描述
- 避免提供功能重叠的工具

### 4.3 迭代次数控制

```json
{
  "query": "复杂查询",
  "max_iterations": 3
}
```

**最佳实践**:
- 简单查询：1-2 次迭代
- 中等查询：3-5 次迭代
- 复杂查询：5-10 次迭代
- 监控平均迭代次数
- 迭代次数过多时优化工具或查询

### 4.4 上下文管理

**最佳实践**:
- 定期清理不需要的会话
- 长对话考虑上下文摘要
- 控制上下文窗口大小
- 监控上下文 token 使用量
- 避免在上下文中存储大量数据

---

## 5. 安全最佳实践

### 5.1 认证授权

**最佳实践**:
- 使用 API Key 进行服务间认证
- 使用 Bearer Token 进行用户认证
- 定期轮换 API Key
- 使用最小权限原则
- 记录所有认证失败的尝试

### 5.2 输入验证

**最佳实践**:
- 验证所有输入参数
- 限制查询长度（建议 < 1000 字符）
- 过滤特殊字符
- 防止提示词注入攻击
- 验证上下文变量的类型和大小

### 5.3 输出过滤

**最佳实践**:
- 过滤敏感信息（身份证号、手机号、邮箱）
- 限制响应长度
- 检测和阻止不当内容
- 记录所有输出用于审计
- 对高风险操作进行人工审核

### 5.4 数据隔离

**最佳实践**:
- 多租户环境严格隔离数据
- 每个租户使用独立的 session_id 命名空间
- 上下文变量中包含 tenant_id
- 工具调用时传递租户信息
- 定期审计数据访问

---

## 6. 监控和运维最佳实践

### 6.1 关键监控指标

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| P95 延迟 | > 5000ms | 响应变慢 |
| 错误率 | > 5% | 系统异常 |
| 工具调用失败率 | > 10% | 工具异常 |
| 缓存命中率 | < 30% | 缓存效果差 |
| 活跃会话数 | > 1000 | 负载过高 |
| 队列等待时间 | > 1000ms | 系统过载 |

### 6.2 日志管理

**最佳实践**:
- 使用结构化日志（JSON 格式）
- 日志级别：生产环境 INFO，调试时 DEBUG
- 每个请求包含唯一 trace_id
- 关键操作记录审计日志
- 日志保留至少 30 天
- 集中化日志收集（ELK / Loki）

### 6.3 告警管理

**最佳实践**:
- 配置多级告警（INFO / WARNING / CRITICAL）
- CRITICAL 告警立即通知（电话/短信）
- WARNING 告警工作时间通知（邮件/飞书）
- INFO 告警记录日志，不通知
- 实现告警冷却，避免告警风暴
- 定期审查和优化告警规则

### 6.4 容量规划

**最佳实践**:
- 监控资源使用率（CPU、内存、磁盘、网络）
- CPU > 70% 时考虑扩容
- 内存 > 80% 时考虑扩容
- 定期进行压力测试
- 预留 30% 的容量冗余
- 建立扩容自动化流程

---

## 7. 常见问题解答

### Q1: Agent 执行时间过长怎么办？

**A**: 
1. 检查是否工具调用耗时过长
2. 减少可用工具数量
3. 降低 max_iterations
4. 启用缓存
5. 检查 LLM Provider 响应时间

### Q2: 如何提高 Agent 回答的准确性？

**A**:
1. 提供清晰的工具描述
2. 使用上下文变量传递关键信息
3. 优化查询表述
4. 启用 LLM Provider（而不是仅用规则匹配）
5. 提供示例（few-shot）

### Q3: 缓存命中率低怎么办？

**A**:
1. 分析查询模式，是否参数变化频繁
2. 增加缓存 TTL
3. 对查询参数进行归一化
4. 考虑使用更粗粒度的缓存键
5. 检查是否有写入操作频繁失效缓存

### Q4: 如何处理工具调用失败？

**A**:
1. 检查工具是否正常运行
2. 查看工具调用错误日志
3. 验证工具参数是否正确
4. 实现降级策略（使用备用工具）
5. 配置告警，及时发现工具异常

### Q5: 多租户环境如何隔离？

**A**:
1. 每个租户使用独立的 session_id 前缀
2. 上下文变量中包含 tenant_id
3. 工具实现中验证租户权限
4. 监控每个租户的使用量
5. 配置租户级别的配额限制

### Q6: 如何扩展自定义工具？

**A**:
1. 实现工具处理函数
2. 定义工具的 input_schema
3. 在应用启动时注册工具
4. 编写工具的单元测试
5. 监控工具的性能和成功率

```rust
// 示例：自定义工具
async fn my_tool_handler(args: Option<Value>) -> Result<ToolResult, ToolExecutionError> {
    // 工具逻辑
    Ok(ToolResult::success(json!({"result": "ok"})))
}

// 注册工具
registry.register(
    "my_tool",
    "我的自定义工具",
    json!({"type": "object", "properties": {}}),
    my_tool_handler,
).await;
```

---

## 8. 参考资源

- [API 文档](./DSH_AI_API.md)
- [架构设计文档](./DSH_AI_ARCHITECTURE.md)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [ReAct 论文](https://arxiv.org/abs/2210.03629)
- [Axum 框架文档](https://docs.rs/axum)
- [Tokio 运行时文档](https://tokio.rs/)

---

## 9. 社区支持

- **问题反馈**: GitHub Issues
- **讨论交流**: GitHub Discussions
- **贡献代码**: 提交 Pull Request
- **文档改进**: 欢迎提交文档改进

---

## 10. 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2024-01-01 | 初始版本，包含 Agent 编排、工具调用、LLM 集成 |
| v1.1 | 2024-02-01 | 添加性能监控、缓存管理、告警管理 |
| v1.2 | 2024-03-01 | 添加流式响应、上下文管理优化 |
