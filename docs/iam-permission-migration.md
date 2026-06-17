# IAM 权限格式迁移文档

**日期**: 2026-06-17
**版本**: v3.0.0

---

## 1. 概述

本次迁移将 IAM 权限系统从旧的命名格式统一为新的 `模块:资源_操作` 格式，解决了前后端权限命名不一致的问题。

### 1.1 问题背景

| 问题 | 描述 |
|------|------|
| 前后端格式不一致 | 后端使用 `users.read`，前端期望 `iam:admin` |
| 权限映射缺失 | `permissionNameToId` 映射表缺少 IAM 模块权限 |
| 权限检查复杂 | `hasPermission` 需要同时检查三种格式 |

### 1.2 解决方案

统一前后端权限格式为 `模块:资源_操作`，简化权限检查逻辑。

---

## 2. 权限格式变更

### 2.1 旧格式 vs 新格式

| 旧格式 | 新格式 |
|--------|--------|
| `users.read` | `iam:users_read` |
| `users.create` | `iam:users_create` |
| `users.update` | `iam:users_update` |
| `users.delete` | `iam:users_delete` |
| `roles.read` | `iam:roles_read` |
| `roles.create` | `iam:roles_create` |
| `roles.update` | `iam:roles_update` |
| `roles.delete` | `iam:roles_delete` |
| `system.settings` | `iam:system_settings` |
| `system.logs` | `iam:system_logs` |
| `system.monitor` | `iam:system_monitor` |
| `system.export` | `iam:system_export` |

### 2.2 完整权限列表

#### IAM 模块

| 权限代码 | 说明 | 类别 |
|----------|------|------|
| `iam:users_read` | 读取用户 | 用户管理 |
| `iam:users_create` | 创建用户 | 用户管理 |
| `iam:users_update` | 更新用户 | 用户管理 |
| `iam:users_delete` | 删除用户 | 用户管理 |
| `iam:roles_read` | 读取角色 | 角色管理 |
| `iam:roles_create` | 创建角色 | 角色管理 |
| `iam:roles_update` | 更新角色 | 角色管理 |
| `iam:roles_delete` | 删除角色 | 角色管理 |
| `iam:permissions_read` | 读取权限 | 权限管理 |
| `iam:permissions_update` | 更新权限 | 权限管理 |
| `iam:audit_read` | 读取审计日志 | 系统管理 |
| `iam:system_read` | 系统设置读取 | 系统管理 |
| `iam:system_update` | 系统设置更新 | 系统管理 |
| `iam:dictionaries_read` | 字典读取 | 系统管理 |
| `iam:dictionaries_update` | 字典更新 | 系统管理 |
| `iam:plugins_read` | 插件读取 | 系统管理 |
| `iam:plugins_update` | 插件更新 | 系统管理 |

#### 其他模块

| 权限代码 | 说明 | 类别 |
|----------|------|------|
| `pm:projects_read` | 读取项目 | 项目管理 |
| `pm:projects_create` | 创建项目 | 项目管理 |
| `pm:projects_update` | 更新项目 | 项目管理 |
| `pm:projects_delete` | 删除项目 | 项目管理 |
| `doc:documents_read` | 读取文档 | 文档管理 |
| `doc:documents_create` | 创建文档 | 文档管理 |
| `doc:documents_update` | 更新文档 | 文档管理 |
| `doc:documents_delete` | 删除文档 | 文档管理 |
| `workflow:workflows_read` | 读取工作流 | 工作流管理 |
| `workflow:workflows_create` | 创建工作流 | 工作流管理 |
| `workflow:workflows_update` | 更新工作流 | 工作流管理 |
| `workflow:workflows_delete` | 删除工作流 | 工作流管理 |

---

## 3. 代码变更

### 3.1 后端变更

| 文件 | 变更内容 |
|------|----------|
| `lib/src/auth.rs` | 权限定义使用新格式 |
| `svc/unified-core/src/modules/iam/auth.rs` | 登录返回新格式权限 |

### 3.2 前端变更

| 文件 | 变更内容 |
|------|----------|
| `apps/web/src/hooks/useAuth.tsx` | 移除 `permissionNameToId`，简化 `hasPermission` |
| `apps/web/src/routes/iam.ts` | 路由权限使用细粒度权限 |
| `apps/web/src/routes/utils.ts` | 增加 `action: "update"` 类型 |

---

## 4. 数据库迁移

### 4.1 迁移脚本

执行迁移脚本：
```bash
psql -d your_database -f migrations/011_migrate_iam_permissions_format.sql
```

### 4.2 迁移内容

1. 更新 `iam.permissions` 表中的权限代码
2. 更新 `iam.roles` 表中的 `permissions` JSONB 字段
3. 验证迁移结果

### 4.3 回滚

如需回滚，执行迁移脚本末尾的回滚 SQL。

---

## 5. 验证步骤

### 5.1 后端验证

登录后检查返回的 `permissions` 数组：

```json
{
  "permissions": [
    "iam:users_read",
    "iam:roles_read",
    "iam:permissions_read"
  ]
}
```

### 5.2 前端验证

1. 访问 IAM 各页面，确认权限检查正常
2. 检查浏览器控制台无权限错误

### 5.3 数据库验证

```sql
-- 查看权限表
SELECT code, name FROM iam.permissions ORDER BY code;

-- 查看角色权限
SELECT code, name, permissions FROM iam.roles;
```

---

## 6. 常见问题

### Q1: 迁移后用户无法登录 IAM 页面？

**原因**: 用户的角色权限列表未更新。

**解决**: 执行迁移脚本，或手动为角色分配新格式的权限。

### Q2: 超级管理员是否受影响？

**答案**: 不受影响。超级用户 (`is_superuser: true`) 拥有特殊权限 `*`，绕过所有权限检查。

### Q3: 如何为新角色分配权限？

```json
{
  "permissions": [
    "iam:users_read",
    "iam:roles_read"
  ]
}
```

---

## 7. 相关文档

- [API_AUTH.md](API_AUTH.md) - 认证和授权 API
- [数据库迁移指南](database-migration.md) - 数据库迁移说明
