/**
 * SystemManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 Card 组件展示功能模块
 * 3. 布局整洁、主题色使用蓝色 (#3b82f6)
 * 4. 使用 mock 数据
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Settings,
  Users,
  Shield,
  Key,
  Book,
  Database,
  FileText,
  ChevronLeft,
  Bell,
  FolderOpen,
} from "lucide-react";
import { PageHeader } from "../components/layout";

// ============ Mock 数据 ============
const systemFeatures = [
  {
    id: "users",
    title: "用户管理",
    description: "管理系统用户账户",
    icon: Users,
    path: "/users",
    color: "#3b82f6",
  },
  {
    id: "roles",
    title: "角色管理",
    description: "管理用户角色和权限组",
    icon: Shield,
    path: "/roles",
    color: "#8b5cf6",
  },
  {
    id: "permissions",
    title: "权限管理",
    description: "配置系统权限",
    icon: Key,
    path: "/permissions",
    color: "#22c55e",
  },
  {
    id: "dictionaries",
    title: "字典管理",
    description: "管理系统字典和业务字典",
    icon: Book,
    path: "/dictionaries",
    color: "#f59e0b",
  },
  {
    id: "database",
    title: "数据库结构",
    description: "管理数据库表结构和字段",
    icon: Database,
    path: "/database",
    color: "#06b6d4",
  },
  {
    id: "audit",
    title: "审计日志",
    description: "查看系统操作审计记录",
    icon: FileText,
    path: "/audit",
    color: "#64748b",
  },
  {
    id: "notifications",
    title: "消息中心",
    description: "管理系统消息通知",
    icon: Bell,
    path: "/notifications",
    color: "#ec4899",
  },
  {
    id: "config",
    title: "系统配置",
    description: "系统参数和运行时配置",
    icon: Settings,
    path: "/system-settings",
    color: "#6366f1",
  },
];

// ============ 主组件 ============
export default function SystemManagementPageRefactored() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <PageHeader
          title="系统管理"
          subtitle="用户、角色、权限和系统配置"
          backButton={{
            href: "/dashboard",
            tooltip: "返回首页",
          }}
        />

        {/* 功能模块卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
          }}
        >
          {systemFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                onClick={() => navigate(feature.path)}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    boxShadow: 4,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: `${feature.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon style={{ width: 24, height: 24, color: feature.color }} />
                    </Box>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {feature.description}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: "primary.main",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    进入管理 →
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* 系统信息卡片 */}
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              系统信息
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  系统版本
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  v2.0.0
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  数据库版本
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  v1.8.5
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  最后更新时间
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  2024-01-15
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  运行环境
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Node.js 18+
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
