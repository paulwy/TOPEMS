    use super::*;
    use crate::modules::graphql_cache::CacheTier;

    fn roundtrip<T: serde::Serialize + for<'d> serde::Deserialize<'d>>(value: &T) -> bool {
        let json = serde_json::to_value(value).unwrap();
        let back: T = serde_json::from_value(json.clone()).unwrap();
        let json2 = serde_json::to_value(&back).unwrap();
        json == json2
    }

    fn j(v: &str) -> serde_json::Value {
        serde_json::from_str(v).unwrap()
    }

    // ===== 23 enum roundtrip =====

    #[test]
    fn enum_rt_discovery_status() {
        for v in [
            DiscoveryStatus::New,
            DiscoveryStatus::UnderReview,
            DiscoveryStatus::Approved,
            DiscoveryStatus::Rejected,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_user_role() {
        for v in [
            UserRole::Admin,
            UserRole::Manager,
            UserRole::Accountant,
            UserRole::SalesPerson,
            UserRole::Viewer,
            UserRole::Custom("x".into()),
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_mask_type() {
        for v in [
            MaskType::Full,
            MaskType::Partial,
            MaskType::Hash,
            MaskType::Truncate,
            MaskType::Null,
            MaskType::Range,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_optimization_category() {
        for v in [
            OptimizationCategory::NPlusOne,
            OptimizationCategory::Overfetching,
            OptimizationCategory::Caching,
            OptimizationCategory::Complexity,
            OptimizationCategory::Security,
            OptimizationCategory::Maintainability,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_severity_level() {
        for v in [
            SeverityLevel::Critical,
            SeverityLevel::Warning,
            SeverityLevel::Info,
            SeverityLevel::Low,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_filter_operator() {
        for v in [
            FilterOperator::Eq,
            FilterOperator::Ne,
            FilterOperator::Gt,
            FilterOperator::Lt,
            FilterOperator::Gte,
            FilterOperator::Lte,
            FilterOperator::Contains,
            FilterOperator::In,
            FilterOperator::NotIn,
            FilterOperator::Regex,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_update_type() {
        for v in [
            UpdateType::Created,
            UpdateType::Updated,
            UpdateType::Deleted,
            UpdateType::Delta,
            UpdateType::Full,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_span_type() {
        for v in [
            SpanType::Parse,
            SpanType::Validate,
            SpanType::Resolve,
            SpanType::CacheCheck,
            SpanType::DataFetch,
            SpanType::ExternalCall,
            SpanType::DBQuery,
            SpanType::Transform,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_alert_level() {
        for v in [
            AlertLevel::Info,
            AlertLevel::Warning,
            AlertLevel::Critical,
            AlertLevel::Emergency,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_alert_type() {
        for v in [
            AlertType::HighLatency,
            AlertType::HighErrorRate,
            AlertType::LowCacheHit,
            AlertType::HighQPS,
            AlertType::SubscriptionError,
            AlertType::ServiceDown,
            AlertType::SecurityBreach,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_stream_update_type_gql() {
        for v in [
            StreamUpdateTypeGql::Insert,
            StreamUpdateTypeGql::Update,
            StreamUpdateTypeGql::Delete,
            StreamUpdateTypeGql::Sync,
            StreamUpdateTypeGql::Snapshot,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_update_operation_gql() {
        for v in [
            UpdateOperationGql::Set,
            UpdateOperationGql::Add,
            UpdateOperationGql::Remove,
            UpdateOperationGql::Move,
            UpdateOperationGql::Merge,
            UpdateOperationGql::Replace,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_sync_state_gql() {
        for v in [
            SyncStateGql::InSync,
            SyncStateGql::Syncing,
            SyncStateGql::Conflict,
            SyncStateGql::Error,
            SyncStateGql::Offline,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_conflict_resolution_strategy_gql() {
        for v in [
            ConflictResolutionStrategyGql::ServerWins,
            ConflictResolutionStrategyGql::ClientWins,
            ConflictResolutionStrategyGql::LastWriteWins,
            ConflictResolutionStrategyGql::Manual,
            ConflictResolutionStrategyGql::Merge,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_verification_factor_gql() {
        for v in [
            VerificationFactorGql::Password,
            VerificationFactorGql::MFA,
            VerificationFactorGql::Biometric,
            VerificationFactorGql::DeviceCertificate,
            VerificationFactorGql::IPAllowlist,
            VerificationFactorGql::GeoFence,
            VerificationFactorGql::TimeWindow,
            VerificationFactorGql::Behavioral,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_signature_algorithm_gql() {
        for v in [
            SignatureAlgorithmGql::HMACSHA256,
            SignatureAlgorithmGql::HMACSHA384,
            SignatureAlgorithmGql::HMACSHA512,
            SignatureAlgorithmGql::Ed25519,
            SignatureAlgorithmGql::RS256,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_rejection_reason_gql() {
        for v in [
            RejectionReasonGql::InvalidSignature,
            RejectionReasonGql::ExpiredTimestamp,
            RejectionReasonGql::ReplayedNonce,
            RejectionReasonGql::UnknownKey,
            RejectionReasonGql::MissingSignature,
            RejectionReasonGql::AlgorithmMismatch,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_principal_type_gql() {
        for v in [
            PrincipalTypeGql::User,
            PrincipalTypeGql::Role,
            PrincipalTypeGql::Group,
            PrincipalTypeGql::ServiceAccount,
            PrincipalTypeGql::Department,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_mask_strategy_gql() {
        for v in [
            MaskStrategyGql::None,
            MaskStrategyGql::Partial,
            MaskStrategyGql::Hash,
            MaskStrategyGql::Encrypt,
            MaskStrategyGql::Redact,
            MaskStrategyGql::Custom,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_compression_algorithm_gql() {
        for v in [
            CompressionAlgorithmGql::None,
            CompressionAlgorithmGql::Gzip,
            CompressionAlgorithmGql::Brotli,
            CompressionAlgorithmGql::Zstd,
            CompressionAlgorithmGql::LZ4,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_offline_strategy_gql() {
        for v in [
            OfflineStrategyGql::CacheFirst,
            OfflineStrategyGql::NetworkFirst,
            OfflineStrategyGql::CacheOnly,
            OfflineStrategyGql::NetworkOnly,
            OfflineStrategyGql::StaleWhileRevalidate,
            OfflineStrategyGql::StaleAndUpdate,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_offline_conflict_resolution_strategy_gql() {
        for v in [
            OfflineConflictResolutionStrategyGql::ServerWins,
            OfflineConflictResolutionStrategyGql::ClientWins,
            OfflineConflictResolutionStrategyGql::Merge,
            OfflineConflictResolutionStrategyGql::Manual,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn enum_rt_mutation_status_gql() {
        for v in [
            MutationStatusGql::Pending,
            MutationStatusGql::Syncing,
            MutationStatusGql::Synced,
            MutationStatusGql::Failed,
            MutationStatusGql::Conflict,
        ] {
            assert!(roundtrip(&v));
        }
    }

    // ===== enum as_str =====

    #[test]
    fn enum_as_str_discovery_status() {
        assert_eq!(DiscoveryStatus::New.as_str(), "new");
        assert_eq!(DiscoveryStatus::Approved.as_str(), "approved");
        assert_eq!(DiscoveryStatus::UnderReview.as_str(), "under_review");
    }
    #[test]
    fn enum_as_str_user_role() {
        assert_eq!(UserRole::Admin.as_str(), "admin");
        assert_eq!(
            UserRole::Custom("custom_role".into()).as_str(),
            "custom_role"
        );
    }
    #[test]
    fn enum_as_str_mask_type() {
        assert_eq!(MaskType::Full.as_str(), "full");
        assert_eq!(MaskType::Hash.as_str(), "hash");
    }
    #[test]
    fn enum_as_str_optimization_category() {
        assert_eq!(OptimizationCategory::NPlusOne.as_str(), "n_plus_one");
    }
    #[test]
    fn enum_as_str_severity_level() {
        assert_eq!(SeverityLevel::Critical.as_str(), "critical");
        assert_eq!(SeverityLevel::Low.as_str(), "low");
    }
    #[test]
    fn enum_as_str_alert_level() {
        assert_eq!(AlertLevel::Info.as_str(), "info");
        assert_eq!(AlertLevel::Emergency.as_str(), "emergency");
    }
    #[test]
    fn enum_as_str_alert_type() {
        assert_eq!(AlertType::HighLatency.as_str(), "high_latency");
    }
    #[test]
    fn enum_as_str_verification_factor_gql() {
        assert_eq!(VerificationFactorGql::Password.as_str(), "password");
    }
    #[test]
    fn enum_as_str_signature_algorithm_gql() {
        assert_eq!(SignatureAlgorithmGql::HMACSHA256.as_str(), "HMAC-SHA256");
        assert_eq!(SignatureAlgorithmGql::Ed25519.as_str(), "Ed25519");
    }
    #[test]
    fn enum_as_str_rejection_reason_gql() {
        assert_eq!(
            RejectionReasonGql::InvalidSignature.as_str(),
            "invalid_signature"
        );
    }
    #[test]
    fn enum_as_str_principal_type_gql() {
        assert_eq!(PrincipalTypeGql::User.as_str(), "user");
    }
    #[test]
    fn enum_as_str_mask_strategy_gql() {
        assert_eq!(MaskStrategyGql::None.as_str(), "none");
    }

    // ===== enum from_str =====

    #[test]
    fn enum_from_str_user_role() {
        assert_eq!(UserRole::from_str("admin"), UserRole::Admin);
        assert_eq!(UserRole::from_str("manager"), UserRole::Manager);
    }
    #[test]
    fn enum_from_str_mask_type() {
        assert_eq!(MaskType::from_str("full"), MaskType::Full);
        assert_eq!(MaskType::from_str("hash"), MaskType::Hash);
    }

    // ===== struct roundtrip (batch 1: SimpleObject Gql with String fields) =====

    #[test]
    fn struct_rt_master_data_event_gql() {
        assert!(roundtrip(&MasterDataEventGql {
            domain: "d".into(),
            action: "a".into(),
            master_data_id: "m".into(),
            source_service: "s".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_notification_event_gql() {
        assert!(roundtrip(&NotificationEventGql {
            id: "1".into(),
            user_id: "u".into(),
            title: "t".into(),
            content: "c".into(),
            notification_type: "info".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_workflow_task_event_gql() {
        assert!(roundtrip(&WorkflowTaskEventGql {
            task_id: "t".into(),
            assignee_id: "a".into(),
            instance_title: "i".into(),
            priority: "p".into(),
            status: "s".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_order_status_event_gql() {
        assert!(roundtrip(&OrderStatusEventGql {
            order_id: "o".into(),
            order_type: "t".into(),
            old_status: "os".into(),
            new_status: "ns".into(),
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_field_permission() {
        assert!(roundtrip(&FieldPermission {
            entity_type: "User".into(),
            field_name: "phone".into(),
            allowed_roles: vec!["admin".into()],
            denied_roles: vec![],
            condition: None,
        }));
    }
    #[test]
    fn struct_rt_masking_rule() {
        assert!(roundtrip(&MaskingRule {
            entity_type: "User".into(),
            field_name: "phone".into(),
            mask_type: MaskType::Partial,
            exempt_roles: vec!["admin".into()],
        }));
    }
    #[test]
    fn struct_rt_field_access_audit() {
        assert!(roundtrip(&FieldAccessAudit {
            id: "1".into(),
            timestamp: chrono::Utc::now(),
            user_id: None,
            user_roles: vec![],
            ip: None,
            entity_type: "User".into(),
            entity_id: None,
            field_name: "phone".into(),
            access_result: "allowed".into(),
            mask_type: None,
            query_hash: None,
        }));
    }
    #[test]
    fn struct_rt_field_change() {
        assert!(roundtrip(&FieldChange {
            field_name: "phone".into(),
            old_value: j("\"old\""),
            new_value: j("\"new\""),
            masked: false,
        }));
    }
    #[test]
    fn struct_rt_data_change_audit() {
        assert!(roundtrip(&DataChangeAudit {
            id: "1".into(),
            timestamp: chrono::Utc::now(),
            user_id: None,
            user_roles: vec![],
            entity_type: "User".into(),
            entity_id: "1".into(),
            operation: "update".into(),
            changed_fields: vec![],
            mutation_name: "m".into(),
            query_hash: None,
        }));
    }
    #[test]
    fn struct_rt_security_config() {
        assert!(roundtrip(&SecurityConfig {
            field_permissions_enabled: true,
            data_masking_enabled: true,
            field_audit_enabled: false,
            data_change_audit_enabled: false,
            default_deny: true,
            audit_sensitive_fields_only: true,
        }));
    }
    #[test]
    fn struct_rt_filter_condition() {
        assert!(roundtrip(&FilterCondition {
            field: "status".into(),
            operator: FilterOperator::Eq,
            value: j("\"active\""),
        }));
    }
    #[test]
    fn struct_rt_subscription_filter() {
        assert!(roundtrip(&SubscriptionFilter {
            include_fields: None,
            exclude_fields: None,
            conditions: None,
            deduplicate: true,
            dedup_key: None,
        }));
    }
    #[test]
    fn struct_rt_data_change_event() {
        assert!(roundtrip(&DataChangeEvent {
            entity_type: "User".into(),
            entity_id: "1".into(),
            update_type: UpdateType::Created,
            data: None,
            delta: None,
            version: 1,
            timestamp: "2025-01-01".into(),
            source: "svc".into(),
        }));
    }
    #[test]
    fn struct_rt_subscription_checkpoint() {
        assert!(roundtrip(&SubscriptionCheckpoint {
            subscription_id: "s1".into(),
            last_event_id: None,
            last_event_timestamp: None,
        }));
    }
    #[test]
    fn struct_rt_query_span_gql() {
        assert!(roundtrip(&QuerySpanGql {
            span_id: "sp1".into(),
            parent_span_id: None,
            name: "parse".into(),
            service: "gateway".into(),
            span_type: SpanType::Parse,
            start_time: "2025-01-01".into(),
            end_time: None,
            duration_ms: 1.0,
            attributes: j("{}"),
            status: "ok".into(),
            error_message: None,
        }));
    }
    #[test]
    fn struct_rt_query_trace_gql() {
        assert!(roundtrip(&QueryTraceGql {
            trace_id: "t1".into(),
            query_hash: None,
            operation_name: None,
            start_time: "2025-01-01".into(),
            end_time: None,
            duration_ms: 10.0,
            status: "ok".into(),
            spans: vec![],
            error_message: None,
            user_id: None,
            client_info: None,
        }));
    }
    #[test]
    fn struct_rt_graphql_alert_gql() {
        assert!(roundtrip(&GraphqlAlertGql {
            id: "a1".into(),
            alert_type: AlertType::HighLatency,
            level: AlertLevel::Warning,
            message: "slow".into(),
            value: 500.0,
            threshold: 100.0,
            started_at: chrono::Utc::now(),
            acknowledged: false,
            resolved: false,
            resolved_at: None,
            labels: j("{}"),
        }));
    }
    #[test]
    fn struct_rt_realtime_stream_update_gql() {
        assert!(roundtrip(&RealtimeStreamUpdateGql {
            update_id: "u1".into(),
            stream_type: StreamUpdateTypeGql::Insert,
            entity_type: "User".into(),
            entity_id: "1".into(),
            changed_fields: vec![],
            old_values: j("{}"),
            new_values: j("{}"),
            timestamp: "2025-01-01".into(),
            sequence_number: 1,
        }));
    }
    #[test]
    fn struct_rt_stream_snapshot_gql() {
        assert!(roundtrip(&StreamSnapshotGql {
            snapshot_id: "s1".into(),
            entity_type: "User".into(),
            sequence_number: 1,
            data: j("{}"),
            created_at: chrono::Utc::now(),
        }));
    }
    #[test]
    fn struct_rt_field_delta_gql() {
        assert!(roundtrip(&FieldDeltaGql {
            field_path: "phone".into(),
            operation: UpdateOperationGql::Set,
            old_value: j("\"old\""),
            new_value: j("\"new\""),
        }));
    }
    #[test]
    fn struct_rt_incremental_update_gql() {
        assert!(roundtrip(&IncrementalUpdateGql {
            update_id: "u1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            version: 2,
            delta: j("{}"),
            base_version: 1,
            timestamp: "2025-01-01".into(),
        }));
    }
    #[test]
    fn struct_rt_sync_conflict_gql() {
        assert!(roundtrip(&SyncConflictGql {
            conflict_id: "c1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            client_version: 1,
            server_version: 2,
            conflict_fields: vec!["phone".into()],
            resolution_strategy: ConflictResolutionStrategyGql::ServerWins,
        }));
    }
    #[test]
    fn struct_rt_sync_session_gql() {
        assert!(roundtrip(&SyncSessionGql {
            session_id: "s1".into(),
            client_id: "c".into(),
            last_sync_version: 0,
            current_version: 5,
            pending_updates: 2,
            sync_state: SyncStateGql::InSync,
            started_at: chrono::Utc::now(),
            last_sync_at: None,
        }));
    }
    #[test]
    fn struct_rt_risk_factor_gql() {
        assert!(roundtrip(&RiskFactorGql {
            factor_type: "geo".into(),
            severity: "low".into(),
            description: "ok".into(),
            weight: 1,
        }));
    }
    #[test]
    fn struct_rt_risk_score_gql() {
        assert!(roundtrip(&RiskScoreGql {
            total_score: 10,
            level: "low".into(),
            factors: vec![],
            assessed_at: "2025-01-01T00:00:00Z".parse::<chrono::DateTime<chrono::Utc>>().unwrap(),
        }));
    }
    #[test]
    fn struct_rt_zero_trust_policy_gql() {
        assert!(roundtrip(&ZeroTrustPolicyGql {
            policy_id: "p1".into(),
            name: "default".into(),
            required_trust_level: TrustLevelGql::MediumTrust,
            max_risk_score: 100,
            required_verification_factors: vec![],
            resource_patterns: vec![],
        }));
    }
    #[test]
    fn struct_rt_zero_trust_stats_gql() {
        assert!(roundtrip(&ZeroTrustStatsGql {
            total_assessments: 100,
            avg_risk_score: 15.0,
            by_trust_level: vec![],
            blocked_requests: 0,
            verification_challenges: 5,
        }));
    }
    #[test]
    fn struct_rt_signature_config_gql() {
        assert!(roundtrip(&SignatureConfigGql {
            algorithm: SignatureAlgorithmGql::HMACSHA256,
            key_id: "k1".into(),
            timestamp_window_seconds: 300,
            nonce_cache_size: 1000,
            require_signature: true,
        }));
    }
    #[test]
    fn struct_rt_signed_request_gql() {
        assert!(roundtrip(&SignedRequestGql {
            request_id: "r1".into(),
            signature: "sig".into(),
            timestamp: 1000000,
            nonce: "n1".into(),
            algorithm: SignatureAlgorithmGql::HMACSHA256,
            key_id: "k1".into(),
            body_hash: "h".into(),
        }));
    }
    #[test]
    fn struct_rt_key_info_gql() {
        assert!(roundtrip(&KeyInfoGql {
            key_id: "k1".into(),
            algorithm: SignatureAlgorithmGql::Ed25519,
            created_at: "2025-01-01T00:00:00Z".parse::<chrono::DateTime<chrono::Utc>>().unwrap(),
            revoked: false,
            revoked_at: None,
            sign_count: 100,
        }));
    }
    #[test]
    fn struct_rt_signature_stats_gql() {
        assert!(roundtrip(&SignatureStatsGql {
            total_verified: 1000,
            total_rejected: 10,
            rejection_reasons: vec![],
            avg_verify_time_ms: 1.5,
        }));
    }
    #[test]
    fn struct_rt_permission_condition_gql() {
        assert!(roundtrip(&PermissionConditionGql {
            field: "role".into(),
            operator: "eq".into(),
            value: "admin".into(),
        }));
    }
    #[test]
    fn struct_rt_data_field_permission_gql() {
        assert!(roundtrip(&DataFieldPermissionGql {
            field_name: "phone".into(),
            allowed_levels: vec!["read".into()],
            mask_strategy: MaskStrategyGql::Partial,
        }));
    }
    #[test]
    fn struct_rt_data_permission_gql() {
        assert!(roundtrip(&DataPermissionGql {
            permission_id: "p1".into(),
            resource_type: "User".into(),
            resource_id: None,
            principal_type: PrincipalTypeGql::User,
            principal_id: "u1".into(),
            permission_level: PermissionLevelGql::Read,
            conditions: vec![],
            field_permissions: vec![],
            granted_by: "admin".into(),
            granted_at: "2025-01-01T00:00:00Z".parse::<chrono::DateTime<chrono::Utc>>().unwrap(),
            expires_at: None,
        }));
    }
    #[test]
    fn struct_rt_permission_audit_log_gql() {
        assert!(roundtrip(&PermissionAuditLogGql {
            action: "grant".into(),
            principal: "admin".into(),
            resource: "User:1".into(),
            permission_level: "read".into(),
            timestamp: "2025-01-01".into(),
            result: "ok".into(),
        }));
    }
    #[test]
    fn struct_rt_data_permission_stats_gql() {
        assert!(roundtrip(&DataPermissionStatsGql {
            total_permissions: 50,
            by_principal_type: vec![],
            by_permission_level: vec![],
            audit_logs: 1000,
            masked_fields: 10,
        }));
    }
    #[test]
    fn struct_rt_query_signature_gql() {
        assert!(roundtrip(&QuerySignatureGql {
            operation_type: "query".into(),
            root_field: "users".into(),
            fields_hash: "fh".into(),
            arguments_hash: "ah".into(),
            directives_hash: "dh".into(),
        }));
    }
    #[test]
    fn struct_rt_semantic_cache_entry_gql() {
        assert!(roundtrip(&SemanticCacheEntryGql {
            cache_id: "c1".into(),
            query_hash: "qh".into(),
            query_signature: QuerySignatureGql {
                operation_type: "query".into(),
                root_field: "users".into(),
                fields_hash: "fh".into(),
                arguments_hash: "ah".into(),
                directives_hash: "dh".into(),
            },
            normalized_query: "{ users { id } }".into(),
            result: "{}".into(),
            created_at: chrono::Utc::now(),
            ttl: 3600,
            hit_count: 100,
            last_accessed: "2025-01-01".into(),
            tags: vec![],
        }));
    }
    #[test]
    fn struct_rt_semantic_cache_config_gql() {
        assert!(roundtrip(&SemanticCacheConfigGql {
            max_entries: 1000,
            default_ttl_seconds: 3600,
            similarity_threshold: 0.9,
            enable_fuzzy_match: false,
            compression_enabled: true,
        }));
    }
    #[test]
    fn struct_rt_semantic_cache_invalidation_rule_gql() {
        assert!(roundtrip(&SemanticCacheInvalidationRuleGql {
            rule_id: "r1".into(),
            tag: "User".into(),
            query_pattern: "*User*".into(),
            priority: 1,
            enabled: true,
        }));
    }
    #[test]
    fn struct_rt_compression_config_gql() {
        assert!(roundtrip(&CompressionConfigGql {
            algorithm: CompressionAlgorithmGql::Gzip,
            level: 6,
            min_size_threshold: 1024,
            enable_deduplication: false,
            enable_delta_encoding: false,
        }));
    }
    #[test]
    fn struct_rt_compressed_result_gql() {
        assert!(roundtrip(&CompressedResultGql {
            original_size: 1000,
            compressed_size: 400,
            compression_ratio: 0.4,
            algorithm: CompressionAlgorithmGql::Gzip,
            compressed_data: "abc".into(),
            metadata: "m".into(),
        }));
    }
    #[test]
    fn struct_rt_data_profile_gql() {
        assert!(roundtrip(&DataProfileGql {
            data_type: "object".into(),
            array_count: 10,
            object_count: 5,
            string_ratio: 0.5,
            number_ratio: 0.3,
            null_ratio: 0.1,
            estimated_compressibility: 0.6,
        }));
    }
    #[test]
    fn struct_rt_offline_policy_gql() {
        assert!(roundtrip(&OfflinePolicyGql {
            strategy: OfflineStrategyGql::CacheFirst,
            max_stale_time_seconds: 300,
            background_sync_enabled: true,
            conflict_resolution: OfflineConflictResolutionStrategyGql::ServerWins,
            fallback_data: None,
        }));
    }
    #[test]
    fn struct_rt_offline_mutation_gql() {
        assert!(roundtrip(&OfflineMutationGql {
            mutation_id: "m1".into(),
            operation: "mutation".into(),
            variables: "{}".into(),
            status: MutationStatusGql::Pending,
            created_at: chrono::Utc::now(),
            synced_at: None,
            retry_count: 0,
            error: None,
        }));
    }

    // ===== 剩余 10 个未覆盖的 derive roundtrip =====

    #[test]
    fn enum_rt_cache_tier() {
        for v in [
            CacheTier::None,
            CacheTier::ShortLived,
            CacheTier::MediumLived,
            CacheTier::LongLived,
        ] {
            assert!(roundtrip(&v));
        }
    }
    #[test]
    fn struct_rt_realtime_stream_update_data() {
        assert!(roundtrip(&RealtimeStreamUpdateData {
            update_id: "u1".into(),
            stream_type: StreamUpdateTypeGql::Insert,
            entity_type: "User".into(),
            entity_id: "1".into(),
            changed_fields: vec![],
            old_values: j("{}"),
            new_values: j("{}"),
            timestamp: chrono::Utc::now(),
            sequence_number: 1,
        }));
    }
    #[test]
    fn struct_rt_stream_snapshot_data() {
        assert!(roundtrip(&StreamSnapshotData {
            snapshot_id: "s1".into(),
            entity_type: "User".into(),
            sequence_number: 1,
            data: j("{}"),
            created_at: chrono::Utc::now(),
        }));
    }
    #[test]
    fn struct_rt_incremental_update_data() {
        assert!(roundtrip(&IncrementalUpdateData {
            update_id: "u1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            version: 2,
            delta: j("{}"),
            base_version: 1,
            timestamp: chrono::Utc::now(),
            applied: true,
            valid: true,
        }));
    }
    #[test]
    fn struct_rt_sync_session_data() {
        assert!(roundtrip(&SyncSessionData {
            session_id: "s1".into(),
            client_id: "c".into(),
            last_sync_version: 0,
            current_version: 5,
            pending_updates: 2,
            sync_state: SyncStateGql::InSync,
            started_at: chrono::Utc::now(),
            last_sync_at: None,
        }));
    }
    #[test]
    fn struct_rt_sync_conflict_data() {
        assert!(roundtrip(&SyncConflictData {
            conflict_id: "c1".into(),
            entity_type: "User".into(),
            entity_id: "1".into(),
            client_version: 1,
            server_version: 2,
            conflict_fields: vec![],
            resolution_strategy: ConflictResolutionStrategyGql::ServerWins,
            resolved: false,
        }));
    }
    #[test]
    fn struct_rt_trust_context_gql() {
        assert!(roundtrip(&TrustContextGql {
            client_id: "c".into(),
            user_id: None,
            device_id: None,
            ip_address: "127.0.0.1".into(),
            geo_location: None,
            device_fingerprint: None,
            trust_level: TrustLevelGql::MediumTrust,
            risk_score: 10,
            verification_factors: vec![],
            assessed_at: "2025-01-01T00:00:00Z".parse::<chrono::DateTime<chrono::Utc>>().unwrap(),
        }));
    }
    #[test]
    fn struct_rt_risk_factor() {
        assert!(roundtrip(&RiskFactor {
            factor_type: "geo".into(),
            severity: "low".into(),
            description: "ok".into(),
            weight: 1,
        }));
    }
    #[test]
    fn struct_rt_permission_condition() {
        assert!(roundtrip(&PermissionCondition {
            field: "role".into(),
            operator: "eq".into(),
            value: "admin".into(),
        }));
    }
    #[test]
    fn struct_rt_offline_mutation_data() {
        assert!(roundtrip(&OfflineMutationData {
            mutation_id: "m1".into(),
            operation: "mutation".into(),
            variables: "{}".into(),
            status: MutationStatusGql::Pending,
            created_at: chrono::Utc::now(),
            synced_at: None,
            retry_count: 0,
            error: None,
        }));
    }
