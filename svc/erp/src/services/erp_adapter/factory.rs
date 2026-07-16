#![allow(dead_code)]

use super::kingdee_adapter::KingdeeApiClient;
use super::models::{ErpConnectionConfig, ErpSystemType};
use super::sap_adapter::SapApiClient;
use super::traits::ErpAdapter;
use super::yonyou_adapter::YonyouApiClient;

pub struct ErpAdapterFactory;

impl ErpAdapterFactory {
    pub fn create_adapter(
        system_type: ErpSystemType,
        config: ErpConnectionConfig,
    ) -> Box<dyn ErpAdapter> {
        match system_type {
            ErpSystemType::Kingdee | ErpSystemType::KingdeeCloud => {
                Box::new(KingdeeApiClient::new(config))
            }
            ErpSystemType::Yonyou | ErpSystemType::Ufida => Box::new(YonyouApiClient::new(config)),
            ErpSystemType::Sap => Box::new(SapApiClient::new(config)),
            ErpSystemType::Custom => Box::new(KingdeeApiClient::new(config)),
        }
    }
}
