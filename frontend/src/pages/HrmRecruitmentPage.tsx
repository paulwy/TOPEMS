import React, { useState } from 'react';
import { 
  Users, Briefcase, TrendingUp, Calendar, UserPlus, 
  Search, Filter, ChevronLeft, Plus, Eye, Edit, 
  Trash2, CheckCircle, XCircle, Clock, FileText,
  X, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';

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
  status: 'new' | 'interview' | 'offer' | 'hired' | 'rejected';
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
  status: 'open' | 'closed' | 'filled';
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
  interview_type: 'first' | 'second' | 'final';
  result: 'pass' | 'fail' | 'pending';
  feedback?: string;
}

const HrmRecruitmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'positions' | 'candidates' | 'interviews'>('positions');
  const [showCreatePositionModal, setShowCreatePositionModal] = useState(false);
  const [showCreateCandidateModal, setShowCreateCandidateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [positions] = useState<JobPosition[]>([
    {
      id: '1',
      title: '高级前端工程师',
      department: '研发部',
      location: '北京',
      salary_range: '25K-35K',
      requirements: ['5年以上前端开发经验', '精通React/Vue', '熟悉Node.js', '有大型项目经验'],
      description: '负责公司核心产品的前端架构设计与开发',
      status: 'open',
      headcount: 2,
      filled_count: 1,
      published_at: '2026-05-01'
    },
    {
      id: '2',
      title: '产品经理',
      department: '产品部',
      location: '北京',
      salary_range: '20K-30K',
      requirements: ['3年以上产品经验', '有B端产品经验优先', '良好的沟通能力'],
      description: '负责企业级产品的规划与设计',
      status: 'open',
      headcount: 1,
      filled_count: 0,
      published_at: '2026-05-10'
    },
    {
      id: '3',
      title: 'Java后端工程师',
      department: '研发部',
      location: '北京',
      salary_range: '20K-28K',
      requirements: ['3年以上Java开发', '熟悉Spring Boot', '有微服务经验'],
      description: '负责后端服务的开发与维护',
      status: 'filled',
      headcount: 3,
      filled_count: 3,
      published_at: '2026-04-15'
    },
  ]);

  const [candidates] = useState<Candidate[]>([
    {
      id: '1',
      name: '张伟',
      gender: '男',
      age: 28,
      phone: '13800138001',
      email: 'zhangwei@example.com',
      position: '高级前端工程师',
      education: '本科',
      experience: '5年',
      status: 'interview',
      source: 'Boss直聘',
      salary_expectation: 30000,
      interview_time: '2026-05-28 10:00',
      applied_at: '2026-05-20'
    },
    {
      id: '2',
      name: '李娜',
      gender: '女',
      age: 26,
      phone: '13800138002',
      email: 'lina@example.com',
      position: '产品经理',
      education: '硕士',
      experience: '3年',
      status: 'offer',
      source: '猎聘',
      salary_expectation: 25000,
      applied_at: '2026-05-15'
    },
    {
      id: '3',
      name: '王强',
      gender: '男',
      age: 30,
      phone: '13800138003',
      email: 'wangqiang@example.com',
      position: '高级前端工程师',
      education: '本科',
      experience: '7年',
      status: 'hired',
      source: '内部推荐',
      salary_expectation: 35000,
      applied_at: '2026-04-20'
    },
  ]);

  const [interviews] = useState<InterviewRecord[]>([
    {
      id: '1',
      candidate_name: '张伟',
      position: '高级前端工程师',
      interviewer: '陈技术',
      interview_time: '2026-05-28 10:00',
      interview_type: 'first',
      result: 'pending',
    },
    {
      id: '2',
      candidate_name: '刘芳',
      position: '产品经理',
      interviewer: '赵产品',
      interview_time: '2026-05-27 14:00',
      interview_type: 'second',
      result: 'pass',
      feedback: '沟通能力强，产品思维清晰',
    },
  ]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      open: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">招聘中</span>,
      closed: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">已关闭</span>,
      filled: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">已招满</span>,
      new: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">新增</span>,
      interview: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">面试中</span>,
      offer: <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Offer</span>,
      hired: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已入职</span>,
      rejected: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已拒绝</span>,
      pass: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">通过</span>,
      fail: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">未通过</span>,
      pending: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">待定</span>,
    };
    return badges[status] || <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
  };

  const filteredPositions = positions.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
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
            onClick={() => setActiveTab('positions')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'positions' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>招聘职位</span>
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'candidates' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>候选人</span>
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'interviews' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
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
              onClick={() => {
                if (activeTab === 'positions') setShowCreatePositionModal(true);
                else if (activeTab === 'candidates') setShowCreateCandidateModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              {activeTab === 'positions' ? '新增职位' : '添加候选人'}
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'positions' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">职位名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">薪资范围</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招聘人数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发布时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPositions.map((position) => (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{position.title}</div>
                        <div className="text-sm text-gray-500">{position.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{position.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{position.salary_range}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.filled_count}/{position.headcount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(position.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.published_at}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">查看</button>
                          <button className="text-blue-600 hover:text-blue-800">编辑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应聘职位</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学历</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工作经验</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期望薪资</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                        <div className="text-sm text-gray-500">{candidate.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.education}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.experience}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.salary_expectation ? `¥${candidate.salary_expectation.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(candidate.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.applied_at}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">查看</button>
                          <button className="text-blue-600 hover:text-blue-800">面试</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">候选人</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应聘职位</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面试官</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面试时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面试类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">结果</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{interview.candidate_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interview.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interview.interviewer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{interview.interview_time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {interview.interview_type === 'first' ? '初试' : interview.interview_type === 'second' ? '复试' : '终面'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(interview.result)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">查看详情</button>
                          {interview.result === 'pending' && (
                            <>
                              <button className="text-green-600 hover:text-green-800">通过</button>
                              <button className="text-red-600 hover:text-red-800">拒绝</button>
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
      </div>
    </div>
  );
};

export default HrmRecruitmentPage;
