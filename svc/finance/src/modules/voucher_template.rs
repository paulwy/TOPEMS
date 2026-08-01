use axum::{
    extract::{Extension, Json, Multipart, Path, Query, State},
    response::IntoResponse,
};
use chrono::Utc;
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::services::finance::voucher_generation::VoucherGenerationRule;
use crate::services::finance::voucher_template::CreateVoucherTemplateRequest;
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct TemplatePathParams {
    pub template_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CopyTemplateRequest {
    pub new_code: Option<String>,
    pub new_name: String,
}

#[derive(Debug, Deserialize)]
pub struct ToggleTemplateRequest {
    pub isactive: bool,
}

#[derive(Debug, Deserialize)]
pub struct MatchTemplateRequest {
    pub source_module: Option<String>,
    pub source_type: Option<String>,
    pub company_id: Option<String>,
    pub amount: Option<f64>,
    pub extra_data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct UsageStatsQueryParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ExportQueryParams {
    pub format: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ToggleRuleRequest {
    pub isactive: bool,
}

#[utoipa::path(
    post,
    path = "/voucher-templates/{template_id}/copy",
    tag = "Voucher Template",
    params(TemplatePathParams),
    request_body = CopyTemplateRequest,
    responses(
        (status = 200, description = "复制凭证模板成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "凭证模板不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn copy_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<CopyTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();
    let source = match service.get_voucher_template(tenant_id, template_id).await {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };
    let lines: Vec<crate::services::finance::voucher_template::CreateVoucherTemplateLineRequest> =
        source
            .lines
            .iter()
            .map(
                |l| crate::services::finance::voucher_template::CreateVoucherTemplateLineRequest {
                    description: l.description.clone(),
                    account_code: l.account_code.clone(),
                    direction: l.direction.clone(),
                    amount_formula: l.amount_formula.clone(),
                    sort_order: Some(l.sort_order),
                },
            )
            .collect();
    let create_req = CreateVoucherTemplateRequest {
        name: req.new_name,
        description: source.description.clone(),
        voucher_type: source.voucher_type.clone(),
        default_debit_account: source.default_debit_account.clone(),
        default_credit_account: source.default_credit_account.clone(),
        lines,
    };
    match service
        .create_voucher_template(tenant_id, create_req, &created_by)
        .await
    {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "复制成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    path = "/voucher-templates/{template_id}/toggle",
    tag = "Voucher Template",
    params(TemplatePathParams),
    request_body = ToggleTemplateRequest,
    responses(
        (status = 200, description = "启用/禁用凭证模板成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "凭证模板不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn toggle_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ToggleTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let new_status = if req.isactive { "active" } else { "inactive" };
    let now = Utc::now();
    let res = sqlx::query(
        "UPDATE finance_voucher_templates SET status = $1, updated_at = $2 WHERE tenant_id = $3 AND id = $4",
    )
    .bind(new_status)
    .bind(now)
    .bind(tenant_id)
    .bind(template_id)
    .execute(&state.pool)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "凭证模板不存在"));
            }
            let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
            match service.get_voucher_template(tenant_id, template_id).await {
                Ok(template) => {
                    let mut val = serde_json::to_value(template).unwrap_or(serde_json::json!({}));
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("isactive".to_string(), serde_json::json!(req.isactive));
                    }
                    Json(ApiResponse::success(val, "切换成功"))
                }
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/voucher-templates/match",
    tag = "Voucher Template",
    request_body = MatchTemplateRequest,
    responses(
        (status = 200, description = "匹配凭证模板成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn match_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<MatchTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let source_type = match req.source_type {
        Some(s) => s,
        None => return Json(ApiResponse::error(400, "source_type 为必填")),
    };
    let rule: Option<VoucherGenerationRule> = match sqlx::query_as(
        "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE tenant_id = $1 AND source_type = $2 AND status = 'active' ORDER BY priority ASC LIMIT 1",
    )
    .bind(tenant_id)
    .bind(&source_type)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };
    match rule {
        Some(r) => {
            let template_id_opt = r
                .mapping_config
                .get("template_id")
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok());
            let template_val = if let Some(tid) = template_id_opt {
                let service =
                    FinanceService::new(state.pool.clone(), state.workflow_client.clone());
                match service.get_voucher_template(tenant_id, tid).await {
                    Ok(t) => serde_json::to_value(t).unwrap_or(serde_json::json!(null)),
                    Err(_) => serde_json::json!(null),
                }
            } else {
                serde_json::json!(null)
            };
            Json(ApiResponse::success(
                serde_json::json!({
                    "matched": true,
                    "rule": serde_json::to_value(&r).unwrap_or(serde_json::json!({})),
                    "template": template_val,
                }),
                "匹配成功",
            ))
        }
        None => Json(ApiResponse::success(
            serde_json::json!({
                "matched": false,
                "rule": null,
                "template": null,
            }),
            "未找到匹配的规则",
        )),
    }
}

#[utoipa::path(
    get,
    path = "/voucher-templates/{template_id}/usage-stats",
    tag = "Voucher Template",
    params(TemplatePathParams, UsageStatsQueryParams),
    responses(
        (status = 200, description = "获取模板使用统计成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_usage_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Query(_params): Query<UsageStatsQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let rule_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM finance_voucher_generation_rules WHERE tenant_id = $1 AND mapping_config->>'template_id' = $2",
    )
    .bind(tenant_id)
    .bind(template_id.to_string())
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    Json(ApiResponse::success(
        serde_json::json!({
            "template_id": template_id,
            "usage_count": rule_count,
            "generated_voucher_count": 0,
            "last_used_at": null,
        }),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    path = "/voucher-templates/{template_id}/export",
    tag = "Voucher Template",
    params(TemplatePathParams, ExportQueryParams),
    responses(
        (status = 200, description = "导出凭证模板成功"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn export_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Query(_params): Query<ExportQueryParams>,
) -> axum::response::Response {
    let tenant_id = get_tenant_id(&claims);
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let template = match service.get_voucher_template(tenant_id, template_id).await {
        Ok(t) => t,
        Err(e) => {
            return Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string()))
                .into_response()
        }
    };
    let json = serde_json::to_value(template).unwrap_or(serde_json::json!({}));
    let filename = format!("template-{}.json", template_id);
    (
        [(
            axum::http::header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )],
        Json(json),
    )
        .into_response()
}

#[utoipa::path(
    post,
    path = "/voucher-templates/import",
    tag = "Voucher Template",
    responses(
        (status = 200, description = "导入凭证模板成功", body = ApiResponse<serde_json::Value>),
        (status = 400, description = "参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn import_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id(&claims);
    let created_by = claims.username.clone();

    let mut file_content: Option<Vec<u8>> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let data = field.bytes().await.unwrap_or_default();
            file_content = Some(data.to_vec());
        }
    }

    let file_data = match file_content {
        Some(data) => data,
        None => return Json(ApiResponse::error(400, "缺少 file 字段")),
    };

    let json_str = match String::from_utf8(file_data) {
        Ok(s) => s,
        Err(e) => return Json(ApiResponse::error(400, &format!("文件编码错误: {}", e))),
    };

    let template_data: serde_json::Value = match serde_json::from_str(&json_str) {
        Ok(v) => v,
        Err(e) => return Json(ApiResponse::error(400, &format!("JSON 解析失败: {}", e))),
    };

    let create_req: CreateVoucherTemplateRequest = match serde_json::from_value(template_data) {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::error(400, &format!("参数错误: {}", e))),
    };
    match service
        .create_voucher_template(tenant_id, create_req, &created_by)
        .await
    {
        Ok(template) => Json(ApiResponse::success(
            serde_json::to_value(template).unwrap_or(serde_json::json!({})),
            "导入成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    put,
    path = "/voucher-generation-rules/{rule_id}/toggle",
    tag = "Voucher Generation Rule",
    params(("rule_id" = Uuid, Path, description = "生成规则ID")),
    request_body = ToggleRuleRequest,
    responses(
        (status = 200, description = "启用/禁用生成规则成功", body = ApiResponse<serde_json::Value>),
        (status = 404, description = "生成规则不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn toggle_generate_rule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(rule_id): Path<Uuid>,
    Json(req): Json<ToggleRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let new_status = if req.isactive { "active" } else { "inactive" };
    let now = Utc::now();
    let res = sqlx::query(
        "UPDATE finance_voucher_generation_rules SET status = $1, updated_at = $2 WHERE tenant_id = $3 AND id = $4",
    )
    .bind(new_status)
    .bind(now)
    .bind(tenant_id)
    .bind(rule_id)
    .execute(&state.pool)
    .await;
    match res {
        Ok(r) => {
            if r.rows_affected() == 0 {
                return Json(ApiResponse::error(404, "生成规则不存在"));
            }
            let rule: Result<
                VoucherGenerationRule,
                sqlx::Error,
            > = sqlx::query_as(
                "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE tenant_id = $1 AND id = $2",
            )
            .bind(tenant_id)
            .bind(rule_id)
            .fetch_one(&state.pool)
            .await;
            match rule {
                Ok(r) => {
                    let mut val = serde_json::to_value(r).unwrap_or(serde_json::json!({}));
                    if let Some(obj) = val.as_object_mut() {
                        obj.insert("isactive".to_string(), serde_json::json!(req.isactive));
                    }
                    Json(ApiResponse::success(val, "切换成功"))
                }
                Err(e) => Json(ApiResponse::error(500, &e.to_string())),
            }
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/voucher/generate/preview",
    tag = "Voucher Generation",
    responses(
        (status = 501, description = "此功能尚未实现"),
    ),
)]
pub async fn preview_generation(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "success": false,
            "message": "此功能尚未实现",
            "data": null,
            "code": 501,
            "todo": "凭证自动生成功能将在后续版本实现"
        })),
    )
}

#[utoipa::path(
    post,
    path = "/voucher/generate/from-source",
    tag = "Voucher Generation",
    responses(
        (status = 501, description = "此功能尚未实现"),
    ),
)]
pub async fn generate_from_source(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "success": false,
            "message": "此功能尚未实现",
            "data": null,
            "code": 501,
            "todo": "凭证自动生成功能将在后续版本实现"
        })),
    )
}

#[utoipa::path(
    post,
    path = "/voucher/generate/batch",
    tag = "Voucher Generation",
    responses(
        (status = 501, description = "此功能尚未实现"),
    ),
)]
pub async fn batch_generate(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "success": false,
            "message": "此功能尚未实现",
            "data": null,
            "code": 501,
            "todo": "凭证自动生成功能将在后续版本实现"
        })),
    )
}

#[utoipa::path(
    post,
    path = "/voucher/generate/auto",
    tag = "Voucher Generation",
    responses(
        (status = 501, description = "此功能尚未实现"),
    ),
)]
pub async fn auto_generate(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "success": false,
            "message": "此功能尚未实现",
            "data": null,
            "code": 501,
            "todo": "凭证自动生成功能将在后续版本实现"
        })),
    )
}

#[utoipa::path(
    post,
    path = "/voucher/generate/regenerate/{original_voucher_id}",
    tag = "Voucher Generation",
    params(("original_voucher_id" = Uuid, Path, description = "原始凭证ID")),
    responses(
        (status = 501, description = "此功能尚未实现"),
    ),
)]
pub async fn regenerate(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(_original_voucher_id): Path<Uuid>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "success": false,
            "message": "此功能尚未实现",
            "data": null,
            "code": 501,
            "todo": "凭证自动生成功能将在后续版本实现"
        })),
    )
}
