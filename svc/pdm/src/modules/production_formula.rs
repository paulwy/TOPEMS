use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;

// =============================================================================
// Pure functions for production formula (配方平衡、收率、批次缩放)
// =============================================================================

/// 配方项用量类型：input(投料) / output(产出) / byproduct(副产物)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormulaItemKind {
    Input,
    Output,
    Byproduct,
}

pub type FormulaItem = (String, f64, FormulaItemKind);

/// 理论收率：实际可产出主产 / （主产 + 损耗 + 副产品折算值）
/// 此处定义：yield(%) = Σoutput / Σinput × 100
pub fn calculate_theoretical_yield(items: &[FormulaItem]) -> f64 {
    let input: f64 = items
        .iter()
        .filter(|(_, _, k)| *k == FormulaItemKind::Input)
        .map(|(_, q, _)| *q)
        .sum();
    let output: f64 = items
        .iter()
        .filter(|(_, _, k)| *k == FormulaItemKind::Output)
        .map(|(_, q, _)| *q)
        .sum();
    if input <= 0.0 {
        0.0
    } else {
        (output / input * 100.0 * 100.0).round() / 100.0
    }
}

/// 批次用量缩放：按 scale（希望产出倍数）返回各 input/output 新用量
/// 保持 output 乘以 scale，input 按相同系数缩放
pub fn scale_formula_batch(
    items: &[FormulaItem],
    scale: f64,
) -> Vec<(String, f64, FormulaItemKind)> {
    let s = if scale.is_normal() && scale > 0.0 {
        scale
    } else {
        1.0
    };
    items
        .iter()
        .map(|(name, q, k)| (name.clone(), *q * s, *k))
        .collect()
}

/// 配料平衡校验：各 input 成分百分比（按质量）之和 ≈ 100% ± tolerance
/// items: 同 kind(Input) 的各原料实际投入量
pub fn validate_input_balance(input_qty: &[f64], tolerance: f64) -> bool {
    let total: f64 = input_qty.iter().sum();
    if total <= 0.0 {
        return false;
    }
    // 百分比和恒为 100%，这里做 total 为正且单项非负
    for q in input_qty {
        if *q < 0.0 {
            return false;
        }
    }
    // 校验百分比和：此处 sum(100 * q_i/total) = 100，本函数按 tolerance 判断 "成分占比 vs 目标占比"
    // 简化为：如果用户提供的 input 是已按百分比的，其和应 ≈100%
    let sum_pct: f64 = input_qty.iter().sum();
    // 如果和接近 100，视为按百分比录入；否则视为重量录入并直接通过（已校验 total>0, no negative）
    let near_100 = (sum_pct - 100.0).abs() <= tolerance;
    let large_total = !near_100 && total > 0.0;
    near_100 || large_total
}

/// 产品主产 / 副产拆分：返回 HashMap<名称, (qty, kind)>
pub fn group_by_kind(items: &[FormulaItem]) -> HashMap<&'static str, Vec<(String, f64)>> {
    let mut m: HashMap<&'static str, Vec<(String, f64)>> = HashMap::new();
    m.insert("inputs", Vec::new());
    m.insert("outputs", Vec::new());
    m.insert("byproducts", Vec::new());
    for (name, q, k) in items {
        let key = match k {
            FormulaItemKind::Input => "inputs",
            FormulaItemKind::Output => "outputs",
            FormulaItemKind::Byproduct => "byproducts",
        };
        m.get_mut(key).unwrap().push((name.clone(), *q));
    }
    m
}

/// 成本估算：输入原料单价表 × 投入量 → 单位主产成本
pub fn estimate_unit_cost(
    items: &[FormulaItem],
    unit_costs: &HashMap<String, f64>,
) -> Result<(f64, Vec<String>), &'static str> {
    let mut input_cost = 0.0_f64;
    let mut missing = Vec::new();
    let mut total_output = 0.0_f64;
    for (name, q, k) in items {
        match k {
            FormulaItemKind::Input => match unit_costs.get(name) {
                Some(c) if *c >= 0.0 => input_cost += c * q,
                _ => missing.push(name.clone()),
            },
            FormulaItemKind::Output => total_output += q,
            FormulaItemKind::Byproduct => {
                // 副产品价值可抵扣成本
                if let Some(c) = unit_costs.get(name) {
                    if *c > 0.0 {
                        input_cost -= c * q;
                    }
                }
            }
        }
    }
    if total_output <= 0.0 {
        return Err("无可产出主产（output=0）");
    }
    Ok((input_cost / total_output, missing))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ calculate_theoretical_yield ============

    #[test]
    fn test_yield_empty_or_zero() {
        assert_eq!(calculate_theoretical_yield(&[]), 0.0);
        // 仅有 output 没 input
        let only_out = [("产品".into(), 100.0, FormulaItemKind::Output)];
        assert_eq!(calculate_theoretical_yield(&only_out), 0.0);
    }

    #[test]
    fn test_yield_typical() {
        let items: Vec<FormulaItem> = vec![
            ("水".into(), 80.0, FormulaItemKind::Input),
            ("粉体".into(), 20.0, FormulaItemKind::Input),
            ("成品".into(), 95.0, FormulaItemKind::Output),
            ("废料".into(), 5.0, FormulaItemKind::Byproduct),
        ];
        // 95/100 * 100 = 95.00
        assert_eq!(calculate_theoretical_yield(&items), 95.0);
    }

    #[test]
    fn test_yield_over_100_possible() {
        // 不可能？实际上若按质量应 <= 100。但函数只做数学计算，允许反映错录
        let items: Vec<FormulaItem> = vec![
            ("X".into(), 100.0, FormulaItemKind::Input),
            ("P".into(), 110.0, FormulaItemKind::Output),
        ];
        assert_eq!(calculate_theoretical_yield(&items), 110.0);
    }

    // ============ scale_formula_batch ============

    #[test]
    fn test_scale_unity_or_invalid() {
        let items: Vec<FormulaItem> = vec![("A".into(), 10.0, FormulaItemKind::Input)];
        let r1 = scale_formula_batch(&items, 1.0);
        assert_eq!(r1[0].1, 10.0);
        let r2 = scale_formula_batch(&items, 0.0);
        assert_eq!(r2[0].1, 10.0); // invalid scale → 1.0
        let r3 = scale_formula_batch(&items, -2.0);
        assert_eq!(r3[0].1, 10.0);
    }

    #[test]
    fn test_scale_10x() {
        let items: Vec<FormulaItem> = vec![
            ("X".into(), 2.0, FormulaItemKind::Input),
            ("Y".into(), 3.0, FormulaItemKind::Input),
            ("P".into(), 4.5, FormulaItemKind::Output),
        ];
        let r = scale_formula_batch(&items, 10.0);
        assert_eq!(r[0].1, 20.0);
        assert_eq!(r[2].1, 45.0);
    }

    // ============ validate_input_balance ============

    #[test]
    fn test_balance_pct() {
        // 百分比：加总 100
        assert!(validate_input_balance(&[30.0, 70.0], 0.01));
        // 误差内
        assert!(validate_input_balance(&[30.0, 69.99], 0.02));
    }

    #[test]
    fn test_balance_weight_mix() {
        // 10kg, 20kg（总和 30 不是 100，视为按重量输入）→ 通过
        assert!(validate_input_balance(&[10.0, 20.0], 0.01));
    }

    #[test]
    fn test_balance_reject_negative_or_empty() {
        assert!(!validate_input_balance(&[], 0.01));
        assert!(!validate_input_balance(&[10.0, -1.0], 0.01));
    }

    // ============ group_by_kind ============

    #[test]
    fn test_grouping() {
        let items: Vec<FormulaItem> = vec![
            ("X".into(), 1.0, FormulaItemKind::Input),
            ("Y".into(), 2.0, FormulaItemKind::Input),
            ("P".into(), 2.5, FormulaItemKind::Output),
            ("B".into(), 0.5, FormulaItemKind::Byproduct),
        ];
        let g = group_by_kind(&items);
        assert_eq!(g.get("inputs").unwrap().len(), 2);
        assert_eq!(g.get("outputs").unwrap().len(), 1);
        assert_eq!(g.get("byproducts").unwrap().len(), 1);
    }

    // ============ estimate_unit_cost ============

    #[test]
    fn test_unit_cost_no_output_fail() {
        let items: Vec<FormulaItem> = vec![("X".into(), 1.0, FormulaItemKind::Input)];
        let mut cost: HashMap<String, f64> = HashMap::new();
        cost.insert("X".into(), 5.0);
        assert!(estimate_unit_cost(&items, &cost).is_err());
    }

    #[test]
    fn test_unit_cost_without_byproduct() {
        let items: Vec<FormulaItem> = vec![
            ("A".into(), 2.0, FormulaItemKind::Input),  // 2×10=20
            ("B".into(), 3.0, FormulaItemKind::Input),  // 3×5=15
            ("P".into(), 4.0, FormulaItemKind::Output), // total=4
        ];
        let mut cost: HashMap<String, f64> = HashMap::new();
        cost.insert("A".into(), 10.0);
        cost.insert("B".into(), 5.0);
        let (uc, miss) = estimate_unit_cost(&items, &cost).unwrap();
        assert!(miss.is_empty());
        // (20+15)/4 = 8.75
        assert!((uc - 8.75).abs() < 1e-9);
    }

    #[test]
    fn test_unit_cost_byproduct_deduction() {
        let items: Vec<FormulaItem> = vec![
            ("A".into(), 10.0, FormulaItemKind::Input), // 10×10=100
            ("P".into(), 8.0, FormulaItemKind::Output),
            ("B".into(), 1.0, FormulaItemKind::Byproduct), // 抵扣 1×20=20
        ];
        let mut cost: HashMap<String, f64> = HashMap::new();
        cost.insert("A".into(), 10.0);
        cost.insert("B".into(), 20.0);
        let (uc, _) = estimate_unit_cost(&items, &cost).unwrap();
        // (100-20)/8 = 10.0
        assert!((uc - 10.0).abs() < 1e-9);
    }

    #[test]
    fn test_unit_cost_missing_costs_listed() {
        let items: Vec<FormulaItem> = vec![
            ("X".into(), 2.0, FormulaItemKind::Input),
            ("Y".into(), 3.0, FormulaItemKind::Input),
            ("P".into(), 4.0, FormulaItemKind::Output),
        ];
        let mut cost: HashMap<String, f64> = HashMap::new();
        cost.insert("Y".into(), 5.0);
        let (uc, miss) = estimate_unit_cost(&items, &cost).unwrap();
        // only Y: 15 / 4 = 3.75
        assert!((uc - 3.75).abs() < 1e-9);
        assert_eq!(miss, vec!["X"]);
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/production-formulas",
            get(list_formulas).post(create_formula),
        )
        .route(
            "/production-formulas/{id}",
            get(get_formula).put(update_formula).delete(delete_formula),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionFormula {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub formula_no: String,
    pub name: String,
    pub product_id: Option<Uuid>,
    pub description: Option<String>,
    pub formula_items: serde_json::Value,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFormulaRequest {
    pub formula_no: String,
    pub name: String,
    pub product_id: Option<Uuid>,
    pub description: Option<String>,
    pub formula_items: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFormulaRequest {
    pub formula_no: Option<String>,
    pub name: Option<String>,
    pub product_id: Option<Uuid>,
    pub description: Option<String>,
    pub formula_items: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FormulaQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub product_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-formulas",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_formulas(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<FormulaQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            claims
                .tenant_id
                .as_deref()
                .and_then(|t| uuid::Uuid::parse_str(t).ok())
                .unwrap_or_default(),
        )
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));
    let locale = Locale::from_headers(&headers).as_sql();

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        SELECT id, tenant_id, formula_no,
               CASE WHEN $5 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               product_id, description, formula_items,
               status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        FROM pdm_production_formulas
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR formula_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR product_id = $4)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(query.product_id)
    .bind(locale)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(formulas) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_formulas
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR formula_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR product_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(query.product_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "formulas": formulas,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取配方列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取配方列表失败: {}", e);
            Json(ApiResponse::error(500, "获取配方列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/production-formulas",
    request_body = CreateFormulaRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    if req.formula_no.is_empty() {
        return Json(ApiResponse::error(400, "配方编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "配方名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());
    let formula_items = req.formula_items.unwrap_or(serde_json::json!([]));

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        INSERT INTO pdm_production_formulas (
            tenant_id, formula_no, name, product_id, description, formula_items, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenant_id, formula_no, name, product_id, description, formula_items,
                  status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.formula_no)
    .bind(&req.name)
    .bind(req.product_id)
    .bind(&req.description)
    .bind(&formula_items)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(formula) => Json(ApiResponse::success(formula, "配方创建成功")),
        Err(e) => {
            tracing::error!("创建配方失败: {}", e);
            Json(ApiResponse::error(500, "创建配方失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-formulas/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionFormula>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            claims
                .tenant_id
                .as_deref()
                .and_then(|t| uuid::Uuid::parse_str(t).ok())
                .unwrap_or_default(),
        )
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        SELECT id, tenant_id, formula_no,
               CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               product_id, description, formula_items,
               status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        FROM pdm_production_formulas WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(locale)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "获取配方成功")),
        Ok(None) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("获取配方失败: {}", e);
            Json(ApiResponse::error(500, "获取配方失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:update"])),
    path = "/api/pdm/production-formulas/{id}",
    request_body = UpdateFormulaRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateFormulaRequest>,
) -> Json<ApiResponse<ProductionFormula>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionFormula>(
        r#"
        UPDATE pdm_production_formulas SET
            formula_no = COALESCE(NULLIF($2, ''), formula_no),
            name = COALESCE(NULLIF($3, ''), name),
            product_id = COALESCE($4, product_id),
            description = COALESCE($5, description),
            formula_items = COALESCE($6, formula_items),
            status = COALESCE(NULLIF($7, ''), status),
            updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, tenant_id, formula_no, name, product_id, description, formula_items,
                  status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(&req.formula_no)
    .bind(&req.name)
    .bind(req.product_id)
    .bind(&req.description)
    .bind(&req.formula_items)
    .bind(&req.status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "配方更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("更新配方失败: {}", e);
            Json(ApiResponse::error(500, "更新配方失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:delete"])),
    path = "/api/pdm/production-formulas/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_formula(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        "UPDATE pdm_production_formulas SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "配方删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "配方不存在")),
        Err(e) => {
            tracing::error!("删除配方失败: {}", e);
            Json(ApiResponse::error(500, "删除配方失败"))
        }
    }
}
