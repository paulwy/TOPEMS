# TOPEMS 前端页面重整方案

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0.0 |
| **创建日期** | 2026-06-27 |
| **适用阶段** | 页面统一布局完成后的问题修复与规范化 |
| **状态** | 规划中 |
| **维护团队** | TOPEMS 前端团队 |

---

## 一、当前状态分析

### 1.1 PageContainer 迁移进度

| 指标 | 数量 | 比例 |
|------|------|------|
| 总页面数 | 270 | 100% |
| 已使用 PageContainer | 254 | **94%** |
| 使用页面模板 | 100 | 37% |
| 合理跳过 | 16 | 6% |

### 1.2 剩余未迁移页面（16个）

| 类型 | 文件 | 说明 |
|------|------|------|
| 移动端页面 | mobile/* (8个) | 独立布局，不需要 PageContainer |
| 全屏特殊页 | LoginPage, ErrorPage | 全屏布局 |
| 设计器 | FlowDesignerPage | 全屏设计器 |
| 组件/索引 | Impage, index.tsx, EmployeeFinanceTab | 非页面 |

### 1.3 发现的问题

#### A. 页面样式不一致

| 问题类型 | 示例 | 影响 |
|----------|------|------|
| 页面头部不统一 | 某些页面使用 PageHeader，某些使用自定义头部 | 用户体验不一致 |
| 内边距不统一 | 某些页面 padding={false}，某些有自定义 padding | 视觉不一致 |
| 统计卡片样式差异 | 统计页面的卡片布局、颜色不统一 | 风格不一致 |

#### B. 导航和路由问题

| 问题类型 | 示例 | 影响 |
|----------|------|------|
| 路由与导航不匹配 | `/qms/standards` 指向 QmsQualityControlPage（不合格品管理） | 功能定位错误 |
| 导航层级混乱 | 某些模块有多级导航，某些没有 | 用户困惑 |
| 权限配置不完整 | 部分路由缺少 requiredPermissions | 安全风险 |

#### C. 技术债务

| 问题类型 | 示例 | 影响 |
|----------|------|------|
| TypeScript 类型错误 | CustomerFinanceInfo 缺少属性 | 编译警告 |
| InputProps 废弃 | MUI v6+ 移除 InputProps | 升级障碍 |
| MobileHeader 缺失 | 多个页面引用不存在的组件 | 编译错误 |

---

## 二、重整方案

### 2.1 页面规范标准（PageContainer 使用标准）

#### 标准页面（使用 PageContainer headerProps）

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

| 当前路由 | 当前页面 | 应有页面 | 修复方案 |
|----------|----------|----------|----------|
| `/qms/standards` | QmsQualityControlPage | 质量标准列表 | 创建 QmsStandardListPage 或重映射 |
| `/administration` | AdministrationDashboardPage | 行政概览 | ✅ 已修复 |
| `/qms/issues` | QmsNonconformancePage | 不合格品 | ✅ 已拆分 |

#### 导航一致性检查

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

| 问题 | 解决方案 | 工作量 |
|------|----------|--------|
| InputProps 废弃 | 迁移到 InputAdornment 或 slots | 约15个文件 |
| MobileHeader 缺失 | 恢复或移除引用 | 3个文件 |

#### 优先级 P1（代码质量）

| 问题 | 解决方案 | 工作量 |
|------|----------|--------|
| CustomerFinanceInfo 类型 | 补全类型定义 | 1个文件 |
| 废弃组件引用 | 替换或移除 | 5个文件 |

---

## 三、实施计划

### 阶段一：规范化（1天）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 制定 PageContainer 使用规范 | AI | 规范文档 |
| 编写 ESLint 规则检查 | AI | eslint 规则 |
| 创建页面模板示例 | AI | 示例代码 |
| 更新 ui-design-spec.md | AI | 规范文档 |

### 阶段二：问题修复（2天）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 修复 InputProps 问题 | AI | 无编译错误 |
| 修复 MobileHeader 问题 | AI | 无编译错误 |
| 修复 CRM 类型定义 | AI | 类型完整 |

### 阶段三：路由导航重整（2天）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 创建质量标准列表页 | AI | QmsStandardListPage |
| 更新 NavigationRegistry | AI | 导航配置正确 |
| 验证所有路由可达 | AI | 无404 |

### 阶段四：一致性检查（1天）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 页面头部一致性检查 | AI | 报告 |
| 页面模板使用检查 | AI | 报告 |
| 路由-导航一致性检查 | AI | 报告 |

---

## 四、质量标准

### 4.1 页面标准

| 检查项 | 标准 |
|--------|------|
| PageContainer 使用 | 所有业务页面必须使用 PageContainer |
| 页面标题 | 必须设置 title 属性 |
| 面包屑 | 自动从路由生成 |
| 响应式 | 适配 1024px+ 屏幕 |

### 4.2 导航标准

| 检查项 | 标准 |
|--------|------|
| 路由存在 | 每个导航项对应有效路由 |
| 权限配置 | 所有路由配置 requiredPermissions |
| 面包屑 | 与路由层级一致 |

### 4.3 代码标准

| 检查项 | 标准 |
|--------|------|
| TypeScript | 无编译错误 |
| ESLint | 无警告 |
| 组件复用 | 优先使用模板组件 |

---

## 五、工具支持

### 5.1 自动检查脚本

```bash
# 检查页面是否使用 PageContainer
node scripts/check-page-container-usage.js

# 检查路由与导航一致性
node scripts/check-routes-nav-consistency.js

# 检查 TypeScript 错误
npx tsc --noEmit
```

### 5.2 文档更新清单

- [ ] ui-design-spec.md - 更新页面布局规范
- [ ] page-refactoring-guide.md - 更新 PageContainer 使用指南
- [ ] component-migration-guide.md - 更新组件迁移文档
- [ ] README.md - 更新项目状态

---

## 六、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 导航变更影响用户体验 | 高 | 先在测试环境验证 |
| 页面布局调整影响功能 | 高 | 保留所有功能代码 |
| 路由变更导致现有链接失效 | 中 | 提供重定向或404页面 |

---

## 七、验收标准

- [ ] 所有业务页面使用 PageContainer
- [ ] TypeScript 编译无错误
- [ ] 所有路由可达且面包屑正确
- [ ] NavigationRegistry 与路由一致
- [ ] 文档更新完成
