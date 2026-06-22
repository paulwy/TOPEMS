# TOPEMS 插件化架构设计

**版本**: v1.0
**日期**: 2026-06-22
**状态**: 已批准

---

## 1. 概述

### 1.1 设计目标

基于"基础平台 + 行业套件"的销售模式，将 TOPEMS 拆分为：
- **Core Platform** - 企业必须购买的核心平台
- **Plugin Suites** - 可独立部署、独立销售的行业套件

### 1.2 设计原则

1. **Core 不可拆分** - 包含企业运营的基础能力
2. **套件可独立部署** - 每个套件独立运行、独立销售
3. **数据交换通过 API** - 跨套件数据共享通过标准接口
4. **编码体系提前约定** - 避免后续整合时的数据混乱

---

## 2. 模块架构

### 2.1 Core Platform (端口 8000)

```
┌─────────────────────────────────────────────────────────────┐
│                     TOPEMS Core (8000)                      │
├─────────────────────────────────────────────────────────────┤
│  IAM           - 身份认证、权限、角色                       │
│  审批流         - 工作流定义、审批实例                       │
│  文档           - 文档管理、版本控制                        │
│  文件           - 文件上传下载、存储                         │
│  通知           - 站内信、邮件、短信                        │
│  租户           - 多租户隔离、租户管理                      │
│  计费           - 订阅、计量计费                           │
│  ──────────────────────────────────────────────────────  │
│  AI基础能力      - AI Chat / AI Search / AI Summary        │
│  基础工作台      - 快捷入口、消息中心、审批待办              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 独立套件

| 套件 | 端口 | 包含模块 | 说明 |
|------|------|---------|------|
| **生产套件** | 8030-8031 | MES, PDM | 离散/流程制造 |
| **质量套件** | 8050-8052 | QMS, LIMS, EHS | 质量管控、实验室、环保安全 |
| **研发套件** | 8053 | RS | 研发项目管理 |
| **协同套件** | 8020-8022 | HRM, CRM, PM | 人力、客户、项目管理 |
| **经营套件** | 8010 | ERP | 财务管理、采购销售 |
| **供应链套件** | 8040-8042 | SCM, WMS, SRM | 供应链、仓储、供应商 |
| **分析套件** | 8060-8061 | BI, Report | 数据分析、报表 |
| **门户套件** | 8063 | Portal | 企业工作台 |
| **基础设施** | 8070-8072 | Mobile, GIS, Integration | 移动端、IoT、数据交换 |

---

## 3. 端口分配

### 3.1 端口分配原则

```
8000-8009   │  核心平台（必选）
8010-8019   │  经营管理（ERP等）
8020-8029   │  协同办公（HRM/CRM/PM）
8030-8039   │  生产制造（MES/PDM）
8040-8049   │  供应链（SCM/WMS/SRM）
8050-8059   │  质量/研发（QMS/LIMS/EHS/RS）
8060-8069   │  数据分析/门户/扩展
8070-8079   │  基础设施（Mobile/IoT等）
```

### 3.2 端口映射表

| 端口段 | 服务 | 端口 | 说明 |
|--------|------|------|------|
| **8000-8009 核心平台** | | | |
| | unified-core | 8000 | IAM, Doc, File, Flow, IM, Mail, AI基础 |
| **8010-8019 经营管理** | | | |
| | erp | 8010 | 企业资源计划 |
| **8020-8029 协同办公** | | | |
| | hrm | 8020 | 人力资源 |
| | crm | 8029 | 客户管理 |
| | pm | 8022 | 项目管理 |
| **8030-8039 生产制造** | | | |
| | mes | 8030 | 生产执行 |
| | pdm | 8031 | 产品数据 |
| **8040-8049 供应链** | | | |
| | scm | 8040 | 供应链管理 |
| | wms | 8041 | 仓库管理 |
| | srm | 8042 | 供应商管理 |
| **8050-8059 质量/研发** | | | |
| | qms | 8050 | 质量管理 |
| | lims | 8051 | 实验室信息 |
| | ehs | 8052 | 环境健康安全 |
| | rs | 8053 | 研发管理 |
| **8060-8069 数据分析/门户** | | | |
| | bi | 8060 | 商业智能 |
| | report | 8061 | 报表服务 |
| | monitor | 8062 | 系统监控 |
| | portal | 8063 | 企业门户 |
| **8070-8079 基础设施** | | | |
| | mobile | 8070 | 移动端 |
| | gis | 8071 | 地理信息/IoT |
| | integration | 8072 | 数据交换 |

---

## 4. 数据交换策略

### 4.1 共享基础数据（Shared Schema）

以下数据需要在套件间共享，放在 shared schema：

| 基础表 | 说明 | 关键字段 |
|--------|------|---------|
| customer | 客户 | id, code, name, status, category, extension |
| supplier | 供应商 | id, code, name, status, category, extension |
| material | 物料 | id, code, name, status, category, extension |
| department | 部门 | id, code, name, status, extension |
| employee | 员工 | id, code, name, department_id, extension |

### 4.2 扩展字段机制

```sql
-- 共享基础表结构示例
CREATE TABLE shared.customer (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,  -- 用于跨模块关联
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    category VARCHAR(50),
    tenant_id UUID NOT NULL,
    extension JSONB,  -- 模块特有字段放这里
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 各套件扩展表示例
CREATE TABLE crm.customer_extension (
    customer_id UUID REFERENCES shared.customer(id),
    industry VARCHAR(100),      -- 客户行业
    credit_level VARCHAR(20),    -- 信用等级
    custom_fields JSONB          -- 自定义字段
);
```

### 4.3 外部数据同步

```sql
-- 映射配置表
CREATE TABLE shared.code_mapping (
    id UUID PRIMARY KEY,
    external_system VARCHAR(50),     -- 来源系统
    external_code VARCHAR(100),      -- 外部编码
    internal_code VARCHAR(100),     -- TOPEMS编码
    sync_status VARCHAR(20),         -- pending/synced/conflict
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 同步历史表
CREATE TABLE shared.sync_log (
    id UUID PRIMARY KEY,
    mapping_id UUID REFERENCES shared.code_mapping(id),
    action VARCHAR(20),              -- create/update/delete
    old_value JSONB,
    new_value JSONB,
    synced_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 跨套件数据访问

```
┌─────────────────────────────────────────────────────────────┐
│                     跨套件数据访问                           │
├─────────────────────────────────────────────────────────────┤
│  方式：通过 Core 提供的 API 访问共享数据                    │
│                                                             │
│  GET /api/shared/customers?code=S-CUST-000001              │
│  GET /api/shared/materials?category=raw                    │
│  POST /api/shared/sync/external                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 编码体系

### 5.1 模块前缀

| 模块 | 前缀 | 示例 |
|------|------|------|
| Core | C | C-TNT-000001 (租户) |
| MES | M | M-WO-20240601-001 (工单) |
| PDM | D | D-BOM-20240601-001 (物料清单) |
| QMS | Q | Q-INS-20240601-001 (检验单) |
| LIMS | L | L-SAM-20240601-001 (样品) |
| EHS | E | E-SAF-20240601-001 (安全检查) |
| RS | R | R-PROJ-20240601-001 (项目) |
| HRM | H | H-EMP-000001 (员工) |
| CRM | C | C-CUST-000001 (客户) |
| PM | P | P-TASK-20240601-001 (任务) |
| ERP | G | G-SO-20240601-001 (销售订单) |
| SCM | S | S-PO-20240601-001 (采购订单) |
| WMS | W | W-STO-000001 (库存) |
| SRM | V | V-SUP-000001 (供应商) |
| BI | B | B-RPT-20240601-001 |
| Report | R | R-RPT-20240601-001 |
| Mobile | M | M-DEV-000001 |
| GIS | G | G-LOC-000001 |

### 5.2 共享基础数据编码

```
客户：    C-CUST-{6位序号}  例: C-CUST-000001
供应商：  V-SUP-{6位序号}  例: V-SUP-000001
物料：    MAT-{6位序号}    例: MAT-000001
部门：    H-DEPT-{4位序号} 例: H-DEPT-0001
员工：    H-EMP-{6位序号} 例: H-EMP-000001
```

### 5.3 跨模块引用格式

```
{来源模块}:{该模块编码}

示例：
• 工单引用物料:    M:MAT-000001 (生产→物料)
• 检验关联工单:    Q:M-WO-20240601-001 (质量→生产工单)
• 项目使用物料:    R:MAT-000001 (研发→物料)
• 订单引用客户:    G:C-CUST-000001 (经营→客户)
```

---

## 6. 套件拆分清单

### 6.1 需要拆分的套件

| 原套件 | 包含模块 | 拆分后 |
|--------|---------|--------|
| manufacturing | MES + PDM | mes (8030), pdm (8031) |
| quality-assurance | QMS + LIMS + EHS | qms (8050), lims (8051), ehs (8052) |
| analytics | BI + Report | bi (8060), report (8061) |

### 6.2 端口变更清单

| 模块 | 原端口 | 新端口 | 状态 |
|------|--------|--------|------|
| unified-core (含AI) | 8000 | 8000 | 不变 |
| hrm | 8011 | 8020 | 变更 |
| crm | 8012 | 8029 | 变更 |
| pm | 8001 | 8022 | 变更 |
| erp | 8010 | 8010 | 不变 |
| mes | 8030 | 8030 | 不变 |
| pdm | 8023 | 8031 | 变更 |
| scm | 8040 | 8040 | 不变 |
| wms | 8042 | 8041 | 变更 |
| srm | 8060 | 8042 | 变更 |
| qms | 8031→8052 | 8050 | 变更 |
| lims | 8022 | 8051 | 变更 |
| ehs | 8032 | 8052 | 变更 |
| rs | 8058 | 8053 | 变更 |
| bi | 8044→8060 | 8060 | 变更 |
| report | 8061 | 8061 | 不变 |
| monitor | 8064 | 8062 | 变更 |
| portal | 8066 | 8063 | 变更 |
| mobile | 8056 | 8070 | 变更 |
| gis | 8054 | 8071 | 变更 |
| integration | 8068 | 8072 | 变更 |

---

## 7. 实施计划

### Phase 1: 端口统一（已完成）
- [x] 确定权威端口表
- [x] 更新后端服务默认端口（mes/pdm/qms/lims/ehs/bi/report）
- [x] 更新 vite.config.ts 代理配置（hrm/mes/pdm/qms/lims/ehs/wms/pm/bi/report/integration）
- [x] 更新前端 plugin.ts 配置（已验证端口正确）
- [x] 更新文档中的端口引用

### Phase 2: 套件拆分（已完成）
- [x] 拆分 manufacturing → mes (8030) + pdm (8031)
- [x] 拆分 quality-assurance → qms (8050) + lims (8051) + ehs (8052)
- [x] 拆分 analytics → bi (8060) + report (8061)

### Phase 3: 数据层重构（已完成）
- [x] 创建 shared schema 迁移文件
- [x] 实现 customers, suppliers, materials, projects 基础表
- [x] 实现 code_mapping, sync_log, audit_log 表
- [x] 实现 code_sequences 编码序列生成器

### Phase 4: Core 整合 AI（已完成）
- [x] 创建 modules/ai 模块结构
- [x] 实现 AIService 核心服务
- [x] 实现 AI API handlers
- [x] 添加 AI 路由到 unified-core
- [x] 编译验证通过

---

## 8. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-22 | 初始设计，批准执行 |
| v1.1 | 2026-06-22 | 完成 Phase 2-4：套件拆分、数据层重构、AI整合到Core |
| v1.2 | 2026-06-22 | 完成 Phase 1：端口统一，前端代理配置更新 |

---

## 9. 附录

### A. 服务端口总览

```
8000  unified-core (IAM+DOC+File+Flow+AI)
8001  [备用]
8010  erp
8011  [备用]
8020  hrm
8021  crm
8022  pm
8023  [备用]
8030  mes
8031  pdm
8032  [备用]
8040  scm
8041  wms
8042  srm
8043  [备用]
8050  qms
8051  lims
8052  ehs
8053  rs
8054  [备用]
8055  [备用]
8056  [备用]
8057  [备用]
8058  [备用]
8059  [备用]
8060  bi
8061  report
8062  monitor
8063  portal
8064  [备用]
8065  [备用]
8066  [备用]
8067  [备用]
8068  [备用]
8069  [备用]
8070  mobile
8071  gis
8072  integration
8073-8099 [备用]
```

### B. 术语表

| 术语 | 说明 |
|------|------|
| Core | 基础平台，所有客户必选 |
| Plugin/Suite | 可独立部署销售的套件 |
| Shared Schema | 跨套件共享的基础数据 |
| Extension | JSONB 扩展字段 |
| Code Mapping | 外部系统编码映射 |
