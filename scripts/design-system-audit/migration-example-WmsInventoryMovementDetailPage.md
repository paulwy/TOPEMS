# 页面模板迁移示例：WmsInventoryMovementDetailPage

> 迁移时间：2026-08-21
> 迁移页面：`apps/web/src/pages/wms/WmsInventoryMovementDetailPage.tsx`
> 推荐模板：`DetailPageTemplate`

---

## 1. 迁移前状态

- **文件**：`apps/web/src/pages/wms/WmsInventoryMovementDetailPage.tsx`
- **行数**：182 行
- **布局方式**：纯 Tailwind CSS
- **页面容器**：未使用 `PageContainer`
- **核心内容**：库存移动单详情 + 源/目标库位可视化卡片 + 4 个统计卡片 + 序列号清单 + 审批时间轴
- **数据来源**：`useWmsMock` mock 数据

---

## 2. 迁移后状态

- **文件**：`apps/web/src/pages/wms/WmsInventoryMovementDetailPage.tsx`
- **行数**：约 241 行
- **布局方式**：`PageContainer` + `DetailPageTemplate`
- **核心内容**：
  - 统一的详情页头部（标题、副标题、状态）
  - `infoCard` 信息卡片聚合 4 个关键统计（物料编码、移动数量、批次号、序列号数）
  - `库位调整` 区块展示源/目标库位可视化
  - `序列号清单` 区块展示序列号 Chip 列表
  - `审批日志` 区块展示操作时间轴

---

## 3. 关键变化

### 3.1 页面根结构

**迁移前：**

```tsx
return (
  <div className='space-y-4 p-4'>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      {/* 标题 + 状态 */}
    </div>
    <div className='rounded-lg border p-6'>
      {/* 源/目标库位可视化 */}
    </div>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
      {/* 4 个统计卡片 */}
    </div>
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      {/* 序列号清单 + 审批日志 */}
    </div>
  </div>
);
```

**迁移后：**

```tsx
return (
  <PageContainer autoTitle autoBreadcrumbs>
    <DetailPageTemplate
      title={...}
      subtitle={...}
      headerContent={<WmsStatusBadge ... />}
      infoCard={{ title, subtitle, tags, stats }}
      sections={[
        { id: 'route', title: '库位调整', content: <MovementRouteCard /> },
        { id: 'serials', title: '序列号清单', content: <SerialNumbers /> },
        { id: 'timeline', title: '审批日志', content: <OperationTimeline /> },
      ]}
    />
  </PageContainer>
);
```

### 3.2 库位可视化重构

**迁移前：**

- Tailwind 样式卡片：琥珀色源库位、蓝色目标库位
- 硬编码颜色：`bg-amber-50`、`border-amber-200`、`text-amber-800` 等

**迁移后：**

- MUI `Card` + `CardContent`
- 使用主题 palette：`warning.50` / `warning.200` / `warning.800` 和 `info.50` / `info.200` / `info.800`
- 保留 `lucide-react` 图标

```tsx
<Box
  sx={{
    textAlign: 'center',
    p: 3,
    borderRadius: 2,
    bgcolor: 'warning.50',
    border: 1,
    borderColor: 'warning.200',
    minWidth: 180,
  }}
>
  <Typography variant='caption' sx={{ color: 'warning.800' }}>源库位</Typography>
  <Typography variant='h6' sx={{ color: 'warning.900', fontWeight: 700, fontFamily: 'monospace' }}>
    {sourceLoc}
  </Typography>
</Box>
```

### 3.3 序列号清单重构

**迁移前：** 自定义 `<span>` 标签，使用 Tailwind 样式

**迁移后：** MUI `Chip` 组件，统一尺寸和样式

```tsx
<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
  {serials.map((sn, i) => (
    <Chip key={i} label={sn} variant='outlined' size='small' sx={{ fontFamily: 'monospace' }} />
  ))}
</Box>
```

### 3.4 审批日志时间轴重构

**迁移前：** 原生 `<ol>` + `<li>` + Tailwind 绝对定位圆点

**迁移后：** MUI `Box` + `Typography`，使用主题 `divider` 颜色和 `background.paper`

---

## 4. 遇到的问题与解决

### 4.1 `fontWeight` 不是 Typography 的直接属性

**问题**：

```tsx
<Typography variant='body2' fontWeight={500}>
```

TypeScript 报错。

**解决**：

```tsx
<Typography variant='body2' sx={{ fontWeight: 500 }}>
```

---

## 5. 验证结果

### 5.1 TypeScript 类型检查

```bash
pnpm typecheck
```

结果：`WmsInventoryMovementDetailPage.tsx` 无新增类型错误。

### 5.2 浏览器实际效果

**验证方式**：

1. 启动本地开发服务器：`pnpm dev --port 5173`
2. 注入模拟登录态到 `localStorage`
3. 访问 `http://localhost:5173/wms/inventory-movements/mov-001`
4. Playwright 截图保存

**验证结果**：

- [x] 页面标题：库存移动详情 — MV2026000001
- [x] 面包屑：首页 / 仓储管理 / Inventory Movements / MV2026000001
- [x] 状态标签：已采购
- [x] 信息卡片：物料编码 MAT-005、移动数量 175、批次号 B202410-001、序列号数 3
- [x] 库位调整：源库位 SRC-72 → 目标库位 TGT-69
- [x] 序列号清单：3 个 Chip
- [x] 审批日志：创建移动单、单据过账、审批通过

**截图**：`scripts/design-system-audit/reports/wms-inventory-movement-detail-migrated.png`

> 注：截图右侧彩色浮动标签为开发环境「微前端可观测性面板」浮层，与本次页面迁移无关。

---

## 6. 迁移收益

- 移除所有 Tailwind 布局和颜色类名
- 分散的统计卡片统一为 `infoCard.stats`
- 自定义库位可视化卡片升级为 MUI 主题感知组件
- 序列号标签统一为 MUI Chip
- 时间轴统一为主题感知样式
- 自动获得面包屑、返回按钮、响应式布局、暗色模式适配

---

## 7. 可复用模式

此示例适合推广到以下页面：

- 展示「源位置 → 目标位置」的库内移动、库存调整、仓位转移详情页
- 需要展示序列号/批次号清单的详情页
- 需要审批/操作日志时间轴的详情页

**复用模式：**

1. 将源/目标位置可视化封装为独立的卡片组件
2. 将 Chip 列表用于标签化数据（序列号、批次号、SKU 等）
3. 将时间轴封装为独立的 section 组件
