use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Serialize)]
pub struct RecommendationResult {
    pub customer_id: Uuid,
    pub customer_name: String,
    pub recommendations: Vec<RecommendationItem>,
    pub recommendation_type: String,
    pub model: String,
    pub confidence: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecommendationItem {
    pub id: Uuid,
    pub name: String,
    pub item_type: String,
    pub confidence: f64,
    pub reason: String,
    pub score: i32,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct RecommendationRequest {
    pub customer_id: Uuid,
    pub recommendation_type: String,
    pub top_k: Option<i32>,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct RecommendationQueryParams {
    pub customer_id: Option<Uuid>,
    pub recommendation_type: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/recommendations",
            get(list_recommendations).post(create_recommendation),
        )
        .route(
            "/customers/{id}/recommendations",
            get(get_customer_recommendations),
        )
        .route("/recommendations/{id}", get(get_recommendation))
}

async fn list_recommendations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<RecommendationQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT id, customer_id, customer_name, recommendations, recommendation_type, model, confidence, created_at
        FROM plugin_crm.customer_recommendations
        WHERE ($1::uuid IS NULL OR customer_id = $1)
          AND ($2::text IS NULL OR recommendation_type = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.customer_id)
    .bind(&params.recommendation_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query(
                r#"
                SELECT COUNT(*) FROM plugin_crm.customer_recommendations
                WHERE ($1::uuid IS NULL OR customer_id = $1)
                  AND ($2::text IS NULL OR recommendation_type = $2)
                "#,
            )
            .bind(&params.customer_id)
            .bind(&params.recommendation_type)
            .fetch_one(&state.db)
            .await;

            let total = count_result.map(|r| r.get::<i64, _>(0)).unwrap_or(0);

            let recommendations: Vec<RecommendationResult> = records
                .into_iter()
                .map(|r| {
                    let items: Vec<RecommendationItem> =
                        serde_json::from_value(r.get(3)).unwrap_or_default();
                    RecommendationResult {
                        customer_id: r.get(1),
                        customer_name: r.get(2),
                        recommendations: items,
                        recommendation_type: r.get(4),
                        model: r.get(5),
                        confidence: r.get(6),
                        created_at: r.get(7),
                    }
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": recommendations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取推荐列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取推荐列表失败: {}", e);
            Json(api_error(500, "获取推荐列表失败"))
        }
    }
}

async fn get_recommendation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<RecommendationResult>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT id, customer_id, customer_name, recommendations, recommendation_type, model, confidence, created_at
        FROM plugin_crm.customer_recommendations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(r)) => {
            let items: Vec<RecommendationItem> =
                serde_json::from_value(r.get(3)).unwrap_or_default();
            Json(ApiResponse::success(
                RecommendationResult {
                    customer_id: r.get(1),
                    customer_name: r.get(2),
                    recommendations: items,
                    recommendation_type: r.get(4),
                    model: r.get(5),
                    confidence: r.get(6),
                    created_at: r.get(7),
                },
                "获取推荐成功",
            ))
        }
        Ok(None) => Json(api_error(404, "推荐记录不存在")),
        Err(e) => {
            tracing::error!("获取推荐失败: {}", e);
            Json(api_error(500, "获取推荐失败"))
        }
    }
}

async fn create_recommendation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RecommendationRequest>,
) -> Json<ApiResponse<RecommendationResult>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let customer_name_result =
        sqlx::query_scalar::<_, Option<String>>("SELECT name FROM crm.customers WHERE id = $1")
            .bind(&req.customer_id)
            .fetch_optional(&state.db)
            .await;

    let customer_name = match customer_name_result {
        Ok(Some(name)) => name,
        Ok(None) => return Json(api_error(400, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let top_k = req.top_k.unwrap_or(10);
    let recommendations =
        generate_recommendations(&state, &req.customer_id, &req.recommendation_type, top_k).await;

    let recommendations_json =
        serde_json::to_value(&recommendations).unwrap_or(serde_json::json!([]));
    let confidence = calculate_overall_confidence(&recommendations);

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO plugin_crm.customer_recommendations (
            id, customer_id, customer_name, recommendations, recommendation_type, model, confidence, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, customer_id, customer_name, recommendations, recommendation_type, model, confidence, created_at
        "#,
    )
    .bind(id)
    .bind(req.customer_id)
    .bind(&customer_name)
    .bind(&recommendations_json)
    .bind(&req.recommendation_type)
    .bind("TOPEMS-AI")
    .bind(confidence)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(r) => {
            let items: Vec<RecommendationItem> =
                serde_json::from_value(r.get(3)).unwrap_or_default();
            Json(ApiResponse::success(
                RecommendationResult {
                    customer_id: r.get(1),
                    customer_name: r.get(2),
                    recommendations: items,
                    recommendation_type: r.get(4),
                    model: r.get(5),
                    confidence: r.get(6),
                    created_at: r.get(7),
                },
                "推荐生成成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建推荐失败: {}", e);
            Json(api_error(500, "创建推荐失败"))
        }
    }
}

async fn get_customer_recommendations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Query(params): Query<RecommendationQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let customer_name_result =
        sqlx::query_scalar::<_, Option<String>>("SELECT name FROM crm.customers WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await;

    let customer_name = match customer_name_result {
        Ok(Some(name)) => name,
        Ok(None) => return Json(api_error(404, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let rec_type = params.recommendation_type.as_deref().unwrap_or("product");
    let top_k = params.page_size.unwrap_or(10) as i32;

    let recommendations = generate_recommendations(&state, &id, rec_type, top_k).await;
    let confidence = calculate_overall_confidence(&recommendations);

    Json(ApiResponse::success(
        serde_json::json!({
            "customer_id": id,
            "customer_name": customer_name,
            "recommendations": recommendations,
            "recommendation_type": rec_type,
            "model": "TOPEMS-AI",
            "confidence": confidence,
            "created_at": Utc::now()
        }),
        "获取客户推荐成功",
    ))
}

async fn generate_recommendations(
    state: &ApiState,
    customer_id: &Uuid,
    rec_type: &str,
    top_k: i32,
) -> Vec<RecommendationItem> {
    match rec_type {
        "product" => recommend_products(state, customer_id, top_k).await,
        "opportunity" => recommend_opportunities(state, customer_id, top_k).await,
        "service" => recommend_services(state, customer_id, top_k).await,
        "cross-sell" => recommend_cross_sell(state, customer_id, top_k).await,
        "upsell" => recommend_upsell(state, customer_id, top_k).await,
        "content" => recommend_content(state, customer_id, top_k).await,
        _ => recommend_general(state, customer_id, top_k).await,
    }
}

async fn recommend_products(
    _state: &ApiState,
    _customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "智能分析套件".to_string(),
            item_type: "product".to_string(),
            confidence: 0.92,
            reason: "客户属于高科技行业，且有较高的营收能力".to_string(),
            score: 92,
            metadata: serde_json::json!({ "category": "analytics", "price_range": "high" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "企业数据中台".to_string(),
            item_type: "product".to_string(),
            confidence: 0.85,
            reason: "客户员工规模较大，需要统一的数据管理平台".to_string(),
            score: 85,
            metadata: serde_json::json!({ "category": "data", "price_range": "enterprise" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "移动端解决方案".to_string(),
            item_type: "product".to_string(),
            confidence: 0.78,
            reason: "客户有移动端业务需求的潜在可能性".to_string(),
            score: 78,
            metadata: serde_json::json!({ "category": "mobile", "price_range": "medium" }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

async fn recommend_opportunities(
    state: &ApiState,
    customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    let industry_result =
        sqlx::query_scalar::<_, Option<String>>("SELECT industry FROM crm.customers WHERE id = $1")
            .bind(customer_id)
            .fetch_optional(&state.db)
            .await;

    let industry = industry_result
        .unwrap_or(None)
        .flatten()
        .unwrap_or("其他".to_string());

    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: format!("{}行业解决方案升级", industry),
            item_type: "opportunity".to_string(),
            confidence: 0.95,
            reason: "基于客户行业特征，推荐针对性解决方案".to_string(),
            score: 95,
            metadata: serde_json::json!({ "estimated_value": 500000, "probability": 75 }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "年度维护服务续约".to_string(),
            item_type: "opportunity".to_string(),
            confidence: 0.88,
            reason: "客户当前服务即将到期，需要提前规划续约".to_string(),
            score: 88,
            metadata: serde_json::json!({ "estimated_value": 100000, "probability": 90 }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "技术培训服务".to_string(),
            item_type: "opportunity".to_string(),
            confidence: 0.72,
            reason: "客户员工数量较多，有培训需求".to_string(),
            score: 72,
            metadata: serde_json::json!({ "estimated_value": 50000, "probability": 60 }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

async fn recommend_services(
    _state: &ApiState,
    _customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "专业技术咨询".to_string(),
            item_type: "service".to_string(),
            confidence: 0.89,
            reason: "客户处于业务扩张阶段，需要专业指导".to_string(),
            score: 89,
            metadata: serde_json::json!({ "duration": "monthly", "price_range": "medium" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "定制开发服务".to_string(),
            item_type: "service".to_string(),
            confidence: 0.82,
            reason: "客户有特殊业务需求，需要定制化开发".to_string(),
            score: 82,
            metadata: serde_json::json!({ "duration": "project", "price_range": "high" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "系统集成服务".to_string(),
            item_type: "service".to_string(),
            confidence: 0.75,
            reason: "客户使用多个系统，需要集成方案".to_string(),
            score: 75,
            metadata: serde_json::json!({ "duration": "project", "price_range": "enterprise" }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

async fn recommend_cross_sell(
    _state: &ApiState,
    _customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "数据分析工具".to_string(),
            item_type: "cross-sell".to_string(),
            confidence: 0.91,
            reason: "客户已购买核心产品，数据分析是自然延伸".to_string(),
            score: 91,
            metadata: serde_json::json!({ "related_product": "core", "price_range": "medium" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "安全防护模块".to_string(),
            item_type: "cross-sell".to_string(),
            confidence: 0.84,
            reason: "保障系统安全是客户关注的重点".to_string(),
            score: 84,
            metadata: serde_json::json!({ "related_product": "core", "price_range": "medium" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "报表订阅服务".to_string(),
            item_type: "cross-sell".to_string(),
            confidence: 0.77,
            reason: "客户需要定期业务报告".to_string(),
            score: 77,
            metadata: serde_json::json!({ "related_product": "analytics", "price_range": "low" }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

async fn recommend_upsell(
    _state: &ApiState,
    _customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "企业版升级".to_string(),
            item_type: "upsell".to_string(),
            confidence: 0.93,
            reason: "客户当前使用标准版，业务增长需要更多功能".to_string(),
            score: 93,
            metadata: serde_json::json!({ "upgrade_from": "standard", "price_increase": 200 }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "无限用户许可".to_string(),
            item_type: "upsell".to_string(),
            confidence: 0.86,
            reason: "客户员工数量增长，需要更多用户许可".to_string(),
            score: 86,
            metadata: serde_json::json!({ "upgrade_from": "limited", "price_increase": 150 }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "专属客户成功经理".to_string(),
            item_type: "upsell".to_string(),
            confidence: 0.79,
            reason: "高价值客户应配备专属服务".to_string(),
            score: 79,
            metadata: serde_json::json!({ "service_level": "premium", "price_increase": 100 }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

async fn recommend_content(
    _state: &ApiState,
    _customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "行业白皮书下载".to_string(),
            item_type: "content".to_string(),
            confidence: 0.90,
            reason: "客户关注行业趋势和最佳实践".to_string(),
            score: 90,
            metadata: serde_json::json!({ "content_type": "whitepaper", "topic": "industry_trends" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "技术博客订阅".to_string(),
            item_type: "content".to_string(),
            confidence: 0.83,
            reason: "客户技术团队需要持续学习".to_string(),
            score: 83,
            metadata: serde_json::json!({ "content_type": "blog", "frequency": "weekly" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "线上研讨会邀请".to_string(),
            item_type: "content".to_string(),
            confidence: 0.76,
            reason: "客户有参与行业交流的需求".to_string(),
            score: 76,
            metadata: serde_json::json!({ "content_type": "webinar", "topic": "best_practices" }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

async fn recommend_general(
    _state: &ApiState,
    _customer_id: &Uuid,
    top_k: i32,
) -> Vec<RecommendationItem> {
    vec![
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "客户关怀回访".to_string(),
            item_type: "general".to_string(),
            confidence: 0.87,
            reason: "定期回访有助于维护客户关系".to_string(),
            score: 87,
            metadata: serde_json::json!({ "action": "call", "priority": "high" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "产品更新通知".to_string(),
            item_type: "general".to_string(),
            confidence: 0.80,
            reason: "及时告知客户产品新功能".to_string(),
            score: 80,
            metadata: serde_json::json!({ "action": "email", "priority": "medium" }),
        },
        RecommendationItem {
            id: Uuid::new_v4(),
            name: "续约提醒".to_string(),
            item_type: "general".to_string(),
            confidence: 0.85,
            reason: "服务即将到期，需要提前沟通".to_string(),
            score: 85,
            metadata: serde_json::json!({ "action": "meeting", "priority": "high" }),
        },
    ]
    .into_iter()
    .take(top_k as usize)
    .collect()
}

fn calculate_overall_confidence(items: &[RecommendationItem]) -> f64 {
    if items.is_empty() {
        return 0.0;
    }
    let total: f64 = items.iter().map(|i| i.confidence).sum();
    total / items.len() as f64
}
