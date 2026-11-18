//! Integration 服务间内部集成端点（供 integration 服务编排调用）
//!
//! 路径前缀 `/api/internal/` 由 auth_middleware 的 is_public_path 放行（免 JWT），
//! 且此路由在 main.rs 中挂载于 require_permission layer 之外（public 路由），不受权限检查影响。
//! 设计约束：仅内网可达，须与网关/反向代理配合限制公网暴露。
//!
//! 承接原 integration `qms_lims_ehs.rs` 的 public 僵尸直写（integration→ehs 跨域）：
//! - 隐患集成创建：ehs.qa_ehs_hazards（原直写引用不存在的 public.qa_ehs_hazards
//!   且含不存在的 tenant_id/related_inspection_id 列 → 修正为实际列，hazard_no UNIQUE 幂等）
//! - 告警集成创建：ehs.qa_ehs_alerts（原直写表不存在 → 20260831191100 已建表，alert_no UNIQUE 幂等）
//!
//! 租户来源（W7-B4 EHS RLS fail-closed 收口 + 写恢复）：
//! 本类 `/api/internal/` 端点为免 JWT 的内网服务间调用——`is_public_path` 对
//! `/api/internal/` 放行，auth_middleware 不注入 Claims，tenant_middleware 亦跳过。
//! 因此要求调用方在请求体显式传 `tenant_id`：缺失、空串、nil-uuid、解析失败一律
//! 400 拒收 + 计数告警，绝不落 NULL 业务行；校验通过后按租户作用域
//! （`scope_for_tenant`，RLS 策略生效）写入，不开系统通道。

use crate::shared::AppState;
use axum::{extract::State, routing::post, Json, Router};
use serde::Deserialize;
use sqlx::types::Uuid;
use sqlx::Row;
use std::sync::atomic::{AtomicU64, Ordering};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;

/// 缺少/非法 tenant_id 的集成请求累计拒绝数（用于告警与审计）。
static INTEGRATION_TENANT_REJECTS: AtomicU64 = AtomicU64::new(0);

/// 集成端点租户守卫：缺失、空串、nil-uuid、解析失败一律拒收，绝不落 NULL 业务行。
fn require_integration_tenant(
    raw: Option<&str>,
    endpoint: &str,
) -> Result<Uuid, ApiResponse<serde_json::Value>> {
    let parsed = raw.and_then(|v| Uuid::parse_str(v.trim()).ok());
    match parsed {
        Some(t) if !t.is_nil() => Ok(t),
        _ => {
            let total = INTEGRATION_TENANT_REJECTS.fetch_add(1, Ordering::Relaxed) + 1;
            tracing::error!(
                "[tenant_ctx] /api/internal/ehs/{} 缺少合法 tenant_id（raw={:?}），拒收；累计拒绝={}",
                endpoint,
                raw,
                total
            );
            Err(ApiResponse::error(
                400,
                "缺少合法租户标识 tenant_id，拒绝集成写入",
            ))
        }
    }
}

pub fn integration_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/internal/ehs/hazards/integration",
            post(create_integration_hazard),
        )
        .route(
            "/api/internal/ehs/alerts/integration",
            post(create_integration_alert),
        )
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationHazardRequest {
    /// 服务间调用方必须显式传递；缺失/空串/nil/非法一律拒收（不信任请求上下文回退）。
    pub tenant_id: Option<String>,
    pub hazard_no: String,
    pub title: String,
    pub category: Option<String>,
    pub level: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub reported_by: Option<String>,
    /// 修正：表列 inspection_id 有 FK→ehs.qa_ehs_inspection_records(id)，外部系统 id 不可靠时传 null
    pub inspection_id: Option<Uuid>,
    pub source: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/internal/ehs/hazards/integration",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "缺少合法 tenant_id"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Integration"
)]
pub async fn create_integration_hazard(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationHazardRequest>,
) -> ApiResponse<serde_json::Value> {
    handle_integration_hazard(&state.db, req).await
}

async fn handle_integration_hazard(
    db: &Db,
    req: CreateIntegrationHazardRequest,
) -> ApiResponse<serde_json::Value> {
    let tenant_id =
        match require_integration_tenant(req.tenant_id.as_deref(), "hazards/integration") {
            Ok(t) => t,
            Err(resp) => return resp,
        };

    match persist_integration_hazard(db, tenant_id, &req).await {
        Ok(data) => {
            tracing::info!(
                "[tenant_ctx] /api/internal/ehs/hazards/integration 已按租户写入: tenant_id={}, hazard_no={}",
                tenant_id,
                req.hazard_no
            );
            ApiResponse::success(data, "集成隐患创建成功")
        }
        Err(e) => {
            tracing::error!("[integration] 创建隐患失败: {}", e);
            ApiResponse::server_error("集成隐患创建失败")
        }
    }
}

/// 租户作用域写入隐患（RLS 生效，绑定显式 tenant_id）。
/// hazard_no UNIQUE：同租户重复上报仅刷新 updated_at；跨租户撞号由策略拒绝（不静默吞掉）。
async fn persist_integration_hazard(
    db: &Db,
    tenant_id: Uuid,
    req: &CreateIntegrationHazardRequest,
) -> sqlx::Result<serde_json::Value> {
    let mut scope = db.scope_for_tenant(tenant_id).await?;
    let row = sqlx::query(
        "INSERT INTO ehs.qa_ehs_hazards
             (hazard_no, title, category, level, location, description, status,
              reported_by, inspection_id, source, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (hazard_no) DO UPDATE SET updated_at = NOW()
         RETURNING id::text AS id, hazard_no, title, status",
    )
    .bind(&req.hazard_no)
    .bind(&req.title)
    .bind(req.category.as_deref().unwrap_or("通用"))
    .bind(req.level.as_deref().unwrap_or("medium"))
    .bind(&req.location)
    .bind(&req.description)
    .bind(req.status.as_deref().unwrap_or("reported"))
    .bind(req.reported_by.as_deref().unwrap_or("system"))
    .bind(req.inspection_id)
    .bind(req.source.as_deref().unwrap_or("系统集成"))
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await?;

    let data = serde_json::json!({
        "id": row.try_get::<String, _>("id").ok(),
        "hazard_no": row.try_get::<String, _>("hazard_no").ok(),
        "title": row.try_get::<String, _>("title").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "tenant_id": tenant_id.to_string(),
    });
    scope.commit().await?;
    Ok(data)
}

#[derive(Debug, Deserialize)]
pub struct CreateIntegrationAlertRequest {
    /// 服务间调用方必须显式传递；缺失/空串/nil/非法一律拒收（不信任请求上下文回退）。
    pub tenant_id: Option<String>,
    pub alert_no: String,
    pub title: String,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub source_system: Option<String>,
    pub source_id: Option<Uuid>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/internal/ehs/alerts/integration",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "缺少合法 tenant_id"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Integration"
)]
pub async fn create_integration_alert(
    State(state): State<AppState>,
    Json(req): Json<CreateIntegrationAlertRequest>,
) -> ApiResponse<serde_json::Value> {
    handle_integration_alert(&state.db, req).await
}

async fn handle_integration_alert(
    db: &Db,
    req: CreateIntegrationAlertRequest,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_integration_tenant(req.tenant_id.as_deref(), "alerts/integration")
    {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    match persist_integration_alert(db, tenant_id, &req).await {
        Ok(data) => {
            tracing::info!(
                "[tenant_ctx] /api/internal/ehs/alerts/integration 已按租户写入: tenant_id={}, alert_no={}",
                tenant_id,
                req.alert_no
            );
            ApiResponse::success(data, "集成告警创建成功")
        }
        Err(e) => {
            tracing::error!("[integration] 创建告警失败: {}", e);
            ApiResponse::server_error("集成告警创建失败")
        }
    }
}

/// 租户作用域写入告警（RLS 生效，绑定显式 tenant_id）。
/// alert_no UNIQUE：同租户重复上报仅刷新 updated_at；跨租户撞号由策略拒绝（不静默吞掉）。
async fn persist_integration_alert(
    db: &Db,
    tenant_id: Uuid,
    req: &CreateIntegrationAlertRequest,
) -> sqlx::Result<serde_json::Value> {
    let mut scope = db.scope_for_tenant(tenant_id).await?;
    let row = sqlx::query(
        "INSERT INTO ehs.qa_ehs_alerts
             (alert_no, title, alert_type, severity, description, status,
              source_system, source_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (alert_no) DO UPDATE SET updated_at = NOW()
         RETURNING id::text AS id, alert_no, title, status",
    )
    .bind(&req.alert_no)
    .bind(&req.title)
    .bind(req.alert_type.as_deref().unwrap_or("其他告警"))
    .bind(req.severity.as_deref().unwrap_or("medium"))
    .bind(&req.description)
    .bind(req.status.as_deref().unwrap_or("active"))
    .bind(req.source_system.as_deref().unwrap_or("系统"))
    .bind(req.source_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await?;

    let data = serde_json::json!({
        "id": row.try_get::<String, _>("id").ok(),
        "alert_no": row.try_get::<String, _>("alert_no").ok(),
        "title": row.try_get::<String, _>("title").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "tenant_id": tenant_id.to_string(),
    });
    scope.commit().await?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgPoolOptions;


    fn short_id() -> String {
        Uuid::new_v4().simple().to_string()[..12].to_string()
    }

    /// 本地 Postgres 不可用时跳过（与 `tests/ehs_tests.rs` 既有口径一致）。
    fn test_database_url() -> String {
        std::env::var("TEST_DATABASE_URL").expect(
            "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
        )
    }

    async fn test_db() -> Option<Db> {
        if tokio::net::TcpStream::connect("localhost:5432")
            .await
            .is_err()
        {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return None;
        }
        let url = test_database_url();
        match PgPoolOptions::new().max_connections(2).connect(&url).await {
            Ok(pool) => Some(Db::new(pool, "ehs, public, shared")),
            Err(e) => {
                eprintln!("⏭ 跳过: 连接测试数据库失败: {e}");
                None
            }
        }
    }

    fn hazard_req(tenant: Option<String>, hazard_no: &str) -> CreateIntegrationHazardRequest {
        CreateIntegrationHazardRequest {
            tenant_id: tenant,
            hazard_no: hazard_no.to_string(),
            title: "集成恢复测试隐患".to_string(),
            category: None,
            level: None,
            location: None,
            description: None,
            status: None,
            reported_by: None,
            inspection_id: None,
            source: None,
        }
    }

    fn alert_req(tenant: Option<String>, alert_no: &str) -> CreateIntegrationAlertRequest {
        CreateIntegrationAlertRequest {
            tenant_id: tenant,
            alert_no: alert_no.to_string(),
            title: "集成恢复测试告警".to_string(),
            alert_type: None,
            severity: None,
            description: None,
            status: None,
            source_system: None,
            source_id: None,
        }
    }

    /// 合法租户：两个端点均成功写入，且落库行 tenant_id 与请求租户一致。
    #[tokio::test]
    async fn valid_tenant_is_persisted_with_explicit_tenant_id() {
        let Some(db) = test_db().await else { return };
        let tenant_id = Uuid::new_v4();
        let hazard_no = format!("IT-HZ-{}", short_id());
        let alert_no = format!("IT-AL-{}", short_id());

        let hazard =
            handle_integration_hazard(&db, hazard_req(Some(tenant_id.to_string()), &hazard_no))
                .await;
        assert_eq!(hazard.code, 200, "隐患写入应成功: {}", hazard.message);
        let hazard_data = hazard.data.expect("隐患响应应有 data");
        assert_eq!(hazard_data["hazard_no"], serde_json::json!(hazard_no));
        assert_eq!(
            hazard_data["tenant_id"],
            serde_json::json!(tenant_id.to_string())
        );

        let alert =
            handle_integration_alert(&db, alert_req(Some(tenant_id.to_string()), &alert_no)).await;
        assert_eq!(alert.code, 200, "告警写入应成功: {}", alert.message);
        let alert_data = alert.data.expect("告警响应应有 data");
        assert_eq!(alert_data["alert_no"], serde_json::json!(alert_no));
        assert_eq!(
            alert_data["tenant_id"],
            serde_json::json!(tenant_id.to_string())
        );

        // 以同一租户作用域回读，确认落库行的 tenant_id 正确。
        let mut scope = db.scope_for_tenant(tenant_id).await.expect("打开回读事务");
        let stored_hazard: String = sqlx::query_scalar(
            "SELECT tenant_id::text FROM ehs.qa_ehs_hazards WHERE hazard_no = $1",
        )
        .bind(&hazard_no)
        .fetch_one(&mut scope)
        .await
        .expect("回读隐患租户");
        let stored_alert: String =
            sqlx::query_scalar("SELECT tenant_id::text FROM ehs.qa_ehs_alerts WHERE alert_no = $1")
                .bind(&alert_no)
                .fetch_one(&mut scope)
                .await
                .expect("回读告警租户");
        assert_eq!(stored_hazard, tenant_id.to_string());
        assert_eq!(stored_alert, tenant_id.to_string());

        // 清理测试数据。
        sqlx::query("DELETE FROM ehs.qa_ehs_hazards WHERE hazard_no = $1")
            .bind(&hazard_no)
            .execute(&mut scope)
            .await
            .expect("清理隐患");
        sqlx::query("DELETE FROM ehs.qa_ehs_alerts WHERE alert_no = $1")
            .bind(&alert_no)
            .execute(&mut scope)
            .await
            .expect("清理告警");
        scope.commit().await.expect("提交清理");
    }

    /// 缺失/非法租户：两个端点均 400，且不产生任何业务行。
    #[tokio::test]
    async fn missing_or_invalid_tenant_returns_400_without_write() {
        let Some(db) = test_db().await else { return };
        let hazard_no = format!("IT-HZ-REJ-{}", short_id());
        let alert_no = format!("IT-AL-REJ-{}", short_id());
        let invalid: Vec<Option<String>> = vec![
            None,
            Some(String::new()),
            Some(Uuid::nil().to_string()),
            Some("not-a-uuid".to_string()),
        ];

        for raw in invalid {
            let hazard = handle_integration_hazard(&db, hazard_req(raw.clone(), &hazard_no)).await;
            assert_eq!(hazard.code, 400, "非法租户隐患请求应 400: {:?}", raw);
            assert!(!hazard.success);
            assert!(hazard.data.is_none());

            let alert = handle_integration_alert(&db, alert_req(raw, &alert_no)).await;
            assert_eq!(alert.code, 400, "非法租户告警请求应 400");
            assert!(!alert.success);
            assert!(alert.data.is_none());
        }

        let mut scope = db.scope_read_system().await.expect("打开系统读事务");
        let hazards: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM ehs.qa_ehs_hazards WHERE hazard_no = $1")
                .bind(&hazard_no)
                .fetch_one(&mut scope)
                .await
                .expect("统计隐患");
        let alerts: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM ehs.qa_ehs_alerts WHERE alert_no = $1")
                .bind(&alert_no)
                .fetch_one(&mut scope)
                .await
                .expect("统计告警");
        assert_eq!(hazards, 0, "非法租户不得写入隐患");
        assert_eq!(alerts, 0, "非法租户不得写入告警");
        scope.rollback().await.expect("结束读事务");
    }

    /// 原有过期守卫的累计拒绝计数仍在递增（每条非法请求 +1）。
    #[tokio::test]
    async fn tenant_reject_counter_keeps_incrementing() {
        let cases: Vec<Option<String>> = vec![
            None,
            Some(String::new()),
            Some(Uuid::nil().to_string()),
            Some("not-a-uuid".to_string()),
        ];
        let before = INTEGRATION_TENANT_REJECTS.load(Ordering::Relaxed);

        for raw in &cases {
            let err = require_integration_tenant(raw.as_deref(), "hazards/integration")
                .expect_err("非法租户必须被拒收");
            assert_eq!(err.code, 400);
        }

        let after = INTEGRATION_TENANT_REJECTS.load(Ordering::Relaxed);
        assert!(
            after >= before + 4,
            "累计拒绝计数应至少 +4: {before} -> {after}"
        );
    }

    /// LIMS 异常幂等键端到端（本地副本库）：integration 路径与 ehs handler 共用
    /// 同一编号实现；同事件重投只落 1 行且 `updated_at` 前进；不同 `test_item`
    /// 各自成行；编号长度不超 64。
    #[tokio::test]
    async fn lims_abnormal_shared_key_is_idempotent_and_item_scoped() {
        let Some(db) = test_db().await else { return };

        let tenant_id = Uuid::new_v4();
        let task_id = Uuid::new_v4();
        let key_a = topems_shared_event::event::lims_abnormal_hazard_no(task_id, "重金属检测");
        let key_b = topems_shared_event::event::lims_abnormal_hazard_no(task_id, "微生物限度");
        assert!(key_a.len() <= 64, "{key_a} 超限");
        assert!(key_b.len() <= 64, "{key_b} 超限");
        assert_ne!(key_a, key_b, "同一任务下不同检测项不得合并");

        let tenant = Some(tenant_id.to_string());
        let first = handle_integration_hazard(&db, hazard_req(tenant.clone(), &key_a)).await;
        assert_eq!(first.code, 200, "首次写入应成功: {}", first.message);
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        let second = handle_integration_hazard(&db, hazard_req(tenant.clone(), &key_a)).await;
        assert_eq!(second.code, 200, "重投写入应成功: {}", second.message);
        let other = handle_integration_hazard(&db, hazard_req(tenant, &key_b)).await;
        assert_eq!(other.code, 200, "不同检测项写入应成功: {}", other.message);

        let mut scope = db.scope_for_tenant(tenant_id).await.expect("打开回读事务");
        let (count_a, created_a, updated_a): (
            i64,
            chrono::DateTime<chrono::Utc>,
            chrono::DateTime<chrono::Utc>,
        ) = sqlx::query_as(
            "SELECT COUNT(*), MIN(created_at), MAX(updated_at) \
             FROM ehs.qa_ehs_hazards WHERE hazard_no = $1",
        )
        .bind(&key_a)
        .fetch_one(&mut scope)
        .await
        .expect("回读幂等键 A");
        assert_eq!(count_a, 1, "同事件重投只应落 1 行");
        assert!(
            updated_a > created_a,
            "重投后 updated_at 必须前进: created={created_a}, updated={updated_a}"
        );

        let count_b: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM ehs.qa_ehs_hazards WHERE hazard_no = $1")
                .bind(&key_b)
                .fetch_one(&mut scope)
                .await
                .expect("回读幂等键 B");
        assert_eq!(count_b, 1, "不同 test_item 必须各自成行");

        sqlx::query("DELETE FROM ehs.qa_ehs_hazards WHERE hazard_no = ANY($1)")
            .bind(vec![key_a, key_b])
            .execute(&mut scope)
            .await
            .expect("清理测试数据");
        scope.commit().await.expect("提交清理");
    }
}
