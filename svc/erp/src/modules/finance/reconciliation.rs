#![allow(dead_code)]

use axum::{
    extract::{Extension, Query, State},
    Json,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

use super::super::ApiState;
use crate::models::finance::{CreateReconciliationRequest, Reconciliation, ReconciliationQuery};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

/// 从 Claims 中解析 tenant_id（与 periods.rs 一致的模式）
fn resolve_tenant_id(claims: &Claims) -> Result<Uuid, String> {
    match &claims.tenant_id {
        Some(id) => Uuid::parse_str(id).map_err(|e| format!("无效的租户ID: {}", e)),
        None => Err("缺少租户ID".to_string()),
    }
}

/// 生成对账单号: RECON-YYYYMMDD-6位序列号
async fn generate_reconciliation_no(state: &ApiState, tenant_id: Uuid) -> String {
    let today = Utc::now().format("%Y%m%d").to_string();
    let prefix = format!("RECON-{}", today);

    let seq: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM erp.fin_reconciliations
        WHERE tenant_id = $1 AND reconciliation_no LIKE $2
        "#,
    )
    .bind(tenant_id)
    .bind(format!("{}%", prefix))
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    format!("{}-{:06}", prefix, seq + 1)
}

/// 创建对账记录
///
/// V19.3 真实实现：写入 erp.fin_reconciliations 表
/// V19.5 恢复：从 stub 改回真实实现，支持 CRM 退款流程跨服务调用
pub async fn create_reconciliation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateReconciliationRequest>,
) -> Json<ApiResponse<Reconciliation>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let tenant_id = match resolve_tenant_id(&claims) {
        Ok(id) => id,
        Err(msg) => return Json(api_error(401, &msg)),
    };
    let now = Utc::now();
    let id = Uuid::new_v4();
    let reconciliation_no = generate_reconciliation_no(&state, tenant_id).await;
    let total_amount = req.total_amount.unwrap_or(Decimal::ZERO);
    let operator_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, Reconciliation>(
        r#"
        INSERT INTO erp.fin_reconciliations (
            id, reconciliation_no, reconciliation_type, status, period,
            reference_id, total_amount, reconciled_amount, discrepancy_amount,
            tenant_id, created_by, created_at, updated_at
        ) VALUES (
            $1, $2, $3, 'pending', $4,
            $5, $6, 0, 0,
            $7, $8, $9, $9
        )
        RETURNING id, reconciliation_no, reconciliation_type, status, period,
                  reference_id, total_amount, reconciled_amount, discrepancy_amount,
                  tenant_id, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&reconciliation_no)
    .bind(&req.reconciliation_type)
    .bind(&req.period)
    .bind(&req.reference_id)
    .bind(total_amount)
    .bind(tenant_id)
    .bind(operator_id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "对账记录创建成功")),
        Err(e) => {
            tracing::error!("创建对账记录失败: {}", e);
            Json(api_error(500, "创建对账记录失败"))
        }
    }
}

/// 查询对账记录列表
///
/// 支持按 reconciliation_type / status / period / reference_id 过滤
/// 同时兼容 CRM 跨服务调用使用的 ref_id / ref_type 查询参数
pub async fn list_reconciliations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReconciliationQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let tenant_id = match resolve_tenant_id(&claims) {
        Ok(id) => id,
        Err(msg) => return Json(api_error(401, &msg)),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // ref_id 优先于 reference_id（CRM 跨服务调用使用 ref_id）
    let reference_filter = params.ref_id.or(params.reference_id);

    let result = sqlx::query_as::<_, Reconciliation>(
        r#"
        SELECT id, reconciliation_no, reconciliation_type, status, period,
               reference_id, total_amount, reconciled_amount, discrepancy_amount,
               tenant_id, created_by, created_at, updated_at
        FROM erp.fin_reconciliations
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR reconciliation_type = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR period = $4)
          AND ($5::text IS NULL OR reference_id = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&params.reconciliation_type)
    .bind(&params.status)
    .bind(&params.period)
    .bind(&reference_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM erp.fin_reconciliations
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR reconciliation_type = $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR period = $4)
                  AND ($5::text IS NULL OR reference_id = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.reconciliation_type)
            .bind(&params.status)
            .bind(&params.period)
            .bind(&reference_filter)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "获取对账记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取对账记录列表失败: {}", e);
            Json(api_error(500, "获取对账记录列表失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AutoReconcileRequest {
    pub r#type: String,
    pub entity_id: String,
    pub period: String,
}

/// 自动对账（占位实现）
///
/// V19.5: 保留 stub 行为，自动对账逻辑后续实现
pub async fn auto_reconcile(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoReconcileRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    Json(ApiResponse::success(
        serde_json::json!({ "reconciled": 0 }),
        "自动对账完成",
    ))
}
