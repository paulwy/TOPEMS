/**
 * 抵消规则管理 API 契约
 */

export const eliminationRuleApiContract = {
  /**
   * 获取抵消规则列表
   * GET /api/consolidation/elimination-rules
   */
  list: {
    method: 'GET',
    path: '/api/consolidation/elimination-rules',
    queryParams: {
      scope_id: 'uuid 合并范围ID(必填)',
      type: 'string? 规则类型',
      status: 'string? 状态',
      keyword: 'string? 关键字搜索',
      page: 'number? 页码',
      page_size: 'number? 每页条数',
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: 'uuid',
            scope_id: 'uuid',
            code: 'string',
            name: 'string',
            type: 'EliminationRuleType',
            description: 'string?',
            status: 'active | inactive | draft',
            direction: 'debit | credit | both',
            auto_elimination: 'boolean',
            priority: 'number',
            created_at: 'ISO8601',
            updated_at: 'ISO8601',
          },
        ],
        total: 'number',
        page: 'number',
        page_size: 'number',
      },
    },
  },

  /**
   * 获取抵消规则详情
   * GET /api/consolidation/elimination-rules/:ruleId
   */
  get: {
    method: 'GET',
    path: '/api/consolidation/elimination-rules/:ruleId',
    pathParams: {
      ruleId: 'uuid 抵消规则ID',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        scope_id: 'uuid',
        code: 'string',
        name: 'string',
        type: 'EliminationRuleType',
        description: 'string?',
        status: 'string',
        direction: 'string',
        debit_account_codes: 'string[]?',
        credit_account_codes: 'string[]?',
        company_pairs: 'Array?',
        auto_elimination: 'boolean',
        priority: 'number',
        created_at: 'ISO8601',
        updated_at: 'ISO8601',
      },
    },
  },

  /**
   * 创建抵消规则
   * POST /api/consolidation/elimination-rules
   */
  create: {
    method: 'POST',
    path: '/api/consolidation/elimination-rules',
    body: {
      scope_id: 'uuid 合并范围ID(必填)',
      code: 'string 规则编码(必填,唯一)',
      name: 'string 规则名称(必填)',
      type: 'string 规则类型(必填)',
      description: 'string? 说明',
      status: 'string? 状态(默认active)',
      direction: 'string? 抵消方向(默认both)',
      debit_account_codes: 'string[]? 借方科目',
      credit_account_codes: 'string[]? 贷方科目',
      company_pairs: 'Array? 关联公司组',
      auto_elimination: 'boolean? 自动抵消(默认true)',
      priority: 'number? 优先级(默认100)',
    },
    response: {
      code: 201,
      data: {
        id: 'uuid',
        scope_id: 'uuid',
        code: 'string',
        name: 'string',
        type: 'string',
        created_at: 'ISO8601',
      },
    },
  },

  /**
   * 更新抵消规则
   * PUT /api/consolidation/elimination-rules/:ruleId
   */
  update: {
    method: 'PUT',
    path: '/api/consolidation/elimination-rules/:ruleId',
    pathParams: {
      ruleId: 'uuid 抵消规则ID',
    },
    body: {
      name: 'string? 规则名称',
      description: 'string? 说明',
      status: 'string? 状态',
      direction: 'string? 抵消方向',
      debit_account_codes: 'string[]? 借方科目',
      credit_account_codes: 'string[]? 贷方科目',
      company_pairs: 'Array? 关联公司组',
      auto_elimination: 'boolean? 自动抵消',
      priority: 'number? 优先级',
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
   * 删除抵消规则
   * DELETE /api/consolidation/elimination-rules/:ruleId
   */
  delete: {
    method: 'DELETE',
    path: '/api/consolidation/elimination-rules/:ruleId',
    pathParams: {
      ruleId: 'uuid 抵消规则ID',
    },
    response: {
      code: 204,
    },
  },
};
