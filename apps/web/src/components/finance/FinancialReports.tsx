/**
 * 财务报表组件
 * 包含资产负债表、利润表、现金流量表的展示组件
 */

import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import i18n from '@/i18n';
import { AlertCircle } from 'lucide-react';
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
            borderColor: 'common.black',
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

