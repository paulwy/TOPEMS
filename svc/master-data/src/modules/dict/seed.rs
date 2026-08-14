use sqlx::PgPool;

/// 预置系统基础字典数据
///
/// 包含：通用状态、性别、是/否、用户类型、审批状态、优先级、货币、单位等
pub async fn seed_dict_data(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 检查是否已初始化（避免重复插入）
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_dict_types WHERE category = 'system'")
            .fetch_one(pool)
            .await?;

    if count > 0 {
        tracing::info!("字典数据已存在，跳过初始化（{} 条系统字典类型）", count);
        return Ok(());
    }

    tracing::info!("开始初始化系统基础字典数据...");

    let system_dicts = get_system_dict_definitions();

    for (type_code, type_name, items) in &system_dicts {
        // 插入字典类型
        let type_id: uuid::Uuid = sqlx::query_scalar(
            r#"INSERT INTO core_dict_types (code, name, category, description)
               VALUES ($1, $2, 'system', $3)
               ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
               RETURNING id"#,
        )
        .bind(type_code)
        .bind(type_name)
        .bind(format!("系统预置 - {}", type_name))
        .fetch_one(pool)
        .await?;

        // 批量插入字典项
        for (idx, (code, name, value)) in items.iter().enumerate() {
            sqlx::query(
                r#"INSERT INTO core_dict_items (dict_type_id, code, name, value, sort_order)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (dict_type_id, code) DO UPDATE SET name = EXCLUDED.name, value = EXCLUDED.value"#,
            )
            .bind(type_id)
            .bind(code)
            .bind(name)
            .bind(value)
            .bind(idx as i32)
            .execute(pool)
            .await?;
        }
    }

    tracing::info!(
        "系统基础字典数据初始化完成（{} 个字典类型）",
        system_dicts.len()
    );
    Ok(())
}

type DictItemDef = (&'static str, &'static str, Option<&'static str>);
type DictTypeDef = (&'static str, &'static str, &'static [DictItemDef]);

fn get_system_dict_definitions() -> Vec<DictTypeDef> {
    vec![
        // 通用状态
        (
            "common_status",
            "通用状态",
            &[
                ("active", "启用", Some("1")),
                ("inactive", "禁用", Some("0")),
                ("draft", "草稿", Some("2")),
                ("archived", "归档", Some("3")),
            ],
        ),
        // 是/否
        (
            "boolean",
            "是/否",
            &[("yes", "是", Some("true")), ("no", "否", Some("false"))],
        ),
        // 性别
        (
            "gender",
            "性别",
            &[
                ("male", "男", Some("M")),
                ("female", "女", Some("F")),
                ("unknown", "未知", Some("U")),
            ],
        ),
        // 用户类型
        (
            "user_type",
            "用户类型",
            &[
                ("admin", "系统管理员", Some("1")),
                ("manager", "管理者", Some("2")),
                ("employee", "普通员工", Some("3")),
                ("external", "外部用户", Some("4")),
            ],
        ),
        // 审批状态
        (
            "approval_status",
            "审批状态",
            &[
                ("pending", "待审批", Some("0")),
                ("approved", "已通过", Some("1")),
                ("rejected", "已驳回", Some("2")),
                ("cancelled", "已撤回", Some("3")),
                ("processing", "审批中", Some("4")),
            ],
        ),
        // 优先级
        (
            "priority",
            "优先级",
            &[
                ("urgent", "紧急", Some("4")),
                ("high", "高", Some("3")),
                ("medium", "中", Some("2")),
                ("low", "低", Some("1")),
            ],
        ),
        // 货币
        (
            "currency",
            "货币",
            &[
                ("CNY", "人民币", Some("¥")),
                ("USD", "美元", Some("$")),
                ("EUR", "欧元", Some("€")),
                ("GBP", "英镑", Some("£")),
                ("JPY", "日元", Some("¥")),
            ],
        ),
        // 计量单位
        (
            "unit_of_measure",
            "计量单位",
            &[
                ("piece", "个", Some("PCS")),
                ("kg", "千克", Some("KG")),
                ("ton", "吨", Some("T")),
                ("meter", "米", Some("M")),
                ("box", "箱", Some("BOX")),
                ("roll", "卷", Some("ROLL")),
            ],
        ),
        // 采购订单状态
        (
            "purchase_order_status",
            "采购订单状态",
            &[
                ("draft", "草稿", Some("0")),
                ("pending", "待审批", Some("1")),
                ("approved", "已审批", Some("2")),
                ("ordered", "已下单", Some("3")),
                ("received", "已收货", Some("4")),
                ("closed", "已关闭", Some("5")),
                ("cancelled", "已取消", Some("6")),
            ],
        ),
        // 销售订单状态
        (
            "sales_order_status",
            "销售订单状态",
            &[
                ("draft", "草稿", Some("0")),
                ("pending", "待审批", Some("1")),
                ("approved", "已审批", Some("2")),
                ("shipped", "已发货", Some("3")),
                ("delivered", "已送达", Some("4")),
                ("closed", "已关闭", Some("5")),
                ("cancelled", "已取消", Some("6")),
            ],
        ),
        // 库存操作类型
        (
            "inventory_operation",
            "库存操作类型",
            &[
                ("inbound", "入库", Some("IN")),
                ("outbound", "出库", Some("OUT")),
                ("transfer", "调拨", Some("TR")),
                ("adjust", "调整", Some("AD")),
                ("check", "盘点", Some("CK")),
            ],
        ),
        // 客户等级
        (
            "customer_level",
            "客户等级",
            &[
                ("vip", "VIP客户", Some("1")),
                ("key", "重点客户", Some("2")),
                ("normal", "普通客户", Some("3")),
                ("potential", "潜在客户", Some("4")),
            ],
        ),
        // 商机阶段
        (
            "opportunity_stage",
            "商机阶段",
            &[
                ("lead", "线索", Some("1")),
                ("qualified", "已验证", Some("2")),
                ("proposal", "方案报价", Some("3")),
                ("negotiation", "谈判中", Some("4")),
                ("won", "已成交", Some("5")),
                ("lost", "已流失", Some("6")),
            ],
        ),
        // 员工状态
        (
            "employee_status",
            "员工状态",
            &[
                ("active", "在职", Some("1")),
                ("probation", "试用期", Some("2")),
                ("leave", "休假", Some("3")),
                ("resigned", "离职", Some("4")),
                ("retired", "退休", Some("5")),
            ],
        ),
        // 合同类型
        (
            "contract_type",
            "合同类型",
            &[
                ("fixed_term", "固定期限", Some("1")),
                ("open_ended", "无固定期限", Some("2")),
                ("task_based", "任务期限", Some("3")),
                ("internship", "实习", Some("4")),
            ],
        ),
        // 通知类型
        (
            "notification_type",
            "通知类型",
            &[
                ("system", "系统通知", Some("1")),
                ("approval", "审批通知", Some("2")),
                ("task", "任务通知", Some("3")),
                ("message", "消息通知", Some("4")),
                ("alert", "预警通知", Some("5")),
            ],
        ),
        // 插件状态
        (
            "plugin_status",
            "插件状态",
            &[
                ("enabled", "已启用", Some("enabled")),
                ("disabled", "已禁用", Some("disabled")),
                ("installed", "已安装", Some("installed")),
                ("uninstalled", "已卸载", Some("uninstalled")),
                ("upgrading", "升级中", Some("upgrading")),
                ("error", "异常", Some("error")),
            ],
        ),
        // 插件类型
        (
            "plugin_type",
            "插件类型",
            &[
                ("system", "系统插件", Some("system")),
                ("business", "业务插件", Some("business")),
                ("integration", "集成插件", Some("integration")),
                ("custom", "自定义插件", Some("custom")),
            ],
        ),
        // 数据权限级别
        (
            "data_scope",
            "数据权限",
            &[
                ("all", "全部数据", Some("all")),
                ("department", "本部门", Some("department")),
                ("self", "仅本人", Some("self")),
                ("custom", "自定义", Some("custom")),
            ],
        ),
        // 操作权限类型
        (
            "permission_type",
            "权限类型",
            &[
                ("menu", "菜单权限", Some("menu")),
                ("action", "操作权限", Some("action")),
                ("data", "数据权限", Some("data")),
                ("api", "API权限", Some("api")),
            ],
        ),
        // 日志级别
        (
            "log_level",
            "日志级别",
            &[
                ("debug", "调试", Some("debug")),
                ("info", "信息", Some("info")),
                ("warn", "警告", Some("warn")),
                ("error", "错误", Some("error")),
                ("fatal", "致命", Some("fatal")),
            ],
        ),
        // 语言类型
        (
            "language",
            "语言",
            &[
                ("zh_CN", "简体中文", Some("zh_CN")),
                ("zh_TW", "繁体中文", Some("zh_TW")),
                ("en_US", "英文", Some("en_US")),
                ("ja_JP", "日文", Some("ja_JP")),
                ("ko_KR", "韩文", Some("ko_KR")),
            ],
        ),
        // 时区
        (
            "timezone",
            "时区",
            &[
                ("Asia/Shanghai", "中国标准时间", Some("Asia/Shanghai")),
                ("UTC", "UTC时间", Some("UTC")),
                ("America/New_York", "美国东部时间", Some("America/New_York")),
                ("Europe/London", "英国伦敦时间", Some("Europe/London")),
                ("Asia/Tokyo", "日本东京时间", Some("Asia/Tokyo")),
            ],
        ),
        // 日期格式
        (
            "date_format",
            "日期格式",
            &[
                ("YYYY-MM-DD", "YYYY-MM-DD", Some("YYYY-MM-DD")),
                ("DD/MM/YYYY", "DD/MM/YYYY", Some("DD/MM/YYYY")),
                ("MM/DD/YYYY", "MM/DD/YYYY", Some("MM/DD/YYYY")),
                ("YYYY/MM/DD", "YYYY/MM/DD", Some("YYYY/MM/DD")),
            ],
        ),
        // 时间格式
        (
            "time_format",
            "时间格式",
            &[
                ("HH:mm:ss", "24小时制（含秒）", Some("HH:mm:ss")),
                ("HH:mm", "24小时制（不含秒）", Some("HH:mm")),
                ("h:mm:ss a", "12小时制（含秒）", Some("h:mm:ss a")),
                ("h:mm a", "12小时制（不含秒）", Some("h:mm a")),
            ],
        ),
        // 数字格式
        (
            "number_format",
            "数字格式",
            &[
                ("standard", "标准格式", Some("#,##0.00")),
                ("currency", "货币格式", Some("#,##0.00")),
                ("percent", "百分比", Some("0.00%")),
                ("integer", "整数", Some("#,##0")),
            ],
        ),
        // 文件类型
        (
            "file_type",
            "文件类型",
            &[
                ("image", "图片", Some("image")),
                ("document", "文档", Some("document")),
                ("video", "视频", Some("video")),
                ("audio", "音频", Some("audio")),
                ("archive", "压缩包", Some("archive")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 操作类型
        (
            "operation_type",
            "操作类型",
            &[
                ("create", "新增", Some("create")),
                ("update", "修改", Some("update")),
                ("delete", "删除", Some("delete")),
                ("query", "查询", Some("query")),
                ("export", "导出", Some("export")),
                ("import", "导入", Some("import")),
                ("approve", "审批", Some("approve")),
                ("reject", "驳回", Some("reject")),
            ],
        ),
        // 订单类型
        (
            "order_type",
            "订单类型",
            &[
                ("sales", "销售订单", Some("sales")),
                ("purchase", "采购订单", Some("purchase")),
                ("transfer", "调拨订单", Some("transfer")),
                ("return", "退货订单", Some("return")),
                ("refund", "退款订单", Some("refund")),
            ],
        ),
        // 支付方式
        (
            "payment_method",
            "支付方式",
            &[
                ("cash", "现金", Some("cash")),
                ("bank_transfer", "银行转账", Some("bank_transfer")),
                ("wechat", "微信支付", Some("wechat")),
                ("alipay", "支付宝", Some("alipay")),
                ("credit", "信用支付", Some("credit")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 发票类型
        (
            "invoice_type",
            "发票类型",
            &[
                ("vat_special", "增值税专用发票", Some("vat_special")),
                ("vat_general", "增值税普通发票", Some("vat_general")),
                ("electronic", "电子发票", Some("electronic")),
                ("receipt", "收据", Some("receipt")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 资产类型
        (
            "asset_type",
            "资产类型",
            &[
                ("fixed", "固定资产", Some("fixed")),
                ("current", "流动资产", Some("current")),
                ("intangible", "无形资产", Some("intangible")),
                ("investment", "投资资产", Some("investment")),
            ],
        ),
        // 成本类型
        (
            "cost_type",
            "成本类型",
            &[
                ("direct_material", "直接材料", Some("direct_material")),
                ("direct_labor", "直接人工", Some("direct_labor")),
                (
                    "manufacturing_overhead",
                    "制造费用",
                    Some("manufacturing_overhead"),
                ),
                ("administrative", "管理费用", Some("administrative")),
                ("sales", "销售费用", Some("sales")),
                ("research", "研发费用", Some("research")),
            ],
        ),
        // 财务期间
        (
            "fiscal_period",
            "财务期间",
            &[
                ("monthly", "月度", Some("monthly")),
                ("quarterly", "季度", Some("quarterly")),
                ("yearly", "年度", Some("yearly")),
                ("custom", "自定义", Some("custom")),
            ],
        ),
        // 报表类型
        (
            "report_type",
            "报表类型",
            &[
                ("balance_sheet", "资产负债表", Some("balance_sheet")),
                ("income_statement", "利润表", Some("income_statement")),
                ("cash_flow", "现金流量表", Some("cash_flow")),
                ("management", "管理报表", Some("management")),
                ("custom", "自定义报表", Some("custom")),
            ],
        ),
        // 项目状态
        (
            "project_status",
            "项目状态",
            &[
                ("planning", "规划中", Some("planning")),
                ("active", "进行中", Some("active")),
                ("on_hold", "暂停", Some("on_hold")),
                ("completed", "已完成", Some("completed")),
                ("cancelled", "已取消", Some("cancelled")),
            ],
        ),
        // 任务状态
        (
            "task_status",
            "任务状态",
            &[
                ("pending", "待处理", Some("pending")),
                ("in_progress", "进行中", Some("in_progress")),
                ("review", "审核中", Some("review")),
                ("completed", "已完成", Some("completed")),
                ("cancelled", "已取消", Some("cancelled")),
                ("blocked", "已阻塞", Some("blocked")),
            ],
        ),
        // 文档类型
        (
            "document_type",
            "文档类型",
            &[
                ("contract", "合同", Some("contract")),
                ("agreement", "协议", Some("agreement")),
                ("policy", "政策", Some("policy")),
                ("procedure", "流程", Some("procedure")),
                ("manual", "手册", Some("manual")),
                ("report", "报告", Some("report")),
                ("template", "模板", Some("template")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 质检类型
        (
            "qc_type",
            "质检类型",
            &[
                ("incoming", "来料检验", Some("incoming")),
                ("process", "过程检验", Some("process")),
                ("final", "成品检验", Some("final")),
                ("outgoing", "出货检验", Some("outgoing")),
                ("return", "退货检验", Some("return")),
            ],
        ),
        // 设备类型
        (
            "equipment_type",
            "设备类型",
            &[
                ("production", "生产设备", Some("production")),
                ("testing", "检测设备", Some("testing")),
                ("transport", "运输设备", Some("transport")),
                ("storage", "存储设备", Some("storage")),
                ("office", "办公设备", Some("office")),
            ],
        ),
        // 物料类别
        (
            "material_category",
            "物料类别",
            &[
                ("raw_material", "原材料", Some("raw_material")),
                ("semi_finished", "半成品", Some("semi_finished")),
                ("finished_goods", "成品", Some("finished_goods")),
                ("packaging", "包装材料", Some("packaging")),
                ("auxiliary", "辅料", Some("auxiliary")),
            ],
        ),
        // 工序类型
        (
            "process_type",
            "工序类型",
            &[
                ("machining", "机加工", Some("machining")),
                ("assembly", "装配", Some("assembly")),
                ("welding", "焊接", Some("welding")),
                ("painting", "喷涂", Some("painting")),
                ("inspection", "检验", Some("inspection")),
            ],
        ),
        // 订单状态
        (
            "order_status",
            "订单状态",
            &[
                ("draft", "草稿", Some("0")),
                ("pending", "待审批", Some("1")),
                ("approved", "已审批", Some("2")),
                ("processing", "执行中", Some("3")),
                ("completed", "已完成", Some("4")),
                ("closed", "已关闭", Some("5")),
                ("cancelled", "已取消", Some("6")),
            ],
        ),
        // 采购类型
        (
            "purchase_type",
            "采购类型",
            &[
                ("regular", "常规采购", Some("regular")),
                ("urgent", "紧急采购", Some("urgent")),
                ("centralized", "集中采购", Some("centralized")),
                ("decentralized", "零散采购", Some("decentralized")),
            ],
        ),
        // 销售渠道
        (
            "sales_channel",
            "销售渠道",
            &[
                ("direct", "直销", Some("direct")),
                ("distributor", "经销商", Some("distributor")),
                ("ecommerce", "电商平台", Some("ecommerce")),
                ("key_account", "大客户", Some("key_account")),
            ],
        ),
        // 供应商等级
        (
            "supplier_level",
            "供应商等级",
            &[
                ("strategic", "战略供应商", Some("1")),
                ("core", "核心供应商", Some("2")),
                ("qualified", "合格供应商", Some("3")),
                ("backup", "备选供应商", Some("4")),
            ],
        ),
        // 产品类别
        (
            "product_category",
            "产品类别",
            &[
                ("electronic", "电子产品", Some("electronic")),
                ("mechanical", "机械设备", Some("mechanical")),
                ("raw", "原材料", Some("raw")),
                ("accessory", "配件", Some("accessory")),
            ],
        ),
        // 仓库类型
        (
            "warehouse_type",
            "仓库类型",
            &[
                ("raw_material", "原材料仓", Some("raw_material")),
                ("finished_goods", "成品仓", Some("finished_goods")),
                ("semi_finished", "半成品仓", Some("semi_finished")),
                ("spare_parts", "备件仓", Some("spare_parts")),
            ],
        ),
        // 货位类型
        (
            "location_type",
            "货位类型",
            &[
                ("regular", "普通货架", Some("regular")),
                ("high", "高位货架", Some("high")),
                ("automated", "立体库位", Some("automated")),
                ("special", "特殊库位", Some("special")),
            ],
        ),
        // 计量单位
        (
            "unit",
            "计量单位",
            &[
                ("pc", "个", Some("PC")),
                ("kg", "千克", Some("KG")),
                ("ton", "吨", Some("TON")),
                ("m", "米", Some("M")),
                ("box", "箱", Some("BOX")),
                ("roll", "卷", Some("ROLL")),
            ],
        ),
        // 税率
        (
            "tax_rate",
            "税率",
            &[
                ("rate_13", "13%", Some("0.13")),
                ("rate_9", "9%", Some("0.09")),
                ("rate_6", "6%", Some("0.06")),
                ("rate_0", "0%", Some("0.00")),
            ],
        ),
        // 行业类型
        (
            "industry_type",
            "行业类型",
            &[
                ("manufacturing", "制造业", Some("manufacturing")),
                ("retail", "零售业", Some("retail")),
                ("services", "服务业", Some("services")),
                ("technology", "科技行业", Some("technology")),
                ("finance", "金融行业", Some("finance")),
                ("healthcare", "医疗健康", Some("healthcare")),
                ("education", "教育行业", Some("education")),
                ("logistics", "物流行业", Some("logistics")),
            ],
        ),
        // 企业规模
        (
            "company_size",
            "企业规模",
            &[
                ("micro", "微型企业", Some("micro")),
                ("small", "小型企业", Some("small")),
                ("medium", "中型企业", Some("medium")),
                ("large", "大型企业", Some("large")),
            ],
        ),
        // 客户来源
        (
            "customer_source",
            "客户来源",
            &[
                ("direct", "直接开发", Some("direct")),
                ("referral", "转介绍", Some("referral")),
                ("advertising", "广告投放", Some("advertising")),
                ("exhibition", "展会", Some("exhibition")),
                ("online", "线上渠道", Some("online")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 付款条件
        (
            "payment_terms",
            "付款条件",
            &[
                ("cod", "货到付款", Some("cod")),
                ("prepaid", "预付款", Some("prepaid")),
                ("net_30", "月结30天", Some("net_30")),
                ("net_60", "月结60天", Some("net_60")),
                ("net_90", "月结90天", Some("net_90")),
                ("installment", "分期付款", Some("installment")),
            ],
        ),
        // 运输方式
        (
            "shipping_method",
            "运输方式",
            &[
                ("road", "公路运输", Some("road")),
                ("rail", "铁路运输", Some("rail")),
                ("air", "航空运输", Some("air")),
                ("sea", "海运", Some("sea")),
                ("express", "快递", Some("express")),
                ("self_pickup", "自提", Some("self_pickup")),
            ],
        ),
        // 包装方式
        (
            "packaging_type",
            "包装方式",
            &[
                ("carton", "纸箱", Some("carton")),
                ("wooden", "木箱", Some("wooden")),
                ("pallet", "托盘", Some("pallet")),
                ("bubble", "气泡膜", Some("bubble")),
                ("vacuum", "真空包装", Some("vacuum")),
                ("custom", "定制包装", Some("custom")),
            ],
        ),
        // 质检结果
        (
            "qc_result",
            "质检结果",
            &[
                ("pass", "合格", Some("pass")),
                ("fail", "不合格", Some("fail")),
                ("rework", "返工", Some("rework")),
                ("scrap", "报废", Some("scrap")),
                ("hold", "待判定", Some("hold")),
            ],
        ),
        // 设备状态
        (
            "equipment_status",
            "设备状态",
            &[
                ("running", "运行中", Some("running")),
                ("idle", "待机", Some("idle")),
                ("maintenance", "维护中", Some("maintenance")),
                ("repair", "维修中", Some("repair")),
                ("stopped", "已停用", Some("stopped")),
                ("scrapped", "已报废", Some("scrapped")),
            ],
        ),
        // 工作班次
        (
            "work_shift",
            "工作班次",
            &[
                ("day", "白班", Some("day")),
                ("night", "夜班", Some("night")),
                ("overtime", "加班", Some("overtime")),
                ("holiday", "节假日", Some("holiday")),
            ],
        ),
        // 考勤类型
        (
            "attendance_type",
            "考勤类型",
            &[
                ("normal", "正常出勤", Some("normal")),
                ("late", "迟到", Some("late")),
                ("early_leave", "早退", Some("early_leave")),
                ("absent", "缺勤", Some("absent")),
                ("leave", "请假", Some("leave")),
                ("overtime", "加班", Some("overtime")),
                ("business_trip", "出差", Some("business_trip")),
            ],
        ),
        // 请假类型
        (
            "leave_type",
            "请假类型",
            &[
                ("annual", "年假", Some("annual")),
                ("sick", "病假", Some("sick")),
                ("personal", "事假", Some("personal")),
                ("maternity", "产假", Some("maternity")),
                ("paternity", "陪产假", Some("paternity")),
                ("funeral", "丧假", Some("funeral")),
                ("marriage", "婚假", Some("marriage")),
                ("study", "学习假", Some("study")),
            ],
        ),
        // 培训类型
        (
            "training_type",
            "培训类型",
            &[
                ("onboarding", "入职培训", Some("onboarding")),
                ("skill", "技能培训", Some("skill")),
                ("management", "管理培训", Some("management")),
                ("safety", "安全培训", Some("safety")),
                ("compliance", "合规培训", Some("compliance")),
                ("product", "产品培训", Some("product")),
            ],
        ),
        // 绩效等级
        (
            "performance_level",
            "绩效等级",
            &[
                ("excellent", "优秀", Some("excellent")),
                ("good", "良好", Some("good")),
                ("qualified", "合格", Some("qualified")),
                ("needs_improvement", "待改进", Some("needs_improvement")),
                ("poor", "不合格", Some("poor")),
            ],
        ),
        // 报销类型
        (
            "expense_type",
            "报销类型",
            &[
                ("travel", "差旅费", Some("travel")),
                ("meal", "餐饮费", Some("meal")),
                ("transport", "交通费", Some("transport")),
                ("communication", "通讯费", Some("communication")),
                ("office", "办公费", Some("office")),
                ("training", "培训费", Some("training")),
                ("entertainment", "招待费", Some("entertainment")),
                ("other", "其他", Some("other")),
            ],
        ),
        // 预算类型
        (
            "budget_type",
            "预算类型",
            &[
                ("annual", "年度预算", Some("annual")),
                ("quarterly", "季度预算", Some("quarterly")),
                ("project", "项目预算", Some("project")),
                ("department", "部门预算", Some("department")),
                ("rolling", "滚动预算", Some("rolling")),
            ],
        ),
        // 审批流程类型
        (
            "approval_flow_type",
            "审批流程类型",
            &[
                ("serial", "串行审批", Some("serial")),
                ("parallel", "并行审批", Some("parallel")),
                ("conditional", "条件审批", Some("conditional")),
                ("countersign", "会签", Some("countersign")),
                ("self_approval", "自审批", Some("self_approval")),
            ],
        ),
        // 消息渠道
        (
            "message_channel",
            "消息渠道",
            &[
                ("system", "系统消息", Some("system")),
                ("email", "邮件", Some("email")),
                ("sms", "短信", Some("sms")),
                ("wechat", "微信", Some("wechat")),
                ("dingtalk", "钉钉", Some("dingtalk")),
                ("feishu", "飞书", Some("feishu")),
            ],
        ),
        // 数据同步状态
        (
            "sync_status",
            "数据同步状态",
            &[
                ("pending", "待同步", Some("pending")),
                ("syncing", "同步中", Some("syncing")),
                ("completed", "已完成", Some("completed")),
                ("failed", "失败", Some("failed")),
                ("skipped", "已跳过", Some("skipped")),
            ],
        ),
        // 存储类型
        (
            "storage_type",
            "存储类型",
            &[
                ("local", "本地存储", Some("local")),
                ("cloud", "云存储", Some("cloud")),
                ("database", "数据库", Some("database")),
                ("cache", "缓存", Some("cache")),
                ("cdn", "CDN", Some("cdn")),
            ],
        ),
        // 接口类型
        (
            "api_type",
            "接口类型",
            &[
                ("rest", "RESTful", Some("rest")),
                ("graphql", "GraphQL", Some("graphql")),
                ("websocket", "WebSocket", Some("websocket")),
                ("grpc", "gRPC", Some("grpc")),
                ("webhook", "Webhook", Some("webhook")),
            ],
        ),
        // 认证方式
        (
            "auth_method",
            "认证方式",
            &[
                ("password", "密码认证", Some("password")),
                ("sms", "短信认证", Some("sms")),
                ("email", "邮件认证", Some("email")),
                ("oauth", "OAuth2", Some("oauth")),
                ("ldap", "LDAP", Some("ldap")),
                ("saml", "SAML", Some("saml")),
                ("biometric", "生物识别", Some("biometric")),
            ],
        ),
        // 加密算法
        (
            "encryption_algorithm",
            "加密算法",
            &[
                ("aes_256", "AES-256", Some("aes_256")),
                ("rsa_2048", "RSA-2048", Some("rsa_2048")),
                ("rsa_4096", "RSA-4096", Some("rsa_4096")),
                ("sha_256", "SHA-256", Some("sha_256")),
                ("sha_512", "SHA-512", Some("sha_512")),
                ("hmac_sha256", "HMAC-SHA256", Some("hmac_sha256")),
            ],
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    fn collect_all_codes(defs: &[DictTypeDef]) -> Vec<String> {
        defs.iter()
            .flat_map(|(code, _, items)| {
                std::iter::once(code.to_string()).chain(items.iter().map(|(c, _, _)| c.to_string()))
            })
            .collect()
    }

    // ---------- get_system_dict_definitions 基础断言 ----------

    #[test]
    fn test_system_dict_definitions_not_empty() {
        let defs = get_system_dict_definitions();
        assert!(!defs.is_empty(), "系统字典定义不应为空");
    }

    #[test]
    fn test_system_dict_definitions_returns_known_count() {
        // 当前实现共 70 个字典类型；此处只校验下限，避免每次新增都改测试
        let defs = get_system_dict_definitions();
        assert!(defs.len() >= 60, "系统字典定义数量异常: {}", defs.len());
    }

    #[test]
    fn test_each_dict_type_has_non_empty_code() {
        let defs = get_system_dict_definitions();
        for (code, _, _) in &defs {
            assert!(!code.is_empty(), "字典类型 code 不能为空");
        }
    }

    #[test]
    fn test_each_dict_type_has_non_empty_name() {
        let defs = get_system_dict_definitions();
        for (_, name, _) in &defs {
            assert!(!name.is_empty(), "字典类型 name 不能为空");
        }
    }

    #[test]
    fn test_each_dict_type_has_items() {
        let defs = get_system_dict_definitions();
        for (code, _, items) in &defs {
            assert!(
                !items.is_empty(),
                "字典类型 {} 必须至少包含一个字典项",
                code
            );
        }
    }

    #[test]
    fn test_dict_type_codes_unique() {
        let defs = get_system_dict_definitions();
        let codes: Vec<&str> = defs.iter().map(|(c, _, _)| *c).collect();
        let set: HashSet<&str> = codes.iter().copied().collect();
        assert_eq!(codes.len(), set.len(), "字典类型 code 必须唯一");
    }

    #[test]
    fn test_dict_item_codes_unique_within_type() {
        let defs = get_system_dict_definitions();
        for (type_code, _, items) in &defs {
            let codes: Vec<&str> = items.iter().map(|(c, _, _)| *c).collect();
            let set: HashSet<&str> = codes.iter().copied().collect();
            assert_eq!(
                codes.len(),
                set.len(),
                "字典类型 {} 内的字典项 code 必须唯一",
                type_code
            );
        }
    }

    #[test]
    fn test_dict_item_codes_non_empty() {
        let defs = get_system_dict_definitions();
        for (type_code, _, items) in &defs {
            for (code, _, _) in items.iter() {
                assert!(
                    !code.is_empty(),
                    "字典类型 {} 内的字典项 code 不能为空",
                    type_code
                );
            }
        }
    }

    #[test]
    fn test_dict_item_names_non_empty() {
        let defs = get_system_dict_definitions();
        for (type_code, _, items) in &defs {
            for (code, name, _) in items.iter() {
                assert!(
                    !name.is_empty(),
                    "字典类型 {} 内字典项 {} 的 name 不能为空",
                    type_code,
                    code
                );
            }
        }
    }

    // ---------- 验证关键字典类型存在 ----------

    #[test]
    fn test_common_status_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "common_status");
        assert!(has, "应包含 common_status 字典类型");
    }

    #[test]
    fn test_gender_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "gender");
        assert!(has, "应包含 gender 字典类型");
    }

    #[test]
    fn test_boolean_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "boolean");
        assert!(has, "应包含 boolean 字典类型");
    }

    #[test]
    fn test_currency_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "currency");
        assert!(has, "应包含 currency 字典类型");
    }

    #[test]
    fn test_log_level_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "log_level");
        assert!(has, "应包含 log_level 字典类型");
    }

    #[test]
    fn test_plugin_status_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "plugin_status");
        assert!(has, "应包含 plugin_status 字典类型");
    }

    #[test]
    fn test_auth_method_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "auth_method");
        assert!(has, "应包含 auth_method 字典类型");
    }

    #[test]
    fn test_encryption_algorithm_dict_present() {
        let defs = get_system_dict_definitions();
        let has = defs.iter().any(|(c, _, _)| *c == "encryption_algorithm");
        assert!(has, "应包含 encryption_algorithm 字典类型");
    }

    // ---------- 验证关键字典项内容 ----------

    #[test]
    fn test_common_status_contains_active_and_inactive() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "common_status")
            .expect("common_status 应存在");
        let codes: Vec<&str> = entry.2.iter().map(|(c, _, _)| *c).collect();
        assert!(codes.contains(&"active"), "common_status 应包含 active");
        assert!(codes.contains(&"inactive"), "common_status 应包含 inactive");
    }

    #[test]
    fn test_gender_has_three_items() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "gender")
            .expect("gender 应存在");
        assert_eq!(entry.2.len(), 3, "gender 字典项应为 3 个");
    }

    #[test]
    fn test_boolean_yes_no_values() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "boolean")
            .expect("boolean 应存在");
        let yes = entry
            .2
            .iter()
            .find(|(c, _, _)| *c == "yes")
            .expect("boolean 应包含 yes");
        assert_eq!(yes.2, Some("true"));
        let no = entry
            .2
            .iter()
            .find(|(c, _, _)| *c == "no")
            .expect("boolean 应包含 no");
        assert_eq!(no.2, Some("false"));
    }

    #[test]
    fn test_currency_contains_cny_and_usd() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "currency")
            .expect("currency 应存在");
        let codes: Vec<&str> = entry.2.iter().map(|(c, _, _)| *c).collect();
        assert!(codes.contains(&"CNY"), "currency 应包含 CNY");
        assert!(codes.contains(&"USD"), "currency 应包含 USD");
    }

    #[test]
    fn test_log_level_contains_all_levels() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "log_level")
            .expect("log_level 应存在");
        let codes: Vec<&str> = entry.2.iter().map(|(c, _, _)| *c).collect();
        for expected in &["debug", "info", "warn", "error", "fatal"] {
            assert!(codes.contains(expected), "log_level 应包含 {}", expected);
        }
    }

    #[test]
    fn test_tax_rate_values_are_decimal_strings() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "tax_rate")
            .expect("tax_rate 应存在");
        for (_, _, value) in entry.2 {
            let v = value.expect("tax_rate 的 value 不应为 None");
            assert!(
                v.parse::<f64>().is_ok(),
                "tax_rate value 应为合法小数: {}",
                v
            );
        }
    }

    #[test]
    fn test_language_dict_contains_zh_cn() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "language")
            .expect("language 应存在");
        let codes: Vec<&str> = entry.2.iter().map(|(c, _, _)| *c).collect();
        assert!(codes.contains(&"zh_CN"), "language 应包含 zh_CN");
    }

    #[test]
    fn test_timezone_dict_contains_asia_shanghai() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "timezone")
            .expect("timezone 应存在");
        let codes: Vec<&str> = entry.2.iter().map(|(c, _, _)| *c).collect();
        assert!(
            codes.contains(&"Asia/Shanghai"),
            "timezone 应包含 Asia/Shanghai"
        );
    }

    #[test]
    fn test_priority_dict_has_four_levels() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "priority")
            .expect("priority 应存在");
        assert_eq!(entry.2.len(), 4, "priority 字典项应为 4 个");
        let codes: Vec<&str> = entry.2.iter().map(|(c, _, _)| *c).collect();
        for expected in &["urgent", "high", "medium", "low"] {
            assert!(codes.contains(expected), "priority 应包含 {}", expected);
        }
    }

    #[test]
    fn test_approval_status_has_five_states() {
        let defs = get_system_dict_definitions();
        let entry = defs
            .iter()
            .find(|(c, _, _)| *c == "approval_status")
            .expect("approval_status 应存在");
        assert_eq!(entry.2.len(), 5, "approval_status 字典项应为 5 个");
    }

    // ---------- 类型别名与签名验证 ----------

    #[test]
    fn test_dict_item_def_tuple_layout() {
        let defs = get_system_dict_definitions();
        let first = defs.first().expect("至少应有一个字典类型");
        let (_, _, items) = first;
        let first_item = items.first().expect("字典类型应至少有一个字典项");
        // 仅断言 tuple 字段数量；编译期已保证类型
        let _: &str = first_item.0;
        let _: &str = first_item.1;
        let _: &Option<&str> = &first_item.2;
    }

    #[test]
    fn test_dict_type_def_tuple_layout() {
        let defs = get_system_dict_definitions();
        let first = defs.first().expect("至少应有一个字典类型");
        let _: &str = first.0;
        let _: &str = first.1;
        let _: &&[DictItemDef] = &first.2;
    }

    #[test]
    fn test_all_codes_are_ascii() {
        // 字典 code 应为 ASCII；中文名不在限制范围内
        let defs = get_system_dict_definitions();
        for (code, _, items) in &defs {
            assert!(code.is_ascii(), "字典类型 code 应为 ASCII: {}", code);
            for (item_code, _, _) in items.iter() {
                assert!(
                    item_code.is_ascii(),
                    "字典项 code 应为 ASCII: {}",
                    item_code
                );
            }
        }
    }

    #[test]
    fn test_collect_all_codes_helper() {
        let defs = get_system_dict_definitions();
        let codes = collect_all_codes(&defs);
        // 至少应包含 60 个类型 + 大量字典项
        assert!(codes.len() > 60, "collect_all_codes 返回数量异常");
    }
}
