# 统一数据库架构设计

## 1. 当前问题分析

### 1.1 重复表问题
当前系统存在 **67 个重复表名**，分布在多个 schema 中，主要问题包括：

| 表名 | 重复次数 | 涉及 Schema |
|------|----------|-------------|
| audit_logs | 16 | 几乎所有服务 |
| notifications | 5 | crm, flow, im, mobile, portal |
| companies | 2 | erp, hrm |
| employees | 2 | erp, hrm |
| departments | 2 | erp, hrm |
| users | 2 | iam, rs |

### 1.2 连接池配置不一致
- 各服务使用不同的 search_path 配置
- HRM 服务使用 `after_connect` 钩子设置 search_path
- 部分服务使用共享库的 `create_database_pool` 函数
- 默认 search_path 为 `"rs, erp, public"`，导致 HRM 服务访问错误的表

### 1.3 共享库重复
存在两个共享库：
- `/Users/xingzhai/TOPEMS/lib` - 主共享库
- `/Users/xingzhai/TOPEMS/shared/lib` - 重复的共享库

---

## 2. 统一架构设计

### 2.1 Schema 分层策略

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 数据库                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 核心共享层 (shared)                              │
│    ├── users              # 统一用户表                      │
│    ├── roles              # 角色定义                        │
│    ├── permissions        # 权限定义                        │
│    ├── companies          # 公司信息 (统一)                 │
│    ├── departments        # 部门信息 (统一)                 │
│    ├── employees          # 员工信息 (统一)                 │
│    └── audit_logs         # 统一审计日志                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 业务域层                                         │
│    ├── iam.*             # 身份认证与授权                   │
│    ├── hrm.*             # 人力资源管理                     │
│    ├── erp.*             # 企业资源计划                     │
│    ├── crm.*             # 客户关系管理                     │
│    ├── mes.*             # 制造执行系统                     │
│    ├── wms.*             # 仓储管理系统                     │
│    ├── qms.*             # 质量管理系统                     │
│    ├── lims.*            # 实验室信息管理                   │
│    └── ...               # 其他业务域                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: 基础设施层                                       │
│    ├── public.*          # 公共配置与共享数据               │
│    ├── flow.*            # 工作流引擎                      │
│    ├── notification.*    # 通知服务                        │
│    └── ai.*              # AI 服务                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Schema 命名规范

| Schema | 用途 | 说明 |
|--------|------|------|
| `shared` | 跨域共享数据 | 用户、公司、部门、员工等核心实体 |
| `iam` | 身份与访问管理 | 用户认证、授权、权限管理 |
| `hrm` | 人力资源管理 | 招聘、考勤、绩效、薪酬等 HR 专用功能 |
| `erp` | 企业资源计划 | 财务、采购、销售、资产等 |
| `crm` | 客户关系管理 | 客户、商机、销售漏斗等 |
| `mes` | 制造执行系统 | 生产订单、设备、工艺等 |
| `wms` | 仓储管理系统 | 库存、出入库、库位等 |
| `qms` | 质量管理系统 | 质检、质量标准、纠正措施等 |
| `lims` | 实验室管理 | 样品、试剂、仪器、检测等 |
| `scm` | 供应链管理 | 供应商、采购等 |
| `rs` | 研发管理 | 项目、配方、实验等 |
| `flow` | 工作流引擎 | 审批流程、工作流定义等 |
| `notification` | 通知服务 | 统一消息推送 |
| `ai` | AI 服务 | 分析、文档处理等 |
| `public` | 公共配置 | 系统配置、字典数据等 |

### 2.3 核心实体归属

| 实体 | 归属 Schema | 说明 |
|------|-------------|------|
| User | `shared` | 统一用户实体 |
| Company | `shared` | 统一公司实体 |
| Department | `shared` | 统一部门实体 |
| Employee | `shared` | 统一员工实体 |
| Role | `iam` | 角色定义 |
| Permission | `iam` | 权限定义 |
| AuditLog | `shared` | 统一审计日志 |
| Notification | `notification` | 统一通知 |

### 2.4 HRM 与 ERP 的关系

```
┌──────────────────┐       ┌──────────────────┐
│      HRM         │       │       ERP        │
│  (人力资源管理)  │       │  (企业资源计划)  │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         │  读取                    │  读取
         │  ──────────────────────▶ │
         │  Company/Department      │
         │  Employee                │
         │                          │
         │  写入                    │  写入
         │  ◀────────────────────── │
         │  Payroll → Expense       │
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │     shared       │
         │ (共享数据层)     │
         │                  │
         │  • companies    │
         │  • departments  │
         │  • employees    │
         │  • audit_logs   │
         └──────────────────┘
```

**关系规则：**

1. **共享实体**：`companies`、`departments`、`employees` 只在 `shared` schema 中维护
2. **HRM 职责**：员工入职、离职、考勤、绩效、薪酬计算
3. **ERP 职责**：员工费用报销、资产分配、成本核算
4. **数据流向**：HRM 写入员工主数据 → ERP 读取用于费用核算 → ERP 写入费用记录 → HRM 读取用于薪酬计算

---

## 3. 连接池统一配置

### 3.1 统一数据库连接 URL 格式

```bash
# 生产环境
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>?options=-c%20search_path=shared,iam,public

# 开发环境
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems?options=-c%20search_path=shared,iam,public
```

### 3.2 服务特定 search_path 配置

| 服务 | Search Path | 环境变量 |
|------|-------------|----------|
| IAM | `iam, shared, public` | `SEARCH_PATH=iam,shared,public` |
| HRM | `hrm, shared, public` | `SEARCH_PATH=hrm,shared,public` |
| ERP | `erp, shared, public` | `SEARCH_PATH=erp,shared,public` |
| CRM | `crm, shared, public` | `SEARCH_PATH=crm,shared,public` |
| MES | `mes, shared, public` | `SEARCH_PATH=mes,shared,public` |
| WMS | `wms, shared, public` | `SEARCH_PATH=wms,shared,public` |
| QMS | `qms, shared, public` | `SEARCH_PATH=qms,shared,public` |
| LIMS | `lims, shared, public` | `SEARCH_PATH=lims,shared,public` |

### 3.3 共享库数据库连接池实现

修改 `/Users/xingzhai/TOPEMS/lib/src/database.rs`：

```rust
pub async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool> {
    let service_name = std::env::var("SERVICE_NAME").unwrap_or_else(|_| "unknown".to_string());
    
    let default_search_path = match service_name.as_str() {
        "topems-iam" => "iam, shared, public",
        "topems-hrm" => "hrm, shared, public",
        "topems-erp" => "erp, shared, public",
        "topems-crm" => "crm, shared, public",
        "topems-mes" => "mes, shared, public",
        "topems-wms" => "wms, shared, public",
        "topems-qms" => "qms, shared, public",
        "topems-lims" => "lims, shared, public",
        _ => "public",
    };
    
    let search_path = std::env::var("SEARCH_PATH").unwrap_or_else(|_| default_search_path.to_string());
    
    let options = PgPoolOptions::new()
        .max_connections(config.pool_max_size)
        .min_connections(config.pool_min_size)
        .acquire_timeout(Duration::from_secs(config.connect_timeout))
        .idle_timeout(Duration::from_secs(config.idle_timeout))
        .max_lifetime(Duration::from_secs(1800))
        .test_before_acquire(true)
        .after_connect(move |conn, _meta| {
            let search_path = search_path.clone();
            Box::pin(async move {
                let query = format!("SET search_path TO {}", search_path);
                let result = sqlx::query(&query)
                    .execute(conn)
                    .await;
                result.map_err(|e| {
                    error!("Failed to set search path: {}", e);
                    e
                })?;
                Ok(())
            })
        });

    let pool = options
        .connect(&config.url)
        .await
        .map_err(|e| TopemsError::Database(format!("Failed to create database pool: {}", e)))?;

    info!("✅ 数据库连接池创建成功 (service: {}, search_path: {})", service_name, search_path);
    Ok(pool)
}
```

---

## 4. 数据迁移计划

### 4.1 迁移步骤

```
Phase 1: 创建 shared schema 和核心表
    ├── 创建 shared.companies
    ├── 创建 shared.departments
    ├── 创建 shared.employees
    └── 创建 shared.audit_logs

Phase 2: 数据迁移
    ├── 从 erp.companies → shared.companies
    ├── 从 hrm.companies → shared.companies (去重)
    ├── 从 erp.departments → shared.departments
    ├── 从 hrm.departments → shared.departments (去重)
    ├── 从 erp.employees → shared.employees
    └── 从 hrm.employees → shared.employees (去重)

Phase 3: 更新服务配置
    ├── 更新 HRM 服务使用 shared schema
    ├── 更新 ERP 服务使用 shared schema
    └── 更新其他相关服务

Phase 4: 清理旧表
    ├── 删除 erp.companies, erp.departments, erp.employees
    └── 删除 hrm.companies, hrm.departments, hrm.employees
```

### 4.2 迁移 SQL 脚本示例

```sql
-- 创建 shared schema
CREATE SCHEMA IF NOT EXISTS shared;

-- 创建 shared.companies 表
CREATE TABLE IF NOT EXISTS shared.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    address VARCHAR(500),
    contact_phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 迁移数据 (保留 hrm 中的数据作为主数据源)
INSERT INTO shared.companies 
SELECT * FROM hrm.companies
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    updated_at = EXCLUDED.updated_at;

-- 补充 erp 中独有的数据
INSERT INTO shared.companies 
SELECT * FROM erp.companies
WHERE id NOT IN (SELECT id FROM shared.companies);
```

---

## 5. 共享库清理计划

### 5.1 删除重复的共享库

```bash
# 删除重复的共享库
rm -rf /Users/xingzhai/TOPEMS/shared/lib

# 更新 Cargo.toml 中的依赖路径
# 将所有 shared/lib 路径更新为 lib
```

### 5.2 统一共享库结构

```
lib/
├── Cargo.toml              # 共享库配置
└── src/
    ├── lib.rs              # 导出模块
    ├── auth.rs             # 认证与授权
    ├── database.rs         # 数据库连接池
    ├── error.rs            # 错误处理
    ├── logging.rs          # 日志系统
    ├── response.rs         # API 响应封装
    ├── validation.rs       # 数据验证
    └── utils.rs            # 工具函数
```

---

## 6. 实施检查清单

| 步骤 | 状态 | 责任人 | 截止日期 | 备注 |
|------|------|--------|----------|------|
| 创建 shared schema | ✅ | DBA | T+1 | |
| 创建共享表结构 | ✅ | DBA | T+1 | |
| 数据迁移（companies/departments/employees） | ✅ | DBA | T+2 | |
| 更新 HRM 服务使用 shared schema | ✅ | Dev | T+2 | 已修复shared.companies访问问题 |
| 更新 ERP 服务使用 shared schema | ✅ | Dev | T+3 | |
| 更新外键约束指向 shared schema | ✅ | DBA | T+4 | 已更新hrm和erp的外键 |
| 删除旧的重复表（companies/departments/employees） | ✅ | DBA | T+4 | hrm/erp表已删除 |
| 删除重复共享库 | ✅ | Dev | T+4 | |
| 更新其他服务配置 | ✅ | Dev | T+5 | CRM、MES、WMS已更新 |
| 回归测试 | ✅ | QA | T+5 | 公司(7条)、部门(5条)、员工(5条) - API验证通过 |

---

## 8. 迁移完成记录 (2026-06-10)

### 8.1 数据迁移结果

| 表 | 数据量 | 状态 |
|----|--------|------|
| shared.companies | 7条 | ✅ 迁移完成 |
| shared.departments | 5条 | ✅ 迁移完成 |
| shared.employees | 5条 | ✅ 迁移完成 |

### 8.2 服务配置更新

所有服务已配置使用 shared schema：

| 服务 | 端口 | Search Path | 状态 |
|------|------|-------------|------|
| IAM | 8000 | iam, shared, public | ✅ 运行正常 |
| HRM | 8011 | shared, hrm, public | ✅ 运行正常 |
| ERP | 8010 | erp, shared, public | ✅ 运行正常 |
| CRM | 8012 | crm, shared, public | ✅ 运行正常 |
| MES | 8030 | mes, shared, public | ✅ 运行正常 |
| WMS | 8042 | wms, shared, public | ✅ 运行正常 |
| LIMS | 8022 | lims, shared, public | ✅ 运行正常 |
| SCM | 8040 | scm, shared, public | ✅ 运行正常 |
| SRM | 8041 | srm, shared, public | ✅ 运行正常 |
| PM | 8024 | pm, shared, public | ✅ 运行正常 |
| BI | 8052 | bi, shared, public | ✅ 运行正常 |

### 8.3 外键约束更新

已更新以下外键约束指向 shared schema：

**HRM Schema:**
- attendance_records.company_id → shared.companies
- attendance_records.department_id → shared.departments
- contracts.employee_id → shared.employees
- leave_records.employee_id → shared.employees
- payroll_records.employee_id → shared.employees
- performance_records.employee_id → shared.employees
- recruitment_applications.department_id → shared.departments
- salary_adjustments.employee_id → shared.employees
- training_participants.employee_id → shared.employees

**ERP Schema:**
- assets.company_id → shared.companies

### 8.4 旧表清理

以下旧表已删除：
- hrm.companies (已删除)
- hrm.departments (已删除)
- hrm.employees (已删除)
- erp.companies (已删除)
- erp.departments (已删除)
- erp.employees (已删除)

### 8.5 代码修复记录

1. **Employee模型日期字段修复**
   - 问题：birth_date和hire_date使用DateTime<Utc>类型，但数据库是DATE类型
   - 修复：改为NaiveDate类型

2. **SQL查询更新**
   - 所有HRM API查询已更新使用shared schema表
   - 添加表别名避免字段歧义

3. **前端错误处理**
   - 添加422错误处理case

---

## 7. 后续维护规则

### 7.1 Schema 使用规则

1. **禁止跨 Schema 查询**：各服务只查询自己的 schema 和 shared schema
2. **禁止重复定义**：核心实体（公司、部门、员工、用户）只在 shared 中定义
3. **审计日志统一**：所有服务的审计日志写入 `shared.audit_logs`

### 7.2 连接池配置规则

1. **服务必须设置 SERVICE_NAME 环境变量**
2. **使用共享库的 create_database_pool 函数**
3. **禁止直接使用 PgPoolOptions 创建连接池**

### 7.3 代码审查检查项

- [ ] 是否正确设置了 SERVICE_NAME
- [ ] 是否使用了共享库的数据库连接池
- [ ] 是否查询了正确的 schema
- [ ] 是否有重复的实体定义