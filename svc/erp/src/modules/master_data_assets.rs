//! V40.0 AC-12: 主数据资产目录
//!
//! 提供数据资产目录列表和详情查询，包括各域主数据的记录数、质量评分、字段定义等。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use utoipa::IntoParams;

use super::ApiState;

#[derive(Debug, Serialize)]
pub struct DataAssetSummary {
    pub domain: String,
    pub domain_name: String,
    pub record_count: u64,
    pub active_count: u64,
    pub quality_score: f64,
    pub last_updated: Option<chrono::DateTime<chrono::Utc>>,
    pub owner_service: String,
    pub fields: Vec<DataAssetField>,
}

#[derive(Debug, Serialize)]
pub struct DataAssetField {
    pub field_name: String,
    pub field_label: String,
    pub data_type: String,
    pub is_required: bool,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct DataAssetQuery {
    pub domain: Option<String>,
}

pub fn domain_display_name(domain: &str) -> String {
    match domain {
        "customer" => "客户主数据".to_string(),
        "product" => "产品主数据".to_string(),
        "material" => "物料主数据".to_string(),
        "supplier" => "供应商主数据".to_string(),
        "employee" => "员工主数据".to_string(),
        "department" => "部门主数据".to_string(),
        "warehouse" => "仓库主数据".to_string(),
        "project" => "项目主数据".to_string(),
        "chart_of_accounts" => "会计科目主数据".to_string(),
        "cost_center" => "成本中心主数据".to_string(),
        other => other.to_string(),
    }
}

pub fn get_domain_fields(domain: &str) -> Vec<DataAssetField> {
    let base_fields = vec![
        DataAssetField {
            field_name: "master_data_id".to_string(),
            field_label: "主数据ID".to_string(),
            data_type: "string".to_string(),
            is_required: true,
            description: Some("全局唯一主数据标识符".to_string()),
        },
        DataAssetField {
            field_name: "code".to_string(),
            field_label: "编码".to_string(),
            data_type: "string".to_string(),
            is_required: true,
            description: Some("业务编码".to_string()),
        },
        DataAssetField {
            field_name: "name".to_string(),
            field_label: "名称".to_string(),
            data_type: "string".to_string(),
            is_required: false,
            description: Some("显示名称".to_string()),
        },
        DataAssetField {
            field_name: "status".to_string(),
            field_label: "状态".to_string(),
            data_type: "string".to_string(),
            is_required: true,
            description: Some("生命周期状态".to_string()),
        },
        DataAssetField {
            field_name: "source_service".to_string(),
            field_label: "来源服务".to_string(),
            data_type: "string".to_string(),
            is_required: true,
            description: Some("数据来源服务".to_string()),
        },
    ];

    let extra_fields = match domain {
        "customer" => vec![
            DataAssetField {
                field_name: "customer_type".to_string(),
                field_label: "客户类型".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: Some("客户分类".to_string()),
            },
            DataAssetField {
                field_name: "contact_person".to_string(),
                field_label: "联系人".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: None,
            },
        ],
        "product" | "material" => vec![
            DataAssetField {
                field_name: "category".to_string(),
                field_label: "分类".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: Some("产品/物料分类".to_string()),
            },
            DataAssetField {
                field_name: "unit".to_string(),
                field_label: "单位".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: Some("计量单位".to_string()),
            },
        ],
        "supplier" => vec![
            DataAssetField {
                field_name: "supplier_type".to_string(),
                field_label: "供应商类型".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: None,
            },
            DataAssetField {
                field_name: "credit_level".to_string(),
                field_label: "信用等级".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: None,
            },
        ],
        "employee" => vec![
            DataAssetField {
                field_name: "department".to_string(),
                field_label: "所属部门".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: None,
            },
            DataAssetField {
                field_name: "position".to_string(),
                field_label: "职位".to_string(),
                data_type: "string".to_string(),
                is_required: false,
                description: None,
            },
        ],
        _ => vec![],
    };

    base_fields.into_iter().chain(extra_fields).collect()
}

/// V40.0 AC-12: 列出数据资产目录
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/governance/assets",
    tag = "Master Data",
    operation_id = "list_data_assets",
    params(DataAssetQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn list_data_assets(
    State(state): State<ApiState>,
    Query(params): Query<DataAssetQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<DataAssetSummary>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let db = &mut **txn;

    let rows = if let Some(ref domain) = params.domain {
        sqlx::query(only_own_schema_query!(
            "erp",
            r#"SELECT domain,
                      COUNT(*) as total_count,
                      COUNT(*) FILTER (WHERE status = 'active') as active_count,
                      MAX(updated_at) as last_updated,
                      (SELECT source_service FROM erp.erp_master_data_refs r2
                       WHERE r2.domain = r1.domain LIMIT 1) as owner_service
               FROM erp.erp_master_data_refs r1
               WHERE domain = $1 AND status != 'destroyed'
               GROUP BY domain"#
        ))
        .bind(domain)
        .fetch_all(&mut *db)
        .await
    } else {
        sqlx::query(only_own_schema_query!(
            "erp",
            r#"SELECT domain,
                      COUNT(*) as total_count,
                      COUNT(*) FILTER (WHERE status = 'active') as active_count,
                      MAX(updated_at) as last_updated,
                      (SELECT source_service FROM erp.erp_master_data_refs r2
                       WHERE r2.domain = r1.domain LIMIT 1) as owner_service
               FROM erp.erp_master_data_refs r1
               WHERE status != 'destroyed'
               GROUP BY domain
               ORDER BY domain"#
        ))
        .fetch_all(&mut *db)
        .await
    };

    match rows {
        Ok(rows) => {
            let mut assets = Vec::new();
            for row in rows {
                let domain: String = row.try_get("domain").unwrap_or_default();
                let total_count: i64 = row.try_get("total_count").unwrap_or(0);
                let active_count: i64 = row.try_get("active_count").unwrap_or(0);
                let last_updated: Option<chrono::DateTime<chrono::Utc>> =
                    row.try_get("last_updated").ok().flatten();
                let owner_service: Option<String> = row.try_get("owner_service").ok().flatten();

                let domain_quality_score = calculate_domain_quality_score(&mut *db, &domain).await;

                assets.push(DataAssetSummary {
                    domain: domain.clone(),
                    domain_name: domain_display_name(&domain),
                    record_count: total_count as u64,
                    active_count: active_count as u64,
                    quality_score: domain_quality_score,
                    last_updated,
                    owner_service: owner_service.unwrap_or_else(|| "erp".to_string()),
                    fields: get_domain_fields(&domain),
                });
            }
            Json(ApiResponse::success(assets, "数据资产目录列表"))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询数据资产目录失败: {}", e);
            Json(ApiResponse::success(vec![], "数据资产目录列表（空）"))
        }
    }
}

async fn calculate_domain_quality_score(db: &mut sqlx::PgConnection, domain: &str) -> f64 {
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT total_checked, total_issues, errors, warnings
           FROM erp_master_data_quality_reports
           WHERE domain = $1
           ORDER BY generated_at DESC LIMIT 1"#
    ))
    .bind(domain)
    .fetch_optional(&mut *db)
    .await;

    match result.ok().flatten() {
        Some(row) => {
            let total_checked: i64 = row.try_get("total_checked").unwrap_or(0);
            let errors: i64 = row.try_get("errors").unwrap_or(0);
            let warnings: i64 = row.try_get("warnings").unwrap_or(0);
            if total_checked > 0 {
                let weighted_issues = (errors * 3 + warnings) as f64;
                let max_possible = (total_checked * 3) as f64;
                ((1.0 - weighted_issues / max_possible.max(1.0)) * 100.0).max(0.0)
            } else {
                100.0
            }
        }
        None => 100.0,
    }
}

/// V40.0 AC-12: 获取数据资产详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/governance/assets/{domain}",
    tag = "Master Data",
    operation_id = "get_data_asset_detail",
    responses((status = 200, description = "OK")),
)]
pub async fn get_data_asset_detail(
    State(state): State<ApiState>,
    Path(domain): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<DataAssetSummary>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let db = &mut **txn;

    let row = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT COUNT(*) as total_count,
                  COUNT(*) FILTER (WHERE status = 'active') as active_count,
                  MAX(updated_at) as last_updated,
                  (SELECT source_service FROM erp.erp_master_data_refs r2
                   WHERE r2.domain = $1 LIMIT 1) as owner_service
           FROM erp.erp_master_data_refs
           WHERE domain = $1 AND status != 'destroyed'"#
    ))
    .bind(&domain)
    .fetch_one(&mut *db)
    .await;

    match row {
        Ok(row) => {
            let total_count: i64 = row.try_get("total_count").unwrap_or(0);
            let active_count: i64 = row.try_get("active_count").unwrap_or(0);
            let last_updated: Option<chrono::DateTime<chrono::Utc>> =
                row.try_get("last_updated").ok().flatten();
            let owner_service: Option<String> = row.try_get("owner_service").ok().flatten();

            let quality_score = calculate_domain_quality_score(&mut *db, &domain).await;

            Json(ApiResponse::success(
                DataAssetSummary {
                    domain: domain.clone(),
                    domain_name: domain_display_name(&domain),
                    record_count: total_count as u64,
                    active_count: active_count as u64,
                    quality_score,
                    last_updated,
                    owner_service: owner_service.unwrap_or_else(|| "erp".to_string()),
                    fields: get_domain_fields(&domain),
                },
                "数据资产详情",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询数据资产详情失败: {}", e);
            Json(ApiResponse::error(404, "未找到数据资产"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_asset_summary_serialization() {
        let summary = DataAssetSummary {
            domain: "customer".to_string(),
            domain_name: "客户主数据".to_string(),
            record_count: 1000,
            active_count: 950,
            quality_score: 95.5,
            last_updated: None,
            owner_service: "crm".to_string(),
            fields: vec![],
        };
        let json = serde_json::to_value(&summary).unwrap();
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["domain_name"], "客户主数据");
        assert_eq!(json["record_count"], 1000);
        assert_eq!(json["active_count"], 950);
        assert_eq!(json["quality_score"], 95.5);
        assert_eq!(json["owner_service"], "crm");
    }

    #[test]
    fn test_data_asset_field_serialization() {
        let field = DataAssetField {
            field_name: "name".to_string(),
            field_label: "名称".to_string(),
            data_type: "string".to_string(),
            is_required: true,
            description: Some("客户名称".to_string()),
        };
        let json = serde_json::to_value(&field).unwrap();
        assert_eq!(json["field_name"], "name");
        assert_eq!(json["field_label"], "名称");
        assert_eq!(json["data_type"], "string");
        assert_eq!(json["is_required"], true);
        assert_eq!(json["description"], "客户名称");
    }

    #[test]
    fn test_data_asset_field_optional() {
        let field = DataAssetField {
            field_name: "email".to_string(),
            field_label: "邮箱".to_string(),
            data_type: "string".to_string(),
            is_required: false,
            description: None,
        };
        let json = serde_json::to_value(&field).unwrap();
        assert_eq!(json["field_name"], "email");
        assert_eq!(json["is_required"], false);
        assert!(json["description"].is_null());
    }

    #[test]
    fn test_data_asset_query_deserialize() {
        let query = "domain=customer";
        let params: DataAssetQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
    }

    #[test]
    fn test_data_asset_query_default() {
        let query = "";
        let params: DataAssetQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.domain.is_none());
    }

    #[test]
    fn test_domain_display_name_customer() {
        assert_eq!(domain_display_name("customer"), "客户主数据");
    }

    #[test]
    fn test_domain_display_name_product() {
        assert_eq!(domain_display_name("product"), "产品主数据");
    }

    #[test]
    fn test_domain_display_name_material() {
        assert_eq!(domain_display_name("material"), "物料主数据");
    }

    #[test]
    fn test_domain_display_name_unknown() {
        assert_eq!(domain_display_name("unknown"), "unknown");
    }
}
