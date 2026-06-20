# StatCard组件迁移指南

## 一、迁移背景

为了统一组件规范、增强组件能力，我们整合了MetricCard、ChartCard等统计展示类组件，创建了一个统一的增强版StatCard组件库。新组件提供了基类组件和多种特化组件，支持丰富的交互效果和动画。

## 二、新组件体系

### 2.1 组件架构

```
StatCard (统一组件库)
├── StatCardBase (基类组件)
├── MetricCard (指标卡片)
└── ChartCard (图表卡片)
```

### 2.2 核心特性

| 组件 | 特性 |
|------|------|
| **StatCardBase** | 基础统计卡片，支持动画、趋势、图标 |
| **MetricCard** | 指标卡片，增加Sparkline和目标进度 |
| **ChartCard** | 图表卡片，支持时间范围、图表类型切换 |

## 三、迁移步骤

### 3.1 从bi/MetricCard迁移

**旧代码**:
```tsx
import { MetricCard } from '@/components/bi/MetricCard';

<MetricCard
  title="总收入"
  value={125000}
  unit="元"
  change={12.5}
  icon={DollarSign}
  color="green"
  trend="up"
  sparklineData={[10, 20, 15, 25, 30, 35, 40]}
/>
```

**新代码**:
```tsx
import { MetricCard } from '@/components/common/StatCard';

<MetricCard
  title="总收入"
  value={125000}
  unit="元"
  change={12.5}
  icon={<DollarSign size={24} />}
  color="green"
  trend="up"
  sparklineData={[10, 20, 15, 25, 30, 35, 40]}
/>
```

### 3.2 从bi/ChartCard迁移

**旧代码**:
```tsx
import { ChartCard } from '@/components/bi/ChartCard';
import { BarChart3 } from 'lucide-react';

<ChartCard
  title="销售趋势"
  subtitle="本月销售数据"
  loading={false}
  error=""
  showTimeRange={true}
  showChartType={true}
  onRefresh={handleRefresh}
  onExport={handleExport}
>
  <BarChart3 />
</ChartCard>
```

**新代码**:
```tsx
import { ChartCard } from '@/components/common/StatCard';

<ChartCard
  title="销售趋势"
  subtitle="本月销售数据"
  loading={false}
  error=""
  showTimeRange={true}
  showChartType={true}
  onRefresh={handleRefresh}
  onExport={handleExport}
  trend="up"
  trendValue="+12.5%"
>
  <BarChart3 />
</ChartCard>
```

## 四、API对比

### 4.1 MetricCard Props对比

| 属性 | 旧版 | 新版 | 说明 |
|------|------|------|------|
| title | ✅ | ✅ | 标题 |
| value | ✅ | ✅ | 值 |
| subtitle | ✅ | ✅ | 副标题 |
| unit | ✅ | ✅ | 单位 |
| suffix | ✅ | ✅ | 后缀 |
| change | ✅ | ✅ | 变化率 |
| icon | ✅ | ✅ | 图标 |
| color | ✅ | ✅ | 颜色 |
| gradient | ✅ | ✅ | 渐变色 |
| trend | ✅ | ✅ | 趋势 |
| sparklineData | ✅ | ✅ | Sparkline数据 |
| animate | ✅ | ✅ | 是否动画 |
| target | ❌ | ✅ | 目标值 |
| targetProgress | ❌ | ✅ | 目标进度 |
| showTargetProgress | ❌ | ✅ | 显示目标进度 |
| onClick | ❌ | ✅ | 点击事件 |
| sx | ❌ | ✅ | 自定义样式 |

### 4.2 ChartCard Props对比

| 属性 | 旧版 | 新版 | 说明 |
|------|------|------|------|
| title | ✅ | ✅ | 标题 |
| subtitle | ✅ | ✅ | 副标题 |
| children | ✅ | ✅ | 图表内容 |
| height | ✅ | ✅ | 高度 |
| loading | ✅ | ✅ | 加载状态 |
| error | ✅ | ✅ | 错误信息 |
| onRefresh | ✅ | ✅ | 刷新回调 |
| onExport | ✅ | ✅ | 导出回调 |
| onFullscreen | ✅ | ✅ | 全屏回调 |
| chartTypes | ✅ | ✅ | 图表类型列表 |
| activeChartType | ✅ | ✅ | 当前图表类型 |
| onChartTypeChange | ✅ | ✅ | 图表类型变化回调 |
| timeRange | ✅ | ✅ | 时间范围 |
| onTimeRangeChange | ✅ | ✅ | 时间范围变化回调 |
| showTimeRange | ✅ | ✅ | 显示时间范围选择器 |
| showChartType | ✅ | ✅ | 显示图表类型选择器 |
| showExport | ✅ | ✅ | 显示导出按钮 |
| showFullscreen | ✅ | ✅ | 显示全屏按钮 |
| showRefresh | ✅ | ✅ | 显示刷新按钮 |
| trend | ❌ | ✅ | 趋势 |
| trendValue | ❌ | ✅ | 趋势值 |
| sx | ❌ | ✅ | 自定义样式 |

## 五、最佳实践

### 5.1 使用MetricCard

```tsx
// 基础使用
<MetricCard
  title="总收入"
  value={125000}
  unit="元"
  change={12.5}
  icon={<DollarSign size={24} />}
  color="green"
/>

// 带Sparkline
<MetricCard
  title="用户增长"
  value={1250}
  unit="人"
  change={8.3}
  trend="up"
  sparklineData={[100, 120, 115, 130, 145, 160, 180]}
/>

// 带目标进度
<MetricCard
  title="本月销售"
  value={850000}
  unit="元"
  change={15.2}
  target={1000000}
  targetProgress={85}
  showTargetProgress={true}
/>
```

### 5.2 使用ChartCard

```tsx
// 基础使用
<ChartCard
  title="销售趋势"
  subtitle="本月销售数据"
  showTimeRange={true}
  showChartType={true}
  onRefresh={handleRefresh}
  onExport={handleExport}
>
  <BarChart data={...} />
</ChartCard>

// 带趋势
<ChartCard
  title="收入趋势"
  trend="up"
  trendValue="+12.5%"
  showTimeRange={true}
>
  <LineChart data={...} />
</ChartCard>

// 错误状态
<ChartCard
  title="数据展示"
  error="数据加载失败"
  onRefresh={handleRefresh}
>
  <Chart />
</ChartCard>
```

### 5.3 颜色配置

```tsx
// 使用预设颜色
<MetricCard color="green" />
<MetricCard color="blue" />
<MetricCard color="purple" />
<MetricCard color="orange" />
<MetricCard color="red" />
<MetricCard color="cyan" />

// 使用MUI颜色
<MetricCard color="primary" />
<MetricCard color="success" />
<MetricCard color="warning" />
<MetricCard color="error" />
<MetricCard color="info" />

// 自定义渐变
<MetricCard
  color="blue"
  gradient={["#3B82F6", "#2563EB"]}
/>
```

## 六、迁移注意事项

### 6.1 导入路径变更

所有统计卡片组件统一从`@/components/common/StatCard`导入：

```tsx
// 正确的导入方式
import { MetricCard, ChartCard, StatCardBase } from '@/components/common/StatCard';

// 错误的导入方式（已废弃）
import { MetricCard } from '@/components/bi/MetricCard'; // ❌
import { ChartCard } from '@/components/bi/ChartCard'; // ❌
```

### 6.2 图标属性变更

旧版本直接传入LucideIcon组件，新版本需要传入React元素：

```tsx
// 旧版
<MetricCard icon={DollarSign} />

// 新版
<MetricCard icon={<DollarSign size={24} />} />
```

### 6.3 样式迁移

旧版本使用内联样式，新版本使用MUI sx属性：

```tsx
// 旧版
<div style={{ backgroundColor: "#f0fdf4" }}>

// 新版
<MetricCard sx={{ bgcolor: 'success.light' }} />
```

## 七、迁移时间表

| 阶段 | 任务 | 时间 |
|------|------|------|
| **阶段1** | 创建统一组件 | 已完成 |
| **阶段2** | 更新导入路径 | 1周内 |
| **阶段3** | 删除旧组件 | 2周内 |

## 八、迁移检查清单

- [ ] 更新导入路径为`@/components/common/StatCard`
- [ ] 修改图标属性为React元素
- [ ] 替换内联样式为MUI sx属性
- [ ] 测试组件功能正常
- [ ] 检查动画效果是否正常
- [ ] 检查Sparkline是否正常显示
- [ ] 检查图表卡片功能是否正常

## 九、常见问题

### Q1: 为什么要整合这些组件？

**A**: 统一组件规范、消除重复定义、增强组件能力、降低维护成本。

### Q2: 旧组件还能使用吗？

**A**: 可以，但建议尽快迁移。旧组件将在2周后删除。

### Q3: 如何选择使用哪个组件？

**A**: MetricCard用于展示单个指标数据，ChartCard用于展示图表数据，StatCardBase用于需要自定义的场景。

### Q4: 如何自定义样式？

**A**: 使用sx属性自定义样式，符合MUI规范。

## 十、技术支持

如有迁移问题，请联系前端团队。

---

**更新时间**: 2026-06-20
**版本**: v1.0.0