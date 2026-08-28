mod tests_disabled {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use crate::modules::master_data_conflict::MergeStrategy;
    use crate::modules::master_data_quality_rules::{QualityRuleType, QualitySeverity};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    // ============== ENUMS ==============

    #[test]
    fn rtu_enum_lifecycle_status() {
        roundtrip(&LifecycleStatus::Active);
        roundtrip(&LifecycleStatus::Archived);
        roundtrip(&LifecycleStatus::PendingDestruction);
        roundtrip(&LifecycleStatus::Destroyed);
    }

    #[test]
    fn rtu_enum_merge_strategy() {
        roundtrip(&MergeStrategy::LastWriteWins);
        roundtrip(&MergeStrategy::SourcePriority);
        roundtrip(&MergeStrategy::ManualReview);
    }

    #[test]
    fn rtu_enum_quality_rule_type() {
        roundtrip(&QualityRuleType::Required);
        roundtrip(&QualityRuleType::Format);
        roundtrip(&QualityRuleType::Range);
        roundtrip(&QualityRuleType::Uniqueness);
        roundtrip(&QualityRuleType::Reference);
        roundtrip(&QualityRuleType::Custom);
    }

    #[test]
    fn rtu_enum_quality_severity() {
        roundtrip(&QualitySeverity::Error);
        roundtrip(&QualitySeverity::Warning);
        roundtrip(&QualitySeverity::Info);
    }

    #[test]
    fn rtu_enum_sync_status() {
        roundtrip(&SyncStatus::Pending);
        roundtrip(&SyncStatus::Running);
        roundtrip(&SyncStatus::Completed);
        roundtrip(&SyncStatus::Failed);
        roundtrip(&SyncStatus::PartiallyFailed);
        roundtrip(&SyncStatus::Compensating);
        roundtrip(&SyncStatus::Compensated);
    }

    #[test]
    fn rtu_enum_quality_ticket_status() {
        roundtrip(&QualityTicketStatus::Open);
        roundtrip(&QualityTicketStatus::Assigned);
        roundtrip(&QualityTicketStatus::InProgress);
        roundtrip(&QualityTicketStatus::PendingReview);
        roundtrip(&QualityTicketStatus::Resolved);
        roundtrip(&QualityTicketStatus::Verified);
        roundtrip(&QualityTicketStatus::Closed);
        roundtrip(&QualityTicketStatus::Rejected);
    }

    #[test]
    fn rtu_enum_repair_strategy() {
        roundtrip(&RepairStrategy::AutoFix);
        roundtrip(&RepairStrategy::ManualFix);
        roundtrip(&RepairStrategy::Escalate);
        roundtrip(&RepairStrategy::Ignore);
    }

    #[test]
    fn rtu_enum_sync_job_priority() {
        roundtrip(&SyncJobPriority::High);
        roundtrip(&SyncJobPriority::Normal);
        roundtrip(&SyncJobPriority::Low);
    }

    #[test]
    fn rtu_enum_quality_risk_level() {
        roundtrip(&QualityRiskLevel::Low);
        roundtrip(&QualityRiskLevel::Medium);
        roundtrip(&QualityRiskLevel::High);
        roundtrip(&QualityRiskLevel::Critical);
    }

    #[test]
    fn rtu_enum_match_type() {
        roundtrip(&MatchType::Exact);
        roundtrip(&MatchType::Fuzzy);
        roundtrip(&MatchType::Phonetic);
        roundtrip(&MatchType::Abbreviation);
        roundtrip(&MatchType::Synonym);
        roundtrip(&MatchType::Partial);
    }

    #[test]
    fn rtu_enum_lineage_direction() {
        roundtrip(&LineageDirection::Upstream);
        roundtrip(&LineageDirection::Downstream);
        roundtrip(&LineageDirection::Both);
    }

    #[test]
    fn rtu_enum_lineage_relationship() {
        roundtrip(&LineageRelationship::References);
        roundtrip(&LineageRelationship::DependsOn);
        roundtrip(&LineageRelationship::Produces);
        roundtrip(&LineageRelationship::Consumes);
        roundtrip(&LineageRelationship::Transforms);
    }

    #[test]
    fn rtu_enum_impact_severity() {
        roundtrip(&ImpactSeverity::Critical);
        roundtrip(&ImpactSeverity::High);
        roundtrip(&ImpactSeverity::Medium);
        roundtrip(&ImpactSeverity::Low);
        roundtrip(&ImpactSeverity::None);
    }

    #[test]
    fn rtu_enum_change_type() {
        roundtrip(&ChangeType::SchemaChange);
        roundtrip(&ChangeType::DataChange);
        roundtrip(&ChangeType::BusinessRuleChange);
    }

    #[test]
    fn rtu_enum_graph_layout() {
        roundtrip(&GraphLayout::Hierarchical);
        roundtrip(&GraphLayout::ForceDirected);
        roundtrip(&GraphLayout::Circular);
        roundtrip(&GraphLayout::Radial);
    }

    #[test]
    fn rtu_enum_maturity_dimension() {
        roundtrip(&MaturityDimension::DataQuality);
        roundtrip(&MaturityDimension::DataGovernance);
        roundtrip(&MaturityDimension::DataStandards);
        roundtrip(&MaturityDimension::DataLifecycle);
        roundtrip(&MaturityDimension::DataSecurity);
        roundtrip(&MaturityDimension::DataIntegration);
        roundtrip(&MaturityDimension::DataStewardship);
        roundtrip(&MaturityDimension::DataArchitecture);
    }

    #[test]
    fn rtu_enum_maturity_level() {
        roundtrip(&MaturityLevel::Initial);
        roundtrip(&MaturityLevel::Developing);
        roundtrip(&MaturityLevel::Defined);
        roundtrip(&MaturityLevel::Managed);
        roundtrip(&MaturityLevel::Optimizing);
    }

    #[test]
    fn rtu_enum_catalog_classification() {
        roundtrip(&CatalogClassification::Public);
        roundtrip(&CatalogClassification::Internal);
        roundtrip(&CatalogClassification::Confidential);
        roundtrip(&CatalogClassification::Restricted);
    }

    #[test]
    fn rtu_enum_metadata_field_type() {
        roundtrip(&MetadataFieldType::String);
        roundtrip(&MetadataFieldType::Integer);
        roundtrip(&MetadataFieldType::Decimal);
        roundtrip(&MetadataFieldType::Boolean);
        roundtrip(&MetadataFieldType::Date);
        roundtrip(&MetadataFieldType::DateTime);
        roundtrip(&MetadataFieldType::Enum);
        roundtrip(&MetadataFieldType::Reference);
        roundtrip(&MetadataFieldType::Json);
        roundtrip(&MetadataFieldType::Binary);
    }

    #[test]
    fn rtu_enum_widget_type() {
        roundtrip(&WidgetType::KpiCard);
        roundtrip(&WidgetType::BarChart);
        roundtrip(&WidgetType::LineChart);
        roundtrip(&WidgetType::PieChart);
        roundtrip(&WidgetType::HeatMap);
        roundtrip(&WidgetType::DataTable);
        roundtrip(&WidgetType::Gauge);
        roundtrip(&WidgetType::TrendLine);
        roundtrip(&WidgetType::RadarChart);
        roundtrip(&WidgetType::TreeMap);
    }

    #[test]
    fn rtu_enum_kpi_status() {
        roundtrip(&KpiStatus::Good);
        roundtrip(&KpiStatus::Warning);
        roundtrip(&KpiStatus::Critical);
        roundtrip(&KpiStatus::Neutral);
    }

    #[test]
    fn rtu_enum_report_type() {
        roundtrip(&ReportType::QualityReport);
        roundtrip(&ReportType::MaturityReport);
        roundtrip(&ReportType::ComplianceReport);
        roundtrip(&ReportType::StewardshipReport);
        roundtrip(&ReportType::DataAssetReport);
        roundtrip(&ReportType::ExecutiveSummary);
    }

    #[test]
    fn rtu_enum_report_frequency() {
        roundtrip(&ReportFrequency::Daily);
        roundtrip(&ReportFrequency::Weekly);
        roundtrip(&ReportFrequency::Monthly);
        roundtrip(&ReportFrequency::Quarterly);
        roundtrip(&ReportFrequency::Yearly);
        roundtrip(&ReportFrequency::OnDemand);
    }

    #[test]
    fn rtu_enum_report_format() {
        roundtrip(&ReportFormat::PDF);
        roundtrip(&ReportFormat::Excel);
        roundtrip(&ReportFormat::HTML);
        roundtrip(&ReportFormat::JSON);
        roundtrip(&ReportFormat::Markdown);
    }

    #[test]
    fn rtu_enum_report_status() {
        roundtrip(&ReportStatus::Pending);
        roundtrip(&ReportStatus::Generating);
        roundtrip(&ReportStatus::Completed);
        roundtrip(&ReportStatus::Failed);
        roundtrip(&ReportStatus::Delivered);
    }

    #[test]
    fn rtu_enum_audit_framework() {
        roundtrip(&AuditFramework::GDPR);
        roundtrip(&AuditFramework::SOX);
        roundtrip(&AuditFramework::ISO27001);
        roundtrip(&AuditFramework::DataGovernance);
        roundtrip(&AuditFramework::InternalPolicy);
        roundtrip(&AuditFramework::Custom);
    }

    #[test]
    fn rtu_enum_compliance_status() {
        roundtrip(&ComplianceStatus::Compliant);
        roundtrip(&ComplianceStatus::NonCompliant);
        roundtrip(&ComplianceStatus::PartiallyCompliant);
        roundtrip(&ComplianceStatus::NotApplicable);
        roundtrip(&ComplianceStatus::PendingReview);
    }

    #[test]
    fn rtu_enum_finding_severity() {
        roundtrip(&FindingSeverity::Low);
        roundtrip(&FindingSeverity::Medium);
        roundtrip(&FindingSeverity::High);
        roundtrip(&FindingSeverity::Critical);
    }

    #[test]
    fn rtu_enum_finding_status() {
        roundtrip(&FindingStatus::Open);
        roundtrip(&FindingStatus::InProgress);
        roundtrip(&FindingStatus::Resolved);
        roundtrip(&FindingStatus::Accepted);
        roundtrip(&FindingStatus::FalsePositive);
    }

    // ============== STRUCTS (leaf) ==============

    #[test]
    fn rtu_struct_quality_issue() {
        roundtrip(&QualityIssue {
            rule_id: uuid::Uuid::new_v4(),
            rule_name: "x".to_string(),
            master_data_id: "x".to_string(),
            field_name: "x".to_string(),
            current_value: None,
            expected: "x".to_string(),
            severity: QualitySeverity::Error,
            suggestion: None,
        });
    }

    #[test]
    fn rtu_struct_ticket_history_entry() {
        roundtrip(&TicketHistoryEntry {
            action: "x".to_string(),
            actor: "x".to_string(),
            comment: None,
            timestamp: chrono::Utc::now(),
        });
    }

    #[test]
    fn rtu_struct_sync_step() {
        roundtrip(&SyncStep {
            id: "x".to_string(),
            step_name: "x".to_string(),
            target_system: "x".to_string(),
            status: SyncStatus::Pending,
            order: 0,
            retry_count: 0,
            max_retries: 0,
            started_at: None,
            completed_at: None,
            error_message: None,
            compensation_status: None,
        });
    }

    #[test]
    fn rtu_struct_sync_job() {
        roundtrip(&SyncJob {
            id: "x".to_string(),
            entity_type: "x".to_string(),
            entity_id: "x".to_string(),
            operation: "x".to_string(),
            status: SyncStatus::Pending,
            source_system: "x".to_string(),
            target_systems: vec![],
            steps: vec![],
            current_step: 0,
            retry_count: 0,
            max_retries: 0,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            completed_at: None,
            error_message: None,
        });
    }

    #[test]
    fn rtu_struct_compensation_action() {
        roundtrip(&CompensationAction {
            step_id: "x".to_string(),
            action: "x".to_string(),
            status: SyncStatus::Pending,
            executed_at: None,
        });
    }

    #[test]
    fn rtu_struct_dead_letter_entry() {
        roundtrip(&DeadLetterEntry {
            id: "x".to_string(),
            job_id: "x".to_string(),
            step_id: "x".to_string(),
            entity_type: "x".to_string(),
            operation: "x".to_string(),
            error_message: "x".to_string(),
            retry_count: 0,
            created_at: chrono::Utc::now(),
            last_retry_at: None,
        });
    }

    #[test]
    fn rtu_struct_quality_ticket() {
        roundtrip(&QualityTicket {
            id: "x".to_string(),
            issue_id: "x".to_string(),
            entity_type: "x".to_string(),
            entity_id: "x".to_string(),
            rule_id: "x".to_string(),
            severity: "x".to_string(),
            status: QualityTicketStatus::Open,
            assigned_to: None,
            assigned_at: None,
            resolution: None,
            resolved_at: None,
            verified_by: None,
            verified_at: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            history: vec![],
        });
    }

    #[test]
    fn rtu_struct_repair_step() {
        roundtrip(&RepairStep {
            step_id: "x".to_string(),
            step_name: "x".to_string(),
            action: "x".to_string(),
            target_field: "x".to_string(),
            new_value: None,
            status: "x".to_string(),
            error_message: None,
            executed_at: None,
        });
    }

    #[test]
    fn rtu_struct_repair_result() {
        roundtrip(&RepairResult {
            success: true,
            fields_changed: 0,
            before_value: serde_json::Value::Null,
            after_value: serde_json::Value::Null,
            verification_passed: true,
            message: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_repair_workflow() {
        roundtrip(&RepairWorkflow {
            id: "x".to_string(),
            ticket_id: "x".to_string(),
            strategy: RepairStrategy::AutoFix,
            status: "x".to_string(),
            steps: vec![],
            current_step: 0,
            auto_execute: true,
            requires_approval: false,
            approved_by: None,
            approved_at: None,
            executed_at: None,
            result: None,
            created_at: chrono::Utc::now(),
        });
    }

    #[test]
    fn rtu_struct_data_domain() {
        roundtrip(&DataDomain {
            id: "x".to_string(),
            name: "x".to_string(),
            description: "x".to_string(),
            owner: "x".to_string(),
            owner_email: None,
            stewards: vec![],
            entities: vec![],
            sla_hours: 0,
            created_at: chrono::Utc::now(),
        });
    }

    #[test]
    fn rtu_struct_data_ownership_matrix() {
        roundtrip(&DataOwnershipMatrix {
            entity_type: "x".to_string(),
            data_domain: "x".to_string(),
            data_owner: "x".to_string(),
            data_steward: "x".to_string(),
            approvers: vec![],
            viewers: vec![],
            auto_repair_enabled: false,
            escalation_path: vec![],
        });
    }

    #[test]
    fn rtu_struct_quality_loop_stats() {
        roundtrip(&QualityLoopStats {
            total_tickets: 0,
            open_tickets: 0,
            in_progress: 0,
            resolved: 0,
            verified: 0,
            closed: 0,
            rejected: 0,
            auto_repair_count: 0,
            auto_repair_success_rate: 0.0,
            avg_resolution_time_hours: 0.0,
            sla_compliance_rate: 0.0,
            tickets_by_severity: HashMap::new(),
            tickets_by_domain: HashMap::new(),
        });
    }

    #[test]
    fn rtu_struct_graph_node() {
        roundtrip(&GraphNode {
            id: "x".to_string(),
            label: "x".to_string(),
            entity_type: "x".to_string(),
            domain: "x".to_string(),
            properties: serde_json::Value::Null,
            degree: 0,
            centrality: 0.0,
            cluster: None,
        });
    }

    #[test]
    fn rtu_struct_graph_edge() {
        roundtrip(&GraphEdge {
            id: "x".to_string(),
            source: "x".to_string(),
            target: "x".to_string(),
            relation_type: "x".to_string(),
            label: "x".to_string(),
            weight: 0.0,
            properties: serde_json::Value::Null,
        });
    }

    #[test]
    fn rtu_struct_master_data_graph() {
        roundtrip(&MasterDataGraph {
            nodes: vec![],
            edges: vec![],
            node_count: 0,
            edge_count: 0,
            avg_degree: 0.0,
            density: 0.0,
            connected_components: 0,
        });
    }

    #[test]
    fn rtu_struct_graph_stats() {
        roundtrip(&GraphStats {
            node_count: 0,
            edge_count: 0,
            avg_degree: 0.0,
            density: 0.0,
            connected_components: 0,
            nodes_by_domain: HashMap::new(),
            edges_by_relation: HashMap::new(),
            top_degree_nodes: vec![],
            avg_clustering_coefficient: 0.0,
        });
    }

    #[test]
    fn rtu_struct_concept() {
        roundtrip(&Concept {
            id: "x".to_string(),
            name: "x".to_string(),
            concept_type: "x".to_string(),
            description: "x".to_string(),
            parent_id: None,
            properties: serde_json::Value::Null,
            synonyms: vec![],
        });
    }

    #[test]
    fn rtu_struct_knowledge_triple() {
        roundtrip(&KnowledgeTriple {
            subject: "x".to_string(),
            predicate: "x".to_string(),
            object: "x".to_string(),
            confidence: 0.0,
            source: "x".to_string(),
            created_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_inference_rule() {
        roundtrip(&InferenceRule {
            id: "x".to_string(),
            name: "x".to_string(),
            description: "x".to_string(),
            condition_pattern: "x".to_string(),
            conclusion_pattern: "x".to_string(),
            confidence: 0.0,
            enabled: true,
        });
    }

    #[test]
    fn rtu_struct_similar_entity() {
        roundtrip(&SimilarEntity {
            entity_id: "x".to_string(),
            entity_type: "x".to_string(),
            entity_name: "x".to_string(),
            similarity: 0.0,
            similarity_reasons: vec![],
            shared_attributes: vec![],
        });
    }

    #[test]
    fn rtu_struct_association_recommendation() {
        roundtrip(&AssociationRecommendation {
            source_entity_id: "x".to_string(),
            target_entity_id: "x".to_string(),
            target_entity_name: "x".to_string(),
            relation_type: "x".to_string(),
            confidence: 0.0,
            evidence: vec![],
            support: 0,
        });
    }

    #[test]
    fn rtu_struct_completion_suggestion() {
        roundtrip(&CompletionSuggestion {
            entity_id: "x".to_string(),
            entity_type: "x".to_string(),
            field_name: "x".to_string(),
            suggested_value: "x".to_string(),
            confidence: 0.0,
            source: "x".to_string(),
            reasoning: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_master_data_entity() {
        roundtrip(&MasterDataEntity {
            id: "x".to_string(),
            code: "x".to_string(),
            name: "x".to_string(),
            domain: "x".to_string(),
            status: "x".to_string(),
            source_service: "x".to_string(),
            created_at: "x".to_string(),
            updated_at: "x".to_string(),
            properties: serde_json::Value::Null,
        });
    }

    #[test]
    fn rtu_struct_master_data_edge() {
        roundtrip(&MasterDataEdge {
            node: MasterDataEntity {
                id: "x".to_string(),
                code: "x".to_string(),
                name: "x".to_string(),
                domain: "x".to_string(),
                status: "x".to_string(),
                source_service: "x".to_string(),
                created_at: "x".to_string(),
                updated_at: "x".to_string(),
                properties: serde_json::Value::Null,
            },
            cursor: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_page_info() {
        roundtrip(&PageInfo {
            has_next_page: false,
            has_previous_page: false,
            start_cursor: None,
            end_cursor: None,
        });
    }

    #[test]
    fn rtu_struct_master_data_connection() {
        roundtrip(&MasterDataConnection {
            total_count: 0,
            page_info: PageInfo {
                has_next_page: false,
                has_previous_page: false,
                start_cursor: None,
                end_cursor: None,
            },
            edges: vec![],
        });
    }

    #[test]
    fn rtu_struct_quality_info() {
        roundtrip(&QualityInfo {
            score: 0.0,
            issues_count: 0,
            last_check_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_lineage_info() {
        roundtrip(&LineageInfo {
            upstream_count: 0,
            downstream_count: 0,
            lineage_depth: 0,
        });
    }

    #[test]
    fn rtu_struct_graph_info() {
        roundtrip(&GraphInfo {
            degree: 0,
            centrality: 0.0,
            community_id: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_sync_job_v2() {
        roundtrip(&SyncJobV2 {
            id: "x".to_string(),
            tenant_id: "x".to_string(),
            entity_type: "x".to_string(),
            entity_id: "x".to_string(),
            operation: "x".to_string(),
            status: "x".to_string(),
            source_system: "x".to_string(),
            target_systems: vec![],
            priority: SyncJobPriority::Normal,
            tags: vec![],
            scheduled_at: None,
            retries_exhausted: false,
            dead_letter_reason: None,
            current_step: 0,
            retry_count: 0,
            max_retries: 0,
            created_at: "x".to_string(),
            updated_at: "x".to_string(),
            completed_at: None,
            error_message: None,
        });
    }

    #[test]
    fn rtu_struct_dead_letter_v2() {
        roundtrip(&DeadLetterV2 {
            id: "x".to_string(),
            job_id: "x".to_string(),
            tenant_id: "x".to_string(),
            entity_type: "x".to_string(),
            operation: "x".to_string(),
            error_message: "x".to_string(),
            retry_count: 0,
            last_retry_at: None,
            retryable: true,
            category: "x".to_string(),
            created_at: "x".to_string(),
            payload: None,
        });
    }

    #[test]
    fn rtu_struct_mdm_service_info() {
        roundtrip(&MdmServiceInfo {
            service_id: "x".to_string(),
            service_name: "x".to_string(),
            endpoint: "x".to_string(),
            domains: vec![],
            status: "x".to_string(),
            last_heartbeat: "x".to_string(),
            capabilities: vec![],
        });
    }

    #[test]
    fn rtu_struct_gateway_request() {
        roundtrip(&GatewayRequest {
            path: "x".to_string(),
            method: "x".to_string(),
            headers: HashMap::new(),
            body: None,
            tenant_id: None,
        });
    }

    #[test]
    fn rtu_struct_quality_ai_score() {
        roundtrip(&QualityAiScore {
            entity_id: "x".to_string(),
            domain: "x".to_string(),
            overall_score: 0.0,
            completeness_score: 0.0,
            accuracy_score: 0.0,
            consistency_score: 0.0,
            timeliness_score: 0.0,
            uniqueness_score: 0.0,
            validity_score: 0.0,
            risk_level: "x".to_string(),
            risk_factors: vec![],
            recommendations: vec![],
            scored_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_quality_anomaly() {
        roundtrip(&QualityAnomaly {
            id: "x".to_string(),
            entity_id: "x".to_string(),
            domain: "x".to_string(),
            anomaly_type: "x".to_string(),
            severity: "x".to_string(),
            description: "x".to_string(),
            detected_value: "x".to_string(),
            expected_range: "x".to_string(),
            confidence: 0.0,
            detected_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_quality_prediction() {
        roundtrip(&QualityPrediction {
            entity_id: "x".to_string(),
            domain: "x".to_string(),
            predicted_quality_trend: "x".to_string(),
            predicted_issues: vec![],
            confidence: 0.0,
            factors: vec![],
            prediction_date: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_match_field() {
        roundtrip(&MatchField {
            field_name: "x".to_string(),
            source_value: "x".to_string(),
            target_value: "x".to_string(),
            similarity: 0.0,
            match_type: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_match_result() {
        roundtrip(&MatchResult {
            source_id: "x".to_string(),
            target_id: "x".to_string(),
            target_name: "x".to_string(),
            match_score: 0.0,
            match_fields: vec![],
            match_details: "x".to_string(),
            confidence: 0.0,
            recommendation: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_duplicate_group() {
        roundtrip(&DuplicateGroup {
            group_id: "x".to_string(),
            domain: "x".to_string(),
            entities: vec![],
            confidence: 0.0,
            primary_entity_id: "x".to_string(),
            merge_recommendation: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_classification_result() {
        roundtrip(&ClassificationResult {
            entity_id: "x".to_string(),
            domain: "x".to_string(),
            suggested_category: "x".to_string(),
            category_path: "x".to_string(),
            confidence: 0.0,
            alternative_categories: vec![],
            features_used: vec![],
            reasoning: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_category() {
        roundtrip(&Category {
            id: "x".to_string(),
            name: "x".to_string(),
            parent_id: None,
            domain: "x".to_string(),
            description: "x".to_string(),
            keywords: vec![],
            rules: vec![],
            entity_count: 0,
        });
    }

    #[test]
    fn rtu_struct_classification_rule() {
        roundtrip(&ClassificationRule {
            id: "x".to_string(),
            name: "x".to_string(),
            domain: "x".to_string(),
            conditions: vec![],
            category_id: "x".to_string(),
            priority: 0,
            confidence: 0.0,
            enabled: true,
            learned: false,
        });
    }

    #[test]
    fn rtu_struct_classification_model() {
        roundtrip(&ClassificationModel {
            categories: vec![],
            rules: vec![],
            accuracy: 0.0,
            trained_at: "x".to_string(),
            training_samples: 0,
        });
    }

    #[test]
    fn rtu_struct_lineage_trace_query() {
        roundtrip(&LineageTraceQuery {
            entity_id: "x".to_string(),
            trace_depth: None,
            direction: None,
            relationship_types: None,
        });
    }

    #[test]
    fn rtu_struct_impact_analysis_request() {
        roundtrip(&ImpactAnalysisRequest {
            entity_id: "x".to_string(),
            change_type: ChangeType::SchemaChange,
            affected_fields: None,
        });
    }

    #[test]
    fn rtu_struct_lineage_graph_node() {
        roundtrip(&LineageGraphNode {
            id: "x".to_string(),
            label: "x".to_string(),
            node_type: "x".to_string(),
            domain: "x".to_string(),
            attributes: serde_json::Value::Null,
            level: 0,
        });
    }

    #[test]
    fn rtu_struct_lineage_graph_edge() {
        roundtrip(&LineageGraphEdge {
            id: "x".to_string(),
            source: "x".to_string(),
            target: "x".to_string(),
            relationship: LineageRelationship::References,
            weight: 0.0,
            attributes: serde_json::Value::Null,
        });
    }

    #[test]
    fn rtu_struct_dimension_score() {
        roundtrip(&DimensionScore {
            dimension: MaturityDimension::DataQuality,
            dimension_label: "x".to_string(),
            score: 0.0,
            level: MaturityLevel::Initial,
            level_label: "x".to_string(),
            strengths: vec![],
            weaknesses: vec![],
            improvement_actions: vec![],
        });
    }

    #[test]
    fn rtu_struct_improvement_action() {
        roundtrip(&ImprovementAction {
            action_id: "x".to_string(),
            dimension: MaturityDimension::DataQuality,
            dimension_label: "x".to_string(),
            priority: "x".to_string(),
            description: "x".to_string(),
            estimated_effort: "x".to_string(),
            expected_impact: "x".to_string(),
            timeline: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_maturity_assessment() {
        roundtrip(&MaturityAssessment {
            assessment_id: "x".to_string(),
            assessed_at: "x".to_string(),
            dimensions: vec![],
            overall_score: 0.0,
            overall_level: MaturityLevel::Initial,
            overall_level_label: "x".to_string(),
            recommendations: vec![],
        });
    }

    #[test]
    fn rtu_struct_dimension_delta() {
        roundtrip(&DimensionDelta {
            dimension: MaturityDimension::DataQuality,
            dimension_label: "x".to_string(),
            score_delta: 0.0,
            level_delta: 0,
        });
    }

    #[test]
    fn rtu_struct_assessment_comparison() {
        roundtrip(&AssessmentComparison {
            baseline: MaturityAssessment {
                assessment_id: "x".to_string(),
                assessed_at: "x".to_string(),
                dimensions: vec![],
                overall_score: 0.0,
                overall_level: MaturityLevel::Initial,
                overall_level_label: "x".to_string(),
                recommendations: vec![],
            },
            current: MaturityAssessment {
                assessment_id: "y".to_string(),
                assessed_at: "y".to_string(),
                dimensions: vec![],
                overall_score: 0.0,
                overall_level: MaturityLevel::Initial,
                overall_level_label: "y".to_string(),
                recommendations: vec![],
            },
            score_delta: 0.0,
            level_delta: 0,
            dimension_deltas: vec![],
            summary: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_improvement_plan() {
        roundtrip(&ImprovementPlan {
            plan_id: "x".to_string(),
            generated_at: "x".to_string(),
            actions: vec![],
            total_effort: "x".to_string(),
            estimated_timeline: "x".to_string(),
            expected_overall_score_gain: 0.0,
        });
    }

    #[test]
    fn rtu_struct_catalog_entry() {
        roundtrip(&CatalogEntry {
            entry_id: "x".to_string(),
            name: "x".to_string(),
            domain: "x".to_string(),
            description: "x".to_string(),
            owner: "x".to_string(),
            steward: "x".to_string(),
            tags: vec![],
            classification: CatalogClassification::Public,
            classification_label: "x".to_string(),
            source_system: "x".to_string(),
            created_at: "x".to_string(),
            updated_at: "x".to_string(),
            popularity: 0,
            quality_score: 0.0,
        });
    }

    #[test]
    fn rtu_struct_catalog_facets() {
        roundtrip(&CatalogFacets {
            by_domain: HashMap::new(),
            by_classification: HashMap::new(),
            by_owner: HashMap::new(),
            by_tag: HashMap::new(),
        });
    }

    #[test]
    fn rtu_struct_catalog_search_result() {
        roundtrip(&CatalogSearchResult {
            entries: vec![],
            total: 0,
            page: 0,
            page_size: 0,
            total_pages: 0,
            facets: CatalogFacets {
                by_domain: HashMap::new(),
                by_classification: HashMap::new(),
                by_owner: HashMap::new(),
                by_tag: HashMap::new(),
            },
        });
    }

    #[test]
    fn rtu_struct_catalog_stats() {
        roundtrip(&CatalogStats {
            total_entries: 0,
            by_domain: HashMap::new(),
            by_classification: HashMap::new(),
            avg_quality_score: 0.0,
            total_views: 0,
            top_popular: vec![],
        });
    }

    #[test]
    fn rtu_struct_metadata_field() {
        roundtrip(&MetadataField {
            field_name: "x".to_string(),
            field_type: MetadataFieldType::String,
            field_type_label: "x".to_string(),
            required: false,
            unique: false,
            default_value: None,
            description: "x".to_string(),
            validation_rules: vec![],
        });
    }

    #[test]
    fn rtu_struct_metadata_schema() {
        roundtrip(&MetadataSchema {
            schema_id: "x".to_string(),
            name: "x".to_string(),
            version: 0,
            domain: "x".to_string(),
            fields: vec![],
            constraints: vec![],
            created_at: "x".to_string(),
            updated_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_metadata_record() {
        roundtrip(&MetadataRecord {
            record_id: "x".to_string(),
            schema_id: "x".to_string(),
            entity_type: "x".to_string(),
            entity_id: "x".to_string(),
            values: serde_json::Value::Null,
            created_at: "x".to_string(),
            updated_at: "x".to_string(),
            version: 0,
        });
    }

    #[test]
    fn rtu_struct_metadata_relation() {
        roundtrip(&MetadataRelation {
            relation_id: "x".to_string(),
            source_entity: "x".to_string(),
            target_entity: "x".to_string(),
            relation_type: "x".to_string(),
            cardinality: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_metadata_stats() {
        roundtrip(&MetadataStats {
            total_schemas: 0,
            total_records: 0,
            total_relations: 0,
            by_domain: HashMap::new(),
            by_entity_type: HashMap::new(),
        });
    }

    #[test]
    fn rtu_struct_dashboard_widget() {
        roundtrip(&DashboardWidget {
            widget_id: "x".to_string(),
            title: "x".to_string(),
            widget_type: WidgetType::KpiCard,
            data_source: "x".to_string(),
            config: serde_json::Value::Null,
            position: (0, 0),
            refresh_interval: 0,
            last_updated: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_dashboard_filter() {
        roundtrip(&DashboardFilter {
            field: "x".to_string(),
            operator: "x".to_string(),
            value: serde_json::Value::Null,
            label: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_kpi_metric() {
        roundtrip(&KpiMetric {
            name: "x".to_string(),
            value: 0.0,
            unit: "x".to_string(),
            target: None,
            trend: None,
            trend_percentage: None,
            status: KpiStatus::Good,
        });
    }

    #[test]
    fn rtu_struct_dashboard_layout() {
        roundtrip(&DashboardLayout {
            dashboard_id: "x".to_string(),
            name: "x".to_string(),
            description: "x".to_string(),
            widgets: vec![],
            filters: vec![],
            refresh_config: serde_json::Value::Null,
            created_at: "x".to_string(),
            updated_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_dashboard_data() {
        roundtrip(&DashboardData {
            widgets_data: HashMap::new(),
            summary: vec![],
            generated_at: "x".to_string(),
            period: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_dashboard_stats() {
        roundtrip(&DashboardStats {
            total_dashboards: 0,
            total_widgets: 0,
            widgets_by_type: HashMap::new(),
            avg_refresh_interval: 0.0,
            last_refreshed: None,
        });
    }

    #[test]
    fn rtu_struct_report_schedule() {
        roundtrip(&ReportSchedule {
            frequency: ReportFrequency::Daily,
            day_of_week: None,
            day_of_month: None,
            time: "x".to_string(),
            timezone: "x".to_string(),
            next_run_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_report_section() {
        roundtrip(&ReportSection {
            section_id: "x".to_string(),
            title: "x".to_string(),
            data_source: "x".to_string(),
            chart_type: None,
            config: serde_json::Value::Null,
        });
    }

    #[test]
    fn rtu_struct_report_template() {
        roundtrip(&ReportTemplate {
            template_id: "x".to_string(),
            name: "x".to_string(),
            description: "x".to_string(),
            report_type: ReportType::QualityReport,
            schedule: None,
            sections: vec![],
            recipients: vec![],
            format: ReportFormat::PDF,
            created_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_generated_report() {
        roundtrip(&GeneratedReport {
            report_id: "x".to_string(),
            template_id: "x".to_string(),
            generated_at: "x".to_string(),
            period: "x".to_string(),
            status: ReportStatus::Pending,
            sections_data: HashMap::new(),
            summary: "x".to_string(),
            file_url: None,
        });
    }

    #[test]
    fn rtu_struct_report_automation_stats() {
        roundtrip(&ReportAutomationStats {
            total_templates: 0,
            total_generated: 0,
            templates_by_type: HashMap::new(),
            generated_by_status: HashMap::new(),
            scheduled_count: 0,
            last_generated: None,
        });
    }

    #[test]
    fn rtu_struct_compliance_rule() {
        roundtrip(&ComplianceRule {
            rule_id: "x".to_string(),
            framework: AuditFramework::GDPR,
            name: "x".to_string(),
            description: "x".to_string(),
            severity: FindingSeverity::Low,
            check_logic: "x".to_string(),
            last_checked: None,
            status: ComplianceStatus::Compliant,
        });
    }

    #[test]
    fn rtu_struct_audit_finding() {
        roundtrip(&AuditFinding {
            finding_id: "x".to_string(),
            rule_id: "x".to_string(),
            entity_type: "x".to_string(),
            entity_id: "x".to_string(),
            severity: FindingSeverity::Low,
            description: "x".to_string(),
            evidence: serde_json::Value::Null,
            recommendation: "x".to_string(),
            status: FindingStatus::Open,
            found_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_compliance_audit_report() {
        roundtrip(&ComplianceAuditReport {
            report_id: "x".to_string(),
            framework: AuditFramework::GDPR,
            audit_period: "x".to_string(),
            total_rules: 0,
            compliant_count: 0,
            findings: vec![],
            overall_status: ComplianceStatus::Compliant,
            score: 0.0,
            generated_at: "x".to_string(),
        });
    }

    #[test]
    fn rtu_struct_audit_scorecard() {
        roundtrip(&AuditScorecard {
            framework: AuditFramework::GDPR,
            score: 0.0,
            grade: "x".to_string(),
            by_category: HashMap::new(),
            trend: vec![],
        });
    }

    #[test]
    fn rtu_struct_compliance_audit_stats() {
        roundtrip(&ComplianceAuditStats {
            total_rules: 0,
            total_findings: 0,
            rules_by_framework: HashMap::new(),
            findings_by_severity: HashMap::new(),
            findings_by_status: HashMap::new(),
            compliance_rate: 0.0,
        });
    }

    // ============== PURE FUNCTION TESTS ==============

    fn make_master_data_ref() -> MasterDataRef {
        MasterDataRef {
            master_data_id: "md-001".to_string(),
            tenant_id: "t-1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("Alice".to_string()),
            status: "active".to_string(),
            source_service: "erp".to_string(),
            local_entity_type: Some("customer".to_string()),
            local_entity_id: Some("123".to_string()),
            last_synced_at: "2024-01-01T00:00:00Z".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-02T00:00:00Z".to_string(),
            archived_at: None,
            archived_by: None,
            archive_reason: None,
            destroy_scheduled_at: None,
            destroy_reason: None,
            destroy_scheduled_by: None,
            destroyed_at: None,
            destroyed_by: None,
        }
    }

    fn make_entity_profile() -> EntityProfile {
        let mut fields = HashMap::new();
        fields.insert("status".to_string(), Some("active".to_string()));
        fields.insert("email".to_string(), Some("a@b.com".to_string()));
        fields.insert("phone".to_string(), Some("13800138000".to_string()));
        EntityProfile {
            id: "e1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("Alice".to_string()),
            fields,
            last_synced_days_ago: 3,
        }
    }

    fn make_graph_node(id: &str, degree: i32) -> GraphNode {
        GraphNode {
            id: id.to_string(),
            label: id.to_string(),
            entity_type: "entity".to_string(),
            domain: "customer".to_string(),
            properties: serde_json::Value::Null,
            degree,
            centrality: 0.0,
            cluster: None,
        }
    }

    fn make_graph_edge(id: &str, src: &str, tgt: &str, rel: &str) -> GraphEdge {
        GraphEdge {
            id: id.to_string(),
            source: src.to_string(),
            target: tgt.to_string(),
            relation_type: rel.to_string(),
            label: rel.to_string(),
            weight: 1.0,
            properties: serde_json::Value::Null,
        }
    }

    // --- is_valid_identifier ---
    #[test]
    fn test_is_valid_identifier_valid() {
        assert!(is_valid_identifier("customer"));
        assert!(is_valid_identifier("customer_id"));
        assert!(is_valid_identifier("_customer"));
        assert!(is_valid_identifier("a"));
        assert!(is_valid_identifier("abc123"));
    }

    #[test]
    fn test_is_valid_identifier_invalid_empty() {
        assert!(!is_valid_identifier(""));
    }

    #[test]
    fn test_is_valid_identifier_invalid_leading_digit() {
        assert!(!is_valid_identifier("1abc"));
        assert!(!is_valid_identifier("9"));
    }

    #[test]
    fn test_is_valid_identifier_invalid_special_chars() {
        assert!(!is_valid_identifier("cust-omer"));
        assert!(!is_valid_identifier("cust omer"));
        assert!(!is_valid_identifier("cust;omer"));
        assert!(!is_valid_identifier("cust\"omer"));
        assert!(!is_valid_identifier("cust.omer"));
    }

    // --- get_record_field ---
    #[test]
    fn test_get_record_field_known_fields() {
        let r = make_master_data_ref();
        assert_eq!(
            get_record_field(&r, "master_data_id"),
            Some("md-001".to_string())
        );
        assert_eq!(get_record_field(&r, "tenant_id"), Some("t-1".to_string()));
        assert_eq!(get_record_field(&r, "domain"), Some("customer".to_string()));
        assert_eq!(get_record_field(&r, "code"), Some("C001".to_string()));
        assert_eq!(get_record_field(&r, "name"), Some("Alice".to_string()));
        assert_eq!(get_record_field(&r, "status"), Some("active".to_string()));
        assert_eq!(
            get_record_field(&r, "source_service"),
            Some("erp".to_string())
        );
        assert_eq!(
            get_record_field(&r, "local_entity_type"),
            Some("customer".to_string())
        );
        assert_eq!(
            get_record_field(&r, "local_entity_id"),
            Some("123".to_string())
        );
    }

    #[test]
    fn test_get_record_field_unknown_returns_none() {
        let r = make_master_data_ref();
        assert_eq!(get_record_field(&r, "nonexistent"), None);
        assert_eq!(get_record_field(&r, ""), None);
    }

    #[test]
    fn test_get_record_field_none_values() {
        let mut r = make_master_data_ref();
        r.name = None;
        r.local_entity_type = None;
        assert_eq!(get_record_field(&r, "name"), None);
        assert_eq!(get_record_field(&r, "local_entity_type"), None);
    }

    // --- domain_display_name ---
    #[test]
    fn test_domain_display_name_known() {
        assert_eq!(domain_display_name("customer"), "客户主数据");
        assert_eq!(domain_display_name("product"), "产品主数据");
        assert_eq!(domain_display_name("material"), "物料主数据");
        assert_eq!(domain_display_name("supplier"), "供应商主数据");
        assert_eq!(domain_display_name("employee"), "员工主数据");
        assert_eq!(domain_display_name("department"), "部门主数据");
        assert_eq!(domain_display_name("warehouse"), "仓库主数据");
        assert_eq!(domain_display_name("project"), "项目主数据");
        assert_eq!(domain_display_name("chart_of_accounts"), "会计科目主数据");
        assert_eq!(domain_display_name("cost_center"), "成本中心主数据");
    }

    #[test]
    fn test_domain_display_name_unknown_passthrough() {
        assert_eq!(domain_display_name("custom_domain"), "custom_domain");
        assert_eq!(domain_display_name("xyz"), "xyz");
        assert_eq!(domain_display_name(""), "");
    }

    // --- get_domain_fields ---
    #[test]
    fn test_get_domain_fields_customer_has_extras() {
        let fields = get_domain_fields("customer");
        assert!(fields.len() >= 7);
        assert!(fields.iter().any(|f| f.field_name == "customer_type"));
        assert!(fields.iter().any(|f| f.field_name == "contact_person"));
        assert!(fields
            .iter()
            .any(|f| f.field_name == "master_data_id" && f.is_required));
        assert!(fields
            .iter()
            .any(|f| f.field_name == "code" && f.is_required));
        assert!(fields
            .iter()
            .any(|f| f.field_name == "status" && f.is_required));
        assert!(fields
            .iter()
            .any(|f| f.field_name == "source_service" && f.is_required));
    }

    #[test]
    fn test_get_domain_fields_product_and_material_share_extras() {
        let prod = get_domain_fields("product");
        let mat = get_domain_fields("material");
        assert!(prod.iter().any(|f| f.field_name == "category"));
        assert!(prod.iter().any(|f| f.field_name == "unit"));
        assert!(mat.iter().any(|f| f.field_name == "category"));
        assert!(mat.iter().any(|f| f.field_name == "unit"));
    }

    #[test]
    fn test_get_domain_fields_supplier_extras() {
        let fields = get_domain_fields("supplier");
        assert!(fields.iter().any(|f| f.field_name == "supplier_type"));
        assert!(fields.iter().any(|f| f.field_name == "credit_level"));
    }

    #[test]
    fn test_get_domain_fields_employee_extras() {
        let fields = get_domain_fields("employee");
        assert!(fields.iter().any(|f| f.field_name == "department"));
        assert!(fields.iter().any(|f| f.field_name == "position"));
    }

    #[test]
    fn test_get_domain_fields_unknown_only_base() {
        let fields = get_domain_fields("unknown_domain");
        assert_eq!(fields.len(), 5);
        assert!(fields
            .iter()
            .all(|f| !f.is_required || f.field_name != "name"));
    }

    // --- simulate_* functions ---
    #[test]
    fn test_simulate_sync_step_returns_true() {
        assert!(simulate_sync_step("sap", "create"));
        assert!(simulate_sync_step("kingdee", "update"));
        assert!(simulate_sync_step("", ""));
    }

    #[test]
    fn test_simulate_compensation_returns_true() {
        assert!(simulate_compensation("sap", "delete"));
        assert!(simulate_compensation("yonyou", "create"));
        assert!(simulate_compensation("", ""));
    }

    #[test]
    fn test_simulate_repair_step_returns_true() {
        assert!(simulate_repair_step("fix", "field"));
        assert!(simulate_repair_step("normalize", "phone"));
        assert!(simulate_repair_step("", ""));
    }

    // --- Graph algorithms ---
    #[test]
    fn test_build_adjacency_list_bidirectional() {
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "b", "c", "rel"),
        ];
        let adj = build_adjacency_list(&edges);
        assert!(adj.contains_key("a"));
        assert!(adj.contains_key("b"));
        assert!(adj.contains_key("c"));
        assert_eq!(adj.get("a").unwrap(), &vec!["b".to_string()]);
        assert_eq!(adj.get("b").unwrap().len(), 2);
        assert!(adj.get("b").unwrap().contains(&"a".to_string()));
        assert!(adj.get("b").unwrap().contains(&"c".to_string()));
    }

    #[test]
    fn test_build_adjacency_list_empty() {
        let adj = build_adjacency_list(&[]);
        assert!(adj.is_empty());
    }

    #[test]
    fn test_calculate_degree_centrality_single_node() {
        let nodes = vec![make_graph_node("a", 0)];
        let c = calculate_degree_centrality(&nodes);
        assert_eq!(c.get("a"), Some(&0.0));
    }

    #[test]
    fn test_calculate_degree_centrality_multiple_nodes() {
        let nodes = vec![
            make_graph_node("a", 2),
            make_graph_node("b", 1),
            make_graph_node("c", 1),
        ];
        let c = calculate_degree_centrality(&nodes);
        assert_eq!(c.len(), 3);
        // n=3, degree/(n-1) = degree/2
        assert!((c.get("a").copied().unwrap_or(-1.0) - 1.0).abs() < 1e-9);
        assert!((c.get("b").copied().unwrap_or(-1.0) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn test_calculate_degree_centrality_empty() {
        let c = calculate_degree_centrality(&[]);
        assert!(c.is_empty());
    }

    #[test]
    fn test_count_connected_components_single() {
        let nodes = vec![
            make_graph_node("a", 0),
            make_graph_node("b", 0),
            make_graph_node("c", 0),
        ];
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "b", "c", "rel"),
        ];
        assert_eq!(count_connected_components(&nodes, &edges), 1);
    }

    #[test]
    fn test_count_connected_components_multiple() {
        let nodes = vec![
            make_graph_node("a", 0),
            make_graph_node("b", 0),
            make_graph_node("c", 0),
            make_graph_node("d", 0),
        ];
        let edges = vec![make_graph_edge("e1", "a", "b", "rel")];
        // a-b connected, c and d isolated => 3 components
        assert_eq!(count_connected_components(&nodes, &edges), 3);
    }

    #[test]
    fn test_count_connected_components_no_edges() {
        let nodes = vec![make_graph_node("a", 0), make_graph_node("b", 0)];
        assert_eq!(count_connected_components(&nodes, &[]), 2);
    }

    #[test]
    fn test_count_connected_components_empty() {
        assert_eq!(count_connected_components(&[], &[]), 0);
    }

    #[test]
    fn test_detect_communities_single_group() {
        let nodes = vec![
            make_graph_node("a", 0),
            make_graph_node("b", 0),
            make_graph_node("c", 0),
        ];
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "b", "c", "rel"),
        ];
        let comms = detect_communities(&nodes, &edges);
        assert_eq!(comms.len(), 3);
        let labels: std::collections::HashSet<&String> = comms.values().collect();
        assert_eq!(labels.len(), 1);
    }

    #[test]
    fn test_detect_communities_multiple_groups() {
        let nodes = vec![
            make_graph_node("a", 0),
            make_graph_node("b", 0),
            make_graph_node("c", 0),
            make_graph_node("d", 0),
        ];
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "c", "d", "rel"),
        ];
        let comms = detect_communities(&nodes, &edges);
        assert_ne!(comms.get("a"), comms.get("c"));
        assert_eq!(comms.get("a"), comms.get("b"));
        assert_eq!(comms.get("c"), comms.get("d"));
    }

    #[test]
    fn test_shortest_path_bfs_direct() {
        let edges = vec![make_graph_edge("e1", "a", "b", "rel")];
        let path = shortest_path_bfs(&edges, "a", "b");
        assert_eq!(path, Some(vec!["a".to_string(), "b".to_string()]));
    }

    #[test]
    fn test_shortest_path_bfs_multi_hop() {
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "b", "c", "rel"),
            make_graph_edge("e3", "c", "d", "rel"),
        ];
        let path = shortest_path_bfs(&edges, "a", "d").unwrap();
        assert_eq!(path.len(), 4);
        assert_eq!(path[0], "a");
        assert_eq!(path[3], "d");
    }

    #[test]
    fn test_shortest_path_bfs_no_path() {
        let edges = vec![make_graph_edge("e1", "a", "b", "rel")];
        assert_eq!(shortest_path_bfs(&edges, "a", "z"), None);
    }

    #[test]
    fn test_shortest_path_bfs_same_node() {
        let path = shortest_path_bfs(&[], "a", "a");
        assert_eq!(path, Some(vec!["a".to_string()]));
    }

    #[test]
    fn test_multi_hop_neighbors_within_two() {
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "b", "c", "rel"),
            make_graph_edge("e3", "c", "d", "rel"),
        ];
        let neighbors = multi_hop_neighbors(&edges, "a", 2);
        let map: HashMap<String, usize> = neighbors.into_iter().collect();
        assert_eq!(map.get("b"), Some(&1));
        assert_eq!(map.get("c"), Some(&2));
        assert!(!map.contains_key("d"));
        assert!(!map.contains_key("a"));
    }

    #[test]
    fn test_multi_hop_neighbors_zero_hops() {
        let edges = vec![make_graph_edge("e1", "a", "b", "rel")];
        let neighbors = multi_hop_neighbors(&edges, "a", 0);
        assert!(neighbors.is_empty());
    }

    #[test]
    fn test_multi_hop_neighbors_isolated() {
        let neighbors = multi_hop_neighbors(&[], "a", 3);
        assert!(neighbors.is_empty());
    }

    #[test]
    fn test_calculate_graph_stats_basic() {
        let nodes = vec![
            make_graph_node("a", 2),
            make_graph_node("b", 1),
            make_graph_node("c", 1),
        ];
        let edges = vec![
            make_graph_edge("e1", "a", "b", "rel"),
            make_graph_edge("e2", "b", "c", "rel"),
        ];
        let stats = calculate_graph_stats(&nodes, &edges);
        assert_eq!(stats.node_count, 3);
        assert_eq!(stats.edge_count, 2);
        assert!((stats.avg_degree - (4.0 / 3.0)).abs() < 1e-9);
        assert!(stats.density > 0.0);
        assert_eq!(stats.connected_components, 1);
        assert_eq!(stats.nodes_by_domain.get("customer"), Some(&3));
        assert_eq!(stats.edges_by_relation.get("rel"), Some(&2));
    }

    #[test]
    fn test_calculate_graph_stats_empty() {
        let stats = calculate_graph_stats(&[], &[]);
        assert_eq!(stats.node_count, 0);
        assert_eq!(stats.edge_count, 0);
        assert_eq!(stats.avg_degree, 0.0);
        assert_eq!(stats.density, 0.0);
        assert_eq!(stats.connected_components, 0);
    }

    #[test]
    fn test_calculate_graph_stats_single_node() {
        let nodes = vec![make_graph_node("a", 0)];
        let stats = calculate_graph_stats(&nodes, &[]);
        assert_eq!(stats.node_count, 1);
        assert_eq!(stats.avg_degree, 0.0);
        assert_eq!(stats.density, 0.0);
        assert_eq!(stats.connected_components, 1);
    }

    // --- Quality scoring functions ---
    #[test]
    fn test_domain_required_fields_customer() {
        let f = domain_required_fields("customer");
        assert_eq!(f, vec!["code", "name", "phone", "email", "address"]);
    }

    #[test]
    fn test_domain_required_fields_supplier() {
        let f = domain_required_fields("supplier");
        assert_eq!(f, vec!["code", "name", "grade", "category", "region"]);
    }

    #[test]
    fn test_domain_required_fields_material() {
        let f = domain_required_fields("material");
        assert_eq!(f, vec!["code", "name", "category", "unit", "price"]);
    }

    #[test]
    fn test_domain_required_fields_employee() {
        let f = domain_required_fields("employee");
        assert_eq!(f, vec!["code", "name"]);
    }

    #[test]
    fn test_domain_required_fields_unknown_defaults() {
        let f = domain_required_fields("unknown");
        assert_eq!(f, vec!["code", "name"]);
        let f2 = domain_required_fields("");
        assert_eq!(f2, vec!["code", "name"]);
    }

    #[test]
    fn test_score_completeness_full() {
        let mut p = make_entity_profile();
        // score_completeness checks the fields map (not top-level code/name)
        // customer requires: code, name, phone, email, address
        p.fields
            .insert("address".to_string(), Some("123 St".to_string()));
        p.fields
            .insert("code".to_string(), Some("C001".to_string()));
        p.fields
            .insert("name".to_string(), Some("Alice".to_string()));
        assert_eq!(score_completeness(&p), 100.0);
    }

    #[test]
    fn test_score_completeness_partial() {
        let p = make_entity_profile();
        // customer requires code, name, phone, email, address
        // code & name are not in fields map but name is a top-level field
        // phone and email are filled, address is missing
        let score = score_completeness(&p);
        assert!(score > 0.0 && score < 100.0);
    }

    #[test]
    fn test_score_completeness_empty_required() {
        // Use a domain where required fields return defaults but profile has no fields
        let p = EntityProfile {
            id: "x".to_string(),
            domain: "unknown".to_string(),
            code: "C1".to_string(),
            name: None,
            fields: HashMap::new(),
            last_synced_days_ago: 0,
        };
        // domain_required_fields returns ["code", "name"]; "code" is checked in fields map (not top-level)
        let score = score_completeness(&p);
        assert!(score < 100.0);
    }

    #[test]
    fn test_score_accuracy_valid_profile() {
        let p = make_entity_profile();
        let s = score_accuracy(&p);
        assert!(s > 0.0);
    }

    #[test]
    fn test_score_accuracy_invalid_email() {
        let mut p = make_entity_profile();
        p.fields
            .insert("email".to_string(), Some("not-an-email".to_string()));
        let s = score_accuracy(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_accuracy_invalid_phone() {
        let mut p = make_entity_profile();
        p.fields
            .insert("phone".to_string(), Some("123".to_string()));
        let s = score_accuracy(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_accuracy_bad_code() {
        let mut p = make_entity_profile();
        p.code = "C-001!".to_string();
        let s = score_accuracy(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_accuracy_empty_name_no_penalty() {
        let mut p = make_entity_profile();
        p.name = None;
        let s = score_accuracy(&p);
        // No name present, so name check is skipped; should be decent score
        assert!(s > 0.0);
    }

    #[test]
    fn test_score_consistency_active_with_empty_name() {
        let mut p = make_entity_profile();
        p.name = None;
        p.fields
            .insert("status".to_string(), Some("active".to_string()));
        let s = score_consistency(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_consistency_stale_active() {
        let mut p = make_entity_profile();
        p.last_synced_days_ago = 100;
        p.fields
            .insert("status".to_string(), Some("active".to_string()));
        let s = score_consistency(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_consistency_healthy() {
        let p = make_entity_profile();
        let s = score_consistency(&p);
        assert_eq!(s, 100.0);
    }

    #[test]
    fn test_score_timeliness_fresh() {
        let p = make_entity_profile();
        assert_eq!(score_timeliness(&p), 100.0);
    }

    #[test]
    fn test_score_timeliness_old() {
        let mut p = make_entity_profile();
        p.last_synced_days_ago = 67; // 100 - (67-7)*1.5 = 100 - 90 = 10
        assert!((score_timeliness(&p) - 10.0).abs() < 1e-9);
    }

    #[test]
    fn test_score_timeliness_very_old_clamped() {
        let mut p = make_entity_profile();
        p.last_synced_days_ago = 1000;
        assert_eq!(score_timeliness(&p), 0.0);
    }

    #[test]
    fn test_score_uniqueness_short_code() {
        let mut p = make_entity_profile();
        p.code = "ab".to_string();
        assert_eq!(score_uniqueness(&p), 50.0);
    }

    #[test]
    fn test_score_uniqueness_long_unique() {
        let mut p = make_entity_profile();
        p.code = "CUST001".to_string();
        assert_eq!(score_uniqueness(&p), 90.0);
    }

    #[test]
    fn test_score_uniqueness_repeated_chars() {
        let mut p = make_entity_profile();
        p.code = "aaa".to_string();
        let s = score_uniqueness(&p);
        assert!(s < 90.0);
    }

    #[test]
    fn test_score_validity_valid_status() {
        let p = make_entity_profile();
        let s = score_validity(&p);
        assert_eq!(s, 100.0);
    }

    #[test]
    fn test_score_validity_invalid_status() {
        let mut p = make_entity_profile();
        p.fields
            .insert("status".to_string(), Some("bogus".to_string()));
        let s = score_validity(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_validity_missing_status() {
        let mut p = make_entity_profile();
        p.fields.remove("status");
        let s = score_validity(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_validity_material_missing_unit() {
        let mut p = make_entity_profile();
        p.domain = "material".to_string();
        p.fields.remove("unit");
        let s = score_validity(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_score_validity_supplier_bad_grade() {
        let mut p = make_entity_profile();
        p.domain = "supplier".to_string();
        p.fields.insert("grade".to_string(), Some("Z".to_string()));
        let s = score_validity(&p);
        assert!(s < 100.0);
    }

    #[test]
    fn test_weighted_overall_calculation() {
        let v = weighted_overall(100.0, 100.0, 100.0, 100.0, 100.0, 100.0);
        assert!((v - 100.0).abs() < 1e-9);
        let v2 = weighted_overall(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        assert!((v2 - 0.0).abs() < 1e-9);
        let v3 = weighted_overall(50.0, 50.0, 50.0, 50.0, 50.0, 50.0);
        assert!((v3 - 50.0).abs() < 1e-9);
    }

    // --- linear_regression ---
    #[test]
    fn test_linear_regression_perfect_line() {
        // y = 2x + 1
        let points = vec![(0.0, 1.0), (1.0, 3.0), (2.0, 5.0), (3.0, 7.0)];
        let (slope, intercept) = linear_regression(&points);
        assert!((slope - 2.0).abs() < 1e-6);
        assert!((intercept - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_linear_regression_empty() {
        let (slope, intercept) = linear_regression(&[]);
        assert_eq!(slope, 0.0);
        assert_eq!(intercept, 0.0);
    }

    #[test]
    fn test_linear_regression_single_point() {
        let (slope, intercept) = linear_regression(&[(5.0, 10.0)]);
        assert_eq!(slope, 0.0);
        assert_eq!(intercept, 10.0);
    }

    #[test]
    fn test_linear_regression_vertical_line() {
        // x values all the same => denom == 0
        let points = vec![(3.0, 1.0), (3.0, 2.0), (3.0, 3.0)];
        let (slope, intercept) = linear_regression(&points);
        assert_eq!(slope, 0.0);
        assert!((intercept - 2.0).abs() < 1e-6);
    }

    // --- String similarity functions ---
    #[test]
    fn test_levenshtein_identical() {
        assert_eq!(levenshtein("abc", "abc"), 0);
    }

    #[test]
    fn test_levenshtein_empty() {
        assert_eq!(levenshtein("", ""), 0);
        assert_eq!(levenshtein("", "abc"), 3);
        assert_eq!(levenshtein("abc", ""), 3);
    }

    #[test]
    fn test_levenshtein_substitution() {
        assert_eq!(levenshtein("abc", "abd"), 1);
        assert_eq!(levenshtein("kitten", "sitting"), 3);
    }

    #[test]
    fn test_levenshtein_unicode() {
        assert_eq!(levenshtein("你好", "你好"), 0);
        assert_eq!(levenshtein("你好", "你好世界"), 2);
    }

    #[test]
    fn test_levenshtein_similarity_identical() {
        assert!((levenshtein_similarity("abc", "abc") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_levenshtein_similarity_both_empty() {
        assert!((levenshtein_similarity("", "") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_levenshtein_similarity_partial() {
        let s = levenshtein_similarity("abc", "abd");
        assert!(s > 0.5 && s < 1.0);
    }

    #[test]
    fn test_jaro_winkler_identical() {
        assert!((jaro_winkler("abc", "abc") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_jaro_winkler_both_empty() {
        assert!((jaro_winkler("", "") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_jaro_winkler_one_empty() {
        assert_eq!(jaro_winkler("abc", ""), 0.0);
        assert_eq!(jaro_winkler("", "abc"), 0.0);
    }

    #[test]
    fn test_jaro_winkler_no_match() {
        assert_eq!(jaro_winkler("xyz", "abc"), 0.0);
    }

    #[test]
    fn test_jaro_winkler_prefix_bonus() {
        // Strings with common prefix should get a bonus
        let s = jaro_winkler("martha", "marhta");
        assert!(s > 0.0 && s < 1.0);
    }

    #[test]
    fn test_phonetic_similarity_empty() {
        assert_eq!(phonetic_similarity("", "abc"), 0.0);
        assert_eq!(phonetic_similarity("abc", ""), 0.0);
    }

    #[test]
    fn test_phonetic_similarity_identical() {
        let s = phonetic_similarity("hello", "hello");
        assert!((s - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_phonetic_similarity_first_char_bonus() {
        let s = phonetic_similarity("abc", "abd");
        assert!(s > 0.0);
    }

    #[test]
    fn test_abbreviation_similarity_empty() {
        assert_eq!(abbreviation_similarity("", "abc"), 0.0);
        assert_eq!(abbreviation_similarity("abc", ""), 0.0);
    }

    #[test]
    fn test_abbreviation_similarity_match() {
        // "IBM" should match "IBM"
        let s = abbreviation_similarity("IBM", "IBM");
        assert!(s > 0.0);
    }

    #[test]
    fn test_match_field_value_exact() {
        let (score, mt) = match_field_value("abc", "abc");
        assert!((score - 1.0).abs() < 1e-9);
        assert!(matches!(mt, MatchType::Exact));
    }

    #[test]
    fn test_match_field_value_fuzzy_high() {
        let (score, mt) = match_field_value("abcdefgh", "abcdefgx");
        assert!(score >= 0.8);
        assert!(matches!(mt, MatchType::Exact | MatchType::Fuzzy));
    }

    #[test]
    fn test_match_field_value_no_match() {
        let (score, _mt) = match_field_value("xyz", "abc");
        assert!(score < 0.8);
    }

    // --- build_category_path ---
    #[test]
    fn test_build_category_path_single() {
        let cats = vec![Category {
            id: "c1".to_string(),
            name: "Root".to_string(),
            parent_id: None,
            domain: "customer".to_string(),
            description: String::new(),
            keywords: vec![],
            rules: vec![],
            entity_count: 0,
        }];
        assert_eq!(build_category_path("c1", &cats), "Root");
    }

    #[test]
    fn test_build_category_path_chain() {
        let cats = vec![
            Category {
                id: "c1".to_string(),
                name: "Root".to_string(),
                parent_id: None,
                domain: "customer".to_string(),
                description: String::new(),
                keywords: vec![],
                rules: vec![],
                entity_count: 0,
            },
            Category {
                id: "c2".to_string(),
                name: "Child".to_string(),
                parent_id: Some("c1".to_string()),
                domain: "customer".to_string(),
                description: String::new(),
                keywords: vec![],
                rules: vec![],
                entity_count: 0,
            },
            Category {
                id: "c3".to_string(),
                name: "Grandchild".to_string(),
                parent_id: Some("c2".to_string()),
                domain: "customer".to_string(),
                description: String::new(),
                keywords: vec![],
                rules: vec![],
                entity_count: 0,
            },
        ];
        assert_eq!(
            build_category_path("c3", &cats),
            "Root / Child / Grandchild"
        );
    }

    #[test]
    fn test_build_category_path_not_found() {
        assert_eq!(build_category_path("nonexistent", &[]), "");
    }

    #[test]
    fn test_build_category_path_cycle_guard() {
        // Self-referencing parent should terminate
        let cats = vec![Category {
            id: "c1".to_string(),
            name: "Loop".to_string(),
            parent_id: Some("c1".to_string()),
            domain: "customer".to_string(),
            description: String::new(),
            keywords: vec![],
            rules: vec![],
            entity_count: 0,
        }];
        assert_eq!(build_category_path("c1", &cats), "Loop");
    }

    // --- Impact analysis ---
    #[test]
    fn test_calculate_risk_level_critical() {
        let impacted = vec![ImpactedEntity {
            entity_id: "e1".to_string(),
            entity_name: "E1".to_string(),
            domain: "customer".to_string(),
            impact_severity: ImpactSeverity::Critical,
            change_required: true,
        }];
        assert!(matches!(
            calculate_risk_level(&impacted),
            ImpactSeverity::Critical
        ));
    }

    #[test]
    fn test_calculate_risk_level_high() {
        let impacted = vec![
            ImpactedEntity {
                entity_id: "e1".to_string(),
                entity_name: "E1".to_string(),
                domain: "customer".to_string(),
                impact_severity: ImpactSeverity::Low,
                change_required: true,
            },
            ImpactedEntity {
                entity_id: "e2".to_string(),
                entity_name: "E2".to_string(),
                domain: "customer".to_string(),
                impact_severity: ImpactSeverity::High,
                change_required: true,
            },
        ];
        assert!(matches!(
            calculate_risk_level(&impacted),
            ImpactSeverity::High
        ));
    }

    #[test]
    fn test_calculate_risk_level_empty() {
        assert!(matches!(calculate_risk_level(&[]), ImpactSeverity::None));
    }

    #[test]
    fn test_calculate_risk_level_medium_and_low() {
        let impacted = vec![ImpactedEntity {
            entity_id: "e1".to_string(),
            entity_name: "E1".to_string(),
            domain: "customer".to_string(),
            impact_severity: ImpactSeverity::Medium,
            change_required: true,
        }];
        assert!(matches!(
            calculate_risk_level(&impacted),
            ImpactSeverity::Medium
        ));
    }

    #[test]
    fn test_estimate_migration_effort_schema_change() {
        let impacted = vec![
            ImpactedEntity {
                entity_id: "e1".to_string(),
                entity_name: "E1".to_string(),
                domain: "customer".to_string(),
                impact_severity: ImpactSeverity::High,
                change_required: true,
            },
            ImpactedEntity {
                entity_id: "e2".to_string(),
                entity_name: "E2".to_string(),
                domain: "customer".to_string(),
                impact_severity: ImpactSeverity::Low,
                change_required: false,
            },
        ];
        // base=8, high=2.0, low=0.5 => 8*2 + 8*0.5 = 20
        let effort = estimate_migration_effort(&impacted, &ChangeType::SchemaChange);
        assert!((effort - 20.0).abs() < 1e-9);
    }

    #[test]
    fn test_estimate_migration_effort_data_change() {
        let impacted = vec![ImpactedEntity {
            entity_id: "e1".to_string(),
            entity_name: "E1".to_string(),
            domain: "customer".to_string(),
            impact_severity: ImpactSeverity::Critical,
            change_required: true,
        }];
        // base=3, critical=3.0 => 9
        let effort = estimate_migration_effort(&impacted, &ChangeType::DataChange);
        assert!((effort - 9.0).abs() < 1e-9);
    }

    #[test]
    fn test_estimate_migration_effort_business_rule_change() {
        let impacted = vec![ImpactedEntity {
            entity_id: "e1".to_string(),
            entity_name: "E1".to_string(),
            domain: "customer".to_string(),
            impact_severity: ImpactSeverity::None,
            change_required: false,
        }];
        // base=5, none=0.0 => 0
        let effort = estimate_migration_effort(&impacted, &ChangeType::BusinessRuleChange);
        assert!((effort - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_estimate_migration_effort_empty() {
        assert_eq!(
            estimate_migration_effort(&[], &ChangeType::SchemaChange),
            0.0
        );
    }

    #[test]
    fn test_generate_impact_report_structure() {
        let result = ImpactAnalysisResult {
            impacted_entities: vec![ImpactedEntity {
                entity_id: "e1".to_string(),
                entity_name: "Entity One".to_string(),
                domain: "customer".to_string(),
                impact_severity: ImpactSeverity::High,
                change_required: true,
            }],
            risk_level: ImpactSeverity::High,
            estimated_effort: 16.0,
            recommendations: vec!["Review schema".to_string()],
        };
        let report = generate_impact_report(&result);
        assert!(report.contains("影响分析报告"));
        assert!(report.contains("风险等级"));
        assert!(report.contains("预估工作量"));
        assert!(report.contains("Entity One"));
        assert!(report.contains("Review schema"));
    }

    #[test]
    fn test_generate_impact_report_empty() {
        let result = ImpactAnalysisResult {
            impacted_entities: vec![],
            risk_level: ImpactSeverity::None,
            estimated_effort: 0.0,
            recommendations: vec![],
        };
        let report = generate_impact_report(&result);
        assert!(report.contains("影响分析报告"));
        assert!(report.contains("受影响实体数: 0"));
    }

    // --- Parse functions ---
    #[test]
    fn test_parse_classification_valid() {
        assert_eq!(
            parse_classification("public"),
            Some(CatalogClassification::Public)
        );
        assert_eq!(
            parse_classification("internal"),
            Some(CatalogClassification::Internal)
        );
        assert_eq!(
            parse_classification("confidential"),
            Some(CatalogClassification::Confidential)
        );
        assert_eq!(
            parse_classification("restricted"),
            Some(CatalogClassification::Restricted)
        );
    }

    #[test]
    fn test_parse_classification_case_insensitive() {
        assert_eq!(
            parse_classification("PUBLIC"),
            Some(CatalogClassification::Public)
        );
        assert_eq!(
            parse_classification("Internal"),
            Some(CatalogClassification::Internal)
        );
    }

    #[test]
    fn test_parse_classification_invalid() {
        assert_eq!(parse_classification("unknown"), None);
        assert_eq!(parse_classification(""), None);
    }

    #[test]
    fn test_parse_field_type_valid() {
        assert_eq!(parse_field_type("string"), Some(MetadataFieldType::String));
        assert_eq!(
            parse_field_type("integer"),
            Some(MetadataFieldType::Integer)
        );
        assert_eq!(
            parse_field_type("decimal"),
            Some(MetadataFieldType::Decimal)
        );
        assert_eq!(
            parse_field_type("boolean"),
            Some(MetadataFieldType::Boolean)
        );
        assert_eq!(parse_field_type("date"), Some(MetadataFieldType::Date));
        assert_eq!(
            parse_field_type("datetime"),
            Some(MetadataFieldType::DateTime)
        );
        assert_eq!(parse_field_type("enum"), Some(MetadataFieldType::Enum));
        assert_eq!(
            parse_field_type("reference"),
            Some(MetadataFieldType::Reference)
        );
        assert_eq!(parse_field_type("json"), Some(MetadataFieldType::Json));
        assert_eq!(parse_field_type("binary"), Some(MetadataFieldType::Binary));
    }

    #[test]
    fn test_parse_field_type_case_insensitive() {
        assert_eq!(parse_field_type("STRING"), Some(MetadataFieldType::String));
        assert_eq!(
            parse_field_type("Integer"),
            Some(MetadataFieldType::Integer)
        );
    }

    #[test]
    fn test_parse_field_type_invalid() {
        assert_eq!(parse_field_type("unknown"), None);
        assert_eq!(parse_field_type(""), None);
    }

    #[test]
    fn test_parse_widget_type_valid() {
        assert_eq!(parse_widget_type("kpi_card"), Some(WidgetType::KpiCard));
        assert_eq!(parse_widget_type("kpicard"), Some(WidgetType::KpiCard));
        assert_eq!(parse_widget_type("bar_chart"), Some(WidgetType::BarChart));
        assert_eq!(parse_widget_type("line_chart"), Some(WidgetType::LineChart));
        assert_eq!(parse_widget_type("pie_chart"), Some(WidgetType::PieChart));
        assert_eq!(parse_widget_type("heat_map"), Some(WidgetType::HeatMap));
        assert_eq!(parse_widget_type("data_table"), Some(WidgetType::DataTable));
        assert_eq!(parse_widget_type("gauge"), Some(WidgetType::Gauge));
        assert_eq!(parse_widget_type("trend_line"), Some(WidgetType::TrendLine));
        assert_eq!(
            parse_widget_type("radar_chart"),
            Some(WidgetType::RadarChart)
        );
        assert_eq!(parse_widget_type("tree_map"), Some(WidgetType::TreeMap));
    }

    #[test]
    fn test_parse_widget_type_case_insensitive() {
        assert_eq!(parse_widget_type("KPI_CARD"), Some(WidgetType::KpiCard));
        assert_eq!(parse_widget_type("BarChart"), Some(WidgetType::BarChart));
    }

    #[test]
    fn test_parse_widget_type_invalid() {
        assert_eq!(parse_widget_type("unknown"), None);
        assert_eq!(parse_widget_type(""), None);
    }

    #[test]
    fn test_parse_report_type_valid() {
        assert_eq!(
            parse_report_type("quality_report"),
            Some(ReportType::QualityReport)
        );
        assert_eq!(
            parse_report_type("maturity_report"),
            Some(ReportType::MaturityReport)
        );
        assert_eq!(
            parse_report_type("compliance_report"),
            Some(ReportType::ComplianceReport)
        );
        assert_eq!(
            parse_report_type("stewardship_report"),
            Some(ReportType::StewardshipReport)
        );
        assert_eq!(
            parse_report_type("data_asset_report"),
            Some(ReportType::DataAssetReport)
        );
        assert_eq!(
            parse_report_type("executive_summary"),
            Some(ReportType::ExecutiveSummary)
        );
    }

    #[test]
    fn test_parse_report_type_case_insensitive() {
        assert_eq!(
            parse_report_type("QUALITY_REPORT"),
            Some(ReportType::QualityReport)
        );
        assert_eq!(
            parse_report_type("qualityreport"),
            Some(ReportType::QualityReport)
        );
    }

    #[test]
    fn test_parse_report_type_invalid() {
        assert_eq!(parse_report_type("unknown"), None);
        assert_eq!(parse_report_type(""), None);
    }

    #[test]
    fn test_parse_report_frequency_valid() {
        assert_eq!(
            parse_report_frequency("daily"),
            Some(ReportFrequency::Daily)
        );
        assert_eq!(
            parse_report_frequency("weekly"),
            Some(ReportFrequency::Weekly)
        );
        assert_eq!(
            parse_report_frequency("monthly"),
            Some(ReportFrequency::Monthly)
        );
        assert_eq!(
            parse_report_frequency("quarterly"),
            Some(ReportFrequency::Quarterly)
        );
        assert_eq!(
            parse_report_frequency("yearly"),
            Some(ReportFrequency::Yearly)
        );
        assert_eq!(
            parse_report_frequency("on_demand"),
            Some(ReportFrequency::OnDemand)
        );
        assert_eq!(
            parse_report_frequency("ondemand"),
            Some(ReportFrequency::OnDemand)
        );
    }

    #[test]
    fn test_parse_report_frequency_invalid() {
        assert_eq!(parse_report_frequency("hourly"), None);
        assert_eq!(parse_report_frequency(""), None);
    }

    #[test]
    fn test_parse_report_format_valid() {
        assert_eq!(parse_report_format("PDF"), Some(ReportFormat::PDF));
        assert_eq!(parse_report_format("EXCEL"), Some(ReportFormat::Excel));
        assert_eq!(parse_report_format("HTML"), Some(ReportFormat::HTML));
        assert_eq!(parse_report_format("JSON"), Some(ReportFormat::JSON));
        assert_eq!(
            parse_report_format("MARKDOWN"),
            Some(ReportFormat::Markdown)
        );
    }

    #[test]
    fn test_parse_report_format_case_insensitive() {
        assert_eq!(parse_report_format("pdf"), Some(ReportFormat::PDF));
        assert_eq!(parse_report_format("Excel"), Some(ReportFormat::Excel));
    }

    #[test]
    fn test_parse_report_format_invalid() {
        assert_eq!(parse_report_format("csv"), None);
        assert_eq!(parse_report_format(""), None);
    }

    #[test]
    fn test_calculate_next_run_daily() {
        let now = chrono::Utc::now();
        let next = calculate_next_run(&ReportFrequency::Daily);
        assert!(next > now);
        let diff = next - now;
        assert!(diff.num_hours() >= 23 && diff.num_hours() <= 25);
    }

    #[test]
    fn test_calculate_next_run_on_demand_is_now() {
        let now = chrono::Utc::now();
        let next = calculate_next_run(&ReportFrequency::OnDemand);
        let diff = next - now;
        assert!(diff.num_seconds() < 5);
    }

    #[test]
    fn test_calculate_next_run_weekly() {
        let now = chrono::Utc::now();
        let next = calculate_next_run(&ReportFrequency::Weekly);
        let diff = next - now;
        assert!(diff.num_days() >= 6 && diff.num_days() <= 8);
    }

    #[test]
    fn test_parse_audit_framework_valid() {
        assert_eq!(parse_audit_framework("gdpr"), Some(AuditFramework::GDPR));
        assert_eq!(parse_audit_framework("sox"), Some(AuditFramework::SOX));
        assert_eq!(
            parse_audit_framework("iso27001"),
            Some(AuditFramework::ISO27001)
        );
        assert_eq!(
            parse_audit_framework("iso_27001"),
            Some(AuditFramework::ISO27001)
        );
        assert_eq!(
            parse_audit_framework("data_governance"),
            Some(AuditFramework::DataGovernance)
        );
        assert_eq!(
            parse_audit_framework("datagovernance"),
            Some(AuditFramework::DataGovernance)
        );
        assert_eq!(
            parse_audit_framework("internal_policy"),
            Some(AuditFramework::InternalPolicy)
        );
        assert_eq!(
            parse_audit_framework("internalpolicy"),
            Some(AuditFramework::InternalPolicy)
        );
        assert_eq!(
            parse_audit_framework("custom"),
            Some(AuditFramework::Custom)
        );
    }

    #[test]
    fn test_parse_audit_framework_case_insensitive() {
        assert_eq!(parse_audit_framework("GDPR"), Some(AuditFramework::GDPR));
        assert_eq!(parse_audit_framework("Sox"), Some(AuditFramework::SOX));
    }

    #[test]
    fn test_parse_audit_framework_invalid() {
        assert_eq!(parse_audit_framework("unknown"), None);
        assert_eq!(parse_audit_framework(""), None);
    }

    #[test]
    fn test_parse_finding_severity_valid() {
        assert_eq!(parse_finding_severity("low"), Some(FindingSeverity::Low));
        assert_eq!(
            parse_finding_severity("medium"),
            Some(FindingSeverity::Medium)
        );
        assert_eq!(parse_finding_severity("high"), Some(FindingSeverity::High));
        assert_eq!(
            parse_finding_severity("critical"),
            Some(FindingSeverity::Critical)
        );
    }

    #[test]
    fn test_parse_finding_severity_invalid() {
        assert_eq!(parse_finding_severity("none"), None);
        assert_eq!(parse_finding_severity(""), None);
    }

    #[test]
    fn test_parse_finding_status_valid() {
        assert_eq!(parse_finding_status("open"), Some(FindingStatus::Open));
        assert_eq!(
            parse_finding_status("in_progress"),
            Some(FindingStatus::InProgress)
        );
        assert_eq!(
            parse_finding_status("inprogress"),
            Some(FindingStatus::InProgress)
        );
        assert_eq!(
            parse_finding_status("resolved"),
            Some(FindingStatus::Resolved)
        );
        assert_eq!(
            parse_finding_status("accepted"),
            Some(FindingStatus::Accepted)
        );
        assert_eq!(
            parse_finding_status("false_positive"),
            Some(FindingStatus::FalsePositive)
        );
        assert_eq!(
            parse_finding_status("falsepositive"),
            Some(FindingStatus::FalsePositive)
        );
    }

    #[test]
    fn test_parse_finding_status_invalid() {
        assert_eq!(parse_finding_status("closed"), None);
        assert_eq!(parse_finding_status(""), None);
    }

    // --- compliance_grade ---
    #[test]
    fn test_compliance_grade_a() {
        assert_eq!(compliance_grade(95.0), "A");
        assert_eq!(compliance_grade(90.0), "A");
    }

    #[test]
    fn test_compliance_grade_b() {
        assert_eq!(compliance_grade(85.0), "B");
        assert_eq!(compliance_grade(80.0), "B");
    }

    #[test]
    fn test_compliance_grade_c() {
        assert_eq!(compliance_grade(75.0), "C");
        assert_eq!(compliance_grade(70.0), "C");
    }

    #[test]
    fn test_compliance_grade_d() {
        assert_eq!(compliance_grade(65.0), "D");
        assert_eq!(compliance_grade(60.0), "D");
    }

    #[test]
    fn test_compliance_grade_f() {
        assert_eq!(compliance_grade(59.9), "F");
        assert_eq!(compliance_grade(0.0), "F");
        assert_eq!(compliance_grade(-10.0), "F");
    }

    // --- check_required ---
    fn make_quality_rule(field_name: &str, config: serde_json::Value) -> QualityRule {
        QualityRule {
            id: uuid::Uuid::new_v4(),
            name: "test-rule".to_string(),
            description: "test description".to_string(),
            domain: "customer".to_string(),
            field_name: field_name.to_string(),
            rule_type: QualityRuleType::Required,
            severity: QualitySeverity::Error,
            config,
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn test_check_required_finds_empty_field() {
        let mut r = make_master_data_ref();
        r.name = None;
        let rule = make_quality_rule("name", serde_json::json!({}));
        let issues = check_required(&rule, &[r]);
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].field_name, "name");
    }

    #[test]
    fn test_check_required_no_issue_when_filled() {
        let r = make_master_data_ref();
        let rule = make_quality_rule("code", serde_json::json!({}));
        let issues = check_required(&rule, &[r]);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_check_required_with_default_value() {
        let mut r = make_master_data_ref();
        r.name = None;
        let rule = make_quality_rule("name", serde_json::json!({ "default_value": "Unknown" }));
        let issues = check_required(&rule, &[r]);
        assert_eq!(issues.len(), 1);
        assert!(issues[0]
            .suggestion
            .as_deref()
            .unwrap_or("")
            .contains("Unknown"));
    }

    #[test]
    fn test_check_required_empty_records() {
        let rule = make_quality_rule("code", serde_json::json!({}));
        let issues = check_required(&rule, &[]);
        assert!(issues.is_empty());
    }

    // --- check_format ---
    #[test]
    fn test_check_format_no_pattern_returns_empty() {
        let r = make_master_data_ref();
        let rule = make_quality_rule("code", serde_json::json!({}));
        let issues = check_format(&rule, &[r]);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_check_format_valid_pattern_no_issue() {
        let r = make_master_data_ref();
        let rule = make_quality_rule("code", serde_json::json!({ "pattern": "^[A-Z0-9]+$" }));
        let issues = check_format(&rule, &[r]);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_check_format_invalid_value_finds_issue() {
        let mut r = make_master_data_ref();
        r.code = "abc!".to_string();
        let rule = make_quality_rule("code", serde_json::json!({ "pattern": "^[A-Z0-9]+$" }));
        let issues = check_format(&rule, &[r]);
        assert_eq!(issues.len(), 1);
    }

    #[test]
    fn test_check_format_invalid_regex_returns_empty() {
        let r = make_master_data_ref();
        let rule = make_quality_rule("code", serde_json::json!({ "pattern": "[invalid(" }));
        let issues = check_format(&rule, &[r]);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_check_format_empty_value_skipped() {
        let mut r = make_master_data_ref();
        r.name = None;
        let rule = make_quality_rule("name", serde_json::json!({ "pattern": "^[A-Z]" }));
        let issues = check_format(&rule, &[r]);
        assert!(issues.is_empty());
    }

    // --- check_range ---
    #[test]
    fn test_check_range_within_bounds_no_issue() {
        let mut r = make_master_data_ref();
        r.code = "50".to_string();
        let rule = make_quality_rule("code", serde_json::json!({ "min": 0, "max": 100 }));
        let issues = check_range(&rule, &[r]);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_check_range_too_low_finds_issue() {
        let mut r = make_master_data_ref();
        r.code = "5".to_string();
        let rule = make_quality_rule("code", serde_json::json!({ "min": 10, "max": 100 }));
        let issues = check_range(&rule, &[r]);
        assert_eq!(issues.len(), 1);
    }

    #[test]
    fn test_check_range_too_high_finds_issue() {
        let mut r = make_master_data_ref();
        r.code = "200".to_string();
        let rule = make_quality_rule("code", serde_json::json!({ "min": 10, "max": 100 }));
        let issues = check_range(&rule, &[r]);
        assert_eq!(issues.len(), 1);
    }

    #[test]
    fn test_check_range_non_numeric_skipped() {
        let r = make_master_data_ref();
        let rule = make_quality_rule("code", serde_json::json!({ "min": 10, "max": 100 }));
        let issues = check_range(&rule, &[r]);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_check_range_only_min() {
        let mut r = make_master_data_ref();
        r.code = "5".to_string();
        let rule = make_quality_rule("code", serde_json::json!({ "min": 10 }));
        let issues = check_range(&rule, &[r]);
        assert_eq!(issues.len(), 1);
        assert!(issues[0].expected.contains(">="));
    }

    #[test]
    fn test_check_range_only_max() {
        let mut r = make_master_data_ref();
        r.code = "200".to_string();
        let rule = make_quality_rule("code", serde_json::json!({ "max": 100 }));
        let issues = check_range(&rule, &[r]);
        assert_eq!(issues.len(), 1);
        assert!(issues[0].expected.contains("<="));
    }

    // --- build_risk_factors_and_recommendations ---
    #[test]
    fn test_build_risk_factors_all_good() {
        let p = make_entity_profile();
        let (factors, recs) =
            build_risk_factors_and_recommendations(&p, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0);
        // When all scores are good, the function pushes a default "no risk" factor
        assert!(factors.iter().any(|f| f.contains("无明显风险")));
        assert!(!recs.is_empty());
    }

    #[test]
    fn test_build_risk_factors_low_completeness() {
        let p = make_entity_profile();
        let (factors, recs) =
            build_risk_factors_and_recommendations(&p, 50.0, 100.0, 100.0, 100.0, 100.0, 100.0);
        assert!(factors.iter().any(|f| f.contains("完整性")));
        assert!(recs.iter().any(|r| r.contains("必填字段")));
    }

    #[test]
    fn test_build_risk_factors_low_accuracy() {
        let p = make_entity_profile();
        let (factors, _recs) =
            build_risk_factors_and_recommendations(&p, 100.0, 50.0, 100.0, 100.0, 100.0, 100.0);
        assert!(factors.iter().any(|f| f.contains("准确性")));
    }

    #[test]
    fn test_build_risk_factors_low_consistency() {
        let p = make_entity_profile();
        let (factors, _recs) =
            build_risk_factors_and_recommendations(&p, 100.0, 100.0, 50.0, 100.0, 100.0, 100.0);
        assert!(factors.iter().any(|f| f.contains("一致性")));
    }

    // --- score_entity_internal ---
    #[test]
    fn test_score_entity_internal_returns_scores() {
        let p = make_entity_profile();
        let score = score_entity_internal(&p);
        assert_eq!(score.entity_id, "e1");
        assert_eq!(score.domain, "customer");
        assert!(score.overall_score >= 0.0);
        assert!(score.completeness_score >= 0.0);
        assert!(!score.risk_level.is_empty());
        assert!(!score.scored_at.is_empty());
    }

    #[test]
    fn test_score_entity_internal_perfect_profile() {
        let mut p = make_entity_profile();
        p.fields
            .insert("code".to_string(), Some("C001".to_string()));
        p.fields
            .insert("name".to_string(), Some("Alice".to_string()));
        p.fields
            .insert("address".to_string(), Some("123 St".to_string()));
        let score = score_entity_internal(&p);
        assert!(score.completeness_score > 0.0);
    }

    // --- build_preset_categories ---
    #[test]
    fn test_build_preset_categories_nonempty() {
        let cats = build_preset_categories();
        assert!(!cats.is_empty());
    }

    #[test]
    fn test_build_preset_categories_has_customer_tech() {
        let cats = build_preset_categories();
        assert!(cats.iter().any(|c| c.id == "cust-industry-tech"));
    }

    #[test]
    fn test_build_preset_categories_all_have_domain() {
        let cats = build_preset_categories();
        assert!(cats.iter().all(|c| !c.domain.is_empty()));
    }

    // --- build_preset_rules ---
    #[test]
    fn test_build_preset_rules_nonempty() {
        let rules = build_preset_rules();
        assert!(!rules.is_empty());
    }

    #[test]
    fn test_build_preset_rules_has_customer_tech_rule() {
        let rules = build_preset_rules();
        assert!(rules.iter().any(|r| r.id == "rule-cust-tech"));
    }

    #[test]
    fn test_build_preset_rules_all_enabled() {
        let rules = build_preset_rules();
        assert!(rules.iter().all(|r| r.enabled));
    }

    // --- tfidf_score ---
    #[test]
    fn test_tfidf_score_matching_keywords() {
        let cats = build_preset_categories();
        let results = tfidf_score("科技公司", &cats);
        assert!(!results.is_empty());
        assert!(results[0].2.iter().any(|k| k.contains("科技")));
    }

    #[test]
    fn test_tfidf_score_no_match_returns_empty() {
        let cats = build_preset_categories();
        let results = tfidf_score("zzzzz", &cats);
        assert!(results.is_empty());
    }

    #[test]
    fn test_tfidf_score_sorted_desc() {
        let cats = build_preset_categories();
        let results = tfidf_score("科技贸易制造", &cats);
        for i in 1..results.len() {
            assert!(results[i - 1].1 >= results[i].1);
        }
    }

    #[test]
    fn test_tfidf_score_empty_text() {
        let cats = build_preset_categories();
        let results = tfidf_score("", &cats);
        assert!(results.is_empty());
    }

    // --- apply_rules ---
    #[test]
    fn test_apply_rules_matching_name() {
        let p = EntityProfile {
            id: "e1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("科技公司".to_string()),
            fields: HashMap::new(),
            last_synced_days_ago: 0,
        };
        let rules = build_preset_rules();
        let hits = apply_rules(&p, &rules);
        assert!(!hits.is_empty());
        assert!(hits
            .iter()
            .any(|(cat_id, _)| cat_id == "cust-industry-tech"));
    }

    #[test]
    fn test_apply_rules_no_match_returns_empty() {
        let p = EntityProfile {
            id: "e1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("普通公司".to_string()),
            fields: HashMap::new(),
            last_synced_days_ago: 0,
        };
        let rules = build_preset_rules();
        let hits = apply_rules(&p, &rules);
        assert!(hits.is_empty());
    }

    #[test]
    fn test_apply_rules_wrong_domain_skipped() {
        let p = EntityProfile {
            id: "e1".to_string(),
            domain: "material".to_string(),
            code: "M001".to_string(),
            name: Some("科技公司".to_string()),
            fields: HashMap::new(),
            last_synced_days_ago: 0,
        };
        let rules = build_preset_rules();
        let hits = apply_rules(&p, &rules);
        assert!(hits.iter().all(|(cat_id, _)| !cat_id.starts_with("cust-")));
    }

    // --- detect_anomalies_internal ---
    #[test]
    fn test_detect_anomalies_stale_data() {
        let p = EntityProfile {
            id: "e1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("Alice".to_string()),
            fields: HashMap::new(),
            last_synced_days_ago: 100,
        };
        let anomalies = detect_anomalies_internal(&[p]);
        assert!(anomalies.iter().any(|a| a.anomaly_type == "threshold"));
    }

    #[test]
    fn test_detect_anomalies_missing_required_field() {
        let p = EntityProfile {
            id: "e1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("Alice".to_string()),
            fields: HashMap::new(),
            last_synced_days_ago: 1,
        };
        let anomalies = detect_anomalies_internal(&[p]);
        assert!(anomalies.iter().any(|a| a.anomaly_type == "null_spike"));
    }

    #[test]
    fn test_detect_anomalies_empty_profiles() {
        let anomalies = detect_anomalies_internal(&[]);
        assert!(anomalies.is_empty());
    }

    #[test]
    fn test_detect_anomalies_healthy_profile() {
        let mut fields = HashMap::new();
        fields.insert("code".to_string(), Some("C001".to_string()));
        fields.insert("name".to_string(), Some("Alice".to_string()));
        fields.insert("phone".to_string(), Some("138".to_string()));
        fields.insert("email".to_string(), Some("a@b.com".to_string()));
        fields.insert("address".to_string(), Some("St".to_string()));
        let p = EntityProfile {
            id: "e1".to_string(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: Some("Alice".to_string()),
            fields,
            last_synced_days_ago: 1,
        };
        let anomalies = detect_anomalies_internal(&[p]);
        assert!(anomalies.is_empty());
    }

    // --- build_synthetic_assessment ---
    #[test]
    fn test_build_synthetic_assessment_basic() {
        let a = build_synthetic_assessment("asm-001", 60.0);
        assert_eq!(a.assessment_id, "asm-001");
        assert!(!a.dimensions.is_empty());
    }

    #[test]
    fn test_build_synthetic_assessment_clamps_scores() {
        let a = build_synthetic_assessment("asm-002", 200.0);
        for d in &a.dimensions {
            assert!(d.score <= 95.0);
        }
    }

    #[test]
    fn test_build_synthetic_assessment_low_base() {
        let a = build_synthetic_assessment("asm-003", 0.0);
        for d in &a.dimensions {
            assert!(d.score >= 5.0);
        }
    }

    #[test]
    fn test_build_synthetic_assessment_has_dimensions() {
        let a = build_synthetic_assessment("asm-004", 50.0);
        assert!(a.dimensions.len() >= 8);
    }
}
