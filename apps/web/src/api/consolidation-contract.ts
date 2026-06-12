/**
 * 合并报表后端API接口契约
 * 为后端开发提供详细的接口规范
 */

// ============================================
// 一、合并范围管理 API
// ============================================

export const consolidationScopeApiContract = {
  /**
   * 获取合并范围列表
   * GET /api/v1/consolidation/scopes
   */
  list: {
    method: "GET",
    path: "/api/v1/consolidation/scopes",
    queryParams: {
      keyword: "string? 关键字搜索(名称/编码)",
      status: "string? 状态筛选",
      consolidation_method: "string? 合并方法",
      page: "number? 页码(默认1)",
      page_size: "number? 每页条数(默认20)",
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: "uuid",
            code: "string",
            name: "string",
            description: "string?",
            consolidation_method: "full | equity | proportional",
            status: "active | inactive | draft",
            company_count: "number",
            created_at: "ISO8601",
            updated_at: "ISO8601",
          },
        ],
        total: "number",
        page: "number",
        page_size: "number",
        total_pages: "number",
      },
    },
  },

  /**
   * 获取合并范围详情
   * GET /api/v1/consolidation/scopes/:scopeId
   */
  get: {
    method: "GET",
    path: "/api/v1/consolidation/scopes/:scopeId",
    pathParams: {
      scopeId: "uuid 合并范围ID",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        code: "string",
        name: "string",
        description: "string?",
        consolidation_method: "full | equity | proportional",
        status: "active | inactive | draft",
        created_at: "ISO8601",
        updated_at: "ISO8601",
        created_by: "uuid?",
      },
    },
  },

  /**
   * 创建合并范围
   * POST /api/v1/consolidation/scopes
   */
  create: {
    method: "POST",
    path: "/api/v1/consolidation/scopes",
    body: {
      code: "string 合并范围编码(必填,唯一)",
      name: "string 合并范围名称(必填)",
      description: "string? 说明",
      consolidation_method: "string 合并方法(默认full)",
      status: "string? 状态(默认draft)",
    },
    response: {
      code: 201,
      data: {
        id: "uuid",
        code: "string",
        name: "string",
        consolidation_method: "string",
        status: "string",
        created_at: "ISO8601",
      },
    },
  },

  /**
   * 更新合并范围
   * PUT /api/v1/consolidation/scopes/:scopeId
   */
  update: {
    method: "PUT",
    path: "/api/v1/consolidation/scopes/:scopeId",
    pathParams: {
      scopeId: "uuid 合并范围ID",
    },
    body: {
      name: "string? 合并范围名称",
      description: "string? 说明",
      consolidation_method: "string? 合并方法",
      status: "string? 状态",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        code: "string",
        name: "string",
        consolidation_method: "string",
        status: "string",
        updated_at: "ISO8601",
      },
    },
  },

  /**
   * 删除合并范围
   * DELETE /api/v1/consolidation/scopes/:scopeId
   */
  delete: {
    method: "DELETE",
    path: "/api/v1/consolidation/scopes/:scopeId",
    pathParams: {
      scopeId: "uuid 合并范围ID",
    },
    response: {
      code: 204,
    },
  },
};

// ============================================
// 二、合并范围公司管理 API
// ============================================

export const consolidationScopeCompanyApiContract = {
  /**
   * 获取合并范围内的公司列表
   * GET /api/v1/consolidation/scopes/:scopeId/companies
   */
  list: {
    method: "GET",
    path: "/api/v1/consolidation/scopes/:scopeId/companies",
    pathParams: {
      scopeId: "uuid 合并范围ID",
    },
    response: {
      code: 200,
      data: [
        {
          id: "uuid",
          scope_id: "uuid",
          company_id: "uuid",
          company_code: "string",
          company_name: "string",
          is_parent: "boolean",
          control_type: "full_control | joint_venture | associate",
          ownership_percentage: "number",
          consolidation_percentage: "number",
          minority_interest: "number",
          effective_date: "date?",
          created_at: "ISO8601",
        },
      ],
    },
  },

  /**
   * 添加公司到合并范围
   * POST /api/v1/consolidation/scopes/companies
   */
  add: {
    method: "POST",
    path: "/api/v1/consolidation/scopes/companies",
    body: {
      scope_id: "uuid 合并范围ID(必填)",
      company_id: "uuid 公司ID(必填)",
      is_parent: "boolean 是否为母公司(默认false)",
      control_type: "string 控制类型(必填)",
      ownership_percentage: "number 持股比例(必填,0-100)",
      consolidation_percentage: "number 合并比例(必填,0-100)",
      minority_interest: "number? 少数股东权益(默认0)",
      effective_date: "date? 生效日期",
    },
    response: {
      code: 201,
      data: {
        id: "uuid",
        scope_id: "uuid",
        company_id: "uuid",
        is_parent: "boolean",
        control_type: "string",
        ownership_percentage: "number",
        consolidation_percentage: "number",
        created_at: "ISO8601",
      },
    },
  },

  /**
   * 更新合并范围公司
   * PUT /api/v1/consolidation/scopes/companies/:companyId
   */
  update: {
    method: "PUT",
    path: "/api/v1/consolidation/scopes/companies/:companyId",
    pathParams: {
      companyId: "uuid 合并范围公司ID",
    },
    body: {
      control_type: "string? 控制类型",
      ownership_percentage: "number? 持股比例",
      consolidation_percentage: "number? 合并比例",
      minority_interest: "number? 少数股东权益",
      expiry_date: "date? 失效日期",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        control_type: "string",
        ownership_percentage: "number",
        consolidation_percentage: "number",
        updated_at: "ISO8601",
      },
    },
  },

  /**
   * 从合并范围移除公司
   * DELETE /api/v1/consolidation/scopes/companies/:companyId
   */
  remove: {
    method: "DELETE",
    path: "/api/v1/consolidation/scopes/companies/:companyId",
    pathParams: {
      companyId: "uuid 合并范围公司ID",
    },
    response: {
      code: 204,
    },
  },
};

// ============================================
// 三、抵消规则管理 API
// ============================================

export const eliminationRuleApiContract = {
  /**
   * 获取抵消规则列表
   * GET /api/v1/consolidation/elimination-rules
   */
  list: {
    method: "GET",
    path: "/api/v1/consolidation/elimination-rules",
    queryParams: {
      scope_id: "uuid 合并范围ID(必填)",
      type: "string? 规则类型",
      status: "string? 状态",
      keyword: "string? 关键字搜索",
      page: "number? 页码",
      page_size: "number? 每页条数",
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: "uuid",
            scope_id: "uuid",
            code: "string",
            name: "string",
            type: "EliminationRuleType",
            description: "string?",
            status: "active | inactive | draft",
            direction: "debit | credit | both",
            auto_elimination: "boolean",
            priority: "number",
            created_at: "ISO8601",
            updated_at: "ISO8601",
          },
        ],
        total: "number",
        page: "number",
        page_size: "number",
      },
    },
  },

  /**
   * 获取抵消规则详情
   * GET /api/v1/consolidation/elimination-rules/:ruleId
   */
  get: {
    method: "GET",
    path: "/api/v1/consolidation/elimination-rules/:ruleId",
    pathParams: {
      ruleId: "uuid 抵消规则ID",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        scope_id: "uuid",
        code: "string",
        name: "string",
        type: "EliminationRuleType",
        description: "string?",
        status: "string",
        direction: "string",
        debit_account_codes: "string[]?",
        credit_account_codes: "string[]?",
        company_pairs: "Array?",
        auto_elimination: "boolean",
        priority: "number",
        created_at: "ISO8601",
        updated_at: "ISO8601",
      },
    },
  },

  /**
   * 创建抵消规则
   * POST /api/v1/consolidation/elimination-rules
   */
  create: {
    method: "POST",
    path: "/api/v1/consolidation/elimination-rules",
    body: {
      scope_id: "uuid 合并范围ID(必填)",
      code: "string 规则编码(必填,唯一)",
      name: "string 规则名称(必填)",
      type: "string 规则类型(必填)",
      description: "string? 说明",
      status: "string? 状态(默认active)",
      direction: "string? 抵消方向(默认both)",
      debit_account_codes: "string[]? 借方科目",
      credit_account_codes: "string[]? 贷方科目",
      company_pairs: "Array? 关联公司组",
      auto_elimination: "boolean? 自动抵消(默认true)",
      priority: "number? 优先级(默认100)",
    },
    response: {
      code: 201,
      data: {
        id: "uuid",
        scope_id: "uuid",
        code: "string",
        name: "string",
        type: "string",
        created_at: "ISO8601",
      },
    },
  },

  /**
   * 更新抵消规则
   * PUT /api/v1/consolidation/elimination-rules/:ruleId
   */
  update: {
    method: "PUT",
    path: "/api/v1/consolidation/elimination-rules/:ruleId",
    pathParams: {
      ruleId: "uuid 抵消规则ID",
    },
    body: {
      name: "string? 规则名称",
      description: "string? 说明",
      status: "string? 状态",
      direction: "string? 抵消方向",
      debit_account_codes: "string[]? 借方科目",
      credit_account_codes: "string[]? 贷方科目",
      company_pairs: "Array? 关联公司组",
      auto_elimination: "boolean? 自动抵消",
      priority: "number? 优先级",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        updated_at: "ISO8601",
      },
    },
  },

  /**
   * 删除抵消规则
   * DELETE /api/v1/consolidation/elimination-rules/:ruleId
   */
  delete: {
    method: "DELETE",
    path: "/api/v1/consolidation/elimination-rules/:ruleId",
    pathParams: {
      ruleId: "uuid 抵消规则ID",
    },
    response: {
      code: 204,
    },
  },
};

// ============================================
// 四、内部交易 API
// ============================================

export const internalTransactionApiContract = {
  /**
   * 获取内部交易列表
   * GET /api/v1/consolidation/internal-transactions
   */
  list: {
    method: "GET",
    path: "/api/v1/consolidation/internal-transactions",
    queryParams: {
      scope_id: "uuid? 合并范围ID",
      from_company_id: "uuid? 交易方公司ID",
      to_company_id: "uuid? 交易对方公司ID",
      transaction_type: "string? 交易类型",
      elimination_status: "string? 抵消状态",
      period_from: "string? 期间起(YYYY-MM)",
      period_to: "string? 期间止(YYYY-MM)",
      page: "number? 页码",
      page_size: "number? 每页条数",
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: "uuid",
            transaction_no: "string",
            transaction_date: "date",
            period: "string",
            from_company_id: "uuid",
            from_company_name: "string",
            to_company_id: "uuid",
            to_company_name: "string",
            transaction_type: "string",
            description: "string?",
            amount: "number",
            currency: "string",
            elimination_status:
              "pending | eliminated | partial | not_applicable",
            eliminated_amount: "number",
            remaining_amount: "number",
            voucher_id: "uuid?",
            elimination_voucher_id: "uuid?",
            created_at: "ISO8601",
          },
        ],
        total: "number",
      },
    },
  },

  /**
   * 执行内部交易抵消
   * POST /api/v1/consolidation/execute-elimination
   */
  executeElimination: {
    method: "POST",
    path: "/api/v1/consolidation/execute-elimination",
    body: {
      scope_id: "uuid 合并范围ID(必填)",
      period: "string 会计期间(必填,YYYY-MM)",
      rule_ids: "uuid[]? 指定规则ID(不传则执行所有规则)",
    },
    response: {
      code: 200,
      data: {
        eliminated_count: "number 抵消笔数",
        total_eliminated: "number 总抵消金额",
        results: [
          {
            rule_id: "uuid",
            rule_name: "string",
            rule_type: "string",
            transaction_count: "number",
            total_eliminated: "number",
            success: "boolean",
            error_message: "string?",
          },
        ],
      },
    },
  },
};

// ============================================
// 五、合并报表 API
// ============================================

export const consolidationReportApiContract = {
  /**
   * 获取合并报表列表
   * GET /api/v1/consolidation/reports
   */
  list: {
    method: "GET",
    path: "/api/v1/consolidation/reports",
    queryParams: {
      scope_id: "uuid? 合并范围ID",
      report_type: "string? 报表类型",
      period_from: "string? 期间起(YYYY-MM)",
      period_to: "string? 期间止(YYYY-MM)",
      status: "string? 状态",
      approval_status: "string? 审批状态",
      page: "number? 页码",
      page_size: "number? 每页条数",
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: "uuid",
            report_no: "string",
            report_type: "ConsolidationReportType",
            scope_id: "uuid",
            scope_name: "string",
            period: "string",
            status: "draft | calculating | completed | published",
            company_count: "number",
            eliminated_company_count: "number",
            total_assets: "number?",
            total_liabilities: "number?",
            total_equity: "number?",
            net_profit: "number?",
            approval_status: "pending | approved | rejected",
            generated_at: "ISO8601?",
            created_at: "ISO8601",
          },
        ],
        total: "number",
      },
    },
  },

  /**
   * 获取合并报表详情
   * GET /api/v1/consolidation/reports/:reportId
   */
  get: {
    method: "GET",
    path: "/api/v1/consolidation/reports/:reportId",
    pathParams: {
      reportId: "uuid 报表ID",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        report_no: "string",
        report_type: "string",
        scope_id: "uuid",
        scope_name: "string",
        period: "string",
        year: "number",
        quarter: "number?",
        month: "number?",
        status: "string",
        company_count: "number",
        eliminated_company_count: "number",
        total_assets: "number?",
        total_liabilities: "number?",
        total_equity: "number?",
        total_revenue: "number?",
        total_profit: "number?",
        net_profit: "number?",
        minority_interest: "number?",
        parent_net_profit: "number?",
        approval_status: "string",
        approved_by: "uuid?",
        approved_at: "ISO8601?",
        published_by: "uuid?",
        published_at: "ISO8601?",
        generated_by: "uuid?",
        generated_at: "ISO8601?",
        created_at: "ISO8601",
        updated_at: "ISO8601",
      },
    },
  },

  /**
   * 生成合并报表
   * POST /api/v1/consolidation/reports/generate
   */
  generate: {
    method: "POST",
    path: "/api/v1/consolidation/reports/generate",
    body: {
      scope_id: "uuid 合并范围ID(必填)",
      report_type: "string 报表类型(必填)",
      period: "string 报表期间(必填,YYYY-MM)",
      include_prior_period: "boolean 是否包含上期数据(默认true)",
      auto_eliminate: "boolean 是否自动抵消(默认true)",
    },
    response: {
      code: 201,
      data: {
        report_id: "uuid",
        report_no: "string",
        status: "calculating | completed",
        elimination_results: [
          {
            rule_id: "uuid",
            rule_name: "string",
            rule_type: "string",
            transaction_count: "number",
            total_eliminated: "number",
            success: "boolean",
            error_message: "string?",
          },
        ],
        generated_at: "ISO8601",
        warnings: "string[]?",
      },
    },
  },

  /**
   * 获取合并报表行项目
   * GET /api/v1/consolidation/reports/:reportId/lines
   */
  getLines: {
    method: "GET",
    path: "/api/v1/consolidation/reports/:reportId/lines",
    pathParams: {
      reportId: "uuid 报表ID",
    },
    response: {
      code: 200,
      data: [
        {
          id: "uuid",
          report_id: "uuid",
          line_no: "number",
          item_code: "string?",
          item_name: "string",
          item_level: "number",
          current_period: "number",
          prior_period: "number?",
          company_breakdown: "Array?",
          elimination_breakdown: "Array?",
          formula: "string?",
          notes: "string?",
        },
      ],
    },
  },

  /**
   * 审批合并报表
   * POST /api/v1/consolidation/reports/:reportId/approve
   */
  approve: {
    method: "POST",
    path: "/api/v1/consolidation/reports/:reportId/approve",
    pathParams: {
      reportId: "uuid 报表ID",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        approval_status: "approved",
        approved_by: "uuid",
        approved_at: "ISO8601",
      },
    },
  },

  /**
   * 发布合并报表
   * POST /api/v1/consolidation/reports/:reportId/publish
   */
  publish: {
    method: "POST",
    path: "/api/v1/consolidation/reports/:reportId/publish",
    pathParams: {
      reportId: "uuid 报表ID",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        status: "published",
        published_by: "uuid",
        published_at: "ISO8601",
      },
    },
  },

  /**
   * 删除合并报表
   * DELETE /api/v1/consolidation/reports/:reportId
   */
  delete: {
    method: "DELETE",
    path: "/api/v1/consolidation/reports/:reportId",
    pathParams: {
      reportId: "uuid 报表ID",
    },
    response: {
      code: 204,
    },
  },

  /**
   * 导出合并报表
   * GET /api/v1/consolidation/reports/:reportId/export
   */
  export: {
    method: "GET",
    path: "/api/v1/consolidation/reports/:reportId/export",
    pathParams: {
      reportId: "uuid 报表ID",
    },
    queryParams: {
      format: "excel | pdf (默认excel)",
    },
    response: {
      code: 200,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  },
};

// ============================================
// 六、公司架构 API
// ============================================

export const companyRelationApiContract = {
  /**
   * 获取公司关系列表
   * GET /api/v1/consolidation/company-relations
   */
  list: {
    method: "GET",
    path: "/api/v1/consolidation/company-relations",
    queryParams: {
      company_id: "uuid? 公司ID(获取直接或间接关联的公司)",
      relation_type: "string? 关系类型",
    },
    response: {
      code: 200,
      data: [
        {
          id: "uuid",
          parent_company_id: "uuid",
          parent_company_name: "string",
          child_company_id: "uuid",
          child_company_name: "string",
          relation_type:
            "parent | subsidiary | associate | joint_venture | branch",
          ownership_percentage: "number",
          control_percentage: "number",
          effective_date: "date",
          expiry_date: "date?",
          status: "active | inactive",
        },
      ],
    },
  },

  /**
   * 获取公司架构树
   * GET /api/v1/consolidation/company-tree
   */
  getTree: {
    method: "GET",
    path: "/api/v1/consolidation/company-tree",
    response: {
      code: 200,
      data: {
        id: "uuid",
        name: "string",
        code: "string",
        level: "number 层级(0=根)",
        is_parent: "boolean",
        children: "递归结构",
      },
    },
  },

  /**
   * 创建公司关系
   * POST /api/v1/consolidation/company-relations
   */
  create: {
    method: "POST",
    path: "/api/v1/consolidation/company-relations",
    body: {
      parent_company_id: "uuid 母公司ID(必填)",
      child_company_id: "uuid 子公司ID(必填)",
      relation_type: "string 关系类型(必填)",
      ownership_percentage: "number 持股比例(必填)",
      control_percentage: "number? 控制比例",
      effective_date: "date 生效日期(必填)",
      expiry_date: "date? 失效日期",
    },
    response: {
      code: 201,
      data: {
        id: "uuid",
        parent_company_id: "uuid",
        child_company_id: "uuid",
        relation_type: "string",
        ownership_percentage: "number",
        created_at: "ISO8601",
      },
    },
  },

  /**
   * 更新公司关系
   * PUT /api/v1/consolidation/company-relations/:relationId
   */
  update: {
    method: "PUT",
    path: "/api/v1/consolidation/company-relations/:relationId",
    pathParams: {
      relationId: "uuid 公司关系ID",
    },
    body: {
      ownership_percentage: "number? 持股比例",
      control_percentage: "number? 控制比例",
      expiry_date: "date? 失效日期",
      status: "string? 状态",
    },
    response: {
      code: 200,
      data: {
        id: "uuid",
        updated_at: "ISO8601",
      },
    },
  },

  /**
   * 删除公司关系
   * DELETE /api/v1/consolidation/company-relations/:relationId
   */
  delete: {
    method: "DELETE",
    path: "/api/v1/consolidation/company-relations/:relationId",
    pathParams: {
      relationId: "uuid 公司关系ID",
    },
    response: {
      code: 204,
    },
  },

  /**
   * 获取公司财务数据
   * GET /api/v1/consolidation/companies/:companyId/financial-data
   */
  getFinancialData: {
    method: "GET",
    path: "/api/v1/consolidation/companies/:companyId/financial-data",
    pathParams: {
      companyId: "uuid 公司ID",
    },
    queryParams: {
      period: "string 会计期间(必填,YYYY-MM)",
    },
    response: {
      code: 200,
      data: {
        company_id: "uuid",
        company_name: "string",
        period: "string",
        // 资产负债表
        current_assets: "number",
        non_current_assets: "number",
        total_assets: "number",
        current_liabilities: "number",
        non_current_liabilities: "number",
        total_liabilities: "number",
        paid_in_capital: "number",
        capital_reserve: "number",
        surplus_reserve: "number",
        undistributed_profit: "number",
        total_equity: "number",
        // 利润表
        revenue: "number",
        cost_of_goods_sold: "number",
        gross_profit: "number",
        operating_profit: "number",
        profit_before_tax: "number",
        net_profit: "number",
        // 现金流量表
        operating_cash_flow: "number",
        investing_cash_flow: "number",
        financing_cash_flow: "number",
        net_cash_flow: "number",
      },
    },
  },
};
