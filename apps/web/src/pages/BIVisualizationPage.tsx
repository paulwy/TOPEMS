import { Grid } from "@/components/Grid";
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
import {
  Button,
  Card,
  CardContent,
  TextField,
  Badge,
  Skeleton,
  Box,
  Typography,
} from "@mui/material";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
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
        return <LineChart sx={{ width: 20, height: 20 }} />;
      case "bar":
        return <BarChart3 sx={{ width: 20, height: 20 }} />;
      case "pie":
        return <PieChart sx={{ width: 20, height: 20 }} />;
      case "gauge":
        return <TrendingUp sx={{ width: 20, height: 20 }} />;
      default:
        return <BarChart3 sx={{ width: 20, height: 20 }} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "line":
        return {
          bgcolor: "blue.50",
          color: "primary.main",
          borderColor: "blue.200",
        };
      case "bar":
        return {
          bgcolor: "green.50",
          color: "success.main",
          borderColor: "green.200",
        };
      case "pie":
        return {
          bgcolor: "orange.50",
          color: "warning.main",
          borderColor: "orange.200",
        };
      case "gauge":
        return {
          bgcolor: "violet.50",
          color: "violet.main",
          borderColor: "violet.200",
        };
      default:
        return {
          bgcolor: "grey.50",
          color: "grey.600",
          borderColor: "grey.200",
        };
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

  const colors = getTypeColor(viz.type);

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderRadius: 3,
        boxShadow: 1,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        transition: "all 0.3s",
        "&:hover": {
          boxShadow: 2,
          borderColor: "grey.300",
        },
      }}
    >
      {/* Preview Area */}
      <Box
        sx={{
          position: "relative",
          height: 160,
          background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            width: 64,
            height: 64,
            borderRadius: 2,
            bgcolor: "blue.500",
            opacity: 0.1,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: "green.500",
            opacity: 0.1,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(12deg)",
            width: 96,
            height: 48,
            borderRadius: 2,
            bgcolor: "orange.500",
            opacity: 0.1,
          }}
        />
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: colors.borderColor,
            bgcolor: colors.bgcolor,
            color: colors.color,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getTypeIcon(viz.type)}
          </Box>
        </Box>

        {/* Overlay on hover */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(30, 41, 59, 0.6)",
            opacity: 0,
            transition: "opacity 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            "&:hover": {
              opacity: 1,
            },
          }}
        >
          <Box
            component="button"
            onClick={onPreview}
            sx={{
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              color: "grey.700",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                color: "primary.main",
              },
            }}
            title="预览"
          >
            <Eye sx={{ width: 20, height: 20 }} />
          </Box>
          <Box
            component="button"
            onClick={onCopy}
            sx={{
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              color: "grey.700",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                color: "primary.main",
              },
            }}
            title="复制"
          >
            <Copy sx={{ width: 20, height: 20 }} />
          </Box>
          <Box
            component="button"
            onClick={onEdit}
            sx={{
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              color: "grey.700",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                color: "primary.main",
              },
            }}
            title="编辑"
          >
            <Edit sx={{ width: 20, height: 20 }} />
          </Box>
          <Box
            component="button"
            onClick={onDelete}
            sx={{
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              color: "grey.700",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                color: "error.main",
              },
            }}
            title="删除"
          >
            <Trash2 sx={{ width: 20, height: 20 }} />
          </Box>
        </Box>

        {/* Type badge */}
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 1,
              border: "1px solid",
              borderColor: colors.borderColor,
              bgcolor: colors.bgcolor,
              color: colors.color,
            }}
          >
            {typeLabels[viz.type] || viz.type}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: "grey.900",
            mb: 0.5,
            transition: "color 0.3s",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          {viz.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "grey.500",
            mb: 2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {viz.description || "暂无描述"}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "grey.400",
          }}
        >
          <Typography variant="caption" sx={{ color: "grey.400" }}>
            数据源: {viz.data_source || "未配置"}
          </Typography>
          <Typography variant="caption" sx={{ color: "grey.400" }}>
            {new Date(viz.updated_at).toLocaleDateString("zh-CN")}
          </Typography>
        </Box>
      </Box>
    </Box>
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
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
              <Skeleton sx={{ height: 16, width: 96 }} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Skeleton sx={{ height: 40, width: 96 }} />
              <Skeleton sx={{ height: 40, width: 112 }} />
            </Box>
          </Box>
          <Skeleton sx={{ height: 56, width: "100%", borderRadius: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: 1, md: 2, lg: 3 },
              gap: 2,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} sx={{ height: 288, borderRadius: 3 }} />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "grey.900" }}
            >
              可视化图表
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
              创建和管理数据可视化图表
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Link to="/bi/dashboard">
              <Button variant="secondary">返回数据大屏</Button>
            </Link>
            <Button>
              <Plus sx={{ width: 16, height: 16, mr: 0.5 }} />
              创建图表
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ flex: 1, position: "relative" }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 16,
                    color: "grey.400",
                  }}
                />
                <Input
                  placeholder="搜索图表名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ pl: 5 }}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Filter sx={{ width: 16, height: 16, color: "grey.400" }} />
                <Box
                  component="select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  sx={{
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 1,
                    px: 1.5,
                    py: 1,
                    fontSize: 14,
                    bgcolor: "background.paper",
                    outline: "none",
                    "&:focus": {
                      borderColor: "primary.main",
                      boxShadow: 1,
                    },
                  }}
                >
                  <option value="all">全部类型</option>
                  <option value="line">折线图</option>
                  <option value="bar">柱状图</option>
                  <option value="pie">饼图</option>
                  <option value="gauge">仪表盘</option>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "grey.100",
                  borderRadius: 1,
                  p: 0.25,
                }}
              >
                <Box
                  component="button"
                  onClick={() => setViewMode("grid")}
                  sx={{
                    p: 1,
                    borderRadius: 0.5,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    bgcolor:
                      viewMode === "grid" ? "background.paper" : "transparent",
                    boxShadow: viewMode === "grid" ? 1 : 0,
                    color: viewMode === "grid" ? "primary.main" : "grey.500",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Grid3X3 sx={{ width: 16, height: 16 }} />
                </Box>
                <Box
                  component="button"
                  onClick={() => setViewMode("list")}
                  sx={{
                    p: 1,
                    borderRadius: 0.5,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    bgcolor:
                      viewMode === "list" ? "background.paper" : "transparent",
                    boxShadow: viewMode === "list" ? 1 : 0,
                    color: viewMode === "list" ? "primary.main" : "grey.500",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <List sx={{ width: 16, height: 16 }} />
                </Box>
              </Box>
            </Box>
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
          <Box
            sx={
              viewMode === "grid"
                ? {
                    display: "grid",
                    gridTemplateColumns: { xs: 1, md: 2, lg: 3 },
                    gap: 2,
                  }
                : {
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }
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
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BIVisualizationPage;
