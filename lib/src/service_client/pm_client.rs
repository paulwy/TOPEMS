use super::generic::ApiResponse;

crate::define_service_client!(
    PmServiceClient,
    "PM_SERVICE_URL",
    "http://localhost:8010",
    {
        list_projects(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects?page={}&pagesize={}"
        }
        get_project(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/pm/projects/{}"
        }
        create_project() -> ApiResponse<serde_json::Value> {
            post => "/api/pm/projects"; body: data: &serde_json::Value
        }
        update_project(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/pm/projects/{}"; body: data: &serde_json::Value
        }
        delete_project(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/pm/projects/{}"
        }
        list_phases(project_id: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/phases"
        }
        list_milestones(project_id: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/milestones"
        }
        list_tasks(project_id: &str, page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/tasks?page={}&pagesize={}"
        }
        list_members(project_id: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/members"
        }
        get_budget(project_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/pm/projects/{}/budget"
        }
        list_risks(project_id: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/risks"
        }
        list_issues(project_id: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/issues"
        }
        list_documents(project_id: &str) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pm/projects/{}/documents"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/pm/dashboard/stats"
        }
    }
);
