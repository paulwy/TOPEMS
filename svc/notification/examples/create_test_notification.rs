use std::env;
use topems_shared::notification::{
    NotificationServiceClient,
    CreateNotificationRequest,
    NotificationType,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    
    let base_url = env::var("NOTIFICATION_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8003".to_string());
    let client = NotificationServiceClient::with_base_url(base_url);
    
    let request = CreateNotificationRequest {
        user_id: "test-user-id".to_string(),
        notification_type: NotificationType::Info,
        title: "Test Notification".to_string(),
        content: "This is a test notification".to_string(),
        data: None,
        priority: Some(1),
    };
    
    let result = client.create_notification(request).await;
    match result {
        Ok(_) => println!("Notification created successfully"),
        Err(e) => eprintln!("Failed to create notification: {}", e),
    }
    
    Ok(())
}
