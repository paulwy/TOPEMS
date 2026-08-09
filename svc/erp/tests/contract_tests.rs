#[cfg(test)]
mod tests {
    use serde_json::json;

    async fn ensure_api_available() -> bool {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(2))
            .build()
            .unwrap()
            .get("http://localhost:8000/api/core/iam/auth/login")
            .send()
            .await
            .map(|resp| !resp.status().is_server_error())
            .unwrap_or(false)
    }

    #[ignore = "Contract APIs are not implemented in ERP service yet"]
    async fn test_project_contract_crud() {
        eprintln!("⏭ 跳过合同CRUD测试: ERP服务尚未实现合同管理API");
    }

    async fn test_project_budget_crud() {
        let rs_base_url = "http://localhost:8053";
        let erp_base_url = "http://localhost:8010";
        let client = reqwest::Client::new();

        println!("\nTesting Project Budget CRUD...");

        let login_response = client
            .post("http://localhost:8000/api/core/iam/auth/login")
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

        let create_project_response = client
            .post(format!("{}/api/rd/projects", rs_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Budget Test Project",
                "code": "BUDGET-TEST-001",
                "description": "Project for budget testing",
                "project_type": "R_D",
                "leader": "admin",
                "start_date": "2024-01-01T00:00:00Z",
                "budget": 300000.00
            }))
            .send()
            .await
            .expect("Create test project failed");

        let project_data = create_project_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_id = project_data["data"]["id"].as_str().unwrap();

        println!("1. Testing create budget...");
        let create_response = client
            .post(format!("{}/api/erp/budgets", erp_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "budget_type": "CAPITAL",
                "fiscal_year": "2024",
                "total_budget": 300000.00
            }))
            .send()
            .await
            .expect("Create budget failed");

        assert_eq!(create_response.status(), 200);

        let budget_data = create_response.json::<serde_json::Value>().await.unwrap();
        let budget_id = budget_data["data"]["id"].as_str().unwrap();
        println!("   Created budget with ID: {}", budget_id);

        println!("\n2. Testing get budget...");
        let get_response = client
            .get(format!("{}/api/erp/budgets/{}", erp_base_url, budget_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Get budget failed");

        assert_eq!(get_response.status(), 200);

        println!("\n3. Testing list budgets...");
        let list_response = client
            .get(format!("{}/api/erp/budgets", erp_base_url))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("List budgets failed");

        assert_eq!(list_response.status(), 200);

        println!("\n4. Testing update budget...");
        let update_response = client
            .put(format!("{}/api/erp/budgets/{}", erp_base_url, budget_id))
            .bearer_auth(token.clone())
            .json(&json!({
                "total_budget": 350000.00,
                "status": "APPROVED"
            }))
            .send()
            .await
            .expect("Update budget failed");

        assert_eq!(update_response.status(), 200);

        println!("\n5. Testing delete budget...");
        let delete_response = client
            .delete(format!("{}/api/erp/budgets/{}", erp_base_url, budget_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete budget failed");

        assert_eq!(delete_response.status(), 200);

        client
            .delete(format!("{}/api/rd/projects/{}", rs_base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Project Budget CRUD tests passed!");
    }

    #[ignore = "Payment schedule APIs are not implemented in ERP service yet"]
    async fn test_payment_schedule_crud() {
        eprintln!("⏭ 跳过付款计划CRUD测试: ERP服务尚未实现付款计划API");
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_contract_integration() {
        if !ensure_api_available().await {
            eprintln!("⏭ 跳过: API服务未运行 (localhost:8000)");
            return;
        }
        test_project_budget_crud().await;
    }
}
