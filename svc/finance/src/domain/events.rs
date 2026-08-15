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

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    #[test]
    fn rt_voucher_created_event() {
        roundtrip(&VoucherCreatedEvent {
            voucher_id: "v1".into(),
            voucher_no: "V-001".into(),
            voucher_type: "journal".into(),
            total_amount: 100.0,
            created_by: "alice".into(),
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_voucher_posted_event() {
        roundtrip(&VoucherPostedEvent {
            voucher_id: "v1".into(),
            voucher_no: "V-001".into(),
            posted_by: "bob".into(),
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_voucher_reversed_event() {
        roundtrip(&VoucherReversedEvent {
            voucher_id: "v1".into(),
            voucher_no: "V-001".into(),
            reversed_by: "charlie".into(),
            reason: "error".into(),
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_receivable_created_event() {
        roundtrip(&ReceivableCreatedEvent {
            receivable_id: "r1".into(),
            receivable_no: "AR-001".into(),
            customer_id: "c1".into(),
            amount: 5000.0,
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_receivable_settled_event() {
        roundtrip(&ReceivableSettledEvent {
            receivable_id: "r1".into(),
            collection_id: "col1".into(),
            settled_amount: 5000.0,
            remaining_amount: 0.0,
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_payable_created_event() {
        roundtrip(&PayableCreatedEvent {
            payable_id: "p1".into(),
            payable_no: "AP-001".into(),
            supplier_id: "s1".into(),
            amount: 3000.0,
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_payable_settled_event() {
        roundtrip(&PayableSettledEvent {
            payable_id: "p1".into(),
            payment_id: "pay1".into(),
            settled_amount: 1500.0,
            remaining_amount: 1500.0,
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_collection_received_event() {
        roundtrip(&CollectionReceivedEvent {
            collection_id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "c1".into(),
            amount: 5000.0,
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_payment_made_event() {
        roundtrip(&PaymentMadeEvent {
            payment_id: "pay1".into(),
            payment_no: "PAY-001".into(),
            supplier_id: "s1".into(),
            amount: 1500.0,
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_aging_calculated_event() {
        roundtrip(&AgingCalculatedEvent {
            entity_type: "receivable".into(),
            total_amount: 10000.0,
            buckets: vec![
                AgingBucket {
                    label: "0-30天".into(),
                    min_days: 0,
                    max_days: Some(30),
                    amount: 6000.0,
                },
                AgingBucket {
                    label: "31-90天".into(),
                    min_days: 31,
                    max_days: Some(90),
                    amount: 3000.0,
                },
                AgingBucket {
                    label: "90+天".into(),
                    min_days: 91,
                    max_days: None,
                    amount: 1000.0,
                },
            ],
            occurred_at: now(),
        });
    }
    #[test]
    fn rt_domain_event_voucher_created_variant() {
        roundtrip(&FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
            voucher_id: "v1".into(),
            voucher_no: "V-001".into(),
            voucher_type: "journal".into(),
            total_amount: 100.0,
            created_by: "alice".into(),
            occurred_at: now(),
        }));
    }
    #[test]
    fn rt_domain_event_aging_variant() {
        roundtrip(&FinanceDomainEvent::AgingCalculated(AgingCalculatedEvent {
            entity_type: "payable".into(),
            total_amount: 5000.0,
            buckets: vec![],
            occurred_at: now(),
        }));
    }
}
