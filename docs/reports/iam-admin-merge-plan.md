# IAM / Admin 模块功能合并实施计划

> 版本: 1.0 | 日期: 2026-07-01
> 状态: 待审批

---

## 一、背景与目标

### 1.1 问题现状

当前系统中存在 **IAM（身份权限）和 Admin（系统管理）两个模块，功能高度重叠，导致：

1. **页面重复**：用户管理、角色管理、权限管理、数据字典、审计日志、系统设置、账号管理、银行账号等 8 类功能在两个模块中各有一套页面
2. **API 重复**：`api/iam/` 和 `api/admin/` 两套前端 API
3. **导航重复**：两套导航菜单，用户迷惑
4. **维护成本高**：功能重复开发、重复维护

### 1.2 合并目标

- 统一为 **单一系统管理模块，消除功能重复，统一用户体验，降低维护成本。

---

## 二、现状分析

### 2.1 模块定位

| 维度 | IAM 模块 | Admin 模块 |
|------|----------|-----------|
| **模块名** | 身份权限 | 系统管理 |
| **模块 code | `iam` | `admin` |
| **路径前缀** | `/iam/*` | `/admin/*` |
| **前端页面数** | 10 个 | 20 个 |
| **路由数** | 13 条 | 21 条 |
| **后端服务** | unified-core / iam | unified-core / tenant (+ iam |
| **API 前缀** | `/api/core/iam` | `/api/core/tenant` (+ `/api/core/iam` |

### 2.2 功能重叠分析

| 功能类别 | IAM 模块 | Admin 模块 | 重叠度 | 处理策略 |
|---------|----------|-----------|--------|---------|
| **用户管理 | ✅ IamUsersPage | ✅ UserManagementPage | 100% | 保留 IAM 版 |
| **角色管理** | ✅ IamRolesPage | ✅ RoleManagementPage | 100% | 保留 IAM 版 |
| **权限管理** | ✅ IamPermissionsPage | ✅ PermissionManagementPage | 100% | 保留 IAM 版 |
| **账号管理** | ✅ IamAccountsPage | ✅ AccountManagementPage | 100% | 保留 IAM 版 |
| **银行账号** | ✅ IamBankAccountsPage | ✅ BankAccountManagementPage | 100% | 保留 IAM 版 |
| **数据字典** | ✅ IamDictionariesPage | ✅ DictionaryManagementPage | 90% | 保留 IAM 版 |
| **审计日志** | ✅ IamAuditLogsPage | ✅ AuditLogPage | 90% | 保留 IAM 版 |
| **系统设置** | ✅ IamSystemSettingsPage | ✅ SystemSettingsPage | 80% | 保留 IAM 版 |
| **系统管理** | ❌ | ✅ SystemManagementPage | - | 保留 Admin 版 |
| **租户管理** | ❌ | ✅ Tenant* (4个页面) | - | 保留 Admin 版 |
| **插件管理** | ✅ PluginMarketplacePage | ✅ PluginManagementPage | 50% | 合并为一个 |
| **数据库结构** | ✅ DatabaseStructurePage | ✅ DatabaseStructurePage | 100% | 共用同一文件 |
| **数据迁移** | ✅ MigrationAdminPage | ✅ MigrationAdminPage | 100% | 共用同一文件 |
| **配置调试** | ✅ ConfigDebugPage | ✅ ConfigDebugPage | 100% | 共用同一文件 |
| **系统监控** | ❌ | ✅ MonitorPage | - | 保留 Admin 版 |
| **性能监控** | ❌ | ✅ PerformanceMonitorPage | - | 保留 Admin 版 |
| **公司结构** | ❌ | ✅ CompanyStructurePage | - | 迁移到 IAM |

### 2.3 共用页面（当前已共用）

以下页面两个模块都引用了同一个文件：
- `DatabaseStructurePage`
- `MigrationAdminPage`
- `ConfigDebugPage`

---

## 三、合并方案

### 3.1 合并策略

**统一为 **Admin（系统管理）** 模块为主模块，吸收 IAM 模块的功能。

**理由**：
1. Admin 模块功能更完整（包含租户管理、监控等）
2. Admin 模块更符合企业级系统的命名习惯
3. IAM 是 Admin 的子集

### 3.2 合并后模块结构

**模块名：**系统管理（admin）
- 模块 code: `admin`
- 路径前缀: `/admin/*`
- 图标: `Settings`
- 描述: 租户管理、用户权限、系统配置、监控运维

### 3.3 功能分组

| 分组 | 功能项 | 来源 |
|------|--------|------|
| **概览** | 仪表盘 | IAM |
| **租户管理** | 租户管理、租户详情、租户设置、租户计费 | Admin |
| **用户权限** | 用户管理、角色管理、权限管理、账号管理、银行账号、公司结构 | IAM + Admin |
| **系统配置** | 数据字典、系统管理、系统设置、插件管理 | IAM + Admin |
| **运维工具** | 数据库结构、数据迁移、配置调试 | 共用 |
| **监控审计** | 审计日志、系统监控、性能监控 | IAM + Admin |

---

## 四、详细实施步骤

### 阶段 0：准备工作
**目标：备份与规划**

- [ ] 创建 git 分支：`feature/merge-iam-admin`
- [ ] 确认后端 API 兼容性检查
- [ ] 准备数据迁移脚本

### 阶段 1：页面整合（前端页面迁移

**目标：将 IAM 页面迁移到 Admin，消除重复页面

#### 1.1 保留 Admin 独有页面（无需改动
- TenantManagementPage
- TenantDetailPage
- TenantSettingsPage
- TenantBillingPage
- SystemManagementPage
- MonitorPage
- PerformanceMonitorPage
- CompanyStructurePage
- PluginManagementPage

#### 1.2 将 IAM 页面重命名并移动到 admin/ 目录

| 原位置 | 新位置 | 说明 |
|--------|--------|------|
| iam/IamDashboardPage.tsx | admin/DashboardPage.tsx | 仪表盘 |
| iam/IamUsersPage.tsx | admin/UserManagementPage.tsx | 替换现有 Admin 版 |
| iam/IamRolesPage.tsx | admin/RoleManagementPage.tsx | 替换现有 Admin 版 |
| iam/IamPermissionsPage.tsx | admin/PermissionManagementPage.tsx | 替换现有 Admin 版 |
| iam/IamAccountsPage.tsx | admin/AccountManagementPage.tsx | 替换现有 Admin 版 |
| iam/IamBankAccountsPage.tsx | admin/BankAccountManagementPage.tsx | 替换现有 Admin 版 |
| iam/IamDictionariesPage.tsx | admin/DictionaryManagementPage.tsx | 替换现有 Admin 版 |
| iam/IamAuditLogsPage.tsx | admin/AuditLogPage.tsx | 替换现有 Admin 版 |
| iam/IamSystemSettingsPage.tsx | admin/SystemSettingsPage.tsx | 替换现有 Admin 版 |

#### 1.3 共用页面（无需移动，保持在 admin/）
- DatabaseStructurePage.tsx
- MigrationAdminPage.tsx
- ConfigDebugPage.tsx

#### 1.4 插件页面合并
- 保留 PluginManagementPage（Admin 版
- PluginMarketplacePage 移到 plugin 模块

### 阶段 2：路由整合

**目标：Admin 路由增加 IAM 功能，删除 IAM 模块路由

#### 2.1 更新 admin.ts 路由配置

新增/调整路由分组，增加从 IAM 迁移来的功能

| 路径 | 页面 | 权限 |
|------|------|------|
| /admin/dashboard | DashboardPage | admin:read |
| /admin/user | UserManagementPage | admin:user:read |
| /admin/role | RoleManagementPage | admin:role:read |
| /admin/permission | PermissionManagementPage | admin:permission:read |
| /admin/account | AccountManagementPage | admin:account:read |
| /admin/bank-account | BankAccountManagementPage | admin:bank:read |
| /admin/company-structure | CompanyStructurePage | admin:structure:read |
| /admin/dictionary | DictionaryManagementPage | admin:dictionary:read |
| /admin/audit-log | AuditLogPage | admin:audit:read |

#### 2.2 添加兼容性重定向
> ⚠️ 注意：`compatibility.tsx` 已在 V5.8 路径重构阶段删除。以下仅为历史记录，实际重定向已不再需要。

| 旧路径 | 新路径 |
|--------|--------|
| /iam/dashboard | /admin/dashboard |
| /iam/users | /admin/user |
| /iam/roles | /admin/role |
| /iam/permissions | /admin/permission |
| /iam/accounts | /admin/account |
| /iam/bank-accounts | /admin/bank-account |
| /iam/dictionaries | /admin/dictionary |
| /iam/audit-logs | /admin/audit-log |
| /iam/system | /admin/system |
| /iam/database | /admin/database |
| /iam/migration | /admin/migration |
| /iam/debug | /admin/config-debug |
| /iam/plugins | /admin/plugin |

#### 2.3 删除 IAM 路由
- 从 routes/v2/index.ts 中移除 iamModuleConfig
- 删除 routes/v2/iam.ts

### 阶段 3：导航整合

**目标：删除 IAM 导航配置，Admin 导航补全

#### 3.1 更新 admin.nav.ts
- 增加从 IAM 导航项（仪表盘、用户、角色、权限等
- 调整分组和排序

#### 3.2 删除 iam.nav.ts
- 从 NavigationRegistryV2 中移除 iam 模块注册
- 删除 modules/iam.nav.ts

### 阶段 4：API 整合

**目标：统一前端 API，后端 API 调用保持兼容

#### 4.1 前端 API 整合
- `api/iam/` 中的功能保留（后端 API 路径不变
- `api/admin/` 中的功能保留
- 页面调用的 API 路径保持不变（后端已经是同一个服务）

#### 4.2 模块映射更新
moduleMapping.ts 中：
- 移除 iam 条目
- admin 的 subModules 保持不变

### 阶段 5：权限标识更新

**目标：统一权限前缀为 admin:*

#### 5.1 权限前缀统一
- 页面路由中的 requiredPermissions 保持 iam:* → admin:*
- 导航中的 permission 保持 iam:* → admin:*

#### 5.2 后端兼容
- 后端保持两套权限标识兼容（iam:* 和 admin:* 都支持
- 逐步迁移到 admin:*

### 阶段 6：测试与验证

**目标：确保所有功能正常工作

#### 6.1 功能测试清单

| 测试项 | 预期结果 | 优先级 |
|--------|---------|--------|
| /admin/dashboard 可访问 | 页面正常显示 | P0 |
| /admin/user 用户管理功能正常 | 增删改查正常 | P0 |
| /admin/role 角色管理功能正常 | 增删改查正常 | P0 |
| /admin/permission 权限管理功能正常 | 增删改查正常 | P0 |
| /admin/tenant 租户管理功能正常 | 增删改查正常 | P0 |
| /admin/dictionary 数据字典功能正常 | 增删改查正常 | P1 |
| /admin/audit-log 审计日志功能正常 | 查询正常 | P1 |
| /admin/monitor 系统监控功能正常 | 数据显示正常 | P1 |
| /admin/performance 性能监控功能正常 | 数据显示正常 | P2 |
| 旧路径 /iam/users 重定向正常 | 跳转到 /admin/user | P0 |
| 旧路径 /iam/roles 重定向正常 | 跳转到 /admin/role | P0 |
| 权限控制正常 | 无权限用户无法访问 | P0 |

#### 6.2 回归测试
- 所有模块导航跳转正确
- 面包屑导航正确
- 移动端适配正常

### 阶段 7：数据迁移（后端）

**目标：确保数据无数据迁移（前后端 API 路径不变，无需数据迁移）

**说明**：
- 后端已经是同一个服务（unified-core）
- IAM 和 Admin 调用的是同一套数据库表
- 前端合并不涉及数据迁移

---

## 五、风险与回滚

### 5.1 风险清单

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| 权限标识变更导致用户无法访问 | 高 | 中 | 后端保持两套权限兼容 |
| 旧链接失效 | 中 | 高 | 添加重定向规则 |
| 页面功能缺失 | 高 | 低 | 充分测试，保留回滚能力 |
| 第三方集成依赖 IAM 路径 | 中 | 低 | 重定向 + 兼容处理 |

### 5.2 回滚方案

1. **快速回滚**：revert git 提交
2. **数据回滚**：无需数据迁移，无数据回滚
3. **回滚验证**：回滚后验证 /iam/* 路径可访问

---

## 六、实施计划

| 阶段 | 内容 | 预计工时 | 负责人 |
|------|------|---------|--------|
| 阶段 0 | 准备工作 | 0.5天 | 前端 |
| 阶段 1 | 页面整合 | 1天 | 前端 |
| 阶段 2 | 路由整合 | 0.5天 | 前端 |
| 阶段 3 | 导航整合 | 0.5天 | 前端 |
| 阶段 4 | API 整合 | 0.5天 | 前端 + 后端 |
| 阶段 5 | 权限标识更新 | 0.5天 | 前端 + 后端 |
| 阶段 6 | 测试与验证 | 1天 | 测试 |
| **总计** | | **4.5天** | |

---

## 七、待确认事项

1. **模块命名**：合并后模块名是"系统管理"还是"身份权限与系统管理"？
2. **模块 code**：保留 `admin` 还是改为 `system`？
3. **权限前缀**：统一为 `admin:*` 还是 `iam:*`？
4. **仪表盘**：IAM 的仪表盘和 Admin 的仪表盘是否需要合并？
5. **插件管理**：PluginManagementPage 和 PluginMarketplacePage 是什么关系？
6. **公司结构**：CompanyStructurePage 是否应该归到 HRM 而不是 Admin？
