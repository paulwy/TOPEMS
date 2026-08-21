# 页面模板迁移示例：WmsTransferDetailPage

> 迁移时间：2026-08-21
> 迁移页面：`apps/web/src/pages/wms/WmsTransferDetailPage.tsx`
> 推荐模板：`DetailPageTemplate`

---

## 1. 迁移前状态

- **文件**：`apps/web/src/pages/wms/WmsTransferDetailPage.tsx`
- **行数**：124 行
- **布局方式**：纯 Tailwind CSS
- **页面容器**：未使用 `PageContainer`
- **核心内容**：调拨单详情 + 调出/调入仓库可视化卡片 + 3 个统计卡片 + 运输信息
- **数据来源**：`useWmsMock` mock 数据
- **特有组件**：`WmsStatusBadge`、`WmsFSMActionButtons`（保留）

---

## 2. 迁移后状态

- **文件**：`apps/web/src/pages/wms/WmsTransferDetailPage.tsx`
- **行数**：约 214 行
- **布局方式**：`PageContainer` + `DetailPageTemplate`
- **核心内容**：
  - 统一的详情页头部（标题、副标题、状态、操作按钮）
  - `infoCard` 信息卡片聚合 3 个关键统计
  - `调拨路线` 区块展示调出/调入仓库可视化
  - `运输信息与备注` 区块展示时间、备注

---

## 3. 关键变化

### 3.1 页面根结构

**迁移前：**

```tsx
return (
  <div className='space-y-4 p-4'>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      {/* 标题 + 状态/操作 */}
    </div>
    <div className='rounded-lg border p-6'>
      {/* 调出/调入仓库可视化 */}
    </div>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      {/* 3 个统计卡片 */}
    </div>
    <div className='rounded-lg border p-4'>
      {/* 运输信息与备注 */}
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
      headerContent={...}
      infoCard={{ title, subtitle, tags, stats }}
      sections={[
        { id: 'route', title: '调拨路线', content: <TransferRouteCard /> },
        { id: 'details', title: ..., content: <TransferDetails /> },
      ]}
    />
  </PageContainer>
);
```

### 3.2 调拨路线可视化重构

**迁移前：**

- Tailwind 样式卡片：蓝色源仓库、绿色目标仓库
- 硬编码颜色：`bg-blue-50`、`border-blue-200`、`text-blue-800` 等
- 中间图标区使用 `text-gray-400`

**迁移后：**

- MUI `Card` + `CardContent`
- 使用主题 palette：`primary.50`、`primary.200`、`success.50`、`success.200`
- 图标颜色使用 `primary.contrastText` / `success.contrastText`
- 保留 `lucide-react` 图标

```tsx
<Card variant='outlined'>
  <CardContent>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
        <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
          <MapPin size={20} />
        </Box>
        <Box>
          <Typography variant='caption' color='primary.main'>调出仓库（源）</Typography>
          <Typography variant='h6' sx={{ color: 'primary.900', fontWeight: 700 }}>...</Typography>
        </Box>
      </Box>
      {/* 中间图标 */}
      <Box sx={{ ... }}>
        <Package size={18} />
        <ArrowLeftRight size={24} />
        <Truck size={20} />
      </Box>
      {/* 目标仓库卡片（success 配色） */}
      ...
    </Box>
  </CardContent>
</Card>
```

### 3.3 统计卡片与详情信息

**迁移前：** 3 个独立 Tailwind 卡片 + 1 个详情网格

**迁移后：**

- 统计卡片集中到 `infoCard.stats`
- 详情信息作为 `DetailPageTemplate.sections` 中的独立区块，使用 MUI `Grid` + `Typography`

---

## 4. 遇到的问题与解决

### 4.1 Typography 不支持 palette 色阶作为 `color` 属性

**问题**：

```tsx
<Typography variant='h6' color='primary.900' ...>
```

TypeScript 报错：`No overload matches this call`。

**解决**：将色阶放入 `sx`：

```tsx
<Typography variant='h6' sx={{ color: 'primary.900', fontWeight: 700 }}>
```

### 4.2 `fontWeight` 不是 Typography 的直接属性

**问题**：`fontWeight={700}` 导致类型错误。

**解决**：一并移入 `sx`。

---

## 5. 验证结果

### 5.1 TypeScript 类型检查

```bash
pnpm typecheck
```

结果：`WmsTransferDetailPage.tsx` 无新增类型错误。

### 5.2 浏览器实际效果

**验证方式**：

1. 启动本地开发服务器：`pnpm dev --port 5173`
2. 注入模拟登录态到 `localStorage`
3. 访问 `http://localhost:5173/wms/transfer-orders/trf-001`
4. Playwright 截图保存

**验证结果**：

- [x] 页面标题：调拨单详情 — TR2026000001
- [x] 面包屑：首页 / 仓储管理 / Transfer Orders / TR2026000001
- [x] 状态标签：可用
- [x] 信息卡片：调拨类型、承运/运单、数量/预计到达
- [x] 调拨路线：源仓库 → 图标 → 目标仓库
- [x] 运输信息与备注：发运时间、收货时间、备注

**截图**：`scripts/design-system-audit/reports/wms-transfer-detail-migrated.png`

> 注：截图右侧彩色浮动标签为开发环境「微前端可观测性面板」浮层，与页面迁移无关。

---

## 6. 迁移收益

- 移除所有 Tailwind 布局和颜色类名
- 分散的统计卡片统一为 `infoCard.stats`
- 自定义仓库可视化卡片升级为 MUI 主题感知组件
- 自动获得面包屑、返回按钮、响应式布局、暗色模式

---

## 7. 可复用模式

此示例适合推广到以下页面：

- 任何展示「源 → 目标」流程的详情页
- TMS 运输单详情、MES 工序流转详情、SCM 调拨单详情

**复用模式：**

1. 使用 MUI `Card` + 主题 palette 替换手写彩色卡片
2. 将流程可视化作为 `DetailPageTemplate.sections` 的独立区块
3. 将补充信息（时间、备注、日志）作为另一个独立区块
