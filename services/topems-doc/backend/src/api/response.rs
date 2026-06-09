#![allow(dead_code)]

use axum::{
    Json,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Resource not found")]
    NotFound,
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    #[error("Internal server error")]
    InternalError,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            ApiError::NotFound => (axum::http::StatusCode::NOT_FOUND, "Resource not found".to_string()),
            ApiError::Unauthorized => (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            ApiError::BadRequest(msg) => (axum::http::StatusCode::BAD_REQUEST, msg),
            ApiError::InternalError => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
        };

        let body = Json(ApiResponse::<()> {
            success: false,
            data: None,
            error: Some(error_message),
        });

        (status, body).into_response()
    }
}
