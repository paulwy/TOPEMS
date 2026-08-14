use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::events::FinanceDomainEvent;
use super::value_objects::AgingBucket;

#[async_trait]
pub trait MaterializedView: Send + Sync {
    fn view_name(&self) -> &str;
    async fn handle_event(&self, event: &FinanceDomainEvent) -> Result<(), String>;
    async fn rebuild(&self) -> Result<(), String>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherSummaryView {
    pub id: String,
    pub voucher_no: String,
    pub voucher_date: chrono::NaiveDate,
    pub voucher_type: String,
    pub status: String,
    pub summary: String,
    pub total_amount: f64,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub posted_at: Option<chrono::DateTime<chrono::Utc>>,
}

pub struct VoucherSummaryMaterializedView {
    data: std::sync::Mutex<HashMap<String, VoucherSummaryView>>,
}

impl VoucherSummaryMaterializedView {
    pub fn new() -> Self {
        Self {
            data: std::sync::Mutex::new(HashMap::new()),
        }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        status: Option<String>,
    ) -> Result<(Vec<VoucherSummaryView>, i64), String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;

        let mut items: Vec<VoucherSummaryView> = data
            .values()
            .filter(|v| status.as_deref().map_or(true, |s| v.status == s))
            .cloned()
            .collect();

        items.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        let total = items.len() as i64;
        let start = ((page - 1) * page_size).max(0) as usize;
        let end = (start + page_size as usize).min(items.len());
        let page_items = items[start..end].to_vec();

        Ok((page_items, total))
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<VoucherSummaryView>, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        Ok(data.get(id).cloned())
    }

    pub async fn get_by_no(&self, no: &str) -> Result<Option<VoucherSummaryView>, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        Ok(data.values().find(|v| v.voucher_no == no).cloned())
    }
}

impl Default for VoucherSummaryMaterializedView {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl MaterializedView for VoucherSummaryMaterializedView {
    fn view_name(&self) -> &str {
        "voucher_summary"
    }

    async fn handle_event(&self, event: &FinanceDomainEvent) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;

        match event {
            FinanceDomainEvent::VoucherCreated(e) => {
                let view = VoucherSummaryView {
                    id: e.voucher_id.clone(),
                    voucher_no: e.voucher_no.clone(),
                    voucher_date: e.occurred_at.date_naive(),
                    voucher_type: e.voucher_type.clone(),
                    status: "Draft".to_string(),
                    summary: String::new(),
                    total_amount: e.total_amount,
                    created_by: e.created_by.clone(),
                    created_at: e.occurred_at,
                    posted_at: None,
                };
                data.insert(e.voucher_id.clone(), view);
            }
            FinanceDomainEvent::VoucherPosted(e) => {
                if let Some(view) = data.get_mut(&e.voucher_id) {
                    view.status = "Posted".to_string();
                    view.posted_at = Some(e.occurred_at);
                }
            }
            FinanceDomainEvent::VoucherReversed(e) => {
                if let Some(view) = data.get_mut(&e.voucher_id) {
                    view.status = "Reversed".to_string();
                }
            }
            _ => {}
        }

        Ok(())
    }

    async fn rebuild(&self) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        data.clear();
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceivableAgingView {
    pub id: String,
    pub receivable_no: String,
    pub customer_id: String,
    pub customer_name: String,
    pub total_amount: f64,
    pub settled_amount: f64,
    pub remaining_amount: f64,
    pub status: String,
    pub due_date: chrono::NaiveDate,
    pub days_overdue: i64,
    pub aging_bucket: String,
    pub buckets: Vec<AgingBucket>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub struct ReceivableAgingMaterializedView {
    data: std::sync::Mutex<HashMap<String, ReceivableAgingView>>,
}

impl ReceivableAgingMaterializedView {
    pub fn new() -> Self {
        Self {
            data: std::sync::Mutex::new(HashMap::new()),
        }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        status: Option<String>,
    ) -> Result<(Vec<ReceivableAgingView>, i64), String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;

        let mut items: Vec<ReceivableAgingView> = data
            .values()
            .filter(|v| status.as_deref().map_or(true, |s| v.status == s))
            .cloned()
            .collect();

        items.sort_by(|a, b| b.days_overdue.cmp(&a.days_overdue));

        let total = items.len() as i64;
        let start = ((page - 1) * page_size).max(0) as usize;
        let end = (start + page_size as usize).min(items.len());
        let page_items = items[start..end].to_vec();

        Ok((page_items, total))
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<ReceivableAgingView>, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        Ok(data.get(id).cloned())
    }

    pub async fn total_by_bucket(&self) -> Result<Vec<AgingBucket>, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        let mut bucket_map: HashMap<String, f64> = HashMap::new();

        for view in data.values() {
            *bucket_map.entry(view.aging_bucket.clone()).or_insert(0.0) += view.remaining_amount;
        }

        let labels = ["0-30天", "31-60天", "61-90天", "91-180天", "180天以上"];
        let mut result = Vec::new();

        for (i, label) in labels.iter().enumerate() {
            let min_days = match i {
                0 => 0,
                1 => 31,
                2 => 61,
                3 => 91,
                _ => 181,
            };
            let max_days = match i {
                0 => Some(30),
                1 => Some(60),
                2 => Some(90),
                3 => Some(180),
                _ => None,
            };
            result.push(AgingBucket {
                label: label.to_string(),
                min_days,
                max_days,
                amount: bucket_map.get(*label).copied().unwrap_or(0.0),
            });
        }

        Ok(result)
    }
}

impl Default for ReceivableAgingMaterializedView {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl MaterializedView for ReceivableAgingMaterializedView {
    fn view_name(&self) -> &str {
        "receivable_aging"
    }

    async fn handle_event(&self, event: &FinanceDomainEvent) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;

        match event {
            FinanceDomainEvent::ReceivableCreated(e) => {
                let today = chrono::Utc::now().date_naive();
                let due_date = today;
                let days_overdue = (today - due_date).num_days();
                let aging_bucket = classify_aging_bucket(days_overdue);

                let view = ReceivableAgingView {
                    id: e.receivable_id.clone(),
                    receivable_no: e.receivable_no.clone(),
                    customer_id: e.customer_id.clone(),
                    customer_name: String::new(),
                    total_amount: e.amount,
                    settled_amount: 0.0,
                    remaining_amount: e.amount,
                    status: "Unsettled".to_string(),
                    due_date,
                    days_overdue,
                    aging_bucket,
                    buckets: Vec::new(),
                    updated_at: e.occurred_at,
                };
                data.insert(e.receivable_id.clone(), view);
            }
            FinanceDomainEvent::ReceivableSettled(e) => {
                if let Some(view) = data.get_mut(&e.receivable_id) {
                    view.settled_amount += e.settled_amount;
                    view.remaining_amount = e.remaining_amount;
                    view.status = if e.remaining_amount <= 0.01 {
                        "Settled".to_string()
                    } else {
                        "PartiallySettled".to_string()
                    };
                    view.updated_at = e.occurred_at;
                }
            }
            FinanceDomainEvent::AgingCalculated(e) => {
                if e.entity_type == "receivable" {
                    for view in data.values_mut() {
                        view.buckets = e.buckets.clone();
                        view.updated_at = e.occurred_at;
                    }
                }
            }
            _ => {}
        }

        Ok(())
    }

    async fn rebuild(&self) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        data.clear();
        Ok(())
    }
}

fn classify_aging_bucket(days: i64) -> String {
    match days {
        d if d <= 0 => "0-30天".to_string(),
        d if d <= 30 => "0-30天".to_string(),
        d if d <= 60 => "31-60天".to_string(),
        d if d <= 90 => "61-90天".to_string(),
        d if d <= 180 => "91-180天".to_string(),
        _ => "180天以上".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::value_objects::AgingBucket;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn now() -> chrono::DateTime<chrono::Utc> { chrono::Utc::now() }

    fn today() -> chrono::NaiveDate { chrono::Utc::now().date_naive() }

    fn uid() -> String { uuid::Uuid::new_v4().to_string() }

    #[test]
    fn rt_voucher_summary_view_posted_at_none() {
        roundtrip(&VoucherSummaryView {
            id: uid(),
            voucher_no: "V-001".into(),
            voucher_date: today(),
            voucher_type: "journal".into(),
            status: "Draft".into(),
            summary: "draft summary".into(),
            total_amount: 1234.56,
            created_by: "alice".into(),
            created_at: now(),
            posted_at: None,
        });
    }

    #[test]
    fn rt_voucher_summary_view_posted_at_some() {
        roundtrip(&VoucherSummaryView {
            id: uid(),
            voucher_no: "V-002".into(),
            voucher_date: today(),
            voucher_type: "adjustment".into(),
            status: "Posted".into(),
            summary: "adjustment summary".into(),
            total_amount: 999.99,
            created_by: "bob".into(),
            created_at: now(),
            posted_at: Some(now()),
        });
    }

    #[test]
    fn rt_receivable_aging_view_empty_buckets() {
        roundtrip(&ReceivableAgingView {
            id: uid(),
            receivable_no: "AR-001".into(),
            customer_id: "cust-1".into(),
            customer_name: "Foo Corp".into(),
            total_amount: 5000.0,
            settled_amount: 0.0,
            remaining_amount: 5000.0,
            status: "Unsettled".into(),
            due_date: today(),
            days_overdue: 0,
            aging_bucket: "0-30天".into(),
            buckets: vec![],
            updated_at: now(),
        });
    }

    #[test]
    fn rt_receivable_aging_view_with_buckets() {
        roundtrip(&ReceivableAgingView {
            id: uid(),
            receivable_no: "AR-002".into(),
            customer_id: "cust-2".into(),
            customer_name: "Bar Ltd".into(),
            total_amount: 10000.0,
            settled_amount: 6000.0,
            remaining_amount: 4000.0,
            status: "PartiallySettled".into(),
            due_date: today(),
            days_overdue: 15,
            aging_bucket: "0-30天".into(),
            buckets: vec![
                AgingBucket { label: "0-30天".into(), min_days: 0, max_days: Some(30), amount: 4000.0 },
                AgingBucket { label: "31-60天".into(), min_days: 31, max_days: Some(60), amount: 0.0 },
            ],
            updated_at: now(),
        });
    }
}
