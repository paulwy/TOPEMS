use axum::{
    extract::{Path, Query, State},
    Json,
};

use super::super::models::*;
use crate::{AppState, CoreResponse};

/// Get plugin reviews by code with sorting and filtering
pub async fn get_plugin_reviews_by_code(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
    Query(params): Query<ReviewFilterParams>,
) -> Json<CoreResponse<Vec<PluginReview>>> {
    tracing::info!(
        "[Plugin] Getting reviews for plugin: {} with filters",
        plugin_code
    );

    let mut reviews = vec![
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("张三".to_string()),
            user_avatar: None,
            rating: 5,
            title: Some("非常好用的插件".to_string()),
            content: Some("这个插件大大提升了我的工作效率，强烈推荐！".to_string()),
            is_verified_purchase: Some(true),
            is_featured: Some(true),
            helpful_count: Some(42),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(15),
            updated_at: chrono::Utc::now() - chrono::Duration::days(15),
        },
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("李四".to_string()),
            user_avatar: None,
            rating: 4,
            title: Some("功能完善，期待更多特性".to_string()),
            content: Some("整体使用体验不错，希望能增加更多自定义选项。".to_string()),
            is_verified_purchase: Some(true),
            is_featured: None,
            helpful_count: Some(28),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(7),
            updated_at: chrono::Utc::now() - chrono::Duration::days(7),
        },
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("王五".to_string()),
            user_avatar: None,
            rating: 3,
            title: Some("还可以，有待改进".to_string()),
            content: Some("基本功能可用，但性能有待优化。".to_string()),
            is_verified_purchase: None,
            is_featured: None,
            helpful_count: Some(12),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(3),
            updated_at: chrono::Utc::now() - chrono::Duration::days(3),
        },
        PluginReview {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: uuid::Uuid::nil(),
            user_name: Some("赵六".to_string()),
            user_avatar: None,
            rating: 5,
            title: Some("完美！".to_string()),
            content: Some("这是我用过的最好的插件，强烈推荐！".to_string()),
            is_verified_purchase: Some(true),
            is_featured: Some(true),
            helpful_count: Some(89),
            replies: None,
            created_at: chrono::Utc::now() - chrono::Duration::days(20),
            updated_at: chrono::Utc::now() - chrono::Duration::days(20),
        },
    ];

    // Apply filters
    if let Some(min_rating) = params.min_rating {
        reviews.retain(|r| r.rating >= min_rating);
    }
    if let Some(max_rating) = params.max_rating {
        reviews.retain(|r| r.rating <= max_rating);
    }
    if params.verified_only.unwrap_or(false) {
        reviews.retain(|r| r.is_verified_purchase.unwrap_or(false));
    }
    if params.featured_only.unwrap_or(false) {
        reviews.retain(|r| r.is_featured.unwrap_or(false));
    }
    if let Some(search) = &params.search {
        let search_lower = search.to_lowercase();
        reviews.retain(|r| {
            r.title
                .as_ref()
                .map(|t| t.to_lowercase().contains(&search_lower))
                .unwrap_or(false)
                || r.content
                    .as_ref()
                    .map(|c| c.to_lowercase().contains(&search_lower))
                    .unwrap_or(false)
                || r.user_name
                    .as_ref()
                    .map(|n| n.to_lowercase().contains(&search_lower))
                    .unwrap_or(false)
        });
    }

    // Apply sorting
    let sort_by = params.sort_by.unwrap_or_else(|| "is_featured".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "desc".to_string());
    let descending = sort_order.to_lowercase() == "desc";

    match sort_by.as_str() {
        "rating" => {
            if descending {
                reviews.sort_by(|a, b| b.rating.cmp(&a.rating));
            } else {
                reviews.sort_by(|a, b| a.rating.cmp(&b.rating));
            }
        }
        "created_at" | "date" => {
            if descending {
                reviews.sort_by(|a, b| b.created_at.cmp(&a.created_at));
            } else {
                reviews.sort_by(|a, b| a.created_at.cmp(&b.created_at));
            }
        }
        "helpful_count" | "helpful" => {
            if descending {
                reviews.sort_by(|a, b| {
                    b.helpful_count
                        .unwrap_or(0)
                        .cmp(&a.helpful_count.unwrap_or(0))
                });
            } else {
                reviews.sort_by(|a, b| {
                    a.helpful_count
                        .unwrap_or(0)
                        .cmp(&b.helpful_count.unwrap_or(0))
                });
            }
        }
        "is_featured" | "featured" | _ => {
            if descending {
                reviews.sort_by(|a, b| {
                    let a_feat = a.is_featured.unwrap_or(false) as i32;
                    let b_feat = b.is_featured.unwrap_or(false) as i32;
                    b_feat.cmp(&a_feat)
                });
            } else {
                reviews.sort_by(|a, b| {
                    let a_feat = a.is_featured.unwrap_or(false) as i32;
                    let b_feat = b.is_featured.unwrap_or(false) as i32;
                    a_feat.cmp(&b_feat)
                });
            }
        }
    }

    Json(CoreResponse::success(reviews, "Reviews retrieved"))
}

/// Create plugin review
pub async fn create_plugin_review(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
    Json(req): Json<ReviewRequest>,
) -> Json<CoreResponse<PluginReview>> {
    tracing::info!(
        "[Plugin] Creating review for plugin {} with rating: {}",
        plugin_code,
        req.rating
    );

    let review = PluginReview {
        id: uuid::Uuid::new_v4(),
        plugin_id: uuid::Uuid::nil(),
        user_id: uuid::Uuid::nil(),
        user_name: Some("当前用户".to_string()),
        user_avatar: None,
        rating: req.rating,
        title: req.title,
        content: req.content,
        is_verified_purchase: Some(true),
        is_featured: None,
        helpful_count: Some(0),
        replies: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    Json(CoreResponse::success(review, "Review created"))
}

/// Get plugin statistics
pub async fn get_plugin_statistics(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<PluginStatistics>> {
    tracing::info!("[Plugin] Getting statistics for plugin: {}", plugin_code);

    let stats = PluginStatistics {
        plugin_id: uuid::Uuid::nil(),
        plugin_code: plugin_code.clone(),
        total_downloads: 12580,
        monthly_downloads: 1842,
        weekly_downloads: 456,
        daily_downloads: 68,
        total_reviews: 342,
        average_rating: 4.6,
        rating_distribution: Some(serde_json::json!({
            "5": 245,
            "4": 68,
            "3": 21,
            "2": 6,
            "1": 2
        })),
        active_installs: Some(8920),
        trending_score: Some(8.7),
    };

    Json(CoreResponse::success(stats, "Statistics retrieved"))
}

/// Get review statistics
pub async fn get_review_statistics(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<ReviewStatistics>> {
    tracing::info!(
        "[Plugin] Getting review statistics for plugin: {}",
        plugin_code
    );

    let stats = ReviewStatistics {
        plugin_id: uuid::Uuid::nil(),
        total_reviews: 342,
        average_rating: 4.6,
        rating_5_count: 245,
        rating_4_count: 68,
        rating_3_count: 21,
        rating_2_count: 6,
        rating_1_count: 2,
    };

    Json(CoreResponse::success(stats, "Review statistics retrieved"))
}

/// Get download history
pub async fn get_download_history(
    State(_state): State<AppState>,
    Path(plugin_code): Path<String>,
) -> Json<CoreResponse<Vec<DownloadRecord>>> {
    tracing::info!(
        "[Plugin] Getting download history for plugin: {}",
        plugin_code
    );

    let records = vec![
        DownloadRecord {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: Some(uuid::Uuid::nil()),
            version: "1.2.0".to_string(),
            download_date: chrono::Utc::now() - chrono::Duration::hours(2),
            ip_address: None,
            user_agent: None,
        },
        DownloadRecord {
            id: uuid::Uuid::new_v4(),
            plugin_id: uuid::Uuid::nil(),
            user_id: None,
            version: "1.2.0".to_string(),
            download_date: chrono::Utc::now() - chrono::Duration::hours(5),
            ip_address: None,
            user_agent: None,
        },
    ];

    Json(CoreResponse::success(records, "Download history retrieved"))
}
