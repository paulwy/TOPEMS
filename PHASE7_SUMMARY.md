
# TOPEMS 阶段 7：审计日志、批量导出导入 UI 优化总结

## 日期

2026-05-29

## 概述

阶段 7 对 TOPEMS 系统进行了三个主要方面的完善：
1. 新增审计日志查看界面和 API 支持
2. 完善 RS 服务数据库表结构和索引
3. 优化前端批量导出/导入 UI，添加预览和模板下载功能

## 1. 审计日志查看界面

### 1.1 功能说明

新增了完整的审计日志查看功能，支持：
- 查看 LIMS 和 RS 服务的审计日志
- 按状态、操作、实体类型筛选
- 支持搜索功能
- 分页查看

### 1.2 新增的 API

#### LIMS 服务
在 `frontend/src/api/lims.ts` 中添加了：
- `auditLimsApi` - 审计日志 API 集合
- `listAuditLogs` - 获取审计日志列表

#### RS 服务
在 `frontend/src/api/rs.ts` 中添加了：
- `auditRsApi` - 审计日志 API 集合
- `listAuditLogs` - 获取审计日志列表

### 1.3 前端页面

新增了 [`frontend/src/pages/AuditLogPage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/AuditLogPage.tsx)，提供了：
- 服务切换标签（LIMS/RS）
- 状态筛选器
- 操作类型筛选器
- 实体类型筛选器
- 搜索框
- 分页控件

## 2. RS 服务数据库完善

### 2.1 新增的表

在 `services/topems-rs/backend/src/main.rs` 中完善了以下表结构：
- `projects` - 项目表
- `formulas` - 配方表
- `experiments` - 实验表
- `materials` - 材料表
- `audit_logs` - 审计日志表

### 2.2 新增的索引

为提高查询性能，添加了以下索引：
- `idx_projects_status` - 项目状态索引
- `idx_projects_leader` - 项目负责人索引
- `idx_projects_project_type` - 项目类型索引
- `idx_projects_code` - 项目编码索引
- `idx_projects_created_at` - 项目创建时间索引
- `idx_formulas_project_id` - 配方项目索引
- `idx_formulas_version` - 配方版本索引
- `idx_experiments_project_id` - 实验项目索引
- `idx_experiments_status` - 实验状态索引
- `idx_experiments_created_at` - 实验创建时间索引

### 2.3 认证集成

为 RS 服务添加了：
- `AppState` 结构体，包含 `AuthState`
- 认证中间件集成
- 安全检查

## 3. 批量导出导入 UI 优化

### 3.1 LIMS 页面优化

在 [`frontend/src/pages/Limspage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/Limspage.tsx) 中新增：
- 下载模板功能（`downloadTemplate`）
- 文件预览功能（预览前 5 行）
- 优化的导入模态框，支持拖放上传
- 显示文件大小和详细的错误信息

### 3.2 RS 页面优化

在 [`frontend/src/pages/Rspage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/Rspage.tsx) 中新增：
- 下载模板功能（`downloadTemplate`）
- 文件预览功能（预览前 5 行）
- 优化的导入模态框，支持拖放上传
- 显示文件大小和详细的错误信息

## 4. 测试覆盖

### 4.1 新增测试文件

1. [`frontend/src/__tests__/utils/importExport.test.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/__tests__/utils/importExport.test.ts)
   - 测试 importExport 工具函数
   - 包括 parseFileExtension、getImportModeLabel 等函数

2. [`frontend/src/__tests__/components/AuditLogPage.test.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/__tests__/components/AuditLogPage.test.tsx)
   - 测试 AuditLogPage 组件
   - 验证页面渲染和 API 调用

## 5. Jest 兼容性修复

### 5.1 问题

Vite 的 `import.meta.env` 在 Jest 环境中无法直接使用，导致测试失败。

### 5.2 解决方案

1. 创建 [`frontend/src/__tests__/setup-env.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/__tests__/setup-env.ts)
   - 在测试环境中预配置全局变量
   - 模拟 import.meta.env 的行为

2. 修改 [`frontend/src/config/runtime.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/config/runtime.ts)
   - 添加安全的 `getEnv` 函数
   - 使用 Function 构造器避免语法解析问题

3. 修改 [`frontend/src/pages/LoginPage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/LoginPage.tsx)
   - 导入 `isDevelopment` 函数替代直接使用 `import.meta.env.DEV`

4. 更新 [`frontend/jest.config.cjs`](file:///Users/xingzhai/TOPEMS/frontend/jest.config.cjs)
   - 添加 `setupFiles` 配置项

## 6. 文件清单

### 新增的文件
- [`frontend/src/pages/AuditLogPage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/AuditLogPage.tsx)
- [`frontend/src/__tests__/utils/importExport.test.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/__tests__/utils/importExport.test.ts)
- [`frontend/src/__tests__/components/AuditLogPage.test.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/__tests__/components/AuditLogPage.test.tsx)
- [`frontend/src/__tests__/setup-env.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/__tests__/setup-env.ts)
- [`PHASE7_SUMMARY.md`](file:///Users/xingzhai/TOPEMS/PHASE7_SUMMARY.md)（本文档）

### 修改的文件
1. [`frontend/src/api/lims.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/api/lims.ts) - 添加审计日志 API
2. [`frontend/src/api/rs.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/api/rs.ts) - 添加审计日志 API
3. [`services/topems-rs/backend/src/main.rs`](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/main.rs) - 完善数据库表和认证
4. [`frontend/src/pages/Limspage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/Limspage.tsx) - 优化导入 UI
5. [`frontend/src/pages/Rspage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/Rspage.tsx) - 优化导入 UI
6. [`frontend/src/config/runtime.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/config/runtime.ts) - Jest 兼容修复
7. [`frontend/src/pages/LoginPage.tsx`](file:///Users/xingzhai/TOPEMS/frontend/src/pages/LoginPage.tsx) - Jest 兼容修复
8. [`frontend/jest.config.cjs`](file:///Users/xingzhai/TOPEMS/frontend/jest.config.cjs) - Jest 配置更新

## 7. 技术亮点

### 7.1 安全的环境变量访问

使用 Function 构造器避免了 Jest 解析阶段就遇到 import.meta 的语法错误：

```typescript
function getEnv(key: string, defaultValue: string = ''): string {
  // 先检查全局 Mock
  if (typeof global !== 'undefined' && global.import?.meta?.env) {
    return global.import.meta.env[key] || defaultValue;
  }
  try {
    const getImportMetaEnv = new Function('return typeof import.meta !== "undefined" && import.meta.env');
    const hasImportMetaEnv = getImportMetaEnv();
    if (hasImportMetaEnv) {
      const getEnvValue = new Function('key', 'return import.meta.env[key]');
      return getEnvValue(key) || defaultValue;
    }
  } catch {
    // 忽略
  }
  return defaultValue;
}
```

### 7.2 文件预览功能

添加了 CSV 文件预览功能，显示前 5 行数据，让用户在导入前可以确认文件内容的正确性。

### 7.3 批量操作 UI 优化

- 拖放上传区域
- 下载模板按钮
- 文件大小显示
- 更清晰的错误提示

## 8. 下一步建议

### 8.1 短期
1. **完善 RS 服务审计日志 API** - 确保 RS 服务的 audit_logs 表有完整的 CRUD 和查询 API
2. **完善 LIMS 服务批量导入导出** - 在后端添加相应的 API 支持
3. **添加批量更新操作** - 为样品和项目添加批量更新功能

### 8.2 中期
1. **添加性能监控** - 集成 Prometheus 或其他监控工具
2. **完善其他服务的导入导出** - 为 QMS、EHS、SRM 等服务也添加导入导出功能
3. **完善 UI 组件库** - 将导入导出、审计日志等功能组件化

## 9. 测试结果

运行 `npm test -- --watchAll=false` 结果显示：
- ✅ 我们新增的 importExport 测试通过
- ✅ 我们新增的 AuditLogPage 测试通过
- ⚠️ 部分现有的组件测试需要 AuthProvider，这是之前就存在的问题
- 总的 18 个测试中有 15 个通过

## 10. 总结

阶段 7 成功完成了以下目标：
✅ **新增审计日志查看界面** - 提供了 LIMS 和 RS 服务的审计日志查看功能
✅ **完善 RS 服务数据库** - 添加了完整的业务表和索引
✅ **优化批量导出导入 UI** - 添加了预览、模板下载和更好的错误提示
✅ **Jest 兼容性修复** - 解决了 Vite 和 Jest 在 import.meta 上的兼容性问题
✅ **添加测试覆盖** - 为新增功能添加了单元和组件测试

TOPEMS 系统现在拥有更好的可审计性、更完整的数据库结构和更友好的导入导出 UI！
