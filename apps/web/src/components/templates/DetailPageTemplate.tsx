import React, { useState } from "react";
import type { BoxProps } from "@mui/material";
import { Box, Paper, Typography, Tabs, Tab, IconButton, Tooltip, Divider, Skeleton, Chip, useTheme, useMediaQuery,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Edit,
  Delete,
  Share2,
  MoreHorizontal,
  Printer,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BreadcrumbItem, PageAction } from "./PageHeader";
import { PageHeader } from "./PageHeader";

// ============ 类型定义 ============

export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export interface SectionConfig {
  id: string;
  title?: string;
  description?: string;
  content: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface DetailField {
  label: string;
  value: React.ReactNode;
  span?: number;
  copyable?: boolean;
}

export interface DetailPageTemplateProps extends BoxProps {
  // 页面信息
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  // 状态
  loading?: boolean;
  error?: string;

  // 返回
  backHref?: string;
  onBack?: () => void;

  // 操作
  actions?: PageAction[];
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;

  // 标签页
  tabs?: TabConfig[];
  defaultTab?: string;

  // 区块
  sections?: SectionConfig[];

  // 侧边栏
  sidebar?: React.ReactNode;
  sidebarWidth?: number;

  // 信息卡片
  infoCard?: {
    avatar?: React.ReactNode;
    title?: string;
    subtitle?: string;
    tags?: string[];
    stats?: Array<{ label: string; value: string | number }>;
  };

  // 子组件
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
}

// ============ 详情页模板组件 ============

export const DetailPageTemplate: React.FC<DetailPageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  loading,
  error,
  backHref,
  onBack,
  actions,
  onEdit,
  onDelete,
  onShare,
  onPrint,
  onDownload,
  tabs,
  defaultTab,
  sections,
  sidebar,
  sidebarWidth = 320,
  infoCard,
  headerContent,
  children,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.id || "");

  // 默认操作按钮
  const defaultActions: PageAction[] = [];
  if (onEdit) {
    defaultActions.push({
      label: "编辑",
      icon: <Edit style={{ width: 18, height: 18 }} />,
      onClick: onEdit,
      variant: "outlined",
    });
  }
  if (onShare) {
    defaultActions.push({
      label: "分享",
      icon: <Share2 style={{ width: 18, height: 18 }} />,
      onClick: onShare,
      variant: "text",
    });
  }
  if (onDelete) {
    defaultActions.push({
      label: "删除",
      icon: <Delete style={{ width: 18, height: 18 }} />,
      onClick: onDelete,
      variant: "text",
      color: "error",
    });
  }

  const allActions = [...(actions || []), ...defaultActions];

  // 渲染信息卡片
  const renderInfoCard = () => {
    if (!infoCard) return null;

    return (
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          color: "white",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
          {infoCard.avatar && (
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {infoCard.avatar}
            </Box>
          )}
          <Box sx={{ flex: 1 }}>
            {loading ? (
              <>
                <Skeleton
                  width={150}
                  height={32}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                />
                <Skeleton
                  width={100}
                  height={20}
                  sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                />
              </>
            ) : (
              <>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {infoCard.title || title}
                </Typography>
                {infoCard.subtitle && (
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {infoCard.subtitle}
                  </Typography>
                )}
                {infoCard.tags && infoCard.tags.length > 0 && (
                  <Box
                    sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}
                  >
                    {infoCard.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "white",
                          fontSize: "0.75rem",
                        }}
                      />
                    ))}
                  </Box>
                )}
              </>
            )}
          </Box>
          {infoCard.stats && infoCard.stats.length > 0 && (
            <Box sx={{ display: "flex", gap: 3 }}>
              {infoCard.stats.map((stat, index) => (
                <Box key={index} sx={{ textAlign: "center" }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {loading ? <Skeleton width={40} /> : stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  // 渲染标签页
  const renderTabs = () => {
    if (!tabs || tabs.length === 0) return null;

    return (
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && (
                    <Chip
                      label={tab.badge}
                      size="small"
                      color="primary"
                      sx={{ height: 20, fontSize: "0.7rem" }}
                    />
                  )}
                </Box>
              }
              disabled={tab.disabled}
              sx={{ textTransform: "none" }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabs.find((tab) => tab.id === activeTab)?.content}
        </Box>
      </Paper>
    );
  };

  // 渲染区块
  const renderSections = () => {
    if (!sections || sections.length === 0) return null;

    return sections.map((section, index) => (
      <Paper key={section.id || index} sx={{ borderRadius: 2, mb: 3 }}>
        {section.title && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {section.title}
            </Typography>
            {section.description && (
              <Typography variant="caption" color="text.secondary">
                {section.description}
              </Typography>
            )}
          </Box>
        )}
        <Box sx={{ p: 3 }}>{section.content}</Box>
      </Paper>
    ));
  };

  // 渲染侧边栏
  const renderSidebar = () => {
    if (!sidebar) return null;

    if (isMobile) {
      return <Paper sx={{ borderRadius: 2, mb: 3, p: 3 }}>{sidebar}</Paper>;
    }

    return (
      <Paper
        sx={{
          borderRadius: 2,
          p: 3,
          position: "sticky",
          top: 80,
          width: sidebarWidth,
          flexShrink: 0,
        }}
      >
        {sidebar}
      </Paper>
    );
  };

  // 渲染主内容
  const renderMainContent = () => {
    if (tabs) {
      return renderTabs();
    }

    if (sections) {
      return renderSections();
    }

    return children;
  };

  return (
    <Box {...props}>
      {/* 页面头部 */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={allActions}
        backButton={{
          href: backHref,
          onClick: onBack,
        }}
        loading={loading}
      >
        {headerContent}
      </PageHeader>

      {/* 信息卡片 */}
      {renderInfoCard()}

      {/* 主内容区域 */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {/* 主内容 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>{renderMainContent()}</Box>

        {/* 侧边栏 */}
        {renderSidebar()}
      </Box>
    </Box>
  );
};

export default DetailPageTemplate;
