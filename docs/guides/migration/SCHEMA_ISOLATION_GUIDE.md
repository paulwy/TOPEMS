# TOPEMS Schema 隔离规范与架构指南

> 文档版本: v1.0
> 创建日期: 2026-06-08
> 状态: 已实施

---

## 1. 背景与目标

### 1.1 为什么需要 Schema 隔离
在 TOPEMS 微服务架构中，虽然目前使用单数据库架构，但通过 Schema 隔离实现数据边界：

- ✅ **明确数据所有权**：每个模块只负责自己的 Schema
- ✅ **避免直接跨模块查询**：通过服务调用访问其他模块数据
- ✅ **未来可扩展**：为未来的物理数据库分离做准备
- ✅ **降低耦合度**：模块间只通过 API 交互

### 1.2 目标
- 确保每个模块只访问自己的 Schema
- 禁止直接跨 Schema JOIN 查询
- 提供明确的架构指导
- 建立代码审查标准

---

## 2. Schema 分配表

| 模块 | 端口 | 负责的 Schema | 说明 |
|------|------|--------------|------|
| **HRM** | 8011 | `hrm.*` | 人力资源管理（员工、部门、公司） |
| **ERP** | 8010 | `erp.*` | 企业资源管理（资产、财务、办公） |
| **PM** | 8002 | `pm.*` | 项目管理（项目、任务、里程碑） |
| **CRM** | 8012 | `crm.*` | 客户关系管理（客户、联系人、商机） |
| **SCM** | 8040 | `scm.*` | 供应链管理（供应商、采购） |
| **IAM** | 8000 | `iam.*` | 身份认证与权限管理 |
| **DOC** | 8001 | `doc.*` | 文档管理 |
| **其他模块** | 各自端口 | 各自 Schema | 遵循相同规范 |

---

## 3. 严格规则

### 3.1 绝对禁止的操作

#### ❌ 禁止 1：直接跨 Schema 查询
```sql
-- 错误示例
SELECT * FROM hrm.employees e 
JOIN erp.assets a ON e.id = a.employee_id;

-- 正确做法：通过 API 调用
-- 1. 调用 HrmServiceClient.get_employee(id) 获取员工数据
-- 2. 调用 AssetService 进行相关操作
```

#### ❌ 禁止 2：在其他模块的代码中导入其他模块的模型
```rust
// 错误示例
use topems_hrm::models::Employee; // 在 ERP 模块中

// 正确做法
// 1. 使用服务客户端
// 2. 使用 shared 库中定义的共享类型（如果有）
use topems_shared::service_client::Employee;
```

#### ❌ 禁止 3：在 SQL 中硬编码其他模块的表名
```sql
-- 错误示例
SELECT * FROM hrm.employees;

-- 正确做法
-- 永远只查询自己模块的表
SELECT * FROM erp.assets;
```

### 3.2 必须遵守的规范

#### ✅ 规范 1：通过服务客户端访问其他模块数据
```rust
use topems_shared::service_client::{create_hrm_client, Employee};

// 在 ERP 模块中
async fn get_employee_data(employee_id: Uuid) -> Result<Employee> {
    let hrm_client = create_hrm_client()?;
    // 通过 API 调用，不是直接查数据库
    let employee = hrm_client.get_employee(employee_id).await?;
    Ok(employee)
}
```

#### ✅ 规范 2：每个模块只操作自己的表
```rust
// ERP 模块的 SQL
SELECT * FROM erp.assets;
SELECT * FROM erp.financial_records;
SELECT * FROM erp.office_supplies;

// HRM 模块的 SQL
SELECT * FROM hrm.employees;
SELECT * FROM hrm.departments;
SELECT * FROM hrm.companies;
```

#### ✅ 规范 3：使用数据库连接池隔离
确保各模块的数据库连接配置明确定义各自的默认 Schema（如果有）。

---

## 4. 服务客户端使用指南

### 4.1 如何在模块间共享数据

#### 场景 1：ERP 需要员工信息
```rust
// 在 ERP 模块中
use topems_shared::service_client::{create_hrm_client, Employee};

async fn assign_asset_to_employee(asset_id: Uuid, employee_id: Uuid) -> Result<()> {
    // 1. 验证员工是否存在（通过 HRM 客户端）
    let hrm_client = create_hrm_client()?;
    let employee = hrm_client.get_employee(employee_id).await?;
    
    // 2. 在 ERP 表中记录
    sqlx::query("
        UPDATE erp.assets 
        SET employee_id = $1 
        WHERE id = $2
    ")
    .bind(employee_id)
    .bind(asset_id)
    .execute(pool)
    .await?;
    
    Ok(())
}
```

#### 场景 2：PM 需要员工分配信息
```rust
// 在 PM 模块中
use topems_shared::service_client::{create_hrm_client, Employee};

async fn get_project_team_members(department_id: Uuid) -> Result<Vec<Employee>> {
    let hrm_client = create_hrm_client()?;
    // 获取该部门的所有员工
    // 如果需要更复杂的查询，可以考虑在 HRM 中添加专门的 API
    let all_employees = hrm_client.list_employees().await?;
    
    // 在 PM 中过滤（或让 HRM 提供更合适的 API）
    let team_members = all_employees
        .into_iter()
        .filter(|e| e.department_id == Some(department_id))
        .collect();
    
    Ok(team_members)
}
```

---

## 5. 数据同步策略

### 5.1 什么时候需要数据同步？

在某些场景下，可能需要跨模块数据引用。在这种情况下：

#### 策略 A：ID 引用（推荐）
```sql
-- ERP 表只引用员工 ID
CREATE TABLE erp.assets (
    id UUID PRIMARY KEY,
    name TEXT,
    employee_id UUID, -- 只存储 ID
    -- 不存储姓名、部门等重复信息
    created_at TIMESTAMPTZ
);
```

需要显示时，通过服务客户端获取完整员工信息。

#### 策略 B：事件驱动同步（高级）
通过事件机制实现数据最终一致性：

1. HRM 发布 `hrm.employee.created` 事件
2. ERP 订阅事件，在自己的表中存储必要的冗余信息
3. HRM 发布 `hrm.employee.updated` 事件
4. ERP 同步更新

---

## 6. 代码审查清单

在进行代码审查时，请检查以下项目：

- [ ] SQL 语句中没有直接查询其他模块的表
- [ ] 没有跨模块的 JOIN 操作
- [ ] 使用服务客户端访问其他模块数据
- [ ] 数据库模型只定义了自己模块的表
- [ ] 导入语句中没有直接导入其他业务模块的内部类型
- [ ] 遵循了架构改进计划

---

## 7. 示例：架构正确的代码

### 7.1 ERP 模块（正确示例）

```rust
// services/topems-erp/backend/src/api/asset.rs

use axum::extract::State;
use axum::Json;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use topems_shared::service_client::{create_hrm_client};
use crate::models::asset::{Asset, CreateAssetRequest};
use crate::api::ApiState;

async fn create_asset(
    State(state): State<ApiState>,
    Json(req): Json<CreateAssetRequest>,
) -> Json<ApiResponse<Asset>> {
    // 1. 通过 HRM 客户端验证员工存在（不直接查 hrm.employees）
    if let Some(employee_id) = req.employee_id {
        let hrm_client = create_hrm_client()?;
        // 这会抛出错误如果员工不存在
        let _employee = hrm_client.get_employee(employee_id).await?;
    }
    
    // 2. 在自己的表中插入（只操作 erp.assets）
    let asset = sqlx::query_as::<_, Asset>(
        "INSERT INTO erp.assets (name, employee_id) VALUES ($1, $2) RETURNING *"
    )
    .bind(&req.name)
    .bind(req.employee_id)
    .fetch_one(&state.pool)
    .await?;
    
    Json(ApiResponse::success(asset, "资产创建成功"))
}
```

---

## 8. 演进路径

### 阶段一：当前（已实现）
- 单数据库，多 Schema
- 通过服务客户端实现模块间通信
- 禁止直接跨 Schema 查询

### 阶段二：中期（可选）
- 引入事件驱动架构
- 实现数据最终一致性

### 阶段三：长期（可选）
- 根据业务增长评估物理数据库分离
- 每个模块独立数据库

---

## 9. 总结

Schema 隔离不是一个技术障碍，而是一个架构规范。遵守以下原则：

1. **单一职责**：每个模块只负责自己的数据
2. **通过 API**：永远通过服务调用访问其他模块
3. **ID 引用**：需要关联时只存储 ID
4. **文档先行**：任何跨模块交互都应有明确文档

---

**此规范将持续更新，确保架构清晰一致！**