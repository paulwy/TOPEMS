/**
 * 系统设置页面
 * 管理系统基础配置、邮件设置、短信设置、日志设置
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Settings,
  Mail,
  MessageSquare,
  FileText,
  ChevronLeft,
  Save,
  RotateCcw,
  Bell,
  Shield,
  Database,
  Globe,
  Key,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ============ Mock 数据 ============
const mockSettings = {
  basic: {
    systemName: "TOPEMS 企业管理系统",
    systemLogo: "",
    companyName: "示例公司",
    contactEmail: "admin@example.com",
    contactPhone: "400-123-4567",
    address: "北京市朝阳区某某路123号",
  },
  mail: {
    enabled: true,
    smtpHost: "smtp.example.com",
    smtpPort: 465,
    smtpUsername: "noreply@example.com",
    smtpPassword: "",
    useTLS: true,
    fromEmail: "noreply@example.com",
    fromName: "TOPEMS 系统",
  },
  sms: {
    enabled: false,
    provider: "aliyun",
    accessKeyId: "",
    accessKeySecret: "",
    signName: "TOPEMS",
  },
  log: {
    level: "info",
    retentionDays: 30,
    enableAccessLog: true,
    enableOperationLog: true,
    enableSecurityLog: true,
  },
};

const settingGroups = [
  { id: "basic", label: "基础配置", icon: Settings },
  { id: "mail", label: "邮件设置", icon: Mail },
  { id: "sms", label: "短信设置", icon: MessageSquare },
  { id: "log", label: "日志设置", icon: FileText },
];

export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [activeGroup, setActiveGroup] = useState("basic");
  const [settings, setSettings] = useState(mockSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (
    group: string,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group as keyof typeof prev],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // 保存设置
    console.log("保存设置:", settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(mockSettings);
    setHasChanges(false);
  };

  const renderBasicSettings = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="系统名称"
        value={settings.basic.systemName}
        onChange={(e) =>
          handleSettingChange("basic", "systemName", e.target.value)
        }
        fullWidth
        size="small"
      />
      <TextField
        label="公司名称"
        value={settings.basic.companyName}
        onChange={(e) =>
          handleSettingChange("basic", "companyName", e.target.value)
        }
        fullWidth
        size="small"
      />
      <TextField
        label="联系邮箱"
        value={settings.basic.contactEmail}
        onChange={(e) =>
          handleSettingChange("basic", "contactEmail", e.target.value)
        }
        fullWidth
        size="small"
      />
      <TextField
        label="联系电话"
        value={settings.basic.contactPhone}
        onChange={(e) =>
          handleSettingChange("basic", "contactPhone", e.target.value)
        }
        fullWidth
        size="small"
      />
      <TextField
        label="公司地址"
        value={settings.basic.address}
        onChange={(e) =>
          handleSettingChange("basic", "address", e.target.value)
        }
        fullWidth
        size="small"
        multiline
        rows={2}
      />
    </Box>
  );

  const renderMailSettings = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.mail.enabled}
            onChange={(e) =>
              handleSettingChange("mail", "enabled", e.target.checked)
            }
          />
        }
        label="启用邮件服务"
      />
      <TextField
        label="SMTP 服务器"
        value={settings.mail.smtpHost}
        onChange={(e) =>
          handleSettingChange("mail", "smtpHost", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.mail.enabled}
      />
      <TextField
        label="SMTP 端口"
        type="number"
        value={settings.mail.smtpPort}
        onChange={(e) =>
          handleSettingChange("mail", "smtpPort", parseInt(e.target.value))
        }
        fullWidth
        size="small"
        disabled={!settings.mail.enabled}
      />
      <TextField
        label="用户名"
        value={settings.mail.smtpUsername}
        onChange={(e) =>
          handleSettingChange("mail", "smtpUsername", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.mail.enabled}
      />
      <TextField
        label="密码"
        type="password"
        value={settings.mail.smtpPassword}
        onChange={(e) =>
          handleSettingChange("mail", "smtpPassword", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.mail.enabled}
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.mail.useTLS}
            onChange={(e) =>
              handleSettingChange("mail", "useTLS", e.target.checked)
            }
          />
        }
        label="使用 TLS"
        disabled={!settings.mail.enabled}
      />
      <TextField
        label="发件人邮箱"
        value={settings.mail.fromEmail}
        onChange={(e) =>
          handleSettingChange("mail", "fromEmail", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.mail.enabled}
      />
      <TextField
        label="发件人名称"
        value={settings.mail.fromName}
        onChange={(e) =>
          handleSettingChange("mail", "fromName", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.mail.enabled}
      />
    </Box>
  );

  const renderSmsSettings = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.sms.enabled}
            onChange={(e) =>
              handleSettingChange("sms", "enabled", e.target.checked)
            }
          />
        }
        label="启用短信服务"
      />
      <FormControl size="small" fullWidth disabled={!settings.sms.enabled}>
        <InputLabel>短信服务商</InputLabel>
        <Select
          value={settings.sms.provider}
          label="短信服务商"
          onChange={(e) =>
            handleSettingChange("sms", "provider", e.target.value)
          }
        >
          <MenuItem value="aliyun">阿里云</MenuItem>
          <MenuItem value="tencent">腾讯云</MenuItem>
          <MenuItem value="huawei">华为云</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="AccessKey ID"
        value={settings.sms.accessKeyId}
        onChange={(e) =>
          handleSettingChange("sms", "accessKeyId", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.sms.enabled}
      />
      <TextField
        label="AccessKey Secret"
        type="password"
        value={settings.sms.accessKeySecret}
        onChange={(e) =>
          handleSettingChange("sms", "accessKeySecret", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.sms.enabled}
      />
      <TextField
        label="签名名称"
        value={settings.sms.signName}
        onChange={(e) =>
          handleSettingChange("sms", "signName", e.target.value)
        }
        fullWidth
        size="small"
        disabled={!settings.sms.enabled}
      />
    </Box>
  );

  const renderLogSettings = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>日志级别</InputLabel>
        <Select
          value={settings.log.level}
          label="日志级别"
          onChange={(e) =>
            handleSettingChange("log", "level", e.target.value)
          }
        >
          <MenuItem value="debug">Debug</MenuItem>
          <MenuItem value="info">Info</MenuItem>
          <MenuItem value="warn">Warning</MenuItem>
          <MenuItem value="error">Error</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="日志保留天数"
        type="number"
        value={settings.log.retentionDays}
        onChange={(e) =>
          handleSettingChange(
            "log",
            "retentionDays",
            parseInt(e.target.value),
          )
        }
        fullWidth
        size="small"
        inputProps={{ min: 1, max: 365 }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.log.enableAccessLog}
            onChange={(e) =>
              handleSettingChange("log", "enableAccessLog", e.target.checked)
            }
          />
        }
        label="启用访问日志"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.log.enableOperationLog}
            onChange={(e) =>
              handleSettingChange("log", "enableOperationLog", e.target.checked)
            }
          />
        }
        label="启用操作日志"
      />
      <FormControlLabel
        control={
          <Switch
            checked={settings.log.enableSecurityLog}
            onChange={(e) =>
              handleSettingChange("log", "enableSecurityLog", e.target.checked)
            }
          />
        }
        label="启用安全日志"
      />
    </Box>
  );

  const renderSettingsContent = () => {
    switch (activeGroup) {
      case "basic":
        return renderBasicSettings();
      case "mail":
        return renderMailSettings();
      case "sms":
        return renderSmsSettings();
      case "log":
        return renderLogSettings();
      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 3,
          }}
        >
          <IconButton onClick={() => navigate("/dashboard")}>
            <ChevronLeft />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              系统设置
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理系统基础配置、邮件设置、短信设置、日志设置
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 3 }}>
          {/* 左侧导航 */}
          <Card sx={{ width: 240, flexShrink: 0 }}>
            <CardContent sx={{ p: 0 }}>
              <List>
                {settingGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <ListItem
                      key={group.id}
                      component="div"
                      onClick={() => setActiveGroup(group.id)}
                      sx={{
                        cursor: "pointer",
                        bgcolor:
                          activeGroup === group.id
                            ? "primary.light"
                            : "transparent",
                        borderLeft: 3,
                        borderColor:
                          activeGroup === group.id
                            ? "primary.main"
                            : "transparent",
                        "&:hover": {
                          bgcolor:
                            activeGroup === group.id
                              ? "primary.light"
                              : "action.hover",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Icon
                          style={{
                            width: 20,
                            height: 20,
                            color:
                              activeGroup === group.id
                                ? "#3b82f6"
                                : "inherit",
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={group.label}
                        primaryTypographyProps={{
                          fontWeight:
                            activeGroup === group.id ? 600 : 400,
                          color:
                            activeGroup === group.id
                              ? "primary.main"
                              : "text.primary",
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>

          {/* 右侧设置内容 */}
          <Card sx={{ flex: 1 }}>
            <CardHeader
              title={
                settingGroups.find((g) => g.id === activeGroup)?.label || ""
              }
              action={
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RotateCcw style={{ width: 16, height: 16 }} />}
                    onClick={handleReset}
                    disabled={!hasChanges}
                  >
                    重置
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Save style={{ width: 16, height: 16 }} />}
                    onClick={handleSave}
                    disabled={!hasChanges}
                  >
                    保存
                  </Button>
                </Box>
              }
            />
            <CardContent>{renderSettingsContent()}</CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
