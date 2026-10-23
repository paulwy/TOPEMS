# TOPEMS MCP 外部 Agent 对接指南

> 版本：V2026.10 ｜ 验证状态：端到端通过（initialize → tools/list → tools/call → resources/list）+ stdio 身份注入（MCP_STDIO_SUBJECT）

## 概述

TOPEMS MCP Server 通过 **stdio 传输**暴露 66 个工具（64 个业务工具 + 2 个系统工具）+ 3 个业务资源，支持 Cursor、Claude Desktop、Claude Code 等兼容 MCP 协议的 AI Agent 直接调用 TOPEMS 业务能力。

**身份与权限（P1-1 匿名保护）**：stdio 通道默认匿名——未注入业务身份时，`system.*` 系统工具可用，**业务工具全部返回 -32001 权限拒绝**（防止未认证枚举业务数据，fail-closed）。需调用业务工具时，通过 `MCP_STDIO_SUBJECT` 环境变量注入业务身份（user_id/tenant_id/roles），工具级权限检查据此生效。



* **Binary**: `target/debug/mcp-stdio`（`cargo build --bin mcp-stdio -p topems-ai`）

* **协议**: JSON-RPC 2.0 over stdio（NDJSON，每行一条消息）

* **工具数**: 64 个业务工具（16 域）+ 2 系统工具

* **资源数**: 3 个（crm://customers/{id} /erp://sales\_orders/{id} /finance://vouchers/{id}）

## 核心业务工具（10 个 TypedServiceClient 真实接入）



| 域       | 工具                            | 说明             |
| ------- | ----------------------------- | -------------- |
| CRM     | `crm.list_customers`          | 客户列表（分页 + 关键词） |
| CRM     | `crm.get_customer_profile`    | 客户详情档案         |
| CRM     | `crm.create_opportunity`      | 创建销售商机         |
| ERP     | `erp.list_sales_orders`       | 销售订单列表         |
| ERP     | `erp.get_inventory_summary`   | 库存汇总           |
| ERP     | `erp.create_purchase_order`   | 创建采购订单         |
| ERP     | `erp.get_sales_order_detail`  | 销售订单详情         |
| Finance | `finance.create_voucher`      | 创建会计凭证（借贷平衡校验） |
| Finance | `finance.get_account_balance` | 科目余额查询         |
| Finance | `finance.list_receivables`    | 应收款列表          |

> 所有工具通过 
>
> `TypedServiceClient`
>
>  调用对应业务服务 API；API 不可达时自动降级为 mock 数据（响应含 
>
> `"source": "mock_fallback"`
>
>  标识），保证 Agent 调用不中断。

## 环境变量



| 变量                    | 默认值                     | 说明                                     |
| --------------------- | ----------------------- | -------------------------------------- |
| `JWT_SECRET`          | （必填，无默认）              | 服务间认证密钥；fail-closed，缺失则 mcp-stdio 拒绝启动 |
| `MCP_STDIO_SUBJECT`   | （可选，缺省匿名）              | 业务身份注入：JSON `{"user_id":"...","tenant_id":"...","roles":[...]}`；缺失/解析失败 → 匿名（业务工具 -32001，fail-closed） |
| `CRM_SERVICE_URL`     | `http://localhost:8029` | CRM 服务地址                               |
| `ERP_SERVICE_URL`     | `http://localhost:8030` | ERP 服务地址                               |
| `FINANCE_SERVICE_URL` | `http://localhost:8011` | Finance 服务地址                           |
| `RUST_LOG`            | `info`                  | 日志级别（日志输出到 stderr，不干扰 stdout JSON-RPC） |

> 未设置时使用 
>
> [localhost](https://localhost)
>
>  默认值；真实服务未启动时工具自动降级 mock。

## Cursor 配置

### 项目级配置（推荐）

在项目根目录创建 `.cursor/mcp.json`：



```
{

&#x20; "mcpServers": {

&#x20;   "topems": {

&#x20;     "command": "/Users/air/TOPEMS/target/debug/mcp-stdio",

&#x20;     "args": \[],

&#x20;     "env": {

&#x20;       "JWT_SECRET": "<your-jwt-secret>",

&#x20;       "MCP_STDIO_SUBJECT": "{\"user_id\":\"mcp-agent\",\"tenant_id\":\"<tenant-id>\",\"roles\":[\"crm\",\"erp\",\"finance\"]}",

&#x20;       "RUST_LOG": "info"

&#x20;     }

&#x20;   }

&#x20; }

}
```

### 用户级配置

编辑 `~/.cursor/mcp.json`，添加同上 `mcpServers.topems` 配置。

**验证**：Cursor 设置 → MCP → 看到 `topems` 服务器状态为 connected；在聊天中 `@` 引用或直接询问 "列出 TOPEMS 客户"。

## Claude Desktop 配置（macOS）

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：



```
{

&#x20; "mcpServers": {

&#x20;   "topems": {

&#x20;     "command": "/Users/air/TOPEMS/target/debug/mcp-stdio",

&#x20;     "args": \[],

&#x20;     "env": {

&#x20;       "JWT_SECRET": "<your-jwt-secret>",

&#x20;       "MCP_STDIO_SUBJECT": "{\"user_id\":\"mcp-agent\",\"tenant_id\":\"<tenant-id>\",\"roles\":[\"crm\",\"erp\",\"finance\"]}",

&#x20;       "RUST_LOG": "info"

&#x20;     }

&#x20;   }

&#x20; }

}
```

**验证**：重启 Claude Desktop → 聊天窗口输入 `/` 或查看工具列表 → 出现 `topems` 工具组（66 个工具）。

## Claude Code 配置

在项目根目录创建 `.mcp.json`（Claude Code 自动发现）：



```
{

&#x20; "mcpServers": {

&#x20;   "topems": {

&#x20;     "command": "/Users/air/TOPEMS/target/debug/mcp-stdio",

&#x20;     "args": \[],

&#x20;     "env": {

&#x20;       "JWT_SECRET": "<your-jwt-secret>",

&#x20;       "MCP_STDIO_SUBJECT": "{\"user_id\":\"mcp-agent\",\"tenant_id\":\"<tenant-id>\",\"roles\":[\"crm\",\"erp\",\"finance\"]}"

&#x20;     }

&#x20;   }

&#x20; }

}
```

或通过 CLI：`JWT_SECRET=<your-jwt-secret> MCP_STDIO_SUBJECT='{"user_id":"mcp-agent","tenant_id":"<tenant-id>","roles":["crm","erp","finance"]}' claude mcp add topems -- /Users/air/TOPEMS/target/debug/mcp-stdio`

## 端到端验证脚本

项目内置验证脚本，模拟 MCP 客户端完成完整握手与工具调用：



```
cd /Users/air/TOPEMS

python3 scripts/mcp\_stdio\_e2e\_test.py
```

预期输出（注：e2e 脚本默认匿名运行，业务工具按匿名保护返回 -32001；如需验证业务工具真实调用，为脚本注入 `MCP_STDIO_SUBJECT`）：



```
\[1] initialize OK: server=topems-mcp v0.1.0

\[2] tools/list OK: 64 tools

\[3] 10 个业务工具全部注册

\[4] tools/call crm.list\_customers OK (source=mock\_fallback)   # 注入 MCP_STDIO_SUBJECT 后

\[5] tools/call erp.get\_inventory\_summary OK (source=mock\_fallback)   # 注入后

\[6] tools/call finance.list\_receivables OK (source=mock\_fallback)   # 注入后

\[7] 匿名保护：未注入 MCP_STDIO_SUBJECT 时业务工具返回 -32001（fail-closed）

\[8] resources/list OK: 3 resources

总体: 全部通过 ✅
```

## 故障排查



| 现象                               | 原因              | 解决                                              |
| -------------------------------- | --------------- | ----------------------------------------------- |
| Cursor/Claude 显示服务器 disconnected | binary 路径错误或未构建 | 确认 `target/debug/mcp-stdio` 存在，重新 `cargo build` |
| 工具返回 `source=mock_fallback`      | 对应业务服务未启动       | 启动 CRM/ERP/Finance 服务或设置正确的 `*_SERVICE_URL`     |
| 工具调用超时                           | 业务服务响应慢         | 检查服务健康状态；mock 降级通常 <100ms 返回                    |
| 日志看不到                            | 日志输出到 stderr    | Cursor/Claude 的 MCP 面板可查看 stderr                |

## 安全说明



* MCP stdio 仅监听本地 stdin/stdout，不暴露网络端口

* 工具调用通过 TypedServiceClient 走 HTTP 调用内部服务，无直查 DB

* **匿名保护（P1-1）**：stdio 未注入 `MCP_STDIO_SUBJECT` 时业务工具一律 -32001（fail-closed），仅 `system.*` 可用；注入身份后工具级权限检查（roles → required_permission）生效，admin/super_admin 拥有全部权限

* 生产环境建议通过 `MCP_TOOL_PERMISSIONS` 环境变量限制敏感工具（如 create\_voucher /create\_purchase\_order）

---

## 外部 MCP 消费（DSH 作为 Client）——Phase 1 POC（2026-10-24）

DSH 除向外部 AI IDE 暴露工具面（上述 server 角色）外，还可作为 **MCP Client** 消费外部
MCP server 的工具，挂入共享 ToolRegistry 后由 AgentOrchestrator / 外部 AI IDE 透明调用。

### 架构

```text
外部 MCP server (stdio)
        │  spawn 子进程 + NDJSON JSON-RPC（initialize / tools/list / tools/call）
        ▼
McpClient (svc/ai/src/dsh/mcp/client.rs)
        │  握手 → 工具探测 → 调用转发（Arc<Mutex<Option<McpClient>>> 串行化单管道）
        ▼
register_external_tools (svc/ai/src/dsh/mcp/external.rs)
        │  工具以 ext.<server>.<tool> 命名挂入共享 ToolRegistry
        ▼
DSH AgentOrchestrator / 外部 AI IDE（统一工具面，零改动）
```

### 配置（白名单，fail-open）

环境变量 `MCP_EXTERNAL_SERVERS`，JSON 数组（缺失/空/解析失败 → 不启用，仅 warn 不阻断启动）：

```json
[
  {
    "name": "toy",
    "command": "python3",
    "args": ["scripts/tools/mcp_mock_external_server.py"],
    "env": [{ "key": "KEY", "value": "VALUE" }]
  }
]
```

* `name`：命名空间前缀，工具挂载名为 `ext.<name>.<tool>`
* `command`/`args`：子进程启动命令（stdio 传输）
* `env`：可选，注入子进程环境

### 测试

* 单元：`dsh::mcp::client`（2）+ `dsh::mcp::external`（3）
* 集成：`cargo test -p topems-ai --test mcp_external_client_integration`（4/4）——真实 spawn
  mock 外部 server（`scripts/tools/mcp_mock_external_server.py`，greet/echo 2 工具），覆盖
  握手/探测/调用、注册挂载透明调用、不可达 server 跳过（fail-open）、空配置 noop

### 安全模型与边界（POC）

* **白名单**：仅显式配置的 server 会被连接，无自动发现
* **命名空间隔离**：`ext.<server>.<tool>` 避免与本地 66 工具命名冲突
* **不可信结果**：外部工具输出默认透传；Phase 2 计划叠加 `source=external` 标记 + 结果消毒
  （复用 sensitive_output 机制）+ 审计日志
* **传输**：Phase 1 仅 stdio（子进程沙箱天然隔离）；HTTP/SSE 传输与第三方开放属 Phase 3（需产品决策）
* **日志透传**：外部 server 的 stderr 透传主进程 stderr，便于排障