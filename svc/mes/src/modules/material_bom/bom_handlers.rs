use axum::{
    extract::Extension, extract::Path, extract::Query, extract::State, http::HeaderMap, Json,
};
use chrono::{DateTime, Utc};
use sqlx::types::BigDecimal;

use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::require_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_db::decimal::big_decimal_to_f64;

use topems_shared_core::response::ApiResponse;

use super::models::*;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/boms",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
#[allow(clippy::as_conversions)]
pub async fn list_material_boms(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialBomsQuery>,
) -> ApiResponse<ListMaterialBomsResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取物料BOM列表失败");
        }
    };

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (bom_no ILIKE $1 OR product_name ILIKE $1 OR product_code ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (bom_no ILIKE ${} OR product_name ILIKE ${} OR product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM material_boms{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count material BOMs: {}", e);
            return ApiResponse::server_error("获取物料BOM列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        FROM material_boms
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let boms = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material BOMs: {}", e);
            return ApiResponse::server_error("获取物料BOM列表失败");
        }
    };

    let boms_list: Vec<MaterialBomResponse> = boms
        .into_iter()
        .map(|r| MaterialBomResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            bom_no: r.try_get::<String, _>("bom_no").unwrap_or_default(),
            product_id: r
                .try_get::<Option<Uuid>, _>("product_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            version: r
                .try_get::<Option<String>, _>("version")
                .ok()
                .flatten()
                .unwrap_or_else(|| "1.0".to_string()),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "draft".to_string()),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
        })
        .collect();

    ApiResponse::success(
        ListMaterialBomsResponse {
            boms: boms_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取物料BOM列表成功",
    )
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn create_material_bom(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateMaterialBomRequest>,
) -> ApiResponse<BomDetailResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let bom_no = format!(
        "BOM{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    // material_boms 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return ApiResponse::server_error("创建物料BOM失败");
        }
    };

    let bom_result = sqlx::query!(
        r#"
        INSERT INTO material_boms (
            bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $7, $8)
        RETURNING 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        "#,
        bom_no,
        req.product_id,
        req.product_name,
        req.product_code,
        req.version.unwrap_or_else(|| "1.0".to_string()),
        req.description,
        now,
        tenant_id,
    )
    .fetch_one(&mut scope)
    .await;

    let bom = match bom_result {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("Failed to create material BOM: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("创建物料BOM失败");
        }
    };

    let mut item_responses = Vec::new();
    for (idx, item) in req.items.iter().enumerate() {
        let item_result = sqlx::query!(
            r#"
            INSERT INTO bom_items (
                bom_id, material_id, material_code, material_name,
                specification, unit, quantity, loss_rate, sequence, notes, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING 
                id, bom_id, material_id, material_code, material_name,
                specification, unit, quantity, loss_rate, sequence, notes
            "#,
            bom.id,
            item.material_id,
            item.material_code.clone(),
            item.material_name.clone(),
            item.specification.clone(),
            item.unit.clone(),
            item.quantity
                .to_string()
                .parse::<BigDecimal>()
                .ok()
                .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
            item.loss_rate
                .unwrap_or(0.0)
                .to_string()
                .parse::<BigDecimal>()
                .ok()
                .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
            item.sequence.unwrap_or(idx as i32),
            item.notes.clone(),
            tenant_id,
        )
        .fetch_one(&mut scope)
        .await;

        match item_result {
            Ok(i) => {
                item_responses.push(BomItemResponse {
                    id: i.id.to_string(),
                    bom_id: i.bom_id.to_string(),
                    material_id: i.material_id.map(|u| u.to_string()),
                    material_code: i.material_code,
                    material_name: i.material_name,
                    specification: i.specification,
                    unit: i.unit,
                    quantity: big_decimal_to_f64(Some(i.quantity)),
                    loss_rate: big_decimal_to_f64(i.loss_rate),
                    sequence: i.sequence.unwrap_or(0),
                    notes: i.notes,
                });
            }
            Err(e) => {
                tracing::error!("Failed to create BOM item: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("创建BOM明细失败");
            }
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("创建物料BOM失败");
    }

    let bom_response = MaterialBomResponse {
        id: bom.id.to_string(),
        bom_no: bom.bom_no,
        product_id: bom.product_id.map(|u| u.to_string()),
        product_name: bom.product_name,
        product_code: bom.product_code,
        version: bom.version.unwrap_or_else(|| "1.0".to_string()),
        status: bom.status.unwrap_or_else(|| "draft".to_string()),
        description: bom.description,
        created_at: bom.created_at.unwrap_or_else(Utc::now),
        updated_at: bom.updated_at.unwrap_or_else(Utc::now),
    };

    ApiResponse::success(
        BomDetailResponse {
            bom: bom_response,
            items: item_responses,
        },
        "物料BOM创建成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/boms/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn get_material_bom(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<BomDetailResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取物料BOM失败");
        }
    };

    let bom_result = sqlx::query!(
        r#"
        SELECT 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        FROM material_boms
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&mut scope)
    .await;

    let bom = match bom_result {
        Ok(Some(b)) => b,
        Ok(None) => return ApiResponse::not_found("物料BOM不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch material BOM: {}", e);
            return ApiResponse::server_error("获取物料BOM失败");
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT 
            id, bom_id, material_id, material_code, material_name,
            specification, unit, quantity, loss_rate, sequence, notes
        FROM bom_items
        WHERE bom_id = $1
        ORDER BY sequence ASC
        "#,
        id,
    )
    .fetch_all(&mut scope)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch BOM items: {}", e);
            return ApiResponse::server_error("获取BOM明细失败");
        }
    };

    let bom_response = MaterialBomResponse {
        id: bom.id.to_string(),
        bom_no: bom.bom_no,
        product_id: bom.product_id.map(|u| u.to_string()),
        product_name: bom.product_name,
        product_code: bom.product_code,
        version: bom.version.unwrap_or_else(|| "1.0".to_string()),
        status: bom.status.unwrap_or_else(|| "draft".to_string()),
        description: bom.description,
        created_at: bom.created_at.unwrap_or_else(Utc::now),
        updated_at: bom.updated_at.unwrap_or_else(Utc::now),
    };

    let item_responses: Vec<BomItemResponse> = items
        .into_iter()
        .map(|i| BomItemResponse {
            id: i.id.to_string(),
            bom_id: i.bom_id.to_string(),
            material_id: i.material_id.map(|u| u.to_string()),
            material_code: i.material_code,
            material_name: i.material_name,
            specification: i.specification,
            unit: i.unit,
            quantity: big_decimal_to_f64(Some(i.quantity)),
            loss_rate: big_decimal_to_f64(i.loss_rate),
            sequence: i.sequence.unwrap_or(0),
            notes: i.notes,
        })
        .collect();

    ApiResponse::success(
        BomDetailResponse {
            bom: bom_response,
            items: item_responses,
        },
        "获取物料BOM成功",
    )
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn update_material_bom(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateMaterialBomRequest>,
) -> ApiResponse<BomDetailResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await
    {
        return e;
    }

    let now = Utc::now();

    // material_boms 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return ApiResponse::server_error("更新物料BOM失败");
        }
    };

    let bom_result = sqlx::query!(
        r#"
        UPDATE material_boms SET
            version = COALESCE($2, version),
            status = COALESCE($3, status),
            description = COALESCE($4, description),
            updated_at = $5
        WHERE id = $1
        RETURNING 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        "#,
        id,
        req.version,
        req.status,
        req.description,
        now,
    )
    .fetch_optional(&mut scope)
    .await;

    let _bom = match bom_result {
        Ok(Some(b)) => b,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("物料BOM不存在");
        }
        Err(e) => {
            tracing::error!("Failed to update material BOM: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("更新物料BOM失败");
        }
    };

    if let Some(items) = req.items {
        let _ = sqlx::query!("DELETE FROM bom_items WHERE bom_id = $1", id)
            .execute(&mut scope)
            .await;

        // 子表从父行继承租户：以父行当前租户为准（服务身份更新他人租户行时也不会写出 nil 子行）。
        let parent_tenant: Option<Uuid> =
            sqlx::query_scalar("SELECT tenant_id FROM material_boms WHERE id = $1")
                .bind(id)
                .fetch_optional(&mut scope)
                .await
                .ok()
                .flatten();
        let item_tenant = parent_tenant.or(Some(tenant_id));

        for (idx, item) in items.iter().enumerate() {
            let _ = sqlx::query!(
                r#"
                INSERT INTO bom_items (
                    bom_id, material_id, material_code, material_name,
                    specification, unit, quantity, loss_rate, sequence, notes, tenant_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                "#,
                id,
                item.material_id,
                item.material_code.clone(),
                item.material_name.clone(),
                item.specification.clone(),
                item.unit.clone(),
                item.quantity
                    .to_string()
                    .parse::<BigDecimal>()
                    .ok()
                    .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
                item.loss_rate
                    .unwrap_or(0.0)
                    .to_string()
                    .parse::<BigDecimal>()
                    .ok()
                    .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
                item.sequence.unwrap_or(idx as i32),
                item.notes.clone(),
                item_tenant,
            )
            .execute(&mut scope)
            .await;
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("更新物料BOM失败");
    }
    // 下游 handler 会重新取同一把请求事务锁，必须先释放
    drop(guard);

    get_material_bom(
        State(AppState {
            auth_state: state.auth_state.clone(),
            pool: state.pool.clone(),
            db: state.db.clone(),
            health_config: state.health_config.clone(),
            event_publisher: state.event_publisher.clone(),
            erp_client: None,
            dict_cache: state.dict_cache.clone(),
        }),
        Extension(txn_arc),
        Extension(claims),
        Path(id),
    )
    .await
}

pub async fn delete_material_bom(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除物料BOM失败");
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE material_boms SET deleted_at = NOW()
        WHERE id = $1 AND status = 'draft'
        "#,
        id,
    )
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("Failed to delete material BOM: {}", e);
            return ApiResponse::server_error("删除物料BOM失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("删除物料BOM失败");
    }

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "物料BOM删除成功")
    } else {
        ApiResponse::not_found("物料BOM不存在或状态不允许删除")
    }
}
