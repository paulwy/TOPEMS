#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use uuid::Uuid;

use super::models::GenerationRuleQueryParams;
use super::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, PaginatedResponse};

pub async fn preview_generated_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let preview = serde_json::json!({
        "summary": "预览凭证",
        "voucher_type": "general_journal",
        "entries": [
            {
                "account_code": "1002",
                "account_name": "银行存款",
                "debit_amount": 10000.0,
                "credit_amount": 0.0,
                "summary": "收到货款"
            },
            {
                "account_code": "1122",
                "account_name": "应收账款",
                "debit_amount": 0.0,
                "credit_amount": 10000.0,
                "summary": "冲减应收账款"
            }
        ]
    });

    Json(ApiResponse::success(preview, "预览生成凭证成功"))
}

pub async fn generate_voucher_from_source(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let voucher = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "voucher_number": "VOU202606001",
        "summary": "自动生成凭证",
        "status": "draft",
        "created_at": chrono::Utc::now().to_rfc3339()
    });

    Json(ApiResponse::success(voucher, "凭证生成成功"))
}

pub async fn batch_generate_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = serde_json::json!({
        "success_count": 5,
        "failed_count": 0,
        "voucher_ids": [
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string()
        ]
    });

    Json(ApiResponse::success(result, "批量生成凭证成功"))
}

pub async fn auto_generate_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = serde_json::json!({
        "period": "2026-06",
        "generated_count": 10,
        "modules": ["pm", "crm", "srm"]
    });

    Json(ApiResponse::success(result, "自动生成凭证成功"))
}

pub async fn match_voucher_template(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let _now = chrono::Utc::now();
    let template = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "code": "GENERAL_JOURNAL",
        "name": "通用转账凭证",
        "type": "general_journal",
        "score": 100
    });

    Json(ApiResponse::success(template, "模板匹配成功"))
}

pub async fn get_template_usage_stats(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_template_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let stats = serde_json::json!({
        "total_usages": 150,
        "monthly_data": [
            {"month": "2026-03", "count": 30},
            {"month": "2026-04", "count": 40},
            {"month": "2026-05", "count": 45},
            {"month": "2026-06", "count": 35}
        ]
    });

    Json(ApiResponse::success(stats, "获取模板使用统计成功"))
}

pub async fn list_generation_rules(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GenerationRuleQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let now = chrono::Utc::now();
    let rules = vec![
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "name": "采购发票自动生成凭证",
            "source_module": "srm",
            "source_type": "purchase_invoice",
            "template_id": "template-1",
            "priority": 1,
            "isactive": true,
            "created_at": now.to_rfc3339(),
            "updated_at": now.to_rfc3339()
        }),
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "name": "销售发票自动生成凭证",
            "source_module": "crm",
            "source_type": "sales_invoice",
            "template_id": "template-2",
            "priority": 1,
            "isactive": true,
            "created_at": now.to_rfc3339(),
            "updated_at": now.to_rfc3339()
        }),
    ];

    Json(ApiResponse::success(
        PaginatedResponse::new(rules, 2, page, page_size),
        "获取凭证生成规则列表成功",
    ))
}

pub async fn create_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let now = chrono::Utc::now();
    let rule = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "name": "新生成规则",
        "source_module": "finance",
        "source_type": "journal",
        "template_id": "template-3",
        "priority": 1,
        "isactive": true,
        "created_at": now.to_rfc3339(),
        "updated_at": now.to_rfc3339()
    });

    Json(ApiResponse::success(rule, "凭证生成规则创建成功"))
}

pub async fn get_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let now = chrono::Utc::now();
    let rule = serde_json::json!({
        "id": "rule-1",
        "name": "采购发票自动生成凭证",
        "source_module": "srm",
        "source_type": "purchase_invoice",
        "template_id": "template-1",
        "condition": "data.amount > 1000",
        "priority": 1,
        "isactive": true,
        "created_at": now.to_rfc3339(),
        "updated_at": now.to_rfc3339()
    });

    Json(ApiResponse::success(rule, "获取凭证生成规则成功"))
}

pub async fn update_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let now = chrono::Utc::now();
    let rule = serde_json::json!({
        "id": "rule-1",
        "name": "采购发票自动生成凭证(已更新)",
        "source_module": "srm",
        "source_type": "purchase_invoice",
        "template_id": "template-1",
        "condition": "data.amount > 500",
        "priority": 2,
        "isactive": true,
        "created_at": now.to_rfc3339(),
        "updated_at": now.to_rfc3339()
    });

    Json(ApiResponse::success(rule, "凭证生成规则更新成功"))
}

pub async fn delete_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    Json(ApiResponse::success("".to_string(), "凭证生成规则删除成功"))
}

pub async fn toggle_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let is_active = req
        .get("isactive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let status = if is_active { "启用" } else { "禁用" };

    Json(ApiResponse::success(
        "".to_string(),
        &format!("凭证生成规则{}成功", status),
    ))
}
