use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Extension, Json,
};
use uuid::Uuid;

use super::super::models::*;
use crate::{AppState, CoreResponse};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;

/// Sort plugins by popularity: descending downloads, then descending rating,
/// then ascending name for stable ordering of ties.
/// Tuple shape: (name, downloads, rating).
pub fn sort_plugins_by_popularity(mut plugins: Vec<(String, u32, f64)>) -> Vec<(String, u32, f64)> {
    plugins.sort_by(|a, b| {
        // downloads desc
        b.1.cmp(&a.1)
            // rating desc
            .then_with(|| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal))
            // name asc (stable tie-break)
            .then_with(|| a.0.cmp(&b.0))
    });
    plugins
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
/// Compute the total pages for a paginated plugin list.
pub fn calculate_total_pages(total: i64, page_size: u32) -> u32 {
    topems_shared_core::response::total_pages_of(total, page_size as i64) as u32
}

/// Clamp page number to the valid range [1, ..] and compute the SQL OFFSET.
pub fn paginate(page: Option<u32>, page_size: Option<u32>) -> (u32, u32, u32) {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    (page, page_size, offset)
}

/// Get marketplace summary
///
/// 平台语料化后：`core.core_plugins` 的**已发布条目**只存在于哨兵租户
/// （`tenant_id = 00000000-0000-0000-0000-000000000000`），租户草稿留在各自租户下。
/// 市场是公开路由（`is_public_path` 放行，不注入请求事务/租户 GUC），因此这里保持
/// 系统通道，并用显式哨兵 + `is_published` + `deleted_at IS NULL` 限定可见集合；
/// 可见结果与「租户 scope 读哨兵行 + 本租户行 + 发布过滤」等价，不会暴露任何租户草稿。
pub async fn get_marketplace_summary(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<CoreResponse<MarketplaceSummary>> {
    tracing::info!("[Plugin] Getting marketplace summary");

    let locale = Locale::from_headers(&headers).as_sql();

    let mut scope = match state.db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Plugin] Failed to open read scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to open database scope: {}",
                e
            )));
        }
    };

    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM core.core_plugins \
         WHERE tenant_id = '00000000-0000-0000-0000-000000000000' \
           AND is_published = true AND deleted_at IS NULL",
    )
    .fetch_one(&mut scope)
    .await
    .unwrap_or((0,));

    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT id, name, description, sort_order, is_active, created_at FROM core.core_plugin_categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let featured: Vec<Plugin> = sqlx::query_as(
        "SELECT id, code, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND is_published = true AND deleted_at IS NULL AND is_featured = true ORDER BY install_count DESC LIMIT 6"
    )
    .bind(locale)
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let new_plugins: Vec<Plugin> = sqlx::query_as(
        "SELECT id, code, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND is_published = true AND deleted_at IS NULL ORDER BY published_at DESC LIMIT 6",
    )
    .bind(locale)
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let top_rated: Vec<Plugin> = sqlx::query_as(
        "SELECT id, code, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND is_published = true AND deleted_at IS NULL AND rating_count > 0 ORDER BY rating DESC LIMIT 6"
    )
    .bind(locale)
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let _ = scope.commit().await;

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

    let mut scope = match state.db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Plugin] Failed to open read scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to open database scope: {}",
                e
            )));
        }
    };

    let categories: Vec<PluginCategory> = sqlx::query_as(
        "SELECT id, name, description, sort_order, is_active, created_at FROM core.core_plugin_categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let _ = scope.commit().await;

    Json(CoreResponse::success(categories, "Categories retrieved"))
}

const PLUGIN_CATEGORIES: [&str; 9] = [
    "manufacturing",
    "quality",
    "analytics",
    "supply-chain",
    "hr",
    "crm",
    "ai",
    "gis",
    "devtools",
];

/// List plugins with filters
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
pub async fn list_plugins(
    State(state): State<AppState>,
    Query(filters): Query<PluginFilters>,
    headers: HeaderMap,
) -> Json<CoreResponse<PluginListResponse>> {
    tracing::info!("[Plugin] Listing plugins with filters: {:?}", filters);

    let page = filters.page.unwrap_or(1).max(1);
    let page_size = filters.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let category = filters
        .category
        .as_deref()
        .filter(|c| PLUGIN_CATEGORIES.contains(c));
    let search_pattern = filters.search.as_ref().map(|s| {
        let mut pattern = String::from("%");
        pattern.push_str(s);
        pattern.push('%');
        pattern
    });
    let is_free = filters.is_free;

    let mut scope = match state.db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Plugin] Failed to open read scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to open database scope: {}",
                e
            )));
        }
    };

    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM core.core_plugins WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND is_published = true AND deleted_at IS NULL AND ($1::text IS NULL OR category = $1) AND ($2::text IS NULL OR (name ILIKE $2 OR description ILIKE $2)) AND ($3::boolean IS NULL OR is_free = $3)",
    )
    .bind(category)
    .bind(search_pattern.as_deref())
    .bind(is_free)
    .fetch_one(&mut scope)
    .await
    .unwrap_or((0,));

    let sort_order = match filters.sort_by.as_deref() {
        Some("popular") => "install_count DESC",
        Some("rating") => "rating DESC",
        Some("recent") => "published_at DESC",
        Some("name") => "name ASC",
        _ => "install_count DESC",
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let mut sql = String::from("SELECT id, code, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND is_published = true AND deleted_at IS NULL AND ($2::text IS NULL OR category = $2) AND ($3::text IS NULL OR (name ILIKE $3 OR description ILIKE $3)) AND ($4::boolean IS NULL OR is_free = $4) ORDER BY ");
    sql.push_str(sort_order);
    sql.push_str(" LIMIT $5 OFFSET $6");
    let plugins: Vec<Plugin> = match sqlx::query_as::<_, Plugin>(sqlx::AssertSqlSafe(sql))
        .bind(locale)
        .bind(category)
        .bind(search_pattern.as_deref())
        .bind(is_free)
        .bind(page_size as i64)
        .bind(offset as i64)
        .fetch_all(&mut scope)
        .await
    {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("[Plugin] Failed to fetch plugins: {:?}", e);
            let _ = scope.rollback().await;
            return Json(CoreResponse::error(&format!(
                "Failed to fetch plugins: {}",
                e
            )));
        }
    };

    let _ = scope.commit().await;

    let response = PluginListResponse {
        plugins,
        total: total.0,
        page,
        page_size,
        total_pages: topems_shared_core::response::total_pages_of(total.0, page_size as i64) as u32,
    };

    Json(CoreResponse::success(response, "Plugins retrieved"))
}

/// Get plugin by code
pub async fn get_plugin(
    State(state): State<AppState>,
    Path(code): Path<String>,
    headers: HeaderMap,
) -> Json<CoreResponse<Plugin>> {
    tracing::info!("[Plugin] Getting plugin: {}", code);

    let locale = Locale::from_headers(&headers).as_sql();
    let mut scope = match state.db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Plugin] Failed to open read scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to open database scope: {}",
                e
            )));
        }
    };
    let plugin: Option<Plugin> = sqlx::query_as("SELECT id, code, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, version, plugin_type, is_free, price_cents, remote_url, entry_point, dependencies, author_name, author_url, homepage_url, screenshots, tags, category, is_published, is_featured, is_recommended, install_count, rating, rating_count, published_at, created_at, updated_at, is_installed, installed_at, is_active, activated_at, checksum FROM core.core_plugins WHERE code = $1 AND tenant_id = '00000000-0000-0000-0000-000000000000' AND is_published = true AND deleted_at IS NULL")
        .bind(&code)
        .bind(locale)
        .fetch_optional(&mut scope)
        .await
        .unwrap_or(None);

    let _ = scope.commit().await;

    match plugin {
        Some(p) => Json(CoreResponse::success(p, "Plugin retrieved")),
        None => Json(CoreResponse::error("Plugin not found")),
    }
}

/// Get plugin versions
#[utoipa::path(
    get,
    security(("BearerAuth" = ["plugin-registry:read"])),
    path = "/api/plugin/plugins/{plugin_id}/versions",
    params(
        ("plugin_id" = String, Path, description = "plugin_id"),
    ),
    responses((status = 200, description = "get_plugin_versions OK")),
    tag = "marketplace"
)]
pub async fn get_plugin_versions(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<PluginVersion>>> {
    tracing::info!("[Plugin] Getting versions for plugin: {}", plugin_id);

    let mut scope = match state.db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Plugin] Failed to open read scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to open database scope: {}",
                e
            )));
        }
    };

    let versions: Vec<PluginVersion> = sqlx::query_as(
        "SELECT id, plugin_id, version, release_notes, download_url, is_latest, is_stable, created_at FROM core.core_plugin_versions WHERE plugin_id = $1 AND EXISTS (SELECT 1 FROM core.core_plugins p WHERE p.id = $1 AND p.tenant_id = '00000000-0000-0000-0000-000000000000' AND p.is_published = true AND p.deleted_at IS NULL) ORDER BY created_at DESC",
    )
    .bind(plugin_id)
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let _ = scope.commit().await;

    Json(CoreResponse::success(versions, "Versions retrieved"))
}

/// Get plugin reviews
#[utoipa::path(
    get,
    security(("BearerAuth" = ["plugin-registry:plugin:read"])),
    path = "/api/plugin/plugins/{plugin_id}/reviews",
    params(
("plugin_id" = String, Path, description = "plugin_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
pub async fn get_plugin_reviews(
    State(state): State<AppState>,
    Path(plugin_id): Path<Uuid>,
) -> Json<CoreResponse<Vec<PluginReview>>> {
    tracing::info!("[Plugin] Getting reviews for plugin: {}", plugin_id);

    let mut scope = match state.db.scope_read_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[Plugin] Failed to open read scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to open database scope: {}",
                e
            )));
        }
    };

    let reviews: Vec<PluginReview> = sqlx::query_as(
        "SELECT id, plugin_id, user_id, rating, title, content, is_featured, helpful_count, created_at FROM core.core_plugin_reviews WHERE plugin_id = $1 AND EXISTS (SELECT 1 FROM core.core_plugins p WHERE p.id = $1 AND p.tenant_id = '00000000-0000-0000-0000-000000000000' AND p.is_published = true AND p.deleted_at IS NULL) ORDER BY is_featured DESC, helpful_count DESC, created_at DESC"
    )
    .bind(plugin_id)
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let _ = scope.commit().await;

    Json(CoreResponse::success(reviews, "Reviews retrieved"))
}

/// Create plugin review
#[utoipa::path(
    post,
    security(("BearerAuth" = ["plugin-registry:plugin:write"])),
    path = "/api/plugin/plugins/{plugin_id}/reviews",
    params(
("plugin_id" = String, Path, description = "plugin_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "plugin"
)]
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

    let mut scope = match state.db.scope_system().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open write scope: {}", e);
            return Json(CoreResponse::error(&format!(
                "Failed to create review: {}",
                e
            )));
        }
    };

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
    .fetch_one(&mut scope)
    .await;

    match review_result {
        Ok(review) => {
            let _ = scope.commit().await;
            Json(CoreResponse::success(review, "Review created"))
        }
        Err(e) => {
            tracing::error!("Failed to create review: {}", e);
            let _ = scope.rollback().await;
            Json(CoreResponse::error(&format!(
                "Failed to create review: {}",
                e
            )))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- sort_plugins_by_popularity ----

    #[test]
    fn sort_by_popularity_downloads_desc() {
        let plugins = vec![
            ("a".to_string(), 10u32, 4.0f64),
            ("b".to_string(), 100u32, 3.0f64),
            ("c".to_string(), 50u32, 5.0f64),
        ];
        let sorted = sort_plugins_by_popularity(plugins);
        assert_eq!(sorted[0].0, "b");
        assert_eq!(sorted[1].0, "c");
        assert_eq!(sorted[2].0, "a");
    }

    #[test]
    fn sort_by_popularity_rating_tiebreak() {
        // Same downloads -> higher rating first
        let plugins = vec![
            ("a".to_string(), 10u32, 3.5f64),
            ("b".to_string(), 10u32, 4.9f64),
        ];
        let sorted = sort_plugins_by_popularity(plugins);
        assert_eq!(sorted[0].0, "b");
        assert_eq!(sorted[1].0, "a");
    }

    #[test]
    fn sort_by_popularity_name_tiebreak() {
        // Same downloads and rating -> name asc
        let plugins = vec![
            ("zeta".to_string(), 5u32, 4.0f64),
            ("alpha".to_string(), 5u32, 4.0f64),
        ];
        let sorted = sort_plugins_by_popularity(plugins);
        assert_eq!(sorted[0].0, "alpha");
        assert_eq!(sorted[1].0, "zeta");
    }

    #[test]
    fn sort_by_popularity_empty() {
        assert!(sort_plugins_by_popularity(vec![]).is_empty());
    }

    #[test]
    fn sort_by_popularity_single() {
        let plugins = vec![("only".to_string(), 1u32, 1.0f64)];
        let sorted = sort_plugins_by_popularity(plugins);
        assert_eq!(sorted.len(), 1);
        assert_eq!(sorted[0].0, "only");
    }

    #[test]
    fn sort_by_popularity_zero_downloads() {
        let plugins = vec![
            ("a".to_string(), 0u32, 5.0f64),
            ("b".to_string(), 0u32, 1.0f64),
        ];
        let sorted = sort_plugins_by_popularity(plugins);
        assert_eq!(sorted[0].0, "a"); // higher rating first
    }

    // ---- calculate_total_pages ----

    #[test]
    fn total_pages_exact_division() {
        assert_eq!(calculate_total_pages(100, 20), 5);
    }

    #[test]
    fn total_pages_with_remainder() {
        assert_eq!(calculate_total_pages(101, 20), 6);
    }

    #[test]
    fn total_pages_zero_total() {
        assert_eq!(calculate_total_pages(0, 20), 0);
    }

    #[test]
    fn total_pages_zero_page_size() {
        assert_eq!(calculate_total_pages(100, 0), 0);
    }

    // ---- paginate ----

    #[test]
    fn paginate_defaults() {
        let (page, size, offset) = paginate(None, None);
        assert_eq!(page, 1);
        assert_eq!(size, 20);
        assert_eq!(offset, 0);
    }

    #[test]
    fn paginate_second_page() {
        let (page, size, offset) = paginate(Some(2), Some(10));
        assert_eq!(page, 2);
        assert_eq!(size, 10);
        assert_eq!(offset, 10);
    }

    #[test]
    fn paginate_clamps_page_size() {
        let (_, size, _) = paginate(Some(1), Some(500));
        assert_eq!(size, 100);
    }

    #[test]
    fn paginate_zero_page_becomes_one() {
        let (page, _, _) = paginate(Some(0), Some(10));
        assert_eq!(page, 1);
    }
}
