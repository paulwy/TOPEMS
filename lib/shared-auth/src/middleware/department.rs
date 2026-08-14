use crate::auth::Claims;
use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct DepartmentContext {
    pub department_id: Option<Uuid>,
}

impl DepartmentContext {
    pub fn from_request(req: &Request<Body>) -> Option<Self> {
        let claims = req.extensions().get::<Claims>()?;
        let department_id = claims
            .department
            .as_ref()
            .and_then(|id| Uuid::parse_str(id).ok());
        Some(Self { department_id })
    }
}

pub fn department_middleware() -> impl Fn(
    axum::extract::State<PgPool>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |axum::extract::State(pool): axum::extract::State<PgPool>,
          req: Request<Body>,
          next: Next| {
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let department_id = claims
                .department
                .as_ref()
                .and_then(|id| Uuid::parse_str(id).ok());

            if let Some(dept_id) = department_id {
                match sqlx::query("SELECT set_config('app.department_id', $1, false)")
                    .bind(dept_id.to_string())
                    .execute(&pool)
                    .await
                {
                    Ok(_) => tracing::debug!("Applied department context: {}", dept_id),
                    Err(e) => tracing::error!("Failed to set department context: {}", e),
                }
            }

            let mut req = req;
            req.extensions_mut()
                .insert(DepartmentContext { department_id });

            next.run(req).await
        })
    }
}

pub fn require_department(
    department_id: Uuid,
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let department_id = department_id;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if claims.is_superuser {
                return next.run(req).await;
            }

            let user_dept_id = claims
                .department
                .as_ref()
                .and_then(|id| Uuid::parse_str(id).ok());
            if user_dept_id != Some(department_id) {
                tracing::warn!(
                    "Department access denied: user={}, required_department={}",
                    claims.username,
                    department_id
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"部门权限不足","code":403}"#,
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request, routing::get, Router};
    use tower::ServiceExt;

    const DEPT_ID: &str = "123e4567-e89b-12d3-a456-426614174000";

    fn make_claims(department: Option<&str>, is_superuser: bool) -> Claims {
        Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: department.map(|s| s.to_string()),
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    fn build_req(claims: Option<Claims>) -> Request<Body> {
        let mut req = Request::builder().uri("/x").body(Body::empty()).unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        req
    }

    async fn send_require_department(dept_id: Uuid, claims: Option<Claims>) -> StatusCode {
        let app = Router::new()
            .route("/protected", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn(require_department(dept_id)));
        let mut req = Request::builder()
            .uri("/protected")
            .body(Body::empty())
            .unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        app.oneshot(req).await.expect("infallible").status()
    }

    // ===== DepartmentContext::from_request =====
    #[test]
    fn test_department_context_none_without_claims() {
        let req = build_req(None);
        assert!(DepartmentContext::from_request(&req).is_none());
    }

    #[test]
    fn test_department_context_none_when_department_missing() {
        let req = build_req(Some(make_claims(None, false)));
        let ctx = DepartmentContext::from_request(&req);
        assert!(ctx.is_some());
        assert!(ctx.unwrap().department_id.is_none());
    }

    #[test]
    fn test_department_context_parses_valid_uuid() {
        let req = build_req(Some(make_claims(Some(DEPT_ID), false)));
        let ctx = DepartmentContext::from_request(&req).expect("some");
        assert!(ctx.department_id.is_some());
        assert_eq!(ctx.department_id.unwrap().to_string(), DEPT_ID);
    }

    #[test]
    fn test_department_context_none_for_invalid_uuid() {
        let req = build_req(Some(make_claims(Some("not-a-uuid"), false)));
        let ctx = DepartmentContext::from_request(&req).expect("some");
        // 无效 UUID 解析失败 → None
        assert!(ctx.department_id.is_none());
    }

    #[test]
    fn test_department_context_clone_preserves_department_id() {
        let ctx = DepartmentContext {
            department_id: Some(Uuid::parse_str(DEPT_ID).unwrap()),
        };
        let cloned = ctx.clone();
        assert_eq!(ctx.department_id, cloned.department_id);
    }

    // ===== require_department =====
    #[tokio::test]
    async fn test_require_department_unauthorized_without_claims() {
        let status = send_require_department(Uuid::parse_str(DEPT_ID).unwrap(), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_department_ok_for_superuser() {
        let claims = make_claims(None, true);
        let status = send_require_department(Uuid::parse_str(DEPT_ID).unwrap(), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_department_ok_when_matches() {
        let claims = make_claims(Some(DEPT_ID), false);
        let status = send_require_department(Uuid::parse_str(DEPT_ID).unwrap(), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_department_forbidden_when_mismatch() {
        let other_dept = Uuid::new_v4();
        let claims = make_claims(Some(DEPT_ID), false);
        let status = send_require_department(other_dept, Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_department_forbidden_when_no_department() {
        let claims = make_claims(None, false);
        let status = send_require_department(Uuid::parse_str(DEPT_ID).unwrap(), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }
}
