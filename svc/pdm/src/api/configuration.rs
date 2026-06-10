use axum::{
    extract::{State, FromRef},
    routing::{post},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use serde::{Serialize, Deserialize};

use crate::models::{Configuration, CreateConfigurationRequest, CompareConfigurationRequest};
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigurationDiff {
    pub config_key: String,
    pub base_value: Option<String>,
    pub target_value: Option<String>,
    pub diff_type: String,
}

#[derive(Clone)]
pub struct ConfigurationApiState {
    pool: PgPool,
}

impl FromRef<ConfigurationApiState> for PgPool {
    fn from_ref(state: &ConfigurationApiState) -> Self {
        state.pool.clone()
    }
}

pub fn create_router(pool: PgPool) -> Router {
    let state = ConfigurationApiState { pool };
    Router::new()
        .route("/api/v1/configurations/create", post(create_configuration))
        .route("/api/v1/configurations/compare", post(compare_configurations))
        .with_state(state)
}

async fn create_configuration(
    State(state): State<ConfigurationApiState>,
    Json(req): Json<CreateConfigurationRequest>,
) -> Json<ApiResponse<Configuration>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let product_uuid = req.product_id.and_then(|pid| Uuid::parse_str(&pid).ok());
    let version_uuid = req.version_id.and_then(|vid| Uuid::parse_str(&vid).ok());

    match sqlx::query_as::<_, Configuration>(
        "INSERT INTO configurations (
            id, config_key, config_value, description, product_id, version_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *"
    )
    .bind(id)
    .bind(req.config_key)
    .bind(req.config_value)
    .bind(req.description)
    .bind(product_uuid)
    .bind(version_uuid)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(config) => Json(ApiResponse::success(config, "Configuration created successfully")),
        Err(e) => {
            tracing::error!("Failed to create configuration: {}", e);
            Json(ApiResponse::<Configuration>::error(500, &format!("Failed to create configuration: {}", e)))
        }
    }
}

async fn compare_configurations(
    State(state): State<ConfigurationApiState>,
    Json(req): Json<CompareConfigurationRequest>,
) -> Json<ApiResponse<Vec<ConfigurationDiff>>> {
    let base_version_uuid = match Uuid::parse_str(&req.base_version_id) {
        Ok(u) => u,
        Err(e) => return Json(ApiResponse::<Vec<ConfigurationDiff>>::error(400, &format!("Invalid base version ID: {}", e))),
    };
    
    let target_version_uuid = match Uuid::parse_str(&req.target_version_id) {
        Ok(u) => u,
        Err(e) => return Json(ApiResponse::<Vec<ConfigurationDiff>>::error(400, &format!("Invalid target version ID: {}", e))),
    };

    let base_configs = match sqlx::query_as::<_, Configuration>(
        "SELECT * FROM configurations WHERE version_id = $1"
    )
    .bind(base_version_uuid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(configs) => configs,
        Err(e) => {
            tracing::error!("Failed to fetch base configurations: {}", e);
            return Json(ApiResponse::<Vec<ConfigurationDiff>>::error(500, &format!("Failed to fetch base configurations: {}", e)));
        }
    };

    let target_configs = match sqlx::query_as::<_, Configuration>(
        "SELECT * FROM configurations WHERE version_id = $1"
    )
    .bind(target_version_uuid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(configs) => configs,
        Err(e) => {
            tracing::error!("Failed to fetch target configurations: {}", e);
            return Json(ApiResponse::<Vec<ConfigurationDiff>>::error(500, &format!("Failed to fetch target configurations: {}", e)));
        }
    };

    let mut base_map: std::collections::HashMap<String, String> = base_configs
        .into_iter()
        .map(|c| (c.config_key, c.config_value))
        .collect();

    let mut target_map: std::collections::HashMap<String, String> = target_configs
        .into_iter()
        .map(|c| (c.config_key, c.config_value))
        .collect();

    let mut all_keys: std::collections::HashSet<String> = base_map.keys().cloned().collect();
    all_keys.extend(target_map.keys().cloned());

    let mut diffs: Vec<ConfigurationDiff> = Vec::new();

    for key in all_keys {
        let base_value = base_map.remove(&key);
        let target_value = target_map.remove(&key);
        
        let diff_type = match (base_value.is_some(), target_value.is_some()) {
            (false, true) => "added",
            (true, false) => "removed",
            (true, true) if base_value != target_value => "modified",
            _ => "unchanged",
        };

        diffs.push(ConfigurationDiff {
            config_key: key,
            base_value,
            target_value,
            diff_type: diff_type.to_string(),
        });
    }

    diffs.sort_by(|a, b| a.config_key.cmp(&b.config_key));

    Json(ApiResponse::success(diffs, "Configuration comparison completed successfully"))
}