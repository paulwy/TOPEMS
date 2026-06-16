/**
 * AccountManagementPage 重构后
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Download,
  Upload,
  ChevronLeft,
  Eye,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef, type RowAction } from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ Mock 数据 ============
const mockAccounts = [
  {
    id: "1",
    code: "1001",
    name: "库存现金",
    type: "asset",
    balance: 12580.50,
    balanceDirection: "debit",
    isDetail: true,
    isActive: true,
  },
  {
    id: "2",
    code: "1002",
    name: "银行存款",
    type: "asset",
    balance: 2580000.00,
    balanceDirection: "debit",
    isDetail: true,
    isActive: true,
  },
  {
    id: "3",
    code: "1122",
    name: "应收账款",
    type: "asset",
    balance: 560000.00,
    balanceDirection: "debit",
    isDetail: true,
    isActive: true,
  },
  {
    id: "4",
    code: "2202",
    name: "应付账款",
    type: "liability",
    balance: 380000.00,
    balanceDirection: "credit",
    isDetail: true,
    isActive: true,
  },
  {
    id: "5",
    code: "4001",
    name: "实收资本",
    type: "equity",
    balance: 5000000.00,
    balanceDirection: "credit",
    isDetail: true,
    isActive: true,
  },
  {
    id: "6",
    code: "5001",
    name: "生产成本",
    type: "cost",
    balance: 0.00,
    balanceDirection: "debit",
    isDetail: false,
    isActive: true,
  },
  {
    id: "7",
    code: "6001",
    name: "主营业务收入",
    type: "revenue",
    balance: 0.00,
    balanceDirection: "credit",
    isDetail: true,
    isActive: true,
  },
  {
    id: "8",
    code: "6602",
    name: "销售费用",
    type: "expense",
    balance: 85000.00,
    balanceDirection: "debit",
    isDetail: true,
    isActive: true,
  },
];

const typeOptions = [
  { value: "all", label: "全部类型" },
  { value: "asset", label: "资产" },
  { value: "liability", label: "负债" },
  { value: "equity", label: "权益" },
  { value: "revenue", label: "收入" },
  { value: "expense", label: "费用" },
  { value: "cost", label: "成本" },
];

const directionOptions = [
  { value: "all", label: "全部方向" },
  { value: "debit", label: "借" },
  { value: "credit", label: "贷" },
];

// ============ 类型定义 ============
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  balanceDirection: "debit" | "credit";
  isDetail: boolean;
  isActive: boolean;
}

// ============ 类型徽章 ============
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { color: "primary" | "error" | "success" | "info" | "warning"; label: string }> = {
    asset: { color: "primary", label: "资产" },
    liability: { color: "error", label: "负债" },
    equity: { color: "success", label: "权益" },
    revenue: { color: "info", label: "收入" },
    expense: { color: "warning", label: "费用" },
    cost: { color: "primary", label: "成本" },
  };
  const { color, label } = config[type] || { color: "primary", label: type };
  return <Chip size="small" label={label} color={color} variant="outlined" />;
};

// ============ 方向徽章 ============
const DirectionBadge: React.FC<{ direction: string }> = ({ direction }) => {
  return (
    <Chip
      size="small"
      label={direction === "debit" ? "借" : "贷"}
      color={direction === "debit" ? "primary" : "error"}
      variant="filled"
    />
  );
};

// ============ 主组件 ============
export default function AccountManagementPageRefactored() {
  const navigate = useNavigate();

  // 状态
  const [accounts] = useState<Account[]>(mockAccounts as Account[]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDirection, setFilterDirection] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // 筛选器配置
  const filters: FilterConfig[] = [
    {
      id: "type",
      label: "科目类型",
      type: "select",
      options: typeOptions,
    },
    {
      id: "direction",
      label: "余额方向",
      type: "select",
      options: directionOptions,
    },
  ];

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return accounts.filter((account) => {
      if (
        searchValue &&
        !account.name.toLowerCase().includes(searchValue.toLowerCase()) &&
        !account.code.toLowerCase().includes(searchValue.toLowerCase())
      ) {
        return false;
      }
      if (filterType !== "all" && account.type !== filterType) {
        return false;
      }
      if (filterDirection !== "all" && account.balanceDirection !== filterDirection) {
        return false;
      }
      return true;
    });
  }, [accounts, searchValue, filterType, filterDirection]);

  // 表格列定义
  const columns: ColumnDef<Account>[] = useMemo(
    () => [
      {
        id: "code",
        label: "科目编码",
        minWidth: 120,
        render: (row: Account) => (
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 500 }}
          >
            {row.code}
          </Typography>
        ),
      },
      {
        id: "name",
        label: "科目名称",
        minWidth: 180,
        render: (row: Account) => (
          <Typography variant="body2" sx={{ fontWeight: row.isDetail ? 400 : 600 }}>
            {row.name}
          </Typography>
        ),
      },
      {
        id: "type",
        label: "类型",
        minWidth: 80,
        render: (row: Account) => <TypeBadge type={row.type} />,
      },
      {
        id: "balanceDirection",
        label: "方向",
        minWidth: 60,
        render: (row: Account) => <DirectionBadge direction={row.balanceDirection} />,
      },
      {
        id: "isDetail",
        label: "明细",
        minWidth: 100,
        render: (row: Account) => (
          <Chip
            size="small"
            label={row.isDetail ? "明细科目" : "总账科目"}
            variant={row.isDetail ? "filled" : "outlined"}
            color={row.isDetail ? "default" : "primary"}
          />
        ),
      },
      {
        id: "balance",
        label: "余额",
        minWidth: 140,
        render: (row: Account) => (
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              textAlign: "right",
              color: row.balance >= 0 ? "success.main" : "error.main",
            }}
          >
            {row.balance.toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        ),
      },
      {
        id: "isActive",
        label: "状态",
        minWidth: 80,
        render: (row: Account) => (
          <Chip
            size="small"
            label={row.isActive ? "启用" : "停用"}
            color={row.isActive ? "success" : "default"}
            variant="filled"
          />
        ),
      },
    ],
    [],
  );

  // 行操作定义
  const rowActions: RowAction<Account>[] = useMemo(
    () => [
      {
        label: "查看",
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: (row: Account) => {
          console.log("查看科目:", row.name);
        },
      },
      {
        label: "编辑",
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: (row: Account) => {
          setSelectedAccount(row);
          setShowEditModal(true);
        },
        color: "primary",
      },
      {
        label: "删除",
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row: Account) => {
          console.log("删除科目:", row.name);
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
          title="会计科目管理"
          subtitle="管理企业会计科目体系"
          backButton={{
            href: "/dashboard",
            tooltip: "返回首页",
          }}
          searchBox={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: "搜索科目编码或名称...",
          }}
          createButton={{
            label: "新增科目",
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* 筛选栏 */}
        <FilterBar
          filters={filters}
          onSearch={handleRefresh}
          onReset={() => console.log("重置筛选")}
        />

        {/* 统计卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ bgcolor: "white", p: 2, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
              {accounts.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              科目总数
            </Typography>
          </Box>
          <Box sx={{ bgcolor: "white", p: 2, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "success.main" }}>
              {accounts.filter((a) => a.isDetail).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              明细科目
            </Typography>
          </Box>
          <Box sx={{ bgcolor: "white", p: 2, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "info.main" }}>
              {accounts.filter((a) => !a.isDetail).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              总账科目
            </Typography>
          </Box>
          <Box sx={{ bgcolor: "white", p: 2, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "warning.main" }}>
              {accounts.filter((a) => !a.isActive).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              已停用
            </Typography>
          </Box>
        </Box>

        {/* 科目列表 */}
        <ListPageTemplate
          title="会计科目列表"
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          rowActions={rowActions}
          getRowId={(row) => row.id}
          emptyMessage="暂无科目数据"
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

      {/* 创建科目对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Plus style={{ width: 20, height: 20, color: "#3b82f6" }} />
            新增科目
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="科目编码 *" fullWidth size="small" required />
            <TextField label="科目名称 *" fullWidth size="small" required />
            <FormControl fullWidth size="small">
              <InputLabel>科目类型</InputLabel>
              <Select label="科目类型">
                {typeOptions
                  .filter((o) => o.value !== "all")
                  .map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>余额方向</InputLabel>
              <Select label="余额方向">
                <MenuItem value="debit">借</MenuItem>
                <MenuItem value="credit">贷</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="上级科目"
              fullWidth
              size="small"
              select
              slotProps={{
                select: { children: <MenuItem value="">无（顶级科目）</MenuItem> },
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

      {/* 编辑科目对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Edit style={{ width: 20, height: 20, color: "#3b82f6" }} />
            编辑科目
          </Box>
        </DialogTitle>
        {selectedAccount && (
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label="科目编码"
                value={selectedAccount.code}
                fullWidth
                size="small"
                disabled
              />
              <TextField
                label="科目名称"
                value={selectedAccount.name}
                fullWidth
                size="small"
              />
              <TypeBadge type={selectedAccount.type} />
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
