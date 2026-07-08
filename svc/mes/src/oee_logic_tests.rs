#[cfg(test)]
mod tests {
    use crate::modules::oee_logic::{
        calculate_availability, calculate_efficiency_trend, calculate_oee, calculate_performance,
        calculate_quality, determine_oee_level, validate_oee_inputs,
    };

    #[test]
    fn test_calculate_oee_full_efficiency() {
        let (availability, performance, quality, oee) =
            calculate_oee(480.0, 480.0, 1.0, 480.0, 480.0);
        assert_eq!(availability, 100.0);
        assert_eq!(performance, 100.0);
        assert_eq!(quality, 100.0);
        assert_eq!(oee, 100.0);
    }

    #[test]
    fn test_calculate_oee_typical_values() {
        let (availability, performance, quality, oee) =
            calculate_oee(480.0, 400.0, 1.0, 350.0, 340.0);
        assert!((availability - 83.33).abs() < 0.01);
        assert!((performance - 87.5).abs() < 0.01);
        assert!((quality - 97.14).abs() < 0.01);
        assert!((oee - 72.92).abs() < 0.01);
    }

    #[test]
    fn test_calculate_oee_zero_inputs() {
        let (availability, performance, quality, oee) = calculate_oee(0.0, 0.0, 0.0, 0.0, 0.0);
        assert_eq!(availability, 0.0);
        assert_eq!(performance, 0.0);
        assert_eq!(quality, 0.0);
        assert_eq!(oee, 0.0);
    }

    #[test]
    fn test_calculate_availability() {
        assert_eq!(calculate_availability(480.0, 480.0), 100.0);
        assert_eq!(calculate_availability(480.0, 240.0), 50.0);
        assert_eq!(calculate_availability(480.0, 0.0), 0.0);
        assert_eq!(calculate_availability(0.0, 100.0), 0.0);
    }

    #[test]
    fn test_calculate_performance() {
        assert_eq!(calculate_performance(480.0, 1.0, 480.0), 100.0);
        assert_eq!(calculate_performance(480.0, 1.0, 240.0), 50.0);
        assert_eq!(calculate_performance(0.0, 1.0, 100.0), 0.0);
        assert_eq!(calculate_performance(100.0, 0.0, 100.0), 0.0);
    }

    #[test]
    fn test_calculate_quality() {
        assert_eq!(calculate_quality(100.0, 100.0), 100.0);
        assert_eq!(calculate_quality(100.0, 90.0), 90.0);
        assert_eq!(calculate_quality(100.0, 0.0), 0.0);
        assert_eq!(calculate_quality(0.0, 0.0), 0.0);
    }

    #[test]
    fn test_determine_oee_level() {
        assert_eq!(determine_oee_level(90.0), "world_class");
        assert_eq!(determine_oee_level(85.0), "world_class");
        assert_eq!(determine_oee_level(80.0), "good");
        assert_eq!(determine_oee_level(75.0), "good");
        assert_eq!(determine_oee_level(70.0), "average");
        assert_eq!(determine_oee_level(60.0), "average");
        assert_eq!(determine_oee_level(55.0), "needs_improvement");
        assert_eq!(determine_oee_level(0.0), "needs_improvement");
    }

    #[test]
    fn test_calculate_efficiency_trend() {
        assert_eq!(
            calculate_efficiency_trend(Some(70.0), 75.0),
            "significantly_improved"
        );
        assert_eq!(calculate_efficiency_trend(Some(70.0), 72.0), "improved");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 70.0), "stable");
        assert_eq!(calculate_efficiency_trend(None, 70.0), "stable");
        assert_eq!(calculate_efficiency_trend(Some(70.0), 68.0), "decreased");
        assert_eq!(
            calculate_efficiency_trend(Some(70.0), 65.0),
            "significantly_decreased"
        );
    }

    #[test]
    fn test_validate_oee_inputs_valid() {
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, 340.0).is_ok());
        assert!(validate_oee_inputs(100.0, 100.0, 0.0, 0.5, 200.0, 200.0).is_ok());
        assert!(validate_oee_inputs(0.0, 0.0, 0.0, 0.0, 0.0, 0.0).is_ok());
    }

    #[test]
    fn test_validate_oee_inputs_invalid_negative() {
        assert!(validate_oee_inputs(-10.0, 400.0, 80.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, -10.0, 80.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, -10.0, 1.0, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, -0.1, 350.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, -10.0, 340.0).is_err());
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, -10.0).is_err());
    }

    #[test]
    fn test_validate_oee_inputs_good_exceeds_actual() {
        assert!(validate_oee_inputs(480.0, 400.0, 80.0, 1.0, 350.0, 400.0).is_err());
    }

    #[test]
    fn test_validate_oee_inputs_run_time_exceeds_planned() {
        assert!(validate_oee_inputs(480.0, 500.0, 80.0, 1.0, 350.0, 340.0).is_err());
    }
}
