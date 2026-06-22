#[cfg(test)]
mod tests {
    use serde_json::json;

    async fn test_project_contract_crud() {
        let rs_base_url = "http://localhost:8058";
        let erp_base_url = "http://localhost:8010";
        let client = reqwest::Client::new();

        println!("Testing Project Contract CRUD...");

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
            .unwrap()
            .to_string();

        let create_project_response = client
            .post(format!("{}/api/v1/projects", rs_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Contract Test Project",
                "code": "CONTRACT-TEST-001",
                "description": "Project for contract testing",
                "project_type": "R_D",
                "leader": "admin",
                "start_date": "2024-01-01T00:00:00Z",
                "budget": 200000.00
            }))
            .send()
            .await
            .expect("Create test project failed");

        let project_data = create_project_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_id = project_data["data"]["id"].as_str().unwrap();

        println!("1. Testing create contract...");
        let create_response = client
            .post(format!("{}/api/v1/contracts", erp_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "contract_no": "CT-2024-001",
                "project_id": project_id,
                "contract_type": "SALES",
                "counterparty": "Test Customer Inc.",
                "contract_amount": 150000.00,
                "tax_amount": 19500.00,
                "total_amount": 169500.00,
                "sign_date": "2024-01-15T00:00:00Z",
                "effective_date": "2024-02-01T00:00:00Z",
                "expire_date": "2024-12-31T23:59:59Z",
                "payment_terms": "30% upfront, 70% on delivery",
                "description": "Contract for R&D services"
            }))
            .send()
            .await
            .expect("Create contract failed");

        assert_eq!(create_response.status(), 200);

        let contract_data = create_response.json::<serde_json::Value>().await.unwrap();
        let contract_id = contract_data["id"].as_str().unwrap();
        println!("   Created contract with ID: {}", contract_id);

        println!("\n2. Testing get contract...");
        let get_response = client
            .get(format!("{}/api/v1/contracts/{}", erp_base_url, contract_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Get contract failed");

        assert_eq!(get_response.status(), 200);

        println!("\n3. Testing list contracts...");
        let list_response = client
            .get(format!("{}/api/v1/contracts", erp_base_url))
            .bearer_auth(token.clone())
            .query(&[("project_id", project_id)])
            .send()
            .await
            .expect("List contracts failed");

        assert_eq!(list_response.status(), 200);

        println!("\n4. Testing update contract...");
        let update_response = client
            .put(format!("{}/api/v1/contracts/{}", erp_base_url, contract_id))
            .bearer_auth(token.clone())
            .json(&json!({
                "contract_amount": 180000.00,
                "tax_amount": 23400.00,
                "total_amount": 203400.00,
                "status": "ACTIVE"
            }))
            .send()
            .await
            .expect("Update contract failed");

        assert_eq!(update_response.status(), 200);

        println!("\n5. Testing delete contract...");
        let delete_response = client
            .delete(format!("{}/api/v1/contracts/{}", erp_base_url, contract_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete contract failed");

        assert_eq!(delete_response.status(), 204);

        client
            .delete(format!("{}/api/v1/projects/{}", rs_base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Project Contract CRUD tests passed!");
    }

    async fn test_project_budget_crud() {
        let rs_base_url = "http://localhost:8058";
        let erp_base_url = "http://localhost:8010";
        let client = reqwest::Client::new();

        println!("\nTesting Project Budget CRUD...");

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

        let create_project_response = client
            .post(format!("{}/api/v1/projects", rs_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Budget Test Project",
                "code": "BUDGET-TEST-001",
                "description": "Project for budget testing",
                "project_type": "R&D",
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
            .post(format!("{}/api/v1/budgets", erp_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "project_id": project_id,
                "budget_type": "CAPITAL",
                "amount": 300000.00,
                "description": "Project capital budget",
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2024-12-31T23:59:59Z"
            }))
            .send()
            .await
            .expect("Create budget failed");

        assert_eq!(create_response.status(), 200);

        let budget_data = create_response.json::<serde_json::Value>().await.unwrap();
        let budget_id = budget_data["id"].as_str().unwrap();
        println!("   Created budget with ID: {}", budget_id);

        println!("\n2. Testing create budget items...");
        let create_item_response = client
            .post(format!(
                "{}/api/v1/budgets/{}/items",
                erp_base_url, budget_id
            ))
            .bearer_auth(token.clone())
            .json(&json!({
                "budget_id": budget_id,
                "category": "PERSONNEL",
                "amount": 150000.00,
                "description": "Team salaries"
            }))
            .send()
            .await
            .expect("Create budget item failed");

        assert_eq!(create_item_response.status(), 200);

        let item_data = create_item_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let item_id = item_data["id"].as_str().unwrap();
        println!("   Created budget item with ID: {}", item_id);

        println!("\n3. Testing update budget...");
        let update_response = client
            .put(format!("{}/api/v1/budgets/{}", erp_base_url, budget_id))
            .bearer_auth(token.clone())
            .json(&json!({
                "amount": 350000.00,
                "status": "APPROVED"
            }))
            .send()
            .await
            .expect("Update budget failed");

        assert_eq!(update_response.status(), 200);

        println!("\n4. Testing delete budget item...");
        let delete_item_response = client
            .delete(format!("{}/api/v1/budget-items/{}", erp_base_url, item_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete budget item failed");

        assert_eq!(delete_item_response.status(), 204);

        println!("\n5. Testing delete budget...");
        let delete_response = client
            .delete(format!("{}/api/v1/budgets/{}", erp_base_url, budget_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete budget failed");

        assert_eq!(delete_response.status(), 204);

        client
            .delete(format!("{}/api/v1/projects/{}", rs_base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Project Budget CRUD tests passed!");
    }

    async fn test_payment_schedule_crud() {
        let rs_base_url = "http://localhost:8058";
        let erp_base_url = "http://localhost:8010";
        let client = reqwest::Client::new();

        println!("\nTesting Payment Schedule CRUD...");

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

        let create_project_response = client
            .post(format!("{}/api/v1/projects", rs_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Payment Schedule Test Project",
                "code": "PAYMENT-TEST-001",
                "description": "Project for payment schedule testing",
                "project_type": "R&D",
                "leader": "admin",
                "start_date": "2024-01-01T00:00:00Z",
                "budget": 200000.00
            }))
            .send()
            .await
            .expect("Create test project failed");

        let project_data = create_project_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_id = project_data["data"]["id"].as_str().unwrap();

        let create_contract_response = client
            .post(format!("{}/api/v1/contracts", erp_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "contract_no": "CT-PAYMENT-001",
                "project_id": project_id,
                "contract_type": "SALES",
                "counterparty": "Test Customer",
                "contract_amount": 200000.00,
                "tax_amount": 26000.00,
                "total_amount": 226000.00,
                "sign_date": "2024-01-15T00:00:00Z",
                "effective_date": "2024-02-01T00:00:00Z",
                "expire_date": "2024-12-31T23:59:59Z"
            }))
            .send()
            .await
            .expect("Create test contract failed");

        let contract_data = create_contract_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let contract_id = contract_data["id"].as_str().unwrap();

        println!("1. Testing create payment schedule...");
        let create_response = client
            .post(format!("{}/api/v1/payment-schedules", erp_base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "contract_id": contract_id,
                "project_id": project_id,
                "payment_type": "RECEIVABLE",
                "due_date": "2024-02-15T00:00:00Z",
                "amount": 60000.00,
                "description": "30% upfront payment",
                "payment_number": 1
            }))
            .send()
            .await
            .expect("Create payment schedule failed");

        assert_eq!(create_response.status(), 200);

        let schedule_data = create_response.json::<serde_json::Value>().await.unwrap();
        let schedule_id = schedule_data["id"].as_str().unwrap();
        println!("   Created payment schedule with ID: {}", schedule_id);

        println!("\n2. Testing update payment schedule...");
        let update_response = client
            .put(format!(
                "{}/api/v1/payment-schedules/{}",
                erp_base_url, schedule_id
            ))
            .bearer_auth(token.clone())
            .json(&json!({
                "status": "PAID",
                "actual_payment_date": "2024-02-10T12:00:00Z",
                "actual_amount": 60000.00
            }))
            .send()
            .await
            .expect("Update payment schedule failed");

        assert_eq!(update_response.status(), 200);

        println!("\n3. Testing delete payment schedule...");
        let delete_response = client
            .delete(format!(
                "{}/api/v1/payment-schedules/{}",
                erp_base_url, schedule_id
            ))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete payment schedule failed");

        assert_eq!(delete_response.status(), 204);

        client
            .delete(format!("{}/api/v1/contracts/{}", erp_base_url, contract_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Cleanup contract failed");

        client
            .delete(format!("{}/api/v1/projects/{}", rs_base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Payment Schedule CRUD tests passed!");
    }

    #[tokio::test]
    #[ignore = "集成测试需要运行 iam:8000, rs:8020, erp:8010 服务"]
    async fn test_contract_integration() {
        test_project_contract_crud().await;
        test_project_budget_crud().await;
        test_payment_schedule_crud().await;
    }
}
