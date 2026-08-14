use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub customers: CustomerStats,
    pub contacts: ContactStats,
    pub opportunities: OpportunityStats,
    pub interactions: InteractionStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerStats {
    pub total: i64,
    pub active: i64,
    pub by_industry: Vec<IndustryCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IndustryCount {
    pub industry: Option<String>,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactStats {
    pub total: i64,
    pub active: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityStats {
    pub total: i64,
    pub by_stage: Vec<StageCount>,
    pub total_value: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StageCount {
    pub stage: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractionStats {
    pub total: i64,
    pub scheduled: i64,
    pub completed: i64,
    pub by_type: Vec<TypeCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TypeCount {
    pub r#type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerWithDetails {
    pub customer: crate::models::Customer,
    pub contacts: Vec<crate::models::Contact>,
    pub opportunities: Vec<crate::models::Opportunity>,
    pub recent_interactions: Vec<crate::models::Interaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelStage {
    pub stage: String,
    pub count: i64,
    pub total_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesForecast {
    pub months: i32,
    pub total_forecast: f64,
    pub last_month_actual: f64,
    pub monthly_forecast: Vec<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test] fn rt_industry_count_some() {
        roundtrip(&IndustryCount { industry: Some("制造业".into()), count: 42 });
    }
    #[test] fn rt_industry_count_none() {
        roundtrip(&IndustryCount { industry: None, count: 7 });
    }
    #[test] fn rt_customer_stats() {
        roundtrip(&CustomerStats {
            total: 1000, active: 800,
            by_industry: vec![
                IndustryCount { industry: Some("制造".into()), count: 400 },
                IndustryCount { industry: Some("服务".into()), count: 300 },
                IndustryCount { industry: None, count: 100 },
            ],
        });
    }
    #[test] fn rt_contact_stats() {
        roundtrip(&ContactStats { total: 5000, active: 4200 });
    }
    #[test] fn rt_stage_count() {
        roundtrip(&StageCount { stage: "Negotiation".into(), count: 15 });
    }
    #[test] fn rt_opportunity_stats() {
        roundtrip(&OpportunityStats {
            total: 200,
            by_stage: vec![
                StageCount { stage: "Lead".into(), count: 80 },
                StageCount { stage: "Proposal".into(), count: 50 },
            ],
            total_value: Some(1_500_000),
        });
    }
    #[test] fn rt_opportunity_stats_no_value() {
        roundtrip(&OpportunityStats {
            total: 10, by_stage: vec![], total_value: None,
        });
    }
    #[test] fn rt_type_count() {
        roundtrip(&TypeCount { r#type: "meeting".into(), count: 30 });
    }
    #[test] fn rt_interaction_stats() {
        roundtrip(&InteractionStats {
            total: 300, scheduled: 50, completed: 250,
            by_type: vec![
                TypeCount { r#type: "call".into(), count: 100 },
                TypeCount { r#type: "meeting".into(), count: 150 },
                TypeCount { r#type: "email".into(), count: 50 },
            ],
        });
    }
    #[test] fn rt_dashboard_stats() {
        roundtrip(&DashboardStats {
            customers: CustomerStats { total: 100, active: 80, by_industry: vec![] },
            contacts: ContactStats { total: 500, active: 400 },
            opportunities: OpportunityStats { total: 50, by_stage: vec![], total_value: None },
            interactions: InteractionStats { total: 200, scheduled: 30, completed: 170, by_type: vec![] },
        });
    }
    #[test] fn rt_funnel_stage() {
        roundtrip(&FunnelStage {
            stage: "Proposal".into(), count: 20, total_value: Some(500_000.0),
        });
    }
    #[test] fn rt_funnel_stage_no_value() {
        roundtrip(&FunnelStage { stage: "Closed".into(), count: 5, total_value: None });
    }
    #[test] fn rt_sales_forecast() {
        roundtrip(&SalesForecast {
            months: 12, total_forecast: 12_000_000.0, last_month_actual: 900_000.0,
            monthly_forecast: vec![
                serde_json::json!({"month": "2025-01", "amount": 1_000_000}),
                serde_json::json!({"month": "2025-02", "amount": 1_100_000}),
            ],
        });
    }
}