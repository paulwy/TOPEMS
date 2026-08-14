use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 库存预警类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertType {
    BelowMin,      // 低于最低库存
    AboveMax,      // 高于最高库存
    ReorderNeeded, // 需要补货
    ExpiryWarning, // 临期预警
    OutOfStock,    // 缺货
}

impl std::fmt::Display for AlertType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertType::BelowMin => write!(f, "below_min"),
            AlertType::AboveMax => write!(f, "above_max"),
            AlertType::ReorderNeeded => write!(f, "reorder_needed"),
            AlertType::ExpiryWarning => write!(f, "expiry_warning"),
            AlertType::OutOfStock => write!(f, "out_of_stock"),
        }
    }
}

/// 库存预警记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InventoryAlert {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub inventory_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub alert_type: String,
    pub current_quantity: f64,
    pub threshold_value: Option<f64>,
    pub deviation_quantity: Option<f64>,
    pub severity: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 库存预警汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertSummary {
    pub total_alerts: i64,
    pub critical_count: i64,
    pub warning_count: i64,
    pub info_count: i64,
    pub below_min_count: i64,
    pub above_max_count: i64,
    pub reorder_count: i64,
    pub expiry_count: i64,
    pub out_of_stock_count: i64,
}

/// 库存预警查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct AlertQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

/// 库存预警统计数据（用于仪表盘）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertStatistics {
    pub summary: AlertSummary,
    pub alerts_by_warehouse: Vec<WarehouseAlertCount>,
    pub alerts_by_material: Vec<MaterialAlertCount>,
}

/// 按仓库统计预警数量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WarehouseAlertCount {
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub alert_count: i64,
}

/// 按物料统计预警数量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialAlertCount {
    pub material_code: String,
    pub material_name: String,
    pub alert_count: i64,
}

/// 创建预警请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateAlertRequest {
    pub inventory_id: Uuid,
    pub alert_type: String,
    pub threshold_value: Option<f64>,
    pub remarks: Option<String>,
}

/// 更新预警状态请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateAlertStatusRequest {
    pub status: String,
    pub remarks: Option<String>,
}

/// 循环盘点配置
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct CycleCountConfig {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub material_category: Option<String>,
    pub count_frequency: String,
    pub priority_level: String,
    pub last_count_date: Option<DateTime<Utc>>,
    pub next_count_date: DateTime<Utc>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建循环盘点配置请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateCycleCountConfigRequest {
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub material_category: Option<String>,
    pub count_frequency: String,
    pub priority_level: String,
}

/// 盘点差异处理记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DiscrepancyRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub stock_take_id: Uuid,
    pub stock_take_item_id: Uuid,
    pub inventory_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub system_quantity: f64,
    pub counted_quantity: f64,
    pub discrepancy_quantity: f64,
    pub discrepancy_type: String,
    pub adjustment_quantity: Option<f64>,
    pub adjustment_status: String,
    pub approved_by: Option<String>,
    pub approval_date: Option<DateTime<Utc>>,
    pub adjustment_date: Option<DateTime<Utc>>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建差异处理请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDiscrepancyRequest {
    pub stock_take_item_id: Uuid,
    pub adjustment_quantity: f64,
    pub reason: String,
    pub notes: Option<String>,
}

/// 审批差异处理请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApproveDiscrepancyRequest {
    pub action: String, // approve, reject
    pub notes: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn alert_type_display_below_min() {
        assert_eq!(AlertType::BelowMin.to_string(), "below_min");
    }

    #[test]
    fn alert_type_display_above_max() {
        assert_eq!(AlertType::AboveMax.to_string(), "above_max");
    }

    #[test]
    fn alert_type_display_reorder_needed() {
        assert_eq!(AlertType::ReorderNeeded.to_string(), "reorder_needed");
    }

    #[test]
    fn alert_type_display_expiry_warning() {
        assert_eq!(AlertType::ExpiryWarning.to_string(), "expiry_warning");
    }

    #[test]
    fn alert_type_display_out_of_stock() {
        assert_eq!(AlertType::OutOfStock.to_string(), "out_of_stock");
    }

    #[test]
    fn alert_type_equality() {
        assert_eq!(AlertType::BelowMin, AlertType::BelowMin);
        assert_ne!(AlertType::BelowMin, AlertType::AboveMax);
        assert_eq!(AlertType::OutOfStock, AlertType::OutOfStock);
        assert_ne!(AlertType::ReorderNeeded, AlertType::ExpiryWarning);
    }

    #[test]
    fn alert_type_clone_preserves_value() {
        let a = AlertType::BelowMin;
        let b = a.clone();
        assert_eq!(a, b);
    }

    fn sample_alert() -> InventoryAlert {
        InventoryAlert {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            inventory_id: Uuid::new_v4(),
            material_code: "SKU-AL".into(),
            material_name: "Alert Item".into(),
            warehouse_id: Some(Uuid::new_v4()),
            warehouse_name: Some("WH-1".into()),
            location_id: Some(Uuid::new_v4()),
            location_code: Some("A-01".into()),
            alert_type: "below_min".into(),
            current_quantity: 5.0,
            threshold_value: Some(10.0),
            deviation_quantity: Some(-5.0),
            severity: "critical".into(),
            status: "open".into(),
            remarks: Some("urgent".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn inventory_alert_serde_roundtrip() {
        let a = sample_alert();
        let v = serde_json::to_value(&a).unwrap();
        let back: InventoryAlert = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inventory_alert_serde_none_fields() {
        let a = InventoryAlert {
            warehouse_id: None,
            warehouse_name: None,
            location_id: None,
            location_code: None,
            threshold_value: None,
            deviation_quantity: None,
            remarks: None,
            ..sample_alert()
        };
        let v = serde_json::to_value(&a).unwrap();
        let back: InventoryAlert = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.threshold_value.is_none());
    }

    #[test]
    fn alert_summary_serde_roundtrip() {
        let s = AlertSummary {
            total_alerts: 100,
            critical_count: 10,
            warning_count: 50,
            info_count: 40,
            below_min_count: 30,
            above_max_count: 5,
            reorder_count: 20,
            expiry_count: 15,
            out_of_stock_count: 30,
        };
        let v = serde_json::to_value(&s).unwrap();
        let back: AlertSummary = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn alert_statistics_serde_roundtrip() {
        let stats = AlertStatistics {
            summary: AlertSummary {
                total_alerts: 50,
                critical_count: 5,
                warning_count: 30,
                info_count: 15,
                below_min_count: 20,
                above_max_count: 3,
                reorder_count: 10,
                expiry_count: 7,
                out_of_stock_count: 10,
            },
            alerts_by_warehouse: vec![WarehouseAlertCount {
                warehouse_id: Some(Uuid::new_v4()),
                warehouse_name: Some("WH-1".into()),
                alert_count: 25,
            }],
            alerts_by_material: vec![MaterialAlertCount {
                material_code: "SKU-1".into(),
                material_name: "Mat 1".into(),
                alert_count: 10,
            }],
        };
        let v = serde_json::to_value(&stats).unwrap();
        let back: AlertStatistics = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_alert_request_serde_roundtrip() {
        let req = CreateAlertRequest {
            inventory_id: Uuid::new_v4(),
            alert_type: "out_of_stock".into(),
            threshold_value: Some(0.0),
            remarks: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateAlertRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_alert_status_request_serde_roundtrip() {
        let req = UpdateAlertStatusRequest {
            status: "resolved".into(),
            remarks: Some("fixed".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateAlertStatusRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_discrepancy_request_serde_roundtrip() {
        let req = CreateDiscrepancyRequest {
            stock_take_item_id: Uuid::new_v4(),
            adjustment_quantity: -5.0,
            reason: "damaged".into(),
            notes: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateDiscrepancyRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn approve_discrepancy_request_serde_roundtrip() {
        let req = ApproveDiscrepancyRequest {
            action: "approve".into(),
            notes: Some("ok".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: ApproveDiscrepancyRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }
}
