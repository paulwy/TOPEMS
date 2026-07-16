use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Datelike;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::super::models::{
    BatchOperationResult, CreateVoucherRequest, Voucher, VoucherDetailResponse, VoucherEntry,
    VoucherListResponse, VoucherQuery,
};
use super::utils::{default_tenant_id, generate_voucher_no};

pub async fn list_vouchers(
    State(state): State<AppState>,
    Query(query): Query<VoucherQuery>,
) -> Json<ApiResponse<VoucherListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_finance_vouchers
           WHERE tenant_id = $1
           AND ($2::text IS NULL OR voucher_type = $2)
           AND ($3::text IS NULL OR period = $3)
           AND ($4::text IS NULL OR status = $4)"#,
    )
    .bind(tenant_id)
    .bind(query.voucher_type.clone())
    .bind(query.period.clone())
    .bind(query.status.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证总数失败: {}", e);
            return Json(api_error(500, "查询凭证总数失败"));
        }
    };

    let vouchers: Vec<Voucher> = match sqlx::query_as(
        r#"SELECT * FROM core_finance_vouchers
           WHERE tenant_id = $1
           AND ($2::text IS NULL OR voucher_type = $2)
           AND ($3::text IS NULL OR period = $3)
           AND ($4::text IS NULL OR status = $4)
           ORDER BY voucher_date DESC, voucher_no DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.voucher_type)
    .bind(query.period)
    .bind(query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证列表失败: {}", e);
            return Json(api_error(500, "查询凭证列表失败"));
        }
    };

    Json(api_success(VoucherListResponse {
        items: vouchers,
        total,
        page,
        page_size,
    }))
}

pub async fn get_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<VoucherDetailResponse>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        "SELECT * FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证失败: {}", e);
            return Json(api_error(500, "查询凭证失败"));
        }
    };

    let voucher = match voucher {
        Some(v) => v,
        None => return Json(api_error(404, "凭证不存在")),
    };

    let entries: Vec<VoucherEntry> = match sqlx::query_as(
        "SELECT * FROM core_finance_voucher_entries WHERE voucher_id = $1 ORDER BY line_no ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证分录失败: {}", e);
            return Json(api_error(500, "查询凭证分录失败"));
        }
    };

    Json(api_success(VoucherDetailResponse { voucher, entries }))
}

pub async fn get_voucher_entries(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<VoucherEntry>>> {
    let entries: Vec<VoucherEntry> = match sqlx::query_as(
        "SELECT * FROM core_finance_voucher_entries WHERE voucher_id = $1 ORDER BY line_no ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证分录失败: {}", e);
            return Json(api_error(500, "查询凭证分录失败"));
        }
    };

    Json(api_success(entries))
}

pub async fn create_voucher(
    State(state): State<AppState>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<VoucherDetailResponse>> {
    let tenant_id = default_tenant_id();
    let voucher_no = generate_voucher_no();

    let voucher_date = match chrono::NaiveDate::parse_from_str(&req.voucher_date, "%Y-%m-%d") {
        Ok(v) => v,
        Err(_) => return Json(api_error(400, "日期格式不正确")),
    };

    let period = req
        .period
        .unwrap_or_else(|| format!("{}{:02}", voucher_date.year(), voucher_date.month()));

    let voucher: Voucher = match sqlx::query_as(
        r#"INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_type, period, voucher_date, summary)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(voucher_no)
    .bind(req.voucher_type)
    .bind(period)
    .bind(voucher_date)
    .bind(req.summary)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建凭证失败: {}", e);
            return Json(api_error(500, "创建凭证失败"));
        }
    };

    for (index, entry) in req.entries.iter().enumerate() {
        let account_id = match Uuid::parse_str(&entry.account_id) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let account: Option<(String, String)> =
            match sqlx::query_as("SELECT code, name FROM core_finance_accounts WHERE id = $1")
                .bind(account_id)
                .fetch_optional(&state.pool)
                .await
            {
                Ok(v) => v,
                Err(_) => None,
            };

        if let Some((account_code, account_name)) = account {
            let _ = sqlx::query(
                r#"INSERT INTO core_finance_voucher_entries
                   (voucher_id, line_no, account_id, account_code, account_name, debit, credit, summary)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
            )
            .bind(voucher.id)
            .bind((index + 1) as i32)
            .bind(account_id)
            .bind(account_code)
            .bind(account_name)
            .bind(entry.debit)
            .bind(entry.credit)
            .bind(entry.summary.clone())
            .execute(&state.pool)
            .await;
        }
    }

    let entries: Vec<VoucherEntry> = match sqlx::query_as(
        "SELECT * FROM core_finance_voucher_entries WHERE voucher_id = $1 ORDER BY line_no ASC",
    )
    .bind(voucher.id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证分录失败: {}", e);
            return Json(api_error(500, "查询凭证分录失败"));
        }
    };

    Json(api_success(VoucherDetailResponse { voucher, entries }))
}

pub async fn update_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher_date = match chrono::NaiveDate::parse_from_str(&req.voucher_date, "%Y-%m-%d") {
        Ok(v) => v,
        Err(_) => return Json(api_error(400, "日期格式不正确")),
    };

    let period = req
        .period
        .unwrap_or_else(|| format!("{}{:02}", voucher_date.year(), voucher_date.month()));

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET voucher_type = $1, period = $2, voucher_date = $3, summary = $4, updated_at = NOW()
           WHERE tenant_id = $5 AND id = $6 AND status = 'draft'
           RETURNING *"#,
    )
    .bind(req.voucher_type)
    .bind(period)
    .bind(voucher_date)
    .bind(req.summary)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新凭证失败: {}", e);
            return Json(api_error(500, "更新凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可修改")),
    }
}

pub async fn delete_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(
        "DELETE FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2 AND status = 'draft'",
    )
    .bind(tenant_id)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "凭证不存在或状态不可删除")),
        Err(e) => {
            tracing::error!("删除凭证失败: {}", e);
            Json(api_error(500, "删除凭证失败"))
        }
    }
}

pub async fn submit_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET status = 'submitted', updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("提交凭证失败: {}", e);
            return Json(api_error(500, "提交凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可提交")),
    }
}

pub async fn approve_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET status = 'approved', updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("审批凭证失败: {}", e);
            return Json(api_error(500, "审批凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可审批")),
    }
}

pub async fn post_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET status = 'posted', updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2 AND status = 'approved'
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("过账凭证失败: {}", e);
            return Json(api_error(500, "过账凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可过账")),
    }
}

pub async fn batch_approve_vouchers(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let ids: Vec<Uuid> = match body.get("ids").and_then(|v| v.as_array()) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().and_then(|s| Uuid::parse_str(s).ok()))
            .collect(),
        None => return Json(api_error(400, "缺少 ids 参数")),
    };

    let tenant_id = default_tenant_id();
    let mut success = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in ids {
        let result = sqlx::query(
            r#"UPDATE core_finance_vouchers
               SET status = 'approved', updated_at = NOW()
               WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'"#,
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => success += 1,
            Ok(_) => {
                failed += 1;
                errors.push(format!("凭证 {} 审批失败", id));
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("凭证 {} 错误: {}", id, e));
            }
        }
    }

    Json(api_success(BatchOperationResult {
        success,
        failed,
        errors,
    }))
}

pub async fn batch_post_vouchers(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let ids: Vec<Uuid> = match body.get("ids").and_then(|v| v.as_array()) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().and_then(|s| Uuid::parse_str(s).ok()))
            .collect(),
        None => return Json(api_error(400, "缺少 ids 参数")),
    };

    let tenant_id = default_tenant_id();
    let mut success = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in ids {
        let result = sqlx::query(
            r#"UPDATE core_finance_vouchers
               SET status = 'posted', updated_at = NOW()
               WHERE tenant_id = $1 AND id = $2 AND status = 'approved'"#,
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => success += 1,
            Ok(_) => {
                failed += 1;
                errors.push(format!("凭证 {} 过账失败", id));
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("凭证 {} 错误: {}", id, e));
            }
        }
    }

    Json(api_success(BatchOperationResult {
        success,
        failed,
        errors,
    }))
}

pub async fn batch_delete_vouchers(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let ids: Vec<Uuid> = match body.get("ids").and_then(|v| v.as_array()) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().and_then(|s| Uuid::parse_str(s).ok()))
            .collect(),
        None => return Json(api_error(400, "缺少 ids 参数")),
    };

    let tenant_id = default_tenant_id();
    let mut success = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in ids {
        let result = sqlx::query(
            "DELETE FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2 AND status = 'draft'",
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => success += 1,
            Ok(_) => {
                failed += 1;
                errors.push(format!("凭证 {} 删除失败", id));
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("凭证 {} 错误: {}", id, e));
            }
        }
    }

    Json(api_success(BatchOperationResult {
        success,
        failed,
        errors,
    }))
}

pub async fn get_next_voucher_no(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(api_success(
        serde_json::json!({ "voucher_no": generate_voucher_no() }),
    ))
}
