import { Grid } from "@/components/Grid";
import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search as SearchIcon,
  ChevronRight,
  Star,
  ClipboardList,
  FileText,
  X,
  Edit,
  Trash2,
  Check,
  BarChart3,
  Building2,
  Award,
  DollarSign,
  ScrollText,
  Wallet,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Chip,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import type {
  Supplier,
  SupplierEvaluation,
  PurchaseOrder,
  SupplierContract,
  SrmDetailedStatistics,
  CreateSupplierRequest,
  CreateSupplierEvaluationRequest,
  CreatePurchaseOrderRequest,
  CreateSupplierContractRequest,
} from "../api/srm";
import { srmApi } from "../api/srm";
import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";
import type { ColumnDef } from "@tanstack/react-table";

type TabType =
  | "dashboard"
  | "suppliers"
  | "evaluations"
  | "orders"
  | "contracts"
  | "finance";
type ModalType = "create" | "edit" | null;

const Srmpage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [statistics, setStatistics] = useState<SrmDetailedStatistics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
      pending: "待处理",
      completed: "已完成",
      delivered: "已交付",
      cancelled: "已取消",
      processing: "处理中",
      draft: "草稿",
      expired: "已过期",
    };
    return statusMap[status] || status;
  };

  const mapStatusToEnglish = (status: string): string => {
    const statusMap: Record<string, string> = {
      启用: "active",
      禁用: "inactive",
      待处理: "pending",
      已完成: "completed",
      已交付: "delivered",
      已取消: "cancelled",
      处理中: "processing",
      草稿: "draft",
      已过期: "expired",
    };
    return statusMap[status] || status;
  };

  const adaptSupplier = (item: any): any => ({
    ...item,
    supplier_no: item.supplier_no || item.supplierNo || "",
    contact_phone: item.phone || item.contactPhone || item.contact_phone || "",
    status: mapStatusToChinese(item.status),
  });

  const adaptEvaluation = (item: any): any => ({
    ...item,
    eval_no: item.evaluation_no || item.evalNo || "",
    evaluation_no: item.evaluation_no || item.evalNo || "",
    evaluation_date: item.evaluation_date || item.evalDate || item.updated_at,
    status: mapStatusToChinese(item.status),
  });

  const adaptOrder = (item: any): any => ({
    ...item,
    po_no: item.po_no || item.orderNo || "",
    expected_date:
      item.expected_date || item.deliveryDate || item.delivery_date,
    status: mapStatusToChinese(item.status),
  });

  const adaptContract = (item: any): any => ({
    ...item,
    contract_no: item.contract_no || "",
    status: mapStatusToChinese(item.status),
  });

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === "dashboard") {
        const response = await srmApi.getDetailedStatistics();
        if (response.success && response.data) {
          setStatistics(response.data);
        }
      } else if (activeTab === "suppliers") {
        const response = await srmApi.listSuppliers();
        if (response.success && response.data) {
          const data: any = response.data;
          const rawItems: any[] = Array.isArray(data)
            ? data
            : data.suppliers || [];
          setSuppliers(rawItems.map((item) => adaptSupplier(item)));
        } else {
          setSuppliers([]);
        }
      } else if (activeTab === "evaluations") {
        const response = await srmApi.listEvaluations();
        if (response.success && response.data) {
          const data: any = response.data;
          const rawItems: any[] = Array.isArray(data)
            ? data
            : data.evaluations || [];
          setEvaluations(rawItems.map((item) => adaptEvaluation(item)));
        } else {
          setEvaluations([]);
        }
      } else if (activeTab === "orders") {
        const response = await srmApi.listPurchaseOrders();
        if (response.success && response.data) {
          const data: any = response.data;
          const rawItems: any[] = Array.isArray(data)
            ? data
            : data.purchase_orders || [];
          setOrders(rawItems.map((item) => adaptOrder(item)));
        } else {
          setOrders([]);
        }
      } else if (activeTab === "contracts") {
        const response = await srmApi.listContracts();
        if (response.success && response.data) {
          const data: any = response.data;
          const rawItems: any[] = Array.isArray(data)
            ? data
            : data.contracts || [];
          setContracts(rawItems.map((item) => adaptContract(item)));
        } else {
          setContracts([]);
        }
      }
    } catch (err) {
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleCreate = async () => {
    try {
      if (activeTab === "suppliers") {
        const req: CreateSupplierRequest = {
          supplier_no: formData.supplier_no || "",
          name: formData.name || "",
          contact_person: formData.contact_person || "",
          phone: formData.contact_phone || "",
          email: formData.email || "",
          address: formData.address || "",
          category: formData.category || "",
          status: mapStatusToEnglish(formData.status || "active"),
          risk_level: formData.risk_level || "medium",
          legal_name: formData.name || "",
          tax_id: formData.tax_id || "",
          website: formData.website || "",
          credit_rating: formData.credit_rating || "",
        };
        await srmApi.createSupplier(req);
      } else if (activeTab === "evaluations") {
        const req: CreateSupplierEvaluationRequest = {
          evaluation_no: formData.evaluation_no || "",
          supplier_id: formData.supplier_id || suppliers[0]?.id || "",
          evaluator: formData.evaluator || "",
          quality_score: parseFloat(formData.quality_score || "0"),
          delivery_score: parseFloat(formData.delivery_score || "0"),
          service_score: parseFloat(formData.service_score || "0"),
          price_score: parseFloat(formData.price_score || "0"),
          overall_score: parseFloat(formData.overall_score || "0"),
          comments: formData.comments || "",
          status: mapStatusToEnglish(formData.status || "completed"),
        };
        await srmApi.createEvaluation(req);
      } else if (activeTab === "orders") {
        const req: CreatePurchaseOrderRequest = {
          po_no: formData.po_no || "",
          supplier_id: formData.supplier_id || suppliers[0]?.id || "",
          expected_date: formData.expected_date,
          total_amount: parseFloat(formData.total_amount || "0"),
          currency: "CNY",
          status: mapStatusToEnglish(formData.status || "pending"),
          remarks: formData.remarks || "",
        };
        await srmApi.createPurchaseOrder(req);
      } else if (activeTab === "contracts") {
        const req: CreateSupplierContractRequest = {
          contract_no: formData.contract_no || "",
          supplier_id: formData.supplier_id || suppliers[0]?.id || "",
          supplier_name: formData.supplier_name || "",
          title: formData.title || "",
          contract_type: formData.contract_type || "purchase",
          total_amount: parseFloat(formData.total_amount || "0"),
          currency: formData.currency || "CNY",
          sign_date: formData.sign_date,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: mapStatusToEnglish(formData.status || "active"),
          remarks: formData.remarks || "",
        };
        await srmApi.createContract(req);
      }
      showNotification("success", "创建成功");
      resetModal();
      loadData();
    } catch (err) {
      showNotification("error", "创建失败: " + (err as Error).message);
      console.error("创建失败:", err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;

      if (activeTab === "suppliers") {
        const req: CreateSupplierRequest = {
          supplier_no: formData.supplier_no || editingItem.supplier_no,
          name: formData.name || editingItem.name,
          contact_person: formData.contact_person || editingItem.contact_person,
          phone: formData.contact_phone || editingItem.phone,
          email: formData.email || editingItem.email,
          address: formData.address || editingItem.address,
          category: formData.category || editingItem.category,
          status: mapStatusToEnglish(formData.status || editingItem.status),
          risk_level: formData.risk_level || editingItem.risk_level || "medium",
          legal_name:
            formData.legal_name ||
            editingItem.legal_name ||
            formData.name ||
            editingItem.name,
          tax_id: formData.tax_id || editingItem.tax_id || "",
          website: formData.website || editingItem.website || "",
          credit_rating:
            formData.credit_rating || editingItem.credit_rating || "",
        };
        await srmApi.updateSupplier(editingItem.id, req);
      } else if (activeTab === "evaluations") {
        const req: CreateSupplierEvaluationRequest = {
          evaluation_no: formData.evaluation_no || editingItem.evaluation_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          evaluator: formData.evaluator || editingItem.evaluator || "",
          quality_score: parseFloat(
            formData.quality_score ||
              editingItem.quality_score?.toString() ||
              "0",
          ),
          delivery_score: parseFloat(
            formData.delivery_score ||
              editingItem.delivery_score?.toString() ||
              "0",
          ),
          service_score: parseFloat(
            formData.service_score ||
              editingItem.service_score?.toString() ||
              "0",
          ),
          price_score: parseFloat(
            formData.price_score || editingItem.price_score?.toString() || "0",
          ),
          overall_score: parseFloat(
            formData.overall_score ||
              editingItem.overall_score?.toString() ||
              "0",
          ),
          comments: formData.comments || editingItem.comments,
          status: mapStatusToEnglish(formData.status || editingItem.status),
        };
        await srmApi.updateEvaluation(editingItem.id, req);
      } else if (activeTab === "orders") {
        const req: CreatePurchaseOrderRequest = {
          po_no: formData.po_no || editingItem.po_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          expected_date: formData.expected_date || editingItem.expected_date,
          total_amount: parseFloat(
            formData.total_amount ||
              editingItem.total_amount?.toString() ||
              "0",
          ),
          currency: "CNY",
          status: mapStatusToEnglish(formData.status || editingItem.status),
          remarks: formData.remarks || editingItem.remarks,
        };
        await srmApi.updatePurchaseOrder(editingItem.id, req);
      } else if (activeTab === "contracts") {
        const req: CreateSupplierContractRequest = {
          contract_no: formData.contract_no || editingItem.contract_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          supplier_name:
            formData.supplier_name || editingItem.supplier_name || "",
          title: formData.title || editingItem.title,
          contract_type:
            formData.contract_type || editingItem.contract_type || "purchase",
          total_amount: parseFloat(
            formData.total_amount ||
              editingItem.total_amount?.toString() ||
              "0",
          ),
          currency: formData.currency || editingItem.currency || "CNY",
          sign_date: formData.sign_date || editingItem.sign_date,
          start_date: formData.start_date || editingItem.start_date,
          end_date: formData.end_date || editingItem.end_date,
          status: mapStatusToEnglish(formData.status || editingItem.status),
          remarks: formData.remarks || editingItem.remarks,
        };
        await srmApi.updateContract(editingItem.id, req);
      }
      showNotification("success", "更新成功");
      resetModal();
      loadData();
    } catch (err) {
      showNotification("error", "更新失败");
      console.error("更新失败:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return;

    try {
      if (activeTab === "suppliers") {
        await srmApi.deleteSupplier(id);
      } else if (activeTab === "evaluations") {
        await srmApi.deleteEvaluation(id);
      } else if (activeTab === "orders") {
        await srmApi.deletePurchaseOrder(id);
      } else if (activeTab === "contracts") {
        await srmApi.deleteContract(id);
      }
      showNotification("success", "删除成功");
      loadData();
    } catch (err) {
      showNotification("error", "删除失败");
      console.error("删除失败:", err);
    }
  };

  const openCreateModal = () => {
    setModalType("create");
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType("edit");
    setEditingItem(item);
    setFormData({
      ...item,
      contact_phone: item.contact_phone || item.phone,
      expected_date: item.expected_date || item.delivery_date,
    });
    setShowModal(true);
  };

  const getStatusStyle = (status: string) => {
    if (!status) return { bgcolor: "#f1f5f9", color: "#475569" };
    const s = status.toLowerCase();
    if (
      s.includes("active") ||
      s.includes("completed") ||
      s.includes("delivered") ||
      s.includes("启用") ||
      s.includes("完成")
    ) {
      return { bgcolor: "#dcfce7", color: "#15803d" };
    }
    if (
      s.includes("pending") ||
      s.includes("待处理") ||
      s.includes("processing") ||
      s.includes("处理中")
    ) {
      return { bgcolor: "#fef3c7", color: "#b45309" };
    }
    if (
      s.includes("inactive") ||
      s.includes("cancelled") ||
      s.includes("禁用") ||
      s.includes("取消") ||
      s.includes("expired") ||
      s.includes("过期")
    ) {
      return { bgcolor: "#fee2e2", color: "#b91c1c" };
    }
    return { bgcolor: "#f1f5f9", color: "#475569" };
  };

  const getScoreStyle = (score: number | undefined) => {
    if (!score) return { bgcolor: "#f1f5f9", color: "#475569" };
    if (score >= 80) return { bgcolor: "#dcfce7", color: "#15803d" };
    if (score >= 60) return { bgcolor: "#fef3c7", color: "#b45309" };
    return { bgcolor: "#fee2e2", color: "#b91c1c" };
  };

  const getRiskStyle = (level: string) => {
    if (level === "low")
      return { bgcolor: "#dcfce7", color: "#15803d", label: "低" };
    if (level === "medium")
      return { bgcolor: "#fef3c7", color: "#b45309", label: "中" };
    return { bgcolor: "#fee2e2", color: "#b91c1c", label: "高" };
  };

  const StatusChip: React.FC<{ status: string }> = ({ status }) => {
    const style = getStatusStyle(status);
    return (
      <Chip
        label={status}
        size="small"
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const ScoreChip: React.FC<{ score: number | undefined }> = ({ score }) => {
    const style = getScoreStyle(score);
    return (
      <Chip
        label={score?.toFixed(1) || "-"}
        size="small"
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const RiskChip: React.FC<{ level: string }> = ({ level }) => {
    const style = getRiskStyle(level);
    return (
      <Chip
        label={style.label}
        size="small"
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchSearch =
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.supplier_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredEvaluations = evaluations.filter((e) => {
    const matchSearch =
      !searchQuery ||
      e.evaluation_no?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      !searchQuery ||
      o.po_no?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.contract_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const supplierColumns: ColumnDef<any>[] = [
    { accessorKey: "supplier_no", header: "编号" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "contact_person", header: "联系人" },
    { accessorKey: "contact_phone", header: "电话" },
    { accessorKey: "category", header: "类别" },
    {
      accessorKey: "risk_level",
      header: "风险等级",
      cell: ({ row }) => <RiskChip level={row.original.risk_level} />,
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <StatusChip status={row.original.status} />,
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate(`/srm/suppliers/${row.original.id}`)}
          >
            <Eye size={16} />
          </IconButton>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => openEditModal(row.original)}
          >
            <Edit size={16} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(row.original.id, row.original.name)}
          >
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const evaluationColumns: ColumnDef<any>[] = [
    { accessorKey: "evaluation_no", header: "编号" },
    {
      accessorKey: "supplier_id",
      header: "供应商ID",
      cell: ({ row }) => (
        <Typography variant="caption">
          {row.original.supplier_id?.slice(0, 8)}...
        </Typography>
      ),
    },
    {
      accessorKey: "overall_score",
      header: "综合评分",
      cell: ({ row }) => <ScoreChip score={row.original.overall_score} />,
    },
    {
      accessorKey: "quality_score",
      header: "质量",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.quality_score?.toFixed(1) || "-"}
        </Typography>
      ),
    },
    {
      accessorKey: "delivery_score",
      header: "交付",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.delivery_score?.toFixed(1) || "-"}
        </Typography>
      ),
    },
    {
      accessorKey: "evaluation_date",
      header: "评估日期",
      cell: ({ row }) => (
        <Typography variant="body2">
          {new Date(row.original.evaluation_date).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <StatusChip status={row.original.status} />,
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => openEditModal(row.original)}
          >
            <Edit size={16} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() =>
              handleDelete(row.original.id, row.original.evaluation_no)
            }
          >
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const orderColumns: ColumnDef<any>[] = [
    { accessorKey: "po_no", header: "订单号" },
    {
      accessorKey: "supplier_id",
      header: "供应商ID",
      cell: ({ row }) => (
        <Typography variant="caption">
          {row.original.supplier_id?.slice(0, 8)}...
        </Typography>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "总金额",
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={500}>
          ¥{row.original.total_amount?.toFixed(2) || "0.00"}
        </Typography>
      ),
    },
    {
      accessorKey: "expected_date",
      header: "预计交付",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.expected_date
            ? new Date(row.original.expected_date).toLocaleDateString()
            : "-"}
        </Typography>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <StatusChip status={row.original.status} />,
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => openEditModal(row.original)}
          >
            <Edit size={16} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(row.original.id, row.original.po_no)}
          >
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const contractColumns: ColumnDef<any>[] = [
    { accessorKey: "contract_no", header: "合同号" },
    { accessorKey: "title", header: "合同标题" },
    { accessorKey: "contract_type", header: "类型" },
    {
      accessorKey: "total_amount",
      header: "金额",
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={500}>
          ¥{row.original.total_amount?.toFixed(2) || "0.00"}
        </Typography>
      ),
    },
    {
      accessorKey: "start_date",
      header: "开始日期",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.start_date
            ? new Date(row.original.start_date).toLocaleDateString()
            : "-"}
        </Typography>
      ),
    },
    {
      accessorKey: "end_date",
      header: "结束日期",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.end_date
            ? new Date(row.original.end_date).toLocaleDateString()
            : "-"}
        </Typography>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <StatusChip status={row.original.status} />,
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => openEditModal(row.original)}
          >
            <Edit size={16} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(row.original.id, row.original.title)}
          >
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "dashboard", label: "统计面板", icon: <BarChart3 size={18} /> },
    { id: "suppliers", label: "供应商", icon: <Users size={18} /> },
    { id: "evaluations", label: "供应商评估", icon: <Star size={18} /> },
    { id: "orders", label: "采购订单", icon: <ClipboardList size={18} /> },
    { id: "contracts", label: "供应商合同", icon: <FileText size={18} /> },
    { id: "finance", label: "财务", icon: <Wallet size={18} /> },
  ];

  const getModalTitle = () => {
    const action = modalType === "create" ? "新建" : "编辑";
    if (activeTab === "suppliers") return action + "供应商";
    if (activeTab === "evaluations") return action + "供应商评估";
    if (activeTab === "orders") return action + "采购订单";
    if (activeTab === "contracts") return action + "供应商合同";
    return action;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #faf5ff 100%)",
      }}
    >
      <Paper
        elevation={0}
        square
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ height: 64 }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton onClick={() => navigate("/dashboard")} size="small">
                <ChevronRight style={{ transform: "rotate(180deg)" }} />
              </IconButton>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users color="white" size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    供应商关系管理
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supplier Relationship Management
                  </Typography>
                </Box>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Plus size={16} />}
                onClick={openCreateModal}
              >
                新建
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={notification?.type === "success" ? "success" : "error"}
          onClose={() => setNotification(null)}
          icon={
            notification?.type === "success" ? <Check size={20} /> : undefined
          }
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Box
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 1.5,
            border: 1,
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 48, px: 1 }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                icon={tab.icon as React.ReactElement}
                iconPosition="start"
                sx={{ minHeight: 48, fontWeight: 500 }}
              />
            ))}
          </Tabs>
        </Paper>

        {activeTab === "dashboard" && statistics && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <MetricCard
                  title="供应商总数"
                  value={statistics.basic.total_suppliers}
                  icon={<Users size={24} />}
                  gradient={["#6366F1", "#8B5CF6"]}
                  subtitle={`${statistics.basic.active_suppliers} 个启用中`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <MetricCard
                  title="平均评分"
                  value={statistics.basic.avg_score.toFixed(1)}
                  icon={<Award size={24} />}
                  gradient={["#F59E0B", "#D97706"]}
                  subtitle={`${statistics.basic.total_evaluations} 次评估`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <MetricCard
                  title="采购订单"
                  value={statistics.basic.total_orders}
                  icon={<ClipboardList size={24} />}
                  gradient={["#10B981", "#059669"]}
                  subtitle={`${statistics.basic.pending_orders} 个待处理`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <MetricCard
                  title="订单总额"
                  value={`¥${statistics.basic.total_order_amount.toLocaleString()}`}
                  icon={<DollarSign size={24} />}
                  gradient={["#14B8A6", "#0D9488"]}
                  subtitle={`${statistics.basic.completed_orders} 个已完成`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <MetricCard
                  title="合同总数"
                  value={statistics.basic.total_contracts}
                  icon={<ScrollText size={24} />}
                  gradient={["#EC4899", "#DB2777"]}
                  subtitle={`${statistics.basic.active_contracts} 个有效`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <MetricCard
                  title="供应商分类"
                  value={statistics.supplier_by_category.length}
                  icon={<Building2 size={24} />}
                  gradient={["#8B5CF6", "#7C3AED"]}
                  subtitle="类别数量"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} lg={6}>
                <StatsChart
                  title="供应商状态分布"
                  type="pie"
                  data={statistics.supplier_by_status.map((s) => ({
                    name: mapStatusToChinese(s.status),
                    value: s.count,
                    color: s.status === "active" ? "#10B981" : "#6B7280",
                  }))}
                  yKey="value"
                  xKey="name"
                />
              </Grid>
              <Grid item xs={12} lg={6}>
                <StatsChart
                  title="订单状态分布"
                  type="pie"
                  data={statistics.order_by_status.map((s) => ({
                    name: mapStatusToChinese(s.status),
                    value: s.count,
                  }))}
                  yKey="value"
                  xKey="name"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} lg={6}>
                <StatsChart
                  title="评估分数分布"
                  type="bar"
                  data={statistics.evaluation_score_distribution.map((s) => ({
                    name: s.range,
                    value: s.count,
                  }))}
                  yKey="value"
                  xKey="name"
                />
              </Grid>
              <Grid item xs={12} lg={6}>
                <StatsChart
                  title="月度订单趋势"
                  type="line"
                  data={statistics.monthly_order_trend.map((t) => ({
                    name: t.month,
                    value: t.order_count,
                    amount: t.total_amount,
                  }))}
                  yKey="value"
                  xKey="name"
                />
              </Grid>
            </Grid>

            {statistics.contract_by_status.length > 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                  <StatsChart
                    title="合同状态分布"
                    type="pie"
                    data={statistics.contract_by_status.map((s) => ({
                      name: mapStatusToChinese(s.status),
                      value: s.count,
                    }))}
                    yKey="value"
                    xKey="name"
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {activeTab !== "dashboard" && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 1.5,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                spacing={2}
              >
                <Typography variant="h6" fontWeight={600}>
                  {activeTab === "suppliers" && "供应商列表"}
                  {activeTab === "evaluations" && "供应商评估记录"}
                  {activeTab === "orders" && "采购订单列表"}
                  {activeTab === "contracts" && "供应商合同列表"}
                  {activeTab === "finance" && "应付账款管理"}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    size="small"
                    select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="all">全部状态</MenuItem>
                    <MenuItem value="启用">启用</MenuItem>
                    <MenuItem value="禁用">禁用</MenuItem>
                    <MenuItem value="待处理">待处理</MenuItem>
                    <MenuItem value="已完成">已完成</MenuItem>
                    <MenuItem value="处理中">处理中</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    placeholder="搜索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 256 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon size={18} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ p: 2 }}>
              {activeTab === "suppliers" && (
                <DataTable
                  columns={supplierColumns}
                  data={filteredSuppliers}
                  searchKey="name"
                  searchPlaceholder="搜索供应商名称..."
                  loading={loading}
                  exportFileName="srm-suppliers"
                />
              )}
              {activeTab === "evaluations" && (
                <DataTable
                  columns={evaluationColumns}
                  data={filteredEvaluations}
                  searchKey="evaluation_no"
                  searchPlaceholder="搜索评估编号..."
                  loading={loading}
                  exportFileName="srm-evaluations"
                />
              )}
              {activeTab === "orders" && (
                <DataTable
                  columns={orderColumns}
                  data={filteredOrders}
                  searchKey="po_no"
                  searchPlaceholder="搜索订单编号..."
                  loading={loading}
                  exportFileName="srm-orders"
                />
              )}
              {activeTab === "contracts" && (
                <DataTable
                  columns={contractColumns}
                  data={filteredContracts}
                  searchKey="title"
                  searchPlaceholder="搜索合同标题..."
                  loading={loading}
                  exportFileName="srm-contracts"
                />
              )}
              {activeTab === "finance" && <SrmFinanceTab />}
            </Box>
          </Paper>
        )}
      </Box>

      <Dialog
        open={showModal}
        onClose={resetModal}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={600}>
              {getModalTitle()}
            </Typography>
            <IconButton onClick={resetModal} size="small">
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {activeTab === "suppliers" && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="编号 *"
                      value={formData.supplier_no || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_no: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="名称 *"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="联系人"
                      value={formData.contact_person || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_person: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="电话"
                      value={formData.contact_phone || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_phone: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="邮箱"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="类别 *"
                      value={formData.category || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="风险等级"
                      value={formData.risk_level || "medium"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          risk_level: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="low">低风险</MenuItem>
                      <MenuItem value="medium">中风险</MenuItem>
                      <MenuItem value="high">高风险</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="状态"
                      value={formData.status || "启用"}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <MenuItem value="启用">启用</MenuItem>
                      <MenuItem value="禁用">禁用</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="地址"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </Stack>
            )}

            {activeTab === "evaluations" && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="评估编号 *"
                      value={formData.evaluation_no || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          evaluation_no: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="供应商 *"
                      value={formData.supplier_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="">请选择供应商</MenuItem>
                      {suppliers.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="质量评分"
                      value={formData.quality_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quality_score: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="交付评分"
                      value={formData.delivery_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          delivery_score: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="服务评分"
                      value={formData.service_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          service_score: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="价格评分"
                      value={formData.price_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_score: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="综合评分"
                      value={formData.overall_score || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overall_score: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="状态"
                      value={formData.status || "已完成"}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <MenuItem value="草稿">草稿</MenuItem>
                      <MenuItem value="已完成">已完成</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="备注"
                  value={formData.comments || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                />
              </Stack>
            )}

            {activeTab === "orders" && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="订单号 *"
                      value={formData.po_no || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, po_no: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="供应商 *"
                      value={formData.supplier_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="">请选择供应商</MenuItem>
                      {suppliers.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="总金额"
                      value={formData.total_amount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_amount: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="预计交付日期"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={formData.expected_date?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expected_date: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="状态"
                      value={formData.status || "待处理"}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <MenuItem value="待处理">待处理</MenuItem>
                      <MenuItem value="处理中">处理中</MenuItem>
                      <MenuItem value="已完成">已完成</MenuItem>
                      <MenuItem value="已交付">已交付</MenuItem>
                      <MenuItem value="已取消">已取消</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="备注"
                  value={formData.remarks || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </Stack>
            )}

            {activeTab === "contracts" && (
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="合同号 *"
                      value={formData.contract_no || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contract_no: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="供应商 *"
                      value={formData.supplier_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="">请选择供应商</MenuItem>
                      {suppliers.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="合同标题 *"
                      value={formData.title || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="合同类型"
                      value={formData.contract_type || "purchase"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contract_type: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="purchase">采购合同</MenuItem>
                      <MenuItem value="service">服务合同</MenuItem>
                      <MenuItem value="framework">框架协议</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="合同金额"
                      value={formData.total_amount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_amount: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="date"
                      label="签订日期"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={formData.sign_date?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sign_date: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="date"
                      label="生效日期"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={formData.start_date?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="date"
                      label="到期日期"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={formData.end_date?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="状态"
                      value={formData.status || "启用"}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <MenuItem value="启用">启用</MenuItem>
                      <MenuItem value="草稿">草稿</MenuItem>
                      <MenuItem value="已过期">已过期</MenuItem>
                      <MenuItem value="已取消">已取消</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="备注"
                  value={formData.remarks || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={resetModal} variant="outlined">
            取消
          </Button>
          <Button
            onClick={modalType === "create" ? handleCreate : handleEdit}
            variant="contained"
            color="secondary"
            startIcon={<Check size={16} />}
          >
            {modalType === "create" ? "创建" : "保存"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// SRM财务Tab组件
const SrmFinanceTab: React.FC = () => {
  const [financeTab, setFinanceTab] = useState<
    "invoices" | "payments" | "aging"
  >("invoices");

  const financeTabs: Array<{
    id: "invoices" | "payments" | "aging";
    label: string;
  }> = [
    { id: "invoices", label: "采购发票" },
    { id: "payments", label: "付款申请" },
    { id: "aging", label: "账龄分析" },
  ];

  return (
    <Stack spacing={3}>
      {/* 子Tab切换 */}
      <Paper elevation={0} sx={{ borderRadius: 1, p: 0.5, bgcolor: "grey.50" }}>
        <Tabs
          value={financeTab}
          onChange={(_, v) => setFinanceTab(v)}
          variant="fullWidth"
          sx={{ minHeight: 40 }}
        >
          {financeTabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={tab.label}
              sx={{ minHeight: 40, fontWeight: 500 }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* 发票列表 */}
      {financeTab === "invoices" && (
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: 1.5 }}>
            采购发票模块 - 显示供应商采购发票列表，支持发票确认、验证等操作
          </Alert>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 1.5, overflow: "hidden" }}
          >
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">暂无发票数据</Typography>
            </Box>
          </Paper>
        </Stack>
      )}

      {/* 付款申请列表 */}
      {financeTab === "payments" && (
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: 1.5 }}>
            付款申请模块 - 管理供应商付款申请，支持提交、审批、支付确认等操作
          </Alert>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 1.5, overflow: "hidden" }}
          >
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">暂无付款申请数据</Typography>
            </Box>
          </Paper>
        </Stack>
      )}

      {/* 账龄分析 */}
      {financeTab === "aging" && (
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: 1.5 }}>
            应付账龄分析 - 分析供应商应付账款账龄，提供风险预警
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: "#dcfce7",
                }}
              >
                <Typography variant="caption" color="#15803d">
                  正常
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color="#15803d"
                  mt={1}
                >
                  ¥0
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: "#fef3c7",
                }}
              >
                <Typography variant="caption" color="#b45309">
                  30天内
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color="#b45309"
                  mt={1}
                >
                  ¥0
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: "#ffedd5",
                }}
              >
                <Typography variant="caption" color="#c2410c">
                  60天内
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color="#c2410c"
                  mt={1}
                >
                  ¥0
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: "#fee2e2",
                }}
              >
                <Typography variant="caption" color="#b91c1c">
                  90天以上
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color="#b91c1c"
                  mt={1}
                >
                  ¥0
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 1.5, overflow: "hidden" }}
          >
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">暂无账龄数据</Typography>
            </Box>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
};

export default Srmpage;
