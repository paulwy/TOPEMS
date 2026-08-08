use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub async fn list_approval_configs(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<ApprovalConfigResponse>, TopemsError> {
        let configs: Vec<PaymentApprovalConfig> = sqlx::query_as(
            "SELECT * FROM core_finance_payment_approval_config WHERE deleted_at IS NULL AND tenant_id = $1 ORDER BY priority DESC, amount_threshold ASC",
        )
        .bind(tenant_id)
        .fetch_all(&self.db_pool)
        .await?;

        let mut results = Vec::new();
        for config in configs {
            let nodes = self.get_approval_nodes(config.id).await?;
            results.push(ApprovalConfigResponse {
                id: config.id,
                name: config.name,
                description: config.description,
                amount_threshold: config.amount_threshold,
                max_amount: config.max_amount,
                workflow_id: config.workflow_id,
                approval_levels: config.approval_levels,
                priority: config.priority,
                is_active: config.is_active,
                nodes,
                created_at: config.created_at,
                updated_at: config.updated_at,
            });
        }

        Ok(results)
    }

    pub async fn get_approval_config(
        &self,
        tenant_id: Uuid,
        config_id: Uuid,
    ) -> Result<ApprovalConfigResponse, TopemsError> {
        let config: PaymentApprovalConfig = sqlx::query_as(
            "SELECT * FROM core_finance_payment_approval_config WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(config_id)
        .fetch_one(&self.db_pool)
        .await?;

        let nodes = self.get_approval_nodes(config.id).await?;

        Ok(ApprovalConfigResponse {
            id: config.id,
            name: config.name,
            description: config.description,
            amount_threshold: config.amount_threshold,
            max_amount: config.max_amount,
            workflow_id: config.workflow_id,
            approval_levels: config.approval_levels,
            priority: config.priority,
            is_active: config.is_active,
            nodes,
            created_at: config.created_at,
            updated_at: config.updated_at,
        })
    }

    pub async fn create_approval_config(
        &self,
        tenant_id: Uuid,
        req: CreateApprovalConfigRequest,
        created_by: &str,
    ) -> Result<ApprovalConfigResponse, TopemsError> {
        let mut tx = self.db_pool.begin().await?;

        let config: PaymentApprovalConfig = sqlx::query_as(
            "INSERT INTO core_finance_payment_approval_config (tenant_id, name, description, amount_threshold, max_amount, workflow_id, approval_levels, priority, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        )
        .bind(tenant_id)
        .bind(req.name)
        .bind(req.description)
        .bind(req.amount_threshold)
        .bind(req.max_amount)
        .bind(req.workflow_id)
        .bind(req.approval_levels.unwrap_or(1))
        .bind(req.priority.unwrap_or(0))
        .bind(req.is_active.unwrap_or(true))
        .bind(created_by)
        .fetch_one(&mut *tx)
        .await?;

        if let Some(nodes) = req.nodes {
            for node in nodes {
                sqlx::query(
                    "INSERT INTO core_finance_approval_nodes (tenant_id, config_id, node_level, node_name, approver_type, approver_role, approver_users, approval_type, timeout_hours, notify_users, conditions, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                )
                .bind(tenant_id)
                .bind(config.id)
                .bind(node.node_level)
                .bind(node.node_name)
                .bind(node.approver_type)
                .bind(node.approver_role)
                .bind(node.approver_users)
                .bind(node.approval_type.unwrap_or("single".to_string()))
                .bind(node.timeout_hours)
                .bind(node.notify_users)
                .bind(node.conditions)
                .bind(true)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;

        let nodes = self.get_approval_nodes(config.id).await?;

        Ok(ApprovalConfigResponse {
            id: config.id,
            name: config.name,
            description: config.description,
            amount_threshold: config.amount_threshold,
            max_amount: config.max_amount,
            workflow_id: config.workflow_id,
            approval_levels: config.approval_levels,
            priority: config.priority,
            is_active: config.is_active,
            nodes,
            created_at: config.created_at,
            updated_at: config.updated_at,
        })
    }

    pub async fn update_approval_config(
        &self,
        tenant_id: Uuid,
        config_id: Uuid,
        req: CreateApprovalConfigRequest,
        _updated_by: &str,
    ) -> Result<ApprovalConfigResponse, TopemsError> {
        let mut tx = self.db_pool.begin().await?;

        let config: PaymentApprovalConfig = sqlx::query_as(
            "UPDATE core_finance_payment_approval_config SET name = $1, description = $2, amount_threshold = $3, max_amount = $4, workflow_id = $5, approval_levels = $6, priority = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $9 AND id = $10 RETURNING *",
        )
        .bind(req.name)
        .bind(req.description)
        .bind(req.amount_threshold)
        .bind(req.max_amount)
        .bind(req.workflow_id)
        .bind(req.approval_levels.unwrap_or(1))
        .bind(req.priority.unwrap_or(0))
        .bind(req.is_active.unwrap_or(true))
        .bind(tenant_id)
        .bind(config_id)
        .fetch_one(&mut *tx)
        .await?;

        if let Some(nodes) = req.nodes {
            sqlx::query(
                "DELETE FROM core_finance_approval_nodes WHERE tenant_id = $1 AND config_id = $2",
            )
            .bind(tenant_id)
            .bind(config_id)
            .execute(&mut *tx)
            .await?;

            for node in nodes {
                sqlx::query(
                    "INSERT INTO core_finance_approval_nodes (tenant_id, config_id, node_level, node_name, approver_type, approver_role, approver_users, approval_type, timeout_hours, notify_users, conditions, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
                )
                .bind(tenant_id)
                .bind(config.id)
                .bind(node.node_level)
                .bind(node.node_name)
                .bind(node.approver_type)
                .bind(node.approver_role)
                .bind(node.approver_users)
                .bind(node.approval_type.unwrap_or("single".to_string()))
                .bind(node.timeout_hours)
                .bind(node.notify_users)
                .bind(node.conditions)
                .bind(true)
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;

        let nodes = self.get_approval_nodes(config.id).await?;

        Ok(ApprovalConfigResponse {
            id: config.id,
            name: config.name,
            description: config.description,
            amount_threshold: config.amount_threshold,
            max_amount: config.max_amount,
            workflow_id: config.workflow_id,
            approval_levels: config.approval_levels,
            priority: config.priority,
            is_active: config.is_active,
            nodes,
            created_at: config.created_at,
            updated_at: config.updated_at,
        })
    }

    pub async fn delete_approval_config(
        &self,
        tenant_id: Uuid,
        config_id: Uuid,
    ) -> Result<(), TopemsError> {
        let mut tx = self.db_pool.begin().await?;

        sqlx::query(
            "DELETE FROM core_finance_approval_nodes WHERE tenant_id = $1 AND config_id = $2",
        )
        .bind(tenant_id)
        .bind(config_id)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "UPDATE core_finance_payment_approval_config SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(config_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(())
    }

    pub(super) async fn get_approval_nodes(
        &self,
        config_id: Uuid,
    ) -> Result<Vec<ApprovalNode>, TopemsError> {
        let nodes: Vec<ApprovalNode> = sqlx::query_as(
            "SELECT * FROM core_finance_approval_nodes WHERE config_id = $1 ORDER BY node_level ASC",
        )
        .bind(config_id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(nodes)
    }
}
