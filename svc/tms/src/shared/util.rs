pub fn validate_waybill_no(waybill_no: &str) -> bool {
    if waybill_no.is_empty() || waybill_no.len() > 64 {
        return false;
    }
    waybill_no
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn calc_transport_hours(distance_km: f64, speed_kmh: f64) -> Option<f64> {
    if distance_km < 0.0 || speed_kmh <= 0.0 {
        return None;
    }
    Some(distance_km / speed_kmh)
}

pub fn is_valid_shipment_status_transition(from: &str, to: &str) -> bool {
    let allowed: &[(&str, &str)] = &[
        ("draft", "pending"),
        ("pending", "in_transit"),
        ("in_transit", "delivered"),
        ("draft", "cancelled"),
        ("pending", "cancelled"),
        ("in_transit", "cancelled"),
    ];
    allowed.contains(&(from, to))
}

pub fn check_weight_limit(weight_kg: f64, max_kg: f64) -> bool {
    if max_kg <= 0.0 {
        return false;
    }
    weight_kg >= 0.0 && weight_kg <= max_kg
}

pub fn normalize_vehicle_plate(plate: &str) -> String {
    let cleaned: String = plate
        .chars()
        .filter(|c| !c.is_whitespace())
        .map(|c| c.to_ascii_uppercase())
        .collect();
    cleaned
}

pub fn calc_delivery_eta_days(
    distance_km: f64,
    avg_speed_kmh: f64,
    daily_hours: f64,
) -> Option<f64> {
    if distance_km < 0.0 || avg_speed_kmh <= 0.0 || daily_hours <= 0.0 {
        return None;
    }
    let total_hours = distance_km / avg_speed_kmh;
    Some(total_hours / daily_hours)
}

pub fn is_valid_driver_license_no(license: &str) -> bool {
    let trimmed = license.trim();
    if trimmed.len() < 6 || trimmed.len() > 20 {
        return false;
    }
    trimmed.chars().all(|c| c.is_ascii_alphanumeric())
}

pub fn calc_fuel_cost(
    distance_km: f64,
    liters_per_100km: f64,
    price_per_liter: f64,
) -> Option<f64> {
    if distance_km < 0.0 || liters_per_100km <= 0.0 || price_per_liter <= 0.0 {
        return None;
    }
    let liters = (distance_km / 100.0) * liters_per_100km;
    Some(liters * price_per_liter)
}

pub fn check_volume_limit(volume_m3: f64, max_m3: f64) -> bool {
    if max_m3 <= 0.0 {
        return false;
    }
    volume_m3 >= 0.0 && volume_m3 <= max_m3
}

pub fn normalize_carrier_code(code: &str) -> String {
    code.trim()
        .to_uppercase()
        .replace(|c: char| c.is_whitespace(), "")
}

pub fn is_valid_route_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 32 {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn calc_load_factor(actual_weight: f64, max_weight: f64) -> Option<f64> {
    if max_weight <= 0.0 {
        return None;
    }
    if actual_weight < 0.0 {
        return None;
    }
    let factor = actual_weight / max_weight;
    Some(factor.min(1.0))
}

pub fn is_valid_phone_number(phone: &str) -> bool {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    digits.len() >= 7 && digits.len() <= 15
}

pub fn normalize_tracking_no(tracking: &str) -> String {
    tracking
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_waybill_no_valid() {
        assert!(validate_waybill_no("WB-2024-001"));
        assert!(validate_waybill_no("ABC123"));
        assert!(validate_waybill_no("A_1"));
    }

    #[test]
    fn test_validate_waybill_no_invalid() {
        assert!(!validate_waybill_no(""));
        assert!(!validate_waybill_no("a".repeat(65).as_str()));
        assert!(!validate_waybill_no("WB 123"));
        assert!(!validate_waybill_no("WB@123"));
    }

    #[test]
    fn test_calc_transport_hours() {
        assert_eq!(calc_transport_hours(100.0, 50.0), Some(2.0));
        assert_eq!(calc_transport_hours(150.0, 60.0), Some(2.5));
        assert_eq!(calc_transport_hours(0.0, 50.0), Some(0.0));
        assert_eq!(calc_transport_hours(-10.0, 50.0), None);
        assert_eq!(calc_transport_hours(100.0, 0.0), None);
    }

    #[test]
    fn test_is_valid_shipment_status_transition() {
        assert!(is_valid_shipment_status_transition("draft", "pending"));
        assert!(is_valid_shipment_status_transition("pending", "in_transit"));
        assert!(is_valid_shipment_status_transition(
            "in_transit",
            "delivered"
        ));
        assert!(is_valid_shipment_status_transition("draft", "cancelled"));
        assert!(!is_valid_shipment_status_transition("draft", "in_transit"));
        assert!(!is_valid_shipment_status_transition("pending", "delivered"));
    }

    #[test]
    fn test_check_weight_limit() {
        assert!(check_weight_limit(500.0, 1000.0));
        assert!(check_weight_limit(1000.0, 1000.0));
        assert!(!check_weight_limit(1500.0, 1000.0));
        assert!(!check_weight_limit(-1.0, 1000.0));
        assert!(!check_weight_limit(500.0, 0.0));
    }

    #[test]
    fn test_normalize_vehicle_plate() {
        assert_eq!(normalize_vehicle_plate("京A 12345"), "京A12345");
        assert_eq!(normalize_vehicle_plate("  abc-123  "), "ABC-123");
        assert_eq!(normalize_vehicle_plate("\t沪B99999\n"), "沪B99999");
    }

    #[test]
    fn test_calc_delivery_eta_days() {
        assert_eq!(calc_delivery_eta_days(400.0, 80.0, 8.0), Some(0.625));
        assert_eq!(calc_delivery_eta_days(800.0, 80.0, 8.0), Some(1.25));
        assert_eq!(calc_delivery_eta_days(-10.0, 80.0, 8.0), None);
        assert_eq!(calc_delivery_eta_days(400.0, 0.0, 8.0), None);
    }

    #[test]
    fn test_is_valid_driver_license_no() {
        assert!(is_valid_driver_license_no("ABC1234567"));
        assert!(is_valid_driver_license_no("123456"));
        assert!(is_valid_driver_license_no("12345678901234567890"));
        assert!(!is_valid_driver_license_no("12345"));
        assert!(!is_valid_driver_license_no("1".repeat(21).as_str()));
        assert!(!is_valid_driver_license_no("ABC-123"));
    }

    #[test]
    fn test_calc_fuel_cost() {
        assert_eq!(calc_fuel_cost(100.0, 8.0, 7.5), Some(60.0));
        assert_eq!(calc_fuel_cost(200.0, 10.0, 6.0), Some(120.0));
        assert_eq!(calc_fuel_cost(-10.0, 8.0, 7.5), None);
        assert_eq!(calc_fuel_cost(100.0, 0.0, 7.5), None);
        assert_eq!(calc_fuel_cost(100.0, 8.0, 0.0), None);
    }

    #[test]
    fn test_check_volume_limit() {
        assert!(check_volume_limit(5.0, 10.0));
        assert!(check_volume_limit(10.0, 10.0));
        assert!(!check_volume_limit(15.0, 10.0));
        assert!(!check_volume_limit(-1.0, 10.0));
        assert!(!check_volume_limit(5.0, 0.0));
    }

    #[test]
    fn test_normalize_carrier_code() {
        assert_eq!(normalize_carrier_code("  sf express  "), "SFEXPRESS");
        assert_eq!(normalize_carrier_code("\tJD-Logistics\n"), "JD-LOGISTICS");
    }

    #[test]
    fn test_is_valid_route_code() {
        assert!(is_valid_route_code("R001"));
        assert!(is_valid_route_code("BJ-SH-EXPRESS"));
        assert!(is_valid_route_code("a"));
        assert!(!is_valid_route_code(""));
        assert!(!is_valid_route_code("a".repeat(33).as_str()));
        assert!(!is_valid_route_code("R@001"));
    }

    #[test]
    fn test_calc_load_factor() {
        assert_eq!(calc_load_factor(500.0, 1000.0), Some(0.5));
        assert_eq!(calc_load_factor(1000.0, 1000.0), Some(1.0));
        assert_eq!(calc_load_factor(1500.0, 1000.0), Some(1.0));
        assert_eq!(calc_load_factor(-1.0, 1000.0), None);
        assert_eq!(calc_load_factor(500.0, 0.0), None);
    }

    #[test]
    fn test_is_valid_phone_number() {
        assert!(is_valid_phone_number("13800138000"));
        assert!(is_valid_phone_number("1234567"));
        assert!(is_valid_phone_number("+86 138-0013-8000"));
        assert!(is_valid_phone_number("1".repeat(15).as_str()));
        assert!(!is_valid_phone_number("123456"));
        assert!(!is_valid_phone_number("1".repeat(16).as_str()));
    }

    #[test]
    fn test_normalize_tracking_no() {
        assert_eq!(normalize_tracking_no(" SF123456789 "), "SF123456789");
        assert_eq!(normalize_tracking_no("yt-987-654"), "YT987654");
        assert_eq!(normalize_tracking_no("\tJD001ABC\n"), "JD001ABC");
    }
}
