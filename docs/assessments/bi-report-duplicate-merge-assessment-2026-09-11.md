# bi/report 双套实现合并评估

**评估日期**: 2026-09-11
**评估范围**: 前端 bi/report 双套 API 封装 + 后端双套路由

## 一、双套实现现状

### 1.1 第一套：`bi/report.ts`（单数 /report）

**文件位置**: `apps/web/src/api/bi/report.ts`

**服务模块**: `bi/` 模块（BI 分析平台）

**使用页面**:
- `src/pages/bi/BIReportPage.tsx`
- `src/pages/bi/BIDashboardPage.tsx`
- `src/pages/bi/BIModuleDetailPage.tsx`
- `src/pages/bi/DataAnalysisPage.tsx`
- `src/pages/bi/BIVisualizationPage.tsx`
- 等 bi/ 目录下的页面（通过 `@/api/bi` 导入）

**API 端点**:
- `GET /report` - 获取报表列表
- `GET /report/{id}` - 获取报表详情
- `POST /report` - 创建报表
- `PUT /report/{id}` - 更新报表
- `DELETE /report/{id}` - 删除报表
- `POST /report/{id}/export` - 导出报表
- `GET /report/{reportId}/exports` - 获取导出任务列表
- `GET /report/exports/{jobId}` - 获取导出任务状态
- `GET /report/exports/{jobId}/download` - 下载导出文件
- `GET /report/{reportId}/schedules` - 获取调度列表
- `POST /report/{reportId}/schedules` - 创建调度
- `PUT /report/schedules/{scheduleId}` - 更新调度
- `DELETE /report/schedules/{scheduleId}` - 删除调度
- `POST /report/schedules/{scheduleId}/run` - 运行调度
- `POST /report/schedules/{scheduleId}/toggle` - 切换调度状态

**函数使用量**: fetchReports 5处、createReport 9处、exportReport 12处、createSchedule 11处等

**状态**: 实际使用的 API，服务于 bi/ 模块

### 1.2 第二套：`report/index.ts`（复数 /reports）

**文件位置**: `apps/web/src/api/report/index.ts`

**服务模块**: `report/` 模块（独立报表管理）

**使用页面**:
- `src/pages/report/ReportListPage.tsx`
- `src/pages/report/ReportSchedulePage.tsx`
- `src/pages/report/ReportViewer.tsx`
- `src/pages/report/ReportPage/index.tsx`
- `src/pages/report/ReportSubscriptionPage.tsx`
- `src/pages/report/ReportBuilder.tsx`
- 等 report/ 目录下的页面（通过 `@/api/report` 导入）

**API 端点**:
- `GET /reports` - 获取报表列表
- `GET /reports/{id}` - 获取报表详情
- `POST /reports` - 创建报表
- `POST /reports/from-template` - 从模板创建
- `PUT /reports/{id}` - 更新报表
- `DELETE /reports/{id}` - 删除报表
- `POST /reports/{id}/export` - 导出报表
- `POST /reports/{id}/run` - 运行报表
- `GET /templates` - 获取模板列表
- `GET /templates/{id}` - 获取模板详情
- `POST /templates` - 创建模板
- `PUT /templates/{id}` - 更新模板
- `DELETE /templates/{id}` - 删除模板
- `GET /report-types` - 获取报表类型
- `GET /schedules` - 获取调度列表
- `GET /schedules/{id}` - 获取调度详情
- `POST /schedules` - 创建调度
- `PUT /schedules/{id}` - 更新调度
- `DELETE /schedules/{id}` - 删除调度

**状态**: 实际使用的 API，服务于 report/ 模块

### 1.3 后端双套路由

**文件位置**: `svc/analytics/src/modules/analytics_compat.rs`

**第一套（单数）**:
- `GET /api/bi/report/exports/{jobId}`
- `GET /api/bi/report/exports/{jobId}/download`
- `DELETE/PUT /api/bi/report/schedules/{scheduleId}`
- `POST /api/bi/report/schedules/{scheduleId}/run`
- `POST /api/bi/report/schedules/{scheduleId}/toggle`
- `POST /api/bi/report/{id}/export`
- `GET /api/bi/report/{reportId}/exports`
- `GET/POST /api/bi/report/{reportId}/schedules`

**第二套（复数）**:
- `GET /api/bi/reports`
- `GET /api/bi/reports/{id}`
- `POST /api/bi/reports`
- `POST /api/bi/reports/from-template`
- `PUT /api/bi/reports/{id}`
- `DELETE /api/bi/reports/{id}`
- `POST /api/bi/reports/{id}/export`
- `POST /api/bi/reports/{id}/run`

**状态**: 两套都是空实现（compat 函数体为空），属于兼容层桩代码

## 二、差异对比

| 维度 | 第一套（单数 /report） | 第二套（复数 /reports） |
|------|------------------------|------------------------|
| 路径风格 | 单数，资源嵌套 | 复数，资源独立 |
| 页面消费 | 0 | 6+ |
| 功能覆盖 | 报表 CRUD + 导出 + 调度 | 报表 CRUD + 模板 + 类型 + 导出 + 调度 |
| 调度路径 | 嵌套在 report 下 | 独立的 /schedules |
| 模板管理 | 无 | 有（/templates） |
| 报表类型 | 无 | 有（/report-types） |
| 运行报表 | 无 | 有（/reports/{id}/run） |

## 三、合并建议

### 3.1 核心发现

这不是简单的重复代码，而是**两个不同的前端模块各自有一套报表 API**：
- `bi/` 模块：BI 分析平台，报表是其功能之一
- `report/` 模块：独立的报表管理模块，功能更专注

两套 API 功能高度重叠（报表 CRUD + 导出 + 调度），但路径风格和功能完整度不同。

### 3.2 分阶段合并策略

#### 阶段一：短期（1-2 周）- 统一后端实现

**目标**: 消除后端重复，实现一套完整的报表业务逻辑

1. **后端统一实现**
   - 以 `/api/bi/reports`（复数）为标准，实现完整的报表业务逻辑
   - 保留 `/api/bi/report`（单数）路由，内部转发到复数路由的实现
   - 实现报表 CRUD、导出、调度、模板管理、报表类型等完整功能

2. **前端保持不变**
   - 两套前端 API 继续使用，不做改动
   - 确保两套 API 都能正常调用后端（通过路由转发）

**风险**: 低，前端无改动，后端内部重构

#### 阶段二：中期（1 个月）- 统一前端 API 层

**目标**: 消除前端 API 层重复，统一为一套 API 封装

1. **扩展 `report/index.ts`（复数）功能**
   - 确保 `report/index.ts` 包含 `bi/report.ts` 的所有功能
   - 补充缺失的导出任务管理功能（listExportJobs, getExportJob, downloadExport）
   - 统一类型定义

2. **迁移 bi/ 模块页面**
   - 将 `bi/` 模块页面从 `@/api/bi` 的报表函数迁移到 `@/api/report`
   - 逐步替换导入路径和函数调用
   - 确保功能不变

3. **移除 `bi/report.ts`**
   - 确认所有页面都已迁移到 `@/api/report`
   - 从 `bi/index.ts` 移除报表相关导出
   - 删除 `bi/report.ts` 文件

**风险**: 中，需要修改多个页面，需要充分测试

#### 阶段三：长期（2-3 个月）- 合并前端模块

**目标**: 合并 bi/ 和 report/ 两个前端模块，统一为一个报表分析平台

1. **功能整合**
   - 评估两个模块的功能重叠和差异
   - 保留各自的独特功能（bi/ 的数据分析和可视化，report/ 的报表设计器和订阅）
   - 统一导航和用户体验

2. **模块合并**
   - 将 report/ 模块的功能整合到 bi/ 模块中
   - 或者创建新的统一模块
   - 更新路由配置和菜单

3. **清理冗余**
   - 删除重复的组件和工具函数
   - 统一类型定义
   - 更新文档

**风险**: 高，涉及大量前端重构，需要产品决策和充分测试

### 3.3 推荐执行顺序

1. **立即启动**: 阶段一（后端统一实现）- 低风险，高收益
2. **阶段一完成后**: 评估阶段二的必要性和时机
3. **阶段二完成后**: 根据产品规划决定是否进行阶段三

## 四、后续工作

1. **实现后端报表业务逻辑**（当前都是空实现）
   - 报表 CRUD
   - 报表导出
   - 报表调度
   - 模板管理
   - 报表类型管理

2. **前端报表页面功能完善**
   - 确保所有页面调用真实 API（当前可能有 mock 数据）
   - 完善报表查看器功能
   - 添加报表设计器

3. **权限控制**
   - 报表级别的权限控制
   - 数据行级权限（RLS）

## 五、结论

bi/report 双套实现是两个不同前端模块（bi/ 和 report/）各自的 API 封装，功能高度重叠但服务于不同页面。建议采用分阶段合并策略：短期统一后端实现，中期统一前端 API 层，长期根据产品规划决定是否合并前端模块。

**当前状态**: 评估完成，建议启动阶段一（后端统一实现）。
