use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::*;
use topems_shared_core::error::TopemsError;

pub struct ReconciliationService {
    db_pool: PgPool,
}

impl ReconciliationService {
    pub fn new(db_pool: PgPool) -> Self {
        Self { db_pool }
    }

    pub async fn create_session(
        &self,
        tenant_id: Uuid,
        req: CreateReconciliationSessionRequest,
        created_by: &str,
    ) -> Result<ReconciliationSession, TopemsError> {
        let session_no = self.generate_session_no(tenant_id).await?;

        let period_start = req.period_start.parse::<chrono::NaiveDate>()
            .map_err(|e| TopemsError::Validation(format!("Invalid period_start: {}", e)))?;
        let period_end = req.period_end.parse::<chrono::NaiveDate>()
            .map_err(|e| TopemsError::Validation(format!("Invalid period_end: {}", e)))?;

        let session = sqlx::query_as::<_, ReconciliationSession>(
            only_own_schema_query!("finance", r#"
            INSERT INTO finance.core_finance_reconciliation_sessions
                (tenant_id, session_no, reco_type, period_start, period_end, bank_account_id, entity_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#),
        )
        .bind(tenant_id)
        .bind(&session_no)
        .bind(req.reco_type)
        .bind(period_start)
        .bind(period_end)
        .bind(req.bank_account_id)
        .bind(req.entity_id)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(session)
    }

    async fn generate_session_no(&self, tenant_id: Uuid) -> Result<String, TopemsError> {
        let count: i64 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.core_finance_reconciliation_sessions WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"),
        )
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .unwrap_or(0);

        let now = Utc::now();
        Ok(format!("RC{}{:06}", now.format("%Y%m%d"), count + 1))
    }

    pub async fn get_session(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<ReconciliationSession, TopemsError> {
        let session = sqlx::query_as::<_, ReconciliationSession>(
            only_own_schema_query!("finance", "id, tenant_id, session_no, reco_type, period_start, period_end, bank_account_id, entity_id, status, total_items, matched_items, unmatched_items, diff_items, created_by, created_at, updated_at, completed_at FROM finance.core_finance_reconciliation_sessions WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"),
        )
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(session)
    }

    pub async fn list_sessions(
        &self,
        tenant_id: Uuid,
        reco_type: Option<ReconciliationType>,
        status: Option<ReconciliationStatus>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<ReconciliationSession>, i64), TopemsError> {
        let mut query =
            String::from("SELECT id, tenant_id, session_no, reco_type, period_start, period_end, bank_account_id, entity_id, status, total_items, matched_items, unmatched_items, diff_items, created_by, created_at, updated_at, completed_at FROM finance.core_finance_reconciliation_sessions WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)");
        let mut count_query = String::from(
            "SELECT COUNT(*) FROM finance.core_finance_reconciliation_sessions WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)",
        );
        let _params: Vec<String> = vec![];

        if let Some(rt) = &reco_type {
            query.push_str(&format!(" AND reco_type = '{}'", rt));
            count_query.push_str(&format!(" AND reco_type = '{}'", rt));
        }
        if let Some(s) = &status {
            query.push_str(&format!(" AND status = '{}'", s));
            count_query.push_str(&format!(" AND status = '{}'", s));
        }

        query.push_str(&format!(
            " ORDER BY created_at DESC LIMIT {} OFFSET {}",
            page_size,
            (page - 1) * page_size
        ));

        let sessions = sqlx::query_as::<_, ReconciliationSession>(&query)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await
            .map_err(|e| TopemsError::Database(e.to_string()))?;

        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(tenant_id)
            .fetch_one(&self.db_pool)
            .await
            .unwrap_or(0);

        Ok((sessions, total))
    }

    pub async fn import_items(
        &self,
        tenant_id: Uuid,
        req: ImportReconciliationItemsRequest,
    ) -> Result<i32, TopemsError> {
        let session = self.get_session(tenant_id, req.session_id).await?;

        if session.status == ReconciliationStatus::Completed {
            return Err(TopemsError::Validation(
                "Cannot import items to a completed session".to_string(),
            ));
        }

        let mut imported = 0;
        for item in req.items {
            let transaction_date = item.transaction_date.parse::<chrono::NaiveDate>()
                .map_err(|e| TopemsError::Validation(format!("Invalid transaction_date: {}", e)))?;

            sqlx::query(only_own_schema_query!(
                "finance",
                r#"
                INSERT INTO finance.core_finance_reconciliation_items
                    (session_id, tenant_id, source_type, transaction_date, amount, direction,
                     counterparty_name, counterparty_account, reference_no, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#
            ))
            .bind(req.session_id)
            .bind(tenant_id)
            .bind(&req.source_type)
            .bind(transaction_date)
            .bind(item.amount)
            .bind(&item.direction)
            .bind(&item.counterparty_name)
            .bind(&item.counterparty_account)
            .bind(&item.reference_no)
            .bind(&item.description)
            .execute(&self.db_pool)
            .await
            .map_err(|e| TopemsError::Database(e.to_string()))?;

            imported += 1;
        }

        self.update_session_counts(tenant_id, req.session_id)
            .await?;

        Ok(imported)
    }

    pub async fn auto_match(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<MatchResult, TopemsError> {
        let session = self.get_session(tenant_id, session_id).await?;

        if session.status == ReconciliationStatus::Completed {
            return Err(TopemsError::Validation(
                "Cannot match a completed session".to_string(),
            ));
        }

        self.set_session_status(tenant_id, session_id, ReconciliationStatus::Processing)
            .await?;

        let bank_items = self
            .get_unmatched_items(tenant_id, session_id, ItemSource::Bank)
            .await?;
        let erp_items = self
            .get_unmatched_items(tenant_id, session_id, ItemSource::Erp)
            .await?;

        let mut matched_pairs = Vec::new();
        let mut matched_bank_ids = Vec::new();
        let mut matched_erp_ids = Vec::new();

        for bank_item in &bank_items {
            for erp_item in &erp_items {
                if matched_bank_ids.contains(&bank_item.id)
                    || matched_erp_ids.contains(&erp_item.id)
                {
                    continue;
                }

                let match_type = self.classify_match(bank_item, erp_item);
                if match_type.is_some() {
                    let mt = match_type.unwrap();
                    self.mark_matched(bank_item.id, erp_item.id).await?;
                    matched_pairs.push(MatchedPair {
                        bank_item_id: bank_item.id,
                        erp_item_id: erp_item.id,
                        amount: bank_item.amount,
                        match_type: mt,
                    });
                    matched_bank_ids.push(bank_item.id);
                    matched_erp_ids.push(erp_item.id);
                }
            }
        }

        // 第二轮：尝试模糊匹配 + 拆分/合并匹配
        for bank_item in &bank_items {
            if matched_bank_ids.contains(&bank_item.id) {
                continue;
            }

            // 拆分匹配：一笔银行流水对应多笔 ERP 发票
            let split_matches = self.find_split_matches(bank_item, &erp_items, &matched_erp_ids);
            for erp_item in split_matches {
                self.mark_matched(bank_item.id, erp_item.id).await?;
                matched_pairs.push(MatchedPair {
                    bank_item_id: bank_item.id,
                    erp_item_id: erp_item.id,
                    amount: bank_item.amount,
                    match_type: "split".to_string(),
                });
                matched_bank_ids.push(bank_item.id);
                matched_erp_ids.push(erp_item.id);
            }
        }

        self.update_session_counts(tenant_id, session_id).await?;
        self.set_session_status(tenant_id, session_id, ReconciliationStatus::Pending)
            .await?;

        let unmatched_bank: Vec<ReconciliationItem> = bank_items
            .into_iter()
            .filter(|i| !matched_bank_ids.contains(&i.id))
            .collect();
        let unmatched_erp: Vec<ReconciliationItem> = erp_items
            .into_iter()
            .filter(|i| !matched_erp_ids.contains(&i.id))
            .collect();

        Ok(MatchResult {
            matched_pairs,
            unmatched_bank,
            unmatched_erp,
        })
    }

    /// 分类匹配 - 返回匹配的置信度类型
    /// 返回 None 表示不匹配；Some("exact"/"fuzzy"/"reference"/"amount"/"date_loose") 表示匹配类型
    fn classify_match(
        &self,
        bank_item: &ReconciliationItem,
        erp_item: &ReconciliationItem,
    ) -> Option<String> {
        if bank_item.amount != erp_item.amount {
            return None;
        }

        let date_diff = (bank_item.transaction_date - erp_item.transaction_date)
            .num_days()
            .abs();

        // 1. 完全匹配：金额相等 + 日期 ±3 天 + 名称相似度 > 80%
        if date_diff <= 3 {
            if let (Some(bank_ref), Some(erp_ref)) =
                (&bank_item.reference_no, &erp_item.reference_no)
            {
                if bank_ref == erp_ref {
                    return Some("exact".to_string());
                }
            }
            if let (Some(bank_name), Some(erp_name)) =
                (&bank_item.counterparty_name, &erp_item.counterparty_name)
            {
                if self.string_similarity(bank_name, erp_name) > 0.8 {
                    return Some("exact".to_string());
                }
            }
            // 仅日期 + 金额也认为是完全匹配（最常见情形）
            if date_diff <= 1 {
                return Some("exact".to_string());
            }
        }

        // 2. 引用号匹配：银行流水号 = ERP 发票号（即使日期相差较大）
        if let (Some(bank_ref), Some(erp_ref)) = (&bank_item.reference_no, &erp_item.reference_no) {
            if !bank_ref.is_empty() && bank_ref == erp_ref {
                return Some("reference".to_string());
            }
        }

        // 3. 模糊匹配：日期 ±7 天 + 名称相似度 > 70%
        if date_diff <= 7 {
            if let (Some(bank_name), Some(erp_name)) =
                (&bank_item.counterparty_name, &erp_item.counterparty_name)
            {
                if self.string_similarity(bank_name, erp_name) > 0.7 {
                    return Some("fuzzy".to_string());
                }
            }
        }

        // 4. 仅金额匹配：日期超出 7 天但金额一致
        if date_diff > 7 && date_diff <= 30 {
            return Some("amount".to_string());
        }

        None
    }

    /// 拆分匹配：一笔银行流水可能对应多笔 ERP 发票（金额总和相等）
    /// 典型场景：客户分批开票、合并付款
    fn find_split_matches(
        &self,
        bank_item: &ReconciliationItem,
        erp_items: &[ReconciliationItem],
        matched_erp_ids: &[Uuid],
    ) -> Vec<ReconciliationItem> {
        let mut result = Vec::new();
        let mut accumulated = rust_decimal::Decimal::ZERO;

        for erp_item in erp_items {
            if matched_erp_ids.contains(&erp_item.id) {
                continue;
            }
            if result
                .iter()
                .any(|m: &ReconciliationItem| m.id == erp_item.id)
            {
                continue;
            }

            // 只考虑同向（in/out 一致）且日期 ±30 天内的项
            if erp_item.direction != bank_item.direction {
                continue;
            }
            let date_diff = (bank_item.transaction_date - erp_item.transaction_date)
                .num_days()
                .abs();
            if date_diff > 30 {
                continue;
            }

            accumulated += erp_item.amount;
            result.push(erp_item.clone());

            if accumulated >= bank_item.amount {
                break;
            }
        }

        if accumulated == bank_item.amount && !result.is_empty() {
            result
        } else {
            Vec::new()
        }
    }

    fn string_similarity(&self, a: &str, b: &str) -> f64 {
        let a = a.trim().to_lowercase();
        let b = b.trim().to_lowercase();
        if a == b {
            return 1.0;
        }
        let distance = strsim::levenshtein(&a, &b);
        let max_len = a.len().max(b.len());
        if max_len == 0 {
            return 1.0;
        }
        1.0 - (distance as f64 / max_len as f64)
    }

    pub async fn update_diff(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        diff_reason: DiffReason,
        notes: Option<String>,
    ) -> Result<ReconciliationItem, TopemsError> {
        let item = sqlx::query_as::<_, ReconciliationItem>(only_own_schema_query!(
            "finance",
            r#"
            UPDATE finance.core_finance_reconciliation_items
            SET diff_reason = $1, notes = $2, match_status = 'diff', updated_at = NOW()
            WHERE id = $3 AND tenant_id = $4
            RETURNING *
            "#
        ))
        .bind(diff_reason)
        .bind(notes)
        .bind(item_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        if let Some(session_id) = self.get_session_id_by_item(item_id).await? {
            self.update_session_counts(tenant_id, session_id).await?;
        }

        Ok(item)
    }

    pub async fn get_items(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
        source_type: Option<ItemSource>,
        match_status: Option<MatchStatus>,
    ) -> Result<Vec<ReconciliationItem>, TopemsError> {
        let mut query = String::from(
            "SELECT id, session_id, tenant_id, source_type, transaction_date, amount, direction, counterparty_name, counterparty_account, reference_no, description, match_status, matched_item_id, diff_reason, diff_amount, notes, created_at, updated_at FROM finance.core_finance_reconciliation_items WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)",
        );

        if let Some(st) = &source_type {
            query.push_str(&format!(" AND source_type = '{}'", st));
        }
        if let Some(ms) = &match_status {
            query.push_str(&format!(" AND match_status = '{}'", ms));
        }

        query.push_str(" ORDER BY transaction_date, amount");

        let items = sqlx::query_as::<_, ReconciliationItem>(&query)
            .bind(session_id)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await
            .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(items)
    }

    pub async fn get_summary(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<ReconciliationSummary, TopemsError> {
        let session = self.get_session(tenant_id, session_id).await?;
        let total = session.total_items;
        let matched = session.matched_items;
        let rate = if total > 0 {
            (matched as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        Ok(ReconciliationSummary {
            session_id,
            total_items: total,
            matched_items: matched,
            unmatched_items: session.unmatched_items,
            diff_items: session.diff_items,
            match_rate: rate,
        })
    }

    pub async fn complete_session(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<ReconciliationSession, TopemsError> {
        let session = sqlx::query_as::<_, ReconciliationSession>(only_own_schema_query!(
            "finance",
            r#"
            UPDATE finance.core_finance_reconciliation_sessions
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND tenant_id = $2
            RETURNING *
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(session)
    }

    async fn get_unmatched_items(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
        source_type: ItemSource,
    ) -> Result<Vec<ReconciliationItem>, TopemsError> {
        let items = sqlx::query_as::<_, ReconciliationItem>(
            only_own_schema_query!("finance", r#"
            SELECT id, session_id, tenant_id, source_type, transaction_date, amount, direction, counterparty_name, counterparty_account, reference_no, description, match_status, matched_item_id, diff_reason, diff_amount, notes, created_at, updated_at FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND source_type = $3 AND match_status = 'unmatched'
            ORDER BY amount, transaction_date
            "#),
        )
        .bind(session_id)
        .bind(tenant_id)
        .bind(source_type)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(items)
    }

    async fn mark_matched(&self, bank_item_id: Uuid, erp_item_id: Uuid) -> Result<(), TopemsError> {
        sqlx::query(only_own_schema_query!(
            "finance",
            r#"
            UPDATE finance.core_finance_reconciliation_items
            SET match_status = 'matched', matched_item_id = $1, updated_at = NOW()
            WHERE id = $2
            "#
        ))
        .bind(erp_item_id)
        .bind(bank_item_id)
        .execute(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        sqlx::query(only_own_schema_query!(
            "finance",
            r#"
            UPDATE finance.core_finance_reconciliation_items
            SET match_status = 'matched', matched_item_id = $1, updated_at = NOW()
            WHERE id = $2
            "#
        ))
        .bind(bank_item_id)
        .bind(erp_item_id)
        .execute(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(())
    }

    async fn update_session_counts(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<(), TopemsError> {
        let total: i32 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*)::INT FROM finance.core_finance_reconciliation_items WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"),
        )
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .unwrap_or(0);

        let matched: i32 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*)::INT FROM finance.core_finance_reconciliation_items WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'matched'"),
        )
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .unwrap_or(0);

        let diff: i32 = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT COUNT(*)::INT FROM finance.core_finance_reconciliation_items WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'diff'"),
        )
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .unwrap_or(0);

        let unmatched = total - matched - diff;

        sqlx::query(
            only_own_schema_query!("finance", r#"
            UPDATE finance.core_finance_reconciliation_sessions
            SET total_items = $1, matched_items = $2, unmatched_items = $3, diff_items = $4, updated_at = NOW()
            WHERE id = $5 AND tenant_id = $6
            "#),
        )
        .bind(total)
        .bind(matched)
        .bind(unmatched)
        .bind(diff)
        .bind(session_id)
        .bind(tenant_id)
        .execute(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(())
    }

    async fn set_session_status(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
        status: ReconciliationStatus,
    ) -> Result<(), TopemsError> {
        sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_reconciliation_sessions SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3"),
        )
        .bind(status)
        .bind(session_id)
        .bind(tenant_id)
        .execute(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(())
    }

    async fn get_session_id_by_item(&self, item_id: Uuid) -> Result<Option<Uuid>, TopemsError> {
        let session_id: Option<Uuid> = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            "SELECT session_id FROM finance.core_finance_reconciliation_items WHERE id = $1"
        ))
        .bind(item_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        Ok(session_id)
    }

    // ==================== 报告与差异处理（P0，V15 Phase 2）====================

    /// 对账报告：余额调节表 + 完成率 + 金额汇总
    pub async fn get_report(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<ReconciliationReport, TopemsError> {
        let session = self.get_session(tenant_id, session_id).await?;

        // 银行端总金额（所有银行流水）
        let bank_total: Decimal = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND source_type = 'bank'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        // ERP 端总金额
        let erp_total: Decimal = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND source_type = 'erp'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        let total_matched: Decimal = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'matched'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        let total_unmatched: Decimal = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COALESCE(SUM(amount), 0)
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'unmatched'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        let total_diff: Decimal = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COALESCE(SUM(COALESCE(diff_amount, amount)), 0)
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'diff'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        let unreconciled_difference = bank_total - erp_total;

        let total_items = session.total_items;
        let match_rate = if total_items > 0 {
            (session.matched_items as f64 / total_items as f64) * 100.0
        } else {
            0.0
        };

        Ok(ReconciliationReport {
            session_id,
            session_no: session.session_no,
            reco_type: session.reco_type,
            period_start: session.period_start,
            period_end: session.period_end,
            total_items,
            matched_items: session.matched_items,
            unmatched_items: session.unmatched_items,
            diff_items: session.diff_items,
            match_rate,
            total_matched_amount: total_matched,
            total_unmatched_amount: total_unmatched,
            total_diff_amount: total_diff,
            bank_balance: bank_total,
            erp_balance: erp_total,
            unreconciled_difference,
        })
    }

    /// 账龄分析：应收/应付按账龄区间汇总（30/60/90/180/360/360+ 天）
    pub async fn get_aging(
        &self,
        tenant_id: Uuid,
        as_of_date: chrono::NaiveDate,
        direction: &str,
    ) -> Result<AgingReport, TopemsError> {
        let buckets = vec![
            ("0-30", 0i64, 30i64),
            ("31-60", 31, 60),
            ("61-90", 61, 90),
            ("91-180", 91, 180),
            ("181-360", 181, 360),
            ("360+", 361, i64::MAX),
        ];

        let mut aging_buckets = Vec::new();
        let mut total_amount = Decimal::ZERO;
        let mut total_count: i64 = 0;

        for (bucket_name, from_days, to_days) in buckets {
            // 仅统计未对账（unmatched/diff）的项目作为账龄对象
            let (amount, count): (Decimal, i64) = match direction {
                "receivable" => {
                    // 应收：银行入账方向（in）但未匹配，或正向未平
                    let q: (Option<Decimal>, Option<i64>) = sqlx::query_as(only_own_schema_query!(
                        "finance",
                        r#"
                        SELECT SUM(amount), COUNT(*)
                        FROM finance.core_finance_reconciliation_items
                        WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)
                          AND source_type = 'erp'
                          AND direction = 'in'
                          AND match_status IN ('unmatched', 'diff')
                          AND (CURRENT_DATE - transaction_date) >= $2
                          AND (CURRENT_DATE - transaction_date) <= $3
                        "#
                    ))
                    .bind(tenant_id)
                    .bind(from_days)
                    .bind(to_days)
                    .fetch_one(&self.db_pool)
                    .await
                    .map_err(|e| TopemsError::Database(e.to_string()))?;
                    (q.0.unwrap_or(Decimal::ZERO), q.1.unwrap_or(0))
                }
                _ => {
                    // 应付：银行出账方向（out）但未匹配
                    let q: (Option<Decimal>, Option<i64>) = sqlx::query_as(only_own_schema_query!(
                        "finance",
                        r#"
                        SELECT SUM(amount), COUNT(*)
                        FROM finance.core_finance_reconciliation_items
                        WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)
                          AND source_type = 'erp'
                          AND direction = 'out'
                          AND match_status IN ('unmatched', 'diff')
                          AND (CURRENT_DATE - transaction_date) >= $2
                          AND (CURRENT_DATE - transaction_date) <= $3
                        "#
                    ))
                    .bind(tenant_id)
                    .bind(from_days)
                    .bind(to_days)
                    .fetch_one(&self.db_pool)
                    .await
                    .map_err(|e| TopemsError::Database(e.to_string()))?;
                    (q.0.unwrap_or(Decimal::ZERO), q.1.unwrap_or(0))
                }
            };

            total_amount += amount;
            total_count += count;

            aging_buckets.push(AgingBucket {
                bucket: bucket_name.to_string(),
                range_days: format!(
                    "{}-{}",
                    from_days,
                    if to_days == i64::MAX {
                        "+".to_string()
                    } else {
                        to_days.to_string()
                    }
                ),
                amount,
                count,
            });
        }

        Ok(AgingReport {
            as_of_date,
            direction: direction.to_string(),
            total_amount,
            total_count,
            buckets: aging_buckets,
        })
    }

    /// 批量处理差异项：标记原因 + 备注
    pub async fn batch_update_diff(
        &self,
        tenant_id: Uuid,
        req: BatchDiffRequest,
    ) -> Result<BatchDiffResponse, TopemsError> {
        let mut success_count = 0i32;
        let mut failed_count = 0i32;
        let mut failed_ids = Vec::new();
        let mut touched_sessions = std::collections::HashSet::new();

        for item in req.items {
            let result = sqlx::query(only_own_schema_query!(
                "finance",
                r#"
                UPDATE finance.core_finance_reconciliation_items
                SET diff_reason = $1, notes = $2, match_status = 'diff', updated_at = NOW()
                WHERE id = $3 AND tenant_id = $4
                "#
            ))
            .bind(item.diff_reason.clone())
            .bind(item.notes.clone())
            .bind(item.item_id)
            .bind(tenant_id)
            .execute(&self.db_pool)
            .await;

            match result {
                Ok(r) if r.rows_affected() > 0 => {
                    success_count += 1;
                    if let Ok(Some(sid)) = self.get_session_id_by_item(item.item_id).await {
                        touched_sessions.insert(sid);
                    }
                }
                _ => {
                    failed_count += 1;
                    failed_ids.push(item.item_id);
                }
            }
        }

        // 重新统计受影响的会话
        for sid in touched_sessions {
            let _ = self.update_session_counts(tenant_id, sid).await;
        }

        Ok(BatchDiffResponse {
            success_count,
            failed_count,
            failed_ids,
        })
    }

    /// 差异统计：按原因和状态聚合
    pub async fn get_diff_statistics(
        &self,
        tenant_id: Uuid,
        session_id: Uuid,
    ) -> Result<DiffStatistics, TopemsError> {
        // 总差异项
        let total_diff_items: i32 = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COUNT(*)::INT FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'diff'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .unwrap_or(0);

        let total_diff_amount: Decimal = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            r#"
            SELECT COALESCE(SUM(COALESCE(diff_amount, amount)), 0)
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'diff'
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        // 按原因分组
        let by_reason_rows: Vec<(Option<String>, i32, Option<Decimal>)> =
            sqlx::query_as(only_own_schema_query!(
                "finance",
                r#"
            SELECT diff_reason::text, COUNT(*)::INT, SUM(COALESCE(diff_amount, amount))
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2) AND match_status = 'diff'
            GROUP BY diff_reason
            "#
            ))
            .bind(session_id)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await
            .map_err(|e| TopemsError::Database(e.to_string()))?;

        let by_reason: Vec<DiffReasonCount> = by_reason_rows
            .into_iter()
            .map(|(reason, count, amount)| DiffReasonCount {
                reason: reason.unwrap_or_else(|| "unknown".to_string()),
                count,
                amount: amount.unwrap_or(Decimal::ZERO),
            })
            .collect();

        // 按状态分组
        let by_status_rows: Vec<(String, i32)> = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"
            SELECT match_status::text, COUNT(*)::INT
            FROM finance.core_finance_reconciliation_items
            WHERE session_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)
            GROUP BY match_status
            "#
        ))
        .bind(session_id)
        .bind(tenant_id)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;

        let by_status: Vec<DiffStatusCount> = by_status_rows
            .into_iter()
            .map(|(status, count)| DiffStatusCount { status, count })
            .collect();

        Ok(DiffStatistics {
            session_id,
            total_diff_items,
            by_reason,
            by_status,
            total_diff_amount,
        })
    }
}
