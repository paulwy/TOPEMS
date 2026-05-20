use axum::{Router, routing::get};

#[tokio::main]
async fn main() {
    println!("Starting TOPEMS-AI service on port 8003...");
    
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/ai/chat", get(chat))
        .route("/api/v1/ai/search", get(search));
    
    let addr = "0.0.0.0:8003".parse().unwrap();
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app).await.unwrap();
}

async fn health_check() -> &'static str {
    "TOPEMS-AI is running!"
}

async fn chat() -> &'static str {
    "AI Chat endpoint"
}

async fn search() -> &'static str {
    "AI Search endpoint"
}
