import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Button,
  Stack,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useHrmStore } from '../store/hrmStore';
import { employeeApi, type Employee, type PaginatedResult } from '../api/hrm';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'onboarding':
      return 'info';
    case 'probation':
      return 'warning';
    case 'terminated':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '在职';
    case 'inactive':
      return '离职';
    case 'onboarding':
      return '入职中';
    case 'probation':
      return '试用期';
    case 'terminated':
      return '已离职';
    default:
      return status;
  }
};

export const EmployeeManagementPage: React.FC = () => {
  const {
    employees,
    employeesTotal,
    employeesPage,
    employeesPageSize,
    loading,
    error,
    setEmployees,
    setEmployeesPage,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setLoading,
    setError,
  } = useHrmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    employee_no: '',
    name: '',
    email: '',
    phone: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const data: PaginatedResult<Employee> = await employeeApi.list({
        page,
        page_size: pageSize,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setEmployees(data.items, data.total);
      setEmployeesPage(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载员工列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees(1, employeesPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadEmployees(1, employeesPageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadEmployees(page, employeesPageSize);
  };

  const handleCreate = async () => {
    if (!newEmployee.employee_no || !newEmployee.name) return;
    setSubmitting(true);
    try {
      const employee = await employeeApi.create(newEmployee);
      addEmployee(employee);
      setCreateDialogOpen(false);
      setNewEmployee({ employee_no: '', name: '', email: '', phone: '', status: 'active' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建员工失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      const employee = await employeeApi.update(selectedEmployee.id, selectedEmployee);
      updateEmployee(employee);
      setEditDialogOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新员工失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该员工吗？')) return;
    try {
      await employeeApi.delete(id);
      deleteEmployee(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除员工失败');
    }
  };

  const totalPages = Math.ceil(employeesTotal / employeesPageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            员工管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理公司员工信息、合同及状态
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadEmployees(employeesPage, employeesPageSize)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增员工
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="搜索员工姓名/编号..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="active">在职</MenuItem>
              <MenuItem value="inactive">离职</MenuItem>
              <MenuItem value="probation">试用期</MenuItem>
              <MenuItem value="onboarding">入职中</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>员工</TableCell>
                <TableCell>工号</TableCell>
                <TableCell>部门</TableCell>
                <TableCell>职位</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无员工数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {employee.name?.charAt(0) || '?'}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {employee.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{employee.employee_no}</TableCell>
                    <TableCell>{employee.department_id || '-'}</TableCell>
                    <TableCell>{employee.position || '-'}</TableCell>
                    <TableCell>{employee.email || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(employee.status)}
                        size="small"
                        color={getStatusColor(employee.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {employeesTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={employeesPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增员工</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="工号"
              required
              value={newEmployee.employee_no || ''}
              onChange={(e) => setNewEmployee({ ...newEmployee, employee_no: e.target.value })}
              fullWidth
            />
            <TextField
              label="姓名"
              required
              value={newEmployee.name || ''}
              onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="邮箱"
              type="email"
              value={newEmployee.email || ''}
              onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="电话"
              value={newEmployee.phone || ''}
              onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newEmployee.employee_no || !newEmployee.name}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑员工</DialogTitle>
        {selectedEmployee && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="工号"
                value={selectedEmployee.employee_no}
                disabled
                fullWidth
              />
              <TextField
                label="姓名"
                value={selectedEmployee.name}
                onChange={(e) =>
                  setSelectedEmployee({ ...selectedEmployee, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="邮箱"
                value={selectedEmployee.email || ''}
                onChange={(e) =>
                  setSelectedEmployee({ ...selectedEmployee, email: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="电话"
                value={selectedEmployee.phone || ''}
                onChange={(e) =>
                  setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={selectedEmployee.status}
                  label="状态"
                  onChange={(e) =>
                    setSelectedEmployee({ ...selectedEmployee, status: e.target.value })
                  }
                >
                  <MenuItem value="active">在职</MenuItem>
                  <MenuItem value="inactive">离职</MenuItem>
                  <MenuItem value="probation">试用期</MenuItem>
                  <MenuItem value="onboarding">入职中</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedEmployee(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeManagementPage;
