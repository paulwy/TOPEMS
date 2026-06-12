# TOPEMS 整合设计文档

**文档版本**: v2.0  
**创建日期**: 2026-06-12  
**最后更新**: 2026-06-12  
**状态**: 已批准  
**适用阶段**: 架构设计与实施

---

## 目录

1. [概述](#1-概述)
2. [技术架构](#2-技术架构)
3. [模块设计](#3-模块设计)
   - 3.1 HRM模块
   - 3.2 ERP模块
   - 3.3 AI模块
   - 3.4 DOC-File服务
   - 3.5 其他模块
4. [数据架构](#4-数据架构)
5. [模块间集成](#5-模块间集成)
6. [集中ID管理](#6-集中ID管理)
7. [安全架构](#7-安全架构)
8. [部署架构](#8-部署架构)
9. [用户手册](#9-用户手册)

---

## 1. 概述

### 1.1 项目背景

TOPEMS (Total Operations and Project Management System) 是一个综合企业管理平台，旨在整合企业各类业务系统，提供统一的管理体验。

### 1.2 核心目标

| 目标 | 描述 |
|------|------|
| **统一平台** | 整合HRM、ERP、CRM、PM等模块 |
| **AI赋能** | 集成AI能力提升业务效率 |
| **数据互通** | 实现模块间数据共享与交换 |
| **安全合规** | 多层次安全防护体系 |
| **灵活部署** | 支持本地部署和SaaS模式 |

### 1.3 模块矩阵

```
┌─────────────────────────────────────────────────────────────┐
│                    TOPEMS 模块架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │    HRM    │  │    ERP    │  │    CRM    │  │    PM     │ │
│  │ 人力资源  │  │ 企业资源  │  │ 客户关系  │  │ 项目管理  │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘ │
│        │              │              │              │        │
│        └──────────────┼──────────────┼──────────────┘        │
│                       ▼                                     │
│              ┌───────────────────┐                          │
│              │     Core 服务     │                          │
│              │  IAM / DOC / AI   │                          │
│              └───────────────────┘                          │
│                       │                                     │
│        ┌──────────────┼──────────────┐                      │
│        ▼              ▼              ▼                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │    FILE   │  │    MES    │  │    QMS    │               │
│  │ 文件服务  │  │ 生产管理  │  │ 质量管理  │               │
│  └───────────┘  └───────────┘  └───────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 技术架构

### 2.1 技术栈

| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **后端** | Rust | 1.76+ | 高性能服务端语言 |
| **Web框架** | Axum | 0.8+ | 异步Web框架 |
| **数据库** | PostgreSQL | 16+ | 关系型数据库 |
| **缓存** | Redis | 7.2+ | 分布式缓存 |
| **前端** | React | 18.3+ | UI框架 |
| **TypeScript** | TypeScript | 5.5+ | 类型安全 |
| **构建工具** | Vite | 6.5+ | 快速构建 |
| **UI库** | Tailwind CSS | 3.4+ | 原子化CSS |
| **状态管理** | Zustand | 4.5+ | 轻量级状态管理 |
| **桌面端** | Tauri | 2.0+ | 桌面应用框架 |

### 2.2 服务聚合架构

| 聚合组 | 包含服务 | 端口 | 职责 |
|--------|----------|------|------|
| **Core** | IAM, DOC, FLOW, AI | 8000 | 核心基础服务 |
| **Enterprise** | ERP, HRM, CRM, PM | 8001 | 企业业务服务 |
| **Manufacturing** | MES, QMS, EHS, PDM | 8002 | 制造业务服务 |
| **SupplyChain** | SCM, SRM, WMS | 8003 | 供应链服务 |
| **Science** | RS, LIMS | 8004 | 科研服务 |
| **Platform** | BI, GIS, IM, REPORT | 8005 | 平台支撑服务 |

### 2.3 资源优化对比

| 指标 | 优化前 | 优化后 | 改善幅度 |
|------|--------|--------|----------|
| 进程数 | 27 | 6 | **-78%** |
| 内存占用 | ~2.7GB | ~850MB | **-72%** |
| 启动时间 | ~60秒 | ~15秒 | **-75%** |

---

## 3. 模块设计

### 3.1 HRM模块（人力资源管理）

#### 3.1.1 功能架构

```
HRM模块
├── 员工管理
│   ├── 员工信息管理
│   ├── 入职/离职流程
│   └── 员工档案
├── 组织架构
│   ├── 公司管理
│   ├── 部门管理
│   └── 职位管理
├── 考勤管理
│   ├── 打卡记录
│   ├── 请假管理
│   └── 加班管理
├── 薪资管理
│   ├── 工资核算
│   ├── 社保公积金
│   └── 薪资报表
└── 招聘管理
    ├── 职位发布
    ├── 候选人管理
    └── 面试安排
```

#### 3.1.2 核心数据模型

```typescript
interface Employee {
  id: string;                    // 员工ID (与IAM用户关联)
  employee_no: string;           // 工号
  name: string;                  // 姓名
  department_id: string;         // 部门ID
  position_id: string;           // 职位ID
  company_id: string;            // 公司ID
  email: string;                 // 邮箱
  phone: string;                 // 电话
  hire_date: string;             // 入职日期
  status: 'active' | 'inactive'; // 状态
  salary_info?: SalaryInfo;      // 薪资信息(关联ERP)
}

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  company_id: string;
  manager_id: string;
}
```

#### 3.1.3 与其他模块的集成

| 模块 | 集成方式 | 数据交换 |
|------|----------|----------|
| ERP | API调用 | 薪资数据、员工成本 |
| CRM | API调用 | 员工客户关联 |
| IAM | 直接关联 | 用户认证信息 |

---

### 3.2 ERP模块（企业资源计划）

#### 3.2.1 功能架构

```
ERP模块
├── 财务核算
│   ├── 期初余额管理
│   ├── 科目管理
│   ├── 凭证管理
│   └── 财务报表(资产负债表/利润表/现金流量表)
├── 资产管理
│   ├── 固定资产管理
│   ├── 折旧计算
│   └── 资产台账
├── 银行管理
│   ├── 账户管理
│   └── 交易记录
├── 多公司合并
│   ├── 合并范围管理
│   ├── 抵消规则
│   └── 合并报表
└── 外部对接
    ├── 金蝶接口
    ├── 用友接口
    └── SAP接口
```

#### 3.2.2 核心数据模型

```typescript
interface OpeningBalance {
  id: string;
  company_id: string;
  subject_code: string;          // 科目代码
  subject_name: string;          // 科目名称
  period: string;                // 期间
  debit_balance: number;         // 借方余额
  credit_balance: number;        // 贷方余额
}

interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  original_value: number;        // 原值
  accumulated_depreciation: number; // 累计折旧
  net_value: number;             // 净值
  depreciation_method: string;   // 折旧方法
  expected_life: number;         // 使用年限(月)
  responsible_id: string;        // 责任人ID(关联HRM员工)
  department_id: string;         // 部门ID(关联HRM部门)
}

interface Voucher {
  id: string;
  voucher_no: string;            // 凭证编号
  date: string;                  // 凭证日期
  type: string;                  // 凭证类型
  entries: VoucherEntry[];       // 分录
  source_type: string;           // 来源类型(HRM薪资/CRM发票/SRM付款等)
  source_id: string;             // 来源ID
}
```

#### 3.2.3 与其他模块的集成

| 模块 | 集成方式 | 数据交换 |
|------|----------|----------|
| HRM | API调用 | 获取员工薪资信息、部门成本分摊 |
| CRM | API调用 | 获取客户发票、收入数据 |
| SRM | API调用 | 获取供应商付款、采购成本 |
| PM | API调用 | 获取项目成本、预算数据 |

---

### 3.3 AI模块（人工智能）

#### 3.3.1 功能架构

```
AI模块
├── 智能助手
│   ├── 智能问答
│   ├── 文档摘要
│   └── 代码生成
├── 预测分析
│   ├── 需求预测
│   ├── 销售预测
│   └── 异常检测
├── 自然语言处理
│   ├── 文本分类
│   ├── 情感分析
│   └── 智能补全
└── 知识库
    ├── 文档向量化
    ├── RAG检索
    └── 知识管理
```

#### 3.3.2 核心数据模型

```typescript
interface DocumentVector {
  id: string;
  file_id: string;               // 关联File服务
  content: string;               // 文档片段
  embedding: number[];           // 向量表示
  metadata: Record<string, any>; // 元数据
}

interface AIAnalysis {
  id: string;
  type: 'classification' | 'sentiment' | 'qa' | 'summary';
  input: string;
  result: Record<string, any>;
  confidence: number;
}
```

#### 3.3.3 与其他模块的集成

| 模块 | 集成方式 | 数据交换 |
|------|----------|----------|
| DOC | API调用 | 获取文档进行向量化 |
| File | API调用 | 读取文件内容 |
| ERP | API调用 | 辅助财务报表分析 |
| HRM | API调用 | 辅助员工绩效分析 |

---

### 3.4 DOC-File服务（文档与文件管理）

#### 3.4.1 功能架构

```
DOC-File服务
├── DOC服务
│   ├── 文档元数据管理
│   ├── 文档分类
│   └── 版本控制
└── File服务
    ├── 文件上传/下载
    ├── 文件存储管理
    └── 权限控制
```

#### 3.4.2 集成架构

```
用户 ──► DOC ──► File ──► 返回file_id ──► DOC保存
                      │
                      ▼
                   AI向量化
                      │
                      ▼
                   Redis向量存储
```

#### 3.4.3 核心数据模型

```typescript
interface FileMetadata {
  id: string;
  owner_id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  content_type: string;
  vector_status: 'pending' | 'processing' | 'completed' | 'failed';
  visibility: 'private' | 'department' | 'public';
}
```

---

### 3.5 其他模块概览

| 模块 | 功能定位 | 核心能力 |
|------|----------|----------|
| **CRM** | 客户关系管理 | 客户管理、销售跟踪、合同管理 |
| **PM** | 项目管理 | 项目计划、任务分配、进度跟踪 |
| **MES** | 生产管理 | 生产计划、工艺流程、质量控制 |
| **QMS** | 质量管理 | 质量审核、不合格品管理、质量报表 |
| **LIMS** | 实验室管理 | 样品管理、检验记录、数据分析 |
| **SRM** | 供应商管理 | 供应商档案、采购管理、供应商评估 |
| **WMS** | 仓储管理 | 库存管理、出入库管理、库存盘点 |

---

## 4. 数据架构

### 4.1 数据库设计原则

| 原则 | 说明 |
|------|------|
| **Schema隔离** | 每个模块使用独立schema |
| **主数据共享** | 公司、部门、员工等主数据集中管理 |
| **外键约束** | 模块间通过ID关联，不重复存储 |
| **读写分离** | 支持主从复制 |

### 4.2 Schema结构

```
public/              # 公共表
  companies          # 公司信息
  departments        # 部门信息
  employees          # 员工信息
  users              # 用户信息(IAM)

hrm/                 # HRM模块
  attendance_records # 考勤记录
  leave_requests     # 请假申请
  payroll            # 薪资记录

erp/                 # ERP模块
  opening_balances   # 期初余额
  fixed_assets       # 固定资产
  bank_accounts      # 银行账户
  vouchers           # 凭证
  financial_reports  # 财务报表

crm/                 # CRM模块
  customers          # 客户
  contracts          # 合同
  sales_orders       # 销售订单

storage/             # 文件存储
  files              # 文件元数据
```

### 4.3 主数据管理

```typescript
interface Company {
  id: string;              // 统一公司ID
  name: string;
  short_name: string;
  tax_id: string;          // 税号
  industry: string;
  scale: 'small' | 'medium' | 'large';
  created_at: string;
}

interface Department {
  id: string;              // 统一部门ID
  company_id: string;
  parent_id: string | null;
  name: string;
  manager_id: string;      // 关联员工
}

interface Employee {
  id: string;              // 统一员工ID
  company_id: string;
  department_id: string;
  position_id: string;
  user_id: string;         // 关联IAM用户
  employee_no: string;
  name: string;
}
```

---

## 5. 模块间集成

### 5.1 集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                    模块间集成架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │   IAM    │◄───│  Core    │───►│   API    │              │
│  │ 认证服务 │    │  核心服务 │    │  网关    │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       ▼               ▼               ▼                     │
│  ┌─────────────────────────────────────────────┐            │
│  │           服务客户端层 (ServiceClient)       │            │
│  │  HRMClient | ERPClient | CRMClient | PMClient│            │
│  └───────────────────┬─────────────────────────┘            │
│                      │                                     │
│       ┌──────────────┼──────────────┐                      │
│       ▼              ▼              ▼                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │   HRM    │  │   ERP    │  │   CRM    │                 │
│  │   模块   │  │   模块   │  │   模块   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 服务客户端模式

```rust
// lib/src/service_client/hrm_client.rs
pub struct HrmServiceClient {
    base_url: String,
    http_client: reqwest::Client,
}

impl HrmServiceClient {
    pub async fn get_employee(&self, employee_id: &str) -> Result<Employee, Error> {
        let url = format!("{}/api/v1/employees/{}", self.base_url, employee_id);
        let response = self.http_client.get(&url).send().await?;
        response.json().await
    }
    
    pub async fn list_departments(&self, company_id: &str) -> Result<Vec<Department>, Error> {
        let url = format!("{}/api/v1/departments?company_id={}", self.base_url, company_id);
        let response = self.http_client.get(&url).send().await?;
        response.json().await
    }
}
```

### 5.3 数据交换流程

#### 5.3.1 HRM → ERP（薪资核算）

```
HRM薪资模块          ERP财务模块
      │                   │
      │──发送薪资数据──────►│
      │  employee_id      │
      │  amount           │
      │  period           │
      │                   │
      │◄──生成凭证ID───────│
      │  voucher_id       │
      │                   │
```

#### 5.3.2 CRM → ERP（发票生成）

```
CRM销售模块          ERP财务模块
      │                   │
      │──发送发票信息──────►│
      │  customer_id      │
      │  amount           │
      │  invoice_no       │
      │                   │
      │◄──生成凭证ID───────│
      │  voucher_id       │
      │                   │
```

#### 5.3.3 SRM → ERP（付款处理）

```
SRM采购模块          ERP财务模块
      │                   │
      │──发送付款信息──────►│
      │  supplier_id      │
      │  amount           │
      │  purchase_order   │
      │                   │
      │◄──生成凭证ID───────│
      │  voucher_id       │
      │                   │
```

---

## 6. 集中ID管理

### 6.1 设计目标

| 目标 | 描述 |
|------|------|
| **唯一性** | 全局唯一的ID标识 |
| **可追溯** | 记录ID的创建来源和历史 |
| **类型化** | 支持不同类型的ID |
| **分布式** | 支持多节点生成 |

### 6.2 ID生成策略

```typescript
interface IdRecord {
  id: string;                    // 生成的ID
  type: IdType;                  // ID类型
  entity_id: string;             // 实体ID(可选)
  entity_type: string;           // 实体类型
  created_by: string;            // 创建人
  created_at: string;            // 创建时间
  metadata: Record<string, any>; // 元数据
}

type IdType = 
  | 'company'       // 公司ID
  | 'department'    // 部门ID
  | 'employee'      // 员工ID
  | 'user'          // 用户ID
  | 'project'       // 项目ID
  | 'customer'      // 客户ID
  | 'supplier'      // 供应商ID
  | 'asset'         // 资产ID
  | 'voucher';      // 凭证ID
```

### 6.3 ID生成服务

```rust
// 集中ID管理服务
pub struct IdGenerator {
    redis_client: RedisClient,
    prefixes: HashMap<IdType, String>,
}

impl IdGenerator {
    pub fn generate(&self, id_type: IdType) -> Result<String, Error> {
        let prefix = self.prefixes.get(&id_type).unwrap();
        let key = format!("id:seq:{}", prefix);
        let seq = self.redis_client.incr(&key).await?;
        Ok(format!("{}{:08}", prefix, seq))
    }
    
    pub fn register(&self, id: &str, entity_type: &str, entity_id: &str) -> Result<(), Error> {
        let record = IdRecord {
            id: id.to_string(),
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            // ...
        };
        self.redis_client.set(&format!("id:record:{}", id), &record).await
    }
}
```

### 6.4 ID前缀配置

| ID类型 | 前缀 | 示例 |
|--------|------|------|
| company | C | C00000001 |
| department | D | D00000001 |
| employee | E | E00000001 |
| user | U | U00000001 |
| project | P | P00000001 |
| customer | CU | CU0000001 |
| supplier | SU | SU0000001 |
| asset | AS | AS0000001 |
| voucher | V | V202606001 |

---

## 7. 安全架构

### 7.1 认证授权体系

```
┌─────────────────────────────────────────────────────────────┐
│                    认证授权架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   OAuth2.0   │    │    JWT      │    │    RBAC      │  │
│  │   授权协议   │    │   Token管理  │    │   角色权限   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             ▼                               │
│              ┌─────────────────────────┐                   │
│              │        权限中间件        │                   │
│              │   Permission Middleware │                   │
│              └────────────┬────────────┘                   │
│                           │                                 │
│                           ▼                                 │
│              ┌─────────────────────────┐                   │
│              │      业务服务层         │                   │
│              │   (权限校验在各模块)    │                   │
│              └─────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 安全防护清单

| 防护类型 | 措施 | 实施位置 |
|----------|------|----------|
| **认证** | JWT + OAuth2.0 | IAM服务 |
| **授权** | RBAC + ABAC | 各服务 |
| **加密** | HTTPS + TLS 1.3 | 网关 |
| **输入验证** | 参数校验 + SQL注入防护 | API层 |
| **XSS防护** | 输出转义 + CSP | 前端 |
| **CSRF防护** | Token验证 | 前端 |
| **DDoS防护** | 限流 + 熔断 | 网关 |
| **数据加密** | AES-256 | 数据库 |

### 7.3 权限模型

```typescript
interface Permission {
  id: string;
  name: string;
  code: string;           // 权限编码
  description: string;
  module: string;         // 所属模块
}

interface Role {
  id: string;
  name: string;
  permissions: string[];  // 权限编码列表
}

interface UserRole {
  user_id: string;
  role_id: string;
  company_id: string;     // 数据权限范围
  department_id?: string; // 部门权限范围
}
```

---

## 8. 部署架构

TOPEMS支持两种部署模式：**本地部署**和**SaaS部署**，满足不同企业的需求。

### 8.1 部署模式对比

| 维度 | 本地部署 | SaaS部署 |
|------|----------|----------|
| **部署位置** | 企业自有服务器 | 云服务商基础设施 |
| **数据存储** | 企业本地数据库 | 云端数据库（多租户隔离） |
| **维护方式** | 企业自行维护 | 服务商统一运维 |
| **初始成本** | 高（需采购硬件） | 低（订阅制） |
| **运维成本** | 高（需专业IT人员） | 低（服务商负责） |
| **扩展性** | 受限于硬件配置 | 弹性扩展 |
| **数据安全** | 完全自主控制 | 依赖服务商安全能力 |
| **适用场景** | 对数据主权有高要求 | 快速上线、成本优先 |

### 8.2 本地部署架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           本地部署架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                       企业内网环境                                │       │
│  │                                                                     │       │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │       │
│  │  │  Core   │    │Enterprise│    │   MS    │    │Platform │     │       │
│  │  │  核心   │    │  企业   │    │  制造   │    │  平台   │     │       │
│  │  │ svc:8000│    │ svc:8001│    │ svc:8002│    │ svc:8005│     │       │
│  │  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘     │       │
│  │       │              │              │              │            │       │
│  │       └──────────────┼──────────────┼──────────────┘            │       │
│  │                      │              │                             │       │
│  │                      ▼              ▼                             │       │
│  │              ┌───────────────────────────────┐                   │       │
│  │              │        Nginx / API Gateway    │                   │       │
│  │              │         负载均衡 + SSL        │                   │       │
│  │              └───────────────┬───────────────┘                   │       │
│  │                              │                                     │       │
│  │              ┌───────────────┼───────────────┐                    │       │
│  │              ▼               ▼               ▼                    │       │
│  │        ┌─────────┐    ┌─────────┐    ┌─────────┐                │       │
│  │        │PostgreSQL│    │  Redis  │    │ RabbitMQ│                │       │
│  │        │ 主从复制 │    │ 缓存集群│    │ 消息队列 │                │       │
│  │        └─────────┘    └─────────┘    └─────────┘                │       │
│  │                                                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 本地部署配置文件

```yaml
# docker-compose.local.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: topems
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres_replica:
    image: postgres:16
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    command: >
      postgres
      -c hot_standby=on
      -c primary_conninfo=host=postgres port=5432
    depends_on:
      postgres:
        condition: service_healthy

  redis:
    image: redis:7.2-alpine
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis_replica:
    image: redis:7.2-alpine
    command: redis-server --replicaof redis 6379
    depends_on:
      redis:
        condition: service_healthy

  rabbitmq:
    image: rabbitmq:3.13-management
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    healthcheck:
      test: ["CMD", "rabbitmqctl", "status"]
      interval: 30s
      timeout: 10s
      retries: 3

  topems-core:
    build:
      context: ./services/core
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/topems
      REDIS_URL: redis://:@redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      RUST_LOG: info
      RUST_BACKTRACE: 1
    restart: unless-stopped

  topems-enterprise:
    build:
      context: ./services/enterprise
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/topems
      REDIS_URL: redis://:@redis:6379
    restart: unless-stopped

  topems-manufacturing:
    build:
      context: ./services/manufacturing
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/topems
      REDIS_URL: redis://:@redis:6379
    restart: unless-stopped

  topems-platform:
    build:
      context: ./services/platform
      dockerfile: Dockerfile
    ports:
      - "8005:8005"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/topems
      REDIS_URL: redis://:@redis:6379
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/nginx.conf
      - ./deploy/ssl:/etc/nginx/ssl
    depends_on:
      - topems-core
      - topems-enterprise
      - topems-manufacturing
      - topems-platform
    restart: unless-stopped

  backup:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    entrypoint: ["/bin/bash", "-c"]
    command: |
      while true; do
        sleep 86400
        pg_dump -h postgres -U postgres -d topems -F c -f /backup/topems_$(date +%Y%m%d).dump
        find /backup -type f -mtime +30 -delete
      done
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  postgres_replica_data:
  redis_data:
  rabbitmq_data:
```

### 8.3 SaaS部署架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SaaS部署架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                       云服务商区域                                │       │
│  │                                                                     │       │
│  │  ┌─────────────────────────────────────────────────────────┐     │       │
│  │  │                    Kubernetes集群                        │     │       │
│  │  │                                                           │     │       │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │     │       │
│  │  │  │  Core   │  │Enterprise│  │   MS    │  │Platform │     │     │       │
│  │  │  │  Pod    │  │   Pod   │  │   Pod   │  │   Pod   │     │     │       │
│  │  │  │  × 3    │  │   × 3   │  │   × 3   │  │   × 3   │     │     │       │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │     │       │
│  │  │                                                           │     │       │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                   │     │       │
│  │  │  │PostgreSQL│  │  Redis  │  │ RabbitMQ│                   │     │       │
│  │  │  │ 云数据库 │  │ 云缓存  │  │ 云消息  │                   │     │       │
│  │  │  │ (托管)   │  │ (托管)  │  │ (托管)  │                   │     │       │
│  │  │  └─────────┘  └─────────┘  └─────────┘                   │     │       │
│  │  │                                                           │     │       │
│  │  │  ┌─────────────────────────────────────────────────┐     │     │       │
│  │  │  │              对象存储 (OSS/S3)                   │     │     │       │
│  │  │  │        文件存储、备份、静态资源                   │     │       │
│  │  │  └─────────────────────────────────────────────────┘     │     │       │
│  │  │                                                           │     │       │
│  │  └─────────────────────────────────────────────────────────┘     │       │
│  │                                                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                     多租户隔离层                                  │       │
│  │                                                                     │       │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │       │
│  │  │ 租户 A  │ │ 租户 B  │ │ 租户 C  │ │ 租户 D  │ │ 租户 E  │ ...  │       │
│  │  │ Tenant  │ │ Tenant  │ │ Tenant  │ │ Tenant  │ │ Tenant  │     │       │
│  │  │Schema A │ │Schema B │ │Schema C │ │Schema D │ │Schema E │     │       │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘     │       │
│  │                                                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                       接入层                                      │       │
│  │                                                                     │       │
│  │  ┌─────────────────────────────────────────────────────────┐     │       │
│  │  │              CDN (内容分发网络)                          │     │       │
│  │  │         静态资源加速 + DDoS防护                         │     │       │
│  │  └──────────────────────────┬──────────────────────────────┘     │       │
│  │                             ▼                                     │       │
│  │  ┌─────────────────────────────────────────────────────────┐     │       │
│  │  │            ALB (应用负载均衡)                            │     │       │
│  │  │        SSL终结 + 请求路由 + 健康检查                      │     │       │
│  │  └─────────────────────────────────────────────────────────┘     │       │
│  │                                                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### SaaS部署配置 (Kubernetes)

```yaml
# k8s/saas-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: topems-core
  namespace: topems
spec:
  replicas: 3
  selector:
    matchLabels:
      app: topems-core
  template:
    metadata:
      labels:
        app: topems-core
    spec:
      containers:
      - name: topems-core
        image: topems/core:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: topems-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: topems-secrets
              key: redis-url
        - name: RUST_LOG
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: topems-core-svc
  namespace: topems
spec:
  selector:
    app: topems-core
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: topems-ingress
  namespace: topems
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
spec:
  tls:
  - hosts:
    - api.topems.io
    secretName: topems-tls
  rules:
  - host: api.topems.io
    http:
      paths:
      - path: /api/core
        pathType: Prefix
        backend:
          service:
            name: topems-core-svc
            port:
              number: 80
```

### 8.4 多租户隔离策略

| 隔离级别 | 实现方式 | 适用场景 |
|----------|----------|----------|
| **数据库隔离** | 每个租户独立数据库 | 高安全要求、大型租户 |
| **Schema隔离** | 每个租户独立Schema | 中等规模租户 |
| **行级隔离** | 通过tenant_id过滤 | 小型租户、资源优先 |

```sql
-- Schema隔离示例
CREATE SCHEMA IF NOT EXISTS tenant_{tenant_id};

-- 行级隔离
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.companies
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 8.5 备份与恢复策略

| 环境 | 备份频率 | 保留时间 | 恢复目标 |
|------|----------|----------|----------|
| 本地 | 每日全量 + 实时增量 | 30天 | RPO < 1小时, RTO < 4小时 |
| SaaS | 每小时增量 + 每日全量 | 90天 | RPO < 5分钟, RTO < 1小时 |

### 8.6 CI/CD流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD 流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Git Push ──► Webhook ──► CI Pipeline                                      │
│                            │                                                │
│    ┌───────────────────────┼───────────────────────┐                       │
│    ▼                       ▼                       ▼                       │
│  ┌─────────┐         ┌─────────┐           ┌─────────┐                   │
│  │  Build  │         │  Test   │           │  Scan   │                   │
│  │  编译   │         │  测试   │           │  安全扫描│                   │
│  └────┬────┘         └────┬────┘           └────┬────┘                   │
│       │                   │                     │                          │
│       └───────────────────┼─────────────────────┘                          │
│                           ▼                                                │
│                   ┌─────────────┐                                          │
│                   │  Artifact   │                                          │
│                   │   构建产物   │                                          │
│                   └──────┬──────┘                                          │
│                          │                                                 │
│    ┌─────────────────────┼─────────────────────┐                          │
│    ▼                     ▼                     ▼                          │
│  ┌─────────┐         ┌─────────┐           ┌─────────┐                    │
│  │  Dev    │         │  Test   │           │  Prod   │                    │
│  │ 开发环境 │         │ 测试环境 │           │ 生产环境 │                    │
│  │ 自动部署 │         │ 手动触发 │           │ 审批发布 │                    │
│  └─────────┘         └─────────┘           └─────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.7 监控与告警

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s

alerting:
  alertmanagers:
  - static_configs:
    - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'topems'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app]
      regex: 'topems-.*'
      action: keep
```

---

## 9. 用户手册

### 9.1 系统访问

| 环境 | 地址 |
|------|------|
| 开发环境 | http://localhost:3000 |
| 测试环境 | http://test.topems.io |
| 生产环境 | https://topems.io |

### 9.2 测试账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 系统管理员 |
| hradmin | admin123 | HR管理员 |
| finadmin | admin123 | 财务管理员 |
| testuser | admin123 | 普通用户 |

### 9.3 模块功能速览

| 模块 | 主要功能 | 适用角色 |
|------|----------|----------|
| **HRM** | 员工管理、考勤、薪资 | HR管理员、部门经理 |
| **ERP** | 财务核算、资产管理、报表 | 财务人员、管理员 |
| **CRM** | 客户管理、销售跟踪 | 销售、客服 |
| **PM** | 项目管理、任务分配 | 项目经理、成员 |
| **AI** | 智能助手、文档分析 | 所有用户 |
| **DOC** | 文档管理、文件存储 | 所有用户 |

### 9.4 常用操作

#### 9.4.1 创建员工

1. 进入「人力资源」→「员工管理」
2. 点击「新建员工」
3. 填写基本信息、工作信息、联系方式
4. 关联公司和部门
5. 点击「保存」

#### 9.4.2 创建凭证

1. 进入「企业资源」→「凭证管理」
2. 点击「新建凭证」
3. 选择凭证类型
4. 添加分录（借方/贷方）
5. 选择来源（HRM薪资/CRM发票等）
6. 点击「保存」

#### 9.4.3 生成财务报表

1. 进入「企业资源」→「财务报表」
2. 选择报表类型（资产负债表/利润表/现金流量表）
3. 选择期间
4. 点击「生成报表」
5. 支持导出Excel/PDF

---

## 附录：模块依赖关系

```mermaid
graph TD
    IAM --> HRM
    IAM --> ERP
    IAM --> CRM
    HRM --> ERP
    CRM --> ERP
    SRM --> ERP
    PM --> ERP
    DOC --> AI
    File --> DOC
    File --> AI
    ERP --> BI
    CRM --> BI
    HRM --> BI
```

---

**文档版本**: v2.0  
**最后更新**: 2026-06-12  
**作者**: TOPEMS开发团队