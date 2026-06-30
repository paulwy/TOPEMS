# 架构重构与 UI 优化 - 变更清单

> 本次重构覆盖架构、UI、导航、适配四个维度，按优先级完成 P0/P1/P2 级别的全量修复。

---

## 📊 变更统计

| 类别 | 新增 | 修改 | 删除 | 合计 |
|------|------|------|------|------|
| 前端 (TypeScript/React) | 17 文件 | 8 文件 | - | 25 文件 |
| 后端 (Rust) | 2 文件 | 2 文件 | - | 4 文件 |
| **总计** | **19 文件** | **10 文件** | - | **29 文件** |

---

## 🔥 P0 级别（关键修复）

### P0-1: 修复硬编码用户信息
**文件：**
- `apps/web/src/components/layout/AppSidebar.tsx` (+75 行变更)
- `apps/web/src/components/layout/AppHeader.tsx` (+422 行变更)

**变更内容：**
- AppSidebar: 静态用户名 "陈管理员" → 从 `useAuth` hook 动态获取
- 用户显示名优先级: `realName` → `full_name` → `username`
- 用户角色: `user.role` 或 `user.roles[0]`
- AppHeader: 用户头像/姓名/角色全部动态化

---

### P0-2: 修复通知 Mock 数据 + 对接真实 API
**文件：**
- `apps/web/src/components/layout/AppHeader.tsx`
- `apps/web/src/pages/mobile/NotificationListPage.tsx` (新增)
- `apps/web/src/store/notificationStore.ts` (新增)
- `apps/web/src/store/notificationSettingsStore.ts` (新增)

**变更内容：**
- 移除 AppHeader 中硬编码的 5 条 mock 通知数据
- 接入 `notificationApi.getNotifications()` 真实接口
- 接入 `notificationApi.getUnreadCount()` 未读数接口
- 增加 loading 状态、错误处理、自动轮询
- 移动端通知列表页同步接入真实 API
- 新增 notificationStore 统一管理通知状态

---

### P0-3: 中央导航动态化
**文件：**
- `apps/web/src/lib/NavigationRegistry.ts` (-4713 行变更)
- `apps/web/src/lib/navigation/moduleRegistrations.ts` (新增, ~4690 行)
- `apps/web/src/lib/navigation/index.ts` (新增)

**变更内容：**
- 仪表盘模块卡片从硬编码 → 从 `navigationRegistry` 动态获取
- 根据当前路径自动识别所属模块，显示对应模块快捷入口
- 模块注册逻辑与核心类定义分离

---

## ⚡ P1 级别（重要优化）

### P1-1: API 路径全量对齐 & 规范化
**文件：**
- `apps/web/src/utils/apiPath.ts` (新增)

**变更内容：**
- 建立统一 API 路径规范: `/api/{service}/{version}/{path}`
- 提供 `buildApiPath()`, `buildV1Path()` 工具函数
- 提供 `API_PATHS` 常量集合
- 核心服务（iam, hrm, notification 等）路径对齐

---

### P1-2: 服务间调用 SDK 化
**文件：**
- `lib/src/service_client/notification_client.rs` (新增)
- `lib/src/service_client/generic.rs` (新增)
- `lib/src/service_client/mod.rs` (+16 行)
- `lib/src/lib.rs` (导出更新)

**变更内容：**
- 新增 `NotificationSvcClient` - 通知服务客户端
  - `list_notifications()` - 分页获取通知列表
  - `mark_as_read()` - 标记已读
  - `mark_all_read()` - 全部已读
  - `get_stats()` - 获取统计数据
  - `get_unread_count()` - 获取未读数
  - `create_notification()` - 创建通知
- 新增 `GenericServiceClient` - 通用服务客户端
  - `health_check()` - 健康检查
  - `get_service_info()` - 服务信息
  - `list()` / `get()` / `create()` / `update()` / `delete()` - 通用 CRUD
- 新增 `define_service_client!` 宏，快速生成服务客户端
- 支持从环境变量配置服务地址 (`NOTIFICATION_SERVICE_URL` 等)

---

### P1-3: 移动端核心页面移动化
**文件：**
- `apps/web/src/components/common/MobileRouteAdapter.tsx` (新增)
- `apps/web/src/components/common/index.ts` (导出更新)
- `apps/web/src/pages/mobile/NotificationListPage.tsx` (新增)

**变更内容：**
- 新增 `MobileRouteAdapter` 组件 - 桌面/移动端自动路由切换
  - 检测到移动端访问桌面路由 → 自动跳转移动端页面
  - 检测到桌面端访问移动端页面 → 自动跳转桌面页面
  - 保留 query 参数
- 移动端通知列表页接入真实 API
- 现有 16+ 移动端页面保持兼容

---

### P1-4: 大文件拆分 - NavigationRegistry
**文件：**
- `apps/web/src/lib/NavigationRegistry.ts` (5098 → 413 行, 减少 92%)
- `apps/web/src/lib/navigation/moduleRegistrations.ts` (新增)
- `apps/web/src/lib/navigation/index.ts` (新增)

**变更内容：**
- 核心类定义 (类型/NavigationRegistry 类) 保留在主文件
- 30 个模块的导航注册配置独立到 moduleRegistrations.ts
- 保持向后兼容：所有现有导入路径不变
- 新增 navigation/ 目录为后续模块化做准备

---

### P1-5: QMS 路由完整性修复
**文件：**
- `apps/web/src/routes/professional.ts` (+18 行)
- `apps/web/src/lib/navigation/moduleRegistrations.ts` (导航配置更新)

**变更内容：**
- 修复前: 12 个 QMS 页面 → 10 个路由配置 (缺 2 个)
- 新增路由:
  - `/qms/dashboard` → QmsDashboardPage (质量概览)
  - `/qms/quality-control` → QmsQualityControlPage (质量控制)
- 更新默认跳转: `/qms` → `/qms/dashboard`
- 同步更新 sidebar_nav (12 项, 重新排序)
- 同步更新 module_tabs (12 项)
- 同步更新 module_card 入口路径

---

## 🎨 P2 级别（体验优化）

### P2-1: 状态管理重构 - 统一 auth/权限状态
**文件：**
- `apps/web/src/store/authStore.ts` (新增)
- `apps/web/src/store/themeStore.ts` (新增)
- `apps/web/src/store/uiStore.ts` (新增)
- `apps/web/src/store/shortcutsStore.ts` (新增)
- `apps/web/src/store/workflowStore.ts` (新增)
- `apps/web/src/store/index.ts` (导出更新)

**变更内容：**
- authStore 增强：
  - 新增 `token`, `permissions`, `roles` 状态管理
  - 新增权限检查方法: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
  - 新增角色检查方法: `hasRole()`, `hasAnyRole()`
  - 新增 `isSuperuser()` 超级管理员判断
  - 新增 `getDisplayName()`, `getAvatarUrl()` 便捷方法
  - 新增 `updateUser()` 部分更新用户信息
  - 提供 `useAuth()` hook，聚合常用属性和方法
- 持久化存储使用 `zustand/persist`
- 与 useAppStore 解耦，auth 状态独立管理

---

### P2-2: 组件库沉淀
**状态：** 已完成（packages/shared-components 已有 21+ 组件）

现有组件包括：
- 数据展示: DataTable, EmptyState (5 种变体), ProgressBar, Stepper
- 交互组件: CommandPalette, FilterBar, Pagination, BackButton
- 持续完善中

---

### P2-3: 导航优化 - 侧边栏分组折叠
**状态：** 已完成（AppSidebar 现有功能）

现有功能：
- 侧边栏整体折叠/展开
- 模块分组显示（核心应用 / 业务应用）
- 导航搜索
- 收藏功能
- 最近访问记录

---

### P2-4: 空状态规范 - 统一空/加载/错误状态
**状态：** 已完成（packages/shared-components）

现有空状态组件：
- `EmptyState` - 通用空状态
- `ListEmptyState` - 列表空状态
- `SearchEmptyState` - 搜索空状态
- `PermissionEmptyState` - 权限空状态
- `ErrorEmptyState` - 错误空状态

---

## 📁 新增 Hooks & 工具

### Hooks (新增)
- `apps/web/src/hooks/useModuleData.ts` - 模块数据获取
- `apps/web/src/hooks/useCrudQueries.ts` - CRUD 查询封装
- `apps/web/src/hooks/useVirtualScroll.ts` - 虚拟滚动

### 工具函数 (新增)
- `apps/web/src/utils/apiPath.ts` - API 路径生成工具

---

## ✅ 验证结果

| 验证项 | 结果 |
|--------|------|
| TypeScript 编译 | ✅ 通过 (0 errors) |
| Rust lib 编译 | ✅ 通过 (0 errors) |
| 向后兼容性 | ✅ 所有现有导入路径保持不变 |
| 移动端适配 | ✅ 16+ 移动端页面正常 |
| API 对接 | ✅ 通知/用户信息已接入真实接口 |

---

## 🚀 建议的提交分组

### Commit 1: feat(web): P0 级 - 动态用户信息 & 真实通知 API
- AppSidebar/AppHeader 动态用户信息
- 通知 Mock 数据替换为真实 API
- notificationStore 状态管理

### Commit 2: refactor(web): P1 级 - 导航大文件拆分 & QMS 路由修复
- NavigationRegistry 从 5098 行拆分为 413 行
- 新增 navigation/ 目录
- QMS 缺失路由补全

### Commit 3: feat(web): P1 级 - API 路径规范 & 移动端适配
- apiPath.ts 路径工具
- MobileRouteAdapter 路由适配
- 移动端通知页接入真实 API

### Commit 4: feat(lib): P1 级 - 服务间调用 SDK 扩展
- NotificationSvcClient 通知服务客户端
- GenericServiceClient 通用服务客户端
- define_service_client! 宏

### Commit 5: refactor(web): P2 级 - 状态管理重构
- authStore 增强与权限管理
- 各独立 store 文件
- useAuth hook
