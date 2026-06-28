/**
 * 合并范围管理 API 契约
 */

export const consolidationScopeApiContract = {
  /**
   * 获取合并范围列表
   * GET /api/consolidation/scopes
   */
  list: {
    method: 'GET',
    path: '/api/consolidation/scopes',
    queryParams: {
      keyword: 'string? 关键字搜索(名称/编码)',
      status: 'string? 状态筛选',
      consolidation_method: 'string? 合并方法',
      page: 'number? 页码(默认1)',
      pagesize: 'number? 每页条数(默认20)',
    },
    response: {
      code: 200,
      data: {
        items: [
          {
            id: 'uuid',
            code: 'string',
            name: 'string',
            description: 'string?',
            consolidation_method: 'full | equity | proportional',
            status: 'active | inactive | draft',
            company_count: 'number',
            created_at: 'ISO8601',
            updated_at: 'ISO8601',
          },
        ],
        total: 'number',
        page: 'number',
        pagesize: 'number',
        total_pages: 'number',
      },
    },
  },

  /**
   * 获取合并范围详情
   * GET /api/consolidation/scopes/:scopeId
   */
  get: {
    method: 'GET',
    path: '/api/consolidation/scopes/:scopeId',
    pathParams: {
      scopeId: 'uuid 合并范围ID',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        code: 'string',
        name: 'string',
        description: 'string?',
        consolidation_method: 'full | equity | proportional',
        status: 'active | inactive | draft',
        created_at: 'ISO8601',
        updated_at: 'ISO8601',
        created_by: 'uuid?',
      },
    },
  },

  /**
   * 创建合并范围
   * POST /api/consolidation/scopes
   */
  create: {
    method: 'POST',
    path: '/api/consolidation/scopes',
    body: {
      code: 'string 合并范围编码(必填,唯一)',
      name: 'string 合并范围名称(必填)',
      description: 'string? 说明',
      consolidation_method: 'string 合并方法(默认full)',
      status: 'string? 状态(默认draft)',
    },
    response: {
      code: 201,
      data: {
        id: 'uuid',
        code: 'string',
        name: 'string',
        consolidation_method: 'string',
        status: 'string',
        created_at: 'ISO8601',
      },
    },
  },

  /**
   * 更新合并范围
   * PUT /api/consolidation/scopes/:scopeId
   */
  update: {
    method: 'PUT',
    path: '/api/consolidation/scopes/:scopeId',
    pathParams: {
      scopeId: 'uuid 合并范围ID',
    },
    body: {
      name: 'string? 合并范围名称',
      description: 'string? 说明',
      consolidation_method: 'string? 合并方法',
      status: 'string? 状态',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        code: 'string',
        name: 'string',
        consolidation_method: 'string',
        status: 'string',
        updated_at: 'ISO8601',
      },
    },
  },

  /**
   * 删除合并范围
   * DELETE /api/consolidation/scopes/:scopeId
   */
  delete: {
    method: 'DELETE',
    path: '/api/consolidation/scopes/:scopeId',
    pathParams: {
      scopeId: 'uuid 合并范围ID',
    },
    response: {
      code: 204,
    },
  },
};

/**
 * 合并范围公司管理 API 契约
 */

export const consolidationScopeCompanyApiContract = {
  /**
   * 获取合并范围内的公司列表
   * GET /api/consolidation/scopes/:scopeId/companies
   */
  list: {
    method: 'GET',
    path: '/api/consolidation/scopes/:scopeId/companies',
    pathParams: {
      scopeId: 'uuid 合并范围ID',
    },
    response: {
      code: 200,
      data: [
        {
          id: 'uuid',
          scope_id: 'uuid',
          company_id: 'uuid',
          company_code: 'string',
          company_name: 'string',
          is_parent: 'boolean',
          control_type: 'full_control | joint_venture | associate',
          ownership_percentage: 'number',
          consolidation_percentage: 'number',
          minority_interest: 'number',
          effective_date: 'date?',
          created_at: 'ISO8601',
        },
      ],
    },
  },

  /**
   * 添加公司到合并范围
   * POST /api/consolidation/scopes/companies
   */
  add: {
    method: 'POST',
    path: '/api/consolidation/scopes/companies',
    body: {
      scope_id: 'uuid 合并范围ID(必填)',
      company_id: 'uuid 公司ID(必填)',
      is_parent: 'boolean 是否为母公司(默认false)',
      control_type: 'string 控制类型(必填)',
      ownership_percentage: 'number 持股比例(必填,0-100)',
      consolidation_percentage: 'number 合并比例(必填,0-100)',
      minority_interest: 'number? 少数股东权益(默认0)',
      effective_date: 'date? 生效日期',
    },
    response: {
      code: 201,
      data: {
        id: 'uuid',
        scope_id: 'uuid',
        company_id: 'uuid',
        is_parent: 'boolean',
        control_type: 'string',
        ownership_percentage: 'number',
        consolidation_percentage: 'number',
        created_at: 'ISO8601',
      },
    },
  },

  /**
   * 更新合并范围公司
   * PUT /api/consolidation/scopes/companies/:companyId
   */
  update: {
    method: 'PUT',
    path: '/api/consolidation/scopes/companies/:companyId',
    pathParams: {
      companyId: 'uuid 合并范围公司ID',
    },
    body: {
      control_type: 'string? 控制类型',
      ownership_percentage: 'number? 持股比例',
      consolidation_percentage: 'number? 合并比例',
      minority_interest: 'number? 少数股东权益',
      expiry_date: 'date? 失效日期',
    },
    response: {
      code: 200,
      data: {
        id: 'uuid',
        control_type: 'string',
        ownership_percentage: 'number',
        consolidation_percentage: 'number',
        updated_at: 'ISO8601',
      },
    },
  },

  /**
   * 从合并范围移除公司
   * DELETE /api/consolidation/scopes/companies/:companyId
   */
  remove: {
    method: 'DELETE',
    path: '/api/consolidation/scopes/companies/:companyId',
    pathParams: {
      companyId: 'uuid 合并范围公司ID',
    },
    response: {
      code: 204,
    },
  },
};
