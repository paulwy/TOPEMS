import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FolderKanban,
  TrendingUp,
  Calendar,
  Users,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../api/pm";
import { pmApi } from "../api/pm";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import Pagination from "../components/pm/Pagination";

const PROJECT_TYPES = [
  { value: "", label: "全部类型" },
  { value: "research", label: "科研项目" },
  { value: "production", label: "生产项目" },
  { value: "construction", label: "施工项目" },
  { value: "design", label: "设计项目" },
  { value: "service", label: "服务项目" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "pending", label: "待审批" },
  { value: "approved", label: "已批准" },
  { value: "active", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
    loadProjects(1);
  }, [selectedType, selectedStatus]);

  const loadProjects = async (page: number) => {
    setLoading(true);
    try {
      const response = await pmApi.projects.list({
        project_type: selectedType || undefined,
        status: selectedStatus || undefined,
        page,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
        setTotalPages(response.data.total_pages || 1);
        setTotalCount(response.data.total_count || 0);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProjects(page);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个项目吗？")) return;
    try {
      const response = await pmApi.projects.delete(id);
      if (response.success) {
        loadProjects(currentPage);
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "draft":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "进行中";
      case "completed":
        return "已完成";
      case "pending":
        return "待审批";
      case "approved":
        return "已批准";
      case "cancelled":
        return "已取消";
      case "draft":
        return "草稿";
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    const found = PROJECT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeCount = projects.filter((p) => p.status === "active").length;
  const pendingCount = projects.filter((p) => p.status === "pending").length;
  const completedCount = projects.filter(
    (p) => p.status === "completed",
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-500 mt-1">
              管理所有类型的项目，跟踪进度和状态
            </p>
          </div>
          <Button onClick={() => navigate("/pm/projects/create")}>
            <Plus className="w-4 h-4 mr-2" />
            创建项目
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索项目名称或编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-3">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总项目数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">进行中</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待审批</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold text-blue-600">
                  {completedCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-6">
            <CardTitle className="text-lg">项目列表</CardTitle>
            <span className="text-sm text-gray-500">
              共 {totalCount} 个项目
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">项目名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-[180px]">进度</TableHead>
                    <TableHead>预算</TableHead>
                    <TableHead className="w-[150px]">时间</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-gray-500"
                      >
                        暂无项目数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {project.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {project.code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {getTypeLabel(project.project_type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(project.status)}>
                            {getStatusLabel(project.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-24">
                              <Progress
                                value={project.progress}
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {project.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatCurrency(project.budget)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <div>
                            <p>{formatDate(project.start_date)}</p>
                            <p className="text-xs text-gray-400">
                              至 {formatDate(project.end_date)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/pm/projects/${project.id}`)
                                }
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/pm/projects/${project.id}/edit`)
                                }
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(project.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {!loading && totalPages > 1 && (
              <div className="p-4 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PmProjectListPage;
