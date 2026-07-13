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
  { id: '1', name: '张三', department: '技术部', position: '高级工程师', email: 'zhangsan@topems.com', phone: '13800138001', status: 'active', hireDate: '2023-01-15' },
  { id: '2', name: '李四', department: '市场部', position: '市场经理', email: 'lisi@topems.com', phone: '13800138002', status: 'active', hireDate: '2023-03-20' },
  { id: '3', name: '王五', department: '财务部', position: '财务主管', email: 'wangwu@topems.com', phone: '13800138003', status: 'inactive', hireDate: '2022-11-10' },
  { id: '4', name: '赵六', department: '人力资源部', position: 'HR专员', email: 'zhaoliu@topems.com', phone: '13800138004', status: 'active', hireDate: '2023-06-01' },
  { id: '5', name: '钱七', department: '技术部', position: '产品经理', email: 'qianqi@topems.com', phone: '13800138005', status: 'active', hireDate: '2023-08-15' },
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
          人力资源管理
        </Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleAdd}>
          添加员工
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>姓名</TableCell>
                <TableCell>部门</TableCell>
                <TableCell>职位</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>电话</TableCell>
                <TableCell>入职日期</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
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
                      {employee.status === 'active' ? '在职' : '离职'}
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
        <DialogTitle>{editingEmployee ? '编辑员工' : '添加员工'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="姓名" fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="部门" fullWidth value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
              <TextField label="职位" fullWidth value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
            </Box>
            <TextField label="邮箱" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label="电话" fullWidth value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <TextField label="入职日期" type="date" fullWidth value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HR;