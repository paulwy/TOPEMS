//! MES APS「约束检查 / 优化报告」禁止伪造结论的棘轮。
//!
//! 背景：`check_schedule_constraints` 曾把物料齐套性直接写成
//! `available_quantity = required * 1.2`（注释「模拟充足」）+ `shortfall = 0.0` + `Passed`，
//! 从不查任何库存；设备分支按 `try_get("name")` 取名字，而 SQL 里选的是 `equipment_name`，
//! 于是设备名恒为空串，`next_available_time` 直接编造 `now + 2h`；三处 `if let Ok(...)`
//! 把查询失败静默跳过，结果就是「查不到 = 通过」，不齐套的订单照样 `overall_passed = true`。
//!
//! `get_optimization_report` 同类问题：三个 `COUNT(*)` 用 `unwrap_or(0)` 吞错、
//! `AVG` 用 `.ok().flatten()` 吞错、工位负载列名写成 `name`（SQL 是 `station_name`）、
//! 把「计划小时数」当「利用率百分比」（量纲错）、`impact_score` 按数组下标取 0.9/0.6，
//! 以及「提升产能 15-20%」「减少排程时间 80%」这类没有任何数据支撑的收益承诺。
//!
//! 本棘轮锁住这些具体痕迹，防止回退成「数据缺失就判通过」。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

const SOURCE: &str = include_str!("modules/aps_scheduling.rs");

fn forbid(haystack: &str, needle: &str) {
    assert!(
        !haystack.contains(needle),
        "aps_scheduling.rs 不应再出现：{needle}"
    );
}

fn require(haystack: &str, needle: &str) {
    assert!(
        haystack.contains(needle),
        "aps_scheduling.rs 缺少片段：{needle}"
    );
}

#[test]
fn material_availability_is_never_guessed() {
    // 「需求 × 系数」假装够用、以及把缺口写死 0 的写法必须消失
    forbid(SOURCE, "required * 1.2");
    forbid(SOURCE, "模拟充足");
    forbid(SOURCE, "shortfall: 0.0,");
    // 未知必须显式表达，并且不得被当成通过
    require(SOURCE, "ConstraintStatus::Unknown");
    require(SOURCE, "pub available_quantity: Option<f64>");
}

#[test]
fn equipment_names_and_availability_are_real() {
    // 列名错位（SQL 选 equipment_name，代码取 name）会让设备名恒为空
    forbid(SOURCE, "try_get(\"name\").unwrap_or_default()");
    // 编造的「两小时后可用」必须消失，改用真实保养计划日期
    forbid(SOURCE, "Duration::hours(2))\n                    ,");
    forbid(SOURCE, "Some(Utc::now() + Duration::hours(2))");
    require(SOURCE, "try_get(\"equipment_name\")");
}

#[test]
fn constraint_queries_do_not_swallow_errors() {
    // 三条约束查询都必须 match 上抛，不能再 if let Ok 静默跳过
    forbid(SOURCE, "if let Ok(items) = bom_items");
    forbid(SOURCE, "if let Ok(equips) = equipment");
    forbid(SOURCE, "if let Ok(team_list) = teams");
    require(SOURCE, "约束检查失败：BOM 查询出错");
}

#[test]
fn optimization_report_does_not_fake_metrics() {
    // 工位负载列名 / 量纲 / 伪造影响分
    forbid(SOURCE, "load.try_get(\"name\")");
    forbid(SOURCE, "let impact = if idx < 3");
    forbid(SOURCE, "total_hours.unwrap_or(0.0).min(100.0)");
    require(SOURCE, "try_get(\"station_name\")");
    require(SOURCE, "schedule_window_hours");
    // 无依据的收益承诺
    forbid(SOURCE, "提升产能 15-20%");
    forbid(SOURCE, "减少排程时间 80%");
    forbid(SOURCE, "提升准时交付率至 90%+");
    // 准时率口径必须是「实际完工 <= 计划完工」
    require(SOURCE, "actual_end_date <= planned_end_date");
}
