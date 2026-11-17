//! Prompt 模板管理 Handlers（known_gap A 组补全，2026-09-09）
//!
//! 对齐前端契约 apps/web/src/api/ai/index.ts + packages/shared-types AITemplate：
//! - GET    /prompts/templates             — 分页列表（search/category/is_favorite 过滤）
//! - GET    /prompts/templates/{id}        — 模板详情
//! - POST   /prompts/templates             — 新建模板
//! - PUT    /prompts/templates/{id}        — 更新模板
//! - DELETE /prompts/templates/{id}        — 删除模板
//! - POST   /prompts/templates/{id}/favorite — 收藏/取消收藏
//! - GET    /prompts/categories            — 分类计数
//! - POST   /prompts/templates/{id}/use    — 使用模板（变量替换生成提示词，usage_count+1）
//!
//! 字段约定：AITemplate.promptTemplate 前端为 camelCase，DB 列为 prompt_template；
//! serde 显式 rename 对齐（输出与输入均为 promptTemplate）。
//! /use 端点只做模板渲染（变量替换），不假装 LLM 输出——result 即渲染后的提示词文本。

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

#[derive(Debug, Serialize)]
pub struct PromptTemplateOut {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub category: String,
    pub fields: serde_json::Value,
    #[serde(rename = "promptTemplate")]
    pub prompt_template: String,
    pub is_favorite: bool,
    pub usage_count: i64,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct PromptTemplatePayload {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_category")]
    pub category: String,
    #[serde(default = "default_fields")]
    pub fields: serde_json::Value,
    #[serde(rename = "promptTemplate")]
    pub prompt_template: String,
}

fn default_category() -> String {
    "通用".to_string()
}

fn default_fields() -> serde_json::Value {
    serde_json::json!([])
}

#[derive(Debug, Deserialize)]
pub struct PromptTemplateListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub is_favorite: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PromptTemplateList {
    pub items: Vec<PromptTemplateOut>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
pub struct PromptCategory {
    pub id: String,
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct FavoriteResult {
    pub id: Uuid,
    pub is_favorite: bool,
}

#[derive(Debug, Deserialize)]
pub struct UsePromptRequest {
    #[serde(default)]
    pub variables: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct UsePromptResult {
    pub result: String,
    pub formatted_prompt: String,
}

fn to_out(row: &sqlx::postgres::PgRow) -> Result<PromptTemplateOut, TopemsError> {
    Ok(PromptTemplateOut {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        description: row.try_get("description")?,
        category: row.try_get("category")?,
        fields: row.try_get("fields")?,
        prompt_template: row.try_get("prompt_template")?,
        is_favorite: row.try_get("is_favorite")?,
        usage_count: row.try_get("usage_count")?,
        created_at: row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at")?,
        updated_at: row.try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at")?,
    })
}

/// GET /prompts/templates
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/prompts/templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn list_prompt_templates(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(params): Query<PromptTemplateListQuery>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<PromptTemplateList>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let search: Option<String> = params.search.clone();
    let category: Option<String> = params.category.clone();
    let is_fav: Option<bool> = params.is_favorite.as_deref().map(|v| v == "true");
    let locale = Locale::from_headers(&headers).as_sql();

    // 租户域只查本租户行；平台内置模板（PLATFORM_TENANT_ID）由下方只读通道补齐。
    let where_sql = "tenant_id = $1
       AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR category = $3)
       AND ($4::boolean IS NULL OR is_favorite = $4)";

    let q_count = format!("SELECT COUNT(*) FROM ai.ai_prompt_templates WHERE {where_sql}");
    let q_list = format!(
        "SELECT id,
                CASE WHEN $7 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at
         FROM ai.ai_prompt_templates WHERE {where_sql} ORDER BY updated_at DESC LIMIT $5 OFFSET $6"
    );

    let total: i64 = {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Json(ApiResponse::<PromptTemplateList>::server_error(
                "RLS 事务中间件未注入",
            ));
        };
        let mut scope = match state.db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => {
                return Json(ApiResponse::<PromptTemplateList>::from(
                    TopemsError::internal("获取提示词模板列表失败", e),
                ))
            }
        };
        match sqlx::query(sqlx::AssertSqlSafe(q_count))
            .bind(tenant_id)
            .bind(&search)
            .bind(&category)
            .bind(is_fav)
            .fetch_one(&mut scope)
            .await
        {
            Ok(row) => row.get(0),
            Err(e) => {
                return Json(ApiResponse::<PromptTemplateList>::from(
                    TopemsError::internal("获取提示词模板列表失败", e),
                ))
            }
        }
    };

    let mut items = {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Json(ApiResponse::<PromptTemplateList>::server_error(
                "RLS 事务中间件未注入",
            ));
        };
        let mut scope = match state.db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => {
                return Json(ApiResponse::<PromptTemplateList>::from(
                    TopemsError::internal("获取提示词模板列表失败", e),
                ))
            }
        };
        match sqlx::query(sqlx::AssertSqlSafe(q_list))
            .bind(tenant_id)
            .bind(&search)
            .bind(&category)
            .bind(is_fav)
            .bind(page_size)
            .bind(offset)
            .bind(locale)
            .fetch_all(&mut scope)
            .await
        {
            Ok(rows) => {
                let mut out = Vec::new();
                for row in rows {
                    match to_out(&row) {
                        Ok(item) => out.push(item),
                        Err(e) => {
                            return Json(ApiResponse::<PromptTemplateList>::from(
                                TopemsError::internal("获取提示词模板列表失败", e),
                            ))
                        }
                    }
                }
                out
            }
            Err(e) => {
                return Json(ApiResponse::<PromptTemplateList>::from(
                    TopemsError::internal("获取提示词模板列表失败", e),
                ))
            }
        }
    };

    // 平台内置模板：系统只读通道 + 显式平台谓词，排在租户行之后按合并序列分页。
    let q_platform = format!(
        "SELECT id,
                CASE WHEN $5 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at
         FROM ai.ai_prompt_templates WHERE {where_sql} ORDER BY updated_at DESC"
    );
    let platform_items = {
        let mut pscope = match state.db.scope_read_platform().await {
            Ok(s) => s,
            Err(e) => {
                return Json(ApiResponse::<PromptTemplateList>::from(
                    TopemsError::internal("获取提示词模板列表失败", e),
                ))
            }
        };
        let result = sqlx::query(sqlx::AssertSqlSafe(q_platform))
            .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
            .bind(&search)
            .bind(&category)
            .bind(is_fav)
            .bind(locale)
            .fetch_all(&mut pscope)
            .await;
        let _ = pscope.rollback().await;
        match result {
            Ok(rows) => {
                let mut out = Vec::new();
                for row in rows {
                    match to_out(&row) {
                        Ok(item) => out.push(item),
                        Err(e) => {
                            return Json(ApiResponse::<PromptTemplateList>::from(
                                TopemsError::internal("获取提示词模板列表失败", e),
                            ))
                        }
                    }
                }
                out
            }
            Err(e) => {
                return Json(ApiResponse::<PromptTemplateList>::from(
                    TopemsError::internal("获取提示词模板列表失败", e),
                ))
            }
        }
    };

    // usize→i64 用受检转换并饱和到 i64::MAX，避免 as 截断/回绕
    let platform_len = i64::try_from(platform_items.len()).unwrap_or(i64::MAX);
    let total = total + platform_len;
    let skip = usize::try_from((offset - (total - platform_len)).max(0)).unwrap_or(0);
    let remaining = usize::try_from(page_size)
        .unwrap_or(0)
        .saturating_sub(items.len());
    items.extend(platform_items.into_iter().skip(skip).take(remaining));

    Json(ApiResponse::success(
        PromptTemplateList {
            items,
            total,
            page,
            page_size,
            total_pages: if page_size > 0 {
                (total + page_size - 1) / page_size
            } else {
                0
            },
        },
        "Success",
    ))
}

/// GET /prompts/templates/{id}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/prompts/templates/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_prompt_template(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<PromptTemplateOut>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let locale = Locale::from_headers(&headers).as_sql();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<PromptTemplateOut>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("获取提示词模板失败", e),
            ))
        }
    };
    let tenant_row = match sqlx::query(
        "SELECT id,
                CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at
         FROM ai.ai_prompt_templates WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(locale)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            return Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("获取提示词模板失败", e),
            ))
        }
    };

    let row = match tenant_row {
        Some(row) => Some(row),
        None => {
            // 租户域未命中 → 平台内置模板兜底（显式平台谓词，只读通道）。
            let mut pscope = match state.db.scope_read_platform().await {
                Ok(s) => s,
                Err(e) => {
                    return Json(ApiResponse::<PromptTemplateOut>::from(
                        TopemsError::internal("获取提示词模板失败", e),
                    ))
                }
            };
            let result = sqlx::query(
                "SELECT id,
                        CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                        description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at
                 FROM ai.ai_prompt_templates WHERE id = $1 AND tenant_id = $2",
            )
            .bind(id)
            .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
            .bind(locale)
            .fetch_optional(&mut pscope)
            .await;
            let _ = pscope.rollback().await;
            match result {
                Ok(v) => v,
                Err(e) => {
                    return Json(ApiResponse::<PromptTemplateOut>::from(
                        TopemsError::internal("获取提示词模板失败", e),
                    ))
                }
            }
        }
    };

    match row {
        Some(row) => match to_out(&row) {
            Ok(item) => Json(ApiResponse::success(item, "Success")),
            Err(e) => Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("获取提示词模板失败", e),
            )),
        },
        None => Json(ApiResponse::<PromptTemplateOut>::not_found("模板不存在")),
    }
}

/// POST /prompts/templates
pub async fn create_prompt_template(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PromptTemplatePayload>,
) -> Json<ApiResponse<PromptTemplateOut>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<PromptTemplateOut>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("创建提示词模板失败", e),
            ))
        }
    };
    let result = sqlx::query(
        "INSERT INTO ai.ai_prompt_templates (tenant_id, name, description, category, fields, prompt_template)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at",
    )
    .bind(tenant_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.category)
    .bind(&payload.fields)
    .bind(&payload.prompt_template)
    .fetch_one(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(row) => match to_out(&row) {
            Ok(item) => Json(ApiResponse::success(item, "Created")),
            Err(e) => Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("创建提示词模板失败", e),
            )),
        },
        Err(e) => Json(ApiResponse::<PromptTemplateOut>::from(
            TopemsError::internal("创建提示词模板失败", e),
        )),
    }
}

/// PUT /prompts/templates/{id}
pub async fn update_prompt_template(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PromptTemplatePayload>,
) -> Json<ApiResponse<PromptTemplateOut>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<PromptTemplateOut>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("更新提示词模板失败", e),
            ))
        }
    };
    let result = sqlx::query(
        "UPDATE ai.ai_prompt_templates SET
            name = $3, description = $4, category = $5, fields = $6, prompt_template = $7, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, name, description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.category)
    .bind(&payload.fields)
    .bind(&payload.prompt_template)
    .fetch_optional(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(Some(row)) => match to_out(&row) {
            Ok(item) => Json(ApiResponse::success(item, "Success")),
            Err(e) => Json(ApiResponse::<PromptTemplateOut>::from(
                TopemsError::internal("更新提示词模板失败", e),
            )),
        },
        Ok(None) => Json(ApiResponse::<PromptTemplateOut>::not_found("模板不存在")),
        Err(e) => Json(ApiResponse::<PromptTemplateOut>::from(
            TopemsError::internal("更新提示词模板失败", e),
        )),
    }
}

/// DELETE /prompts/templates/{id}
pub async fn delete_prompt_template(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<String>::server_error("RLS 事务中间件未注入"));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<String>::from(TopemsError::internal(
                "删除提示词模板失败",
                e,
            )))
        }
    };
    let result = sqlx::query("DELETE FROM ai.ai_prompt_templates WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await;
    let _ = scope.commit().await;
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(id.to_string(), "Success")),
        Ok(_) => Json(ApiResponse::<String>::not_found("模板不存在")),
        Err(e) => Json(ApiResponse::<String>::from(TopemsError::internal(
            "删除提示词模板失败",
            e,
        ))),
    }
}

/// POST /prompts/templates/{id}/favorite
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/prompts/templates/{id}/favorite",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn toggle_prompt_favorite(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<FavoriteResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<FavoriteResult>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<FavoriteResult>::from(TopemsError::internal(
                "切换提示词收藏失败",
                e,
            )))
        }
    };
    let result = sqlx::query(
        "UPDATE ai.ai_prompt_templates SET is_favorite = NOT is_favorite, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, is_favorite",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    let _ = scope.commit().await;
    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            FavoriteResult {
                id: row.try_get("id").unwrap_or(id),
                is_favorite: row.try_get("is_favorite").unwrap_or(false),
            },
            "Success",
        )),
        Ok(None) => Json(ApiResponse::<FavoriteResult>::not_found("模板不存在")),
        Err(e) => Json(ApiResponse::<FavoriteResult>::from(TopemsError::internal(
            "切换提示词收藏失败",
            e,
        ))),
    }
}

/// GET /prompts/categories
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/prompts/categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_prompt_categories(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<PromptCategory>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<Vec<PromptCategory>>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<Vec<PromptCategory>>::from(
                TopemsError::internal("获取提示词分类失败", e),
            ))
        }
    };
    let category_sql = "SELECT category, COUNT(*) AS count FROM ai.ai_prompt_templates
         WHERE tenant_id = $1
         GROUP BY category";
    let tenant_rows = match sqlx::query(category_sql)
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(ApiResponse::<Vec<PromptCategory>>::from(
                TopemsError::internal("获取提示词分类失败", e),
            ))
        }
    };

    // 平台内置模板分类计数合并（显式平台谓词，只读通道）。
    let platform_rows = {
        let mut pscope = match state.db.scope_read_platform().await {
            Ok(s) => s,
            Err(e) => {
                return Json(ApiResponse::<Vec<PromptCategory>>::from(
                    TopemsError::internal("获取提示词分类失败", e),
                ))
            }
        };
        let result = sqlx::query(category_sql)
            .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
            .fetch_all(&mut pscope)
            .await;
        let _ = pscope.rollback().await;
        match result {
            Ok(rows) => rows,
            Err(e) => {
                return Json(ApiResponse::<Vec<PromptCategory>>::from(
                    TopemsError::internal("获取提示词分类失败", e),
                ))
            }
        }
    };

    let mut counts: std::collections::BTreeMap<String, i64> = std::collections::BTreeMap::new();
    for row in tenant_rows.iter().chain(platform_rows.iter()) {
        let category: String = row.try_get("category").unwrap_or_default();
        let count: i64 = row.try_get("count").unwrap_or(0);
        *counts.entry(category).or_insert(0) += count;
    }
    let mut items: Vec<PromptCategory> = counts
        .into_iter()
        .map(|(category, count)| PromptCategory {
            id: category.clone(),
            name: category,
            count,
        })
        .collect();
    items.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.id.cmp(&b.id)));
    Json(ApiResponse::success(items, "Success"))
}

/// POST /prompts/templates/{id}/use — 模板渲染（变量替换），usage_count+1
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/prompts/templates/{id}/use",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn use_prompt_template(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UsePromptRequest>,
) -> Json<ApiResponse<UsePromptResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(ApiResponse::<UsePromptResult>::server_error(
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::<UsePromptResult>::from(TopemsError::internal(
                "使用提示词模板失败",
                e,
            )))
        }
    };
    let template = match sqlx::query(
        "UPDATE ai.ai_prompt_templates SET usage_count = usage_count + 1, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING prompt_template",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => row
            .try_get::<String, _>("prompt_template")
            .unwrap_or_default(),
        Ok(None) => {
            // 平台内置模板仍可使用：只读通道取模板原文，不在租户事务里累计 usage_count。
            let mut pscope = match state.db.scope_read_platform().await {
                Ok(s) => s,
                Err(e) => {
                    return Json(ApiResponse::<UsePromptResult>::from(TopemsError::internal(
                        "使用提示词模板失败",
                        e,
                    )))
                }
            };
            let result = sqlx::query(
                "SELECT prompt_template FROM ai.ai_prompt_templates
                 WHERE id = $1 AND tenant_id = $2",
            )
            .bind(id)
            .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
            .fetch_optional(&mut pscope)
            .await;
            let _ = pscope.rollback().await;
            match result {
                Ok(Some(row)) => row
                    .try_get::<String, _>("prompt_template")
                    .unwrap_or_default(),
                Ok(None) => return Json(ApiResponse::<UsePromptResult>::not_found("模板不存在")),
                Err(e) => {
                    return Json(ApiResponse::<UsePromptResult>::from(TopemsError::internal(
                        "使用提示词模板失败",
                        e,
                    )))
                }
            }
        }
        Err(e) => {
            return Json(ApiResponse::<UsePromptResult>::from(TopemsError::internal(
                "使用提示词模板失败",
                e,
            )))
        }
    };
    let _ = scope.commit().await;

    // 变量替换：{name} 与 {{name}} 两种占位形式
    let mut formatted = template;
    for (key, value) in payload.variables.iter() {
        let replacement = match value {
            serde_json::Value::String(s) => s.clone(),
            other => other.to_string(),
        };
        formatted = formatted.replace(&format!("{{{{{key}}}}}"), &replacement);
        formatted = formatted.replace(&format!("{{{key}}}"), &replacement);
    }

    Json(ApiResponse::success(
        UsePromptResult {
            formatted_prompt: formatted.clone(),
            // 仅模板渲染，不假装 LLM 输出
            result: formatted,
        },
        "Success",
    ))
}
