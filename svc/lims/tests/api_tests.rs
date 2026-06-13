#[cfg(test)]
mod tests {
    use serde_json::json;

    async fn test_sample_crud() {
        let base_url = "http://localhost:8022";
        let client = reqwest::Client::new();

        println!("Testing LIMS Sample CRUD...");

        let login_response = client
            .post("http://localhost:8000/api/v1/auth/login")
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .json(&json!({
                "username": "admin",
                "password": "admin123"
            }))
            .send()
            .await
            .expect("Login failed");

        // 检查响应状态
        let status = login_response.status();
        if !status.is_success() {
            panic!("Login failed with status: {}", status);
        }

        let json_response = login_response
            .json::<serde_json::Value>()
            .await
            .expect("Failed to parse login response");

        let token = json_response["data"]["access_token"]
            .as_str()
            .expect("No access_token in response")
            .to_string();

        println!("1. Testing create sample...");
        let create_response = client
            .post(format!("{}/api/v1/samples", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "name": "Integration Test Sample",
                "description": "Created by integration test",
                "status": "received"
            }))
            .send()
            .await
            .expect("Create sample failed");

        assert_eq!(create_response.status(), 200);

        let created_data = create_response.json::<serde_json::Value>().await.unwrap();

        let sample_id = created_data["data"]["id"].as_str().unwrap();
        println!("   Created sample with ID: {}", sample_id);

        println!("\n2. Testing list samples...");
        let list_response = client
            .get(format!("{}/api/v1/samples", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List samples failed");

        assert_eq!(list_response.status(), 200);

        println!("\n3. Testing get sample...");
        let get_response = client
            .get(format!("{}/api/v1/samples/{}", base_url, sample_id))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Get sample failed");

        assert_eq!(get_response.status(), 200);

        println!("\n4. Testing update sample...");
        let update_response = client
            .put(format!("{}/api/v1/samples/{}", base_url, sample_id))
            .bearer_auth(&token)
            .json(&json!({
                "name": "Updated Integration Test Sample",
                "status": "testing"
            }))
            .send()
            .await
            .expect("Update sample failed");

        assert_eq!(update_response.status(), 200);

        println!("\n5. Testing delete sample...");
        let delete_response = client
            .delete(format!("{}/api/v1/samples/{}", base_url, sample_id))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Delete sample failed");

        assert_eq!(delete_response.status(), 200);

        println!("\n✅ LIMS Sample CRUD integration tests passed!");
    }

    async fn test_sample_batch_operations() {
        let base_url = "http://localhost:8022";
        let client = reqwest::Client::new();

        println!("\nTesting LIMS Sample Batch Operations...");

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

        println!("\n1. Testing batch create samples...");
        let batch_create_response = client
            .post(format!("{}/api/v1/samples/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "samples": [
                    {
                        "name": "Batch Test Sample 1",
                        "description": "First batch sample",
                        "status": "received"
                    },
                    {
                        "name": "Batch Test Sample 2",
                        "description": "Second batch sample",
                        "status": "received"
                    },
                    {
                        "name": "Batch Test Sample 3",
                        "description": "Third batch sample",
                        "status": "received"
                    }
                ]
            }))
            .send()
            .await
            .expect("Batch create samples failed");

        assert_eq!(batch_create_response.status(), 200);

        let batch_create_data = batch_create_response
            .json::<serde_json::Value>()
            .await
            .unwrap();

        let created_count = batch_create_data["data"]["success"].as_i64().unwrap();
        println!("   Batch created {} samples", created_count);

        println!("\n2. Fetching created samples to get IDs...");
        let list_after_create = client
            .get(format!("{}/api/v1/samples", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List samples after batch create failed");

        let samples = list_after_create.json::<serde_json::Value>().await.unwrap();
        let sample_ids: Vec<String> = samples["data"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|s| {
                s["name"]
                    .as_str()
                    .unwrap_or("")
                    .starts_with("Batch Test Sample")
            })
            .map(|s| s["id"].as_str().unwrap().to_string())
            .collect();

        println!("\n3. Testing batch delete samples...");
        let batch_delete_response = client
            .delete(format!("{}/api/v1/samples/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "ids": sample_ids
            }))
            .send()
            .await
            .expect("Batch delete samples failed");

        assert_eq!(batch_delete_response.status(), 200);

        let batch_delete_data = batch_delete_response
            .json::<serde_json::Value>()
            .await
            .unwrap();

        let deleted_count = batch_delete_data["data"]["success"].as_i64().unwrap();
        println!("   Batch deleted {} samples", deleted_count);

        println!("\n✅ LIMS Sample Batch Operations integration tests passed!");
    }

    async fn test_sample_export_import() {
        let base_url = "http://localhost:8022";
        let client = reqwest::Client::new();

        println!("\nTesting LIMS Sample Export/Import...");

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

        println!("\n1. Creating test samples for export...");
        for i in 1..=2 {
            client
                .post(format!("{}/api/v1/samples", base_url))
                .bearer_auth(&token)
                .json(&json!({
                    "name": format!("Export Test Sample {}", i),
                    "description": format!("Sample {} for export testing", i),
                    "status": "received"
                }))
                .send()
                .await
                .expect("Create test sample failed");
        }

        println!("\n2. Testing export samples...");
        let export_response = client
            .get(format!("{}/api/v1/samples/export", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Export samples failed");

        assert_eq!(export_response.status(), 200);

        let export_content = export_response
            .text()
            .await
            .expect("Failed to read export content");
        println!("   Export response length: {} bytes", export_content.len());
        assert!(!export_content.is_empty());

        println!("\n3. Deleting test samples to prepare for import...");
        let list_before_delete = client
            .get(format!("{}/api/v1/samples", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List samples before delete failed");

        let samples_before_delete = list_before_delete
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let sample_ids_to_delete: Vec<String> = samples_before_delete["data"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|s| {
                s["name"]
                    .as_str()
                    .unwrap_or("")
                    .starts_with("Export Test Sample")
            })
            .map(|s| s["id"].as_str().unwrap().to_string())
            .collect();

        client
            .delete(format!("{}/api/v1/samples/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({ "ids": sample_ids_to_delete }))
            .send()
            .await
            .expect("Delete test samples failed");

        println!("\n4. Testing import samples...");
        let import_csv_content = "\
id,name,description,status,project_id,received_date,created_at,updated_at
,Import Test Sample 1,Imported from CSV,received,,2024-01-01T00:00:00+00:00,2024-01-01T00:00:00+00:00,2024-01-01T00:00:00+00:00
,Import Test Sample 2,Another imported sample,received,,2024-01-01T00:00:00+00:00,2024-01-01T00:00:00+00:00,2024-01-01T00:00:00+00:00
";

        let import_response = client
            .post(format!("{}/api/v1/samples/import", base_url))
            .bearer_auth(&token)
            .header("Content-Type", "text/csv")
            .body(import_csv_content)
            .send()
            .await
            .expect("Import samples failed");

        assert_eq!(import_response.status(), 200);

        let import_data = import_response.json::<serde_json::Value>().await.unwrap();

        let imported_count = import_data["data"]["success"].as_i64().unwrap();
        println!("   Imported {} samples", imported_count);

        println!("\n5. Cleaning up imported samples...");
        let list_after_import = client
            .get(format!("{}/api/v1/samples", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List samples after import failed");

        let samples_after_import = list_after_import.json::<serde_json::Value>().await.unwrap();
        let imported_sample_ids: Vec<String> = samples_after_import["data"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|s| {
                s["name"]
                    .as_str()
                    .unwrap_or("")
                    .starts_with("Import Test Sample")
            })
            .map(|s| s["id"].as_str().unwrap().to_string())
            .collect();

        client
            .delete(format!("{}/api/v1/samples/batch", base_url))
            .bearer_auth(&token)
            .json(&json!({ "ids": imported_sample_ids }))
            .send()
            .await
            .expect("Cleanup imported samples failed");

        println!("\n✅ LIMS Sample Export/Import integration tests passed!");
    }

    async fn test_audit_logs() {
        let base_url = "http://localhost:8022";
        let client = reqwest::Client::new();

        println!("\nTesting LIMS Audit Logs...");

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

        println!("\n1. Performing some operations to generate audit logs...");

        let create_response = client
            .post(format!("{}/api/v1/samples", base_url))
            .bearer_auth(&token)
            .json(&json!({
                "name": "Audit Test Sample",
                "description": "Sample for audit log testing",
                "status": "received"
            }))
            .send()
            .await
            .expect("Create audit test sample failed");

        let created_data = create_response.json::<serde_json::Value>().await.unwrap();
        let audit_sample_id = created_data["data"]["id"].as_str().unwrap();

        client
            .delete(format!("{}/api/v1/samples/{}", base_url, audit_sample_id))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Delete audit test sample failed");

        println!("\n2. Testing list audit logs...");
        let list_logs_response = client
            .get(format!("{}/api/v1/audit-logs", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(list_logs_response.status(), 200);

        let logs_data = list_logs_response
            .json::<serde_json::Value>()
            .await
            .unwrap();

        assert!(logs_data["data"]["audit_logs"].is_array());
        println!(
            "   Got {} audit logs",
            logs_data["data"]["audit_logs"].as_array().unwrap().len()
        );

        if let Some(logs_array) = logs_data["data"]["audit_logs"].as_array() {
            if let Some(first_log) = logs_array.first() {
                if let Some(log_id) = first_log["id"].as_str() {
                    println!("\n3. Testing get single audit log...");
                    let get_log_response = client
                        .get(format!("{}/api/v1/audit-logs/{}", base_url, log_id))
                        .bearer_auth(&token)
                        .send()
                        .await
                        .expect("Get audit log failed");

                    assert_eq!(get_log_response.status(), 200);
                    println!("   Successfully retrieved audit log with ID: {}", log_id);
                }
            }
        }

        println!("\n✅ LIMS Audit Logs integration tests passed!");
    }

    #[tokio::test]
    #[ignore = "集成测试需要运行 lims:8022 和 iam:8000 服务"]
    async fn test_lims_integration() {
        test_sample_crud().await;
        test_sample_batch_operations().await;
        test_sample_export_import().await;
        test_audit_logs().await;
    }
}
