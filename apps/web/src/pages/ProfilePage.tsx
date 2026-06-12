import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Mail,
  Shield,
  Settings,
  ChevronLeft,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  Star,
  Camera,
  Activity,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi, type User as UserType, type AccessLog } from "../api/iam";
import { useAppStore } from "../store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  ip_address?: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

interface ProfileFormData {
  full_name: string;
  email: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const initialized = useRef(false);
  const addNotification = useAppStore((state) => state.addNotification);
  const setUser = useAppStore((state) => state.setUser);
  const shortcuts = useAppStore((state) => state.shortcuts);
  const setShortcuts = useAppStore((state) => state.setShortcuts);
  const notificationSettings = useAppStore(
    (state) => state.notificationSettings,
  );
  const setNotificationSettings = useAppStore(
    (state) => state.setNotificationSettings,
  );

  const [user, setUserState] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      full_name: "",
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const loadUserProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.getCurrentUser();
      if (res.success && res.data) {
        setUserState(res.data);
        profileForm.reset({
          full_name: res.data.full_name || "",
          email: res.data.email,
        });
        if (setUser) {
          setUser({
            id: res.data.id,
            username: res.data.username,
            email: res.data.email,
            fullName: res.data.full_name,
            role: res.data.role,
            roles: res.data.roles,
            permissions: res.data.permissions,
            isActive: res.data.is_active,
            isSuperuser: res.data.is_superuser,
          });
        }
      } else {
        setError(res.message || "获取用户信息失败");
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "获取用户信息失败";
      setError(errorMsg);
      addNotification({ title: "加载失败", message: errorMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [setUser, addNotification, profileForm]);

  const loadActivities = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    setLoadingActivities(true);
    try {
      const res = await authApi.getUserAccessLogs(user.id, 10, 0);
      if (res.success && res.data) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error("加载活动记录失败", err);
    } finally {
      setLoadingActivities(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;
    loadUserProfile();
    loadActivities();
  }, [loadUserProfile, loadActivities]);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        addNotification({
          title: "错误",
          message: "请选择图片文件",
          type: "error",
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        addNotification({
          title: "错误",
          message: "图片大小不能超过2MB",
          type: "error",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        authApi
          .updateAvatar({ avatar_url: result })
          .then((res) => {
            if (res.success && res.data) {
              setUserState(res.data);
              addNotification({
                title: "成功",
                message: "头像已更新",
                type: "success",
              });
            }
          })
          .catch(() => {
            addNotification({
              title: "错误",
              message: "头像更新失败",
              type: "error",
            });
          });
      };
      reader.readAsDataURL(file);
    },
    [addNotification],
  );

  const handleProfileUpdate = useCallback(
    async (data: ProfileFormData) => {
      if (!user) return;

      try {
        const res = await authApi.updateCurrentUser({
          full_name: data.full_name || undefined,
          email: data.email,
        });

        if (res.success && res.data) {
          setUserState(res.data);
          if (setUser) {
            setUser({
              id: res.data.id,
              username: res.data.username,
              email: res.data.email,
              fullName: res.data.full_name,
              role: res.data.role,
              roles: res.data.roles,
              permissions: res.data.permissions,
              isActive: res.data.is_active,
              isSuperuser: res.data.is_superuser,
            });
          }
          addNotification({
            title: "成功",
            message: "个人信息更新成功",
            type: "success",
          });
        } else {
          addNotification({
            title: "失败",
            message: res.message || "更新失败",
            type: "error",
          });
        }
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message || err.message || "更新失败";
        addNotification({ title: "失败", message: errorMsg, type: "error" });
      }
    },
    [user, setUser, addNotification],
  );

  const handlePasswordChange = useCallback(
    async (data: PasswordFormData) => {
      if (data.new_password !== data.confirm_password) {
        addNotification({
          title: "错误",
          message: "两次输入的密码不一致",
          type: "error",
        });
        passwordForm.setError("confirm_password", {
          message: "两次输入的密码不一致",
        });
        return;
      }

      if (data.new_password.length < 6) {
        addNotification({
          title: "错误",
          message: "密码长度至少为6位",
          type: "error",
        });
        passwordForm.setError("new_password", { message: "密码长度至少为6位" });
        return;
      }

      try {
        const res = await authApi.changePassword({
          current_password: data.current_password,
          new_password: data.new_password,
        });

        if (res.success) {
          addNotification({
            title: "成功",
            message: "密码修改成功，请重新登录",
            type: "success",
          });
          setShowPasswordDialog(false);
          passwordForm.reset();
          setTimeout(() => {
            authApi.logout();
            navigate("/login");
          }, 2000);
        } else {
          addNotification({
            title: "失败",
            message: res.message || "修改密码失败",
            type: "error",
          });
        }
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message || err.message || "修改密码失败";
        addNotification({ title: "失败", message: errorMsg, type: "error" });
      }
    },
    [addNotification, navigate, passwordForm],
  );

  const handleNotificationSettingChange = useCallback(
    async (key: keyof NotificationSettings) => {
      const newSettings = {
        ...notificationSettings,
        [key]: !notificationSettings[key],
      };
      setNotificationSettings(newSettings);
      try {
        await authApi.updatePreferences({ notification_settings: newSettings });
        addNotification({
          title: "成功",
          message: `${key}通知设置已更新`,
          type: "success",
        });
      } catch (err) {
        console.error("保存通知设置失败", err);
        addNotification({
          title: "错误",
          message: "保存通知设置失败",
          type: "error",
        });
      }
    },
    [notificationSettings, addNotification],
  );

  const handleShortcutToggle = useCallback(
    (shortcut: { id: string; title: string; path: string; icon: string }) => {
      let newShortcuts: {
        id: string;
        title: string;
        path: string;
        icon: string;
      }[];
      if (shortcuts.find((s) => s.id === shortcut.id)) {
        newShortcuts = shortcuts.filter((s) => s.id !== shortcut.id);
        addNotification({
          title: "提示",
          message: `${shortcut.title}已从快捷方式移除`,
          type: "info",
        });
      } else {
        newShortcuts = [...shortcuts, shortcut];
        addNotification({
          title: "提示",
          message: `${shortcut.title}已添加到快捷方式`,
          type: "success",
        });
      }
      setShortcuts(newShortcuts);

      authApi.updatePreferences({ shortcuts: newShortcuts }).catch((err) => {
        console.error("保存快捷方式失败", err);
      });
    },
    [shortcuts, setShortcuts, addNotification],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400">
            {error || "无法获取用户信息"}
          </p>
          <Button className="mt-4" onClick={loadUserProfile}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <User className="w-7 h-7 mr-3 text-blue-600" />
                  个人中心
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  管理您的个人信息和账户安全
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Avatar className="w-24 h-24 mb-4">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt="Avatar" />
                      ) : null}
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {user.full_name?.charAt(0).toUpperCase() ||
                          user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-4 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {user.full_name || user.username}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {user.email}
                  </p>
                  <div className="mt-4 w-full space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      <span>用户名: {user.username}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Shield className="w-4 h-4" />
                      <span>角色: {user.role || "普通用户"}</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <RefreshCw className="w-4 h-4" />
                      <span>
                        创建于:{" "}
                        {new Date(user.created_at).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <Card>
                <CardHeader className="pb-2">
                  <TabsList>
                    <TabsTrigger value="profile">
                      <User className="w-4 h-4 mr-2" />
                      个人信息
                    </TabsTrigger>
                    <TabsTrigger value="security">
                      <Shield className="w-4 h-4 mr-2" />
                      账户安全
                    </TabsTrigger>
                    <TabsTrigger value="activities">
                      <Activity className="w-4 h-4 mr-2" />
                      最近活动
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                      <Bell className="w-4 h-4 mr-2" />
                      通知设置
                    </TabsTrigger>
                    <TabsTrigger value="shortcuts">
                      <Star className="w-4 h-4 mr-2" />
                      快捷方式
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="profile" className="mt-0">
                    <form
                      onSubmit={profileForm.handleSubmit(handleProfileUpdate)}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">姓名</Label>
                          <Input
                            id="full_name"
                            {...profileForm.register("full_name")}
                            placeholder="请输入姓名"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">邮箱 *</Label>
                          <Input
                            id="email"
                            type="email"
                            {...profileForm.register("email", {
                              required: "邮箱是必填项",
                              pattern: {
                                value:
                                  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "请输入有效的邮箱地址",
                              },
                            })}
                            placeholder="请输入邮箱"
                          />
                          {profileForm.formState.errors.email && (
                            <p className="text-sm text-red-500">
                              {profileForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">用户名</Label>
                          <Input
                            id="username"
                            value={user.username}
                            disabled
                            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-4">
                        <Button type="submit">
                          <Save className="w-4 h-4 mr-2" />
                          保存更改
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => profileForm.reset()}
                        >
                          重置
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="security" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              修改密码
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              定期更新密码以保护账户安全
                            </p>
                          </div>
                        </div>
                        <Button onClick={() => setShowPasswordDialog(true)}>
                          修改密码
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-green-600" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              邮箱验证
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email} 已验证
                            </p>
                          </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Settings className="w-5 h-5 text-purple-600" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              登录状态
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              当前会话活跃中
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" onClick={authApi.logout}>
                          退出登录
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activities" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          最近活动记录
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadActivities}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          刷新
                        </Button>
                      </div>
                      {loadingActivities ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                          <p className="mt-2 text-sm text-gray-500">
                            加载中...
                          </p>
                        </div>
                      ) : activities.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            暂无活动记录
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-2 ${
                                  activity.success
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {activity.action}
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      activity.created_at,
                                    ).toLocaleString("zh-CN")}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {activity.resource}
                                  {activity.ip_address &&
                                    ` · ${activity.ip_address}`}
                                </p>
                                {activity.error_message && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {activity.error_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-0">
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                          通知偏好设置
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Mail className="w-5 h-5 text-blue-600" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  邮件通知
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  接收重要信息的邮件通知
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={notificationSettings.email_enabled}
                              onCheckedChange={() =>
                                handleNotificationSettingChange("email_enabled")
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Bell className="w-5 h-5 text-yellow-600" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  系统通知
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  接收系统消息和公告
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={notificationSettings.system_enabled}
                              onCheckedChange={() =>
                                handleNotificationSettingChange(
                                  "system_enabled",
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Activity className="w-5 h-5 text-green-600" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  工作流通知
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  接收工作流审批和任务提醒
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={notificationSettings.workflow_enabled}
                              onCheckedChange={() =>
                                handleNotificationSettingChange(
                                  "workflow_enabled",
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-purple-600" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  文档通知
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  接收文档更新和评论提醒
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={notificationSettings.document_enabled}
                              onCheckedChange={() =>
                                handleNotificationSettingChange(
                                  "document_enabled",
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Shield className="w-5 h-5 text-red-600" />
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  安全通知
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  接收登录和账户安全提醒
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={notificationSettings.security_enabled}
                              onCheckedChange={() =>
                                handleNotificationSettingChange(
                                  "security_enabled",
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="shortcuts" className="mt-0">
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                          我的快捷方式
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          选择您常用的功能添加到快捷方式
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            {
                              id: "1",
                              title: "仪表盘",
                              icon: Activity,
                              path: "/dashboard",
                              color: "bg-blue-500",
                            },
                            {
                              id: "2",
                              title: "文档中心",
                              icon: FileText,
                              path: "/documents",
                              color: "bg-green-500",
                            },
                            {
                              id: "3",
                              title: "工作流",
                              icon: Activity,
                              path: "/workflows",
                              color: "bg-purple-500",
                            },
                            {
                              id: "4",
                              title: "通知中心",
                              icon: Bell,
                              path: "/notifications",
                              color: "bg-yellow-500",
                            },
                            {
                              id: "5",
                              title: "AI助手",
                              icon: Activity,
                              path: "/ai",
                              color: "bg-pink-500",
                            },
                            {
                              id: "6",
                              title: "消息中心",
                              icon: MessageSquare,
                              path: "/im",
                              color: "bg-indigo-500",
                            },
                          ].map((item) => {
                            const isSelected = shortcuts.some(
                              (s) => s.id === item.id,
                            );
                            const Icon = item.icon;
                            return (
                              <div
                                key={item.id}
                                onClick={() =>
                                  handleShortcutToggle({
                                    id: item.id,
                                    title: item.title,
                                    icon: String(item.icon),
                                    path: item.path,
                                  })
                                }
                                className={`p-4 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                                    : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-blue-300"
                                }`}
                              >
                                <div className="flex flex-col items-center text-center">
                                  <div
                                    className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-3`}
                                  >
                                    <Icon className="w-6 h-6 text-white" />
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {item.title}
                                  </p>
                                  {isSelected && (
                                    <Badge
                                      variant="default"
                                      className="mt-2 text-xs"
                                    >
                                      已添加
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {shortcuts.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                            当前快捷方式
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {shortcuts.map((shortcut) => (
                              <Badge
                                key={shortcut.id}
                                variant="secondary"
                                className="px-3 py-1 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20"
                                onClick={() => handleShortcutToggle(shortcut)}
                              >
                                {shortcut.title} ×
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              请输入当前密码和新密码来完成密码修改
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="current_password">当前密码 *</Label>
              <Input
                id="current_password"
                type="password"
                {...passwordForm.register("current_password", {
                  required: "当前密码是必填项",
                })}
                placeholder="请输入当前密码"
              />
              {passwordForm.formState.errors.current_password && (
                <p className="text-sm text-red-500">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">新密码 *</Label>
              <Input
                id="new_password"
                type="password"
                {...passwordForm.register("new_password", {
                  required: "新密码是必填项",
                  minLength: {
                    value: 6,
                    message: "密码长度至少为6位",
                  },
                })}
                placeholder="请输入新密码（至少6位）"
              />
              {passwordForm.formState.errors.new_password && (
                <p className="text-sm text-red-500">
                  {passwordForm.formState.errors.new_password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">确认新密码 *</Label>
              <Input
                id="confirm_password"
                type="password"
                {...passwordForm.register("confirm_password", {
                  required: "请再次输入新密码",
                })}
                placeholder="请再次输入新密码"
              />
              {passwordForm.formState.errors.confirm_password && (
                <p className="text-sm text-red-500">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowPasswordDialog(false);
                  passwordForm.reset();
                }}
              >
                取消
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                确认修改
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
