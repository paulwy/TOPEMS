//! Integration tests for the Tauri desktop IPC API client.
//!
//! These tests verify all API client functions (get, post, put, delete),
//! retry behavior, metrics collection, and auth token management
//! using a mock HTTP server (wiremock).
//!
//! Note: Tests use a global mutex to ensure serial execution because
//! they share global state (env vars, API_METRICS, AUTH_TOKEN).

use std::env;
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use wiremock::matchers::{method, path, query_param, header};
use wiremock::{Mock, MockServer, ResponseTemplate};

// Global test mutex to ensure serial execution (shared global state)
lazy_static::lazy_static! {
    static ref TEST_MUTEX: Mutex<()> = Mutex::new(());
}

// ─── Test data models ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct Issue {
    id: String,
    title: String,
    status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct Project {
    id: String,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct PluginInfo {
    id: String,
    name: String,
    version: String,
    enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

// ─── Helpers ─────────────────────────────────────────────────────

struct TestGuard {
    _lock: std::sync::MutexGuard<'static, ()>,
}

impl TestGuard {
    fn new() -> Self {
        TestGuard {
            _lock: TEST_MUTEX.lock().unwrap_or_else(|e| e.into_inner()),
        }
    }
}

fn reset_metrics() {
    let mut metrics = topems_desktop::api_client::API_METRICS.lock().unwrap();
    *metrics = topems_desktop::api_client::ApiMetrics::default();
}

fn reset_auth_token() {
    topems_desktop::api_client::set_auth_token(None);
}

// ─── Tests: Configuration ────────────────────────────────────────

#[tokio::test]
async fn test_api_base_url_default() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();
    env::remove_var("TOPEMS_API_URL");
    let url = topems_desktop::api_client::get_api_base_url();
    assert_eq!(url, "http://localhost:8080");
}

#[tokio::test]
async fn test_api_base_url_from_env() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();
    env::set_var("TOPEMS_API_URL", "http://custom:9090");
    let url = topems_desktop::api_client::get_api_base_url();
    assert_eq!(url, "http://custom:9090");
    env::remove_var("TOPEMS_API_URL");
}

// ─── Tests: Auth Token Management ────────────────────────────────

#[tokio::test]
async fn test_auth_token_set_get() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();
    assert!(topems_desktop::api_client::get_auth_token().is_none());

    topems_desktop::api_client::set_auth_token(Some("test-token-123".to_string()));
    let token = topems_desktop::api_client::get_auth_token();
    assert_eq!(token, Some("test-token-123".to_string()));

    topems_desktop::api_client::set_auth_token(None);
    assert!(topems_desktop::api_client::get_auth_token().is_none());
}

#[tokio::test]
async fn test_auth_token_env_fallback() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();
    topems_desktop::api_client::set_auth_token(None);
    env::set_var("TOPEMS_AUTH_TOKEN", "env-token-456");
    let token = topems_desktop::api_client::get_auth_token();
    assert_eq!(token, Some("env-token-456".to_string()));
    env::remove_var("TOPEMS_AUTH_TOKEN");
}

// ─── Tests: GET requests ─────────────────────────────────────────

#[tokio::test]
async fn test_get_issue_list() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let issues = vec![
        Issue { id: "1".to_string(), title: "Fix bug".to_string(), status: "open".to_string() },
        Issue { id: "2".to_string(), title: "Add feature".to_string(), status: "closed".to_string() },
    ];
    let response = ApiResponse { success: true, data: Some(issues), error: None };

    Mock::given(method("GET"))
        .and(path("/tickets"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets", None, None, None).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 2);

    let metrics = topems_desktop::api_client::get_metrics();
    assert_eq!(metrics.success_count, 1);
}

#[tokio::test]
async fn test_get_with_query_params() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let issues = vec![Issue { id: "1".to_string(), title: "Open Issue".to_string(), status: "open".to_string() }];
    let response = ApiResponse { success: true, data: Some(issues), error: None };

    Mock::given(method("GET"))
        .and(path("/tickets"))
        .and(query_param("status", "open"))
        .and(query_param("project_id", "proj-1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let params: &[(&str, &str)] = &[("status", "open"), ("project_id", "proj-1")];
    let result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets", Some(params), None, None).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 1);
}

#[tokio::test]
async fn test_get_with_auth_token() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let response = ApiResponse {
        success: true,
        data: Some(vec![Issue { id: "1".to_string(), title: "Auth Issue".to_string(), status: "open".to_string() }]),
        error: None,
    };

    Mock::given(method("GET"))
        .and(path("/tickets"))
        .and(header("authorization", "Bearer test-jwt-token"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets", None, Some("test-jwt-token"), None).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_get_project_list() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let projects = vec![
        Project { id: "p1".to_string(), name: "Project Alpha".to_string() },
        Project { id: "p2".to_string(), name: "Project Beta".to_string() },
    ];
    let response = ApiResponse { success: true, data: Some(projects), error: None };

    Mock::given(method("GET"))
        .and(path("/projects"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<Project>>(&client, "/projects", None, None, None).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 2);
}

#[tokio::test]
async fn test_get_plugin_list() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let plugins = vec![
        PluginInfo { id: "p1".to_string(), name: "Analytics".to_string(), version: "1.0".to_string(), enabled: true },
    ];
    let response = ApiResponse { success: true, data: Some(plugins), error: None };

    Mock::given(method("GET"))
        .and(path("/plugins"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<PluginInfo>>(&client, "/plugins", None, None, None).await;

    assert!(result.is_ok());
}

// ─── Tests: POST (create) ────────────────────────────────────────

#[tokio::test]
async fn test_create_issue() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let new_issue = Issue { id: "new-1".to_string(), title: "New Issue".to_string(), status: "open".to_string() };
    let response = ApiResponse { success: true, data: Some(new_issue), error: None };

    Mock::given(method("POST"))
        .and(path("/tickets"))
        .respond_with(ResponseTemplate::new(201).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let body = serde_json::json!({ "title": "New Issue", "status": "open" });
    let result = topems_desktop::api_client::post::<Issue, _>(&client, "/tickets", &body, None, None).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap().id, "new-1");
}

#[tokio::test]
async fn test_create_project() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let new_project = Project { id: "proj-new".to_string(), name: "New Project".to_string() };
    let response = ApiResponse { success: true, data: Some(new_project), error: None };

    Mock::given(method("POST"))
        .and(path("/projects"))
        .respond_with(ResponseTemplate::new(201).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let body = serde_json::json!({ "name": "New Project" });
    let result = topems_desktop::api_client::post::<Project, _>(&client, "/projects", &body, None, None).await;

    assert!(result.is_ok());
}

// ─── Tests: PUT (update) ─────────────────────────────────────────

#[tokio::test]
async fn test_update_issue() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let updated = Issue { id: "1".to_string(), title: "Updated".to_string(), status: "in_progress".to_string() };
    let response = ApiResponse { success: true, data: Some(updated), error: None };

    Mock::given(method("PUT"))
        .and(path("/tickets/1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let body = serde_json::json!({ "title": "Updated", "status": "in_progress" });
    let result = topems_desktop::api_client::put::<Issue, _>(&client, "/tickets/1", &body, None, None).await;

    assert!(result.is_ok(), "PUT /tickets/1 failed: {:?}", result.err());
    assert_eq!(result.unwrap().status, "in_progress");
}

#[tokio::test]
async fn test_update_project() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let updated = Project { id: "p1".to_string(), name: "Renamed".to_string() };
    let response = ApiResponse { success: true, data: Some(updated), error: None };

    Mock::given(method("PUT"))
        .and(path("/projects/p1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let body = serde_json::json!({ "name": "Renamed" });
    let result = topems_desktop::api_client::put::<Project, _>(&client, "/projects/p1", &body, None, None).await;

    assert!(result.is_ok());
}

// ─── Tests: DELETE ────────────────────────────────────────────────

#[tokio::test]
async fn test_delete_issue() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let response = ApiResponse { success: true, data: Some(()), error: None };

    Mock::given(method("DELETE"))
        .and(path("/tickets/1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::delete::<()>(&client, "/tickets/1", None, None).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_delete_project() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let response = ApiResponse { success: true, data: Some(()), error: None };

    Mock::given(method("DELETE"))
        .and(path("/projects/p1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::delete::<()>(&client, "/projects/p1", None, None).await;

    assert!(result.is_ok());
}

// ─── Tests: Error handling ────────────────────────────────────────

#[tokio::test]
async fn test_api_business_error() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let response = ApiResponse {
        success: false,
        data: None::<Vec<Issue>>,
        error: Some("Ticket not found".to_string()),
    };

    Mock::given(method("GET"))
        .and(path("/tickets/999"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets/999", None, None, None).await;

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Ticket not found"));
}

#[tokio::test]
async fn test_http_404_error() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    Mock::given(method("GET"))
        .and(path("/tickets/999"))
        .respond_with(ResponseTemplate::new(404).set_body_string("Not Found"))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets/999", None, None, None).await;

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("404"));
}

// ─── Tests: Retry mechanism ───────────────────────────────────────

#[tokio::test]
async fn test_retry_on_5xx_get() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    // Server always returns 500 - client retries up to 3 times
    Mock::given(method("GET"))
        .and(path("/tickets/retry-test"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets/retry-test", None, None, None).await;

    assert!(result.is_err());

    let metrics = topems_desktop::api_client::get_metrics();
    assert_eq!(metrics.total_requests, 1);
    assert_eq!(metrics.failure_count, 1);
    // After 3 retries, retry_count should be > 0
    assert!(metrics.retry_count > 0, "retry_count should be > 0, got {}", metrics.retry_count);
}

#[tokio::test]
async fn test_no_retry_on_4xx_get() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    // 4xx errors should NOT be retried
    Mock::given(method("GET"))
        .and(path("/tickets/bad"))
        .respond_with(ResponseTemplate::new(400).set_body_string("Bad Request"))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let _result = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/tickets/bad", None, None, None).await;

    let metrics = topems_desktop::api_client::get_metrics();
    assert_eq!(metrics.retry_count, 0, "4xx errors should not be retried");
}

// ─── Tests: Metrics ────────────────────────────────────────────────

#[tokio::test]
async fn test_metrics_success_count() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let response = ApiResponse {
        success: true,
        data: Some(vec![Issue { id: "1".to_string(), title: "OK".to_string(), status: "open".to_string() }]),
        error: None,
    };

    Mock::given(method("GET"))
        .and(path("/metrics-ok"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let _ = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/metrics-ok", None, None, None).await;

    let metrics = topems_desktop::api_client::get_metrics();
    assert_eq!(metrics.total_requests, 1);
    assert_eq!(metrics.success_count, 1);
    assert_eq!(metrics.failure_count, 0);
}

#[tokio::test]
async fn test_metrics_failure_count() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let response = ApiResponse {
        success: false,
        data: None::<Vec<Issue>>,
        error: Some("Server error".to_string()),
    };

    Mock::given(method("GET"))
        .and(path("/metrics-err"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let _ = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/metrics-err", None, None, None).await;

    let metrics = topems_desktop::api_client::get_metrics();
    assert_eq!(metrics.total_requests, 1);
    assert_eq!(metrics.failure_count, 1);
}

#[tokio::test]
async fn test_metrics_multiple_requests() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    let ok_resp = ApiResponse {
        success: true,
        data: Some(vec![Issue { id: "1".to_string(), title: "OK".to_string(), status: "open".to_string() }]),
        error: None,
    };
    let err_resp = ApiResponse {
        success: false,
        data: None::<Vec<Issue>>,
        error: Some("Error".to_string()),
    };

    Mock::given(method("GET"))
        .and(path("/multi-a"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ok_resp.clone()))
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path("/multi-b"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ok_resp.clone()))
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path("/multi-c"))
        .respond_with(ResponseTemplate::new(200).set_body_json(err_resp))
        .mount(&mock_server)
        .await;

    let client = topems_desktop::api_client::create_client().unwrap();
    let _ = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/multi-a", None, None, None).await;
    let _ = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/multi-b", None, None, None).await;
    let _ = topems_desktop::api_client::get::<Vec<Issue>>(&client, "/multi-c", None, None, None).await;

    let metrics = topems_desktop::api_client::get_metrics();
    assert_eq!(metrics.total_requests, 3);
    assert_eq!(metrics.success_count, 2);
    assert_eq!(metrics.failure_count, 1);
}

// ─── Tests: Timeout ───────────────────────────────────────────────

#[tokio::test]
async fn test_timeout_handling() {
    let _guard = TestGuard::new();
    reset_metrics();
    reset_auth_token();

    let mock_server = MockServer::start().await;
    env::set_var("TOPEMS_API_URL", &mock_server.uri());

    Mock::given(method("GET"))
        .and(path("/slow"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string("OK")
                .set_delay(Duration::from_secs(60)),
        )
        .mount(&mock_server)
        .await;

    // Create a client with a very short timeout (1s) to trigger timeout errors
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(1))
        .build()
        .unwrap();

    let start = std::time::Instant::now();
    let result = topems_desktop::api_client::get::<String>(&client, "/slow", None, None, None).await;
    let elapsed = start.elapsed();

    assert!(result.is_err());

    // Timeout will trigger retry logic (1s timeout + 3 retries with delays 1s, 2s, 4s)
    // Maximum expected: 4 attempts * 1s timeout + (1+2+4)s backoff = ~11s
    assert!(elapsed < Duration::from_secs(15), "Timeout test took too long: {:?}", elapsed);

    // Verify metrics were updated with retries
    let metrics = topems_desktop::api_client::get_metrics();
    assert!(metrics.retry_count > 0, "Expected retry_count > 0, got {}", metrics.retry_count);
    assert_eq!(metrics.failure_count, 1);
}
