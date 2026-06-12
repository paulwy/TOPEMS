import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Clock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
      console.error("Failed to refresh session:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            会话即将过期
          </DialogTitle>
          <DialogDescription className="text-center">
            您的登录会话即将过期，请点击下方按钮保持登录状态。
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <span className="text-lg font-mono font-bold">
              {formatTime(countdown)}
            </span>
          </div>

          <div className="w-full space-y-3">
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              继续使用
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionExpiryWarning;
