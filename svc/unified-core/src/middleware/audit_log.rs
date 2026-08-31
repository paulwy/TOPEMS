use axum::{
    body::Body,
    extract::State,
    http::{Request, Response},
};
use serde_json::{json, Value};
use std::time::Instant;

use super::request_id::{RequestId, X_REQUEST_ID};
use crate::AppState;

pub async fn audit_log_middleware(
    State(state): State<AppState>,
    request: Request<Body>,
    next: axum::middleware::Next,
) -> Response<Body> {
    let start_time = Instant::now();
    let request_id = request
        .extensions()
        .get::<RequestId>()
        .map(|id| id.0.clone())
        .unwrap_or_else(|| {
            request
                .headers()
                .get(X_REQUEST_ID)
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
                .unwrap_or_default()
        });

    let method = request.method().clone();
    let uri = request.uri().clone();
    let path = uri.path().to_string();

    let ip_address = request
        .headers()
        .get("x-forwarded-for")
        .or_else(|| request.headers().get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string())
        .unwrap_or_default();

    let user_agent = request
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let user_id = request.extensions().get::<uuid::Uuid>().copied();

    let response = next.run(request).await;
    let elapsed = start_time.elapsed();
    let status_code = response.status().as_u16();

    let audit_log = json!({
        "request_id": request_id,
        "user_id": user_id,
        "method": method.as_str(),
        "path": path,
        "query_string": uri.query().unwrap_or_default(),
        "status_code": status_code,
        "duration_ms": elapsed.as_millis(),
        "ip_address": ip_address,
        "user_agent": user_agent,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "success": status_code < 400,
    });

    match log_audit_entry(&state, &audit_log).await {
        Ok(_) => tracing::debug!(
            "[Audit] logged request: {} {} - {}ms",
            method,
            path,
            elapsed.as_millis()
        ),
        Err(e) => tracing::error!("[Audit] failed to log request: {}", e),
    }

    response
}

async fn log_audit_entry(state: &AppState, audit_log: &Value) -> Result<(), sqlx::Error> {
    let query = r#"
        INSERT INTO public.audit_logs (
            request_id,
            user_id,
            method,
            path,
            query_string,
            status_code,
            duration_ms,
            ip_address,
            user_agent,
            timestamp,
            success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    "#;

    sqlx::query(query)
        .bind(audit_log["request_id"].as_str().unwrap_or_default())
        .bind(
            audit_log["user_id"]
                .as_str()
                .and_then(|s| uuid::Uuid::parse_str(s).ok()),
        )
        .bind(audit_log["method"].as_str().unwrap_or_default())
        .bind(audit_log["path"].as_str().unwrap_or_default())
        .bind(audit_log["query_string"].as_str().unwrap_or_default())
        .bind(audit_log["status_code"].as_u64().unwrap_or(0) as i32)
        .bind(audit_log["duration_ms"].as_u64().unwrap_or(0) as i64)
        .bind(audit_log["ip_address"].as_str().unwrap_or_default())
        .bind(audit_log["user_agent"].as_str().unwrap_or_default())
        .bind(audit_log["timestamp"].as_str().unwrap_or_default())
        .bind(audit_log["success"].as_bool().unwrap_or(false))
        .execute(&state.pool)
        .await
        .map(|_| ())
}

pub async fn init_audit_logs_table(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS public.audit_logs (
            id BIGSERIAL PRIMARY KEY,
            request_id VARCHAR(64) NOT NULL,
            user_id UUID,
            method VARCHAR(10) NOT NULL,
            path TEXT NOT NULL,
            query_string TEXT,
            status_code INTEGER NOT NULL,
            duration_ms BIGINT NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            timestamp TIMESTAMPTZ NOT NULL,
            success BOOLEAN NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON public.audit_logs(request_id);")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_path ON public.audit_logs(path);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON public.audit_logs(status_code);",
    )
    .execute(pool)
    .await?;

    tracing::info!("Audit logs table initialized");
    Ok(())
}
