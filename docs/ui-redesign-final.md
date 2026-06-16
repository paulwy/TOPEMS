# TOPEMS UI 重构最终设计方案

## 一、设计目标

1. **统一UI技术栈**：采用纯 MUI 方案，移除 shadcn/ui 和 Tailwind CSS
2. **按类型区分风格**：不同页面类型使用独特视觉风格
3. **支持主题切换**：实现明暗主题切换功能
4. **提升用户体验**：统一的视觉风格，一致的交互模式

---

## 二、页面类型分类体系

根据内容展示形式，将所有页面分为 **5大类型**，每种类型有独特的视觉风格：

| 类型 | 图标 | 主色调 | 风格特点 | 适用模块 |
|------|------|--------|----------|----------|
| **列表数据型** | 📋 | `#3b82f6` (蓝色) | 清爽简洁，数据密集 | HRM、CRM、PM、Finance、Flow |
| **详情展示型** | 📄 | `#8b5cf6` (紫色) | 优雅精致，信息丰富 | 各模块详情页 |
| **表单录入型** | 📝 | `#22c55e` (绿色) | 专业高效，引导明确 | 创建/编辑表单 |
| **数据可视化型** | 📊 | `#f59e0b` (橙色) | 活力动感，数据驱动 | BI、Dashboard |
| **特殊交互型** | ⚡ | `#ef4444` (红色) | 个性鲜明，交互丰富 | GIS、IM、Workflow |

---

## 三、模块与页面映射表

### 3.1 前端模块统计

| 模块 | 页面数 | API文件 | 主要页面类型 |
|------|--------|---------|-------------|
| HRM (人力) | 15 | hrm.ts | 列表、详情、表单 |
| CRM (客户) | 8 | crm.ts | 列表、详情、仪表盘 |
| PM (项目) | 10 | pm.ts | 列表、详情、表单、仪表盘 |
| Finance (财务) | 12 | finance.ts | 列表、表单、报表 |
| Flow (工作流) | 8 | flow.ts | 列表、详情、设计器 |
| BI (数据) | 8 | bi.ts | 仪表盘、分析、报表 |
| RS (研发) | 13 | rs.ts | 列表、详情、表单 |
| LIMS (实验室) | 4 | lims.ts | 列表、详情 |
| QMS (质量) | 3 | qms.ts | 列表、详情 |
| EHS (安全) | 3 | ehs.ts | 列表、详情 |
| GIS (地理) | 1 | gis.ts | 地图交互 |
| IM (通讯) | 1 | im.ts | 聊天交互 |
| 其他 | 50+ | - | 混合类型 |
| **总计** | **~140** | **45个API** | - |

### 3.2 后端服务映射

| 前端模块 | 后端服务 | 端口 | 主要功能 |
|----------|----------|------|----------|
| HRM | svc/hrm | 8010 | 员工、部门、考勤、薪酬 |
| CRM | svc/crm | 8011 | 客户、商机、联系人 |
| PM | svc/pm | 8012 | 项目、合同、预算 |
| Finance | svc/erp | 8013 | 财务、凭证、资产 |
| Flow | svc/flow | 8014 | 流程、审批、实例 |
| BI | svc/bi | 8015 | 分析、报表、数据源 |
| RS | svc/rs | 8016 | 实验、配方、材料 |
| LIMS | svc/lims | 8017 | 样品、试剂、仪器 |
| QMS | svc/qms | 8018 | 质量、审核、标准 |
| EHS | svc/ehs | 8019 | 安全、风险、培训 |
| GIS | svc/gis | 8020 | 地图、设备、轨迹 |
| IM | svc/im | 8021 | 聊天、消息、房间 |
| AI | svc/ai | 8022 | 分析、文档、问答 |

---

## 四、各类型页面详细设计

### 4.1 列表数据型页面（蓝色主题）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ 🔍 搜索框 │ 🏷️ 筛选器 │ ➕ 新建 │ ⬇️ 导出         │
├─────────────────────────────────────────────────────┤
│ ┌──────┬──────┬──────┬──────┬──────┬──────────────┐│
│ │ 选择 │ 列1  │ 列2  │ 列3  │ 列4  │    操作      ││
│ ├──────┼──────┼──────┼──────┼──────┼──────────────┤│
│ │ ☑    │ ...  │ ...  │ ...  │ ...  │ 👁️ ✏️ 🗑️   ││
│ └──────┴──────┴──────┴──────┴──────┴──────────────┘│
├─────────────────────────────────────────────────────┤
│ 显示 1-20 条，共 128 条           分页控制         │
└─────────────────────────────────────────────────────┘
```

#### 核心组件

```tsx
// 搜索框 - 带蓝色主题
<TextField
  sx={{ 
    minWidth: 240,
    '& .MuiOutlinedInput-root': {
      '&:hover fieldset': { borderColor: 'primary.light' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    }
  }}
  placeholder="搜索..."
  InputProps={{
    startAdornment: <Search style={{ color: '#3b82f6', marginRight: 8 }} />
  }}
/>

// 状态标签 - 蓝色系
<Chip 
  label="在职" 
  sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 500 }} 
/>
<Chip 
  label="离职" 
  sx={{ bgcolor: '#fef2f2', color: '#dc2626' }} 
/>
```

#### 适用页面

| 页面 | 文件路径 | 类型 |
|------|----------|------|
| 员工列表 | `pages/HrmEmployeePage.tsx` | P0 |
| 客户列表 | `pages/CustomerManagementPage.tsx` | P0 |
| 项目列表 | `pages/PmProjectListPage.tsx` | P0 |
| 预算列表 | `pages/FinanceBudgetPage.tsx` | P1 |
| 审批列表 | `pages/FlowApprovalPage.tsx` | P1 |

#### 设计要点

- 默认启用排序、搜索、筛选功能
- 支持批量选择操作
- 行内操作按钮（查看/编辑/删除）
- 响应式适配移动端
- 使用 `ListPageTemplate` 模板组件

---

### 4.2 详情展示型页面（紫色主题）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ ← 返回 │ 员工详情 / 张三 │ ✏️ 编辑 │ 🗑️ 删除        │
├─────────────────────────────────────────────────────┤
│ 📊 基本信息 │ 📅 考勤记录 │ 💰 薪酬档案 │ 📝 绩效评价 │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐│
│ │ 👤 基本信息                                      ││
│ │ ┌─────┐ 姓名: 张三     部门: 技术部              ││
│ │ │ 👨‍💼│ 职位: 工程师    入职: 2023-01-15         ││
│ │ └─────┘ 邮箱: zs@xxx.com  电话: 138****8888     ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ ⬅️ 个人信息 │ 合同信息 │ 社保信息 │ 紧急联系人       │
│ ┌─────────────────────────────────────────────────┐│
│ │ ...                                             ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

#### 核心组件

```tsx
// 信息卡片 - 紫色渐变背景
<Paper sx={{
  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  color: 'white',
  borderRadius: 2,
  padding: 3,
}}>
  <Box display="flex" alignItems="center" gap={3}>
    <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
      <User style={{ width: 40, height: 40 }} />
    </Avatar>
    <Box>
      <Typography variant="h5" fontWeight={600}>张三</Typography>
      <Typography variant="body2" opacity={0.9}>高级工程师 | 技术部</Typography>
    </Box>
  </Box>
</Paper>

// 标签页 - 紫色指示器
<Tabs 
  sx={{
    '& .MuiTabs-indicator': {
      backgroundColor: '#8b5cf6',
      height: 3,
      borderRadius: 2,
    },
    '& .Mui-selected': { color: '#8b5cf6' }
  }}
>
  <Tab label="基本信息" />
  <Tab label="考勤记录" />
</Tabs>
```

#### 适用页面

| 页面 | 文件路径 | 类型 |
|------|----------|------|
| 员工详情 | `pages/HrmEmployeeDetailPage.tsx` | P0 |
| 客户详情 | `pages/CustomerDetailPage.tsx` | P0 |
| 项目详情 | `pages/PmProjectDetailPage.tsx` | P0 |
| 合同详情 | `pages/PmContractDetailPage.tsx` | P1 |

#### 设计要点

- 顶部信息卡片突出展示关键信息
- Tab标签组织多维度内容
- 侧边栏放置辅助信息或快捷操作
- 使用 `DetailPageTemplate` 模板组件

---

### 4.3 表单录入型页面（绿色主题）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ ← 返回 │ 创建员工                                   │
├─────────────────────────────────────────────────────┤
│ 🟢 必填项标记说明                                   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐│
│ │ 📝 基本信息                                      ││
│ │ ┌─────────┬─────────┬─────────┐                  ││
│ │ │ 姓名*   │ 性别    │ 出生日期│                  ││
│ │ │ [______]│ [______]│ [______]│                  ││
│ │ ├─────────┼─────────┴─────────┤                  ││
│ │ │ 身份证号*│            邮箱  │                  ││
│ │ │ [_________________] [______]│                  ││
│ │ └─────────┴───────────────────┘                  ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐│
│ │ 🏢 工作信息                                      ││
│ │ ...                                             ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│                     取消  🟢 保存                   │
└─────────────────────────────────────────────────────┘
```

#### 核心组件

```tsx
// 表单按钮 - 绿色主题
<Button 
  variant="contained"
  sx={{
    bgcolor: '#22c55e',
    '&:hover': { bgcolor: '#16a34a' },
    borderRadius: 1,
    fontWeight: 500,
  }}
  startIcon={<Save style={{ width: 18, height: 18 }} />}
>
  保存
</Button>

// 必填标记
<Typography 
  sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 1,
    color: '#22c55e',
    fontSize: '0.875rem',
    mb: 2
  }}
>
  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>*</span>
  标记为必填项
</Typography>
```

#### 适用页面

| 页面 | 文件路径 | 类型 |
|------|----------|------|
| 创建员工 | `pages/forms/CreateEmployeeForm.tsx` | P0 |
| 编辑员工 | `pages/forms/EditEmployeeForm.tsx` | P0 |
| 创建项目 | `pages/PmProjectCreatePage.tsx` | P0 |
| 凭证录入 | `pages/FinanceVoucherPage.tsx` | P1 |

#### 设计要点

- 按业务逻辑分组
- 支持字段验证和错误提示
- 折叠/展开分组功能
- 粘性底部操作栏
- 使用 `FormPageTemplate` 模板组件

---

### 4.4 数据可视化型页面（橙色主题）

#### 布局结构

```
┌─────────────────────────────────────────────────────┐
│ 📊 数据看板 │ 📅 2024年1月 │ ⬇️ 导出报表           │
├─────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │👥128│ │📈15%│ │💵2M │ │✅98%│                    │
│ │员工 │ │增长 │ │营收 │ │完成 │                    │
│ │总数 │ │率   │ │(万) │ │率   │                    │
│ └─────┘ └─────┘ └─────┘ └─────┘                    │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────┐ ┌───────────────────┐        │
│ │  📈 月度趋势图    │ │  🥧 部门分布      │        │
│ │                   │ │                   │        │
│ │  [折线图]         │ │  [饼图]           │        │
│ └───────────────────┘ └───────────────────┐        │
├─────────────────────────────────────────────────────┤
│ 📋 重点指标明细                                    │
│ ┌──────┬──────┬──────┬──────┬──────┐              │
│ │ 部门 │ 人数 │ 绩效 │ 成本 │ 状态 │              │
│ └──────┴──────┴──────┴──────┴──────┘              │
└─────────────────────────────────────────────────────┘
```

#### 核心组件

```tsx
// 统计卡片 - 橙色主题
<Card sx={{
  borderRadius: 2,
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 10px 40px rgba(245, 158, 11, 0.2)',
  }
}}>
  <CardContent>
    <Typography color="#92400e" variant="body2">员工总数</Typography>
    <Typography variant="h4" fontWeight={700} sx={{ color: '#f59e0b' }}>
      128
    </Typography>
    <Box display="flex" alignItems="center" gap={1} mt={1}>
      <TrendingUp style={{ color: '#22c55e', width: 14 }} />
      <Typography variant="caption" color="#22c55e">+15%</Typography>
    </Box>
  </CardContent>
</Card>

// 图表容器
<Paper sx={{
  borderRadius: 2,
  borderLeft: '4px solid #f59e0b',
}}>
  <Box p={3}>
    <Typography variant="subtitle1" fontWeight={600} color="#92400e">
      月度趋势
    </Typography>
    {/* 图表组件 */}
  </Box>
</Paper>
```

#### 适用页面

| 页面 | 文件路径 | 类型 |
|------|----------|------|
| BI仪表盘 | `pages/BIDashboardPage.tsx` | P0 |
| BI分析 | `pages/BIAnalyticsPage.tsx` | P1 |
| 项目仪表盘 | `pages/PmDashboardPage.tsx` | P1 |
| CRM仪表盘 | `pages/CRMDashboardPage.tsx` | P1 |

#### 设计要点

- 顶部关键指标一目了然
- 图表响应式布局
- 支持时间范围筛选
- 导出功能
- 使用 `DashboardTemplate` 模板组件

---

### 4.5 特殊交互型页面（红色主题）

#### GIS地图页面布局

```
┌─────────────────────────────────────────────────────┐
│ 🗺️ 地图监控 │ 🔍 搜索地点 │ 📍 定位              │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐    │
│ │                                             │    │
│ │         🗺️ 地图展示区域                      │    │
│ │  [📍标记点] [📍标记点] [📍标记点]            │    │
│ │                                             │    │
│ └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│ 🔴 告警: 3处异常 | 🟡 预警: 5处 | 🟢 正常: 12处    │
│ ┌─────────────────────────────────────────────┐    │
│ │ 设备列表                                      │    │
│ │ ┌────┬──────────┬──────────┬──────┐          │    │
│ │ │ 📍 │ 设备A    │ 正常     │ 查看 │          │    │
│ │ │ 🟡 │ 设备B    │ 预警     │ 查看 │          │    │
│ │ └────┴──────────┴──────────┴──────┘          │    │
│ └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

#### 核心组件

```tsx
// 状态指示器 - 红色主题
<Box sx={{
  display: 'flex',
  gap: 3,
  p: 2,
  bgcolor: '#fef2f2',
  borderRadius: 1,
}}>
  <Box display="flex" alignItems="center" gap={1}>
    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
    <Typography variant="body2">告警: 3处</Typography>
  </Box>
  <Box display="flex" alignItems="center" gap={1}>
    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
    <Typography variant="body2">预警: 5处</Typography>
  </Box>
</Box>

// 操作按钮 - 红色强调
<Button 
  variant="contained"
  sx={{
    bgcolor: '#ef4444',
    '&:hover': { bgcolor: '#dc2626' },
    borderRadius: 1,
  }}
  startIcon={<AlertTriangle style={{ width: 18, height: 18 }} />}
>
  处理告警
</Button>
```

#### 适用页面

| 页面 | 文件路径 | 类型 |
|------|----------|------|
| GIS地图 | `pages/Gispage.tsx` | P0 |
| 即时通讯 | `components/im/ChatInterface.tsx` | P1 |
| 流程设计 | `pages/WorkflowDesignerPage.tsx` | P1 |

#### 设计要点

- 个性化交互设计
- 状态实时更新
- 高效操作反馈
- 特殊组件定制

---

## 五、导航与布局系统

### 5.1 顶部导航 (TopNav)

```tsx
// TopNav.tsx - 统一导航组件
<AppBar 
  sx={{
    position: 'sticky',
    top: 0,
    zIndex: 1300,
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    boxShadow: 'none',
  }}
>
  <Container maxWidth="xl">
    <Box display="flex" alignItems="center" justifyContent="space-between">
      {/* Logo */}
      <Box display="flex" alignItems="center" gap={2}>
        <Box sx={{ width: 36, height: 36, bgcolor: 'primary.main', borderRadius: 1 }}>
          <Building style={{ width: 20, height: 20, color: 'white', margin: 'auto' }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>TOPEMS</Typography>
      </Box>

      {/* 导航菜单 */}
      <Box display="flex" gap={1}>
        {navItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => handleNavigate(item.path)}
            sx={{
              color: currentPath === item.path ? 'primary.main' : 'text.secondary',
              fontWeight: currentPath === item.path ? 600 : 400,
              '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      {/* 右侧操作 */}
      <Box display="flex" alignItems="center" gap={2}>
        <IconButton onClick={toggleTheme}>
          {mode === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
        <IconButton>
          <Bell />
        </IconButton>
        <Avatar sx={{ bgcolor: 'secondary.main' }}>
          <User />
        </Avatar>
      </Box>
    </Box>
  </Container>
</AppBar>
```

### 5.2 导航分组配置

| 顶部菜单 | 下拉子模块 |
|---------|-----------|
| **首页** | 仪表盘、最近访问、快捷入口、待办事项 |
| **人力** | 员工、部门、考勤、薪酬、绩效、招聘、培训、合同 |
| **客户** | 客户、商机、联系人、交互、评分、预测 |
| **项目** | 项目列表、新建项目、合同管理、模板库、项目报表 |
| **数据** | 分析仪表盘、报表中心、数据源管理、可视化编辑器 |
| **运营** | 资产台账、设备管理、行政综合、办公用品、车辆、会议室 |
| **工作流** | 审批中心、实例监控、版本管理、流程统计 |
| **协作** | 即时通讯、邮件、文件管理、AI助手 |
| **更多 ▾** | 研发创新(LIMS/RS/PDM)、质量安全(QMS/EHS)、供应链(SRM)、地理信息(GIS)、系统管理、帮助 |

### 5.3 模块Tab标签页 (ModuleTabs)

```tsx
// ModuleTabs.tsx - 模块内导航
<Tabs 
  variant="scrollable"
  scrollButtons="auto"
  sx={{
    borderBottom: 1,
    borderColor: 'divider',
    px: 2,
  }}
>
  {tabs.map((tab) => (
    <Tab
      key={tab.id}
      label={tab.label}
      icon={tab.icon}
      badge={tab.badge}
      sx={{
        textTransform: 'none',
        fontWeight: 500,
        minWidth: 'auto',
        px: 3,
      }}
    />
  ))}
</Tabs>
```

---

## 六、主题切换系统

### 6.1 主题Hook

```typescript
// src/hooks/useTheme.ts
import { useState, useCallback, useEffect } from 'react';
import { createCustomTheme } from '../theme';
import { PaletteMode } from '@mui/material';

export const useTheme = () => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as PaletteMode) || 'light';
  });

  const theme = createCustomTheme(mode);

  const toggleTheme = useCallback(() => {
    const newMode: PaletteMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return { theme, mode, toggleTheme };
};
```

### 6.2 主题切换组件

```tsx
// 主题切换按钮
<IconButton 
  onClick={toggleTheme}
  sx={{
    borderRadius: 1,
    bgcolor: 'action.hover',
    '&:hover': { bgcolor: 'action.active' },
  }}
>
  {mode === 'dark' ? (
    <Sun style={{ width: 20, height: 20 }} />
  ) : (
    <Moon style={{ width: 20, height: 20 }} />
  )}
</IconButton>
```

### 6.3 深色模式配色

| 元素 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 背景 | `#f8fafc` | `#111827` |
| 纸张 | `#ffffff` | `#1f2937` |
| 文字主色 | `#1e293b` | `#f9fafb` |
| 文字次色 | `#64748b` | `#9ca3af` |
| 边框 | `#e2e8f0` | `#374151` |

---

## 七、MUI 最佳实践

### 7.1 布局规范

| 布局类型 | MUI组件 | 使用场景 |
|----------|---------|----------|
| 页面容器 | `<Box maxWidth="xl" mx="auto" p={3}>` | 全局页面布局 |
| 卡片布局 | `<Card> + <CardContent>` | 信息展示卡片 |
| 表单布局 | `<Grid container spacing={2}>` | 表单字段排列 |
| 响应式 | `<Grid xs={12} sm={6} md={4}>` | 多列自适应 |

### 7.2 组件复用策略

```
components/
├── mui/              # MUI增强组件
│   ├── DataGrid.tsx      # 表格增强
│   ├── FilterBar.tsx     # 筛选栏
│   ├── SearchInput.tsx   # 搜索输入
│   ├── ActionBar.tsx     # 操作栏
│   ├── StatCard.tsx      # 统计卡片
│   ├── EmptyState.tsx    # 空状态
│   ├── LoadingState.tsx  # 加载状态
│   └── index.ts
├── templates/         # 页面模板
│   ├── ListPageTemplate.tsx
│   ├── DetailPageTemplate.tsx
│   ├── FormPageTemplate.tsx
│   ├── DashboardTemplate.tsx
│   ├── PageHeader.tsx
│   └── index.ts
└── layout/           # 布局组件
    ├── TopNav.tsx
    ├── ModuleTabs.tsx
    ├── NavDropdown.tsx
    ├── GlobalLayout.tsx
    ├── MobileNav.tsx
    └── index.ts
```

### 7.3 样式规范

**使用 sx prop 替代 className：**

```tsx
// 推荐
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
  {/* 内容 */}
</Box>

// 不推荐（已移除Tailwind）
<Box className="flex items-center gap-2 p-3">
  {/* 内容 */}
</Box>
```

**间距系统：**

| Token | 值 | 使用场景 |
|-------|-----|----------|
| `xs` | 4px | 紧凑间距 |
| `sm` | 8px | 小间距 |
| `md` | 16px | 标准间距 |
| `lg` | 24px | 大间距 |
| `xl` | 32px | 特大间距 |

---

## 八、实施计划

### 8.1 阶段规划

| 阶段 | 任务 | 时间 | 状态 |
|------|------|------|------|
| **阶段1** | 基础设施完善 | Week 1-2 | ✅ 完成 |
| | - 主题系统完善 | | ✅ |
| | - 模板组件优化 | | ✅ |
| | - 组件复用规范 | | ✅ |
| **阶段2** | 核心模块迁移 | Week 3-6 | 🔵 待开始 |
| | - HRM模块重构 | Week 3-4 | 🔵 |
| | - CRM模块重构 | Week 4-5 | 🔵 |
| | - PM模块重构 | Week 5-6 | 🔵 |
| | - Finance模块重构 | Week 6 | 🔵 |
| **阶段3** | 扩展模块迁移 | Week 7-10 | 🔵 待开始 |
| | - BI数据分析模块 | Week 7-8 | 🔵 |
| | - Flow工作流模块 | Week 8-9 | 🔵 |
| | - RS/LIMS/QMS/EHS | Week 9-10 | 🔵 |
| **阶段4** | 清理与优化 | Week 11-12 | 🔵 待开始 |
| | - 移除遗留依赖 | | 🔵 |
| | - 代码审查 | | 🔵 |
| | - 性能优化 | | 🔵 |
| | - 文档完善 | | 🔵 |

### 8.2 实施清单

| 任务 | 进度 | 优先级 |
|------|------|--------|
| 主题系统完善 | 🟢 完成 | P0 |
| 列表页模板优化 | 🟢 完成 | P0 |
| 详情页模板优化 | 🟢 完成 | P0 |
| 表单页模板优化 | 🟢 完成 | P0 |
| 仪表盘模板优化 | 🟢 完成 | P0 |
| 主题切换功能 | 🟡 进行中 | P0 |
| HRM模块重构 | 🔵 待开始 | P0 |
| CRM模块重构 | 🔵 待开始 | P0 |
| PM模块重构 | 🔵 待开始 | P0 |
| BI模块重构 | 🔵 待开始 | P1 |
| GIS/IM/Flow重构 | 🔵 待开始 | P1 |

---

## 九、验收标准

### 9.1 代码质量

- TypeScript 类型完整，无 any 类型
- ESLint 检查通过
- 代码格式统一
- 组件可复用性高

### 9.2 视觉一致性

- 所有页面使用统一的设计Token
- 颜色、字体、间距符合规范
- 各类型页面风格独特但协调
- 深色模式完美支持

### 9.3 功能完整性

- 所有原有功能正常工作
- 表单验证正常
- 数据加载和刷新正常
- 错误处理正常

### 9.4 性能

- 页面加载时间 < 2s
- 首屏渲染时间 < 1s
- 无内存泄漏
- 无不必要的重渲染

---

## 十、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 迁移周期长 | 业务迭代受影响 | 分模块渐进式迁移 |
| 功能回归 | 用户体验下降 | 完整的测试用例 |
| 样式不一致 | 视觉体验差 | 建立设计评审机制 |
| 团队学习成本 | 开发效率下降 | 编写详细文档和示例 |

---

## 十一、附录

### A. 文件结构

```
apps/web/src/
├── theme/
│   ├── tokens.ts          # 设计Token
│   ├── theme.ts           # MUI主题配置
│   └── index.ts           # 导出
├── components/
│   ├── layout/            # 布局组件
│   │   ├── TopNav.tsx
│   │   ├── NavDropdown.tsx
│   │   ├── ModuleTabs.tsx
│   │   ├── GlobalLayout.tsx
│   │   ├── MobileNav.tsx
│   │   └── index.ts
│   ├── templates/         # 页面模板
│   │   ├── ListPageTemplate.tsx
│   │   ├── DetailPageTemplate.tsx
│   │   ├── FormPageTemplate.tsx
│   │   ├── DashboardTemplate.tsx
│   │   ├── PageHeader.tsx
│   │   └── index.ts
│   ├── mui/               # MUI增强组件
│   │   ├── DataGrid.tsx
│   │   ├── FilterBar.tsx
│   │   ├── SearchInput.tsx
│   │   ├── ActionBar.tsx
│   │   ├── StatCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingState.tsx
│   │   └── index.ts
│   └── ai/                # AI组件
│       ├── FloatingAIHelper.tsx
│       ├── AIHelperButton.tsx
│       ├── AIToolsPanel.tsx
│       └── index.ts
├── hooks/
│   ├── useTopNav.ts       # 导航状态
│   ├── useAIContext.ts    # AI上下文
│   └── useTheme.ts        # 主题切换
├── config/
│   └── navigation.ts      # 导航配置
└── pages/
    └── (各模块页面)
```

### B. 参考资源

- [MUI 官方文档](https://mui.com/)
- [MUI X (Data Grid, Date Pickers)](https://mui.com/x/)
- [Material Design 3](https://m3.material.io/)
- [React Hook Form](https://react-hook-form.com/)
- [Lucide React Icons](https://lucide.dev/)

### C. 相关文档

- [UI系统重构实施方案](./ui-system-redesign.md)
- [UI重构设计方案](./ui-redesign-design.md)
- [设计系统](./design-system.md)