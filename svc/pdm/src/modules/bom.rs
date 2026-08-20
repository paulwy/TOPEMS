use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Extension, Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// =============================================================================
// Pure functions for BOM (Bill of Materials) computation
// =============================================================================

/// BOM 边 (父件 part_number → 子件 part_number, 用量 per_unit_assembly)
pub type BomEdge = (String, String, f64);

/// BOM 展开汇总：对每一层父项 × 子件用量做累积
/// 输入：Vec<(parent, child, qty_per_parent)>，以及根件 root，要生产的 root_qty
/// 输出：每个子件所需总用量 HashMap<child_code, total_required>
/// 含循环检测：如果访问同一条边 2 次即报环（返回 Err 描述）
pub fn explode_bom(
    edges: &[BomEdge],
    root: &str,
    root_qty: f64,
) -> Result<HashMap<String, f64>, String> {
    if root_qty <= 0.0 {
        return Ok(HashMap::new());
    }
    // 构建 children map: parent -> Vec<(child, qty)>
    let mut children: HashMap<&str, Vec<(&str, f64)>> = HashMap::new();
    for (p, c, q) in edges {
        children.entry(p).or_default().push((c.as_str(), *q));
    }
    let mut result: HashMap<String, f64> = HashMap::new();
    // DFS stack: (node, multiplier, visited_path_nodes)
    let mut stack: Vec<(&str, f64, HashSet<String>)> = Vec::new();
    {
        let mut path = HashSet::new();
        path.insert(root.to_string());
        stack.push((root, root_qty, path));
    }
    while let Some((node, mult, path)) = stack.pop() {
        match children.get(node) {
            None => continue,
            Some(list) => {
                for (child, qty_per) in list {
                    let child_mult = mult * qty_per;
                    // 叶子（没子件）累加；非叶子 DFS
                    let child_key = child.to_string();
                    if path.contains(&child_key) {
                        return Err(format!("循环依赖检测：节点 {} 在路径中重复出现", child_key));
                    }
                    // 累计用量
                    *result.entry(child_key.clone()).or_insert(0.0) += child_mult;
                    // 如果有子件，继续展开
                    let child_ref: &str = child;
                    if children.contains_key(&child_ref) {
                        let mut new_path = path.clone();
                        new_path.insert(child_key);
                        stack.push((child, child_mult, new_path));
                    }
                }
            }
        }
    }
    Ok(result)
}

/// EBOM → MBOM 用量换算：考虑损耗率、批量倍数、最小包装量
/// loss_rate ∈ [0,1)（默认 0），pack_multiple 最小包装倍数，min_qty 最小采购量
pub fn ebom_to_mbom_qty(
    ebom_quantity: f64,
    loss_rate: Option<f64>,
    pack_multiple: Option<f64>,
    min_qty: Option<f64>,
) -> f64 {
    if ebom_quantity <= 0.0 {
        return 0.0;
    }
    let lr = loss_rate.unwrap_or(0.0).clamp(0.0, 0.999);
    let with_loss = ebom_quantity / (1.0 - lr); // 向上缩放
    let mut qty = with_loss;
    if let Some(m) = min_qty {
        if m > 0.0 && qty < m {
            qty = m;
        }
    }
    if let Some(p) = pack_multiple {
        if p > 1.0 {
            let ratio = qty / p;
            let ceiled = ratio.ceil();
            if (ceiled - ratio).abs() > 1e-9 {
                qty = ceiled * p;
            }
        }
    }
    qty
}

/// BOM 汇总总成本：parts_cost = sum(qty_required[i] * unit_cost[i])
/// unknown_cost_parts: 返回找不到 unit_cost 的 key 列表
pub fn calculate_total_bom_cost(
    required: &HashMap<String, f64>,
    unit_costs: &HashMap<String, f64>,
) -> (f64, Vec<String>) {
    let mut total = 0.0_f64;
    let mut missing = Vec::new();
    for (k, q) in required {
        match unit_costs.get(k) {
            Some(c) if *c >= 0.0 => total += q * c,
            _ => missing.push(k.clone()),
        }
    }
    (total, missing)
}

/// BOM 单层子项汇总校验：所有子件成本占比和应 ≈ 100%（加允许误差 tolerance）
/// 用于成本 roll-up 校验
pub fn validate_cost_rollup(child_costs: &[f64], parent_cost: f64, tolerance: f64) -> bool {
    let sum: f64 = child_costs.iter().sum();
    if parent_cost <= 0.0 {
        return sum <= tolerance;
    }
    ((sum - parent_cost) / parent_cost).abs() <= tolerance
}

/// BOM 版本对比：按 (part_number, qty) 对两个版本单层列出差异
/// 返回三类集合：only_in_a / only_in_b / qty_changed (part, qa, qb)
pub fn diff_bom_single_level(
    a: &[(&str, f64)],
    b: &[(&str, f64)],
) -> (Vec<String>, Vec<String>, Vec<(String, f64, f64)>) {
    let ma: HashMap<String, f64> = a.iter().map(|(k, v)| (k.to_string(), *v)).collect();
    let mb: HashMap<String, f64> = b.iter().map(|(k, v)| (k.to_string(), *v)).collect();
    let mut only_a = Vec::new();
    let mut only_b = Vec::new();
    let mut changed = Vec::new();
    let keys: HashSet<String> = ma.keys().chain(mb.keys()).cloned().collect();
    for k in keys {
        match (ma.get(&k), mb.get(&k)) {
            (Some(va), Some(vb)) if (va - vb).abs() > 1e-9 => {
                changed.push((k, *va, *vb));
            }
            (Some(_), None) => only_a.push(k),
            (None, Some(_)) => only_b.push(k),
            _ => {}
        }
    }
    only_a.sort();
    only_b.sort();
    changed.sort_by(|x, y| x.0.cmp(&y.0));
    (only_a, only_b, changed)
}

/// BOM 层级深度（最大层数），根为 level 1，空子项 = 1
pub fn bom_max_depth(edges: &[BomEdge], root: &str) -> Result<u32, String> {
    let mut children: HashMap<&str, Vec<&str>> = HashMap::new();
    for (p, c, _) in edges {
        children.entry(p).or_default().push(c.as_str());
    }
    // DFS iterative with path
    let mut stack: Vec<(&str, HashSet<String>, u32)> = Vec::new();
    let mut root_path = HashSet::new();
    root_path.insert(root.to_string());
    stack.push((root, root_path, 1));
    let mut max_depth: u32 = 0;
    while let Some((node, path, depth)) = stack.pop() {
        if depth > max_depth {
            max_depth = depth;
        }
        match children.get(node) {
            None => continue,
            Some(list) => {
                for child in list {
                    let child_key = child.to_string();
                    if path.contains(&child_key) {
                        return Err(format!("循环依赖：{}", child_key));
                    }
                    let mut np = path.clone();
                    np.insert(child_key);
                    stack.push((child, np, depth + 1));
                }
            }
        }
    }
    Ok(max_depth)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ explode_bom ============

    #[test]
    fn test_explode_empty_or_zero_qty() {
        let edges: Vec<BomEdge> = vec![];
        assert!(explode_bom(&edges, "A", 0.0).unwrap().is_empty());
        assert!(explode_bom(&edges, "A", 100.0).unwrap().is_empty());
    }

    #[test]
    fn test_explode_two_level() {
        // A → B ×2,  A → C ×1
        // B → D ×3
        // root A ×5:
        //   B = 5×2 = 10
        //   C = 5×1 = 5
        //   D = 5×2×3 = 30
        let edges: Vec<BomEdge> = vec![
            ("A".into(), "B".into(), 2.0),
            ("A".into(), "C".into(), 1.0),
            ("B".into(), "D".into(), 3.0),
        ];
        let r = explode_bom(&edges, "A", 5.0).unwrap();
        assert_eq!(r.get("B").copied(), Some(10.0));
        assert_eq!(r.get("C").copied(), Some(5.0));
        assert_eq!(r.get("D").copied(), Some(30.0));
    }

    #[test]
    fn test_explode_cycle_detected() {
        let edges: Vec<BomEdge> =
            vec![("A".into(), "B".into(), 1.0), ("B".into(), "A".into(), 1.0)];
        let r = explode_bom(&edges, "A", 1.0);
        assert!(r.is_err());
        assert!(r.unwrap_err().contains("循环依赖"));
    }

    #[test]
    fn test_explode_shared_subassembly() {
        // 共享件 C 被多个父项引用：A→B×1, A→C×2, B→C×3
        // A×1 → B=1, C=2+1*3=5
        let edges: Vec<BomEdge> = vec![
            ("A".into(), "B".into(), 1.0),
            ("A".into(), "C".into(), 2.0),
            ("B".into(), "C".into(), 3.0),
        ];
        let r = explode_bom(&edges, "A", 1.0).unwrap();
        assert_eq!(r.get("B").copied(), Some(1.0));
        assert_eq!(r.get("C").copied(), Some(5.0));
    }

    // ============ ebom_to_mbom_qty ============

    #[test]
    fn test_ebom_mbom_plain() {
        // 无参数，数量不变
        assert!((ebom_to_mbom_qty(100.0, None, None, None) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_ebom_mbom_with_loss() {
        // 100 / (1-0.2) = 125
        let r = ebom_to_mbom_qty(100.0, Some(0.2), None, None);
        assert!((r - 125.0).abs() < 1e-9);
    }

    #[test]
    fn test_ebom_mbom_min_qty() {
        assert_eq!(ebom_to_mbom_qty(5.0, None, None, Some(50.0)), 50.0);
    }

    #[test]
    fn test_ebom_mbom_pack_multiple() {
        // 110, pack 12 → 120
        assert_eq!(ebom_to_mbom_qty(110.0, None, Some(12.0), None), 120.0);
        // 精确倍数不调整
        assert_eq!(ebom_to_mbom_qty(108.0, None, Some(12.0), None), 108.0);
    }

    #[test]
    fn test_ebom_mbom_full_pipeline() {
        // qty 100, 10% loss → 111.111; min=150 提升到 150；pack 50：150 是 3×50（整数倍）→ 150
        let r = ebom_to_mbom_qty(100.0, Some(0.1), Some(50.0), Some(150.0));
        assert!((r - 150.0).abs() < 1e-9);
        // 再验证：qty 100, 10% loss → 111.111; min=160 → 160；pack 50 → 160/50=3.2 ceil=4 → 200
        let r2 = ebom_to_mbom_qty(100.0, Some(0.1), Some(50.0), Some(160.0));
        assert!((r2 - 200.0).abs() < 1e-9);
    }

    #[test]
    fn test_ebom_mbom_zero_or_negative_qty() {
        assert_eq!(
            ebom_to_mbom_qty(0.0, Some(0.1), Some(10.0), Some(20.0)),
            0.0
        );
        assert_eq!(ebom_to_mbom_qty(-5.0, None, None, None), 0.0);
    }

    // ============ calculate_total_bom_cost ============

    #[test]
    fn test_total_cost_basic() {
        let mut req: HashMap<String, f64> = HashMap::new();
        req.insert("A".into(), 2.0);
        req.insert("B".into(), 3.0);
        let mut cost: HashMap<String, f64> = HashMap::new();
        cost.insert("A".into(), 10.0);
        cost.insert("B".into(), 5.0);
        let (total, miss) = calculate_total_bom_cost(&req, &cost);
        assert!((total - 35.0).abs() < 1e-9);
        assert!(miss.is_empty());
    }

    #[test]
    fn test_total_cost_missing_cost() {
        let mut req: HashMap<String, f64> = HashMap::new();
        req.insert("A".into(), 2.0);
        req.insert("C".into(), 5.0);
        let mut cost: HashMap<String, f64> = HashMap::new();
        cost.insert("A".into(), 10.0);
        let (total, miss) = calculate_total_bom_cost(&req, &cost);
        assert!((total - 20.0).abs() < 1e-9);
        assert_eq!(miss.len(), 1);
        assert_eq!(miss[0], "C");
    }

    // ============ validate_cost_rollup ============

    #[test]
    fn test_rollup_valid() {
        assert!(validate_cost_rollup(&[30.0, 20.0, 50.0], 100.0, 0.001));
    }

    #[test]
    fn test_rollup_invalid() {
        assert!(!validate_cost_rollup(&[30.0, 20.0], 100.0, 0.001));
    }

    #[test]
    fn test_rollup_zero_parent_with_children_should_fail() {
        assert!(!validate_cost_rollup(&[1.0], 0.0, 0.001));
    }

    #[test]
    fn test_rollup_both_zero_ok() {
        assert!(validate_cost_rollup(&[], 0.0, 0.001));
    }

    // ============ diff_bom_single_level ============

    #[test]
    fn test_diff_equal() {
        let a = [("X", 1.0), ("Y", 2.0)];
        let b = [("Y", 2.0), ("X", 1.0)];
        let (oa, ob, ch) = diff_bom_single_level(&a, &b);
        assert!(oa.is_empty());
        assert!(ob.is_empty());
        assert!(ch.is_empty());
    }

    #[test]
    fn test_diff_only_a_only_b_changed() {
        let a = [("X", 1.0), ("Y", 2.0), ("Z", 3.0)];
        let b = [("X", 1.5), ("Y", 2.0), ("W", 5.0)];
        let (oa, ob, ch) = diff_bom_single_level(&a, &b);
        assert_eq!(oa, vec!["Z"]);
        assert_eq!(ob, vec!["W"]);
        assert_eq!(ch.len(), 1);
        assert_eq!(ch[0].0, "X");
        assert_eq!(ch[0].1, 1.0);
        assert_eq!(ch[0].2, 1.5);
    }

    // ============ bom_max_depth ============

    #[test]
    fn test_depth_just_root() {
        let edges: Vec<BomEdge> = vec![];
        assert_eq!(bom_max_depth(&edges, "A").unwrap(), 1);
    }

    #[test]
    fn test_depth_two_levels() {
        let edges: Vec<BomEdge> =
            vec![("A".into(), "B".into(), 1.0), ("A".into(), "C".into(), 1.0)];
        assert_eq!(bom_max_depth(&edges, "A").unwrap(), 2);
    }

    #[test]
    fn test_depth_three_levels_deep_chain() {
        let edges: Vec<BomEdge> = vec![
            ("A".into(), "B".into(), 1.0),
            ("B".into(), "C".into(), 1.0),
            ("C".into(), "D".into(), 1.0),
        ];
        assert_eq!(bom_max_depth(&edges, "A").unwrap(), 4);
    }

    #[test]
    fn test_depth_cycle() {
        let edges: Vec<BomEdge> =
            vec![("A".into(), "B".into(), 1.0), ("B".into(), "A".into(), 1.0)];
        assert!(bom_max_depth(&edges, "A").is_err());
    }
}

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/bom-versions",
            get(list_bom_versions).post(create_bom_version),
        )
        .route(
            "/bom-versions/{id}",
            get(get_bom_version)
                .put(update_bom_version)
                .delete(delete_bom_version),
        )
        .route("/bom-versions/{id}/activate", post(activate_bom_version))
        .route("/bom-versions/{id}/archive", post(archive_bom_version))
        .route(
            "/bom-versions/{id}/items/batch",
            post(batch_create_bom_items),
        )
        .route("/bom-items", get(list_bom_items).post(create_bom_item))
        .route(
            "/bom-items/{id}",
            get(get_bom_item)
                .put(update_bom_item)
                .delete(delete_bom_item),
        )
        .route(
            "/bom-compare",
            get(list_bom_comparisons).post(compare_bom_versions),
        )
        .route("/bom-compare/{id}", get(get_bom_comparison))
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct BomVersion {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub bom_no: String,
    pub name: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: Option<String>,
    pub version: String,
    pub status: String,
    pub description: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct BomItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub bom_version_id: Uuid,
    pub material_id: Option<Uuid>,
    pub part_number: String,
    pub part_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: BigDecimal,
    pub loss_rate: Option<BigDecimal>,
    pub level: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BomVersionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BomItemQuery {
    pub bom_version_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBomVersionRequest {
    pub bom_no: String,
    pub name: String,
    pub product_id: Option<String>,
    pub version: String,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBomVersionRequest {
    pub bom_no: Option<String>,
    pub name: Option<String>,
    pub product_id: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBomItemRequest {
    pub bom_version_id: Uuid,
    pub level: Option<i32>,
    pub part_number: String,
    pub part_name: String,
    pub quantity: BigDecimal,
    pub unit: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBomItemRequest {
    pub level: Option<i32>,
    pub part_number: Option<String>,
    pub part_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchCreateBomItemsRequest {
    pub items: Vec<CreateBomItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CompareBomVersionsRequest {
    pub bom_version_a_id: Uuid,
    pub bom_version_b_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct BomComparison {
    pub id: Uuid,
    pub name: String,
    pub bom_version_a_id: Uuid,
    pub bom_version_b_id: Uuid,
    pub differences: BomDifferences,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct BomDifferences {
    pub addeditems: Vec<BomItem>,
    pub removeditems: Vec<BomItem>,
    pub modifieditems: Vec<serde_json::Value>,
}

fn parse_optional_uuid(
    value: &Option<String>,
) -> Result<Option<Uuid>, Json<ApiResponse<serde_json::Value>>> {
    match value {
        Some(raw) if !raw.trim().is_empty() => Uuid::parse_str(raw)
            .map(Some)
            .map_err(|_| Json(ApiResponse::error(400, "product_id 不是有效 UUID"))),
        _ => Ok(None),
    }
}

fn json_value<T: Serialize>(
    value: T,
    success_msg: &str,
    error_msg: &str,
) -> Json<ApiResponse<serde_json::Value>> {
    match serde_json::to_value(value) {
        Ok(value) => Json(ApiResponse::success(value, success_msg)),
        Err(e) => {
            tracing::error!("PDM BOM 响应序列化失败: {}", e);
            Json(ApiResponse::error(500, error_msg))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/bom-versions",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_bom_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BomVersionQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        SELECT id, tenant_id, bom_no, product_name AS name, product_id, product_name,
               product_code, version, status, description, created_at, updated_at
        FROM pdm_boms
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR bom_no ILIKE $2 OR product_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(items) => json_value(items, "获取 BOM 版本列表成功", "获取 BOM 版本列表失败"),
        Err(e) => {
            tracing::error!("获取 BOM 版本列表失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 版本列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:document:read"])),
    path = "/api/pdm/bom-versions/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        SELECT id, tenant_id, bom_no, product_name AS name, product_id, product_name,
               product_code, version, status, description, created_at, updated_at
        FROM pdm_boms
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "获取 BOM 版本成功", "获取 BOM 版本失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("获取 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 版本失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/bom-versions",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CreateBomVersionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let product_id = match parse_optional_uuid(&payload.product_id) {
        Ok(value) => value,
        Err(response) => return response,
    };

    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        INSERT INTO pdm_boms
            (tenant_id, bom_no, product_id, product_name, version, status, description)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'draft'), $7)
        RETURNING id, tenant_id, bom_no, product_name AS name, product_id, product_name,
                  product_code, version, status, description, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&payload.bom_no)
    .bind(product_id)
    .bind(&payload.name)
    .bind(&payload.version)
    .bind(&payload.status)
    .bind(&payload.description)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(item) => json_value(item, "创建 BOM 版本成功", "创建 BOM 版本失败"),
        Err(e) => {
            tracing::error!("创建 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "创建 BOM 版本失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/bom-versions/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateBomVersionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let product_id = match parse_optional_uuid(&payload.product_id) {
        Ok(value) => value,
        Err(response) => return response,
    };

    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        UPDATE pdm_boms
        SET bom_no = COALESCE($3, bom_no),
            product_name = COALESCE($4, product_name),
            product_id = COALESCE($5, product_id),
            version = COALESCE($6, version),
            status = COALESCE($7, status),
            description = COALESCE($8, description),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, bom_no, product_name AS name, product_id, product_name,
                  product_code, version, status, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.bom_no)
    .bind(&payload.name)
    .bind(product_id)
    .bind(&payload.version)
    .bind(&payload.status)
    .bind(&payload.description)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "更新 BOM 版本成功", "更新 BOM 版本失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("更新 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "更新 BOM 版本失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/bom-versions/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query("DELETE FROM pdm_boms WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => {
            json_value(true, "删除 BOM 版本成功", "删除 BOM 版本失败")
        }
        Ok(_) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("删除 BOM 版本失败: {}", e);
            Json(ApiResponse::error(500, "删除 BOM 版本失败"))
        }
    }
}

async fn update_bom_status(
    state: AppState,
    claims: Claims,
    headers: axum::http::HeaderMap,
    id: Uuid,
    status: &'static str,
    message: &'static str,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomVersion>(
        r#"
        UPDATE pdm_boms
        SET status = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, bom_no, product_name AS name, product_id, product_name,
                  product_code, version, status, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(status)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, message, "更新 BOM 状态失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 版本不存在")),
        Err(e) => {
            tracing::error!("更新 BOM 状态失败: {}", e);
            Json(ApiResponse::error(500, "更新 BOM 状态失败"))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:admin"])),
    path = "/api/pdm/bom-versions/{id}/activate",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn activate_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    update_bom_status(state, claims, headers, id, "active", "启用 BOM 版本成功").await
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:admin"])),
    path = "/api/pdm/bom-versions/{id}/archive",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn archive_bom_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    update_bom_status(state, claims, headers, id, "archived", "归档 BOM 版本成功").await
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:bom:read"])),
    path = "/api/pdm/bom-items",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_bom_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BomItemQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomItem>(
        r#"
        SELECT id, tenant_id, bom_id AS bom_version_id, material_id,
               material_code AS part_number, material_name AS part_name,
               specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        FROM pdm_bom_items
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR bom_id = $2)
        ORDER BY sequence ASC, material_code ASC
        "#,
    )
    .bind(tenant_id)
    .bind(query.bom_version_id)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(items) => json_value(items, "获取 BOM 明细列表成功", "获取 BOM 明细列表失败"),
        Err(e) => {
            tracing::error!("获取 BOM 明细列表失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 明细列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:bom:read"])),
    path = "/api/pdm/bom-items/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 明细 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomItem>(
        r#"
        SELECT id, tenant_id, bom_id AS bom_version_id, material_id,
               material_code AS part_number, material_name AS part_name,
               specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        FROM pdm_bom_items
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "获取 BOM 明细成功", "获取 BOM 明细失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 明细不存在")),
        Err(e) => {
            tracing::error!("获取 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "获取 BOM 明细失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/bom-items",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CreateBomItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = insert_bom_item(&state, tenant_id, &payload).await;

    match result {
        Ok(item) => json_value(item, "创建 BOM 明细成功", "创建 BOM 明细失败"),
        Err(e) => {
            tracing::error!("创建 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "创建 BOM 明细失败"))
        }
    }
}

async fn insert_bom_item(
    state: &AppState,
    tenant_id: Uuid,
    payload: &CreateBomItemRequest,
) -> Result<BomItem, sqlx::Error> {
    sqlx::query_as::<_, BomItem>(
        r#"
        INSERT INTO pdm_bom_items
            (tenant_id, bom_id, material_code, material_name, unit, quantity, sequence, notes)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), $8)
        RETURNING id, tenant_id, bom_id AS bom_version_id, material_id,
                  material_code AS part_number, material_name AS part_name,
                  specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        "#,
    )
    .bind(tenant_id)
    .bind(payload.bom_version_id)
    .bind(&payload.part_number)
    .bind(&payload.part_name)
    .bind(&payload.unit)
    .bind(&payload.quantity)
    .bind(payload.level)
    .bind(&payload.remarks)
    .fetch_one(&state.pool)
    .await
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/bom-items/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 明细 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn update_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateBomItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, BomItem>(
        r#"
        UPDATE pdm_bom_items
        SET material_code = COALESCE($3, material_code),
            material_name = COALESCE($4, material_name),
            unit = COALESCE($5, unit),
            quantity = COALESCE($6, quantity),
            sequence = COALESCE($7, sequence),
            notes = COALESCE($8, notes)
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, bom_id AS bom_version_id, material_id,
                  material_code AS part_number, material_name AS part_name,
                  specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.part_number)
    .bind(&payload.part_name)
    .bind(&payload.unit)
    .bind(&payload.quantity)
    .bind(payload.level)
    .bind(&payload.remarks)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(item)) => json_value(item, "更新 BOM 明细成功", "更新 BOM 明细失败"),
        Ok(None) => Json(ApiResponse::error(404, "BOM 明细不存在")),
        Err(e) => {
            tracing::error!("更新 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "更新 BOM 明细失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/bom-items/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 明细 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_bom_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query("DELETE FROM pdm_bom_items WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(done) if done.rows_affected() > 0 => {
            json_value(true, "删除 BOM 明细成功", "删除 BOM 明细失败")
        }
        Ok(_) => Json(ApiResponse::error(404, "BOM 明细不存在")),
        Err(e) => {
            tracing::error!("删除 BOM 明细失败: {}", e);
            Json(ApiResponse::error(500, "删除 BOM 明细失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/bom-versions/{bomVersionId}/items/batch",
    tag = "pdm",
    params(("bomVersionId" = Uuid, Path, description = "BOM 版本 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn batch_create_bom_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<BatchCreateBomItemsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let mut created = Vec::new();

    for mut item in payload.items {
        item.bom_version_id = id;
        match insert_bom_item(&state, tenant_id, &item).await {
            Ok(row) => created.push(row),
            Err(e) => {
                tracing::error!("批量创建 BOM 明细失败: {}", e);
                return Json(ApiResponse::error(500, "批量创建 BOM 明细失败"));
            }
        }
    }

    json_value(created, "批量创建 BOM 明细成功", "批量创建 BOM 明细失败")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:document:write"])),
    path = "/api/pdm/bom-compare",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn compare_bom_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CompareBomVersionsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let items_a = fetch_items_by_bom(&state, tenant_id, payload.bom_version_a_id).await;
    let items_b = fetch_items_by_bom(&state, tenant_id, payload.bom_version_b_id).await;

    let (items_a, items_b) = match (items_a, items_b) {
        (Ok(a), Ok(b)) => (a, b),
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("BOM 对比读取明细失败: {}", e);
            return Json(ApiResponse::error(500, "BOM 对比失败"));
        }
    };

    let keys_a: HashSet<String> = items_a
        .iter()
        .map(|item| item.part_number.clone())
        .collect();
    let keys_b: HashSet<String> = items_b
        .iter()
        .map(|item| item.part_number.clone())
        .collect();
    let by_key_a: HashMap<String, BomItem> = items_a
        .into_iter()
        .map(|item| (item.part_number.clone(), item))
        .collect();
    let by_key_b: HashMap<String, BomItem> = items_b
        .into_iter()
        .map(|item| (item.part_number.clone(), item))
        .collect();

    let addeditems = keys_b
        .difference(&keys_a)
        .filter_map(|key| by_key_b.get(key).cloned())
        .collect::<Vec<_>>();
    let removeditems = keys_a
        .difference(&keys_b)
        .filter_map(|key| by_key_a.get(key).cloned())
        .collect::<Vec<_>>();
    let modifieditems = keys_a
        .intersection(&keys_b)
        .filter_map(|key| {
            let before = by_key_a.get(key)?;
            let after = by_key_b.get(key)?;
            if before.quantity != after.quantity
                || before.unit != after.unit
                || before.part_name != after.part_name
            {
                Some(serde_json::json!({
                    "part_number": key,
                    "before": before,
                    "after": after
                }))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    let comparison = BomComparison {
        id: Uuid::new_v4(),
        name: "BOM 版本对比".to_string(),
        bom_version_a_id: payload.bom_version_a_id,
        bom_version_b_id: payload.bom_version_b_id,
        differences: BomDifferences {
            addeditems,
            removeditems,
            modifieditems,
        },
        created_at: chrono::Utc::now(),
    };

    json_value(comparison, "BOM 对比成功", "BOM 对比失败")
}

async fn fetch_items_by_bom(
    state: &AppState,
    tenant_id: Uuid,
    bom_id: Uuid,
) -> Result<Vec<BomItem>, sqlx::Error> {
    sqlx::query_as::<_, BomItem>(
        r#"
        SELECT id, tenant_id, bom_id AS bom_version_id, material_id,
               material_code AS part_number, material_name AS part_name,
               specification, unit, quantity, loss_rate, sequence AS level, notes AS remarks
        FROM pdm_bom_items
        WHERE tenant_id = $1 AND bom_id = $2
        ORDER BY sequence ASC, material_code ASC
        "#,
    )
    .bind(tenant_id)
    .bind(bom_id)
    .fetch_all(&state.pool)
    .await
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:bom:read"])),
    path = "/api/pdm/bom-compare",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_bom_comparisons() -> Json<ApiResponse<serde_json::Value>> {
    json_value(
        Vec::<BomComparison>::new(),
        "获取 BOM 对比列表成功",
        "获取 BOM 对比列表失败",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:bom:read"])),
    path = "/api/pdm/bom-compare/{id}",
    tag = "pdm",
    params(("id" = Uuid, Path, description = "BOM 对比 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_bom_comparison(Path(_id): Path<Uuid>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::error(
        404,
        "BOM 对比结果未持久化，请重新发起对比",
    ))
}
