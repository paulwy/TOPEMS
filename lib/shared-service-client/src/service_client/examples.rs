//! 统一服务间通信模式使用示例
//!
//! 展示旧方式（具体 Client）与新方式（泛型 + trait）的对比。
//! 本模块中的代码仅用于展示模式，不会被实际调用。
//!
//! # 新模式核心思路
//!
//! 1. 用 `define_service_api!` 宏声明服务元数据（一行代码）。
//! 2. 在 `TypedServiceClient<SpecificApi>` 上实现业务方法。
//! 3. 创建客户端时优先 Consul 服务发现，回退环境变量，再回退默认端口。
//!
//! 对比旧模式：每个服务需要手写一个完整的 Client struct + impl，
//! 新模式只需一行宏 + 业务方法，消除了 O(N²) 样板代码。

#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use crate::service_client::api::{
    crm_api::CrmApi, erp_api::ErpApi, file_api::FileApi, finance_api::FinanceApi, hrm_api::HrmApi,
    iam_api::IamApi, mes_api::MesApi, monitor_api::MonitorApi, notification_api::NotificationApi,
    wms_api::WmsApi, workflow_api::WorkflowApi,
};
use crate::service_client::trait_api::{ServiceApi, TypedServiceClient};
use crate::service_client::{
    ErpServiceClient, HrmServiceClient, IamServiceClient, NotificationSvcClient,
    WorkflowServiceClient,
};
use uuid::Uuid;

/// 旧方式 vs 新方式对比示例
pub mod comparison {
    use super::*;

    /// 旧方式：每个服务需要手写一个 Client struct
    pub async fn old_way() -> Result<(), Box<dyn std::error::Error>> {
        let erp_client = crate::service_client::create_erp_client()?;
        let hrm_client = crate::service_client::create_hrm_client()?;
        let iam_client = crate::service_client::create_iam_client()?;

        // 调用方式
        let _assets = erp_client.list_assets(1, 20).await?;
        let _employees = hrm_client.list_employees().await?;
        let _users = iam_client.list_users().await?;

        Ok(())
    }

    /// 新方式：泛型 + trait，一行宏声明服务元数据
    pub async fn new_way() -> Result<(), Box<dyn std::error::Error>> {
        // 创建客户端 — 自动服务发现
        let erp_client = TypedServiceClient::<ErpApi>::discover_default().await?;
        let hrm_client = TypedServiceClient::<HrmApi>::discover_default().await?;
        let iam_client = TypedServiceClient::<IamApi>::discover_default().await?;

        // 调用方式与旧方式一致
        let _assets = erp_client.list_assets(1, 20).await?;
        let _employees = hrm_client.list_employees().await?;
        let _users = iam_client.list_users().await?;

        Ok(())
    }
}

/// 创建方式示例
pub mod creation_patterns {
    use super::*;

    /// 方式 1：服务发现（推荐）
    pub async fn via_discovery() -> Result<(), Box<dyn std::error::Error>> {
        // 解析顺序：环境变量 → Consul → 回退端口
        let client = TypedServiceClient::<ErpApi>::discover_default().await?;
        let _ = client.list_assets(1, 20).await?;
        Ok(())
    }

    /// 方式 2：从环境变量创建
    pub fn via_env() -> Result<(), Box<dyn std::error::Error>> {
        let client = TypedServiceClient::<ErpApi>::from_env_default()?;
        Ok(())
    }

    /// 方式 3：直接指定 URL
    pub fn via_direct_url() -> Result<(), Box<dyn std::error::Error>> {
        let client = TypedServiceClient::new(ErpApi, "http://10.0.0.1:8010")?;
        Ok(())
    }

    /// 方式 4：带 auth token
    pub fn with_auth() -> Result<(), Box<dyn std::error::Error>> {
        let client = TypedServiceClient::<ErpApi>::from_env_default()?
            .with_auth_token("Bearer ey-jwt-token");
        Ok(())
    }
}

/// 跨服务调用示例
pub mod cross_service {
    use super::*;

    /// 在一个方法中调用多个服务
    pub async fn fetch_dashboard_data() -> Result<(), Box<dyn std::error::Error>> {
        let hrm = TypedServiceClient::<HrmApi>::discover_default().await?;
        let finance = TypedServiceClient::<FinanceApi>::discover_default().await?;
        let workflow = TypedServiceClient::<WorkflowApi>::discover_default().await?;

        // 并行获取各服务数据
        let (employees, accounts, pending_tasks) = tokio::try_join!(
            hrm.list_employees(),
            finance.list_accounts(),
            workflow.get_my_pending_tasks(1, 10),
        )?;

        tracing::info!("员工数: {}", employees.len());
        tracing::info!("科目数: {}", accounts.len());
        Ok(())
    }
}

/// 自定义新服务示例
pub mod custom_service {
    use super::*;

    // 使用宏一行声明服务元数据
    crate::define_service_api!(
        InventoryApi,
        "topems-inventory",
        8090,
        Some("INVENTORY_SERVICE_URL"),
        "/api/inventory"
    );

    impl TypedServiceClient<InventoryApi> {
        pub async fn list_items(
            &self,
            page: i32,
            page_size: i32,
        ) -> crate::service_client::error::ServiceClientResult<Vec<serde_json::Value>> {
            let path = format!("/items?page={}&page_size={}", page, page_size);
            self.get(&self.build_path(&path)).await
        }

        pub async fn get_stock(
            &self,
            item_id: &str,
        ) -> crate::service_client::error::ServiceClientResult<serde_json::Value> {
            let path = format!("/items/{}/stock", item_id);
            self.get(&self.build_path(&path)).await
        }
    }

    /// 使用自定义服务
    pub async fn use_custom_service() -> Result<(), Box<dyn std::error::Error>> {
        let client = TypedServiceClient::<InventoryApi>::discover_default().await?;
        let _items = client.list_items(1, 20).await?;
        Ok(())
    }
}
