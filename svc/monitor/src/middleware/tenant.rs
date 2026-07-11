use axum::{
    body::Body,
    http::{Request, Response},
    middleware::Next,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub pool: Arc<PgPool>,
}

pub struct TenantDataAccess {
    pub tenant_id: Uuid,
    pub pool: PgPool,
}

impl TenantDataAccess {
    pub fn new(tenant_id: Uuid, pool: PgPool) -> Self {
        Self { tenant_id, pool }
    }
}

pub async fn tenant_middleware(req: Request<Body>, next: Next) -> Response<Body> {
    next.run(req).await
}
