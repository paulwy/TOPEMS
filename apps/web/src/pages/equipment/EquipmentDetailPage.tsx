import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Container,
  Skeleton,
  Divider,
  Paper,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wrench,
  MapPin,
  Calendar,
  User,
  Edit2,
  Trash2,
  FileText,
} from "lucide-react";
import { assetApi, type Asset } from "@/api/erp";
import { useAppStore } from "@/store";

const EquipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [equipment, setEquipment] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEquipment(id);
    }
  }, [id]);

  const loadEquipment = async (equipmentId: string) => {
    setLoading(true);
    try {
      const res = await assetApi.get(equipmentId);
      if (res.code === 200 && res.data) {
        setEquipment(res.data);
      }
    } catch (err) {
      addNotification({
        title: "错误",
        message: "加载设备信息失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("确定要删除此设备吗？")) return;

    try {
      const res = await assetApi.delete(id);
      if (res.code === 200) {
        addNotification({
          title: "成功",
          message: "设备删除成功",
          type: "success",
        });
        navigate("/equipment");
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({
        title: "错误",
        message: "删除设备失败",
        type: "error",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle":
        return "default";
      case "in_use":
        return "info";
      case "maintenance":
        return "warning";
      case "scrapped":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "idle":
        return "闲置";
      case "in_use":
        return "使用中";
      case "maintenance":
        return "维护中";
      case "scrapped":
        return "已报废";
      default:
        return status;
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("zh-CN");
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (!equipment) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">设备不存在或已被删除</Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate("/equipment")}
          >
            返回设备列表
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="text"
              onClick={() => navigate("/equipment")}
              startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
            >
              返回
            </Button>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {equipment.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                设备详情信息
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Edit2 style={{ width: 18, height: 18 }} />}
              onClick={() => navigate(`/equipment/${id}/edit`)}
            >
              编辑
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 style={{ width: 18, height: 18 }} />}
              onClick={handleDelete}
            >
              删除
            </Button>
          </Box>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              基本信息
            </Typography>
            <Chip
              label={getStatusLabel(equipment.status)}
              color={getStatusColor(equipment.status) as any}
              size="small"
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Wrench style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    设备编号
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {equipment.asset_number || "-"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileText style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    设备名称
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {equipment.name || "-"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileText style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    设备类别
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {equipment.category || "-"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            规格信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                品牌
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {equipment.brand || "-"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                型号
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {equipment.model || "-"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                序列号
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {equipment.serial_number || "-"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                制造商
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {equipment.manufacturer || "-"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                额定功率
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {equipment.rated_power ? `${equipment.rated_power} kW` : "-"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                额定电压
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {equipment.rated_voltage ? `${equipment.rated_voltage} V` : "-"}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            采购与位置信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    采购日期
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDate(equipment.purchase_date)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileText style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    采购金额
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(equipment.purchase_amount)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MapPin style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    存放位置
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {equipment.location || "-"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <User style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    负责人
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {equipment.responsible_id || "-"}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EquipmentDetailPage;
