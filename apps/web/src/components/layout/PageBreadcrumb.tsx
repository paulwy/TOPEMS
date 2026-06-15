import React from "react";
import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import { Home, ChevronRight } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

// ============ 类型定义 ============

export interface BreadcrumbItem {
  /** 显示标签 */
  label: string;
  /** 跳转链接 */
  href?: string;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
}

export interface PageBreadcrumbProps {
  /** 面包屑项列表 */
  items: BreadcrumbItem[];
  /** 是否显示首页图标 */
  showHome?: boolean;
  /** 首页链接 */
  homeHref?: string;
  /** 首页点击回调 */
  onHomeClick?: () => void;
  /** 自定义分隔符 */
  separator?: React.ReactNode;
  /** 最大显示项数 */
  maxItems?: number;
  /** 自定义样式 */
  sx?: object;
}

// ============ PageBreadcrumb 组件 ============

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  items,
  showHome = true,
  homeHref = "/",
  onHomeClick,
  separator,
  maxItems = 8,
  sx,
}) => {
  const defaultSeparator = separator || (
    <ChevronRight style={{ width: 16, height: 16, opacity: 0.5 }} />
  );

  const renderBreadcrumbItem = (
    item: BreadcrumbItem,
    index: number,
    isLast: boolean,
  ) => {
    // 最后一项不可点击
    if (isLast || (!item.href && !item.onClick)) {
      return (
        <Typography
          key={index}
          color="text.primary"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: "0.875rem",
            fontWeight: isLast ? 500 : 400,
          }}
        >
          {item.icon}
          {item.label}
        </Typography>
      );
    }

    // 可点击项
    return (
      <Link
        key={index}
        component={item.href ? RouterLink : "button"}
        to={item.href}
        onClick={item.onClick}
        color="inherit"
        underline="hover"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          fontSize: "0.875rem",
          cursor: "pointer",
          "&:hover": {
            color: "primary.main",
          },
        }}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  };

  // 构建面包屑项
  const breadcrumbItems = [];

  // 添加首页
  if (showHome) {
    breadcrumbItems.push(
      <Link
        key="home"
        component={homeHref ? RouterLink : "button"}
        to={homeHref}
        onClick={onHomeClick}
        color="inherit"
        underline="hover"
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          "&:hover": {
            color: "primary.main",
          },
        }}
      >
        <Home style={{ width: 16, height: 16 }} />
      </Link>,
    );
  }

  // 添加其他项
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    breadcrumbItems.push(renderBreadcrumbItem(item, index, isLast));
  });

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Breadcrumbs
        separator={defaultSeparator}
        maxItems={maxItems}
        itemsAfterCollapse={2}
        sx={{
          "& .MuiBreadcrumbs-ol": {
            flexWrap: "nowrap",
          },
        }}
      >
        {breadcrumbItems}
      </Breadcrumbs>
    </Box>
  );
};

export default PageBreadcrumb;
