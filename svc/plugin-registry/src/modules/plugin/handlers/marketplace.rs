use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use super::super::models::*;
use crate::{AppState, CoreResponse};
use topems_shared::auth::Claims;

/// Get marketplace summary
pub async fn get_marketplace_summary(
    State(state): State<AppState>,
) -> Json<CoreResponse<MarketplaceSummary>> {
    tracing::info!("[Plugin] Getting marketplace summary");

    let total: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM core.core_plugins WHERE is_published = true")
            .fetch_one(&state.pool)
            .await
            .unwrap_or((0,));

    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT * FROM core.core_plugin_categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let featured: Vec<Plugin> = sqlx::query_as(
        "SELECT * FROM core.core_plugins WHERE is_published = true AND is_featured = true ORDER BY install_count DESC LIMIT 6"
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let new_plugins: Vec<Plugin> = sqlx::query_as(
        "SELECT * FROM core.core_plugins WHERE is_published = true ORDER BY published_at DESC LIMIT 6",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let top_rated: Vec<Plugin> = sqlx::query_as(
        "SELECT * FROM core.core_plugins WHERE is_published = true AND rating_count > 0 ORDER BY rating DESC LIMIT 6"
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let summary = MarketplaceSummary {
        total_plugins: total.0,
        categories,
        featured_plugins: featured,
        new_plugins,
        top_rated,
    };

    Json(CoreResponse::success(
        summary,
        "Marketplace summary retrieved",
    ))
}

/// List plugin categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Json<CoreResponse<Vec<PluginCategory>>> {
    tracing::info!("[Plugin] Listing categories");

    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT * FROM core.core_plugin_categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(categories, "Categories retrieved"))
}

/// List plugins with filters
pub async fn list_plugins(
    State(state): State<AppState>,
    Query(filters): Query<PluginFilters>,
) -> Json<CoreResponse<PluginListResponse>> {
    tracing::info!("[Plugin] Listing plugins with filters: {:?}", filters);

    let page = filters.page.unwrap_or(1).max(1);
    let page_size = filters.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut where_clauses = vec!["is_published = true".to_string()];

    if let Some(ref cat) = filters.category {
        where_clauses.push(format!("category = '{}'", cat));
    }

    if let Some(ref search) = filters.search {
        where_clauses.push(format!(
            "(name ILIKE '%{}%' OR description ILIKE '%{}%')",
            search, search
        ));
    }

    if let Some(is_free) = filters.is_free {
        where_clauses.push(format!("is_free = {}", is_free));
    }

    let where_clause = where_clauses.join(" AND ");

    let sort_order = match filters.sort_by.as_deref() {
        Some("popular") => "install_count DESC",
        Some("rating") => "rating DESC",
        Some("recent") => "published_at DESC",
        Some("name") => "name ASC",
        _ => "install_count DESC",
    };

    let total: (i64,) = sqlx::query_as(&format!(
        "SELECT COUNT(*) FROM core.core_plugins WHERE {}",
        where_clause
    ))
    .fetch_one(&state.pool)
    .await
    .unwrap_or((0,));

    let plugins: Vec<Plugin> = match sqlx::query_as::<_, Plugin>(&format!(
        "SELECT * FROM core.core_plugins WHERE {} ORDER BY {} LIMIT {} OFFSET {}",
        where_clause, sort_order, page_size, offset
    ))
    .fetch_all(&state.pool)
    .await
    {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("[Plugin] Failed to fetch plugins: {:?}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to fetch plugins: {}",
                e
            )));
        }
    };

    let response = PluginListResponse {
        plugins,
        total: total.0,
        page,
        page_size,
        total_pages: ((total.0 as f64) / (page_size as f64)).ceil() as u32,
    };

    Json(CoreResponse::success(response, "Plugins retrieved"))
}

/// Get plugin by code
pub async fn get_plugin(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Getting plugin: {}", code);

    let plugin: Option<Plugin> = sqlx::query_as("SELECT * FROM core.core_plugins WHERE code = $1")
        .bind(&code)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    match plugin {
        Some(p) => Json(CoreResponse::success(p, "Plugin retrieved")),
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

/// Get plugin versions
pub async fn get_plugin_versions(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<PluginVersion>>> {
    tracing::info!("[Plugin] Getting versions for plugin: {}", plugin_id);

    let versions: Vec<PluginVersion> = sqlx::query_as(
        "SELECT * FROM core.core_plugin_versions WHERE plugin_id = $1 ORDER BY created_at DESC",
    )
    .bind(plugin_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(versions, "Versions retrieved"))
}

/// Get plugin reviews
pub async fn get_plugin_reviews(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<PluginReview>>> {
    tracing::info!("[Plugin] Getting reviews for plugin: {}", plugin_id);

    let reviews: Vec<PluginReview> = sqlx::query_as(
        "SELECT * FROM core.core_plugin_reviews WHERE plugin_id = $1 ORDER BY is_featured DESC, helpful_count DESC, created_at DESC"
    )
    .bind(plugin_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(CoreResponse::success(reviews, "Reviews retrieved"))
}

/// Create plugin review
pub async fn create_review(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReviewRequest>,
) -> Json<CoreResponse<PluginReview>> {
    tracing::info!(
        "[Plugin] Creating review for plugin: {} by user: {}",
        plugin_id,
        claims.username
    );

    let user_id = claims.user_id().unwrap_or_else(|_| Uuid::nil());
    let user_name = claims.username.clone();

    let review_result = sqlx::query_as(
        r#"
        INSERT INTO core.core_plugin_reviews (plugin_id, user_id, user_name, rating, title, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(plugin_id)
    .bind(user_id)
    .bind(user_name)
    .bind(req.rating)
    .bind(&req.title)
    .bind(&req.content)
    .fetch_one(&state.pool)
    .await;

    match review_result {
        Ok(review) => Json(CoreResponse::success(review, "Review created")),
        Err(e) => {
            tracing::error!("Failed to create review: {}", e);
            Json(CoreResponse::error(&format!(
                "Failed to create review: {}",
                e
            )))
        }
    }
}
