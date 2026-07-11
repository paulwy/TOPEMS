#[tokio::test]
async fn test_get_summary_analytics_response() {
    let result = analytics_service::modules::bi::analytics::get_summary_analytics().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));
    assert!(json["data"].is_object());
    assert!(json["message"].as_str().unwrap_or("").contains("成功"));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("key_metrics"));
    assert!(data["key_metrics"].is_array());
    assert!(data.contains_key("recent_activities"));
    assert!(data["recent_activities"].is_array());
}

#[tokio::test]
async fn test_get_module_analytics_development() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("development".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));
    assert!(json["data"].is_object());

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_projects"));
    assert!(data.contains_key("active_projects"));
    assert!(data.contains_key("project_status_distribution"));
    assert!(data.contains_key("monthly_new_projects"));
}

#[tokio::test]
async fn test_get_module_analytics_quality() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("quality".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));
    assert!(json["data"].is_object());

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_inspections"));
    assert!(data.contains_key("pass_rate"));
    assert!(data.contains_key("quality_trend"));
    assert!(data.contains_key("defect_types"));
}

#[tokio::test]
async fn test_get_module_analytics_production() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("production".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_production_batches"));
    assert!(data.contains_key("production_efficiency"));
    assert!(data.contains_key("daily_output"));
}

#[tokio::test]
async fn test_get_module_analytics_laboratory() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("laboratory".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_samples"));
    assert!(data.contains_key("instrument_usage_rate"));
    assert!(data.contains_key("test_type_distribution"));
}

#[tokio::test]
async fn test_get_module_analytics_ehs() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("ehs".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_incidents"));
    assert!(data.contains_key("safety_compliance_rate"));
    assert!(data.contains_key("incident_trend"));
}

#[tokio::test]
async fn test_get_module_analytics_srm() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("srm".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_suppliers"));
    assert!(data.contains_key("delivery_on_time_rate"));
    assert!(data.contains_key("supplier_rating_distribution"));
}

#[tokio::test]
async fn test_get_module_analytics_invalid_module() {
    let result = analytics_service::modules::bi::analytics::get_module_analytics(
        axum::extract::Path("invalid_module".to_string()),
    )
    .await;

    let json = result.0;
    assert_eq!(json["code"], -1);
    assert!(!json["success"].as_bool().unwrap_or(true));
    assert!(json["data"].is_null());
}

#[tokio::test]
async fn test_get_analytics_overview() {
    let result = analytics_service::modules::bi::analytics::get_analytics_overview().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("development"));
    assert!(data.contains_key("quality"));
    assert!(data.contains_key("production"));
    assert!(data.contains_key("laboratory"));
}

#[tokio::test]
async fn test_get_analytics_report() {
    let result = analytics_service::modules::bi::analytics::get_analytics_report().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("items"));
    assert!(data["items"].is_array());
    assert!(data.contains_key("total"));
    assert!(data.contains_key("page"));
    assert!(data.contains_key("pageSize"));

    let items = data["items"].as_array().unwrap();
    assert!(!items.is_empty());

    for item in items {
        assert!(item.as_object().unwrap().contains_key("id"));
        assert!(item.as_object().unwrap().contains_key("name"));
        assert!(item.as_object().unwrap().contains_key("category"));
        assert!(item.as_object().unwrap().contains_key("status"));
    }
}

#[tokio::test]
async fn test_get_rs_summary() {
    let result = analytics_service::modules::bi::analytics::get_rs_summary().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_projects"));
    assert!(data.contains_key("active_projects"));
    assert!(data.contains_key("total_budget"));
    assert!(data.contains_key("avg_completion_rate"));
}

#[tokio::test]
async fn test_get_lims_summary() {
    let result = analytics_service::modules::bi::analytics::get_lims_summary().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_samples"));
    assert!(data.contains_key("instrument_usage_rate"));
    assert!(data.contains_key("avg_turnaround_hours"));
}

#[tokio::test]
async fn test_get_qms_summary() {
    let result = analytics_service::modules::bi::analytics::get_qms_summary().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_inspections"));
    assert!(data.contains_key("pass_rate"));
    assert!(data.contains_key("total_issues"));
}

#[tokio::test]
async fn test_get_pdm_summary() {
    let result = analytics_service::modules::bi::analytics::get_pdm_summary().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("total_products"));
    assert!(data.contains_key("total_batches"));
}

#[tokio::test]
async fn test_get_ehs_risk_distribution() {
    let result = analytics_service::modules::bi::analytics::get_ehs_risk_distribution().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("by_level"));
    assert!(data["by_level"].is_array());
    assert!(data.contains_key("total_risks"));
}

#[tokio::test]
async fn test_get_srm_supplier_ranking() {
    let result = analytics_service::modules::bi::analytics::get_srm_supplier_ranking().await;

    let json = result.0;
    assert_eq!(json["code"], 0);
    assert!(json["success"].as_bool().unwrap_or(false));

    let data = json["data"].as_object().unwrap();
    assert!(data.contains_key("top_suppliers"));
    assert!(data.contains_key("bottom_suppliers"));
}
