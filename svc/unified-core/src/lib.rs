pub mod embedded;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod modules;
pub mod permission;
pub mod routes;
pub mod shared;

pub use modules::openapi::IamApiDoc as ApiDoc;
pub use shared::{AppState, CoreResponse};
