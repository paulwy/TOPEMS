import React, { useState, useEffect } from "react";
import { Calendar, Filter } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import ProjectReport from "../components/pm/ProjectReport";
import { pmApi } from "../api/pm";
import type { PmStatistics, ProjectBenefit } from "../api/pm";

const PmReportPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const [stats, setStats] = useState<PmStatistics>({
    total_projects: 0,
    draft_projects: 0,
    pending_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    cancelled_projects: 0,
    total_contracts: 0,
    pending_contracts: 0,
    active_contracts: 0,
    completed_contracts: 0,
    total_budget: 0,
    spent_budget: 0,
    budget_usage_rate: 0,
    on_time_projects: 0,
    delayed_projects: 0,
    average_progress: 0,
    high_risk_projects: 0,
    medium_risk_projects: 0,
    low_risk_projects: 0,
  });
  const [benefits, setBenefits] = useState<ProjectBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadReportData();
  }, [params.projectId, selectedPeriod, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [statsResponse, benefitsResponse] = await Promise.all([
        pmApi.getStatistics(),
        params.projectId
          ? pmApi.benefits.list(params.projectId)
          : Promise.resolve({ success: true, data: { benefits: [] } }),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (benefitsResponse.success && benefitsResponse.data) {
        setBenefits(benefitsResponse.data.benefits || []);
      }
    } catch (error) {
      console.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReportData();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目报表</h1>
            <p className="text-gray-500 mt-1">
              {params.projectId ? "项目详情报表" : "全局项目统计报表"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleRefresh} variant="outline">
              刷新数据
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">时间范围:</span>
                </div>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="选择周期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="week">本周</SelectItem>
                    <SelectItem value="month">本月</SelectItem>
                    <SelectItem value="quarter">本季度</SelectItem>
                    <SelectItem value="year">本年</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
                {selectedPeriod === "custom" && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-10 w-36"
                      />
                    </div>
                    <span className="text-gray-400">至</span>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-10 w-36"
                      />
                    </div>
                  </div>
                )}
              </div>
              {params.projectId && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/pm/reports")}
                >
                  返回全局报表
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">加载中...</p>
            </CardContent>
          </Card>
        ) : (
          <ProjectReport stats={stats} benefits={benefits} />
        )}
      </div>
    </div>
  );
};

export default PmReportPage;
