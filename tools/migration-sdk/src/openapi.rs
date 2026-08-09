//! TOPEMS Migration SDK（迁移编排、DDL/数据迁移/租户化/回滚）最小 OpenAPI 文档骨架
//!
//! 注意：migration-sdk 是 lib crate（非 HTTP bin），但仍需提供 utoipa 结构以便
//! A2 聚合器扫描到"迁移编排器相关契约"（后续 V71.5 填 paths）。
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "migration_plan",   description = "迁移计划编排 API"),
        (name = "tenant_migration", description = "多租户化迁移 API"),
        (name = "rollback",         description = "迁移回滚/修复 API")
    ),
    info(
        title       = "TOPEMS Migration SDK API",
        version     = "1.0.0",
        description = "迁移 SDK（内部库）对外暴露的契约 - 包含迁移计划、租户化、回滚"
    )
)]
pub struct MigrationSdkApiDoc;
