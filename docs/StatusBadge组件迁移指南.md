# StatusBadge组件迁移指南

## 一、迁移背景

为了消除组件重复定义、统一组件规范、增强组件能力，我们将分散在`common/`、`dashboard/`、`hrm/`三个目录的StatusBadge组件合并为一个统一的增强版组件。

## 二、新组件特性

### 2.1 核心特性

| 特性 | 说明 |
|------|------|
| **动态颜色映射** | 支持自定义statusMap配置 |
| **图标集成** | 支持显示状态图标 |
| **多种尺寸** | sm、md、lg三种尺寸 |
| **多种变体** | filled、outlined、soft三种变体 |
| **点击事件** | 支持可点击状态徽章 |
| **预设配置** | 80+种预设状态配置 |
| **便捷组件** | 提供业务专用便捷组件 |

### 2.2 预设状态配置

新组件提供了80+种预设状态配置，覆盖以下业务场景：

- ✅ 通用状态（active、inactive、pending、approved、rejected等）
- ✅ HRM状态（员工、考勤、请假、薪酬、绩效）
- ✅ CRM状态（客户、商机）
- ✅ 项目状态（planning、active、completed等）
- ✅ 工作流状态（draft、pending、approved等）
- ✅ 财务状态（draft、pending、approved、posted等）
- ✅ Dashboard模块状态（online、beta、plan、new）

## 三、迁移步骤

### 3.1 从common/StatusBadge迁移

**旧代码**:
```tsx
import { StatusBadge } from '@/components/common/StatusBadge';

<StatusBadge status="active" />
<StatusBadge status="custom" statusMap={{ custom: { label: "自定义", color: "success" } }} />
```

**新代码**:
```tsx
import { StatusBadge } from '@/components/common/StatusBadge';

// 完全兼容，无需修改
<StatusBadge status="active" />
<StatusBadge status="custom" statusMap={{ custom: { label: "自定义", color: "success", icon: <Star /> } }} />

// 新增功能：显示图标
<StatusBadge status="active" showIcon />

// 新增功能：自定义尺寸和变体
<StatusBadge status="active" size="lg" variant="soft" />

// 新增功能：可点击
<StatusBadge status="pending" clickable onClick={handleClick} />
```

### 3.2 从dashboard/StatusBadge迁移

**旧代码**:
```tsx
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import type { ModuleStatus } from '@/components/dashboard/StatusBadge';

<StatusBadge status="online" mobile={false} isDarkMode={true} />
```

**新代码**:
```tsx
import { ModuleStatusBadge } from '@/components/common/StatusBadge';

// 使用便捷组件
<ModuleStatusBadge status="module_online" showIcon />

// 或者使用通用组件
<StatusBadge status="module_online" showIcon />

// 注意：新组件使用MUI Chip，不再支持Tailwind CSS样式
// 如果需要暗色模式，可以通过主题系统实现
```

### 3.3 从hrm/StatusBadge迁移

**旧代码**:
```tsx
import { StatusBadge, AttendanceStatusBadge, LeaveStatusBadge } from '@/components/hrm/StatusBadge';

<StatusBadge status="active" category="employee" showIcon />
<AttendanceStatusBadge status="normal" />
<LeaveStatusBadge status="pending" />
```

**新代码**:
```tsx
import {
  StatusBadge,
  EmployeeStatusBadge,
  AttendanceStatusBadge,
  LeaveStatusBadge
} from '@/components/common/StatusBadge';

// 使用便捷组件（完全兼容）
<EmployeeStatusBadge status="employee_active" showIcon />
<AttendanceStatusBadge status="attendance_normal" showIcon />
<LeaveStatusBadge status="leave_pending" showIcon />

// 或者使用通用组件
<StatusBadge status="employee_active" showIcon />
<StatusBadge status="attendance_normal" showIcon />
<StatusBadge status="leave_pending" showIcon />
```

## 四、API对比

### 4.1 Props对比

| 属性 | 旧版(common) | 旧版(dashboard) | 旧版(hrm) | 新版 |
|------|-------------|----------------|----------|------|
| status | ✅ | ✅ | ✅ | ✅ |
| statusMap | ✅ | ❌ | ❌ | ✅ |
| label | ✅ | ❌ | ❌ | ✅ |
| useChip | ✅ | ❌ | ❌ | ✅ |
| size | ✅ | ❌ | ❌ | ✅ (sm/md/lg) |
| mobile | ❌ | ✅ | ❌ | ❌ (已移除) |
| isDarkMode | ❌ | ✅ | ❌ | ❌ (使用主题系统) |
| category | ❌ | ❌ | ✅ | ❌ (已移除) |
| variant | ❌ | ❌ | ✅ | ✅ (filled/outlined/soft) |
| showIcon | ❌ | ❌ | ✅ | ✅ |
| color | ❌ | ❌ | ❌ | ✅ |
| icon | ❌ | ❌ | ❌ | ✅ |
| clickable | ❌ | ❌ | ❌ | ✅ |
| onClick | ❌ | ❌ | ❌ | ✅ |
| disabled | ❌ | ❌ | ❌ | ✅ |
| sx | ❌ | ❌ | ❌ | ✅ |
| render | ❌ | ❌ | ❌ | ✅ |

### 4.2 状态值映射

| 旧状态值 | 新状态值 | 说明 |
|---------|---------|------|
| active | active | 通用状态 |
| inactive | inactive | 通用状态 |
| pending | pending | 通用状态 |
| online | module_online | Dashboard模块状态 |
| beta | module_beta | Dashboard模块状态 |
| plan | module_plan | Dashboard模块状态 |
| new | module_new | Dashboard模块状态 |
| active (employee) | employee_active | HRM员工状态 |
| inactive (employee) | employee_inactive | HRM员工状态 |
| probation | employee_probation | HRM员工状态 |
| normal (attendance) | attendance_normal | HRM考勤状态 |
| late (attendance) | attendance_late | HRM考勤状态 |
| pending (leave) | leave_pending | HRM请假状态 |
| approved (leave) | leave_approved | HRM请假状态 |

## 五、最佳实践

### 5.1 使用预设状态

```tsx
// 推荐：使用预设状态
<StatusBadge status="active" />
<StatusBadge status="employee_active" showIcon />
<StatusBadge status="finance_approved" />

// 不推荐：自定义状态映射（除非预设不满足需求）
<StatusBadge
  status="custom"
  statusMap={{
    custom: { label: "自定义", color: "success" }
  }}
/>
```

### 5.2 使用便捷组件

```tsx
// 推荐：使用业务专用便捷组件
<EmployeeStatusBadge status="employee_active" />
<AttendanceStatusBadge status="attendance_normal" />
<CustomerStatusBadge status="customer_active" />
<FinanceStatusBadge status="finance_approved" />

// 不推荐：使用通用组件（除非跨业务场景）
<StatusBadge status="employee_active" />
```

### 5.3 显示图标

```tsx
// 推荐：显示图标增强可识别性
<StatusBadge status="approved" showIcon />
<StatusBadge status="pending" showIcon />

// 不推荐：不显示图标（除非空间受限）
<StatusBadge status="approved" />
```

### 5.4 自定义样式

```tsx
// 推荐：使用sx属性自定义样式
<StatusBadge
  status="active"
  sx={{
    borderRadius: 2,
    fontWeight: 600,
  }}
/>

// 不推荐：使用内联样式
<StatusBadge status="active" style={{ borderRadius: '8px' }} />
```

## 六、迁移注意事项

### 6.1 导入路径变更

所有StatusBadge组件统一从`@/components/common/StatusBadge`导入：

```tsx
// 正确的导入方式
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  EmployeeStatusBadge,
  AttendanceStatusBadge,
  LeaveStatusBadge,
  CustomerStatusBadge,
  OpportunityStatusBadge,
  ProjectStatusBadge,
  WorkflowStatusBadge,
  FinanceStatusBadge,
  ModuleStatusBadge,
} from '@/components/common/StatusBadge';

// 错误的导入方式（已废弃）
import { StatusBadge } from '@/components/dashboard/StatusBadge'; // ❌
import { StatusBadge } from '@/components/hrm/StatusBadge'; // ❌
```

### 6.2 状态值变更

Dashboard和HRM的状态值需要添加前缀：

```tsx
// Dashboard状态
"online" → "module_online"
"beta" → "module_beta"
"plan" → "module_plan"
"new" → "module_new"

// HRM员工状态
"active" → "employee_active"
"inactive" → "employee_inactive"
"probation" → "employee_probation"

// HRM考勤状态
"normal" → "attendance_normal"
"late" → "attendance_late"
"absent" → "attendance_absent"

// HRM请假状态
"pending" → "leave_pending"
"approved" → "leave_approved"
"rejected" → "leave_rejected"
```

### 6.3 已移除的属性

以下属性已移除，需要使用替代方案：

| 已移除属性 | 替代方案 |
|-----------|---------|
| mobile | 使用size="sm" |
| isDarkMode | 使用主题系统 |
| category | 使用状态前缀或便捷组件 |

### 6.4 Tailwind CSS样式迁移

Dashboard版本的StatusBadge使用Tailwind CSS，新版本使用MUI Chip。如果需要自定义样式，使用sx属性：

```tsx
// 旧版（Tailwind CSS）
<StatusBadge status="online" isDarkMode={true} />

// 新版（MUI sx属性）
<StatusBadge
  status="module_online"
  sx={{
    bgcolor: 'success.light',
    color: 'success.dark',
  }}
/>
```

## 七、迁移时间表

| 阶段 | 任务 | 时间 |
|------|------|------|
| **阶段1** | 创建统一组件 | 已完成 |
| **阶段2** | 更新导入路径 | 1周内 |
| **阶段3** | 更新状态值 | 2周内 |
| **阶段4** | 删除旧组件 | 3周内 |

## 八、迁移检查清单

- [ ] 更新导入路径为`@/components/common/StatusBadge`
- [ ] 更新状态值（添加前缀）
- [ ] 移除已废弃的属性（mobile、isDarkMode、category）
- [ ] 测试组件功能正常
- [ ] 检查样式是否符合预期
- [ ] 检查图标显示是否正常
- [ ] 检查点击事件是否正常

## 九、常见问题

### Q1: 为什么要合并组件？

**A**: 消除重复定义、统一组件规范、增强组件能力、降低维护成本。

### Q2: 旧组件还能使用吗？

**A**: 可以，但建议尽快迁移。旧组件将在3周后删除。

### Q3: 如何处理自定义状态？

**A**: 使用statusMap属性自定义状态映射，或使用预设状态。

### Q4: 如何实现暗色模式？

**A**: 使用MUI主题系统，通过ThemeProvider切换主题。

### Q5: 如何自定义样式？

**A**: 使用sx属性自定义样式，符合MUI规范。

## 十、技术支持

如有迁移问题，请联系前端团队。

---

**更新时间**: 2026-06-20
**版本**: v1.0.0