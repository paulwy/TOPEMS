//! QMS service layer — business logic abstraction
//!
//! Service traits decouple handler HTTP layer from database persistence.
//! Each trait covers one entity domain and is optionally implemented by
//! a default production struct backed by `sqlx::PgPool`.

#![allow(async_fn_in_trait)]

use crate::models::{
    quality_inspection::{
        CreateInspectionRequest, Inspection, InspectionQuery, ListInspectionsResponse,
    },
    quality_standard::{
        CreateStandardRequest, ListStandardsResponse, QualityStandard, StandardQuery,
    },
};
use sqlx::PgPool;

/// Quality standard service trait.
pub trait QualityStandardService: Send + Sync {
    async fn list_standards(
        &self,
        pool: &PgPool,
        query: &StandardQuery,
    ) -> Result<ListStandardsResponse, sqlx::Error>;
    async fn get_standard(
        &self,
        pool: &PgPool,
        id: &str,
    ) -> Result<Option<QualityStandard>, sqlx::Error>;
    async fn create_standard(
        &self,
        pool: &PgPool,
        req: &CreateStandardRequest,
    ) -> Result<QualityStandard, sqlx::Error>;
}

/// Quality inspection service trait.
pub trait QualityInspectionService: Send + Sync {
    async fn list_inspections(
        &self,
        pool: &PgPool,
        query: &InspectionQuery,
    ) -> Result<ListInspectionsResponse, sqlx::Error>;
    async fn create_inspection(
        &self,
        pool: &PgPool,
        req: &CreateInspectionRequest,
    ) -> Result<Inspection, sqlx::Error>;
}
