use axum::{
    extract::{Extension, Json, Path, State},
    http::HeaderMap,
};
use sqlx::{PgPool, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::api::iam_api::IamApi;
use topems_shared_service_client::TypedServiceClient;

use crate::{models::QuickAction, shared::AppState, utils::user_context::extract_bearer_token};

const FAVORITES_KEY: &str = "quick_actions.favorites";

fn build_iam_client(
    base: &TypedServiceClient<IamApi>,
    headers: &HeaderMap,
) -> TypedServiceClient<IamApi> {
    let client = base.clone();
    if let Some(token) = extract_bearer_token(headers) {
        client.with_auth_token(token)
    } else {
        client
    }
}

async fn load_favorites(state: &AppState, headers: &HeaderMap) -> Vec<String> {
    let iam_client = build_iam_client(&state.iam_client, headers);
    match iam_client.get_user_preferences().await {
        Ok(prefs) => {
            if let Some(arr) = prefs.get(FAVORITES_KEY).and_then(|v| v.as_array()) {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            } else {
                vec![]
            }
        }
        Err(e) => {
            tracing::warn!("Failed to load favorites from IAM: {}, using empty list", e);
            vec![]
        }
    }
}

async fn save_favorites(state: &AppState, headers: &HeaderMap, favorites: &[String]) {
    let iam_client = build_iam_client(&state.iam_client, headers);

    // 先获取现有偏好
    let mut current_prefs = match iam_client.get_user_preferences().await {
        Ok(prefs) => prefs,
        Err(e) => {
            tracing::error!("Failed to get current preferences from IAM: {}", e);
            return;
        }
    };

    // 更新 favorites key
    if let Ok(fav_val) = serde_json::to_value(favorites) {
        if let Some(obj) = current_prefs.as_object_mut() {
            obj.insert(FAVORITES_KEY.to_string(), fav_val);
        } else {
            // 偏好不是 JSON 对象，创建新的
            let mut map = serde_json::Map::new();
            map.insert(FAVORITES_KEY.to_string(), fav_val);
            current_prefs = serde_json::Value::Object(map);
        }
    }

    if let Err(e) = iam_client.update_user_preferences(&current_prefs).await {
        tracing::error!("Failed to save favorites to IAM: {}", e);
    }
}

async fn load_quick_actions(
    pool: &PgPool,
    state: &AppState,
    headers: &HeaderMap,
) -> Vec<QuickAction> {
    let result = sqlx::query(
        r#"
        SELECT id, name, description, icon, action_type, target_url, service_code, sort_order
        FROM portal.portal_quick_actions
        WHERE is_active = TRUE AND deleted_at IS NULL
        ORDER BY sort_order ASC, name ASC
        "#,
    )
    .fetch_all(pool)
    .await;

    let rows = match result {
        Ok(rows) => rows,
        Err(e) => {
            tracing::warn!("Failed to load quick actions: {}, using defaults", e);
            return default_quick_actions();
        }
    };

    if rows.is_empty() {
        return default_quick_actions();
    }

    let favorites = load_favorites(state, headers).await;

    rows.into_iter()
        .map(|row| {
            let id: uuid::Uuid = row.get("id");
            let id_str = id.to_string();
            QuickAction {
                id: id_str.clone(),
                name: row.get("name"),
                description: row
                    .get::<Option<String>, _>("description")
                    .unwrap_or_default(),
                icon: row
                    .get::<Option<String>, _>("icon")
                    .unwrap_or_else(|| "Zap".to_string()),
                action_type: row.get("action_type"),
                target_url: row.get("target_url"),
                service: row
                    .get::<Option<String>, _>("service_code")
                    .unwrap_or_default(),
                is_favorite: favorites.contains(&id_str),
                usage_count: 0,
            }
        })
        .collect()
}

fn default_quick_actions() -> Vec<QuickAction> {
    vec![
        QuickAction {
            id: "1".to_string(),
            name: "新建采购单".to_string(),
            description: "快速创建采购订单".to_string(),
            icon: "ShoppingCart".to_string(),
            action_type: "navigate".to_string(),
            target_url: "/scm/purchase-orders/create".to_string(),
            service: "scm".to_string(),
            is_favorite: false,
            usage_count: 0,
        },
        QuickAction {
            id: "2".to_string(),
            name: "快速审批".to_string(),
            description: "审批待处理的流程".to_string(),
            icon: "CheckCircle".to_string(),
            action_type: "navigate".to_string(),
            target_url: "/workflow/pending".to_string(),
            service: "workflow".to_string(),
            is_favorite: false,
            usage_count: 0,
        },
    ]
}

pub async fn get_quick_actions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<QuickAction>>> {
    let actions = load_quick_actions(&state.pool, &state, &headers).await;
    Json(ApiResponse::success(actions, "快捷操作列表获取成功"))
}

pub async fn get_favorite_actions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<QuickAction>>> {
    let actions = load_quick_actions(&state.pool, &state, &headers).await;
    let favorites: Vec<_> = actions.into_iter().filter(|a| a.is_favorite).collect();
    Json(ApiResponse::success(favorites, "收藏的快捷操作获取成功"))
}

pub async fn toggle_favorite_action(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Json<ApiResponse<QuickAction>> {
    let mut actions = load_quick_actions(&state.pool, &state, &headers).await;

    let mut favorites: Vec<String> = actions
        .iter()
        .filter(|a| a.is_favorite)
        .map(|a| a.id.clone())
        .collect();

    if let Some(pos) = favorites.iter().position(|x| x == &id) {
        favorites.remove(pos);
    } else {
        favorites.push(id.clone());
    }

    save_favorites(&state, &headers, &favorites).await;

    let action = actions
        .iter_mut()
        .find(|a| a.id == id)
        .cloned()
        .unwrap_or_else(|| QuickAction {
            id: id.clone(),
            ..Default::default()
        });

    Json(ApiResponse::success(action, "快捷操作收藏状态已更新"))
}

pub async fn execute_quick_action(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "id": id, "executed": true }),
        "快捷操作执行成功",
    ))
}

impl Default for QuickAction {
    fn default() -> Self {
        QuickAction {
            id: "".to_string(),
            name: "".to_string(),
            description: "".to_string(),
            icon: "".to_string(),
            action_type: "".to_string(),
            target_url: "".to_string(),
            service: "".to_string(),
            is_favorite: false,
            usage_count: 0,
        }
    }
}
