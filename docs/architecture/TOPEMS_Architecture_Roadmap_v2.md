# TOPEMS 架构路线图 v2.0

> 文档版本：v2.0
> 创建日期：2026-08-28
> 状态：生效中
> 替代文档：
> - `docs/archive/TOPEMS_Architecture_Improvement_Plan.md` v1.2（已归档）
> - `docs/archive/TOPEMS_MCP_Architecture_Amendment_Plan.md` v1.1（已归档）
> 关联文档：`docs/architecture/architecture-diagrams.md`、`docs/architecture/database.md`、`TODO.md`

---

## 1. 现状评估

### 1.1 已验证完成的工作

以下工作经过代码审查和测试验证，确认真正完成：

| 领域 | 工作项 | 验证状态 | 证据 |
|------|--------|---------|------|
| 边界治理 | 跨 Schema 直查清零 | ✅ 已验证 | `svc/finance`、`svc/wms`、`svc/mes`、`svc/qms` 无 `plugin_` 跨库引用 |
| 边界治理 | unified-core 32 个 stub 路由删除 | ✅ 已验证 | `svc/unified-core/src/routes/` 下 stub 文件数 = 0 |
| 边界治理 | Finance 页面 `@/api/erp` 类型反链清零 | ✅ 已验证 | `pages/finance` 内 `from '@/api/erp'` 类型引用 = 0 |
| 边界治理 | 编译时 Schema 边界 CI 门禁 | ✅ 已验证 | `schema-defense` 断言 + 跨 Schema grep CI 门禁覆盖 6 服务 |
| AI 基础设施 | MCP 协议适配层骨架 | ✅ 已验证 | `shared-mcp` crate + `svc/ai/dsh/mcp/` 模块编译通过 |
| AI 基础设施 | MCP 安全防护体系 | ✅ 已验证 | `mcp/security.rs` + `governance/guard.rs` + `governance/mcp_security.rs` 集成到 McpServer |
| AI 基础设施 | MCP 传输层（5 种类型） | ✅ 已验证 | stdio/SSE/HTTP/WebSocket/内存传输，24 个单元测试通过 |
| AI 基础设施 | Tool Schema 适配器 | ✅ 已验证 | 自动生成 JSON Schema + 版本化 + 兼容性校验，23 个测试通过 |
| AI 基础设施 | 权限映射适配器 | ✅ 已验证 | RBAC → MCP 权限映射 + 租户隔离 + 缓存，17 个测试通过 |
| AI 基础设施 | MCP Resource URI 管理器 | ✅ 已验证 | 资源 CRUD + 订阅推送 + 层级管理 + 权限控制，22 个测试通过 |
| AI 核心 | Agent 编排增强（ReAct + 上下文 + 流式） | ✅ 已验证 | `orchestrator.rs` 22.6KB，28 个单元测试通过 |
| AI 核心 | Agent 与 LLM Provider 集成 | ✅ 已验证 | `think_with_llm` + `generate_answer_with_llm`，规则匹配后备 |
| AI 核心 | AI 成本计量 | ✅ 已验证 | token 计量 + 成本估算 + 配额管理，9 个测试通过 |
| AI 核心 | 性能监控模块 | ✅ 已验证 | P50/P95/P99 延迟 + 工具调用指标 + Prometheus 导出，6 个测试通过 |
| AI 增强 | 多 Agent 协作 | ✅ 已验证 | 4 种协作模式 + 5 种角色，13 个测试通过 |
| AI 增强 | 知识图谱集成 | ✅ 已验证 | 实体关系提取 + 图算法 + 消歧，24 个测试通过 |
| AI 增强 | RAG 增强 | ✅ 已验证 | 查询重写 + 混合检索 + 重排序，18 个测试通过 |
| AI 增强 | 缓存机制 | ✅ 已验证 | LRU + TTL + 工具/LLM/会话缓存，11 个测试通过 |
| AI 增强 | 监控告警 | ✅ 已验证 | 4 种规则 + 3 种级别 + Webhook，15 个测试通过 |
| 前端 | DSH Agent 聊天面板 + Hook + 演示页 | ✅ 已验证 | `DshAgentChatPanel.tsx` + `useDshAgent.ts` + `DshAgentPage.tsx` |
| 前端 | 业务 Copilot 基础框架 + 4 模块配置 | ✅ 已验证 | ERP/Finance/CRM/WMS 各 5-6 个工具定义，26 个测试通过 |
| 前端 | 智能表单 + 文档智能组件 | ✅ 已验证 | 30 种字段类型 + 11 种文档类型，27 个测试通过 |
| 前端 | 治理仪表盘组件 + Hook + API | ✅ 已验证 | 5 维度评分 + 风险/合规/成本/性能面板 |
| 测试 | 后端单元测试 | ✅ 已验证 | AI 模块 1074 + shared-mcp 18 = 1092 个全部通过 |
| 测试 | 前端集成测试 | ✅ 已验证 | API 客户端 27 + Hooks 16 = 43 个全部通过 |
| 测试 | 端到端测试（AI 表单生成） | ✅ 已验证 | 14/14 通过（Playwright + Chromium） |
| 测试 | 端到端测试（治理仪表盘） | ✅ 已验证 | 10/10 通过（Mock API 数据） |
| 测试 | 端到端测试（业务 Copilot） | ✅ 已验证 | 12/12 通过（Mock API 数据） |
| 工程化 | 部署脚本 + 配置模板 | ✅ 已验证 | 生产部署脚本 dry-run 通过 + .env.production.example |
| 工程化 | API 文档 + 架构文档 + 使用指南 | ✅ 已验证 | DSH_AI_API.md + DSH_AI_ARCHITECTURE.md + DSH_AI_USAGE_GUIDE.md |

### 1.2 框架就绪但未集成验证的工作

以下工作代码已写、单元测试通过，但**未在完整环境中集成验证**，不能视为真正完成：

| 工作项 | 现状 | 缺失的验证 |
|--------|------|-----------|
| Business Copilot API 路由 | handlers 已写（8 端点），编译通过 | 未与真实 IAM 集成，未验证权限校验 |
| Governance Dashboard API 路由 | handlers 已写（10 端点），编译通过 | 数据来源为内存计算，未对接真实 AI 调用日志 |
| 前端 API 路径集成 | 前端 BASE_PATH 已更新为 `/api/ai/dsh/...` | 前后端联调仅验证了健康检查和模块列表 |
| 性能测试 | 5 个 k6 脚本已写，语法验证通过 | 后端服务在压测中退出，100% 失败率，无有效性能数据 |
| MCP 业务工具（CRM/ERP/Finance） | ToolRegistry 注册了 65 个工具 | 未确认其中有多少是真实业务工具，多少是系统/占位工具 |
| MCP 外部 Agent 对接 | MCP Server 支持 SSE/stdio/HTTP | 未验证 Cursor / Claude Desktop 实际连接和调用 |
| 生产环境部署 | 脚本 + 配置模板就绪 | 未在实际生产服务器执行完整部署 |
| 多浏览器端到端测试 | Firefox/WebKit 已安装 | 仅 Chromium 运行通过，Firefox/WebKit 未运行 |

### 1.3 未启动的核心架构目标

以下是旧方案中定义的核心目标，**至今未启动或无实质进展**：

| 目标 | 旧方案优先级 | 当前状态 | 影响 |
|------|------------|---------|------|
| 事件总线升级（Redis Pub/Sub → Redis Stream） | P0 Phase 1 M2 | ❌ 未启动 | 事件无持久化、无 ACK、无死信队列，数据一致性不可靠 |
| 模块化单体骨架（32 svc → 7 核心模块） | P0 Phase 1 M2.5 | ❌ 未启动 | 运维复杂度仍为 32 个服务，私有化部署成本高 |
| accounting_subjects 表物理迁移 | P0 遗留 | ❌ 待启动 | ERP/Finance 数据边界未彻底清理 |
| Cargo Feature Flags 可粗可细部署 | P0 Phase 1 | ❌ 未启动 | 无法按客户需求裁剪模块，所有部署都是全量 |
| 编译时边界检查覆盖率 100% | P0 Phase 1 M3 | ⚠️ 部分完成 | 仅覆盖 6 个服务，剩余 26 个服务未覆盖 |
| MCP MVP 正式上线（10 Tools + 3 Resources） | P1 Phase 1 M3 | ⚠️ 框架就绪 | 业务工具实现状态不明确，外部 Agent 未验证 |
| DSH Provider 抽象完整实现 | P1 Phase 2 M4 | ⚠️ 基础完成 | DeepSeek/Ollama/Mock 已实现，Dify 迁移未确认 |
| 前端 MF 双架构迁移到路由级懒加载 SPA | P2 Phase 3 M8 | ❌ 未启动 | 前端部署复杂度高，调试困难 |
| 商业化 tier 分层（free/basic/advanced） | P3 Phase 3 M9 | ❌ 未启动 | 无法支撑订阅制商业模式 |

---

## 2. 核心差距与问题诊断

### 2.1 进度虚高问题

**问题**：TODO.md 中 49 个阶段、数百项任务几乎全部标记 `[x]`，但实际大量工作仅停留在"单元测试通过"层面，未经过集成验证。

**根因**：
1. 任务粒度太细，将"创建文件"、"写单元测试"、"编译通过"等中间步骤都标记为完成
2. 缺乏"集成验证"作为任务完成的必要条件
3. 性能测试、端到端测试使用 Mock 数据，不反映真实状态

**对策**：新方案中每个任务必须定义**可验证的完成标准**，区分"代码完成"和"验证完成"。

### 2.2 文档碎片化问题

**问题**：docs 目录下有 architecture/、project/、plans/、roadmap/、archive/ 等多个子目录，方案文档分散，且存在多个版本的"架构方案"。

**当前活跃的架构相关文档**：
- `docs/architecture/overview.md`（2026-08-15）
- `docs/architecture/architecture-diagrams.md`（2026-08-28）
- `docs/architecture/database.md`（2026-08-27）
- `docs/architecture/standards.md`（2026-08-15）
- `docs/plans/architecture-optimization.md`（2026-07-20）
- `docs/plans/shortcomings-analysis.md`（2026-08-20）
- `docs/roadmap/roadmap.md`（2026-08-09）
- `docs/roadmap/TODO.md`（1.3MB，持续更新）

**对策**：
1. 本文档（v2.0）作为**唯一的架构路线图事实来源**
2. 旧方案文档保留在 archive/ 中供历史参考，但不再作为执行依据
3. 其他架构文档作为本文档的子文档/参考文档，不重复定义路线图

### 2.3 核心架构目标被 AI 功能淹没

**问题**：旧方案的核心策略是"先筑牢地基（边界治理）→ 统一 AI 能力 → 优化架构 → 商业化"，但实际执行中，AI 功能（DSH/MCP/Copilot）得到了大量投入，而**架构优化（模块化单体、事件总线升级）和商业化**几乎没有进展。

**根因**：
1. AI 功能更容易展示成果（组件、测试、文档）
2. 架构优化涉及大规模重构，风险高、周期长
3. 缺乏明确的架构优化负责人和时间节点

**对策**：新方案将**架构优化提升为最高优先级**，在 AI 功能进入"打磨期"的同时，集中资源推进模块化单体和事件总线升级。

---

## 3. 新优先级排序

基于现状评估和差距诊断，重新定义优先级：

| 优先级 | 领域 | 核心目标 | 理由 |
|--------|------|---------|------|
| **P0** | 架构优化 | 事件总线升级 + 模块化单体骨架 | 这是旧方案 Phase 1 的核心目标，拖延最久，影响最大 |
| **P1** | 边界收尾 | accounting_subjects 迁移 + 编译时边界检查全覆盖 | 彻底完成边界治理，消除遗留隐患 |
| **P2** | AI 落地验证 | MCP 业务工具真实落地 + 外部 Agent 对接验证 + 性能测试 | 将"框架就绪"转化为"可用功能"，获取真实性能数据 |
| **P3** | AI 功能打磨 | DSH Provider 完整实现 + Copilot 前后端联调 + 治理仪表盘数据对接 | 提升 AI 功能的可用性和用户体验 |
| **P4** | 前端架构 | MF 双架构清理 + 路由级懒加载优化 | 降低前端运维复杂度，提升加载性能 |
| **P5** | 商业化 | tier 分层 + 权限自动关联 + 订阅制支撑 | 支撑商业模式，此优先级依赖前序工作完成 |

---

## 4. 分阶段执行计划

### Phase 1：架构地基加固（第 1-4 周）

**核心目标**：完成事件总线升级和模块化单体骨架，这是拖延最久的 P0 任务。

#### 1.1 事件总线升级（Redis Pub/Sub → Redis Stream）

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| Redis Stream 事件发布器实现 | 所有现有 `EventPublisher` 调用切换到 Stream，Pub/Sub 代码删除 | 3 天 |
| ACK 机制 + 死信队列（DLQ） | 事件处理失败自动进入 DLQ，可手动重试 | 2 天 |
| 事件类型版本化管理 | 事件 Schema 注册中心，支持版本兼容和迁移 | 2 天 |
| 事件总线迁移验证 | 所有现有事件发布/订阅方切换完成，无 Pub/Sub 残留 | 1 天 |

**验收标准**：
- `grep -r "publish\|subscribe" lib/shared-event/src/` 无 Redis Pub/Sub 调用
- 事件处理失败后可在 DLQ 中查到并重试
- 事件总线 ACK 率 = 100%

#### 1.2 模块化单体骨架

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| 模块分组定义 | 将 32 个 svc 划分为 7 个核心模块组（core/erp/finance/crm/wms/advanced/ai） | 2 天 |
| Cargo Workspace 重构 | 根 Cargo.toml 定义 feature flags，支持按模块组编译 | 3 天 |
| 统一入口服务 | 创建 `topems-server` 统一入口，支持模块化单体启动 | 3 天 |
| 进程内调用机制 | 模块间通过 trait 方法调用，消除网络开销（私有化模式） | 2 天 |
| 模块化单体编译验证 | `cargo build --release --features default` 成功，单进程可启动 | 2 天 |

**验收标准**：
- 32 个 svc 全部归入 7 个模块组
- `cargo build --release --features default` 无错误
- 单进程 `topems-server` 可启动并响应健康检查
- 至少 2 个模块间调用通过进程内 trait 完成（非 HTTP）

#### 1.3 accounting_subjects 表物理迁移

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| 迁移方案设计 | 确定数据迁移策略（双写/停机/增量） | 1 天 |
| 表结构创建 | 在 `plugin_finance` schema 创建 accounting_subjects 表 | 1 天 |
| 数据迁移脚本 | 从 ERP 表迁移历史数据到 Finance 表 | 1 天 |
| 代码切换 | 所有 accounting_subjects 相关查询切换到 Finance schema | 2 天 |
| 旧表清理 | ERP 中 accounting_subjects 表标记废弃，确认无引用后删除 | 1 天 |

**验收标准**：
- `grep -r "accounting_subjects" svc/erp/` 无结果
- Finance 模块可独立读写 accounting_subjects
- 数据迁移后记录数一致

### Phase 2：边界治理收尾 + AI 落地验证（第 5-8 周）

#### 2.1 编译时边界检查全覆盖

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| 剩余 26 个服务接入 schema-defense | 所有 32 个 svc 都通过编译时边界检查 | 5 天 |
| CI 门禁强化 | 跨 Schema grep 检查覆盖所有服务，违规即构建失败 | 1 天 |

**验收标准**：所有 32 个 svc 的 SQL/API 注册通过 `only_own_schema_query!` 宏检查。

#### 2.2 MCP 业务工具真实落地

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| MCP 工具清单审计 | 确认当前 65 个注册工具中，真实业务工具 vs 系统/占位工具的数量 | 1 天 |
| CRM 业务工具实现（3 个） | `crm.list_customers`、`crm.get_customer_profile`、`crm.create_opportunity` 通过 TypedServiceClient 调用真实 CRM API | 2 天 |
| ERP 业务工具实现（4 个） | `erp.list_sales_orders`、`erp.get_inventory_summary`、`erp.create_purchase_order`、`erp.get_sales_order_detail` | 2 天 |
| Finance 业务工具实现（3 个） | `finance.create_voucher`、`finance.get_account_balance`、`finance.list_receivables` | 2 天 |
| MCP Resources 实现（3 个） | `crm://customers/{id}`、`erp://sales_orders/{id}`、`finance://vouchers/{id}` | 2 天 |
| 业务工具集成测试 | 10 个工具 + 3 个 Resource 的端到端调用测试通过 | 2 天 |

**验收标准**：
- MCP Tools 中至少 10 个是调用真实业务 API 的工具（非 Mock/占位）
- 每个工具都有对应的集成测试
- 工具调用通过 `TypedServiceClient`，禁止直查 DB

#### 2.3 外部 Agent 对接验证

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| Cursor 对接验证 | Cursor 可通过 MCP 协议连接 TOPEMS，调用至少 3 个业务工具 | 1 天 |
| Claude Desktop 对接验证 | Claude Desktop 可连接并调用工具 | 1 天 |
| 权限继承验证 | 无权限用户无法通过 MCP 调用受限工具 | 1 天 |
| 对接文档 | 编写 MCP 外部 Agent 对接指南 | 1 天 |

**验收标准**：Cursor 和 Claude Desktop 均可成功连接并调用业务工具，权限校验生效。

#### 2.4 性能测试真实运行

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| 后端服务稳定性修复 | 服务在压测中不再退出（排查 OOM/资源竞争） | 3 天 |
| 性能基准建立 | smoke/average/stress 三种场景获得有效性能数据 | 2 天 |
| 性能瓶颈识别与优化 | 识别 P95 > 2s 的端点并优化 | 3 天 |

**验收标准**：
- 50 VUs 压力测试下服务稳定运行 3 分钟不退出
- 核心 API 端点 P95 < 2s
- 有完整的性能基准报告

### Phase 3：AI 功能打磨 + 前端架构优化（第 9-12 周）

#### 3.1 DSH Provider 完整实现

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| Dify Provider 迁移确认 | 现有 DifyService 完整迁移为 DifyProvider | 2 天 |
| Provider 路由策略 | 简单任务用 Ollama，复杂任务用 DeepSeek，成本优化 | 2 天 |
| Provider 故障降级 | 主 Provider 失败时自动切换到备用 Provider | 1 天 |

#### 3.2 Copilot 前后端联调

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| Business Copilot 真实 API 联调 | 前端 Copilot 页面通过真实后端 API 完成对话流程 | 3 天 |
| 智能表单真实数据联调 | 智能表单组件对接真实业务数据和 API | 2 天 |
| 治理仪表盘真实数据对接 | 治理仪表盘数据来源从内存计算改为真实 AI 调用日志 | 3 天 |

#### 3.3 前端架构优化

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| MF 双架构评估 | 评估当前 MF 使用情况，确定迁移范围 | 2 天 |
| 路由级懒加载优化 | 非 MF 页面全部改为路由级懒加载 | 3 天 |
| 首页加载性能优化 | 首页加载时间 < 2s | 2 天 |

### Phase 4：商业化支撑（第 13-16 周）

| 任务 | 完成标准 | 预估工时 |
|------|---------|---------|
| tier 分层定义 | free/basic/advanced 三层功能清单定义 | 2 天 |
| 权限自动关联 | 不同 tier 用户自动关联对应权限集 | 3 天 |
| 订阅制基础 | 订阅状态管理 + 功能开关 | 3 天 |
| 模块化单体按 tier 裁剪 | 通过 feature flags 实现不同 tier 的模块裁剪 | 2 天 |

---

## 5. 验收标准总则

每个任务的完成必须同时满足以下条件：

1. **代码完成**：功能代码编写完成，无编译错误
2. **单元测试通过**：相关单元测试全部通过
3. **集成验证**：在完整环境（非 Mock）中验证功能正常
4. **文档更新**：相关文档（API 文档、架构文档、使用指南）同步更新
5. **CI 通过**：所有 CI 检查（lint、test、build）通过

**禁止**将"创建文件"、"写单元测试"、"编译通过"等中间步骤标记为任务完成。

---

## 6. 文档治理

### 6.1 旧文档处理

| 文档 | 处理方式 | 说明 |
|------|---------|------|
| `docs/archive/TOPEMS_Architecture_Improvement_Plan.md` v1.2 | 保留归档 | 历史参考，不再作为执行依据 |
| `docs/archive/TOPEMS_MCP_Architecture_Amendment_Plan.md` v1.1 | 保留归档 | 历史参考，MCP 相关内容已整合到本文档 |
| `docs/archive/PROJECT_COMPLETION_SUMMARY.md` | 保留归档 | 历史项目总结 |
| `docs/plans/architecture-optimization.md` | 保留 | 2026-07-20 的早期方案，作为历史参考 |
| `docs/plans/shortcomings-analysis.md` | 保留 | 不足分析报告，有参考价值 |
| `docs/roadmap/roadmap.md` | 待评估 | 2026-08-09 的旧路线图，需确认是否仍有价值 |

### 6.2 新文档体系

本文档（v2.0）是**唯一的架构路线图事实来源**。其他架构文档的定位：

| 文档 | 定位 | 与本文档的关系 |
|------|------|--------------|
| `docs/architecture/architecture-diagrams.md` | 架构图 | 本文档的可视化补充 |
| `docs/architecture/database.md` | 数据库设计 | 本文档 §4 数据迁移的技术细节 |
| `docs/architecture/standards.md` | 架构标准 | 本文档 §5 验收标准的技术规范 |
| `docs/architecture/overview.md` | 架构概览 | 本文档的入门介绍 |
| `TODO.md`（项目根目录） | DSH AI 中间层任务清单 | 本文档 §4 Phase 2/3 AI 相关任务的详细分解 |
| `docs/roadmap/TODO.md` | 全局路线图任务 | 本文档所有任务的详细分解和跟踪 |

### 6.3 文档更新规则

1. 本文档每 2 周回顾一次，更新进度和调整优先级
2. 任何架构决策的变更必须先更新本文档，再执行代码变更
3. 旧版本文档归档到 `docs/archive/`，并在本文档 §6.1 中登记

---

## 7. 风险与应对

| 风险 | 影响等级 | 应对措施 |
|------|---------|---------|
| 事件总线迁移导致数据不一致 | 高 | 双写过渡期（Pub/Sub + Stream 并行 1 周），验证一致后再切流 |
| 模块化单体重构引入回归 | 高 | 每个模块组单独迁移，充分测试后再合并；保留微服务部署模式作为 fallback |
| MCP 业务工具对接发现 API 缺失 | 中 | 优先实现已有 API 对应的工具；缺失的 API 列入待开发清单 |
| 性能测试发现严重瓶颈 | 中 | 预留 1 周缓冲期用于性能优化；优先保证核心 API 性能 |
| 团队对架构优化积极性不足 | 中 | 明确架构优化为 P0 优先级，设定明确的里程碑和负责人 |
| 前端 MF 迁移范围超出预期 | 低 | 先做评估，按模块逐步迁移，不追求一次性完成 |

---

## 8. 里程碑

| 里程碑 | 时间 | 核心交付物 | 验收标准 |
|--------|------|-----------|---------|
| M1 | 第 2 周末 | 事件总线升级完成 | Redis Stream 全量切换，DLQ 可用，ACK 率 100% |
| M2 | 第 4 周末 | 模块化单体骨架 + accounting_subjects 迁移 | 单进程可启动，32 svc 归入 7 模块组，accounting_subjects 迁移完成 |
| M3 | 第 6 周末 | MCP 业务工具落地 + 外部 Agent 对接 | 10 个真实业务工具 + 3 个 Resource，Cursor/Claude 对接验证通过 |
| M4 | 第 8 周末 | 边界治理收尾 + 性能基准 | 编译时边界检查全覆盖，性能测试获得有效数据，核心 API P95 < 2s |
| M5 | 第 12 周末 | AI 功能打磨 + 前端架构优化 | Copilot 真实联调完成，首页加载 < 2s |
| M6 | 第 16 周末 | 商业化支撑 | tier 分层 + 权限自动关联 + 订阅制基础 |

---

## 修订记录

| 版本 | 日期 | 修订内容 |
|------|------|---------|
| v2.0 | 2026-08-28 | 初始版本。基于 v1.2 架构改进蓝图 + v1.1 MCP 修正方案的重新评估；整合为单一架构路线图；诚实区分"已验证完成"、"框架就绪"、"未启动"三类状态；将架构优化（事件总线 + 模块化单体）提升为 P0；定义严格的验收标准和文档治理规则。 |
