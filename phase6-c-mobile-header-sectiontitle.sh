#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Phase 6-C: Mobile API 增强 + AppHeader 动态化 + SectionTitle 标记
#
# (1) Mobile 5 个页面添加 API 对接 TODO 注释
# (2) 创建 PushNotificationPage + NotificationListPage 并注册路由
# (3) AppHeader centralNavItems 动态化注释/代码
# (4) ERP/Admin 页面标记 SectionTitle 替换位置
# (5) 备份 .bak.phase6-c，幂等执行
###############################################################################

PROJECT_ROOT="/Users/air/TOPEMS"
WEB_SRC="${PROJECT_ROOT}/apps/web/src"
BACKUP_SUFFIX=".bak.phase6-c"

# ── 颜色 & 工具 ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
log_info() { echo -e "${YELLOW}[INFO]${NC} $*"; }
log_err()  { echo -e "${RED}[ERR]${NC} $*" >&2; }

# ── 幂等备份 ────────────────────────────────────────────────────────────────
backup_file() {
  local f="$1"
  if [[ ! -f "${f}${BACKUP_SUFFIX}" ]]; then
    cp "$f" "${f}${BACKUP_SUFFIX}"
    log_ok "备份: $(basename "$f")"
  else
    log_info "已有备份，跳过: $(basename "$f")"
  fi
}

# ── 幂等注入 TODO 注释块 ────────────────────────────────────────────────────
# 用法: inject_todo <file> <marker> <todo_block>
# marker 用于幂等检测，已存在则跳过
inject_todo() {
  local file="$1" marker="$2" block="$3"
  if grep -qF "$marker" "$file" 2>/dev/null; then
    log_info "已存在 marker [$marker]，跳过: $(basename "$file")"
    return 0
  fi
  # 在文件末尾的 export default 之前插入，或追加到文件末尾
  # 简单策略：追加到文件末尾
  echo "" >> "$file"
  echo "$block" >> "$file"
  log_ok "注入 TODO: $(basename "$file") → $marker"
}

# ═══════════════════════════════════════════════════════════════════════════════
echo "=========================================="
echo " Phase 6-C: Mobile + Header + SectionTitle"
echo "=========================================="

# ═══════════════════════════════════════════════════════════════════════════════
# 任务 1: Mobile 5 个页面 API 对接 TODO 注释
# ═══════════════════════════════════════════════════════════════════════════════
log_info "=== 任务 1: Mobile 页面 API 对接增强 ==="

# --- 1.1 MobileHomePage.tsx ---
MOBILE_HOME="${WEB_SRC}/pages/mobile/MobileHomePage.tsx"
backup_file "$MOBILE_HOME"
inject_todo "$MOBILE_HOME" "PHASE6C_API_TODO_HOME" \
"// [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
// MobileHomePage 首页统计卡片数据:
//   - 当前已在 loadData() 中调用 mobileApi.getDashboardStats() / listMobileTasks() / listApprovalTasks()
//   - 增强 API 对接: 当后端提供专用聚合接口时，替换为 useCrudQueries<DashboardStats>
//   - 示例:
//     const { data: statsData, loading: statsLoading } = useCrudQueries<DashboardStats>({
//       basePath: '/api/mobile/dashboard',
//       autoFetch: true,
//     });
//   - 将 stats 数组直接绑定到 statsData，移除手动 Promise.all 逻辑"

# --- 1.2 MobileTaskListPage.tsx ---
MOBILE_TASKS="${WEB_SRC}/pages/mobile/MobileTaskListPage.tsx"
backup_file "$MOBILE_TASKS"
inject_todo "$MOBILE_TASKS" "PHASE6C_API_TODO_TASKS" \
"// [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
// MobileTaskListPage 任务列表数据:
//   - 当前已调用 mobileApi.listMobileTasks({ page, pagesize }) 获取任务
//   - 增强 API 对接: 使用 useCrudQueries<Task> 自动管理分页和加载
//   - 示例:
//     const { data, loading, pagination } = useCrudQueries<Task>({
//       basePath: '/api/mobile/tasks',
//       autoFetch: true,
//       pageSize: 10,
//     });
//   - mapApiTaskToTask 映射函数可保留，放入 data.transform 选项"

# --- 1.3 MobileApprovalPage.tsx ---
MOBILE_APPROVAL="${WEB_SRC}/pages/mobile/MobileApprovalPage.tsx"
backup_file "$MOBILE_APPROVAL"
inject_todo "$MOBILE_APPROVAL" "PHASE6C_API_TODO_APPROVAL" \
"// [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
// MobileApprovalPage 审批列表数据:
//   - 当前已调用 approvalTaskApi.listApprovalTasks(params) 获取审批列表
//   - 增强 API 对接: 使用 useCrudQueries<ApprovalItem> 自动管理筛选和加载
//   - 示例:
//     const { data, loading, refetch } = useCrudQueries<ApprovalItem>({
//       basePath: '/api/workflow/approvals',
//       autoFetch: true,
//       params: { status: activeTab === 0 ? 'pending' : 'completed' },
//     });
//   - mapApiApprovalToApprovalItem 可保留，放入 transform 选项
//   - handleApprove/handleReject 可通过 useCrudQueries 的 update mutation 实现"

# --- 1.4 MobileWorkbenchPage.tsx ---
MOBILE_WORKBENCH="${WEB_SRC}/pages/mobile/MobileWorkbenchPage.tsx"
backup_file "$MOBILE_WORKBENCH"
inject_todo "$MOBILE_WORKBENCH" "PHASE6C_API_TODO_WORKBENCH" \
"// [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
// MobileWorkbenchPage 工作台快捷入口:
//   - 当前 loadData() 中 workbenchData 为硬编码 mock 对象 (行 142-150)
//   - mockItems 也是硬编码列表 (行 187-232)
//   - 增强 API 对接: 使用 useCrudQueries<WorkbenchData> 获取工作台聚合数据
//   - 示例:
//     const { data, loading } = useCrudQueries<WorkbenchData>({
//       basePath: '/api/mobile/workbench',
//       autoFetch: true,
//     });
//   - 待办事项列表可改用 useCrudQueries<WorkbenchItem>({ basePath: '/api/mobile/workbench/items' })"

# --- 1.5 MobileProfilePage.tsx ---
MOBILE_PROFILE="${WEB_SRC}/pages/mobile/MobileProfilePage.tsx"
backup_file "$MOBILE_PROFILE"
inject_todo "$MOBILE_PROFILE" "PHASE6C_API_TODO_PROFILE" \
"// [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
// MobileProfilePage 个人信息:
//   - 当前个人信息来自 useAppStore().user（内存状态）
//   - 增强 API 对接: 使用 useCrudQueries<UserProfile> 同步最新用户信息
//   - 示例:
//     const { data: profile, loading, refetch } = useCrudQueries<UserProfile>({
//       basePath: '/api/iam/users/me',
//       autoFetch: true,
//     });
//   - 设置项（深色模式、推送开关等）应持久化到后端用户偏好 API"

# ═══════════════════════════════════════════════════════════════════════════════
# 任务 1.5: 创建 PushNotificationPage + NotificationListPage
# ═══════════════════════════════════════════════════════════════════════════════
log_info "=== 任务 1.5: 创建新 Mobile 页面 ==="

# --- PushNotificationPage.tsx ---
PUSH_NOTIFICATION="${WEB_SRC}/pages/mobile/PushNotificationPage.tsx"
if [[ -f "$PUSH_NOTIFICATION" ]]; then
  backup_file "$PUSH_NOTIFICATION"
  log_info "PushNotificationPage 已存在，跳过创建"
else
  cat > "$PUSH_NOTIFICATION" << 'PUSH_EOF'
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  Chip,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import {
  Bell,
  MessageSquare,
  Mail,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { MobileLayout, MobileSkeleton, MobileCard } from '@/components/mobile';
import { useAppStore } from '@/store';

interface PushTemplate {
  id: string;
  name: string;
  type: 'system' | 'approval' | 'task' | 'reminder';
  title: string;
  body: string;
  enabled: boolean;
  status: 'active' | 'draft' | 'disabled';
}

interface PushConfig {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const PushNotificationPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PushConfig>({
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [templates, setTemplates] = useState<PushTemplate[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
      // 示例:
      // const { data: configData } = useCrudQueries<PushConfig>({ basePath: '/api/mobile/push-config' });
      // const { data: templateData } = useCrudQueries<PushTemplate>({ basePath: '/api/mobile/push-templates' });
      setConfig({
        enabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });
      setTemplates([
        {
          id: 'tpl-1',
          name: '审批通知',
          type: 'approval',
          title: '新审批任务',
          body: '您有一个新的审批任务待处理',
          enabled: true,
          status: 'active',
        },
        {
          id: 'tpl-2',
          name: '任务提醒',
          type: 'task',
          title: '任务截止提醒',
          body: '您的任务即将到期，请及时处理',
          enabled: true,
          status: 'active',
        },
        {
          id: 'tpl-3',
          name: '系统公告',
          type: 'system',
          title: '系统公告',
          body: '系统将于今晚进行维护升级',
          enabled: true,
          status: 'active',
        },
        {
          id: 'tpl-4',
          name: '库存预警',
          type: 'reminder',
          title: '库存预警通知',
          body: '物料库存低于安全线',
          enabled: false,
          status: 'disabled',
        },
      ]);
    } catch (err) {
      console.error('加载推送配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleConfig = (key: keyof PushConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval': return 'warning';
      case 'task': return 'primary';
      case 'system': return 'info';
      case 'reminder': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '启用中';
      case 'draft': return '草稿';
      case 'disabled': return '已停用';
      default: return status;
    }
  };

  if (loading) {
    return (
      <MobileLayout title='推送管理' showBack onBackClick={() => navigate(-1)}>
        <Box sx={{ p: 2 }}><MobileSkeleton type='list' count={4} /></Box>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title='推送管理' showBack onBackClick={() => navigate(-1)}>
      <Box sx={{ p: 2, pb: 3 }}>
        {/* 推送开关 */}
        <Paper
          elevation={0}
          sx={{ p: 2, borderRadius: 2, mb: 3, border: 1, borderColor: 'divider' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Bell style={{ width: 20, height: 20, color: 'primary.main' }} />
              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                推送通知总开关
              </Typography>
            </Box>
            <Switch
              checked={config.enabled}
              onChange={() => handleToggleConfig('enabled')}
            />
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body2'>通知声音</Typography>
              <Switch
                checked={config.soundEnabled}
                onChange={() => handleToggleConfig('soundEnabled')}
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body2'>振动提醒</Typography>
              <Switch
                checked={config.vibrationEnabled}
                onChange={() => handleToggleConfig('vibrationEnabled')}
                size='small'
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant='body2'>
                免打扰 {config.quietHoursStart} - {config.quietHoursEnd}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* 推送模板列表 */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 2, border: 1, borderColor: 'divider', overflow: 'hidden' }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
              推送模板
            </Typography>
            <Chip label={`${templates.filter((t) => t.enabled).length}/${templates.length}`} size='small' />
          </Box>
          {templates.map((template, index) => (
            <Box key={template.id}>
              {index > 0 && <Divider />}
              <Box sx={{ px: 2, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {template.name}
                    </Typography>
                    <Chip
                      label={getStatusLabel(template.status)}
                      size='small'
                      color={template.status === 'active' ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                  <Switch
                    checked={template.enabled}
                    onChange={() => handleToggleTemplate(template.id)}
                    size='small'
                  />
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  标题: {template.title}
                </Typography>
                <br />
                <Typography variant='caption' color='text.secondary'>
                  内容: {template.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>
    </MobileLayout>
  );
};

export default PushNotificationPage;
PUSH_EOF
  log_ok "创建: PushNotificationPage.tsx"
fi

# --- NotificationListPage.tsx ---
NOTIFICATION_LIST="${WEB_SRC}/pages/mobile/NotificationListPage.tsx"
if [[ -f "$NOTIFICATION_LIST" ]]; then
  backup_file "$NOTIFICATION_LIST"
  log_info "NotificationListPage 已存在，跳过创建"
else
  cat > "$NOTIFICATION_LIST" << 'NOTIF_EOF'
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  CheckCheck,
  Filter,
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton } from '@/components/mobile';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  time: string;
  source: string;
}

const NotificationListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // [Phase 6-C] TODO: API 对接 — 替换 mock 数据，使用 useCrudQueries hook
      // 示例:
      // const { data, loading } = useCrudQueries<NotificationItem>({
      //   basePath: '/api/mobile/notifications',
      //   autoFetch: true,
      //   params: { status: activeTab === 0 ? 'unread' : 'all' },
      // });
      setNotifications([
        {
          id: 'n-1',
          title: '采购订单审批',
          content: '您有一个新的采购订单 PO-2026-001 待审批',
          type: 'warning',
          read: false,
          time: '5 分钟前',
          source: '审批系统',
        },
        {
          id: 'n-2',
          title: '生产订单完成',
          content: '生产订单 MO-2026-0456 已完成，产量 500 件',
          type: 'success',
          read: false,
          time: '30 分钟前',
          source: '生产管理',
        },
        {
          id: 'n-3',
          title: '库存预警',
          content: '原材料 A-001 库存低于安全线，当前库存 50 件',
          type: 'error',
          read: false,
          time: '1 小时前',
          source: '仓储管理',
        },
        {
          id: 'n-4',
          title: '系统维护通知',
          content: '系统将于今晚 22:00 进行维护升级，预计 2 小时',
          type: 'info',
          read: true,
          time: '2 小时前',
          source: '系统管理',
        },
        {
          id: 'n-5',
          title: '质检任务提醒',
          content: '来料质检批次 #B20240601 待检验',
          type: 'info',
          read: true,
          time: '3 小时前',
          source: '质量管理',
        },
        {
          id: 'n-6',
          title: '考勤异常提醒',
          content: '您今天未完成下班打卡，请及时补签',
          type: 'warning',
          read: true,
          time: '昨天',
          source: '人事管理',
        },
      ]);
    } catch (err) {
      console.error('加载通知列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getAvatarColor = (type: string) => {
    switch (type) {
      case 'success': return 'success.main';
      case 'warning': return 'warning.main';
      case 'error': return 'error.main';
      default: return 'primary.main';
    }
  };

  const getAvatarBg = (type: string) => {
    switch (type) {
      case 'success': return 'success.lighter';
      case 'warning': return 'warning.lighter';
      case 'error': return 'error.lighter';
      default: return 'primary.lighter';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 0) return true;
    if (activeTab === 1) return !n.read;
    return n.read;
  });

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home': navigate('/mobile/home'); break;
      case 'tasks': navigate('/mobile/tasks'); break;
      case 'scan': navigate('/mobile/scan-page'); break;
      case 'approval': navigate('/mobile/approvals'); break;
      case 'profile': navigate('/mobile/settings'); break;
    }
  };

  const bottomTabs = [
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    { id: 'approval', label: '审批', icon: <CheckSquare style={{ width: 22, height: 22 }} /> },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  return (
    <MobileLayout
      title='消息通知'
      showBack={false}
      showMenu={false}
      showTabBar
      tabs={bottomTabs}
      activeTab='home'
      onTabChange={handleBottomTabChange}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant='fullWidth'
        sx={{ px: 2, mb: 1, '& .MuiTab-root': { minHeight: 44, fontSize: '0.875rem' } }}
      >
        <Tab label='全部' />
        <Tab label={`未读 (${notifications.filter((n) => !n.read).length})`} />
        <Tab label='已读' />
      </Tabs>

      <PullToRefresh onRefresh={handleRefresh}>
        {loading ? (
          <MobileSkeleton type='list' count={6} />
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, px: 4 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Bell style={{ width: 32, height: 32, color: 'text.secondary' }} />
            </Box>
            <Typography variant='subtitle1' sx={{ mb: 1, fontWeight: 500 }}>暂无通知</Typography>
            <Typography variant='body2' color='text.secondary'>当前分类下暂无通知消息</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    px: 2,
                    py: 2,
                    bgcolor: !notification.read ? 'action.hover' : 'transparent',
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: getAvatarBg(notification.type),
                        color: getAvatarColor(notification.type),
                        fontSize: '0.75rem',
                      }}
                    >
                      {notification.type === 'success' ? '✓' : notification.type === 'warning' ? '!' : notification.type === 'error' ? '×' : 'i'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: notification.read ? 400 : 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.25,
                          }}
                        >
                          {notification.content}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Clock style={{ width: 12, height: 12, color: 'text.disabled' }} />
                          <Typography variant='caption' color='text.disabled'>
                            {notification.time}
                          </Typography>
                          <Chip label={notification.source} size='small' sx={{ height: 16, fontSize: '0.625rem' }} />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider component='li' />}
              </React.Fragment>
            ))}
          </List>
        )}
      </PullToRefresh>
    </MobileLayout>
  );
};

export default NotificationListPage;
NOTIF_EOF
  log_ok "创建: NotificationListPage.tsx"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 任务 1.6: 注册路由到 mobile.ts
# ═══════════════════════════════════════════════════════════════════════════════
log_info "=== 任务 1.6: 注册路由到 mobile.ts ==="

MOBILE_ROUTES="${WEB_SRC}/routes/mobile.ts"
backup_file "$MOBILE_ROUTES"

# 幂等检查: 如果已经导入过 PushNotificationPage 则跳过
if ! grep -qF "PushNotificationPage" "$MOBILE_ROUTES"; then
  # 在 NotificationSettingsPage 导入行之后添加新页面导入
  sed -i '' "/const NotificationSettingsPage/a\\
const PushNotificationPage = lazy(() => import('../pages/mobile/PushNotificationPage'));\\
const NotificationListPage = lazy(() => import('../pages/mobile/NotificationListPage'));
" "$MOBILE_ROUTES"
  log_ok "添加 lazy import: PushNotificationPage + NotificationListPage"
else
  log_info "lazy import 已存在，跳过"
fi

# 幂等检查: 如果已有 /mobile/push-notifications 路由则跳过
if ! grep -qF "/mobile/push-notifications" "$MOBILE_ROUTES"; then
  # 在最后一个路由条目的闭合括号 ] 之前插入两个新路由
  # 找到 mobileRoutes 数组中最后一个 }, 的位置
  sed -i '' "/path: '\/mobile\/notifications',/{
    N
    N
    N
    N
    N
    a\\
  {\\
    path: '/mobile/push-notifications',\\
    element: PushNotificationPage,\\
    requiredPermissions: ['mobile:admin'],\\
    module: 'mobile',\\
    action: 'admin',\\
  },\\
  {\\
    path: '/mobile/notification-list',\\
    element: NotificationListPage,\\
    requiredPermissions: ['mobile:read'],\\
    module: 'mobile',\\
    action: 'read',\\
  },
}" "$MOBILE_ROUTES"
  log_ok "注册路由: /mobile/push-notifications + /mobile/notification-list"
else
  log_info "路由已注册，跳过"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 任务 2: AppHeader centralNavItems 动态化
# ═══════════════════════════════════════════════════════════════════════════════
log_info "=== 任务 2: AppHeader centralNavItems 动态化 ==="

APP_HEADER="${WEB_SRC}/components/layout/AppHeader.tsx"
backup_file "$APP_HEADER"

if ! grep -qF "PHASE6C_HEADER_DYNAMIC_NAV" "$APP_HEADER"; then
  # 在 centralNavItems 静态定义之后注入动态化注释块
  # centralNavItems 位于行 154-162 附近
  sed -i '' '/const centralNavItems = \[/,/];$/{
    /];$/a\
\
  // [Phase 6-C] TODO: centralNavItems 动态化方案\
  // 当前 centralNavItems 为静态配置，应根据用户所在模块动态显示对应 Dashboard 入口。\
  // 实现方案:\
  //   1. 使用 navigationRegistry.getModuleCards() 获取已注册模块列表\
  //   2. 从 location.pathname 推断当前模块 (如 /hrm/* → HRM, /erp/* → ERP)\
  //   3. 在中央导航栏中动态替换「数据仪表盘」为当前模块的 Dashboard\
  //\
  // 示例代码:\
  //   const currentModule = useMemo(() => {\
  //     const segments = location.pathname.split("/").filter(Boolean);\
  //     const moduleCode = segments[0] || ""; // e.g. "hrm", "erp", "crm"\
  //     return navigationRegistry.getModuleCard(moduleCode);\
  //   }, [location.pathname]);\
  //\
  //   const dynamicCentralNavItems = useMemo(() => {\
  //     const base = [\
  //       { label: "首页", path: "/", icon: <Home style={{ width: 16, height: 16 }} /> },\
  //       { label: "模块概览", path: "/modules", icon: <Grid3X3 style={{ width: 16, height: 16 }} /> },\
  //     ];\
  //     if (currentModule) {\
  //       base.push({\
  //         label: currentModule.name + " 仪表盘",\
  //         path: "/" + currentModule.code + "/dashboard",\
  //         icon: <BarChart3 style={{ width: 16, height: 16 }} />,\
  //       });\
  //     } else {\
  //       base.push({\
  //         label: "数据仪表盘",\
  //         path: "/dashboard",\
  //         icon: <BarChart3 style={{ width: 16, height: 16 }} />,\
  //       });\
  //     }\
  //     return base;\
  //   }, [currentModule]);\
  //\
  // 然后将 JSX 中的 centralNavItems.map 替换为 dynamicCentralNavItems.map\
  // [Phase 6-C] PHASE6C_HEADER_DYNAMIC_NAV
  }' "$APP_HEADER"
  log_ok "注入 AppHeader centralNavItems 动态化注释"
else
  log_info "AppHeader 动态化注释已存在，跳过"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 任务 3: SectionTitle 批量替换标记 (ERP + Admin)
# ═══════════════════════════════════════════════════════════════════════════════
log_info "=== 任务 3: ERP/Admin SectionTitle 替换标记 ==="

# 使用 Python 脚本进行精确扫描和标记
SCAN_SCRIPT=$(mktemp /tmp/phase6c_sectiontitle_XXXXXX.py)

cat > "$SCAN_SCRIPT" << 'PYSCAN_EOF'
#!/usr/bin/env python3
"""Phase 6-C: 扫描 ERP/Admin 页面中内联 Typography section title 模式并添加 TODO 注释。"""
import re, sys, os

SECTIONTITLE_MARKER = "[Phase 6-C] PHASE6C_SECTIONTITLE_TODO"
# 匹配 <Typography variant='subtitle2' sx={{ ... fontWeight: 600 ... }}> 模式
# 或 <Typography sx={{ fontWeight: 600, mb: 0.5 ... }}> 作为 section title
PATTERNS = [
    re.compile(
        r"(<Typography\s+variant='subtitle2'\s+sx=\{\{[^}]*fontWeight:\s*600[^}]*\}\}\s*>)",
        re.MULTILINE,
    ),
    re.compile(
        r"(<Typography\s+sx=\{\{\s*fontWeight:\s*600,\s*(?:mb:\s*[01]|color:\s*'grey\.900')\s*\}\}>)",
        re.MULTILINE,
    ),
]

TARGET_DIRS = [
    os.path.expanduser("/Users/air/TOPEMS/apps/web/src/pages/erp"),
    os.path.expanduser("/Users/air/TOPEMS/apps/web/src/pages/admin"),
]

count_total = 0
count_files = 0

for dirpath in TARGET_DIRS:
    if not os.path.isdir(dirpath):
        print(f"[WARN] 目录不存在: {dirpath}", file=sys.stderr)
        continue
    for fname in sorted(os.listdir(dirpath)):
        if not fname.endswith(".tsx") or fname.endswith(".bak.phase6-c"):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        # 幂等: 如果已标记过则跳过整个文件
        if SECTIONTITLE_MARKER in content:
            continue

        new_content = content
        file_matches = 0
        for pat in PATTERNS:
            matches = list(pat.finditer(new_content))
            if not matches:
                continue
            # 从后往前替换，避免偏移
            for m in reversed(matches):
                line_num = new_content[:m.start()].count("\n") + 1
                comment = f"// {SECTIONTITLE_MARKER} — 行 {line_num}: 替换为 <SectionTitle variant=\"page\">"
                insert_pos = m.start()
                # 找到这一行的开头
                line_start = new_content.rfind("\n", 0, insert_pos) + 1
                # 计算 indent
                indent_match = re.match(r"(\s*)", new_content[line_start:])
                indent = indent_match.group(1) if indent_match else ""
                new_content = (
                    new_content[:line_start]
                    + indent + comment + "\n"
                    + new_content[line_start:]
                )
                file_matches += 1

        if file_matches > 0:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            basename = os.path.basename(fpath)
            print(f"  [OK] {basename}: 标记 {file_matches} 处 Typography → SectionTitle")
            count_files += 1
            count_total += file_matches

print(f"\nSectionTitle 标记完成: {count_files} 个文件, 共 {count_total} 处")
PYSCAN_EOF

python3 "$SCAN_SCRIPT"
rm -f "$SCAN_SCRIPT"

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "=========================================="
echo " Phase 6-C Mobile + Header + SectionTitle: DONE"
echo "=========================================="
