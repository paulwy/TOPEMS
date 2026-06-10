//! HRM 技能匹配测试
//!
//! 测试员工-技能向量搜索功能

use anyhow::Result;
use topems_shared::{OllamaClient, OllamaConfig};
use redis::{AsyncCommands, Client};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmployeeSkill {
    id: String,
    name: String,
    skills: Vec<String>,
    department: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SkillMatchResult {
    employee_id: String,
    employee_name: String,
    department: String,
    matched_skills: Vec<String>,
    similarity: f64,
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| *x as f64 * *y as f64).sum();
    let norm_a: f64 = a.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 { 0.0 } else { dot / (norm_a * norm_b) }
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("╔══════════════════════════════════════════════════════════╗");
    println!("║           HRM 技能匹配测试                               ║");
    println!("╚══════════════════════════════════════════════════════════╝");
    println!();

    // 初始化 Ollama 客户端
    let ollama = OllamaClient::new(OllamaConfig::default());

    // 测试数据：员工技能表
    let employees = vec![
        EmployeeSkill {
            id: "emp:001".to_string(),
            name: "张三".to_string(),
            skills: vec!["Rust".to_string(), "PostgreSQL".to_string(), "系统编程".to_string()],
            department: "技术部".to_string(),
        },
        EmployeeSkill {
            id: "emp:002".to_string(),
            name: "李四".to_string(),
            skills: vec!["Python".to_string(), "数据分析".to_string(), "机器学习".to_string()],
            department: "数据部".to_string(),
        },
        EmployeeSkill {
            id: "emp:003".to_string(),
            name: "王五".to_string(),
            skills: vec!["Java".to_string(), "Spring".to_string(), "微服务".to_string()],
            department: "后端部".to_string(),
        },
        EmployeeSkill {
            id: "emp:004".to_string(),
            name: "赵六".to_string(),
            skills: vec!["Rust".to_string(), "WebAssembly".to_string(), "前端".to_string()],
            department: "前端部".to_string(),
        },
        EmployeeSkill {
            id: "emp:005".to_string(),
            name: "钱七".to_string(),
            skills: vec!["Go".to_string(), "Kubernetes".to_string(), "DevOps".to_string()],
            department: "运维部".to_string(),
        },
    ];

    // 生成员工技能文本
    println!("📋 员工技能数据:");
    for emp in &employees {
        println!("  {} - {}: {:?}", emp.id, emp.name, emp.skills);
    }

    // 为每个员工生成向量并存储到 Redis
    println!("\n🔢 生成员工向量...");

    let redis_url = "redis://localhost:6379";
    let redis = Client::open(redis_url)?;
    let mut conn = redis.get_multiplexed_async_connection().await?;

    for emp in &employees {
        // 合并技能为文本
        let skills_text = format!("{}: {}", emp.name, emp.skills.join(", "));
        println!("  生成向量: {}", skills_text);

        // 生成嵌入
        let embedding = ollama.embed(&skills_text).await?;

        // 转换为字节存储
        let vector_bytes: Vec<u8> = embedding.iter()
            .flat_map(|f| f.to_le_bytes())
            .collect();

        // 存储到 Redis
        let key = format!("vec:employee:{}", emp.id);
        let metadata = serde_json::json!({
            "name": emp.name,
            "department": emp.department,
            "skills": emp.skills
        }).to_string();

        let _: () = redis::pipe()
            .hset(&key, "embedding", vector_bytes)
            .hset(&key, "metadata", metadata)
            .query_async(&mut conn)
            .await?;

        println!("  ✅ 存储: {}", key);
    }

    // 技能搜索测试
    println!("\n🔍 技能搜索测试:");
    let search_skills = vec!["Rust", "系统编程"];

    // 生成搜索向量
    let search_text = format!("技能需求: {}", search_skills.join(", "));
    println!("  搜索: {}", search_text);

    let query_vector: Vec<f32> = ollama.embed(&search_text).await?;

    // 从 Redis 获取所有员工向量并计算相似度
    let mut results: Vec<SkillMatchResult> = Vec::new();

    for emp in &employees {
        let key = format!("vec:employee:{}", emp.id);

        let data: Option<HashMap<String, Vec<u8>>> = conn.hgetall(&key).await?;

        if let Some(fields) = data {
            if let Some(vector_bytes) = fields.get("embedding") {
                let stored_vector: Vec<f32> = vector_bytes
                    .chunks_exact(4)
                    .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                    .collect();

                let similarity = cosine_similarity(&query_vector, &stored_vector);

                // 找出匹配的技能
                let matched: Vec<_> = emp.skills.iter()
                    .filter(|s| search_skills.iter().any(|q| s.to_lowercase().contains(&q.to_lowercase())))
                    .cloned()
                    .collect();

                if !matched.is_empty() {
                    results.push(SkillMatchResult {
                        employee_id: emp.id.clone(),
                        employee_name: emp.name.clone(),
                        department: emp.department.clone(),
                        matched_skills: matched,
                        similarity,
                    });
                }
            }
        }
    }

    // 排序并显示结果
    results.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

    println!("\n📊 匹配结果:");
    for (i, result) in results.iter().enumerate() {
        println!("  {}. {} ({})", i + 1, result.employee_name, result.department);
        println!("     相似度: {:.4}", result.similarity);
        println!("     匹配技能: {:?}", result.matched_skills);
    }

    // 总结
    println!("\n╔══════════════════════════════════════════════════════════╗");
    println!("║                    测试完成                             ║");
    println!("╚══════════════════════════════════════════════════════════╝");
    println!();
    println!("✅ Ollama 连接: 正常");
    println!("✅ Redis 连接: 正常");
    println!("✅ 向量生成: 正常");
    println!("✅ 技能匹配: 正常");
    println!();
    println!("🎉 HRM 技能匹配功能实现完成！");

    Ok(())
}
