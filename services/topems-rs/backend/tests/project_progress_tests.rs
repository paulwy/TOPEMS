#[cfg(test)]
mod tests {
    #[test]
    fn test_progress_calculation_with_weights() {
        let total_weight: i32 = 100;
        let completed_weight: i32 = 50;
        
        let progress = (completed_weight as f64 / total_weight as f64 * 100.0).round() as i32;
        
        assert_eq!(progress, 50);
    }

    #[test]
    fn test_progress_calculation_no_weight() {
        let total_phases: i32 = 4;
        let completed_phases: i32 = 2;
        let total_progress: i32 = 150;
        
        let avg_progress = total_progress as f64 / total_phases as f64;
        let completion_ratio = completed_phases as f64 / total_phases as f64;
        let progress = ((avg_progress + completion_ratio * 100.0) / 2.0).round() as i32;
        
        assert_eq!(progress, 44);
    }

    #[test]
    fn test_progress_calculation_all_completed() {
        let total_weight: i32 = 100;
        let completed_weight: i32 = 100;
        
        let progress = (completed_weight as f64 / total_weight as f64 * 100.0).round() as i32;
        
        assert_eq!(progress, 100);
    }

    #[test]
    fn test_progress_calculation_none_completed() {
        let total_weight: i32 = 100;
        let completed_weight: i32 = 0;
        
        let progress = (completed_weight as f64 / total_weight as f64 * 100.0).round() as i32;
        
        assert_eq!(progress, 0);
    }

    #[test]
    fn test_progress_capped_at_100() {
        let total_weight: i32 = 50;
        let completed_weight: i32 = 100;
        
        let calculated_progress = (completed_weight as f64 / total_weight as f64 * 100.0).round() as i32;
        let progress = calculated_progress.min(100);
        
        assert_eq!(progress, 100);
    }

    #[test]
    fn test_cost_variance_calculation() {
        let budgeted_cost: f64 = 10000.0;
        let actual_cost: f64 = 11000.0;
        
        let variance = ((actual_cost - budgeted_cost) / budgeted_cost * 100.0);
        
        assert_eq!(variance, 10.0);
    }

    #[test]
    fn test_budget_usage_rate() {
        let total_budget: f64 = 50000.0;
        let approved_amount: f64 = 25000.0;
        
        let usage_rate = (approved_amount / total_budget * 100.0);
        
        assert_eq!(usage_rate, 50.0);
    }

    #[test]
    fn test_schedule_variance() {
        let elapsed_duration: f64 = 30.0;
        let total_duration: f64 = 60.0;
        let current_progress: f64 = 40.0;
        
        let expected_progress = (elapsed_duration / total_duration * 100.0);
        let variance = expected_progress - current_progress;
        
        assert_eq!(variance, 10.0);
    }

    #[test]
    fn test_risk_level_high() {
        let is_overdue = true;
        let is_over_budget = true;
        let is_delayed = false;
        let is_cost_overrun = false;
        
        let risk_level = if is_overdue || is_over_budget || is_delayed || is_cost_overrun {
            if (is_overdue && is_over_budget) || (is_delayed && is_cost_overrun) {
                "high"
            } else {
                "medium"
            }
        } else {
            "low"
        };
        
        assert_eq!(risk_level, "high");
    }

    #[test]
    fn test_risk_level_medium() {
        let is_overdue = true;
        let is_over_budget = false;
        let is_delayed = false;
        let is_cost_overrun = false;
        
        let risk_level = if is_overdue || is_over_budget || is_delayed || is_cost_overrun {
            if (is_overdue && is_over_budget) || (is_delayed && is_cost_overrun) {
                "high"
            } else {
                "medium"
            }
        } else {
            "low"
        };
        
        assert_eq!(risk_level, "medium");
    }

    #[test]
    fn test_risk_level_low() {
        let is_overdue = false;
        let is_over_budget = false;
        let is_delayed = false;
        let is_cost_overrun = false;
        
        let risk_level = if is_overdue || is_over_budget || is_delayed || is_cost_overrun {
            if (is_overdue && is_over_budget) || (is_delayed && is_cost_overrun) {
                "high"
            } else {
                "medium"
            }
        } else {
            "low"
        };
        
        assert_eq!(risk_level, "low");
    }

    #[test]
    fn test_utilization_rate() {
        let total_members: i64 = 5;
        let total_allocation: f32 = 3.5;
        
        let utilization = total_allocation / (total_members as f32) * 100.0;
        
        assert_eq!(utilization, 70.0);
    }

    #[test]
    fn test_financial_health_healthy() {
        let receivable_paid: f64 = 10000.0;
        let payable_paid: f64 = 8000.0;
        let receivable_pending: f64 = 1000.0;
        let payable_pending: f64 = 5000.0;
        
        let health = if receivable_paid > 0.0 && payable_paid > 0.0 {
            if receivable_pending < payable_pending * 0.5 {
                "healthy"
            } else if receivable_pending < payable_pending {
                "attention"
            } else {
                "critical"
            }
        } else {
            "unknown"
        };
        
        assert_eq!(health, "healthy");
    }

    #[test]
    fn test_financial_health_attention() {
        let receivable_paid: f64 = 10000.0;
        let payable_paid: f64 = 8000.0;
        let receivable_pending: f64 = 2000.0;
        let payable_pending: f64 = 3000.0;
        
        let health = if receivable_paid > 0.0 && payable_paid > 0.0 {
            if receivable_pending < payable_pending * 0.5 {
                "healthy"
            } else if receivable_pending < payable_pending {
                "attention"
            } else {
                "critical"
            }
        } else {
            "unknown"
        };
        
        assert_eq!(health, "attention");
    }

    #[test]
    fn test_financial_health_critical() {
        let receivable_paid: f64 = 10000.0;
        let payable_paid: f64 = 8000.0;
        let receivable_pending: f64 = 5000.0;
        let payable_pending: f64 = 3000.0;
        
        let health = if receivable_paid > 0.0 && payable_paid > 0.0 {
            if receivable_pending < payable_pending * 0.5 {
                "healthy"
            } else if receivable_pending < payable_pending {
                "attention"
            } else {
                "critical"
            }
        } else {
            "unknown"
        };
        
        assert_eq!(health, "critical");
    }

    #[test]
    fn test_role_distribution_calculation() {
        let total_members: i64 = 10;
        let role_count: i64 = 3;
        
        let percentage = (role_count as f32 / total_members as f32) * 100.0;
        
        assert_eq!(percentage, 30.0);
    }

    #[test]
    fn test_on_time_delivery_rate() {
        let total_completed: i64 = 20;
        let on_time: i64 = 15;
        
        let rate = (on_time as f64 / total_completed as f64) * 100.0;
        
        assert_eq!(rate, 75.0);
    }

    #[test]
    fn test_budget_adherence_rate() {
        let total_completed: i64 = 20;
        let on_budget: i64 = 18;
        
        let rate = (on_budget as f64 / total_completed as f64) * 100.0;
        
        assert_eq!(rate, 90.0);
    }
}