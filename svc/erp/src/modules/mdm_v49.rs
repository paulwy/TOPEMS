//! V49.0 MDM AC-21: 主数据全生命周期自动化
//! V49.0 MDM AC-22: 主数据退役管理
//! V49.0 MDM AC-23: 主数据归档策略
//!
//! 核心能力：
//! - 生命周期阶段自动化：需求 → 设计 → 开发 → 测试 → 上线 → 运维 → 退役 → 归档
//! - 阶段任务编排：每个阶段支持任务清单、审批、SLA、自动推进
//! - 退役（Sunset）管理：退役计划、影响评估、通知、灰度下线、强制下线
//! - 归档策略：按域/实体/年龄分层归档、冷热分离、归档保留周期、归档索引
//! - 归档恢复：从归档恢复到活跃状态（带版本重建）
//! - 生命周期仪表盘：各阶段实体数、SLA 达成率、退役趋势、归档体量
//!
//! 设计风格：ApiResponse + LazyLock 内存存储（与 master_data_refs.rs 保持一致）

use super::ApiState;

#[path = "mdm_v49_archive.rs"]
mod mdm_v49_archive;
#[path = "mdm_v49_lifecycle.rs"]
mod mdm_v49_lifecycle;
#[path = "mdm_v49_retirement.rs"]
mod mdm_v49_retirement;
#[path = "mdm_v49_stats.rs"]
mod mdm_v49_stats;
#[path = "mdm_v49_types.rs"]
mod mdm_v49_types;

use mdm_v49_archive::*;
use mdm_v49_lifecycle::*;
use mdm_v49_retirement::*;
use mdm_v49_stats::*;

// ==================== 路由注册 ====================

pub fn create_routes() -> axum::Router<ApiState> {
    use axum::routing::{get, post};
    axum::Router::new()
        // V49 AC-21: 生命周期实体
        .route(
            "/api/erp/mdm-v49/lifecycle/entities",
            get(list_lifecycle_entities).post(create_lifecycle_entity),
        )
        .route(
            "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}",
            get(get_lifecycle_entity).post(transition_lifecycle_stage),
        )
        .route(
            "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/tasks/{task_id}",
            post(update_lifecycle_task),
        )
        .route(
            "/api/erp/mdm-v49/lifecycle/entities/{master_data_id}/events",
            get(get_lifecycle_events),
        )
        // V49 AC-22: 退役管理
        .route(
            "/api/erp/mdm-v49/retirement/plans",
            get(list_retirement_plans).post(create_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}",
            get(get_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/assess",
            post(assess_impact),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/notify",
            post(notify_stakeholders),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/confirm",
            post(confirm_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/execute",
            post(execute_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/rollback",
            post(rollback_retirement_plan),
        )
        .route(
            "/api/erp/mdm-v49/retirement/plans/{plan_id}/cancel",
            post(cancel_retirement_plan),
        )
        // V49 AC-23: 归档策略
        .route(
            "/api/erp/mdm-v49/archive/policies",
            get(list_archive_policies).post(create_archive_policy),
        )
        .route(
            "/api/erp/mdm-v49/archive/policies/{policy_id}",
            get(get_archive_policy)
                .put(update_archive_policy)
                .delete(delete_archive_policy),
        )
        .route(
            "/api/erp/mdm-v49/archive/records",
            get(list_archive_records),
        )
        .route(
            "/api/erp/mdm-v49/archive/records/{record_id}",
            get(get_archive_record),
        )
        .route(
            "/api/erp/mdm-v49/archive/records/{record_id}/restore",
            post(restore_archive_record),
        )
        .route("/api/erp/mdm-v49/archive/run", post(run_archive))
        // 统计仪表盘
        .route("/api/erp/mdm-v49/stats/lifecycle", get(get_lifecycle_stats))
        .route("/api/erp/mdm-v49/stats/archive", get(get_archive_stats))
        .route(
            "/api/erp/mdm-v49/stats/retirement",
            get(get_retirement_stats),
        )
        .route("/api/erp/mdm-v49/sla/check", post(run_sla_check))
        .route("/api/erp/mdm-v49/dashboard", get(get_lifecycle_dashboard))
}

#[cfg(test)]
mod tests {

    // types 模块定义了 LifecycleStage/TaskStatus 等类型，
    // 父模块未导入，需在测试模块内显式引入（否则 `use super::*` 无法访问）
    use super::mdm_v49_types::*;

    // --- LifecycleStage::as_str ---
    #[test]
    fn test_lifecycle_stage_as_str_all_variants() {
        assert_eq!(LifecycleStage::Proposed.as_str(), "proposed");
        assert_eq!(LifecycleStage::Designed.as_str(), "designed");
        assert_eq!(LifecycleStage::InDevelopment.as_str(), "in_development");
        assert_eq!(LifecycleStage::Testing.as_str(), "testing");
        assert_eq!(LifecycleStage::Released.as_str(), "released");
        assert_eq!(LifecycleStage::Operative.as_str(), "operative");
        assert_eq!(LifecycleStage::Sunset.as_str(), "sunset");
        assert_eq!(LifecycleStage::Archived.as_str(), "archived");
        assert_eq!(LifecycleStage::Destroyed.as_str(), "destroyed");
    }

    // --- LifecycleStage::from_str ---
    #[test]
    fn test_lifecycle_stage_from_str_known() {
        assert_eq!(
            LifecycleStage::from_str("proposed"),
            LifecycleStage::Proposed
        );
        assert_eq!(
            LifecycleStage::from_str("designed"),
            LifecycleStage::Designed
        );
        assert_eq!(
            LifecycleStage::from_str("in_development"),
            LifecycleStage::InDevelopment
        );
        assert_eq!(LifecycleStage::from_str("testing"), LifecycleStage::Testing);
        assert_eq!(
            LifecycleStage::from_str("released"),
            LifecycleStage::Released
        );
        assert_eq!(
            LifecycleStage::from_str("operative"),
            LifecycleStage::Operative
        );
        assert_eq!(LifecycleStage::from_str("sunset"), LifecycleStage::Sunset);
        assert_eq!(
            LifecycleStage::from_str("archived"),
            LifecycleStage::Archived
        );
        assert_eq!(
            LifecycleStage::from_str("destroyed"),
            LifecycleStage::Destroyed
        );
    }

    #[test]
    fn test_lifecycle_stage_from_str_unknown_defaults_to_proposed() {
        assert_eq!(
            LifecycleStage::from_str("unknown"),
            LifecycleStage::Proposed
        );
        assert_eq!(LifecycleStage::from_str(""), LifecycleStage::Proposed);
        assert_eq!(
            LifecycleStage::from_str("PROPOSED"),
            LifecycleStage::Proposed
        );
    }

    #[test]
    fn test_lifecycle_stage_as_str_and_from_str_roundtrip() {
        for stage in LifecycleStage::all() {
            let s = stage.as_str();
            let back = LifecycleStage::from_str(s);
            assert_eq!(stage, back, "roundtrip failed for {:?}", stage);
        }
    }

    // --- LifecycleStage::order ---
    #[test]
    fn test_lifecycle_stage_order_monotonic() {
        let stages = LifecycleStage::all();
        for i in 0..stages.len() {
            assert_eq!(stages[i].order() as usize, i);
        }
    }

    #[test]
    fn test_lifecycle_stage_order_values() {
        assert_eq!(LifecycleStage::Proposed.order(), 0);
        assert_eq!(LifecycleStage::Designed.order(), 1);
        assert_eq!(LifecycleStage::InDevelopment.order(), 2);
        assert_eq!(LifecycleStage::Testing.order(), 3);
        assert_eq!(LifecycleStage::Released.order(), 4);
        assert_eq!(LifecycleStage::Operative.order(), 5);
        assert_eq!(LifecycleStage::Sunset.order(), 6);
        assert_eq!(LifecycleStage::Archived.order(), 7);
        assert_eq!(LifecycleStage::Destroyed.order(), 8);
    }

    // --- LifecycleStage::all ---
    #[test]
    fn test_lifecycle_stage_all_count() {
        let all = LifecycleStage::all();
        assert_eq!(all.len(), 9);
    }

    #[test]
    fn test_lifecycle_stage_all_bounds() {
        let all = LifecycleStage::all();
        assert_eq!(all[0], LifecycleStage::Proposed);
        assert_eq!(all[all.len() - 1], LifecycleStage::Destroyed);
    }

    // --- LifecycleStage equality/clone ---
    #[test]
    fn test_lifecycle_stage_clone_and_eq() {
        let s1 = LifecycleStage::Released;
        let s2 = s1.clone();
        assert_eq!(s1, s2);
    }

    // --- ArchiveTier::as_str ---
    #[test]
    fn test_archive_tier_as_str_all_variants() {
        assert_eq!(ArchiveTier::Hot.as_str(), "hot");
        assert_eq!(ArchiveTier::Warm.as_str(), "warm");
        assert_eq!(ArchiveTier::Cold.as_str(), "cold");
        assert_eq!(ArchiveTier::Glacier.as_str(), "glacier");
    }

    // --- ArchiveTier::access_days ---
    #[test]
    fn test_archive_tier_access_days() {
        assert_eq!(ArchiveTier::Hot.access_days(), 0);
        assert_eq!(ArchiveTier::Warm.access_days(), 3);
        assert_eq!(ArchiveTier::Cold.access_days(), 7);
        assert_eq!(ArchiveTier::Glacier.access_days(), 30);
    }

    #[test]
    fn test_archive_tier_access_days_monotonic() {
        assert!(ArchiveTier::Hot.access_days() <= ArchiveTier::Warm.access_days());
        assert!(ArchiveTier::Warm.access_days() <= ArchiveTier::Cold.access_days());
        assert!(ArchiveTier::Cold.access_days() <= ArchiveTier::Glacier.access_days());
    }

    // --- ArchiveTier::retention_default_days ---
    #[test]
    fn test_archive_tier_retention_default_days() {
        assert_eq!(ArchiveTier::Hot.retention_default_days(), 90);
        assert_eq!(ArchiveTier::Warm.retention_default_days(), 365);
        assert_eq!(ArchiveTier::Cold.retention_default_days(), 1095);
        assert_eq!(ArchiveTier::Glacier.retention_default_days(), 2555);
    }

    #[test]
    fn test_archive_tier_retention_increases_with_coldness() {
        assert!(
            ArchiveTier::Hot.retention_default_days() < ArchiveTier::Warm.retention_default_days()
        );
        assert!(
            ArchiveTier::Warm.retention_default_days() < ArchiveTier::Cold.retention_default_days()
        );
        assert!(
            ArchiveTier::Cold.retention_default_days()
                < ArchiveTier::Glacier.retention_default_days()
        );
    }

    // --- default_tasks_for ---
    #[test]
    fn test_default_tasks_for_proposed() {
        let tasks = default_tasks_for(&LifecycleStage::Proposed);
        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().all(|t| t.stage == LifecycleStage::Proposed));
        assert!(tasks[0].id.starts_with("task-proposed-"));
    }

    #[test]
    fn test_default_tasks_for_designed() {
        let tasks = default_tasks_for(&LifecycleStage::Designed);
        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().all(|t| t.stage == LifecycleStage::Designed));
    }

    #[test]
    fn test_default_tasks_for_in_development() {
        let tasks = default_tasks_for(&LifecycleStage::InDevelopment);
        assert_eq!(tasks.len(), 2);
        assert!(tasks
            .iter()
            .all(|t| t.stage == LifecycleStage::InDevelopment));
    }

    #[test]
    fn test_default_tasks_for_testing() {
        let tasks = default_tasks_for(&LifecycleStage::Testing);
        assert_eq!(tasks.len(), 2);
    }

    #[test]
    fn test_default_tasks_for_released_all_done() {
        let tasks = default_tasks_for(&LifecycleStage::Released);
        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().all(|t| t.status == TaskStatus::Done));
    }

    #[test]
    fn test_default_tasks_for_operative() {
        let tasks = default_tasks_for(&LifecycleStage::Operative);
        assert_eq!(tasks.len(), 2);
    }

    #[test]
    fn test_default_tasks_for_sunset() {
        let tasks = default_tasks_for(&LifecycleStage::Sunset);
        assert_eq!(tasks.len(), 3);
    }

    #[test]
    fn test_default_tasks_for_archived() {
        let tasks = default_tasks_for(&LifecycleStage::Archived);
        assert_eq!(tasks.len(), 2);
    }

    #[test]
    fn test_default_tasks_for_destroyed_all_done() {
        let tasks = default_tasks_for(&LifecycleStage::Destroyed);
        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().all(|t| t.status == TaskStatus::Done));
    }

    #[test]
    fn test_default_tasks_for_all_stages_have_unique_ids() {
        for stage in LifecycleStage::all() {
            let tasks = default_tasks_for(&stage);
            let mut ids: Vec<&str> = tasks.iter().map(|t| t.id.as_str()).collect();
            let total = ids.len();
            ids.sort();
            ids.dedup();
            assert_eq!(ids.len(), total, "duplicate ids for {:?}", stage);
        }
    }

    #[test]
    fn test_default_tasks_for_task_fields_populated() {
        let tasks = default_tasks_for(&LifecycleStage::Proposed);
        for t in &tasks {
            assert!(!t.name.is_empty());
            assert!(!t.description.is_empty());
            assert!(t.owner.is_none());
            assert!(t.due_at.is_none());
            assert!(t.completed_at.is_none());
            assert!(t.approved_by.is_none());
        }
    }

    // --- record_event ---
    #[test]
    fn test_record_event_appends_to_store() {
        let store = get_lifecycle_store();
        // 清空事件存储，避免测试之间的状态共享
        store.events.lock().map(|mut e| e.clear()).unwrap_or(());
        let before = store.events.lock().map(|e| e.len()).unwrap_or(0);

        record_event(
            "md-test-1".to_string(),
            "customer".to_string(),
            Some(LifecycleStage::Proposed),
            LifecycleStage::Designed,
            "design phase started".to_string(),
            "alice".to_string(),
            "user".to_string(),
            None,
        );

        let after = store.events.lock().map(|e| e.len()).unwrap_or(0);
        assert_eq!(after, before + 1);
    }

    #[test]
    fn test_record_event_stores_correct_data() {
        record_event(
            "md-test-2".to_string(),
            "supplier".to_string(),
            None,
            LifecycleStage::Released,
            "go-live".to_string(),
            "bob".to_string(),
            "system".to_string(),
            Some(serde_json::json!({"key": "value"})),
        );

        let store = get_lifecycle_store();
        let events = store.events.lock().unwrap();
        let last = events.last().unwrap();
        assert_eq!(last.master_data_id, "md-test-2");
        assert_eq!(last.entity_type, "supplier");
        assert_eq!(last.from_stage, None);
        assert_eq!(last.to_stage, LifecycleStage::Released);
        assert_eq!(last.reason, "go-live");
        assert_eq!(last.triggered_by, "bob");
        assert_eq!(last.triggered_by_type, "system");
        assert!(last.metadata.is_some());
        assert!(!last.id.is_empty());
        assert!(!last.created_at.is_empty());
    }

    // --- enum (de)serialization ---
    #[test]
    fn test_lifecycle_stage_serde_roundtrip() {
        for stage in LifecycleStage::all() {
            let json = serde_json::to_string(&stage).unwrap();
            let back: LifecycleStage = serde_json::from_str(&json).unwrap();
            assert_eq!(stage, back);
        }
    }

    #[test]
    fn test_archive_tier_serde_roundtrip() {
        let tiers = vec![
            ArchiveTier::Hot,
            ArchiveTier::Warm,
            ArchiveTier::Cold,
            ArchiveTier::Glacier,
        ];
        for tier in tiers {
            let json = serde_json::to_string(&tier).unwrap();
            let back: ArchiveTier = serde_json::from_str(&json).unwrap();
            assert_eq!(tier, back);
        }
    }

    #[test]
    fn test_retirement_status_serde_roundtrip() {
        let statuses = vec![
            RetirementStatus::Draft,
            RetirementStatus::ImpactAssessed,
            RetirementStatus::StakeholderNotified,
            RetirementStatus::Confirmed,
            RetirementStatus::Executing,
            RetirementStatus::Completed,
            RetirementStatus::RolledBack,
            RetirementStatus::Cancelled,
        ];
        for s in statuses {
            let json = serde_json::to_string(&s).unwrap();
            let back: RetirementStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(s, back);
        }
    }

    #[test]
    fn test_task_status_serde_roundtrip() {
        let statuses = vec![
            TaskStatus::Todo,
            TaskStatus::InProgress,
            TaskStatus::Blocked,
            TaskStatus::InReview,
            TaskStatus::Done,
        ];
        for s in statuses {
            let json = serde_json::to_string(&s).unwrap();
            let back: TaskStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(s, back);
        }
    }
}
