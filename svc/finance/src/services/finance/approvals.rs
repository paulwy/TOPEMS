use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub async fn submit_for_approval(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
        doc_no: String,
        submitted_by: &str,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "INSERT INTO core_finance_approval_workflows (tenant_id, doc_type, doc_id, doc_no, status, submitted_by, submitted_at)
             VALUES ($1, $2, $3, $4, 'pending', $5, CURRENT_TIMESTAMP)
             ON CONFLICT (tenant_id, doc_type, doc_id) DO UPDATE SET status = 'pending', submitted_by = $5, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .bind(doc_no)
        .bind(submitted_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn approve(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
        approved_by: &str,
        comment: Option<String>,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "UPDATE core_finance_approval_workflows SET status = 'approved', approved_by = $3, approved_at = CURRENT_TIMESTAMP, comment = $4, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3 AND status = 'pending'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .bind(approved_by)
        .bind(comment)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn reject(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
        rejected_by: &str,
        reason: String,
        comment: Option<String>,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "UPDATE core_finance_approval_workflows SET status = 'rejected', rejected_by = $3, rejected_at = CURRENT_TIMESTAMP, rejection_reason = $4, comment = $5, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3 AND status = 'pending'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .bind(rejected_by)
        .bind(reason)
        .bind(comment)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn cancel_approval(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
    ) -> Result<ApprovalWorkflow, TopemsError> {
        let workflow = sqlx::query_as(
            "UPDATE core_finance_approval_workflows SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3 AND status = 'pending'
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn get_approval_status(
        &self,
        tenant_id: Uuid,
        doc_type: ApprovalDocType,
        doc_id: Uuid,
    ) -> Result<Option<ApprovalWorkflow>, TopemsError> {
        let workflow = sqlx::query_as(
            "SELECT * FROM core_finance_approval_workflows WHERE tenant_id = $1 AND doc_type = $2 AND doc_id = $3",
        )
        .bind(tenant_id)
        .bind(doc_type)
        .bind(doc_id)
        .fetch_optional(&self.db_pool)
        .await?;

        Ok(workflow)
    }

    pub async fn list_pending_approvals(
        &self,
        tenant_id: Uuid,
        doc_type: Option<ApprovalDocType>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<ApprovalWorkflow>, i64), TopemsError> {
        let offset = (page - 1) * page_size;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM core_finance_approval_workflows WHERE tenant_id = $1 AND status = 'pending'"
        )
        .bind(tenant_id)
        .fetch_one(&self.db_pool)
        .await?;

        let workflows = if let Some(t) = doc_type {
            sqlx::query_as(
                "SELECT * FROM core_finance_approval_workflows WHERE tenant_id = $1 AND doc_type = $2 AND status = 'pending' ORDER BY submitted_at DESC LIMIT $3 OFFSET $4",
            )
            .bind(tenant_id)
            .bind(t)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.db_pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT * FROM core_finance_approval_workflows WHERE tenant_id = $1 AND status = 'pending' ORDER BY submitted_at DESC LIMIT $2 OFFSET $3",
            )
            .bind(tenant_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.db_pool)
            .await?
        };

        Ok((workflows, total.0))
    }
}
