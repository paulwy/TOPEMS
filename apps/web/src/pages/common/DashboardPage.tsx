import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { Grid } from "@/components/Grid";
import {
  FileText,
  FolderOpen,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";
import PieChartComponent from "../../components/charts/PieChart";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  FileText,
  FolderOpen,
  Clock,
  Star,
};

const pieData = [
  { name: "PDF", value: 35 },
  { name: "Word", value: 25 },
  { name: "Markdown", value: 20 },
  { name: "Excel", value: 15 },
  { name: "其他", value: 5 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontSize: "1.125rem", color: "grey.600" }}>
          加载中...
        </Typography>
      </Box>
    );
  }

  const stats = [
    { label: "我的文档", value: "128", icon: "FileText", trend: "+12" },
    { label: "共享文档", value: "456", icon: "FolderOpen", trend: "+25" },
    { label: "最近访问", value: "32", icon: "Clock", trend: "+8" },
    { label: "收藏夹", value: "15", icon: "Star", trend: "+3" },
  ];

  const quickActions = [
    { label: "上传文档", path: "/documents/upload" },
    { label: "文档中心", path: "/document-center" },
    { label: "知识库", path: "/knowledge-base" },
    { label: "模板管理", path: "/templates" },
  ];

  const recentDocs = [
    { title: "2024年度财务报告", type: "PDF", time: "10分钟前" },
    { title: "产品需求文档 v2.0", type: "Word", time: "30分钟前" },
    { title: "会议纪要 - 项目启动会", type: "Markdown", time: "1小时前" },
    { title: "技术架构设计", type: "PDF", time: "2小时前" },
  ];

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Box
        sx={{
          padding: "24px 32px",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Typography variant="h4" sx={{  color: "#1e293b" , fontWeight: 600 }} >
          文档中心
        </Typography>
        <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
          {getGreeting()}，文档管理与协作
        </Typography>
      </Box>

      <Box sx={{ padding: "24px 32px" }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {stats.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || FileText;
            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  sx={{
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent sx={{ padding: "20px" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#64748b", mb: 1 }}
                        >
                          {stat.label}
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{  color: "#1e293b" , fontWeight: 600 }}
                          
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        <IconComponent size={24} />
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: stat.trend.startsWith("-")
                          ? "#ef4444"
                          : "#10b981",
                        mt: 1,
                      }}
                    >
                      {stat.trend} vs 上周期
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    最近访问
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowRight size={14} />}
                    onClick={() => navigate("/documents")}
                  >
                    查看全部
                  </Button>
                </Box>
                {recentDocs.map((doc, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 1.5,
                      borderBottom:
                        index < recentDocs.length - 1
                          ? "1px solid #e2e8f0"
                          : "none",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f8fafc",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <FileText size={20} color="#64748b" />
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#1e293b", fontWeight: 500 }}
                        >
                          {doc.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#94a3b8" }}
                        >
                          {doc.type} · {doc.time}
                        </Typography>
                      </Box>
                    </Box>
                    <Button size="small" variant="outlined">
                      打开
                    </Button>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                height: "100%",
              }}
            >
              <CardContent sx={{ padding: "24px" }}>
                <Typography variant="h6" sx={{  mb: 2 , fontWeight: 600 }} >
                  文档类型分布
                </Typography>
                <PieChartComponent data={pieData} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography
          variant="h6"
          sx={{  mt: 4, mb: 2, color: "#1e293b" , fontWeight: 600 }}
          
        >
          快速操作
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                onClick={() => navigate(action.path)}
                sx={{
                  padding: "16px",
                  borderRadius: "12px",
                  borderColor: "#e2e8f0",
                  color: "#475569",
                  textTransform: "none",
                  justifyContent: "space-between",
                  "&:hover": {
                    borderColor: "#ec4899",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                {action.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;
