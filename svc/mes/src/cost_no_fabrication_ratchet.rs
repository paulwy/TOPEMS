//! MES「生产成本报表」禁止伪造结论的棘轮。
//!
//! 背景：`svc/mes/src/modules/production_cost.rs` 的四个报表端点里，三个是在编数：
//!
//! - `get_cost_trend`：查询只取窗口内工单条数 `cnt`，然后
//!   `base_cost = cnt * 500`、`variation = i*50 + cnt*100`，料/工/费按 55%/25%/20% 硬拆，
//!   单价用 `100 + i*5` 递增；查询失败 `Err(_) => 0`，`Query(params)` 被改成 `_params`
//!   完全不读，固定「近 12 周」；
//! - `get_cost_comparison`：按数组下标编 `10000 + idx*2000`，料/工/费 55/25/20，
//!   单价 `100 + idx*20`、数量 `100 + idx*50`，与库里任何一行都无关；
//! - `get_cost_forecast`：历史点 `50000 + i*5000`、预测点 `80000 + i*3000`、
//!   置信区间 ±10%、`confidence: 85`、`trend: "upward"`，全是常量；
//! - `get_period_cost_report`：`if let Ok(rows)` / `if let Ok((cost, _))` 把查询与归集失败
//!   静默跳过、`try_get(...).unwrap_or_default()` 把读列失败变成空串/零值，
//!   工位维度还拿**产品名**当工位名。
//!
//! 本棘轮锁住这些痕迹：趋势必须来自真实归集、预测与对比必须显式不可用、
//! 报表的每一处读列/归集失败必须显形。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

const SOURCE: &str = include_str!("modules/production_cost.rs");

fn forbid(haystack: &str, needle: &str) {
    assert!(
        !haystack.contains(needle),
        "production_cost.rs 不应再出现：{needle}"
    );
}

fn require(haystack: &str, needle: &str) {
    assert!(
        haystack.contains(needle),
        "production_cost.rs 缺少片段：{needle}"
    );
}

#[test]
fn trend_never_multiplies_order_count_into_cost() {
    // 「工单数 × 系数」当成本、按固定比例硬拆料工费、单价按数组下标递增 —— 全部禁止
    forbid(SOURCE, "cnt as f64 * 500.0");
    forbid(SOURCE, "* 0.55");
    forbid(SOURCE, "* 0.25");
    forbid(SOURCE, "* 0.20");
    forbid(SOURCE, "100.0 + (i as f64 * 5.0)");
    // 查询失败不许降级成 0 成本
    forbid(SOURCE, "Err(_) => 0,");
}

#[test]
fn trend_aggregates_real_work_order_cost() {
    require(SOURCE, "struct CostTrendBucket");
    require(
        SOURCE,
        "calculate_work_order_cost_detail_db(&mut scope, wo_id, tenant_id)",
    );
    require(SOURCE, "parse_period_window");
    require(SOURCE, "仅支持 week / month");
    require(SOURCE, "num_days_from_monday");
}

#[test]
fn forecast_and_comparison_are_explicitly_unavailable() {
    require(SOURCE, "成本预测未接入");
    require(SOURCE, "成本对比未接入真实口径");
    require(SOURCE, "TopemsError::ServiceUnavailable");
    // 编造的历史点/预测点/置信度/单价必须消失
    forbid(SOURCE, "confidence: 85.0");
    forbid(SOURCE, "forecast_avg_unit_cost: 130.0");
    forbid(SOURCE, "10000.0 + (idx as f64 * 2000.0)");
    forbid(SOURCE, "80000.0 + (i as f64 * 3000.0)");
}

#[test]
fn period_report_never_swallows_failures() {
    forbid(SOURCE, "if let Ok(rows) = work_orders");
    forbid(SOURCE, "if let Ok((cost, _))");
    forbid(SOURCE, "try_get(\"id\").unwrap_or_default()");
    forbid(SOURCE, "try_get(\"product_code\").unwrap_or_default()");
    // 工位维度必须取真实工位名，而不是拿产品名顶替
    require(SOURCE, "LEFT JOIN mes.work_stations ws");
    require(SOURCE, "station_names");
}

// ===== B373：单价 / 时薪 / 工时 / 制造费用的编造痕迹 =====

#[test]
fn cost_detail_never_invents_unit_price_or_hourly_rate() {
    // 单价按物料编码长度算命（10 + len*2）、时薪固定 50、无工时就默认 8 小时
    forbid(SOURCE, "10.0 + (mat_code.len() as f64) * 2.0");
    forbid(SOURCE, "let hourly_rate = 50.0;");
    forbid(SOURCE, "duration_hours = 8.0");
    // 制造费用按人工成本 1.5 倍编分摊系数
    forbid(SOURCE, "labor_cost * 1.5");
}

#[test]
fn cost_detail_reads_real_sources_and_reports_gaps() {
    // 真实单价来源（共享层库存单价）
    require(SOURCE, "FROM public.inventory");
    require(SOURCE, "MAX(NULLIF(unit_price, 0))");
    // 真实工时列（work_orders 只有 actual_start_date / actual_end_date）
    require(SOURCE, "actual_start_date");
    require(SOURCE, "actual_end_date");
    forbid(SOURCE, "actual_start_time");
    // 有量无价 / 无费率必须进 data_gaps，而不是静默算成 0
    require(SOURCE, "pub data_gaps: Vec<String>");
    require(SOURCE, "无有效单价");
    require(SOURCE, "人工费率无权威来源");
    require(SOURCE, "制造费用无分摊依据");
}
