/**
 * PermissionManagementPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. 布局改为左侧角色树、右侧权限列表
 * 6. 主题色：蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Key,
  Search,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Users,
  FolderTree,
} from "lucide-react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 类型定义 ============
interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  children?: Role[];
}

// ============ Mock 数据 ============
const mockPermissions: Permission[] = [
  { id: "1", name: "文档读取", code: "doc:read", category: "doc", description: "查看文档内容" },
  { id: "2", name: "文档写入", code: "doc:write", category: "doc", description: "创建和编辑文档" },
  { id: "3", name: "AI 聊天", code: "ai:chat", category: "ai", description: "使用 AI 聊天功能" },
  { id: "4", name: "流程审批", code: "workflow:approve", category: "workflow", description: "审批流程申请" },
  { id: "5", name: "用户管理", code: "iam:user", category: "iam", description: "管理系统用户" },
  { id: "6", name: "角色管理", code: "iam:role", category: "iam", description: "管理系统角色" },
  { id: "7", name: "研发项目查看", code: "rs:project:view", category: "rs", description: "查看研发项目" },
  { id: "8", name: "样本管理", code: "lims:sample", category: "lims", description: "管理实验样本" },
  { id: "9", name: "质量检查", code: "qms:inspect", category: "qms", description: "执行质量检查" },
  { id: "10", name: "安全隐患查看", code: "ehs:hazard:view", category: "ehs", description: "查看安全隐患" },
  { id: "11", name: "供应商管理", code: "srm:supplier", category: "srm", description: "管理供应商信息" },
  { id: "12", name: "产品数据管理", code: "pdm:product", category: "pdm", description: "管理产品数据" },
];

const mockRoles: Role[] = [
  {
    id: "r1",
    name: "系统管理员",
    code: "admin",
    description: "拥有系统所有权限",
    children: [
      { id: "r1-1", name: "超级管理员", code: "super_admin", description: "最高权限" },
    ],
  },
  {
    id: "r2",
    name: "项目管理员",
    code: "pm_admin",
    description: "项目管理权限",
  },
  {
    id: "r3",
    name: "普通用户",
    code: "user",
    description: "基础用户权限",
  },
  {
    id: "r4",
    name: "访客",
    code: "guest",
    description: "只读访问权限",
  },
];

// ============ 辅助函数 ============
const getCategoryBadge = (category: string) => {
  const badges: Record<string, { bgcolor: string; color: string; label: string }> = {
    doc: { bgcolor: "blue.100", color: "blue.700", label: "文档" },
    ai: { bgcolor: "purple.100", color: "purple.700", label: "AI" },
    workflow: { bgcolor: "green.100", color: "green.700", label: "流程" },
    iam: { bgcolor: "yellow.100", color: "yellow.700", label: "IAM" },
    rs: { bgcolor: "orange.100", color: "orange.700", label: "研发" },
    lims: { bgcolor: "cyan.100", color: "cyan.700", label: "LIMS" },
    qms: { bgcolor: "teal.100", color: "teal.700", label: "质量" },
    ehs: { bgcolor: "red.100", color: "red.700", label: "EHS" },
    srm: { bgcolor: "violet.100", color: "violet.700", label: "采购" },
    pdm: { bgcolor: "amber.100", color: "amber.700", label: "产品" },
    gis: { bgcolor: "emerald.100", color: "emerald.700", label: "GIS" },
    system: { bgcolor: "gray.100", color: "gray.700", label: "系统" },
  };
  const config = badges[category] || { bgcolor: "gray.100", color: "gray.700", label: category };
  return <Chip size="small" sx={{ bgcolor: config.bgcolor, color: config.color }} label={config.label} />;
};

// ============ 列定义 ============
const columns: ColumnDef<Permission>[] = [
  {
    id: "name",
    header: "权限名称",
    accessor: "name",
    render: (_, row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Shield sx={{ width: 16, height: 16, color: "blue.400" }} />
        <Typography sx={{ fontWeight: "medium" }}>{row.name}</Typography>
      </Box>
    ),
  },
  {
    id: "code",
    header: "权限码",
    accessor: "code",
    render: (value) => (
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
        {value}
      </Typography>
    ),
  },
  {
    id: "category",
    header: "分类",
    accessor: "category",
    render: (value) => getCategoryBadge(value),
  },
  {
    id: "description",
    header: "描述",
    accessor: "description",
    render: (value) =>
      value ? (
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.disabled">-</Typography>
      ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onDelete: (permission: Permission) => void,
): RowAction<Permission>[] => [
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索权限名称、权限码或描述...",
  },
  {
    id: "category",
    label: "分类",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "doc", label: "文档" },
      { value: "ai", label: "AI" },
      { value: "workflow", label: "流程" },
      { value: "iam", label: "IAM" },
      { value: "rs", label: "研发" },
      { value: "lims", label: "LIMS" },
      { value: "qms", label: "质量" },
      { value: "ehs", label: "EHS" },
    ],
  },
];

// ============ 角色树组件 ============
interface RoleTreeItemProps {
  role: Role;
  level: number;
  selectedId: string | null;
  onSelect: (role: Role) => void;
}

const RoleTreeItem: React.FC<RoleTreeItemProps> = ({ role, level, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = role.children && role.children.length > 0;

  return (
    <>
      <ListItemButton
        selected={selectedId === role.id}
        onClick={() => {
          onSelect(role);
          if (hasChildren) setExpanded(!expanded);
        }}
        sx={{ pl: level * 2 + 1 }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {hasChildren ? (
            <FolderTree sx={{ width: 16, height: 16, color: "blue.400" }} />
          ) : (
            <Users sx={{ width: 16, height: 16, color: "gray.400" }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={role.name}
          secondary={role.description}
          primaryTypographyProps={{ variant: "body2", fontWeight: selectedId === role.id ? "bold" : "normal" }}
        />
        {hasChildren && (
          <ChevronRight
            sx={{
              width: 16,
              height: 16,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        )}
      </ListItemButton>
      {hasChildren && (
        <Collapse in={expanded}>
          <List disablePadding>
            {role.children!.map((child) => (
              <RoleTreeItem
                key={child.id}
                role={child}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

// ============ 组件 ============
const PermissionManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // 模态框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(mockRoles[0]);

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    description: "",
  });

  // 获取权限列表
  const fetchPermissions = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setPermissions(mockPermissions);
      setLoading(false);
    }, 500);
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return permissions.filter((perm) => {
      const matchesSearch =
        !searchText ||
        perm.name.toLowerCase().includes(searchText.toLowerCase()) ||
        perm.code.toLowerCase().includes(searchText.toLowerCase()) ||
        perm.description?.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = filterCategory === "all" || perm.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [permissions, searchText, filterCategory]);

  // 统计数据
  const stats = useMemo(() => ({
    total: permissions.length,
    categories: [...new Set(permissions.map((p) => p.category))].length,
  }), [permissions]);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    if (filterId === "search") setSearchText(value);
    if (filterId === "category") setFilterCategory(value);
  }, []);

  // 处理删除
  const handleDelete = useCallback((permission: Permission) => {
    if (!window.confirm("确定要删除这个权限吗？")) return;
    setPermissions(permissions.filter((p) => p.id !== permission.id));
  }, [permissions]);

  // 处理创建
  const handleCreate = useCallback(() => {
    const newPermission: Permission = {
      id: Date.now().toString(),
      ...formData,
    };
    setPermissions([...permissions, newPermission]);
    setShowCreateDialog(false);
    resetForm();
  }, [formData, permissions]);

  // 处理角色选择
  const handleRoleSelect = useCallback((role: Role) => {
    setSelectedRole(role);
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category: "",
      description: "",
    });
  };

  return (
    <>
      <PageHeader
        title="权限管理"
        subtitle="查看和管理系统权限配置"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
          >
            创建权限
          </Button>
        }
      />

      {/* 主内容区域：左侧角色树 + 右侧权限列表 */}
      <Box sx={{ display: "flex", gap: 3, minHeight: 600 }}>
        {/* 左侧角色树 */}
        <Card sx={{ width: 280, flexShrink: 0 }}>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FolderTree sx={{ width: 18, height: 18, color: "blue.500" }} />
                <Typography variant="subtitle2">角色列表</Typography>
              </Box>
            }
          />
          <Divider />
          <List disablePadding sx={{ overflow: "auto", maxHeight: 500 }}>
            {mockRoles.map((role) => (
              <RoleTreeItem
                key={role.id}
                role={role}
                level={0}
                selectedId={selectedRole?.id || null}
                onSelect={handleRoleSelect}
              />
            ))}
          </List>
        </Card>

        {/* 右侧权限列表 */}
        <Box sx={{ flex: 1 }}>
          {/* 统计信息 */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            <Card sx={{ bgcolor: "blue.50", border: 1, borderColor: "blue.200" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                <Key sx={{ width: 32, height: 32, color: "blue.600" }} />
                <Box>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>权限总数</Box>
                  <Box sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>{stats.total}</Box>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ bgcolor: "purple.50", border: 1, borderColor: "purple.200" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                <FolderTree sx={{ width: 32, height: 32, color: "purple.600" }} />
                <Box>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>权限分类</Box>
                  <Box sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>{stats.categories}</Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 选中的角色信息 */}
          {selectedRole && (
            <Card sx={{ mb: 3, bgcolor: "gray.50" }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Users sx={{ width: 24, height: 24, color: "blue.500" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {selectedRole.name}
                    </Typography>
                    {selectedRole.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedRole.description}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={selectedRole.code}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: "monospace" }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* 权限列表 */}
          <ListPageTemplate
            columns={columns}
            data={filteredData}
            loading={loading}
            rowActions={getRowActions(handleDelete)}
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={fetchPermissions}
            emptyMessage="暂无权限"
          />
        </Box>
      </Box>

      {/* 提示卡片 */}
      <Card sx={{ bgcolor: "blue.50", border: 1, borderColor: "blue.200" }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AlertCircle sx={{ width: 16, height: 16, color: "blue.700" }} />
            <Typography variant="subtitle2" color="blue.900">
              关于权限管理
            </Typography>
          </Box>
          <Typography variant="body2" color="blue.700" sx={{ mt: 1 }}>
            权限是系统级配置，通常由开发人员在后端代码中预先定义。
            您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
          </Typography>
        </CardContent>
      </Card>

      {/* 创建权限对话框 */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新权限</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">权限名称 *</Typography>
              <TextField
                fullWidth
                size="small"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：文档读取"
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">权限码 *</Typography>
              <TextField
                fullWidth
                size="small"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="例如：doc:read"
                sx={{ mt: 0.5 }}
              />
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>分类 *</InputLabel>
              <Select
                value={formData.category}
                label="分类 *"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value="doc">文档</MenuItem>
                <MenuItem value="ai">AI</MenuItem>
                <MenuItem value="workflow">流程</MenuItem>
                <MenuItem value="iam">IAM</MenuItem>
                <MenuItem value="rs">研发</MenuItem>
                <MenuItem value="lims">LIMS</MenuItem>
                <MenuItem value="qms">质量</MenuItem>
                <MenuItem value="ehs">EHS</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="caption" color="text.secondary">描述</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述这个权限的用途"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowCreateDialog(false); resetForm(); }}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>创建</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PermissionManagementPageRefactored;
