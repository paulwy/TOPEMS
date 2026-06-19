use axum::{
    extract::{Path, State, Json},
    routing::{get, post},
    Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{AppState, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Geofence {
    pub id: Uuid,
    pub map_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub geometry: serde_json::Value,
    pub fence_type: String,
    pub enabled: bool,
    pub alert_on_enter: bool,
    pub alert_on_exit: bool,
    pub alert_on_dwell: bool,
    pub dwell_time_seconds: i32,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GeofenceAlert {
    pub id: Uuid,
    pub geofence_id: Uuid,
    pub device_code: String,
    pub alert_type: String,
    pub position: serde_json::Value,
    pub triggered_at: chrono::DateTime<Utc>,
    pub acknowledged: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateGeofence {
    pub map_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub geometry: serde_json::Value,
    pub fence_type: Option<String>,
    pub enabled: Option<bool>,
    pub alert_on_enter: Option<bool>,
    pub alert_on_exit: Option<bool>,
    pub alert_on_dwell: Option<bool>,
    pub dwell_time_seconds: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGeofence {
    pub name: Option<String>,
    pub description: Option<String>,
    pub geometry: Option<serde_json::Value>,
    pub enabled: Option<bool>,
    pub alert_on_enter: Option<bool>,
    pub alert_on_exit: Option<bool>,
    pub alert_on_dwell: Option<bool>,
    pub dwell_time_seconds: Option<i32>,
}

pub async fn create_geofence(
    State(state): State<AppState>,
    Json(payload): Json<CreateGeofence>,
) -> Json<ApiResponse<Geofence>> {
    let geofence = Geofence {
        id: Uuid::new_v4(),
        map_id: payload.map_id,
        name: payload.name,
        description: payload.description,
        geometry: payload.geometry,
        fence_type: payload.fence_type.unwrap_or("polygon".to_string()),
        enabled: payload.enabled.unwrap_or(true),
        alert_on_enter: payload.alert_on_enter.unwrap_or(true),
        alert_on_exit: payload.alert_on_exit.unwrap_or(false),
        alert_on_dwell: payload.alert_on_dwell.unwrap_or(false),
        dwell_time_seconds: payload.dwell_time_seconds.unwrap_or(300),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = sqlx::query(
        r#"
        INSERT INTO gis.geofences (
            id, map_id, name, description, geometry, fence_type, 
            enabled, alert_on_enter, alert_on_exit, alert_on_dwell, dwell_time_seconds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        "#,
    )
    .bind(geofence.id)
    .bind(geofence.map_id)
    .bind(&geofence.name)
    .bind(&geofence.description)
    .bind(&geofence.geometry)
    .bind(&geofence.fence_type)
    .bind(geofence.enabled)
    .bind(geofence.alert_on_enter)
    .bind(geofence.alert_on_exit)
    .bind(geofence.alert_on_dwell)
    .bind(geofence.dwell_time_seconds)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(geofence, "创建地理围栏成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建失败: {}", e))),
    }
}

pub async fn get_geofence(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Geofence>> {
    let geofence = sqlx::query_as::<_, Geofence>("SELECT * FROM gis.geofences WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await;

    match geofence {
        Ok(Some(g)) => Json(ApiResponse::success(g, "获取围栏成功")),
        Ok(None) => Json(ApiResponse::error(404, "围栏不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn list_geofences(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<Geofence>>> {
    let geofences = sqlx::query_as::<_, Geofence>("SELECT * FROM gis.geofences ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await;

    match geofences {
        Ok(gs) => Json(ApiResponse::success(gs, "获取围栏列表成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn update_geofence(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateGeofence>,
) -> Json<ApiResponse<Geofence>> {
    let result = sqlx::query(
        r#"
        UPDATE gis.geofences SET 
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            geometry = COALESCE($3, geometry),
            enabled = COALESCE($4, enabled),
            alert_on_enter = COALESCE($5, alert_on_enter),
            alert_on_exit = COALESCE($6, alert_on_exit),
            alert_on_dwell = COALESCE($7, alert_on_dwell),
            dwell_time_seconds = COALESCE($8, dwell_time_seconds),
            updated_at = NOW()
        WHERE id = $9
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.geometry)
    .bind(payload.enabled)
    .bind(payload.alert_on_enter)
    .bind(payload.alert_on_exit)
    .bind(payload.alert_on_dwell)
    .bind(payload.dwell_time_seconds)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            match sqlx::query_as::<_, Geofence>("SELECT * FROM gis.geofences WHERE id = $1")
                .bind(id)
                .fetch_one(&state.pool)
                .await
            {
                Ok(geofence) => Json(ApiResponse::success(geofence, "更新围栏成功")),
                Err(_) => Json(ApiResponse::error(500, "获取更新后围栏失败")),
            }
        }
        Ok(_) => Json(ApiResponse::error(404, "围栏不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新失败: {}", e))),
    }
}

pub async fn delete_geofence(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM gis.geofences WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除围栏成功")),
        Ok(_) => Json(ApiResponse::error(404, "围栏不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除失败: {}", e))),
    }
}

pub async fn list_alerts(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<GeofenceAlert>>> {
    let alerts = sqlx::query_as::<_, GeofenceAlert>(
        "SELECT * FROM gis.geofence_alerts ORDER BY triggered_at DESC",
    )
    .fetch_all(&state.pool)
    .await;

    match alerts {
        Ok(as_) => Json(ApiResponse::success(as_, "获取报警列表成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn acknowledge_alert(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("UPDATE gis.geofence_alerts SET acknowledged = true WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "确认报警成功")),
        Ok(_) => Json(ApiResponse::error(404, "报警不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("确认失败: {}", e))),
    }
}

pub async fn check_geofence_violation(
    pool: &sqlx::PgPool,
    device_code: &str,
    position: &serde_json::Value,
) -> Vec<GeofenceAlert> {
    let mut alerts: Vec<GeofenceAlert> = Vec::new();

    let geofences: Vec<Geofence> = match sqlx::query_as::<_, Geofence>(
        "SELECT * FROM gis.geofences WHERE enabled = true",
    )
    .fetch_all(pool)
    .await
    {
        Ok(g) => g,
        Err(_) => return alerts,
    };

    for geofence in geofences {
        if is_point_in_polygon(position, &geofence.geometry) {
            if geofence.alert_on_enter {
                alerts.push(GeofenceAlert {
                    id: Uuid::new_v4(),
                    geofence_id: geofence.id,
                    device_code: device_code.to_string(),
                    alert_type: "enter".to_string(),
                    position: position.clone(),
                    triggered_at: Utc::now(),
                    acknowledged: false,
                });
            }
        } else {
            if geofence.alert_on_exit {
                alerts.push(GeofenceAlert {
                    id: Uuid::new_v4(),
                    geofence_id: geofence.id,
                    device_code: device_code.to_string(),
                    alert_type: "exit".to_string(),
                    position: position.clone(),
                    triggered_at: Utc::now(),
                    acknowledged: false,
                });
            }
        }
    }

    for alert in &alerts {
        let _ = sqlx::query(
            r#"
            INSERT INTO gis.geofence_alerts (
                id, geofence_id, device_code, alert_type, position
            ) VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(alert.id)
        .bind(alert.geofence_id)
        .bind(&alert.device_code)
        .bind(&alert.alert_type)
        .bind(&alert.position)
        .execute(pool)
        .await;
    }

    alerts
}

fn is_point_in_polygon(_point: &serde_json::Value, _polygon: &serde_json::Value) -> bool {
    false
}

pub fn geofence_routes() -> Router<AppState> {
    Router::new()
        .route("/api/gis/geofences", get(list_geofences).post(create_geofence))
        .route("/api/gis/geofences/{id}", get(get_geofence).put(update_geofence).delete(delete_geofence))
        .route("/api/gis/alerts", get(list_alerts))
        .route("/api/gis/alerts/{id}/acknowledge", post(acknowledge_alert))
}