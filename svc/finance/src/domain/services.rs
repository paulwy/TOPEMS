use async_trait::async_trait;

use super::aggregates::*;
use super::events::*;

#[async_trait]
pub trait VoucherService: Send + Sync {
    async fn create_voucher(
        &self,
        aggregate: &VoucherAggregate,
    ) -> Result<VoucherAggregate, String>;
    async fn get_voucher(&self, id: &str) -> Result<Option<VoucherAggregate>, String>;
    async fn post_voucher(&self, id: &str) -> Result<VoucherAggregate, String>;
    async fn reverse_voucher(
        &self,
        id: &str,
        reason: &str,
    ) -> Result<VoucherAggregate, String>;
    async fn list_vouchers(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<Vec<VoucherAggregate>, String>;
}

#[async_trait]
pub trait ReceivableService: Send + Sync {
    async fn create_receivable(
        &self,
        aggregate: &ReceivableAggregate,
    ) -> Result<ReceivableAggregate, String>;
    async fn get_receivable(&self, id: &str) -> Result<Option<ReceivableAggregate>, String>;
    async fn settle(
        &self,
        receivable_id: &str,
        collection: &super::entities::CollectionRecord,
    ) -> Result<ReceivableAggregate, String>;
    async fn list_receivables(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<Vec<ReceivableAggregate>, String>;
    async fn calculate_aging(
        &self,
        customer_id: Option<&str>,
    ) -> Result<Vec<super::value_objects::AgingBucket>, String>;
}

#[async_trait]
pub trait PayableService: Send + Sync {
    async fn create_payable(
        &self,
        aggregate: &PayableAggregate,
    ) -> Result<PayableAggregate, String>;
    async fn get_payable(&self, id: &str) -> Result<Option<PayableAggregate>, String>;
    async fn settle(
        &self,
        payable_id: &str,
        payment: &super::entities::PaymentRecord,
    ) -> Result<PayableAggregate, String>;
    async fn list_payables(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<Vec<PayableAggregate>, String>;
    async fn calculate_aging(
        &self,
        supplier_id: Option<&str>,
    ) -> Result<Vec<super::value_objects::AgingBucket>, String>;
}

// 领域事件发布器 trait
#[async_trait]
pub trait DomainEventPublisher: Send + Sync {
    async fn publish(&self, event: FinanceDomainEvent) -> Result<(), String>;
}
