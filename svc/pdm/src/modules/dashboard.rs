use axum::{
    extract::{Multipart, State},
    routing::{get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(get_dashboard))
        .route("/health", get(api_health))
        .route("/import", post(import_data))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PdmDashboardStats {
    pub ongoing_projects: i64,
    pub pending_reviews: i64,
    pub bom_changes: i64,
    pub completion_rate: f64,
    pub project_distribution: Vec<NamedCount>,
    pub document_types: Vec<NamedCount>,
    pub change_trend: Vec<NamedCount>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NamedCount {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct NamedCountRow {
    name: Option<String>,
    value: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/dashboard",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn get_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let pending_reviews = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pdm_documents WHERE tenant_id = $1 AND status IN ('review', 'pending')",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let active_boms = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pdm_boms WHERE tenant_id = $1 AND status = 'active'",
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let total_boms =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pdm_boms WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let document_types = fetch_named_counts(
        &state,
        tenant_id,
        r#"
        SELECT COALESCE(document_type, 'other') AS name, COUNT(*) AS value
        FROM pdm_documents
        WHERE tenant_id = $1
        GROUP BY COALESCE(document_type, 'other')
        ORDER BY value DESC
        "#,
    )
    .await;

    let change_trend = fetch_named_counts(
        &state,
        tenant_id,
        r#"
        SELECT COALESCE(status, 'unknown') AS name, COUNT(*) AS value
        FROM pdm_change_notices
        WHERE tenant_id = $1
        GROUP BY COALESCE(status, 'unknown')
        ORDER BY value DESC
        "#,
    )
    .await;

    let project_distribution = fetch_named_counts(
        &state,
        tenant_id,
        r#"
        SELECT COALESCE(status, 'unknown') AS name, COUNT(*) AS value
        FROM pdm_boms
        WHERE tenant_id = $1
        GROUP BY COALESCE(status, 'unknown')
        ORDER BY value DESC
        "#,
    )
    .await;

    let stats = PdmDashboardStats {
        ongoing_projects: active_boms,
        pending_reviews,
        bom_changes: total_boms,
        completion_rate: if total_boms > 0 {
            (active_boms as f64 / total_boms as f64 * 100.0).round()
        } else {
            0.0
        },
        project_distribution,
        document_types,
        change_trend,
    };

    match serde_json::to_value(stats) {
        Ok(value) => Json(ApiResponse::success(value, "获取 PDM 仪表盘成功")),
        Err(e) => {
            tracing::error!("序列化 PDM 仪表盘失败: {}", e);
            Json(ApiResponse::error(500, "获取 PDM 仪表盘失败"))
        }
    }
}

async fn fetch_named_counts(state: &AppState, tenant_id: Uuid, sql: &str) -> Vec<NamedCount> {
    sqlx::query_as::<_, NamedCountRow>(sql)
        .bind(tenant_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| NamedCount {
            name: row.name.unwrap_or_else(|| "unknown".to_string()),
            value: row.value,
        })
        .collect()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/health",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn api_health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "healthy".to_string(),
        "PDM service is healthy",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:write"])),
    path = "/api/pdm/import",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn import_data(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut import_type: Option<String> = None;
    let mut file_name: Option<String> = None;
    let mut file_size: usize = 0;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("type") {
            import_type = field.text().await.ok();
            continue;
        }

        if name.as_deref() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            if let Ok(bytes) = field.bytes().await {
                file_size = bytes.len();
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "type": import_type.unwrap_or_else(|| "unknown".to_string()),
            "file_name": file_name,
            "file_size": file_size,
            "imported": 0,
            "status": "accepted"
        }),
        "PDM 数据导入请求已接收",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_routes_smoke() {
        let _router = create_routes();
    }

    #[test]
    fn test_named_count_serde_roundtrip() {
        let nc = NamedCount {
            name: "active".to_string(),
            value: 42,
        };
        let serialized = serde_json::to_string(&nc).unwrap();
        let deserialized: NamedCount = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.name, "active");
        assert_eq!(deserialized.value, 42);
    }

    #[test]
    fn test_named_count_clone() {
        fn assert_debug<T: std::fmt::Debug>() {}
        assert_debug::<NamedCount>();
        let nc = NamedCount {
            name: "x".to_string(),
            value: 1,
        };
        let c = NamedCount {
            name: nc.name.clone(),
            value: nc.value,
        };
        assert_eq!(c.name, nc.name);
        assert_eq!(c.value, nc.value);
    }

    #[test]
    fn test_pdm_dashboard_stats_serde_roundtrip() {
        let stats = PdmDashboardStats {
            ongoing_projects: 10,
            pending_reviews: 5,
            bom_changes: 20,
            completion_rate: 75.5,
            project_distribution: vec![
                NamedCount {
                    name: "planning".to_string(),
                    value: 3,
                },
                NamedCount {
                    name: "active".to_string(),
                    value: 7,
                },
            ],
            document_types: vec![NamedCount {
                name: "spec".to_string(),
                value: 15,
            }],
            change_trend: vec![NamedCount {
                name: "approved".to_string(),
                value: 8,
            }],
        };
        let serialized = serde_json::to_string(&stats).unwrap();
        let deserialized: PdmDashboardStats = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.ongoing_projects, 10);
        assert_eq!(deserialized.pending_reviews, 5);
        assert_eq!(deserialized.bom_changes, 20);
        assert_eq!(deserialized.completion_rate, 75.5);
        assert_eq!(deserialized.project_distribution.len(), 2);
        assert_eq!(deserialized.document_types.len(), 1);
        assert_eq!(deserialized.change_trend.len(), 1);
    }

    #[test]
    fn test_pdm_dashboard_stats_serde_empty_vectors() {
        let stats = PdmDashboardStats {
            ongoing_projects: 0,
            pending_reviews: 0,
            bom_changes: 0,
            completion_rate: 0.0,
            project_distribution: vec![],
            document_types: vec![],
            change_trend: vec![],
        };
        let serialized = serde_json::to_value(stats).unwrap();
        assert_eq!(serialized["ongoing_projects"], 0);
        assert_eq!(serialized["completion_rate"], 0.0);
        assert!(serialized["project_distribution"]
            .as_array()
            .unwrap()
            .is_empty());
    }
}
