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
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::{get_tenant_id_from_claims, Claims};
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
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
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
    pub pagesize: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub is_favorite: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PromptTemplateList {
    pub items: Vec<PromptTemplateOut>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
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

fn to_out(row: &sqlx::postgres::PgRow) -> Result<PromptTemplateOut, Box<dyn std::error::Error>> {
    Ok(PromptTemplateOut {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        description: row.try_get("description")?,
        category: row.try_get("category")?,
        fields: row.try_get("fields")?,
        prompt_template: row.try_get("prompt_template")?,
        is_favorite: row.try_get("is_favorite")?,
        usage_count: row.try_get("usage_count")?,
        created_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at")?
            .map(|t| t.to_rfc3339()),
        updated_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at")?
            .map(|t| t.to_rfc3339()),
    })
}

/// GET /prompts/templates
pub async fn list_prompt_templates(
    State(state): State<AppState>,
    Query(params): Query<PromptTemplateListQuery>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<PromptTemplateList>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    let search: Option<String> = params.search.clone();
    let category: Option<String> = params.category.clone();
    let is_fav: Option<bool> = params.is_favorite.as_deref().map(|v| v == "true");

    let where_sql = "(tenant_id IS NULL OR tenant_id = $1)
       AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR description ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR category = $3)
       AND ($4::boolean IS NULL OR is_favorite = $4)";

    let q_count = format!("SELECT COUNT(*) FROM ai.ai_prompt_templates WHERE {where_sql}");
    let q_list = format!(
        "SELECT id, name, description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at
         FROM ai.ai_prompt_templates WHERE {where_sql} ORDER BY updated_at DESC LIMIT $5 OFFSET $6"
    );

    let total: i64 = match sqlx::query(&q_count)
        .bind(tenant_id)
        .bind(&search)
        .bind(&category)
        .bind(is_fav)
        .fetch_one(&state.pool)
        .await
    {
        Ok(row) => row.get(0),
        Err(e) => {
            return Json(ApiResponse::<PromptTemplateList>::error(
                500,
                &e.to_string(),
            ))
        }
    };

    let items = match sqlx::query(&q_list)
        .bind(tenant_id)
        .bind(&search)
        .bind(&category)
        .bind(is_fav)
        .bind(pagesize)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
    {
        Ok(rows) => {
            let mut out = Vec::new();
            for row in rows {
                match to_out(&row) {
                    Ok(item) => out.push(item),
                    Err(e) => {
                        return Json(ApiResponse::<PromptTemplateList>::error(
                            500,
                            &e.to_string(),
                        ))
                    }
                }
            }
            out
        }
        Err(e) => {
            return Json(ApiResponse::<PromptTemplateList>::error(
                500,
                &e.to_string(),
            ))
        }
    };

    Json(ApiResponse::success(
        PromptTemplateList {
            items,
            total,
            page,
            pagesize,
            total_pages: if pagesize > 0 {
                (total + pagesize - 1) / pagesize
            } else {
                0
            },
        },
        "Success",
    ))
}

/// GET /prompts/templates/{id}
pub async fn get_prompt_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<PromptTemplateOut>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "SELECT id, name, description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at
         FROM ai.ai_prompt_templates WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => match to_out(&row) {
            Ok(item) => Json(ApiResponse::success(item, "Success")),
            Err(e) => Json(ApiResponse::<PromptTemplateOut>::error(500, &e.to_string())),
        },
        Ok(None) => Json(ApiResponse::<PromptTemplateOut>::error(404, "模板不存在")),
        Err(e) => Json(ApiResponse::<PromptTemplateOut>::error(500, &e.to_string())),
    }
}

/// POST /prompts/templates
pub async fn create_prompt_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PromptTemplatePayload>,
) -> Json<ApiResponse<PromptTemplateOut>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
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
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => match to_out(&row) {
            Ok(item) => Json(ApiResponse::success(item, "Created")),
            Err(e) => Json(ApiResponse::<PromptTemplateOut>::error(500, &e.to_string())),
        },
        Err(e) => Json(ApiResponse::<PromptTemplateOut>::error(500, &e.to_string())),
    }
}

/// PUT /prompts/templates/{id}
pub async fn update_prompt_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PromptTemplatePayload>,
) -> Json<ApiResponse<PromptTemplateOut>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "UPDATE ai.ai_prompt_templates SET
            name = $3, description = $4, category = $5, fields = $6, prompt_template = $7, updated_at = NOW()
         WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)
         RETURNING id, name, description, category, fields, prompt_template, is_favorite, usage_count::bigint, created_at, updated_at",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.category)
    .bind(&payload.fields)
    .bind(&payload.prompt_template)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => match to_out(&row) {
            Ok(item) => Json(ApiResponse::success(item, "Success")),
            Err(e) => Json(ApiResponse::<PromptTemplateOut>::error(500, &e.to_string())),
        },
        Ok(None) => Json(ApiResponse::<PromptTemplateOut>::error(404, "模板不存在")),
        Err(e) => Json(ApiResponse::<PromptTemplateOut>::error(500, &e.to_string())),
    }
}

/// DELETE /prompts/templates/{id}
pub async fn delete_prompt_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "DELETE FROM ai.ai_prompt_templates WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(id.to_string(), "Success")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "模板不存在")),
        Err(e) => Json(ApiResponse::<String>::error(500, &e.to_string())),
    }
}

/// POST /prompts/templates/{id}/favorite
pub async fn toggle_prompt_favorite(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<FavoriteResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "UPDATE ai.ai_prompt_templates SET is_favorite = NOT is_favorite, updated_at = NOW()
         WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)
         RETURNING id, is_favorite",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => Json(ApiResponse::success(
            FavoriteResult {
                id: row.try_get("id").unwrap_or(id),
                is_favorite: row.try_get("is_favorite").unwrap_or(false),
            },
            "Success",
        )),
        Ok(None) => Json(ApiResponse::<FavoriteResult>::error(404, "模板不存在")),
        Err(e) => Json(ApiResponse::<FavoriteResult>::error(500, &e.to_string())),
    }
}

/// GET /prompts/categories
pub async fn get_prompt_categories(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<PromptCategory>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "SELECT category, COUNT(*) AS count FROM ai.ai_prompt_templates
         WHERE (tenant_id IS NULL OR tenant_id = $1)
         GROUP BY category ORDER BY count DESC",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let mut items = Vec::new();
            for row in rows {
                items.push(PromptCategory {
                    id: row.try_get("category").unwrap_or_default(),
                    name: row.try_get("category").unwrap_or_default(),
                    count: row.try_get("count").unwrap_or(0),
                });
            }
            Json(ApiResponse::success(items, "Success"))
        }
        Err(e) => Json(ApiResponse::<Vec<PromptCategory>>::error(
            500,
            &e.to_string(),
        )),
    }
}

/// POST /prompts/templates/{id}/use — 模板渲染（变量替换），usage_count+1
pub async fn use_prompt_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UsePromptRequest>,
) -> Json<ApiResponse<UsePromptResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let template = match sqlx::query(
        "UPDATE ai.ai_prompt_templates SET usage_count = usage_count + 1, updated_at = NOW()
         WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)
         RETURNING prompt_template",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row
            .try_get::<String, _>("prompt_template")
            .unwrap_or_default(),
        Ok(None) => return Json(ApiResponse::<UsePromptResult>::error(404, "模板不存在")),
        Err(e) => return Json(ApiResponse::<UsePromptResult>::error(500, &e.to_string())),
    };

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
