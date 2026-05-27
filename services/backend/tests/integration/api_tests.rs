use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestProductionPlan {
    pub id: String,
    pub product_name: String,
    pub product_code: String,
    pub planned_quantity: i32,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCreatePlanRequest {
    pub product_name: String,
    pub product_code: String,
    pub planned_quantity: i32,
    pub start_date: String,
    pub end_date: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
}

#[derive(Debug)]
pub struct TestAppState {
    pub plans: Mutex<Vec<TestProductionPlan>>,
}

impl TestAppState {
    fn new() -> Self {
        TestAppState {
            plans: Mutex::new(vec![]),
        }
    }
}

async fn test_get_plans(State(state): State<Arc<TestAppState>>) -> Json<TestApiResponse<Vec<TestProductionPlan>>> {
    let plans = state.plans.lock().unwrap().clone();
    Json(TestApiResponse {
        success: true,
        data: Some(plans),
        message: "Success".to_string(),
    })
}

async fn test_create_plan(
    State(state): State<Arc<TestAppState>>,
    Json(request): Json<TestCreatePlanRequest>,
) -> Json<TestApiResponse<TestProductionPlan>> {
    let plan = TestProductionPlan {
        id: Uuid::new_v4().to_string(),
        product_name: request.product_name,
        product_code: request.product_code,
        planned_quantity: request.planned_quantity,
        start_date: request.start_date,
        end_date: request.end_date,
        status: "计划中".to_string(),
        created_by: request.created_by,
    };

    state.plans.lock().unwrap().push(plan.clone());
    
    Json(TestApiResponse {
        success: true,
        data: Some(plan),
        message: "创建成功".to_string(),
    })
}

pub fn create_test_app() -> Router {
    let state = Arc::new(TestAppState::new());
    
    Router::new()
        .route("/api/plans", get(test_get_plans).post(test_create_plan))
        .with_state(state)
}

#[cfg(test)]
mod api_tests {
    use super::*;
    use axum::http::{Method, StatusCode};
    use axum::body::Body;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_get_plans_empty() {
        let app = create_test_app();
        
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/plans")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_create_plan() {
        let app = create_test_app();
        
        let request_body = TestCreatePlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .method(Method::POST)
                    .uri("/api/plans")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&request_body).unwrap()))
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_plans_after_create() {
        let app = create_test_app();
        
        let request_body = TestCreatePlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        app.clone()
            .oneshot(
                axum::http::Request::builder()
                    .method(Method::POST)
                    .uri("/api/plans")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&request_body).unwrap()))
                    .unwrap()
            )
            .await
            .unwrap();
        
        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/api/plans")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }
}
