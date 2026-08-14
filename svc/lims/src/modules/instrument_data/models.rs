use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct InstrumentDataQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub instrument_id: Option<String>,
    pub protocol: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InstrumentData {
    pub id: String,
    pub tenant_id: String,
    pub data_no: String,
    pub instrument_id: Option<String>,
    pub instrument_no: Option<String>,
    pub instrument_name: Option<String>,
    pub batch_no: String,
    pub protocol: String,
    pub raw_data: Option<serde_json::Value>,
    pub parsed_data: Option<serde_json::Value>,
    pub status: String,
    pub quality_score: Option<f64>,
    pub error_msg: Option<String>,
    pub collected_at: Option<String>,
    pub parsed_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInstrumentDataRequest {
    pub instrument_id: Option<String>,
    pub protocol: String,
    pub raw_data: serde_json::Value,
    pub batch_no: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInstrumentDataRequest {
    pub status: Option<String>,
    pub parsed_data: Option<serde_json::Value>,
    pub error_msg: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ParseDataRequest {
    pub protocol: String,
    pub raw_data: serde_json::Value,
    pub parse_rule_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ParseResult {
    pub success: bool,
    pub parsed_data: Option<serde_json::Value>,
    pub quality_score: Option<f64>,
    pub error_msg: Option<String>,
    pub test_items: Option<Vec<TestItemResult>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestItemResult {
    pub test_item: String,
    pub test_item_name: Option<String>,
    pub result: Option<String>,
    pub numeric_result: Option<f64>,
    pub unit: Option<String>,
    pub reference_range: Option<String>,
    pub status: Option<String>,
    pub abnormal_flag: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CollectionTaskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub instrument_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CollectionTask {
    pub id: String,
    pub tenant_id: String,
    pub task_no: String,
    pub task_name: String,
    pub instrument_id: Option<String>,
    pub instrument_no: Option<String>,
    pub instrument_name: Option<String>,
    pub protocol: String,
    pub collection_mode: String,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub parse_rule_id: Option<String>,
    pub status: String,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub total_collections: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCollectionTaskRequest {
    pub task_name: String,
    pub instrument_id: Option<String>,
    pub protocol: String,
    pub collection_mode: String,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub parse_rule_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCollectionTaskRequest {
    pub task_name: Option<String>,
    pub status: Option<String>,
    pub cron_expression: Option<String>,
    pub interval_minutes: Option<i32>,
    pub parse_rule_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ParseRuleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub protocol: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ParseRule {
    pub id: String,
    pub tenant_id: String,
    pub rule_no: String,
    pub rule_name: String,
    pub protocol: String,
    pub instrument_type: Option<String>,
    pub parse_config: Option<serde_json::Value>,
    pub quality_rules: Option<serde_json::Value>,
    pub status: String,
    pub version: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateParseRuleRequest {
    pub rule_name: String,
    pub protocol: String,
    pub instrument_type: Option<String>,
    pub parse_config: Option<serde_json::Value>,
    pub quality_rules: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateParseRuleRequest {
    pub rule_name: Option<String>,
    pub status: Option<String>,
    pub parse_config: Option<serde_json::Value>,
    pub quality_rules: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InstrumentDataStatistics {
    pub total_data_count: i64,
    pub today_count: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub pending_count: i64,
    pub total_tasks: i64,
    pub running_tasks: i64,
    pub total_rules: i64,
    pub protocol_distribution: Option<Vec<ProtocolStat>>,
    pub instrument_distribution: Option<Vec<InstrumentStat>>,
}

#[derive(Debug, Serialize)]
pub struct ProtocolStat {
    pub protocol: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct InstrumentStat {
    pub instrument_id: String,
    pub instrument_name: String,
    pub count: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T>(value: &T)
    where
        T: Serialize + for<'de> Deserialize<'de>,
    {
        let s1 = serde_json::to_string(value).expect("serialize to string");
        let v1: serde_json::Value = serde_json::from_str(&s1).expect("string -> Value");
        let s2 = serde_json::to_string(&v1).expect("Value -> string");
        let v2: serde_json::Value = serde_json::from_str(&s2).expect("roundtrip string -> Value");
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_test_item_result_roundtrip() {
        let r = TestItemResult {
            test_item: "铅".to_string(),
            test_item_name: Some("铅(Pb)".to_string()),
            result: Some("0.15".to_string()),
            numeric_result: Some(0.15),
            unit: Some("mg/kg".to_string()),
            reference_range: Some("≤0.2".to_string()),
            status: Some("pass".to_string()),
            abnormal_flag: None,
        };
        roundtrip(&r);

        let empty = TestItemResult {
            test_item: "汞".to_string(),
            test_item_name: None,
            result: None,
            numeric_result: None,
            unit: None,
            reference_range: None,
            status: None,
            abnormal_flag: None,
        };
        roundtrip(&empty);
    }
}
