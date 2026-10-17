//! Environment handlers — 环境监测点 monitors CRUD（接真 ehs.qa_ehs_environment_monitors）
//!
//! 历史错位：前端 EnvironmentPage 消费 `/environment/monitors` 监测点 CRUD（EnvironmentMonitor
//! 契约），后端曾把 monitors/records 都映射到一个 EnvironmentRecord 内存桩。现统一按监测点表接真，
//! runtime sqlx + 应用层 tenant 过滤，对齐 accident.rs/hazard.rs 范式。

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/environment", get(list_records).post(create_record))
        .route(
            "/environment/monitors",
            get(list_records).post(create_record),
        )
        .route(
            "/environment/monitors/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route(
            "/environment/records",
            get(list_records).post(create_record),
        )
        .route("/environment/records/{id}", get(get_record))
}

#[derive(Debug, Deserialize)]
pub struct EnvironmentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

fn resolve_tenant_id(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// 对齐前端 EnvironmentMonitor（apps/web/src/api/ehs/types/environment.ts:4-20）。
#[derive(Debug, Serialize)]
pub struct EnvironmentMonitor {
    pub id: String,
    pub monitor_no: Option<String>,
    pub name: String,
    pub monitor_type: String,
    pub location: Option<String>,
    pub status: String,
    pub description: Option<String>,
    pub monitor_frequency: Option<String>,
    pub standard_value: Option<String>,
    pub warning_threshold: Option<f64>,
    pub alarm_threshold: Option<f64>,
    pub unit: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environment/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<EnvironmentMonitor>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let rows = sqlx::query(
        r#"SELECT id::text AS id, monitor_no, name, monitor_type, location, status,
                  description, monitor_frequency, standard_value,
                  warning_threshold::text AS warning_threshold,
                  alarm_threshold::text AS alarm_threshold,
                  unit, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at
           FROM ehs.qa_ehs_environment_monitors
           WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1)
             AND deleted_at IS NULL
           ORDER BY created_at DESC"#,
    )
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await;
    match rows {
        Ok(r) => {
            let list: Vec<EnvironmentMonitor> = r
                .iter()
                .map(|row| EnvironmentMonitor {
                    id: row.try_get::<String, _>("id").unwrap_or_default(),
                    monitor_no: row
                        .try_get::<Option<String>, _>("monitor_no")
                        .ok()
                        .flatten(),
                    name: row.try_get::<String, _>("name").unwrap_or_default(),
                    monitor_type: row.try_get::<String, _>("monitor_type").unwrap_or_default(),
                    location: row.try_get::<Option<String>, _>("location").ok().flatten(),
                    status: row
                        .try_get::<String, _>("status")
                        .unwrap_or_else(|_| "active".to_string()),
                    description: row
                        .try_get::<Option<String>, _>("description")
                        .ok()
                        .flatten(),
                    monitor_frequency: row
                        .try_get::<Option<String>, _>("monitor_frequency")
                        .ok()
                        .flatten(),
                    standard_value: row
                        .try_get::<Option<String>, _>("standard_value")
                        .ok()
                        .flatten(),
                    warning_threshold: row
                        .try_get::<Option<String>, _>("warning_threshold")
                        .ok()
                        .flatten()
                        .and_then(|v| v.parse::<f64>().ok()),
                    alarm_threshold: row
                        .try_get::<Option<String>, _>("alarm_threshold")
                        .ok()
                        .flatten()
                        .and_then(|v| v.parse::<f64>().ok()),
                    unit: row.try_get::<Option<String>, _>("unit").ok().flatten(),
                    created_by: row
                        .try_get::<Option<String>, _>("created_by")
                        .ok()
                        .flatten(),
                    created_at: row
                        .try_get::<Option<String>, _>("created_at")
                        .ok()
                        .flatten(),
                    updated_at: row
                        .try_get::<Option<String>, _>("updated_at")
                        .ok()
                        .flatten(),
                })
                .collect();
            Json(ApiResponse::success(list, "获取环境监测点列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to list environment monitors: {}", e);
            Json(ApiResponse::error(500, "获取环境监测点列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environment/records",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<EnvironmentMonitor>> {
    let tenant_id = resolve_tenant_id(&claims);
    let id = uuid::Uuid::new_v4();
    let monitor_no = req
        .get("monitor_no")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!(
                "ENV-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            )
        });
    let name = req
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名监测点")
        .to_string();
    let monitor_type = req
        .get("monitor_type")
        .and_then(|v| v.as_str())
        .unwrap_or("废气")
        .to_string();
    let location = req
        .get("location")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("active")
        .to_string();
    let description = req
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let monitor_frequency = req
        .get("monitor_frequency")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let standard_value = req
        .get("standard_value")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let warning_threshold = req.get("warning_threshold").and_then(|v| v.as_f64());
    let alarm_threshold = req.get("alarm_threshold").and_then(|v| v.as_f64());
    let unit = req
        .get("unit")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let res = sqlx::query(
        r#"INSERT INTO ehs.qa_ehs_environment_monitors
           (id, monitor_no, name, monitor_type, location, status, description,
            monitor_frequency, standard_value, warning_threshold, alarm_threshold, unit, tenant_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)"#,
    )
    .bind(id)
    .bind(&monitor_no)
    .bind(&name)
    .bind(&monitor_type)
    .bind(&location)
    .bind(&status)
    .bind(&description)
    .bind(&monitor_frequency)
    .bind(&standard_value)
    .bind(warning_threshold)
    .bind(alarm_threshold)
    .bind(&unit)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;
    if let Err(e) = res {
        tracing::error!("Failed to insert environment monitor: {}", e);
        return Json(ApiResponse::error(500, "环境监测点创建失败"));
    }
    Json(ApiResponse::success(
        EnvironmentMonitor {
            id: id.to_string(),
            monitor_no: Some(monitor_no),
            name,
            monitor_type,
            location,
            status,
            description,
            monitor_frequency,
            standard_value,
            warning_threshold,
            alarm_threshold,
            unit,
            created_by: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "环境监测点创建成功",
    ))
}

pub async fn get_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<EnvironmentMonitor>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let row = sqlx::query(
        r#"SELECT id::text AS id, monitor_no, name, monitor_type, location, status,
                  description, monitor_frequency, standard_value,
                  warning_threshold::text AS warning_threshold,
                  alarm_threshold::text AS alarm_threshold,
                  unit, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at
           FROM ehs.qa_ehs_environment_monitors
           WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1)
             AND id = $2::uuid AND deleted_at IS NULL"#,
    )
    .bind(&tenant_bind)
    .bind(&id)
    .fetch_optional(&state.pool)
    .await;
    match row {
        Ok(Some(r)) => Json(ApiResponse::success(
            EnvironmentMonitor {
                id: r.try_get::<String, _>("id").unwrap_or_default(),
                monitor_no: r.try_get::<Option<String>, _>("monitor_no").ok().flatten(),
                name: r.try_get::<String, _>("name").unwrap_or_default(),
                monitor_type: r.try_get::<String, _>("monitor_type").unwrap_or_default(),
                location: r.try_get::<Option<String>, _>("location").ok().flatten(),
                status: r
                    .try_get::<String, _>("status")
                    .unwrap_or_else(|_| "active".to_string()),
                description: r.try_get::<Option<String>, _>("description").ok().flatten(),
                monitor_frequency: r
                    .try_get::<Option<String>, _>("monitor_frequency")
                    .ok()
                    .flatten(),
                standard_value: r
                    .try_get::<Option<String>, _>("standard_value")
                    .ok()
                    .flatten(),
                warning_threshold: r
                    .try_get::<Option<String>, _>("warning_threshold")
                    .ok()
                    .flatten()
                    .and_then(|v| v.parse::<f64>().ok()),
                alarm_threshold: r
                    .try_get::<Option<String>, _>("alarm_threshold")
                    .ok()
                    .flatten()
                    .and_then(|v| v.parse::<f64>().ok()),
                unit: r.try_get::<Option<String>, _>("unit").ok().flatten(),
                created_by: r.try_get::<Option<String>, _>("created_by").ok().flatten(),
                created_at: r.try_get::<Option<String>, _>("created_at").ok().flatten(),
                updated_at: r.try_get::<Option<String>, _>("updated_at").ok().flatten(),
            },
            "获取环境监测点成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "环境监测点不存在")),
        Err(e) => {
            tracing::error!("Failed to get environment monitor: {}", e);
            Json(ApiResponse::error(500, "获取环境监测点失败"))
        }
    }
}

pub async fn update_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<EnvironmentMonitor>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    // 先取现有行，再按请求字段 COALESCE 保留原值。
    let existing = sqlx::query(
        r#"SELECT name, monitor_type, location, status, description, monitor_frequency,
                  standard_value, warning_threshold, alarm_threshold, unit
           FROM ehs.qa_ehs_environment_monitors
           WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1)
             AND id = $2::uuid AND deleted_at IS NULL"#,
    )
    .bind(&tenant_bind)
    .bind(&id)
    .fetch_optional(&state.pool)
    .await;
    let _existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "环境监测点不存在")),
        Err(e) => {
            tracing::error!("Failed to load environment monitor for update: {}", e);
            return Json(ApiResponse::error(500, "更新环境监测点失败"));
        }
    };

    let name = req.get("name").and_then(|v| v.as_str());
    let monitor_type = req.get("monitor_type").and_then(|v| v.as_str());
    let location = req.get("location").and_then(|v| v.as_str());
    let status = req.get("status").and_then(|v| v.as_str());
    let description = req.get("description").and_then(|v| v.as_str());
    let monitor_frequency = req.get("monitor_frequency").and_then(|v| v.as_str());
    let standard_value = req.get("standard_value").and_then(|v| v.as_str());
    let warning_threshold = req.get("warning_threshold").and_then(|v| v.as_f64());
    let alarm_threshold = req.get("alarm_threshold").and_then(|v| v.as_f64());
    let unit = req.get("unit").and_then(|v| v.as_str());

    let r = sqlx::query(
        r#"UPDATE ehs.qa_ehs_environment_monitors SET
             name = COALESCE($1, name),
             monitor_type = COALESCE($2, monitor_type),
             location = $3,
             status = COALESCE($4, status),
             description = $5,
             monitor_frequency = $6,
             standard_value = $7,
             warning_threshold = COALESCE($8, warning_threshold),
             alarm_threshold = COALESCE($9, alarm_threshold),
             unit = $10,
             updated_at = now()
           WHERE ($11 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $11)
             AND id = $12::uuid AND deleted_at IS NULL"#,
    )
    .bind(name)
    .bind(monitor_type)
    .bind(location)
    .bind(status)
    .bind(description)
    .bind(monitor_frequency)
    .bind(standard_value)
    .bind(warning_threshold)
    .bind(alarm_threshold)
    .bind(unit)
    .bind(&tenant_bind)
    .bind(&id)
    .execute(&state.pool)
    .await;
    if let Err(e) = r {
        tracing::error!("Failed to update environment monitor: {}", e);
        return Json(ApiResponse::error(500, "更新环境监测点失败"));
    }
    Json(ApiResponse::success(
        EnvironmentMonitor {
            id,
            monitor_no: None,
            name: name.unwrap_or("").to_string(),
            monitor_type: monitor_type.unwrap_or("").to_string(),
            location: location.map(|s| s.to_string()),
            status: status.unwrap_or("active").to_string(),
            description: description.map(|s| s.to_string()),
            monitor_frequency: monitor_frequency.map(|s| s.to_string()),
            standard_value: standard_value.map(|s| s.to_string()),
            warning_threshold,
            alarm_threshold,
            unit: unit.map(|s| s.to_string()),
            created_by: None,
            created_at: None,
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "环境监测点更新成功",
    ))
}

pub async fn delete_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let r = sqlx::query(
        "UPDATE ehs.qa_ehs_environment_monitors SET deleted_at = now() \
         WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) \
           AND id = $2::uuid AND deleted_at IS NULL",
    )
    .bind(&tenant_bind)
    .bind(&id)
    .execute(&state.pool)
    .await;
    match r {
        Ok(_) => Json(ApiResponse::success((), "环境监测点删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete environment monitor: {}", e);
            Json(ApiResponse::error(500, "环境监测点删除失败"))
        }
    }
}
