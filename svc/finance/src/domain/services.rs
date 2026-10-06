use topems_shared_core::error::TopemsError;
use async_trait::async_trait;

use super::aggregates::*;
use super::events::*;

#[async_trait]
pub trait VoucherService: Send + Sync {
    async fn create_voucher(
        &self,
        aggregate: &VoucherAggregate,
    ) -> Result<VoucherAggregate, TopemsError>;
    async fn get_voucher(&self, id: &str) -> Result<Option<VoucherAggregate>, TopemsError>;
    async fn post_voucher(&self, id: &str) -> Result<VoucherAggregate, TopemsError>;
    async fn reverse_voucher(&self, id: &str, reason: &str) -> Result<VoucherAggregate, TopemsError>;
    async fn list_vouchers(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<Vec<VoucherAggregate>, TopemsError>;
}

#[async_trait]
pub trait ReceivableService: Send + Sync {
    async fn create_receivable(
        &self,
        aggregate: &ReceivableAggregate,
    ) -> Result<ReceivableAggregate, TopemsError>;
    async fn get_receivable(&self, id: &str) -> Result<Option<ReceivableAggregate>, TopemsError>;
    async fn settle(
        &self,
        receivable_id: &str,
        collection: &super::entities::CollectionRecord,
    ) -> Result<ReceivableAggregate, TopemsError>;
    async fn list_receivables(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<Vec<ReceivableAggregate>, TopemsError>;
    async fn calculate_aging(
        &self,
        customer_id: Option<&str>,
    ) -> Result<Vec<super::value_objects::AgingBucket>, TopemsError>;
}

#[async_trait]
pub trait PayableService: Send + Sync {
    async fn create_payable(
        &self,
        aggregate: &PayableAggregate,
    ) -> Result<PayableAggregate, TopemsError>;
    async fn get_payable(&self, id: &str) -> Result<Option<PayableAggregate>, TopemsError>;
    async fn settle(
        &self,
        payable_id: &str,
        payment: &super::entities::PaymentRecord,
    ) -> Result<PayableAggregate, TopemsError>;
    async fn list_payables(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<Vec<PayableAggregate>, TopemsError>;
    async fn calculate_aging(
        &self,
        supplier_id: Option<&str>,
    ) -> Result<Vec<super::value_objects::AgingBucket>, TopemsError>;
}

// 领域事件发布器 trait
#[async_trait]
pub trait DomainEventPublisher: Send + Sync {
    async fn publish(&self, event: FinanceDomainEvent) -> Result<(), TopemsError>;
}
