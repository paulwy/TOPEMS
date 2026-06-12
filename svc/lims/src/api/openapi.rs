use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::sample::list_samples,
        crate::api::sample::create_sample,
        crate::api::sample::get_sample,
        crate::api::sample::update_sample,
        crate::api::sample::delete_sample,
    ),
    components(
        schemas(
            crate::models::Sample,
            crate::models::CreateSampleRequest,
            crate::models::UpdateSampleRequest,
        )
    ),
    tags(
        (name = "samples", description = "Sample management endpoints"),
        (name = "health", description = "Health check endpoints")
    ),
    info(
        title = "TOPEMS LIMS API",
        version = "1.0.0",
        description = "Laboratory Information Management System API",
        contact(
            name = "TOPEMS Team",
            email = "topems@example.com"
        )
    )
)]
pub struct ApiDoc;
