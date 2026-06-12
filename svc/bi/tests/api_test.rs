use axum::{routing::get, Router};
use axum_test::TestServer;
use http::StatusCode;
use serde_json::{json, Value};
use topems_shared::ApiResponse;

macro_rules! parse_json {
    ($response:expr) => {{
        let text = $response.text();
        serde_json::from_str::<Value>(&text).unwrap()
    }};
}

#[tokio::test]
async fn test_rs_summary_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/rs/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["message"].is_string());
    assert!(body["data"].is_object());

    let data = &body["data"];
    assert!(data["summary"].is_object());
    assert!(data["generated_at"].is_string());

    let summary = &data["summary"];
    assert!(summary["total_projects"].is_number());
    assert!(summary["active_projects"].is_number());
    assert!(summary["completed_projects"].is_number());
    assert!(summary["avg_duration"].is_number());
    assert!(summary["total_projects"].as_i64().unwrap() >= 0);
}

#[tokio::test]
async fn test_rs_project_timeline_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/rs/project-timeline").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["timeline"].is_array());

    let timeline = body["data"]["timeline"].as_array().unwrap();
    assert!(!timeline.is_empty());
    for item in timeline {
        assert!(item["month"].is_string());
        assert!(item["count"].is_number());
        assert!(item["count"].as_i64().unwrap() >= 0);
    }
}

#[tokio::test]
async fn test_rs_experiment_success_rate_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/rs/experiment-success-rate").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let data = &body["data"];
    assert!(data["success_rate"].is_array());
    assert!(data["avg_success_rate"].is_number());

    let success_rate = data["success_rate"].as_array().unwrap();
    for item in success_rate {
        assert!(item["month"].is_string());
        assert!(item["rate"].is_number());
        let rate = item["rate"].as_f64().unwrap();
        assert!((0.0..=100.0).contains(&rate));
    }
}

#[tokio::test]
async fn test_lims_summary_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/lims/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let summary = &body["data"]["summary"];
    assert!(summary["total_samples"].is_number());
    assert!(summary["completed_tests"].is_number());
    assert!(summary["pending_tests"].is_number());
    assert!(summary["avg_turnaround"].is_number());
    assert!(
        summary["total_samples"].as_i64().unwrap() >= summary["completed_tests"].as_i64().unwrap()
    );
}

#[tokio::test]
async fn test_lims_sample_timeline_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/lims/sample-timeline").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let timeline = body["data"]["timeline"].as_array().unwrap();
    assert_eq!(timeline.len(), 6);
    for item in timeline {
        assert!(item["month"].is_string());
        assert!(item["count"].as_i64().unwrap() >= 0);
    }
}

#[tokio::test]
async fn test_lims_test_pass_rate_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/lims/test-pass-rate").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let pass_rate = body["data"]["pass_rate"].as_array().unwrap();
    for item in pass_rate {
        let rate = item["rate"].as_f64().unwrap();
        assert!((0.0..=100.0).contains(&rate));
    }
}

#[tokio::test]
async fn test_qms_summary_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/qms/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let summary = &body["data"]["summary"];
    assert_eq!(
        summary["total_inspections"].as_i64().unwrap(),
        summary["passed"].as_i64().unwrap() + summary["failed"].as_i64().unwrap()
    );
}

#[tokio::test]
async fn test_qms_quality_trend_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/qms/quality-trend").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["quality_trend"].is_array());
}

#[tokio::test]
async fn test_qms_issue_distribution_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/qms/issue-distribution").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let distribution = body["data"]["distribution"].as_array().unwrap();
    let total: f64 = distribution
        .iter()
        .map(|d| d["value"].as_f64().unwrap())
        .sum();
    assert!((total - 100.0).abs() < 0.01);
}

#[tokio::test]
async fn test_ehs_summary_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/ehs/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let summary = &body["data"]["summary"];
    assert!(summary["total_risks"].as_i64().unwrap() >= summary["high_risks"].as_i64().unwrap());
}

#[tokio::test]
async fn test_ehs_risk_distribution_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/ehs/risk-distribution").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let distribution = body["data"]["distribution"].as_array().unwrap();
    let total: i64 = distribution
        .iter()
        .map(|d| d["value"].as_i64().unwrap())
        .sum();
    assert_eq!(total, 125);
}

#[tokio::test]
async fn test_ehs_incident_trend_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/ehs/incident-trend").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let incident_trend = body["data"]["incident_trend"].as_array().unwrap();
    for item in incident_trend {
        assert!(item["count"].as_i64().unwrap() >= 0);
    }
}

#[tokio::test]
async fn test_srm_summary_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/srm/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let summary = &body["data"]["summary"];
    let rating = summary["avg_rating"].as_f64().unwrap();
    assert!((0.0..=5.0).contains(&rating));
}

#[tokio::test]
async fn test_srm_supplier_ranking_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/srm/supplier-ranking").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let ranking = body["data"]["ranking"].as_array().unwrap();
    assert_eq!(ranking.len(), 5);
    for supplier in ranking {
        assert!(supplier["name"].is_string());
        assert!(
            supplier["rating"].as_f64().unwrap() >= 0.0
                && supplier["rating"].as_f64().unwrap() <= 5.0
        );
        assert!(supplier["orders"].as_i64().unwrap() >= 0);
    }
}

#[tokio::test]
async fn test_srm_order_timeline_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/srm/order-timeline").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let timeline = body["data"]["timeline"].as_array().unwrap();
    for item in timeline {
        assert!(item["count"].as_i64().unwrap() >= 0);
    }
}

#[tokio::test]
async fn test_pdm_summary_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/pdm/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let summary = &body["data"]["summary"];
    let efficiency = summary["efficiency"].as_f64().unwrap();
    assert!((0.0..=100.0).contains(&efficiency));
}

#[tokio::test]
async fn test_pdm_production_trend_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/pdm/production-trend").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let production_trend = body["data"]["production_trend"].as_array().unwrap();
    for item in production_trend {
        assert!(item["output"].as_i64().unwrap() >= 0);
    }
}

#[tokio::test]
async fn test_pdm_batch_status_distribution_api() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/pdm/batch-status-distribution").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);

    let distribution = body["data"]["distribution"].as_array().unwrap();
    let total: i64 = distribution
        .iter()
        .map(|d| d["value"].as_i64().unwrap())
        .sum();
    assert_eq!(total, 450);
}

#[tokio::test]
async fn test_module_detail_api_rs() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/rs").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["summary"].is_object());
    assert!(body["data"]["timeline"].is_array());
    assert!(body["data"]["success_rate"].is_array());
    assert!(body["data"]["distribution"].is_array());
}

#[tokio::test]
async fn test_module_detail_api_lims() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/lims").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["summary"].is_object());
}

#[tokio::test]
async fn test_module_detail_api_qms() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/qms").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["summary"].is_object());
}

#[tokio::test]
async fn test_module_detail_api_ehs() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/ehs").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["summary"].is_object());
}

#[tokio::test]
async fn test_module_detail_api_srm() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/srm").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["summary"].is_object());
}

#[tokio::test]
async fn test_module_detail_api_pdm() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/pdm").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["summary"].is_object());
}

#[tokio::test]
async fn test_module_detail_api_unknown() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/unknown").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    assert_eq!(body["code"], 200);
    assert!(body["data"]["error"].is_string());
}

#[tokio::test]
async fn test_invalid_endpoint_returns_404() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/invalid/path").await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_empty_module_id_returns_not_found() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/").await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_response_structure_consistency() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let endpoints = [
        "/api/v1/bi/rs/summary",
        "/api/v1/bi/lims/summary",
        "/api/v1/bi/qms/summary",
        "/api/v1/bi/ehs/summary",
        "/api/v1/bi/srm/summary",
        "/api/v1/bi/pdm/summary",
    ];

    for endpoint in endpoints {
        let response = server.get(endpoint).await;
        assert_eq!(response.status_code(), StatusCode::OK);

        let body = parse_json!(response);
        assert!(
            body.is_object(),
            "Response is not an object for {}",
            endpoint
        );
        let body_obj = body.as_object().unwrap();
        assert!(
            body_obj.contains_key("code"),
            "Missing 'code' in response for {}",
            endpoint
        );
        assert!(
            body_obj.contains_key("message"),
            "Missing 'message' in response for {}",
            endpoint
        );
        assert!(
            body_obj.contains_key("data"),
            "Missing 'data' in response for {}",
            endpoint
        );
        assert_eq!(body["code"], 200, "Invalid status code for {}", endpoint);
    }
}

#[tokio::test]
async fn test_generated_at_timestamp_format() {
    let app = create_test_app();
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/bi/rs/summary").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body = parse_json!(response);
    let generated_at = body["data"]["generated_at"].as_str().unwrap();

    assert!(
        chrono::DateTime::parse_from_rfc3339(generated_at).is_ok(),
        "Invalid timestamp format: {}",
        generated_at
    );
}

fn create_test_app() -> Router {
    use axum::Json;
    use chrono::Utc;

    Router::new()
        .route(
            "/api/v1/bi/rs/summary",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "summary": {
                            "total_projects": 120,
                            "active_projects": 45,
                            "completed_projects": 75,
                            "avg_duration": 45.5,
                        },
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取RS模块摘要数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/rs/project-timeline",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "timeline": [
                            { "month": "1月", "count": 25 },
                            { "month": "2月", "count": 30 },
                            { "month": "3月", "count": 28 },
                            { "month": "4月", "count": 35 },
                            { "month": "5月", "count": 42 },
                            { "month": "6月", "count": 38 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取RS项目时间线数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/rs/experiment-success-rate",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "success_rate": [
                            { "month": "1月", "rate": 85 },
                            { "month": "2月", "rate": 88 },
                            { "month": "3月", "rate": 90 },
                            { "month": "4月", "rate": 87 },
                            { "month": "5月", "rate": 92 },
                            { "month": "6月", "rate": 95 },
                        ],
                        "avg_success_rate": 90.5,
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取RS实验成功率数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/lims/summary",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "summary": {
                            "total_samples": 2450,
                            "completed_tests": 2150,
                            "pending_tests": 180,
                            "avg_turnaround": 48,
                        },
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取LIMS模块摘要数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/lims/sample-timeline",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "timeline": [
                            { "month": "1月", "count": 420 },
                            { "month": "2月", "count": 380 },
                            { "month": "3月", "count": 450 },
                            { "month": "4月", "count": 520 },
                            { "month": "5月", "count": 480 },
                            { "month": "6月", "count": 550 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取LIMS样品时间线数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/lims/test-pass-rate",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "pass_rate": [
                            { "month": "1月", "rate": 96.5 },
                            { "month": "2月", "rate": 97.2 },
                            { "month": "3月", "rate": 97.8 },
                            { "month": "4月", "rate": 98.1 },
                            { "month": "5月", "rate": 97.6 },
                            { "month": "6月", "rate": 98.5 },
                        ],
                        "avg_pass_rate": 97.8,
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取LIMS检验通过率数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/qms/summary",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "summary": {
                            "total_inspections": 3250,
                            "passed": 3180,
                            "failed": 70,
                            "pass_rate": 97.8,
                        },
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取QMS模块摘要数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/qms/quality-trend",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "quality_trend": [
                            { "month": "1月", "rate": 96.5 },
                            { "month": "2月", "rate": 97.2 },
                            { "month": "3月", "rate": 97.8 },
                            { "month": "4月", "rate": 98.1 },
                            { "month": "5月", "rate": 97.6 },
                            { "month": "6月", "rate": 97.8 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取QMS质量趋势数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/qms/issue-distribution",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "distribution": [
                            { "name": "合格", "value": 97.8 },
                            { "name": "不合格", "value": 2.2 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取QMS问题分布数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/ehs/summary",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "summary": {
                            "total_risks": 125,
                            "high_risks": 15,
                            "incidents": 18,
                            "resolved": 110,
                        },
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取EHS模块摘要数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/ehs/risk-distribution",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "distribution": [
                            { "name": "高风险", "value": 15 },
                            { "name": "中风险", "value": 45 },
                            { "name": "低风险", "value": 65 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取EHS风险分布数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/ehs/incident-trend",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "incident_trend": [
                            { "month": "1月", "count": 3 },
                            { "month": "2月", "count": 2 },
                            { "month": "3月", "count": 4 },
                            { "month": "4月", "count": 1 },
                            { "month": "5月", "count": 2 },
                            { "month": "6月", "count": 3 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取EHS事件趋势数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/srm/summary",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "summary": {
                            "total_suppliers": 280,
                            "qualified": 220,
                            "avg_rating": 4.5,
                            "pending_orders": 35,
                        },
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取SRM模块摘要数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/srm/supplier-ranking",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "ranking": [
                            { "name": "供应商A", "rating": 4.8, "orders": 120 },
                            { "name": "供应商B", "rating": 4.6, "orders": 95 },
                            { "name": "供应商C", "rating": 4.5, "orders": 88 },
                            { "name": "供应商D", "rating": 4.3, "orders": 75 },
                            { "name": "供应商E", "rating": 4.2, "orders": 62 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取SRM供应商排名数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/srm/order-timeline",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "timeline": [
                            { "month": "1月", "count": 120 },
                            { "month": "2月", "count": 135 },
                            { "month": "3月", "count": 140 },
                            { "month": "4月", "count": 155 },
                            { "month": "5月", "count": 160 },
                            { "month": "6月", "count": 180 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取SRM订单时间线数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/pdm/summary",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "summary": {
                            "total_batches": 450,
                            "completed": 415,
                            "in_progress": 28,
                            "efficiency": 92.5,
                        },
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取PDM模块摘要数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/pdm/production-trend",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "production_trend": [
                            { "month": "1月", "output": 1850 },
                            { "month": "2月", "output": 2100 },
                            { "month": "3月", "output": 1980 },
                            { "month": "4月", "output": 2350 },
                            { "month": "5月", "output": 2200 },
                            { "month": "6月", "output": 2420 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取PDM生产趋势数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/pdm/batch-status-distribution",
            get(|| async {
                Json(ApiResponse::success(
                    json!({
                        "distribution": [
                            { "name": "已完成", "value": 415 },
                            { "name": "进行中", "value": 28 },
                            { "name": "已取消", "value": 7 },
                        ],
                        "generated_at": Utc::now().to_rfc3339(),
                    }),
                    "获取PDM批次状态分布数据成功",
                ))
            }),
        )
        .route(
            "/api/v1/bi/{module_id}",
            get(|path: axum::extract::Path<String>| async move {
                let module_data = match path.as_str() {
                    "rs" => json!({
                        "summary": { "total_projects": 120, "active_projects": 45 },
                        "timeline": [{ "month": "1月", "count": 25 }],
                        "success_rate": [{ "month": "1月", "rate": 85 }],
                        "distribution": [{ "name": "研发", "value": 60 }],
                    }),
                    "lims" => json!({
                        "summary": { "total_samples": 2450, "completed_tests": 2150 },
                        "timeline": [{ "month": "1月", "count": 420 }],
                        "pass_rate": [{ "month": "1月", "rate": 96.5 }],
                        "distribution": [{ "name": "化学检验", "value": 40 }],
                    }),
                    "qms" => json!({
                        "summary": { "total_inspections": 3250, "passed": 3180 },
                        "timeline": [{ "month": "1月", "count": 520 }],
                        "quality_trend": [{ "month": "1月", "rate": 96.5 }],
                        "distribution": [{ "name": "合格", "value": 97.8 }],
                    }),
                    "ehs" => json!({
                        "summary": { "total_risks": 125, "high_risks": 15 },
                        "timeline": [{ "month": "1月", "count": 15 }],
                        "incident_trend": [{ "month": "1月", "count": 3 }],
                        "distribution": [{ "name": "高风险", "value": 15 }],
                    }),
                    "srm" => json!({
                        "summary": { "total_suppliers": 280, "qualified": 220 },
                        "timeline": [{ "month": "1月", "count": 220 }],
                        "order_trend": [{ "month": "1月", "count": 120 }],
                        "distribution": [{ "name": "合格", "value": 220 }],
                    }),
                    "pdm" => json!({
                        "summary": { "total_batches": 450, "completed": 415 },
                        "timeline": [{ "month": "1月", "count": 1850 }],
                        "production_trend": [{ "month": "1月", "rate": 88 }],
                        "distribution": [{ "name": "已完成", "value": 415 }],
                    }),
                    _ => json!({ "error": "未知的模块ID" }),
                };
                Json(ApiResponse::success(module_data, "获取模块详细数据成功"))
            }),
        )
}
