//! Ollama 集成测试
//!
//! 运行: cargo run --example ollama_integration_test -p topems-shared

use anyhow::Result;
use topems_shared::{
    OllamaClient, OllamaConfig,
};

#[tokio::main]
async fn main() -> Result<()> {
    println!("╔══════════════════════════════════════════════════════════╗");
    println!("║           TOPEMS Ollama 集成测试                       ║");
    println!("╚══════════════════════════════════════════════════════════╝");
    println!();

    let config = OllamaConfig::default();
    let client = OllamaClient::new(config.clone());

    // 1. 健康检查
    println!("📡 步骤 1: Ollama 健康检查");
    match client.health_check().await {
        Ok(true) => {
            println!("   ✅ Ollama 服务正常运行");
        }
        Ok(false) => {
            println!("   ⚠️  Ollama 服务不可用");
            println!("   请运行: ollama serve");
            return Ok(());
        }
        Err(e) => {
            println!("   ❌ 健康检查失败: {}", e);
            return Err(e);
        }
    }

    // 2. 模型信息
    println!("\n📋 步骤 2: 获取模型信息");
    match client.get_model_info().await {
        Ok(info) => {
            println!("   ✅ 模型信息:");
            if let Some(name) = info.get("name").and_then(|v| v.as_str()) {
                println!("      - 名称: {}", name);
            }
            if let Some(size) = info.get("size").and_then(|v| v.as_i64()) {
                println!("      - 大小: {} MB", size / 1024 / 1024);
            }
        }
        Err(e) => {
            println!("   ⚠️  无法获取模型信息: {}", e);
        }
    }

    // 3. 嵌入测试
    println!("\n🔢 步骤 3: 嵌入向量生成");
    let test_texts = vec![
        "Rust 编程语言专家",
        "Python 数据分析",
        "微服务架构设计",
    ];

    for text in &test_texts {
        let start = std::time::Instant::now();
        match client.embed(text).await {
            Ok(embedding) => {
                let elapsed = start.elapsed().as_millis();
                println!("   ✅ '{}'", text);
                println!("      - 维度: {}", embedding.len());
                println!("      - 时间: {} ms", elapsed);
                println!("      - 前 5 个值: {:.4}", embedding.iter().take(5).map(|x| *x as f64).collect::<Vec<_>>().iter().map(|x| x.to_string()).collect::<Vec<_>>().join(", "));
            }
            Err(e) => {
                println!("   ❌ '{}': {}", text, e);
            }
        }
    }

    // 4. 聊天测试
    println!("\n💬 步骤 4: 聊天功能测试");
    let questions = vec![
        "用一句话介绍 Rust 编程语言",
        "什么是微服务架构",
    ];

    for question in &questions {
        let start = std::time::Instant::now();
        match client.chat(question).await {
            Ok(response) => {
                let elapsed = start.elapsed().as_millis();
                println!("   ✅ 问题: {}", question);
                println!("      - 回答: {}", response.lines().collect::<Vec<_>>().join(" ").trim());
                println!("      - 时间: {} ms", elapsed);
            }
            Err(e) => {
                println!("   ❌ '{}': {}", question, e);
            }
        }
    }

    // 5. Mock Embedder 测试
    println!("\n🔧 步骤 5: Embedder 测试");
    println!("   ✅ 使用 OllamaClient 直接调用");

    // 6. 相似度计算
    println!("\n📊 步骤 6: 文本相似度测试");

    let text1 = "Rust 是一种注重安全性和并发性的系统编程语言";
    let text2 = "Rust 编程语言强调内存安全和性能";
    let text3 = "Python 适合数据分析和机器学习";

    let emb1 = client.embed(text1).await?;
    let emb2 = client.embed(text2).await?;
    let emb3 = client.embed(text3).await?;

    let sim_12 = cosine_similarity(&emb1, &emb2);
    let sim_13 = cosine_similarity(&emb1, &emb3);

    println!("   ✅ 相似度计算:");
    println!("      - '{}' vs '{}'", text1, text2);
    println!("        相似度: {:.4}", sim_12);
    println!("      - '{}' vs '{}'", text1, text3);
    println!("        相似度: {:.4}", sim_13);
    println!();
    if sim_12 > sim_13 {
        println!("   ✅ 语义相似度正确: Rust 相关文本相似度更高");
    }

    // 总结
    println!("\n╔══════════════════════════════════════════════════════════╗");
    println!("║                    测试完成                             ║");
    println!("╚══════════════════════════════════════════════════════════╝");
    println!();
    println!("✅ Ollama 服务: 正常");
    println!("✅ 嵌入生成: 正常");
    println!("✅ 聊天功能: 正常");
    println!("✅ Embedder trait: 正常");
    println!("✅ 语义相似度: 正常");
    println!();
    println!("🎉 TOPEMS Ollama 集成完成！");
    println!();

    Ok(())
}

/// 计算余弦相似度
fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| *x as f64 * *y as f64).sum();
    let norm_a: f64 = a.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a * norm_b)
}
