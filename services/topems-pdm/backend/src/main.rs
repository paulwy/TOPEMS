use axum::{
    extract::{Path, State, FromRef},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use chrono::{Utc, DateTime};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use sqlx::{postgres::PgPoolOptions, PgPool};
use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionProcess {
    pub id: Uuid,
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionProcessRequest {
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductionProcessRequest {
    pub process_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionStep {
    pub id: Uuid,
    pub process_id: Uuid,
    pub step_no: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(alias = "duration_hours")]
    pub duration: Option<i64>,
    pub equipment_required: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionStepRequest {
    pub process_id: String,
    pub step_no: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(alias = "duration_hours")]
    pub duration: Option<i64>,
    pub equipment_required: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductionStepRequest {
    pub step_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    #[serde(alias = "duration_hours")]
    pub duration: Option<i64>,
    pub equipment_required: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionFormula {
    pub id: Uuid,
    pub formula_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub process_id: Option<Uuid>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionFormulaRequest {
    pub formula_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub process_id: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductionFormulaRequest {
    pub formula_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub process_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FormulaIngredient {
    pub id: Uuid,
    pub formula_id: Uuid,
    pub material_name: String,
    pub quantity: f64,
    pub unit: String,
    pub percentage: Option<f64>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaIngredientRequest {
    pub formula_id: String,
    pub material_name: String,
    pub quantity: f64,
    pub unit: String,
    pub percentage: Option<f64>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionBatch {
    pub id: Uuid,
    pub batch_no: String,
    pub product_name: String,
    pub formula_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub planned_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    pub unit: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub operator: Option<String>,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionBatchRequest {
    pub batch_no: String,
    pub product_name: String,
    pub formula_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
    pub operator: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductionBatchRequest {
    pub batch_no: Option<String>,
    pub product_name: Option<String>,
    pub formula_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    pub unit: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub operator: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionStatistics {
    pub id: Uuid,
    pub batch_id: Option<Uuid>,
    pub stat_date: DateTime<Utc>,
    pub output_quantity: Option<f64>,
    pub reject_quantity: Option<f64>,
    pub pass_rate: Option<f64>,
    #[serde(alias = "cycle_time_hours")]
    pub cycle_time: Option<i64>,
    pub energy_consumption: Option<f64>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionStatisticsRequest {
    pub batch_id: Option<String>,
    pub stat_date: String,
    pub output_quantity: Option<f64>,
    pub reject_quantity: Option<f64>,
    pub pass_rate: Option<f64>,
    #[serde(alias = "cycle_time_hours")]
    pub cycle_time: Option<i64>,
    pub energy_consumption: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_pdm=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-PDM Production Data Management System starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ Connected to PostgreSQL database");
            if let Err(e) = init_database(&pool).await {
                tracing::warn!("⚠️ Database initialization skipped: {}", e);
            }
            pool
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to PostgreSQL: {}", e);
            panic!("Failed to connect to database");
        }
    };

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });
    
    let refresh_secret = std::env::var("REFRESH_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("REFRESH_SECRET not set, using default (not recommended for production)");
            "topems-default-refresh-secret-change-me-in-production".to_string()
        });
    
    let token_expiry_hours = std::env::var("TOKEN_EXPIRY_HOURS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(24);

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::new(jwt_secret, refresh_secret, token_expiry_hours),
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/production-processes", get(list_processes))
        .route("/api/v1/production-processes", post(create_process))
        .route("/api/v1/production-processes/{id}", get(get_process))
        .route("/api/v1/production-processes/{id}", put(update_process))
        .route("/api/v1/production-processes/{id}", delete(delete_process))
        .route("/api/v1/production-steps", get(list_steps))
        .route("/api/v1/production-steps", post(create_step))
        .route("/api/v1/production-steps/{id}", get(get_step))
        .route("/api/v1/production-steps/{id}", put(update_step))
        .route("/api/v1/production-steps/{id}", delete(delete_step))
        .route("/api/v1/production-formulas", get(list_formulas))
        .route("/api/v1/production-formulas", post(create_formula))
        .route("/api/v1/production-formulas/{id}", get(get_formula))
        .route("/api/v1/production-formulas/{id}", put(update_formula))
        .route("/api/v1/production-formulas/{id}", delete(delete_formula))
        .route("/api/v1/formula-ingredients", post(create_ingredient))
        .route("/api/v1/formula-ingredients/{id}", delete(delete_ingredient))
        .route("/api/v1/production-batches", get(list_batches))
        .route("/api/v1/production-batches", post(create_batch))
        .route("/api/v1/production-batches/{id}", get(get_batch))
        .route("/api/v1/production-batches/{id}", put(update_batch))
        .route("/api/v1/production-batches/{id}", delete(delete_batch))
        .route("/api/v1/production-statistics", get(list_statistics))
        .route("/api/v1/production-statistics", post(create_statistics))
        .layer(cors)
        .with_state(app_state);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8010".to_string())
        .parse()
        .unwrap_or(8010);
    let addr = format!("0.0.0.0:{}", port);
    tracing::info!("✅ TOPEMS-PDM service is running at http://{}", addr);
    tracing::info!("🔒 Authentication protection enabled");

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS production_processes (
            id UUID PRIMARY KEY,
            process_no VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            version VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS production_steps (
            id UUID PRIMARY KEY,
            process_id UUID NOT NULL,
            step_no VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            duration BIGINT,
            equipment_required TEXT,
            sort_order INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS production_formulas (
            id UUID PRIMARY KEY,
            formula_no VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            version VARCHAR(50) NOT NULL,
            process_id UUID,
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS formula_ingredients (
            id UUID PRIMARY KEY,
            formula_id UUID NOT NULL,
            material_name VARCHAR(255) NOT NULL,
            quantity NUMERIC NOT NULL,
            unit VARCHAR(50) NOT NULL,
            percentage NUMERIC,
            sort_order INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS production_batches (
            id UUID PRIMARY KEY,
            batch_no VARCHAR(100) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            formula_id UUID,
            process_id UUID,
            planned_quantity NUMERIC,
            actual_quantity NUMERIC,
            unit VARCHAR(50),
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT 'planning',
            operator VARCHAR(255),
            remarks TEXT,
            created_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS production_statistics (
            id UUID PRIMARY KEY,
            batch_id UUID,
            stat_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            output_quantity NUMERIC,
            reject_quantity NUMERIC,
            pass_rate NUMERIC,
            cycle_time BIGINT,
            energy_consumption NUMERIC,
            remarks TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS-PDM Production Data Management System API\n\nCheck out the API at /health"
}

async fn health(State(_state): State<AppState>) -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "TOPEMS-PDM is running!".to_string(),
        "OK",
    ))
}

async fn list_processes(State(state): State<AppState>) -> Json<ApiResponse<Vec<ProductionProcess>>> {
    match sqlx::query_as::<_, ProductionProcess>(
        "SELECT * FROM production_processes ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(processes) => Json(ApiResponse::success(processes, "Processes retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch processes: {}", e);
            Json(ApiResponse::<Vec<ProductionProcess>>::error(500, &format!("Failed to fetch processes: {}", e)))
        }
    }
}

async fn create_process(
    State(state): State<AppState>,
    Json(req): Json<CreateProductionProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    match sqlx::query_as::<_, ProductionProcess>(
        "INSERT INTO production_processes (
            id, process_no, name, description, version, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *"
    )
    .bind(id)
    .bind(req.process_no)
    .bind(req.name)
    .bind(req.description)
    .bind(req.version)
    .bind(req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(process) => Json(ApiResponse::success(process, "Process created successfully")),
        Err(e) => {
            tracing::error!("Failed to create process: {}", e);
            Json(ApiResponse::<ProductionProcess>::error(500, &format!("Failed to create process: {}", e)))
        }
    }
}

async fn get_process(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionProcess>> {
    match sqlx::query_as::<_, ProductionProcess>(
        "SELECT * FROM production_processes WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(process) => Json(ApiResponse::success(process, "Process found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionProcess>::error(404, "Process not found")),
        Err(e) => {
            tracing::error!("Failed to fetch process: {}", e);
            Json(ApiResponse::<ProductionProcess>::error(500, &format!("Failed to fetch process: {}", e)))
        }
    }
}

async fn update_process(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let now = Utc::now();
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE production_processes SET ");
    let mut first = true;

    if let Some(v) = req.process_no {
        if !first { query_builder.push(", "); }
        query_builder.push("process_no = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.name {
        if !first { query_builder.push(", "); }
        query_builder.push("name = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.description {
        if !first { query_builder.push(", "); }
        query_builder.push("description = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.version {
        if !first { query_builder.push(", "); }
        query_builder.push("version = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.status {
        if !first { query_builder.push(", "); }
        query_builder.push("status = ").push_bind(v);
        first = false;
    }

    if first {
        // No fields to update
        return get_process(State(state), Path(id)).await;
    }

    if !first { query_builder.push(", "); }
    query_builder.push("updated_at = ").push_bind(now);
    query_builder.push(" WHERE id = ").push_bind(id);
    query_builder.push(" RETURNING *");

    match query_builder.build_query_as::<ProductionProcess>().fetch_one(&state.pool).await {
        Ok(process) => Json(ApiResponse::success(process, "Process updated successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionProcess>::error(404, "Process not found")),
        Err(e) => {
            tracing::error!("Failed to update process: {}", e);
            Json(ApiResponse::<ProductionProcess>::error(500, &format!("Failed to update process: {}", e)))
        }
    }
}

async fn delete_process(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM production_processes WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Process deleted successfully"))
            } else {
                Json(ApiResponse::<bool>::error(404, "Process not found"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete process: {}", e);
            Json(ApiResponse::<bool>::error(500, &format!("Failed to delete process: {}", e)))
        }
    }
}

async fn list_steps(State(state): State<AppState>) -> Json<ApiResponse<Vec<ProductionStep>>> {
    match sqlx::query_as::<_, ProductionStep>(
        "SELECT * FROM production_steps ORDER BY process_id, sort_order LIMIT 100"
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(steps) => Json(ApiResponse::success(steps, "Steps retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch steps: {}", e);
            Json(ApiResponse::<Vec<ProductionStep>>::error(500, &format!("Failed to fetch steps: {}", e)))
        }
    }
}

async fn create_step(
    State(state): State<AppState>,
    Json(req): Json<CreateProductionStepRequest>,
) -> Json<ApiResponse<ProductionStep>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let process_uuid = match Uuid::parse_str(&req.process_id) {
        Ok(u) => u,
        Err(e) => return Json(ApiResponse::<ProductionStep>::error(400, &format!("Invalid process ID: {}", e))),
    };

    match sqlx::query_as::<_, ProductionStep>(
        "INSERT INTO production_steps (
            id, process_id, step_no, name, description, duration, equipment_required, sort_order, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *"
    )
    .bind(id)
    .bind(process_uuid)
    .bind(req.step_no)
    .bind(req.name)
    .bind(req.description)
    .bind(req.duration)
    .bind(req.equipment_required)
    .bind(req.sort_order)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(step) => Json(ApiResponse::success(step, "Step created successfully")),
        Err(e) => {
            tracing::error!("Failed to create step: {}", e);
            Json(ApiResponse::<ProductionStep>::error(500, &format!("Failed to create step: {}", e)))
        }
    }
}

async fn get_step(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionStep>> {
    match sqlx::query_as::<_, ProductionStep>(
        "SELECT * FROM production_steps WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(step) => Json(ApiResponse::success(step, "Step found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionStep>::error(404, "Step not found")),
        Err(e) => {
            tracing::error!("Failed to fetch step: {}", e);
            Json(ApiResponse::<ProductionStep>::error(500, &format!("Failed to fetch step: {}", e)))
        }
    }
}

async fn update_step(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionStepRequest>,
) -> Json<ApiResponse<ProductionStep>> {
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE production_steps SET ");
    let mut first = true;

    if let Some(v) = req.step_no {
        if !first { query_builder.push(", "); }
        query_builder.push("step_no = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.name {
        if !first { query_builder.push(", "); }
        query_builder.push("name = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.description {
        if !first { query_builder.push(", "); }
        query_builder.push("description = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.duration {
        if !first { query_builder.push(", "); }
        query_builder.push("duration = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.equipment_required {
        if !first { query_builder.push(", "); }
        query_builder.push("equipment_required = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.sort_order {
        if !first { query_builder.push(", "); }
        query_builder.push("sort_order = ").push_bind(v);
        first = false;
    }

    if first {
        return get_step(State(state), Path(id)).await;
    }

    query_builder.push(" WHERE id = ").push_bind(id);
    query_builder.push(" RETURNING *");

    match query_builder.build_query_as::<ProductionStep>().fetch_one(&state.pool).await {
        Ok(step) => Json(ApiResponse::success(step, "Step updated successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionStep>::error(404, "Step not found")),
        Err(e) => {
            tracing::error!("Failed to update step: {}", e);
            Json(ApiResponse::<ProductionStep>::error(500, &format!("Failed to update step: {}", e)))
        }
    }
}

async fn delete_step(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM production_steps WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Step deleted successfully"))
            } else {
                Json(ApiResponse::<bool>::error(404, "Step not found"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete step: {}", e);
            Json(ApiResponse::<bool>::error(500, &format!("Failed to delete step: {}", e)))
        }
    }
}

async fn list_formulas(State(state): State<AppState>) -> Json<ApiResponse<Vec<ProductionFormula>>> {
    match sqlx::query_as::<_, ProductionFormula>(
        "SELECT * FROM production_formulas ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(formulas) => Json(ApiResponse::success(formulas, "Formulas retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch formulas: {}", e);
            Json(ApiResponse::<Vec<ProductionFormula>>::error(500, &format!("Failed to fetch formulas: {}", e)))
        }
    }
}

async fn create_formula(
    State(state): State<AppState>,
    Json(req): Json<CreateProductionFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let process_uuid = req.process_id.and_then(|pid| Uuid::parse_str(&pid).ok());

    match sqlx::query_as::<_, ProductionFormula>(
        "INSERT INTO production_formulas (
            id, formula_no, name, description, version, process_id, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *"
    )
    .bind(id)
    .bind(req.formula_no)
    .bind(req.name)
    .bind(req.description)
    .bind(req.version)
    .bind(process_uuid)
    .bind(req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(formula) => Json(ApiResponse::success(formula, "Formula created successfully")),
        Err(e) => {
            tracing::error!("Failed to create formula: {}", e);
            Json(ApiResponse::<ProductionFormula>::error(500, &format!("Failed to create formula: {}", e)))
        }
    }
}

async fn get_formula(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionFormula>> {
    match sqlx::query_as::<_, ProductionFormula>(
        "SELECT * FROM production_formulas WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(formula) => Json(ApiResponse::success(formula, "Formula found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionFormula>::error(404, "Formula not found")),
        Err(e) => {
            tracing::error!("Failed to fetch formula: {}", e);
            Json(ApiResponse::<ProductionFormula>::error(500, &format!("Failed to fetch formula: {}", e)))
        }
    }
}

async fn update_formula(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
    let now = Utc::now();
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE production_formulas SET ");
    let mut first = true;

    if let Some(v) = req.formula_no {
        if !first { query_builder.push(", "); }
        query_builder.push("formula_no = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.name {
        if !first { query_builder.push(", "); }
        query_builder.push("name = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.description {
        if !first { query_builder.push(", "); }
        query_builder.push("description = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.version {
        if !first { query_builder.push(", "); }
        query_builder.push("version = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.process_id {
        if !first { query_builder.push(", "); }
        let uuid = Uuid::parse_str(&v).ok();
        query_builder.push("process_id = ").push_bind(uuid);
        first = false;
    }
    if let Some(v) = req.status {
        if !first { query_builder.push(", "); }
        query_builder.push("status = ").push_bind(v);
        first = false;
    }

    if first {
        // No fields to update
        return get_formula(State(state), Path(id)).await;
    }

    if !first { query_builder.push(", "); }
    query_builder.push("updated_at = ").push_bind(now);
    query_builder.push(" WHERE id = ").push_bind(id);
    query_builder.push(" RETURNING *");

    match query_builder.build_query_as::<ProductionFormula>().fetch_one(&state.pool).await {
        Ok(formula) => Json(ApiResponse::success(formula, "Formula updated successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionFormula>::error(404, "Formula not found")),
        Err(e) => {
            tracing::error!("Failed to update formula: {}", e);
            Json(ApiResponse::<ProductionFormula>::error(500, &format!("Failed to update formula: {}", e)))
        }
    }
}

async fn delete_formula(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM production_formulas WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Formula deleted successfully"))
            } else {
                Json(ApiResponse::<bool>::error(404, "Formula not found"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete formula: {}", e);
            Json(ApiResponse::<bool>::error(500, &format!("Failed to delete formula: {}", e)))
        }
    }
}

async fn create_ingredient(
    State(state): State<AppState>,
    Json(req): Json<CreateFormulaIngredientRequest>,
) -> Json<ApiResponse<FormulaIngredient>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let formula_uuid = match Uuid::parse_str(&req.formula_id) {
        Ok(u) => u,
        Err(e) => return Json(ApiResponse::<FormulaIngredient>::error(400, &format!("Invalid formula ID: {}", e))),
    };

    match sqlx::query_as::<_, FormulaIngredient>(
        "INSERT INTO formula_ingredients (
            id, formula_id, material_name, quantity, unit, percentage, sort_order, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *"
    )
    .bind(id)
    .bind(formula_uuid)
    .bind(req.material_name)
    .bind(req.quantity)
    .bind(req.unit)
    .bind(req.percentage)
    .bind(req.sort_order)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(ingredient) => Json(ApiResponse::success(ingredient, "Ingredient created successfully")),
        Err(e) => {
            tracing::error!("Failed to create ingredient: {}", e);
            Json(ApiResponse::<FormulaIngredient>::error(500, &format!("Failed to create ingredient: {}", e)))
        }
    }
}

async fn delete_ingredient(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM formula_ingredients WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Ingredient deleted successfully"))
            } else {
                Json(ApiResponse::<bool>::error(404, "Ingredient not found"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete ingredient: {}", e);
            Json(ApiResponse::<bool>::error(500, &format!("Failed to delete ingredient: {}", e)))
        }
    }
}

async fn list_batches(State(state): State<AppState>) -> Json<ApiResponse<Vec<ProductionBatch>>> {
    match sqlx::query_as::<_, ProductionBatch>(
        "SELECT * FROM production_batches ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(batches) => Json(ApiResponse::success(batches, "Batches retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch batches: {}", e);
            Json(ApiResponse::<Vec<ProductionBatch>>::error(500, &format!("Failed to fetch batches: {}", e)))
        }
    }
}

async fn create_batch(
    State(state): State<AppState>,
    Json(req): Json<CreateProductionBatchRequest>,
) -> Json<ApiResponse<ProductionBatch>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let formula_uuid = req.formula_id.and_then(|fid| Uuid::parse_str(&fid).ok());
    let process_uuid = req.process_id.and_then(|pid| Uuid::parse_str(&pid).ok());

    match sqlx::query_as::<_, ProductionBatch>(
        "INSERT INTO production_batches (
            id, batch_no, product_name, formula_id, process_id, planned_quantity, unit, status, operator, remarks, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *"
    )
    .bind(id)
    .bind(req.batch_no)
    .bind(req.product_name)
    .bind(formula_uuid)
    .bind(process_uuid)
    .bind(req.planned_quantity)
    .bind(req.unit)
    .bind(req.status)
    .bind(req.operator)
    .bind(req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(batch) => Json(ApiResponse::success(batch, "Batch created successfully")),
        Err(e) => {
            tracing::error!("Failed to create batch: {}", e);
            Json(ApiResponse::<ProductionBatch>::error(500, &format!("Failed to create batch: {}", e)))
        }
    }
}

async fn get_batch(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionBatch>> {
    match sqlx::query_as::<_, ProductionBatch>(
        "SELECT * FROM production_batches WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(batch) => Json(ApiResponse::success(batch, "Batch found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionBatch>::error(404, "Batch not found")),
        Err(e) => {
            tracing::error!("Failed to fetch batch: {}", e);
            Json(ApiResponse::<ProductionBatch>::error(500, &format!("Failed to fetch batch: {}", e)))
        }
    }
}

async fn update_batch(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionBatchRequest>,
) -> Json<ApiResponse<ProductionBatch>> {
    let now = Utc::now();
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE production_batches SET ");
    let mut first = true;

    if let Some(v) = req.batch_no {
        if !first { query_builder.push(", "); }
        query_builder.push("batch_no = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.product_name {
        if !first { query_builder.push(", "); }
        query_builder.push("product_name = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.formula_id {
        if !first { query_builder.push(", "); }
        let uuid = Uuid::parse_str(&v).ok();
        query_builder.push("formula_id = ").push_bind(uuid);
        first = false;
    }
    if let Some(v) = req.process_id {
        if !first { query_builder.push(", "); }
        let uuid = Uuid::parse_str(&v).ok();
        query_builder.push("process_id = ").push_bind(uuid);
        first = false;
    }
    if let Some(v) = req.planned_quantity {
        if !first { query_builder.push(", "); }
        query_builder.push("planned_quantity = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.actual_quantity {
        if !first { query_builder.push(", "); }
        query_builder.push("actual_quantity = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.unit {
        if !first { query_builder.push(", "); }
        query_builder.push("unit = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.start_date {
        if !first { query_builder.push(", "); }
        query_builder.push("start_date = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.end_date {
        if !first { query_builder.push(", "); }
        query_builder.push("end_date = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.status {
        if !first { query_builder.push(", "); }
        query_builder.push("status = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.operator {
        if !first { query_builder.push(", "); }
        query_builder.push("operator = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.remarks {
        if !first { query_builder.push(", "); }
        query_builder.push("remarks = ").push_bind(Some(v));
        first = false;
    }

    if first {
        // No fields to update
        return get_batch(State(state), Path(id)).await;
    }

    if !first { query_builder.push(", "); }
    query_builder.push("updated_at = ").push_bind(now);
    query_builder.push(" WHERE id = ").push_bind(id);
    query_builder.push(" RETURNING *");

    match query_builder.build_query_as::<ProductionBatch>().fetch_one(&state.pool).await {
        Ok(batch) => Json(ApiResponse::success(batch, "Batch updated successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<ProductionBatch>::error(404, "Batch not found")),
        Err(e) => {
            tracing::error!("Failed to update batch: {}", e);
            Json(ApiResponse::<ProductionBatch>::error(500, &format!("Failed to update batch: {}", e)))
        }
    }
}

async fn delete_batch(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM production_batches WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Batch deleted successfully"))
            } else {
                Json(ApiResponse::<bool>::error(404, "Batch not found"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete batch: {}", e);
            Json(ApiResponse::<bool>::error(500, &format!("Failed to delete batch: {}", e)))
        }
    }
}

async fn list_statistics(State(state): State<AppState>) -> Json<ApiResponse<Vec<ProductionStatistics>>> {
    match sqlx::query_as::<_, ProductionStatistics>(
        "SELECT * FROM production_statistics ORDER BY stat_date DESC LIMIT 100"
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(statistics) => Json(ApiResponse::success(statistics, "Statistics retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch statistics: {}", e);
            Json(ApiResponse::<Vec<ProductionStatistics>>::error(500, &format!("Failed to fetch statistics: {}", e)))
        }
    }
}

async fn create_statistics(
    State(state): State<AppState>,
    Json(req): Json<CreateProductionStatisticsRequest>,
) -> Json<ApiResponse<ProductionStatistics>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let batch_uuid = req.batch_id.and_then(|bid| Uuid::parse_str(&bid).ok());
    let stat_date = now;

    match sqlx::query_as::<_, ProductionStatistics>(
        "INSERT INTO production_statistics (
            id, batch_id, stat_date, output_quantity, reject_quantity, pass_rate, cycle_time, energy_consumption, remarks, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *"
    )
    .bind(id)
    .bind(batch_uuid)
    .bind(stat_date)
    .bind(req.output_quantity)
    .bind(req.reject_quantity)
    .bind(req.pass_rate)
    .bind(req.cycle_time)
    .bind(req.energy_consumption)
    .bind(req.remarks)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(statistic) => Json(ApiResponse::success(statistic, "Statistics created successfully")),
        Err(e) => {
            tracing::error!("Failed to create statistics: {}", e);
            Json(ApiResponse::<ProductionStatistics>::error(500, &format!("Failed to create statistics: {}", e)))
        }
    }
}
