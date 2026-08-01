import os
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
SCHEMAS_DIR = os.path.join(ROOT, 'schemas')
ZH_PATH = os.path.join(ROOT, 'i18n', 'locales', 'zh.json')
EN_PATH = os.path.join(ROOT, 'i18n', 'locales', 'en.json')

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')

with open(ZH_PATH, 'r', encoding='utf-8') as f:
    zh = json.load(f)
with open(EN_PATH, 'r', encoding='utf-8') as f:
    en = json.load(f)

# ============================================================
# 全局中文->英文键映射表
# ============================================================
GLOBAL_KEY_MAP = {
    # Status values
    '启用': 'status_active',
    '禁用': 'status_inactive',
    '有效': 'status_valid',
    '无效': 'status_invalid',
    '草稿': 'status_draft',
    '待处理': 'status_pending',
    '处理中': 'status_processing',
    '已完成': 'status_completed',
    '已取消': 'status_cancelled',
    '已过期': 'status_expired',
    '已终止': 'status_terminated',
    '已提交': 'status_submitted',
    '已接受': 'status_accepted',
    '已拒绝': 'status_rejected',
    '已中标': 'status_awarded',
    '已发货': 'status_shipped',
    '已到货': 'status_delivered',
    '活跃': 'status_active',
    '不活跃': 'status_inactive',
    '在售': 'status_active',
    '停售': 'status_inactive',
    '待审核': 'status_pending',
    '执行中': 'status_effective',
    '已定标': 'status_awarded',
    '已开标': 'status_opened',
    '评标中': 'status_evaluating',
    '投标中': 'status_bidding',
    '已发布': 'status_published',
    '已驳回': 'status_rejected',
    '已关闭': 'status_closed',
    '已解决': 'status_resolved',
    '已计划': 'status_scheduled',
    '已归档': 'status_archived',
    '已延期': 'status_delayed',
    '待开始': 'status_pending',
    '待分配': 'status_unassigned',
    '新创建': 'status_new',
    '审批中': 'status_approving',
    '已批准': 'status_approved',
    '已拒绝': 'status_rejected',
    '已关闭': 'status_closed',
    '已完成': 'status_completed',
    '进行中': 'status_in_progress',
    '已暂停': 'status_paused',
    '已恢复': 'status_resumed',
    '已取消': 'status_cancelled',
    '已创建': 'status_created',
    '已确认': 'status_confirmed',
    '已生效': 'status_effective',
    '已失效': 'status_expired',
    '已结算': 'status_settled',
    '已支付': 'status_paid',
    '未支付': 'status_unpaid',
    '逾期': 'status_overdue',
    '正常': 'status_normal',
    '异常': 'status_abnormal',
    '全部状态': 'filter_all_status',
    '全部': 'filter_all',
    '全部分类': 'filter_all_categories',
    '全部风险': 'filter_all_risks',
    '全部类型': 'filter_all_types',
    '全部级别': 'filter_all_levels',
    '全部供应商': 'filter_all_suppliers',
    '全部币种': 'filter_all_currencies',
    '全部项目': 'filter_all_projects',
    
    # Labels
    '编号': 'label_no',
    '编码': 'label_code',
    '名称': 'label_name',
    '标题': 'label_title',
    '描述': 'label_description',
    '备注': 'label_remark',
    '金额': 'label_amount',
    '日期': 'label_date',
    '时间': 'label_time',
    '状态': 'label_status',
    '类型': 'label_type',
    '分类': 'label_category',
    '级别': 'label_level',
    '等级': 'label_grade',
    '数量': 'label_quantity',
    '价格': 'label_price',
    '单价': 'label_unit_price',
    '单位': 'label_unit',
    '总额': 'label_total',
    '子项': 'label_subtotal',
    '供应商': 'label_supplier',
    '供应商ID': 'label_supplier_id',
    '供应商编号': 'label_supplier_no',
    '供应商名称': 'label_supplier_name',
    '联系人': 'label_contact',
    '联系电话': 'label_phone',
    '电话': 'label_phone',
    '电子邮箱': 'label_email',
    '邮箱': 'label_email',
    '地址': 'label_address',
    '税号': 'label_tax_number',
    '银行账户': 'label_bank_account',
    '信用评级': 'label_credit_rating',
    '风险等级': 'label_risk_level',
    '创建时间': 'label_created_at',
    '更新时间': 'label_updated_at',
    '排序': 'label_sort_order',
    '最低分': 'label_min_score',
    '最高分': 'label_max_score',
    '权重 (%)': 'label_weight',
    '权重': 'label_weight',
    '合同': 'label_contract',
    '合同编号': 'label_contract_no',
    '合同名称': 'label_contract_name',
    '合同类型': 'label_contract_type',
    '订单': 'label_order',
    '订单编号': 'label_order_no',
    '报价单号': 'label_quotation_no',
    '询价单号': 'label_inquiry_no',
    '招标编号': 'label_bidding_no',
    '产品编码': 'label_product_code',
    '产品名称': 'label_product_name',
    '产品': 'label_product',
    '物料': 'label_material',
    '物料编码': 'label_material_code',
    '物料名称': 'label_material_name',
    '规格型号': 'label_specification',
    '库存数量': 'label_stock_quantity',
    '安全库存': 'label_safety_stock',
    '计量单位': 'label_unit',
    '生产日期': 'label_production_date',
    '有效期': 'label_validity_date',
    '批次号': 'label_batch_no',
    '客户': 'label_customer',
    '客户名称': 'label_customer_name',
    '客户编码': 'label_customer_code',
    '联系人': 'label_contact',
    '销售金额': 'label_sales_amount',
    '采购金额': 'label_purchase_amount',
    '入库数量': 'label_inbound_quantity',
    '出库数量': 'label_outbound_quantity',
    '仓库': 'label_warehouse',
    '库位': 'label_location',
    '质检状态': 'label_quality_status',
    '不合格': 'label_non_conforming',
    '合格': 'label_conforming',
    '让步接收': 'label_concession',
    '报废': 'label_scrap',
    '返工': 'label_rework',
    '操作员': 'label_operator',
    '工时': 'label_work_hours',
    '工序': 'label_process',
    '设备': 'label_equipment',
    '工位': 'label_workstation',
    '团队': 'label_team',
    '报表': 'label_report',
    '单据编号': 'label_record_no',
    '记录号': 'label_record_no',
    '币种': 'label_currency',
    '人民币 (CNY)': 'option_currency_cny',
    '美元 (USD)': 'option_currency_usd',
    '欧元 (EUR)': 'option_currency_eur',
    '人民币': 'option_currency_cny',
    '美元': 'option_currency_usd',
    '欧元': 'option_currency_eur',
    '预算金额': 'label_budget_amount',
    '报价总额': 'label_total_amount',
    '交付周期': 'label_delivery_cycle',
    '交付时间': 'label_delivery_time',
    '支付条款': 'label_payment_terms',
    '付款条款': 'label_payment_terms',
    '有效期至': 'label_valid_until',
    '截止日期': 'label_deadline',
    '开标日期': 'label_open_date',
    '投标截止日期': 'label_bid_deadline',
    '项目名称': 'label_project_name',
    '项目描述': 'label_project_description',
    '项目类别': 'label_project_category',
    '项目编号': 'label_project_no',
    '项目经理': 'label_project_manager',
    '项目状态': 'label_project_status',
    '优先级': 'label_priority',
    '高': 'option_priority_high',
    '中': 'option_priority_medium',
    '低': 'option_priority_low',
    '紧急': 'option_priority_urgent',
    '非紧急': 'option_priority_normal',
    '风险等级': 'label_risk_level',
    '低风险': 'option_risk_low',
    '中风险': 'option_risk_medium',
    '高风险': 'option_risk_high',
    '全部风险': 'filter_all_risks',
    '维度编码': 'label_dimension_code',
    '维度名称': 'label_dimension_name',
    '部门': 'label_department',
    '员工': 'label_employee',
    '姓名': 'label_name',
    '工号': 'label_employee_no',
    '岗位': 'label_position',
    '入职日期': 'label_hire_date',
    '离职日期': 'label_leave_date',
    '薪资': 'label_salary',
    '绩效': 'label_performance',
    '考勤': 'label_attendance',
    '请假': 'label_leave',
    '加班': 'label_overtime',
    '出差': 'label_trip',
    '培训': 'label_training',
    '招聘': 'label_recruitment',
    '面试': 'label_interview',
    '工资': 'label_salary',
    '保险': 'label_insurance',
    '福利': 'label_benefits',
    '身份证号': 'label_id_number',
    '手机号码': 'label_mobile',
    '紧急联系人': 'label_emergency_contact',
    '教育经历': 'label_education',
    '工作经历': 'label_work_experience',
    '技能': 'label_skills',
    '证书': 'label_certificates',
    '语言': 'label_languages',
    '地址': 'label_address',
    '城市': 'label_city',
    '省份': 'label_province',
    '国家': 'label_country',
    '邮编': 'label_postal_code',
    '性别': 'label_gender',
    '男': 'option_gender_male',
    '女': 'option_gender_female',
    '其他': 'option_other',
    '保密': 'option_gender_secret',
    '出生日期': 'label_birth_date',
    '年龄': 'label_age',
    '婚姻状况': 'label_marital_status',
    '已婚': 'option_marital_married',
    '未婚': 'option_marital_single',
    '离异': 'option_marital_divorced',
    '丧偶': 'option_marital_widowed',
    '学历': 'label_education',
    '高中': 'option_edu_high_school',
    '大专': 'option_edu_college',
    '本科': 'option_edu_bachelor',
    '硕士': 'option_edu_master',
    '博士': 'option_edu_phd',
    
    # Types
    '采购': 'type_purchase',
    '销售': 'type_sales',
    '生产': 'type_production',
    '库存': 'type_inventory',
    '财务': 'type_finance',
    '人力资源': 'type_hr',
    '设备': 'type_equipment',
    '质量': 'type_quality',
    '工程': 'type_engineering',
    '服务': 'type_service',
    '项目': 'type_project',
    '合同': 'type_contract',
    '订单': 'type_order',
    '询价': 'type_inquiry',
    '招标': 'type_bidding',
    '评估': 'type_evaluation',
    '报表': 'type_report',
    '工单': 'type_work_order',
    '维修': 'type_maintenance',
    '巡检': 'type_inspection',
    '保养': 'type_pm',
    '报废': 'type_scrap',
    '入库': 'type_inbound',
    '出库': 'type_outbound',
    '调拨': 'type_transfer',
    '盘点': 'type_stocktake',
    
    # Category options
    '原材料': 'category_raw_material',
    '包装辅料': 'category_packaging',
    '机械设备': 'category_machinery',
    '电子元器件': 'category_electronics',
    '化学用品': 'category_chemicals',
    '服务类': 'category_services',
    '其他': 'category_other',
    '零部件': 'category_components',
    '玻璃': 'category_glass',
    '金属': 'category_metal',
    '木材': 'category_wood',
    '塑料': 'category_plastic',
    '陶瓷': 'category_ceramic',
    '纺织品': 'category_textile',
    '食品': 'category_food',
    '药品': 'category_pharmaceutical',
    '办公用品': 'category_office',
    '劳保用品': 'category_safety',
    '清洁用品': 'category_cleaning',
    
    # Form sections
    '基本信息': 'section_basic_info',
    '详细信息': 'section_detail',
    '更多信息': 'section_more_info',
    '联系信息': 'section_contact_info',
    '财务信息': 'section_finance_info',
    '合同信息': 'section_contract_info',
    '评级信息': 'section_rating_info',
    '报价明细': 'section_items',
    '交付信息': 'section_delivery_info',
    '付款条款': 'section_payment_terms',
    '金额与日期': 'section_amount_and_date',
    '预算与日期': 'section_budget_and_date',
    '描述与备注': 'section_description_and_remark',
    '评分配置': 'section_scoring_config',
    '状态': 'section_status',
    '创建信息': 'section_created_info',
    '更新信息': 'section_updated_info',
    '附件': 'section_attachments',
    '审批流程': 'section_approval_flow',
    '历史记录': 'section_history',
    '备注': 'section_remark',
    '财务与税务': 'section_finance_and_tax',
    '风险与系统信息': 'section_risk_and_system',
    '人员信息': 'section_personnel_info',
    '教育经历': 'section_education',
    '工作经历': 'section_work_experience',
    '技能与证书': 'section_skills_and_certificates',
    '部门信息': 'section_department',
    '岗位信息': 'section_position',
    '薪资信息': 'section_salary',
    '考勤记录': 'section_attendance',
    '培训记录': 'section_training',
    '绩效记录': 'section_performance',
    '招聘信息': 'section_recruitment',
    '项目信息': 'section_project_info',
    '时间信息': 'section_time_info',
    '总览': 'section_overview',
    '统计': 'section_statistics',
    
    # Titles
    '评分维度配置': 'title',
    '供应商': 'title',
    '供应商管理': 'title',
    '供应商分类': 'title',
    '供应商产品': 'title',
    '供应商订单': 'title',
    '供应商合同': 'title',
    '供应商评估': 'title',
    '供应商绩效': 'title',
    '询价管理': 'title',
    '报价单管理': 'title',
    '招投标管理': 'title',
    '采购管理': 'title',
    '采购订单': 'title',
    '采购合同': 'title',
    '采购申请': 'title',
    '采购计划': 'title',
    'MRP计划': 'title',
    'MRP建议': 'title',
    '价格对比': 'title',
    '库存周转': 'title',
    '供应商准入': 'title',
    '交付预约': 'title',
    '客户管理': 'title',
    '客户档案': 'title',
    '联系人管理': 'title',
    '客户分级': 'title',
    '客户评分': 'title',
    '客户互动': 'title',
    '商机管理': 'title',
    '客户推荐': 'title',
    '退货管理': 'title',
    '工单管理': 'title',
    '报表管理': 'title',
    '工作流模板': 'title',
    '工作流定义': 'title',
    '工作流实例': 'title',
    '工作流监控': 'title',
    '审批管理': 'title',
    '质量管理': 'title',
    '质量控制': 'title',
    '质量成本': 'title',
    '不合格品管理': 'title',
    '内部审核': 'title',
    '标准管理': 'title',
    'APQP': 'title',
    'FMEA': 'title',
    '8D报告': 'title',
    'SPC': 'title',
    '设备管理': 'title',
    '设备OEE': 'title',
    '生产工序': 'title',
    '生产记录': 'title',
    '工作站管理': 'title',
    '工作汇报': 'title',
    '工单管理': 'title',
    '在制品管理': 'title',
    '团队管理': 'title',
    '生产排程': 'title',
    '生产订单': 'title',
    '工艺路线': 'title',
    '工艺流程': 'title',
    '物料退回': 'title',
    '物料需求': 'title',
    '物料发放': 'title',
    '物料BOM': 'title',
    '项目管理': 'title',
    '项目资源': 'title',
    '项目合同': 'title',
    '项目进度': 'title',
    '系统监控': 'title',
    '告警规则': 'title',
    '系统管理': 'title',
    '租户管理': 'title',
    '租户用户': 'title',
    '租户账单': 'title',
    '插件管理': 'title',
    '数据字典': 'title',
    '系统迁移': 'title',
    '银行账户': 'title',
    '账户管理': 'title',
    '数据源管理': 'title',
    '报表中心': 'title',
    
    # Create/Edit/Detail titles
    '新增评分维度': 'create_title',
    '编辑评分维度': 'edit_title',
    '评分维度详情': 'detail_title',
    '新增供应商': 'create_title',
    '编辑供应商': 'edit_title',
    '供应商详情': 'detail_title',
    '新增供应商分类': 'create_title',
    '编辑供应商分类': 'edit_title',
    '供应商分类详情': 'detail_title',
    '新增供应商产品': 'create_title',
    '编辑供应商产品': 'edit_title',
    '供应商产品详情': 'detail_title',
    '新增订单': 'create_title',
    '编辑订单': 'edit_title',
    '订单详情': 'detail_title',
    '新增合同': 'create_title',
    '编辑合同': 'edit_title',
    '合同详情': 'detail_title',
    '新增评估': 'create_title',
    '编辑评估': 'edit_title',
    '评估详情': 'detail_title',
    '新增绩效记录': 'create_title',
    '编辑绩效记录': 'edit_title',
    '绩效详情': 'detail_title',
    '新增询价单': 'create_title',
    '编辑询价单': 'edit_title',
    '询价单详情': 'detail_title',
    '新增报价单': 'create_title',
    '编辑报价单': 'edit_title',
    '报价单详情': 'detail_title',
    '新建招标项目': 'create_title',
    '编辑招标项目': 'edit_title',
    '招标项目详情': 'detail_title',
    '新增工单': 'create_title',
    '编辑工单': 'edit_title',
    '工单详情': 'detail_title',
    '新增客户': 'create_title',
    '编辑客户': 'edit_title',
    '客户详情': 'detail_title',
    '新增联系人': 'create_title',
    '编辑联系人': 'edit_title',
    '联系人详情': 'detail_title',
    '新增项目': 'create_title',
    '编辑项目': 'edit_title',
    '项目详情': 'detail_title',
    '新增资源': 'create_title',
    '编辑资源': 'edit_title',
    '资源详情': 'detail_title',
    '新增告警规则': 'create_title',
    '编辑告警规则': 'edit_title',
    '告警规则详情': 'detail_title',
    
    # Descriptions
    '管理供应商评分维度，配置权重、评分范围和状态': 'description',
    '管理供应商信息，包括基本信息、分类、状态、评级等': 'description',
    '管理供应商基础信息，包括编号、名称、分类、联系方式、风险等级等': 'description',
    '管理供应商分类体系': 'description',
    '管理供应商提供的产品信息': 'description',
    '管理向供应商下达的采购订单': 'description',
    '管理与供应商签订的各类合同': 'description',
    '管理对供应商的绩效评估和评级': 'description',
    '追踪供应商的交付、质量、服务等绩效指标': 'description',
    '管理对供应商的询价单': 'description',
    '管理供应商报价单，包括报价明细、金额、交付时间等信息': 'description',
    '管理招标项目、投标、开标、评标、定标全流程': 'description',
    '管理采购订单、到货验收、入库等流程': 'description',
    '管理采购合同，支持合同审批、执行和结算': 'description',
    '管理采购申请、审批、下单流程': 'description',
    '管理MRP计划编制和维护': 'description',
    '根据MRP运算结果生成采购建议': 'description',
    '多家供应商报价对比分析': 'description',
    '监控库存周转率，优化库存结构': 'description',
    '管理供应商准入审核流程': 'description',
    '管理交付预约和送货通知': 'description',
    '管理客户信息，包括基本资料、分类、联系人等': 'description',
    '管理客户联系人信息': 'description',
    '根据客户特征进行分级': 'description',
    '多维度客户评分模型': 'description',
    '记录客户互动历史，包括拜访、通话、邮件等': 'description',
    '管理销售商机，跟踪商机阶段和成交概率': 'description',
    '基于历史数据的客户推荐': 'description',
    '管理客户退货流程': 'description',
    '管理内部工单，支持问题上报和跟踪': 'description',
    '管理系统报表和数据统计': 'description',
    '管理工作流模板、审批节点和条件': 'description',
    '管理工作流定义和部署': 'description',
    '查看工作流实例执行情况': 'description',
    '监控工作流运行状态和性能指标': 'description',
    '管理审批流程，支持多级审批和条件审批': 'description',
    '管理企业质量方针、目标和体系文件': 'description',
    '监控质量指标和过程能力': 'description',
    '质量成本分析和报告': 'description',
    '管理不合格品的处置流程': 'description',
    '管理内部质量审核和外部审核': 'description',
    '管理质量标准和检验规范': 'description',
    '先期产品质量策划': 'description',
    '失效模式与影响分析': 'description',
    '8D问题解决报告': 'description',
    '统计过程控制': 'description',
    '管理生产工序和工艺流程': 'description',
    '记录生产过程数据': 'description',
    '管理生产工作站和设备': 'description',
    '生产日报和工作汇报': 'description',
    '管理生产工单和排程': 'description',
    '跟踪在制品状态和数量': 'description',
    '管理生产团队和人员': 'description',
    '生产排程计划和甘特图': 'description',
    '管理生产订单和交付': 'description',
    '定义产品制造工艺路线': 'description',
    '可视化工艺流程配置': 'description',
    '管理物料退回和不良品处理': 'description',
    '计算物料需求计划': 'description',
    '管理物料发放和出库': 'description',
    '管理物料BOM结构': 'description',
    '项目资源管理和分配': 'description',
    '管理项目合同和执行': 'description',
    '项目进度、里程碑和风险管理': 'description',
    '系统性能监控和告警': 'description',
    '配置告警规则和通知渠道': 'description',
    '管理系统租户和订阅': 'description',
    '管理租户用户和权限': 'description',
    '管理租户账单和订阅': 'description',
    '管理系统插件和扩展': 'description',
    '维护系统数据字典': 'description',
    '系统数据迁移和升级': 'description',
    '管理银行账户和交易': 'description',
    '管理系统数据源和连接': 'description',
    '管理系统报表和数据看板': 'description',
    
    # Filter labels
    '全部状态': 'filter_all_status',
    '全部分类': 'filter_all_categories',
    '全部风险': 'filter_all_risks',
    
    # Misc
    '法定名称': 'label_legal_name',
    '网站': 'label_website',
    'AAA': 'option_rating_aaa',
    'AA': 'option_rating_aa',
    'A': 'option_rating_a',
    'B': 'option_rating_b',
    'C': 'option_rating_c',
    '招投标方式': 'label_bidding_method',
    '招标方式': 'label_bidding_method',
    '公开招标': 'option_bidding_public',
    '邀请招标': 'option_bidding_invited',
    '竞争性谈判': 'option_bidding_negotiation',
    '询价采购': 'option_bidding_inquiry',
    '单一来源': 'option_bidding_single',
    '中标供应商': 'label_awarded_supplier',
    '投标数': 'label_bid_count',
    '中标供应商': 'label_winner',
    '项目编号': 'label_project_no',
    '项目类别': 'label_project_category',
    '层级': 'label_level',
    '一级': 'level_1',
    '二级': 'level_2',
    '三级': 'level_3',
    '层级与状态': 'section_level_and_status',
    '供应商数量': 'label_supplier_count',
    '风险与系统信息': 'section_risk_and_system',
    '创建信息': 'section_created_info',
    '基本信息': 'section_basic_info',
    '财务与税务': 'section_finance_tax',
    '风险等级': 'label_risk_level',
    '管理供应商分类，包括分类编码、名称、层级、状态等': 'description',
    '管理采购订单和供应商合同的财务视图': 'description',
    '管理供应商分类': 'description',
    '基本信息': 'section_basic_info',
    '供应商': 'label_supplier',
    '供应商ID': 'label_supplier_id',
    '供应商名称': 'label_supplier_name',
    '供应商编号': 'label_supplier_no',
    '供应商产品': 'label_supplier_product',
    '供应商订单': 'label_supplier_order',
    '供应商合同': 'label_supplier_contract',
    '供应商绩效': 'label_supplier_performance',
    '供应商评估': 'label_supplier_evaluation',
    '供应商准入': 'label_supplier_admission',
    '供应商数量': 'label_supplier_count',
    '合同名称': 'label_contract_name',
    '合同编号': 'label_contract_no',
    '合同类型': 'label_contract_type',
    '合同管理': 'title',
    '合同': 'label_contract',
    '合同详情': 'detail_title',
    '合同信息': 'section_contract_info',
    '全部状态': 'filter_all_status',
    '其他': 'option_other',
    '备注': 'label_remark',
    '描述': 'label_description',
    '创建时间': 'label_created_at',
    '更新时间': 'label_updated_at',
    '状态': 'label_status',
    '启用': 'status_active',
    '禁用': 'status_inactive',
    '草稿': 'status_draft',
    '有效': 'status_active',
    '无效': 'status_inactive',
    '基本信息': 'section_basic_info',
    '添加': 'action_add',
    '删除': 'action_delete',
    '保存': 'action_save',
    '取消': 'action_cancel',
    '确定': 'action_confirm',
    '提交': 'action_submit',
    '返回': 'action_back',
    '查看': 'action_view',
    '编辑': 'action_edit',
    '详情': 'action_detail',
    '新增': 'action_create',
}

# ============================================================
# 处理所有文件
# ============================================================

def generate_key(zh_text, file_key, counter_map):
    """Generate a unique key for a Chinese text."""
    if zh_text in GLOBAL_KEY_MAP:
        base_key = GLOBAL_KEY_MAP[zh_text]
    else:
        # Generate a key based on hash
        import hashlib
        h = hashlib.md5(zh_text.encode('utf-8')).hexdigest()[:8]
        base_key = f"auto_{h}"
    
    # Ensure uniqueness
    if base_key in counter_map:
        counter_map[base_key] += 1
        return f"{base_key}_{counter_map[base_key]}"
    else:
        counter_map[base_key] = 0
        return base_key


def process_file(file_path, module, file_name):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not HAN_RE.search(content):
        return 0
    
    # Extract all Chinese strings in single quotes
    chinese_strings = set(re.findall(r"'([^']*[\u4e00-\u9fa5][^']*)'", content))
    
    if not chinese_strings:
        return 0
    
    counter_map = {}
    mappings = {}
    
    for cs in sorted(chinese_strings):
        key = generate_key(cs, f"{module}/{file_name}", counter_map)
        mappings[cs] = key
    
    # Apply replacements (longest first to avoid partial matches)
    ts_prefix = f"schema.{module}.{file_name}"
    sorted_items = sorted(mappings.items(), key=lambda x: -len(x[0]))
    
    for zh_text, key in sorted_items:
        replacement = f"i18n.t('{ts_prefix}.{key}')"
        content = content.replace(f"'{zh_text}'", replacement)
    
    # Add import if not present
    if "import i18n from '@/i18n'" not in content:
        import_line = "import i18n from '@/i18n';\n"
        last_import_idx = content.rfind('import ')
        if last_import_idx != -1:
            semi_idx = content.find(';\n', last_import_idx)
            if semi_idx != -1:
                content = content[:semi_idx + 2] + import_line + content[semi_idx + 2:]
            else:
                content = import_line + content
        else:
            content = import_line + content
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Update translations
    if module not in zh.get('schema', {}):
        zh.setdefault('schema', {})
        zh['schema'][module] = {}
    zh['schema'][module][file_name] = zh['schema'][module].get(file_name, {})
    
    if module not in en.get('schema', {}):
        en.setdefault('schema', {})
        en['schema'][module] = {}
    en['schema'][module][file_name] = en['schema'][module].get(file_name, {})
    
    for zh_text, key in mappings.items():
        zh['schema'][module][file_name][key] = zh_text
        en['schema'][module][file_name][key] = zh_text
    
    return len(mappings)


# ============================================================
# 主循环
# ============================================================

TARGET_DIRS = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']

total_files = 0
total_keys = 0
errors = []

for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        file_name = os.path.splitext(fn)[0]
        
        try:
            count = process_file(file_path, d, file_name)
            if count > 0:
                total_files += 1
                total_keys += count
                print(f"  OK: {d}/{file_name} ({count} keys)")
        except Exception as e:
            errors.append(f"{d}/{file_name}: {str(e)}")
            print(f"  ERROR: {d}/{file_name}: {str(e)}")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {total_files} files, {total_keys} keys.')

if errors:
    print(f'\nErrors ({len(errors)}):')
    for e in errors:
        print(f'  {e}')

# Show remaining Chinese
print('\nRemaining Chinese in target files:')
for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        fp = os.path.join(dir_path, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        remaining = re.findall(r'[\u4e00-\u9fa5]', content)
        if remaining:
            print(f"  {d}/{fn}: {len(remaining)} chars: {''.join(remaining[:5])}...")
