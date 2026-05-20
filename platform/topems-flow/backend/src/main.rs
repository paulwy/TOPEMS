use axum::{Router, routing::get};

#[tokio::main]
async fn main() {
    println!("Starting TOPEMS-FLOW service on port 8004...");
    
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/workflows", get(list_workflows))
        .route("/api/v1/approvals", get(list_approvals));
    
    let addr = "0.0.0.0:8004".parse().unwrap();
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app).await.unwrap();
}

async fn health_check() -> &'static str {
    "TOPEMS-FLOW is running!"
}

async fn list_workflows() -> &'static str {
    "List workflows"
}

async fn list_approvals() -> &'static str {
    "List approvals"
}
