// Mobile 服务权限定义
use topems_shared::permission::ModulePermission;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MobilePermission {
    // 巡检操作
    PatrolRead,
    PatrolWrite,
    PatrolDelete,
    // 扫码操作
    ScanRead,
    ScanWrite,
    ScanDelete,
    // 任务操作
    TaskRead,
    TaskWrite,
    TaskDelete,
    TaskAssign,
    // 设备操作
    DeviceRegister,
    DeviceManage,
    // 离线数据
    OfflineSync,
    // 统计
    StatsView,
    // 管理权限
    Manage,
}

impl std::fmt::Display for MobilePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MobilePermission::PatrolRead => write!(f, "mobile.patrol_read"),
            MobilePermission::PatrolWrite => write!(f, "mobile.patrol_write"),
            MobilePermission::PatrolDelete => write!(f, "mobile.patrol_delete"),
            MobilePermission::ScanRead => write!(f, "mobile.scan_read"),
            MobilePermission::ScanWrite => write!(f, "mobile.scan_write"),
            MobilePermission::ScanDelete => write!(f, "mobile.scan_delete"),
            MobilePermission::TaskRead => write!(f, "mobile.task_read"),
            MobilePermission::TaskWrite => write!(f, "mobile.task_write"),
            MobilePermission::TaskDelete => write!(f, "mobile.task_delete"),
            MobilePermission::TaskAssign => write!(f, "mobile.task_assign"),
            MobilePermission::DeviceRegister => write!(f, "mobile.device_register"),
            MobilePermission::DeviceManage => write!(f, "mobile.device_manage"),
            MobilePermission::OfflineSync => write!(f, "mobile.offline_sync"),
            MobilePermission::StatsView => write!(f, "mobile.stats_view"),
            MobilePermission::Manage => write!(f, "mobile.manage"),
        }
    }
}

impl ModulePermission for MobilePermission {
    fn module_name() -> &'static str {
        "mobile"
    }

    fn all_permission() -> Self {
        MobilePermission::Manage
    }
}

/// 检查 Mobile 权限
pub fn check_mobile_permission(claims: &topems_shared::auth::Claims, permission: &MobilePermission) -> Result<(), String> {
    if claims.is_superuser {
        return Ok(());
    }

    let module_manage = format!("{}.manage", MobilePermission::module_name());
    if claims.has_permission(&module_manage) {
        return Ok(());
    }

    let perm_str = permission.to_string();
    if claims.has_permission(&perm_str) {
        Ok(())
    } else {
        Err(format!("权限不足：需要 {} 权限", perm_str))
    }
}
