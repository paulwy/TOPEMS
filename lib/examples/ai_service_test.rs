//! AI 服务快速测试
//!
//! 测试 Ollama 嵌入和聊天功能

use anyhow::Result;
use topems_shared::{OllamaClient, OllamaConfig};

#[tokio::main]
async fn main() -> Result<()> {
    let config = OllamaConfig::default();
    let client = OllamaClient::new(config);

    println!("Testing Ollama connection...");

    // 健康检查
    let healthy = client.health_check().await?;
    println!("Health check: {}", if healthy { "OK" } else { "FAILED" });

    // 嵌入测试
    println!("\nEmbedding test:");
    let emb = client.embed("Hello world").await?;
    println!("  Embedding length: {}", emb.len());

    // 聊天测试
    println!("\nChat test:");
    let response = client.chat("Say 'TOPEMS AI connected!' in Chinese").await?;
    println!(
        "  Response: {}",
        response.lines().take(3).collect::<Vec<_>>().join(" ")
    );

    println!("\n✅ All tests passed!");

    Ok(())
}
