import React, { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Search,
  ChevronRight,
  Factory,
  ClipboardList,
  TrendingUp,
  Activity,
  Loader2,
  X,
  Edit,
  Trash2,
  Check,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  ProductionProcess,
  ProductionStep,
  ProductionFormula,
  ProductionBatch,
  PdmStatistics,
} from "../api/pdm";
import {
  pdmApi,
  CreateProductionProcessRequest,
  CreateProductionStepRequest,
  CreateProductionFormulaRequest,
  CreateProductionBatchRequest,
} from "../api/pdm";
import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";
import type { ColumnDef } from "@tanstack/react-table";

type TabType = "processes" | "steps" | "formulas" | "batches" | "stats";

type ModalType = "create" | "edit" | null;

const Pdmpage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("processes");
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [formulas, setFormulas] = useState<ProductionFormula[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [stats, setStats] = useState<PdmStatistics>({
    total_processes: 0,
    active_processes: 0,
    total_formulas: 0,
    active_formulas: 0,
    total_batches: 0,
    planning_batches: 0,
    in_progress_batches: 0,
    completed_batches: 0,
    cancelled_batches: 0,
    total_steps: 0,
    total_output_quantity: 0,
    total_reject_quantity: 0,
    average_pass_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
      planning: "规划中",
      in_progress: "进行中",
      paused: "已暂停",
      completed: "已完成",
      cancelled: "已取消",
    };
    return statusMap[status] || status;
  };

  const adaptProcess = (item: any): any => {
    return {
      ...item,
      version: item.version || "1.0",
      status: mapStatusToChinese(item.status),
    };
  };

  const adaptStep = (item: any): any => {
    return {
      ...item,
      sort_order: item.sort_order || item.order || 0,
      duration: item.duration || 0,
      status: mapStatusToChinese(item.status),
    };
  };

  const adaptFormula = (item: any): any => {
    return {
      ...item,
      product_name: item.name || "",
      version: item.version || "1.0",
      status: mapStatusToChinese(item.status),
    };
  };

  const adaptBatch = (item: any): any => {
    return {
      ...item,
      quantity: item.planned_quantity || item.actual_quantity || 0,
      start_date: item.start_date || item.created_at,
      status: mapStatusToChinese(item.status),
    };
  };

  const loadStatistics = async () => {
    try {
      const response = await pdmApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "processes") {
        const response = await pdmApi.listProcesses();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.processes && Array.isArray(data.processes)) {
            rawItems = data.processes;
          }
          const adapted = rawItems.map((item) => adaptProcess(item));
          setProcesses(adapted);
        } else {
          setProcesses([]);
        }
      } else if (activeTab === "steps") {
        const response = await pdmApi.listSteps();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.steps && Array.isArray(data.steps)) {
            rawItems = data.steps;
          }
          const adapted = rawItems.map((item) => adaptStep(item));
          setSteps(adapted);
        } else {
          setSteps([]);
        }
      } else if (activeTab === "formulas") {
        const response = await pdmApi.listFormulas();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.formulas && Array.isArray(data.formulas)) {
            rawItems = data.formulas;
          }
          const adapted = rawItems.map((item) => adaptFormula(item));
          setFormulas(adapted);
        } else {
          setFormulas([]);
        }
      } else if (activeTab === "batches") {
        const response = await pdmApi.listBatches();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.batches && Array.isArray(data.batches)) {
            rawItems = data.batches;
          }
          const adapted = rawItems.map((item) => adaptBatch(item));
          setBatches(adapted);
        } else {
          setBatches([]);
        }
      } else if (activeTab === "stats") {
        await Promise.all([
          loadStatistics(),
          pdmApi.listProcesses().then((res) => {
            if (res.success && res.data) {
              let data: any = res.data;
              let rawItems: any[] = [];
              if (Array.isArray(data)) rawItems = data;
              else if (data.processes && Array.isArray(data.processes))
                rawItems = data.processes;
              setProcesses(rawItems.map((item) => adaptProcess(item)));
            }
          }),
          pdmApi.listSteps().then((res) => {
            if (res.success && res.data) {
              let data: any = res.data;
              let rawItems: any[] = [];
              if (Array.isArray(data)) rawItems = data;
              else if (data.steps && Array.isArray(data.steps))
                rawItems = data.steps;
              setSteps(rawItems.map((item) => adaptStep(item)));
            }
          }),
          pdmApi.listFormulas().then((res) => {
            if (res.success && res.data) {
              let data: any = res.data;
              let rawItems: any[] = [];
              if (Array.isArray(data)) rawItems = data;
              else if (data.formulas && Array.isArray(data.formulas))
                rawItems = data.formulas;
              setFormulas(rawItems.map((item) => adaptFormula(item)));
            }
          }),
          pdmApi.listBatches().then((res) => {
            if (res.success && res.data) {
              let data: any = res.data;
              let rawItems: any[] = [];
              if (Array.isArray(data)) rawItems = data;
              else if (data.batches && Array.isArray(data.batches))
                rawItems = data.batches;
              setBatches(rawItems.map((item) => adaptBatch(item)));
            }
          }),
        ]);
      }
    } catch (err) {
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleCreate = async () => {
    try {
      if (activeTab === "processes") {
        const req: any = {
          process_no: formData.process_no || "",
          name: formData.name || "",
          description: formData.description || null,
          version: formData.version || "1.0",
          status: formData.status || "active",
        };
        await pdmApi.createProcess(req);
      } else if (activeTab === "steps") {
        const req: any = {
          step_no: formData.step_no || "",
          process_id: formData.process_id,
          name: formData.name || "",
          description: null,
          duration: null,
          equipment_required: null,
          sort_order: parseInt(formData.order || "0"),
        };
        await pdmApi.createStep(req);
      } else if (activeTab === "formulas") {
        const req: any = {
          formula_no: formData.formula_no || "",
          name: formData.name || "",
          description: null,
          version: formData.version || "1.0",
          process_id: null,
          status: formData.status || "active",
        };
        await pdmApi.createFormula(req);
      } else if (activeTab === "batches") {
        const req: any = {
          batch_no: formData.batch_no || "",
          product_name: "产品",
          formula_id: formData.formula_id || null,
          process_id: null,
          planned_quantity: parseFloat(formData.quantity || "0"),
          unit: formData.unit || null,
          status: formData.status || "planning",
          operator: null,
          remarks: null,
        };
        await pdmApi.createBatch(req);
      }
      showNotification("success", "创建成功");
      resetModal();
      loadData();
    } catch (err) {
      showNotification("error", "创建失败");
      console.error("创建失败:", err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;

      if (activeTab === "processes") {
        const req: any = {
          process_no: formData.process_no || editingItem.process_no,
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          version: formData.version || editingItem.version,
          status: formData.status || editingItem.status,
        };
        await pdmApi.updateProcess(editingItem.id, req);
      } else if (activeTab === "steps") {
        const req: any = {
          step_no: formData.step_no || editingItem.step_no,
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          duration_hours: formData.duration_hours || editingItem.duration_hours,
          equipment_required:
            formData.equipment_required || editingItem.equipment_required,
          sort_order: formData.sort_order || editingItem.sort_order,
        };
        await pdmApi.updateStep(editingItem.id, req);
      } else if (activeTab === "formulas") {
        const req: any = {
          formula_no: formData.formula_no || editingItem.formula_no,
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          version: formData.version || editingItem.version,
          status: formData.status || editingItem.status,
        };
        await pdmApi.updateFormula(editingItem.id, req);
      } else if (activeTab === "batches") {
        const req: any = {
          batch_no: formData.batch_no || editingItem.batch_no,
          status: formData.status || editingItem.status,
        };
        await pdmApi.updateBatch(editingItem.id, req);
      }
      showNotification("success", "更新成功");
      resetModal();
      loadData();
    } catch (err) {
      showNotification("error", "更新失败");
      console.error("更新失败:", err);
    }
  };

  const safeProcesses = Array.isArray(processes) ? processes : [];
  const safeSteps = Array.isArray(steps) ? steps : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];
  const safeBatches = Array.isArray(batches) ? batches : [];

  const handleDelete = async (id: string) => {
    try {
      if (activeTab === "processes") {
        await pdmApi.deleteProcess(id);
      } else if (activeTab === "steps") {
        await pdmApi.deleteStep(id);
      } else if (activeTab === "formulas") {
        await pdmApi.deleteFormula(id);
      } else if (activeTab === "batches") {
        await pdmApi.deleteBatch(id);
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
      parameters: item.parameters
        ? JSON.stringify(item.parameters, null, 2)
        : "",
      components: item.components
        ? JSON.stringify(item.components, null, 2)
        : "",
    });
    setShowModal(true);
  };

  const tabs = [
    { id: "processes", label: "生产工艺", icon: Factory },
    { id: "steps", label: "生产工序", icon: ClipboardList },
    { id: "formulas", label: "生产配方", icon: Package },
    { id: "batches", label: "生产批次", icon: Activity },
    { id: "stats", label: "生产统计", icon: TrendingUp },
  ];

  const getStatusColor = (status: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = status.toLowerCase();
    if (
      s.includes("active") ||
      s.includes("completed") ||
      s.includes("完成") ||
      s.includes("启用")
    )
      return "bg-green-100 text-green-800";
    if (
      s.includes("inactive") ||
      s.includes("cancelled") ||
      s.includes("取消") ||
      s.includes("禁用")
    )
      return "bg-red-100 text-red-800";
    if (
      s.includes("planning") ||
      s.includes("in_progress") ||
      s.includes("进行中")
    )
      return "bg-blue-100 text-blue-800";
    if (s.includes("paused") || s.includes("暂停"))
      return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const renderStats = () => {
    // 计算本地统计数据作为后备
    const localTotalProcesses = safeProcesses.length;
    const localActiveProcesses = safeProcesses.filter(
      (p) => p.status === "启用" || p.status === "active",
    ).length;
    const localTotalFormulas = safeFormulas.length;
    const localActiveFormulas = safeFormulas.filter(
      (f) => f.status === "启用" || f.status === "active",
    ).length;
    const localTotalBatches = safeBatches.length;
    const localPlanningBatches = safeBatches.filter(
      (b) => b.status === "规划中" || b.status === "planning",
    ).length;
    const localInProgressBatches = safeBatches.filter(
      (b) => b.status === "进行中" || b.status === "in_progress",
    ).length;
    const localCompletedBatches = safeBatches.filter(
      (b) => b.status === "已完成" || b.status === "completed",
    ).length;
    const localCancelledBatches = safeBatches.filter(
      (b) => b.status === "已取消" || b.status === "cancelled",
    ).length;
    const localTotalSteps = safeSteps.length;

    // 使用 API 返回的统计数据，或本地计算的数据
    const displayStats = {
      total_processes: stats.total_processes || localTotalProcesses,
      active_processes: stats.active_processes || localActiveProcesses,
      total_formulas: stats.total_formulas || localTotalFormulas,
      active_formulas: stats.active_formulas || localActiveFormulas,
      total_batches: stats.total_batches || localTotalBatches,
      planning_batches: stats.planning_batches || localPlanningBatches,
      in_progress_batches: stats.in_progress_batches || localInProgressBatches,
      completed_batches: stats.completed_batches || localCompletedBatches,
      cancelled_batches: stats.cancelled_batches || localCancelledBatches,
      total_steps: stats.total_steps || localTotalSteps,
      total_output_quantity: stats.total_output_quantity || 0,
      total_reject_quantity: stats.total_reject_quantity || 0,
      average_pass_rate: stats.average_pass_rate || 0,
    };

    return (
      <div className="space-y-8">
        {/* 主要统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="生产工艺"
            value={displayStats.total_processes}
            icon={<Factory className="w-6 h-6" />}
            gradient={["#14B8A6", "#0D9488"]}
            subtitle={`启用 ${displayStats.active_processes}`}
            trend="neutral"
          />
          <MetricCard
            title="生产工序"
            value={displayStats.total_steps}
            icon={<ClipboardList className="w-6 h-6" />}
            gradient={["#8B5CF6", "#7C3AED"]}
            trend="neutral"
          />
          <MetricCard
            title="生产配方"
            value={displayStats.total_formulas}
            icon={<Package className="w-6 h-6" />}
            gradient={["#F59E0B", "#D97706"]}
            subtitle={`活跃 ${displayStats.active_formulas}`}
            trend="neutral"
          />
          <MetricCard
            title="生产批次"
            value={displayStats.total_batches}
            icon={<Activity className="w-6 h-6" />}
            gradient={["#6366F1", "#4F46E5"]}
            subtitle={`进行中 ${displayStats.in_progress_batches}`}
            trend="neutral"
          />
          <MetricCard
            title="已完成批次"
            value={displayStats.completed_batches}
            icon={<CheckCircle className="w-6 h-6" />}
            gradient={["#00C897", "#00A878"]}
            trend="up"
          />
          <MetricCard
            title="规划中批次"
            value={displayStats.planning_batches}
            icon={<TrendingUp className="w-6 h-6" />}
            gradient={["#EC4899", "#DB2777"]}
            trend="neutral"
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatsChart
            title="批次状态分布"
            type="pie"
            data={[
              {
                name: "规划中",
                value: displayStats.planning_batches,
                color: "#F59E0B",
              },
              {
                name: "进行中",
                value: displayStats.in_progress_batches,
                color: "#6366F1",
              },
              {
                name: "已完成",
                value: displayStats.completed_batches,
                color: "#00C897",
              },
              {
                name: "已取消",
                value: displayStats.cancelled_batches,
                color: "#6B7280",
              },
            ].filter((d) => d.value > 0)}
            dataKey="value"
            nameKey="name"
          />
          <StatsChart
            title="工艺与配方状态"
            type="pie"
            data={[
              {
                name: "活跃工艺",
                value: displayStats.active_processes,
                color: "#14B8A6",
              },
              {
                name: "活跃配方",
                value: displayStats.active_formulas,
                color: "#F59E0B",
              },
              {
                name: "总工序",
                value: displayStats.total_steps,
                color: "#8B5CF6",
              },
            ].filter((d) => d.value > 0)}
            dataKey="value"
            nameKey="name"
          />
        </div>

        {/* 特定标签页的统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">当前标签总计</p>
                <p className="text-3xl font-bold text-gray-900">
                  {activeTab === "processes"
                    ? safeProcesses.length
                    : activeTab === "steps"
                      ? safeSteps.length
                      : activeTab === "formulas"
                        ? safeFormulas.length
                        : activeTab === "batches"
                          ? safeBatches.length
                          : displayStats.total_processes +
                            displayStats.total_steps +
                            displayStats.total_formulas +
                            displayStats.total_batches}
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                {activeTab === "processes" ? (
                  <Factory className="w-6 h-6 text-teal-600" />
                ) : activeTab === "steps" ? (
                  <ClipboardList className="w-6 h-6 text-teal-600" />
                ) : activeTab === "formulas" ? (
                  <Package className="w-6 h-6 text-teal-600" />
                ) : (
                  <Activity className="w-6 h-6 text-teal-600" />
                )}
              </div>
            </div>
          </div>
          {activeTab === "batches" && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">进行中批次</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {
                        safeBatches.filter(
                          (b) =>
                            b.status === "进行中" || b.status === "in_progress",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">已完成批次</p>
                    <p className="text-3xl font-bold text-green-600">
                      {
                        safeBatches.filter(
                          (b) =>
                            b.status === "已完成" || b.status === "completed",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </>
          )}
          {(activeTab === "processes" || activeTab === "formulas") && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">活跃项</p>
                    <p className="text-3xl font-bold text-green-600">
                      {activeTab === "processes"
                        ? safeProcesses.filter(
                            (p) => p.status === "启用" || p.status === "active",
                          ).length
                        : safeFormulas.filter(
                            (f) => f.status === "启用" || f.status === "active",
                          ).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const processColumns: ColumnDef<ProductionProcess>[] = [
    { accessorKey: "process_no", header: "编号" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "description", header: "描述" },
    { accessorKey: "version", header: "版本" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const stepColumns: ColumnDef<ProductionStep>[] = [
    { accessorKey: "step_no", header: "编号" },
    { accessorKey: "process_id", header: "工艺ID" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "sort_order", header: "顺序" },
    { accessorKey: "duration", header: "时长(分钟)" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const formulaColumns: ColumnDef<ProductionFormula>[] = [
    { accessorKey: "formula_no", header: "编号" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "product_name", header: "产品" },
    { accessorKey: "version", header: "版本" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const batchColumns: ColumnDef<ProductionBatch>[] = [
    { accessorKey: "batch_no", header: "批次号" },
    { accessorKey: "formula_id", header: "配方ID" },
    { accessorKey: "product_name", header: "产品名称" },
    { accessorKey: "quantity", header: "数量" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("确定要删除此项吗？")) {
                handleDelete(row.original.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const downloadTemplate = () => {
    let headers: string[];
    let sampleRow: string[];

    switch (activeTab) {
      case "processes":
        headers = ["process_no", "name", "description", "version", "status"];
        sampleRow = ["P001", "生产工艺1", "工艺描述", "1.0", "active"];
        break;
      case "steps":
        headers = ["step_no", "process_id", "name", "sort_order", "duration"];
        sampleRow = ["S001", "process_id_here", "工序1", "1", "30"];
        break;
      case "formulas":
        headers = ["formula_no", "name", "product_name", "version", "status"];
        sampleRow = ["F001", "配方1", "产品A", "1.0", "active"];
        break;
      case "batches":
        headers = [
          "batch_no",
          "formula_id",
          "product_name",
          "quantity",
          "unit",
          "status",
        ];
        sampleRow = [
          "B001",
          "formula_id_here",
          "产品A",
          "100",
          "kg",
          "planning",
        ];
        break;
      default:
        headers = ["name"];
        sampleRow = ["示例数据"];
    }

    const content = [headers, sampleRow].map((row) => row.join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);

      try {
        const content = await file.text();
        const lines = content.split("\n").slice(0, 6);
        const preview = lines.map((line) => line.split(","));
        setImportPreview(preview);
      } catch {
        setImportPreview(null);
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      showNotification("error", "请选择要导入的文件");
      return;
    }

    try {
      const response = await pdmApi.importData(activeTab, importFile);
      if (response.success) {
        showNotification("success", "导入成功");
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview(null);
        loadData();
      } else {
        showNotification("error", response.message || "导入失败");
      }
    } catch (err) {
      showNotification("error", "导入失败");
      console.error("导入失败:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">生产数据管理</h1>
              <p className="text-gray-500">管理生产工艺、工序、配方和批次</p>
            </div>
          </div>
          {activeTab !== "stats" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>导入</span>
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                新建
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "stats" ? (
          renderStats()
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6">
                {activeTab === "processes" && (
                  <DataTable
                    columns={processColumns}
                    data={safeProcesses}
                    searchKey="name"
                    searchPlaceholder="搜索工艺名称..."
                    loading={loading}
                    exportFileName="pdm-processes"
                  />
                )}
                {activeTab === "steps" && (
                  <DataTable
                    columns={stepColumns}
                    data={safeSteps}
                    searchKey="name"
                    searchPlaceholder="搜索工序名称..."
                    loading={loading}
                    exportFileName="pdm-steps"
                  />
                )}
                {activeTab === "formulas" && (
                  <DataTable
                    columns={formulaColumns}
                    data={safeFormulas}
                    searchKey="name"
                    searchPlaceholder="搜索配方名称..."
                    loading={loading}
                    exportFileName="pdm-formulas"
                  />
                )}
                {activeTab === "batches" && (
                  <DataTable
                    columns={batchColumns}
                    data={safeBatches}
                    searchKey="batch_no"
                    searchPlaceholder="搜索批次号..."
                    loading={loading}
                    exportFileName="pdm-batches"
                  />
                )}
              </div>
            </div>
          </>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === "create" ? "新建" : "编辑"}
                </h3>
                <button
                  onClick={resetModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {activeTab === "processes" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        编号
                      </label>
                      <input
                        type="text"
                        value={formData.process_no || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            process_no: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名称
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        描述
                      </label>
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">启用</option>
                        <option value="inactive">禁用</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "steps" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        编号
                      </label>
                      <input
                        type="text"
                        value={formData.step_no || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, step_no: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        工艺ID
                      </label>
                      <input
                        type="text"
                        value={formData.process_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            process_id: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名称
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        顺序
                      </label>
                      <input
                        type="number"
                        value={formData.order || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, order: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        参数 (JSON)
                      </label>
                      <textarea
                        value={formData.parameters || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parameters: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='{"temperature": 100, "time": 30}'
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">启用</option>
                        <option value="inactive">禁用</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "formulas" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        编号
                      </label>
                      <input
                        type="text"
                        value={formData.formula_no || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            formula_no: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          名称
                        </label>
                        <input
                          type="text"
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          产品
                        </label>
                        <input
                          type="text"
                          value={formData.product_name || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              product_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        版本
                      </label>
                      <input
                        type="text"
                        value={formData.version || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, version: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        成分 (JSON)
                      </label>
                      <textarea
                        value={formData.components || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            components: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='[{"name": "材料A", "quantity": 100, "unit": "kg"}]'
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        操作说明
                      </label>
                      <textarea
                        value={formData.instructions || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            instructions: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">启用</option>
                        <option value="inactive">禁用</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "batches" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        编号
                      </label>
                      <input
                        type="text"
                        value={formData.batch_no || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, batch_no: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        配方ID
                      </label>
                      <input
                        type="text"
                        value={formData.formula_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            formula_id: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          数量
                        </label>
                        <input
                          type="number"
                          value={formData.quantity || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              quantity: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          单位
                        </label>
                        <input
                          type="text"
                          value={formData.unit || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, unit: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="planning">规划中</option>
                        <option value="in_progress">进行中</option>
                        <option value="paused">已暂停</option>
                        <option value="completed">已完成</option>
                        <option value="cancelled">已取消</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={modalType === "create" ? handleCreate : handleEdit}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {modalType === "create" ? "创建" : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  导入数据
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">拖拽文件到此处上传</p>
                    <label className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer">
                      <span>选择文件</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {importPreview && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      文件预览（前5行）：
                    </p>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            {importPreview[0]?.map((cell, index) => (
                              <th
                                key={index}
                                className="px-3 py-2 text-left font-medium text-gray-500"
                              >
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.slice(1).map((row, rowIndex) => (
                            <tr
                              key={rowIndex}
                              className="border-t border-gray-200"
                            >
                              {row.map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-3 py-2 text-gray-700"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                  >
                    <Download className="w-4 h-4" />
                    <span>下载模板</span>
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  导入
                </button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pdmpage;
