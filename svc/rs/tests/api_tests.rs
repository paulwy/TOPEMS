#[cfg(test)]
#[allow(clippy::needless_borrows_for_generic_args)]
mod tests {
    use serde_json::json;

    async fn test_project_crud() {
        let base_url = "http://localhost:8020";
        let client = reqwest::Client::new();

        println!("Testing RS Project CRUD...");

        let login_response = client
            .post("http://localhost:8000/api/v1/auth/login")
            .json(&json!({
                "username": "admin",
                "password": "admin123"
            }))
            .send()
            .await
            .expect("Login failed");

        let json_response = login_response.json::<serde_json::Value>().await.unwrap();

        let token = json_response["data"]["access_token"]
            .as_str()
            .unwrap()
            .to_string();

        println!("1. Testing create project...");
        let create_response = client
            .post(&format!("{}/api/v1/projects", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "name": "Integration Test Project",
                "code": "INT-001",
                "description": "Created by integration test",
                "project_type": "R_D",
                "leader": "admin",
                "team_members": ["user1", "user2"],
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-12-31T23:59:59Z",
                "budget": 100000.00
            }))
            .send()
            .await
            .expect("Create project failed");

        assert_eq!(create_response.status(), 200);

        let created_data = create_response.json::<serde_json::Value>().await.unwrap();
        println!(
            "Create response: {}",
            serde_json::to_string_pretty(&created_data).unwrap()
        );

        let project_id = created_data["data"]["id"].as_str().unwrap();
        println!("   Created project with ID: {}", project_id);

        println!("\n2. Testing list projects...");
        let list_response = client
            .get(&format!("{}/api/v1/projects", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List projects failed");

        assert_eq!(list_response.status(), 200);

        println!("\n3. Testing get project...");
        let get_response = client
            .get(&format!("{}/api/v1/projects/{}", base_url, project_id))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Get project failed");

        assert_eq!(get_response.status(), 200);

        println!("\n4. Testing update project...");
        let update_response = client
            .put(&format!("{}/api/v1/projects/{}", base_url, project_id))
            .bearer_auth(&token)
            .json(&json!({
                "name": "Updated Integration Test Project",
                "status": "ACTIVE",
                "progress": 25
            }))
            .send()
            .await
            .expect("Update project failed");

        assert_eq!(update_response.status(), 200);

        println!("\n5. Testing delete project...");
        let delete_response = client
            .delete(&format!("{}/api/v1/projects/{}", base_url, project_id))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Delete project failed");

        assert_eq!(delete_response.status(), 200);

        println!("\n✅ RS Project CRUD integration tests passed!");
    }

    async fn test_project_batch_operations() {
        let base_url = "http://localhost:8020";
        let client = reqwest::Client::new();

        println!("\nTesting RS Project Batch Operations...");

        let login_response = client
            .post("http://localhost:8000/api/v1/auth/login")
            .json(&json!({
                "username": "admin",
                "password": "admin123"
            }))
            .send()
            .await
            .expect("Login failed");

        let json_response = login_response.json::<serde_json::Value>().await.unwrap();

        let token = json_response["data"]["access_token"]
            .as_str()
            .unwrap()
            .to_string();

        println!("\n1. Testing batch create projects...");
        let batch_create_response = client
            .post(&format!("{}/api/v1/projects/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "projects": [
                    {
                        "name": "Batch Test Project 1",
                        "code": "BATCH-001",
                        "description": "First batch project",
                        "project_type": "R_D",
                        "leader": "admin",
                        "team_members": ["user1"],
                        "start_date": "2024-01-01T00:00:00Z",
                        "end_date": "2024-06-30T23:59:59Z",
                        "budget": 50000.00
                    },
                    {
                        "name": "Batch Test Project 2",
                        "code": "BATCH-002",
                        "description": "Second batch project",
                        "project_type": "R_D",
                        "leader": "admin",
                        "team_members": ["user2"],
                        "start_date": "2024-01-01T00:00:00Z",
                        "end_date": "2024-06-30T23:59:59Z",
                        "budget": 50000.00
                    }
                ]
            }))
            .send()
            .await
            .expect("Batch create projects failed");

        assert_eq!(batch_create_response.status(), 200);

        let batch_create_data = batch_create_response
            .json::<serde_json::Value>()
            .await
            .unwrap();

        let created_count = batch_create_data["data"]["success"].as_i64().unwrap();
        println!("   Batch created {} projects", created_count);

        // 获取刚创建的项目的 ID
        println!("\n2. Fetching created projects to get IDs...");
        let list_after_create = client
            .get(&format!("{}/api/v1/projects", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List projects after batch create failed");

        let projects = list_after_create.json::<serde_json::Value>().await.unwrap();
        let project_ids: Vec<String> = projects["data"]["projects"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|p| {
                p["name"]
                    .as_str()
                    .unwrap_or("")
                    .starts_with("Batch Test Project")
            })
            .map(|p| p["id"].as_str().unwrap().to_string())
            .collect();

        println!("\n3. Testing batch delete projects...");
        let batch_delete_response = client
            .delete(&format!("{}/api/v1/projects/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "ids": project_ids
            }))
            .send()
            .await
            .expect("Batch delete projects failed");

        assert_eq!(batch_delete_response.status(), 200);

        let batch_delete_data = batch_delete_response
            .json::<serde_json::Value>()
            .await
            .unwrap();

        let deleted_count = batch_delete_data["data"]["success"].as_i64().unwrap();
        println!("   Batch deleted {} projects", deleted_count);

        println!("\n✅ RS Project Batch Operations integration tests passed!");
    }

    async fn test_project_export_import() {
        let base_url = "http://localhost:8020";
        let client = reqwest::Client::new();

        println!("\nTesting RS Project Export/Import...");

        let login_response = client
            .post("http://localhost:8000/api/v1/auth/login")
            .json(&json!({
                "username": "admin",
                "password": "admin123"
            }))
            .send()
            .await
            .expect("Login failed");

        let json_response = login_response.json::<serde_json::Value>().await.unwrap();

        let token = json_response["data"]["access_token"]
            .as_str()
            .unwrap()
            .to_string();

        // 首先创建几个测试项目
        println!("\n1. Creating test projects for export...");
        for i in 1..=2 {
            client
                .post(&format!("{}/api/v1/projects", base_url))
                .bearer_auth(&token)
                .json(&json!({
                    "name": format!("Export Test Project {}", i),
                    "code": format!("EXPORT-00{}", i),
                    "description": format!("Project {} for export testing", i),
                    "project_type": "R_D",
                    "leader": "admin",
                    "team_members": ["user1"],
                    "start_date": "2024-01-01T00:00:00Z",
                    "end_date": "2024-12-31T23:59:59Z",
                    "budget": 50000.00
                }))
                .send()
                .await
                .expect("Create test project failed");
        }

        // 测试导出
        println!("\n2. Testing export projects...");
        let export_response = client
            .get(&format!("{}/api/v1/projects/export", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Export projects failed");

        assert_eq!(export_response.status(), 200);

        let export_content = export_response
            .text()
            .await
            .expect("Failed to read export content");
        println!("   Export response length: {} bytes", export_content.len());
        assert!(!export_content.is_empty());

        // 先删除刚创建的项目，然后测试导入
        println!("\n3. Deleting test projects to prepare for import...");
        let list_before_delete = client
            .get(&format!("{}/api/v1/projects", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List projects before delete failed");

        let projects_before_delete = list_before_delete
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_ids_to_delete: Vec<String> = projects_before_delete["data"]["projects"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|p| {
                p["name"]
                    .as_str()
                    .unwrap_or("")
                    .starts_with("Export Test Project")
            })
            .map(|p| p["id"].as_str().unwrap().to_string())
            .collect();

        client
            .delete(&format!("{}/api/v1/projects/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({ "ids": project_ids_to_delete }))
            .send()
            .await
            .expect("Delete test projects failed");

        // 测试导入
        println!("\n4. Testing import projects...");
        // 创建一个简单的 CSV 内容进行导入测试
        let import_csv_content = "\
id,name,code,description,project_type,status,leader,team_members,start_date,end_date,budget,progress,created_by,created_at,updated_at
,Import Test Project 1,IMPORT-001,Imported from CSV,research,draft,admin,[],2024-01-01T00:00:00+00:00,2024-12-31T23:59:59+00:00,50000.00,0,admin,2024-01-01T00:00:00+00:00,2024-01-01T00:00:00+00:00
,Import Test Project 2,IMPORT-002,Another imported project,research,draft,admin,[user2],2024-01-01T00:00:00+00:00,2024-12-31T23:59:59+00:00,75000.00,0,admin,2024-01-01T00:00:00+00:00,2024-01-01T00:00:00+00:00
";

        let import_response = client
            .post(&format!("{}/api/v1/projects/import", base_url))
            .bearer_auth(&token)
            .header("Content-Type", "text/csv")
            .body(import_csv_content)
            .send()
            .await
            .expect("Import projects failed");

        assert_eq!(import_response.status(), 200);

        let import_data = import_response.json::<serde_json::Value>().await.unwrap();

        let imported_count = import_data["data"]["success"].as_i64().unwrap();
        println!("   Imported {} projects", imported_count);

        // 清理导入的项目
        println!("\n5. Cleaning up imported projects...");
        let list_after_import = client
            .get(&format!("{}/api/v1/projects", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List projects after import failed");

        let projects_after_import = list_after_import.json::<serde_json::Value>().await.unwrap();
        let imported_project_ids: Vec<String> = projects_after_import["data"]["projects"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|p| {
                p["name"]
                    .as_str()
                    .unwrap_or("")
                    .starts_with("Import Test Project")
            })
            .map(|p| p["id"].as_str().unwrap().to_string())
            .collect();

        client
            .delete(&format!("{}/api/v1/projects/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({ "ids": imported_project_ids }))
            .send()
            .await
            .expect("Cleanup imported projects failed");

        println!("\n✅ RS Project Export/Import integration tests passed!");
    }

    async fn test_audit_logs() {
        let base_url = "http://localhost:8020";
        let client = reqwest::Client::new();

        println!("\nTesting RS Audit Logs...");

        let login_response = client
            .post("http://localhost:8000/api/v1/auth/login")
            .json(&json!({
                "username": "admin",
                "password": "admin123"
            }))
            .send()
            .await
            .expect("Login failed");

        let json_response = login_response.json::<serde_json::Value>().await.unwrap();

        let token = json_response["data"]["access_token"]
            .as_str()
            .unwrap()
            .to_string();

        // 先执行一些操作，生成审计日志
        println!("\n1. Performing some operations to generate audit logs...");

        // 创建一个项目
        let create_response = client
            .post(&format!("{}/api/v1/projects", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "name": "Audit Test Project",
                "code": "AUDIT-001",
                "description": "Project for audit log testing",
                "project_type": "R_D",
                "leader": "admin",
                "team_members": ["user1"],
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-12-31T23:59:59Z",
                "budget": 50000.00
            }))
            .send()
            .await
            .expect("Create audit test project failed");

        let created_data = create_response.json::<serde_json::Value>().await.unwrap();
        let audit_project_id = created_data["data"]["id"].as_str().unwrap();

        // 删除这个项目
        client
            .delete(&format!(
                "{}/api/v1/projects/{}",
                base_url, audit_project_id
            ))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Delete audit test project failed");

        // 测试获取审计日志列表
        println!("\n2. Testing list audit logs...");
        let list_logs_response = client
            .get(&format!("{}/api/v1/audit-logs", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(list_logs_response.status(), 200);

        let logs_data = list_logs_response
            .json::<serde_json::Value>()
            .await
            .unwrap();

        // 检查返回的数据结构
        assert!(logs_data["data"]["audit_logs"].is_array());
        println!(
            "   Got {} audit logs",
            logs_data["data"]["audit_logs"].as_array().unwrap().len()
        );

        // 如果有日志，获取第一个日志的详情
        if let Some(logs_array) = logs_data["data"]["audit_logs"].as_array() {
            if let Some(first_log) = logs_array.first() {
                if let Some(log_id) = first_log["id"].as_str() {
                    println!("\n3. Testing get single audit log...");
                    let get_log_response = client
                        .get(&format!("{}/api/v1/audit-logs/{}", base_url, log_id))
                        .bearer_auth(&token)
                        .send()
                        .await
                        .expect("Get audit log failed");

                    assert_eq!(get_log_response.status(), 200);
                    println!("   Successfully retrieved audit log with ID: {}", log_id);
                }
            }
        }

        println!("\n✅ RS Audit Logs integration tests passed!");
    }

    #[tokio::test]
    #[ignore = "集成测试需要运行 rs:8020 和 iam:8000 服务"]
    async fn test_rs_integration() {
        test_project_crud().await;
        test_project_batch_operations().await;
        test_project_export_import().await;
        test_audit_logs().await;
    }
}
