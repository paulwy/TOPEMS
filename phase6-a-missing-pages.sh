#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Phase 6-A: Create 6 missing TOPEMS pages & register routes
###############################################################################

PROJECT_ROOT="/Users/air/TOPEMS"
SRC="${PROJECT_ROOT}/apps/web/src"
PAGES_DIR="${SRC}/pages"
ROUTES_DIR="${SRC}/routes"
BAK_SUFFIX=".bak.phase6-a"

echo "=== Phase 6-A Missing Pages: START ==="

# ---------------------------------------------------------------------------
# 1. Backup route files
# ---------------------------------------------------------------------------
for f in "${ROUTES_DIR}/professional.ts" "${ROUTES_DIR}/pdm.ts" "${ROUTES_DIR}/docs.ts"; do
  cp "$f" "${f}${BAK_SUFFIX}"
  echo "[BACKUP] $(basename "$f") -> $(basename "$f")${BAK_SUFFIX}"
done

# ---------------------------------------------------------------------------
# 2. Create page files (heredoc)
# ---------------------------------------------------------------------------

# ======== 2.1 EHS Compliance Page ========
cat > "${PAGES_DIR}/ehs/EhsCompliancePage.tsx" << 'ENDOFFILE'
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, Alert,
} from '@mui/material';
import { Plus, Eye, Edit, Delete, Search, Shield, FileCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

interface ComplianceItem {
  id: string;
  code: string;
  title: string;
  category: string;
  regulation: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
  dueDate: string;
  responsible: string;
  lastAudit: string;
  description: string;
}

const initialData: ComplianceItem[] = [
  { id: '1', code: 'EHSL-2025-001', title: '废水排放许可合规', category: '排放许可', regulation: 'GB 8978-1996', status: 'compliant', dueDate: '2025-12-31', responsible: '王建国', lastAudit: '2025-03-15', description: '年度废水排放许可证 renewal 及合规检查' },
  { id: '2', code: 'EHSL-2025-002', title: '环境影响评价报告', category: '环评报告', regulation: '环评法 第25条', status: 'pending', dueDate: '2025-08-01', responsible: '李明', lastAudit: '2025-01-20', description: '新建产线环境影响评价报告编制与提交' },
  { id: '3', code: 'EHSL-2025-003', title: '大气污染物排放监测', category: '排放监测', regulation: 'GB 16297-1996', status: 'compliant', dueDate: '2025-10-15', responsible: '赵静', lastAudit: '2025-04-01', description: '季度大气污染物排放合规监测' },
  { id: '4', code: 'EHSL-2025-004', title: '危险废物处置合规', category: '危废管理', regulation: 'GB 18597-2023', status: 'non_compliant', dueDate: '2025-06-30', responsible: '张伟', lastAudit: '2025-02-10', description: '危险废物规范化管理指标达标评估' },
  { id: '5', code: 'EHSL-2025-005', title: '噪声排放达标认证', category: '噪声管理', regulation: 'GB 12348-2008', status: 'expired', dueDate: '2025-01-31', responsible: '刘洋', lastAudit: '2024-12-01', description: '厂界噪声排放达标认证已过期需续期' },
  { id: '6', code: 'EHSL-2025-006', title: '排污许可证年度执行报告', category: '排污许可', regulation: '排污许可管理条例', status: 'compliant', dueDate: '2025-09-30', responsible: '陈芳', lastAudit: '2025-03-20', description: '提交年度排污许可证执行情况报告' },
  { id: '7', code: 'EHSL-2025-007', title: '土壤污染隐患排查', category: '土壤环境', regulation: '土壤污染防治法', status: 'pending', dueDate: '2025-11-30', responsible: '孙磊', lastAudit: '2024-11-15', description: '重点区域土壤污染隐患排查及报告编制' },
  { id: '8', code: 'EHSL-2025-008', title: '清洁生产审核', category: '清洁生产', regulation: '清洁生产促进法', status: 'compliant', dueDate: '2025-07-31', responsible: '周晓', lastAudit: '2025-05-10', description: '强制性清洁生产审核评估验收' },
];

const EhsCompliancePage: React.FC = () => {
  const [data, setData] = useState<ComplianceItem[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [formData, setFormData] = useState({ code: '', title: '', category: '', regulation: '', status: 'pending' as ComplianceItem['status'], dueDate: '', responsible: '', description: '' });

  const getStatusChip = (status: ComplianceItem['status']) => {
    const map: Record<ComplianceItem['status'], { label: string; color: string }> = {
      compliant: { label: '合规', color: 'success' },
      non_compliant: { label: '不合规', color: 'error' },
      pending: { label: '待审核', color: 'warning' },
      expired: { label: '已过期', color: 'default' },
    };
    const info = map[status];
    return <Chip label={info.label} size="small" color={info.color as any} />;
  };

  const columns: ColumnDef<ComplianceItem>[] = [
    { id: 'code', label: '编号' },
    { id: 'title', label: '合规项目' },
    { id: 'category', label: '类别' },
    { id: 'regulation', label: '法规依据' },
    { id: 'responsible', label: '负责人' },
    { id: 'dueDate', label: '到期日期' },
    { id: 'lastAudit', label: '上次审核' },
    { id: 'status', label: '状态', render: (row) => getStatusChip(row.status) },
    {
      id: 'actions', label: '操作',
      render: (row) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="查看"><IconButton size="small" onClick={() => { setSelectedItem(row); setDetailDialogOpen(true); }}><Eye style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditingItem(row); setFormData({ code: row.code, title: row.title, category: row.category, regulation: row.regulation, status: row.status, dueDate: row.dueDate, responsible: row.responsible, description: row.description }); setDialogOpen(true); }}><Edit style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setData((prev) => prev.filter((i) => i.id !== row.id))}><Delete style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredData = useMemo(() => data.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) || item.code.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  }), [data, searchText, statusFilter, categoryFilter]);

  const handleSave = () => {
    if (editingItem) {
      setData((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...formData } : i));
    } else {
      const newItem: ComplianceItem = { id: String(Date.now()), ...formData };
      setData((prev) => [newItem, ...prev]);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const stats = useMemo(() => ({
    total: data.length,
    compliant: data.filter((i) => i.status === 'compliant').length,
    nonCompliant: data.filter((i) => i.status === 'non_compliant').length,
    pending: data.filter((i) => i.status === 'pending').length,
  }), [data]);

  const filters = [
    { id: 'status', label: '状态', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '合规', value: 'compliant' }, { label: '不合规', value: 'non_compliant' }, { label: '待审核', value: 'pending' }, { label: '已过期', value: 'expired' },
    ], value: statusFilter, onChange: (v: string) => setStatusFilter(v) },
    { id: 'category', label: '类别', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '排放许可', value: '排放许可' }, { label: '环评报告', value: '环评报告' }, { label: '排放监测', value: '排放监测' }, { label: '危废管理', value: '危废管理' }, { label: '噪声管理', value: '噪声管理' },
    ], value: categoryFilter, onChange: (v: string) => setCategoryFilter(v) },
  ];

  return (
    <PageContainer title="环保合规管理" subtitle="Environmental Compliance Management">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: '合规总数', value: stats.total, icon: <Shield style={{ width: 20, height: 20 }} />, bg: 'primary.lighter' },
          { label: '已合规', value: stats.compliant, icon: <CheckCircle style={{ width: 20, height: 20 }} />, bg: 'success.lighter' },
          { label: '不合规', value: stats.nonCompliant, icon: <AlertTriangle style={{ width: 20, height: 20 }} />, bg: 'error.lighter' },
          { label: '待审核', value: stats.pending, icon: <FileCheck style={{ width: 20, height: 20 }} />, bg: 'warning.light' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: s.bg, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.label}</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{s.value}</Typography></Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <ListPageTemplate<ComplianceItem>
        title="" columns={columns} data={filteredData} loading={false}
        filters={filters} searchable searchPlaceholder="搜索合规项目..." searchValue={searchText} onSearch={setSearchText}
        actions={[{ label: '新增合规项', icon: <Plus style={{ width: 18, height: 18 }} />, onClick: () => { setEditingItem(null); setFormData({ code: '', title: '', category: '', regulation: '', status: 'pending', dueDate: '', responsible: '', description: '' }); setDialogOpen(true); }, variant: 'contained' }]}
        emptyMessage="暂无合规记录"
      />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? '编辑合规项' : '新增合规项'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="编号" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              <TextField fullWidth label="合规项目名称 *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth><InputLabel>类别</InputLabel><Select value={formData.category} label="类别" onChange={(e) => setFormData({ ...formData, category: e.target.value })}><MenuItem value="排放许可">排放许可</MenuItem><MenuItem value="环评报告">环评报告</MenuItem><MenuItem value="排放监测">排放监测</MenuItem><MenuItem value="危废管理">危废管理</MenuItem><MenuItem value="噪声管理">噪声管理</MenuItem><MenuItem value="土壤环境">土壤环境</MenuItem><MenuItem value="清洁生产">清洁生产</MenuItem></Select></FormControl>
              <TextField fullWidth label="法规依据" value={formData.regulation} onChange={(e) => setFormData({ ...formData, regulation: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth><InputLabel>状态</InputLabel><Select value={formData.status} label="状态" onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}><MenuItem value="compliant">合规</MenuItem><MenuItem value="non_compliant">不合规</MenuItem><MenuItem value="pending">待审核</MenuItem><MenuItem value="expired">已过期</MenuItem></Select></FormControl>
              <TextField fullWidth type="date" label="到期日期" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </Box>
            <TextField fullWidth label="负责人" value={formData.responsible} onChange={(e) => setFormData({ ...formData, responsible: e.target.value })} />
            <TextField fullWidth label="描述" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions><Button variant="outlined" onClick={() => setDialogOpen(false)}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>合规项目详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>编号</Typography><Typography sx={{ fontWeight: 500 }}>{selectedItem.code}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>状态</Typography>{getStatusChip(selectedItem.status)}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>类别</Typography><Typography>{selectedItem.category}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>法规依据</Typography><Typography>{selectedItem.regulation}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>负责人</Typography><Typography>{selectedItem.responsible}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>到期日期</Typography><Typography>{selectedItem.dueDate}</Typography></Box>
              <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>描述</Typography><Typography>{selectedItem.description}</Typography></Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialogOpen(false)}>关闭</Button></DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsCompliancePage;
ENDOFFILE
echo "[CREATED] pages/ehs/EhsCompliancePage.tsx"

# ======== 2.2 EHS Health Management Page ========
cat > "${PAGES_DIR}/ehs/EhsHealthManagementPage.tsx" << 'ENDOFFILE'
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack,
} from '@mui/material';
import { Plus, Eye, Edit, Delete, Search, Heart, UserCheck, AlertTriangle, Activity, FileText } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

interface HealthRecord {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  workType: string;
  examDate: string;
  examType: string;
  result: 'normal' | 'abnormal' | 'review_required' | 'pending';
  examiner: string;
  findings: string;
  nextExamDate: string;
}

const initialData: HealthRecord[] = [
  { id: '1', employeeId: 'EMP-1001', name: '张三', department: '生产部', workType: '焊接作业', examDate: '2025-03-15', examType: '岗中体检', result: 'normal', examiner: '李医生', findings: '各项指标正常', nextExamDate: '2026-03-15' },
  { id: '2', employeeId: 'EMP-1002', name: '李四', department: '涂装车间', workType: '喷漆作业', examDate: '2025-04-01', examType: '岗中体检', result: 'review_required', examiner: '王医生', findings: '血常规白细胞偏低，建议复查', nextExamDate: '2025-07-01' },
  { id: '3', employeeId: 'EMP-1003', name: '王五', department: '装配部', workType: '装配作业', examDate: '2025-02-20', examType: '岗前体检', result: 'normal', examiner: '赵医生', findings: '听力正常，肺功能正常', nextExamDate: '2026-02-20' },
  { id: '4', employeeId: 'EMP-1004', name: '赵六', department: '机加工', workType: '噪声作业', examDate: '2025-01-10', examType: '岗中体检', result: 'abnormal', examiner: '刘医生', findings: '高频听力损失25dB，需职业病诊断', nextExamDate: '2025-04-10' },
  { id: '5', employeeId: 'EMP-1005', name: '孙七', department: '仓库', workType: '搬运作业', examDate: '2025-05-10', examType: '岗中体检', result: 'normal', examiner: '陈医生', findings: '脊柱检查正常', nextExamDate: '2026-05-10' },
  { id: '6', employeeId: 'EMP-1006', name: '周八', department: '质检部', workType: '检验作业', examDate: '2025-06-01', examType: '岗前体检', result: 'pending', examiner: '', findings: '体检安排中', nextExamDate: '' },
  { id: '7', employeeId: 'EMP-1007', name: '吴九', department: '生产部', workType: '打磨作业', examDate: '2025-03-25', examType: '离岗体检', result: 'normal', examiner: '张医生', findings: '尘肺筛查正常', nextExamDate: '' },
  { id: '8', employeeId: 'EMP-1008', name: '郑十', department: '电镀车间', workType: '电镀作业', examDate: '2025-04-15', examType: '岗中体检', result: 'review_required', examiner: '孙医生', findings: '尿铅偏高0.08mg/L，需复查', nextExamDate: '2025-07-15' },
];

const EhsHealthManagementPage: React.FC = () => {
  const [data, setData] = useState<HealthRecord[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HealthRecord | null>(null);
  const [selectedItem, setSelectedItem] = useState<HealthRecord | null>(null);
  const [formData, setFormData] = useState({ employeeId: '', name: '', department: '', workType: '', examDate: '', examType: '岗中体检', result: 'pending' as HealthRecord['result'], examiner: '', findings: '', nextExamDate: '' });

  const getResultChip = (result: HealthRecord['result']) => {
    const map: Record<HealthRecord['result'], { label: string; color: string }> = {
      normal: { label: '正常', color: 'success' },
      abnormal: { label: '异常', color: 'error' },
      review_required: { label: '需复查', color: 'warning' },
      pending: { label: '待检', color: 'default' },
    };
    const info = map[result];
    return <Chip label={info.label} size="small" color={info.color as any} />;
  };

  const columns: ColumnDef<HealthRecord>[] = [
    { id: 'employeeId', label: '工号' },
    { id: 'name', label: '姓名' },
    { id: 'department', label: '部门' },
    { id: 'workType', label: '作业类型' },
    { id: 'examDate', label: '体检日期' },
    { id: 'examType', label: '体检类型' },
    { id: 'examiner', label: '体检医生' },
    { id: 'nextExamDate', label: '下次体检' },
    { id: 'result', label: '结果', render: (row) => getResultChip(row.result) },
    {
      id: 'actions', label: '操作',
      render: (row) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="查看"><IconButton size="small" onClick={() => { setSelectedItem(row); setDetailDialogOpen(true); }}><Eye style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditingItem(row); setFormData({ employeeId: row.employeeId, name: row.name, department: row.department, workType: row.workType, examDate: row.examDate, examType: row.examType, result: row.result, examiner: row.examiner, findings: row.findings, nextExamDate: row.nextExamDate }); setDialogOpen(true); }}><Edit style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setData((prev) => prev.filter((i) => i.id !== row.id))}><Delete style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredData = useMemo(() => data.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) || item.employeeId.toLowerCase().includes(searchText.toLowerCase());
    const matchResult = resultFilter === 'all' || item.result === resultFilter;
    const matchExamType = examTypeFilter === 'all' || item.examType === examTypeFilter;
    return matchSearch && matchResult && matchExamType;
  }), [data, searchText, resultFilter, examTypeFilter]);

  const handleSave = () => {
    if (editingItem) {
      setData((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...formData } : i));
    } else {
      setData((prev) => [...prev, { id: String(Date.now()), ...formData }]);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const stats = useMemo(() => ({
    total: data.length, normal: data.filter((i) => i.result === 'normal').length,
    abnormal: data.filter((i) => i.result === 'abnormal').length,
    reviewRequired: data.filter((i) => i.result === 'review_required').length,
  }), [data]);

  const filters = [
    { id: 'result', label: '体检结果', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '正常', value: 'normal' }, { label: '异常', value: 'abnormal' }, { label: '需复查', value: 'review_required' }, { label: '待检', value: 'pending' },
    ], value: resultFilter, onChange: (v: string) => setResultFilter(v) },
    { id: 'examType', label: '体检类型', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '岗前体检', value: '岗前体检' }, { label: '岗中体检', value: '岗中体检' }, { label: '离岗体检', value: '离岗体检' },
    ], value: examTypeFilter, onChange: (v: string) => setExamTypeFilter(v) },
  ];

  return (
    <PageContainer title="职业健康管理" subtitle="Occupational Health Management">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: '档案总数', value: stats.total, icon: <Heart style={{ width: 20, height: 20 }} />, bg: 'primary.lighter' },
          { label: '体检正常', value: stats.normal, icon: <UserCheck style={{ width: 20, height: 20 }} />, bg: 'success.lighter' },
          { label: '体检异常', value: stats.abnormal, icon: <AlertTriangle style={{ width: 20, height: 20 }} />, bg: 'error.lighter' },
          { label: '需复查', value: stats.reviewRequired, icon: <Activity style={{ width: 20, height: 20 }} />, bg: 'warning.light' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: s.bg, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.label}</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{s.value}</Typography></Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <ListPageTemplate<HealthRecord>
        title="" columns={columns} data={filteredData} loading={false}
        filters={filters} searchable searchPlaceholder="搜索姓名或工号..." searchValue={searchText} onSearch={setSearchText}
        actions={[{ label: '新增档案', icon: <Plus style={{ width: 18, height: 18 }} />, onClick: () => { setEditingItem(null); setFormData({ employeeId: '', name: '', department: '', workType: '', examDate: '', examType: '岗中体检', result: 'pending', examiner: '', findings: '', nextExamDate: '' }); setDialogOpen(true); }, variant: 'contained' }]}
        emptyMessage="暂无健康档案"
      />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? '编辑健康档案' : '新增健康档案'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="工号 *" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} />
              <TextField fullWidth label="姓名 *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="部门" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
              <TextField fullWidth label="作业类型" value={formData.workType} onChange={(e) => setFormData({ ...formData, workType: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth type="date" label="体检日期" value={formData.examDate} onChange={(e) => setFormData({ ...formData, examDate: e.target.value })} />
              <FormControl fullWidth><InputLabel>体检类型</InputLabel><Select value={formData.examType} label="体检类型" onChange={(e) => setFormData({ ...formData, examType: e.target.value })}><MenuItem value="岗前体检">岗前体检</MenuItem><MenuItem value="岗中体检">岗中体检</MenuItem><MenuItem value="离岗体检">离岗体检</MenuItem></Select></FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth><InputLabel>体检结果</InputLabel><Select value={formData.result} label="体检结果" onChange={(e) => setFormData({ ...formData, result: e.target.value as any })}><MenuItem value="normal">正常</MenuItem><MenuItem value="abnormal">异常</MenuItem><MenuItem value="review_required">需复查</MenuItem><MenuItem value="pending">待检</MenuItem></Select></FormControl>
              <TextField fullWidth label="体检医生" value={formData.examiner} onChange={(e) => setFormData({ ...formData, examiner: e.target.value })} />
            </Box>
            <TextField fullWidth label="体检发现" value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} multiline rows={3} />
            <TextField fullWidth type="date" label="下次体检日期" value={formData.nextExamDate} onChange={(e) => setFormData({ ...formData, nextExamDate: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions><Button variant="outlined" onClick={() => setDialogOpen(false)}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>健康档案详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>工号</Typography><Typography sx={{ fontWeight: 500 }}>{selectedItem.employeeId}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>姓名</Typography><Typography>{selectedItem.name}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>部门</Typography><Typography>{selectedItem.department}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>作业类型</Typography><Typography>{selectedItem.workType}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>体检类型</Typography><Typography>{selectedItem.examType}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>体检日期</Typography><Typography>{selectedItem.examDate}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>体检结果</Typography>{getResultChip(selectedItem.result)}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>体检医生</Typography><Typography>{selectedItem.examiner}</Typography></Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>下次体检</Typography><Typography>{selectedItem.nextExamDate || '-'}</Typography></Box>
              <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>体检发现</Typography><Typography>{selectedItem.findings}</Typography></Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialogOpen(false)}>关闭</Button></DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsHealthManagementPage;
ENDOFFILE
echo "[CREATED] pages/ehs/EhsHealthManagementPage.tsx"

# ======== 2.3 QMS Corrective Action Page ========
cat > "${PAGES_DIR}/qms/QmsCorrectiveActionPage.tsx" << 'ENDOFFILE'
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, Stepper, Step, StepLabel,
} from '@mui/material';
import { Plus, Eye, Edit, Delete, Search, ShieldCheck, AlertTriangle, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

type CapaStatus = 'open' | 'in_progress' | 'verifying' | 'closed';

interface CapaItem {
  id: string;
  code: string;
  title: string;
  source: string;
  type: 'corrective' | 'preventive';
  severity: 'critical' | 'major' | 'minor';
  status: CapaStatus;
  responsible: string;
  originDate: string;
  dueDate: string;
  rootCause: string;
  action: string;
  description: string;
}

const initialData: CapaItem[] = [
  { id: '1', code: 'CAPA-2025-001', title: '焊接工序强度不达标', source: '客户投诉', type: 'corrective', severity: 'critical', status: 'in_progress', responsible: '张工', originDate: '2025-03-01', dueDate: '2025-06-30', rootCause: '焊接参数偏差', action: '调整焊接参数并增加过程监控', description: '3月批次产品焊接强度低于标准值' },
  { id: '2', code: 'CAPA-2025-002', title: '包装破损率上升', source: '内部审核', type: 'corrective', severity: 'major', status: 'open', responsible: '李工', originDate: '2025-04-10', dueDate: '2025-07-10', rootCause: '包装材料厚度不足', action: '更换包装供应商，加强来料检验', description: '一季度包装破损率由0.5%上升至1.8%' },
  { id: '3', code: 'CAPA-2025-003', title: '新机种导入风险预防', source: 'FMEA分析', type: 'preventive', severity: 'minor', status: 'closed', responsible: '王工', originDate: '2025-01-15', dueDate: '2025-04-15', rootCause: '新工艺潜在风险', action: '制定验证计划并完成首件确认', description: '预防新机种量产质量风险' },
  { id: '4', code: 'CAPA-2025-004', title: '尺寸超差频次偏高', source: '过程监控', type: 'corrective', severity: 'major', status: 'verifying', responsible: '赵工', originDate: '2025-02-20', dueDate: '2025-05-20', rootCause: '模具磨损', action: '更换模具并增加SPC监控', description: 'CNC加工尺寸超差频次超过控制限' },
  { id: '5', code: 'CAPA-2025-005', title: '供应商来料批次追溯优化', source: '管理评审', type: 'preventive', severity: 'minor', status: 'closed', responsible: '陈工', originDate: '2025-01-05', dueDate: '2025-03-31', rootCause: '追溯信息不完整', action: '升级ERP批次追溯模块', description: '增强来料批次追溯能力' },
  { id: '6', code: 'CAPA-2025-006', title: '表面处理色差问题', source: '客户投诉', type: 'corrective', severity: 'critical', status: 'in_progress', responsible: '孙工', originDate: '2025-05-01', dueDate: '2025-08-31', rootCause: '药液浓度波动', action: '安装自动加药系统并加密检测频次', description: '阳极氧化产品色差超出允收范围' },
  { id: '7', code: 'CAPA-2025-007', title: 'SOP执行规范性改进', source: '内部审核', type: 'preventive', severity: 'minor', status: 'open', responsible: '周工', originDate: '2025-05-15', dueDate: '2025-08-15', rootCause: '培训不足', action: '制定培训计划并完善SOP作业指导', description: '部分产线SOP执行不规范' },
  { id: '8', code: 'CAPA-2025-008', title: '产品标识混乱纠正', source: '审核发现', type: 'corrective', severity: 'major', status: 'closed', responsible: '吴工', originDate: '2025-02-01', dueDate: '2025-04-30', rootCause: '标识系统缺失', action: '建立统一标识规范并培训到位', description: '产线产品标识不清晰导致混料' },
];

const QmsCorrectiveActionPage: React.FC = () => {
  const [data, setData] = useState<CapaItem[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CapaItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<CapaItem | null>(null);
  const [formData, setFormData] = useState({ code: '', title: '', source: '', type: 'corrective' as CapaItem['type'], severity: 'major' as CapaItem['severity'], status: 'open' as CapaStatus, responsible: '', originDate: '', dueDate: '', rootCause: '', action: '', description: '' });

  const getStatusChip = (status: CapaStatus) => {
    const map: Record<CapaStatus, { label: string; color: string }> = {
      open: { label: '开启', color: 'error' },
      in_progress: { label: '执行中', color: 'warning' },
      verifying: { label: '验证', color: 'info' },
      closed: { label: '关闭', color: 'success' },
    };
    const info = map[status];
    return <Chip label={info.label} size="small" color={info.color as any} />;
  };

  const getSeverityChip = (severity: CapaItem['severity']) => {
    const map: Record<CapaItem['severity'], { label: string; color: string }> = {
      critical: { label: '紧急', color: 'error' },
      major: { label: '重要', color: 'warning' },
      minor: { label: '一般', color: 'info' },
    };
    const info = map[severity];
    return <Chip label={info.label} size="small" color={info.color as any} variant="outlined" />;
  };

  const getStepIndex = (status: CapaStatus) => ({ open: 0, in_progress: 1, verifying: 2, closed: 3 }[status] || 0);

  const columns: ColumnDef<CapaItem>[] = [
    { id: 'code', label: '编号' },
    { id: 'title', label: '标题' },
    { id: 'source', label: '来源' },
    { id: 'type', label: '类型', render: (row) => <Chip label={row.type === 'corrective' ? '纠正措施' : '预防措施'} size="small" variant="outlined" /> },
    { id: 'severity', label: '严重度', render: (row) => getSeverityChip(row.severity) },
    { id: 'status', label: '状态', render: (row) => getStatusChip(row.status) },
    { id: 'responsible', label: '负责人' },
    { id: 'dueDate', label: '截止日期' },
    {
      id: 'actions', label: '操作',
      render: (row) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="查看"><IconButton size="small" onClick={() => { setSelectedItem(row); setDetailDialogOpen(true); }}><Eye style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditingItem(row); setFormData({ code: row.code, title: row.title, source: row.source, type: row.type, severity: row.severity, status: row.status, responsible: row.responsible, originDate: row.originDate, dueDate: row.dueDate, rootCause: row.rootCause, action: row.action, description: row.description }); setDialogOpen(true); }}><Edit style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setData((prev) => prev.filter((i) => i.id !== row.id))}><Delete style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredData = useMemo(() => data.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) || item.code.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  }), [data, searchText, statusFilter, typeFilter]);

  const handleSave = () => {
    if (editingItem) {
      setData((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...formData } : i));
    } else {
      setData((prev) => [...prev, { id: String(Date.now()), ...formData }]);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const stats = useMemo(() => ({
    total: data.length, open: data.filter((i) => i.status === 'open').length,
    inProgress: data.filter((i) => i.status === 'in_progress').length,
    verifying: data.filter((i) => i.status === 'verifying').length,
    closed: data.filter((i) => i.status === 'closed').length,
  }), [data]);

  const filters = [
    { id: 'status', label: '状态', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '开启', value: 'open' }, { label: '执行中', value: 'in_progress' }, { label: '验证', value: 'verifying' }, { label: '关闭', value: 'closed' },
    ], value: statusFilter, onChange: (v: string) => setStatusFilter(v) },
    { id: 'type', label: '类型', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '纠正措施', value: 'corrective' }, { label: '预防措施', value: 'preventive' },
    ], value: typeFilter, onChange: (v: string) => setTypeFilter(v) },
  ];

  const steps = ['开启', '执行中', '验证', '关闭'];

  return (
    <PageContainer title="纠正与预防措施管理" subtitle="CAPA Management">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'CAPA总数', value: stats.total, icon: <ShieldCheck style={{ width: 20, height: 20 }} />, bg: 'primary.lighter' },
          { label: '待处理', value: stats.open, icon: <AlertTriangle style={{ width: 20, height: 20 }} />, bg: 'error.lighter' },
          { label: '执行中', value: stats.inProgress, icon: <PlayCircle style={{ width: 20, height: 20 }} />, bg: 'warning.light' },
          { label: '已关闭', value: stats.closed, icon: <CheckCircle style={{ width: 20, height: 20 }} />, bg: 'success.lighter' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: s.bg, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.label}</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{s.value}</Typography></Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <ListPageTemplate<CapaItem>
        title="" columns={columns} data={filteredData} loading={false}
        filters={filters} searchable searchPlaceholder="搜索CAPA编号或标题..." searchValue={searchText} onSearch={setSearchText}
        actions={[{ label: '新增CAPA', icon: <Plus style={{ width: 18, height: 18 }} />, onClick: () => { setEditingItem(null); setFormData({ code: '', title: '', source: '', type: 'corrective', severity: 'major', status: 'open', responsible: '', originDate: '', dueDate: '', rootCause: '', action: '', description: '' }); setDialogOpen(true); }, variant: 'contained' }]}
        emptyMessage="暂无CAPA记录"
      />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? '编辑CAPA' : '新增CAPA'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="编号" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              <TextField fullWidth label="标题 *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="来源" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} />
              <FormControl fullWidth><InputLabel>类型</InputLabel><Select value={formData.type} label="类型" onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}><MenuItem value="corrective">纠正措施</MenuItem><MenuItem value="preventive">预防措施</MenuItem></Select></FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth><InputLabel>严重度</InputLabel><Select value={formData.severity} label="严重度" onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}><MenuItem value="critical">紧急</MenuItem><MenuItem value="major">重要</MenuItem><MenuItem value="minor">一般</MenuItem></Select></FormControl>
              <TextField fullWidth label="负责人" value={formData.responsible} onChange={(e) => setFormData({ ...formData, responsible: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth type="date" label="发起日期" value={formData.originDate} onChange={(e) => setFormData({ ...formData, originDate: e.target.value })} />
              <TextField fullWidth type="date" label="截止日期" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </Box>
            <TextField fullWidth label="根本原因" value={formData.rootCause} onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })} multiline rows={2} />
            <TextField fullWidth label="纠正/预防措施" value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value })} multiline rows={2} />
            <TextField fullWidth label="描述" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions><Button variant="outlined" onClick={() => setDialogOpen(false)}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>CAPA详情 - {selectedItem?.code}</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Stepper activeStep={getStepIndex(selectedItem.status)} alternativeLabel sx={{ mb: 4 }}>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>编号</Typography><Typography sx={{ fontWeight: 500 }}>{selectedItem.code}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>状态</Typography>{getStatusChip(selectedItem.status)}</Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>类型</Typography><Chip label={selectedItem.type === 'corrective' ? '纠正措施' : '预防措施'} size="small" variant="outlined" /></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>严重度</Typography>{getSeverityChip(selectedItem.severity)}</Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>来源</Typography><Typography>{selectedItem.source}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>负责人</Typography><Typography>{selectedItem.responsible}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>发起日期</Typography><Typography>{selectedItem.originDate}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>截止日期</Typography><Typography>{selectedItem.dueDate}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>根本原因</Typography><Typography>{selectedItem.rootCause || '-'}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>纠正/预防措施</Typography><Typography>{selectedItem.action || '-'}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>描述</Typography><Typography>{selectedItem.description}</Typography></Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialogOpen(false)}>关闭</Button></DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsCorrectiveActionPage;
ENDOFFILE
echo "[CREATED] pages/qms/QmsCorrectiveActionPage.tsx"

# ======== 2.4 QMS APQP Page (empty-shell upgrade) ========
cat > "${PAGES_DIR}/qms/QmsApqpPage.tsx" << 'ENDOFFILE'
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, LinearProgress,
} from '@mui/material';
import { Plus, Eye, Edit, Delete, Search, FolderOpen, Clock, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

interface ApqpProject {
  id: string;
  code: string;
  name: string;
  customer: string;
  product: string;
  phase: number;
  phaseLabel: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  progress: number;
  owner: string;
  startDate: string;
  targetDate: string;
  riskLevel: 'high' | 'medium' | 'low';
  description: string;
}

const initialData: ApqpProject[] = [
  { id: '1', code: 'APQP-2025-001', name: '新能源汽车电驱APQP', customer: '比亚迪', product: '电驱总成', phase: 3, phaseLabel: '过程设计与开发', status: 'in_progress', progress: 65, owner: '张工', startDate: '2025-01-15', targetDate: '2025-09-30', riskLevel: 'high', description: '新能源汽车电驱系统APQP项目，覆盖5个阶段' },
  { id: '2', code: 'APQP-2025-002', name: '储能电池包APQP', customer: '宁德时代', product: '电池Pack', phase: 2, phaseLabel: '产品设计开发', status: 'in_progress', progress: 40, owner: '李工', startDate: '2025-03-01', targetDate: '2025-12-31', riskLevel: 'medium', description: '储能电池包新产品APQP开发' },
  { id: '3', code: 'APQP-2025-003', name: '汽车座椅总成APQP', customer: '长安汽车', product: '座椅总成', phase: 5, phaseLabel: '反馈评定与纠正措施', status: 'review', progress: 90, owner: '王工', startDate: '2024-07-01', targetDate: '2025-06-30', riskLevel: 'low', description: '座椅总成三代产品APQP收尾阶段' },
  { id: '4', code: 'APQP-2025-004', name: '智能控制器APQP', customer: '华为', product: '域控制器', phase: 1, phaseLabel: '计划和确定项目', status: 'planning', progress: 10, owner: '赵工', startDate: '2025-05-01', targetDate: '2026-03-31', riskLevel: 'high', description: '智能驾驶域控制器APQP项目启动' },
  { id: '5', code: 'APQP-2024-008', name: '车灯总成APQP', customer: '一汽大众', product: 'LED前大灯', phase: 5, phaseLabel: '反馈评定与纠正措施', status: 'completed', progress: 100, owner: '陈工', startDate: '2024-01-10', targetDate: '2025-03-31', riskLevel: 'low', description: '已完成全部APQP阶段并通过PPAP' },
  { id: '6', code: 'APQP-2025-005', name: '冲压件APQP', customer: '特斯拉', product: 'Model Y底盘件', phase: 4, phaseLabel: '产品和过程确认', status: 'in_progress', progress: 78, owner: '孙工', startDate: '2025-02-01', targetDate: '2025-08-31', riskLevel: 'medium', description: '底盘冲压件APQP进入确认阶段' },
];

const PHASE_LABELS = ['计划和确定项目', '产品设计开发', '过程设计与开发', '产品和过程确认', '反馈评定与纠正措施'];

const QmsApqpPage: React.FC = () => {
  const [data, setData] = useState<ApqpProject[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApqpProject | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApqpProject | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', customer: '', product: '', phase: 1, status: 'planning' as ApqpProject['status'], progress: 0, owner: '', startDate: '', targetDate: '', riskLevel: 'medium' as ApqpProject['riskLevel'], description: '' });

  const getStatusChip = (status: ApqpProject['status']) => {
    const map: Record<ApqpProject['status'], { label: string; color: string }> = {
      planning: { label: '规划中', color: 'default' },
      in_progress: { label: '进行中', color: 'info' },
      review: { label: '评审中', color: 'warning' },
      completed: { label: '已完成', color: 'success' },
    };
    const info = map[status];
    return <Chip label={info.label} size="small" color={info.color as any} />;
  };

  const getRiskChip = (risk: ApqpProject['riskLevel']) => {
    const map: Record<ApqpProject['riskLevel'], { label: string; color: string }> = {
      high: { label: '高风险', color: 'error' },
      medium: { label: '中风险', color: 'warning' },
      low: { label: '低风险', color: 'success' },
    };
    const info = map[risk];
    return <Chip label={info.label} size="small" color={info.color as any} variant="outlined" />;
  };

  const columns: ColumnDef<ApqpProject>[] = [
    { id: 'code', label: '编号' },
    { id: 'name', label: '项目名称' },
    { id: 'customer', label: '客户' },
    { id: 'product', label: '产品' },
    { id: 'phaseLabel', label: '当前阶段', render: (row) => <Chip label={`P${row.phase} ${row.phaseLabel}`} size="small" variant="outlined" /> },
    {
      id: 'progress', label: '进度',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
          <LinearProgress variant="determinate" value={row.progress} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
          <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 35 }}>{row.progress}%</Typography>
        </Box>
      ),
    },
    { id: 'status', label: '状态', render: (row) => getStatusChip(row.status) },
    { id: 'riskLevel', label: '风险', render: (row) => getRiskChip(row.riskLevel) },
    { id: 'owner', label: '负责人' },
    { id: 'targetDate', label: '目标日期' },
    {
      id: 'actions', label: '操作',
      render: (row) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="查看"><IconButton size="small" onClick={() => { setSelectedItem(row); setDetailDialogOpen(true); }}><Eye style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditingItem(row); setFormData({ code: row.code, name: row.name, customer: row.customer, product: row.product, phase: row.phase, status: row.status, progress: row.progress, owner: row.owner, startDate: row.startDate, targetDate: row.targetDate, riskLevel: row.riskLevel, description: row.description }); setDialogOpen(true); }}><Edit style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setData((prev) => prev.filter((i) => i.id !== row.id))}><Delete style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredData = useMemo(() => data.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) || item.code.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  }), [data, searchText, statusFilter]);

  const handleSave = () => {
    if (editingItem) {
      setData((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...formData, phaseLabel: PHASE_LABELS[formData.phase - 1] || '' } : i));
    } else {
      setData((prev) => [...prev, { id: String(Date.now()), ...formData, phaseLabel: PHASE_LABELS[formData.phase - 1] || '' }]);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const stats = useMemo(() => ({
    total: data.length, inProgress: data.filter((i) => i.status === 'in_progress').length,
    review: data.filter((i) => i.status === 'review').length,
    completed: data.filter((i) => i.status === 'completed').length,
  }), [data]);

  const filters = [
    { id: 'status', label: '状态', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '规划中', value: 'planning' }, { label: '进行中', value: 'in_progress' }, { label: '评审中', value: 'review' }, { label: '已完成', value: 'completed' },
    ], value: statusFilter, onChange: (v: string) => setStatusFilter(v) },
  ];

  return (
    <PageContainer title="APQP项目管理" subtitle="Advanced Product Quality Planning">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: '项目总数', value: stats.total, icon: <FolderOpen style={{ width: 20, height: 20 }} />, bg: 'primary.lighter' },
          { label: '进行中', value: stats.inProgress, icon: <BarChart3 style={{ width: 20, height: 20 }} />, bg: 'info.lighter' },
          { label: '评审中', value: stats.review, icon: <Clock style={{ width: 20, height: 20 }} />, bg: 'warning.light' },
          { label: '已完成', value: stats.completed, icon: <CheckCircle style={{ width: 20, height: 20 }} />, bg: 'success.lighter' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: s.bg, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.label}</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{s.value}</Typography></Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <ListPageTemplate<ApqpProject>
        title="" columns={columns} data={filteredData} loading={false}
        filters={filters} searchable searchPlaceholder="搜索项目名称或编号..." searchValue={searchText} onSearch={setSearchText}
        actions={[{ label: '新增APQP项目', icon: <Plus style={{ width: 18, height: 18 }} />, onClick: () => { setEditingItem(null); setFormData({ code: '', name: '', customer: '', product: '', phase: 1, status: 'planning', progress: 0, owner: '', startDate: '', targetDate: '', riskLevel: 'medium', description: '' }); setDialogOpen(true); }, variant: 'contained' }]}
        emptyMessage="暂无APQP项目"
      />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? '编辑APQP项目' : '新增APQP项目'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="编号" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
              <TextField fullWidth label="项目名称 *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="客户" value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
              <TextField fullWidth label="产品" value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth><InputLabel>当前阶段</InputLabel><Select value={String(formData.phase)} label="当前阶段" onChange={(e) => setFormData({ ...formData, phase: Number(e.target.value) })}>{PHASE_LABELS.map((label, idx) => <MenuItem key={idx} value={String(idx + 1)}>P{idx + 1} {label}</MenuItem>)}</Select></FormControl>
              <FormControl fullWidth><InputLabel>风险等级</InputLabel><Select value={formData.riskLevel} label="风险等级" onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as any })}><MenuItem value="high">高风险</MenuItem><MenuItem value="medium">中风险</MenuItem><MenuItem value="low">低风险</MenuItem></Select></FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="负责人" value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} />
              <TextField fullWidth type="number" label="进度 (%)" value={String(formData.progress)} onChange={(e) => setFormData({ ...formData, progress: Math.min(100, Math.max(0, Number(e.target.value))) })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth type="date" label="开始日期" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              <TextField fullWidth type="date" label="目标日期" value={formData.targetDate} onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })} />
            </Box>
            <TextField fullWidth label="描述" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions><Button variant="outlined" onClick={() => setDialogOpen(false)}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>APQP项目详情 - {selectedItem?.code}</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>项目进度</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress variant="determinate" value={selectedItem.progress} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedItem.progress}%</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>编号</Typography><Typography sx={{ fontWeight: 500 }}>{selectedItem.code}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>状态</Typography>{getStatusChip(selectedItem.status)}</Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>客户</Typography><Typography>{selectedItem.customer}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>产品</Typography><Typography>{selectedItem.product}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>当前阶段</Typography><Typography>{selectedItem.phaseLabel}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>风险等级</Typography>{getRiskChip(selectedItem.riskLevel)}</Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>负责人</Typography><Typography>{selectedItem.owner}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>目标日期</Typography><Typography>{selectedItem.targetDate}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>描述</Typography><Typography>{selectedItem.description}</Typography></Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialogOpen(false)}>关闭</Button></DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsApqpPage;
ENDOFFILE
echo "[CREATED] pages/qms/QmsApqpPage.tsx (upgraded to ListPageTemplate)"

# ======== 2.5 PDM Change Workflow Page ========
cat > "${PAGES_DIR}/pdm/PdmChangeWorkflowPage.tsx" << 'ENDOFFILE'
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, Stack, Stepper, Step, StepLabel,
} from '@mui/material';
import { Plus, Eye, Edit, Delete, Search, GitBranch, Clock, CheckCircle, AlertTriangle, User, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

type EcnStatus = 'draft' | 'review' | 'approved' | 'implementing' | 'completed' | 'rejected';

interface EcnItem {
  id: string;
  ecnNo: string;
  title: string;
  type: 'ECN' | 'ECO';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: EcnStatus;
  applicant: string;
  applyDate: string;
  affectedBom: string;
  affectedPart: string;
  reason: string;
  impact: string;
  currentStep: string;
  description: string;
}

const initialData: EcnItem[] = [
  { id: '1', ecnNo: 'ECN-2025-001', title: '电机座铸件材料变更', type: 'ECN', priority: 'high', status: 'review', applicant: '张工', applyDate: '2025-04-15', affectedBom: 'ASM-MOT-001', affectedPart: 'P-MOT-BKT-001', reason: '原供应商停产，需更换替代材料', impact: '影响电机总成装配，需验证强度', currentStep: '技术评审', description: '铸件材料由HT250改为HT300' },
  { id: '2', ecnNo: 'ECO-2025-001', title: 'PCB板工艺参数优化', type: 'ECO', priority: 'normal', status: 'implementing', applicant: '李工', applyDate: '2025-03-20', affectedBom: 'ASM-PCB-010', affectedPart: 'P-PCB-CTRL-010', reason: '提升良率降低返工率', impact: '焊接温度参数变更，需更新SOP', currentStep: '执行变更', description: '优化回流焊温度曲线参数' },
  { id: '3', ecnNo: 'ECN-2025-002', title: '密封圈规格升级', type: 'ECN', priority: 'urgent', status: 'approved', applicant: '王工', applyDate: '2025-05-01', affectedBom: 'ASM-SEAL-005', affectedPart: 'P-SEAL-005', reason: '客户要求升级密封等级', impact: '密封圈尺寸变更，模具需修改', currentStep: '待执行', description: '密封圈由NBR升级为FKM材料' },
  { id: '4', ecnNo: 'ECN-2025-003', title: '外壳颜色变更', type: 'ECN', priority: 'low', status: 'completed', applicant: '赵工', applyDate: '2025-01-10', affectedBom: 'ASM-CASE-001', affectedPart: 'P-CASE-TOP-001', reason: '客户外观需求变更', impact: '喷涂工艺变更', currentStep: '已完成', description: '外壳颜色由灰色改为白色' },
  { id: '5', ecnNo: 'ECO-2025-002', title: '线束走向优化', type: 'ECO', priority: 'normal', status: 'draft', applicant: '陈工', applyDate: '2025-06-01', affectedBom: 'ASM-WIRE-003', affectedPart: 'P-WIRE-HRN-003', reason: '装配线空间优化', impact: '线束长度和走向变更', currentStep: '草稿', description: '优化发动机线束走向以减少干涉' },
  { id: '6', ecnNo: 'ECN-2025-004', title: '传感器型号替换', type: 'ECN', priority: 'high', status: 'rejected', applicant: '孙工', applyDate: '2025-02-25', affectedBom: 'ASM-SEN-002', affectedPart: 'P-SEN-TEMP-002', reason: '原型号停产', impact: '替代型号需验证兼容性', currentStep: '已驳回', description: '温度传感器更换为替代型号' },
  { id: '7', ecnNo: 'ECO-2025-003', title: '装配工时缩减方案', type: 'ECO', priority: 'normal', status: 'review', applicant: '周工', applyDate: '2025-05-20', affectedBom: 'ASM-GEN-100', affectedPart: '多部件', reason: '提升装配效率', impact: '工装夹具变更，操作步骤调整', currentStep: '工程评审', description: '通过优化装配顺序缩短工时' },
];

const PdmChangeWorkflowPage: React.FC = () => {
  const [data, setData] = useState<EcnItem[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EcnItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<EcnItem | null>(null);
  const [formData, setFormData] = useState({ ecnNo: '', title: '', type: 'ECN' as EcnItem['type'], priority: 'normal' as EcnItem['priority'], status: 'draft' as EcnStatus, applicant: '', applyDate: '', affectedBom: '', affectedPart: '', reason: '', impact: '', currentStep: '', description: '' });

  const getStatusChip = (status: EcnStatus) => {
    const map: Record<EcnStatus, { label: string; color: string }> = {
      draft: { label: '草稿', color: 'default' },
      review: { label: '评审中', color: 'warning' },
      approved: { label: '已批准', color: 'info' },
      implementing: { label: '执行中', color: 'info' },
      completed: { label: '已完成', color: 'success' },
      rejected: { label: '已驳回', color: 'error' },
    };
    const info = map[status];
    return <Chip label={info.label} size="small" color={info.color as any} />;
  };

  const getPriorityChip = (priority: EcnItem['priority']) => {
    const map: Record<EcnItem['priority'], { label: string; color: string }> = {
      urgent: { label: '紧急', color: 'error' },
      high: { label: '高', color: 'warning' },
      normal: { label: '普通', color: 'info' },
      low: { label: '低', color: 'default' },
    };
    const info = map[priority];
    return <Chip label={info.label} size="small" color={info.color as any} variant="outlined" />;
  };

  const getStepIndex = (status: EcnStatus) => ({ draft: 0, review: 1, approved: 2, implementing: 3, completed: 4, rejected: 0 }[status] || 0);

  const columns: ColumnDef<EcnItem>[] = [
    { id: 'ecnNo', label: '变更编号' },
    { id: 'title', label: '变更标题' },
    { id: 'type', label: '类型', render: (row) => <Chip label={row.type} size="small" color={row.type === 'ECN' ? 'primary' : 'secondary'} /> },
    { id: 'priority', label: '优先级', render: (row) => getPriorityChip(row.priority) },
    { id: 'status', label: '状态', render: (row) => getStatusChip(row.status) },
    { id: 'applicant', label: '申请人' },
    { id: 'applyDate', label: '申请日期' },
    { id: 'affectedBom', label: '受影响BOM' },
    {
      id: 'actions', label: '操作',
      render: (row) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="查看"><IconButton size="small" onClick={() => { setSelectedItem(row); setDetailDialogOpen(true); }}><Eye style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditingItem(row); setFormData({ ecnNo: row.ecnNo, title: row.title, type: row.type, priority: row.priority, status: row.status, applicant: row.applicant, applyDate: row.applyDate, affectedBom: row.affectedBom, affectedPart: row.affectedPart, reason: row.reason, impact: row.impact, currentStep: row.currentStep, description: row.description }); setDialogOpen(true); }}><Edit style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
          <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setData((prev) => prev.filter((i) => i.id !== row.id))}><Delete style={{ width: 16, height: 16 }} /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredData = useMemo(() => data.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) || item.ecnNo.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  }), [data, searchText, statusFilter, typeFilter]);

  const handleSave = () => {
    if (editingItem) {
      setData((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...formData } : i));
    } else {
      setData((prev) => [...prev, { id: String(Date.now()), ...formData }]);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const stats = useMemo(() => ({
    total: data.length, draft: data.filter((i) => i.status === 'draft').length,
    review: data.filter((i) => i.status === 'review').length,
    implementing: data.filter((i) => i.status === 'implementing').length,
    completed: data.filter((i) => i.status === 'completed').length,
  }), [data]);

  const filters = [
    { id: 'status', label: '状态', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: '草稿', value: 'draft' }, { label: '评审中', value: 'review' }, { label: '已批准', value: 'approved' }, { label: '执行中', value: 'implementing' }, { label: '已完成', value: 'completed' }, { label: '已驳回', value: 'rejected' },
    ], value: statusFilter, onChange: (v: string) => setStatusFilter(v) },
    { id: 'type', label: '类型', type: 'select' as const, options: [
      { label: '全部', value: 'all' }, { label: 'ECN', value: 'ECN' }, { label: 'ECO', value: 'ECO' },
    ], value: typeFilter, onChange: (v: string) => setTypeFilter(v) },
  ];

  const steps = ['变更申请', '评审审批', '已批准', '执行变更', '已完成'];

  return (
    <PageContainer title="变更工作流管理" subtitle="Engineering Change Workflow (ECN/ECO)">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: '变更总数', value: stats.total, icon: <GitBranch style={{ width: 20, height: 20 }} />, bg: 'primary.lighter' },
          { label: '待处理', value: stats.draft + stats.review, icon: <AlertTriangle style={{ width: 20, height: 20 }} />, bg: 'warning.light' },
          { label: '执行中', value: stats.implementing, icon: <Clock style={{ width: 20, height: 20 }} />, bg: 'info.lighter' },
          { label: '已完成', value: stats.completed, icon: <CheckCircle style={{ width: 20, height: 20 }} />, bg: 'success.lighter' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: s.bg, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</Box>
              <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>{s.label}</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{s.value}</Typography></Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <ListPageTemplate<EcnItem>
        title="" columns={columns} data={filteredData} loading={false}
        filters={filters} searchable searchPlaceholder="搜索变更编号或标题..." searchValue={searchText} onSearch={setSearchText}
        actions={[{ label: '发起变更', icon: <Plus style={{ width: 18, height: 18 }} />, onClick: () => { setEditingItem(null); setFormData({ ecnNo: '', title: '', type: 'ECN', priority: 'normal', status: 'draft', applicant: '', applyDate: '', affectedBom: '', affectedPart: '', reason: '', impact: '', currentStep: '草稿', description: '' }); setDialogOpen(true); }, variant: 'contained' }]}
        emptyMessage="暂无变更记录"
      />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingItem ? '编辑变更' : '发起新变更'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="变更编号" value={formData.ecnNo} onChange={(e) => setFormData({ ...formData, ecnNo: e.target.value })} />
              <TextField fullWidth label="变更标题 *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth><InputLabel>变更类型</InputLabel><Select value={formData.type} label="变更类型" onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}><MenuItem value="ECN">ECN - 工程变更通知</MenuItem><MenuItem value="ECO">ECO - 工程变更指令</MenuItem></Select></FormControl>
              <FormControl fullWidth><InputLabel>优先级</InputLabel><Select value={formData.priority} label="优先级" onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}><MenuItem value="urgent">紧急</MenuItem><MenuItem value="high">高</MenuItem><MenuItem value="normal">普通</MenuItem><MenuItem value="low">低</MenuItem></Select></FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="申请人" value={formData.applicant} onChange={(e) => setFormData({ ...formData, applicant: e.target.value })} />
              <TextField fullWidth type="date" label="申请日期" value={formData.applyDate} onChange={(e) => setFormData({ ...formData, applyDate: e.target.value })} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField fullWidth label="受影响BOM" value={formData.affectedBom} onChange={(e) => setFormData({ ...formData, affectedBom: e.target.value })} />
              <TextField fullWidth label="受影响零件" value={formData.affectedPart} onChange={(e) => setFormData({ ...formData, affectedPart: e.target.value })} />
            </Box>
            <TextField fullWidth label="变更原因" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} multiline rows={2} />
            <TextField fullWidth label="影响分析" value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: e.target.value })} multiline rows={2} />
            <TextField fullWidth label="描述" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={3} />
          </Box>
        </DialogContent>
        <DialogActions><Button variant="outlined" onClick={() => setDialogOpen(false)}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>变更详情 - {selectedItem?.ecnNo}</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Stepper activeStep={getStepIndex(selectedItem.status)} alternativeLabel sx={{ mb: 4 }}>{steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>变更编号</Typography><Typography sx={{ fontWeight: 500 }}>{selectedItem.ecnNo}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>状态</Typography>{getStatusChip(selectedItem.status)}</Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>类型</Typography><Chip label={selectedItem.type} size="small" color={selectedItem.type === 'ECN' ? 'primary' : 'secondary'} /></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>优先级</Typography>{getPriorityChip(selectedItem.priority)}</Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>申请人</Typography><Typography>{selectedItem.applicant}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>申请日期</Typography><Typography>{selectedItem.applyDate}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>受影响BOM</Typography><Typography>{selectedItem.affectedBom}</Typography></Box>
                <Box><Typography variant="body2" sx={{ color: 'text.secondary' }}>受影响零件</Typography><Typography>{selectedItem.affectedPart}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>变更原因</Typography><Typography>{selectedItem.reason}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>影响分析</Typography><Typography>{selectedItem.impact}</Typography></Box>
                <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>描述</Typography><Typography>{selectedItem.description}</Typography></Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialogOpen(false)}>关闭</Button></DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PdmChangeWorkflowPage;
ENDOFFILE
echo "[CREATED] pages/pdm/PdmChangeWorkflowPage.tsx"

# ======== 2.6 Docs Help Center Page (docs-specific) ========
cat > "${PAGES_DIR}/docs/HelpCenterPage.tsx" << 'ENDOFFILE'
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, IconButton, Tooltip, Stack,
  TextField, InputAdornment,
} from '@mui/material';
import {
  Search, Book, HelpCircle, FileText, Video, MessageCircle,
  ExternalLink, ChevronRight, ThumbsUp, Eye, Download,
} from 'lucide-react';
import { PageContainer } from '@/components/common';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpful: number;
}

interface GuideItem {
  id: string;
  title: string;
  module: string;
  description: string;
  type: 'article' | 'video' | 'download';
  views: number;
}

const faqData: FaqItem[] = [
  { id: 'faq-1', question: '如何创建新的生产工单？', answer: '进入 MES > 生产工单 > 点击"新增工单"按钮，填写工单基本信息（产品、数量、计划日期），选择工艺路线后提交即可。工单创建后会自动下发到对应产线。', category: 'MES', views: 1256, helpful: 89 },
  { id: 'faq-2', question: '质量不合格品如何处理？', answer: '在 QMS > 不合格品管理 中登记不合格品信息，系统会自动触发CAPA流程。根据严重程度选择处理方式：返工、返修、降级或报废，并记录处理结果。', category: 'QMS', views: 982, helpful: 76 },
  { id: 'faq-3', question: 'BOM变更审批流程是怎样的？', answer: 'PDM > 变更管理 > 发起变更申请（ECN/ECO），填写变更原因和影响分析。提交后进入评审流程：技术评审 -> 工程批准 -> 执行变更 -> 验证关闭。', category: 'PDM', views: 874, helpful: 65 },
  { id: 'faq-4', question: '如何进行来料检验？', answer: '在 WMS > 来料管理 > 选择待检批次，进入 LIMS > 检验任务 > 创建检验任务，录入检验数据。检验合格后系统自动更新库存状态为"可用"。', category: 'LIMS', views: 756, helpful: 58 },
  { id: 'faq-5', question: '员工考勤异常如何处理？', answer: 'HRM > 考勤管理 > 异常记录 中查看异常详情，支持补签、调休、加班申请等操作。提交后由主管审批。', category: 'HRM', views: 634, helpful: 42 },
  { id: 'faq-6', question: '如何配置权限角色？', answer: '系统管理 > IAM > 角色管理 中创建角色，分配功能权限和数据权限。将角色分配给用户或部门。权限变更即时生效。', category: '系统', views: 543, helpful: 71 },
  { id: 'faq-7', question: '报表如何导出和定时推送？', answer: '在报表页面点击"导出"按钮选择格式（Excel/PDF）。定时推送：报表管理 > 订阅管理 > 新建订阅，设置推送频率和接收人。', category: '报表', views: 478, helpful: 55 },
  { id: 'faq-8', question: '隐患上报流程是怎样的？', answer: 'EHS > 隐患管理 > 上报隐患，填写隐患信息（等级、类别、位置）。提交后进入整改流程：整改 -> 验收 -> 闭环。全程可追踪。', category: 'EHS', views: 412, helpful: 38 },
];

const guideData: GuideItem[] = [
  { id: 'guide-1', title: 'TOPEMS 快速入门指南', module: '通用', description: '系统概述、登录配置、基本操作流程', type: 'article', views: 3456 },
  { id: 'guide-2', title: 'MES 生产管理模块操作手册', module: 'MES', description: '工单管理、产线监控、生产记录、WIP管理', type: 'article', views: 2890 },
  { id: 'guide-3', title: 'QMS 质量管理体系培训视频', module: 'QMS', description: '不合格品、CAPA、SPC、FMEA 等功能培训', type: 'video', views: 2156 },
  { id: 'guide-4', title: 'WMS 仓储管理操作指南', module: 'WMS', description: '入库出库、库存盘点、库位管理、条码管理', type: 'article', views: 1876 },
  { id: 'guide-5', title: 'PDM 产品数据管理使用教程', module: 'PDM', description: 'BOM管理、版本控制、变更流程、文档管理', type: 'article', views: 1654 },
  { id: 'guide-6', title: 'SCM 供应链管理培训视频', module: 'SCM', description: '采购管理、供应商评估、MRP 计划', type: 'video', views: 1432 },
  { id: 'guide-7', title: '系统管理员配置手册', module: '系统', description: '用户管理、角色权限、租户配置、插件管理', type: 'download', views: 1298 },
  { id: 'guide-8', title: 'EHS 环境健康安全管理指南', module: 'EHS', description: '隐患管理、职业健康、环保合规、应急演练', type: 'article', views: 1156 },
  { id: 'guide-9', title: 'HRM 人力资源管理操作手册', module: 'HRM', description: '员工管理、考勤、薪资、绩效、培训', type: 'download', views: 987 },
  { id: 'guide-10', title: 'BI 数据分析平台使用指南', module: 'BI', description: '仪表盘配置、报表设计、数据源管理', type: 'article', views: 876 },
];

const moduleCategories = ['全部', 'MES', 'QMS', 'WMS', 'PDM', 'SCM', 'EHS', 'HRM', 'LIMS', 'BI', '系统'];

const HelpCenterPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [moduleFilter, setModuleFilter] = useState('全部');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'faq' | 'guide'>('faq');

  const filteredFaq = useMemo(() => faqData.filter((item) => {
    const matchSearch = !searchText || item.question.toLowerCase().includes(searchText.toLowerCase()) || item.answer.toLowerCase().includes(searchText.toLowerCase());
    const matchModule = moduleFilter === '全部' || item.category === moduleFilter;
    return matchSearch && matchModule;
  }), [searchText, moduleFilter]);

  const filteredGuide = useMemo(() => guideData.filter((item) => {
    const matchSearch = !searchText || item.title.toLowerCase().includes(searchText.toLowerCase());
    const matchModule = moduleFilter === '全部' || item.module === moduleFilter;
    return matchSearch && matchModule;
  }), [searchText, moduleFilter]);

  const getGuideTypeIcon = (type: GuideItem['type']) => {
    switch (type) {
      case 'article': return <Book style={{ width: 20, height: 20 }} color="primary" />;
      case 'video': return <Video style={{ width: 20, height: 20 }} color="error" />;
      case 'download': return <Download style={{ width: 20, height: 20 }} color="success" />;
    }
  };

  const getGuideTypeLabel = (type: GuideItem['type']) => {
    const labels: Record<GuideItem['type'], string> = { article: '文档', video: '视频', download: '下载' };
    return labels[type];
  };

  return (
    <PageContainer title="帮助中心" subtitle="Help Center - 操作指南与常见问题">
      {/* 搜索栏 */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="搜索问题或操作指南..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search style={{ width: 20, height: 20, color: 'text.secondary' }} /></InputAdornment>,
          }}
          sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* 模块筛选 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {moduleCategories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            onClick={() => setModuleFilter(cat)}
            variant={moduleFilter === cat ? 'filled' : 'outlined'}
            color={moduleFilter === cat ? 'primary' : 'default'}
          />
        ))}
      </Box>

      {/* Tab 切换 */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip label={`常见问题 (${filteredFaq.length})`} onClick={() => setActiveTab('faq')} variant={activeTab === 'faq' ? 'filled' : 'outlined'} color={activeTab === 'faq' ? 'primary' : 'default'} icon={<HelpCircle style={{ width: 16, height: 16 }} />} />
        <Chip label={`操作指南 (${filteredGuide.length})`} onClick={() => setActiveTab('guide')} variant={activeTab === 'guide' ? 'filled' : 'outlined'} color={activeTab === 'guide' ? 'primary' : 'default'} icon={<Book style={{ width: 16, height: 16 }} />} />
      </Box>

      {/* FAQ 列表 */}
      {activeTab === 'faq' && (
        <Stack spacing={2}>
          {filteredFaq.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}><Typography sx={{ color: 'text.secondary' }}>没有找到匹配的问题</Typography></Box>
          )}
          {filteredFaq.map((faq) => (
            <Card key={faq.id} variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
              <CardContent sx={{ p: 2 }}>
                <Box onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <HelpCircle style={{ width: 18, height: 18, color: 'primary.main', flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 500, flex: 1 }}>{faq.question}</Typography>
                    <Chip label={faq.category} size="small" variant="outlined" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}><Eye style={{ width: 12, height: 12, display: 'inline', mr: 0.5 }} />{faq.views}</Typography>
                    <ChevronRight style={{ width: 16, height: 16, transform: expandedFaq === faq.id ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                  </Box>
                </Box>
                {expandedFaq === faq.id && (
                  <Box sx={{ mt: 2, pl: 5 }}>
                    <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{faq.answer}</Typography>
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip icon={<ThumbsUp style={{ width: 14, height: 14 }} />} label={`${faq.helpful} 人觉得有帮助`} size="small" variant="outlined" />
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 操作指南列表 */}
      {activeTab === 'guide' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          {filteredGuide.length === 0 && (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8 }}><Typography sx={{ color: 'text.secondary' }}>没有找到匹配的指南</Typography></Box>
          )}
          {filteredGuide.map((guide) => (
            <Card key={guide.id} variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', transition: '0.2s' } }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, bgcolor: 'primary.lighter', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getGuideTypeIcon(guide.type)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>{guide.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={guide.module} size="small" variant="outlined" />
                      <Chip label={getGuideTypeLabel(guide.type)} size="small" color="primary" variant="filled" />
                    </Box>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 1.5 }}>{guide.description}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}><Eye style={{ width: 12, height: 12, display: 'inline', mr: 0.5 }} />{guide.views} 次浏览</Typography>
                  <Button size="small" endIcon={<ExternalLink style={{ width: 14, height: 14 }} />}>查看</Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </PageContainer>
  );
};

export default HelpCenterPage;
ENDOFFILE
echo "[CREATED] pages/docs/HelpCenterPage.tsx (docs-specific)"

# ---------------------------------------------------------------------------
# 3. Register routes via Python (idempotent)
# ---------------------------------------------------------------------------
python3 << 'PYEOF'
import os, re

ROUTES_DIR = "/Users/air/TOPEMS/apps/web/src/routes"
BACKUP_SUFFIX = ".bak.phase6-a"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def has_lazy_import(content, page_name):
    """Check if a lazy import for the given page already exists."""
    return bool(re.search(rf"lazy\s*\(\s*\(\)\s*=>\s*import\s*\([^)]*\b{page_name}\b[^)]*\)", content))

def has_route_entry(content, path_str):
    """Check if a route entry with given path already exists."""
    return bool(re.search(rf"path:\s*['\"]({re.escape(path_str)})['\"]", content))

def add_lazy_import(content, import_line):
    """Add a lazy import after the last lazy() import line."""
    # Find the last lazy import pattern
    pattern = r"(const\s+\w+\s*=\s*lazy\([^)]+\);\n)"
    matches = list(re.finditer(pattern, content))
    if not matches:
        print(f"  [WARN] No lazy imports found, appending at end")
        return content.rstrip() + '\n' + import_line + '\n'
    last_match = matches[-1]
    insert_pos = last_match.end()
    return content[:insert_pos] + import_line + '\n' + content[insert_pos:]

def add_route_entry(content, route_entry):
    """Add a route entry before the closing '];' of the export array."""
    pattern = r"(\];\s*\n\s*$)"
    match = re.search(pattern, content)
    if not match:
        print(f"  [WARN] No closing ]; found, appending at end")
        return content.rstrip() + '\n' + route_entry + '\n];\n'
    insert_pos = match.start()
    return content[:insert_pos] + route_entry + '\n' + content[insert_pos:]

# ===== professional.ts =====
print("\n--- Registering professional.ts routes ---")
prof_path = os.path.join(ROUTES_DIR, "professional.ts")
prof = read_file(prof_path)

# EhsCompliancePage
if not has_lazy_import(prof, 'EhsCompliancePage'):
    prof = add_lazy_import(prof, "const EhsCompliancePage = lazy(() => import('../pages/ehs/EhsCompliancePage'));")
    print("  [ADD] EhsCompliancePage lazy import")
else:
    print("  [SKIP] EhsCompliancePage lazy import already exists")

if not has_route_entry(prof, '/ehs/compliance-new'):
    entry = "  {\n    path: '/ehs/compliance-new',\n    element: EhsCompliancePage,\n    requiredPermissions: ['ehs:read'],\n    module: 'ehs',\n    action: 'read',\n  },"
    prof = add_route_entry(prof, entry)
    print("  [ADD] /ehs/compliance-new route")
else:
    print("  [SKIP] /ehs/compliance-new route already exists")

# EhsHealthManagementPage
if not has_lazy_import(prof, 'EhsHealthManagementPage'):
    prof = add_lazy_import(prof, "const EhsHealthManagementPage = lazy(() => import('../pages/ehs/EhsHealthManagementPage'));")
    print("  [ADD] EhsHealthManagementPage lazy import")
else:
    print("  [SKIP] EhsHealthManagementPage lazy import already exists")

if not has_route_entry(prof, '/ehs/health-new'):
    entry = "  {\n    path: '/ehs/health-new',\n    element: EhsHealthManagementPage,\n    requiredPermissions: ['ehs:read'],\n    module: 'ehs',\n    action: 'read',\n  },"
    prof = add_route_entry(prof, entry)
    print("  [ADD] /ehs/health-new route")
else:
    print("  [SKIP] /ehs/health-new route already exists")

# QmsCorrectiveActionPage
if not has_lazy_import(prof, 'QmsCorrectiveActionPage'):
    prof = add_lazy_import(prof, "const QmsCorrectiveActionPage = lazy(() => import('../pages/qms/QmsCorrectiveActionPage'));")
    print("  [ADD] QmsCorrectiveActionPage lazy import")
else:
    print("  [SKIP] QmsCorrectiveActionPage lazy import already exists")

if not has_route_entry(prof, '/qms/capa'):
    entry = "  {\n    path: '/qms/capa',\n    element: QmsCorrectiveActionPage,\n    requiredPermissions: ['qms:read'],\n    module: 'qms',\n    action: 'read',\n  },"
    prof = add_route_entry(prof, entry)
    print("  [ADD] /qms/capa route")
else:
    print("  [SKIP] /qms/capa route already exists")

# QmsApqpPage already has lazy import and route, skip
if has_lazy_import(prof, 'QmsApqpPage') and has_route_entry(prof, '/qms/apqp'):
    print("  [SKIP] QmsApqpPage already registered (import + route)")
else:
    print("  [INFO] QmsApqpPage import/route needs attention")

write_file(prof_path, prof)

# ===== pdm.ts =====
print("\n--- Registering pdm.ts routes ---")
pdm_path = os.path.join(ROUTES_DIR, "pdm.ts")
pdm = read_file(pdm_path)

if not has_lazy_import(pdm, 'PdmChangeWorkflowPage'):
    pdm = add_lazy_import(pdm, "const PdmChangeWorkflowPage = lazy(() => import('../pages/pdm/PdmChangeWorkflowPage'));")
    print("  [ADD] PdmChangeWorkflowPage lazy import")
else:
    print("  [SKIP] PdmChangeWorkflowPage lazy import already exists")

if not has_route_entry(pdm, '/pdm/change-workflow'):
    entry = "  {\n    path: '/pdm/change-workflow',\n    element: PdmChangeWorkflowPage,\n    requiredPermissions: ['pdm:read'],\n    module: 'pdm',\n    action: 'read',\n  },"
    pdm = add_route_entry(pdm, entry)
    print("  [ADD] /pdm/change-workflow route")
else:
    print("  [SKIP] /pdm/change-workflow route already exists")

write_file(pdm_path, pdm)

# ===== docs.ts =====
print("\n--- Registering docs.ts routes ---")
docs_path = os.path.join(ROUTES_DIR, "docs.ts")
docs = read_file(docs_path)

if not has_lazy_import(docs, 'HelpCenterPage'):
    # Note: docs.ts already imports HelpCenterPage from shared; add docs-specific alias
    docs = add_lazy_import(docs, "const DocsHelpCenterPage = lazy(() => import('../pages/docs/HelpCenterPage'));")
    print("  [ADD] DocsHelpCenterPage lazy import")
else:
    print("  [SKIP] DocsHelpCenterPage lazy import already exists")

if not has_route_entry(docs, '/docs/help'):
    entry = "  {\n    path: '/docs/help',\n    element: DocsHelpCenterPage,\n    requiredPermissions: [],\n    module: 'doc',\n    action: 'read',\n  },"
    docs = add_route_entry(docs, entry)
    print("  [ADD] /docs/help route")
else:
    print("  [SKIP] /docs/help route already exists")

write_file(docs_path, docs)

print("\nRoute registration complete.")
PYEOF

echo ""
echo "=== Phase 6-A Missing Pages: DONE ==="
echo "Created pages:"
echo "  1. pages/ehs/EhsCompliancePage.tsx"
echo "  2. pages/ehs/EhsHealthManagementPage.tsx"
echo "  3. pages/qms/QmsCorrectiveActionPage.tsx"
echo "  4. pages/qms/QmsApqpPage.tsx (upgraded)"
echo "  5. pages/pdm/PdmChangeWorkflowPage.tsx"
echo "  6. pages/docs/HelpCenterPage.tsx (docs-specific)"
echo ""
echo "Registered routes:"
echo "  - /ehs/compliance-new -> EhsCompliancePage (professional.ts)"
echo "  - /ehs/health-new -> EhsHealthManagementPage (professional.ts)"
echo "  - /qms/capa -> QmsCorrectiveActionPage (professional.ts)"
echo "  - /pdm/change-workflow -> PdmChangeWorkflowPage (pdm.ts)"
echo "  - /docs/help -> DocsHelpCenterPage (docs.ts)"
echo ""
echo "Backups: *.bak.phase6-a"
