//! 库存模块纯计算函数
//!
//! 从 `inventory.rs` handler 中提取的内联逻辑，便于单元测试与复用。

// ── 分页 ───────────────────────────────────────────────

/// 将可选的分页参数归一化为 `(page, page_size, offset)`。
///
/// - page 缺省 1，最小 1
/// - page_size 缺省 20，最大 100，最小 1
/// - offset = (page - 1) * page_size
pub fn normalize_pagination(page: Option<i64>, page_size: Option<i64>) -> (i64, i64, i64) {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    (page, page_size, offset)
}

/// 构建 SQL `ILIKE` 搜索模式 `"%keyword%"`
pub fn build_search_pattern(search: Option<&str>) -> Option<String> {
    search.filter(|s| !s.is_empty()).map(|s| format!("%{}%", s))
}

// ── 过滤检测 ───────────────────────────────────────────

/// 判断是否携带任一过滤条件（搜索词 / 状态）
pub fn has_inventory_filters(search: Option<&str>, status: Option<&str>) -> bool {
    search.map_or(false, |s| !s.is_empty()) || status.map_or(false, |s| !s.is_empty())
}

// ── 金额计算 ───────────────────────────────────────────

/// 单价缺省 0.0，负值钳制为 0
pub fn default_unit_price(price: Option<f64>) -> f64 {
    price.unwrap_or(0.0).max(0.0)
}

/// 计算库存总金额 = unit_price × quantity
///
/// - unit_price 为 `None` 时按 0 处理
/// - quantity 负值钳制为 0
pub fn calculate_total_amount(unit_price: Option<f64>, quantity: f64) -> f64 {
    let price = default_unit_price(unit_price);
    let qty = quantity.max(0.0);
    price * qty
}

// ── 可用量计算 ─────────────────────────────────────────

/// 可用量 = 数量 - 已预留，结果钳制 ≥ 0
pub fn calculate_available_quantity(quantity: f64, reserved: f64) -> f64 {
    (quantity - reserved).max(0.0)
}

// ── 默认值 ─────────────────────────────────────────────

/// 库存状态缺省 `"active"`
pub fn default_inventory_status(status: Option<String>) -> String {
    status.unwrap_or_else(|| "active".to_string())
}

/// 物料信息回退：`None` 时返回三个空字符串 `(code, name, unit)`
pub fn material_info_fallback(info: Option<(String, String, String)>) -> (String, String, String) {
    info.unwrap_or_else(|| ("".to_string(), "".to_string(), "".to_string()))
}

// ── 库存检查 ───────────────────────────────────────────

/// 判断是否低库存：quantity < safety_stock
pub fn is_low_stock(quantity: f64, safety_stock: f64) -> bool {
    quantity < safety_stock
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StockLevel {
    /// quantity = 0
    OutOfStock,
    /// 0 < quantity < safety_stock
    Low,
    /// safety_stock ≤ quantity < safety_stock × 2
    Normal,
    /// quantity ≥ safety_stock × 2
    Overstock,
}

/// 根据当前数量和安全库存判定库存等级
///
/// - safety_stock ≤ 0 时：quantity > 0 → Normal, 否则 → OutOfStock
pub fn stock_level(quantity: f64, safety_stock: f64) -> StockLevel {
    if quantity <= 0.0 {
        return StockLevel::OutOfStock;
    }
    if safety_stock <= 0.0 {
        return StockLevel::Normal;
    }
    if quantity < safety_stock {
        StockLevel::Low
    } else if quantity >= safety_stock * 2.0 {
        StockLevel::Overstock
    } else {
        StockLevel::Normal
    }
}

// ── 校验 ───────────────────────────────────────────────

/// 数量校验：非负且非 NaN
pub fn validate_quantity(quantity: f64) -> bool {
    quantity.is_finite() && quantity >= 0.0
}

/// 单价校验：非负且非 NaN
pub fn validate_unit_price(price: f64) -> bool {
    price.is_finite() && price >= 0.0
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── normalize_pagination ──────────────────────────

    #[test]
    fn test_pagination_defaults() {
        assert_eq!(normalize_pagination(None, None), (1, 20, 0));
    }

    #[test]
    fn test_pagination_custom_values() {
        assert_eq!(normalize_pagination(Some(3), Some(15)), (3, 15, 30));
    }

    #[test]
    fn test_pagination_page_clamped_to_1() {
        assert_eq!(normalize_pagination(Some(0), Some(10)), (1, 10, 0));
        assert_eq!(normalize_pagination(Some(-5), Some(10)), (1, 10, 0));
    }

    #[test]
    fn test_pagination_page_size_clamped_to_max() {
        assert_eq!(normalize_pagination(Some(1), Some(200)), (1, 100, 0));
    }

    #[test]
    fn test_pagination_page_size_clamped_to_min() {
        assert_eq!(normalize_pagination(Some(1), Some(0)), (1, 1, 0));
    }

    #[test]
    fn test_pagination_offset_for_page_5() {
        assert_eq!(normalize_pagination(Some(5), Some(20)), (5, 20, 80));
    }

    // ── build_search_pattern ──────────────────────────

    #[test]
    fn test_search_pattern_some() {
        assert_eq!(
            build_search_pattern(Some("steel")),
            Some("%steel%".to_string())
        );
    }

    #[test]
    fn test_search_pattern_none() {
        assert_eq!(build_search_pattern(None), None);
    }

    #[test]
    fn test_search_pattern_empty_returns_none() {
        assert_eq!(build_search_pattern(Some("")), None);
    }

    // ── has_inventory_filters ─────────────────────────

    #[test]
    fn test_has_filters_all_none() {
        assert!(!has_inventory_filters(None, None));
    }

    #[test]
    fn test_has_filters_search_only() {
        assert!(has_inventory_filters(Some("bolt"), None));
    }

    #[test]
    fn test_has_filters_status_only() {
        assert!(has_inventory_filters(None, Some("active")));
    }

    #[test]
    fn test_has_filters_empty_strings_no_filter() {
        assert!(!has_inventory_filters(Some(""), Some("")));
    }

    // ── default_unit_price ────────────────────────────

    #[test]
    fn test_unit_price_none_defaults_zero() {
        assert_eq!(default_unit_price(None), 0.0);
    }

    #[test]
    fn test_unit_price_some_value() {
        assert_eq!(default_unit_price(Some(12.5)), 12.5);
    }

    #[test]
    fn test_unit_price_negative_clamped() {
        assert_eq!(default_unit_price(Some(-5.0)), 0.0);
    }

    // ── calculate_total_amount ────────────────────────

    #[test]
    fn test_total_amount_normal() {
        assert_eq!(calculate_total_amount(Some(10.0), 100.0), 1000.0);
    }

    #[test]
    fn test_total_amount_price_none_is_zero() {
        assert_eq!(calculate_total_amount(None, 100.0), 0.0);
    }

    #[test]
    fn test_total_amount_negative_price_clamped() {
        assert_eq!(calculate_total_amount(Some(-10.0), 100.0), 0.0);
    }

    #[test]
    fn test_total_amount_negative_quantity_clamped() {
        assert_eq!(calculate_total_amount(Some(10.0), -50.0), 0.0);
    }

    #[test]
    fn test_total_amount_zero_quantity() {
        assert_eq!(calculate_total_amount(Some(10.0), 0.0), 0.0);
    }

    #[test]
    fn test_total_amount_zero_price() {
        assert_eq!(calculate_total_amount(Some(0.0), 100.0), 0.0);
    }

    // ── calculate_available_quantity ──────────────────

    #[test]
    fn test_available_normal() {
        assert_eq!(calculate_available_quantity(100.0, 30.0), 70.0);
    }

    #[test]
    fn test_available_reserved_exceeds_quantity_clamped() {
        assert_eq!(calculate_available_quantity(50.0, 80.0), 0.0);
    }

    #[test]
    fn test_available_zero_reserved() {
        assert_eq!(calculate_available_quantity(100.0, 0.0), 100.0);
    }

    #[test]
    fn test_available_zero_quantity() {
        assert_eq!(calculate_available_quantity(0.0, 10.0), 0.0);
    }

    #[test]
    fn test_available_negative_quantity_clamped() {
        assert_eq!(calculate_available_quantity(-20.0, 5.0), 0.0);
    }

    // ── default_inventory_status ──────────────────────

    #[test]
    fn test_status_none_defaults_active() {
        assert_eq!(default_inventory_status(None), "active");
    }

    #[test]
    fn test_status_some_preserved() {
        assert_eq!(
            default_inventory_status(Some("inactive".to_string())),
            "inactive"
        );
    }

    // ── material_info_fallback ────────────────────────

    #[test]
    fn test_material_info_some() {
        let info = material_info_fallback(Some(("M001".into(), "Steel".into(), "kg".into())));
        assert_eq!(
            info,
            ("M001".to_string(), "Steel".to_string(), "kg".to_string())
        );
    }

    #[test]
    fn test_material_info_none_defaults_empty() {
        let info = material_info_fallback(None);
        assert_eq!(info, ("".to_string(), "".to_string(), "".to_string()));
    }

    // ── is_low_stock ──────────────────────────────────

    #[test]
    fn test_low_stock_true() {
        assert!(is_low_stock(5.0, 10.0));
    }

    #[test]
    fn test_low_stock_false_equal() {
        assert!(!is_low_stock(10.0, 10.0));
    }

    #[test]
    fn test_low_stock_false_above() {
        assert!(!is_low_stock(15.0, 10.0));
    }

    #[test]
    fn test_low_stock_zero_quantity() {
        assert!(is_low_stock(0.0, 10.0));
    }

    #[test]
    fn test_low_stock_zero_safety_stock() {
        assert!(!is_low_stock(0.0, 0.0));
    }

    // ── stock_level ───────────────────────────────────

    #[test]
    fn test_stock_level_out_of_stock_zero() {
        assert_eq!(stock_level(0.0, 10.0), StockLevel::OutOfStock);
    }

    #[test]
    fn test_stock_level_out_of_stock_negative() {
        assert_eq!(stock_level(-5.0, 10.0), StockLevel::OutOfStock);
    }

    #[test]
    fn test_stock_level_low() {
        assert_eq!(stock_level(5.0, 10.0), StockLevel::Low);
    }

    #[test]
    fn test_stock_level_normal_at_safety() {
        assert_eq!(stock_level(10.0, 10.0), StockLevel::Normal);
    }

    #[test]
    fn test_stock_level_normal_below_double() {
        assert_eq!(stock_level(19.0, 10.0), StockLevel::Normal);
    }

    #[test]
    fn test_stock_level_overstock_at_double() {
        assert_eq!(stock_level(20.0, 10.0), StockLevel::Overstock);
    }

    #[test]
    fn test_stock_level_overstock_above_double() {
        assert_eq!(stock_level(50.0, 10.0), StockLevel::Overstock);
    }

    #[test]
    fn test_stock_level_zero_safety_stock_normal_when_positive() {
        assert_eq!(stock_level(5.0, 0.0), StockLevel::Normal);
    }

    #[test]
    fn test_stock_level_zero_safety_stock_out_of_stock_when_zero() {
        assert_eq!(stock_level(0.0, 0.0), StockLevel::OutOfStock);
    }

    // ── validate_quantity ─────────────────────────────

    #[test]
    fn test_validate_quantity_positive() {
        assert!(validate_quantity(100.0));
    }

    #[test]
    fn test_validate_quantity_zero() {
        assert!(validate_quantity(0.0));
    }

    #[test]
    fn test_validate_quantity_negative() {
        assert!(!validate_quantity(-1.0));
    }

    #[test]
    fn test_validate_quantity_nan() {
        assert!(!validate_quantity(f64::NAN));
    }

    #[test]
    fn test_validate_quantity_infinity() {
        assert!(!validate_quantity(f64::INFINITY));
    }

    // ── validate_unit_price ───────────────────────────

    #[test]
    fn test_validate_price_positive() {
        assert!(validate_unit_price(12.5));
    }

    #[test]
    fn test_validate_price_zero() {
        assert!(validate_unit_price(0.0));
    }

    #[test]
    fn test_validate_price_negative() {
        assert!(!validate_unit_price(-0.01));
    }

    #[test]
    fn test_validate_price_nan() {
        assert!(!validate_unit_price(f64::NAN));
    }
}
