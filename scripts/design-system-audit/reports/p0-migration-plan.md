# TOPEMS P0 模块页面模板迁移方案

> 生成时间：2026-08-21T06:14:19.533Z
> 范围：MES / WMS / ERP 三个 P0 模块中未使用标准模板的页面
> 数据来源：scripts/design-system-audit/reports/p0-migration-analysis.json

---

## 1. 总体概况

| 指标 | 数值 |
|------|------|
| P0 未使用模板页面总数 | **31** |
| 涉及模块 | MES、WMS、ERP |
| 高复杂度页面 | 21 |
| 中复杂度页面 | 9 |
| 低复杂度页面 | 1 |
| 预估总工作量 | 51.5 - 103.0 人天（约 77.3 人天） |

### 1.1 按模块分布

| 模块 | 页面数 | 高/中/低复杂度 |
|------|--------|----------------|
| ERP | 4 | 高 4 / 中 0 / 低 0 |
| MES | 14 | 高 11 / 中 2 / 低 1 |
| WMS | 13 | 高 6 / 中 7 / 低 0 |

### 1.2 推荐模板分布

| 推荐模板 | 页面数 |
|----------|--------|
| crud / list | 15 |
| stats | 8 |
| detail | 6 |
| dashboard | 1 |
| kanban | 1 |

---

## 2. 迁移策略总览

### 2.1 整体原则

1. **先低后高**：先完成低复杂度页面（1 个），建立迁移范例；再处理中复杂度（9 个）；最后攻克高复杂度（21 个）。
2. **按模块集中处理**：建议同一模块内连续迁移，便于发现共性问题并抽象公共组件。
3. **保留业务逻辑**：迁移只调整页面结构和组件使用方式，不改动 API 层和数据模型。
4. **分步验收**：每迁移 3-5 个页面进行一次设计走查和回归测试。

### 2.2 推荐迁移顺序

| 阶段 | 目标页面 | 周期 | 验收标准 |
|------|----------|------|----------|
| 第 1 阶段 | 低复杂度 + 部分中复杂度页面 | 1 周 | 完成 5-6 页，建立迁移范例 |
| 第 2 阶段 | MES 中低复杂度页面 | 1-2 周 | MES 完成 50% |
| 第 3 阶段 | WMS 中低复杂度页面 | 1-2 周 | WMS 完成 50% |
| 第 4 阶段 | ERP 全部 + 剩余 MES/WMS | 1-2 周 | P0 模块完成 100% |
| 第 5 阶段 | 高复杂度页面（图表/多 Tab/Dialog 密集） | 2-3 周 | 全部完成并通过走查 |

### 2.3 通用迁移步骤

每页迁移建议按以下步骤执行：

1. **备份与基线**：复制当前页面为 .backup.tsx，记录当前行为。
2. **选择模板**：根据页面类型选择 DashboardTemplate / StatsPageTemplate / CrudPage / ListPageTemplate。
3. **调整页面根结构**：使用 PageContainer 包裹，按模板要求组织 PageHeader、内容区、操作区。
4. **替换表格**：MUI Table → DataTable（直接替换或接入 CrudPage）。
5. **替换按钮**：MUI Button → ActionButton。
6. **整理表单/弹窗**：Dialog 表单迁移为 CrudPage 的 create/edit 或独立 FormPageTemplate。
7. **整理图表**：将图表封装为 StatCardComponent / ChartCardComponent。
8. **替换硬编码样式**：颜色/间距/字号改为 designTokens / semanticTokens。
9. **回归测试**：验证数据加载、筛选、导出、弹窗、移动端等核心流程。
10. **设计走查**：确认视觉一致性和交互完整性。

---

## 3. 逐页迁移方案

## ERP 模块（4 个页面）

### AuditLogPage

- **文件路径**：apps/web/src/pages/erp/AuditLogPage.tsx
- **代码行数**：753 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 已使用 |
| Form 控件 | 已使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, TablePagination, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,  |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Dialog 表单迁移为 CrudPage 的 create/edit 能力或独立 FormPageTemplate
5. 将 MUI Button 替换为 ActionButton
6. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 弹窗交互逻辑需完整回归

---

### DatabaseManagementPage

- **文件路径**：apps/web/src/pages/erp/DatabaseManagementPage.tsx
- **代码行数**：1103 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 已使用 |
| Form 控件 | 已使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, TablePagination, Tabs, Tab, LinearProgress, Card, CardContent, InputAdornment,  |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
5. 将 Dialog 表单迁移为 CrudPage 的 create/edit 能力或独立 FormPageTemplate
6. 将 MUI Button 替换为 ActionButton
7. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 弹窗交互逻辑需完整回归

---

### FinancialAnalysisPage

- **文件路径**：apps/web/src/pages/erp/FinancialAnalysisPage.tsx
- **代码行数**：814 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 未使用 |
| Form 控件 | 已使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, InputLabel, Select, MenuItem, FormControl, Button, Tabs, Tab, Chip,  |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
3. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
4. 将图表封装为 StatCardComponent / ChartCardComponent
5. 将 MUI Button 替换为 ActionButton
6. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性

---

### FinancialReportPage

- **文件路径**：apps/web/src/pages/erp/FinancialReportPage.tsx
- **代码行数**：938 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 未使用 |
| Form 控件 | 已使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress,  |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
5. 将图表封装为 StatCardComponent / ChartCardComponent
6. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性

---

## MES 模块（14 个页面）

### AnomalyDetectionPage

- **文件路径**：apps/web/src/pages/mes/AnomalyDetectionPage.tsx
- **代码行数**：845 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 已使用 |
| Form 控件 | 已使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 已使用 |
| useQuery 数量 | 4 |
| useMutation 数量 | 2 |
| 主要 MUI 组件 | Box, Button, Card, CardContent, CardHeader, Chip, Grid, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Typography, Alert, AlertTitle, LinearProgress, Switch, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,  |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
5. 将 Dialog 表单迁移为 CrudPage 的 create/edit 能力或独立 FormPageTemplate
6. 将 MUI Button 替换为 ActionButton
7. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 弹窗交互逻辑需完整回归

---

### ApsSchedulingPage

- **文件路径**：apps/web/src/pages/mes/ApsSchedulingPage.tsx
- **代码行数**：1069 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 已使用 |
| Form 控件 | 已使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 已使用 |
| useQuery 数量 | 2 |
| useMutation 数量 | 1 |
| 主要 MUI 组件 | Box, Typography, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel, Chip, LinearProgress, Alert, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Dialog, DialogTitle, DialogContent, DialogActions,  |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
5. 将 Dialog 表单迁移为 CrudPage 的 create/edit 能力或独立 FormPageTemplate
6. 将图表封装为 StatCardComponent / ChartCardComponent
7. 将 MUI Button 替换为 ActionButton
8. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 弹窗交互逻辑需完整回归

---

### EnergyManagementPage

- **文件路径**：apps/web/src/pages/mes/EnergyManagementPage.tsx
- **代码行数**：550 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 已使用 |
| useQuery 数量 | 4 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Button, Card, CardContent, CardHeader, Chip, Grid, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Typography, Alert, AlertTitle,  |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
5. 将图表封装为 StatCardComponent / ChartCardComponent
6. 将 MUI Button 替换为 ActionButton
7. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性

---

### ProductionCostPage

- **文件路径**：apps/web/src/pages/mes/ProductionCostPage.tsx
- **代码行数**：587 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 已使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 已使用 |
| useQuery 数量 | 3 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Button, Card, CardContent, CardHeader, Chip, Grid, Input, Select, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Typography,  |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将 Tabs 内容拆分为独立子组件，按模板 slot 组织
5. 将图表封装为 StatCardComponent / ChartCardComponent
6. 将 MUI Button 替换为 ActionButton
7. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性

---

### index

- **文件路径**：apps/web/src/pages/mes/ProductionDashboardPage/index.tsx
- **代码行数**：787 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Divider, FormControlLabel, Switch, Button, Stack, Tooltip, Typography, Paper,  |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将 MUI Button 替换为 ActionButton
5. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性

---

### MesCapacityUtilizationPage

- **文件路径**：apps/web/src/pages/mes/analytics/MesCapacityUtilizationPage.tsx
- **代码行数**：251 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### MesDeliveryAnalyticsPage

- **文件路径**：apps/web/src/pages/mes/analytics/MesDeliveryAnalyticsPage.tsx
- **代码行数**：266 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### MesEnergyCostPage

- **文件路径**：apps/web/src/pages/mes/analytics/MesEnergyCostPage.tsx
- **代码行数**：211 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### MesEquipmentMtbfPage

- **文件路径**：apps/web/src/pages/mes/analytics/MesEquipmentMtbfPage.tsx
- **代码行数**：214 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### MesOeeDashboardPage

- **文件路径**：apps/web/src/pages/mes/analytics/MesOeeDashboardPage.tsx
- **代码行数**：168 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：dashboard

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 DashboardTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### MesQualityParetoPage

- **文件路径**：apps/web/src/pages/mes/analytics/MesQualityParetoPage.tsx
- **代码行数**：196 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### constants

- **文件路径**：apps/web/src/pages/mes/ProductionDashboardPage/constants.tsx
- **代码行数**：72 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

### ProductionKanbanPage

- **文件路径**：apps/web/src/pages/mes/ProductionKanbanPage.tsx
- **代码行数**：583 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：kanban

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 已使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 已使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider,  |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 将 MUI Table 替换为 DataTable 或接入 CrudPage 的列表能力
3. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 风险较低

---

### QualityTraceabilityPage

- **文件路径**：apps/web/src/pages/mes/QualityTraceabilityPage.tsx
- **代码行数**：45 行
- **复杂度**：低
- **预估工作量**：0.5-1 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 1 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 风险较低

---

## WMS 模块（13 个页面）

### WmsAbcAnalysisPage

- **文件路径**：apps/web/src/pages/wms/analytics/WmsAbcAnalysisPage.tsx
- **代码行数**：187 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### WmsAgeParetoPage

- **文件路径**：apps/web/src/pages/wms/analytics/WmsAgeParetoPage.tsx
- **代码行数**：124 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### WmsFlowTrendPage

- **文件路径**：apps/web/src/pages/wms/analytics/WmsFlowTrendPage.tsx
- **代码行数**：189 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### WmsInventoryTurnoverPage

- **文件路径**：apps/web/src/pages/wms/analytics/WmsInventoryTurnoverPage.tsx
- **代码行数**：116 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### WmsLocationUtilizationPage

- **文件路径**：apps/web/src/pages/wms/analytics/WmsLocationUtilizationPage.tsx
- **代码行数**：115 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### WmsOrderFulfillmentPage

- **文件路径**：apps/web/src/pages/wms/analytics/WmsOrderFulfillmentPage.tsx
- **代码行数**：193 行
- **复杂度**：高
- **预估工作量**：2-4 天
- **推荐模板**：crud / list

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 页面复杂度高，建议分阶段迁移
- 图表依赖需确认与模板图表组件兼容性
- 缺少 PageContainer，需同步调整布局

---

### InventoryReportPage

- **文件路径**：apps/web/src/pages/wms/InventoryReportPage.tsx
- **代码行数**：278 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：stats

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 已使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 已使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 5 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | Box |

**迁移步骤：**

1. 将页面外层替换为 StatsPageTemplate
2. 保留 PageContainer 作为内容容器，或根据模板要求调整布局层级
3. 将图表封装为 StatCardComponent / ChartCardComponent
4. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 图表依赖需确认与模板图表组件兼容性
- 数据查询多，迁移后需验证缓存策略

---

### WmsInboundDetailPage

- **文件路径**：apps/web/src/pages/wms/WmsInboundDetailPage.tsx
- **代码行数**：197 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：detail

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

### WmsInventoryMovementDetailPage

- **文件路径**：apps/web/src/pages/wms/WmsInventoryMovementDetailPage.tsx
- **代码行数**：183 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：detail

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

### WmsOutboundDetailPage

- **文件路径**：apps/web/src/pages/wms/WmsOutboundDetailPage.tsx
- **代码行数**：123 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：detail

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

### WmsStockTakeDetailPage

- **文件路径**：apps/web/src/pages/wms/WmsStockTakeDetailPage.tsx
- **代码行数**：158 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：detail

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

### WmsTransferDetailPage

- **文件路径**：apps/web/src/pages/wms/WmsTransferDetailPage.tsx
- **代码行数**：125 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：detail

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

### WmsWavePickDetailPage

- **文件路径**：apps/web/src/pages/wms/WmsWavePickDetailPage.tsx
- **代码行数**：159 行
- **复杂度**：中
- **预估工作量**：1-2 天
- **推荐模板**：detail

**当前结构特征：**

| 特征 | 状态 |
|------|------|
| PageContainer | 未使用 |
| MUI Table | 未使用 |
| DataTable | 未使用 |
| Tabs | 未使用 |
| Dialog | 未使用 |
| Form 控件 | 未使用 |
| 图表 | 未使用 |
| Card / Grid 布局 | 未使用 |
| useQuery 数量 | 0 |
| useMutation 数量 | 0 |
| 主要 MUI 组件 | - |

**迁移步骤：**

1. 将页面外层替换为 CrudPage / ListPageTemplate
2. 补充 PageContainer 作为页面根容器
3. 将硬编码颜色/间距替换为 designTokens / semanticTokens

**风险与注意事项：**

- 缺少 PageContainer，需同步调整布局

---

## 4. 关键共性问题

基于 31 个 P0 页面的分析，发现以下共性：

### 4.1 表格未统一

- 21 个页面使用 MUI Table，仅少量使用 DataTable
- **建议**：统一迁移到 DataTable 或通过 CrudPage 使用列表能力

### 4.2 自定义 Dashboard/Stats 页面多

- MES analytics 页面、WMS analytics 页面多为统计报表
- **建议**：统一使用 StatsPageTemplate，图表使用 ChartCardComponent

### 4.3 Detail 页面分散

- WMS 多个 Detail 页面（Inbound/Outbound/Transfer 等）结构相似
- **建议**：抽象为统一的 DetailLayout 或接入 CrudPage 详情能力

### 4.4 硬编码样式

- 多个页面直接使用 designTokens.colors.xxx 或硬编码颜色
- **建议**：统一使用 semanticTokens，便于主题切换

### 4.5 弹窗表单

- AnomalyDetectionPage、ApsSchedulingPage 等使用 Dialog 承载表单
- **建议**：评估是否迁移为 CrudPage 的编辑能力或独立 FormPageTemplate

---

## 5. 实施建议

### 5.1 人员安排

| 角色 | 人数 | 职责 |
|------|------|------|
| 前端开发 | 2-3 人 | 执行页面迁移 |
| 设计师 | 1 人 | 走查和视觉验收 |
| QA | 1 人 | 回归测试 |

### 5.2 时间节点

- 第 1 周：完成低复杂度 + 5 个中复杂度页面
- 第 2-3 周：完成 MES/WMS 大部分中低复杂度页面
- 第 4-5 周：完成 ERP 全部 + 剩余 MES/WMS
- 第 6-7 周：完成高复杂度页面和整体回归

### 5.3 验收标准

- [ ] 31 个 P0 页面全部使用标准模板
- [ ] 无 MUI Table 直接用于数据列表（特殊布局除外）
- [ ] 所有页面均使用 PageContainer
- [ ] 无 P0/P1 级回归 Bug
- [ ] 设计走查通过率达到 100%

---

## 6. 附录

### 6.1 相关脚本与文档

- 扫描脚本：scripts/design-system-audit/scan.mjs
- P0 分析脚本：scripts/design-system-audit/analyze-p0-migration.mjs
- 分析数据：scripts/design-system-audit/reports/p0-migration-analysis.json
- 总体迁移清单：scripts/design-system-audit/reports/migration-list.md
- 实施规划：design-system-implementation-plan.md

### 6.2 模板选型速查

| 页面类型 | 推荐模板 | 备注 |
|----------|----------|------|
| 统计看板 / 报表 | StatsPageTemplate | 含图表卡片 |
| 数据列表 / CRUD | CrudPage / ListPageTemplate | 优先 CrudPage |
| 详情展示 | DetailPageTemplate / CrudPage detail | 数据量小用 DetailPageTemplate |
| 看板 | KanbanPageTemplate | 状态流转 |
| Dashboard 入口 | DashboardTemplate | 首页/概览 |

---

*本方案基于代码扫描结果自动生成，具体迁移前需结合业务需求和页面实际交互进行人工复核。*
