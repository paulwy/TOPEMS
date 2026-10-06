use topems_shared_core::error::TopemsError;
use async_trait::async_trait;

use super::aggregates::*;

#[async_trait]
pub trait VoucherRepository: Send + Sync {
    async fn save(&self, aggregate: &VoucherAggregate) -> Result<(), TopemsError>;
    async fn find_by_id(&self, id: &str) -> Result<Option<VoucherAggregate>, TopemsError>;
    async fn find_by_no(&self, voucher_no: &str) -> Result<Option<VoucherAggregate>, TopemsError>;
    async fn list(
        &self,
        page: i64,
        page_size: i64,
        filter: Option<VoucherFilter>,
    ) -> Result<(Vec<VoucherAggregate>, i64), TopemsError>;
    async fn delete(&self, id: &str) -> Result<(), TopemsError>;
}

#[derive(Debug, Clone, Default)]
pub struct VoucherFilter {
    pub voucher_type: Option<String>,
    pub status: Option<super::value_objects::VoucherStatus>,
    pub date_from: Option<chrono::NaiveDate>,
    pub date_to: Option<chrono::NaiveDate>,
}

#[async_trait]
pub trait ReceivableRepository: Send + Sync {
    async fn save(&self, aggregate: &ReceivableAggregate) -> Result<(), TopemsError>;
    async fn find_by_id(&self, id: &str) -> Result<Option<ReceivableAggregate>, TopemsError>;
    async fn list(
        &self,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<ReceivableAggregate>, i64), TopemsError>;
}

#[async_trait]
pub trait PayableRepository: Send + Sync {
    async fn save(&self, aggregate: &PayableAggregate) -> Result<(), TopemsError>;
    async fn find_by_id(&self, id: &str) -> Result<Option<PayableAggregate>, TopemsError>;
    async fn list(&self, page: i64, page_size: i64)
        -> Result<(Vec<PayableAggregate>, i64), TopemsError>;
}
