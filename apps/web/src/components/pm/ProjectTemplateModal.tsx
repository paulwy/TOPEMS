import { Dialog, DialogContent, DialogTitle, TextField, Typography, Box,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState } from "react";

import type { ProjectTemplate } from "./ProjectTemplateCard";
import type { CreateProjectRequest } from "@/api/pm";

interface ProjectTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProjectTemplate | null;
  onConfirm: (data: CreateProjectRequest) => void;
}

const ProjectTemplateModal: React.FC<ProjectTemplateModalProps> = ({
  open,
  onOpenChange,
  template,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    start_date: "",
    budget: template?.default_budget?.toString() || "",
  });

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: "",
        code: "",
        description: template.description,
        start_date: "",
        budget: template.default_budget?.toString() || "",
      });
    }
  }, [template]);

  const handleSubmit = () => {
    if (!formData.name || !formData.code) return;

    onConfirm({
      name: formData.name,
      code: formData.code,
      description: formData.description,
      project_type: template?.project_type || "general",
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      start_date: formData.start_date || undefined,
    });

    setFormData({
      name: "",
      code: "",
      description: "",
      start_date: "",
      budget: "",
    });
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DialogTitle>使用模板创建项目</DialogTitle>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            模板名称
          </Typography>
          <TextField
            value={template.name}
            disabled
            size="small"
            sx={{ bgcolor: "grey.100" }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            项目名称 *
          </Typography>
          <TextField
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="输入项目名称"
            size="small"
            sx={{ mt: 0.5 }}
          />

          <Typography variant="body2" color="text.secondary">
            项目编号 *
          </Typography>
          <TextField
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="输入项目编号"
            size="small"
            sx={{ mt: 0.5 }}
          />

          <Typography variant="body2" color="text.secondary">
            项目描述
          </Typography>
          <TextField
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="输入项目描述"
            size="small"
            sx={{ mt: 0.5 }}
          />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                开始日期
              </Typography>
              <TextField
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                size="small"
                sx={{ mt: 0.5, "& input": { padding: 1 } }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                预算
              </Typography>
              <TextField
                type="number"
                value={formData.budget}
                onChange={(e) =>
                  setFormData({ ...formData, budget: e.target.value })
                }
                placeholder="输入预算"
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              py: 3,
              bgcolor: "grey.100",
              borderRadius: 1,
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {template.phases_count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                预设阶段
              </Typography>
            </Box>
            <Box sx={{ width: "1px", height: 48, bgcolor: "grey.300" }} />
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {template.estimated_days}天
              </Typography>
              <Typography variant="body2" color="text.secondary">
                预估周期
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button variant="contained" fullWidth onClick={handleSubmit}>
              创建项目
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectTemplateModal;
