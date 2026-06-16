/**
 * FlowSettingsPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 保持原有的 Tab + 左侧导航布局设计
 * 3. 主题色使用紫色 (#8b5cf6)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Bell,
  Shield,
  Layers,
} from "lucide-react";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface FlowCategory {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface NodeType {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

interface NotificationTemplate {
  id: string;
  name: string;
  content: string;
  trigger: string;
}

// ============ Mock 数据 ============
const mockCategories: FlowCategory[] = [
  {
    id: "1",
    name: "审批流程",
    code: "approval",
    description: "通用审批流程",
  },
  {
    id: "2",
    name: "报销流程",
    code: "reimbursement",
    description: "费用报销相关流程",
  },
  {
    id: "3",
    name: "采购流程",
    code: "purchase",
    description: "采购申请审批流程",
  },
  {
    id: "4",
    name: "合同流程",
    code: "contract",
    description: "合同审批相关流程",
  },
  {
    id: "5",
    name: "差旅流程",
    code: "travel",
    description: "差旅申请相关流程",
  },
];

const mockNodeTypes: NodeType[] = [
  { id: "1", name: "开始节点", icon: "Play", enabled: true },
  { id: "2", name: "结束节点", icon: "Square", enabled: true },
  { id: "3", name: "审批节点", icon: "CheckCircle", enabled: true },
  { id: "4", name: "任务节点", icon: "List", enabled: true },
  { id: "5", name: "条件节点", icon: "GitBranch", enabled: true },
  { id: "6", name: "抄送节点", icon: "Mail", enabled: true },
  { id: "7", name: "加签节点", icon: "UserPlus", enabled: false },
];

const mockNotificationTemplates: NotificationTemplate[] = [
  {
    id: "1",
    name: "审批通知",
    content: "您有一个待审批任务：{task_name}，申请人：{applicant}，请及时处理。",
    trigger: "待审批",
  },
  {
    id: "2",
    name: "审批通过通知",
    content: "您的申请 {task_name} 已通过审批。",
    trigger: "审批通过",
  },
  {
    id: "3",
    name: "审批拒绝通知",
    content: "您的申请 {task_name} 未通过审批，拒绝原因：{reason}。",
    trigger: "审批拒绝",
  },
  {
    id: "4",
    name: "催办通知",
    content: "您的申请 {task_name} 已超时，请尽快处理。",
    trigger: "超时催办",
  },
];

// ============ 组件 ============
const FlowSettingsPageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // Tab 状态
  const [activeTab, setActiveTab] = useState(0);

  // 数据状态
  const [categories, setCategories] = useState<FlowCategory[]>(mockCategories);
  const [nodeTypes] = useState<NodeType[]>(mockNodeTypes);
  const [templates, setTemplates] = useState<NotificationTemplate[]>(mockNotificationTemplates);

  // 基础设置状态
  const [basicSettings, setBasicSettings] = useState({
    autoArchive: true,
    archiveDays: 30,
    allowRecall: true,
    maxRecallSteps: 3,
    enableDraft: true,
    draftDays: 7,
  });

  // 审批设置状态
  const [approvalSettings, setApprovalSettings] = useState({
    defaultTimeout: 24,
    timeoutAction: "reject",
    enableUrge: true,
    maxUrgeCount: 3,
    enableDelegation: true,
  });

  // Tab 配置
  const tabs = [
    { label: "基础设置", icon: <Settings size={18} /> },
    { label: "审批设置", icon: <Shield size={18} /> },
    { label: "通知设置", icon: <Bell size={18} /> },
    { label: "权限设置", icon: <Shield size={18} /> },
  ];

  // 处理分类删除
  const handleCategoryDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // 处理节点类型切换
  const handleNodeTypeToggle = (id: string) => {
    console.log("切换节点类型:", id);
  };

  // 处理模板编辑
  const handleTemplateEdit = (template: NotificationTemplate) => {
    console.log("编辑模板:", template.id);
  };

  return (
    <>
      <PageHeader
        title="流程设置"
        subtitle="配置流程模块的基础功能和参数"
        icon={<Layers size={24} />}
        showBack
        onBack={() => navigate(-1)}
      />

      <Box sx={{ display: "flex", gap: 3 }}>
        {/* 左侧导航 */}
        <Card sx={{ width: 240, height: "fit-content" }}>
          <CardContent sx={{ p: 0 }}>
            <List disablePadding>
              {tabs.map((tab, index) => (
                <ListItem
                  key={index}
                  disablePadding
                  sx={{
                    cursor: "pointer",
                    bgcolor: activeTab === index ? "primary.light" : "transparent",
                    "&:hover": {
                      bgcolor: activeTab === index ? "primary.light" : "grey.100",
                    },
                  }}
                >
                  <Box
                    onClick={() => setActiveTab(index)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      p: 1.5,
                    }}
                  >
                    <Box sx={{ mr: 1.5, color: "#8b5cf6" }}>{tab.icon}</Box>
                    <Typography variant="body2" sx={{ fontSize: 14 }}>
                      {tab.label}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* 右侧内容 */}
        <Box sx={{ flex: 1 }}>
          {/* 基础设置 */}
          {activeTab === 0 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  基础设置
                </Typography>

                <Stack spacing={3}>
                  {/* 流程分类管理 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      流程分类管理
                    </Typography>
                    <Stack spacing={1}>
                      {categories.map((category) => (
                        <Box
                          key={category.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {category.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {category.code} - {category.description}
                            </Typography>
                          </Box>
                          <IconButton size="small">
                            <Edit size={16} />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleCategoryDelete(category.id)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Box>
                      ))}
                      <Button variant="outlined" startIcon={<Plus size={16} />} size="small" sx={{ mt: 1 }}>
                        添加分类
                      </Button>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 归档设置 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      归档设置
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
                      <Switch
                        checked={basicSettings.autoArchive}
                        onChange={(e) =>
                          setBasicSettings({ ...basicSettings, autoArchive: e.target.checked })
                        }
                      />
                      <Typography variant="body2">启用自动归档</Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={basicSettings.archiveDays}
                        onChange={(e) =>
                          setBasicSettings({
                            ...basicSettings,
                            archiveDays: parseInt(e.target.value) || 30,
                          })
                        }
                        sx={{ width: 80 }}
                        disabled={!basicSettings.autoArchive}
                      />
                      <Typography variant="body2">天后归档</Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 撤回设置 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      撤回设置
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Switch
                        checked={basicSettings.allowRecall}
                        onChange={(e) =>
                          setBasicSettings({ ...basicSettings, allowRecall: e.target.checked })
                        }
                      />
                      <Typography variant="body2">允许撤回申请</Typography>
                      <TextField
                        size="small"
                        value={basicSettings.maxRecallSteps}
                        onChange={(e) =>
                          setBasicSettings({
                            ...basicSettings,
                            maxRecallSteps: parseInt(e.target.value) || 3,
                          })
                        }
                        sx={{ width: 80 }}
                        disabled={!basicSettings.allowRecall}
                      />
                      <Typography variant="body2">步内可撤回</Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 草稿设置 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      草稿设置
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Switch
                        checked={basicSettings.enableDraft}
                        onChange={(e) =>
                          setBasicSettings({ ...basicSettings, enableDraft: e.target.checked })
                        }
                      />
                      <Typography variant="body2">启用草稿保存</Typography>
                      <TextField
                        size="small"
                        value={basicSettings.draftDays}
                        onChange={(e) =>
                          setBasicSettings({
                            ...basicSettings,
                            draftDays: parseInt(e.target.value) || 7,
                          })
                        }
                        sx={{ width: 80 }}
                        disabled={!basicSettings.enableDraft}
                      />
                      <Typography variant="body2">天保存草稿</Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 3 }}>
                  <Button variant="contained" sx={{ bgcolor: "#8b5cf6" }}>
                    保存设置
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* 审批设置 */}
          {activeTab === 1 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  审批设置
                </Typography>

                <Stack spacing={3}>
                  {/* 节点类型配置 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      节点类型配置
                    </Typography>
                    <Stack spacing={1}>
                      {nodeTypes.map((nodeType) => (
                        <Box
                          key={nodeType.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 2,
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {nodeType.name}
                            </Typography>
                          </Box>
                          <Switch
                            checked={nodeType.enabled}
                            onChange={() => handleNodeTypeToggle(nodeType.id)}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 超时设置 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      超时设置
                    </Typography>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 100 }}>
                          默认超时时间
                        </Typography>
                        <TextField
                          size="small"
                          value={approvalSettings.defaultTimeout}
                          onChange={(e) =>
                            setApprovalSettings({
                              ...approvalSettings,
                              defaultTimeout: parseInt(e.target.value) || 24,
                            })
                          }
                          sx={{ width: 100 }}
                        />
                        <Typography variant="body2">小时</Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 100 }}>
                          超时操作
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select
                            value={approvalSettings.timeoutAction}
                            onChange={(e) =>
                              setApprovalSettings({
                                ...approvalSettings,
                                timeoutAction: e.target.value,
                              })
                            }
                          >
                            <MenuItem value="reject">自动拒绝</MenuItem>
                            <MenuItem value="approve">自动通过</MenuItem>
                            <MenuItem value="notify">发送通知</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 催办设置 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      催办设置
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Switch
                        checked={approvalSettings.enableUrge}
                        onChange={(e) =>
                          setApprovalSettings({
                            ...approvalSettings,
                            enableUrge: e.target.checked,
                          })
                        }
                      />
                      <Typography variant="body2">启用催办功能</Typography>
                      <TextField
                        size="small"
                        value={approvalSettings.maxUrgeCount}
                        onChange={(e) =>
                          setApprovalSettings({
                            ...approvalSettings,
                            maxUrgeCount: parseInt(e.target.value) || 3,
                          })
                        }
                        sx={{ width: 80 }}
                        disabled={!approvalSettings.enableUrge}
                      />
                      <Typography variant="body2">次最大催办</Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 委托设置 */}
                  <Box>
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Switch
                        checked={approvalSettings.enableDelegation}
                        onChange={(e) =>
                          setApprovalSettings({
                            ...approvalSettings,
                            enableDelegation: e.target.checked,
                          })
                        }
                      />
                      <Typography variant="body2">启用委托功能</Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 3 }}>
                  <Button variant="contained" sx={{ bgcolor: "#8b5cf6" }}>
                    保存设置
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* 通知设置 */}
          {activeTab === 2 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  通知设置
                </Typography>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                    通知模板设置
                  </Typography>
                  <Stack spacing={2}>
                    {templates.map((template) => (
                      <Box
                        key={template.id}
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                            {template.name}
                          </Typography>
                          <Chip size="small" label={template.trigger} sx={{ mr: 1 }} />
                          <IconButton size="small" onClick={() => handleTemplateEdit(template)}>
                            <Edit size={16} />
                          </IconButton>
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {template.content}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 3 }}>
                  <Button variant="contained" sx={{ bgcolor: "#8b5cf6" }}>
                    保存设置
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* 权限设置 */}
          {activeTab === 3 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  权限设置
                </Typography>

                <Stack spacing={3}>
                  {/* 流程管理权限 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      流程管理权限
                    </Typography>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 200 }}>
                          创建流程定义
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select defaultValue="admin">
                            <MenuItem value="admin">仅管理员</MenuItem>
                            <MenuItem value="all">所有人</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 200 }}>
                          编辑流程定义
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select defaultValue="creator">
                            <MenuItem value="admin">仅管理员</MenuItem>
                            <MenuItem value="creator">创建者</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 200 }}>
                          删除流程定义
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select defaultValue="admin">
                            <MenuItem value="admin">仅管理员</MenuItem>
                            <MenuItem value="creator">创建者</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* 流程操作权限 */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "grey.700" }}>
                      流程操作权限
                    </Typography>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 200 }}>
                          催办权限
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select defaultValue="all">
                            <MenuItem value="admin">仅管理员</MenuItem>
                            <MenuItem value="all">所有人</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 200 }}>
                          终止权限
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select defaultValue="admin">
                            <MenuItem value="admin">仅管理员</MenuItem>
                            <MenuItem value="creator">创建者</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" sx={{ minWidth: 200 }}>
                          取回权限
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select defaultValue="all">
                            <MenuItem value="admin">仅管理员</MenuItem>
                            <MenuItem value="all">所有人</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 3 }}>
                  <Button variant="contained" sx={{ bgcolor: "#8b5cf6" }}>
                    保存设置
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </>
  );
};

export default FlowSettingsPageRefactored;
