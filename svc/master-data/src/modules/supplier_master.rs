//! 供应商权威主数据（mdm_suppliers）—— 供 erp 全局搜索与前端选用，并提供完整 CRUD。
//!
//! 数据源：`master_data.mdm_suppliers`（scm/srm 两来源已汇入的权威主数据，
//! 表内已按 supplier_no+tenant_id 去重，含唯一约束）。
//!
//! 本模块为完整 CRUD：list / get / create / patch / delete。
//! 写入路径全部由本 MDM 权威表收口，`source_system` 强制写死为 `'mdm'`，
//! `source_id` 为 NULL（用户在权威表上直接创建，无上游来源系统）；
//! scm/srm 老的写入路径暂未切换，仍走各自模块汇入，后续批次再收口。
//! 客户端请求体不允许覆盖 `source_system` / `source_id`（溯源字段只由系统写）。
//!
//! 租户隔离：与同服务 master_data.rs 公共主数据域一致——直连 `state.db`，
//! 请求级从 `x-tenant-id` 头取租户；nil/全零视为超管放行，其余按 tenant_id 过滤。
//! RLS（FORCE + tenant_isolation_mdm_suppliers）在连接层兜底，与手动过滤双保险。
//!
//! ── 批 35 · category 自由文本收敛 ─────────────────────────────────────────
//! `mdm_suppliers.category` 是自由文本列（可 NULL），与 `category_code` 并存。
//! 取证结论（2026-11-07，全量 287 行）：
//!   * 287/287 行同时有 category_code 与 category；仅自由文本无 code 的行 = 0。
//!   * category 实际是反向同步镜像：scm 来源写 'raw_material'（195 行），
//!     srm 来源写 '原材料'（92 行），category_code 均为 'raw_material'。
//!   * 数据库侧无索引/视图/触发器依赖 category；RLS 只依赖 tenant_id。
//!   * 前端展示 fallback 永不触发（所有行 category_code 非 NULL）。
//! 处置（走向 B：仍有消费 → 统一走 category_code）：
//!   * list filter 从 `category = $2` 改为 `category_code = $2`（修复漏数据 bug）。
//!   * create/update 仍写 category：为 srm.suppliers.category NOT NULL 兼容保留，
//!     前端 `fillCategoryFromCode` 会从字典补 name_zh；后端 `supplier_sync.rs`
//!     翻译 srm 侧时也用 category 作兜底。
//!   * category 列不删除（删列需独立迁移，且要先把 srm NOT NULL 兜底改由同步
//!     管道内部生成，风险大；当前保留写兼容）。
//!   * 下一步（待拍板）：若确认零读零写，迁移 0035+ 可 DROP COLUMN。

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::modules::supplier_sync::{spawn_mdm_to_downstream, SupplierSyncPayload, SyncOp};
use crate::shared::AppState;

/// 请求级租户上下文（对齐 rls_middleware 同源：读 x-tenant-id 头；缺失/非法 → nil 全放行）
fn req_tenant_id(headers: &HeaderMap) -> Uuid {
    headers
        .get("x-tenant-id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil)
}

/// 供应商权威行（list/get/create/patch 共用同一形状；uuid 列 ::text 化为字符串对外）。
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Supplier {
    pub id: String,
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
    pub source_system: Option<String>,
    pub source_id: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct SupplierQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    /// 关键词：模糊匹配 supplier_no / name / contact_person / phone / email
    pub keyword: Option<String>,
    pub status: Option<String>,
    /// DEPRECATED：参数名保留兼容，实际按 category_code 过滤（见 SUPPLIER_FILTER 注释）。
    pub category: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SupplierListResponse {
    pub items: Vec<Supplier>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

const SUPPLIER_COLUMNS: &str = r#"id::text, supplier_no, name, legal_name,
       category, category_code,  -- category 自由文本已废弃：仅作展示兜底（前端 fallback 到历史值），读取/过滤一律走 category_code
       status,
       tax_id, address, contact_person, phone, email, website,
       credit_rating, risk_level, bank_name, bank_account, remarks,
       name_en, lead_time_days, source_system, source_id::text,
       created_at, updated_at"#;

// 批 35：category 自由文本已废弃（详见模块头注释）。
// filter 参数名仍叫 `category`（兼容前端 query param），但实际按 category_code 过滤。
// 旧实现 `category = $2` 会漏数据：mdm.category 是反向同步镜像（scm 来源写 'raw_material'、
// srm 来源写 '原材料'），同一 category_code 对应两种自由文本值，按自由文本过滤必然漏一半。
const SUPPLIER_FILTER: &str = r#"deleted_at IS NULL
  AND ($1::text IS NULL OR status = $1)
  AND ($2::text IS NULL OR category_code = $2)
  AND ($3::text IS NULL OR supplier_no ILIKE '%' || $3 || '%'
       OR name ILIKE '%' || $3 || '%'
       OR contact_person ILIKE '%' || $3 || '%'
       OR COALESCE(phone, '') ILIKE '%' || $3 || '%'
       OR COALESCE(email, '') ILIKE '%' || $3 || '%')"#;

/// GET /api/master-data/suppliers —— 分页只读列表（可选 keyword/status/category 过滤）
pub async fn list_suppliers(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<SupplierQuery>,
) -> ApiResponse<SupplierListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant = req_tenant_id(&headers);

    let count_sql = format!(
        r#"SELECT COUNT(*) FROM master_data.mdm_suppliers
           WHERE {}
             AND ($4::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $4::uuid)"#,
        SUPPLIER_FILTER
    );
    let total: i64 = match sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql))
        .bind(query.status.clone())
        .bind(query.category.clone())
        .bind(query.keyword.clone())
        .bind(tenant)
        .fetch_one(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询供应商总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商总数失败".to_string()));
        }
    };

    let list_sql = format!(
        r#"SELECT {} FROM master_data.mdm_suppliers
           WHERE {}
             AND ($6::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $6::uuid)
           ORDER BY updated_at DESC NULLS LAST, supplier_no
           LIMIT $4 OFFSET $5"#,
        SUPPLIER_COLUMNS, SUPPLIER_FILTER
    );
    let items: Vec<Supplier> = match sqlx::query_as(sqlx::AssertSqlSafe(list_sql))
        .bind(query.status)
        .bind(query.category)
        .bind(query.keyword)
        .bind(page_size)
        .bind(offset)
        .bind(tenant)
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询供应商列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商列表失败".to_string()));
        }
    };

    api_success(SupplierListResponse {
        items,
        total,
        page,
        page_size,
    })
}

/// GET /api/master-data/suppliers/:id —— 按主键读单条
pub async fn get_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<Supplier> {
    let tenant = req_tenant_id(&headers);
    let sql = format!(
        r#"SELECT {} FROM master_data.mdm_suppliers
           WHERE deleted_at IS NULL AND id = $1
             AND ($2::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $2::uuid)"#,
        SUPPLIER_COLUMNS
    );
    let row: Option<Supplier> = match sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .bind(tenant)
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询供应商详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询供应商详情失败".to_string()));
        }
    };
    match row {
        Some(s) => api_success(s),
        None => ApiResponse::from(TopemsError::NotFound("供应商不存在".to_string())),
    }
}

// ==================== 写端点（create / patch / delete） ====================

/// POST 创建请求体。
/// `source_system` / `source_id` 故意不在这里暴露——溯源字段由系统强制写死，
/// 客户端即使在 body 里塞了这两个字段也会被 serde 忽略（unknown 字段默认忽略）。
#[derive(Debug, Deserialize)]
pub struct CreateSupplierRequest {
    /// 必填（handler 内校验，缺失/空串 → 400 "supplier_no 为必填字段"）。
    #[serde(default)]
    pub supplier_no: Option<String>,
    /// 必填（handler 内校验，缺失/空串 → 400 "name 为必填字段"）。
    #[serde(default)]
    pub name: Option<String>,
    pub status: Option<String>,
    pub risk_level: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub category_code: Option<String>,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub bank_name: Option<String>,
    pub bank_account: Option<String>,
    pub remarks: Option<String>,
    pub name_en: Option<String>,
    pub lead_time_days: Option<i32>,
    /// 仅当调用方为超管（x-tenant-id 缺失/全零）时才生效；非超管一律强制使用请求头租户，
    /// 不允许跨租户创建。
    pub tenant_id: Option<Uuid>,
}

/// PATCH 部分更新请求体——所有字段都可选，只更新请求里给出的字段。
/// `source_system` / `source_id` / `supplier_no` 不允许通过 PATCH 修改（溯源与业务主键保持稳定）。
#[derive(Debug, Deserialize)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub risk_level: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub category_code: Option<String>,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub bank_name: Option<String>,
    pub bank_account: Option<String>,
    pub remarks: Option<String>,
    pub name_en: Option<String>,
    pub lead_time_days: Option<i32>,
}

/// 校验 category_code 在字典表中存在且启用；不存在则返回 400。
/// 若 category_code 为 None（请求没给），直接放行——允许写入但留 NULL，不在 Rust 里硬编码中英文映射。
async fn validate_category_code(
    state: &AppState,
    category_code: &Option<String>,
) -> Result<(), TopemsError> {
    let code = match category_code {
        Some(c) if !c.trim().is_empty() => c.clone(),
        _ => return Ok(()),
    };
    let exists: Option<(i64,)> = sqlx::query_as(
        r#"SELECT 1::bigint FROM master_data.mdm_supplier_categories
           WHERE code = $1 AND status = 'active' AND deleted_at IS NULL
           LIMIT 1"#,
    )
    .bind(&code)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("校验供应商类别字典失败: {}", e);
        TopemsError::Internal("校验供应商类别字典失败".to_string())
    })?;
    if exists.is_some() {
        Ok(())
    } else {
        Err(TopemsError::ValidationFailed(format!(
            "供应商类别编码 '{}' 在字典表中不存在或未启用",
            code
        )))
    }
}

/// 把唯一约束冲突（SQLSTATE 23505）翻译为 400 业务错误；其它错误原样包装为 500。
fn map_write_error(e: sqlx::Error, ctx: &str) -> TopemsError {
    if let Some(db_err) = e.as_database_error() {
        if db_err.code().as_deref() == Some("23505") {
            return TopemsError::ValidationFailed("供应商编号已存在".to_string());
        }
    }
    tracing::error!("{}: {}", ctx, e);
    TopemsError::Internal(format!("{}失败", ctx))
}

/// POST /api/master-data/suppliers —— 创建一条 MDM 权威供应商。
/// `source_system` 强制写死为 `'mdm'`，`source_id` 为 NULL（本接口直接在权威表建档）。
pub async fn create_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<CreateSupplierRequest>,
) -> ApiResponse<Supplier> {
    // 必填字段校验（与表 NOT NULL 对齐，提前返回 400，不撞 DB 约束报 500）
    let supplier_no = req
        .supplier_no
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    if supplier_no.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "supplier_no 为必填字段".to_string(),
        ));
    }
    let name = req
        .name
        .as_deref()
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    if name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("name 为必填字段".to_string()));
    }
    let status = req
        .status
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "active".to_string());
    let risk_level = req
        .risk_level
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "low".to_string());

    // category_code 一致性：给了就查字典；不在字典里 → 400
    if let Err(e) = validate_category_code(&state, &req.category_code).await {
        return ApiResponse::from(e);
    }

    // 租户解析：超管（x-tenant-id 缺失/全零）允许用 body 里的 tenant_id；
    // 非超管强制使用请求头租户，body 里的 tenant_id 直接忽略（不允许跨租户创建）。
    let header_tenant = req_tenant_id(&headers);
    let tenant_id = if header_tenant.is_nil() {
        req.tenant_id.unwrap_or_else(Uuid::nil)
    } else {
        header_tenant
    };

    let row: Result<Option<Supplier>, sqlx::Error> = sqlx::query_as(
        r#"INSERT INTO master_data.mdm_suppliers
             (supplier_no, name, legal_name, category, category_code, status, risk_level,
              tax_id, address, contact_person, phone, email, website,
              credit_rating, bank_name, bank_account, remarks, name_en, lead_time_days,
              tenant_id, source_system, source_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7,
                   $8, $9, $10, $11, $12, $13,
                   $14, $15, $16, $17, $18, $19,
                   $20, 'mdm', NULL)
           RETURNING id::text, supplier_no, name, legal_name, category, category_code, status,
                     tax_id, address, contact_person, phone, email, website,
                     credit_rating, risk_level, bank_name, bank_account, remarks,
                     name_en, lead_time_days, source_system, source_id::text,
                     created_at, updated_at"#,
    )
    .bind(&supplier_no)
    .bind(&name)
    .bind(&req.legal_name)
    .bind(&req.category)
    .bind(&req.category_code)
    .bind(&status)
    .bind(&risk_level)
    .bind(&req.tax_id)
    .bind(&req.address)
    .bind(&req.contact_person)
    .bind(&req.phone)
    .bind(&req.email)
    .bind(&req.website)
    .bind(&req.credit_rating)
    .bind(&req.bank_name)
    .bind(&req.bank_account)
    .bind(&req.remarks)
    .bind(&req.name_en)
    .bind(req.lead_time_days)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match row {
        Ok(Some(s)) => {
            // 主写入已提交（本接口无显式事务，单条 INSERT 即提交），后台异步同步到 scm/srm。
            // 同步失败只落死信，不影响主请求返回。
            let payload = SupplierSyncPayload {
                supplier_no: s.supplier_no.clone(),
                name: s.name.clone(),
                legal_name: s.legal_name.clone(),
                category: s.category.clone(),
                category_code: s.category_code.clone(),
                status: s.status.clone(),
                tax_id: s.tax_id.clone(),
                address: s.address.clone(),
                contact_person: s.contact_person.clone(),
                phone: s.phone.clone(),
                email: s.email.clone(),
                website: s.website.clone(),
                credit_rating: s.credit_rating.clone(),
                risk_level: s.risk_level.clone(),
                bank_name: s.bank_name.clone(),
                bank_account: s.bank_account.clone(),
                remarks: s.remarks.clone(),
                name_en: s.name_en.clone(),
                lead_time_days: s.lead_time_days,
                tenant_id: None,
            };
            // 补 tenant_id：从 s 里没有，单独查一次（轻量，仅后台同步用）
            let db = state.db.clone();
            let sno = s.supplier_no.clone();
            let tenant_id = sqlx::query_scalar::<_, Option<Uuid>>(
                "SELECT tenant_id FROM master_data.mdm_suppliers WHERE supplier_no = $1 AND deleted_at IS NULL",
            )
            .bind(&sno)
            .fetch_optional(&db)
            .await
            .ok()
            .flatten()
            .flatten();
            let mut payload = payload;
            payload.tenant_id = tenant_id;
            spawn_mdm_to_downstream(db, payload, SyncOp::Create);
            api_success(s)
        }
        Ok(None) => ApiResponse::from(TopemsError::Internal("创建供应商失败".to_string())),
        Err(e) => ApiResponse::from(map_write_error(e, "创建供应商")),
    }
}

/// PATCH /api/master-data/suppliers/:id —— 部分更新（只更新请求里给出的字段）。
pub async fn update_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierRequest>,
) -> ApiResponse<Supplier> {
    // 必填字段若在请求中给出但为空字符串，提前 400（不允许把 NOT NULL 列清空）
    if let Some(v) = req.name.as_ref() {
        if v.trim().is_empty() {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "name 不能为空字符串".to_string(),
            ));
        }
    }
    if let Some(v) = req.status.as_ref() {
        if v.trim().is_empty() {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "status 不能为空字符串".to_string(),
            ));
        }
    }
    if let Some(v) = req.risk_level.as_ref() {
        if v.trim().is_empty() {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "risk_level 不能为空字符串".to_string(),
            ));
        }
    }

    // category_code 一致性：若请求给了新值，校验字典
    if let Err(e) = validate_category_code(&state, &req.category_code).await {
        return ApiResponse::from(e);
    }

    let tenant = req_tenant_id(&headers);
    let row: Result<Option<Supplier>, sqlx::Error> = sqlx::query_as(
        r#"UPDATE master_data.mdm_suppliers SET
             name = COALESCE($2, name),
             status = COALESCE($3, status),
             risk_level = COALESCE($4, risk_level),
             legal_name = COALESCE($5, legal_name),
             category = COALESCE($6, category),
             category_code = COALESCE($7, category_code),
             tax_id = COALESCE($8, tax_id),
             address = COALESCE($9, address),
             contact_person = COALESCE($10, contact_person),
             phone = COALESCE($11, phone),
             email = COALESCE($12, email),
             website = COALESCE($13, website),
             credit_rating = COALESCE($14, credit_rating),
             bank_name = COALESCE($15, bank_name),
             bank_account = COALESCE($16, bank_account),
             remarks = COALESCE($17, remarks),
             name_en = COALESCE($18, name_en),
             lead_time_days = COALESCE($19, lead_time_days),
             updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
             AND ($20::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $20::uuid)
           RETURNING id::text, supplier_no, name, legal_name, category, category_code, status,
                     tax_id, address, contact_person, phone, email, website,
                     credit_rating, risk_level, bank_name, bank_account, remarks,
                     name_en, lead_time_days, source_system, source_id::text,
                     created_at, updated_at"#,
    )
    .bind(id)
    .bind(req.name)
    .bind(req.status)
    .bind(req.risk_level)
    .bind(req.legal_name)
    .bind(req.category)
    .bind(req.category_code)
    .bind(req.tax_id)
    .bind(req.address)
    .bind(req.contact_person)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.website)
    .bind(req.credit_rating)
    .bind(req.bank_name)
    .bind(req.bank_account)
    .bind(req.remarks)
    .bind(req.name_en)
    .bind(req.lead_time_days)
    .bind(tenant)
    .fetch_optional(&state.db)
    .await;

    match row {
        Ok(Some(s)) => {
            // 主写入已提交，后台同步到 scm/srm
            let db = state.db.clone();
            let sno = s.supplier_no.clone();
            let tenant_id = sqlx::query_scalar::<_, Option<Uuid>>(
                "SELECT tenant_id FROM master_data.mdm_suppliers WHERE supplier_no = $1 AND deleted_at IS NULL",
            )
            .bind(&sno)
            .fetch_optional(&db)
            .await
            .ok()
            .flatten()
            .flatten();
            let payload = SupplierSyncPayload {
                supplier_no: s.supplier_no.clone(),
                name: s.name.clone(),
                legal_name: s.legal_name.clone(),
                category: s.category.clone(),
                category_code: s.category_code.clone(),
                status: s.status.clone(),
                tax_id: s.tax_id.clone(),
                address: s.address.clone(),
                contact_person: s.contact_person.clone(),
                phone: s.phone.clone(),
                email: s.email.clone(),
                website: s.website.clone(),
                credit_rating: s.credit_rating.clone(),
                risk_level: s.risk_level.clone(),
                bank_name: s.bank_name.clone(),
                bank_account: s.bank_account.clone(),
                remarks: s.remarks.clone(),
                name_en: s.name_en.clone(),
                lead_time_days: s.lead_time_days,
                tenant_id,
            };
            spawn_mdm_to_downstream(db, payload, SyncOp::Update);
            api_success(s)
        }
        Ok(None) => ApiResponse::from(TopemsError::NotFound("供应商不存在".to_string())),
        Err(e) => ApiResponse::from(map_write_error(e, "更新供应商")),
    }
}

/// DELETE /api/master-data/suppliers/:id —— 软删（只置 deleted_at，绝不物理删除）。
pub async fn delete_supplier(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant = req_tenant_id(&headers);
    // RETURNING 拿到 supplier_no + tenant_id，用于后台同步软删 scm/srm
    let deleted: Result<Option<(String, Option<Uuid>)>, sqlx::Error> = sqlx::query_as(
        r#"UPDATE master_data.mdm_suppliers
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
             AND ($2::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id = $2::uuid)
           RETURNING supplier_no, tenant_id"#,
    )
    .bind(id)
    .bind(tenant)
    .fetch_optional(&state.db)
    .await;

    match deleted {
        Ok(Some((supplier_no, tenant_id))) => {
            // 主写入已提交，后台同步软删 scm/srm
            let db = state.db.clone();
            let payload = SupplierSyncPayload {
                supplier_no,
                name: String::new(),
                legal_name: None,
                category: None,
                category_code: None,
                status: String::new(),
                tax_id: None,
                address: None,
                contact_person: None,
                phone: None,
                email: None,
                website: None,
                credit_rating: None,
                risk_level: String::new(),
                bank_name: None,
                bank_account: None,
                remarks: None,
                name_en: None,
                lead_time_days: None,
                tenant_id,
            };
            spawn_mdm_to_downstream(db, payload, SyncOp::Delete);
            api_success("删除成功".to_string())
        }
        Ok(None) => ApiResponse::from(TopemsError::NotFound("供应商不存在".to_string())),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除供应商失败".to_string()))
        }
    }
}
