use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;
use tracing::error;

#[allow(dead_code, unused_imports)]
#[derive(Error, Debug)]
pub enum ErpError {
    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("未找到资源: {0}")]
    NotFound(String),
    #[error("无效请求: {0}")]
    BadRequest(String),
    #[error("未授权")]
    Unauthorized,
    #[error("权限不足")]
    Forbidden,
    #[error("验证错误: {0}")]
    ValidationError(String),
    #[error("内部错误: {0}")]
    InternalError(String),
    #[error("冲突: {0}")]
    Conflict(String),
}

#[allow(dead_code)]
#[derive(Serialize)]
struct ErrorResponse {
    success: bool,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
}

impl IntoResponse for ErpError {
    fn into_response(self) -> Response {
        let (status, message, code) = match &self {
            ErpError::DatabaseError(e) => {
                error!("数据库错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_ERROR".to_string()),
                )
            }
            ErpError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                msg.to_string(),
                Some("NOT_FOUND".to_string()),
            ),
            ErpError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("BAD_REQUEST".to_string()),
            ),
            ErpError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "未授权".to_string(),
                Some("UNAUTHORIZED".to_string()),
            ),
            ErpError::Forbidden => (
                StatusCode::FORBIDDEN,
                "权限不足".to_string(),
                Some("FORBIDDEN".to_string()),
            ),
            ErpError::ValidationError(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("VALIDATION_ERROR".to_string()),
            ),
            ErpError::InternalError(msg) => {
                error!("内部错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )
            }
            ErpError::Conflict(msg) => (
                StatusCode::CONFLICT,
                msg.to_string(),
                Some("CONFLICT".to_string()),
            ),
        };

        let body = Json(ErrorResponse {
            success: false,
            message,
            code,
        });

        (status, body).into_response()
    }
}

#[allow(dead_code, unused_imports)]
pub type Result<T> = std::result::Result<T, ErpError>;

// 从 ErpError 转换为 TopemsError（用于统一响应）
impl From<ErpError> for topems_shared_core::error::TopemsError {
    fn from(err: ErpError) -> Self {
        match err {
            ErpError::DatabaseError(e) => {
                topems_shared_core::error::TopemsError::DatabaseQuery(e.to_string())
            }
            ErpError::NotFound(msg) => {
                topems_shared_core::error::TopemsError::ResourceNotFound(msg)
            }
            ErpError::BadRequest(msg) => {
                topems_shared_core::error::TopemsError::ValidationFailed(msg)
            }
            ErpError::Unauthorized => topems_shared_core::error::TopemsError::Unauthorized,
            ErpError::Forbidden => topems_shared_core::error::TopemsError::PermissionDenied {
                required: "需要权限".to_string(),
            },
            ErpError::ValidationError(msg) => {
                topems_shared_core::error::TopemsError::ValidationFailed(msg)
            }
            ErpError::InternalError(msg) => topems_shared_core::error::TopemsError::Internal(msg),
            ErpError::Conflict(msg) => {
                topems_shared_core::error::TopemsError::ResourceAlreadyExists(msg)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use topems_shared_core::error::TopemsError;

    // ---------- Display（thiserror 派生）----------

    #[test]
    fn test_display_messages_contain_context() {
        assert!(ErpError::NotFound("abc".to_string())
            .to_string()
            .contains("abc"));
        assert!(ErpError::BadRequest("bad".to_string())
            .to_string()
            .contains("bad"));
        assert!(ErpError::ValidationError("ve".to_string())
            .to_string()
            .contains("ve"));
        assert!(ErpError::InternalError("ie".to_string())
            .to_string()
            .contains("ie"));
        assert!(ErpError::Conflict("dup".to_string())
            .to_string()
            .contains("dup"));
        assert_eq!(ErpError::Unauthorized.to_string(), "未授权");
        assert_eq!(ErpError::Forbidden.to_string(), "权限不足");
        // DatabaseError wraps sqlx::Error; use a RowNotFound variant to avoid
        // dealing with database connectivity.
        let sqlx_err = sqlx::Error::RowNotFound;
        let e = ErpError::DatabaseError(sqlx_err);
        assert!(e.to_string().starts_with("数据库错误:"), "e={}", e);
    }

    // ---------- From<ErpError> for TopemsError ----------

    #[test]
    fn test_into_topems_database_query() {
        let e = ErpError::DatabaseError(sqlx::Error::RowNotFound);
        let topems: TopemsError = e.into();
        match topems {
            TopemsError::DatabaseQuery(s) => assert!(!s.is_empty()),
            other => panic!("expected DatabaseQuery, got {:?}", other),
        }
    }

    #[test]
    fn test_into_topems_not_found() {
        let msg = "订单不存在";
        let topems: TopemsError = ErpError::NotFound(msg.to_string()).into();
        match topems {
            TopemsError::ResourceNotFound(s) => assert_eq!(s, msg),
            other => panic!("expected ResourceNotFound, got {:?}", other),
        }
    }

    #[test]
    fn test_into_topems_bad_request_maps_to_validation_failed() {
        let msg = "参数有误";
        let topems: TopemsError = ErpError::BadRequest(msg.to_string()).into();
        match topems {
            TopemsError::ValidationFailed(s) => assert_eq!(s, msg),
            other => panic!("expected ValidationFailed, got {:?}", other),
        }
    }

    #[test]
    fn test_into_topems_unauthorized() {
        let topems: TopemsError = ErpError::Unauthorized.into();
        assert!(matches!(topems, TopemsError::Unauthorized));
    }

    #[test]
    fn test_into_topems_forbidden_has_required_message() {
        let topems: TopemsError = ErpError::Forbidden.into();
        match topems {
            TopemsError::PermissionDenied { required } => assert_eq!(required, "需要权限"),
            other => panic!("expected PermissionDenied, got {:?}", other),
        }
    }

    #[test]
    fn test_into_topems_validation_error_maps_to_validation_failed() {
        let msg = "字段校验失败";
        let topems: TopemsError = ErpError::ValidationError(msg.to_string()).into();
        match topems {
            TopemsError::ValidationFailed(s) => assert_eq!(s, msg),
            other => panic!("expected ValidationFailed, got {:?}", other),
        }
    }

    #[test]
    fn test_into_topems_internal() {
        let msg = "boom";
        let topems: TopemsError = ErpError::InternalError(msg.to_string()).into();
        match topems {
            TopemsError::Internal(s) => assert_eq!(s, msg),
            other => panic!("expected Internal, got {:?}", other),
        }
    }

    #[test]
    fn test_into_topems_conflict_maps_to_resource_already_exists() {
        let msg = "已存在";
        let topems: TopemsError = ErpError::Conflict(msg.to_string()).into();
        match topems {
            TopemsError::ResourceAlreadyExists(s) => assert_eq!(s, msg),
            other => panic!("expected ResourceAlreadyExists, got {:?}", other),
        }
    }

    // ---------- IntoResponse for ErpError ----------
    // 验证 HTTP 状态码映射（message/code 语义已通过 Display / TopemsError /
    // 构造逻辑覆盖；此处只验证 IntoResponse 能成功构造响应并返回对应 status）

    #[test]
    fn test_into_response_status_mapping_all_variants() {
        use ErpError::*;
        assert_eq!(
            NotFound("x".to_string()).into_response().status(),
            StatusCode::NOT_FOUND
        );
        assert_eq!(
            BadRequest("x".to_string()).into_response().status(),
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            Unauthorized.into_response().status(),
            StatusCode::UNAUTHORIZED
        );
        assert_eq!(Forbidden.into_response().status(), StatusCode::FORBIDDEN);
        assert_eq!(
            ValidationError("x".to_string()).into_response().status(),
            StatusCode::BAD_REQUEST
        );
        assert_eq!(
            InternalError("x".to_string()).into_response().status(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
        assert_eq!(
            Conflict("x".to_string()).into_response().status(),
            StatusCode::CONFLICT
        );
        assert_eq!(
            DatabaseError(sqlx::Error::RowNotFound)
                .into_response()
                .status(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn test_into_response_never_panics() {
        // Smoke test: all 8 variants produce a valid Response without panic
        use ErpError::*;
        let variants: [ErpError; 8] = [
            DatabaseError(sqlx::Error::RowNotFound),
            NotFound("n".to_string()),
            BadRequest("b".to_string()),
            Unauthorized,
            Forbidden,
            ValidationError("v".to_string()),
            InternalError("i".to_string()),
            Conflict("c".to_string()),
        ];
        for e in variants {
            let resp = e.into_response();
            // Every error response should be a client/server error status
            assert!(resp.status().is_client_error() || resp.status().is_server_error());
        }
    }

    // ---------- Result type alias ----------

    #[test]
    fn test_result_alias_compiles() {
        let ok: Result<i32> = Ok(42);
        assert_eq!(ok.unwrap(), 42);
        let err: Result<i32> = Err(ErpError::Unauthorized);
        assert!(err.is_err());
    }
}
