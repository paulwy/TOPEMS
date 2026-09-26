# TOPEMS MCP 外部 Agent 对接指南

> 版本：2026-08-30 | 适用范围：Cursor、Claude Desktop 等外部 AI Agent 通过 MCP 协议对接 TOPEMS

## 1. 概述

TOPEMS 通过 **MCP（Model Context Protocol）** 向外部 Agent 开放业务能力。外部 Agent（如 Cursor、Claude Desktop）可通过 MCP stdio 传输连接 `mcp-stdio` 二进制，直接调用 TOPEMS 的业务工具（CRM / ERP / 财务 / HR / QMS / SCM / WMS / APS / PM 等 16 个业务域）。

**核心能力：**
- 68 个业务工具（真实业务 API 调用，服务不可达时自动降级 mock）
- 3 个业务资源（`crm://customers/{id}`、`erp://sales_orders/{id}`、`finance://vouchers/{id}`）
- 权限继承（受限工具要求特定权限，无权限用户被拒绝）
- 输入校验（注入检测）+ 输出脱敏

## 2. MCP 服务入口

`mcp-stdio` 是独立的可执行二进制，通过 stdin/stdout 与客户端进行 NDJSON 格式的 JSON-RPC 通信。

```bash
# 构建
cargo build -p topems-ai --bin mcp-stdio

# 产物路径
target/debug/mcp-stdio
```

**通信协议：**
- 每行一个 JSON-RPC 请求（NDJSON）
- 响应按行输出到 stdout
- 通知（无 id 字段）不需要响应
- EOF 表示客户端关闭连接

## 3. 支持的工具与资源

| 业务域 | 工具示例 | 说明 |
|---|---|---|
| CRM | `crm.list_customers` / `crm.get_customer` / `crm.create_customer` | 客户管理 |
| ERP | `erp.list_orders` / `erp.get_order` / `erp.create_order` / `erp.update_inventory` | 订单/库存 |
| 财务 | `finance.list_transactions` / `finance.get_transaction` / `finance.create_invoice`* | 交易/发票 |
| HR | `hr.list_employees` / `hr.get_employee` / `hr.create_employee` / `hr.update_employee` | 员工管理 |
| QMS | `qms.list_inspections` / `qms.get_inspection` / `qms.create_inspection` / `qms.list_nonconformances` | 质量检验 |
| SCM | `scm.list_suppliers` / `scm.get_supplier` / ... | 供应商/采购 |
| WMS | `wms.list_inventory` / `wms.list_warehouses` / `wms.list_transfers` | 仓储库存 |
| 其他 | APS / PM / MES / EHS / LIMS / BI / 客户服务 / 物联网 / OA | 各业务域 4 工具 |

> *`finance.create_invoice` 为受限工具（要求 `finance:write` 权限），是权限继承机制的示例。

**业务资源：**
- `crm://customers/{id}` — CRM 客户详情
- `erp://sales_orders/{id}` — ERP 销售订单详情
- `finance://vouchers/{id}` — 财务凭证详情

## 4. 对接 Cursor

Cursor 通过 MCP 配置文件接入 `mcp-stdio`。

1. 构建二进制：`cargo build -p topems-ai --bin mcp-stdio`
2. 在 Cursor 的 MCP 配置（`.cursor/mcp.json` 或 Settings → MCP）添加：

```json
{
  "mcpServers": {
    "topems": {
      "command": "/absolute/path/to/target/debug/mcp-stdio",
      "env": {
        "CRM_SERVICE_URL": "http://localhost:8099",
        "ERP_SERVICE_URL": "http://localhost:8099",
        "FINANCE_SERVICE_URL": "http://localhost:8099"
      }
    }
  }
}
```

3. 重启 Cursor，即可在对话中调用 TOPEMS 工具（如"查询客户列表"、"创建发票"）。

## 5. 对接 Claude Desktop

Claude Desktop 通过 `claude_desktop_config.json` 接入。

1. 构建二进制：`cargo build -p topems-ai --bin mcp-stdio`
2. 编辑 Claude Desktop 配置（macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "topems": {
      "command": "/absolute/path/to/target/debug/mcp-stdio"
    }
  }
}
```

3. 重启 Claude Desktop，检查 MCP 服务器状态为已连接，即可调用 TOPEMS 工具。

## 6. 权限继承机制

TOPEMS MCP 权限继承：**无权限用户无法通过 MCP 调用受限工具**。

- 工具可通过 `register_with_permission` 声明所需权限（如 `finance.create_invoice` 要求 `finance:write`）
- 服务器通过 `McpServer::set_user(AuthenticatedUser)` 注入当前认证用户（角色列表）
- 权限判定规则：
  - 无权限要求的工具 → 任何用户均可调用
  - 受限工具 + 匿名（未注入用户）→ **拒绝**（错误码 -32001）
  - 受限工具 + 用户角色不含所需权限 → **拒绝**
  - `admin` / `super_admin` 角色 → 拥有所有权限
  - 角色前缀匹配（如角色 `finance` 拥有 `finance:write` 权限）

**验证测试**（`svc/ai/src/dsh/mcp/server.rs`）：
- `test_permission_denied_without_user` — 匿名调用受限工具被拒
- `test_permission_denied_wrong_role` — 无权限角色被拒
- `test_permission_allowed_with_matching_role` — 匹配角色放行
- `test_permission_allowed_admin` — admin 放行
- `test_unrestricted_tool_not_blocked` — 无权限要求工具不受影响

## 7. 端到端验证

```bash
# 1. 启动数据库（如未运行）
#    PostgreSQL 监听 5432，DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# 2. 启动模块化单体网关（提供真实业务 API）
cd /path/to/TOPEMS && source .env && target/debug/topems-server &
# 健康检查：curl http://localhost:8099/api/server/health

# 3. 端到端集成测试（10 工具 + 3 Resource，真实 API）
env \
  CRM_SERVICE_URL=http://localhost:8099 ERP_SERVICE_URL=http://localhost:8099 \
  FINANCE_SERVICE_URL=http://localhost:8099 QMS_SERVICE_URL=http://localhost:8099 \
  SCM_SERVICE_URL=http://localhost:8099 WMS_SERVICE_URL=http://localhost:8099 \
  HRM_SERVICE_URL=http://localhost:8099 APS_SERVICE_URL=http://localhost:8099 \
  PM_SERVICE_URL=http://localhost:8099 \
  CRM_SAMPLE_CUSTOMER_ID=<dev-tenant-customer-id> \
  ERP_SAMPLE_ORDER_ID=<dev-tenant-order-id> \
  FINANCE_SAMPLE_VOUCHER_ID=<dev-tenant-voucher-id> \
  cargo test -p topems-ai --lib -- --ignored --test-threads=1

# 4. 外部 Agent 协议对接测试（模拟 Cursor/Claude Desktop）
cargo test -p topems-ai --test mcp_stdio_integration
```

**样本 ID 约定**：`CRM_SAMPLE_CUSTOMER_ID` 等必须是 **DEV_TENANT（00000000-0000-0000-0000-000000000001）匹配** 的 id，从 list API 返回中取（不能用 DB 直查的全量 id，否则按 tenant 过滤后 get 会 404）。

## 8. 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CRM_SERVICE_URL` | `http://localhost:8029` | CRM 服务/网关地址 |
| `ERP_SERVICE_URL` | `http://localhost:8010` | ERP 服务/网关地址 |
| `FINANCE_SERVICE_URL` | `http://localhost:8011` | 财务服务/网关地址 |
| `QMS_SERVICE_URL` | `http://localhost:8050` | QMS 服务/网关地址 |
| `HRM_SERVICE_URL` | `http://localhost:8020` | HR 服务/网关地址 |
| `SCM_SERVICE_URL` | `http://localhost:8021` | SCM 服务/网关地址 |
| `WMS_SERVICE_URL` | `http://localhost:8022` | WMS 服务/网关地址 |
| `APS_SERVICE_URL` / `PM_SERVICE_URL` | 各自端口 | APS / PM 服务地址 |
| `RUNTIME_URL` | `http://localhost:8060` | 插件运行时地址 |

> 各服务独立部署时指向对应端口；模块化单体模式下统一指向 `topems-server` 网关（8099）。

## 9. 常见问题

- **工具返回 mock 数据**：对应 `*_SERVICE_URL` 不可达，工具自动降级 mock。启动网关/服务后即返回真实数据。
- **调用受限工具被拒（-32001）**：需先通过 `McpServer::set_user` 注入具备对应权限的角色用户。
- **`resources/read` 返回空**：确认 URI 中的 id 属于当前租户（DEV_TENANT）。
- **构建 mcp-stdio**：`cargo build -p topems-ai --bin mcp-stdio`（无外部依赖，纯 Rust）。
