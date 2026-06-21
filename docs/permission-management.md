# 权限管理规范

> **版本**: v2.0  
> **日期**: 2026-06-21  
> **状态**: 现行规范  
> **适用范围**: TOPEMS 统一权限与导航系统

---

## 一、概述

TOPEMS 采用**五层权限模型**，支持 SaaS 多租户和 On-Premise 私有化两种部署模式。

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **模块级权限** | 权限命名规范：`{module}:{action}` |
| **层级继承** | 高级权限自动包含低级权限 |
| **基础设施联动** | Doc、File、Notification 等与 IAM 联动 |
| **数据隔离** | 通过租户、公司、部门实现数据过滤 |
| **部署模式适配** | SaaS/On-Premise 灵活切换 |

### 1.2 权限层级

```
admin > delete > write > read
  4       3       2       1
```

**继承规则**：高级权限自动包含低级权限。

---

## 二、权限管理层级架构

### 2.1 五层权限模型

```
┌─────────────────────────────────────────────────────────────────┐
│                     L1: 租户层 (Tenant)                         │
│  租户角色: Owner / Admin / Member / Guest                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     L2: 系统层 (System/IAM)                     │
│  模块权限: hrm:read, pm:write, crm:admin...                    │
└─────────────────────────────────────────────────────────────────┘
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ L3: 公司层    │     │ L4: 项目层    │     │ L5: 数据层    │
│  Company      │     │  Project      │     │  Data        │
└───────────────┘     └───────────────┘     └───────────────┘
```

### 2.2 层级职责

| 层级 | 控制对象 | 权限类型 | 实现方式 |
|------|---------|---------|---------|
| **L1 租户** | 租户访问 | 租户角色 | TenantRole + tenant_id |
| **L2 系统** | 模块访问 | 模块权限 | `{module}:{action}` |
| **L3 公司** | 公司管理 | 管理角色 | company_admin 标识 |
| **L4 项目** | 项目操作 | 项目角色 | ProjectRole 枚举 |
| **L5 数据** | 数据范围 | 数据过滤 | department_id 过滤 |

---

## 三、部署模式配置

### 3.1 模式对比

| 功能特性 | SaaS 模式 | On-Premise 模式 |
|---------|----------|----------------|
| **多租户** | ✅ 启用 | ❌ 禁用 |
| **租户隔离** | ✅ 启用 | ❌ 跳过 |
| **配额限制** | ✅ 启用 | ❌ 无限制 |
| **计费功能** | ✅ 启用 | ❌ 禁用 |
| **租户管理** | ✅ 显示 | ❌ 隐藏 |

### 3.2 环境变量配置

```bash
# .env

# 部署模式
DEPLOYMENT_MODE=on-premise

# 多租户开关
MULTI_TENANT_ENABLED=false

# 默认租户ID
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001

# 功能开关
QUOTA_ENABLED=false
BILLING_ENABLED=false
TENANT_MANAGEMENT=false
```

---

## 四、模块分类

### 4.1 核心模块

| 模块 | 标识 | 说明 |
|------|------|------|
| 身份管理 | `iam` | 用户、角色、权限管理 |

### 4.2 业务模块

| 模块 | 标识 | 说明 |
|------|------|------|
| 人力资源 | `hrm` | 员工、公司、部门管理 |
| 企业资源 | `erp` | 财务、库存、销售管理 |
| 项目管理 | `pm` | 项目、任务、时间线 |
| 研发管理 | `rs` | 研发项目、文档、测试 |
| 供应链 | `scm` | 供应商、采购、仓储 |
| 客户关系 | `crm` | 客户、商机、活动 |
| AI助手 | `ai` | 智能对话、数据分析 |
| 地理信息 | `gis` | 地图、图层、空间分析 |
| 质量管理 | `qms` | 质量管理与安全 |
| 环境健康安全 | `ehs` | EHS 管理系统 |
| 制造执行 | `mes` | MES 生产执行 |
| 仓储管理 | `wms` | WMS 仓储管理 |

### 4.3 特殊模块

| 模块 | 标识 | 特殊操作 |
|------|------|---------|
| 工作流 | `workflow` | 支持 `approve` 审批操作 |

### 4.4 基础设施模块（与 IAM 联动）

| 模块 | 标识 | 联动规则 |
|------|------|---------|
| 文档管理 | `doc` | `iam:read` → `doc:read` |
| 文件服务 | `file` | `iam:write` → `file:write` |
| 通知服务 | `notification` | `iam:admin` → 所有基础设施权限 |
| 即时通讯 | `im` | 同上 |
| 系统集成 | `integration` | 同上 |

---

## 五、系统设置模块权限

### 5.1 系统设置分类

```
系统管理 (iam:admin)
├── 用户与权限
│   ├── 用户管理        → /iam/users          → iam:read
│   ├── 角色管理        → /iam/roles          → iam:read
│   ├── 权限管理        → /iam/permissions    → iam:admin
│   ├── 部门管理        → /hrm/departments    → hrm:write
│   └── 公司架构        → /hrm/companies      → hrm:admin
│
├── 系统配置
│   ├── 基础配置        → /settings/basic     → iam:admin
│   ├── 邮件设置        → /settings/mail      → iam:admin
│   ├── 短信设置        → /settings/sms       → iam:admin
│   └── 日志设置        → /settings/log       → iam:admin
│
├── 审计与监控
│   ├── 审计日志        → /audit              → iam:read
│   ├── 系统监控        → /monitor            → iam:read
│   └── 性能监控        → /performance        → iam:read
│
└── 插件与扩展
    └── 插件管理        → /plugins            → iam:admin
```

### 5.2 系统设置权限矩阵

| 功能模块 | 页面路径 | 权限要求 | 操作权限 |
|---------|---------|---------|---------|
| **用户管理** | /iam/users | iam:read | 查看/创建/编辑/删除用户 |
| **角色管理** | /iam/roles | iam:read | 查看/创建/编辑/删除角色 |
| **权限管理** | /iam/permissions | iam:admin | 配置权限 |
| **部门管理** | /hrm/departments | hrm:write | 管理部门 |
| **公司架构** | /hrm/companies | hrm:admin | 管理公司 |
| **系统设置** | /settings/* | iam:admin | 修改系统配置 |
| **审计日志** | /audit | iam:read | 查看审计日志 |
| **系统监控** | /monitor | iam:read | 查看监控 |
| **插件管理** | /plugins | iam:admin | 管理插件 |

---

## 六、权限完整列表

### 6.1 核心模块权限

```
iam:read, iam:write, iam:delete, iam:admin
```

### 6.2 业务模块权限

```
hrm:read, hrm:write, hrm:delete, hrm:admin
erp:read, erp:write, erp:delete, erp:admin
pm:read, pm:write, pm:delete, pm:admin
rs:read, rs:write, rs:delete, rs:admin
scm:read, scm:write, scm:delete, scm:admin
crm:read, crm:write, crm:delete, crm:admin
ai:read, ai:write, ai:delete, ai:admin
gis:read, gis:write, gis:delete, gis:admin
qms:read, qms:write, qms:delete, qms:admin
ehs:read, ehs:write, ehs:delete, ehs:admin
mes:read, mes:write, mes:delete, mes:admin
wms:read, wms:write, wms:delete, wms:admin
```

### 6.3 特殊模块权限

```
workflow:read, workflow:write, workflow:delete, workflow:approve, workflow:admin
```

### 6.4 基础设施模块权限（与 IAM 联动）

```
doc:read, doc:write, doc:delete, doc:admin
file:read, file:write, file:delete, file:admin
notification:read, notification:write, notification:delete, notification:admin
im:read, im:write, im:delete, im:admin
integration:read, integration:write, integration:delete, integration:admin
```

### 6.5 系统设置权限

```
system:settings      # 系统设置
system:monitor       # 系统监控
system:audit         # 审计日志
system:dictionary    # 字典管理
system:plugin        # 插件管理
system:migration     # 数据迁移
```

### 6.6 租户权限

```
tenant:manage, tenant:settings, tenant:users, tenant:billing
```

---

## 七、代码实现

### 7.1 后端权限检查

```rust
// 权限检查中间件
pub async fn check_permission(
    user: &User,
    required: &str,
    config: &DeploymentConfig,
) -> Result<(), AuthError> {
    // 超级管理员拥有所有权限
    if user.is_superuser {
        return Ok(());
    }

    // 解析权限
    let [module, action] = required.split(':').collect::<Vec<_>>()[..] else {
        return Err(AuthError::InvalidPermission);
    };

    // 基础设施模块与 IAM 联动
    if is_infrastructure_module(module) {
        let iam_permission = format!("iam:{}", action);
        if user.has_permission(&iam_permission) {
            return Ok(());
        }
    }

    // 标准权限检查
    if user.has_permission(required) {
        return Ok(());
    }

    Err(AuthError::PermissionDenied)
}
```

### 7.2 前端权限检查

```typescript
// usePermission.ts
export const usePermission = () => {
  const { permissions, isSuperuser } = useAuth();

  const checkPermission = (permission: string): boolean => {
    if (isSuperuser) return true;
    if (!permission) return true;

    // 检查精确权限
    if (permissions.includes(permission)) return true;

    // 检查模块级权限继承
    const [module, action] = permission.split(':');
    if (permissions.includes(`${module}:admin`)) return true;

    // 基础设施模块与 IAM 联动
    if (isInfrastructureModule(module)) {
      return permissions.includes(`iam:${action}`) ||
             permissions.includes('iam:admin');
    }

    return false;
  };

  return { checkPermission, isSuperuser };
};
```

---

## 八、相关文档

- [权限系统设计稿](./permission-system-design.md) - 详细设计文档
- [导航设计方案](./navigation-design.md) - 导航与权限关联
- [部署指南](./deployment/DEPLOYMENT_GUIDE.md) - 部署配置说明

---

**变更记录**：
| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-21 | v2.0 | 更新为五层权限模型，支持部署模式配置 |
