# 页面模板迁移示例：WmsOutboundDetailPage

> 迁移时间：2026-08-21
> 迁移页面：`apps/web/src/pages/wms/WmsOutboundDetailPage.tsx`
> 推荐模板：`DetailPageTemplate`

---

## 1. 迁移前状态

- **文件**：`apps/web/src/pages/wms/WmsOutboundDetailPage.tsx`
- **行数**：122 行
- **布局方式**：纯 Tailwind CSS
- **页面容器**：未使用 `PageContainer`
- **核心内容**：出库单详情 + 自定义 6 阶段进度条 + 4 个统计卡片
- **数据来源**：`useWmsMock` mock 数据
- **特有组件**：`WmsStatusBadge`、`WmsFSMActionButtons`（保留）

---

## 2. 迁移后状态

- **文件**：`apps/web/src/pages/wms/WmsOutboundDetailPage.tsx`
- **行数**：约 162 行
- **布局方式**：`PageContainer` + `DetailPageTemplate`
- **核心内容**：
  - 统一的详情页头部（标题、副标题、状态、操作按钮）
  - `infoCard` 信息卡片聚合 4 个关键统计
  - `出库进度` 区块使用 MUI `Chip` + `LinearProgress` 重构的 6 阶段进度条

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
    <div className='rounded-lg border p-4'>
      {/* 自定义进度条 */}
    </div>
    <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
      {/* 4 个统计卡片 */}
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
      sections={[{ id: 'progress', title: ..., content: <StageProgress /> }]}
    />
  </PageContainer>
);
```

### 3.2 进度条重构

**迁移前：**

- 使用 Tailwind 的 `rounded-full`、`bg-blue-600`、`bg-gray-200` 等类名
- 手写连接线和阶段标签
- 硬编码颜色，不支持主题切换

**迁移后：**

- 使用 MUI `Chip` 渲染阶段编号
- 使用 MUI `LinearProgress` 渲染底部进度条
- 使用 MUI 主题 token（`primary.main`、`divider`、`text.secondary`）
- 自动支持 light/dark/Cyber 主题

```tsx
function StageProgress({ stageIndex }: { stageIndex: number }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {OUTBOUND_STAGES.map((s, i) => {
          const completed = i <= stageIndex;
          return (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Chip size='small' label={i + 1} color={completed ? 'primary' : 'default'} ... />
              <Typography variant='caption' ...>{labels[s]}</Typography>
              {!isLast && <Box sx={{ flex: 1, height: 2, bgcolor: i < stageIndex ? 'primary.main' : 'divider' }} />}
            </Box>
          );
        })}
      </Box>
      <LinearProgress variant='determinate' value={...} />
    </Box>
  );
}
```

### 3.3 统计卡片

**迁移前：** 4 个独立的 Tailwind 卡片

**迁移后：** 集中到 `DetailPageTemplate` 的 `infoCard.stats` 属性

```tsx
infoCard={{
  title: order.order_number,
  subtitle: ..., // 客户名称
  tags: [order.warehouse_name ?? '-', order.carrier ?? '-'],
  stats: [
    { label: i18n.t('...k7'), value: order.warehouse_name ?? '-' },
    { label: i18n.t('wms:...k1'), value: `${order.carrier ?? '-'} / ${order.tracking_number ?? '-'}` },
    { label: i18n.t('wms:...k0'), value: `${order.picked_quantity ?? 0} / ${order.shipped_quantity ?? 0}` },
    { label: i18n.t('...k8'), value: `¥${(order.total_amount ?? 0).toLocaleString()}` },
  ],
}}
```

---

## 4. 验证结果

### 4.1 TypeScript 类型检查

```bash
pnpm typecheck
```

结果：`WmsOutboundDetailPage.tsx` 无新增类型错误。

### 4.2 浏览器实际效果

**验证方式**：

1. 启动本地开发服务器：`pnpm dev --port 5173`
2. 注入模拟登录态到 `localStorage`
3. 访问 `http://localhost:5173/wms/outbound-orders/out-001`
4. Playwright 截图保存

**验证结果**：

- [x] 页面标题：出库单详情 — OUT2026000001
- [x] 面包屑：首页 / 仓储管理 / 出库管理 / OUT2026000001
- [x] 状态标签：已发布
- [x] 操作按钮：取消 / 开始运行进入试点 / 分配
- [x] 信息卡片：仓库、承运/运单号、数量（拣/发）、总金额
- [x] 出库进度：6 个阶段，当前高亮第 4 阶段「包装」
- [x] 底部进度条正确反映完成比例

**截图**：`scripts/design-system-audit/reports/wms-outbound-detail-migrated.png`

> 注：截图右侧彩色浮动标签为开发环境「微前端可观测性面板」浮层，与页面迁移无关。

---

## 5. 迁移收益

- 移除所有 Tailwind 布局类名
- 4 个独立统计卡片统一为 `infoCard.stats`
- 自定义进度条升级为 MUI 主题感知组件
- 自动获得面包屑、返回按钮、响应式布局、暗色模式

---

## 6. 可复用模式

此示例可推广到以下类型的页面：

- 任何带有阶段/步骤进度展示的详情页
- WmsWavePickDetailPage、WmsTransferDetailPage 等流程型详情页
- MES 中的工单进度、工艺路线详情页

**复用模式：**

1. 将 Tailwind 进度条/步骤条替换为 MUI `Chip` + `LinearProgress` 或 `Stepper`
2. 将分散的统计卡片聚合到 `DetailPageTemplate.infoCard.stats`
3. 将流程可视化作为 `DetailPageTemplate.sections` 的一个独立区块
