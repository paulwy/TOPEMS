# TOPEMS 插件化架构设计文档 v2.2 (最终版)

> 创建时间: 2026-06-22
> 版本: v2.2 (Final)
> 状态: **方案确定，开始实施**

---

## 一、架构决策记录 (Architecture Decision Records)

| 决策项 | 选择 | 说明 |
|-------|------|------|
| 插件本地分发 | **B + A** | 主推 ZIP 脚本包，配套 Docker 镜像供大客户 |
| SaaS 多租户隔离 | **A + B** | 公有 SaaS 行级租户，合规私有化独立 Schema |
| 财务/项目管理 | **B** | 默认预装核心插件，不内置核心 |
| 前端插件化 | **B + A** | SystemJS 通用底座，内置核心插件复用 MF 优化性能 |
| 数据库迁移 | **B** | 插件独立迁移 + Core 通用迁移执行 SDK |
| 卸载数据处理 | **C** | 三级可配置策略，默认逻辑注销，财务禁止彻底删除 |
| 主数据权限 | **C** | Core 管标准基础主数据，插件管业务扩展主数据 |
| 前端插件体积 | **B** | 软限制 1MB，超量警告，大组件强制懒加载 |

---

## 二、系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOPEMS 插件化架构                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           部署模式                                      │  │
│  │                                                                       │  │
│  │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │  │
│  │   │   本地部署       │    │   SaaS 部署     │    │   私有化部署    │  │  │
│  │   │   (ZIP + 脚本)   │    │   (行级租户)    │    │  (独立 Schema)  │  │  │
│  │   └─────────────────┘    └─────────────────┘    └─────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          前端层 (React + TypeScript)                    │  │
│  │                                                                       │  │
│  │   ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │   │                     主应用 Shell (SystemJS)                       │ │  │
│  │   │   ├── 插件加载器 (PluginLoader)                                   │ │  │
│  │   │   ├── 路由管理器 (RouteManager)                                   │ │  │
│  │   │   ├── 菜单管理器 (MenuManager)                                    │ │  │
│  │   │   └── 共享模块 (React/MUI/Axios...)                              │ │  │
│  │   └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │   ┌─────────────────────────┐    ┌─────────────────────────────────┐  │  │
│  │   │   内置核心插件 (MF)      │    │     第三方插件 (SystemJS)        │  │  │
│  │   │   ├── finance-core      │    │     ├── erp                      │  │  │
│  │   │   ├── project-core      │    │     ├── hrm                      │  │  │
│  │   │   ├── iam-core          │    │     ├── mes                      │  │  │
│  │   │   ├── comm-core         │    │     └── ...                      │  │  │
│  │   │   └── doc-core          │    │                                  │  │  │
│  │   └─────────────────────────┘    └─────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          网关层 (API Gateway)                           │  │
│  │   ├── 路由代理 (/api/{module}/* → http://localhost:{port})            │  │
│  │   ├── 认证鉴权 (JWT / OAuth)                                          │  │
│  │   ├── 限流熔断                                                         │  │
│  │   └── 插件注册表 (Plugin Registry)                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       核心层 (unified-core)                             │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │  │
│  │   │  身份权限    │  │   财务核心   │  │  项目管理   │                 │  │
│  │   │  iam-core   │  │finance-core │  │project-core │                 │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                 │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │  │
│  │   │   通讯核心   │  │   文档核心   │  │   迁移 SDK  │                 │  │
│  │   │ comm-core   │  │  doc-core   │  │MigrationSDK │                 │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                 │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       业务插件层 (Business Plugins)                     │  │
│  │                                                                       │  │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │  │
│  │   │    ERP    │  │   HRM     │  │   MES     │  │   SCM     │        │  │
│  │   └───────────┘  └───────────┘  └───────────┘  └───────────┘        │  │
│  │                                                                       │  │
│  │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │  │
│  │   │   WMS     │  │   QMS     │  │   BI      │  │   ...     │        │  │
│  │   └───────────┘  └───────────┘  └───────────┘  └───────────┘        │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          数据层 (PostgreSQL)                            │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────────────────────────────────────────┐  │  │
│  │   │  通用数据 (tenant_id 行级隔离)                                   │  │  │
│  │   │  ├── 主数据 (组织、人员、会计科目、物料...)                       │  │  │
│  │   │  ├── 业务数据 (订单、工单、凭证...)                              │  │  │
│  │   │  └── 插件数据                                                   │  │  │
│  │   └───────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────────────────────────────────────────┐  │  │
│  │   │  私有化部署: 独立 Schema (schema_name = tenant_xxx)            │  │  │
│  │   └───────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心插件定义

### 3.1 内置核心插件 (MF 构建时打包)

| 插件代码 | 名称 | 功能范围 | 体积限制 |
|---------|------|---------|---------|
| `finance-core` | 财务核心 | 凭证、账簿、应收应付、固定资产、预算 | < 1MB |
| `project-core` | 项目管理核心 | 项目、任务、资源、成本、里程碑 | < 1MB |
| `iam-core` | 身份权限核心 | 用户、角色、权限、租户、SSO | < 500KB |
| `comm-core` | 通讯核心 | 通知中心、消息、邮件服务 | < 500KB |
| `doc-core` | 文档核心 | 知识库、文件管理、版本控制 | < 500KB |

### 3.2 业务插件 (SystemJS 运行时加载)

| 插件代码 | 名称 | 依赖 | 体积限制 |
|---------|------|------|---------|
| `erp` | 企业资源计划 | finance-core, project-core | < 1MB |
| `hrm` | 人力资源 | finance-core (薪资) | < 1MB |
| `mes` | 生产执行 | project-core, finance-core (成本) | < 1MB |
| `scm` | 供应链管理 | finance-core (采购), project-core | < 1MB |
| `wms` | 仓储管理 | mes, scm | < 1MB |
| `qms` | 质量管理 | mes, project-core | < 800KB |
| `bi` | 经营分析 | finance-core, project-core, all | < 1.5MB |

### 3.3 预装策略

```yaml
# 预装配置 presets.yaml
presets:
  # 最小可用版
  minimal:
    plugins:
      - iam-core
      - comm-core
      - doc-core
      - finance-core    # 财务优先
      - project-core    # 项目优先

  # 标准企业版
  standard:
    extends: minimal
    plugins:
      - erp
      - hrm
      - mes

  # 完整企业版
  enterprise:
    extends: standard
    plugins:
      - scm
      - wms
      - qms
      - bi
```

---

## 四、插件包结构规范

### 4.1 插件 ZIP 包结构

```
plugin-{code}-{version}.zip
│
├── plugin.yaml                    # 插件元数据
├── plugin.yaml.sig               # 签名文件 (可选)
│
├── backend/
│   ├── plugin-{code}             # 可执行文件 (Linux)
│   ├── plugin-{code}.exe         # 可执行文件 (Windows)
│   └── migrations/               # 数据库迁移
│       ├── 001_init.sql
│       ├── 002_add_field.sql
│       └── migration.lock
│
├── frontend/
│   ├── manifest.json             # 插件清单
│   ├── bundle.js                 # 编译后的 JS (SystemJS)
│   ├── bundle.css                # 样式文件
│   └── assets/                   # 静态资源
│       ├── icons/
│       └── images/
│
└── config/
    └── default.yaml              # 默认配置
```

### 4.2 plugin.yaml 元数据

```yaml
# plugin.yaml
apiVersion: v1
kind: Plugin

metadata:
  code: erp
  name: 企业资源计划
  version: 1.2.0
  description: ERP 企业资源计划模块
  author: TOPEMS
  homepage: https://topems.com/plugins/erp

spec:
  # 类型
  type: business  # business | core | infrastructure
  platform: both  # local | saas | both

  # 运行时
  runtime:
    backend:
      port: 8010
      healthEndpoint: /health
    frontend:
      type: systemjs  # systemjs | mf
      entry: frontend/bundle.js
      sharedModules:
        - react
        - react-dom
        - @mui/material

  # 依赖
  dependencies:
    required:
      - code: finance-core
        version: ">=1.0.0"
      - code: project-core
        version: ">=1.0.0"
    optional:
      - code: hrm
        version: ">=1.0.0"

  # 插件体积检查
  sizeLimit:
    maxBundleSize: 1048576  # 1MB
    maxAssetSize: 2097152   # 2MB
    warningThreshold: 0.8    # 80% 警告

  # 卸载策略
  uninstallPolicy:
    default: logical_delete  # logical_delete | archive | force_delete
    forceDeleteAllowed: false  # 财务模块禁止彻底删除
    archiveRetentionDays: 90

  # 主数据权限
  masterData:
    managed:
      - customers      # 客户档案
      - suppliers      # 供应商档案
    readOnly:
      - account_subjects  # 会计科目 (由 finance-core 管理)
      - departments       # 部门 (由 iam-core 管理)

  # 转换规则
  transforms:
    published:
      - order.confirmed  → mes.workorder.create
      - purchase.approved → srm.contract.create
    subscribed:
      - employee.created
      - project.started
```

### 4.3 前端 manifest.json

```json
{
  "code": "erp",
  "version": "1.2.0",
  "name": "企业资源计划",
  "type": "systemjs",
  "entry": "/plugins/erp/bundle.js",
  "shared": ["react", "react-dom", "@mui/material", "react-router-dom"],
  "routes": [
    {
      "path": "/erp/dashboard",
      "component": "ErpDashboard",
      "chunk": "dashboard"
    },
    {
      "path": "/erp/sales",
      "component": "SalesOrderList",
      "chunk": "sales",
      "lazy": true
    },
    {
      "path": "/erp/purchase",
      "component": "PurchaseOrderList",
      "chunk": "purchase",
      "lazy": true
    }
  ],
  "menu": [
    {
      "id": "erp-menu",
      "title": "ERP",
      "icon": "Building2",
      "children": [
        {
          "id": "erp-dashboard",
          "title": "ERP 首页",
          "path": "/erp/dashboard",
          "order": 1
        },
        {
          "id": "erp-sales",
          "title": "销售管理",
          "path": "/erp/sales",
          "order": 2
        },
        {
          "id": "erp-purchase",
          "title": "采购管理",
          "path": "/erp/purchase",
          "order": 3
        }
      ]
    }
  ],
  "permissions": [
    "erp:sales:read",
    "erp:sales:write",
    "erp:purchase:read",
    "erp:purchase:write",
    "erp:report:read"
  ],
  "size": {
    "bundle": 876432,
    "assets": 124567,
    "total": 1000999,
    "status": "ok"  // ok | warning | error
  }
}
```

---

## 五、数据库迁移机制

### 5.1 迁移 SDK 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                   Core Migration SDK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   MigrationExecutor                      │   │
│  │                                                         │   │
│  │   Responsibilities:                                     │   │
│  │   - 扫描插件 migrations 目录                             │   │
│  │   - 按版本顺序执行迁移                                    │   │
│  │   - 记录迁移历史                                          │   │
│  │   - 失败回滚                                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   MigrationLock                          │   │
│  │                                                         │   │
│  │   - 分布式锁 (防止并发迁移)                               │   │
│  │   - Redis: SETNX migration_lock_{plugin}                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   MigrationHistory                       │   │
│  │                                                         │   │
│  │   Table: core_migration_history                         │   │
│  │   Columns:                                              │   │
│  │   - id (PK)                                            │   │
│  │   - plugin_code                                        │   │
│  │   - version                                            │   │
│  │   - name                                               │   │
│  │   - applied_at                                         │   │
│  │   - status (success|failed|rolling_back)               │   │
│  │   - checksum                                           │   │
│  │   - executed_by                                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 迁移执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    插件迁移执行流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 插件启动                                                     │
│     └─► 插件调用 MigrationSDK.register(pluginCode)              │
│                                                                 │
│  2. SDK 检测未执行迁移                                           │
│     └─► 查询 core_migration_history                             │
│     └─► 对比 migrations/*.sql 文件                              │
│                                                                 │
│  3. 获取分布式锁                                                 │
│     └─► Redis SETNX migration_lock_{plugin}                    │
│     └─► 超时 30s                                                │
│                                                                 │
│  4. 执行迁移                                                    │
│     For each migration (ordered by version):                    │
│       │                                                         │
│       ├── 校验 checksum                                         │
│       ├── BEGIN TRANSACTION                                    │
│       ├── 执行 SQL                                              │
│       ├── 记录 migration_history                                │
│       ├── COMMIT (成功)                                         │
│       │    └── 释放锁                                            │
│       │                                                         │
│       └── ROLLBACK (失败)                                       │
│            ├── 记录错误日志                                       │
│            ├── 发送告警                                           │
│            └── 插件启动失败                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 迁移文件命名规范

```
migrations/
├── 001_init.sql                    # 初始版本
├── 002_add_field_x.sql              # 新增字段
├── 003_create_table_y.sql           # 新建表
├── 004_modify_field_z.sql           # 修改字段
├── 005_create_index.sql             # 创建索引
└── migration.lock                   # 锁文件 (防止重复执行)
```

### 5.4 迁移回滚机制

```sql
-- 001_init.sql
-- +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- Migration: 001_init
-- Description: 初始化 ERP 模块表结构
-- +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- Up Migration
CREATE TABLE IF NOT EXISTS erp_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES crm_customers(id),
    amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE  -- 逻辑删除
);

CREATE INDEX idx_erp_orders_customer ON erp_orders(customer_id);
CREATE INDEX idx_erp_orders_status ON erp_orders(status);

-- Insert migration record
INSERT INTO core_migration_history (plugin_code, version, name, checksum, executed_by)
VALUES ('erp', '001', '初始化 ERP 模块表结构',
        md5(read_binary('001_init.sql')), 'system')
ON CONFLICT DO NOTHING;

-- +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- Down Migration (Rollback)
-- +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

DROP INDEX IF EXISTS idx_erp_orders_status;
DROP INDEX IF EXISTS idx_erp_orders_customer;
DROP TABLE IF EXISTS erp_orders;

DELETE FROM core_migration_history
WHERE plugin_code = 'erp' AND version = '001';
```

---

## 六、插件卸载策略

### 6.1 三级卸载策略

```yaml
# 卸载策略配置
uninstall_policies:
  # 策略级别
  levels:
    - code: logical_delete
      name: 逻辑注销
      description: 仅标记为已删除，数据保留，可恢复
      operations:
        - UPDATE {table} SET is_deleted = TRUE, deleted_at = NOW()
        - UPDATE plugin_registry SET status = 'uninstalled'
      reversible: true

    - code: archive
      name: 归档
      description: 移动到归档表，保留一定天数后可彻底删除
      operations:
        - INSERT INTO {table}_archive SELECT * FROM {table}
        - DELETE FROM {table}
        - UPDATE plugin_registry SET status = 'archived'
      reversible: true
      retention_days: 90

    - code: force_delete
      name: 彻底删除
      description: 永久删除所有数据，不可恢复
      operations:
        - DROP TABLE {plugin_tables}
        - DELETE FROM core_migration_history WHERE plugin_code = 'xxx'
        - DELETE FROM plugin_registry WHERE code = 'xxx'
      reversible: false

  # 默认策略
  default: logical_delete

  # 禁止策略 (财务模块)
  prohibited:
    - code: force_delete
      reason: "财务数据禁止彻底删除，请联系管理员"
      plugins:
        - finance-core
        - finance-extend
```

### 6.2 卸载执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    插件卸载执行流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 管理员发起卸载                                               │
│     └─► 选择策略 (logical_delete / archive / force_delete)      │
│                                                                 │
│  2. 前置检查                                                    │
│     ├─► 检查是否有依赖插件                                       │
│     ├─► 检查是否有未完成业务 (订单、工单...)                      │
│     ├─► 检查策略是否允许                                         │
│     │    └─► 财务模块禁止 force_delete                          │
│     └─► 确认操作                                                 │
│                                                                 │
│  3. 数据处理                                                    │
│     ├─► logical_delete:                                          │
│     │    └─► UPDATE ... SET is_deleted = TRUE                   │
│     ├─► archive:                                                 │
│     │    └─► INSERT INTO _archive → DELETE                      │
│     └─► force_delete:                                            │
│          └─► DROP TABLE, DELETE ...                             │
│                                                                 │
│  4. 清理资源                                                    │
│     ├─► 注销插件注册                                             │
│     ├─► 清除缓存                                                 │
│     ├─► 通知相关插件                                             │
│     └─► 发送卸载完成通知                                         │
│                                                                 │
│  5. 卸载成功                                                    │
│     └─► 插件可重新安装                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、主数据管理规范

### 7.1 主数据分类

```
┌─────────────────────────────────────────────────────────────────┐
│                     主数据管理架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Core 层标准主数据                      │   │
│  │                 (finance-core, iam-core)                 │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────────┐   │   │
│  │   │ 会计科目体系 (finance-core)                       │   │   │
│  │   │ ├── 科目编码规则                                  │   │   │
│  │   │ ├── 一级科目 (资产/负债/权益/成本/损益)           │   │   │
│  │   │ └── 末级科目                                      │   │   │
│  │   └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────────┐   │   │
│  │   │ 组织架构 (iam-core)                                │   │   │
│  │   │ ├── 公司/事业部                                   │   │   │
│  │   │ ├── 部门/科室                                    │   │   │
│  │   │ └── 岗位                                         │   │   │
│  │   └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────────┐   │   │
│  │   │ 人员档案 (iam-core)                                │   │   │
│  │   │ ├── 员工基本信息                                  │   │   │
│  │   │ └── 组织归属                                     │   │   │
│  │   └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ 只读 API                           │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    插件层业务主数据                       │   │
│  │                                                         │   │
│  │   ERP Plugin:                                           │   │
│  │   ├── 客户档案                                         │   │
│  │   ├── 供应商档案                                       │   │
│  │   └── 物料主数据 (基础属性)                             │   │
│  │                                                         │   │
│  │   MES Plugin:                                           │   │
│  │   ├── 工艺路线                                          │   │
│  │   ├── 工序定义                                          │   │
│  │   └── BOM (物料清单)                                    │   │
│  │                                                         │   │
│  │   HRM Plugin:                                          │   │
│  │   ├── 考勤规则                                          │   │
│  │   ├── 薪资规则                                          │   │
│  │   └── 绩效模板                                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 主数据 API 规范

```typescript
// Core 层提供只读 API
GET /api/finance-core/account-subjects
  // 返回: [{ code, name, direction, level, parentCode }]

GET /api/iam-core/departments
  // 返回: [{ id, code, name, parentId, manager }]

GET /api/iam-core/persons
  // 返回: [{ id, employeeNo, name, departmentId, position }]

// 插件层提供完整 CRUD
POST /api/erp/customers
PUT /api/erp/customers/{id}
DELETE /api/erp/customers/{id}
```

### 7.3 主数据转换规则

```yaml
# 主数据同步规则
master_data_sync:
  - id: sync_customer_to_crm
    name: ERP 客户 → CRM 客户
    source: erp.customers
    target: crm.contacts
    trigger: on_create | on_update
    mapping:
      - source: customer_code
        target: external_id
      - source: name
        target: name
      - source: contact_person
        target: contact_name
    conflictStrategy: source_wins  # source_wins | target_wins | manual

  - id: sync_employee_to_project
    name: HRM 员工 → 项目资源
    source: hrm.employees
    target: project.resources
    trigger: on_create
    mapping:
      - source: employee_no
        target: employee_code
      - source: name
        target: name
```

---

## 八、前端插件加载规范

### 8.1 插件体积检查

```typescript
// 插件加载前检查
interface SizeCheckResult {
  bundle: number;      // JS Bundle 大小
  assets: number;      // 静态资源大小
  total: number;       // 总大小
  status: 'ok' | 'warning' | 'error';
  warnings?: string[];
}

const SIZE_LIMITS = {
  maxBundleSize: 1024 * 1024,      // 1MB
  maxAssetSize: 2 * 1024 * 1024,    // 2MB
  warningThreshold: 0.8,             // 80% 警告阈值
};

// 检查结果处理
function handleSizeCheck(result: SizeCheckResult) {
  switch (result.status) {
    case 'ok':
      // 正常加载
      break;
    case 'warning':
      // 显示警告，但允许加载
      showWarning(`插件体积接近限制 (${formatSize(result.total)})`);
      // 建议使用 lazy loading
      break;
    case 'error':
      // 阻止加载
      throw new Error(`插件体积超出限制: ${formatSize(result.total)}`);
  }
}
```

### 8.2 懒加载强制规范

```typescript
// 大组件必须使用 React.lazy 懒加载
const routes = [
  {
    path: '/erp/sales',
    component: React.lazy(() => import('./pages/SalesOrders')),  // 强制懒加载
    chunk: 'sales-orders',
    sizeEstimate: '600KB'
  },
  {
    path: '/erp/reports',
    component: React.lazy(() => import('./pages/Reports')),      // 强制懒加载
    chunk: 'reports',
    sizeEstimate: '800KB'
  }
];

// SystemJS 动态导入
async function loadPlugin(pluginCode: string) {
  const manifest = await fetch(`/plugins/${pluginCode}/manifest.json`);

  // 体积检查
  if (manifest.size.total > SIZE_LIMITS.maxBundleSize) {
    throw new Error(`插件 ${pluginCode} 体积超限`);
  }

  // 注册 SystemJS 模块
  SystemJS.register(`plugin-${pluginCode}`, manifest.shared, async () => {
    const module = await SystemJS.import(manifest.entry);
    return {
      default: module,
      routes: manifest.routes,
      menu: manifest.menu
    };
  });
}
```

---

## 九、服务端口分配 (最终版)

| 服务名称 | 端口 | 说明 |
|---------|------|------|
| **核心层** | | |
| unified-core | 8000 | 统一核心服务 |
| **内置核心插件** | | |
| finance-core | 8001 | 财务核心 |
| project-core | 8002 | 项目管理核心 |
| iam-core | 8003 | 身份权限核心 |
| comm-core | 8004 | 通讯核心 |
| doc-core | 8005 | 文档核心 |
| **业务插件** | | |
| erp | 8010 | 企业资源计划 |
| hrm | 8020 | 人力资源管理 |
| pm | 8022 | 项目管理 |
| crm | 8029 | 客户关系管理 |
| mes | 8030 | 生产执行系统 |
| pdm | 8031 | 产品数据管理 |
| scm | 8040 | 供应链管理 |
| wms | 8041 | 仓储管理 |
| srm | 8042 | 供应商管理 |
| qms | 8050 | 质量管理 |
| lims | 8051 | 实验室信息管理 |
| ehs | 8052 | 环境健康安全 |
| rs | 8053 | 报表服务 |
| bi | 8060 | 商业智能 |
| report | 8061 | 报表引擎 |
| monitor | 8062 | 监控告警 |
| portal | 8063 | 门户服务 |
| mobile | 8070 | 移动端服务 |
| gis | 8071 | 地理信息服务 |
| integration | 8072 | 系统集成服务 |

---

## 十、API 路由规范

```
/api/{plugin-code}/{resource}

示例:
/api/finance-core/vouchers      # 财务凭证
/api/finance-core/ledgers       # 账簿
/api/project-core/projects      # 项目
/api/project-core/tasks         # 任务
/api/erp/sales-orders          # 销售订单
/api/erp/purchase-orders       # 采购订单
/api/hrm/employees             # 员工
/api/mes/work-orders           # 生产工单
```

---

## 十一、实施里程碑

| 阶段 | 内容 | 优先级 |
|-----|------|-------|
| Phase 1 | Core Migration SDK 实现 | P0 |
| Phase 2 | finance-core, project-core 插件化 | P0 |
| Phase 3 | 前端插件加载器 (SystemJS) | P0 |
| Phase 4 | 插件市场基础功能 | P1 |
| Phase 5 | erp, hrm, mes 插件化 | P1 |
| Phase 6 | 数据转换规则引擎 | P2 |
| Phase 7 | 完整插件市场 (安装/卸载/升级) | P2 |

---

*文档状态: **方案确定，开始实施***
*最后更新: 2026-06-22*
