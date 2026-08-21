# WMS Detail 页面迁移模式

> 适用范围：`apps/web/src/pages/wms/*DetailPage.tsx`
> 目标模板：`PageContainer` + `DetailPageTemplate`

---

## 1. 页面根结构标准

```tsx
export default function WmsXxxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const entity = useMemo<XxxDto | undefined>(() => {
    if (!id) return data.xxxList?.[0];
    return (
      data.xxxList?.find((x) => x.id === id || x.xxx_number === id) ?? data.xxxList?.[0]
    );
  }, [id, data.xxxList]);

  if (!entity) {
    return (
      <PageContainer autoTitle autoBreadcrumbs>
        <Typography>{i18n.t('pages.wms_xxx_detail_page.k0')}</Typography>
      </PageContainer>
    );
  }

  return (
    <PageContainer autoTitle autoBreadcrumbs>
      <DetailPageTemplate
        title={i18n.t('wms:wms_xxx_detail_page.v0_n', { v0: entity.xxx_number })}
        subtitle={...}
        detailItemName={entity.xxx_number}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WmsStatusBadge fsm='xxx' status={entity.status} />
            {/* 可选操作按钮 */}
            <WmsFSMActionButtons fsm='xxx' currentStatus={entity.status} onAction={() => {}} />
          </Box>
        }
        infoCard={{
          title: entity.xxx_number,
          subtitle: ...,
          tags: [...],
          stats: [...],
        }}
        sections={[...]}
      />
    </PageContainer>
  );
}
```

---

## 2. 导入顺序标准

```tsx
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

// MUI
import { Box, Typography, ... } from '@mui/material';

// 第三方类型
import type { ColumnDef } from '@tanstack/react-table';

// 项目 API / 类型
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import type { XxxDto } from '@/types/wms';

// 项目组件
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import { DataTable, PageContainer } from '@/components/common';
import { DetailPageTemplate } from '@/components/templates';

// i18n
import i18n from '@/i18n';
```

---

## 3. headerContent 标准

必须统一使用 `Box` 包裹：

```tsx
headerContent={
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <WmsStatusBadge fsm='xxx' status={entity.status} />
    {/* 可选 */}
    <WmsFSMActionButtons fsm='xxx' currentStatus={entity.status} onAction={() => {}} />
  </Box>
}
```

即使只有状态标签，也要保持同样的 `Box` 包裹结构，便于后续扩展。

---

## 4. infoCard 标准

```tsx
infoCard={{
  title: entity.xxx_number,
  subtitle: i18n.t('wms:wms_xxx_detail_page.v0_m', { v0: entity.created_at.slice(0, 10) }),
  tags: [entity.warehouse_name ?? '-', entity.supplier_name ?? '-'],
  stats: [
    { label: i18n.t('...'), value: String(entity.quantity ?? 0) },
    { label: i18n.t('...'), value: `¥${(entity.total_amount ?? 0).toLocaleString()}` },
  ],
}}
```

- `title` 必须是单据号
- `subtitle` 优先显示日期，复杂场景可使用 i18n 组合
- `tags` 不能为空数组，无标签时传 `['-']`
- `stats` value 统一使用 `String(...)` 或 `.toLocaleString()`

---

## 5. sections 标准

每个 section 必须包含 `id`、`title`、`content`：

```tsx
sections={[
  {
    id: 'summary',
    title: i18n.t('pages.wms_xxx_detail_page.k9'),
    content: <DataTable columns={columns} data={items} ... />,
  },
  {
    id: 'timeline',
    title: i18n.t('pages.wms_xxx_detail_page.k10'),
    content: <StatusTimeline items={timelineItems} />,
  },
]}
```

- `title` 必须使用 i18n 键，禁止硬编码中文
- 内嵌 `DataTable` 时，根据场景关闭不需要的功能：

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

---

## 6. 可视化卡片标准

### 6.1 源 → 目标路由卡片

使用 `Card variant='outlined'` 作为外层，源和目标使用主题 palette 区分：

```tsx
<Card variant='outlined'>
  <CardContent>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: 2 }}>
      <Box sx={{ textAlign: 'center', p: 3, borderRadius: 2, bgcolor: 'warning.50', border: 1, borderColor: 'warning.200' }}>
        <Typography variant='caption' sx={{ color: 'warning.800' }}>源</Typography>
        <Typography variant='h6' sx={{ color: 'warning.900', fontWeight: 700, fontFamily: 'monospace' }}>
          {source}
        </Typography>
      </Box>
      {/* 中间图标 */}
      <Box sx={{ textAlign: 'center', p: 3, borderRadius: 2, bgcolor: 'info.50', border: 1, borderColor: 'info.200' }}>
        <Typography variant='caption' sx={{ color: 'info.800' }}>目标</Typography>
        <Typography variant='h6' sx={{ color: 'info.900', fontWeight: 700, fontFamily: 'monospace' }}>
          {target}
        </Typography>
      </Box>
    </Box>
  </CardContent>
</Card>
```

### 6.2 进度条

统一使用 MUI `LinearProgress`：

```tsx
<LinearProgress variant='determinate' value={pct} sx={{ height: 12, borderRadius: 2 }} />
```

---

## 7. 时间轴标准

优先使用共享组件 `StatusTimeline`：

```tsx
import StatusTimeline from '@/components/common/StatusTimeline';
import type { TimelineItem } from '@/components/common/StatusTimeline';

const timelineItems: TimelineItem[] = [
  { id: 'created', title: '...', status: 'completed', time: '...', description: '...' },
];

<StatusTimeline items={timelineItems} />
```

如果业务需要自定义时间轴，遵循以下结构：

```tsx
<Box sx={{ position: 'relative', ml: 1.5, pl: 2, borderLeft: 1, borderColor: 'divider' }}>
  {events.map((e, i) => (
    <Box key={i} sx={{ position: 'relative', mb: 2, pl: 3 }}>
      <Box sx={{ position: 'absolute', left: -7, top: 6, width: 10, height: 10, borderRadius: '50%', bgcolor: e.color, border: 2, borderColor: 'background.paper' }} />
      <Typography variant='caption' color='text.secondary'>{e.time}</Typography>
      <Typography variant='body2' sx={{ fontWeight: 500 }}>{e.title}</Typography>
      <Typography variant='caption' color='text.secondary'>{e.who}</Typography>
    </Box>
  ))}
</Box>
```

---

## 8. Typography 写法标准

- `fontWeight` 必须放在 `sx` 中
- `textAlign` 必须放在 `sx` 中
- 等宽字体使用 `sx={{ fontFamily: 'monospace' }}`

```tsx
{/* 正确 */}
<Typography variant='h6' sx={{ color: 'primary.900', fontWeight: 700 }}>
<Typography variant='body2' sx={{ textAlign: 'right' }}>

{/* 错误 */}
<Typography variant='h6' color='primary.900' fontWeight={700}>
<Typography variant='body2' textAlign='right'>
```

---

## 9. i18n 标准

- 页面标题：`wms:wms_xxx_detail_page.v0_n`（带 `v0` 单据号参数）
- 页面副标题：`wms:wms_xxx_detail_page.v0_m`（带日期/客户参数）
- section 标题：`pages.wms_xxx_detail_page.kN`
- 统计标签：`wms:wms_xxx_detail_page.kN` 或 `pages.wms_xxx_detail_page.kN`
- 新增 key 时，同时更新 `zh/pages.json` / `en/pages.json` 或 `zh/wms.json` / `en/wms.json`

---

## 10. 迁移检查清单

每迁移一个 WMS Detail 页面后，对照以下清单检查：

- [ ] 使用 `PageContainer autoTitle autoBreadcrumbs`
- [ ] 使用 `DetailPageTemplate`
- [ ] `headerContent` 使用 `Box` 包裹
- [ ] `infoCard` 包含 title/subtitle/tags/stats
- [ ] section title 使用 i18n 键
- [ ] 没有硬编码中文文案
- [ ] 没有 `fontWeight` / `textAlign` 作为 Typography 直接属性
- [ ] `DataTable` 根据场景关闭不需要的功能
- [ ] 导入顺序符合标准
- [ ] `pnpm typecheck` 通过
- [ ] 浏览器验证通过
