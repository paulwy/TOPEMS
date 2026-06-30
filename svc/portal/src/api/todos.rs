use axum::{
    extract::{Json, Path},
    Json as AxumJson,
};
use topems_shared::ApiResponse;

use crate::{
    models::{NewTodo, Todo},
    services::todo::TodoService,
};

pub async fn get_todos() -> AxumJson<ApiResponse<Vec<Todo>>> {
    let service = TodoService::new();
    let todos = service.get_todos();
    AxumJson(ApiResponse::success(todos, "待办事项获取成功"))
}

pub async fn add_todo(Json(todo): Json<NewTodo>) -> AxumJson<ApiResponse<Todo>> {
    let service = TodoService::new();
    let new_todo = service.add_todo(todo);
    AxumJson(ApiResponse::success(new_todo, "待办事项添加成功"))
}

pub async fn complete_todo(Path(id): Path<String>) -> AxumJson<ApiResponse<serde_json::Value>> {
    let service = TodoService::new();
    let result = service.complete_todo(id);
    AxumJson(ApiResponse::success(result, "待办事项完成成功"))
}

pub async fn delete_todo(Path(id): Path<String>) -> AxumJson<ApiResponse<serde_json::Value>> {
    let service = TodoService::new();
    let result = service.delete_todo(id);
    AxumJson(ApiResponse::success(result, "待办事项删除成功"))
}
