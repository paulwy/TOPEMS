use axum::{
    extract::{Request, FromRequestParts, State},
    http::{request::Parts, StatusCode, header},
    middleware::Next,
    response::{Response, IntoResponse},
    Json,
};
use jsonwebtoken::{decode, Validation, DecodingKey, Algorithm};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{Utc, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

impl Claims {
    pub fn is_expired(&self) -> bool {
        let now = Utc::now().timestamp() as usize;
        self.exp < now
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.role == role
    }

    pub fn has_permission(&self, _permission: &str) -> bool {
        self.role == "admin" || self.role == "user"
    }
}

#[derive(Clone)]
pub struct AuthState {
    pub jwt_secret: String,
}

#[derive(Debug, Clone)]
pub struct OptionalClaims(pub Claims);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T = ()> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn error(code: i32, message: &str) -> Json<ApiResponse<T>> {
        Json(ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        })
    }
}

pub async fn auth_middleware(
    State(state): State<AuthState>,
    mut req: Request,
    next: Next,
) -> Response {
    let auth_header = req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    if let Some(auth_header) = auth_header {
        if auth_header.starts_with("Bearer ") {
            let token = &auth_header[7..];
            
            match validate_token(token, &state.jwt_secret) {
                Ok(claims) => {
                    if !claims.is_expired() {
                        req.extensions_mut().insert(claims);
                        return next.run(req).await;
                    } else {
                        tracing::debug!("Token expired");
                        let mut resp = ApiResponse::<()>::error(401, "令牌已过期，请重新登录").into_response();
                        *resp.status_mut() = StatusCode::UNAUTHORIZED;
                        return resp;
                    }
                }
                Err(e) => {
                    tracing::debug!("Token validation failed: {}", e);
                    let mut resp = ApiResponse::<()>::error(401, &format!("认证失败: {}", e)).into_response();
                    *resp.status_mut() = StatusCode::UNAUTHORIZED;
                    return resp;
                }
            }
        }
    }

    let mut resp = ApiResponse::<()>::error(401, "未授权：缺少有效的认证令牌").into_response();
    *resp.status_mut() = StatusCode::UNAUTHORIZED;
    resp
}

fn validate_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());
    let validation = Validation::new(Algorithm::HS256);
    
    let token_data = decode::<Claims>(token, &decoding_key, &validation)?;
    
    Ok(token_data.claims)
}

pub async fn optional_auth_middleware(
    State(state): State<AuthState>,
    mut req: Request,
    next: Next,
) -> Response {
    let is_development = std::env::var("RUST_ENV").unwrap_or_default() == "development"
        || std::env::var("ENV").unwrap_or_default() == "dev"
        || std::env::var("NODE_ENV").unwrap_or_default() == "development";
    
    let claims = if is_development {
        None
    } else if let Some(auth_header) = req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
    {
        if auth_header.starts_with("Bearer ") {
            let token = &auth_header[7..];
            
            if let Ok(claims) = validate_token(token, &state.jwt_secret) {
                if !claims.is_expired() {
                    Some(claims)
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };
    
    let final_claims = claims.unwrap_or_else(|| Claims {
        sub: if is_development { "admin".to_string() } else { "guest".to_string() },
        username: if is_development { "admin".to_string() } else { "guest".to_string() },
        role: if is_development { "admin".to_string() } else { "guest".to_string() },
        exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
        iat: Utc::now().timestamp() as usize,
    });
    
    req.extensions_mut().insert(OptionalClaims(final_claims));
    
    next.run(req).await
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<Claims>()
            .cloned()
            .ok_or(StatusCode::UNAUTHORIZED)
    }
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for OptionalClaims
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Ok(parts
            .extensions
            .get::<OptionalClaims>()
            .cloned()
            .unwrap_or(OptionalClaims(Claims {
                sub: "guest".to_string(),
                username: "guest".to_string(),
                role: "guest".to_string(),
                exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
                iat: Utc::now().timestamp() as usize,
            })))
    }
}
