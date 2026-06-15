/**
 * RsDocPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. RS 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  Plus,
  Upload,
  Edit,
  Trash2,
  History,
  Shield,
  Download,
  RefreshCw,
  BookOpen,
  File,
  Folder,
  FileText,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface Document {
  id: string;
  doc_name: string;
  doc_type: string;
  version: string;
  author: string;
  update_time: string;
  status: string;
}

interface FilterValues {
  search: string;
  docType: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Document>[] = [
  {
    id: "doc_name",
    header: "文档名称",
    accessor: "doc_name",
    render: (_, row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {getDocTypeIcon(row.doc_type)}
        {row.doc_name}
      </Box>
    ),
  },
  {
    id: "doc_type",
    header: "文档类型",
    accessor: "doc_type",
  },
  {
    id: "version",
    header: "版本",
    accessor: "version",
    render: (value) => <Chip label={value} size="small" variant="outlined" />,
  },
  {
    id: "author",
    header: "作者",
    accessor: "author",
  },
  {
    id: "update_time",
    header: "更新时间",
    accessor: "update_time",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusConfig: Record<string, { label: string; color: "success" | "warning" | "default" }> = {
        published: { label: "已发布", color: "success" },
        draft: { label: "草稿", color: "warning" },
      };
      const config = statusConfig[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
];

// ============ 辅助函数 ============
function getDocTypeIcon(type: string) {
  switch (type) {
    case "设计文档":
      return <File size={16} color="#3b82f6" />;
    case "接口文档":
      return <FileText size={16} color="#3b82f6" />;
    case "用户文档":
      return <BookOpen size={16} color="#3b82f6" />;
    default:
      return <Folder size={16} color="#3b82f6" />;
  }
}

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "docType",
    label: "文档类型",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
];

// ============ 组件 ============
const RsDocPageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Document[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    docType: "",
    status: "",
  });

  // 模态框状态
  const [newDocDialogOpen, setNewDocDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [newDocForm, setNewDocForm] = useState({ doc_name: "", doc_type: "设计文档", description: "" });

  // 模拟数据
  useEffect(() => {
    const mockDocs: Document[] = [
      {
        id: "1",
        doc_name: "系统架构设计文档",
        doc_type: "设计文档",
        version: "v2.1.0",
        author: "张三",
        update_time: "2024-06-15 14:30:00",
        status: "published",
      },
      {
        id: "2",
        doc_name: "API接口规范",
        doc_type: "接口文档",
        version: "v1.5.0",
        author: "李四",
        update_time: "2024-06-14 10:20:00",
        status: "published",
      },
      {
        id: "3",
        doc_name: "数据库设计文档",
        doc_type: "设计文档",
        version: "v3.0.0",
        author: "王五",
        update_time: "2024-06-13 16:45:00",
        status: "draft",
      },
      {
        id: "4",
        doc_name: "用户使用手册",
        doc_type: "用户文档",
        version: "v1.2.0",
        author: "赵六",
        update_time: "2024-06-12 09:15:00",
        status: "published",
      },
      {
        id: "5",
        doc_name: "测试报告-2024Q2",
        doc_type: "测试文档",
        version: "v1.0.0",
        author: "孙七",
        update_time: "2024-06-11 11:30:00",
        status: "published",
      },
      {
        id: "6",
        doc_name: "部署运维手册",
        doc_type: "运维文档",
        version: "v0.9.0",
        author: "周八",
        update_time: "2024-06-10 14:00:00",
        status: "draft",
      },
    ];

    setTimeout(() => {
      setData(mockDocs);
      setTotal(mockDocs.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchDocs = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // 处理创建文档
  const handleCreateDoc = useCallback(() => {
    const newDoc: Document = {
      id: String(Date.now()),
      doc_name: newDocForm.doc_name,
      doc_type: newDocForm.doc_type,
      version: "v0.1.0",
      author: "当前用户",
      update_time: new Date().toLocaleString(),
      status: "draft",
    };
    setData((prev) => [newDoc, ...prev]);
    setNewDocDialogOpen(false);
    setNewDocForm({ doc_name: "", doc_type: "设计文档", description: "" });
  }, [newDocForm]);

  // 处理查看版本
  const handleViewVersion = useCallback((doc: Document) => {
    setSelectedDoc(doc);
    setVersionDialogOpen(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback((docId: string) => {
    setData((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  // 过滤数据
  const filteredData = data.filter((doc) => {
    const matchesSearch =
      !filtersValue.search ||
      doc.doc_name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      doc.author.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesType = !filtersValue.docType || doc.doc_type === filtersValue.docType;
    const matchesStatus = !filtersValue.status || doc.status === filtersValue.status;
    return matchesSearch && matchesType && matchesStatus;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "编辑",
      icon: <Edit size={16} />,
      onClick: () => {},
      color: "warning" as const,
    },
    {
      label: "版本管理",
      icon: <History size={16} />,
      onClick: handleViewVersion,
      color: "primary" as const,
    },
    {
      label: "权限设置",
      icon: <Shield size={16} />,
      onClick: () => {},
      color: "primary" as const,
    },
    {
      label: "删除",
      icon: <Trash2 size={16} />,
      onClick: handleDelete,
      color: "error" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="文档管理"
        subtitle="管理项目文档、查看版本历史"
        createButton={{
          label: "新建文档",
          onClick: () => setNewDocDialogOpen(true),
        }}
        actions={[
          {
            label: "上传",
            icon: <Upload size={18} />,
            onClick: () => {},
            variant: "outlined",
          },
          {
            label: "导出",
            icon: <Download size={18} />,
            onClick: handleExport,
            variant: "outlined",
          },
        ]}
        rightContent={
          <Tooltip title="刷新">
            <IconButton onClick={fetchDocs}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleViewVersion}
        rowActions={rowActions}
        emptyMessage="暂无文档数据"
        searchable
        searchPlaceholder="搜索文档名称、作者..."
      />

      {/* 新建文档对话框 */}
      <Dialog
        open={newDocDialogOpen}
        onClose={() => setNewDocDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建文档</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="文档名称"
              fullWidth
              value={newDocForm.doc_name}
              onChange={(e) => setNewDocForm({ ...newDocForm, doc_name: e.target.value })}
            />
            <TextField
              label="文档类型"
              fullWidth
              value={newDocForm.doc_type}
              onChange={(e) => setNewDocForm({ ...newDocForm, doc_type: e.target.value })}
            />
            <TextField
              label="描述"
              fullWidth
              multiline
              rows={3}
              value={newDocForm.description}
              onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDocDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: "#3b82f6" }} onClick={handleCreateDoc}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 版本历史对话框 */}
      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>版本历史</DialogTitle>
        <DialogContent>
          {selectedDoc && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedDoc.doc_name}
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {[
                  { version: "v2.1.0", date: "2024-06-15", author: "张三", note: "更新架构设计" },
                  { version: "v2.0.0", date: "2024-05-20", author: "张三", note: "重大改版" },
                  { version: "v1.0.0", date: "2024-04-01", author: "李四", note: "初始版本" },
                ].map((v, i) => (
                  <Box key={i} sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {v.version}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {v.date} - {v.author}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{v.note}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsDocPageRefactored;
