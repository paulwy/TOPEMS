#[cfg(test)]
mod tests {
    use serde_json::json;

    async fn test_project_phase_crud() {
        let base_url = "http://localhost:8058";
        let client = reqwest::Client::new();

        println!("Testing Project Phase CRUD...");

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
            .post(format!("{}/api/v1/projects", base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Phase Test Project",
                "code": "PHASE-TEST-001",
                "description": "Project for phase testing",
                "project_type": "R_D",
                "leader": "admin",
                "start_date": "2024-01-01T00:00:00Z",
                "budget": 100000.00
            }))
            .send()
            .await
            .expect("Create test project failed");

        let project_data = create_project_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_id = project_data["data"]["id"].as_str().unwrap();

        println!("1. Testing create phase...");
        let create_response = client
            .post(format!(
                "{}/api/v1/projects/{}/phases",
                base_url, project_id
            ))
            .bearer_auth(token.clone())
            .json(&json!({
                "project_id": project_id,
                "phase_number": 1,
                "name": "Requirements Phase",
                "description": "Gather requirements",
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-02-15T23:59:59Z"
            }))
            .send()
            .await
            .expect("Create phase failed");

        assert_eq!(create_response.status(), 200);

        let phase_data = create_response.json::<serde_json::Value>().await.unwrap();
        let phase_id = phase_data["data"]["id"].as_str().unwrap();
        println!("   Created phase with ID: {}", phase_id);

        println!("\n2. Testing get project phases...");
        let list_response = client
            .get(format!(
                "{}/api/v1/projects/{}/phases",
                base_url, project_id
            ))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("List phases failed");

        assert_eq!(list_response.status(), 200);

        println!("\n3. Testing update phase...");
        let update_response = client
            .put(format!("{}/api/v1/phases/{}", base_url, phase_id))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Requirements Gathering Phase",
                "status": "IN_PROGRESS",
                "progress": 50
            }))
            .send()
            .await
            .expect("Update phase failed");

        assert_eq!(update_response.status(), 200);

        println!("\n4. Testing delete phase...");
        let delete_response = client
            .delete(format!("{}/api/v1/phases/{}", base_url, phase_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete phase failed");

        assert_eq!(delete_response.status(), 200);

        client
            .delete(format!("{}/api/v1/projects/{}", base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Project Phase CRUD tests passed!");
    }

    #[allow(dead_code)]
    async fn test_project_milestone_crud() {
        let base_url = "http://localhost:8058";
        let client = reqwest::Client::new();

        println!("\nTesting Project Milestone CRUD...");

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
            .post(format!("{}/api/v1/projects", base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Milestone Test Project",
                "code": "MILESTONE-TEST-001",
                "description": "Project for milestone testing",
                "project_type": "R_D",
                "leader": "admin",
                "start_date": "2024-01-01T00:00:00Z",
                "budget": 100000.00
            }))
            .send()
            .await
            .expect("Create test project failed");

        let project_data = create_project_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_id = project_data["data"]["id"].as_str().unwrap();

        println!("1. Testing create milestone...");
        let create_response = client
            .post(format!(
                "{}/api/v1/projects/{}/milestones",
                base_url, project_id
            ))
            .bearer_auth(token.clone())
            .json(&json!({
                "project_id": project_id,
                "name": "Requirements Complete",
                "description": "All requirements gathered",
                "target_date": "2024-02-15T23:59:59Z"
            }))
            .send()
            .await
            .expect("Create milestone failed");

        assert_eq!(create_response.status(), 200);

        let milestone_data = create_response.json::<serde_json::Value>().await.unwrap();
        let milestone_id = milestone_data["data"]["id"].as_str().unwrap();
        println!("   Created milestone with ID: {}", milestone_id);

        println!("\n2. Testing get project milestones...");
        let list_response = client
            .get(format!(
                "{}/api/v1/projects/{}/milestones",
                base_url, project_id
            ))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("List milestones failed");

        assert_eq!(list_response.status(), 200);

        println!("\n3. Testing update milestone...");
        let update_response = client
            .put(format!("{}/api/v1/milestones/{}", base_url, milestone_id))
            .bearer_auth(token.clone())
            .json(&json!({
                "status": "ACHIEVED",
                "actual_date": "2024-02-10T12:00:00Z"
            }))
            .send()
            .await
            .expect("Update milestone failed");

        assert_eq!(update_response.status(), 200);

        println!("\n4. Testing delete milestone...");
        let delete_response = client
            .delete(format!("{}/api/v1/milestones/{}", base_url, milestone_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete milestone failed");

        assert_eq!(delete_response.status(), 200);

        client
            .delete(format!("{}/api/v1/projects/{}", base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Project Milestone CRUD tests passed!");
    }

    #[allow(dead_code)]
    async fn test_project_member_crud() {
        let base_url = "http://localhost:8058";
        let client = reqwest::Client::new();

        println!("\nTesting Project Member CRUD...");

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
            .post(format!("{}/api/v1/projects", base_url))
            .bearer_auth(token.clone())
            .json(&json!({
                "name": "Member Test Project",
                "code": "MEMBER-TEST-001",
                "description": "Project for member testing",
                "project_type": "R_D",
                "leader": "admin",
                "start_date": "2024-01-01T00:00:00Z",
                "budget": 100000.00
            }))
            .send()
            .await
            .expect("Create test project failed");

        let project_data = create_project_response
            .json::<serde_json::Value>()
            .await
            .unwrap();
        let project_id = project_data["data"]["id"].as_str().unwrap();

        println!("1. Testing create member...");
        let create_response = client
            .post(format!(
                "{}/api/v1/projects/{}/members",
                base_url, project_id
            ))
            .bearer_auth(token.clone())
            .json(&json!({
                "project_id": project_id,
                "employee_id": "550e8400-e29b-41d4-a716-446655440000",
                "role": "DEVELOPER",
                "responsibility": "Develop core features",
                "allocation": 0.8,
                "join_date": "2024-01-01T00:00:00Z"
            }))
            .send()
            .await
            .expect("Create member failed");

        assert_eq!(create_response.status(), 200);

        let member_data = create_response.json::<serde_json::Value>().await.unwrap();
        let member_id = member_data["data"]["id"].as_str().unwrap();
        println!("   Created member with ID: {}", member_id);

        println!("\n2. Testing get project members...");
        let list_response = client
            .get(format!(
                "{}/api/v1/projects/{}/members",
                base_url, project_id
            ))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("List members failed");

        assert_eq!(list_response.status(), 200);

        println!("\n3. Testing update member...");
        let update_response = client
            .put(format!("{}/api/v1/project-members/{}", base_url, member_id))
            .bearer_auth(token.clone())
            .json(&json!({
                "role": "TECH_LEAD",
                "allocation": 1.0
            }))
            .send()
            .await
            .expect("Update member failed");

        assert_eq!(update_response.status(), 200);

        println!("\n4. Testing delete member...");
        let delete_response = client
            .delete(format!("{}/api/v1/project-members/{}", base_url, member_id))
            .bearer_auth(token.clone())
            .send()
            .await
            .expect("Delete member failed");

        assert_eq!(delete_response.status(), 200);

        client
            .delete(format!("{}/api/v1/projects/{}", base_url, project_id))
            .bearer_auth(token)
            .send()
            .await
            .expect("Cleanup project failed");

        println!("\n✅ Project Member CRUD tests passed!");
    }

    #[tokio::test]
    #[ignore]
    #[ignore = "集成测试需要运行 rs:8020 和 iam:8000 服务"]
    async fn test_project_relations_integration() {
        test_project_phase_crud().await;
        // 里程碑和成员 API 尚未实现，暂时跳过
        // test_project_milestone_crud().await;
        // test_project_member_crud().await;
        println!("\n✅ All implemented tests passed!");
    }
}
