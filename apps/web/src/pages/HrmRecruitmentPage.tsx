import React, { useState, useEffect } from "react";
import {
  Users,
  Briefcase,
  TrendingUp,
  UserPlus,
  Search,
  ChevronLeft,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { NotificationContainer } from "../components/NotificationContainer";
import {
  jobOpeningApi,
  candidateApi,
  interviewApi,
  departmentApi,
  positionApi,
  type JobOpening,
  type Candidate as ApiCandidate,
  type Interview as ApiInterview,
  type Department,
} from "../api/hrm";

interface Candidate {
  id: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  email: string;
  position: string;
  education: string;
  experience: string;
  status: "new" | "interview" | "offer" | "hired" | "rejected";
  source: string;
  resume_url?: string;
  interview_time?: string;
  salary_expectation?: number;
  applied_at: string;
}

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  salary_range: string;
  requirements: string[];
  description: string;
  status: "open" | "closed" | "filled";
  headcount: number;
  filled_count: number;
  published_at: string;
}

interface InterviewRecord {
  id: string;
  candidate_name: string;
  position: string;
  interviewer: string;
  interview_time: string;
  interview_type: "first" | "second" | "final";
  result: "pass" | "fail" | "pending";
  feedback?: string;
}

const HrmRecruitmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<
    "positions" | "candidates" | "interviews"
  >("positions");
  const [showCreatePositionModal, setShowCreatePositionModal] = useState(false);
  const [showCreateCandidateModal, setShowCreateCandidateModal] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [departments, setDepartments] = useState<Record<string, Department>>(
    {},
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据，但添加错误处理
      const results = await Promise.allSettled([
        jobOpeningApi.list({ page_size: 100 }),
        candidateApi.list({ page_size: 100 }),
        interviewApi.list({ page_size: 100 }),
        departmentApi.list({ page_size: 100 }),
        positionApi.list({ page_size: 100 }),
      ]);

      // 处理每个结果
      const [
        openingsResult,
        candidatesResult,
        interviewsResult,
        departmentsResult,
        positionsResult,
      ] = results;

      // 创建部门映射
      const deptMap: Record<string, Department> = {};
      if (
        departmentsResult.status === "fulfilled" &&
        departmentsResult.value.data?.items
      ) {
        departmentsResult.value.data.items.forEach((dept) => {
          deptMap[dept.id] = dept;
        });
      }
      setDepartments(deptMap);

      // 创建职位映射
      const positionMap: Record<string, any> = {};
      if (
        positionsResult.status === "fulfilled" &&
        positionsResult.value.data?.items
      ) {
        positionsResult.value.data.items.forEach((pos) => {
          positionMap[pos.id] = pos;
        });
      }

      // 转换职位数据
      const openings =
        openingsResult.status === "fulfilled"
          ? openingsResult.value.data?.items || []
          : [];
      const transformedPositions: JobPosition[] = openings.map((opening) => {
        const dept = deptMap[opening.department_id || ""];
        const pos = positionMap[opening.position_id || ""];
        return {
          id: opening.id,
          title: opening.title,
          department: dept?.name || "",
          location: opening.location || "",
          salary_range:
            opening.salary_min && opening.salary_max
              ? `${opening.salary_min}-${opening.salary_max}`
              : "",
          requirements: opening.requirements ? [opening.requirements] : [],
          description: opening.description || "",
          status: mapPositionStatus(opening.status),
          headcount: 1,
          filled_count: 0,
          published_at: opening.publish_date || opening.created_at,
        };
      });
      setPositions(transformedPositions);

      // 转换候选人数据
      const candidates =
        candidatesResult.status === "fulfilled"
          ? candidatesResult.value.data?.items || []
          : [];
      const transformedCandidates: Candidate[] = candidates.map((candidate) => {
        const pos = positionMap[candidate.position_id || ""];
        const opening = transformedPositions.find(
          (o) => o.id === candidate.job_opening_id,
        );
        return {
          id: candidate.id,
          name: candidate.name,
          gender: "",
          age: 0,
          phone: candidate.phone || "",
          email: candidate.email || "",
          position: pos?.name || opening?.title || "",
          education: "",
          experience: "",
          status: mapCandidateStatus(candidate.status),
          source: candidate.source || "",
          resume_url: candidate.resume_path,
          salary_expectation: undefined,
          applied_at: candidate.created_at,
        };
      });
      setCandidates(transformedCandidates);

      // 转换面试数据
      const interviews =
        interviewsResult.status === "fulfilled"
          ? interviewsResult.value.data?.items || []
          : [];
      const transformedInterviews: InterviewRecord[] = interviews.map(
        (interview) => {
          const candidate = transformedCandidates.find(
            (c) => c.id === interview.candidate_id,
          );
          return {
            id: interview.id,
            candidate_name: candidate?.name || "",
            position: candidate?.position || "",
            interviewer: "",
            interview_time: interview.scheduled_at || "",
            interview_type: mapInterviewType(interview.round),
            result: mapInterviewResult(interview.result || interview.status),
            feedback: interview.notes,
          };
        },
      );
      setInterviews(transformedInterviews);
    } catch (err) {
      error("加载数据失败");
      console.error("Failed to load recruitment data:", err);
    } finally {
      setLoading(false);
    }
  };

  const mapPositionStatus = (status: string): JobPosition["status"] => {
    const statusMap: Record<string, JobPosition["status"]> = {
      open: "open",
      closed: "closed",
      filled: "filled",
    };
    return statusMap[status] || "open";
  };

  const mapCandidateStatus = (status: string): Candidate["status"] => {
    const statusMap: Record<string, Candidate["status"]> = {
      new: "new",
      interview: "interview",
      offer: "offer",
      hired: "hired",
      rejected: "rejected",
    };
    return statusMap[status] || "new";
  };

  const mapInterviewType = (
    round: number,
  ): InterviewRecord["interview_type"] => {
    const typeMap: Record<number, InterviewRecord["interview_type"]> = {
      1: "first",
      2: "second",
      3: "final",
    };
    return typeMap[round] || "first";
  };

  const mapInterviewResult = (result: string): InterviewRecord["result"] => {
    const resultMap: Record<string, InterviewRecord["result"]> = {
      pass: "pass",
      fail: "fail",
      pending: "pending",
    };
    return resultMap[result] || "pending";
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      open: (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          招聘中
        </span>
      ),
      closed: (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          已关闭
        </span>
      ),
      filled: (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
          已招满
        </span>
      ),
      new: (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
          新增
        </span>
      ),
      interview: (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
          面试中
        </span>
      ),
      offer: (
        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
          Offer
        </span>
      ),
      hired: (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          已入职
        </span>
      ),
      rejected: (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
          已拒绝
        </span>
      ),
      pass: (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          通过
        </span>
      ),
      fail: (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
          未通过
        </span>
      ),
      pending: (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
          待定
        </span>
      ),
    };
    return (
      badges[status] || (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          {status}
        </span>
      )
    );
  };

  const filteredPositions = positions.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <UserPlus className="w-7 h-7 mr-3 text-purple-600" />
                  招聘管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理招聘流程、职位发布和候选人信息
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("positions")}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "positions"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>招聘职位</span>
          </button>
          <button
            onClick={() => setActiveTab("candidates")}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "candidates"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>候选人</span>
          </button>
          <button
            onClick={() => setActiveTab("interviews")}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === "interviews"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>面试安排</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索职位/候选人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              刷新数据
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Content */}
            {activeTab === "positions" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          职位名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          部门
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          薪资范围
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          招聘人数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          发布时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPositions.map((position) => (
                        <tr key={position.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {position.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {position.location}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.salary_range}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.filled_count}/{position.headcount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(position.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {position.published_at}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800">
                                查看
                              </button>
                              <button className="text-blue-600 hover:text-blue-800">
                                编辑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "candidates" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          姓名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          应聘职位
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          学历
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          工作经验
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          期望薪资
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          申请时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCandidates.map((candidate) => (
                        <tr key={candidate.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {candidate.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {candidate.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {candidate.position}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {candidate.education}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {candidate.experience}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {candidate.salary_expectation
                              ? `¥${candidate.salary_expectation.toLocaleString()}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(candidate.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {candidate.applied_at}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800">
                                查看
                              </button>
                              <button className="text-blue-600 hover:text-blue-800">
                                面试
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "interviews" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          候选人
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          应聘职位
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          面试官
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          面试时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          面试类型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          结果
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {interviews.map((interview) => (
                        <tr key={interview.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {interview.candidate_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {interview.position}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {interview.interviewer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {interview.interview_time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {interview.interview_type === "first"
                              ? "初试"
                              : interview.interview_type === "second"
                                ? "复试"
                                : "终面"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(interview.result)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800">
                                查看详情
                              </button>
                              {interview.result === "pending" && (
                                <>
                                  <button className="text-green-600 hover:text-green-800">
                                    通过
                                  </button>
                                  <button className="text-red-600 hover:text-red-800">
                                    拒绝
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HrmRecruitmentPage;
