use reqwest::Client;
use serde::Deserialize;
use serde::Serialize;
use std::env;

#[derive(Debug, Serialize)]
struct CreateNotificationRequest {
    user_id: String,
    notification_type: String,
    title: String,
    content: String,
    priority: i16,
}

#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: String,
}

#[derive(Debug, Deserialize)]
struct Notification {
    id: String,
    title: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let base_url = env::var("NOTIFICATION_SERVICE_URL").unwrap_or("http://localhost:8003".to_string());
    let client = Client::new();

    println!("Creating test notifications...");

    let test_notifications = vec![
        (
            "system",
            "系统维护通知",
            "系统将于今晚 23:00-01:00 进行例行维护，请提前保存工作内容。",
            2,
        ),
        (
            "workflow",
            "您有新的待审批任务",
            "采购申请 #PR-2024-001 已提交，请及时审批。",
            2,
        ),
        (
            "reminder",
            "任务截止提醒",
            "您的任务 \"完成Q4报告\" 将在明天到期，请尽快完成。",
            2,
        ),
        (
            "alert",
            "质量告警",
            "设备 #REACTOR-002 温度异常，请立即检查！",
            1,
        ),
        (
            "message",
            "新消息",
            "张三给您发送了一条私信。",
            3,
        ),
    ];

    for (notification_type, title, content, priority) in test_notifications {
        let request = CreateNotificationRequest {
            user_id: "user_001".to_string(),
            notification_type: notification_type.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            priority,
        };

        let response = client
            .post(format!("{}/api/v1/notifications", base_url))
            .json(&request)
            .send()
            .await?;

        let result: ApiResponse<Notification> = response.json().await?;

        if result.success {
            println!("✅ Created: {}", title);
        } else {
            println!("❌ Failed: {}", result.message);
        }
    }

    println!("\nDone! All test notifications created successfully.");
    Ok(())
}
