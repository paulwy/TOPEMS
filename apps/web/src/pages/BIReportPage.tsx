import { Grid } from "@/components/Grid";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Settings,
  Trash2,
  Edit,
  MoreVertical,
  Eye,
  Grid3X3,
  List,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  TextField,
  Badge,
  Skeleton,
  Menu,
  MenuItem,
} from "@mui/material";
import { EmptyState } from "../components/EmptyState";
import {
  fetchReports,
  createReport,
  deleteReport,
  type Report,
} from "../api/bi";

const ReportCard = ({
  report,
  onExport,
  onEdit,
  onDelete,
  onPreview,
}: {
  report: Report;
  onExport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const getTypeColor = (type: string) => {
    switch (type) {
      case "daily":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "weekly":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "monthly":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "custom":
        return "bg-violet-50 text-violet-600 border-violet-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const typeLabels: Record<string, string> = {
    daily: "日报",
    weekly: "周报",
    monthly: "月报",
    custom: "自定义报表",
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "daily":
        return <Calendar className="w-4 h-4" />;
      case "weekly":
        return <BarChart3 className="w-4 h-4" />;
      case "monthly":
        return <PieChart className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-lg hover:border-slate-300/80 transition-all duration-300">
      {/* Header with icon */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${getTypeColor(report.report_type)}`}
            >
              {getTypeIcon(report.report_type)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {report.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(report.created_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(report.report_type)}`}
          >
            {typeLabels[report.report_type] || report.report_type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {report.description || "暂无描述"}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              更新于 {new Date(report.updated_at).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="outlined"
            onClick={onPreview}
            className="flex-1"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            预览
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={onExport}
            className="flex-1"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            导出
          </Button>
          <Button
            size="small"
            variant="text"
            className="p-2"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              onEdit();
              setAnchorEl(null);
            }}
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </MenuItem>
          <MenuItem
            onClick={() => {
              onDelete();
              setAnchorEl(null);
            }}
            sx={{ color: "red" }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
};

const ReportCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
    <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
    <div className="p-5">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-3 w-24 mb-4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  </div>
);

const BIReportPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchReports();
      if (res.success && res.data) {
        setReports(res.data.reports || []);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await deleteReport(reportId);
      if (res.success) {
        loadReports();
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || report.report_type === filterType;
    return matchesSearch && matchesType;
  });

  const reportTypes = [
    { value: "all", label: "全部类型" },
    { value: "daily", label: "日报" },
    { value: "weekly", label: "周报" },
    { value: "monthly", label: "月报" },
    { value: "custom", label: "自定义报表" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Filter skeleton */}
        <Skeleton className="h-14 w-full rounded-xl" />

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <ReportCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">报表管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            创建、管理和生成业务报表
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/bi/dashboard">
            <Button variant="text">返回数据大屏</Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            创建报表
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <TextField
                placeholder="搜索报表名称..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="pl-10"
                size="small"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredReports.length === 0 ? (
        <EmptyState
          icon="file"
          title="暂无报表数据"
          description="还没有创建任何报表，点击下方按钮创建第一个报表"
          action={{
            label: "创建报表",
            onClick: () => console.log("Create report"),
          }}
        />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          }
        >
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onExport={() => console.log("Export:", report.id)}
              onEdit={() => console.log("Edit:", report.id)}
              onDelete={() => handleDeleteReport(report.id)}
              onPreview={() => console.log("Preview:", report.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BIReportPage;
