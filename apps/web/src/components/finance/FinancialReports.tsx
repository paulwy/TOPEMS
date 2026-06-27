/**
 * 财务报表组件
 * 包含资产负债表、利润表、现金流量表的展示组件
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/api/finance';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Box,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { Download, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '@/types/finance';
import { logger } from '@/utils/logger';

// ============================================
// 一、通用组件
// ============================================

interface ReportTableProps {
  items: {
    label: string;
    amount: number;
    isTotal?: boolean;
    isBold?: boolean;
    indent?: number;
  }[];
  totalLabel?: string;
  totalAmount?: number;
}

function ReportTable({ items, totalLabel, totalAmount }: ReportTableProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {items.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.5,
            pl: `${(item.indent || 0) * 16}px`,
            ...(item.isTotal && {
              borderTop: 1,
              borderColor: 'divider',
              pt: 1,
              mt: 1,
            }),
          }}
        >
          <Typography
            sx={{
              fontWeight: item.isBold || item.isTotal ? 600 : 400,
            }}
          >
            {item.label}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontWeight: item.isTotal ? 600 : 400,
            }}
          >
            {item.amount.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
      ))}
      {totalLabel && totalAmount !== undefined && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 2,
            borderTop: 2,
            borderColor: 'black',
            fontWeight: 600,
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>{totalLabel}</Typography>
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {totalAmount.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ============================================
// 二、资产负债表
// ============================================

interface BalanceSheetViewerProps {
  data?: BalanceSheet;
  loading?: boolean;
}

export function BalanceSheetViewer({ data, loading }: BalanceSheetViewerProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid grey.200',
            borderTopColor: 'primary.dark',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          color: 'text.secondary',
        }}
      >
        <AlertCircle style={{ width: 48, height: 48, marginBottom: 16 }} />
        <Typography>暂无资产负债表数据</Typography>
      </Box>
    );
  }

  // 转换为图表数据
  const chartData = [
    { name: '流动资产', value: data.assets.current.total },
    { name: '非流动资产', value: data.assets.non_current.total },
    { name: '流动负债', value: data.liabilities.current.total },
    { name: '非流动负债', value: data.liabilities.non_current.total },
    { name: '实收资本', value: data.equity.paid_in.total },
    { name: '储备', value: data.equity.reserves.total },
    { name: '未分配利润', value: data.equity.retained_earnings.total },
  ];

  const COLORS = [
    'success.main',
    'success.dark',
    'warning.main',
    'warning.dark',
    'primary.main',
    'primary.dark',
    'primary.light',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 概览卡片 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              ¥{data.assets.total.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              资产总计
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              ¥{data.liabilities.total.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              负债合计
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              ¥{data.equity.total.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              所有者权益合计
            </Typography>
            <Chip
              label={data.balance_check ? '平衡' : '不平衡'}
              color={data.balance_check ? 'success' : 'error'}
              size='small'
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* 图表 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>资产构成</Typography>} />
          <CardContent>
            <ResponsiveContainer
              width='100%'
              height={250}
            >
              <PieChart>
                <Pie
                  data={chartData.slice(0, 2)}
                  dataKey='value'
                  nameKey='name'
                  cx='50%'
                  cy='50%'
                  outerRadius={80}
                  label
                >
                  {chartData.slice(0, 2).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => String((value as number).toLocaleString())} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={<Typography variant='subtitle1'>负债与权益构成</Typography>} />
          <CardContent>
            <ResponsiveContainer
              width='100%'
              height={250}
            >
              <BarChart
                data={[
                  { name: '流动负债', value: data.liabilities.current.total },
                  {
                    name: '非流动负债',
                    value: data.liabilities.non_current.total,
                  },
                  { name: '所有者权益', value: data.equity.total },
                ]}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip formatter={(value) => String((value as number).toLocaleString())} />
                <Bar
                  dataKey='value'
                  fill='primary.main'
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      {/* 详细表格 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
        {/* 资产 */}
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>资产</Typography>} />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography sx={{ fontWeight: 500, mb: 1 }}>流动资产</Typography>
                <ReportTable
                  items={data.assets.current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel='流动资产合计'
                  totalAmount={data.assets.current.total}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 500, mb: 1 }}>非流动资产</Typography>
                <ReportTable
                  items={data.assets.non_current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel='非流动资产合计'
                  totalAmount={data.assets.non_current.total}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 负债和所有者权益 */}
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>负债及所有者权益</Typography>} />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography sx={{ fontWeight: 500, mb: 1 }}>流动负债</Typography>
                <ReportTable
                  items={data.liabilities.current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel='流动负债合计'
                  totalAmount={data.liabilities.current.total}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 500, mb: 1 }}>非流动负债</Typography>
                <ReportTable
                  items={data.liabilities.non_current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel='非流动负债合计'
                  totalAmount={data.liabilities.non_current.total}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 500, mb: 1 }}>所有者权益</Typography>
                <ReportTable
                  items={[
                    ...data.equity.paid_in.items.map((item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    })),
                    ...data.equity.reserves.items.map((item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    })),
                    ...data.equity.retained_earnings.items.map((item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    })),
                  ]}
                  totalLabel='所有者权益合计'
                  totalAmount={data.equity.total}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

// ============================================
// 三、利润表
// ============================================

interface IncomeStatementViewerProps {
  data?: IncomeStatement;
  loading?: boolean;
  onExport?: () => void;
}

export function IncomeStatementViewer({ data, loading }: IncomeStatementViewerProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid grey.200',
            borderTopColor: 'primary.dark',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          color: 'text.secondary',
        }}
      >
        <AlertCircle style={{ width: 48, height: 48, marginBottom: 16 }} />
        <Typography>暂无利润表数据</Typography>
      </Box>
    );
  }

  // 图表数据
  const trendData = [
    { name: '营业收入', value: data.revenue.total },
    { name: '营业成本', value: data.cost_of_sales.total },
    { name: '毛利润', value: data.gross_profit },
    { name: '营业利润', value: data.operating_profit },
    { name: '净利润', value: data.net_profit },
  ];

  const costBreakdown = [
    { name: '销售费用', value: data.operating_expenses.selling_expense.total },
    {
      name: '管理费用',
      value: data.operating_expenses.administrative_expense.total,
    },
    { name: '研发费用', value: data.operating_expenses.rd_expense.total },
    {
      name: '财务费用',
      value: data.operating_expenses.financial_expense.total,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 关键指标 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              ¥{data.revenue.total.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              营业收入
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'success.main' }}
              >
                毛利率 {(data.gross_margin * 100).toFixed(2)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'warning.main' }}
            >
              ¥{data.operating_profit.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              营业利润
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'success.main' }}
              >
                利润率 {(data.operating_margin * 100).toFixed(2)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'secondary.main' }}
            >
              ¥{data.total_profit.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              利润总额
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'success.main' }}
            >
              ¥{data.net_profit.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              净利润
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'success.main' }}
              >
                净利率 {(data.net_margin * 100).toFixed(2)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 图表 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>利润构成</Typography>} />
          <CardContent>
            <ResponsiveContainer
              width='100%'
              height={250}
            >
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip formatter={(value) => String((value as number).toLocaleString())} />
                <Bar
                  dataKey='value'
                  fill='primary.main'
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={<Typography variant='subtitle1'>费用构成</Typography>} />
          <CardContent>
            <ResponsiveContainer
              width='100%'
              height={250}
            >
              <PieChart>
                <Pie
                  data={costBreakdown}
                  dataKey='value'
                  nameKey='name'
                  cx='50%'
                  cy='50%'
                  outerRadius={80}
                  label
                >
                  {costBreakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ['warning.main', 'warning.dark', 'primary.main', 'primary.light'][index]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => String((value as number).toLocaleString())} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      {/* 详细表格 */}
      <Card>
        <CardHeader title={<Typography variant='subtitle1'>利润明细</Typography>} />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography sx={{ fontWeight: 500, mb: 1 }}>一、营业收入</Typography>
              <ReportTable
                items={[
                  ...data.revenue.main_revenue.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                  ...data.revenue.other_revenue.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                ]}
                totalLabel='营业收入合计'
                totalAmount={data.revenue.total}
              />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 500, mb: 1 }}>二、营业成本</Typography>
              <ReportTable
                items={[
                  ...data.cost_of_sales.main_cost.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                ]}
                totalLabel='营业成本合计'
                totalAmount={data.cost_of_sales.total}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 2,
                borderTop: 2,
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>三、毛利润</Typography>
              <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {data.gross_profit.toLocaleString()} ({(data.gross_margin * 100).toFixed(2)}%)
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 500, mb: 1 }}>四、期间费用</Typography>
              <ReportTable
                items={[
                  ...data.operating_expenses.selling_expense.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                  ...data.operating_expenses.administrative_expense.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                  ...data.operating_expenses.rd_expense.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                  ...data.operating_expenses.financial_expense.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                ]}
                totalLabel='期间费用合计'
                totalAmount={data.operating_expenses.total}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 2,
                borderTop: 1,
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>五、营业利润</Typography>
              <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {data.operating_profit.toLocaleString()} ({(data.operating_margin * 100).toFixed(2)}
                %)
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 2,
                borderTop: 1,
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>六、净利润</Typography>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  color: 'success.main',
                }}
              >
                {data.net_profit.toLocaleString()} ({(data.net_margin * 100).toFixed(2)}%)
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

// ============================================
// 四、现金流量表
// ============================================

interface CashFlowStatementViewerProps {
  data?: CashFlowStatement;
  loading?: boolean;
  onExport?: () => void;
}

export function CashFlowStatementViewer({ data, loading }: CashFlowStatementViewerProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid grey.200',
            borderTopColor: 'primary.dark',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          color: 'text.secondary',
        }}
      >
        <AlertCircle style={{ width: 48, height: 48, marginBottom: 16 }} />
        <Typography>暂无现金流量表数据</Typography>
      </Box>
    );
  }

  // 图表数据
  const flowData = [
    { name: '经营活动', value: data.operating.net_flow },
    { name: '投资活动', value: data.investing.net_flow },
    { name: '筹资活动', value: data.financing.net_flow },
    { name: '净现金流', value: data.net_cash_flow },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 关键指标 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              ¥{data.operating.net_flow.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              经营活动现金流
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'warning.main' }}
            >
              ¥{data.investing.net_flow.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              投资活动现金流
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', color: 'secondary.main' }}
            >
              ¥{data.financing.net_flow.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              筹资活动现金流
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ pt: 3 }}>
            <Typography
              variant='h5'
              sx={{
                fontWeight: 'bold',
                color: data.net_cash_flow >= 0 ? 'success.main' : 'error.main',
              }}
            >
              ¥{data.net_cash_flow.toLocaleString()}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              净现金流
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 图表 */}
      <Card>
        <CardHeader title={<Typography variant='subtitle1'>现金流量构成</Typography>} />
        <CardContent>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart data={flowData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis />
              <Tooltip formatter={(value) => String((value as number).toLocaleString())} />
              <Bar dataKey='value'>
                {flowData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value >= 0 ? 'success.main' : 'error.main'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 详细表格 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
        {/* 经营活动 */}
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>经营活动</Typography>} />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  现金流入
                </Typography>
                {data.operating.inflows.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant='body2'>{item.description}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', color: 'success.main' }}
                    >
                      +{item.amount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  现金流出
                </Typography>
                {data.operating.outflows.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant='body2'>{item.description}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', color: 'error.main' }}
                    >
                      -{item.amount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1,
                  borderTop: 1,
                  fontWeight: 600,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>净额</Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: data.operating.net_flow >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {data.operating.net_flow.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 投资活动 */}
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>投资活动</Typography>} />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  现金流入
                </Typography>
                {data.investing.inflows.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant='body2'>{item.description}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', color: 'success.main' }}
                    >
                      +{item.amount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  现金流出
                </Typography>
                {data.investing.outflows.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant='body2'>{item.description}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', color: 'error.main' }}
                    >
                      -{item.amount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1,
                  borderTop: 1,
                  fontWeight: 600,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>净额</Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: data.investing.net_flow >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {data.investing.net_flow.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 筹资活动 */}
        <Card>
          <CardHeader title={<Typography variant='subtitle1'>筹资活动</Typography>} />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  现金流入
                </Typography>
                {data.financing.inflows.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant='body2'>{item.description}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', color: 'success.main' }}
                    >
                      +{item.amount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  现金流出
                </Typography>
                {data.financing.outflows.items.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant='body2'>{item.description}</Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', color: 'error.main' }}
                    >
                      -{item.amount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1,
                  borderTop: 1,
                  fontWeight: 600,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>净额</Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: data.financing.net_flow >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {data.financing.net_flow.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 现金变动汇总 */}
      <Card>
        <CardHeader title={<Typography variant='subtitle1'>现金变动汇总</Typography>} />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {data.beginning_cash.toLocaleString()}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                期初现金
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {data.net_cash_flow.toLocaleString()}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                净现金流
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {data.ending_cash.toLocaleString()}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                期末现金
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 'bold',
                  color: data.cash_equivalent_change >= 0 ? 'success.main' : 'error.main',
                }}
              >
                {data.cash_equivalent_change >= 0 ? '+' : ''}
                {data.cash_equivalent_change.toLocaleString()}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                现金净增加额
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

// ============================================
// 五、综合财务报表查看器
// ============================================

interface FinancialReportsViewerProps {
  companyId: string;
  period: string;
}

export function FinancialReportsViewer({ companyId, period }: FinancialReportsViewerProps) {
  const [activeReport, setActiveReport] = useState<'balance' | 'income' | 'cash'>('balance');

  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance-sheet', companyId, period],
    queryFn: () => reportApi.getBalanceSheet({ company_id: companyId, period }),
    enabled: activeReport === 'balance',
  });

  const { data: incomeStatement, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-statement', companyId, period],
    queryFn: () => reportApi.getIncomeStatement({ company_id: companyId, period }),
    enabled: activeReport === 'income',
  });

  const { data: cashFlow, isLoading: cashLoading } = useQuery({
    queryKey: ['cash-flow', companyId, period],
    queryFn: () => reportApi.getCashFlowStatement({ company_id: companyId, period }),
    enabled: activeReport === 'cash',
  });

  const handleExport = async () => {
    logger.info('Export report:', activeReport);
    try {
      const params = { company_id: companyId, period };
      let blob: Blob;
      let filename: string;

      switch (activeReport) {
        case 'balance':
          blob = await reportApi.exportBalanceSheet(params);
          filename = `资产负债表_${period}.xlsx`;
          break;
        case 'income':
          blob = await reportApi.exportIncomeStatement(params);
          filename = `利润表_${period}.xlsx`;
          break;
        case 'cash':
          blob = await reportApi.exportCashFlowStatement(params);
          filename = `现金流量表_${period}.xlsx`;
          break;
        default:
          return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Export failed:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Tabs
          value={activeReport}
          onChange={(_, newValue) => setActiveReport(newValue)}
        >
          <Tab
            label='资产负债表'
            value='balance'
          />
          <Tab
            label='利润表'
            value='income'
          />
          <Tab
            label='现金流量表'
            value='cash'
          />
        </Tabs>

        <Button
          variant='outlined'
          size='small'
          onClick={handleExport}
        >
          <Download style={{ width: 16, height: 16, marginRight: 4 }} />
          导出
        </Button>
      </Box>

      {activeReport === 'balance' && (
        <BalanceSheetViewer
          data={balanceSheet?.data}
          loading={balanceLoading}
        />
      )}

      {activeReport === 'income' && (
        <IncomeStatementViewer
          data={incomeStatement?.data}
          loading={incomeLoading}
          onExport={handleExport}
        />
      )}

      {activeReport === 'cash' && (
        <CashFlowStatementViewer
          data={cashFlow?.data}
          loading={cashLoading}
        />
      )}
    </Box>
  );
}
