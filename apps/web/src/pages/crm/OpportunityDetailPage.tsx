import { Card, CardContent, Typography, Box, Chip, Grid, Container, Skeleton, Divider, Paper, LinearProgress,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  User,
  Building2,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { logger } from "@/utils/logger";

interface Opportunity {
  id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  contact_id?: string;
  contact_name?: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOpportunity(id);
    }
  }, [id]);

  const loadOpportunity = async (opportunityId: string) => {
    setLoading(true);
    try {
      // Mock data for now
      setOpportunity({
        id: opportunityId,
        name: "企业数字化转型项目",
        customer_id: "1",
        customer_name: "示例科技有限公司",
        contact_name: "张经理",
        amount: 500000,
        stage: "negotiation",
        probability: 60,
        expected_close_date: "2026-07-15",
        description: "客户希望进行全面的数字化转型，包括ERP系统升级、数据中台建设等",
        created_at: "2026-06-01",
        updated_at: "2026-06-20",
      });
    } catch (err) {
      logger.error("Failed to load opportunity:", err);
      error("加载商机信息失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("确定要删除此商机吗？")) return;
    success("商机删除成功");
    navigate("/crm/opportunities");
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      lead: "线索",
      qualification: "资格确认",
      proposal: "方案报价",
      negotiation: "谈判审核",
      closed_won: "赢单",
      closed_lost: "输单",
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, "default" | "primary" | "success" | "warning" | "error"> = {
      lead: "default",
      qualification: "primary",
      proposal: "primary",
      negotiation: "warning",
      closed_won: "success",
      closed_lost: "error",
    };
    return colors[stage] || "default";
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("zh-CN");
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (!opportunity) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">商机不存在或已被删除</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate("/crm/opportunities")}>
            返回商机列表
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* 页面头部 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="text"
              onClick={() => navigate("/crm/opportunities")}
              startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
            >
              返回
            </Button>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {opportunity.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                商机详情
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Edit2 style={{ width: 18, height: 18 }} />}
              onClick={() => navigate(`/crm/opportunity/${id}/edit`)}
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

      {/* 基本信息 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              基本信息
            </Typography>
            <Chip label={getStageLabel(opportunity.stage)} color={getStageColor(opportunity.stage)} size="small" />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TrendingUp style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">商机金额</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatMoney(opportunity.amount)}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Building2 style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">客户名称</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{opportunity.customer_name}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <User style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">联系人</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{opportunity.contact_name || "-"}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar style={{ width: 18, height: 18, color: "grey.500" }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">预计成交日期</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(opportunity.expected_close_date)}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 成交概率 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            成交概率
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={opportunity.probability}
              sx={{ flex: 1, height: 10, borderRadius: 5 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {opportunity.probability}%
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 描述 */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            商机描述
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {opportunity.description || "暂无描述"}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default OpportunityDetailPage;
