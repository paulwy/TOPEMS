import React, { useState, useMemo } from 'react';
import { CircleCheck, Copy, Eye, FileText, Pencil, Plus, Search, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
const Add = Plus;
const Cancel = X;
const CheckCircle = CircleCheck;
const ContentCopy = Copy;
const Delete = Trash2;
const Description = FileText;
const Edit = Pencil;
const ToggleOff = ToggleLeft;
const ToggleOn = ToggleRight;
const Visibility = Eye;
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';


interface FlowTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  scope: string;
  usageCount: number;
  creator: string;
  createdAt: string;
  isActive: boolean;
  description?: string;
}

const mockTemplates: FlowTemplate[] = [
  {
    id: 'TPL-001',
    name: '标准请假流程',
    code: 'leave-standard',
    category: 'approval',
    scope: '全公司',
    usageCount: 156,
    creator: '张三',
    createdAt: '2024-01-10',
    isActive: true,
    description: '适用于普通员工请假审批',
  },
  {
    id: 'TPL-002',
    name: '差旅报销流程',
    code: 'travel-reimbursement',
    category: 'reimbursement',
    scope: '全公司',
    usageCount: 89,
    creator: '李四',
    createdAt: '2024-01-15',
    isActive: true,
    description: '差旅费用报销审批流程',
  },
  {
    id: 'TPL-003',
    name: '采购审批流程',
    code: 'purchase-approval',
    category: 'purchase',
    scope: '采购部',
    usageCount: 45,
    creator: '王五',
    createdAt: '2024-02-01',
    isActive: true,
    description: '物资采购申请审批',
  },
  {
    id: 'TPL-004',
    name: '合同审批流程',
    code: 'contract-approval',
    category: 'contract',
    scope: '法务部',
    usageCount: 23,
    creator: '赵六',
    createdAt: '2024-02-10',
    isActive: false,
    description: '合同审核签署流程',
  },
  {
    id: 'TPL-005',
    name: '加班申请流程',
    code: 'overtime-application',
    category: 'approval',
    scope: '全公司',
    usageCount: 234,
    creator: '张三',
    createdAt: '2024-02-15',
    isActive: true,
    description: '员工加班申请审批',
  },
  {
    id: 'TPL-006',
    name: '设备借用流程',
    code: 'equipment-borrow',
    category: 'approval',
    scope: '行政部',
    usageCount: 67,
    creator: '李四',
    createdAt: '2024-02-20',
    isActive: true,
    description: '办公设备借用申请',
  },
  {
    id: 'TPL-007',
    name: '入职审批流程',
    code: 'onboarding-approval',
    category: 'approval',
    scope: '人力资源部',
    usageCount: 12,
    creator: '孙七',
    createdAt: '2024-03-01',
    isActive: true,
    description: '新员工入职审批流程',
  },
  {
    id: 'TPL-008',
    name: '离职审批流程',
    code: 'offboarding-approval',
    category: 'approval',
    scope: '人力资源部',
    usageCount: 8,
    creator: '孙七',
    createdAt: '2024-03-05',
    isActive: false,
    description: '员工离职审批流程',
  },
];

const categories = [
  { value: 'all', label: '全部分类' },
  { value: 'approval', label: '审批流程' },
  { value: 'reimbursement', label: '报销流程' },
  { value: 'purchase', label: '采购流程' },
  { value: 'contract', label: '合同流程' },
];

const getCategoryText = (category: string) => {
  const found = categories.find((c) => c.value === category);
  return found?.label || category;
};

export const FlowTemplatePage: React.FC = () => {
  const [data, setData] = useState<FlowTemplate[]>(mockTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tabValue, setTabValue] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesTab =
        tabValue === 'all'
          ? true
          : tabValue === 'active'
            ? item.isActive
            : !item.isActive;
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [data, searchTerm, categoryFilter, tabValue]);

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const stats = useMemo(() => {
    return {
      total: data.length,
      active: data.filter((d) => d.isActive).length,
      inactive: data.filter((d) => !d.isActive).length,
    };
  }, [data]);

  const handleView = (template: FlowTemplate) => {
    console.log('查看模板:', template.id);
  };

  const handleEdit = (template: FlowTemplate) => {
    console.log('编辑模板:', template.id);
  };

  const handleCopy = (template: FlowTemplate) => {
    const newTemplate: FlowTemplate = {
      ...template,
      id: `TPL-${String(data.length + 1).padStart(3, '0')}`,
      name: `${template.name} (副本)`,
      code: `${template.code}-copy`,
      usageCount: 0,
      isActive: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setData((prev) => [...prev, newTemplate]);
  };

  const handleDelete = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedTemplate) {
      setData((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const handleToggle = (template: FlowTemplate) => {
    setData((prev) =>
      prev.map((t) =>
        t.id === template.id ? { ...t, isActive: !t.isActive } : t
      )
    );
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
    setPage(1);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.light',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Description style={{ color: '#1976d2' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                流程模板
              </Typography>
              <Typography variant="body2" color="text.secondary">
                管理和配置流程模板
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => console.log('新建模板')}
              >
                新建模板
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 0 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label={`全部 (${stats.total})`}
              value="all"
            />
            <Tab
              label={`已启用 (${stats.active})`}
              value="active"
            />
            <Tab
              label={`已禁用 (${stats.inactive})`}
              value="inactive"
            />
          </Tabs>
        </CardContent>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
            <TextField
              placeholder="搜索模板名称..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  size: 'small',
                  startAdornment: <Search style={{ marginRight: 4, color: '#bdbdbd' }} />,
                },
              }}
              sx={{ flex: 1, maxWidth: 300 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>模板分类</InputLabel>
              <Select
                value={categoryFilter}
                label="模板分类"
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 600 }}>模板名称</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>模板编码</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>模板分类</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>适用范围</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>使用次数</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>创建人</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((template, index) => (
                  <TableRow
                    key={template.id}
                    sx={{
                      bgcolor: index % 2 === 0 ? 'white' : 'grey.50',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                        <Description fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {template.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code style={{ fontSize: '0.875rem', color: '#666' }}>
                        {template.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getCategoryText(template.category)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{template.scope}</TableCell>
                    <TableCell>{template.usageCount}</TableCell>
                    <TableCell>{template.creator}</TableCell>
                    <TableCell>{template.createdAt}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={template.isActive ? '已启用' : '已禁用'}
                        color={template.isActive ? 'success' : 'default'}
                        icon={
                          template.isActive ? (
                            <CheckCircle fontSize="small" />
                          ) : (
                            <Cancel fontSize="small" />
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => handleView(template)}
                          title="查看"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(template)}
                          title="编辑"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(template)}
                          title="复制"
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleToggle(template)}
                          title={template.isActive ? '禁用' : '启用'}
                        >
                          {template.isActive ? (
                            <ToggleOn fontSize="small" color="success" />
                          ) : (
                            <ToggleOff fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(template)}
                          title="删除"
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>删除模板</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除模板 <strong>{selectedTemplate?.name}</strong> 吗？
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            删除后无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
