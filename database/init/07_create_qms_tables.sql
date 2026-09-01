-- TOPEMS QMS 质量模块建表 DDL
-- 来源：svc/qms/src/modules/mod.rs 的 init_database()（26 张 qa_* 表，代码内联同款）
-- 用途：数据库重建 / 初始化时可执行本脚本恢复 qms schema 与全部表
-- 说明：与服务启动时 init_database()（CREATE SCHEMA IF NOT EXISTS + CREATE TABLE IF NOT EXISTS）幂等共存，重复执行无害
CREATE SCHEMA IF NOT EXISTS qms;

CREATE TABLE IF NOT EXISTS qms.qa_quality_inspections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            inspection_no VARCHAR(64) NOT NULL UNIQUE,
            inspection_type VARCHAR(32) NOT NULL,
            product_id UUID,
            product_name VARCHAR(256),
            standard_id UUID,
            quantity DECIMAL(12,2) NOT NULL,
            qualified_quantity DECIMAL(12,2),
            unqualified_quantity DECIMAL(12,2),
            qualification_rate DECIMAL(5,2),
            status VARCHAR(32) DEFAULT 'pending',
            inspector VARCHAR(64),
            assignee VARCHAR(64),
            inspected_at TIMESTAMP,
            result VARCHAR(32),
            memo TEXT,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_inspection_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            inspection_id UUID NOT NULL REFERENCES qa_quality_inspections(id) ON DELETE CASCADE,
            item_name VARCHAR(256) NOT NULL,
            standard_value VARCHAR(256),
            measured_value VARCHAR(256),
            is_qualified BOOLEAN NOT NULL,
            remark TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_inspection_audits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            inspection_id UUID NOT NULL REFERENCES qa_quality_inspections(id) ON DELETE CASCADE,
            status_from VARCHAR(32) NOT NULL,
            status_to VARCHAR(32) NOT NULL,
            action VARCHAR(64) NOT NULL,
            operator VARCHAR(64) NOT NULL,
            comment TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_quality_issues (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issue_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            severity VARCHAR(32),
            status VARCHAR(32) DEFAULT 'open',
            source VARCHAR(32),
            related_inspection_id UUID,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_standards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            category VARCHAR(64) NOT NULL,
            level VARCHAR(32),
            specification TEXT,
            description TEXT,
            version VARCHAR(16) DEFAULT '1.0',
            status VARCHAR(32) DEFAULT 'active',
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_standard_revisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            standard_id UUID NOT NULL REFERENCES qa_standards(id) ON DELETE CASCADE,
            version VARCHAR(16) NOT NULL,
            name VARCHAR(256) NOT NULL,
            category VARCHAR(64) NOT NULL,
            level VARCHAR(32),
            specification TEXT,
            description TEXT,
            status VARCHAR(32),
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_qms_sync_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sync_no VARCHAR(64) NOT NULL UNIQUE,
            sync_type VARCHAR(32) NOT NULL,
            source_id UUID,
            target_service VARCHAR(32) NOT NULL,
            target_id UUID,
            status VARCHAR(32) DEFAULT 'pending',
            payload JSONB,
            response JSONB,
            error_msg TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_corrective_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action_no VARCHAR(64) NOT NULL UNIQUE,
            issue_id UUID REFERENCES qa_quality_issues(id),
            title VARCHAR(256) NOT NULL,
            description TEXT,
            root_cause TEXT,
            action_type VARCHAR(32),
            status VARCHAR(32) DEFAULT 'pending',
            priority VARCHAR(32) DEFAULT 'medium',
            assignee VARCHAR(64),
            target_date TIMESTAMP,
            completed_at TIMESTAMP,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_corrective_action_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action_id UUID NOT NULL REFERENCES qa_corrective_actions(id) ON DELETE CASCADE,
            item_name VARCHAR(256) NOT NULL,
            responsible VARCHAR(64),
            due_date TIMESTAMP,
            status VARCHAR(32) DEFAULT 'pending',
            completed_at TIMESTAMP,
            remark TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_audit_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            audit_type VARCHAR(32) NOT NULL,
            scope TEXT,
            standard_id UUID REFERENCES qa_standards(id),
            status VARCHAR(32) DEFAULT 'draft',
            scheduled_start TIMESTAMP,
            scheduled_end TIMESTAMP,
            actual_start TIMESTAMP,
            actual_end TIMESTAMP,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_audit_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_no VARCHAR(64) NOT NULL UNIQUE,
            plan_id UUID NOT NULL REFERENCES qa_audit_plans(id) ON DELETE CASCADE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            auditor VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            completed_at TIMESTAMP,
            finding_count INT DEFAULT 0,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_audit_findings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            finding_no VARCHAR(64) NOT NULL UNIQUE,
            task_id UUID REFERENCES qa_audit_tasks(id),
            plan_id UUID REFERENCES qa_audit_plans(id),
            title VARCHAR(256) NOT NULL,
            description TEXT,
            severity VARCHAR(32) DEFAULT 'minor',
            category VARCHAR(64),
            status VARCHAR(32) DEFAULT 'open',
            recommendation TEXT,
            responsible VARCHAR(64),
            target_date TIMESTAMP,
            verified_at TIMESTAMP,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_spc_charts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chart_no VARCHAR(64) NOT NULL UNIQUE,
            chart_type VARCHAR(32) NOT NULL,
            product_id UUID,
            product_name VARCHAR(256),
            parameter_name VARCHAR(256) NOT NULL,
            ucl DECIMAL(12,4),
            cl DECIMAL(12,4),
            lcl DECIMAL(12,4),
            cp DECIMAL(8,4),
            cpk DECIMAL(8,4),
            pp DECIMAL(8,4),
            ppk DECIMAL(8,4),
            sample_count INT DEFAULT 0,
            status VARCHAR(32) DEFAULT 'active',
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_spc_data_points (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chart_id UUID NOT NULL REFERENCES qa_spc_charts(id) ON DELETE CASCADE,
            sample_no INT NOT NULL,
            value DECIMAL(12,4) NOT NULL,
            subgroup_size INT,
            is_out_of_control BOOLEAN DEFAULT false,
            trend_flag VARCHAR(32),
            measured_at TIMESTAMP,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_quality_costs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cost_no VARCHAR(64) NOT NULL UNIQUE,
            cost_category VARCHAR(32) NOT NULL,
            cost_type VARCHAR(64),
            amount DECIMAL(12,2) NOT NULL,
            department VARCHAR(64),
            description TEXT,
            related_issue_id UUID,
            incurred_date TIMESTAMP,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_eightd_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            status VARCHAR(32) DEFAULT 'new',
            severity VARCHAR(32),
            priority VARCHAR(32),
            related_issue_id UUID,
            d1_team TEXT,
            d1_leader VARCHAR(64),
            d2_problem_description TEXT,
            d3_containment_action TEXT,
            d3_implemented_at TIMESTAMP,
            d4_root_cause TEXT,
            d4_cause_analysis TEXT,
            d5_permanent_action TEXT,
            d6_verification_result TEXT,
            d6_verified_at TIMESTAMP,
            d7_preventive_action TEXT,
            d8_congratulations TEXT,
            d8_closed_at TIMESTAMP,
            tenant_id UUID,
            assignee VARCHAR(64),
            due_date TIMESTAMP,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_eightd_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL REFERENCES qa_eightd_reports(id) ON DELETE CASCADE,
            action VARCHAR(32) NOT NULL,
            step VARCHAR(8),
            operator VARCHAR(64),
            comment TEXT,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_fmea_analyses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fmea_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            fmea_type VARCHAR(32) NOT NULL,
            product_id UUID,
            product_name VARCHAR(256),
            process_id UUID,
            process_name VARCHAR(256),
            scope TEXT,
            status VARCHAR(32) DEFAULT 'draft',
            revision VARCHAR(16),
            team TEXT,
            leader VARCHAR(64),
            description TEXT,
            tenant_id UUID,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_fmea_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fmea_id UUID NOT NULL REFERENCES qa_fmea_analyses(id) ON DELETE CASCADE,
            component VARCHAR(256) NOT NULL,
            function VARCHAR(256),
            failure_mode VARCHAR(256) NOT NULL,
            failure_effect TEXT,
            failure_cause TEXT,
            severity INT NOT NULL DEFAULT 1,
            occurrence INT NOT NULL DEFAULT 1,
            detection INT NOT NULL DEFAULT 1,
            rpn INT,
            current_controls TEXT,
            recommended_actions TEXT,
            responsible VARCHAR(64),
            target_date TIMESTAMP,
            action_status VARCHAR(32) DEFAULT 'open',
            revised_severity INT,
            revised_occurrence INT,
            revised_detection INT,
            revised_rpn INT,
            sort_order INT DEFAULT 0,
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_alert_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rule_name VARCHAR(256) NOT NULL,
            alert_type VARCHAR(32) NOT NULL,
            metric VARCHAR(64) NOT NULL,
            condition VARCHAR(16) NOT NULL,
            threshold DECIMAL(12,4) NOT NULL,
            duration INT,
            severity VARCHAR(32),
            status VARCHAR(32) DEFAULT 'active',
            notification_type VARCHAR(32),
            recipients TEXT,
            description TEXT,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_alert_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rule_id UUID,
            rule_name VARCHAR(256),
            alert_type VARCHAR(32) NOT NULL,
            severity VARCHAR(32),
            title VARCHAR(256) NOT NULL,
            message TEXT,
            metric_value DECIMAL(12,4),
            threshold DECIMAL(12,4),
            status VARCHAR(32) DEFAULT 'active',
            acknowledged_by VARCHAR(64),
            acknowledged_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_apqp_projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_no VARCHAR(64) NOT NULL UNIQUE,
            project_name VARCHAR(256) NOT NULL,
            product_id UUID,
            product_name VARCHAR(256),
            customer VARCHAR(256),
            description TEXT,
            status VARCHAR(32) DEFAULT 'planning',
            current_phase VARCHAR(32),
            leader VARCHAR(64),
            team TEXT,
            start_date TIMESTAMP,
            target_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            progress INT DEFAULT 0,
            risk_level VARCHAR(32) DEFAULT 'low',
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS qms.qa_apqp_phases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES qa_apqp_projects(id) ON DELETE CASCADE,
            phase_code VARCHAR(32) NOT NULL,
            phase_name VARCHAR(128) NOT NULL,
            description TEXT,
            status VARCHAR(32) DEFAULT 'pending',
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            progress INT DEFAULT 0,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_apqp_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES qa_apqp_projects(id) ON DELETE CASCADE,
            phase_id UUID NOT NULL REFERENCES qa_apqp_phases(id) ON DELETE CASCADE,
            task_name VARCHAR(256) NOT NULL,
            description TEXT,
            task_type VARCHAR(64),
            deliverable TEXT,
            status VARCHAR(32) DEFAULT 'pending',
            assignee VARCHAR(64),
            due_date TIMESTAMP,
            completed_at TIMESTAMP,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_apqp_risks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES qa_apqp_projects(id) ON DELETE CASCADE,
            risk_name VARCHAR(256) NOT NULL,
            description TEXT,
            risk_category VARCHAR(64),
            severity INT DEFAULT 1,
            occurrence INT DEFAULT 1,
            detection INT DEFAULT 1,
            rpn INT,
            status VARCHAR(32) DEFAULT 'open',
            mitigation_plan TEXT,
            responsible VARCHAR(64),
            target_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

CREATE TABLE IF NOT EXISTS qms.qa_apqp_approvals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES qa_apqp_projects(id) ON DELETE CASCADE,
            approval_type VARCHAR(64) NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            applicant VARCHAR(64),
            approver VARCHAR(64),
            comment TEXT,
            submitted_at TIMESTAMP DEFAULT NOW(),
            approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
