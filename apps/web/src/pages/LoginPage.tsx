import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { isDevelopment } from "../config/runtime";
import { useAppStore } from "../store";

import Button from "@mui/material/Button";
import {
  Card as MuiCard,
  CardContent,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { ModeToggle } from "@/components/ModeToggle";

// 登录表单验证 schema
const loginFormSchema = z.object({
  username: z
    .string()
    .min(2, { message: "用户名长度至少为2位" })
    .max(20, { message: "用户名不能超过20个字符" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "用户名只能包含字母和数字" }),
  password: z.string().min(6, { message: "密码至少需要6个字符" }),
  email: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginPageProps {
  onLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const addNotification = useAppStore((state) => state.addNotification);

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 定义表单
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  // 处理表单提交
  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      if (isRegister) {
        // 注册功能由管理员管理
        addNotification({
          title: "提示",
          message: "注册功能已关闭，请联系管理员获取账号",
          type: "info",
        });
        return;
      }

      let response = await login({
        username: values.username,
        password: values.password,
      });

      console.log("登录响应:", response);

      if (response.success) {
        addNotification({
          title: "登录成功",
          message: "欢迎回来！",
          type: "success",
        });
        navigate("/dashboard");
      } else {
        addNotification({
          title: "登录失败",
          message: response.message || "操作失败",
          type: "error",
        });
      }
    } catch (err: any) {
      console.error("登录错误:", err);
      addNotification({
        title: "错误",
        message: err.message || "请求失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* 主题切换按钮 */}
      <div className="fixed top-4 right-4">
        <ModeToggle />
      </div>

      <MuiCard className="w-full max-w-md mx-4 shadow-lg">
        <div className="text-center p-6">
          <Typography variant="h5" className="font-bold text-blue-600 dark:text-blue-400">
            TOPEMS
          </Typography>
          <Typography variant="body2" color="text.secondary">企业数字化平台</Typography>
          <h2 className="text-2xl font-semibold pt-4">
            {isRegister ? "用户注册" : "用户登录"}
          </h2>
        </div>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* 用户名 */}
            <TextField
              label="用户名"
              placeholder="请输入用户名"
              value={form.watch("username")}
              onChange={(e) => form.setValue("username", e.target.value)}
              error={!!form.formState.errors.username}
              helperText={form.formState.errors.username?.message as string}
              size="small"
              fullWidth
            />

            {/* 邮箱 (仅注册时显示) */}
            {isRegister && (
              <TextField
                label="邮箱"
                type="email"
                placeholder="请输入邮箱"
                value={form.watch("email") || ""}
                onChange={(e) => form.setValue("email", e.target.value)}
                error={!!form.formState.errors.email}
                helperText={form.formState.errors.email?.message as string}
                size="small"
                fullWidth
              />
            )}

            {/* 密码 */}
            <div className="space-y-1 relative">
              <TextField
                label="密码"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={form.watch("password")}
                onChange={(e) => form.setValue("password", e.target.value)}
                error={!!form.formState.errors.password}
                helperText={form.formState.errors.password?.message as string}
                size="small"
                fullWidth
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${form.watch("password")?.match(/[A-Z]/) ? "bg-green-500" : "bg-gray-300"}`}
                  ></span>
                  大写字母
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${form.watch("password")?.match(/[a-z]/) ? "bg-green-500" : "bg-gray-300"}`}
                  ></span>
                  小写字母
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${form.watch("password")?.match(/[0-9]/) ? "bg-green-500" : "bg-gray-300"}`}
                  ></span>
                  数字
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${form.watch("password")?.match(/[^a-zA-Z0-9]/) ? "bg-green-500" : "bg-gray-300"}`}
                  ></span>
                  特殊字符
                </span>
              </div>
            </div>

            {/* 提交按钮 */}
            <Button type="submit" variant="contained" className="w-full" disabled={loading}>
              {loading ? "处理中..." : isRegister ? "注册" : "登录"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              {isRegister ? "已有账号？立即登录" : "没有账号？立即注册"}
            </button>
          </div>

          {/* 演示账号 */}
          {isDevelopment() && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                演示账号: admin / admin123 (管理员) | user / user123 (普通员工)
              </p>
            </div>
          )}
        </CardContent>
      </MuiCard>
    </div>
  );
};

export default LoginPage;
