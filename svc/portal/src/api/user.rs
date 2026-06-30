use axum::Json;
use topems_shared::ApiResponse;

use crate::{models::UserInfo, services::user::UserService};

pub async fn get_user_info() -> Json<ApiResponse<UserInfo>> {
    let service = UserService::new();
    let user_info = service.get_user_info();
    Json(ApiResponse::success(user_info, "用户信息获取成功"))
}
