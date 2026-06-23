import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Card, CardContent, Typography,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { Plus, Eye, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from "@/components/templates";

interface Inspection {
  id: string;
  inspection_no: string;
  inspection_type: string;
  product_name: string;
  inspection_quantity: number;
  qualified_quantity: number;
  qualification_rate: string;
  inspector: string;
  inspection_date: string;
  status: string;
}

const mockInspections: Inspection[] = [
  {
    id: "1",
    inspection_no: "IQ2024001",
    inspection_type: "来料检验",
    product_name: "原材料A",
    inspection_quantity: 1000,
    qualified_quantity: 980,
    qualification_rate: "98.0%",
    inspector: "张三",
    inspection_date: "2024-01-15",
    status: "合格",
  },
  {
    id: "2",
    inspection_no: "IQ2024002",
    inspection_type: "过程检验",
    product_name: "半成品B",
    inspection_quantity: 500,
    qualified_quantity: 480,
    qualification_rate: "96.0%",
    inspector: "李四",
    inspection_date: "2024-01-16",
    status: "合格",
  },
  {
    id: "3",
    inspection_no: "IQ2024003",
    inspection_type: "成品检验",
    product_name: "产品C",
    inspection_quantity: 200,
    qualified_quantity: 190,
    qualification_rate: "95.0%",
    inspector: "王五",
    inspection_date: "2024-01-17",
    status: "待判定",
  },
  {
    id: "4",
    inspection_no: "IQ2024004",
    inspection_type: "来料检验",
    product_name: "原材料D",
    inspection_quantity: 800,
    qualified_quantity: 760,
    qualification_rate: "95.0%",
    inspector: "赵六",
    inspection_date: "2024-01-18",
    status: "不合格",
  },
  {
    id: "5",
    inspection_no: "IQ2024005",
    inspection_type: "过程检验",
    product_name: "半成品E",
    inspection_quantity: 300,
    qualified_quantity: 295,
    qualification_rate: "98.3%",
    inspector: "钱七",
    inspection_date: "2024-01-19",
    status: "合格",
  },
];

const QmsInspectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);
  const [formData, setFormData] = useState({
    inspection_type: "来料检验",
    product_name: "",
    inspection_quantity: "",
    qualified_quantity: "",
    inspector: "",
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    setTimeout(() => {
      setInspections(mockInspections);
      setLoading(false);
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      合格: { bg: "#dcfce7", color: "#16a34a" },
      不合格: { bg: "#fee2e2", color: "#dc2626" },
      待判定: { bg: "#fef9c3", color: "#ca8a04" },
    };
    const colors = statusMap[status] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <Chip
        label={status}
        size="small"
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns: ColumnDef<Inspection>[] = [
    { id: "inspection_no", label: "检验单号" },
    { id: "inspection_type", label: "检验类型" },
    { id: "product_name", label: "产品名称" },
    { id: "inspection_quantity", label: "检验数量" },
    { id: "qualified_quantity", label: "合格数量" },
    {
      id: "qualification_rate",
      label: "合格率",
      render: (row) => (
        <Box
          sx={{
            color:
              parseFloat(row.qualification_rate) >= 95
                ? "#16a34a"
                : parseFloat(row.qualification_rate) >= 90
                  ? "#ca8a04"
                  : "#dc2626",
            fontWeight: 500,
          }}
        >
          {row.qualification_rate}
        </Box>
      ),
    },
    { id: "inspector", label: "检验员" },
    { id: "inspection_date", label: "检验日期" },
    {
      id: "status",
      label: "状态",
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions: RowAction<Inspection>[] = [
    {
      label: "详情",
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: "合格",
      icon: <CheckCircle style={{ width: 16, height: 16 }} />,
      color: "success",
      show: (row) => row.status === "待判定",
      onClick: (row) => handleQualify(row, true),
    },
    {
      label: "不合格",
      icon: <XCircle style={{ width: 16, height: 16 }} />,
      color: "error",
      show: (row) => row.status === "待判定",
      onClick: (row) => handleQualify(row, false),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: "type",
      label: "检验类型",
      type: "select",
      options: [
        { label: "全部", value: "all" },
        { label: "来料检验", value: "来料检验" },
        { label: "过程检验", value: "过程检验" },
        { label: "成品检验", value: "成品检验" },
      ],
      value: typeFilter,
      onChange: (value) => setTypeFilter(value),
    },
    {
      id: "status",
      label: "状态",
      type: "select",
      options: [
        { label: "全部", value: "all" },
        { label: "合格", value: "合格" },
        { label: "不合格", value: "不合格" },
        { label: "待判定", value: "待判定" },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value),
    },
  ];

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.product_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      inspection.inspection_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || inspection.inspection_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || inspection.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedData = filteredInspections.slice(
    page * pageSize,
    page * pageSize + pageSize,
  );

  const handleView = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      inspection_type: "来料检验",
      product_name: "",
      inspection_quantity: "",
      qualified_quantity: "",
      inspector: "",
    });
    setShowCreateModal(true);
  };

  const handleQualify = (inspection: Inspection, qualified: boolean) => {
    setInspections((prev) =>
      prev.map((i) =>
        i.id === inspection.id
          ? { ...i, status: qualified ? "合格" : "不合格" }
          : i,
      ),
    );
  };

  const handleSave = () => {
    const quantity = parseInt(formData.inspection_quantity) || 0;
    const qualified = parseInt(formData.qualified_quantity) || 0;
    const rate =
      quantity > 0 ? ((qualified / quantity) * 100).toFixed(1) + "%" : "0%";

    const newInspection: Inspection = {
      id: String(Date.now()),
      inspection_no: `IQ${Date.now()}`,
      inspection_type: formData.inspection_type,
      product_name: formData.product_name,
      inspection_quantity: quantity,
      qualified_quantity: qualified,
      qualification_rate: rate,
      inspector: formData.inspector,
      inspection_date: new Date().toISOString().split("T")[0],
      status: "待判定",
    };
    setInspections((prev) => [newInspection, ...prev]);
    setShowCreateModal(false);
  };

  const stats = {
    total: inspections.length,
    qualified: inspections.filter((i) => i.status === "合格").length,
    unqualified: inspections.filter((i) => i.status === "不合格").length,
    pending: inspections.filter((i) => i.status === "待判定").length,
  };

  const statsCards = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(4, 1fr)" },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: "#eff6ff" }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#bfdbfe",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClipboardCheck
                sx={{ width: 20, height: 20, color: "#3b82f6" }}
              />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                检验总数
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#dcfce7",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: "#16a34a" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                合格
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.qualified}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#fee2e2",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <XCircle sx={{ width: 20, height: 20, color: "#dc2626" }} />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                不合格
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.unqualified}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#fef3c7",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClipboardCheck
                sx={{ width: 20, height: 20, color: "#ca8a04" }}
              />
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "slate.600", fontSize: "0.875rem" }}
              >
                待判定
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "slate.900" }}
              >
                {stats.pending}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#3b82f6",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
      }}
    >
      <ListPageTemplate
        title="质量检验"
        subtitle="Quality Inspection"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "QMS" },
          { label: "质量检验" },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder="搜索产品名称或检验单号..."
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredInspections.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: "新建检验",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: "contained",
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建检验</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              select
              label="检验类型"
              value={formData.inspection_type}
              onChange={(e) =>
                setFormData({ ...formData, inspection_type: e.target.value })
              }
            >
              <option value="来料检验">来料检验</option>
              <option value="过程检验">过程检验</option>
              <option value="成品检验">成品检验</option>
            </TextField>
            <TextField
              fullWidth
              label="产品名称 *"
              value={formData.product_name}
              onChange={(e) =>
                setFormData({ ...formData, product_name: e.target.value })
              }
              placeholder="请输入产品名称"
            />
            <TextField
              fullWidth
              type="number"
              label="检验数量"
              value={formData.inspection_quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  inspection_quantity: e.target.value,
                })
              }
              placeholder="请输入检验数量"
            />
            <TextField
              fullWidth
              type="number"
              label="合格数量"
              value={formData.qualified_quantity}
              onChange={(e) =>
                setFormData({ ...formData, qualified_quantity: e.target.value })
              }
              placeholder="请输入合格数量"
            />
            <TextField
              fullWidth
              label="检验员"
              value={formData.inspector}
              onChange={(e) =>
                setFormData({ ...formData, inspector: e.target.value })
              }
              placeholder="请输入检验员姓名"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: "#3b82f6" }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>检验详情</DialogTitle>
        <DialogContent>
          {selectedInspection && (
            <Box
              sx={{
                pt: 2,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检验单号
                </Box>
                <Box sx={{ fontWeight: 500 }}>
                  {selectedInspection.inspection_no}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检验类型
                </Box>
                <Box>{selectedInspection.inspection_type}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  产品名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>
                  {selectedInspection.product_name}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检验日期
                </Box>
                <Box>{selectedInspection.inspection_date}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检验数量
                </Box>
                <Box>{selectedInspection.inspection_quantity}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  合格数量
                </Box>
                <Box>{selectedInspection.qualified_quantity}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  合格率
                </Box>
                <Box sx={{ fontWeight: 500, color: "#3b82f6" }}>
                  {selectedInspection.qualification_rate}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检验员
                </Box>
                <Box>{selectedInspection.inspector}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedInspection.status)}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QmsInspectionPage;
