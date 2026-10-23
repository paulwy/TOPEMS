#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
// P2 财务域 B：领域 KPI 端点已从"写死 mock KPI"收口为诚实 501/degraded（无真实数据源）。
// 测试随之改为断言降级契约：code=501、success=false、消息说明无数据源，不得再断言写死字段。

/// 断言"领域分析端点已降级为 501、不再返回伪造 KPI"。
fn assert_degraded(json: &serde_json::Value) {
    assert_eq!(json["code"], 501);
    assert!(!json["success"].as_bool().unwrap_or(true));
    let msg = json["message"].as_str().unwrap_or("");
    assert!(
        msg.contains("暂无真实数据源"),
        "message should state no real data source, got: {msg}"
    );
}

#[tokio::test]
async fn test_get_summary_analytics_response_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_summary_analytics().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_development_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("development".to_string()),
    )
    .await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_quality_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("quality".to_string()),
    )
    .await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_production_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("production".to_string()),
    )
    .await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_laboratory_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("laboratory".to_string()),
    )
    .await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_ehs_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("ehs".to_string()),
    )
    .await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_srm_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("srm".to_string()),
    )
    .await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_module_analytics_invalid_module_returns_400() {
    let result = topems_analytics::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("invalid_module".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 400);
    assert!(!json["success"].as_bool().unwrap_or(true));
}

#[tokio::test]
async fn test_get_analytics_overview_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_analytics_overview().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_analytics_report_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_analytics_report().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_rs_summary_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_rs_summary().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_lims_summary_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_lims_summary().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_qms_summary_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_qms_summary().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_pdm_summary_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_pdm_summary().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_ehs_risk_distribution_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_ehs_risk_distribution().await;
    assert_degraded(&result.0);
}

#[tokio::test]
async fn test_get_srm_supplier_ranking_degrades() {
    let result = topems_analytics::modules::bi::analytics::get_srm_supplier_ranking().await;
    assert_degraded(&result.0);
}
