use topems_shared::response::{api_error, ApiResponse, PaginatedResponse, PaginationParams};

#[test]
fn test_api_response_success() {
    let data = "hello".to_string();
    let response = ApiResponse::success(data.clone(), "操作成功");

    assert_eq!(response.code, 200);
    assert!(response.success);
    assert_eq!(response.data.unwrap(), data);
    assert_eq!(response.message, "操作成功");
    assert!(!response.timestamp.is_empty());
}

#[test]
fn test_api_response_success_no_data() {
    let response = ApiResponse::<()>::success_no_data("操作成功");

    assert_eq!(response.code, 200);
    assert!(response.success);
    assert!(response.data.is_none());
    assert_eq!(response.message, "操作成功");
}

#[test]
fn test_api_response_error() {
    let response = ApiResponse::<()>::error(400, "参数错误");

    assert_eq!(response.code, 400);
    assert!(!response.success);
    assert!(response.data.is_none());
    assert_eq!(response.message, "参数错误");
}

#[test]
fn test_api_error_function() {
    let response: ApiResponse<()> = api_error(500, "内部错误");

    assert_eq!(response.code, 500);
    assert!(!response.success);
    assert!(response.data.is_none());
    assert_eq!(response.message, "内部错误");
}

#[test]
fn test_api_response_serialization() {
    let response = ApiResponse::success(42, "成功");

    let json = serde_json::to_string(&response).unwrap();
    let deserialized: ApiResponse<i32> = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.code, 200);
    assert!(deserialized.success);
    assert_eq!(deserialized.data.unwrap(), 42);
    assert_eq!(deserialized.message, "成功");
}

#[test]
fn test_api_response_error_serialization() {
    let response = ApiResponse::<String>::error(404, "未找到");

    let json = serde_json::to_string(&response).unwrap();
    let deserialized: ApiResponse<String> = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.code, 404);
    assert!(!deserialized.success);
    assert!(deserialized.data.is_none());
    assert_eq!(deserialized.message, "未找到");
}

#[test]
fn test_pagination_params_default_offset() {
    let params = PaginationParams {
        page: None,
        page_size: None,
        search: None,
        status: None,
    };

    assert_eq!(params.offset(), 0);
    assert_eq!(params.limit(), 20);
}

#[test]
fn test_pagination_params_first_page() {
    let params = PaginationParams {
        page: Some(1),
        page_size: Some(10),
        search: None,
        status: None,
    };

    assert_eq!(params.offset(), 0);
    assert_eq!(params.limit(), 10);
}

#[test]
fn test_pagination_params_second_page() {
    let params = PaginationParams {
        page: Some(2),
        page_size: Some(10),
        search: None,
        status: None,
    };

    assert_eq!(params.offset(), 10);
    assert_eq!(params.limit(), 10);
}

#[test]
fn test_pagination_params_page_below_one() {
    let params = PaginationParams {
        page: Some(0),
        page_size: Some(10),
        search: None,
        status: None,
    };

    assert_eq!(params.offset(), 0);
}

#[test]
fn test_pagination_params_page_size_above_max() {
    let params = PaginationParams {
        page: Some(1),
        page_size: Some(200),
        search: None,
        status: None,
    };

    assert_eq!(params.limit(), 100);
}

#[test]
fn test_pagination_params_with_search_and_status() {
    let params = PaginationParams {
        page: Some(1),
        page_size: Some(20),
        search: Some("test".to_string()),
        status: Some("active".to_string()),
    };

    assert_eq!(params.search.as_deref(), Some("test"));
    assert_eq!(params.status.as_deref(), Some("active"));
    assert_eq!(params.offset(), 0);
}

#[test]
fn test_pagination_params_serialization() {
    let params = PaginationParams {
        page: Some(2),
        page_size: Some(50),
        search: Some("query".to_string()),
        status: Some("draft".to_string()),
    };

    let json = serde_json::to_string(&params).unwrap();
    let deserialized: PaginationParams = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.page, Some(2));
    assert_eq!(deserialized.page_size, Some(50));
    assert_eq!(deserialized.search, Some("query".to_string()));
    assert_eq!(deserialized.status, Some("draft".to_string()));
}

#[test]
fn test_paginated_response_new() {
    let items = vec![1, 2, 3, 4, 5];
    let response = PaginatedResponse::new(items, 100, 1, 10);

    assert_eq!(response.items.len(), 5);
    assert_eq!(response.total, 100);
    assert_eq!(response.page, 1);
    assert_eq!(response.page_size, 10);
    assert_eq!(response.total_pages, 10);
}

#[test]
fn test_paginated_response_total_pages_exact() {
    let response = PaginatedResponse::<i32>::new(vec![], 100, 1, 10);
    assert_eq!(response.total_pages, 10);
}

#[test]
fn test_paginated_response_total_pages_partial() {
    let response = PaginatedResponse::<i32>::new(vec![], 105, 1, 10);
    assert_eq!(response.total_pages, 11);
}

#[test]
fn test_paginated_response_page_below_one() {
    let response = PaginatedResponse::<i32>::new(vec![], 100, 0, 10);
    assert_eq!(response.page, 1);
}

#[test]
fn test_paginated_response_page_size_clamp() {
    let response = PaginatedResponse::<i32>::new(vec![], 100, 1, 200);
    assert_eq!(response.page_size, 100);
}

#[test]
fn test_paginated_response_page_size_min() {
    let response = PaginatedResponse::<i32>::new(vec![], 100, 1, 0);
    assert_eq!(response.page_size, 1);
}

#[test]
fn test_paginated_response_empty() {
    let response = PaginatedResponse::<i32>::new(vec![], 0, 1, 10);
    assert_eq!(response.total_pages, 0);
    assert_eq!(response.items.len(), 0);
}

#[test]
fn test_paginated_response_serialization() {
    let items = vec!["a".to_string(), "b".to_string()];
    let response = PaginatedResponse::new(items, 10, 1, 10);

    let json = serde_json::to_string(&response).unwrap();
    let deserialized: PaginatedResponse<String> = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.items.len(), 2);
    assert_eq!(deserialized.total, 10);
    assert_eq!(deserialized.page, 1);
    assert_eq!(deserialized.page_size, 10);
    assert_eq!(deserialized.total_pages, 1);
}
