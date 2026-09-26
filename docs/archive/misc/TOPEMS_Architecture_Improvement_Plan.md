# TOPEMS 系统架构改进蓝图

> 文档版本：v1.3
> 创建日期：2026-08-24
> 最近修订：2026-09-24（v1.3 进度核查：Phase 1/2 与 MCP 轨代码工作全部闭环）
> 状态：实施中
> 关联文档：DSH 部署指南、微服务优化方案、AI 融合方案、
>
> [MCP 架构修正方案](./TOPEMS_MCP_Architecture_Amendment_Plan.md)



***

## 目录



1. [执行摘要](#1-执行摘要)

2. [系统现状分析](#2-系统现状分析)

* 2.1 架构缺陷总览

* 2.2 模块边界问题

* 2.3 AI 能力现状

1. [核心改进方向](#3-核心改进方向)

2. [模块边界重构方案](#4-模块边界重构方案)

* 4.1 ERP 与 Finance 边界划分

* 4.2 三层商业模型

* 4.3 Master-Data 定位

1. [DSH 融合方案](#5-dsh融合方案)

* 5.1 DSH 核心架构

* 5.2 部署模式选择

* 5.3 实施步骤

1. [微服务架构优化](#6-微服务架构优化)

* 6.1 当前架构痛点

* 6.2 模块化单体方案

* 6.3 部署场景适配

1. [最终改进蓝图](#7-最终改进蓝图)

* 7.1 分阶段实施方案

* 7.2 验收标准

* 7.3 风险应对

1. [附录](#8-附录)

* 8.4 v1.1 差距修正清单

* 8.5 v1.2 进展同步与 MCP 交叉引用

* 8.6 v1.3 进度核查（2026-09-24）



***

## 1. 执行摘要

### 1.1 核心问题

TOPEMS 作为一个多业务域的企业级 ERP 系统，存在 **四大核心架构缺陷**：



| 缺陷        | 严重度   | 影响范围    | 根因                       |
| --------- | ----- | ------- | ------------------------ |
| **边界模糊**  | 🔴 极高 | 所有业务模块  | 跨 Schema 直查、API 重叠、数据不一致 |
| **AI 散件** | 🟠 高  | AI 相关模块 | 无统一 LLM 抽象、无治理、不可复用      |
| **运维灾难**  | 🟠 高  | 部署 / 运维 | 28 个微服务、MF 双架构、监控复杂      |
| **商业化缺失** | 🟡 中  | 产品 / 销售 | tier 不完整、无付费分层、权限混乱      |

### 1.2 改进目标

将 TOPEMS 从 **「边界模糊的传统 ERP 系统」** 升级为 **「AI 原生、边界绝对清晰、分层商业化的企业业务平台」**。

### 1.3 核心策略



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                                                                             │

│  1. 先筑牢地基：消除边界缺陷（跨Schema清零、API标准化、事件总线升级）       │

│  2. 再统一能力：部署DSH（AI中间层），消除散件AI，建立AI治理体系             │

│  3. 再优化架构：模块化单体为核，微服务为翼，适配不同部署场景                 │

│  4. 最后商业化：完善tier分层，支撑免费/基础/增值版订阅                      │

│                                                                             │

│  原则：渐进式重构（Strangler Fig模式），避免大爆炸                          │

│                                                                             │

└─────────────────────────────────────────────────────────────────────────────┘
```



***

## 2. 系统现状分析

### 2.1 架构缺陷总览

通过对 TOPEMS 代码库的全面分析，识别出以下核心架构缺陷：

#### 缺陷 1：跨 Schema 直查（最严重的边界破坏）

TOPEMS 当前存在**直接跨 PostgreSQL Schema 查询 / 写入其他服务业务表**的严重违规：



| 位置                                                    | 违规类型                                                 | 严重度   |
| ----------------------------------------------------- | ---------------------------------------------------- | ----- |
| `svc/finance/src/modules/voucher_template.rs:487-520` | Finance 直查 ERP 表 (`plugin_erp.sales_orders`)         | 🔴 致命 |
| `svc/wms/src/modules/data_sync.rs:149-197`            | WMS 直写 CRM 表 (`INSERT INTO plugin_crm.sales_orders`) | 🔴 致命 |
| 多处                                                    | 绕过 RLS 行级隔离，手动拼接 SQL                                 | 🟠 高  |

**核心危害**：



* 绕过服务 API 层（权限校验、业务规则、审计日志全部失效）

* 破坏数据一致性（双轨并行：事件 + 直查 DB）

* 安全风险（RLS 绕过、敏感数据泄露）

#### 缺陷 2：Unified-Core 上帝路由声明中心

`svc/unified-core/src/routes/mod.rs` 注册了 **30 个 stub 路由模块**，每个 stub 仅返回 `"ok"`：



```
// 当前：30个空壳stub路由

pub mod admin;    pub mod aps;      pub mod asset;     pub mod bi;

pub mod crm;      pub mod ehs;      pub mod erp;       pub mod finance;

pub mod gis;      pub mod hrm;      pub mod im;        pub mod integration;

// ... 共30个，每个只有：

pub fn router(state: \&AppState) -> Router\<AppState> {

&#x20;   Router::new().route("/dashboard", get(|| async { "ok" }))

}
```

**核心问题**：



* 声明与实现分离（权限声明在 unified-core，业务逻辑在 28 个 svc 中）

* 路由名存实亡（每个 stub 只注册了一个 /dashboard 路由）

* 注释揭露真相：*"32 F-only frontend modules · backend perm declaration stubs"*

#### 缺陷 3：前端 Pages ↔ API 域映射混乱



| 前端页面                          | 错误引入             | 问题              |
| ----------------------------- | ---------------- | --------------- |
| `FinanceBudgetPage.tsx`       | `@/api/erp`      | 财务预算页用 ERP API  |
| `FinanceVoucherPage.tsx`      | `@/api/erp` (类型) | 凭证表单用 ERP 类型    |
| `FinanceBudgetDetailPage.tsx` | `@/api/erp`      | 财务预算明细用 ERP API |

**根本原因**：ERP 与 Finance 的业务边界未在 API 层明确，形成 "ERP Finance" vs "Finance" 的双重概念。

#### 缺陷 4：事件总线 vs 直连 DB 双轨并行



| 业务场景            | 应有路径                                       | 实际路径                                        |
| --------------- | ------------------------------------------ | ------------------------------------------- |
| ERP 销售订单→财务凭证   | ERP publish→Finance subscribe→Finance 自建凭证 | Finance 直接查`plugin_erp.sales_orders`        |
| WMS 出库→CRM 销售订单 | WMS publish→CRM subscribe→CRM 处理           | WMS 直接`INSERT INTO plugin_crm.sales_orders` |

**问题**：两种路径同时存在，导致数据一致性模型不可预测。

#### 缺陷 5：前端 Module Federation 双架构共存



```
// 两种部署模式并存

VITEDeploymentMode() === 'module-federation' ? loadRemote() : loadLocal();
```



* **MF 模式**：加载远程模块（需要配置远程入口、版本同步）

* **Static 模式**：加载本地页面（需要保持与远程模块同步）

* **Hybrid 模式**：两者混合（增加调试复杂度）

### 2.2 模块边界问题

#### 7 大边界问题清单



| #  | 问题                        | 类型        | 严重度   | 修复成本 |
| -- | ------------------------- | --------- | ----- | ---- |
| B1 | 跨 Schema SQL 查询           | 数据库边界破坏   | 🔴 极高 | ★★★★ |
| B2 | Unified-Core 上帝路由声明中心     | 服务边界破坏    | 🔴 极高 | ★★★  |
| B3 | Frontend Pages ↔ API 映射混乱 | 前端边界模糊    | 🟠 高  | ★★   |
| B4 | 事件总线 vs 直连 DB 双轨          | 架构边界并行    | 🟠 高  | ★★★★ |
| B5 | MF vs Static 双架构          | 前端边界重复    | 🟡 中  | ★★★  |
| B6 | TMS 依赖 WMS 源码             | Rust 模块耦合 | 🟡 中  | ★★   |
| B7 | SharedStateBridge 全局变量    | 前端边界绕行    | 🟡 中  | ★★   |

#### 边界设计意图 vs 实际执行



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                    边界设计意图（declaration）                              │

├─────────────────────────────────────────────────────────────────────────────┤

│  ① PostgreSQL Schema隔离（每个服务独占自己的schema）                       │

│  ② 事件总线通信（Redis Pub/Sub + 预定义EventType）                        │

│  ③ 类型安全HTTP Client（TypedServiceClient）                              │

│  ④ 前端Micro-Frontend（Module Federation）                              │

│  ⑤ RLS多租户行级隔离                                                      │

└─────────────────────────────────────────────────────────────────────────────┘

&#x20;                                   ↕

┌─────────────────────────────────────────────────────────────────────────────┐

│                    边界执行偏差（reality）                                  │

├─────────────────────────────────────────────────────────────────────────────┤

│  ❌ 直接跨Schema SQL查询（Finance查ERP、WMS写CRM）                        │

│  ❌ Unified-Core膨胀为"上帝路由声明中心"                                  │

│  ❌ 前端Pages ↔ API域映射混乱                                            │

│  ⚠️ 事件总线 vs 直连DB双轨并行                                            │

│  ⚠️ Module Federation vs Static Pages双架构共存                          │

└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 AI 能力现状

#### 已有的 AI 能力层



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                    TOPEMS AI现状（svc/ai）                                │

├─────────────────────────────────────────────────────────────────────────────┤

│                                                                             │

│  ✅ Agent框架（services/agent.rs）                                          │

│     ├─ Tool定义: Search, DocumentQA, Calculator, Weather, DB Query        │

│     ├─ ReAct循环: decide\_tools → execute\_tool → generate\_final\_answer    │

│     └─ WorkflowOrchestrator: customer\_service, data\_analysis等4个工作流   │

│                                                                             │

│  ✅ Dify代理层（services/dify.rs）                                           │

│     ├─ blocking/streaming双模式                                             │

│     └─ chat/info/parameters/conversations/feedback全套接口                │

│                                                                             │

│  ✅ RAG管道（modules/ai\_knowledge/）                                       │

│     ├─ DocumentProcessor → 向量化 → VectorStore → 语义搜索                │

│     └─ 知识库问答（document\_qa）                                            │

│                                                                             │

│  ✅ 业务AI模块                                                              │

│     ├─ 智能报表分析、流程助手、异常预测、知识问答                          │

│                                                                             │

│  ✅ 前端AI组件（apps/web/src/ai/）                                        │

│     ├─ AutonomousAgent + WorkflowEngine + ContextEngine                     │

│     ├─ Copilot + Enhancement + Governance + Ethics                        │

│                                                                             │

│  ❌ 缺失能力                                                               │

│     ├─ 原生LLM Provider抽象层（qa\_service.ask()是占位实现）                │

│     ├─ 统一Prompt管理与版本控制                                            │

│     ├─ AI调用治理（成本/延迟/质量/审计）                                  │

│     ├─ 业务域工具定义（SalesOrderQuery, InvoiceGenerate等）                │

│     ├─ 模型路由（小模型vs大模型，成本优化）                                │

│     └─ 上下文工程（Context Engineering）标准化                             │

│                                                                             │

└─────────────────────────────────────────────────────────────────────────────┘
```

#### 核心问题



1. **散件 AI**：Agent、RAG、Dify、Workflow 各自实现，无统一抽象

2. **无治理**：AI 调用无成本计量、质量评估、安全护栏

3. **不可复用**：业务 AI 能力硬编码，无法快速扩展到其他模块

4. **边界绕过**：AI 工具直接查 DB，绕过服务 API 层



***

## 3. 核心改进方向

### 3.1 优先级排序



| 优先级    | 改进方向     | 解决的核心问题                  | 业务价值                          | 时间周期    |
| ------ | -------- | ------------------------ | ----------------------------- | ------- |
| **P0** | 筑牢业务边界   | 跨 Schema 直查、API 重叠、数据不一致 | 消除 90% 安全隐患，效率提升 30%+         | 0-3 个月  |
| **P1** | 统一 AI 能力 | 散件 AI、无治理、不可复用           | 所有模块获得 AI 辅助，人工成本降低 40%+      | 3-6 个月  |
| **P2** | 优化部署架构   | 28 个微服务运维灾难、MF 双架构       | 私有化运维成本降低 80%，SaaS 弹性伸缩       | 6-9 个月  |
| **P3** | 完善商业化    | tier 不完整、无付费分层           | 支撑免费 / 基础 / 增值版订阅，ARPU 提升 2x+ | 9-12 个月 |

### 3.2 核心原则



1. **边界优先于拆分**：先画清业务边界，再决定拆分粒度

2. **编译时强制边界**：用 Rust 宏 /clippy 禁止跨 Schema 查询、API 重叠

3. **进程内优先**：私有化部署时模块间用进程内调用（trait 方法），消除网络开销

4. **渐进式重构**：Strangler Fig 模式，逐步替换，避免大爆炸



***

## 4. 模块边界重构方案

### 4.1 ERP 与 Finance 边界划分

#### 划分原则：业务发起方 vs 财务核算方



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                     ERP（业务发起域）                                        │

│                     source: 'core', tier: 'basic'                          │

├─────────────────────────────────────────────────────────────────────────────┤

│                                                                             │

│  核心定位：业务单据的"业务侧"——谁发起、谁审批、谁执行                      │

│                                                                             │

│  ✅ 客户管理（CustomerManagement）                                         │

│  ✅ 供应商管理（SupplierManagement）                                        │

│  ✅ 物料/产品主数据（MaterialManagement）                                   │

│  ✅ 仓库/库存管理（InventoryManagement）                                    │

│  ✅ 采购订单（PurchaseOrder）— 业务审批流                                  │

│  ✅ 销售订单（SalesOrder）— 业务审批流                                     │

│  ✅ 订单执行与跟踪                                                          │

│  ✅ 合同管理                                                                │

│  ✅ 项目/工时（ProjectManagement）                                         │

│                                                                             │

│  【ERP不应包含】：凭证、总账、报表、预算、应收应付、银行账户              │

└─────────────────────────────────────────────────────────────────────────────┘

&#x20;                                   ↓ 业务事件

┌─────────────────────────────────────────────────────────────────────────────┐

│                    Finance（财务核算域）                                     │

│                    source: 'core', tier: 'basic'                          │

├─────────────────────────────────────────────────────────────────────────────┤

│                                                                             │

│  核心定位：业务单据的"财务侧"——会计核算、资金管理、合规                    │

│                                                                             │

│  ✅ 凭证管理（Voucher）— 从ERP事件自动生成 + 手工录入                     │

│  ✅ 总账管理（Ledger）                                                    │

│  ✅ 应收管理（Receipts, Receivable）                                        │

│  ✅ 应付管理（Payments, Payable）                                          │

│  ✅ 银行账户管理（BankAccount）                                            │

│  ✅ 会计科目管理（AccountingSubject）                                       │

│  ✅ 财务报表（FinancialReport）                                            │

│  ✅ 预算管理（Budget）                                                    │

│  ✅ 发票管理（Invoice）                                                    │

│  ✅ 税务管理（Tax）                                                        │

│  ✅ 资产管理（Asset）— 折旧、盘点                                          │

│  ✅ 费用管理（Expense）                                                    │

│  ✅ 成本核算（Cost）                                                      │

│  ✅ 合并报表（Consolidation）— 集团版                                     │

│                                                                             │

│  【Finance不应包含】：客户/供应商/物料的主数据CRUD                        │

└─────────────────────────────────────────────────────────────────────────────┘
```

#### 立即清理的重叠项



| 当前归属                       | 建议归属      | 操作                |
| -------------------------- | --------- | ----------------- |
| ERP `voucherManagement`    | → Finance | 迁移路由 + API + 前端页面 |
| ERP `receivablePayable`    | → Finance | 迁移路由 + API + 前端页面 |
| ERP `budgetManagement`     | → Finance | 迁移路由 + API + 前端页面 |
| ERP `bankAccount`          | → Finance | 迁移路由 + API + 前端页面 |
| ERP `accountingManagement` | → Finance | 迁移路由 + API + 前端页面 |
| ERP `financialReport`      | → Finance | 迁移路由 + API + 前端页面 |
| ERP `assetManagement`      | → Finance | 迁移路由 + API + 前端页面 |

#### 核心交互模式



```
ERP: SalesOrder 创建

&#x20;   → publish("SalesOrderCreated", {order\_id, amount, customer\_id})

&#x20;                             ↓

&#x20;                   Finance EventHandler 订阅

&#x20;                             ↓

&#x20;                   Finance 自动生成凭证模板 + 应收记录

&#x20;                             ↓

&#x20;                   Finance: Receipt 收款

&#x20;                   → publish("PaymentReceived", {order\_id, amount})

&#x20;                             ↓

&#x20;                   ERP: SalesOrder 状态更新为"已收款"
```

### 4.2 三层商业模型

#### 产品分层



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                         FREE / TRIAL（免费试用版）                          │

│                         tier: 'free', source: 'core'                      │

├─────────────────────────────────────────────────────────────────────────────┤

│  目标：1-5人小微团队、评估体验                                              │

│                                                                             │

│  ✅ IAM（用户/角色/权限）                                                   │

│  ✅ 基础CRM（客户+联系人）                                                  │

│  ✅ 基础ERP（销售订单+采购订单）                                            │

│  ✅ 基础Finance（凭证+应收应付）                                            │

│  ✅ 审批工作流（基础版）                                                    │

│  ✅ 通知中心                                                                │

│  ✅ 基础报表                                                                │

│  ✅ 基础AI（Ollama本地小模型）                                              │

│  ❌ 限制：API调用量、模块数量、高级功能                                    │

└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐

│                         BASIC / STANDARD（基础版-订阅）                     │

│                         tier: 'basic', source: 'core'                     │

├─────────────────────────────────────────────────────────────────────────────┤

│  目标：5-50人中小企业                                                      │

│                                                                             │

│  【包含FREE的全部功能】                                                    │

│  ✅ 完整ERP（库存+物料+资产+银行+会计科目）                                  │

│  ✅ 完整Finance（总账+报表+预算+发票+税务）                                 │

│  ✅ 完整CRM（线索+商机+合同+售后）                                          │

│  ✅ HRM基础（员工+考勤+薪资）                                               │

│  ✅ WMS基础（入库+出库+盘点）                                               │

│  ✅ SCM基础（供应商+采购协同）                                              │

│  ✅ OA（公告+会议室+办公用品）                                               │

│  ✅ 多租户隔离 + 审计日志                                                   │

│  ✅ 工作流（高级审批+条件分支）                                              │

│  ✅ 高级AI（Ollama+DeepSeek混合）                                           │

└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐

│                       ENTERPRISE / ULTIMATE（增值版-订阅）                  │

│                       tier: 'advanced', source: 'plugin'                   │

├─────────────────────────────────────────────────────────────────────────────┤

│  目标：50+人企业、集团化                                                    │

│                                                                             │

│  【包含BASIC的全部功能】                                                   │

│  ✅ 高级WMS（波次+拣货+条码+自动补货）                                      │

│  ✅ 高级SCM（供应商门户+招投标+评估）                                       │

│  ✅ SRM/PDM/MES/APS/QMS/EHS/PM/TMS                                        │

│  ✅ BI（商业智能+自助分析）                                                  │

│  ✅ AI（智能助手+预测分析+定制Agent）                                       │

│  ✅ 合并报表、多组织、多账簿                                                │

│  ✅ 灾难恢复、数据治理                                                      │

│  ✅ 低代码平台、集成平台                                                    │

└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Master-Data 定位

#### 核心定位：企业 "数据之根"



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                    Master-Data（主数据中心）                               │

│                    tier: 'basic', source: 'core'                          │

├─────────────────────────────────────────────────────────────────────────────┤

│                                                                             │

│  核心定位：企业"数据之根"——所有业务模块共享的主数据、元数据、标准          │

│                                                                             │

│  ✅ 数据字典（Dict）— 全局枚举/分类/编码标准                               │

│  ✅ 数据质量（Quality）— 规则/检查/自动修复                                 │

│  ✅ 数据血缘（Lineage）— 上下游追踪                                        │

│  ✅ 版本管理（Versioning）— 主数据版本/分支/审核                             │

│  ✅ 元数据（Metadata）— Schema/属性/标签/生命周期                           │

│  ✅ Schema Registry — 动态业务实体CRUD                                     │

│                                                                             │

│  各业务模块与Master-Data的关系：                                            │

│                                                                             │

│  ERP ──读──▶ Master-Data（字典/物料分类/客户分类）                        │

│  CRM ──读──▶ Master-Data（行业分类/地区编码/客户等级）                    │

│  Finance ──读──▶ Master-Data（科目编码/币种/凭证模板）                    │

│  WMS ──读──▶ Master-Data（计量单位/仓库类型/批次规则）                    │

│  HRM ──读──▶ Master-Data（部门/职级/岗位/民族/学历）                      │

│                                                                             │

│  关系：Master-Data是"只读提供者"，业务模块是"消费方"                       │

│  写入：通过审批流程（Versioning的branch→merge）                            │

│                                                                             │

│  【应迁出的模块】：                                                        │

│  ❌ Commercial V55 → 独立为svc/billing                                     │

│  ❌ Disaster V56 → 独立为svc/monitor/disaster\_recovery                     │

│  ❌ AI Governance V59 → 合并到svc/ai                                      │

└─────────────────────────────────────────────────────────────────────────────┘
```



***

## 5. DSH 融合方案

### 5.1 DSH 核心架构

#### 三层目标



```
┌─────────────────────────────────────────────────────────────────────────────┐

│                                                                             │

│  Layer 1: 运行时基座（Runtime Foundation）                                   │

│  ├── LLM Provider抽象（DeepSeek API / Dify / Ollama / Mock）               │

│  ├── Prompt模板引擎 + 版本控制                                             │

│  ├── Token/Cost/Latency计量与限流                                          │

│  └── 流式响应（SSE）+ 超时/重试/熔断                                       │

│                                                                             │

│  Layer 2: 智能中枢（Intelligence Hub）                                       │

│  ├── Agent Orchestrator（ReAct / Plan-Execute / Multi-Agent）               │

│  ├── Tool Registry（业务域工具：订单查询, 凭证生成, 库存分析...）           │

│  ├── Workflow Engine（DSH-native，替代当前WorkflowOrchestrator）            │

│  ├── RAG Pipeline增强（Hybrid Search + Rerank）                            │

│  └── Event → AI触发器（业务事件 → AI自动响应）                              │

│                                                                             │

│  Layer 3: 业务赋能（Business Enablement）                                    │

│  ├── 各业务模块Copilot（ERP Copilot, Finance Copilot, CRM Copilot...）      │

│  ├── 智能表单（AI Form Filling / Validation / Suggestion）                  │

│  ├── 文档智能（合同审阅 / 发票识别 / 报告生成）                             │

│  ├── 预测分析（销售预测 / 库存预警 / 风险识别）                              │

│  └── 知识管理（企业知识库 / 专家发现 / 最佳实践推荐）                        │

│                                                                             │

└─────────────────────────────────────────────────────────────────────────────┘
```

#### 模块结构



```
/Users/air/TOPEMS/

├── svc/

│   └── ai/

│       ├── src/

│       │   ├── dsh/                          ← 【新增】DSH核心模块

│       │   │   ├── mod.rs                    # DSH模块入口

│       │   │   ├── provider/                 # LLM Provider抽象

│       │   │   │   ├── mod.rs

│       │   │   │   ├── deepseek.rs           # DeepSeek API实现

│       │   │   │   ├── dify.rs               # Dify适配层

│       │   │   │   ├── ollama.rs             # Ollama实现

│       │   │   │   └── mock.rs               # 测试/Mock实现

│       │   │   ├── agent/                    # Agent编排

│       │   │   │   ├── mod.rs

│       │   │   │   ├── orchestrator.rs       # ReAct/Plan-Execute编排

│       │   │   │   ├── memory.rs             # 短期/长期记忆

│       │   │   │   └── planner.rs            # 任务规划器

│       │   │   ├── tools/                    # 工具注册中心

│       │   │   │   ├── mod.rs

│       │   │   │   ├── registry.rs           # ToolRegistry

│       │   │   │   ├── erp\_tools.rs          # ERP域工具

│       │   │   │   ├── finance\_tools.rs      # Finance域工具

│       │   │   │   ├── crm\_tools.rs          # CRM域工具

│       │   │   │   ├── wms\_tools.rs          # WMS域工具

│       │   │   │   └── system\_tools.rs       # 系统工具

│       │   │   ├── governance/               # AI治理

│       │   │   │   ├── mod.rs

│       │   │   │   ├── meter.rs              # Token/成本计量

│       │   │   │   ├── audit.rs              # AI调用审计

│       │   │   │   ├── quality.rs            # 输出质量评估

│       │   │   │   └── guard.rs              # 安全护栏

│       │   │   └── context/                  # 上下文工程

│       │   │       ├── mod.rs

│       │   │       ├── builder.rs            # 上下文构建器

│       │   │       └── domain.rs             # 业务域上下文注入

│       │   │

│       │   ├── services/                     ← 现有服务层

│       │   ├── modules/                      ← 现有路由层

│       │   └── ...

│       │

│       └── Cargo.toml

│

├── lib/

│   └── shared-dsh/                           ← 【新增】共享DSH类型

│       └── src/

│           ├── lib.rs

│           ├── types.rs                     # 通用DSH类型

│           ├── tool.rs                      # Tool定义trait

│           └── prompt.rs                    # Prompt模板类型

│

└── apps/

&#x20;   └── web/

&#x20;       └── src/

&#x20;           ├── ai/

&#x20;           │   ├── dsh/                     ← 【新增】前端DSH客户端

&#x20;           │   │   ├── index.ts

&#x20;           │   │   ├── client.ts            # DSH API Client

&#x20;           │   │   ├── types.ts             # DSH类型定义

&#x20;           │   │   ├── hooks.ts             # React Hooks

&#x20;           │   │   └── components/

&#x20;           │   │       ├── DshCopilotWidget.tsx

&#x20;           │   │       ├── DshAgentPanel.tsx

&#x20;           │   │       └── DshGovernanceDashboard.tsx

&#x20;           │   └── ...

&#x20;           │

&#x20;           └── modules/

&#x20;               ├── erp/

&#x20;               │   └── components/

&#x20;               │       └── ErpCopilot.tsx    ← 【新增】ERP AI Copilot

&#x20;               ├── finance/

&#x20;               │   └── components/

&#x20;               │       └── FinanceCopilot.tsx ← 【新增】Finance AI Copilot

&#x20;               └── ...
```

### 5.2 部署模式选择

#### 集成部署为核，独立部署为翼



| 部署模式         | 适用场景                | 核心特点                           |
| ------------ | ------------------- | ------------------------------ |
| **集成部署**（推荐） | TOPEMS 现有用户升级、一体化交付 | DSH 嵌入`svc/ai`服务，随 TOPEMS 整体部署 |
| **独立部署**     | 多系统集成、定制化需求         | DSH 拆分为独立 AI 中间层服务             |

#### 分场景落地规则



| TOPEMS 部署形态   | DSH 部署模式                   | 落地方式                 |
| ------------- | -------------------------- | -------------------- |
| **SaaS 公有云版** | ✅ 强制集成部署                   | 随`svc/ai`部署，共享公有云资源池 |
| **私有化标准版**    | ✅ 默认集成部署 / 🎁 可选独立部署（付费增值） | 默认集成；定制客户可选独立        |
| **私有化离线版**    | ✅ 强制集成部署                   | 严格合规，无额外端口暴露         |

#### 集成部署优化措施



1. **资源隔离**：DSH 分配 Tokio 独立线程池，限制 CPU / 内存占用

2. **热升级**：Rust 模块热替换，无需重启服务

3. **配置化定制**：提供 AI 管理后台，客户可配置 Provider / 工具 / Agent

### 5.3 实施步骤

#### Phase 0：基础设施（2 周）



```
Week 1:

├── \[后端] 搭建dsh/provider骨架（ProviderFactory + LlmProvider trait）

├── \[后端] 实现DeepSeekProvider + OllamaProvider

├── \[后端] 迁移DifyService → DifyProvider实现

├── \[后端] 搭建dsh/governance骨架（UsageMeter + AiGuard）

├── \[后端] 创建dsh\_\*数据表 + 迁移脚本

└── \[前端] 搭建dsh/client.ts + types.ts + hooks.ts骨架

Week 2:

├── \[后端] 搭建dsh/prompt骨架（PromptLibrary + 模板引擎）

├── \[后端] 搭建dsh/tools/registry骨架

├── \[后端] 实现5个系统工具（search, calculator, weather, web\_search, db\_query）

├── \[后端] 重构services/agent.rs → 委托给DSH AgentOrchestrator

├── \[前端] 实现DshCopilotWidget基础组件

└── \[测试] Provider抽象单元测试 + 集成测试
```

#### Phase 1：业务工具与 Agent（4 周）



```
Week 3-4: 业务域工具实现

├── \[后端] ERP域15个工具（erp\_tools.rs）

├── \[后端] Finance域12个工具（finance\_tools.rs）

├── \[后端] CRM域10个工具（crm\_tools.rs）

├── \[后端] WMS域10个工具（wms\_tools.rs）

├── \[后端] 工具注册中心实现 + 自动注册机制

└── \[关键] 所有工具通过HTTP Client调用对应服务API，禁止直查DB！

Week 5-6: Agent Orchestrator

├── \[后端] ReAct模式实现

├── \[后端] Plan-Execute模式实现

├── \[后端] 上下文工程实现（ContextBuilder）

├── \[后端] 记忆管理（短期对话历史 + 长期知识记忆）

├── \[后端] 事件 → AI触发器（event\_trigger.rs）

└── \[前端] DshAgentPanel组件（含思考过程展示）
```

#### Phase 2：前端 Copilot 集成（4 周）



```
Week 7-8: 核心Copilot

├── \[前端] ErpCopilot集成到ERP模块

├── \[前端] FinanceCopilot集成到Finance模块

├── \[前端] CrmCopilot集成到CRM模块

├── \[前端] WmsCopilot集成到WMS模块

└── \[前端] 快捷操作按钮 + 流式响应 + 思考过程UI

Week 9-10: 增强能力

├── \[前端] 智能表单（AI Form Filling）

├── \[前端] 文档智能（合同/发票审阅）

├── \[前端] DshGovernanceDashboard（AI成本/质量/审计看板）

├── \[前端] DshPromptEditor（Prompt编辑器 + 版本管理）

└── \[前端] DshWorkflowDesigner（可视化工作流设计器）
```



***

## 6. 微服务架构优化

### 6.1 当前架构痛点

#### 「分布式单体」陷阱

TOPEMS 拆分为 28 个`svc/*`微服务，但边界完全模糊：



* 跨 Schema 直查数据库（Finance 查 ERP 表、WMS 写 CRM 表）

* API 所有权重叠（ERP/Finance 同时定义凭证 / 预算 API）

* 无分布式事务，数据一致性依赖 "双轨并行" 兜底

→ **拆分了但没解耦，反而增加了 3 倍运维成本**

#### 运维复杂度灾难



* 28 个服务的部署、监控、日志、升级

* 服务发现、负载均衡、链路追踪的 overhead 远超业务本身

* 前端 Module Federation 双架构（MF+Static）共存

### 6.2 模块化单体方案

#### 核心设计原则



1. **边界优先于拆分**：先画清业务边界，再决定拆分粒度

2. **部署场景适配**：私有化→模块化单体；SaaS→细粒度微服务

3. **编译时强制边界**：Rust 编译时检查禁止跨 Schema 查询、API 重叠

4. **进程内优先**：私有化部署时模块间用进程内调用（trait 方法），无网络开销

#### 代码结构



```
TOPEMS代码结构（优化后）

├── svc/

│   ├── core/                # 【强制包含】横切服务

│   │   ├── iam/             # 身份认证

│   │   ├── master-data/     # 主数据中心

│   │   ├── workflow/        # 工作流引擎

│   │   ├── notification/   # 通知中心

│   │   ├── file/            # 文件服务

│   │   ├── admin/           # 系统管理

│   │   └── ...

│   ├── erp/                 # 【可选】业务发起域

│   ├── finance/             # 【可选】财务核算域

│   ├── crm/                 # 【可选】客户关系域

│   ├── wms/                 # 【可选】仓储管理域

│   └── advanced/            # 【可选】高级业务域（TMS/MES/AI等）

│

├── lib/

│   ├── shared-core/         # 共享核心类型

│   ├── shared-db/           # 数据库访问层（禁止跨Schema）

│   ├── shared-auth/         # 鉴权层

│   ├── shared-event/        # 事件总线

│   └── shared-service-client/ # 服务客户端

│

└── apps/

&#x20;   └── web/                 # 前端应用（SPA+路由级懒加载）
```

#### Cargo Feature Flags 实现可粗可细



```
\# 根Cargo.toml

\[features]

default = \["core", "erp", "finance", "crm", "wms"]  # 基础版

advanced = \["default", "srm", "advanced"]             # 高级版

offline = \["default", "disable-cloud"]                # 离线版

saas = \["core", "erp", "finance", "split-services"]   # SaaS版
```



```
\# 编译命令

cargo build --release --features default    # 私有化单进程

cargo build --release --features saas       # SaaS多进程

cargo build --release --features offline    # 离线版
```

#### 编译时强制边界检查



```
// lib/shared-db/src/schema.rs

\#\[macro\_export]

macro\_rules! only\_own\_schema\_query {

&#x20;   (\$sql:expr, \$schema:expr) => {

&#x20;       assert!(

&#x20;           \$sql.contains(\&format!("{}.", \$schema)),

&#x20;           "❌ 禁止跨Schema查询！SQL必须使用本模块的Schema '{}'",

&#x20;           \$schema

&#x20;       );

&#x20;   };

}

// 使用示例

let sql = "SELECT \* FROM plugin\_erp.sales\_orders WHERE id = \$1";

topems\_only\_own\_schema\_query!(sql, "plugin\_erp");  // 编译时检查
```

### 6.3 部署场景适配



| 部署场景          | 架构     | 进程数 | 通信机制              | AI 能力              |
| ------------- | ------ | --- | ----------------- | ------------------ |
| **私有化离线版**    | 模块化单体  | 1   | 进程内调用（trait）      | 仅 Ollama 本地        |
| **私有化标准版**    | 模块化单体  | 1   | 进程内调用（trait）      | Ollama+DeepSeek 混合 |
| **SaaS 公有云版** | 细粒度微服务 | 3-5 | gRPC+Redis Stream | 云端 DeepSeek（默认）    |



***

## 7. 最终改进蓝图

### 7.1 分阶段实施方案

#### Phase 1（0-3 个月）：边界清理 + 架构骨架

**核心目标**：消除所有边界缺陷，为后续 AI / 架构优化铺路



| 时间   | 核心动作                                              | 交付物                 | 责任人        |
| ---- | ------------------------------------------------- | ------------------- | ---------- |
| M1   | 跨 Schema 清零：修改所有跨 Schema 查询为事件订阅 + 本地快照           | 代码库无跨 Schema 查询     | 后端负责人      |
| M1.5 | API 所有权统一：ERP/Finance 重叠 API 全部迁移                 | ERP/Finance API 无重叠 | 后端 + 前端负责人 |
| M2   | 事件总线升级：Redis Pub/Sub→Redis Stream（持久化 + ACK+DLQ）  | 事件总线 ACK 率 100%     | 后端负责人      |
| M2.5 | 模块化单体骨架：合并 28 个 svc 为 7 个核心模块，Cargo Feature Flags | 模块化单体可编译为单进程        | 架构负责人      |
| M3   | 编译时边界检查：实现 only\_own\_schema\_query! 宏 + API 注册表  | 编译时强制边界检查           | 架构负责人      |

#### Phase 2（3-6 个月）：DSH 集成 + AI 能力统一

**核心目标**：消除散件 AI，建立统一 AI 中间层，上线核心 AI Copilot



| 时间 | 核心动作                                            | 交付物                  | 责任人        |
| -- | ----------------------------------------------- | -------------------- | ---------- |
| M4 | DSH 基础版部署：Provider 抽象 + Agent 编排 + 工具注册中心       | DSH 基础版可正常运行         | AI 负责人     |
| M4 | AI 基础设施：Ollama 部署 + pgvector HNSW 索引 + Redis 缓存 | AI 基础设施就绪            | 运维负责人      |
| M5 | 核心业务工具实现：10 + 核心业务工具（ERP/Finance/CRM）           | 业务工具调用成功率 > 99%      | AI + 后端负责人 |
| M6 | 前端 Copilot 上线：ERP/Finance Copilot 基础版           | AI Copilot 响应时间 < 1s | 前端负责人      |
| M6 | AI 治理模块：成本计量 + 安全护栏 + 审计日志                      | AI 治理覆盖率 100%        | AI 负责人     |

#### Phase 3（6-12 个月）：部署优化 + 商业化支撑

**核心目标**：优化部署架构，落地商业化分层，支持不同客户定制化



| 时间     | 核心动作                                       | 交付物                    | 责任人        |
| ------ | ------------------------------------------ | ---------------------- | ---------- |
| M7     | 部署架构优化：模块化单体部署模板 + SaaS 微服务拆分              | 私有化进程数 = 1，SaaS 支持弹性伸缩 | 架构 + 运维负责人 |
| M8     | 前端架构优化：放弃 MF 双架构，采用路由级懒加载 SPA              | 首页加载时间 < 2s            | 前端负责人      |
| M9     | 商业化分层：tier 分层（free/basic/advanced）+ 权限自动关联 | tier 权限自动关联率 100%      | 产品 + 后端负责人 |
| M10-12 | 行业解决方案：TOPEMS 制造云 / 贸易云打包                  | 2-3 个行业解决方案可交付         | 产品 + 架构负责人 |

### 7.2 验收标准

#### Phase 1 验收标准



| 验收项                  | 量化指标 | 验证方法                                           |
| -------------------- | ---- | ---------------------------------------------- |
| 跨 Schema 查询数量        | 0    | `grep -r "plugin_" svc/*/src/` 无结果             |
| ERP/Finance API 重叠数量 | 0    | OpenAPI Lint 检查 API path 无重复                   |
| 事件总线 ACK 率           | 100% | Redis Monitor 检查所有事件 ACK                       |
| 模块化单体编译成功率           | 100% | `cargo build --release --features default` 无错误 |
| 编译时边界检查覆盖率           | 100% | 所有业务模块的 SQL/API 注册通过检查                         |

#### Phase 2 验收标准



| 验收项              | 量化指标 | 验证方法                            |
| ---------------- | ---- | ------------------------------- |
| DSH Provider 连通率 | >99% | Ollama/DeepSeek API 调用成功率 > 99% |
| 业务工具调用成功率        | >99% | 10 + 核心工具的调用成功率 > 99%           |
| AI Copilot 响应时间  | <1s  | 简单查询的响应时间 < 1s                  |
| AI 治理覆盖率         | 100% | 所有 AI 调用有审计日志 / 成本记录            |

#### Phase 3 验收标准



| 验收项          | 量化指标         | 验证方法                    |
| ------------ | ------------ | ----------------------- |
| 私有化部署进程数     | 1            | 仅需 1 个`topems-server`进程 |
| SaaS 部署弹性伸缩  | 支持 1000 + 租户 | K8s HPA 测试弹性伸缩          |
| tier 权限自动关联率 | 100%         | 不同 tier 用户仅能访问对应功能      |
| 前端加载时间       | <2s          | 首页加载时间 < 2s             |

### 7.3 风险应对



| 风险                | 影响等级 | 应对措施                                  |
| ----------------- | ---- | ------------------------------------- |
| 跨 Schema 清零导致业务中断 | 高    | Strangler Fig 模式逐步替换，保留旧逻辑作为 fallback |
| 模块化单体编译时间过长       | 中    | cargo 增量编译、预编译依赖、分模块开发                |
| DSH 集成导致 AI 成本超支  | 中    | LLM 路由策略（简单任务用 Ollama）、租户级 Token 限流   |
| 前端 MF 迁移导致功能异常    | 中    | 保留 MF 作为 fallback，逐步切换到路由级懒加载         |
| 团队成员不熟悉 Rust/DSH  | 中    | Rust/DSH 培训、Pair Programming、代码审查     |



***

## 8. 附录

### 8.1 关键代码位置索引



| 文件路径                                                  | 说明                       |
| ----------------------------------------------------- | ------------------------ |
| `svc/unified-core/src/routes/mod.rs`                  | 上帝路由声明中心（30 个 stub 路由）   |
| `svc/finance/src/modules/voucher_template.rs:487-520` | 跨 Schema 直查（Finance→ERP） |
| `svc/wms/src/modules/data_sync.rs:149-197`            | 跨 Schema 直写（WMS→CRM）     |
| `apps/web/src/routes/v2/index.ts`                     | 前端路由配置                   |
| `lib/shared-service-client/src/lib.rs`                | 共享服务客户端                  |
| `lib/shared-event/src/event/publisher.rs`             | 事件发布器                    |
| `lib/shared-db/src/schema.rs`                         | Schema 隔离工具              |
| `svc/master-data/src/modules/mod.rs`                  | Master-Data 模块           |

### 8.2 技术栈总览



| 技术领域  | 当前                          | 优化后                         |
| ----- | --------------------------- | --------------------------- |
| 后端语言  | Rust（28 个微服务）               | Rust（模块化单体 + 可选微服务）         |
| 前端框架  | React 19（MF+Static 双架构）     | React 19（SPA + 路由级懒加载）      |
| 数据库   | PostgreSQL+pgvector         | PostgreSQL+pgvector+HNSW 索引 |
| 事件总线  | Redis Pub/Sub               | Redis Stream（持久化 + ACK+DLQ） |
| AI 框架 | 散件（Agent/RAG/Dify/Workflow） | DSH 统一中间层                   |
| LLM   | Dify 代理（占位实现）               | Ollama 本地 + DeepSeek 云端混合   |
| 部署方式  | Docker Compose/K8s          | Docker Compose/K8s（支持多模式）   |

### 8.3 团队角色与职责



| 角色     | 核心职责                          | 参与 Phase |
| ------ | ----------------------------- | -------- |
| 架构负责人  | 模块化单体设计、编译时边界检查、Feature Flags | P1-P3    |
| 后端负责人  | 跨 Schema 清零、API 迁移、事件总线升级     | P1-P2    |
| AI 负责人 | DSH 集成、业务工具实现、AI 治理           | P2       |
| 前端负责人  | Copilot 集成、MF 迁移、AI 管理后台      | P2-P3    |
| 运维负责人  | AI 基础设施、部署模板、监控完善             | P2-P3    |
| 产品负责人  | 商业化分层、行业解决方案、用户验证             | P3       |

### 8.4 v1.1 差距修正清单（V289 代码库核查后更新）

> 本节记录 v1.0 文档描述与代码库实际状态之间的 7 处差距，
> 以及 V289 版本对应的修正落地措施（A/B/C/D 四轨并行）。



| ID     | v1.0 描述（过时 / 不完整）                                    | 代码库实际现状                                                                                                                                                                                                                                             | V289 处置                                                                                                                                                                                                                    | 验证点                                                                                                                                                                |
| ------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **G1** | §2.1 缺陷 1 Finance→ERP 跨 Schema 直查为 "active"          | 已修复：Finance 改为读取本地快照表 `plugin_finance.source_amount_snapshots`，通过 ERP 事件订阅同步。                                                                                                                                                                       | 保留现状（v285 已完成）                                                                                                                                                                                                             | 全局 grep `plugin_erp` in `svc/finance` = 0                                                                                                                          |
| **G2** | §2.1 缺陷 1 WMS→CRM 跨 Schema 直写为 "active"              | 已修复：WMS 改为事件发布 + fallback 写本地表，不再直写 CRM。                                                                                                                                                                                                            | 保留现状（v285 已完成）                                                                                                                                                                                                             | 全局 grep `plugin_crm` in `svc/wms` = 0                                                                                                                              |
| **G3** | §4.1 暗示 ERP/Finance 存在 API 路径重叠                      | 实际无重叠：`openapi-aggregated.json` 0 ERP / 288 Finance 路径，2-token 尾 0 重叠。                                                                                                                                                                              | 文档澄清：§4.1 立即清理项仅涉及前端类型 / 函数，不涉及后端路由。                                                                                                                                                                                       | `openapi-aggregated.json` diff 0 冲突                                                                                                                                |
| **G4** | §2.1 缺陷 3 未提及 Finance 页面对 ERP 类型的隐性反链                | **实际 10 个 Finance 页面 import&#x20;**`@/api/erp`**（11 处引用）**，根因：`erp/types.ts` 定义 17 条纯财务类型（Budget/FinancialVoucher 等），而 Finance 包未定义等价类型。                                                                                                            | **B1 类型迁移**：新建 `apps/web/src/api/finance/types.ts`（Budget/AccountingSubject/FinancialVoucher/VoucherItem/VoucherItemRequest 5 类高频），Finance index.ts re-export，ERP 侧加 `@deprecated`；7 个 Finance 页面 type-only import 切换。     | apps/web `tsc --noEmit` = 0；`pages/finance` 内 `from '@/api/erp'` 类型引用 = 0（仅 API 函数保留，待 B2 阶段对齐签名）                                                                  |
| **G5** | §2.1 缺陷 2 unified-core "30 个上帝路由声明中心"                | 实际 **32 个 stub 路由**（每文件～16 行空壳 + `{mod}:dashboard:read` 权限中间件）；前端 grep 0 命中 `fetch('/unified-core/` 业务流量；`{mod}:dashboard:read` 权限 **未** 在 iam init\_permissions 注册，亦未写入 core\_permissions 表。                                                       | **C2 全删除**：删除 31 个 stub 文件 + routes/mod.rs 的 32 个 `pub mod` + stubs Router merge；保留统一 health 路由。                                                                                                                           | `cargo check -p topems-unified-core` = 0；`svc/unified-core/src/routes/` 目录下 stub 文件名 = 0                                                                           |
| **G6** | §2.1 缺陷 1 仅列 Finance/WMS 两条跨 Schema                  | **实际剩余 2 条真实违规**（已忽略 AI 注释误报）：① `mes/work_report.rs` 查询 `plugin_mobile.work_reports`② `qms/dashboard.rs` ×2 查询 `plugin_mobile.quality_tasks`。Mobile 服务是纯代理：本身不维护这两张表，通过 `TypedServiceClient<MesApi/QmsApi>` 转发到 MES/QMS，因此 **真实数据源在 MES/QMS 自有表内**。 | **A0 自表直查**：① MES 改为 `SUM(output_quantity) FROM work_reports WHERE reporter_name=$1 AND created_at >= TODAY`② QMS 改为查 `qa_quality_inspections`（`status='completed' AND result='qualified'` 映射 mobile 的 `status='passed'`）。 | `cargo check -p topems-mes -p topems-qms` = 0；全局 grep `plugin_mobile\.(work_reports\|quality_tasks)` in `svc/` = 0                                                 |
| **G7** | §7.1 Phase 1 暗示 Finance settlement openapi schema 待补 | 已补齐：`svc/finance/src/openapi.rs` 注册 `SettlementCenterDashboard` / `CenterStatistics` 等 25 条，`openapi-aggregated.json` 中 SettlementCenter tag 存在且 shared-types 生成类型齐全。                                                                               | **D1 跳过**：现状完整，无需额外工作。                                                                                                                                                                                                     | `shared-types/src/generated/api-types.ts` 含 `SettlementCenterReconcileRequest` / `SettlementCenterDashboard` 等类型；`svc/finance/src/modules/settlement_center/` 模块完整 |



***

### 8.5 v1.2 进展同步与 MCP 交叉引用（V472 更新）

> 本节记录 v1.1 之后的主要架构进展，以及与 MCP 修正方案的交叉引用关系。

#### V290-V472 主要进展



| 版本范围      | 主题               | 落地内容                                                                         | 验证状态                                     |
| --------- | ---------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| V290-V310 | B2 前端 API 签名对齐   | budget/voucher/report 签名兼容包装 + accountingSubject 壳子 + 10 页面 import 切换        | ✅ `pages/finance` `@/api/erp` = 0        |
| V311-V320 | 编译时边界检查 + 审计日志   | SchemaAwareAuditLogService 覆盖 6 服务 + schema-defense 断言 + 跨 Schema grep CI 门禁 | ✅ `cargo check` 6 服务 = 0                 |
| V321-V340 | MCP 骨架 + DSH 适配层 | shared-mcp crate + McpTool/McpResource trait + svc/ai MCP 适配层骨架 + MCP 安全中间件  | ✅ `cargo check -p topems-shared-mcp` = 0 |
| V341-V472 | 审计日志归档 + 运维优化    | 审计日志 gzip 压缩归档 + 前端 tsc 未使用项批量清理 + CI 严格门禁                                   | ✅ 已推送 origin/main                        |

#### MCP 修正案交叉引用

本蓝图 v1.2 与 [MCP 架构修正方案](./TOPEMS_MCP_Architecture_Amendment_Plan.md) v1.1 联合实施：



| 本蓝图章节              | MCP 修正案对应章节         | 关系                                 |
| ------------------ | ------------------- | ---------------------------------- |
| §5 DSH 融合方案        | §3 MCP 协议适配层架构设计    | MCP 修正案在 DSH Layer 0 新增 McpAdapter |
| §7.1 Phase 1 分阶段实施 | §4 Phase 1 双轨并行实施节奏 | MCP 修正案将 Phase 1 调整为治理 + MCP 双轨    |
| §7.2 验收标准          | §6 MCP 验收标准与安全防护    | MCP 修正案补充 MCP 专属验收项                |
| §8.4 G1-G7 差距修正    | —                   | V289 已落地，G4 B2 阶段在 V290-V310 完成    |

#### 当前架构状态总结



```
✅ 跨 Schema 直查清零（V289 A0 轨 + V290+ B2 轨）

✅ unified-core 32 stub 路由清除（V289 C2 轨）

✅ Finance 页面 @/api/erp 反链清零（V290-V310 B2 轨）

✅ 编译时 Schema 边界 CI 门禁（V311-V320）

✅ MCP 骨架 + DSH 适配层就绪（V321-V340）

✅ 审计日志 gzip 归档（V472）

✅ MCP MVP 工具实现 → 超预期完成 16 业务域工具（v1.3 核查，2026-09-24）

✅ DSH Provider 抽象 + Agent 编排 → 全套落地（v1.3 核查，2026-09-24）

✅ accounting\_subjects 表物理迁移（V321 完成，erp 空表 08-31 已删；v1.3 核查）

✅ Phase 2 MCP 扩展 + AI 能力统一 → 已大规模落地（v1.3 核查，2026-09-24）

🟡 Phase 3 M9 商业化分层 → tier\_gate 中间件 + plan\_tier 已落地，权限自动关联率待运行时验证

🟡 Phase 3 M7 部署架构 → 模块化单体 27/32 服务已嵌入 topems-server，SaaS 微服务拆分待做

⬜ Phase 3 M10-12 行业解决方案（制造云 / 贸易云打包，未启动）
```



***

### 8.6 v1.3 进度核查（2026-09-24）

> 本节基于 2026-09-24 代码库实态核查，对照 §7.1 分阶段实施方案逐项更新状态。

#### 核查结论总览

| 阶段 | 规划项 | 状态 | 核查证据（代码库） |
| ---- | ---- | ---- | ---- |
| Phase 1 | M1 跨 Schema 清零 | ✅ 完成 | `svc/` 中 8 处 `plugin_*` 引用全部为注释 / 文档字符串，真实 SQL 违规 0 |
| Phase 1 | M1.5 API 所有权统一 | ✅ 完成 | `pages/finance` `@/api/erp` = 0；accounting\_subjects 已迁 finance schema |
| Phase 1 | M2 事件总线升级 | ✅ 完成 | `lib/shared-event` 已切 Redis Stream（stream\_publisher / stream\_subscriber + DLQ） |
| Phase 1 | M2.5 模块化单体骨架 | ✅ 完成（超预期） | 27/32 服务嵌入 `topems-server` 单进程，7 模块组 feature flags（design v1.0 2026-09-16） |
| Phase 1 | M3 编译时边界检查 | ✅ 完成 | `topems_shared_boundary::only_own_schema_query!` 宏已落地；CI Gate M Schema Boundary Static Gate |
| 轨 B | MCP MVP 工具实现 | ✅ 完成（超预期） | `svc/ai/src/dsh/mcp/tools/` 16 业务域工具（erp/finance/crm/wms/mes/qms/ehs/lims/scm/pm/aps/oa/bi/iot/hr/cs） |
| Phase 2 | M4 DSH 基础版部署 | ✅ 完成 | `svc/ai/src/dsh/provider`（deepseek/dify/ollama/mock/factory/failover/router）+ agent orchestrator |
| Phase 2 | M4 AI 基础设施 | ✅ 完成 | pgvector HNSW 索引迁移 v76（2026-08-13）；dsh/cache |
| Phase 2 | M5 核心业务工具 | ✅ 完成（超预期） | MCP 工具覆盖 16 业务域（原计划 10+ 个） |
| Phase 2 | M6 前端 Copilot | ✅ 完成 | AICopilotFab / Panel / SearchBox / QuickActions + useBusinessCopilot |
| Phase 2 | M6 AI 治理模块 | ✅ 完成 | dsh/governance + governance\_dashboard |
| Phase 3 | M7 部署架构优化 | 🟡 部分 | 模块化单体已落地（topems-server:8099 + VITE\_MONOLITH）；SaaS 微服务拆分待做 |
| Phase 3 | M8 前端 MF 迁移 | ✅ 完成 | routes/v2 模块动态 import + React.lazy；hybrid 模式已移除（MF 仅存于 plugin-loader） |
| Phase 3 | M9 商业化分层 | 🟡 部分 | tier\_gate 中间件 + plan\_tier（free/basic/advanced）已落地；权限自动关联率待运行时验证 |
| Phase 3 | M10-12 行业解决方案 | ⬜ 未启动 | 未见制造云 / 贸易云打包产物 |

#### 待运行时验收项（代码已就绪，需部署环境实测）

- 事件总线 ACK 率 100%（§7.2 Phase 1 验收）
- AI Copilot 响应时间 < 1s、业务工具调用成功率 > 99%（§7.2 Phase 2 验收）
- 私有化部署进程数 = 1（staging 部署验证）
- tier 权限自动关联率 100%
- 前端首页加载时间 < 2s（性能测试）

#### 当前进行中

- 前端 typecheck + lint 修复（2026-09-24 多轮提交推进中，eslint warnings 批量削减）
- 前端单元测试 / 端到端测试 / 性能测试（TODO.md P0-2/3/4）
- staging 部署验证、AI embedding（外部依赖项）



***

## 修订记录



| 版本   | 日期         | 修订人                   | 修订内容                                                                                                                                  |
| ---- | ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-08-24 | AI Assistant          | 初始版本，整合所有分析内容                                                                                                                         |
| v1.1 | 2026-08-24 | AI Assistant（V289 核查） | **差距核查 + 附录 v1.1**：新增 §8.4 记录 7 处文档 vs 代码库差距与 V289 修正措施（A0 跨 Schema 清零 / B1 类型迁移 / C2 stub 删除 / D1 跳過）；更新页眉版本号及 "最近修订" 日期。            |
| v1.2 | 2026-08-27 | AI Assistant（V472 同步） | **进展同步 + MCP 交叉引用**：新增 §8.5 记录 V290-V472 主要进展（B2 签名对齐 / 编译时边界检查 / MCP 骨架 / 审计日志归档）；关联 MCP 修正方案 v1.1；状态从 "待审批" 升级为 "实施中"；目录增加 §8.5 条目。 |
| v1.3 | 2026-09-24 | AI Assistant（进度核查） | **进度核查 + 状态刷新**：新增 §8.6 对照 §7.1 逐项核查。确认 Phase 1/2 与 MCP 轨代码工作全部闭环（MCP MVP 16 域超预期、DSH 全套落地、accounting\_subjects 迁移完成、模块化单体 27/32 服务）；§8.5 状态总结同步更新；剩余项为运行时验收 + M9/M10-12 + 前端质量收尾。 |



***

**文档状态**：实施中（Phase 1/2 与 MCP 轨代码工作已闭环，v1.3 核查 2026-09-24）

**下一步**：运行时验收（事件总线 ACK / Copilot 响应 / 单进程部署 / tier 权限关联）+ M9 商业化分层收尾 + M10-12 行业解决方案 + 前端质量收尾（typecheck/lint → 单测 / E2E / 性能）