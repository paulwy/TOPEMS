use reqwest::Client;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub title: String,
    pub status: String,
    pub current_node_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateInstanceRequest {
    pub workflow_id: Uuid,
    pub title: String,
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskActionRequest {
    pub comment: Option<String>,
}

#[derive(Debug, Clone)]
pub struct WorkflowClient {
    base_url: String,
    client: Client,
}

impl WorkflowClient {
    pub fn new(base_url: &str) -> Self {
        WorkflowClient {
            base_url: base_url.to_string(),
            client: Client::new(),
        }
    }

    pub async fn create_instance(
        &self,
        request: CreateInstanceRequest,
    ) -> Result<WorkflowInstance, anyhow::Error> {
        let url = format!("{}/api/flow/instances", self.base_url);
        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to create workflow instance: {}",
                response.status()
            ));
        }

        let result: ApiResponse<WorkflowInstance> = response.json().await?;
        result
            .data
            .ok_or_else(|| anyhow::anyhow!("No data returned"))
    }

    pub async fn get_instance(&self, instance_id: Uuid) -> Result<WorkflowInstance, anyhow::Error> {
        let url = format!("{}/api/flow/instances/{}", self.base_url, instance_id);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to get workflow instance: {}",
                response.status()
            ));
        }

        let result: ApiResponse<WorkflowInstance> = response.json().await?;
        result
            .data
            .ok_or_else(|| anyhow::anyhow!("No data returned"))
    }

    pub async fn list_todo_tasks(
        &self,
        user_id: &str,
    ) -> Result<Vec<WorkflowInstance>, anyhow::Error> {
        let url = format!("{}/api/flow/tasks/todo?user_id={}", self.base_url, user_id);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to list todo tasks: {}",
                response.status()
            ));
        }

        let result: ApiResponse<Vec<WorkflowInstance>> = response.json().await?;
        result
            .data
            .ok_or_else(|| anyhow::anyhow!("No data returned"))
    }

    pub async fn approve_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> Result<WorkflowInstance, anyhow::Error> {
        let url = format!(
            "{}/api/flow/instances/{}/approve",
            self.base_url, instance_id
        );
        let request = TaskActionRequest { comment };
        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to approve workflow instance: {}",
                response.status()
            ));
        }

        let result: ApiResponse<WorkflowInstance> = response.json().await?;
        result
            .data
            .ok_or_else(|| anyhow::anyhow!("No data returned"))
    }

    pub async fn reject_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> Result<WorkflowInstance, anyhow::Error> {
        let url = format!(
            "{}/api/flow/instances/{}/reject",
            self.base_url, instance_id
        );
        let request = TaskActionRequest { comment };
        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to reject workflow instance: {}",
                response.status()
            ));
        }

        let result: ApiResponse<WorkflowInstance> = response.json().await?;
        result
            .data
            .ok_or_else(|| anyhow::anyhow!("No data returned"))
    }
}
