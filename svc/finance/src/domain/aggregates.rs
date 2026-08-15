use serde::{Deserialize, Serialize};

use super::entities::*;
use super::value_objects::*;

// 凭证聚合根
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherAggregate {
    pub id: String,
    pub voucher_no: String,
    pub voucher_date: chrono::NaiveDate,
    pub voucher_type: String,
    pub status: VoucherStatus,
    pub summary: String,
    pub attachment_count: i32,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub posted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub lines: Vec<VoucherLine>, // 聚合内实体
    pub total_debit: f64,
    pub total_credit: f64,
}

impl VoucherAggregate {
    // 聚合根行为方法
    pub fn post(&mut self) -> Result<(), String> {
        if self.status != VoucherStatus::Approved {
            return Err("Only approved vouchers can be posted".to_string());
        }
        // 借贷平衡校验
        if (self.total_debit - self.total_credit).abs() > 0.01 {
            return Err("Debit and credit must be balanced".to_string());
        }
        self.status = VoucherStatus::Posted;
        self.posted_at = Some(chrono::Utc::now());
        Ok(())
    }

    pub fn reverse(&mut self) -> Result<(), String> {
        if self.status != VoucherStatus::Posted {
            return Err("Only posted vouchers can be reversed".to_string());
        }
        self.status = VoucherStatus::Reversed;
        Ok(())
    }

    pub fn add_line(&mut self, mut line: VoucherLine) {
        line.voucher_id = self.id.clone();
        if let Some(debit) = line.debit_amount {
            self.total_debit += debit;
        }
        if let Some(credit) = line.credit_amount {
            self.total_credit += credit;
        }
        self.lines.push(line);
    }

    pub fn is_balanced(&self) -> bool {
        (self.total_debit - self.total_credit).abs() < 0.01
    }
}

// 应收账款聚合根
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceivableAggregate {
    pub receivable: Receivable,
    pub collections: Vec<CollectionRecord>, // 关联的收款记录
    pub aging_buckets: Vec<AgingBucket>,
}

impl ReceivableAggregate {
    pub fn settle(&mut self, collection: CollectionRecord) -> Result<(), String> {
        if collection.customer_id != self.receivable.customer_id {
            return Err("Customer mismatch".to_string());
        }
        self.receivable.settled_amount += collection.amount;
        self.receivable.status = if self.receivable.settled_amount >= self.receivable.amount {
            SettlementStatus::Settled
        } else {
            SettlementStatus::PartiallySettled
        };
        self.collections.push(collection);
        Ok(())
    }

    pub fn remaining_amount(&self) -> f64 {
        self.receivable.amount - self.receivable.settled_amount
    }
}

// 应付账款聚合根
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayableAggregate {
    pub payable: Payable,
    pub payments: Vec<PaymentRecord>,
    pub aging_buckets: Vec<AgingBucket>,
}

impl PayableAggregate {
    pub fn settle(&mut self, payment: PaymentRecord) -> Result<(), String> {
        if payment.supplier_id != self.payable.supplier_id {
            return Err("Supplier mismatch".to_string());
        }
        self.payable.settled_amount += payment.amount;
        self.payable.status = if self.payable.settled_amount >= self.payable.amount {
            SettlementStatus::Settled
        } else {
            SettlementStatus::PartiallySettled
        };
        self.payments.push(payment);
        Ok(())
    }

    pub fn remaining_amount(&self) -> f64 {
        self.payable.amount - self.payable.settled_amount
    }
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
    fn ymd(y: i32, m: u32, d: u32) -> chrono::NaiveDate {
        chrono::NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn make_voucher_line(voucher_id: &str, debit: Option<f64>, credit: Option<f64>) -> VoucherLine {
        VoucherLine {
            id: format!("{}-line1", voucher_id),
            voucher_id: voucher_id.to_string(),
            account_code: "1001".into(),
            account_name: "现金".into(),
            summary: "测试".into(),
            debit_amount: debit,
            credit_amount: credit,
            auxiliary_items: serde_json::json!({}),
        }
    }

    fn make_voucher_aggregate(
        status: VoucherStatus,
        debit: f64,
        credit: f64,
        lines: Vec<VoucherLine>,
    ) -> VoucherAggregate {
        VoucherAggregate {
            id: "v1".into(),
            voucher_no: "V-001".into(),
            voucher_date: ymd(2025, 6, 1),
            voucher_type: "journal".into(),
            status,
            summary: "测试凭证".into(),
            attachment_count: 0,
            created_by: "alice".into(),
            created_at: now(),
            posted_at: None,
            lines,
            total_debit: debit,
            total_credit: credit,
        }
    }

    fn make_receivable() -> Receivable {
        Receivable {
            id: "r1".into(),
            receivable_no: "AR-001".into(),
            customer_id: "c1".into(),
            customer_name: "ABC".into(),
            amount: 5000.0,
            settled_amount: 0.0,
            status: SettlementStatus::Unsettled,
            billing_date: ymd(2025, 6, 1),
            due_date: ymd(2025, 6, 30),
            created_at: now(),
        }
    }

    fn make_payable() -> Payable {
        Payable {
            id: "p1".into(),
            payable_no: "AP-001".into(),
            supplier_id: "s1".into(),
            supplier_name: "XYZ".into(),
            amount: 3000.0,
            settled_amount: 0.0,
            status: SettlementStatus::Unsettled,
            billing_date: ymd(2025, 5, 15),
            due_date: ymd(2025, 7, 15),
            created_at: now(),
        }
    }

    // ===== roundtrip =====

    #[test]
    fn rt_voucher_aggregate() {
        roundtrip(&make_voucher_aggregate(
            VoucherStatus::Draft,
            100.0,
            100.0,
            vec![],
        ));
    }
    #[test]
    fn rt_voucher_aggregate_with_lines() {
        roundtrip(&make_voucher_aggregate(
            VoucherStatus::Approved,
            500.0,
            500.0,
            vec![
                make_voucher_line("v1", Some(500.0), None),
                make_voucher_line("v1", None, Some(500.0)),
            ],
        ));
    }
    #[test]
    fn rt_receivable_aggregate() {
        roundtrip(&ReceivableAggregate {
            receivable: make_receivable(),
            collections: vec![],
            aging_buckets: vec![],
        });
    }
    #[test]
    fn rt_payable_aggregate() {
        roundtrip(&PayableAggregate {
            payable: make_payable(),
            payments: vec![],
            aging_buckets: vec![],
        });
    }

    // ===== VoucherAggregate business logic =====

    #[test]
    fn test_voucher_post_ok() {
        let mut v = make_voucher_aggregate(VoucherStatus::Approved, 500.0, 500.0, vec![]);
        assert!(v.is_balanced());
        assert_eq!(v.post(), Ok(()));
        assert_eq!(v.status, VoucherStatus::Posted);
        assert!(v.posted_at.is_some());
    }

    #[test]
    fn test_voucher_post_not_approved() {
        let mut v = make_voucher_aggregate(VoucherStatus::Draft, 500.0, 500.0, vec![]);
        assert!(v.post().is_err());
    }

    #[test]
    fn test_voucher_post_unbalanced() {
        let mut v = make_voucher_aggregate(VoucherStatus::Approved, 500.0, 400.0, vec![]);
        assert!(!v.is_balanced());
        assert!(v.post().is_err());
    }

    #[test]
    fn test_voucher_reverse_ok() {
        let mut v = make_voucher_aggregate(VoucherStatus::Posted, 500.0, 500.0, vec![]);
        assert_eq!(v.reverse(), Ok(()));
        assert_eq!(v.status, VoucherStatus::Reversed);
    }

    #[test]
    fn test_voucher_reverse_not_posted() {
        let mut v = make_voucher_aggregate(VoucherStatus::Draft, 500.0, 500.0, vec![]);
        assert!(v.reverse().is_err());
    }

    #[test]
    fn test_voucher_add_line_updates_totals() {
        let mut v = make_voucher_aggregate(VoucherStatus::Draft, 0.0, 0.0, vec![]);
        v.add_line(make_voucher_line("v1", Some(300.0), None));
        v.add_line(make_voucher_line("v1", None, Some(300.0)));
        assert_eq!(v.total_debit, 300.0);
        assert_eq!(v.total_credit, 300.0);
        assert!(v.is_balanced());
        assert_eq!(v.lines.len(), 2);
        assert_eq!(v.lines[0].voucher_id, "v1");
    }

    // ===== ReceivableAggregate =====

    #[test]
    fn test_receivable_settle_full() {
        let mut a = ReceivableAggregate {
            receivable: make_receivable(),
            collections: vec![],
            aging_buckets: vec![],
        };
        let collection = CollectionRecord {
            id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "c1".into(),
            amount: 5000.0,
            collection_date: ymd(2025, 6, 15),
            payment_method: "bank".into(),
            bank_account: None,
            status: SettlementStatus::Settled,
        };
        assert_eq!(a.settle(collection), Ok(()));
        assert_eq!(a.receivable.settled_amount, 5000.0);
        assert_eq!(a.receivable.status, SettlementStatus::Settled);
        assert_eq!(a.remaining_amount(), 0.0);
        assert_eq!(a.collections.len(), 1);
    }

    #[test]
    fn test_receivable_settle_partial() {
        let mut a = ReceivableAggregate {
            receivable: make_receivable(),
            collections: vec![],
            aging_buckets: vec![],
        };
        let collection = CollectionRecord {
            id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "c1".into(),
            amount: 2000.0,
            collection_date: ymd(2025, 6, 15),
            payment_method: "bank".into(),
            bank_account: None,
            status: SettlementStatus::PartiallySettled,
        };
        a.settle(collection).unwrap();
        assert_eq!(a.receivable.status, SettlementStatus::PartiallySettled);
        assert_eq!(a.remaining_amount(), 3000.0);
    }

    #[test]
    fn test_receivable_settle_wrong_customer() {
        let mut a = ReceivableAggregate {
            receivable: make_receivable(),
            collections: vec![],
            aging_buckets: vec![],
        };
        let bad = CollectionRecord {
            id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "WRONG".into(),
            amount: 5000.0,
            collection_date: ymd(2025, 6, 15),
            payment_method: "bank".into(),
            bank_account: None,
            status: SettlementStatus::Unsettled,
        };
        assert!(a.settle(bad).is_err());
    }

    // ===== PayableAggregate =====

    #[test]
    fn test_payable_settle_full() {
        let mut a = PayableAggregate {
            payable: make_payable(),
            payments: vec![],
            aging_buckets: vec![],
        };
        let payment = PaymentRecord {
            id: "pay1".into(),
            payment_no: "PAY-001".into(),
            supplier_id: "s1".into(),
            amount: 3000.0,
            payment_date: ymd(2025, 6, 20),
            payment_method: "check".into(),
            bank_account: None,
            status: SettlementStatus::Settled,
        };
        a.settle(payment).unwrap();
        assert_eq!(a.payable.status, SettlementStatus::Settled);
        assert_eq!(a.remaining_amount(), 0.0);
    }

    #[test]
    fn test_payable_settle_wrong_supplier() {
        let mut a = PayableAggregate {
            payable: make_payable(),
            payments: vec![],
            aging_buckets: vec![],
        };
        let bad = PaymentRecord {
            id: "pay1".into(),
            payment_no: "PAY-001".into(),
            supplier_id: "WRONG".into(),
            amount: 3000.0,
            payment_date: ymd(2025, 6, 20),
            payment_method: "check".into(),
            bank_account: None,
            status: SettlementStatus::Unsettled,
        };
        assert!(a.settle(bad).is_err());
    }

    #[test]
    fn test_payable_settle_partial() {
        let mut a = PayableAggregate {
            payable: make_payable(),
            payments: vec![],
            aging_buckets: vec![],
        };
        let payment = PaymentRecord {
            id: "pay1".into(),
            payment_no: "PAY-001".into(),
            supplier_id: "s1".into(),
            amount: 1000.0,
            payment_date: ymd(2025, 6, 20),
            payment_method: "check".into(),
            bank_account: None,
            status: SettlementStatus::PartiallySettled,
        };
        a.settle(payment).unwrap();
        assert_eq!(a.payable.status, SettlementStatus::PartiallySettled);
        assert_eq!(a.remaining_amount(), 2000.0);
        assert_eq!(a.payments.len(), 1);
    }

    #[test]
    fn test_voucher_post_submitted_rejected() {
        let mut v = make_voucher_aggregate(VoucherStatus::Submitted, 500.0, 500.0, vec![]);
        assert!(
            v.post().is_err(),
            "Only Approved vouchers can be posted, Submitted should fail"
        );
        assert_eq!(v.status, VoucherStatus::Submitted);
    }

    #[test]
    fn test_voucher_post_from_reversed_rejected() {
        let mut v = make_voucher_aggregate(VoucherStatus::Reversed, 500.0, 500.0, vec![]);
        assert!(v.post().is_err());
        assert_eq!(v.status, VoucherStatus::Reversed);
    }

    #[test]
    fn test_receivable_double_settle_becomes_settled() {
        let mut a = ReceivableAggregate {
            receivable: make_receivable(),
            collections: vec![],
            aging_buckets: vec![],
        };
        let col1 = CollectionRecord {
            id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "c1".into(),
            amount: 3000.0,
            collection_date: ymd(2025, 6, 15),
            payment_method: "bank".into(),
            bank_account: None,
            status: SettlementStatus::PartiallySettled,
        };
        let col2 = CollectionRecord {
            id: "col2".into(),
            collection_no: "COL-002".into(),
            customer_id: "c1".into(),
            amount: 2000.0,
            collection_date: ymd(2025, 6, 20),
            payment_method: "bank".into(),
            bank_account: None,
            status: SettlementStatus::Settled,
        };
        a.settle(col1).unwrap();
        assert_eq!(a.receivable.status, SettlementStatus::PartiallySettled);
        a.settle(col2).unwrap();
        assert_eq!(a.receivable.settled_amount, 5000.0);
        assert_eq!(a.receivable.status, SettlementStatus::Settled);
        assert_eq!(a.remaining_amount(), 0.0);
        assert_eq!(a.collections.len(), 2);
    }

    #[test]
    fn test_voucher_reverse_then_post_impossible() {
        let mut v = make_voucher_aggregate(VoucherStatus::Posted, 100.0, 100.0, vec![]);
        assert_eq!(v.reverse(), Ok(()));
        assert_eq!(v.status, VoucherStatus::Reversed);
        assert!(v.post().is_err(), "Reversed voucher cannot be re-posted");
    }

    #[test]
    fn rt_receivable_aggregate_with_history() {
        let recv = make_receivable();
        let col = CollectionRecord {
            id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "c1".into(),
            amount: 1500.0,
            collection_date: ymd(2025, 6, 15),
            payment_method: "bank_transfer".into(),
            bank_account: Some("6222-0001".into()),
            status: SettlementStatus::PartiallySettled,
        };
        let buckets = vec![
            AgingBucket {
                label: "0-30天".into(),
                min_days: 0,
                max_days: Some(30),
                amount: 3500.0,
            },
            AgingBucket {
                label: "31-60天".into(),
                min_days: 31,
                max_days: Some(60),
                amount: 0.0,
            },
        ];
        roundtrip(&ReceivableAggregate {
            receivable: recv,
            collections: vec![col],
            aging_buckets: buckets,
        });
    }

    #[test]
    fn rt_payable_aggregate_with_payments() {
        let pay = make_payable();
        let pmt = PaymentRecord {
            id: "pay1".into(),
            payment_no: "PAY-001".into(),
            supplier_id: "s1".into(),
            amount: 3000.0,
            payment_date: ymd(2025, 6, 20),
            payment_method: "bank_check".into(),
            bank_account: None,
            status: SettlementStatus::Settled,
        };
        roundtrip(&PayableAggregate {
            payable: pay,
            payments: vec![pmt],
            aging_buckets: vec![],
        });
    }
}
