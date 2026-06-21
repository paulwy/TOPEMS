import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Book,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronRight,
  FolderOpen,
  Tag,
  Download,
  Upload,
  RefreshCw,
  Switch,
} from "lucide-react";
import {
  dictTypeApi,
  dictItemApi,
  type DictType,
  type DictItem,
} from "@/api/system";
import { useAppStore } from "../../store";
import { apiLogger } from "@/utils/logger";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  Checkbox,
  Paper,
} from "@mui/material";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";

interface DictionaryManagementPageProps {
  onNavigate?: (page: string) => void;
}

const categoryLabels: Record<string, string> = {
  system: "系统字典",
  business: "业务字典",
  basic: "基础数据",
  custom: "自定义字典",
};

const statusLabels: Record<string, string> = {
  active: "启用",
  inactive: "禁用",
};

const DictionaryManagementPage: React.FC<DictionaryManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [dictTypes, setDictTypes] = useState<DictType[]>([]);
  const [selectedType, setSelectedType] = useState<DictType | null>(null);
  const [dictItems, setDictItems] = useState<DictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [newType, setNewType] = useState<Partial<DictType>>({
    code: "",
    name: "",
    category: "business",
    description: "",
    status: "active",
  });

  const [newItem, setNewItem] = useState<Partial<DictItem>>({
    code: "",
    name: "",
    value: "",
    sort_order: 0,
    parent_id: undefined,
  });

  useEffect(() => {
    loadDictTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadDictItems(selectedType.id);
      setSelectedItems([]);
    }
  }, [selectedType]);

  const loadDictTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dictTypeApi.list();
      if (res.success && res.data) {
        setDictTypes(res.data.items || []);
        if (!selectedType && res.data.items && res.data.items.length > 0) {
          setSelectedType(res.data.items[0]);
        }
      } else {
        setDictTypes([]);
      }
    } catch (err: any) {
      setError(err.message || "加载字典类型失败");
      addNotification({
        title: "加载失败",
        message: err.message || "加载字典类型失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDictItems = async (typeId: string) => {
    setItemsLoading(true);
    try {
      const res = await dictItemApi.list(typeId);
      if (res.success && res.data) {
        setDictItems(res.data.items || []);
      } else {
        setDictItems([]);
      }
    } catch (err: any) {
      apiLogger.error("加载字典项失败:", err);
      setDictItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dictTypeApi.create(newType);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "字典类型创建成功",
          type: "success",
        });
        setShowTypeModal(false);
        setNewType({
          code: "",
          name: "",
          category: "business",
          description: "",
          status: "active",
        });
        loadDictTypes();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建失败",
        type: "error",
      });
    }
  };

  const handleUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    try {
      const res = await dictTypeApi.update(editingType.id, editingType);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "字典类型更新成功",
          type: "success",
        });
        setShowTypeModal(false);
        setEditingType(null);
        loadDictTypes();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新失败",
        type: "error",
      });
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      const res = await dictTypeApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "字典类型删除成功",
          type: "success",
        });
        if (selectedType?.id === id) {
          setSelectedType(null);
        }
        loadDictTypes();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除失败",
        type: "error",
      });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    try {
      const res = await dictItemApi.create({
        ...newItem,
        dict_type_id: selectedType.id,
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: "字典项创建成功",
          type: "success",
        });
        setShowItemModal(false);
        setNewItem({
          code: "",
          name: "",
          value: "",
          sort_order: dictItems.length,
          parent_id: undefined,
        });
        loadDictItems(selectedType.id);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建失败",
        type: "error",
      });
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await dictItemApi.update(editingItem.id, editingItem);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "字典项更新成功",
          type: "success",
        });
        setShowItemModal(false);
        setEditingItem(null);
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新失败",
        type: "error",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await dictItemApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "字典项删除成功",
          type: "success",
        });
        setSelectedItems(selectedItems.filter((itemId) => itemId !== id));
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除失败",
        type: "error",
      });
    }
  };

  const handleToggleItemStatus = async (item: DictItem) => {
    const newStatus = item.status === "active" ? "inactive" : "active";
    try {
      const res = await dictItemApi.update(item.id, {
        ...item,
        status: newStatus,
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: `字典项已${newStatus === "active" ? "启用" : "禁用"}`,
          type: "success",
        });
        if (selectedType) loadDictItems(selectedType.id);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "状态切换失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "状态切换失败",
        type: "error",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    try {
      for (const id of selectedItems) {
        await dictItemApi.delete(id);
      }
      addNotification({
        title: "成功",
        message: `成功删除 ${selectedItems.length} 个字典项`,
        type: "success",
      });
      setSelectedItems([]);
      if (selectedType) loadDictItems(selectedType.id);
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "批量删除失败",
        type: "error",
      });
    }
  };

  const handleExport = () => {
    if (!selectedType || dictItems.length === 0) return;

    const exportData = dictItems.map((item) => ({
      code: item.code,
      name: item.name,
      value: item.value || "",
      sort_order: item.sort_order,
      status: item.status,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType.code}_items.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({
      title: "成功",
      message: "字典项导出成功",
      type: "success",
    });
    setShowExportModal(false);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedType) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const items = JSON.parse(event.target?.result as string);
          if (!Array.isArray(items)) {
            addNotification({
              title: "失败",
              message: "导入文件格式不正确",
              type: "error",
            });
            return;
          }

          for (const item of items) {
            await dictItemApi.create({
              dict_type_id: selectedType.id,
              code: item.code,
              name: item.name,
              value: item.value,
              sort_order: item.sort_order || 0,
              status: item.status || "active",
            });
          }

          addNotification({
            title: "成功",
            message: `成功导入 ${items.length} 个字典项`,
            type: "success",
          });
          setShowImportModal(false);
          setImportFile(null);
          if (selectedType) loadDictItems(selectedType.id);
        } catch (err: any) {
          addNotification({
            title: "失败",
            message: err.message || "导入失败",
            type: "error",
          });
        }
      };
      reader.readAsText(importFile);
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "导入失败",
        type: "error",
      });
    }
  };

  const filteredTypes = dictTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groupedTypes = useMemo(() => {
    return filteredTypes.reduce(
      (acc, type) => {
        const category = type.category || "custom";
        if (!acc[category]) acc[category] = [];
        acc[category].push(type);
        return acc;
      },
      {} as Record<string, DictType[]>,
    );
  }, [filteredTypes]);

  const parentItems = useMemo(() => {
    return dictItems.filter((item) => !item.parent_id);
  }, [dictItems]);

  // 过滤后的字典项
  const filteredDictItems = useMemo(() => {
    return dictItems.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [dictItems, searchQuery]);

  // 分页数据
  const paginatedDictItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredDictItems.slice(start, end);
  }, [filteredDictItems, page, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 字典项列定义
  const columns: ColumnDef<DictItem>[] = useMemo(
    () => [
      {
        id: "sort_order",
        label: "排序",
        width: 64,
        render: (item) => (
          <Typography variant="body2" color="text.secondary">
            {item.sort_order}
          </Typography>
        ),
      },
      {
        id: "code",
        label: "编码",
        render: (item) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {item.code}
          </Typography>
        ),
      },
      {
        id: "name",
        label: "名称",
        sortable: true,
        render: (item) => (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {item.parent_id && (
              <Box component="span" sx={{ color: "text.disabled", mr: 0.5 }}>
                └─
              </Box>
            )}
            <Typography variant="body2">{item.name}</Typography>
          </Box>
        ),
      },
      {
        id: "value",
        label: "值",
        render: (item) => (
          <Typography variant="body2" color="text.secondary">
            {item.value || "-"}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        width: 96,
        render: (item) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch
              checked={item.status === "active"}
              onChange={() => handleToggleItemStatus(item)}
              size="small"
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                color:
                  item.status === "active" ? "success.main" : "text.disabled",
              }}
            >
              {statusLabels[item.status]}
            </Typography>
          </Box>
        ),
      },
      {
        id: "actions",
        label: "操作",
        align: "right",
        width: 100,
        render: (item) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              justifyContent: "flex-end",
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEditingItem(item);
                setShowItemModal(true);
              }}
            >
              <Edit size={16} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("确定要删除这个字典项吗？")) {
                  handleDeleteItem(item.id);
                }
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleToggleItemStatus, handleDeleteItem],
  );

  // 筛选器定义
  const filters = useMemo(
    () => [
      {
        id: "status",
        label: "状态",
        type: "select" as const,
        options: [
          { label: "全部", value: "" },
          { label: "启用", value: "active" },
          { label: "禁用", value: "inactive" },
        ],
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft size={20} />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Book
                    size={28}
                    style={{ marginRight: 12, color: "#2563eb" }}
                  />
                  字典管理
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  管理系统字典、业务字典、基础数据字典
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => {
                setEditingType(null);
                setNewType({
                  code: "",
                  name: "",
                  category: "business",
                  description: "",
                  status: "active",
                });
                setShowTypeModal(true);
              }}
            >
              新增字典类型
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 2 }}>
          <Paper
            sx={{ bgcolor: "#fef2f2", borderColor: "#fecaca", p: 2, border: 1 }}
          >
            <Typography color="error">{error}</Typography>
          </Paper>
        </Box>
      )}

      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
        <Box sx={{ display: "flex", gap: 3 }}>
          {/* 左侧字典类型列表 */}
          <Box sx={{ width: 320, flexShrink: 0 }}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ position: "relative", mb: 2 }}>
                  <TextField
                    type="text"
                    placeholder="搜索字典类型..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Box
                            component="span"
                            sx={{
                              mr: 1,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Search size={16} style={{ color: "#9ca3af" }} />
                          </Box>
                        ),
                      },
                    }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={{ maxHeight: 600, overflow: "auto" }}>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {Object.entries(groupedTypes).map(([category, types]) => (
                        <Box key={category}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <FolderOpen
                              size={16}
                              style={{ color: "#6b7280" }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 500,
                                color: "text.secondary",
                                textTransform: "uppercase",
                              }}
                            >
                              {categoryLabels[category] || category}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            {types.map((type) => (
                              <Box
                                key={type.id}
                                onClick={() => setSelectedType(type)}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1,
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  border: 1,
                                  borderColor:
                                    selectedType?.id === type.id
                                      ? "primary.main"
                                      : "transparent",
                                  bgcolor:
                                    selectedType?.id === type.id
                                      ? "primary.50"
                                      : "transparent",
                                  "&:hover": {
                                    bgcolor:
                                      selectedType?.id === type.id
                                        ? "primary.50"
                                        : "action.hover",
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Tag
                                      size={16}
                                      style={{ color: "#9ca3af" }}
                                    />
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 500 }}
                                      >
                                        {type.name}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {type.code}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <ChevronRight
                                    size={16}
                                    style={{ color: "#9ca3af" }}
                                  />
                                </Box>
                                <Chip
                                  label={statusLabels[type.status]}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mt: 1 }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 右侧字典项表格 */}
          <Box sx={{ flex: 1 }}>
            {selectedType ? (
              <ListPageTemplate
                title={selectedType.name}
                subtitle={`编码: ${selectedType.code} | 分类: ${categoryLabels[selectedType.category] || selectedType.category}`}
                columns={columns}
                data={paginatedDictItems}
                loading={itemsLoading}
                pagination={{
                  page,
                  pageSize,
                  total: filteredDictItems.length,
                  onPageChange: handlePageChange,
                }}
                searchable
                searchPlaceholder="搜索字典项..."
                searchValue={searchQuery}
                onSearch={setSearchQuery}
                filters={filters}
                selectable
                selectedIds={selectedItems}
                onSelectionChange={setSelectedItems}
                actions={[
                  {
                    label: "导出",
                    icon: <Download size={16} />,
                    onClick: () => setShowExportModal(true),
                    variant: "outlined",
                  },
                  {
                    label: "导入",
                    icon: <Upload size={16} />,
                    onClick: () => setShowImportModal(true),
                    variant: "outlined",
                  },
                  {
                    label: "新增字典项",
                    icon: <Plus size={16} />,
                    onClick: () => {
                      setEditingItem(null);
                      setNewItem({
                        code: "",
                        name: "",
                        value: "",
                        sort_order: dictItems.length,
                        parent_id: undefined,
                      });
                      setShowItemModal(true);
                    },
                    variant: "contained",
                  },
                ]}
                batchActions={[
                  {
                    label: "批量删除",
                    icon: <Trash2 size={16} />,
                    color: "error",
                    confirm: true,
                    confirmMessage: `确定要删除选中的 ${selectedItems.length} 个字典项吗？`,
                    onClick: handleBatchDelete,
                  },
                ]}
                onRefresh={() => selectedType && loadDictItems(selectedType.id)}
                emptyMessage="暂无字典项"
                headerContent={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit size={16} />}
                      onClick={() => {
                        setEditingType(selectedType);
                        setShowTypeModal(true);
                      }}
                    >
                      编辑类型
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={16} />}
                      onClick={() => {
                        if (
                          confirm(
                            "确定要删除这个字典类型吗？所有字典项也会被删除！",
                          )
                        ) {
                          handleDeleteType(selectedType.id);
                        }
                      }}
                    >
                      删除
                    </Button>
                  </Box>
                }
              />
            ) : (
              <Card>
                <CardContent sx={{ p: 6, textAlign: "center" }}>
                  <Book
                    size={64}
                    style={{ color: "#9ca3af", marginBottom: 16 }}
                  />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    请选择字典类型
                  </Typography>
                  <Typography color="text.secondary">
                    从左侧列表选择一个字典类型查看和管理字典项
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Box>

      {/* 字典类型对话框 */}
      <Dialog
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingType ? "编辑字典类型" : "新增字典类型"}
        </DialogTitle>
        <Box
          component="form"
          onSubmit={editingType ? handleUpdateType : handleCreateType}
        >
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              <TextField
                fullWidth
                label="编码 *"
                required
                disabled={!!editingType}
                value={editingType?.code || newType.code || ""}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({ ...editingType, code: e.target.value });
                  } else {
                    setNewType({ ...newType, code: e.target.value });
                  }
                }}
                placeholder="如: status_type"
                size="small"
              />
              <TextField
                fullWidth
                label="名称 *"
                required
                value={editingType?.name || newType.name || ""}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({ ...editingType, name: e.target.value });
                  } else {
                    setNewType({ ...newType, name: e.target.value });
                  }
                }}
                placeholder="如: 状态类型"
                size="small"
              />
              <FormControl size="small" fullWidth>
                <InputLabel>分类</InputLabel>
                <Select
                  value={
                    editingType?.category || newType.category || "business"
                  }
                  label="分类"
                  onChange={(e) => {
                    if (editingType) {
                      setEditingType({
                        ...editingType,
                        category: e.target.value,
                      });
                    } else {
                      setNewType({ ...newType, category: e.target.value });
                    }
                  }}
                >
                  <MenuItem value="system">系统字典</MenuItem>
                  <MenuItem value="business">业务字典</MenuItem>
                  <MenuItem value="basic">基础数据</MenuItem>
                  <MenuItem value="custom">自定义字典</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="描述"
                value={editingType?.description || newType.description || ""}
                onChange={(e) => {
                  if (editingType) {
                    setEditingType({
                      ...editingType,
                      description: e.target.value,
                    });
                  } else {
                    setNewType({ ...newType, description: e.target.value });
                  }
                }}
                multiline
                rows={2}
                size="small"
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2">状态</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {(editingType?.status || newType.status) === "active"
                      ? "启用"
                      : "禁用"}
                  </Typography>
                  <Switch
                    checked={
                      (editingType?.status || newType.status) === "active"
                    }
                    onChange={(e) => {
                      const status = e.target.checked ? "active" : "inactive";
                      if (editingType) {
                        setEditingType({ ...editingType, status });
                      } else {
                        setNewType({ ...newType, status });
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => {
                setShowTypeModal(false);
                setEditingType(null);
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="contained">
              {editingType ? "保存" : "创建"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 字典项对话框 */}
      <Dialog
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingItem ? "编辑字典项" : "新增字典项"}</DialogTitle>
        <Box
          component="form"
          onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
        >
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              <TextField
                fullWidth
                label="编码 *"
                required
                value={editingItem?.code || newItem.code || ""}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({ ...editingItem, code: e.target.value });
                  } else {
                    setNewItem({ ...newItem, code: e.target.value });
                  }
                }}
                placeholder="如: active"
                size="small"
              />
              <TextField
                fullWidth
                label="名称 *"
                required
                value={editingItem?.name || newItem.name || ""}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({ ...editingItem, name: e.target.value });
                  } else {
                    setNewItem({ ...newItem, name: e.target.value });
                  }
                }}
                placeholder="如: 启用"
                size="small"
              />
              <TextField
                fullWidth
                label="值"
                value={editingItem?.value || newItem.value || ""}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({ ...editingItem, value: e.target.value });
                  } else {
                    setNewItem({ ...newItem, value: e.target.value });
                  }
                }}
                placeholder="可选，存储实际值"
                size="small"
              />
              <TextField
                fullWidth
                label="排序"
                type="number"
                value={editingItem?.sort_order || newItem.sort_order || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (editingItem) {
                    setEditingItem({ ...editingItem, sort_order: value });
                  } else {
                    setNewItem({ ...newItem, sort_order: value });
                  }
                }}
                size="small"
              />
              <FormControl size="small" fullWidth>
                <InputLabel>上级字典项</InputLabel>
                <Select
                  value={editingItem?.parent_id || newItem.parent_id || ""}
                  label="上级字典项"
                  onChange={(e) => {
                    const parentId = e.target.value || undefined;
                    if (editingItem) {
                      setEditingItem({ ...editingItem, parent_id: parentId });
                    } else {
                      setNewItem({ ...newItem, parent_id: parentId });
                    }
                  }}
                >
                  <MenuItem value="">无（顶级）</MenuItem>
                  {parentItems
                    .filter((item) => item.id !== editingItem?.id)
                    .map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {editingItem && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2">状态</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {editingItem.status === "active" ? "启用" : "禁用"}
                    </Typography>
                    <Switch
                      checked={editingItem.status === "active"}
                      onChange={(e) => {
                        setEditingItem({
                          ...editingItem,
                          status: e.target.checked ? "active" : "inactive",
                        });
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => {
                setShowItemModal(false);
                setEditingItem(null);
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="contained">
              {editingItem ? "保存" : "创建"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 导出对话框 */}
      <Dialog
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>导出字典项</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            将当前字典类型的所有字典项导出为 JSON 文件。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowExportModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleExport}>
            确认导出
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>导入字典项</DialogTitle>
        <Box component="form" onSubmit={handleImport}>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                选择 JSON 文件
              </Typography>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                style={{ width: "100%" }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              type="button"
              onClick={() => setShowImportModal(false)}
            >
              取消
            </Button>
            <Button type="submit" variant="contained">
              确认导入
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default DictionaryManagementPage;
