#![allow(dead_code, unused_variables)]

use crate::models::*;
use chrono::Utc;
use sqlx::FromRow;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct WorkflowRepository {
    pool: PgPool,
}

impl WorkflowRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_workflow(&self, req: CreateWorkflowRequest) -> Result<Workflow, sqlx::Error> {
        let now = Utc::now();
        let workflow = Workflow {
            id: Uuid::new_v4(),
            name: req.name,
            description: req.description,
            definition: req.definition,
            is_active: true,
            created_by: req.created_by,
            created_at: now,
            updated_at: now,
        };

        let query = r#"
            INSERT INTO flow.workflows (id, name, description, definition, is_active, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, description, definition, is_active, created_by, created_at, updated_at
        "#;

        sqlx::query_as::<_, Workflow>(query)
            .bind(workflow.id)
            .bind(&workflow.name)
            .bind(&workflow.description)
            .bind(&workflow.definition)
            .bind(workflow.is_active)
            .bind(workflow.created_by)
            .bind(workflow.created_at)
            .bind(workflow.updated_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_workflow(&self, id: Uuid) -> Result<Option<Workflow>, sqlx::Error> {
        let query = r#"
            SELECT id, name, description, definition, is_active, created_by, created_at, updated_at
            FROM flow.workflows
            WHERE id = $1
        "#;
        sqlx::query_as::<_, Workflow>(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list_workflows(
        &self,
        is_active: Option<bool>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Workflow>, sqlx::Error> {
        let query = if let Some(active) = is_active {
            r#"
            SELECT id, name, description, definition, is_active, created_by, created_at, updated_at
            FROM flow.workflows
            WHERE is_active = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#
        } else {
            r#"
            SELECT id, name, description, definition, is_active, created_by, created_at, updated_at
            FROM flow.workflows
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#
        };

        let mut q = sqlx::query_as::<_, Workflow>(query);
        if let Some(active) = is_active {
            q = q.bind(active).bind(limit).bind(offset);
        } else {
            q = q.bind(limit).bind(offset);
        }
        q.fetch_all(&self.pool).await
    }

    pub async fn update_workflow(
        &self,
        id: Uuid,
        req: UpdateWorkflowRequest,
    ) -> Result<Option<Workflow>, sqlx::Error> {
        let existing = self.get_workflow(id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let w = existing.unwrap();
        let new_name = req.name.unwrap_or(w.name);
        let new_description = req.description.or(w.description);
        let new_definition = req.definition.unwrap_or(w.definition);
        let new_is_active = req.is_active.unwrap_or(w.is_active);

        let query = r#"
            UPDATE flow.workflows
            SET name = $1, description = $2, definition = $3, is_active = $4, updated_at = $5
            WHERE id = $6
            RETURNING id, name, description, definition, is_active, created_by, created_at, updated_at
        "#;

        sqlx::query_as::<_, Workflow>(query)
            .bind(new_name)
            .bind(new_description)
            .bind(new_definition)
            .bind(new_is_active)
            .bind(Utc::now())
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn delete_workflow(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let query = "DELETE FROM flow.workflows WHERE id = $1";
        let result = sqlx::query(query)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn create_instance(
        &self,
        req: CreateWorkflowInstanceRequest,
    ) -> Result<WorkflowInstance, sqlx::Error> {
        let now = Utc::now();
        let instance = WorkflowInstance {
            id: Uuid::new_v4(),
            workflow_id: Some(req.workflow_id),
            status: "pending".to_string(),
            initiator_id: req.initiator_id,
            data: req.data,
            started_at: None,
            completed_at: None,
            created_at: now,
        };

        let query = r#"
            INSERT INTO flow.workflow_instances (id, workflow_id, status, initiator_id, data, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, workflow_id, status, initiator_id, data, started_at, completed_at, created_at
        "#;

        sqlx::query_as::<_, WorkflowInstance>(query)
            .bind(instance.id)
            .bind(instance.workflow_id)
            .bind(&instance.status)
            .bind(instance.initiator_id)
            .bind(&instance.data)
            .bind(instance.created_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        let query = r#"
            SELECT id, workflow_id, status, initiator_id, data, started_at, completed_at, created_at
            FROM flow.workflow_instances
            WHERE id = $1
        "#;
        sqlx::query_as::<_, WorkflowInstance>(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list_instances(
        &self,
        workflow_id: Option<Uuid>,
        status: Option<String>,
        initiator_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<WorkflowInstance>, sqlx::Error> {
        let (mut conditions, mut idx) = (vec![], 1);

        if workflow_id.is_some() {
            conditions.push(format!("workflow_id = ${}", idx));
            idx += 1;
        }
        if status.is_some() {
            conditions.push(format!("status = ${}", idx));
            idx += 1;
        }
        if initiator_id.is_some() {
            conditions.push(format!("initiator_id = ${}", idx));
            idx += 1;
        }

        let where_clause = if conditions.is_empty() {
            "".to_string()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let query = format!(
            r#"
            SELECT id, workflow_id, status, initiator_id, data, started_at, completed_at, created_at
            FROM flow.workflow_instances
            {}
            ORDER BY created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            where_clause, idx, idx + 1
        );

        let mut q = sqlx::query_as::<_, WorkflowInstance>(&query);
        if let Some(wf_id) = workflow_id {
            q = q.bind(wf_id);
        }
        if let Some(s) = status {
            q = q.bind(s);
        }
        if let Some(init_id) = initiator_id {
            q = q.bind(init_id);
        }
        q = q.bind(limit).bind(offset);
        q.fetch_all(&self.pool).await
    }

    pub async fn update_instance_status(
        &self,
        id: Uuid,
        req: UpdateInstanceStatusRequest,
    ) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        let existing = self.get_instance(id).await?;
        if existing.is_none() {
            return Ok(None);
        }
        let inst = existing.unwrap();
        let started_at = if req.status == "running" && inst.started_at.is_none() {
            Some(Utc::now())
        } else {
            inst.started_at
        };
        let completed_at = if req.status == "completed" || req.status == "failed" || req.status == "cancelled" {
            Some(Utc::now())
        } else {
            inst.completed_at
        };

        let query = r#"
            UPDATE flow.workflow_instances
            SET status = $1, started_at = $2, completed_at = $3
            WHERE id = $4
            RETURNING id, workflow_id, status, initiator_id, data, started_at, completed_at, created_at
        "#;

        sqlx::query_as::<_, WorkflowInstance>(query)
            .bind(req.status)
            .bind(started_at)
            .bind(completed_at)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn create_approval(&self, req: CreateApprovalRequest) -> Result<Approval, sqlx::Error> {
        let now = Utc::now();
        let approval = Approval {
            id: Uuid::new_v4(),
            workflow_instance_id: Some(req.workflow_instance_id),
            task_name: req.task_name,
            assignee_id: req.assignee_id,
            status: "pending".to_string(),
            comment: None,
            approved_by: None,
            approved_at: None,
            created_at: now,
        };

        let query = r#"
            INSERT INTO flow.approvals (id, workflow_instance_id, task_name, assignee_id, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, workflow_instance_id, task_name, assignee_id, status, comment, approved_by, approved_at, created_at
        "#;

        sqlx::query_as::<_, Approval>(query)
            .bind(approval.id)
            .bind(approval.workflow_instance_id)
            .bind(&approval.task_name)
            .bind(approval.assignee_id)
            .bind(&approval.status)
            .bind(approval.created_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_approval(&self, id: Uuid) -> Result<Option<Approval>, sqlx::Error> {
        let query = r#"
            SELECT id, workflow_instance_id, task_name, assignee_id, status, comment, approved_by, approved_at, created_at
            FROM flow.approvals
            WHERE id = $1
        "#;
        sqlx::query_as::<_, Approval>(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list_approvals(
        &self,
        instance_id: Option<Uuid>,
        assignee_id: Option<Uuid>,
        status: Option<String>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Approval>, sqlx::Error> {
        let (mut conditions, mut idx) = (vec![], 1);

        if instance_id.is_some() {
            conditions.push(format!("workflow_instance_id = ${}", idx));
            idx += 1;
        }
        if assignee_id.is_some() {
            conditions.push(format!("assignee_id = ${}", idx));
            idx += 1;
        }
        if status.is_some() {
            conditions.push(format!("status = ${}", idx));
            idx += 1;
        }

        let where_clause = if conditions.is_empty() {
            "".to_string()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let query = format!(
            r#"
            SELECT id, workflow_instance_id, task_name, assignee_id, status, comment, approved_by, approved_at, created_at
            FROM flow.approvals
            {}
            ORDER BY created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            where_clause, idx, idx + 1
        );

        let mut q = sqlx::query_as::<_, Approval>(&query);
        if let Some(inst_id) = instance_id {
            q = q.bind(inst_id);
        }
        if let Some(ass_id) = assignee_id {
            q = q.bind(ass_id);
        }
        if let Some(s) = status {
            q = q.bind(s);
        }
        q = q.bind(limit).bind(offset);
        q.fetch_all(&self.pool).await
    }

    pub async fn process_approval(
        &self,
        id: Uuid,
        req: ProcessApprovalRequest,
    ) -> Result<Option<Approval>, sqlx::Error> {
        let existing = self.get_approval(id).await?;
        if existing.is_none() {
            return Ok(None);
        }
        let appr = existing.unwrap();
        let (new_status, new_comment, new_assignee, new_approved_by, new_approved_at) = match req.action.as_str() {
            "approve" => (
                "approved".to_string(),
                req.comment.or(appr.comment),
                appr.assignee_id,
                Some(req.actor_id),
                Some(Utc::now()),
            ),
            "reject" => (
                "rejected".to_string(),
                req.comment.or(appr.comment),
                appr.assignee_id,
                Some(req.actor_id),
                Some(Utc::now()),
            ),
            "delegate" => (
                "delegated".to_string(),
                req.comment.or(appr.comment),
                req.delegate_to,
                appr.approved_by,
                appr.approved_at,
            ),
            _ => (appr.status, req.comment.or(appr.comment), appr.assignee_id, appr.approved_by, appr.approved_at),
        };

        let query = r#"
            UPDATE flow.approvals
            SET status = $1, comment = $2, assignee_id = $3, approved_by = $4, approved_at = $5
            WHERE id = $6
            RETURNING id, workflow_instance_id, task_name, assignee_id, status, comment, approved_by, approved_at, created_at
        "#;

        sqlx::query_as::<_, Approval>(query)
            .bind(new_status)
            .bind(new_comment)
            .bind(new_assignee)
            .bind(new_approved_by)
            .bind(new_approved_at)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }
}
