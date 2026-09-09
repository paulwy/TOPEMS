//! 模型管理与 AI 仪表盘 Handlers（known_gap A 组补全，2026-09-09）
//!
//! 对齐前端契约 apps/web/src/api/ai/index.ts：
//! - GET  /dashboard/stats              — 聚合统计（documents/qa_history 真实计数；tokens/users 无采集表返回 0）
//! - GET  /dashboard/activity-trend     — 按天/小时分组活动趋势（qa_history 真实数据）
//! - GET  /dashboard/feature-usage      — 各功能模块用量占比（真实表计数）
//! - GET  /models                       — 模型列表（ai.ai_models）
//! - GET  /models/{id}/config           — 模型运行配置
//! - PUT  /models/{id}/config           — 更新模型运行配置
//! - GET  /models/usage                 — 用量统计（无 usage 采集表，返回空结构与 0，待 usage 模块）
//!
//! 数据口径：统计类端点只聚合现有真实表（ai.qa_history / ai.documents / ai.analysis_results /
//! ai.vectors / ai.qa_history）；tokens/active_users/satisfaction_rate/cost 等无数据源字段
//! 一律返回 0，不做估算伪造。

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::{get_tenant_id_from_claims, Claims};
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::AppState;

// ========== Dashboard ==========

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_conversations: i64,
    pub total_messages: i64,
    pub total_documents: i64,
    pub total_tokens: i64,
    pub active_users: i64,
    pub satisfaction_rate: f64,
    pub trend: TrendSummary,
}

#[derive(Debug, Serialize)]
pub struct TrendSummary {
    pub conversations: i64,
    pub messages: i64,
    pub tokens: i64,
}

#[derive(Debug, Deserialize)]
pub struct ActivityTrendQuery {
    pub days: Option<i32>,
    pub group_by: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TrendPoint {
    pub date: String,
    pub conversations: i64,
    pub messages: i64,
    pub tokens: i64,
}

#[derive(Debug, Serialize)]
pub struct FeatureUsageItem {
    pub feature: String,
    pub label: String,
    pub count: i64,
    pub percentage: f64,
}

/// GET /dashboard/stats
pub async fn get_dashboard_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardStats>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let pool = &state.pool;

    let (documents, qa_count, conv_trend, msg_trend): (i64, i64, i64, i64) =
        match sqlx::query(
            "SELECT
                (SELECT COUNT(*) FROM ai.documents WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)),
                (SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)),
                (SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1) AND created_at >= NOW() - INTERVAL '7 days'),
                (SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1) AND created_at >= NOW() - INTERVAL '7 days')",
        )
        .bind(tenant_id)
        .fetch_one(pool)
        .await
        {
            Ok(row) => (row.get(0), row.get(1), row.get(2), row.get(3)),
            Err(e) => return Json(ApiResponse::<DashboardStats>::error(500, &e.to_string())),
        };

    Json(ApiResponse::success(
        DashboardStats {
            total_conversations: qa_count,
            total_messages: qa_count,
            total_documents: documents,
            total_tokens: 0,      // 无 usage 采集表
            active_users: 0,      // qa_history 无用户列
            satisfaction_rate: 0.0,
            trend: TrendSummary {
                conversations: conv_trend,
                messages: msg_trend,
                tokens: 0,
            },
        },
        "Success",
    ))
}

/// GET /dashboard/activity-trend?days=7&group_by=day|hour
pub async fn get_activity_trend(
    State(state): State<AppState>,
    Query(params): Query<ActivityTrendQuery>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<TrendPoint>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let days = params.days.unwrap_or(7).clamp(1, 90);
    let group_by = params.group_by.as_deref().unwrap_or("day");

    let mut points: Vec<TrendPoint> = Vec::new();
    let sql = match group_by {
        "hour" => {
            "SELECT to_char(date_trunc('hour', created_at), 'YYYY-MM-DD\"T\"HH24:00') AS d, COUNT(*)
             FROM ai.qa_history
             WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)
               AND created_at >= NOW() - make_interval(days => $2::int)
             GROUP BY date_trunc('hour', created_at) ORDER BY d"
        }
        _ => {
            "SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, COUNT(*)
             FROM ai.qa_history
             WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)
               AND created_at >= NOW() - make_interval(days => $2::int)
             GROUP BY date_trunc('day', created_at) ORDER BY d"
        }
    };

    match sqlx::query(sql).bind(tenant_id).bind(days).fetch_all(&state.pool).await {
        Ok(rows) => {
            for row in rows {
                let date: String = row.get("d");
                let count: i64 = row.get("count");
                points.push(TrendPoint {
                    date,
                    conversations: count,
                    messages: count,
                    tokens: 0,
                });
            }
        }
        Err(e) => return Json(ApiResponse::<Vec<TrendPoint>>::error(500, &e.to_string())),
    }

    Json(ApiResponse::success(points, "Success"))
}

/// GET /dashboard/feature-usage
pub async fn get_feature_usage(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<FeatureUsageItem>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let counts: Vec<(String, String, i64)> = match sqlx::query_as(
        "SELECT 'qa' AS f, '智能问答' AS l, COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)
         UNION ALL
         SELECT 'documents', '文档解析', COUNT(*) FROM ai.documents WHERE deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)
         UNION ALL
         SELECT 'analysis', '智能分析', COUNT(*) FROM ai.analysis_results WHERE (tenant_id IS NULL OR tenant_id = $1)
         UNION ALL
         SELECT 'vectors', '向量检索', COUNT(*) FROM ai.vectors WHERE (tenant_id IS NULL OR tenant_id = $1)",
    )
    .bind(tenant_id)
    .bind(tenant_id)
    .bind(tenant_id)
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows
            .into_iter()
            .map(|(f, l, c)| (f, l, c))
            .collect(),
        Err(e) => return Json(ApiResponse::<Vec<FeatureUsageItem>>::error(500, &e.to_string())),
    };

    let sum: i64 = counts.iter().map(|(_, _, c)| c).sum();
    let items = counts
        .into_iter()
        .map(|(feature, label, count)| FeatureUsageItem {
            feature,
            label,
            count,
            percentage: if sum > 0 {
                (count as f64 / sum as f64 * 10000.0).round() / 100.0
            } else {
                0.0
            },
        })
        .collect();

    Json(ApiResponse::success(items, "Success"))
}

// ========== Models ==========

#[derive(Debug, Serialize)]
pub struct ModelItem {
    pub id: Uuid,
    pub name: String,
    pub provider: String,
    pub r#type: String,
    pub status: String,
    pub description: Option<String>,
    pub max_tokens: Option<i32>,
    pub pricing: Option<serde_json::Value>,
    pub capabilities: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ModelConfig {
    pub model_id: Uuid,
    pub temperature: f64,
    pub max_tokens: Option<i32>,
    pub top_p: f64,
    pub frequency_penalty: f64,
    pub presence_penalty: f64,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ModelConfigUpdate {
    pub temperature: Option<f64>,
    pub max_tokens: Option<i32>,
    pub top_p: Option<f64>,
    pub frequency_penalty: Option<f64>,
    pub presence_penalty: Option<f64>,
    pub system_prompt: Option<String>,
}

/// GET /models
pub async fn list_models(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ModelItem>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query_as::<_, (Uuid, String, String, String, String, Option<String>, Option<i32>, Option<serde_json::Value>, Option<serde_json::Value>)>(
        "SELECT id, name, provider, type, status, description, max_tokens, pricing, capabilities
         FROM ai.ai_models WHERE tenant_id IS NULL OR tenant_id = $1 ORDER BY created_at",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(
            rows.into_iter()
                .map(|(id, name, provider, r#type, status, description, max_tokens, pricing, capabilities)| ModelItem {
                    id, name, provider, r#type, status, description, max_tokens, pricing, capabilities,
                })
                .collect(),
            "Success",
        )),
        Err(e) => Json(ApiResponse::<Vec<ModelItem>>::error(500, &e.to_string())),
    }
}

/// GET /models/{id}/config
pub async fn get_model_config(
    State(state): State<AppState>,
    Path(model_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ModelConfig>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query_as::<_, (Uuid, f64, Option<i32>, f64, f64, f64, Option<String>)>(
        "SELECT id, temperature::float8, max_tokens, top_p::float8, frequency_penalty::float8,
                presence_penalty::float8, system_prompt
         FROM ai.ai_models WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)",
    )
    .bind(model_id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some((model_id, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, system_prompt))) => Json(
            ApiResponse::success(
                ModelConfig {
                    model_id,
                    temperature,
                    max_tokens,
                    top_p,
                    frequency_penalty,
                    presence_penalty,
                    system_prompt,
                },
                "Success",
            ),
        ),
        Ok(None) => Json(ApiResponse::<ModelConfig>::error(404, "模型不存在")),
        Err(e) => Json(ApiResponse::<ModelConfig>::error(500, &e.to_string())),
    }
}

/// PUT /models/{id}/config
pub async fn update_model_config(
    State(state): State<AppState>,
    Path(model_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<ModelConfigUpdate>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let result = sqlx::query(
        "UPDATE ai.ai_models SET
            temperature = COALESCE($1, temperature),
            max_tokens = COALESCE($2, max_tokens),
            top_p = COALESCE($3, top_p),
            frequency_penalty = COALESCE($4, frequency_penalty),
            presence_penalty = COALESCE($5, presence_penalty),
            system_prompt = COALESCE($6, system_prompt),
            updated_at = NOW()
         WHERE id = $7 AND (tenant_id IS NULL OR tenant_id = $8)",
    )
    .bind(payload.temperature)
    .bind(payload.max_tokens)
    .bind(payload.top_p)
    .bind(payload.frequency_penalty)
    .bind(payload.presence_penalty)
    .bind(payload.system_prompt)
    .bind(model_id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({ "success": true }),
            "Success",
        )),
        Ok(_) => Json(ApiResponse::<serde_json::Value>::error(404, "模型不存在")),
        Err(e) => Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string())),
    }
}

#[derive(Debug, Deserialize)]
pub struct UsageStatsQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub model_id: Option<Uuid>,
    pub group_by: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UsageBreakdown {
    pub date: String,
    pub model_id: String,
    pub tokens: i64,
    pub requests: i64,
    pub cost: f64,
}

#[derive(Debug, Serialize)]
pub struct UsageStats {
    pub total_tokens: i64,
    pub total_requests: i64,
    pub total_cost: f64,
    pub breakdown: Vec<UsageBreakdown>,
}

/// GET /models/usage — 无 usage 采集表（ai 服务尚未接 token 计量），返回空结构与 0，待 usage 模块落地
pub async fn get_model_usage(
    State(_state): State<AppState>,
    Query(_params): Query<UsageStatsQuery>,
    _claims: Extension<Claims>,
) -> Json<ApiResponse<UsageStats>> {
    Json(ApiResponse::success(
        UsageStats {
            total_tokens: 0,
            total_requests: 0,
            total_cost: 0.0,
            breakdown: Vec::new(),
        },
        "Success",
    ))
}
