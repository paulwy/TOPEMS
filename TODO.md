# TOPEMS 项目任务规划与路线图

> 版本: 4.2 | 更新日期: 2026-07-01
> 服务总数: 24 个 | 前端页面: 415 页 | 后端API: ~2140 handler | 前端API模块: 43个
> **V4.1 全栈对齐攻坚 — 导航统一 + API一致化 + 页面标准化** ✅ 已完成
> **V4.2 V2路由迁移 — 解决导航路径与实际路由路径对齐** ✅ 已完成
> **V4.3 页面去重与规范化 — 消除重复页面，统一目录结构** ✅ 已完成
> **V4.4 性能优化阶段 — 懒加载、代码分割、首屏优化** 🚀 进行中
> **V4.5 测试覆盖率提升 — 为更多模块添加单元测试** 📋 待开始

---

## 🚀 当前冲刺 (2026-07-01 ~ 2026-07-08)

### 核心目标：V4.3 页面去重与规范化

> 详细方案：[重复页面清理方案](./docs/reports/duplicate-pages-cleanup-plan.md)

### V4.2 冲刺已完成 ✅

| 优先级 | 任务 | 模块/范围 | 预计工时 | 当前进度 | 负责Agent |
|--------|------|----------|---------|---------|----------|
| **P0** | 阶段0：双路由并存（紧急修复） | 全局 + 31模块 | 0.5天 | ✅ 已完成 | Agent A |
| **P0** | 阶段1：核心平台模块迁移 | iam/admin/workflow/notification/doc/monitor/integration/ai | 1天 | ✅ 已完成 | Agent A |
| **P0** | 阶段2：业务应用模块迁移 | hrm/finance/crm/scm/wms/srm/mes/qms/lims/ehs/pdm/bi | 2天 | ✅ 已完成 | Agent A |
| **P0** | 阶段3：边缘模块+旧路由清理 | 15个边缘模块 + professional.ts/docs.ts 等 | 1天 | ✅ 已完成 | Agent A |
| **P1** | 页面去重第一批：workflow两套页面合并 | workflow模块（Flow* → Workflow*） | 0.5天 | ✅ 已完成 | Agent A |
| **P1** | 页面去重第二批：doc目录合并 | docs/ + document/ → 统一doc/目录 | 0.5天 | ✅ 已完成 | Agent A |
| **P2** | 页面去重第三批：重复Dashboard+孤儿页面清理 | 3个重复Dashboard + 11个孤儿页面 | 0.5天 | ✅ 已完成 | Agent A |
| **P2** | 页面去重第四批：iam/admin功能合并 | 合并IAM到Admin模块，消除8类重复功能 | 4.5天 | ✅ 已完成 | Agent A |
| **P3** | 阶段4：收尾优化 | V2提升到根目录+类型重命名+文档更新 | 0.5天 | ✅ 已完成 | Agent A |

---

### V4.3 冲刺任务清单

| 优先级 | 任务 | 模块/范围 | 预计工时 | 当前进度 | 负责Agent |
|--------|------|----------|---------|---------|----------|
| **P0** | V4.3-P1：重复Dashboard页面清理（第二批） | mes/ai/finance/iam/workflow | 0.5天 | ✅ 已完成 | Agent A |
| **P0** | V4.3-P2：iam模块路由与Admin职责梳理完成 | iam/admin | 1天 | ✅ 已完成 | Agent A |
| **P1** | V4.3-P3：命名规范化收尾 | 全局 | 0.5天 | ✅ 已完成 | Agent A |
| **P1** | V4.3-P4：全量路由验证测试 | 全局 | 0.5天 | ✅ 已完成 | Agent A |
| **P1** | V4.3-P4.1：单元测试用例生成 | iam/admin模块 | 1天 | ✅ 已完成 | Agent A |
| **P2** | V4.3-P5：历史重定向清理 | 全局 | 1天 | ✅ 已完成 | Agent A |
| **P2** | V4.3-P6：废弃组件清理 | components/old/ | 2天 | ✅ 已完成 | Agent A |
| **P2** | V4.3-P7：移动端适配检查 | mobile模块 | 2天 | ✅ 已完成 | Agent A |

---

### V4.4 性能优化阶段任务清单

| 优先级 | 任务 | 模块/范围 | 预计工时 | 当前进度 | 负责Agent |
|--------|------|----------|---------|---------|----------|
| **P0** | V4.4-P1：路由级懒加载优化 | 全局路由 | 0.5天 | 📋 待开始 | Agent A |
| **P0** | V4.4-P2：首屏优化（关键路径优化） | 首页/Dashboard | 1天 | 📋 待开始 | Agent A |
| **P1** | V4.4-P3：组件级懒加载 | 大型组件 | 1天 | 📋 待开始 | Agent A |
| **P1** | V4.4-P4：图片优化（懒加载+WebP） | 全局图片 | 0.5天 | 📋 待开始 | Agent A |
| **P2** | V4.4-P5：打包体积分析与优化 | 构建配置 | 1天 | 📋 待开始 | Agent A |

---

### V4.5 测试覆盖率提升任务清单

| 优先级 | 任务 | 模块/范围 | 预计工时 | 当前进度 | 负责Agent |
|--------|------|----------|---------|---------|----------|
| **P0** | V4.5-P1：HRM 模块单元测试 | hrm模块 | 2天 | 📋 待开始 | Agent A |
| **P0** | V4.5-P2：CRM 模块单元测试 | crm模块 | 2天 | 📋 待开始 | Agent A |
| **P1** | V4.5-P3：Finance 模块单元测试 | finance模块 | 2天 | 📋 待开始 | Agent A |
| **P1** | V4.5-P4：MES 模块单元测试 | mes模块 | 2天 | 📋 待开始 | Agent A |
| **P2** | V4.5-P5：Workflow 模块单元测试 | workflow模块 | 2天 | 📋 待开始 | Agent A |

---

## V4.3 详细实施方案

### 任务 P0-1：重复Dashboard页面清理（第二批）

**问题**：经过扫描，仍存在5个模块同时拥有两个Dashboard页面

| 模块 | 页面1（标准命名） | 页面2（旧命名） | 保留 | 删除 |
|------|------------------|----------------|------|------|
| ai | AiDashboardPage.tsx | DashboardPage.tsx | AiDashboardPage | DashboardPage |
| finance | FinanceDashboardPage.tsx | DashboardPage.tsx | FinanceDashboardPage | DashboardPage |
| iam | IamDashboardPage.tsx | DashboardPage.tsx | IamDashboardPage | DashboardPage |
| mes | ProductionDashboardPage.tsx | DashboardPage.tsx | ProductionDashboardPage | DashboardPage |
| workflow | WorkflowDashboardPage.tsx | DashboardPage.tsx | WorkflowDashboardPage | DashboardPage |

**实施步骤**：
1. 检查每个模块的 V2 路由配置，确认当前引用的是哪个 Dashboard
2. 如果路由引用的是旧命名的 DashboardPage，更新路由引用为标准命名版本
3. 删除旧命名的 DashboardPage.tsx 文件

**产出文件**：路由文件更新（ai.ts, finance.ts, mes.ts, workflow.ts）、删除旧页面

---

### 任务 P0-2：iam模块路由与Admin职责梳理完成

**问题**：iam 模块目录不存在，需要确认页面归属和路由配置

**当前状态**：
- iam 模块的功能已合并到 admin 模块
- 需要确认 iam.ts 路由文件是否正确引用 admin/ 目录下的页面

**实施步骤**：
1. 检查 `routes/v2/iam.ts` 的页面引用
2. 确认页面归属：
   - 属于 IAM 的页面（用户、角色、权限、组织架构）应从 admin/ 移动到 iam/
   - 属于 Admin 的页面（字典、菜单、日志、配置、租户）保留在 admin/
3. 创建 iam/ 目录（如果不存在）并移动相应页面
4. 更新 iam.ts 和 admin.ts 路由引用
5. 更新 API 模块引用

**页面归属调整方案**：

| 页面 | 当前位置 | 调整后位置 | 归属模块 |
|------|---------|-----------|---------|
| UserManagementPage | admin/ | iam/ | iam |
| RoleManagementPage | admin/ | iam/ | iam |
| PermissionManagementPage | admin/ | iam/ | iam |
| CompanyStructurePage | admin/ | iam/ | iam |
| DictionaryManagementPage | admin/ | admin/ | admin |
| AuditLogPage | admin/ | admin/ | admin |
| SystemSettingsPage | admin/ | admin/ | admin |
| TenantManagementPage | admin/ | admin/ | admin |

**产出文件**：新增 iam/ 目录及页面、更新路由文件、更新 API 引用

---

### 任务 P1-3：命名规范化收尾

**问题**：部分页面命名未完全符合统一规范

**规范要求**：
- 页面文件统一使用 `ModulePrefix + PageName + Page.tsx` 格式
- Dashboard 统一为 `ModulePrefix + DashboardPage.tsx`
- 目录名与模块 code 一致

**实施步骤**：
1. 扫描所有页面文件，识别不符合命名规范的文件
2. 重命名不符合规范的页面文件
3. 更新所有路由引用
4. 更新所有组件导入引用

**产出文件**：重命名后的页面文件、更新的路由文件

---

### 任务 P1-4：全量路由验证测试

**实施步骤**：
1. 运行 TypeScript 编译检查：`npx tsc --noEmit`
2. 运行路由扫描脚本，验证所有路由路径唯一性
3. 启动前端开发服务器，验证关键路径可访问性
4. 检查控制台是否有路由相关错误

**产出**：验证报告

---

### 任务 P2-5：历史重定向清理

**问题**：V3.x 时代的旧路径重定向规则可能仍存在于代码中

**实施步骤**：
1. 搜索所有重定向相关代码（`Redirect`, `history.push`, `window.location`）
2. 识别已过时的重定向规则
3. 删除或更新为新路径

**产出文件**：清理后的路由文件

---

### 任务 P2-6：废弃组件清理

**问题**：components/ 目录下可能存在不再使用的旧组件和旧样式

**实施步骤**：
1. 扫描 components/ 目录，识别未被引用的组件
2. 确认组件确实不再使用
3. 删除废弃组件文件

**产出文件**：清理后的 components/ 目录

---

### 任务 P2-7：移动端适配检查

**问题**：确保所有标准模板在移动端可用

**实施步骤**：
1. 检查移动端路由配置是否完整
2. 验证移动端页面是否正确使用移动端布局系统
3. 检查移动端 API 对接状态
4. 修复适配问题

**产出文件**：更新的移动端页面

---

## V4.3 实施原则

1. **先验证，后修改**：所有删除操作前必须确认页面确实未被引用
2. **每步验证**：完成每个任务后运行 TypeScript 编译检查
3. **保留功能**：合并页面时确保保留更完善版本的所有功能
4. **命名规范化**：统一使用 `ModulePrefix + PageName + Page.tsx` 格式

---

## V4.3 风险与回滚

| 风险 | 影响 | 回滚方案 |
|------|------|---------|
| 删除正在使用的页面 | 功能不可用 | 通过 git 历史回滚 |
| 路由引用更新错误 | 页面无法访问 | 回滚路由文件，重新检查引用 |
| 命名变更导致 API 对接失败 | 数据无法加载 | 回滚页面重命名，检查 API 引用 |

---

---

## V4.1 冲刺完成 (2026-06-30 ~ 2026-07-01)

| 优先级 | 任务 | 模块/范围 | 预计工时 | 当前进度 | 负责Agent |
|--------|------|----------|---------|---------|----------|
| **P0** | 图标统一映射（消除字母图标） | 全局 | 0.5天 | ✅ 已完成 | Agent A |
| **P0** | 导航四层模型验证 | 全局 | 0.5天 | ✅ 已完成 | Agent A |
| **P0** | 路由-导航一一对应 | 32模块 | 1天 | ✅ 已完成 | Agent A |
| **P0** | 前端API补全（缺失5模块） | admin/asset/doc/oa | 2天 | ✅ 已完成 | Agent B |
| **P0** | 后端API映射表建立 | 全局 | 1天 | ✅ 已完成 | Agent C |
| **P1** | docs与document模块合并 | 文档模块 | 1天 | ✅ 已完成 | Agent B |
| **P1** | 页面标准化第一批-admin | admin模块（12页） | 1.5天 | ✅ 已完成 | Agent D |
| **P1** | 页面标准化第一批-erp/finance | erp/finance模块 | 2天 | ✅ 已完成 | Agent D |
| **P2** | 页面标准化第二批（hrm/crm/wms/qms） | 4模块（60页） | 2天 | ✅ 已完成 | Agent D |
| **P2** | 页面标准化第二批（mes/lims/ehs/pdm） | 4模块（61页） | 2天 | ✅ 已完成 | Agent D |
| **P2** | 页面标准化第三批（pm/rs/scm/srm） | 4模块（60页） | 2天 | ✅ 已完成 | Agent D |
| **P2** | 页面标准化第三批（边缘模块） | integration/lowcode/gis（24页） | 1天 | ✅ 已完成 | Agent D |
| **P2** | 废弃导航文件清理 | 删除4个废弃文件 | 0.5天 | ✅ 已完成 | Agent A |

---

### ✅ V4.1 页面标准化最终统计（2026-07-01 实测）

**总页面数：415页 | 已标准化：390页 | 标准化率：94%**

| 模块分类 | 模块数量 | 总页面 | 已标准化 | 标准化率 | 说明 |
|---------|---------|--------|---------|---------|------|
| 核心平台 | 13个 | 165页 | 159页 | 96% | iam/workflow/notification/doc/monitor/integration/ai/mobile/erp/oa/pm/rs/admin |
| 业务应用 | 12个 | 175页 | 172页 | 98% | hrm/finance/crm/scm/wms/srm/mes/qms/lims/ehs/pdm/bi |
| 边缘模块 | 4个 | 28页 | 22页 | 79% | gis/lowcode/plugin/report |
| 共享页面 | 1个 | 13页 | 8页 | 62% | 登录/404/仪表盘/错误页等 |

#### 🟡 未标准化页面清单（25页，均为合理例外）

| 类别 | 页面数 | 页面列表 | 说明 |
|------|--------|---------|------|
| **设计器页面** | 3页 | FlowDesigner, PageDesigner, FormDesigner | 全屏编辑器，不使用 PageContainer 是合理的 |
| **移动端页面** | 15页 | MobileWorkbench, MobileApproval, MobileAttendance 等 | 移动端有独立的布局系统 |
| **共享/认证页面** | 5页 | Login, ForgotPassword, Error, Dashboard, Impage | 登录页/错误页/404等不需要标准布局 |
| **子组件/Tab** | 1页 | EmployeeFinanceTab | 这是Tab组件，不是独立页面 |
| **占位页面** | 1页 | InspectionResultPage | 空的 placeholder 页面 |

---

## 📐 V4.1 全栈对齐规范（新增）

### 六、全栈一一对应规范

#### 6.1 四层映射模型
```
导航菜单（.nav.ts）
    ↓ 1:1 对应
路由路径（routes/v2/*.ts）
    ↓ 1:1 对应
前端API（api/*.ts）
    ↓ 1:1 对应
后端API（svc/*/src/api/*.rs）
```

#### 6.2 图标统一规范
- **唯一数据源**：`src/lib/iconMapping.tsx`
- **禁止**：独立维护 iconMap、字母图标 fallback
- **强制**：所有导航组件（侧边栏、顶部菜单、模块概览、移动端）必须使用 `iconMapping.tsx`
- **检查**：新增导航项时，图标必须已在 iconMapping 中注册

#### 6.3 模块映射关系表（前端→后端）

| 前端模块 | 后端服务 | 后端模块 | 状态 |
|----------|----------|----------|------|
| iam | unified-core | iam | ✅ 已映射 |
| workflow | unified-core | flow | ✅ 已映射 |
| notification | unified-core | communication | ✅ 已映射 |
| im | unified-core | communication | ✅ 已映射 |
| mail | unified-core | communication | ✅ 已映射 |
| plugin | unified-core | plugin | ✅ 已映射 |
| file | unified-core | file | ✅ 已映射 |
| tenant | unified-core | tenant | ✅ 已映射 |
| bi | analytics | bi | ✅ 已映射 |
| report | analytics | report | ✅ 已映射 |
| finance | erp | finance | ✅ 已映射 |
| asset | erp | fixed_asset | ✅ 已映射 |
| admin | 多服务 | iam+tenant+monitor | ⚠️ 待整合 |
| hrm | hrm | hrm | ✅ 直接对应 |
| crm | crm | crm | ✅ 直接对应 |
| scm | scm | scm | ✅ 直接对应 |
| wms | wms | wms | ✅ 直接对应 |
| srm | srm | srm | ✅ 直接对应 |
| mes | mes | mes | ✅ 直接对应 |
| qms | qms | qms | ✅ 直接对应 |
| lims | lims | lims | ✅ 直接对应 |
| ehs | ehs | ehs | ✅ 直接对应 |
| pdm | pdm | pdm | ✅ 直接对应 |
| pm | pm | pm | ✅ 直接对应 |
| rs | rs | rs | ✅ 直接对应 |
| erp | erp | erp | ✅ 直接对应 |
| ai | ai | ai | ✅ 直接对应 |
| gis | gis | gis | ✅ 直接对应 |
| monitor | monitor | monitor | ✅ 直接对应 |
| integration | 待建 | - | ⚠️ 待补全 |
| lowcode | 待建 | - | ⚠️ 待补全 |
| mobile | mobile | mobile | ✅ 直接对应 |
| oa | 待整合 | - | ⚠️ 待补全 |
| doc | 待合并 | - | ⚠️ 待合并docs+document |

---

## 📐 V4.0 架构规范体系

---

## 🚀 当前冲刺 (2026-07-01 ~ 2026-07-15)

### 核心目标：推进 V4.0 第三阶段业务模块标准化改造

| 优先级 | 任务 | 模块 | 预计工时 | 当前进度 |
|--------|------|------|---------|---------|
| P0 | HRM 人力资源标准化改造 | HRM | 4天 | ✅ 已完成 |
| P0 | Finance 财务管理标准化改造 | Finance | 4天 | ✅ 已完成 |
| P1 | CRM 客户关系标准化改造 | CRM | 3天 | ✅ 已完成 |
| P1 | 可观测性建设剩余工作 | Monitor | 2天 | ✅ 已完成 |
| P2 | 移动端 API 对接 | Mobile | 3天 | ⏳ 长期任务 |
| P2 | service_client SDK 单元测试 | Backend | 1天 | 📋 待开始 |
| P2 | 工作流可视化设计器 | Workflow | 5天 | 📋 待开始 |
| P2 | 文档版本控制与协同编辑 | Document | 3天 | 📋 待开始 |

---

## 📐 V4.0 架构规范体系

### 一、导航架构规范

#### 1.1 导航四层模型
```
第一层：模块导航（顶部一级菜单）
  ↓
第二层：分组导航（侧边栏二级菜单 - 可折叠分组）
  ↓
第三层：页面导航（侧边栏三级菜单 - 具体页面）
  ↓
第四层：操作导航（页面内 - Tab/面包屑/操作按钮）
```

#### 1.2 导航数据结构规范
**统一使用单一数据源**，消除 top_nav / sidebar_nav / module_tabs 三套数据的不一致。

```typescript
interface NavItem {
  code: string;           // 唯一标识，格式: {module}-{group}-{page}
  label: string;          // 显示名称
  icon: string;           // lucide图标名
  path: string;           // 路由路径，格式: /{module}/{group}/{page}
  permission: string;     // 权限标识，格式: {module}:{action}
  order: number;          // 排序权重
  group?: string;         // 所属分组（用于侧边栏分组展示）
  children?: NavItem[];   // 子菜单（最多两级）
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
}
```

#### 1.3 模块分类与归属

**核心平台模块（Core）— 13个，不可卸载：**
- IAM（身份与权限）
- Workflow（工作流引擎）
- Notification（通知中心）
- Document（文档管理）
- Report（报表中心）
- Monitor（系统监控）
- Integration（集成平台）
- AI（智能助手）
- Mobile（移动端）
- ERP（企业资源 - 核心版）
- OA（行政办公 - 轻量版）
- PM（项目管理 - 基础版）
- RS（研发管理）

**业务应用模块（Business）— 12个，插件化安装：**
- HRM（人力资源）
- Finance（财务管理）
- CRM（客户关系）
- SCM（供应链）
- WMS（仓储管理）
- SRM（供应商关系）
- MES（生产执行）
- QMS（质量管理）
- LIMS（实验室管理）
- EHS（安全环保）
- PDM（产品数据）
- BI（商业智能）
- GIS（地理信息）
- LowCode（低代码平台）

#### 1.4 侧边栏分组规范

每个模块的侧边栏必须按以下逻辑分组（按需选用）：

| 分组 | 说明 | 排序 | 图标 |
|------|------|------|------|
| **概览** | 仪表盘、看板、总览类页面 | 0 | LayoutDashboard |
| **业务管理** | 核心业务实体的CRUD | 1-10 | 各业务图标 |
| **流程管理** | 审批、流程相关 | 11-20 | Workflow |
| **分析报表** | 统计分析、报表 | 21-30 | BarChart3 |
| **基础设置** | 字典、配置、参数 | 31-40 | Settings |

**强制规则：**
- 每个模块必须有"概览"分组，包含仪表盘页面
- 模块默认入口路径：`/{module}/dashboard`
- 侧边栏最多两级，禁止三级以上嵌套
- 分组名称使用2-4字简洁命名

#### 1.5 导航一致性规则
1. **单一数据源原则**：所有导航（顶部菜单、侧边栏、面包屑、模块卡片）均从同一配置生成
2. **路由即导航**：路由定义自动生成导航项，导航路径与路由路径严格对应
3. **权限即显隐**：导航项显示/隐藏由权限统一控制，不做单独判断
4. **模块隔离原则**：一个模块的导航中不出现其他模块的链接（快速入口除外）

---

### 二、路由架构规范

#### 2.1 路由路径命名规范
**统一格式：** `/{module}/{group?}/{resource}/{action?}/{id?}`

**命名规则：**
- 全部使用小写字母，单词间用 `-` 连接（kebab-case）
- 资源名使用复数形式（`customers`, `orders`）
- 动作名使用动词原形（`create`, `edit`, `detail`）
- ID参数使用 `:id` 格式

#### 2.2 路由文件结构规范
```
routes/
├── index.ts              # 路由总入口
├── utils.ts              # 路由工具函数
├── core/                 # 核心模块路由
│   ├── iam.ts
│   ├── workflow.ts
│   ├── notification.ts
│   └── ...
└── business/             # 业务模块路由
    ├── hrm.ts
    ├── finance.ts
    ├── crm.ts
    └── ...
```

#### 2.3 路由配置标准结构
```typescript
interface RouteConfig {
  path: string;                     // 路由路径
  element: React.ComponentType;     // 页面组件
  module: string;                   // 所属模块
  group?: string;                   // 所属分组
  title?: string;                   // 页面标题（用于浏览器标签和面包屑）
  requiredPermissions?: string[];   // 所需权限
  layout?: 'default' | 'full' | 'mobile' | 'none';  // 布局类型
  nav?: {                           // 导航配置（自动生成导航项）
    label: string;
    icon: string;
    order: number;
    sidebar: boolean;               // 是否显示在侧边栏
    breadcrumb: boolean;            // 是否显示在面包屑
  };
}
```

---

### 三、页面模板规范

#### 3.1 页面分类体系（8类标准模板）

| 模板类型 | 适用场景 | 核心结构 | 占比预估 |
|---------|---------|---------|---------|
| **DashboardTemplate** | 模块首页、仪表盘、看板 | 统计卡片 + 图表 + 快捷入口 | 10% |
| **ListPageTemplate** | 数据列表、CRUD管理页 | 搜索栏 + 表格 + 分页 + 操作 | 50% |
| **DetailPageTemplate** | 详情页、查看页 | 头部信息 + Tab切换 + 详情内容 | 20% |
| **FormPageTemplate** | 表单页、新增/编辑页 | 表单 + 步骤 + 提交操作 | 10% |
| **TreePageTemplate** | 树形结构、层级数据 | 左树右表 + 树操作 | 5% |
| **StatsPageTemplate** | 统计分析、数据报表 | 筛选器 + 图表 + 数据表 | 3% |
| **SettingsPageTemplate** | 设置、配置页 | 左侧分类 + 右侧内容 | 1.5% |
| **KanbanPageTemplate** | 看板视图、任务板 | 列 + 卡片 + 拖拽 | 0.5% |

#### 3.2 页面结构统一规范
**所有页面必须遵循以下结构：**
```
PageContainer
├── PageHeader
│   ├── 标题 + 副标题
│   ├── 面包屑导航
│   └── 操作按钮区
└── PageContent
    └── 模板主体内容
```

#### 3.3 页面出入口规范
**入口路径：**
- 列表页：`/{module}/{group}/{resource}`
- 详情页：`/{module}/{group}/{resource}/:id`
- 新建页：`/{module}/{group}/{resource}/create`
- 编辑页：`/{module}/{group}/{resource}/:id/edit`

**返回规则：**
- 详情页 → 返回列表页
- 新建/编辑成功 → 返回列表页
- 取消操作 → 返回上一页
- 所有返回按钮使用统一的 `BackButton` 组件

---

### 四、API模块规范

#### 4.1 API路径统一规范
**格式：** `/api/{service}/v{version}/{resource}`

#### 4.2 API函数命名规范

| 操作 | 函数命名 | 对应HTTP方法 |
|------|---------|-------------|
| 列表查询 | `listXxx(params)` | GET |
| 详情查询 | `getXxx(id)` | GET |
| 创建 | `createXxx(data)` | POST |
| 更新 | `updateXxx(id, data)` | PUT |
| 删除 | `deleteXxx(id)` | DELETE |
| 批量操作 | `batchXxx(ids, ...)` | POST |

---

### 五、组件库规范

#### 5.1 组件分层
```
components/
├── ui/                   # 基础UI组件（原子级）
├── common/               # 通用业务组件（分子级）
├── templates/            # 页面模板（页面级）
└── {module}/             # 模块专属组件
```

---

## 📅 V4.0 分阶段实施计划

### 阶段一：基础设施与标准建设（已完成）

| 任务 | 状态 | 产出文件 |
|------|------|---------|
| 导航架构重构 | ✅ 完成 | `lib/navigation/types.ts`, `lib/navigation/NavigationRegistryV2.ts`, `lib/navigation/hooks.ts`, `lib/navigation/components/SidebarNavGroup.tsx` |
| 路由架构重构 | ✅ 完成基础 | `routes/v2/types.ts`, `routes/v2/iam.ts`, `routes/v2/index.ts` |
| PageContainer增强 | ✅ 完成 | `components/common/PageContainerV2.tsx` |
| 页面模板标准化 | ✅ 完成分类 | `components/templates/classification.ts` |
| API路径统一工具 | ✅ 完成 | `utils/apiPath.ts` |
| 设计Token体系 | ✅ 已存在 | `packages/tokens/src/tokens.ts` |

### 阶段二：核心模块改造（已完成）

| 模块 | 页面数 | 状态 | 产出文件 |
|------|--------|------|---------|
| IAM 身份权限 | 17页 | ✅ 完成 | `routes/v2/iam.ts`, `pages/iam/*.tsx` |
| Workflow 工作流 | 11页 | ✅ 完成 | `routes/v2/workflow.ts`, `pages/workflow/*.tsx` |
| Notification 通知 | 7页 | ✅ 完成 | `routes/v2/notification.ts`, `pages/notification/*.tsx` |
| Document 文档 | 8页 | ✅ 完成 | `routes/v2/document.ts`, `pages/document/*.tsx` |
| Monitor 系统监控 | 6页 | ✅ 完成 | `routes/v2/monitor.ts`, `pages/monitor/*.tsx` |
| Integration 集成平台 | 9页 | ✅ 完成 | `routes/v2/integration.ts`, `pages/integration/*.tsx` |
| AI 智能助手 | 7页 | ✅ 完成 | `routes/v2/ai.ts`, `pages/ai/*.tsx` |
| Mobile 移动端 | 12页 | ✅ 完成 | `routes/v2/mobile.ts`, `pages/mobile/*.tsx` |

---

### 阶段三：业务模块改造（进行中）

**目标：** 完成主要业务模块的标准化改造

| 批次 | 模块 | 页面数 | 优先级 | 状态 |
|------|------|--------|--------|------|
| 第一批 | HRM 人力资源 | 21页 | P0 | � 50% |
| | Finance 财务管理 | 21页 | P0 | � 25% |
| | CRM 客户关系 | 16页 | P1 | � 25% |
| 第二批 | MES 生产执行 | 28页 | P0 | ⏳ 待规划 |
| | QMS 质量管理 | 12页 | P0 | ⏳ 待规划 |
| | SCM 供应链 | 14页 | P1 | ⏳ 待规划 |
| 第三批 | WMS 仓储管理 | 16页 | P1 | ⏳ 待规划 |
| | EHS 安全环保 | 15页 | P1 | ⏳ 待规划 |
| | PM 项目管理 | 10页 | P1 | ⏳ 待规划 |
| 第四批 | LIMS 实验室 | 18页 | P2 | ⏳ 待规划 |
| | PDM 产品数据 | 14页 | P2 | ⏳ 待规划 |
| | BI 商业智能 | 13页 | P2 | ⏳ 待规划 |

#### 第一批：HRM/Finance/CRM 详细实施计划

##### HRM 人力资源模块（21页）

**导航分组规划：**
- **概览组**：仪表盘
- **人员管理组**：员工管理、公司管理、部门管理、组织架构图、职位管理
- **考勤管理组**：考勤管理、请假管理、加班管理、考勤统计
- **薪酬管理组**：薪酬管理、社保管理、公积金管理、薪酬报表
- **绩效管理组**：绩效考核、绩效指标、绩效报表
- **合同管理组**：合同管理、入职管理、离职管理
- **培训管理组**：培训计划、培训记录、培训评估
- **基础设置组**：数据字典、系统设置

**实施步骤：**

| 步骤 | 任务 | 预计工时 | 产出文件 | 状态 |
|------|------|---------|---------|------|
| 1 | V2路由配置（8大分组，21个路由） | 0.5天 | `routes/v2/hrm.ts` | ✅ |
| 2 | HRM仪表盘页标准化 | 0.5天 | `pages/hrm/HrmDashboardPage.tsx` | ✅ |
| 3 | 员工管理页标准化（列表+详情+表单） | 1天 | `pages/hrm/HrmEmployeesPage.tsx` | ✅ |
| 4 | 考勤管理页标准化 | 0.5天 | `pages/hrm/HrmAttendancePage.tsx` | ✅ |
| 5 | 薪酬管理页标准化 | 0.5天 | `pages/hrm/HrmPayrollPage.tsx` | ✅ |
| 6 | 合同管理页标准化 | 0.5天 | `pages/hrm/HrmContractsPage.tsx` | 📋 |
| 7 | 绩效管理页标准化 | 0.5天 | `pages/hrm/HrmPerformancePage.tsx` | 📋 |
| 8 | 培训管理页标准化 | 0.5天 | `pages/hrm/HrmTrainingPage.tsx` | 📋 |
| 9 | 基础设置页标准化 | 0.5天 | `pages/hrm/HrmSettingsPage.tsx` | 📋 |
| 10 | API路径规范化 | 0.5天 | `api/hrm/*.ts` | ✅ |

**验收标准：**
- 21个页面全部迁移至标准模板
- 路由-导航路径对齐测试通过
- API对接率 ≥ 90%
- 面包屑完整性 100%

---

##### Finance 财务管理模块（21页）

**导航分组规划：**
- **概览组**：仪表盘
- **总账管理组**：总账管理、凭证管理、科目管理、期初余额
- **应收管理组**：应收账款、收款管理、账龄分析
- **应付管理组**：应付账款、付款管理、供应商对账
- **税务管理组**：发票管理、税务申报、税务报表
- **费用管理组**：费用报销、费用预算、费用分析
- **成本管理组**：成本核算、成本分析、存货成本
- **报表中心组**：资产负债表、利润表、现金流量表、合并报表
- **基础设置组**：数据字典、系统设置、预算管理

**实施步骤：**

| 步骤 | 任务 | 预计工时 | 产出文件 | 状态 |
|------|------|---------|---------|------|
| 1 | V2路由配置（9大分组，21个路由） | 0.5天 | `routes/v2/finance.ts` | ✅ |
| 2 | Finance仪表盘页标准化 | 0.5天 | `pages/finance/FinanceDashboardPage.tsx` | ✅ |
| 3 | 总账管理页标准化 | 1天 | `pages/finance/FinanceLedgerPage.tsx` |
| 4 | 应收应付页标准化 | 1天 | `pages/finance/FinanceReceivablePayablePage.tsx` |
| 5 | 税务管理页标准化 | 0.5天 | `pages/finance/FinanceTaxPage.tsx` |
| 6 | 费用管理页标准化 | 0.5天 | `pages/finance/FinanceExpensePage.tsx` |
| 7 | 成本管理页标准化 | 0.5天 | `pages/finance/FinanceCostPage.tsx` |
| 8 | 报表中心页标准化 | 1天 | `pages/finance/FinanceReportsPage.tsx` |
| 9 | 基础设置页标准化 | 0.5天 | `pages/finance/FinanceSettingsPage.tsx` |
| 10 | API路径规范化 | 0.5天 | `api/finance/*.ts` | ✅ |

**验收标准：**
- 21个页面全部迁移至标准模板
- 路由-导航路径对齐测试通过
- API对接率 ≥ 90%
- 面包屑完整性 100%

---

##### CRM 客户关系模块（16页）

**导航分组规划：**
- **概览组**：仪表盘
- **客户管理组**：客户列表、客户详情、客户分类、客户标签
- **联系人管理组**：联系人列表、联系人详情
- **商机管理组**：商机列表、商机详情、商机漏斗、销售预测
- **互动管理组**：客户互动、跟进记录、活动管理
- **销售管理组**：销售订单、报价管理、合同管理
- **服务管理组**：客户服务、投诉管理、满意度调查
- **分析报表组**：客户分析、销售分析、服务分析
- **基础设置组**：数据字典、系统设置

**实施步骤：**

| 步骤 | 任务 | 预计工时 | 产出文件 | 状态 |
|------|------|---------|---------|------|
| 1 | V2路由配置（9大分组，16个路由） | 0.5天 | `routes/v2/crm.ts` | ✅ |
| 2 | CRM仪表盘页标准化 | 0.5天 | `pages/crm/DashboardPage.tsx` | ✅ |
| 3 | 客户管理页标准化 | 1天 | `pages/crm/CustomerManagementPage.tsx` | 📋 |
| 4 | 商机管理页标准化 | 0.5天 | `pages/crm/CrmOpportunitiesPage.tsx` |
| 5 | 销售管理页标准化 | 0.5天 | `pages/crm/CrmSalesPage.tsx` |
| 6 | 服务管理页标准化 | 0.5天 | `pages/crm/CrmServicePage.tsx` |
| 7 | 分析报表页标准化 | 0.5天 | `pages/crm/CrmReportsPage.tsx` |
| 8 | 基础设置页标准化 | 0.5天 | `pages/crm/CrmSettingsPage.tsx` |
| 9 | API路径规范化 | 0.5天 | `api/crm/*.ts` | ✅ |

**验收标准：**
- 16个页面全部迁移至标准模板
- 路由-导航路径对齐测试通过
- API对接率 ≥ 90%
- 面包屑完整性 100%

---

### 阶段四：收尾与优化（待开始）

| 任务 | 说明 | 优先级 | 预计工时 |
|------|------|--------|---------|
| 历史重定向清理 | 清理V3.x时代的旧路径重定向 | P2 | 1天 |
| 废弃组件清理 | 删除不再使用的旧组件和旧样式 | P2 | 2天 |
| 移动端适配检查 | 确保所有标准模板在移动端可用 | P1 | 2天 |
| 无障碍访问优化 | WCAG 2.1 AA 级别合规检查 | P2 | 2天 |
| 性能优化 | 懒加载、代码分割、首屏优化 | P1 | 3天 |

---

## 📋 开放项目追踪表

| 项目 | 模块 | 优先级 | 预计工时 | 当前进度 | 说明 |
|------|------|--------|---------|---------|------|
| 工作流可视化设计器 | Workflow | P2 | 5天 | 📋 待开始 | 可视化流程设计器 |
| 文档版本控制与协同编辑 | Document | P2 | 3天 | 📋 待开始 | 文档版本历史、协同编辑 |
| 可观测性 - 日志聚合 | Monitor | P1 | 2天 | ✅ 已完成 | Loki日志收集、日志与trace关联 |
| 可观测性 - Grafana仪表盘 | Monitor | P1 | 1天 | ✅ 已完成 | 统一仪表盘、告警规则配置 |
| 可观测性 - 链路追踪集成 | Monitor | P1 | 1天 | 🔶 70% | Jaeger链路追踪、服务依赖图、OpenTelemetry集成 |
| 移动端 API 对接 | Mobile | P2 | 3天 | ⏳ 长期任务 | 工作台/审批/任务/通知/扫码 API 对接 |
| service_client SDK 单元测试 | Backend | P2 | 1天 | 📋 待开始 | 24个服务客户端单元测试 |
| 测试覆盖率门槛 | QA | P2 | 0.5天 | 📋 待开始 | 添加测试覆盖率门槛 |
| 关键业务流程集成测试 | QA | P2 | 2天 | 📋 待开始 | 补充集成测试用例 |

---

## 🎯 V4.0 关键衡量指标

| 指标 | 现状 | 目标 |
|------|------|------|
| 导航一致性 | 单一数据源，一致性 100% | 单一数据源，一致性 100% |
| 页面模板覆盖率 | ~75% | ≥85% |
| 路径命名规范率 | 100% | 100% |
| API路径规范化 | 100% | 100% |
| 面包屑完整性 | ~85% | 100% |
| 样式方式统一 | MUI为主 + Tailwind辅助 | MUI为主 + Tailwind辅助 |
| 页面出入口明确 | ~80% | 100% |

---

## 📊 完成度统计

### 按模块（基于 2026-06-30 全面体检）

| 模块 | 后端 handler | 前端 API 文件 | 前端页面 | 导航菜单 | API对接率 | 整体完成度 |
|------|-------------|--------------|---------|---------|-----------|-----------|
| unified-core | 368 | 21 | 25 | 90% | 58% | 80% |
| HRM | 135 | 12 | 21 | 100% | 85% | 88% |
| QMS | 125 | 16 | 12 | 100% | 92% | 92% |
| LIMS | 105 | 14 | 18 | 90% | 82% | 85% |
| EHS | 126 | 17 | 15 | 90% | 100% | 88% |
| RS | 83 | 12 | 23 | 85% | 88% | 86% |
| WMS | 108 | 14 | 16 | 80% | 72% | 75% |
| ERP | 107 | 22 | 12 | 70% | 100% | 70% |
| CRM | 102 | 10 | 16 | 75% | 65% | 68% |
| Finance | 32+72 | 8 | 21 | 85% | 70% | 72% |
| PM | 73 | 16 | 10 | 70% | 100% | 60% |
| PDM | 64 | 4 | 14 | 60% | 50% | 52% |
| MES | 70 | 19 | 28 | 85% | 80% | 78% |
| BI/Analytics | - | 12 | 13 | 70% | 55% | 60% |
| SRM | 65 | - | 13 | 65% | 50% | 55% |
| SCM | 91 | 19 | 14 | 70% | 60% | 62% |
| GIS | 61 | 8 | - | 55% | 50% | 45% |
| AI | 53 | 8 | 8 | 75% | 70% | 72% |
| Workflow | 65 | 17 | 15 | 80% | 75% | 75% |
| Mobile | 75 | - | 16 | 80% | 65% | 70% |
| Plugin | 53 | 6 | - | 70% | 60% | 65% |
| LowCode | - | 10 | 11 | 65% | 55% | 55% |
| Doc | 15 | - | - | 60% | 50% | 60% |
| Integration | - | 6 | 9 | 60% | 55% | 50% |

---

## 📚 已完成历史归档

### V3.0 ✅ 已完成 (2026-06-23)
- 微服务架构基础搭建
- unified-core 核心服务 (IAM/Doc/Flow/File/Mail/IM/Notify)
- HRM/QMS/LIMS/EHS/RS 五个完整业务模块
- 基础前端框架 (React + Vite + Tailwind)
- 数据库 Schema 隔离设计

### V3.1 ✅ 已完成 (2026-06-28)
- 文档体系整合与去重
- 架构设计文档完善
- 导航系统全面修复 (P0)
- 缺失路由与页面补全 (P1)
- 前后端功能对齐

### V3.2 ✅ 已完成 (2026-06-28)
- 前后端API全面对比分析
- ERP/MES 模块完善
- SCM/WMS/SRM 供应链整合
- 工作流引擎API补全与页面增强
- AI 智能助手深度集成
- 移动端适配

### V3.4 ✅ 已完成 (2026-06-30)
- 全系统架构体检
- P0 级紧急修复（硬编码用户信息 + Mock通知数据 + 动态导航）
- P1 级架构优化（API路径规范化 + 服务间调用SDK + 移动端适配）
- NavigationRegistry 大文件拆分（5098→413行）
- QMS 路由修复

### V3.5 ✅ 核心完成 (2026-07-01)
- 技术债务清理（.bak文件、TypeScript编译错误、console.log）
- 核心模块 API 对齐完成（PM/ERP/EHS 零缺失）
- API 路径统一工具推广至 16 个核心服务
- service_client SDK 扩展至全部 24 个服务
- 测试覆盖验证通过（Rust 131个/前端 319个）

### V4.0 Phase 1-2 ✅ 已完成 (2026-06-30)
- 基础设施与标准建设完成
- 8个核心模块（IAM/Workflow/Notification/Document/Monitor/Integration/AI/Mobile）标准化改造完成

---

## � 技术债务清单

### 🔴 P0 级 - 需立即处理

| 债务项 | 数量 | 影响 | 建议方案 |
|--------|------|------|---------|
| 备份文件未清理 (.bak) | 34 个 | 代码仓库混乱，影响可维护性 | 一次性清理所有 .bak 文件 |

### 🟡 P1 级 - 近期处理

| 债务项 | 数量 | 影响 | 建议方案 |
|--------|------|------|---------|
| TypeScript any 类型 | 335 处 | 类型安全风险，编译期无法捕获错误 | 逐步替换为具体类型/泛型 |
| 后端 unwrap() 调用 | 373 处 | 运行时 panic 风险 | 替换为 proper error handling |
| 后端 expect() 调用 | 12 处 | 同上 | 替换为 match/if let + 错误处理 |
| 前端 Mock 数据 API | 18 个文件 | 数据不真实，功能验证不完整 | 逐步对接真实后端 API |
| 移动端 API 未对接 | 7 页面 | 移动端功能不可用 | 对接 workflow/task/notification API |

### 🟢 P2 级 - 逐步优化

| 债务项 | 数量 | 影响 | 建议方案 |
|--------|------|------|---------|
| console.log 调试代码 | 6 处 | 生产环境输出敏感信息 | 替换为 logger 或移除 |
| ESLint warning | 430+ 个 | 代码规范性 | 配置 auto-fix 批量修复 |
| 测试覆盖率不均 | - | 后端大部分服务测试薄弱 | 为核心服务添加集成测试 |
| 大文件/大组件 | 多处 | 可维护性差 | 按职责拆分为子组件 |
| 重复代码 | 多处 | 维护成本高 | 抽取公共组件/hooks |
| API 路径不统一 | 多处 | 前后端对接不一致 | 推广 buildApiPath 工具 |

### 📋 P3 级 - 长期规划

| 债务项 | 说明 |
|--------|------|
| 微前端架构深化 | Module Federation 各模块独立部署 |
| 服务网格 | Service Mesh 统一服务治理 |
| 国际化完善 | 多语言支持/时区/货币 |
| 安全加固 | 渗透测试/安全扫描/漏洞管理 |
| 性能优化 | 懒加载/代码分割/缓存策略 |

---

## 📊 前后端API实现对比

### 后端Rust服务统计（按 handler 数量排序）

| 服务 | API 文件数 | Handler 数量 | 主要子模块 |
|------|-----------|-------------|-----------|
| HRM | 19 | 135 | employee, department, attendance, leave, contract, payroll, performance, training |
| QMS | 14 | 125 | standard, inspection, issue, corrective_action, audit, spc, fmea, apqp |
| EHS | 15 | 126 | safety, hazard, environment, training, accident, emergency, occupational |
| ERP | 21 | 107 | finance, asset, voucher, consolidation, bank, dict, hrm_integration |
| WMS | 16 | 108 | inbound, outbound, inventory, warehouse, location, transfer, stocktake |
| LIMS | 14 | 105 | sample, inspection, instrument, reagent, barcode, test_method, uncertainty |
| CRM | 17 | 102 | customer, contact, opportunity, interaction, billing, scoring, forecast |
| SCM | 15 | 91 | supplier, purchase_order, mrp, incoming_inspection, price_comparison, evaluation |
| Mobile | 18 | 75 | auth, approval, notification, task, scan, offline, push |
| RS | 17 | 83 | project, experiment, formula, material, patent, statistics |
| GIS | 10 | 61 | device, map, geofence, location, spatial, sync, websocket |
| PDM | 13 | 64 | document, product, material, version, change_notice, workflow |
| SRM | 11 | 65 | supplier, category, contract, evaluation, performance, product |
| MES | 11 | 70 | production_order, work_station, equipment, wip, quality, traceability |
| AI | 11 | 53 | agent, analysis, document, embedding, qa, vector, multimodal |
| unified-core | 9 modules | 368 | iam, flow, file, communication, finance, billing, plugin, sync, tenant |

### 前端API模块统计（按文件数排序）

| 模块 | API 文件数 | 主要子模块 |
|------|----------|-----------|
| ERP | 22 | core(customer/supplier/material/inventory/salesOrder/purchaseOrder), finance, admin |
| SCM | 19 | supplier, purchaseOrder, mrpPlan, incomingInspection, priceComparison, evaluation |
| MES | 19 | equipment, material, productionOrder, workStation, wip, quality, traceability |
| Workflow | 17 | approval, definition, instance, task, template, category, monitor |
| EHS | 17 | accident, compliance, hazard, inspection, risk, safetyCheck, training |
| QMS | 16 | standard, inspection, issue, correctiveAction, audit, spc, fmea, apqp, dashboard |
| PM | 16 | project, budget, contract, risk, quality, acceptance, team, resource |
| WMS | 14 | inbound, outbound, inventory, warehouse, transfer, stocktake, batch, serialNumber |
| LIMS | 14 | sample, inspection, instrument, reagent, testMethod, barcode, uncertainty |
| HRM | 12 | employee, department, attendance, leave, contract, payroll, performance, training |
| CRM | 10 | customer, contact, opportunity, interaction, billing, scoring, forecast, segmentation |

### 关键发现

1. **前后端API覆盖率较高的模块（>80%）**: QMS(92%), HRM(85%), RS(88%), MES(80%), LIMS(82%)
2. **后端强但前端弱的模块**: ERP(后端183/前端55%), EHS(后端168/前端75%), PM(后端157/前端55%)
3. **前端超前于后端的模块**: MES(前端28页/后端70 handler), RS(前端23页/后端83 handler)
4. **移动端缺口**: 后端75个handler，前端16页面，约65% API对接率

---

## �� 相关文档

- [架构设计](docs/architecture/overview.md) - 系统架构总览
- [数据库设计](docs/architecture/database.md) - 数据库 Schema 设计
- [部署指南](docs/deployment-guide.md) - 部署说明
- [API 文档](docs/api/README.md) - RESTful API 接口
- [贡献指南](CONTRIBUTING.md) - 开发贡献规范
- [文档中心](docs/README.md) - 完整文档索引
- [报告与分析](docs/reports/) - 项目分析报告

---

*最后更新: 2026-07-01 | 版本: 4.0*