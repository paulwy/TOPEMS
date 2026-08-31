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
            user_id,
            action,
            entity_type,
            entity_ids,
            request_details,
            response_details,
            status,
            ip_address,
            user_agent,
            created_at
        ) VALUES ($1, 'access', 'http_request', $2, $3, $4, $5, $6, $7, $8)
    "#;

    let request_details = json!({
        "request_id": audit_log["request_id"].as_str().unwrap_or_default(),
        "method": audit_log["method"].as_str().unwrap_or_default(),
        "path": audit_log["path"].as_str().unwrap_or_default(),
        "query_string": audit_log["query_string"].as_str().unwrap_or_default(),
    });
    let response_details = json!({
        "status_code": audit_log["status_code"].as_u64().unwrap_or(0),
        "duration_ms": audit_log["duration_ms"].as_u64().unwrap_or(0),
    });
    sqlx::query(query)
        .bind(
            audit_log["user_id"]
                .as_str()
                .and_then(|s| uuid::Uuid::parse_str(s).ok()),
        )
        .bind(serde_json::Value::Null)
        .bind(&request_details)
        .bind(&response_details)
        .bind(if audit_log["success"].as_bool().unwrap_or(false) {
            "success"
        } else {
            "error"
        })
        .bind(audit_log["ip_address"].as_str().unwrap_or_default())
        .bind(audit_log["user_agent"].as_str().unwrap_or_default())
        .bind(audit_log["timestamp"].as_str().unwrap_or_default())
        .execute(&state.pool)
        .await
        .map(|_| ())
}

pub async fn init_audit_logs_table(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tenant_id UUID,
            action VARCHAR(255) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID,
            entity_ids JSONB,
            user_id UUID,
            user_name TEXT,
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            error_message TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);",
    )
    .execute(pool)
    .await?;

    tracing::info!("Audit logs table initialized");
    Ok(())
}
