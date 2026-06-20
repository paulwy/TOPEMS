import React, { useState, useMemo } from "react";
import { apiLogger } from "@/utils/logger";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, User, Shield, Fingerprint } from "lucide-react";
import { isDevelopment } from "../../config/runtime";
import { useAppStore } from "../../store";

import {
  Card as MuiCard,
  CardContent,
  Box,
  IconButton,
  Button,
  Typography,
  TextField,
} from "@mui/material";

import { ModeToggle } from "@/components/ModeToggle";

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

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      if (isRegister) {
        addNotification({
          title: "提示",
          message: "注册功能已关闭,请联系管理员获取账号",
          type: "info",
        });
        return;
      }

      let response = await login({
        username: values.username,
        password: values.password,
      });

      apiLogger.info("登录响应:", response);

      if (response.success) {
        addNotification({
          title: "登录成功",
          message: "欢迎回来!",
          type: "success",
        });
      } else {
        addNotification({
          title: "登录失败",
          message: response.message || "操作失败",
          type: "error",
        });
      }
    } catch (err: any) {
      apiLogger.error("登录错误:", err);
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          background: "rgba(255, 255, 255, 0.15)",
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          right: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <Shield sx={{ width: 20, height: 20, color: "white" }} />
          </Box>
          <Typography variant="h6" sx={{ color: "white", fontWeight: 600 }}>
            TOPEMS
          </Typography>
        </Box>
        <ModeToggle />
      </Box>

      <MuiCard
        sx={{
          width: "100%",
          maxWidth: 400,
          mx: 2,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: 3,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "fadeInUp 0.5s ease-out",
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: 4,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Fingerprint sx={{ width: 36, height: 36, color: "white" }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "white" }}>
            {isRegister ? "用户注册" : "欢迎回来"}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255, 255, 255, 0.8)", mt: 1 }}
          >
            {isRegister ? "创建您的账号" : "请登录您的账号"}
          </Typography>
        </Box>

        <CardContent sx={{ padding: 4 }}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="用户名"
                placeholder="请输入用户名"
                value={form.watch("username")}
                onChange={(e) => form.setValue("username", e.target.value)}
                error={!!form.formState.errors.username}
                helperText={form.formState.errors.username?.message as string}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mr: 2,
                          color: "grey.400",
                        }}
                      >
                        <User sx={{ width: 18, height: 18 }} />
                      </Box>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.main",
                      borderWidth: 2,
                    },
                  },
                }}
              />

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
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1.5,
                    },
                  }}
                />
              )}

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
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mr: 2,
                          color: "grey.400",
                        }}
                      >
                        <Lock sx={{ width: 18, height: 18 }} />
                      </Box>
                    ),
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ color: "grey.400" }}
                      >
                        {showPassword ? (
                          <EyeOff sx={{ width: 20, height: 20 }} />
                        ) : (
                          <Eye sx={{ width: 20, height: 20 }} />
                        )}
                      </IconButton>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.main",
                      borderWidth: 2,
                    },
                  },
                }}
              />

              {!isRegister && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: form.watch("password")?.match(/[A-Z]/)
                          ? "#22c55e"
                          : "#e5e7eb",
                      }}
                    ></Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      大写字母
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: form.watch("password")?.match(/[a-z]/)
                          ? "#22c55e"
                          : "#e5e7eb",
                      }}
                    ></Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      小写字母
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: form.watch("password")?.match(/[0-9]/)
                          ? "#22c55e"
                          : "#e5e7eb",
                      }}
                    ></Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      数字
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: form.watch("password")?.match(/[^a-zA-Z0-9]/)
                          ? "#22c55e"
                          : "#e5e7eb",
                      }}
                    ></Box>
                    <Typography variant="caption" sx={{ color: "#6b7280" }}>
                      特殊字符
                    </Typography>
                  </Box>
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                sx={{
                  width: "100%",
                  height: 48,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #5a6fd6 0%, #6a4090 100%)",
                  },
                  "&:disabled": {
                    background: "grey.400",
                  },
                }}
                disabled={loading}
              >
                {loading ? "处理中..." : isRegister ? "注册" : "登录"}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              sx={{
                color: "#667eea",
                "&:hover": { color: "#5a6fd6" },
                fontSize: "0.875rem",
                background: "transparent",
                fontWeight: 500,
              }}
            >
              {isRegister ? "已有账号？立即登录" : "没有账号？立即注册"}
            </Button>
          </Box>

          {isDevelopment() && (
            <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #e5e7eb" }}>
              <Typography
                variant="caption"
                sx={{ color: "#9ca3af", textAlign: "center", display: "block" }}
              >
                演示账号: admin / admin123 (管理员) | user / user123 (普通员工)
              </Typography>
            </Box>
          )}
        </CardContent>
      </MuiCard>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Box>
  );
};

export default LoginPage;
