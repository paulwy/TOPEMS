import { Sparkles } from "lucide-react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";

export interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  onConfirm?: (_e?: React.MouseEvent) => void;
  confirmText?: string;
  cancelText?: string;
  extraActions?: React.ReactNode;
}

export function AIGenerateModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  isLoading = false,
  onConfirm,
  confirmText = "确认",
  cancelText = "取消",
  extraActions,
}: AIGenerateModalProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ padding: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#f3e8ff",
            }}
          >
            <Sparkles style={{ width: 16, height: 16, color: "#9333ea" }} />
          </div>
          <DialogTitle sx={{ padding: 0, margin: 0 }}>{title}</DialogTitle>
        </div>
        {description && (
          <p style={{ marginTop: 8, color: "rgba(0,0,0,0.6)" }}>{description}</p>
        )}

        <div style={{ paddingTop: 16, paddingBottom: 16 }}>{children}</div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {extraActions}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              variant="contained"
              onClick={handleClose}
              disabled={isLoading}
              sx={{ textTransform: "none" }}
            >
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant="contained"
                color="primary"
                onClick={(e) => onConfirm(e)}
                disabled={isLoading}
                sx={{ textTransform: "none" }}
              >
                {confirmText}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
