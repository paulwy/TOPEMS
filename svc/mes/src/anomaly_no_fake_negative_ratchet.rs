//! MES「异常检测」禁止假阴性的棘轮。
//!
//! 背景：`svc/mes/src/modules/anomaly_detection.rs` 的异常扫描靠 8 处
//! `if let Ok(rows) = sqlx::query(...)` 取数，查询一失败就当成「零行」，
//! 三个检测器于是各自返回空告警列表，`collect_all_alerts` 再合并成空集合，
//! `/api/mes/anomaly/alerts`、`/anomaly/summary`、`/anomaly/scan` 全部返回
//! 「无异常」——数据库挂了、schema 漂了、权限错了，界面永远是绿色的。
//!
//! 另有 6 处 `.parse().unwrap_or(0.0)` / `try_get(...).unwrap_or(0.0)`：温度、振动、
//! 噪声读数缺失被当成 0 参与阈值判断与趋势均值（0 度、0 振动永远不越界），
//! OEE / 产量 / 完工数量解析失败被当成 0（成本与完工率直接编出来）。
//!
//! 本棘轮锁住这些痕迹：取数失败必须显形为 `Err`，读数缺失必须是 `NaN` 或跳过，
//! 数值解析失败不许降级成 0。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

const SOURCE: &str = include_str!("modules/anomaly_detection.rs");

fn forbid(haystack: &str, needle: &str) {
    assert!(
        !haystack.contains(needle),
        "anomaly_detection.rs 不应再出现：{needle}"
    );
}

fn require(haystack: &str, needle: &str) {
    assert!(
        haystack.contains(needle),
        "anomaly_detection.rs 缺少片段：{needle}"
    );
}

#[test]
fn queries_never_degrade_into_empty_result_sets() {
    // 查询失败即「零行」= 扫描恒报无异常，这是本批要消灭的假阴性根因
    forbid(SOURCE, "if let Ok(rows) = sqlx::query");
    forbid(
        SOURCE,
        ".fetch_all(&mut *scope)\n    .await\n    .unwrap_or_default()",
    );
    // 失败必须计数并向上抛
    require(
        SOURCE,
        "failures.push(format!(\"设备巡检读数查询失败: {e}\"));",
    );
    require(SOURCE, "failures.push(format!(\"WIP 积压查询失败: {e}\"));");
    require(SOURCE, "Err(failures.join(\"；\"))");
}

#[test]
fn detectors_and_callers_propagate_failures() {
    require(SOURCE, "-> Result<Vec<AnomalyAlert>, String>");
    require(SOURCE, "async fn collect_all_alerts(");
    require(
        SOURCE,
        "ApiResponse::server_error(&format!(\"设备异常检测失败: {e}\"))",
    );
    require(
        SOURCE,
        "ApiResponse::server_error(&format!(\"异常检测失败: {e}\"))",
    );
    require(
        SOURCE,
        "ApiResponse::server_error(&format!(\"异常趋势获取失败: {e}\"))",
    );
}

#[test]
fn missing_readings_are_never_treated_as_zero() {
    // 0 度 / 0 振动 / 0 噪声会天然通过所有上限阈值，缺失必须是 NaN
    forbid(SOURCE, "temp.unwrap_or(0.0)");
    forbid(SOURCE, "vibration.unwrap_or(0.0)");
    forbid(SOURCE, "noise.unwrap_or(0.0)");
    require(SOURCE, "temp.unwrap_or(f64::NAN)");
    // 趋势样本只收三值齐全的记录
    require(
        SOURCE,
        "if let (Some(t), Some(v), Some(n)) = (temp, vibration, noise)",
    );
}

#[test]
fn numeric_parse_failures_never_become_zero() {
    forbid(SOURCE, ".parse().unwrap_or(0.0)");
    forbid(SOURCE, "parse().unwrap_or(0.0)");
    require(SOURCE, "数值解析失败");
    require(SOURCE, "fn read_order_quantities(");
    require(SOURCE, "数量读取失败");
}
