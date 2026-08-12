//! WMS service layer — business logic abstraction
#![allow(dead_code)]
#![allow(async_fn_in_trait)]

use crate::models::*;
use sqlx::PgPool;

pub trait InboundOrderService: Send + Sync {
    async fn list(
        &self,
        pool: &PgPool,
        q: &InboundOrderQuery,
    ) -> Result<ListInboundOrdersResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<InboundOrder>, sqlx::Error>;
}

pub trait OutboundOrderService: Send + Sync {
    async fn list(
        &self,
        pool: &PgPool,
        q: &OutboundOrderQuery,
    ) -> Result<ListOutboundOrdersResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<OutboundOrder>, sqlx::Error>;
}

pub trait StockTakeService: Send + Sync {
    async fn list(
        &self,
        pool: &PgPool,
        q: &StockTakeQuery,
    ) -> Result<ListStockTakesResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<StockTake>, sqlx::Error>;
}

pub trait TransferOrderService: Send + Sync {
    async fn list(
        &self,
        pool: &PgPool,
        q: &TransferOrderQueryParams,
    ) -> Result<ListTransferOrdersResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<TransferOrder>, sqlx::Error>;
}

pub trait WavePickService: Send + Sync {
    async fn list(
        &self,
        pool: &PgPool,
        q: &WavePickQuery,
    ) -> Result<ListWavePicksResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<WavePick>, sqlx::Error>;
}

pub trait InventoryMovementService: Send + Sync {
    async fn list(
        &self,
        pool: &PgPool,
        q: &InventoryMovementQueryParams,
    ) -> Result<ListInventoryMovementsResponse, sqlx::Error>;
    async fn get(&self, pool: &PgPool, id: &str) -> Result<Option<InventoryMovement>, sqlx::Error>;
}

pub struct ListInboundOrdersResponse {
    pub items: Vec<InboundOrder>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub struct ListOutboundOrdersResponse {
    pub items: Vec<OutboundOrder>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub struct ListStockTakesResponse {
    pub items: Vec<StockTake>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub struct ListTransferOrdersResponse {
    pub items: Vec<TransferOrder>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub struct ListWavePicksResponse {
    pub items: Vec<WavePick>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub struct ListInventoryMovementsResponse {
    pub items: Vec<InventoryMovement>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub struct InboundOrderQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub search: Option<String>,
}

pub struct OutboundOrderQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub search: Option<String>,
}

pub struct StockTakeQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub warehouse_id: Option<uuid::Uuid>,
}

pub struct WavePickQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub search: Option<String>,
}
