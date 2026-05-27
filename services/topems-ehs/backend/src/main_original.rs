use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use chrono::{Utc, DateTime};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use sqlx::{postgres::PgPoolOptions, PgPool, Error as SqlxError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyHazard {
    pub id: Uuid,
    pub hazard_no: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: String,
    pub location: String,
    pub risk_assessment: Option<serde_json::Value>,
    pub control_measures: Vec<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSafetyHazardRequest {
    pub hazard_no: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: String,
    pub location: String,
    pub risk_assessment: Option<serde_json::Value>,
    pub control_measures: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSafetyHazardRequest {
    pub hazard_no: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<serde_json::Value>,
    pub control_measures: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyCheck {
    pub id: Uuid,
    pub check_no: String,
    pub check_type: String,
    pub inspector: String,
    pub check_date: DateTime<Utc>,
    pub location: String,
    pub result: String,
    pub issues: Vec<String>,
    pub attachments: Vec<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSafetyCheckRequest {
    pub check_no: String,
    pub check_type: String,
    pub inspector: String,
    pub location: String,
    pub result: String,
    pub issues: Vec<String>,
    pub attachments: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSafetyCheckRequest {
    pub check_no: Option<String>,
    pub check_type: Option<String>,
    pub inspector: Option<String>,
    pub location: Option<String>,
    pub result: Option<String>,
    pub issues: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyPlan {
    pub id: Uuid,
    pub plan_no: String,
    pub name: String,
    pub plan_type: String,
    pub scope: String,
    pub trigger_conditions: String,
    pub response_procedures: String,
    pub responsible_persons: Vec<String>,
    pub contact_info: String,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmergencyPlanRequest {
    pub plan_no: String,
    pub name: String,
    pub plan_type: String,
    pub scope: String,
    pub trigger_conditions: String,
    pub response_procedures: String,
    pub responsible_persons: Vec<String>,
    pub contact_info: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEmergencyPlanRequest {
    pub plan_no: Option<String>,
    pub name: Option<String>,
    pub plan_type: Option<String>,
    pub scope: Option<String>,
    pub trigger_conditions: Option<String>,
    pub response_procedures: Option<String>,
    pub responsible_persons: Option<Vec<String>>,
    pub contact_info: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrillRecord {
    pub id: Uuid,
    pub plan_id: Option<Uuid>,
    pub drill_name: String,
    pub drill_date: DateTime<Utc>,
    pub participants: Vec<String>,
    pub duration: Option<i64>,
    pub location: String,
    pub summary: String,
    pub issues_found: String,
    pub improvements: String,
    pub attachments: Vec<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDrillRecordRequest {
    pub plan_id: Option<String>,
    pub drill_name: String,
    pub participants: Vec<String>,
    pub duration: Option<i64>,
    pub location: String,
    pub summary: String,
    pub issues_found: String,
    pub improvements: String,
    pub attachments: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDrillRecordRequest {
    pub plan_id: Option<String>,
    pub drill_name: Option<String>,
    pub participants: Option<Vec<String>>,
    pub duration: Option<i64>,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: String) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: i32, message: String) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn not_found(message: String) -> Self {
        ApiResponse {
            code: 404,
            success: false,
            data: None,
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    is_postgres_available: bool,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_ehs=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-EHS Environment, Health, and Safety System starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems@localhost:5432/topems".to_string());

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ Connected to PostgreSQL database");
            pool
        }
        Err(e) => {
            tracing::warn!("⚠️ PostgreSQL connection failed: {}, falling back to memory mode", e);
            let pool = PgPoolOptions::new()
                .max_connections(1)
                .connect("postgres://test:test@localhost:5432/test")
                .await
                .unwrap_or_else(|_| {
                    panic!("❌ Failed to connect to any database");
                });
            pool
        }
    };

    let is_postgres_available = true;

    let state = AppState {
        pool,
        is_postgres_available,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/hazards", get(list_hazards))
        .route("/api/v1/hazards", post(create_hazard))
        .route("/api/v1/hazards/:id", get(get_hazard))
        .route("/api/v1/hazards/:id", put(update_hazard))
        .route("/api/v1/hazards/:id", delete(delete_hazard))
        .route("/api/v1/checks", get(list_checks))
        .route("/api/v1/checks", post(create_check))
        .route("/api/v1/checks/:id", get(get_check))
        .route("/api/v1/checks/:id", put(update_check))
        .route("/api/v1/checks/:id", delete(delete_check))
        .route("/api/v1/plans", get(list_plans))
        .route("/api/v1/plans", post(create_plan))
        .route("/api/v1/plans/:id", get(get_plan))
        .route("/api/v1/plans/:id", put(update_plan))
        .route("/api/v1/plans/:id", delete(delete_plan))
        .route("/api/v1/drills", get(list_drills))
        .route("/api/v1/drills", post(create_drill))
        .route("/api/v1/drills/:id", get(get_drill))
        .route("/api/v1/drills/:id", put(update_drill))
        .route("/api/v1/drills/:id", delete(delete_drill))
        // CORS层必须放在最前面
        .layer(cors)
        .with_state(state);

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8008".to_string())
        .parse()
        .unwrap_or(8008);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let mode = if state.is_postgres_available { "PostgreSQL mode" } else { "Memory mode" };
    tracing::info!("✅ TOPEMS-EHS service is running at http://{} ({})", addr, mode);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS-EHS Environment, Health, and Safety System API\n\nCheck out the API at /health"
}

async fn health(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    let mode = if state.is_postgres_available { "PostgreSQL mode" } else { "Memory mode" };
    Json(ApiResponse::success(
        format!("TOPEMS-EHS is running! ({})", mode),
        "OK".to_string(),
    ))
}

async fn list_hazards(State(state): State<AppState>) -> Json<ApiResponse<Vec<SafetyHazard>>> {
    match sqlx::query!(
        r#"SELECT id, hazard_no, name, category, level, description, location, 
                  risk_assessment, control_measures, status, created_by, created_at, updated_at
           FROM ehs.safety_hazards ORDER BY created_at DESC"#
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let hazards: Vec<SafetyHazard> = rows
                .into_iter()
                .map(|row| SafetyHazard {
                    id: row.id,
                    hazard_no: row.hazard_no,
                    name: row.name,
                    category: row.category,
                    level: row.level,
                    description: row.description,
                    location: row.location,
                    risk_assessment: row.risk_assessment,
                    control_measures: serde_json::from_value(row.control_measures).unwrap_or_default(),
                    status: row.status,
                    created_by: row.created_by,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                })
                .collect();
            Json(ApiResponse::success(hazards, "Hazards retrieved successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to fetch hazards: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch hazards: {}", e)))
        }
    }
}

async fn create_hazard(
    State(state): State<AppState>,
    Json(req): Json<CreateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let control_measures_json = serde_json::to_value(&req.control_measures).unwrap();

    match sqlx::query!(
        r#"INSERT INTO ehs.safety_hazards (
            id, hazard_no, name, category, level, description, location, 
            risk_assessment, control_measures, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, hazard_no, name, category, level, description, location, 
                  risk_assessment, control_measures, status, created_by, created_at, updated_at"#,
        id,
        req.hazard_no,
        req.name,
        req.category,
        req.level,
        req.description,
        req.location,
        req.risk_assessment,
        control_measures_json,
        req.status,
        now,
        now
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            SafetyHazard {
                id: row.id,
                hazard_no: row.hazard_no,
                name: row.name,
                category: row.category,
                level: row.level,
                description: row.description,
                location: row.location,
                risk_assessment: row.risk_assessment,
                control_measures: serde_json::from_value(row.control_measures).unwrap_or_default(),
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Hazard created successfully".to_string(),
        )),
        Err(e) => {
            tracing::error!("Failed to create hazard: {}", e);
            Json(ApiResponse::error(500, format!("Failed to create hazard: {}", e)))
        }
    }
}

async fn get_hazard(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<SafetyHazard>> {
    match sqlx::query!(
        r#"SELECT id, hazard_no, name, category, level, description, location, 
                  risk_assessment, control_measures, status, created_by, created_at, updated_at
           FROM ehs.safety_hazards WHERE id = $1"#,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            SafetyHazard {
                id: row.id,
                hazard_no: row.hazard_no,
                name: row.name,
                category: row.category,
                level: row.level,
                description: row.description,
                location: row.location,
                risk_assessment: row.risk_assessment,
                control_measures: serde_json::from_value(row.control_measures).unwrap_or_default(),
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Hazard found".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Hazard not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to fetch hazard: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch hazard: {}", e)))
        }
    }
}

async fn update_hazard(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdateSafetyHazardRequest>,
) -> Json<ApiResponse<SafetyHazard>> {
    let now = Utc::now();
    let control_measures_json = req.control_measures.as_ref().map(|v| serde_json::to_value(v).unwrap());

    match sqlx::query!(
        r#"UPDATE ehs.safety_hazards SET
            hazard_no = COALESCE($1, hazard_no),
            name = COALESCE($2, name),
            category = COALESCE($3, category),
            level = COALESCE($4, level),
            description = COALESCE($5, description),
            location = COALESCE($6, location),
            risk_assessment = COALESCE($7, risk_assessment),
            control_measures = COALESCE($8, control_measures),
            status = COALESCE($9, status),
            updated_at = $10
        WHERE id = $11
        RETURNING id, hazard_no, name, category, level, description, location, 
                  risk_assessment, control_measures, status, created_by, created_at, updated_at"#,
        req.hazard_no,
        req.name,
        req.category,
        req.level,
        req.description,
        req.location,
        req.risk_assessment,
        control_measures_json,
        req.status,
        now,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            SafetyHazard {
                id: row.id,
                hazard_no: row.hazard_no,
                name: row.name,
                category: row.category,
                level: row.level,
                description: row.description,
                location: row.location,
                risk_assessment: row.risk_assessment,
                control_measures: serde_json::from_value(row.control_measures).unwrap_or_default(),
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Hazard updated successfully".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Hazard not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to update hazard: {}", e);
            Json(ApiResponse::error(500, format!("Failed to update hazard: {}", e)))
        }
    }
}

async fn delete_hazard(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query!("DELETE FROM ehs.safety_hazards WHERE id = $1", id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Hazard deleted successfully".to_string()))
            } else {
                Json(ApiResponse::not_found("Hazard not found".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete hazard: {}", e);
            Json(ApiResponse::error(500, format!("Failed to delete hazard: {}", e)))
        }
    }
}

async fn list_checks(State(state): State<AppState>) -> Json<ApiResponse<Vec<SafetyCheck>>> {
    match sqlx::query!(
        r#"SELECT id, check_no, check_type, inspector, check_date, location, 
                  result, issues, attachments, status, created_by, created_at, updated_at
           FROM ehs.safety_checks ORDER BY created_at DESC"#
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let checks: Vec<SafetyCheck> = rows
                .into_iter()
                .map(|row| SafetyCheck {
                    id: row.id,
                    check_no: row.check_no,
                    check_type: row.check_type,
                    inspector: row.inspector,
                    check_date: row.check_date,
                    location: row.location,
                    result: row.result,
                    issues: serde_json::from_value(row.issues).unwrap_or_default(),
                    attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                    status: row.status,
                    created_by: row.created_by,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                })
                .collect();
            Json(ApiResponse::success(checks, "Checks retrieved successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to fetch checks: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch checks: {}", e)))
        }
    }
}

async fn create_check(
    State(state): State<AppState>,
    Json(req): Json<CreateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let issues_json = serde_json::to_value(&req.issues).unwrap();
    let attachments_json = serde_json::to_value(&req.attachments).unwrap();

    match sqlx::query!(
        r#"INSERT INTO ehs.safety_checks (
            id, check_no, check_type, inspector, check_date, location, 
            result, issues, attachments, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, check_no, check_type, inspector, check_date, location, 
                  result, issues, attachments, status, created_by, created_at, updated_at"#,
        id,
        req.check_no,
        req.check_type,
        req.inspector,
        now,
        req.location,
        req.result,
        issues_json,
        attachments_json,
        req.status,
        now,
        now
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            SafetyCheck {
                id: row.id,
                check_no: row.check_no,
                check_type: row.check_type,
                inspector: row.inspector,
                check_date: row.check_date,
                location: row.location,
                result: row.result,
                issues: serde_json::from_value(row.issues).unwrap_or_default(),
                attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Check created successfully".to_string(),
        )),
        Err(e) => {
            tracing::error!("Failed to create check: {}", e);
            Json(ApiResponse::error(500, format!("Failed to create check: {}", e)))
        }
    }
}

async fn get_check(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<SafetyCheck>> {
    match sqlx::query!(
        r#"SELECT id, check_no, check_type, inspector, check_date, location, 
                  result, issues, attachments, status, created_by, created_at, updated_at
           FROM ehs.safety_checks WHERE id = $1"#,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            SafetyCheck {
                id: row.id,
                check_no: row.check_no,
                check_type: row.check_type,
                inspector: row.inspector,
                check_date: row.check_date,
                location: row.location,
                result: row.result,
                issues: serde_json::from_value(row.issues).unwrap_or_default(),
                attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Check found".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Check not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to fetch check: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch check: {}", e)))
        }
    }
}

async fn update_check(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdateSafetyCheckRequest>,
) -> Json<ApiResponse<SafetyCheck>> {
    let now = Utc::now();
    let issues_json = req.issues.as_ref().map(|v| serde_json::to_value(v).unwrap());
    let attachments_json = req.attachments.as_ref().map(|v| serde_json::to_value(v).unwrap());

    match sqlx::query!(
        r#"UPDATE ehs.safety_checks SET
            check_no = COALESCE($1, check_no),
            check_type = COALESCE($2, check_type),
            inspector = COALESCE($3, inspector),
            location = COALESCE($4, location),
            result = COALESCE($5, result),
            issues = COALESCE($6, issues),
            attachments = COALESCE($7, attachments),
            status = COALESCE($8, status),
            updated_at = $9
        WHERE id = $10
        RETURNING id, check_no, check_type, inspector, check_date, location, 
                  result, issues, attachments, status, created_by, created_at, updated_at"#,
        req.check_no,
        req.check_type,
        req.inspector,
        req.location,
        req.result,
        issues_json,
        attachments_json,
        req.status,
        now,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            SafetyCheck {
                id: row.id,
                check_no: row.check_no,
                check_type: row.check_type,
                inspector: row.inspector,
                check_date: row.check_date,
                location: row.location,
                result: row.result,
                issues: serde_json::from_value(row.issues).unwrap_or_default(),
                attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Check updated successfully".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Check not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to update check: {}", e);
            Json(ApiResponse::error(500, format!("Failed to update check: {}", e)))
        }
    }
}

async fn delete_check(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query!("DELETE FROM ehs.safety_checks WHERE id = $1", id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Check deleted successfully".to_string()))
            } else {
                Json(ApiResponse::not_found("Check not found".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete check: {}", e);
            Json(ApiResponse::error(500, format!("Failed to delete check: {}", e)))
        }
    }
}

async fn list_plans(State(state): State<AppState>) -> Json<ApiResponse<Vec<EmergencyPlan>>> {
    match sqlx::query!(
        r#"SELECT id, plan_no, name, plan_type, scope, trigger_conditions, 
                  response_procedures, responsible_persons, contact_info, status, 
                  created_by, created_at, updated_at
           FROM ehs.emergency_plans ORDER BY created_at DESC"#
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let plans: Vec<EmergencyPlan> = rows
                .into_iter()
                .map(|row| EmergencyPlan {
                    id: row.id,
                    plan_no: row.plan_no,
                    name: row.name,
                    plan_type: row.plan_type,
                    scope: row.scope,
                    trigger_conditions: row.trigger_conditions,
                    response_procedures: row.response_procedures,
                    responsible_persons: serde_json::from_value(row.responsible_persons).unwrap_or_default(),
                    contact_info: row.contact_info,
                    status: row.status,
                    created_by: row.created_by,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                })
                .collect();
            Json(ApiResponse::success(plans, "Plans retrieved successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to fetch plans: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch plans: {}", e)))
        }
    }
}

async fn create_plan(
    State(state): State<AppState>,
    Json(req): Json<CreateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let responsible_persons_json = serde_json::to_value(&req.responsible_persons).unwrap();

    match sqlx::query!(
        r#"INSERT INTO ehs.emergency_plans (
            id, plan_no, name, plan_type, scope, trigger_conditions, 
            response_procedures, responsible_persons, contact_info, status, 
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, plan_no, name, plan_type, scope, trigger_conditions, 
                  response_procedures, responsible_persons, contact_info, status, 
                  created_by, created_at, updated_at"#,
        id,
        req.plan_no,
        req.name,
        req.plan_type,
        req.scope,
        req.trigger_conditions,
        req.response_procedures,
        responsible_persons_json,
        req.contact_info,
        req.status,
        now,
        now
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            EmergencyPlan {
                id: row.id,
                plan_no: row.plan_no,
                name: row.name,
                plan_type: row.plan_type,
                scope: row.scope,
                trigger_conditions: row.trigger_conditions,
                response_procedures: row.response_procedures,
                responsible_persons: serde_json::from_value(row.responsible_persons).unwrap_or_default(),
                contact_info: row.contact_info,
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Plan created successfully".to_string(),
        )),
        Err(e) => {
            tracing::error!("Failed to create plan: {}", e);
            Json(ApiResponse::error(500, format!("Failed to create plan: {}", e)))
        }
    }
}

async fn get_plan(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<EmergencyPlan>> {
    match sqlx::query!(
        r#"SELECT id, plan_no, name, plan_type, scope, trigger_conditions, 
                  response_procedures, responsible_persons, contact_info, status, 
                  created_by, created_at, updated_at
           FROM ehs.emergency_plans WHERE id = $1"#,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            EmergencyPlan {
                id: row.id,
                plan_no: row.plan_no,
                name: row.name,
                plan_type: row.plan_type,
                scope: row.scope,
                trigger_conditions: row.trigger_conditions,
                response_procedures: row.response_procedures,
                responsible_persons: serde_json::from_value(row.responsible_persons).unwrap_or_default(),
                contact_info: row.contact_info,
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Plan found".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Plan not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to fetch plan: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch plan: {}", e)))
        }
    }
}

async fn update_plan(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdateEmergencyPlanRequest>,
) -> Json<ApiResponse<EmergencyPlan>> {
    let now = Utc::now();
    let responsible_persons_json = req.responsible_persons.as_ref().map(|v| serde_json::to_value(v).unwrap());

    match sqlx::query!(
        r#"UPDATE ehs.emergency_plans SET
            plan_no = COALESCE($1, plan_no),
            name = COALESCE($2, name),
            plan_type = COALESCE($3, plan_type),
            scope = COALESCE($4, scope),
            trigger_conditions = COALESCE($5, trigger_conditions),
            response_procedures = COALESCE($6, response_procedures),
            responsible_persons = COALESCE($7, responsible_persons),
            contact_info = COALESCE($8, contact_info),
            status = COALESCE($9, status),
            updated_at = $10
        WHERE id = $11
        RETURNING id, plan_no, name, plan_type, scope, trigger_conditions, 
                  response_procedures, responsible_persons, contact_info, status, 
                  created_by, created_at, updated_at"#,
        req.plan_no,
        req.name,
        req.plan_type,
        req.scope,
        req.trigger_conditions,
        req.response_procedures,
        responsible_persons_json,
        req.contact_info,
        req.status,
        now,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            EmergencyPlan {
                id: row.id,
                plan_no: row.plan_no,
                name: row.name,
                plan_type: row.plan_type,
                scope: row.scope,
                trigger_conditions: row.trigger_conditions,
                response_procedures: row.response_procedures,
                responsible_persons: serde_json::from_value(row.responsible_persons).unwrap_or_default(),
                contact_info: row.contact_info,
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            "Plan updated successfully".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Plan not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to update plan: {}", e);
            Json(ApiResponse::error(500, format!("Failed to update plan: {}", e)))
        }
    }
}

async fn delete_plan(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query!("DELETE FROM ehs.emergency_plans WHERE id = $1", id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Plan deleted successfully".to_string()))
            } else {
                Json(ApiResponse::not_found("Plan not found".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete plan: {}", e);
            Json(ApiResponse::error(500, format!("Failed to delete plan: {}", e)))
        }
    }
}

async fn list_drills(State(state): State<AppState>) -> Json<ApiResponse<Vec<DrillRecord>>> {
    match sqlx::query!(
        r#"SELECT id, plan_id, drill_name, drill_date, participants, duration, 
                  location, summary, issues_found, improvements, attachments, 
                  created_by, created_at
           FROM ehs.drill_records ORDER BY created_at DESC"#
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let drills: Vec<DrillRecord> = rows
                .into_iter()
                .map(|row| DrillRecord {
                    id: row.id,
                    plan_id: row.plan_id,
                    drill_name: row.drill_name,
                    drill_date: row.drill_date,
                    participants: serde_json::from_value(row.participants).unwrap_or_default(),
                    duration: row.duration,
                    location: row.location,
                    summary: row.summary,
                    issues_found: row.issues_found,
                    improvements: row.improvements,
                    attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                    created_by: row.created_by,
                    created_at: row.created_at,
                })
                .collect();
            Json(ApiResponse::success(drills, "Drills retrieved successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to fetch drills: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch drills: {}", e)))
        }
    }
}

async fn create_drill(
    State(state): State<AppState>,
    Json(req): Json<CreateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let plan_uuid = req.plan_id.and_then(|s| Uuid::parse_str(&s).ok());
    let participants_json = serde_json::to_value(&req.participants).unwrap();
    let attachments_json = serde_json::to_value(&req.attachments).unwrap();

    match sqlx::query!(
        r#"INSERT INTO ehs.drill_records (
            id, plan_id, drill_name, drill_date, participants, duration, 
            location, summary, issues_found, improvements, attachments, 
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, plan_id, drill_name, drill_date, participants, duration, 
                  location, summary, issues_found, improvements, attachments, 
                  created_by, created_at"#,
        id,
        plan_uuid,
        req.drill_name,
        now,
        participants_json,
        req.duration,
        req.location,
        req.summary,
        req.issues_found,
        req.improvements,
        attachments_json,
        now
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            DrillRecord {
                id: row.id,
                plan_id: row.plan_id,
                drill_name: row.drill_name,
                drill_date: row.drill_date,
                participants: serde_json::from_value(row.participants).unwrap_or_default(),
                duration: row.duration,
                location: row.location,
                summary: row.summary,
                issues_found: row.issues_found,
                improvements: row.improvements,
                attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                created_by: row.created_by,
                created_at: row.created_at,
            },
            "Drill created successfully".to_string(),
        )),
        Err(e) => {
            tracing::error!("Failed to create drill: {}", e);
            Json(ApiResponse::error(500, format!("Failed to create drill: {}", e)))
        }
    }
}

async fn get_drill(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<DrillRecord>> {
    match sqlx::query!(
        r#"SELECT id, plan_id, drill_name, drill_date, participants, duration, 
                  location, summary, issues_found, improvements, attachments, 
                  created_by, created_at
           FROM ehs.drill_records WHERE id = $1"#,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            DrillRecord {
                id: row.id,
                plan_id: row.plan_id,
                drill_name: row.drill_name,
                drill_date: row.drill_date,
                participants: serde_json::from_value(row.participants).unwrap_or_default(),
                duration: row.duration,
                location: row.location,
                summary: row.summary,
                issues_found: row.issues_found,
                improvements: row.improvements,
                attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                created_by: row.created_by,
                created_at: row.created_at,
            },
            "Drill found".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Drill not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to fetch drill: {}", e);
            Json(ApiResponse::error(500, format!("Failed to fetch drill: {}", e)))
        }
    }
}

async fn update_drill(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let plan_uuid = req.plan_id.and_then(|s| Uuid::parse_str(&s).ok());
    let participants_json = req.participants.as_ref().map(|v| serde_json::to_value(v).unwrap());
    let attachments_json = req.attachments.as_ref().map(|v| serde_json::to_value(v).unwrap());

    match sqlx::query!(
        r#"UPDATE ehs.drill_records SET
            plan_id = COALESCE($1, plan_id),
            drill_name = COALESCE($2, drill_name),
            participants = COALESCE($3, participants),
            duration = COALESCE($4, duration),
            location = COALESCE($5, location),
            summary = COALESCE($6, summary),
            issues_found = COALESCE($7, issues_found),
            improvements = COALESCE($8, improvements),
            attachments = COALESCE($9, attachments)
        WHERE id = $10
        RETURNING id, plan_id, drill_name, drill_date, participants, duration, 
                  location, summary, issues_found, improvements, attachments, 
                  created_by, created_at"#,
        plan_uuid,
        req.drill_name,
        participants_json,
        req.duration,
        req.location,
        req.summary,
        req.issues_found,
        req.improvements,
        attachments_json,
        id
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(
            DrillRecord {
                id: row.id,
                plan_id: row.plan_id,
                drill_name: row.drill_name,
                drill_date: row.drill_date,
                participants: serde_json::from_value(row.participants).unwrap_or_default(),
                duration: row.duration,
                location: row.location,
                summary: row.summary,
                issues_found: row.issues_found,
                improvements: row.improvements,
                attachments: serde_json::from_value(row.attachments).unwrap_or_default(),
                created_by: row.created_by,
                created_at: row.created_at,
            },
            "Drill updated successfully".to_string(),
        )),
        Err(SqlxError::RowNotFound) => Json(ApiResponse::not_found("Drill not found".to_string())),
        Err(e) => {
            tracing::error!("Failed to update drill: {}", e);
            Json(ApiResponse::error(500, format!("Failed to update drill: {}", e)))
        }
    }
}

async fn delete_drill(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query!("DELETE FROM ehs.drill_records WHERE id = $1", id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Drill deleted successfully".to_string()))
            } else {
                Json(ApiResponse::not_found("Drill not found".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete drill: {}", e);
            Json(ApiResponse::error(500, format!("Failed to delete drill: {}", e)))
        }
    }
}