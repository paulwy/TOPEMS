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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Plus, Edit, Delete, Eye } from 'lucide-react';
import { zh } from '../i18n/zh';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  hireDate: string;
}

const mockEmployees: Employee[] = [
  { id: '1', name: zh['hr.empZhangName'], department: zh['hr.deptTech'], position: zh['hr.posSeniorEngineer'], email: 'zhangsan@topems.com', phone: '13800138001', status: 'active', hireDate: '2023-01-15' },
  { id: '2', name: zh['hr.empLiName'], department: zh['hr.deptMarketing'], position: zh['hr.posMarketingManager'], email: 'lisi@topems.com', phone: '13800138002', status: 'active', hireDate: '2023-03-20' },
  { id: '3', name: zh['hr.empWangName'], department: zh['hr.deptFinance'], position: zh['hr.posFinanceLead'], email: 'wangwu@topems.com', phone: '13800138003', status: 'inactive', hireDate: '2022-11-10' },
  { id: '4', name: zh['hr.empZhaoName'], department: zh['hr.deptHr'], position: zh['hr.posHrSpecialist'], email: 'zhaoliu@topems.com', phone: '13800138004', status: 'active', hireDate: '2023-06-01' },
  { id: '5', name: zh['hr.empQianName'], department: zh['hr.deptTech'], position: zh['hr.posProductManager'], email: 'qianqi@topems.com', phone: '13800138005', status: 'active', hireDate: '2023-08-15' },
];

const HR = () => {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    hireDate: '',
  });

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormData({ name: '', department: '', position: '', email: '', phone: '', hireDate: '' });
    setOpenDialog(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      department: employee.department,
      position: employee.position,
      email: employee.email,
      phone: employee.phone,
      hireDate: employee.hireDate,
    });
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));
  };

  const handleSave = () => {
    if (editingEmployee) {
      setEmployees(employees.map((e) => (e.id === editingEmployee.id ? { ...e, ...formData } : e)));
    } else {
      const newEmployee: Employee = {
        ...formData,
        id: Date.now().toString(),
        status: 'active',
      } as Employee;
      setEmployees([...employees, newEmployee]);
    }
    setOpenDialog(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {zh['hr.title']}
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleAdd}>
          {zh['hr.addEmployee']}
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{zh['hr.colName']}</TableCell>
                <TableCell>{zh['hr.colDepartment']}</TableCell>
                <TableCell>{zh['hr.colPosition']}</TableCell>
                <TableCell>{zh['hr.colEmail']}</TableCell>
                <TableCell>{zh['hr.colPhone']}</TableCell>
                <TableCell>{zh['hr.colHireDate']}</TableCell>
                <TableCell>{zh['hr.colStatus']}</TableCell>
                <TableCell>{zh['hr.colActions']}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>{employee.hireDate}</TableCell>
                  <TableCell>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: employee.status === 'active' ? '#e8f5e9' : '#ffebee',
                      color: employee.status === 'active' ? '#2e7d32' : '#c62828',
                    }}>
                      {employee.status === 'active' ? zh['hr.statusActive'] : zh['hr.statusInactive']}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" onClick={() => handleEdit(employee)}>
                        <Edit size={16} />
                      </Button>
                      <Button size="small" onClick={() => handleDelete(employee.id)}>
                        <Delete size={16} />
                      </Button>
                      <Button size="small">
                        <Eye size={16} />
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editingEmployee ? zh['hr.editEmployee'] : zh['hr.addEmployee']}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label={zh['hr.colName']} fullWidth value={formData.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label={zh['hr.colDepartment']} fullWidth value={formData.department} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, department: e.target.value })} />
              <TextField label={zh['hr.colPosition']} fullWidth value={formData.position} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, position: e.target.value })} />
            </Box>
            <TextField label={zh['hr.colEmail']} fullWidth value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label={zh['hr.colPhone']} fullWidth value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })} />
            <TextField label={zh['hr.colHireDate']} type="date" fullWidth value={formData.hireDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hireDate: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{zh['hr.cancel']}</Button>
          <Button onClick={handleSave}>{zh['hr.save']}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HR;