use axum::{
    body::Body,
    http::Request,
    routing::get,
    Router,
};
use tower::ServiceExt;

#[tokio::test]
async fn test_health_endpoint() {
    let app = Router::new().route("/health", get(health_handler));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), 200);
}

async fn health_handler() -> &'static str {
    "OK"
}

#[tokio::test]
async fn test_api_endpoint_structure() {
    let app = Router::new().route("/api/v1/users", get(users_handler));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/users")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), 200);
}

async fn users_handler() -> &'static str {
    "Unauthorized"
}
