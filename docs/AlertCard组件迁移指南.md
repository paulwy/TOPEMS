# AlertCard组件迁移指南

## 一、迁移背景

为了统一组件规范、增强组件能力，我们将分散在`common/`和根目录两个位置的AlertCard组件合并为一个统一的增强版组件。新组件使用MUI的sx属性替代了Tailwind CSS，并增加了多种展示模式、操作按钮、可展开等高级特性。

## 二、新组件特性

### 2.1 核心特性

| 特性 | 说明 |
|------|------|
| **多种展示模式** | 支持card、alert、inline三种模式 |
| **多种尺寸** | 支持sm、md、lg三种尺寸 |
| **可关闭** | 支持显示关闭按钮 |
| **可展开** | 支持长内容的展开/收起 |
| **操作按钮** | 支持添加操作按钮列表 |
| **自定义图标** | 支持自定义图标 |
| **点击事件** | 支持可点击卡片 |
| **MUI sx属性** | 使用MUI sx属性替代Tailwind CSS |

### 2.2 展示模式对比

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **card** | 使用Card组件包装 | 需要阴影和边框的场景 |
| **alert** | 使用MUI Alert组件 | 需要MUI Alert样式的场景 |
| **inline** | 使用Box组件（默认） | 内联展示的场景 |

## 三、迁移步骤

### 3.1 从common/AlertCard迁移

**旧代码**:
```tsx
import { AlertCard } from '@/components/common/AlertCard';
import type { AlertLevel } from '@/components/common/AlertCard';

<AlertCard
  level="success"
  title="操作成功"
  message="数据已保存"
/>

<AlertCard
  level="warning"
  title="注意"
  message="您的账户即将过期"
  onClick={handleClick}
/>

<AlertCard
  level="error"
  title="错误"
  message="操作失败"
/>
```

**新代码**:
```tsx
import { AlertCard } from '@/components/common/AlertCard';
import type { AlertLevel } from '@/components/common/AlertCard';

// 基础使用（完全兼容）
<AlertCard
  level="success"
  title="操作成功"
  message="数据已保存"
/>

// Card模式
<AlertCard
  level="warning"
  title="注意"
  message="您的账户即将过期"
  displayMode="card"
  useCard={true}
/>

// Alert模式
<AlertCard
  level="error"
  title="错误"
  message="操作失败"
  displayMode="alert"
  useAlert={true}
/>

// 可关闭
<AlertCard
  level="info"
  message="欢迎使用系统"
  closable
  onClose={handleClose}
/>

// 可展开
<AlertCard
  level="warning"
  title="详细信息"
  message="这是一段很长的详细信息..."
  expandable
  expanded={isExpanded}
  onExpandedChange={setExpanded}
/>

// 带操作按钮
<AlertCard
  level="success"
  title="操作成功"
  message="是否继续其他操作？"
  actions={[
    { label: "查看详情", onClick: handleView },
    { label: "关闭", onClick: handleClose, primary: true }
  ]}
/>

// 自定义尺寸
<AlertCard
  level="info"
  message="小尺寸提示"
  size="sm"
/>

<AlertCard
  level="success"
  message="大尺寸提示"
  size="lg"
/>

// 自定义图标
<AlertCard
  level="info"
  message="自定义消息"
  icon={<HelpCircle />}
/>

// 可点击
<AlertCard
  level="success"
  message="点击查看详情"
  onClick={handleClick}
/>
```

### 3.2 从根目录AlertCard迁移

**旧代码**:
```tsx
import { AlertCard } from '@/components/AlertCard';
import type { AlertLevel } from '@/components/AlertCard';

// 旧版本使用Tailwind CSS
<div style={{
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid",
  cursor: onClick ? "pointer" : "default",
  backgroundColor: "#f0fdf4",
  borderColor: "#bbf7d0"
}}>
  <CheckCircle style={{ color: "#22c55e" }} />
  <div>
    <h4 style={{ color: "#166534" }}>{title}</h4>
    <p style={{ color: "#15803d" }}>{message}</p>
  </div>
</div>
```

**新代码**:
```tsx
import { AlertCard } from '@/components/common/AlertCard';

// 新版本使用MUI sx属性
<AlertCard
  level="success"
  title={title}
  message={message}
  onClick={onClick}
/>

// 或者使用Card模式
<AlertCard
  level="success"
  title={title}
  message={message}
  displayMode="card"
  useCard={true}
/>

// 或者使用Alert模式
<AlertCard
  level="success"
  title={title}
  message={message}
  displayMode="alert"
  useAlert={true}
/>
```

## 四、API对比

### 4.1 Props对比

| 属性 | 旧版 | 新版 | 说明 |
|------|------|------|------|
| level | ✅ | ✅ | 警告级别（success/warning/error/info） |
| title | ✅ | ✅ | 标题 |
| message | ✅ | ✅ | 消息内容 |
| onClick | ✅ | ✅ | 点击回调 |
| displayMode | ❌ | ✅ | 展示模式（card/alert/inline） |
| size | ❌ | ✅ | 尺寸（sm/md/lg） |
| closable | ❌ | ✅ | 是否可关闭 |
| expandable | ❌ | ✅ | 是否可展开 |
| expanded | ❌ | ✅ | 展开状态（受控） |
| onExpandedChange | ❌ | ✅ | 展开状态变化回调 |
| onClose | ❌ | ✅ | 关闭回调 |
| actions | ❌ | ✅ | 操作按钮列表 |
| icon | ❌ | ✅ | 自定义图标 |
| closeIcon | ❌ | ✅ | 关闭图标 |
| useCard | ❌ | ✅ | 使用Card包装 |
| useAlert | ❌ | ✅ | 使用Alert组件 |
| showDivider | ❌ | ✅ | 显示分隔线 |
| sx | ❌ | ✅ | 自定义样式 |

### 4.2 样式迁移对比

**旧版（Tailwind CSS）**:
```tsx
<div
  style={{
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  }}
>
  <CheckCircle sx={{ color: "#22c55e" }} />
  <div>
    <h4 sx={{ color: "#166534" }}>{title}</h4>
    <p sx={{ color: "#15803d" }}>{message}</p>
  </div>
</div>
```

**新版（MUI sx属性）**:
```tsx
<AlertCard
  level="success"
  title={title}
  message={message}
  displayMode="card"
  useCard={true}
  sx={{ maxWidth: 600 }}
/>
```

## 五、最佳实践

### 5.1 选择合适的展示模式

```tsx
// 推荐：Card模式 - 用于独立展示的提示信息
<AlertCard
  level="warning"
  title="重要提示"
  message="请注意系统将于今晚维护"
  displayMode="card"
  useCard={true}
/>

// 推荐：Alert模式 - 用于表单验证和操作反馈
<AlertCard
  level="error"
  title="表单验证失败"
  message="请检查以下字段"
  displayMode="alert"
  useAlert={true}
/>

// 推荐：Inline模式 - 用于内联展示的提示信息
<AlertCard
  level="info"
  message="您的账户余额不足"
  displayMode="inline"  // 默认
/>
```

### 5.2 使用操作按钮

```tsx
// 推荐：带操作按钮的卡片
<AlertCard
  level="success"
  title="操作成功"
  message="是否继续其他操作？"
  actions={[
    { label: "查看详情", onClick: handleView },
    { label: "关闭", onClick: handleClose, primary: true }
  ]}
/>

// 推荐：带加载状态的按钮
<AlertCard
  level="warning"
  title="确认操作"
  message="此操作不可撤销"
  actions={[
    {
      label: "确认",
      onClick: handleConfirm,
      loading: isLoading,
      primary: true
    }
  ]}
/>
```

### 5.3 使用便捷组件

```tsx
// 推荐：使用便捷组件
import {
  AlertCard,
  SuccessAlertCard,
  WarningAlertCard,
  ErrorAlertCard,
  InfoAlertCard,
} from '@/components/common/AlertCard';

<SuccessAlertCard title="成功" message="操作完成" />
<WarningAlertCard title="警告" message="注意" />
<ErrorAlertCard title="错误" message="失败" />
<InfoAlertCard message="提示信息" />
```

### 5.4 使用可展开内容

```tsx
// 推荐：长内容使用可展开
<AlertCard
  level="info"
  title="详细信息"
  message="这是一段很长的详细信息，可以点击展开查看完整内容..."
  expandable
  expanded={isExpanded}
  onExpandedChange={setExpanded}
/>

// 推荐：短内容不需要展开
<AlertCard
  level="success"
  message="操作成功"
/>
```

## 六、迁移注意事项

### 6.1 导入路径变更

所有AlertCard组件统一从`@/components/common/AlertCard`导入：

```tsx
// 正确的导入方式
import { AlertCard } from '@/components/common/AlertCard';
import {
  AlertCard,
  SuccessAlertCard,
  WarningAlertCard,
  ErrorAlertCard,
  InfoAlertCard,
} from '@/components/common/AlertCard';

// 错误的导入方式（已废弃）
import { AlertCard } from '@/components/AlertCard'; // ❌
```

### 6.2 Tailwind CSS样式迁移

旧版本使用Tailwind CSS，新版本使用MUI sx属性：

```tsx
// 旧版（Tailwind CSS）
<div className="bg-green-50 border border-green-200 p-4 rounded-lg">
  <CheckCircle className="text-green-500" />
</div>

// 新版（MUI sx属性）
<AlertCard
  level="success"
  message="提示信息"
  sx={{
    bgcolor: 'success.light',
    borderColor: 'success.main',
  }}
/>
```

### 6.3 内联样式迁移

旧版本使用大量内联样式，新版本简化了API：

```tsx
// 旧版（内联样式）
<div style={{
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid",
}}>
  <CheckCircle />
  <div>
    <h4>{title}</h4>
    <p>{message}</p>
  </div>
</div>

// 新版（MUI sx属性）
<AlertCard
  level="success"
  title={title}
  message={message}
/>
```

### 6.4 尺寸默认值变更

| 版本 | 默认尺寸 | 说明 |
|------|---------|------|
| 旧版 | 16px padding | 固定的padding值 |
| 新版 | md (12px padding) | 可配置的尺寸 |

```tsx
// 如果需要保持旧的尺寸，使用lg
<AlertCard
  level="success"
  message="保持大尺寸"
  size="lg"  // 16px padding
/>
```

## 七、迁移时间表

| 阶段 | 任务 | 时间 |
|------|------|------|
| **阶段1** | 创建统一组件 | 已完成 |
| **阶段2** | 更新导入路径 | 1周内 |
| **阶段3** | 删除旧组件 | 2周内 |

## 八、迁移检查清单

- [ ] 更新导入路径为`@/components/common/AlertCard`
- [ ] 移除Tailwind CSS样式，使用MUI sx属性
- [ ] 简化内联样式，使用组件API
- [ ] 选择合适的展示模式（card/alert/inline）
- [ ] 测试组件功能正常
- [ ] 检查样式是否符合预期
- [ ] 检查图标显示是否正常
- [ ] 检查操作按钮是否正常
- [ ] 检查可关闭/可展开功能是否正常

## 九、常见问题

### Q1: 为什么要合并组件？

**A**: 消除重复定义、统一组件规范、增强组件能力、降低维护成本。

### Q2: 旧组件还能使用吗？

**A**: 可以，但建议尽快迁移。旧组件将在2周后删除。

### Q3: 如何选择展示模式？

**A**: Card模式适用于独立展示，Alert模式适用于表单验证，Inline模式适用于内联展示。

### Q4: 如何自定义样式？

**A**: 使用sx属性自定义样式，符合MUI规范。

### Q5: 如何添加操作按钮？

**A**: 使用actions属性，传入按钮配置数组。

### Q6: 如何实现可关闭？

**A**: 使用closable属性和onClose回调。

## 十、技术支持

如有迁移问题，请联系前端团队。

---

**更新时间**: 2026-06-20
**版本**: v1.0.0