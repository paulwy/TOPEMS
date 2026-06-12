import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Plus,
  Search,
  Filter,
  LineChart,
  PieChart,
  TrendingUp,
  Settings,
  Trash2,
  Edit,
  Eye,
  Copy,
  Grid3X3,
  List,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/ui/skeleton";
import { BIChartColors } from "../components/charts/chartTheme";

interface Visualization {
  id: string;
  name: string;
  type: string;
  description?: string;
  data_source?: string;
  config: any;
  created_at: string;
  updated_at: string;
}

const VisualizationCard = ({
  viz,
  onPreview,
  onCopy,
  onEdit,
  onDelete,
}: {
  viz: Visualization;
  onPreview: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "line":
        return <LineChart className="w-5 h-5" />;
      case "bar":
        return <BarChart3 className="w-5 h-5" />;
      case "pie":
        return <PieChart className="w-5 h-5" />;
      case "gauge":
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "line":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "bar":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "pie":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "gauge":
        return "bg-violet-50 text-violet-600 border-violet-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const typeLabels: Record<string, string> = {
    line: "折线图",
    bar: "柱状图",
    pie: "饼图",
    gauge: "仪表盘",
    scatter: "散点图",
    radar: "雷达图",
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-lg hover:border-slate-300/80 transition-all duration-300">
      {/* Preview Area */}
      <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-16 h-16 rounded-lg bg-blue-500" />
          <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-emerald-500" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-12 rounded-lg bg-amber-500 rotate-12" />
        </div>
        <div className={`p-3 rounded-xl border ${getTypeColor(viz.type)}`}>
          <div className="w-10 h-10 flex items-center justify-center">
            {getTypeIcon(viz.type)}
          </div>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={onPreview}
            className="p-2 bg-white rounded-lg text-slate-700 hover:text-blue-600 transition-colors"
            title="预览"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={onCopy}
            className="p-2 bg-white rounded-lg text-slate-700 hover:text-blue-600 transition-colors"
            title="复制"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-white rounded-lg text-slate-700 hover:text-blue-600 transition-colors"
            title="编辑"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-white rounded-lg text-slate-700 hover:text-red-600 transition-colors"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(viz.type)}`}
          >
            {typeLabels[viz.type] || viz.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
          {viz.name}
        </h3>
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
          {viz.description || "暂无描述"}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>数据源: {viz.data_source || "未配置"}</span>
          <span>{new Date(viz.updated_at).toLocaleDateString("zh-CN")}</span>
        </div>
      </div>
    </div>
  );
};

const BIVisualizationPage = () => {
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadVisualizations();
  }, []);

  const loadVisualizations = async () => {
    setLoading(true);
    try {
      setVisualizations([
        {
          id: "1",
          name: "月度项目趋势图",
          type: "line",
          description: "展示各月项目数量变化趋势",
          data_source: "研发数据库",
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          name: "质量合格率分布",
          type: "pie",
          description: "展示不同质量等级的占比",
          data_source: "质量数据库",
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "3",
          name: "生产批次统计",
          type: "bar",
          description: "展示各生产线批次数量",
          data_source: "生产数据库",
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "4",
          name: "样品检验进度",
          type: "gauge",
          description: "展示样品检验完成进度",
          data_source: "实验室数据库",
          config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to load visualizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisualizations = visualizations.filter((viz) => {
    const matchesSearch = viz.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || viz.type === filterType;
    return matchesSearch && matchesType;
  });

  const handlePreview = (viz: Visualization) => {
    console.log("Preview:", viz);
  };

  const handleCopy = (viz: Visualization) => {
    console.log("Copy:", viz);
  };

  const handleEdit = (viz: Visualization) => {
    console.log("Edit:", viz);
  };

  const handleDelete = (viz: Visualization) => {
    console.log("Delete:", viz);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="space-y-6">
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
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">可视化图表</h2>
          <p className="text-sm text-slate-500 mt-1">
            创建和管理数据可视化图表
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/bi/dashboard">
            <Button variant="secondary">返回数据大屏</Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            创建图表
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索图表名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部类型</option>
                <option value="line">折线图</option>
                <option value="bar">柱状图</option>
                <option value="pie">饼图</option>
                <option value="gauge">仪表盘</option>
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
      {filteredVisualizations.length === 0 ? (
        <EmptyState
          icon="folder"
          title="暂无可视化图表"
          description="还没有创建任何图表，点击下方按钮创建第一个图表"
          action={{
            label: "创建图表",
            onClick: () => console.log("Create"),
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
          {filteredVisualizations.map((viz) => (
            <VisualizationCard
              key={viz.id}
              viz={viz}
              onPreview={() => handlePreview(viz)}
              onCopy={() => handleCopy(viz)}
              onEdit={() => handleEdit(viz)}
              onDelete={() => handleDelete(viz)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BIVisualizationPage;
