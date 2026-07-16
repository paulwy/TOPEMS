#![allow(dead_code)]

pub mod models;
pub mod traits;
pub mod kingdee_adapter;
pub mod yonyou_adapter;
pub mod sap_adapter;
pub mod factory;

pub use models::*;
pub use traits::*;
pub use kingdee_adapter::KingdeeApiClient;
pub use yonyou_adapter::YonyouApiClient;
pub use sap_adapter::SapApiClient;
pub use factory::ErpAdapterFactory;
