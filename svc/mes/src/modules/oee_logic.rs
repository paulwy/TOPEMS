pub fn calculate_oee(
    planned_time: f64,
    run_time: f64,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
) -> (f64, f64, f64, f64) {
    let availability = if planned_time > 0.0 {
        (run_time / planned_time) * 100.0
    } else {
        0.0
    };

    let performance = if run_time > 0.0 && ideal_cycle_time > 0.0 {
        ((actual_output * ideal_cycle_time) / run_time) * 100.0
    } else {
        0.0
    };
    let performance = performance.min(100.0);

    let quality = if actual_output > 0.0 {
        (good_output / actual_output) * 100.0
    } else {
        0.0
    };

    let oee = (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0;

    (availability, performance, quality, oee)
}

pub fn determine_oee_level(oee: f64) -> String {
    if oee >= 85.0 {
        "world_class".to_string()
    } else if oee >= 75.0 {
        "good".to_string()
    } else if oee >= 60.0 {
        "average".to_string()
    } else {
        "needs_improvement".to_string()
    }
}

pub fn calculate_availability(planned_time: f64, run_time: f64) -> f64 {
    if planned_time > 0.0 {
        (run_time / planned_time) * 100.0
    } else {
        0.0
    }
}

pub fn calculate_performance(run_time: f64, ideal_cycle_time: f64, actual_output: f64) -> f64 {
    if run_time > 0.0 && ideal_cycle_time > 0.0 {
        ((actual_output * ideal_cycle_time) / run_time) * 100.0
    } else {
        0.0
    }
    .min(100.0)
}

pub fn calculate_quality(actual_output: f64, good_output: f64) -> f64 {
    if actual_output > 0.0 {
        (good_output / actual_output) * 100.0
    } else {
        0.0
    }
}

pub fn calculate_efficiency_trend(last_oee: Option<f64>, current_oee: f64) -> String {
    match last_oee {
        Some(last) if current_oee > last + 3.0 => "significantly_improved".to_string(),
        Some(last) if current_oee > last => "improved".to_string(),
        Some(last) if current_oee < last - 3.0 => "significantly_decreased".to_string(),
        Some(last) if current_oee < last => "decreased".to_string(),
        _ => "stable".to_string(),
    }
}

pub fn validate_oee_inputs(
    planned_time: f64,
    run_time: f64,
    downtime: f64,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
) -> Result<(), String> {
    if planned_time < 0.0 {
        return Err("Planned production time cannot be negative".to_string());
    }
    if run_time < 0.0 {
        return Err("Run time cannot be negative".to_string());
    }
    if downtime < 0.0 {
        return Err("Downtime cannot be negative".to_string());
    }
    if ideal_cycle_time < 0.0 {
        return Err("Ideal cycle time cannot be negative".to_string());
    }
    if actual_output < 0.0 {
        return Err("Actual output cannot be negative".to_string());
    }
    if good_output < 0.0 {
        return Err("Good output cannot be negative".to_string());
    }
    if good_output > actual_output {
        return Err("Good output cannot exceed actual output".to_string());
    }
    if run_time > planned_time + downtime {
        return Err("Run time cannot exceed planned time plus downtime".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── calculate_oee 测试 ──────────────────────────────

    #[test]
    fn test_calculate_oee_world_class() {
        let (a, p, q, oee) = calculate_oee(480.0, 450.0, 1.0, 440.0, 435.0);
        assert!((a - 93.75).abs() < 0.01, "availability: {}", a);
        assert!((p - 97.78).abs() < 0.01, "performance: {}", p);
        assert!((q - 98.86).abs() < 0.01, "quality: {}", q);
        assert!(oee > 85.0, "oee: {}", oee);
    }

    #[test]
    fn test_calculate_oee_zero_planned_time() {
        let (a, p, q, oee) = calculate_oee(0.0, 100.0, 1.0, 50.0, 45.0);
        assert_eq!(a, 0.0);
        assert!(p > 0.0);
        assert!(q > 0.0);
        assert_eq!(oee, 0.0);
    }

    #[test]
    fn test_calculate_oee_zero_run_time() {
        let (a, p, q, oee) = calculate_oee(480.0, 0.0, 1.0, 0.0, 0.0);
        assert_eq!(a, 0.0);
        assert_eq!(p, 0.0);
        assert_eq!(q, 0.0);
        assert_eq!(oee, 0.0);
    }

    #[test]
    fn test_calculate_oee_performance_capped_at_100() {
        let (_, p, _, _) = calculate_oee(480.0, 100.0, 1.0, 200.0, 190.0);
        assert!(p <= 100.0, "performance should be capped at 100, got {}", p);
    }

    #[test]
    fn test_calculate_oee_all_zero() {
        let (a, p, q, oee) = calculate_oee(0.0, 0.0, 0.0, 0.0, 0.0);
        assert_eq!(a, 0.0);
        assert_eq!(p, 0.0);
        assert_eq!(q, 0.0);
        assert_eq!(oee, 0.0);
    }

    // ── determine_oee_level 测试 ────────────────────────

    #[test]
    fn test_determine_oee_level_world_class() {
        assert_eq!(determine_oee_level(90.0), "world_class");
        assert_eq!(determine_oee_level(85.0), "world_class");
    }

    #[test]
    fn test_determine_oee_level_good() {
        assert_eq!(determine_oee_level(80.0), "good");
        assert_eq!(determine_oee_level(75.0), "good");
    }

    #[test]
    fn test_determine_oee_level_average() {
        assert_eq!(determine_oee_level(70.0), "average");
        assert_eq!(determine_oee_level(60.0), "average");
    }

    #[test]
    fn test_determine_oee_level_needs_improvement() {
        assert_eq!(determine_oee_level(50.0), "needs_improvement");
        assert_eq!(determine_oee_level(0.0), "needs_improvement");
    }

    // ── calculate_availability 测试 ──────────────────────

    #[test]
    fn test_calculate_availability_normal() {
        assert!((calculate_availability(480.0, 420.0) - 87.5).abs() < 0.01);
    }

    #[test]
    fn test_calculate_availability_zero_planned() {
        assert_eq!(calculate_availability(0.0, 100.0), 0.0);
    }

    #[test]
    fn test_calculate_availability_full() {
        assert!((calculate_availability(480.0, 480.0) - 100.0).abs() < 0.01);
    }

    // ── calculate_performance 测试 ───────────────────────

    #[test]
    fn test_calculate_performance_normal() {
        let p = calculate_performance(400.0, 1.0, 380.0);
        assert!((p - 95.0).abs() < 0.01, "got {}", p);
    }

    #[test]
    fn test_calculate_performance_capped() {
        let p = calculate_performance(100.0, 1.0, 200.0);
        assert!(p <= 100.0);
    }

    #[test]
    fn test_calculate_performance_zero_run_time() {
        assert_eq!(calculate_performance(0.0, 1.0, 100.0), 0.0);
    }

    #[test]
    fn test_calculate_performance_zero_cycle_time() {
        assert_eq!(calculate_performance(100.0, 0.0, 100.0), 0.0);
    }

    // ── calculate_quality 测试 ───────────────────────────

    #[test]
    fn test_calculate_quality_normal() {
        assert!((calculate_quality(100.0, 95.0) - 95.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_quality_perfect() {
        assert!((calculate_quality(100.0, 100.0) - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_quality_zero_actual() {
        assert_eq!(calculate_quality(0.0, 0.0), 0.0);
    }

    // ── calculate_efficiency_trend 测试 ──────────────────

    #[test]
    fn test_efficiency_trend_significantly_improved() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 75.0), "significantly_improved");
    }

    #[test]
    fn test_efficiency_trend_improved() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 72.0), "improved");
    }

    #[test]
    fn test_efficiency_trend_stable() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 70.0), "stable");
    }

    #[test]
    fn test_efficiency_trend_improved_small_increase() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 71.0), "improved");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 72.5), "improved");
    }

    #[test]
    fn test_efficiency_trend_decreased_small_decrease() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 69.0), "decreased");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 67.5), "decreased");
    }

    #[test]
    fn test_efficiency_trend_decreased() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 68.0), "decreased");
    }

    #[test]
    fn test_efficiency_trend_significantly_decreased() {
        assert_eq!(calculate_efficiency_trend(Some(70.0), 65.0), "significantly_decreased");
    }

    #[test]
    fn test_efficiency_trend_no_last() {
        assert_eq!(calculate_efficiency_trend(None, 70.0), "stable");
    }

    // ── validate_oee_inputs 测试 ─────────────────────────

    #[test]
    fn test_validate_oee_inputs_valid() {
        let result = validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 380.0, 370.0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_oee_inputs_negative_planned_time() {
        let result = validate_oee_inputs(-1.0, 100.0, 0.0, 1.0, 50.0, 45.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Planned production time"));
    }

    #[test]
    fn test_validate_oee_inputs_negative_run_time() {
        let result = validate_oee_inputs(480.0, -1.0, 0.0, 1.0, 50.0, 45.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Run time"));
    }

    #[test]
    fn test_validate_oee_inputs_negative_downtime() {
        let result = validate_oee_inputs(480.0, 400.0, -1.0, 1.0, 50.0, 45.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Downtime"));
    }

    #[test]
    fn test_validate_oee_inputs_negative_cycle_time() {
        let result = validate_oee_inputs(480.0, 400.0, 80.0, -1.0, 50.0, 45.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Ideal cycle time"));
    }

    #[test]
    fn test_validate_oee_inputs_negative_actual_output() {
        let result = validate_oee_inputs(480.0, 400.0, 80.0, 1.0, -1.0, 0.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Actual output"));
    }

    #[test]
    fn test_validate_oee_inputs_negative_good_output() {
        let result = validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 50.0, -1.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Good output"));
    }

    #[test]
    fn test_validate_oee_inputs_good_exceeds_actual() {
        let result = validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 50.0, 60.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Good output cannot exceed actual output"));
    }

    #[test]
    fn test_validate_oee_inputs_run_exceeds_planned_plus_downtime() {
        let result = validate_oee_inputs(400.0, 500.0, 50.0, 1.0, 50.0, 45.0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Run time cannot exceed planned time plus downtime"));
    }

    #[test]
    fn test_validate_oee_inputs_boundary_run_equals_planned_plus_downtime() {
        let result = validate_oee_inputs(400.0, 450.0, 50.0, 1.0, 50.0, 45.0);
        assert!(result.is_ok());
    }
}
