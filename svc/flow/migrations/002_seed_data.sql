-- ================================================
-- TOPEMS 工作流预置数据
-- ================================================

-- -----------------------------------------------
-- 日常行政类工作流
-- -----------------------------------------------

-- 1. 请假审批流程
INSERT INTO flow.workflows (id, name, description, definition, is_active, created_at, updated_at)
VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  '请假审批流程',
  '员工请假需要经过主管和HR审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["manager_approval"]},
      {"node_id": "manager_approval", "name": "主管审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 48, "auto_action": "approve", "next_nodes": ["hr_approval"]},
      {"node_id": "hr_approval", "name": "HR审批", "approvers": ["role:hr"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["hr_approval"]
  }',
  true,
  NOW(),
  NOW()
),

-- 2. 报销审批流程
(
  '550e8400-e29b-41d4-a716-446655440002',
  '报销审批流程',
  '员工费用报销需要主管和财务审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交报销", "approvers": [], "approval_type": "single", "next_nodes": ["manager_approval"]},
      {"node_id": "manager_approval", "name": "主管审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["finance_approval"]},
      {"node_id": "finance_approval", "name": "财务审核", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 48, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["finance_approval"]
  }',
  true,
  NOW(),
  NOW()
),

-- 3. 办公用品申请流程
(
  '550e8400-e29b-41d4-a716-446655440003',
  '办公用品申请流程',
  '办公用品领用申请审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["admin_check"]},
      {"node_id": "admin_check", "name": "行政审核", "approvers": ["role:admin"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["warehouse"]},
      {"node_id": "warehouse", "name": "仓库发货", "approvers": ["role:warehouse"], "approval_type": "single", "timeout_hours": 48, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["warehouse"]
  }',
  true,
  NOW(),
  NOW()
),

-- 4. 出差申请流程
(
  '550e8400-e29b-41d4-a716-446655440004',
  '出差申请流程',
  '员工出差申请需要主管审批和财务备案',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["manager_approval"]},
      {"node_id": "manager_approval", "name": "主管审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["finance_record"]},
      {"node_id": "finance_record", "name": "财务备案", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 12, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["finance_record"]
  }',
  true,
  NOW(),
  NOW()
),

-- 5. 加班申请流程
(
  '550e8400-e29b-41d4-a716-446655440005',
  '加班申请流程',
  '员工加班申请需要主管审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["manager_approval"]},
      {"node_id": "manager_approval", "name": "主管审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 12, "next_nodes": ["hr_record"]},
      {"node_id": "hr_record", "name": "HR记录", "approvers": ["role:hr"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["hr_record"]
  }',
  true,
  NOW(),
  NOW()
),

-- 6. 用章申请流程
(
  '550e8400-e29b-41d4-a716-446655440006',
  '用章申请流程',
  '公司印章使用申请审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["manager_approval"]},
      {"node_id": "manager_approval", "name": "部门审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 12, "next_nodes": ["legal_check"]},
      {"node_id": "legal_check", "name": "法务审核", "approvers": ["role:legal"], "approval_type": "single", "timeout_hours": 12, "next_nodes": ["admin_stamp"]},
      {"node_id": "admin_stamp", "name": "盖章登记", "approvers": ["role:admin"], "approval_type": "single", "timeout_hours": 6, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["admin_stamp"]
  }',
  true,
  NOW(),
  NOW()
),

-- -----------------------------------------------
-- 业务流程类工作流
-- -----------------------------------------------

-- 7. 采购审批流程
(
  '550e8400-e29b-41d4-a716-446655440007',
  '采购审批流程',
  '采购申请需要部门经理和财务审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交采购申请", "approvers": [], "approval_type": "single", "next_nodes": ["dept_manager"]},
      {"node_id": "dept_manager", "name": "部门经理审批", "approvers": ["role:department_manager"], "approval_type": "single", "conditions": [{"field": "amount", "operator": ">", "value": 1000}], "next_nodes": ["finance"]},
      {"node_id": "finance", "name": "财务审批", "approvers": ["role:finance_manager", "role:finance"], "approval_type": "counter", "timeout_hours": 48, "next_nodes": ["purchase"]},
      {"node_id": "purchase", "name": "采购执行", "approvers": ["role:purchase"], "approval_type": "single", "timeout_hours": 72, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["purchase"]
  }',
  true,
  NOW(),
  NOW()
),

-- 8. 合同审批流程
(
  '550e8400-e29b-41d4-a716-446655440008',
  '合同审批流程',
  '合同签订需要法务审核和管理层审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交合同", "approvers": [], "approval_type": "single", "next_nodes": ["legal_review"]},
      {"node_id": "legal_review", "name": "法务审核", "approvers": ["role:legal"], "approval_type": "single", "timeout_hours": 72, "next_nodes": ["dept_manager"]},
      {"node_id": "dept_manager", "name": "部门审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["executive"]},
      {"node_id": "executive", "name": "高管审批", "approvers": ["role:executive"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["sign"]},
      {"node_id": "sign", "name": "盖章签署", "approvers": ["role:admin"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["sign"]
  }',
  true,
  NOW(),
  NOW()
),

-- 9. 付款申请流程
(
  '550e8400-e29b-41d4-a716-446655440009',
  '付款申请流程',
  '对外付款申请审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["manager_approval"]},
      {"node_id": "manager_approval", "name": "主管审批", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["finance_check"]},
      {"node_id": "finance_check", "name": "财务审核", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["finance_manager"]},
      {"node_id": "finance_manager", "name": "财务经理审批", "approvers": ["role:finance_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["payment"]},
      {"node_id": "payment", "name": "付款执行", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 48, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["payment"]
  }',
  true,
  NOW(),
  NOW()
),

-- 10. 费用预算申请流程
(
  '550e8400-e29b-41d4-a716-446655440010',
  '费用预算申请流程',
  '部门年度/季度费用预算申请',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交预算", "approvers": [], "approval_type": "single", "next_nodes": ["dept_manager"]},
      {"node_id": "dept_manager", "name": "部门确认", "approvers": ["role:department_manager"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["finance_review"]},
      {"node_id": "finance_review", "name": "财务评审", "approvers": ["role:finance_manager"], "approval_type": "single", "timeout_hours": 72, "next_nodes": ["executive"]},
      {"node_id": "executive", "name": "管理层审批", "approvers": ["role:executive"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["finalize"]},
      {"node_id": "finalize", "name": "预算生效", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["finalize"]
  }',
  true,
  NOW(),
  NOW()
),

-- -----------------------------------------------
-- 项目管理类工作流
-- -----------------------------------------------

-- 11. 项目立项审批流程
(
  '550e8400-e29b-41d4-a716-446655440011',
  '项目立项审批流程',
  '新项目立项申请审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交立项", "approvers": [], "approval_type": "single", "next_nodes": ["tech_review"]},
      {"node_id": "tech_review", "name": "技术评审", "approvers": ["role:tech_lead"], "approval_type": "single", "timeout_hours": 72, "next_nodes": ["finance_estimate"]},
      {"node_id": "finance_estimate", "name": "财务评估", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["project_committee"]},
      {"node_id": "project_committee", "name": "项目委员会", "approvers": ["role:executive", "role:tech_director", "role:finance_manager"], "approval_type": "or", "timeout_hours": 72, "next_nodes": ["kickoff"]},
      {"node_id": "kickoff", "name": "项目启动", "approvers": ["role:project_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["kickoff"]
  }',
  true,
  NOW(),
  NOW()
),

-- 12. 项目变更申请流程
(
  '550e8400-e29b-41d4-a716-446655440012',
  '项目变更申请流程',
  '项目范围/进度/预算变更审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交变更", "approvers": [], "approval_type": "single", "next_nodes": ["pm_review"]},
      {"node_id": "pm_review", "name": "项目经理审核", "approvers": ["role:project_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["stakeholder"]},
      {"node_id": "stakeholder", "name": "相关方确认", "approvers": ["role:department_manager", "role:tech_lead"], "approval_type": "or", "timeout_hours": 48, "next_nodes": ["executive_approval"]},
      {"node_id": "executive_approval", "name": "管理层审批", "approvers": ["role:executive"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["update_plan"]},
      {"node_id": "update_plan", "name": "更新计划", "approvers": ["role:project_manager"], "approval_type": "single", "timeout_hours": 12, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["update_plan"]
  }',
  true,
  NOW(),
  NOW()
),

-- 13. 资源调配申请流程
(
  '550e8400-e29b-41d4-a716-446655440013',
  '资源调配申请流程',
  '项目人力/设备资源调配审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["current_pm"]},
      {"node_id": "current_pm", "name": "原项目经理", "approvers": ["role:project_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["target_pm"]},
      {"node_id": "target_pm", "name": "目标项目经理", "approvers": ["role:project_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["resource_manager"]},
      {"node_id": "resource_manager", "name": "资源经理审批", "approvers": ["role:resource_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["notify"]},
      {"node_id": "notify", "name": "通知执行", "approvers": ["role:hr"], "approval_type": "single", "timeout_hours": 12, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["notify"]
  }',
  true,
  NOW(),
  NOW()
),

-- 14. 项目结项审批流程
(
  '550e8400-e29b-41d4-a716-446655440014',
  '项目结项审批流程',
  '项目完成后结项审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交结项", "approvers": [], "approval_type": "single", "next_nodes": ["pm_summary"]},
      {"node_id": "pm_summary", "name": "项目经理总结", "approvers": ["role:project_manager"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["stakeholder_review"]},
      {"node_id": "stakeholder_review", "name": "相关方验收", "approvers": ["role:department_manager", "role:tech_lead"], "approval_type": "counter", "timeout_hours": 72, "next_nodes": ["finance_audit"]},
      {"node_id": "finance_audit", "name": "财务审计", "approvers": ["role:finance"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["archive"]},
      {"node_id": "archive", "name": "项目归档", "approvers": ["role:admin"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["archive"]
  }',
  true,
  NOW(),
  NOW()
),

-- -----------------------------------------------
-- 工地施工类工作流
-- -----------------------------------------------

-- 15. 施工许可证申请流程
(
  '550e8400-e29b-41d4-a716-446655440015',
  '施工许可证申请流程',
  '工地施工许可证申请审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["safety_check"]},
      {"node_id": "safety_check", "name": "安全审核", "approvers": ["role:safety_manager"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["engineering_review"]},
      {"node_id": "engineering_review", "name": "工程审查", "approvers": ["role:engineer"], "approval_type": "single", "timeout_hours": 72, "next_nodes": ["fire_approval"]},
      {"node_id": "fire_approval", "name": "消防审批", "approvers": ["role:fire_safety"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["environmental_check"]},
      {"node_id": "environmental_check", "name": "环保审查", "approvers": ["role:environmental"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["permit_issue"]},
      {"node_id": "permit_issue", "name": "发证", "approvers": ["role:construction_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["permit_issue"]
  }',
  true,
  NOW(),
  NOW()
),

-- 16. 材料进场验收流程
(
  '550e8400-e29b-41d4-a716-446655440016',
  '材料进场验收流程',
  '施工材料进场验收审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交报验", "approvers": [], "approval_type": "single", "next_nodes": ["warehouse_check"]},
      {"node_id": "warehouse_check", "name": "仓库验收", "approvers": ["role:warehouse"], "approval_type": "single", "timeout_hours": 12, "next_nodes": ["quality_inspection"]},
      {"node_id": "quality_inspection", "name": "质量检验", "approvers": ["role:qc_engineer"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["engineer_approval"]},
      {"node_id": "engineer_approval", "name": "工程师确认", "approvers": ["role:site_engineer"], "approval_type": "single", "timeout_hours": 12, "next_nodes": ["acceptance"]},
      {"node_id": "acceptance", "name": "验收通过", "approvers": ["role:construction_manager"], "approval_type": "single", "timeout_hours": 12, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["acceptance"]
  }',
  true,
  NOW(),
  NOW()
),

-- 17. 工程质量验收流程
(
  '550e8400-e29b-41d4-a716-446655440017',
  '工程质量验收流程',
  '分项工程质量验收审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "申请验收", "approvers": [], "approval_type": "single", "next_nodes": ["self_inspection"]},
      {"node_id": "self_inspection", "name": "自检", "approvers": ["role:foreman"], "approval_type": "single", "timeout_hours": 24, "next_nodes": ["qc_inspection"]},
      {"node_id": "qc_inspection", "name": "QC检验", "approvers": ["role:qc_manager"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["engineer_acceptance"]},
      {"node_id": "engineer_acceptance", "name": "工程师验收", "approvers": ["role:site_engineer"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["signature"]},
      {"node_id": "signature", "name": "签字确认", "approvers": ["role:construction_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["signature"]
  }',
  true,
  NOW(),
  NOW()
),

-- 18. 工程竣工验收流程
(
  '550e8400-e29b-41d4-a716-446655440018',
  '工程竣工验收流程',
  '工程项目竣工验收审批',
  '{
    "version": "1.0",
    "nodes": [
      {"node_id": "submit", "name": "提交申请", "approvers": [], "approval_type": "single", "next_nodes": ["document_review"]},
      {"node_id": "document_review", "name": "资料审核", "approvers": ["role:document_control"], "approval_type": "single", "timeout_hours": 72, "next_nodes": ["on_site_inspection"]},
      {"node_id": "on_site_inspection", "name": "现场检查", "approvers": ["role:chief_engineer"], "approval_type": "single", "timeout_hours": 72, "next_nodes": ["safety_evaluation"]},
      {"node_id": "safety_evaluation", "name": "安全评估", "approvers": ["role:safety_manager"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["quality_assessment"]},
      {"node_id": "quality_assessment", "name": "质量评定", "approvers": ["role:qc_manager"], "approval_type": "single", "timeout_hours": 48, "next_nodes": ["acceptance_meeting"]},
      {"node_id": "acceptance_meeting", "name": "验收会议", "approvers": ["role:project_owner", "role:construction_manager", "role:designer"], "approval_type": "counter", "timeout_hours": 72, "next_nodes": ["certificate_issue"]},
      {"node_id": "certificate_issue", "name": "发合格证", "approvers": ["role:construction_manager"], "approval_type": "single", "timeout_hours": 24, "next_nodes": []}
    ],
    "start_node": "submit",
    "end_nodes": ["certificate_issue"]
  }',
  true,
  NOW(),
  NOW()
);
