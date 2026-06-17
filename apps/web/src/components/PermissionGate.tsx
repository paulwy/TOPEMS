import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import React from "react";
import { usePermission } from "../hooks/usePermission";
import { useRole } from "../hooks/useRole";
import { Shield, User, Users, Crown, Eye, Loader2 } from "lucide-react";

interface PermissionGateProps {
  children: ReactNode;
  permission?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  requireAll = false,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { checkPermission, checkAnyPermission, checkAllPermissions } =
    usePermission();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
        }}
      >
        <Loader2
          sx={{
            width: 16,
            height: 16,
            color: "#9ca3af",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!permission) {
    return <>{children}</>;
  }

  let hasPermission: boolean;
  if (Array.isArray(permission)) {
    hasPermission = requireAll
      ? checkAllPermissions(permission)
      : checkAnyPermission(permission);
  } else {
    hasPermission = checkPermission(permission);
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: "not-allowed" }}
        title="您没有此操作的权限"
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface RoleGateProps {
  children: ReactNode;
  role?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  role,
  requireAll = false,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { checkRole, checkAnyRole } = useRole();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
        }}
      >
        <Loader2
          sx={{
            width: 16,
            height: 16,
            color: "#9ca3af",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!role) {
    return <>{children}</>;
  }

  let hasRole: boolean;
  if (Array.isArray(role)) {
    hasRole = requireAll ? role.every((r) => checkRole(r)) : checkAnyRole(role);
  } else {
    hasRole = checkRole(role);
  }

  if (hasRole) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: "not-allowed" }}
        title="您没有此角色权限"
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface ModuleGateProps {
  children: ReactNode;
  module: string;
  action?: "read" | "write" | "update" | "delete" | "admin";
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const ModuleGate: React.FC<ModuleGateProps> = ({
  children,
  module,
  action = "read",
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { canAccessModule, canWriteModule, canDeleteModule, canAdminModule } =
    usePermission();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
        }}
      >
        <Loader2
          sx={{
            width: 16,
            height: 16,
            color: "#9ca3af",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  const checkAction = () => {
    switch (action) {
      case "read":
        return canAccessModule(module);
      case "write":
        return canWriteModule(module);
      case "delete":
        return canDeleteModule(module);
      case "admin":
        return canAdminModule(module);
      default:
        return false;
    }
  };

  const hasPermission = checkAction();

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: "not-allowed" }}
        title={`您没有${module}模块的${action}权限`}
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const AdminGate: React.FC<AdminGateProps> = ({
  children,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { isAdmin } = useRole();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
        }}
      >
        <Loader2
          sx={{
            width: 16,
            height: 16,
            color: "#9ca3af",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (isAdmin()) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: "not-allowed" }}
        title="需要管理员权限"
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface SuperuserGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const SuperuserGate: React.FC<SuperuserGateProps> = ({
  children,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { isSuperuser } = usePermission();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
        }}
      >
        <Loader2
          sx={{
            width: 16,
            height: 16,
            color: "#9ca3af",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (isSuperuser) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: "not-allowed" }}
        title="需要超级管理员权限"
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

// 角色徽章组件 - 用于显示用户角色
interface RoleBadgeProps {
  role: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

type IconComponent = React.ComponentType<{ className?: string }>;

const roleConfig: Record<
  string,
  {
    variant: "default" | "destructive" | "outline" | "secondary";
    icon: IconComponent;
    label: string;
  }
> = {
  admin: { variant: "destructive", icon: Crown, label: "管理员" },
  Admin: { variant: "destructive", icon: Crown, label: "管理员" },
  manager: { variant: "secondary", icon: Users, label: "经理" },
  Manager: { variant: "secondary", icon: Users, label: "经理" },
  user: { variant: "default", icon: User, label: "用户" },
  User: { variant: "default", icon: User, label: "用户" },
  guest: { variant: "outline", icon: Eye, label: "访客" },
  Guest: { variant: "outline", icon: Eye, label: "访客" },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = "md",
  showIcon = true,
}) => {
  const config = roleConfig[role] || {
    variant: "outline" as const,
    icon: Shield,
    label: role,
  };
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <Chip
      size="small"
      variant={config.variant === "outline" ? "outlined" : "filled"}
      sx={{ gap: "4px" }}
      label={config.label}
    />
  );
};

// 权限徽章组件 - 用于显示权限
interface PermissionBadgeProps {
  permission: string;
  size?: "sm" | "md";
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  permission,
  size = "sm",
}) => {
  const [module, action] = permission.split(":");

  const actionColors: Record<string, { bg: string; text: string }> = {
    read: { bg: "#dcfce7", text: "#15803d" },
    write: { bg: "#dbeafe", text: "#1d4ed8" },
    delete: { bg: "#fee2e2", text: "#b91c1c" },
    admin: { bg: "#f3e8ff", text: "#7c3aed" },
  };

  const colorStyle = actionColors[action] || { bg: "#f3f4f6", text: "#374151" };

  const sizeStyles = {
    sm: {
      fontSize: "12px",
      paddingLeft: "6px",
      paddingRight: "6px",
      paddingTop: "2px",
      paddingBottom: "2px",
    },
    md: {
      fontSize: "14px",
      paddingLeft: "8px",
      paddingRight: "8px",
      paddingTop: "4px",
      paddingBottom: "4px",
    },
  };

  return (
    <span
      style={{
        backgroundColor: colorStyle.bg,
        color: colorStyle.text,
        borderRadius: "4px",
        fontWeight: 500,
        ...sizeStyles[size],
      }}
    >
      {module}:{action}
    </span>
  );
};
