use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SalesForecast {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub period_type: String,
    pub period: String,
    // B3: 预测/实际金额 f64 -> Decimal（DB 列 NUMERIC(15,2)），对齐 U6 billing 口径
    pub predicted_amount: Decimal,
    pub actual_amount: Option<Decimal>,
    // 比率（准确率/置信度，NUMERIC(6,3)）保留 f64，非币种金额
    pub accuracy: Option<f64>,
    pub trend: String,
    pub confidence_level: f64,
    pub factors: serde_json::Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSalesForecastRequest {
    pub period_type: String,
    pub period: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSalesForecastRequest {
    pub predicted_amount: Option<Decimal>,
    pub actual_amount: Option<Decimal>,
    pub accuracy: Option<f64>,
    pub trend: Option<String>,
    pub confidence_level: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ForecastFactor {
    pub name: String,
    pub impact: f64,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SalesForecastQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub period_type: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(value: &T) {
        let json = serde_json::to_value(value).expect("serialize to Value");
        let restored: T = serde_json::from_value(json.clone()).expect("deserialize from Value");
        let json2 = serde_json::to_value(&restored).expect("re-serialize");
        assert_eq!(json, json2);
    }

    #[test]
    fn sales_forecast_roundtrip_full() {
        let r = SalesForecast {
            id: uid(),
            tenant_id: uid(),
            period_type: "monthly".into(),
            period: "2024-01".into(),
            predicted_amount: Decimal::new(10000000, 2),
            actual_amount: Some(Decimal::new(9850000, 2)),
            accuracy: Some(0.985),
            trend: "stable".into(),
            confidence_level: 0.85,
            factors: serde_json::json!({"economy": 0.6, "seasonal": 0.4}),
            status: "completed".into(),
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&r);
    }

    #[test]
    fn sales_forecast_roundtrip_minimal() {
        let r = SalesForecast {
            id: uid(),
            tenant_id: uid(),
            period_type: "quarterly".into(),
            period: "2024-Q1".into(),
            predicted_amount: Decimal::new(50000000, 2),
            actual_amount: None,
            accuracy: None,
            trend: "up".into(),
            confidence_level: 0.7,
            factors: serde_json::Value::Object(serde_json::Map::new()),
            status: "draft".into(),
            created_at: now(),
            updated_at: now(),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_sales_forecast_request_roundtrip() {
        let r = CreateSalesForecastRequest {
            period_type: "yearly".into(),
            period: "2024".into(),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_sales_forecast_request_roundtrip_full() {
        let r = UpdateSalesForecastRequest {
            predicted_amount: Some(Decimal::new(12000000, 2)),
            actual_amount: Some(Decimal::new(11500000, 2)),
            accuracy: Some(0.958),
            trend: Some("up".into()),
            confidence_level: Some(0.9),
            status: Some("completed".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_sales_forecast_request_roundtrip_none() {
        let r = UpdateSalesForecastRequest {
            predicted_amount: None,
            actual_amount: None,
            accuracy: None,
            trend: None,
            confidence_level: None,
            status: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn forecast_factor_roundtrip_some_desc() {
        let r = ForecastFactor {
            name: "seasonal".into(),
            impact: 0.35,
            description: Some("Q4 旺季".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn forecast_factor_roundtrip_none_desc() {
        let r = ForecastFactor {
            name: "economy".into(),
            impact: 0.5,
            description: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn sales_forecast_query_params_deserialize() {
        let json = r#"{
            "page": 1,
            "page_size": 30,
            "period_type": "monthly",
            "status": "draft"
        }"#;
        let q: SalesForecastQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(30));
        assert_eq!(q.period_type.as_deref(), Some("monthly"));
        assert_eq!(q.status.as_deref(), Some("draft"));
    }

    /// B3 精度断言：预测/实际金额 Decimal 运算无 f64 累积误差。
    #[test]
    fn sales_forecast_amount_precision_exact() {
        let predicted = Decimal::new(10000, 2); // 100.00
        let actual = Decimal::new(9999, 2); // 99.99
        let deviation = (predicted - actual).abs();
        assert_eq!(deviation, Decimal::new(1, 2)); // 0.01 精确
    }

    /// B3 API 契约：响应侧金额序列化为 JSON 字符串（对齐 U6 billing 既有 Decimal 惯例），
    /// 请求侧仍兼容 JSON 数字与字符串。
    #[test]
    fn sales_forecast_amount_serde_contract() {
        let v = serde_json::to_value(Decimal::new(10000000, 2)).expect("serialize");
        assert_eq!(v, serde_json::json!("100000.00"));
        let from_num: Decimal = serde_json::from_str("100000.00").expect("from number");
        let from_str: Decimal = serde_json::from_str("\"100000.00\"").expect("from string");
        assert_eq!(from_num, Decimal::new(10000000, 2));
        assert_eq!(from_str, Decimal::new(10000000, 2));
        let req: UpdateSalesForecastRequest =
            serde_json::from_str(r#"{"predicted_amount":12345.67,"actual_amount":12000}"#)
                .expect("deserialize numeric amounts");
        assert_eq!(req.predicted_amount, Some(Decimal::new(1234567, 2)));
        assert_eq!(req.actual_amount, Some(Decimal::new(1200000, 2)));
    }
}
