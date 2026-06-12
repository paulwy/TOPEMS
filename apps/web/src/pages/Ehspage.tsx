import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldAlert,
  Plus,
  Search,
  ChevronRight,
  AlertCircle,
  ClipboardCheck,
  FileText,
  Activity,
  Loader2,
  X,
  Edit,
  Trash2,
  Check,
  Download,
  Upload,
  Eye,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  Users,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  SafetyHazard,
  SafetyCheck,
  EmergencyPlan,
  DrillRecord,
  CreateSafetyHazardRequest,
  CreateSafetyCheckRequest,
  CreateEmergencyPlanRequest,
  CreateDrillRecordRequest,
  ListQueryParams,
  PaginatedResponse,
} from "../api/ehs";
import { ehsApi } from "../api/ehs";
import { DataTable } from "../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";
import { EHSStatusBadge, EHSRiskLevelBadge } from "../components/ehs";
import { toast } from "react-toastify";

type TabType = "hazards" | "checks" | "plans" | "drills";
type ModalType = "create" | "edit" | "detail" | null;

interface StatsData {
  totalHazards: number;
  activeHazards: number;
  totalChecks: number;
  completedChecks: number;
  totalPlans: number;
  activePlans: number;
  totalDrills: number;
  completedDrills: number;
}

const Ehspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("hazards");
  const [hazards, setHazards] = useState<SafetyHazard[]>([]);
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [drills, setDrills] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState<StatsData>({
    totalHazards: 0,
    activeHazards: 0,
    totalChecks: 0,
    completedChecks: 0,
    totalPlans: 0,
    activePlans: 0,
    totalDrills: 0,
    completedDrills: 0,
  });

  // 分页和筛选状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage, pageSize, searchQuery, statusFilter]);

  const loadStats = async () => {
    try {
      // 加载统计数据
      const [hazardsRes, checksRes, plansRes, drillsRes] = await Promise.all([
        ehsApi.listHazards({ page: 1, page_size: 1 }),
        ehsApi.listChecks({ page: 1, page_size: 1 }),
        ehsApi.listPlans({ page: 1, page_size: 1 }),
        ehsApi.listDrills({ page: 1, page_size: 1 }),
      ]);

      setStats({
        totalHazards: hazardsRes.data?.total || 0,
        activeHazards:
          hazardsRes.data?.data.filter(
            (h) => h.status === "active" || h.status === "identified",
          ).length || 0,
        totalChecks: checksRes.data?.total || 0,
        completedChecks:
          checksRes.data?.data.filter((c) => c.status === "completed").length ||
          0,
        totalPlans: plansRes.data?.total || 0,
        activePlans:
          plansRes.data?.data.filter((p) => p.status === "active").length || 0,
        totalDrills: drillsRes.data?.total || 0,
        completedDrills:
          drillsRes.data?.data.filter((d) => d.status === "completed").length ||
          0,
      });
    } catch (err) {
      console.error("加载统计数据失败:", err);
    }
  };

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
      pending: "待处理",
      in_progress: "进行中",
      completed: "已完成",
      closed: "已关闭",
      identified: "已识别",
      controlled: "已管控",
      open: "待处理",
      resolved: "已解决",
    };
    return statusMap[status] || status;
  };

  const adaptItem = (item: any) => ({
    ...item,
    status: mapStatusToChinese(item.status),
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const params: ListQueryParams = {
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      };

      if (activeTab === "hazards") {
        const response = await ehsApi.listHazards(params);
        if (response.success && response.data) {
          const paginatedData =
            response.data as PaginatedResponse<SafetyHazard>;
          setHazards(paginatedData.data.map((item) => adaptItem(item)));
          setTotalItems(paginatedData.total);
          setTotalPages(Math.ceil(paginatedData.total / pageSize));
        } else {
          setHazards([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      } else if (activeTab === "checks") {
        const response = await ehsApi.listChecks(params);
        if (response.success && response.data) {
          const paginatedData = response.data as PaginatedResponse<SafetyCheck>;
          setChecks(paginatedData.data.map((item) => adaptItem(item)));
          setTotalItems(paginatedData.total);
          setTotalPages(Math.ceil(paginatedData.total / pageSize));
        } else {
          setChecks([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      } else if (activeTab === "plans") {
        const response = await ehsApi.listPlans(params);
        if (response.success && response.data) {
          const paginatedData =
            response.data as PaginatedResponse<EmergencyPlan>;
          setPlans(paginatedData.data.map((item) => adaptItem(item)));
          setTotalItems(paginatedData.total);
          setTotalPages(Math.ceil(paginatedData.total / pageSize));
        } else {
          setPlans([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      } else if (activeTab === "drills") {
        const response = await ehsApi.listDrills(params);
        if (response.success && response.data) {
          const paginatedData = response.data as PaginatedResponse<DrillRecord>;
          setDrills(paginatedData.data.map((item) => adaptItem(item)));
          setTotalItems(paginatedData.total);
          setTotalPages(Math.ceil(paginatedData.total / pageSize));
        } else {
          setDrills([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      }
    } catch (err) {
      console.error("加载数据失败:", err);
      showNotification("error", "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleCreate = async () => {
    try {
      if (activeTab === "hazards") {
        const req: CreateSafetyHazardRequest = {
          hazard_no: formData.hazard_no || "",
          name: formData.name || "",
          category: formData.category || "",
          level: formData.level || "中",
          description: formData.description || null,
          location: formData.location || null,
          control_measures: (formData.control_measures || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          status: formData.status || "identified",
        };
        await ehsApi.createHazard(req);
      } else if (activeTab === "checks") {
        const req: CreateSafetyCheckRequest = {
          check_no: formData.check_no || "",
          check_type: formData.check_type || "",
          inspector: formData.inspector || "",
          location: formData.location || null,
          result: formData.result || "",
          issues: (formData.issues || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          status: formData.status || "in_progress",
        };
        await ehsApi.createCheck(req);
      } else if (activeTab === "plans") {
        const req: CreateEmergencyPlanRequest = {
          plan_no: formData.plan_no || "",
          name: formData.name || "",
          plan_type: formData.plan_type || "",
          scope: formData.scope || null,
          trigger_conditions: formData.trigger_conditions || null,
          response_procedures: formData.response_procedures || null,
          responsible_persons: (formData.responsible_persons || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          contact_info: formData.contact_info || null,
          status: formData.status || "active",
        };
        await ehsApi.createPlan(req);
      } else if (activeTab === "drills") {
        const req: CreateDrillRecordRequest = {
          drill_no: formData.drill_no || "",
          plan_id: formData.plan_id || null,
          drill_name: formData.drill_name || "",
          participants: (formData.participants || "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          duration_hours: parseFloat(formData.duration_hours || "1"),
          location: formData.location || null,
          summary: formData.summary || null,
          issues_found: formData.issues_found || null,
          improvements: formData.improvements || null,
        };
        await ehsApi.createDrill(req);
      }
      showNotification("success", "创建成功");
      resetModal();
      loadData();
      loadStats();
    } catch (err) {
      showNotification("error", "创建失败");
      console.error("创建失败:", err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;

      if (activeTab === "hazards") {
        const req: Partial<CreateSafetyHazardRequest> = {
          hazard_no: formData.hazard_no || undefined,
          name: formData.name || undefined,
          category: formData.category || undefined,
          level: formData.level || undefined,
          description: formData.description || undefined,
          location: formData.location || undefined,
          control_measures: formData.control_measures
            ? formData.control_measures
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined,
          status: formData.status || undefined,
        };
        await ehsApi.updateHazard(editingItem.id, req);
      } else if (activeTab === "checks") {
        const req: Partial<CreateSafetyCheckRequest> = {
          check_no: formData.check_no || undefined,
          check_type: formData.check_type || undefined,
          inspector: formData.inspector || undefined,
          location: formData.location || undefined,
          result: formData.result || undefined,
          issues: formData.issues
            ? formData.issues
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined,
          status: formData.status || undefined,
        };
        await ehsApi.updateCheck(editingItem.id, req);
      } else if (activeTab === "plans") {
        const req: Partial<CreateEmergencyPlanRequest> = {
          plan_no: formData.plan_no || undefined,
          name: formData.name || undefined,
          plan_type: formData.plan_type || undefined,
          scope: formData.scope || undefined,
          trigger_conditions: formData.trigger_conditions || undefined,
          response_procedures: formData.response_procedures || undefined,
          responsible_persons: formData.responsible_persons
            ? formData.responsible_persons
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined,
          contact_info: formData.contact_info || undefined,
          status: formData.status || undefined,
        };
        await ehsApi.updatePlan(editingItem.id, req);
      } else if (activeTab === "drills") {
        const req: Partial<CreateDrillRecordRequest> = {
          drill_no: formData.drill_no || undefined,
          plan_id: formData.plan_id || undefined,
          drill_name: formData.drill_name || undefined,
          participants: formData.participants
            ? formData.participants
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined,
          duration_hours: formData.duration_hours
            ? parseFloat(formData.duration_hours)
            : undefined,
          location: formData.location || undefined,
          summary: formData.summary || undefined,
          issues_found: formData.issues_found || undefined,
          improvements: formData.improvements || undefined,
        };
        await ehsApi.updateDrill(editingItem.id, req);
      }
      showNotification("success", "更新成功");
      resetModal();
      loadData();
      loadStats();
    } catch (err) {
      showNotification("error", "更新失败");
      console.error("更新失败:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return;

    try {
      if (activeTab === "hazards") {
        await ehsApi.deleteHazard(id);
      } else if (activeTab === "checks") {
        await ehsApi.deleteCheck(id);
      } else if (activeTab === "plans") {
        await ehsApi.deletePlan(id);
      } else if (activeTab === "drills") {
        await ehsApi.deleteDrill(id);
      }
      showNotification("success", "删除成功");
      loadData();
      loadStats();
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

    let formattedItem: any = { ...item };
    if (item.control_measures) {
      formattedItem.control_measures = Array.isArray(item.control_measures)
        ? item.control_measures.join(", ")
        : item.control_measures;
    }
    if (item.issues) {
      formattedItem.issues = Array.isArray(item.issues)
        ? item.issues.join(", ")
        : item.issues;
    }
    if (item.responsible_persons) {
      formattedItem.responsible_persons = Array.isArray(
        item.responsible_persons,
      )
        ? item.responsible_persons.join(", ")
        : item.responsible_persons;
    }
    if (item.participants) {
      formattedItem.participants = Array.isArray(item.participants)
        ? item.participants.join(", ")
        : item.participants;
    }

    setFormData(formattedItem);
    setShowModal(true);
  };

  const openDetailModal = (item: any) => {
    setModalType("detail");
    setEditingItem(item);
    setShowModal(true);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      showNotification("error", "没有数据可导出");
      return;
    }

    try {
      // 过滤掉不需要的字段
      const filteredData = data.map((item) => {
        const filtered: any = {};
        Object.keys(item).forEach((key) => {
          // 排除一些内部字段
          if (!["id", "created_at", "updated_at", "created_by"].includes(key)) {
            filtered[key] = item[key];
          }
        });
        return filtered;
      });

      const headers = Object.keys(filteredData[0]);
      const csvHeaders = headers.map((h) => {
        // 将字段名转换为中文
        const headerMap: Record<string, string> = {
          hazard_no: "隐患编号",
          name: "名称",
          category: "类别",
          level: "等级",
          description: "描述",
          location: "位置",
          risk_assessment: "风险评估",
          control_measures: "控制措施",
          status: "状态",
          check_no: "检查编号",
          check_type: "检查类型",
          inspector: "检查人",
          check_date: "检查日期",
          result: "结果",
          issues: "发现问题",
          attachments: "附件",
          plan_no: "预案编号",
          plan_type: "预案类型",
          scope: "适用范围",
          trigger_conditions: "触发条件",
          response_procedures: "响应程序",
          responsible_persons: "负责人",
          contact_info: "联系方式",
          drill_no: "演练编号",
          drill_name: "演练名称",
          drill_date: "演练日期",
          participants: "参与人员",
          duration_hours: "时长(小时)",
          summary: "总结",
          issues_found: "发现问题",
          improvements: "改进措施",
        };
        return headerMap[h] || h;
      });

      const csv = [
        csvHeaders.join(","),
        ...filteredData.map((row) =>
          headers
            .map((h) => {
              let value = row[h];
              // 处理数组类型
              if (Array.isArray(value)) {
                value = value.join("; ");
              }
              // 处理对象类型
              if (typeof value === "object" && value !== null) {
                value = JSON.stringify(value);
              }
              // 处理 null 和 undefined
              if (value === null || value === undefined) {
                value = "";
              }
              // 转义引号
              return `"${value.toString().replace(/"/g, '""')}"`;
            })
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${filename}-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification(
        "success",
        "导出成功，共导出 " + filteredData.length + " 条数据",
      );
    } catch (err) {
      console.error("导出失败:", err);
      showNotification("error", "导出失败，请重试");
    }
  };

  const handleExport = () => {
    const data =
      activeTab === "hazards"
        ? hazards
        : activeTab === "checks"
          ? checks
          : activeTab === "plans"
            ? plans
            : drills;
    const filename = `EHS-${activeTab === "hazards" ? "危险源" : activeTab === "checks" ? "安全检查" : activeTab === "plans" ? "应急预案" : "演练记录"}`;
    exportToCSV(data, filename);
  };

  const handleImport = () => {
    // 创建文件输入元素
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        showNotification("success", "正在导入数据...");

        // 读取文件内容
        const text = await file.text();
        const lines = text.split("\n");

        if (lines.length < 2) {
          showNotification(
            "error",
            "文件格式错误，至少需要包含标题行和一行数据",
          );
          return;
        }

        // 解析 CSV
        const headers = lines[0]
          .split(",")
          .map((h) => h.replace(/"/g, "").trim());
        const dataLines = lines.slice(1).filter((line) => line.trim());

        let importedCount = 0;
        let failedCount = 0;

        for (const line of dataLines) {
          try {
            const values = line
              .split(",")
              .map((v) => v.replace(/"/g, "").trim());
            const item: any = {};

            headers.forEach((header, index) => {
              if (values[index]) {
                item[header] = values[index];
              }
            });

            // 根据当前 tab 创建数据
            if (activeTab === "hazards") {
              const req: CreateSafetyHazardRequest = {
                hazard_no: item["隐患编号"] || item["hazard_no"] || "",
                name: item["名称"] || item["name"] || "",
                category: item["类别"] || item["category"] || "",
                level: item["等级"] || item["level"] || "中",
                description: item["描述"] || item["description"] || null,
                location: item["位置"] || item["location"] || null,
                control_measures: (
                  item["控制措施"] ||
                  item["control_measures"] ||
                  ""
                )
                  .split(";")
                  .map((s) => s.trim())
                  .filter((s) => s),
                status: item["状态"] || item["status"] || "identified",
              };
              await ehsApi.createHazard(req);
              importedCount++;
            } else if (activeTab === "checks") {
              const req: CreateSafetyCheckRequest = {
                check_no: item["检查编号"] || item["check_no"] || "",
                check_type: item["检查类型"] || item["check_type"] || "",
                inspector: item["检查人"] || item["inspector"] || "",
                location: item["位置"] || item["location"] || null,
                result: item["结果"] || item["result"] || "",
                issues: (item["发现问题"] || item["issues"] || "")
                  .split(";")
                  .map((s) => s.trim())
                  .filter((s) => s),
                status: item["状态"] || item["status"] || "in_progress",
              };
              await ehsApi.createCheck(req);
              importedCount++;
            } else if (activeTab === "plans") {
              const req: CreateEmergencyPlanRequest = {
                plan_no: item["预案编号"] || item["plan_no"] || "",
                name: item["名称"] || item["name"] || "",
                plan_type: item["预案类型"] || item["plan_type"] || "",
                scope: item["适用范围"] || item["scope"] || null,
                trigger_conditions:
                  item["触发条件"] || item["trigger_conditions"] || null,
                response_procedures:
                  item["响应程序"] || item["response_procedures"] || null,
                responsible_persons: (
                  item["负责人"] ||
                  item["responsible_persons"] ||
                  ""
                )
                  .split(";")
                  .map((s) => s.trim())
                  .filter((s) => s),
                contact_info: item["联系方式"] || item["contact_info"] || null,
                status: item["状态"] || item["status"] || "active",
              };
              await ehsApi.createPlan(req);
              importedCount++;
            } else if (activeTab === "drills") {
              const req: CreateDrillRecordRequest = {
                drill_no: item["演练编号"] || item["drill_no"] || "",
                drill_name: item["演练名称"] || item["drill_name"] || "",
                participants: (item["参与人员"] || item["participants"] || "")
                  .split(";")
                  .map((s) => s.trim())
                  .filter((s) => s),
                duration_hours: parseFloat(
                  item["时长(小时)"] || item["duration_hours"] || "1",
                ),
                location: item["位置"] || item["location"] || null,
                summary: item["总结"] || item["summary"] || null,
                issues_found: item["发现问题"] || item["issues_found"] || null,
                improvements: item["改进措施"] || item["improvements"] || null,
              };
              await ehsApi.createDrill(req);
              importedCount++;
            }
          } catch (err) {
            failedCount++;
            console.error("导入单条数据失败:", err);
          }
        }

        if (importedCount > 0) {
          showNotification(
            "success",
            `导入成功！共导入 ${importedCount} 条数据，失败 ${failedCount} 条`,
          );
          loadData();
          loadStats();
        } else {
          showNotification("error", "导入失败，请检查文件格式");
        }
      } catch (err) {
        console.error("导入失败:", err);
        showNotification("error", "导入失败，请检查文件格式");
      }
    };

    input.click();
  };

  const hazardColumns: ColumnDef<SafetyHazard>[] = [
    { accessorKey: "hazard_no", header: "编号" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "category", header: "类别" },
    {
      accessorKey: "level",
      header: "等级",
      cell: ({ row }) => <EHSRiskLevelBadge level={row.original.level} />,
    },
    { accessorKey: "location", header: "位置" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <EHSStatusBadge status={row.original.status} type="hazard" />
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/ehs/hazard/${row.original.id}`)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
            title="查看详情页"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDetailModal(row.original)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            title="快速查看"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.name)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const checkColumns: ColumnDef<SafetyCheck>[] = [
    { accessorKey: "check_no", header: "编号" },
    { accessorKey: "check_type", header: "类型" },
    { accessorKey: "inspector", header: "检查人" },
    { accessorKey: "location", header: "位置" },
    { accessorKey: "result", header: "结果" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <EHSStatusBadge status={row.original.status} type="hazard" />
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetailModal(row.original)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.check_no)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const planColumns: ColumnDef<EmergencyPlan>[] = [
    { accessorKey: "plan_no", header: "编号" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "plan_type", header: "类型" },
    { accessorKey: "scope", header: "范围" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <EHSStatusBadge status={row.original.status} type="hazard" />
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetailModal(row.original)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.name)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const drillColumns: ColumnDef<DrillRecord>[] = [
    { accessorKey: "drill_no", header: "编号" },
    { accessorKey: "drill_name", header: "名称" },
    { accessorKey: "location", header: "位置" },
    { accessorKey: "duration_hours", header: "时长(h)" },
    {
      accessorKey: "participants",
      header: "参与人员",
      cell: ({ row }) => {
        const participants = row.original.participants;
        const displayText = Array.isArray(participants)
          ? participants.join(", ")
          : participants;
        return (
          <span className="truncate max-w-[150px]" title={displayText}>
            {displayText}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetailModal(row.original)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              handleDelete(row.original.id, row.original.drill_name)
            }
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const tabs = [
    { id: "hazards", label: "危险源", icon: AlertCircle },
    { id: "checks", label: "安全检查", icon: ClipboardCheck },
    { id: "plans", label: "应急预案", icon: FileText },
    { id: "drills", label: "演练记录", icon: Activity },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // 统计数据卡片
  const statsCards = useMemo(
    () => [
      {
        title: "危险源总数",
        value: stats.totalHazards,
        subtitle: `活跃: ${stats.activeHazards}`,
        icon: AlertCircle,
        color: "from-red-500 to-orange-500",
        trend: (stats.activeHazards > stats.totalHazards * 0.3
          ? "up"
          : "down") as "up" | "down",
      },
      {
        title: "安全检查",
        value: stats.totalChecks,
        subtitle: `已完成: ${stats.completedChecks}`,
        icon: ClipboardCheck,
        color: "from-blue-500 to-cyan-500",
        trend: (stats.completedChecks > stats.totalChecks * 0.5
          ? "up"
          : "down") as "up" | "down",
      },
      {
        title: "应急预案",
        value: stats.totalPlans,
        subtitle: `有效: ${stats.activePlans}`,
        icon: FileText,
        color: "from-green-500 to-emerald-500",
        trend: (stats.activePlans > stats.totalPlans * 0.8 ? "up" : "down") as
          | "up"
          | "down",
      },
      {
        title: "演练记录",
        value: stats.totalDrills,
        subtitle: `已完成: ${stats.completedDrills}`,
        icon: Activity,
        color: "from-purple-500 to-pink-500",
        trend: (stats.completedDrills > stats.totalDrills * 0.6
          ? "up"
          : "down") as "up" | "down",
      },
    ],
    [stats],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    环境健康安全
                  </h1>
                  <p className="text-xs text-slate-500">
                    EHS Management System
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleImport}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>导入</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>导出</span>
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新建</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计仪表板 */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => (
            <MetricCard
              key={index}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
            />
          ))}
        </div>

        {/* 数据可视化图表 */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatsChart
            type="bar"
            title="危险源等级分布"
            data={[
              {
                name: "低风险",
                value: hazards.filter((h) => h.level.includes("低")).length,
                color: "#10b981",
              },
              {
                name: "中风险",
                value: hazards.filter((h) => h.level.includes("中")).length,
                color: "#f59e0b",
              },
              {
                name: "高风险",
                value: hazards.filter(
                  (h) => h.level.includes("高") || h.level.includes("重大"),
                ).length,
                color: "#ef4444",
              },
            ]}
            xKey="name"
            yKey="value"
          />
          <StatsChart
            type="pie"
            title="安全检查状态分布"
            data={[
              {
                name: "已完成",
                value: checks.filter(
                  (c) =>
                    c.status.includes("已完成") || c.status.includes("完成"),
                ).length,
                color: "#10b981",
              },
              {
                name: "进行中",
                value: checks.filter(
                  (c) =>
                    c.status.includes("进行中") || c.status.includes("进行"),
                ).length,
                color: "#3b82f6",
              },
              {
                name: "待处理",
                value: checks.filter(
                  (c) => c.status.includes("待处理") || c.status.includes("待"),
                ).length,
                color: "#f59e0b",
              },
            ]}
            xKey="name"
            yKey="value"
          />
        </div>

        {/* Tab 导航 */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setCurrentPage(1);
                  setSearchQuery("");
                  setStatusFilter("");
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 搜索和筛选 */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部状态</option>
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">每页显示:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* 数据表格 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {activeTab === "hazards" && "危险源列表"}
                {activeTab === "checks" && "安全检查记录"}
                {activeTab === "plans" && "应急预案列表"}
                {activeTab === "drills" && "演练记录"}
              </h2>
              <div className="text-sm text-slate-600">
                共 {totalItems} 条记录，第 {currentPage} / {totalPages} 页
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === "hazards" && (
                  <DataTable
                    columns={hazardColumns}
                    data={hazards}
                    searchKey="name"
                    searchPlaceholder="搜索危险源名称..."
                    loading={loading}
                    exportFileName="ehs-hazards"
                  />
                )}
                {activeTab === "checks" && (
                  <DataTable
                    columns={checkColumns}
                    data={checks}
                    searchKey="check_no"
                    searchPlaceholder="搜索检查编号..."
                    loading={loading}
                    exportFileName="ehs-checks"
                  />
                )}
                {activeTab === "plans" && (
                  <DataTable
                    columns={planColumns}
                    data={plans}
                    searchKey="name"
                    searchPlaceholder="搜索预案名称..."
                    loading={loading}
                    exportFileName="ehs-plans"
                  />
                )}
                {activeTab === "drills" && (
                  <DataTable
                    columns={drillColumns}
                    data={drills}
                    searchKey="drill_name"
                    searchPlaceholder="搜索演练名称..."
                    loading={loading}
                    exportFileName="ehs-drills"
                  />
                )}
              </>
            )}
          </div>

          {/* 分页 */}
          {!loading && totalPages > 1 && (
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === "create"
                  ? "新建"
                  : modalType === "edit"
                    ? "编辑"
                    : "详情"}
                {activeTab === "hazards" && "危险源"}
                {activeTab === "checks" && "安全检查"}
                {activeTab === "plans" && "应急预案"}
                {activeTab === "drills" && "演练记录"}
              </h3>
              <button
                onClick={resetModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalType === "detail" ? (
              <div className="p-6">
                {editingItem && (
                  <div className="space-y-4">
                    {Object.entries(editingItem).map(([key, value]) => (
                      <div key={key} className="flex items-start">
                        <div className="w-1/3 font-medium text-gray-700">
                          {key}
                        </div>
                        <div className="w-2/3 text-gray-900">
                          {Array.isArray(value)
                            ? value.join(", ")
                            : value?.toString() || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {activeTab === "hazards" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          编号 *
                        </label>
                        <input
                          type="text"
                          value={formData.hazard_no || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hazard_no: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          名称 *
                        </label>
                        <input
                          type="text"
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          类别 *
                        </label>
                        <input
                          type="text"
                          value={formData.category || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          等级 *
                        </label>
                        <select
                          value={formData.level || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, level: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="低">低</option>
                          <option value="中">中</option>
                          <option value="高">高</option>
                          <option value="重大">重大</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        位置
                      </label>
                      <input
                        type="text"
                        value={formData.location || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        控制措施 (逗号分隔)
                      </label>
                      <textarea
                        value={formData.control_measures || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            control_measures: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态 *
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="identified">已识别</option>
                        <option value="controlled">已管控</option>
                        <option value="closed">已关闭</option>
                        <option value="open">待处理</option>
                        <option value="resolved">已解决</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "checks" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          编号 *
                        </label>
                        <input
                          type="text"
                          value={formData.check_no || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              check_no: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          类型 *
                        </label>
                        <input
                          type="text"
                          value={formData.check_type || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              check_type: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          检查人 *
                        </label>
                        <input
                          type="text"
                          value={formData.inspector || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              inspector: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          位置
                        </label>
                        <input
                          type="text"
                          value={formData.location || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              location: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        结果
                      </label>
                      <input
                        type="text"
                        value={formData.result || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, result: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        发现问题 (逗号分隔)
                      </label>
                      <textarea
                        value={formData.issues || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, issues: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态 *
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="pending">待处理</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "plans" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          编号 *
                        </label>
                        <input
                          type="text"
                          value={formData.plan_no || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              plan_no: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          名称 *
                        </label>
                        <input
                          type="text"
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          类型 *
                        </label>
                        <input
                          type="text"
                          value={formData.plan_type || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              plan_type: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        范围
                      </label>
                      <textarea
                        value={formData.scope || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, scope: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        触发条件
                      </label>
                      <textarea
                        value={formData.trigger_conditions || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trigger_conditions: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        响应程序
                      </label>
                      <textarea
                        value={formData.response_procedures || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            response_procedures: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        负责人 (逗号分隔)
                      </label>
                      <input
                        type="text"
                        value={formData.responsible_persons || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            responsible_persons: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        联系方式
                      </label>
                      <input
                        type="text"
                        value={formData.contact_info || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_info: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        状态 *
                      </label>
                      <select
                        value={formData.status || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="active">启用</option>
                        <option value="inactive">禁用</option>
                        <option value="draft">草稿</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "drills" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          编号 *
                        </label>
                        <input
                          type="text"
                          value={formData.drill_no || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              drill_no: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          演练名称 *
                        </label>
                        <input
                          type="text"
                          value={formData.drill_name || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              drill_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          位置
                        </label>
                        <input
                          type="text"
                          value={formData.location || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              location: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          时长 (小时) *
                        </label>
                        <input
                          type="number"
                          value={formData.duration_hours || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              duration_hours: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        参与人员 (逗号分隔) *
                      </label>
                      <input
                        type="text"
                        value={formData.participants || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            participants: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        总结
                      </label>
                      <textarea
                        value={formData.summary || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, summary: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        发现问题
                      </label>
                      <textarea
                        value={formData.issues_found || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            issues_found: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        改进措施
                      </label>
                      <textarea
                        value={formData.improvements || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            improvements: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {modalType !== "detail" && (
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={modalType === "create" ? handleCreate : handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {modalType === "create" ? "创建" : "保存"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ehspage;
