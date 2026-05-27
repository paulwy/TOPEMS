use axum::{
    http::{Request, Response, StatusCode, header},
    middleware::Next,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use crate::models::Claims;
use crate::errors::IamError;
use crate::ApiResponse;
use tracing;

pub async fn auth_middleware<B>(
    req: Request<B>,
    next: Next<B>,
) -> Result<Response, Json<ApiResponse<()>>> {
    let path = req.uri().path().to_string();
    
    if path == "/" || path == "/health" || path.starts_with("/api/v1/auth/") {
        return Ok(next.run(req).await);
    }

    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            tracing::warn!("Missing or invalid Authorization header");
            return Err(Json(ApiResponse::error(401, "未授权：缺少有效的认证令牌".to_string())));
        }
    };

    let jwt_secret = match std::env::var("JWT_SECRET") {
        Ok(s) => s,
        Err(_) => {
            tracing::error!("JWT_SECRET not set");
            return Err(Json(ApiResponse::error(500, "服务器配置错误".to_string())));
        }
    };

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(token_data) => {
            if token_data.claims.exp < chrono::Utc::now().timestamp() as usize {
                tracing::warn!("Token expired for user: {}", token_data.claims.username);
                return Err(Json(ApiResponse::error(401, "令牌已过期，请重新登录".to_string())));
            }

            let mut req = req;
            req.extensions_mut().insert(token_data.claims);
            Ok(next.run(req).await)
        }
        Err(e) => {
            tracing::error!("Token verification failed: {}", e);
            Err(Json(ApiResponse::error(401, format!("认证失败: {}", e))))
        }
    }
}