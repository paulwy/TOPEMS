# Shared Schema 统一架构迁移指南

## 一、背景与目标

### 1.1 问题背景

在TOPEMS项目初期，各服务独立维护自己的公司、部门、员工等基础数据，导致：

- **数据冗余**：相同数据在多个schema中重复存储
- **数据不一致**：更新一处需要同步多处
- **维护困难**：修改表结构需要在多个服务中同步
- **权限复杂**：跨服务数据访问权限难以管理

### 1.2 迁移目标

建立统一的 `shared` schema，集中管理跨服务共享实体：

| 实体 | 说明 |
|------|------|
| companies | 公司/组织信息 |
| departments | 部门信息 |
| employees | 员工信息 |

---

## 二、迁移方案设计

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                            │
├────────────┬────────────┬────────────┬──────────────────────┤
│   shared   │    hrm     │    crm     │        ...           │
│            │            │            │                      │
│ companies  │ attendance │ customers  │   其他服务schema     │
│ departments│ contracts  │ leads      │                      │
│ employees  │ payroll    │ opportunities│                   │
└────────────┴────────────┴────────────┴──────────────────────┘
```

### 2.2 迁移策略

采用**三阶段迁移策略**：

| 阶段 | 名称 | 描述 |
|------|------|------|
| Phase 1 | 数据迁移 | 创建shared schema，迁移公司、部门、员工数据 |
| Phase 2 | 服务适配 | 更新所有服务配置，使用shared schema |
| Phase 3 | 清理优化 | 删除旧表，添加索引，验证功能 |

---

## 三、实施步骤

### 3.1 Phase 1 - 数据迁移

**步骤1：创建shared schema**

```sql
CREATE SCHEMA IF NOT EXISTS shared;
```

**步骤2：创建共享表结构**

```sql
-- companies表
CREATE TABLE shared.companies (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- departments表
CREATE TABLE shared.departments (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    company_id UUID,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    parent_id UUID,
    manager_id UUID,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- employees表
CREATE TABLE shared.employees (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    company_id UUID,
    department_id UUID,
    position_id UUID,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    birth_date DATE,
    hire_date DATE,
    position VARCHAR(100),
    job_title VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**步骤3：迁移数据**

```sql
-- 迁移公司数据
INSERT INTO shared.companies SELECT * FROM hrm.companies;
INSERT INTO shared.companies SELECT * FROM erp.companies 
WHERE id NOT IN (SELECT id FROM shared.companies);

-- 迁移部门数据
INSERT INTO shared.departments SELECT * FROM hrm.departments;

-- 迁移员工数据
INSERT INTO shared.employees SELECT * FROM hrm.employees;
```

### 3.2 Phase 2 - 服务适配

**步骤1：配置search_path**

在各服务启动时设置：

```rust
env::set_var("SEARCH_PATH", "hrm, shared, public");
```

**步骤2：更新数据库连接池**

```rust
use topems_shared::create_database_pool;

let db_config = DatabaseConfig {
    url: "postgres://topems:topems_secret@localhost:5432/topems".to_string(),
    max_connections: 10,
    min_connections: Some(2),
    connect_timeout: Some(30),
    idle_timeout: Some(60),
};

let pool = create_database_pool(&db_config).await?;
```

**步骤3：更新SQL查询**

将 `hrm.employees` 改为 `shared.employees`：

```rust
let result = sqlx::query_as::<_, Employee>(
    "SELECT * FROM shared.employees WHERE id = $1",
)
.bind(id)
.fetch_one(&state.db)
.await;
```

### 3.3 Phase 3 - 清理优化

**步骤1：更新外键约束**

```sql
-- 更新外键指向shared schema
ALTER TABLE hrm.contracts DROP CONSTRAINT contracts_employee_id_fkey;
ALTER TABLE hrm.contracts ADD CONSTRAINT contracts_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES shared.employees(id);
```

**步骤2：删除旧表**

```sql
DROP TABLE IF EXISTS hrm.companies;
DROP TABLE IF EXISTS hrm.departments;
DROP TABLE IF EXISTS hrm.employees;
DROP TABLE IF EXISTS erp.companies;
```

**步骤3：添加索引**

```sql
-- companies索引
CREATE INDEX idx_companies_organization_id ON shared.companies(organization_id);
CREATE INDEX idx_companies_name ON shared.companies(name);

-- departments索引
CREATE INDEX idx_departments_organization_id ON shared.departments(organization_id);
CREATE INDEX idx_departments_company_id ON shared.departments(company_id);
CREATE INDEX idx_departments_parent_id ON shared.departments(parent_id);

-- employees索引
CREATE INDEX idx_employees_organization_id ON shared.employees(organization_id);
CREATE INDEX idx_employees_company_id ON shared.employees(company_id);
CREATE INDEX idx_employees_department_id ON shared.employees(department_id);
CREATE UNIQUE INDEX idx_employees_employee_number ON shared.employees(employee_number);
```

---

## 四、遇到的问题与解决方案

### 4.1 类型不匹配问题

**问题**：Employee模型中birth_date和hire_date使用`DateTime<Utc>`类型，但数据库中是`DATE`类型，导致API返回500错误。

**解决方案**：将类型改为`NaiveDate`

```rust
use chrono::NaiveDate;

pub struct Employee {
    // ...
    pub birth_date: Option<NaiveDate>,
    pub hire_date: Option<NaiveDate>,
    // ...
}
```

### 4.2 外键约束阻止删除

**问题**：删除旧表时，外键约束阻止操作。

**解决方案**：先更新外键约束指向shared schema，再删除旧表

### 4.3 磁盘空间不足

**问题**：Rust编译需要大量磁盘空间，导致编译失败。

**解决方案**：定期清理编译缓存

```bash
cargo clean
```

### 4.4 服务配置不一致

**问题**：各服务使用不同的DatabaseConfig结构。

**解决方案**：使用共享库的`create_database_pool`函数统一配置

---

## 五、最佳实践

### 5.1 Schema设计原则

1. **核心实体统一管理**：公司、部门、员工、用户等核心实体放在shared schema
2. **业务实体独立存储**：各服务的业务数据放在各自schema中
3. **search_path配置**：按服务优先级配置search_path

### 5.2 连接池配置

- 使用共享库的`create_database_pool`函数
- 设置正确的`SERVICE_NAME`环境变量
- 通过`SEARCH_PATH`环境变量覆盖默认配置

### 5.3 代码规范

- SQL查询使用明确的schema前缀（如`shared.companies`）
- 添加表别名避免字段歧义
- 使用`sqlx::FromRow`派生宏时注意字段类型匹配

---

## 六、后续改进建议

### 6.1 自动化迁移脚本

编写自动迁移脚本，支持回滚功能

### 6.2 监控告警

添加schema变更监控和告警机制

### 6.3 CI/CD集成

在CI流程中添加schema验证步骤

### 6.4 文档自动化

根据数据库schema自动生成文档

### 6.5 性能优化

针对shared schema添加索引优化

---

## 七、总结

通过本次迁移，实现了：

| 指标 | 成果 |
|------|------|
| 数据统一 | 公司(7条)、部门(5条)、员工(5条)迁移到shared schema |
| 服务适配 | 11个服务已配置使用shared schema |
| 代码修复 | 类型不匹配问题已修复 |
| 测试验证 | 所有测试通过 |
| 文档更新 | 迁移指南已编写完成 |

---

**文档版本**: v1.0  
**创建日期**: 2026-06-10  
**作者**: TOPEMS Team  
**适用范围**: TOPEMS微服务架构