//! 模型管理与 AI 仪表盘 Handlers（known_gap A 组补全，2026-09-09）
//!
//! 对齐前端契约 apps/web/src/api/ai/index.ts：
//! - GET  /dashboard/stats              — 聚合统计（documents/qa_history 真实计数；tokens/users 无采集表返回 0）
//! - GET  /dashboard/activity-trend     — 按天/小时分组活动趋势（qa_history 真实数据）
//! - GET  /dashboard/feature-usage      — 各功能模块用量占比（真实表计数）
//! - GET  /models                       — 模型列表（ai.ai_models）
//! - GET  /models/{id}/config           — 模型运行配置
//! - PUT  /models/{id}/config           — 更新模型运行配置
//! - GET  /models/usage                 — 用量统计（ai.model_usage_stats 真实聚合）
//!
//! 数据口径：统计类端点只聚合现有真实表（ai.qa_history / ai.documents / ai.analysis_results /
//! ai.vectors / ai.qa_history）；tokens/active_users/satisfaction_rate/cost 等无数据源字段
//! 一律返回 0，不做估算伪造。

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::{get_tenant_id_from_claims, Claims};
use topems_shared_core::error::TopemsError;
use topems_shared_core::locale::Locale;
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dashboard/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_dashboard_stats(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<DashboardStats>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<DashboardStats>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<DashboardStats>::from(TopemsError::internal(
                "获取仪表盘统计失败",
                e,
            )))
        }
    };

    let (documents, qa_count, conv_trend, msg_trend, total_tokens, trend_tokens, active_users): (i64, i64, i64, i64, i64, i64, i64) =
        match sqlx::query(
            "SELECT
                (SELECT COUNT(*) FROM ai.documents WHERE deleted_at IS NULL),
                (SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL),
                (SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'),
                (SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'),
                (SELECT COALESCE(SUM(COALESCE(tokens_in, 0)) + SUM(COALESCE(tokens_out, 0)), 0) FROM ai.usage_logs),
                (SELECT COALESCE(SUM(COALESCE(tokens_in, 0)) + SUM(COALESCE(tokens_out, 0)), 0) FROM ai.usage_logs WHERE created_at >= NOW() - INTERVAL '7 days'),
                (SELECT COUNT(DISTINCT user_id) FROM public.audit_logs WHERE action LIKE 'ask%')",
        )
        .fetch_one(&mut scope)
        .await
        {
            Ok(row) => (row.get(0), row.get(1), row.get(2), row.get(3), row.get(4), row.get(5), row.get(6)),
            Err(e) => return Json(ApiResponse::<DashboardStats>::from(TopemsError::internal("获取仪表盘统计失败", e))),
        };
    let _ = scope.commit().await;

    Json(ApiResponse::success(
        DashboardStats {
            total_conversations: qa_count,
            total_messages: qa_count,
            total_documents: documents,
            total_tokens,
            active_users,
            satisfaction_rate: 0.0,
            trend: TrendSummary {
                conversations: conv_trend,
                messages: msg_trend,
                tokens: trend_tokens,
            },
        },
        "Success",
    ))
}

/// GET /dashboard/activity-trend?days=7&group_by=day|hour
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dashboard/activity-trend",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_activity_trend(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(params): Query<ActivityTrendQuery>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<TrendPoint>>> {
    let days = params.days.unwrap_or(7).clamp(1, 90);
    let group_by = params.group_by.as_deref().unwrap_or("day");

    let mut points: Vec<TrendPoint> = Vec::new();
    let sql = match group_by {
        "hour" => {
            "SELECT to_char(date_trunc('hour', q.created_at), 'YYYY-MM-DD\"T\"HH24:00') AS d, COUNT(*) AS count,
                    COALESCE(SUM(COALESCE(u.tokens_in, 0)) + SUM(COALESCE(u.tokens_out, 0)), 0) AS tokens
             FROM ai.qa_history q
             LEFT JOIN ai.usage_logs u ON u.qa_id = q.id
             WHERE q.deleted_at IS NULL
               AND q.created_at >= NOW() - make_interval(days => $1::int)
             GROUP BY date_trunc('hour', q.created_at) ORDER BY d"
        }
        _ => {
            "SELECT to_char(date_trunc('day', q.created_at), 'YYYY-MM-DD') AS d, COUNT(*) AS count,
                    COALESCE(SUM(COALESCE(u.tokens_in, 0)) + SUM(COALESCE(u.tokens_out, 0)), 0) AS tokens
             FROM ai.qa_history q
             LEFT JOIN ai.usage_logs u ON u.qa_id = q.id
             WHERE q.deleted_at IS NULL
               AND q.created_at >= NOW() - make_interval(days => $1::int)
             GROUP BY date_trunc('day', q.created_at) ORDER BY d"
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<Vec<TrendPoint>>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<Vec<TrendPoint>>::from(TopemsError::internal(
                "获取活动趋势失败",
                e,
            )))
        }
    };

    match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(days)
        .fetch_all(&mut scope)
        .await
    {
        Ok(rows) => {
            for row in rows {
                let date: String = row.get("d");
                let count: i64 = row.get("count");
                let tokens: i64 = row.try_get("tokens").unwrap_or(0);
                points.push(TrendPoint {
                    date,
                    conversations: count,
                    messages: count,
                    tokens,
                });
            }
        }
        Err(e) => {
            return Json(ApiResponse::<Vec<TrendPoint>>::from(TopemsError::internal(
                "获取活动趋势失败",
                e,
            )))
        }
    }
    let _ = scope.commit().await;

    Json(ApiResponse::success(points, "Success"))
}

/// GET /dashboard/feature-usage
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dashboard/feature-usage",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_feature_usage(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<FeatureUsageItem>>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<Vec<FeatureUsageItem>>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<Vec<FeatureUsageItem>>::from(
                TopemsError::internal("获取功能使用统计失败", e),
            ))
        }
    };
    let counts: Vec<(String, String, i64)> = match sqlx::query_as(
        "SELECT 'qa' AS f, '智能问答' AS l, COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL
         UNION ALL
         SELECT 'documents', '文档解析', COUNT(*) FROM ai.documents WHERE deleted_at IS NULL
         UNION ALL
         SELECT 'analysis', '智能分析', COUNT(*) FROM ai.analysis_results
         UNION ALL
         -- ai.vectors 表无 tenant_id 列（schema 漂移），向量统计不按租户过滤
         SELECT 'vectors', '向量检索', COUNT(*) FROM ai.vectors WHERE deleted_at IS NULL",
    )
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => rows.into_iter().collect(),
        Err(e) => {
            return Json(ApiResponse::<Vec<FeatureUsageItem>>::from(
                TopemsError::internal("获取功能使用统计失败", e),
            ))
        }
    };
    let _ = scope.commit().await;

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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/models",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn list_models(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<ModelItem>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let locale = Locale::from_headers(&headers).as_sql();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<Vec<ModelItem>>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<Vec<ModelItem>>::from(TopemsError::internal(
                "获取模型列表失败",
                e,
            )))
        }
    };
    let model_sql = "SELECT id,
                CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                provider, type, status, description, max_tokens, pricing, capabilities
         FROM ai.ai_models WHERE tenant_id = $1 ORDER BY created_at";
    type ModelRow = (
        Uuid,
        String,
        String,
        String,
        String,
        Option<String>,
        Option<i32>,
        Option<serde_json::Value>,
        Option<serde_json::Value>,
    );
    let to_item = |(
        id,
        name,
        provider,
        r#type,
        status,
        description,
        max_tokens,
        pricing,
        capabilities,
    ): ModelRow| ModelItem {
        id,
        name,
        provider,
        r#type,
        status,
        description,
        max_tokens,
        pricing,
        capabilities,
    };

    let tenant_rows = match sqlx::query_as::<_, ModelRow>(model_sql)
        .bind(tenant_id)
        .bind(locale)
        .fetch_all(&mut scope)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(ApiResponse::<Vec<ModelItem>>::from(TopemsError::internal(
                "获取模型列表失败",
                e,
            )))
        }
    };

    // 平台全局模型（PLATFORM_TENANT_ID）：系统只读通道 + 显式平台谓词，追加在租户模型之后。
    let platform_rows = {
        let mut pscope = match state.db.scope_read_platform().await {
            Ok(s) => s,
            Err(e) => {
                return Json(ApiResponse::<Vec<ModelItem>>::from(TopemsError::internal(
                    "获取模型列表失败",
                    e,
                )))
            }
        };
        let result = sqlx::query_as::<_, ModelRow>(model_sql)
            .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
            .bind(locale)
            .fetch_all(&mut pscope)
            .await;
        let _ = pscope.rollback().await;
        match result {
            Ok(rows) => rows,
            Err(e) => {
                return Json(ApiResponse::<Vec<ModelItem>>::from(TopemsError::internal(
                    "获取模型列表失败",
                    e,
                )))
            }
        }
    };

    let items: Vec<ModelItem> = tenant_rows
        .into_iter()
        .chain(platform_rows)
        .map(to_item)
        .collect();
    Json(ApiResponse::success(items, "Success"))
}

/// GET /models/{id}/config
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/models/{id}/config",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_model_config(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(model_id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<ModelConfig>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<ModelConfig>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<ModelConfig>::from(TopemsError::internal(
                "获取模型配置失败",
                e,
            )))
        }
    };
    let config_sql =
        "SELECT id, temperature::float8, max_tokens, top_p::float8, frequency_penalty::float8,
                presence_penalty::float8, system_prompt
         FROM ai.ai_models WHERE id = $1 AND tenant_id = $2";
    let tenant_row = match sqlx::query_as::<
        _,
        (Uuid, f64, Option<i32>, f64, f64, f64, Option<String>),
    >(config_sql)
    .bind(model_id)
    .bind(_claims.tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            return Json(ApiResponse::<ModelConfig>::from(TopemsError::internal(
                "获取模型配置失败",
                e,
            )))
        }
    };

    let row = match tenant_row {
        Some(row) => Some(row),
        None => {
            // 租户域未命中 → 平台全局模型兜底（显式平台谓词，只读通道）。
            let mut pscope = match state.db.scope_read_platform().await {
                Ok(s) => s,
                Err(e) => {
                    return Json(ApiResponse::<ModelConfig>::from(TopemsError::internal(
                        "获取模型配置失败",
                        e,
                    )))
                }
            };
            let result =
                sqlx::query_as::<_, (Uuid, f64, Option<i32>, f64, f64, f64, Option<String>)>(
                    config_sql,
                )
                .bind(model_id)
                .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
                .fetch_optional(&mut pscope)
                .await;
            let _ = pscope.rollback().await;
            match result {
                Ok(v) => v,
                Err(e) => {
                    return Json(ApiResponse::<ModelConfig>::from(TopemsError::internal(
                        "获取模型配置失败",
                        e,
                    )))
                }
            }
        }
    };

    match row {
        Some((
            model_id,
            temperature,
            max_tokens,
            top_p,
            frequency_penalty,
            presence_penalty,
            system_prompt,
        )) => Json(ApiResponse::success(
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
        )),
        None => Json(ApiResponse::<ModelConfig>::not_found("模型不存在")),
    }
}

/// PUT /models/{id}/config
#[utoipa::path(
    put,
    path = "/api/ai/models/{id}/config",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn update_model_config(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(model_id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Json(payload): Json<ModelConfigUpdate>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<serde_json::Value>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<serde_json::Value>::from(
                TopemsError::internal("更新模型配置失败", e),
            ))
        }
    };
    let result = sqlx::query(
        "UPDATE ai.ai_models SET
            temperature = COALESCE($1, temperature),
            max_tokens = COALESCE($2, max_tokens),
            top_p = COALESCE($3, top_p),
            frequency_penalty = COALESCE($4, frequency_penalty),
            presence_penalty = COALESCE($5, presence_penalty),
            system_prompt = COALESCE($6, system_prompt),
            updated_at = NOW()
         WHERE id = $7",
    )
    .bind(payload.temperature)
    .bind(payload.max_tokens)
    .bind(payload.top_p)
    .bind(payload.frequency_penalty)
    .bind(payload.presence_penalty)
    .bind(payload.system_prompt)
    .bind(model_id)
    .execute(&mut scope)
    .await;
    let _ = scope.commit().await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({ "success": true }),
            "Success",
        )),
        Ok(_) => Json(ApiResponse::<serde_json::Value>::not_found("模型不存在")),
        Err(e) => Json(ApiResponse::<serde_json::Value>::from(
            TopemsError::internal("更新模型配置失败", e),
        )),
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

/// GET /models/usage — 从 ai.model_usage_stats 真实聚合（按租户/日期/模型过滤）
#[allow(unused_assignments)]
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/models/usage",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_model_usage(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(params): Query<UsageStatsQuery>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<UsageStats>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<UsageStats>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<UsageStats>::from(TopemsError::internal(
                "获取模型使用统计失败",
                e,
            )))
        }
    };

    // 构建动态过滤子句
    let mut where_clauses: Vec<String> = Vec::new();
    let mut param_idx = 1;

    if params.start_date.is_some() {
        where_clauses.push(format!("date >= ${}::date", param_idx));
        param_idx += 1;
    }
    if params.end_date.is_some() {
        where_clauses.push(format!("date <= ${}::date", param_idx));
        param_idx += 1;
    }
    if params.model_id.is_some() {
        where_clauses.push(format!("model_id = ${}::uuid", param_idx));
        param_idx += 1;
    }

    let where_sql = if where_clauses.is_empty() {
        "TRUE".to_string()
    } else {
        where_clauses.join(" AND ")
    };

    // 1) 总计聚合
    let total_sql = format!(
        "SELECT COALESCE(SUM(token_count), 0) AS total_tokens, \
                COALESCE(SUM(request_count), 0) AS total_requests \
         FROM ai.model_usage_stats WHERE {}",
        where_sql
    );

    let mut total_query = sqlx::query(sqlx::AssertSqlSafe(total_sql));
    if let Some(ref sd) = params.start_date {
        total_query = total_query.bind(sd);
    }
    if let Some(ref ed) = params.end_date {
        total_query = total_query.bind(ed);
    }
    if let Some(mid) = params.model_id {
        total_query = total_query.bind(mid);
    }

    let (total_tokens, total_requests) = match total_query.fetch_one(&mut scope).await {
        Ok(row) => {
            let tt: i64 = row.try_get("total_tokens").unwrap_or(0);
            let tr: i64 = row.try_get("total_requests").unwrap_or(0);
            (tt, tr)
        }
        Err(e) => {
            return Json(ApiResponse::<UsageStats>::from(TopemsError::internal(
                "获取模型使用统计失败",
                e,
            )))
        }
    };

    // 2) 按日期+模型分组的明细
    let breakdown_sql = format!(
        "SELECT to_char(date, 'YYYY-MM-DD') AS d, model_id::text AS mid, \
                SUM(token_count) AS tokens, SUM(request_count) AS requests \
         FROM ai.model_usage_stats WHERE {} \
         GROUP BY date, model_id ORDER BY date DESC, model_id",
        where_sql
    );

    let mut breakdown_query = sqlx::query(sqlx::AssertSqlSafe(breakdown_sql));
    if let Some(ref sd) = params.start_date {
        breakdown_query = breakdown_query.bind(sd);
    }
    if let Some(ref ed) = params.end_date {
        breakdown_query = breakdown_query.bind(ed);
    }
    if let Some(mid) = params.model_id {
        breakdown_query = breakdown_query.bind(mid);
    }

    let mut breakdown: Vec<UsageBreakdown> = Vec::new();
    match breakdown_query.fetch_all(&mut scope).await {
        Ok(rows) => {
            for row in rows {
                let date: String = row.try_get("d").unwrap_or_default();
                let model_id_str: String = row.try_get("mid").unwrap_or_default();
                let tokens: i64 = row.try_get("tokens").unwrap_or(0);
                let requests: i64 = row.try_get("requests").unwrap_or(0);
                breakdown.push(UsageBreakdown {
                    date,
                    model_id: model_id_str,
                    tokens,
                    requests,
                    cost: 0.0, // 暂无单价数据，后续可关联 ai_models.pricing 计算
                });
            }
        }
        Err(e) => {
            return Json(ApiResponse::<UsageStats>::from(TopemsError::internal(
                "获取模型使用统计失败",
                e,
            )))
        }
    }
    let _ = scope.commit().await;

    Json(ApiResponse::success(
        UsageStats {
            total_tokens,
            total_requests,
            total_cost: 0.0,
            breakdown,
        },
        "Success",
    ))
}
