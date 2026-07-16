#![allow(dead_code)]

pub mod factory;
pub mod kingdee_adapter;
pub mod models;
pub mod sap_adapter;
pub mod traits;
pub mod yonyou_adapter;

pub use factory::ErpAdapterFactory;
pub use kingdee_adapter::KingdeeApiClient;
pub use models::*;
pub use sap_adapter::SapApiClient;
pub use traits::*;
pub use yonyou_adapter::YonyouApiClient;
