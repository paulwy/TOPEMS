# 分析/仪表盘页面 mock→真实 API 评估与实施计划

**评估日期**: 2026-09-11
**评估范围**: 所有使用 mock 数据的分析/仪表盘页面

## 一、现状盘点

### 1.1 Analytics 页面（30 个）

| 模块 | 页面数 | 页面清单 | 数据来源 |
|------|--------|----------|----------|
| wms | 6 | InventoryTurnover, OrderFulfillment, FlowTrend, AbcAnalysis, AgePareto, LocationUtilization | useWmsMock |
| tms | 6 | CarrierPerformance, DriverPerformance, FreightCost, RouteEfficiency, ShipmentTrend, VehicleUtilization | mock 数据 |
| aps | 6 | CapacityUtilization, ForecastAccuracy, MaterialShortage, OeeDashboard, PlanAdherence, ScheduleGantt | mock 数据 |
| qms | 6 | AuditCompliance, CostAnalysis, DefectPareto, FmeaRiskMatrix, QualityTrend, SpcControlChart | mock 数据 |
| mes | 6 | CapacityUtilization, DeliveryAnalytics, EnergyCost, EquipmentMtbf, OeeDashboard, QualityPareto | mock 数据 |

### 1.2 Dashboard 页面（20+ 个）

admin, ai, aps, asset, automation, bi, crm, doc, ehs, erp, finance, gis, hrm, im, integration, lims, mes, monitor, notification, plugin, pm, qms, tms, wms 等模块均有 Dashboard 页面，大部分使用 mock 数据。

### 1.3 后端现状

- **wms**: 无聚合查询 API（无 GROUP BY/aggregate/stats/summary/trend 路由）
- **tms/aps/qms/mes**: 同样无聚合查询 API
- **analytics 服务**: 仅 bi/report 兼容层，无业务模块聚合 API
- **结论**: 所有分析页面都需要后端新增聚合 API 支持

## 二、工作量评估

### 2.1 每个 Analytics 页面所需工作

1. **后端聚合 API 开发**: 1-3 个 SQL 聚合查询 + Rust 路由 + 测试
   - 简单页面（单指标趋势）: 约 4 小时
   - 复杂页面（多维度分析）: 约 8 小时
2. **前端 API 封装**: 约 1 小时
3. **前端页面改造**: 移除 mock，接入真实 API，处理加载/错误状态: 约 2 小时
4. **联调测试**: 约 1 小时

**单页面平均**: 约 8-12 小时

### 2.2 总工作量估算

- 30 个 Analytics 页面: 约 240-360 小时（30-45 人天）
- 20+ Dashboard 页面: 约 160-240 小时（20-30 人天）
- **总计**: 约 400-600 小时（50-75 人天）

## 三、分阶段实施计划

### 阶段一：基础框架（1 周）

1. 设计通用聚合 API 规范（请求参数、响应格式、分页、时间范围）
2. 在 wms 模块实现 1-2 个示例聚合 API（如库存周转率、订单履约率）
3. 前端实现通用的 analytics API 客户端和 hooks
4. 改造 1-2 个 wms analytics 页面作为试点

**目标**: 验证技术方案，建立可复用的模式

### 阶段二：wms 模块全覆盖（2 周）

1. 实现剩余 4-5 个 wms analytics 页面的后端聚合 API
2. 改造所有 wms analytics 页面
3. 改造 wms Dashboard 页面

**目标**: wms 模块分析功能全部真实化

### 阶段三：tms + qms 模块（3 周）

1. tms 模块 6 个 analytics 页面 + Dashboard
2. qms 模块 6 个 analytics 页面 + Dashboard

**目标**: 物流和质量模块分析功能真实化

### 阶段四：aps + mes 模块（3 周）

1. aps 模块 6 个 analytics 页面 + Dashboard
2. mes 模块 6 个 analytics 页面 + Dashboard

**目标**: 计划和制造模块分析功能真实化

### 阶段五：其他模块 Dashboard（2 周）

1. admin, crm, finance, hrm 等核心模块 Dashboard
2. ai, bi, automation 等支撑模块 Dashboard

**目标**: 全模块 Dashboard 真实化

## 四、优先级建议

### P0（立即启动）

1. 阶段一：基础框架 + wms 试点（验证技术方案）

### P1（阶段一完成后启动）

1. 阶段二：wms 模块全覆盖（wms 是核心模块，优先级最高）

### P2（按业务需求排序）

1. qms 模块（质量分析对业务决策重要）
2. tms 模块（物流成本分析）
3. mes 模块（生产效率分析）
4. aps 模块（计划准确性分析）

### P3（后续迭代）

1. 其他模块 Dashboard
2. 高级分析功能（预测、异常检测）

## 五、技术方案建议

### 5.1 后端聚合 API 设计

```
GET /api/wms/analytics/inventory-turnover
  ?start_date=2026-01-01
  &end_date=2026-09-01
  &group_by=month
  &warehouse_id=xxx

Response:
{
  "data": [
    { "period": "2026-01", "turnover_rate": 4.5, "avg_inventory": 1000, "cost_of_goods": 4500 },
    ...
  ],
  "summary": { "total_turnover": 36.2, "avg_turnover": 4.5 }
}
```

### 5.2 前端通用 hooks

```typescript
function useAnalyticsData<T>(endpoint: string, params: AnalyticsParams) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.get(endpoint, { params })
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint, JSON.stringify(params)]);

  return { data, loading, error };
}
```

### 5.3 数据库优化

- 为常用聚合查询字段创建索引（tenant_id, created_at, status, warehouse_id 等）
- 考虑使用物化视图预计算高频聚合数据
- 大表聚合查询使用分页或时间范围限制

## 六、风险与注意事项

1. **性能风险**: 大表聚合查询可能慢，需要索引优化和查询限流
2. **数据一致性**: 聚合数据可能与明细数据有时间差，需要明确数据刷新策略
3. **向后兼容**: 新 API 不应影响现有功能，建议使用独立的 /analytics 路由前缀
4. **测试覆盖**: 每个聚合 API 都需要单元测试和集成测试
5. **文档完善**: API 文档、数据字典、业务口径说明需要同步更新

## 七、结论

分析/仪表盘页面 mock→真实 API 是一个较大的工程（约 50-75 人天），建议分阶段实施。先从 wms 模块开始试点，验证技术方案后逐步推广到其他模块。

**当前状态**: 评估完成，待启动阶段一（基础框架 + wms 试点）。
