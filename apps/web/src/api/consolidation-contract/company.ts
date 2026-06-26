/**
 * 公司架构 API 契约
 */

export const companyRelationApiContract = {
  /**
   * 获取公司关系列表
   * GET /api/consolidation/company-relations
   */
  list: {
    method: 'GET',
    path: '/api/consolidation/company-relations',
    queryParams: {
      company_id: 'uuid? 公司ID(获取直接或间接关联的公司)',
      relation_type: 'string? 关系类型',
    },
    response: {
      code: 200,
      data: [
        {
          id: 'uuid',
          parent_company_id: 'uuid',
          parent_company_name: 'string',
          child_company_id: 'uuid',
          child_company_name: 'string',
          relation_type: 'parent | subsidiary | associate | joint_venture | branch',
          ownership_percentage: 'number',
          control_percentage: 'number',
          effective_date: 'date',
          expiry_date: 'date?',
          status: 'active | inactive',
        },
      ],
    },
  },

  /**
   * 获取公司架构树
   * GET /api/consolidation/company-tree
   */
  getTree: {
    method: 'GET',
    path: '/api/consolidation/company-tree',
    response: {
      code: 200,
      data: {
        id: 'uuid',
        name: 'string',
        code: 'string',
        level: 'number 层级(0=根)',
        is_parent: 'boolean',
        children: '递归结构',
      },
    },
  },

  /**
   * 创建公司关系
   * POST /api/consolidation/company-relations
   */
  create: {
    method: 'POST',
    path: '/api/consolidation/company-relations',
    body: {
      parent_company_id: 'uuid 母公司ID(必填)',
      child_company_id: 'uuid 子公司ID(必填)',
      relation_type: 'string 关系类型(必填)',
      ownership_percentage: 'number 持股比例(必填)',
      control_percentage: 'number? 控制比例',
      effective_date: 'date 生效日期(必填)',
      expiry_date: 'date? 失效日期',
    },
    response: {
      code: 201,
      data: {
        id: 'uuid',
        parent_company_id: 'uuid',
        child_company_id: 'uuid',
        relation_type: 'string',
        ownership_percentage: 'number',
        created_at: 'ISO8601',
      },
    },
  },

  /**
   * 更新公司关系
   * PUT /api/consolidation/company-relations/:relationId
   */
  update: {
    method: 'PUT',
    path: '/api/consolidation/company-relations/:relationId',
    pathParams: {
      relationId: 'uuid 公司关系ID',
    },
    body: {
      ownership_percentage: 'number? 持股比例',
      control_percentage: 'number? 控制比例',
      expiry_date: 'date? 失效日期',
      status: 'string? 状态',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        updated_at: 'ISO8601',
      },
    },
  },

  /**
   * 删除公司关系
   * DELETE /api/consolidation/company-relations/:relationId
   */
  delete: {
    method: 'DELETE',
    path: '/api/consolidation/company-relations/:relationId',
    pathParams: {
      relationId: 'uuid 公司关系ID',
    },
    response: {
      code: 204,
    },
  },

  /**
   * 获取公司财务数据
   * GET /api/consolidation/companies/:companyId/financial-data
   */
  getFinancialData: {
    method: 'GET',
    path: '/api/consolidation/companies/:companyId/financial-data',
    pathParams: {
      companyId: 'uuid 公司ID',
    },
    queryParams: {
      period: 'string 会计期间(必填,YYYY-MM)',
    },
    response: {
      code: 200,
      data: {
        company_id: 'uuid',
        company_name: 'string',
        period: 'string',
        // 资产负债表
        current_assets: 'number',
        non_current_assets: 'number',
        total_assets: 'number',
        current_liabilities: 'number',
        non_current_liabilities: 'number',
        total_liabilities: 'number',
        paid_in_capital: 'number',
        capital_reserve: 'number',
        surplus_reserve: 'number',
        undistributed_profit: 'number',
        total_equity: 'number',
        // 利润表
        revenue: 'number',
        cost_of_goods_sold: 'number',
        gross_profit: 'number',
        operating_profit: 'number',
        profit_before_tax: 'number',
        net_profit: 'number',
        // 现金流量表
        operating_cash_flow: 'number',
        investing_cash_flow: 'number',
        financing_cash_flow: 'number',
        net_cash_flow: 'number',
      },
    },
  },
};
