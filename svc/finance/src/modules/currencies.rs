//! P1-10 财务主数据：币种主表 CRUD（finance.core_finance_currencies）
//!
//! 端点（挂载于 /api/finance 前缀）：
//! - GET  /currencies            分页列表（search / is_active 筛选）
//! - POST /currencies            新增币种
//! - PUT  /currencies/{id}       更新（name/symbol/exchange_rate/is_active）
//! - DELETE /currencies/{id}     删除币种

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::IntoParams;
use uuid::Uuid;

use crate::shared::AppState;

#[derive(Debug, Serialize, sqlx::FromRow, ToSchema)]
pub struct Currency {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub symbol: Option<String>,
    pub exchange_rate: f64,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCurrencyRequest {
    pub code: String,
    pub name: String,
    pub symbol: Option<String>,
    #[serde(default = "default_rate")]
    pub exchange_rate: f64,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCurrencyRequest {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub exchange_rate: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct CurrencyQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PaginatedCurrencies {
    pub items: Vec<Currency>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub code: u16,
    pub data: Option<T>,
    pub message: String,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            code: 200,
            data: Some(data),
            message: "操作成功".to_string(),
        }
    }

    pub fn error(message: &str) -> Self {
        Self::error_with_code(400, message)
    }

    pub fn error_with_code(code: u16, message: &str) -> Self {
        Self {
            success: false,
            code,
            data: None,
            message: message.to_string(),
        }
    }
}

fn default_rate() -> f64 {
    1.0
}
fn default_true() -> bool {
    true
}

const TABLE: &str = "finance.core_finance_currencies";

/// 币种列表（分页 + 搜索 + 启用状态筛选）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:currency:read"])),
    path = "/api/finance/currencies",
    params(CurrencyQuery),
    responses((status = 200, description = "查询成功", body = PaginatedCurrencies)),
    tag = "FinanceMaster"
)]
pub async fn list_currencies(
    State(state): State<AppState>,
    Query(query): Query<CurrencyQuery>,
) -> Json<ApiResponse<PaginatedCurrencies>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let mut conditions: Vec<String> = vec![];
    let mut params: Vec<String> = vec![];

    if let Some(search) = &query.search {
        conditions.push(format!(
            "(code ILIKE ${} OR name ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        params.push(format!("%{}%", search));
        params.push(format!("%{}%", search));
    }
    if let Some(active) = query.is_active {
        conditions.push(format!("is_active = ${}", params.len() + 1));
        params.push(active.to_string());
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM {} {}", TABLE, where_clause);
    let mut count_qb = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_qb = count_qb.bind(p);
    }
    let mut scope = match state.db.scope_read().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("创建币种查询作用域失败: {}", e);
            return Json(ApiResponse::error("查询失败"));
        }
    };
    let total: i64 = match count_qb.fetch_one(&mut scope).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询币种总数失败: {}", e);
            return Json(ApiResponse::error("查询失败"));
        }
    };

    let data_sql = format!(
        "SELECT id, tenant_id, code, name, symbol, exchange_rate::float8 AS exchange_rate, is_active, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at \
         FROM {} {} ORDER BY code ASC LIMIT ${} OFFSET ${}",
        TABLE,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );
    let mut qb = sqlx::query_as::<_, Currency>(sqlx::AssertSqlSafe(data_sql));
    for p in &params {
        qb = qb.bind(p);
    }
    qb = qb.bind(page_size).bind(offset);

    let items = match qb.fetch_all(&mut scope).await {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("查询币种列表失败: {}", e);
            return Json(ApiResponse::error("查询失败"));
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("提交币种查询作用域失败: {}", e);
        return Json(ApiResponse::error("查询失败"));
    }
    Json(ApiResponse::success(PaginatedCurrencies {
        items,
        total,
        page,
        page_size,
    }))
}

/// 新增币种
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:currency:write"])),
    path = "/api/finance/currencies",
    responses((status = 200, description = "创建成功", body = Currency)),
    tag = "FinanceMaster"
)]
pub async fn create_currency(
    State(state): State<AppState>,
    Json(req): Json<CreateCurrencyRequest>,
) -> Json<ApiResponse<Currency>> {
    let code = req.code.trim().to_uppercase();
    if code.is_empty() {
        return Json(ApiResponse::error("币种代码不能为空"));
    }
    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Json(ApiResponse::error("币种名称不能为空"));
    }

    let sql = format!(
        "INSERT INTO {} (tenant_id, code, name, symbol, exchange_rate, is_active) \
         VALUES (NULL, $1, $2, $3, $4, $5) RETURNING id, tenant_id, code, name, symbol, exchange_rate::float8 AS exchange_rate, is_active, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at",
        TABLE
    );
    let mut scope = match state.db.scope().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("创建币种写入作用域失败: {}", e);
            return Json(ApiResponse::error("创建失败"));
        }
    };
    let result = sqlx::query_as::<_, Currency>(sqlx::AssertSqlSafe(sql))
        .bind(&code)
        .bind(&name)
        .bind(&req.symbol)
        .bind(req.exchange_rate)
        .bind(req.is_active)
        .fetch_one(&mut scope)
        .await;
    if let Err(e) = scope.commit().await {
        tracing::error!("提交创建币种作用域失败: {}", e);
        return Json(ApiResponse::error("创建失败"));
    }
    match result {
        Ok(c) => Json(ApiResponse::success(c)),
        Err(e) => {
            tracing::error!("创建币种失败: {}", e);
            if e.to_string()
                .contains("uk_core_finance_currencies_tenant_code")
            {
                Json(ApiResponse::error_with_code(
                    409,
                    &format!("币种代码 {} 已存在", code),
                ))
            } else {
                Json(ApiResponse::error("创建失败"))
            }
        }
    }
}

/// 更新币种
#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:currency:write"])),
    path = "/api/finance/currencies/{id}",
    params(("id" = Uuid, Path, description = "币种 ID")),
    responses((status = 200, description = "更新成功", body = Currency)),
    tag = "FinanceMaster"
)]
pub async fn update_currency(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCurrencyRequest>,
) -> Json<ApiResponse<Currency>> {
    let sql = format!(
        "UPDATE {} SET \
         name = COALESCE($2, name), \
         symbol = COALESCE($3, symbol), \
         exchange_rate = COALESCE($4, exchange_rate), \
         is_active = COALESCE($5, is_active), \
         updated_at = CURRENT_TIMESTAMP \
         WHERE id = $1 \
         RETURNING id, tenant_id, code, name, symbol, exchange_rate::float8 AS exchange_rate, is_active, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at",
        TABLE
    );
    let mut scope = match state.db.scope().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("创建币种写入作用域失败: {}", e);
            return Json(ApiResponse::error("更新失败"));
        }
    };
    let result = sqlx::query_as::<_, Currency>(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .bind(&req.name)
        .bind(&req.symbol)
        .bind(req.exchange_rate)
        .bind(req.is_active)
        .fetch_optional(&mut scope)
        .await;
    if let Err(e) = scope.commit().await {
        tracing::error!("提交更新币种作用域失败: {}", e);
        return Json(ApiResponse::error("更新失败"));
    }
    match result {
        Ok(Some(c)) => Json(ApiResponse::success(c)),
        Ok(None) => Json(ApiResponse::error_with_code(404, "币种不存在")),
        Err(e) => {
            tracing::error!("更新币种失败: {}", e);
            Json(ApiResponse::error("更新失败"))
        }
    }
}

/// 删除币种
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:currency:delete"])),
    path = "/api/finance/currencies/{id}",
    params(("id" = Uuid, Path, description = "币种 ID")),
    responses((status = 200, description = "删除成功")),
    tag = "FinanceMaster"
)]
pub async fn delete_currency(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let sql = format!("DELETE FROM {} WHERE id = $1", TABLE);
    let mut scope = match state.db.scope().await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("创建币种写入作用域失败: {}", e);
            return Json(ApiResponse::error("删除失败"));
        }
    };
    let result = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .execute(&mut scope)
        .await;
    if let Err(e) = scope.commit().await {
        tracing::error!("提交删除币种作用域失败: {}", e);
        return Json(ApiResponse::error("删除失败"));
    }
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(())),
        Ok(_) => Json(ApiResponse::error("币种不存在")),
        Err(e) => {
            tracing::error!("删除币种失败: {}", e);
            Json(ApiResponse::error("删除失败"))
        }
    }
}

pub fn create_routes() -> axum::Router<AppState> {
    use axum::routing::{get, put};
    axum::Router::new()
        .route("/currencies", get(list_currencies).post(create_currency))
        .route(
            "/currencies/{id}",
            put(update_currency).delete(delete_currency),
        )
        // 批 40：币种路由挂 finance:currency:read 细码（纵深防御；
        // 写端点在网关层 require_finance_write 已要求 finance:admin）
        .layer(axum::middleware::from_fn(
            topems_shared_auth::middleware::require_permission("finance:currency:read"),
        ))
}

use utoipa::ToSchema;

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn test_error_response_carries_code_field() {
        let json = serde_json::to_value(ApiResponse::<()>::error("币种代码不能为空"))
            .expect("response should serialize");
        assert_eq!(json.get("success"), Some(&serde_json::json!(false)));
        assert_eq!(json.get("code"), Some(&serde_json::json!(400)));
        assert_eq!(
            json.get("message"),
            Some(&serde_json::json!("币种代码不能为空"))
        );
    }

    #[test]
    fn test_conflict_and_not_found_codes() {
        let conflict = serde_json::to_value(ApiResponse::<()>::error_with_code(409, "已存在"))
            .expect("response should serialize");
        assert_eq!(conflict.get("success"), Some(&serde_json::json!(false)));
        assert_eq!(conflict.get("code"), Some(&serde_json::json!(409)));

        let not_found = serde_json::to_value(ApiResponse::<()>::error_with_code(404, "不存在"))
            .expect("response should serialize");
        assert_eq!(not_found.get("success"), Some(&serde_json::json!(false)));
        assert_eq!(not_found.get("code"), Some(&serde_json::json!(404)));
    }
}
