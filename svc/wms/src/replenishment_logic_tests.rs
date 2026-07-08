#[cfg(test)]
mod tests {
    use crate::modules::replenishment_logic::{
        calculate_min_max_stock, calculate_priority, calculate_reorder_point,
        calculate_safety_stock, calculate_suggested_quantity, calculate_trigger_type,
        determine_replenishment_needed,
    };

    #[test]
    fn test_calculate_suggested_quantity_with_max_stock() {
        assert_eq!(
            calculate_suggested_quantity(50.0, 200.0, 100.0, 10.0, 7),
            150.0
        );
        assert_eq!(
            calculate_suggested_quantity(200.0, 200.0, 100.0, 10.0, 7),
            0.0
        );
        assert_eq!(
            calculate_suggested_quantity(0.0, 100.0, 50.0, 5.0, 5),
            100.0
        );
    }

    #[test]
    fn test_calculate_suggested_quantity_without_max_stock() {
        assert_eq!(
            calculate_suggested_quantity(30.0, 0.0, 100.0, 10.0, 7),
            140.0
        );
        assert_eq!(
            calculate_suggested_quantity(200.0, 0.0, 100.0, 10.0, 7),
            0.0
        );
        assert_eq!(calculate_suggested_quantity(0.0, 0.0, 50.0, 5.0, 5), 75.0);
    }

    #[test]
    fn test_calculate_priority_urgent() {
        assert_eq!(calculate_priority(10.0, 50.0, 100.0), "urgent");
        assert_eq!(calculate_priority(0.0, 10.0, 100.0), "urgent");
        assert_eq!(calculate_priority(49.0, 50.0, 100.0), "urgent");
    }

    #[test]
    fn test_calculate_priority_high() {
        assert_eq!(calculate_priority(50.0, 50.0, 100.0), "high");
        assert_eq!(calculate_priority(75.0, 50.0, 100.0), "high");
        assert_eq!(calculate_priority(99.0, 50.0, 100.0), "high");
    }

    #[test]
    fn test_calculate_priority_medium() {
        assert_eq!(calculate_priority(100.0, 50.0, 100.0), "medium");
        assert_eq!(calculate_priority(150.0, 50.0, 100.0), "medium");
        assert_eq!(calculate_priority(200.0, 50.0, 100.0), "medium");
    }

    #[test]
    fn test_calculate_trigger_type() {
        assert_eq!(calculate_trigger_type(true), "rule_based");
        assert_eq!(calculate_trigger_type(false), "stock_based");
    }

    #[test]
    fn test_calculate_safety_stock() {
        assert_eq!(calculate_safety_stock(10.0, 7, 1.5), 105.0);
        assert_eq!(calculate_safety_stock(5.0, 5, 1.0), 25.0);
        assert_eq!(calculate_safety_stock(20.0, 14, 2.0), 560.0);
    }

    #[test]
    fn test_calculate_reorder_point() {
        assert_eq!(calculate_reorder_point(10.0, 7, 50.0), 120.0);
        assert_eq!(calculate_reorder_point(5.0, 5, 25.0), 50.0);
        assert_eq!(calculate_reorder_point(20.0, 14, 100.0), 380.0);
    }

    #[test]
    fn test_calculate_min_max_stock() {
        let (min, max) = calculate_min_max_stock(10.0, 7, 1.5, 30);
        assert_eq!(min, 105.0);
        assert_eq!(max, 300.0);

        let (min, max) = calculate_min_max_stock(5.0, 5, 1.0, 20);
        assert_eq!(min, 25.0);
        assert_eq!(max, 100.0);
    }

    #[test]
    fn test_determine_replenishment_needed() {
        assert!(determine_replenishment_needed(
            50.0, 100.0, 50.0, false, false
        ));
        assert!(determine_replenishment_needed(
            150.0, 100.0, 50.0, false, false
        ));
        assert!(determine_replenishment_needed(
            50.0, 100.0, 0.0, false, false
        ));

        assert!(!determine_replenishment_needed(
            150.0, 100.0, 0.0, false, false
        ));

        assert!(!determine_replenishment_needed(
            50.0, 100.0, 50.0, true, false
        ));
        assert!(determine_replenishment_needed(
            50.0, 100.0, 50.0, true, true
        ));
    }
}
