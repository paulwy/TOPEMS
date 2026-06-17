import React, { useState } from "react";
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  FileText,
  Video,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Download,
  Eye,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { Box, Typography, Button, Tabs, Tab, Chip } from "@mui/material";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/NotificationContainer";

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  module: string;
  content: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  article_count: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  module: string;
  url: string;
}

const HelpCenterPage: React.FC = () => {
  const { success, notifications, hideNotification } = useNotification();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"articles" | "videos" | "faq">(
    "articles",
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(
    null,
  );
  const [showArticleDetail, setShowArticleDetail] = useState(false);

  const [categories] = useState<HelpCategory[]>([
    {
      id: "1",
      name: "快速入门",
      icon: "🚀",
      description: "新用户必读，快速上手 TOPEMS 系统",
      article_count: 8,
    },
    {
      id: "2",
      name: "系统管理",
      icon: "⚙️",
      description: "用户、角色、权限等系统配置",
      article_count: 12,
    },
    {
      id: "3",
      name: "ERP 模块",
      icon: "📦",
      description: "企业资源计划相关功能",
      article_count: 15,
    },
    {
      id: "4",
      name: "HRM 模块",
      icon: "👥",
      description: "人力资源管理相关功能",
      article_count: 10,
    },
    {
      id: "5",
      name: "CRM 模块",
      icon: "🤝",
      description: "客户关系管理相关功能",
      article_count: 8,
    },
    {
      id: "6",
      name: "报表管理",
      icon: "📊",
      description: "报表设计和生成",
      article_count: 6,
    },
  ]);

  const [articles] = useState<HelpArticle[]>([
    {
      id: "1",
      title: "如何创建第一个项目",
      category: "快速入门",
      module: "RS",
      content: `
# 如何创建第一个项目

本教程将指导您如何在 TOPEMS 系统中创建您的第一个项目。

## 步骤 1：进入项目模块

1. 登录系统后，在左侧菜单中找到"研发管理"模块
2. 点击"项目管理"进入项目列表页面

## 步骤 2：创建新项目

1. 点击页面右上角的"新建项目"按钮
2. 填写项目基本信息：
   - 项目名称（必填）
   - 项目编码（必填，唯一）
   - 项目描述（可选）
   - 开始/结束日期
3. 配置项目成员和权限
4. 点击"保存"完成创建

## 步骤 3：添加项目任务

项目创建成功后，您可以：

1. 在项目详情页点击"添加任务"
2. 填写任务信息（名称、负责人、截止日期等）
3. 设置任务优先级和状态

## 常见问题

**Q: 项目编码有什么要求？**
A: 项目编码必须唯一，建议使用有意义的缩写，如 "PRJ-2024-001"

**Q: 如何设置项目成员权限？**
A: 在项目详情页的"成员管理"中，可以为每个成员设置不同的角色权限。
      `,
      views: 1250,
      likes: 89,
      created_at: "2024-01-15",
      updated_at: "2024-03-20",
      tags: ["项目", "入门", "教程"],
    },
    {
      id: "2",
      title: "系统权限配置指南",
      category: "系统管理",
      module: "IAM",
      content: `
# 系统权限配置指南

本文档详细介绍如何在 TOPEMS 系统中配置用户权限。

## 权限结构

系统采用 RBAC（基于角色的访问控制）模型：

- **用户**：系统的实际使用者
- **角色**：权限的集合
- **权限**：对特定资源的访问控制

## 配置步骤

### 1. 创建角色

1. 进入"系统管理" > "角色管理"
2. 点击"新建角色"
3. 填写角色名称、编码和描述
4. 保存角色

### 2. 分配权限

1. 在角色详情页点击"权限配置"
2. 选择需要的权限模块
3. 勾选具体的权限项
4. 保存配置

### 3. 分配角色给用户

1. 进入"用户管理"
2. 选择目标用户
3. 在"角色配置"中添加相应角色
4. 保存配置

## 最佳实践

- 遵循最小权限原则
- 定期审查权限配置
- 使用角色组管理大量用户
      `,
      views: 890,
      likes: 67,
      created_at: "2024-01-20",
      updated_at: "2024-04-10",
      tags: ["权限", "系统管理", "安全"],
    },
    {
      id: "3",
      title: "报表设计器使用教程",
      category: "报表管理",
      module: "Report",
      content: `
# 报表设计器使用教程

本教程介绍如何使用 TOPEMS 的报表设计器创建自定义报表。

## 功能特点

- 拖拽式报表设计
- 支持多种数据源
- 丰富的图表类型
- 灵活的导出格式

## 创建报表步骤

### 1. 选择报表模板

系统提供多种预设模板，您也可以从头开始设计。

### 2. 配置数据源

1. 选择数据源类型（系统数据、自定义查询）
2. 配置连接参数
3. 测试连接

### 3. 设计报表布局

使用拖拽工具添加：

- 表格
- 图表
- 文本
- 图片

### 4. 设置筛选条件

添加动态筛选器，让用户可以自定义查询条件。

### 5. 预览和导出

完成设计后，预览报表效果，支持导出为 Excel、PDF 等格式。
      `,
      views: 567,
      likes: 45,
      created_at: "2024-02-05",
      updated_at: "2024-04-15",
      tags: ["报表", "设计器", "教程"],
    },
  ]);

  const [videos] = useState<VideoTutorial[]>([
    {
      id: "1",
      title: "TOPEMS 系统概览",
      description: "了解 TOPEMS 系统的整体架构和功能模块",
      thumbnail: "https://via.placeholder.com/320x180",
      duration: "10:25",
      module: "系统",
      url: "#",
    },
    {
      id: "2",
      title: "项目管理实战",
      description: "学习如何在系统中管理项目全生命周期",
      thumbnail: "https://via.placeholder.com/320x180",
      duration: "25:30",
      module: "RS",
      url: "#",
    },
    {
      id: "3",
      title: "权限配置详解",
      description: "深入了解系统的权限管理机制",
      thumbnail: "https://via.placeholder.com/320x180",
      duration: "15:45",
      module: "IAM",
      url: "#",
    },
  ]);

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
    setShowArticleDetail(true);
  };

  const handleLikeArticle = () => {
    success("感谢您的反馈！");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(to right, #2563eb, #9333ea)",
          color: "white",
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: 4,
            py: 16,
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <HelpCircle
              sx={{ width: 64, height: 64, mx: "auto", mb: 2, opacity: 0.9 }}
            />
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, mb: 2, color: "inherit" }}
            >
              帮助中心
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "#93c5fd", mb: 4 }}
            >
              找到您需要的答案，了解如何使用 TOPEMS 系统
            </Typography>

            {/* Search Bar */}
            <Box sx={{ maxWidth: 768, mx: "auto" }}>
              <Box sx={{ position: "relative" }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 20,
                    height: 20,
                    color: "grey.400",
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索帮助文章、视频教程..."
                  style={{
                    width: "100%",
                    paddingLeft: 48,
                    paddingRight: 16,
                    paddingTop: 16,
                    paddingBottom: 16,
                    borderRadius: 12,
                    border: "none",
                    fontSize: "1rem",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    outline: "none",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Quick Links */}
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          px: 4,
          mt: -8,
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 3 },
            gap: 2,
          }}
        >
          {[
            {
              icon: Book,
              iconColor: "#2563eb",
              iconBg: "#dbeafe",
              title: "使用文档",
              desc: "详细的功能说明",
            },
            {
              icon: Video,
              iconColor: "#16a34a",
              iconBg: "#dcfce7",
              title: "视频教程",
              desc: "直观的学习方式",
            },
            {
              icon: MessageCircle,
              iconColor: "#9333ea",
              iconBg: "#f3e8ff",
              title: "在线客服",
              desc: "7x24 小时支持",
            },
          ].map((item, idx) => (
            <Button
              key={idx}
              variant="contained"
              sx={{
                bgcolor: "background.paper",
                borderRadius: 2,
                p: 2,
                boxShadow: 3,
                "&:hover": { boxShadow: 6 },
                transition: "box-shadow 0.2s",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: item.iconBg,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <item.icon sx={{ width: 24, height: 24, color: item.iconColor }} />
              </Box>
              <Box sx={{ textAlign: "left" }}>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "grey.900" }}
                >
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  {item.desc}
                </Typography>
              </Box>
            </Button>
          ))}
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          maxWidth: 1280,
          mx: "auto",
          px: 4,
          py: 4,
        }}
      >
        {/* Tabs */}
        <Box sx={{ display: "flex", gap: 4, mb: 4, borderBottom: 1, borderColor: "divider" }}>
          {[
            { value: "articles", label: "帮助文章", icon: Book },
            { value: "videos", label: "视频教程", icon: Video },
            { value: "faq", label: "常见问题", icon: FileText },
          ].map((tab) => (
            <Box
              key={tab.value}
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              sx={{
                pb: 2,
                px: 1,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: activeTab === tab.value ? "primary.main" : "grey.500",
                borderBottom: activeTab === tab.value ? 2 : 0,
                borderColor: "primary.main",
                "&:hover": {
                  color: activeTab === tab.value ? "primary.main" : "grey.700",
                },
                transition: "color 0.2s",
              }}
            >
              <tab.icon sx={{ width: 20, height: 20 }} />
              {tab.label}
            </Box>
          ))}
        </Box>

        {/* Tab Content */}
        {activeTab === "articles" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: 1, lg: 3 },
              gap: 3,
            }}
          >
            {/* Categories */}
            <Box sx={{ lg: { gridColumn: 1 } }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mb: 2 }}>
                分类浏览
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {categories.map((category) => (
                  <Box key={category.id}>
                    <Button
                      fullWidth
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category.id ? null : category.id,
                        )
                      }
                      sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 2,
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "grey.50" },
                        transition: "background-color 0.2s",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography variant="body1" sx={{ fontSize: "1.5rem" }}>
                          {category.icon}
                        </Typography>
                        <Box sx={{ textAlign: "left" }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: "grey.900" }}
                          >
                            {category.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "grey.500" }}>
                            {category.article_count} 篇文章
                          </Typography>
                        </Box>
                      </Box>
                      {expandedCategory === category.id ? (
                        <ChevronDown sx={{ width: 20, height: 20, color: "grey.400" }} />
                      ) : (
                        <ChevronRight sx={{ width: 20, height: 20, color: "grey.400" }} />
                      )}
                    </Button>
                    {expandedCategory === category.id && (
                      <Box sx={{ ml: 3, mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                        {articles
                          .filter((a) => a.category === category.name)
                          .map((article) => (
                            <Button
                              key={article.id}
                              fullWidth
                              onClick={() => handleArticleClick(article)}
                              sx={{
                                textAlign: "left",
                                p: 1.5,
                                color: "grey.600",
                                fontSize: "0.875rem",
                                borderRadius: 1,
                                "&:hover": {
                                  color: "primary.main",
                                  bgcolor: "primary.50",
                                },
                                transition: "all 0.2s",
                              }}
                            >
                              {article.title}
                            </Button>
                          ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Articles List */}
            <Box sx={{ lg: { gridColumn: "span 2" } }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900", mb: 2 }}>
                {searchQuery ? `搜索结果: "${searchQuery}"` : "热门文章"}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filteredArticles.map((article) => (
                  <Box
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      p: 3,
                      cursor: "pointer",
                      "&:hover": { boxShadow: 3 },
                      transition: "box-shadow 0.2s",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <Chip
                            label={article.category}
                            size="small"
                            sx={{
                              bgcolor: "primary.100",
                              color: "primary.700",
                              fontSize: "0.75rem",
                            }}
                          />
                          <Chip
                            label={article.module}
                            size="small"
                            sx={{
                              bgcolor: "grey.100",
                              color: "grey.600",
                              fontSize: "0.75rem",
                            }}
                          />
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}
                        >
                          {article.title}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            fontSize: "0.875rem",
                            color: "grey.500",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Eye sx={{ width: 16, height: 16 }} />
                            {article.views} 次浏览
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <ThumbsUp sx={{ width: 16, height: 16 }} />
                            {article.likes} 次点赞
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Clock sx={{ width: 16, height: 16 }} />
                            {article.updated_at}
                          </Box>
                        </Box>
                      </Box>
                      <ChevronRight sx={{ width: 20, height: 20, color: "grey.400" }} />
                    </Box>
                  </Box>
                ))}

                {filteredArticles.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <Search sx={{ width: 48, height: 48, color: "grey.400", mx: "auto", mb: 2 }} />
                    <Typography sx={{ color: "grey.500" }}>未找到相关文章</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === "videos" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: 1, md: 2, lg: 3 },
              gap: 3,
            }}
          >
            {videos.map((video) => (
              <Box
                key={video.id}
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  overflow: "hidden",
                  "&:hover": { boxShadow: 4 },
                  transition: "box-shadow 0.2s",
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <Box
                    sx={{
                      bgcolor: "grey.200",
                      aspectRatio: "16/9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Video sx={{ width: 48, height: 48, color: "grey.400" }} />
                  </Box>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      bgcolor: "rgba(0,0,0,0.75)",
                      color: "white",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                    }}
                  >
                    {video.duration}
                  </Box>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Chip
                      label={video.module}
                      size="small"
                      sx={{
                        bgcolor: "secondary.100",
                        color: "secondary.700",
                        fontSize: "0.75rem",
                      }}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}>
                    {video.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.500", mb: 2 }}>
                    {video.description}
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      bgcolor: "primary.main",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <Video sx={{ width: 16, height: 16 }} />
                    <span>观看视频</span>
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {activeTab === "faq" && (
          <Box sx={{ maxWidth: 768, mx: "auto" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                {
                  q: "如何重置密码？",
                  a: '在登录页面点击"忘记密码"，输入注册邮箱，系统会发送重置链接到您的邮箱。',
                },
                {
                  q: "如何申请新功能？",
                  a: '您可以通过"反馈建议"功能提交功能需求，我们会定期评估并纳入后续版本规划。',
                },
                {
                  q: "数据导出有限制吗？",
                  a: "付费版本支持批量导出，无数据量限制。免费版本每次最多导出 1000 条记录。",
                },
                {
                  q: "系统支持哪些浏览器？",
                  a: "推荐使用 Chrome、Firefox、Edge、Safari 的最新版本。IE 浏览器不再支持。",
                },
              ].map((faq, idx) => (
                <Box
                  key={idx}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    p: 3,
                    "&:hover": { boxShadow: 2 },
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 600, color: "grey.900", mb: 1, display: "flex", alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: "primary.100",
                        color: "primary.main",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                        mr: 1.5,
                      }}
                    >
                      Q
                    </Box>
                    {faq.q}
                  </Typography>
                  <Typography sx={{ color: "grey.600", ml: 5 }}>
                    {faq.a}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Article Detail Modal */}
      {showArticleDetail && selectedArticle && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            p: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 3,
              boxShadow: 6,
              width: "100%",
              maxWidth: 1024,
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                p: 3,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "grey.900" }}>
                  {selectedArticle.title}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mt: 1,
                    fontSize: "0.875rem",
                    color: "grey.500",
                  }}
                >
                  <span>{selectedArticle.category}</span>
                  <span>·</span>
                  <span>{selectedArticle.updated_at}</span>
                  <span>·</span>
                  <span>{selectedArticle.views} 次浏览</span>
                </Box>
              </Box>
              <Button
                onClick={() => {
                  setShowArticleDetail(false);
                  setSelectedArticle(null);
                }}
                sx={{ p: 1, "&:hover": { bgcolor: "grey.100" }, borderRadius: 1 }}
              >
                <ChevronLeft sx={{ width: 24, height: 24 }} />
              </Button>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
              <Box sx={{ maxWidth: "none" }}>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "0.875rem",
                    color: "grey.700",
                    fontFamily: "inherit",
                  }}
                >
                  {selectedArticle.content}
                </pre>
              </Box>

              <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {selectedArticle.tags?.map((tag, idx) => (
                      <Chip
                        key={idx}
                        label={`#${tag}`}
                        size="small"
                        sx={{
                          bgcolor: "grey.100",
                          color: "grey.600",
                          fontSize: "0.875rem",
                        }}
                      />
                    ))}
                  </Box>
                  <Button
                    onClick={() => handleLikeArticle()}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "grey.600",
                      "&:hover": { bgcolor: "grey.100" },
                      borderRadius: 1,
                    }}
                  >
                    <ThumbsUp sx={{ width: 16, height: 16 }} />
                    <span>有帮助 ({selectedArticle.likes})</span>
                  </Button>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                p: 3,
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Button
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: "primary.main",
                  "&:hover": { bgcolor: "primary.50" },
                  borderRadius: 1,
                }}
              >
                <Download sx={{ width: 16, height: 16 }} />
                <span>下载 PDF</span>
              </Button>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  onClick={() => {
                    setShowArticleDetail(false);
                    setSelectedArticle(null);
                  }}
                  sx={{
                    bgcolor: "grey.100",
                    color: "grey.700",
                    "&:hover": { bgcolor: "grey.200" },
                  }}
                >
                  关闭
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default HelpCenterPage;
