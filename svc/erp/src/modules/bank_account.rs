// ERP · 银行账户管理模块
//
// 第一批-② 前后端对应性修复：前端 bankAccountApi（apps/web/src/api/erp/bankAccount.ts）
// 契约 5 方法（list/get/create/update/delete），此前后端无路由（审计 P0）。
// 表：erp.bank_accounts（迁移 20260908000002）

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/bank-accounts",
            get(list_bank_accounts).post(create_bank_account),
        )
        .route(
            "/bank-accounts/{id}",
            get(get_bank_account)
                .put(update_bank_account)
                .delete(delete_bank_account),
        )
}

#[derive(Debug, Deserialize)]
pub struct ListBankAccountsQuery {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub status: Option<String>,
    pub keyword: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBankAccountRequest {
    pub bank_name: String,
    pub account_number: String,
    pub account_name: String,
    pub bank_code: Option<String>,
    pub currency: Option<String>,
    pub balance: Option<f64>,
    pub is_default: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBankAccountRequest {
    pub bank_name: Option<String>,
    pub account_number: Option<String>,
    pub account_name: Option<String>,
    pub bank_code: Option<String>,
    pub currency: Option<String>,
    pub balance: Option<f64>,
    pub is_default: Option<bool>,
    pub status: Option<String>,
}

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
    )
}

fn row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "bank_name": row.get::<String, _>("bank_name"),
        "account_number": row.get::<String, _>("account_number"),
        "account_name": row.get::<String, _>("account_name"),
        "bank_code": row.get::<Option<String>, _>("bank_code"),
        "currency": row.get::<Option<String>, _>("currency"),
        "balance": row.get::<Option<f64>, _>("balance"),
        "is_default": row.get::<bool, _>("is_default"),
        "status": row.get::<String, _>("status"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
        "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
    })
}

pub async fn list_bank_accounts(
    State(_state): State<ApiState>,
    Query(params): Query<ListBankAccountsQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    // 静态 SQL + $N::text IS NULL OR 模式（schema 边界宏要求字符串字面量）
    let status = params.status.clone();
    let keyword = params.keyword.clone();

    let total: i64 = match sqlx::query(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.bank_accounts \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR bank_name ILIKE '%' || $2 || '%' \
             OR account_number ILIKE '%' || $2 || '%' \
             OR account_name ILIKE '%' || $2 || '%')"
    ))
    .bind(&status)
    .bind(&keyword)
    .fetch_one(&mut **txn)
    .await
    {
        Ok(row) => row.get::<i64, _>(0),
        Err(e) => {
            tracing::error!("统计银行账户失败: {}", e);
            return Err(internal_error("统计银行账户失败"));
        }
    };

    let rows = match sqlx::query(only_own_schema_query!("erp",
        "SELECT id, bank_name, account_number, account_name, bank_code, currency, balance, is_default, status, created_at, updated_at \
         FROM erp.bank_accounts \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR bank_name ILIKE '%' || $2 || '%' \
             OR account_number ILIKE '%' || $2 || '%' \
             OR account_name ILIKE '%' || $2 || '%') \
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"))
        .bind(&status)
        .bind(&keyword)
        .bind(pagesize)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询银行账户失败: {}", e);
            return Err(internal_error("查询银行账户失败"));
        }
    };

    let items: Vec<serde_json::Value> = rows.iter().map(row_to_json).collect();

    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取银行账户列表成功",
    )))
}

pub async fn get_bank_account(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = match sqlx::query(only_own_schema_query!("erp",
        "SELECT id, bank_name, account_number, account_name, bank_code, currency, balance, is_default, status, created_at, updated_at \
         FROM erp.bank_accounts WHERE id = $1"))
        .bind(id)
        .fetch_optional(&mut **txn)
        .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error(404, "银行账户不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("查询银行账户失败: {}", e);
            return Err(internal_error("查询银行账户失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        row_to_json(&row),
        "获取银行账户成功",
    )))
}

pub async fn create_bank_account(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateBankAccountRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let currency = req.currency.unwrap_or_else(|| "CNY".to_string());
    let balance = req.balance.unwrap_or(0.0);
    let is_default = req.is_default.unwrap_or(false);
    let status = req.status.unwrap_or_else(|| "active".to_string());

    let row = match sqlx::query(only_own_schema_query!("erp",
        "INSERT INTO erp.bank_accounts \
         (bank_name, account_number, account_name, bank_code, currency, balance, is_default, status) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
         RETURNING id, bank_name, account_number, account_name, bank_code, currency, balance, is_default, status, created_at, updated_at"))
        .bind(&req.bank_name)
        .bind(&req.account_number)
        .bind(&req.account_name)
        .bind(&req.bank_code)
        .bind(&currency)
        .bind(balance)
        .bind(is_default)
        .bind(&status)
        .fetch_one(&mut **txn)
        .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建银行账户失败: {}", e);
            return Err(internal_error("创建银行账户失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        row_to_json(&row),
        "创建银行账户成功",
    )))
}

pub async fn update_bank_account(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateBankAccountRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    // COALESCE 保留未传字段原值
    let row = match sqlx::query(only_own_schema_query!("erp",
        "UPDATE erp.bank_accounts SET \
         bank_name = COALESCE($2, bank_name), \
         account_number = COALESCE($3, account_number), \
         account_name = COALESCE($4, account_name), \
         bank_code = COALESCE($5, bank_code), \
         currency = COALESCE($6, currency), \
         balance = COALESCE($7, balance), \
         is_default = COALESCE($8, is_default), \
         status = COALESCE($9, status), \
         updated_at = NOW() \
         WHERE id = $1 \
         RETURNING id, bank_name, account_number, account_name, bank_code, currency, balance, is_default, status, created_at, updated_at"))
        .bind(id)
        .bind(&req.bank_name)
        .bind(&req.account_number)
        .bind(&req.account_name)
        .bind(&req.bank_code)
        .bind(&req.currency)
        .bind(req.balance)
        .bind(req.is_default)
        .bind(&req.status)
        .fetch_optional(&mut **txn)
        .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error(404, "银行账户不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("更新银行账户失败: {}", e);
            return Err(internal_error("更新银行账户失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        row_to_json(&row),
        "更新银行账户成功",
    )))
}

pub async fn delete_bank_account(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "DELETE FROM erp.bank_accounts WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error(404, "银行账户不存在")),
                ));
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::error(500, "事务提交失败")),
                    ));
                }
            }
            Ok(Json(ApiResponse::success(
                serde_json::json!({ "deleted": true, "id": id.to_string() }),
                "删除银行账户成功",
            )))
        }
        Err(e) => {
            tracing::error!("删除银行账户失败: {}", e);
            Err(internal_error("删除银行账户失败"))
        }
    }
}
