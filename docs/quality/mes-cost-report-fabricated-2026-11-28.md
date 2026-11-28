# MES 成本报表：趋势/预测/对比不再编造结论（B372）

- 日期：2026-11-28
- 服务：`svc/mes`（`modules/production_cost.rs`）
- 主题：W5-B 假成功治理 —— 「用固定公式充当经营指标」与「归集失败当成没发生」

## 1. 问题：三个端点在编数，不看库

| 端点 | 原实现 | 后果 |
| --- | --- | --- |
| `GET /cost/trend` | 只查窗口内工单条数 `cnt`，然后 `base_cost = cnt * 500`、`variation = i*50 + cnt*100`，料/工/费按 55%/25%/20% 硬拆，单价 `100 + i*5` 递增 | 曲线形状只由「工单数」和「下标」决定，与实际成本无关；查询失败 `Err(_) => 0` 直接跌成 0 成本 |
| `POST /cost/comparison` | 按数组下标编 `total = 10000 + idx*2000`，料/工/费 55/25/20，单价 `100 + idx*20`、数量 `100 + idx*50` | 拿任意 id 都能得到「一条完整对比结论」，与库里任何一行无关 |
| `GET /cost/forecast` | 历史点 `50000 + i*5000`、预测点 `80000 + i*3000`、上下界 ±10%、`confidence: 85`、`trend: "upward"` | 预测图表 100% 是常量；`period_type` 参数被 `_params` 吃掉 |

另外 `get_cost_trend` 的 `Query(params)` 被改成 `_params`，`_start_date` 算了不用——入参被静默丢弃，
前端传 `period_type=month` 也只能拿到固定 12 周的编造序列。

## 2. 问题：归集与读列失败被当成「没有」

`get_period_cost_report`（GET `/cost/period`）：

- `if let Ok(rows) = work_orders`：工单查询失败 → 空报表，`total_cost = 0`，仍返回「获取成功」；
- `if let Ok((cost, _)) = calculate_...`：单张工单归集失败 → 跳过，总额静默少一块；
- `row.try_get("id").unwrap_or_default()` / `product_code` / `product_name`：读列失败变成 nil uuid、空串，
  产品维度直接以空串为键聚合；
- 工位维度把**产品名**当工位名（`workshop_costs.entry(product_name)`），工位 ID 与名称错位。

`calculate_production_order_cost`（GET `/cost/production-order/{id}`）：

- 同样的 `if let Ok(rows)` + `if let Ok((cost, _))` 双吞；
- `let actual_qty = quantity.max(1.0)`：计划数量缺失或 0 时把分母硬撑成 1，单价被人为缩小 N 倍却报「计算成功」。

`calculate_work_order_cost_detail_db`（所有报表的地基）：

- `plan/completed_qty` 用 `.ok().flatten()`，`product_code` 用 `unwrap_or_default()`：读列失败 → 空产品编码 →
  BOM 查不到 → 材料成本静默归 0；
- `let actual_qty = completed_qty.max(planned_qty).max(1.0)`：产出量为 0 时臆造 1。

## 3. 修复

1. `GET /cost/trend` 改为**真实聚合**：按 `PeriodQuery` 的 `start_date/end_date`（缺省近 90 天）取窗口内
   已开工工单，逐单调用 `calculate_work_order_cost_detail_db` 归集料/工/费，按自然周（周一为起点）或
   自然月分桶；`avg_unit_cost = 桶内总成本 / 桶内完工数量`。`period_type` 只接受 `week|month`，
   其他值 400 明确拒绝（不再假装能出日/季/年曲线）；时间参数解析失败或 `start > end` → 400。
2. `POST /cost/comparison` 改为显式 503：请求契约只有 `id/name/type`，没有时间窗口、
   也没有「id → 生产订单/产品/车间」的映射，任何数值都是编的，因此不再返回编造对比。路由本身仍要求 `mes:cost:write`，未接入不等于放开鉴权。
3. `GET /cost/forecast` 改为显式 503：本服务没有预测模型与回测口径，常量曲线全部删除。
4. 周期报表：工单查询、读列、单工单归集一律 `match` 上抛 500；工位维度改为 `LEFT JOIN mes.work_stations`
   取真实 `station_name`，`workshop_costs` 以工位 id 为键；产品名优先真实 `product_name`，缺失才回落编码。
5. 生产订单成本：查询/读列/归集失败一律 500；删除 `max(1.0)`，数量为 0 时 `unit_cost = 0`（不可计算）。
6. 工单成本地基：读列失败改 `TopemsError::DatabaseQuery` 上抛；`output_qty` 取「完工优先、其次计划」，
   为 0 时不臆造 1，`unit_cost` 与 `quantity` 都按真实产出量计算。

## 4. 验证

- `cargo test -p topems-mes --lib` → **440 passed, 0 failed**（含 4 条新棘轮）。
- `cargo clippy -p topems-mes --all-targets -- -D warnings` → 通过。
- `cargo fmt --all --check` → 通过。
- 权限口径不变：三个端点仍走 `ModulePermission::ProductionCostRead`；`/cost/comparison` 的
  `utoipa` 注解去掉不再成立的 `mes:cost:write`（它是只读对比，不是写操作）。

## 5. 遗留（下一批要处理的地基问题）

1. **材料单价是编的**：`unit_price = 10.0 + mat_code.len() * 2.0`——单价只和物料编码长度有关。
   真实来源候选：`wms.inventory.standard_cost`、`erp.materials.unit_price`、`scm.purchase_items.unit_price`
   （取哪个、跨 schema 读还是经 BFF 调 WMS，属跨服务契约决策）。
2. **时薪是编的**：`hourly_rate = 50.0`；**工时缺省是编的**：无实际开完工时间时 `duration_hours = 8.0`。
3. **制造费用是编的**：`overhead = labor_cost * 1.5`，无任何分摊依据。
4. 前端 `ProductionCostPage` 的 `CostTrendResponse` / `CostForecastResponse` 期望
   `trend_data/overall_trend/avg_change_rate`、`confidence_interval/trend_factor/seasonality_factor`，
   与后端契约（`labels/total_cost/...`、`forecast_*`）完全不一致——这两个 tab 本来就没渲染出真实数据。
   修 UI 需要与上面 1-3 的数据源一起做，单独立批。
5. `get_period_cost_report` 的「近 6 个自然月」仍把无工单月份显示为 0 成本（已注明「如实为 0」），
   与「成本未归集」仍不可区分，待成本要素数据源落地后再区分。

## 6. 棘轮

`svc/mes/src/cost_no_fabrication_ratchet.rs`（4 个 `#[test]`）：

1. `trend_never_multiplies_order_count_into_cost`：禁止 `cnt as f64 * 500.0`、`* 0.55/0.25/0.20`、
   `100.0 + (i as f64 * 5.0)`、`Err(_) => 0,`；
2. `trend_aggregates_real_work_order_cost`：必须存在 `CostTrendBucket`、逐单归集调用、
   `parse_period_window`、「仅支持 week / month」、周一取整；
3. `forecast_and_comparison_are_explicitly_unavailable`：必须出现「成本预测未接入」「成本对比未接入真实口径」
   与 `TopemsError::ServiceUnavailable`；禁止 `confidence: 85.0`、`forecast_avg_unit_cost: 130.0` 等常量；
4. `period_report_never_swallows_failures`：禁止 `if let Ok(rows) = work_orders`、`if let Ok((cost, _))`、
   `try_get(...).unwrap_or_default()`；必须 `LEFT JOIN mes.work_stations` 且使用 `station_names`。
