use super::generic::ApiResponse;

crate::define_service_client!(
    TicketServiceClient,
    "TICKET_SERVICE_URL",
    "http://localhost:8086",
    {
        list_tickets(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ticket/tickets?page={}&pagesize={}"
        }
        get_ticket(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/ticket/tickets/{}"
        }
        create_ticket() -> ApiResponse<serde_json::Value> {
            post => "/api/ticket/tickets"; body: ticket: &serde_json::Value
        }
        update_ticket(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/ticket/tickets/{}"; body: data: &serde_json::Value
        }
        close_ticket(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/ticket/tickets/{}/close"; body: body: &()
        }
        add_comment(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/ticket/tickets/{}/comments"; body: comment: &serde_json::Value
        }
        list_categories(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ticket/categories?page={}&pagesize={}"
        }
    }
);
