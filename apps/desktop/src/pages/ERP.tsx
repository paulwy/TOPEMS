import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { Plus, Edit, Delete, Eye, ShoppingCart, Package } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  supplier: string;
  items: string;
  amount: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  createDate: string;
  deliveryDate: string;
}

interface SalesOrder {
  id: string;
  customer: string;
  items: string;
  amount: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  createDate: string;
  deliveryDate: string;
}

const mockPurchaseOrders: PurchaseOrder[] = [
  { id: 'PO-001', supplier: '华为技术', items: '服务器 x 10', amount: '¥500,000', status: 'approved', createDate: '2024-01-15', deliveryDate: '2024-01-25' },
  { id: 'PO-002', supplier: '京东云', items: '云服务订阅', amount: '¥120,000', status: 'pending', createDate: '2024-01-14', deliveryDate: '2024-01-20' },
  { id: 'PO-003', supplier: '联想集团', items: '办公电脑 x 50', amount: '¥250,000', status: 'completed', createDate: '2024-01-10', deliveryDate: '2024-01-18' },
  { id: 'PO-004', supplier: '戴尔科技', items: '显示器 x 30', amount: '¥60,000', status: 'approved', createDate: '2024-01-12', deliveryDate: '2024-01-22' },
];

const mockSalesOrders: SalesOrder[] = [
  { id: 'SO-001', customer: '比亚迪', items: 'ERP许可证 x 100', amount: '¥800,000', status: 'completed', createDate: '2024-01-10', deliveryDate: '2024-01-15' },
  { id: 'SO-002', customer: '小米科技', items: 'CRM许可证 x 50', amount: '¥350,000', status: 'approved', createDate: '2024-01-13', deliveryDate: '2024-01-20' },
  { id: 'SO-003', customer: '腾讯控股', items: 'BI分析服务', amount: '¥500,000', status: 'pending', createDate: '2024-01-15', deliveryDate: '2024-01-25' },
  { id: 'SO-004', customer: '阿里巴巴', items: '定制开发服务', amount: '¥2,000,000', status: 'pending', createDate: '2024-01-14', deliveryDate: '2024-02-15' },
];

const ERP = () => {
  const [tab, setTab] = useState(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'completed': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return '已审批';
      case 'completed': return '已完成';
      case 'pending': return '待审批';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          企业资源计划
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />}>
          {tab === 0 ? '新建采购订单' : '新建销售订单'}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 4 }}>
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShoppingCart size={18} />采购订单</Box>} />
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Package size={18} />销售订单</Box>} />
      </Tabs>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">订单总数</Typography>
            <Typography variant="h4">{tab === 0 ? mockPurchaseOrders.length : mockSalesOrders.length}</Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">待审批</Typography>
            <Typography variant="h4">
              {tab === 0 
                ? mockPurchaseOrders.filter(o => o.status === 'pending').length 
                : mockSalesOrders.filter(o => o.status === 'pending').length
              }
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">已审批</Typography>
            <Typography variant="h4">
              {tab === 0 
                ? mockPurchaseOrders.filter(o => o.status === 'approved').length 
                : mockSalesOrders.filter(o => o.status === 'approved').length
              }
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">总金额</Typography>
            <Typography variant="h4">¥{tab === 0 ? '930K' : '3.65M'}</Typography>
          </Paper>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单编号</TableCell>
                <TableCell>{tab === 0 ? '供应商' : '客户'}</TableCell>
                <TableCell>商品</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建日期</TableCell>
                <TableCell>交付日期</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tab === 0 ? (
                mockPurchaseOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.supplier}</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell>{order.amount}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(order.status)} color={getStatusColor(order.status)} size="small" />
                    </TableCell>
                    <TableCell>{order.createDate}</TableCell>
                    <TableCell>{order.deliveryDate}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small"><Eye size={16} /></Button>
                        <Button size="small"><Edit size={16} /></Button>
                        <Button size="small"><Delete size={16} /></Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                mockSalesOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell>{order.amount}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(order.status)} color={getStatusColor(order.status)} size="small" />
                    </TableCell>
                    <TableCell>{order.createDate}</TableCell>
                    <TableCell>{order.deliveryDate}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small"><Eye size={16} /></Button>
                        <Button size="small"><Edit size={16} /></Button>
                        <Button size="small"><Delete size={16} /></Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ERP;