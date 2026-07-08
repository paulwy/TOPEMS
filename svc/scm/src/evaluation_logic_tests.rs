#[cfg(test)]
mod tests {
    use crate::modules::evaluation_logic::{
        calculate_overall_score, calculate_score_trend, determine_evaluation_status,
        determine_supplier_grade, validate_scores,
    };

    #[test]
    fn test_calculate_overall_score_full_scores() {
        assert_eq!(
            calculate_overall_score(Some(100.0), Some(100.0), Some(100.0), Some(100.0)),
            100.0
        );
        assert_eq!(
            calculate_overall_score(Some(80.0), Some(80.0), Some(80.0), Some(80.0)),
            80.0
        );
        assert_eq!(
            calculate_overall_score(Some(0.0), Some(0.0), Some(0.0), Some(0.0)),
            0.0
        );
    }

    #[test]
    fn test_calculate_overall_score_with_weights() {
        assert_eq!(
            calculate_overall_score(Some(100.0), Some(0.0), Some(0.0), Some(0.0)),
            30.0
        );
        assert_eq!(
            calculate_overall_score(Some(0.0), Some(100.0), Some(0.0), Some(0.0)),
            25.0
        );
        assert_eq!(
            calculate_overall_score(Some(0.0), Some(0.0), Some(100.0), Some(0.0)),
            25.0
        );
        assert_eq!(
            calculate_overall_score(Some(0.0), Some(0.0), Some(0.0), Some(100.0)),
            20.0
        );
    }

    #[test]
    fn test_calculate_overall_score_partial_scores() {
        assert_eq!(
            calculate_overall_score(Some(80.0), Some(90.0), None, Some(70.0)),
            82.5
        );
        assert_eq!(
            calculate_overall_score(Some(70.0), None, Some(80.0), Some(90.0)),
            69.0
        );
        assert_eq!(
            calculate_overall_score(None, Some(60.0), Some(70.0), Some(80.0)),
            55.0
        );
    }

    #[test]
    fn test_determine_supplier_grade() {
        assert_eq!(determine_supplier_grade(95.0), "A");
        assert_eq!(determine_supplier_grade(90.0), "A");
        assert_eq!(determine_supplier_grade(85.0), "B");
        assert_eq!(determine_supplier_grade(80.0), "B");
        assert_eq!(determine_supplier_grade(75.0), "C");
        assert_eq!(determine_supplier_grade(70.0), "C");
        assert_eq!(determine_supplier_grade(65.0), "D");
        assert_eq!(determine_supplier_grade(60.0), "D");
        assert_eq!(determine_supplier_grade(55.0), "F");
        assert_eq!(determine_supplier_grade(0.0), "F");
    }

    #[test]
    fn test_determine_evaluation_status() {
        assert_eq!(determine_evaluation_status(70.0), "approved");
        assert_eq!(determine_evaluation_status(80.0), "approved");
        assert_eq!(determine_evaluation_status(100.0), "approved");
        assert_eq!(determine_evaluation_status(69.0), "pending_review");
        assert_eq!(determine_evaluation_status(60.0), "pending_review");
        assert_eq!(determine_evaluation_status(0.0), "pending_review");
    }

    #[test]
    fn test_calculate_score_trend() {
        assert_eq!(calculate_score_trend(Some(70.0), 80.0), "significantly_up");
        assert_eq!(calculate_score_trend(Some(75.0), 77.0), "up");
        assert_eq!(calculate_score_trend(Some(80.0), 80.0), "stable");
        assert_eq!(calculate_score_trend(None, 80.0), "stable");
        assert_eq!(calculate_score_trend(Some(80.0), 75.0), "down");
        assert_eq!(
            calculate_score_trend(Some(80.0), 65.0),
            "significantly_down"
        );
    }

    #[test]
    fn test_validate_scores_valid() {
        assert!(validate_scores(Some(80.0), Some(70.0), Some(90.0), Some(85.0)).is_ok());
        assert!(validate_scores(Some(0.0), Some(50.0), None, None).is_ok());
        assert!(validate_scores(None, None, Some(100.0), None).is_ok());
    }

    #[test]
    fn test_validate_scores_invalid_range() {
        assert!(validate_scores(Some(-1.0), Some(50.0), Some(50.0), Some(50.0)).is_err());
        assert!(validate_scores(Some(101.0), Some(50.0), Some(50.0), Some(50.0)).is_err());
        assert!(validate_scores(Some(50.0), Some(-5.0), Some(50.0), Some(50.0)).is_err());
        assert!(validate_scores(Some(50.0), Some(50.0), Some(150.0), Some(50.0)).is_err());
    }

    #[test]
    fn test_validate_scores_all_none() {
        assert!(validate_scores(None, None, None, None).is_err());
    }
}
