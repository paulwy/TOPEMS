import { Card, CardContent, Typography, Box, TextField, InputLabel, FormControl, Select, MenuItem, Grid, Container, CircularProgress,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { logger } from "@/utils/logger";

const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "enterprise",
    industry: "",
    source: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    description: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      error("请填写客户名称");
      return;
    }
    setSubmitting(true);
    try {
      // API call would go here
      success("客户创建成功");
      navigate("/crm/customers");
    } catch (err) {
      logger.error("Failed to create customer:", err);
      error("创建客户失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Button variant="text" onClick={() => navigate("/crm/customers")} startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}>
            返回
          </Button>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>新建客户</Typography>
            <Typography variant="body2" color="text.secondary">创建新的客户档案</Typography>
          </Box>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>基本信息</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth label="客户名称" required value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth label="客户编码" value={formData.code} onChange={(e) => handleInputChange("code", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>客户类型</InputLabel>
                <Select value={formData.type} label="客户类型" onChange={(e) => handleInputChange("type", e.target.value)}>
                  <MenuItem value="enterprise">企业客户</MenuItem>
                  <MenuItem value="personal">个人客户</MenuItem>
                  <MenuItem value="government">政府机构</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>行业</InputLabel>
                <Select value={formData.industry} label="行业" onChange={(e) => handleInputChange("industry", e.target.value)}>
                  <MenuItem value="it">信息技术</MenuItem>
                  <MenuItem value="finance">金融</MenuItem>
                  <MenuItem value="manufacture">制造业</MenuItem>
                  <MenuItem value="retail">零售</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>客户来源</InputLabel>
                <Select value={formData.source} label="客户来源" onChange={(e) => handleInputChange("source", e.target.value)}>
                  <MenuItem value="website">官网</MenuItem>
                  <MenuItem value="referral">客户推荐</MenuItem>
                  <MenuItem value="exhibition">展会</MenuItem>
                  <MenuItem value="cold_call">电话营销</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth label="网站" value={formData.website} onChange={(e) => handleInputChange("website", e.target.value)} />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 600 }}>联系方式</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth label="电话" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField fullWidth label="邮箱" type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label="地址" value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 600 }}>备注</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="描述" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} />
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", gap: 2, mt: 4, justifyContent: "flex-end" }}>
            <Button variant="outlined" onClick={() => navigate("/crm/customers")} startIcon={<X style={{ width: 18, height: 18 }} />}>
              取消
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={18} /> : <Save style={{ width: 18, height: 18 }} />}>
              {submitting ? "提交中..." : "创建客户"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CustomerCreatePage;
