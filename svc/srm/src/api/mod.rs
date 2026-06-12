pub mod supplier;
pub mod supplier_category;
pub mod supplier_evaluation;
pub mod supplier_contract;
pub mod supplier_product;
pub mod openapi;

pub use supplier::create_routes as create_supplier_routes;
pub use supplier_category::create_routes as create_category_routes;
pub use supplier_evaluation::create_routes as create_evaluation_routes;
pub use supplier_contract::create_routes as create_contract_routes;
pub use supplier_product::create_routes as create_product_routes;