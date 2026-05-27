use crate::models::*;
use chrono::{DateTime, Duration, Utc};
use serde_json::Value;
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
            current_node: None,
            initiator_id: req.initiator_id,
            data: req.data,
            started_at: None,
            completed_at: None,
            created_at: now,
        };

        let query = r#"
            INSERT INTO flow.workflow_instances (id, workflow_id, status, current_node, initiator_id, data, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, workflow_id, status, current_node, initiator_id, data, started_at, completed_at, created_at
        "#;

        sqlx::query_as::<_, WorkflowInstance>(query)
            .bind(instance.id)
            .bind(instance.workflow_id)
            .bind(&instance.status)
            .bind(&instance.current_node)
            .bind(instance.initiator_id)
            .bind(&instance.data)
            .bind(instance.created_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        let query = r#"
            SELECT id, workflow_id, status, current_node, initiator_id, data, started_at, completed_at, created_at
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
            SELECT id, workflow_id, status, current_node, initiator_id, data, started_at, completed_at, created_at
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

    pub async fn update_instance(
        &self,
        id: Uuid,
        status: Option<String>,
        current_node: Option<String>,
        data: Option<Value>,
    ) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        let existing = self.get_instance(id).await?;
        if existing.is_none() {
            return Ok(None);
        }
        let inst = existing.unwrap();

        let new_status = status.unwrap_or(inst.status);
        let new_current_node = current_node.or(inst.current_node);
        let new_data = data.or(inst.data);

        let started_at = if new_status == "running" && inst.started_at.is_none() {
            Some(Utc::now())
        } else {
            inst.started_at
        };

        let completed_at = if new_status == "completed" || new_status == "failed" || new_status == "cancelled" {
            Some(Utc::now())
        } else {
            inst.completed_at
        };

        let query = r#"
            UPDATE flow.workflow_instances
            SET status = $1, current_node = $2, data = $3, started_at = $4, completed_at = $5
            WHERE id = $6
            RETURNING id, workflow_id, status, current_node, initiator_id, data, started_at, completed_at, created_at
        "#;

        sqlx::query_as::<_, WorkflowInstance>(query)
            .bind(new_status)
            .bind(new_current_node)
            .bind(new_data)
            .bind(started_at)
            .bind(completed_at)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn update_instance_status(
        &self,
        id: Uuid,
        req: UpdateInstanceStatusRequest,
    ) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        self.update_instance(id, Some(req.status), None, None).await
    }

    pub async fn create_approval(&self, req: CreateApprovalRequest) -> Result<Approval, sqlx::Error> {
        let now = Utc::now();
        let timeout_at = req.timeout_hours.map(|h| now + Duration::hours(h as i64));
        let approval = Approval {
            id: Uuid::new_v4(),
            workflow_instance_id: Some(req.workflow_instance_id),
            node_id: req.node_id,
            task_name: req.task_name,
            assignee_id: req.assignee_id,
            status: "pending".to_string(),
            approval_type: req.approval_type,
            comment: None,
            approved_by: None,
            approved_at: None,
            timeout_at,
            created_at: now,
        };

        let query = r#"
            INSERT INTO flow.approvals (id, workflow_instance_id, node_id, task_name, assignee_id, status, approval_type, timeout_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, workflow_instance_id, node_id, task_name, assignee_id, status, approval_type, comment, approved_by, approved_at, timeout_at, created_at
        "#;

        sqlx::query_as::<_, Approval>(query)
            .bind(approval.id)
            .bind(approval.workflow_instance_id)
            .bind(&approval.node_id)
            .bind(&approval.task_name)
            .bind(approval.assignee_id)
            .bind(&approval.status)
            .bind(&approval.approval_type)
            .bind(approval.timeout_at)
            .bind(approval.created_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_approval(&self, id: Uuid) -> Result<Option<Approval>, sqlx::Error> {
        let query = r#"
            SELECT id, workflow_instance_id, node_id, task_name, assignee_id, status, approval_type, comment, approved_by, approved_at, timeout_at, created_at
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
            SELECT id, workflow_instance_id, node_id, task_name, assignee_id, status, approval_type, comment, approved_by, approved_at, timeout_at, created_at
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

    pub async fn get_expired_approvals(&self) -> Result<Vec<Approval>, sqlx::Error> {
        let query = r#"
            SELECT id, workflow_instance_id, node_id, task_name, assignee_id, status, approval_type, comment, approved_by, approved_at, timeout_at, created_at
            FROM flow.approvals
            WHERE status = 'pending' AND timeout_at IS NOT NULL AND timeout_at < $1
        "#;
        sqlx::query_as::<_, Approval>(query)
            .bind(Utc::now())
            .fetch_all(&self.pool)
            .await
    }

    pub async fn update_approval(
        &self,
        id: Uuid,
        status: Option<String>,
        comment: Option<String>,
        assignee_id: Option<Uuid>,
        approved_by: Option<Uuid>,
        approved_at: Option<DateTime<Utc>>,
    ) -> Result<Option<Approval>, sqlx::Error> {
        let existing = self.get_approval(id).await?;
        if existing.is_none() {
            return Ok(None);
        }
        let appr = existing.unwrap();

        let new_status = status.unwrap_or(appr.status);
        let new_comment = comment.or(appr.comment);
        let new_assignee = assignee_id.or(appr.assignee_id);
        let new_approved_by = approved_by.or(appr.approved_by);
        let new_approved_at = approved_at.or(appr.approved_at);

        let query = r#"
            UPDATE flow.approvals
            SET status = $1, comment = $2, assignee_id = $3, approved_by = $4, approved_at = $5
            WHERE id = $6
            RETURNING id, workflow_instance_id, node_id, task_name, assignee_id, status, approval_type, comment, approved_by, approved_at, timeout_at, created_at
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

        let new_status = match req.action.as_str() {
            "approve" => "approved".to_string(),
            "reject" => "rejected".to_string(),
            "delegate" => "delegated".to_string(),
            _ => appr.status.clone(),
        };

        let new_comment = req.comment.clone().or_else(|| appr.comment.clone());
        let new_assignee = match req.action.as_str() {
            "delegate" => req.delegate_to,
            _ => appr.assignee_id,
        };
        let (new_approved_by, new_approved_at) = match req.action.as_str() {
            "approve" | "reject" => (Some(req.actor_id), Some(Utc::now())),
            _ => (appr.approved_by, appr.approved_at),
        };

        let record = CreateApprovalRecordRequest {
            approval_id: id,
            action: req.action.clone(),
            actor_id: req.actor_id,
            actor_name: req.actor_name,
            comment: req.comment,
            previous_status: appr.status,
            new_status: new_status.clone(),
        };
        self.create_approval_record(record).await.ok();

        self.update_approval(id, Some(new_status), new_comment, new_assignee, new_approved_by, new_approved_at).await
    }

    pub async fn create_approval_record(&self, req: CreateApprovalRecordRequest) -> Result<ApprovalRecord, sqlx::Error> {
        let now = Utc::now();
        let record = ApprovalRecord {
            id: Uuid::new_v4(),
            approval_id: req.approval_id,
            action: req.action,
            actor_id: req.actor_id,
            actor_name: req.actor_name,
            comment: req.comment,
            previous_status: req.previous_status,
            new_status: req.new_status,
            created_at: now,
        };

        let query = r#"
            INSERT INTO flow.approval_records (id, approval_id, action, actor_id, actor_name, comment, previous_status, new_status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, approval_id, action, actor_id, actor_name, comment, previous_status, new_status, created_at
        "#;

        sqlx::query_as::<_, ApprovalRecord>(query)
            .bind(record.id)
            .bind(record.approval_id)
            .bind(&record.action)
            .bind(record.actor_id)
            .bind(&record.actor_name)
            .bind(&record.comment)
            .bind(&record.previous_status)
            .bind(&record.new_status)
            .bind(record.created_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_approval_records(&self, approval_id: Uuid) -> Result<Vec<ApprovalRecord>, sqlx::Error> {
        let query = r#"
            SELECT id, approval_id, action, actor_id, actor_name, comment, previous_status, new_status, created_at
            FROM flow.approval_records
            WHERE approval_id = $1
            ORDER BY created_at ASC
        "#;
        sqlx::query_as::<_, ApprovalRecord>(query)
            .bind(approval_id)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn list_approval_records(
        &self,
        approval_id: Option<Uuid>,
        actor_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<ApprovalRecord>, sqlx::Error> {
        let (mut conditions, mut idx) = (vec![], 1);

        if approval_id.is_some() {
            conditions.push(format!("approval_id = ${}", idx));
            idx += 1;
        }
        if actor_id.is_some() {
            conditions.push(format!("actor_id = ${}", idx));
            idx += 1;
        }

        let where_clause = if conditions.is_empty() {
            "".to_string()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let query = format!(
            r#"
            SELECT id, approval_id, action, actor_id, actor_name, comment, previous_status, new_status, created_at
            FROM flow.approval_records
            {}
            ORDER BY created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            where_clause, idx, idx + 1
        );

        let mut q = sqlx::query_as::<_, ApprovalRecord>(&query);
        if let Some(appr_id) = approval_id {
            q = q.bind(appr_id);
        }
        if let Some(act_id) = actor_id {
            q = q.bind(act_id);
        }
        q = q.bind(limit).bind(offset);
        q.fetch_all(&self.pool).await
    }

    pub async fn get_approvals_by_instance(&self, instance_id: Uuid) -> Result<Vec<Approval>, sqlx::Error> {
        self.list_approvals(Some(instance_id), None, None, 100, 0).await
    }

    pub async fn create_notification(&self, req: CreateNotificationRequest) -> Result<Notification, sqlx::Error> {
        let now = Utc::now();
        let notification = Notification {
            id: Uuid::new_v4(),
            user_id: req.user_id,
            title: req.title,
            content: req.content,
            notification_type: req.notification_type,
            workflow_instance_id: req.workflow_instance_id,
            approval_id: req.approval_id,
            is_read: false,
            created_at: now,
        };

        let query = r#"
            INSERT INTO flow.notifications (id, user_id, title, content, notification_type, workflow_instance_id, approval_id, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, user_id, title, content, notification_type, workflow_instance_id, approval_id, is_read, created_at
        "#;

        sqlx::query_as::<_, Notification>(query)
            .bind(notification.id)
            .bind(notification.user_id)
            .bind(&notification.title)
            .bind(&notification.content)
            .bind(&notification.notification_type)
            .bind(notification.workflow_instance_id)
            .bind(notification.approval_id)
            .bind(notification.is_read)
            .bind(notification.created_at)
            .fetch_one(&self.pool)
            .await
    }

    pub async fn get_notifications_by_user(&self, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Notification>, sqlx::Error> {
        let query = r#"
            SELECT id, user_id, title, content, notification_type, workflow_instance_id, approval_id, is_read, created_at
            FROM flow.notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        "#;
        sqlx::query_as::<_, Notification>(query)
            .bind(user_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn mark_notifications_as_read(&self, user_id: Uuid) -> Result<usize, sqlx::Error> {
        let query = r#"
            UPDATE flow.notifications
            SET is_read = true
            WHERE user_id = $1 AND is_read = false
        "#;
        let result = sqlx::query(query)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() as usize)
    }

    pub async fn get_unread_count(&self, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let query = r#"
            SELECT COUNT(*) FROM flow.notifications
            WHERE user_id = $1 AND is_read = false
        "#;
        let count: i64 = sqlx::query_scalar(query)
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }
}
