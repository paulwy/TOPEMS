//! 架构改进综合使用示例
//! 
//! 这个示例展示了如何使用：
//! 1. 统一错误处理 (TopemsError)
//! 2. 服务调用客户端 (Service Client)
//! 3. 事件驱动架构 (Event Driven)
//! 4. 服务发现 (Service Discovery)

use topems_shared::*;
use topems_shared::service_client::*;
use topems_shared::event::*;

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== TOPEMS 架构改进示例 ===\n");
    
    // 1. 服务发现示例
    println!("1. 服务发现示例");
    let registry = config::ServiceRegistry::new();
    
    if let Some(hrm_config) = registry.get_service("topems-hrm") {
        println!("   HRM 服务配置:");
        println!("   - 名称: {}", hrm_config.name);
        println!("   - 显示名: {}", hrm_config.display_name);
        println!("   - 端口: {}", hrm_config.port);
        println!("   - 健康检查: {}", hrm_config.health_endpoint);
    }
    
    let hrm_url = registry.get_service_url("topems-hrm");
    println!("   HRM 服务 URL: {}\n", hrm_url);
    
    // 2. 创建 HRM 服务客户端
    println!("2. 服务客户端示例");
    let hrm_client = create_hrm_client(&hrm_url)?;
    println!("   HRM 客户端创建成功\n");
    
    // 3. 事件发布示例
    println!("3. 事件发布示例");
    let publisher = EventPublisher::new()?;
    
    // 发布 HRM 员工创建事件
    publisher.publish_hrm_employee_created(
        uuid::Uuid::new_v4(),
        "张三",
        "zhangsan@example.com",
        Some(uuid::Uuid::new_v4()),
    ).await?;
    println!("   员工创建事件已发布\n");
    
    println!("=== 示例完成 ===");
    Ok(())
}
