import React from "react";
import { Box, Typography } from "@mui/material";
import { Sparkles, ChevronRight, Activity } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export const HeroSection: React.FC = () => {
  const { user } = useAuth();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "上午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <Box sx={{ mb: 8 }}>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: 3,
          p: { xs: 4, md: 8 },
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.15) 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(circle at 20% 80%, rgba(167, 139, 250, 0.15) 0%, transparent 50%)",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 10 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={16} color="white" />
            </Box>
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: "#60a5fa",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {getGreeting()}，{user?.full_name || user?.username || "用户"}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: { xs: "2rem", md: "3rem" },
              fontWeight: 800,
              color: "#f8fafc",
              mb: 3,
              lineHeight: 1.2,
            }}
          >
            欢迎回到
            <span
              className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              {" TOPEMS "}
            </span>
            平台
          </Typography>

          <Typography
            sx={{
              fontSize: "1.125rem",
              color: "#94a3b8",
              mb: 6,
              maxWidth: "600px",
            }}
          >
            化工新材料企业数字化平台，助力企业实现数字化转型，提升运营效率，创造更大价值
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <button
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
            >
              <Activity size={20} />
              <span>开始工作</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 border border-white/10"
            >
              <span>了解更多</span>
            </button>
          </Box>
        </Box>

        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl" />
      </Box>
    </Box>
  );
};