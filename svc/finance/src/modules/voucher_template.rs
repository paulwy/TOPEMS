use axum::{
    extract::{Extension, Json, Multipart, Path, Query, State},
    response::IntoResponse,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::Deserialize;
use sqlx::PgPool;
use tracing::warn;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::models::{CreateVoucherRequest, VoucherLineRequest, VoucherType};
use crate::services::finance::voucher_generation::{
    GenerateVouchersRequest, VoucherGenerationRule,
};
use crate::services::finance::voucher_template::CreateVoucherTemplateRequest;
use crate::services::FinanceService;
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize, IntoParams)]
pub struct TemplatePathParams {
    pub template_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CopyTemplateRequest {
    pub new_code: Option<String>,
    pub new_name: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ToggleTemplateRequest {
    pub isactive: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct ToggleRuleRequest {
    pub isactive: bool,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/voucher-templates/{templateId}/copy",
    tag = "Voucher Template",
    params(("templateId" = Uuid, Path, description = "模板ID")),
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
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/template",
    tag = "VoucherTemplate",
    operation_id = "toggle_template",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn toggle_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<ToggleTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    security(("BearerAuth" = ["finance:write"])),
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
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/usage_stats",
    tag = "VoucherTemplate",
    operation_id = "get_usage_stats",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_usage_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Query(_params): Query<UsageStatsQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    security(("BearerAuth" = ["finance:read"])),
    path = "/voucher-templates/{templateId}/export",
    tag = "Voucher Template",
    params(("templateId" = Uuid, Path, description = "模板ID"), ExportQueryParams),
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
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    security(("BearerAuth" = ["finance:write"])),
    path = "/finance/template",
    tag = "VoucherTemplate",
    operation_id = "import_template",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn import_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
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
    security(("BearerAuth" = ["finance:update"])),
    path = "/voucher-generation-rules/{ruleId}/toggle",
    tag = "Voucher Generation Rule",
    params(("ruleId" = Uuid, Path, description = "生成规则ID")),
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
    let tenant_id = get_tenant_id_from_claims(&claims);
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

// ========== 从源单据查询金额：sale/purchase/payment 三类型 + 兜底默认 ==========

/// 查询源单据金额，返回 `{ source_id: amount }` 映射；查不到或异常的 ID 使用默认金额兜底。
///
/// | source_type | 来源表 | 金额字段 | 说明 |
/// |-------------|--------|---------|------|
/// | `sale` / `sales_order` | `plugin_erp.sales_orders` | `payable_amount` (F64→Decimal) | 销售订单应付金额 |
/// | `purchase` / `purchase_order` | `plugin_erp.purchase_orders` | `payable_amount` (F64→Decimal) | 采购订单应付金额 |
/// | `payment` | `plugin_finance.payment_records` 或 `plugin_finance.payments` | `amount` (F64→Decimal) | 支付记录金额（两表容错查询） |
/// | 其他 / 未知 | — | 1000.00 默认 | 兼容 legacy 调用（如 demo/preview） |
async fn resolve_source_amounts(
    pool: &PgPool,
    tenant_id: Uuid,
    source_type: &str,
    source_ids: &[String],
) -> std::collections::HashMap<String, Decimal> {
    /// 默认兜底金额（1000.00）—— 与原 mock 值一致，防止预览/演示场景因缺数据报 NPE 或 0 金额
    const DEFAULT_AMOUNT_I128: i128 = 1000_00; // 2 位小数
    const SCALE: u32 = 2;

    let default = Decimal::from_i128_with_scale(DEFAULT_AMOUNT_I128, SCALE);
    let mut out = std::collections::HashMap::new();

    if source_ids.is_empty() {
        return out;
    }

    // 解析 source_id → Uuid；无法解析的直接塞默认值，不影响批量查询
    let mut valid_uuids = Vec::with_capacity(source_ids.len());
    let mut uuid_to_id = std::collections::HashMap::new();
    for id in source_ids {
        match Uuid::parse_str(id) {
            Ok(u) => {
                valid_uuids.push(u);
                uuid_to_id.insert(u, id.clone());
            }
            Err(_) => {
                out.insert(id.clone(), default);
            }
        }
    }
    if valid_uuids.is_empty() {
        return out;
    }

    let stype = source_type.to_ascii_lowercase();
    let snapshot_type: &str = match stype.as_str() {
        "sale" | "sales" | "sales_order" | "salesorder" => "sales_order",
        "purchase" | "purchase_order" | "purchaseorder" => "purchase_order",
        "payment" | "pay" => "payment",
        other => {
            static LOGGED: std::sync::atomic::AtomicBool =
                std::sync::atomic::AtomicBool::new(false);
            if !LOGGED.swap(true, std::sync::atomic::Ordering::Relaxed) {
                warn!(
                    source_type = other,
                    "未知 source_type，使用默认金额 1000.00；支持值：sale / purchase / payment"
                );
            }
            // 未知类型直接返回默认值，不查任何表
            for id in source_ids {
                out.insert(id.clone(), default);
            }
            return out;
        }
    };

    // 事件驱动：从 Finance 本地快照表读取，替代跨 Schema 直查 plugin_erp
    let snapshot_rows: Vec<(Uuid, Option<f64>)> = sqlx::query_as::<_, (Uuid, Option<f64>)>(
        r#"SELECT source_id, payable_amount FROM plugin_finance.source_amount_snapshots
           WHERE source_type = $1 AND source_id = ANY($2)"#,
    )
    .bind(snapshot_type)
    .bind(&valid_uuids)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        static LOGGED: std::sync::atomic::AtomicBool =
            std::sync::atomic::AtomicBool::new(false);
        if !LOGGED.swap(true, std::sync::atomic::Ordering::Relaxed) {
            warn!(
                error = %e,
                source_type = snapshot_type,
                "查询 source_amount_snapshots 失败，使用默认金额 1000.00 兜底；请确认 ERP 事件已正确发布"
            );
        }
    })
    .unwrap_or_default();

    // payment/pay 类型特殊处理：查 payment_records 表（同 Schema，安全）
    let amount_f64s: Vec<(Uuid, Option<f64>)> = if snapshot_type == "payment" {
        let r1 = sqlx::query_as::<_, (Uuid, Option<f64>)>(
            r#"SELECT id, amount FROM plugin_finance.payment_records
               WHERE tenant_id = $1 AND id = ANY($2)"#,
        )
        .bind(tenant_id)
        .bind(&valid_uuids)
        .fetch_all(pool)
        .await;
        match r1 {
            Ok(rows) if !rows.is_empty() => rows,
            _ => sqlx::query_as::<_, (Uuid, Option<f64>)>(
                r#"SELECT id, amount FROM plugin_finance.payments
                   WHERE tenant_id = $1 AND id = ANY($2)"#,
            )
            .bind(tenant_id)
            .bind(&valid_uuids)
            .fetch_all(pool)
            .await
            .map_err(|e| {
                static LOGGED: std::sync::atomic::AtomicBool =
                    std::sync::atomic::AtomicBool::new(false);
                if !LOGGED.swap(true, std::sync::atomic::Ordering::Relaxed) {
                    warn!(error = %e, "查询 plugin_finance.payments 失败，使用默认金额 1000.00 兜底");
                }
            })
            .unwrap_or_default(),
        }
    } else {
        snapshot_rows
    };

    for (uuid, amount_opt) in amount_f64s {
        let sid = match uuid_to_id.get(&uuid).cloned() {
            Some(s) => s,
            None => continue,
        };
        let dec = match amount_opt {
            Some(v) if v.is_finite() && v >= 0.0 => {
                // f64 → Decimal：round 到 2 位，避免 0.1+0.2=0.300000004 类浮点问题
                let scaled = (v * 100.0).round() as i128;
                Decimal::from_i128_with_scale(scaled, SCALE)
            }
            _ => default,
        };
        out.insert(sid, dec);
    }

    // 对没有命中 DB 行的 ID，兜底默认值
    for id in source_ids {
        out.entry(id.clone()).or_insert(default);
    }

    out
}

// ========== 凭证自动生成 ==========

#[derive(Debug, Deserialize, ToSchema)]
pub struct PreviewGenerationRequest {
    pub source_type: String,
    pub source_ids: Vec<String>,
    pub template_id: Uuid,
    pub date: Option<chrono::NaiveDate>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/voucher/generate/preview",
    tag = "Voucher Generation",
    request_body = PreviewGenerationRequest,
    responses(
        (status = 200, description = "预览凭证生成结果成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn preview_generation(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PreviewGenerationRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);

    let template = match service
        .get_voucher_template(tenant_id, req.template_id)
        .await
    {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };

    let voucher_date = req.date.unwrap_or_else(|| chrono::Utc::now().date_naive());
    // 从源单据查询金额：sale/purchase/payment → 对应业务表；DB 失败或未知类型时回退 1000.00 预览默认值
    let amounts =
        resolve_source_amounts(&state.pool, tenant_id, &req.source_type, &req.source_ids).await;
    let default = Decimal::from_i128_with_scale(1000_00, 2);

    let mut previews = Vec::new();
    for source_id in &req.source_ids {
        let amount = amounts.get(source_id).copied().unwrap_or(default);
        let mut entries = Vec::new();
        let mut total_debit = rust_decimal::Decimal::ZERO;
        let mut total_credit = rust_decimal::Decimal::ZERO;

        for line in &template.lines {
            let (debit, credit) = if line.direction == "debit" {
                (amount, rust_decimal::Decimal::ZERO)
            } else {
                (rust_decimal::Decimal::ZERO, amount)
            };
            total_debit += debit;
            total_credit += credit;
            entries.push(serde_json::json!({
                "account_code": line.account_code,
                "description": line.description,
                "direction": line.direction,
                "debit": debit,
                "credit": credit,
                "sort_order": line.sort_order,
            }));
        }

        previews.push(serde_json::json!({
            "source_id": source_id,
            "voucher_no": format!("PREVIEW-{}-{}", template.voucher_type, source_id),
            "voucher_date": voucher_date,
            "voucher_type": template.voucher_type,
            "entries": entries,
            "total_amount": total_debit,
            "total_debit": total_debit,
            "total_credit": total_credit,
        }));
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "previews": previews,
            "total_count": previews.len(),
            "template_id": req.template_id,
        }),
        "预览成功",
    ))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateFromSourceRequest {
    pub source_type: String, // sale/purchase/payment
    pub source_ids: Vec<String>,
    pub template_id: Uuid,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/voucher/generate/from-source",
    tag = "Voucher Generation",
    request_body = GenerateFromSourceRequest,
    responses(
        (status = 200, description = "从源单据生成凭证成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn generate_from_source(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<GenerateFromSourceRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();

    let template = match service
        .get_voucher_template(tenant_id, req.template_id)
        .await
    {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };

    let voucher_type = match template.voucher_type.as_str() {
        "payment" => VoucherType::Payment,
        "receipt" => VoucherType::Receipt,
        "transfer" => VoucherType::Transfer,
        _ => VoucherType::General,
    };

    let voucher_date = chrono::Utc::now();
    // 从源单据查询金额：sale/purchase/payment → 对应业务表；DB 失败或未知类型时回退 1000.00 默认值
    let amounts =
        resolve_source_amounts(&state.pool, tenant_id, &req.source_type, &req.source_ids).await;
    let default = Decimal::from_i128_with_scale(1000_00, 2);

    let mut voucher_ids = Vec::new();
    let mut errors = Vec::new();

    for source_id in &req.source_ids {
        let amount = amounts.get(source_id).copied().unwrap_or(default);
        let lines: Vec<VoucherLineRequest> = template
            .lines
            .iter()
            .map(|line| {
                let (debit, credit) = if line.direction == "debit" {
                    (amount, rust_decimal::Decimal::ZERO)
                } else {
                    (rust_decimal::Decimal::ZERO, amount)
                };
                VoucherLineRequest {
                    account_code: line.account_code.clone(),
                    description: line.description.clone(),
                    debit,
                    credit,
                    project_id: None,
                    department_id: None,
                }
            })
            .collect();

        let create_req = CreateVoucherRequest {
            voucher_date,
            voucher_type: voucher_type.clone(),
            lines,
            description: Some(format!(
                "从 {} 单据 {} 自动生成",
                req.source_type, source_id
            )),
            template_id: Some(req.template_id),
        };

        match service
            .create_voucher(tenant_id, create_req, &created_by)
            .await
        {
            Ok(voucher) => voucher_ids.push(voucher.id),
            Err(e) => errors.push(format!("源单据 {}: {}", source_id, e)),
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "voucher_ids": voucher_ids,
            "generated_count": voucher_ids.len(),
            "errors": errors,
        }),
        &format!("生成完成，成功 {} 张", voucher_ids.len()),
    ))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchGenerateRequest {
    pub rule_ids: Vec<Uuid>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/voucher/generate/batch",
    tag = "Voucher Generation",
    request_body = BatchGenerateRequest,
    responses(
        (status = 200, description = "批量生成凭证成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn batch_generate(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BatchGenerateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let generated_by = claims.username.clone();

    let mut all_voucher_ids = Vec::new();
    let mut errors = Vec::new();

    for rule_id in &req.rule_ids {
        let gen_req = GenerateVouchersRequest {
            rule_id: *rule_id,
            source_ids: None,
            start_date: req.start_date,
            end_date: req.end_date,
        };

        match service
            .generate_vouchers(tenant_id, gen_req, &generated_by)
            .await
        {
            Ok(result) => all_voucher_ids.extend(result.voucher_ids),
            Err(e) => errors.push(format!("规则 {}: {}", rule_id, e)),
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "voucher_ids": all_voucher_ids,
            "generated_count": all_voucher_ids.len(),
            "errors": errors,
        }),
        &format!("批量生成完成，成功 {} 张", all_voucher_ids.len()),
    ))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AutoGenerateRequest {
    pub date: chrono::NaiveDate,
    pub rule_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/finance/generate",
    tag = "VoucherTemplate",
    operation_id = "auto_generate",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn auto_generate(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoGenerateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let generated_by = claims.username.clone();

    let rule_ids: Vec<Uuid> = if let Some(rule_id) = req.rule_id {
        vec![rule_id]
    } else {
        // 查询所有活跃规则
        let rules: Vec<VoucherGenerationRule> = sqlx::query_as(
            "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE tenant_id = $1 AND status = 'active' ORDER BY priority ASC",
        )
        .bind(tenant_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();
        rules.iter().map(|r| r.id).collect()
    };

    if rule_ids.is_empty() {
        return Json(ApiResponse::success(
            serde_json::json!({
                "voucher_ids": [],
                "generated_count": 0,
                "matched_rules": 0,
            }),
            "未找到匹配的生成规则",
        ));
    }

    let matched_count = rule_ids.len();
    let mut all_voucher_ids = Vec::new();
    let mut errors = Vec::new();

    for rule_id in &rule_ids {
        let gen_req = GenerateVouchersRequest {
            rule_id: *rule_id,
            source_ids: None,
            start_date: Some(req.date),
            end_date: Some(req.date),
        };

        match service
            .generate_vouchers(tenant_id, gen_req, &generated_by)
            .await
        {
            Ok(result) => all_voucher_ids.extend(result.voucher_ids),
            Err(e) => errors.push(format!("规则 {}: {}", rule_id, e)),
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "voucher_ids": all_voucher_ids,
            "generated_count": all_voucher_ids.len(),
            "matched_rules": matched_count,
            "errors": errors,
        }),
        &format!("自动生成完成，成功 {} 张", all_voucher_ids.len()),
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/voucher/generate/regenerate/{originalVoucherId}",
    tag = "Voucher Generation",
    params(("originalVoucherId" = Uuid, Path, description = "原始凭证ID")),
    responses(
        (status = 200, description = "重新生成凭证成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn regenerate(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(original_voucher_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = FinanceService::new(state.pool.clone(), state.workflow_client.clone());
    let tenant_id = get_tenant_id_from_claims(&claims);
    let created_by = claims.username.clone();

    // 获取原始凭证
    let original = match service.get_voucher(tenant_id, original_voucher_id).await {
        Ok(v) => v,
        Err(e) => return Json(ApiResponse::error(500, &e.to_string())),
    };

    // 创建冲销凭证（借贷互换）
    let reversal_lines: Vec<VoucherLineRequest> = original
        .lines
        .iter()
        .map(|line| VoucherLineRequest {
            account_code: line.account_code.clone(),
            description: Some(format!("冲销原凭证 {}", original.voucher_no)),
            debit: line.credit, // 借贷互换
            credit: line.debit,
            project_id: line.project_id,
            department_id: line.department_id,
        })
        .collect();

    let reversal_req = CreateVoucherRequest {
        voucher_date: chrono::Utc::now(),
        voucher_type: original.voucher_type.clone(),
        lines: reversal_lines,
        description: Some(format!("冲销凭证 {}", original.voucher_no)),
        template_id: None,
    };

    let reversal_voucher = match service
        .create_voucher(tenant_id, reversal_req, &created_by)
        .await
    {
        Ok(v) => v,
        Err(e) => return Json(ApiResponse::error(500, &format!("冲销凭证创建失败: {}", e))),
    };

    // 重新生成新凭证（复制原始凭证分录）
    let new_lines: Vec<VoucherLineRequest> = original
        .lines
        .iter()
        .map(|line| VoucherLineRequest {
            account_code: line.account_code.clone(),
            description: line.description.clone(),
            debit: line.debit,
            credit: line.credit,
            project_id: line.project_id,
            department_id: line.department_id,
        })
        .collect();

    let new_req = CreateVoucherRequest {
        voucher_date: chrono::Utc::now(),
        voucher_type: original.voucher_type.clone(),
        lines: new_lines,
        description: Some(format!("重新生成自凭证 {}", original.voucher_no)),
        template_id: None,
    };

    match service
        .create_voucher(tenant_id, new_req, &created_by)
        .await
    {
        Ok(new_voucher) => Json(ApiResponse::success(
            serde_json::json!({
                "original_voucher_id": original_voucher_id,
                "reversal_voucher_id": reversal_voucher.id,
                "new_voucher_id": new_voucher.id,
            }),
            "重新生成成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("新凭证创建失败: {}", e))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_copy_template_request_deserialize() {
        let json = r#"{"new_code": "TPL002", "new_name": "复制模板"}"#;
        let request: CopyTemplateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.new_code.as_deref(), Some("TPL002"));
        assert_eq!(request.new_name, "复制模板");
    }

    #[test]
    fn test_copy_template_request_minimal() {
        let json = r#"{"new_name": "新模板"}"#;
        let request: CopyTemplateRequest = serde_json::from_str(json).unwrap();
        assert!(request.new_code.is_none());
        assert_eq!(request.new_name, "新模板");
    }

    #[test]
    fn test_toggle_template_request_deserialize() {
        let json = r#"{"isactive": true}"#;
        let request: ToggleTemplateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.isactive, true);
    }

    #[test]
    fn test_toggle_template_request_false() {
        let json = r#"{"isactive": false}"#;
        let request: ToggleTemplateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.isactive, false);
    }

    #[test]
    fn test_match_template_request_deserialize() {
        let json = r#"{
            "source_module": "purchase",
            "source_type": "invoice",
            "company_id": "comp1",
            "amount": 1000.0,
            "extra_data": {"key": "value"}
        }"#;
        let request: MatchTemplateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.source_module.as_deref(), Some("purchase"));
        assert_eq!(request.source_type.as_deref(), Some("invoice"));
        assert_eq!(request.company_id.as_deref(), Some("comp1"));
        assert_eq!(request.amount, Some(1000.0));
        assert!(request.extra_data.is_some());
    }

    #[test]
    fn test_match_template_request_minimal() {
        let json = r#"{}"#;
        let request: MatchTemplateRequest = serde_json::from_str(json).unwrap();
        assert!(request.source_module.is_none());
        assert!(request.source_type.is_none());
        assert!(request.company_id.is_none());
        assert!(request.amount.is_none());
        assert!(request.extra_data.is_none());
    }

    #[test]
    fn test_usage_stats_query_params_deserialize() {
        let json = r#"{"start_date": "2024-01-01", "end_date": "2024-01-31"}"#;
        let params: UsageStatsQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.start_date.as_deref(), Some("2024-01-01"));
        assert_eq!(params.end_date.as_deref(), Some("2024-01-31"));
    }

    #[test]
    fn test_export_query_params_deserialize() {
        let json = r#"{"format": "excel"}"#;
        let params: ExportQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.format.as_deref(), Some("excel"));
    }

    #[test]
    fn test_toggle_rule_request_deserialize() {
        let json = r#"{"isactive": true}"#;
        let request: ToggleRuleRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.isactive, true);
    }
}
