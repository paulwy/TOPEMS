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
} from '@mui/material';
import { Plus, Edit, Delete, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { zh } from '../i18n/zh';

interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  industry: string;
  status: 'active' | 'inactive' | 'potential';
  value: string;
  lastContact: string;
}

const mockCustomers: Customer[] = [
  { id: '1', name: zh['crm.custHuawei'], contact: zh['crm.contactLi'], phone: '13900139001', email: 'li@huawei.com', industry: zh['crm.industryTelecom'], status: 'active', value: '¥5,000,000', lastContact: '2024-01-15' },
  { id: '2', name: zh['crm.custAlibaba'], contact: zh['crm.contactZhang'], phone: '13900139002', email: 'zhang@alibaba.com', industry: zh['crm.industryInternet'], status: 'active', value: '¥8,000,000', lastContact: '2024-01-12' },
  { id: '3', name: zh['crm.custTencent'], contact: zh['crm.contactWang'], phone: '13900139003', email: 'wang@tencent.com', industry: zh['crm.industryInternet'], status: 'potential', value: '¥3,500,000', lastContact: '2024-01-10' },
  { id: '4', name: zh['crm.custByd'], contact: zh['crm.contactZhao'], phone: '13900139004', email: 'zhao@byd.com', industry: zh['crm.industryAuto'], status: 'active', value: '¥6,200,000', lastContact: '2024-01-08' },
  { id: '5', name: zh['crm.custXiaomi'], contact: zh['crm.contactSun'], phone: '13900139005', email: 'sun@xiaomi.com', industry: zh['crm.industryElectronics'], status: 'inactive', value: '¥2,000,000', lastContact: '2023-12-20' },
];

const CRM = () => {
  const [customers] = useState<Customer[]>(mockCustomers);

  const getStatusColor = (status: Customer['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'potential': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: Customer['status']) => {
    switch (status) {
      case 'active': return zh['crm.statusActive'];
      case 'potential': return zh['crm.statusPotential'];
      case 'inactive': return zh['crm.statusInactive'];
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {zh['crm.title']}
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />}>
          {zh['crm.addCustomer']}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography variant="body2" color="text.secondary">{zh['crm.statTotalCustomers']}</Typography>
                <Typography variant="h4">{customers.length}</Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#4caf50' }}>
                <TrendingUp size={24} />
                <Typography variant="body2">+12%</Typography>
              </div>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography variant="body2" color="text.secondary">{zh['crm.statActiveCustomers']}</Typography>
                <Typography variant="h4">{customers.filter(c => c.status === 'active').length}</Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#4caf50' }}>
                <TrendingUp size={24} />
                <Typography variant="body2">+8%</Typography>
              </div>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography variant="body2" color="text.secondary">{zh['crm.statPotentialCustomers']}</Typography>
                <Typography variant="h4">{customers.filter(c => c.status === 'potential').length}</Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#ff9800' }}>
                <TrendingUp size={24} />
                <Typography variant="body2">+15%</Typography>
              </div>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography variant="body2" color="text.secondary">{zh['crm.statTotalValue']}</Typography>
                <Typography variant="h4">¥24.7M</Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#f44336' }}>
                <TrendingDown size={24} />
                <Typography variant="body2">-2%</Typography>
              </div>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{zh['crm.colCustomerName']}</TableCell>
                <TableCell>{zh['crm.colContact']}</TableCell>
                <TableCell>{zh['crm.colIndustry']}</TableCell>
                <TableCell>{zh['crm.colValue']}</TableCell>
                <TableCell>{zh['crm.colStatus']}</TableCell>
                <TableCell>{zh['crm.colLastContact']}</TableCell>
                <TableCell>{zh['crm.colActions']}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.contact}</TableCell>
                  <TableCell>{customer.industry}</TableCell>
                  <TableCell>{customer.value}</TableCell>
                  <TableCell>
                    <Chip label={getStatusLabel(customer.status)} color={getStatusColor(customer.status)} size="small" />
                  </TableCell>
                  <TableCell>{customer.lastContact}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small"><Eye size={16} /></Button>
                      <Button size="small"><Edit size={16} /></Button>
                      <Button size="small"><Delete size={16} /></Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default CRM;