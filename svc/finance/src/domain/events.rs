use serde::{Deserialize, Serialize};

use super::value_objects::AgingBucket;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event_type")]
pub enum FinanceDomainEvent {
    VoucherCreated(VoucherCreatedEvent),
    VoucherPosted(VoucherPostedEvent),
    VoucherReversed(VoucherReversedEvent),
    ReceivableCreated(ReceivableCreatedEvent),
    ReceivableSettled(ReceivableSettledEvent),
    PayableCreated(PayableCreatedEvent),
    PayableSettled(PayableSettledEvent),
    CollectionReceived(CollectionReceivedEvent),
    PaymentMade(PaymentMadeEvent),
    AgingCalculated(AgingCalculatedEvent),
}

// 为每个事件定义结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherCreatedEvent {
    pub voucher_id: String,
    pub voucher_no: String,
    pub voucher_type: String,
    pub total_amount: f64,
    pub created_by: String,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherPostedEvent {
    pub voucher_id: String,
    pub voucher_no: String,
    pub posted_by: String,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherReversedEvent {
    pub voucher_id: String,
    pub voucher_no: String,
    pub reversed_by: String,
    pub reason: String,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceivableCreatedEvent {
    pub receivable_id: String,
    pub receivable_no: String,
    pub customer_id: String,
    pub amount: f64,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceivableSettledEvent {
    pub receivable_id: String,
    pub collection_id: String,
    pub settled_amount: f64,
    pub remaining_amount: f64,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayableCreatedEvent {
    pub payable_id: String,
    pub payable_no: String,
    pub supplier_id: String,
    pub amount: f64,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayableSettledEvent {
    pub payable_id: String,
    pub payment_id: String,
    pub settled_amount: f64,
    pub remaining_amount: f64,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionReceivedEvent {
    pub collection_id: String,
    pub collection_no: String,
    pub customer_id: String,
    pub amount: f64,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMadeEvent {
    pub payment_id: String,
    pub payment_no: String,
    pub supplier_id: String,
    pub amount: f64,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgingCalculatedEvent {
    pub entity_type: String, // receivable / payable
    pub total_amount: f64,
    pub buckets: Vec<AgingBucket>,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}
