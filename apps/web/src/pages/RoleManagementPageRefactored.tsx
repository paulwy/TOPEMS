/**
 * RoleManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 PageHeader 统一页面头部
 * 4. 使用 mock 数据
 * 5. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useMemo } from "react";
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
  IconButton,
} from "@mui/material";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Key,
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef, type RowAction } from "../components/mui";
import { PageHeader } from "../components/layout";

// ============ Mock 数据 ============
const mockRoles = [
  {
    id: "1",
    name: "系统管理员",
    code: "admin",
    description: "拥有系统所有权限",
    userCount: 5,
    createdAt: "2023-01-01 00:00:00",
  },
  {
    id: "2",
    name: "普通用户",
    code: "user",
    description: "基础功能权限",
    userCount: 120,
    createdAt: "2023-01-15 10:30:00",
  },
  {
    id: "3",
    name: "部门经理",
    code: "manager",
    description: "部门管理权限",
    userCount: 15,
    createdAt: "2023-02-01 09:00:00",
  },
  {
    id: "4",
    name: "财务专员",
    code: "finance",
    description: "财务相关功能权限",
    userCount: 8,
    createdAt: "2023-03-01 14:20:00",
  },
  {
    id: "5",
    name: "审计员",
    code: "auditor",
    description: "审计和查看权限",
    userCount: 3,
    createdAt: "2023-04-01 11:00:00",
  },
];

// ============ 类型定义 ============
interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
  createdAt: string;
}

// ============ 主组件 ============
export default function RoleManagementPageRefactored() {
  const navigate = useNavigate();

  // 状态
  const [roles] = useState<Role[]>(mockRoles);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    if (!searchValue) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        role.code.toLowerCase().includes(searchValue.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [roles, searchValue]);

  // 表格列定义
  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        id: "name",
        label: "角色名称",
        minWidth: 150,
        render: (row: Role) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield style={{ width: 18, height: 18, color: "#3b82f6" }} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.code}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: "description",
        label: "描述",
        minWidth: 200,
        render: (row: Role) => (
          <Typography variant="body2" color="text.secondary">
            {row.description || "-"}
          </Typography>
        ),
      },
      {
        id: "userCount",
        label: "用户数",
        minWidth: 100,
        render: (row: Role) => (
          <Chip
            size="small"
            label={`${row.userCount} 人`}
            variant="outlined"
            icon={<Users style={{ width: 14, height: 14 }} />}
          />
        ),
      },
      {
        id: "createdAt",
        label: "创建时间",
        minWidth: 180,
        render: (row: Role) => (
          <Typography variant="body2" color="text.secondary">
            {row.createdAt}
          </Typography>
        ),
      },
    ],
    [],
  );

  // 行操作定义
  const rowActions: RowAction<Role>[] = useMemo(
    () => [
      {
        label: "编辑",
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: (row: Role) => {
          setSelectedRole(row);
          setShowEditModal(true);
        },
        color: "primary",
      },
      {
        label: "权限配置",
        icon: <Key style={{ width: 16, height: 16 }} />,
        onClick: (row: Role) => {
          setSelectedRole(row);
          setShowPermissionsModal(true);
        },
      },
      {
        label: "删除",
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row: Role) => {
          console.log("删除角色:", row.name);
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
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <PageHeader
          title="角色管理"
          subtitle="管理用户角色和权限配置"
          backButton={{
            href: "/dashboard",
            tooltip: "返回首页",
          }}
          searchBox={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: "搜索角色名称或代码...",
          }}
          createButton={{
            label: "创建角色",
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* 角色列表 */}
        <ListPageTemplate
          title="角色列表"
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          rowActions={rowActions}
          getRowId={(row) => row.id}
          emptyMessage="暂无角色数据"
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

      {/* 创建角色对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Plus style={{ width: 20, height: 20, color: "#3b82f6" }} />
            创建新角色
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="角色名称 *" fullWidth size="small" required />
            <TextField label="角色代码 *" fullWidth size="small" required />
            <TextField
              label="描述"
              fullWidth
              size="small"
              multiline
              rows={3}
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

      {/* 编辑角色对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Edit style={{ width: 20, height: 20, color: "#3b82f6" }} />
            编辑角色
          </Box>
        </DialogTitle>
        {selectedRole && (
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label="角色名称"
                value={selectedRole.name}
                fullWidth
                size="small"
              />
              <TextField
                label="角色代码"
                value={selectedRole.code}
                fullWidth
                size="small"
                disabled
              />
              <TextField
                label="描述"
                value={selectedRole.description}
                fullWidth
                size="small"
                multiline
                rows={3}
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

      {/* 权限配置对话框 */}
      <Dialog
        open={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Key style={{ width: 20, height: 20, color: "#3b82f6" }} />
            权限配置 - {selectedRole?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              选择该角色拥有的权限
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {["用户管理", "角色管理", "权限管理", "系统配置", "审计日志", "字典管理"].map(
                (perm) => (
                  <Box
                    key={perm}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2">{perm}</Typography>
                    <Button size="small" variant="outlined">
                      已拥有
                    </Button>
                  </Box>
                ),
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPermissionsModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
