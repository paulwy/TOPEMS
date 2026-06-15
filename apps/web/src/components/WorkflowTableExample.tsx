import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { DataTable } from "@/components/DataTable";
import { flowApi, type Workflow } from "../api/flow";

export function WorkflowTableExample() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null,
  );

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await flowApi.workflows.list();
      if (response.success && response.data) {
        setData(response.data.items || []);
      } else {
        setError(response.message || "加载工作流失败");
      }
    } catch (err: any) {
      console.error("加载工作流失败:", err);
      setError("加载工作流失败: " + (err.message || "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    workflow: Workflow,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkflow(workflow);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkflow(null);
  };

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        accessorKey: "id",
        header: () => <Box sx={{ textAlign: "left" }}>ID</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: "left", fontWeight: 500 }}>
            {row.getValue("id")}
          </Box>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="text"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              sx={{ p: 0, height: "auto", color: "text.primary" }}
            >
              工作流名称
              <ArrowUpDown style={{ width: 14, height: 14, marginLeft: 8 }} />
            </Button>
          );
        },
        cell: ({ row }) => (
          <Box sx={{ textAlign: "left" }}>{row.getValue("name")}</Box>
        ),
      },
      {
        accessorKey: "description",
        header: () => <Box sx={{ textAlign: "left" }}>描述</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: "left" }}>{row.getValue("description")}</Box>
        ),
      },
      {
        accessorKey: "is_active",
        header: () => <Box sx={{ textAlign: "left" }}>状态</Box>,
        cell: ({ row }) => {
          const isActive = row.getValue("is_active") as boolean;
          return (
            <Box sx={{ textAlign: "left" }}>
              <Chip
                size="small"
                label={isActive ? "启用" : "禁用"}
                sx={{
                  backgroundColor: isActive ? "#e8f5e9" : "#f5f5f5",
                  color: isActive ? "#2e7d32" : "#616161",
                }}
              />
            </Box>
          );
        },
      },
      {
        accessorKey: "created_by",
        header: () => <Box sx={{ textAlign: "left" }}>创建者</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: "left" }}>
            {row.getValue("created_by") || "-"}
          </Box>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => <Box sx={{ textAlign: "left" }}>创建时间</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: "left" }}>{row.getValue("created_at")}</Box>
        ),
      },
      {
        accessorKey: "updated_at",
        header: () => <Box sx={{ textAlign: "left" }}>更新时间</Box>,
        cell: ({ row }) => (
          <Box sx={{ textAlign: "left" }}>{row.getValue("updated_at")}</Box>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const workflow = row.original;

          return (
            <Box sx={{ textAlign: "right" }}>
              <Button
                variant="text"
                size="small"
                onClick={(e) => handleMenuOpen(e, workflow)}
                sx={{ minWidth: 32, width: 32, height: 32, p: 0 }}
              >
                <MoreHorizontal style={{ width: 18, height: 18 }} />
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
              >
                <MenuItem disabled sx={{ fontWeight: 600 }}>
                  操作
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    console.log("查看工作流:", workflow.id);
                    handleMenuClose();
                  }}
                >
                  查看
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    console.log("编辑工作流:", workflow.id);
                    handleMenuClose();
                  }}
                >
                  编辑
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    console.log("查看历史:", workflow.id);
                    handleMenuClose();
                  }}
                >
                  版本历史
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    console.log("删除工作流:", workflow.id);
                    handleMenuClose();
                  }}
                  sx={{ color: "error.main" }}
                >
                  删除
                </MenuItem>
              </Menu>
            </Box>
          );
        },
      },
    ],
    [anchorEl],
  );

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          工作流列表
        </Typography>
        <Box
          sx={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 1,
            p: 2,
            color: "#dc2626",
          }}
        >
          {error}
          <Button variant="outlined" onClick={loadWorkflows} sx={{ ml: 2 }}>
            重试
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        工作流列表
      </Typography>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKey="name"
        searchPlaceholder="搜索工作流..."
        onRowClick={(workflow) => {
          console.log("点击工作流:", workflow);
        }}
      />
    </Box>
  );
}
