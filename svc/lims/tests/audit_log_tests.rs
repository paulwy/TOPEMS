#[cfg(test)]
#[allow(clippy::needless_borrows_for_generic_args)]
mod tests {
    use serde_json::json;

    async fn get_auth_token() -> String {
        let client = reqwest::Client::new();
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
        json_response["data"]["access_token"]
            .as_str()
            .unwrap()
            .to_string()
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_audit_logs_success() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing list audit logs with valid parameters...");

        let response = client
            .get(&format!(
                "{}/api/lims/audit-logs?page=1&pagesize=20",
                base_url
            ))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(response.status(), 200);

        let json_response = response.json::<serde_json::Value>().await.unwrap();
        assert!(json_response["success"].as_bool().unwrap());
        assert!(json_response["data"].is_object());
        assert!(json_response["data"]["audit_logs"].is_array());
        assert!(json_response["data"]["total"].is_number());
        assert!(json_response["data"]["page"].is_number());
        assert!(json_response["data"]["page_size"].is_number());

        println!(
            "✓ List audit logs success: {} records",
            json_response["data"]["total"].as_i64().unwrap()
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_audit_logs_invalid_start_date() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing list audit logs with invalid start date...");

        let response = client
            .get(&format!(
                "{}/api/lims/audit-logs?start_date=invalid-date&page=1&pagesize=20",
                base_url
            ))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(response.status(), 200);

        let json_response = response.json::<serde_json::Value>().await.unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["code"].as_i64().unwrap(), 400);
        assert!(json_response["message"]
            .as_str()
            .unwrap()
            .contains("日期格式"));

        println!("✓ List audit logs invalid start date returns 400");
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_audit_logs_invalid_end_date() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing list audit logs with invalid end date...");

        let response = client
            .get(&format!(
                "{}/api/lims/audit-logs?end_date=invalid-date&page=1&pagesize=20",
                base_url
            ))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(response.status(), 200);

        let json_response = response.json::<serde_json::Value>().await.unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["code"].as_i64().unwrap(), 400);
        assert!(json_response["message"]
            .as_str()
            .unwrap()
            .contains("日期格式"));

        println!("✓ List audit logs invalid end date returns 400");
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_audit_logs_with_valid_date_range() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing list audit logs with valid date range...");

        let response = client
            .get(&format!("{}/api/lims/audit-logs?start_date=2024-01-01T00:00:00Z&end_date=2025-12-31T23:59:59Z&page=1&pagesize=20", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(response.status(), 200);

        let json_response = response.json::<serde_json::Value>().await.unwrap();
        assert!(json_response["success"].as_bool().unwrap());
        assert!(json_response["data"].is_object());

        println!("✓ List audit logs with valid date range success");
    }

    #[tokio::test]
    #[ignore]
    async fn test_get_audit_log_not_found() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing get audit log with non-existent ID...");

        let non_existent_id = "00000000-0000-0000-0000-000000000000";
        let response = client
            .get(&format!(
                "{}/api/lims/audit-logs/{}",
                base_url, non_existent_id
            ))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Get audit log failed");

        assert_eq!(response.status(), 200);

        let json_response = response.json::<serde_json::Value>().await.unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["code"].as_i64().unwrap(), 404);
        assert!(json_response["message"]
            .as_str()
            .unwrap()
            .contains("不存在"));

        println!("✓ Get audit log not found returns 404");
    }

    #[tokio::test]
    #[ignore]
    async fn test_export_audit_logs_success() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing export audit logs...");

        let response = client
            .get(&format!("{}/api/lims/audit-logs/export", base_url))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Export audit logs failed");

        assert_eq!(response.status(), 200);
        assert!(response.headers().contains_key("Content-Type"));
        assert!(response.headers().contains_key("Content-Disposition"));

        let content_type = response
            .headers()
            .get("Content-Type")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(content_type.contains("text/csv"));

        println!("✓ Export audit logs success");
    }

    #[tokio::test]
    #[ignore]
    async fn test_export_audit_logs_invalid_date() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();
        let token = get_auth_token().await;

        println!("Testing export audit logs with invalid date...");

        let response = client
            .get(&format!(
                "{}/api/lims/audit-logs/export?start_date=invalid-date",
                base_url
            ))
            .bearer_auth(&token)
            .send()
            .await
            .expect("Export audit logs failed");

        assert_eq!(response.status(), 200);

        let json_response = response.json::<serde_json::Value>().await.unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["code"].as_i64().unwrap(), 400);
        assert!(json_response["message"]
            .as_str()
            .unwrap()
            .contains("日期格式"));

        println!("✓ Export audit logs invalid date returns 400");
    }

    #[tokio::test]
    #[ignore]
    async fn test_list_audit_logs_unauthorized() {
        let base_url = "http://localhost:8051";
        let client = reqwest::Client::new();

        println!("Testing list audit logs without authorization...");

        let response = client
            .get(&format!(
                "{}/api/lims/audit-logs?page=1&pagesize=20",
                base_url
            ))
            .send()
            .await
            .expect("List audit logs failed");

        assert_eq!(response.status(), 401);

        println!("✓ List audit logs without auth returns 401");
    }
}
