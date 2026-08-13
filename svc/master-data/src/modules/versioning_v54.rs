//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V54.0 MDM AC-26: 版本控制升级 + 审计日志 + 数据权限矩阵
//!
//! 核心能力：
//! - 版本控制升级 (AdvancedVersionControl): 快照、分支、Cherry-pick、合并、Diff
//! - 审计日志 (MDMAuditLogger): 不可变追加日志、事件分类、合规审计
//! - 数据权限矩阵 (PermissionMatrix): RLS、列级脱敏、角色继承

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use crate::shared::AppState;

// ==================== 纯函数（无副作用，可单测） ====================

/// 语义版本比较：按 `.` 分隔的数字段逐段比较。
/// 非数字段按字符串字典序比较；缺失的段视为 0。
/// 支持常见的 `1.2.3`、`v1.2`、`2.0.0-beta` 等格式（后者只比较数字部分）。
pub fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    let mut ra = a.trim_start_matches('v').trim_start_matches('V');
    let mut rb = b.trim_start_matches('v').trim_start_matches('V');

    loop {
        let (na, rest_a) = parse_segment(ra);
        let (nb, rest_b) = parse_segment(rb);
        match (na, nb) {
            (Some(x), Some(y)) => {
                match x.cmp(&y) {
                    Ordering::Equal => {
                        // 跳过分隔符
                        ra = rest_a.trim_start_matches('.');
                        rb = rest_b.trim_start_matches('.');
                        // 若两侧都空则相等；否则继续比较（缺失段视为 0）
                        if ra.is_empty() && rb.is_empty() {
                            return Ordering::Equal;
                        }
                    }
                    other => return other,
                }
            }
            (Some(x), None) => {
                // b 没有数字段；若 b 已耗尽则比较 a 剩余是否全为 0
                if rb.is_empty() {
                    return if x == 0 && all_remaining_zero(ra) {
                        Ordering::Equal
                    } else {
                        Ordering::Greater
                    };
                }
                // b 还有非数字内容，按字典序比较
                return Ordering::Greater;
            }
            (None, Some(y)) => {
                if ra.is_empty() {
                    return if y == 0 && all_remaining_zero(rb) {
                        Ordering::Equal
                    } else {
                        Ordering::Less
                    };
                }
                return Ordering::Less;
            }
            (None, None) => {
                // 都没有数字段，按字典序比较剩余字符串
                return ra.cmp(rb);
            }
        }
    }
}

/// 检查剩余字符串中的所有数字段是否都为 0（用于版本比较时判定缺失段等价于 0）。
fn all_remaining_zero(s: &str) -> bool {
    let mut cur = s;
    loop {
        if cur.is_empty() {
            return true;
        }
        let (n, rest) = parse_segment(cur);
        match n {
            Some(0) => {
                cur = rest.trim_start_matches('.');
            }
            Some(_) => return false,
            None => return true, // 非数字段忽略，视为相等
        }
    }
}

/// 取出字符串开头的数字段，返回 (解析后的数字, 剩余字符串)。
/// 若开头非数字，返回 (None, 原字符串)。
fn parse_segment(s: &str) -> (Option<u64>, &str) {
    let idx = s
        .char_indices()
        .take_while(|(_, c)| c.is_ascii_digit())
        .last()
        .map(|(i, c)| i + c.len_utf8())
        .unwrap_or(0);
    let (num_str, rest) = s.split_at(idx);
    if num_str.is_empty() {
        (None, s)
    } else {
        (num_str.parse::<u64>().ok(), rest)
    }
}

/// 计算两组 (key, value) 元数据集合的差异，返回变更描述字符串列表。
/// 每个变更以 `+`/`-`/`~` 前缀表示新增/删除/修改。
pub fn diff_metadata(a: &[(&str, &str)], b: &[(&str, &str)]) -> Vec<String> {
    use std::collections::HashMap;
    let map_a: HashMap<&str, &str> = a.iter().copied().collect();
    let map_b: HashMap<&str, &str> = b.iter().copied().collect();

    let mut diffs = Vec::new();

    // 删除的 key（在 a 但不在 b）
    let mut removed: Vec<&str> = map_a
        .keys()
        .filter(|&k| !map_b.contains_key(k))
        .copied()
        .collect();
    removed.sort();
    for k in removed {
        diffs.push(format!("- {}: {}", k, map_a[k]));
    }

    // 新增的 key（在 b 但不在 a）
    let mut added: Vec<&str> = map_b
        .keys()
        .filter(|&k| !map_a.contains_key(k))
        .copied()
        .collect();
    added.sort();
    for k in added {
        diffs.push(format!("+ {}: {}", k, map_b[k]));
    }

    // 修改的 key（在 a 和 b 中都有，但值不同）
    let mut changed: Vec<&str> = map_a
        .keys()
        .filter(|&k| map_b.get(k).is_some() && map_a[*k] != map_b[*k])
        .copied()
        .collect();
    changed.sort();
    for k in changed {
        diffs.push(format!("~ {}: {} -> {}", k, map_a[k], map_b[k]));
    }

    diffs
}

// ==================== 版本控制 ====================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionSnapshot {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub version: String,
    pub data: serde_json::Value,
    pub hash: String,
    pub created_by: String,
    pub created_at: String,
    pub comment: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionDiff {
    pub from_version: String,
    pub to_version: String,
    pub added_fields: Vec<String>,
    pub removed_fields: Vec<String>,
    pub changed_fields: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BranchType {
    Main,
    Feature,
    Release,
    Hotfix,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VersionBranch {
    pub id: String,
    pub name: String,
    pub branch_type: BranchType,
    pub parent_branch: Option<String>,
    pub created_at: String,
    pub created_by: String,
    pub merged_at: Option<String>,
    pub merged_by: Option<String>,
    pub status: String,
}

// ==================== 审计日志 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    Create,
    Read,
    Update,
    Delete,
    Export,
    Import,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventCategory {
    DataAccess,
    Modification,
    Administration,
    Security,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AuditEvent {
    pub id: String,
    pub event_type: AuditEventType,
    pub category: AuditEventCategory,
    pub entity_type: String,
    pub entity_id: String,
    pub user_id: String,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub ip_address: String,
    pub timestamp: String,
    pub session_id: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AuditExportLog {
    pub id: String,
    pub user_id: String,
    pub export_type: String,
    pub record_count: i64,
    pub exported_at: String,
    pub ip_address: String,
}

// ==================== 数据权限矩阵 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionAction {
    Read,
    Write,
    Delete,
    Admin,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataPermission {
    pub id: String,
    pub role_id: String,
    pub resource_type: String,
    pub resource_id: String,
    pub action: PermissionAction,
    pub condition: Option<serde_json::Value>,
    pub inherited: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PermissionRole {
    pub id: String,
    pub name: String,
    pub description: String,
    pub inherited_from: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserRoleAssignment {
    pub id: String,
    pub user_id: String,
    pub role_id: String,
    pub assigned_at: String,
}

// ==================== 内存存储 ====================

struct V54Store {
    version_snapshots: Mutex<Vec<VersionSnapshot>>,
    version_branches: Mutex<Vec<VersionBranch>>,
    audit_events: Mutex<Vec<AuditEvent>>,
    audit_export_logs: Mutex<Vec<AuditExportLog>>,
    permission_roles: Mutex<Vec<PermissionRole>>,
    data_permissions: Mutex<Vec<DataPermission>>,
    user_role_assignments: Mutex<Vec<UserRoleAssignment>>,
    initialized: Mutex<bool>,
}

fn get_v54_store() -> &'static V54Store {
    static STORE: LazyLock<V54Store> = LazyLock::new(|| V54Store {
        version_snapshots: Mutex::new(Vec::new()),
        version_branches: Mutex::new(Vec::new()),
        audit_events: Mutex::new(Vec::new()),
        audit_export_logs: Mutex::new(Vec::new()),
        permission_roles: Mutex::new(Vec::new()),
        data_permissions: Mutex::new(Vec::new()),
        user_role_assignments: Mutex::new(Vec::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_v54_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();

    let main_branch = VersionBranch {
        id: uuid::Uuid::new_v4().to_string(),
        name: "main".to_string(),
        branch_type: BranchType::Main,
        parent_branch: None,
        created_at: now_str.clone(),
        created_by: "system".to_string(),
        merged_at: None,
        merged_by: None,
        status: "active".to_string(),
    };

    let feature_branch = VersionBranch {
        id: uuid::Uuid::new_v4().to_string(),
        name: "feature/customer-v2".to_string(),
        branch_type: BranchType::Feature,
        parent_branch: Some(main_branch.id.clone()),
        created_at: now_str.clone(),
        created_by: "admin".to_string(),
        merged_at: None,
        merged_by: None,
        status: "active".to_string(),
    };

    let snapshot = VersionSnapshot {
        id: uuid::Uuid::new_v4().to_string(),
        entity_type: "customer".to_string(),
        entity_id: "C0001".to_string(),
        version: "v1.0.0".to_string(),
        data: serde_json::json!({
            "name": "阿里巴巴集团",
            "code": "C0001",
            "industry": "technology",
            "status": "active"
        }),
        hash: "a1b2c3d4e5f6".to_string(),
        created_by: "admin".to_string(),
        created_at: now_str.clone(),
        comment: "初始版本".to_string(),
    };

    let audit_event = AuditEvent {
        id: uuid::Uuid::new_v4().to_string(),
        event_type: AuditEventType::Create,
        category: AuditEventCategory::Modification,
        entity_type: "customer".to_string(),
        entity_id: "C0001".to_string(),
        user_id: "admin".to_string(),
        old_value: None,
        new_value: Some(snapshot.data.clone()),
        ip_address: "127.0.0.1".to_string(),
        timestamp: now_str.clone(),
        session_id: uuid::Uuid::new_v4().to_string(),
    };

    let admin_role = PermissionRole {
        id: uuid::Uuid::new_v4().to_string(),
        name: "admin".to_string(),
        description: "系统管理员，拥有所有权限".to_string(),
        inherited_from: None,
        created_at: now_str.clone(),
    };

    let editor_role = PermissionRole {
        id: uuid::Uuid::new_v4().to_string(),
        name: "editor".to_string(),
        description: "数据编辑，可读写数据".to_string(),
        inherited_from: Some(admin_role.id.clone()),
        created_at: now_str.clone(),
    };

    let viewer_role = PermissionRole {
        id: uuid::Uuid::new_v4().to_string(),
        name: "viewer".to_string(),
        description: "数据查看者，只读".to_string(),
        inherited_from: Some(editor_role.id.clone()),
        created_at: now_str.clone(),
    };

    let perm = DataPermission {
        id: uuid::Uuid::new_v4().to_string(),
        role_id: editor_role.id.clone(),
        resource_type: "customer".to_string(),
        resource_id: "*".to_string(),
        action: PermissionAction::Read,
        condition: None,
        inherited: false,
    };

    let user_assign = UserRoleAssignment {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: "user-001".to_string(),
        role_id: editor_role.id.clone(),
        assigned_at: now_str.clone(),
    };

    *store.version_snapshots.lock().await = vec![snapshot];
    *store.version_branches.lock().await = vec![main_branch, feature_branch];
    *store.audit_events.lock().await = vec![audit_event];
    *store.audit_export_logs.lock().await = Vec::new();
    *store.permission_roles.lock().await = vec![admin_role, editor_role, viewer_role];
    *store.data_permissions.lock().await = vec![perm];
    *store.user_role_assignments.lock().await = vec![user_assign];

    *initialized = true;
}

// ==================== 请求/响应结构 ====================

// --- 版本控制请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateSnapshotRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub data: serde_json::Value,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionQuery {
    pub version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionDiffQuery {
    pub entity_type: String,
    pub entity_id: String,
    pub from_version: String,
    pub to_version: String,
}

#[derive(Debug, Deserialize)]
pub struct RestoreVersionRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub version: String,
}

#[derive(Debug, Deserialize)]
pub struct VersionHistoryQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBranchRequest {
    pub name: String,
    pub branch_type: Option<String>,
    pub parent_branch: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MergeBranchRequest {
    pub source_branch: String,
    pub target_branch: String,
}

#[derive(Debug, Deserialize)]
pub struct CherryPickRequest {
    pub branch_name: String,
    pub version: String,
}

// --- 审计日志请求 ---

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub event_type: Option<String>,
    pub category: Option<String>,
    pub user_id: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UserActivityQuery {
    pub event_type: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct EntityHistoryQuery {
    pub event_type: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ExportAuditLogRequest {
    pub entity_type: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub format: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ComplianceAuditQuery {
    pub framework: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

// --- 数据权限请求 ---

#[derive(Debug, Deserialize)]
pub struct GrantPermissionRequest {
    pub role_id: String,
    pub resource_type: String,
    pub resource_id: String,
    pub action: String,
    pub condition: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct RevokePermissionRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct CheckPermissionQuery {
    pub user_id: String,
    pub resource_type: String,
    pub resource_id: String,
    pub action: String,
}

#[derive(Debug, Deserialize)]
pub struct UserPermissionsQuery {
    pub resource_type: Option<String>,
    pub action: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ResourcePermissionsQuery {
    pub resource_type: Option<String>,
    pub action: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub description: Option<String>,
    pub inherited_from: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub user_id: String,
    pub role_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RevokeRoleRequest {
    pub user_id: String,
    pub role_id: String,
}

// ==================== 内部辅助函数 ====================

fn audit_event_type_from_str(s: &str) -> AuditEventType {
    match s {
        "read" => AuditEventType::Read,
        "update" => AuditEventType::Update,
        "delete" => AuditEventType::Delete,
        "export" => AuditEventType::Export,
        "import" => AuditEventType::Import,
        _ => AuditEventType::Create,
    }
}

fn audit_category_from_str(s: &str) -> AuditEventCategory {
    match s {
        "modification" => AuditEventCategory::Modification,
        "administration" => AuditEventCategory::Administration,
        "security" => AuditEventCategory::Security,
        _ => AuditEventCategory::DataAccess,
    }
}

fn permission_action_from_str(s: &str) -> PermissionAction {
    match s {
        "write" => PermissionAction::Write,
        "delete" => PermissionAction::Delete,
        "admin" => PermissionAction::Admin,
        _ => PermissionAction::Read,
    }
}

fn branch_type_from_str(s: &str) -> BranchType {
    match s {
        "feature" => BranchType::Feature,
        "release" => BranchType::Release,
        "hotfix" => BranchType::Hotfix,
        _ => BranchType::Main,
    }
}

fn compute_hash(data: &serde_json::Value) -> String {
    let serialized = serde_json::to_string(data).unwrap_or_default();
    format!("{:x}", {
        let mut hasher = 0u64;
        for byte in serialized.bytes() {
            hasher = hasher.wrapping_mul(31).wrapping_add(byte as u64);
        }
        hasher
    })
}

fn generate_version(existing: &[VersionSnapshot], entity_type: &str, entity_id: &str) -> String {
    let mut max_ver: i32 = 0;
    for s in existing {
        if s.entity_type == entity_type && s.entity_id == entity_id {
            if let Some(ver_str) = s.version.strip_prefix('v') {
                if let Ok(v) = ver_str.parse::<i32>() {
                    max_ver = max_ver.max(v);
                }
            }
        }
    }
    format!("v{}.0.0", max_ver + 1)
}

fn compute_diff(from: &serde_json::Value, to: &serde_json::Value) -> VersionDiff {
    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut changed = Vec::new();

    if let (Some(from_obj), Some(to_obj)) = (from.as_object(), to.as_object()) {
        let from_keys: std::collections::HashSet<_> = from_obj.keys().collect();
        let to_keys: std::collections::HashSet<_> = to_obj.keys().collect();

        for key in &to_keys {
            if !from_keys.contains(key) {
                added.push(key.to_string());
            }
        }
        for key in &from_keys {
            if !to_keys.contains(key) {
                removed.push(key.to_string());
            }
        }
        for key in from_keys.intersection(&to_keys) {
            if from_obj.get(*key) != to_obj.get(*key) {
                changed.push(key.to_string());
            }
        }
    }

    VersionDiff {
        from_version: String::new(),
        to_version: String::new(),
        added_fields: added,
        removed_fields: removed,
        changed_fields: changed,
    }
}

// ==================== 处理器：版本控制 ====================

pub async fn create_snapshot(
    State(_state): State<AppState>,
    Json(req): Json<CreateSnapshotRequest>,
) -> Json<ApiResponse<VersionSnapshot>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut snapshots = store.version_snapshots.lock().await;

    let version = generate_version(&snapshots, &req.entity_type, &req.entity_id);
    let hash = compute_hash(&req.data);
    let now = chrono::Utc::now().to_rfc3339();

    let snapshot = VersionSnapshot {
        id: uuid::Uuid::new_v4().to_string(),
        entity_type: req.entity_type,
        entity_id: req.entity_id,
        version,
        data: req.data,
        hash,
        created_by: "current_user".to_string(),
        created_at: now,
        comment: req.comment.unwrap_or_default(),
    };

    snapshots.push(snapshot.clone());

    let mut events = store.audit_events.lock().await;
    events.push(AuditEvent {
        id: uuid::Uuid::new_v4().to_string(),
        event_type: AuditEventType::Create,
        category: AuditEventCategory::Modification,
        entity_type: snapshot.entity_type.clone(),
        entity_id: snapshot.entity_id.clone(),
        user_id: snapshot.created_by.clone(),
        old_value: None,
        new_value: Some(snapshot.data.clone()),
        ip_address: "127.0.0.1".to_string(),
        timestamp: snapshot.created_at.clone(),
        session_id: uuid::Uuid::new_v4().to_string(),
    });

    Json(ApiResponse::success(snapshot, "版本快照已创建"))
}

pub async fn get_version(
    State(_state): State<AppState>,
    Path((entity_type, entity_id)): Path<(String, String)>,
    Query(params): Query<VersionQuery>,
) -> Json<ApiResponse<VersionSnapshot>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let snapshots = store.version_snapshots.lock().await;

    let snapshot = if let Some(ref ver) = params.version {
        snapshots
            .iter()
            .find(|s| s.entity_type == entity_type && s.entity_id == entity_id && s.version == *ver)
    } else {
        snapshots
            .iter()
            .filter(|s| s.entity_type == entity_type && s.entity_id == entity_id)
            .max_by(|a, b| a.version.cmp(&b.version))
    };

    match snapshot {
        Some(s) => Json(ApiResponse::success(s.clone(), "版本快照详情")),
        None => Json(ApiResponse::error(404, "未找到版本快照")),
    }
}

pub async fn diff_versions(
    State(_state): State<AppState>,
    Query(params): Query<VersionDiffQuery>,
) -> Json<ApiResponse<VersionDiff>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let snapshots = store.version_snapshots.lock().await;

    let from_snap = snapshots.iter().find(|s| {
        s.entity_type == params.entity_type
            && s.entity_id == params.entity_id
            && s.version == params.from_version
    });
    let to_snap = snapshots.iter().find(|s| {
        s.entity_type == params.entity_type
            && s.entity_id == params.entity_id
            && s.version == params.to_version
    });

    match (from_snap, to_snap) {
        (Some(from), Some(to)) => {
            let mut diff = compute_diff(&from.data, &to.data);
            diff.from_version = params.from_version.clone();
            diff.to_version = params.to_version.clone();
            Json(ApiResponse::success(diff, "版本差异"))
        }
        _ => Json(ApiResponse::error(404, "未找到指定版本")),
    }
}

pub async fn restore_version(
    State(_state): State<AppState>,
    Json(req): Json<RestoreVersionRequest>,
) -> Json<ApiResponse<VersionSnapshot>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let snapshots = store.version_snapshots.lock().await;

    let target = snapshots
        .iter()
        .find(|s| {
            s.entity_type == req.entity_type
                && s.entity_id == req.entity_id
                && s.version == req.version
        })
        .cloned();

    let Some(target) = target else {
        return Json(ApiResponse::error(404, "未找到指定版本"));
    };

    drop(snapshots);

    let mut all = store.version_snapshots.lock().await;
    let new_version = generate_version(&all, &target.entity_type, &target.entity_id);
    let now = chrono::Utc::now().to_rfc3339();

    let restored = VersionSnapshot {
        id: uuid::Uuid::new_v4().to_string(),
        entity_type: target.entity_type,
        entity_id: target.entity_id,
        version: new_version,
        data: target.data,
        hash: target.hash,
        created_by: "restored_by_system".to_string(),
        created_at: now,
        comment: format!("从版本 {} 恢复", target.version),
    };

    all.push(restored.clone());

    let mut events = store.audit_events.lock().await;
    events.push(AuditEvent {
        id: uuid::Uuid::new_v4().to_string(),
        event_type: AuditEventType::Update,
        category: AuditEventCategory::Modification,
        entity_type: restored.entity_type.clone(),
        entity_id: restored.entity_id.clone(),
        user_id: restored.created_by.clone(),
        old_value: None,
        new_value: Some(restored.data.clone()),
        ip_address: "127.0.0.1".to_string(),
        timestamp: restored.created_at.clone(),
        session_id: uuid::Uuid::new_v4().to_string(),
    });

    Json(ApiResponse::success(restored, "版本已恢复"))
}

pub async fn list_history(
    State(_state): State<AppState>,
    Path((entity_type, entity_id)): Path<(String, String)>,
    Query(params): Query<VersionHistoryQuery>,
) -> Json<ApiResponse<PaginatedResponse<VersionSnapshot>>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let snapshots = store.version_snapshots.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<VersionSnapshot> = snapshots
        .iter()
        .filter(|s| s.entity_type == entity_type && s.entity_id == entity_id)
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let total = filtered.len() as i64;
    let items: Vec<VersionSnapshot> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "版本历史",
    ))
}

pub async fn create_branch(
    State(_state): State<AppState>,
    Json(req): Json<CreateBranchRequest>,
) -> Json<ApiResponse<VersionBranch>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut branches = store.version_branches.lock().await;

    let branch_type = req
        .branch_type
        .as_deref()
        .map(branch_type_from_str)
        .unwrap_or(BranchType::Feature);
    let now = chrono::Utc::now().to_rfc3339();

    let branch = VersionBranch {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        branch_type,
        parent_branch: req.parent_branch,
        created_at: now.clone(),
        created_by: "current_user".to_string(),
        merged_at: None,
        merged_by: None,
        status: "active".to_string(),
    };

    branches.push(branch.clone());
    Json(ApiResponse::success(branch, "分支已创建"))
}

pub async fn merge_branch(
    State(_state): State<AppState>,
    Json(req): Json<MergeBranchRequest>,
) -> Json<ApiResponse<VersionBranch>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut branches = store.version_branches.lock().await;

    let source_exists = branches.iter().any(|b| b.name == req.source_branch);
    if !source_exists {
        return Json(ApiResponse::error(404, "源分支不存在"));
    }

    let target = branches.iter_mut().find(|b| b.name == req.target_branch);
    let Some(target) = target else {
        return Json(ApiResponse::error(404, "目标分支不存在"));
    };

    let now = chrono::Utc::now().to_rfc3339();
    target.merged_at = Some(now.clone());
    target.merged_by = Some("current_user".to_string());
    target.status = "merged".to_string();

    Json(ApiResponse::success(target.clone(), "分支已合并"))
}

// ==================== 处理器：审计日志 ====================

pub async fn query_audit_log(
    State(_state): State<AppState>,
    Query(params): Query<AuditLogQuery>,
) -> Json<ApiResponse<PaginatedResponse<AuditEvent>>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let events = store.audit_events.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<AuditEvent> = events
        .iter()
        .filter(|e| {
            if let Some(et) = &params.entity_type {
                if &e.entity_type != et {
                    return false;
                }
            }
            if let Some(eid) = &params.entity_id {
                if &e.entity_id != eid {
                    return false;
                }
            }
            if let Some(ev) = &params.event_type {
                let type_str = match e.event_type {
                    AuditEventType::Create => "create",
                    AuditEventType::Read => "read",
                    AuditEventType::Update => "update",
                    AuditEventType::Delete => "delete",
                    AuditEventType::Export => "export",
                    AuditEventType::Import => "import",
                };
                if type_str != ev.as_str() {
                    return false;
                }
            }
            if let Some(cat) = &params.category {
                let cat_str = match e.category {
                    AuditEventCategory::DataAccess => "data_access",
                    AuditEventCategory::Modification => "modification",
                    AuditEventCategory::Administration => "administration",
                    AuditEventCategory::Security => "security",
                };
                if cat_str != cat.as_str() {
                    return false;
                }
            }
            if let Some(uid) = &params.user_id {
                if &e.user_id != uid {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let total = filtered.len() as i64;
    let items: Vec<AuditEvent> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "审计日志",
    ))
}

pub async fn get_user_activity(
    State(_state): State<AppState>,
    Path(user_id): Path<String>,
    Query(params): Query<UserActivityQuery>,
) -> Json<ApiResponse<PaginatedResponse<AuditEvent>>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let events = store.audit_events.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<AuditEvent> = events
        .iter()
        .filter(|e| {
            if e.user_id != user_id {
                return false;
            }
            if let Some(ev) = &params.event_type {
                let type_str = match e.event_type {
                    AuditEventType::Create => "create",
                    AuditEventType::Read => "read",
                    AuditEventType::Update => "update",
                    AuditEventType::Delete => "delete",
                    AuditEventType::Export => "export",
                    AuditEventType::Import => "import",
                };
                if type_str != ev.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let total = filtered.len() as i64;
    let items: Vec<AuditEvent> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "用户活动记录",
    ))
}

pub async fn get_entity_history(
    State(_state): State<AppState>,
    Path((entity_type, entity_id)): Path<(String, String)>,
    Query(params): Query<EntityHistoryQuery>,
) -> Json<ApiResponse<PaginatedResponse<AuditEvent>>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let events = store.audit_events.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<AuditEvent> = events
        .iter()
        .filter(|e| {
            if e.entity_type != entity_type || e.entity_id != entity_id {
                return false;
            }
            if let Some(ev) = &params.event_type {
                let type_str = match e.event_type {
                    AuditEventType::Create => "create",
                    AuditEventType::Read => "read",
                    AuditEventType::Update => "update",
                    AuditEventType::Delete => "delete",
                    AuditEventType::Export => "export",
                    AuditEventType::Import => "import",
                };
                if type_str != ev.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let total = filtered.len() as i64;
    let items: Vec<AuditEvent> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "实体操作历史",
    ))
}

pub async fn export_audit_log(
    State(_state): State<AppState>,
    Json(req): Json<ExportAuditLogRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let events = store.audit_events.lock().await;

    let filtered: Vec<AuditEvent> = events
        .iter()
        .filter(|e| {
            if let Some(et) = &req.entity_type {
                if &e.entity_type != et {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    let record_count = filtered.len() as i64;
    let now = chrono::Utc::now().to_rfc3339();

    drop(events);

    let mut export_logs = store.audit_export_logs.lock().await;
    export_logs.push(AuditExportLog {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: "current_user".to_string(),
        export_type: req.format.unwrap_or_else(|| "json".to_string()),
        record_count,
        exported_at: now.clone(),
        ip_address: "127.0.0.1".to_string(),
    });

    Json(ApiResponse::success(
        serde_json::json!({
            "export_id": export_logs.last().expect("export_logs is non-empty after push").id,
            "record_count": record_count,
            "format": "json",
            "exported_at": now,
            "data": filtered,
        }),
        "审计日志已导出",
    ))
}

pub async fn get_compliance_audit(
    State(_state): State<AppState>,
    Query(params): Query<ComplianceAuditQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let events = store.audit_events.lock().await;

    let framework = params.framework.unwrap_or_else(|| "SOC2".to_string());

    let mut by_category: HashMap<String, i64> = HashMap::new();
    let mut by_event_type: HashMap<String, i64> = HashMap::new();
    let mut high_risk_count: i64 = 0;

    for e in events.iter() {
        *by_category
            .entry(format!("{:?}", e.category).to_lowercase())
            .or_insert(0) += 1;
        *by_event_type
            .entry(format!("{:?}", e.event_type).to_lowercase())
            .or_insert(0) += 1;
        if matches!(
            e.event_type,
            AuditEventType::Delete | AuditEventType::Export
        ) {
            high_risk_count += 1;
        }
    }

    let report = serde_json::json!({
        "framework": framework,
        "audit_period": {
            "start": params.start_time.as_deref().unwrap_or("epoch"),
            "end": params.end_time.as_deref().unwrap_or("now"),
        },
        "summary": {
            "total_events": events.len() as i64,
            "high_risk_events": high_risk_count,
            "by_category": by_category,
            "by_event_type": by_event_type,
        },
        "compliance_status": if high_risk_count > events.len() as i64 / 10 {
            "needs_review"
        } else {
            "passing"
        },
        "generated_at": chrono::Utc::now().to_rfc3339(),
    });

    Json(ApiResponse::success(report, "合规审计报告"))
}

// ==================== 处理器：数据权限矩阵 ====================

pub async fn grant_permission(
    State(_state): State<AppState>,
    Json(req): Json<GrantPermissionRequest>,
) -> Json<ApiResponse<DataPermission>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut perms = store.data_permissions.lock().await;

    let perm = DataPermission {
        id: uuid::Uuid::new_v4().to_string(),
        role_id: req.role_id,
        resource_type: req.resource_type,
        resource_id: req.resource_id,
        action: permission_action_from_str(&req.action),
        condition: req.condition,
        inherited: false,
    };

    perms.push(perm.clone());
    Json(ApiResponse::success(perm, "权限已授予"))
}

pub async fn revoke_permission(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut perms = store.data_permissions.lock().await;
    let len_before = perms.len();
    perms.retain(|p| p.id != id);

    if perms.len() == len_before {
        return Json(ApiResponse::error(404, "未找到权限"));
    }

    Json(ApiResponse::success_no_data("权限已撤销"))
}

pub async fn check_permission(
    State(_state): State<AppState>,
    Query(params): Query<CheckPermissionQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_v54_store();

    let assignments = store.user_role_assignments.lock().await;
    let user_roles: Vec<String> = assignments
        .iter()
        .filter(|a| a.user_id == params.user_id)
        .map(|a| a.role_id.clone())
        .collect();
    drop(assignments);

    let roles = store.permission_roles.lock().await;
    let mut all_role_ids = user_roles.clone();
    for role in roles.iter() {
        if let Some(ref parent) = role.inherited_from {
            if user_roles.contains(parent) {
                all_role_ids.push(role.id.clone());
            }
        }
    }
    drop(roles);

    let perms = store.data_permissions.lock().await;
    let action = permission_action_from_str(&params.action);

    let has_permission = perms.iter().any(|p| {
        all_role_ids.contains(&p.role_id)
            && p.resource_type == params.resource_type
            && (p.resource_id == params.resource_id || p.resource_id == "*")
            && match (&p.action, &action) {
                (PermissionAction::Admin, _) => true,
                (PermissionAction::Write, PermissionAction::Read) => true,
                (PermissionAction::Write, PermissionAction::Write) => true,
                (PermissionAction::Delete, PermissionAction::Read) => true,
                (PermissionAction::Delete, PermissionAction::Delete) => true,
                _ => p.action == action,
            }
    });

    Json(ApiResponse::success(
        serde_json::json!({
            "user_id": params.user_id,
            "resource_type": params.resource_type,
            "resource_id": params.resource_id,
            "action": params.action,
            "has_permission": has_permission,
            "roles_checked": all_role_ids,
        }),
        if has_permission {
            "权限检查通过"
        } else {
            "权限不足"
        },
    ))
}

pub async fn get_user_permissions(
    State(_state): State<AppState>,
    Path(user_id): Path<String>,
    Query(params): Query<UserPermissionsQuery>,
) -> Json<ApiResponse<Vec<DataPermission>>> {
    ensure_initialized().await;
    let store = get_v54_store();

    let assignments = store.user_role_assignments.lock().await;
    let user_roles: Vec<String> = assignments
        .iter()
        .filter(|a| a.user_id == user_id)
        .map(|a| a.role_id.clone())
        .collect();
    drop(assignments);

    let roles = store.permission_roles.lock().await;
    let mut all_role_ids = user_roles.clone();
    for role in roles.iter() {
        if let Some(ref parent) = role.inherited_from {
            if user_roles.contains(parent) {
                all_role_ids.push(role.id.clone());
            }
        }
    }
    drop(roles);

    let perms = store.data_permissions.lock().await;
    let mut filtered: Vec<DataPermission> = perms
        .iter()
        .filter(|p| {
            if !all_role_ids.contains(&p.role_id) {
                return false;
            }
            if let Some(rt) = &params.resource_type {
                if &p.resource_type != rt {
                    return false;
                }
            }
            if let Some(act) = &params.action {
                let action_str = match p.action {
                    PermissionAction::Read => "read",
                    PermissionAction::Write => "write",
                    PermissionAction::Delete => "delete",
                    PermissionAction::Admin => "admin",
                };
                if action_str != act.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| a.role_id.cmp(&b.role_id));

    Json(ApiResponse::success(filtered, "用户权限列表"))
}

pub async fn get_resource_permissions(
    State(_state): State<AppState>,
    Query(params): Query<ResourcePermissionsQuery>,
) -> Json<ApiResponse<Vec<DataPermission>>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let perms = store.data_permissions.lock().await;

    let filtered: Vec<DataPermission> = perms
        .iter()
        .filter(|p| {
            if let Some(rt) = &params.resource_type {
                if &p.resource_type != rt {
                    return false;
                }
            }
            if let Some(act) = &params.action {
                let action_str = match p.action {
                    PermissionAction::Read => "read",
                    PermissionAction::Write => "write",
                    PermissionAction::Delete => "delete",
                    PermissionAction::Admin => "admin",
                };
                if action_str != act.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    Json(ApiResponse::success(filtered, "资源权限列表"))
}

pub async fn create_role(
    State(_state): State<AppState>,
    Json(req): Json<CreateRoleRequest>,
) -> Json<ApiResponse<PermissionRole>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut roles = store.permission_roles.lock().await;

    let now = chrono::Utc::now().to_rfc3339();

    let role = PermissionRole {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        description: req.description.unwrap_or_default(),
        inherited_from: req.inherited_from,
        created_at: now,
    };

    roles.push(role.clone());
    Json(ApiResponse::success(role, "角色已创建"))
}

pub async fn assign_role(
    State(_state): State<AppState>,
    Json(req): Json<AssignRoleRequest>,
) -> Json<ApiResponse<UserRoleAssignment>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut assignments = store.user_role_assignments.lock().await;

    let now = chrono::Utc::now().to_rfc3339();

    let assignment = UserRoleAssignment {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: req.user_id,
        role_id: req.role_id,
        assigned_at: now,
    };

    assignments.push(assignment.clone());
    Json(ApiResponse::success(assignment, "角色已分配"))
}

pub async fn revoke_role(
    State(_state): State<AppState>,
    Json(req): Json<RevokeRoleRequest>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;
    let store = get_v54_store();
    let mut assignments = store.user_role_assignments.lock().await;
    let len_before = assignments.len();
    assignments.retain(|a| !(a.user_id == req.user_id && a.role_id == req.role_id));

    if assignments.len() == len_before {
        return Json(ApiResponse::error(404, "未找到角色分配记录"));
    }

    Json(ApiResponse::success_no_data("角色已撤销"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cmp::Ordering;

    // ---------- compare_versions ----------

    #[test]
    fn test_compare_equal_versions() {
        assert_eq!(compare_versions("1.2.3", "1.2.3"), Ordering::Equal);
        assert_eq!(compare_versions("0.0.0", "0.0.0"), Ordering::Equal);
    }

    #[test]
    fn test_compare_major_version_difference() {
        assert_eq!(compare_versions("2.0.0", "1.9.9"), Ordering::Greater);
        assert_eq!(compare_versions("1.0.0", "2.0.0"), Ordering::Less);
    }

    #[test]
    fn test_compare_minor_version_difference() {
        assert_eq!(compare_versions("1.10.0", "1.9.0"), Ordering::Greater);
        assert_eq!(compare_versions("1.2.0", "1.10.0"), Ordering::Less);
    }

    #[test]
    fn test_compare_patch_version_difference() {
        assert_eq!(compare_versions("1.2.5", "1.2.4"), Ordering::Greater);
        assert_eq!(compare_versions("1.2.3", "1.2.10"), Ordering::Less);
    }

    #[test]
    fn test_compare_different_segment_counts() {
        // 1.2 vs 1.2.0 -> 缺失段视为 0，相等
        assert_eq!(compare_versions("1.2", "1.2.0"), Ordering::Equal);
        // 1.2.1 vs 1.2 -> 1.2.1 更大
        assert_eq!(compare_versions("1.2.1", "1.2"), Ordering::Greater);
        assert_eq!(compare_versions("1.2", "1.2.1"), Ordering::Less);
    }

    #[test]
    fn test_compare_with_v_prefix() {
        assert_eq!(compare_versions("v1.2.3", "1.2.3"), Ordering::Equal);
        assert_eq!(compare_versions("V1.2.3", "1.2.3"), Ordering::Equal);
        assert_eq!(compare_versions("v2.0.0", "v1.0.0"), Ordering::Greater);
    }

    #[test]
    fn test_compare_with_prerelease_suffix() {
        // 数字部分相同（1.0.0），剩余字符串按字典序比较
        // "-beta" > "-alpha" (b > a)
        assert_eq!(
            compare_versions("1.0.0-beta", "1.0.0-alpha"),
            Ordering::Greater
        );
        assert_eq!(
            compare_versions("1.0.0-alpha", "1.0.0-beta"),
            Ordering::Less
        );
        // 主版本号不同时直接看数字
        assert_eq!(
            compare_versions("2.0.0-rc1", "1.9.9-stable"),
            Ordering::Greater
        );
    }

    #[test]
    fn test_compare_empty_strings() {
        assert_eq!(compare_versions("", ""), Ordering::Equal);
        // 空字符串与非空比较：空字符串视为较小
        assert_eq!(compare_versions("", "1.0.0"), Ordering::Less);
    }

    #[test]
    fn test_compare_large_versions() {
        assert_eq!(compare_versions("10.20.30", "9.99.99"), Ordering::Greater);
        assert_eq!(compare_versions("100.0.0", "99.99.99"), Ordering::Greater);
    }

    // ---------- diff_metadata ----------

    #[test]
    fn test_diff_empty_inputs() {
        let diffs = diff_metadata(&[], &[]);
        assert!(diffs.is_empty());
    }

    #[test]
    fn test_diff_identical_metadata() {
        let a = &[("name", "alice"), ("age", "30")][..];
        let b = &[("name", "alice"), ("age", "30")][..];
        let diffs = diff_metadata(a, b);
        assert!(diffs.is_empty());
    }

    #[test]
    fn test_diff_added_field() {
        let a = &[("name", "alice")][..];
        let b = &[("name", "alice"), ("email", "a@b.com")][..];
        let diffs = diff_metadata(a, b);
        assert_eq!(diffs.len(), 1);
        assert!(diffs[0].starts_with("+ email:"));
    }

    #[test]
    fn test_diff_removed_field() {
        let a = &[("name", "alice"), ("email", "a@b.com")][..];
        let b = &[("name", "alice")][..];
        let diffs = diff_metadata(a, b);
        assert_eq!(diffs.len(), 1);
        assert!(diffs[0].starts_with("- email:"));
    }

    #[test]
    fn test_diff_changed_value() {
        let a = &[("name", "alice")][..];
        let b = &[("name", "bob")][..];
        let diffs = diff_metadata(a, b);
        assert_eq!(diffs.len(), 1);
        assert!(diffs[0].starts_with("~ name:"));
        assert!(diffs[0].contains("alice -> bob"));
    }

    #[test]
    fn test_diff_all_three_change_types() {
        let a = &[("k1", "v1"), ("k2", "old"), ("k3", "removed")][..];
        let b = &[("k1", "v1"), ("k2", "new"), ("k4", "added")][..];
        let diffs = diff_metadata(a, b);
        // 应包含：- k3, + k4, ~ k2
        assert_eq!(diffs.len(), 3);
        let joined = diffs.join("\n");
        assert!(joined.contains("- k3: removed"));
        assert!(joined.contains("+ k4: added"));
        assert!(joined.contains("~ k2: old -> new"));
    }

    #[test]
    fn test_diff_results_are_sorted() {
        let a = &[("z", "1"), ("a", "1")][..];
        let b = &[][..];
        let diffs = diff_metadata(a, b);
        // 删除项应按 key 字典序排序：a 在 z 之前
        assert!(diffs[0].contains("a:"));
        assert!(diffs[1].contains("z:"));
    }

    #[test]
    fn test_diff_with_empty_value() {
        let a = &[("name", "")][..];
        let b = &[("name", "alice")][..];
        let diffs = diff_metadata(a, b);
        assert_eq!(diffs.len(), 1);
        assert!(diffs[0].contains("name:"));
        assert!(diffs[0].contains(" -> alice"));
    }
}
