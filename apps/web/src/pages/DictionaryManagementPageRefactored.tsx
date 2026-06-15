/**
 * DictionaryManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 使用 mock 数据
 * 6. 主题色使用蓝色 (#3b82f6)
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Download,
  Upload,
  ChevronLeft,
  FolderOpen,
  Tag,
  Eye,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef, type RowAction } from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ Mock 数据 ============
const mockDictionaries = [
  {
    id: "1",
    code: "sys_status",
    name: "系统状态",
    type: "system",
    itemCount: 5,
    status: "active",
  },
  {
    id: "2",
    code: "user_gender",
    name: "性别",
    type: "business",
    itemCount: 3,
    status: "active",
  },
  {
    id: "3",
    code: "order_status",
    name: "订单状态",
    type: "business",
    itemCount: 8,
    status: "active",
  },
  {
    id: "4",
    code: "priority",
    name: "优先级",
    type: "basic",
    itemCount: 4,
    status: "active",
  },
  {
    id: "5",
    code: "leave_type",
    name: "请假类型",
    type: "business",
    itemCount: 6,
    status: "inactive",
  },
  {
    id: "6",
    code: "payment_method",
    name: "支付方式",
    type: "business",
    itemCount: 5,
    status: "active",
  },
];

const typeOptions = [
  { value: "all", label: "全部类型" },
  { value: "system", label: "系统字典" },
  { value: "business", label: "业务字典" },
  { value: "basic", label: "基础数据" },
  { value: "custom", label: "自定义" },
];

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "启用" },
  { value: "inactive", label: "禁用" },
];

// ============ 类型定义 ============
interface Dictionary {
  id: string;
  code: string;
  name: string;
  type: string;
  itemCount: number;
  status: "active" | "inactive";
}

// ============ 类型徽章 ============
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { color: "primary" | "secondary" | "warning" | "info"; label: string }> = {
    system: { color: "primary", label: "系统" },
    business: { color: "info", label: "业务" },
    basic: { color: "warning", label: "基础" },
    custom: { color: "secondary", label: "自定义" },
  };
  const { color, label } = config[type] || { color: "default", label: type };
  return (
    <Chip size="small" label={label} color={color} variant="outlined" />
  );
};

// ============ 状态徽章 ============
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status === "active";
  return (
    <Chip
      size="small"
      label={isActive ? "启用" : "禁用"}
      color={isActive ? "success" : "default"}
      variant="filled"
    />
  );
};

// ============ 主组件 ============
export default function DictionaryManagementPageRefactored() {
  const navigate = useNavigate();

  // 状态
  const [dictionaries] = useState<Dictionary[]>(mockDictionaries);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDict, setSelectedDict] = useState<Dictionary | null>(null);

  // 筛选器配置
  const filters: FilterConfig[] = [
    {
      id: "type",
      label: "字典类型",
      type: "select",
      options: typeOptions,
    },
    {
      id: "status",
      label: "状态",
      type: "select",
      options: statusOptions,
    },
  ];

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return dictionaries.filter((dict) => {
      if (
        searchValue &&
        !dict.name.toLowerCase().includes(searchValue.toLowerCase()) &&
        !dict.code.toLowerCase().includes(searchValue.toLowerCase())
      ) {
        return false;
      }
      if (filterType !== "all" && dict.type !== filterType) {
        return false;
      }
      if (filterStatus !== "all" && dict.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [dictionaries, searchValue, filterType, filterStatus]);

  // 表格列定义
  const columns: ColumnDef<Dictionary>[] = useMemo(
    () => [
      {
        id: "code",
        label: "字典编码",
        minWidth: 150,
        render: (row: Dictionary) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tag style={{ width: 16, height: 16, color: "#9ca3af" }} />
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", fontWeight: 500 }}
            >
              {row.code}
            </Typography>
          </Box>
        ),
      },
      {
        id: "name",
        label: "字典名称",
        minWidth: 150,
        render: (row: Dictionary) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
        ),
      },
      {
        id: "type",
        label: "字典类型",
        minWidth: 100,
        render: (row: Dictionary) => <TypeBadge type={row.type} />,
      },
      {
        id: "itemCount",
        label: "字典项数",
        minWidth: 100,
        render: (row: Dictionary) => (
          <Chip
            size="small"
            label={`${row.itemCount} 项`}
            variant="outlined"
          />
        ),
      },
      {
        id: "status",
        label: "状态",
        minWidth: 80,
        render: (row: Dictionary) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  // 行操作定义
  const rowActions: RowAction<Dictionary>[] = useMemo(
    () => [
      {
        label: "查看字典项",
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: (row: Dictionary) => {
          console.log("查看字典项:", row.name);
        },
      },
      {
        label: "编辑",
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: (row: Dictionary) => {
          setSelectedDict(row);
          setShowEditModal(true);
        },
        color: "primary",
      },
      {
        label: "删除",
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row: Dictionary) => {
          console.log("删除字典:", row.name);
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
          title="字典管理"
          subtitle="管理系统字典、业务字典、基础数据字典"
          backButton={{
            href: "/dashboard",
            tooltip: "返回首页",
          }}
          searchBox={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: "搜索字典编码或名称...",
          }}
          createButton={{
            label: "新建字典",
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* 筛选栏 */}
        <FilterBar
          filters={filters}
          onSearch={handleRefresh}
          onReset={() => console.log("重置筛选")}
        />

        {/* 字典列表 */}
        <ListPageTemplate
          title="字典列表"
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          rowActions={rowActions}
          getRowId={(row) => row.id}
          emptyMessage="暂无字典数据"
          actions={[
            {
              label: "导入",
              icon: <Download style={{ width: 16, height: 16 }} />,
              onClick: () => console.log("导入"),
              variant: "outlined",
            },
            {
              label: "导出",
              icon: <Upload style={{ width: 16, height: 16 }} />,
              onClick: () => console.log("导出"),
              variant: "outlined",
            },
            {
              label: "刷新",
              icon: <RefreshCw style={{ width: 16, height: 16 }} />,
              onClick: handleRefresh,
              variant: "outlined",
            },
          ]}
        />
      </Box>

      {/* 创建字典对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Plus style={{ width: 20, height: 20, color: "#3b82f6" }} />
            新建字典
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="字典编码 *" fullWidth size="small" required />
            <TextField label="字典名称 *" fullWidth size="small" required />
            <TextField
              label="字典类型"
              fullWidth
              size="small"
              select
              slotProps={{
                select: {
                  children: typeOptions
                    .filter((o) => o.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )),
                },
              }}
            />
            <TextField
              label="描述"
              fullWidth
              size="small"
              multiline
              rows={3}
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="启用状态"
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

      {/* 编辑字典对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Edit style={{ width: 20, height: 20, color: "#3b82f6" }} />
            编辑字典
          </Box>
        </DialogTitle>
        {selectedDict && (
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label="字典编码"
                value={selectedDict.code}
                fullWidth
                size="small"
                disabled
              />
              <TextField
                label="字典名称"
                value={selectedDict.name}
                fullWidth
                size="small"
              />
              <TextField
                label="字典类型"
                value={selectedDict.type}
                fullWidth
                size="small"
                select
                slotProps={{
                  select: {
                    children: typeOptions
                      .filter((o) => o.value !== "all")
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )),
                  },
                }}
              />
              <TextField
                label="描述"
                value=""
                fullWidth
                size="small"
                multiline
                rows={3}
              />
              <FormControlLabel
                control={
                  <Switch checked={selectedDict.status === "active"} />
                }
                label="启用状态"
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
    </Box>
  );
}
