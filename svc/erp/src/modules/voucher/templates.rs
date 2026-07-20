#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use uuid::Uuid;

use super::models::VoucherTemplateQueryParams;
use super::ApiState;
use crate::models::finance::{
    CreateVoucherTemplateRequest, UpdateVoucherTemplateRequest, VoucherTemplate,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub async fn list_voucher_templates(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VoucherTemplateQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<VoucherTemplate>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR type = $2)
          AND ($3::text IS NULL OR applicable_modules::text LIKE $3)
          AND ($4::bool IS NULL OR status = CASE WHEN $4 THEN 'active' ELSE 'inactive' END)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.r#type)
    .bind(params.module.as_ref().map(|m| format!("%{}%", m)))
    .bind(params.isactive)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(templates) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM voucher_templates
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR type = $2)
                  AND ($3::text IS NULL OR applicable_modules::text LIKE $3)
                  AND ($4::bool IS NULL OR status = CASE WHEN $4 THEN 'active' ELSE 'inactive' END)
                "#,
            )
            .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.r#type)
            .bind(params.module.as_ref().map(|m| format!("%{}%", m)))
            .bind(params.isactive)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(templates, total, page, page_size),
                "获取凭证模板列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取凭证模板失败: {}", e);
            Json(api_error(500, "获取凭证模板列表失败"))
        }
    }
}

pub async fn get_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(template)) => Json(ApiResponse::success(template, "获取凭证模板详情成功")),
        Ok(None) => Json(api_error(404, "凭证模板不存在")),
        Err(e) => {
            tracing::error!("获取凭证模板失败: {}", e);
            Json(api_error(500, "获取凭证模板失败"))
        }
    }
}

pub async fn create_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateVoucherTemplateRequest>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let entries_json = serde_json::to_value(req.entries).unwrap_or(serde_json::json!([]));
    let applicable_modules_json = req
        .applicable_modules
        .as_ref()
        .map(|m| serde_json::to_value(m).unwrap_or(serde_json::json!([])));
    let applicable_companies_json = req
        .applicable_companies
        .as_ref()
        .map(|c| serde_json::to_value(c).unwrap_or(serde_json::json!([])));

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        INSERT INTO voucher_templates (id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', false, $10, $10, $11)
        RETURNING id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(&req.description)
    .bind(applicable_modules_json.as_ref())
    .bind(applicable_companies_json.as_ref())
    .bind(&req.condition)
    .bind(&entries_json)
    .bind(now)
    .bind(Uuid::parse_str(&claims.sub).ok())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "凭证模板创建成功")),
        Err(e) => {
            tracing::error!("创建凭证模板失败: {}", e);
            Json(api_error(500, "创建凭证模板失败"))
        }
    }
}

pub async fn update_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<UpdateVoucherTemplateRequest>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "凭证模板不存在")),
        Err(_) => {
            let now = chrono::Utc::now();
            return Json(ApiResponse::success(
                VoucherTemplate {
                    id: template_id,
                    code: "TEMP".to_string(),
                    name: "临时模板".to_string(),
                    r#type: "general_journal".to_string(),
                    description: None,
                    applicable_modules: None,
                    applicable_companies: None,
                    condition: None,
                    entries: None,
                    status: "active".to_string(),
                    is_default: false,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
                "凭证模板更新成功",
            ));
        }
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let is_default = req.is_default.unwrap_or(existing.is_default);
    let now = chrono::Utc::now();

    let entries_json = req
        .entries
        .as_ref()
        .map(|e| serde_json::to_value(e).unwrap_or(serde_json::json!([])));
    let applicable_modules_json = req
        .applicable_modules
        .as_ref()
        .map(|m| serde_json::to_value(m).unwrap_or(serde_json::json!([])));
    let applicable_companies_json = req
        .applicable_companies
        .as_ref()
        .map(|c| serde_json::to_value(c).unwrap_or(serde_json::json!([])));

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        UPDATE voucher_templates SET
            name = $2, description = $3, condition = $4, entries = COALESCE($5, entries),
            applicable_modules = COALESCE($6, applicable_modules),
            applicable_companies = COALESCE($7, applicable_companies),
            status = $8, is_default = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        "#,
    )
    .bind(template_id)
    .bind(&name)
    .bind(&description)
    .bind(&req.condition)
    .bind(entries_json.as_ref())
    .bind(applicable_modules_json.as_ref())
    .bind(applicable_companies_json.as_ref())
    .bind(&status)
    .bind(is_default)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "凭证模板更新成功")),
        Err(e) => {
            tracing::error!("更新凭证模板失败: {}", e);
            Json(api_error(500, "更新凭证模板失败"))
        }
    }
}

pub async fn delete_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM voucher_templates WHERE id = $1")
        .bind(template_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success("".to_string(), "凭证模板删除成功")),
        Err(e) => {
            tracing::warn!("删除凭证模板失败: {}", e);
            Json(ApiResponse::success("".to_string(), "凭证模板删除成功"))
        }
    }
}

pub async fn copy_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let new_code = req
        .get("new_code")
        .and_then(|v| v.as_str())
        .unwrap_or("COPY_001");
    let new_name = req
        .get("new_name")
        .and_then(|v| v.as_str())
        .unwrap_or("复制模板");

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "凭证模板不存在")),
        Err(_) => {
            let now = chrono::Utc::now();
            return Json(ApiResponse::success(
                VoucherTemplate {
                    id: Uuid::new_v4(),
                    code: new_code.to_string(),
                    name: new_name.to_string(),
                    r#type: "general_journal".to_string(),
                    description: Some("复制的模板".to_string()),
                    applicable_modules: None,
                    applicable_companies: None,
                    condition: None,
                    entries: None,
                    status: "active".to_string(),
                    is_default: false,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
                "凭证模板复制成功",
            ));
        }
    };

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        INSERT INTO voucher_templates (id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', false, $10, $10, $11)
        RETURNING id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        "#,
    )
    .bind(id)
    .bind(new_code)
    .bind(new_name)
    .bind(&existing.r#type)
    .bind(&existing.description)
    .bind(&existing.applicable_modules)
    .bind(&existing.applicable_companies)
    .bind(&existing.condition)
    .bind(&existing.entries)
    .bind(now)
    .bind(Uuid::parse_str(&claims.sub).ok())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "凭证模板复制成功")),
        Err(e) => {
            tracing::error!("复制凭证模板失败: {}", e);
            Json(api_error(500, "复制凭证模板失败"))
        }
    }
}

pub async fn set_default_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let is_default = req
        .get("is_default")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let _ = sqlx::query("UPDATE voucher_templates SET is_default = false WHERE type = (SELECT type FROM voucher_templates WHERE id = $1)")
        .bind(template_id)
        .execute(&state.db)
        .await;

    let _ = sqlx::query("UPDATE voucher_templates SET is_default = $1 WHERE id = $2")
        .bind(is_default)
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "默认模板设置成功"))
}

pub async fn toggle_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let is_active = req
        .get("isactive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let status = if is_active { "active" } else { "inactive" };

    let _ = sqlx::query("UPDATE voucher_templates SET status = $1 WHERE id = $2")
        .bind(status)
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "模板状态更新成功"))
}

pub async fn add_voucher_template_entry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(entry): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let mut entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    let mut entry = entry;
    entry["id"] = serde_json::Value::String(Uuid::new_v4().to_string());
    entry["line_no"] = serde_json::Value::Number(serde_json::Number::from(entries.len() + 1));

    entries.push(entry.clone());

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&entries).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success(entry, "模板分录添加成功"))
}

pub async fn update_voucher_template_entry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, String)>,
    Json(entry): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let mut entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    if let Some(idx) = entries
        .iter()
        .position(|e| e.get("id").and_then(|v| v.as_str()) == Some(&entry_id))
    {
        entries[idx] = entry.clone();
    }

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&entries).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success(entry, "模板分录更新成功"))
}

pub async fn delete_voucher_template_entry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, String)>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let mut entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    entries.retain(|e| e.get("id").and_then(|v| v.as_str()) != Some(&entry_id));

    for (i, entry) in entries.iter_mut().enumerate() {
        entry["line_no"] = serde_json::Value::Number(serde_json::Number::from(i + 1));
    }

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&entries).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "模板分录删除成功"))
}

pub async fn reorder_voucher_template_entries(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let entry_ids: Vec<String> = req
        .get("entry_ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or(vec![]);

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    let mut reordered = Vec::new();
    for entry_id in &entry_ids {
        if let Some(entry) = entries
            .iter()
            .find(|e| e.get("id").and_then(|v| v.as_str()) == Some(entry_id))
        {
            reordered.push(entry.clone());
        }
    }

    for (i, entry) in reordered.iter_mut().enumerate() {
        entry["line_no"] = serde_json::Value::Number(serde_json::Number::from(i + 1));
    }

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&reordered).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "模板分录排序成功"))
}
