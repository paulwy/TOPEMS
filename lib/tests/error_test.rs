use topems_shared::error::{
    ErrorContext, ErrorRecovery, ErrorStatistics, SafeErrorHandler, TopemsError,
};
use topems_shared::response::ApiResponse;

#[test]
fn test_topems_error_display_database_connection() {
    let err = TopemsError::DatabaseConnection("timeout".to_string());
    assert!(err.to_string().contains("数据库连接失败"));
    assert!(err.to_string().contains("timeout"));
}

#[test]
fn test_topems_error_display_validation_failed() {
    let err = TopemsError::ValidationFailed("invalid input".to_string());
    assert!(err.to_string().contains("数据验证失败"));
    assert!(err.to_string().contains("invalid input"));
}

#[test]
fn test_topems_error_display_permission_denied() {
    let err = TopemsError::PermissionDenied {
        required: "admin".to_string(),
    };
    assert!(err.to_string().contains("权限不足"));
    assert!(err.to_string().contains("admin"));
}

#[test]
fn test_topems_error_display_invalid_token() {
    let err = TopemsError::InvalidToken;
    assert_eq!(err.to_string(), "Token 无效或已过期");
}

#[test]
fn test_topems_error_display_resource_not_found() {
    let err = TopemsError::ResourceNotFound("user".to_string());
    assert!(err.to_string().contains("资源不存在"));
    assert!(err.to_string().contains("user"));
}

#[test]
fn test_topems_error_display_resource_already_exists() {
    let err = TopemsError::ResourceAlreadyExists("duplicate".to_string());
    assert!(err.to_string().contains("资源已存在"));
    assert!(err.to_string().contains("duplicate"));
}

#[test]
fn test_topems_error_display_request_timeout() {
    let err = TopemsError::RequestTimeout;
    assert_eq!(err.to_string(), "请求超时");
}

#[test]
fn test_topems_error_display_operation_not_allowed() {
    let err = TopemsError::OperationNotAllowed("cannot delete".to_string());
    assert!(err.to_string().contains("操作不允许"));
    assert!(err.to_string().contains("cannot delete"));
}

#[test]
fn test_topems_error_display_service_unavailable() {
    let err = TopemsError::ServiceUnavailable("down".to_string());
    assert!(err.to_string().contains("服务不可用"));
    assert!(err.to_string().contains("down"));
}

#[test]
fn test_topems_error_display_internal() {
    let err = TopemsError::Internal("oops".to_string());
    assert!(err.to_string().contains("内部错误"));
    assert!(err.to_string().contains("oops"));
}

#[test]
fn test_safe_unwrap_option_some() {
    let val = Some(42);
    let result = SafeErrorHandler::safe_unwrap_option(val, "missing");
    assert_eq!(result.unwrap(), 42);
}

#[test]
fn test_safe_unwrap_option_none() {
    let val: Option<i32> = None;
    let result = SafeErrorHandler::safe_unwrap_option(val, "missing value");
    assert!(result.is_err());
    match result.unwrap_err() {
        TopemsError::Internal(msg) => assert!(msg.contains("missing value")),
        _ => panic!("Expected Internal error"),
    }
}

#[test]
fn test_safe_unwrap_result_ok() {
    let val: Result<i32, &str> = Ok(100);
    let result = SafeErrorHandler::safe_unwrap_result(val, "failed");
    assert_eq!(result.unwrap(), 100);
}

#[test]
fn test_safe_unwrap_result_err() {
    let val: Result<i32, &str> = Err("something wrong");
    let result = SafeErrorHandler::safe_unwrap_result(val, "operation failed");
    assert!(result.is_err());
    match result.unwrap_err() {
        TopemsError::Internal(msg) => {
            assert!(msg.contains("operation failed"));
            assert!(msg.contains("something wrong"));
        }
        _ => panic!("Expected Internal error"),
    }
}

#[test]
fn test_safe_get_env_exists() {
    std::env::set_var("TEST_ENV_VAR", "test_value");
    let result = SafeErrorHandler::safe_get_env("TEST_ENV_VAR");
    assert_eq!(result.unwrap(), "test_value");
    std::env::remove_var("TEST_ENV_VAR");
}

#[test]
fn test_safe_get_env_missing() {
    let result = SafeErrorHandler::safe_get_env("NONEXISTENT_VAR_12345");
    assert!(result.is_err());
    match result.unwrap_err() {
        TopemsError::EnvVarNotSet(var) => assert_eq!(var, "NONEXISTENT_VAR_12345"),
        _ => panic!("Expected EnvVarNotSet error"),
    }
}

#[test]
fn test_safe_parse_valid() {
    let result = SafeErrorHandler::safe_parse::<i32>("123", "parse int");
    assert_eq!(result.unwrap(), 123);
}

#[test]
fn test_safe_parse_invalid() {
    let result = SafeErrorHandler::safe_parse::<i32>("abc", "parse int");
    assert!(result.is_err());
    match result.unwrap_err() {
        TopemsError::ValidationFailed(msg) => {
            assert!(msg.contains("parse int"));
            assert!(msg.contains("abc"));
        }
        _ => panic!("Expected ValidationFailed error"),
    }
}

#[test]
fn test_safe_get_element_valid_index() {
    let arr = vec![1, 2, 3];
    let result = SafeErrorHandler::safe_get_element(&arr, 1, "array");
    assert_eq!(result.unwrap(), &2);
}

#[test]
fn test_safe_get_element_out_of_bounds() {
    let arr = vec![1, 2, 3];
    let result = SafeErrorHandler::safe_get_element(&arr, 5, "array");
    assert!(result.is_err());
    match result.unwrap_err() {
        TopemsError::Internal(msg) => {
            assert!(msg.contains("array"));
            assert!(msg.contains("5"));
        }
        _ => panic!("Expected Internal error"),
    }
}

#[test]
fn test_error_context_on_result() {
    let result: Result<i32, &str> = Err("db error");
    let enhanced = result.with_context("数据库查询");
    assert!(enhanced.is_err());
    let err_msg = enhanced.unwrap_err().to_string();
    assert!(err_msg.contains("数据库查询"));
    assert!(err_msg.contains("db error"));
}

#[test]
fn test_error_detail_context() {
    let result: Result<i32, &str> = Err("timeout");
    let enhanced = result.with_detail_context("API调用", "用户服务");
    assert!(enhanced.is_err());
    let err_msg = enhanced.unwrap_err().to_string();
    assert!(err_msg.contains("API调用"));
    assert!(err_msg.contains("用户服务"));
    assert!(err_msg.contains("timeout"));
}

#[test]
fn test_error_context_on_ok() {
    let result: Result<i32, &str> = Ok(42);
    let enhanced = result.with_context("test");
    assert_eq!(enhanced.unwrap(), 42);
}

#[test]
fn test_error_recovery_try_or_default_ok() {
    let result = ErrorRecovery::try_or_default(|| Ok(100), 0);
    assert_eq!(result, 100);
}

#[test]
fn test_error_recovery_try_or_default_err() {
    let result =
        ErrorRecovery::try_or_default(|| Err(TopemsError::Internal("fail".to_string())), 42);
    assert_eq!(result, 42);
}

#[test]
fn test_error_recovery_try_or_log_ok() {
    let result = ErrorRecovery::try_or_log(|| Ok("success".to_string()));
    assert_eq!(result, Some("success".to_string()));
}

#[test]
fn test_error_recovery_try_or_log_err() {
    let result: Option<String> =
        ErrorRecovery::try_or_log(|| Err(TopemsError::Internal("test error".to_string())));
    assert_eq!(result, None);
}

#[test]
fn test_error_recovery_try_or_response_ok() {
    let response = ErrorRecovery::try_or_response(|| Ok(42));
    assert!(response.success);
    assert_eq!(response.data.unwrap(), 42);
}

#[test]
fn test_error_recovery_try_or_response_validation_error() {
    let response: ApiResponse<()> = ErrorRecovery::try_or_response(|| {
        Err(TopemsError::ValidationFailed("bad input".to_string()))
    });
    assert!(!response.success);
    assert_eq!(response.code, 400);
}

#[test]
fn test_error_recovery_try_or_response_not_found() {
    let response: ApiResponse<()> =
        ErrorRecovery::try_or_response(|| Err(TopemsError::ResourceNotFound("item".to_string())));
    assert!(!response.success);
    assert_eq!(response.code, 404);
}

#[test]
fn test_error_recovery_try_or_response_permission_denied() {
    let response: ApiResponse<()> = ErrorRecovery::try_or_response(|| {
        Err(TopemsError::PermissionDenied {
            required: "admin".to_string(),
        })
    });
    assert!(!response.success);
    assert_eq!(response.code, 403);
}

#[test]
fn test_error_recovery_try_or_response_internal_error() {
    let response: ApiResponse<()> =
        ErrorRecovery::try_or_response(|| Err(TopemsError::Internal("oops".to_string())));
    assert!(!response.success);
    assert_eq!(response.code, 500);
}

#[test]
fn test_error_statistics_new() {
    let stats = ErrorStatistics::new();
    assert!(stats.get_statistics().is_empty());
}

#[test]
fn test_error_statistics_record() {
    let mut stats = ErrorStatistics::new();

    let err1 = TopemsError::ValidationFailed("test1".to_string());
    let err2 = TopemsError::ValidationFailed("test1".to_string());
    let err3 = TopemsError::Internal("test2".to_string());

    stats.record_error(&err1);
    stats.record_error(&err2);
    stats.record_error(&err3);

    let statistics = stats.get_statistics();
    assert_eq!(statistics.len(), 2);
}

#[test]
fn test_error_statistics_clear() {
    let mut stats = ErrorStatistics::new();
    stats.record_error(&TopemsError::Internal("test".to_string()));
    assert_eq!(stats.get_statistics().len(), 1);

    stats.clear();
    assert!(stats.get_statistics().is_empty());
}

#[test]
fn test_topems_error_from_sqlx_row_not_found() {
    let sqlx_err = sqlx::Error::RowNotFound;
    let topems_err: TopemsError = sqlx_err.into();
    assert!(matches!(topems_err, TopemsError::DatabaseRecordNotFound(_)));
}

#[test]
fn test_topems_error_from_io_error_not_found() {
    let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file missing");
    let topems_err: TopemsError = io_err.into();
    assert!(matches!(topems_err, TopemsError::FileNotFound(_)));
}

#[test]
fn test_topems_error_from_io_error_permission_denied() {
    let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "no access");
    let topems_err: TopemsError = io_err.into();
    assert!(matches!(topems_err, TopemsError::PermissionDenied { .. }));
}

#[test]
fn test_topems_error_from_serde_json() {
    let json_err = serde_json::from_str::<i32>("invalid").unwrap_err();
    let topems_err: TopemsError = json_err.into();
    assert!(matches!(topems_err, TopemsError::Serialization(_)));
}

#[test]
fn test_topems_error_debug() {
    let err = TopemsError::ValidationFailed("test debug".to_string());
    let debug_str = format!("{:?}", err);
    assert!(!debug_str.is_empty());
}
