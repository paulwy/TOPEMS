# 页面模板迁移示例：WmsStockTakeDetailPage

> 迁移时间：2026-08-21
> 迁移页面：`apps/web/src/pages/wms/WmsStockTakeDetailPage.tsx`
> 推荐模板：`DetailPageTemplate` + `DataTable`

---

## 1. 迁移前状态

- **文件**：`apps/web/src/pages/wms/WmsStockTakeDetailPage.tsx`
- **行数**：157 行
- **布局方式**：纯 Tailwind CSS
- **页面容器**：未使用 `PageContainer`
- **核心内容**：盘点单详情 + 4 个差异统计卡片 + HTML 表格展示盘点明细
- **数据来源**：`useWmsMock` mock 数据

---

## 2. 迁移后状态

- **文件**：`apps/web/src/pages/wms/WmsStockTakeDetailPage.tsx`
- **行数**：约 210 行
- **布局方式**：`PageContainer` + `DetailPageTemplate`
- **核心内容**：
  - 统一的详情页头部（标题、副标题、状态 + 操作按钮）
  - `infoCard` 信息卡片聚合 4 个关键统计（账实一致、盘盈、盘亏、准确率）
  - `盘点差异清单` 区块使用 `DataTable` 展示明细
  - 差额列使用主题语义色（success / warning / error）高亮

---

## 3. 关键变化

### 3.1 页面根结构

**迁移前：**

```tsx
return (
  <div className='space-y-4 p-4'>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      {/* 标题 + 状态 + 按钮 */}
    </div>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
      {/* 4 个统计卡片 */}
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
      headerContent={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WmsStatusBadge ... />
          <WmsFSMActionButtons ... />
        </Box>
      }
      infoCard={{ title, subtitle, tags, stats }}
      sections={[
        { id: 'items', title: '盘点差异清单', content: <DataTable ... /> },
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
    {items.map((it) => (
      <tr key={it.id} className='border-t'>
        <td className='px-3 py-2 font-mono'>{it.sku}</td>
        <td className={`px-3 py-2 text-right font-semibold ${colorClass}`}>{it.diff}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**迁移后：**

```tsx
<DataTable
  columns={columns}
  data={items}
  enablePagination={false}
  showSearch={false}
  showFilters={false}
  showExport={false}
  showCreate={false}
  showSelection={false}
/>
```

差额列使用 MUI 主题语义色：

```tsx
function DiffCell({ diff }: { diff: number }) {
  const color = diff === 0 ? 'success.main' : diff > 0 ? 'warning.main' : 'error.main';
  return (
    <Typography variant='body2' sx={{ textAlign: 'right', color, fontWeight: 600 }}>
      {diff > 0 ? '+' : ''}
      {diff}
    </Typography>
  );
}
```

### 3.3 统计卡片聚合

**迁移前：** 4 个独立 Tailwind 卡片，带不同颜色左边框

**迁移后：** 聚合到 `infoCard.stats`

```tsx
stats: [
  { label: i18n.t('...'), value: String(diffSummary.ok) },
  { label: i18n.t('...'), value: String(diffSummary.over) },
  { label: i18n.t('...'), value: String(diffSummary.under) },
  { label: i18n.t('...'), value: `${diffSummary.accuracy}%` },
]
```

---

## 4. 遇到的问题与解决

### 4.1 差额列颜色映射

原页面使用 Tailwind 颜色类：

```tsx
className={it.diff === 0 ? 'text-green-600' : it.diff > 0 ? 'text-amber-600' : 'text-red-600'}
```

迁移后使用 MUI 主题语义 token：

```tsx
const color = diff === 0 ? 'success.main' : diff > 0 ? 'warning.main' : 'error.main';
```

这样可以在暗色模式下自动适配。

---

## 5. 验证结果

### 5.1 TypeScript 类型检查

```bash
pnpm typecheck
```

结果：`WmsStockTakeDetailPage.tsx` 无新增类型错误。

### 5.2 浏览器实际效果

**验证方式**：

1. 启动本地开发服务器：`pnpm dev --port 5173`
2. 注入模拟登录态到 `localStorage`
3. 访问 `http://localhost:5173/wms/stock-takes/st-001`
4. Playwright 截图保存

**验证结果**：

- [x] 页面标题：盘点单详情 — ST2026000001
- [x] 面包屑：首页 / 仓储管理 / 盘点管理 / St 001
- [x] 状态标签：已审批
- [x] 信息卡片：账实一致 2 / 盘盈（数多）3 / 盘亏（数少）3 / 准确率 25%
- [x] 盘点差异清单：SKU、名称、库位、系统数、实盘数、差额、原因
- [x] 差额列：绿色 0、橙色 +1、红色 -2

**截图**：`scripts/design-system-audit/reports/wms-stock-take-detail-migrated.png`

> 注：截图右侧彩色浮动标签为开发环境「微前端可观测性面板」浮层，与本次页面迁移无关。

---

## 6. 迁移收益

- 移除所有 Tailwind 布局和颜色类名
- HTML 表格升级为 `DataTable`，获得排序、响应式、列设置能力
- 自定义颜色类升级为 MUI 主题语义 token，支持暗色模式
- 4 个独立统计卡片聚合为 `infoCard.stats`
- 自动获得面包屑、返回按钮、响应式布局

---

## 7. 可复用模式

此示例适合推广到以下页面：

- 需要在详情页内嵌对比/差异表格的页面
- 需要根据数值正负显示不同主题色的列
- 需要展示准确率、完成率等汇总指标的详情页

**复用模式：**

1. 将状态指示列封装为 `DiffCell` 这类小型组件
2. 使用 `success.main` / `warning.main` / `error.main` 等语义 token 替代硬编码颜色
3. 汇总统计直接放入 `infoCard.stats`
