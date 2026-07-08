pub fn calculate_suggested_quantity(
    available_stock: f64,
    max_stock: f64,
    reorder_point: f64,
    consumption_rate: f64,
    lead_time_days: i32,
) -> f64 {
    if max_stock > 0.0 {
        f64::max(0.0, max_stock - available_stock)
    } else {
        f64::max(
            0.0,
            reorder_point + consumption_rate * lead_time_days as f64 - available_stock,
        )
    }
}

pub fn calculate_priority(available_stock: f64, safety_stock: f64, reorder_point: f64) -> String {
    if available_stock < safety_stock {
        "urgent".to_string()
    } else if available_stock < reorder_point {
        "high".to_string()
    } else {
        "medium".to_string()
    }
}

pub fn calculate_trigger_type(rule_id_exists: bool) -> String {
    if rule_id_exists {
        "rule_based".to_string()
    } else {
        "stock_based".to_string()
    }
}

pub fn calculate_safety_stock(
    avg_daily_consumption: f64,
    lead_time_days: i32,
    safety_factor: f64,
) -> f64 {
    avg_daily_consumption * lead_time_days as f64 * safety_factor
}

pub fn calculate_reorder_point(
    avg_daily_consumption: f64,
    lead_time_days: i32,
    safety_stock: f64,
) -> f64 {
    avg_daily_consumption * lead_time_days as f64 + safety_stock
}

pub fn calculate_min_max_stock(
    avg_daily_consumption: f64,
    lead_time_days: i32,
    safety_factor: f64,
    days_of_stock: i32,
) -> (f64, f64) {
    let safety_stock = calculate_safety_stock(avg_daily_consumption, lead_time_days, safety_factor);
    let min_stock = safety_stock;
    let max_stock = avg_daily_consumption * days_of_stock as f64;
    (min_stock, max_stock)
}

pub fn determine_replenishment_needed(
    available_stock: f64,
    reorder_point: f64,
    suggested_quantity: f64,
    rule_based_only: bool,
    rule_exists: bool,
) -> bool {
    if rule_based_only && !rule_exists {
        return false;
    }
    available_stock < reorder_point || suggested_quantity > 0.0
}
