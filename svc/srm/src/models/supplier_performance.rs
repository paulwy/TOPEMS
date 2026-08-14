use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierPerformance {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub total_orders: i64,
    pub total_amount: f64,
    pub avg_quality_score: Option<f64>,
    pub avg_delivery_score: Option<f64>,
    pub avg_service_score: Option<f64>,
    pub avg_price_score: Option<f64>,
    pub avg_overall_score: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub defect_rate: Option<f64>,
    pub last_evaluation_date: Option<DateTime<Utc>>,
    pub evaluation_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringResult {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub overall_score: f64,
    pub level: String,
    pub level_description: String,
    pub dimension_scores: Vec<DimensionScore>,
    pub evaluation_count: i64,
    pub last_evaluation_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DimensionScore {
    pub dimension_code: String,
    pub dimension_name: String,
    pub score: f64,
    pub weight: f64,
    pub weighted_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceReportDetail {
    pub id: String,
    pub supplier_id: String,
    pub supplier_name: String,
    pub report_period: String,
    pub overall_score: f64,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub defect_rate: Option<f64>,
    pub total_orders: i64,
    pub total_amount: f64,
    pub evaluation_count: i64,
    pub strengths: Option<Vec<String>>,
    pub weaknesses: Option<Vec<String>>,
    pub recommendations: Option<Vec<String>>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceTrendItem {
    pub period: String,
    pub avg_overall_score: f64,
    pub avg_quality_score: Option<f64>,
    pub avg_delivery_score: Option<f64>,
    pub avg_service_score: Option<f64>,
    pub avg_price_score: Option<f64>,
    pub order_count: i64,
    pub total_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceTrendResponse {
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub period: String,
    pub trends: Vec<PerformanceTrendItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierComparison {
    pub supplier_id: String,
    pub supplier_name: String,
    pub overall_score: f64,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub on_time_delivery_rate: Option<f64>,
    pub defect_rate: Option<f64>,
    pub total_orders: i64,
    pub total_amount: f64,
    pub evaluation_count: i64,
    pub rank: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierComparisonResponse {
    pub suppliers: Vec<SupplierComparison>,
    pub comparison_date: String,
    pub best_supplier: Option<String>,
    pub worst_supplier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummary {
    pub total_suppliers: i64,
    pub evaluated_suppliers: i64,
    pub evaluation_rate: f64,
    pub avg_overall_score: f64,
    pub top_supplier: Option<TopSupplierInfo>,
    pub bottom_supplier: Option<TopSupplierInfo>,
    pub category_scores: Vec<CategoryScore>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopSupplierInfo {
    pub name: String,
    pub avg_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryScore {
    pub category: String,
    pub avg_score: f64,
    pub supplier_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreLevelDistribution {
    pub level: String,
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreLevelDefinitions {
    pub level: String,
    pub range: String,
    pub description: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_performance() -> SupplierPerformance {
        SupplierPerformance {
            supplier_id: Uuid::new_v4(),
            supplier_name: "Acme Corp".to_string(),
            total_orders: 42,
            total_amount: 1_234_567.89,
            avg_quality_score: Some(88.5),
            avg_delivery_score: Some(85.0),
            avg_service_score: Some(86.0),
            avg_price_score: Some(90.0),
            avg_overall_score: Some(87.0),
            on_time_delivery_rate: Some(0.95),
            defect_rate: Some(0.01),
            last_evaluation_date: Some(
                DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            evaluation_count: 5,
        }
    }

    #[test]
    fn test_performance_serde_roundtrip_full() {
        let p = sample_performance();
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierPerformance = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_name, p.supplier_name);
        assert_eq!(de.total_orders, p.total_orders);
        assert_eq!(de.total_amount, p.total_amount);
        assert_eq!(de.avg_overall_score, p.avg_overall_score);
    }

    #[test]
    fn test_performance_serde_roundtrip_none_options() {
        let mut p = sample_performance();
        p.avg_quality_score = None;
        p.avg_delivery_score = None;
        p.avg_service_score = None;
        p.avg_price_score = None;
        p.avg_overall_score = None;
        p.on_time_delivery_rate = None;
        p.defect_rate = None;
        p.last_evaluation_date = None;
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierPerformance = serde_json::from_str(&json).unwrap();
        assert_eq!(de.avg_overall_score, None);
        assert_eq!(de.on_time_delivery_rate, None);
        assert_eq!(de.last_evaluation_date, None);
    }

    #[test]
    fn test_performance_clone_equal() {
        let p = sample_performance();
        let cloned = p.clone();
        assert_eq!(cloned.supplier_name, p.supplier_name);
        assert_eq!(cloned.total_orders, p.total_orders);
    }

    #[test]
    fn test_performance_json_field_names() {
        let p = sample_performance();
        let json = serde_json::to_value(&p).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("supplier_id"));
        assert!(obj.contains_key("supplier_name"));
        assert!(obj.contains_key("total_orders"));
        assert!(obj.contains_key("total_amount"));
        assert!(obj.contains_key("avg_overall_score"));
        assert!(obj.contains_key("on_time_delivery_rate"));
        assert!(obj.contains_key("defect_rate"));
        assert!(obj.contains_key("evaluation_count"));
    }

    #[test]
    fn test_dimension_score_serde_roundtrip() {
        let ds = DimensionScore {
            dimension_code: "QUALITY".to_string(),
            dimension_name: "Quality".to_string(),
            score: 88.5,
            weight: 0.4,
            weighted_score: 35.4,
        };
        let json = serde_json::to_string(&ds).unwrap();
        let de: DimensionScore = serde_json::from_str(&json).unwrap();
        assert_eq!(de.dimension_code, ds.dimension_code);
        assert_eq!(de.score, ds.score);
        assert_eq!(de.weighted_score, ds.weighted_score);
    }

    #[test]
    fn test_scoring_result_serde_roundtrip() {
        let sr = ScoringResult {
            supplier_id: Uuid::new_v4(),
            supplier_name: "Beta Inc".to_string(),
            overall_score: 86.5,
            level: "A".to_string(),
            level_description: "Excellent".to_string(),
            dimension_scores: vec![DimensionScore {
                dimension_code: "DELIVERY".to_string(),
                dimension_name: "Delivery".to_string(),
                score: 90.0,
                weight: 0.5,
                weighted_score: 45.0,
            }],
            evaluation_count: 3,
            last_evaluation_date: Some(
                DateTime::parse_from_rfc3339("2025-02-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
        };
        let json = serde_json::to_string(&sr).unwrap();
        let de: ScoringResult = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_name, sr.supplier_name);
        assert_eq!(de.overall_score, sr.overall_score);
        assert_eq!(de.dimension_scores.len(), 1);
        assert_eq!(de.dimension_scores[0].dimension_code, "DELIVERY");
    }

    #[test]
    fn test_scoring_result_empty_dimensions() {
        let sr = ScoringResult {
            supplier_id: Uuid::new_v4(),
            supplier_name: "Empty".to_string(),
            overall_score: 0.0,
            level: "E".to_string(),
            level_description: "Poor".to_string(),
            dimension_scores: vec![],
            evaluation_count: 0,
            last_evaluation_date: None,
        };
        let json = serde_json::to_string(&sr).unwrap();
        let de: ScoringResult = serde_json::from_str(&json).unwrap();
        assert!(de.dimension_scores.is_empty());
        assert_eq!(de.evaluation_count, 0);
    }

    #[test]
    fn test_performance_report_detail_serde_roundtrip() {
        let r = PerformanceReportDetail {
            id: "RPT-001".to_string(),
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
            supplier_name: "Gamma".to_string(),
            report_period: "2025-Q1".to_string(),
            overall_score: 85.0,
            quality_score: Some(88.0),
            delivery_score: Some(82.0),
            service_score: Some(86.0),
            price_score: Some(90.0),
            on_time_delivery_rate: Some(0.92),
            defect_rate: Some(0.02),
            total_orders: 15,
            total_amount: 500_000.0,
            evaluation_count: 3,
            strengths: Some(vec!["Quality".to_string(), "Price".to_string()]),
            weaknesses: Some(vec!["Delivery".to_string()]),
            recommendations: Some(vec!["Improve logistics".to_string()]),
            generated_at: DateTime::parse_from_rfc3339("2025-03-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        };
        let json = serde_json::to_string(&r).unwrap();
        let de: PerformanceReportDetail = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, r.id);
        assert_eq!(de.overall_score, r.overall_score);
        assert_eq!(de.strengths.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_performance_report_detail_empty_vectors() {
        let r = PerformanceReportDetail {
            id: "RPT-002".to_string(),
            supplier_id: "x".to_string(),
            supplier_name: "Y".to_string(),
            report_period: "2025-Q2".to_string(),
            overall_score: 50.0,
            quality_score: None,
            delivery_score: None,
            service_score: None,
            price_score: None,
            on_time_delivery_rate: None,
            defect_rate: None,
            total_orders: 0,
            total_amount: 0.0,
            evaluation_count: 0,
            strengths: Some(vec![]),
            weaknesses: Some(vec![]),
            recommendations: None,
            generated_at: DateTime::parse_from_rfc3339("2025-04-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        };
        let json = serde_json::to_string(&r).unwrap();
        let de: PerformanceReportDetail = serde_json::from_str(&json).unwrap();
        assert!(de.strengths.as_ref().unwrap().is_empty());
        assert!(de.recommendations.is_none());
    }

    #[test]
    fn test_performance_trend_item_serde_roundtrip() {
        let it = PerformanceTrendItem {
            period: "2025-01".to_string(),
            avg_overall_score: 85.0,
            avg_quality_score: Some(88.0),
            avg_delivery_score: Some(82.0),
            avg_service_score: Some(86.0),
            avg_price_score: Some(90.0),
            order_count: 12,
            total_amount: 100_000.0,
        };
        let json = serde_json::to_string(&it).unwrap();
        let de: PerformanceTrendItem = serde_json::from_str(&json).unwrap();
        assert_eq!(de.period, it.period);
        assert_eq!(de.avg_overall_score, it.avg_overall_score);
        assert_eq!(de.order_count, it.order_count);
    }

    #[test]
    fn test_performance_trend_response_serde_roundtrip() {
        let resp = PerformanceTrendResponse {
            supplier_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            supplier_name: Some("Acme".to_string()),
            period: "monthly".to_string(),
            trends: vec![PerformanceTrendItem {
                period: "2025-01".to_string(),
                avg_overall_score: 80.0,
                avg_quality_score: None,
                avg_delivery_score: None,
                avg_service_score: None,
                avg_price_score: None,
                order_count: 5,
                total_amount: 50_000.0,
            }],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let de: PerformanceTrendResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(de.period, resp.period);
        assert_eq!(de.trends.len(), 1);
        assert!(de.supplier_id.is_some());
    }

    #[test]
    fn test_supplier_comparison_serde_roundtrip() {
        let sc = SupplierComparison {
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
            supplier_name: "Acme".to_string(),
            overall_score: 88.0,
            quality_score: Some(90.0),
            delivery_score: Some(85.0),
            service_score: Some(87.0),
            price_score: Some(89.0),
            on_time_delivery_rate: Some(0.95),
            defect_rate: Some(0.01),
            total_orders: 20,
            total_amount: 200_000.0,
            evaluation_count: 4,
            rank: 1,
        };
        let json = serde_json::to_string(&sc).unwrap();
        let de: SupplierComparison = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_name, sc.supplier_name);
        assert_eq!(de.rank, sc.rank);
    }

    #[test]
    fn test_supplier_comparison_response_serde_roundtrip() {
        let resp = SupplierComparisonResponse {
            suppliers: vec![SupplierComparison {
                supplier_id: "x".to_string(),
                supplier_name: "A".to_string(),
                overall_score: 90.0,
                quality_score: None,
                delivery_score: None,
                service_score: None,
                price_score: None,
                on_time_delivery_rate: None,
                defect_rate: None,
                total_orders: 0,
                total_amount: 0.0,
                evaluation_count: 0,
                rank: 1,
            }],
            comparison_date: "2025-01-01".to_string(),
            best_supplier: Some("A".to_string()),
            worst_supplier: None,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let de: SupplierComparisonResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(de.suppliers.len(), 1);
        assert_eq!(de.best_supplier.as_deref(), Some("A"));
        assert!(de.worst_supplier.is_none());
    }

    #[test]
    fn test_performance_summary_serde_roundtrip() {
        let ps = PerformanceSummary {
            total_suppliers: 100,
            evaluated_suppliers: 80,
            evaluation_rate: 0.8,
            avg_overall_score: 85.0,
            top_supplier: Some(TopSupplierInfo {
                name: "Acme".to_string(),
                avg_score: 98.0,
            }),
            bottom_supplier: Some(TopSupplierInfo {
                name: "Worst".to_string(),
                avg_score: 45.0,
            }),
            category_scores: vec![CategoryScore {
                category: "raw_material".to_string(),
                avg_score: 87.0,
                supplier_count: 30,
            }],
        };
        let json = serde_json::to_string(&ps).unwrap();
        let de: PerformanceSummary = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_suppliers, ps.total_suppliers);
        assert_eq!(de.evaluation_rate, ps.evaluation_rate);
        assert!(de.top_supplier.is_some());
        assert_eq!(de.category_scores.len(), 1);
    }

    #[test]
    fn test_performance_summary_no_extremes() {
        let ps = PerformanceSummary {
            total_suppliers: 0,
            evaluated_suppliers: 0,
            evaluation_rate: 0.0,
            avg_overall_score: 0.0,
            top_supplier: None,
            bottom_supplier: None,
            category_scores: vec![],
        };
        let json = serde_json::to_string(&ps).unwrap();
        let de: PerformanceSummary = serde_json::from_str(&json).unwrap();
        assert!(de.top_supplier.is_none());
        assert!(de.category_scores.is_empty());
    }

    #[test]
    fn test_top_supplier_info_serde_roundtrip() {
        let t = TopSupplierInfo {
            name: "Acme Corp".to_string(),
            avg_score: 95.5,
        };
        let json = serde_json::to_string(&t).unwrap();
        let de: TopSupplierInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, t.name);
        assert_eq!(de.avg_score, t.avg_score);
    }

    #[test]
    fn test_category_score_serde_roundtrip() {
        let cs = CategoryScore {
            category: "logistics".to_string(),
            avg_score: 82.5,
            supplier_count: 15,
        };
        let json = serde_json::to_string(&cs).unwrap();
        let de: CategoryScore = serde_json::from_str(&json).unwrap();
        assert_eq!(de.category, cs.category);
        assert_eq!(de.supplier_count, cs.supplier_count);
    }

    #[test]
    fn test_score_level_distribution_serde_roundtrip() {
        let d = ScoreLevelDistribution {
            level: "A".to_string(),
            label: "Excellent".to_string(),
            count: 25,
        };
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoreLevelDistribution = serde_json::from_str(&json).unwrap();
        assert_eq!(de.level, d.level);
        assert_eq!(de.count, d.count);
    }

    #[test]
    fn test_score_level_definitions_serde_roundtrip() {
        let d = ScoreLevelDefinitions {
            level: "A".to_string(),
            range: "[90, 100]".to_string(),
            description: "Excellent performance".to_string(),
        };
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoreLevelDefinitions = serde_json::from_str(&json).unwrap();
        assert_eq!(de.level, d.level);
        assert_eq!(de.range, d.range);
        assert_eq!(de.description, d.description);
    }

    #[test]
    fn test_performance_total_orders_zero() {
        let mut p = sample_performance();
        p.total_orders = 0;
        p.total_amount = 0.0;
        p.evaluation_count = 0;
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierPerformance = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_orders, 0);
        assert_eq!(de.total_amount, 0.0);
    }
}
