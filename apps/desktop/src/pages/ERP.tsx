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
import { zh } from '../i18n/zh';

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
  { id: 'PO-001', supplier: zh['erp.poSupplierHuawei'], items: zh['erp.poItemsServer'], amount: '¥500,000', status: 'approved', createDate: '2024-01-15', deliveryDate: '2024-01-25' },
  { id: 'PO-002', supplier: zh['erp.poSupplierJdcloud'], items: zh['erp.poItemsCloud'], amount: '¥120,000', status: 'pending', createDate: '2024-01-14', deliveryDate: '2024-01-20' },
  { id: 'PO-003', supplier: zh['erp.poSupplierLenovo'], items: zh['erp.poItemsOfficePc'], amount: '¥250,000', status: 'completed', createDate: '2024-01-10', deliveryDate: '2024-01-18' },
  { id: 'PO-004', supplier: zh['erp.poSupplierDell'], items: zh['erp.poItemsMonitor'], amount: '¥60,000', status: 'approved', createDate: '2024-01-12', deliveryDate: '2024-01-22' },
];

const mockSalesOrders: SalesOrder[] = [
  { id: 'SO-001', customer: zh['erp.soCustomerByd'], items: zh['erp.soItemsErpLicense'], amount: '¥800,000', status: 'completed', createDate: '2024-01-10', deliveryDate: '2024-01-15' },
  { id: 'SO-002', customer: zh['erp.soCustomerXiaomi'], items: zh['erp.soItemsCrmLicense'], amount: '¥350,000', status: 'approved', createDate: '2024-01-13', deliveryDate: '2024-01-20' },
  { id: 'SO-003', customer: zh['erp.soCustomerTencent'], items: zh['erp.soItemsBiService'], amount: '¥500,000', status: 'pending', createDate: '2024-01-15', deliveryDate: '2024-01-25' },
  { id: 'SO-004', customer: zh['erp.soCustomerAlibaba'], items: zh['erp.soItemsCustomDev'], amount: '¥2,000,000', status: 'pending', createDate: '2024-01-14', deliveryDate: '2024-02-15' },
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
      case 'approved': return zh['erp.statusApproved'];
      case 'completed': return zh['erp.statusCompleted'];
      case 'pending': return zh['erp.statusPending'];
      case 'cancelled': return zh['erp.statusCancelled'];
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {zh['erp.title']}
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />}>
          {tab === 0 ? zh['erp.newPurchaseOrder'] : zh['erp.newSalesOrder']}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 4 }}>
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShoppingCart size={18} />{zh['erp.purchaseOrdersTab']}</Box>} />
        <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Package size={18} />{zh['erp.salesOrdersTab']}</Box>} />
      </Tabs>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">{zh['erp.statTotalOrders']}</Typography>
            <Typography variant="h4">{tab === 0 ? mockPurchaseOrders.length : mockSalesOrders.length}</Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">{zh['erp.statusPending']}</Typography>
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
            <Typography variant="body2" color="text.secondary">{zh['erp.statusApproved']}</Typography>
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
            <Typography variant="body2" color="text.secondary">{zh['erp.statTotalAmount']}</Typography>
            <Typography variant="h4">¥{tab === 0 ? '930K' : '3.65M'}</Typography>
          </Paper>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{zh['erp.colOrderId']}</TableCell>
                <TableCell>{tab === 0 ? zh['erp.colSupplier'] : zh['erp.colCustomer']}</TableCell>
                <TableCell>{zh['erp.colItems']}</TableCell>
                <TableCell>{zh['erp.colAmount']}</TableCell>
                <TableCell>{zh['erp.colStatus']}</TableCell>
                <TableCell>{zh['erp.colCreateDate']}</TableCell>
                <TableCell>{zh['erp.colDeliveryDate']}</TableCell>
                <TableCell>{zh['erp.colActions']}</TableCell>
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