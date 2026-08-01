# 全栈导航与页面标准化实施方案

## 一、现状审计总览

### 1.1 基础数据统计

| 类别 | 数量 | 状态 |
|------|------|------|
| 导航模块 | 32 | ✅ 完整 |
| 路由模块 | 32 | ✅ 与导航一一对应 |
| 前端API模块 | 43 | ⚠️ 5个导航模块缺失 |
| 后端服务模块 | 26 | ⚠️ 部分模块需映射 |
| 页面总数 | 454 | ⚠️ 158个未标准化 |
| 注册图标数 | 150+ | ✅ 无字母图标 |

### 1.2 问题分类

#### ✅ 已完成
- 菜单 ↔ 路由：完全对应，无缺失
- 图标：全部为 Lucide 图标，无字母图标，已统一映射
- 导航四层模型：已到位（顶层/侧边栏/分组/面包屑）

#### ⚠️ 待解决

**A. 前端API缺失（5个模块）**

| 模块 | 导航路径 | 缺失原因 | 优先级 |
|------|----------|----------|--------|
| admin | /admin | 系统管理模块无独立API | 高 |
| asset | /asset | 资产管理模块无独立API | 中 |
| docs | /docs | 知识文档模块无独立API | 中 |
| document | /document | 文档中心模块无独立API | 中 |
| oa | /oa | 行政办公模块无独立API | 低 |

**B. 后端API映射待确认（13个模块）**

实际后端API存在但模块名不一致，需建立映射：

| 前端模块 | 后端服务 | 后端模块 | 状态 |
|----------|----------|----------|------|
| workflow | unified-core | flow | ✅ 有API，需映射 |
| iam | unified-core | iam | ✅ 有API，需映射 |
| im | unified-core | communication | ✅ 有API，需映射 |
| notification | unified-core | communication | ✅ 有API，需映射 |
| mail | unified-core | communication | ✅ 有API，需映射 |
| plugin | unified-core | plugin | ✅ 有API，需映射 |
| file | unified-core | file | ✅ 有API，需映射 |
| tenant | unified-core | tenant | ✅ 有API，需映射 |
| report | analytics | bi | ✅ 有API，需映射 |
| bi | analytics | bi | ✅ 有API，需映射 |
| finance | erp | finance | ✅ 有API，需映射 |
| admin | 多个服务 | iam+tenant | ⚠️ 分散在多处 |
| mobile | mobile | mobile | ✅ 有独立服务 |

**C. 页面未标准化（158个页面）**

分类统计：
- 测试文件：~30个（__tests__目录）
- 共享页面：~15个（shared目录、登录、错误页等）
- 移动端页面：~15个（mobile目录）
- 业务页面：~98个（需按模板标准化）

---

## 二、实施方案

### 阶段一：前端API补全（5个模块）

**目标**：为所有导航模块创建对应的前端API文件

#### 1.1 admin 模块 API

创建文件：`src/api/admin/index.ts`

包含子模块：
- `tenant.ts` - 租户管理
- `user.ts` - 用户管理
- `role.ts` - 角色管理
- `permission.ts` - 权限管理
- `dictionary.ts` - 数据字典
- `auditLog.ts` - 审计日志
- `system.ts` - 系统设置
- `monitor.ts` - 系统监控
- `database.ts` - 数据库结构
- `migration.ts` - 数据迁移

复用现有 iam API 中的部分功能，整合为统一的 admin API 模块。

#### 1.2 asset 模块 API

创建文件：`src/api/asset/index.ts`

包含子模块：
- `equipment.ts` - 设备管理
- `maintenance.ts` - 设备维护
- `vehicle.ts` - 车辆管理
- `officeSupplies.ts` - 办公用品
- `fixedAsset.ts` - 固定资产台账

复用 erp API 中的资产相关功能。

#### 1.3 docs / document 模块 API

**决策**：docs 与 document 功能重叠，建议合并为单一模块 `doc`，删除重复的导航/路由。

创建文件：`src/api/doc/index.ts`

包含子模块：
- `document.ts` - 文档管理
- `folder.ts` - 文件夹管理
- `knowledge.ts` - 知识库
- `template.ts` - 文档模板

#### 1.4 oa 模块 API

创建文件：`src/api/oa/index.ts`

包含子模块：
- `addressbook.ts` - 通讯录
- `expense.ts` - 费用报销
- `approval.ts` - 审批申请
- `meeting.ts` - 会议管理
- `notice.ts` - 公告通知

复用 erp 和 workflow 的部分功能。

---

### 阶段二：后端API映射与补全

**目标**：建立清晰的前端模块 → 后端API映射关系，确保一一对应

#### 2.1 建立模块映射表

在 `src/lib/navigation/modules/` 中新增 `moduleMapping.ts`：

```typescript
// 前端模块 → 后端服务+模块 的映射关系
export const backendModuleMapping: Record<string, { service: string; module: string }> = {
  // unified-core 服务中的模块
  workflow: { service: 'unified-core', module: 'flow' },
  iam: { service: 'unified-core', module: 'iam' },
  im: { service: 'unified-core', module: 'communication' },
  notification: { service: 'unified-core', module: 'communication' },
  plugin: { service: 'unified-core', module: 'plugin' },
  
  // analytics 服务中的模块
  bi: { service: 'analytics', module: 'bi' },
  report: { service: 'analytics', module: 'report' },
  
  // erp 服务中的模块
  finance: { service: 'erp', module: 'finance' },
  asset: { service: 'erp', module: 'fixed_asset' },
  
  // 独立服务
  ai: { service: 'ai', module: 'ai' },
  crm: { service: 'crm', module: 'crm' },
  // ... 其余模块直接对应
};
```

#### 2.2 统一 API 客户端

更新 `src/api/client.ts`，增加模块映射，自动根据前端模块名路由到正确的后端服务。

#### 2.3 补充缺失的后端API骨架

为确实缺少后端服务的模块创建最小化的 API 骨架（返回 mock 数据），保证前端可正常运行：
- integration（集成平台）
- lowcode（低代码平台）

---

### 阶段三：页面标准化（分批处理）

**目标**：将 158 个未标准化页面转换为使用统一模板的标准化页面

#### 3.1 标准化范围排除

以下页面不需要标准化：
- 测试文件（__tests__目录）
- 共享页面（shared目录：登录、错误页、个人中心等）
- 移动端页面（mobile目录，有独立的移动端设计规范）
- 特殊页面（设计器、看板、地图等非标准列表/详情页）

实际需要标准化的业务页面：约 90-100 个

#### 3.2 标准化模板分类

| 模板类型 | 适用场景 | 标准组件 |
|----------|----------|----------|
| list | 列表页 | PageLayout + DataTable + SearchForm |
| detail | 详情页 | PageLayout + DetailCard + Tabs |
| form | 表单页 | PageLayout + Form + Steps |
| dashboard | 仪表盘 | PageLayout + Grid + Charts |
| settings | 设置页 | PageLayout + Tabs + Form |
| stats | 统计页 | PageLayout + Cards + Charts |

#### 3.3 分批实施计划

**第一批（高优先级，核心业务）**：20个
- admin 模块：10个核心管理页面
- erp 模块：5个核心页面
- finance 模块：5个核心页面

**第二批（中优先级，主要业务）**：40个
- hrm/crm/scm/wms/qms/mes/lims/ehs 等模块的剩余页面
- bi/report 模块页面

**第三批（低优先级，辅助功能）**：30个
- 移动端适配页面
- 集成、低代码等边缘模块
- 文档、知识库等内容型页面

---

### 阶段四：图标统一与规范化

**目标**：确保所有模块、功能的图标统一使用 Lucide 图标，无字母图标，命名规范一致

#### 4.1 图标使用规范

| 层级 | 图标要求 | 尺寸 | 示例 |
|------|----------|------|------|
| 模块级 | 辨识度高、与业务相关 | 20px | Users, Building2, Factory |
| 功能级 | 与功能对应，风格统一 | 16px | List, Plus, Edit, Trash |
| 操作级 | 通用操作图标 | 14px | Search, Filter, Download |

#### 4.2 图标命名规范

- 统一使用 PascalCase 命名
- 禁止使用单字母图标（如 A, B, C）
- 禁止使用数字图标
- 相似功能使用相似图标族（如表相关：Table, List, ListOrdered）

#### 4.3 图标映射表维护

- `iconMapping.tsx` 作为唯一的图标注册入口
- 新增导航项时必须同时在 iconMapping 中注册图标
- CI 检查：导航配置中的图标必须存在于 iconMapping 中

---

## 三、实施顺序与时间估算

| 阶段 | 工作内容 | 工作量 | 优先级 |
|------|----------|--------|--------|
| 阶段一 | 前端API补全（5模块） | 2天 | 高 |
| 阶段二 | 后端API映射与补全 | 1天 | 高 |
| 阶段三-第一批 | 核心页面标准化（20个） | 3天 | 高 |
| 阶段三-第二批 | 主要页面标准化（40个） | 5天 | 中 |
| 阶段三-第三批 | 辅助页面标准化（30个） | 4天 | 低 |
| 阶段四 | 图标统一与规范化 | 0.5天 | 中 |
| **合计** | | **15.5天** | |

---

## 四、质量保证

### 4.1 验证标准

每完成一个模块，需通过以下验证：

1. ✅ 导航项存在且图标正确
2. ✅ 路由路径正确且可访问
3. ✅ 前端API文件存在且导出正确
4. ✅ 后端API可调用（或有mock）
5. ✅ 页面使用标准模板
6. ✅ 类型检查通过
7. ✅ 单元测试通过

### 4.2 自动化检查

- `check-icons.cjs` - 图标完整性检查
- `compare-nav-route.cjs` - 导航路由一致性检查
- `page-audit.py` - 页面标准化审计
- TypeScript 类型检查
- ESLint 代码检查

---

## 五、风险与注意事项

### 5.1 主要风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 后端API缺失导致前端无法联调 | 前端只能用mock | 先创建mock API，后端后续迭代 |
| 页面标准化改动大，易引入bug | 功能回归 | 分批实施，每批完成后测试 |
| docs与document模块合并 | 可能影响现有链接 | 保留重定向路由，逐步迁移 |
| 图标更换影响用户习惯 | 体验问题 | 保持语义相似，选择同系列图标 |

### 5.2 注意事项

1. **不破坏现有功能**：所有修改保证向后兼容
2. **先映射再补全**：先确认哪些后端API已存在，只补真正缺失的
3. **复用优先**：优先复用现有组件和API，避免重复建设
4. **渐进式推进**：按优先级分批实施，每批可独立交付
5. **保持命名一致**：模块名、文件名、API名遵循统一命名规范
