# TOPEMS 前端页面重整方案

|项目|内容|
|---|---|
|**文档版本**|v1.1.0|
|**创建日期**|2026-06-27|
|**适用阶段**|页面统一布局完成后的问题修复与规范化|
|**状态**|✅ 已完成 V3.1/V3.2/V4.0，V4.1 进行中|
|**维护团队**|TOPEMS 前端团队|

---

## 一、当前状态分析

### 1.1 PageContainer 迁移进度

|指标|数量|比例|
|---|---|---|
|总页面数|270|100%|
|已使用 PageContainer|254|**94%**|
|使用页面模板|100|37%|
|合理跳过|16|6%|

### 1.2 剩余未迁移页面（16个）

|类型|文件|说明|
|---|---|---|
|移动端页面|mobile/* (8个)|独立布局，不需要 PageContainer|
|全屏特殊页|LoginPage, ErrorPage|全屏布局|
|设计器|FlowDesignerPage|全屏设计器|
|组件/索引|Impage, index.tsx, EmployeeFinanceTab|非页面|

### 1.3 已修复的问题

#### A. 页面样式不一致 ✅

|问题类型|状态|说明|
|---|---|---|
|页面头部不统一|✅ 已修复|所有主列表页已统一添加 pageIcon + pageGradient|
|内边距不统一|✅ 已规范|PageContainer 默认 padding 已标准化|
|统计卡片样式差异|⏳ 进行中|组件库已统一收敛，样式待进一步统一|

#### B. 导航和路由问题 ✅

|问题类型|状态|说明|
|---|---|---|
|路由与导航不匹配|✅ 已修复|QMS /qms/standards 路由已修复，创建 QmsStandardListPage|
|导航层级混乱|✅ 已规范|NavigationRegistry 已统一配置|
|权限配置不完整|✅ 已完成|所有路由已配置 requiredPermissions|
|面包屑路径错误|✅ 已修复|useAutoBreadcrumbs 重写，路径匹配算法优化|

#### C. 技术债务 ✅

|问题类型|状态|说明|
|---|---|---|
|TypeScript 类型错误|✅ 0 错误|CustomerFinanceInfo 等类型已补全|
|InputProps 废弃|✅ 无此问题|经调查不存在 InputProps 废弃问题|
|MobileHeader 缺失|✅ 已修复|3个页面 import 路径已修正|
|废弃组件清理|✅ 已清理|删除 7 个无人使用的废弃组件|
|组件库统一|✅ 已完成|mui/ 目录删除，组件全部迁移到 common/|
|ESLint 兼容性|✅ 已修复|ESLint v10 兼容配置已完成|
|代码格式统一|✅ 已优化|lint --fix 修复约 900+ 格式警告|

---

## 二、重整方案

### 2.1 页面规范标准（PageContainer 使用标准）

#### 标准页面（使用 PageContainer headerProps）

TSX

```tsx
// 标准列表/详情页
const MyListPage: React.FC = () => {
  return (
    <PageContainer
      title="页面标题"
      subtitle="页面副标题"
      headerProps={{
        pageIcon: SomeIcon,
        actions: [
          { label: '新建', icon: Plus, variant: 'contained', onClick: handleCreate },
          { label: '导出', icon: Download, variant: 'outlined', onClick: handleExport },
        ],
      }}
    >
      {/* 页面内容 */}
    </PageContainer>
  );
};
```

#### 复杂页面（保留内部布局）

TSX

```tsx
// 仪表盘、自定义布局页面
const MyDashboardPage: React.FC = () => {
  return (
    <PageContainer padding={false} maxWidth={false}>
      {/* 保留原有的自定义头部和布局 */}
      {/* 内部自行管理 padding */}
    </PageContainer>
  );
};
```

### 2.2 导航重整方案

#### 问题路由修复

|当前路由|当前页面|应有页面|修复方案|
|---|---|---|---|
|`/qms/standards`|QmsQualityControlPage|质量标准列表|创建 QmsStandardListPage 或重映射|
|`/administration`|AdministrationDashboardPage|行政概览|✅ 已修复|
|`/qms/issues`|QmsNonconformancePage|不合格品|✅ 已拆分|

#### 导航一致性检查

Plain Text

```
检查清单：
□ 核心平台模块（IAM、AI、OA、PM、RS）导航层级统一
□ 业务应用模块（CRM、SCM、SRM）导航层级统一
□ 专业套件（财务、HR、制造、质量）有明确的套件入口
□ 每个页面都有对应的导航项
□ 面包屑路径正确
```

### 2.3 技术债务清理

#### 优先级 P0（阻塞升级）

|问题|解决方案|工作量|
|---|---|---|
|InputProps 废弃|迁移到 InputAdornment 或 slots|约15个文件|
|MobileHeader 缺失|恢复或移除引用|3个文件|

#### 优先级 P1（代码质量）

|问题|解决方案|工作量|
|---|---|---|
|CustomerFinanceInfo 类型|补全类型定义|1个文件|
|废弃组件引用|替换或移除|5个文件|

---

## 三、实施进度

### ✅ 阶段一：规范化（已完成）

|任务|状态|产出|
|---|---|---|
|制定 PageContainer 使用规范|✅|规范文档|
|创建页面模板组件|✅|ListPageTemplate, FormPageTemplate 等|
|更新 ui-design-spec.md|✅|规范文档|

### ✅ 阶段二：问题修复（已完成）

|任务|状态|产出|
|---|---|---|
|修复 MobileHeader 问题|✅|无编译错误|
|修复 CRM 类型定义|✅|类型完整|
|修复 useCrmFinance 类型错误|✅|0 类型错误|
|修复 React Hooks 规则违规|✅|EquipmentOEEPage, ModuleTabs 已修复|

### ✅ 阶段三：路由导航重整（已完成）

|任务|状态|产出|
|---|---|---|
|创建质量标准列表页|✅|QmsStandardListPage|
|更新 NavigationRegistry|✅|导航配置正确，8个问题路由已修复|
|修复面包屑路径|✅|useAutoBreadcrumbs 重写|
|所有路由权限配置|✅|requiredPermissions 全覆盖|

### ✅ 阶段四：组件库统一（已完成）

|任务|状态|产出|
|---|---|---|
|MUI v6 → v9 升级|✅|已升级到 v9.1.1 + React v19.2.7|
|mui/ 组件迁移到 common/|✅|3个组件迁移完成，mui/ 目录删除|
|废弃组件清理|✅|删除 7 个无人使用的组件|
|导入路径统一|✅|29个页面35处导入统一到 @/components|
|ESLint 兼容性修复|✅|ESLint v10 兼容|

### 🔄 阶段五：视觉一致性与代码质量（进行中）

|任务|状态|产出|
|---|---|---|
|页面头部视觉一致性|✅|22个主页面统一 pageIcon + pageGradient|
|代码格式与风格优化|✅|修复约 913 个 ESLint 警告|
|文档更新|⏳ 进行中|README + 组件迁移文档|
|页面布局一致性验证|⏳ 待开始|验证报告|

---

## 四、质量标准

### 4.1 页面标准

|检查项|标准|
|---|---|
|PageContainer 使用|所有业务页面必须使用 PageContainer|
|页面标题|必须设置 title 属性|
|面包屑|自动从路由生成|
|响应式|适配 1024px+ 屏幕|

### 4.2 导航标准

|检查项|标准|
|---|---|
|路由存在|每个导航项对应有效路由|
|权限配置|所有路由配置 requiredPermissions|
|面包屑|与路由层级一致|

### 4.3 代码标准

|检查项|标准|
|---|---|
|TypeScript|无编译错误|
|ESLint|无警告|
|组件复用|优先使用模板组件|

---

## 五、工具支持

### 5.1 自动检查脚本

Bash

```bash
# 检查页面是否使用 PageContainer
node scripts/check-page-container-usage.js

# 检查路由与导航一致性
node scripts/check-routes-nav-consistency.js

# 检查 TypeScript 错误
npx tsc --noEmit
```

### 5.2 文档更新清单

- [x]  ui-design-spec.md - 更新页面布局规范
- [x]  page-refactoring-guide.md - 更新 PageContainer 使用指南
- [x]  page-unification-plan.md - 更新实施进度
- [ ]  component-migration-guide.md - 更新组件迁移文档
- [ ]  README.md - 更新项目状态

---

## 六、风险与对策

|风险|影响|对策|
|---|---|---|
|导航变更影响用户体验|高|先在测试环境验证|
|页面布局调整影响功能|高|保留所有功能代码|
|路由变更导致现有链接失效|中|提供重定向或404页面|

---

## 七、验收标准

- [x]  所有业务页面使用 PageContainer
- [x]  TypeScript 编译无错误
- [x]  所有路由可达且面包屑正确
- [x]  NavigationRegistry 与路由一致
- [x]  组件库统一收敛（mui/ 目录删除）
- [x]  页面头部视觉一致性（主页面已覆盖）
- [ ]  文档更新完成
- [ ]  ESLint 无警告