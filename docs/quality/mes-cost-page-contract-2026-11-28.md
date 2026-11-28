# MES 生产成本页：前端按「不存在的后端字段」渲染（B374）

- 日期：2026-11-28
- 范围：`apps/web/src/components/mes/ProductionCostPage.tsx`、`apps/web/src/api/mes/productionCost.ts`
- 结论：后端 B372/B373 已经把成本数据改真实、把预测/对比改成显式 503，但前端类型还停在旧契约上，
  四个 tab 里三个读的字段后端从来不返回；页面不报错、只是画空/画 `undefined`，
  属于「UI 假装有数据」的假成功。

## 1. 契约错位清单（修复前）

| 位置 | 前端读的字段 | 后端实际返回 | 表现 |
|------|--------------|--------------|------|
| 趋势折线 + 趋势表 | `trend_data: [{period,total_cost,...}]` | `labels / total_cost / material_cost / labor_cost / overhead_cost / avg_unit_cost`（并列数组） | `trendData.trend_data.map` 在 `undefined` 上调用 → 折线为空，整页数据面塌成空白 |
| 趋势卡片 | `overall_trend`、`avg_change_rate` | 不存在（B372 已删「趋势判断」） | 卡片显示 `undefined`，方向图标恒为空 |
| 趋势表列 | `trend_direction`、`change_rate` | 不存在 | 两列恒空 |
| 预测卡片/图/表 | `forecast_total/forecast_material/forecast_labor/forecast_overhead/forecast_period/confidence_interval/trend_factor/seasonality_factor` | 端点 503，无 body | 请求 reject，四个卡片、柱状图、明细表全部空，页面却仍标「预测」 |
| 工单成本卡片 | `produced_qty` | `quantity` | 产量恒 `undefined` |
| 工单成本占比 | `material/total*100` 直除 | `total_cost` 可为 0（B373 起无真实单价时 material=0） | 除零 → 展示 `NaN%` |
| 产品维度表 | 期望 `product_id` | 返回 `product_code/product_name/total_cost/unit_cost/quantity/percentage` | 少一列可用字段 |
| 工单成本明细表 | 只用 `category/amount/percentage` | 还返回 `sub_category/description/unit/unit_price/quantity` | 明细只剩三列，看不出「单价 0 = 有量无价」 |
| 工单成本 | 无 | B373 新增 `data_gaps: string[]` | 页面完全不展示，用户看不到成本不完整 |

## 2. 修复

1. `productionCost.ts`：`CostTrendData` 改成与 `svc/mes` 的 `CostTrendData` 一一对应（`labels` + 六个并列数值数组）；
   `WorkOrderCostResult` 补 `quantity/currency/calculated_at/data_gaps`、`production_order_no` 允许 `null`，
   明细项补 `sub_category/description/unit/unit_price/quantity`；`ProductCostItem` 去掉不存在的 `product_id`。
2. 预测/对比两个方法改为 `apiClient.mes.get<never>` / `post<never>`（后端 503），并在注释里写清
   「保留调用点语义、页面按未接入处理」，不再声明一套假响应类型。
3. 页面趋势 tab：按 index 把并列数组合成 `trendPoints`，折线画「总成本」与「单位成本」两条；
   卡片改为「期间总成本」「平均单位成本」；表格列改为 周期/总成本/材料/人工/制造/单位成本，
   删掉 `overall_trend`、`avg_change_rate`、`trend_direction`、`change_rate` 四处。
4. 预测 tab：不再发请求，改为一条 `Alert` 明示「成本预测未接入：后端返回 503，不再展示编造曲线」。
5. 工单成本 tab：产量字段改 `quantity`；新增 `data_gaps` 警示块（逐条列出「有量无价/费率未接入/无分摊依据」）；
   明细表扩到 7 列（分类/子类/说明/数量/单价/金额/占比），单价 ≤ 0 显示 `-`；占比统一走
   `costShare()`，`total_cost=0` 时输出 `0.00%` 而不是 `NaN%`。

## 3. 验证

- `npx tsc --noEmit -p apps/web/tsconfig.json` → 无输出（通过）
- `npx eslint ProductionCostPage.tsx api/mes/productionCost.ts` → 0 error 0 warning
- `npx prettier --check` → 通过
- 新增 i18n 键 `mes.production_cost_page.b374_*` 共 8 个，zh/en 同步（`mes.json` 各 +8 行）

## 4. 遗留

1. 周期报表 tab 仍未展示 `data_gaps` 汇总（后端周期报表也没聚合），需要后端加 `cost_completeness`
   后前端才有东西可显示（B373 文档第 5 节第 5 条）。
2. `QUERY_KEYS.AD_HOC.COSTFORECAST_BASE` 已无调用方，键保留未删（避免影响 reactQuery 常量表结构）。
3. 对比（comparison）端点前端无入口，本次只改类型不改页面；将来接入需要先补「实体 id → 订单/产品/车间」映射。
4. 页面仍是 `StatsPageTemplate` 通用骨架，趋势图未做单位/金额双轴，也未做缺口占比可视化。
