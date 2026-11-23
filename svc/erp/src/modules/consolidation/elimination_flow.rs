//! P4 内部交易：凭证扫描候选、对账汇总、抵消预演（只算不写）。
//!
//! 口径：
//!   - 台账 `erp.internal_transactions` 是唯一事实源；扫描只产候选。
//!   - 仅同一 active scope 内、期间内双方均在有效期内的公司对参与。
//!   - 金额全链路 Decimal，比较前量化到分（容差 0.00）。

use axum::{
    extract::{Extension, Query, State},
    Json,
};
use rust_decimal::Decimal;
use sqlx::FromRow;
use std::collections::{BTreeMap, HashMap, HashSet};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::consolidation::*;
use crate::modules::consolidation_calc::{
    account_pair_for_transaction_type, amount_to_cents, canonical_transaction_type,
    normalize_accounting_period, period_end_date, quantize_money,
};

use super::common::require_action_permission;
use super::ApiState;

#[derive(Debug, Clone)]
pub(crate) struct EligibleCompany {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug)]
pub(crate) enum ScopeLoadError {
    NotFound,
    Inactive,
    Db(sqlx::Error),
}

/// 加载合并范围内、期间内有效的成员公司。
pub(crate) async fn load_eligible_companies(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    scope_id: Uuid,
    period_end: chrono::NaiveDate,
) -> Result<Vec<EligibleCompany>, ScopeLoadError> {
    let status: Option<String> = sqlx::query_scalar(
        r#"
        SELECT status FROM erp.consolidation_scopes
        WHERE id = $1 AND deleted_at IS NULL
          AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL
               OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID,
                                       '00000000-0000-0000-0000-000000000000'))
        "#,
    )
    .bind(scope_id)
    .fetch_optional(&mut **txn)
    .await
    .map_err(ScopeLoadError::Db)?;

    let Some(status) = status else {
        return Err(ScopeLoadError::NotFound);
    };
    if !crate::modules::consolidation_scope_status::ConsolidationScopeStatus::from_db_str(&status)
        .map(crate::modules::consolidation_scope_status::ConsolidationScopeStatus::is_runnable)
        .unwrap_or(false)
    {
        return Err(ScopeLoadError::Inactive);
    }

    let rows: Vec<(Uuid, Option<String>)> = sqlx::query_as(only_own_schema_query!(
        "erp",
        r#"
        SELECT c.company_id, COALESCE(h.name, c.company_name)
        FROM erp.consolidation_scope_companies c
        LEFT JOIN hrm.companies h
               ON h.id = c.company_id AND h.deleted_at IS NULL
        WHERE c.scope_id = $1
          AND c.deleted_at IS NULL
          AND (c.effective_date IS NULL OR c.effective_date <= $2)
          AND (c.expiry_date IS NULL OR c.expiry_date >= $2)
        ORDER BY c.company_id
        "#,
        "hrm"
    ))
    .bind(scope_id)
    .bind(period_end)
    .fetch_all(&mut **txn)
    .await
    .map_err(ScopeLoadError::Db)?;

    Ok(rows
        .into_iter()
        .map(|(id, name)| EligibleCompany {
            id,
            name: name.unwrap_or_else(|| id.to_string()),
        })
        .collect())
}

fn scope_error<T>(err: ScopeLoadError) -> ApiResponse<T> {
    match err {
        ScopeLoadError::NotFound => ApiResponse::not_found("合并范围不存在"),
        ScopeLoadError::Inactive => ApiResponse::conflict("合并范围未启用，不能参与抵消"),
        ScopeLoadError::Db(e) => {
            tracing::error!("加载合并范围失败: {}", e);
            ApiResponse::server_error("加载合并范围失败")
        }
    }
}

fn normalized_period_or<T>(period: &str) -> Result<String, ApiResponse<T>> {
    normalize_accounting_period(period)
        .ok_or_else(|| ApiResponse::bad_request("period 格式无效，应为 YYYYMM（兼容 YYYY-MM）"))
}

// ── 凭证扫描：同额反向候选 ───────────────────────────────────────────

#[derive(Debug, Clone, FromRow)]
struct LedgerEntry {
    id: Uuid,
    company_id: Uuid,
    voucher_id: Uuid,
    account_code: String,
    debit: Decimal,
    credit: Decimal,
    aux_id: Option<Uuid>,
}

impl LedgerEntry {
    fn is_debit(&self) -> bool {
        self.debit > Decimal::ZERO
    }

    fn amount_cents(&self) -> i64 {
        amount_to_cents(if self.is_debit() {
            self.debit
        } else {
            self.credit
        })
    }
}

#[derive(Debug, Clone)]
struct MatchedPair {
    from: LedgerEntry,
    to: LedgerEntry,
    transaction_type: &'static str,
}

/// 按金额分组配对；有 aux 时要求同一业务对象，无 aux 时仅接受唯一匹配，避免臆测。
#[allow(clippy::indexing_slicing)] // 下标均来自同一向量的 enumerate/pop/过滤，长度关系由构造过程保证
fn pair_entries(
    from_entries: &[LedgerEntry],
    to_entries: &[LedgerEntry],
    transaction_type: &'static str,
    ambiguous_skipped: &mut i64,
) -> Vec<MatchedPair> {
    let mut pairs = Vec::new();
    let mut from_by_amount: BTreeMap<i64, Vec<&LedgerEntry>> = BTreeMap::new();
    let mut to_by_amount: BTreeMap<i64, Vec<&LedgerEntry>> = BTreeMap::new();
    for e in from_entries {
        from_by_amount.entry(e.amount_cents()).or_default().push(e);
    }
    for e in to_entries {
        to_by_amount.entry(e.amount_cents()).or_default().push(e);
    }

    for (cents, froms) in &from_by_amount {
        let Some(tos) = to_by_amount.get(cents) else {
            continue;
        };
        let mut used_from = vec![false; froms.len()];
        let mut used_to = vec![false; tos.len()];

        // 1) aux 明确且相同：一对一配对
        let mut to_by_aux: HashMap<Uuid, Vec<usize>> = HashMap::new();
        for (idx, e) in tos.iter().enumerate() {
            if let Some(aux) = e.aux_id {
                to_by_aux.entry(aux).or_default().push(idx);
            }
        }
        for (fi, f) in froms.iter().enumerate() {
            let Some(aux) = f.aux_id else { continue };
            let Some(candidates) = to_by_aux.get_mut(&aux) else {
                continue;
            };
            while let Some(ti) = candidates.pop() {
                if !used_to[ti] {
                    used_from[fi] = true;
                    used_to[ti] = true;
                    pairs.push(MatchedPair {
                        from: (**f).clone(),
                        to: (*tos[ti]).clone(),
                        transaction_type,
                    });
                    break;
                }
            }
        }

        // 2) 双方都无 aux 且各仅剩 1 条：视为唯一匹配（没有任何辅助线索时仍可确认同额反向）
        let remain_from: Vec<usize> = (0..froms.len()).filter(|i| !used_from[*i]).collect();
        let remain_to: Vec<usize> = (0..tos.len()).filter(|i| !used_to[*i]).collect();
        let remain_from_no_aux = remain_from.iter().all(|i| froms[*i].aux_id.is_none());
        let remain_to_no_aux = remain_to.iter().all(|i| tos[*i].aux_id.is_none());
        if remain_from.len() == 1 && remain_to.len() == 1 && remain_from_no_aux && remain_to_no_aux
        {
            pairs.push(MatchedPair {
                from: (*froms[remain_from[0]]).clone(),
                to: (*tos[remain_to[0]]).clone(),
                transaction_type,
            });
        } else if !remain_from.is_empty() && !remain_to.is_empty() {
            // 还有未消解的一对多 / 单边 aux / 多条同额：不臆测
            *ambiguous_skipped +=
                i64::try_from(remain_from.len().min(remain_to.len())).unwrap_or(0);
        }
    }

    pairs
}

#[allow(clippy::indexing_slicing)] // i/j 由 0..len 枚举，越界不可能
fn scan_pairs(companies: &[EligibleCompany], entries: &[LedgerEntry]) -> (Vec<MatchedPair>, i64) {
    let mut matched = Vec::new();
    let mut ambiguous_skipped = 0i64;

    let by_company: HashMap<Uuid, Vec<&LedgerEntry>> = {
        let mut map: HashMap<Uuid, Vec<&LedgerEntry>> = HashMap::new();
        for e in entries {
            map.entry(e.company_id).or_default().push(e);
        }
        map
    };

    let account_entries = |company: Uuid, account: &str| -> Vec<LedgerEntry> {
        by_company
            .get(&company)
            .map(|list| {
                list.iter()
                    .filter(|e| e.account_code == account)
                    .map(|e| (**e).clone())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default()
    };

    for i in 0..companies.len() {
        for j in (i + 1)..companies.len() {
            let a = companies[i].id;
            let b = companies[j].id;

            // 往来：1122（应收方）↔ 2202（应付方），同额且一借一贷
            for (from, to) in [(a, b), (b, a)] {
                let from_1122 = account_entries(from, "1122");
                let to_2202 = account_entries(to, "2202");
                let from_credit: Vec<LedgerEntry> = from_1122
                    .iter()
                    .filter(|e| !e.is_debit())
                    .cloned()
                    .collect();
                let from_debit: Vec<LedgerEntry> =
                    from_1122.iter().filter(|e| e.is_debit()).cloned().collect();
                let mut pairs = pair_entries(
                    &from_credit,
                    &to_2202,
                    "current_account",
                    &mut ambiguous_skipped,
                );
                matched.append(&mut pairs);
                // 反向：应收方有借方发生额（确认应收/销售），应付方有贷方发生额
                let to_2202_credit: Vec<LedgerEntry> =
                    to_2202.iter().filter(|e| !e.is_debit()).cloned().collect();
                let mut pairs = pair_entries(
                    &from_debit,
                    &to_2202_credit,
                    "current_account",
                    &mut ambiguous_skipped,
                );
                matched.append(&mut pairs);
            }

            // 购销：6001（卖方收入）↔ 6401（买方成本）
            for (seller, buyer) in [(a, b), (b, a)] {
                let revenue: Vec<LedgerEntry> = account_entries(seller, "6001")
                    .into_iter()
                    .filter(|e| !e.is_debit())
                    .collect();
                let cost: Vec<LedgerEntry> = account_entries(buyer, "6401")
                    .into_iter()
                    .filter(|e| e.is_debit())
                    .collect();
                let mut pairs =
                    pair_entries(&revenue, &cost, "sale_purchase", &mut ambiguous_skipped);
                matched.append(&mut pairs);
            }
        }
    }

    // 同一对分录只保留一次（1122/2202 两个方向不会重复，但防御性去重）
    let mut seen = HashSet::new();
    matched.retain(|p| seen.insert((p.from.id, p.to.id)));
    (matched, ambiguous_skipped)
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-scan:write"])),
    path = "/erp/consolidation/elimination-candidates/scan",
    tag = "Consolidation",
    responses((status = 200, description = "凭证扫描完成（仅产候选）", body = ApiResponse<serde_json::Value>))
)]
pub async fn scan_elimination_candidates(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ScanCandidatesRequest>,
) -> ApiResponse<ScanCandidatesResult> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-scan:write") {
        return e.0;
    }
    let period = match normalized_period_or::<ScanCandidatesResult>(&req.period) {
        Ok(p) => p,
        Err(resp) => return resp,
    };
    let Some(period_end) = period_end_date(&period) else {
        return ApiResponse::bad_request("period 无效");
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let result = match scan_core(txn, req.scope_id, &period, period_end).await {
        Ok(result) => result,
        Err(e) => return scope_error(e),
    };

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::server_error("事务提交失败");
        }
    }

    ApiResponse::success(result, "凭证扫描完成（仅产候选，不自动定性）")
}

pub(crate) async fn scan_core(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    scope_id: Uuid,
    period: &str,
    period_end: chrono::NaiveDate,
) -> Result<ScanCandidatesResult, ScopeLoadError> {
    let companies = load_eligible_companies(txn, scope_id, period_end).await?;
    if companies.len() < 2 {
        return Ok(ScanCandidatesResult {
            scope_id,
            period: period.to_string(),
            eligible_company_count: i64::try_from(companies.len()).unwrap_or(0),
            pairs_scanned: 0,
            candidates_created: 0,
            candidates_existing: 0,
            candidates_ambiguous_skipped: 0,
        });
    }

    let company_ids: Vec<Uuid> = companies.iter().map(|c| c.id).collect();
    let entries: Vec<LedgerEntry> = sqlx::query_as(only_own_schema_query!(
        "erp",
        r#"
        SELECT l.id,
               l.company_id,
               l.voucher_id,
               LEFT(l.account_code, 4) AS account_code,
               l.debit,
               l.credit,
               l.aux_id
        FROM finance.core_finance_ledger l
        JOIN finance.core_finance_vouchers v ON v.id = l.voucher_id
        WHERE l.period = $1
          AND l.deleted_at IS NULL
          AND v.deleted_at IS NULL
          AND v.status = 'posted'
          AND l.company_id = ANY($2)
          AND LEFT(l.account_code, 4) IN ('1122', '2202', '6001', '6401')
          AND (l.debit > 0 OR l.credit > 0)
        "#,
        "finance"
    ))
    .bind(period)
    .bind(&company_ids)
    .fetch_all(&mut **txn)
    .await
    .map_err(ScopeLoadError::Db)?;

    let (matched, ambiguous_skipped) = scan_pairs(&companies, &entries);
    let pairs_scanned =
        i64::try_from(companies.len() * companies.len().saturating_sub(1) / 2).unwrap_or(0);

    let mut created = 0i64;
    let mut existing = 0i64;
    for pair in &matched {
        let amount = if pair.from.is_debit() {
            pair.from.debit
        } else {
            pair.from.credit
        };
        let (debit_entry, credit_entry) = if pair.from.is_debit() {
            (&pair.from, &pair.to)
        } else {
            (&pair.to, &pair.from)
        };
        let Some(account_pair) = account_pair_for_transaction_type(pair.transaction_type) else {
            continue;
        };
        let result = sqlx::query(
            r#"
            INSERT INTO erp.elimination_candidates
            (id, tenant_id, scope_id, period, from_company_id, to_company_id,
             transaction_type, account_pair, amount, debit_voucher_id, credit_voucher_id,
             from_ledger_id, to_ledger_id, aux_type, aux_id, status, created_at)
            VALUES (gen_random_uuid(),
                    erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::UUID),
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, $12, 'pending', NOW())
            ON CONFLICT (scope_id, period, from_ledger_id, to_ledger_id) DO NOTHING
            "#,
        )
        .bind(scope_id)
        .bind(period)
        .bind(pair.from.company_id)
        .bind(pair.to.company_id)
        .bind(pair.transaction_type)
        .bind(account_pair)
        .bind(quantize_money(amount))
        .bind(debit_entry.voucher_id)
        .bind(credit_entry.voucher_id)
        .bind(pair.from.id)
        .bind(pair.to.id)
        .bind(pair.to.aux_id.or(pair.from.aux_id))
        .execute(&mut **txn)
        .await
        .map_err(ScopeLoadError::Db)?;
        if result.rows_affected() > 0 {
            created += 1;
        } else {
            existing += 1;
        }
    }

    Ok(ScanCandidatesResult {
        scope_id,
        period: period.to_string(),
        eligible_company_count: i64::try_from(companies.len()).unwrap_or(0),
        pairs_scanned,
        candidates_created: created,
        candidates_existing: existing,
        candidates_ambiguous_skipped: ambiguous_skipped,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:consolidation-reconcile:read"])),
    path = "/erp/consolidation/elimination-candidates",
    tag = "Consolidation",
    params(
        ("scope_id" = String, Query, description = "合并范围ID"),
        ("period" = String, Query, description = "期间 YYYYMM"),
        ("status" = Option<String>, Query, description = "候选状态")
    ),
    responses((status = 200, description = "候选列表", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_elimination_candidates(
    Extension(claims): Extension<Claims>,
    Query(query): Query<CandidateListQuery>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<EliminationCandidate>> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-reconcile:read") {
        return e.0;
    }
    let Ok(period) = normalized_period_or::<Vec<EliminationCandidate>>(&query.period) else {
        return ApiResponse::bad_request("period 格式无效，应为 YYYYMM（兼容 YYYY-MM）");
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    match sqlx::query_as::<_, EliminationCandidate>(
        r#"
        SELECT * FROM erp.elimination_candidates
        WHERE scope_id = $1 AND period = $2
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT 500
        "#,
    )
    .bind(query.scope_id)
    .bind(&period)
    .bind(&query.status)
    .fetch_all(&mut **txn)
    .await
    {
        Ok(rows) => ApiResponse::success(rows, "获取抵消候选成功"),
        Err(e) => {
            tracing::error!("获取抵消候选失败: {}", e);
            ApiResponse::server_error("获取抵消候选失败")
        }
    }
}

// ── 对账汇总 ────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow)]
struct LedgerRow {
    from_company_id: Uuid,
    to_company_id: Uuid,
    transaction_type: String,
    amount: Decimal,
    remaining_amount: Decimal,
    elimination_status: String,
}

struct PairAggregate {
    company_a: Uuid,
    company_b: Uuid,
    transaction_type: String,
    amount_a: Decimal,
    amount_b: Decimal,
    remaining_a: Decimal,
    remaining_b: Decimal,
    statuses: Vec<String>,
    count: i64,
}

impl PairAggregate {
    fn difference(&self) -> Decimal {
        quantize_money(self.amount_a - self.amount_b)
    }

    fn status(&self) -> &'static str {
        if self.statuses.iter().any(|s| s == "disputed") {
            "disputed"
        } else if self.statuses.iter().all(|s| s == "eliminated") {
            "eliminated"
        } else if self.statuses.iter().all(|s| s == "confirmed")
            && amount_to_cents(self.amount_a) == amount_to_cents(self.amount_b)
            && self.amount_a > Decimal::ZERO
            && self.amount_b > Decimal::ZERO
        {
            "confirmed"
        } else {
            "unmatched"
        }
    }
}

async fn build_reconciliation(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    companies: &[EligibleCompany],
    period: &str,
) -> Result<Vec<PairAggregate>, sqlx::Error> {
    let company_ids: Vec<Uuid> = companies.iter().map(|c| c.id).collect();
    let rows: Vec<LedgerRow> = sqlx::query_as(
        r#"
        SELECT from_company_id, to_company_id, transaction_type, amount, remaining_amount, elimination_status
        FROM erp.internal_transactions
        WHERE period = $1
          AND deleted_at IS NULL
          AND from_company_id = ANY($2)
          AND to_company_id = ANY($2)
        ORDER BY from_company_id, to_company_id, transaction_type
        "#,
    )
    .bind(period)
    .bind(&company_ids)
    .fetch_all(&mut **txn)
    .await?;

    let mut grouped: BTreeMap<(Uuid, Uuid, String), PairAggregate> = BTreeMap::new();
    for row in rows {
        let (a, b) = if row.from_company_id <= row.to_company_id {
            (row.from_company_id, row.to_company_id)
        } else {
            (row.to_company_id, row.from_company_id)
        };
        let entry = grouped
            .entry((a, b, row.transaction_type.clone()))
            .or_insert_with(|| PairAggregate {
                company_a: a,
                company_b: b,
                transaction_type: row.transaction_type.clone(),
                amount_a: Decimal::ZERO,
                amount_b: Decimal::ZERO,
                remaining_a: Decimal::ZERO,
                remaining_b: Decimal::ZERO,
                statuses: Vec::new(),
                count: 0,
            });
        if row.from_company_id == a {
            entry.amount_a += row.amount;
            entry.remaining_a += row.remaining_amount;
        } else {
            entry.amount_b += row.amount;
            entry.remaining_b += row.remaining_amount;
        }
        entry.statuses.push(row.elimination_status);
        entry.count += 1;
    }

    Ok(grouped.into_values().collect())
}

fn company_name(companies: &[EligibleCompany], id: Uuid) -> String {
    companies
        .iter()
        .find(|c| c.id == id)
        .map(|c| c.name.clone())
        .unwrap_or_else(|| id.to_string())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:consolidation-reconcile:read"])),
    path = "/erp/consolidation/reconciliations",
    tag = "Consolidation",
    params(
        ("scope_id" = String, Query, description = "合并范围ID"),
        ("period" = String, Query, description = "期间 YYYYMM")
    ),
    responses((status = 200, description = "内部交易对账汇总", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_reconciliation_summary(
    Extension(claims): Extension<Claims>,
    Query(query): Query<ReconciliationQuery>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ReconciliationSummary> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-reconcile:read") {
        return e.0;
    }
    let Ok(period) = normalized_period_or::<ReconciliationSummary>(&query.period) else {
        return ApiResponse::bad_request("period 格式无效，应为 YYYYMM（兼容 YYYY-MM）");
    };
    let Some(period_end) = period_end_date(&period) else {
        return ApiResponse::bad_request("period 无效");
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let summary = match reconciliation_core(txn, query.scope_id, &period, period_end).await {
        Ok(summary) => summary,
        Err(e) => return scope_error(e),
    };

    ApiResponse::success(summary, "获取对账汇总成功")
}

pub(crate) async fn reconciliation_core(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    scope_id: Uuid,
    period: &str,
    period_end: chrono::NaiveDate,
) -> Result<ReconciliationSummary, ScopeLoadError> {
    let companies = load_eligible_companies(txn, scope_id, period_end).await?;
    let aggregates = build_reconciliation(txn, &companies, period)
        .await
        .map_err(ScopeLoadError::Db)?;

    let pairs = aggregates
        .into_iter()
        .map(|agg| ReconciliationPair {
            company_a_id: agg.company_a,
            company_a_name: company_name(&companies, agg.company_a),
            company_b_id: agg.company_b,
            company_b_name: company_name(&companies, agg.company_b),
            transaction_type: agg.transaction_type.clone(),
            account_pair: account_pair_for_transaction_type(&agg.transaction_type)
                .unwrap_or("other")
                .to_string(),
            company_a_amount: quantize_money(agg.amount_a),
            company_b_amount: quantize_money(agg.amount_b),
            difference: agg.difference(),
            remaining_amount: quantize_money(agg.remaining_a + agg.remaining_b),
            transaction_count: agg.count,
            status: agg.status().to_string(),
        })
        .collect();

    Ok(ReconciliationSummary {
        scope_id,
        period: period.to_string(),
        pairs,
    })
}

// ── 抵消预演：只算不写 ──────────────────────────────────────────────

fn pair_filter_matches(filter: Option<&Vec<Vec<Uuid>>>, a: Uuid, b: Uuid) -> bool {
    match filter {
        None => true,
        Some(pairs) => pairs.iter().any(|p| {
            matches!(
                p.as_slice(),
                [x, y] if (*x == a && *y == b) || (*x == b && *y == a)
            )
        }),
    }
}

fn draft_voucher(agg: &PairAggregate, amount: Decimal) -> Option<EliminationDraftVoucher> {
    if amount <= Decimal::ZERO {
        return None;
    }
    match canonical_transaction_type(&agg.transaction_type)? {
        "current_account" => Some(EliminationDraftVoucher {
            transaction_type: "current_account".to_string(),
            account_pair: "1122-2202".to_string(),
            amount,
            lines: vec![
                EliminationDraftLine {
                    company_id: agg.company_b,
                    account_code: "2202".to_string(),
                    debit: amount,
                    credit: Decimal::ZERO,
                },
                EliminationDraftLine {
                    company_id: agg.company_a,
                    account_code: "1122".to_string(),
                    debit: Decimal::ZERO,
                    credit: amount,
                },
            ],
        }),
        "sale_purchase" => Some(EliminationDraftVoucher {
            transaction_type: "sale_purchase".to_string(),
            account_pair: "6001-6401".to_string(),
            amount,
            lines: vec![
                EliminationDraftLine {
                    company_id: agg.company_a,
                    account_code: "6001".to_string(),
                    debit: amount,
                    credit: Decimal::ZERO,
                },
                EliminationDraftLine {
                    company_id: agg.company_b,
                    account_code: "6401".to_string(),
                    debit: Decimal::ZERO,
                    credit: amount,
                },
            ],
        }),
        _ => None,
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-reconcile:read"])),
    path = "/erp/consolidation/eliminations/preview",
    tag = "Consolidation",
    responses((status = 200, description = "抵消预演（不落库、不生成凭证）", body = ApiResponse<serde_json::Value>))
)]
pub async fn preview_eliminations(
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<EliminationPreviewRequest>,
) -> ApiResponse<EliminationPreview> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-reconcile:read") {
        return e.0;
    }
    let Ok(period) = normalized_period_or::<EliminationPreview>(&req.period) else {
        return ApiResponse::bad_request("period 格式无效，应为 YYYYMM（兼容 YYYY-MM）");
    };
    let Some(period_end) = period_end_date(&period) else {
        return ApiResponse::bad_request("period 无效");
    };

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let preview = match preview_core(
        txn,
        req.scope_id,
        &period,
        period_end,
        req.company_pairs.as_ref(),
    )
    .await
    {
        Ok(preview) => preview,
        Err(e) => return scope_error(e),
    };

    ApiResponse::success(preview, "抵消预演完成（不落库、不生成凭证）")
}

pub(crate) async fn preview_core(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    scope_id: Uuid,
    period: &str,
    period_end: chrono::NaiveDate,
    company_pairs: Option<&Vec<Vec<Uuid>>>,
) -> Result<EliminationPreview, ScopeLoadError> {
    let companies = load_eligible_companies(txn, scope_id, period_end).await?;
    let aggregates = build_reconciliation(txn, &companies, period)
        .await
        .map_err(ScopeLoadError::Db)?;

    let mut total = Decimal::ZERO;
    let mut blocked = false;
    let mut pairs = Vec::new();

    for agg in &aggregates {
        if !pair_filter_matches(company_pairs, agg.company_a, agg.company_b) {
            continue;
        }
        let status = agg.status();
        let difference = agg.difference();
        let open_min = if agg.remaining_a < agg.remaining_b {
            agg.remaining_a
        } else {
            agg.remaining_b
        };
        let side_min = if agg.amount_a < agg.amount_b {
            agg.amount_a
        } else {
            agg.amount_b
        };
        let same_amount = amount_to_cents(agg.amount_a) == amount_to_cents(agg.amount_b);

        // 2202↔1122 取双方较小值；6001↔6401 仅在双方同额时可抵消。
        // 差异仍保留在 remaining_amount/difference 中，并触发阻断，不做差异分录。
        let eliminable = if status == "disputed"
            || agg.amount_a <= Decimal::ZERO
            || agg.amount_b <= Decimal::ZERO
        {
            Decimal::ZERO
        } else {
            let by_type = match canonical_transaction_type(&agg.transaction_type) {
                Some("current_account") => side_min,
                Some("sale_purchase") if same_amount => side_min,
                _ => Decimal::ZERO,
            };
            let capped = if by_type < open_min {
                by_type
            } else {
                open_min
            };
            quantize_money(if capped > Decimal::ZERO {
                capped
            } else {
                Decimal::ZERO
            })
        };

        let mut block_reasons = Vec::new();
        if status == "disputed" {
            block_reasons.push("存在争议台账".to_string());
        } else if status == "unmatched" {
            block_reasons.push("双方金额不一致或存在未确认/单边未达台账".to_string());
        }
        if amount_to_cents(difference) != 0 {
            block_reasons.push(format!("差额 {} 未清零", difference));
        }
        let pair_blocked = !block_reasons.is_empty();
        blocked = blocked || pair_blocked;
        total += eliminable;

        pairs.push(EliminationPreviewPair {
            company_a_id: agg.company_a,
            company_a_name: company_name(&companies, agg.company_a),
            company_b_id: agg.company_b,
            company_b_name: company_name(&companies, agg.company_b),
            transaction_type: agg.transaction_type.clone(),
            account_pair: account_pair_for_transaction_type(&agg.transaction_type)
                .unwrap_or("other")
                .to_string(),
            company_a_amount: quantize_money(agg.amount_a),
            company_b_amount: quantize_money(agg.amount_b),
            difference,
            remaining_amount: quantize_money(agg.remaining_a + agg.remaining_b),
            transaction_count: agg.count,
            status: status.to_string(),
            eliminable_amount: eliminable,
            blocked: pair_blocked,
            block_reasons,
            draft_voucher: draft_voucher(agg, eliminable),
        });
    }

    Ok(EliminationPreview {
        scope_id,
        period: period.to_string(),
        blocked,
        total_eliminable: quantize_money(total),
        pairs,
    })
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    #![cfg(feature = "db-tests")]
    use super::*;

    fn entry(
        id: Uuid,
        company: Uuid,
        voucher: Uuid,
        account: &str,
        debit: i64,
        credit: i64,
        aux: Option<Uuid>,
    ) -> LedgerEntry {
        LedgerEntry {
            id,
            company_id: company,
            voucher_id: voucher,
            account_code: account.to_string(),
            debit: Decimal::from(debit),
            credit: Decimal::from(credit),
            aux_id: aux,
        }
    }

    #[test]
    fn scan_pairs_matches_same_amount_opposite_direction() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let companies = vec![
            EligibleCompany {
                id: a,
                name: "A".into(),
            },
            EligibleCompany {
                id: b,
                name: "B".into(),
            },
        ];
        let entries = vec![
            entry(Uuid::new_v4(), a, Uuid::new_v4(), "1122", 0, 10000, None),
            entry(Uuid::new_v4(), b, Uuid::new_v4(), "2202", 10000, 0, None),
        ];
        let (pairs, ambiguous) = scan_pairs(&companies, &entries);
        assert_eq!(pairs.len(), 1);
        assert_eq!(ambiguous, 0);
        assert_eq!(pairs[0].transaction_type, "current_account");
        assert_eq!(pairs[0].from.company_id, a);
        assert_eq!(pairs[0].to.company_id, b);
    }

    #[test]
    fn scan_pairs_ignores_amount_mismatch() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let companies = vec![
            EligibleCompany {
                id: a,
                name: "A".into(),
            },
            EligibleCompany {
                id: b,
                name: "B".into(),
            },
        ];
        let entries = vec![
            entry(Uuid::new_v4(), a, Uuid::new_v4(), "1122", 0, 10000, None),
            entry(Uuid::new_v4(), b, Uuid::new_v4(), "2202", 9999, 0, None),
        ];
        let (pairs, _) = scan_pairs(&companies, &entries);
        assert!(pairs.is_empty());
    }

    #[test]
    fn scan_pairs_does_not_guess_when_ambiguous() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let companies = vec![
            EligibleCompany {
                id: a,
                name: "A".into(),
            },
            EligibleCompany {
                id: b,
                name: "B".into(),
            },
        ];
        let entries = vec![
            entry(Uuid::new_v4(), a, Uuid::new_v4(), "1122", 0, 10000, None),
            entry(Uuid::new_v4(), a, Uuid::new_v4(), "1122", 0, 10000, None),
            entry(Uuid::new_v4(), b, Uuid::new_v4(), "2202", 10000, 0, None),
        ];
        let (pairs, ambiguous) = scan_pairs(&companies, &entries);
        assert!(pairs.is_empty());
        assert_eq!(ambiguous, 1);
    }

    #[test]
    fn scan_pairs_uses_aux_to_disambiguate() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let aux = Uuid::new_v4();
        let companies = vec![
            EligibleCompany {
                id: a,
                name: "A".into(),
            },
            EligibleCompany {
                id: b,
                name: "B".into(),
            },
        ];
        let entries = vec![
            entry(
                Uuid::new_v4(),
                a,
                Uuid::new_v4(),
                "1122",
                0,
                10000,
                Some(aux),
            ),
            entry(
                Uuid::new_v4(),
                a,
                Uuid::new_v4(),
                "1122",
                0,
                10000,
                Some(Uuid::new_v4()),
            ),
            entry(
                Uuid::new_v4(),
                b,
                Uuid::new_v4(),
                "2202",
                10000,
                0,
                Some(aux),
            ),
        ];
        let (pairs, _) = scan_pairs(&companies, &entries);
        assert_eq!(pairs.len(), 1);
        assert_eq!(pairs[0].from.aux_id, Some(aux));
    }

    #[test]
    fn preview_uses_smaller_side() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let agg = PairAggregate {
            company_a: a,
            company_b: b,
            transaction_type: "current_account".into(),
            amount_a: Decimal::from(10000),
            amount_b: Decimal::from(10000),
            remaining_a: Decimal::from(10000),
            remaining_b: Decimal::from(10000),
            statuses: vec!["confirmed".into(), "confirmed".into()],
            count: 2,
        };
        assert_eq!(agg.status(), "confirmed");
        let draft = draft_voucher(&agg, Decimal::from(10000)).unwrap();
        assert_eq!(draft.lines.len(), 2);
        assert_eq!(draft.account_pair, "1122-2202");
        assert_eq!(draft.lines[0].account_code, "2202");
        assert_eq!(draft.lines[0].debit, Decimal::from(10000));
        assert_eq!(draft.lines[1].account_code, "1122");
        assert_eq!(draft.lines[1].credit, Decimal::from(10000));
    }

    #[test]
    fn reconciliation_status_blocks_on_difference() {
        let agg = PairAggregate {
            company_a: Uuid::new_v4(),
            company_b: Uuid::new_v4(),
            transaction_type: "current_account".into(),
            amount_a: Decimal::from(10000),
            amount_b: Decimal::from(9999),
            remaining_a: Decimal::from(10000),
            remaining_b: Decimal::from(9999),
            statuses: vec!["confirmed".into(), "confirmed".into()],
            count: 2,
        };
        assert_eq!(agg.status(), "unmatched");
        assert_eq!(agg.difference(), Decimal::new(1, 0));
    }

    // ── 两公司夹具：外部不进候选、内部进候选、较小值、差异阻断 ─────────

    async fn setup_db(pool: &sqlx::PgPool) {
        for sql in [
            "CREATE SCHEMA IF NOT EXISTS hrm",
            "CREATE SCHEMA IF NOT EXISTS erp",
            // 与迁移 20261114180000 保持一致：写路径与 RLS 策略都依赖该解析函数
            r#"CREATE OR REPLACE FUNCTION erp.group_tenant_of(p_tenant uuid) RETURNS uuid
                LANGUAGE sql STABLE AS $fn$
                SELECT CASE
                    WHEN p_tenant IS NULL THEN NULL
                    WHEN p_tenant = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL
                    ELSE p_tenant
                END
                $fn$"#,
            "CREATE SCHEMA IF NOT EXISTS finance",
            r#"CREATE TABLE IF NOT EXISTS hrm.companies (
                id uuid PRIMARY KEY, tenant_id uuid NOT NULL, name varchar(255) NOT NULL,
                deleted_at timestamptz)"#,
            r#"CREATE TABLE IF NOT EXISTS erp.consolidation_scopes (
                id uuid PRIMARY KEY, tenant_id uuid, code varchar(64), name varchar(255),
                status varchar(20) NOT NULL DEFAULT 'active', deleted_at timestamptz)"#,
            r#"CREATE TABLE IF NOT EXISTS erp.consolidation_scope_companies (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid,
                scope_id uuid NOT NULL, company_id uuid NOT NULL, company_name varchar(255),
                effective_date date, expiry_date date, deleted_at timestamptz)"#,
            r#"CREATE TABLE IF NOT EXISTS erp.internal_transactions (
                id uuid PRIMARY KEY, tenant_id uuid, transaction_no varchar(100),
                transaction_date date, period varchar(7), from_company_id uuid,
                from_company_name varchar(255), to_company_id uuid, to_company_name varchar(255),
                transaction_type varchar(32), description text, amount numeric,
                currency varchar(10) DEFAULT 'CNY', elimination_status varchar(20) DEFAULT 'unmatched',
                eliminated_amount numeric DEFAULT 0, remaining_amount numeric DEFAULT 0,
                voucher_id uuid, elimination_voucher_id uuid, created_at timestamptz DEFAULT now(),
                deleted_at timestamptz, confirmed_at timestamptz, confirmed_by varchar(100),
                disputed_at timestamptz, disputed_by varchar(100), disputed_reason text)"#,
            r#"CREATE TABLE IF NOT EXISTS erp.elimination_candidates (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid, scope_id uuid NOT NULL,
                period varchar(7) NOT NULL, from_company_id uuid NOT NULL, to_company_id uuid NOT NULL,
                transaction_type varchar(32) NOT NULL, account_pair varchar(16) NOT NULL,
                amount numeric(20,2) NOT NULL, debit_voucher_id uuid NOT NULL, credit_voucher_id uuid NOT NULL,
                from_ledger_id uuid NOT NULL, to_ledger_id uuid NOT NULL, aux_type varchar(32), aux_id uuid,
                status varchar(20) NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_elimination_candidates_source UNIQUE (scope_id, period, from_ledger_id, to_ledger_id))"#,
            r#"CREATE TABLE IF NOT EXISTS finance.core_finance_vouchers (
                id uuid PRIMARY KEY, status varchar(20) NOT NULL, deleted_at timestamptz)"#,
            r#"CREATE TABLE IF NOT EXISTS finance.core_finance_ledger (
                id uuid PRIMARY KEY, tenant_id uuid, company_id uuid, voucher_id uuid,
                account_code varchar(32), debit numeric, credit numeric, aux_id uuid,
                period varchar(7), deleted_at timestamptz)"#,
        ] {
            sqlx::query(sql).execute(pool).await.unwrap();
        }
    }

    async fn insert_company(pool: &sqlx::PgPool, tenant: Uuid, name: &str) -> Uuid {
        let id = Uuid::new_v4();
        sqlx::query(only_own_schema_query!(
            "erp",
            "INSERT INTO hrm.companies (id, tenant_id, name) VALUES ($1, $2, $3)",
            "hrm"
        ))
        .bind(id)
        .bind(tenant)
        .bind(name)
        .execute(pool)
        .await
        .unwrap();
        id
    }

    async fn insert_member(
        pool: &sqlx::PgPool,
        tenant: Uuid,
        scope: Uuid,
        company: Uuid,
        expiry: Option<chrono::NaiveDate>,
    ) {
        sqlx::query(
            r#"INSERT INTO erp.consolidation_scope_companies
               (tenant_id, scope_id, company_id, company_name, effective_date, expiry_date)
               VALUES ($1, $2, $3, 'member', '2026-01-01', $4)"#,
        )
        .bind(tenant)
        .bind(scope)
        .bind(company)
        .bind(expiry)
        .execute(pool)
        .await
        .unwrap();
    }

    async fn insert_voucher(pool: &sqlx::PgPool) -> Uuid {
        let id = Uuid::new_v4();
        sqlx::query(only_own_schema_query!(
            "erp",
            "INSERT INTO finance.core_finance_vouchers (id, status) VALUES ($1, 'posted')",
            "finance"
        ))
        .bind(id)
        .execute(pool)
        .await
        .unwrap();
        id
    }

    async fn insert_ledger(
        pool: &sqlx::PgPool,
        tenant: Uuid,
        company: Uuid,
        voucher: Uuid,
        account: &str,
        debit: Decimal,
        credit: Decimal,
        period: &str,
    ) {
        sqlx::query(only_own_schema_query!(
            "erp",
            r#"INSERT INTO finance.core_finance_ledger
               (id, tenant_id, company_id, voucher_id, account_code, debit, credit, period)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)"#,
            "finance"
        ))
        .bind(tenant)
        .bind(company)
        .bind(voucher)
        .bind(account)
        .bind(debit)
        .bind(credit)
        .bind(period)
        .execute(pool)
        .await
        .unwrap();
    }

    async fn insert_tx(
        pool: &sqlx::PgPool,
        tenant: Uuid,
        period: &str,
        from: Uuid,
        to: Uuid,
        amount: Decimal,
        status: &str,
    ) {
        sqlx::query(
            r#"INSERT INTO erp.internal_transactions
               (id, tenant_id, transaction_no, transaction_date, period, from_company_id,
                to_company_id, transaction_type, amount, currency, elimination_status,
                eliminated_amount, remaining_amount)
               VALUES (gen_random_uuid(), $1, $2, '2026-11-15', $3, $4, $5,
                       'current_account', $6, 'CNY', $7, 0, $6)"#,
        )
        .bind(tenant)
        .bind(format!("IT-{}", Uuid::new_v4().simple()))
        .bind(period)
        .bind(from)
        .bind(to)
        .bind(amount)
        .bind(status)
        .execute(pool)
        .await
        .unwrap();
    }

    async fn new_scope(pool: &sqlx::PgPool, tenant: Uuid) -> Uuid {
        let id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO erp.consolidation_scopes (id, tenant_id, code, name, status) VALUES ($1, $2, 'S1', '范围', 'active')",
        )
        .bind(id)
        .bind(tenant)
        .execute(pool)
        .await
        .unwrap();
        id
    }

    topems_test_support::sqlx_dsn_guard!();
    #[sqlx::test(migrations = false)]
    async fn scan_only_produces_candidates_for_eligible_company_pair(pool: sqlx::PgPool) {
        setup_db(&pool).await;
        let tenant = Uuid::new_v4();
        let scope = new_scope(&pool, tenant).await;
        let a = insert_company(&pool, tenant, "A公司").await;
        let b = insert_company(&pool, tenant, "B公司").await;
        let c = insert_company(&pool, tenant, "C外部公司").await;
        insert_member(&pool, tenant, scope, a, None).await;
        insert_member(&pool, tenant, scope, b, None).await;
        // C 是过期成员，按外部交易处理
        insert_member(
            &pool,
            tenant,
            scope,
            c,
            chrono::NaiveDate::from_ymd_opt(2026, 10, 31),
        )
        .await;

        let v1 = insert_voucher(&pool).await;
        let v2 = insert_voucher(&pool).await;
        let v3 = insert_voucher(&pool).await;
        let v4 = insert_voucher(&pool).await;
        // 内部：A 贷 1122 100.00 / B 借 2202 100.00
        insert_ledger(
            &pool,
            tenant,
            a,
            v1,
            "1122",
            Decimal::ZERO,
            Decimal::new(10000, 2),
            "202611",
        )
        .await;
        insert_ledger(
            &pool,
            tenant,
            b,
            v2,
            "2202",
            Decimal::new(10000, 2),
            Decimal::ZERO,
            "202611",
        )
        .await;
        // 外部：A 贷 1122 50.00 / C 借 2202 50.00（C 过期，不应进候选）
        insert_ledger(
            &pool,
            tenant,
            a,
            v3,
            "1122",
            Decimal::ZERO,
            Decimal::new(5000, 2),
            "202611",
        )
        .await;
        insert_ledger(
            &pool,
            tenant,
            c,
            v4,
            "2202",
            Decimal::new(5000, 2),
            Decimal::ZERO,
            "202611",
        )
        .await;

        let mut txn = pool.begin().await.unwrap();
        let period_end = chrono::NaiveDate::from_ymd_opt(2026, 11, 30).unwrap();
        let result = scan_core(&mut txn, scope, "202611", period_end)
            .await
            .unwrap();
        assert_eq!(result.eligible_company_count, 2);
        assert_eq!(result.candidates_created, 1, "只有 A/B 内部往来进入候选");

        let candidates: Vec<(Uuid, Uuid, Decimal, String)> = sqlx::query_as(
            "SELECT from_company_id, to_company_id, amount, status FROM erp.elimination_candidates",
        )
        .fetch_all(&mut *txn)
        .await
        .unwrap();
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].0, a);
        assert_eq!(candidates[0].1, b);
        assert_eq!(candidates[0].2, Decimal::new(10000, 2));
        assert_eq!(candidates[0].3, "pending");
    }

    #[sqlx::test(migrations = false)]
    async fn reconciliation_marks_difference_and_preview_blocks(pool: sqlx::PgPool) {
        setup_db(&pool).await;
        let tenant = Uuid::new_v4();
        let scope = new_scope(&pool, tenant).await;
        let a = insert_company(&pool, tenant, "A公司").await;
        let b = insert_company(&pool, tenant, "B公司").await;
        insert_member(&pool, tenant, scope, a, None).await;
        insert_member(&pool, tenant, scope, b, None).await;
        insert_tx(
            &pool,
            tenant,
            "202611",
            a,
            b,
            Decimal::new(10000, 2),
            "confirmed",
        )
        .await;
        insert_tx(
            &pool,
            tenant,
            "202611",
            b,
            a,
            Decimal::new(8000, 2),
            "confirmed",
        )
        .await;

        let mut txn = pool.begin().await.unwrap();
        let period_end = chrono::NaiveDate::from_ymd_opt(2026, 11, 30).unwrap();
        let summary = reconciliation_core(&mut txn, scope, "202611", period_end)
            .await
            .unwrap();
        assert_eq!(summary.pairs.len(), 1);
        let pair = &summary.pairs[0];
        assert_eq!(pair.status, "unmatched");
        // a/b 在聚合内按 UUID 排序，差额方向随随机 UUID 变化，此处校验绝对值
        assert_eq!(pair.difference.abs(), Decimal::new(2000, 2));

        let preview = preview_core(&mut txn, scope, "202611", period_end, None)
            .await
            .unwrap();
        assert!(preview.blocked, "差额未清必须阻断合并");
        assert_eq!(preview.pairs.len(), 1);
        assert_eq!(preview.pairs[0].eliminable_amount, Decimal::new(8000, 2));
        assert!(preview.pairs[0]
            .block_reasons
            .iter()
            .any(|r| r.contains("差额")));
    }

    #[sqlx::test(migrations = false)]
    async fn preview_equal_confirmed_pair_is_not_blocked(pool: sqlx::PgPool) {
        setup_db(&pool).await;
        let tenant = Uuid::new_v4();
        let scope = new_scope(&pool, tenant).await;
        let a = insert_company(&pool, tenant, "A公司").await;
        let b = insert_company(&pool, tenant, "B公司").await;
        insert_member(&pool, tenant, scope, a, None).await;
        insert_member(&pool, tenant, scope, b, None).await;
        insert_tx(
            &pool,
            tenant,
            "202611",
            a,
            b,
            Decimal::new(10000, 2),
            "confirmed",
        )
        .await;
        insert_tx(
            &pool,
            tenant,
            "202611",
            b,
            a,
            Decimal::new(10000, 2),
            "confirmed",
        )
        .await;

        let mut txn = pool.begin().await.unwrap();
        let period_end = chrono::NaiveDate::from_ymd_opt(2026, 11, 30).unwrap();
        let preview = preview_core(&mut txn, scope, "202611", period_end, None)
            .await
            .unwrap();
        assert!(!preview.blocked);
        assert_eq!(preview.total_eliminable, Decimal::new(10000, 2));
        let draft = preview.pairs[0].draft_voucher.as_ref().unwrap();
        assert_eq!(draft.account_pair, "1122-2202");
        assert_eq!(draft.lines[0].account_code, "2202");
        assert_eq!(draft.lines[1].account_code, "1122");
    }

    #[sqlx::test(migrations = false)]
    async fn disputed_pair_is_blocked_and_not_eliminable(pool: sqlx::PgPool) {
        setup_db(&pool).await;
        let tenant = Uuid::new_v4();
        let scope = new_scope(&pool, tenant).await;
        let a = insert_company(&pool, tenant, "A公司").await;
        let b = insert_company(&pool, tenant, "B公司").await;
        insert_member(&pool, tenant, scope, a, None).await;
        insert_member(&pool, tenant, scope, b, None).await;
        insert_tx(
            &pool,
            tenant,
            "202611",
            a,
            b,
            Decimal::new(10000, 2),
            "confirmed",
        )
        .await;
        insert_tx(
            &pool,
            tenant,
            "202611",
            b,
            a,
            Decimal::new(10000, 2),
            "disputed",
        )
        .await;

        let mut txn = pool.begin().await.unwrap();
        let period_end = chrono::NaiveDate::from_ymd_opt(2026, 11, 30).unwrap();
        let preview = preview_core(&mut txn, scope, "202611", period_end, None)
            .await
            .unwrap();
        assert!(preview.blocked);
        assert_eq!(preview.pairs[0].status, "disputed");
        assert_eq!(preview.pairs[0].eliminable_amount, Decimal::ZERO);
    }
}
