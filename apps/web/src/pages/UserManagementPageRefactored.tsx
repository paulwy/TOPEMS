/**
 * UserManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 使用 mock 数据
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  IconButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Key,
  Search,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef, type RowAction } from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ Mock 数据 ============
const mockUsers = [
  {
    id: "1",
    username: "admin",
    full_name: "系统管理员",
    email: "admin@example.com",
    phone: "13800138000",
    role: "管理员",
    department: "技术部",
    status: "active",
    lastLogin: "2024-01-15 10:30:00",
  },
  {
    id: "2",
    username: "zhangsan",
    full_name: "张三",
    email: "zhangsan@example.com",
    phone: "13800138001",
    role: "普通用户",
    department: "销售部",
    status: "active",
    lastLogin: "2024-01-15 09:15:00",
  },
  {
    id: "3",
    username: "lisi",
    full_name: "李四",
    email: "lisi@example.com",
    phone: "13800138002",
    role: "普通用户",
    department: "技术部",
    status: "inactive",
    lastLogin: "2024-01-14 16:45:00",
  },
  {
    id: "4",
    username: "wangwu",
    full_name: "王五",
    email: "wangwu@example.com",
    phone: "13800138003",
    role: "管理员",
    department: "财务部",
    status: "active",
    lastLogin: "2024-01-14 14:20:00",
  },
  {
    id: "5",
    username: "zhaoliu",
    full_name: "赵六",
    email: "zhaoliu@example.com",
    phone: "13800138004",
    role: "普通用户",
    department: "人事部",
    status: "active",
    lastLogin: "2024-01-13 11:00:00",
  },
];

const mockRoles = ["管理员", "普通用户", "访客"];
const mockDepartments = ["技术部", "销售部", "财务部", "人事部", "市场部"];

// ============ 类型定义 ============
interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: string;
  lastLogin: string;
}

// ============ 状态徽章 ============
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status === "active";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {isActive ? (
        <CheckCircle style={{ width: 16, height: 16, color: "#22c55e" }} />
      ) : (
        <XCircle style={{ width: 16, height: 16, color: "#ef4444" }} />
      )}
      <Typography
        variant="body2"
        sx={{ color: isActive ? "success.main" : "error.main" }}
      >
        {isActive ? "启用" : "禁用"}
      </Typography>
    </Box>
  );
};

// ============ 角色徽章 ============
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const colors: Record<string, "primary" | "secondary" | "error" | "warning" | "info"> = {
    管理员: "error",
    普通用户: "info",
    访客: "default",
  };
  return (
    <Chip
      size="small"
      label={role}
      color={colors[role] || "default"}
      variant="outlined"
    />
  );
};

// ============ 主组件 ============
export default function UserManagementPageRefactored() {
  const navigate = useNavigate();

  // 状态
  const [users] = useState<User[]>(mockUsers);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 筛选器配置
  const filters: FilterConfig[] = [
    {
      id: "department",
      label: "部门",
      type: "select",
      options: mockDepartments.map((d) => ({ label: d, value: d })),
    },
    {
      id: "role",
      label: "角色",
      type: "select",
      options: mockRoles.map((r) => ({ label: r, value: r })),
    },
    {
      id: "status",
      label: "状态",
      type: "select",
      options: [
        { label: "启用", value: "active" },
        { label: "禁用", value: "inactive" },
      ],
    },
  ];

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return users.filter((user) => {
      if (
        searchValue &&
        !user.username.toLowerCase().includes(searchValue.toLowerCase()) &&
        !user.full_name.toLowerCase().includes(searchValue.toLowerCase()) &&
        !user.email.toLowerCase().includes(searchValue.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [users, searchValue]);

  // 表格列定义
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: "username",
        label: "用户信息",
        minWidth: 200,
        render: (row: User) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#3b82f6",
                color: "white",
                fontSize: "0.875rem",
              }}
            >
              {row.full_name?.charAt(0) || row.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.full_name || row.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.email}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: "phone",
        label: "手机",
        minWidth: 130,
        render: (row: User) => (
          <Typography variant="body2">{row.phone || "-"}</Typography>
        ),
      },
      {
        id: "role",
        label: "角色",
        minWidth: 100,
        render: (row: User) => <RoleBadge role={row.role} />,
      },
      {
        id: "department",
        label: "部门",
        minWidth: 100,
        render: (row: User) => (
          <Typography variant="body2">{row.department || "-"}</Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        minWidth: 100,
        render: (row: User) => <StatusBadge status={row.status} />,
      },
      {
        id: "lastLogin",
        label: "最后登录",
        minWidth: 180,
        render: (row: User) => (
          <Typography variant="body2" color="text.secondary">
            {row.lastLogin || "-"}
          </Typography>
        ),
      },
    ],
    [],
  );

  // 行操作定义
  const rowActions: RowAction<User>[] = useMemo(
    () => [
      {
        label: "编辑",
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: (row: User) => {
          setSelectedUser(row);
          setShowEditModal(true);
        },
        color: "primary",
      },
      {
        label: "配置角色",
        icon: <Shield style={{ width: 16, height: 16 }} />,
        onClick: (row: User) => {
          setSelectedUser(row);
          setShowRolesModal(true);
        },
      },
      {
        label: "重置密码",
        icon: <Key style={{ width: 16, height: 16 }} />,
        onClick: (row: User) => {
          console.log("重置密码:", row.username);
        },
      },
      {
        label: "禁用",
        icon: <XCircle style={{ width: 16, height: 16 }} />,
        onClick: (row: User) => {
          console.log("禁用用户:", row.username);
        },
        color: "error",
        show: (row: User) => row.status === "active",
      },
      {
        label: "启用",
        icon: <CheckCircle style={{ width: 16, height: 16 }} />,
        onClick: (row: User) => {
          console.log("启用用户:", row.username);
        },
        color: "success",
        show: (row: User) => row.status === "inactive",
      },
      {
        label: "删除",
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row: User) => {
          console.log("删除用户:", row.username);
        },
        color: "error",
        divider: true,
      },
    ],
    [],
  );

  // 分页配置
  const pagination = {
    page: 0,
    pageSize: 10,
    total: filteredData.length,
    onPageChange: (page: number) => console.log("页码:", page),
    onPageSizeChange: (pageSize: number) => console.log("每页:", pageSize),
  };

  // 刷新数据
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <PageHeader
          title="用户管理"
          subtitle="管理系统用户账户、角色和权限"
          backButton={{
            href: "/dashboard",
            tooltip: "返回首页",
          }}
          searchBox={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: "搜索用户名、姓名、邮箱...",
          }}
          createButton={{
            label: "新建用户",
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* 筛选栏 */}
        <FilterBar
          filters={filters}
          onSearch={handleRefresh}
          onReset={() => console.log("重置筛选")}
        />

        {/* 用户列表 */}
        <ListPageTemplate
          title="用户列表"
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          rowActions={rowActions}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowId={(row) => row.id}
          emptyMessage="暂无用户数据"
          actions={[
            {
              label: "刷新",
              icon: <RefreshCw style={{ width: 16, height: 16 }} />,
              onClick: handleRefresh,
              variant: "outlined",
            },
          ]}
        />
      </Box>

      {/* 创建用户对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <UserPlus style={{ width: 20, height: 20, color: "#3b82f6" }} />
            创建新用户
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="用户名 *" fullWidth size="small" required />
            <TextField label="姓名" fullWidth size="small" />
            <TextField label="邮箱 *" type="email" fullWidth size="small" required />
            <TextField label="手机" fullWidth size="small" />
            <TextField label="密码 *" type="password" fullWidth size="small" required />
            <TextField
              label="部门"
              fullWidth
              size="small"
              select
              slotProps={{
                select: { children: mockDepartments.map((d) => <option key={d} value={d}>{d}</option>) },
              }}
            />
            <TextField
              label="角色"
              fullWidth
              size="small"
              select
              slotProps={{
                select: { children: mockRoles.map((r) => <option key={r} value={r}>{r}</option>) },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={() => setShowCreateModal(false)}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Edit style={{ width: 20, height: 20, color: "#3b82f6" }} />
            编辑用户
          </Box>
        </DialogTitle>
        {selectedUser && (
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label="用户名"
                value={selectedUser.username}
                fullWidth
                size="small"
                disabled
              />
              <TextField
                label="姓名"
                value={selectedUser.full_name}
                fullWidth
                size="small"
              />
              <TextField
                label="邮箱"
                value={selectedUser.email}
                fullWidth
                size="small"
              />
              <TextField
                label="手机"
                value={selectedUser.phone}
                fullWidth
                size="small"
              />
              <FormControlLabel
                control={<Checkbox checked={selectedUser.status === "active"} />}
                label="启用账户"
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={() => setShowEditModal(false)}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 角色配置对话框 */}
      <Dialog
        open={showRolesModal}
        onClose={() => setShowRolesModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Shield style={{ width: 20, height: 20, color: "#3b82f6" }} />
            配置用户角色 - {selectedUser?.full_name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              选择角色
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {mockRoles.map((role) => (
                <FormControlLabel
                  key={role}
                  control={
                    <Checkbox
                      checked={selectedUser?.role === role}
                    />
                  }
                  label={role}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRolesModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
