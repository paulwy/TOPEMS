import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Icon,
  Box,
  Chip,
} from '@mui/material';

import type { Report, ReportCategory } from '../api/report';
import { DollarSign, FileText, Package, ShoppingCart, Users } from 'lucide-react';
const AttachMoney = DollarSign;
const Inventory = Package;
const People = Users;
const PictureAsPdf = FileText;

interface ReportCardProps {
  report: Report;
  onGenerate: (report: Report) => void;
  onView: (report: Report) => void;
}

const getCategoryIcon = (category: ReportCategory) => {
  switch (category) {
    case 'finance':
      return <AttachMoney />;
    case 'hr':
      return <People />;
    case 'sales':
      return <ShoppingCart />;
    case 'inventory':
      return <Inventory />;
    default:
      return <PictureAsPdf />;
  }
};

const getCategoryLabel = (category: ReportCategory) => {
  switch (category) {
    case 'finance':
      return '财务';
    case 'hr':
      return '人事';
    case 'sales':
      return '销售';
    case 'inventory':
      return '库存';
    default:
      return category;
  }
};

const getCategoryColor = (category: ReportCategory) => {
  switch (category) {
    case 'finance':
      return 'success';
    case 'hr':
      return 'primary';
    case 'sales':
      return 'warning';
    case 'inventory':
      return 'info';
    default:
      return 'default';
  }
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onGenerate, onView }) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.3s ease-in-out',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Icon
            sx={{
              fontSize: 40,
              mr: 2,
              color: `${getCategoryColor(report.category)}.main`,
            }}
          >
            {getCategoryIcon(report.category)}
          </Icon>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" gutterBottom>
              {report.name}
            </Typography>
            <Chip
              label={getCategoryLabel(report.category)}
              size="small"
              color={getCategoryColor(report.category) as any}
              variant="outlined"
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {report.description}
        </Typography>
        {report.lastGeneratedAt && (
          <Typography variant="caption" color="text.secondary">
            最近生成: {new Date(report.lastGeneratedAt).toLocaleString('zh-CN')}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onView(report)}>
          查看
        </Button>
        <Button size="small" variant="contained" onClick={() => onGenerate(report)}>
          生成报表
        </Button>
      </CardActions>
    </Card>
  );
};
