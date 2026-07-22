# V15.1 财务双轨一致性验证

## 背景

V15 Phase 3 将 ERP 财务底座迁出到独立 Finance 服务，ERP 通过代理层 (`/api/erp/finance/*`) 透传请求到 Finance 服务 (`/api/finance/*`)。

在双轨并行期间，需要确保代理层不会引入数据失真、字段丢失或行为差异。

## 脚本说明

### `consistency-check.sh`

对同一资源分别调用 ERP 代理端和 Finance 直服端，对比响应体的一致性。

#### 验证的接口

| 接口 | ERP 代理路径 | Finance 直服路径 |
|------|-------------|-----------------|
| 仪表盘 | `/api/erp/finance/dashboard` | `/api/finance/dashboard` |
| 科目列表 | `/api/erp/finance/accounts` | `/api/finance/accounts` |
| 凭证列表 | `/api/erp/finance/vouchers` | `/api/finance/vouchers` |
| 试算平衡表 | `/api/erp/finance/trial-balance/current` | `/api/finance/trial-balance/current` |
| 资产负债表 | `/api/erp/finance/balance-sheet/current` | `/api/finance/balance-sheet/current` |
| 利润表 | `/api/erp/finance/income-statement/current` | `/api/finance/income-statement/current` |
| 现金流量表 | `/api/erp/finance/cash-flow/current` | `/api/finance/cash-flow/current` |

#### 用法

```bash
# 基本用法
./consistency-check.sh --token <JWT_TOKEN>

# 指定服务端点
./consistency-check.sh --token $TOKEN \
  --erp-url http://localhost:8010 \
  --finance-url http://localhost:8011

# 启用详细输出（ mismatch 时打印响应体）
./consistency-check.sh --token $TOKEN --verbose

# 通过环境变量
export TOKEN="your-jwt-token"
export ERP_BASE_URL="http://erp.local"
export FINANCE_BASE_URL="http://finance.local"
./consistency-check.sh
```

#### 报告输出

每次运行会在 `reports/` 目录生成 JSON 格式报告：

```json
{
  "report_type": "finance_dual_track_consistency",
  "version": "v15.1",
  "timestamp": "2026-07-22T14:30:00+08:00",
  "overall_result": "PASS",
  "summary": { "total": 7, "passed": 7, "failed": 0, "skipped": 0 },
  "endpoints": { "erp_base": "...", "finance_base": "..." },
  "details": [...]
}
```

#### 退出码

| 码 | 含义 |
|----|------|
| 0 | 全部一致 |
| 1 | 发现不一致或调用失败 |
| 2 | 参数缺失或依赖未安装 |

#### 集成建议

- **CI 流水线**：在部署 Finance/ERP 服务后自动运行
- **定时任务**：每日凌晨运行，差异告警到 Prometheus Alertmanager 或企业微信
- **发布门禁**：代理层代码变更后必须本脚本通过才能合并
