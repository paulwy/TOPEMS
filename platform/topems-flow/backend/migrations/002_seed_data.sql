-- 插入示例工作流数据
INSERT INTO flow.workflows (id, name, description, definition, is_active, created_at, updated_at)
VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  '请假审批流程',
  '员工请假需要经过主管和HR审批',
  '{
    "version": "1.0",
    "nodes": [
      {
        "node_id": "submit",
        "name": "提交申请",
        "approvers": [],
        "approval_type": "single",
        "next_nodes": ["manager_approval"]
      },
      {
        "node_id": "manager_approval",
        "name": "主管审批",
        "approvers": ["550e8400-e29b-41d4-a716-446655440002"],
        "approval_type": "single",
        "timeout_hours": 48,
        "auto_action": "approve",
        "next_nodes": ["hr_approval"]
      },
      {
        "node_id": "hr_approval",
        "name": "HR审批",
        "approvers": ["550e8400-e29b-41d4-a716-446655440003"],
        "approval_type": "single",
        "timeout_hours": 24,
        "next_nodes": []
      }
    ],
    "start_node": "submit",
    "end_nodes": ["hr_approval"]
  }',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '采购审批流程',
  '采购申请需要部门经理和财务审批',
  '{
    "version": "1.0",
    "nodes": [
      {
        "node_id": "start",
        "name": "提交采购申请",
        "approvers": [],
        "approval_type": "single",
        "next_nodes": ["dept_manager"]
      },
      {
        "node_id": "dept_manager",
        "name": "部门经理审批",
        "approvers": ["550e8400-e29b-41d4-a716-446655440004"],
        "approval_type": "single",
        "conditions": [
          {
            "field": "amount",
            "operator": ">",
            "value": 1000
          }
        ],
        "next_nodes": ["finance"]
      },
      {
        "node_id": "finance",
        "name": "财务审批",
        "approvers": ["550e8400-e29b-41d4-a716-446655440005", "550e8400-e29b-41d4-a716-446655440006"],
        "approval_type": "counter",
        "next_nodes": []
      }
    ],
    "start_node": "start",
    "end_nodes": ["finance"]
  }',
  true,
  NOW(),
  NOW()
);
