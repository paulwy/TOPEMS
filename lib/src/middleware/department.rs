use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use sqlx::PgPool;
use crate::auth::Claims;
use uuid::Uuid;

#[derive(Clone)]
pub struct DepartmentContext {
    pub department_id: Option<Uuid>,
}

impl DepartmentContext {
    pub fn from_request(req: &Request<Body>) -> Option<Self> {
        let claims = req.extensions().get::<Claims>()?;
        let department_id = claims.department.as_ref().and_then(|id| Uuid::parse_str(id).ok());
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
    move |axum::extract::State(pool): axum::extract::State<PgPool>, req: Request<Body>, next: Next| {
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

            let department_id = claims.department.as_ref().and_then(|id| Uuid::parse_str(id).ok());

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
            req.extensions_mut().insert(DepartmentContext { department_id });

            next.run(req).await
        })
    }
}

pub fn require_department(
    department_id: Uuid,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
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

            let user_dept_id = claims.department.as_ref().and_then(|id| Uuid::parse_str(id).ok());
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