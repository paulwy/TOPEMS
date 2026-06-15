import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  ChevronLeft,
  Search,
  Table,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileCode,
} from "lucide-react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Snackbar,
  Alert,
  MenuItem,
  InputAdornment,
  Stack,
  Tooltip,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  FormControlLabel,
  Checkbox as MuiCheckbox,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  dbStructureApi,
  type TableInfo,
  type TableDetail,
  type ColumnInfo,
  type DbChange,
  type DbColumnDefinition,
  type SqlPreview,
} from "../api/system";

const DatabaseStructurePage: React.FC = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableDetail | null>(null);
  const [dbChanges, setDbChanges] = useState<DbChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"structure" | "changes">(
    "structure",
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<SqlPreview | null>(null);
  const [pendingColumn, setPendingColumn] = useState<DbColumnDefinition | null>(
    null,
  );

  const [newColumn, setNewColumn] = useState<DbColumnDefinition>({
    column_name: "",
    data_type: "VARCHAR",
    is_nullable: true,
    default_value: "",
    max_length: 255,
  });

  useEffect(() => {
    loadTables();
    loadDbChanges();
  }, []);

  useEffect(() => {
    if (selectedTable && activeTab === "structure") {
      loadTableDetail(selectedTable.table_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable?.table_name, activeTab]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await dbStructureApi.listTables({ schema: "public" });
      if (res.success && res.data) {
        setTables(res.data);
      }
    } catch (err: any) {
      showNotification("error", err.message || "加载表列表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadTableDetail = async (tableName: string) => {
    setDetailLoading(true);
    try {
      const res = await dbStructureApi.getTableDetail(tableName);
      if (res.success && res.data) {
        setSelectedTable(res.data);
      }
    } catch (err: any) {
      showNotification("error", err.message || "加载表结构失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadDbChanges = async () => {
    try {
      const res = await dbStructureApi.listChanges({ page_size: 50 });
      if (res.success && res.data) {
        setDbChanges(res.data.items || []);
      }
    } catch (err: any) {
      console.error("加载变更历史失败:", err);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const handleNotificationClose = () => {
    setNotification(null);
  };

  const handlePreviewAddColumn = async () => {
    if (!selectedTable || !newColumn.column_name) {
      showNotification("error", "请填写字段名");
      return;
    }

    try {
      const res = await dbStructureApi.previewAddColumn({
        table_name: selectedTable.table_name,
        column: newColumn,
      });
      if (res.success && res.data) {
        setSqlPreview(res.data);
        setPendingColumn(newColumn);
        setShowPreviewModal(true);
      }
    } catch (err: any) {
      showNotification("error", err.message || "生成SQL预览失败");
    }
  };

  const handleExecuteAddColumn = async () => {
    if (!selectedTable || !pendingColumn) return;

    try {
      const res = await dbStructureApi.addColumn({
        table_name: selectedTable.table_name,
        column: pendingColumn,
      });
      if (res.success) {
        showNotification("success", "字段添加成功");
        setShowPreviewModal(false);
        setShowAddColumnModal(false);
        setNewColumn({
          column_name: "",
          data_type: "VARCHAR",
          is_nullable: true,
          default_value: "",
          max_length: 255,
        });
        loadTableDetail(selectedTable.table_name);
        loadDbChanges();
      } else {
        showNotification("error", res.message || "添加字段失败");
      }
    } catch (err: any) {
      showNotification("error", err.message || "添加字段失败");
    }
  };

  const handleDropColumn = async (columnName: string) => {
    if (!selectedTable) return;
    if (!confirm(`确定要删除字段 "${columnName}" 吗？此操作不可恢复！`)) return;

    try {
      const res = await dbStructureApi.dropColumn(
        selectedTable.table_name,
        columnName,
      );
      if (res.success) {
        showNotification("success", "字段删除成功");
        loadTableDetail(selectedTable.table_name);
        loadDbChanges();
      } else {
        showNotification("error", res.message || "删除字段失败");
      }
    } catch (err: any) {
      showNotification("error", err.message || "删除字段失败");
    }
  };

  const filteredTables = tables.filter((table) =>
    table.table_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getDataTypeDisplay = (col: ColumnInfo) => {
    let type = col.data_type.toUpperCase();
    if (col.character_maximum_length) {
      type = `VARCHAR(${col.character_maximum_length})`;
    } else if (col.numeric_precision && col.numeric_scale) {
      type = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`;
    } else if (col.numeric_precision) {
      type = `NUMERIC(${col.numeric_precision})`;
    }
    return type;
  };

  const changeTypeLabels: Record<string, string> = {
    add_column: "添加字段",
    modify_column: "修改字段",
    drop_column: "删除字段",
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "add_column":
        return { bgcolor: "#dcfce7", color: "#15803d" };
      case "drop_column":
        return { bgcolor: "#fee2e2", color: "#b91c1c" };
      default:
        return { bgcolor: "#fef3c7", color: "#b45309" };
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", pb: 6 }}>
      {/* 顶部 Header */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => navigate("/dashboard")}
              sx={{
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Database size={28} color="#2563eb" />
                数据库结构管理
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                查看和管理数据库表结构，支持添加、修改、删除字段
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* 左侧表列表 */}
          <Grid item xs={12} md={3} lg={2.4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                position: { md: "sticky" },
                top: { md: 16 },
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="搜索表名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#94a3b8" />
                    </InputAdornment>
                  ),
                }}
              />

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box
                  sx={{
                    maxHeight: 600,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": {
                      width: 6,
                    },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "#cbd5e1",
                      borderRadius: 3,
                    },
                  }}
                >
                  <Stack spacing={0.5}>
                    {filteredTables.map((table) => {
                      const isSelected =
                        selectedTable?.table_name === table.table_name;
                      return (
                        <Box
                          key={table.table_name}
                          onClick={() => {
                            setActiveTab("structure");
                            setSelectedTable({
                              table_name: table.table_name,
                              schema_name: "public",
                              columns: [],
                            });
                          }}
                          sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            border: "1px solid",
                            borderColor: isSelected
                              ? "#2563eb"
                              : "transparent",
                            bgcolor: isSelected ? "#eff6ff" : "transparent",
                            "&:hover": {
                              bgcolor: isSelected ? "#eff6ff" : "#f1f5f9",
                            },
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Table
                              size={16}
                              color={isSelected ? "#2563eb" : "#94a3b8"}
                            />
                            <Typography
                              variant="body2"
                              fontWeight={isSelected ? 600 : 500}
                              sx={{
                                color: isSelected
                                  ? "#1d4ed8"
                                  : "text.primary",
                                wordBreak: "break-all",
                              }}
                            >
                              {table.table_name}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* 右侧详情区 */}
          <Grid item xs={12} md={9} lg={9.6}>
            {selectedTable ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                {/* Tab 导航 */}
                <Box
                  sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    px: 3,
                  }}
                >
                  <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ minHeight: 48 }}
                  >
                    <Tab
                      value="structure"
                      label="表结构"
                      sx={{ minHeight: 48, fontWeight: 500 }}
                    />
                    <Tab
                      value="changes"
                      label="变更历史"
                      sx={{ minHeight: 48, fontWeight: 500 }}
                    />
                  </Tabs>
                </Box>

                {activeTab === "structure" ? (
                  <Box>
                    {/* 表头信息 */}
                    <Box
                      sx={{
                        p: 2.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          sx={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          }}
                        >
                          {selectedTable.table_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {selectedTable.columns.length} 个字段 |{" "}
                          {selectedTable.row_count?.toLocaleString() || "-"}{" "}
                          行数据
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Plus size={16} />}
                        onClick={() => setShowAddColumnModal(true)}
                        sx={{
                          bgcolor: "#2563eb",
                          "&:hover": { bgcolor: "#1d4ed8" },
                          textTransform: "none",
                          borderRadius: 1.5,
                        }}
                      >
                        添加字段
                      </Button>
                    </Box>

                    {/* 字段列表 */}
                    <Box sx={{ p: 2 }}>
                      {detailLoading ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 6,
                          }}
                        >
                          <CircularProgress size={28} />
                        </Box>
                      ) : (
                        <TableContainer>
                          <MuiTable size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  #
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  字段名
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  类型
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  可空
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  默认值
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  操作
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedTable.columns.map((col) => (
                                <TableRow
                                  key={col.column_name}
                                  sx={{
                                    "&:hover": { bgcolor: "#f8fafc" },
                                  }}
                                >
                                  <TableCell
                                    sx={{
                                      color: "text.secondary",
                                      fontSize: "0.875rem",
                                    }}
                                  >
                                    {col.ordinal_position}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                      fontSize: "0.875rem",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {col.column_name}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      fontSize: "0.875rem",
                                      color: "text.secondary",
                                    }}
                                  >
                                    {getDataTypeDisplay(col)}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={
                                        col.is_nullable === "YES"
                                          ? "NULL"
                                          : "NOT NULL"
                                      }
                                      size="small"
                                      sx={{
                                        bgcolor:
                                          col.is_nullable === "YES"
                                            ? "#fef3c7"
                                            : "#dcfce7",
                                        color:
                                          col.is_nullable === "YES"
                                            ? "#b45309"
                                            : "#15803d",
                                        fontWeight: 500,
                                        fontSize: "0.75rem",
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      fontSize: "0.875rem",
                                      color: "text.secondary",
                                      fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    }}
                                  >
                                    {col.column_default || "-"}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Tooltip title="删除字段">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          handleDropColumn(col.column_name)
                                        }
                                        sx={{
                                          "&:hover": { bgcolor: "#fee2e2" },
                                        }}
                                      >
                                        <Trash2 size={16} />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </MuiTable>
                        </TableContainer>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ p: 2 }}>
                    {dbChanges.length === 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          py: 8,
                        }}
                      >
                        <Clock size={48} color="#94a3b8" />
                        <Typography
                          color="text.secondary"
                          sx={{ mt: 2 }}
                        >
                          暂无变更历史
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer>
                        <MuiTable size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  textTransform: "uppercase",
                                }}
                              >
                                时间
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  textTransform: "uppercase",
                                }}
                              >
                                类型
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  textTransform: "uppercase",
                                }}
                              >
                                表名
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  textTransform: "uppercase",
                                }}
                              >
                                字段
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  textTransform: "uppercase",
                                }}
                              >
                                SQL
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dbChanges.map((change) => {
                              const style = getChangeTypeColor(
                                change.change_type,
                              );
                              return (
                                <TableRow
                                  key={change.id}
                                  sx={{
                                    "&:hover": { bgcolor: "#f8fafc" },
                                  }}
                                >
                                  <TableCell
                                    sx={{
                                      fontSize: "0.875rem",
                                      color: "text.secondary",
                                    }}
                                  >
                                    {new Date(change.executed_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={
                                        changeTypeLabels[change.change_type] ||
                                        change.change_type
                                      }
                                      size="small"
                                      sx={{
                                        bgcolor: style.bgcolor,
                                        color: style.color,
                                        fontWeight: 500,
                                        fontSize: "0.75rem",
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                      fontSize: "0.875rem",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {change.table_name}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      fontSize: "0.875rem",
                                      color: "text.secondary",
                                    }}
                                  >
                                    {change.column_name || "-"}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      fontSize: "0.875rem",
                                      color: "text.secondary",
                                      fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                      maxWidth: 320,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {change.sql_statement}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </MuiTable>
                      </TableContainer>
                    )}
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 8,
                  textAlign: "center",
                }}
              >
                <Database size={64} color="#94a3b8" style={{ marginBottom: 16 }} />
                <Typography variant="h6" fontWeight={500} sx={{ mb: 1 }}>
                  请选择数据表
                </Typography>
                <Typography color="text.secondary">
                  从左侧列表选择一个表查看和管理结构
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* 添加字段对话框 */}
      <Dialog
        open={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>添加新字段</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="字段名"
              required
              fullWidth
              size="small"
              value={newColumn.column_name}
              onChange={(e) =>
                setNewColumn({ ...newColumn, column_name: e.target.value })
              }
              placeholder="如: new_field"
            />
            <FormControl fullWidth size="small">
              <InputLabel>数据类型</InputLabel>
              <Select
                value={newColumn.data_type}
                label="数据类型"
                onChange={(e) =>
                  setNewColumn({ ...newColumn, data_type: e.target.value })
                }
              >
                <MenuItem value="VARCHAR">VARCHAR</MenuItem>
                <MenuItem value="TEXT">TEXT</MenuItem>
                <MenuItem value="INTEGER">INTEGER</MenuItem>
                <MenuItem value="BIGINT">BIGINT</MenuItem>
                <MenuItem value="NUMERIC">NUMERIC</MenuItem>
                <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
                <MenuItem value="DATE">DATE</MenuItem>
                <MenuItem value="TIMESTAMP">TIMESTAMP</MenuItem>
                <MenuItem value="TIMESTAMPTZ">TIMESTAMPTZ</MenuItem>
                <MenuItem value="UUID">UUID</MenuItem>
                <MenuItem value="JSONB">JSONB</MenuItem>
              </Select>
            </FormControl>
            {newColumn.data_type === "VARCHAR" && (
              <TextField
                label="最大长度"
                type="number"
                fullWidth
                size="small"
                value={newColumn.max_length || 255}
                onChange={(e) =>
                  setNewColumn({
                    ...newColumn,
                    max_length: parseInt(e.target.value),
                  })
                }
              />
            )}
            <FormControlLabel
              control={
                <MuiCheckbox
                  checked={newColumn.is_nullable}
                  onChange={(e) =>
                    setNewColumn({
                      ...newColumn,
                      is_nullable: e.target.checked,
                    })
                  }
                />
              }
              label="允许为空 (NULL)"
            />
            <TextField
              label="默认值"
              fullWidth
              size="small"
              value={newColumn.default_value || ""}
              onChange={(e) =>
                setNewColumn({ ...newColumn, default_value: e.target.value })
              }
              placeholder="如: 'active' 或 NOW()"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowAddColumnModal(false)}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              bgcolor: "#f1f5f9",
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handlePreviewAddColumn}
            sx={{
              textTransform: "none",
              bgcolor: "#2563eb",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            预览 SQL
          </Button>
        </DialogActions>
      </Dialog>

      {/* SQL 预览对话框 */}
      <Dialog
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Eye size={20} />
            <Typography variant="h6" fontWeight={600}>
              SQL 预览
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {sqlPreview?.warning && (
            <Alert
              severity="warning"
              icon={<AlertTriangle size={20} />}
              sx={{ mb: 2 }}
            >
              {sqlPreview.warning}
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{
              bgcolor: "#0f172a",
              p: 2,
              borderRadius: 1.5,
              mb: 2,
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <FileCode size={16} color="#4ade80" style={{ marginTop: 2 }} />
              <Box
                component="pre"
                sx={{
                  m: 0,
                  fontSize: "0.875rem",
                  color: "#4ade80",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  flex: 1,
                }}
              >
                {sqlPreview?.sql}
              </Box>
            </Stack>
          </Paper>

          <Alert severity="info" sx={{ mb: 1 }}>
            此操作将修改表结构并记录到变更历史。确定要执行吗？
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowPreviewModal(false)}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              bgcolor: "#f1f5f9",
              "&:hover": { bgcolor: "#e2e8f0" },
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleExecuteAddColumn}
            startIcon={<CheckCircle size={16} />}
            sx={{
              textTransform: "none",
              bgcolor: "#dc2626",
              "&:hover": { bgcolor: "#b91c1c" },
            }}
          >
            确认执行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知 Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification?.type || "info"}
          variant="filled"
          sx={{ borderRadius: 1.5 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabaseStructurePage;
