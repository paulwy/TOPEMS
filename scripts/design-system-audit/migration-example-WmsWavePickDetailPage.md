# 页面模板迁移示例：WmsWavePickDetailPage

> 迁移时间：2026-08-21
> 迁移页面：`apps/web/src/pages/wms/WmsWavePickDetailPage.tsx`
> 推荐模板：`DetailPageTemplate` + `DataTable`

---

## 1. 迁移前状态

- **文件**：`apps/web/src/pages/wms/WmsWavePickDetailPage.tsx`
- **行数**：158 行
- **布局方式**：纯 Tailwind CSS
- **页面容器**：未使用 `PageContainer`
- **核心内容**：波次拣货单详情 + 4 个统计卡片 + 整体进度条 + HTML 表格展示出库单列表
- **数据来源**：`useWmsMock` mock 数据

---

## 2. 迁移后状态

- **文件**：`apps/web/src/pages/wms/WmsWavePickDetailPage.tsx`
- **行数**：约 221 行
- **布局方式**：`PageContainer` + `DetailPageTemplate`
- **核心内容**：
  - 统一的详情页头部（标题、副标题、状态）
  - `infoCard` 信息卡片聚合 4 个关键统计（拣货员、订单数、已拣/待拣、完成进度）
  - `整体拣货进度` 区块展示 MUI `LinearProgress`
  - `出库单列表` 区块展示 `DataTable`，每行带独立 `LinearProgress`

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
    <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
      {/* 4 个统计卡片 */}
    </div>
    <div className='rounded-lg border p-4'>
      {/* 整体进度条 */}
    </div>
    <div className='rounded-lg border p-4'>
      <table className='w-full text-sm'>
        {/* HTML 表格 */}
      </table>
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
        { id: 'progress', title: '整体拣货进度', content: <OverallProgress /> },
        { id: 'orders', title: '出库单列表', content: <DataTable ... /> },
      ]}
    />
  </PageContainer>
);
```

### 3.2 HTML 表格替换为 DataTable

**迁移前：**

```tsx
<table className='w-full text-sm'>
  <thead className='bg-gray-50'>
    <tr>{/* 表头 */}</tr>
  </thead>
  <tbody>
    {orders.map((o) => (
      <tr key={o.id} className='border-t'>
        <td>{...}</td>
        <td>
          <div className='h-2 w-full rounded-full bg-gray-200'>
            <div className='h-2 rounded-full bg-blue-600' style={{ width: `${pct}%` }} />
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**迁移后：**

```tsx
<DataTable
  columns={columns}
  data={orders}
  enablePagination={false}
  showSearch={false}
  showFilters={false}
  showExport={false}
  showCreate={false}
  showSelection={false}
/>
```

列定义中，单行进度列：

```tsx
{
  accessorKey: 'progressPct',
  header: '单行进度',
  cell: ({ row }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant='determinate'
        value={row.original.progressPct}
        sx={{ flex: 1, height: 8, borderRadius: 1 }}
      />
      <Typography variant='caption' color='text.secondary' sx={{ minWidth: 36 }}>
        {row.original.progressPct}%
      </Typography>
    </Box>
  ),
}
```

### 3.3 进度条重构

**迁移前：** 自定义 Tailwind 渐变进度条

```tsx
<div className='h-3 w-full rounded-full bg-gray-200'>
  <div
    className='h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all'
    style={{ width: `${progress.pct}%` }}
  />
</div>
```

**迁移后：** MUI `LinearProgress`

```tsx
<LinearProgress
  variant='determinate'
  value={progress.pct}
  sx={{ height: 12, borderRadius: 2 }}
/>
```

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

### 4.2 DataTable 默认功能过多

**问题**：默认 `DataTable` 显示搜索、筛选、导出、新建、选择框，不适合详情页内嵌列表。

**解决**：关闭不需要的功能：

```tsx
<DataTable
  columns={columns}
  data={orders}
  enablePagination={false}
  showSearch={false}
  showFilters={false}
  showExport={false}
  showCreate={false}
  showSelection={false}
/>
```

---

## 5. 验证结果

### 5.1 TypeScript 类型检查

```bash
pnpm typecheck
```

结果：`WmsWavePickDetailPage.tsx` 无新增类型错误。

### 5.2 浏览器实际效果

**验证方式**：

1. 启动本地开发服务器：`pnpm dev --port 5173`
2. 注入模拟登录态到 `localStorage`
3. 访问 `http://localhost:5173/wms/wave-picks/wp-001`
4. Playwright 截图保存

**验证结果**：

- [x] 页面标题：波次拣货详情 — WP2026000001
- [x] 面包屑：首页 / 仓储管理 / Wave Picks / WP2026000001
- [x] 状态标签：已采购
- [x] 信息卡片：拣货员、订单数 6、107 / 120、89%
- [x] 整体拣货进度：107 / 120（89%）
- [x] 出库单列表：6 行数据，每行显示单行进度条

**截图**：`scripts/design-system-audit/reports/wms-wave-pick-detail-migrated.png`

> 注：截图右侧彩色浮动标签为开发环境「微前端可观测性面板」浮层，与本次页面迁移无关。

---

## 6. 迁移收益

- 移除所有 Tailwind 布局和颜色类名
- 分散的统计卡片统一为 `infoCard.stats`
- HTML 表格升级为 `DataTable`，获得排序、响应式、列设置能力
- 自定义进度条升级为 MUI `LinearProgress`
- 自动获得面包屑、返回按钮、响应式布局、暗色模式适配

---

## 7. 可复用模式

此示例适合推广到以下页面：

- 需要在详情页中内嵌子列表/明细表的页面
- 需要在表格中展示进度、状态的可视化列
- 需要展示整体进度 + 明细进度的汇总详情页

**复用模式：**

1. 将内嵌表格替换为 `DataTable`，并关闭详情页不需要的功能开关
2. 将进度可视化列封装为可复用的 render 函数
3. 将整体进度作为独立 section，明细进度作为表格列
