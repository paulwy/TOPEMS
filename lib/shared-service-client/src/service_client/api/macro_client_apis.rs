//! 从宏模式客户端（`define_service_client!`）迁移而来的 17 个服务 API 元数据定义
//!
//! 这些 Api 仅包含 `ServiceApi` trait 元数据（服务名 / 端口 / 环境变量 / API 前缀），
//! 不含业务方法——因为原宏客户端的业务方法在 production 代码中无引用，
//! 可按需在 `TypedServiceClient<XxxApi>` 上扩展。
//!
//! 迁移前：17 个 `*_client.rs` 文件通过 `define_service_client!` 宏生成完整 struct
//! 迁移后：1 个文件通过 `define_service_api!` 宏生成 unit struct + `ServiceApi` impl

use crate::define_service_api;

// === 独立服务（service_name = "topems-{svc}"）===

define_service_api!(AiApi, "topems-ai", 8013, Some("AI_SERVICE_URL"), "/api/ai");
define_service_api!(BiApi, "topems-bi", 8060, Some("BI_SERVICE_URL"), "/api/bi");
define_service_api!(
    CommunicationApi,
    "topems-communication",
    8084,
    Some("COMMUNICATION_SERVICE_URL"),
    "/api/communication"
);
define_service_api!(
    EhsApi,
    "topems-ehs",
    8052,
    Some("EHS_SERVICE_URL"),
    "/api/ehs"
);
define_service_api!(
    GisApi,
    "topems-gis",
    8071,
    Some("GIS_SERVICE_URL"),
    "/api/gis"
);
define_service_api!(
    IntegrationApi,
    "topems-integration",
    8072,
    Some("INTEGRATION_SERVICE_URL"),
    "/api/integration"
);
define_service_api!(
    LimsApi,
    "topems-lims",
    8051,
    Some("LIMS_SERVICE_URL"),
    "/api/lims"
);
define_service_api!(
    LowcodeApi,
    "topems-lowcode",
    8088,
    Some("LOWCODE_SERVICE_URL"),
    "/api/lowcode"
);
define_service_api!(
    MasterDataApi,
    "topems-master-data",
    8090,
    Some("MASTER_DATA_SERVICE_URL"),
    "/api/master-data"
);
define_service_api!(
    MobileApi,
    "topems-mobile",
    8070,
    Some("MOBILE_SERVICE_URL"),
    "/api/mobile"
);
define_service_api!(
    PdmApi,
    "topems-pdm",
    8031,
    Some("PDM_SERVICE_URL"),
    "/api/pdm"
);
define_service_api!(PmApi, "topems-pm", 8023, Some("PM_SERVICE_URL"), "/api/pm");
define_service_api!(
    PortalApi,
    "topems-portal",
    8063,
    Some("PORTAL_SERVICE_URL"),
    "/api/portal"
);
define_service_api!(RdApi, "topems-rd", 8053, Some("RD_SERVICE_URL"), "/api/rd");
define_service_api!(
    ScmApi,
    "topems-scm",
    8040,
    Some("SCM_SERVICE_URL"),
    "/api/scm"
);
define_service_api!(
    SrmApi,
    "topems-srm",
    8042,
    Some("SRM_SERVICE_URL"),
    "/api/srm"
);

// === 统一核心模块（service_name = "unified-core"）===

define_service_api!(
    DocApi,
    "unified-core",
    8000,
    Some("DOC_SERVICE_URL"),
    "/api/core/doc"
);
