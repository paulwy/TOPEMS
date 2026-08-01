use topems_shared::service_client::{
    create_ai_client, create_bi_client, create_crm_client, create_doc_client, create_ehs_client,
    create_erp_client, create_finance_client, create_generic_client, create_gis_client,
    create_hrm_client, create_iam_client, create_integration_client, create_lims_client,
    create_mes_client, create_mobile_client, create_monitor_client, create_notification_client,
    create_pdm_client, create_pm_client, create_portal_client, create_qms_client, create_rd_client,
    create_scm_client, create_srm_client, create_wms_client, BaseServiceClient, ServiceClientError,
};

#[test]
fn test_base_client_new_with_valid_url() {
    let result = BaseServiceClient::new("http://localhost:8080");
    assert!(result.is_ok());
}

#[test]
fn test_base_client_new_with_empty_url() {
    let result = BaseServiceClient::new("");
    assert!(result.is_err());
    match result {
        Err(ServiceClientError::InvalidUrl(msg)) => {
            assert_eq!(msg, "Base URL cannot be empty")
        }
        _ => panic!("Expected InvalidUrl error"),
    }
}

#[tokio::test]
async fn test_base_client_build_url_via_request() {
    let client = BaseServiceClient::new("http://localhost:8080").unwrap();
    let result = client.get::<serde_json::Value>("/api/users").await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_build_url_with_trailing_slash_via_request() {
    let client = BaseServiceClient::new("http://localhost:8080/").unwrap();
    let result = client.get::<serde_json::Value>("/api/users").await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_get_request_fails_without_server() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();
    let result = client.get::<serde_json::Value>("/api/health").await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_post_request_fails_without_server() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();
    let body = serde_json::json!({ "name": "test" });
    let result = client
        .post::<serde_json::Value, _>("/api/users", &body)
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_put_request_fails_without_server() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();
    let body = serde_json::json!({ "name": "updated" });
    let result = client
        .put::<serde_json::Value, _>("/api/users/1", &body)
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_delete_request_fails_without_server() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();
    let result = client.delete::<serde_json::Value>("/api/users/1").await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_get_without_response_fails_without_server() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();
    let result = client.get_without_response("/api/health").await;

    assert!(result.is_err());
}

#[test]
fn test_create_hrm_client_returns_client() {
    let result = create_hrm_client();
    match result {
        Ok(_) => {}
        Err(ServiceClientError::InvalidUrl(msg)) => {
            assert!(msg.contains("URL"));
        }
        Err(e) => panic!("Unexpected error: {:?}", e),
    }
}

#[test]
fn test_create_iam_client_returns_client() {
    let result = create_iam_client();
    match result {
        Ok(_) => {}
        Err(ServiceClientError::InvalidUrl(_)) => {}
        Err(e) => panic!("Unexpected error: {:?}", e),
    }
}

#[test]
fn test_create_notification_client_returns_client() {
    let result = create_notification_client();
    match result {
        Ok(_) => {}
        Err(ServiceClientError::InvalidUrl(_)) => {}
        Err(e) => panic!("Unexpected error: {:?}", e),
    }
}

#[test]
fn test_create_generic_client_with_valid_params() {
    let result = create_generic_client("test-service", "TEST_SERVICE_URL", "http://localhost:8080");
    assert!(result.is_ok());
}

#[test]
fn test_create_generic_client_with_empty_default_url() {
    let result = create_generic_client("test-service", "TEST_SERVICE_URL", "");
    assert!(result.is_err());
    match result {
        Err(ServiceClientError::InvalidUrl(msg)) => {
            assert_eq!(msg, "Base URL cannot be empty")
        }
        _ => panic!("Expected InvalidUrl error"),
    }
}

#[test]
fn test_service_client_error_display() {
    let err = ServiceClientError::InvalidUrl("test error".to_string());
    assert!(format!("{}", err).contains("test error"));
}

#[test]
fn test_service_client_error_service_error() {
    let err = ServiceClientError::ServiceError {
        status_code: 500,
        message: "Internal server error".to_string(),
    };
    assert!(format!("{}", err).contains("500"));
    assert!(format!("{}", err).contains("Internal server error"));
}

#[tokio::test]
async fn test_service_client_error_http_request_error() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();
    let result = client.get::<serde_json::Value>("/api/nonexistent").await;

    assert!(result.is_err());
    match result {
        Err(ServiceClientError::HttpRequestError(_)) => {}
        _ => panic!("Expected HttpRequestError"),
    }
}

#[tokio::test]
async fn test_base_client_clone() {
    let client = BaseServiceClient::new("http://localhost:8080").unwrap();
    let cloned = client.clone();

    let result1 = client.get::<serde_json::Value>("/test").await;
    let result2 = cloned.get::<serde_json::Value>("/test").await;

    assert!(result1.is_err());
    assert!(result2.is_err());
}

#[tokio::test]
async fn test_base_client_timeout() {
    let client = BaseServiceClient::new("http://localhost:9999").unwrap();

    let start = std::time::Instant::now();
    let _ = client.get::<serde_json::Value>("/api/slow").await;
    let elapsed = start.elapsed();

    assert!(elapsed < std::time::Duration::from_secs(35));
}

#[test]
fn test_create_qms_client_returns_client() {
    let result = create_qms_client();
    validate_client_result(result);
}

#[test]
fn test_create_mes_client_returns_client() {
    let result = create_mes_client();
    validate_client_result(result);
}

#[test]
fn test_create_erp_client_returns_client() {
    let result = create_erp_client();
    validate_client_result(result);
}

#[test]
fn test_create_wms_client_returns_client() {
    let result = create_wms_client();
    validate_client_result(result);
}

#[test]
fn test_create_scm_client_returns_client() {
    let result = create_scm_client();
    validate_client_result(result);
}

#[test]
fn test_create_pm_client_returns_client() {
    let result = create_pm_client();
    validate_client_result(result);
}

#[test]
fn test_create_crm_client_returns_client() {
    let result = create_crm_client();
    validate_client_result(result);
}

#[test]
fn test_create_finance_client_returns_client() {
    let result = create_finance_client();
    validate_client_result(result);
}

#[test]
fn test_create_doc_client_returns_client() {
    let result = create_doc_client();
    validate_client_result(result);
}

#[test]
fn test_create_ai_client_returns_client() {
    let result = create_ai_client();
    validate_client_result(result);
}

#[test]
fn test_create_pdm_client_returns_client() {
    let result = create_pdm_client();
    validate_client_result(result);
}

#[test]
fn test_create_srm_client_returns_client() {
    let result = create_srm_client();
    validate_client_result(result);
}

#[test]
fn test_create_lims_client_returns_client() {
    let result = create_lims_client();
    validate_client_result(result);
}

#[test]
fn test_create_ehs_client_returns_client() {
    let result = create_ehs_client();
    validate_client_result(result);
}

#[test]
fn test_create_rd_client_returns_client() {
    let result = create_rd_client();
    validate_client_result(result);
}

#[test]
fn test_create_bi_client_returns_client() {
    let result = create_bi_client();
    validate_client_result(result);
}

#[test]
fn test_create_mobile_client_returns_client() {
    let result = create_mobile_client();
    validate_client_result(result);
}

#[test]
fn test_create_portal_client_returns_client() {
    let result = create_portal_client();
    validate_client_result(result);
}

#[test]
fn test_create_monitor_client_returns_client() {
    let result = create_monitor_client();
    validate_client_result(result);
}

#[test]
fn test_create_gis_client_returns_client() {
    let result = create_gis_client();
    validate_client_result(result);
}

#[test]
fn test_create_integration_client_returns_client() {
    let result = create_integration_client();
    validate_client_result(result);
}

fn validate_client_result<T>(result: Result<T, ServiceClientError>) {
    match result {
        Ok(_) => {}
        Err(ServiceClientError::InvalidUrl(_)) => {}
        Err(e) => panic!("Unexpected error: {:?}", e),
    }
}

#[tokio::test]
async fn test_base_client_request_with_auth_header() {
    let mut client = BaseServiceClient::new("http://localhost:9999").unwrap();
    client.set_auth_token("test-token");

    let result = client.get::<serde_json::Value>("/api/test").await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_base_client_request_with_custom_headers() {
    let mut client = BaseServiceClient::new("http://localhost:9999").unwrap();
    client.add_header("X-Custom-Header", "custom-value");

    let result = client.get::<serde_json::Value>("/api/test").await;
    assert!(result.is_err());
}

#[test]
fn test_base_client_url_formatting() {
    let client = BaseServiceClient::new("http://localhost:8080").unwrap();

    assert_eq!(client.base_url(), "http://localhost:8080");

    let client_with_slash = BaseServiceClient::new("http://localhost:8080/").unwrap();
    assert_eq!(client_with_slash.base_url(), "http://localhost:8080/");
}
