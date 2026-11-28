# MES 生产成本：单价、时薪、工时、制造费用四处编造（B373）

- 日期：2026-11-28
- 范围：`svc/mes/src/modules/production_cost.rs`（工单成本 → 生产订单成本 → 周期报表 / 成本趋势的公共地基）
- 结论：工单成本明细里「材料单价」「人工时薪」「工时」「制造费用」四项全部不是库里的数，
  而下游所有报表（周期报表、趋势、订单成本、单位成本）都建在这四项之上。
  B372 修的是三个报表端点自己编数，本批修的是**归集函数本身在编**。

## 1. 编造点（修复前）

`calculate_work_order_cost_detail_db` 是 `get_period_cost_report`、`calculate_production_order_cost`、
`get_cost_trend` 全部调用的地基函数，修复前：

| # | 编造 | 证据 | 后果 |
|---|------|------|------|
| 1 | 材料单价 = `10.0 + mat_code.len() * 2.0` | 物料编码越长越贵 | 材料成本与真实采购价无关，纯按字符串长度算命 |
| 2 | 人工时薪 = `50.0`（常量） | 无任何费率来源 | 人工成本 = 工时 × 50，费率无出处 |
| 3 | 工时缺失时 = `8.0` 小时 | `(Some,Some)` 之外一律 8 | 未开工/未完工工单也按满 8 小时计人工 |
| 4 | 制造费用 = `labor_cost * 1.5` | 固定 1.5 倍分摊系数 | 制造费用随假人工成本等比放大 |

## 2. 顺带查出的读列错误：工时永远落回 8 小时

```rust
let actual_start = work_order.try_get("actual_start_time").ok().flatten();
let actual_end   = work_order.try_get("actual_end_time").ok().flatten();
```

`mes.work_orders` 的实际列名是 `actual_start_date` / `actual_end_date`（`information_schema.columns` 核对，
表内不存在 `*_time`）。`try_get` 失败被 `.ok()` 吞掉 → 两个值恒为 `None` → **所有工单的工时恒等 8.0**。
也就是说，第 3 项编造在实际运行中是 100% 命中的，不是「缺数据时才发生」的兜底。

## 3. 修复

1. 工时读列改为 `actual_start_date` / `actual_end_date`，读列失败 `TopemsError::DatabaseQuery` 上抛；
   只有两端都存在且区间为正才得到 `Some(hours)`，否则 `None` 并进缺口清单。
2. 材料单价改取真实来源 `public.inventory.unit_price`（`tenant_id` + `deleted_at IS NULL` +
   `material_code = ANY($2)`，`MAX(NULLIF(unit_price,0))` 聚合到物料粒度）。
   查不到有效单价 → 金额不进合计、明细行 `unit_price=0`，并把「有量无价」写进 `data_gaps`。
3. 材料用量按 BOM 损耗率放大：`BOM 单耗 × (1 + loss_rate) × 产出量`（原实现直接丢 `loss_rate`）。
4. 删除 `hourly_rate = 50.0`：人工成本按 0 计，只保留真实工时数字并记缺口
   「人工费率无权威来源（HR 月薪/工艺工时定额未接入 mes）」。
5. 删除 `overhead_cost = labor_cost * 1.5`：制造费用按 0 计并记缺口
   「制造费用无分摊依据（设备折旧/能耗/管理费用费率未接入）」。
6. 结果结构新增 `data_gaps: Vec<String>`（`#[serde(default)]`，老前端不传不炸）：
   **空数组才表示料工费全部按真实口径计价**；非空即「这条成本不完整」，不再用 0 假装真值。

## 4. 验证

- `cargo test -p topems-mes --lib` → **442 passed, 0 failed**（B372 时 440，本批新增 2 条棘轮）
- `cargo clippy -p topems-mes --all-targets -- -D warnings` → 通过
- `cargo fmt --all --check` → 通过
- 本机数据实况：`public.inventory` 仅 2 行且 `unit_price=0`，`erp.materials` 10 行单价多为 0/NULL →
  本机跑出来的每条工单成本都会带 `data_gaps`，这是**预期行为**（有缺口就报缺口，不补数）。

## 5. 遗留（下一批）

1. **权威单价仍读不到**：`wms.inventory.standard_cost` / `average_cost`、`erp.materials.unit_price`
   才是成本价真相源，但 `scripts/schema_boundary.json` 里 `services.mes.allow=[]`，跨 schema 读会被
   `check-schema-prefix` 判 `CROSS_SCHEMA`（不可基线豁免）。要么给 mes 加只读 allow + 理由登记，
   要么经 BFF 调 WMS/ERP 取价。批内先用共享层 `public.inventory` 顶，属于「能跑通但价源降级」。
2. **人工费率无来源**：`hrm.employees.monthly_salary`（20261128010000 迁移刚补）可作为月薪来源，
   但还缺「工单 → 操作工 → 工时定额」的绑定；`mes.work_orders` 只有 `operator`/`team_id` 文本与班组，
   没有人员 ID 外键。
3. **制造费用分摊规则未定义**：设备折旧、能耗（`mes` 有 energy 记录）、管理费用三种口径都缺费率表。
4. **前端契约错位**（B372 已记，仍未修）：`apps/web/src/components/mes/ProductionCostPage.tsx`
   的 `CostTrendResponse` / `CostForecastResponse` 与后端字段完全不一致；本批新增的 `data_gaps`
   前端也不展示，用户看不到「这条成本不完整」。
5. 周期报表与订单成本只累加金额，未汇总 `data_gaps`；建议下一批加 `cost_completeness`
   （已计价行数 / 总行数）供报表页标记。

## 6. 棘轮

`svc/mes/src/cost_no_fabrication_ratchet.rs` 追加 2 条（共 6 条）：

- `cost_detail_never_invents_unit_price_or_hourly_rate`：禁止 `10.0 + mat_code.len()*2.0`、
  `let hourly_rate = 50.0;`、`duration_hours = 8.0`、`labor_cost * 1.5` 回归。
- `cost_detail_reads_real_sources_and_reports_gaps`：要求存在 `FROM public.inventory`、
  `MAX(NULLIF(unit_price, 0))`、`actual_start_date` / `actual_end_date`，禁止 `actual_start_time`，
  并要求 `pub data_gaps: Vec<String>` 与三类缺口文案在位。
