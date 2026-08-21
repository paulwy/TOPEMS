use axum::extract::{Extension, Json, Path, State};
use chrono::Utc;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::services::finance::voucher_template::VoucherTemplateLine;
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize, IntoParams)]
pub struct TemplateEntryPathParams {
    pub template_id: Uuid,
    pub entry_id: Uuid,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct TemplatePathParams {
    pub template_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddTemplateEntryRequest {
    pub description: Option<String>,
    pub account_code: String,
    pub direction: String,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTemplateEntryRequest {
    pub description: Option<String>,
    pub account_code: Option<String>,
    pub direction: Option<String>,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReorderEntriesRequest {
    pub entry_ids: Vec<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/voucher-templates/{templateId}/entries",
    tag = "Voucher Template",
    params(("templateId" = Uuid, Path, description = "模板ID")),
    responses(
        (status = 200, description = "获取模板分录列表成功", body = ApiResponse<Vec<VoucherTemplateLine>>),
        (status = 404, description = "凭证模板不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_entries(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<VoucherTemplateLine>>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    match service.get_voucher_template(tenant_id, template_id).await {
        Ok(_) => {
            let lines: Vec<VoucherTemplateLine> = sqlx::query_as(
                "SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE template_id = $1 AND tenant_id = $2  ORDER BY sort_order, created_at",
            )
            .bind(template_id)
            .bind(claims.tenant_id.as_deref().unwrap_or("00000000-0000-0000-0000-000000000000"))
        .fetch_all(&state.pool)
            .await
            .unwrap_or_default();
            Json(ApiResponse::success(lines, "查询成功"))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/entry/{id}",
    tag = "VoucherTemplateEntries",
    operation_id = "get_entry",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<VoucherTemplateLine>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let line: Option<VoucherTemplateLine> = sqlx::query_as(
        "SELECT l.id, l.template_id, l.description, l.account_code, l.direction, l.amount_formula, l.sort_order, l.created_at FROM finance_voucher_template_lines l JOIN finance_voucher_templates t ON l.template_id = t.id WHERE t.tenant_id = $1 AND l.template_id = $2 AND l.id = $3",
    )
    .bind(tenant_id)
    .bind(template_id)
    .bind(entry_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    match line {
        Some(l) => Json(ApiResponse::success(l, "查询成功")),
        None => Json(ApiResponse::error(404, "模板分录不存在")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/entry",
    tag = "VoucherTemplateEntries",
    operation_id = "create_entry",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<AddTemplateEntryRequest>,
) -> Json<ApiResponse<VoucherTemplateLine>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM finance_voucher_templates WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    if count == 0 {
        return Json(ApiResponse::error(404, "凭证模板不存在"));
    }
    let sort_order: i32 = match req.sort_order {
        Some(s) => s,
        None => {
            let max_order: i32 = sqlx::query_scalar(
                "SELECT COALESCE(MAX(sort_order), 0) FROM finance_voucher_template_lines WHERE template_id = $1",
            )
            .bind(template_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
            max_order + 1
        }
    };
    let line_id = Uuid::new_v4();
    let now = Utc::now();
    let line: Result<VoucherTemplateLine, sqlx::Error> = sqlx::query_as(
        r#"INSERT INTO finance_voucher_template_lines
            (id, template_id, description, account_code, direction, amount_formula, sort_order, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, template_id, description, account_code, direction, amount_formula, sort_order, created_at"#,
    )
    .bind(line_id)
    .bind(template_id)
    .bind(&req.description)
    .bind(&req.account_code)
    .bind(&req.direction)
    .bind(&req.amount_formula)
    .bind(sort_order)
    .bind(now)
    .fetch_one(&state.pool)
    .await;
    match line {
        Ok(l) => Json(ApiResponse::success(l, "新增分录成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/voucher-templates/{templateId}/entries/{entryId}",
    tag = "Voucher Template",
    params(("templateId" = Uuid, Path, description = "模板ID"), ("entryId" = Uuid, Path, description = "条目ID")),
    request_body = UpdateTemplateEntryRequest,
    responses(
        (status = 200, description = "更新模板分录成功", body = ApiResponse<VoucherTemplateLine>),
        (status = 404, description = "模板分录不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateTemplateEntryRequest>,
) -> Json<ApiResponse<VoucherTemplateLine>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let owns: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM finance_voucher_template_lines l JOIN finance_voucher_templates t ON l.template_id = t.id WHERE t.tenant_id = $1 AND l.template_id = $2 AND l.id = $3",
    )
    .bind(tenant_id)
    .bind(template_id)
    .bind(entry_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    if owns == 0 {
        return Json(ApiResponse::error(404, "模板分录不存在"));
    }
    let existing: VoucherTemplateLine =
        match sqlx::query_as("SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE id = $1")
            .bind(entry_id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(l) => l,
            Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
        };
    let description = req.description.or(existing.description);
    let account_code = req.account_code.unwrap_or(existing.account_code);
    let direction = req.direction.unwrap_or(existing.direction);
    let amount_formula = req.amount_formula.or(existing.amount_formula);
    let sort_order = req.sort_order.unwrap_or(existing.sort_order);
    let line: Result<VoucherTemplateLine, sqlx::Error> = sqlx::query_as(
        r#"UPDATE finance_voucher_template_lines
              SET description = $1, account_code = $2, direction = $3,
                  amount_formula = $4, sort_order = $5
            WHERE id = $6
           RETURNING id, template_id, description, account_code, direction, amount_formula, sort_order, created_at"#,
    )
    .bind(description)
    .bind(account_code)
    .bind(direction)
    .bind(amount_formula)
    .bind(sort_order)
    .bind(entry_id)
    .fetch_one(&state.pool)
    .await;
    match line {
        Ok(l) => Json(ApiResponse::success(l, "更新分录成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/finance/entry/{id}",
    tag = "VoucherTemplateEntries",
    operation_id = "delete_entry",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_entry(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let res = sqlx::query(
        "DELETE FROM finance_voucher_template_lines WHERE id = $1 AND template_id = $2 AND EXISTS (SELECT 1 FROM finance_voucher_templates WHERE id = $2 AND tenant_id = $3)",
    )
    .bind(entry_id)
    .bind(template_id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "模板分录不存在"));
            }
            Json(ApiResponse::success(
                serde_json::json!({"deleted": true, "entry_id": entry_id}),
                "删除分录成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/voucher-templates/{templateId}/entries/reorder",
    tag = "Voucher Template",
    params(("templateId" = Uuid, Path, description = "模板ID")),
    request_body = ReorderEntriesRequest,
    responses(
        (status = 200, description = "重新排序模板分录成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "凭证模板不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn reorder_entries(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ReorderEntriesRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM finance_voucher_templates WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(template_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    if count == 0 {
        return Json(ApiResponse::error(404, "凭证模板不存在"));
    }
    for (idx, entry_id) in req.entry_ids.iter().enumerate() {
        let sort_order = (idx + 1) as i32;
        if let Err(e) = sqlx::query(
            "UPDATE finance_voucher_template_lines SET sort_order = $1 WHERE id = $2 AND template_id = $3",
        )
        .bind(sort_order)
        .bind(entry_id)
        .bind(template_id)
        .execute(&state.pool)
        .await
        {
            return Json(ApiResponse::error(500, &e.to_string()));
        }
    }
    let lines: Result<Vec<VoucherTemplateLine>, sqlx::Error> = sqlx::query_as(
        "SELECT id, template_id, description, account_code, direction, amount_formula, sort_order, created_at FROM finance_voucher_template_lines WHERE template_id = $1 ORDER BY sort_order, created_at",
    )
    .bind(template_id)
    .fetch_all(&state.pool)
    .await;
    match lines {
        Ok(ls) => {
            let json_lines: Vec<serde_json::Value> = ls
                .iter()
                .map(|l| serde_json::to_value(l).unwrap_or(serde_json::json!({})))
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({"template_id": template_id, "entries": json_lines}),
                "重排成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
