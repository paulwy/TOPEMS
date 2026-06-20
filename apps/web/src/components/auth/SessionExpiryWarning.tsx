import {
  Button,
  Box,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Clock, RefreshCw, AlertCircle } from "lucide-react";
import { logger } from "@/utils/logger";

const SessionExpiryWarning: React.FC = () => {
  const { isSessionExpiringSoon, getTimeUntilExpiry, refreshToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const checkSession = () => {
      if (isSessionExpiringSoon()) {
        setIsOpen(true);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval);
  }, [isSessionExpiringSoon]);

  useEffect(() => {
    if (!isOpen) return;

    const updateCountdown = () => {
      const remaining = getTimeUntilExpiry();
      setCountdown(remaining);

      if (remaining <= 0) {
        setIsOpen(false);
        window.location.href = "/login";
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isOpen, getTimeUntilExpiry]);

  const handleRefresh = async () => {
    try {
      const success = await refreshToken();
      if (success) {
        setIsOpen(false);
      }
    } catch (error) {
      logger.error("Failed to refresh session:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogContent sx={{ textAlign: "center" }}>
        <Box
          sx={{
            mx: "auto",
            mb: 3,
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "warning.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle style={{ width: 32, height: 32, color: "#ed6c02" }} />
        </Box>
        <DialogTitle
          sx={{ fontSize: 20, fontWeight: 600, textAlign: "center" }}
        >
          会话即将过期
        </DialogTitle>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mb: 3 }}
        >
          您的登录会话即将过期，请点击下方按钮保持登录状态。
        </Typography>

        <Box
          sx={{
            mt: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "warning.main",
            }}
          >
            <Clock style={{ width: 20, height: 20 }} />
            <span
              style={{
                fontSize: 24,
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              {formatTime(countdown)}
            </span>
          </Box>

          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Button
              variant="contained"
              onClick={handleRefresh}
              startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              sx={{
                backgroundColor: "#ed6c02",
                "&:hover": { backgroundColor: "#e65100" },
              }}
            >
              继续使用
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SessionExpiryWarning;
