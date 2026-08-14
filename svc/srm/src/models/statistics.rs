use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::supplier::Supplier;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmStatistics {
    pub total_suppliers: i64,
    pub active_suppliers: i64,
    pub total_evaluations: i64,
    pub avg_score: f64,
    pub total_orders: i64,
    pub total_order_amount: f64,
    pub pending_orders: i64,
    pub completed_orders: i64,
    pub total_contracts: i64,
    pub active_contracts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierWithStats {
    pub supplier: Supplier,
    pub total_orders: i64,
    pub total_amount: f64,
    pub avg_evaluation_score: Option<f64>,
    pub last_order_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCount {
    pub category: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreDistribution {
    pub range: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyOrderTrend {
    pub month: String,
    pub order_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmDetailedStatistics {
    pub basic: SrmStatistics,
    pub supplier_by_category: Vec<CategoryCount>,
    pub supplier_by_status: Vec<StatusCount>,
    pub order_by_status: Vec<StatusCount>,
    pub evaluation_score_distribution: Vec<ScoreDistribution>,
    pub monthly_order_trend: Vec<MonthlyOrderTrend>,
    pub contract_by_status: Vec<StatusCount>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn sample_statistics() -> SrmStatistics {
        SrmStatistics {
            total_suppliers: 100,
            active_suppliers: 80,
            total_evaluations: 250,
            avg_score: 85.5,
            total_orders: 1500,
            total_order_amount: 12_500_000.0,
            pending_orders: 50,
            completed_orders: 1400,
            total_contracts: 75,
            active_contracts: 60,
        }
    }

    #[test]
    fn test_statistics_serde_roundtrip_full() {
        let s = sample_statistics();
        let json = serde_json::to_string(&s).unwrap();
        let de: SrmStatistics = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_suppliers, s.total_suppliers);
        assert_eq!(de.avg_score, s.avg_score);
        assert_eq!(de.total_order_amount, s.total_order_amount);
    }

    #[test]
    fn test_statistics_clone_equal() {
        let s = sample_statistics();
        let cloned = s.clone();
        assert_eq!(cloned.total_suppliers, s.total_suppliers);
        assert_eq!(cloned.active_suppliers, s.active_suppliers);
    }

    #[test]
    fn test_statistics_json_field_names() {
        let s = sample_statistics();
        let json = serde_json::to_value(&s).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("total_suppliers"));
        assert!(obj.contains_key("active_suppliers"));
        assert!(obj.contains_key("total_evaluations"));
        assert!(obj.contains_key("avg_score"));
        assert!(obj.contains_key("total_orders"));
        assert!(obj.contains_key("total_order_amount"));
        assert!(obj.contains_key("pending_orders"));
        assert!(obj.contains_key("completed_orders"));
        assert!(obj.contains_key("total_contracts"));
        assert!(obj.contains_key("active_contracts"));
    }

    #[test]
    fn test_statistics_zero_values() {
        let s = SrmStatistics {
            total_suppliers: 0,
            active_suppliers: 0,
            total_evaluations: 0,
            avg_score: 0.0,
            total_orders: 0,
            total_order_amount: 0.0,
            pending_orders: 0,
            completed_orders: 0,
            total_contracts: 0,
            active_contracts: 0,
        };
        let json = serde_json::to_string(&s).unwrap();
        let de: SrmStatistics = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_suppliers, 0);
        assert_eq!(de.avg_score, 0.0);
    }

    #[test]
    fn test_category_count_serde_roundtrip() {
        let c = CategoryCount {
            category: "raw_material".to_string(),
            count: 42,
        };
        let json = serde_json::to_string(&c).unwrap();
        let de: CategoryCount = serde_json::from_str(&json).unwrap();
        assert_eq!(de.category, c.category);
        assert_eq!(de.count, c.count);
    }

    #[test]
    fn test_category_count_clone() {
        let c = CategoryCount {
            category: "logistics".to_string(),
            count: 15,
        };
        let cloned = c.clone();
        assert_eq!(cloned.category, c.category);
        assert_eq!(cloned.count, c.count);
    }

    #[test]
    fn test_status_count_serde_roundtrip() {
        let s = StatusCount {
            status: "active".to_string(),
            count: 80,
        };
        let json = serde_json::to_string(&s).unwrap();
        let de: StatusCount = serde_json::from_str(&json).unwrap();
        assert_eq!(de.status, s.status);
        assert_eq!(de.count, s.count);
    }

    #[test]
    fn test_status_count_clone() {
        let s = StatusCount {
            status: "pending".to_string(),
            count: 20,
        };
        let cloned = s.clone();
        assert_eq!(cloned.status, s.status);
    }

    #[test]
    fn test_score_distribution_serde_roundtrip() {
        let d = ScoreDistribution {
            range: "[90,100]".to_string(),
            count: 25,
        };
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoreDistribution = serde_json::from_str(&json).unwrap();
        assert_eq!(de.range, d.range);
        assert_eq!(de.count, d.count);
    }

    #[test]
    fn test_monthly_order_trend_serde_roundtrip() {
        let t = MonthlyOrderTrend {
            month: "2025-01".to_string(),
            order_count: 120,
            total_amount: 1_500_000.0,
        };
        let json = serde_json::to_string(&t).unwrap();
        let de: MonthlyOrderTrend = serde_json::from_str(&json).unwrap();
        assert_eq!(de.month, t.month);
        assert_eq!(de.order_count, t.order_count);
        assert_eq!(de.total_amount, t.total_amount);
    }

    #[test]
    fn test_detailed_statistics_serde_roundtrip() {
        let d = SrmDetailedStatistics {
            basic: sample_statistics(),
            supplier_by_category: vec![CategoryCount {
                category: "raw_material".to_string(),
                count: 30,
            }],
            supplier_by_status: vec![StatusCount {
                status: "active".to_string(),
                count: 80,
            }],
            order_by_status: vec![StatusCount {
                status: "completed".to_string(),
                count: 1400,
            }],
            evaluation_score_distribution: vec![ScoreDistribution {
                range: "[90,100]".to_string(),
                count: 25,
            }],
            monthly_order_trend: vec![MonthlyOrderTrend {
                month: "2025-01".to_string(),
                order_count: 120,
                total_amount: 1_500_000.0,
            }],
            contract_by_status: vec![StatusCount {
                status: "active".to_string(),
                count: 60,
            }],
        };
        let json = serde_json::to_string(&d).unwrap();
        let de: SrmDetailedStatistics = serde_json::from_str(&json).unwrap();
        assert_eq!(de.basic.total_suppliers, d.basic.total_suppliers);
        assert_eq!(de.supplier_by_category.len(), 1);
        assert_eq!(de.monthly_order_trend.len(), 1);
    }

    #[test]
    fn test_detailed_statistics_empty_vectors() {
        let d = SrmDetailedStatistics {
            basic: sample_statistics(),
            supplier_by_category: vec![],
            supplier_by_status: vec![],
            order_by_status: vec![],
            evaluation_score_distribution: vec![],
            monthly_order_trend: vec![],
            contract_by_status: vec![],
        };
        let json = serde_json::to_string(&d).unwrap();
        let de: SrmDetailedStatistics = serde_json::from_str(&json).unwrap();
        assert!(de.supplier_by_category.is_empty());
        assert!(de.monthly_order_trend.is_empty());
    }

    #[test]
    fn test_supplier_with_stats_serde_roundtrip() {
        let s = Supplier {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            supplier_no: "SUP-001".to_string(),
            name: "Acme".to_string(),
            legal_name: None,
            category: "raw_material".to_string(),
            status: "active".to_string(),
            tax_id: None,
            address: None,
            contact_person: None,
            phone: None,
            email: None,
            website: None,
            credit_rating: None,
            risk_level: "low".to_string(),
            created_by: None,
            created_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-02T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        };
        let sws = SupplierWithStats {
            supplier: s,
            total_orders: 42,
            total_amount: 500_000.0,
            avg_evaluation_score: Some(88.5),
            last_order_date: Some(
                DateTime::parse_from_rfc3339("2025-02-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
        };
        let json = serde_json::to_string(&sws).unwrap();
        let de: SupplierWithStats = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_orders, sws.total_orders);
        assert_eq!(de.avg_evaluation_score, sws.avg_evaluation_score);
        assert_eq!(de.supplier.supplier_no, sws.supplier.supplier_no);
    }
}
