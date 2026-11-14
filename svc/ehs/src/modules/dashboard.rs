//! EHS Dashboard 聚合端点
//!
//! 补齐前端 ehsDashboardApi 调用的 /dashboard 缺口。
//! 从 qa_ehs_accidents / qa_ehs_hazards / qa_ehs_trainings / qa_ehs_drill_records
//! 聚合统计数据返回。

use axum::extract::{Extension, State};
use axum::{routing::get, Router};
use serde::Serialize;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::permission::{dual_scope, open_read_scope};
use crate::shared::AppState;

/// 按作用域统计行数：租户通道显式绑定 tenant_id，系统通道显式不带 tenant_id 谓词。
async fn dashboard_count(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    table: &str,
    condition: &str,
    tenant: Option<Uuid>,
) -> i64 {
    let where_clause = if tenant.is_some() {
        "tenant_id = $1::uuid"
    } else {
        "TRUE"
    };
    let sql = if condition.is_empty() {
        format!("SELECT COUNT(*) FROM {table} WHERE {where_clause}")
    } else {
        format!("SELECT COUNT(*) FROM {table} WHERE {where_clause} AND {condition}")
    };
    let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(t) = tenant {
        q = q.bind(t);
    }
    q.fetch_one(&mut *scope)
        .await
        .ok()
        .and_then(|r| r.try_get::<i64, _>(0).ok())
        .unwrap_or(0)
}

pub fn create_routes() -> Router<AppState> {
    Router::new().route("/dashboard", get(get_dashboard))
}

#[derive(Debug, Serialize)]
pub struct NameValue {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Serialize)]
pub struct EhsDashboardStats {
    pub total_accidents: i64,
    pub pending_hazards: i64,
    pub training_rate: f64,
    pub drill_count: i64,
    pub accident_trend: Vec<NameValue>,
    pub hazard_types: Vec<NameValue>,
    pub training_trend: Vec<NameValue>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/dashboard",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Dashboard"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_dashboard(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<EhsDashboardStats> {
    let tenant_scope = match dual_scope(&claims, "ehs.dashboard.get_dashboard", "ehs.dashboard") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open dashboard scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant = tenant_scope.tenant_id();

    // --- 事故统计 ---
    let total_accidents = dashboard_count(&mut scope, "ehs.qa_ehs_accidents", "", tenant).await;

    let reported_accidents = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_accidents",
        "status = 'reported'",
        tenant,
    )
    .await;

    let investigating_accidents = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_accidents",
        "status = 'investigating'",
        tenant,
    )
    .await;

    let treating_accidents = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_accidents",
        "status = 'treating'",
        tenant,
    )
    .await;

    let closed_accidents = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_accidents",
        "status = 'closed'",
        tenant,
    )
    .await;

    // --- 隐患统计 ---
    let pending_hazards = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_hazards",
        "status != 'closed'",
        tenant,
    )
    .await;

    // 隐患按类别分组
    let hazard_where = if tenant.is_some() {
        "tenant_id = $1::uuid"
    } else {
        "TRUE"
    };
    let hazard_sql = format!(
        "SELECT COALESCE(category, '未分类') AS cat, COUNT(*) AS cnt FROM ehs.qa_ehs_hazards WHERE {hazard_where} GROUP BY category ORDER BY cnt DESC LIMIT 10"
    );
    let mut hazard_query = sqlx::query(sqlx::AssertSqlSafe(hazard_sql));
    if let Some(t) = tenant {
        hazard_query = hazard_query.bind(t);
    }
    let hazard_rows = hazard_query.fetch_all(&mut scope).await.ok();

    let hazard_types: Vec<NameValue> = hazard_rows
        .map(|rows| {
            rows.into_iter()
                .map(|r| NameValue {
                    name: r
                        .try_get::<String, _>("cat")
                        .unwrap_or_else(|_| "未分类".to_string()),
                    value: r.try_get::<i64, _>("cnt").unwrap_or(0),
                })
                .collect()
        })
        .unwrap_or_default();

    // --- 培训统计 ---
    let total_trainings = dashboard_count(&mut scope, "ehs.qa_ehs_trainings", "", tenant).await;

    let completed_trainings = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_trainings",
        "status = 'completed'",
        tenant,
    )
    .await;

    let scheduled_trainings = dashboard_count(
        &mut scope,
        "ehs.qa_ehs_trainings",
        "status = 'scheduled'",
        tenant,
    )
    .await;

    let training_rate = if total_trainings == 0 {
        0.0
    } else {
        (completed_trainings as f64 / total_trainings as f64) * 100.0
    };

    // --- 应急演练统计 ---
    let drill_count = dashboard_count(&mut scope, "ehs.qa_ehs_drill_records", "", tenant).await;

    let stats = EhsDashboardStats {
        total_accidents,
        pending_hazards,
        training_rate,
        drill_count,
        accident_trend: vec![
            NameValue {
                name: "已报告".to_string(),
                value: reported_accidents,
            },
            NameValue {
                name: "调查中".to_string(),
                value: investigating_accidents,
            },
            NameValue {
                name: "处理中".to_string(),
                value: treating_accidents,
            },
            NameValue {
                name: "已闭环".to_string(),
                value: closed_accidents,
            },
        ],
        hazard_types,
        training_trend: vec![
            NameValue {
                name: "已完成".to_string(),
                value: completed_trainings,
            },
            NameValue {
                name: "计划中".to_string(),
                value: scheduled_trainings,
            },
        ],
    };

    ApiResponse::success(stats, "获取EHS仪表盘数据成功")
}
