//! 供应商主数据双向同步管道 —— mdm → scm/srm 下游写。
//!
//! 本模块在 mdm 写端点（create/update/delete）主写入成功后，后台异步把
//! 同一供应商 upsert 到 `scm.suppliers` 与 `srm.suppliers`。
//!
//! 设计要点：
//!   * 不阻塞主写入：所有同步走 `tokio::spawn`，主请求已提交后再跑；
//!     同步失败只 `tracing::warn!` 并落 `mdm_sync_dead_letter`，绝不返回 5xx。
//!   * 幂等：scm/srm 均有 `supplier_no` 唯一索引，用 `INSERT ... ON CONFLICT
//!     (supplier_no) DO UPDATE`，重复同步不产生重复行。
//!   * 防环：本模块直接写库（不调用 scm/srm HTTP API），不会触发 scm/srm
//!     的写端点 → 不会反向再写 mdm。下游回写 mdm 的方向在 scm/srm 侧模块。
//!   * 溯源列：写 scm.suppliers 时 `sync_from_srm=FALSE`（来自 mdm，不是 srm）；
//!     写 srm.suppliers 时 `sync_from_scm=FALSE`。保留既有 `srm_supplier_id` /
//!     `scm_supplier_id` 不覆盖。
//!   * 软删：mdm DELETE → scm/srm `SET deleted_at=now()`。
//!   * category 翻译：mdm 的 `category` 是自由文本，`category_code` 是字典码；
//!     scm.category 存标准码（如 'raw_material'），srm.category 存中文（如 '原材料'，
//!     NOT NULL）。同步时按 `mdm_supplier_categories.source_values` 翻译：
//!     有 category_code 查字典取 scm/srm 侧值；无则回退 mdm.category 自由文本；
//!     srm 侧 COALESCE 到空串兜底（NOT NULL 约束）。
//!
//! 租户隔离：所有 SQL 显式带 tenant_id 条件；连接层 RLS（app.tenant_id 未设
//! → IS NULL 放行分支）双保险。

use sqlx::PgPool;
use std::collections::HashMap;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::{Db, ScopedTxn};
use uuid::Uuid;

/// 后台同步专用：按 payload 租户开写作用域。
///
/// 不能再用裸池写 scm/srm —— 两张表都是 fail-closed / 严格租户策略，未设 GUC 时
/// INSERT 会被 WITH CHECK 拒绝（且失败只落死信，主流程看不到）。
/// 有租户 → 普通租户通道；无租户（mdm 全局供应商）→ 系统通道。
async fn open_write_scope<'a>(db: &'a Db, tenant: Option<Uuid>) -> sqlx::Result<ScopedTxn<'a>> {
    match tenant.filter(|t| !t.is_nil()) {
        Some(t) => db.scope_for_tenant(t).await,
        None => db.scope_system().await,
    }
}

/// 同步用的供应商业务字段快照（从 mdm 行投影）。
#[derive(Debug, Clone, serde::Serialize)]
pub struct SupplierSyncPayload {
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub category_code: Option<String>,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub bank_name: Option<String>,
    pub bank_account: Option<String>,
    pub remarks: Option<String>,
    pub name_en: Option<String>,
    pub lead_time_days: Option<i32>,
    pub tenant_id: Option<Uuid>,
}

/// 操作类型：create / update / delete（软删）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncOp {
    Create,
    Update,
    Delete,
}

impl SyncOp {
    fn as_str(&self) -> &'static str {
        match self {
            SyncOp::Create => "create",
            SyncOp::Update => "update",
            SyncOp::Delete => "delete",
        }
    }
}

/// 类别字典条目：code -> (scm_value, srm_value)。
type CategoryDict = HashMap<String, (String, String)>;

/// 一次性加载类别字典（mdm_supplier_categories 只有少量行）。
/// 返回 code -> (source_values->>'scm', source_values->>'srm')。
async fn load_category_dict(db: &Db) -> CategoryDict {
    let mut scope = match db.scope_read_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::warn!("[mdm-sync] 打开类别字典读作用域失败: {}", e);
            return HashMap::new();
        }
    };
    let rows: Vec<(String, Option<serde_json::Value>)> = sqlx::query_as(
        r#"SELECT code, source_values FROM master_data.mdm_supplier_categories
           WHERE status = 'active' AND deleted_at IS NULL"#,
    )
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();
    let _ = scope.commit().await;
    let mut map = HashMap::new();
    for (code, sv) in rows {
        if let Some(sv) = sv {
            let scm_val = sv
                .get("scm")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let srm_val = sv
                .get("srm")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            map.insert(code, (scm_val, srm_val));
        }
    }
    map
}

/// 把 mdm 的 category_code / category 翻译成 scm 侧 category 值。
/// 优先级：字典.source_values->>'scm' > mdm.category 自由文本 > NULL。
fn translate_to_scm(dict: &CategoryDict, p: &SupplierSyncPayload) -> Option<String> {
    if let Some(cc) = &p.category_code {
        if let Some((scm_val, _)) = dict.get(cc) {
            if !scm_val.is_empty() {
                return Some(scm_val.clone());
            }
        }
    }
    p.category.clone()
}

/// 把 mdm 的 category_code / category 翻译成 srm 侧 category 值（NOT NULL）。
/// 优先级：字典.source_values->>'srm' > mdm.category 自由文本 > ''（兜底）。
fn translate_to_srm(dict: &CategoryDict, p: &SupplierSyncPayload) -> String {
    if let Some(cc) = &p.category_code {
        if let Some((_, srm_val)) = dict.get(cc) {
            if !srm_val.is_empty() {
                return srm_val.clone();
            }
        }
    }
    p.category.clone().unwrap_or_default()
}

/// 把同步失败落死信表。自身失败只打日志，不再抛错。
async fn write_dead_letter(
    db: &Db,
    direction: &str,
    entity_key: &str,
    op: SyncOp,
    error: &str,
    payload: &SupplierSyncPayload,
) {
    let payload_json = serde_json::to_value(payload).unwrap_or(serde_json::Value::Null);
    let mut scope = match db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!(
                "[mdm-sync] 死信表写作用域开启失败: direction={}, entity_key={}, err={}",
                direction,
                entity_key,
                e
            );
            return;
        }
    };
    let res = sqlx::query(
        r#"INSERT INTO master_data.mdm_sync_dead_letter
             (entity_type, entity_key, direction, operation, error_message, payload, tenant_id)
           VALUES ('supplier', $1, $2, $3, $4, $5, $6)"#,
    )
    .bind(entity_key)
    .bind(direction)
    .bind(op.as_str())
    .bind(error)
    .bind(&payload_json)
    .bind(payload.tenant_id)
    .execute(&mut scope)
    .await;
    match res {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!(
                    "[mdm-sync] 死信表提交失败: entity_key={}, err={}",
                    entity_key,
                    e
                );
            }
        }
        Err(e) => tracing::error!(
            "[mdm-sync] 写死信表失败: direction={}, entity_key={}, err={}",
            direction,
            entity_key,
            e
        ),
    }
}

/// upsert 到 scm.suppliers（按 supplier_no 唯一键）。category 已由调用方翻译。
async fn upsert_scm(
    scope: &mut ScopedTxn<'_>,
    p: &SupplierSyncPayload,
    scm_category: Option<String>,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "master_data",
        r#"INSERT INTO scm.suppliers
             (supplier_no, name, legal_name, category, status, tax_id, address,
              contact_person, phone, email, website, credit_rating, risk_level,
              bank_name, bank_account, remarks, name_en, lead_time_days,
              tenant_id, sync_from_srm, last_sync_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                   $19, FALSE, now(), now(), now())
           ON CONFLICT (supplier_no) DO UPDATE SET
             name = EXCLUDED.name,
             legal_name = EXCLUDED.legal_name,
             category = EXCLUDED.category,
             status = EXCLUDED.status,
             tax_id = EXCLUDED.tax_id,
             address = EXCLUDED.address,
             contact_person = EXCLUDED.contact_person,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             website = EXCLUDED.website,
             credit_rating = EXCLUDED.credit_rating,
             risk_level = EXCLUDED.risk_level,
             bank_name = EXCLUDED.bank_name,
             bank_account = EXCLUDED.bank_account,
             remarks = EXCLUDED.remarks,
             name_en = EXCLUDED.name_en,
             lead_time_days = EXCLUDED.lead_time_days,
             sync_from_srm = FALSE,
             last_sync_at = now(),
             updated_at = now(),
             deleted_at = NULL"#,
        "scm",
        "srm"
    ))
    .bind(&p.supplier_no)
    .bind(&p.name)
    .bind(&p.legal_name)
    .bind(&scm_category)
    .bind(&p.status)
    .bind(&p.tax_id)
    .bind(&p.address)
    .bind(&p.contact_person)
    .bind(&p.phone)
    .bind(&p.email)
    .bind(&p.website)
    .bind(&p.credit_rating)
    .bind(&p.risk_level)
    .bind(&p.bank_name)
    .bind(&p.bank_account)
    .bind(&p.remarks)
    .bind(&p.name_en)
    .bind(p.lead_time_days)
    .bind(p.tenant_id)
    .execute(&mut *scope)
    .await?;
    Ok(())
}

/// 软删 scm.suppliers（按 supplier_no + tenant_id）。
async fn soft_delete_scm(
    scope: &mut ScopedTxn<'_>,
    p: &SupplierSyncPayload,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "master_data",
        r#"UPDATE scm.suppliers SET deleted_at = now(), updated_at = now()
           WHERE supplier_no = $1
             AND ($2::uuid IS NULL OR tenant_id = $2)"#,
        "scm",
        "srm"
    ))
    .bind(&p.supplier_no)
    .bind(p.tenant_id)
    .execute(&mut *scope)
    .await?;
    Ok(())
}

/// upsert 到 srm.suppliers（按 supplier_no 唯一键；srm 无 remarks/lead_time_days）。
/// category 已由调用方翻译为非空字符串（srm.category NOT NULL）。
async fn upsert_srm(
    scope: &mut ScopedTxn<'_>,
    p: &SupplierSyncPayload,
    srm_category: String,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "master_data",
        r#"INSERT INTO srm.suppliers
             (supplier_no, name, legal_name, category, status, tax_id, address,
              contact_person, phone, email, website, credit_rating, risk_level,
              bank_name, bank_account, name_en, tenant_id, sync_from_scm, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, FALSE, now(), now())
           ON CONFLICT (supplier_no) DO UPDATE SET
             name = EXCLUDED.name,
             legal_name = EXCLUDED.legal_name,
             category = EXCLUDED.category,
             status = EXCLUDED.status,
             tax_id = EXCLUDED.tax_id,
             address = EXCLUDED.address,
             contact_person = EXCLUDED.contact_person,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             website = EXCLUDED.website,
             credit_rating = EXCLUDED.credit_rating,
             risk_level = EXCLUDED.risk_level,
             bank_name = EXCLUDED.bank_name,
             bank_account = EXCLUDED.bank_account,
             name_en = EXCLUDED.name_en,
             sync_from_scm = FALSE,
             updated_at = now(),
             deleted_at = NULL"#,
        "scm",
        "srm"
    ))
    .bind(&p.supplier_no)
    .bind(&p.name)
    .bind(&p.legal_name)
    .bind(&srm_category)
    .bind(&p.status)
    .bind(&p.tax_id)
    .bind(&p.address)
    .bind(&p.contact_person)
    .bind(&p.phone)
    .bind(&p.email)
    .bind(&p.website)
    .bind(&p.credit_rating)
    .bind(&p.risk_level)
    .bind(&p.bank_name)
    .bind(&p.bank_account)
    .bind(&p.name_en)
    .bind(p.tenant_id)
    .execute(&mut *scope)
    .await?;
    Ok(())
}

/// 软删 srm.suppliers（按 supplier_no + tenant_id）。
async fn soft_delete_srm(
    scope: &mut ScopedTxn<'_>,
    p: &SupplierSyncPayload,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "master_data",
        r#"UPDATE srm.suppliers SET deleted_at = now(), updated_at = now()
           WHERE supplier_no = $1
             AND ($2::uuid IS NULL OR tenant_id = $2)"#,
        "scm",
        "srm"
    ))
    .bind(&p.supplier_no)
    .bind(p.tenant_id)
    .execute(&mut *scope)
    .await?;
    Ok(())
}

/// 后台异步同步到 scm + srm。主调用方在主写入提交后调用，不 await。
pub fn spawn_mdm_to_downstream(db: PgPool, payload: SupplierSyncPayload, op: SyncOp) {
    if payload.supplier_no.trim().is_empty() {
        tracing::warn!("[mdm-sync] supplier_no 为空，跳过下游同步");
        return;
    }
    tokio::spawn(async move {
        let mdm_db = Db::new(db.clone(), "master_data, public, shared");
        let scm_db = Db::new(db.clone(), "scm, public, shared");
        let srm_db = Db::new(db.clone(), "srm, public, shared");

        // 一次性加载类别字典（仅 create/update 需要翻译；delete 不需要）
        let dict = if op == SyncOp::Delete {
            CategoryDict::new()
        } else {
            load_category_dict(&mdm_db).await
        };

        // ---- scm ----
        let scm_res = match open_write_scope(&scm_db, payload.tenant_id).await {
            Ok(mut scope) => {
                let res = match op {
                    SyncOp::Delete => soft_delete_scm(&mut scope, &payload).await,
                    _ => {
                        let scm_cat = translate_to_scm(&dict, &payload);
                        upsert_scm(&mut scope, &payload, scm_cat).await
                    }
                };
                match res {
                    Ok(()) => scope.commit().await,
                    Err(e) => {
                        if let Err(re) = scope.rollback().await {
                            tracing::error!("[mdm-sync] scm 写作用域回滚失败: {}", re);
                        }
                        Err(e)
                    }
                }
            }
            Err(e) => Err(e),
        };
        if let Err(e) = scm_res {
            tracing::warn!(
                "[mdm-sync] mdm→scm 同步失败: supplier_no={}, op={}, err={}",
                payload.supplier_no,
                op.as_str(),
                e
            );
            write_dead_letter(
                &mdm_db,
                "mdm_to_scm",
                &payload.supplier_no,
                op,
                &e.to_string(),
                &payload,
            )
            .await;
        }

        // ---- srm ----
        let srm_res = match open_write_scope(&srm_db, payload.tenant_id).await {
            Ok(mut scope) => {
                let res = match op {
                    SyncOp::Delete => soft_delete_srm(&mut scope, &payload).await,
                    _ => {
                        let srm_cat = translate_to_srm(&dict, &payload);
                        upsert_srm(&mut scope, &payload, srm_cat).await
                    }
                };
                match res {
                    Ok(()) => scope.commit().await,
                    Err(e) => {
                        if let Err(re) = scope.rollback().await {
                            tracing::error!("[mdm-sync] srm 写作用域回滚失败: {}", re);
                        }
                        Err(e)
                    }
                }
            }
            Err(e) => Err(e),
        };
        if let Err(e) = srm_res {
            tracing::warn!(
                "[mdm-sync] mdm→srm 同步失败: supplier_no={}, op={}, err={}",
                payload.supplier_no,
                op.as_str(),
                e
            );
            write_dead_letter(
                &mdm_db,
                "mdm_to_srm",
                &payload.supplier_no,
                op,
                &e.to_string(),
                &payload,
            )
            .await;
        }
    });
}
