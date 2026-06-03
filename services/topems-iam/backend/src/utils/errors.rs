use axum::{http::StatusCode, response::IntoResponse, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ErrorCode {
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    BadRequest = 400,
    Conflict = 409,
    InternalServerError = 500,
}

impl From<ErrorCode> for StatusCode {
    fn from(code: ErrorCode) -> Self {
        match code {
            ErrorCode::Unauthorized => StatusCode::UNAUTHORIZED,
            ErrorCode::Forbidden => StatusCode::FORBIDDEN,
            ErrorCode::NotFound => StatusCode::NOT_FOUND,
            ErrorCode::BadRequest => StatusCode::BAD_REQUEST,
            ErrorCode::Conflict => StatusCode::CONFLICT,
            ErrorCode::InternalServerError => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ErrorDetail {
    pub code: i32,
    pub message: String,
    pub error_type: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
    pub error: Option<ErrorDetail>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: None,
        }
    }

    pub fn ok(message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: None,
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        let error_type = match code {
            400 => "BadRequest",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "NotFound",
            409 => "Conflict",
            _ => "InternalServerError",
        };

        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: Some(ErrorDetail {
                code,
                message: message.to_string(),
                error_type: error_type.to_string(),
                request_id: None,
            }),
        }
    }

    pub fn error_with_request_id(code: i32, message: &str, request_id: &str) -> Self {
        let error_type = match code {
            400 => "BadRequest",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "NotFound",
            409 => "Conflict",
            _ => "InternalServerError",
        };

        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: Some(ErrorDetail {
                code,
                message: message.to_string(),
                error_type: error_type.to_string(),
                request_id: Some(request_id.to_string()),
            }),
        }
    }

    pub fn from_error(code: ErrorCode, message: &str) -> Self {
        Self::error(code as i32, message)
    }
}

#[derive(Debug)]
pub struct ApiError {
    pub code: ErrorCode,
    pub message: String,
    pub request_id: Option<String>,
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "ApiError {{ code: {:?}, message: {} }}", self.code, self.message)
    }
}

impl std::error::Error for ApiError {}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let status_code: StatusCode = self.code.into();
        let response = match self.request_id {
            Some(request_id) => Json(ApiResponse::<()>::error_with_request_id(
                self.code as i32,
                &self.message,
                &request_id,
            )),
            None => Json(ApiResponse::<()>::error(self.code as i32, &self.message)),
        };
        (status_code, response).into_response()
    }
}

pub type ApiResult<T> = Result<Json<ApiResponse<T>>, ApiError>;

pub fn err(code: ErrorCode, message: &str) -> ApiError {
    ApiError {
        code,
        message: message.to_string(),
        request_id: None,
    }
}

pub fn err_with_request_id(code: ErrorCode, message: &str, request_id: &str) -> ApiError {
    ApiError {
        code,
        message: message.to_string(),
        request_id: Some(request_id.to_string()),
    }
}
