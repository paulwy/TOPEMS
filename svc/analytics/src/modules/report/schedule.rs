//! Report Schedule handlers

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::fmt;
use std::str::FromStr;
use tracing::info;
use uuid::Uuid;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/schedules", get(list_schedules).post(create_schedule))
        .route(
            "/schedules/{id}",
            get(get_schedule)
                .put(update_schedule)
                .delete(delete_schedule),
        )
        .route("/schedules/{id}/execute", post(execute_schedule))
        .route("/schedules/{id}/history", get(get_execution_history))
        .route("/schedules/{id}/toggle", post(toggle_schedule))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScheduleType {
    Cron,
    Interval,
    OneTime,
}

impl fmt::Display for ScheduleType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ScheduleType::Cron => write!(f, "cron"),
            ScheduleType::Interval => write!(f, "interval"),
            ScheduleType::OneTime => write!(f, "one_time"),
        }
    }
}

impl FromStr for ScheduleType {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "cron" => Ok(ScheduleType::Cron),
            "interval" => Ok(ScheduleType::Interval),
            "one_time" | "onetime" | "once" => Ok(ScheduleType::OneTime),
            _ => Err(anyhow::anyhow!("Unknown schedule type: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScheduleStatus {
    Active,
    Paused,
    Completed,
    Failed,
}

impl fmt::Display for ScheduleStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ScheduleStatus::Active => write!(f, "active"),
            ScheduleStatus::Paused => write!(f, "paused"),
            ScheduleStatus::Completed => write!(f, "completed"),
            ScheduleStatus::Failed => write!(f, "failed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSchedule {
    pub id: Uuid,
    pub name: String,
    pub template_id: Uuid,
    pub template_name: String,
    pub schedule_type: ScheduleType,
    pub schedule_expression: String,
    pub parameters: serde_json::Value,
    pub recipients: Vec<String>,
    pub status: ScheduleStatus,
    pub last_run_at: Option<chrono::DateTime<chrono::Utc>>,
    pub next_run_at: Option<chrono::DateTime<chrono::Utc>>,
    pub run_count: i32,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScheduleRequest {
    pub name: String,
    pub template_id: Uuid,
    pub schedule_type: ScheduleType,
    pub schedule_expression: String,
    pub parameters: serde_json::Value,
    pub recipients: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScheduleRequest {
    pub name: Option<String>,
    pub schedule_expression: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub recipients: Option<Vec<String>>,
    pub status: Option<ScheduleStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleExecutionRecord {
    pub id: Uuid,
    pub schedule_id: Uuid,
    pub schedule_name: String,
    pub status: String,
    pub output_path: Option<String>,
    pub error_message: Option<String>,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:schedule:read"])),
    path = "/schedules",
    tag = "Schedules",
    operation_id = "list_schedules",
    responses((status = 200, description = "OK")),
)]
pub async fn list_schedules(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing schedules");

    let schedules = sqlx::query(
        r#"
        SELECT s.id, s.name, s.template_id, t.name as template_name, 
               s.schedule_type, s.schedule_expression, s.parameters, 
               s.recipients, s.status, s.last_run_at, s.next_run_at, 
               s.run_count, s.error_message, s.created_at, s.updated_at
        FROM report_schedules s
        LEFT JOIN report_templates t ON s.template_id = t.id
        ORDER BY s.created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = schedules
        .into_iter()
        .map(|s| {
            serde_json::json!({
                "id": s.get::<Uuid, _>("id"),
                "name": s.get::<String, _>("name"),
                "template_id": s.get::<Uuid, _>("template_id"),
                "template_name": s.get::<Option<String>, _>("template_name"),
                "schedule_type": s.get::<String, _>("schedule_type"),
                "schedule_expression": s.get::<String, _>("schedule_expression"),
                "parameters": s.get::<serde_json::Value, _>("parameters"),
                "recipients": s.get::<serde_json::Value, _>("recipients"),
                "status": s.get::<String, _>("status"),
                "last_run_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_run_at"),
                "next_run_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("next_run_at"),
                "run_count": s.get::<i32, _>("run_count"),
                "error_message": s.get::<Option<String>, _>("error_message"),
                "created_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
                "updated_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "total": result.len()
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:schedule:write"])),
    path = "/schedules",
    tag = "Schedules",
    operation_id = "create_schedule",
    responses((status = 200, description = "OK")),
)]
pub async fn create_schedule(
    State(state): State<AppState>,
    Json(req): Json<CreateScheduleRequest>,
) -> Json<serde_json::Value> {
    info!("Creating schedule: {}", req.name);

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO report_schedules (id, name, template_id, schedule_type, 
                                      schedule_expression, parameters, recipients, 
                                      status, run_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
    )
    .bind(id)
    .bind(req.name)
    .bind(req.template_id)
    .bind(req.schedule_type.to_string())
    .bind(req.schedule_expression)
    .bind(req.parameters)
    .bind(serde_json::to_value(&req.recipients).ok())
    .bind("active")
    .bind(0)
    .bind(now)
    .bind(now)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Schedule created",
            "data": id
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create schedule: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:schedule:read"])),
    path = "/schedules/{id}",
    tag = "Schedules",
    operation_id = "get_schedule",
    responses((status = 200, description = "OK")),
)]
pub async fn get_schedule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting schedule: {}", id);

    let schedule = sqlx::query(
        r#"
        SELECT s.id, s.name, s.template_id, t.name as template_name, 
               s.schedule_type, s.schedule_expression, s.parameters, 
               s.recipients, s.status, s.last_run_at, s.next_run_at, 
               s.run_count, s.error_message, s.created_at, s.updated_at
        FROM report_schedules s
        LEFT JOIN report_templates t ON s.template_id = t.id
        WHERE s.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match schedule {
        Ok(Some(s)) => Json(serde_json::json!({
            "success": true,
            "data": {
                "id": s.get::<Uuid, _>("id"),
                "name": s.get::<String, _>("name"),
                "template_id": s.get::<Uuid, _>("template_id"),
                "template_name": s.get::<Option<String>, _>("template_name"),
                "schedule_type": s.get::<String, _>("schedule_type"),
                "schedule_expression": s.get::<String, _>("schedule_expression"),
                "parameters": s.get::<serde_json::Value, _>("parameters"),
                "recipients": s.get::<serde_json::Value, _>("recipients"),
                "status": s.get::<String, _>("status"),
                "last_run_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_run_at"),
                "next_run_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("next_run_at"),
                "run_count": s.get::<i32, _>("run_count"),
                "error_message": s.get::<Option<String>, _>("error_message"),
                "created_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
                "updated_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            }
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Schedule not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to get schedule: {}", e),
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:schedule:write"])),
    path = "/schedules/{id}",
    tag = "Schedules",
    operation_id = "update_schedule",
    responses((status = 200, description = "OK")),
)]
pub async fn update_schedule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateScheduleRequest>,
) -> Json<serde_json::Value> {
    info!("Updating schedule: {}", id);

    let result = sqlx::query(
        r#"
        UPDATE report_schedules
        SET name = COALESCE($1, name),
            schedule_expression = COALESCE($2, schedule_expression),
            parameters = COALESCE($3, parameters),
            recipients = COALESCE($4, recipients),
            status = COALESCE($5, status),
            updated_at = $6
        WHERE id = $7
        "#,
    )
    .bind(req.name)
    .bind(req.schedule_expression)
    .bind(req.parameters)
    .bind(req.recipients.and_then(|r| serde_json::to_value(&r).ok()))
    .bind(req.status.map(|s| s.to_string()))
    .bind(chrono::Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Schedule updated"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update schedule: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:schedule:write"])),
    path = "/schedules/{id}",
    tag = "Schedules",
    operation_id = "delete_schedule",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_schedule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting schedule: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE report_schedules SET deleted_at = NOW()
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Schedule deleted"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete schedule: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:schedule:write"])),
    path = "/schedules/{id}/execute",
    tag = "Schedules",
    operation_id = "execute_schedule",
    responses((status = 200, description = "OK")),
)]
pub async fn execute_schedule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Executing schedule: {}", id);

    let now = chrono::Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE report_schedules
        SET last_run_at = $1, run_count = run_count + 1, updated_at = $2
        WHERE id = $3
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Schedule execution triggered"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to execute schedule: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/schedules/{id}/history",
    tag = "Schedules",
    operation_id = "get_execution_history",
    responses((status = 200, description = "OK")),
)]
pub async fn get_execution_history(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting execution history for schedule: {}", id);

    let records = sqlx::query(
        r#"
        SELECT id, schedule_id, schedule_name, status, output_path, 
               error_message, started_at, completed_at
        FROM report_execution_records
        WHERE schedule_id = $1
        ORDER BY started_at DESC
        LIMIT 50
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = records
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "schedule_id": r.get::<Uuid, _>("schedule_id"),
                "schedule_name": r.get::<String, _>("schedule_name"),
                "status": r.get::<String, _>("status"),
                "output_path": r.get::<Option<String>, _>("output_path"),
                "error_message": r.get::<Option<String>, _>("error_message"),
                "started_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("started_at"),
                "completed_at": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("completed_at"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "total": result.len()
    }))
}

pub async fn run_schedule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Running schedule: {}", id);

    let now = chrono::Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE report_schedules
        SET last_run_at = $1, run_count = run_count + 1, updated_at = $2
        WHERE id = $3
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Schedule execution triggered"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to execute schedule: {}", e),
        )),
    }
}

pub async fn toggle_schedule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Toggling schedule: {}", id);

    let result = sqlx::query(
        r#"
        UPDATE report_schedules
        SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END,
            updated_at = $1
        WHERE id = $2
        "#,
    )
    .bind(chrono::Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Schedule status toggled"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to toggle schedule: {}", e),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- ScheduleType FromStr ----
    #[test]
    fn schedule_type_parse() {
        assert!(matches!(
            "cron".parse::<ScheduleType>().unwrap(),
            ScheduleType::Cron
        ));
        assert!(matches!(
            "interval".parse::<ScheduleType>().unwrap(),
            ScheduleType::Interval
        ));
        assert!(matches!(
            "one_time".parse::<ScheduleType>().unwrap(),
            ScheduleType::OneTime
        ));
    }

    #[test]
    fn schedule_type_aliases() {
        assert!(matches!(
            "onetime".parse::<ScheduleType>().unwrap(),
            ScheduleType::OneTime
        ));
        assert!(matches!(
            "once".parse::<ScheduleType>().unwrap(),
            ScheduleType::OneTime
        ));
    }

    #[test]
    fn schedule_type_case_insensitive() {
        assert!(matches!(
            "CRON".parse::<ScheduleType>().unwrap(),
            ScheduleType::Cron
        ));
        assert!(matches!(
            "Interval".parse::<ScheduleType>().unwrap(),
            ScheduleType::Interval
        ));
    }

    #[test]
    fn schedule_type_unknown_rejected() {
        assert!("hourly".parse::<ScheduleType>().is_err());
        assert!("".parse::<ScheduleType>().is_err());
    }

    // ---- ScheduleStatus Display ----
    #[test]
    fn schedule_status_display() {
        assert_eq!(ScheduleStatus::Active.to_string(), "active");
        assert_eq!(ScheduleStatus::Paused.to_string(), "paused");
        assert_eq!(ScheduleStatus::Completed.to_string(), "completed");
        assert_eq!(ScheduleStatus::Failed.to_string(), "failed");
    }
}
