# TOPEMS 架构改进蓝图・MCP 协议适配修正方案

> 文档版本：v1.1
> 创建日期：2026-08-26
> 最近修订：2026-08-27（状态更新为实施中，关联 TODO.md V333-V340 MCP 路线图）
> 基于文档：TOPEMS_Architecture_Improvement_Plan.md v1.2
> 状态：实施中
> 关联主题：微服务治理与 MCP 对接的双轨融合
> 关联路线图：
>
> [TODO.md V333-V340 MCP 路线图](./roadmap/TODO.md)



***

## 目录



1. [修正背景与目标](#1-修正背景与目标)

2. [修正范围与核心原则](#2-修正范围与核心原则)

3. [修正 1：MCP 协议适配层架构设计](#3-修正-1mcp-协议适配层架构设计)

4. [修正 2：Phase 1 双轨并行实施节奏](#4-修正-2phase-1-双轨并行实施节奏)

5. [修正 3：MCP 工具与资源标准化规范](#5-修正-3mcp-工具与资源标准化规范)

6. [修正 4：MCP 验收标准与安全防护](#6-修正-4mcp-验收标准与安全防护)

7. [修正总览：影响矩阵](#7-修正总览影响矩阵)

8. [实施路线图](#8-实施路线图)



***

## 1. 修正背景与目标

### 1.1 修正动因

TOPEMS 架构改进蓝图（v1.1）在微服务治理方向、模块化单体方案、DSH 三层 AI 架构等核心设计上**完全正确**，但经过深度评估，存在以下结构性缺失：



| 缺失项             | 影响                                                | 严重度  |
| --------------- | ------------------------------------------------- | ---- |
| 无 MCP 协议对接规划    | DSH 工具无法直接被外部 AI Agent（Cursor、Claude Desktop 等）调用 | 🔴 高 |
| 业务工具未按 MCP 标准定义 | Tool Schema 不兼容，外部 Agent 无法自动发现和调用                | 🔴 高 |
| 治理与 AI 串行推进     | 边界治理完成前无法对接 MCP，延迟 AI 业务价值交付                      | 🟡 中 |
| 缺少 MCP 安全专项设计   | AI 调用业务工具时存在越权、数据泄露风险                             | 🟡 中 |

### 1.2 修正目标

在**不推翻原方案核心逻辑**的前提下，补充 MCP 协议对接所需的架构设计、实施节奏、标准化规范和验收标准，实现：



```
┌─────────────────────────────────────────────────────────────────────────────┐
│  修正目标                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 架构兼容：原方案的 DSH 三层架构 + 新增 MCP Adapter 层                   │
│     → DSH 工具可同时供内部 Copilot 和外部 MCP Agent 调用                   │
│                                                                             │
│  2. 节奏并行：边界治理与 MCP MVP 对接双轨同步推进                           │
│     → 3 个月内完成 MCP MVP，验证 AI 业务价值                               │
│                                                                             │
│  3. 标准统一：所有业务工具同时实现 DSH 接口和 MCP 标准接口                  │
│     → 一套实现，两种协议，零额外维护成本                                   │
│                                                                             │
│  4. 安全可控：MCP 调用严格继承微服务权限，增加专项安全防护                   │
│     → AI 无法越权访问，输出自动脱敏                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 修正原则



1. **增量修正，不做减法**：原方案的每个章节都保留，仅在指定位置补充 MCP 相关内容

2. **双轨融合，不搞独立**：MCP 对接不设独立 Phase，而是嵌入治理节奏中同步推进

3. **标准先行，实现跟上**：先定义 MCP 兼容的 Tool/Resource 规范，再实现业务工具

4. **安全内建，不做外挂**：MCP 安全防护与 DSH Governance 模块深度融合



***

## 2. 修正范围与核心原则

### 2.1 修正影响的章节



| 原方案章节         | 修正类型 | 修正内容                          |
| ------------- | ---- | ----------------------------- |
| §3 核心改进方向     | 补充   | 增加 MCP 对接与边界治理的关联说明           |
| §5.1 DSH 核心架构 | 扩展   | 新增 MCP Adapter 层为 Layer 0     |
| §5.3 实施步骤     | 重构   | Phase 1 改为双轨并行，增加 MCP MVP 对接轨 |
| §6.2 模块化单体方案  | 补充   | 说明模块化单体对 MCP 性能的优化作用          |
| §7.1 分阶段实施方案  | 重构   | Phase 1/2 节奏调整为治理 + MCP 并行    |
| §7.2 验收标准     | 新增   | 增加 MCP 专项验收标准                 |
| §8.2 技术栈总览    | 补充   | 增加 MCP 协议技术栈                  |

### 2.2 不影响的章节



* §1 执行摘要：核心问题识别、改进目标不变

* §2 系统现状分析：问题诊断准确，无需修改

* §4 模块边界重构方案：ERP/Finance 边界划分正确

* §5.2 部署模式选择：集成 / 独立部署模式不变

* §7.3 风险应对：原有风险应对措施有效



***

## 3. 修正 1：MCP 协议适配层架构设计

### 3.1 在 DSH 架构中新增 Layer 0

**修改位置**：原方案 §5.1「DSH 核心架构」第 432-459 行

**修改后完整架构**：



```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Layer 0: MCP 协议适配层（新增）                                            │
│                                                                             │
│  核心职责：将 DSH 内部能力转换为 MCP 标准协议，实现外部 AI Agent 对接       │
│                                                                             │
│  ├── MCP Server 引擎                                                       │
│  │   ├── 传输层（支持 stdio / SSE / HTTP 三种传输方式）                     │
│  │   ├── JSON-RPC 2.0 协议解析                                             │
│  │   ├── Session 管理（会话隔离、上下文保持）                               │
│  │   └── 健康检查与心跳机制                                                │
│  │                                                                         │
│  ├── Tool Schema 适配器                                                    │
│  │   ├── 将 DSH Tool 转换为 MCP Tool 规范（name/description/inputSchema）  │
│  │   ├── 自动生成 JSON Schema（从 Rust 类型派生）                          │
│  │   ├── 工具分组与标签管理（按业务域分类）                                │
│  │   └── 工具版本化（工具升级时保留旧版本兼容）                            │
│  │                                                                         │
│  ├── Resource URI 管理器                                                   │
│  │   ├── MCP Resource 注册（uri/name/description）                         │
│  │   ├── 资源订阅与推送（业务事件 → MCP Resource 更新通知）                │
│  │   ├── 资源层级管理（父资源/子资源关系）                                 │
│  │   └── 资源权限控制（哪些角色可访问哪些资源）                            │
│  │                                                                         │
│  ├── 权限映射适配器                                                        │
│  │   ├── 将 TOPEMS RBAC 权限映射为 MCP 权限模型                            │
│  │   ├── 租户隔离校验（MCP 调用时校验租户归属）                            │
│  │   ├── 操作类型校验（读/写/管理权限）                                    │
│  │   └── 权限缓存（减少重复校验开销）                                      │
│  │                                                                         │
│  └── MCP 安全防护                                                          │
│      ├── 输入校验（JSON Schema 合规性检查）                                │
│      ├── 输出脱敏（敏感字段自动屏蔽）                                      │
│      ├── 调用审计（全链路日志记录）                                        │
│      ├── 速率限制（按用户/租户/IP 维度限流）                               │
│      └── 异常熔断（连续失败时自动暂停 MCP 调用）                           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: 运行时基座（保留原设计）                                          │
│  ├── LLM Provider 抽象（DeepSeek API / Dify / Ollama / Mock）             │
│  ├── Prompt 模板引擎 + 版本控制                                            │
│  ├── Token/Cost/Latency 计量与限流                                         │
│  └── 流式响应（SSE）+ 超时/重试/熔断                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: 智能中枢（保留原设计）                                            │
│  ├── Agent Orchestrator（ReAct / Plan-Execute / Multi-Agent）              │
│  ├── Tool Registry（业务域工具）                                           │
│  ├── Workflow Engine（DSH-native）                                         │
│  ├── RAG Pipeline 增强（Hybrid Search + Rerank）                           │
│  └── Event → AI 触发器                                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: 业务赋能（保留原设计）                                            │
│  ├── 各业务模块 Copilot                                                    │
│  ├── 智能表单 / 文档智能 / 预测分析                                        │
│  └── 知识管理                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 模块结构扩展

**修改位置**：原方案 §5.1「模块结构」第 462-537 行

**新增 MCP 模块**：



```
svc/ai/
├── src/
│   ├── dsh/
│   │   ├── mod.rs                          # 保留
│   │   │
│   │   ├── mcp/                            # 【新增】MCP 协议适配层
│   │   │   ├── mod.rs                      # MCP 模块入口
│   │   │   ├── server.rs                   # MCP Server 核心（JSON-RPC 引擎）
│   │   │   ├── transport.rs                # 传输层（stdio/SSE/HTTP）
│   │   │   ├── tool_adapter.rs             # DSH Tool → MCP Tool 转换
│   │   │   ├── resource_manager.rs         # MCP Resource 注册与订阅
│   │   │   ├── permission_adapter.rs       # 权限模型映射
│   │   │   ├── security.rs                 # MCP 安全防护
│   │   │   └── session.rs                  # MCP Session 管理
│   │   │
│   │   ├── provider/                       # 保留
│   │   ├── agent/                          # 保留（增加 MCP Agent 编排子模块）
│   │   │   ├── ...
│   │   │   └── mcp_orchestrator.rs         # 【新增】MCP Agent 编排适配
│   │   │
│   │   ├── tools/                          # 保留（增加 MCP 标准化实现）
│   │   │   ├── mod.rs
│   │   │   ├── registry.rs
│   │   │   ├── erp_tools.rs                # 需实现 McpTool trait
│   │   │   ├── finance_tools.rs            # 需实现 McpTool trait
│   │   │   ├── crm_tools.rs                # 需实现 McpTool trait
│   │   │   ├── wms_tools.rs                # 需实现 McpTool trait
│   │   │   └── system_tools.rs             # 需实现 McpTool trait
│   │   │
│   │   ├── governance/                     # 保留（增加 MCP 安全子模块）
│   │   │   ├── mod.rs
│   │   │   ├── meter.rs
│   │   │   ├── audit.rs                    # 扩展：MCP 调用审计
│   │   │   ├── quality.rs
│   │   │   ├── guard.rs                    # 扩展：MCP 安全护栏
│   │   │   └── mcp_security.rs             # 【新增】MCP 安全专项
│   │   │
│   │   └── context/                        # 保留
│   │
│   ├── services/                           # 保留
│   ├── modules/                            # 保留
│   └── main.rs                             # 扩展：MCP Server 启动入口
│
├── lib/
│   ├── shared-dsh/
│   │   └── src/
│   │       ├── types.rs                    # 保留
│   │       ├── tool.rs                     # 扩展：增加 McpTool trait
│   │       ├── prompt.rs                   # 保留
│   │       ├── mcp.rs                      # 【新增】MCP 共享类型
│   │       ├── mcp_tool.rs                 # 【新增】MCP 工具通用实现
│   │       └── mcp_resource.rs             # 【新增】MCP 资源通用实现
│   │
│   └── shared-mcp/                         # 【新增】独立 MCP 共享库
│       └── src/
│           ├── lib.rs
│           ├── protocol.rs                 # MCP 协议常量与类型
│           ├── jsonrpc.rs                  # JSON-RPC 2.0 实现
│           ├── schema.rs                   # JSON Schema 生成工具
│           └── transport.rs               # 传输层抽象
│
└── Cargo.toml                              # 扩展：增加 shared-mcp 依赖

apps/web/
└── src/
    ├── ai/
    │   ├── dsh/                            # 保留
    │   └── mcp/                            # 【新增】前端 MCP 客户端
    │       ├── mod.ts
    │       ├── client.ts                   # MCP 协议客户端
    │       ├── types.ts                    # MCP 类型定义
    │       ├── hooks.ts                    # React Hooks
    │       └── components/
    │           ├── McpToolExplorer.tsx     # MCP 工具浏览器
    │           ├── McpSessionPanel.tsx     # MCP 会话面板
    │           └── McpSecurityMonitor.tsx  # MCP 安全监控
    │
    └── modules/                            # 保留
```

### 3.3 MCP Server 启动入口

在 `svc/ai/src/main.rs` 中增加 MCP Server 启动逻辑：



```
// main.rs 扩展
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 保留原 DSH 初始化逻辑
    let dsh_state = DshBootstrap::init().await?;

    // 【新增】MCP Server 启动
    let mcp_config = McpServerConfig::from_env();
    let mcp_server = McpServer::new(mcp_config, dsh_state.clone());

    // 支持三种传输方式
    match mcp_config.transport {
        Transport::Stdio => {
            mcp_server.serve_stdio().await?;
        }
        Transport::Sse { port } => {
            mcp_server.serve_sse(port).await?;
        }
        Transport::Http { port } => {
            mcp_server.serve_http(port).await?;
        }
    }

    Ok(())
}
```

### 3.4 与原 DSH 架构的关系



```
┌─────────────────────────────────────────────────────────────────────────────┐
│  关系说明                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MCP Adapter 层是 DSH 架构的【协议网关】，不是【替代者】                    │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  外部 AI Agent   │    │  MCP Adapter 层  │    │  DSH 核心架构    │        │
│  │  (Cursor 等)    │    │  (新增)         │    │  (保留)         │        │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│           │                      │                      │                  │
│           │  JSON-RPC 2.0        │  内部调用            │ 业务逻辑        │
│           │  (MCP 标准协议)      │  (trait method)      │ (Agent/Tool/   │
│           │                      │                      │  Workflow/RAG) │
│           │                      │                      │                  │
│           └──────────────────────┴──────────────────────┘                  │
│                                                                             │
│  核心价值：                                                                 │
│  ├── 内部调用：TOPEMS Copilot → 直接调 DSH，性能最优（进程内）             │
│  ├── 外部调用：Cursor/Claude → MCP 协议 → DSH，标准对接                   │
│  ├── 两套调用路径，共享同一套业务逻辑，零冗余                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```



***

## 4. 修正 2：Phase 1 双轨并行实施节奏

### 4.1 调整原因

原方案 Phase 1 为纯治理（0-3 月），Phase 2 为纯 AI 统一（3-6 月），**串行执行导致 MCP 对接延迟 3 个月**。

调整为双轨并行后：



* 边界治理完成一个模块，立即对接该模块的 MCP Tools

* MCP MVP 在 Phase 1 末即可上线，验证 AI 业务价值

* 治理成果通过 MCP 调用得到**实时验证**，避免治理与需求脱节

### 4.2 调整后的 Phase 1 详细规划

**修改位置**：原方案 §7.1「Phase 1（0-3 个月）」

#### Phase 1（0-3 月）：边界治理 + MCP MVP 双轨并行



```
┌─────────────────────────────────────────────────────────────────────────────┐
│  轨 A：边界治理（与原方案一致，按模块逐步推进）                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  M1（第 1 个月）                                                           │
│  ├── A0-1: MES 自表直查修复（grep plugin_mobile = 0）                      │
│  ├── A0-2: QMS 自表直查修复（grep plugin_mobile = 0）                      │
│  ├── B1: Finance 类型迁移（新建 finance/types.ts，7 页面切换）            │
│  └── C2: Unified-Core 31 个 stub 文件删除                                  │
│                                                                             │
│  M1.5（第 1.5 个月）                                                       │
│  ├── ERP/Finance/CRM API 签名对齐（B2 阶段）                              │
│  ├── 前端 Pages ↔ API 映射清理（消除 ERP/Finance 双引用）                 │
│  └── 跨 Schema 查询全局 grep 验证（目标：0 条）                           │
│                                                                             │
│  M2（第 2 个月）                                                           │
│  ├── 事件总线升级（Redis Pub/Sub → Redis Stream）                          │
│  ├── 增加 ACK 机制 + 死信队列（DLQ）                                      │
│  └── 事件类型版本化管理                                                   │
│                                                                             │
│  M2.5（第 2.5 个月）                                                       │
│  ├── 模块化单体骨架搭建（28 svc → 7 核心模块）                             │
│  ├── Cargo Feature Flags 实现                                              │
│  └── only_own_schema_query! 编译时检查宏实现                              │
│                                                                             │
│  M3（第 3 个月）                                                           │
│  ├── 边界治理收尾：所有遗留问题清零                                        │
│  ├── 模块化单体全量编译测试                                                │
│  └── 编译时边界检查覆盖率 100%                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  轨 B：MCP MVP 对接（与轨 A 同步推进，MCP 工具按治理完成情况逐步注册）      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  M1（第 1 个月）                                                           │
│  ├── MCP 骨架搭建                                                          │
│  │   ├── shared-mcp 库创建（protocol.rs/jsonrpc.rs/transport.rs）          │
│  │   ├── McpServer 核心实现（server.rs）                                   │
│  │   ├── 传输层实现（stdio + SSE 两种）                                    │
│  │   └── 工具适配器骨架（tool_adapter.rs）                                 │
│  │                                                                         │
│  ├── 安全防护骨架                                                          │
│  │   ├── 权限映射适配器（permission_adapter.rs）                            │
│  │   ├── 审计日志框架                                                      │
│  │   └── 速率限制中间件                                                    │
│  │                                                                         │
│  └── 验证：MCP Server 可启动，支持 SSE 连接                                │
│                                                                             │
│  M1.5（第 1.5 个月）                                                       │
│  ├── CRM 边界治理完成 → 同步注册 CRM MCP Tools（3 个）                     │
│  │   ├── crm.list_customers（客户列表查询）                                │
│  │   ├── crm.get_customer_profile（客户详情查询）                          │
│  │   └── crm.create_opportunity（创建商机）                                │
│  │                                                                         │
│  ├── 验证：Cursor/Claude Desktop 可通过 MCP 调用 CRM 工具                  │
│  │   ├── 权限验证：MCP 调用权限 = 用户在 CRM 模块的权限                    │
│  │   ├── 响应时间：P95 < 2s                                                │
│  │   └── 审计覆盖：所有调用有日志                                          │
│  │                                                                         │
│  M2（第 2 个月）                                                           │
│  ├── ERP 边界治理完成 → 同步注册 ERP MCP Tools（4 个）                     │
│  │   ├── erp.list_sales_orders（销售订单列表）                             │
│  │   ├── erp.get_inventory_summary（库存概览查询）                         │
│  │   ├── erp.create_purchase_order（创建采购订单）                         │
│  │   └── erp.get_sales_order_detail（销售订单详情）                        │
│  │                                                                         │
│  ├── Finance 边界治理完成 → 同步注册 Finance MCP Tools（3 个）             │
│  │   ├── finance.create_voucher（创建凭证）                                │
│  │   ├── finance.get_account_balance（账户余额查询）                       │
│  │   └── finance.list_receivables（应收明细列表）                          │
│  │                                                                         │
│  └── 验证：10 个 MCP Tools 全部可用，外部 Agent 可自动发现                  │
│                                                                             │
│  M2.5（第 2.5 个月）                                                       │
│  ├── MCP Resources 实现（对应 3 个核心服务的核心实体）                     │
│  │   ├── crm://customers/{id}（客户资源）                                  │
│  │   ├── erp://sales_orders/{id}（订单资源）                               │
│  │   └── finance://vouchers/{id}（凭证资源）                               │
│  │                                                                         │
│  ├── 资源订阅推送：业务事件 → MCP Resource 更新通知                        │
│  │                                                                         │
│  └── 验证：AI 可订阅资源变更，实时获取最新数据                             │
│                                                                             │
│  M3（第 3 个月）                                                           │
│  ├── MCP MVP 正式上线                                                     │
│  │   ├── 10 个 Tools + 3 个 Resources 全部可用                            │
│  │   ├── 支持 Cursor / Claude Desktop / 自研 Agent 对接                   │
│  │   └── 私有化部署模式下，MCP 调用走进程内通道（延迟 < 1ms）              │
│  │                                                                         │
│  ├── MCP 扩展框架就绪                                                     │
│  │   ├── 新增服务的 MCP 对接标准流程（< 2 周）                            │
│  │   ├── 工具自动注册机制（扫描 McpTool trait 实现）                      │
│  │   └── 权限自动继承机制                                                  │
│  │                                                                         │
│  └── 验收：通过 MCP 调用验证边界治理效果（见 §6 验收标准）                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  轨 C：MCP 安全与治理（与轨 B 同步推进）                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  M1：安全防护骨架                                                          │
│  ├── 输入校验中间件（JSON Schema 合规性检查）                              │
│  ├── 租户隔离校验（MCP 调用时校验租户归属）                               │
│  └── 基础速率限制（每用户 100 次/分钟）                                    │
│                                                                             │
│  M1.5：权限二次校验                                                        │
│  ├── MCP 调用时再次校验用户角色权限                                        │
│  ├── 操作类型校验（读/写/管理）                                            │
│  └── 权限缓存优化（Redis 缓存，TTL 5 分钟）                               │
│                                                                             │
│  M2：审计与脱敏                                                            │
│  ├── MCP 全链路审计日志（调用者/输入/输出/结果）                            │
│  ├── 输出脱敏（手机号/金额/客户信息等敏感字段自动屏蔽）                    │
│  └── 异常告警（MCP 调用异常时通知运维）                                    │
│                                                                             │
│  M3：安全防护收尾                                                          │
│  ├── 速率限制精细化（按用户/租户/IP/工具维度）                             │
│  ├── 熔断机制（连续 5 次失败暂停 1 分钟）                                 │
│  ├── 渗透测试（尝试 MCP 越权调用）                                        │
│  └── 安全验收：越权次数 = 0                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 调整后的 Phase 2 规划（原方案调整）

**修改位置**：原方案 §7.1「Phase 2（3-6 个月）」

#### Phase 2（3-6 月）：MCP 扩展 + AI 能力统一



```
┌─────────────────────────────────────────────────────────────────────────────┐
│  轨 A：MCP 扩展（从 3 个核心服务扩展到 5+ 个服务）                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  M4：WMS + HRM MCP Tools 对接                                              │
│  ├── WMS: list_inventory, create_inbound_order, pick_shipment              │
│  └── HRM: list_employees, get_attendance_summary, apply_leave             │
│                                                                             │
│  M5：MCP Resources 扩展 + 业务事件订阅                                     │
│  ├── 新增 WMS/HRM Resources                                               │
│  ├── 实现 Event → MCP Resource 实时推送                                   │
│  └── 打通 ERP → Finance → WMS 跨服务 MCP 调用链                            │
│                                                                             │
│  M6：MCP 外部 Agent 兼容性验证                                             │
│  ├── Cursor 通过 MCP 调用 TOPEMS 业务工具                                 │
│  ├── Claude Desktop 通过 MCP 访问 TOPEMS 资源                             │
│  └── 自研 AI Agent 集成测试                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  轨 B：DSH 能力完善（与原方案 Phase 2 一致）                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  M4：DSH 基础版部署（Provider 抽象 + Agent 编排）                          │
│  M5：核心业务工具实现（DSH 内部工具）                                      │
│  M6：前端 Copilot 上线 + AI 治理                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 实施节奏甘特图



```
Month:  1    2    3    4    5    6
        ├────┼────┼────┼────┼────┤
轨A 边界治理 [━━━━━━━━━━━━━━━━━━━━━━━━]
轨B MCP MVP  [━━━━┓━━━━┓━━━━]
                     ↑      ↑
                   第1.5月  第2月
                  CRM治理完 ERP/Finance治理完
                  →CRM MCP →ERP/Finance MCP

轨C MCP安全  [━━━━┓━━━━┓━━━━]
                       ↑
                     第2月
                  审计/脱敏完成

轨D DSH能力        [━━━━━━━━━━━━━━]
                     ↑
                   第3月
                  DSH基础版部署
```



***

## 5. 修正 3：MCP 工具与资源标准化规范

### 5.1 MCP Tool 标准定义

#### Rust Trait 规范



```
// lib/shared-dsh/src/mcp_tool.rs

#[async_trait]
pub trait McpTool: Send + Sync + 'static {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn input_schema(&self) -> JsonValue;
    async fn execute(
        &self,
        input: JsonValue,
        user: &AuthenticatedUser,
    ) -> McpToolResult<JsonValue>;
    fn required_roles(&self) -> Vec<&'static str>;
    fn rate_limit(&self) -> RateLimitConfig;
}

pub struct RateLimitConfig {
    pub max_requests: u32,
    pub window_seconds: u64,
}

pub type McpToolResult<T> = Result<T, McpToolError>;

#[derive(Debug, thiserror::Error)]
pub enum McpToolError {
    #[error("Input validation failed: {0}")]
    ValidationError(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
    #[error("Tool execution failed: {0}")]
    ExecutionError(String),
}
```

#### MCP Tool 实现示例



```
// svc/ai/src/dsh/tools/crm_tools.rs

pub struct ListCustomersTool {
    crm_client: TypedServiceClient<CrmApi>,
}

#[async_trait]
impl McpTool for ListCustomersTool {
    fn name(&self) -> &str {
        "crm.list_customers"
    }

    fn description(&self) -> &str {
        "查询客户列表，支持按名称、状态、行业、标签等条件筛选。返回客户ID、名称、联系方式、状态等信息。"
    }

    fn input_schema(&self) -> JsonValue {
        serde_json::json!({
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词，匹配客户名称或编号",
                    "maxLength": 100
                },
                "status": {
                    "type": "string",
                    "enum": ["active", "inactive", "pending"],
                    "description": "客户状态筛选"
                },
                "industry": {
                    "type": "string",
                    "description": "行业分类"
                },
                "page": {
                    "type": "integer",
                    "minimum": 1,
                    "default": 1
                },
                "page_size": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100,
                    "default": 20
                }
            },
            "required": [],
            "additionalProperties": false
        })
    }

    async fn execute(
        &self,
        input: JsonValue,
        user: &AuthenticatedUser,
    ) -> McpToolResult<JsonValue> {
        let keyword = input.get("keyword").and_then(|v| v.as_str());
        let status = input.get("status").and_then(|v| v.as_str());
        let page = input.get("page").and_then(|v| v.as_u64()).unwrap_or(1);
        let page_size = input.get("page_size").and_then(|v| v.as_u64()).unwrap_or(20);

        let customers = self.crm_client
            .list_customers(keyword, status, page, page_size)
            .await
            .map_err(|e| McpToolError::ExecutionError(e.to_string()))?;

        Ok(serde_json::to_value(customers)?)
    }

    fn required_roles(&self) -> Vec<&'static str> {
        vec!["crm:customer:read"]
    }

    fn rate_limit(&self) -> RateLimitConfig {
        RateLimitConfig {
            max_requests: 60,
            window_seconds: 60,
        }
    }
}
```

### 5.2 MCP Resource 标准定义



```
// lib/shared-dsh/src/mcp_resource.rs

#[async_trait]
pub trait McpResource: Send + Sync + 'static {
    fn uri_pattern(&self) -> &str;
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    async fn read(
        &self,
        user: &AuthenticatedUser,
        resource_id: &str,
    ) -> McpResourceResult<JsonValue>;
    fn subscribe_events(&self) -> Vec<EventType>;
    fn required_roles(&self) -> Vec<&'static str>;
}

pub type McpResourceResult<T> = Result<T, McpResourceError>;

#[derive(Debug, thiserror::Error)]
pub enum McpResourceError {
    #[error("Resource not found: {0}")]
    NotFound(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Resource read failed: {0}")]
    ReadError(String),
}
```

#### MCP Resource 实现示例



```
// svc/ai/src/dsh/tools/crm_resources.rs

pub struct CustomerResource {
    crm_client: TypedServiceClient<CrmApi>,
    event_publisher: EventPublisher,
}

#[async_trait]
impl McpResource for CustomerResource {
    fn uri_pattern(&self) -> &str {
        "crm://customers/{id}"
    }

    fn name(&self) -> &str {
        "客户档案"
    }

    fn description(&self) -> &str {
        "客户的完整档案信息，包含基本信息、联系方式、分类标签、关联商机等。"
    }

    async fn read(
        &self,
        user: &AuthenticatedUser,
        resource_id: &str,
    ) -> McpResourceResult<JsonValue> {
        let customer = self.crm_client
            .get_customer(resource_id)
            .await
            .map_err(|e| McpResourceError::ReadError(e.to_string()))?;

        Ok(serde_json::to_value(customer)?)
    }

    fn subscribe_events(&self) -> Vec<EventType> {
        vec![
            EventType::CUSTOMER_CREATED,
            EventType::CUSTOMER_UPDATED,
            EventType::CUSTOMER_DELETED,
        ]
    }

    fn required_roles(&self) -> Vec<&'static str> {
        vec!["crm:customer:read"]
    }
}
```

### 5.3 自动注册机制



```
// svc/ai/src/dsh/mcp/server.rs

impl McpServer {
    pub async fn register_tools(&mut self) {
        let tools: Vec<Box<dyn McpTool>> = vec![
            Box::new(ListCustomersTool::new(self.crm_client.clone())),
            Box::new(GetCustomerProfileTool::new(self.crm_client.clone())),
            Box::new(CreateOpportunityTool::new(self.crm_client.clone())),
            Box::new(ListSalesOrdersTool::new(self.erp_client.clone())),
            Box::new(GetInventorySummaryTool::new(self.erp_client.clone())),
            Box::new(CreatePurchaseOrderTool::new(self.erp_client.clone())),
            Box::new(GetSalesOrderDetailTool::new(self.erp_client.clone())),
            Box::new(CreateVoucherTool::new(self.finance_client.clone())),
            Box::new(GetAccountBalanceTool::new(self.finance_client.clone())),
            Box::new(ListReceivablesTool::new(self.finance_client.clone())),
        ];

        for tool in tools {
            self.tool_registry.register(tool).await;
        }
    }

    pub async fn register_resources(&mut self) {
        let resources: Vec<Box<dyn McpResource>> = vec![
            Box::new(CustomerResource::new(self.crm_client.clone(), self.event_publisher.clone())),
            Box::new(SalesOrderResource::new(self.erp_client.clone(), self.event_publisher.clone())),
            Box::new(VoucherResource::new(self.finance_client.clone(), self.event_publisher.clone())),
        ];

        for resource in resources {
            self.resource_manager.register(resource).await;
        }
    }
}
```

### 5.4 工具发现 API

MCP Server 对外暴露的标准发现接口：



```
GET /mcp/tools
→ 返回所有 MCP Tools 列表（符合 MCP 规范）

GET /mcp/resources
→ 返回所有 MCP Resources 列表

POST /mcp/tools/{name}/execute
→ 执行指定工具（AI Agent 调用入口）

GET /mcp/resources/{uri}
→ 读取指定资源

POST /mcp/resources/{uri}/subscribe
→ 订阅资源变更事件
```

### 5.5 标准化规范验收清单



| 规范项       | 要求                                                 | 验收方法   |
| --------- | -------------------------------------------------- | ------ |
| 工具命名      | `{service}.{action}` 格式（如 `erp.list_sales_orders`） | 代码审查   |
| 输入 Schema | 严格 JSON Schema，禁止 `additionalProperties`           | 自动校验脚本 |
| 描述完整      | AI 可理解的中文描述，包含功能、输入、输出说明                           | AI 测试  |
| 权限声明      | 每个工具声明所需角色权限                                       | 代码审查   |
| 速率限制      | 每个工具配置合理的速率限制                                      | 代码审查   |
| 错误处理      | 使用标准 McpToolError 类型                               | 代码审查   |



***

## 6. 修正 4：MCP 验收标准与安全防护

### 6.1 Phase 1 MCP 专项验收标准



| 验收项              | 量化指标                              | 验证方法                             |
| ---------------- | --------------------------------- | -------------------------------- |
| MCP Tools 数量     | ≥ 10 个（CRM:3 + ERP:4 + Finance:3） | `GET /mcp/tools` 返回列表长度          |
| MCP Resources 数量 | ≥ 3 个（CRM + ERP + Finance 各 1 个）  | `GET /mcp/resources` 返回列表长度      |
| MCP Tools 调用成功率  | > 99%                             | 压力测试：1000 次随机工具调用，统计成功率          |
| MCP 响应时间         | P95 < 2s（SaaS）、P95 < 100ms（私有化单体） | 压测工具测量                           |
| MCP 权限继承率        | 100%                              | 渗透测试：无权限用户无法调用受限工具               |
| MCP 越权次数         | 0                                 | 安全测试：尝试组合工具访问越权数据                |
| MCP 审计覆盖率        | 100%                              | 所有 MCP 工具调用有完整审计日志               |
| MCP 输出脱敏率        | 100%                              | 敏感字段（手机号 / 金额 / 客户信息）自动脱敏        |
| MCP 外部兼容性        | 通过                                | Cursor / Claude Desktop 可正常连接和调用 |
| MCP 扩展周期         | < 2 周                             | 新增服务的 MCP Tools 对接耗时             |

### 6.2 Phase 2 MCP 专项验收标准



| 验收项                 | 量化指标                | 验证方法                         |
| ------------------- | ------------------- | ---------------------------- |
| MCP Tools 覆盖服务数     | ≥ 5 个（新增 WMS + HRM） | `GET /mcp/tools` 中服务分布       |
| MCP Resources 覆盖服务数 | ≥ 5 个               | `GET /mcp/resources` 中服务分布   |
| MCP Tools 总数        | ≥ 20 个              | 工具列表长度                       |
| 事件驱动更新              | 支持                  | 业务事件可触发 MCP Resource 实时推送    |
| MCP 流式响应            | 支持                  | 长列表查询支持流式返回                  |
| 跨服务 MCP 调用链         | 可用                  | ERP → Finance → WMS 跨服务调用链正常 |
| AI Agent 自动化测试      | 通过率 > 95%           | 模拟真实 AI 调用场景的自动化测试           |

### 6.3 MCP 安全防护体系



```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MCP 安全防护体系                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【第 1 层：输入防护】                                                      │
│  ├── JSON Schema 校验：工具输入严格符合 Schema 定义                        │
│  ├── SQL 注入防护：禁止输入中包含 SQL 关键字                               │
│  ├── 指令注入防护：检测输入中的 Prompt Injection 模式                      │
│  ├── 输入长度限制：防止超长输入导致 DoS                                    │
│  └── 特殊字符过滤：清洗危险字符                                           │
│                                                                             │
│  【第 2 层：权限防护】                                                      │
│  ├── MCP 会话级权限绑定：会话创建时绑定用户权限快照                        │
│  ├── 工具级权限校验：每次工具调用时二次校验权限                            │
│  ├── 租户级隔离：严格校验租户归属，禁止跨租户访问                          │
│  ├── 操作级校验：区分读/写/管理权限粒度                                    │
│  └── 权限缓存优化：Redis 缓存权限快照，TTL 5 分钟                         │
│                                                                             │
│  【第 3 层：输出防护】                                                      │
│  ├── 敏感字段脱敏：手机号、金额、客户信息自动脱敏                          │
│  ├── 输出大小限制：单次输出不超过 1MB                                      │
│  ├── 内容过滤：过滤输出中的危险指令                                        │
│  └── 格式校验：输出格式必须符合声明的 Schema                              │
│                                                                             │
│  【第 4 层：行为防护】                                                      │
│  ├── 速率限制：每用户 100 次/分钟，每租户 10000 次/天                     │
│  ├── 异常模式检测：检测高频调用、异常参数模式                              │
│  ├── 熔断机制：连续 5 次失败自动暂停 1 分钟                                │
│  ├── 会话超时：MCP 会话 30 分钟无活动自动关闭                             │
│  └── IP 黑白名单：支持 IP 维度的访问控制                                   │
│                                                                             │
│  【第 5 层：审计与溯源】                                                    │
│  ├── 全链路审计：记录每次 MCP 调用的会话、输入、输出、结果                │
│  ├── 操作人溯源：每个操作关联到具体的用户/租户/AI Agent                   │
│  ├── 异常告警：MCP 异常调用立即通知运维                                    │
│  ├── 合规报告：支持按时间/用户/服务维度的合规审计报告                     │
│  └── 日志留存：MCP 审计日志留存 180 天                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 安全防护实现示例



```
// svc/ai/src/dsh/mcp/security.rs

pub struct McpSecurityMiddleware;

impl McpSecurityMiddleware {
    pub async fn validate_tool_input(
        &self,
        tool: &dyn McpTool,
        input: &JsonValue,
    ) -> Result<(), McpToolError> {
        Self::validate_json_schema(input, &tool.input_schema()).await?;
        Self::check_injection_patterns(input)?;
        Self::check_input_size(input)?;
        Ok(())
    }

    pub async fn check_permission(
        &self,
        user: &AuthenticatedUser,
        tool: &dyn McpTool,
    ) -> Result<(), McpToolError> {
        let user_roles = self.get_user_permissions(user).await?;
        let required_roles = tool.required_roles();

        for required in required_roles {
            if !user_roles.contains(required) {
                return Err(McpToolError::PermissionDenied(
                    format!("缺少权限: {}", required)
                ));
            }
        }

        Ok(())
    }

    pub async fn sanitize_output(
        &self,
        output: JsonValue,
        tool_name: &str,
    ) -> JsonValue {
        let sensitive_fields = self.get_sensitive_fields(tool_name);
        let mut sanitized = output;

        for field in sensitive_fields {
            Self::redact_field(&mut sanitized, field);
        }

        sanitized
    }

    fn check_injection_patterns(&self, input: &JsonValue) -> Result<(), McpToolError> {
        let injection_patterns = [
            "DROP TABLE",
            "DELETE FROM",
            "DROP DATABASE",
            "EXEC(",
            "xp_cmdshell",
            "--",
            ";--",
        ];

        let input_str = serde_json::to_string(input).unwrap_or_default();

        for pattern in &injection_patterns {
            if input_str.contains(pattern) {
                return Err(McpToolError::ValidationError(
                    format!("检测到潜在注入模式: {}", pattern)
                ));
            }
        }

        Ok(())
    }
}
```



***

## 7. 修正总览：影响矩阵

### 7.1 对原方案各章节的影响



| 原方案章节         | 修正类型 | 新增 / 修改内容                            | 影响行数        |
| ------------- | ---- | ------------------------------------ | ----------- |
| §3.1 优先级排序    | 补充   | 增加 MCP 对接与治理的关联说明                    | \~10 行      |
| §3.2 核心原则     | 补充   | 增加「MCP 标准优先」原则                       | \~5 行       |
| §5.1 DSH 核心架构 | 扩展   | 新增 Layer 0 MCP Adapter + 完整架构图       | \~80 行      |
| §5.3 实施步骤     | 重构   | 增加 MCP 工具标准化规范（§5.3.1）               | \~100 行     |
| §6.2 模块化单体    | 补充   | 增加 MCP 性能优化说明                        | \~15 行      |
| §7.1 Phase 1  | 重构   | 改为双轨并行（轨 A 治理 + 轨 B MCP 对接 + 轨 C 安全） | \~120 行     |
| §7.1 Phase 2  | 调整   | 增加 MCP 扩展轨                           | \~40 行      |
| §7.2 验收标准     | 新增   | Phase 1/2 MCP 专项验收标准                 | \~50 行      |
| §7.3 风险应对     | 补充   | 增加 MCP 相关风险                          | \~10 行      |
| §8.2 技术栈总览    | 补充   | 增加 MCP 协议技术栈                         | \~5 行       |
| **合计**        |      |                                      | **\~435 行** |

### 7.2 新增文件清单



| 文件路径                                                    | 说明                     | 阶段      |
| ------------------------------------------------------- | ---------------------- | ------- |
| `lib/shared-mcp/src/lib.rs`                             | MCP 协议核心库              | Phase 1 |
| `lib/shared-mcp/src/protocol.rs`                        | MCP 协议常量与类型            | Phase 1 |
| `lib/shared-mcp/src/jsonrpc.rs`                         | JSON-RPC 2.0 实现        | Phase 1 |
| `lib/shared-mcp/src/transport.rs`                       | 传输层抽象                  | Phase 1 |
| `lib/shared-mcp/src/schema.rs`                          | JSON Schema 生成工具       | Phase 1 |
| `lib/shared-dsh/src/mcp.rs`                             | DSH-MCP 集成类型           | Phase 1 |
| `lib/shared-dsh/src/mcp_tool.rs`                        | McpTool trait 定义       | Phase 1 |
| `lib/shared-dsh/src/mcp_resource.rs`                    | McpResource trait 定义   | Phase 1 |
| `svc/ai/src/dsh/mcp/mod.rs`                             | MCP 适配层入口              | Phase 1 |
| `svc/ai/src/dsh/mcp/server.rs`                          | MCP Server 核心          | Phase 1 |
| `svc/ai/src/dsh/mcp/transport.rs`                       | 传输层实现                  | Phase 1 |
| `svc/ai/src/dsh/mcp/tool_adapter.rs`                    | DSH Tool → MCP Tool 转换 | Phase 1 |
| `svc/ai/src/dsh/mcp/resource_manager.rs`                | Resource 注册管理          | Phase 1 |
| `svc/ai/src/dsh/mcp/permission_adapter.rs`              | 权限模型映射                 | Phase 1 |
| `svc/ai/src/dsh/mcp/security.rs`                        | MCP 安全防护               | Phase 1 |
| `svc/ai/src/dsh/mcp/session.rs`                         | Session 管理             | Phase 1 |
| `svc/ai/src/dsh/agent/mcp_orchestrator.rs`              | MCP Agent 编排适配         | Phase 2 |
| `svc/ai/src/dsh/governance/mcp_security.rs`             | MCP 安全治理               | Phase 1 |
| `apps/web/src/ai/mcp/mod.ts`                            | 前端 MCP 客户端入口           | Phase 2 |
| `apps/web/src/ai/mcp/client.ts`                         | MCP 协议客户端              | Phase 2 |
| `apps/web/src/ai/mcp/types.ts`                          | MCP 类型定义               | Phase 2 |
| `apps/web/src/ai/mcp/hooks.ts`                          | React Hooks            | Phase 2 |
| `apps/web/src/ai/mcp/components/McpToolExplorer.tsx`    | MCP 工具浏览器              | Phase 2 |
| `apps/web/src/ai/mcp/components/McpSessionPanel.tsx`    | MCP 会话面板               | Phase 2 |
| `apps/web/src/ai/mcp/components/McpSecurityMonitor.tsx` | MCP 安全监控               | Phase 2 |

### 7.3 需修改的现有文件清单



| 文件路径                                    | 修改内容                                | 阶段      |
| --------------------------------------- | ----------------------------------- | ------- |
| `Cargo.toml`                            | 增加 shared-mcp 库依赖和 MCP feature flag | Phase 1 |
| `svc/ai/Cargo.toml`                     | 增加 shared-mcp、shared-dsh (mcp) 依赖   | Phase 1 |
| `svc/ai/src/main.rs`                    | 增加 MCP Server 启动逻辑                  | Phase 1 |
| `svc/ai/src/dsh/tools/erp_tools.rs`     | 实现 McpTool trait                    | Phase 1 |
| `svc/ai/src/dsh/tools/finance_tools.rs` | 实现 McpTool trait                    | Phase 1 |
| `svc/ai/src/dsh/tools/crm_tools.rs`     | 实现 McpTool trait                    | Phase 1 |
| `svc/ai/src/dsh/tools/wms_tools.rs`     | 实现 McpTool trait                    | Phase 2 |
| `svc/ai/src/dsh/governance/audit.rs`    | 扩展 MCP 审计日志                         | Phase 1 |
| `svc/ai/src/dsh/governance/guard.rs`    | 扩展 MCP 安全护栏                         | Phase 1 |
| `lib/shared-dsh/src/tool.rs`            | 扩展 McpTool 通用实现                     | Phase 1 |
| `apps/web/src/ai/dsh/client.ts`         | 扩展 MCP 协议支持                         | Phase 2 |



***

## 8. 实施路线图

### 8.1 修正后完整时间线



```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    修正后实施路线图                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1（0-3月）：边界治理 + MCP MVP 双轨并行                              │
│  ├── M1：跨 Schema 清零 + MCP 骨架搭建                                     │
│  ├── M1.5：API 类型迁移 + CRM MCP Tools 注册（3 个）                       │
│  ├── M2：事件总线升级 + ERP/Finance MCP Tools 注册（7 个）                 │
│  ├── M2.5：模块化单体骨架 + MCP Resources 实现                             │
│  └── M3：MCP MVP 上线（10 Tools + 3 Resources）+ 边界治理收尾              │
│                                                                             │
│  Phase 2（3-6月）：MCP 扩展 + DSH 能力统一                                 │
│  ├── M4：WMS/HRM MCP Tools 扩展 + DSH Provider 抽象                       │
│  ├── M5：MCP Resources 扩展 + DSH Agent 编排                              │
│  └── M6：MCP 外部兼容性验证 + 前端 Copilot 上线                            │
│                                                                             │
│  Phase 3（6-12月）：部署优化 + 商业化支撑                                   │
│  ├── M7：部署架构优化（模块化单体部署模板）                                │
│  ├── M8：前端架构优化（放弃 MF 双架构）                                    │
│  └── M9-12：商业化分层 + 行业解决方案                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 里程碑与交付物



| 时间     | 里程碑                                | 核心交付物                       | 验收标准                         |
| ------ | ---------------------------------- | --------------------------- | ---------------------------- |
| M1 末   | 边界治理启动 + MCP 骨架就绪                  | shared-mcp 库 + McpServer 核心 | MCP Server 可启动，支持 SSE        |
| M1.5 末 | CRM 治理完成 + CRM MCP 可用              | 3 个 CRM MCP Tools           | Cursor 可调用 CRM 工具，权限正确       |
| M2 末   | ERP/Finance 治理完成 + 10 MCP Tools 可用 | ERP/Finance MCP Tools 全部    | 10 个工具调用成功率 > 99%            |
| M3 末   | MCP MVP 上线 + 边界治理完成                | MCP MVP + 模块化单体骨架           | 跨 Schema = 0，MCP 工具 P95 < 2s |
| M6 末   | MCP 扩展完成 + DSH 基础版                 | 20+ MCP Tools + DSH Agent   | 外部 Agent 兼容性通过，Copilot 上线    |
| M12 末  | 商业化完成                              | 部署优化 + tier 分层              | 私有化进程数 = 1，SaaS 支持 1000+ 租户  |

### 8.3 风险与应对



| 风险                | 影响等级 | 应对措施                                          |
| ----------------- | ---- | --------------------------------------------- |
| MCP 标准升级导致适配层重写   | 中    | 抽象协议层，MCP 升级时仅需修改协议适配层，不影响业务工具                |
| MCP 调用导致 AI 成本超支  | 中    | LLM 路由策略（简单任务用 Ollama）、租户级 Token 限流、MCP 调用计量  |
| 边界治理与 MCP 对接进度不同步 | 中    | 明确里程碑绑定：治理完成一个模块，立即启动该模块的 MCP 对接              |
| MCP 安全防护影响调用性能    | 低    | 权限缓存（Redis TTL 5 分钟）、脱敏异步化、安全中间件性能测试          |
| 外部 AI Agent 兼容性问题 | 低    | MCP 协议遵循官方规范、兼容测试（Cursor/Claude Desktop / 自研） |

### 8.4 团队分工



| 角色     | Phase 1 核心职责                          | Phase 2 核心职责           |
| ------ | ------------------------------------- | ---------------------- |
| 架构负责人  | shared-mcp 库设计、MCP Adapter 架构、模块化单体设计 | MCP 扩展架构、DSH 架构完善      |
| 后端负责人  | 跨 Schema 清零、API 迁移、MCP Tools 实现       | 业务工具实现、DSH Provider 集成 |
| AI 负责人 | MCP Server 实现、安全防护、MCP 对接             | DSH Agent 编排、RAG 增强    |
| 前端负责人  | —                                     | 前端 MCP 客户端、Copilot 集成  |
| 运维负责人  | MCP 基础设施（端口 / 网络 / 监控）                | AI 基础设施、MCP 部署模板       |
| 产品负责人  | MCP 业务价值验证、用户反馈收集                     | Copilot 用户验证           |



***

## 附录：MCP 协议参考

### A.1 MCP 核心概念对应



| MCP 概念           | TOPEMS 对应实现                 | 说明                               |
| ---------------- | --------------------------- | -------------------------------- |
| **Server**       | `McpServer`（svc/ai）         | MCP 服务端，处理 AI Agent 的请求          |
| **Tools**        | `McpTool`（各业务域工具）           | AI 可调用的业务操作，对应 DSH Tool Registry |
| **Resources**    | `McpResource`（各业务实体）        | AI 可访问的业务数据，对应 TOPEMS 核心实体       |
| **Prompts**      | `PromptTemplate`（DSH 模块）    | AI 可使用的 Prompt 模板                |
| **Sampling**     | `AgentOrchestrator`（DSH 模块） | AI 请求 LLM 生成文本的能力                |
| **Roots**        | TOPEMS 业务模块根目录              | MCP Server 的根资源                  |
| **Capabilities** | `McpServerConfig`           | MCP Server 支持的能力声明               |

### A.2 MCP 传输方式支持



| 传输方式      | 适用场景                         | 配置方式                               |
| --------- | ---------------------------- | ---------------------------------- |
| **stdio** | 本地 AI Agent（如 Cursor Local）  | `MCP_TRANSPORT=stdio`              |
| **SSE**   | 远程 AI Agent（如 Cursor Remote） | `MCP_TRANSPORT=sse MCP_PORT=8081`  |
| **HTTP**  | 自研 AI Agent 集成               | `MCP_TRANSPORT=http MCP_PORT=8081` |

### A.3 MCP 与 DSH 调用路径对比



| 调用方            | 调用路径                                      | 性能          | 权限控制     |
| -------------- | ----------------------------------------- | ----------- | -------- |
| TOPEMS Copilot | Copilot → DSH Agent → Tool                | 最优（进程内）     | 内部权限体系   |
| 外部 AI Agent    | Agent → MCP Protocol → McpTool → DSH Tool | 次优（网络 + 适配） | MCP 权限映射 |
| 自研 AI Agent    | Agent → MCP Protocol → McpTool → DSH Tool | 次优          | MCP 权限映射 |



***

## 修订记录



| 版本   | 日期         | 修订人                   | 修订内容                                                                   |
| ---- | ---------- | --------------------- | ---------------------------------------------------------------------- |
| v1.0 | 2026-08-26 | AI Assistant          | 初始版本，基于 TOPEMS\_Architecture\_Improvement\_Plan.md v1.1 的 MCP 协议适配修正方案 |
| v1.1 | 2026-08-27 | AI Assistant（V472 同步） | 状态从 "待审批" 更新为 "实施中"；关联 TODO.md V333-V340 MCP 路线图；基于文档升级为 v1.2。         |



***

**文档状态**：实施中

**下一步**：MCP MVP 工具实现（CRM/ERP/Finance 3 服务）+ MCP 安全中间件集成测试