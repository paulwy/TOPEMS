import { Grid } from "@/components/Grid";
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  LinearProgress,
  IconButton,
  Button,
  Paper,
  Stack,
} from "@mui/material";
import {
  Plus,
  Folder,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Beaker as Flask,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/templates/PageHeader";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
};

const buttonVariants = {
  hover: {
    scale: 1.05,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  },
  tap: {
    scale: 0.98,
  },
};

const RsDashboardPage: React.FC = () => {
  const stats = {
    totalProjects: 24,
    activeProjects: 12,
    completedProjects: 8,
    totalExperiments: 156,
    pendingExperiments: 23,
    totalFormulas: 45,
    successRate: 87.5,
  };

  const recentProjects = [
    { id: "1", name: "新型催化剂研发项目", status: "进行中", progress: 65 },
    { id: "2", name: "聚合物改性研究", status: "进行中", progress: 42 },
    { id: "3", name: "环保材料开发", status: "已完成", progress: 100 },
    { id: "4", name: "纳米材料合成工艺", status: "暂停", progress: 30 },
  ];

  const recentExperiments = [
    { id: "1", name: "催化剂活性测试-第3轮", phase: "中试", status: "进行中" },
    { id: "2", name: "热稳定性评估", phase: "小试", status: "已完成" },
    { id: "3", name: "配方优化实验", phase: "放大", status: "进行中" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "进行中":
        return "primary";
      case "已完成":
        return "success";
      case "暂停":
        return "warning";
      default:
        return "default";
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "小试":
        return "info";
      case "中试":
        return "warning";
      case "放大":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <PageHeader
        title="研发管理平台"
        subtitle="Research & Development Platform"
        description="科研项目管理、试验数据追踪、配方版本控制"
        pageIcon={<Flask style={{ width: 20, height: 20 }} />}
        pageColor="linear-gradient(135deg, #8B5CF6, #EC4899)"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "RS" },
          { label: "研发管理" },
        ]}
        actions={[
          {
            label: "新建项目",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: "contained",
            color: "primary",
            onClick: () => {},
          },
        ]}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", color: "#64748b" }}>研发项目</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: 4,
                }}
              >
                {stats.totalProjects}
              </motion.p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#2563eb",
                  marginTop: 4,
                }}
              >
                {stats.activeProjects} 个进行中
              </p>
            </div>
            <motion.div
              initial={{ rotate: -180 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                padding: 12,
                backgroundColor: "#eff6ff",
                borderRadius: 12,
              }}
            >
              <Folder style={{ color: "#2563eb" }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", color: "#64748b" }}>试验记录</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: 4,
                }}
              >
                {stats.totalExperiments}
              </motion.p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#ea580c",
                  marginTop: 4,
                }}
              >
                {stats.pendingExperiments} 个待处理
              </p>
            </div>
            <motion.div
              initial={{ rotate: 180 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{
                padding: 12,
                backgroundColor: "#fff7ed",
                borderRadius: 12,
              }}
            >
              <Flask style={{ color: "#ea580c" }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", color: "#64748b" }}>配方库</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: 4,
                }}
              >
                {stats.totalFormulas}
              </motion.p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#16a34a",
                  marginTop: 4,
                }}
              >
                本月新增 5 个
              </p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              style={{
                padding: 12,
                backgroundColor: "#f0fdf4",
                borderRadius: 12,
              }}
            >
              <FileText style={{ color: "#16a34a" }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                试验成功率
              </p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: 4,
                }}
              >
                {stats.successRate}%
              </motion.p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <TrendingUp style={{ color: "#16a34a", fontSize: 14 }} />
                <span style={{ fontSize: "0.875rem", color: "#16a34a" }}>
                  较上月 +2.3%
                </span>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              style={{
                padding: 12,
                backgroundColor: "#ecfeff",
                borderRadius: 12,
              }}
            >
              <BarChart3 style={{ color: "#0891b2" }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          border: "1px solid #e2e8f0",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 16,
          }}
        >
          快捷操作
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/projects/create")}
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
              paddingBottom: 10,
              backgroundColor: "#2563eb",
              color: "#ffffff",
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus style={{ fontSize: 18 }} />
            新建项目
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/experiments/create")}
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
              paddingBottom: 10,
              border: "1px solid #e2e8f0",
              color: "#334155",
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Flask style={{ fontSize: 18 }} />
            创建试验
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/formulas/create")}
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
              paddingBottom: 10,
              border: "1px solid #e2e8f0",
              color: "#334155",
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FileText style={{ fontSize: 18 }} />
            新增配方
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/reports")}
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
              paddingBottom: 10,
              border: "1px solid #e2e8f0",
              color: "#334155",
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BarChart3 style={{ fontSize: 18 }} />
            查看报表
          </motion.button>
        </div>
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              最近项目
            </h3>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => (window.location.href = "/rs/projects")}
              style={{
                fontSize: "0.875rem",
                color: "#2563eb",
                fontWeight: 500,
              }}
            >
              查看全部
            </motion.button>
          </div>
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {recentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ x: 5, backgroundColor: "#f8fafc" }}
                  onClick={() =>
                    (window.location.href = `/rs/projects/${project.id}`)
                  }
                  style={{
                    padding: 16,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, color: "#0f172a" }}>
                        {project.name}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            paddingLeft: 8,
                            paddingRight: 8,
                            paddingTop: 2,
                            paddingBottom: 2,
                            borderRadius: 9999,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            backgroundColor:
                              project.status === "进行中"
                                ? "#dbeafe"
                                : project.status === "已完成"
                                  ? "#dcfce7"
                                  : "#fef9c3",
                            color:
                              project.status === "进行中"
                                ? "#1d4ed8"
                                : project.status === "已完成"
                                  ? "#15803d"
                                  : "#a16207",
                          }}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <div style={{ width: 112, marginLeft: 16 }}>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                          textAlign: "right",
                        }}
                      >
                        {project.progress}%
                      </p>
                      <div
                        style={{
                          width: "100%",
                          backgroundColor: "#e2e8f0",
                          borderRadius: 9999,
                          height: 6,
                          marginTop: 2,
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{
                            delay: 0.8 + index * 0.1,
                            duration: 0.5,
                          }}
                          style={{
                            height: "100%",
                            borderRadius: 9999,
                            backgroundColor: "#2563eb",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              最近试验
            </h3>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => (window.location.href = "/rs/experiments")}
              style={{
                fontSize: "0.875rem",
                color: "#2563eb",
                fontWeight: 500,
              }}
            >
              查看全部
            </motion.button>
          </div>
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {recentExperiments.map((exp, index) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: -5, backgroundColor: "#f8fafc" }}
                  onClick={() =>
                    (window.location.href = `/rs/experiments/${exp.id}`)
                  }
                  style={{
                    padding: 16,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 500, color: "#0f172a" }}>
                        {exp.name}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            paddingLeft: 8,
                            paddingRight: 8,
                            paddingTop: 2,
                            paddingBottom: 2,
                            borderRadius: 9999,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            backgroundColor:
                              exp.phase === "小试"
                                ? "#cffafe"
                                : exp.phase === "中试"
                                  ? "#fef9c3"
                                  : "#fee2e2",
                            color:
                              exp.phase === "小试"
                                ? "#0e7490"
                                : exp.phase === "中试"
                                  ? "#a16207"
                                  : "#b91c1c",
                          }}
                        >
                          {exp.phase}
                        </span>
                        <span
                          style={{
                            paddingLeft: 8,
                            paddingRight: 8,
                            paddingTop: 2,
                            paddingBottom: 2,
                            borderRadius: 9999,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            border: "1px solid",
                            borderColor:
                              exp.status === "已完成" ? "#86efac" : "#fdba74",
                            color:
                              exp.status === "已完成" ? "#15803d" : "#c2410c",
                            backgroundColor:
                              exp.status === "已完成" ? "#f0fdf4" : "#fff7ed",
                          }}
                        >
                          {exp.status === "已完成" ? (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <CheckCircle style={{ fontSize: 12 }} />
                              {exp.status}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <AlertTriangle style={{ fontSize: 12 }} />
                              {exp.status}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        padding: 8,
                        backgroundColor: "#faf5ff",
                        borderRadius: 8,
                      }}
                    >
                      <Flask style={{ color: "#9333ea", fontSize: 18 }} />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </Container>
  );
};

export default RsDashboardPage;
