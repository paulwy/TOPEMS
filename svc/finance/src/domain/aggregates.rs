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
