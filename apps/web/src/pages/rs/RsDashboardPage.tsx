import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Container,
  Typography,
  Grid,
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
  Flask,
  BarChart3,
} from "lucide-react";

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
      <div style={{ marginBottom: 16 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }} gutterBottom>
          研发管理平台
        </Typography>
        <Typography variant="body2" color="text.secondary">
          科研项目管理、试验数据追踪、配方版本控制
        </Typography>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500">研发项目</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-3xl font-bold text-slate-900 mt-1"
              >
                {stats.totalProjects}
              </motion.p>
              <p className="text-sm text-blue-600 mt-1">
                {stats.activeProjects} 个进行中
              </p>
            </div>
            <motion.div
              initial={{ rotate: -180 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-3 bg-blue-50 rounded-xl"
            >
              <FolderIcon style={{ color: "#2563eb" }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500">试验记录</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-3xl font-bold text-slate-900 mt-1"
              >
                {stats.totalExperiments}
              </motion.p>
              <p className="text-sm text-orange-600 mt-1">
                {stats.pendingExperiments} 个待处理
              </p>
            </div>
            <motion.div
              initial={{ rotate: 180 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-3 bg-orange-50 rounded-xl"
            >
              <ScienceIcon style={{ color: "#ea580c" }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500">配方库</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="text-3xl font-bold text-slate-900 mt-1"
              >
                {stats.totalFormulas}
              </motion.p>
              <p className="text-sm text-green-600 mt-1">本月新增 5 个</p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="p-3 bg-green-50 rounded-xl"
            >
              <FileText style={{ color: "#16a34a" }} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500">试验成功率</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-3xl font-bold text-slate-900 mt-1"
              >
                {stats.successRate}%
              </motion.p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp style={{ color: "#16a34a", fontSize: 14 }} />
                <span className="text-sm text-green-600">较上月 +2.3%</span>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="p-3 bg-cyan-50 rounded-xl"
            >
              <AnalyticsIcon style={{ color: "#0891b2" }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6"
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-4">快捷操作</h3>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/projects/create")}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus style={{ fontSize: 18 }} />
            新建项目
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/experiments/create")}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <ScienceIcon style={{ fontSize: 18 }} />
            创建试验
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/formulas/create")}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <FileText style={{ fontSize: 18 }} />
            新增配方
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => (window.location.href = "/rs/reports")}
            className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <AnalyticsIcon style={{ fontSize: 18 }} />
            查看报表
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">最近项目</h3>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => (window.location.href = "/rs/projects")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </motion.button>
          </div>
          <div className="p-4">
            <div className="space-y-3">
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
                  className="p-4 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {project.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.status === "进行中"
                              ? "bg-blue-100 text-blue-700"
                              : project.status === "已完成"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <div className="w-28 ml-4">
                      <p className="text-xs text-slate-500 text-right">
                        {project.progress}%
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{
                            delay: 0.8 + index * 0.1,
                            duration: 0.5,
                          }}
                          className="h-full rounded-full bg-blue-600"
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
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">最近试验</h3>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => (window.location.href = "/rs/experiments")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </motion.button>
          </div>
          <div className="p-4">
            <div className="space-y-3">
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
                  className="p-4 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-900">{exp.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            exp.phase === "小试"
                              ? "bg-cyan-100 text-cyan-700"
                              : exp.phase === "中试"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {exp.phase}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            exp.status === "已完成"
                              ? "border-green-300 text-green-700 bg-green-50"
                              : "border-orange-300 text-orange-700 bg-orange-50"
                          }`}
                        >
                          {exp.status === "已完成" ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle style={{ fontSize: 12 }} />
                              {exp.status}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
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
                      className="p-2 bg-purple-50 rounded-lg"
                    >
                      <ScienceIcon style={{ color: "#9333ea", fontSize: 18 }} />
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
