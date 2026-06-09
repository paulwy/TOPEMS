-- 初始化模板和帮助中心数据

-- ============================================
-- 1. 模板分类数据
-- ============================================
INSERT INTO doc_service.template_categories (id, name, code, icon, description, sort_order, is_active, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', '合同模板', 'contract', '📄', '各类合同文档模板', 1, true, 'system'),
('550e8400-e29b-41d4-a716-446655440002', '通知公告', 'notice', '📢', '公司内部通知公告模板', 2, true, 'system'),
('550e8400-e29b-41d4-a716-446655440003', '审批申请', 'approval', '✅', '各类审批申请模板', 3, true, 'system'),
('550e8400-e29b-41d4-a716-446655440004', '报告报表', 'report', '📊', '各类报告报表模板', 4, true, 'system'),
('550e8400-e29b-41d4-a716-446655440005', '人事文档', 'hrm', '👥', 'HR人事相关文档模板', 5, true, 'system'),
('550e8400-e29b-41d4-a716-446655440006', '质量文档', 'qms', '⚙️', '质量管理相关模板', 6, true, 'system');

-- ============================================
-- 2. HRM 模块模板
-- ============================================
INSERT INTO doc_service.templates (id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440101', '劳动合同模板', 'hrm_labor_contract', '550e8400-e29b-41d4-a716-446655440001', 'HRM', '标准劳动合同模板', '
# 劳动合同

## 甲方（用人单位）
- **公司名称**：{{company_name}}
- **法定代表人**：{{legal_representative}}
- **地址**：{{company_address}}

## 乙方（劳动者）
- **姓名**：{{employee_name}}
- **身份证号**：{{id_number}}
- **地址**：{{employee_address}}

## 合同期限
自 {{start_date}} 起至 {{end_date}} 止。

## 工作内容和工作地点
- **岗位**：{{position}}
- **部门**：{{department}}
- **工作地点**：{{work_location}}

## 劳动报酬
- **基本工资**：{{basic_salary}} 元/月
- **支付时间**：每月 {{payment_day}} 日

## 工作时间和休息休假
执行标准工时制度，每周工作 {{work_days}} 天。

## 其他
- **合同编号**：{{contract_number}}
- **签订日期**：{{sign_date}}

甲方盖章：_________________  乙方签字：_________________
', '[
  {"key":"company_name","label":"公司名称","type":"string","required":true,"default_value":"TOPEMS 科技有限公司"},
  {"key":"legal_representative","label":"法定代表人","type":"string","required":true,"default_value":"张三"},
  {"key":"company_address","label":"公司地址","type":"string","required":true,"default_value":"北京市朝阳区xxx路xxx号"},
  {"key":"employee_name","label":"员工姓名","type":"string","required":true,"default_value":""},
  {"key":"id_number","label":"身份证号","type":"string","required":true,"default_value":""},
  {"key":"employee_address","label":"员工地址","type":"string","required":false,"default_value":""},
  {"key":"start_date","label":"合同开始日期","type":"date","required":true,"default_value":""},
  {"key":"end_date","label":"合同结束日期","type":"date","required":true,"default_value":""},
  {"key":"position","label":"岗位","type":"string","required":true,"default_value":""},
  {"key":"department","label":"部门","type":"string","required":true,"default_value":""},
  {"key":"work_location","label":"工作地点","type":"string","required":true,"default_value":""},
  {"key":"basic_salary","label":"基本工资","type":"number","required":true,"default_value":"5000"},
  {"key":"payment_day","label":"发薪日","type":"number","required":true,"default_value":"15"},
  {"key":"work_days","label":"每周工作天数","type":"number","required":true,"default_value":"5"},
  {"key":"contract_number","label":"合同编号","type":"string","required":true,"default_value":""},
  {"key":"sign_date","label":"签订日期","type":"date","required":true,"default_value":""}
]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655440102', '请假申请单', 'hrm_leave_request', '550e8400-e29b-41d4-a716-446655440003', 'HRM', '员工请假申请模板', '
# 请假申请单

## 申请人信息
- **姓名**：{{applicant_name}}
- **工号**：{{employee_number}}
- **部门**：{{department}}
- **岗位**：{{position}}

## 请假信息
- **请假类型**：{{leave_type}}
- **请假原因**：{{leave_reason}}
- **开始时间**：{{start_time}}
- **结束时间**：{{end_time}}
- **请假天数**：{{leave_days}} 天

## 工作安排
- **工作交接人**：{{handover_person}}
- **备注**：{{remarks}}

## 审批
- **部门经理**：_________________ 日期：_________
- **人力资源**：_________________ 日期：_________
- **总经理**：_________________ 日期：_________

申请日期：{{application_date}}
', '[
  {"key":"applicant_name","label":"申请人姓名","type":"string","required":true,"default_value":""},
  {"key":"employee_number","label":"工号","type":"string","required":true,"default_value":""},
  {"key":"department","label":"部门","type":"string","required":true,"default_value":""},
  {"key":"position","label":"岗位","type":"string","required":true,"default_value":""},
  {"key":"leave_type","label":"请假类型","type":"select","required":true,"options":["事假","病假","年假","婚假","产假","其他"], "default_value": "事假"},
  {"key":"leave_reason","label":"请假原因","type":"string","required":true,"default_value":""},
  {"key":"start_time","label":"开始时间","type":"date","required":true,"default_value":""},
  {"key":"end_time","label":"结束时间","type":"date","required":true,"default_value":""},
  {"key":"leave_days","label":"请假天数","type":"number","required":true,"default_value":"1"},
  {"key":"handover_person","label":"工作交接人","type":"string","required":false,"default_value":""},
  {"key":"remarks","label":"备注","type":"string","required":false,"default_value":""},
  {"key":"application_date","label":"申请日期","type":"date","required":true,"default_value":""}
]', true, true, 2, 'system'),

('550e8400-e29b-41d4-a716-446655440103', '员工入职登记表', 'hrm_onboarding_form', '550e8400-e29b-41d4-a716-446655440005', 'HRM', '新员工入职登记表模板', '
# 员工入职登记表

## 一、基本信息
| 项目 | 内容 |
|------|------|
| 姓名 | {{full_name}} |
| 性别 | {{gender}} |
| 出生日期 | {{birth_date}} |
| 民族 | {{ethnicity}} |
| 籍贯 | {{hometown}} |
| 婚姻状况 | {{marital_status}} |

## 二、联系方式
| 项目 | 内容 |
|------|------|
| 联系电话 | {{phone_number}} |
| 电子邮箱 | {{email}} |
| 紧急联系人 | {{emergency_contact}} |
| 紧急联系电话 | {{emergency_phone}} |

## 三、教育经历
| 毕业院校 | 专业 | 学历 | 毕业时间 |
|---------|------|------|---------|
| {{school}} | {{major}} | {{education}} | {{graduation_date}} |

## 四、工作经历
| 公司名称 | 职位 | 入职时间 | 离职时间 |
|---------|------|---------|---------|
| {{previous_company}} | {{previous_position}} | {{previous_start}} | {{previous_end}} |

## 五、入职信息
| 项目 | 内容 |
|------|------|
| 入职日期 | {{join_date}} |
| 所属部门 | {{department}} |
| 岗位 | {{position}} |
| 工号 | {{employee_number}} |
| 试用期 | {{probation_period}} 个月 |

填报日期：{{form_date}}
', '[
  {"key":"full_name","label":"姓名","type":"string","required":true,"default_value":""},
  {"key":"gender","label":"性别","type":"select","required":true,"options":["男","女"],"default_value":""},
  {"key":"birth_date","label":"出生日期","type":"date","required":true,"default_value":""},
  {"key":"ethnicity","label":"民族","type":"string","required":true,"default_value":"汉族"},
  {"key":"hometown","label":"籍贯","type":"string","required":false,"default_value":""},
  {"key":"marital_status","label":"婚姻状况","type":"select","required":true,"options":["未婚","已婚","离异","丧偶"],"default_value":"未婚"},
  {"key":"phone_number","label":"联系电话","type":"string","required":true,"default_value":""},
  {"key":"email","label":"电子邮箱","type":"string","required":true,"default_value":""},
  {"key":"emergency_contact","label":"紧急联系人","type":"string","required":true,"default_value":""},
  {"key":"emergency_phone","label":"紧急联系电话","type":"string","required":true,"default_value":""},
  {"key":"school","label":"毕业院校","type":"string","required":true,"default_value":""},
  {"key":"major","label":"专业","type":"string","required":true,"default_value":""},
  {"key":"education","label":"学历","type":"select","required":true,"options":["高中","大专","本科","硕士","博士"],"default_value":"本科"},
  {"key":"graduation_date","label":"毕业时间","type":"date","required":true,"default_value":""},
  {"key":"previous_company","label":"前公司名称","type":"string","required":false,"default_value":""},
  {"key":"previous_position","label":"前公司职位","type":"string","required":false,"default_value":""},
  {"key":"previous_start","label":"前公司入职时间","type":"date","required":false,"default_value":""},
  {"key":"previous_end","label":"前公司离职时间","type":"date","required":false,"default_value":""},
  {"key":"join_date","label":"入职日期","type":"date","required":true,"default_value":""},
  {"key":"department","label":"部门","type":"string","required":true,"default_value":""},
  {"key":"position","label":"岗位","type":"string","required":true,"default_value":""},
  {"key":"employee_number","label":"工号","type":"string","required":true,"default_value":""},
  {"key":"probation_period","label":"试用期（月）","type":"number","required":true,"default_value":"3"},
  {"key":"form_date","label":"填报日期","type":"date","required":true,"default_value":""}
]', true, true, 3, 'system'),

('550e8400-e29b-41d4-a716-446655440104', '员工辞职申请', 'hrm_resignation', '550e8400-e29b-41d4-a716-446655440003', 'HRM', '员工辞职申请模板', '
# 辞职申请书

尊敬的公司领导：

您好！

本人 {{employee_name}}，身份证号 {{id_number}}，于 {{join_date}} 入职公司，在 {{department}} 担任 {{position}} 一职。

因 {{resignation_reason}}，现正式提出辞职申请，计划于 {{last_working_date}} 离开公司。

在离职前，我会认真完成工作交接，确保工作平稳过渡。

感谢公司给予的培养和机会！

此致
敬礼！

申请人：{{employee_name}}
申请日期：{{application_date}}

---
## 工作交接确认
- 工作交接完成：______ 是/否
- 交接人：{{handover_person}}
- 交接日期：{{handover_date}}
', '[
  {"key":"employee_name","label":"员工姓名","type":"string","required":true,"default_value":""},
  {"key":"id_number","label":"身份证号","type":"string","required":true,"default_value":""},
  {"key":"join_date","label":"入职日期","type":"date","required":true,"default_value":""},
  {"key":"department","label":"部门","type":"string","required":true,"default_value":""},
  {"key":"position","label":"岗位","type":"string","required":true,"default_value":""},
  {"key":"resignation_reason","label":"辞职原因","type":"string","required":true,"default_value":""},
  {"key":"last_working_date","label":"最后工作日","type":"date","required":true,"default_value":""},
  {"key":"application_date","label":"申请日期","type":"date","required":true,"default_value":""},
  {"key":"handover_person","label":"交接人","type":"string","required":false,"default_value":""},
  {"key":"handover_date","label":"交接日期","type":"date","required":false,"default_value":""}
]', true, true, 4, 'system');

-- ============================================
-- 3. ERP 模块模板
-- ============================================
INSERT INTO doc_service.templates (id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440201', '采购申请单', 'erp_purchase_request', '550e8400-e29b-41d4-a716-446655440003', 'ERP', '采购申请单模板', '
# 采购申请单

## 申请信息
| 项目 | 内容 |
|------|------|
| 申请单号 | {{request_number}} |
| 申请部门 | {{department}} |
| 申请人 | {{applicant}} |
| 申请日期 | {{request_date}} |
| 预算归属 | {{budget_category}} |
| 预算编号 | {{budget_code}} |

## 采购明细
| 序号 | 物品名称 | 规格型号 | 数量 | 预计单价 | 金额 | 用途说明 |
|------|---------|---------|------|---------|------|---------|
| 1 | {{item1_name}} | {{item1_spec}} | {{item1_qty}} | {{item1_price}} | {{item1_amount}} | {{item1_purpose}} |
| 2 | {{item2_name}} | {{item2_spec}} | {{item2_qty}} | {{item2_price}} | {{item2_amount}} | {{item2_purpose}} |

## 合计金额
人民币 {{total_amount}} 元整（￥{{total_amount_num}}）

## 审批流程
- 部门经理审批：_________________ 日期：_________
- 财务审核：_________________ 日期：_________
- 总经理审批：_________________ 日期：_________

备注：{{remarks}}
', '[
  {"key":"request_number","label":"申请单号","type":"string","required":true,"default_value":""},
  {"key":"department","label":"申请部门","type":"string","required":true,"default_value":""},
  {"key":"applicant","label":"申请人","type":"string","required":true,"default_value":""},
  {"key":"request_date","label":"申请日期","type":"date","required":true,"default_value":""},
  {"key":"budget_category","label":"预算归属","type":"string","required":true,"default_value":""},
  {"key":"budget_code","label":"预算编号","type":"string","required":false,"default_value":""},
  {"key":"item1_name","label":"物品1名称","type":"string","required":true,"default_value":""},
  {"key":"item1_spec","label":"物品1规格","type":"string","required":false,"default_value":""},
  {"key":"item1_qty","label":"物品1数量","type":"number","required":true,"default_value":"1"},
  {"key":"item1_price","label":"物品1单价","type":"number","required":true,"default_value":""},
  {"key":"item1_amount","label":"物品1金额","type":"number","required":true,"default_value":""},
  {"key":"item1_purpose","label":"物品1用途","type":"string","required":false,"default_value":""},
  {"key":"item2_name","label":"物品2名称","type":"string","required":false,"default_value":""},
  {"key":"item2_spec","label":"物品2规格","type":"string","required":false,"default_value":""},
  {"key":"item2_qty","label":"物品2数量","type":"number","required":false,"default_value":"1"},
  {"key":"item2_price","label":"物品2单价","type":"number","required":false,"default_value":""},
  {"key":"item2_amount","label":"物品2金额","type":"number","required":false,"default_value":""},
  {"key":"item2_purpose","label":"物品2用途","type":"string","required":false,"default_value":""},
  {"key":"total_amount","label":"合计金额（大写）","type":"string","required":true,"default_value":""},
  {"key":"total_amount_num","label":"合计金额（数字）","type":"number","required":true,"default_value":""},
  {"key":"remarks","label":"备注","type":"string","required":false,"default_value":""}
]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655440202', '采购合同', 'erp_purchase_contract', '550e8400-e29b-41d4-a716-446655440001', 'ERP', '采购合同模板', '
# 采购合同

## 合同编号
{{contract_number}}

## 甲方（采购方）
- **名称**：{{buyer_name}}
- **地址**：{{buyer_address}}
- **联系人**：{{buyer_contact}}
- **电话**：{{buyer_phone}}

## 乙方（供应方）
- **名称**：{{supplier_name}}
- **地址**：{{supplier_address}}
- **联系人**：{{supplier_contact}}
- **电话**：{{supplier_phone}}

## 采购内容
| 序号 | 物品名称 | 规格型号 | 单位 | 数量 | 单价 | 小计 |
|------|---------|---------|------|------|------|------|
| 1 | {{item1_name}} | {{item1_spec}} | {{item1_unit}} | {{item1_qty}} | {{item1_price}} | {{item1_subtotal}} |
| 2 | {{item2_name}} | {{item2_spec}} | {{item2_unit}} | {{item2_qty}} | {{item2_price}} | {{item2_subtotal}} |

## 合同金额
合计金额：人民币 {{total_amount}} 元整（￥{{total_amount_num}}）

## 交货与验收
- **交货时间**：{{delivery_date}}
- **交货地点**：{{delivery_address}}
- **验收标准**：{{acceptance_standard}}

## 付款方式
{{payment_terms}}

## 违约责任
{{liability_clause}}

## 其他
- **合同签订日期**：{{sign_date}}
- **合同生效日期**：{{effective_date}}

甲方盖章：_________________  乙方盖章：_________________
', '[
  {"key":"contract_number","label":"合同编号","type":"string","required":true,"default_value":""},
  {"key":"buyer_name","label":"采购方名称","type":"string","required":true,"default_value":"TOPEMS 科技有限公司"},
  {"key":"buyer_address","label":"采购方地址","type":"string","required":true,"default_value":"北京市朝阳区xxx路xxx号"},
  {"key":"buyer_contact","label":"采购方联系人","type":"string","required":true,"default_value":""},
  {"key":"buyer_phone","label":"采购方电话","type":"string","required":true,"default_value":""},
  {"key":"supplier_name","label":"供应方名称","type":"string","required":true,"default_value":""},
  {"key":"supplier_address","label":"供应方地址","type":"string","required":true,"default_value":""},
  {"key":"supplier_contact","label":"供应方联系人","type":"string","required":true,"default_value":""},
  {"key":"supplier_phone","label":"供应方电话","type":"string","required":true,"default_value":""},
  {"key":"item1_name","label":"物品1名称","type":"string","required":true,"default_value":""},
  {"key":"item1_spec","label":"物品1规格","type":"string","required":false,"default_value":""},
  {"key":"item1_unit","label":"物品1单位","type":"string","required":true,"default_value":"个"},
  {"key":"item1_qty","label":"物品1数量","type":"number","required":true,"default_value":"1"},
  {"key":"item1_price","label":"物品1单价","type":"number","required":true,"default_value":""},
  {"key":"item1_subtotal","label":"物品1小计","type":"number","required":true,"default_value":""},
  {"key":"item2_name","label":"物品2名称","type":"string","required":false,"default_value":""},
  {"key":"item2_spec","label":"物品2规格","type":"string","required":false,"default_value":""},
  {"key":"item2_unit","label":"物品2单位","type":"string","required":false,"default_value":"个"},
  {"key":"item2_qty","label":"物品2数量","type":"number","required":false,"default_value":"1"},
  {"key":"item2_price","label":"物品2单价","type":"number","required":false,"default_value":""},
  {"key":"item2_subtotal","label":"物品2小计","type":"number","required":false,"default_value":""},
  {"key":"total_amount","label":"合计金额（大写）","type":"string","required":true,"default_value":""},
  {"key":"total_amount_num","label":"合计金额（数字）","type":"number","required":true,"default_value":""},
  {"key":"delivery_date","label":"交货日期","type":"date","required":true,"default_value":""},
  {"key":"delivery_address","label":"交货地点","type":"string","required":true,"default_value":""},
  {"key":"acceptance_standard","label":"验收标准","type":"string","required":true,"default_value":"按国家标准验收"},
  {"key":"payment_terms","label":"付款方式","type":"string","required":true,"default_value":"货到验收合格后30天内付款"},
  {"key":"liability_clause","label":"违约责任","type":"string","required":true,"default_value":"双方按合同法相关条款执行"},
  {"key":"sign_date","label":"签订日期","type":"date","required":true,"default_value":""},
  {"key":"effective_date","label":"生效日期","type":"date","required":true,"default_value":""}
]', true, true, 2, 'system'),

('550e8400-e29b-41d4-a716-446655440203', '月度采购计划表', 'erp_monthly_purchase_plan', '550e8400-e29b-41d4-a716-446655440004', 'ERP', '月度采购计划表模板', '
# {{year}}年{{month}}月采购计划表

## 部门：{{department}}
## 编制日期：{{date}}

| 序号 | 物品名称 | 规格型号 | 单位 | 上月库存 | 本月预估消耗 | 本月计划采购 | 预估单价 | 预估金额 | 用途说明 | 备注 |
|------|---------|---------|------|---------|------------|------------|---------|---------|---------|------|
| 1 | {{item1_name}} | {{item1_spec}} | {{item1_unit}} | {{item1_last_stock}} | {{item1_est_demand}} | {{item1_plan}} | {{item1_price}} | {{item1_amount}} | {{item1_purpose}} | {{item1_remark}} |
| 2 | {{item2_name}} | {{item2_spec}} | {{item2_unit}} | {{item2_last_stock}} | {{item2_est_demand}} | {{item2_plan}} | {{item2_price}} | {{item2_amount}} | {{item2_purpose}} | {{item2_remark}} |

## 合计
| 项目 | 金额（元） |
|------|-----------|
| 本月采购总金额 | {{total_amount}} |

编制人：{{preparer}}
审核人：{{reviewer}}
审批人：{{approver}}
', '[
  {"key":"year","label":"年份","type":"number","required":true,"default_value":"2026"},
  {"key":"month","label":"月份","type":"number","required":true,"default_value":"5"},
  {"key":"department","label":"部门","type":"string","required":true,"default_value":""},
  {"key":"date","label":"编制日期","type":"date","required":true,"default_value":""},
  {"key":"item1_name","label":"物品1名称","type":"string","required":true,"default_value":""},
  {"key":"item1_spec","label":"物品1规格","type":"string","required":false,"default_value":""},
  {"key":"item1_unit","label":"物品1单位","type":"string","required":true,"default_value":"个"},
  {"key":"item1_last_stock","label":"物品1上月库存","type":"number","required":true,"default_value":"0"},
  {"key":"item1_est_demand","label":"物品1预估消耗","type":"number","required":true,"default_value":"0"},
  {"key":"item1_plan","label":"物品1计划采购","type":"number","required":true,"default_value":"0"},
  {"key":"item1_price","label":"物品1预估单价","type":"number","required":true,"default_value":"0"},
  {"key":"item1_amount","label":"物品1预估金额","type":"number","required":true,"default_value":"0"},
  {"key":"item1_purpose","label":"物品1用途","type":"string","required":false,"default_value":""},
  {"key":"item1_remark","label":"物品1备注","type":"string","required":false,"default_value":""},
  {"key":"item2_name","label":"物品2名称","type":"string","required":false,"default_value":""},
  {"key":"item2_spec","label":"物品2规格","type":"string","required":false,"default_value":""},
  {"key":"item2_unit","label":"物品2单位","type":"string","required":false,"default_value":"个"},
  {"key":"item2_last_stock","label":"物品2上月库存","type":"number","required":false,"default_value":"0"},
  {"key":"item2_est_demand","label":"物品2预估消耗","type":"number","required":false,"default_value":"0"},
  {"key":"item2_plan","label":"物品2计划采购","type":"number","required":false,"default_value":"0"},
  {"key":"item2_price","label":"物品2预估单价","type":"number","required":false,"default_value":"0"},
  {"key":"item2_amount","label":"物品2预估金额","type":"number","required":false,"default_value":"0"},
  {"key":"item2_purpose","label":"物品2用途","type":"string","required":false,"default_value":""},
  {"key":"item2_remark","label":"物品2备注","type":"string","required":false,"default_value":""},
  {"key":"total_amount","label":"总采购金额","type":"number","required":true,"default_value":"0"},
  {"key":"preparer","label":"编制人","type":"string","required":true,"default_value":""},
  {"key":"reviewer","label":"审核人","type":"string","required":true,"default_value":""},
  {"key":"approver","label":"审批人","type":"string","required":true,"default_value":""}
]', true, true, 3, 'system');

-- ============================================
-- 4. CRM 模块模板
-- ============================================
INSERT INTO doc_service.templates (id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440301', '客户开发信', 'crm_prospecting_letter', '550e8400-e29b-41d4-a716-446655440001', 'CRM', '客户开发信模板', '
# 客户开发信

尊敬的 {{contact_name}}：

您好！

我是 {{company_name}} 的 {{sender_name}}。

{{introduction}}

我司主要提供以下产品/服务：
{{product_introduction}}

{{offer_details}}

期待您的回复！

此致
敬礼！

{{sender_name}}
{{sender_position}}
{{company_name}}
电话：{{sender_phone}}
邮箱：{{sender_email}}
日期：{{date}}
', '[
  {"key":"contact_name","label":"联系人姓名","type":"string","required":true,"default_value":""},
  {"key":"company_name","label":"公司名称","type":"string","required":true,"default_value":"TOPEMS 科技有限公司"},
  {"key":"sender_name","label":"发件人姓名","type":"string","required":true,"default_value":""},
  {"key":"introduction","label":"开场白","type":"string","required":true,"default_value":"很高兴通过{{source}}了解到贵公司的信息。"},
  {"key":"product_introduction","label":"产品介绍","type":"string","required":true,"default_value":"企业数字化管理系统，包含ERP、HRM、CRM等多个模块"},
  {"key":"offer_details","label":"报价/优惠详情","type":"string","required":false,"default_value":"我们可以为您提供免费试用和个性化定制方案"},
  {"key":"sender_position","label":"发件人职位","type":"string","required":true,"default_value":""},
  {"key":"sender_phone","label":"发件人电话","type":"string","required":true,"default_value":""},
  {"key":"sender_email","label":"发件人邮箱","type":"string","required":true,"default_value":""},
  {"key":"date","label":"日期","type":"date","required":true,"default_value":""}
]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655440302', '报价单', 'crm_quote', '550e8400-e29b-41d4-a716-446655440001', 'CRM', '客户报价单模板', '
# 报 价 单

## 报价单号
{{quote_number}}

## 客户信息
| 项目 | 内容 |
|------|------|
| 客户名称 | {{customer_name}} |
| 联系人 | {{contact_person}} |
| 联系电话 | {{contact_phone}} |
| 联系邮箱 | {{contact_email}} |

## 报价内容
| 序号 | 项目名称 | 规格/说明 | 单位 | 数量 | 单价（元） | 小计（元） |
|------|---------|---------|------|------|-----------|-----------|
| 1 | {{item1_name}} | {{item1_desc}} | {{item1_unit}} | {{item1_qty}} | {{item1_price}} | {{item1_subtotal}} |
| 2 | {{item2_name}} | {{item2_desc}} | {{item2_unit}} | {{item2_qty}} | {{item2_price}} | {{item2_subtotal}} |

## 价格汇总
| 项目 | 金额（元） |
|------|-----------|
| 小计 | {{subtotal}} |
| 折扣（{{discount_rate}}%） | {{discount_amount}} |
| 税额（{{tax_rate}}%） | {{tax_amount}} |
| **合计（含税）** | **{{total_amount}}** |

## 报价说明
- **报价有效期**：{{valid_until}}
- **交付周期**：{{delivery_period}}
- **付款方式**：{{payment_terms}}
- **备注**：{{remarks}}

报价人：{{quoter}}
日期：{{quote_date}}
', '[
  {"key":"quote_number","label":"报价单号","type":"string","required":true,"default_value":""},
  {"key":"customer_name","label":"客户名称","type":"string","required":true,"default_value":""},
  {"key":"contact_person","label":"联系人","type":"string","required":true,"default_value":""},
  {"key":"contact_phone","label":"联系电话","type":"string","required":true,"default_value":""},
  {"key":"contact_email","label":"联系邮箱","type":"string","required":false,"default_value":""},
  {"key":"item1_name","label":"项目1名称","type":"string","required":true,"default_value":""},
  {"key":"item1_desc","label":"项目1说明","type":"string","required":false,"default_value":""},
  {"key":"item1_unit","label":"项目1单位","type":"string","required":true,"default_value":"项"},
  {"key":"item1_qty","label":"项目1数量","type":"number","required":true,"default_value":"1"},
  {"key":"item1_price","label":"项目1单价","type":"number","required":true,"default_value":""},
  {"key":"item1_subtotal","label":"项目1小计","type":"number","required":true,"default_value":""},
  {"key":"item2_name","label":"项目2名称","type":"string","required":false,"default_value":""},
  {"key":"item2_desc","label":"项目2说明","type":"string","required":false,"default_value":""},
  {"key":"item2_unit","label":"项目2单位","type":"string","required":false,"default_value":"项"},
  {"key":"item2_qty","label":"项目2数量","type":"number","required":false,"default_value":"1"},
  {"key":"item2_price","label":"项目2单价","type":"number","required":false,"default_value":""},
  {"key":"item2_subtotal","label":"项目2小计","type":"number","required":false,"default_value":""},
  {"key":"subtotal","label":"小计","type":"number","required":true,"default_value":""},
  {"key":"discount_rate","label":"折扣率","type":"number","required":true,"default_value":"0"},
  {"key":"discount_amount","label":"折扣金额","type":"number","required":true,"default_value":"0"},
  {"key":"tax_rate","label":"税率","type":"number","required":true,"default_value":"13"},
  {"key":"tax_amount","label":"税额","type":"number","required":true,"default_value":""},
  {"key":"total_amount","label":"合计金额","type":"number","required":true,"default_value":""},
  {"key":"valid_until","label":"报价有效期","type":"string","required":true,"default_value":"30天"},
  {"key":"delivery_period","label":"交付周期","type":"string","required":true,"default_value":""},
  {"key":"payment_terms","label":"付款方式","type":"string","required":true,"default_value":""},
  {"key":"remarks","label":"备注","type":"string","required":false,"default_value":""},
  {"key":"quoter","label":"报价人","type":"string","required":true,"default_value":""},
  {"key":"quote_date","label":"报价日期","type":"date","required":true,"default_value":""}
]', true, true, 2, 'system'),

('550e8400-e29b-41d4-a716-446655440303', '销售合同', 'crm_sales_contract', '550e8400-e29b-41d4-a716-446655440001', 'CRM', '销售合同模板', '
# 销售合同

## 合同编号
{{contract_number}}

## 甲方（买方）
- **名称**：{{buyer_name}}
- **地址**：{{buyer_address}}
- **联系人**：{{buyer_contact}}
- **电话**：{{buyer_phone}}

## 乙方（卖方）
- **名称**：{{seller_name}}
- **地址**：{{seller_address}}
- **联系人**：{{seller_contact}}
- **电话**：{{seller_phone}}

## 产品信息
| 序号 | 产品名称 | 规格型号 | 单位 | 数量 | 单价（元） | 小计（元） |
|------|---------|---------|------|------|-----------|-----------|
| 1 | {{item1_name}} | {{item1_spec}} | {{item1_unit}} | {{item1_qty}} | {{item1_price}} | {{item1_subtotal}} |
| 2 | {{item2_name}} | {{item2_spec}} | {{item2_unit}} | {{item2_qty}} | {{item2_price}} | {{item2_subtotal}} |

## 合同总金额
人民币 {{total_amount}} 元整（￥{{total_amount_num}}）

## 交付安排
- **交付日期**：{{delivery_date}}
- **交付地点**：{{delivery_address}}
- **运输方式**：{{shipping_method}}
- **运费承担**：{{shipping_cost_by}}

## 付款方式
{{payment_terms}}

## 质量保证
{{warranty_terms}}

## 违约责任
{{liability_clause}}

## 其他
- **合同签订日期**：{{sign_date}}
- **生效日期**：{{effective_date}}
- **有效期**：{{valid_period}}

甲方盖章：_________________  乙方盖章：_________________
', '[
  {"key":"contract_number","label":"合同编号","type":"string","required":true,"default_value":""},
  {"key":"buyer_name","label":"买方名称","type":"string","required":true,"default_value":""},
  {"key":"buyer_address","label":"买方地址","type":"string","required":true,"default_value":""},
  {"key":"buyer_contact","label":"买方联系人","type":"string","required":true,"default_value":""},
  {"key":"buyer_phone","label":"买方电话","type":"string","required":true,"default_value":""},
  {"key":"seller_name","label":"卖方名称","type":"string","required":true,"default_value":"TOPEMS 科技有限公司"},
  {"key":"seller_address","label":"卖方地址","type":"string","required":true,"default_value":"北京市朝阳区xxx路xxx号"},
  {"key":"seller_contact","label":"卖方联系人","type":"string","required":true,"default_value":""},
  {"key":"seller_phone","label":"卖方电话","type":"string","required":true,"default_value":""},
  {"key":"item1_name","label":"产品1名称","type":"string","required":true,"default_value":""},
  {"key":"item1_spec","label":"产品1规格","type":"string","required":false,"default_value":""},
  {"key":"item1_unit","label":"产品1单位","type":"string","required":true,"default_value":"套"},
  {"key":"item1_qty","label":"产品1数量","type":"number","required":true,"default_value":"1"},
  {"key":"item1_price","label":"产品1单价","type":"number","required":true,"default_value":""},
  {"key":"item1_subtotal","label":"产品1小计","type":"number","required":true,"default_value":""},
  {"key":"item2_name","label":"产品2名称","type":"string","required":false,"default_value":""},
  {"key":"item2_spec","label":"产品2规格","type":"string","required":false,"default_value":""},
  {"key":"item2_unit","label":"产品2单位","type":"string","required":false,"default_value":"套"},
  {"key":"item2_qty","label":"产品2数量","type":"number","required":false,"default_value":"1"},
  {"key":"item2_price","label":"产品2单价","type":"number","required":false,"default_value":""},
  {"key":"item2_subtotal","label":"产品2小计","type":"number","required":false,"default_value":""},
  {"key":"total_amount","label":"总金额（大写）","type":"string","required":true,"default_value":""},
  {"key":"total_amount_num","label":"总金额（数字）","type":"number","required":true,"default_value":""},
  {"key":"delivery_date","label":"交付日期","type":"date","required":true,"default_value":""},
  {"key":"delivery_address","label":"交付地点","type":"string","required":true,"default_value":""},
  {"key":"shipping_method","label":"运输方式","type":"string","required":true,"default_value":"物流配送"},
  {"key":"shipping_cost_by","label":"运费承担方","type":"string","required":true,"default_value":"卖方承担"},
  {"key":"payment_terms","label":"付款方式","type":"string","required":true,"default_value":""},
  {"key":"warranty_terms","label":"质量保证","type":"string","required":true,"default_value":"提供12个月免费技术支持"},
  {"key":"liability_clause","label":"违约责任","type":"string","required":true,"default_value":"按合同法相关条款执行"},
  {"key":"sign_date","label":"签订日期","type":"date","required":true,"default_value":""},
  {"key":"effective_date","label":"生效日期","type":"date","required":true,"default_value":""},
  {"key":"valid_period","label":"有效期","type":"string","required":true,"default_value":"1年"}
]', true, true, 3, 'system');

-- ============================================
-- 5. 通用模板
-- ============================================
INSERT INTO doc_service.templates (id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440401', '会议通知', 'general_meeting_notice', '550e8400-e29b-41d4-a716-446655440002', 'General', '会议通知模板', '
# 会议通知

## 会议信息
| 项目 | 内容 |
|------|------|
| 会议主题 | {{meeting_topic}} |
| 会议时间 | {{meeting_time}} |
| 会议地点 | {{meeting_location}} |
| 主持人 | {{host}} |
| 记录人 | {{recorder}} |

## 参会人员
{{attendees}}

## 会议议程
{{agenda}}

## 会前准备
{{preparation}}

## 备注
{{remarks}}

请各位准时参会！

{{company_name}}
{{notice_date}}
', '[
  {"key":"meeting_topic","label":"会议主题","type":"string","required":true,"default_value":""},
  {"key":"meeting_time","label":"会议时间","type":"string","required":true,"default_value":""},
  {"key":"meeting_location","label":"会议地点","type":"string","required":true,"default_value":""},
  {"key":"host","label":"主持人","type":"string","required":true,"default_value":""},
  {"key":"recorder","label":"记录人","type":"string","required":false,"default_value":""},
  {"key":"attendees","label":"参会人员","type":"string","required":true,"default_value":""},
  {"key":"agenda","label":"会议议程","type":"string","required":true,"default_value":""},
  {"key":"preparation","label":"会前准备","type":"string","required":false,"default_value":""},
  {"key":"remarks","label":"备注","type":"string","required":false,"default_value":""},
  {"key":"company_name","label":"公司名称","type":"string","required":true,"default_value":"TOPEMS 科技有限公司"},
  {"key":"notice_date","label":"通知日期","type":"date","required":true,"default_value":""}
]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655440402', '会议纪要', 'general_meeting_minutes', '550e8400-e29b-41d4-a716-446655440004', 'General', '会议纪要模板', '
# 会议纪要

## 基本信息
| 项目 | 内容 |
|------|------|
| 会议主题 | {{meeting_topic}} |
| 会议时间 | {{meeting_time}} |
| 会议地点 | {{meeting_location}} |
| 主持人 | {{host}} |
| 记录人 | {{recorder}} |

## 参会人员
{{attendees}}

## 缺席人员
{{absent}}

## 会议内容
{{meeting_content}}

## 决议事项
{{resolutions}}

## 待办事项
| 序号 | 事项内容 | 责任人 | 完成时间 | 状态 |
|------|---------|--------|---------|------|
| 1 | {{todo1_content}} | {{todo1_owner}} | {{todo1_deadline}} | {{todo1_status}} |
| 2 | {{todo2_content}} | {{todo2_owner}} | {{todo2_deadline}} | {{todo2_status}} |

## 下次会议
{{next_meeting}}

纪要编制人：{{recorder}}
日期：{{minutes_date}}
', '[
  {"key":"meeting_topic","label":"会议主题","type":"string","required":true,"default_value":""},
  {"key":"meeting_time","label":"会议时间","type":"string","required":true,"default_value":""},
  {"key":"meeting_location","label":"会议地点","type":"string","required":true,"default_value":""},
  {"key":"host","label":"主持人","type":"string","required":true,"default_value":""},
  {"key":"recorder","label":"记录人","type":"string","required":true,"default_value":""},
  {"key":"attendees","label":"参会人员","type":"string","required":true,"default_value":""},
  {"key":"absent","label":"缺席人员","type":"string","required":false,"default_value":""},
  {"key":"meeting_content","label":"会议内容","type":"string","required":true,"default_value":""},
  {"key":"resolutions","label":"决议事项","type":"string","required":true,"default_value":""},
  {"key":"todo1_content","label":"待办1内容","type":"string","required":false,"default_value":""},
  {"key":"todo1_owner","label":"待办1责任人","type":"string","required":false,"default_value":""},
  {"key":"todo1_deadline","label":"待办1完成时间","type":"string","required":false,"default_value":""},
  {"key":"todo1_status","label":"待办1状态","type":"string","required":false,"default_value":"待办"},
  {"key":"todo2_content","label":"待办2内容","type":"string","required":false,"default_value":""},
  {"key":"todo2_owner","label":"待办2责任人","type":"string","required":false,"default_value":""},
  {"key":"todo2_deadline","label":"待办2完成时间","type":"string","required":false,"default_value":""},
  {"key":"todo2_status","label":"待办2状态","type":"string","required":false,"default_value":"待办"},
  {"key":"next_meeting","label":"下次会议安排","type":"string","required":false,"default_value":""},
  {"key":"minutes_date","label":"纪要日期","type":"date","required":true,"default_value":""}
]', true, true, 2, 'system'),

('550e8400-e29b-41d4-a716-446655440403', '周报模板', 'general_weekly_report', '550e8400-e29b-41d4-a716-446655440004', 'General', '周报模板', '
# 周报

## 基本信息
| 项目 | 内容 |
|------|------|
| 姓名 | {{reporter_name}} |
| 部门 | {{department}} |
| 岗位 | {{position}} |
| 报告周期 | {{report_period}} |
| 报告日期 | {{report_date}} |

## 本周工作内容
{{weekly_work}}

## 工作成果
{{achievements}}

## 遇到的问题
{{problems}}

## 问题解决情况
{{problem_solutions}}

## 下周工作计划
{{next_week_plan}}

## 需要协助事项
{{assistance_needed}}

## 备注
{{remarks}}
', '[
  {"key":"reporter_name","label":"报告人","type":"string","required":true,"default_value":""},
  {"key":"department","label":"部门","type":"string","required":true,"default_value":""},
  {"key":"position","label":"岗位","type":"string","required":true,"default_value":""},
  {"key":"report_period","label":"报告周期","type":"string","required":true,"default_value":""},
  {"key":"report_date","label":"报告日期","type":"date","required":true,"default_value":""},
  {"key":"weekly_work","label":"本周工作内容","type":"string","required":true,"default_value":""},
  {"key":"achievements","label":"工作成果","type":"string","required":true,"default_value":""},
  {"key":"problems","label":"遇到的问题","type":"string","required":false,"default_value":""},
  {"key":"problem_solutions","label":"问题解决情况","type":"string","required":false,"default_value":""},
  {"key":"next_week_plan","label":"下周工作计划","type":"string","required":true,"default_value":""},
  {"key":"assistance_needed","label":"需要协助事项","type":"string","required":false,"default_value":""},
  {"key":"remarks","label":"备注","type":"string","required":false,"default_value":""}
]', true, true, 3, 'system');

-- ============================================
-- 6. 帮助文档分类
-- ============================================
INSERT INTO doc_service.help_categories (id, name, code, icon, description, module, sort_order, is_active, created_by) VALUES
('550e8400-e29b-41d4-a716-446655441001', '快速入门', 'quick_start', '🚀', '新用户快速上手指南', 'General', 1, true, 'system'),
('550e8400-e29b-41d4-a716-446655441002', '系统管理', 'system_admin', '⚙️', '系统配置与管理', 'IAM', 2, true, 'system'),
('550e8400-e29b-41d4-a716-446655441003', 'HRM模块', 'hrm', '👥', '人力资源管理', 'HRM', 3, true, 'system'),
('550e8400-e29b-41d4-a716-446655441004', 'ERP模块', 'erp', '📦', '企业资源计划', 'ERP', 4, true, 'system'),
('550e8400-e29b-41d4-a716-446655441005', 'CRM模块', 'crm', '🤝', '客户关系管理', 'CRM', 5, true, 'system'),
('550e8400-e29b-41d4-a716-446655441006', '报表管理', 'reports', '📊', '报表设计与分析', 'Report', 6, true, 'system'),
('550e8400-e29b-41d4-a716-446655441007', '常见问题', 'faq', '❓', '常见问题解答', 'General', 7, true, 'system');

-- ============================================
-- 7. 帮助文档
-- ============================================
INSERT INTO doc_service.help_articles (id, title, slug, category_id, module, summary, content, tags, is_featured, is_active, sort_order, created_by) VALUES
('550e8400-e29b-41d4-a716-446655442001', '系统登录与首次使用', 'first-login-guide', '550e8400-e29b-41d4-a716-446655441001', 'General', '详细介绍如何登录系统并进行初步设置', '
# 系统登录与首次使用指南

## 一、登录系统

### 1.1 访问系统
打开浏览器，输入系统地址：`{{system_url}}`

### 1.2 输入账号密码
- 账号：您的工号或邮箱
- 密码：初始密码请联系管理员
- 验证码：输入图片中的验证码

### 1.3 修改初始密码
首次登录成功后，系统会要求您修改初始密码。

**密码要求：**
- 长度至少8位
- 包含大小写字母
- 包含数字
- 包含特殊字符

## 二、账户设置

### 2.1 个人信息完善
1. 点击右上角头像
2. 选择「个人中心」
3. 完善个人信息：
   - 头像上传
   - 联系电话
   - 邮箱地址
   - 紧急联系人

### 2.2 安全设置
建议开启以下安全措施：
- 密码定期修改
- 两步验证（如支持）
- 登录日志查看

## 三、首页说明

### 3.1 快捷入口
- 常用功能快速访问
- 可自定义快捷入口

### 3.2 待办事项
- 显示您需要处理的审批
- 任务提醒

### 3.3 消息通知
- 系统通知
- 消息提醒
- 公告查看

## 四、首次配置建议

1. 完善个人信息
2. 修改默认密码
3. 设置常用快捷入口
4. 查看系统公告

---

**相关文档：**
- [个人中心使用指南](/help/personal-center)
- [系统安全建议](/help/security-tips)
', '["登录","首次使用","入门","密码"]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655442002', '员工入职流程', 'hrm-employee-onboarding', '550e8400-e29b-41d4-a716-446655441003', 'HRM', '详细说明新员工入职的完整流程', '
# 员工入职流程指南

## 一、入职前准备

### 1.1 创建员工档案
1. 进入「HRM」→「员工管理」
2. 点击「新增员工」
3. 填写员工基本信息

### 1.2 准备入职材料清单
- 身份证复印件
- 学历证书复印件
- 离职证明
- 体检报告
- 银行卡信息

## 二、入职手续办理

### 2.1 办理入职登记
1. 员工填写入职登记表
2. HR 审核信息
3. 签订劳动合同
4. 建立员工档案

### 2.2 分配岗位
1. 确定所属部门
2. 设定岗位职级
3. 分配工作任务
4. 指定导师

## 三、系统账户配置

### 3.1 创建系统账号
1. 创建登录账号
2. 配置用户权限
3. 分配角色
4. 开通模块访问权限

### 3.2 配置入职欢迎包
- 系统使用说明
- 通讯录
- 员工手册

## 四、入职培训

### 4.1 入职培训安排
1. 公司文化培训
2. 制度流程培训
3. 系统操作培训
4. 岗位技能培训

### 4.2 培训效果评估
- 培训考核
- 导师反馈
- 试用期间跟进

## 五、试用期管理

### 5.1 试用期跟踪
- 试用期工作计划
- 定期回顾
- 绩效评估

### 5.2 转正流程
- 员工申请转正
- 主管评估
- 审批流程
- 办理转正手续

---

**相关文档：**
- [HRM模块操作手册](/help/hrm-user-guide)
- [员工合同管理](/help/contract-management)
- [绩效管理流程](/help/performance-management)
', '["HRM","入职","员工","流程"]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655442003', '采购申请与审批流程', 'erp-purchase-process', '550e8400-e29b-41d4-a716-446655441004', 'ERP', '完整的采购申请和审批流程指南', '
# 采购申请与审批流程指南

## 一、采购申请

### 1.1 发起申请
1. 进入「ERP」→「采购管理」
2. 点击「新建采购申请」
3. 填写采购申请单：
   - 申请部门
   - 申请日期
   - 物品明细
   - 预估金额
   - 采购原因

### 1.2 上传附件
- 报价单
- 技术规格书
- 其他支持文件

## 二、审批流程

### 2.1 审批节点
标准审批流程：
1. **部门经理审批** - 确认需求
2. **预算管理员审核** - 确认预算
3. **采购主管审核** - 确认采购方案
4. **分管领导审批** - 金额较大时
5. **总经理审批** - 超出权限时

### 2.2 审批操作
- 同意：进入下一节点
- 退回：返回修改
- 拒绝：终止流程

### 2.3 审批查询
- 查看审批进度
- 查看审批历史
- 催办

## 三、采购执行

### 3.1 订单创建
审批通过后，自动创建采购订单

### 3.2 采购跟进
- 供应商确认
- 跟进交付进度
- 处理变更

## 四、验收入库

### 4.1 到货验收
- 核对数量
- 质量检验
- 签收确认

### 4.2 入库登记
- 录入库存
- 更新库存台账
- 登记资产（必要时）

## 五、财务付款

### 5.1 发票登记
- 收到发票
- 系统登记
- 关联订单

### 5.2 付款申请
- 发起付款申请
- 财务审核
- 出纳付款
- 核销记录

---

**相关文档：**
- [ERP采购模块完整手册](/help/erp-purchase-guide)
- [预算管理指南](/help/budget-management)
- [供应商管理规范](/help/supplier-management)
', '["ERP","采购","审批","流程"]', true, true, 2, 'system'),

('550e8400-e29b-41d4-a716-446655442004', '客户跟进与管理', 'crm-customer-management', '550e8400-e29b-41d4-a716-446655441005', 'CRM', '如何高效跟进和管理客户的完整指南', '
# 客户跟进与管理指南

## 一、客户信息管理

### 1.1 创建客户档案
1. 进入「CRM」→「客户管理」
2. 点击「新增客户」
3. 录入客户信息：
   - 基本信息：公司名称、地址等
   - 联系方式：电话、邮箱等
   - 客户分类：客户等级、行业等
   - 客户来源：渠道信息

### 1.2 客户信息维护
- 定期更新信息
- 记录联系人变更
- 完善客户画像

## 二、客户跟进

### 2.1 跟进计划
- 制定跟进计划
- 设置提醒时间
- 分配跟进人

### 2.2 跟进记录
每次沟通后，记录：
- 沟通方式：电话/邮件/面谈等
- 沟通内容
- 客户反馈
- 下一步计划
- 商机信息

### 2.3 跟进提醒
- 系统自动提醒
- 待办事项显示
- 跟进历史查看

## 三、商机管理

### 3.1 商机识别
- 客户需求分析
- 识别潜在商机
- 评估商机价值

### 3.2 商机推进
- 商机阶段更新：初步接触→方案→报价→谈判→成交
- 记录关键节点
- 预测成交概率

### 3.3 商机漏斗
查看销售漏斗，分析：
- 各阶段商机数量
- 转化率
- 预计成交金额

## 四、客户分析

### 4.1 客户价值分析
- 客户分层
- 贡献度分析
- 活跃度分析

### 4.2 销售分析
- 业绩统计
- 趋势分析
- 团队对比

## 五、客户关怀

### 5.1 日常关怀
- 节日问候
- 生日祝福
- 定期回访

### 5.2 客户满意度
- 满意度调查
- 投诉处理
- 服务改进

---

**相关文档：**
- [CRM模块完整操作手册](/help/crm-user-guide)
- [销售漏斗分析方法](/help/sales-funnel)
- [客户标签管理指南](/help/customer-tags)
', '["CRM","客户","跟进","销售"]', true, true, 1, 'system'),

('550e8400-e29b-41d4-a716-446655442005', '报表设计与创建', 'report-builder-guide', '550e8400-e29b-41d4-a716-446655441006', 'Report', '报表设计器的详细使用指南', '
# 报表设计与创建指南

## 一、报表类型

### 1.1 预置报表
系统提供丰富的预置报表：
- 人事类报表
- 销售类报表
- 财务类报表
- 库存类报表

### 1.2 自定义报表
根据业务需求，自行设计报表

## 二、创建报表

### 2.1 选择数据源
1. 进入「报表」→「报表设计器」
2. 点击「新建报表」
3. 选择数据源：
   - 系统模块数据源
   - 自定义SQL查询
   - 外部数据（如支持）

### 2.2 设计表结构
- 选择字段
- 设置字段别名
- 配置字段格式
- 设置字段可见性

### 2.3 添加计算字段
可以添加计算字段：
- 数值计算：加减乘除
- 字符串操作：拼接、截取等
- 日期计算：日期间隔、格式化

## 三、报表组件

### 3.1 表格组件
- 数据展示
- 排序
- 分页
- 汇总

### 3.2 图表组件
支持多种图表类型：
- 柱状图
- 折线图
- 饼图
- 仪表盘
- 组合图

### 3.3 文本组件
- 标题
- 说明文字
- 分割线

## 四、筛选与参数

### 4.1 静态筛选
报表创建时设定的过滤条件

### 4.2 动态参数
用户查看报表时可以选择：
- 日期范围
- 部门
- 其他条件

## 五、报表发布

### 5.1 保存报表
- 命名报表
- 设置分类
- 填写说明

### 5.2 权限设置
- 谁可以查看
- 谁可以编辑
- 导出权限

### 5.3 发布分享
- 保存为模板
- 分享给指定用户
- 加入报表中心

## 六、报表导出

### 6.1 导出格式
- Excel
- PDF
- Word
- CSV

### 6.2 打印设置
- 页面设置
- 打印预览
- 打印配置

---

**相关文档：**
- [报表模板管理](/help/report-templates)
- [数据权限控制](/help/data-permissions)
- [Excel导出配置](/help/excel-export-config)
', '["报表","设计","分析","图表"]', true, true, 1, 'system');

-- ============================================
-- 8. 常见问题
-- ============================================
INSERT INTO doc_service.faqs (id, question, answer, category, tags, sort_order, is_active, created_at, updated_at, created_by) VALUES
('550e8400-e29b-41d4-a716-446655443001', '如何修改登录密码？', '1. 点击右上角用户头像
2. 选择「账户设置」
3. 选择「修改密码」
4. 输入原密码和新密码
5. 点击「确定」保存', '账户', '["密码","账户","安全"]', 1, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system'),
('550e8400-e29b-41d4-a716-446655443002', '如何找回忘记的密码？', '1. 在登录页面点击「忘记密码」
2. 输入您的注册邮箱
3. 系统将发送重置密码链接到您的邮箱
4. 点击链接重置密码', '账户', '["密码","找回","重置"]', 2, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system'),
('550e8400-e29b-41d4-a716-446655443006', '系统的默认账号是什么？如何创建新用户？', '系统默认账号：
- 超级管理员：admin / admin123（首次登录后请立即修改密码）

创建新用户步骤：
1. 使用管理员账号登录系统
2. 进入「系统管理」→「用户管理」
3. 点击「新增用户」
4. 填写用户信息（用户名、邮箱、姓名等）
5. 分配用户角色
6. 保存后，用户可使用分配的账号密码登录

⚠️ 注意：出于安全考虑，系统只提供默认管理员账号，其他用户需要由管理员创建。', '账户', '["账号","用户","创建","管理员"]', 3, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system'),
('550e8400-e29b-41d4-a716-446655443007', '系统初始化包含哪些数据？', '系统初始化包含以下基础数据：

1. 权限和角色
   - 预定义角色：系统管理员、开发人员、部门经理、普通用户、访客
   - 70+ 个权限定义，覆盖各功能模块

2. 工作流模板
   - 18个预定义审批流程
   - 涵盖请假、报销、采购、合同等项目管理和行政流程

3. 文档模板
   - HRM模块：劳动合同、请假申请、员工入职等模板
   - ERP模块：采购申请、采购合同等模板
   - CRM模块：客户开发信、报价单、销售合同等模板
   - 通用模板：会议通知、会议纪要、周报等模板

4. 帮助文档
   - 系统使用指南
   - 各模块操作手册
   - 常见问题解答

这些数据在系统首次部署时自动初始化，为系统提供基础功能支持。', '系统', '["初始化","种子数据","系统设置"]', 4, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system'),
('550e8400-e29b-41d4-a716-446655443003', 'Excel导出失败怎么办？', '1. 检查是否有大量数据（建议分批导出）
2. 检查浏览器是否为最新版本
3. 尝试使用 Chrome 或 Firefox 浏览器
4. 如仍有问题，请联系技术支持', '操作', '["Excel","导出","下载"]', 5, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system'),
('550e8400-e29b-41d4-a716-446655443004', '如何创建自定义报表？', '1. 进入「报表」模块
2. 点击「新建报表」
3. 选择数据源和表结构
4. 设计报表布局
5. 保存报表', '报表', '["报表","自定义","设计"]', 6, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system'),
('550e8400-e29b-41d4-a716-446655443005', '系统支持哪些浏览器？', '推荐使用：
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

不支持 IE 浏览器', '系统', '["浏览器","兼容性","推荐"]', 7, true, '2026-05-27 10:00:00', '2026-05-27 10:00:00', 'system');
