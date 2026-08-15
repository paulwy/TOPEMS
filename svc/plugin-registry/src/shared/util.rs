//! Plugin Registry 纯工具函数（无 DB / async 依赖）
//!
//! 覆盖：SemVer 解析比较、依赖 DAG、Plugin Lifecycle FSM、
//! 权限角色（PermissionRole）、插件 ID/Slug、校验等。

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

// ============================================================================
// SemVer：简化语义化版本解析与比较
// ============================================================================

/// 简化版 SemVer：major.minor.patch，忽略 pre-release / build metadata。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SemVer {
    pub major: u64,
    pub minor: u64,
    pub patch: u64,
}

impl SemVer {
    /// 解析形如 `"1.2.3"`、`"v2.0"`、`"3"` 的版本字符串；`None` 当无法解析。
    pub fn parse(s: &str) -> Option<Self> {
        let t = s.trim().strip_prefix('v').unwrap_or(s);
        let mut parts: Vec<&str> = t.split('.').collect();
        if parts.is_empty() || parts.len() > 3 {
            return None;
        }
        while parts.len() < 3 {
            parts.push("0");
        }
        let major = parts[0].parse::<u64>().ok()?;
        let minor = parts[1].parse::<u64>().ok()?;
        let patch = parts[2].parse::<u64>().ok()?;
        Some(Self {
            major,
            minor,
            patch,
        })
    }

    /// 是否与 `other`「兼容」：同 major 且 minor/patch ≥ 要求。
    pub fn is_compatible_with(&self, required_min: &SemVer) -> bool {
        self.major == required_min.major
            && (self.minor, self.patch) >= (required_min.minor, required_min.patch)
    }

    /// 判断当前版本是否属于 major 破坏性升级区间：`from.major != self.major`
    pub fn is_major_breaking_from(&self, from: &SemVer) -> bool {
        self.major != from.major
    }
}

impl std::cmp::Ord for SemVer {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (self.major, self.minor, self.patch).cmp(&(other.major, other.minor, other.patch))
    }
}

impl std::cmp::PartialOrd for SemVer {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

/// 将 `"name@>=1.0,<2.0"` 形式的依赖字符串拆解为 `(name, min, max_exclusive)`。
/// 简化：只支持 `>=X.Y` 前缀 + `,<A.B` 上限可选；失败返回 None。
pub fn parse_dependency_spec(spec: &str) -> Option<(&str, SemVer, Option<SemVer>)> {
    let (name, rest) = spec.split_once('@')?;
    if name.is_empty() {
        return None;
    }
    // rest: ">=1.0,<2.0"
    let mut min: Option<SemVer> = None;
    let mut max_exc: Option<SemVer> = None;
    for part in rest.split(',') {
        let p = part.trim();
        if let Some(v) = p.strip_prefix(">=") {
            min = Some(SemVer::parse(v)?);
        } else if let Some(v) = p.strip_prefix('<') {
            max_exc = Some(SemVer::parse(v)?);
        } else {
            return None;
        }
    }
    Some((name, min?, max_exc))
}

// ============================================================================
// DAG：依赖图环检测 / 拓扑序
// ============================================================================

/// 节点 ID 到「它所依赖的节点集合」的映射。
pub type DepGraph<'a> = HashMap<&'a str, HashSet<&'a str>>;

/// DFS 检测是否存在环路；若存在返回 Some(环路上任意节点)。
pub fn detect_cycle(graph: &DepGraph<'_>) -> Option<String> {
    #[derive(Clone, Copy, PartialEq, Eq)]
    enum Mark {
        White,
        Gray,
        Black,
    }
    let mut marks: HashMap<&str, Mark> = HashMap::new();
    for n in graph.keys() {
        marks.insert(n, Mark::White);
    }
    // 邻接矩阵中作为「被依赖」出现但未作为 key 的节点也要补入
    for deps in graph.values() {
        for d in deps {
            marks.entry(d).or_insert(Mark::White);
        }
    }

    fn dfs<'a>(
        node: &'a str,
        graph: &DepGraph<'a>,
        marks: &mut HashMap<&'a str, Mark>,
    ) -> Option<&'a str> {
        marks.insert(node, Mark::Gray);
        let empty = HashSet::new();
        let deps = graph.get(node).unwrap_or(&empty);
        for d in deps {
            match marks.get(d).copied().unwrap_or(Mark::White) {
                Mark::Gray => return Some(d),
                Mark::White => {
                    if let Some(r) = dfs(d, graph, marks) {
                        return Some(r);
                    }
                }
                Mark::Black => {}
            }
        }
        marks.insert(node, Mark::Black);
        None
    }

    let nodes: Vec<&str> = marks.keys().copied().collect();
    for n in nodes {
        if marks[n] == Mark::White {
            if let Some(r) = dfs(n, graph, &mut marks) {
                return Some(r.to_string());
            }
        }
    }
    None
}

/// 给定图返回一个合法的拓扑排序结果（线性顺序）。若图含环则返回 None。
pub fn topological_sort(graph: &DepGraph<'_>) -> Option<Vec<String>> {
    if detect_cycle(graph).is_some() {
        return None;
    }
    let mut in_deg: HashMap<&str, usize> = HashMap::new();
    for n in graph.keys() {
        in_deg.entry(n).or_insert(0);
    }
    for deps in graph.values() {
        for d in deps {
            in_deg.entry(d).or_insert(0);
        }
    }
    // 计算每个节点的「被依赖次数」，再反推（标准 Kahn 算法）
    // 这里按「依赖方向」拓扑：A 依赖 B，则 B 在 A 之前。
    // 反向图：B 出边 → A
    let mut reverse: HashMap<&str, Vec<&str>> = HashMap::new();
    for (&n, deps) in graph {
        reverse.entry(n).or_default();
        for &d in deps {
            reverse.entry(d).or_default().push(n);
            *in_deg.entry(n).or_insert(0) += 1;
        }
    }
    use std::collections::VecDeque;
    let mut q: VecDeque<&str> = VecDeque::new();
    for (&n, &deg) in &in_deg {
        if deg == 0 {
            q.push_back(n);
        }
    }
    let mut out: Vec<String> = Vec::new();
    while let Some(n) = q.pop_front() {
        out.push(n.to_string());
        let empty = Vec::new();
        let nexts = reverse.get(n).unwrap_or(&empty);
        for m in nexts {
            if let Some(d) = in_deg.get_mut(m) {
                *d -= 1;
                if *d == 0 {
                    q.push_back(m);
                }
            }
        }
    }
    Some(out)
}

// ============================================================================
// Plugin 生命周期 FSM
// ============================================================================

/// 插件生命周期状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PluginLifecycle {
    Draft,       // 草稿
    Submitted,   // 已提交审核
    Approved,    // 审核通过
    Rejected,    // 审核驳回
    Published,   // 已上架
    Unpublished, // 已下架
    Installed,   // 租户侧：已安装未启用
    Enabled,     // 租户侧：已启用
    Disabled,    // 租户侧：已禁用
    Upgrading,   // 升级中
    Error,       // 异常
}

/// 触发事件
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PluginEvent {
    Submit,        // 提交审核
    Approve,       // 审核通过
    Reject,        // 审核驳回
    Publish,       // 上架
    Unpublish,     // 下架
    Install,       // 安装
    Uninstall,     // 卸载
    Enable,        // 启用
    Disable,       // 禁用
    BeginUpgrade,  // 开始升级
    FinishUpgrade, // 完成升级
    Fail,          // 进入异常
    Reset,         // 从异常恢复
}

use PluginEvent::*;
use PluginLifecycle::*;

/// 返回给定状态在事件后的下一状态；不允许的迁移返回 None。
pub fn transition(state: PluginLifecycle, event: PluginEvent) -> Option<PluginLifecycle> {
    match (state, event) {
        (Draft, Submit) => Some(Submitted),
        (Submitted, Approve) => Some(Approved),
        (Submitted, Reject) => Some(Rejected),
        (Rejected, Submit) => Some(Submitted), // 重新提交
        (Approved, Publish) => Some(Published),
        (Published, Unpublish) => Some(Unpublished),
        (Unpublished, Publish) => Some(Published),
        (Published, Install) => Some(Installed),
        (Installed, Enable) => Some(Enabled),
        (Installed, Uninstall) => Some(Unpublished),
        (Enabled, Disable) => Some(Disabled),
        (Enabled, BeginUpgrade) => Some(Upgrading),
        (Disabled, Enable) => Some(Enabled),
        (Disabled, Uninstall) => Some(Unpublished),
        (Disabled, BeginUpgrade) => Some(Upgrading),
        (Upgrading, FinishUpgrade) => Some(Enabled),
        (Installed, BeginUpgrade) => Some(Upgrading),
        (Upgrading, Fail) => Some(Error),
        (Enabled, Fail) => Some(Error),
        (Disabled, Fail) => Some(Error),
        (Error, Reset) => Some(Disabled),
        _ => None,
    }
}

// ============================================================================
// 权限角色（PermissionRole）
// ============================================================================

/// 插件中心角色（粗粒度）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PluginRole {
    Viewer,    // 浏览者：浏览/搜索
    User,      // 普通用户：安装/卸载/评分
    Publisher, // 开发者：上传、版本管理、评论回复
    Moderator, // 审核员：审核、下架、违规处理
    Admin,     // 管理员：所有权限
}

impl PluginRole {
    /// 返回该角色是否被允许执行 `action`：
    ///
    /// - `view_market` 浏览市场
    /// - `install_plugin` 安装
    /// - `uninstall_plugin` 卸载
    /// - `rate_review` 评分
    /// - `upload_version` 上传新版本
    /// - `reply_review` 回复评论
    /// - `approve_plugin` 审核通过
    /// - `reject_plugin` 审核驳回
    /// - `unpublish_any` 任意下架
    /// - `manage_roles` 角色管理
    pub fn can(&self, action: &str) -> bool {
        use PluginRole::*;
        match (*self, action) {
            (_, "view_market") => true,
            (Admin, _) => true,
            (Moderator, "approve_plugin")
            | (Moderator, "reject_plugin")
            | (Moderator, "unpublish_any")
            | (Moderator, "install_plugin")
            | (Moderator, "uninstall_plugin")
            | (Moderator, "rate_review")
            | (Moderator, "reply_review") => true,
            (Publisher, "upload_version")
            | (Publisher, "reply_review")
            | (Publisher, "install_plugin")
            | (Publisher, "uninstall_plugin")
            | (Publisher, "rate_review") => true,
            (User, "install_plugin") | (User, "uninstall_plugin") | (User, "rate_review") => true,
            (Viewer, _) => false, // 除 view_market 外啥都不能做
            _ => false,
        }
    }
}

// ============================================================================
// Plugin Slug 与命名校验
// ============================================================================

/// 将人类可读的插件名转为 URL-safe slug（小写字母、数字、短横线）
pub fn slugify(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut prev_dash = true;
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() {
            for c in ch.to_lowercase() {
                out.push(c);
            }
            prev_dash = false;
        } else {
            if !prev_dash {
                out.push('-');
                prev_dash = true;
            }
        }
    }
    let out = out.trim_matches('-').to_string();
    if out.is_empty() {
        "plugin".to_string()
    } else {
        out
    }
}

/// 插件 code 合法性：小写字母/数字/短横线，长度 3..=40，首尾非短横线。
pub fn validate_plugin_code(code: &str) -> bool {
    if code.len() < 3 || code.len() > 40 {
        return false;
    }
    if code.starts_with('-') || code.ends_with('-') {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

// ============================================================================
// 纯 DTO（不依赖 sqlx / chrono）用于 Serde Roundtrip 测试
// ============================================================================

/// 轻量插件信息 DTO（serde only）
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub plugin_type: String,
    pub lifecycle: PluginLifecycle,
    pub dependencies: Vec<String>,
    pub tags: Vec<String>,
    pub author: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct VersionRelease {
    pub code: String,
    pub version: String,
    pub release_notes: Option<String>,
    pub is_stable: bool,
    pub min_app_version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_plugins: u64,
    pub total_installs: u64,
    pub avg_rating: f64,
    pub by_category: HashMap<String, u64>,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- SemVer 解析 ----------

    #[test]
    fn semver_parse_basic() {
        let v = SemVer::parse("1.2.3").unwrap();
        assert_eq!(v.major, 1);
        assert_eq!(v.minor, 2);
        assert_eq!(v.patch, 3);
    }

    #[test]
    fn semver_parse_with_v_prefix() {
        let v = SemVer::parse("v2.0").unwrap();
        assert_eq!(
            v,
            SemVer {
                major: 2,
                minor: 0,
                patch: 0
            }
        );
    }

    #[test]
    fn semver_parse_major_only() {
        let v = SemVer::parse("3").unwrap();
        assert_eq!(
            v,
            SemVer {
                major: 3,
                minor: 0,
                patch: 0
            }
        );
    }

    #[test]
    fn semver_parse_invalid() {
        assert!(SemVer::parse("").is_none());
        assert!(SemVer::parse("abc").is_none());
        assert!(SemVer::parse("1.2.3.4").is_none());
        assert!(SemVer::parse("-1.0").is_none());
    }

    #[test]
    fn semver_cmp_order() {
        let a = SemVer::parse("1.0.0").unwrap();
        let b = SemVer::parse("1.0.1").unwrap();
        let c = SemVer::parse("1.1.0").unwrap();
        let d = SemVer::parse("2.0.0").unwrap();
        assert!(a < b);
        assert!(b < c);
        assert!(c < d);
    }

    #[test]
    fn semver_compatible_same_major_higher_minor() {
        let cur = SemVer::parse("1.3.0").unwrap();
        let req = SemVer::parse("1.2.0").unwrap();
        assert!(cur.is_compatible_with(&req));
    }

    #[test]
    fn semver_incompatible_diff_major() {
        let cur = SemVer::parse("2.0.0").unwrap();
        let req = SemVer::parse("1.2.0").unwrap();
        assert!(!cur.is_compatible_with(&req));
    }

    #[test]
    fn semver_incompatible_lower_patch() {
        let cur = SemVer::parse("1.2.2").unwrap();
        let req = SemVer::parse("1.2.5").unwrap();
        assert!(!cur.is_compatible_with(&req));
    }

    #[test]
    fn semver_breaking_major() {
        let a = SemVer::parse("1.9.9").unwrap();
        let b = SemVer::parse("2.0.0").unwrap();
        assert!(b.is_major_breaking_from(&a)); // 2.x vs 1.x：major 变更 → breaking
        assert!(a.is_major_breaking_from(&b)); // 1.x vs 2.x：major 变更也视为 breaking（不兼容）
    }

    // ---------- parse_dependency_spec ----------

    #[test]
    fn dep_spec_with_min_and_max() {
        let (n, min, max) = parse_dependency_spec("analytics@>=1.2,<2.0").unwrap();
        assert_eq!(n, "analytics");
        assert_eq!(min, SemVer::parse("1.2").unwrap());
        assert_eq!(max, Some(SemVer::parse("2.0").unwrap()));
    }

    #[test]
    fn dep_spec_min_only() {
        let (n, min, max) = parse_dependency_spec("auth@>=1.0").unwrap();
        assert_eq!(n, "auth");
        assert_eq!(min.major, 1);
        assert!(max.is_none());
    }

    #[test]
    fn dep_spec_invalid() {
        assert!(parse_dependency_spec("no-version").is_none());
        assert!(parse_dependency_spec("@>=1.0").is_none());
        assert!(parse_dependency_spec("x@=1.0").is_none());
    }

    // ---------- DAG 环检测 / 拓扑排序 ----------

    fn build_graph<'a>(edges: &[(&'a str, &[&'a str])]) -> DepGraph<'a> {
        let mut g: DepGraph<'a> = HashMap::new();
        for (n, deps) in edges {
            let mut s = HashSet::new();
            for d in *deps {
                s.insert(*d);
            }
            g.insert(*n, s);
        }
        g
    }

    #[test]
    fn dag_no_cycle_returns_none() {
        let g = build_graph(&[("a", &["b", "c"]), ("b", &["c"]), ("c", &[])]);
        assert!(detect_cycle(&g).is_none());
    }

    #[test]
    fn dag_has_cycle_returns_some() {
        let g = build_graph(&[("a", &["b"]), ("b", &["c"]), ("c", &["a"])]);
        assert!(detect_cycle(&g).is_some());
    }

    #[test]
    fn dag_self_loop_cycle() {
        let g = build_graph(&[("a", &["a"])]);
        assert!(detect_cycle(&g).is_some());
    }

    #[test]
    fn dag_topological_order_exists() {
        let g = build_graph(&[("a", &["b", "c"]), ("b", &["c"]), ("c", &[])]);
        let topo = topological_sort(&g).expect("topo");
        let idx: HashMap<&str, usize> = topo
            .iter()
            .enumerate()
            .map(|(i, s)| (s.as_str(), i))
            .collect();
        // c 在 b 前，b 在 a 前
        assert!(idx["c"] < idx["b"]);
        assert!(idx["b"] < idx["a"]);
    }

    #[test]
    fn dag_topological_cycle_none() {
        let g = build_graph(&[("x", &["y"]), ("y", &["x"])]);
        assert!(topological_sort(&g).is_none());
    }

    #[test]
    fn dag_topological_empty() {
        let g = DepGraph::new();
        let r = topological_sort(&g).unwrap();
        assert!(r.is_empty());
    }

    // ---------- FSM transitions ----------

    #[test]
    fn fsm_draft_to_submitted_via_submit() {
        assert_eq!(transition(Draft, Submit), Some(Submitted));
    }

    #[test]
    fn fsm_approved_via_approve_then_published() {
        let s = transition(Submitted, Approve).unwrap();
        assert_eq!(s, Approved);
        assert_eq!(transition(s, Publish), Some(Published));
    }

    #[test]
    fn fsm_rejected_can_resubmit() {
        let s = transition(Submitted, Reject).unwrap();
        assert_eq!(s, Rejected);
        assert_eq!(transition(s, Submit), Some(Submitted));
    }

    #[test]
    fn fsm_tenant_install_enable_flow() {
        let s1 = transition(Published, Install).unwrap();
        assert_eq!(s1, Installed);
        let s2 = transition(s1, Enable).unwrap();
        assert_eq!(s2, Enabled);
        let s3 = transition(s2, Disable).unwrap();
        assert_eq!(s3, Disabled);
        let s4 = transition(s3, Uninstall).unwrap();
        assert_eq!(s4, Unpublished);
    }

    #[test]
    fn fsm_upgrade_path_from_enabled() {
        let s = transition(Enabled, BeginUpgrade).unwrap();
        assert_eq!(s, Upgrading);
        assert_eq!(transition(s, FinishUpgrade), Some(Enabled));
    }

    #[test]
    fn fsm_upgrade_fail_then_reset() {
        let s = transition(Enabled, BeginUpgrade).unwrap();
        let s = transition(s, Fail).unwrap();
        assert_eq!(s, Error);
        assert_eq!(transition(s, Reset), Some(Disabled));
    }

    #[test]
    fn fsm_invalid_transitions_none() {
        // Draft cannot publish directly
        assert!(transition(Draft, Publish).is_none());
        // Installed cannot approve
        assert!(transition(Installed, Approve).is_none());
        // Error cannot publish
        assert!(transition(Error, Publish).is_none());
    }

    #[test]
    fn fsm_published_toggle() {
        let s = transition(Published, Unpublish).unwrap();
        assert_eq!(s, Unpublished);
        assert_eq!(transition(s, Publish), Some(Published));
    }

    #[test]
    fn fsm_lifecycle_all_variants_serde_roundtrip() {
        use PluginLifecycle::*;
        for v in [
            Draft,
            Submitted,
            Approved,
            Rejected,
            Published,
            Unpublished,
            Installed,
            Enabled,
            Disabled,
            Upgrading,
            Error,
        ] {
            let j = serde_json::to_string(&v).unwrap();
            let d: PluginLifecycle = serde_json::from_str(&j).unwrap();
            assert_eq!(d, v);
        }
    }

    // ---------- PluginRole permissions ----------

    #[test]
    fn role_all_can_view_market() {
        for r in [
            PluginRole::Viewer,
            PluginRole::User,
            PluginRole::Publisher,
            PluginRole::Moderator,
            PluginRole::Admin,
        ] {
            assert!(r.can("view_market"));
        }
    }

    #[test]
    fn role_viewer_cannot_install() {
        assert!(!PluginRole::Viewer.can("install_plugin"));
        assert!(!PluginRole::Viewer.can("rate_review"));
    }

    #[test]
    fn role_user_basic_ops() {
        let r = PluginRole::User;
        assert!(r.can("install_plugin"));
        assert!(r.can("uninstall_plugin"));
        assert!(r.can("rate_review"));
        assert!(!r.can("upload_version"));
        assert!(!r.can("approve_plugin"));
    }

    #[test]
    fn role_publisher_uploads_and_replies() {
        let r = PluginRole::Publisher;
        assert!(r.can("upload_version"));
        assert!(r.can("reply_review"));
        assert!(!r.can("approve_plugin"));
        assert!(!r.can("manage_roles"));
    }

    #[test]
    fn role_moderator_can_moderate() {
        let r = PluginRole::Moderator;
        assert!(r.can("approve_plugin"));
        assert!(r.can("reject_plugin"));
        assert!(r.can("unpublish_any"));
        assert!(!r.can("manage_roles"));
    }

    #[test]
    fn role_admin_can_anything() {
        let r = PluginRole::Admin;
        assert!(r.can("approve_plugin"));
        assert!(r.can("manage_roles"));
        assert!(r.can("unpublish_any"));
        assert!(r.can("upload_version"));
    }

    #[test]
    fn role_unknown_action_returns_false() {
        assert!(!PluginRole::User.can("nonexistent_action"));
    }

    #[test]
    fn role_all_variants_serde_roundtrip() {
        for r in [
            PluginRole::Viewer,
            PluginRole::User,
            PluginRole::Publisher,
            PluginRole::Moderator,
            PluginRole::Admin,
        ] {
            let j = serde_json::to_string(&r).unwrap();
            let d: PluginRole = serde_json::from_str(&j).unwrap();
            assert_eq!(d, r);
        }
    }

    // ---------- slugify & plugin_code ----------

    #[test]
    fn slugify_basic() {
        assert_eq!(slugify("Hello World"), "hello-world");
    }

    #[test]
    fn slugify_special_chars_collapsed() {
        assert_eq!(slugify("My   Plugin~!@#v2"), "my-plugin-v2");
    }

    #[test]
    fn slugify_empty_or_only_dashes() {
        assert_eq!(slugify(""), "plugin");
        assert_eq!(slugify("---"), "plugin");
    }

    #[test]
    fn validate_code_ok() {
        assert!(validate_plugin_code("my-plugin"));
        assert!(validate_plugin_code("auth-v2"));
        assert!(validate_plugin_code("p123"));
    }

    #[test]
    fn validate_code_bad() {
        assert!(!validate_plugin_code(""));
        assert!(!validate_plugin_code("ab")); // too short
        assert!(!validate_plugin_code(&format!("x{}", "a".repeat(40)))); // too long
        assert!(!validate_plugin_code("-bad"));
        assert!(!validate_plugin_code("bad-"));
        assert!(!validate_plugin_code("Bad-UPPER"));
        assert!(!validate_plugin_code("under_score"));
    }

    // ---------- PluginInfo / VersionRelease / RegistryStats roundtrip ----------

    #[test]
    fn plugin_info_serde_roundtrip() {
        let info = PluginInfo {
            code: "auth-v2".to_string(),
            name: "Auth SSO".to_string(),
            version: "1.0.0".to_string(),
            plugin_type: "iam".to_string(),
            lifecycle: PluginLifecycle::Published,
            dependencies: vec!["core@>=1.0".to_string(), "audit@>=1.0".to_string()],
            tags: vec!["sso".into(), "oidc".into()],
            author: "topems".into(),
        };
        let j = serde_json::to_string(&info).unwrap();
        let d: PluginInfo = serde_json::from_str(&j).unwrap();
        assert_eq!(d, info);
    }

    #[test]
    fn version_release_roundtrip_with_notes() {
        let v = VersionRelease {
            code: "analytics".to_string(),
            version: "2.1.0".to_string(),
            release_notes: Some("- Bug fixes\n- New dashboard".to_string()),
            is_stable: true,
            min_app_version: Some("227.0.0".to_string()),
        };
        let j = serde_json::to_string(&v).unwrap();
        let d: VersionRelease = serde_json::from_str(&j).unwrap();
        assert_eq!(d, v);
    }

    #[test]
    fn version_release_roundtrip_minimal() {
        let v = VersionRelease {
            code: "s".to_string(),
            version: "0.0.1".to_string(),
            release_notes: None,
            is_stable: false,
            min_app_version: None,
        };
        let j = serde_json::to_string(&v).unwrap();
        let d: VersionRelease = serde_json::from_str(&j).unwrap();
        assert_eq!(d, v);
    }

    #[test]
    fn registry_stats_roundtrip() {
        let mut by_cat = HashMap::new();
        by_cat.insert("IAM".to_string(), 12);
        by_cat.insert("Doc".to_string(), 30);
        let s = RegistryStats {
            total_plugins: 100,
            total_installs: 50_000,
            avg_rating: 4.73,
            by_category: by_cat,
        };
        let j = serde_json::to_string(&s).unwrap();
        let d: RegistryStats = serde_json::from_str(&j).unwrap();
        assert_eq!(d.total_plugins, 100);
        assert_eq!(d.total_installs, 50_000);
        assert!((d.avg_rating - 4.73).abs() < 1e-9);
        assert_eq!(d.by_category.get("IAM"), Some(&12));
    }
}
